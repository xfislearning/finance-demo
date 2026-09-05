import React, { useEffect, useMemo, useState } from 'react';
import {
  listExpenseCategories, listCloudAccounts, createCloudAccount,
  listCloudExpenses, createCloudExpense, updateCloudExpense, deleteCloudExpense,
  listCloudClients, createCloudClient, listCloudMileage, createCloudMileage,
  listCloudBankTransactions, listCloudReconciliations, createCandidateMatch, approveCandidateMatch,
  listCloudRevenue, listCloudInvoices, updateOrganization, recordActivity
} from './cloudData';

const today = () => new Date().toISOString().slice(0,10);
const money = (v, currency='USD') => new Intl.NumberFormat(undefined,{style:'currency',currency}).format(Number(v||0));
const accountLabel = (a) => {
  const type = ({checking:'Checking',savings:'Savings',credit_card:'Credit Card',debit_card:'Debit Card',cash:'Cash',payment_processor:'Payment Processor',other:'Other'})[a.account_type] || a.account_type || 'Account';
  return [a.institution_name, type, a.last_four ? `•••• ${a.last_four}` : '', a.nickname].filter(Boolean).join(' • ');
};

function Notice({children}) { return children ? <div className="notice">{children}</div> : null; }
function Field({label,...props}) { return <label><span>{label}</span><input {...props}/></label>; }
function SelectField({label,value,onChange,options}) { return <label><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></label>; }

export default function PrivateWorkspace({page, workspace, session, setPage}) {
  const userId = session?.user?.id || session?.user_id || null;
  useEffect(()=>{ if(workspace?.organizationId && userId) void recordActivity(workspace.organizationId,userId,'page_view'); },[page,workspace?.organizationId,userId]);
  if(page==='Dashboard') return <CloudDashboard workspace={workspace} setPage={setPage}/>;
  if(page==='Customers') return <CloudCustomers workspace={workspace}/>;
  if(page==='Invoices') return <CloudInvoices/>;
  if(page==='Expenses') return <CloudExpenses workspace={workspace} userId={userId}/>;
  if(page==='Mileage') return <CloudMileage workspace={workspace} userId={userId}/>;
  if(page==='Reconcile') return <CloudReconcile workspace={workspace} userId={userId}/>;
  if(page==='Reports') return <CloudReports workspace={workspace}/>;
  if(page==='Settings') return <CloudSettings workspace={workspace}/>;
  return null;
}

function CloudDashboard({workspace,setPage}) {
  const [data,setData]=useState({expenses:[],bank:[],invoices:[]});
  useEffect(()=>{Promise.all([listCloudExpenses(),listCloudBankTransactions(),listCloudInvoices()]).then(([expenses,bank,invoices])=>setData({expenses,bank,invoices})).catch(()=>{});},[]);
  const total=data.expenses.reduce((s,e)=>s+Number(e.total_amount||0),0);
  const unreconciled=data.bank.filter(b=>b.reconciliation_status!=='matched').length;
  const missingReceipts=data.expenses.filter(e=>!e.receipt_path).length;
  return <>
    <div className="cards">
      <div className="card"><span>Expenses</span><strong>{money(total,workspace.country==='CA'?'CAD':'USD')}</strong></div>
      <div className="card"><span>Unreconciled bank items</span><strong>{unreconciled}</strong></div>
      <div className="card"><span>Missing receipts</span><strong>{missingReceipts}</strong></div>
      <div className="card"><span>Invoices</span><strong>{data.invoices.length}</strong></div>
    </div>
    <div className="panel onboarding"><h3>Getting started</h3><ol>
      <li><button onClick={()=>setPage('Settings')}>Review company settings</button></li>
      <li><button onClick={()=>setPage('Settings')}>Set up bank & payment accounts</button></li>
      <li><button onClick={()=>setPage('Expenses')}>Add or import expenses</button></li>
      <li><button onClick={()=>setPage('Reconcile')}>Reconcile transactions</button></li>
      <li><button onClick={()=>setPage('Reports')}>Review reports</button></li>
    </ol></div>
  </>;
}

