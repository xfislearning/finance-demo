import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { uuid } from "./utils";

const DB_KEY = "qentro_finance_demo_sqlite_v083_sanitized";
let dbPromise;
let writeQueue = Promise.resolve();
let workspaceContext = { mode: "demo", organizationId: null, companyName: "Qentro Demo LLC", country: "US" };

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
function rowsFromExec(result){
  if (!result?.length) return [];
  const {columns, values}=result[0];
  return values.map(v=>Object.fromEntries(columns.map((c,i)=>[c,v[i]])));
}

async function loadPersistedDatabase() {
  if (workspaceContext.mode !== "demo") return null;
  return localStorage.getItem(DB_KEY);
}

async function persist(raw) {
  if (workspaceContext.mode !== "demo") return;
  const blob = toBase64(raw.export());
  try { localStorage.setItem(DB_KEY, blob); } catch(e) { console.warn("Demo DB persistence failed", e); }
}

export function configureDatabaseWorkspace(context) {
  workspaceContext = { ...workspaceContext, ...context };
  dbPromise = undefined;
  writeQueue = Promise.resolve();
}

export function getDatabaseWorkspace() { return { ...workspaceContext }; }

export function resetDemoDatabase(){
  if (workspaceContext.mode === "demo") localStorage.removeItem(DB_KEY);
  location.reload();
}

