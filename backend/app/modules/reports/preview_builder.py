"""
Report Preview Builder

Helper functions to build standardized ReportPreviewData from report results.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import uuid4

from app.modules.reports.schemas import (
    ReportPreviewData,
    ReportMetadata,
    ReportSummary,
    ChartConfig,
    ChartSeries,
    TableData,
    TableColumn,
    TableRow,
)


class ReportPreviewBuilder:
    """Builder class for creating standardized report preview data."""

    def __init__(
        self,
        report_type: str,
        report_name: str,
        description: Optional[str] = None,
    ):
        """
        Initialize report preview builder.

        Args:
            report_type: Type of report (e.g., 'ticket_status', 'sales_pipeline')
            report_name: Display name of the report
            description: Optional description
        """
        self.report_id = str(uuid4())
        self.report_type = report_type
        self.report_name = report_name
        self.description = description
        self.summary_stats: List[ReportSummary] = []
        self.charts: List[ChartConfig] = []
        self.tables: List[TableData] = []
        self.metadata: Dict[str, Any] = {}

    def set_date_range(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        period_label: Optional[str] = None,
    ):
        """Set date range for the report."""
        if start_date or end_date:
            self.metadata["date_range"] = {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            }
        if period_label:
            self.metadata["period_label"] = period_label
        return self

    def set_filters(self, filters: Dict[str, Any]):
        """Set filter parameters used in the report."""
        self.metadata["filters"] = filters
        return self

    def set_total_records(self, count: int):
        """Set total record count."""
        self.metadata["total_records"] = count
        return self

    def add_summary_stat(
        self,
        key: str,
        label: str,
        value: Any,
        format: Optional[str] = None,
        trend: Optional[str] = None,
        trend_value: Optional[float] = None,
        icon: Optional[str] = None,
        color: Optional[str] = None,
    ):
        """
        Add a summary statistic card.

        Args:
            key: Unique key for this stat
            label: Display label
            value: Stat value
            format: Format type (number, currency, percentage, etc.)
            trend: Trend direction (up, down, neutral)
            trend_value: Percentage change
            icon: Icon name (optional)
            color: Color code (optional)
        """
        stat = ReportSummary(
            key=key,
            label=label,
            value=value,
            format=format,
            trend=trend,
            trendValue=trend_value,
            icon=icon,
            color=color,
        )
        self.summary_stats.append(stat)
        return self

    def add_bar_chart(
        self,
        title: str,
        data: List[Dict[str, Any]],
        x_key: str = "name",
        y_key: str = "value",
        subtitle: Optional[str] = None,
        colors: Optional[List[str]] = None,
        stacked: bool = False,
        series: Optional[List[Dict[str, str]]] = None,
        height: int = 300,
    ):
        """
        Add a bar chart.

        Args:
            title: Chart title
            data: Chart data (list of dicts)
            x_key: Key for X-axis values
            y_key: Key for Y-axis values
            subtitle: Optional subtitle
            colors: Custom color palette
            stacked: Whether to stack bars
            series: Multi-series configuration [{name, dataKey, color}]
            height: Chart height in pixels
        """
        chart_series = None
        if series:
            chart_series = [
                ChartSeries(
                    name=s.get("name", ""),
                    dataKey=s.get("dataKey", ""),
                    color=s.get("color"),
                )
                for s in series
            ]

        chart = ChartConfig(
            chart_id=str(uuid4()),
            chart_type="bar",
            title=title,
            subtitle=subtitle,
            data=data,
            dataKeys={"xAxis": x_key, "yAxis": y_key},
            series=chart_series,
            colors=colors,
            stacked=stacked,
            height=height,
        )
        self.charts.append(chart)
        return self

    def add_line_chart(
        self,
        title: str,
        data: List[Dict[str, Any]],
        x_key: str = "name",
        y_key: str = "value",
        subtitle: Optional[str] = None,
        colors: Optional[List[str]] = None,
        series: Optional[List[Dict[str, str]]] = None,
        height: int = 300,
    ):
        """Add a line chart."""
        chart_series = None
        if series:
            chart_series = [
                ChartSeries(
                    name=s.get("name", ""),
                    dataKey=s.get("dataKey", ""),
                    color=s.get("color"),
                )
                for s in series
            ]

        chart = ChartConfig(
            chart_id=str(uuid4()),
            chart_type="line",
            title=title,
            subtitle=subtitle,
            data=data,
            dataKeys={"xAxis": x_key, "yAxis": y_key},
            series=chart_series,
            colors=colors,
            height=height,
        )
        self.charts.append(chart)
        return self

    def add_area_chart(
        self,
        title: str,
        data: List[Dict[str, Any]],
        x_key: str = "name",
        y_key: str = "value",
        subtitle: Optional[str] = None,
        colors: Optional[List[str]] = None,
        stacked: bool = False,
        series: Optional[List[Dict[str, str]]] = None,
        height: int = 300,
    ):
        """Add an area chart."""
        chart_series = None
        if series:
            chart_series = [
                ChartSeries(
                    name=s.get("name", ""),
                    dataKey=s.get("dataKey", ""),
                    color=s.get("color"),
                )
                for s in series
            ]

        chart = ChartConfig(
            chart_id=str(uuid4()),
            chart_type="area",
            title=title,
            subtitle=subtitle,
            data=data,
            dataKeys={"xAxis": x_key, "yAxis": y_key},
            series=chart_series,
            colors=colors,
            stacked=stacked,
            height=height,
        )
        self.charts.append(chart)
        return self

    def add_pie_chart(
        self,
        title: str,
        data: List[Dict[str, Any]],
        name_key: str = "name",
        value_key: str = "value",
        subtitle: Optional[str] = None,
        colors: Optional[List[str]] = None,
        height: int = 300,
    ):
        """Add a pie chart."""
        chart = ChartConfig(
            chart_id=str(uuid4()),
            chart_type="pie",
            title=title,
            subtitle=subtitle,
            data=data,
            dataKeys={"xAxis": name_key, "yAxis": value_key},
            colors=colors,
            height=height,
        )
        self.charts.append(chart)
        return self

    def add_donut_chart(
        self,
        title: str,
        data: List[Dict[str, Any]],
        name_key: str = "name",
        value_key: str = "value",
        subtitle: Optional[str] = None,
        colors: Optional[List[str]] = None,
        height: int = 300,
    ):
        """Add a donut chart (pie with center hole)."""
        chart = ChartConfig(
            chart_id=str(uuid4()),
            chart_type="donut",
            title=title,
            subtitle=subtitle,
            data=data,
            dataKeys={"xAxis": name_key, "yAxis": value_key},
            colors=colors,
            height=height,
        )
        self.charts.append(chart)
        return self

    def add_table(
        self,
        title: str,
        columns: List[Dict[str, Any]],
        rows: List[Dict[str, Any]],
        subtitle: Optional[str] = None,
        totals: Optional[Dict[str, Any]] = None,
        pagination: bool = True,
        page_size: int = 10,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
    ):
        """
        Add a data table.

        Args:
            title: Table title
            columns: Column definitions [
                {key, label, type, align?, sortable?, format?, width?}
            ]
            rows: Row data (list of dicts with keys matching column keys)
            subtitle: Optional subtitle
            totals: Optional totals row (dict with column keys)
            pagination: Enable pagination
            page_size: Rows per page
            sort_by: Default sort column
            sort_order: Default sort order (asc/desc)
        """
        table_columns = [
            TableColumn(
                key=col["key"],
                label=col["label"],
                type=col.get("type", "text"),
                align=col.get("align", "left"),
                sortable=col.get("sortable", True),
                format=col.get("format"),
                width=col.get("width"),
            )
            for col in columns
        ]

        table_rows = [
            TableRow(
                data=row,
                metadata=row.get("__metadata"),
                className=row.get("__className"),
            )
            for row in rows
        ]

        table = TableData(
            table_id=str(uuid4()),
            title=title,
            subtitle=subtitle,
            columns=table_columns,
            rows=table_rows,
            totals=totals,
            pagination=pagination,
            pageSize=page_size,
            sortBy=sort_by,
            sortOrder=sort_order,
        )
        self.tables.append(table)
        return self

    def build(
        self,
        generated_by: Optional[str] = None,
        raw_data: Optional[Dict[str, Any]] = None,
        export_formats: Optional[List[str]] = None,
    ) -> ReportPreviewData:
        """
        Build the final ReportPreviewData object.

        Args:
            generated_by: User ID who generated the report
            raw_data: Optional raw data for custom rendering
            export_formats: List of available export formats

        Returns:
            Complete ReportPreviewData object
        """
        metadata = ReportMetadata(
            report_id=self.report_id,
            report_type=self.report_type,
            report_name=self.report_name,
            description=self.description,
            generated_at=datetime.utcnow(),
            generated_by=generated_by,
            date_range=self.metadata.get("date_range"),
            filters=self.metadata.get("filters"),
            total_records=self.metadata.get("total_records"),
            period_label=self.metadata.get("period_label"),
        )

        return ReportPreviewData(
            metadata=metadata,
            summary=self.summary_stats,
            charts=self.charts,
            tables=self.tables,
            raw_data=raw_data,
            export_formats=export_formats or ["pdf", "excel", "csv"],
        )


def build_simple_status_report(
    report_name: str,
    status_data: List[Dict[str, Any]],
    total_count: int,
    report_type: str = "status_report",
    status_key: str = "status",
    count_key: str = "count",
) -> ReportPreviewData:
    """
    Helper to quickly build a simple status breakdown report.

    Args:
        report_name: Name of the report
        status_data: List of {status, count, percentage} dicts
        total_count: Total count across all statuses
        report_type: Type identifier
        status_key: Key for status field
        count_key: Key for count field

    Returns:
        ReportPreviewData object
    """
    builder = ReportPreviewBuilder(
        report_type=report_type,
        report_name=report_name,
    )

    builder.add_summary_stat(
        key="total",
        label="Total",
        value=total_count,
        format="number",
    )

    builder.add_pie_chart(
        title=f"{report_name} Distribution",
        data=status_data,
        name_key=status_key,
        value_key=count_key,
    )

    builder.add_table(
        title="Detailed Breakdown",
        columns=[
            {"key": status_key, "label": "Status", "type": "text"},
            {"key": count_key, "label": "Count", "type": "number"},
            {"key": "percentage", "label": "Percentage", "type": "percentage"},
        ],
        rows=status_data,
        totals={status_key: "Total", count_key: total_count, "percentage": 100.0},
    )

    return builder.build()