function CloudExpenses({workspace,userId}) {
  const currency=workspace.country==='CA'?'CAD':'USD';
  const blank={expense_date:today(),vendor:'',description:'',category_id:'',account_id:'',customer_project:'',subtotal:'',tax_amount:'',tip_amount:'',total_amount:''};
  const [form,setForm]=useState(blank),[rows,setRows]=useState([]),[cats,setCats]=useState([]),[accounts,setAccounts]=useState([]),[message,setMessage]=useState(''),[editId,setEditId]=useState('');
  async function load(){const [e,c,a]=await Promise.all([listCloudExpenses(),listExpenseCategories(),listCloudAccounts()]);setRows(e);setCats(c);setAccounts(a);}
  useEffect(()=>{void load();},[]);
  const calculated=useMemo(()=>Number(form.subtotal||0)+Number(form.tax_amount||0)+Number(form.tip_amount||0),[form.subtotal,form.tax_amount,form.tip_amount]);
  async function submit(e){e.preventDefault();setMessage('');try{const payload={...form,total_amount:form.total_amount===''?calculated:form.total_amount,currency}; if(editId) await updateCloudExpense(editId,payload); else await createCloudExpense(workspace.organizationId,userId,payload); setForm(blank);setEditId('');setMessage(editId?'Expense updated.':'Expense saved.');await load();}catch(err){setMessage(String(err));}}
  function edit(r){setEditId(r.id);setForm({expense_date:r.expense_date,vendor:r.vendor||'',description:r.description||'',category_id:r.category_id||'',account_id:r.account_id||'',customer_project:r.customer_project||'',subtotal:String(r.subtotal??''),tax_amount:String(r.tax_amount??''),tip_amount:String(r.tip_amount??''),total_amount:String(r.total_amount??'')});}
  async function remove(id){if(!confirm('Delete this expense?'))return;try{await deleteCloudExpense(id);await load();}catch(e){setMessage(String(e));}}
  return <>
    <form className="panel form" onSubmit={submit}><h3>{editId?'Edit expense':'Add expense'}</h3><Notice>{message}</Notice>
      <div className="two-col"><Field label="Date" type="date" value={form.expense_date} onChange={e=>setForm({...form,expense_date:e.target.value})}/><Field label="Vendor" value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}/></div>
      <Field label="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
      <div className="two-col"><SelectField label="Category" value={form.category_id} onChange={v=>setForm({...form,category_id:v})} options={[["","Select category"],...cats.map(c=>[c.id,c.name])]}/><SelectField label="Paid From" value={form.account_id} onChange={v=>setForm({...form,account_id:v})} options={[["","Select account"],...accounts.map(a=>[a.id,accountLabel(a)])]}/></div>
      <Field label="Customer / Project" value={form.customer_project} onChange={e=>setForm({...form,customer_project:e.target.value})}/>
      <div className="four-col"><Field label="Subtotal" type="number" step="0.01" value={form.subtotal} onChange={e=>setForm({...form,subtotal:e.target.value})}/><Field label="Tax" type="number" step="0.01" value={form.tax_amount} onChange={e=>setForm({...form,tax_amount:e.target.value})}/><Field label="Tip" type="number" step="0.01" value={form.tip_amount} onChange={e=>setForm({...form,tip_amount:e.target.value})}/><Field label="Total" type="number" step="0.01" placeholder={calculated.toFixed(2)} value={form.total_amount} onChange={e=>setForm({...form,total_amount:e.target.value})}/></div>
      <div className="button-row"><button className="primary">{editId?'Save Changes':'Save Expense'}</button>{editId&&<button type="button" onClick={()=>{setEditId('');setForm(blank)}}>Cancel</button>}</div>
    </form>
    <div className="panel"><h3>Expenses</h3><div className="table-wrap"><table><thead><tr><th>Date</th><th>Vendor</th><th>Category</th><th>Subtotal</th><th>Tax</th><th>Tip</th><th>Total</th><th>Paid From</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.expense_date}</td><td>{r.vendor}</td><td>{r.categories?.name||'Uncategorized'}</td><td>{money(r.subtotal,currency)}</td><td>{money(r.tax_amount,currency)}</td><td>{money(r.tip_amount,currency)}</td><td>{money(r.total_amount,currency)}</td><td>{r.accounts?accountLabel(r.accounts):''}</td><td>{r.reconciled?'Reconciled':r.status}</td><td><button onClick={()=>edit(r)}>Edit</button> <button onClick={()=>remove(r.id)}>Delete</button></td></tr>)}</tbody></table></div></div>
  </>;
}

