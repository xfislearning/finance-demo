Qentro Finance 0.5.1 — Mileage Round Trip and Odometer Tracking

VERSION
-------
The application is now version 0.5.1. Replace these files in an existing v0.5.0 source folder. The synchronized version files are included:

MILEAGE CHANGES IN 0.5.1

- Added Round Trip (Yes/No) to manual entry, imported records, exports, and the Mileage log.
- Renamed the mileage Customer field to Customer/Project (optional).
- Added optional Start Odometer and End Odometer fields.
- When both odometer readings are available, Miles is automatically calculated as End Odometer minus Start Odometer.
- Miles can still be entered manually when odometer readings are not available.
- Updated the bundled Mileage Excel template with the new columns, instructions, and a Yes/No dropdown.
- Existing mileage records are preserved; new database columns are added automatically when the app starts.
- src/App.jsx
- src/db.js
- src/services.js
- src/excel.js
- src/assets/Qentro_Mileage_Import_Template.xlsx
- package.json
- package-lock.json
- src-tauri/Cargo.toml
- src-tauri/Cargo.lock
- src-tauri/tauri.conf.json
- README-REPLACE-FILES.txt

WHAT CHANGED
------------
- Reports now default to Year to Date, from January 1 through today.
- Added a Report Period selector with Year to Date, Monthly, and Full Year options.
- Full Year mode allows the user to choose a year; Monthly mode allows the user to choose a month.
- Income Statement, Balance Sheet, Cash Flow Statement, and General Ledger all use the same selected period.
- Balance Sheet uses the correct as-of date: today for YTD, month-end for Monthly, and December 31 for Full Year.
- PDF and Excel exports use the selected period and period-specific filenames.
- Report headings and empty-state messages now describe the selected period instead of always saying monthly.
- Added a mileage-rate schedule with Effective From, optional Effective To, rate, and label.
- New manual, Excel-imported, and Timeline-imported trips use the rate effective on the trip date when Rate is blank.
- Changing a manual trip date automatically selects its scheduled rate; the rate can still be overridden for that record.
- Existing mileage records retain their stored historical rates when the schedule changes.
- Added three-decimal mileage-rate precision for rates such as $0.655 per mile.
- Existing mileage data is migrated without recalculating or changing stored deductions.
- Added mileage-rate create, edit, and delete controls in Settings with overlap protection.
- Added the application version at the bottom of the left navigation.
- Aligned Dashboard date-filter action buttons with the date inputs.
- Added Bank Bonus / Interest as a money-in classification.
- Bank bonuses and other income now post to cash, the General Ledger, Income Statement, Balance Sheet, and Cash Flow Statement.
- Other income is reported separately from customer operating revenue.
- Already-reconciled bank money-in records can be reclassified directly in Expense records.
- Expense records show all dates by default instead of defaulting to the current month.
- Added optional From and To date filters plus a Show all dates button.
- Expense category summaries and PDF/Excel exports follow the selected date range.
- Dashboard KPIs show all history by default and use optional From/To date filters when specified.
- Dashboard reports bank bonuses and similar receipts as Other Income, separate from customer revenue.
- The manual expense form is hidden by default and opens only from Add Manual Expense.
- Expense editing happens directly inside the selected table row.
- Vendor and Description are displayed in separate expense-table columns.
- Mileage Template download now uses the supplied formatted workbook with its Mileage and Instructions sheets.
- Mileage records can now be edited or deleted from the Mileage log.
- Editing recalculates the mileage deduction from the updated miles and rate; personal trips remain at zero deduction.
- Expense Excel exports now include a stable Expense ID for safe update-and-reimport.
- Expense exports match the template's navy header, white bold text, header height, column widths, and date/currency formats.
- Reimporting an exported workbook updates matching expenses instead of skipping them as duplicates.
- Description, vendor, date, amount, category, Paid From, Customer/Project, and notes can be synchronized.
- Rows removed from Excel are intentionally not deleted from Qentro.
- Rows without an Expense ID remain new-import rows and continue through duplicate detection.
- Bank deposits classified as Owner Contribution now automatically increase the selected cash account and Owner's Equity.
- Previously reconciled owner-contribution deposits are backfilled when financial reports open.
- Bank-classification accounting entries use a unique source reference so they cannot be posted twice.
- Fixed the installed-app Mileage page crash caused by Timeline review handlers being scoped to the Expenses page.
- Manual, Excel-imported, and bank-imported expenses now share one review workflow.
- A bank transaction no longer needs an existing expense match to be reconciled.
- Matching is optional and is used to link possible duplicates.
- Duplicate suggestions use the same amount, similar merchant text, and a date tolerance of up to three days.
- Manual and Excel-imported expenses enter Reconcile as pending expenses.
- Bank debits can create an expense directly from Reconcile.
- Bank activity can instead be classified as income, transfer, personal, owner contribution, loan payment, or other.
- Reconcile supports bulk approval of pending manual/Excel expenses.
- Expenses show Source and Reconciliation Status.
- Expenses now have Edit and Delete actions.
- The expense form and Excel template remove Paid With and Business Purpose.
- Business Account is replaced by Paid From; users can select a suggested value or type their own.
- Customer is renamed Customer/Project and optional fields are labeled clearly.
- Expense import requires Date, Amount, Paid From, and Vendor or Description.
- Import results clearly show Imported, Duplicates Skipped, and Not Imported counts.
- The bundled Excel template keeps the original navy header, has no sample data, and includes Paid From dropdown suggestions.
- Mileage can import a Google Maps Timeline JSON export locally.
- Imported Timeline trips are marked Needs Review and can be classified Business or Personal.
- Existing mileage sorting and filters are preserved.

