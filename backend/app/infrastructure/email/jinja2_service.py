"""
Jinja2 template service for email rendering.

Provides template loading, rendering, and caching for email templates.
"""
import os
from pathlib import Path
from typing import Dict, Optional
from functools import lru_cache

from jinja2 import Environment, FileSystemLoader, TemplateNotFound, TemplateError
from app.core.logging import logger
from app.config.settings import get_settings

settings = get_settings()


class Jinja2TemplateService:
    """Service for rendering Jinja2 email templates."""

    def __init__(self, template_dir: Optional[str] = None):
        """
        Initialize Jinja2 template service.

        Args:
            template_dir: Base directory for templates (defaults to infrastructure/email/templates)
        """
        if template_dir is None:
            # Get the base template directory
            base_path = Path(__file__).parent / "templates"
            template_dir = str(base_path)

        self.template_dir = template_dir
        self.env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True,
            trim_blocks=True,
            lstrip_blocks=True,
        )

        # Add custom filters
        self.env.filters["format_currency"] = self._format_currency
        self.env.filters["format_date"] = self._format_date

        # Add global variables
        self.env.globals["site_url"] = getattr(settings, "FRONTEND_URL", "https://cloudmanager.dz")

    @staticmethod
    def _format_currency(value: float, currency: str = "DZD") -> str:
        """Format currency value."""
        return f"{value:,.2f} {currency}"

    @staticmethod
    def _format_date(value, format_str: str = "%Y-%m-%d") -> str:
        """Format date value."""
        if hasattr(value, "strftime"):
            return value.strftime(format_str)
        return str(value)

    def render_template(
        self,
        template_name: str,
        context: Dict,
        format: str = "html",
    ) -> str:
        """
        Render a template with the given context.

        Args:
            template_name: Name of the template (without extension)
            context: Template context variables
            format: Template format ('html' or 'text')

        Returns:
            Rendered template string

        Raises:
            TemplateNotFound: If template doesn't exist
            TemplateError: If template rendering fails
        """
        template_path = f"{format}/{template_name}.{format}"

        try:
            template = self.env.get_template(template_path)
            return template.render(**context)
        except TemplateNotFound as e:
            logger.error(f"Template not found: {template_path}")
            raise
        except TemplateError as e:
            logger.error(f"Template rendering error for {template_path}: {e}")
            raise

    def render_email_template(
        self,
        template_name: str,
        context: Dict,
    ) -> Dict[str, str]:
        """
        Render both HTML and text versions of an email template.

        Args:
            template_name: Name of the template (without extension)
            context: Template context variables

        Returns:
            Dictionary with 'html' and 'text' keys

        Raises:
            TemplateNotFound: If template doesn't exist
            TemplateError: If template rendering fails
        """
        html_content = self.render_template(template_name, context, format="html")

        # Try to render text version, fallback to HTML if not found
        try:
            text_content = self.render_template(template_name, context, format="text")
        except TemplateNotFound:
            # Fallback: strip HTML tags (basic implementation)
            import re
            text_content = re.sub(r"<[^>]+>", "", html_content)
            text_content = re.sub(r"\s+", " ", text_content).strip()

        return {
            "html": html_content,
            "text": text_content,
        }

    def get_template_variables(self, template_name: str, format: str = "html") -> list[str]:
        """
        Extract variable names from a template.

        Args:
            template_name: Name of the template
            format: Template format ('html' or 'text')

        Returns:
            List of variable names used in the template
        """
        try:
            template_path = f"{format}/{template_name}.{format}"
            template = self.env.get_template(template_path)
            # Get variables from template AST
            from jinja2.meta import find_undeclared_variables
            ast = self.env.parse(template.source)
            variables = find_undeclared_variables(ast)
            # Filter out built-in variables and functions
            filtered = [v for v in variables if not v.startswith("_")]
            return sorted(list(filtered))
        except Exception as e:
            logger.warning(f"Could not extract variables from {template_name}: {e}")
            return []


# Global instance
_template_service: Optional[Jinja2TemplateService] = None


def get_template_service() -> Jinja2TemplateService:
    """Get or create the global template service instance."""
    global _template_service
    if _template_service is None:
        _template_service = Jinja2TemplateService()
    return _template_service
