"""
Template preview service.

Provides template rendering with sample data for preview purposes.
"""
from typing import Dict, Any, Optional
from app.infrastructure.email.jinja2_service import get_template_service
from app.infrastructure.email.template_context import build_base_context
from app.core.logging import logger


class TemplatePreviewService:
    """Service for previewing email templates."""

    def __init__(self):
        """Initialize template preview service."""
        self.template_service = get_template_service()

    def preview_template(
        self,
        template_name: str,
        context: Optional[Dict[str, Any]] = None,
        format: str = "html",
    ) -> Dict[str, Any]:
        """
        Preview a template with provided or sample context.

        Args:
            template_name: Name of the template (without extension)
            context: Template context variables (uses sample data if None)
            format: Template format ('html' or 'text')

        Returns:
            Dictionary with 'html', 'text', 'variables', and 'is_valid' keys
        """
        # Use provided context or generate sample context
        if context is None:
            context = self._generate_sample_context(template_name)

        try:
            # Render HTML version
            html_content = self.template_service.render_template(
                template_name, context, format="html"
            )

            # Try to render text version
            try:
                text_content = self.template_service.render_template(
                    template_name, context, format="text"
                )
            except Exception:
                # Fallback: strip HTML
                import re
                text_content = re.sub(r"<[^>]+>", "", html_content)
                text_content = re.sub(r"\s+", " ", text_content).strip()

            # Get template variables
            variables = self.template_service.get_template_variables(template_name, format="html")

            return {
                "html": html_content,
                "text": text_content,
                "variables": variables,
                "is_valid": True,
                "context_used": context,
            }
        except Exception as e:
            logger.error(f"Template preview error for {template_name}: {e}")
            return {
                "html": "",
                "text": "",
                "variables": [],
                "is_valid": False,
                "error": str(e),
            }

    def _generate_sample_context(self, template_name: str) -> Dict[str, Any]:
        """
        Generate sample context for a template.

        Args:
            template_name: Template name

        Returns:
            Sample context dictionary
        """
        base_context = build_base_context()
        
        # Template-specific sample data
        sample_data = {
            "welcome": {
                "user_name": "John Doe",
            },
            "password_reset": {
                "user_name": "John Doe",
                "reset_token": "sample-reset-token-12345",
                "reset_link": "https://cloudmanager.dz/reset-password?token=sample-token",
            },
            "ticket_created": {
                "ticket_id": "TKT-12345",
                "subject": "Sample Ticket Subject",
            },
            "ticket_reply": {
                "ticket_id": "TKT-12345",
                "subject": "Sample Ticket Subject",
                "reply_author": "Support Agent",
                "is_internal": False,
            },
            "ticket_status_change": {
                "ticket_id": "TKT-12345",
                "subject": "Sample Ticket Subject",
                "old_status": "open",
                "new_status": "in_progress",
            },
            "ticket_assigned": {
                "ticket_id": "TKT-12345",
                "subject": "Sample Ticket Subject",
                "assigned_to": "Support Agent",
            },
            "ticket_closed": {
                "ticket_id": "TKT-12345",
                "subject": "Sample Ticket Subject",
            },
            "invoice_sent": {
                "invoice_number": "INV-2025-001",
                "customer_name": "John Doe",
                "title": "Monthly Service Invoice",
                "total_amount": 50000.00,
                "due_date": "2025-02-15",
            },
            "email_verification": {
                "full_name": "John Doe",
                "verification_link": "https://cloudmanager.dz/verify-email?token=sample-token",
                "expires_in_hours": 24,
            },
            "quote_sent": {
                "quote_number": "QT-2025-001",
                "customer_name": "John Doe",
                "title": "Web Hosting Package",
                "total_amount": 30000.00,
                "valid_until": "2025-02-15",
            },
            "order_status": {
                "order_id": "ORD-2025-001",
                "status": "in_progress",
            },
        }
        
        # Merge base context with template-specific data
        context = base_context.copy()
        if template_name in sample_data:
            context.update(sample_data[template_name])
        
        return context

    def list_available_templates(self) -> list[str]:
        """
        List all available email templates.

        Returns:
            List of template names
        """
        import os
        from pathlib import Path
        
        template_dir = Path(__file__).parent.parent.parent.parent / "infrastructure" / "email" / "templates" / "html"
        
        templates = []
        if template_dir.exists():
            for file in template_dir.glob("*.html"):
                if file.stem != "base":  # Exclude base template
                    templates.append(file.stem)
        
        return sorted(templates)
