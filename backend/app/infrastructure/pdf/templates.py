"""
PDF templates for invoices and quotes.

Uses ReportLab for PDF generation with professional layouts.
"""

from typing import List, Dict
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    Image,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT


def create_invoice_header(styles) -> List:
    """
    Create invoice header section.

    Args:
        styles: ReportLab styles

    Returns:
        List of flowables for header
    """
    elements = []

    # Company name
    title = Paragraph("CloudManager", styles["Title"])
    elements.append(title)
    elements.append(Spacer(1, 12))

    # Company details
    company_info = """
    CloudManager SARL<br/>
    123 Rue de la République<br/>
    16000 Algiers, Algeria<br/>
    Tel: +213 (0) 21 123 456<br/>
    Email: contact@cloudmanager.dz
    """
    company = Paragraph(company_info, styles["Normal"])
    elements.append(company)
    elements.append(Spacer(1, 20))

    return elements


def create_invoice_details(
    invoice_number: str, invoice_date: str, due_date: str, styles
) -> List:
    """
    Create invoice details section.

    Args:
        invoice_number: Invoice number
        invoice_date: Invoice date
        due_date: Due date
        styles: ReportLab styles

    Returns:
        List of flowables for details
    """
    elements = []

    # Invoice title
    title = Paragraph(f"<b>INVOICE #{invoice_number}</b>", styles["Heading1"])
    elements.append(title)
    elements.append(Spacer(1, 12))

    # Dates
    details = f"""
    <b>Invoice Date:</b> {invoice_date}<br/>
    <b>Due Date:</b> {due_date}<br/>
    """
    elements.append(Paragraph(details, styles["Normal"]))
    elements.append(Spacer(1, 20))

    return elements


def create_customer_details(customer: Dict, styles) -> List:
    """
    Create customer details section.

    Args:
        customer: Customer information dictionary
        styles: ReportLab styles

    Returns:
        List of flowables for customer details
    """
    elements = []

    # Bill to
    elements.append(Paragraph("<b>Bill To:</b>", styles["Heading2"]))
    elements.append(Spacer(1, 6))

    customer_info = f"""
    {customer.get('name', '')}<br/>
    {customer.get('address', '')}<br/>
    {customer.get('city', '')}, {customer.get('zip_code', '')}<br/>
    Tel: {customer.get('phone', '')}<br/>
    Email: {customer.get('email', '')}
    """
    elements.append(Paragraph(customer_info, styles["Normal"]))
    elements.append(Spacer(1, 20))

    return elements


def create_items_table(items: List[Dict]) -> Table:
    """
    Create invoice items table.

    Args:
        items: List of invoice items

    Returns:
        Table flowable with items
    """
    # Table header
    data = [["Description", "Quantity", "Unit Price", "Amount"]]

    # Add items
    for item in items:
        data.append([
            item["description"],
            str(item["quantity"]),
            f"{item['unit_price']:,.2f} DZD",
            f"{item['amount']:,.2f} DZD",
        ])

    # Create table
    table = Table(data, colWidths=[100 * mm, 30 * mm, 35 * mm, 35 * mm])

    # Style table
    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 12),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
            ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ])
    )

    return table


def create_totals_table(subtotal: float, tax: float, total: float) -> Table:
    """
    Create totals table.

    Args:
        subtotal: Subtotal amount
        tax: Tax amount
        total: Total amount

    Returns:
        Table flowable with totals
    """
    data = [
        ["Subtotal:", f"{subtotal:,.2f} DZD"],
        ["Tax (19% TVA):", f"{tax:,.2f} DZD"],
        ["Total:", f"{total:,.2f} DZD"],
    ]

    table = Table(data, colWidths=[140 * mm, 60 * mm])

    table.setStyle(
        TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, -1), (-1, -1), 14),
            ("LINEABOVE", (0, -1), (-1, -1), 2, colors.black),
        ])
    )

    return table
