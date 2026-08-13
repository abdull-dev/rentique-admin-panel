"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;

/**
 * Toast state + auto-dismiss, with timers tracked so they're cleared on
 * unmount — otherwise a pending `setTimeout` fires `setState` on an unmounted
 * component after navigating away (a leak / React warning).
 */
export function useToasts(autoDismissMs = 3000) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (message: string, type: Toast["type"]) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      const timer = setTimeout(() => dismissToast(id), autoDismissMs);
      timers.current.set(id, timer);
    },
    [autoDismissMs, dismissToast],
  );

  useEffect(() => {
    const timersAtMount = timers.current;
    return () => {
      timersAtMount.forEach((t) => clearTimeout(t));
      timersAtMount.clear();
    };
  }, []);

  return { toasts, addToast, dismissToast };
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-white shadow-lg"
          style={{
            background: t.type === "success" ? "#0E8F6B" : "#D6336C",
            borderRadius: "999px",
            minWidth: "240px",
            maxWidth: "360px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          }}
        >
          {/* Icon */}
          {t.type === "success" ? (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          )}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-1 shrink-0 rounded-full p-0.5 transition-colors hover:bg-white/20"
            aria-label="Dismiss"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
