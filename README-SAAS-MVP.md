# Qentro Finance SaaS v0.7.0

GitHub-ready web SaaS package.

## Architecture
- Public unsigned-in experience: existing browser-local SQL.js demo with sample data.
- Signed-in experience: Supabase Auth + PostgreSQL + RLS. No SQLite/database snapshots are used for customer finance data.
- Tenant isolation: every finance row uses `organization_id`; `organization_members` links Auth users to organizations.
- Categories: universal system defaults; country-specific tax treatment is a separate future rules layer.
- Expense receipt amounts are separated into `subtotal`, `tax_amount`, `tip_amount`, and `total_amount`.

## Current private-workspace coverage
Dashboard, Customers, Expenses, Mileage, Reconcile, Reports summary, Settings/accounts, and Invoice list are connected directly to Supabase. The public demo retains the mature local feature set while remaining sample data only.

## Important
For the existing Supabase project use `supabase/FINAL-SCHEMA-MIGRATION.sql`, not `schema.sql`.
