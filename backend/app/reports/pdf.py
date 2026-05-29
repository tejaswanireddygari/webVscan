from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

SEV_COLOR = {
    "critical": colors.HexColor("#7f1d1d"),
    "high":     colors.HexColor("#b91c1c"),
    "medium":   colors.HexColor("#b45309"),
    "low":      colors.HexColor("#15803d"),
    "info":     colors.HexColor("#1e40af"),
}

def build_report(scan, vulns) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title=f"Sentinel AI Report - Scan #{scan.id}")
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"], textColor=colors.HexColor("#0f172a"))
    body = styles["BodyText"]
    story = []

    story.append(Paragraph("Sentinel AI — Vulnerability Report", h1))
    story.append(Paragraph(f"Target: <b>{scan.target_url}</b>", body))
    story.append(Paragraph(f"Scan #{scan.id} · profile <b>{scan.profile}</b> · status <b>{scan.status}</b>", body))
    story.append(Paragraph(f"Started: {scan.started_at}  ·  Finished: {scan.finished_at or '-'}", body))
    story.append(Spacer(1, 0.5 * cm))

    summary = scan.summary or {}
    counts = summary.get("counts", {})
    data = [["Severity", "Count"]] + [[s.upper(), str(counts.get(s, 0))] for s in ["critical","high","medium","low","info"]]
    tbl = Table(data, colWidths=[6*cm, 3*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR",  (0,0), (-1,0), colors.white),
        ("GRID",       (0,0), (-1,-1), 0.25, colors.grey),
        ("FONTNAME",   (0,0), (-1,0), "Helvetica-Bold"),
    ]))
    story.append(tbl)
    story.append(PageBreak())

    story.append(Paragraph("Findings", h1))
    for v in vulns:
        title_style = ParagraphStyle(f"t{v.id}", parent=styles["Heading3"], textColor=SEV_COLOR.get(v.severity, colors.black))
        story.append(Paragraph(f"[{v.severity.upper()}] {v.title}", title_style))
        story.append(Paragraph(f"<b>Type:</b> {v.type}  ·  <b>CVSS:</b> {v.cvss}  ·  <b>ML confidence:</b> {v.ml_confidence:.2%}", body))
        story.append(Paragraph(f"<b>URL:</b> {v.url}", body))
        story.append(Paragraph(f"<b>Description:</b> {v.description}", body))
        if v.evidence:
            story.append(Paragraph(f"<b>Evidence:</b> <font name='Courier'>{v.evidence[:500]}</font>", body))
        story.append(Paragraph(f"<b>Remediation:</b> {v.remediation}", body))
        if v.ai_insight:
            story.append(Paragraph(f"<i>{v.ai_insight}</i>", body))
        story.append(Spacer(1, 0.4 * cm))

    if not vulns:
        story.append(Paragraph("No vulnerabilities detected.", body))

    doc.build(story)
    return buf.getvalue()
