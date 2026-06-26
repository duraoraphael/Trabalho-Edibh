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

  const visibleCustomFields = useMemo(() => {
    return formFields
      .filter((field) => !field.visible_roles?.length || field.visible_roles.includes(role))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [formFields, role]);

  const isFieldEditable = (field: FieldConfig) => {
    if (!field.editable_roles?.length) return !field.readonly;
    return field.editable_roles.includes(role) && !field.readonly;
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
    if (!formState.instalacao.trim()) newErrors.instalacao = "Instalação é obrigatória.";
    if (!formState.sistema.trim()) newErrors.sistema = "Sistema é obrigatório.";
    if (!formState.equipamento.trim()) newErrors.equipamento = "Equipamento é obrigatório.";
    if (!formState.data) newErrors.data = "Data é obrigatória.";
    if (!formState.gerencia.trim()) newErrors.gerencia = "Gerência é obrigatória.";
    if (formState.situacao_identificada.trim().length < 50) newErrors.situacao_identificada = "Mínimo de 50 caracteres.";
    if (isEditing && !formState.motivo_edicao.trim()) newErrors.motivo_edicao = "Motivo da edição é obrigatório.";

    visibleCustomFields.forEach((field) => {
      const value = formState.custom_fields?.[field.id];
      if (field.required && (value === undefined || value === null || String(value).trim() === "")) {
        newErrors[`custom_${field.id}`] = `${field.label} é obrigatório.`;
      }
    });

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
          <div className="form-field">
            <label>Instalação</label>
            <div className="input-with-icon">
              <FiMapPin />
              <input name="instalacao" value={formState.instalacao} onChange={handleChange} placeholder="Ex: Plataforma A" required />
            </div>
            {errors.instalacao && <span className="field-error">{errors.instalacao}</span>}
          </div>

          <div className="form-field">
            <label>Sistema</label>
            <div className="input-with-icon">
              <FiSettings />
              <input name="sistema" value={formState.sistema} onChange={handleChange} placeholder="Ex: SAP" required />
            </div>
            {errors.sistema && <span className="field-error">{errors.sistema}</span>}
          </div>

          <div className="form-field">
            <label>Equipamento</label>
            <div className="input-with-icon">
              <FiCpu />
              <input name="equipamento" value={formState.equipamento} onChange={handleChange} placeholder="Ex: Servidor DB-01" required />
            </div>
            {errors.equipamento && <span className="field-error">{errors.equipamento}</span>}
          </div>

          <div className="form-field">
            <label>Data</label>
            <div className="input-with-icon">
              <FiCalendar />
              <input type="date" name="data" value={formState.data} onChange={handleChange} required />
            </div>
            {errors.data && <span className="field-error">{errors.data}</span>}
          </div>

          <div className="form-field">
            <label>Gerência</label>
            <div className="input-with-icon">
              <FiClipboard />
              <input name="gerencia" value={formState.gerencia} onChange={handleChange} placeholder="Ex: Manutenção" required />
            </div>
            {errors.gerencia && <span className="field-error">{errors.gerencia}</span>}
          </div>

          <div className="form-field">
            <label>Situação Identificada</label>
            <div className="textarea-with-icon">
              <FiEdit3 />
              <textarea
                name="situacao_identificada"
                rows={15}
                value={formState.situacao_identificada}
                onChange={handleChange}
                required
                placeholder="Descreva em no mínimo 50 caracteres..."
              />
            </div>
            {errors.situacao_identificada && <span className="field-error">{errors.situacao_identificada}</span>}
          </div>

          {canChangeStatus && (
            <div className="form-field">
              <label>Status</label>
              <div className="select-with-icon">
                <FiCheckCircle />
                <select name="status" value={formState.status} onChange={handleChange}>
                  <option value="Em análise">Em análise</option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="Reprovado">Reprovado</option>
                </select>
              </div>
            </div>
          )}

          {isEditing && (
            <div className="form-field">
              <label>Motivo da edição</label>
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

          {!!visibleCustomFields.length && (
            <section className="custom-fields-section">
              <h3>Campos Configuráveis</h3>
              {visibleCustomFields.map((field) => {
                const editable = isFieldEditable(field);
                const fieldError = errors[`custom_${field.id}`];
                const value = formState.custom_fields?.[field.id] ?? "";

                if (field.type === "textarea") {
                  return (
                    <div className="form-field" key={field.id}>
                      <label>{field.label}</label>
                      <textarea
                        value={value}
                        placeholder={field.placeholder || ""}
                        onChange={(e) => updateCustomField(field.id, e.target.value)}
                        required={!!field.required}
                        readOnly={!editable}
                      />
                      {fieldError && <span className="field-error">{fieldError}</span>}
                    </div>
                  );
                }

                if (field.type === "select") {
                  return (
                    <div className="form-field" key={field.id}>
                      <label>{field.label}</label>
                      <select
                        value={value}
                        onChange={(e) => updateCustomField(field.id, e.target.value)}
                        required={!!field.required}
                        disabled={!editable}
                      >
                        <option value="">Selecione...</option>
                        {(field.options || []).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      {fieldError && <span className="field-error">{fieldError}</span>}
                    </div>
                  );
                }

                if (field.type === "checkbox") {
                  return (
                    <div className="form-field" key={field.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={!!value}
                          onChange={(e) => updateCustomField(field.id, e.target.checked)}
                          disabled={!editable}
                        /> {field.label}
                      </label>
                    </div>
                  );
                }

                return (
                  <div className="form-field" key={field.id}>
                    <label>{field.label}</label>
                    <input
                      type={field.type === "numero" ? "number" : field.type === "email" ? "email" : field.type === "url" ? "url" : field.type === "telefone" ? "tel" : field.type === "data" ? "date" : field.type === "hora" ? "time" : "text"}
                      value={value}
                      placeholder={field.placeholder || ""}
                      onChange={(e) => updateCustomField(field.id, e.target.value)}
                      required={!!field.required}
                      readOnly={!editable}
                    />
                    {fieldError && <span className="field-error">{fieldError}</span>}
                  </div>
                );
              })}
            </section>
          )}

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
