import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiAtSign, FiLock, FiUser } from "react-icons/fi";
import { API_URL, getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

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
      emitAlert({ type: "success", title: "Conta criada", message: "Cadastro realizado com sucesso." });
      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      const friendly = getApiErrorMessage(err, "Falha ao criar conta. Verifique os dados e tente novamente.");
      setMessage(friendly);
      emitAlert({ type: "error", title: "Erro ao criar conta", message: friendly });
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
          <div className="input-with-icon">
            <FiUser />
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <label htmlFor="email">Email</label>
          <div className="input-with-icon">
            <FiAtSign />
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <label htmlFor="password">Senha</label>
          <div className="input-with-icon">
            <FiLock />
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          {message && <div className="form-error">{message}</div>}
          <button type="submit" className="primary-button" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</button>
        </form>
        <button type="button" className="secondary-button" onClick={() => navigate("/login")}>Já tenho conta</button>
      </div>
    </div>
  );
}

export default RegisterPage;
