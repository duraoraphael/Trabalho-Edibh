import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { PublicClientApplication } from "@azure/msal-browser";
import { FiAtSign, FiLock } from "react-icons/fi";
import { API_URL, getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);

  const azureClientId = process.env.REACT_APP_AZURE_CLIENT_ID;
  const azureTenantId = process.env.REACT_APP_AZURE_TENANT_ID || "common";
  const microsoftEnabled = Boolean(azureClientId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("refresh_token", response.data.refresh_token);
      if (response.data.role) localStorage.setItem("role", response.data.role);
      if (response.data.name) localStorage.setItem("name", response.data.name);
      emitAlert({ type: "success", title: "Login realizado", message: "Autenticação concluída com sucesso." });
      navigate("/");
    } catch (err) {
      const message = getApiErrorMessage(err, "Falha no login. Verifique suas credenciais.");
      setError(message);
      emitAlert({ type: "error", title: "Erro de autenticação", message });
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    if (!azureClientId) {
      emitAlert({ type: "warning", title: "Configuração ausente", message: "Defina REACT_APP_AZURE_CLIENT_ID para habilitar login Microsoft." });
      return;
    }

    setMicrosoftLoading(true);
    setError("");
    try {
      const msal = new PublicClientApplication({
        auth: {
          clientId: azureClientId,
          authority: `https://login.microsoftonline.com/${azureTenantId}`,
          redirectUri: `${window.location.origin}/login`,
        },
        cache: {
          cacheLocation: "sessionStorage",
        },
      });
      await msal.initialize();
      const loginResult = await msal.loginPopup({ scopes: ["openid", "profile", "email"], prompt: "select_account" });
      const idToken = loginResult.idToken;

      const response = await axios.post(`${API_URL}/auth/microsoft/login`, { id_token: idToken });
      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("refresh_token", response.data.refresh_token);
      if (response.data.role) localStorage.setItem("role", response.data.role);
      if (response.data.name) localStorage.setItem("name", response.data.name);
      emitAlert({ type: "success", title: "Login Microsoft", message: "Autenticado com conta Microsoft." });
      navigate("/");
    } catch (err) {
      const message = getApiErrorMessage(err, "Falha no login Microsoft.");
      setError(message);
      emitAlert({ type: "error", title: "Erro de autenticação", message });
    } finally {
      setMicrosoftLoading(false);
    }
  };

  return (
    <div className="app-shell login-shell">
      <div className="login-card">
        <h1>Fluxo de equipamentos</h1>
        <p>Autentique-se para gerenciar ordens de serviço e relatórios técnicos.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <div className="input-with-icon">
            <FiAtSign />
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <label htmlFor="password">Senha</label>
          <div className="input-with-icon">
            <FiLock />
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
          {microsoftEnabled && (
            <button type="button" className="secondary-button" disabled={microsoftLoading} onClick={handleMicrosoftLogin}>
              {microsoftLoading ? "Conectando Microsoft..." : "Entrar com Microsoft"}
            </button>
          )}
        </form>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={() => navigate("/register")}>Criar conta</button>
          <button type="button" className="secondary-button" onClick={() => alert("Recuperação de senha ainda não implementada.")}>Esqueci minha senha</button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
