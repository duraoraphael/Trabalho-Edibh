import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { PublicClientApplication } from "@azure/msal-browser";
import { FiAtSign, FiLock, FiEye, FiEyeOff, FiLogIn } from "react-icons/fi";
import { API_URL, getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [msLoading, setMsLoading] = useState(false);

  const azureClientId = process.env.REACT_APP_AZURE_CLIENT_ID;
  const azureTenantId = process.env.REACT_APP_AZURE_TENANT_ID || "common";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password }, { timeout: 15000 });
      localStorage.setItem("access_token",  res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      if (res.data.role)  localStorage.setItem("role",  res.data.role);
      if (res.data.name)  localStorage.setItem("name",  res.data.name);
      if (res.data.email) localStorage.setItem("email", res.data.email);
      emitAlert({ type: "success", title: "Bem-vindo!", message: `Olá, ${res.data.name || email}` });
      navigate("/");
    } catch (err) {
      setError(getApiErrorMessage(err, "Credenciais inválidas. Verifique seu e-mail e senha."));
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoft = async () => {
    if (!azureClientId) {
      emitAlert({ type: "warning", title: "Não configurado", message: "Login Microsoft não está habilitado." });
      return;
    }
    setMsLoading(true);
    try {
      const msal = new PublicClientApplication({
        auth: { clientId: azureClientId, authority: `https://login.microsoftonline.com/${azureTenantId}`, redirectUri: `${window.location.origin}/login` },
        cache: { cacheLocation: "sessionStorage" },
      });
      await msal.initialize();
      const result = await msal.loginPopup({ scopes: ["openid", "profile", "email"], prompt: "select_account" });
      const res = await axios.post(`${API_URL}/auth/microsoft/login`, { id_token: result.idToken }, { timeout: 20000 });
      localStorage.setItem("access_token",  res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      if (res.data.role)  localStorage.setItem("role",  res.data.role);
      if (res.data.name)  localStorage.setItem("name",  res.data.name);
      if (res.data.email) localStorage.setItem("email", res.data.email);
      navigate("/");
    } catch (err) {
      setError(getApiErrorMessage(err, "Falha no login com Microsoft."));
    } finally {
      setMsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">

        {/* Brand */}
        <div className="auth-logo-row">
          <div className="auth-brand-dot" />
          <span className="auth-brand-name">Fluxo de Equipamentos</span>
        </div>

        <h1 className="auth-title">Entrar na conta</h1>
        <p className="auth-subtitle">Acesse o sistema de gestão de ordens de serviço.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Email */}
          <div className="auth-field">
            <label className="auth-label">E-mail</label>
            <div className="auth-input-wrap">
              <FiAtSign className="auth-input-icon" size={15} />
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Senha */}
          <div className="auth-field">
            <label className="auth-label">Senha</label>
            <div className="auth-input-wrap">
              <FiLock className="auth-input-icon" size={15} />
              <input
                className="auth-input has-toggle"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                autoComplete="current-password"
              />
              <button type="button" className="auth-toggle-pw" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          {/* Lembrar + Esqueci */}
          <div className="auth-row">
            <label className="auth-remember">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Lembrar-me
            </label>
            <Link to="/forgot-password" className="auth-link">Esqueci minha senha</Link>
          </div>

          {error && (
            <div className="auth-error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? "Entrando..." : <><FiLogIn size={16} /> Entrar</>}
          </button>

          {azureClientId && (
            <>
              <div className="auth-divider">ou</div>
              <button type="button" className="auth-btn-secondary" onClick={handleMicrosoft} disabled={msLoading}>
                <img src="https://learn.microsoft.com/en-us/azure/active-directory/develop/media/howto-add-branding-in-apps/ms-symbollockup_mssymbol_19.svg" alt="" width={18} />
                {msLoading ? "Conectando..." : "Continuar com Microsoft"}
              </button>
            </>
          )}
        </form>

        <div className="auth-footer">
          Não tem conta?{" "}
          <Link to="/register" className="auth-link">Criar conta grátis</Link>
        </div>
      </div>
    </div>
  );
}
