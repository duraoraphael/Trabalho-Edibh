import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp,
  FiDownload, FiEdit3, FiEye, FiFileText, FiSearch, FiSliders, FiTrash2, FiX,
} from "react-icons/fi";
import api, { getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

const STATUSES = ["Em análise", "Aprovado", "Reprovado", "Pendente"];

const STATUS_CLASS: Record<string, string> = {
  "aprovado": "status-badge online",
  "reprovado": "status-badge offline",
  "pendente": "status-badge",
  "em análise": "status-badge",
};
function statusClass(s: string) { return STATUS_CLASS[(s || "").toLowerCase()] ?? "status-badge"; }

function fmtDate(val: any) {
  if (!val) return "-";
  try { return new Date(val).toLocaleString("pt-BR"); } catch { return String(val); }
}

function HistoryPage() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "Operador";
  const canDelete = role === "Administrador";
  const canEdit = role === "Administrador";
  const canChangeStatus = ["Administrador", "Gerente", "Supervisor"].includes(role);

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("data");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [statusModal, setStatusModal] = useState<{ record: any; status: string; descricao: string } | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/history");
      setRecords(res.data || []);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Erro ao carregar histórico."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredRecords = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = q
      ? records.filter((r) =>
          [r.instalacao, r.sistema, r.equipamento, r.gerencia, r.usuario_criacao, r.status, r.situacao_identificada]
            .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
        )
      : records;
    return [...items].sort((a, b) => {
      const av = String(a?.[sortBy] ?? "").toLowerCase();
      const bv = String(b?.[sortBy] ?? "").toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [records, query, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRecords = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, safePage]);

  const triggerExport = async (type: "csv" | "pdf") => {
    try {
      if (type === "csv") setExportingCsv(true); else setExportingPdf(true);
      const res = await api.get(`/history/export/${type}`, {
        responseType: "blob",
        params: { search: query || undefined, sort_by: sortBy, sort_dir: sortDir },
      });
      const mimeType = type === "csv"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";
      const ext = type === "csv" ? "xlsx" : "pdf";
      const blob = new Blob([res.data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
      a.href = url; a.download = `historico_${ts}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      emitAlert({ type: "success", title: "Exportação concluída", message: `${type.toUpperCase()} gerado.` });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível exportar.") });
    } finally { setExportingCsv(false); setExportingPdf(false); }
  };

  const deleteRecord = async (id: number) => {
    if (!window.confirm("Excluir este registro?")) return;
    try {
      await api.delete(`/reports/${id}`);
      setRecords((cur) => cur.filter((r) => r.id !== id));
      emitAlert({ type: "success", title: "Excluído", message: "Registro removido." });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível excluir.") });
    }
  };

  const saveStatus = async () => {
    if (!statusModal) return;
    if (!statusModal.descricao.trim()) {
      emitAlert({ type: "warning", title: "Obrigatório", message: "Informe a descrição da atualização." });
      return;
    }
    setStatusSaving(true);
    try {
      await api.patch(`/reports/${statusModal.record.id}/status`, { status: statusModal.status, descricao: statusModal.descricao });
      await load();
      setStatusModal(null);
      emitAlert({ type: "success", title: "Status atualizado", message: `Alterado para "${statusModal.status}".` });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha", message: getApiErrorMessage(err, "Não foi possível atualizar.") });
    } finally { setStatusSaving(false); }
  };

  const toggleRow = (id: number) =>
    setExpandedRows((cur) => { const s = new Set(cur); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Histórico de Registros</h1>
          <p className="subtitle">Consulte, filtre e exporte registros técnicos.</p>
        </div>
      </header>

      {error && <div className="form-error">{error}</div>}

      {loading ? <div className="loading-state">Carregando...</div> : (
        <div className="table-card">
          {/* Toolbar */}
          <div className="table-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
            <div className="input-with-icon compact" style={{ flex: "1 1 200px", minWidth: 160 }}>
              <FiSearch />
              <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Buscar registros..." />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" className="secondary-button" onClick={() => triggerExport("csv")} disabled={exportingCsv || exportingPdf}>
                <FiDownload /> {exportingCsv ? "..." : "Excel"}
              </button>
              <button type="button" className="secondary-button" onClick={() => triggerExport("pdf")} disabled={exportingCsv || exportingPdf}>
                <FiFileText /> {exportingPdf ? "..." : "PDF"}
              </button>
              <div className="select-with-icon compact">
                <FiSliders />
                <select value={`${sortBy}-${sortDir}`} onChange={(e) => { const [b, d] = e.target.value.split("-"); setSortBy(b); setSortDir(d as "asc" | "desc"); }}>
                  <option value="data-desc">Data (mais recente)</option>
                  <option value="data-asc">Data (mais antiga)</option>
                  <option value="instalacao-asc">Instalação A-Z</option>
                  <option value="gerencia-asc">Gerência A-Z</option>
                </select>
              </div>
              <span className="table-count">{filteredRecords.length} resultados</span>
            </div>
          </div>

          {/* Responsive scrollable table */}
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="modern-table" style={{ minWidth: 860, tableLayout: "auto" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                <tr>
                  <th style={{ width: 28 }}></th>
                  <th style={{ width: 40 }}>#</th>
                  <th>Instalação</th>
                  <th>Sistema</th>
                  <th>Equipamento</th>
                  <th>Gerência</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Responsável</th>
                  <th>Criação</th>
                  <th>Última Edição</th>
                  <th style={{ width: 110 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pagedRecords.map((item, index) => {
                  const isExpanded = expandedRows.has(item.id);
                  return [
                    <tr key={item.id}>
                      <td>
                        <button type="button" className="icon-button" style={{ padding: 2 }} onClick={() => toggleRow(item.id)}>
                          {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                        </button>
                      </td>
                      <td className="row-index" style={{ whiteSpace: "nowrap" }}>#{(safePage - 1) * pageSize + index + 1}</td>
                      <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.instalacao}>{item.instalacao}</td>
                      <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.sistema}>{item.sistema}</td>
                      <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.equipamento}>{item.equipamento}</td>
                      <td style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.gerencia}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{item.data}</td>
                      <td>
                        {canChangeStatus ? (
                          <button type="button" className={statusClass(item.status)}
                            style={{ cursor: "pointer", border: "none", background: "none", padding: 0, font: "inherit" }}
                            onClick={() => setStatusModal({ record: item, status: item.status || "Em análise", descricao: "" })}
                            title="Clique para alterar status">
                            {item.status || "Em análise"} ▾
                          </button>
                        ) : (
                          <span className={statusClass(item.status)}>{item.status || "Em análise"}</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{item.usuario_criacao || "-"}</td>
                      <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{fmtDate(item.data_criacao)}</td>
                      <td style={{ whiteSpace: "nowrap", fontSize: 12, color: item.usuario_alteracao ? undefined : "var(--muted)" }}>
                        {item.usuario_alteracao ? `${item.usuario_alteracao}` : "-"}
                      </td>
                      <td>
                        <div className="row-actions" style={{ gap: 4 }}>
                          <button type="button" className="secondary-button" onClick={() => navigate(`/history/view/${item.id}`)} title="Visualizar">
                            <FiEye />
                          </button>
                          {canEdit && (
                            <button type="button" className="secondary-button" onClick={() => navigate(`/history/edit/${item.id}`)} title="Editar">
                              <FiEdit3 />
                            </button>
                          )}
                          {canDelete && (
                            <button type="button" className="danger-button" onClick={() => deleteRecord(item.id)} title="Excluir">
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr key={`${item.id}-exp`} style={{ background: "var(--surface-alt)" }}>
                        <td colSpan={12} style={{ padding: "12px 20px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10, fontSize: 13 }}>
                            <div><strong>Situação Identificada:</strong><br /><span style={{ whiteSpace: "pre-wrap" }}>{item.situacao_identificada || "-"}</span></div>
                            <div><strong>Data de Criação:</strong><br />{fmtDate(item.data_criacao)}</div>
                            <div><strong>Última edição por:</strong><br />{item.usuario_alteracao || "-"} {item.data_alteracao ? `em ${fmtDate(item.data_alteracao)}` : ""}</div>
                            <div><strong>Motivo / Descrição:</strong><br />{item.motivo_edicao || "-"}</div>
                          </div>
                        </td>
                      </tr>
                    ),
                  ];
                })}
                {!pagedRecords.length && (
                  <tr><td colSpan={12} className="empty-table">Nenhum registro encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="table-pagination">
            <button type="button" className="secondary-button" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
              <FiChevronLeft /> Anterior
            </button>
            <span>Página {safePage} de {totalPages}</span>
            <button type="button" className="secondary-button" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima <FiChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {statusModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: 480, width: "100%" }}>
            <div className="modal-title-row">
              <h3>Alterar Status</h3>
              <button type="button" className="icon-button" onClick={() => setStatusModal(null)}><FiX /></button>
            </div>
            <div className="form-field">
              <label>Novo Status *</label>
              <select value={statusModal.status} onChange={(e) => setStatusModal({ ...statusModal, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Descrição da atualização *</label>
              <textarea rows={5} value={statusModal.descricao}
                onChange={(e) => setStatusModal({ ...statusModal, descricao: e.target.value })}
                placeholder="Descreva o que foi realizado ou o motivo da alteração..."
                style={{ width: "100%", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px" }}>
              Será registrado: usuário, data/hora, status anterior → novo status e descrição.
            </p>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setStatusModal(null)}>Cancelar</button>
              <button type="button" className="primary-button" onClick={saveStatus} disabled={statusSaving || !statusModal.descricao.trim()}>
                {statusSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
