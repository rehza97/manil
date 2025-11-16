"""Generate one runnable Python file per endpoint from the OpenAPI spec.

This generates files for the FIRST 10 endpoints only (as requested) into:
    backend/scripts/endpoints_first10/

Each generated file can be executed directly:
    BASE_URL=http://localhost:8000 python backend/scripts/endpoints_first10/001_GET__health.py

Global config via env:
    - BASE_URL (default http://localhost:8000)
    - API_AUTH_TOKEN (optional Bearer token)
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple


ROOT_DIR = Path(__file__).resolve().parents[2]
SPEC_PATH = ROOT_DIR / "test_api.json"
OUTPUT_DIR = ROOT_DIR / "backend" / "scripts" / "endpoints_first10"


def load_openapi_spec() -> Dict[str, Any]:
    with SPEC_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def iter_endpoints(spec: Dict[str, Any]) -> Iterable[Tuple[str, str, Dict[str, Any]]]:
    paths = spec.get("paths", {})
    for path, methods in paths.items():
        for method, operation in methods.items():
            if method.lower() in {"get", "post", "put", "patch", "delete"}:
                yield path, method.lower(), operation


def sanitize_filename(path: str) -> str:
    # Turn "/api/v1/auth/login" into "_api_v1_auth_login"
    safe = path.replace("/", "_")
    # Replace path params like {id}
    safe = safe.replace("{", "").replace("}", "")
    # Avoid overly long names by trimming to last 6 segments if needed
    parts = [p for p in safe.split("_") if p]
    if len(parts) > 8:
        parts = parts[:2] + ["__"] + parts[-5:]
    return "_".join(parts) if parts else "root"


def build_file_contents(method: str, path: str, needs_body: bool) -> str:
    method_upper = method.upper()
    filename_hint = sanitize_filename(path)
    return f'''"""Auto-generated endpoint caller for {method_upper} {path}.

Usage:
    BASE_URL=http://localhost:8000 python -m backend.scripts.endpoints_first10.XXX
Or:
    BASE_URL=http://localhost:8000 python backend/scripts/endpoints_first10/XXX.py
"""
from __future__ import annotations
import json
import os
import sys
import requests


def main() -> int:
    base_url = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")
    url = f"{{base_url}}{path}"
    headers = {{"Accept": "application/json"}}
    token = os.getenv("API_AUTH_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {{token}}"

    json_body = {{}}
    {"payload = json_body" if needs_body else "payload = None"}

    print("=" * 80)
    print("{method_upper} {path}")
    try:
        resp = requests.request("{method}", url, headers=headers, json=payload, timeout=10)
        print(f"Status: {{resp.status_code}}")
        try:
            data = resp.json()
            print("Response JSON:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        except ValueError:
            print("Response Text:")
            print(resp.text)
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {{exc}}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
'''.replace("{path}", path).replace("{method_upper}", method_upper).replace("{method}", method).replace("{filename_hint}", filename_hint)


def generate() -> None:
    spec = load_openapi_spec()
    endpoints: List[Tuple[str, str, Dict[str, Any]]] = list(iter_endpoints(spec))
    first_10 = endpoints[:10]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for idx, (path, method, operation) in enumerate(first_10, start=1):
        needs_body = bool(operation.get("requestBody"))
        name_core = f"{method.upper()}_{sanitize_filename(path)}"
        filename = f"{idx:03d}_{name_core}.py"
        target = OUTPUT_DIR / filename
        content = build_file_contents(method, path, needs_body)
        target.write_text(content, encoding="utf-8")
        print(f"Generated: {target}")


if __name__ == "__main__":
    generate()


