import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  CircleAlert,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import { toastStore, type ToastType } from "./toast";

const icons: Record<ToastType, typeof Check> = {
  success: Check,
  info: Info,
  warning: TriangleAlert,
  error: CircleAlert,
};

export default function ToastProvider() {
  const [notifications, setNotifications] = useState(toastStore.getSnapshot);
  const containerRef = useRef<HTMLOListElement>(null);
  const positions = useRef(new Map<number, number>());

  useEffect(() => {
    const unsubscribe = toastStore.subscribe(() => {
      setNotifications(toastStore.getSnapshot());
    });
    return () => {
      unsubscribe();
      toastStore.clearAll();
    };
  }, []);

  useEffect(() => {
    const nextPositions = new Map<number, number>();
    notifications.forEach((notification) => {
      const node = containerRef.current?.querySelector<HTMLElement>(
        `[data-toast-id="${notification.id}"]`,
      );
      if (!node) return;

      const currentTop = node.offsetTop;
      const previousTop = positions.current.get(notification.id);
      if (
        previousTop !== undefined &&
        previousTop !== currentTop &&
        !notification.exiting
      ) {
        node.style.transition = "none";
        node.style.transform = `translateY(${previousTop - currentTop}px)`;
        void node.offsetHeight;
        requestAnimationFrame(() => {
          node.style.transition = "";
          node.style.transform = "";
        });
      }
      nextPositions.set(notification.id, currentTop);
    });
    positions.current = nextPositions;
  }, [notifications]);

  if (!notifications.length) return null;

  return createPortal(
    <ol
      ref={containerRef}
      className="toast-container"
      aria-label="Notifications"
    >
      {notifications.map((notification) => {
        const Icon = icons[notification.type];
        const isError = notification.type === "error";

        return (
          <li
            key={notification.id}
            data-toast-id={notification.id}
            data-type={notification.type}
            data-exiting={notification.exiting || undefined}
            className="toast-card"
            role={isError ? "alert" : "status"}
            aria-live={isError ? "assertive" : "polite"}
            aria-atomic="true"
            onPointerEnter={() => toastStore.pause(notification.id)}
            onPointerLeave={() => toastStore.resume(notification.id)}
            onFocusCapture={() => toastStore.pause(notification.id)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                toastStore.resume(notification.id);
              }
            }}
          >
            <Icon aria-hidden="true" className="toast-icon" size={19} />
            <div className="toast-copy">
              {notification.title && (
                <p className="toast-title">{notification.title}</p>
              )}
              <p className="toast-message">{notification.message}</p>
            </div>
            <button
              type="button"
              className="toast-close"
              aria-label={`Dismiss notification: ${notification.title ?? notification.message}`}
              onClick={() => toastStore.dismiss(notification.id)}
            >
              <X aria-hidden="true" size={17} />
            </button>
          </li>
        );
      })}
    </ol>,
    document.body,
  );
}
