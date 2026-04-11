import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Smile } from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

interface EmojiPickerButtonProps {
    onEmojiSelect: (emoji: string) => void;
}

/**
 * Переиспользуемая кнопка с эмодзи-пикером.
 *
 * Desktop: dropdown позиционируется через absolute (вверх от кнопки).
 * Mobile (<768px): пикер рендерится через Portal в document.body
 * как bottom-sheet с backdrop-overlay, чтобы обойти containing block
 * от position: fixed у .chat-layout.
 */
export const EmojiPickerButton: React.FC<EmojiPickerButtonProps> = memo(({ onEmojiSelect }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleToggle = useCallback(() => {
        setOpen(prev => !prev);
    }, []);

    const handleSelect = useCallback((emojiData: { native: string }) => {
        onEmojiSelect(emojiData.native);
        setOpen(false);
    }, [onEmojiSelect]);

    const handleClose = useCallback(() => {
        setOpen(false);
    }, []);

    // Закрытие по клику вне (desktop) и Escape
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                // На мобильном клик по overlay обрабатывается отдельно
                const isMobile = window.innerWidth < 768;
                if (!isMobile) setOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const isDark = typeof document !== 'undefined' &&
        document.documentElement.getAttribute('data-theme') === 'dark';

    const pickerProps = {
        data,
        onEmojiSelect: handleSelect,
        theme: isDark ? 'dark' : 'light' as const,
        locale: 'ru',
        previewPosition: 'none' as const,
        skinTonePosition: 'search' as const,
        maxFrequentRows: 2,
    };

    return (
        <div className="emoji-picker" ref={containerRef}>
            <button
                type="button"
                className={`emoji-picker__trigger ${open ? 'emoji-picker__trigger--active' : ''}`}
                onClick={handleToggle}
                aria-label="Выбрать эмодзи"
                aria-expanded={open}
            >
                <Smile size={20} />
            </button>

            {open && !isMobile && (
                <div className="emoji-picker__dropdown">
                    <Picker {...pickerProps} perLine={9} />
                </div>
            )}

            {/* Мобильная версия: Portal в body + dynamicWidth для заполнения ширины */}
            {open && isMobile && createPortal(
                <div className="emoji-picker__mobile-overlay" onClick={handleClose}>
                    <div
                        className="emoji-picker__mobile-sheet"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="emoji-picker__mobile-handle" />
                        <Picker {...pickerProps} perLine={8} dynamicWidth />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
});

EmojiPickerButton.displayName = 'EmojiPickerButton';
