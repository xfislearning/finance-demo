# Qentro Finance Local — Windows 11 MVP

A local-first bookkeeping, invoicing, expense, mileage, bank reconciliation, and reporting application.

## What this package contains

Implemented in the MVP:

- Local SQLite database
- Customer records
- Invoice creation
- Invoice PDF export
- Payment / revenue recording
- Expense entry
- Business-purpose notes
- Owner-paid / personal-account business expense flag
- Local receipt attachment
- Mileage log
- Configurable mileage rate
- Business account setup
- Manual CSV bank transaction import
- Manual/suggested reconciliation by amount
- Monthly dashboard
- Monthly expense breakdown
- Excel export
- JSON data backup export
- Local-only desktop architecture

Not yet implemented:

- Phone application
- Phone-to-laptop synchronization
- OCR of receipts
- Direct bank APIs
- Automated email sending
- Payment processing
- Payroll
- Tax filing
- Encrypted all-files backup archive
- Restore from JSON backup
- Multi-user / cloud mode

Those should be separate phases after the desktop bookkeeping workflow is validated.

---

# 1. Software required on Windows 11 Pro

## A. Microsoft C++ Build Tools

Tauri requires the Microsoft C++ Build Tools.

Install the current Microsoft Visual Studio Build Tools and select:

**Desktop development with C++**

Keep the Windows SDK components selected by the installer.

Official Tauri prerequisite page:
https://v2.tauri.app/start/prerequisites/

## B. Microsoft Edge WebView2

Windows 11 normally already includes WebView2. No separate install should be needed unless your Windows installation is unusual.

## C. Node.js LTS

Install the current **LTS** release:

https://nodejs.org/

After installation, open a new PowerShell window and check:

```powershell
node -v
npm -v
```

## D. Rust

In PowerShell:

```powershell
winget install --id Rustlang.Rustup
```

Close and reopen PowerShell.

Then run:

```powershell
rustup default stable-msvc
rustc --version
cargo --version
```

## E. Recommended editor

Visual Studio Code:

https://code.visualstudio.com/

Recommended VS Code extensions:

- rust-analyzer
- ESLint
- Prettier (optional)

---

# 2. Put the project on your desktop

Unzip the package.

For example:

```text
C:\Users\<YOUR-WINDOWS-USER>\Desktop\qentro-finance-local
```

Open PowerShell.

Move to the folder:

```powershell
cd "$HOME\Desktop\qentro-finance-local"
```

---

# 3. Install project dependencies

Run:

```powershell
npm install
```

Or run:

```powershell
.\setup-windows.ps1
```

The first `npm install` needs internet access because it downloads the application libraries.

---

# 4. Start the desktop application

From the project directory:

```powershell
npm run desktop
```

or:

```powershell
.\run-dev.ps1
```

The first Rust compilation can take longer than later development builds.

A Qentro Finance desktop window should open.

The SQLite database is created automatically the first time the application starts.

---

# 5. First-time configuration

Open **Settings**.

Set:

- Company name
- Email
- Phone
- Business address
- Invoice prefix
- Mileage rate
- Default payment instructions

Then add at least one business financial account, for example:

```text
Account name: Qentro Checking
Type: Checking
Institution: Chase
Last 4: 1234
```

Important: the application intentionally does not hard-code a tax mileage rate. Enter the rate you have verified for the applicable tax period.

---

# 6. Recommended operating workflow

## Record expenses

Go to **Expenses**.

Record:

- Date
- Vendor
- Amount
- Category
- Business purpose
- Business or personal payment source
- Optional customer
- Receipt

If you used your personal bank or card for a Qentro business expense, choose:

**Personal account / owner-paid**

This keeps the business expense in your records without expecting the transaction to appear in the business bank account.

## Record mileage

Go to **Mileage**.

Record the trip as soon as practical:

- Date
- From
- To
- Business purpose
- Miles
- Rate
- Optional customer

## Create invoices

First create a customer.

Then go to **Invoices**.

Create line items and save the invoice.

Use **View/PDF** to save a PDF invoice and send it manually through your normal email.

## Record client payment

On the invoice list select **Record payment**.

This records cash received.

When you later import the bank statement, reconcile the bank deposit to this existing payment instead of recording revenue again.

## Import bank transactions

Export transactions from your bank as CSV.

Go to **Bank Import**.

Select the account and CSV file.

Map:

- Date
- Description
- Amount

The MVP assumes:

- Positive amount = money into the account
- Negative amount = money out

If your bank exports separate Debit and Credit columns, transform the CSV first or extend the importer before using it.

## Reconcile

Go to **Reconcile**.

Select a bank transaction.

The MVP proposes same-amount expense/payment candidates.

