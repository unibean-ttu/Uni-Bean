/** v11: role/locale, source details. Shared shell is kept independent. */
import {$,el,safeLink,toast} from './utils.js';
const langSelect=$('v11-language');
if(langSelect){const prior=localStorage.getItem('ub_v11_lang')||'zh-TW';langSelect.value=['zh-TW','en','ja'].includes(prior)?prior:'zh-TW';
 langSelect.addEventListener('change',()=>{localStorage.setItem('ub_v11_lang',langSelect.value);toast('回答語言已更新；已有回答不會被重新翻譯。')});}
// Custom accessible role popover. Original select stays as a programmatic fallback.
const roleOptions=[['student','🎓','在校學生'],['freshman','🌱','新生'],['parent','🏠','家長'],['alumni','⭐','畢業校友'],['staff','📚','教職員工'],['visitor','🧭','訪客']];
const roleSelect=$('role-select'),roleMenu=$('v11-role-menu'),roleTrigger=$('v11-role-trigger');
function refreshRole(){const chosen=roleOptions.find(x=>x[0]===roleSelect?.value)||roleOptions[0];if(roleTrigger)roleTrigger.innerHTML=`<span aria-hidden="true">${chosen[1]}</span> ${chosen[2]} <span aria-hidden="true">⌄</span>`;
 roleMenu?.querySelectorAll('button').forEach(x=>x.setAttribute('aria-selected',String(x.dataset.role===chosen[0])))}
function closeRoles(){if(roleMenu)roleMenu.hidden=true;if(roleTrigger)roleTrigger.setAttribute('aria-expanded','false')}
if(roleMenu&&roleSelect&&roleTrigger){
 for(const [id,icon,label] of roleOptions){const button=el('button','v11-role-option');button.type='button';button.dataset.role=id;button.setAttribute('role','option');button.textContent=`${icon} ${label}`;
  button.addEventListener('click',()=>{roleSelect.value=id;roleSelect.dispatchEvent(new Event('change',{bubbles:true}));refreshRole();closeRoles();roleTrigger.focus()});roleMenu.append(button)}
 roleTrigger.addEventListener('click',()=>{roleMenu.hidden=!roleMenu.hidden;roleTrigger.setAttribute('aria-expanded',String(!roleMenu.hidden));refreshRole()});
 roleSelect.addEventListener('change',refreshRole);refreshRole();
 document.addEventListener('click',e=>{if(!e.target.closest('.v11-role-picker'))closeRoles()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeRoles()});
}

const dialog=$('v11-detail-dialog');
$('v11-close-detail')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',ev=>{if(ev.target===dialog)dialog.close()});
export function showEvidenceDialog(question,result){
 const root=$('v11-detail-body');root.replaceChildren();
 root.append(el('h3','','問題：'+question));
 root.append(el('h4','ub-detail-label','白話結論'));
 root.append(el('p','v11-brief',result.summary||result.answer||'目前尚無足夠資訊可供摘要。'));
 const points=Array.isArray(result.key_points)?result.key_points:[];
 if(points.length){root.append(el('h4','ub-detail-label','重點整理'));
  const list=el('ul','ub-detail-points');points.slice(0,5).forEach(x=>list.append(el('li','',String(x))));root.append(list)}
 const info=result.info_card;
 if(info){const box=el('div','ub-detail-metadata');box.append(el('h4','','資訊整理'));
  box.append(el('p','','參考文件：'+(info.source_count??0)+' 份'));
  box.append(el('p','','來源狀態：'+(info.verification||'待核實')));root.append(box)}
 const srcs=Array.isArray(result.sources)?result.sources:[];
 root.append(el('h4','ub-detail-label',`資料來源與相關規章（${srcs.length}）`));
 if(!srcs.length){root.append(el('p','muted','這次回覆沒有正式來源。閒聊回答不是校務法規；重要資訊需再查證。'))}
 srcs.forEach((src,i)=>{
  const c=el('article','v11-detail-source');c.append(el('h4','',src.title||`來源 ${i+1}`));
  const metadata=[src.department,src.academic_year&&src.academic_year+' 學年度',
    src.published_at&&'發布日期：'+src.published_at,
    src.reviewed_on&&'核實時間：'+src.reviewed_on,
    src.last_synced_at&&'索引同步：'+src.last_synced_at,
    src.verified_official?'已標記人工核實':'尚未人工核實',src.expired?'已知過期':null];
  c.append(el('small','',metadata.filter(Boolean).join(' · ')));
  if(src.excerpt){c.append(el('h5','ub-source-excerpt-title','文件內容節錄'),el('p','',src.excerpt))}
  const href=safeLink(src.url||src.source_url);
  if(href){const a=el('a','','開啟完整官方原文 ↗');a.href=href;a.target='_blank';a.rel='noopener noreferrer';c.append(a)}
  root.append(c);
 });
 if(result.warning)root.append(el('p','ub-detail-warning',result.warning));
 dialog.showModal();
}
document.addEventListener('ub:details',ev=>showEvidenceDialog(ev.detail.question,ev.detail.result));
