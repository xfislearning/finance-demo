import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { uuid } from "./utils";

const DB_KEY = "qentro_finance_demo_sqlite_v051";
let dbPromise;
let writeQueue = Promise.resolve();

function toBase64(bytes) {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}
function fromBase64(s) {
  const raw = atob(s); const out = new Uint8Array(raw.length);
  for (let i=0;i<raw.length;i++) out[i]=raw.charCodeAt(i); return out;
}
function persist(db){ try { localStorage.setItem(DB_KEY, toBase64(db.export())); } catch(e){ console.warn("Demo DB persistence failed", e); } }
function rowsFromExec(result){
  if (!result?.length) return [];
  const {columns, values}=result[0];
  return values.map(v=>Object.fromEntries(columns.map((c,i)=>[c,v[i]])));
}

export function resetDemoDatabase(){ localStorage.removeItem(DB_KEY); location.reload(); }

export function getDb() {
  if (!dbPromise) dbPromise=(async()=>{
    const SQL=await initSqlJs({ locateFile: () => sqlWasmUrl });
    const saved=localStorage.getItem(DB_KEY);
    const raw=saved?new SQL.Database(fromBase64(saved)):new SQL.Database();
    const db={
      async select(sql,params=[]){ return rowsFromExec(raw.exec(sql, params)); },
      async execute(sql,params=[]){ raw.run(sql,params); persist(raw); return {rowsAffected: raw.getRowsModified()}; }
    };
    await initialize(db);
    if(!saved) await seedDemo(db);
    persist(raw);
    return db;
  })().catch(e=>{dbPromise=undefined;throw e});
  return dbPromise;
}

async function initialize(db){
 const ddl=[
`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY,name TEXT NOT NULL,contact_name TEXT,email TEXT,phone TEXT,billing_address TEXT,notes TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY,customer_id TEXT,name TEXT NOT NULL,notes TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS expense_categories (id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,active INTEGER NOT NULL DEFAULT 1)`,
`CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY,name TEXT NOT NULL,account_type TEXT NOT NULL,institution TEXT,last4 TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY,invoice_number TEXT NOT NULL UNIQUE,customer_id TEXT NOT NULL,invoice_date TEXT NOT NULL,due_date TEXT,status TEXT NOT NULL,notes TEXT,payment_instructions TEXT,taxable INTEGER NOT NULL DEFAULT 0,tax_rate REAL NOT NULL DEFAULT 0,tax_cents INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS invoice_items (id TEXT PRIMARY KEY,invoice_id TEXT NOT NULL,description TEXT NOT NULL,quantity REAL NOT NULL DEFAULT 1,rate_cents INTEGER NOT NULL DEFAULT 0,amount_cents INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0)`,
`CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY,invoice_id TEXT,customer_id TEXT,payment_date TEXT NOT NULL,amount_cents INTEGER NOT NULL,account_id TEXT,reference TEXT,notes TEXT,created_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY,expense_date TEXT NOT NULL,vendor TEXT,description TEXT,amount_cents INTEGER NOT NULL,category_id TEXT,payment_source TEXT NOT NULL DEFAULT 'business',account_id TEXT,business_purpose TEXT,customer_id TEXT,project_id TEXT,receipt_path TEXT,notes TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,paid_from TEXT,source TEXT DEFAULT 'manual',source_ref TEXT,reconciliation_status TEXT DEFAULT 'reconciled',bank_posted_date TEXT)`,
`CREATE TABLE IF NOT EXISTS mileage_entries (id TEXT PRIMARY KEY,trip_date TEXT NOT NULL,start_location TEXT,destination TEXT,business_purpose TEXT NOT NULL,round_trip INTEGER NOT NULL DEFAULT 0,start_odometer REAL,end_odometer REAL,miles REAL NOT NULL,rate_cents_per_mile INTEGER NOT NULL DEFAULT 0,deduction_cents INTEGER NOT NULL DEFAULT 0,customer_id TEXT,project_id TEXT,notes TEXT,created_at TEXT NOT NULL,source TEXT NOT NULL DEFAULT 'manual',source_ref TEXT,review_status TEXT NOT NULL DEFAULT 'reviewed',started_at TEXT,ended_at TEXT,rate_mills_per_mile INTEGER)`,
`CREATE TABLE IF NOT EXISTS mileage_rates (id TEXT PRIMARY KEY,effective_from TEXT NOT NULL,effective_to TEXT,rate_mills_per_mile INTEGER NOT NULL,label TEXT,created_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS bank_imports (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,file_name TEXT,imported_at TEXT NOT NULL,row_count INTEGER NOT NULL DEFAULT 0)`,
`CREATE TABLE IF NOT EXISTS bank_transactions (id TEXT PRIMARY KEY,import_id TEXT NOT NULL,account_id TEXT NOT NULL,bank_date TEXT NOT NULL,description TEXT NOT NULL,amount_cents INTEGER NOT NULL,external_id TEXT,raw_json TEXT,reconciled INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,normalized_merchant TEXT,suggested_category TEXT,suggested_category_id TEXT,categorization_status TEXT,categorization_confidence REAL,categorization_note TEXT)`,
`CREATE TABLE IF NOT EXISTS reconciliations (id TEXT PRIMARY KEY,bank_transaction_id TEXT NOT NULL UNIQUE,target_type TEXT NOT NULL,target_id TEXT,matched_at TEXT NOT NULL,notes TEXT)`,
`CREATE TABLE IF NOT EXISTS accounting_entries (id TEXT PRIMARY KEY,entry_date TEXT NOT NULL,entry_type TEXT NOT NULL,amount_cents INTEGER NOT NULL,account_name TEXT,description TEXT,notes TEXT,created_at TEXT NOT NULL,source_type TEXT,source_id TEXT)`,
`CREATE TABLE IF NOT EXISTS journal_entries (id TEXT PRIMARY KEY,entry_date TEXT NOT NULL,description TEXT,source_type TEXT,source_id TEXT,created_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS journal_lines (id TEXT PRIMARY KEY,journal_entry_id TEXT NOT NULL,account_code TEXT,account_name TEXT,debit_cents INTEGER NOT NULL DEFAULT 0,credit_cents INTEGER NOT NULL DEFAULT 0)`
 ];
 for(const q of ddl) await db.execute(q);
 const cats=["Coffee / Business Meetings","Business Meals / Lunch","Parking","Tolls","Gas / Fuel","Airfare","Hotel / Lodging","Ground Transportation","Software & Subscriptions","Web, Cloud & Hosting","Computer & Hardware Expense","Computer Equipment","AI / GPU Equipment","Office Equipment","Hardware Upgrades / Components","Advertising & Marketing","Business Cards","Flyers & Brochures","Website / SEO","Office Supplies","Dues & Memberships","Professional Services","Contractors","Insurance","Phone & Internet","Education & Training","Bank & Payment Fees","Taxes & Licenses","Fines & Penalties - Non-deductible","Uncategorized / Needs Review","Bank & Merchant Fees","Chamber / Memberships","Equipment","Legal & Professional","Meals","Software / AI / SaaS","Travel","Utilities / Communications","Other"];
 for(const name of cats) await db.execute("INSERT OR IGNORE INTO expense_categories (id,name,active) VALUES (?,?,1)",[uuid(),name]);
 const defs={company_name:"Qentro Demo LLC",company_email:"demo@qentrotech.com",company_phone:"(555) 010-2026",company_address:"Colorado",company_website:"qentrotech.com",invoice_prefix:"QEN",next_invoice_number:"1007",mileage_rate_cents:"70",payment_instructions:"Demo payment instructions — sample data only."};
 for(const [k,v] of Object.entries(defs)) await db.execute("INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)",[k,v]);
}

