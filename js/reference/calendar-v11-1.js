/** Source-aware calendar details. No unverified dates are silently marked verified. */
import {exportEvent} from './calendar-export.js';
const host=document.getElementById('v101-calendar-list');
if(host){
 const dialog=document.createElement('dialog');dialog.id='ub-calendar-detail';dialog.className='ub-dialog ub-calendar-dialog';
 const header=document.createElement('div');header.className='ub-calendar-header';
 const title=document.createElement('h2');title.textContent='行事曆活動詳情';
 const close=document.createElement('button');close.textContent='×';close.type='button';close.setAttribute('aria-label','關閉活動詳情');
 close.addEventListener('click',()=>dialog.close());header.append(title,close);
 const content=document.createElement('div');content.className='ub-calendar-body';dialog.append(header,content);document.body.append(dialog);
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 function add(text,cls=''){const el=document.createElement('p');el.textContent=text;if(cls)el.className=cls;content.append(el)}
 host.addEventListener('click',e=>{
  const btn=e.target.closest('[data-calendar-details]');if(!btn)return;
  let ev;try{ev=JSON.parse(btn.closest('[data-calendar-item]').dataset.calendarItem)}catch{return}
  content.replaceChildren();title.textContent=String(ev.title||'校務活動');
  add('📅 '+ev.date+(ev.end_date&&ev.end_date!==ev.date?' ～ '+ev.end_date:''),'ub-calendar-date');
  add('適用學年度：'+(ev.academic_year||'115')+' 學年度');
  add('負責單位：'+(ev.department||'大同大學'));
  const approved=ev.verified===true||ev.review_status==='staff_approved';
  add(approved?'資料狀態：校務管理端已核對這份 PDF 版本':'資料狀態：官方 PDF 摘錄，尚未經管理端批次核對','ub-calendar-status');
  add('此為行事曆列出的活動日期；申請資格、所需文件及個別規定須以對應辦法為準。');
  const row=document.createElement('div');row.className='ub-calendar-actions';
  if(approved){const b=document.createElement('button');b.type='button';b.textContent='加入行事曆';b.addEventListener('click',()=>exportEvent(ev));row.append(b)}
  const src=String(ev.source_url||'');try{const u=new URL(src);if(u.protocol==='https:'&&(u.hostname==='ttu.edu.tw'||u.hostname.endsWith('.ttu.edu.tw'))){const a=document.createElement('a');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent='查看原始 PDF ↗';row.append(a)}}catch{}
  content.append(row);dialog.showModal();
 });
}
