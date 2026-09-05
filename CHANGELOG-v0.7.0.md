# Qentro Finance v0.7.0

- Removed obsolete Supabase SQLite snapshot architecture.
- Signed-in users now use PostgreSQL/Supabase tables directly.
- Added standardized system expense/revenue categories and category_id usage.
- Expense UI separates subtotal, tax, tip, and total.
- Accounts use Account Type + Used For + institution/nickname/last four.
- Added private Supabase-connected Dashboard, Customers, Expenses, Mileage, Reconcile, Reports summary, Settings/accounts, and invoice list.
- Updated signup function to create Auth user, profile, organization, and owner membership only.
- Preserved public sample-data demo for unsigned-in visitors.
- Added existing-project schema migration and GitHub deployment instructions.
