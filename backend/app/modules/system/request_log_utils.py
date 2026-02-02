"""
Helpers for API request logging (performance metrics).
Normalizes paths so /api/v1/customers/abc-123 becomes /api/v1/customers/{id}.
"""
import re

# UUID-like: 8-4-4-4-12 hex, or plain 32 hex
UUID_PATTERN = re.compile(
    r"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|[0-9a-fA-F]{32})$"
)


def normalize_request_path(path: str) -> str:
    """
    Replace UUID-like path segments with {id} for aggregation.

    Example: /api/v1/customers/abc-123-def -> /api/v1/customers/{id}
    """
    if not path or not path.startswith("/"):
        return path
    parts = path.rstrip("/").split("/")
    out = []
    for part in parts:
        if part and UUID_PATTERN.match(part):
            out.append("{id}")
        else:
            out.append(part)
    return "/".join(out) if out else path
