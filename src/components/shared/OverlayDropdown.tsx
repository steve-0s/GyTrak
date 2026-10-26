import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { createPortal } from "react-dom";

type Position = { top: number; left: number; width: number; maxHeight: number };

let openMenuId: string | null = null;
let nextMenuId = 0;
const openMenuEvent = "gytrak-overlay-dropdown-open";

export default function OverlayDropdown({
  label,
  children,
  className = "",
  menuClassName = "",
  minWidth = 144,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  menuClassName?: string;
  minWidth?: number;
}) {
  const idRef = useRef("");
  if (!idRef.current) idRef.current = `gytrak-menu-${++nextMenuId}`;
  const id = idRef.current;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const close = (restoreFocus = false) => {
    setOpen(false);
    setPosition(null);
    if (openMenuId === id) openMenuId = null;
    if (restoreFocus) triggerRef.current?.focus();
  };

  const updatePosition = () => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(Math.max(menu.offsetWidth, minWidth), window.innerWidth - 16);
    const maxHeight = Math.max(120, window.innerHeight - 16);
    const menuHeight = Math.min(menu.scrollHeight, maxHeight);
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top = rect.bottom + menuHeight + 8 <= window.innerHeight
      ? rect.bottom + 4
      : Math.max(8, rect.top - menuHeight - 4);
    setPosition({ top, left, width, maxHeight });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const onOpenMenu = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    window.addEventListener(openMenuEvent, onOpenMenu);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener(openMenuEvent, onOpenMenu);
    };
  }, [open, id]);

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    openMenuId = id;
    window.dispatchEvent(new CustomEvent(openMenuEvent, { detail: id }));
    setOpen(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
        className={className}
      >
        <MoreHorizontal size={17} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={`${label} menu`}
          onClick={(event) => {
            event.stopPropagation();
            if ((event.target as HTMLElement).closest("button, [role='menuitem'], a")) close();
          }}
          className={`fixed z-[100] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-left shadow-xl ${menuClassName}`}
          style={{
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            width: position?.width,
            minWidth,
            maxWidth: "calc(100vw - 16px)",
            maxHeight: position?.maxHeight ?? "calc(100vh - 16px)",
            visibility: position ? "visible" : "hidden",
          }}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}