function CloudSettings({workspace}){
 const currency=workspace.country==='CA'?'CAD':'USD';
 const blank={account_type:'checking',used_for:'business',institution_name:'',nickname:'',last_four:'',currency};
 const [accounts,setAccounts]=useState([]),[form,setForm]=useState(blank),[company,setCompany]=useState(workspace.companyName),[message,setMessage]=useState('');
 async function load(){setAccounts(await listCloudAccounts());} useEffect(()=>{void load();},[]);
 async function saveAccount(e){e.preventDefault();try{await createCloudAccount(workspace.organizationId,form);setForm(blank);setMessage('Account saved.');await load();}catch(err){setMessage(String(err));}}
 async function saveCompany(e){e.preventDefault();try{await updateOrganization(workspace.organizationId,{company_name:company});setMessage('Company name updated. Refresh after saving to update the header.');}catch(err){setMessage(String(err));}}
 return <div className="split"><div><form className="panel form" onSubmit={saveCompany}><h3>Company</h3><Notice>{message}</Notice><Field label="Company name" value={company} onChange={e=>setCompany(e.target.value)}/><Field label="Country" value={workspace.country==='CA'?'Canada':'United States'} disabled/><button className="primary">Save Company</button></form>
 <form className="panel form" onSubmit={saveAccount}><h3>Add bank / payment account</h3><SelectField label="Account Type" value={form.account_type} onChange={v=>setForm({...form,account_type:v})} options={[["checking","Checking Account"],["savings","Savings Account"],["credit_card","Credit Card"],["debit_card","Debit Card"],["cash","Cash"],["payment_processor","Payment Processor"],["other","Other"]]}/><SelectField label="Used For" value={form.used_for} onChange={v=>setForm({...form,used_for:v})} options={[["business","Business"],["personal","Personal"]]}/><Field label="Financial Institution" value={form.institution_name} onChange={e=>setForm({...form,institution_name:e.target.value})}/><Field label="Nickname (optional)" value={form.nickname} onChange={e=>setForm({...form,nickname:e.target.value})}/><Field label="Last 4 Digits" maxLength="4" value={form.last_four} onChange={e=>setForm({...form,last_four:e.target.value.replace(/\D/g,'').slice(0,4)})}/><Field label="Currency" value={form.currency} disabled/><button className="primary">Save Account</button></form></div>
 <div className="panel"><h3>Accounts</h3><div className="table-wrap"><table><thead><tr><th>Account</th><th>Used For</th><th>Currency</th></tr></thead><tbody>{accounts.map(a=><tr key={a.id}><td>{accountLabel(a)}</td><td>{a.used_for}</td><td>{a.currency}</td></tr>)}</tbody></table></div></div></div>;
}

function CloudCustomers({workspace}){
 const blank={name:'',contact_name:'',email:'',phone:'',billing_address:'',notes:''}; const [form,setForm]=useState(blank),[rows,setRows]=useState([]),[message,setMessage]=useState('');
 async function load(){setRows(await listCloudClients());} useEffect(()=>{void load();},[]);
 async function submit(e){e.preventDefault();try{await createCloudClient(workspace.organizationId,form);setForm(blank);setMessage('Customer saved.');await load();}catch(err){setMessage(String(err));}}
 return <div className="split"><form className="panel form" onSubmit={submit}><h3>Add customer</h3><Notice>{message}</Notice><Field label="Business / customer name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><Field label="Contact name" value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})}/><Field label="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><Field label="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><Field label="Billing address" value={form.billing_address} onChange={e=>setForm({...form,billing_address:e.target.value})}/><button className="primary">Save Customer</button></form><div className="panel"><h3>Customers</h3><div className="table-wrap"><table><thead><tr><th>Name</th><th>Contact</th><th>Email</th><th>Phone</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.contact_name}</td><td>{r.email}</td><td>{r.phone}</td></tr>)}</tbody></table></div></div></div>;
}

