from io import BytesIO
from datetime import datetime
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, Spacer, SimpleDocTemplate, Table, TableStyle
from reportlab.lib import colors
from typing import List
from app.config import settings


class PDFService:
    def _resolve_logo_path(self) -> Path | None:
        candidates = [
            settings.PROJECT_ROOT / "frontend" / "public" / "Imagens" / "logo engenharia.png",
            settings.PROJECT_ROOT / "frontend" / "public" / "Imagens" / "Principal_h_cor_RGB.jpg",
        ]
        for candidate in candidates:
            if candidate.exists():
                return candidate
        return None

    def _header_footer(self, title: str, user: str, generated_at: str):
        logo_path = self._resolve_logo_path()

        def _draw(canvas, doc):
            canvas.saveState()
            if logo_path:
                canvas.drawImage(str(logo_path), 2 * cm, A4[1] - 2.3 * cm, width=2.6 * cm, height=0.8 * cm, preserveAspectRatio=True, mask="auto")

            canvas.setFont("Helvetica-Bold", 11)
            canvas.setFillColor(colors.HexColor("#0B6E4F"))
            canvas.drawString(4.9 * cm, A4[1] - 1.5 * cm, "Fluxo de Equipamentos")
            canvas.setFont("Helvetica", 9)
            canvas.setFillColor(colors.HexColor("#475569"))
            canvas.drawString(4.9 * cm, A4[1] - 2.0 * cm, title)
            canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1.5 * cm, f"Exportado em: {generated_at[:19].replace('T', ' ')}")

            canvas.setStrokeColor(colors.HexColor("#D8E1EA"))
            canvas.line(2 * cm, 1.8 * cm, A4[0] - 2 * cm, 1.8 * cm)
            canvas.setFont("Helvetica", 8)
            canvas.setFillColor(colors.HexColor("#64748B"))
            canvas.drawString(2 * cm, 1.3 * cm, f"Usuário responsável: {user or 'N/A'}")
            canvas.drawRightString(A4[0] - 2 * cm, 1.3 * cm, f"Página {canvas.getPageNumber()}")
            canvas.restoreState()

        return _draw

    def generate_report_pdf(self, report: dict, evidences: List[dict]) -> bytes:
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2 * cm, leftMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm)
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph("<b>Relatório Técnico</b>", styles["Title"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"<b>Responsável:</b> {report.get('UsuarioCriacao', '')}", styles["Normal"]))
        story.append(Paragraph(f"<b>Data de emissão:</b> {report.get('DataCriacao', '')}" , styles["Normal"]))
        story.append(Spacer(1, 14))

        fields = [
            ["Instalação", report.get("Instalacao", "")],
            ["Sistema", report.get("Sistema", "")],
            ["Equipamento", report.get("Equipamento", "")],
            ["Gerência", report.get("Gerencia", "")],
            ["Data", report.get("Data", "")],
            ["Situação Identificada", report.get("SituacaoIdentificada", "")],
        ]
        table = Table(fields, colWidths=[5 * cm, 10 * cm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B6E4F")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.gray),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.gray),
        ]))
        story.append(table)
        story.append(Spacer(1, 18))

        story.append(Paragraph("<b>Evidências</b>", styles["Heading2"]))
        if not evidences:
            story.append(Paragraph("Sem evidências vinculadas.", styles["Normal"]))
        for evidence in evidences[:20]:
            display_name = evidence.get("name", "arquivo")
            display_url = evidence.get("web_url", "")
            size = evidence.get("size_bytes")
            size_text = f" - {round(size / 1024, 1)} KB" if isinstance(size, (int, float)) else ""
            story.append(Paragraph(f"• {display_name}{size_text}", styles["Normal"]))
            if display_url:
                story.append(Paragraph(display_url, styles["Normal"]))
            story.append(Spacer(1, 8))

        story.append(Spacer(1, 24))
        story.append(Paragraph(f"Responsável: {report.get('UsuarioCriacao', '')}", styles["Normal"]))
        story.append(Paragraph(f"Data de geração: {report.get('DataAlteracao', report.get('DataCriacao', ''))}", styles["Normal"]))

        doc.build(story)
        buffer.seek(0)
        return buffer.read()

    def generate_history_pdf(self, records: List[dict], exported_by: str, generated_at: str) -> bytes:
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5 * cm,
            leftMargin=1.5 * cm,
            topMargin=3.0 * cm,
            bottomMargin=2.2 * cm,
        )
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph("<b>Relatório de Histórico de Registros</b>", styles["Title"]))
        story.append(Spacer(1, 10))

        if not records:
            story.append(Paragraph("Nenhum registro encontrado para os filtros aplicados.", styles["Normal"]))
        else:
            rows = [[
                "Instalação",
                "Sistema",
                "Equipamento",
                "Data",
                "Gerência",
                "Situação",
                "Responsável",
                "Criação",
                "Evidências",
            ]]

            for item in records:
                evidence_count = len(item.get("evidencias") or [])
                rows.append(
                    [
                        item.get("instalacao", ""),
                        item.get("sistema", ""),
                        item.get("equipamento", ""),
                        item.get("data", ""),
                        item.get("gerencia", ""),
                        item.get("situacao_identificada", ""),
                        item.get("usuario_criacao", ""),
                        item.get("data_criacao", ""),
                        f"{evidence_count} arquivo(s)" if evidence_count else "Sem evidências",
                    ]
                )

            table = Table(
                rows,
                colWidths=[2.2 * cm, 2.2 * cm, 2.2 * cm, 1.6 * cm, 2.0 * cm, 4.1 * cm, 2.2 * cm, 2.3 * cm, 2.0 * cm],
                repeatRows=1,
            )
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B6E4F")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 8),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                    ]
                )
            )
            story.append(table)

        footer_cb = self._header_footer("Relatório Profissional de Histórico", exported_by, generated_at)
        doc.build(story, onFirstPage=footer_cb, onLaterPages=footer_cb)
        buffer.seek(0)
        return buffer.read()
