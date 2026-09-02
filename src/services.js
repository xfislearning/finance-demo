import { execute, select, getSettings, saveSettings } from "./db";
import { uuid, today, toCents, monthKey } from "./utils";

const now = () => new Date().toISOString();

export async function listCustomers() {
  return select("SELECT * FROM customers WHERE active = 1 ORDER BY name");
}

export async function createCustomer(data) {
  const id = uuid();
  await execute(
    `INSERT INTO customers
     (id,name,contact_name,email,phone,billing_address,notes,active,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,1,?,?)`,
    [
      id,
      String(data.name || "").trim(),
      String(data.contact_name || "").trim(),
      String(data.email || "").trim(),
      String(data.phone || "").trim(),
      String(data.billing_address || "").trim(),
      String(data.notes || "").trim(),
      now(),
      now()
    ]
  );
  return id;
}

export async function listCategories() {
  return select("SELECT * FROM expense_categories WHERE active = 1 ORDER BY name");
}

export async function listAccounts() {
  return select("SELECT * FROM accounts WHERE active = 1 ORDER BY name");
}

export async function listAllAccounts() {
  return select("SELECT * FROM accounts ORDER BY active DESC, name");
}

export async function createAccount(data) {
  const id = uuid();
  await execute(
    `INSERT INTO accounts (id,name,account_type,institution,last4,active,created_at)
     VALUES (?,?,?,?,?,1,?)`,
    [
      id,
      String(data.name || "").trim(),
      data.account_type || "checking",
      String(data.institution || "").trim(),
      String(data.last4 || "").trim(),
      now()
    ]
  );
  return id;
}

export async function updateAccount(id, data) {
  await execute(
    `UPDATE accounts SET name=?, account_type=?, institution=?, last4=? WHERE id=?`,
    [
      String(data.name || "").trim(),
      data.account_type || "checking",
      String(data.institution || "").trim(),
      String(data.last4 || "").trim(),
      id
    ]
  );
}

export async function deactivateAccount(id) {
  await execute("UPDATE accounts SET active=0 WHERE id=?", [id]);
}

export async function reactivateAccount(id) {
  await execute("UPDATE accounts SET active=1 WHERE id=?", [id]);
}

export async function listExpenses(limit = 500) {
  return select(
    `SELECT e.*, c.name category_name, cu.name customer_name, a.name account_name
     FROM expenses e
     LEFT JOIN expense_categories c ON c.id=e.category_id
     LEFT JOIN customers cu ON cu.id=e.customer_id
     LEFT JOIN accounts a ON a.id=e.account_id
     ORDER BY e.expense_date DESC, e.created_at DESC
     LIMIT ?`,
    [limit]
  );
}

export async function listExpenseWorkspace(limit = 10000) {
  return select(
    `SELECT * FROM (
       SELECT
         'expense:' || e.id record_key,
         'expense' record_type,
         e.id,
         e.expense_date record_date,
         e.expense_date,
         e.vendor,
         e.description,
         e.amount_cents,
         e.category_id,
         COALESCE(c.name,'Uncategorized') category_name,
         e.payment_source,
         e.account_id,
         COALESCE(NULLIF(e.paid_from,''),a.name,'') paid_from,
         CASE WHEN EXISTS (
           SELECT 1 FROM reconciliations r
           WHERE r.target_type='expense' AND r.target_id=e.id
         ) THEN REPLACE(COALESCE(e.source,'manual'),'_',' ') || ' + bank matched'
         ELSE REPLACE(COALESCE(e.source,'manual'),'_',' ') END source_label,
         COALESCE(e.reconciliation_status,'reconciled') status_label,
         e.reconciliation_status,
         e.customer_id,
         cu.name customer_name,
         e.receipt_path,
         e.notes,
         0 is_money_in
       FROM expenses e
       LEFT JOIN expense_categories c ON c.id=e.category_id
       LEFT JOIN customers cu ON cu.id=e.customer_id
       LEFT JOIN accounts a ON a.id=e.account_id

       UNION ALL

       SELECT
         'bank:' || b.id record_key,
         'bank' record_type,
         b.id,
         b.bank_date record_date,
         b.bank_date expense_date,
         COALESCE(NULLIF(b.normalized_merchant,''),b.description) vendor,
         b.description,
         ABS(b.amount_cents) amount_cents,
         b.suggested_category_id category_id,
         CASE WHEN r.target_type='bank_bonus' THEN 'Bank Bonus / Interest Income'
              WHEN r.target_type='income' THEN 'Other Income'
              WHEN r.target_type='owner_contribution' THEN 'Owner Contribution'
              WHEN r.target_type='transfer' THEN 'Transfer'
              WHEN r.target_type='personal' THEN 'Personal'
              WHEN r.target_type='loan_payment' THEN 'Loan Payment'
              WHEN r.target_type='other' THEN 'Other / Excluded'
              ELSE COALESCE(NULLIF(b.suggested_category,''),'Uncategorized / Needs Review') END category_name,
         'business' payment_source,
         b.account_id,
         a.name paid_from,
         'bank import' source_label,
         CASE WHEN b.reconciled=1 THEN COALESCE(r.target_type,'reconciled')
              ELSE COALESCE(NULLIF(b.categorization_status,''),'Needs Review') END status_label,
         CASE WHEN b.reconciled=1 THEN 'reconciled' ELSE 'unreconciled' END reconciliation_status,
         NULL customer_id,
         NULL customer_name,
         NULL receipt_path,
         b.categorization_note notes,
         CASE WHEN b.amount_cents>0 THEN 1 ELSE 0 END is_money_in
       FROM bank_transactions b
       JOIN accounts a ON a.id=b.account_id
       LEFT JOIN reconciliations r ON r.bank_transaction_id=b.id
       WHERE NOT EXISTS (
         SELECT 1 FROM reconciliations linked
         WHERE linked.bank_transaction_id=b.id
           AND linked.target_type IN ('expense','payment')
       )
     ) workspace
     ORDER BY record_date DESC, record_key DESC
     LIMIT ?`,
    [limit]
  );
}

