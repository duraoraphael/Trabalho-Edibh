import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import api, { getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

const STATUSES = ["Em análise", "Aprovado", "Reprovado", "Pendente"];
const CORE_FIELDS = new Set(["instalacao", "sistema", "equipamento", "data", "gerencia", "situacao_identificada", "status"]);

type FieldConfig = {
  id: string; label: string; type: string; placeholder?: string;
  required?: boolean; readonly?: boolean; order?: number;
  options?: Array<{ label: string; value: string }>;
  visible_roles?: string[]; editable_roles?: string[];
};

export default function EditRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "Operador";
  const userEmail = localStorage.getItem("email") || "";
  const [formFields, setFormFields] = useState<FieldConfig[]>([]);
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isFieldEditable = (f: FieldConfig) => {
    if (f.readonly) return false;
    if (!f.editable_roles?.length) return true;
    return f.editable_roles.includes(role);
  };

  useEffect(() => {
    Promise.all([
      api.get("/admin/form-fields"),
      api.get(`/reports/${id}`),
    ]).then(([cfgRes, recRes]) => {
      const fields: FieldConfig[] = (cfgRes.data?.fields || [])
        .filter((f: FieldConfig) => !f.visible_roles?.length || f.visible_roles.includes(role))
        .sort((a: FieldConfig, b: FieldConfig) => (a.order || 0) - (b.order || 0));
      setFormFields(fields);

      const rec = recRes.data;
      const state: Record<string, any> = {
        instalacao: rec.instalacao || "",
        sistema: rec.sistema || "",
        equipamento: rec.equipamento || "",
        data: rec.data || "",
        gerencia: rec.gerencia || "",
        situacao_identificada: rec.situacao_identificada || "",
        status: rec.status || "Em análise",
        ...(rec.custom_fields || {}),
      };
      setFormState(state);
    }).catch((err) => {
      emitAlert({ type: "error", title: "Erro", message: getApiErrorMessage(err, "Não foi possível carregar o registro.") });
    }).finally(() => setLoading(false));
  }, [id, role]);

  const setValue = (key: string, val: any) => {
    setFormState((s) => ({ ...s, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!descricao.trim()) errs.descricao = "Descrição da alteração é obrigatória.";
    formFields.forEach((f) => {
      if (f.id === "evidencias" || !f.required || f.readonly) return;
      const val = formState[f.id];
      if (!val || String(val).trim() === "") errs[f.id] = `${f.label} é obrigatório.`;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { emitAlert({ type: "warning", title: "Atenção", message: "Corrija os campos destacados." }); return; }
    setSaving(true);
    try {
      const customFieldIds = formFields.filter((f) => !CORE_FIELDS.has(f.id) && f.id !== "evidencias").map((f) => f.id);
      const custom_fields: Record<string, any> = {};
      customFieldIds.forEach((k) => { if (formState[k] !== undefined) custom_fields[k] = formState[k]; });

      await api.put(`/reports/${id}`, {
        instalacao: formState.instalacao,
        sistema: formState.sistema,
        equipamento: formState.equipamento,
        data: formState.data,
        gerencia: formState.gerencia,
        situacao_identificada: formState.situacao_identificada,
        status: formState.status,
        custom_fields: Object.keys(custom_fields).length ? custom_fields : undefined,
        descricao_alteracao: descricao,
      });
      emitAlert({ type: "success", title: "Atualizado", message: "Registro atualizado com sucesso." });
      navigate(`/history/view/${id}`);
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível salvar.") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="app-shell"><div className="loading-state">Carregando...</div></div>;

  return (
    <div className="app-shell">
      <header className="app-header" style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button className="secondary-button" type="button" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Voltar
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>Editar Registro #{id}</h1>
          <p className="subtitle" style={{ margin: 0 }}>Todas as alterações são registradas na auditoria.</p>
        </div>
      </header>

      <div className="form-card">
        <form onSubmit={submit}>

          {/* Status — always shown on edit page for admin */}
          <div className="form-field">
            <label>Status *</label>
            <select value={formState.status || "Em análise"} onChange={(e) => setValue("status", e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {formFields.filter((f) => f.id !== "evidencias" && f.id !== "status").map((field) => {
            const editable = isFieldEditable(field);
            const value = formState[field.id] ?? "";
            const err = errors[field.id];

            if (field.type === "textarea") return (
              <div className="form-field" key={field.id}>
                <label>{field.label}{field.required ? " *" : ""}</label>
                <textarea rows={field.id === "situacao_identificada" ? 10 : 4} value={value}
                  placeholder={field.placeholder || ""} readOnly={!editable} required={field.required && editable}
                  onChange={(e) => setValue(field.id, e.target.value)} />
                {err && <span className="field-error">{err}</span>}
              </div>
            );

            if (field.type === "select") return (
              <div className="form-field" key={field.id}>
                <label>{field.label}{field.required ? " *" : ""}</label>
                <select value={value} disabled={!editable} onChange={(e) => setValue(field.id, e.target.value)}>
                  {!value && <option value="">Selecione...</option>}
                  {(field.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {err && <span className="field-error">{err}</span>}
              </div>
            );

            if (field.type === "checkbox") return (
              <div className="form-field" key={field.id}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={!!value} disabled={!editable} onChange={(e) => setValue(field.id, e.target.checked)} />
                  {field.label}
                </label>
              </div>
            );

            const inputType = field.type === "numero" ? "number" : field.type === "email" ? "email"
              : field.type === "url" ? "url" : field.type === "telefone" ? "tel"
              : field.type === "data" ? "date" : field.type === "hora" ? "time" : "text";

            return (
              <div className="form-field" key={field.id}>
                <label>{field.label}{field.required ? " *" : ""}</label>
                <input type={inputType} value={value} placeholder={field.placeholder || ""}
                  readOnly={!editable} required={field.required && editable}
                  onChange={(e) => setValue(field.id, e.target.value)} />
                {err && <span className="field-error">{err}</span>}
              </div>
            );
          })}

          {/* Descrição da Alteração — always required */}
          <div className="form-field" style={{ marginTop: 8 }}>
            <label style={{ fontWeight: 700, color: "var(--brand)" }}>Descrição da Alteração *</label>
            <textarea
              rows={6}
              value={descricao}
              onChange={(e) => { setDescricao(e.target.value); setErrors((er) => ({ ...er, descricao: "" })); }}
              placeholder="Descreva detalhadamente o que foi alterado e o motivo..."
              style={{ borderColor: errors.descricao ? "var(--danger)" : undefined }}
              required
            />
            {errors.descricao && <span className="field-error">{errors.descricao}</span>}
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Esta descrição será registrada no histórico de alterações junto com seu usuário, data e hora.
            </span>
          </div>

          <div className="button-row" style={{ marginTop: 16 }}>
            <button type="submit" className="primary-button" disabled={saving}>
              <FiSave /> {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate(-1)}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
