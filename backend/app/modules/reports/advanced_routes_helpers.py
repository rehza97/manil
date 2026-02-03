"""
Helpers for advanced report routes: build charts, generate PDF/Excel/CSV, return FileResponse.
"""

from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from .chart_service import ChartService
from .report_factory import ReportFactory
from .excel_advanced_service import AdvancedExcelService
from .export_service import ExportService


async def generate_report_response(
    db: AsyncSession,
    data: Dict[str, Any],
    template: str,
    report_title: str,
    format: str,
    filename_base: str,
    charts: Optional[List[Dict[str, str]]] = None,
    export_details_key: str = "details",
    generated_by: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> FileResponse:
    """
    Generate report in PDF, Excel, or CSV and return FileResponse.
    charts: list of {title, image_base64}.
    start_date/end_date: optional datetimes to inject for PDF period when missing in data.
    """
    factory = ReportFactory(db)
    if format == "pdf":
        payload = {**data, "report_title": report_title}
        if start_date is not None and payload.get("start_date") is None:
            payload["start_date"] = start_date
        if end_date is not None and payload.get("end_date") is None:
            payload["end_date"] = end_date
        if template == "reports/base_report.html" and "headers" not in payload and "data" not in payload:
            details_list = payload.get("details") or payload.get(export_details_key) or []
            if details_list and all(isinstance(x, dict) for x in details_list):
                headers = list(details_list[0].keys())
                payload["headers"] = headers
                # List-of-lists so template uses sequence branch and renders actual cell values
                payload["data"] = [
                    [str(row.get(h, "")) for h in headers]
                    for row in details_list
                ]
        file_path = await factory.generate_pdf(
            template=template,
            data=payload,
            charts=charts,
            generated_by=generated_by,
        )
        return FileResponse(file_path, filename=f"{filename_base}.pdf", media_type="application/pdf")
    if format == "excel":
        excel_svc = AdvancedExcelService()
        skip_keys = ("details", "aging_buckets", "by_status", "raw", "agents",
                     "revenue_trend", "trends", "forecast_monthly", "inactive_customer_ids")
        summary = {k: v for k, v in data.items() if k not in skip_keys and not callable(
            v) and not isinstance(v, (list, dict))}
        if "aging_buckets" in data:
            summary["total_outstanding"] = data.get("total_outstanding", 0)
            summary["total_invoices"] = data.get("total_invoices", 0)
        report_data = {
            "summary": summary,
            "details": data.get(export_details_key) or data.get("aging_buckets") or data.get("by_status") or [],
            "raw": data.get("details") or data.get(export_details_key) or [],
        }
        file_path = excel_svc.create_multi_sheet_report(
            report_data, filename_base)
        return FileResponse(file_path, filename=f"{filename_base}.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    export_svc = ExportService()
    rows = data.get(export_details_key) or data.get(
        "details") or data.get("aging_buckets") or data.get("by_status") or []
    if not rows and isinstance(data.get("details"), list):
        rows = data["details"]
    rows = rows if isinstance(rows, list) else []
    if not rows:
        rows = [{"info": "No data available for this report"}]
    result = export_svc.export_to_csv(rows, filename_base)
    return FileResponse(result["file_path"], filename=result["file_name"], media_type="text/csv")
