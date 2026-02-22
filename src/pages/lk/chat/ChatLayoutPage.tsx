import React, { useEffect, useState } from 'react';
import { useChatContext } from '../../../store/ChatContext';
import { ChatSidebar } from './ChatSidebar';
import { ChatRoom } from './ChatRoom';

type Props = {
    conversationId?: string;
    onNavigate: (path: string) => void;
};

export const ChatLayoutPage: React.FC<Props> = ({ conversationId, onNavigate }) => {
    const [vvHeight, setVvHeight] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            return window.visualViewport ? window.visualViewport.height : window.innerHeight;
        }
        return 0;
    });

    useEffect(() => {
        const updateHeight = () => {
            if (window.visualViewport) {
                setVvHeight(window.visualViewport.height);
            } else {
                setVvHeight(window.innerHeight);
            }
        };

        // Initial setup
        updateHeight();

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateHeight);
            return () => window.visualViewport?.removeEventListener('resize', updateHeight);
        } else {
            window.addEventListener('resize', updateHeight);
            return () => window.removeEventListener('resize', updateHeight);
        }
    }, []);

    return (
        <div
            className="chat-layout container"
            style={{ '--vv-height': `${vvHeight}px` } as React.CSSProperties}
        >
            <div className={`chat-layout__sidebar ${conversationId ? 'chat-layout__sidebar--hidden-mobile' : ''}`}>
                <ChatSidebar
                    activeId={conversationId}
                    onNavigate={onNavigate}
                />
            </div>
            <div className={`chat-layout__content ${!conversationId ? 'chat-layout__content--hidden-mobile' : ''}`}>
                {conversationId ? (
                    <ChatRoom key={conversationId} conversationId={conversationId} onNavigate={onNavigate} />
                ) : (
                    <div className="chat-layout__empty">
                        <div className="chat-layout__empty-icon">💬</div>
                        <h3>Выберите чат</h3>
                        <p>Нажмите на диалог слева или создайте новый для начала общения.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
