import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode, useMemo } from 'react';
import { Conversation, ChatMessage, WsIncomingEvent, WsOutgoingEvent } from '../types/chat';
import { fetchConversations, fetchMessages, createSupportConversation, sendMessageRest, getStoredTokens } from '../api';
import { WS_URL } from '../config';

const encodeCursor = (createdAt: string, id: string): string => {
    const raw = `${createdAt}|${id}`;
    return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const localizeMessage = (msg: ChatMessage): ChatMessage => {
    let payload = msg.payload;
    // Парсим payload, если он пришел как строка
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) { console.error('Error parsing payload', e); }
    }

    if (msg.type === 'system' && payload) {
        if (payload.action === 'assigned') {
            const adminName = payload.admin_name;
            const body = adminName
                ? `Сотрудник поддержки ${adminName} подключился к диалогу`
                : 'Сотрудник поддержки подключился к диалогу';
            return { ...msg, body };
        }
        if (payload.action === 'closed') {
            return { ...msg, body: 'Диалог завершён' };
        }
    }
    // Фолбек для старых сообщений без payload
    if (msg.type === 'system' && msg.body && typeof msg.body === 'string') {
        if (msg.body.includes('assigned to conversation')) {
            return { ...msg, body: 'Сотрудник поддержки подключился к диалогу' };
        }
        if (msg.body.includes('Conversation closed')) {
            return { ...msg, body: 'Диалог завершён' };
        }
    }
    return msg;
};

interface ChatState {
    conversations: Conversation[];
    messages: Record<string, ChatMessage[]>; // map conversation_id -> messages
    activeConversationId: string | null;
    unreadCount: number;
    isConnected: boolean;
    isConnecting: boolean;
}

interface ChatContextValue extends ChatState {
    setActiveConversation: (id: string | null) => void;
    sendMessage: (conversationId: string, text: string) => void;
    markAsRead: (conversationId: string, lastMessageId: string) => void;
    loadMessagesFor: (conversationId: string, cursor?: string) => Promise<void>;
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
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const backoffRef = useRef(1000);
    const activeConversationRef = useRef<string | null>(null);
    const conversationsRef = useRef<Conversation[]>([]);
    const onNewMessageRef = useRef<((msg: ChatMessage) => void) | undefined>(undefined);
    const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const processedMsgIdsRef = useRef<Set<string>>(new Set());

    const setOnNewMessageCb = useCallback((cb: ((msg: ChatMessage) => void) | undefined) => {
        onNewMessageRef.current = cb;
    }, []);

    // Sync refs
    useEffect(() => { activeConversationRef.current = activeConversationId; }, [activeConversationId]);
    useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

