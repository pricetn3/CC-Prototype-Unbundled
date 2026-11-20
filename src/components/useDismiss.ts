import { useEffect, type RefObject } from 'react';

/** Closes a popover on Escape or on a click outside `ref`. Focus goes back to `returnTo` on Escape. */
export function useDismiss(open: boolean, ref: RefObject<HTMLElement>, close: () => void, returnTo?: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        returnTo?.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, ref, close, returnTo]);
}
