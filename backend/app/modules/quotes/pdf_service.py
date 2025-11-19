"""
Quote PDF generation service.

Professional PDF templates for quotes with company info, customer details,
line items, financial calculations, terms & conditions, and signature area.
"""

from typing import List
from datetime import datetime
from pathlib import Path
from decimal import Decimal

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from app.modules.quotes.models import Quote, QuoteItem


class QuotePDFService:
    """Service for generating professional quote PDFs."""

    def __init__(self, output_dir: str = "storage/pdfs/quotes"):
        """Initialize PDF service with output directory."""
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        # Company name style
        self.styles.add(ParagraphStyle(
            name='CompanyName',
            parent=self.styles['Title'],
            fontSize=24,
            textColor=colors.HexColor('#1a56db'),
            spaceAfter=6,
            alignment=TA_CENTER,
        ))

        # Quote title style
        self.styles.add(ParagraphStyle(
            name='QuoteTitle',
            parent=self.styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1e3a8a'),
            spaceAfter=12,
            alignment=TA_CENTER,
        ))

        # Section heading style
        self.styles.add(ParagraphStyle(
            name='SectionHeading',
            parent=self.styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#1e40af'),
            spaceBefore=12,
            spaceAfter=6,
            leftIndent=0,
        ))

        # Small text style
        self.styles.add(ParagraphStyle(
            name='SmallText',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#6b7280'),
        ))

    def generate_quote_pdf(self, quote: Quote, customer_data: dict) -> str:
        """
        Generate complete quote PDF.

        Args:
            quote: Quote model instance with items loaded
            customer_data: Customer information dictionary

        Returns:
            Path to generated PDF file
        """
        # Generate filename
        filename = f"quote_{quote.quote_number}_v{quote.version}_{datetime.now().strftime('%Y%m%d')}.pdf"
        filepath = self.output_dir / filename

        # Create PDF document
        doc = SimpleDocTemplate(
            str(filepath),
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=15*mm,
            bottomMargin=20*mm,
        )

        elements = []

        # Build PDF sections
        elements.extend(self._create_header())
        elements.extend(self._create_quote_info(quote))
        elements.extend(self._create_customer_info(customer_data))
        elements.append(Spacer(1, 10))
        elements.extend(self._create_line_items_table(quote.items))
        elements.append(Spacer(1, 15))
        elements.extend(self._create_totals_section(quote))
        elements.append(Spacer(1, 20))
        elements.extend(self._create_terms_and_conditions())
        elements.append(Spacer(1, 20))
        elements.extend(self._create_signature_area())

        # Build PDF
        doc.build(elements)

        return str(filepath)

    def _create_header(self) -> List:
        """Create company information header."""
        elements = []

        # Company name
        company_name = Paragraph("CloudManager", self.styles['CompanyName'])
        elements.append(company_name)

        # Company details
        company_info = """
        <para align="center">
        <b>CloudManager SARL</b><br/>
        123 Rue Didouche Mourad, Algiers 16000, Algeria<br/>
        Tel: +213 (0) 21 123 456 | Fax: +213 (0) 21 123 457<br/>
        Email: contact@cloudmanager.dz | Web: www.cloudmanager.dz<br/>
        NIF: 001234567890123 | RC: 16/00-1234567 | AI: 16123456789012
        </para>
        """
        elements.append(Paragraph(company_info, self.styles['SmallText']))
        elements.append(Spacer(1, 15))

        # Horizontal line
        line_table = Table([['']], colWidths=[170*mm])
        line_table.setStyle(TableStyle([
            ('LINEBELOW', (0, 0), (-1, -1), 2, colors.HexColor('#1a56db')),
        ]))
        elements.append(line_table)
        elements.append(Spacer(1, 10))

        return elements

    def _create_quote_info(self, quote: Quote) -> List:
        """Create quote information section."""
        elements = []

        # Quote title
        title_text = f"QUOTE #{quote.quote_number}"
        if quote.version > 1:
            title_text += f" - Version {quote.version}"
        elements.append(Paragraph(title_text, self.styles['QuoteTitle']))
        elements.append(Spacer(1, 10))

        # Quote details table (2 columns)
        quote_date = quote.created_at.strftime('%d/%m/%Y')
        valid_from = quote.valid_from.strftime('%d/%m/%Y')
        valid_until = quote.valid_until.strftime('%d/%m/%Y')

        data = [
            ['Quote Date:', quote_date, 'Valid From:', valid_from],
            ['Status:', quote.status.value.replace('_', ' ').title(), 'Valid Until:', valid_until],
        ]

        quote_table = Table(data, colWidths=[35*mm, 45*mm, 35*mm, 45*mm])
        quote_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(quote_table)
        elements.append(Spacer(1, 15))

        return elements

    def _create_customer_info(self, customer_data: dict) -> List:
        """Create customer information section."""
        elements = []

        # Section heading
        elements.append(Paragraph('<b>Customer Information</b>', self.styles['SectionHeading']))

        # Customer details
        customer_name = customer_data.get('name', 'N/A')
        customer_email = customer_data.get('email', 'N/A')
        customer_phone = customer_data.get('phone', 'N/A')
        customer_address = customer_data.get('address', 'N/A')
        customer_city = customer_data.get('city', 'N/A')

        customer_info = f"""
        <b>{customer_name}</b><br/>
        {customer_address}<br/>
        {customer_city}<br/>
        Tel: {customer_phone}<br/>
        Email: {customer_email}
        """

        elements.append(Paragraph(customer_info, self.styles['Normal']))

        return elements

    def _create_line_items_table(self, items: List[QuoteItem]) -> List:
        """Create line items table."""
        elements = []

        # Section heading
        elements.append(Paragraph('<b>Quote Items</b>', self.styles['SectionHeading']))
        elements.append(Spacer(1, 8))

        # Table header
        data = [['#', 'Description', 'Qty', 'Unit Price', 'Total']]

        # Add items
        for idx, item in enumerate(items, 1):
            unit_price = float(item.unit_price)
            line_total = float(item.line_total)

            data.append([
                str(idx),
                item.description or 'N/A',
                str(int(item.quantity)),
                f"{unit_price:,.2f} DZD",
                f"{line_total:,.2f} DZD",
            ])

        # Create table
        table = Table(data, colWidths=[10*mm, 80*mm, 20*mm, 30*mm, 30*mm])

        # Style table
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            # Data rows
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Index column
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),    # Description column
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),  # Numeric columns
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.beige]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))

        elements.append(table)

        return elements

    def _create_totals_section(self, quote: Quote) -> List:
        """Create financial totals section."""
        elements = []

        subtotal = float(quote.subtotal_amount)
        tax_rate = float(quote.tax_rate)
        tax_amount = float(quote.tax_amount)
        discount = float(quote.discount_amount)
        total = float(quote.total_amount)

        # Build totals data
        data = [
            ['Subtotal:', f"{subtotal:,.2f} DZD"],
        ]

        if discount > 0:
            data.append(['Discount:', f"-{discount:,.2f} DZD"])

        data.extend([
            [f'Tax ({tax_rate}% TVA):', f"{tax_amount:,.2f} DZD"],
            ['', ''],  # Spacer row
            ['<b>TOTAL:</b>', f"<b>{total:,.2f} DZD</b>"],
        ])

        # Create totals table
        totals_table = Table(data, colWidths=[130*mm, 40*mm])

        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -2), 10),
            ('FONTSIZE', (0, -1), (-1, -1), 14),
            ('TEXTCOLOR', (0, 0), (-1, -2), colors.HexColor('#374151')),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#1e3a8a')),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#1e40af')),
            ('TOPPADDING', (0, -1), (-1, -1), 8),
        ]))

        elements.append(totals_table)

        return elements

    def _create_terms_and_conditions(self) -> List:
        """Create terms and conditions section."""
        elements = []

        # Section heading
        elements.append(Paragraph('<b>Terms and Conditions</b>', self.styles['SectionHeading']))
        elements.append(Spacer(1, 6))

        # Terms text
        terms = """
        1. <b>Quote Validity:</b> This quote is valid for the period specified above.
        After expiration, prices and availability may be subject to change.<br/>
        <br/>
        2. <b>Payment Terms:</b> Payment is due within 30 days of invoice date.
        Accepted payment methods include bank transfer and check.<br/>
        <br/>
        3. <b>Delivery:</b> Delivery times are estimates and may vary based on
        product availability and location. CloudManager will notify you of any delays.<br/>
        <br/>
        4. <b>Pricing:</b> All prices are in Algerian Dinars (DZD) and include
        applicable taxes unless otherwise stated.<br/>
        <br/>
        5. <b>Cancellation:</b> Quote cancellations must be submitted in writing.
        Cancellation fees may apply for customized orders.<br/>
        <br/>
        6. <b>Acceptance:</b> By accepting this quote, you agree to these terms
        and conditions. To accept, please sign below and return a copy to CloudManager.
        """

        terms_para = Paragraph(terms, self.styles['SmallText'])
        elements.append(terms_para)

        return elements

    def _create_signature_area(self) -> List:
        """Create digital signature area."""
        elements = []

        elements.append(Spacer(1, 15))

        # Signature table (2 columns)
        sig_data = [
            ['', ''],
            ['Customer Signature:', 'CloudManager Representative:'],
            ['', ''],
            ['', ''],
            ['Name: _____________________', 'Name: _____________________'],
            ['Date: _____________________', 'Date: _____________________'],
        ]

        sig_table = Table(sig_data, colWidths=[85*mm, 85*mm])
        sig_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LINEABOVE', (0, 2), (0, 2), 1, colors.black),
            ('LINEABOVE', (1, 2), (1, 2), 1, colors.black),
            ('TOPPADDING', (0, 2), (-1, 2), 15),
        ]))

        elements.append(sig_table)

        # Footer note
        elements.append(Spacer(1, 10))
        footer_text = """
        <para align="center">
        <i>This quote is electronically generated and is valid without signature.
        For acceptance, please sign and return to contact@cloudmanager.dz</i>
        </para>
        """
        elements.append(Paragraph(footer_text, self.styles['SmallText']))

        return elements
