import { jsPDF } from "jspdf";
import { money } from "./utils";

function monthLabel(month) {
  const [year, mon] = String(month).split("-").map(Number);
  if (!year || !mon) return String(month || "");
  return new Date(year, mon - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function drawMetric(doc, label, value, x, y, width = 82) {
  doc.setDrawColor(215, 225, 230);
  doc.setFillColor(247, 250, 251);
  doc.roundedRect(x, y, width, 19, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 100, 110);
  doc.setFontSize(8.5);
  doc.text(label, x + 5, y + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 55, 75);
  doc.setFontSize(13);
  doc.text(String(value), x + 5, y + 14);
}

export function buildMonthlyFinancialReportPdf({ month, summary, breakdown, settings }) {
  const doc = new jsPDF();
  const company = settings?.company_name || "Qentro Finance";
  const period = monthLabel(month);
  const generated = new Date().toLocaleString();

  doc.setTextColor(11, 65, 101);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text(company, 18, 19);

  doc.setFontSize(15);
  doc.text("Monthly Financial Summary", 18, 29);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(85, 105, 115);
  doc.setFontSize(9);
  doc.text(`Reporting period: ${period}`, 18, 36);
  doc.text(`Generated: ${generated}`, 18, 42);
  doc.line(18, 47, 195, 47);

  let y = 55;
  drawMetric(doc, "Revenue received", money(summary.revenue), 18, y);
  drawMetric(doc, "Expenses", money(summary.expenses), 108, y);
  y += 25;
  drawMetric(doc, "Net profit / loss", money(summary.profit), 18, y);
  drawMetric(doc, "Outstanding invoices", money(summary.outstanding), 108, y);

  y += 31;
  doc.setTextColor(20, 55, 75);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Expense Breakdown", 18, y);
  y += 7;

  doc.setFillColor(18, 59, 93);
  doc.rect(18, y, 177, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text("Category", 21, y + 5.5);
  doc.text("Amount", 191, y + 5.5, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(35, 55, 65);
  const rows = breakdown?.length ? breakdown : [{ category: "No expenses recorded", amount_cents: 0 }];
  for (let i = 0; i < rows.length; i += 1) {
    if (y > 248) {
      doc.addPage();
      y = 22;
    }
    if (i % 2 === 1) {
      doc.setFillColor(247, 250, 251);
      doc.rect(18, y, 177, 8, "F");
    }
    doc.text(String(rows[i].category || "Uncategorized"), 21, y + 5.5);
    doc.text(money(rows[i].amount_cents || 0), 191, y + 5.5, { align: "right" });
    y += 8;
  }

  y += 10;
  if (y > 235) {
    doc.addPage();
    y = 22;
  }
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 55, 75);
  doc.setFontSize(12);
  doc.text("Additional Monthly Controls", 18, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const controls = [
    ["Business miles", Number(summary.miles || 0).toFixed(1)],
    ["Mileage deduction", money(summary.mileageDeduction || 0)],
    ["Missing receipts", String(summary.missingReceipts || 0)],
    ["Unreconciled bank transactions", String(summary.unreconciled || 0)]
  ];
  for (const [label, value] of controls) {
    doc.setFont("helvetica", "normal");
    doc.text(label, 20, y);
    doc.setFont("helvetica", "bold");
    doc.text(value, 193, y, { align: "right" });
    doc.setDrawColor(230, 235, 238);
    doc.line(20, y + 2.5, 193, y + 2.5);
    y += 9;
  }

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(95, 110, 118);
  const note = "This report is a cash-based management summary using customer payments received and expenses recorded for the selected month. Net profit/loss equals revenue received minus recorded expenses. Gross profit is not shown because cost-of-goods-sold is not separately tracked in the current data model. Outstanding invoices are shown as a control and are not included in revenue until payment is recorded.";
  const noteLines = doc.splitTextToSize(note, 175);
  doc.text(noteLines, 18, y);

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 130, 136);
    doc.text("Qentro Finance - Monthly Financial Summary", 18, 287);
    doc.text(`Page ${p} of ${pageCount}`, 195, 287, { align: "right" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
