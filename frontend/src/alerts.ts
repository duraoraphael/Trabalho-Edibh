export type AlertType = "success" | "info" | "warning" | "error";

export interface AppAlert {
  type: AlertType;
  title: string;
  message: string;
  durationMs?: number;
}

const EVENT_NAME = "app-alert";

export function emitAlert(alert: AppAlert) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: alert }));
}

export function subscribeAlerts(handler: (alert: AppAlert) => void) {
  const listener = (event: Event) => {
    const custom = event as CustomEvent<AppAlert>;
    handler(custom.detail);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
