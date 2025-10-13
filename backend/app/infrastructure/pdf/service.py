"""
PDF generation service.

Provides high-level API for generating PDF documents
such as invoices, quotes, and reports.
"""

import os
from typing import Dict, List
from datetime import datetime
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from app.infrastructure.pdf import templates


class PDFService:
    """
    PDF generation service.

    Handles creation of professional PDF documents for
    invoices, quotes, and other business documents.
    """

    def __init__(self, output_dir: str = "storage/pdfs"):
        """
        Initialize PDF service.

        Args:
            output_dir: Directory to save generated PDFs
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.styles = getSampleStyleSheet()

    def generate_invoice(
        self,
        invoice_number: str,
        customer: Dict,
        items: List[Dict],
        invoice_date: str = None,
        due_date: str = None,
    ) -> str:
        """
        Generate invoice PDF.

        Args:
            invoice_number: Invoice number
            customer: Customer information dictionary
            items: List of invoice items
            invoice_date: Invoice date (defaults to today)
            due_date: Payment due date

        Returns:
            Path to generated PDF file
        """
        # Default dates
        if not invoice_date:
            invoice_date = datetime.now().strftime("%Y-%m-%d")
        if not due_date:
            due_date = datetime.now().strftime("%Y-%m-%d")

        # Generate filename
        filename = f"invoice_{invoice_number}_{datetime.now().strftime('%Y%m%d')}.pdf"
        filepath = self.output_dir / filename

        # Create PDF document
        doc = SimpleDocTemplate(str(filepath), pagesize=A4)
        elements = []

        # Add header
        elements.extend(templates.create_invoice_header(self.styles))

        # Add invoice details
        elements.extend(
            templates.create_invoice_details(
                invoice_number, invoice_date, due_date, self.styles
            )
        )

        # Add customer details
        elements.extend(templates.create_customer_details(customer, self.styles))

        # Add items table
        elements.append(templates.create_items_table(items))
        elements.append(Spacer(1, 20))

        # Calculate totals
        subtotal = sum(item["amount"] for item in items)
        tax = subtotal * 0.19  # 19% TVA
        total = subtotal + tax

        # Add totals
        elements.append(templates.create_totals_table(subtotal, tax, total))

        # Build PDF
        doc.build(elements)

        return str(filepath)

    def generate_quote(
        self,
        quote_number: str,
        customer: Dict,
        items: List[Dict],
        valid_until: str = None,
    ) -> str:
        """
        Generate quote PDF.

        Args:
            quote_number: Quote number
            customer: Customer information dictionary
            items: List of quote items
            valid_until: Quote validity date

        Returns:
            Path to generated PDF file
        """
        # Use similar structure as invoice
        # This is a simplified version - can be expanded
        return self.generate_invoice(
            quote_number, customer, items, due_date=valid_until
        )

    def generate_report(
        self, title: str, data: Dict, filename: str = None
    ) -> str:
        """
        Generate custom report PDF.

        Args:
            title: Report title
            data: Report data dictionary
            filename: Custom filename (optional)

        Returns:
            Path to generated PDF file
        """
        if not filename:
            filename = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

        filepath = self.output_dir / filename

        # Create simple report
        doc = SimpleDocTemplate(str(filepath), pagesize=A4)
        elements = []

        # Add title
        from reportlab.platypus import Paragraph
        title_para = Paragraph(f"<b>{title}</b>", self.styles["Title"])
        elements.append(title_para)
        elements.append(Spacer(1, 20))

        # Add data (simplified)
        for key, value in data.items():
            para = Paragraph(f"<b>{key}:</b> {value}", self.styles["Normal"])
            elements.append(para)
            elements.append(Spacer(1, 10))

        doc.build(elements)

        return str(filepath)

    def delete_pdf(self, filepath: str) -> bool:
        """
        Delete generated PDF file.

        Args:
            filepath: Path to PDF file

        Returns:
            True if file deleted successfully
        """
        try:
            os.remove(filepath)
            return True
        except Exception as e:
            print(f"❌ Error deleting PDF: {e}")
            return False
