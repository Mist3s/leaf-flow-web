import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, ShoppingCart, XCircle } from 'lucide-react';

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastTone = 'info' | 'success' | 'warning' | 'error' | 'cart';

export type ToastItem = {
  id: string;
  message: string;
  tone?: ToastTone;
  actions?: ToastAction[];
  duration?: number; // ms, 0 = no auto-close
};

type Props = {
  toasts: ToastItem[];
  onClose: (id: string) => void;
};

const ICONS: Record<ToastTone, React.ElementType> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  cart: ShoppingCart,
};

const ToastCard: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    if (duration === 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 200);
  };

  const Icon = ICONS[toast.tone || 'info'];

  return (
    <div className={`toast toast--${toast.tone || 'info'} ${isExiting ? 'toast--exiting' : ''}`}>
      <div className="toast__icon-wrap">
        <Icon size={20} className="toast__icon" />
          </div>

      <div className="toast__content">
        <p className="toast__message">{toast.message}</p>
        {toast.actions && toast.actions.length > 0 && (
              <div className="toast__actions">
                {toast.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className="toast__action"
                    onClick={() => {
                      action.onClick();
                  handleClose();
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

      <button className="toast__close" aria-label="Закрыть уведомление" onClick={handleClose}>
        <X size={18} />
          </button>

      {duration > 0 && (
        <div className="toast__progress">
          <div className="toast__progress-bar" style={{ '--progress': `${progress}%` } as React.CSSProperties} />
        </div>
      )}
    </div>
  );
};

export const ToastStack: React.FC<Props> = ({ toasts, onClose }) => {
  if (!toasts.length) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  );
};
