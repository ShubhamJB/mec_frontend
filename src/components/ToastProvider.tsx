import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import './toast.css';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export type ToastAction = {
  label: string;
  onClick: () => void;
  primary?: boolean;
};

export type ToastOptions = {
  title?: string;
  key?: string;
  actions?: ToastAction[];
};

type ToastMessage = {
  id: number;
  message: string;
  kind: ToastKind;
  exiting: boolean;
  title?: string;
  key?: string;
  actions?: ToastAction[];
  persistent: boolean;
};

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind, duration?: number, options?: ToastOptions) => void;
  dismissToastByKey: (key: string) => void;
};

const toastTitles: Record<ToastKind, string> = {
  success: 'Done',
  error: 'Something went wrong',
  info: 'Heads up',
  warning: 'Please note',
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

  const toastsRef = useRef<ToastMessage[]>([]);
  toastsRef.current = toasts;

  const showToast = useCallback((message: string, kind: ToastKind = 'success', duration = 4200, options: ToastOptions = {}) => {
    if (options.key && toastsRef.current.some((toast) => toast.key === options.key && !toast.exiting)) return;
    const id = ++nextToastId;
    const persistent = duration <= 0;
    const toast: ToastMessage = { id, message, kind, exiting: false, persistent, title: options.title, key: options.key, actions: options.actions };
    setToasts((current) => [
      ...current.filter((item) => item.persistent),
      ...current.filter((item) => !item.persistent).slice(-2),
      toast,
    ]);
    if (!persistent) timers.current.set(id, window.setTimeout(() => dismissToast(id), duration));
  }, [dismissToast]);

  const dismissToastByKey = useCallback((key: string) => {
    toastsRef.current.filter((toast) => toast.key === key && !toast.exiting).forEach((toast) => dismissToast(toast.id));
  }, [dismissToast]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToastByKey }}>
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
              <span className="global-toast__disc">
                {toast.kind === 'success' ? <Check size={14} strokeWidth={3} />
                  : toast.kind === 'error' || toast.kind === 'warning' ? '!' : 'i'}
              </span>
            </span>
            <div className="global-toast__body">
              <strong className="global-toast__title">{toast.title ?? toastTitles[toast.kind]}</strong>
              <span className="global-toast__message">{toast.message}</span>
              {toast.actions && toast.actions.length > 0 && (
                <div className="global-toast__actions">
                  {toast.actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      className={action.primary ? 'is-primary' : undefined}
                      onClick={() => {
                        dismissToast(toast.id);
                        action.onClick();
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="global-toast__close"
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
            >
              <X size={18} strokeWidth={1.6} />
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