export function getDb() {
  if (!dbPromise) dbPromise=(async()=>{
    const SQL=await initSqlJs({ locateFile: () => sqlWasmUrl });
    const saved=await loadPersistedDatabase();
    const raw=saved?new SQL.Database(fromBase64(saved)):new SQL.Database();
    let initialized=false;
    const db={
      async select(sql,params=[]){ return rowsFromExec(raw.exec(sql, params)); },
      async execute(sql,params=[]){ raw.run(sql,params); if(initialized) await persist(raw); return {rowsAffected: raw.getRowsModified()}; }
    };
    await initialize(db);
    if(!saved && workspaceContext.mode === "demo") await seedDemo(db);
    if(!saved && workspaceContext.mode === "cloud") {
      await db.execute("INSERT INTO settings (key,value) VALUES ('company_name',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[workspaceContext.companyName || "My Company"]);
      await db.execute("INSERT INTO settings (key,value) VALUES ('country_code',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[workspaceContext.country || "US"]);
      await db.execute("INSERT INTO settings (key,value) VALUES ('company_email','') ON CONFLICT(key) DO NOTHING");
      await db.execute("INSERT INTO settings (key,value) VALUES ('company_phone','') ON CONFLICT(key) DO NOTHING");
      await db.execute("INSERT INTO settings (key,value) VALUES ('company_address','') ON CONFLICT(key) DO NOTHING");
      await db.execute("INSERT INTO settings (key,value) VALUES ('company_website','') ON CONFLICT(key) DO NOTHING");
      await db.execute("INSERT INTO settings (key,value) VALUES ('invoice_prefix','INV') ON CONFLICT(key) DO NOTHING");
      await db.execute("INSERT INTO settings (key,value) VALUES ('next_invoice_number','1001') ON CONFLICT(key) DO NOTHING");
      await db.execute("INSERT INTO settings (key,value) VALUES ('payment_instructions','') ON CONFLICT(key) DO NOTHING");
    }
    initialized=true;
    await persist(raw);
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
`CREATE TABLE IF NOT EXISTS reconciliations (id TEXT PRIMARY KEY,bank_transaction_id TEXT NOT NULL UNIQUE,target_type TEXT NOT NULL,target_id TEXT,reconciled_at TEXT NOT NULL,note TEXT)`,
`CREATE TABLE IF NOT EXISTS accounting_entries (id TEXT PRIMARY KEY,entry_date TEXT NOT NULL,entry_type TEXT NOT NULL,amount_cents INTEGER NOT NULL,account_id TEXT,reference_name TEXT,description TEXT NOT NULL,notes TEXT,created_at TEXT NOT NULL,source_type TEXT,source_id TEXT)`,
`CREATE TABLE IF NOT EXISTS journal_entries (id TEXT PRIMARY KEY,entry_date TEXT NOT NULL,description TEXT,source_type TEXT,source_id TEXT,status TEXT NOT NULL DEFAULT 'posted',posted_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS journal_lines (id TEXT PRIMARY KEY,journal_entry_id TEXT NOT NULL,account_code TEXT,account_name TEXT,debit_cents INTEGER NOT NULL DEFAULT 0,credit_cents INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0)`
 ];
 for(const q of ddl) await db.execute(q);
 const cats=["Coffee / Business Meetings","Business Meals / Lunch","Parking","Tolls","Gas / Fuel","Airfare","Hotel / Lodging","Ground Transportation","Software & Subscriptions","Web, Cloud & Hosting","Computer & Hardware Expense","Computer Equipment","AI / GPU Equipment","Office Equipment","Hardware Upgrades / Components","Advertising & Marketing","Business Cards","Flyers & Brochures","Website / SEO","Office Supplies","Dues & Memberships","Professional Services","Contractors","Insurance","Phone & Internet","Education & Training","Bank & Payment Fees","Taxes & Licenses","Fines & Penalties - Non-deductible","Uncategorized / Needs Review","Bank & Merchant Fees","Chamber / Memberships","Equipment","Legal & Professional","Meals","Software / AI / SaaS","Travel","Utilities / Communications","Other"];
 for(const name of cats) await db.execute("INSERT OR IGNORE INTO expense_categories (id,name,active) VALUES (?,?,1)",[uuid(),name]);
 const defs={company_name:"Demo Business LLC",company_email:"demo@example.com",company_phone:"(555) 010-2000",company_address:"100 Example Avenue, Demo City, CO 80000",company_website:"example.com",invoice_prefix:"DEM",next_invoice_number:"1004",mileage_rate_cents:"70",payment_instructions:"Demo payment instructions — fictional sample data only."};
 for(const [k,v] of Object.entries(defs)) await db.execute("INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)",[k,v]);
}

async function seedDemo(db){
 const now=new Date().toISOString();
 const customers=[
  ["cust1","Example Design Studio","Alex Morgan","alex@example.com","555-0101","200 Example Street, Demo City, CO 80000","Fictional demo customer"],
  ["cust2","Sample Dental Group","Jamie Lee","jamie@example.com","555-0102","300 Sample Road, Demo City, CO 80000","Fictional demo customer"],
  ["cust3","Demo Operations Inc.","Taylor Smith","taylor@example.com","555-0103","400 Test Boulevard, Demo City, CO 80000","Fictional demo customer"]
 ];
 for(const c of customers) await db.execute("INSERT INTO customers (id,name,contact_name,email,phone,billing_address,notes,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)",[...c,now,now]);
 await db.execute("INSERT INTO accounts (id,name,account_type,institution,last4,active,created_at) VALUES ('acct1','Business Checking','checking','Example Bank','1234',1,?)",[now]);
 await db.execute("INSERT INTO accounts (id,name,account_type,institution,last4,active,created_at) VALUES ('acct2','Business Credit Card','credit_card','Example Bank','5678',1,?)",[now]);
 const catRows=await db.select("SELECT id,name FROM expense_categories"); const cat=Object.fromEntries(catRows.map(x=>[x.name,x.id]));
 const ex=[
 ["e1","2026-08-05","Demo Office Supply","Printer supplies",8642,"Office Supplies","acct2","Business Credit Card","cust1"],
 ["e2","2026-08-12","Demo Coffee Shop","Customer meeting",1875,"Coffee / Business Meetings","acct2","Business Credit Card","cust2"],
 ["e3","2026-08-19","Demo Hosting Co.","Website hosting",2398,"Web, Cloud & Hosting","acct1","Business Checking",null],
 ["e4","2026-08-23","Demo Print Shop","Marketing handouts",6430,"Advertising & Marketing","acct2","Business Credit Card",null],
 ["e5","2026-08-28","Demo Parking Garage","Business event parking",1400,"Parking","acct2","Business Credit Card",null],
 ["e6","2026-07-10","Demo Business Association","Annual membership",45000,"Dues & Memberships","acct1","Business Checking",null],
 ["e7","2026-06-18","Demo Software Co.","Software subscription",9900,"Software & Subscriptions","acct2","Business Credit Card",null]
 ];
 for(const x of ex) await db.execute(`INSERT INTO expenses (id,expense_date,vendor,description,amount_cents,category_id,payment_source,account_id,business_purpose,customer_id,project_id,receipt_path,notes,created_at,updated_at,paid_from,source,reconciliation_status) VALUES (?,?,?,?,?,?,'business',?, '',?,NULL,NULL,'Fictional demo expense',?,?,?,'manual','reconciled')`,[x[0],x[1],x[2],x[3],x[4],cat[x[5]],x[6],x[8],now,now,x[7]]);
 await db.execute("INSERT INTO mileage_rates (id,effective_from,effective_to,rate_mills_per_mile,label,created_at) VALUES ('rate1','2026-01-01',NULL,700,'2026 Demo Rate',?)",[now]);
 const miles=[["m1","2026-08-07","100 Example Ave","200 Sample St","Customer meeting",1,24.6,"cust1"],["m2","2026-08-14","100 Example Ave","500 Test Rd","Business event",1,92.4,null],["m3","2026-08-26","100 Example Ave","300 Sample Rd","Customer meeting",1,60.2,"cust2"]];
 for(const m of miles) await db.execute(`INSERT INTO mileage_entries (id,trip_date,start_location,destination,business_purpose,round_trip,miles,rate_cents_per_mile,deduction_cents,customer_id,notes,created_at,source,review_status,rate_mills_per_mile) VALUES (?,?,?,?,?,?,?,70,?,?, 'Fictional demo mileage',?,'manual','reviewed',700)`,[m[0],m[1],m[2],m[3],m[4],m[5],m[6],Math.round(m[6]*70),m[7],now]);
 const inv=[["inv1","DEM-1001","cust1","2026-08-22","2026-09-21","Paid"],["inv2","DEM-1002","cust2","2026-08-29","2026-09-28","Sent"],["inv3","DEM-1003","cust3","2026-09-01","2026-10-01","Draft"]];
 for(const i of inv) await db.execute("INSERT INTO invoices (id,invoice_number,customer_id,invoice_date,due_date,status,notes,payment_instructions,taxable,tax_rate,tax_cents,created_at,updated_at) VALUES (?,?,?,?,?,?, 'Fictional demo invoice','Demo only',0,0,0,?,?)",[...i,now,now]);
 const items=[["ii1","inv1","Consulting service",1,180000],["ii2","inv2","Operations workshop",1,250000],["ii3","inv3","Automation setup",1,320000]];
 for(const i of items) await db.execute("INSERT INTO invoice_items (id,invoice_id,description,quantity,rate_cents,amount_cents,sort_order) VALUES (?,?,?,?,?,?,0)",[i[0],i[1],i[2],i[3],i[4],i[4]]);
 await db.execute("INSERT INTO payments (id,invoice_id,customer_id,payment_date,amount_cents,account_id,reference,notes,created_at) VALUES ('pay1','inv1','cust1','2026-08-30',180000,'acct1','DEMO-PAY','Fictional demo payment',?)",[now]);
 await db.execute(`INSERT INTO accounting_entries (id,entry_date,entry_type,amount_cents,account_id,reference_name,description,notes,created_at,source_type,source_id) VALUES ('ae-owner','2026-06-15','owner_contribution',500000,'acct1','Owner Contribution','Initial demo funding','Fictional demo balance-sheet activity',?,'demo','owner')`,[now]);
 await db.execute(`INSERT INTO accounting_entries (id,entry_date,entry_type,amount_cents,account_id,reference_name,description,notes,created_at,source_type,source_id) VALUES ('ae-asset','2026-07-02','asset_purchase',120000,'acct1','Computer Equipment','Demo computer equipment','Fictional demo fixed asset purchase',?,'demo','asset')`,[now]);
 await db.execute(`INSERT INTO accounting_entries (id,entry_date,entry_type,amount_cents,account_id,reference_name,description,notes,created_at,source_type,source_id) VALUES ('ae-bonus','2026-08-25','other_income',40000,'acct1','Bank Bonus / Interest Income','Demo bank account bonus','Fictional demo other income',?,'demo','bonus')`,[now]);
 await db.execute("INSERT INTO bank_imports (id,account_id,file_name,imported_at,row_count) VALUES ('bi1','acct1','fictional-demo-bank.csv',?,5)",[now]);
 const bt=[["b1","2026-08-05","DEMO OFFICE SUPPLY",-8642,1],["b2","2026-08-12","DEMO COFFEE SHOP",-1875,1],["b3","2026-08-25","DEMO BANK BONUS",40000,0],["b4","2026-08-28","DEMO PARKING GARAGE",-1400,0],["b5","2026-08-30","EXAMPLE DESIGN STUDIO",180000,0]];
 for(const b of bt) await db.execute("INSERT INTO bank_transactions (id,import_id,account_id,bank_date,description,amount_cents,reconciled,created_at,categorization_status) VALUES (?,'bi1','acct1',?,?,?,?,?,?)",[b[0],b[1],b[2],b[3],b[4],now,b[4]?"reconciled":"Needs Review"]);
}

export async function select(sql,params=[]){const db=await getDb();return db.select(sql,params)}
export async function execute(sql,params=[]){const op=async()=>{const db=await getDb();return db.execute(sql,params)};const r=writeQueue.then(op,op);writeQueue=r.catch(()=>undefined);return r}
export async function getSettings(){const rows=await select("SELECT key,value FROM settings");return Object.fromEntries(rows.map(r=>[r.key,r.value]))}
export async function saveSettings(values){for(const [k,v] of Object.entries(values)) await execute("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[k,String(v??"")])}
