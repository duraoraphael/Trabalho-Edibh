import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiEdit3, FiFileText, FiImage, FiMail, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import api, { getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

function fmtDate(val: any) {
  if (!val) return "-";
  try { return new Date(val).toLocaleString("pt-BR"); } catch { return String(val); }
}

const STATUS_COLORS: Record<string, string> = {
  "aprovado": "#16a34a",
  "reprovado": "#dc2626",
  "pendente": "#d97706",
  "em análise": "#2563eb",
};
function statusColor(s: string) { return STATUS_COLORS[(s || "").toLowerCase()] ?? "#6b7280"; }

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "var(--brand)", borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoGrid({ items }: { items: Array<{ label: string; value: any }> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
      {items.map(({ label, value }) => (
        <div key={label}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", wordBreak: "break-word" }}>{value || "-"}</div>
        </div>
      ))}
    </div>
  );
}

export default function ViewRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "Operador";
  const canEdit = role === "Administrador";
  const userName = localStorage.getItem("name") || "";
  const userEmail = localStorage.getItem("email") || "";

  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailModal, setEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState<string[]>([""]);
  const [emailCc, setEmailCc] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [attachEvidencias, setAttachEvidencias] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/reports/${id}`)
      .then((r) => {
        const rec = r.data;
        setRecord(rec);
        setEmailSubject(`Registro Técnico #${rec.id} — ${rec.instalacao || ""}`);
        const customLines = Object.entries(rec.custom_fields || {})
          .map(([k, v]) => `${k}: ${v}`).join("\n");
        setEmailBody(buildEmailText(rec, customLines));
      })
      .catch((err) => emitAlert({ type: "error", title: "Erro", message: getApiErrorMessage(err, "Não foi possível carregar o registro.") }))
      .finally(() => setLoading(false));
  }, [id]);

  function buildEmailText(rec: any, customLines: string) {
    return `Prezado(a),

Segue abaixo o registro técnico para conhecimento e providências:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGISTRO #${rec.id || ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Instalação:             ${rec.instalacao || ""}
Sistema:                ${rec.sistema || ""}
Equipamento:            ${rec.equipamento || ""}
Gerência:               ${rec.gerencia || ""}
Data:                   ${rec.data || ""}
Status:                 ${rec.status || "Em análise"}
Responsável:            ${rec.usuario_criacao || ""}
Data de Criação:        ${rec.data_criacao ? new Date(rec.data_criacao).toLocaleString("pt-BR") : ""}
${customLines ? `\nCampos Adicionais:\n${customLines}\n` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITUAÇÃO IDENTIFICADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${rec.situacao_identificada || ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este e-mail foi gerado automaticamente pelo sistema CIM — Fluxo de Equipamentos.`;
  }

  const sendEmail = async () => {
    const validTo = emailTo.map((e) => e.trim()).filter(Boolean);
    if (!validTo.length) { emitAlert({ type: "warning", title: "Atenção", message: "Informe ao menos um destinatário." }); return; }
    if (!emailSubject.trim()) { emitAlert({ type: "warning", title: "Atenção", message: "O assunto é obrigatório." }); return; }
    setSending(true);
    try {
      const validCc = emailCc.map((e) => e.trim()).filter(Boolean);
      await api.post(`/reports/${id}/send-email`, {
        to: validTo,
        cc: validCc,
        subject: emailSubject,
        body: emailBody.replace(/\n/g, "<br>"),
        attach_evidencias: attachEvidencias,
        sender_name: userName,
        sender_email: userEmail,
      });
      emitAlert({ type: "success", title: "E-mail enviado", message: `Enviado para ${validTo.join(", ")}.` });
      setEmailModal(false);
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível enviar o e-mail.") });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="app-shell"><div className="loading-state">Carregando...</div></div>;
  if (!record) return <div className="app-shell"><div className="form-error">Registro não encontrado.</div></div>;

  const historico: any[] = record.historico_alteracoes || [];
  const customFields = record.custom_fields || {};
  const evidencias: any[] = record.evidencias || [];

  return (
    <>
    <div className="app-shell">
      <header className="app-header" style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button className="secondary-button" type="button" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Voltar
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>Registro #{id}</h1>
          <p className="subtitle" style={{ margin: 0 }}>Visualização completa do registro técnico</p>
        </div>
        {canEdit && (
          <button className="primary-button" type="button" onClick={() => navigate(`/history/edit/${id}`)}>
            <FiEdit3 /> Editar
          </button>
        )}
        {canEdit && (
          <button className="secondary-button" type="button" onClick={() => setEmailModal(true)}>
            <FiMail /> Enviar E-mail
          </button>
        )}
      </header>

      {/* Informações Gerais */}
      <SectionCard title="Informações Gerais">
        <InfoGrid items={[
          { label: "Instalação", value: record.instalacao },
          { label: "Sistema", value: record.sistema },
          { label: "Equipamento", value: record.equipamento },
          { label: "Gerência", value: record.gerencia },
          { label: "Data", value: record.data },
          { label: "Responsável", value: record.usuario_criacao },
          { label: "Data de Criação", value: fmtDate(record.data_criacao) },
          { label: "Última Edição por", value: record.usuario_alteracao || "-" },
          { label: "Data da Edição", value: fmtDate(record.data_alteracao) },
          ...Object.entries(customFields).map(([k, v]) => ({ label: k, value: String(v) })),
        ]} />
      </SectionCard>

      {/* Status Atual */}
      <SectionCard title="Status Atual">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px",
            borderRadius: 20, fontWeight: 700, fontSize: 14, background: statusColor(record.status) + "1a",
            color: statusColor(record.status), border: `1.5px solid ${statusColor(record.status)}40`,
          }}>
            {record.status || "Em análise"}
          </span>
        </div>
      </SectionCard>

      {/* Situação Identificada */}
      <SectionCard title="Situação Identificada">
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--text)" }}>
          {record.situacao_identificada || "-"}
        </p>
      </SectionCard>

      {/* Evidências */}
      {evidencias.length > 0 && (
        <SectionCard title={`Evidências (${evidencias.length})`}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {evidencias.map((ev: any) => {
              const isImage = ev.mime_type?.startsWith("image/");
              return (
                <a key={ev.id} href={ev.web_url} target="_blank" rel="noreferrer"
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 10, textDecoration: "none", color: "var(--text)", fontSize: 12, maxWidth: 140, textAlign: "center", wordBreak: "break-all" }}>
                  {isImage ? <FiImage size={28} color="var(--brand)" /> : <FiFileText size={28} color="var(--brand)" />}
                  <span>{ev.name}</span>
                </a>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Histórico de Alterações - Timeline */}
      <SectionCard title="Histórico de Alterações">
        {historico.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>Nenhuma alteração registrada.</p>
        ) : (
          <div style={{ position: "relative", paddingLeft: 28 }}>
            <div style={{ position: "absolute", left: 9, top: 0, bottom: 0, width: 2, background: "var(--border)" }} />
            {historico.map((entry: any, i: number) => (
              <div key={i} style={{ position: "relative", marginBottom: i < historico.length - 1 ? 24 : 0 }}>
                <div style={{
                  position: "absolute", left: -28, top: 2, width: 16, height: 16,
                  borderRadius: "50%", background: statusColor(entry.novo_status),
                  border: "2px solid var(--surface)", boxShadow: "0 0 0 2px " + statusColor(entry.novo_status) + "40",
                }} />
                <div style={{ background: "var(--surface-alt)", borderRadius: 10, padding: "10px 14px", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <strong style={{ fontSize: 13 }}>{entry.usuario}</strong>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{fmtDate(entry.data_hora)}</span>
                    {entry.status_anterior !== entry.novo_status && (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: statusColor(entry.novo_status) + "1a", color: statusColor(entry.novo_status), fontWeight: 600 }}>
                        {entry.status_anterior} → {entry.novo_status}
                      </span>
                    )}
                  </div>
                  {entry.descricao && (
                    <p style={{ margin: "0 0 6px", fontSize: 13, lineHeight: 1.6 }}>{entry.descricao}</p>
                  )}
                  {entry.campos_alterados?.length > 0 && (
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      Campos alterados: <strong>{entry.campos_alterados.join(", ")}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>

    {/* Modal de E-mail */}
    {emailModal && (
      <div className="modal-backdrop" role="dialog" aria-modal="true">
        <div className="modal-card" style={{ maxWidth: 580, width: "100%" }}>
          <div className="modal-title-row">
            <h3><FiMail style={{ marginRight: 8 }} />Enviar Registro por E-mail</h3>
            <button type="button" className="icon-button" onClick={() => setEmailModal(false)}><FiX /></button>
          </div>

          {/* Remetente identificado */}
          <div style={{ background: "var(--surface-alt)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <FiMail size={14} />
            <span>Enviando como: <strong style={{ color: "var(--text)" }}>{userName || userEmail}</strong> &lt;{userEmail}&gt;</span>
          </div>

          {/* Destinatários */}
          <div className="form-field">
            <label>Destinatários *</label>
            {emailTo.map((addr, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input
                  type="email"
                  value={addr}
                  placeholder="email@exemplo.com"
                  style={{ flex: 1 }}
                  onChange={(e) => {
                    const next = [...emailTo];
                    next[i] = e.target.value;
                    setEmailTo(next);
                  }}
                />
                {emailTo.length > 1 && (
                  <button type="button" className="danger-button" style={{ padding: "0 10px" }}
                    onClick={() => setEmailTo(emailTo.filter((_, j) => j !== i))}>
                    <FiTrash2 />
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="secondary-button" style={{ marginTop: 2 }}
              onClick={() => setEmailTo([...emailTo, ""])}>
              <FiPlus /> Adicionar destinatário
            </button>
          </div>

          {/* CC */}
          <div className="form-field">
            <label>Cópia (CC)</label>
            {emailCc.length === 0 && (
              <button type="button" className="secondary-button" style={{ marginBottom: 4 }}
                onClick={() => setEmailCc([""])}>
                <FiPlus /> Adicionar cópia
              </button>
            )}
            {emailCc.map((addr, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input
                  type="email"
                  value={addr}
                  placeholder="copia@exemplo.com"
                  style={{ flex: 1 }}
                  onChange={(e) => {
                    const next = [...emailCc];
                    next[i] = e.target.value;
                    setEmailCc(next);
                  }}
                />
                <button type="button" className="danger-button" style={{ padding: "0 10px" }}
                  onClick={() => setEmailCc(emailCc.filter((_, j) => j !== i))}>
                  <FiTrash2 />
                </button>
              </div>
            ))}
            {emailCc.length > 0 && (
              <button type="button" className="secondary-button" style={{ marginTop: 2 }}
                onClick={() => setEmailCc([...emailCc, ""])}>
                <FiPlus /> Adicionar mais cópia
              </button>
            )}
          </div>

          {/* Assunto */}
          <div className="form-field">
            <label>Assunto *</label>
            <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
          </div>

          {/* Evidências como anexo */}
          {evidencias.length > 0 && (
            <div className="form-field">
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={attachEvidencias}
                  onChange={(e) => setAttachEvidencias(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span>
                  Incluir evidências como anexo
                  <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>
                    ({evidencias.length} arquivo{evidencias.length !== 1 ? "s" : ""}: {evidencias.map((e: any) => e.name).join(", ")})
                  </span>
                </span>
              </label>
            </div>
          )}

          {/* Corpo */}
          <div className="form-field">
            <label>Corpo do e-mail</label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={12}
              style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
            />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              Pré-preenchido com os dados do registro. Edite livremente antes de enviar.
            </span>
          </div>

          {/* Aviso sobre anexos quando há evidências */}
          {attachEvidencias && evidencias.length > 0 && (
            <div style={{
              background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 8,
              padding: "10px 14px", fontSize: 13, color: "#92400e", marginBottom: 4,
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 18 }}>💡</span>
              <span>
                O navegador não permite anexar arquivos via Outlook automaticamente.
                Ao clicar em <strong>"Abrir no Outlook"</strong>, as fotos serão
                <strong> baixadas automaticamente</strong> — é só arrastá-las para
                o e-mail que vai abrir.
              </span>
            </div>
          )}

          <div className="modal-actions" style={{ flexWrap: "wrap", gap: 8 }}>
            <button type="button" className="secondary-button" onClick={() => setEmailModal(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                // 1. Baixar cada evidência automaticamente se marcado
                if (attachEvidencias) {
                  const downloadBlob = async (ev: any, i: number) => {
                    const url = ev.web_url;
                    if (!url) return;
                    try {
                      const res = await fetch(url);
                      const blob = await res.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = blobUrl;
                      a.download = ev.name || `evidencia_${i + 1}`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                    } catch {
                      window.open(url, "_blank");
                    }
                  };
                  evidencias.forEach((ev: any, i: number) => {
                    setTimeout(() => downloadBlob(ev, i), i * 600);
                  });
                }
                // 2. Abrir Outlook com mailto preenchido
                const validTo = emailTo.filter(Boolean).join(",");
                const validCc = emailCc.filter(Boolean).join(",");
                const parts: string[] = [];
                if (validCc) parts.push(`cc=${encodeURIComponent(validCc)}`);
                parts.push(`subject=${encodeURIComponent(emailSubject)}`);
                parts.push(`body=${encodeURIComponent(emailBody)}`);
                const href = `mailto:${encodeURIComponent(validTo)}?${parts.join("&")}`;
                setTimeout(() => { window.location.href = href; },
                  attachEvidencias && evidencias.length > 0 ? 600 : 0);
              }}
            >
              <FiMail /> Abrir no Outlook
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
