/** 公開資訊中心：管理員公告＋僅人工核實的校務行事曆；不能推測時程。 */
import {apiFetch} from '../api.js';
import {safeLink} from './utils.js';
import {exportEvent} from './calendar-export.js';
import {studentT} from './student-i18n-v11-2.js';
const $=id=>document.getElementById(id);
let currentCalendarQuery='';
let announcementQuery='';let announcementCategory='全部';
function filterCalendarRows(){
 const host=$('v101-calendar-list');if(!host)return;
 let shown=0;const term=currentCalendarQuery.toLowerCase();
 host.querySelectorAll('[data-calendar-item]').forEach(row=>{const ev=JSON.parse(row.dataset.calendarItem||'{}');const haystack=[ev.title,ev.department,ev.date].join(' ').toLowerCase();const visible=!term||haystack.includes(term);row.hidden=!visible;if(visible)shown++});
 const empty=$('ub12-calendar-empty');if(empty)empty.hidden=shown>0||!term;
}


const node=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n};
const validOfficial=raw=>{const safe=safeLink(raw);if(!safe)return null;try{const u=new URL(safe);return u.protocol==='https:'&&(u.hostname==='ttu.edu.tw'||u.hostname.endsWith('.ttu.edu.tw'))?u.href:null}catch{return null}};

