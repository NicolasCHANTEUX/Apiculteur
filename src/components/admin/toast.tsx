"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangleIcon, CircleCheckIcon, CloseIcon } from "@/components/icons";

type Tone = "success" | "error";
type Toast = { id: number; tone: Tone; message: string };
type ToastApi = { show: (tone: Tone, message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

// Notifications de l'administration : confirmation discrète après une action,
// erreur visible plus longtemps. Annoncées par les lecteurs d'écran.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (tone: Tone, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 8000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:p-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full max-w-[380px] items-start gap-3 rounded-xl border bg-white px-4 py-3 text-[13.5px] leading-[1.45] shadow-[0_12px_32px_-12px_rgb(61_43_26/0.45)] motion-safe:animate-[toast-in_180ms_ease-out] ${
              toast.tone === "error" ? "border-red-200 text-red-800" : "border-line text-ink"
            }`}
          >
            {toast.tone === "error" ? (
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-red-600" />
            ) : (
              <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-green-600" />
            )}
            <p className="flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="-m-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-sand hover:text-ink"
              aria-label="Fermer la notification"
            >
              <CloseIcon className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast doit être utilisé dans ToastProvider.");
  return context;
}