Review the candidate and click **Match**.

It does not automatically reconcile financial records.

---

# 7. Monthly close process

At month end:

1. Enter all customer payments.
2. Enter all expenses.
3. Review owner-paid business expenses.
4. Attach missing receipts.
5. Confirm business-purpose notes.
6. Review mileage.
7. Import business bank / card CSVs.
8. Reconcile transactions.
9. Review outstanding invoices.
10. Open Reports.
11. Export Excel.
12. Export JSON backup.

The current MVP does not enforce a locked accounting period yet.

---

# 8. Where is the SQLite database?

The Tauri SQL plugin stores the local SQLite file in the application's local data area.

The application connects using:

```text
sqlite:qentro_finance.db
```

Do not move or edit the live database manually while the app is running.

For normal bookkeeping, use the application UI and exports rather than editing SQLite directly.

---

# 9. Receipt storage

Receipts selected through the application are copied into the app's local data area under a structure similar to:

```text
QentroFinance/
  Receipts/
    2026/
      08/
```

The database stores the local relative path.

This keeps document binary data out of the main SQLite tables.

---

# 10. Backup

The current MVP has **Reports > Export JSON Backup**.

This backs up the structured database records.

It does **not yet** package receipt image/PDF files into the same backup.

For the first release, also use Windows File History, OneDrive Personal Vault (only if you intentionally want cloud backup), an encrypted external drive, or another protected device backup for the application's local data.

A later build should create one encrypted `.qfb` backup containing:

- SQLite database
- Receipts
- Invoices
- Tax documents
- Settings

and implement tested restore.

---

# 11. Excel export

Go to **Reports > Export Excel**.

The workbook currently contains:

- Expenses
- Mileage
- Invoices
- Customers

This export is for review / tax-preparer handoff. SQLite remains the system of record.

---

# 12. Build a normal Windows installer

Once the development version works:

```powershell
npm run installer
```

or:

```powershell
.\build-installer.ps1
```

The NSIS installer should be generated beneath:

```text
src-tauri\target\release\bundle\nsis\
```

You can then install the application like normal Windows software.

For customer distribution later, add production code-signing before broad distribution.

---

# 13. Important security notes

- Do not expose the SQLite file over the public internet.
- Keep Windows BitLocker/device encryption enabled.
- Protect your Windows account with a strong password / Windows Hello.
- Keep backups.
- Do not place database credentials in frontend JavaScript if you later add a cloud edition.
- Do not auto-classify financial transactions without review.
- Treat receipt OCR as data extraction requiring human confirmation.
- Code-sign customer installers before broad external distribution.
- Build phone sync as an authenticated pairing protocol, not as an open local-network endpoint.

---

# 14. Recommended next development phases

## Phase 1A — validate this desktop MVP

Use it for Qentro bookkeeping for several weeks.

Fix the real workflow problems you encounter before adding complexity.

## Phase 1B — production hardening

Add:

- edit/delete with audit history
- closed-month controls
- complete encrypted backup + restore
- duplicate CSV import detection
- improved bank format mapping
- invoice status automation
- attachment viewer
- error logging
- automated tests
- database schema migrations
- installer signing

## Phase 2 — phone capture

Create a mobile application with only:

- receipt photo
- quick expense
- owner-paid flag
- mileage
- recent captures

Do not duplicate the entire desktop UI on the phone.

## Phase 3 — local pairing/sync

Desktop remains the master database.

Phone records use UUIDs and queue until synced.

Add:

- one-time pairing QR code
- device identity
- encrypted connection
- replay / duplicate protection
- sync acknowledgement
- conflict policy

## Phase 4 — optional remote sync

Only for customers who explicitly want it.

Keep the base local edition cloud-free.

---

# 15. Architecture

```text
Desktop / Laptop
┌──────────────────────────────┐
│ React UI                     │
│                              │
│ Customers / Invoices         │
│ Expenses / Mileage           │
│ Bank Import / Reconciliation │
│ Reports / Settings           │
├──────────────────────────────┤
│ Tauri 2                      │
├──────────────────────────────┤
│ SQLite                       │
│ + Local Receipt Files        │
└──────────────────────────────┘

Future Mobile Capture
┌──────────────────────────────┐
│ Receipt / Expense / Mileage  │
│ Local pending queue          │
└──────────────┬───────────────┘
               │
        secure pairing/sync
               │
               ▼
        Desktop master data
```

---

# 16. Tax/accounting limitation

Qentro Finance is a bookkeeping and record-management tool.

It should not be treated as automated tax advice or a tax filing engine.

Before automating tax-specific classifications, mileage rates, depreciation, deductibility, estimated taxes, or filing forms, validate those rules for the applicable tax year and business situation.

