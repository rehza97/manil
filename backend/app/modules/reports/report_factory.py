"""
Report Factory

Centralized PDF generation with cache, HTMLPDFService, and optional ReportHistory.
Registers report Jinja filters on HTMLPDFService env when generating.
"""

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.invoices.html_pdf_service import get_html_pdf_service
from app.config.settings import get_settings
from .cache_service import ReportCacheService
from .template_service import get_report_filters


class ReportFactory:
    """Generate report PDFs with caching and optional history."""

    CACHE_TTL = 3600

    def __init__(self, db: AsyncSession):
        self.db = db
        self._cache = ReportCacheService()
        settings = get_settings()
        storage_base = Path(settings.STORAGE_PATH).resolve()
        self.output_base = storage_base / "pdfs" / "reports"
        self.output_base.mkdir(parents=True, exist_ok=True)

    async def _record_history(
        self,
        report_type: str,
        report_name: str,
        format: str,
        parameters: Optional[Dict[str, Any]],
        file_path: str,
        generated_by: str,
    ) -> None:
        """Optionally persist report generation to ReportHistory (uses request transaction)."""
        try:
            from .models import ReportHistory

            rec = ReportHistory(
                report_type=report_type,
                report_name=report_name,
                format=format,
                parameters=parameters,
                file_path=file_path,
                file_size=os.path.getsize(
                    file_path) if os.path.isfile(file_path) else None,
                generated_by=generated_by,
                status="completed",
            )
            self.db.add(rec)
            await self.db.flush()
        except Exception:
            pass

    def _generate_cache_key(self, template: str, data: Dict[str, Any]) -> str:
        """Hash template + serializable data for cache key."""
        payload = json.dumps(
            {"template": template, "data_keys": sorted(data.keys())}, sort_keys=True)
        return hashlib.sha256(payload.encode()).hexdigest()[:32]

    async def generate_pdf(
        self,
        template: str,
        data: Dict[str, Any],
        charts: Optional[List[Dict[str, str]]] = None,
        report_type: str = "advanced",
        generated_by: Optional[str] = None,
    ) -> str:
        """
        Generate PDF from template. Check cache first; on miss render and cache.
        charts: list of {title, image_base64}.
        Returns file path.
        """
        cache_key = f"{report_type}:{template}:{self._generate_cache_key(template, data)}"
        cached = await self._cache.get_report(cache_key)
        if cached and os.path.isfile(cached):
            return cached
        pdf_service = get_html_pdf_service()
        pdf_service.env.filters.update(get_report_filters())
        context = {**data, "charts": charts or [],
                   "company": getattr(pdf_service, "company", {})}
        context.setdefault("generated_at", datetime.now(
            timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))
        if "start_date" in data and hasattr(data["start_date"], "strftime"):
            context["start_date"] = data["start_date"].strftime("%Y-%m-%d")
        if "end_date" in data and hasattr(data["end_date"], "strftime"):
            context["end_date"] = data["end_date"].strftime("%Y-%m-%d")
        out_name = f"report_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.pdf"
        file_path = pdf_service.generate_custom_pdf(
            template_name=template,
            context=context,
            output_filename=out_name,
            output_subdir="reports",
        )
        if not file_path or not os.path.isfile(file_path):
            raise RuntimeError("PDF generation failed")
        await self._cache.set_report(cache_key, file_path, ttl=self.CACHE_TTL)
        if generated_by:
            await self._record_history(
                report_type=report_type,
                report_name=template,
                format="pdf",
                parameters={"template": template},
                file_path=file_path,
                generated_by=generated_by,
            )
        return file_path
