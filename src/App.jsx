import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import {
  listCustomers,
  createCustomer,
  listCategories,
  listAccounts,
  listAllAccounts,
  createAccount,
  updateAccount,
  deactivateAccount,
  reactivateAccount,
  listExpenseWorkspace,
  finalizePendingNonBankExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  setExpenseReceipt,
  listMileage,
  listMileageRates,
  createMileageRate,
  updateMileageRate,
  deleteMileageRate,
  mileageRateForDate,
  createMileage,
  updateMileage,
  deleteMileage,
  importGoogleTimelineRows,
  reviewMileage,
  nextInvoiceNumber,
  createInvoice,
  listInvoices,
  getInvoice,
  recordPayment,
  dashboard,
  monthlyExpenseBreakdown,
  createBankImport,
  listBankImports,
  listBankActivity,
  approveBankTransactions,
  listUnreconciledBank,
  createExpenseFromBankTransaction,
  categorizeUnreconciledBankTransactions,
  updateBankTransactionCategorization,
  recategorizeBankTransaction,
  reconciliationCandidates,
  reconcile,
  classifyBankTransaction,
  listAllForBackup,
  getSettings,
  saveSettings,
  importExpenseRows,
  importMileageRows,
  incomeStatement,
  balanceSheet,
  cashFlowStatement,
  generalLedger,
  listAccountingEntries,
  createAccountingEntry,
  deleteAccountingEntry
} from "./services";
import { attachReceipt, saveBytesWithDialog, saveTextWithDialog } from "./storage";
import {
  money,
  today,
  monthKey,
  fromCents,
  normalizeDate,
  parseMoney
} from "./utils";
import qentroLogo from "./assets/qentro-icon.png";
import packageInfo from "../package.json";

const nav = [
  "Dashboard",
  "Customers",
  "Invoices",
  "Expenses",
  "Mileage",
  "Reconcile",
  "Reports",
  "Settings"
];

