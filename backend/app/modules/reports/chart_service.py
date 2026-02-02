"""
Chart Service

Generates charts as base64-encoded PNG images using matplotlib (Agg backend).
Used for embedding in PDF and HTML report templates.
Matplotlib is imported lazily so migrations and app startup do not require it.
"""

import base64
from io import BytesIO
from typing import List, Optional, Dict, Any


def _get_plt() -> Optional[Any]:
    """Lazy-load matplotlib with Agg backend; returns pyplot or None if not installed."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        return plt
    except ModuleNotFoundError:
        return None


# Default colors for consistency
DEFAULT_COLORS = [
    "#4CAF50", "#2196F3", "#FF9800", "#F44336", "#9C27B0",
    "#00BCD4", "#FFEB3B", "#795548",
]


class ChartService:
    """Generate charts as base64 PNG data URLs."""

    def _to_base64(self, fig: Any) -> str:
        """Render figure to PNG and return data URL."""
        plt = _get_plt()
        if plt is None:
            return ""
        buf = BytesIO()
        fig.savefig(buf, format="png", dpi=100, bbox_inches="tight")
        buf.seek(0)
        b64 = base64.b64encode(buf.read()).decode("utf-8")
        plt.close(fig)
        return f"data:image/png;base64,{b64}"

    def generate_bar_chart(
        self,
        data: List[float],
        title: str,
        labels: Optional[List[str]] = None,
        colors: Optional[List[str]] = None,
    ) -> Optional[str]:
        """Bar chart; returns base64 data URL or None if matplotlib unavailable."""
        plt = _get_plt()
        if plt is None:
            return None
        fig, ax = plt.subplots(figsize=(8, 4))
        x = range(len(data))
        ax.bar(x, data, color=colors or DEFAULT_COLORS[: len(data)])
        if labels:
            ax.set_xticks(x)
            ax.set_xticklabels(labels, rotation=45, ha="right")
        ax.set_title(title)
        ax.set_ylabel("Value")
        return self._to_base64(fig)

    def generate_line_chart(
        self,
        data: List[float],
        title: str,
        x_labels: Optional[List[str]] = None,
        series: Optional[Dict[str, List[float]]] = None,
    ) -> Optional[str]:
        """Line chart; single series as data or multiple via series. Returns None if matplotlib unavailable."""
        plt = _get_plt()
        if plt is None:
            return None
        fig, ax = plt.subplots(figsize=(8, 4))
        x = range(len(data)) if not series else range(
            len(next(iter(series.values()))))
        if series:
            for name, values in series.items():
                ax.plot(x, values, label=name, marker="o", markersize=4)
            ax.legend()
        else:
            ax.plot(x, data, marker="o", markersize=4)
        if x_labels:
            ax.set_xticks(list(x))
            ax.set_xticklabels(x_labels, rotation=45, ha="right")
        ax.set_title(title)
        ax.set_ylabel("Value")
        return self._to_base64(fig)

    def generate_pie_chart(
        self,
        data: List[float],
        labels: List[str],
        colors: Optional[List[str]] = None,
        title: Optional[str] = None,
    ) -> Optional[str]:
        """Pie chart; returns base64 data URL or None if matplotlib unavailable."""
        plt = _get_plt()
        if plt is None:
            return None
        fig, ax = plt.subplots(figsize=(6, 6))
        ax.pie(
            data,
            labels=labels,
            autopct="%1.1f%%",
            colors=colors or DEFAULT_COLORS[: len(data)],
            startangle=90,
        )
        if title:
            ax.set_title(title)
        return self._to_base64(fig)

    def generate_stacked_bar_chart(
        self,
        data: Dict[str, List[float]],
        categories: List[str],
        title: str,
        colors: Optional[List[str]] = None,
    ) -> Optional[str]:
        """Stacked bar chart; returns None if matplotlib unavailable."""
        plt = _get_plt()
        if plt is None:
            return None
        fig, ax = plt.subplots(figsize=(8, 4))
        n = len(categories)
        x = range(n)
        bottom = [0.0] * n
        palette = colors or DEFAULT_COLORS
        for i, (name, values) in enumerate(data.items()):
            ax.bar(x, values, label=name, bottom=bottom,
                   color=palette[i % len(palette)])
            bottom = [b + v for b, v in zip(bottom, values)]
        ax.set_xticks(x)
        ax.set_xticklabels(categories, rotation=45, ha="right")
        ax.set_title(title)
        ax.legend()
        return self._to_base64(fig)

    def generate_area_chart(
        self,
        trend_data: List[float],
        title: str,
        x_labels: Optional[List[str]] = None,
    ) -> Optional[str]:
        """Area chart for trend data; returns None if matplotlib unavailable."""
        plt = _get_plt()
        if plt is None:
            return None
        fig, ax = plt.subplots(figsize=(8, 4))
        x = range(len(trend_data))
        ax.fill_between(x, trend_data, alpha=0.5, color=DEFAULT_COLORS[1])
        ax.plot(x, trend_data, color=DEFAULT_COLORS[1], linewidth=2)
        if x_labels:
            ax.set_xticks(x)
            ax.set_xticklabels(x_labels, rotation=45, ha="right")
        ax.set_title(title)
        ax.set_ylabel("Value")
        return self._to_base64(fig)
