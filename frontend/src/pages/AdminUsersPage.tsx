import { useEffect, useMemo, useState } from "react";
import { FiEdit3, FiPower, FiRefreshCw, FiSearch, FiTrash2, FiUserPlus } from "react-icons/fi";
import api, { getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

const initialForm = { name: "", email: "", password: "", role: "Operador", is_active: true };

function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(initialForm);

  const load = async () => {
    try {
      setLoading(true);
      const response = await api.get("/auth/users");
      setUsers(response.data || []);
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
    return users.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(q));
  }, [users, query]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editing) {
        await api.put(`/auth/users/${editing.id}`, form);
      } else {
        await api.post("/auth/users", form);
      }
      setForm(initialForm);
      setEditing(null);
      await load();
      emitAlert({ type: "success", title: "Sucesso", message: "Operação concluída." });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível salvar usuário.") });
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (id: number) => {
    if (!window.confirm("Excluir usuário?")) return;
    try {
      await api.delete(`/auth/users/${id}`);
      await load();
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível excluir usuário.") });
    }
  };

  const toggleActive = async (user: any) => {
    try {
      await api.put(`/auth/users/${user.id}`, { is_active: !user.is_active });
      await load();
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível atualizar status.") });
    }
  };

  const resetPassword = async (user: any) => {
    const password = window.prompt(`Nova senha para ${user.email}:`);
    if (!password) return;
    try {
      await api.post(`/auth/users/${user.id}/reset-password`, null, { params: { new_password: password } });
      emitAlert({ type: "success", title: "Senha redefinida", message: "Senha atualizada com sucesso." });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível resetar senha.") });
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header"><div><h1>Administração - Usuários</h1><p className="subtitle">Criação, edição, ativação e gestão de usuários.</p></div></header>

      <div className="card" style={{ marginBottom: 12 }}>
        <form onSubmit={submit}>
          <div className="form-field"><label>Nome</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="form-field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!editing} /></div>
          <div className="form-field"><label>Senha</label><input type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} /></div>
          <div className="form-field"><label>Cargo</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Administrador</option>
              <option>Gerente</option>
              <option>Supervisor</option>
              <option>Operador</option>
              <option>Visualizador</option>
            </select>
          </div>
          <div className="button-row">
            <button className="primary-button" type="submit" disabled={saving}><FiUserPlus /> {saving ? "Salvando..." : editing ? "Atualizar" : "Criar"}</button>
            {editing && <button className="secondary-button" type="button" onClick={() => { setEditing(null); setForm(initialForm); }}><FiRefreshCw /> Cancelar edição</button>}
          </div>
        </form>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div className="input-with-icon compact"><FiSearch /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar usuário" /></div>
          <span className="table-count">{visible.length} usuários</span>
        </div>
        {loading ? <div className="loading-state">Carregando...</div> : (
          <table className="modern-table">
            <thead><tr><th>Nome</th><th>Email</th><th>Cargo</th><th>Status</th><th>Último acesso</th><th>Ações</th></tr></thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.email}</td>
                  <td>{item.role}</td>
                  <td><span className={item.is_active ? "status-badge online" : "status-badge offline"}>{item.is_active ? "Ativo" : "Inativo"}</span></td>
                  <td>{item.last_access || "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="secondary-button" type="button" onClick={() => { setEditing(item); setForm({ ...item, password: "" }); }}><FiEdit3 /> Editar</button>
                      <button className="secondary-button" type="button" onClick={() => toggleActive(item)}><FiPower /> {item.is_active ? "Desativar" : "Ativar"}</button>
                      <button className="secondary-button" type="button" onClick={() => resetPassword(item)}><FiRefreshCw /> Resetar senha</button>
                      <button className="danger-button" type="button" onClick={() => removeUser(item.id)}><FiTrash2 /> Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminUsersPage;
