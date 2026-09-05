const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
if (!SERVICE_ROLE) throw new Error('Missing SUPABASE_SECRET_KEY for account-signup function.');
const CAPTCHA_SECRET = Deno.env.get('CAPTCHA_SECRET')!;
const GOOGLE_SIGNUP_WEBHOOK_URL = Deno.env.get('GOOGLE_SIGNUP_WEBHOOK_URL') || '';

const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Content-Type':'application/json' };
const enc = new TextEncoder();
function b64url(bytes: Uint8Array){ return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=',''); }
function fromB64url(s:string){ s=s.replaceAll('-','+').replaceAll('_','/'); while(s.length%4)s+='='; return Uint8Array.from(atob(s),c=>c.charCodeAt(0)); }
async function hmac(text:string){ const key=await crypto.subtle.importKey('raw',enc.encode(CAPTCHA_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(text))); }
async function signedChallenge(answer:number){ const payload=b64url(enc.encode(JSON.stringify({a:answer,exp:Date.now()+5*60_000,nonce:crypto.randomUUID()}))); const sig=b64url(await hmac(payload)); return `${payload}.${sig}`; }
async function verifyChallenge(token:string, answer:string){ try{ const [payload,sig]=token.split('.'); if(!payload||!sig)return false; const expected=b64url(await hmac(payload)); if(expected!==sig)return false; const obj=JSON.parse(new TextDecoder().decode(fromB64url(payload))); return Date.now()<=obj.exp && String(obj.a)===String(answer).trim(); }catch{return false;} }
async function sha256(text:string){ const digest=await crypto.subtle.digest('SHA-256',enc.encode(text)); return b64url(new Uint8Array(digest)); }
async function admin(path:string, opts:RequestInit={}){ const r=await fetch(`${SUPABASE_URL}${path}`,{...opts,headers:{apikey:SERVICE_ROLE,Authorization:`Bearer ${SERVICE_ROLE}`,'Content-Type':'application/json',Prefer:'return=representation',...(opts.headers||{})}}); const t=await r.text(); const d=t?JSON.parse(t):null; if(!r.ok)throw new Error(d?.msg||d?.message||d?.error_description||'Supabase admin request failed'); return d; }

Deno.serve(async (req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const body=await req.json();
    if(body.action==='challenge'){
      const x=crypto.getRandomValues(new Uint32Array(1))[0]%8+2;
      const y=crypto.getRandomValues(new Uint32Array(1))[0]%7+1;
      return new Response(JSON.stringify({question:`What is ${x} + ${y}?`,challenge_id:await signedChallenge(x+y)}),{headers:cors});
    }
    if(body.action!=='signup')throw new Error('Invalid action.');
    if(String(body.website||'').trim()) throw new Error('Signup verification failed.');
    const forwarded=req.headers.get('x-forwarded-for')||req.headers.get('cf-connecting-ip')||'unknown';
    const ip=forwarded.split(',')[0].trim();
    const identifier=await sha256(`${CAPTCHA_SECRET}:${ip}`);
    const cutoff=new Date(Date.now()-10*60_000).toISOString();
    const recent=await admin(`/rest/v1/signup_attempts?identifier_hash=eq.${encodeURIComponent(identifier)}&created_at=gte.${encodeURIComponent(cutoff)}&select=id`,{method:'GET'});
    if(Array.isArray(recent)&&recent.length>=5) throw new Error('Too many signup attempts. Please try again later.');
    await admin('/rest/v1/signup_attempts',{method:'POST',body:JSON.stringify({identifier_hash:identifier})});
    if(!(await verifyChallenge(String(body.challenge_id||''),String(body.challenge_answer||''))))throw new Error('Human verification answer is incorrect or expired.');
    const first=String(body.first_name||'').trim(), last=String(body.last_name||'').trim(), company=String(body.company_name||'').trim(), email=String(body.email||'').trim().toLowerCase(), password=String(body.password||''), country=String(body.country_code||'US');
    if(!first||!last||!company||!email||password.length<8)throw new Error('Complete all fields. Password must be at least 8 characters.');
    if(!['US','CA'].includes(country))throw new Error('Choose United States or Canada.');
    const created=await admin('/auth/v1/admin/users',{method:'POST',body:JSON.stringify({email,password,email_confirm:true,user_metadata:{first_name:first,last_name:last,company_name:company,country_code:country}})});
    const uid=created.id;
    try{
      await admin('/rest/v1/user_profiles',{method:'POST',body:JSON.stringify({user_id:uid,first_name:first,last_name:last,email})});
      const orgs=await admin('/rest/v1/organizations',{method:'POST',body:JSON.stringify({company_name:company,country_code:country})});
      const org=Array.isArray(orgs)?orgs[0]:orgs;
      await admin('/rest/v1/organization_members',{method:'POST',body:JSON.stringify({organization_id:org.id,user_id:uid,role:'owner'})});
      if(GOOGLE_SIGNUP_WEBHOOK_URL){ try{ await fetch(GOOGLE_SIGNUP_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({created_at:new Date().toISOString(),first_name:first,last_name:last,company_name:company,email,country,status:'Active'})}); }catch{} }
      return new Response(JSON.stringify({ok:true}),{headers:cors});
    }catch(e){ await admin(`/auth/v1/admin/users/${uid}`,{method:'DELETE'}).catch(()=>{}); throw e; }
  }catch(e){ return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:400,headers:cors}); }
});
