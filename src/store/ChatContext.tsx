import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode, useMemo } from 'react';
import { Conversation, ChatMessage } from '../types/chat';
import { fetchConversations, fetchMessages, createSupportConversation, sendMessageRest } from '../api';
import { useAuthContext } from './AuthContext';
import { WS_URL } from '../config';

interface ChatState {
    conversations: Conversation[];
    messages: Record<string, ChatMessage[]>; // map conversation_id -> messages
    activeConversationId: string | null;
    unreadCount: number;
    isConnected: boolean;
    isConnecting: boolean;
}

/** Курсоры пагинации сообщений (per-conversation) */
type MessageCursors = Record<string, string | null>;

interface ChatContextValue extends ChatState {
    setActiveConversation: (id: string | null) => void;
    sendMessage: (conversationId: string, text: string) => void;
    markAsRead: (conversationId: string, lastMessageId: string) => void;
    loadMessagesFor: (conversationId: string) => Promise<void>;
    loadMoreMessages: (conversationId: string) => Promise<void>;
    hasMoreMessages: (conversationId: string) => boolean;
    createSupport: () => Promise<string | null>;
    // Global notification callback for components to hook into
    onNewMessage?: (msg: ChatMessage) => void;
    setOnNewMessage: (cb: ((msg: ChatMessage) => void) | undefined) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export const useChatContext = () => {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
    return ctx;
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { auth } = useAuthContext();
    const accessToken = auth.tokens?.accessToken ?? null;

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
    const [messageCursors, setMessageCursors] = useState<MessageCursors>({});
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const backoffRef = useRef(1000);
    const activeConversationRef = useRef<string | null>(null);
    const conversationsRef = useRef<Conversation[]>([]);
    const messagesRef = useRef<Record<string, ChatMessage[]>>({});
    const onNewMessageRef = useRef<((msg: ChatMessage) => void) | undefined>(undefined);
    const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const setOnNewMessageCb = useCallback((cb: ((msg: ChatMessage) => void) | undefined) => {
        onNewMessageRef.current = cb;
    }, []);

    // Sync refs
    useEffect(() => { activeConversationRef.current = activeConversationId; }, [activeConversationId]);
    useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    const unreadCount = useMemo(() => {
        return conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);
    }, [conversations]);

