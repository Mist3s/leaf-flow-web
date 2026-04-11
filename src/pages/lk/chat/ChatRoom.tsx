import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, Send, CheckSquare, Clock, AlertCircle, ChevronUp } from 'lucide-react';
import { useChatContext } from '../../../store/ChatContext';
import { PageLoader } from '../../../components/PageLoader';
import { ChatMessage } from '../../../types/chat';

type Props = {
    conversationId: string;
    onNavigate: (path: string) => void;
};

/** Рендер системного сообщения по payload.action */
const renderSystemBody = (msg: ChatMessage): string => {
    if (msg.payload) {
        if (msg.payload.action === 'assigned') {
            const name = msg.payload.admin_name;
            return name
                ? `Сотрудник поддержки ${name} подключился к диалогу`
                : 'Сотрудник поддержки подключился к диалогу';
        }
        if (msg.payload.action === 'closed') {
            return 'Диалог завершён';
        }
    }
    // Fallback: показываем body как есть
    return msg.body || '';
};

export const ChatRoom: React.FC<Props> = ({ conversationId, onNavigate }) => {
    const { conversations, messages, loadMessagesFor, loadMoreMessages, hasMoreMessages, sendMessage, setActiveConversation, markAsRead } = useChatContext();
    const [text, setText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesTopRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const firstUnreadRef = useRef<HTMLDivElement>(null);
    const [hasScrolledOnLoad, setHasScrolledOnLoad] = useState(false);
    const [showUnreadSeparator, setShowUnreadSeparator] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const conversation = conversations.find(c => c.id === conversationId);

    // Capture initial unread count on mount (safe now since key=conversationId)
    const [initialUnread] = useState(() => conversation?.unread_count || 0);

    const conversationMessages = messages[conversationId] || [];

    // Track the ID of the first unseen message so we can render the separator above it
    const [firstUnseenId, setFirstUnseenId] = useState<string | null>(() => {
        if (initialUnread > 0 && conversationMessages.length >= initialUnread) {
            return conversationMessages[conversationMessages.length - initialUnread].id;
        }
        return null;
    });

    const [isAtBottom, setIsAtBottom] = useState(false);
    const [isFocused, setIsFocused] = useState(document.hasFocus());
    const [isIdle, setIsIdle] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);

    // Track user activity to determine idle state (e.g., walked away from computer)
    useEffect(() => {
        let idleTimer: ReturnType<typeof setTimeout>;

        const resetIdle = () => {
            setIsIdle(false);
            clearTimeout(idleTimer);
            // Consider user idle after 30 seconds of no interaction
            idleTimer = setTimeout(() => setIsIdle(true), 30000);
        };

        // Initialize
        resetIdle();

        // Listen for activity
        window.addEventListener('mousemove', resetIdle);
        window.addEventListener('keydown', resetIdle);
        window.addEventListener('scroll', resetIdle, true);
        window.addEventListener('click', resetIdle);

        return () => {
            clearTimeout(idleTimer);
            window.removeEventListener('mousemove', resetIdle);
            window.removeEventListener('keydown', resetIdle);
            window.removeEventListener('scroll', resetIdle, true);
            window.removeEventListener('click', resetIdle);
        };
    }, []);

    // Effect to catch incoming messages when unfocused or idle
    const prevMessagesLength = useRef(conversationMessages.length);
    useEffect(() => {
        if (conversationMessages.length > prevMessagesLength.current) {
            // New message arrived!
            const newCount = conversationMessages.length - prevMessagesLength.current;
            if ((!isFocused || isIdle) && !firstUnseenId && newCount > 0) {
                // If unfocused or idle, and we don't already have a separator, show one
                setFirstUnseenId(conversationMessages[conversationMessages.length - newCount].id);
                setShowUnreadSeparator(true);
            }
        }
        prevMessagesLength.current = conversationMessages.length;
    }, [conversationMessages.length, isFocused, isIdle, firstUnseenId]);

    useEffect(() => {
        setActiveConversation(conversationId);
        loadMessagesFor(conversationId);
        return () => setActiveConversation(null);
    }, [conversationId, setActiveConversation, loadMessagesFor]);

    // Using a ref to track the last number of messages we SCROLLED for,
    // to prevent re-scrolling when simply focusing the window.
    const lastScrolledMessagesCount = useRef(0);

    useEffect(() => {
        if (conversationMessages.length > 0 && !hasScrolledOnLoad) {
            if (firstUnseenId && firstUnreadRef.current) {
                // Wait a tick for rendering to complete, then scroll
                setTimeout(() => {
                    firstUnreadRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
                }, 50);
            } else {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
            }
            setHasScrolledOnLoad(true);
            lastScrolledMessagesCount.current = conversationMessages.length;
        } else if (hasScrolledOnLoad && conversationMessages.length > lastScrolledMessagesCount.current) {
            // Only auto-scroll for NEW messages if the chat IS focused
            // Otherwise, we let them scroll down themselves
            if (isFocused || !firstUnreadRef.current) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
                lastScrolledMessagesCount.current = conversationMessages.length;
            }
        }
    }, [conversationMessages.length, hasScrolledOnLoad, firstUnseenId, isFocused]);

    // Track window focus
    useEffect(() => {
        const handleFocus = () => {
            setIsFocused(true);
        };
        const handleBlur = () => setIsFocused(false);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    // Track if user is at the bottom of the chat
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setIsAtBottom(entry.isIntersecting),
            { threshold: 0.1 }
        );
        if (messagesEndRef.current) {
            observer.observe(messagesEndRef.current);
        }
        return () => observer.disconnect();
    }, []);

    // Lazy load: подгрузка предыдущих сообщений при скролле вверх
    useEffect(() => {
        if (!hasMoreMessages(conversationId)) return;

        const observer = new IntersectionObserver(
            async ([entry]) => {
                if (entry.isIntersecting && !isLoadingMore) {
                    setIsLoadingMore(true);

                    // Запоминаем текущую высоту скролла чтобы восстановить позицию
                    const container = messagesContainerRef.current;
                    const prevScrollHeight = container?.scrollHeight || 0;

                    await loadMoreMessages(conversationId);

                    // Восстанавливаем позицию скролла после подгрузки
                    requestAnimationFrame(() => {
                        if (container) {
                            const newScrollHeight = container.scrollHeight;
                            container.scrollTop += newScrollHeight - prevScrollHeight;
                        }
                    });

                    setIsLoadingMore(false);
                }
            },
            { threshold: 0.1 }
        );

        if (messagesTopRef.current) {
            observer.observe(messagesTopRef.current);
        }
        return () => observer.disconnect();
    }, [conversationId, hasMoreMessages, loadMoreMessages, isLoadingMore]);

    // Handle visual viewport resize (e.g. mobile keyboard appearing)
    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;

        const handleResize = () => {
            if (isFocused || isAtBottom) {
                // Use a short timeout to let the browser finish layout
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
                }, 50);
            }
        };

        viewport.addEventListener('resize', handleResize);
        return () => viewport.removeEventListener('resize', handleResize);
    }, [isFocused, isAtBottom]);

    // Hide separator and mark as read when user actively views messages at the bottom
    useEffect(() => {
        if (!hasScrolledOnLoad || conversationMessages.length === 0) return;

        // If the chat is in focus, user is not idle, and scrolled to the bottom (or past the unread separator)
        if (isFocused && !isIdle && isAtBottom) {
            const currentUnread = conversation?.unread_count || 0;

            // If there's something to mark as read or hide
            if (currentUnread > 0 || showUnreadSeparator) {
                const timeoutId = setTimeout(() => {
                    if (showUnreadSeparator && !isFadingOut) {
                        setIsFadingOut(true);
                        setTimeout(() => {
                            setShowUnreadSeparator(false);
                            setFirstUnseenId(null);
                            setIsFadingOut(false);
                        }, 400); // Match CSS transition duration
                    }
                    if (currentUnread > 0) {
                        const lastId = conversationMessages[conversationMessages.length - 1].id;
                        markAsRead(conversationId, lastId);
                    }
                }, 1500); // 1.5 seconds delay to ensure they "read" it

                return () => clearTimeout(timeoutId);
            }
        }
    }, [hasScrolledOnLoad, isFocused, isIdle, isAtBottom, conversationMessages, showUnreadSeparator, isFadingOut, conversation?.unread_count, conversationId, markAsRead]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || conversation?.status === 'closed') return;
        sendMessage(conversationId, text);
        setText('');
        if (showUnreadSeparator && !isFadingOut) {
            setIsFadingOut(true);
            setTimeout(() => {
                setShowUnreadSeparator(false);
                setFirstUnseenId(null);
                setIsFadingOut(false);
            }, 400);
        }
    };

    if (!conversation) {
        return <div className="chat-room"><PageLoader message="Загрузка чата..." /></div>;
    }

    const isClosed = conversation.status === 'closed';

    return (
        <div className="chat-room">
            <div className="chat-room__header">
                <button className="chat-room__back chat-room__back--mobile-only" onClick={() => onNavigate('/lk/chat')}>
                    <ArrowLeft size={20} />
                </button>
                <div className="chat-room__header-info">
                    <h2 className="chat-room__title">
                        {conversation.topic_type === 'support' ? 'Служба поддержки' : `Заказ #${conversation.topic_id}`}
                    </h2>
                    <span className="chat-room__subtitle">
                        {isClosed ? 'Диалог завершён' : 'Мы ответим вам в ближайшее время'}
                    </span>
                </div>
            </div>

            <div className="chat-room__messages" ref={messagesContainerRef}>
                {/* Sentinel для подгрузки предыдущих сообщений */}
                <div ref={messagesTopRef} style={{ height: 1 }} />

                {isLoadingMore && (
                    <div className="chat-room__loading-more">
                        <span>Загрузка...</span>
                    </div>
                )}

                {conversationMessages.map((msg, idx) => {
                    const isUser = msg.sender_kind === 'user';

                    // Basic date grouping
                    const msgDate = new Date(msg.created_at).toLocaleDateString('ru-RU');
                    const prevMsgDate = idx > 0 ? new Date(conversationMessages[idx - 1].created_at).toLocaleDateString('ru-RU') : null;
                    const showDateSeparator = msgDate !== prevMsgDate;

                    const isFirstUnread = showUnreadSeparator && firstUnseenId === (msg.id || msg.client_msg_id);

                    return (
                        <React.Fragment key={msg.id || msg.client_msg_id}>
                            {showDateSeparator && (
                                <div className="chat-date-separator">
                                    <span>{new Date(msg.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                                </div>
                            )}
                            {isFirstUnread && (
                                <div className={`chat-unread-separator ${isFadingOut ? 'chat-unread-separator--fade-out' : ''}`} ref={firstUnreadRef}>
                                    <div className="chat-unread-separator__inner">
                                        <span>Новые сообщения</span>
                                    </div>
                                </div>
                            )}
                            {msg.type === 'system' ? (
                                <div className="chat-system-message">
                                    <span>{renderSystemBody(msg)}</span>
                                </div>
                            ) : (
                                <div className={`chat-message ${isUser ? 'chat-message--user' : 'chat-message--agent'}`}>
                                    <div className="chat-message__bubble">
                                        <div className="chat-message__text">{msg.body}</div>
                                        <div className="chat-message__meta">
                                            <span className="chat-message__time">
                                                {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {isUser && msg._localStatus === 'sending' && <Clock size={12} className="chat-message__status-icon" />}
                                            {isUser && msg._localStatus === 'failed' && <AlertCircle size={12} className="chat-message__status-icon error" />}
                                            {isUser && !msg._localStatus && <CheckSquare size={12} className="chat-message__status-icon success" />}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-room__input-area">
                {isClosed ? (
                    <div className="chat-room__closed-notice">
                        Этот диалог завершён. Вы не можете отправлять новые сообщения.
                    </div>
                ) : (
                    <form className="chat-input-form" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            className="chat-input-form__field"
                            placeholder="Введите сообщение..."
                            value={text}
                            onChange={e => setText(e.target.value)}
                            disabled={isClosed}
                        />
                        <button
                            type="submit"
                            className="chat-input-form__submit"
                            disabled={!text.trim() || isClosed}
                            onMouseDown={(e) => e.preventDefault()}
                            onTouchStart={(e) => e.preventDefault()}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
