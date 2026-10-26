"""CSV / Excel / PDF export for report rows (list of dicts from the v_* views)."""
from __future__ import annotations

import io
from datetime import date, datetime
from typing import Any, Iterable

import pandas as pd


def _filter(rows: list[dict], filters: dict[str, Any] | None, date_field: str | None,
            date_from: date | None, date_to: date | None) -> pd.DataFrame:
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    for col, val in (filters or {}).items():
        if val is not None and col in df.columns:
            df = df[df[col].isin(val if isinstance(val, (list, tuple, set)) else [val])]
    if date_field and date_field in df.columns and (date_from or date_to):
        d = pd.to_datetime(df[date_field], errors="coerce").dt.date
        if date_from:
            df = df[d >= date_from]
        if date_to:
            df = df[d <= date_to]
    return df.reset_index(drop=True)


def _flatten(df: pd.DataFrame) -> pd.DataFrame:
    """Lists/dicts (e.g. institutions array) -> readable strings."""
    return df.apply(lambda c: c.map(lambda v: ", ".join(map(str, v)) if isinstance(v, (list, tuple))
                                    else (str(v) if isinstance(v, dict) else v)))


def export_csv(rows, filters=None, date_field=None, date_from=None, date_to=None) -> bytes:
    df = _flatten(_filter(rows, filters, date_field, date_from, date_to))
    return df.to_csv(index=False).encode("utf-8")


def export_excel(rows, title="Report", filters=None, date_field=None, date_from=None, date_to=None) -> bytes:
    df = _flatten(_filter(rows, filters, date_field, date_from, date_to))
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as xw:
        df.to_excel(xw, index=False, sheet_name=title[:31] or "Report")
        ws = xw.sheets[title[:31] or "Report"]
        for i, col in enumerate(df.columns, start=1):
            width = max([len(str(col))] + [len(str(v)) for v in df[col].head(200)]) + 2
            ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = min(width, 48)
    return buf.getvalue()


def export_pdf(rows, title="SNAP Report", filters=None, date_field=None, date_from=None, date_to=None) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    df = _flatten(_filter(rows, filters, date_field, date_from, date_to))
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=24, rightMargin=24, topMargin=24, bottomMargin=24)
    styles = getSampleStyleSheet()
    story = [Paragraph(title, styles["Title"]),
             Paragraph(f"Generated {datetime.now():%Y-%m-%d %H:%M} · {len(df)} row(s)", styles["Normal"]),
             Spacer(1, 12)]
    if df.empty:
        story.append(Paragraph("No data for the selected filters.", styles["Normal"]))
    else:
        data = [list(df.columns)] + df.astype(str).values.tolist()
        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f5fa")]),
        ]))
        story.append(t)
    doc.build(story)
    return buf.getvalue()


EXPORTERS = {"csv": (export_csv, "text/csv"),
             "xlsx": (export_excel, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
             "pdf": (export_pdf, "application/pdf")}
