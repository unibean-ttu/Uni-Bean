/** Official directory with school -> administrative / academic -> college or office nesting.
 * Source data comes from user-supplied office list. No fabricated room/phone verification.
 */
import {$,el,safeLink,toast} from './utils.js';
let offices=[], activeFilter='all';
const fallback=[{name:'教務處',category:'教務處',official_url:'https://dean.ttu.edu.tw/',tags:['學籍','選課']},{name:'學生事務處',category:'學務處',official_url:'https://sa.ttu.edu.tw/',tags:['學生生活']},{name:'大同大學官方網站',category:'其他行政單位',official_url:'https://www.ttu.edu.tw/',tags:['校務服務']}];
const academic=(record)=>String(record.category||'').includes('系')||/(工程學院|經營學院|設計學院|國際學院|通識|學程教育|教學主管|造物)/.test(record.name||'');
function college(record){const n=record.name||'';
 if(/機械|材料|化學工程|生物科技|工程學院|電機|資訊工程|通訊工程/.test(n))return '工程學院';
 if(/經營|資訊經營|事業/.test(n))return '經營學院';
 if(/設計|工業設計|數位媒體|設計科學/.test(n))return '設計學院';
 if(/國際學院|應用外語/.test(n))return '國際學院';
 return '其他學術及教學中心';
}
function adminGroup(record){const n=record.name||'',c=record.category||'';
 if(/教務|註冊|課務/.test(c+n))return '教務處';
 if(/學務|學生事務|輔導|課外/.test(c+n))return '學生事務處';
 if(/總務|出納|事務組/.test(c+n))return '總務處';
 if(/圖書|電算|資訊處/.test(c+n))return '圖書資訊處';
 return '其他行政單位與服務';
}
function officeCard(record){const card=el('article','panel office-card');card.append(el('h2','',record.name||'校內單位'));
 const tags=el('div','office-tags');(Array.isArray(record.tags)?record.tags:[]).slice(0,3).forEach(t=>tags.append(el('span','',t)));card.append(tags);
 const url=safeLink(record.official_url||record.url);card.append(el('p','',record.verified?'資料已標示完成核實':'官方單位名稱與網址供查詢；電話、樓層及辦公時間尚待官方核實。'));
 const actions=el('div','office-actions');if(url){const a=el('a','official','官方網站 ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';actions.append(a)}
 const ask=el('button','','向豆豆提問');ask.type='button';ask.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('ub:ask',{detail:{question:record.sampleQuestion||`請問大同大學${record.name}的業務與服務？`}})));actions.append(ask);card.append(actions);return card;
}
function group(title,items,defaultOpen=true){const details=el('details','ub-directory-group');details.open=defaultOpen;details.append(el('summary','',title));const inner=el('div','ub-directory-inner');items.forEach(x=>inner.append(officeCard(x)));details.append(inner);return details}
function groupCollection(root,items,by,order){const map=new Map();items.forEach(x=>{const key=by(x);if(!map.has(key))map.set(key,[]);map.get(key).push(x)});
 const keys=[...order.filter(k=>map.has(k)),...map.keys()].filter((k,i,a)=>a.indexOf(k)===i);
 keys.forEach(k=>root.append(group(`${k}（${map.get(k).length}）`,map.get(k),keys.length<=8)));
}
function render(){const search=$('directory-search').value.trim().toLowerCase();const root=$('directory-results');root.replaceChildren();
 const filtered=offices.filter(x=>{const typeMatch=activeFilter==='all'||(activeFilter==='系所'?academic(x):String(x.category||'').includes(activeFilter));
  const text=[x.name,x.category,...(x.tags||[])].join(' ').toLowerCase();return typeMatch&&text.includes(search)});
 if(!filtered.length){root.append(el('p','muted','沒有符合條件的處室或系所，請換關鍵字。'));return}
 const a=filtered.filter(x=>!academic(x)),b=filtered.filter(academic);
 const hierarchy=el('div','ub-directory-hierarchy');
 if(a.length){const sec=el('section','ub-directory-level');sec.append(el('h2','','🏛️ 大同大學 → 行政單位'));groupCollection(sec,a,adminGroup,['教務處','學生事務處','總務處','圖書資訊處','其他行政單位與服務']);hierarchy.append(sec)}
 if(b.length){const sec=el('section','ub-directory-level');sec.append(el('h2','','🎓 大同大學 → 學院／系所'));groupCollection(sec,b,college,['工程學院','經營學院','設計學院','國際學院','其他學術及教學中心']);hierarchy.append(sec)}
 root.append(hierarchy);
}
export async function initDirectory(){
 $('directory-search').addEventListener('input',render);
 $('directory-filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;activeFilter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(n=>n.classList.toggle('active',n===b));render()});
 try{const r=await fetch('./assets/offices.json',{cache:'no-store'});if(!r.ok)throw Error(String(r.status));const data=await r.json();offices=Array.isArray(data)?data.filter(x=>x&&typeof x.name==='string'):fallback}catch{offices=fallback;toast('處室清單載入失敗，暫顯示基本官方入口')}
 render();
}