DATABASE
--------
The app automatically adds the required SQLite columns when it starts. Do not delete
qentro_finance.db and do not reset the database.

REPLACE
-------
This ZIP contains only files changed from v0.5.0. Copy them over the matching paths in
your project, but keep your existing local SQLite database and receipt files.

The package intentionally excludes:
- node_modules
- dist
- src-tauri/target

RUN
---
If node_modules already exists and is working, npm install is not required.

Development test:
  npm.cmd run desktop

Frontend build:
  npm.cmd run build

Installer:
  npm.cmd run installer

TEST CHECKLIST
--------------
1. Download the Mileage Excel template and confirm the blank navy-header template opens.
2. Confirm Round Trip has a Yes/No dropdown and Customer/Project is labeled optional.
3. Add a manual trip with Start Odometer 10,000 and End Odometer 10,012.5; confirm Miles becomes 12.5.
4. Add another manual trip with blank odometers and manually enter Miles.
5. Import both kinds of rows from Excel and confirm the calculated/manual mileage is saved.
6. Edit an existing trip and confirm Round Trip and odometer values are retained.
7. Export mileage and confirm the new fields are included.
8. Run the production build before creating the installer.

GENERAL LEDGER
--------------
- Approved expenses create persisted, balanced journal entries.
- Pending expenses do not appear in the General Ledger.
- Existing approved expenses with Paid From are posted automatically when the ledger opens.
- Editing a posted expense refreshes its journal lines without creating a duplicate.
- Posted expenses cannot be deleted silently; use a reversing entry.
Qentro Finance v0.4.2 replacement package

This package is a complete source tree. Replace the complete project folder,
then run npm install and npm run desktop (or npm run installer).

v0.4.2 includes:
- Expense Excel batch updates by Expense ID for Description and Category.
- Separate Vendor and Description fields in records and Excel files.
- Collapsed Add Manual Expense form.
- Expense summary by category.
- Collapsed Add Manual Business Trip form.
- Mileage Edit/Delete actions plus Excel updates by Mileage ID.



Qentro Finance 0.5.0 — Year-to-Date and Annual Reports

VERSION
-------
The application is now version 0.5.0. Replace these files in an existing v0.4.9 source folder. The synchronized version files are included:
- package.json
- src-tauri/Cargo.toml
- src-tauri/tauri.conf.json

WHAT CHANGED
------------
- Reports now default to Year to Date, from January 1 through today.
- Added a Report Period selector with Year to Date, Monthly, and Full Year options.
- Full Year mode allows the user to choose a year; Monthly mode allows the user to choose a month.
- Income Statement, Balance Sheet, Cash Flow Statement, and General Ledger all use the same selected period.
- Balance Sheet uses the correct as-of date: today for YTD, month-end for Monthly, and December 31 for Full Year.
- PDF and Excel exports use the selected period and period-specific filenames.
- Report headings and empty-state messages now describe the selected period instead of always saying monthly.
- Added a mileage-rate schedule with Effective From, optional Effective To, rate, and label.
- New manual, Excel-imported, and Timeline-imported trips use the rate effective on the trip date when Rate is blank.
- Changing a manual trip date automatically selects its scheduled rate; the rate can still be overridden for that record.
- Existing mileage records retain their stored historical rates when the schedule changes.
- Added three-decimal mileage-rate precision for rates such as $0.655 per mile.
- Existing mileage data is migrated without recalculating or changing stored deductions.
- Added mileage-rate create, edit, and delete controls in Settings with overlap protection.
- Added the application version at the bottom of the left navigation.
- Aligned Dashboard date-filter action buttons with the date inputs.
- Added Bank Bonus / Interest as a money-in classification.
- Bank bonuses and other income now post to cash, the General Ledger, Income Statement, Balance Sheet, and Cash Flow Statement.
- Other income is reported separately from customer operating revenue.
- Already-reconciled bank money-in records can be reclassified directly in Expense records.
- Expense records show all dates by default instead of defaulting to the current month.
- Added optional From and To date filters plus a Show all dates button.
- Expense category summaries and PDF/Excel exports follow the selected date range.
- Dashboard KPIs show all history by default and use optional From/To date filters when specified.
- Dashboard reports bank bonuses and similar receipts as Other Income, separate from customer revenue.
- The manual expense form is hidden by default and opens only from Add Manual Expense.
- Expense editing happens directly inside the selected table row.
- Vendor and Description are displayed in separate expense-table columns.
- Mileage Template download now uses the supplied formatted workbook with its Mileage and Instructions sheets.
- Mileage records can now be edited or deleted from the Mileage log.
- Editing recalculates the mileage deduction from the updated miles and rate; personal trips remain at zero deduction.
- Expense Excel exports now include a stable Expense ID for safe update-and-reimport.
- Expense exports match the template's navy header, white bold text, header height, column widths, and date/currency formats.
- Reimporting an exported workbook updates matching expenses instead of skipping them as duplicates.
- Description, vendor, date, amount, category, Paid From, Customer/Project, and notes can be synchronized.
- Rows removed from Excel are intentionally not deleted from Qentro.
- Rows without an Expense ID remain new-import rows and continue through duplicate detection.
- Bank deposits classified as Owner Contribution now automatically increase the selected cash account and Owner's Equity.
- Previously reconciled owner-contribution deposits are backfilled when financial reports open.
- Bank-classification accounting entries use a unique source reference so they cannot be posted twice.
- Fixed the installed-app Mileage page crash caused by Timeline review handlers being scoped to the Expenses page.
- Manual, Excel-imported, and bank-imported expenses now share one review workflow.
- A bank transaction no longer needs an existing expense match to be reconciled.
- Matching is optional and is used to link possible duplicates.
- Duplicate suggestions use the same amount, similar merchant text, and a date tolerance of up to three days.
- Manual and Excel-imported expenses enter Reconcile as pending expenses.
- Bank debits can create an expense directly from Reconcile.
- Bank activity can instead be classified as income, transfer, personal, owner contribution, loan payment, or other.
- Reconcile supports bulk approval of pending manual/Excel expenses.
- Expenses show Source and Reconciliation Status.
- Expenses now have Edit and Delete actions.
- The expense form and Excel template remove Paid With and Business Purpose.
- Business Account is replaced by Paid From; users can select a suggested value or type their own.
- Customer is renamed Customer/Project and optional fields are labeled clearly.
- Expense import requires Date, Amount, Paid From, and Vendor or Description.
- Import results clearly show Imported, Duplicates Skipped, and Not Imported counts.
- The bundled Excel template keeps the original navy header, has no sample data, and includes Paid From dropdown suggestions.
- Mileage can import a Google Maps Timeline JSON export locally.
- Imported Timeline trips are marked Needs Review and can be classified Business or Personal.
- Existing mileage sorting and filters are preserved.

