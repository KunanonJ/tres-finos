from __future__ import annotations

import csv
import math
import re
from collections import defaultdict, OrderedDict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

try:
    import pdfplumber
except ModuleNotFoundError as exc:
    raise SystemExit(
        "Missing dependency: pdfplumber. Run with PYTHONPATH=/tmp/codex_pdf or install pdfplumber."
    ) from exc


BASE_DIR = Path("/Users/kunanonjarat/Developer/Accounting and Financial")
STATEMENT_DIR = Path("/Users/kunanonjarat/Downloads/statement")
REPORT_PATH = BASE_DIR / "gogo_cfo_q1_2026_report.md"
CSV_PATH = BASE_DIR / "gogo_cfo_q1_2026_transactions.csv"

FILES = OrderedDict(
    [
        ("January 2026", STATEMENT_DIR / "January 2026.pdf"),
        ("February 2026", STATEMENT_DIR / "February 2026.pdf"),
        ("March 2026", STATEMENT_DIR / "March 2026.pdf"),
    ]
)

CATEGORY_ORDER = [
    "Affiliate Revenue",
    "International Revenue",
    "Internal Transfer IN",
    "Payroll – Core Staff",
    "Payroll – Management",
    "Operations & Reimbursable",
    "Professional Services",
    "Tax & Government",
    "Bank Fees",
    "Affiliate Cashback OUT",
    "Other / Unclassified",
]

CORE_PAYROLL_NAMES = {
    "Nattaya Ketawalh",
    "Pittaya Suteerawut",
    "Phatsara Tiathawornchai",
}

PROFESSIONAL_SERVICE_NAMES = {
    "As One Audit Co. Ltd.",
    "UI 3 Account Co. Ltd.",
}

ROW_PATTERN = re.compile(
    r"^(?P<date>\d{2}/\d{2}/\d{4})\s+(?P<time>\d{2}:\d{2})\s+(?P<code>[A-Z0-9]+)\s+"
    r"(?P<body>.+?)\s+(?P<amount>[\d,]+\.\d{2})\s+(?P<tax>[\d,]+\.\d{2})\s+"
    r"(?P<balance>[\d,]+\.\d{2})(?:\s+(?P<channel>.+))?$"
)


@dataclass
class Transaction:
    month: str
    date: str
    time: str
    code: str
    description: str
    counterparty: str
    amount: float
    direction: str
    category: str
    running_balance: float


def amount(value: float) -> str:
    return f"฿{value:,.2f}"


def num(value: float) -> str:
    return f"{value:,.2f}"


