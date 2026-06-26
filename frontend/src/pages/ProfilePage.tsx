import { useEffect, useState } from "react";
import { FiSave, FiUser } from "react-icons/fi";
import api, { getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({
    name: "",
    email: "",
    telefone: "",
    role: "",
    foto_url: "",
    current_password: "",
    new_password: "",
    last_access: "",
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await api.get("/auth/me");
        if (!active) return;
        setProfile((prev: any) => ({ ...prev, ...response.data }));
      } catch (err) {
        emitAlert({ type: "error", title: "Erro", message: getApiErrorMessage(err, "Falha ao carregar perfil.") });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: any = {
        name: profile.name,
        telefone: profile.telefone,
        foto_url: profile.foto_url,
      };
      if (profile.new_password) {
        payload.current_password = profile.current_password;
        payload.new_password = profile.new_password;
      }
      const response = await api.put("/auth/me", payload);
      setProfile((prev: any) => ({ ...prev, ...response.data, current_password: "", new_password: "" }));
      localStorage.setItem("name", response.data?.name || profile.name);
      localStorage.setItem("role", response.data?.role || profile.role);
      emitAlert({ type: "success", title: "Perfil atualizado", message: "Dados atualizados com sucesso." });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível atualizar perfil.") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="app-shell"><div className="loading-state">Carregando...</div></div>;

  return (
    <div className="app-shell">
      <div className="form-card">
        <div className="form-card-head">
          <h1>Meu Perfil</h1>
          <p className="subtitle">Atualize seus dados pessoais e senha.</p>
        </div>
        <form onSubmit={submit}>
          <div className="form-field">
            <label>Foto (URL)</label>
            <input value={profile.foto_url || ""} onChange={(e) => setProfile({ ...profile, foto_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="form-field">
            <label>Nome</label>
            <div className="input-with-icon">
              <FiUser />
              <input value={profile.name || ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
            </div>
          </div>
          <div className="form-field">
            <label>Email</label>
            <input value={profile.email || ""} disabled />
          </div>
          <div className="form-field">
            <label>Telefone</label>
            <input value={profile.telefone || ""} onChange={(e) => setProfile({ ...profile, telefone: e.target.value })} placeholder="(00) 00000-0000" />
          </div>
          <div className="form-field">
            <label>Cargo</label>
            <input value={profile.role || ""} disabled />
          </div>
          <div className="form-field">
            <label>Último acesso</label>
            <input value={profile.last_access || ""} disabled />
          </div>
          <div className="form-field">
            <label>Senha atual</label>
            <input type="password" value={profile.current_password || ""} onChange={(e) => setProfile({ ...profile, current_password: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Nova senha</label>
            <input type="password" value={profile.new_password || ""} onChange={(e) => setProfile({ ...profile, new_password: e.target.value })} />
          </div>
          <div className="button-row">
            <button type="submit" className="primary-button" disabled={saving}><FiSave /> {saving ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
