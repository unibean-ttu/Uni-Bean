export const $=id=>document.getElementById(id);
export function el(tag,cls='',value=''){const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined&&value!==null)x.textContent=String(value);return x;}
export function getStored(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
export function setStored(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
export function safeLink(raw){try{const url=new URL(String(raw));if(url.protocol==='https:'||url.protocol==='http:')return url.href}catch{}return null}
let toastTimer;
export function toast(text){const box=$('toast');box.textContent=String(text);box.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{box.hidden=true},3200)}
export function getRoleId(){return getStored('unibean_reference_role_v1',null)||'student'}
export function openDialog(id){const dialog=$(id);if(!dialog)return;try{if(!dialog.open)dialog.showModal()}catch{dialog.setAttribute('open','')}}
export function closeDialog(id){const dialog=$(id);if(!dialog)return;try{dialog.close()}catch{dialog.removeAttribute('open')}}
