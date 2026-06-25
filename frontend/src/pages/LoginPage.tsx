import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL, getApiErrorMessage } from "../api";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      navigate("/");
    } catch (err) {
      setError(getApiErrorMessage(err, "Falha no login. Verifique suas credenciais."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell login-shell">
      <div className="login-card">
        <h1>Prompt Master</h1>
        <p>Autentique-se para gerenciar ordens de serviço e relatórios técnicos.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="password">Senha</label>
          <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
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
