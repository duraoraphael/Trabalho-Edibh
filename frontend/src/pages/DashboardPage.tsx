import { useEffect, useState } from "react";
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
          <p>Visão corporativa em tempo real para tomada de decisão.</p>
        </div>
      </header>
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <div className="loading-state">Carregando...</div>
      ) : (
        <>
          <section className="dashboard-cards">
            {["total_records", "total_orders", "total_failures", "total_users"].map((key) => (
              <div key={key} className="card">
                <h2>{key.replace(/_/g, " ")}</h2>
                <p>{summary ? summary[key] : "-"}</p>
              </div>
            ))}
          </section>
          <section className="dashboard-graphs">
            <div className="card">Gráfico de Registros por Gerência</div>
            <div className="card">Gráfico de Registros por Sistema</div>
            <div className="card">Registros Mensais</div>
          </section>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
