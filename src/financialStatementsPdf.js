import { jsPDF } from "jspdf";
import { money } from "./utils";

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

function monthEndLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(y, m, 0));
}

function header(doc, title, subtitle, settings) {
  doc.setTextColor(18, 59, 93);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(settings?.company_name || "Qentro Finance", 18, 20);
  doc.setFontSize(13);
  doc.text(title, 18, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90, 105, 115);
  const contact = [settings?.company_email, settings?.company_phone, settings?.company_website].filter(Boolean).join("  |  ");
  doc.text(subtitle, 18, 37);
  let ruleY = 42;
  if (contact) {
    doc.text(contact, 18, 42);
    ruleY = 47;
  }
  doc.setDrawColor(200, 214, 220);
  doc.line(18, ruleY, 195, ruleY);
  return ruleY + 9;
}

function line(doc, y, label, value, { bold = false, indent = 0, top = false, double = false } = {}) {
  if (top) {
    doc.setDrawColor(180, 195, 202);
    doc.line(18 + indent, y - 5, 195, y - 5);
  }
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(35, 55, 65);
  doc.text(String(label), 20 + indent, y);
  doc.text(money(value || 0), 193, y, { align: "right" });
  if (double) {
    doc.setDrawColor(70, 90, 100);
    doc.line(18 + indent, y + 2, 195, y + 2);
    doc.line(18 + indent, y + 4, 195, y + 4);
  }
  return y + 8;
}

function section(doc, y, title) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(18, 59, 93);
  doc.text(title, 18, y);
  return y + 8;
}

function footer(doc, label) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 130, 136);
    doc.text(`Qentro Finance - ${label}`, 18, 287);
    doc.text(`Page ${i} of ${pages}`, 195, 287, { align: "right" });
  }
}

function ensurePage(doc, y, title = "") {
  if (y <= 260) return y;
  doc.addPage();
  let next = 20;
  if (title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(18, 59, 93);
    doc.text(title, 18, next);
    next += 9;
  }
  return next;
}

export function buildIncomeStatementPdf({ periodLabel, data, settings }) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  let y = header(doc, "Income Statement", periodLabel, settings);
  y = section(doc, y, "OPERATING REVENUE");
  for (const r of data.revenueLines || []) y = line(doc, y, r.name, r.amount_cents, { indent: 5 });
  if (data.otherIncomeLines?.length) {
    y += 2;
    y = section(doc, y, "OTHER INCOME");
    for (const r of data.otherIncomeLines) y = line(doc, y, r.name, r.amount_cents, { indent: 5 });
  }
  y = line(doc, y, "Total Income", data.totalRevenue, { bold: true, top: true });
  y += 4;
  y = section(doc, y, "OPERATING EXPENSES");
  for (const r of data.expenseLines || []) y = line(doc, y, r.name, r.amount_cents, { indent: 5 });
  if (data.depreciation) y = line(doc, y, "Depreciation Expense", data.depreciation, { indent: 5 });
  y = line(doc, y, "Total Expenses", data.totalExpenses, { bold: true, top: true });
  y += 5;
  line(doc, y, "NET INCOME", data.netIncome, { bold: true, top: true, double: true });
  footer(doc, "Income Statement");
  return new Uint8Array(doc.output("arraybuffer"));
}

