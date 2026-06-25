from fastapi import APIRouter, Depends
from collections import Counter, defaultdict
from datetime import datetime
from typing import List
from app.services.report_service import ReportService
from app.auth.dependencies import get_current_user

router = APIRouter()
service = ReportService()


def map_item(item: dict) -> dict:
    fields = item.get("fields", {})
    return {
        "gerencia": fields.get("Gerencia", ""),
        "sistema": fields.get("Sistema", ""),
        "equipamento": fields.get("Equipamento", ""),
        "usuario": fields.get("UsuarioCriacao", ""),
        "data": fields.get("Data", ""),
    }


@router.get("/summary")
def get_summary(user: dict = Depends(get_current_user)):
    raw = service.list_reports()
    items = raw.get("value", [])
    mapped = [map_item(item) for item in items]

    total_records = len(mapped)
    total_orders = total_records
    total_failures = total_records
    total_users = len({item["usuario"] for item in mapped if item["usuario"]})

    by_gerencia = Counter(item["gerencia"] for item in mapped if item["gerencia"])
    by_sistema = Counter(item["sistema"] for item in mapped if item["sistema"])
    by_equipamento = Counter(item["equipamento"] for item in mapped if item["equipamento"])
    by_usuario = Counter(item["usuario"] for item in mapped if item["usuario"])

    monthly = defaultdict(int)
    for item in mapped:
        try:
            month_key = datetime.fromisoformat(item["data"]).strftime("%Y-%m")
            monthly[month_key] += 1
        except Exception:
            continue

    return {
        "total_records": total_records,
        "total_orders": total_orders,
        "total_failures": total_failures,
        "total_users": total_users,
        "records_by_gerencia": by_gerencia,
        "records_by_sistema": by_sistema,
        "records_by_equipamento": by_equipamento,
        "records_by_user": by_usuario,
        "monthly_evolution": dict(monthly),
    }


@router.get("/executive")
def get_executive_dashboard(user: dict = Depends(get_current_user)):
    raw = service.list_reports()
    items = raw.get("value", [])
    mapped = [map_item(item) for item in items]

    total_open = len([item for item in mapped])
    total_closed = 0
    avg_resolution = "N/A"
    top_equipments = Counter(item["equipamento"] for item in mapped if item["equipamento"]).most_common(5)
    top_systems = Counter(item["sistema"] for item in mapped if item["sistema"]).most_common(5)
    top_gerencias = Counter(item["gerencia"] for item in mapped if item["gerencia"]).most_common(5)
    top_operators = Counter(item["usuario"] for item in mapped if item["usuario"]).most_common(5)

    return {
        "total_os_abertas": total_open,
        "total_os_encerradas": total_closed,
        "tempo_medio_resolucao": avg_resolution,
        "equipamentos_com_mais_ocorrencias": top_equipments,
        "sistemas_com_mais_falhas": top_systems,
        "ranking_gerencias": top_gerencias,
        "ranking_operadores": top_operators,
    }
