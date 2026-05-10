"""
Safe Order — Customer-remark date extraction (FR-06).

Detects free-text dates like "le 15/05" or "20-05-2025" inside a customer
remark and returns the next matching date in the future. Used to schedule
the D-1 alert for the merchant.
"""
from __future__ import annotations
import re
from datetime import datetime, date, timedelta
from typing import Optional


_DATE_PATTERNS = [
    # 15/05/2025, 15-05-25, 15.5.2025, 5/05
    re.compile(r"\b(?P<day>\d{1,2})[/\-.](?P<month>\d{1,2})(?:[/\-.](?P<year>\d{2,4}))?\b"),
]

# Bilingual month names for "le 15 mai" / "15 May" patterns.
_MONTH_NAMES = {
    "janvier": 1, "january": 1, "jan": 1, "janv": 1,
    "février": 2, "fevrier": 2, "february": 2, "feb": 2, "févr": 2, "fevr": 2,
    "mars": 3, "march": 3, "mar": 3,
    "avril": 4, "april": 4, "apr": 4, "avr": 4,
    "mai": 5, "may": 5,
    "juin": 6, "june": 6, "jun": 6,
    "juillet": 7, "july": 7, "jul": 7, "juil": 7,
    "août": 8, "aout": 8, "august": 8, "aug": 8,
    "septembre": 9, "september": 9, "sep": 9, "sept": 9,
    "octobre": 10, "october": 10, "oct": 10,
    "novembre": 11, "november": 11, "nov": 11,
    "décembre": 12, "decembre": 12, "december": 12, "dec": 12, "déc": 12,
}

_NAMED_PATTERN = re.compile(
    r"\b(?P<day>\d{1,2})\s+(?P<month>[A-Za-zÀ-ÿ]+)(?:\s+(?P<year>\d{2,4}))?\b",
    re.IGNORECASE,
)


def extract_delivery_date(remark: str | None, today: date | None = None) -> Optional[date]:
    """
    Find the most likely delivery date inside a free-text remark.
    Returns ``None`` if no plausible date is found.

    Strategy:
      1. Try numeric `dd/mm[/yyyy]` patterns.
      2. Try named-month patterns.
      3. Drop dates older than ``today`` (we only care about scheduled deliveries).
      4. If a year is missing, infer the next occurrence in the future.
    """
    if not remark:
        return None

    today = today or date.today()
    candidates: list[date] = []

    for pat in _DATE_PATTERNS:
        for m in pat.finditer(remark):
            try:
                day = int(m.group("day"))
                month = int(m.group("month"))
                year_raw = m.group("year")
                year = _normalize_year(year_raw, today)
                d = _safe_date(year, month, day)
                if not d:
                    continue
                # If the year was implicit and the resulting date is already
                # in the past, the customer almost certainly meant next year.
                if not year_raw and d < today:
                    d = _safe_date(year + 1, month, day) or d
                if d >= today:
                    candidates.append(d)
            except (ValueError, TypeError):
                continue

    for m in _NAMED_PATTERN.finditer(remark):
        month_name = m.group("month").lower()
        if month_name not in _MONTH_NAMES:
            continue
        try:
            day = int(m.group("day"))
            month = _MONTH_NAMES[month_name]
            year_raw = m.group("year")
            year = _normalize_year(year_raw, today)
            d = _safe_date(year, month, day)
            if not d:
                continue
            # If implied year is in the past, roll to next year.
            if not year_raw and d < today:
                d = _safe_date(year + 1, month, day) or d
            if d >= today:
                candidates.append(d)
        except (ValueError, TypeError):
            continue

    if not candidates:
        return None
    return min(candidates)


def is_d_minus_one(target: date | None, today: date | None = None) -> bool:
    """True if ``target`` is exactly one day after today."""
    if not target:
        return False
    today = today or date.today()
    return target - today == timedelta(days=1)


def _normalize_year(year_raw: str | None, today: date) -> int:
    if not year_raw:
        return today.year
    y = int(year_raw)
    if y < 100:  # two-digit year
        y += 2000
    return y


def _safe_date(year: int, month: int, day: int) -> date | None:
    try:
        return date(year, month, day)
    except ValueError:
        return None
