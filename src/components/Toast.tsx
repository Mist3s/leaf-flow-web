import React from 'react';
import { X, Info } from 'lucide-react';

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastItem = {
  id: string;
  message: string;
  tone?: 'info' | 'success' | 'warning';
  actions?: ToastAction[];
};

type Props = {
  toasts: ToastItem[];
  onClose: (id: string) => void;
};

export const ToastStack: React.FC<Props> = ({ toasts, onClose }) => {
  if (!toasts.length) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone || 'info'}`}>
          <div className="toast__icon" aria-hidden>
            <Info size={18} />
          </div>
          <div className="toast__body">
            <span>{toast.message}</span>
            {toast.actions && (
              <div className="toast__actions">
                {toast.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className="toast__action"
                    onClick={() => {
                      action.onClick();
                      onClose(toast.id);
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="toast__close" aria-label="Закрыть уведомление" onClick={() => onClose(toast.id)}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
