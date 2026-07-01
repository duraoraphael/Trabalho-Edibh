import { useEffect, useState } from "react";
import { FiActivity, FiCheckCircle, FiClock, FiCpu, FiLayers, FiUsers } from "react-icons/fi";
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
        <div>
          <h1>Dashboard Executivo</h1>
          <p className="subtitle">Indicadores estratégicos para priorização e performance operacional.</p>
        </div>
      </header>
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <div className="loading-state">Carregando...</div>
      ) : (
        <>
          <section className="dashboard-cards">
            <div className="metric-card">
              <div className="metric-head"><div className="metric-icon"><FiActivity /></div><span className="metric-trend">+4%</span></div>
              <h2>Total OS abertas</h2>
              <p>{executive ? executive.total_os_abertas : "-"}</p>
            </div>
            <div className="metric-card">
              <div className="metric-head"><div className="metric-icon"><FiCheckCircle /></div><span className="metric-trend">+9%</span></div>
              <h2>Total OS encerradas</h2>
              <p>{executive ? executive.total_os_encerradas : "-"}</p>
            </div>
            <div className="metric-card">
              <div className="metric-head"><div className="metric-icon"><FiClock /></div><span className="metric-trend">Estável</span></div>
              <h2>Tempo médio de resolução</h2>
              <p>{executive ? executive.tempo_medio_resolucao : "-"}</p>
            </div>
          </section>
          <section className="card-grid">
            <div className="card chart-card">
              <h3><FiCpu /> Ranking de equipamentos</h3>
              <ul className="insight-list">
                {(executive?.equipamentos_com_mais_ocorrencias || []).slice(0, 5).map((item: [string, number]) => (
                  <li key={item[0]}><span>{item[0]}</span><strong>{item[1]}</strong></li>
                ))}
                {!(executive?.equipamentos_com_mais_ocorrencias || []).length && <li><span>Sem dados</span><strong>-</strong></li>}
              </ul>
            </div>
            <div className="card chart-card">
              <h3><FiLayers /> Ranking de sistemas</h3>
              <ul className="insight-list">
                {(executive?.sistemas_com_mais_falhas || []).slice(0, 5).map((item: [string, number]) => (
                  <li key={item[0]}><span>{item[0]}</span><strong>{item[1]}</strong></li>
                ))}
                {!(executive?.sistemas_com_mais_falhas || []).length && <li><span>Sem dados</span><strong>-</strong></li>}
              </ul>
            </div>
            <div className="card chart-card">
              <h3><FiUsers /> Ranking de gerências</h3>
              <ul className="insight-list">
                {(executive?.ranking_gerencias || []).slice(0, 5).map((item: [string, number]) => (
                  <li key={item[0]}><span>{item[0]}</span><strong>{item[1]}</strong></li>
                ))}
                {!(executive?.ranking_gerencias || []).length && <li><span>Sem dados</span><strong>-</strong></li>}
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default ExecutiveDashboardPage;
