"""Settings routes package."""
import importlib.util
import sys
from pathlib import Path

# Import router from parent routes.py file
parent_dir = Path(__file__).parent.parent
routes_file = parent_dir / "routes.py"

if routes_file.exists():
    spec = importlib.util.spec_from_file_location("settings_routes_module", routes_file)
    routes_module = importlib.util.module_from_spec(spec)
    sys.modules["settings_routes_module"] = routes_module
    spec.loader.exec_module(routes_module)
    router = routes_module.router
else:
    from fastapi import APIRouter
    router = APIRouter()  # Fallback empty router
