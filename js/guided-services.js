/** Uni-Bean 9.2 | 情境式服務導引（僅導引，不假裝核實校規）。 */
const guideRoot = new URL('../', import.meta.url);
const guideButtons = document.querySelectorAll('[data-open-guide]');
const guideDialog = document.getElementById('service-guide');
const guideGrid = document.getElementById('service-guide-grid');
const guideTitle = document.getElementById('guide-selected-title');
const guideHint = document.getElementById('guide-selected-hint');
const guideActions = document.getElementById('guide-actions');
let guideItems = [];
let selectedGuide = null;
function guideEl(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el}
function openGuide(){if(!guideDialog)return;if(typeof guideDialog.showModal==='function'&&!guideDialog.open)guideDialog.showModal();}
function closeGuide(){if(guideDialog?.open)guideDialog.close()}
function openPage(page){const target=document.querySelector(`.side-nav [data-page="${page}"]`) || document.querySelector(`.bottom-nav [data-page="${page}"]`);target?.click()}
function pickGuide(item){selectedGuide=item;guideTitle.textContent=item.title;guideHint.textContent=`建議先搜尋：${item.office}。此處僅提供導引，正式申辦方式與日期仍要核對原始公告。`;guideGrid.querySelectorAll('button').forEach(b=>{const active=b.dataset.guideId===item.id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});guideActions.hidden=false;}
function makeGuideButton(label,fn,primary=false){const b=guideEl('button',primary?'guide-primary':'guide-secondary',label);b.type='button';b.addEventListener('click',fn);return b}
async function initGuide(){if(!guideGrid)return;try{const response=await fetch(new URL('assets/service_scenarios.json',guideRoot));if(!response.ok)throw Error('not found');const data=await response.json();if(!Array.isArray(data))throw Error('invalid');guideItems=data.filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string'&&typeof x.question==='string');for(const item of guideItems){const b=makeGuideButton('',()=>pickGuide(item));b.className='guide-choice';b.dataset.guideId=item.id;b.setAttribute('aria-pressed','false');b.append(guideEl('span','guide-icon',item.icon||'🔎'),guideEl('strong','',item.title),guideEl('small','',item.caption||''));guideGrid.append(b)}guideActions.append(makeGuideButton('讓 Uni-Bean 幫我查詢',()=>{const q=selectedGuide?.question;if(!q)return;closeGuide();openPage('chat');const input=document.getElementById('question');input.value=q;document.getElementById('chat-form')?.requestSubmit()},true),makeGuideButton('尋找相關處室',()=>{if(!selectedGuide)return;const target=selectedGuide.id==='transport'?'map':'directory';closeGuide();openPage(target);if(target==='directory'){const search=document.getElementById('office-search');search.value=selectedGuide.search;search.dispatchEvent(new Event('input',{bubbles:true}));search.focus()} }),makeGuideButton('取消',closeGuide));}catch{guideGrid.replaceChildren(guideEl('p','guide-error','情境資料無法載入，仍可以直接使用智慧問答或行政資訊查詢。'))}}
for(const b of guideButtons)b.addEventListener('click',openGuide);
document.getElementById('guide-close')?.addEventListener('click',closeGuide);
initGuide();
