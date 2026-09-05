import { restSelect, restInsert, restUpdate, restDelete } from './supabaseClient';

const q = encodeURIComponent;
const now = () => new Date().toISOString();

export async function listExpenseCategories() {
  return restSelect('categories?select=id,name,sort_order,is_system,organization_id&category_type=eq.expense&is_active=eq.true&order=sort_order.asc,name.asc');
}

export async function listRevenueCategories() {
  return restSelect('categories?select=id,name,sort_order,is_system,organization_id&category_type=eq.revenue&is_active=eq.true&order=sort_order.asc,name.asc');
}

export async function listCloudAccounts() {
  return restSelect('accounts?select=*&is_active=eq.true&order=created_at.asc');
}

export async function createCloudAccount(orgId, data) {
  return restInsert('accounts', {
    organization_id: orgId,
    nickname: data.nickname?.trim() || null,
    account_type: data.account_type,
    used_for: data.used_for,
    institution_name: data.institution_name?.trim() || null,
    last_four: data.last_four?.trim() || null,
    currency: data.currency || 'USD',
    is_active: true,
    updated_at: now()
  });
}

export async function listCloudExpenses() {
  return restSelect('expenses?select=*,categories(name),accounts(nickname,account_type,institution_name,last_four,used_for)&order=expense_date.desc,created_at.desc');
}

export async function createCloudExpense(orgId, userId, data) {
  const subtotal = Number(data.subtotal || 0);
  const tax = Number(data.tax_amount || 0);
  const tip = Number(data.tip_amount || 0);
  const total = Number(data.total_amount || subtotal + tax + tip);
  return restInsert('expenses', {
    organization_id: orgId,
    account_id: data.account_id || null,
    expense_date: data.expense_date,
    vendor: data.vendor?.trim() || null,
    description: data.description?.trim() || null,
    category_id: data.category_id || null,
    customer_project: data.customer_project?.trim() || null,
    subtotal,
    tax_amount: tax,
    tip_amount: tip,
    total_amount: total,
    currency: data.currency || 'USD',
    source: data.source || 'manual',
    status: data.status || 'approved',
    receipt_path: data.receipt_path || null,
    reconciled: false,
    created_by: userId || null,
    updated_at: now()
  });
}

export async function updateCloudExpense(id, data) {
  const subtotal = Number(data.subtotal || 0);
  const tax = Number(data.tax_amount || 0);
  const tip = Number(data.tip_amount || 0);
  const total = Number(data.total_amount || subtotal + tax + tip);
  return restUpdate('expenses', `id=eq.${q(id)}`, {
    expense_date: data.expense_date,
    vendor: data.vendor?.trim() || null,
    description: data.description?.trim() || null,
    category_id: data.category_id || null,
    account_id: data.account_id || null,
    customer_project: data.customer_project?.trim() || null,
    subtotal, tax_amount: tax, tip_amount: tip, total_amount: total,
    updated_at: now()
  });
}

export async function deleteCloudExpense(id) {
  return restDelete('expenses', `id=eq.${q(id)}`);
}

export async function listCloudClients() {
  return restSelect('clients?select=*&order=created_at.desc');
}
export async function createCloudClient(orgId, data) {
  return restInsert('clients', {
    organization_id: orgId,
    name: data.name.trim(),
    contact_name: data.contact_name?.trim() || null,
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    billing_address: data.billing_address?.trim() || null,
    notes: data.notes?.trim() || null,
    is_active: true,
    updated_at: now()
  });
}

export async function listCloudMileage() {
  return restSelect('mileage?select=*&order=trip_date.desc,created_at.desc');
}
export async function createCloudMileage(orgId, userId, data) {
  const miles = Number(data.miles || 0);
  const rate = Number(data.rate_per_mile || 0);
  return restInsert('mileage', {
    organization_id: orgId,
    trip_date: data.trip_date,
    start_location: data.start_location?.trim() || null,
    end_location: data.end_location?.trim() || null,
    round_trip: !!data.round_trip,
    purpose: data.purpose?.trim() || null,
    customer_project: data.customer_project?.trim() || null,
    start_odometer: data.start_odometer === '' ? null : Number(data.start_odometer),
    end_odometer: data.end_odometer === '' ? null : Number(data.end_odometer),
    miles,
    rate_per_mile: rate,
    deduction_amount: miles * rate,
    notes: data.notes?.trim() || null,
    created_by: userId || null,
    updated_at: now()
  });
}

export async function listCloudBankTransactions() {
  return restSelect('bank_transactions?select=*,accounts(nickname,account_type,institution_name,last_four)&order=transaction_date.desc,created_at.desc');
}
export async function listCloudReconciliations() {
  return restSelect('reconciliations?select=*,bank_transactions(transaction_date,merchant,description,amount,reconciliation_status),expenses(expense_date,vendor,total_amount,reconciled)&order=created_at.desc');
}

export async function createCandidateMatch(orgId, bankId, expenseId, confidence = 1) {
  return restInsert('reconciliations', {
    organization_id: orgId,
    bank_transaction_id: bankId,
    expense_id: expenseId,
    revenue_id: null,
    match_confidence: confidence,
    match_status: 'ready_for_review'
  });
}

export async function approveCandidateMatch(reconciliation, userId) {
  const stamp = now();
  await restUpdate('reconciliations', `id=eq.${q(reconciliation.id)}`, {
    match_status: 'approved', approved_by: userId, approved_at: stamp
  });
  await restUpdate('bank_transactions', `id=eq.${q(reconciliation.bank_transaction_id)}`, {
    reconciliation_status: 'matched', updated_at: stamp
  });
  if (reconciliation.expense_id) {
    await restUpdate('expenses', `id=eq.${q(reconciliation.expense_id)}`, {
      reconciled: true, reconciled_at: stamp, updated_at: stamp
    });
  }
}

export async function listCloudRevenue() {
  return restSelect('revenue?select=*,categories(name),accounts(nickname,account_type,institution_name,last_four)&order=revenue_date.desc,created_at.desc');
}

export async function listCloudInvoices() {
  return restSelect('invoices?select=*&order=invoice_date.desc,created_at.desc');
}

export async function updateOrganization(orgId, values) {
  return restUpdate('organizations', `id=eq.${q(orgId)}`, values);
}

export async function recordActivity(orgId, userId, activityType='app_use') {
  try {
    await restInsert('user_activity', { organization_id: orgId, user_id: userId, activity_type: activityType, occurred_at: now() });
    await restUpdate('user_profiles', `user_id=eq.${q(userId)}`, { last_active_at: now() });
  } catch { /* activity tracking must never block finance work */ }
}
