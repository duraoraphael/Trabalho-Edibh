import json
from pathlib import Path
from typing import Any

BASE_PATH = Path(__file__).resolve().parent
USERS_PATH = BASE_PATH / "users.json"
REPORTS_PATH = BASE_PATH / "reports.json"

for path in (USERS_PATH, REPORTS_PATH):
    if not path.exists():
        path.write_text("[]", encoding="utf-8")


def read_json(path: Path) -> list[Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: list[Any]) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
