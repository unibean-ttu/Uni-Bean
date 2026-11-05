import {switchTab,showToast} from './shell.js';
import {askQuestion} from './chat.js';
let offices=[];let category='all';
const $=id=>document.getElementById(id);
export async function initDirectory(){
  offices=await fetch('./assets/offices.json').then(r=>r.json());
  const grid=$('office-cards-grid');if(!grid)return;
  const note=document.createElement('div');note.className='preview-note col-span-full';
  note.textContent='注意：下方分機、樓層、開放時間為原始介面附帶的「未核實展示資料」，正式使用前必須逐筆確認學校官網。';
  grid.before(note);renderOffices();
}
export function renderOffices(){
 const q=($('office-search-input')?.value||'').trim().toLowerCase();const grid=$('office-cards-grid');if(!grid)return;
 grid.replaceChildren();
 const selected=offices.filter(o=>(category==='all'||o.category===category)&&(!q||[o.name,o.location,o.ext,...o.tags].join(' ').toLowerCase().includes(q)));
 if(!selected.length){const p=document.createElement('p');p.textContent='沒有符合的展示資料，建議直接詢問相關業務單位。';p.className='col-span-full text-sm text-gray-600 p-6';grid.append(p);return;}
 for(const off of selected){
   const card=document.createElement('article');card.className='bg-white rounded-2xl p-5 border border-bean-creamGreen shadow-soft space-y-3';
   const tag=document.createElement('span');tag.className='inline-block px-3 py-1 rounded-full bg-bean-creamGreen text-bean-forest text-xs font-semibold';tag.textContent=off.category;
   const title=document.createElement('h3');title.className='font-bold text-base text-bean-ink';title.textContent=off.name;
   const details=document.createElement('p');details.className='text-xs text-gray-600 leading-relaxed chat-copy';details.textContent=`${off.location}\n電話：${off.ext}\n服務時間：${off.hours}`;
   const warn=document.createElement('p');warn.className='text-xs text-orange-700';warn.textContent='⚠️ 分機、樓層及服務時間尚未核實';
   const pills=document.createElement('div');pills.className='flex flex-wrap gap-1.5';for(const s of off.tags){const pill=document.createElement('span');pill.className='px-2 py-0.5 rounded-md bg-bean-softGreen text-bean-forestDark text-xs';pill.textContent=s;pills.append(pill)}
   const actions=document.createElement('div');actions.className='flex flex-wrap gap-2 pt-2';
   const qbtn=document.createElement('button');qbtn.className='px-3 py-2 rounded-xl bg-bean-forest text-white text-xs font-semibold';qbtn.textContent='詢問相關規章';qbtn.addEventListener('click',()=>askQuestion(off.sampleQuestion));
   const mapbtn=document.createElement('button');mapbtn.className='px-3 py-2 rounded-xl bg-bean-softGreen text-bean-forestDark text-xs font-semibold';mapbtn.textContent='地圖展示';mapbtn.addEventListener('click',()=>window.jumpToMapBuilding?.(off.buildingId));
   actions.append(qbtn,mapbtn);card.append(tag,title,details,warn,pills,actions);grid.append(card);
 }
}
export function setOfficeCategory(cat){category=cat;document.querySelectorAll('.office-cat-btn').forEach(b=>{const active=b.dataset.cat===cat;b.className=active?'office-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-bean-forest text-white transition':'office-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-bean-softGreen text-bean-forestDark hover:bg-bean-creamGreen transition'});renderOffices()}
export const filterOffices=()=>renderOffices();
export function jumpToOfficeDirectory(keyword){switchTab('directory');$('office-search-input').value=keyword;setOfficeCategory('all')}
