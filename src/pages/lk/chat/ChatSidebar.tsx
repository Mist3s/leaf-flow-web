import React, { useState, useMemo } from 'react';
import { MessageSquare, Plus, Package, Search } from 'lucide-react';
import { useChatContext } from '../../../store/ChatContext';

type Props = {
    activeId?: string;
    onNavigate: (path: string) => void;
};

export const ChatSidebar: React.FC<Props> = ({ activeId, onNavigate }) => {
    const { conversations, createSupport } = useChatContext();
    const [searchQuery, setSearchQuery] = useState('');

    const handleCreateSupport = async () => {
        const id = await createSupport();
        if (id) {
            onNavigate(`/lk/chat/${id}`);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        }
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Вчера';
        }
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    };

    const filteredConversations = useMemo(() => {
        if (!searchQuery) return conversations;
        const lowerQ = searchQuery.toLowerCase();
        return conversations.filter(c => {
            const title = c.topic_type === 'support' ? 'Служба поддержки' : `Заказ #${c.topic_id}`;
            return title.toLowerCase().includes(lowerQ);
        });
    }, [conversations, searchQuery]);

    return (
        <div className="chat-sidebar">
            <div className="chat-sidebar__header">
                <h1 className="chat-sidebar__title">Сообщения</h1>
                <button className="chat-sidebar__new-btn" onClick={handleCreateSupport} title="Написать в поддержку">
                    <Plus size={20} />
                </button>
            </div>

            <div className="chat-sidebar__search">
                <Search size={16} className="chat-sidebar__search-icon" />
                <input
                    type="text"
                    placeholder="Поиск диалогов..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="chat-sidebar__search-input"
                />
            </div>

            <div className="chat-sidebar__list">
                {conversations.length === 0 ? (
                    <div className="chat-sidebar__empty">
                        <MessageSquare size={32} strokeWidth={1} />
                        <p>Нет диалогов</p>
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="chat-sidebar__empty">
                        <p>Ничего не найдено</p>
                    </div>
                ) : (
                    filteredConversations.map(conv => {
                        const isActive = conv.id === activeId;
                        return (
                            <div
                                key={conv.id}
                                className={`chat-conversation-item ${isActive ? 'chat-conversation-item--active' : ''}`}
                                onClick={() => onNavigate(`/lk/chat/${conv.id}`)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="chat-conversation-item__avatar">
                                    {conv.topic_type === 'support' ? <MessageSquare size={20} /> : <Package size={20} />}
                                    {conv.status === 'closed' && <div className="chat-conversation-item__status-dot chat-conversation-item__status-dot--closed" title="Завершён" />}
                                    {conv.status !== 'closed' && <div className="chat-conversation-item__status-dot chat-conversation-item__status-dot--active" title="В работе" />}
                                </div>
                                <div className="chat-conversation-item__content">
                                    <div className="chat-conversation-item__top">
                                        <h3 className="chat-conversation-item__name">
                                            {conv.topic_type === 'support' ? 'Служба поддержки' : `Заказ #${conv.topic_id}`}
                                        </h3>
                                        <span className="chat-conversation-item__time">{formatDate(conv.updated_at)}</span>
                                    </div>
                                    <div className="chat-conversation-item__bottom">
                                        <p className="chat-conversation-item__preview">
                                            {conv.last_message_preview || (conv.status === 'closed' ? 'Диалог завершён' : 'Открытый диалог')}
                                        </p>
                                        {(conv.unread_count || 0) > 0 && (
                                            <span className="chat-conversation-item__badge">
                                                {conv.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
