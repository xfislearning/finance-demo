import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LayoutDashboard, Receipt, Car, FileText, BarChart3, RotateCcw, Plus, X } from 'lucide-react'
import { loadData, saveData, resetData } from './storage'
import './styles.css'

const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

function App() {
  const [page, setPage] = useState('Dashboard')
  const [data, setData] = useState(loadData)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [form, setForm] = useState({date:'2026-09-01',vendor:'',description:'',category:'Office Supplies',paidFrom:'Business Credit Card',amount:''})

  const totals = useMemo(() => {
    const revenue = data.invoices.filter(i => i.status === 'Paid').reduce((s,i)=>s+i.amount,0)
    const open = data.invoices.filter(i => i.status === 'Open').reduce((s,i)=>s+i.amount,0)
    const expenses = data.expenses.reduce((s,e)=>s+Number(e.amount),0)
    const miles = data.mileage.reduce((s,m)=>s+Number(m.miles),0)
    const mileageDeduction = miles * data.company.mileageRate
    return { revenue, open, expenses, miles, mileageDeduction, profit: revenue-expenses-mileageDeduction }
  }, [data])

  const nav = [
    ['Dashboard', LayoutDashboard], ['Expenses', Receipt], ['Mileage', Car], ['Invoices', FileText], ['Reports', BarChart3]
  ]

  function addExpense(e) {
    e.preventDefault()
    const next = {...data, expenses:[...data.expenses, {...form, id:Date.now(), amount:Number(form.amount)||0}]}
    setData(next); saveData(next); setShowAddExpense(false)
    setForm({date:'2026-09-01',vendor:'',description:'',category:'Office Supplies',paidFrom:'Business Credit Card',amount:''})
  }

  function resetDemo() {
    if (confirm('Reset all demo changes back to the sample data?')) setData(resetData())
  }

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brandmark">Q</div><div><b>Qentro Finance</b><span>Local-first bookkeeping</span></div></div>
      <nav>{nav.map(([name,Icon]) => <button className={page===name?'active':''} onClick={()=>setPage(name)} key={name}><Icon size={18}/>{name}</button>)}</nav>
      <div className="sidebottom"><small>Demo v0.1.0</small></div>
    </aside>

    <div className="mobileNav">{nav.map(([name,Icon]) => <button className={page===name?'active':''} onClick={()=>setPage(name)} key={name}><Icon size={18}/><span>{name}</span></button>)}</div>

    <main>
      <div className="demoBanner"><b>DEMO MODE</b><span>Sample data only · Changes stay in this browser</span><button onClick={resetDemo}><RotateCcw size={15}/> Reset Demo Data</button></div>
      <header><div><h1>{page}</h1><p>{page==='Dashboard'?'Year-to-date business overview':'Qentro Finance demonstration'}</p></div>{page==='Expenses'&&<button className="primary" onClick={()=>setShowAddExpense(true)}><Plus size={17}/>Add Expense</button>}</header>

      {page==='Dashboard' && <>
        <section className="cards">
          <Card label="Revenue" value={money(totals.revenue)} sub="Paid invoices"/>
          <Card label="Expenses" value={money(totals.expenses)} sub={`${data.expenses.length} expense records`}/>
          <Card label="Mileage deduction" value={money(totals.mileageDeduction)} sub={`${totals.miles.toFixed(1)} miles × ${money(data.company.mileageRate)}`}/>
          <Card label="Estimated net" value={money(totals.profit)} sub="Demo calculation"/>
        </section>
        <section className="grid2">
          <Panel title="Recent Expenses"><ExpenseTable rows={data.expenses.slice(-4).reverse()} compact/></Panel>
          <Panel title="Invoices"><InvoiceTable rows={data.invoices}/></Panel>
        </section>
      </>}

      {page==='Expenses' && <Panel title="All Expenses"><ExpenseTable rows={data.expenses}/></Panel>}
      {page==='Mileage' && <Panel title="Mileage Log"><MileageTable rows={data.mileage} rate={data.company.mileageRate}/></Panel>}
      {page==='Invoices' && <Panel title="Invoices"><InvoiceTable rows={data.invoices}/></Panel>}
      {page==='Reports' && <>
        <section className="cards">
          <Card label="YTD Revenue" value={money(totals.revenue)}/>
          <Card label="YTD Expenses" value={money(totals.expenses)}/>
          <Card label="Mileage" value={money(totals.mileageDeduction)}/>
          <Card label="Open invoices" value={money(totals.open)}/>
        </section>
        <Panel title="Expense Summary by Category"><CategorySummary expenses={data.expenses}/></Panel>
      </>}

      {showAddExpense && <div className="modalWrap"><div className="modal"><button className="close" onClick={()=>setShowAddExpense(false)}><X/></button><h2>Add Demo Expense</h2><form onSubmit={addExpense}>
        <label>Date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
        <label>Vendor<input required value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}/></label>
        <label>Description<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Office Supplies</option><option>Meals</option><option>Software & Subscriptions</option><option>Advertising & Marketing</option><option>Parking & Tolls</option></select></label>
        <label>Paid From<select value={form.paidFrom} onChange={e=>setForm({...form,paidFrom:e.target.value})}><option>Business Credit Card</option><option>Business Checking</option><option>Personal Credit Card</option><option>Personal Checking</option><option>Cash</option></select></label>
        <label>Amount<input type="number" step="0.01" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
        <button className="primary full" type="submit">Save Demo Expense</button>
      </form></div></div>}
    </main>
  </div>
}

function Card({label,value,sub}) { return <div className="card"><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div> }
function Panel({title,children}) { return <section className="panel"><h2>{title}</h2>{children}</section> }
function ExpenseTable({rows,compact}) { return <div className="tableWrap"><table><thead><tr><th>Date</th><th>Vendor</th>{!compact&&<th>Description</th>}<th>Category</th><th className="num">Amount</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.date}</td><td>{r.vendor}</td>{!compact&&<td>{r.description}</td>}<td>{r.category}</td><td className="num">{money(r.amount)}</td></tr>)}</tbody></table></div> }
function MileageTable({rows,rate}) { return <div className="tableWrap"><table><thead><tr><th>Date</th><th>From</th><th>To</th><th>Purpose</th><th className="num">Miles</th><th className="num">Deduction</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.date}</td><td>{r.from}</td><td>{r.to}</td><td>{r.purpose}</td><td className="num">{r.miles}</td><td className="num">{money(r.miles*rate)}</td></tr>)}</tbody></table></div> }
function InvoiceTable({rows}) { return <div className="tableWrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Status</th><th className="num">Amount</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.id}</td><td>{r.customer}</td><td><span className={'status '+r.status.toLowerCase()}>{r.status}</span></td><td className="num">{money(r.amount)}</td></tr>)}</tbody></table></div> }
function CategorySummary({expenses}) { const items=Object.entries(expenses.reduce((a,e)=>((a[e.category]=(a[e.category]||0)+Number(e.amount)),a),{})).sort((a,b)=>b[1]-a[1]); return <div className="summary">{items.map(([k,v])=><div key={k}><span>{k}</span><b>{money(v)}</b></div>)}</div> }

createRoot(document.getElementById('root')).render(<App />)
