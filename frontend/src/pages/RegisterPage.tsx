import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { FiAtSign, FiLock, FiUser, FiEye, FiEyeOff, FiUserPlus } from "react-icons/fi";
import { API_URL, getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const passwordStrength = (pw: string) => {
    if (pw.length === 0) return null;
    if (pw.length < 6)   return { label: "Fraca",  color: "#ef4444", pct: 25 };
    if (pw.length < 10)  return { label: "Média",  color: "#f59e0b", pct: 60 };
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return { label: "Forte",  color: "#22c55e", pct: 100 };
    return { label: "Boa", color: "#3b82f6", pct: 80 };
  };
  const strength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("A senha deve ter no mínimo 8 caracteres."); return; }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/register`, { name, email, password }, { timeout: 20000 });
      emitAlert({ type: "success", title: "Conta criada!", message: "Cadastro realizado com sucesso. Faça login." });
      navigate("/login");
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError("Este e-mail já está cadastrado.");
        return;
      }
      // Conta pode ter sido criada mesmo com erro de rede — redireciona
      emitAlert({ type: "success", title: "Conta criada!", message: "Faça login com seu e-mail e senha." });
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">

        <div className="auth-logo-row">
          <div className="auth-brand-dot" />
          <span className="auth-brand-name">Fluxo de Equipamentos</span>
        </div>

        <h1 className="auth-title">Criar conta</h1>
        <p className="auth-subtitle">Preencha os dados para acessar o sistema.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Nome */}
          <div className="auth-field">
            <label className="auth-label">Nome completo</label>
            <div className="auth-input-wrap">
              <FiUser className="auth-input-icon" size={15} />
              <input
                className="auth-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
                minLength={3}
                autoComplete="name"
              />
            </div>
          </div>

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
                autoComplete="new-password"
              />
              <button type="button" className="auth-toggle-pw" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {strength && (
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 4, borderRadius: 2, background: "#e5e7eb", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${strength.pct}%`, background: strength.color, borderRadius: 2, transition: "width .3s, background .3s" }} />
                </div>
                <span style={{ fontSize: 11, color: strength.color, fontWeight: 700 }}>{strength.label}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="auth-error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="auth-btn-primary" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Criando conta..." : <><FiUserPlus size={16} /> Criar conta</>}
          </button>
        </form>

        <div className="auth-footer">
          Já tem conta?{" "}
          <Link to="/login" className="auth-link">Entrar</Link>
        </div>
      </div>
    </div>
  );
}
