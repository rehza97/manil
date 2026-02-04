"""
Helpers for advanced report routes: build charts, generate PDF/Excel/CSV/JSON, return FileResponse or JSON.
"""

from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Union

from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from .chart_service import ChartService
from .report_factory import ReportFactory
from .excel_advanced_service import AdvancedExcelService
from .export_service import ExportService
from .preview_builder import ReportPreviewBuilder
from .schemas import ReportPreviewData


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
    report_type: Optional[str] = None,
    description: Optional[str] = None,
) -> Union[FileResponse, ReportPreviewData]:
    """
    Generate report in PDF, Excel, CSV, or JSON and return FileResponse or ReportPreviewData.
    charts: list of {title, image_base64}.
    start_date/end_date: optional datetimes to inject for PDF period when missing in data.

    If format == "json", returns ReportPreviewData with charts and tables for live preview.
    """
    # Handle JSON format (preview data)
    if format == "json":
        return await build_report_preview(
            data=data,
            report_title=report_title,
            report_type=report_type or filename_base,
            description=description,
            start_date=start_date,
            end_date=end_date,
            generated_by=generated_by,
            export_details_key=export_details_key,
        )

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


async def build_report_preview(
    data: Dict[str, Any],
    report_title: str,
    report_type: str,
    description: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    generated_by: Optional[str] = None,
    export_details_key: str = "details",
) -> ReportPreviewData:
    """
    Build ReportPreviewData from report data for live preview.

    Automatically detects data structure and creates appropriate charts and tables.
    """
    builder = ReportPreviewBuilder(
        report_type=report_type,
        report_name=report_title,
        description=description,
    )

    # Set date range
    if start_date or end_date:
        period_label = _format_period_label(start_date, end_date)
        builder.set_date_range(start_date, end_date, period_label)

    # Add summary statistics from top-level metrics
    _add_summary_stats(builder, data)

    # Get detail rows
    details = data.get(export_details_key) or data.get("aging_buckets") or data.get("by_status") or data.get("details") or []

    if details and isinstance(details, list) and len(details) > 0:
        # Add charts based on data structure
        _add_charts_from_data(builder, report_title, details, data)

        # Add table
        _add_table_from_data(builder, report_title, details)

    # Set total records
    if details:
        builder.set_total_records(len(details))

    return builder.build(generated_by=generated_by)


def _format_period_label(start_date: Optional[datetime], end_date: Optional[datetime]) -> str:
    """Format date range as human-readable label."""
    if not start_date and not end_date:
        return "All Time"
    if start_date and end_date:
        return f"{start_date.strftime('%b %d, %Y')} - {end_date.strftime('%b %d, %Y')}"
    if start_date:
        return f"Since {start_date.strftime('%b %d, %Y')}"
    return f"Until {end_date.strftime('%b %d, %Y')}"


def _humanize_key(key: str) -> str:
    """Turn snake_case key into title label (e.g. total_quotes -> Total Quotes)."""
    return key.replace("_", " ").title()


def _add_summary_stats(builder: ReportPreviewBuilder, data: Dict[str, Any]):
    """Add summary statistics from top-level data."""
    # Common summary fields to extract (expanded for sales, churn, etc.)
    summary_fields = {
        "total": ("Total", "number"),
        "total_count": ("Total Count", "number"),
        "total_amount": ("Total Amount", "currency"),
        "total_outstanding": ("Total Outstanding", "currency"),
        "total_invoices": ("Total Invoices", "number"),
        "total_revenue": ("Total Revenue", "currency"),
        "total_cost": ("Total Cost", "currency"),
        "total_profit": ("Total Profit", "currency"),
        "profit_margin": ("Profit Margin", "percentage"),
        "average": ("Average", "currency"),
        "count": ("Count", "number"),
        "total_quotes": ("Total Quotes", "number"),
        "total_orders": ("Total Orders", "number"),
        "conversion_rate": ("Conversion Rate", "percentage"),
        "inactive_count": ("Inactive Count", "number"),
        "at_risk_count": ("At Risk Count", "number"),
        "compliant_count": ("Compliant Count", "number"),
        "pending_count": ("Pending Count", "number"),
    }

    for key, (label, format_type) in summary_fields.items():
        if key in data and data[key] is not None:
            builder.add_summary_stat(
                key=key,
                label=label,
                value=data[key],
                format=format_type,
            )

    # Fallback: add any remaining top-level numeric keys as summary stats
    skip_keys = {
        "details", "aging_buckets", "by_status", "raw", "agents",
        "revenue_trend", "trends", "forecast_monthly", "inactive_customer_ids",
        "start_date", "end_date",
    }
    for key, value in data.items():
        if key in summary_fields or key in skip_keys:
            continue
        if not isinstance(value, (int, float)) or callable(value):
            continue
        builder.add_summary_stat(
            key=f"extra_{key}",
            label=_humanize_key(key),
            value=value,
            format="number",
        )


