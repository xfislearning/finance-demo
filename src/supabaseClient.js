const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SESSION_KEY = 'qentro_supabase_session_v1';
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
export const SUPPORT_EMAIL = 'contact@qentrotech.com';

function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
function writeSession(session){if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY)}
async function refreshSession(){const session=readSession();if(!session?.refresh_token)return null;const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});if(!res.ok){writeSession(null);return null}const data=await res.json();writeSession(data);return data}
async function apiFetch(path,{method='GET',body,auth=true,headers={},retry=true,rawBody=false}={}){if(!supabaseConfigured)throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in GitHub Actions secrets.');const session=readSession();const h={apikey:SUPABASE_KEY,...headers};if(!rawBody)h['Content-Type']='application/json';if(auth&&session?.access_token)h.Authorization=`Bearer ${session.access_token}`;const res=await fetch(`${SUPABASE_URL}${path}`,{method,headers:h,body:body===undefined?undefined:(rawBody?body:JSON.stringify(body))});let data=null;const text=await res.text();if(text){try{data=JSON.parse(text)}catch{data=text}}if(res.status===401&&auth&&retry&&session?.refresh_token){const refreshed=await refreshSession();if(refreshed)return apiFetch(path,{method,body,auth,headers,retry:false,rawBody})}if(!res.ok){const msg=data?.msg||data?.message||data?.error_description||data?.error||`Request failed (${res.status})`;throw new Error(msg)}return data}
export async function getStoredSession(){return readSession()}
export async function passwordSignIn(email,password){const data=await apiFetch('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email,password}});writeSession(data);return data}
export async function logoutSession(){const session=readSession();if(session?.access_token){try{await apiFetch('/auth/v1/logout',{method:'POST'})}catch{}}writeSession(null)}
export async function invokeFunction(name,body){return apiFetch(`/functions/v1/${name}`,{method:'POST',body,auth:false})}
export async function invokeAuthedFunction(name,body){return apiFetch(`/functions/v1/${name}`,{method:'POST',body,auth:true})}
export async function restSelect(tableAndQuery){return apiFetch(`/rest/v1/${tableAndQuery}`,{headers:{Accept:'application/json'}})}
export async function restUpsert(table,body,onConflict){const query=onConflict?`?on_conflict=${encodeURIComponent(onConflict)}`:'';return apiFetch(`/rest/v1/${table}${query}`,{method:'POST',body,headers:{Prefer:'resolution=merge-duplicates,return=representation'}})}
export async function restInsert(table,body){return apiFetch(`/rest/v1/${table}`,{method:'POST',body,headers:{Prefer:'return=representation'}})}
export async function restUpdate(table,filters,body){return apiFetch(`/rest/v1/${table}?${filters}`,{method:'PATCH',body,headers:{Prefer:'return=representation'}})}
export async function restDelete(table,filters){return apiFetch(`/rest/v1/${table}?${filters}`,{method:'DELETE',headers:{Prefer:'return=representation'}})}
export async function requestPasswordReset(email,redirectTo){return apiFetch(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,{method:'POST',auth:false,body:{email}})}
export async function updateCurrentPassword(password){return apiFetch('/auth/v1/user',{method:'PUT',auth:true,body:{password}})}
export function consumeRecoverySessionFromUrl(){const hash=new URLSearchParams(location.hash.replace(/^#/,''));if(hash.get('type')!=='recovery'||!hash.get('access_token'))return false;writeSession({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token')||'',token_type:hash.get('token_type')||'bearer',expires_in:Number(hash.get('expires_in')||3600)});history.replaceState({},document.title,location.pathname+location.search);return true}
export async function uploadStorageObject(bucket,path,file){return apiFetch(`/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',body:file,rawBody:true,headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'true'}})}
