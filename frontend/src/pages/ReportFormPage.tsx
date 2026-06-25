import { useState } from "react";
import api, { getApiErrorMessage } from "../api";

const initialState = {
  instalacao: "",
  sistema: "",
  equipamento: "",
  data: "",
  gerencia: "",
  situacao_identificada: "",
};

function ReportFormPage() {
  const [formState, setFormState] = useState(initialState);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    if (formState.situacao_identificada.trim().length < 50) {
      newErrors.situacao_identificada = "Mínimo de 50 caracteres.";
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
      return;
    }

    setLoading(true);
    try {
      await api.post("/reports", formState);
      setSuccess(true);
      setMessage("Registro salvo com sucesso.");
      setFormState(initialState);
    } catch (err) {
      setSuccess(false);
      setMessage(getApiErrorMessage(err, "Falha ao salvar registro."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Nova Ordem de Serviço</h1>
      </header>
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Instalação</label>
            <input name="instalacao" value={formState.instalacao} onChange={handleChange} required />
            {errors.instalacao && <span className="field-error">{errors.instalacao}</span>}
          </div>

          <div className="form-field">
            <label>Sistema</label>
            <input name="sistema" value={formState.sistema} onChange={handleChange} required />
            {errors.sistema && <span className="field-error">{errors.sistema}</span>}
          </div>

          <div className="form-field">
            <label>Equipamento</label>
            <input name="equipamento" value={formState.equipamento} onChange={handleChange} required />
            {errors.equipamento && <span className="field-error">{errors.equipamento}</span>}
          </div>

          <div className="form-field">
            <label>Data</label>
            <input type="date" name="data" value={formState.data} onChange={handleChange} required />
            {errors.data && <span className="field-error">{errors.data}</span>}
          </div>

          <div className="form-field">
            <label>Gerência</label>
            <input name="gerencia" value={formState.gerencia} onChange={handleChange} required />
            {errors.gerencia && <span className="field-error">{errors.gerencia}</span>}
          </div>

          <div className="form-field">
            <label>Situação Identificada</label>
            <textarea
              name="situacao_identificada"
              rows={15}
              value={formState.situacao_identificada}
              onChange={handleChange}
              required
              placeholder="Descreva em no mínimo 50 caracteres..."
            />
            {errors.situacao_identificada && <span className="field-error">{errors.situacao_identificada}</span>}
          </div>

          <div className="button-row">
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </button>
            <button type="reset" className="secondary-button" disabled={loading} onClick={() => setFormState(initialState)}>
              Limpar
            </button>
          </div>
        </form>
        {message && <div className={success ? "form-message" : "form-error"}>{message}</div>}
      </div>
    </div>
  );
}

export default ReportFormPage;
