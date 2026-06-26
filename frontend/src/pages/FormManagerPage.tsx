import { useEffect, useMemo, useState } from "react";
import { FiArrowDown, FiArrowUp, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";
import api, { getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

const TYPES = ["texto", "numero", "data", "hora", "textarea", "select", "checkbox", "radio", "upload", "email", "telefone", "url"];

function FormManagerPage() {
  const [fields, setFields] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => [...fields].sort((a, b) => (a.order || 0) - (b.order || 0)), [fields]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await api.get("/admin/form-fields");
        if (active) setFields(response.data?.fields || []);
      } catch (err) {
        emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível carregar configuração.") });
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const update = (idx: number, patch: any) => setFields((current) => current.map((item, index) => (index === idx ? { ...item, ...patch } : item)));

  const addField = () => {
    setFields((current) => [
      ...current,
      {
        id: `campo_${Date.now()}`,
        label: "Novo Campo",
        type: "texto",
        placeholder: "",
        required: false,
        readonly: false,
        order: current.length,
        options: [],
        validations: {},
        visible_roles: ["Administrador", "Gerente", "Supervisor", "Operador", "Visualizador"],
        editable_roles: ["Administrador", "Gerente", "Supervisor", "Operador"],
      },
    ]);
  };

  const removeField = (idx: number) => setFields((current) => current.filter((_, index) => index !== idx));

  const move = (idx: number, direction: -1 | 1) => {
    setFields((current) => {
      const next = [...current];
      const to = idx + direction;
      if (to < 0 || to >= next.length) return current;
      [next[idx], next[to]] = [next[to], next[idx]];
      return next.map((item, index) => ({ ...item, order: index }));
    });
  };

  const save = async () => {
    try {
      setSaving(true);
      const normalized = fields.map((item, index) => ({ ...item, order: index }));
      await api.put("/admin/form-fields", { fields: normalized });
      emitAlert({ type: "success", title: "Configuração salva", message: "Gerenciador de formulários atualizado." });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível salvar configuração.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header"><div><h1>Gerenciador de Formulários</h1><p className="subtitle">Adicione, edite, exclua e reordene campos sem alterar código.</p></div></header>
      <div className="button-row" style={{ marginBottom: 12 }}>
        <button className="secondary-button" type="button" onClick={addField}><FiPlus /> Adicionar campo</button>
        <button className="primary-button" type="button" onClick={save} disabled={saving}><FiSave /> {saving ? "Salvando..." : "Salvar configuração"}</button>
      </div>

      <div className="table-card">
        <table className="modern-table">
          <thead>
            <tr><th>Ordem</th><th>ID</th><th>Label</th><th>Tipo</th><th>Obrigatório</th><th>Somente leitura</th><th>Placeholder</th><th>Roles visualização</th><th>Roles edição</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {sorted.map((field, idx) => (
              <tr key={field.id}>
                <td>{idx + 1}</td>
                <td><input value={field.id} onChange={(e) => update(idx, { id: e.target.value })} /></td>
                <td><input value={field.label} onChange={(e) => update(idx, { label: e.target.value })} /></td>
                <td>
                  <select value={field.type} onChange={(e) => update(idx, { type: e.target.value })}>
                    {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </td>
                <td><input type="checkbox" checked={!!field.required} onChange={(e) => update(idx, { required: e.target.checked })} /></td>
                <td><input type="checkbox" checked={!!field.readonly} onChange={(e) => update(idx, { readonly: e.target.checked })} /></td>
                <td><input value={field.placeholder || ""} onChange={(e) => update(idx, { placeholder: e.target.value })} /></td>
                <td><input value={(field.visible_roles || []).join(",")} onChange={(e) => update(idx, { visible_roles: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })} /></td>
                <td><input value={(field.editable_roles || []).join(",")} onChange={(e) => update(idx, { editable_roles: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })} /></td>
                <td>
                  <div className="row-actions">
                    <button className="secondary-button" type="button" onClick={() => move(idx, -1)}><FiArrowUp /></button>
                    <button className="secondary-button" type="button" onClick={() => move(idx, 1)}><FiArrowDown /></button>
                    <button className="danger-button" type="button" onClick={() => removeField(idx)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!sorted.length && <tr><td colSpan={10} className="empty-table">Nenhum campo configurado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FormManagerPage;