def _add_charts_from_data(builder: ReportPreviewBuilder, title: str, details: List[Dict], data: Dict[str, Any]):
    """Automatically add charts based on data structure."""
    if not details:
        return

    # Check for common patterns
    first_row = details[0]

    # Pattern 1: Status/Category breakdown (status/category + count/amount)
    if "status" in first_row and ("count" in first_row or "amount" in first_row):
        value_key = "amount" if "amount" in first_row else "count"
        chart_data = [{"name": row.get("status", "Unknown"), "value": row.get(value_key, 0)} for row in details]

        # Pie chart
        builder.add_pie_chart(
            title=f"{title} Distribution",
            data=chart_data,
            name_key="name",
            value_key="value",
        )

        # Bar chart
        builder.add_bar_chart(
            title=f"{title} Breakdown",
            data=chart_data,
            x_key="name",
            y_key="value",
        )

    # Pattern 2: Bucket/Range analysis
    elif "bucket" in first_row and "amount" in first_row:
        chart_data = [{"name": row.get("bucket", "Unknown"), "value": row.get("amount", 0)} for row in details]
        builder.add_bar_chart(
            title=f"{title} by Range",
            data=chart_data,
            x_key="name",
            y_key="value",
        )

    # Pattern 3: Time series (date/month/period + value)
    elif any(k in first_row for k in ["date", "month", "period"]) and ("amount" in first_row or "count" in first_row):
        date_key = next(k for k in ["date", "month", "period"] if k in first_row)
        value_key = "amount" if "amount" in first_row else "count"
        chart_data = [{"name": str(row.get(date_key, "Unknown")), "value": row.get(value_key, 0)} for row in details]

        builder.add_line_chart(
            title=f"{title} Trend",
            data=chart_data,
            x_key="name",
            y_key="value",
        )

        builder.add_area_chart(
            title=f"{title} Over Time",
            data=chart_data,
            x_key="name",
            y_key="value",
        )

    # Pattern 4: Generic label + value (e.g. product_id + order_count, customer_id + total_value)
    else:
        label_candidates = ["name", "category", "label", "product_id", "customer_id"] + [
            k for k in first_row.keys() if k.endswith("_id") and k not in ("product_id", "customer_id")
        ]
        label_key = next((k for k in label_candidates if k in first_row), None)
        value_key = next(
            (k for k in first_row.keys() if isinstance(first_row.get(k), (int, float))),
            None,
        )
        if label_key is not None and value_key is not None:
            chart_data = [
                {"name": str(row.get(label_key, "Unknown")), "value": row.get(value_key, 0) or 0}
                for row in details
            ]
            builder.add_bar_chart(
                title=f"{title} Breakdown",
                data=chart_data,
                x_key="name",
                y_key="value",
            )
            if len(details) <= 12:
                builder.add_pie_chart(
                    title=f"{title} Distribution",
                    data=chart_data,
                    name_key="name",
                    value_key="value",
                )


def _add_table_from_data(builder: ReportPreviewBuilder, title: str, details: List[Dict]):
    """Automatically add table from data."""
    if not details:
        return

    # Infer columns from first row
    first_row = details[0]
    columns = []

    for key in first_row.keys():
        # Infer column type
        value = first_row[key]
        col_type = "text"
        align = "left"

        if isinstance(value, (int, float)):
            col_type = "number"
            align = "right"
            # Check if it's currency
            if key in ["amount", "total", "price", "cost", "revenue", "profit", "balance", "outstanding"]:
                col_type = "currency"
            # Check if it's percentage
            elif key in ["percentage", "margin", "rate", "percent"]:
                col_type = "percentage"
        elif key in ["date", "created_at", "updated_at"]:
            col_type = "datetime"

        columns.append({
            "key": key,
            "label": key.replace("_", " ").title(),
            "type": col_type,
            "align": align,
            "sortable": True,
        })

    # Prepare rows
    rows = [{"data": row} for row in details]

    # Calculate totals for numeric columns
    totals = {}
    numeric_keys = [col["key"] for col in columns if col["type"] in ["number", "currency", "percentage"]]
    for key in numeric_keys:
        try:
            total = sum(float(row.get(key, 0) or 0) for row in details)
            totals[key] = total
        except (ValueError, TypeError):
            pass

    builder.add_table(
        title=f"{title} Details",
        subtitle=f"{len(details)} records",
        columns=columns,
        rows=details,
        totals=totals if totals else None,
        pagination=True,
        page_size=10,
    )
