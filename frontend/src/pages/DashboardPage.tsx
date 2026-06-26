import { useEffect, useState } from "react";
import { FiAlertTriangle, FiBarChart2, FiClipboard, FiUsers } from "react-icons/fi";
import api, { getApiErrorMessage } from "../api";

function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchSummary() {
      try {
        const response = await api.get("/dashboard/summary");
        if (isMounted) {
          setSummary(response.data);
          setError("");
        }
      } catch (err) {
        if (isMounted) setError(getApiErrorMessage(err, "Erro ao carregar dashboard."));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchSummary();
    const interval = setInterval(fetchSummary, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Dashboard Gerencial</h1>
          <p className="subtitle">Visão corporativa em tempo real para tomada de decisão.</p>
        </div>
      </header>
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <div className="loading-state">Carregando...</div>
      ) : (
        <>
          <section className="dashboard-cards">
            {[
              { key: "total_records", label: "Total de registros", icon: FiBarChart2, trend: "+12%" },
              { key: "total_orders", label: "Ordens no período", icon: FiClipboard, trend: "+5%" },
              { key: "total_failures", label: "Falhas reportadas", icon: FiAlertTriangle, trend: "-3%" },
              { key: "total_users", label: "Usuários ativos", icon: FiUsers, trend: "+8%" },
            ].map((item) => (
              <div key={item.key} className="metric-card">
                <div className="metric-head">
                  <div className="metric-icon"><item.icon /></div>
                  <span className="metric-trend">{item.trend}</span>
                </div>
                <h2>{item.label}</h2>
                <p>{summary ? summary[item.key] : "-"}</p>
                <div className="sparkline" aria-hidden="true">
                  <span style={{ height: "45%" }} />
                  <span style={{ height: "60%" }} />
                  <span style={{ height: "52%" }} />
                  <span style={{ height: "72%" }} />
                  <span style={{ height: "68%" }} />
                </div>
              </div>
            ))}
          </section>
          <section className="dashboard-graphs">
            <div className="card chart-card">
              <h3>Registros por Gerência</h3>
              <ul className="insight-list">
                {Object.entries(summary?.records_by_gerencia || {}).slice(0, 5).map(([key, value]) => (
                  <li key={key}><span>{key}</span><strong>{String(value)}</strong></li>
                ))}
                {!Object.keys(summary?.records_by_gerencia || {}).length && <li><span>Sem dados</span><strong>-</strong></li>}
              </ul>
            </div>
            <div className="card chart-card">
              <h3>Registros por Sistema</h3>
              <ul className="insight-list">
                {Object.entries(summary?.records_by_sistema || {}).slice(0, 5).map(([key, value]) => (
                  <li key={key}><span>{key}</span><strong>{String(value)}</strong></li>
                ))}
                {!Object.keys(summary?.records_by_sistema || {}).length && <li><span>Sem dados</span><strong>-</strong></li>}
              </ul>
            </div>
            <div className="card chart-card">
              <h3>Evolução mensal</h3>
              <ul className="insight-list">
                {Object.entries(summary?.monthly_evolution || {}).slice(-6).map(([key, value]) => (
                  <li key={key}><span>{key}</span><strong>{String(value)}</strong></li>
                ))}
                {!Object.keys(summary?.monthly_evolution || {}).length && <li><span>Sem dados</span><strong>-</strong></li>}
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
