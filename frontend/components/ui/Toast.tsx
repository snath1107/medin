"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useState } from "react";

type Tone = "success" | "error" | "info";

interface ToastInput {
  message: string;
  tone?: Tone;
  action?: { label: string; href?: string; onClick?: () => void };
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

/** Show a short message at the bottom of the screen: `const toast = useToast(); toast({ message })` */
export const useToast = () => useContext(ToastContext);

const ICONS = {
  success: <CircleCheck className="shrink-0 text-[#7BC59A]" size={18} />,
  error: <CircleAlert className="shrink-0 text-[#F19A90]" size={18} />,
  info: <Info className="shrink-0 text-line-400" size={18} />,
};

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (toast: ToastInput) => {
      const id = nextId++;
      setToasts((all) => [...all.slice(-2), { ...toast, id }]);
      // Errors stay until dismissed, so they can't be missed.
      if (toast.tone !== "error") setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-20 z-50 flex flex-col items-center gap-2.5 md:bottom-7"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-md bg-ink-900 py-3 pl-4 pr-3 text-white shadow-float"
            role="status"
          >
            {ICONS[toast.tone ?? "info"]}
            <span className="flex-1 text-[14.5px] leading-5">{toast.message}</span>
            {toast.action &&
              (toast.action.href ? (
                <Link className="text-sm font-semibold text-[#9FD3D8]" href={toast.action.href}>
                  {toast.action.label}
                </Link>
              ) : (
                <button className="text-sm font-semibold text-[#9FD3D8]" type="button" onClick={toast.action.onClick}>
                  {toast.action.label}
                </button>
              ))}
            <button aria-label="Dismiss" className="p-0.5 text-ink-300 hover:text-white" type="button" onClick={() => dismiss(toast.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
