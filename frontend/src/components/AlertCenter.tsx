import { useEffect, useMemo, useState } from "react";
import { AppAlert, subscribeAlerts } from "../alerts";
import { FiAlertCircle, FiCheckCircle, FiInfo, FiAlertTriangle, FiX } from "react-icons/fi";

type AlertItem = AppAlert & { id: string; exiting?: boolean; durationMs: number };

const iconByType: Record<AppAlert["type"], JSX.Element> = {
  success: <FiCheckCircle />,
  info: <FiInfo />,
  warning: <FiAlertTriangle />,
  error: <FiAlertCircle />,
};

function AlertCenter() {
  const [items, setItems] = useState<AlertItem[]>([]);

  useEffect(() => {
    return subscribeAlerts((alert) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const payload: AlertItem = { ...alert, id, durationMs: alert.durationMs ?? 4500 };
      setItems((prev) => [...prev, payload]);

      window.setTimeout(() => closeAlert(id), payload.durationMs);
    });
  }, []);

  const closeAlert = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, exiting: true } : item)));
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 220);
  };

  const sortedItems = useMemo(() => [...items].reverse(), [items]);

  return (
    <div className="alert-center" aria-live="polite" aria-atomic="false">
      {sortedItems.map((item) => (
        <div key={item.id} className={`alert-toast alert-${item.type}${item.exiting ? " exiting" : ""}`}>
          <div className="alert-icon" aria-hidden="true">{iconByType[item.type]}</div>
          <div className="alert-body">
            <div className="alert-title">{item.title}</div>
            <div className="alert-message">{item.message}</div>
            <div className="alert-progress-track">
              <div className="alert-progress-bar" style={{ animationDuration: `${item.durationMs}ms` }} />
            </div>
          </div>
          <button type="button" className="alert-close" onClick={() => closeAlert(item.id)} aria-label="Fechar alerta">
            <FiX />
          </button>
        </div>
      ))}
    </div>
  );
}

export default AlertCenter;