function CloudMileage({workspace,userId}){
 const currency=workspace.country==='CA'?'CAD':'USD'; const blank={trip_date:today(),start_location:'',end_location:'',round_trip:false,purpose:'',customer_project:'',start_odometer:'',end_odometer:'',miles:'',rate_per_mile:'',notes:''}; const [form,setForm]=useState(blank),[rows,setRows]=useState([]),[message,setMessage]=useState('');
 async function load(){setRows(await listCloudMileage());} useEffect(()=>{void load();},[]);
 useEffect(()=>{const s=Number(form.start_odometer),e=Number(form.end_odometer);if(form.start_odometer!==''&&form.end_odometer!==''&&e>=s)setForm(f=>({...f,miles:String(e-s)}));},[form.start_odometer,form.end_odometer]);
 async function submit(e){e.preventDefault();try{await createCloudMileage(workspace.organizationId,userId,form);setForm(blank);setMessage('Mileage saved.');await load();}catch(err){setMessage(String(err));}}
 return <><form className="panel form" onSubmit={submit}><h3>Add mileage</h3><Notice>{message}</Notice><div className="two-col"><Field label="Date" type="date" value={form.trip_date} onChange={e=>setForm({...form,trip_date:e.target.value})}/><Field label="Customer / Project" value={form.customer_project} onChange={e=>setForm({...form,customer_project:e.target.value})}/></div><div className="two-col"><Field label="Start location" value={form.start_location} onChange={e=>setForm({...form,start_location:e.target.value})}/><Field label="End location" value={form.end_location} onChange={e=>setForm({...form,end_location:e.target.value})}/></div><Field label="Purpose" value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})}/><label className="checkbox"><input type="checkbox" checked={form.round_trip} onChange={e=>setForm({...form,round_trip:e.target.checked})}/> Round trip</label><div className="four-col"><Field label="Start Odometer" type="number" step="0.1" value={form.start_odometer} onChange={e=>setForm({...form,start_odometer:e.target.value})}/><Field label="End Odometer" type="number" step="0.1" value={form.end_odometer} onChange={e=>setForm({...form,end_odometer:e.target.value})}/><Field label="Miles" type="number" step="0.1" value={form.miles} onChange={e=>setForm({...form,miles:e.target.value})}/><Field label="Rate / mile" type="number" step="0.001" value={form.rate_per_mile} onChange={e=>setForm({...form,rate_per_mile:e.target.value})}/></div><button className="primary">Save Mileage</button></form><div className="panel"><h3>Mileage</h3><div className="table-wrap"><table><thead><tr><th>Date</th><th>From</th><th>To</th><th>Purpose</th><th>Miles</th><th>Rate</th><th>Deduction</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.trip_date}</td><td>{r.start_location}</td><td>{r.end_location}</td><td>{r.purpose}</td><td>{r.miles}</td><td>{money(r.rate_per_mile,currency)}</td><td>{money(r.deduction_amount,currency)}</td></tr>)}</tbody></table></div></div></>;
}

