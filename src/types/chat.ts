/**
 * Типы данных для интеграции с сервисом чатов
 */

export type TopicType = 'support' | 'order';
export type ConversationStatus = 'open' | 'closed';
export type SenderKind = 'user' | 'admin';
export type MessageType = 'text' | 'system' | 'attachment';

export interface Conversation {
    id: string;
    topic_type: TopicType;
    topic_id: string | null;
    status: ConversationStatus;
    assignee_admin_id: number | null;
    user_id: number | null;
    user_name: string | null;
    admin_name: string | null;
    last_message_at: string | null;
    last_message_preview: string | null;
    unread_count: number;
    created_at: string;
    updated_at: string;
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    sender_kind: SenderKind;
    sender_id: number;
    type: MessageType;
    body: string | null;
    payload: Record<string, any> | null;
    client_msg_id: string;
    created_at: string;

    // Локальный стейт (опционально) для UI
    _localStatus?: 'sending' | 'delivered' | 'failed';
}

/** Ответ list-эндпоинтов с cursor-based пагинацией */
export interface PaginatedConversations {
    items: Conversation[];
    next_cursor: string | null;
}

export interface PaginatedMessages {
    items: ChatMessage[];
    next_cursor: string | null;
}

/**
 * WebSocket Входящие сообщения (от сервера)
 */
export type WsIncomingEvent =
    | { type: 'message.created'; data: { conversation_id: string; message: ChatMessage } }
    | { type: 'message.ack'; data: { client_msg_id: string; id: string; created_at: string; created: boolean } }
    | { type: 'conversation.updated'; data: { conversation_id: string; action: 'assigned' | 'closed'; admin_id?: number; admin_name?: string } }
    | { type: 'conversation.created'; data: { conversation_id: string } }
    | { type: 'read_state.updated'; data: { conversation_id: string; unread_count: number } }
    | { type: 'pong'; data: Record<string, never> }
    | { type: 'error'; data: { code: string; detail?: string } };

/**
 * WebSocket Исходящие сообщения (от клиента)
 */
export type WsOutgoingEvent =
    | { type: 'subscribe'; data: { conversation_id: string } }
    | { type: 'message.send'; data: { conversation_id: string; client_msg_id: string; body: string; type?: MessageType } }
    | { type: 'mark_read'; data: { conversation_id: string; last_message_id: string } }
    | { type: 'ping'; data: Record<string, never> };
