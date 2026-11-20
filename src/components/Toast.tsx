/* Toasts (design system cc-toast) confirming saves. They sit below the 64px top bar and close after 5 seconds. */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastItem { id: number; title: string; desc?: string }
type Show = (title: string, desc?: string) => void;

const ToastContext = createContext<Show>(() => {});
export const useToast = () => useContext(ToastContext);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const show = useCallback<Show>((title, desc) => {
    const id = ++nextId;
    setItems((l) => [...l, { id, title, desc }]);
    window.setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="cc-toast-region" style={{ ['--cc-toast-top' as string]: '80px' }}>
        <div aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className="cc-toast" role="status">
              <span className="cc-toast__icon" aria-hidden="true"><CheckCircle2 size={20} /></span>
              <div className="cc-toast__body">
                <p className="cc-toast__title">{t.title}</p>
                {t.desc && <p className="cc-toast__desc">{t.desc}</p>}
              </div>
              <button type="button" className="cc-icon-btn cc-icon-btn--xs cc-toast__close" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
