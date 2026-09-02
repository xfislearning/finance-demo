import { jsPDF } from "jspdf";
import { money } from "./utils";

function addWrappedLines(doc, text, x, y, width = 90, lineHeight = 5) {
  if (!text) return y;
  const lines = doc.splitTextToSize(String(text), width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function buildInvoicePdf(invoice, settings) {
  const doc = new jsPDF();
  const subtotal = invoice.items.reduce((s, x) => s + Number(x.amount_cents || 0), 0);
  const taxRate = Number(invoice.tax_rate || 0);
  const taxCents = Number(invoice.tax_cents || 0);
  const total = subtotal + taxCents;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(settings.company_name || "Qentro LLC", 18, 20);
  doc.setFontSize(16);
  doc.text("INVOICE", 195, 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let y = 28;
  y = addWrappedLines(doc, settings.company_address, 18, y, 82);
  if (settings.company_email) { doc.text(String(settings.company_email), 18, y); y += 5; }
  if (settings.company_phone) { doc.text(String(settings.company_phone), 18, y); y += 5; }
  if (settings.company_website) { doc.text(String(settings.company_website), 18, y); y += 5; }

  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoice.invoice_number}`, 130, 31);
  doc.text(`Invoice date: ${invoice.invoice_date}`, 130, 37);
  if (invoice.due_date) doc.text(`Due date: ${invoice.due_date}`, 130, 43);

  y = Math.max(y + 8, 58);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To", 18, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  if (invoice.customer_name) { doc.text(invoice.customer_name, 18, y); y += 5; }
  if (invoice.contact_name) { doc.text(invoice.contact_name, 18, y); y += 5; }
  y = addWrappedLines(doc, invoice.billing_address, 18, y, 82);
  if (invoice.email) { doc.text(invoice.email, 18, y); y += 5; }
  if (invoice.phone) { doc.text(invoice.phone, 18, y); y += 5; }

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Description", 18, y);
  doc.text("Qty", 126, y, { align: "right" });
  doc.text("Rate", 160, y, { align: "right" });
  doc.text("Amount", 195, y, { align: "right" });
  doc.line(18, y + 2, 195, y + 2);
  doc.setFont("helvetica", "normal");
  y += 9;

  invoice.items.forEach((item) => {
    const desc = String(item.description || "");
    const lines = doc.splitTextToSize(desc, 95);
    doc.text(lines, 18, y);
    doc.text(String(item.quantity), 126, y, { align: "right" });
    doc.text(money(item.rate_cents), 160, y, { align: "right" });
    doc.text(money(item.amount_cents), 195, y, { align: "right" });
    y += Math.max(7, lines.length * 5);
    if (y > 250) { doc.addPage(); y = 25; }
  });

  doc.line(120, y, 195, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", 160, y, { align: "right" });
  doc.text(money(subtotal), 195, y, { align: "right" });

  if (taxCents > 0 || Number(invoice.taxable || 0) === 1) {
    y += 7;
    const rateText = taxRate.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    doc.text(`Sales Tax (${rateText}%)`, 160, y, { align: "right" });
    doc.text(money(taxCents), 195, y, { align: "right" });
  }

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Total", 160, y, { align: "right" });
  doc.text(money(total), 195, y, { align: "right" });

  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const paymentInstructions = String(invoice.payment_instructions || settings.payment_instructions || "").trim();
  if (paymentInstructions) {
    doc.setFont("helvetica", "bold");
    doc.text("Payment Instructions", 18, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    const lines = doc.splitTextToSize(paymentInstructions, 175);
    doc.text(lines, 18, y);
    y += lines.length * 5 + 4;
  }
  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Notes", 18, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    doc.text(doc.splitTextToSize(invoice.notes, 175), 18, y);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
