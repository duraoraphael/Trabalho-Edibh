from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Spacer, Image, SimpleDocTemplate, Table, TableStyle
from reportlab.lib import colors
from typing import List


class PDFService:
    def generate_report_pdf(self, report: dict, evidence_urls: List[str]) -> bytes:
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
        for url in evidence_urls[:8]:
            story.append(Paragraph(url, styles["Normal"]))
            story.append(Spacer(1, 8))

        story.append(Spacer(1, 24))
        story.append(Paragraph(f"Responsável: {report.get('UsuarioCriacao', '')}", styles["Normal"]))
        story.append(Paragraph(f"Data de geração: {report.get('DataAlteracao', report.get('DataCriacao', ''))}", styles["Normal"]))

        doc.build(story)
        buffer.seek(0)
        return buffer.read()
