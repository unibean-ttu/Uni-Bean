/** Uni-Bean Student v5: 六身分、官方公告/已核實行事曆、完整本機對話、收藏。 */
import {apiFetch} from './api.js';
import {renderSavedSession} from './chat.js';

const $ = id => document.getElementById(id);

// Local-only history IDs must work on mobile LAN HTTP as well as HTTPS.
// crypto.randomUUID() is unavailable in some insecure contexts.
function createLocalId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Last resort for local browser history only. Never use this for auth tokens.
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const ROLES = {
  student:{icon:'🎓',name:'在校學生',greet:'同學好，今天需要查詢什麼校務資訊？',desc:'加退選、請假、學分與畢業',depts:['教務處','學務處'],questions:['加退選有哪些申請方式？','請假需要完成哪些手續？','畢業門檻的官方規定在哪裡？']},
  freshman:{icon:'🌱',name:'新生專區',greet:'歡迎加入大同大學！',desc:'入學註冊、宿舍、新生選課',depts:['教務處','學務處'],questions:['新生註冊要準備什麼？','宿舍如何申請？','大一新生選課如何開始？']},
  parent:{icon:'👪',name:'學生家長',greet:'家長您好，想了解學校哪些服務？',desc:'學雜費、宿舍、安全聯絡',depts:['學務處','總務處'],questions:['學雜費繳納資訊在哪裡？','住宿申請與管理資訊？','校安聯絡窗口在哪裡？']},
  alumni:{icon:'🎓',name:'畢業校友',greet:'歡迎校友回來查詢！',desc:'成績單、畢業證明與服務',depts:['教務處'],questions:['歷年成績單如何申請？','畢業證書補發方式？','校友服務聯絡窗口？']},
  staff:{icon:'💼',name:'教職員工',greet:'同仁您好，歡迎使用公開校務資料查詢。',desc:'人事、教務與行政規章',depts:['教務處','總務處'],questions:['教務行政規章如何查詢？','校內表單與辦法入口在哪？','最新行政公告在哪裡？']},
  visitor:{icon:'🏫',name:'一般訪客',greet:'歡迎來到大同大學！',desc:'交通、校園導覽、聯絡方式',depts:['總務處'],questions:['如何搭車到大同大學？','校園地圖在哪裡？','如何聯繫行政單位？']}
};
const SESSION_KEY='unibean_sessions_v5';
const ACTIVE_KEY='unibean_current_session_v5';
const FAV_KEY='unibean_favorites_v5';
function read(key, fallback) {try {let x=JSON.parse(localStorage.getItem(key));return x??fallback;}catch{return fallback;}}
function safeSave(key, value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{window.alert('本機儲存空間不足，請先匯出或刪除部分歷史紀錄。');return false;}}
function el(tag, cls='', text){const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function button(label,action,cls='ub-tool'){const n=el('button',cls,label);n.type='button';n.addEventListener('click',action);return n;}
const valid = Object.keys(ROLES);
let role=localStorage.getItem('unibean_role');if(!valid.includes(role))role='visitor';
let sessions=read(SESSION_KEY,[]);if(!Array.isArray(sessions))sessions=[];
let favoriteIds=read(FAV_KEY,[]);if(!Array.isArray(favoriteIds))favoriteIds=[];
let activeId=localStorage.getItem(ACTIVE_KEY)||'';
function newSession(){const s={id:createLocalId(),role,title:'新對話',created:new Date().toISOString(),turns:[]};sessions.unshift(s);activeId=s.id;localStorage.setItem(ACTIVE_KEY,activeId);persist();return s;}
function current(){return sessions.find(x=>x.id===activeId)||newSession();}
function persist(){sessions=sessions.slice(0,25);sessions.forEach(s=>s.turns=s.turns.slice(-40));safeSave(SESSION_KEY,sessions);safeSave(FAV_KEY,favoriteIds.slice(-150));}
function closeDrawer(){$('ub-drawer')?.setAttribute('hidden','');}
function closeRole(){$('ub-role-modal')?.setAttribute('hidden','');}
function restore(id){const s=sessions.find(x=>x.id===id);if(!s)return;activeId=s.id;localStorage.setItem(ACTIVE_KEY,activeId);renderSavedSession(s.turns||[]);closeDrawer();}
function toggleFav(turnId){favoriteIds=favoriteIds.includes(turnId)?favoriteIds.filter(id=>id!==turnId):[...favoriteIds,turnId];persist();drawDrawer('favorites');}
function drawDrawer(kind){
 const d=$('ub-drawer');if(!d)return;d.hidden=false;d.replaceChildren();
 const h=el('div','flex items-center justify-between mb-4');h.append(el('h2','font-bold text-lg',kind==='sessions'?'對話紀錄':'收藏的回答'),button('✕ 關閉',closeDrawer));d.append(h);
 if(kind==='sessions'){
  if(!sessions.length)d.append(el('p','ub-muted','沒有歷史對話。'));
  for(const s of sessions){const card=el('article','ub-item');card.append(el('strong','',s.title||'未命名對話'),el('p','ub-muted',`${new Date(s.created).toLocaleString('zh-TW')} · ${(s.turns||[]).length} 則問答`));card.append(button('開啟完整對話',()=>restore(s.id)));
   card.append(button('刪除',()=>{if(!confirm('確定刪除此會話？'))return;sessions=sessions.filter(x=>x.id!==s.id);if(s.id===activeId)activeId='';persist();drawDrawer('sessions')}));d.append(card);}
 }else{
  let turns=sessions.flatMap(s=>(s.turns||[]).filter(t=>favoriteIds.includes(t.id)));
  if(!turns.length)d.append(el('p','ub-muted','尚未收藏回答。'));
  for(const t of turns.reverse()){const card=el('article','ub-item');card.append(el('strong','',t.question),el('p','mt-2',t.answer));card.append(button('取消收藏',()=>toggleFav(t.id)));card.append(button('重新提問',()=>{closeDrawer();window.askQuestion?.(t.question)}));d.append(card);}
 }
 if(kind==='sessions')d.append(button('清除全部本機紀錄',()=>{if(!confirm('這會清除本機全部會話和收藏，確定嗎？'))return;sessions=[];favoriteIds=[];activeId='';persist();window.clearChatHistory?.();drawDrawer('sessions')}));
}
function chooseRole(key){if(!ROLES[key])return;role=key;localStorage.setItem('unibean_role',key);sessionStorage.setItem('unibean_role_selected_session','1');const label=$('ub-role-label');if(label)label.textContent=ROLES[key].name;renderRole();closeRole();loadAnnouncements();document.dispatchEvent(new CustomEvent('unibean:role-changed',{detail:{role:key}}));}
function showRoles(){const box=$('ub-role-modal'),list=$('ub-role-list');if(!box||!list)return;box.hidden=false;list.replaceChildren();Object.entries(ROLES).forEach(([key,v])=>{const card=button('',()=>chooseRole(key),'ub-role-card');card.append(el('span','ub-role-icon',v.icon),el('strong','',v.name),el('small','',v.desc));if(key===role)card.setAttribute('aria-current','true');list.append(card)});list.querySelector('button')?.focus();}
function renderRole(){const v=ROLES[role];const target=$('ub-role-hints');if(!target)return;target.replaceChildren();const headline=el('div','ub-role-welcome');headline.append(el('div','text-base font-bold',`${v.icon} ${v.greet}`),el('p','ub-muted',`目前以「${v.name}」視角查詢，無需登入。官方法規仍以引用來源為準。`));target.append(headline);const line=el('div','ub-questions');v.questions.forEach(q=>line.append(button(`✦ ${q}`,()=>window.askQuestion?.(q))));target.append(line);}
async function loadAnnouncements(){const box=$('ub-announcements');if(!box)return;box.replaceChildren(el('p','ub-muted','讀取管理端公告中…'));try{const data=await apiFetch('/api/announcements');const items=(data.items||[]).slice().sort((a,b)=>Number(ROLES[role].depts.includes(b.department))-Number(ROLES[role].depts.includes(a.department)));box.replaceChildren();if(!items.length)box.append(el('p','ub-muted','目前沒有管理端公告。請以學校官方網站資訊為準。'));for(const item of items.slice(0,5)){const card=el('article','ub-notice');card.append(el('strong','',`${item.department}｜${item.title}`),el('p','ub-muted',item.body));if(item.source_url){try{const u=new URL(item.source_url);if(u.protocol==='https:'){const a=el('a','','查看公告來源 ↗');a.href=u.href;a.rel='noopener noreferrer';a.target='_blank';card.append(a)}}catch{}}box.append(card)}}catch{box.replaceChildren(el('p','ub-muted','公告尚未同步，可稍後再試。'));}}
function taipeiToday(){const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'});const parts=Object.fromEntries(f.formatToParts(new Date()).map(x=>[x.type,x.value]));return `${parts.year}-${parts.month}-${parts.day}`;}
let weekOffset=0,calendarItems=[];
function weekBounds(){let day=new Date(taipeiToday()+'T00:00:00Z');const mon=(day.getUTCDay()+6)%7;day.setUTCDate(day.getUTCDate()-mon+weekOffset*7);const end=new Date(day);end.setUTCDate(end.getUTCDate()+6);return [day.toISOString().slice(0,10),end.toISOString().slice(0,10)];}
function showWeek(){const host=$('ub-calendar-items'),range=$('ub-calendar-range');if(!host)return;const [a,b]=weekBounds();if(range)range.textContent=`${a} ～ ${b}`;host.replaceChildren();const selected=calendarItems.filter(x=>x.date>=a&&x.date<=b);if(!selected.length){host.append(el('p','ub-muted','這週尚無已人工核實的官方校務行事曆項目。'));return;}for(const event of selected){const row=el('div','ub-calendar-entry');row.append(el('strong','',event.date),el('span','',event.title));const a=el('a','','查看官方來源 ↗');a.href=event.source_url;a.target='_blank';a.rel='noopener noreferrer';row.append(a);host.append(row)}}
async function loadCalendar(){const box=$('ub-calendar-items');if(!box)return;try{const d=await apiFetch('/api/calendar');calendarItems=Array.isArray(d.items)?d.items:[];showWeek()}catch{box.replaceChildren(el('p','ub-muted','行事曆目前無法讀取。'));}}
function exportHistory(){const lines=['Uni-Bean 本機對話匯出（僅個人參考，不代表官方文件）'];for(const s of sessions){lines.push(`\n=== ${s.title||'對話'} ===`);for(const t of s.turns||[]){lines.push(`時間：${t.date}\n問：${t.question}\n答：${t.answer}\n來源：${(t.sources||[]).map(x=>x.url||x.title||'').join('、')}\n`)}}const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));const a=el('a');a.href=url;a.download='Uni-Bean-對話紀錄.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function speak(){const s=current(),t=s.turns?.at(-1);if(!t)return alert('目前沒有可朗讀的回答。');if(!('speechSynthesis'in window))return alert('瀏覽器沒有支援語音朗讀。');speechSynthesis.cancel();const say=new SpeechSynthesisUtterance(t.answer);say.lang='zh-TW';speechSynthesis.speak(say)}
function toggleClass(cls,key){document.body.classList.toggle(cls);localStorage.setItem(key,document.body.classList.contains(cls)?'1':'0')}
export function initStudentTools(){
 const host=$('chat-messages-container');if(!host||$('ub-tools'))return;
 if(localStorage.getItem('unibean_large')==='1')document.body.classList.add('ub-large');
 if(localStorage.getItem('unibean_dark')==='1')document.body.classList.add('ub-dark');
 const bar=el('div','ub-tools');bar.id='ub-tools';
 const primary=el('div','ub-tools-primary');
 const rb=button('身分：',showRoles);const label=el('span','',ROLES[role].name);label.id='ub-role-label';rb.append(label);primary.append(rb);
 primary.append(button('＋ 新對話',()=>window.clearChatHistory?.()),button('◷ 歷史紀錄',()=>drawDrawer('sessions')));
 bar.append(primary,el('span','ub-tools-spacer'));
 const more=el('details','ub-more-menu');const trigger=el('summary','ub-tool','⋯ 更多工具');trigger.setAttribute('aria-label','展開更多工具');more.append(trigger);
 const drop=el('div','ub-more-dropdown');
 function menuAction(text,fn){drop.append(button(text,()=>{more.open=false;fn()}));}
 menuAction('☆ 收藏的回答',()=>drawDrawer('favorites'));
 menuAction('↓ 匯出對話紀錄',exportHistory);
 menuAction('🔊 朗讀最新回答',speak);
 menuAction('A+ 切換大字',()=>toggleClass('ub-large','unibean_large'));
 menuAction('☾ 切換深色',()=>toggleClass('ub-dark','unibean_dark'));
 more.append(drop);bar.append(more);
 const hints=el('div','ub-suggestions');hints.id='ub-role-hints';
 const news=el('section','ub-notice-panel');news.append(el('h3','font-semibold','最新管理端公告'));const items=el('div','ub-notice-grid');items.id='ub-announcements';news.append(items);
 const cal=el('section','ub-calendar');const top=el('div','ub-calendar-header');top.append(el('strong','','已核實校務行事曆'));const nav=el('div','ub-calendar-nav');nav.append(button('◀',()=>{weekOffset--;showWeek()}));const date=el('span','','');date.id='ub-calendar-range';nav.append(date,button('▶',()=>{weekOffset++;showWeek()}));top.append(nav);cal.append(top);const events=el('div','');events.id='ub-calendar-items';cal.append(events);cal.append(el('p','ub-muted','只顯示已有官方來源且經人工核實的日期。'));
 const campus=el('details','ub-campus-hub');campus.id='ub-campus-hub';const campusSummary=el('summary','','📅 校園公告與行事曆');campusSummary.append(el('span','ub-campus-preview','選擇展開查看'));campus.append(campusSummary);const campusBody=el('div','ub-campus-content');campusBody.append(news,cal);campus.append(campusBody);
 const intro=$('ub-intro-hero');
 if(intro){intro.after(hints,campus);intro.before(bar);}else{host.prepend(campus);host.prepend(hints);host.prepend(bar);}
 const drawer=el('aside','ub-drawer');drawer.id='ub-drawer';drawer.hidden=true;document.body.append(drawer);
 const modal=el('div','ub-modal');modal.id='ub-role-modal';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','選擇造訪身分');const section=el('section','ub-role-dialog');section.append(el('h2','font-bold text-xl mb-2','歡迎使用 Uni-Bean 🫘'),el('p','ub-muted mb-4','請先選擇造訪身分，系統將提供對應的提問與公告。這不是行政登入。'));const cards=el('div','ub-role-grid');cards.id='ub-role-list';section.append(cards,button('先用訪客身分瀏覽',()=>chooseRole('visitor')));modal.append(section);document.body.append(modal);
 modal.addEventListener('click',e=>{if(e.target===modal)chooseRole('visitor')});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)chooseRole('visitor')});
 document.addEventListener('unibean:chat-complete',e=>{const t=e.detail||{};if(!t.question||!t.answer)return;const session=current();session.turns.push({id:createLocalId(),date:new Date().toLocaleString('zh-TW'),question:String(t.question).slice(0,500),answer:String(t.answer).slice(0,15000),mode:t.mode,sources:(t.sources||[]).slice(0,8)});if(session.turns.length===1)session.title=t.question.slice(0,30);persist();});
 document.addEventListener('unibean:new-session',()=>{newSession()});
 if(sessions.some(s=>s.id===activeId))restore(activeId);else newSession();
 renderRole();loadAnnouncements();loadCalendar();if(!sessionStorage.getItem('unibean_role_selected_session'))requestAnimationFrame(showRoles);
}
