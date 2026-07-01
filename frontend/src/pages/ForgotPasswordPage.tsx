import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FiAtSign, FiArrowLeft, FiSend } from "react-icons/fi";
import { API_URL } from "../api";

export default function ForgotPasswordPage() {
  const [email,    setEmail]    = useState("");
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/password/forgot`, null, { params: { email }, timeout: 15000 });
      setSent(true);
    } catch {
      // Always show success to avoid exposing whether email exists
      setSent(true);
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

        {!sent ? (
          <>
            <h1 className="auth-title">Recuperar senha</h1>
            <p className="auth-subtitle">
              Informe seu e-mail cadastrado e enviaremos um link para criar uma nova senha.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label className="auth-label">E-mail cadastrado</label>
                <div className="auth-input-wrap">
                  <FiAtSign className="auth-input-icon" size={15} />
                  <input
                    className="auth-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="auth-error">
                  <span>⚠</span><span>{error}</span>
                </div>
              )}

              <button type="submit" className="auth-btn-primary" disabled={loading} style={{ marginTop: 4 }}>
                {loading ? "Enviando..." : <><FiSend size={15} /> Enviar link de recuperação</>}
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}>📧</div>
            <h1 className="auth-title" style={{ textAlign: "center" }}>Verifique seu e-mail</h1>
            <p className="auth-subtitle" style={{ textAlign: "center" }}>
              Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link
              para redefinir sua senha em alguns minutos. Verifique também a caixa de spam.
            </p>
            <div className="auth-success" style={{ textAlign: "center", marginBottom: 8 }}>
              ✅ Link enviado com sucesso
            </div>
          </>
        )}

        <div className="auth-footer" style={{ marginTop: 20 }}>
          <Link to="/login" className="auth-link" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FiArrowLeft size={13} /> Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
