/** Local-only full conversation archive. No uploads / identity association. */
import {getStored,setStored} from './utils.js';
import {HISTORY_STORAGE} from './data.js';
const KEY='ub_v11_conversations';
const ACTIVE='ub_v11_active_conversation';
function uid(){return globalThis.crypto?.randomUUID?.() || 'chat-'+Date.now()+'-'+Math.random().toString(36).slice(2)}
export function allConversations(){
 const value=getStored(KEY,[]);
 return Array.isArray(value)?value.filter(v=>v&&typeof v.id==='string'&&Array.isArray(v.turns)):[];
}
function persist(rows){
 if(!setStored(KEY,rows.slice(0,35))){document.dispatchEvent(new Event('ub:storage-failed'));return false}
 document.dispatchEvent(new Event('ub:storage'));return true
}
export function migrateLegacy(){
 if(getStored('ub_v11_migrated',false))return;
 const old=getStored(HISTORY_STORAGE,[]);
 if(!allConversations().length && Array.isArray(old)){
  const rows=old.filter(r=>r?.question&&r?.answer).slice(0,25).map(r=>({id:uid(),title:r.question,createdAt:r.at||new Date().toISOString(),updatedAt:r.at||new Date().toISOString(),turns:[{question:r.question,result:{answer:r.answer,mode:r.mode||'retrieval_only',sources:r.sources||[]},at:r.at}]}));
  if(rows.length)persist(rows);
 }
 setStored('ub_v11_migrated',true);
}
export function activeConversation(){return allConversations().find(x=>x.id===getStored(ACTIVE,null))||null}
export function createConversation(){const chat={id:uid(),title:'新對話',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),turns:[]};persist([chat,...allConversations()]);setStored(ACTIVE,chat.id);return chat}
export function selectConversation(id){const convo=allConversations().find(x=>x.id===id);if(convo){setStored(ACTIVE,id);return convo}return null}
export function saveTurn(question,result){
 let rows=allConversations();let convo=activeConversation();if(!convo){convo=createConversation();rows=allConversations()}
 convo.title=convo.turns.length===0?question:convo.title;
 convo.turns.push({id:uid(),question,result:{answer:result.answer,summary:result.summary,key_points:result.key_points,info_card:result.info_card,sources:result.sources||[],mode:result.mode,action:result.action&&['campus_navigation','open_directory','open_calendar','open_announcements'].includes(result.action.type)?{type:result.action.type,origin:String(result.action.origin||'').slice(0,50),query:String(result.action.query||'').slice(0,80)}:undefined,warning:result.warning||'',verification_status:result.verification_status||''},at:new Date().toISOString()});
 convo.turns=convo.turns.slice(-80);convo.updatedAt=new Date().toISOString();const saved=persist([convo,...rows.filter(x=>x.id!==convo.id)]);return saved?{conversationId:convo.id,turnId:convo.turns.at(-1)?.id}:null;
}
export function removeConversations(){setStored(KEY,[]);try{localStorage.removeItem(ACTIVE)}catch{};document.dispatchEvent(new Event('ub:storage'))}

/** Rename and delete are scoped to the selected local conversation. */
export function renameConversation(id,title){
 const rows=allConversations();const chat=rows.find(x=>x.id===id);
 const value=String(title||'').trim().slice(0,65);
 if(!chat||!value)return false;
 chat.title=value;chat.updatedAt=new Date().toISOString();return persist(rows);
}
export function deleteConversation(id){
 const rows=allConversations(),next=rows.filter(x=>x.id!==id);
 if(next.length===rows.length)return false;
 if(getStored(ACTIVE,null)===id){try{localStorage.removeItem(ACTIVE)}catch{}}
 return persist(next);
}
/** Restore a user-exported JSON archive after strict shape / size checks. */
export function importConversations(value){
 if(!value||!Array.isArray(value.conversations)||value.conversations.length>35)throw Error('不是 Uni-Bean 對話備份');
 const clean=value.conversations.map(row=>{
  if(typeof row.id!=='string'||!Array.isArray(row.turns)||row.turns.length>80)throw Error('對話格式不正確');
  return {id:row.id.slice(0,100),title:String(row.title||'對話').slice(0,65),
   createdAt:String(row.createdAt||''),updatedAt:String(row.updatedAt||''),turns:row.turns.map(t=>{
    if(typeof t.question!=='string'||typeof t.result?.answer!=='string')throw Error('回答格式不正確');
    return {id:String(t.id||uid()).slice(0,100),question:t.question.slice(0,500),
     result:{answer:t.result.answer.slice(0,5000),summary:String(t.result.summary||'').slice(0,500),
      key_points:Array.isArray(t.result.key_points)?t.result.key_points.slice(0,5).map(x=>String(x).slice(0,400)):[],
      mode:String(t.result.mode||'retrieval_only').slice(0,40),
      action:t.result.action&&['campus_navigation','open_directory','open_calendar','open_announcements'].includes(t.result.action.type)?{type:t.result.action.type,origin:String(t.result.action.origin||'').slice(0,50),query:String(t.result.action.query||'').slice(0,80)}:undefined,
      sources:Array.isArray(t.result.sources)?t.result.sources.slice(0,7):[],
      warning:String(t.result.warning||'').slice(0,400)},at:String(t.at||'')};})};
 });
 if(!persist(clean))throw Error('本機儲存空間不足');return clean.length;
}