    const unreadCount = useMemo(() => {
        return conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);
    }, [conversations]);

    const loadConversations = useCallback(async () => {
        try {
            const convs = await fetchConversations();
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
        const msgId = rawMsg.id;
        if (msgId && processedMsgIdsRef.current.has(msgId)) return;
        if (msgId) processedMsgIdsRef.current.add(msgId);

        // Periodic cleanup of Set
        if (processedMsgIdsRef.current.size > 2000) {
            const arr = Array.from(processedMsgIdsRef.current);
            processedMsgIdsRef.current = new Set(arr.slice(1000));
        }

        const newMsg = localizeMessage(rawMsg);

        // 1. Update messages state
        setMessages(prev => {
            const existing = prev[newMsg.conversation_id] || [];
            const exists = existing.find(m => m.client_msg_id === newMsg.client_msg_id || m.id === newMsg.id);
            if (exists) {
                return {
                    ...prev,
                    [newMsg.conversation_id]: existing.map(m => (m.client_msg_id === newMsg.client_msg_id || m.id === newMsg.id) ? newMsg : m)
                };
            }
            const updated = [...existing, newMsg];
            updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            return { ...prev, [newMsg.conversation_id]: updated };
        });

        // 2. Update conversation list
        setConversations(prev => {
            const idx = prev.findIndex(c => c.id === newMsg.conversation_id);
            if (idx === -1) {
                loadConversations();
                return prev;
            }

            const copy = [...prev];
            const conv = { ...copy[idx] };
            conv.updated_at = newMsg.created_at;
            conv.last_message_at = newMsg.created_at;

            // Increment unread if message from others and not in active chat
            if (newMsg.sender_kind !== 'user' && activeConversationRef.current !== newMsg.conversation_id) {
                conv.unread_count = (conv.unread_count || 0) + 1;
            }

            copy.splice(idx, 1);
            copy.unshift(conv);
            return copy;
        });

        // 3. Trigger global notification
        if (newMsg.sender_kind !== 'user' && activeConversationRef.current !== newMsg.conversation_id) {
            onNewMessageRef.current?.(newMsg);
        }
    }, [loadConversations]);

    const connectWs = useCallback(() => {
        const tokens = getStoredTokens();
        if (!tokens?.accessToken) return;

        if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

        setIsConnecting(true);
        const ws = new WebSocket(`${WS_URL}?token=${tokens.accessToken}`);
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
                const msgType = rawMsg.type || rawMsg.event; // Поддержка обоих вариантов

                if (msgType === 'message.created' || msgType === 'chat.message_created') {
                    let newMsg: ChatMessage;
                    if (rawMsg.data && rawMsg.data.message) {
                        newMsg = rawMsg.data.message;
                    } else {
                        const data = rawMsg.data || rawMsg;
                        newMsg = {
                            id: data.message_id || data.id,
                            conversation_id: data.conversation_id,
                            sender_kind: data.sender_kind,
                            sender_id: data.sender_id,
                            type: data.type || 'text',
                            body: data.body,
                            payload: data.payload || null, // ВАЖНО: берем payload!
                            client_msg_id: data.client_msg_id || data.message_id || data.id,
                            created_at: data.created_at || new Date().toISOString()
                        } as ChatMessage;
                    }
                    handleIncomingMessage(newMsg);
                } else if (msgType === 'conversation.updated' || msgType === 'chat.conversation_updated') {
                    const data = rawMsg.data as any;
                    const conversationId = data.conversation_id || data.id;
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
                } else if (msgType === 'pong') {
                    // Pong received
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
    }, [handleIncomingMessage]);

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

    useEffect(() => {
        const tokens = getStoredTokens();
        if (tokens?.accessToken) {
            loadConversations();
            connectWs();
        }

        const interval = setInterval(() => {
            const t = getStoredTokens();
            if (!t && wsRef.current) {
                disconnectWs();
                setConversations([]);
                setMessages({});
            } else if (t && !wsRef.current && !reconnectTimeoutRef.current) {
                loadConversations();
                connectWs();
            }
        }, 2000);

        return () => {
            clearInterval(interval);
            disconnectWs();
        };
    }, [connectWs, disconnectWs, loadConversations]);

    const setActiveConversation = useCallback((id: string | null) => {
        setActiveConversationId(id);
        if (id && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'subscribe', data: { conversation_id: id } }));
        }
    }, []);

    const loadMessagesFor = useCallback(async (conversationId: string, initialCursor?: string) => {
        try {
            let cursor = initialCursor;
            let keepLoading = true;
            let allFetchedMessages: ChatMessage[] = [];

            while (keepLoading) {
                const apiMessages = await fetchMessages(conversationId, { cursor });
                if (apiMessages.length === 0) break;
                allFetchedMessages = [...allFetchedMessages, ...apiMessages];
                if (apiMessages.length === 50) {
                    const lastMsg = apiMessages[apiMessages.length - 1];
                    cursor = encodeCursor(lastMsg.created_at, lastMsg.id);
                } else {
                    keepLoading = false;
                }
            }

            setMessages(prev => {
                const existing = prev[conversationId] || [];
                const localizedFetched = allFetchedMessages.map(localizeMessage);
                const merged = [...existing, ...localizedFetched];
                const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
                unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                return { ...prev, [conversationId]: unique };
            });
        } catch (err) {
            console.error('Failed to load messages', err);
        }
    }, []);

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
            const updatedConv = { ...copy[idx], updated_at: tempMsg.created_at, last_message_at: tempMsg.created_at };
            copy.splice(idx, 1);
            copy.unshift(updatedConv);
            return copy;
        });

        try {
            const realMsg = await sendMessageRest(conversationId, clientMsgId, text);
            setMessages(prev => ({
                ...prev,
                [conversationId]: prev[conversationId].map(m => m.client_msg_id === clientMsgId ? localizeMessage(realMsg) : m)
            }));
        } catch (err) {
            setMessages(prev => ({
                ...prev,
                [conversationId]: prev[conversationId].map(m => m.client_msg_id === clientMsgId ? { ...m, _localStatus: 'failed' } : m)
            }));
        }
    }, []);

    const markAsRead = useCallback((conversationId: string, lastMessageId: string) => {
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c));
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
            createSupport,
            onNewMessage: onNewMessageRef.current,
            setOnNewMessage: setOnNewMessageCb
        }}>
            {children}
        </ChatContext.Provider>
    );
};
