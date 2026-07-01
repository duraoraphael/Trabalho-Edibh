import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiCpu,
  FiEdit3,
  FiEye,
  FiFileText,
  FiMapPin,
  FiRefreshCw,
  FiSave,
  FiSettings,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import api, { getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]);
const ACCEPTED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

const initialState = {
  instalacao: "",
  sistema: "",
  equipamento: "",
  data: "",
  gerencia: "",
  situacao_identificada: "",
  status: "Em análise",
  custom_fields: {} as Record<string, any>,
  motivo_edicao: "",
};

type EvidenceDraft = {
  id: string;
  file: File;
  previewUrl: string | null;
  isImage: boolean;
};

type FieldConfig = {
  id: string;
  label: string;
  type: string;
  order?: number;
  placeholder?: string;
  required?: boolean;
  readonly?: boolean;
  options?: Array<{ label: string; value: string }>;
  visible_roles?: string[];
  editable_roles?: string[];
  validations?: Record<string, any>;
};

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function ReportFormPage() {
  const role = localStorage.getItem("role") || "Operador";
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("editId");
  const isEditing = !!editId;
  const canChangeStatus = ["Administrador", "Gerente", "Supervisor"].includes(role);

  const [formState, setFormState] = useState(initialState);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formFields, setFormFields] = useState<FieldConfig[]>([]);

  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceDraft[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      evidenceFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [evidenceFiles]);

  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const response = await api.get("/admin/form-fields");
        if (!active) return;
        const fields = (response.data?.fields || []) as FieldConfig[];
        setFormFields(fields);
      } catch {
        setFormFields([]);
      }
    };
    loadConfig();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadRecord = async () => {
      if (!editId) return;
      try {
        const response = await api.get(`/reports/${editId}`);
        if (!active) return;
        const data = response.data;
        setFormState((prev) => ({
          ...prev,
          instalacao: data.instalacao || "",
          sistema: data.sistema || "",
          equipamento: data.equipamento || "",
          data: data.data || "",
          gerencia: data.gerencia || "",
          situacao_identificada: data.situacao_identificada || "",
          status: data.status || "Em análise",
          custom_fields: data.custom_fields || {},
        }));
      } catch (err) {
        emitAlert({ type: "error", title: "Falha ao carregar registro", message: getApiErrorMessage(err, "Não foi possível carregar o registro para edição.") });
      }
    };
    loadRecord();
    return () => {
      active = false;
    };
  }, [editId]);

  // IDs that bind directly to formState (not custom_fields)
  const CORE_FIELDS = new Set(["instalacao", "sistema", "equipamento", "data", "gerencia", "situacao_identificada", "status"]);
  // Icon mapping for core fields
  const FIELD_ICONS: Record<string, React.ReactNode> = {
    instalacao: <FiMapPin />, sistema: <FiSettings />, equipamento: <FiCpu />,
    data: <FiCalendar />, gerencia: <FiClipboard />, situacao_identificada: <FiEdit3 />,
    status: <FiCheckCircle />,
  };

  const visibleCustomFields = useMemo(() => {
    return formFields
      .filter((field) => !field.visible_roles?.length || field.visible_roles.includes(role))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [formFields, role]);

  const isFieldEditable = (field: FieldConfig) => {
    if (!field.editable_roles?.length) return !field.readonly;
    return field.editable_roles.includes(role) && !field.readonly;
  };

  const getFieldValue = (field: FieldConfig) => {
    if (CORE_FIELDS.has(field.id)) return (formState as any)[field.id] ?? "";
    return formState.custom_fields?.[field.id] ?? "";
  };

  const setFieldValue = (field: FieldConfig, value: any) => {
    if (CORE_FIELDS.has(field.id)) {
      setFormState((s) => ({ ...s, [field.id]: value }));
      setErrors((e) => ({ ...e, [field.id]: "" }));
    } else {
      updateCustomField(field.id, value);
    }
  };

  const handleEvidenceSelect = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    const selected = Array.from(incoming);
    const availableSlots = MAX_FILES - evidenceFiles.length;
    if (availableSlots <= 0) {
      emitAlert({ type: "warning", title: "Limite atingido", message: "Máximo de 20 arquivos por registro." });
      return;
    }

    const nextBatch = selected.slice(0, availableSlots);
    const nextFiles: EvidenceDraft[] = [];

    nextBatch.forEach((file) => {
      const extension = `.${(file.name.split(".").pop() || "").toLowerCase()}`;
      const mimeType = file.type.toLowerCase();
      if (!ACCEPTED_EXT.has(extension) || !ACCEPTED_MIME.has(mimeType)) {
        emitAlert({ type: "warning", title: "Formato inválido", message: `${file.name} não é suportado.` });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        emitAlert({ type: "warning", title: "Arquivo muito grande", message: `${file.name} ultrapassa 10 MB.` });
        return;
      }

      const isImage = mimeType.startsWith("image/");
      nextFiles.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : null,
        isImage,
      });
    });

    if (nextFiles.length) {
      setEvidenceFiles((current) => [...current, ...nextFiles]);
      setErrors((prev) => ({ ...prev, evidencias: "" }));
    }
  };

  const removeEvidence = (id: string) => {
    setEvidenceFiles((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    visibleCustomFields.forEach((field) => {
      if (field.id === "evidencias" || field.id === "status") return;
      const value = CORE_FIELDS.has(field.id)
        ? (formState as any)[field.id]
        : formState.custom_fields?.[field.id];
      const errorKey = CORE_FIELDS.has(field.id) ? field.id : `custom_${field.id}`;
      const isEmpty = value === undefined || value === null || String(value).trim() === "";
      if (field.required && isEmpty) {
        newErrors[errorKey] = `${field.label} é obrigatório.`;
      }
    });

    if (isEditing && !formState.motivo_edicao.trim()) {
      newErrors.motivo_edicao = "Motivo da edição é obrigatório.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setSuccess(false);

    if (!validateForm()) {
      setMessage("Corrija os campos destacados.");
      emitAlert({ type: "warning", title: "Validação", message: "Corrija os campos destacados no formulário." });
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    try {
      const payload: any = {
        instalacao: formState.instalacao,
        sistema: formState.sistema,
        equipamento: formState.equipamento,
        data: formState.data,
        gerencia: formState.gerencia,
        situacao_identificada: formState.situacao_identificada,
        custom_fields: formState.custom_fields,
      };
      if (canChangeStatus) payload.status = formState.status;
      if (isEditing) payload.motivo_edicao = formState.motivo_edicao;

      const response = isEditing ? await api.put(`/reports/${editId}`, payload) : await api.post("/reports", payload);
      const targetId = response?.data?.id || editId;

      if (targetId && evidenceFiles.length) {
        const formData = new FormData();
        evidenceFiles.forEach((item) => formData.append("files", item.file));
        await api.post(`/reports/${targetId}/evidence`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent: any) => {
            const total = progressEvent.total || 0;
            const loaded = progressEvent.loaded || 0;
            if (total > 0) setUploadProgress(Math.min(100, Math.round((loaded / total) * 100)));
          },
        });
      }

      setSuccess(true);
      setMessage(isEditing ? "Registro atualizado com sucesso." : "Registro salvo com sucesso.");
      emitAlert({ type: "success", title: isEditing ? "Registro atualizado" : "Registro salvo", message: "Operação concluída com sucesso." });
      if (!isEditing) {
        setFormState(initialState);
        evidenceFiles.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
        setEvidenceFiles([]);
      }
      setUploadProgress(0);
    } catch (err) {
      setSuccess(false);
      const friendly = getApiErrorMessage(err, isEditing ? "Falha ao atualizar registro." : "Falha ao salvar registro.");
      setMessage(friendly);
      emitAlert({ type: "error", title: "Erro", message: friendly });
    } finally {
      setLoading(false);
    }
  };

  const updateCustomField = (fieldId: string, value: any) => {
    setFormState((current) => ({
      ...current,
      custom_fields: { ...(current.custom_fields || {}), [fieldId]: value },
    }));
    setErrors((current) => ({ ...current, [`custom_${fieldId}`]: "" }));
  };

  return (
    <div className="app-shell">
      <div className="form-card">
        <div className="form-card-head">
          <h1>{isEditing ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}</h1>
          <p className="subtitle">Preencha os dados para registrar uma ocorrência técnica.</p>
        </div>
        <form onSubmit={handleSubmit}>

          {visibleCustomFields.map((field) => {
            const editable = isFieldEditable(field);
            const value = getFieldValue(field);
            const errorKey = CORE_FIELDS.has(field.id) ? field.id : `custom_${field.id}`;
            const fieldError = errors[errorKey];
            const icon = FIELD_ICONS[field.id];

            // Evidence upload — rendered separately below
            if (field.id === "evidencias") return null;

            // Status — only show if user can change it
            if (field.id === "status" && !canChangeStatus) return null;

            if (field.type === "textarea") {
              return (
                <div className="form-field" key={field.id}>
                  <label>{field.label}{field.required && " *"}</label>
                  <div className={icon ? "textarea-with-icon" : ""}>
                    {icon}
                    <textarea
                      rows={field.id === "situacao_identificada" ? 15 : 4}
                      value={value}
                      placeholder={field.placeholder || ""}
                      onChange={(e) => setFieldValue(field, e.target.value)}
                      required={!!field.required}
                      readOnly={!editable}
                    />
                  </div>
                  {fieldError && <span className="field-error">{fieldError}</span>}
                </div>
              );
            }

            if (field.type === "select") {
              return (
                <div className="form-field" key={field.id}>
                  <label>{field.label}{field.required && " *"}</label>
                  <div className={icon ? "select-with-icon" : ""}>
                    {icon}
                    <select
                      value={value}
                      onChange={(e) => setFieldValue(field, e.target.value)}
                      required={!!field.required}
                      disabled={!editable}
                    >
                      {!value && <option value="">Selecione...</option>}
                      {(field.options || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {fieldError && <span className="field-error">{fieldError}</span>}
                </div>
              );
            }

            if (field.type === "checkbox") {
              return (
                <div className="form-field" key={field.id}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={!!value}
                      onChange={(e) => setFieldValue(field, e.target.checked)}
                      disabled={!editable}
                    />
                    {field.label}
                  </label>
                </div>
              );
            }

            if (field.type === "radio") {
              return (
                <div className="form-field" key={field.id}>
                  <label>{field.label}{field.required && " *"}</label>
                  <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                    {(field.options || []).map((opt) => (
                      <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input
                          type="radio"
                          name={field.id}
                          value={opt.value}
                          checked={value === opt.value}
                          onChange={() => setFieldValue(field, opt.value)}
                          disabled={!editable}
                          required={!!field.required}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  {fieldError && <span className="field-error">{fieldError}</span>}
                </div>
              );
            }

            const inputType = field.type === "numero" ? "number"
              : field.type === "email" ? "email"
              : field.type === "url" ? "url"
              : field.type === "telefone" ? "tel"
              : field.type === "data" ? "date"
              : field.type === "hora" ? "time"
              : "text";

            return (
              <div className="form-field" key={field.id}>
                <label>{field.label}{field.required && " *"}</label>
                <div className={icon ? "input-with-icon" : ""}>
                  {icon}
                  <input
                    type={inputType}
                    value={value}
                    placeholder={field.placeholder || ""}
                    onChange={(e) => setFieldValue(field, e.target.value)}
                    required={!!field.required}
                    readOnly={!editable}
                  />
                </div>
                {fieldError && <span className="field-error">{fieldError}</span>}
              </div>
            );
          })}

          {isEditing && (
            <div className="form-field">
              <label>Motivo da edição *</label>
              <div className="textarea-with-icon">
                <FiEdit3 />
                <textarea
                  name="motivo_edicao"
                  rows={4}
                  value={formState.motivo_edicao}
                  onChange={handleChange}
                  required
                  placeholder="Descreva o motivo desta alteração..."
                />
              </div>
              {errors.motivo_edicao && <span className="field-error">{errors.motivo_edicao}</span>}
            </div>
          )}

          {/* Evidence upload — always last, rendered from "evidencias" field in config if present */}
          {visibleCustomFields.some((f) => f.id === "evidencias") && (
          <div className="form-field">
            <label>Evidências da Falha</label>
            <div
              className={`evidence-dropzone ${dragActive ? "drag-active" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                handleEvidenceSelect(event.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(event) => {
                  handleEvidenceSelect(event.target.files);
                  event.currentTarget.value = "";
                }}
                hidden
              />
              <FiUploadCloud />
              <div>
                <strong>Arraste e solte arquivos aqui</strong>
                <p>ou clique para selecionar no explorador</p>
              </div>
              <span className="field-hint">Formatos: JPG, JPEG, PNG, WEBP, PDF | Máx.: 20 arquivos | 10 MB por arquivo</span>
            </div>

            {!!evidenceFiles.length && (
              <>
                <div className="evidence-meta-row">
                  <span>{evidenceFiles.length} arquivo(s) selecionado(s)</span>
                </div>
                <div className="evidence-grid">
                  {evidenceFiles.map((item) => (
                    <article className="evidence-card" key={item.id}>
                      <div className="evidence-preview">
                        {item.isImage && item.previewUrl ? (
                          <img src={item.previewUrl} alt={item.file.name} />
                        ) : (
                          <div className="evidence-pdf-placeholder">
                            <FiFileText />
                            <span>PDF</span>
                          </div>
                        )}
                      </div>
                      <div className="evidence-info">
                        <strong title={item.file.name}>{item.file.name}</strong>
                        <span>{formatFileSize(item.file.size)}</span>
                      </div>
                      <div className="evidence-actions">
                        {item.isImage && item.previewUrl && (
                          <button type="button" className="secondary-button" onClick={() => setFullscreenImage(item.previewUrl)}>
                            <FiEye /> Visualizar
                          </button>
                        )}
                        <button type="button" className="danger-button" onClick={() => removeEvidence(item.id)}>
                          <FiTrash2 /> Remover
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

            {loading && evidenceFiles.length > 0 && (
              <div className="upload-progress-block" aria-live="polite">
                <div className="upload-progress-track">
                  <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
                <span>{uploadProgress}% enviado</span>
              </div>
            )}
          </div>
          )}

          <div className="button-row">
            <button type="submit" className="primary-button" disabled={loading}>
              <FiSave /> {loading ? "Salvando..." : isEditing ? "Atualizar" : "Salvar"}
            </button>
            <button
              type="reset"
              className="secondary-button"
              disabled={loading}
              onClick={() => {
                setFormState(initialState);
                evidenceFiles.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
                setEvidenceFiles([]);
                setUploadProgress(0);
              }}
            >
              <FiRefreshCw /> Limpar
            </button>
          </div>
        </form>
        {message && <div className={success ? "form-message" : "form-error"}>{message}</div>}
      </div>

      {fullscreenImage && (
        <div className="evidence-modal" role="dialog" aria-modal="true" onClick={() => setFullscreenImage(null)}>
          <button type="button" className="icon-button evidence-modal-close" onClick={() => setFullscreenImage(null)}>
            <FiX />
          </button>
          <img src={fullscreenImage} alt="Visualização em tela cheia" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

export default ReportFormPage;
