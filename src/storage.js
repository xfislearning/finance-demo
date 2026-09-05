import { safeFilename } from "./utils";
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},100)}
export async function attachReceipt(expenseId,date){
 return new Promise(resolve=>{const i=document.createElement('input');i.type='file';i.accept='.pdf,.png,.jpg,.jpeg,.webp';i.onchange=()=>{const f=i.files?.[0];resolve(f?`demo-receipt://${safeFilename(expenseId)}/${f.name}`:null)};i.click()})
}
export async function saveBytesWithDialog(bytes,suggestedName){downloadBlob(new Blob([bytes]),suggestedName);return true}
export async function saveTextWithDialog(text,suggestedName){downloadBlob(new Blob([text],{type:'text/plain;charset=utf-8'}),suggestedName);return true}
export async function openBytesWithDialog({extensions=['xlsx']}={}){return new Promise(resolve=>{const i=document.createElement('input');i.type='file';i.accept=extensions.map(x=>'.'+x).join(',');i.onchange=async()=>{const f=i.files?.[0];if(!f)return resolve(null);resolve({path:f.name,fileName:f.name,bytes:new Uint8Array(await f.arrayBuffer())})};i.click()})}
