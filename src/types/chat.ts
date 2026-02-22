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
    topic_id: number | null;
    status: ConversationStatus;
    assignee_admin_id: number | null;
    unread_count?: number;
    last_message_preview?: string;
    last_message_at: string;
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

/** 
 * WebSocket Входящие сообщения (от сервера)
 */
export type WsIncomingEvent =
    | { type: 'message.created'; data: { message: ChatMessage } }
    | { type: 'chat.message_created'; data: any }
    | { type: 'conversation.updated'; data: { action: 'assigned' | 'closed'; conversation_id: string } }
    | { type: 'chat.conversation_updated'; data: any }
    | { type: 'pong'; data: Record<string, never> }
    | { type: 'error'; data: { code: string; detail: string } };

/**
 * WebSocket Исходящие сообщения (от клиента)
 */
export type WsOutgoingEvent =
    | { type: 'subscribe'; data: { conversation_id: string } }
    | { type: 'message.send'; data: { conversation_id: string; client_msg_id: string; type: MessageType; body: string } }
    | { type: 'mark_read'; data: { conversation_id: string; last_message_id: string } }
    | { type: 'ping'; data: Record<string, never> };