DATABASE
--------
The app automatically adds the required SQLite columns when it starts. Do not delete
qentro_finance.db and do not reset the database.

REPLACE
-------
This ZIP is a complete source replacement. Replace the current project source with the
contents of this package, but keep your existing local SQLite database and receipt files.

The package intentionally excludes:
- node_modules
- dist
- src-tauri/target

RUN
---
If node_modules already exists and is working, npm install is not required.

Development test:
  npm.cmd run desktop

Frontend build:
  npm.cmd run build

Installer:
  npm.cmd run installer

TEST CHECKLIST
--------------
1. Download the Expense Excel template and confirm the blank navy-header template opens.
2. Import expenses with Date, Amount, Paid From, and Vendor or Description.
3. Confirm new manual/Excel expenses appear as Pending and on Reconcile.
4. Approve one manual expense without matching a bank transaction.
5. Import a bank CSV and create an expense directly from an unmatched bank debit.
6. Match a bank debit to a possible duplicate expense dated one to three days earlier.
7. Classify a bank transaction as Transfer or Personal without creating an expense.
8. Edit and delete an unlinked expense.
9. Import a Google Maps Timeline JSON file and review a trip as Business or Personal.
10. Approve an expense and confirm the General Ledger shows equal debit and credit lines.
11. Run the production build before creating the installer.

GENERAL LEDGER
--------------
- Approved expenses create persisted, balanced journal entries.
- Pending expenses do not appear in the General Ledger.
- Existing approved expenses with Paid From are posted automatically when the ledger opens.
- Editing a posted expense refreshes its journal lines without creating a duplicate.
- Posted expenses cannot be deleted silently; use a reversing entry.
Qentro Finance v0.4.2 replacement package

This package is a complete source tree. Replace the complete project folder,
then run npm install and npm run desktop (or npm run installer).

v0.4.2 includes:
- Expense Excel batch updates by Expense ID for Description and Category.
- Separate Vendor and Description fields in records and Excel files.
- Collapsed Add Manual Expense form.
- Expense summary by category.
- Collapsed Add Manual Business Trip form.
- Mileage Edit/Delete actions plus Excel updates by Mileage ID.


Qentro Finance 0.4.9 — Mileage Rate Schedule and Version Display

VERSION
-------
The application is now version 0.4.9. Replace these files in an existing v0.4.8 source folder. The synchronized version files are included:
- package.json
- src-tauri/Cargo.toml
- src-tauri/tauri.conf.json

