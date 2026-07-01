from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse
from app.services.export_service import ExportService
import logging

logger = logging.getLogger("prompt_master")

router = APIRouter()

@router.get("/json", tags=["exports"])
def export_all_data_json():
    """Exporta todos os dados em JSON e retorna o arquivo"""
    try:
        export_service = ExportService()
        filepath = export_service.export_all_data_json()
        
        return FileResponse(
            path=filepath,
            media_type="application/json",
            filename=filepath.name
        )
    except Exception as e:
        logger.error(f"Erro ao exportar dados: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Erro ao exportar dados: {str(e)}"}
        )

@router.get("/list", tags=["exports"])
def list_exports():
    """Lista todos os arquivos de exportação disponíveis"""
    try:
        export_service = ExportService()
        exports = export_service.list_exports()
        
        return {
            "count": len(exports),
            "exports": exports,
            "export_folder": str(export_service.export_dir)
        }
    except Exception as e:
        logger.error(f"Erro ao listar exports: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Erro ao listar exports: {str(e)}"}
        )
    
@router.get("/download/{filename}", tags=["exports"])
def download_export(filename: str):
    """Baixa um arquivo de exportação específico"""
    try:
        export_service = ExportService()
        filepath = export_service.get_export_path(filename).resolve()
        export_root = export_service.export_dir.resolve()
        
        # Verifica se o arquivo existe e está na pasta de exports
        if export_root not in filepath.parents or not filepath.exists() or not filepath.is_file():
            return JSONResponse(
                status_code=404,
                content={"error": "Arquivo não encontrado"}
            )
        
        return FileResponse(
            path=filepath,
            media_type="application/json",
            filename=filepath.name
        )
    except Exception as e:
        logger.error(f"Erro ao baixar export: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Erro ao baixar export: {str(e)}"}
        )
