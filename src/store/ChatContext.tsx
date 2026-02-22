import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode, useMemo } from 'react';
import { Conversation, ChatMessage, WsIncomingEvent, WsOutgoingEvent } from '../types/chat';
import { fetchConversations, fetchMessages, createSupportConversation, sendMessageRest, getStoredTokens } from '../api';
import { WS_URL } from '../config';

const encodeCursor = (createdAt: string, id: string): string => {
    const raw = `${createdAt}|${id}`;
    return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
    const backoffRef = useRef(1000); // 1s initial backoff
    const activeConversationRef = useRef<string | null>(null); // To access latest state inside ws callbacks
    const conversationsRef = useRef<Conversation[]>([]); // To access latest conversations for subscriptions
    const onNewMessageRef = useRef<((msg: ChatMessage) => void) | undefined>(undefined);
    const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const setOnNewMessageCb = useCallback((cb: ((msg: ChatMessage) => void) | undefined) => {
        onNewMessageRef.current = cb;
    }, []);

    // Sync refs
    useEffect(() => { activeConversationRef.current = activeConversationId; }, [activeConversationId]);
    useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

    // Derived unread count
    const unreadCount = useMemo(() => {
        return conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);
    }, [conversations]);

    const connectWs = useCallback(() => {
        const tokens = getStoredTokens();
        if (!tokens?.accessToken) return;

        if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        setIsConnecting(true);
        const ws = new WebSocket(`${WS_URL}?token=${tokens.accessToken}`);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            setIsConnecting(false);
            backoffRef.current = 1000; // Reset backoff

            // Subscribe to all known conversations to receive updates for them
            conversationsRef.current.forEach(c => {
                ws.send(JSON.stringify({ type: 'subscribe', data: { conversation_id: c.id } }));
            });

            // Start pinging
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping', data: {} }));
                }
            }, 30000); // Ping every 30s
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data) as WsIncomingEvent;
                if (msg.type === 'message.created' || msg.type === 'chat.message_created') {
                    let newMsg: ChatMessage;

                    if (msg.type === 'message.created') {
                        newMsg = msg.data.message;
                    } else {
                        // Map backend outbox 'chat.message_created' payload
                        const data = msg.data as any;
                        newMsg = {
                            id: data.message_id || data.id,
                            conversation_id: data.conversation_id,
                            sender_kind: data.sender_kind,
                            sender_id: data.sender_id,
                            type: data.type || 'text',
                            body: data.body,
                            payload: null,
                            client_msg_id: data.client_msg_id || data.message_id || data.id,
                            created_at: data.created_at || new Date().toISOString()
                        } as ChatMessage;
                    }

                    // 1. Update messages
                    setMessages(prev => {
                        const existing = prev[newMsg.conversation_id] || [];
                        const exists = existing.find(m => m.client_msg_id === newMsg.client_msg_id || m.id === newMsg.id);
                        if (exists) {
                            return {
                                ...prev,
                                [newMsg.conversation_id]: existing.map(m => (m.client_msg_id === newMsg.client_msg_id || m.id === newMsg.id) ? newMsg : m)
                            };
                        }
                        return {
                            ...prev,
                            [newMsg.conversation_id]: [...existing, newMsg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                        };
                    });

                    // 2. Update conversations list (move to top, update preview and unread count)
                    setConversations(prev => {
                        const idx = prev.findIndex(c => c.id === newMsg.conversation_id);
                        if (idx === -1) {
                            // If conversation not in list, might be a new one. We can just reload list to be safe.
                            loadConversations();
                            return prev;
                        }

                        const updatedConvs = [...prev];
                        const conv = { ...updatedConvs[idx] };

                        conv.updated_at = newMsg.created_at;
                        conv.last_message_at = newMsg.created_at;
                        conv.last_message_preview = newMsg.body || 'Вложение';

                        // Always increment unread if from admin, let ChatRoom handle clearing it when read
                        if (newMsg.sender_kind !== 'user') {
                            conv.unread_count = (conv.unread_count || 0) + 1;
                        }

                        updatedConvs.splice(idx, 1);
                        updatedConvs.unshift(conv);
                        return updatedConvs;
                    });

                    // 3. Process notification callback
                    if (activeConversationRef.current !== newMsg.conversation_id && newMsg.sender_kind !== 'user') {
                        if (onNewMessageRef.current) {
                            onNewMessageRef.current(newMsg);
                        }
                    }
                } else if (msg.type === 'conversation.updated' || msg.type === 'chat.conversation_updated') {
                    // Re-fetch conversations to update status
                    loadConversations();
                } else if (msg.type === 'pong') {
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
            // Exponential backoff
            reconnectTimeoutRef.current = setTimeout(() => {
                backoffRef.current = Math.min(backoffRef.current * 2, 30000);
                connectWs();
            }, backoffRef.current);
        };

        ws.onerror = (error) => {
            console.error('WS Error', error);
            // onclose will trigger reconnect
        };
    }, []);

    const disconnectWs = useCallback(() => {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.onmessage = null;
            wsRef.current.onopen = null;
            // Catch the "closed before established" warning by omitting close() if CONNECTING
            if (wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
            wsRef.current = null;
        }
        setIsConnected(false);
        setIsConnecting(false);
    }, []);

    const loadConversations = useCallback(async () => {
        try {
            const convs = await fetchConversations();

            // Fetch the last message for each conversation in parallel to populate the preview
            const convsWithPreview = await Promise.all(
                convs.map(async (c) => {
                    try {
                        const msgs = await fetchMessages(c.id, { limit: 1 });
                        if (msgs && msgs.length > 0) {
                            c.last_message_preview = msgs[0].body || 'Вложение';
                        }
                    } catch (e) {
                        console.error(`Failed to fetch preview for ${c.id}:`, e);
                    }
                    return c;
                })
            );

            setConversations(convsWithPreview);

            // Subscribe to newly loaded conversations if WS is open
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                convsWithPreview.forEach(c => {
                    wsRef.current?.send(JSON.stringify({ type: 'subscribe', data: { conversation_id: c.id } }));
                });
            }
        } catch (error) {
            console.error('Failed to load conversations', error);
        }
    }, []);

    useEffect(() => {
        // Initial load
        const tokens = getStoredTokens();
        if (tokens?.accessToken) {
            loadConversations();
            connectWs();
        }

        // Check for token changes conceptually via polling or rely on app reloading via auth state.
        // In our architecture, if the user logs out, we should disconnect.
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
    }, [connectWs, disconnectWs]);

    // Actions
    const setActiveConversation = useCallback((id: string | null) => {
        setActiveConversationId(id);
        if (id) {
            // Mark as read in WS if open
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'subscribe', data: { conversation_id: id } }));
            }
        }
    }, []);

    const loadMessagesFor = useCallback(async (conversationId: string, initialCursor?: string) => {
        try {
            let cursor = initialCursor;
            let keepLoading = true;
            let allFetchedMessages: ChatMessage[] = [];

            while (keepLoading) {
                const apiMessages = await fetchMessages(conversationId, { cursor });
                if (apiMessages.length === 0) {
                    break;
                }

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
                // merge and sort. Simple approach: append and deduplicate
                const merged = [...existing, ...allFetchedMessages];
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
        // Optimistic UI
        const clientMsgId = crypto.randomUUID();
        const tempMsg: ChatMessage = {
            id: `temp-${clientMsgId}`,
            conversation_id: conversationId,
            sender_kind: 'user',
            sender_id: 0, // Doesn't matter for temp
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
            const updatedConv = { ...copy[idx] };
            updatedConv.last_message_preview = text;
            updatedConv.updated_at = tempMsg.created_at;
            updatedConv.last_message_at = tempMsg.created_at;

            copy.splice(idx, 1);
            copy.unshift(updatedConv);
            return copy;
        });

        // Always use REST to send the message, as the backend only listens to HTTP POST for writes.
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
    }, []);

    const markAsRead = useCallback((conversationId: string, lastMessageId: string) => {
        // Clear locally immediately for UI response
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