export async function createExpense(data) {
  const paidFrom = String(data.paid_from || "").trim();
  if (!paidFrom) throw new Error("Paid From is required.");
  const id = uuid();
  const reconciliationStatus = data.reconciliation_status || "pending";
  await execute(
    `INSERT INTO expenses
     (id,expense_date,vendor,description,amount_cents,category_id,payment_source,account_id,
      business_purpose,customer_id,project_id,receipt_path,notes,created_at,updated_at,
      paid_from,source,source_ref,reconciliation_status,bank_posted_date)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      data.expense_date || today(),
      String(data.vendor || "").trim(),
      String(data.description || "").trim(),
      toCents(data.amount),
      data.category_id || null,
      data.payment_source || "business",
      data.payment_source === "personal" ? null : data.account_id || null,
      String(data.business_purpose || "").trim(),
      data.customer_id || null,
      data.project_id || null,
      data.receipt_path || null,
      String(data.notes || "").trim(),
      now(),
      now(),
      paidFrom,
      data.source || "manual",
      data.source_ref || null,
      reconciliationStatus,
      data.bank_posted_date || null
    ]
  );
  if (reconciliationStatus === "reconciled") await postExpenseToLedger(id);
  return id;
}

export async function updateExpense(id, data) {
  const paidFrom = String(data.paid_from || "").trim();
  if (!paidFrom) throw new Error("Paid From is required.");
  await execute(
    `UPDATE expenses SET expense_date=?,vendor=?,description=?,amount_cents=?,category_id=?,
     payment_source=?,account_id=?,business_purpose=?,customer_id=?,notes=?,paid_from=?,updated_at=?
     WHERE id=?`,
    [
      data.expense_date || today(), String(data.vendor || "").trim(),
      String(data.description || "").trim(), toCents(data.amount), data.category_id || null,
      data.payment_source || "business", data.account_id || null,
      String(data.business_purpose || "").trim(), data.customer_id || null,
      String(data.notes || "").trim(), paidFrom, now(), id
    ]
  );
  const row = (await select("SELECT reconciliation_status FROM expenses WHERE id=?", [id]))[0];
  if (row?.reconciliation_status === "reconciled") await postExpenseToLedger(id);
}

export async function deleteExpense(id) {
  const links = await select("SELECT id FROM reconciliations WHERE target_type='expense' AND target_id=?", [id]);
  if (links.length) throw new Error("This expense is linked to a bank transaction. Unlink it before deleting it.");
  await execute("DELETE FROM journal_entries WHERE source_type='expense' AND source_id=?", [id]);
  await execute("DELETE FROM expenses WHERE id=?", [id]);
}

export async function finalizePendingNonBankExpenses() {
  const rows = await select(
    `SELECT id FROM expenses
     WHERE COALESCE(reconciliation_status,'reconciled')='pending'
       AND COALESCE(source,'manual')<>'bank_import'
       AND TRIM(COALESCE(paid_from,''))<>''`
  );
  for (const row of rows) await approveExpense(row.id);
  return rows.length;
}

export async function listPendingExpenses() {
  return select(
    `SELECT e.*,c.name category_name,cu.name customer_name,a.name account_name
     FROM expenses e
     LEFT JOIN expense_categories c ON c.id=e.category_id
     LEFT JOIN customers cu ON cu.id=e.customer_id
     LEFT JOIN accounts a ON a.id=e.account_id
     WHERE COALESCE(e.reconciliation_status,'reconciled')='pending'
     ORDER BY e.expense_date DESC,e.created_at DESC`
  );
}

export async function approveExpense(id) {
  const expense = (await select("SELECT * FROM expenses WHERE id=?", [id]))[0];
  if (!expense) throw new Error("Expense was not found.");
  if (!String(expense.paid_from || "").trim()) throw new Error("Paid From is required before this expense can be approved.");
  await execute("UPDATE expenses SET reconciliation_status='reconciled',updated_at=? WHERE id=?", [now(), id]);
  await postExpenseToLedger(id);
}

function expenseCreditAccount(expense) {
  const paidFrom = String(expense.paid_from || expense.account_name || "").trim();
  if (expense.payment_source === "personal" || /personal|owner|employee/i.test(paidFrom)) return "Owner Contribution";
  if (/credit\s*card/i.test(paidFrom)) return expense.account_name || (paidFrom && paidFrom !== "Business Credit Card" ? paidFrom : "Credit Card Payable");
  if (/cash/i.test(paidFrom)) return expense.account_name || "Business Cash";
  if (/check(ing)?/i.test(paidFrom)) return expense.account_name || "Business Checking";
  return expense.account_name || paidFrom || "Unassigned Payment Source";
}

export async function postExpenseToLedger(id) {
  const expense = (await select(
    `SELECT e.*,COALESCE(c.name,'Uncategorized Expense') category_name,a.name account_name
     FROM expenses e LEFT JOIN expense_categories c ON c.id=e.category_id
     LEFT JOIN accounts a ON a.id=e.account_id WHERE e.id=?`, [id]
  ))[0];
  if (!expense) throw new Error("Expense was not found.");
  if (expense.reconciliation_status !== "reconciled") throw new Error("Only approved expenses can be posted.");
  if (!String(expense.paid_from || "").trim()) throw new Error("Paid From is required before posting.");
  const amount = Number(expense.amount_cents || 0);
  if (amount <= 0) throw new Error("Expense amount must be greater than zero.");
  const existing = (await select("SELECT id FROM journal_entries WHERE source_type='expense' AND source_id=?", [id]))[0];
  const journalId = existing?.id || uuid();
  if (existing) {
    await execute("DELETE FROM journal_lines WHERE journal_entry_id=?", [journalId]);
    await execute(`UPDATE journal_entries SET entry_date=?,description=?,status='posted',posted_at=? WHERE id=?`,
      [expense.expense_date, [expense.vendor, expense.description].filter(Boolean).join(" - ") || "Business expense", now(), journalId]);
  } else {
    await execute(`INSERT INTO journal_entries (id,entry_date,description,source_type,source_id,status,posted_at)
      VALUES (?,?,?,?,?,'posted',?)`, [journalId, expense.expense_date, [expense.vendor, expense.description].filter(Boolean).join(" - ") || "Business expense", "expense", id, now()]);
  }
  await execute(`INSERT INTO journal_lines (id,journal_entry_id,account_name,debit_cents,credit_cents,sort_order) VALUES (?,?,?,?,0,1)`,
    [uuid(), journalId, expense.category_name, amount]);
  await execute(`INSERT INTO journal_lines (id,journal_entry_id,account_name,debit_cents,credit_cents,sort_order) VALUES (?,?,?,0,?,2)`,
    [uuid(), journalId, expenseCreditAccount(expense), amount]);
  return journalId;
}

async function syncApprovedExpensesToLedger() {
  const rows = await select(
    `SELECT e.id FROM expenses e LEFT JOIN journal_entries j ON j.source_type='expense' AND j.source_id=e.id
     WHERE e.reconciliation_status='reconciled' AND TRIM(COALESCE(e.paid_from,''))<>'' AND j.id IS NULL`
  );
  for (const row of rows) await postExpenseToLedger(row.id);
}

export async function setExpenseReceipt(id, path) {
  await execute(
    "UPDATE expenses SET receipt_path=?, updated_at=? WHERE id=?",
    [path, now(), id]
  );
}

export async function listMileage(limit = 500) {
  return select(
    `SELECT m.*, COALESCE(m.rate_mills_per_mile,m.rate_cents_per_mile*10) rate_mills_per_mile,
      cu.name customer_name
     FROM mileage_entries m
     LEFT JOIN customers cu ON cu.id=m.customer_id
     ORDER BY trip_date DESC, created_at DESC LIMIT ?`,
    [limit]
  );
}

export async function listMileageRates() {
  return select(
    `SELECT * FROM mileage_rates
     ORDER BY effective_from DESC, COALESCE(effective_to,'9999-12-31') DESC`
  );
}

async function validateMileageRatePeriod(data, excludeId = "") {
  const effectiveFrom = String(data.effective_from || "").trim();
  const effectiveTo = String(data.effective_to || "").trim() || null;
  const rate = Number(data.rate);
  if (!effectiveFrom) throw new Error("Effective From is required.");
  if (effectiveTo && effectiveTo < effectiveFrom) throw new Error("Effective To cannot be before Effective From.");
  if (!Number.isFinite(rate) || rate < 0) throw new Error("Rate must be zero or greater.");
  const overlap = (await select(
    `SELECT id FROM mileage_rates
     WHERE id<>?
       AND COALESCE(effective_to,'9999-12-31')>=?
       AND effective_from<=COALESCE(?,'9999-12-31')
     LIMIT 1`,
    [excludeId, effectiveFrom, effectiveTo]
  ))[0];
  if (overlap) throw new Error("This date range overlaps an existing mileage rate. End or edit the existing period first.");
  return { effectiveFrom, effectiveTo, rateMills: Math.round(rate * 1000) };
}

export async function createMileageRate(data) {
  const period = await validateMileageRatePeriod(data);
  const id = uuid();
  await execute(
    `INSERT INTO mileage_rates
     (id,effective_from,effective_to,rate_mills_per_mile,label,created_at)
     VALUES (?,?,?,?,?,?)`,
    [id, period.effectiveFrom, period.effectiveTo, period.rateMills, String(data.label || "").trim(), now()]
  );
  return id;
}

export async function updateMileageRate(id, data) {
  const period = await validateMileageRatePeriod(data, id);
  await execute(
    `UPDATE mileage_rates SET effective_from=?,effective_to=?,rate_mills_per_mile=?,label=? WHERE id=?`,
    [period.effectiveFrom, period.effectiveTo, period.rateMills, String(data.label || "").trim(), id]
  );
}

export async function deleteMileageRate(id) {
  await execute("DELETE FROM mileage_rates WHERE id=?", [id]);
}

export async function mileageRateForDate(date = today()) {
  const row = (await select(
    `SELECT rate_mills_per_mile FROM mileage_rates
     WHERE effective_from<=? AND (effective_to IS NULL OR effective_to>=?)
     ORDER BY effective_from DESC LIMIT 1`,
    [date, date]
  ))[0];
  if (row) return Number(row.rate_mills_per_mile || 0) / 1000;
  const settings = await getSettings();
  return Number(settings.mileage_rate_cents || 0) / 100;
}

export async function createMileage(data) {
  const id = uuid();
  const startOdometer = data.start_odometer === "" || data.start_odometer == null ? null : Number(data.start_odometer);
  const endOdometer = data.end_odometer === "" || data.end_odometer == null ? null : Number(data.end_odometer);
  if (startOdometer != null && (!Number.isFinite(startOdometer) || startOdometer < 0)) throw new Error("Start Odometer must be zero or greater.");
  if (endOdometer != null && (!Number.isFinite(endOdometer) || endOdometer < 0)) throw new Error("End Odometer must be zero or greater.");
  if (startOdometer != null && endOdometer != null && endOdometer < startOdometer) throw new Error("End Odometer cannot be less than Start Odometer.");
  const miles = startOdometer != null && endOdometer != null ? endOdometer - startOdometer : Number(data.miles || 0);
  if (!Number.isFinite(miles) || miles <= 0) throw new Error("Miles must be greater than zero.");
  const tripDate = data.trip_date || today();
  const suppliedRate = String(data.rate ?? "").trim();
  const rate = suppliedRate === "" ? await mileageRateForDate(tripDate) : Number(suppliedRate);
  const rateMills = Math.round(rate * 1000);
  const rateCents = Math.round(rateMills / 10);
  const deductionCents = Math.round(miles * rateMills / 10);
  await execute(
    `INSERT INTO mileage_entries
     (id,trip_date,start_location,destination,business_purpose,round_trip,start_odometer,end_odometer,miles,rate_cents_per_mile,
      rate_mills_per_mile,deduction_cents,customer_id,project_id,notes,created_at,source,source_ref,review_status,started_at,ended_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      tripDate,
      String(data.start_location || "").trim(),
      String(data.destination || "").trim(),
      String(data.business_purpose || "").trim(),
      data.round_trip === true || String(data.round_trip || "").toLowerCase() === "yes" ? 1 : 0,
      startOdometer,
      endOdometer,
      miles,
      rateCents,
      rateMills,
      deductionCents,
      data.customer_id || null,
      data.project_id || null,
      String(data.notes || "").trim(),
      now(), data.source || "manual", data.source_ref || null,
      data.review_status || "reviewed", data.started_at || null, data.ended_at || null
    ]
  );
  return id;
}

export async function updateMileage(id, data) {
  const existing = (await select("SELECT * FROM mileage_entries WHERE id=?", [id]))[0];
  if (!existing) throw new Error("Mileage record was not found.");
  const startOdometer = data.start_odometer === "" || data.start_odometer == null ? null : Number(data.start_odometer);
  const endOdometer = data.end_odometer === "" || data.end_odometer == null ? null : Number(data.end_odometer);
  if (startOdometer != null && (!Number.isFinite(startOdometer) || startOdometer < 0)) throw new Error("Start Odometer must be zero or greater.");
  if (endOdometer != null && (!Number.isFinite(endOdometer) || endOdometer < 0)) throw new Error("End Odometer must be zero or greater.");
  if (startOdometer != null && endOdometer != null && endOdometer < startOdometer) throw new Error("End Odometer cannot be less than Start Odometer.");
  const miles = startOdometer != null && endOdometer != null ? endOdometer - startOdometer : Number(data.miles || 0);
  if (!Number.isFinite(miles) || miles <= 0) throw new Error("Miles must be greater than zero.");
  const tripDate = data.trip_date || today();
  const suppliedRate = String(data.rate ?? "").trim();
  const rate = suppliedRate === "" ? await mileageRateForDate(tripDate) : Number(suppliedRate);
  const rateMills = Math.round(rate * 1000);
  const rateCents = Math.round(rateMills / 10);
  const deductionCents = existing.review_status === "personal" ? 0 : Math.round(miles * rateMills / 10);
  await execute(
    `UPDATE mileage_entries SET trip_date=?,start_location=?,destination=?,business_purpose=?,round_trip=?,start_odometer=?,end_odometer=?,miles=?,
     rate_cents_per_mile=?,rate_mills_per_mile=?,deduction_cents=?,customer_id=?,project_id=?,notes=? WHERE id=?`,
    [
      tripDate,
      String(data.start_location || "").trim(),
      String(data.destination || "").trim(),
      String(data.business_purpose || "").trim(),
      data.round_trip === true || String(data.round_trip || "").toLowerCase() === "yes" ? 1 : 0,
      startOdometer,
      endOdometer,
      miles,
      rateCents,
      rateMills,
      deductionCents,
      data.customer_id || null,
      data.project_id || null,
      String(data.notes || "").trim(),
      id
    ]
  );
}

