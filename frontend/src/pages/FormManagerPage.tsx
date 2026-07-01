import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowDown, FiArrowUp, FiPlus, FiSave, FiTrash2, FiChevronDown, FiChevronUp,
} from "react-icons/fi";
import api, { getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

const TYPES = [
  "texto", "numero", "data", "hora", "textarea",
  "select", "checkbox", "radio", "upload", "email", "telefone", "url",
];

const TYPE_LABELS: Record<string, string> = {
  texto:    "Texto curto (uma linha)",
  numero:   "Número",
  data:     "Data",
  hora:     "Hora",
  textarea: "Texto longo (várias linhas)",
  select:   "Lista de opções (escolher uma)",
  checkbox: "Caixa de marcação (sim / não)",
  radio:    "Escolha única (botões)",
  upload:   "Envio de arquivo (imagem / PDF)",
  email:    "E-mail",
  telefone: "Telefone / Celular",
  url:      "Link (endereço web)",
};
const ALL_ROLES = ["Administrador", "Gerente", "Supervisor", "Operador", "Visualizador"];

// Stable key counter — never changes between renders
let _keyCounter = 0;
function nextKey() { return String(++_keyCounter); }

function FormManagerPage() {
  const [fields, setFields] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  // expanded tracks stable _key (not field.id which can change on edit)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // maps each field object to a stable string key so card doesn't collapse when field.id is edited
  const keyMap = useRef<WeakMap<object, string>>(new WeakMap());

  function getKey(field: any): string {
    if (!keyMap.current.has(field)) keyMap.current.set(field, nextKey());
    return keyMap.current.get(field)!;
  }

  const sorted = useMemo(() => [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [fields]);

  useEffect(() => {
    api.get("/admin/form-fields")
      .then((res) => setFields(res.data?.fields || []))
      .catch((err) => emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível carregar campos.") }));
  }, []);

  const update = (idx: number, patch: any) =>
    setFields((cur) => cur.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, ...patch };
      // preserve stable key for the updated object
      const k = keyMap.current.get(item);
      if (k) keyMap.current.set(updated, k);
      return updated;
    }));

  const toggle = (key: string) =>
    setExpanded((cur) => { const s = new Set(cur); s.has(key) ? s.delete(key) : s.add(key); return s; });

  const addField = () => {
    const newField = {
      id: `campo_${Date.now()}`, label: "Novo Campo", type: "texto", placeholder: "", required: false,
      readonly: false, order: fields.length, options: [], validations: {},
      visible_roles: [...ALL_ROLES], editable_roles: ALL_ROLES.filter((r) => r !== "Visualizador"),
    };
    const k = nextKey();
    keyMap.current.set(newField, k);
    setFields((cur) => [...cur, newField]);
    setExpanded((cur) => new Set([...cur, k]));
  };

  const removeField = (idx: number) => {
    if (!window.confirm("Remover este campo?")) return;
    setFields((cur) => cur.filter((_, i) => i !== idx).map((f, i) => ({ ...f, order: i })));
  };

  const move = (idx: number, dir: -1 | 1) => {
    setFields((cur) => {
      const next = [...cur];
      const to = idx + dir;
      if (to < 0 || to >= next.length) return cur;
      [next[idx], next[to]] = [next[to], next[idx]];
      return next.map((f, i) => ({ ...f, order: i }));
    });
  };

  const addOption = (idx: number) =>
    update(idx, { options: [...(fields[idx].options || []), { label: "Nova opção", value: `opc_${Date.now()}` }] });

  const updateOption = (idx: number, oi: number, patch: any) =>
    update(idx, { options: (fields[idx].options || []).map((o: any, i: number) => (i === oi ? { ...o, ...patch } : o)) });

  const removeOption = (idx: number, oi: number) =>
    update(idx, { options: (fields[idx].options || []).filter((_: any, i: number) => i !== oi) });

  const moveOption = (idx: number, oi: number, dir: -1 | 1) => {
    const opts = [...(fields[idx].options || [])];
    const to = oi + dir;
    if (to < 0 || to >= opts.length) return;
    [opts[oi], opts[to]] = [opts[to], opts[oi]];
    update(idx, { options: opts });
  };

  const toggleRole = (idx: number, key: "visible_roles" | "editable_roles", role: string) => {
    const cur: string[] = fields[idx][key] || [];
    const next = cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role];
    update(idx, { [key]: next });
  };

  const save = async () => {
    setSaving(true);
    try {
      const normalized = fields.map((f, i) => ({ ...f, order: i }));
      await api.put("/admin/form-fields", { fields: normalized });
      emitAlert({ type: "success", title: "Configuração salva", message: "Formulário Novo Fluxo de Equipamentos Críticos atualizado." });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível salvar.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Gerenciador de Formulários</h1>
          <p className="subtitle">Edite os campos do formulário Novo Fluxo de Equipamentos Críticos. As alterações refletem imediatamente.</p>
        </div>
        <div className="button-row" style={{ alignSelf: "center" }}>
          <button className="secondary-button" type="button" onClick={addField}><FiPlus /> Novo Campo</button>
          <button className="primary-button" type="button" onClick={save} disabled={saving}>
            <FiSave /> {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </header>

      {sorted.length === 0 && (
        <div className="table-card"><p className="empty-table" style={{ padding: 32 }}>Nenhum campo configurado. Clique em "Novo Campo" para começar.</p></div>
      )}

      {sorted.map((field, idx) => {
        const stableKey = getKey(field);
        const isOpen = expanded.has(stableKey);
        const hasSelect = field.type === "select" || field.type === "radio";
        return (
          <div key={stableKey} className="table-card" style={{ marginBottom: 8 }}>
            {/* Header row */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", userSelect: "none" }}
              onClick={() => toggle(stableKey)}
            >
              <span style={{ color: "#94a3b8", fontWeight: 600, minWidth: 28 }}>#{idx + 1}</span>
              <strong style={{ flex: 1 }}>{field.label || "(sem label)"}</strong>
              <span className="status-badge" style={{ background: "#f1f5f9", color: "#475569" }}>{TYPE_LABELS[field.type] ?? field.type}</span>
              {field.required && <span className="status-badge offline" style={{ fontSize: 11 }}>obrigatório</span>}
              <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                <button className="secondary-button" type="button" onClick={() => move(idx, -1)} disabled={idx === 0}><FiArrowUp /></button>
                <button className="secondary-button" type="button" onClick={() => move(idx, 1)} disabled={idx === sorted.length - 1}><FiArrowDown /></button>
                <button className="danger-button" type="button" onClick={() => removeField(idx)}><FiTrash2 /></button>
              </div>
              {isOpen ? <FiChevronUp /> : <FiChevronDown />}
            </div>

            {isOpen && (
              <div style={{ borderTop: "1px solid #e2e8f0", padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} onClick={(e) => e.stopPropagation()}>
                {/* ID */}
                <div className="form-field">
                  <label>Identificador interno <span style={{ color: "#94a3b8", fontSize: 12 }}>(não altere sem necessidade)</span></label>
                  <input value={field.id} onChange={(e) => update(idx, { id: e.target.value })} />
                </div>
                {/* Label */}
                <div className="form-field">
                  <label>Nome do campo <span style={{ color: "#94a3b8", fontSize: 12 }}>(aparece no formulário)</span></label>
                  <input value={field.label} onChange={(e) => update(idx, { label: e.target.value })} />
                </div>
                {/* Type */}
                <div className="form-field">
                  <label>Tipo de campo</label>
                  <select value={field.type} onChange={(e) => update(idx, { type: e.target.value })}>
                    {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
                  </select>
                </div>
                {/* Placeholder */}
                <div className="form-field">
                  <label>Texto de dica <span style={{ color: "#94a3b8", fontSize: 12 }}>(aparece cinza dentro do campo vazio)</span></label>
                  <input value={field.placeholder || ""} onChange={(e) => update(idx, { placeholder: e.target.value })} />
                </div>
                {/* Obrigatório + Somente leitura */}
                <div className="form-field" style={{ gridColumn: "1 / -1", display: "flex", gap: 24 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!field.required} onChange={(e) => update(idx, { required: e.target.checked })} />
                    Preenchimento obrigatório
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!field.readonly} onChange={(e) => update(idx, { readonly: e.target.checked })} />
                    Somente leitura <span style={{ color: "#94a3b8", fontSize: 12 }}>(ninguém pode editar)</span>
                  </label>
                </div>
                {/* Visible roles */}
                <div className="form-field">
                  <label>Quem pode ver este campo</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {ALL_ROLES.map((r) => (
                      <label key={r} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={(field.visible_roles || []).includes(r)}
                          onChange={() => toggleRole(idx, "visible_roles", r)}
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>
                {/* Editable roles */}
                <div className="form-field">
                  <label>Quem pode preencher / editar</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {ALL_ROLES.map((r) => (
                      <label key={r} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={(field.editable_roles || []).includes(r)}
                          onChange={() => toggleRole(idx, "editable_roles", r)}
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>
                {/* Select/Radio options */}
                {hasSelect && (
                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Opções disponíveis para escolha <span style={{ color: "#94a3b8", fontSize: 12 }}>(Nome exibido → Valor salvo)</span></label>
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      {(field.options || []).map((opt: any, oi: number) => (
                        <div key={oi} className="row-actions" style={{ alignItems: "center" }}>
                          <input
                            value={opt.label}
                            placeholder="Label"
                            style={{ flex: 1 }}
                            onChange={(e) => updateOption(idx, oi, { label: e.target.value })}
                          />
                          <input
                            value={opt.value}
                            placeholder="Valor"
                            style={{ flex: 1 }}
                            onChange={(e) => updateOption(idx, oi, { value: e.target.value })}
                          />
                          <button className="secondary-button" type="button" onClick={() => moveOption(idx, oi, -1)} disabled={oi === 0}><FiArrowUp /></button>
                          <button className="secondary-button" type="button" onClick={() => moveOption(idx, oi, 1)} disabled={oi === (field.options?.length ?? 0) - 1}><FiArrowDown /></button>
                          <button className="danger-button" type="button" onClick={() => removeOption(idx, oi)}><FiTrash2 /></button>
                        </div>
                      ))}
                      <div>
                        <button className="secondary-button" type="button" onClick={() => addOption(idx)} style={{ marginTop: 4 }}>
                          <FiPlus /> Adicionar opção
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default FormManagerPage;