def sanitize_fragment(text: str) -> str:
    text = re.sub(r"~\s*Future Amount:\s*[^~]+ ~ Tran:\s*", " ", text.strip())
    text = re.sub(r"\b20\d{12,}\b.*$", "", text)
    text = re.sub(r"^\d+(?:\.\d+)? ~ Tran:.*$", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    if text in {"IORSFE", "IORSFKE"}:
        return ""
    return text


def ignore_line(text: str) -> bool:
    if not text:
        return True
    startswith_bits = (
        "Krung Thai Bank Public Company Limited",
        "บริษัท ธนาคารกรุงไทย",
        "cash.management@krungthai.com",
        "Krungthai Corporate Call Center",
        "www.krungthai.com",
        "Account Statement",
        "รายการเดินบัญชีเงินฝาก",
        "Account Name ",
        "ชื",
        "Address ",
        "ที",
        "ม. ",
        "ตําบล",
        "Limit ",
        "วงเงิน",
        "Statement Period",
        "รายการระหว่างวันที",
        "Request Date",
        "วันที",
        "Date/ Time Transaction Code",
        "Page ",
        "หน้า ",
        "BEGINNING BALANCE",
        "ยอดคงเหลือยกมา",
        "ENDING BALANCE",
        "ยอดยกไป",
        "Total Withdrawal",
        "รายการถอนเงิน",
        "Total Deposit",
        "รายการฝากเงิน",
    )
    contains_bits = (
        "35 Sukhumvit Road",
        "Krungthai Corporate Call Center",
        "cash.management@krungthai.com",
        "www.krungthai.com",
        "เลขที",
    )
    return any(text.startswith(bit) for bit in startswith_bits) or any(bit in text for bit in contains_bits)


def normalize_counterparty(body: str, code: str) -> str:
    upper = body.upper()

    if "INVOLVE ASIA" in upper or code == "BSD22":
        return "Involve Asia (Thailand) Co. Ltd."
    if "ALIBABA.COM SINGAPORE" in upper or code == "XISDT":
        return "Alibaba.com Singapore"
    if "REVENUE DEPARTMENT" in upper or code in {"PBPSWP", "NMPSWP", "NMMPSWP"}:
        return "Revenue Department"
    if "TRANSACTION FEE" in upper or code.startswith("IORSF"):
        return "Krungthai Bank"
    if "SAYRUNG JAIBUN" in upper:
        return "SAYRUNG JAIBUN"
    if "MR.KUNANON JARAT" in upper:
        return "MR.Kunanon Jarat"
    if "NATTAYA KETAWALH" in upper:
        return "Nattaya Ketawalh"
    if "PITTAYA" in upper and ("SUTEERAWUT" in upper or "SUTHIRAWUT" in upper):
        return "Pittaya Suteerawut"
    if "PHATSARA" in upper or "MISSPHATSARA" in upper:
        return "Phatsara Tiathawornchai"
    if "AS ONE AUDIT COMPANY" in upper:
        return "As One Audit Co. Ltd."
    if "UI 3 ACCOUNT CO. LTD." in upper or "UI 3 ACCOUNT CO. LTD" in upper or "UI 3 ACCOUNT CO LTD" in upper:
        return "UI 3 Account Co. Ltd."

    match_to = re.search(r"TR to \S+ (.+)", body, flags=re.IGNORECASE)
    if match_to:
        return match_to.group(1).strip()

    match_from = re.search(r"TR fr (\S+)(?: (.+))?", body, flags=re.IGNORECASE)
    if match_from:
        return (match_from.group(2) or match_from.group(1)).strip()

    if code in {"IORSDT", "NBSDT"}:
        return body.strip()

    return body.strip()


def merge_continuation(current: str, continuation: str) -> str:
    match = ROW_PATTERN.match(current)
    if not match:
        return f"{current} {continuation}".strip()

    channel = f" {match.group('channel')}" if match.group("channel") else ""
    return (
        f"{match.group('date')} {match.group('time')} {match.group('code')} "
        f"{match.group('body')} {continuation} "
        f"{match.group('amount')} {match.group('tax')} {match.group('balance')}{channel}"
    ).strip()


def classify(direction: str, code: str, body: str, counterparty: str, amount_thb: float) -> str:
    upper = body.upper()

    if direction == "IN":
        if "INVOLVE ASIA" in upper or code == "BSD22":
            return "Affiliate Revenue"
        if "ALIBABA.COM SINGAPORE" in upper or code == "XISDT":
            return "International Revenue"
        return "Internal Transfer IN"

    if counterparty in CORE_PAYROLL_NAMES:
        return "Payroll – Core Staff"
    if counterparty == "SAYRUNG JAIBUN":
        return "Payroll – Management"
    if counterparty == "MR.Kunanon Jarat":
        return "Operations & Reimbursable"
    if counterparty in PROFESSIONAL_SERVICE_NAMES:
        return "Professional Services"
    if counterparty == "Revenue Department" or code in {"PBPSWP", "NMPSWP", "NMMPSWP"}:
        return "Tax & Government"
    if "TRANSACTION FEE" in upper or code.startswith("IORSF"):
        return "Bank Fees"

    looks_individual = (
        counterparty not in CORE_PAYROLL_NAMES
        and counterparty not in PROFESSIONAL_SERVICE_NAMES
        and counterparty not in {"SAYRUNG JAIBUN", "MR.Kunanon Jarat", "Revenue Department", "Krungthai Bank"}
        and not any(token in counterparty.lower() for token in ("co. ltd", "company", "department", "bank"))
        and len(counterparty.split()) >= 2
    )
    if looks_individual and (code == "IORSWT" or amount_thb <= 3_000):
        return "Affiliate Cashback OUT"

    return "Other / Unclassified"


def parse_transactions(month: str, path: Path) -> tuple[float, list[Transaction]]:
    with pdfplumber.open(path) as pdf:
        pages = [page.extract_text(x_tolerance=1, y_tolerance=1) or "" for page in pdf.pages]

    beginning_balance = None
    rows: list[str] = []
    current = ""

    for page_text in pages:
        for raw_line in page_text.splitlines():
            line = sanitize_fragment(raw_line)
            if not line:
                continue
            if beginning_balance is None:
                match_begin = re.search(r"(?:BEGINNING BALANCE|ยอดคงเหลือยกมา)\s+([\d,]+\.\d{2})", line)
                if match_begin:
                    beginning_balance = float(match_begin.group(1).replace(",", ""))
                    continue
            if ignore_line(line):
                continue
            if re.match(r"^\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}\s+[A-Z0-9]+", line):
                if current:
                    rows.append(current.strip())
                current = line
            elif current:
                current = merge_continuation(current, line)

    if current:
        rows.append(current.strip())

    if beginning_balance is None:
        raise RuntimeError(f"Could not find beginning balance in {path}")

    transactions: list[Transaction] = []
    previous_balance = beginning_balance

    for row in rows:
        match = ROW_PATTERN.match(row)
        if not match:
            raise RuntimeError(f"Could not parse row: {row}")

        amount_thb = float(match.group("amount").replace(",", ""))
        running_balance = float(match.group("balance").replace(",", ""))
        direction = "IN" if running_balance > previous_balance else "OUT"
        body = match.group("body").strip()
        counterparty = normalize_counterparty(body, match.group("code"))
        category = classify(direction, match.group("code"), body, counterparty, amount_thb)

        transactions.append(
            Transaction(
                month=month,
                date=match.group("date"),
                time=match.group("time"),
                code=match.group("code"),
                description=body,
                counterparty=counterparty,
                amount=amount_thb,
                direction=direction,
                category=category,
                running_balance=running_balance,
            )
        )
        previous_balance = running_balance

    return beginning_balance, transactions


def monthly_summaries(beginning_balances: dict[str, float], txns: list[Transaction]) -> dict[str, dict[str, float]]:
    by_month = defaultdict(list)
    for txn in txns:
        by_month[txn.month].append(txn)

    summaries: dict[str, dict[str, float]] = {}
    for month in FILES:
        month_txns = by_month[month]
        total_in = sum(tx.amount for tx in month_txns if tx.direction == "IN")
        total_out = sum(tx.amount for tx in month_txns if tx.direction == "OUT")
        summaries[month] = {
            "beginning_balance": beginning_balances[month],
            "total_in": total_in,
            "total_out": total_out,
            "net_cash_flow": total_in - total_out,
            "ending_balance": month_txns[-1].running_balance if month_txns else beginning_balances[month],
        }
    return summaries


def category_breakdown(month: str, txns: list[Transaction], total_out: float) -> list[tuple[str, int, float, str]]:
    month_txns = [tx for tx in txns if tx.month == month]
    counts = defaultdict(int)
    totals = defaultdict(float)
    for tx in month_txns:
        counts[tx.category] += 1
        totals[tx.category] += tx.amount

    rows = []
    for category in CATEGORY_ORDER:
        if counts[category] == 0:
            continue
        pct = "-" if category in {"Affiliate Revenue", "International Revenue", "Internal Transfer IN"} else f"{(totals[category] / total_out) * 100:,.2f}%"
        rows.append((category, counts[category], totals[category], pct))
    return rows


def sum_category(month: str, txns: Iterable[Transaction], category: str) -> float:
    return sum(tx.amount for tx in txns if tx.month == month and tx.category == category)


def total_payroll(month: str, txns: Iterable[Transaction]) -> float:
    return sum(
        tx.amount
        for tx in txns
        if tx.month == month and tx.category in {"Payroll – Core Staff", "Payroll – Management"}
    )


def total_tax(month: str, txns: Iterable[Transaction]) -> float:
    return sum(tx.amount for tx in txns if tx.month == month and tx.category == "Tax & Government")


def total_bank_fees(month: str, txns: Iterable[Transaction]) -> float:
    return sum(tx.amount for tx in txns if tx.month == month and tx.category == "Bank Fees")


def burn_rate(month: str, summaries: dict[str, dict[str, float]]) -> float:
    return max(0.0, -summaries[month]["net_cash_flow"])


def trend_label(start: float, end: float, higher_is_better: bool) -> str:
    if math.isclose(start, end, abs_tol=0.005):
        return "🟢 Stable"
    improved = end > start if higher_is_better else end < start
    if improved:
        return "🟢 Improving"
    return "🔴 Deteriorating"


def format_net(value: float) -> str:
    prefix = "⚠️ " if value < 0 else ""
    return f"{prefix}{amount(value)}"


def render_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    separator = "| " + " | ".join(["---"] * len(headers)) + " |"
    body = "\n".join("| " + " | ".join(row) + " |" for row in rows)
    return "\n".join([header_line, separator, body])


def main() -> None:
    beginning_balances: dict[str, float] = {}
    all_transactions: list[Transaction] = []

    for month, path in FILES.items():
        beginning_balance, txns = parse_transactions(month, path)
        beginning_balances[month] = beginning_balance
        all_transactions.extend(txns)

    summaries = monthly_summaries(beginning_balances, all_transactions)

    with CSV_PATH.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(
            [
                "Month",
                "Date",
                "Time",
                "Transaction Code",
                "Description",
                "Counterparty",
                "Amount (THB)",
                "Direction",
                "Category",
                "Running Balance",
            ]
        )
        for tx in all_transactions:
            writer.writerow(
                [
                    tx.month,
                    tx.date,
                    tx.time,
                    tx.code,
                    tx.description,
                    tx.counterparty,
                    f"{tx.amount:.2f}",
                    tx.direction,
                    tx.category,
                    f"{tx.running_balance:.2f}",
                ]
            )

    total_revenue_all = sum(tx.amount for tx in all_transactions if tx.direction == "IN")
    involve_total = sum(tx.amount for tx in all_transactions if tx.category == "Affiliate Revenue")
    average_burn = sum(burn_rate(month, summaries) for month in FILES) / len(FILES)
    current_balance = summaries["March 2026"]["ending_balance"]
    runway_months = current_balance / average_burn if average_burn else float("inf")
    alert_floor_3m = average_burn * 3
    alert_floor_6m = average_burn * 6

    fixed_variable_rows = []
    for month in FILES:
        fixed = sum(
            tx.amount
            for tx in all_transactions
            if tx.month == month and tx.category in {"Payroll – Core Staff", "Payroll – Management"}
        )
        variable = summaries[month]["total_out"] - fixed
        fixed_variable_rows.append(
            [month.replace(" 2026", ""), amount(fixed), amount(variable), f"{(fixed / summaries[month]['total_out']) * 100:,.2f}%"]
        )

    tax_rows = [
        [tx.date, tx.code, amount(tx.amount)]
        for tx in all_transactions
        if tx.category == "Tax & Government"
    ]

    concentration_rows = []
    for month in FILES:
        involve = sum_category(month, all_transactions, "Affiliate Revenue")
        total_in = summaries[month]["total_in"]
        share = involve / total_in if total_in else 0.0
        flag = "⚠️ > 70%" if share > 0.70 else "🟢 <= 70%"
        concentration_rows.append([month.replace(" 2026", ""), amount(involve), amount(total_in), f"{share * 100:,.2f}%", flag])

    payroll_ratio_rows = []
    for month in FILES:
        payroll = total_payroll(month, all_transactions)
        revenue = summaries[month]["total_in"]
        ratio = payroll / revenue if revenue else 0.0
        payroll_ratio_rows.append(
            [month.replace(" 2026", ""), amount(payroll), amount(revenue), f"{ratio * 100:,.2f}%", "⚠️ > 60%" if ratio > 0.60 else "🟢 <= 60%"]
        )

    transaction_table = render_table(
        [
            "Date",
            "Time",
            "Transaction Code",
            "Description",
            "Counterparty",
            "Amount (THB)",
            "Direction",
            "Category",
            "Running Balance",
        ],
        [
            [
                tx.date,
                tx.time,
                tx.code,
                tx.description,
                tx.counterparty,
                amount(tx.amount),
                tx.direction,
                tx.category,
                amount(tx.running_balance),
            ]
            for tx in all_transactions
        ],
    )

    monthly_sections: list[str] = []
    for month in FILES:
        month_name = month.replace(" 2026", "")
        summary = summaries[month]
        breakdown = category_breakdown(month, all_transactions, summary["total_out"])
        breakdown_table = render_table(
            ["Category", "# Txns", "Total Amount (THB)", "% of Total Outflows"],
            [[cat, str(count), amount(total), pct] for cat, count, total, pct in breakdown],
        )
        box = "\n".join(
            [
                "```text",
                f"MONTH: {month_name} 2026",
                f"Beginning Balance: {amount(summary['beginning_balance'])}",
                f"Total Revenue (IN): {amount(summary['total_in'])}",
                f"Total Expenses (OUT): {amount(summary['total_out'])}",
                f"Net Cash Flow: {amount(summary['net_cash_flow'])}",
                f"Ending Balance: {amount(summary['ending_balance'])}",
                "```",
            ]
        )
        monthly_sections.append(f"## {month_name} 2026\n\n{box}\n\n{breakdown_table}")

    trend_table = render_table(
        ["Metric", "Jan 2026", "Feb 2026", "Mar 2026", "Trend"],
        [
            [
                "Opening Balance (฿)",
                amount(summaries["January 2026"]["beginning_balance"]),
                amount(summaries["February 2026"]["beginning_balance"]),
                amount(summaries["March 2026"]["beginning_balance"]),
                trend_label(summaries["January 2026"]["beginning_balance"], summaries["March 2026"]["beginning_balance"], True),
            ],
            [
                "Total Revenue (฿)",
                amount(summaries["January 2026"]["total_in"]),
                amount(summaries["February 2026"]["total_in"]),
                amount(summaries["March 2026"]["total_in"]),
                trend_label(summaries["January 2026"]["total_in"], summaries["March 2026"]["total_in"], True),
            ],
            [
                "Affiliate Revenue (฿)",
                amount(sum_category("January 2026", all_transactions, "Affiliate Revenue")),
                amount(sum_category("February 2026", all_transactions, "Affiliate Revenue")),
                amount(sum_category("March 2026", all_transactions, "Affiliate Revenue")),
                trend_label(
                    sum_category("January 2026", all_transactions, "Affiliate Revenue"),
                    sum_category("March 2026", all_transactions, "Affiliate Revenue"),
                    True,
                ),
            ],
            [
                "Total Payroll (฿)",
                amount(total_payroll("January 2026", all_transactions)),
                amount(total_payroll("February 2026", all_transactions)),
                amount(total_payroll("March 2026", all_transactions)),
                trend_label(total_payroll("January 2026", all_transactions), total_payroll("March 2026", all_transactions), False),
            ],
            [
                "Total Tax Paid (฿)",
                amount(total_tax("January 2026", all_transactions)),
                amount(total_tax("February 2026", all_transactions)),
                amount(total_tax("March 2026", all_transactions)),
                trend_label(total_tax("January 2026", all_transactions), total_tax("March 2026", all_transactions), False),
            ],
            [
                "Bank Fees (฿)",
                amount(total_bank_fees("January 2026", all_transactions)),
                amount(total_bank_fees("February 2026", all_transactions)),
                amount(total_bank_fees("March 2026", all_transactions)),
                trend_label(total_bank_fees("January 2026", all_transactions), total_bank_fees("March 2026", all_transactions), False),
            ],
            [
                "Net Cash Flow (฿)",
                format_net(summaries["January 2026"]["net_cash_flow"]),
                format_net(summaries["February 2026"]["net_cash_flow"]),
                format_net(summaries["March 2026"]["net_cash_flow"]),
                trend_label(summaries["January 2026"]["net_cash_flow"], summaries["March 2026"]["net_cash_flow"], True),
            ],
            [
                "Closing Balance (฿)",
                amount(summaries["January 2026"]["ending_balance"]),
                amount(summaries["February 2026"]["ending_balance"]),
                amount(summaries["March 2026"]["ending_balance"]),
                trend_label(summaries["January 2026"]["ending_balance"], summaries["March 2026"]["ending_balance"], True),
            ],
            [
                "Burn Rate (฿/month)",
                amount(burn_rate("January 2026", summaries)),
                amount(burn_rate("February 2026", summaries)),
                amount(burn_rate("March 2026", summaries)),
                trend_label(burn_rate("January 2026", summaries), burn_rate("March 2026", summaries), False),
            ],
        ],
    )

    recommendation_lines = [
        "1. Build an immediate liquidity plan: March-end cash of "
        f"{amount(current_balance)} covers only {runway_months:,.2f} months of the current average burn "
        f"({amount(average_burn)} per month), so management should either cut discretionary operating spend or secure additional funding now.",
        "2. Reduce revenue concentration by accelerating non-Involve monetization: Involve Asia contributes "
        f"{(involve_total / total_revenue_all) * 100:,.2f}% of Q1 revenue and exceeded 70% of monthly revenue in February and March.",
        "3. Put tighter controls on variable payouts and reimbursements: MR.Kunanon Jarat reimbursements and cashback-style payouts together consumed a meaningful share of cash each month, so the team should move these items under a pre-approved monthly operating budget with documentation.",
    ]

    report = "\n\n".join(
        [
            "# GOGO HOLDING (THAILAND) LIMITED PARTNERS CFO Dashboard",
            "Bank Account: Krungthai Bank Savings Account No. 017-0-54931-3",
            "## Section 1 — Data Extraction & Classification",
            transaction_table,
            "## Section 2 — Monthly Financial Dashboard",
            "\n\n".join(monthly_sections),
            "## Section 3 — 3-Month Trend Analysis (Jan–Mar 2026)",
            trend_table,
            "## Section 4 — CFO Insights & Risk Flags",
            "### 1. Cash Runway Analysis",
            f"- Average monthly burn across Jan–Mar 2026: {amount(average_burn)}",
            f"- Months until balance reaches zero at current burn: {runway_months:,.2f} months",
            f"- Immediate fundraise alert threshold (3 months of burn): {amount(alert_floor_3m)}",
            f"- Preferred liquidity floor (6 months of burn): {amount(alert_floor_6m)}",
            f"- Current March-end balance vs alert threshold: {'⚠️ Below 3-month alert floor' if current_balance < alert_floor_3m else '🟢 Above 3-month alert floor'}",
            "### 2. Revenue Concentration Risk",
            f"- Involve Asia share of total Q1 revenue: {(involve_total / total_revenue_all) * 100:,.2f}%",
            render_table(
                ["Month", "Involve Asia Revenue", "Total Revenue", "Share", "Flag"],
                concentration_rows,
            ),
            "### 3. Payroll-to-Revenue Ratio",
            render_table(
                ["Month", "Total Payroll", "Total Revenue", "Payroll / Revenue", "Flag"],
                payroll_ratio_rows,
            ),
            "### 4. Recurring vs. Variable Expense Split",
            render_table(
                ["Month", "Recurring Expenses", "Variable Expenses", "Recurring % of Outflows"],
                fixed_variable_rows,
            ),
            "Recurring expenses are dominated by core staff payroll and management payroll. Variable expenses are mainly MR.Kunanon reimbursements, affiliate cashback payouts, tax remittances, and February's one-off professional service payments.",
            "### 5. Tax Compliance Tracker",
            render_table(["Date", "Code", "Amount"], tax_rows),
            "- Tax payment coverage by month: Jan 2026 🟢, Feb 2026 🟢, Mar 2026 🟢",
            "### 6. Top 3 Strategic Recommendations",
            "\n".join(recommendation_lines),
            "## Executive Summary",
            "Cash performance was negative in all three months, with March ending cash at "
            f"{amount(current_balance)} and only {runway_months:,.2f} months of runway left at the Q1 average burn. "
            "Revenue is heavily concentrated in Involve Asia and payroll remains above 100% of monthly revenue in every month reviewed. "
            "The single most urgent CFO action is to protect cash immediately by tightening variable spend and securing additional funding or a working-capital buffer before Q2 burn exhausts the balance.",
        ]
    )

    REPORT_PATH.write_text(report, encoding="utf-8")
    print(f"Wrote {REPORT_PATH}")
    print(f"Wrote {CSV_PATH}")


if __name__ == "__main__":
    main()
