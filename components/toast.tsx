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
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
            t.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          <span>{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-2 text-white/80 hover:text-white"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
