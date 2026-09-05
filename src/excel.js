import * as XLSX from "xlsx-js-style";
import { openBytesWithDialog, saveBytesWithDialog } from "./storage";
import { fromCents, normalizeDate, parseMoney, today } from "./utils";
import expenseTemplateUrl from "./assets/Qentro_Expense_Import_Template.xlsx?url";
import mileageTemplateUrl from "./assets/Qentro_Mileage_Import_Template.xlsx?url";

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\$/g, " dollars ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function valueByAliases(row, aliases) {
  const map = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (map.has(key)) return map.get(key);
  }
  return "";
}

function optionalNumber(value) {
  const parsed = parseMoney(value);
  return Number.isFinite(parsed) ? parsed : "";
}

function workbookBytes(wb) {
  const arr = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(arr);
}

function autosize(ws, widths) {
  ws["!cols"] = widths.map((wch) => ({ wch }));
  if (ws["!ref"]) ws["!autofilter"] = { ref: ws["!ref"].split(":")[0] + ":" + ws["!ref"].split(":")[1] };
}

const templateHeaderStyle = {
  fill: { patternType: "solid", fgColor: { rgb: "123B5D" } },
  font: { name: "Carlito", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
  alignment: { vertical: "center", horizontal: "center", wrapText: true }
};

function styleExpenseExport(ws, rowCount, columnCount) {
  for (let column = 0; column < columnCount; column += 1) {
    const header = ws[XLSX.utils.encode_cell({ r: 0, c: column })];
    if (header) header.s = templateHeaderStyle;
  }
  ws["!rows"] = [{ hpt: 30 }];

  for (let row = 1; row <= rowCount; row += 1) {
    const dateCell = ws[XLSX.utils.encode_cell({ r: row, c: 1 })];
    if (dateCell) dateCell.s = { numFmt: "yyyy-mm-dd" };
    const amountCell = ws[XLSX.utils.encode_cell({ r: row, c: 4 })];
    if (amountCell) amountCell.s = { numFmt: "$#,##0.00" };
  }
}

export async function saveExpenseTemplate({ categories = [], customers = [], accounts = [] } = {}) {
  void categories; void customers; void accounts;
  const response = await fetch(expenseTemplateUrl);
  if (!response.ok) throw new Error("The bundled expense template could not be opened.");
  return saveBytesWithDialog(new Uint8Array(await response.arrayBuffer()), "Qentro_Expense_Import_Template.xlsx", ["xlsx"]);
}

export async function saveMileageTemplate({ customers = [], defaultRate = 0 } = {}) {
  void customers; void defaultRate;
  const response = await fetch(mileageTemplateUrl);
  if (!response.ok) throw new Error("The bundled mileage template could not be opened.");
  return saveBytesWithDialog(new Uint8Array(await response.arrayBuffer()), "Qentro_Mileage_Import_Template.xlsx", ["xlsx"]);
}

async function openWorkbook(preferredSheet) {
  const selected = await openBytesWithDialog({ name: "Excel Workbook", extensions: ["xlsx", "xls"] });
  if (!selected) return null;
  const wb = XLSX.read(selected.bytes, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === preferredSheet.toLowerCase()) || wb.SheetNames[0];
  if (!sheetName) throw new Error("The workbook does not contain a worksheet.");
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "", raw: false });
  return { ...selected, sheetName, rows };
}

export async function readExpenseImportWorkbook() {
  const opened = await openWorkbook("Expenses");
  if (!opened) return null;
  const rows = opened.rows.map((row, index) => ({
    source_row: index + 2,
    record_type: String(valueByAliases(row, ["Record Type", "Type"])).trim().toLowerCase(),
    expense_id: String(valueByAliases(row, ["Expense ID", "Record ID", "ID"])).trim(),
    expense_date: normalizeDate(valueByAliases(row, ["Date", "Expense Date", "Transaction Date"])),
    vendor: String(valueByAliases(row, ["Vendor", "Merchant", "Payee"])).trim(),
    description: String(valueByAliases(row, ["Description", "Expense Description", "Memo"])).trim(),
    amount: parseMoney(valueByAliases(row, ["Amount ($)", "Amount", "Expense Amount", "Total"])),
    category_name: String(valueByAliases(row, ["Category", "Category (optional)", "Expense Category"])).trim(),
    paid_from: String(valueByAliases(row, ["Paid From", "Paid From (optional)", "Business Account", "Payment Source"])).trim(),
    business_purpose: String(valueByAliases(row, ["Business Purpose", "Purpose"])).trim(),
    customer_name: String(valueByAliases(row, ["Customer/Project", "Customer/Project (optional)", "Customer", "Client"])).trim(),
    notes: String(valueByAliases(row, ["Notes", "Note"])).trim()
  }));
  return { fileName: opened.fileName, rows };
}

