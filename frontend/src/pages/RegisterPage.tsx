import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL, getApiErrorMessage } from "../api";

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password,
      });
      setMessage("Conta criada com sucesso. Faça login.");
      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Falha ao criar conta. Verifique os dados e tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell login-shell">
      <div className="login-card">
        <h1>Cadastro</h1>
        <p>Crie sua conta para acessar o sistema Fluxo de equipamentos.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Nome</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          {message && <div className="form-error">{message}</div>}
          <button type="submit" className="primary-button" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</button>
        </form>
        <button type="button" className="secondary-button" onClick={() => navigate("/login")}>Já tenho conta</button>
      </div>
    </div>
  );
}

export default RegisterPage;
