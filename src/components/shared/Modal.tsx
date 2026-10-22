import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({
  children,
  onClose,
  label,
  wide = false,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  wide?: boolean;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 isolate flex items-start justify-center overflow-y-auto overscroll-contain bg-[rgba(0,0,0,0.48)] p-4 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`relative flex max-h-[calc(100vh-2rem)] w-full min-w-0 flex-col overflow-y-auto overscroll-contain rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:p-6 ${wide ? "max-w-3xl" : "max-w-xl"}`}
      >
        <button
          ref={closeButtonRef}
          type="button"
          aria-label={`Close ${label}`}
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