export async function readMileageImportWorkbook() {
  const opened = await openWorkbook("Mileage");
  if (!opened) return null;
  const rows = opened.rows.map((row, index) => ({
    source_row: index + 2,
    mileage_id: String(valueByAliases(row, ["Mileage ID", "Record ID", "ID"])).trim(),
    trip_date: normalizeDate(valueByAliases(row, ["Date", "Trip Date"])),
    start_location: String(valueByAliases(row, ["From", "Start", "Start Location", "Origin"])).trim(),
    destination: String(valueByAliases(row, ["To", "Destination", "End Location"])).trim(),
    round_trip: String(valueByAliases(row, ["Round Trip (Yes/No)", "Round Trip", "Roundtrip"])).trim(),
    business_purpose: String(valueByAliases(row, ["Business Purpose", "Purpose"])).trim(),
    start_odometer: optionalNumber(valueByAliases(row, ["Start Odometer", "Starting Odometer", "Odometer Start"])),
    end_odometer: optionalNumber(valueByAliases(row, ["End Odometer", "Ending Odometer", "Odometer End"])),
    miles: Number(String(valueByAliases(row, ["Miles", "Business Miles", "Distance"])).replace(/,/g, "")),
    rate: parseMoney(valueByAliases(row, ["Rate ($/mile)", "Rate", "Mileage Rate", "Rate Per Mile"])),
    customer_name: String(valueByAliases(row, ["Customer/Project", "Customer/Project (optional)", "Customer", "Client"])).trim(),
    notes: String(valueByAliases(row, ["Notes", "Note"])).trim()
  }));
  return { fileName: opened.fileName, rows };
}

function timelinePlace(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.address || value.name || value.placeLocation?.latLng || value.latLng || value.location?.latLng || "";
}

function timelineTime(value) {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value);
  if (/^\d{12,}$/.test(text)) return new Date(Number(text)).toISOString();
  return text;
}

export async function readGoogleTimelineExport() {
  const selected = await openBytesWithDialog({ name: "Google Maps Timeline JSON", extensions: ["json"] });
  if (!selected) return null;
  const json = JSON.parse(new TextDecoder().decode(selected.bytes));
  const output = [];
  const add = ({ startTime, endTime, start, end, distanceMeters, sourceRef }) => {
    startTime = timelineTime(startTime);
    endTime = timelineTime(endTime);
    const distance = Number(distanceMeters || 0);
    if (!startTime || distance <= 0) return;
    output.push({
      trip_date: normalizeDate(String(startTime).slice(0, 10)),
      started_at: startTime, ended_at: endTime || null,
      start_location: timelinePlace(start), destination: timelinePlace(end),
      miles: Math.round((distance / 1609.344) * 10) / 10,
      source_ref: sourceRef || `${startTime}|${endTime || ""}|${distance}`,
      notes: "Imported from Google Maps Timeline; classify as business or personal."
    });
  };

  for (const item of json.timelineObjects || []) {
    const a = item.activitySegment;
    if (!a) continue;
    const type = String(a.activityType || "").toUpperCase();
    if (!type.includes("DRIV") && !type.includes("VEHICLE")) continue;
    add({ startTime: a.duration?.startTimestamp || a.duration?.startTimestampMs,
      endTime: a.duration?.endTimestamp || a.duration?.endTimestampMs,
      start: a.startLocation, end: a.endLocation, distanceMeters: a.distance, sourceRef: a.hexRgbColor });
  }

  for (const [index, segment] of (json.semanticSegments || []).entries()) {
    const activity = segment.activity || segment.activitySegment || {};
    const type = String(activity.topCandidate?.type || activity.activityType || segment.activityType || "").toUpperCase();
    if (!type.includes("DRIV") && !type.includes("VEHICLE")) continue;
    const path = segment.timelinePath || segment.timelineMemory?.timelinePath || [];
    const start = segment.startLocation || activity.startLocation || path[0]?.point;
    const end = segment.endLocation || activity.endLocation || path[path.length - 1]?.point;
    add({ startTime: segment.startTime, endTime: segment.endTime, start, end,
      distanceMeters: activity.distanceMeters || activity.distance || segment.distanceMeters,
      sourceRef: `semantic-${index}-${segment.startTime || ""}` });
  }
  return { fileName: selected.fileName, rows: output };
}