WHAT CHANGED
------------
- Added a mileage-rate schedule with Effective From, optional Effective To, rate, and label.
- New manual, Excel-imported, and Timeline-imported trips use the rate effective on the trip date when Rate is blank.
- Changing a manual trip date automatically selects its scheduled rate; the rate can still be overridden for that record.
- Existing mileage records retain their stored historical rates when the schedule changes.
- Added three-decimal mileage-rate precision for rates such as $0.655 per mile.
- Existing mileage data is migrated without recalculating or changing stored deductions.
- Added mileage-rate create, edit, and delete controls in Settings with overlap protection.
- Added the application version at the bottom of the left navigation.
- Aligned Dashboard date-filter action buttons with the date inputs.
- Added Bank Bonus / Interest as a money-in classification.
- Bank bonuses and other income now post to cash, the General Ledger, Income Statement, Balance Sheet, and Cash Flow Statement.
- Other income is reported separately from customer operating revenue.
- Already-reconciled bank money-in records can be reclassified directly in Expense records.
- Expense records show all dates by default instead of defaulting to the current month.
- Added optional From and To date filters plus a Show all dates button.
- Expense category summaries and PDF/Excel exports follow the selected date range.
- Dashboard KPIs show all history by default and use optional From/To date filters when specified.
- Dashboard reports bank bonuses and similar receipts as Other Income, separate from customer revenue.
- The manual expense form is hidden by default and opens only from Add Manual Expense.
- Expense editing happens directly inside the selected table row.
- Vendor and Description are displayed in separate expense-table columns.
- Mileage Template download now uses the supplied formatted workbook with its Mileage and Instructions sheets.
- Mileage records can now be edited or deleted from the Mileage log.
- Editing recalculates the mileage deduction from the updated miles and rate; personal trips remain at zero deduction.
- Expense Excel exports now include a stable Expense ID for safe update-and-reimport.
- Expense exports match the template's navy header, white bold text, header height, column widths, and date/currency formats.
- Reimporting an exported workbook updates matching expenses instead of skipping them as duplicates.
- Description, vendor, date, amount, category, Paid From, Customer/Project, and notes can be synchronized.
- Rows removed from Excel are intentionally not deleted from Qentro.
- Rows without an Expense ID remain new-import rows and continue through duplicate detection.
- Bank deposits classified as Owner Contribution now automatically increase the selected cash account and Owner's Equity.
- Previously reconciled owner-contribution deposits are backfilled when financial reports open.
- Bank-classification accounting entries use a unique source reference so they cannot be posted twice.
- Fixed the installed-app Mileage page crash caused by Timeline review handlers being scoped to the Expenses page.
- Manual, Excel-imported, and bank-imported expenses now share one review workflow.
- A bank transaction no longer needs an existing expense match to be reconciled.
- Matching is optional and is used to link possible duplicates.
- Duplicate suggestions use the same amount, similar merchant text, and a date tolerance of up to three days.
- Manual and Excel-imported expenses enter Reconcile as pending expenses.
- Bank debits can create an expense directly from Reconcile.
- Bank activity can instead be classified as income, transfer, personal, owner contribution, loan payment, or other.
- Reconcile supports bulk approval of pending manual/Excel expenses.
- Expenses show Source and Reconciliation Status.
- Expenses now have Edit and Delete actions.
- The expense form and Excel template remove Paid With and Business Purpose.
- Business Account is replaced by Paid From; users can select a suggested value or type their own.
- Customer is renamed Customer/Project and optional fields are labeled clearly.
- Expense import requires Date, Amount, Paid From, and Vendor or Description.
- Import results clearly show Imported, Duplicates Skipped, and Not Imported counts.
- The bundled Excel template keeps the original navy header, has no sample data, and includes Paid From dropdown suggestions.
- Mileage can import a Google Maps Timeline JSON export locally.
- Imported Timeline trips are marked Needs Review and can be classified Business or Personal.
- Existing mileage sorting and filters are preserved.

DATABASE
--------
The app automatically adds the required SQLite columns when it starts. Do not delete
qentro_finance.db and do not reset the database.

REPLACE
-------
This ZIP is a complete source replacement. Replace the current project source with the
contents of this package, but keep your existing local SQLite database and receipt files.

The package intentionally excludes:
- node_modules
- dist
- src-tauri/target

RUN
---
If node_modules already exists and is working, npm install is not required.

Development test:
  npm.cmd run desktop

Frontend build:
  npm.cmd run build

Installer:
  npm.cmd run installer

TEST CHECKLIST
--------------
1. Download the Expense Excel template and confirm the blank navy-header template opens.
2. Import expenses with Date, Amount, Paid From, and Vendor or Description.
3. Confirm new manual/Excel expenses appear as Pending and on Reconcile.
4. Approve one manual expense without matching a bank transaction.
5. Import a bank CSV and create an expense directly from an unmatched bank debit.
6. Match a bank debit to a possible duplicate expense dated one to three days earlier.
7. Classify a bank transaction as Transfer or Personal without creating an expense.
8. Edit and delete an unlinked expense.
9. Import a Google Maps Timeline JSON file and review a trip as Business or Personal.
10. Approve an expense and confirm the General Ledger shows equal debit and credit lines.
11. Run the production build before creating the installer.

GENERAL LEDGER
--------------
- Approved expenses create persisted, balanced journal entries.
- Pending expenses do not appear in the General Ledger.
- Existing approved expenses with Paid From are posted automatically when the ledger opens.
- Editing a posted expense refreshes its journal lines without creating a duplicate.
- Posted expenses cannot be deleted silently; use a reversing entry.
Qentro Finance v0.4.2 replacement package

This package is a complete source tree. Replace the complete project folder,
then run npm install and npm run desktop (or npm run installer).

v0.4.2 includes:
- Expense Excel batch updates by Expense ID for Description and Category.
- Separate Vendor and Description fields in records and Excel files.
- Collapsed Add Manual Expense form.
- Expense summary by category.
- Collapsed Add Manual Business Trip form.
- Mileage Edit/Delete actions plus Excel updates by Mileage ID.


