import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../api";

function HistoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchHistory() {
      try {
        setLoading(true);
        const response = await api.get("/history");
        if (isMounted) {
          setRecords(response.data);
          setError("");
        }
      } catch (err) {
        if (isMounted) setError(getApiErrorMessage(err, "Erro ao carregar histórico."));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Histórico de Registros</h1>
      </header>
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <div className="loading-state">Carregando...</div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Instalação</th>
                <th>Sistema</th>
                <th>Equipamento</th>
                <th>Gerência</th>
                <th>Data</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item) => (
                <tr key={item.id}>
                  <td>{item.instalacao}</td>
                  <td>{item.sistema}</td>
                  <td>{item.equipamento}</td>
                  <td>{item.gerencia}</td>
                  <td>{item.data}</td>
                  <td>{item.usuario_criacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
