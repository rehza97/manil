"""Simple script to call the first 10 API endpoints defined in test_api.json.

Usage:
    BASE_URL=http://localhost:8000 python -m backend.scripts.test_openapi_first_10

Notes:
    - Reads the OpenAPI spec from the project root `test_api.json`.
    - Calls the first 10 (path, method) combinations in the `paths` section.
    - For endpoints that require a request body, it sends an empty JSON object by default.
      You can extend `get_sample_body` to provide better payloads per schema/endpoint.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import requests


ROOT_DIR = Path(__file__).resolve().parents[2]
SPEC_PATH = ROOT_DIR / "test_api.json"


def load_openapi_spec() -> Dict[str, Any]:
    """Load the OpenAPI spec from `test_api.json`."""
    with SPEC_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def iter_endpoints(spec: Dict[str, Any]) -> Iterable[Tuple[str, str, Dict[str, Any]]]:
    """Yield (path, method, operation) tuples from the OpenAPI spec in a stable order."""
    paths = spec.get("paths", {})

    # Preserve insertion order of paths and methods (dicts are ordered in Python 3.7+)
    for path, methods in paths.items():
        for method, operation in methods.items():
            # Method keys should be lowercase HTTP verbs in OpenAPI
            if method.lower() in {"get", "post", "put", "patch", "delete"}:
                yield path, method.lower(), operation


def get_sample_body(operation: Dict[str, Any]) -> Dict[str, Any]:
    """Return a basic request body payload for operations that require a body.

    Currently this is a placeholder that returns an empty dict for any JSON body.
    You can extend this function to inspect `requestBody` schema and generate
    more realistic sample data.
    """
    request_body = operation.get("requestBody")
    if not request_body:
        return {}

    content = request_body.get("content", {})
    if "application/json" in content:
        # TODO: Generate better payloads based on `content['application/json']['schema']`
        return {}

    return {}


def call_endpoint(base_url: str, path: str, method: str, operation: Dict[str, Any]) -> None:
    """Call a single endpoint and print the result."""
    url = base_url.rstrip("/") + path

    headers: Dict[str, str] = {
        "Accept": "application/json",
    }

    # Allow overriding Authorization via env var if needed
    auth_token = os.getenv("API_AUTH_TOKEN")
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    json_body: Dict[str, Any] | None = None
    if operation.get("requestBody"):
        json_body = get_sample_body(operation)

    print("=" * 80)
    print(f"{method.upper()} {url}")

    try:
        response = requests.request(method=method, url=url, headers=headers, json=json_body, timeout=10)
        print(f"Status: {response.status_code}")

        # Try to pretty-print JSON if possible, otherwise show text
        try:
            data = response.json()
            print("Response JSON:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        except ValueError:
            print("Response Text:")
            print(response.text)

    except Exception as exc:  # noqa: BLE001
        print(f"ERROR calling endpoint: {exc}")


def main() -> None:
    base_url = os.getenv("BASE_URL", "http://localhost:8000")
    print(f"Using BASE_URL={base_url}")

    spec = load_openapi_spec()
    endpoints: List[Tuple[str, str, Dict[str, Any]]] = list(iter_endpoints(spec))

    first_10 = endpoints[:10]
    print(f"Found {len(endpoints)} endpoints in spec, testing first {len(first_10)}.\n")

    for idx, (path, method, operation) in enumerate(first_10, start=1):
        print(f"\n--- Endpoint {idx}/{len(first_10)} ---")
        call_endpoint(base_url, path, method, operation)


if __name__ == "__main__":
    main()


