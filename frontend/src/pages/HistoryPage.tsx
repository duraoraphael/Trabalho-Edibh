import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiEdit3,
  FiEye,
  FiFileText,
  FiSearch,
  FiSliders,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import api, { getApiErrorMessage } from "../api";
import { emitAlert } from "../alerts";

function HistoryPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"data" | "instalacao" | "gerencia">("data");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);
  const [confirmEditRecord, setConfirmEditRecord] = useState<any | null>(null);
  const role = localStorage.getItem("role") || "Operador";
  const pageSize = 8;

  useEffect(() => {
    let isMounted = true;

    async function fetchHistory() {
      try {
        setLoading(true);
        const response = await api.get("/history");
        if (isMounted) {
          setRecords(response.data);
          setError("");
        }
      } catch (err) {
        if (isMounted) setError(getApiErrorMessage(err, "Erro ao carregar histórico."));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  const canDelete = role === "Administrador";

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const items = normalized
      ? records.filter((item) =>
          [item.instalacao, item.sistema, item.equipamento, item.gerencia, item.usuario_criacao]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalized))
        )
      : records;

    const sorted = [...items].sort((a, b) => {
      const av = String(a?.[sortBy] ?? "").toLowerCase();
      const bv = String(b?.[sortBy] ?? "").toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [records, query, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRecords = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, safePage]);

  const triggerExport = async (type: "csv" | "pdf") => {
    try {
      if (type === "csv") setExportingCsv(true);
      if (type === "pdf") setExportingPdf(true);

      const response = await api.get(`/history/export/${type}`, {
        responseType: "blob",
        params: {
          search: query || undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
        },
      });

      const blob = new Blob([response.data], { type: type === "csv" ? "text/csv;charset=utf-8;" : "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const now = new Date();
      const token = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
      link.href = url;
      link.download = `historico_${token}.${type}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      emitAlert({ type: "success", title: "Exportação concluída", message: `Arquivo ${type.toUpperCase()} gerado com sucesso.` });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha na exportação", message: getApiErrorMessage(err, "Não foi possível exportar o histórico.") });
    } finally {
      if (type === "csv") setExportingCsv(false);
      if (type === "pdf") setExportingPdf(false);
    }
  };

  const deleteRecord = async (recordId: number) => {
    if (!canDelete) return;
    if (!window.confirm("Tem certeza que deseja excluir este registro?")) return;
    try {
      await api.delete(`/reports/${recordId}`);
      setRecords((current) => current.filter((item) => item.id !== recordId));
      emitAlert({ type: "success", title: "Registro excluído", message: "Registro removido com sucesso." });
    } catch (err) {
      emitAlert({ type: "error", title: "Falha ao excluir", message: getApiErrorMessage(err, "Não foi possível excluir o registro.") });
    }
  };

  const statusClass = (status: string) => {
    const normalized = (status || "").toLowerCase();
    if (normalized.includes("aprov")) return "status-badge online";
    if (normalized.includes("reprov")) return "status-badge offline";
    return "status-badge";
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Histórico de Registros</h1>
          <p className="subtitle">Consulte registros com busca, ordenação e paginação.</p>
        </div>
      </header>
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <div className="loading-state">Carregando...</div>
      ) : (
        <div className="table-card">
          <div className="table-toolbar">
            <div className="input-with-icon compact">
              <FiSearch />
              <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Buscar no histórico" />
            </div>
            <div className="table-tools-right">
              <button type="button" className="secondary-button" onClick={() => triggerExport("csv")} disabled={exportingCsv || exportingPdf || loading}>
                <FiDownload /> {exportingCsv ? "Exportando..." : "Exportar CSV"}
              </button>
              <button type="button" className="secondary-button" onClick={() => triggerExport("pdf")} disabled={exportingCsv || exportingPdf || loading}>
                <FiFileText /> {exportingPdf ? "Exportando..." : "Exportar PDF"}
              </button>
              <div className="select-with-icon compact">
                <FiSliders />
                <select value={`${sortBy}-${sortDir}`} onChange={(e) => {
                  const [nextBy, nextDir] = e.target.value.split("-") as ["data" | "instalacao" | "gerencia", "asc" | "desc"];
                  setSortBy(nextBy);
                  setSortDir(nextDir);
                }}>
                  <option value="data-desc">Data (mais recente)</option>
                  <option value="data-asc">Data (mais antiga)</option>
                  <option value="instalacao-asc">Instalação (A-Z)</option>
                  <option value="gerencia-asc">Gerência (A-Z)</option>
                </select>
              </div>
              <span className="table-count">{filteredRecords.length} resultados</span>
            </div>
          </div>

          <table className="modern-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Instalação</th>
                <th>Sistema</th>
                <th>Equipamento</th>
                <th>Gerência</th>
                <th>Data</th>
                <th>Situação Identificada</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Data de Criação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagedRecords.map((item, index) => (
                <tr key={item.id}>
                  <td className="row-index">#{(safePage - 1) * pageSize + index + 1}</td>
                  <td>{item.instalacao}</td>
                  <td>{item.sistema}</td>
                  <td>{item.equipamento}</td>
                  <td>{item.gerencia}</td>
                  <td>{item.data}</td>
                  <td>{item.situacao_identificada}</td>
                  <td><span className={statusClass(item.status)}>{item.status || "Em análise"}</span></td>
                  <td>{item.usuario_criacao}</td>
                  <td>{item.data_criacao}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="secondary-button" onClick={() => setConfirmEditRecord(item)}>
                        <FiEdit3 /> Editar
                      </button>
                      <button type="button" className="secondary-button" onClick={() => setViewingRecord(item)}>
                        <FiEye /> Visualizar
                      </button>
                      {canDelete && (
                        <button type="button" className="danger-button" onClick={() => deleteRecord(item.id)}>
                          <FiTrash2 /> Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!pagedRecords.length && (
                <tr>
                  <td colSpan={11} className="empty-table">Nenhum registro encontrado para os filtros aplicados.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="table-pagination">
            <button type="button" className="secondary-button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <FiChevronLeft /> Anterior
            </button>
            <span>Página {safePage} de {totalPages}</span>
            <button type="button" className="secondary-button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Próxima <FiChevronRight />
            </button>
          </div>
        </div>
      )}

      {confirmEditRecord && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Você deseja editar este registro?</h3>
            <p>Todas as alterações serão registradas na auditoria.</p>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setConfirmEditRecord(null)}>Cancelar</button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  const id = confirmEditRecord.id;
                  setConfirmEditRecord(null);
                  navigate(`/?editId=${id}`);
                }}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingRecord && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setViewingRecord(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <h3>Visualização do Registro #{viewingRecord.id}</h3>
              <button type="button" className="icon-button" onClick={() => setViewingRecord(null)}><FiX /></button>
            </div>
            <div className="modal-detail-grid">
              <div><strong>Instalação:</strong> {viewingRecord.instalacao}</div>
              <div><strong>Sistema:</strong> {viewingRecord.sistema}</div>
              <div><strong>Equipamento:</strong> {viewingRecord.equipamento}</div>
              <div><strong>Gerência:</strong> {viewingRecord.gerencia}</div>
              <div><strong>Data:</strong> {viewingRecord.data}</div>
              <div><strong>Status:</strong> {viewingRecord.status || "Em análise"}</div>
              <div><strong>Responsável:</strong> {viewingRecord.usuario_criacao}</div>
              <div><strong>Criação:</strong> {viewingRecord.data_criacao}</div>
              <div className="modal-detail-wide"><strong>Situação Identificada:</strong> {viewingRecord.situacao_identificada}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
