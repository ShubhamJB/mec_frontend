import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Check, CircleAlert, Info } from 'lucide-react';
import './toast.css';

export type ToastKind = 'success' | 'error' | 'info';

type ToastMessage = {
  id: number;
  message: string;
  kind: ToastKind;
  exiting: boolean;
};

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind, duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 0;
const toastExitDuration = () => (
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 270
);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef(new Map<number, number>());

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.map((toast) => (
      toast.id === id ? { ...toast, exiting: true } : toast
    )));
    const existing = timers.current.get(id);
    if (existing !== undefined) window.clearTimeout(existing);
    const removeTimer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      timers.current.delete(id);
    }, toastExitDuration());
    timers.current.set(id, removeTimer);
  }, []);

  const showToast = useCallback((message: string, kind: ToastKind = 'success', duration = 4200) => {
    const id = ++nextToastId;
    setToasts((current) => [...current.slice(-2), { id, message, kind, exiting: false }]);
    timers.current.set(id, window.setTimeout(() => dismissToast(id), duration));
  }, [dismissToast]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-viewport" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`global-toast global-toast--${toast.kind}${toast.exiting ? ' is-exiting' : ''}`}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
          >
            <span className="global-toast__mark" aria-hidden="true">
              {toast.kind === 'success' ? <Check size={15} strokeWidth={2.2} />
                : toast.kind === 'error' ? <CircleAlert size={15} strokeWidth={2.2} />
                  : <Info size={15} strokeWidth={2.2} />}
            </span>
            <span className="global-toast__message">{toast.message}</span>
            <button
              className="global-toast__close"
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
