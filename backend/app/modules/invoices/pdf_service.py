"""
Invoice PDF generation service.

Professional PDF templates for invoices with payment details, bank info,
tax calculations, and optional QR codes.
"""

from typing import List, Optional
from datetime import datetime
from pathlib import Path
from decimal import Decimal
import qrcode
from io import BytesIO

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

from app.modules.invoices.models import Invoice, InvoiceItem


class InvoicePDFService:
    """Service for generating professional invoice PDFs."""

    def __init__(self, output_dir: str = "storage/pdfs/invoices"):
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

        # Invoice title style
        self.styles.add(ParagraphStyle(
            name='InvoiceTitle',
            parent=self.styles['Heading1'],
            fontSize=22,
            textColor=colors.HexColor('#dc2626'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
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

        # Payment highlight style
        self.styles.add(ParagraphStyle(
            name='PaymentHighlight',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#dc2626'),
            fontName='Helvetica-Bold',
        ))

    def generate_invoice_pdf(
        self,
        invoice: Invoice,
        customer_data: dict,
        include_qr: bool = True
    ) -> str:
        """
        Generate complete invoice PDF.

        Args:
            invoice: Invoice model instance with items loaded
            customer_data: Customer information dictionary
            include_qr: Whether to include QR code for payment

        Returns:
            Path to generated PDF file
        """
        # Generate filename
        filename = f"invoice_{invoice.invoice_number}_{datetime.now().strftime('%Y%m%d')}.pdf"
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
        elements.extend(self._create_invoice_info(invoice))
        elements.extend(self._create_customer_info(customer_data))
        elements.append(Spacer(1, 10))
        elements.extend(self._create_line_items_table(invoice.items))
        elements.append(Spacer(1, 15))
        elements.extend(self._create_tax_summary(invoice))
        elements.append(Spacer(1, 20))
        elements.extend(self._create_payment_section(invoice, include_qr))
        elements.append(Spacer(1, 15))
        elements.extend(self._create_bank_details())
        elements.append(Spacer(1, 15))
        elements.extend(self._create_payment_terms(invoice))

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
        Email: billing@cloudmanager.dz | Web: www.cloudmanager.dz<br/>
        NIF: 001234567890123 | RC: 16/00-1234567 | AI: 16123456789012
        </para>
        """
        elements.append(Paragraph(company_info, self.styles['SmallText']))
        elements.append(Spacer(1, 15))

        # Horizontal line
        line_table = Table([['']], colWidths=[170*mm])
        line_table.setStyle(TableStyle([
            ('LINEBELOW', (0, 0), (-1, -1), 2, colors.HexColor('#dc2626')),
        ]))
        elements.append(line_table)
        elements.append(Spacer(1, 10))

        return elements

    def _create_invoice_info(self, invoice: Invoice) -> List:
        """Create invoice information section."""
        elements = []

        # Invoice title
        title_text = f"INVOICE #{invoice.invoice_number}"
        elements.append(Paragraph(title_text, self.styles['InvoiceTitle']))
        elements.append(Spacer(1, 10))

        # Invoice details table (2 columns)
        invoice_date = invoice.issue_date.strftime('%d/%m/%Y')
        due_date = invoice.due_date.strftime('%d/%m/%Y')

        # Calculate days until due
        days_until_due = (invoice.due_date - datetime.now(invoice.issue_date.tzinfo)).days

        data = [
            ['Invoice Date:', invoice_date, 'Due Date:', due_date],
            ['Status:', invoice.status.value.replace('_', ' ').title(),
             'Payment Due:', f'{days_until_due} days' if days_until_due > 0 else 'OVERDUE'],
        ]

        invoice_table = Table(data, colWidths=[35*mm, 45*mm, 35*mm, 45*mm])
        invoice_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(invoice_table)
        elements.append(Spacer(1, 15))

        return elements

    def _create_customer_info(self, customer_data: dict) -> List:
        """Create customer information section."""
        elements = []

        # Section heading
        elements.append(Paragraph('<b>Bill To:</b>', self.styles['SectionHeading']))

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

    def _create_line_items_table(self, items: List[InvoiceItem]) -> List:
        """Create line items table."""
        elements = []

        # Section heading
        elements.append(Paragraph('<b>Invoice Items</b>', self.styles['SectionHeading']))
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
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
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

    def _create_tax_summary(self, invoice: Invoice) -> List:
        """Create tax summary and totals section."""
        elements = []

        subtotal = float(invoice.subtotal_amount)
        tax_rate = float(invoice.tax_rate)
        tax_amount = float(invoice.tax_amount)
        discount = float(invoice.discount_amount)
        total = float(invoice.total_amount)
        paid = float(invoice.paid_amount)
        balance = total - paid

        # Build tax summary data
        data = [
            ['<b>Tax Breakdown & Summary</b>', ''],
        ]

        # Subtotal
        data.append(['Subtotal:', f"{subtotal:,.2f} DZD"])

        # Discount if any
        if discount > 0:
            data.append(['Discount:', f"-{discount:,.2f} DZD"])
            after_discount = subtotal - discount
            data.append(['After Discount:', f"{after_discount:,.2f} DZD"])

        # Tax breakdown (TVA)
        data.append(['', ''])  # Spacer
        data.append(['<b>TAX DETAILS:</b>', ''])
        data.append([f'TVA ({tax_rate}%):', f"{tax_amount:,.2f} DZD"])

        # TAP calculation (0.5% of subtotal for demonstration)
        tap_amount = subtotal * Decimal('0.005')
        data.append(['TAP (0.5%):', f"{float(tap_amount):,.2f} DZD"])

        # Total tax
        total_tax = tax_amount + float(tap_amount)
        data.append(['<b>Total Tax:</b>', f"<b>{total_tax:,.2f} DZD</b>"])

        # Grand total
        data.append(['', ''])  # Spacer
        grand_total = subtotal - discount + total_tax
        data.append(['<b>GRAND TOTAL:</b>', f"<b>{grand_total:,.2f} DZD</b>"])

        # Payment status
        if paid > 0:
            data.append(['', ''])  # Spacer
            data.append(['Paid Amount:', f"{paid:,.2f} DZD"])
            data.append(['<b>BALANCE DUE:</b>', f"<b>{balance:,.2f} DZD</b>"])

        # Create totals table
        totals_table = Table(data, colWidths=[130*mm, 40*mm])

        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#374151')),
            # Bold rows
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 14),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#dc2626')),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#dc2626')),
            ('TOPPADDING', (0, -1), (-1, -1), 8),
        ]))

        elements.append(totals_table)

        return elements

    def _create_payment_section(self, invoice: Invoice, include_qr: bool) -> List:
        """Create payment instructions section with optional QR code."""
        elements = []

        # Section heading
        elements.append(Paragraph('<b>Payment Instructions</b>', self.styles['SectionHeading']))
        elements.append(Spacer(1, 6))

        # Create two-column layout for payment info and QR code
        payment_data = []

        # Payment instructions text
        due_date_str = invoice.due_date.strftime('%d %B %Y')
        balance = float(invoice.total_amount - invoice.paid_amount)

        payment_text = f"""
        <b>Amount Due:</b> {balance:,.2f} DZD<br/>
        <b>Due Date:</b> {due_date_str}<br/>
        <br/>
        <b>Payment Methods Accepted:</b><br/>
        • Bank Transfer (preferred)<br/>
        • Check<br/>
        • Cash<br/>
        <br/>
        <b>Payment Reference:</b> {invoice.invoice_number}<br/>
        <i>Please include invoice number in payment reference</i>
        """

        payment_para = Paragraph(payment_text, self.styles['Normal'])

        if include_qr and balance > 0:
            # Generate QR code for payment
            qr_image = self._generate_qr_code(invoice)
            payment_data = [[payment_para, qr_image]]

            payment_table = Table(payment_data, colWidths=[120*mm, 50*mm])
            payment_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ]))
            elements.append(payment_table)
        else:
            elements.append(payment_para)

        return elements

    def _generate_qr_code(self, invoice: Invoice) -> Image:
        """Generate QR code for payment."""
        # Create payment data string
        payment_data = f"INV:{invoice.invoice_number}|AMT:{float(invoice.total_amount - invoice.paid_amount):.2f}|DUE:{invoice.due_date.strftime('%Y%m%d')}"

        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(payment_data)
        qr.make(fit=True)

        # Create image
        img = qr.make_image(fill_color="black", back_color="white")

        # Save to BytesIO
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        # Create ReportLab Image
        qr_image = Image(buffer, width=40*mm, height=40*mm)

        return qr_image

    def _create_bank_details(self) -> List:
        """Create bank details section."""
        elements = []

        # Section heading
        elements.append(Paragraph('<b>Bank Details for Transfer</b>', self.styles['SectionHeading']))
        elements.append(Spacer(1, 6))

        # Bank details table
        bank_data = [
            ['Bank Name:', 'Banque Nationale d\'Algérie (BNA)'],
            ['Account Name:', 'CloudManager SARL'],
            ['Account Number:', '007 123 456789 01'],
            ['SWIFT/BIC:', 'BNAADZAL'],
            ['IBAN:', 'DZ59 0001 2345 6789 0123 4567'],
            ['Branch:', 'Didouche Mourad, Algiers'],
        ]

        bank_table = Table(bank_data, colWidths=[40*mm, 130*mm])
        bank_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))

        elements.append(bank_table)

        return elements

    def _create_payment_terms(self, invoice: Invoice) -> List:
        """Create payment terms and conditions."""
        elements = []

        # Section heading
        elements.append(Paragraph('<b>Payment Terms & Conditions</b>', self.styles['SectionHeading']))
        elements.append(Spacer(1, 6))

        # Terms text
        due_days = (invoice.due_date - invoice.issue_date).days

        terms = f"""
        1. <b>Payment Due:</b> Payment is due within {due_days} days of invoice date.
        Late payments may incur interest charges.<br/>
        <br/>
        2. <b>Currency:</b> All amounts are in Algerian Dinars (DZD) and include
        applicable taxes (TVA and TAP) as shown in the tax breakdown.<br/>
        <br/>
        3. <b>Late Payment:</b> Invoices not paid by the due date will accrue interest
        at 1% per month on the outstanding balance.<br/>
        <br/>
        4. <b>Disputes:</b> Any disputes regarding this invoice must be raised in writing
        within 7 days of the invoice date.<br/>
        <br/>
        5. <b>Receipt:</b> Payment receipt will be issued upon clearance of funds.
        Please retain this invoice for your records.<br/>
        <br/>
        <i>Thank you for your business. For questions regarding this invoice,
        please contact billing@cloudmanager.dz or call +213 (0) 21 123 456.</i>
        """

        terms_para = Paragraph(terms, self.styles['SmallText'])
        elements.append(terms_para)

        # Footer
        elements.append(Spacer(1, 10))
        footer_text = """
        <para align="center">
        <b>CloudManager SARL</b> | NIF: 001234567890123 | RC: 16/00-1234567<br/>
        <i>This is a computer-generated invoice and is valid without signature.</i>
        </para>
        """
        elements.append(Paragraph(footer_text, self.styles['SmallText']))

        return elements
