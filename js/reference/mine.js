/** v11.2 student-only local history, favorites, explicit backup and restore. */
import {HISTORY_STORAGE,FAVORITES_STORAGE,ROLES} from './data.js';
import {studentT,markStudentText} from './student-i18n-v11-2.js';
import {allConversations,removeConversations,renameConversation,deleteConversation,importConversations} from './conversations-v11.js';
import {$,el,getStored,setStored,getRoleId,toast} from './utils.js';
let historyQuery='';
function saveFile(name,contents,type){
 const blob=new Blob([contents],{type});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download=name;
 a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function recordNode(record,type){
 const box=el('article','record ub12-record');
 const title=el('strong','',record.question||record.title||'提問紀錄');box.append(title);
 const date=record.updatedAt||record.at||record.createdAt;
 box.append(el('small','',date?new Date(date).toLocaleString(localStorage.getItem('ub_v11_lang')||'zh-TW'):'本機紀錄'));
 if(type==='history')box.append(el('small','',`${record.turns?.length||0} 則問答`));
 const actions=el('div','ub12-record-actions');
 const open=markStudentText(el('button','secondary-btn'),type==='fav'?'查看收藏回答':'恢復完整對話');open.type='button';
 open.addEventListener('click',()=>{
  document.dispatchEvent(new CustomEvent(type==='fav'?'ub:open-saved':'ub:open-thread',{detail:type==='fav'?{record}:{id:record.id}}));
  document.querySelector('[data-tab="chat"]')?.click();
 });actions.append(open);
 if(type==='history'){
  const rename=markStudentText(el('button','secondary-btn'),'重新命名');rename.type='button';
  rename.addEventListener('click',()=>{
   if(box.querySelector('.ub12-rename-form'))return;
   const form=el('form','ub12-rename-form');const input=el('input');input.type='text';input.value=record.title||'';input.maxLength=65;input.required=true;input.setAttribute('aria-label','對話名稱');
   const confirm=markStudentText(el('button','secondary-btn'),'儲存名稱');confirm.type='submit';const cancel=markStudentText(el('button','secondary-btn'),'取消');cancel.type='button';
   cancel.addEventListener('click',()=>form.remove());
   form.addEventListener('submit',e=>{e.preventDefault();if(renameConversation(record.id,input.value)){toast('對話已重新命名');refreshMine()}else toast('名稱不能空白')});
   form.append(input,confirm,cancel);box.append(form);input.focus();input.select();
  });actions.append(rename);
 }
 const remove=markStudentText(el('button','secondary-btn ub12-danger'),type==='fav'?'取消收藏':'刪除對話');remove.type='button';
 let confirming=false;
 remove.addEventListener('click',()=>{
  if(type==='fav'){
   const rows=getStored(FAVORITES_STORAGE,[]);
   const next=rows.filter(x=>!(x.question===record.question&&x.answer===record.answer));
   setStored(FAVORITES_STORAGE,next);refreshMine();toast('已取消收藏');return;
  }
  if(!confirming){confirming=true;markStudentText(remove,'再按一次確認刪除');remove.setAttribute('aria-label','確認刪除這段對話');return}
  if(deleteConversation(record.id)){refreshMine();toast('已刪除對話')}
 });actions.append(remove);box.append(actions);return box;
}
export function refreshMine(){
 const role=ROLES.find(x=>x.id===getRoleId());$('mine-role').textContent=role?.label||'訪客';
 const history=$('history-list'),favs=$('favorite-list');history.replaceChildren();favs.replaceChildren();
 const list=allConversations();const filtered=list.filter(c=>[c.title,...(c.turns||[]).map(t=>t.question)].join(' ').toLowerCase().includes(historyQuery.toLowerCase()));
 if(!filtered.length)history.append(el('p','muted',historyQuery?'找不到符合條件的對話。':'尚無提問紀錄。'));
 filtered.slice(0,35).forEach(x=>history.append(recordNode(x,'history')));
 const favoriteRows=getStored(FAVORITES_STORAGE,[]);
 if(!Array.isArray(favoriteRows)||!favoriteRows.length)favs.append(el('p','muted','尚未收藏任何回答。'));
 else favoriteRows.slice(0,30).forEach(x=>favs.append(recordNode(x,'fav')));
}
export function initMine(){
 const history=$('history-list');
 if(history){const control=el('div','ub12-library-tools');
  const search=el('input');search.id='ub12-history-search';search.type='search';search.placeholder=studentT('搜尋對話名稱或問題…');search.setAttribute('aria-label','搜尋歷史對話');
  search.addEventListener('input',()=>{historyQuery=search.value.trim();refreshMine()});control.append(search);
  const backup=markStudentText(el('button','secondary-btn'),'備份 JSON');backup.type='button';
  backup.addEventListener('click',()=>{
   saveFile('UniBean_對話備份.json',JSON.stringify({format:'UniBean-local-backup-v12',exportedAt:new Date().toISOString(),conversations:allConversations(),favorites:getStored(FAVORITES_STORAGE,[])},null,2),'application/json;charset=utf-8');toast('已匯出本機對話備份');
  });control.append(backup);
  const choose=el('input');choose.type='file';choose.accept='.json,application/json';choose.className='sr-only';choose.id='ub12-history-import';
  const restore=markStudentText(el('button','secondary-btn'),'還原備份');restore.type='button';restore.addEventListener('click',()=>choose.click());
  choose.addEventListener('change',async()=>{try{
   const file=choose.files?.[0];if(!file)return;if(file.size>2_000_000)throw Error('備份超過 2 MB，請確認檔案來源');
   const data=JSON.parse(await file.text());if(data.format==='UniBean-local-backup-v12'&&Array.isArray(data.favorites)&&data.favorites.length>30)throw Error('收藏數量超過上限');const count=importConversations(data);
   if(data.format==='UniBean-local-backup-v12'&&Array.isArray(data.favorites)){if(data.favorites.length>30)throw Error('收藏數量超過上限');const favorites=data.favorites.map(x=>({question:String(x.question||'').slice(0,500),answer:String(x.answer||'').slice(0,5000),sources:Array.isArray(x.sources)?x.sources.slice(0,7):[],summary:String(x.summary||'').slice(0,500),mode:String(x.mode||'retrieval_only'),at:String(x.at||''),conversationId:x.conversationId||null,turnId:x.turnId||null}));if(!setStored(FAVORITES_STORAGE,favorites))throw Error('收藏資料儲存失敗')}
   refreshMine();toast(`已還原 ${count} 段對話（此瀏覽器）`);
  }catch(e){toast('還原失敗：'+String(e.message).slice(0,75))}finally{choose.value=''}});
  control.append(restore,choose);history.parentElement.insertBefore(control,history);
 }
 refreshMine();document.addEventListener('ub:storage',refreshMine);document.addEventListener('ub:locale-changed',()=>{refreshMine();const input=$('ub12-history-search');if(input)input.placeholder=studentT('搜尋對話名稱或問題…')});
 $('export-history').addEventListener('click',()=>{const records=allConversations();if(!records.length){toast('還沒有可匯出的紀錄');return}
  const content=records.map(x=>`# ${x.title}\n`+x.turns.map(t=>`[${t.at||''}] 問：${t.question}\n答：${t.result?.answer||''}\n`).join('\n')).join('\n');
  saveFile('UniBean_聊天紀錄.txt',content,'text/plain;charset=utf-8');
 });
 $('clear-history').addEventListener('click',()=>{if(!confirm('確定清除此瀏覽器的所有提問紀錄？此操作不可復原。請先備份重要對話。'))return;removeConversations();localStorage.removeItem(HISTORY_STORAGE);refreshMine();toast('已清除本機提問紀錄')});
}
