export type ToastType = "success" | "info" | "warning" | "error";

export type ToastOptions = {
  title?: string;
};

export type ToastNotification = {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
  exiting: boolean;
};

type StoredToast = ToastNotification & {
  remaining: number | null;
  timer?: number;
  exitTimer?: number;
  startedAt?: number;
};

const MAX_TOASTS = 3;
const EXIT_DURATION = 380;
const listeners = new Set<() => void>();
let nextId = 0;
let notifications: StoredToast[] = [];
let snapshot: ToastNotification[] = [];

function publish() {
  snapshot = notifications.map(({ id, type, title, message, exiting }) => ({
    id,
    type,
    title,
    message,
    exiting,
  }));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function clearTimer(notification: StoredToast) {
  if (notification.timer !== undefined) {
    window.clearTimeout(notification.timer);
    notification.timer = undefined;
  }
  notification.startedAt = undefined;
}

function startTimer(notification: StoredToast) {
  if (notification.remaining === null || notification.exiting) return;
  notification.startedAt = Date.now();
  notification.timer = window.setTimeout(
    () => dismiss(notification.id),
    notification.remaining,
  );
}

function dismiss(id: number) {
  const notification = notifications.find((item) => item.id === id);
  if (!notification || notification.exiting) return;

  clearTimer(notification);
  notification.exiting = true;
  notification.exitTimer = window.setTimeout(() => {
    notifications = notifications.filter((item) => item.id !== id);
    publish();
  }, EXIT_DURATION);
  publish();
}

function add(type: ToastType, message: string, options?: ToastOptions) {
  const duration =
    type === "error" ? null : type === "warning" ? 7000 : 4000;

  while (notifications.length >= MAX_TOASTS) {
    const oldest = notifications.shift();
    if (oldest) {
      clearTimer(oldest);
      if (oldest.exitTimer !== undefined) window.clearTimeout(oldest.exitTimer);
    }
  }

  const notification: StoredToast = {
    id: ++nextId,
    type,
    title: options?.title,
    message,
    exiting: false,
    remaining: duration,
  };
  notifications = [...notifications, notification];
  startTimer(notification);
  publish();
  return notification.id;
}

function pause(id: number) {
  const notification = notifications.find((item) => item.id === id);
  if (!notification || notification.timer === undefined) return;
  const startedAt = notification.startedAt;
  clearTimer(notification);
  if (notification.remaining !== null && startedAt !== undefined) {
    notification.remaining = Math.max(
      0,
      notification.remaining - (Date.now() - startedAt),
    );
  }
}

function resume(id: number) {
  const notification = notifications.find((item) => item.id === id);
  if (notification && notification.timer === undefined) startTimer(notification);
}

function clearAll() {
  notifications.forEach((notification) => {
    clearTimer(notification);
    if (notification.exitTimer !== undefined) {
      window.clearTimeout(notification.exitTimer);
    }
  });
  notifications = [];
  publish();
}

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    add("success", message, options),
  info: (message: string, options?: ToastOptions) =>
    add("info", message, options),
  warning: (message: string, options?: ToastOptions) =>
    add("warning", message, options),
  error: (message: string, options?: ToastOptions) =>
    add("error", message, options),
};

export const toastStore = {
  subscribe,
  getSnapshot,
  dismiss,
  pause,
  resume,
  clearAll,
};