export async function deleteMileage(id) {
  await execute("DELETE FROM mileage_entries WHERE id=?", [id]);
}

export async function importGoogleTimelineRows(rows) {
  const result = { imported: 0, skipped: 0, errors: [], warnings: [] };
  for (const row of rows) {
    try {
      if (!row.trip_date || !Number.isFinite(Number(row.miles)) || Number(row.miles) <= 0) continue;
      const duplicate = (await select(
        `SELECT id FROM mileage_entries WHERE trip_date=? AND ABS(miles-?)<0.15
         AND lower(trim(COALESCE(start_location,'')))=lower(trim(?))
         AND lower(trim(COALESCE(destination,'')))=lower(trim(?)) LIMIT 1`,
        [row.trip_date, Number(row.miles), row.start_location || "", row.destination || ""]
      ))[0];
      if (duplicate) { result.skipped += 1; continue; }
      await createMileage({ ...row, rate: "", business_purpose: "", source: "google_timeline", review_status: "needs_review" });
      result.imported += 1;
    } catch (error) { result.errors.push(String(error?.message || error)); }
  }
  return result;
}

export async function reviewMileage(id, classification, businessPurpose = "") {
  if (classification === "personal") {
    await execute("UPDATE mileage_entries SET review_status='personal',deduction_cents=0 WHERE id=?", [id]);
    return;
  }
  if (classification !== "business") throw new Error("Choose Business or Personal.");
  await execute(
    "UPDATE mileage_entries SET review_status='reviewed',business_purpose=? WHERE id=?",
    [String(businessPurpose || "").trim(), id]
  );
}

export async function nextInvoiceNumber() {
  const s = await getSettings();
  const n = Math.max(1, Number(s.next_invoice_number || 1));
  const year = new Date().getFullYear();
  return `${String(s.invoice_prefix || "QEN").trim() || "QEN"}-${year}-${String(n).padStart(3, "0")}`;
}

export async function createInvoice(data, items) {
  const id = uuid();
  const s = await getSettings();

  const taxable = data.taxable === "yes" || data.taxable === true || data.taxable === 1 ? 1 : 0;
  const taxRate = taxable ? Math.max(0, Number(data.tax_rate || 0)) : 0;
  const subtotalCents = items.reduce((sum, item) => {
    const qty = Number(item.quantity || 0);
    const rate = toCents(item.rate);
    return sum + Math.round(qty * rate);
  }, 0);
  const taxCents = taxable ? Math.round(subtotalCents * taxRate / 100) : 0;

  await execute(
    `INSERT INTO invoices
     (id,invoice_number,customer_id,invoice_date,due_date,status,notes,payment_instructions,taxable,tax_rate,tax_cents,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      String(data.invoice_number || "").trim(),
      data.customer_id,
      data.invoice_date || today(),
      data.due_date || null,
      data.status || "Draft",
      String(data.notes || "").trim(),
      String(data.payment_instructions || s.payment_instructions || "").trim(),
      taxable,
      taxRate,
      taxCents,
      now(),
      now()
    ]
  );

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const qty = Number(item.quantity || 0);
    const rate = toCents(item.rate);
    await execute(
      `INSERT INTO invoice_items
       (id,invoice_id,description,quantity,rate_cents,amount_cents,sort_order)
       VALUES (?,?,?,?,?,?,?)`,
      [
        uuid(),
        id,
        String(item.description || "").trim(),
        qty,
        rate,
        Math.round(qty * rate),
        i
      ]
    );
  }

  const n = Math.max(1, Number(s.next_invoice_number || 1)) + 1;
  await saveSettings({ next_invoice_number: String(n) });
  return id;
}

export async function listInvoices() {
  return select(
    `SELECT i.*, c.name customer_name,
      COALESCE((SELECT SUM(amount_cents) FROM invoice_items x WHERE x.invoice_id=i.id),0) subtotal_cents,
      COALESCE((SELECT SUM(amount_cents) FROM invoice_items x WHERE x.invoice_id=i.id),0) + COALESCE(i.tax_cents,0) total_cents,
      COALESCE((SELECT SUM(amount_cents) FROM payments p WHERE p.invoice_id=i.id),0) paid_cents
     FROM invoices i
     JOIN customers c ON c.id=i.customer_id
     ORDER BY i.invoice_date DESC, i.created_at DESC`
  );
}

export async function getInvoice(id) {
  const inv = (await select(
    `SELECT i.*, c.name customer_name,c.contact_name,c.email,c.phone,c.billing_address
     FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.id=?`,
    [id]
  ))[0];
  if (!inv) return null;
  inv.items = await select(
    "SELECT * FROM invoice_items WHERE invoice_id=? ORDER BY sort_order,id",
    [id]
  );
  inv.subtotal_cents = inv.items.reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);
  inv.tax_cents = Number(inv.tax_cents || 0);
  inv.tax_rate = Number(inv.tax_rate || 0);
  inv.total_cents = inv.subtotal_cents + inv.tax_cents;
  inv.payments = await select(
    "SELECT * FROM payments WHERE invoice_id=? ORDER BY payment_date,created_at",
    [id]
  );
  return inv;
}

export async function updateInvoiceStatus(id, status) {
  await execute(
    "UPDATE invoices SET status=?, updated_at=? WHERE id=?",
    [status, now(), id]
  );
}

export async function recordPayment(data) {
  const id = uuid();
  const amountCents = toCents(data.amount);
  await execute(
    `INSERT INTO payments
     (id,invoice_id,customer_id,payment_date,amount_cents,account_id,reference,notes,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      id,
      data.invoice_id || null,
      data.customer_id || null,
      data.payment_date || today(),
      amountCents,
      data.account_id || null,
      String(data.reference || "").trim(),
      String(data.notes || "").trim(),
      now()
    ]
  );

  if (data.invoice_id) {
    const rows = await select(
      `SELECT
       COALESCE((SELECT SUM(amount_cents) FROM invoice_items WHERE invoice_id=?),0) +
       COALESCE((SELECT tax_cents FROM invoices WHERE id=?),0) total,
       COALESCE((SELECT SUM(amount_cents) FROM payments WHERE invoice_id=?),0) paid`,
      [data.invoice_id, data.invoice_id, data.invoice_id]
    );
    const status = rows[0].paid >= rows[0].total ? "Paid" : "Partially Paid";
    await updateInvoiceStatus(data.invoice_id, status);
  }
  return id;
}

function monthBounds(month) {
  const start = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const end = `${y + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}-01`;
  return { start, end };
}

function dayAfter(date) {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);
}

function reportBounds(period = monthKey()) {
  if (typeof period === "string") return { ...monthBounds(period), mode: "month", value: period };
  const mode = period?.mode || "ytd";
  const currentDate = today();
  const currentYear = currentDate.slice(0, 4);
  if (mode === "month") {
    const value = period?.value || monthKey();
    return { ...monthBounds(value), mode, value };
  }
  if (mode === "year") {
    const value = String(period?.value || currentYear);
    return { start: `${value}-01-01`, end: `${Number(value) + 1}-01-01`, mode, value };
  }
  return { start: `${currentYear}-01-01`, end: dayAfter(currentDate), mode: "ytd", value: currentDate };
}