Qentro Finance 0.4.8 — Bank Bonus Posting and Expense Date Range

VERSION
-------
The application is now version 0.4.8. Replace these files in an existing v0.4.7 source folder. The synchronized version files are included:
- package.json
- src-tauri/Cargo.toml
- src-tauri/tauri.conf.json

WHAT CHANGED
------------
- Added Bank Bonus / Interest as a money-in classification.
- Bank bonuses and other income now post to cash, the General Ledger, Income Statement, Balance Sheet, and Cash Flow Statement.
- Other income is reported separately from customer operating revenue.
- Already-reconciled bank money-in records can be reclassified directly in Expense records.
- Expense records show all dates by default instead of defaulting to the current month.
- Added optional From and To date filters plus a Show all dates button.
- Expense category summaries and PDF/Excel exports follow the selected date range.
- Dashboard KPIs show all history by default and use optional From/To date filters when specified.
- Dashboard reports bank bonuses and similar receipts as Other Income, separate from customer revenue.
- The manual expense form is hidden by default and opens only from Add Manual Expense.
- Expense editing happens directly inside the selected table row.
- Vendor and Description are displayed in separate expense-table columns.
- Mileage Template download now uses the supplied formatted workbook with its Mileage and Instructions sheets.
- Mileage records can now be edited or deleted from the Mileage log.
- Editing recalculates the mileage deduction from the updated miles and rate; personal trips remain at zero deduction.
- Expense Excel exports now include a stable Expense ID for safe update-and-reimport.
- Expense exports match the template's navy header, white bold text, header height, column widths, and date/currency formats.
- Reimporting an exported workbook updates matching expenses instead of skipping them as duplicates.
- Description, vendor, date, amount, category, Paid From, Customer/Project, and notes can be synchronized.
- Rows removed from Excel are intentionally not deleted from Qentro.
- Rows without an Expense ID remain new-import rows and continue through duplicate detection.
- Bank deposits classified as Owner Contribution now automatically increase the selected cash account and Owner's Equity.
- Previously reconciled owner-contribution deposits are backfilled when financial reports open.
- Bank-classification accounting entries use a unique source reference so they cannot be posted twice.
- Fixed the installed-app Mileage page crash caused by Timeline review handlers being scoped to the Expenses page.
- Manual, Excel-imported, and bank-imported expenses now share one review workflow.
- A bank transaction no longer needs an existing expense match to be reconciled.
- Matching is optional and is used to link possible duplicates.
- Duplicate suggestions use the same amount, similar merchant text, and a date tolerance of up to three days.
- Manual and Excel-imported expenses enter Reconcile as pending expenses.
- Bank debits can create an expense directly from Reconcile.
- Bank activity can instead be classified as income, transfer, personal, owner contribution, loan payment, or other.
- Reconcile supports bulk approval of pending manual/Excel expenses.
- Expenses show Source and Reconciliation Status.
- Expenses now have Edit and Delete actions.
- The expense form and Excel template remove Paid With and Business Purpose.
- Business Account is replaced by Paid From; users can select a suggested value or type their own.
- Customer is renamed Customer/Project and optional fields are labeled clearly.
- Expense import requires Date, Amount, Paid From, and Vendor or Description.
- Import results clearly show Imported, Duplicates Skipped, and Not Imported counts.
- The bundled Excel template keeps the original navy header, has no sample data, and includes Paid From dropdown suggestions.
- Mileage can import a Google Maps Timeline JSON export locally.
- Imported Timeline trips are marked Needs Review and can be classified Business or Personal.
- Existing mileage sorting and filters are preserved.

DATABASE
--------
The app automatically adds the required SQLite columns when it starts. Do not delete
qentro_finance.db and do not reset the database.

REPLACE
-------
This ZIP is a complete source replacement. Replace the current project source with the
contents of this package, but keep your existing local SQLite database and receipt files.

The package intentionally excludes:
- node_modules
- dist
- src-tauri/target

RUN
---
If node_modules already exists and is working, npm install is not required.

Development test:
  npm.cmd run desktop

Frontend build:
  npm.cmd run build

Installer:
  npm.cmd run installer

TEST CHECKLIST
--------------
1. Download the Expense Excel template and confirm the blank navy-header template opens.
2. Import expenses with Date, Amount, Paid From, and Vendor or Description.
3. Confirm new manual/Excel expenses appear as Pending and on Reconcile.
4. Approve one manual expense without matching a bank transaction.
5. Import a bank CSV and create an expense directly from an unmatched bank debit.
6. Match a bank debit to a possible duplicate expense dated one to three days earlier.
7. Classify a bank transaction as Transfer or Personal without creating an expense.
8. Edit and delete an unlinked expense.
9. Import a Google Maps Timeline JSON file and review a trip as Business or Personal.
10. Approve an expense and confirm the General Ledger shows equal debit and credit lines.
11. Run the production build before creating the installer.