function App() {
  const [page, setPage] = useState("Dashboard");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getSettings()
      .then(() => active && setReady(true))
      .catch((e) => active && setError(String(e)));
    return () => { active = false; };
  }, []);

  if (error) {
    return (
      <div className="fatal">
        <h2>Qentro Finance could not start</h2>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!ready) return <div className="loading">Opening Qentro Finance…</div>;

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <div className="mark">
            <img src={qentroLogo} alt="Qentro" />
          </div>
          <div>
            <strong>Qentro Finance</strong>
            <span>Local-first bookkeeping</span>
          </div>
        </div>
        <nav>
          {nav.map((n) => (
            <button
              key={n}
              className={page === n ? "active" : ""}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
        </nav>
        <div className="privacy"><span>Stored locally on this computer</span><span>Version {packageInfo.version}</span></div>
      </aside>

      <main>
        <header>
          <div>
            <h1>{page}</h1>
            <p>Private, local-first business finance</p>
          </div>
        </header>
        <Page page={page} />
      </main>
    </div>
  );
}

const moduleGuides = {
  Dashboard: {
    does: "Shows an overall snapshot of customer revenue, other income, expenses, profit/loss, outstanding invoices, mileage, missing receipts, and unreconciled bank items.",
    use: "All history is included by default. Enter an optional From or To date to review a specific period, then use the workflow as your bookkeeping checklist."
  },
  Customers: {
    does: "Stores customer contact and billing information used by invoices, expense attribution, mileage, and reporting.",
    use: "Add each customer once. Use the exact customer name in Excel imports when you want imported expenses or mileage linked to that customer."
  },
  Invoices: {
    does: "Creates customer invoices, PDF copies, payment records, and tracks paid, partially paid, and outstanding balances.",
    use: "Select a customer, add invoice line items, save the invoice, generate the PDF, then record payments when received."
  },
  Expenses: {
    does: "Combines expense entry, Expense Excel import, bank and credit-card CSV import, category cleanup, duplicate review, and transaction history in one workspace.",
    use: "Import or enter records, correct categories and details, and remove unlinked duplicates here. Expense records and the category summary show all dates by default; use the optional date range when needed. Bank activity remains separate internally until it is matched, converted, or classified in Reconcile."
  },
  Mileage: {
    does: "Tracks business trips, round trips, odometer readings, miles, mileage rate, calculated deduction, customer/project attribution, and notes. Supports Excel import and export for historical trips.",
    use: "Maintain effective-dated rates in Settings. For one trip, use Add business trip. For history, download the Mileage template, paste your trips, then Import Excel. Leave Rate blank to use the scheduled rate effective on each trip date."
  },
  Reconcile: {
    does: "Verifies unreconciled bank and credit-card activity against existing expenses and payments before it reaches final accounting reports.",
    use: "Match likely existing records first. Create a missing expense only when needed, or classify the bank transaction as income, transfer, personal, owner contribution, loan payment, or other."
  },
  Reports: {
    does: "Provides four core accounting reports: Income Statement, Balance Sheet, Statement of Cash Flows, and General Ledger. Each report can be reviewed on screen and exported to PDF or Excel.",
    use: "Reports default to Year to Date. Choose Monthly or Full Year when needed, then select a report tab. Use Record Balance-Sheet Activity for owner contributions, owner draws, asset purchases, loans, opening balances, and depreciation."
  },
  Settings: {
    does: "Stores company details, invoice defaults, effective-dated mileage rates, and financial accounts used throughout the application.",
    use: "Complete company settings first. Maintain non-overlapping mileage-rate periods, then add the business bank and credit-card accounts used for expenses, payments, bank import, and reconciliation."
  }
};

function ModuleGuide({ page }) {
  const guide = moduleGuides[page];
  if (!guide) return null;
  return (
    <div className="module-guide">
      <div><strong>What this module does</strong><p>{guide.does}</p></div>
      <div><strong>How to use it</strong><p>{guide.use}</p></div>
    </div>
  );
}

function Page({ page }) {
  let content;
  if (page === "Dashboard") content = <Dashboard />;
  else if (page === "Customers") content = <Customers />;
  else if (page === "Invoices") content = <Invoices />;
  else if (page === "Expenses") content = <Expenses />;
  else if (page === "Mileage") content = <Mileage />;
  else if (page === "Reconcile") content = <Reconcile />;
  else if (page === "Reports") content = <Reports />;
  else content = <Settings />;

  return (
    <>
      <ModuleGuide page={page} />
      {content}
    </>
  );
}

function Dashboard() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      setD(await dashboard(dateFrom, dateTo));
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => { void load(); }, [dateFrom, dateTo]);

  if (error) return <InlineError message={error} onRetry={load} />;
  if (!d) return <Loading />;

  const cards = [
    ["Revenue received", money(d.revenue)],
    ["Other income", money(d.otherIncome)],
    ["Expenses", money(d.expenses)],
    ["Net profit / loss", money(d.profit)],
    ["Outstanding invoices", money(d.outstanding)],
    ["Business miles", Number(d.miles).toFixed(1)],
    ["Mileage deduction", money(d.mileageDeduction)],
    ["Missing receipts", d.missingReceipts],
    ["Unreconciled bank items", d.unreconciled]
  ];

  return (
    <section>
      <div className="toolbar">
        <label className="field"><span>From date (optional)</span><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
        <label className="field"><span>To date (optional)</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
        <button onClick={()=>{setDateFrom("");setDateTo("");}}>Show all dates</button>
        <button onClick={load}>Refresh</button>
      </div>
      <div className="cards">
        {cards.map(([k, v]) => (
          <div className="card" key={k}>
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="panel">
        <h3>Bookkeeping workflow</h3>
        <ol className="close-list">
          <li>Capture revenue and expenses</li>
          <li>Attach receipts and business purpose</li>
          <li>Review owner-paid expenses</li>
          <li>Import bank CSV</li>
          <li>Reconcile transactions</li>
          <li>Review invoices and mileage</li>
          <li>Generate reports and backup</li>
        </ol>
      </div>
    </section>
  );
}

function Customers() {
  const empty = {
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    billing_address: "",
    notes: ""
  };
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState("");

  async function load() {
    setRows(await listCustomers());
  }

  useEffect(() => { void load(); }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setMessage("Customer name is required.");
    try {
      await createCustomer(form);
      setForm(empty);
      setMessage("Customer saved.");
      await load();
    } catch (err) {
      setMessage(`Could not save customer: ${err}`);
    }
  }

  return (
    <section className="split">
      <form className="panel form" onSubmit={submit}>
        <h3>Add customer</h3>
        <Status message={message} />
        <Field label="Business / customer name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Contact name" value={form.contact_name} onChange={(v) => setForm({ ...form, contact_name: v })} />
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <TextArea label="Billing address" value={form.billing_address} onChange={(v) => setForm({ ...form, billing_address: v })} />
        <TextArea label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <button className="primary">Save Customer</button>
      </form>
      <div className="panel">
        <h3>Customers</h3>
        <Table
          headers={["Name", "Contact", "Email", "Phone"]}
          rows={rows.map((r) => [r.name, r.contact_name, r.email, r.phone])}
        />
      </div>
    </section>
  );
}

function Expenses() {
  const [cats, setCats] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [records, setRecords] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editingForm, setEditingForm] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [activeImport, setActiveImport] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paidFromFilter, setPaidFromFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const blankExpense = () => ({
    expense_date: today(),
    vendor: "",
    description: "",
    amount: "",
    category_id: "",
    payment_source: "business",
    account_id: "",
    paid_from: "",
    business_purpose: "",
    customer_id: "",
    notes: ""
  });

  const [form, setForm] = useState(blankExpense);

  async function load() {
    await finalizePendingNonBankExpenses();
    const [categories, customerRows, accountRows, workspaceRows] = await Promise.all([
      listCategories(),
      listCustomers(),
      listAccounts(),
      listExpenseWorkspace()
    ]);
    setCats(categories);
    setCustomers(customerRows);
    setAccounts(accountRows);
    setRecords(workspaceRows);
  }

  useEffect(() => { void load(); }, []);

  async function submit(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setMessage("Enter an expense amount greater than zero.");
    if (!form.vendor.trim() && !form.description.trim()) return setMessage("Enter a vendor or description.");
    if (!form.paid_from.trim()) return setMessage("Select or enter Paid From.");
    try {
      const originalDate = form.expense_date;
      const id = await createExpense({ ...form, source: "manual", reconciliation_status: "reconciled" });
      setForm(blankExpense());
      setManualOpen(false);
      setActiveImport("");
      setMessage("Expense saved. Review and clean it in the Expenses table below.");
      if (confirm("Attach a receipt now?")) {
        const path = await attachReceipt(id, originalDate);
        if (path) await setExpenseReceipt(id, path);
      }
      await load();
    } catch (err) {
      setMessage(`Could not save expense: ${err}`);
    }
  }

  function editExpense(row) {
    setEditingId(row.id);
    setEditingForm({
      expense_date: row.expense_date,
      vendor: row.vendor || "",
      description: row.description || "",
      amount: String(fromCents(row.amount_cents)),
      category_id: row.category_id || "",
      payment_source: row.payment_source || "business",
      account_id: row.account_id || "",
      paid_from: row.paid_from || row.account_name || "",
      business_purpose: row.business_purpose || "",
      customer_id: row.customer_id || "",
      notes: row.notes || ""
    });
    setManualOpen(false);
    setMessage("Editing this expense in the table. Save when finished or cancel the edit.");
  }

  async function saveExpenseEdit() {
    const amount = Number(editingForm?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setMessage("Enter an expense amount greater than zero.");
    if (!editingForm.vendor.trim() && !editingForm.description.trim()) return setMessage("Enter a vendor or description.");
    if (!editingForm.paid_from.trim()) return setMessage("Select or enter Paid From.");
    try {
      await updateExpense(editingId, editingForm);
      setEditingId("");
      setEditingForm(null);
      setMessage("Expense updated.");
      await load();
    } catch (err) { setMessage(`Could not save expense: ${err}`); }
  }

  function cancelExpenseEdit() {
    setEditingId("");
    setEditingForm(null);
    setMessage("Edit cancelled.");
  }

  async function removeExpense(row) {
    if (!confirm(`Delete ${row.vendor || row.description || "this expense"} for ${money(row.amount_cents)}?`)) return;
    try {
      await deleteExpense(row.id);
      if (editingId === row.id) { setEditingId(""); setEditingForm(null); }
      setMessage("Expense deleted.");
      await load();
    } catch (err) { setMessage(`Could not delete expense: ${err}`); }
  }

  async function receipt(id, date) {
    try {
      const path = await attachReceipt(id, date);
      if (path) {
        await setExpenseReceipt(id, path);
        await load();
      }
    } catch (err) {
      setMessage(`Could not attach receipt: ${err}`);
    }
  }

  async function downloadTemplate() {
    try {
      const { saveExpenseTemplate } = await import("./excel");
      await saveExpenseTemplate({ categories: cats, customers, accounts });
      setMessage("Expense Excel template saved.");
    } catch (err) {
      setMessage(`Could not create expense template: ${err}`);
    }
  }

  async function importExcel() {
    try {
      setBusy(true);
      setMessage("Opening expense workbook…");
      const { readExpenseImportWorkbook } = await import("./excel");
      const imported = await readExpenseImportWorkbook();
      if (!imported) return setMessage("Import cancelled.");
      const expenseImportRows = imported.rows.filter((row) => row.record_type !== "bank");
      if (expenseImportRows.length === 0) return setMessage("No expense rows were found in the workbook. Bank report rows are not re-imported as expenses.");
      const result = await importExpenseRows(expenseImportRows);
      const summary = [
        `Updated: ${result.updated || 0}.`,
        `Added: ${result.imported || 0}.`,
        `Duplicates skipped: ${result.skipped}.`,
        `Not imported: ${result.errors.length}.`
      ];
      if (result.errors.length) summary.push(`Needs correction: ${result.errors.slice(0, 4).join(" | ")}`);
      if (result.warnings.length) summary.push(`Warnings: ${result.warnings.slice(0, 3).join(" | ")}`);
      const ignoredBankRows = imported.rows.length - expenseImportRows.length;
      if (ignoredBankRows) summary.push(`Bank report rows ignored: ${ignoredBankRows}. Reconcile those records in Qentro instead of importing them as expenses.`);
      if (result.updated) summary.push("Existing expenses were matched by Expense ID or by amount, vendor, and a date within three days. Description and Category changes were synchronized.");
      if (result.imported) summary.push("New expenses were added as reviewed records. Review and clean them in the Expenses table below.");
      summary.push("Rows removed from Excel are not deleted from Qentro.");
      setMessage(summary.join("\n"));
      await load();
    } catch (err) {
      setMessage(`Could not import expenses: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  async function exportReportExcel() {
    try {
      setBusy(true);
      const { exportExpenseRecordsExcel } = await import("./excel");
      const saved = await exportExpenseRecordsExcel(visibleRecords, dateRangeKey);
      if (saved) setMessage(`Exported ${visibleRecords.length} filtered record(s) to Excel.`);
    } catch (err) {
      setMessage(`Could not export the Expense report: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  async function exportReportPdf() {
    try {
      setBusy(true);
      const settings = await getSettings();
      const { buildExpenseRecordsPdf } = await import("./expenseReportPdf");
      const bytes = buildExpenseRecordsPdf({ periodLabel: dateRangeLabel, rows: visibleRecords, settings });
      const saved = await saveBytesWithDialog(bytes, `Qentro_Expense_Records_${dateRangeKey}.pdf`, ["pdf"]);
      if (saved) setMessage(`Expense report PDF saved with ${visibleRecords.length} record(s).`);
    } catch (err) {
      setMessage(`Could not generate the Expense report PDF: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  async function changeBankCategory(row, categoryId) {
    try {
      await updateBankTransactionCategorization(row.id, categoryId, row.business_purpose || "", false);
      setMessage("Bank transaction category updated.");
      await load();
    } catch (err) { setMessage(`Could not update bank category: ${err}`); }
  }

  async function changeMoneyInType(row, classification) {
    if (!classification) return;
    try {
      await classifyBankTransaction(row.id, classification);
      setMessage(`Money-in transaction classified as ${classification.replaceAll("_", " ")} and posted to the reports when applicable.`);
      await load();
    } catch (err) { setMessage(`Could not update transaction type: ${err}`); }
  }

  const dateRecords = records.filter((row) => {
    const date = String(row.record_date || "");
    return (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
  });
  const dateRangeLabel = dateFrom || dateTo ? `${dateFrom || "Beginning"} through ${dateTo || "Today"}` : "All dates";
  const dateRangeKey = dateFrom || dateTo ? `${dateFrom || "beginning"}_to_${dateTo || "today"}` : "All_Dates";
  const paidFromOptions = [...new Set(dateRecords.map((row) => row.paid_from).filter(Boolean))].sort();
  const sourceOptions = [...new Set(dateRecords.map((row) => row.source_label).filter(Boolean))].sort();
  const statusOptions = [...new Set(dateRecords.map((row) => row.status_label).filter(Boolean))].sort();
  const visibleRecords = dateRecords
    .filter((row) => paidFromFilter === "All" || row.paid_from === paidFromFilter)
    .filter((row) => sourceFilter === "All" || row.source_label === sourceFilter)
    .filter((row) => statusFilter === "All" || row.status_label === statusFilter)
    .filter((row) => categoryFilter === "All" || String(row.category_id || "") === categoryFilter);
  const categorySummary = [...dateRecords.filter((row) => !Number(row.is_money_in)).reduce((groups, row) => {
    const name = row.category_name || "Uncategorized";
    const current = groups.get(name) || { name, count: 0, amount_cents: 0 };
    current.count += 1;
    current.amount_cents += Number(row.amount_cents || 0);
    groups.set(name, current);
    return groups;
  }, new Map()).values()].sort((a, b) => b.amount_cents - a.amount_cents);

  return (
    <section>
      <div className="panel expense-import-panel">
        <div className="panel-title-row"><div><h3>Expense import</h3><p className="muted">Choose one way to add records. Each form opens only when you need it.</p></div></div>
        <div className="button-row expense-import-actions">
          <button type="button" onClick={downloadTemplate} disabled={busy}>Download Excel Template</button>
          <button type="button" onClick={importExcel} disabled={busy}>Import Excel</button>
          <button type="button" className={activeImport==="bank"?"primary":""} onClick={()=>{setActiveImport(activeImport==="bank"?"":"bank");setManualOpen(false);}}>Import Bank CSV</button>
          <button type="button" className={activeImport==="manual"?"primary":""} onClick={()=>{setEditingId("");setEditingForm(null);setManualOpen(true);setActiveImport("manual");setMessage("Enter the expense details below.");}}>Add Manual Expense</button>
        </div>
        <Status message={message} />
      </div>
      {activeImport==="bank"?<BankImport importOnly onImported={load}/>:null}
      <datalist id="paid-from-options"><option value="Personal Credit Card"/><option value="Personal Checking"/><option value="Personal Cash"/><option value="Personal Check"/><option value="Business Credit Card"/><option value="Business Checking"/><option value="Business Cash"/>{accounts.map((a)=><option key={a.id} value={a.name}/>)}</datalist>

      {manualOpen ? <form className="panel form-grid" onSubmit={submit}>
        <h3 className="span">Add expense</h3>
        <Field label="Date" type="date" value={form.expense_date} onChange={(v) => setForm({ ...form, expense_date: v })} />
        <Field label="Vendor" value={form.vendor} onChange={(v) => setForm({ ...form, vendor: v })} />
        <Field label="Amount ($)" type="number" step="0.01" min="0.01" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
        <Select label="Category (optional)" value={form.category_id} onChange={(v) => setForm({ ...form, category_id: v })} options={cats.map((x) => [x.id, x.name])} />
        <label className="field"><span>Paid From</span><input required list="paid-from-options" value={form.paid_from} onChange={(e)=>{const v=e.target.value;const personal=/personal|owner|employee/i.test(v);const account=accounts.find((a)=>a.name.toLowerCase()===v.trim().toLowerCase());setForm({...form,paid_from:v,payment_source:personal?"personal":"business",account_id:personal?"":account?.id||""});}}/></label>
        <Select label="Customer/Project (optional)" value={form.customer_id} onChange={(v) => setForm({ ...form, customer_id: v })} options={customers.map((x) => [x.id, x.name])} />
        <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        <TextArea className="span" label="Notes (optional)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <div className="span button-row"><button className="primary">Save Expense</button><button type="button" onClick={()=>{setManualOpen(false);setActiveImport("");setForm(blankExpense());setMessage("Manual entry closed.");}}>Cancel</button></div>
      </form> : null}

      <div className="panel">
        <h3>Expense summary by category</h3>
        <div className="bank-summary expense-category-summary">
          {categorySummary.length ? categorySummary.map((item) => (
            <span key={item.name}><b>{money(item.amount_cents)}</b><small>{item.name} · {item.count} expense{item.count === 1 ? "" : "s"}</small></span>
          )) : <p className="muted">No expenses to summarize.</p>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title-row expense-records-title">
          <div><h3>Expense records</h3><p className="muted">Excel, manual, and bank-imported records appear together. Matched bank activity is combined with its existing expense.</p></div>
          <div className="button-row report-icon-actions">
            <button type="button" onClick={exportReportPdf} disabled={busy}><span aria-hidden="true">▣</span> Export PDF</button>
            <button type="button" onClick={exportReportExcel} disabled={busy}><span aria-hidden="true">▦</span> Export Excel</button>
          </div>
        </div>
        <div className="expense-record-filters">
          <Field label="From date (optional)" type="date" value={dateFrom} onChange={setDateFrom}/>
          <Field label="To date (optional)" type="date" value={dateTo} onChange={setDateTo}/>
          <Select label="Paid From" value={paidFromFilter} onChange={setPaidFromFilter} options={[["All","All payment sources"],...paidFromOptions.map((value)=>[value,value])]}/>
          <Select label="Source" value={sourceFilter} onChange={setSourceFilter} options={[["All","All sources"],...sourceOptions.map((value)=>[value,value])]}/>
          <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={[["All","All statuses"],...statusOptions.map((value)=>[value,String(value).replaceAll("_"," ")])]}/>
          <Select label="Category" value={categoryFilter} onChange={setCategoryFilter} options={[["All","All categories"],["","Uncategorized"],...cats.map((x)=>[x.id,x.name])]}/>
          <div className="field"><span>Dates</span><button type="button" onClick={()=>{setDateFrom("");setDateTo("");}}>Show all dates</button></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Vendor</th><th>Description</th><th>Category</th><th>Paid From</th><th>Source</th><th>Status</th><th>Amount</th><th>Receipt</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {visibleRecords.length===0?<tr><td colSpan="10" className="muted">No records match the selected date range and filters.</td></tr>:visibleRecords.map((r) => r.record_type==="expense" && editingId === r.id && editingForm ? (
                <tr key={r.record_key} className="editing-row">
                  <td><input type="date" value={editingForm.expense_date} onChange={(e)=>setEditingForm({...editingForm,expense_date:e.target.value})}/></td>
                  <td><input value={editingForm.vendor} onChange={(e)=>setEditingForm({...editingForm,vendor:e.target.value})}/></td>
                  <td><input value={editingForm.description} onChange={(e)=>setEditingForm({...editingForm,description:e.target.value})}/></td>
                  <td><select value={editingForm.category_id} onChange={(e)=>setEditingForm({...editingForm,category_id:e.target.value})}><option value="">Uncategorized</option>{cats.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></td>
                  <td><input required list="paid-from-options" value={editingForm.paid_from} onChange={(e)=>{const v=e.target.value;const personal=/personal|owner|employee/i.test(v);const account=accounts.find((a)=>a.name.toLowerCase()===v.trim().toLowerCase());setEditingForm({...editingForm,paid_from:v,payment_source:personal?"personal":"business",account_id:personal?"":account?.id||""});}}/></td>
                  <td>{r.source_label}</td>
                  <td><span className={`tx-status ${r.reconciliation_status==="reconciled"?"done":""}`}>{r.status_label || r.reconciliation_status || "reconciled"}</span></td>
                  <td><input type="number" min="0.01" step="0.01" value={editingForm.amount} onChange={(e)=>setEditingForm({...editingForm,amount:e.target.value})}/></td>
                  <td>{r.receipt_path ? <span className="ok">Attached</span> : <button className="link" onClick={() => receipt(r.id, r.expense_date)}>Attach</button>}</td>
                  <td><div className="button-row compact"><button type="button" className="primary" onClick={saveExpenseEdit}>Save</button><button type="button" onClick={cancelExpenseEdit}>Cancel</button></div></td>
                </tr>
              ) : (
                <tr key={r.record_key}>
                  <td>{r.expense_date}</td>
                  <td>{r.vendor || ""}</td>
                  <td>{r.description || ""}</td>
                  <td>{r.record_type==="bank"&&Number(r.is_money_in)?<select value={["bank_bonus","income","transfer","owner_contribution","other"].includes(r.status_label)?r.status_label:""} onChange={(e)=>changeMoneyInType(r,e.target.value)}><option value="">Choose transaction type</option><option value="bank_bonus">Bank Bonus / Interest</option><option value="income">Other Income</option><option value="transfer">Transfer</option><option value="owner_contribution">Owner Contribution</option><option value="other">Other / Exclude</option></select>:r.record_type==="bank"?<select value={r.category_id||""} onChange={(e)=>changeBankCategory(r,e.target.value)}><option value="">Needs Review</option>{cats.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select>:r.category_name||"Uncategorized"}</td>
                  <td>{r.paid_from || (r.payment_source === "personal" ? "Owner-paid" : "")}</td>
                  <td>{r.source_label}</td>
                  <td><span className={`tx-status ${r.reconciliation_status==="reconciled"?"done":""}`}>{String(r.status_label || r.reconciliation_status || "reconciled").replaceAll("_"," ")}</span></td>
                  <td className={Number(r.is_money_in)?"amount-cell in":""}>{Number(r.is_money_in)?"+":""}{money(r.amount_cents)}</td>
                  <td>{r.record_type==="expense"?(r.receipt_path ? <span className="ok">Attached</span> : <button className="link" onClick={() => receipt(r.id, r.expense_date)}>Attach</button>):<span className="muted">Bank record</span>}</td>
                  <td>{r.record_type==="expense"?<div className="button-row compact"><button type="button" onClick={()=>editExpense(r)}>Edit</button><button type="button" className="danger" onClick={()=>removeExpense(r)}>Delete</button></div>:Number(r.is_money_in)?<span className="muted">Select type above</span>:<span className="muted">Use Reconcile</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Mileage() {
  const [customers, setCustomers] = useState([]);
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [settings, setSettingsState] = useState({});
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [sort, setSort] = useState({ key: "trip_date", direction: "desc" });
  const [editingId, setEditingId] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [form, setForm] = useState({ trip_date: today(), start_location: "", destination: "", round_trip: "no", business_purpose: "", start_odometer: "", end_odometer: "", miles: "", rate: "", customer_id: "", notes: "" });

  function blankMileage(rate = "") {
    return { trip_date: today(), start_location: "", destination: "", round_trip: "no", business_purpose: "", start_odometer: "", end_odometer: "", miles: "", rate, customer_id: "", notes: "" };
  }

  async function load() {
    const [s, customerRows, mileageRows, currentRate] = await Promise.all([getSettings(), listCustomers(), listMileage(), mileageRateForDate(today())]);
    setSettingsState(s); setCustomers(customerRows); setRows(mileageRows);
    setForm((f) => ({ ...f, rate: f.rate || String(currentRate) }));
  }
  useEffect(() => { void load(); }, []);

  async function submit(e) {
    e.preventDefault();
    if (Number(form.miles) <= 0) return setMessage("Miles must be greater than zero.");
    if (Number(form.rate) < 0) return setMessage("Mileage rate cannot be negative.");
    if (!form.business_purpose.trim()) return setMessage("Business purpose is required.");
    try {
      if (editingId) await updateMileage(editingId, form);
      else await createMileage(form);
      const wasEditing = Boolean(editingId);
      setEditingId("");
      setForm(blankMileage(String(await mileageRateForDate(today()))));
      setManualOpen(false);
      setMessage(wasEditing ? "Mileage record updated." : "Trip saved."); await load();
    } catch (err) { setMessage(`Could not save trip: ${err}`); }
  }

  function editMileage(row) {
    setEditingId(row.id);
    setForm({
      trip_date: row.trip_date,
      start_location: row.start_location || "",
      destination: row.destination || "",
      round_trip: Number(row.round_trip || 0) ? "yes" : "no",
      business_purpose: row.business_purpose || "",
      start_odometer: row.start_odometer ?? "",
      end_odometer: row.end_odometer ?? "",
      miles: String(row.miles || ""),
      rate: String(Number(row.rate_mills_per_mile || Number(row.rate_cents_per_mile || 0) * 10) / 1000),
      customer_id: row.customer_id || "",
      notes: row.notes || ""
    });
    setManualOpen(true);
    setMessage("Editing mileage record. Save when finished or cancel the edit.");
  }

  async function removeMileage(row) {
    if (!confirm(`Delete the ${row.trip_date} mileage record for ${row.miles} mile(s)?`)) return;
    try {
      await deleteMileage(row.id);
      if (editingId === row.id) {
        setEditingId("");
        setForm(blankMileage(String(await mileageRateForDate(today()))));
        setManualOpen(false);
      }
      setMessage("Mileage record deleted.");
      await load();
    } catch (err) { setMessage(`Could not delete mileage record: ${err}`); }
  }

  async function downloadTemplate() {
    try { const { saveMileageTemplate } = await import("./excel"); await saveMileageTemplate({ customers, defaultRate: await mileageRateForDate(today()) }); setMessage("Mileage Excel template saved. Leave Rate blank during import to use the scheduled rate for each trip date."); }
    catch (err) { setMessage(`Could not create mileage template: ${err}`); }
  }
  async function importExcel() {
    try {
      setBusy(true); setMessage("Opening mileage workbook…");
      const { readMileageImportWorkbook } = await import("./excel");
      const imported = await readMileageImportWorkbook();
      if (!imported) return setMessage("Import cancelled.");
      if (imported.rows.length === 0) return setMessage("No data rows were found in the workbook.");
      const result = await importMileageRows(imported.rows);
      const details=[]; if(result.updated) details.push(`${result.updated} existing row(s) updated`); if(result.skipped) details.push(`${result.skipped} duplicate row(s) skipped`); if(result.warnings.length) details.push(`${result.warnings.length} warning(s)`); if(result.errors.length) details.push(`${result.errors.length} row error(s): ${result.errors.slice(0,3).join(" | ")}`);
      setMessage(`Added ${result.imported} mileage row(s) from ${imported.fileName}.${details.length ? ` ${details.join("; ")}.` : ""} Rows removed from Excel are not deleted from Qentro.`); await load();
    } catch(err){ setMessage(`Could not import mileage: ${err}`); } finally { setBusy(false); }
  }
  async function importTimeline(){
    try{
      setBusy(true);setMessage("Opening Google Maps Timeline export…");
      const {readGoogleTimelineExport}=await import("./excel");
      const imported=await readGoogleTimelineExport();
      if(!imported)return setMessage("Import cancelled.");
      if(!imported.rows.length)return setMessage("No driving trips with recorded distance were found in this Timeline file.");
      const result=await importGoogleTimelineRows(imported.rows);
      setMessage(`Google Timeline import complete. Imported: ${result.imported}. Duplicates skipped: ${result.skipped}. Not imported: ${result.errors.length}. New trips are marked Needs Review.`);
      await load();
    }catch(err){setMessage(`Could not import Google Timeline: ${err}`);}finally{setBusy(false);}
  }
  async function classifyTrip(row,type){
    try{
      let purpose=row.business_purpose||"";
      if(type==="business"&&!purpose.trim()){
        purpose=prompt("Business purpose for this trip:","")||"";
        if(!purpose.trim())return setMessage("Enter a business purpose before approving the trip.");
      }
      await reviewMileage(row.id,type,purpose);setMessage(`Trip marked ${type}.`);await load();
    }catch(err){setMessage(`Could not review trip: ${err}`);}
  }
  async function exportExcel() {
    try { setBusy(true); const all=await listMileage(10000); const { exportMileageExcel } = await import("./excel"); const saved=await exportMileageExcel(all); if(saved) setMessage(`Exported ${all.length} mileage row(s) to Excel.`); }
    catch(err){ setMessage(`Could not export mileage: ${err}`); } finally { setBusy(false); }
  }
  async function openNewMileage(){
    const rate=await mileageRateForDate(today());
    setEditingId("");setForm(blankMileage(String(rate)));setManualOpen(true);setMessage("Enter the business trip details below. The rate is selected from the schedule based on the trip date.");
  }
  async function changeMileageDate(value){
    const rate=await mileageRateForDate(value||today());
    setForm((current)=>({...current,trip_date:value,rate:String(rate)}));
  }
  function changeOdometer(field, value){
    setForm((current)=>{
      const next={...current,[field]:value};
      const start=Number(next.start_odometer),end=Number(next.end_odometer);
      if(next.start_odometer!==""&&next.end_odometer!==""&&Number.isFinite(start)&&Number.isFinite(end)&&end>=start){
        next.miles=String(Math.round((end-start)*1000)/1000);
      }
      return next;
    });
  }
  function toggleSort(key){ setSort((c)=>c.key===key?{key,direction:c.direction==="asc"?"desc":"asc"}:{key,direction:key==="trip_date"?"desc":"asc"}); }
  const years=[...new Set(rows.map((r)=>String(r.trip_date||"").slice(0,4)).filter(Boolean))].sort().reverse();
  const visibleRows=[...rows]
    .filter((r)=>yearFilter==="All"||String(r.trip_date||"").startsWith(`${yearFilter}-`))
    .filter((r)=>monthFilter==="All"||String(r.trip_date||"").slice(5,7)===monthFilter)
    .filter((r)=>{ const q=search.trim().toLowerCase(); return !q || [r.trip_date,r.start_location,r.destination,r.business_purpose,r.customer_name,r.notes].some((v)=>String(v||"").toLowerCase().includes(q)); })
    .sort((a,b)=>{ const val=(r)=>sort.key==="route"?`${r.start_location||""} ${r.destination||""}`.toLowerCase():["miles","rate_cents_per_mile","deduction_cents"].includes(sort.key)?Number(r[sort.key]||0):String(r[sort.key]||"").toLowerCase(); const av=val(a),bv=val(b),res=av<bv?-1:av>bv?1:0; return sort.direction==="asc"?res:-res; });
  const sortLabel=(label,key)=>`${label}${sort.key===key?(sort.direction==="asc"?" ↑":" ↓"):""}`;

  return <section>
    <div className="import-toolbar panel"><div><h3>Mileage import tools</h3><p className="muted">Import an Excel mileage log or a Google Maps Timeline JSON export. Timeline files are processed locally and imported trips must be reviewed as Business or Personal.</p></div><div className="button-row"><button type="button" onClick={downloadTemplate} disabled={busy}>Download Excel Template</button><button type="button" className="primary" onClick={importExcel} disabled={busy}>Import Excel</button><button type="button" onClick={importTimeline} disabled={busy}>Import Google Timeline</button><button type="button" onClick={exportExcel} disabled={busy}>Export Excel</button></div></div>
    <div className="panel"><div className="button-row"><button type="button" className="primary" onClick={openNewMileage}>Add Manual Business Trip</button></div><Status message={message}/></div>
    {manualOpen ? <form className="panel form-grid" onSubmit={submit}><h3 className="span">{editingId?"Edit mileage record":"Add business trip"}</h3><Field label="Date" type="date" value={form.trip_date} onChange={changeMileageDate}/><Select label="Round Trip" value={form.round_trip} onChange={(v)=>setForm({...form,round_trip:v})} options={[["no","No"],["yes","Yes"]]}/><Field label="From" value={form.start_location} onChange={(v)=>setForm({...form,start_location:v})}/><Field label="To" value={form.destination} onChange={(v)=>setForm({...form,destination:v})}/><Field label="Start Odometer (optional)" type="number" step="0.1" min="0" value={form.start_odometer} onChange={(v)=>changeOdometer("start_odometer",v)}/><Field label="End Odometer (optional)" type="number" step="0.1" min="0" value={form.end_odometer} onChange={(v)=>changeOdometer("end_odometer",v)}/><Field label="Miles" type="number" step="0.1" min="0.1" value={form.miles} onChange={(v)=>setForm({...form,miles:v})}/><Field label="Rate ($/mile)" type="number" step="0.001" min="0" value={form.rate} onChange={(v)=>setForm({...form,rate:v})}/><Select label="Customer/Project (optional)" value={form.customer_id} onChange={(v)=>setForm({...form,customer_id:v})} options={customers.map((x)=>[x.id,x.name])}/><div/><TextArea className="span" label="Business purpose" value={form.business_purpose} onChange={(v)=>setForm({...form,business_purpose:v})}/><TextArea className="span" label="Notes" value={form.notes} onChange={(v)=>setForm({...form,notes:v})}/><div className="span notice">When both odometer readings are entered, Miles is calculated as End Odometer minus Start Odometer. Otherwise, enter Miles manually. The scheduled rate is selected by trip date and may be overridden.</div><div className="span button-row"><button className="primary">{editingId?"Update Mileage":"Save Trip"}</button><button type="button" onClick={()=>{setEditingId("");setManualOpen(false);setForm(blankMileage());setMessage("Mileage entry closed.");}}>Cancel</button></div></form> : null}
    <div className="panel"><h3>Mileage log</h3><div className="mileage-controls"><label className="field"><span>Search</span><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Purpose, location, customer…"/></label><Select label="Year" value={yearFilter} onChange={setYearFilter} options={[["All","All years"],...years.map((y)=>[y,y])]}/><Select label="Month" value={monthFilter} onChange={setMonthFilter} options={[["All","All months"],["01","January"],["02","February"],["03","March"],["04","April"],["05","May"],["06","June"],["07","July"],["08","August"],["09","September"],["10","October"],["11","November"],["12","December"]]}/></div>
    <div className="table-wrap"><table><thead><tr><th><button className="sort-button" onClick={()=>toggleSort("trip_date")}>{sortLabel("Date","trip_date")}</button></th><th><button className="sort-button" onClick={()=>toggleSort("route")}>{sortLabel("From / To","route")}</button></th><th>Round Trip</th><th>Odometer</th><th><button className="sort-button" onClick={()=>toggleSort("business_purpose")}>{sortLabel("Purpose","business_purpose")}</button></th><th><button className="sort-button" onClick={()=>toggleSort("customer_name")}>{sortLabel("Customer/Project","customer_name")}</button></th><th><button className="sort-button" onClick={()=>toggleSort("miles")}>{sortLabel("Miles","miles")}</button></th><th>Source / Status</th><th><button className="sort-button" onClick={()=>toggleSort("deduction_cents")}>{sortLabel("Deduction","deduction_cents")}</button></th><th>Actions</th></tr></thead><tbody>{visibleRows.length===0?<tr><td colSpan="10" className="muted">No mileage entries match the current filters.</td></tr>:visibleRows.map((r)=><tr key={r.id}><td>{r.trip_date}</td><td>{r.start_location} → {r.destination}</td><td>{Number(r.round_trip||0)?"Yes":"No"}</td><td>{r.start_odometer!=null&&r.end_odometer!=null?`${r.start_odometer} → ${r.end_odometer}`:""}</td><td>{r.business_purpose}</td><td>{r.customer_name||""}</td><td>{r.miles}</td><td>{String(r.source||"manual").replaceAll("_"," ")}<br/><span className={`tx-status ${r.review_status==="reviewed"?"done":""}`}>{r.review_status||"reviewed"}</span></td><td>{money(r.deduction_cents)}</td><td><div className="button-row compact">{r.review_status==="needs_review"?<><button className="primary" onClick={()=>classifyTrip(r,"business")}>Business</button><button onClick={()=>classifyTrip(r,"personal")}>Personal</button></>:null}<button type="button" onClick={()=>editMileage(r)}>Edit</button><button type="button" className="danger" onClick={()=>removeMileage(r)}>Delete</button></div></td></tr>)}</tbody></table></div></div>
  </section>;
}

function Invoices() {
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [rows, setRows] = useState([]);
  const [settings, setSettings] = useState({});
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    invoice_number: "",
    customer_id: "",
    invoice_date: today(),
    due_date: "",
    notes: "",
    payment_instructions: "",
    taxable: "no",
    tax_rate: "0"
  });
  const [items, setItems] = useState([{ description: "Consulting Services", quantity: "1", rate: "" }]);

  async function load() {
    const [customerRows, accountRows, invoiceRows, s] = await Promise.all([
      listCustomers(),
      listAccounts(),
      listInvoices(),
      getSettings()
    ]);
    setCustomers(customerRows);
    setAccounts(accountRows);
    setRows(invoiceRows);
    setSettings(s);
    setForm((f) => ({ ...f, payment_instructions: f.payment_instructions || s.payment_instructions || "" }));
  }

  async function resetInvoiceNumber() {
    const n = await nextInvoiceNumber();
    setForm((f) => ({ ...f, invoice_number: n }));
  }

  useEffect(() => {
    void load();
    void resetInvoiceNumber();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.invoice_number.trim()) return setMessage("Invoice number is required.");
    if (!form.customer_id) return setMessage("Select a customer.");
    if (items.length === 0) return setMessage("Add at least one invoice line.");
    const invalidItem = items.some((x) => !x.description.trim() || Number(x.quantity) <= 0 || Number(x.rate) < 0 || x.rate === "");
    if (invalidItem) return setMessage("Each line needs a description, quantity greater than zero, and a valid rate.");

    try {
      await createInvoice(form, items);
      setItems([{ description: "Consulting Services", quantity: "1", rate: "" }]);
      setForm((f) => ({
        ...f,
        customer_id: "",
        invoice_date: today(),
        due_date: "",
        notes: "",
        invoice_number: "",
        taxable: "no",
        tax_rate: "0"
      }));
      setMessage("Invoice saved.");
      await load();
      await resetInvoiceNumber();
    } catch (err) {
      setMessage(`Could not save invoice: ${err}`);
    }
  }

  async function openInvoice(id) {
    try {
      setSelected(await getInvoice(id));
    } catch (err) {
      setMessage(`Could not open invoice: ${err}`);
    }
  }

  async function pdf() {
    if (!selected) return;
    try {
      const { buildInvoicePdf } = await import("./invoicePdf");
      const bytes = buildInvoicePdf(selected, settings);
      await saveBytesWithDialog(bytes, `${selected.invoice_number}.pdf`, ["pdf"]);
    } catch (err) {
      setMessage(`Could not create PDF: ${err}`);
    }
  }

  async function pay(inv) {
    const remaining = Math.max(0, (Number(inv.total_cents) - Number(inv.paid_cents)) / 100);
    const amountText = prompt("Payment amount ($)", remaining.toFixed(2));
    if (amountText === null || amountText.trim() === "") return;
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) return alert("Enter a valid payment amount greater than zero.");
    if (amount > remaining + 0.001) return alert(`Payment cannot exceed the remaining balance of ${remaining.toFixed(2)}.`);

    const accountId = accounts[0]?.id || null;
    try {
      await recordPayment({
        invoice_id: inv.id,
        customer_id: inv.customer_id,
        payment_date: today(),
        amount,
        account_id: accountId,
        reference: ""
      });
      setMessage("Payment recorded.");
      await load();
      if (selected?.id === inv.id) setSelected(await getInvoice(inv.id));
    } catch (err) {
      setMessage(`Could not record payment: ${err}`);
    }
  }

  function addItem() {
    setItems((current) => [...current, { description: "", quantity: "1", rate: "" }]);
  }

  function removeItem(index) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((sum, x) => sum + Number(x.quantity || 0) * Number(x.rate || 0), 0);
  const taxRate = form.taxable === "yes" ? Math.max(0, Number(form.tax_rate || 0)) : 0;
  const taxAmount = subtotal * taxRate / 100;
  const total = subtotal + taxAmount;

  return (
    <section>
      <form className="panel form-grid" onSubmit={submit}>
        <h3 className="span">Create invoice</h3>
        <div className="span"><Status message={message} /></div>
        {customers.length === 0 ? <div className="span notice">Create a customer before creating an invoice.</div> : null}
        <Field label="Invoice #" value={form.invoice_number} onChange={(v) => setForm({ ...form, invoice_number: v })} />
        <Select label="Customer" value={form.customer_id} onChange={(v) => setForm({ ...form, customer_id: v })} options={customers.map((x) => [x.id, x.name])} />
        <Field label="Invoice date" type="date" value={form.invoice_date} onChange={(v) => setForm({ ...form, invoice_date: v })} />
        <Field label="Due date" type="date" value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} />

        <div className="span invoice-items">
          <label>Line items</label>
          {items.map((it, i) => (
            <div className="item-row" key={i}>
              <input placeholder="Description" value={it.description} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
              <input type="number" min="0.01" step="0.01" placeholder="Qty" value={it.quantity} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} />
              <input type="number" min="0" step="0.01" placeholder="Rate $" value={it.rate} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, rate: e.target.value } : x))} />
              <button type="button" className="link danger" onClick={() => removeItem(i)} disabled={items.length === 1}>Remove</button>
            </div>
          ))}
          <button type="button" onClick={addItem}>+ Add line</button>
          <div className="invoice-total-box">
            <span>Subtotal: ${subtotal.toFixed(2)}</span>
            {form.taxable === "yes" ? <span>Sales tax ({taxRate.toFixed(3).replace(/0+$/,"").replace(/\.$/,"")}%): ${taxAmount.toFixed(2)}</span> : null}
            <strong>Total: ${total.toFixed(2)}</strong>
          </div>
        </div>

        <Select label="Taxable sale?" value={form.taxable} onChange={(v) => setForm({ ...form, taxable: v, tax_rate: v === "yes" ? form.tax_rate : "0" })} options={[["no","No"],["yes","Yes"]]} />
        {form.taxable === "yes" ? <Field label="Sales tax rate (%)" type="number" min="0" max="100" step="0.001" value={form.tax_rate} onChange={(v) => setForm({ ...form, tax_rate: v })} /> : <div className="field"><span>Sales tax</span><div className="muted">Not applied to this invoice.</div></div>}
        <div className="span notice">Qentro Finance does not decide whether a sale is taxable. Enter the applicable rate only when you have determined that sales tax applies.</div>

        <TextArea className="span" label="Payment instructions" value={form.payment_instructions} onChange={(v) => setForm({ ...form, payment_instructions: v })} />
        <TextArea className="span" label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <div className="span"><button className="primary" disabled={customers.length === 0}>Save Invoice</button></div>
      </form>

      <div className="panel">
        <h3>Invoices</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th><th>Paid</th><th>Balance</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.invoice_number}</td>
                  <td>{r.customer_name}</td>
                  <td>{r.invoice_date}</td>
                  <td>{r.status}</td>
                  <td>{money(r.total_cents)}</td>
                  <td>{money(r.paid_cents)}</td>
                  <td>{money(Math.max(0, Number(r.total_cents) - Number(r.paid_cents)))}</td>
                  <td>
                    <button className="link" onClick={() => openInvoice(r.id)}>View/PDF</button>{" "}
                    {r.status !== "Paid" && r.status !== "Cancelled" ? <button className="link" onClick={() => pay(r)}>Record payment</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="modal">
          <div className="modal-card">
            <button className="modal-x" onClick={() => setSelected(null)}>×</button>
            <h2>{selected.invoice_number}</h2>
            <p><b>{selected.customer_name}</b><br />{selected.billing_address}</p>
            <Table
              headers={["Description", "Qty", "Rate", "Amount"]}
              rows={selected.items.map((i) => [i.description, i.quantity, money(i.rate_cents), money(i.amount_cents)])}
            />
            <div className="invoice-preview-total">
              <span>Subtotal: <b>{money(selected.subtotal_cents)}</b></span>
              {Number(selected.tax_cents || 0) > 0 ? <span>Sales tax ({Number(selected.tax_rate || 0).toFixed(3).replace(/0+$/,"").replace(/\.$/,"")}%): <b>{money(selected.tax_cents)}</b></span> : null}
              <span>Total: <b>{money(selected.total_cents)}</b></span>
            </div>
            {selected.payments?.length > 0 ? (
              <>
                <h3>Payments</h3>
                <Table headers={["Date", "Amount", "Reference"]} rows={selected.payments.map((p) => [p.payment_date, money(p.amount_cents), p.reference])} />
              </>
            ) : null}
            <div className="modal-actions"><button className="primary" onClick={pdf}>Save PDF</button></div>
          </div>
        </div>
      )}
    </section>
  );
}

function BankImport({ importOnly = false, onImported = null }) {
  const [accounts,setAccounts]=useState([]);
  const [categories,setCategories]=useState([]);
  const [accountId,setAccountId]=useState("");
  const [file,setFile]=useState(null);
  const [parsed,setParsed]=useState(null);
  const [message,setMessage]=useState("");
  const [amountFormat,setAmountFormat]=useState("single");
  const [map,setMap]=useState({date:"",description:"",amount:"",debit:"",credit:""});
  const [imports,setImports]=useState([]);
  const [activity,setActivity]=useState([]);
  const [importFilter,setImportFilter]=useState("");
  const [statusFilter,setStatusFilter]=useState("needs_review");
  const [search,setSearch]=useState("");
  const [selectedIds,setSelectedIds]=useState([]);
  const [savingId,setSavingId]=useState("");

  async function loadActivity(nextAccountId=accountId,nextImportId=importFilter){
    try{
      const [importRows,bankRows]=await Promise.all([
        listBankImports(nextAccountId),
        listBankActivity({accountId:nextAccountId,importId:nextImportId})
      ]);
      setImports(importRows);
      setActivity(bankRows);
    }catch(err){setMessage(`Could not load imported bank activity: ${err}`);}
  }

  useEffect(()=>{
    Promise.all([listAccounts(),listCategories()]).then(([a,c])=>{
      setAccounts(a);setCategories(c);
      if(a[0]){setAccountId(a[0].id);void loadActivity(a[0].id,"");}
    }).catch((e)=>setMessage(String(e)));
  },[]);

  useEffect(()=>{
    if(!accountId)return;
    setImportFilter("");setSelectedIds([]);
    void loadActivity(accountId,"");
  },[accountId]);

  useEffect(()=>{
    if(!accountId)return;
    setSelectedIds([]);
    void loadActivity(accountId,importFilter);
  },[importFilter]);

  function parseFile(f){
    setFile(f);setMessage("");
    Papa.parse(f,{header:true,skipEmptyLines:true,complete:(result)=>{
      if(result.errors?.length)setMessage(`CSV warning: ${result.errors[0].message}`);
      setParsed(result.data);
      const headers=result.meta.fields||[];
      const debit=headers.find((x)=>/^(debit|withdrawal|withdrawals|money out)$/i.test(String(x).trim()))||headers.find((x)=>/debit|withdraw/i.test(x))||"";
      const credit=headers.find((x)=>/^(credit|deposit|deposits|money in)$/i.test(String(x).trim()))||headers.find((x)=>/credit|deposit/i.test(x))||"";
      const amount=headers.find((x)=>/amount|net/i.test(x))||"";
      setAmountFormat(debit&&credit?"separate":"single");
      setMap({date:headers.find((x)=>/date/i.test(x))||"",description:headers.find((x)=>/description|memo|name|merchant/i.test(x))||"",amount,debit,credit});
    },error:(err)=>setMessage(`Could not read CSV: ${err}`)});
  }

  async function importRows(){
    const needsSingle=amountFormat==="single"&&!map.amount;
    const needsSeparate=amountFormat==="separate"&&(!map.debit||!map.credit);
    if(!accountId||!parsed||!map.date||!map.description||needsSingle||needsSeparate){
      return setMessage(amountFormat==="separate"?"Select an account and map Date, Description, Debit, and Credit columns.":"Select an account and map Date, Description, and Amount columns.");
    }
    const normalized=parsed.map((r)=>{
      let amount;
      if(amountFormat==="separate"){
        const debit=parseMoney(r[map.debit]);const credit=parseMoney(r[map.credit]);
        amount=(Number.isFinite(credit)?Math.abs(credit):0)-(Number.isFinite(debit)?Math.abs(debit):0);
      }else amount=parseMoney(r[map.amount]);
      return{date:normalizeDate(r[map.date]),description:String(r[map.description]??"").trim(),amount,raw:r};
    }).filter((r)=>r.date&&r.description&&Number.isFinite(r.amount)&&Math.abs(r.amount)>0.000001);
    if(!normalized.length)return setMessage("No valid transactions were found after mapping the CSV columns.");
    try{
      const importedFile=file?.name||"bank-import.csv";
      const importId=await createBankImport(accountId,importedFile,normalized);
      const debits=normalized.filter((r)=>r.amount<0).length,credits=normalized.filter((r)=>r.amount>0).length;
      setMessage(`Imported ${normalized.length} transactions from ${importedFile} (${debits} money out, ${credits} money in). They now appear in Expense records.`);
      setParsed(null);setFile(null);setImportFilter(importId);setStatusFilter("needs_review");
      await loadActivity(accountId,importId);
      if(onImported)await onImported();
    }catch(err){setMessage(`Could not import transactions: ${err}`);}
  }

  async function changeCategory(row,categoryId){
    if(Number(row.amount_cents)>=0)return;
    try{
      setSavingId(row.id);
      await updateBankTransactionCategorization(row.id,categoryId,row.business_purpose||"",false);
      await loadActivity(accountId,importFilter);
      setMessage("Category updated and approved for this transaction.");
    }catch(err){setMessage(`Could not update category: ${err}`);}
    finally{setSavingId("");}
  }

  async function approveSelected(){
    if(!selectedIds.length)return;
    try{
      const count=await approveBankTransactions(selectedIds);
      setSelectedIds([]);
      await loadActivity(accountId,importFilter);
      setMessage(`Approved ${count} transaction${count===1?"":"s"}.`);
    }catch(err){setMessage(`Could not approve selected transactions: ${err}`);}
  }

  const headers=parsed?Object.keys(parsed[0]||{}):[];
  const visible=activity.filter((r)=>{
    const status=String(r.categorization_status||"").toLowerCase();
    if(statusFilter==="needs_review" && (status==="approved"||status==="auto-categorized"))return false;
    if(statusFilter==="approved" && status!=="approved")return false;
    if(statusFilter==="auto" && status!=="auto-categorized")return false;
    if(statusFilter==="unreconciled" && Number(r.reconciled)!==0)return false;
    if(statusFilter==="reconciled" && Number(r.reconciled)!==1)return false;
    if(search){
      const hay=`${r.bank_date} ${r.description} ${r.suggested_category||""} ${r.import_file_name||""}`.toLowerCase();
      if(!hay.includes(search.toLowerCase()))return false;
    }
    return true;
  });
  const reviewable=visible.filter((r)=>Number(r.amount_cents)<0 && !["Approved","Auto-categorized"].includes(r.categorization_status||"") && r.suggested_category_id);
  const allReviewSelected=reviewable.length>0&&reviewable.every((r)=>selectedIds.includes(r.id));
  const counts={
    total:activity.length,
    auto:activity.filter((r)=>r.categorization_status==="Auto-categorized").length,
    review:activity.filter((r)=>!["Approved","Auto-categorized"].includes(r.categorization_status||"")).length,
    reconciled:activity.filter((r)=>Number(r.reconciled)===1).length
  };

  return <section>
    <div className="panel">
      <h3>Import bank / credit-card CSV</h3>
      <Status message={message}/>
      {accounts.length===0?<div className="notice">Create a business account in Settings before importing.</div>:null}
      <div className="form-grid">
        <Select label="Account" value={accountId} onChange={setAccountId} options={accounts.map((x)=>[x.id,x.name])}/>
        <label className="field"><span>CSV file</span><input type="file" accept=".csv,text/csv" onChange={(e)=>e.target.files[0]&&parseFile(e.target.files[0])}/></label>
        {parsed&&<>
          <Select label="Date column" value={map.date} onChange={(v)=>setMap({...map,date:v})} options={headers.map((h)=>[h,h])}/>
          <Select label="Description column" value={map.description} onChange={(v)=>setMap({...map,description:v})} options={headers.map((h)=>[h,h])}/>
          <Select label="Amount format" value={amountFormat} onChange={setAmountFormat} options={[["single","Single Amount column"],["separate","Separate Debit / Credit columns"]]}/>
          {amountFormat==="single"?<Select label="Amount column" value={map.amount} onChange={(v)=>setMap({...map,amount:v})} options={headers.map((h)=>[h,h])}/>:<><Select label="Debit column (money out)" value={map.debit} onChange={(v)=>setMap({...map,debit:v})} options={headers.map((h)=>[h,h])}/><Select label="Credit column (money in)" value={map.credit} onChange={(v)=>setMap({...map,credit:v})} options={headers.map((h)=>[h,h])}/></>}
          <div className="field"><span>Convention</span><small>{amountFormat==="separate"?"Debit becomes negative (money out); Credit becomes positive (money in).":"Positive = money in; negative = money out. Parentheses are treated as negative."}</small></div>
          <div className="span"><button className="primary" onClick={importRows}>Import {parsed.length} Rows</button></div>
        </>}
      </div>
    </div>

    {!importOnly?<div className="panel bank-activity-panel">
      <div className="panel-title-row"><div><h3>Imported bank activity</h3><p className="muted">Review what was imported before reconciliation. Each transaction keeps its source CSV for traceability.</p></div></div>
      <div className="bank-summary">
        <span><b>{counts.total}</b><small>Transactions</small></span>
        <span><b>{counts.auto}</b><small>Auto-categorized</small></span>
        <span><b>{counts.review}</b><small>Need review</small></span>
        <span><b>{counts.reconciled}</b><small>Reconciled</small></span>
      </div>
      <div className="bank-activity-filters">
        <Select label="Account" value={accountId} onChange={setAccountId} options={accounts.map((x)=>[x.id,x.name])}/>
        <Select label="Import file" value={importFilter} onChange={setImportFilter} options={[["","All imports"],...imports.map((x)=>[x.id,`${x.file_name} — ${x.row_count} rows`])]}/>
        <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={[["all","All"],["needs_review","Needs Review"],["approved","Approved"],["auto","Auto-categorized"],["unreconciled","Unreconciled"],["reconciled","Reconciled"]]}/>
        <Field label="Search" value={search} onChange={setSearch} placeholder="Merchant, category, file…"/>
      </div>
      <div className="bank-bulk-row">
        <label><input type="checkbox" checked={allReviewSelected} onChange={(e)=>setSelectedIds(e.target.checked?reviewable.map((r)=>r.id):[])}/> Select visible review items</label>
        <button onClick={approveSelected} disabled={!selectedIds.length}>Approve Selected ({selectedIds.length})</button>
      </div>
      <div className="table-wrap bank-activity-table-wrap">
        <table className="bank-activity-table">
          <thead><tr><th></th><th>Date</th><th>Description</th><th>Amount</th><th>Category</th><th>Possible Match</th><th>Confidence</th><th>Status</th><th>Source CSV</th></tr></thead>
          <tbody>
            {visible.length===0?<tr><td colSpan="9" className="muted">No transactions match the current filters.</td></tr>:visible.map((r)=>{
              const canBulk=Number(r.amount_cents)<0 && !["Approved","Auto-categorized"].includes(r.categorization_status||"") && !!r.suggested_category_id;
              return <tr key={r.id}>
                <td>{canBulk?<input type="checkbox" checked={selectedIds.includes(r.id)} onChange={(e)=>setSelectedIds(e.target.checked?[...selectedIds,r.id]:selectedIds.filter((id)=>id!==r.id))}/>:null}</td>
                <td className="nowrap">{r.bank_date}</td>
                <td><b>{r.description}</b><small className="table-subtext">{r.normalized_merchant&&r.normalized_merchant!==r.description?r.normalized_merchant:""}</small></td>
                <td className={`nowrap amount-cell ${Number(r.amount_cents)>=0?"in":"out"}`}>{money(r.amount_cents)}</td>
                <td>{Number(r.amount_cents)<0?<select value={r.suggested_category_id||""} disabled={savingId===r.id} onChange={(e)=>changeCategory(r,e.target.value)}><option value="">Needs Review</option>{categories.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>:<span>{r.suggested_category||"Review money-in type"}</span>}</td>
                <td>{Number(r.likely_match_count||0)>0?<span className="category-badge medium">{r.likely_match_count} likely</span>:<span className="muted">None</span>}</td>
                <td><em className={`category-badge ${String(r.categorization_confidence||"low").toLowerCase()}`}>{r.categorization_confidence||"Low"}</em></td>
                <td><span className={`tx-status ${Number(r.reconciled)===1?"done":""}`}>{Number(r.reconciled)===1?"Reconciled":r.categorization_status||"Needs Review"}</span></td>
                <td><small>{r.import_file_name||"—"}</small></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <p className="muted bank-help">Changing a money-out category approves that transaction. Use bulk approval when the suggested categories are already correct. Money-in transactions stay for reconciliation review because a deposit may be revenue, a transfer, owner contribution, loan, refund, or payment settlement.</p>
    </div>:null}
  </section>;
}

function Reconcile() {
  const [rows,setRows]=useState([]);
  const [selected,setSelected]=useState(null);
  const [cands,setCands]=useState([]);
  const [message,setMessage]=useState("");

  async function load(){
    try{
      await categorizeUnreconciledBankTransactions();
      const bankRows=await listUnreconciledBank();
      setRows(bankRows);
      if(selected){
        const refreshed=bankRows.find((r)=>r.id===selected.id);
        setSelected(refreshed||null);
      }
    }catch(err){setMessage(String(err));}
  }
  useEffect(()=>{void load();},[]);

  async function choose(r){
    try{setSelected(r);setCands(await reconciliationCandidates(r));}
    catch(err){setMessage(`Could not find matches: ${err}`);}
  }

  async function match(c){
    if(!selected)return;
    try{
      await reconcile(selected.id,c.target_type,c.id);
      setSelected(null);setCands([]);setMessage("Transaction reconciled to an existing record.");await load();
    }catch(err){setMessage(`Could not reconcile transaction: ${err}`);}
  }

  async function createExpenseFromSelected(){
    if(!selected||Number(selected.amount_cents)>=0)return;
    if(cands.length&&!confirm(`Possible duplicate warning: ${cands.length} existing expense${cands.length===1?"":"s"} matched this bank transaction. Create a separate expense anyway?`))return;
    try{
      await createExpenseFromBankTransaction(selected,selected.suggested_category_id||null);
      setSelected(null);setCands([]);setMessage("Expense created from the bank transaction and reconciled. No manual re-entry was needed.");await load();
    }catch(err){setMessage(`Could not create expense: ${err}`);}
  }

  async function classifySelected(type){
    if(!selected)return;
    try{await classifyBankTransaction(selected.id,type);setSelected(null);setCands([]);setMessage(`Bank transaction classified as ${type.replaceAll("_"," ")} and reconciled.`);await load();}
    catch(err){setMessage(`Could not classify transaction: ${err}`);}
  }

  return <section className="split reconcile-layout">
    <div className="panel">
      <div className="panel-title-row"><div><h3>Unreconciled bank transactions</h3><p className="muted">Match an existing expense or payment first. Create a missing expense only when necessary.</p></div></div>
      <Status message={message}/>
      {rows.length===0?<p className="muted">No bank transactions need reconciliation.</p>:rows.map((r)=><button key={r.id} className={`tx bank-tx ${selected?.id===r.id?"sel":""}`} onClick={()=>choose(r)}>
        <span>{r.bank_date}<b>{r.description}</b><small>{r.account_name} • {r.import_file_name||"Imported CSV"}</small><small className="tx-suggestion">{r.suggested_category||"Uncategorized / Needs Review"} • {r.categorization_status||"Needs Review"}</small></span>
        <span className="tx-right"><em className="source-badge">Bank</em><strong className={r.amount_cents>=0?"in":"out"}>{money(r.amount_cents)}</strong></span>
      </button>)}
    </div>
    <div className="panel">
      <h3>Review and reconcile</h3>
      {!selected?<p className="muted">Select an item. Matching is shown only when a possible duplicate exists.</p>:<>
        <div className="notice"><b>{selected.description}</b><br/>{selected.bank_date} • {money(selected.amount_cents)}<br/><small>Source: {selected.import_file_name||"Imported CSV"}</small></div>
        <div className="reconcile-summary-card">
          <span><small>Category</small><b>{selected.suggested_category||"Uncategorized / Needs Review"}</b></span>
          <span><small>Category status</small><b>{selected.categorization_status||"Needs Review"}</b></span>
          <span><small>Confidence</small><b>{selected.categorization_confidence||"Low"}</b></span>
        </div>
        <h4>Possible duplicates or existing matches</h4>
        {cands.length===0?<p className="muted">No likely same-amount record within three days.</p>:cands.map((c)=><div className="candidate" key={`${c.target_type}-${c.id}`}><span><b>{c.label}</b><small>{c.target_type} • {c.target_date}</small></span><strong>{money(c.amount_cents)}</strong><button className="primary" onClick={()=>match(c)}>Match & Reconcile</button></div>)}
        {Number(selected.amount_cents)<0?<><div className="quick-expense-box"><h4>{cands.length?"Possible match found":"No existing expense found"}</h4><p className="muted">{cands.length?"Match the existing expense above whenever it represents the same purchase. Create a separate expense only if this is genuinely different.":"Create an expense from this bank withdrawal when it represents business spending."}</p><button className={cands.length?"":"primary"} onClick={createExpenseFromSelected}>{cands.length?"Create Separate Expense Anyway":"Create Expense & Reconcile"}</button></div><div className="classification-actions"><button onClick={()=>classifySelected("personal")}>Personal</button><button onClick={()=>classifySelected("transfer")}>Transfer</button><button onClick={()=>classifySelected("loan_payment")}>Loan Payment</button><button onClick={()=>classifySelected("other")}>Other / Exclude</button></div></>:<div className="quick-expense-box"><h4>Classify money in</h4><p className="muted">Use Bank Bonus / Interest for an account-opening reward or bank interest. It appears as other income, separate from customer revenue.</p><div className="classification-actions"><button className="primary" onClick={()=>classifySelected("bank_bonus")}>Bank Bonus / Interest</button><button onClick={()=>classifySelected("income")}>Other Income</button><button onClick={()=>classifySelected("transfer")}>Transfer</button><button onClick={()=>classifySelected("owner_contribution")}>Owner Contribution</button><button onClick={()=>classifySelected("other")}>Other / Exclude</button></div></div>}
      </>}
    </div>
  </section>;
}

function Reports() {
  const currentYear=String(new Date().getFullYear());
  const [periodMode,setPeriodMode]=useState("ytd");
  const [month, setMonth] = useState(monthKey());
  const [year,setYear]=useState(currentYear);
  const [tab, setTab] = useState("Income Statement");
  const [income, setIncome] = useState(null);
  const [balance, setBalance] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [message, setMessage] = useState("");
  const [showEntry, setShowEntry] = useState(false);
  const [entry, setEntry] = useState({
    entry_date: today(),
    entry_type: "owner_contribution",
    description: "Owner contribution",
    amount: "",
    account_id: "",
    reference_name: "",
    notes: ""
  });

  const period=periodMode==="month"?{mode:"month",value:month}:periodMode==="year"?{mode:"year",value:year}:{mode:"ytd"};
  const formatDate=(value)=>new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(`${value}T00:00:00Z`));
  const monthName=new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${month}-01T00:00:00Z`));
  const periodLabel=periodMode==="month"?`For ${monthName}`:periodMode==="year"?`For the year ended December 31, ${year}`:`Year to date through ${formatDate(today())}`;
  const asOfLabel=periodMode==="month"?`As of ${formatDate(new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10))}`:periodMode==="year"?`As of December 31, ${year}`:`As of ${formatDate(today())}`;
  const periodFileKey=periodMode==="month"?month:periodMode==="year"?year:`YTD_${today()}`;

  async function load() {
    try {
      setMessage("");
      const [is, bs, cf, gl, accountingRows, accountRows] = await Promise.all([
        incomeStatement(period),
        balanceSheet(period),
        cashFlowStatement(period),
        generalLedger(period),
        listAccountingEntries(1000),
        listAccounts()
      ]);
      setIncome(is);
      setBalance(bs);
      setCashFlow(cf);
      setLedger(gl);
      setEntries(accountingRows);
      setAccounts(accountRows);
      if (!entry.account_id && accountRows[0]) setEntry((x) => ({ ...x, account_id: accountRows[0].id }));
    } catch (err) {
      setMessage(String(err));
    }
  }

  useEffect(() => { void load(); }, [periodMode,month,year]);

  function reportFileStem() {
    return tab.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  async function exportPdf() {
    try {
      const settings = await getSettings();
      const {
        buildIncomeStatementPdf,
        buildBalanceSheetPdf,
        buildCashFlowPdf,
        buildGeneralLedgerPdf
      } = await import("./financialStatementsPdf");
      let bytes;
      if (tab === "Income Statement") bytes = buildIncomeStatementPdf({ periodLabel, data: income, settings });
      else if (tab === "Balance Sheet") bytes = buildBalanceSheetPdf({ periodLabel: asOfLabel, data: balance, settings });
      else if (tab === "Cash Flow Statement") bytes = buildCashFlowPdf({ periodLabel, data: cashFlow, settings });
      else bytes = buildGeneralLedgerPdf({ periodLabel, rows: ledger, settings });
      const saved = await saveBytesWithDialog(bytes, `Qentro_${reportFileStem()}_${periodFileKey}.pdf`, ["pdf"]);
      if (saved) setMessage(`${tab} PDF saved.`);
    } catch (err) {
      setMessage(`Could not generate PDF: ${err}`);
    }
  }

  async function exportExcel() {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      if (tab === "Income Statement") {
        const rows = [
          ...income.revenueLines.map((r) => ({ Section: "Operating Revenue", Account: r.name, Amount: fromCents(r.amount_cents) })),
          ...(income.otherIncomeLines || []).map((r) => ({ Section: "Other Income", Account: r.name, Amount: fromCents(r.amount_cents) })),
          ...income.expenseLines.map((r) => ({ Section: "Operating Expenses", Account: r.name, Amount: fromCents(r.amount_cents) })),
          ...(income.depreciation ? [{ Section: "Operating Expenses", Account: "Depreciation Expense", Amount: fromCents(income.depreciation) }] : []),
          { Section: "Summary", Account: "Net Income", Amount: fromCents(income.netIncome) }
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Income Statement");
      } else if (tab === "Balance Sheet") {
        const rows = [
          ...balance.cashLines.map((r) => ({ Section: "Assets - Cash", Account: r.name, Amount: fromCents(r.amount_cents) })),
          ...balance.assetLines.map((r) => ({ Section: "Assets - Fixed Assets", Account: r.name, Amount: fromCents(r.amount_cents) })),
          ...(balance.accumulatedDepreciation ? [{ Section: "Assets - Fixed Assets", Account: "Accumulated Depreciation", Amount: -fromCents(balance.accumulatedDepreciation) }] : []),
          ...balance.liabilityLines.map((r) => ({ Section: "Liabilities", Account: r.name, Amount: fromCents(r.amount_cents) })),
          ...balance.equityLines.map((r) => ({ Section: "Owner's Equity", Account: r.name, Amount: fromCents(r.amount_cents) })),
          { Section: "Summary", Account: "Total Assets", Amount: fromCents(balance.totalAssets) },
          { Section: "Summary", Account: "Total Liabilities & Equity", Amount: fromCents(balance.totalLiabilitiesAndEquity) }
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Balance Sheet");
      } else if (tab === "Cash Flow Statement") {
        const rows = [
          ...cashFlow.operatingLines.map((r) => ({ Section: "Operating Activities", Line: r.name, Amount: fromCents(r.amount_cents) })),
          { Section: "Operating Activities", Line: "Net Cash from Operating Activities", Amount: fromCents(cashFlow.netOperatingCash) },
          ...cashFlow.investingLines.map((r) => ({ Section: "Investing Activities", Line: r.name, Amount: fromCents(r.amount_cents) })),
          { Section: "Investing Activities", Line: "Net Cash from Investing Activities", Amount: fromCents(cashFlow.netInvestingCash) },
          ...cashFlow.financingLines.map((r) => ({ Section: "Financing Activities", Line: r.name, Amount: fromCents(r.amount_cents) })),
          { Section: "Summary", Line: "Net Change in Cash", Amount: fromCents(cashFlow.netChangeInCash) },
          { Section: "Summary", Line: "Beginning Cash", Amount: fromCents(cashFlow.beginningCash) },
          { Section: "Summary", Line: "Ending Cash", Amount: fromCents(cashFlow.endingCash) }
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Cash Flow");
      } else {
        const rows = ledger.map((r) => ({
          Date: r.date,
          Description: r.description,
          Account: r.account,
          Debit: fromCents(r.debit_cents),
          Credit: fromCents(r.credit_cents),
          Source: r.source,
          Reference: r.reference,
          Status: r.status
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "General Ledger");
      }
      const arr = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const saved = await saveBytesWithDialog(new Uint8Array(arr), `Qentro_${reportFileStem()}_${periodFileKey}.xlsx`, ["xlsx"]);
      if (saved) setMessage(`${tab} Excel export saved.`);
    } catch (err) {
      setMessage(`Could not export report: ${err}`);
    }
  }

  async function backup() {
    try {
      const data = await listAllForBackup();
      const saved = await saveTextWithDialog(JSON.stringify(data, null, 2), `Qentro_Finance_Backup_${today()}.json`, "json");
      if (saved) setMessage("Structured-data backup saved. Receipt files are not included in this backup yet.");
    } catch (err) {
      setMessage(`Could not create backup: ${err}`);
    }
  }

  function entryTypeHelp(type) {
    const map = {
      owner_contribution: ["Owner contribution", "Money you transfer from personal funds into the business. Increases cash and owner's equity."],
      owner_draw: ["Owner draw", "Money transferred from the business to the owner. Reduces cash and owner's equity; it is not a business expense."],
      asset_purchase: ["Asset purchase", "A business asset such as a computer, server, hardware upgrade, or other capital equipment. Reduces cash and increases fixed assets."],
      loan_received: ["Loan received", "Borrowed money received by the business. Increases cash and liabilities."],
      loan_payment: ["Loan principal payment", "Principal repaid on a business loan. Reduces cash and the related liability."],
      opening_balance: ["Opening cash balance", "Use once when beginning Qentro Finance with cash already in a business account. Creates opening equity."],
      depreciation: ["Depreciation", "Records depreciation expense and accumulated depreciation. Enter only when you have determined the appropriate accounting amount."]
    };
    return map[type] || ["Accounting entry", ""];
  }

  function changeEntryType(type) {
    const [label] = entryTypeHelp(type);
    setEntry({ ...entry, entry_type: type, description: label });
  }

  async function saveEntry(e) {
    e.preventDefault();
    try {
      await createAccountingEntry(entry);
      setMessage("Accounting entry saved and reports refreshed.");
      setEntry({ ...entry, amount: "", reference_name: "", notes: "" });
      await load();
    } catch (err) {
      setMessage(`Could not save accounting entry: ${err}`);
    }
  }

  async function removeEntry(id) {
    if (!window.confirm("Delete this accounting entry?")) return;
    try {
      await deleteAccountingEntry(id);
      setMessage("Accounting entry deleted.");
      await load();
    } catch (err) {
      setMessage(`Could not delete accounting entry: ${err}`);
    }
  }

  if (!income || !balance || !cashFlow) return <Loading />;

  const [entryLabel, entryHelp] = entryTypeHelp(entry.entry_type);
  const balanceOkay = Math.abs(Number(balance.difference || 0)) <= 1;

  return (
    <section>
      <div className="toolbar report-toolbar">
        <Select label="Report period" value={periodMode} onChange={setPeriodMode} options={[["ytd","Year to Date"],["month","Monthly"],["year","Full Year"]]}/>
        {periodMode==="month"?<label className="field"><span>Month</span><input type="month" value={month} onChange={(e)=>setMonth(e.target.value)}/></label>:null}
        {periodMode==="year"?<Field label="Year" type="number" min="1900" value={year} onChange={setYear}/>:null}
        <button className="primary" onClick={exportPdf}>Generate PDF</button>
        <button onClick={exportExcel}>Export Excel</button>
        <button onClick={backup}>Export JSON Backup</button>
      </div>
      <Status message={message} />

      <div className="report-tabs">
        {["Income Statement", "Balance Sheet", "Cash Flow Statement", "General Ledger"].map((name) => (
          <button key={name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}>{name}</button>
        ))}
      </div>

      {tab === "Income Statement" && (
        <div className="panel financial-statement">
          <div className="statement-heading"><h2>Income Statement</h2><p>{periodLabel}</p></div>
          <StatementSection title="OPERATING REVENUE" rows={income.revenueLines} />
          {income.otherIncomeLines?.length ? <StatementSection title="OTHER INCOME" rows={income.otherIncomeLines} /> : null}
          <StatementTotal label="Total Income" value={income.totalRevenue} />
          <StatementSection title="OPERATING EXPENSES" rows={income.expenseLines} />
          {income.depreciation ? <StatementRow label="Depreciation Expense" value={income.depreciation} /> : null}
          <StatementTotal label="Total Expenses" value={income.totalExpenses} />
          <StatementGrandTotal label="NET INCOME" value={income.netIncome} />
          <p className="statement-note">Customer payments are operating revenue. Bank bonuses, interest, and similar receipts are shown separately as other income. Owner contributions are not revenue. Asset purchases recorded through Balance Sheet Activity are not included as operating expenses; depreciation is included when entered.</p>
        </div>
      )}

      {tab === "Balance Sheet" && (
        <>
          <div className="panel financial-statement">
            <div className="statement-heading"><h2>Balance Sheet</h2><p>{asOfLabel} · cash-basis management view</p></div>
            <h3 className="statement-section-title">ASSETS</h3>
            <h4>Current Assets</h4>
            {(balance.cashLines.length ? balance.cashLines : [{ name: "Cash and Bank Accounts", amount_cents: 0 }]).map((r) => <StatementRow key={r.name} label={r.name} value={r.amount_cents} />)}
            <StatementTotal label="Total Cash" value={balance.cashTotal} />
            <h4>Fixed Assets</h4>
            {(balance.assetLines.length ? balance.assetLines : [{ name: "No fixed assets recorded", amount_cents: 0 }]).map((r) => <StatementRow key={r.name} label={r.name} value={r.amount_cents} />)}
            {balance.accumulatedDepreciation ? <StatementRow label="Less: Accumulated Depreciation" value={-balance.accumulatedDepreciation} /> : null}
            <StatementTotal label="Net Fixed Assets" value={balance.netFixedAssets} />
            <StatementGrandTotal label="TOTAL ASSETS" value={balance.totalAssets} />

            <h3 className="statement-section-title">LIABILITIES</h3>
            {(balance.liabilityLines.length ? balance.liabilityLines : [{ name: "No liabilities recorded", amount_cents: 0 }]).map((r) => <StatementRow key={r.name} label={r.name} value={r.amount_cents} />)}
            <StatementTotal label="Total Liabilities" value={balance.totalLiabilities} />

            <h3 className="statement-section-title">OWNER'S EQUITY</h3>
            {(balance.equityLines.length ? balance.equityLines : [{ name: "No equity activity recorded", amount_cents: 0 }]).map((r) => <StatementRow key={r.name} label={r.name} value={r.amount_cents} />)}
            <StatementTotal label="Total Owner's Equity" value={balance.totalEquity} />
            <StatementGrandTotal label="TOTAL LIABILITIES & EQUITY" value={balance.totalLiabilitiesAndEquity} />
            <div className={`balance-check ${balanceOkay ? "ok" : "warn"}`}>
              Balance check: {balanceOkay ? "Balanced" : `Difference ${money(balance.difference)}`}
            </div>
            <p className="statement-note">Outstanding invoices: <b>{money(balance.outstandingInvoices)}</b>. They are shown as a management memo and are not included as Accounts Receivable in this cash-basis balance sheet.</p>
          </div>

          <div className="panel">
            <div className="panel-title-row">
              <div><h3>Balance Sheet Activity</h3><p className="muted">Record items that are not normal revenue or expenses, such as your personal cash contribution or business hardware asset.</p></div>
              <button onClick={() => setShowEntry(!showEntry)}>{showEntry ? "Hide Entry Form" : "+ Record Balance-Sheet Activity"}</button>
            </div>
            {showEntry && (
              <form className="form-grid accounting-entry-form" onSubmit={saveEntry}>
                <Select label="Type" value={entry.entry_type} onChange={changeEntryType} options={[
                  ["owner_contribution", "Owner Contribution"],
                  ["owner_draw", "Owner Draw"],
                  ["asset_purchase", "Asset Purchase"],
                  ["loan_received", "Loan Received"],
                  ["loan_payment", "Loan Principal Payment"],
                  ["opening_balance", "Opening Cash Balance"],
                  ["depreciation", "Depreciation"]
                ]} />
                <Field label="Date" type="date" value={entry.entry_date} onChange={(v) => setEntry({ ...entry, entry_date: v })} />
                <Field label="Amount ($)" type="number" step="0.01" value={entry.amount} onChange={(v) => setEntry({ ...entry, amount: v })} />
                <Select label="Cash / Bank Account" value={entry.account_id} onChange={(v) => setEntry({ ...entry, account_id: v })} options={[["", "Unassigned Cash"], ...accounts.map((a) => [a.id, a.name])]} />
                <Field label="Description" value={entry.description} onChange={(v) => setEntry({ ...entry, description: v })} />
                <Field label={entry.entry_type.includes("loan") ? "Loan / Liability Name" : entry.entry_type === "asset_purchase" || entry.entry_type === "depreciation" ? "Asset Name" : "Reference (optional)"} value={entry.reference_name} onChange={(v) => setEntry({ ...entry, reference_name: v })} />
                <TextArea className="span" label="Notes" value={entry.notes} onChange={(v) => setEntry({ ...entry, notes: v })} />
                <div className="span notice"><b>{entryLabel}:</b> {entryHelp}</div>
                <div className="span"><button className="primary">Save Accounting Entry</button></div>
              </form>
            )}
            {entries.length > 0 && (
              <div className="table-wrap accounting-history">
                <table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Reference</th><th>Account</th><th>Amount</th><th></th></tr></thead>
                <tbody>{entries.map((r) => <tr key={r.id}>
                  <td>{r.entry_date}</td><td>{String(r.entry_type).replaceAll("_", " ")}</td><td>{r.description}</td><td>{r.reference_name}</td><td>{r.account_name || "Unassigned Cash"}</td><td>{money(r.amount_cents)}</td><td><button className="link danger" onClick={() => removeEntry(r.id)}>Delete</button></td>
                </tr>)}</tbody></table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "Cash Flow Statement" && (
        <div className="panel financial-statement">
          <div className="statement-heading"><h2>Statement of Cash Flows</h2><p>{periodLabel}</p></div>
          <StatementSection title="OPERATING ACTIVITIES" rows={cashFlow.operatingLines} />
          <StatementTotal label="Net Cash from Operating Activities" value={cashFlow.netOperatingCash} />
          <StatementSection title="INVESTING ACTIVITIES" rows={cashFlow.investingLines} />
          <StatementTotal label="Net Cash from Investing Activities" value={cashFlow.netInvestingCash} />
          <StatementSection title="FINANCING ACTIVITIES" rows={cashFlow.financingLines} />
          <StatementTotal label="Net Cash from Financing Activities" value={cashFlow.netFinancingCash} />
          <StatementGrandTotal label="NET CHANGE IN CASH" value={cashFlow.netChangeInCash} />
          <StatementRow label="Beginning Cash" value={cashFlow.beginningCash} />
          <StatementGrandTotal label="ENDING CASH" value={cashFlow.endingCash} />
          {Math.abs(Number(cashFlow.reconciliationDifference || 0)) > 1 ? <p className="statement-note warning-text">Cash flow reconciliation difference: {money(cashFlow.reconciliationDifference)}. Review account assignments and opening balances.</p> : null}
        </div>
      )}

      {tab === "General Ledger" && (
        <div className="panel">
          <div className="statement-heading"><h2>General Ledger</h2><p>{periodLabel}</p></div>
          <div className="notice"><b>Posting check:</b> Debits {money(ledger.reduce((sum,r)=>sum+Number(r.debit_cents||0),0))} • Credits {money(ledger.reduce((sum,r)=>sum+Number(r.credit_cents||0),0))} • {ledger.reduce((sum,r)=>sum+Number(r.debit_cents||0)-Number(r.credit_cents||0),0)===0?"Balanced":"Out of balance"}</div>
          <div className="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Account</th><th>Debit</th><th>Credit</th><th>Source</th><th>Status</th></tr></thead>
            <tbody>{ledger.length ? ledger.map((r, i) => <tr key={`${r.date}-${r.reference}-${i}`}><td>{r.date}</td><td>{r.description}</td><td>{r.account}</td><td>{r.debit_cents ? money(r.debit_cents) : ""}</td><td>{r.credit_cents ? money(r.credit_cents) : ""}</td><td>{r.source}</td><td>{r.status}</td></tr>) : <tr><td colSpan="7" className="muted">No posted ledger activity for the selected report period.</td></tr>}</tbody>
          </table></div>
          <p className="statement-note">Approved expenses are posted as balanced debit and credit lines. Pending expenses do not appear here. Payments and balance-sheet activity are also included.</p>
        </div>
      )}
    </section>
  );
}

function StatementSection({ title, rows = [] }) {
  return <div className="statement-section"><h3 className="statement-section-title">{title}</h3>{rows.length ? rows.map((r) => <StatementRow key={`${title}-${r.name}`} label={r.name} value={r.amount_cents} />) : <StatementRow label="No activity" value={0} />}</div>;
}

function StatementRow({ label, value }) {
  return <div className="statement-row"><span>{label}</span><b>{money(value)}</b></div>;
}

function StatementTotal({ label, value }) {
  return <div className="statement-row statement-total"><span>{label}</span><b>{money(value)}</b></div>;
}

function StatementGrandTotal({ label, value }) {
  return <div className="statement-row statement-grand-total"><span>{label}</span><b>{money(value)}</b></div>;
}

function MileageRateSettings() {
  const empty={effective_from:`${new Date().getFullYear()}-01-01`,effective_to:"",rate:"",label:""};
  const [rates,setRates]=useState([]);const [form,setForm]=useState(empty);const [editingId,setEditingId]=useState("");const [message,setMessage]=useState("");
  async function load(){setRates(await listMileageRates());}
  useEffect(()=>{void load();},[]);
  async function saveRate(e){e.preventDefault();try{if(editingId)await updateMileageRate(editingId,form);else await createMileageRate(form);setEditingId("");setForm(empty);setMessage("Mileage rate period saved. New trips use the rate effective on their trip date.");await load();}catch(err){setMessage(`Could not save mileage rate: ${err}`);}}
  function editRate(r){setEditingId(r.id);setForm({effective_from:r.effective_from,effective_to:r.effective_to||"",rate:String(Number(r.rate_mills_per_mile||0)/1000),label:r.label||""});setMessage("Editing mileage rate period.");}
  async function removeRate(r){if(!confirm(`Delete the mileage rate beginning ${r.effective_from}? Existing mileage records will keep their stored rates.`))return;try{await deleteMileageRate(r.id);if(editingId===r.id){setEditingId("");setForm(empty);}setMessage("Mileage rate period deleted. Existing mileage records were not changed.");await load();}catch(err){setMessage(`Could not delete mileage rate: ${err}`);}}
  return <div className="panel"><h3>Mileage rate schedule</h3><p className="muted">Maintain rates by effective date. Periods cannot overlap. Leave Effective To blank for the current open-ended rate.</p><Status message={message}/><form className="form-grid" onSubmit={saveRate}><Field label="Effective From" type="date" value={form.effective_from} onChange={(v)=>setForm({...form,effective_from:v})}/><Field label="Effective To (optional)" type="date" value={form.effective_to} onChange={(v)=>setForm({...form,effective_to:v})}/><Field label="Rate ($/mile)" type="number" min="0" step="0.001" value={form.rate} onChange={(v)=>setForm({...form,rate:v})}/><Field label="Label (optional)" value={form.label} onChange={(v)=>setForm({...form,label:v})}/><div className="span button-row"><button className="primary">{editingId?"Save Rate Changes":"Add Rate Period"}</button>{editingId?<button type="button" onClick={()=>{setEditingId("");setForm(empty);setMessage("Edit cancelled.");}}>Cancel</button>:null}</div></form><div className="table-wrap accounting-history"><table><thead><tr><th>From</th><th>To</th><th>Rate</th><th>Label</th><th>Actions</th></tr></thead><tbody>{rates.length?rates.map((r)=><tr key={r.id}><td>{r.effective_from}</td><td>{r.effective_to||"Current"}</td><td>${(Number(r.rate_mills_per_mile||0)/1000).toFixed(3)}</td><td>{r.label}</td><td><div className="button-row compact"><button type="button" onClick={()=>editRate(r)}>Edit</button><button type="button" className="danger" onClick={()=>removeRate(r)}>Delete</button></div></td></tr>):<tr><td colSpan="5" className="muted">No scheduled rates yet. Add one before importing mileage with a blank Rate.</td></tr>}</tbody></table></div></div>;
}

function Settings() {
  const [s,setS]=useState(null);const [accounts,setAccounts]=useState([]);const [message,setMessage]=useState("");const [editingId,setEditingId]=useState("");
  const emptyAccount={name:"",account_type:"checking",institution:"",last4:""};const [acct,setAcct]=useState({...emptyAccount,name:"Business Checking"});
  async function load(){const [settings,accountRows]=await Promise.all([getSettings(),listAllAccounts()]);setS(settings);setAccounts(accountRows);} useEffect(()=>{void load();},[]); if(!s)return <Loading/>;
  async function saveIt(e){e.preventDefault();try{await saveSettings(s);const saved=await getSettings();setS(saved);setMessage("Company settings saved. They will remain here after you close and reopen Qentro Finance.");}catch(err){setMessage(`Could not save settings: ${err}`);}}
  function startEdit(a){setEditingId(a.id);setAcct({name:a.name||"",account_type:a.account_type||"checking",institution:a.institution||"",last4:a.last4||""});setMessage(`Editing ${a.name}.`);} function cancelEdit(){setEditingId("");setAcct({...emptyAccount});}
  async function saveAcct(e){e.preventDefault();if(!acct.name.trim())return setMessage("Account name is required.");try{if(editingId){await updateAccount(editingId,acct);setMessage("Account updated.");}else{await createAccount(acct);setMessage("Account added.");}setEditingId("");setAcct({...emptyAccount});await load();}catch(err){setMessage(`Could not save account: ${err}`);}}
  async function toggleActive(a){try{if(a.active){if(!confirm(`Deactivate ${a.name}? Existing transaction history will be kept.`))return;await deactivateAccount(a.id);setMessage("Account deactivated. Historical transactions were preserved.");}else{await reactivateAccount(a.id);setMessage("Account reactivated.");}if(editingId===a.id)cancelEdit();await load();}catch(err){setMessage(`Could not update account status: ${err}`);}}
  return <section className="split"><div><form className="panel form" onSubmit={saveIt}><h3>Company & invoice settings</h3><Status message={message}/><p className="muted">Save your company profile once. Qentro Finance stores it locally and uses it on invoices and financial report PDFs.</p><Field label="Company name" value={s.company_name||""} onChange={(v)=>setS({...s,company_name:v})}/><Field label="Email" type="email" value={s.company_email||""} onChange={(v)=>setS({...s,company_email:v})}/><Field label="Phone" value={s.company_phone||""} onChange={(v)=>setS({...s,company_phone:v})}/><Field label="Website" value={s.company_website||""} onChange={(v)=>setS({...s,company_website:v})}/><TextArea label="Business address" value={s.company_address||""} onChange={(v)=>setS({...s,company_address:v})}/><Field label="Invoice prefix" value={s.invoice_prefix||""} onChange={(v)=>setS({...s,invoice_prefix:v})}/><TextArea label="Default invoice payment instructions" value={s.payment_instructions||""} onChange={(v)=>setS({...s,payment_instructions:v})}/><button className="primary">Save Settings</button></form><MileageRateSettings/></div><div><form className="panel form" onSubmit={saveAcct}><h3>{editingId?"Edit financial account":"Add financial account"}</h3><p className="muted">Accounts identify where business money is held or spent. Adding an account does not connect Qentro Finance to your bank.</p><Field label="Account name" value={acct.name} onChange={(v)=>setAcct({...acct,name:v})}/><Select label="Type" value={acct.account_type} onChange={(v)=>setAcct({...acct,account_type:v})} options={[["checking","Checking"],["credit_card","Credit card"],["savings","Savings"],["cash","Cash"],["other","Other"]]}/><Field label="Institution" value={acct.institution} onChange={(v)=>setAcct({...acct,institution:v})}/><Field label="Last 4 digits (optional)" value={acct.last4} onChange={(v)=>setAcct({...acct,last4:v.replace(/\D/g,"").slice(0,4)})}/><div className="button-row"><button className="primary">{editingId?"Save Account Changes":"Add Account"}</button>{editingId?<button type="button" onClick={cancelEdit}>Cancel</button>:null}</div></form><div className="panel"><h3>Accounts</h3><div className="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Institution</th><th>Last 4</th><th>Status</th><th>Actions</th></tr></thead><tbody>{accounts.length===0?<tr><td colSpan="6" className="muted">No accounts yet.</td></tr>:accounts.map((a)=><tr key={a.id}><td>{a.name}</td><td>{a.account_type}</td><td>{a.institution}</td><td>{a.last4}</td><td>{a.active?"Active":"Inactive"}</td><td><div className="button-row compact"><button type="button" onClick={()=>startEdit(a)}>Edit</button><button type="button" onClick={()=>toggleActive(a)}>{a.active?"Deactivate":"Reactivate"}</button></div></td></tr>)}</tbody></table></div></div></div></section>;
}

function Field({ label, value, onChange, type = "text", step, min, className = "" }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      <input type={type} step={step} min={min} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange, className = "" }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options = [], disabled = false }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select disabled={disabled} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Select —</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={headers.length} className="muted">No records yet.</td></tr> : rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Status({ message }) {
  return message ? <div className="status">{message}</div> : null;
}

function InlineError({ message, onRetry }) {
  return (
    <div className="panel">
      <h3>Something went wrong</h3>
      <p className="error-text">{message}</p>
      <button onClick={onRetry}>Try again</button>
    </div>
  );
}

function Loading() {
  return <div className="loading">Loading…</div>;
}

export default App;
