import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiLock, FiEye, FiEyeOff, FiArrowLeft, FiCheck } from "react-icons/fi";
import { emitAlert } from "../alerts";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [showCf,    setShowCf]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);
  const [hasToken,  setHasToken]  = useState(false);

  useEffect(() => {
    // Supabase redirects with #access_token=... in the hash
    const hash = window.location.hash;
    if (hash.includes("access_token") && hash.includes("type=recovery")) {
      setHasToken(true);
    } else {
      setError("Link inválido ou expirado. Solicite uma nova recuperação de senha.");
    }
  }, []);

  const validatePassword = () => {
    if (password.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
    if (password !== confirm) return "As senhas não coincidem.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validatePassword();
    if (validationError) { setError(validationError); return; }
    setError("");
    setLoading(true);
    try {
      // Extract token from URL hash
      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get("access_token") || "";

      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.REACT_APP_SUPABASE_URL || "",
        process.env.REACT_APP_SUPABASE_ANON_KEY || ""
      );
      // Set the session from the recovery token
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: params.get("refresh_token") || "" });
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      emitAlert({ type: "success", title: "Senha atualizada", message: "Sua senha foi redefinida com sucesso." });
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: any) {
      setError(err?.message || "Não foi possível redefinir a senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (pw: string) => {
    if (!pw) return null;
    if (pw.length < 6)  return { label: "Fraca", color: "#ef4444", pct: 25 };
    if (pw.length < 10) return { label: "Média", color: "#f59e0b", pct: 60 };
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return { label: "Forte", color: "#22c55e", pct: 100 };
    return { label: "Boa", color: "#3b82f6", pct: 80 };
  };
  const strength = passwordStrength(password);

  return (
    <div className="auth-shell">
      <div className="auth-card">

        <div className="auth-logo-row">
          <div className="auth-brand-dot" />
          <span className="auth-brand-name">Fluxo de Equipamentos</span>
        </div>

        {success ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <FiCheck size={28} color="#16a34a" />
              </div>
              <h1 className="auth-title">Senha redefinida!</h1>
              <p className="auth-subtitle">Redirecionando para o login...</p>
            </div>
          </>
        ) : (
          <>
            <h1 className="auth-title">Nova senha</h1>
            <p className="auth-subtitle">Crie uma senha forte para sua conta.</p>

            {!hasToken && error ? (
              <div className="auth-error" style={{ marginBottom: 16 }}>
                <span>⚠</span><span>{error}</span>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label className="auth-label">Nova senha</label>
                  <div className="auth-input-wrap">
                    <FiLock className="auth-input-icon" size={15} />
                    <input
                      className="auth-input has-toggle"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      autoFocus
                    />
                    <button type="button" className="auth-toggle-pw" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                      {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                  {strength && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ height: 4, borderRadius: 2, background: "#e5e7eb", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${strength.pct}%`, background: strength.color, borderRadius: 2, transition: "width .3s" }} />
                      </div>
                      <span style={{ fontSize: 11, color: strength.color, fontWeight: 700 }}>{strength.label}</span>
                    </div>
                  )}
                </div>

                <div className="auth-field">
                  <label className="auth-label">Confirmar senha</label>
                  <div className="auth-input-wrap">
                    <FiLock className="auth-input-icon" size={15} />
                    <input
                      className="auth-input has-toggle"
                      type={showCf ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repita a senha"
                      required
                    />
                    <button type="button" className="auth-toggle-pw" onClick={() => setShowCf(!showCf)} tabIndex={-1}>
                      {showCf ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                  {confirm && password !== confirm && (
                    <span className="auth-field-error">As senhas não coincidem</span>
                  )}
                  {confirm && password === confirm && confirm.length >= 8 && (
                    <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>✓ Senhas iguais</span>
                  )}
                </div>

                {error && (
                  <div className="auth-error"><span>⚠</span><span>{error}</span></div>
                )}

                <button type="submit" className="auth-btn-primary" disabled={loading} style={{ marginTop: 4 }}>
                  {loading ? "Salvando..." : <><FiCheck size={16} /> Salvar nova senha</>}
                </button>
              </form>
            )}
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
