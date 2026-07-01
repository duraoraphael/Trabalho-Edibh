import mimetypes
import smtplib
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from email import encoders
from pathlib import Path
from typing import Optional

from app.config import settings


def send_email(
    to: list[str],
    subject: str,
    body_html: str,
    cc: Optional[list[str]] = None,
    attachments: Optional[list[Path]] = None,
    sender_name: Optional[str] = None,
    sender_email: Optional[str] = None,
) -> None:
    cc = cc or []
    attachments = attachments or []
    display_name = sender_name or "Sistema CIM"

    if settings.RESEND_API_KEY:
        _send_via_resend(to, cc, subject, body_html, attachments, display_name, sender_email)
    elif settings.SMTP_HOST:
        _send_via_smtp(to, cc, subject, body_html, attachments, display_name, sender_email)
    else:
        raise RuntimeError(
            "Nenhum provedor de e-mail configurado. "
            "Defina RESEND_API_KEY ou SMTP_HOST no .env."
        )


def _send_via_resend(
    to: list[str],
    cc: list[str],
    subject: str,
    body_html: str,
    attachments: list[Path],
    display_name: str,
    reply_to_email: Optional[str],
) -> None:
    import resend

    resend.api_key = settings.RESEND_API_KEY
    from_addr = settings.RESEND_FROM or "onboarding@resend.dev"

    params: dict = {
        "from": f"{display_name} <{from_addr}>",
        "to": to,
        "subject": subject,
        "html": body_html,
    }
    if cc:
        params["cc"] = cc
    if reply_to_email:
        params["reply_to"] = reply_to_email
    if attachments:
        import base64
        params["attachments"] = [
            {
                "filename": p.name,
                "content": base64.b64encode(p.read_bytes()).decode(),
            }
            for p in attachments if p.exists()
        ]

    resend.Emails.send(params)


def _send_via_smtp(
    to: list[str],
    cc: list[str],
    subject: str,
    body_html: str,
    attachments: list[Path],
    display_name: str,
    reply_to_email: Optional[str],
) -> None:
    smtp_from = settings.SMTP_FROM or settings.SMTP_USER

    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = formataddr((display_name, smtp_from))
    msg["To"] = ", ".join(to)
    if cc:
        msg["Cc"] = ", ".join(cc)
    if reply_to_email:
        msg["Reply-To"] = formataddr((display_name, reply_to_email))

    msg.attach(MIMEText(body_html, "html", "utf-8"))

    for path in attachments:
        if not path.exists():
            continue
        mime_type, _ = mimetypes.guess_type(str(path))
        main_type, sub_type = (mime_type or "application/octet-stream").split("/", 1)
        part = MIMEBase(main_type, sub_type)
        part.set_payload(path.read_bytes())
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", "attachment", filename=path.name)
        msg.attach(part)

    all_recipients = to + cc
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
        if settings.SMTP_TLS:
            server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(smtp_from, all_recipients, msg.as_string())


def build_report_email_html(record: dict) -> str:
    def row(label: str, value: str, highlight: bool = False) -> str:
        bg = "#f4f7fb" if not highlight else "#e8f5ef"
        return f"""
        <tr>
          <td style="padding:10px 14px;font-weight:600;color:#374151;background:{bg};
                     border-bottom:1px solid #e5e7eb;width:38%;vertical-align:top">{label}</td>
          <td style="padding:10px 14px;color:#111827;background:#ffffff;
                     border-bottom:1px solid #e5e7eb;white-space:pre-wrap">{value or "—"}</td>
        </tr>"""

    status = record.get("status") or "Em análise"
    status_colors = {
        "aprovado":   ("#c6efce", "#276221"),
        "reprovado":  ("#ffcccc", "#9c0006"),
        "pendente":   ("#ffeb9c", "#9c6500"),
        "em análise": ("#ddeeff", "#1f4e79"),
    }
    sc = status_colors.get(status.lower(), ("#e5e7eb", "#374151"))

    custom_rows = ""
    for k, v in (record.get("custom_fields") or {}).items():
        custom_rows += row(k, str(v))

    return f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:32px 0">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;
                    box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:640px;width:100%">
        <tr>
          <td colspan="2"
              style="background:linear-gradient(120deg,#0b6e4f,#13835f);padding:28px 24px">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:1px;
                      text-transform:uppercase">Registro Técnico</p>
            <h1 style="margin:6px 0 0;color:#fff;font-size:22px">
              #{record.get("id")} — {record.get("instalacao") or ""}
            </h1>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding:14px 24px;background:#f8fafc;
                                  border-bottom:1px solid #e5e7eb">
            <span style="display:inline-block;padding:4px 16px;border-radius:20px;
                         font-size:13px;font-weight:700;
                         background:{sc[0]};color:{sc[1]}">
              Status: {status}
            </span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding:16px 24px 6px">
            <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;
                      letter-spacing:0.8px;text-transform:uppercase">Informações Gerais</p>
          </td>
        </tr>
        <tr><td colspan="2">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb">
            {row("Instalação",          record.get("instalacao"))}
            {row("Sistema",             record.get("sistema"))}
            {row("Equipamento",         record.get("equipamento"))}
            {row("Gerência",            record.get("gerencia"))}
            {row("Data",                record.get("data"))}
            {row("Responsável",         record.get("usuario_criacao"))}
            {row("Data de Criação",     record.get("data_criacao"))}
            {row("Situação Identificada", record.get("situacao_identificada"), highlight=True)}
            {custom_rows}
          </table>
        </td></tr>
        <tr>
          <td colspan="2"
              style="background:#f4f7fb;padding:16px 24px;text-align:center;
                     color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb">
            Enviado pelo sistema CIM — Fluxo de Equipamentos
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
