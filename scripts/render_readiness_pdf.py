"""Render the deployment report into a paginated, printable PDF."""
from pathlib import Path
from html import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.units import mm

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "DEPLOYMENT-READINESS-REPORT-2026-11-18.md"
TARGET = ROOT / "output" / "pdf" / "MEDORA-DEPLOYMENT-READINESS-2026-11-18.pdf"
TARGET.parent.mkdir(parents=True, exist_ok=True)

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="ReportTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=19, leading=24, textColor=colors.HexColor("#123b24"), spaceAfter=14))
styles.add(ParagraphStyle(name="ReportSection", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=colors.HexColor("#146334"), spaceBefore=10, spaceAfter=5))
styles.add(ParagraphStyle(name="ReportBody", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.5, leading=11.5, textColor=colors.HexColor("#23352a"), spaceAfter=5))
styles.add(ParagraphStyle(name="ReportCell", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=colors.HexColor("#23352a")))

def paragraph(value, style="ReportBody"):
    return Paragraph(escape(value).replace("`", ""), styles[style])

lines = SOURCE.read_text(encoding="utf-8").splitlines()
story = []
i = 0
while i < len(lines):
    line = lines[i].strip()
    if not line:
        i += 1
        continue
    if line.startswith("# "):
        story.append(paragraph(line[2:], "ReportTitle"))
    elif line.startswith("## "):
        story.append(paragraph(line[3:], "ReportSection"))
    elif line.startswith("| "):
        rows = []
        while i < len(lines) and lines[i].strip().startswith("| "):
            cells = [cell.strip() for cell in lines[i].strip().strip("|").split("|")]
            if not all(set(cell) <= {"-", ":", " "} for cell in cells):
                rows.append([paragraph(cell, "ReportCell") for cell in cells])
            i += 1
        width = 174 * mm
        col_widths = [width * n for n in ([.18, .4, .19, .23] if len(rows[0]) == 4 else [1 / len(rows[0])] * len(rows[0]))]
        table = Table(rows, colWidths=col_widths, repeatRows=1, hAlign="LEFT")
        table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e5f1e8")), ("GRID", (0, 0), (-1, -1), .35, colors.HexColor("#d5e3d9")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
        story.append(table)
        continue
    elif line.startswith("- "):
        story.append(paragraph("- " + line[2:]))
    elif line[:2].isdigit() and ". " in line[:4]:
        story.append(paragraph(line))
    else:
        story.append(paragraph(line))
    i += 1

def footer(canvas, doc):
    canvas.setStrokeColor(colors.HexColor("#d7e6db"))
    canvas.line(18 * mm, 18 * mm, 192 * mm, 18 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#607568"))
    canvas.drawString(18 * mm, 12 * mm, "Medora HMS | Deployment readiness | 18 Nov 2026")
    canvas.drawRightString(192 * mm, 12 * mm, f"Page {doc.page}")

SimpleDocTemplate(str(TARGET), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=16 * mm, bottomMargin=22 * mm, title="Medora HMS Deployment Readiness").build(story, onFirstPage=footer, onLaterPages=footer)
print(TARGET)
