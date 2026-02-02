"""
HTML-based PDF generation service.

Uses Jinja2 templates for dynamic HTML rendering and WeasyPrint/xhtml2pdf for PDF conversion.
Provides professional invoice, quote, and report PDF generation.
"""

import base64
from io import BytesIO
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List
from decimal import Decimal

import qrcode
from jinja2 import Environment, FileSystemLoader, select_autoescape

# Try WeasyPrint first, fallback to xhtml2pdf
try:
    from weasyprint import HTML, CSS
    PDF_ENGINE = "weasyprint"
except ImportError:
    try:
        from xhtml2pdf import pisa
        PDF_ENGINE = "xhtml2pdf"
    except ImportError:
        PDF_ENGINE = None

from app.modules.invoices.models import Invoice, InvoiceItem
from app.modules.quotes.models import Quote, QuoteItem


class HTMLPDFService:
    """
    Service for generating PDFs from HTML templates using Jinja2.

    Supports WeasyPrint (preferred) or xhtml2pdf as PDF engines.
    """

    # Default company information
    DEFAULT_COMPANY = {
        "name": "CloudManager",
        "legal_name": "CloudManager SARL",
        "address": "123 Rue Didouche Mourad, Algiers 16000, Algeria",
        "phone": "+213 (0) 21 123 456",
        "fax": "+213 (0) 21 123 457",
        "email": "billing@cloudmanager.dz",
        "website": "www.cloudmanager.dz",
        "nif": "001234567890123",
        "rc": "16/00-1234567",
        "ai": "16123456789012"
    }

    # Default bank information
    DEFAULT_BANK = {
        "name": "Banque Nationale d'Algerie (BNA)",
        "account_name": "CloudManager SARL",
        "account_number": "007 123 456789 01",
        "swift": "BNAADZAL",
        "iban": "DZ59 0001 2345 6789 0123 4567",
        "branch": "Didouche Mourad, Algiers"
    }

    # Invoice status display mapping
    STATUS_DISPLAY = {
        "draft": "Brouillon",
        "issued": "Emise",
        "sent": "Envoyee",
        "paid": "Payee",
        "partially_paid": "Partiellement Payee",
        "overdue": "En Retard",
        "cancelled": "Annulee"
    }

    # Quote status display mapping
    QUOTE_STATUS_DISPLAY = {
        "draft": "Brouillon",
        "pending_approval": "En Attente d'Approval",
        "approved": "Approuve",
        "rejected": "Rejete",
        "sent": "Envoye",
        "accepted": "Accepte",
        "declined": "Refuse",
        "expired": "Expire",
        "converted": "Converti"
    }

    def __init__(
        self,
        templates_dir: str = "app/templates",
        output_dir: Optional[str] = None,
        company_info: Optional[Dict[str, str]] = None,
        bank_info: Optional[Dict[str, str]] = None
    ):
        """
        Initialize HTML PDF service.

        Args:
            templates_dir: Directory containing Jinja2 templates
            output_dir: Directory for generated PDF files (defaults to STORAGE_PATH/pdfs/invoices)
            company_info: Company information to use in templates
            bank_info: Bank information for payment details
        """
        from app.config.settings import get_settings
        settings = get_settings()

        self.templates_dir = Path(templates_dir)

        # Use STORAGE_PATH from settings, resolve to absolute path
        if output_dir:
            self.output_dir = Path(output_dir).resolve()
        else:
            storage_base = Path(settings.STORAGE_PATH).resolve()
            self.output_dir = storage_base / "pdfs" / "invoices"

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.company = company_info or self.DEFAULT_COMPANY
        self.bank = bank_info or self.DEFAULT_BANK

        # Setup Jinja2 environment
        self.env = Environment(
            loader=FileSystemLoader(str(self.templates_dir)),
            autoescape=select_autoescape(['html', 'xml'])
        )

        # Add custom filters
        self.env.filters['format_currency'] = self._format_currency
        self.env.filters['format_date'] = self._format_date

        if PDF_ENGINE is None:
            raise ImportError(
                "No PDF engine available. Install weasyprint or xhtml2pdf:\n"
                "pip install weasyprint\n"
                "or\n"
                "pip install xhtml2pdf"
            )

    @staticmethod
    def _format_currency(value: float, currency: str = "DZD") -> str:
        """Format a number as currency."""
        return f"{value:,.2f} {currency}"

    @staticmethod
    def _format_date(date: datetime, format: str = "%d/%m/%Y") -> str:
        """Format a datetime object."""
        if isinstance(date, str):
            return date
        return date.strftime(format)

    def _generate_qr_code(self, data: str) -> str:
        """
        Generate QR code and return as base64 string.

        Args:
            data: Data to encode in QR code

        Returns:
            Base64 encoded PNG image
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        return base64.b64encode(buffer.getvalue()).decode('utf-8')

    def _html_to_pdf(self, html_content: str, output_path: str) -> str:
        """
        Convert HTML to PDF using available engine.

        Args:
            html_content: Rendered HTML string
            output_path: Path for output PDF file

        Returns:
            Path to generated PDF
        """
        if PDF_ENGINE == "weasyprint":
            html = HTML(string=html_content)
            html.write_pdf(output_path)
        elif PDF_ENGINE == "xhtml2pdf":
            with open(output_path, "wb") as pdf_file:
                pisa_status = pisa.CreatePDF(html_content, dest=pdf_file)
                if pisa_status.err:
                    raise Exception(
                        f"PDF generation failed: {pisa_status.err}")
        else:
            raise ImportError("No PDF engine available")

        return output_path

    def generate_invoice_pdf(
        self,
        invoice: Invoice,
        customer_data: Dict[str, Any],
        include_qr: bool = True,
        custom_template: Optional[str] = None,
        company_info: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generate invoice PDF from HTML template.

        Args:
            invoice: Invoice model instance with items loaded
            customer_data: Customer information dictionary
            include_qr: Whether to include QR code for payment
            custom_template: Optional custom template path
            company_info: Optional company dict from general settings (app_name, company_name, etc.)

        Returns:
            Path to generated PDF file
        """
        template_name = custom_template or "invoices/invoice.html"
        template = self.env.get_template(template_name)
        company = {**self.company, **(company_info or {})}

        # Calculate financial details
        subtotal = float(invoice.subtotal_amount)
        discount = float(invoice.discount_amount)
        tax_rate = float(invoice.tax_rate)
        tax_amount = float(invoice.tax_amount)
        total = float(invoice.total_amount)
        paid_amount = float(invoice.paid_amount)
        balance_due = total - paid_amount

        # TAP calculation (0.5% standard rate in Algeria)
        tap_rate = 0.5
        tap_amount = (subtotal - discount) * (tap_rate / 100)
        total_tax = tax_amount + tap_amount

        # Calculate days until due
        now = datetime.now(timezone.utc)
        if invoice.due_date.tzinfo is None:
            due_date = invoice.due_date.replace(tzinfo=timezone.utc)
        else:
            due_date = invoice.due_date
        days_until_due = (due_date - now).days

        # Prepare invoice data
        invoice_data = {
            "invoice_number": invoice.invoice_number,
            "status": invoice.status.value,
            "status_display": self.STATUS_DISPLAY.get(invoice.status.value, invoice.status.value),
            "issue_date": invoice.issue_date.strftime("%d/%m/%Y"),
            "due_date": invoice.due_date.strftime("%d/%m/%Y"),
            "days_until_due": days_until_due,
            "subtotal": subtotal,
            "discount": discount,
            "tax_rate": tax_rate,
            "tva_amount": tax_amount,
            "tap_rate": tap_rate,
            "tap_amount": tap_amount,
            "total_tax": total_tax,
            "total": subtotal - discount + total_tax,
            "paid_amount": paid_amount,
            "balance_due": balance_due,
            "payment_terms_days": (invoice.due_date - invoice.issue_date).days,
            "notes": invoice.notes
        }

        # Prepare items data
        items_data = []
        for item in invoice.items:
            items_data.append({
                "description": item.description,
                "quantity": int(item.quantity),
                "unit_price": float(item.unit_price),
                "line_total": float(item.line_total)
            })

        # Generate QR code if needed
        qr_code_base64 = None
        if include_qr and balance_due > 0:
            qr_data = f"INV:{invoice.invoice_number}|AMT:{balance_due:.2f}|DUE:{invoice.due_date.strftime('%Y%m%d')}"
            qr_code_base64 = self._generate_qr_code(qr_data)

        # Render template
        html_content = template.render(
            invoice=invoice_data,
            customer=customer_data,
            items=items_data,
            company=company,
            bank=self.bank,
            currency="DZD",
            currency_name="Dinars Algeriens",
            late_fee_rate=1,
            show_qr=include_qr,
            qr_code_base64=qr_code_base64,
            generated_at=datetime.now(timezone.utc).strftime(
                "%Y-%m-%d %H:%M:%S UTC")
        )

        # Generate PDF
        filename = f"invoice_{invoice.invoice_number}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        output_path = self.output_dir / "invoices"
        output_path.mkdir(parents=True, exist_ok=True)
        filepath = output_path / filename

        self._html_to_pdf(html_content, str(filepath))

        return str(filepath)

    def generate_quote_pdf(
        self,
        quote: Quote,
        customer_data: Dict[str, Any],
        custom_template: Optional[str] = None,
        company_info: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generate quote PDF from HTML template.

        Args:
            quote: Quote model instance with items loaded
            customer_data: Customer information dictionary
            custom_template: Optional custom template path
            company_info: Optional company dict from general settings

        Returns:
            Path to generated PDF file
        """
        template_name = custom_template or "quotes/quote.html"
        template = self.env.get_template(template_name)
        company = {**self.company, **(company_info or {})}

        # Calculate financial details
        subtotal = float(quote.subtotal_amount)
        discount = float(quote.discount_amount)
        tax_rate = float(quote.tax_rate)
        tax_amount = float(quote.tax_amount)
        total = float(quote.total_amount)

        # TAP calculation (0.5% standard rate in Algeria)
        tap_rate = 0.5
        tap_amount = (subtotal - discount) * (tap_rate / 100)
        total_tax = tax_amount + tap_amount

        # Calculate days until expiry
        now = datetime.now(timezone.utc)
        if quote.valid_until.tzinfo is None:
            valid_until = quote.valid_until.replace(tzinfo=timezone.utc)
        else:
            valid_until = quote.valid_until
        days_until_expiry = (valid_until - now).days
        is_expired = days_until_expiry < 0

        # Prepare quote data
        quote_data = {
            "quote_number": quote.quote_number,
            "status": quote.status.value,
            "status_display": self.QUOTE_STATUS_DISPLAY.get(quote.status.value, quote.status.value),
            "created_date": quote.created_at.strftime("%d/%m/%Y"),
            "valid_from": quote.valid_from.strftime("%d/%m/%Y"),
            "valid_until": quote.valid_until.strftime("%d/%m/%Y"),
            "days_until_expiry": days_until_expiry,
            "is_expired": is_expired,
            "subtotal": subtotal,
            "discount": discount,
            "tax_rate": tax_rate,
            "tva_amount": tax_amount,
            "tap_rate": tap_rate,
            "tap_amount": tap_amount,
            "total_tax": total_tax,
            "total": subtotal - discount + total_tax,
            "version": quote.version if hasattr(quote, 'version') else 1,
            "notes": quote.notes,
            "terms_and_conditions": quote.terms_and_conditions
        }

        # Prepare items data
        items_data = []
        for item in quote.items:
            items_data.append({
                "item_name": item.item_name,
                "description": item.description,
                "quantity": int(item.quantity),
                "unit_price": float(item.unit_price),
                "line_total": float(item.line_total)
            })

        # Render template
        html_content = template.render(
            quote=quote_data,
            customer=customer_data,
            items=items_data,
            company=company,
            bank=self.bank,
            currency="DZD",
            currency_name="Dinars Algeriens",
            generated_at=datetime.now(timezone.utc).strftime(
                "%Y-%m-%d %H:%M:%S UTC")
        )

        # Generate PDF
        filename = f"quote_{quote.quote_number}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        output_path = self.output_dir / "quotes"
        output_path.mkdir(parents=True, exist_ok=True)
        filepath = output_path / filename

        self._html_to_pdf(html_content, str(filepath))

        return str(filepath)

    def generate_invoice_from_data(
        self,
        invoice_data: Dict[str, Any],
        customer_data: Dict[str, Any],
        items_data: List[Dict[str, Any]],
        include_qr: bool = True,
        custom_template: Optional[str] = None
    ) -> str:
        """
        Generate invoice PDF from raw data (without database models).

        Args:
            invoice_data: Invoice information dictionary
            customer_data: Customer information dictionary
            items_data: List of invoice items
            include_qr: Whether to include QR code
            custom_template: Optional custom template path

        Returns:
            Path to generated PDF file
        """
        template_name = custom_template or "invoices/invoice.html"
        template = self.env.get_template(template_name)

        # Calculate totals if not provided
        if "subtotal" not in invoice_data:
            invoice_data["subtotal"] = sum(
                item.get("line_total", 0) for item in items_data)

        if "total_tax" not in invoice_data:
            tax_rate = invoice_data.get("tax_rate", 19)
            tap_rate = invoice_data.get("tap_rate", 0.5)
            subtotal = invoice_data["subtotal"]
            discount = invoice_data.get("discount", 0)
            base = subtotal - discount
            invoice_data["tva_amount"] = base * (tax_rate / 100)
            invoice_data["tap_amount"] = base * (tap_rate / 100)
            invoice_data["total_tax"] = invoice_data["tva_amount"] + \
                invoice_data["tap_amount"]

        if "total" not in invoice_data:
            invoice_data["total"] = invoice_data["subtotal"] - \
                invoice_data.get("discount", 0) + invoice_data["total_tax"]

        if "balance_due" not in invoice_data:
            invoice_data["balance_due"] = invoice_data["total"] - \
                invoice_data.get("paid_amount", 0)

        # Set status display
        if "status_display" not in invoice_data:
            invoice_data["status_display"] = self.STATUS_DISPLAY.get(
                invoice_data.get("status", "draft"),
                invoice_data.get("status", "Brouillon")
            )

        # Generate QR code if needed
        qr_code_base64 = None
        if include_qr and invoice_data.get("balance_due", 0) > 0:
            qr_data = f"INV:{invoice_data.get('invoice_number', 'N/A')}|AMT:{invoice_data['balance_due']:.2f}"
            qr_code_base64 = self._generate_qr_code(qr_data)

        # Render template
        html_content = template.render(
            invoice=invoice_data,
            customer=customer_data,
            items=items_data,
            company=self.company,
            bank=self.bank,
            currency=invoice_data.get("currency", "DZD"),
            currency_name=invoice_data.get(
                "currency_name", "Dinars Algeriens"),
            late_fee_rate=invoice_data.get("late_fee_rate", 1),
            show_qr=include_qr,
            qr_code_base64=qr_code_base64,
            generated_at=datetime.now(timezone.utc).strftime(
                "%Y-%m-%d %H:%M:%S UTC")
        )

        # Generate PDF
        invoice_number = invoice_data.get("invoice_number", "DRAFT")
        filename = f"invoice_{invoice_number}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        output_path = self.output_dir / "invoices"
        output_path.mkdir(parents=True, exist_ok=True)
        filepath = output_path / filename

        self._html_to_pdf(html_content, str(filepath))

        return str(filepath)

    def render_invoice_html(
        self,
        invoice_data: Dict[str, Any],
        customer_data: Dict[str, Any],
        items_data: List[Dict[str, Any]],
        custom_template: Optional[str] = None
    ) -> str:
        """
        Render invoice HTML without converting to PDF.
        Useful for email or preview purposes.

        Args:
            invoice_data: Invoice information dictionary
            customer_data: Customer information dictionary
            items_data: List of invoice items
            custom_template: Optional custom template path

        Returns:
            Rendered HTML string
        """
        template_name = custom_template or "invoices/invoice.html"
        template = self.env.get_template(template_name)

        # Set status display if not provided
        if "status_display" not in invoice_data:
            invoice_data["status_display"] = self.STATUS_DISPLAY.get(
                invoice_data.get("status", "draft"),
                invoice_data.get("status", "Brouillon")
            )

        return template.render(
            invoice=invoice_data,
            customer=customer_data,
            items=items_data,
            company=self.company,
            bank=self.bank,
            currency=invoice_data.get("currency", "DZD"),
            currency_name=invoice_data.get(
                "currency_name", "Dinars Algeriens"),
            late_fee_rate=invoice_data.get("late_fee_rate", 1),
            show_qr=False,
            qr_code_base64=None,
            generated_at=datetime.now(timezone.utc).strftime(
                "%Y-%m-%d %H:%M:%S UTC")
        )

    def generate_custom_pdf(
        self,
        template_name: str,
        context: Dict[str, Any],
        output_filename: str,
        output_subdir: str = "custom"
    ) -> str:
        """
        Generate PDF from any custom template.

        Args:
            template_name: Template file name (relative to templates dir)
            context: Dictionary of variables to pass to template
            output_filename: Name for output PDF file
            output_subdir: Subdirectory in output_dir for the file

        Returns:
            Path to generated PDF file
        """
        template = self.env.get_template(template_name)

        # Add common context
        context.setdefault("company", self.company)
        context.setdefault("bank", self.bank)
        context.setdefault("generated_at", datetime.now(
            timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))

        html_content = template.render(**context)

        # Generate PDF
        output_path = self.output_dir / output_subdir
        output_path.mkdir(parents=True, exist_ok=True)
        filepath = output_path / output_filename

        self._html_to_pdf(html_content, str(filepath))

        return str(filepath)


# Singleton instance for easy importing
_html_pdf_service: Optional[HTMLPDFService] = None


def get_html_pdf_service(
    templates_dir: str = "app/templates",
    output_dir: str = "storage/pdfs"
) -> HTMLPDFService:
    """Get or create HTMLPDFService singleton."""
    global _html_pdf_service
    if _html_pdf_service is None:
        _html_pdf_service = HTMLPDFService(
            templates_dir=templates_dir,
            output_dir=output_dir
        )
    return _html_pdf_service