GENERAL LEDGER
--------------
- Approved expenses create persisted, balanced journal entries.
- Pending expenses do not appear in the General Ledger.
- Existing approved expenses with Paid From are posted automatically when the ledger opens.
- Editing a posted expense refreshes its journal lines without creating a duplicate.
- Posted expenses cannot be deleted silently; use a reversing entry.
Qentro Finance v0.4.2 replacement package

This package is a complete source tree. Replace the complete project folder,
then run npm install and npm run desktop (or npm run installer).

v0.4.2 includes:
- Expense Excel batch updates by Expense ID for Description and Category.
- Separate Vendor and Description fields in records and Excel files.
- Collapsed Add Manual Expense form.
- Expense summary by category.
- Collapsed Add Manual Business Trip form.
- Mileage Edit/Delete actions plus Excel updates by Mileage ID.


Qentro Finance 0.4.7 — Unified Expense Records Layout and Reporting

VERSION
-------
The application is now version 0.4.7. The synchronized version files are included:
- package.json
- src-tauri/Cargo.toml
- src-tauri/tauri.conf.json

WHAT CHANGED
------------
- The manual expense form is hidden by default and opens only from Add Manual Expense.
- Expense editing happens directly inside the selected table row.
- Vendor and Description are displayed in separate expense-table columns.
- Mileage Template download now uses the supplied formatted workbook with its Mileage and Instructions sheets.
- Mileage records can now be edited or deleted from the Mileage log.
- Editing recalculates the mileage deduction from the updated miles and rate; personal trips remain at zero deduction.
- Expense Excel exports now include a stable Expense ID for safe update-and-reimport.
- Expense exports match the template's navy header, white bold text, header height, column widths, and date/currency formats.
- Reimporting an exported workbook updates matching expenses instead of skipping them as duplicates.
- Description, vendor, date, amount, category, Paid From, Customer/Project, and notes can be synchronized.
- Rows removed from Excel are intentionally not deleted from Qentro.
- Rows without an Expense ID remain new-import rows and continue through duplicate detection.
- Bank deposits classified as Owner Contribution now automatically increase the selected cash account and Owner's Equity.
- Previously reconciled owner-contribution deposits are backfilled when financial reports open.
- Bank-classification accounting entries use a unique source reference so they cannot be posted twice.
- Fixed the installed-app Mileage page crash caused by Timeline review handlers being scoped to the Expenses page.
- Manual, Excel-imported, and bank-imported expenses now share one review workflow.
- A bank transaction no longer needs an existing expense match to be reconciled.
- Matching is optional and is used to link possible duplicates.
- Duplicate suggestions use the same amount, similar merchant text, and a date tolerance of up to three days.
- Manual and Excel-imported expenses enter Reconcile as pending expenses.
- Bank debits can create an expense directly from Reconcile.
- Bank activity can instead be classified as income, transfer, personal, owner contribution, loan payment, or other.
- Reconcile supports bulk approval of pending manual/Excel expenses.
- Expenses show Source and Reconciliation Status.
- Expenses now have Edit and Delete actions.
- The expense form and Excel template remove Paid With and Business Purpose.
- Business Account is replaced by Paid From; users can select a suggested value or type their own.
- Customer is renamed Customer/Project and optional fields are labeled clearly.
- Expense import requires Date, Amount, Paid From, and Vendor or Description.
- Import results clearly show Imported, Duplicates Skipped, and Not Imported counts.
- The bundled Excel template keeps the original navy header, has no sample data, and includes Paid From dropdown suggestions.
- Mileage can import a Google Maps Timeline JSON export locally.
- Imported Timeline trips are marked Needs Review and can be classified Business or Personal.
- Existing mileage sorting and filters are preserved.

DATABASE
--------
The app automatically adds the required SQLite columns when it starts. Do not delete
qentro_finance.db and do not reset the database.

REPLACE
-------
This ZIP is a complete source replacement. Replace the current project source with the
contents of this package, but keep your existing local SQLite database and receipt files.

The package intentionally excludes:
- node_modules
- dist
- src-tauri/target

RUN
---
If node_modules already exists and is working, npm install is not required.

Development test:
  npm.cmd run desktop

Frontend build:
  npm.cmd run build

Installer:
  npm.cmd run installer

TEST CHECKLIST
--------------
1. Download the Expense Excel template and confirm the blank navy-header template opens.
2. Import expenses with Date, Amount, Paid From, and Vendor or Description.
3. Confirm new manual/Excel expenses appear as Pending and on Reconcile.
4. Approve one manual expense without matching a bank transaction.
5. Import a bank CSV and create an expense directly from an unmatched bank debit.
6. Match a bank debit to a possible duplicate expense dated one to three days earlier.
7. Classify a bank transaction as Transfer or Personal without creating an expense.
8. Edit and delete an unlinked expense.
9. Import a Google Maps Timeline JSON file and review a trip as Business or Personal.
10. Approve an expense and confirm the General Ledger shows equal debit and credit lines.
11. Run the production build before creating the installer.

GENERAL LEDGER
--------------
- Approved expenses create persisted, balanced journal entries.
- Pending expenses do not appear in the General Ledger.
- Existing approved expenses with Paid From are posted automatically when the ledger opens.
- Editing a posted expense refreshes its journal lines without creating a duplicate.
- Posted expenses cannot be deleted silently; use a reversing entry.
Qentro Finance v0.4.2 replacement package