export function buildBalanceSheetPdf({ periodLabel, data, settings }) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  let y = header(doc, "Balance Sheet", `${periodLabel} (cash-basis management view)`, settings);
  y = section(doc, y, "ASSETS");
  y = section(doc, y, "Current Assets");
  for (const r of data.cashLines || []) y = line(doc, y, r.name, r.amount_cents, { indent: 5 });
  y = line(doc, y, "Total Cash", data.cashTotal, { bold: true, top: true });
  y += 3;
  y = section(doc, y, "Fixed Assets");
  for (const r of data.assetLines || []) y = line(doc, y, r.name, r.amount_cents, { indent: 5 });
  if (data.accumulatedDepreciation) y = line(doc, y, "Less: Accumulated Depreciation", -data.accumulatedDepreciation, { indent: 5 });
  y = line(doc, y, "Net Fixed Assets", data.netFixedAssets, { bold: true, top: true });
  y = line(doc, y + 3, "TOTAL ASSETS", data.totalAssets, { bold: true, top: true, double: true });
  y += 15;
  y = ensurePage(doc, y, "Balance Sheet (continued)");
  y = section(doc, y, "LIABILITIES");
  for (const r of data.liabilityLines || []) y = line(doc, y, r.name, r.amount_cents, { indent: 5 });
  y = line(doc, y, "Total Liabilities", data.totalLiabilities, { bold: true, top: true });
  y += 4;
  y = section(doc, y, "OWNER'S EQUITY");
  for (const r of data.equityLines || []) y = line(doc, y, r.name, r.amount_cents, { indent: 5 });
  y = line(doc, y, "Total Owner's Equity", data.totalEquity, { bold: true, top: true });
  y = line(doc, y + 3, "TOTAL LIABILITIES & EQUITY", data.totalLiabilitiesAndEquity, { bold: true, top: true, double: true });
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(95, 110, 118);
  const note = `Outstanding invoices (${money(data.outstandingInvoices)}) are shown as a management memo and are not included as Accounts Receivable in this cash-basis balance sheet. Balance difference: ${money(data.difference)}.`;
  doc.text(doc.splitTextToSize(note, 175), 18, y);
  footer(doc, "Balance Sheet");
  return new Uint8Array(doc.output("arraybuffer"));
}

export function buildCashFlowPdf({ periodLabel, data, settings }) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  let y = header(doc, "Statement of Cash Flows", periodLabel, settings);
  y = section(doc, y, "OPERATING ACTIVITIES");
  for (const r of data.operatingLines || []) y = line(doc, y, r.name, r.amount_cents, { indent: 5 });
  y = line(doc, y, "Net Cash from Operating Activities", data.netOperatingCash, { bold: true, top: true });
  y += 4;
  y = section(doc, y, "INVESTING ACTIVITIES");
  for (const r of data.investingLines || []) y = line(doc, y, r.name, r.amount_cents, { indent: 5 });
  y = line(doc, y, "Net Cash from Investing Activities", data.netInvestingCash, { bold: true, top: true });
  y += 4;
  y = section(doc, y, "FINANCING ACTIVITIES");
  for (const r of data.financingLines || []) y = line(doc, y, r.name, r.amount_cents, { indent: 5 });
  y = line(doc, y, "Net Cash from Financing Activities", data.netFinancingCash, { bold: true, top: true });
  y += 5;
  y = line(doc, y, "NET CHANGE IN CASH", data.netChangeInCash, { bold: true, top: true });
  y = line(doc, y, "Beginning Cash", data.beginningCash);
  line(doc, y, "ENDING CASH", data.endingCash, { bold: true, top: true, double: true });
  footer(doc, "Statement of Cash Flows");
  return new Uint8Array(doc.output("arraybuffer"));
}

export function buildGeneralLedgerPdf({ periodLabel, rows, settings }) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  let y = header(doc, "General Ledger", periodLabel, settings);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(18, 59, 93);
  doc.rect(18, y - 5, 177, 8, "F");
  doc.text("Date", 20, y);
  doc.text("Description", 40, y);
  doc.text("Account", 100, y);
  doc.text("Debit", 160, y, { align: "right" });
  doc.text("Credit", 193, y, { align: "right" });
  y += 7;
  for (const r of rows || []) {
    y = ensurePage(doc, y, "General Ledger (continued)");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(35, 55, 65);
    const desc = doc.splitTextToSize(r.description || "", 55)[0] || "";
    const account = doc.splitTextToSize(r.account || "", 50)[0] || "";
    doc.text(r.date || "", 20, y);
    doc.text(desc, 40, y);
    doc.text(account, 100, y);
    if (r.debit_cents) doc.text(money(r.debit_cents), 160, y, { align: "right" });
    if (r.credit_cents) doc.text(money(r.credit_cents), 193, y, { align: "right" });
    doc.setDrawColor(232, 236, 238);
    doc.line(18, y + 2, 195, y + 2);
    y += 7;
  }
  footer(doc, "General Ledger");
  return new Uint8Array(doc.output("arraybuffer"));
}