    const loadConversations = useCallback(async () => {
        try {
            const { items: convs } = await fetchConversations();
            setConversations(convs);
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                convs.forEach(c => {
                    wsRef.current?.send(JSON.stringify({ type: 'subscribe', data: { conversation_id: c.id } }));
                });
            }
        } catch (error) {
            console.error('Failed to load conversations', error);
        }
    }, []);

    const handleIncomingMessage = useCallback((rawMsg: ChatMessage) => {
        const newMsg = rawMsg;

        // Дедупликация: проверяем по текущему массиву сообщений
        setMessages(prev => {
            const existing = prev[newMsg.conversation_id] || [];
            const isDuplicate = existing.some(m => m.id === newMsg.id || (m.client_msg_id && m.client_msg_id === newMsg.client_msg_id));

            if (isDuplicate) {
                // Обновляем существующее сообщение (напр. temp → реальное)
                return {
                    ...prev,
                    [newMsg.conversation_id]: existing.map(m =>
                        (m.client_msg_id === newMsg.client_msg_id || m.id === newMsg.id) ? newMsg : m
                    )
                };
            }

            const updated = [...existing, newMsg];
            updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            return { ...prev, [newMsg.conversation_id]: updated };
        });

        // Обновить conversation list (поднять вверх, обновить preview)
        setConversations(prev => {
            const idx = prev.findIndex(c => c.id === newMsg.conversation_id);
            if (idx === -1) {
                // Новый диалог — перезагрузить список
                loadConversations();
                return prev;
            }

            const copy = [...prev];
            const conv = { ...copy[idx] };
            conv.updated_at = newMsg.created_at;
            conv.last_message_at = newMsg.created_at;

            // Обновить превью последнего сообщения
            if (newMsg.type === 'text' && newMsg.body) {
                conv.last_message_preview = newMsg.body.length > 150 ? newMsg.body.slice(0, 150) : newMsg.body;
            }

            copy.splice(idx, 1);
            copy.unshift(conv);
            return copy;
        });

        // Trigger global notification (если сообщение от другой стороны и не в активном чате)
        if (newMsg.sender_kind !== 'user' && activeConversationRef.current !== newMsg.conversation_id) {
            onNewMessageRef.current?.(newMsg);
        }
    }, [loadConversations]);

    const connectWs = useCallback(() => {
        if (!accessToken) return;
        if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

        setIsConnecting(true);
        const ws = new WebSocket(`${WS_URL}?token=${accessToken}`);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            setIsConnecting(false);
            backoffRef.current = 1000;
            conversationsRef.current.forEach(c => {
                ws.send(JSON.stringify({ type: 'subscribe', data: { conversation_id: c.id } }));
            });
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping', data: {} }));
            }, 30000);
        };

        ws.onmessage = (event) => {
            try {
                const rawMsg = JSON.parse(event.data);

                switch (rawMsg.type) {
                    case 'message.created': {
                        const newMsg: ChatMessage = rawMsg.data.message;
                        handleIncomingMessage(newMsg);
                        break;
                    }

                    case 'conversation.updated': {
                        const data = rawMsg.data;
                        const conversationId = data.conversation_id;
                        const action = data.action;

                        setConversations(prev => {
                            const idx = prev.findIndex(c => c.id === conversationId);
                            if (idx === -1) return prev;

                            const copy = [...prev];
                            const conv = { ...copy[idx] };

                            if (action === 'closed') conv.status = 'closed';
                            if (action === 'assigned') {
                                conv.assignee_admin_id = data.admin_id;
                                if (data.admin_name) conv.admin_name = data.admin_name;
                            }

                            conv.updated_at = new Date().toISOString();

                            copy.splice(idx, 1);
                            copy.unshift(conv);
                            return copy;
                        });
                        break;
                    }

                    case 'conversation.created': {
                        // Новый диалог — перезагружаем список
                        loadConversations();
                        break;
                    }

                    case 'message.ack': {
                        const { client_msg_id, id, created_at } = rawMsg.data;

                        // Определяем conversation_id синхронно через ref
                        let ackConvId: string | null = null;
                        for (const convId of Object.keys(messagesRef.current)) {
                            if (messagesRef.current[convId]?.some(m => m.client_msg_id === client_msg_id)) {
                                ackConvId = convId;
                                break;
                            }
                        }

                        if (ackConvId) {
                            const convIdToUpdate = ackConvId;
                            // Обновляем оптимистичное сообщение серверными данными
                            setMessages(prev => ({
                                ...prev,
                                [convIdToUpdate]: (prev[convIdToUpdate] || []).map(m =>
                                    m.client_msg_id === client_msg_id
                                        ? { ...m, id, created_at, _localStatus: undefined }
                                        : m
                                )
                            }));

                            // Обновить timestamp в conversation list
                            setConversations(prev => prev.map(c =>
                                c.id === convIdToUpdate
                                    ? { ...c, updated_at: created_at, last_message_at: created_at }
                                    : c
                            ));
                        }
                        break;
                    }

                    case 'read_state.updated': {
                        const { conversation_id, unread_count: newUnread } = rawMsg.data;
                        setConversations(prev => prev.map(c =>
                            c.id === conversation_id ? { ...c, unread_count: newUnread } : c
                        ));
                        break;
                    }

                    case 'pong':
                        // Pong received
                        break;

                    case 'error':
                        console.error('WS server error', rawMsg.data);
                        break;
                }
            } catch (err) {
                console.error('WS parse error', err);
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
            setIsConnecting(false);
            wsRef.current = null;
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
                backoffRef.current = Math.min(backoffRef.current * 2, 30000);
                connectWs();
            }, backoffRef.current);
        };

        ws.onerror = (err) => {
            console.error('WS error', err);
            ws.close();
        };
    }, [accessToken, handleIncomingMessage, loadConversations]);

    const disconnectWs = useCallback(() => {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.onmessage = null;
            wsRef.current.onopen = null;
            if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
        setIsConnecting(false);
    }, []);

    // Event-driven auth: подключаемся/отключаемся при изменении токена
    useEffect(() => {
        if (accessToken) {
            loadConversations();
            connectWs();
        } else {
            disconnectWs();
            setConversations([]);
            setMessages({});
            setMessageCursors({});
        }

        return () => {
            disconnectWs();
        };
    }, [accessToken, connectWs, disconnectWs, loadConversations]);

    const setActiveConversation = useCallback((id: string | null) => {
        setActiveConversationId(id);
        if (id && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'subscribe', data: { conversation_id: id } }));
        }
    }, []);

    // Загружает первую страницу сообщений (при входе в чат)
    const loadMessagesFor = useCallback(async (conversationId: string) => {
        try {
            const { items, next_cursor } = await fetchMessages(conversationId, { limit: 50 });

            setMessages(prev => {
                const existing = prev[conversationId] || [];
                const merged = [...existing, ...items];
                const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
                unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                return { ...prev, [conversationId]: unique };
            });

            setMessageCursors(prev => ({ ...prev, [conversationId]: next_cursor }));
        } catch (err) {
            console.error('Failed to load messages', err);
        }
    }, []);

    // Подгружает предыдущие сообщения по cursor (при скролле вверх)
    const loadMoreMessages = useCallback(async (conversationId: string) => {
        const cursor = messageCursors[conversationId];
        if (!cursor) return;

        try {
            const { items, next_cursor } = await fetchMessages(conversationId, { cursor, limit: 50 });

            setMessages(prev => {
                const existing = prev[conversationId] || [];
                const merged = [...items, ...existing];
                const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
                unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                return { ...prev, [conversationId]: unique };
            });

            setMessageCursors(prev => ({ ...prev, [conversationId]: next_cursor }));
        } catch (err) {
            console.error('Failed to load more messages', err);
        }
    }, [messageCursors]);

    const hasMoreMessages = useCallback((conversationId: string) => {
        return messageCursors[conversationId] != null;
    }, [messageCursors]);

    const createSupport = useCallback(async () => {
        try {
            const conv = await createSupportConversation();
            setConversations(prev => {
                const exists = prev.find(c => c.id === conv.id);
                if (exists) return prev;
                return [conv, ...prev];
            });
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'subscribe', data: { conversation_id: conv.id } }));
            }
            return conv.id;
        } catch (err) {
            console.error('Failed to create support chat', err);
            return null;
        }
    }, []);

    const sendMessage = useCallback(async (conversationId: string, text: string) => {
        const clientMsgId = crypto.randomUUID();
        const tempMsg: ChatMessage = {
            id: `temp-${clientMsgId}`,
            conversation_id: conversationId,
            sender_kind: 'user',
            sender_id: 0,
            type: 'text',
            body: text,
            payload: null,
            client_msg_id: clientMsgId,
            created_at: new Date().toISOString(),
            _localStatus: 'sending'
        };

        setMessages(prev => ({
            ...prev,
            [conversationId]: [...(prev[conversationId] || []), tempMsg]
        }));

        setConversations(prev => {
            const idx = prev.findIndex(c => c.id === conversationId);
            if (idx === -1) return prev;
            const copy = [...prev];
            const updatedConv = {
                ...copy[idx],
                updated_at: tempMsg.created_at,
                last_message_at: tempMsg.created_at,
                last_message_preview: text.length > 150 ? text.slice(0, 150) : text
            };
            copy.splice(idx, 1);
            copy.unshift(updatedConv);
            return copy;
        });

        // Отправка через WS (основной путь) с фолбэком на REST
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'message.send',
                data: { conversation_id: conversationId, client_msg_id: clientMsgId, body: text, type: 'text' }
            }));
            // ACK придёт через message.ack → обновит id/created_at и снимет _localStatus
        } else {
            // Фолбэк: REST, если WS недоступен
            try {
                const realMsg = await sendMessageRest(conversationId, clientMsgId, text);
                setMessages(prev => ({
                    ...prev,
                    [conversationId]: prev[conversationId].map(m => m.client_msg_id === clientMsgId ? realMsg : m)
                }));
            } catch (err) {
                setMessages(prev => ({
                    ...prev,
                    [conversationId]: prev[conversationId].map(m => m.client_msg_id === clientMsgId ? { ...m, _localStatus: 'failed' } : m)
                }));
            }
        }
    }, []);

    // mark_read: отправляем через WS, обновление unread_count придёт через read_state.updated
    const markAsRead = useCallback((conversationId: string, lastMessageId: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'mark_read', data: { conversation_id: conversationId, last_message_id: lastMessageId } }));
        }
    }, []);

    return (
        <ChatContext.Provider value={{
            conversations,
            messages,
            activeConversationId,
            unreadCount,
            isConnected,
            isConnecting,
            setActiveConversation,
            sendMessage,
            markAsRead,
            loadMessagesFor,
            loadMoreMessages,
            hasMoreMessages,
            createSupport,
            onNewMessage: onNewMessageRef.current,
            setOnNewMessage: setOnNewMessageCb
        }}>
            {children}
        </ChatContext.Provider>
    );
};