This package is a complete source tree. Replace the complete project folder,
then run npm install and npm run desktop (or npm run installer).

v0.4.2 includes:
- Expense Excel batch updates by Expense ID for Description and Category.
- Separate Vendor and Description fields in records and Excel files.
- Collapsed Add Manual Expense form.
- Expense summary by category.
- Collapsed Add Manual Business Trip form.
- Mileage Edit/Delete actions plus Excel updates by Mileage ID.


Qentro Finance 0.4.6 — Unified Expense Cleanup and Match-First Reconciliation

VERSION
-------
The application is now version 0.4.6. The synchronized version files are included:
- package.json
- src-tauri/Cargo.toml
- src-tauri/tauri.conf.json

WHAT CHANGED
------------
- The manual expense form is hidden by default and opens only from Add Manual Expense.
- Expense editing happens directly inside the selected table row.
- Vendor and Description are displayed in separate expense-table columns.
- Mileage Template download now uses the supplied formatted workbook with its Mileage and Instructions sheets.
- Mileage records can now be edited or deleted from the Mileage log.
- Editing recalculates the mileage deduction from the updated miles and rate; personal trips remain at zero deduction.
- Expense Excel exports now include a stable Expense ID for safe update-and-reimport.
- Expense exports match the template's navy header, white bold text, header height, column widths, and date/currency formats.
- Reimporting an exported workbook updates matching expenses instead of skipping them as duplicates.
- Description, vendor, date, amount, category, Paid From, Customer/Project, and notes can be synchronized.
- Rows removed from Excel are intentionally not deleted from Qentro.
- Rows without an Expense ID remain new-import rows and continue through duplicate detection.
- Bank deposits classified as Owner Contribution now automatically increase the selected cash account and Owner's Equity.
- Previously reconciled owner-contribution deposits are backfilled when financial reports open.
- Bank-classification accounting entries use a unique source reference so they cannot be posted twice.
- Fixed the installed-app Mileage page crash caused by Timeline review handlers being scoped to the Expenses page.
- Manual, Excel-imported, and bank-imported expenses now share one review workflow.
- A bank transaction no longer needs an existing expense match to be reconciled.
- Matching is optional and is used to link possible duplicates.
- Duplicate suggestions use the same amount, similar merchant text, and a date tolerance of up to three days.
- Manual and Excel-imported expenses enter Reconcile as pending expenses.
- Bank debits can create an expense directly from Reconcile.
- Bank activity can instead be classified as income, transfer, personal, owner contribution, loan payment, or other.
- Reconcile supports bulk approval of pending manual/Excel expenses.
- Expenses show Source and Reconciliation Status.
- Expenses now have Edit and Delete actions.
- The expense form and Excel template remove Paid With and Business Purpose.
- Business Account is replaced by Paid From; users can select a suggested value or type their own.
- Customer is renamed Customer/Project and optional fields are labeled clearly.
- Expense import requires Date, Amount, Paid From, and Vendor or Description.
- Import results clearly show Imported, Duplicates Skipped, and Not Imported counts.
- The bundled Excel template keeps the original navy header, has no sample data, and includes Paid From dropdown suggestions.
- Mileage can import a Google Maps Timeline JSON export locally.
- Imported Timeline trips are marked Needs Review and can be classified Business or Personal.
- Existing mileage sorting and filters are preserved.

DATABASE
--------
The app automatically adds the required SQLite columns when it starts. Do not delete
qentro_finance.db and do not reset the database.

REPLACE
-------
This ZIP is a complete source replacement. Replace the current project source with the
contents of this package, but keep your existing local SQLite database and receipt files.

The package intentionally excludes:
- node_modules
- dist
- src-tauri/target

RUN
---
If node_modules already exists and is working, npm install is not required.

Development test:
  npm.cmd run desktop

Frontend build:
  npm.cmd run build

Installer:
  npm.cmd run installer

TEST CHECKLIST
--------------
1. Download the Expense Excel template and confirm the blank navy-header template opens.
2. Import expenses with Date, Amount, Paid From, and Vendor or Description.
3. Confirm new manual/Excel expenses appear as Pending and on Reconcile.
4. Approve one manual expense without matching a bank transaction.
5. Import a bank CSV and create an expense directly from an unmatched bank debit.
6. Match a bank debit to a possible duplicate expense dated one to three days earlier.
7. Classify a bank transaction as Transfer or Personal without creating an expense.
8. Edit and delete an unlinked expense.
9. Import a Google Maps Timeline JSON file and review a trip as Business or Personal.
10. Approve an expense and confirm the General Ledger shows equal debit and credit lines.
11. Run the production build before creating the installer.

GENERAL LEDGER
--------------
- Approved expenses create persisted, balanced journal entries.
- Pending expenses do not appear in the General Ledger.
- Existing approved expenses with Paid From are posted automatically when the ledger opens.
- Editing a posted expense refreshes its journal lines without creating a duplicate.
- Posted expenses cannot be deleted silently; use a reversing entry.
Qentro Finance v0.4.2 replacement package

This package is a complete source tree. Replace the complete project folder,
then run npm install and npm run desktop (or npm run installer).