function CloudReconcile({workspace,userId}){
 const currency=workspace.country==='CA'?'CAD':'USD'; const [bank,setBank]=useState([]),[expenses,setExpenses]=useState([]),[recs,setRecs]=useState([]),[message,setMessage]=useState('');
 async function load(){const [b,e,r]=await Promise.all([listCloudBankTransactions(),listCloudExpenses(),listCloudReconciliations()]);setBank(b);setExpenses(e);setRecs(r);} useEffect(()=>{void load();},[]);
 const pending=recs.filter(r=>r.match_status==='ready_for_review');
 const unmatched=bank.filter(b=>b.reconciliation_status!=='matched'&&!recs.some(r=>r.bank_transaction_id===b.id));
 function bestExpense(b){return expenses.filter(e=>!e.reconciled&&Math.abs(Number(e.total_amount)-Math.abs(Number(b.amount)))<0.005).sort((a,z)=>Math.abs(new Date(a.expense_date)-new Date(b.transaction_date))-Math.abs(new Date(z.expense_date)-new Date(b.transaction_date)))[0];}
 async function propose(b){const e=bestExpense(b);if(!e)return setMessage('No exact-amount unreconciled expense found.');try{await createCandidateMatch(workspace.organizationId,b.id,e.id,1);setMessage('Candidate match created and is ready for approval.');await load();}catch(err){setMessage(String(err));}}
 async function approve(r){try{await approveCandidateMatch(r,userId);setMessage('Match approved and reconciled.');await load();}catch(err){setMessage(String(err));}}
 return <><Notice>{message}</Notice><div className="panel"><h3>Ready for Approval</h3>{pending.length===0?<p className="muted">No candidate matches waiting for approval.</p>:<div className="table-wrap"><table><thead><tr><th>Bank</th><th>Amount</th><th>Expense</th><th>Confidence</th><th></th></tr></thead><tbody>{pending.map(r=><tr key={r.id}><td>{r.bank_transactions?.merchant||r.bank_transactions?.description}</td><td>{money(r.bank_transactions?.amount,currency)}</td><td>{r.expenses?.vendor} {money(r.expenses?.total_amount,currency)}</td><td>{Math.round(Number(r.match_confidence||0)*100)}%</td><td><button className="primary" onClick={()=>approve(r)}>Approve & Reconcile</button></td></tr>)}</tbody></table></div>}</div><div className="panel"><h3>Unmatched Bank Transactions</h3><div className="table-wrap"><table><thead><tr><th>Date</th><th>Merchant</th><th>Amount</th><th>Suggested Exact Match</th><th></th></tr></thead><tbody>{unmatched.map(b=>{const e=bestExpense(b);return <tr key={b.id}><td>{b.transaction_date}</td><td>{b.merchant||b.description}</td><td>{money(b.amount,currency)}</td><td>{e?`${e.vendor||'Expense'} • ${money(e.total_amount,currency)}`:'None'}</td><td>{e&&<button onClick={()=>propose(b)}>Create Match</button>}</td></tr>})}</tbody></table></div></div></>;
}

function CloudReports({workspace}){
 const currency=workspace.country==='CA'?'CAD':'USD'; const [expenses,setExpenses]=useState([]),[revenue,setRevenue]=useState([]); useEffect(()=>{Promise.all([listCloudExpenses(),listCloudRevenue()]).then(([e,r])=>{setExpenses(e);setRevenue(r)}).catch(()=>{});},[]);
 const income=revenue.reduce((s,r)=>s+Number(r.revenue_amount||0),0); const collectedTax=revenue.reduce((s,r)=>s+Number(r.tax_collected||0),0); const expenseBase=expenses.reduce((s,e)=>s+Number(e.subtotal||0)+Number(e.tip_amount||0),0); const taxPaid=expenses.reduce((s,e)=>s+Number(e.tax_amount||0),0);
 return <div className="panel"><h3>Bookkeeping Summary</h3><p className="muted">Tax is shown separately. Country-specific recoverability/deductibility rules will be applied by the tax rules layer rather than hard-coded into expense categories.</p><div className="table-wrap"><table><tbody><tr><th>Revenue before collected tax</th><td>{money(income,currency)}</td></tr><tr><th>Tax collected</th><td>{money(collectedTax,currency)}</td></tr><tr><th>Expense subtotal + tips</th><td>{money(expenseBase,currency)}</td></tr><tr><th>Tax paid on expenses</th><td>{money(taxPaid,currency)}</td></tr><tr><th>Operating result before country-specific tax treatment</th><td>{money(income-expenseBase,currency)}</td></tr></tbody></table></div></div>;
}

function CloudInvoices(){const [rows,setRows]=useState([]);useEffect(()=>{listCloudInvoices().then(setRows).catch(()=>{});},[]);return <div className="panel"><h3>Invoices</h3><p className="muted">The SaaS invoice list is connected to Supabase. Full invoice creation/PDF workflow will be migrated from the demo after the signup/private-workspace deployment is validated.</p><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.invoice_number}</td><td>{r.invoice_date}</td><td>{r.status}</td><td>{r.total_amount}</td></tr>)}</tbody></table></div></div>}