export async function exportExpensesExcel(rows) {
  const output = rows.map((r) => ({
    "Expense ID": r.id,
    Date: r.expense_date,
    Vendor: r.vendor || "",
    Description: r.description || "",
    "Amount ($)": fromCents(r.amount_cents),
    Category: r.category_name || "",
    "Paid From": r.paid_from || r.account_name || (r.payment_source === "personal" ? "Personal / owner-paid" : ""),
    "Customer/Project": r.customer_name || "",
    Receipt: r.receipt_path ? "Attached" : "Missing",
    Notes: r.notes || ""
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(output);
  autosize(ws, [38, 12, 22, 34, 13, 24, 25, 25, 12, 34]);
  styleExpenseExport(ws, output.length, 10);
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");
  const instructions = XLSX.utils.aoa_to_sheet([
    ["Expense export and update instructions"],
    ["1", "Keep Expense ID unchanged. It connects each Excel row to its existing Qentro expense."],
    ["2", "Edit the fields you want to correct, then import this workbook from the Expenses page."],
    ["3", "Rows with a matching Expense ID update the existing expense instead of creating a duplicate."],
    ["4", "Rows without an Expense ID are treated as new expenses."],
    ["5", "Removing a row from Excel does not delete it from Qentro."]
  ]);
  instructions["!cols"] = [{ wch: 5 }, { wch: 100 }];
  instructions.A1.s = {
    fill: { patternType: "solid", fgColor: { rgb: "1F7A86" } },
    font: { name: "Carlito", sz: 11, bold: true, color: { rgb: "FFFFFF" } }
  };
  instructions.B1.s = instructions.A1.s;
  instructions["!rows"] = [{ hpt: 24 }];
  XLSX.utils.book_append_sheet(wb, instructions, "Instructions");
  return saveBytesWithDialog(workbookBytes(wb), `Qentro_Expenses_${today()}.xlsx`, ["xlsx"]);
}

export async function exportExpenseRecordsExcel(rows, month) {
  const output = rows.map((r) => ({
    "Record Type": r.record_type === "bank" ? "Bank" : "Expense",
    "Expense ID": r.record_type === "expense" ? r.id : "",
    "Bank Transaction ID": r.record_type === "bank" ? r.id : "",
    Date: r.record_date || r.expense_date,
    Vendor: r.vendor || "",
    Description: r.description || "",
    Category: r.category_name || "Uncategorized",
    "Paid From": r.paid_from || "",
    Source: r.source_label || "",
    Status: String(r.status_label || "").replaceAll("_", " "),
    Direction: Number(r.is_money_in) ? "Money in" : "Money out",
    "Amount ($)": fromCents(r.amount_cents),
    "Customer/Project": r.customer_name || "",
    Receipt: r.record_type === "expense" ? (r.receipt_path ? "Attached" : "Missing") : "Bank record",
    Notes: r.notes || ""
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(output);
  autosize(ws, [14, 38, 38, 12, 24, 36, 26, 24, 24, 18, 14, 14, 24, 14, 34]);
  for (let column = 0; column < 15; column += 1) {
    const header = ws[XLSX.utils.encode_cell({ r: 0, c: column })];
    if (header) header.s = templateHeaderStyle;
  }
  ws["!rows"] = [{ hpt: 30 }];
  for (let row = 1; row <= output.length; row += 1) {
    const dateCell = ws[XLSX.utils.encode_cell({ r: row, c: 3 })];
    if (dateCell) dateCell.s = { numFmt: "yyyy-mm-dd" };
    const amountCell = ws[XLSX.utils.encode_cell({ r: row, c: 11 })];
    if (amountCell) amountCell.s = { numFmt: "$#,##0.00" };
  }
  XLSX.utils.book_append_sheet(wb, ws, "Expense Records");
  return saveBytesWithDialog(workbookBytes(wb), `Qentro_Expense_Records_${month || today()}.xlsx`, ["xlsx"]);
}

export async function exportMileageExcel(rows) {
  const output = rows.map((r) => ({
    "Mileage ID": r.id,
    Date: r.trip_date,
    From: r.start_location || "",
    To: r.destination || "",
    "Round Trip (Yes/No)": Number(r.round_trip || 0) ? "Yes" : "No",
    "Business Purpose": r.business_purpose || "",
    "Start Odometer": r.start_odometer ?? "",
    "End Odometer": r.end_odometer ?? "",
    Miles: Number(r.miles || 0),
    "Rate ($/mile)": Number(r.rate_mills_per_mile || Number(r.rate_cents_per_mile || 0) * 10) / 1000,
    "Deduction ($)": fromCents(r.deduction_cents),
    "Customer/Project": r.customer_name || "",
    Notes: r.notes || ""
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(output);
  autosize(ws, [38, 12, 24, 24, 18, 34, 16, 16, 12, 16, 16, 24, 34]);
  styleExpenseExport(ws, output.length, 13);
  for (let row = 1; row <= output.length; row += 1) {
    const roundTripCell = ws[XLSX.utils.encode_cell({ r: row, c: 4 })];
    if (roundTripCell) roundTripCell.s = { numFmt: "@" };
    for (const column of [6, 7, 8]) {
      const cell = ws[XLSX.utils.encode_cell({ r: row, c: column })];
      if (cell) cell.s = { numFmt: "0.0" };
    }
    const rateCell = ws[XLSX.utils.encode_cell({ r: row, c: 9 })];
    if (rateCell) rateCell.s = { numFmt: "$0.000" };
    const deductionCell = ws[XLSX.utils.encode_cell({ r: row, c: 10 })];
    if (deductionCell) deductionCell.s = { numFmt: "$#,##0.00" };
  }
  XLSX.utils.book_append_sheet(wb, ws, "Mileage");
  return saveBytesWithDialog(workbookBytes(wb), `Qentro_Mileage_${today()}.xlsx`, ["xlsx"]);
}