async function paymentRevenueTax(start = null, end = null) {
  const conditions = [];
  const params = [];
  if (start) { conditions.push("p.payment_date>=?"); params.push(start); }
  if (end) { conditions.push("p.payment_date<?"); params.push(end); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await select(
    `SELECT p.amount_cents,
      COALESCE(i.tax_cents,0) tax_cents,
      COALESCE((SELECT SUM(ii.amount_cents) FROM invoice_items ii WHERE ii.invoice_id=i.id),0) subtotal_cents
     FROM payments p LEFT JOIN invoices i ON i.id=p.invoice_id
     ${where}`,
    params
  );
  let cash = 0, revenue = 0, tax = 0;
  for (const r of rows) {
    const payment = Number(r.amount_cents || 0);
    const subtotal = Number(r.subtotal_cents || 0);
    const invoiceTax = Number(r.tax_cents || 0);
    const invoiceTotal = subtotal + invoiceTax;
    const taxPart = invoiceTotal > 0 && invoiceTax > 0
      ? Math.round(payment * invoiceTax / invoiceTotal)
      : 0;
    cash += payment;
    tax += taxPart;
    revenue += payment - taxPart;
  }
  return { cash, revenue, tax };
}

export async function dashboard(dateFrom = "", dateTo = "") {
  const start = dateFrom || null;
  const endExclusive = dateTo
    ? new Date(new Date(`${dateTo}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10)
    : null;
  const paymentSplit = await paymentRevenueTax(start, endExclusive);
  const rev = paymentSplit.revenue;
  await syncBankClassificationsToAccounting();
  const otherIncome = Number((await select(
    `SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries
     WHERE entry_type='other_income' AND (? IS NULL OR entry_date>=?) AND (? IS NULL OR entry_date<?)`,
    [start, start, endExclusive, endExclusive]
  ))[0].v || 0);
  const exp = (await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM expenses WHERE (? IS NULL OR expense_date>=?) AND (? IS NULL OR expense_date<?)",
    [start, start, endExclusive, endExclusive]
  ))[0].v;
  const miles = (await select(
    "SELECT COALESCE(SUM(miles),0) v, COALESCE(SUM(deduction_cents),0) d FROM mileage_entries WHERE (? IS NULL OR trip_date>=?) AND (? IS NULL OR trip_date<?) AND COALESCE(review_status,'reviewed')<>'personal'",
    [start, start, endExclusive, endExclusive]
  ))[0];
  const out = (await select(
    `SELECT COALESCE(SUM(CASE WHEN total>paid THEN total-paid ELSE 0 END),0) v FROM (
      SELECT i.id,
       COALESCE((SELECT SUM(amount_cents) FROM invoice_items WHERE invoice_id=i.id),0) + COALESCE(i.tax_cents,0) total,
       COALESCE((SELECT SUM(amount_cents) FROM payments WHERE invoice_id=i.id),0) paid
      FROM invoices i WHERE i.status NOT IN ('Cancelled','Paid')
       AND (? IS NULL OR i.invoice_date>=?) AND (? IS NULL OR i.invoice_date<?)
     )`,
    [start, start, endExclusive, endExclusive]
  ))[0].v;
  const missing = (await select(
    `SELECT COUNT(*) c FROM expenses
     WHERE (? IS NULL OR expense_date>=?) AND (? IS NULL OR expense_date<?) AND (receipt_path IS NULL OR receipt_path='')`,
    [start, start, endExclusive, endExclusive]
  ))[0].c;
  const unreconciled = (await select(
    "SELECT COUNT(*) c FROM bank_transactions WHERE reconciled=0 AND (? IS NULL OR bank_date>=?) AND (? IS NULL OR bank_date<?)",
    [start, start, endExclusive, endExclusive]
  ))[0].c;

  return {
    revenue: rev,
    otherIncome,
    expenses: exp,
    profit: rev + otherIncome - exp,
    miles: miles.v,
    mileageDeduction: miles.d,
    outstanding: out,
    missingReceipts: missing,
    unreconciled
  };
}

export async function monthlyExpenseBreakdown(month = monthKey()) {
  const { start, end } = monthBounds(month);
  return select(
    `SELECT COALESCE(c.name,'Uncategorized') category, SUM(e.amount_cents) amount_cents
     FROM expenses e LEFT JOIN expense_categories c ON c.id=e.category_id
     WHERE e.expense_date>=? AND e.expense_date<?
     GROUP BY COALESCE(c.name,'Uncategorized') ORDER BY amount_cents DESC`,
    [start, end]
  );
}


function normalizeMerchant(description) {
  return String(description || "")
    .toUpperCase()
    .replace(/\b(POS|PURCHASE|DEBIT|CREDIT|CARD|CHECKCARD|ACH|ONLINE|RECURRING)\b/g, " ")
    .replace(/\d{4,}/g, " ")
    .replace(/[^A-Z0-9&/ .-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function categoryMaps() {
  const rows = await listCategories();
  const byName = new Map(rows.map((r) => [String(r.name || "").toLowerCase(), r]));
  return { rows, byName };
}

function categoryResult(byName, categoryName) {
  const row = byName.get(String(categoryName || "").toLowerCase());
  return { suggested_category: categoryName || "", suggested_category_id: row?.id || null };
}

function includesAny(text, patterns) {
  return patterns.some((p) => text.includes(p));
}

function classifyBuiltIn(tx, byName) {
  const d = String(tx.description || "").toUpperCase();
  const merchant = normalizeMerchant(tx.description);
  const amount = Number(tx.amount_cents || 0);
  const base = {
    normalized_merchant: merchant,
    suggested_category: "",
    suggested_category_id: null,
    suggested_type: amount < 0 ? "expense" : "deposit_candidate",
    categorization_confidence: "Low",
    categorization_status: "Needs Review",
    rule_source: "fallback",
    categorization_note: amount < 0 ? "No reliable rule matched this money-out transaction." : "Credits are not automatically treated as revenue. Review transfers, owner contributions, loans, refunds, and customer payments first."
  };

  // Special transaction logic and guardrails take priority over general merchant keywords.
  if (/PARK(ING)?\s+(TICKET|FINE)|TRAFFIC\s+(TICKET|FINE)|CITATION|MUNICIPAL\s+COURT/.test(d)) {
    return { ...base, ...categoryResult(byName, "Fines & Penalties - Non-deductible"), suggested_type: "non_deductible", categorization_confidence: "Medium", categorization_status: "Suggested", rule_source: "special rule", categorization_note: "Possible citation/fine. Never map automatically to ordinary business parking." };
  }
  if (/REFUND|REVERSAL|REIMBURSEMENT/.test(d)) {
    return { ...base, suggested_category: "Refund / Reimbursement", suggested_type: "refund", categorization_confidence: "Medium", categorization_status: "Suggested", rule_source: "special rule", categorization_note: "Try to link this credit/reversal to the original expense or income transaction." };
  }
  if (/TRANSFER BETWEEN|BANK.?TO.?BANK|INTERNAL TRANSFER|ONLINE TRANSFER|TRANSFER TO|TRANSFER FROM/.test(d)) {
    return { ...base, suggested_category: "Transfer Between Accounts", suggested_type: "transfer", categorization_confidence: "Low", categorization_status: "Needs Review", rule_source: "special rule", categorization_note: "Possible transfer. Match both sides when both business accounts are imported; do not count it as income or expense." };
  }
  if (/LOAN\s*(PAYMENT|PMT)|NOTE\s*PAYMENT|DEBT\s*PAYMENT/.test(d)) {
    return { ...base, suggested_category: "Loan Payment", suggested_type: "loan_payment", categorization_confidence: "Low", categorization_status: "Needs Review", rule_source: "special rule", categorization_note: "Loan payments may need principal and interest split." };
  }
  if (/CHECK\s*#|CASH WITHDRAWAL|ATM WITHDRAWAL|GENERIC ACH/.test(d) || (/\bACH\b/.test(d) && merchant.length < 18)) {
    return { ...base, suggested_category: "Uncategorized / Needs Review", suggested_type: "needs_review", categorization_confidence: "Low", categorization_status: "Needs Review", rule_source: "special rule", categorization_note: "Checks, cash withdrawals, and ambiguous ACH entries do not provide enough information for safe automatic categorization." };
  }

  if (amount > 0 && /STRIPE|SQUARE|PAYPAL/.test(d)) {
    return { ...base, suggested_category: "Income candidate", suggested_type: "income_candidate", categorization_confidence: "Low", categorization_status: "Needs Review", rule_source: "merchant rule", categorization_note: "Possible payment-processor settlement. Match to customer invoice/payment before treating as revenue; fees may be separate." };
  }
  if (amount > 0) return base;

  // Hardware merchants are deliberately routed to review rather than auto-expensed.
  if (includesAny(d, ["BEST BUY", "APPLE", "DELL", "LENOVO", "NVIDIA", "MICRO CENTER", "NEWEGG"])) {
    return { ...base, ...categoryResult(byName, "Computer Equipment"), suggested_type: "asset_candidate", categorization_confidence: "Medium", categorization_status: "Suggested", rule_source: "merchant rule", categorization_note: "Hardware / asset candidate. Confirm whether this should be a current expense or fixed asset before reconciling." };
  }

  const highRules = [
    [["OPENAI", "ANTHROPIC", "MICROSOFT 365", "GOOGLE WORKSPACE"], "Software & Subscriptions", "Known software/subscription merchant."],
    [["NAMECHEAP", "GODADDY", "DOMAIN.COM"], "Web, Cloud & Hosting", "Known domain/hosting merchant."],
    [["AWS", "AMAZON WEB SERVICES", "AZURE", "GOOGLE CLOUD", "VERCEL", "SUPABASE"], "Web, Cloud & Hosting", "Known cloud/hosting merchant; review unusual hardware-like purchases."],
    [["CHAMBER OF COMMERCE", "PROFESSIONAL ASSOCIATION"], "Dues & Memberships", "Known business membership pattern."]
  ];
  for (const [patterns, category, note] of highRules) {
    if (includesAny(d, patterns)) return { ...base, ...categoryResult(byName, category), suggested_type: "expense", categorization_confidence: "High", categorization_status: "Auto-categorized", rule_source: "merchant rule", categorization_note: note };
  }
  if (/(VISTAPRINT|MOO)/.test(d) && /BUSINESS\s*CARD/.test(d)) {
    return { ...base, ...categoryResult(byName, "Business Cards"), suggested_type: "expense", categorization_confidence: "High", categorization_status: "Auto-categorized", rule_source: "keyword rule", categorization_note: "Business-card printing pattern." };
  }
  if (/VISTAPRINT|MOO/.test(d)) {
    return { ...base, ...categoryResult(byName, "Advertising & Marketing"), suggested_type: "expense", categorization_confidence: "Medium", categorization_status: "Suggested", rule_source: "merchant rule", categorization_note: "Printing/marketing merchant. Confirm whether this was business cards, flyers, brochures, or another marketing item." };
  }

  const mediumRules = [
    [["STARBUCKS", "COFFEE", "CAFE"], "Coffee / Business Meetings", "Merchant suggests coffee, but business purpose/attendee should be confirmed."],
    [["PARKMOBILE", "PARKING", "GARAGE"], "Parking", "Likely business parking. Confirm it is not a citation/fine and has business purpose."],
    [["SHELL", "EXXON", "CHEVRON", "CONOCO", "CIRCLE K"], "Gas / Fuel", "Fuel purchase. Review if the standard mileage method is used to avoid double-counting."],
    [["UNITED AIR", "UNITED AIRLINES", "SOUTHWEST", "DELTA AIR", "DELTA AIRLINES", "FRONTIER AIR"], "Airfare", "Likely airfare; business-purpose confirmation may still be needed."],
    [["HILTON", "MARRIOTT", "HAMPTON", "HYATT", "HOLIDAY INN"], "Hotel / Lodging", "Likely lodging; confirm business purpose."],
    [["UBER", "LYFT", "TAXI"], "Ground Transportation", "Likely ground transportation; can be personal, so confirm purpose."],
    [["OFFICE DEPOT", "STAPLES"], "Office Supplies", "Likely office supplies, but merchant can also sell hardware."],
    [["TOLL", "E-470", "EXPRESS TOLL"], "Tolls", "Likely business toll; confirm trip purpose."],
    [["INSURANCE"], "Insurance", "Likely business insurance; verify policy/business use."],
    [["BANK FEE", "SERVICE CHARGE", "MERCHANT FEE", "PROCESSING FEE"], "Bank & Payment Fees", "Likely bank/payment processing fee."]
  ];
  for (const [patterns, category, note] of mediumRules) {
    if (includesAny(d, patterns)) return { ...base, ...categoryResult(byName, category), suggested_type: "expense", categorization_confidence: "Medium", categorization_status: "Suggested", rule_source: "merchant/keyword rule", categorization_note: note };
  }

  if (/RESTAURANT|GRILL|BISTRO|KITCHEN|DINER|PIZZA|SUSHI|STEAKHOUSE/.test(d)) {
    return { ...base, ...categoryResult(byName, "Business Meals / Lunch"), suggested_type: "expense", categorization_confidence: "Medium", categorization_status: "Suggested", rule_source: "keyword rule", categorization_note: "Restaurant pattern. Confirm business purpose and attendee/customer/prospect." };
  }

  return base;
}

async function userCategorizationRules() {
  return select(
    `SELECT r.*, c.name category_name
     FROM categorization_rules r
     LEFT JOIN expense_categories c ON c.id=r.category_id
     WHERE r.active=1 ORDER BY r.priority DESC, r.created_at DESC`
  );
}

function applyUserRule(tx, rules, fallback) {
  const merchant = fallback.normalized_merchant || normalizeMerchant(tx.description);
  const applicable = rules.find((r) => {
    if (r.account_id && r.account_id !== tx.account_id) return false;
    const pattern = String(r.pattern || "").toUpperCase().trim();
    return pattern && merchant.includes(pattern);
  });
  if (!applicable) return fallback;
  return {
    ...fallback,
    normalized_merchant: merchant,
    suggested_category: applicable.category_name || fallback.suggested_category,
    suggested_category_id: applicable.category_id || fallback.suggested_category_id,
    suggested_type: "expense",
    categorization_confidence: "High",
    categorization_status: "Auto-categorized",
    rule_source: "user rule",
    categorization_note: "Matched a category rule you previously saved for this merchant/account."
  };
}

async function categorizeBankRows(rows) {
  const { byName } = await categoryMaps();
  const rules = await userCategorizationRules();
  for (const tx of rows) {
    const builtIn = classifyBuiltIn(tx, byName);
    const result = applyUserRule(tx, rules, builtIn);
    await execute(
      `UPDATE bank_transactions SET
       normalized_merchant=?, suggested_category=?, suggested_category_id=?, suggested_type=?,
       categorization_confidence=?, categorization_status=?, rule_source=?, categorization_note=?
       WHERE id=?`,
      [
        result.normalized_merchant || "",
        result.suggested_category || "",
        result.suggested_category_id || null,
        result.suggested_type || "",
        result.categorization_confidence || "Low",
        result.categorization_status || "Needs Review",
        result.rule_source || "fallback",
        result.categorization_note || "",
        tx.id
      ]
    );
  }
}

export async function categorizeUnreconciledBankTransactions() {
  const rows = await select(
    `SELECT * FROM bank_transactions
     WHERE reconciled=0 AND (categorization_status IS NULL OR categorization_status='')`
  );
  if (rows.length) await categorizeBankRows(rows);
  return rows.length;
}

export async function updateBankTransactionCategorization(bankTxId, categoryId, businessPurpose = "", rememberMerchant = false) {
  const tx = (await select("SELECT * FROM bank_transactions WHERE id=?", [bankTxId]))[0];
  if (!tx) throw new Error("Bank transaction not found.");
  const category = categoryId ? (await select("SELECT * FROM expense_categories WHERE id=?", [categoryId]))[0] : null;
  const merchant = tx.normalized_merchant || normalizeMerchant(tx.description);

  await execute(
    `UPDATE bank_transactions SET normalized_merchant=?, suggested_category=?, suggested_category_id=?,
     suggested_type='expense', categorization_confidence='High', categorization_status='Approved',
     rule_source='manual', business_purpose=?, categorization_note='Category approved by user before reconciliation.'
     WHERE id=?`,
    [merchant, category?.name || "Uncategorized / Needs Review", category?.id || null, String(businessPurpose || "").trim(), bankTxId]
  );

  if (rememberMerchant && category?.id && merchant) {
    const existing = await select(
      `SELECT id FROM categorization_rules
       WHERE active=1 AND UPPER(pattern)=UPPER(?) AND IFNULL(account_id,'')=IFNULL(?, '') LIMIT 1`,
      [merchant, tx.account_id || null]
    );
    if (existing.length) {
      await execute("UPDATE categorization_rules SET category_id=?, priority=200 WHERE id=?", [category.id, existing[0].id]);
    } else {
      await execute(
        `INSERT INTO categorization_rules
         (id,pattern,category_id,account_id,rule_type,priority,active,created_at)
         VALUES (?,?,?,?, 'merchant',200,1,?)`,
        [uuid(), merchant, category.id, tx.account_id || null, now()]
      );
    }
  }

  return (await listUnreconciledBank()).find((r) => r.id === bankTxId) || null;
}

export async function recategorizeBankTransaction(bankTxId) {
  const tx = (await select("SELECT * FROM bank_transactions WHERE id=?", [bankTxId]))[0];
  if (!tx) throw new Error("Bank transaction not found.");
  await categorizeBankRows([tx]);
  return (await listUnreconciledBank()).find((r) => r.id === bankTxId) || null;
}

export async function listBankImports(accountId = "") {
  if (accountId) {
    return select(
      `SELECT i.*, a.name account_name
       FROM bank_imports i JOIN accounts a ON a.id=i.account_id
       WHERE i.account_id=?
       ORDER BY i.imported_at DESC`,
      [accountId]
    );
  }
  return select(
    `SELECT i.*, a.name account_name
     FROM bank_imports i JOIN accounts a ON a.id=i.account_id
     ORDER BY i.imported_at DESC`
  );
}

export async function listBankActivity({ accountId = "", importId = "" } = {}) {
  const where = [];
  const params = [];
  if (accountId) { where.push("b.account_id=?"); params.push(accountId); }
  if (importId) { where.push("b.import_id=?"); params.push(importId); }
  return select(
    `SELECT b.*, a.name account_name, i.file_name import_file_name, i.imported_at,
      CASE WHEN b.amount_cents<0 THEN
        (SELECT COUNT(*) FROM expenses e
         WHERE ABS(e.amount_cents-ABS(b.amount_cents))<=1
           AND ABS(julianday(e.expense_date)-julianday(b.bank_date))<=3
           AND COALESCE(e.source_ref,'')<>b.id)
      ELSE
        (SELECT COUNT(*) FROM payments p
         WHERE ABS(p.amount_cents-ABS(b.amount_cents))<=1
           AND ABS(julianday(p.payment_date)-julianday(b.bank_date))<=3)
      END likely_match_count
     FROM bank_transactions b
     JOIN accounts a ON a.id=b.account_id
     JOIN bank_imports i ON i.id=b.import_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY b.bank_date DESC, b.created_at DESC`,
    params
  );
}

export async function approveBankTransactions(bankTxIds = []) {
  let approved = 0;
  for (const id of bankTxIds) {
    const tx = (await select("SELECT * FROM bank_transactions WHERE id=?", [id]))[0];
    if (!tx || Number(tx.amount_cents) >= 0 || !tx.suggested_category_id) continue;
    await updateBankTransactionCategorization(
      id,
      tx.suggested_category_id,
      tx.business_purpose || "",
      false
    );
    approved += 1;
  }
  return approved;
}

export async function createBankImport(accountId, fileName, rows) {
  const cleanFileName = String(fileName || "bank-import.csv").trim();
  const duplicate = await select(
    "SELECT id, imported_at, row_count FROM bank_imports WHERE account_id=? AND file_name=? ORDER BY imported_at DESC LIMIT 1",
    [accountId, cleanFileName]
  );
  if (duplicate.length) {
    throw new Error(`This file was already imported for this account (${cleanFileName}).`);
  }

  const importId = uuid();

  await execute(
    `INSERT INTO bank_imports (id,account_id,file_name,imported_at,row_count)
     VALUES (?,?,?,?,?)`,
    [importId, accountId, cleanFileName, now(), rows.length]
  );

  for (const r of rows) {
    const raw = JSON.stringify(r.raw || r);
    await execute(
      `INSERT INTO bank_transactions
       (id,import_id,account_id,bank_date,description,amount_cents,external_id,raw_json,reconciled,created_at)
       VALUES (?,?,?,?,?,?,?,?,0,?)`,
      [
        uuid(),
        importId,
        accountId,
        r.date,
        String(r.description || "").trim(),
        toCents(r.amount),
        r.external_id || "",
        raw,
        now()
      ]
    );
  }

  const importedRows = await select("SELECT * FROM bank_transactions WHERE import_id=?", [importId]);
  await categorizeBankRows(importedRows);
  return importId;
}

export async function listUnreconciledBank() {
  return select(
    `SELECT b.*, a.name account_name, i.file_name import_file_name
     FROM bank_transactions b
     JOIN accounts a ON a.id=b.account_id
     JOIN bank_imports i ON i.id=b.import_id
     WHERE b.reconciled=0 ORDER BY b.bank_date DESC, b.created_at DESC`
  );
}

export async function createExpenseFromBankTransaction(bankTx, categoryId = null) {
  if (!bankTx || Number(bankTx.amount_cents) >= 0) {
    throw new Error("Only money-out bank transactions can be converted to expenses.");
  }

  const existing = await select(
    "SELECT id FROM reconciliations WHERE bank_transaction_id=? LIMIT 1",
    [bankTx.id]
  );
  if (existing.length) throw new Error("This bank transaction is already reconciled.");

  const amountCents = Math.abs(Number(bankTx.amount_cents));
  const account = (await select("SELECT name FROM accounts WHERE id=?", [bankTx.account_id]))[0];
  const expenseId = await createExpense({
    expense_date: bankTx.bank_date || today(),
    vendor: String(bankTx.description || "").trim(),
    description: String(bankTx.description || "").trim(),
    amount: amountCents / 100,
    category_id: categoryId || bankTx.suggested_category_id || null,
    payment_source: "business",
    account_id: bankTx.account_id || null,
    business_purpose: String(bankTx.business_purpose || "").trim(),
    paid_from: account?.name || "Business account",
    source: "bank_import",
    source_ref: bankTx.id,
    reconciliation_status: "pending",
    bank_posted_date: bankTx.bank_date || null,
    notes: `Created from bank CSV transaction ${bankTx.id}`
  });

  await reconcile(bankTx.id, "expense", expenseId);
  return expenseId;
}

export async function reconciliationCandidates(bankTx) {
  const cents = Math.abs(Number(bankTx.amount_cents));
  if (Number(bankTx.amount_cents) < 0) {
    return select(
      `SELECT e.id,'expense' target_type,e.expense_date target_date,
       COALESCE(NULLIF(e.vendor,''),NULLIF(e.description,''),'Expense') label,e.amount_cents amount_cents
       FROM expenses e
       WHERE ABS(e.amount_cents-?)<=1
         AND ABS(julianday(e.expense_date)-julianday(?))<=3
         AND COALESCE(e.source_ref,'')<>?
       ORDER BY ABS(julianday(e.expense_date)-julianday(?)),e.created_at DESC LIMIT 8`,
      [cents, bankTx.bank_date, bankTx.id, bankTx.bank_date]
    );
  }
  return select(
    `SELECT p.id,'payment' target_type,p.payment_date target_date,
     COALESCE(c.name,NULLIF(p.reference,''),'Payment') label,p.amount_cents amount_cents
     FROM payments p LEFT JOIN customers c ON c.id=p.customer_id
     WHERE ABS(p.amount_cents-?)<=1
     ORDER BY ABS(julianday(p.payment_date)-julianday(?)) LIMIT 8`,
    [cents, bankTx.bank_date]
  );
}

export async function reconcile(bankTxId, targetType, targetId) {
  await execute(
    `INSERT INTO reconciliations
     (id,bank_transaction_id,target_type,target_id,reconciled_at,note)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(bank_transaction_id) DO UPDATE SET
       target_type=excluded.target_type,
       target_id=excluded.target_id,
       reconciled_at=excluded.reconciled_at,
       note=excluded.note`,
    [uuid(), bankTxId, targetType, targetId, now(), "Manual match"]
  );
  await execute(
    "UPDATE bank_transactions SET reconciled=1 WHERE id=?",
    [bankTxId]
  );
  if (targetType === "expense") {
    await execute(
      `UPDATE expenses SET reconciliation_status='reconciled',bank_posted_date=COALESCE(bank_posted_date,
       (SELECT bank_date FROM bank_transactions WHERE id=?)),updated_at=? WHERE id=?`,
      [bankTxId, now(), targetId]
    );
    await postExpenseToLedger(targetId);
  }
}

export async function classifyBankTransaction(bankTxId, classification) {
  const allowed = new Set(["income", "bank_bonus", "transfer", "personal", "owner_contribution", "loan_payment", "other"]);
  if (!allowed.has(classification)) throw new Error("Choose a valid transaction type.");
  await execute("DELETE FROM accounting_entries WHERE source_type='bank_classification' AND source_id=?", [bankTxId]);
  await reconcile(bankTxId, classification, bankTxId);
  await postBankClassification(bankTxId, classification);
}

async function postBankClassification(bankTxId, classification) {
  if (!["owner_contribution", "bank_bonus", "income"].includes(classification)) return null;
  const tx = (await select(
    `SELECT b.*,a.name account_name
     FROM bank_transactions b LEFT JOIN accounts a ON a.id=b.account_id
     WHERE b.id=?`, [bankTxId]
  ))[0];
  if (!tx) throw new Error("Bank transaction was not found.");
  if (Number(tx.amount_cents || 0) <= 0) throw new Error("This classification requires money coming into the business account.");
  const entryType = classification === "owner_contribution" ? "owner_contribution" : "other_income";
  const referenceName = classification === "bank_bonus" ? "Bank Bonus / Interest Income" : classification === "income" ? "Other Income" : "Owner Contribution";
  const id = uuid();
  await execute(
    `INSERT OR IGNORE INTO accounting_entries
     (id,entry_date,entry_type,description,amount_cents,account_id,reference_name,notes,created_at,source_type,source_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      tx.bank_date,
      entryType,
      String(tx.description || "Owner contribution").trim(),
      Number(tx.amount_cents),
      tx.account_id || null,
      referenceName,
      "Created automatically from a reconciled bank transaction.",
      now(),
      "bank_classification",
      bankTxId
    ]
  );
  return id;
}

async function syncBankClassificationsToAccounting() {
  const rows = await select(
    `SELECT b.id,r.target_type classification
     FROM reconciliations r JOIN bank_transactions b ON b.id=r.bank_transaction_id
     LEFT JOIN accounting_entries ae
       ON ae.source_type='bank_classification' AND ae.source_id=b.id
     WHERE r.target_type IN ('owner_contribution','bank_bonus','income') AND b.amount_cents>0 AND ae.id IS NULL`
  );
  for (const row of rows) await postBankClassification(row.id, row.classification);
}

export async function listAllForBackup() {
  const tables = [
    "settings",
    "customers",
    "projects",
    "expense_categories",
    "accounts",
    "invoices",
    "invoice_items",
    "payments",
    "expenses",
    "mileage_entries",
    "mileage_rates",
    "bank_imports",
    "bank_transactions",
    "reconciliations",
    "categorization_rules",
    "monthly_closes",
    "accounting_entries",
    "journal_entries",
    "journal_lines"
  ];
  const data = {
    format: "qentro-finance-json-backup",
    version: 1,
    created_at: now(),
    tables: {}
  };
  for (const table of tables) {
    data.tables[table] = await select(`SELECT * FROM ${table}`);
  }
  return data;
}

export { getSettings, saveSettings };

function normalizedLookup(rows, field = "name") {
  const map = new Map();
  for (const row of rows) {
    const key = String(row[field] || "").trim().toLowerCase();
    if (key) map.set(key, row);
  }
  return map;
}

function parsePaymentSource(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text.includes("personal") || text.includes("owner")) return "personal";
  return "business";
}

function duplicateText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function importExpenseRows(rows) {
  const [categories, customers, accounts] = await Promise.all([
    listCategories(),
    listCustomers(),
    listAccounts()
  ]);
  const categoryMap = normalizedLookup(categories);
  const customerMap = normalizedLookup(customers);
  const accountMap = normalizedLookup(accounts);
  const result = { imported: 0, updated: 0, skipped: 0, errors: [], warnings: [] };

  for (const row of rows) {
    const sourceRow = row.source_row || "?";
    try {
      if (!row.expense_date) throw new Error("Date is required or not recognized.");
      if (!Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0) throw new Error("Amount must be greater than zero.");
      if (!String(row.vendor || "").trim() && !String(row.description || "").trim()) throw new Error("Vendor or description is required.");
      const paidFrom = String(row.paid_from || "").trim();
      if (!paidFrom) throw new Error("Paid From is required.");
      const paymentSource = parsePaymentSource(paidFrom);
      const category = categoryMap.get(String(row.category_name || "").trim().toLowerCase());
      const customer = customerMap.get(String(row.customer_name || "").trim().toLowerCase());
      const account = accountMap.get(paidFrom.toLowerCase());

      if (row.expense_id) {
        const existing = (await select("SELECT * FROM expenses WHERE id=?", [row.expense_id]))[0];
        if (!existing) throw new Error(`Expense ID '${row.expense_id}' was not found. The row was not added as a new expense.`);
        if (row.category_name && !category) throw new Error(`Category '${row.category_name}' was not found. Choose a configured category or leave it blank.`);
        if (row.customer_name && !customer) throw new Error(`Customer/Project '${row.customer_name}' was not found. Choose a configured customer/project or leave it blank.`);
        await updateExpense(existing.id, {
          expense_date: row.expense_date,
          vendor: row.vendor,
          description: row.description,
          amount: row.amount,
          category_id: category?.id || "",
          payment_source: paymentSource,
          account_id: paymentSource === "personal" ? "" : account?.id || "",
          paid_from: paidFrom,
          business_purpose: existing.business_purpose || "",
          customer_id: customer?.id || "",
          notes: row.notes || ""
        });
        result.updated += 1;
        continue;
      }

      if (row.category_name && !category) result.warnings.push(`Row ${sourceRow}: category '${row.category_name}' was not found; imported as Uncategorized.`);
      if (row.customer_name && !customer) result.warnings.push(`Row ${sourceRow}: customer '${row.customer_name}' was not found; customer left blank.`);
      if (paidFrom && paymentSource === "business" && !account) result.warnings.push(`Row ${sourceRow}: Paid From '${paidFrom}' was retained as typed and is not linked to a configured account.`);

      const amountCents = toCents(row.amount);
      const possible = await select(
        `SELECT * FROM expenses
         WHERE amount_cents=? AND ABS(julianday(expense_date)-julianday(?))<=3`,
        [amountCents, row.expense_date]
      );
      const incomingName = duplicateText(row.vendor || row.description);
      const duplicateMatches = possible.filter((item) => {
        const existingName = duplicateText(item.vendor || item.description);
        return incomingName && existingName && (incomingName === existingName || incomingName.includes(existingName) || existingName.includes(incomingName));
      });
      if (duplicateMatches.length > 1) {
        result.warnings.push(`Row ${sourceRow}: more than one existing expense matched. Export from Qentro and keep Expense ID to update the intended record.`);
        result.skipped += 1;
        continue;
      }
      const duplicate = duplicateMatches[0];
      if (duplicate) {
        if (row.category_name && !category) throw new Error(`Category '${row.category_name}' was not found. Choose a configured category or leave it blank.`);
        if (row.customer_name && !customer) throw new Error(`Customer/Project '${row.customer_name}' was not found. Choose a configured customer/project or leave it blank.`);
        await updateExpense(duplicate.id, {
          expense_date: row.expense_date,
          vendor: row.vendor || duplicate.vendor || "",
          description: row.description,
          amount: row.amount,
          category_id: row.category_name ? category?.id || "" : duplicate.category_id || "",
          payment_source: paidFrom ? paymentSource : duplicate.payment_source || "business",
          account_id: paidFrom
            ? (paymentSource === "personal" ? "" : account?.id || duplicate.account_id || "")
            : duplicate.account_id || "",
          paid_from: paidFrom || duplicate.paid_from || "",
          business_purpose: duplicate.business_purpose || "",
          customer_id: row.customer_name ? customer?.id || "" : duplicate.customer_id || "",
          notes: row.notes || duplicate.notes || ""
        });
        result.updated += 1;
        continue;
      }

      await createExpense({
        expense_date: row.expense_date,
        vendor: row.vendor,
        description: row.description,
        amount: row.amount,
        category_id: category?.id || "",
        payment_source: paymentSource,
        account_id: paymentSource === "personal" ? "" : account?.id || "",
        paid_from: paidFrom,
        business_purpose: row.business_purpose || "",
        customer_id: customer?.id || "",
        notes: row.notes || "",
        source: "excel_import",
        reconciliation_status: "reconciled"
      });
      result.imported += 1;
    } catch (error) {
      result.errors.push(`Row ${sourceRow}: ${String(error?.message || error)}`);
    }
  }
  return result;
}

export async function importMileageRows(rows) {
  const customers = await listCustomers();
  const customerMap = normalizedLookup(customers);
  const result = { imported: 0, updated: 0, skipped: 0, errors: [], warnings: [] };

  for (const row of rows) {
    const sourceRow = row.source_row || "?";
    try {
      if (!row.trip_date) throw new Error("Date is required or not recognized.");
      const startOdometer = row.start_odometer === "" || row.start_odometer == null ? null : Number(row.start_odometer);
      const endOdometer = row.end_odometer === "" || row.end_odometer == null ? null : Number(row.end_odometer);
      if (startOdometer != null && endOdometer != null && endOdometer < startOdometer) throw new Error("End Odometer cannot be less than Start Odometer.");
      const calculatedMiles = startOdometer != null && endOdometer != null ? endOdometer - startOdometer : Number(row.miles);
      if (!Number.isFinite(calculatedMiles) || calculatedMiles <= 0) throw new Error("Enter Miles greater than zero, or valid Start and End Odometer values.");
      if (!String(row.business_purpose || "").trim()) throw new Error("Business Purpose is required.");

      const customer = customerMap.get(String(row.customer_name || "").trim().toLowerCase());
      if (row.customer_name && !customer) result.warnings.push(`Row ${sourceRow}: customer '${row.customer_name}' was not found; customer left blank.`);

      const suppliedRate = String(row.rate ?? "").trim();
      const rate = suppliedRate !== "" && Number.isFinite(Number(suppliedRate)) && Number(suppliedRate) >= 0
        ? Number(suppliedRate)
        : await mileageRateForDate(row.trip_date);
      if (row.mileage_id) {
        const existing = (await select("SELECT id FROM mileage_entries WHERE id=?", [row.mileage_id]))[0];
        if (!existing) throw new Error(`Mileage ID '${row.mileage_id}' was not found. The row was not added as a new trip.`);
        await updateMileage(existing.id, {
          trip_date: row.trip_date,
          start_location: row.start_location,
          destination: row.destination,
          business_purpose: row.business_purpose,
          round_trip: row.round_trip,
          start_odometer: startOdometer,
          end_odometer: endOdometer,
          miles: calculatedMiles,
          rate,
          customer_id: customer?.id || "",
          notes: row.notes || ""
        });
        result.updated += 1;
        continue;
      }
      const duplicate = (await select(
        `SELECT id FROM mileage_entries
         WHERE trip_date=? AND ABS(miles-?)<0.0001
           AND lower(trim(COALESCE(start_location,'')))=lower(trim(?))
           AND lower(trim(COALESCE(destination,'')))=lower(trim(?))
           AND lower(trim(COALESCE(business_purpose,'')))=lower(trim(?))
         LIMIT 1`,
        [row.trip_date, calculatedMiles, row.start_location || "", row.destination || "", row.business_purpose || ""]
      ))[0];
      if (duplicate) {
        result.skipped += 1;
        continue;
      }

      await createMileage({
        trip_date: row.trip_date,
        start_location: row.start_location,
        destination: row.destination,
        business_purpose: row.business_purpose,
        round_trip: row.round_trip,
        start_odometer: startOdometer,
        end_odometer: endOdometer,
        miles: calculatedMiles,
        rate,
        customer_id: customer?.id || "",
        notes: row.notes || ""
      });
      result.imported += 1;
    } catch (error) {
      result.errors.push(`Row ${sourceRow}: ${String(error?.message || error)}`);
    }
  }
  return result;
}


const accountingEntryTypes = new Set([
  "owner_contribution",
  "owner_draw",
  "asset_purchase",
  "loan_received",
  "loan_payment",
  "opening_balance",
  "depreciation",
  "other_income"
]);

export async function createAccountingEntry(data) {
  const type = String(data.entry_type || "").trim();
  if (!accountingEntryTypes.has(type)) throw new Error("Select a valid accounting entry type.");
  const amountCents = toCents(data.amount);
  if (amountCents <= 0) throw new Error("Amount must be greater than zero.");
  const description = String(data.description || "").trim();
  if (!description) throw new Error("Description is required.");

  const id = uuid();
  await execute(
    `INSERT INTO accounting_entries
     (id,entry_date,entry_type,description,amount_cents,account_id,reference_name,notes,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      id,
      data.entry_date || today(),
      type,
      description,
      amountCents,
      data.account_id || null,
      String(data.reference_name || "").trim(),
      String(data.notes || "").trim(),
      now()
    ]
  );
  return id;
}

export async function listAccountingEntries(limit = 1000) {
  return select(
    `SELECT e.*, a.name account_name
     FROM accounting_entries e
     LEFT JOIN accounts a ON a.id=e.account_id
     ORDER BY e.entry_date DESC, e.created_at DESC
     LIMIT ?`,
    [limit]
  );
}

export async function deleteAccountingEntry(id) {
  await execute("DELETE FROM accounting_entries WHERE id=?", [id]);
}

function addToMap(map, key, value) {
  const k = key || "Unassigned Cash";
  map.set(k, (map.get(k) || 0) + Number(value || 0));
}

async function cashBalancesBefore(endExclusive) {
  await syncBankClassificationsToAccounting();
  const balances = new Map();
  const paymentRows = await select(
    `SELECT COALESCE(a.name,'Unassigned Cash') name, COALESCE(SUM(p.amount_cents),0) amount
     FROM payments p LEFT JOIN accounts a ON a.id=p.account_id
     WHERE p.payment_date<? GROUP BY COALESCE(a.name,'Unassigned Cash')`,
    [endExclusive]
  );
  paymentRows.forEach((r) => addToMap(balances, r.name, r.amount));

  const expenseRows = await select(
    `SELECT COALESCE(a.name,'Unassigned Cash') name, COALESCE(SUM(e.amount_cents),0) amount
     FROM expenses e LEFT JOIN accounts a ON a.id=e.account_id
     WHERE e.expense_date<? AND e.payment_source='business'
     GROUP BY COALESCE(a.name,'Unassigned Cash')`,
    [endExclusive]
  );
  expenseRows.forEach((r) => addToMap(balances, r.name, -Number(r.amount)));

  const manualRows = await select(
    `SELECT ae.entry_type, ae.amount_cents, COALESCE(a.name,'Unassigned Cash') account_name
     FROM accounting_entries ae LEFT JOIN accounts a ON a.id=ae.account_id
     WHERE ae.entry_date<?`,
    [endExclusive]
  );
  for (const r of manualRows) {
    const amount = Number(r.amount_cents || 0);
    if (["owner_contribution", "loan_received", "opening_balance", "other_income"].includes(r.entry_type)) addToMap(balances, r.account_name, amount);
    if (["owner_draw", "asset_purchase", "loan_payment"].includes(r.entry_type)) addToMap(balances, r.account_name, -amount);
  }

  return [...balances.entries()]
    .map(([name, amount_cents]) => ({ name, amount_cents }))
    .filter((x) => x.amount_cents !== 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function cumulativeIncomeBefore(endExclusive) {
  const revenue = (await paymentRevenueTax(null, endExclusive)).revenue;
  const otherIncome = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries WHERE entry_type='other_income' AND entry_date<?",
    [endExclusive]
  ))[0].v || 0);
  const expenses = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM expenses WHERE expense_date<?",
    [endExclusive]
  ))[0].v || 0);
  const depreciation = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries WHERE entry_type='depreciation' AND entry_date<?",
    [endExclusive]
  ))[0].v || 0);
  return revenue + otherIncome - expenses - depreciation;
}

export async function incomeStatement(period = { mode: "ytd" }) {
  const { start, end, mode, value } = reportBounds(period);
  const paymentSplit = await paymentRevenueTax(start, end);
  const revenue = paymentSplit.revenue;
  const otherIncomeLines = await select(
    `SELECT COALESCE(NULLIF(reference_name,''),'Other Income') name, COALESCE(SUM(amount_cents),0) amount_cents
     FROM accounting_entries WHERE entry_type='other_income' AND entry_date>=? AND entry_date<?
     GROUP BY COALESCE(NULLIF(reference_name,''),'Other Income') ORDER BY name`,
    [start, end]
  );
  const otherIncome = otherIncomeLines.reduce((sum, r) => sum + Number(r.amount_cents || 0), 0);
  const expenses = await select(
    `SELECT COALESCE(c.name,'Uncategorized') name, COALESCE(SUM(e.amount_cents),0) amount_cents
     FROM expenses e LEFT JOIN expense_categories c ON c.id=e.category_id
     WHERE e.expense_date>=? AND e.expense_date<?
     GROUP BY COALESCE(c.name,'Uncategorized') ORDER BY name`,
    [start, end]
  );
  const depreciation = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries WHERE entry_type='depreciation' AND entry_date>=? AND entry_date<?",
    [start, end]
  ))[0].v || 0);
  const operatingExpenses = expenses.reduce((sum, r) => sum + Number(r.amount_cents || 0), 0);
  const totalExpenses = operatingExpenses + depreciation;
  return {
    period: { start, end, mode, value },
    revenueLines: [{ name: "Customer Revenue", amount_cents: revenue }],
    otherIncomeLines,
    expenseLines: expenses,
    depreciation,
    totalRevenue: revenue + otherIncome,
    customerRevenue: revenue,
    otherIncome,
    operatingExpenses,
    totalExpenses,
    netIncome: revenue + otherIncome - totalExpenses
  };
}

export async function balanceSheet(period = { mode: "ytd" }) {
  const { start, end, mode, value } = reportBounds(period);
  const cash = await cashBalancesBefore(end);
  const cashTotal = cash.reduce((sum, r) => sum + Number(r.amount_cents || 0), 0);

  const assetRows = await select(
    `SELECT COALESCE(NULLIF(reference_name,''),description,'Fixed Assets') name,
            COALESCE(SUM(amount_cents),0) amount_cents
     FROM accounting_entries
     WHERE entry_type='asset_purchase' AND entry_date<?
     GROUP BY COALESCE(NULLIF(reference_name,''),description,'Fixed Assets') ORDER BY name`,
    [end]
  );
  const grossAssets = assetRows.reduce((sum, r) => sum + Number(r.amount_cents || 0), 0);
  const accumulatedDepreciation = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries WHERE entry_type='depreciation' AND entry_date<?",
    [end]
  ))[0].v || 0);
  const netFixedAssets = grossAssets - accumulatedDepreciation;

  const liabilityRows = await select(
    `SELECT COALESCE(NULLIF(reference_name,''),'Other Liability') name,
      SUM(CASE WHEN entry_type='loan_received' THEN amount_cents ELSE -amount_cents END) amount_cents
     FROM accounting_entries
     WHERE entry_type IN ('loan_received','loan_payment') AND entry_date<?
     GROUP BY COALESCE(NULLIF(reference_name,''),'Other Liability')
     HAVING amount_cents<>0 ORDER BY name`,
    [end]
  );
  const salesTaxPayable = (await paymentRevenueTax(null, end)).tax;
  if (salesTaxPayable !== 0) liabilityRows.push({ name: "Sales Tax Payable", amount_cents: salesTaxPayable });
  const totalLiabilities = liabilityRows.reduce((sum, r) => sum + Number(r.amount_cents || 0), 0);

  const ownerContributions = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries WHERE entry_type='owner_contribution' AND entry_date<?",
    [end]
  ))[0].v || 0);
  const ownerPaidExpenses = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM expenses WHERE payment_source='personal' AND expense_date<?",
    [end]
  ))[0].v || 0);
  const openingEquity = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries WHERE entry_type='opening_balance' AND entry_date<?",
    [end]
  ))[0].v || 0);
  const ownerDraws = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries WHERE entry_type='owner_draw' AND entry_date<?",
    [end]
  ))[0].v || 0);
  const retainedEarnings = await cumulativeIncomeBefore(end);

  const totalAssets = cashTotal + netFixedAssets;
  const totalEquity = openingEquity + ownerContributions + ownerPaidExpenses - ownerDraws + retainedEarnings;
  const outstandingInvoices = Number((await select(
    `SELECT COALESCE(SUM(CASE WHEN total>paid THEN total-paid ELSE 0 END),0) v FROM (
       SELECT i.id,
        COALESCE((SELECT SUM(amount_cents) FROM invoice_items WHERE invoice_id=i.id),0) + COALESCE(i.tax_cents,0) total,
        COALESCE((SELECT SUM(amount_cents) FROM payments WHERE invoice_id=i.id AND payment_date<?),0) paid
       FROM invoices i WHERE i.invoice_date<? AND i.status<>'Cancelled'
     )`,
    [end, end]
  ))[0].v || 0);

  return {
    period: { start, end, mode, value },
    cashLines: cash,
    cashTotal,
    assetLines: assetRows,
    grossFixedAssets: grossAssets,
    accumulatedDepreciation,
    netFixedAssets,
    totalAssets,
    liabilityLines: liabilityRows,
    totalLiabilities,
    equityLines: [
      { name: "Opening Equity", amount_cents: openingEquity },
      { name: "Owner Contributions", amount_cents: ownerContributions },
      { name: "Owner-Paid Business Expenses", amount_cents: ownerPaidExpenses },
      { name: "Owner Draws", amount_cents: -ownerDraws },
      { name: "Retained / Current Earnings", amount_cents: retainedEarnings }
    ].filter((x) => x.amount_cents !== 0),
    totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    difference: totalAssets - (totalLiabilities + totalEquity),
    outstandingInvoices
  };
}

export async function cashFlowStatement(period = { mode: "ytd" }) {
  const { start, end, mode, value } = reportBounds(period);
  const customerReceipts = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM payments WHERE payment_date>=? AND payment_date<?",
    [start, end]
  ))[0].v || 0);
  const otherIncomeReceipts = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries WHERE entry_type='other_income' AND entry_date>=? AND entry_date<?",
    [start, end]
  ))[0].v || 0);
  const cashExpenses = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM expenses WHERE payment_source='business' AND expense_date>=? AND expense_date<?",
    [start, end]
  ))[0].v || 0);
  const assetPurchases = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries WHERE entry_type='asset_purchase' AND entry_date>=? AND entry_date<?",
    [start, end]
  ))[0].v || 0);
  const ownerContributions = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries WHERE entry_type='owner_contribution' AND entry_date>=? AND entry_date<?",
    [start, end]
  ))[0].v || 0);
  const ownerDraws = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries WHERE entry_type='owner_draw' AND entry_date>=? AND entry_date<?",
    [start, end]
  ))[0].v || 0);
  const loanReceived = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries WHERE entry_type='loan_received' AND entry_date>=? AND entry_date<?",
    [start, end]
  ))[0].v || 0);
  const loanPaid = Number((await select(
    "SELECT COALESCE(SUM(amount_cents),0) v FROM accounting_entries WHERE entry_type='loan_payment' AND entry_date>=? AND entry_date<?",
    [start, end]
  ))[0].v || 0);

  const beginningCashLines = await cashBalancesBefore(start);
  const endingCashLines = await cashBalancesBefore(end);
  const beginningCash = beginningCashLines.reduce((sum, r) => sum + Number(r.amount_cents || 0), 0);
  const endingCash = endingCashLines.reduce((sum, r) => sum + Number(r.amount_cents || 0), 0);
  const operating = customerReceipts + otherIncomeReceipts - cashExpenses;
  const investing = -assetPurchases;
  const financing = ownerContributions - ownerDraws + loanReceived - loanPaid;

  return {
    period: { start, end, mode, value },
    operatingLines: [
      { name: "Cash received from customers", amount_cents: customerReceipts },
      { name: "Bank bonuses and other income received", amount_cents: otherIncomeReceipts },
      { name: "Cash paid for operating expenses", amount_cents: -cashExpenses }
    ],
    investingLines: [{ name: "Purchase of business assets", amount_cents: -assetPurchases }],
    financingLines: [
      { name: "Owner contributions", amount_cents: ownerContributions },
      { name: "Owner draws", amount_cents: -ownerDraws },
      { name: "Loan proceeds", amount_cents: loanReceived },
      { name: "Loan principal payments", amount_cents: -loanPaid }
    ].filter((x) => x.amount_cents !== 0),
    netOperatingCash: operating,
    netInvestingCash: investing,
    netFinancingCash: financing,
    netChangeInCash: operating + investing + financing,
    beginningCash,
    endingCash,
    reconciliationDifference: endingCash - beginningCash - (operating + investing + financing)
  };
}

export async function generalLedger(period = { mode: "ytd" }) {
  const { start, end } = reportBounds(period);
  const entries = [];
  await syncBankClassificationsToAccounting();
  await syncApprovedExpensesToLedger();
  const payments = await select(
    `SELECT p.*, COALESCE(a.name,'Unassigned Cash') account_name, COALESCE(c.name,'Customer') customer_name,
      COALESCE(i.tax_cents,0) invoice_tax_cents,
      COALESCE((SELECT SUM(ii.amount_cents) FROM invoice_items ii WHERE ii.invoice_id=i.id),0) invoice_subtotal_cents
     FROM payments p
     LEFT JOIN accounts a ON a.id=p.account_id
     LEFT JOIN customers c ON c.id=p.customer_id
     LEFT JOIN invoices i ON i.id=p.invoice_id
     WHERE p.payment_date>=? AND p.payment_date<?`,
    [start, end]
  );
  for (const p of payments) {
    const payment = Number(p.amount_cents || 0);
    const invoiceSubtotal = Number(p.invoice_subtotal_cents || 0);
    const invoiceTax = Number(p.invoice_tax_cents || 0);
    const invoiceTotal = invoiceSubtotal + invoiceTax;
    const taxPart = invoiceTotal > 0 && invoiceTax > 0 ? Math.round(payment * invoiceTax / invoiceTotal) : 0;
    const revenuePart = payment - taxPart;
    if (revenuePart !== 0) entries.push(
      { date: p.payment_date, description: `Customer payment - ${p.customer_name}`, account: p.account_name, debit_cents: revenuePart, credit_cents: 0, source: "Payment", reference: p.id, status: "Posted" },
      { date: p.payment_date, description: `Customer payment - ${p.customer_name}`, account: "Customer Revenue", debit_cents: 0, credit_cents: revenuePart, source: "Payment", reference: p.id, status: "Posted" }
    );
    if (taxPart !== 0) entries.push(
      { date: p.payment_date, description: `Sales tax collected - ${p.customer_name}`, account: p.account_name, debit_cents: taxPart, credit_cents: 0, source: "Payment", reference: p.id, status: "Posted" },
      { date: p.payment_date, description: `Sales tax collected - ${p.customer_name}`, account: "Sales Tax Payable", debit_cents: 0, credit_cents: taxPart, source: "Payment", reference: p.id, status: "Posted" }
    );
  }

  const postedLines = await select(
    `SELECT je.entry_date date,je.description,jl.account_name account,jl.debit_cents,jl.credit_cents,
      je.source_type source,je.source_id reference,je.status
     FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id=je.id
     WHERE je.entry_date>=? AND je.entry_date<? ORDER BY je.entry_date,je.posted_at,jl.sort_order`,
    [start, end]
  );
  entries.push(...postedLines.map((r) => ({ ...r, source: r.source === "expense" ? "Expense" : r.source, status: r.status === "posted" ? "Posted" : r.status })));

  const manual = await select(
    `SELECT ae.*, COALESCE(a.name,'Unassigned Cash') account_name
     FROM accounting_entries ae LEFT JOIN accounts a ON a.id=ae.account_id
     WHERE ae.entry_date>=? AND ae.entry_date<?`,
    [start, end]
  );
  const manualMap = {
    owner_contribution: (r) => [r.account_name, "Owner Contribution"],
    owner_draw: (r) => ["Owner Draw", r.account_name],
    asset_purchase: (r) => [`Fixed Assets: ${r.reference_name || r.description}`, r.account_name],
    loan_received: (r) => [r.account_name, `Liability: ${r.reference_name || "Loan"}`],
    loan_payment: (r) => [`Liability: ${r.reference_name || "Loan"}`, r.account_name],
    opening_balance: (r) => [r.account_name, "Opening Equity"],
    depreciation: (r) => ["Depreciation Expense", `Accumulated Depreciation: ${r.reference_name || "Fixed Assets"}`],
    other_income: (r) => [r.account_name, r.reference_name || "Other Income"]
  };
  for (const r of manual) {
    const pair = manualMap[r.entry_type]?.(r) || ["Accounting Adjustment", "Accounting Adjustment"];
    entries.push(
      { date: r.entry_date, description: r.description, account: pair[0], debit_cents: Number(r.amount_cents), credit_cents: 0, source: "Accounting entry", reference: r.id, status: "Posted" },
      { date: r.entry_date, description: r.description, account: pair[1], debit_cents: 0, credit_cents: Number(r.amount_cents), source: "Accounting entry", reference: r.id, status: "Posted" }
    );
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description) || Number(b.debit_cents)-Number(a.debit_cents));
}