v0.4.2 includes:
- Expense Excel batch updates by Expense ID for Description and Category.
- Separate Vendor and Description fields in records and Excel files.
- Collapsed Add Manual Expense form.
- Expense summary by category.
- Collapsed Add Manual Business Trip form.
- Mileage Edit/Delete actions plus Excel updates by Mileage ID.


Qentro Finance 0.4.5 — Expense Category Import Update

VERSION
-------
The application is now version 0.4.5. The synchronized version files are included:
- package.json
- src-tauri/Cargo.toml
- src-tauri/tauri.conf.json

WHAT CHANGED
------------
- The manual expense form is hidden by default and opens only from Add Manual Expense.
- Expense editing happens directly inside the selected table row.
- Vendor and Description are displayed in separate expense-table columns.
- Mileage Template download now uses the supplied formatted workbook with its Mileage and Instructions sheets.
- Mileage records can now be edited or deleted from the Mileage log.
- Editing recalculates the mileage deduction from the updated miles and rate; personal trips remain at zero deduction.
- Expense Excel exports now include a stable Expense ID for safe update-and-reimport.
- Expense exports match the template's navy header, white bold text, header height, column widths, and date/currency formats.
- Reimporting an exported workbook updates matching expenses instead of skipping them as duplicates.
- Description, vendor, date, amount, category, Paid From, Customer/Project, and notes can be synchronized.
- Rows removed from Excel are intentionally not deleted from Qentro.
- Rows without an Expense ID remain new-import rows and continue through duplicate detection.
- Bank deposits classified as Owner Contribution now automatically increase the selected cash account and Owner's Equity.
- Previously reconciled owner-contribution deposits are backfilled when financial reports open.
- Bank-classification accounting entries use a unique source reference so they cannot be posted twice.
- Fixed the installed-app Mileage page crash caused by Timeline review handlers being scoped to the Expenses page.
- Manual, Excel-imported, and bank-imported expenses now share one review workflow.
- A bank transaction no longer needs an existing expense match to be reconciled.
- Matching is optional and is used to link possible duplicates.
- Duplicate suggestions use the same amount, similar merchant text, and a date tolerance of up to three days.
- Manual and Excel-imported expenses enter Reconcile as pending expenses.
- Bank debits can create an expense directly from Reconcile.
- Bank activity can instead be classified as income, transfer, personal, owner contribution, loan payment, or other.
- Reconcile supports bulk approval of pending manual/Excel expenses.
- Expenses show Source and Reconciliation Status.
- Expenses now have Edit and Delete actions.
- The expense form and Excel template remove Paid With and Business Purpose.
- Business Account is replaced by Paid From; users can select a suggested value or type their own.
- Customer is renamed Customer/Project and optional fields are labeled clearly.
- Expense import requires Date, Amount, Paid From, and Vendor or Description.
- Import results clearly show Imported, Duplicates Skipped, and Not Imported counts.
- The bundled Excel template keeps the original navy header, has no sample data, and includes Paid From dropdown suggestions.
- Mileage can import a Google Maps Timeline JSON export locally.
- Imported Timeline trips are marked Needs Review and can be classified Business or Personal.
- Existing mileage sorting and filters are preserved.

DATABASE
--------
The app automatically adds the required SQLite columns when it starts. Do not delete
qentro_finance.db and do not reset the database.

REPLACE
-------
This ZIP is a complete source replacement. Replace the current project source with the
contents of this package, but keep your existing local SQLite database and receipt files.

The package intentionally excludes:
- node_modules
- dist
- src-tauri/target

RUN
---
If node_modules already exists and is working, npm install is not required.

Development test:
  npm.cmd run desktop

Frontend build:
  npm.cmd run build

Installer:
  npm.cmd run installer

TEST CHECKLIST
--------------
1. Download the Expense Excel template and confirm the blank navy-header template opens.
2. Import expenses with Date, Amount, Paid From, and Vendor or Description.
3. Confirm new manual/Excel expenses appear as Pending and on Reconcile.
4. Approve one manual expense without matching a bank transaction.
5. Import a bank CSV and create an expense directly from an unmatched bank debit.
6. Match a bank debit to a possible duplicate expense dated one to three days earlier.
7. Classify a bank transaction as Transfer or Personal without creating an expense.
8. Edit and delete an unlinked expense.
9. Import a Google Maps Timeline JSON file and review a trip as Business or Personal.
10. Approve an expense and confirm the General Ledger shows equal debit and credit lines.
11. Run the production build before creating the installer.

GENERAL LEDGER
--------------
- Approved expenses create persisted, balanced journal entries.
- Pending expenses do not appear in the General Ledger.
- Existing approved expenses with Paid From are posted automatically when the ledger opens.
- Editing a posted expense refreshes its journal lines without creating a duplicate.
- Posted expenses cannot be deleted silently; use a reversing entry.
Qentro Finance v0.4.2 replacement package

This package is a complete source tree. Replace the complete project folder,
then run npm install and npm run desktop (or npm run installer).

v0.4.2 includes:
- Expense Excel batch updates by Expense ID for Description and Category.
- Separate Vendor and Description fields in records and Excel files.
- Collapsed Add Manual Expense form.
- Expense summary by category.
- Collapsed Add Manual Business Trip form.
- Mileage Edit/Delete actions plus Excel updates by Mileage ID.
