"""
Safe Order — PDF generation (FR-06).

Builds a printable A6 tracking label that the merchant sticks on the package.
Designed to be readable on cheap thermal printers — minimal vector ink, no
images, dense layout. The customer's tracking code doubles as a barcode-style
banner so couriers can scan/copy quickly.
"""
from __future__ import annotations
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A6
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

NAVY = HexColor("#0D3B66")
GREEN = HexColor("#0D6E3F")
GOLD = HexColor("#F0AE1A")
DARK = HexColor("#0f172a")
GREY = HexColor("#64748b")


def _wrap(c: canvas.Canvas, text: str, x: float, y: float, max_width: float, font: str, size: float, leading: float) -> float:
    """Hand-rolled word wrap; reportlab's textwrap helpers don't measure on Canvas."""
    if not text:
        return y
    c.setFont(font, size)
    words = text.split()
    line: list[str] = []
    for word in words:
        candidate = " ".join(line + [word])
        if c.stringWidth(candidate, font, size) > max_width and line:
            c.drawString(x, y, " ".join(line))
            y -= leading
            line = [word]
        else:
            line.append(word)
    if line:
        c.drawString(x, y, " ".join(line))
        y -= leading
    return y


def generate_tracking_label(order, merchant, store_name: str | None = None) -> bytes:
    """
    Render a single-page A6 tracking slip.

    Args:
        order:        an `app.models.Order` instance (must be filled — needs customer info).
        merchant:     the merchant `User`.
        store_name:   merchant's store name (from MerchantProfile).

    Returns:
        PDF bytes ready to be served as `application/pdf`.
    """
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A6)
    width, height = A6
    margin = 6 * mm

    # ── Header bar ──
    c.setFillColor(NAVY)
    c.rect(0, height - 14 * mm, width, 14 * mm, fill=1, stroke=0)
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin, height - 9 * mm, "🛡 Safe Order")
    c.setFont("Helvetica", 8)
    c.drawRightString(width - margin, height - 9 * mm, datetime.utcnow().strftime("%d/%m/%Y %H:%M"))

    y = height - 14 * mm - 4 * mm

    # ── Tracking code (large, scan-friendly) ──
    c.setFillColor(DARK)
    c.setFont("Helvetica", 6)
    c.drawString(margin, y, "TRACKING CODE")
    y -= 6 * mm
    c.setFillColor(NAVY)
    c.setFont("Courier-Bold", 22)
    c.drawString(margin, y, order.tracking_code or "—")
    y -= 6 * mm

    # Thin separator
    c.setStrokeColor(HexColor("#e2e8f0"))
    c.setLineWidth(0.4)
    c.line(margin, y, width - margin, y)
    y -= 4 * mm

    # ── Recipient ──
    c.setFillColor(GREY)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(margin, y, "DESTINATAIRE")
    y -= 4 * mm
    c.setFillColor(DARK)
    full_name = f"{order.customer_first_name or ''} {order.customer_last_name or ''}".strip() or "—"
    c.setFont("Helvetica-Bold", 11)
    c.drawString(margin, y, full_name)
    y -= 4.5 * mm

    c.setFont("Helvetica", 9)
    if order.customer_phone:
        c.drawString(margin, y, f"📞 {order.customer_phone}")
        y -= 4 * mm
    address_parts = [order.customer_address, order.customer_municipality, order.customer_wilaya]
    address_line = ", ".join(p for p in address_parts if p)
    y = _wrap(c, address_line or "—", margin, y, width - 2 * margin, "Helvetica", 9, 4 * mm)

    y -= 2 * mm
    c.setStrokeColor(HexColor("#e2e8f0"))
    c.line(margin, y, width - margin, y)
    y -= 4 * mm

    # ── Sender (merchant) ──
    c.setFillColor(GREY)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(margin, y, "EXPÉDITEUR")
    y -= 4 * mm
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, y, store_name or f"{merchant.first_name} {merchant.last_name}")
    y -= 4 * mm
    c.setFont("Helvetica", 9)
    if merchant.phone:
        c.drawString(margin, y, f"📞 {merchant.phone}")
        y -= 4 * mm
    sender_addr = ", ".join(p for p in [merchant.address, merchant.municipality, merchant.wilaya] if p)
    if sender_addr:
        y = _wrap(c, sender_addr, margin, y, width - 2 * margin, "Helvetica", 9, 4 * mm)

    y -= 2 * mm
    c.setStrokeColor(HexColor("#e2e8f0"))
    c.line(margin, y, width - margin, y)
    y -= 4 * mm

    # ── Product + financial summary ──
    c.setFillColor(GREY)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(margin, y, "PRODUIT")
    y -= 4 * mm
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 10)
    y = _wrap(c, order.product_name or "—", margin, y, width - 2 * margin, "Helvetica-Bold", 10, 4 * mm)

    y -= 1 * mm
    c.setFont("Helvetica", 9)
    c.setFillColor(GREY)
    c.drawString(margin, y, "Prix")
    c.setFillColor(DARK)
    c.drawRightString(width - margin, y, f"{(order.product_price or 0):,.0f} DA")
    y -= 4 * mm

    c.setFillColor(GREY)
    c.drawString(margin, y, "Livraison")
    c.setFillColor(DARK)
    c.drawRightString(width - margin, y, f"{(order.delivery_fee or 0):,.0f} DA")
    y -= 4 * mm

    if order.safe_pay_amount and order.safe_pay_amount > 0:
        c.setFillColor(GREEN)
        c.drawString(margin, y, "Safe Pay (acompte)")
        c.drawRightString(width - margin, y, f"-{order.safe_pay_amount:,.0f} DA")
        y -= 4 * mm

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(NAVY)
    c.drawString(margin, y, "À ENCAISSER")
    c.drawRightString(width - margin, y, f"{(order.remaining_amount or 0):,.0f} DA")
    y -= 6 * mm

    # ── Delivery company strip ──
    if order.delivery_company:
        c.setFillColor(GOLD)
        c.rect(margin, y - 6 * mm, width - 2 * margin, 6 * mm, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(width / 2, y - 4 * mm, f"Livreur : {order.delivery_company.upper()}")
        y -= 8 * mm

    if order.customer_remark:
        c.setFillColor(GREY)
        c.setFont("Helvetica", 8)
        y = _wrap(c, f"Remarque : {order.customer_remark}", margin, y, width - 2 * margin, "Helvetica-Oblique", 8, 3.5 * mm)

    # Footer
    c.setFillColor(GREY)
    c.setFont("Helvetica", 6)
    c.drawCentredString(width / 2, 4 * mm, f"safeorder.dz · {order.tracking_code}")

    c.showPage()
    c.save()
    return buf.getvalue()
