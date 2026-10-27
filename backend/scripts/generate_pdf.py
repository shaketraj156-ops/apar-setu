import re
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748B"))
        # Header
        self.drawString(54, 750, "APAARSetu - Dev 2 (Backend) Complete Work & System Guide")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 742, 612 - 54, 742)
        # Footer
        self.line(54, 45, 612 - 54, 45)
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 32, page_text)
        self.drawString(54, 32, "CONFIDENTIAL - AICTE APAARSetu Hackathon Team")
        self.restoreState()

def md_to_pdf(md_path, pdf_path):
    text = Path(md_path).read_text(encoding="utf-8")
    lines = text.splitlines()

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=6
    )
    
    h1_style = ParagraphStyle(
        'DocH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1E3A8A"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#2563EB"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=4
    )
    
    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#475569")
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1E293B")
    )
    
    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    story = []

    def format_inline(s):
        s = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
        s = re.sub(r'`(.+?)`', r'<font face="Courier" color="#B91C1C"><b>\1</b></font>', s)
        return s

    in_table = False
    table_rows = []

    for line in lines:
        sline = line.strip()

        # Handle Tables
        if sline.startswith('|') and sline.endswith('|'):
            cells = [c.strip() for c in sline[1:-1].split('|')]
            if all(re.match(r'^:?-+:?$', c) for c in cells):
                continue
            table_rows.append(cells)
            in_table = True
            continue
        elif in_table:
            if table_rows:
                # render table
                processed = []
                for idx, r in enumerate(table_rows):
                    row_cells = []
                    is_head = (idx == 0)
                    for c in r:
                        style = table_header if is_head else table_cell
                        row_cells.append(Paragraph(format_inline(c), style))
                    processed.append(row_cells)
                
                # Column widths estimation (total printable width = 504)
                num_cols = len(table_rows[0])
                if num_cols == 2:
                    col_widths = [140, 364]
                elif num_cols == 3:
                    col_widths = [70, 160, 274]
                else:
                    col_widths = [504 / num_cols] * num_cols

                t = Table(processed, colWidths=col_widths)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('LEFTPADDING', (0, 0), (-1, -1), 5),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                ]))
                story.append(Spacer(1, 6))
                story.append(t)
                story.append(Spacer(1, 6))
            in_table = False
            table_rows = []

        if not sline:
            story.append(Spacer(1, 4))
            continue

        if sline.startswith('# '):
            story.append(Spacer(1, 10))
            story.append(Paragraph(format_inline(sline[2:]), title_style))
            story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563EB"), spaceBefore=3, spaceAfter=8))
        elif sline.startswith('## '):
            story.append(Paragraph(format_inline(sline[3:]), h1_style))
        elif sline.startswith('### '):
            story.append(Paragraph(format_inline(sline[4:]), h2_style))
        elif sline.startswith('- ') or sline.startswith('* '):
            formatted = "&bull; " + format_inline(sline[2:])
            story.append(Paragraph(formatted, bullet_style))
        elif re.match(r'^\d+\.\s', sline):
            num, rest = sline.split('.', 1)
            formatted = f"<b>{num}.</b> " + format_inline(rest.strip())
            story.append(Paragraph(formatted, bullet_style))
        else:
            story.append(Paragraph(format_inline(sline), body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF successfully generated at:", pdf_path)

if __name__ == "__main__":
    src = Path("backend/DEV2_COMPLETE_HANDOFF_DOC.md")
    dst = Path("backend/APAARSetu_Dev2_Backend_Complete_Guide.pdf")
    md_to_pdf(src, dst)
