-- Qentro Finance SaaS v0.7.0 migration for the EXISTING Supabase project already tested manually.
-- Safe intent: align columns used by the GitHub package without recreating tenant data.
begin;

drop table if exists public.workspace_databases cascade;

-- Accounts: final standardized fields.
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='accounts' and column_name='name') then
    alter table public.accounts rename column name to nickname;
  elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='accounts' and column_name='account_name') then
    alter table public.accounts rename column account_name to nickname;
  end if;
end $$;
alter table public.accounts add column if not exists used_for text not null default 'business';
alter table public.accounts drop constraint if exists accounts_account_type_check;
alter table public.accounts add constraint accounts_account_type_check check(account_type in('checking','savings','credit_card','debit_card','cash','payment_processor','other'));
alter table public.accounts drop constraint if exists accounts_used_for_check;
alter table public.accounts add constraint accounts_used_for_check check(used_for in('business','personal'));
alter table public.accounts alter column nickname drop not null;

-- Category IDs are the single source of truth.
alter table public.expenses add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.revenue add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.expenses drop column if exists category;
alter table public.revenue drop column if exists category;

-- Make client/invoice columns predictable for the frontend without deleting existing fields.
alter table public.clients add column if not exists name text;
alter table public.clients add column if not exists contact_name text;
alter table public.clients add column if not exists email text;
alter table public.clients add column if not exists phone text;
alter table public.clients add column if not exists billing_address text;
alter table public.clients add column if not exists notes text;
alter table public.clients add column if not exists is_active boolean not null default true;
alter table public.clients add column if not exists updated_at timestamptz not null default now();

alter table public.invoices add column if not exists invoice_number text;
alter table public.invoices add column if not exists invoice_date date not null default current_date;
alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists status text not null default 'draft';
alter table public.invoices add column if not exists subtotal numeric(14,2) not null default 0;
alter table public.invoices add column if not exists tax_amount numeric(14,2) not null default 0;
alter table public.invoices add column if not exists total_amount numeric(14,2) not null default 0;
alter table public.invoices add column if not exists currency text not null default 'USD';
alter table public.invoices add column if not exists notes text;
alter table public.invoices add column if not exists payment_instructions text;
alter table public.invoices add column if not exists updated_at timestamptz not null default now();

-- Category uniqueness: NULL organization_id needs a partial unique index.
create unique index if not exists categories_system_unique on public.categories(name,category_type) where organization_id is null;
create unique index if not exists categories_org_unique on public.categories(organization_id,name,category_type) where organization_id is not null;

-- Allow organization members to update their company settings.
drop policy if exists qentro_org_member_update on public.organizations;
create policy qentro_org_member_update on public.organizations for update to authenticated using(public.is_organization_member(id)) with check(public.is_organization_member(id));

-- Re-assert RLS for client-facing tables.
alter table public.categories enable row level security;alter table public.accounts enable row level security;alter table public.clients enable row level security;alter table public.expenses enable row level security;alter table public.revenue enable row level security;alter table public.bank_transactions enable row level security;alter table public.reconciliations enable row level security;alter table public.mileage enable row level security;alter table public.invoices enable row level security;alter table public.invoice_items enable row level security;alter table public.user_activity enable row level security;

commit;
