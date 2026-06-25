import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../api";

const initialState = {
  url_sharepoint: "",
  tenant_id: "",
  client_id: "",
  client_secret: "",
  list_name: "",
  library_name: "",
  graph_api_url: "",
};

function SharePointConfigPage() {
  const [formState, setFormState] = useState(initialState);
  const [clientSecretSet, setClientSecretSet] = useState(false);
  const [status, setStatus] = useState<"online" | "offline">("offline");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const loadConfig = async () => {
    try {
      const response = await api.get("/settings/sharepoint");
      const data = response.data;
      setFormState({
        url_sharepoint: data.url_sharepoint || "",
        tenant_id: data.tenant_id || "",
        client_id: data.client_id || "",
        client_secret: "",
        list_name: data.list_name || "",
        library_name: data.library_name || "",
        graph_api_url: data.graph_api_url || "",
      });
      setClientSecretSet(Boolean(data.client_secret_set));
      setStatus(data.status === "online" ? "online" : "offline");
      setLastSync(data.last_sync || null);
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Erro ao carregar configuração."));
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await api.get("/settings/sharepoint/logs");
      setLogs(response.data.logs || []);
    } catch {
      // logs are best-effort
    }
  };

  useEffect(() => {
    loadConfig();
    loadLogs();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await api.put("/settings/sharepoint", formState);
      setClientSecretSet(Boolean(response.data.client_secret_set));
      setFormState({ ...formState, client_secret: "" });
      setSuccess(true);
      setMessage("Configuração salva com sucesso.");
      loadLogs();
    } catch (err) {
      setSuccess(false);
      setMessage(getApiErrorMessage(err, "Falha ao salvar configuração."));
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage("");
    try {
      const response = await api.post("/settings/sharepoint/test");
      setStatus(response.data.status === "online" ? "online" : "offline");
      if (response.data.last_sync) setLastSync(response.data.last_sync);
      setSuccess(response.data.status === "online");
      setMessage(response.data.message);
      loadLogs();
    } catch (err) {
      setSuccess(false);
      setMessage(getApiErrorMessage(err, "Falha ao testar conexão."));
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="app-shell"><div className="loading-state">Carregando...</div></div>;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Configuração SharePoint</h1>
          <p>Acesso restrito a administradores.</p>
        </div>
        <div className={`status-badge ${status}`}>{status === "online" ? "Online" : "Offline"}</div>
      </header>

      <div className="form-card">
        <form onSubmit={handleSave}>
          <div className="form-field">
            <label>URL SharePoint</label>
            <input name="url_sharepoint" value={formState.url_sharepoint} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label>Tenant ID</label>
            <input name="tenant_id" value={formState.tenant_id} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label>Client ID</label>
            <input name="client_id" value={formState.client_id} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label>Client Secret {clientSecretSet && <span className="field-hint">(configurado — deixe em branco para manter)</span>}</label>
            <input type="password" name="client_secret" value={formState.client_secret} onChange={handleChange} placeholder={clientSecretSet ? "••••••••" : ""} />
          </div>
          <div className="form-field">
            <label>Nome da Lista</label>
            <input name="list_name" value={formState.list_name} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label>Nome da Biblioteca</label>
            <input name="library_name" value={formState.library_name} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label>URL Graph API</label>
            <input name="graph_api_url" value={formState.graph_api_url} onChange={handleChange} required />
          </div>

          <div className="button-row">
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Salvando..." : "Salvar Configuração"}
            </button>
            <button type="button" className="secondary-button" onClick={handleTestConnection} disabled={testing}>
              {testing ? "Testando..." : "Testar Conexão"}
            </button>
          </div>
        </form>
        {message && <div className={success ? "form-message" : "form-error"}>{message}</div>}
        {lastSync && <p className="field-hint">Última sincronização: {new Date(lastSync).toLocaleString()}</p>}
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Ação</th>
              <th>Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={idx}>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>{log.action}</td>
                <td>{log.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SharePointConfigPage;