async function refreshAnnouncements(){
 const host=$('v10-announcement-list');if(!host)return;host.textContent='正在讀取校務公告…';
 try{
  let data;try{data=await apiFetch('/api/v12/announcements?limit=50')}catch(e){if(!String(e.message).includes('404'))throw e;data=await apiFetch('/api/announcements')}
  const items=Array.isArray(data.items)?data.items:[];
  const matching=items.filter(x=>{
    const category=String(x.category||'其他');
    const text=[x.title,x.body,x.department].join(' ').toLowerCase();
    return (announcementCategory==='全部'||category===announcementCategory)&&(!announcementQuery||text.includes(announcementQuery));
  });
  host.replaceChildren();
  const stamp=$('v12-announcement-sync');if(stamp)stamp.textContent=data.last_synced_at?'最近資料同步：'+new Date(data.last_synced_at).toLocaleString():'官方爬蟲資料尚無同步紀錄';
  if(!matching.length){host.append(node('p',items.length?'沒有符合條件的公告。':'目前尚未取得可顯示的公告。系統同步狀態以實際爬蟲紀錄為準。','muted'));return}
  for(const ann of matching.slice(0,35)){
   const card=node('article','','v10-announcement v12-announcement');
   card.append(node('h3',String(ann.title||'未命名公告').slice(0,180)));
   const date=ann.published_at?String(ann.published_at).slice(0,10):'發布日期待確認';
   card.append(node('small',[ann.department,ann.category,date].filter(Boolean).join(' · ')));
   const body=String(ann.body||'').trim();if(body)card.append(node('p',body.slice(0,360)));
   const states={approved:'公告已審核',source_checked:'官方來源擷取・內容待核實',staff_posted:'管理端發布・請核對來源'};
   card.append(node('small',states[ann.verification_status]||'來源待確認','v12-source-state'));
   const url=validOfficial(ann.source_url);
   if(url){const link=node('a','查看官方原文 ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';card.append(link)}
   else card.append(node('small','未提供可核實的官方原文連結，請向發布單位確認。','muted'));
   host.append(card);
  }
 }catch(e){host.replaceChildren(node('p','校務公告目前讀取失敗，請確認 FastAPI 後端及資料同步狀態。','muted'))}
}

/* Pending preview is NOT a verified calendar and cannot be exported as an official event. */
async function showCalendarCandidates(host){
 try{
  let raw;try{raw=await apiFetch('/api/calendar-preview')}catch{const r=await fetch('./assets/calendar_115_preview.json',{cache:'no-store'});if(!r.ok)throw new Error('Preview missing');raw=await r.json()}
  const events=Array.isArray(raw.items)?raw.items:(Array.isArray(raw.events)?raw.events:[]);
  const localToday=new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit'}).format(Date.now());
  const future=events.filter(x=>String(x.end_date||x.date||'')>=localToday);
  const view=future.length?future:events;
  host.replaceChildren();
  host.append(node('p','已匯入 115 學年度官方 PDF。點選活動可直接看日期與辦理單位；目前尚未由校務管理端完成整份來源版本核對。如校方修訂，請更新本系統。','v101-empty v102-pending-note'));
  for(const ev of view.slice(0,100)){
   if(ev.verified===true)continue;
   const date=String(ev.date||'');
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
   const row=node('article','','v101-calendar-event v102-pending-event');row.dataset.calendarItem=JSON.stringify(ev);
   const detail=node('div','','v101-calendar-detail');
   detail.append(node('strong',String(ev.title||'未命名日程')));
   const end=String(ev.end_date||'');
   detail.append(node('small',`${date}${end&&end!==date?' ～ '+end:''} · 待人工核實`));
   row.append(detail);const detailBtn=node('button','查看活動詳情','ub-calendar-detail-btn');detailBtn.type='button';detailBtn.dataset.calendarDetails='';row.append(detailBtn);
   const link=validOfficial(ev.source_page_url||ev.source_url);
   if(link){const a=node('a','查看學校公告 ↗');a.href=link;a.target='_blank';a.rel='noopener noreferrer';const actions=node('div','','v101-event-actions');actions.append(a);row.append(actions)}
   host.append(row);
  }
  if(host.children.length===1)host.append(node('p','目前沒有可顯示的候選日期。','muted'));
  filterCalendarRows();
 }catch{host.replaceChildren(node('p','暫無已匯入的校務活動。','v101-empty'))}
}

async function refreshCalendar(){
 const host=$('v101-calendar-list');if(!host)return;host.replaceChildren(node('p','正在取得已核實的官方日期…','muted'));
 try{
  const result=await apiFetch('/api/calendar');const items=Array.isArray(result.items)?result.items:[];host.replaceChildren();
  if(!items.length){await showCalendarCandidates(host);return}
  for(const ev of items.slice(0,50)){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(String(ev.date))||!validOfficial(ev.source_url))continue;
   const row=node('article','','v101-calendar-event');row.dataset.calendarItem=JSON.stringify({...ev,verified:true});
   const detail=node('div','','v101-calendar-detail');detail.append(node('strong',ev.title),node('small',`${ev.date}${ev.department?' · '+ev.department:''}`));row.append(detail);
   const actions=node('div','','v101-event-actions');const detailBtn=node('button','查看詳情');detailBtn.type='button';detailBtn.dataset.calendarDetails='';actions.append(detailBtn);const a=node('a','官方來源 ↗');a.href=validOfficial(ev.source_url);a.target='_blank';a.rel='noopener noreferrer';actions.append(a);
   const b=node('button','加入行事曆');b.type='button';b.addEventListener('click',()=>exportEvent(ev));actions.append(b);row.append(actions);host.append(row);
  }
  if(!host.children.length)host.append(node('p','沒有符合來源驗證要求的校務日期。','muted'));
  filterCalendarRows();
 }catch{host.replaceChildren(node('p','行事曆目前無法讀取；請確認後端服務。','muted'))}
}
function initTabs(){
 const tabs=[...document.querySelectorAll('[data-campus-tab]')];
 const panels=[...document.querySelectorAll('[data-campus-panel]')];
 function select(name){
  tabs.forEach(tab=>{const active=tab.dataset.campusTab===name;tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active))});
  panels.forEach(panel=>{panel.hidden=panel.dataset.campusPanel!==name});
  if(name==='calendar')void refreshCalendar();
 }
 tabs.forEach(t=>t.addEventListener('click',()=>select(t.dataset.campusTab)));
}
export function initCampusInformation(){
 const announcementHost=$('v10-announcement-list');
 if(announcementHost&&!$('v12-announcement-filter')){
  const tools=node('div','','v12-announcement-tools');tools.id='v12-announcement-filter';
  const select=document.createElement('select');select.setAttribute('aria-label','公告分類');
  for(const category of ['全部','教務','學務','總務','人事','其他']){const opt=document.createElement('option');opt.value=category;opt.textContent=category;select.append(opt)}
  select.addEventListener('change',()=>{announcementCategory=select.value;void refreshAnnouncements()});
  const search=document.createElement('input');search.type='search';search.placeholder='搜尋公告關鍵字';search.setAttribute('aria-label','搜尋校務公告');
  search.addEventListener('input',()=>{announcementQuery=search.value.trim().toLowerCase();void refreshAnnouncements()});
  tools.append(select,search);announcementHost.parentElement.insertBefore(tools,announcementHost);
  const sync=node('small','','muted');sync.id='v12-announcement-sync';tools.after(sync);
 }
 const calendarHost=$('v101-calendar-list');
 if(calendarHost){
  const search=document.createElement('input');search.id='ub12-calendar-search';search.type='search';search.className='ub12-calendar-search';search.placeholder=studentT('搜尋活動，例如：期中、開學、放假');search.setAttribute('aria-label','搜尋校務行事曆');
  search.addEventListener('input',()=>{currentCalendarQuery=search.value.trim();filterCalendarRows()});
  calendarHost.parentElement.insertBefore(search,calendarHost);
  const empty=document.createElement('p');empty.id='ub12-calendar-empty';empty.className='muted';empty.hidden=true;empty.textContent=studentT('沒有符合關鍵字的行事曆活動，請試試其他詞。');calendarHost.parentElement.append(empty);
  document.addEventListener('ub:locale-changed',()=>{search.placeholder=studentT('搜尋活動，例如：期中、開學、放假');empty.textContent=studentT('沒有符合關鍵字的行事曆活動，請試試其他詞。')});
  document.addEventListener('ub:calendar-filter',e=>{
   currentCalendarQuery=String(e.detail?.query||'').slice(0,60);search.value=currentCalendarQuery;filterCalendarRows();
   search.focus({preventScroll:true});
  });
 }

 $('refresh-campus-announcements')?.addEventListener('click',refreshAnnouncements);
 $('refresh-campus-calendar')?.addEventListener('click',refreshCalendar);
 initTabs();void refreshAnnouncements();
}
