"""Canned replies system with template variables."""
import re
from typing import Dict, List, Optional
from datetime import datetime, timezone
import uuid

from sqlalchemy import String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import Base
from app.modules.tickets.response_templates import ResponseTemplate


class TemplateVariable:
    """
    Template variable definitions for canned replies.

    Variables use {{variable_name}} format for substitution.
    """

    # System variables (auto-filled)
    SYSTEM_VARIABLES = {
        "{{customer_name}}": "Name of the customer",
        "{{customer_email}}": "Customer email address",
        "{{ticket_id}}": "Ticket ID",
        "{{ticket_subject}}": "Ticket subject",
        "{{ticket_status}}": "Current ticket status",
        "{{ticket_priority}}": "Ticket priority",
        "{{agent_name}}": "Support agent name",
        "{{agent_email}}": "Support agent email",
        "{{current_date}}": "Today's date",
        "{{current_time}}": "Current time",
        "{{response_time}}": "First response time",
    }

    # Custom variables (user-defined)
    CUSTOM_VARIABLES = {
        "{{company_name}}": "Your company name",
        "{{support_email}}": "Support team email",
        "{{phone_number}}": "Support phone number",
        "{{website_url}}": "Company website",
    }

    ALL_VARIABLES = {**SYSTEM_VARIABLES, **CUSTOM_VARIABLES}


class CannedReplyService:
    """Service for managing canned replies and template variables."""

    def __init__(self, db: AsyncSession):
        """Initialize canned reply service."""
        self.db = db

    def extract_variables(self, template_content: str) -> List[str]:
        """
        Extract all template variables from content.

        Args:
            template_content: Template content with {{variable}} placeholders

        Returns:
            List of found variables
        """
        pattern = r"\{\{(\w+)\}\}"
        matches = re.findall(pattern, template_content)
        return list(set(matches))

    def validate_template(self, template_content: str) -> dict:
        """
        Validate template syntax and variables.

        Args:
            template_content: Template content to validate

        Returns:
            Validation result with issues list
        """
        issues = []
        variables = self.extract_variables(template_content)

        # Check for unknown variables
        for var in variables:
            var_key = f"{{{{{var}}}}}"
            if var_key not in TemplateVariable.ALL_VARIABLES:
                issues.append(f"Unknown variable: {var_key}")

        # Check for malformed variables
        if "{{" in template_content and "}}" not in template_content:
            issues.append("Mismatched variable brackets")

        return {
            "is_valid": len(issues) == 0,
            "variables_found": variables,
            "issues": issues,
        }

    async def render_template(
        self,
        template_content: str,
        context: Dict[str, str],
    ) -> str:
        """
        Render template with variable substitution.

        Args:
            template_content: Template with {{variable}} placeholders
            context: Dictionary of variable values

        Returns:
            Rendered content
        """
        result = template_content

        # Replace system variables
        for var_key, var_value in context.items():
            placeholder = f"{{{{{var_key}}}}}"
            result = result.replace(placeholder, var_value)

        # Replace any remaining variables with empty string
        result = re.sub(r"\{\{(\w+)\}\}", "", result)

        return result

    async def get_template_context(
        self,
        ticket_id: str,
        customer_id: str,
        agent_id: str,
    ) -> Dict[str, str]:
        """
        Get context dictionary for template rendering.

        Args:
            ticket_id: Ticket ID
            customer_id: Customer ID
            agent_id: Agent ID

        Returns:
            Dictionary with variable values
        """
        from datetime import datetime

        # In a real scenario, these would be fetched from database
        context = {
            "customer_name": "Customer Name",  # Fetch from customers table
            "customer_email": "customer@example.com",
            "ticket_id": ticket_id,
            "ticket_subject": "Support Request",
            "ticket_status": "open",
            "ticket_priority": "medium",
            "agent_name": "Support Agent",  # Fetch from users table
            "agent_email": "agent@example.com",
            "current_date": datetime.now().strftime("%Y-%m-%d"),
            "current_time": datetime.now().strftime("%H:%M:%S"),
            "response_time": "1 hour",
            # Custom variables
            "company_name": "CloudManager",
            "support_email": "support@cloudmanager.dz",
            "phone_number": "+213 XXX XXX XXX",
            "website_url": "https://cloudmanager.dz",
        }

        return context

    async def insert_template_quick_reply(
        self,
        template_id: str,
        ticket_id: str,
        customer_id: str,
        agent_id: str,
    ) -> str:
        """
        Generate a quick reply from template with variables substituted.

        Args:
            template_id: Template ID
            ticket_id: Ticket ID
            customer_id: Customer ID
            agent_id: Agent ID

        Returns:
            Rendered reply content
        """
        # Fetch template
        from sqlalchemy import select

        query = select(ResponseTemplate).where(
            ResponseTemplate.id == template_id,
            ResponseTemplate.deleted_at.is_(None),
        )
        result = await self.db.execute(query)
        template = result.scalar_one_or_none()

        if not template:
            raise ValueError(f"Template {template_id} not found")

        # Get context
        context = await self.get_template_context(ticket_id, customer_id, agent_id)

        # Render template
        rendered_content = await self.render_template(template.content, context)

        # Increment usage count
        template.usage_count += 1
        await self.db.commit()

        return rendered_content

    async def list_templates_for_category(
        self, category: str, limit: int = 20
    ) -> List[ResponseTemplate]:
        """
        List templates in a category with usage sorting.

        Args:
            category: Template category
            limit: Maximum number to return

        Returns:
            List of templates sorted by usage
        """
        from sqlalchemy import select, desc

        query = (
            select(ResponseTemplate)
            .where(
                ResponseTemplate.category == category,
                ResponseTemplate.deleted_at.is_(None),
            )
            .order_by(desc(ResponseTemplate.usage_count))
            .limit(limit)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_popular_templates(self, limit: int = 10) -> List[ResponseTemplate]:
        """
        Get most-used templates across all categories.

        Args:
            limit: Maximum number to return

        Returns:
            List of most-used templates
        """
        from sqlalchemy import select, desc

        query = (
            select(ResponseTemplate)
            .where(ResponseTemplate.deleted_at.is_(None))
            .order_by(desc(ResponseTemplate.usage_count))
            .limit(limit)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    def get_available_variables(self) -> dict:
        """
        Get all available template variables.

        Returns:
            Dictionary with variable categories
        """
        return {
            "system_variables": TemplateVariable.SYSTEM_VARIABLES,
            "custom_variables": TemplateVariable.CUSTOM_VARIABLES,
            "all_variables": TemplateVariable.ALL_VARIABLES,
        }


# Pydantic Schemas


class TemplateVariableInfo(BaseModel):
    """Information about a template variable."""

    name: str = Field(..., description="Variable name with {{ }}")
    description: str = Field(..., description="Variable description")
    category: str = Field(..., description="Variable category (system/custom)")


class CannedReplyQuickInsert(BaseModel):
    """Schema for quick insert of canned reply."""

    template_id: str = Field(..., description="Template ID to insert")
    ticket_id: str = Field(..., description="Ticket ID")


class TemplateRenderRequest(BaseModel):
    """Request to render template with variables."""

    template_content: str = Field(..., min_length=1)
    context: Dict[str, str] = Field(..., description="Variable values")


class TemplateRenderResponse(BaseModel):
    """Response with rendered template."""

    rendered_content: str
    variables_used: List[str]
    is_valid: bool
