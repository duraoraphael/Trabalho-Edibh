import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../api";

function ExecutiveDashboardPage() {
  const [executive, setExecutive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchExecutive() {
      try {
        const response = await api.get("/dashboard/executive");
        if (isMounted) {
          setExecutive(response.data);
          setError("");
        }
      } catch (err) {
        if (isMounted) setError(getApiErrorMessage(err, "Erro ao carregar dashboard executivo."));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchExecutive();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Dashboard Executivo</h1>
      </header>
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <div className="loading-state">Carregando...</div>
      ) : (
        <>
          <section className="dashboard-cards">
            <div className="card">
              <h2>Total OS abertas</h2>
              <p>{executive ? executive.total_os_abertas : "-"}</p>
            </div>
            <div className="card">
              <h2>Total OS encerradas</h2>
              <p>{executive ? executive.total_os_encerradas : "-"}</p>
            </div>
            <div className="card">
              <h2>Tempo médio de resolução</h2>
              <p>{executive ? executive.tempo_medio_resolucao : "-"}</p>
            </div>
          </section>
          <section className="card-grid">
            <div className="card">Ranking de equipamentos</div>
            <div className="card">Ranking de sistemas</div>
            <div className="card">Ranking de gerências</div>
          </section>
        </>
      )}
    </div>
  );
}

export default ExecutiveDashboardPage;