async function seedDemo(db){
 const now=new Date().toISOString();
 const customers=[
  ["cust1","Front Range Design","Alex Morgan","alex@example.com","555-0101","Longmont, CO","Demo customer"],
  ["cust2","Mountain Peak Dental","Jamie Lee","jamie@example.com","555-0102","Boulder, CO","Demo customer"],
  ["cust3","Acme Operations","Taylor Smith","taylor@example.com","555-0103","Denver, CO","Demo customer"]
 ];
 for(const c of customers) await db.execute("INSERT INTO customers (id,name,contact_name,email,phone,billing_address,notes,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)",[...c,now,now]);
 await db.execute("INSERT INTO accounts (id,name,account_type,institution,last4,active,created_at) VALUES ('acct1','Business Checking','checking','Demo Bank','1234',1,?)",[now]);
 await db.execute("INSERT INTO accounts (id,name,account_type,institution,last4,active,created_at) VALUES ('acct2','Business Credit Card','credit_card','Demo Bank','5678',1,?)",[now]);
 const catRows=await db.select("SELECT id,name FROM expense_categories"); const cat=Object.fromEntries(catRows.map(x=>[x.name,x.id]));
 const ex=[
 ["e1","2026-08-05","Office Depot","Printer supplies",8642,"Office Supplies","acct2","Business Credit Card","cust1"],
 ["e2","2026-08-12","Ziggi's Coffee","Client discovery meeting",1875,"Coffee / Business Meetings","acct2","Business Credit Card","cust2"],
 ["e3","2026-08-19","Namecheap","Domain and web services",2398,"Web, Cloud & Hosting","acct1","Business Checking",null],
 ["e4","2026-08-23","FedEx Office","Marketing handouts",6430,"Advertising & Marketing","acct2","Business Credit Card",null],
 ["e5","2026-08-28","Downtown Parking","Networking event parking",1400,"Parking","acct2","Business Credit Card",null],
 ["e6","2026-07-10","Longmont Chamber","Annual membership",45000,"Dues & Memberships","acct1","Business Checking",null],
 ["e7","2026-06-18","Software Vendor","AI software subscription",9900,"Software & Subscriptions","acct2","Business Credit Card",null]
 ];
 for(const x of ex) await db.execute(`INSERT INTO expenses (id,expense_date,vendor,description,amount_cents,category_id,payment_source,account_id,business_purpose,customer_id,project_id,receipt_path,notes,created_at,updated_at,paid_from,source,reconciliation_status) VALUES (?,?,?,?,?,?,'business',?, '',?,NULL,NULL,'Demo expense',?,?,?,'manual','reconciled')`,[x[0],x[1],x[2],x[3],x[4],cat[x[5]],x[6],x[8],now,now,x[7]]);
 await db.execute("INSERT INTO mileage_rates (id,effective_from,effective_to,rate_mills_per_mile,label,created_at) VALUES ('rate1','2026-01-01',NULL,700,'2026 Demo Rate',?)",[now]);
 const miles=[["m1","2026-08-07","Berthoud","Longmont","Client discovery meeting",1,24.6,"cust1"],["m2","2026-08-14","Berthoud","Denver","Chamber networking",1,92.4,null],["m3","2026-08-26","Berthoud","Boulder","Coffee meeting",1,60.2,"cust2"]];
 for(const m of miles) await db.execute(`INSERT INTO mileage_entries (id,trip_date,start_location,destination,business_purpose,round_trip,miles,rate_cents_per_mile,deduction_cents,customer_id,notes,created_at,source,review_status,rate_mills_per_mile) VALUES (?,?,?,?,?,?,?,70,?,?, 'Demo mileage',?,'manual','reviewed',700)`,[m[0],m[1],m[2],m[3],m[4],m[5],m[6],Math.round(m[6]*70),m[7],now]);
 const inv=[["inv1","QEN-1004","cust1","2026-08-22","2026-09-21","Paid"],["inv2","QEN-1005","cust2","2026-08-29","2026-09-28","Sent"],["inv3","QEN-1006","cust3","2026-09-01","2026-10-01","Draft"]];
 for(const i of inv) await db.execute("INSERT INTO invoices (id,invoice_number,customer_id,invoice_date,due_date,status,notes,payment_instructions,taxable,tax_rate,tax_cents,created_at,updated_at) VALUES (?,?,?,?,?,?, 'Demo invoice','Demo only',0,0,0,?,?)",[...i,now,now]);
 const items=[["ii1","inv1","AI workflow assessment",1,180000],["ii2","inv2","Private AI discovery workshop",1,250000],["ii3","inv3","Automation pilot",1,320000]];
 for(const i of items) await db.execute("INSERT INTO invoice_items (id,invoice_id,description,quantity,rate_cents,amount_cents,sort_order) VALUES (?,?,?,?,?,?,0)",[i[0],i[1],i[2],i[3],i[4],i[4]]);
 await db.execute("INSERT INTO payments (id,invoice_id,customer_id,payment_date,amount_cents,account_id,reference,notes,created_at) VALUES ('pay1','inv1','cust1','2026-08-30',180000,'acct1','DEMO-PAY','Demo payment',?)",[now]);
 await db.execute("INSERT INTO bank_imports (id,account_id,file_name,imported_at,row_count) VALUES ('bi1','acct1','demo-bank.csv',?,5)",[now]);
 const bt=[["b1","2026-08-05","OFFICE DEPOT #128",-8642,1],["b2","2026-08-12","ZIGGIS COFFEE",-1875,1],["b3","2026-08-25","BANK ACCOUNT BONUS",40000,0],["b4","2026-08-28","DOWNTOWN PARKING",-1400,0],["b5","2026-08-30","FRONT RANGE DESIGN",180000,0]];
 for(const b of bt) await db.execute("INSERT INTO bank_transactions (id,import_id,account_id,bank_date,description,amount_cents,reconciled,created_at,categorization_status) VALUES (?,'bi1','acct1',?,?,?,?,? )",[b[0],b[1],b[2],b[3],b[4],now,b[4]?"reconciled":"Needs Review"]);
}

export async function select(sql,params=[]){const db=await getDb();return db.select(sql,params)}
export async function execute(sql,params=[]){const op=async()=>{const db=await getDb();return db.execute(sql,params)};const r=writeQueue.then(op,op);writeQueue=r.catch(()=>undefined);return r}
export async function getSettings(){const rows=await select("SELECT key,value FROM settings");return Object.fromEntries(rows.map(r=>[r.key,r.value]))}
export async function saveSettings(values){for(const [k,v] of Object.entries(values)) await execute("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[k,String(v??"")])}
