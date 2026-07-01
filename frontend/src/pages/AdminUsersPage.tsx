import { useEffect, useMemo, useState } from "react";
import {
  FiEdit3, FiPower, FiRefreshCw, FiSearch,
  FiTrash2, FiUserPlus, FiX,
} from "react-icons/fi";
import api, { getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

const ROLES = ["Administrador", "Gerente", "Supervisor", "Operador", "Visualizador"];
const BLANK = { name: "", email: "", password: "", role: "Operador", is_active: true };

function Avatar({ user }: { user: any }) {
  if (user.foto_url) {
    return <img src={user.foto_url} alt={user.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />;
  }
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%", background: "#6366f1",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
    }}>
      {(user.name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function fmtDate(val: any) {
  if (!val) return "-";
  try { return new Date(val).toLocaleString("pt-BR"); } catch { return String(val); }
}

function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(BLANK);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/users");
      setUsers(res.data || []);
    } catch (err) {
      emitAlert({ type: "error", title: "Erro", message: getApiErrorMessage(err, "Falha ao carregar usuários.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q));
  }, [users, query]);

  const openAdd = () => { setEditing(null); setForm(BLANK); setShowModal(true); };
  const openEdit = (u: any) => { setEditing(u); setForm({ ...u, password: "" }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(BLANK); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/auth/users/${editing.id}`, form);
      } else {
        await api.post("/auth/users", form);
      }
      closeModal();
      await load();
      emitAlert({ type: "success", title: "Sucesso", message: editing ? "Usuário atualizado." : "Usuário criado com sucesso." });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível salvar.") });
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (u: any) => {
    if (!window.confirm(`Excluir ${u.name}?`)) return;
    try {
      await api.delete(`/auth/users/${u.id}`);
      await load();
      emitAlert({ type: "success", title: "Excluído", message: "Usuário removido." });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível excluir.") });
    }
  };

  const toggleActive = async (u: any) => {
    try {
      await api.put(`/auth/users/${u.id}`, { is_active: !u.is_active });
      await load();
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível alterar status.") });
    }
  };

  const changeRole = async (u: any, role: string) => {
    if (role === u.role) return;
    try {
      await api.put(`/auth/users/${u.id}`, { role });
      await load();
      emitAlert({ type: "success", title: "Cargo alterado", message: `${u.name} agora é ${role}.` });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível alterar o cargo.") });
    }
  };

  const resetPassword = async (u: any) => {
    const pw = window.prompt(`Nova senha para ${u.email}:`);
    if (!pw) return;
    try {
      await api.post(`/auth/users/${u.id}/reset-password`, null, { params: { new_password: pw } });
      emitAlert({ type: "success", title: "Senha redefinida", message: "Senha atualizada com sucesso." });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível resetar senha.") });
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Administração — Usuários</h1>
          <p className="subtitle">Gerencie usuários, cargos, acessos e senhas.</p>
        </div>
        <button className="primary-button" type="button" onClick={openAdd} style={{ alignSelf: "center" }}>
          <FiUserPlus /> Adicionar Usuário
        </button>
      </header>

      <div className="table-card">
        <div className="table-toolbar">
          <div className="input-with-icon compact">
            <FiSearch />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar por nome ou e-mail" />
          </div>
          <span className="table-count">{visible.length} usuário{visible.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="loading-state">Carregando...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Cargo</th>
                  <th>Status</th>
                  <th>Cadastro</th>
                  <th>Último Acesso</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => (
                  <tr key={u.id}>
                    <td><Avatar user={u} /></td>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "2px 6px", background: "transparent", cursor: "pointer" }}
                      >
                        {ROLES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className={u.is_active ? "status-badge online" : "status-badge offline"}>
                        {u.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td>{fmtDate(u.last_access)}</td>
                    <td>
                      <div className="row-actions" style={{ flexWrap: "wrap", gap: 4 }}>
                        <button className="secondary-button" type="button" onClick={() => openEdit(u)}>
                          <FiEdit3 /> Editar
                        </button>
                        <button className="secondary-button" type="button" onClick={() => toggleActive(u)}>
                          <FiPower /> {u.is_active ? "Desativar" : "Ativar"}
                        </button>
                        <button className="secondary-button" type="button" onClick={() => resetPassword(u)}>
                          <FiRefreshCw /> Resetar senha
                        </button>
                        <button className="danger-button" type="button" onClick={() => removeUser(u)}>
                          <FiTrash2 /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!visible.length && (
                  <tr><td colSpan={8} className="empty-table">Nenhum usuário encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: 480, width: "100%" }}>
            <div className="modal-title-row">
              <h3>{editing ? "Editar Usuário" : "Adicionar Usuário"}</h3>
              <button type="button" className="icon-button" onClick={closeModal}><FiX /></button>
            </div>
            <form onSubmit={submit}>
              <div className="form-field">
                <label>Nome *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={3} />
              </div>
              <div className="form-field">
                <label>Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!editing} />
              </div>
              <div className="form-field">
                <label>{editing ? "Nova Senha (deixe em branco para manter)" : "Senha *"}</label>
                <input
                  type="password"
                  value={form.password || ""}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editing}
                  minLength={8}
                  placeholder={editing ? "Deixe em branco para não alterar" : "Mínimo 8 caracteres"}
                />
              </div>
              <div className="form-field">
                <label>Cargo</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Status</label>
                <select value={form.is_active ? "ativo" : "inativo"} onChange={(e) => setForm({ ...form, is_active: e.target.value === "ativo" })}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Salvando..." : editing ? "Salvar Alterações" : "Criar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsersPage;
