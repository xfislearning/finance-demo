import { jsPDF } from "jspdf";
import { money } from "./utils";

function monthLabel(month) {
  const [year, mon] = String(month || "").split("-").map(Number);
  if (!year || !mon) return String(month || "");
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(year, mon - 1, 1));
}

function clipped(value, length) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, Math.max(1, length - 1))}…` : text;
}

export function buildExpenseRecordsPdf({ periodLabel = "All dates", rows = [], settings = {} }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const width = 279;
  const columns = [
    ["Date", 12], ["Vendor / Description", 48], ["Category", 36], ["Paid From", 34],
    ["Source", 34], ["Status", 27], ["Amount", 23]
  ];
  const starts = [];
  let x = 12;
  for (const [, colWidth] of columns) { starts.push(x); x += colWidth; }

  function drawHeader() {
    doc.setTextColor(18, 59, 93);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(settings.company_name || "Qentro Finance", 12, 15);
    doc.setFontSize(12);
    doc.text("Expense Records", 12, 23);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(85, 105, 115);
    doc.text(`${periodLabel} · ${rows.length} filtered record${rows.length === 1 ? "" : "s"}`, 12, 29);
    doc.setFillColor(18, 59, 93);
    doc.rect(12, 34, width - 24, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    columns.forEach(([label], index) => doc.text(label, starts[index] + 1.5, 39.5));
    return 42;
  }

  let y = drawHeader();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  for (let index = 0; index < rows.length; index += 1) {
    if (y > 196) {
      doc.addPage();
      y = drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
    }
    if (index % 2 === 1) {
      doc.setFillColor(247, 250, 251);
      doc.rect(12, y, width - 24, 8, "F");
    }
    const row = rows[index];
    const values = [
      row.record_date || row.expense_date,
      clipped([row.vendor, row.description].filter(Boolean).join(" — "), 55),
      clipped(row.category_name || "Uncategorized", 34),
      clipped(row.paid_from, 31),
      clipped(row.source_label, 31),
      clipped(String(row.status_label || "").replaceAll("_", " "), 24),
      `${Number(row.is_money_in) ? "+" : ""}${money(row.amount_cents)}`
    ];
    doc.setTextColor(35, 55, 65);
    values.forEach((value, column) => {
      if (column === values.length - 1) doc.text(String(value), starts[column] + columns[column][1] - 2, y + 5.3, { align: "right" });
      else doc.text(String(value || ""), starts[column] + 1.5, y + 5.3);
    });
    y += 8;
  }

  if (!rows.length) {
    doc.setTextColor(85, 105, 115);
    doc.text("No records match the selected date range and filters.", 14, y + 8);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 130, 136);
    doc.text("Qentro Finance · Expense Records", 12, 211);
    doc.text(`Page ${page} of ${pages}`, width - 12, 211, { align: "right" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
