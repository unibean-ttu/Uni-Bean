/* Uni-Bean v9.1 | Clean and accessible, dependency-free student client.
 * All untrusted response data is rendered with textContent, never raw HTML.
 * No browser credential is stored. Sessions and favourites remain on this device.
 */
const $ = (id) => document.getElementById(id);
const ROOT = new URL('../', import.meta.url);
const url = (path) => new URL(path, ROOT).href;
const api = (path) => (String(window.UNIBEAN_API_BASE_URL || '').trim().replace(/\/$/, '') + path);
const ROLES = [
  {id:'student',name:'在校學生',symbol:'🎓',desc:'選課、獎學金、畢業',questions:['獎學金申請資訊在哪裡查？','休學與復學相關規章去哪裡找？','成績單要向哪個單位申請？','如何查詢畢業資格規定？']},
  {id:'freshman',name:'新生',symbol:'🌱',desc:'入學、註冊、住宿',questions:['新生註冊資訊在哪裡查？','學生證相關資訊去哪裡找？','住宿與助學金要問哪個處室？','大同大學的校園位置在哪裡？']},
  {id:'parent',name:'家長',symbol:'🏠',desc:'就學資訊、行政窗口',questions:['學費繳納資訊要去哪裡查？','如何聯絡學校行政單位？','有哪些學生輔導或助學資源？','如何查詢大同大學最新公告？']},
  {id:'alumni',name:'校友',symbol:'🌟',desc:'文件、校友服務',questions:['畢業生如何查詢成績單申請資訊？','校友相關服務在哪裡查？','要向哪個處室申請證明文件？','大同大學官方網站在哪裡？']},
  {id:'staff',name:'教職員工',symbol:'📚',desc:'處室、規章、聯繫',questions:['校務規章文件在哪裡查？','學校處室聯絡資訊怎麼查？','最新校務公告在哪裡？','系統有哪些文件來源？']},
  {id:'visitor',name:'訪客',symbol:'🧭',desc:'參訪、交通、校園',questions:['大同大學要怎麼去？','校園地圖與建築資訊在哪裡？','如何查詢招生相關資訊？','大同大學各行政單位有哪些？']},
];
const NAV = {chat:'智慧問答',directory:'行政資訊',map:'校園導航',resources:'校務資訊',mine:'我的空間'};
const STORAGE_KEY = 'unibean_v7_sessions';
const FAVORITES_KEY = 'unibean_v7_favorites';
const ROLE_KEY = 'unibean_v7_role';
const SIDEBAR_KEY='unibean_v91_sidebar_collapsed';
let previewObjectUrl=null;
const state = {role:storageGet(ROLE_KEY)||'',view:'chat',sessions:readStorage(STORAGE_KEY, []),activeId:null,favorites:readStorage(FAVORITES_KEY, []),busy:false,offices:[],buildings:[],officeFilter:'全部',lastFocus:null};
// Some mobile privacy modes disable localStorage entirely. Avoid crashing the UI.
function storageGet(key){try{return localStorage.getItem(key)}catch{return null}}
function storageSet(key,value){try{localStorage.setItem(key,value)}catch{return false}return true}
let toastTimer = null;
function safeId(){if(globalThis.crypto?.randomUUID)return crypto.randomUUID();if(globalThis.crypto?.getRandomValues){const a=new Uint8Array(16);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,'0')).join('')}return String(Date.now())+'-'+Math.random().toString(36).slice(2)}
function readStorage(key, fallback){try{const value=JSON.parse(storageGet(key));return Array.isArray(fallback)?(Array.isArray(value)?value:fallback):value||fallback}catch{return fallback}}
function persist(){try{const a=storageSet(STORAGE_KEY,JSON.stringify(state.sessions.slice(0,25).map(s=>({...s,messages:s.messages.slice(-55)}))));const b=storageSet(FAVORITES_KEY,JSON.stringify(state.favorites.slice(0,50)));if((!a||!b)&&!state.storageWarned){state.storageWarned=true;toast('目前瀏覽器不允許儲存紀錄，關閉網頁後可能遺失對話。')}}catch{toast('瀏覽器儲存空間不足，請先匯出或清理歷史紀錄。')}}
function element(tag,cls='',text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n}
function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','icon');svg.setAttribute('aria-hidden','true');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#ic-'+name);svg.append(use);return svg}
function button(text,cls,fn,iconName){const b=element('button',cls,text);b.type='button';if(iconName)b.prepend(icon(iconName));b.addEventListener('click',fn);return b}
function safeLink(address,label,cssClass='small-link'){if(!address)return null;try{const target=new URL(address);if(!['https:','http:'].includes(target.protocol))return null;const a=element('a',cssClass,label);a.href=target.href;a.target='_blank';a.rel='noopener noreferrer';return a}catch{return null}}
function toast(message){const node=$('toast');node.textContent=message;node.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.add('hidden'),3600)}
function role(){return ROLES.find(x=>x.id===state.role)||ROLES[0]}
function currentSession(){return state.sessions.find(x=>x.id===state.activeId)}
function freshSession(){const s={id:safeId(),title:'新的校務對話',created:new Date().toISOString(),messages:[]};state.sessions.unshift(s);state.activeId=s.id;persist();return s}
function setRole(id){
 if(!ROLES.some(r=>r.id===id))return;
 state.role=id;storageSet(ROLE_KEY,id);
 $('current-role').textContent=role().name;$('profile-role').textContent=role().name;
 renderSuggestions();loadResources();closeModal();
 showWelcomeIntro();
}
function showWelcomeIntro(){
 const wrap=modalHeading('你好，'+role().name+'！','Uni-Bean 可以幫你用一句話查詢校務資料，也能找到來源核對。');
 const info=element('div','intro-description');
 info.append(element('p','','你可以直接輸入問題，或選擇常用服務；系統優先查找校務文件，無證據時會明確提醒。'));
 const list=element('div','intro-service-list');
 for(const t of ['智慧問答：先搜尋文件，再整理回答','行政資訊：找處室、業務與官方網站','校園導航：輸入出發地前往大同大學'])list.append(element('div','',t));
 info.append(list);const actions=element('div','intro-actions');
 actions.append(button('開始提問','intro-primary',()=>{closeModal();route('chat');$('question').focus()}));
 actions.append(button('常見問題','intro-secondary',()=>{closeModal();route('chat');$('suggestions').scrollIntoView({block:'nearest',behavior:'smooth'})}));
 actions.append(button('校園導航','intro-secondary',()=>{closeModal();route('map')}));
 wrap.append(info,actions,element('p','modal-foot','身分僅用於資訊導覽，不是登入，也不會驗證學籍。'));
 showModal(wrap,true);
}
function toggleSidebar(){
 const collapsed=document.body.classList.toggle('sidebar-collapsed');
 storageSet(SIDEBAR_KEY,collapsed?'1':'0');
 const b=$('sidebar-collapse');b.setAttribute('aria-expanded',String(!collapsed));
 b.querySelector('span').textContent=collapsed?'展開側欄':'收合側欄';
 b.title=collapsed?'展開左側選單':'收合左側選單';b.setAttribute('aria-label',b.title);
}
function showModal(content,compact=false){const dialog=$('modal');dialog.replaceChildren();dialog.classList.toggle('compact',compact);dialog.append(content);$('modal-overlay').classList.remove('hidden');state.lastFocus=document.activeElement;dialog.querySelector('button')?.focus()}
function closeModal(){const outer=$('modal-overlay');outer.classList.add('hidden');$('modal').replaceChildren();state.lastFocus?.focus?.();state.lastFocus=null}
function modalHeading(title,subtitle,closeable=true){const wrapper=element('div');const head=element('div','modal-head');const label=element('div','modal-title');label.append(element('h2','',title),element('p','',subtitle));head.append(label);if(closeable){const x=button('','modal-close',()=>{if(!state.role)setRole('visitor');else closeModal()});x.append(icon('close'));x.setAttribute('aria-label','關閉對話框');head.append(x)}wrapper.append(head);return wrapper}
function showRolePicker(){const wrapper=modalHeading('歡迎來到 Uni-Bean','先選擇你的身分，我們會提供更合適的校務資訊。');const grid=element('div','role-grid');for(const r of ROLES){const card=button('','role-card',()=>setRole(r.id));card.append(element('span','role-emoji',r.symbol),element('strong','',r.name),element('small','',r.desc));grid.append(card)}wrapper.append(grid,element('p','modal-foot','身分僅用於資訊導覽，不需要學號或登入。隨時可以重新切換。'));showModal(wrapper)}
function route(view){if(!NAV[view])return;state.view=view;document.querySelectorAll('[data-page]').forEach(x=>{x.classList.toggle('active',x.dataset.page===view);if(x.dataset.page===view)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current')});document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.dataset.view===view));$('breadcrumb').textContent=NAV[view];if(view==='mine')renderProfile();if(view==='resources')loadResources();if(view==='chat'){renderChat();$('chat-scroll').scrollTop=$('chat-scroll').scrollHeight}else{const current=document.querySelector('.view.active');if(current)current.scrollTop=0}}
function renderSuggestions(){const grid=$('suggestions');grid.replaceChildren();$('suggest-title').textContent=role().name+'常見提問';role().questions.forEach(q=>{const b=button(q,'suggestion',()=>ask(q));b.append(icon('arrow'));grid.append(b)})}
function renderChat(){const session=currentSession()||freshSession(),host=$('messages');host.replaceChildren();$('chat-hero').classList.toggle('hidden',session.messages.length>0);
 for(const m of session.messages){const item=element('article','message '+(m.type==='user'?'mine':'ai'));if(m.type==='assistant'){const a=element('div','avatar'),img=document.createElement('img');img.src=url('assets/mascot.png');img.alt='豆豆';a.append(img);item.append(a)}const box=element('div','bubble');if(m.type==='assistant'){
   const label=element('span','mode-note',({rag:'智慧摘要 · RAG',retrieval_only:'文件查詢摘要',no_evidence:'尚無足夠資料',expired:'時效查詢提醒'}[m.mode]||'校務服務'));box.append(label);
   const fullText=String(m.text||'');
   const isLong=fullText.length>225;
   const answer=element('div','answer-text',isLong?fullText.slice(0,200).trimEnd()+'…':fullText);
   box.append(answer);
   if(isLong){
     const expand=button('展開完整回答','answer-expand',()=>{
       const expanded=expand.getAttribute('aria-expanded')==='true';
       expand.setAttribute('aria-expanded',String(!expanded));
       expand.textContent=expanded?'展開完整回答':'收起詳細回答';
       answer.textContent=expanded?fullText.slice(0,200).trimEnd()+'…':fullText;
     });
     expand.setAttribute('aria-expanded','false');box.append(expand);
   }
   if(m.sources?.length){
     const details=element('details','citation-details');
     details.append(element('summary','','資料來源（'+m.sources.length+'） · 點擊查看原文'));
     const list=element('div','citation-list');
     for(const src of m.sources.slice(0,6)){
       const row=element('div','citation-entry');
       const title=element('span','',src.title||'校務文件');row.append(title);
       const a=safeLink(src.url,'查看原始來源 ↗','citation-link');
       row.append(a||element('small','unverified','尚無可連結網址'));
       if(!src.verified_official)row.append(element('small','unverified','尚未人工核實'));
       list.append(row);
     }
     details.append(list);box.append(details);
   }
   if(m.warning)box.append(element('div','warning-note',m.warning));
   const actions=element('div','message-actions');if(m.sources?.length)actions.append(button('查看來源','',()=>showSources(m.sources),'book'));
   if(m.mode!=='service_error'){actions.append(button('有幫助',m.feedback===1?'selected':'',()=>giveFeedback(m,1),'thumbs'));
   actions.append(button('需改善',m.feedback===-1?'selected':'',()=>showFeedback(m),'alert'))}
   actions.append(button('複製','',async()=>{if(!navigator.clipboard?.writeText){toast('此連線環境無法直接複製，請長按回答選取文字');return}try{await navigator.clipboard.writeText(m.text);toast('已複製回答')}catch{toast('請長按回答選取文字複製')}} ,'copy'));
   actions.append(button('收藏',state.favorites.some(f=>f.messageId===m.id)?'selected':'',()=>toggleFavorite(m),'heart'));
   if('speechSynthesis' in window) actions.append(button('朗讀','',()=>{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(m.text);u.lang='zh-TW';speechSynthesis.speak(u)},'volume'));
   box.append(actions)
 }else{box.textContent=m.text}item.append(box);host.append(item)}
 if(state.busy){const item=element('div','message ai pending');const avatar=element('div','avatar');const img=document.createElement('img');img.src=url('assets/mascot.png');img.alt='';avatar.append(img);item.append(avatar,element('div','bubble','正在檢索校務資料，整理有來源的回答…'));host.append(item)}
 if(session.messages.length || state.busy) requestAnimationFrame(()=>$('chat-scroll').scrollTop=$('chat-scroll').scrollHeight); else $('chat-scroll').scrollTop=0;
}
async function ask(raw){const question=String(raw||'').trim();if(question.length<2){toast('請輸入至少兩個字的問題');return}if(state.busy)return;route('chat');const session=currentSession()||freshSession();session.messages.push({type:'user',id:safeId(),text:question});if(session.messages.length===1)session.title=question.slice(0,40);session.created=session.created||new Date().toISOString();if(previewObjectUrl){toast('圖片只有本機預覽，不會傳給 AI；本次僅以文字進行問答。');clearImagePreview()}persist();$('question').value='';$('question').style.height='auto';state.busy=true;$('send-button').disabled=true;renderChat();try{
 const res=await fetch(api('/api/chat'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,role:state.role||'visitor'})});const data=await res.json();if(!res.ok)throw new Error(typeof data.detail==='string'?data.detail:'服務目前無法完成查詢');session.messages.push({type:'assistant',id:safeId(),text:String(data.answer||'系統沒有傳回回答'),sources:Array.isArray(data.sources)?data.sources:[],mode:data.mode||'retrieval_only',warning:data.warning||'',feedback:0});
 }catch(err){session.messages.push({type:'assistant',id:safeId(),text:'暫時無法連接校務問答服務：'+err.message+'。請確認 FastAPI 已啟動，或稍後再試。',sources:[],mode:'service_error',warning:'這不是正式校務回答。',feedback:0});}finally{state.busy=false;$('send-button').disabled=false;persist();renderChat()}}
function showSources(sources){const wrap=modalHeading('回答引用來源','可點擊連結查閱原始公告或文件');for(const src of sources){const card=element('div','source-card');card.append(element('strong','',`來源 ${src.id}｜${src.title||'未命名文件'}`));const meta=[src.department,src.academic_year&&`學年度：${src.academic_year}`,src.reviewed_on&&`檢視：${src.reviewed_on}`].filter(Boolean).join(' · ');if(meta)card.append(element('div','source-meta',meta));card.append(element('p','',src.excerpt||''));if(src.expired)card.append(element('small','unverified','已標示過期'));else if(!src.verified_official)card.append(element('small','unverified','尚未完成人工核實'));const link=safeLink(src.url,'開啟原始文件 ↗');if(link)card.append(element('div'),link);wrap.append(card)}showModal(wrap)}
async function giveFeedback(message,rating,reason='none',comment=''){try{const result=await fetch(api('/api/feedback'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating,mode:['rag','retrieval_only','no_evidence','expired'].includes(message.mode)?message.mode:'retrieval_only',reason,comment})});if(!result.ok){const d=await result.json().catch(()=>({}));throw new Error(d.detail||'回饋提交失敗')}message.feedback=rating;persist();renderChat();closeModal();toast('已收到回饋，謝謝你協助改善 Uni-Bean。')}catch(err){toast(String(err.message))}}
function showFeedback(message){const form=modalHeading('告訴我們哪裡可以更好','你的回饋會提供給管理者參考，不會自動改寫校務規定。');const container=element('div','form-field'),label=element('label','','需要改善的原因');label.htmlFor='feedback-reason';const select=element('select');select.id='feedback-reason';[['incorrect','內容可能有誤'],['outdated','資訊可能過期'],['missing_source','缺少來源'],['unclear','說明不清楚'],['other','其他']].forEach(([v,t])=>{const opt=element('option','',t);opt.value=v;select.append(opt)});container.append(label,select);const note=element('div','form-field'),nl=element('label','','補充說明（選填，最多 300 字）');nl.htmlFor='feedback-comment';const textarea=element('textarea');textarea.id='feedback-comment';textarea.maxLength=300;textarea.rows=3;textarea.placeholder='請不要輸入學號、電話等個人資料';note.append(nl,textarea);form.append(container,note,button('送出回饋','modal-submit',()=>giveFeedback(message,-1,select.value,textarea.value)));showModal(form,true)}
function toggleFavorite(message){const index=state.favorites.findIndex(x=>x.messageId===message.id);if(index>=0){state.favorites.splice(index,1);toast('已取消收藏')}else{state.favorites.unshift({messageId:message.id,text:message.text,mode:message.mode,when:new Date().toISOString()});toast('已加入我的收藏')}persist();renderChat()}
function renderProfile(){$('profile-role').textContent=role().name;const history=$('history-list');history.replaceChildren();const sessions=state.sessions.filter(s=>s.messages.length);if(!sessions.length)history.append(element('div','history-empty','目前沒有歷史對話，開始提問後就會出現在這裡。'));else for(const session of sessions){const row=element('div','history-item'),left=element('div','left');left.append(element('strong','',session.title),element('small','',new Date(session.created).toLocaleString('zh-TW')));row.append(left,button('開啟','',()=>{state.activeId=session.id;route('chat')}));history.append(row)}const fav=$('favorite-list');fav.replaceChildren();if(!state.favorites.length)fav.append(element('div','history-empty','還沒有收藏回答。'));else for(const saved of state.favorites){const row=element('div','history-item'),left=element('div','left');left.append(element('strong','',saved.text.slice(0,95)),element('small','',new Date(saved.when).toLocaleString('zh-TW')));row.append(left,button('移除','',()=>{state.favorites=state.favorites.filter(x=>x.messageId!==saved.messageId);persist();renderProfile()}));fav.append(row)}}
function exportHistory(){const lines=['Uni-Bean 豆有所應｜本機對話匯出','匯出日期：'+new Date().toLocaleString('zh-TW'),'提醒：此檔包含你在本機儲存的對話，請妥善保管。',''];for(const s of state.sessions.filter(x=>x.messages.length)){lines.push('＝＝ '+s.title+' ＝＝');for(const m of s.messages){lines.push((m.type==='user'?'【提問】':'【回答】')+'\n'+m.text);if(m.sources?.length)for(const src of m.sources)lines.push('  來源：'+(src.title||'')+' '+(src.url||''));lines.push('')}}const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');const object=URL.createObjectURL(blob);a.href=object;a.download='Uni-Bean-對話紀錄.txt';a.click();setTimeout(()=>URL.revokeObjectURL(object),2500)}
function renderOffices(){const list=$('office-grid');list.replaceChildren();const keyword=$('office-search').value.trim().toLocaleLowerCase();const filtered=state.offices.filter(o=>(state.officeFilter==='全部'||o.category===state.officeFilter)&&(!keyword||[o.name,o.category,o.location,...(o.tags||[])].join(' ').toLowerCase().includes(keyword)));if(!filtered.length)list.append(element('div','history-empty','找不到符合條件的處室，試試其他關鍵字。'));for(const o of filtered){const card=element('article','office-card');card.append(element('span','cat',o.category||'校務服務'),element('h3','',o.name||'未命名處室'),element('p','office-desc',(o.location||'地點尚待確認')+' · '+(o.ext||'聯絡方式待查')));const tags=element('div','tags');(o.tags||[]).slice(0,4).forEach(t=>tags.append(element('span','',t)));card.append(tags);const footer=element('div','office-footer');footer.append(button('詢問相關業務','small-link',()=>ask(o.sampleQuestion||'請問'+o.name+'的相關業務？'),'arrow'));
 const official=safeLink(o.official_url,'處室官方網站 ↗','small-link');
 if(official){official.title='校方網站入口；最新業務及聯絡方式仍須核對';footer.append(official)}
 if(!o.verified)footer.append(element('small','unverified','聯絡資訊及地點待核實'));card.append(footer);list.append(card)}}
function renderBuilding(){const list=$('building-list');list.replaceChildren();const q=$('building-search').value.trim().toLowerCase();for(const b of state.buildings.filter(x=>(x.name||'').toLowerCase().includes(q))){const row=element('div','building-item');row.append(element('strong','',b.name),element('p','',b.summary||'地點資訊仍待確認'));const a=safeLink('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('大同大學 '+b.name),'搜尋建築 ↗');if(a)row.append(a);row.append(document.createTextNode('　'));const d=safeLink('https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent('大同大學 臺北市中山區'),'導航至大同大學校區 ↗');if(d)row.append(d);row.append(element('small','unverified','建築位置尚未核實，請核對地圖結果'));list.append(row)}if(!list.childElementCount)list.append(element('div','empty-small','找不到相符建築'))}
async function loadResources(){for(const [id,path,label] of [['announcement-list','api/announcements','公告'],['calendar-list','api/calendar','日程']]){const host=$(id);host.replaceChildren(element('div','empty-small','讀取中…'));try{const res=await fetch(api('/'+path),{cache:'no-store'});if(!res.ok)throw Error('伺服器無法提供資料');const json=await res.json(),items=json.items||[];host.replaceChildren();if(!items.length){host.append(element('div','empty-small',label==='公告'?'目前尚未由管理端發布公告。':'目前尚未匯入已核實的官方校務日期。'));continue}for(const raw of items.slice(0,20)){const row=element('div','resource-item');row.append(element('strong','',raw.title));if(raw.body)row.append(element('p','',raw.body));row.append(element('small','',label==='公告'?(raw.department||'')+' · '+(raw.created_at||''):(raw.date||'')+' · '+(raw.department||'')));const link=safeLink(raw.source_url,'查看資料來源 ↗');if(link)row.append(element('div'),link);else if(label==='公告')row.append(element('small','unverified','管理端新增公告 · 尚無官方來源網址'));host.append(row)}}catch{host.replaceChildren(element('div','empty-small',label+'目前無法載入，請確認 FastAPI 正在執行。'))}}}
async function checkHealth(){try{const res=await fetch(api('/api/health'),{cache:'no-store'}),data=await res.json();if(!res.ok||!data.ok)throw Error('offline');$('health-pill').classList.add('ok');$('health-pill').querySelector('span').textContent='服務已連線'}catch{$('health-pill').classList.add('error');$('health-pill').querySelector('span').textContent='後端尚未連線'}}
async function loadStaticData(){try{const [a,b]=await Promise.all([fetch(url('assets/offices.json')).then(r=>r.json()),fetch(url('assets/buildings.json')).then(r=>r.json())]);state.offices=Array.isArray(a)?a:[];state.buildings=Array.isArray(b)?b:[];const types=['全部',...new Set(state.offices.map(x=>x.category||'其他'))];const filterHost=$('office-filters');types.forEach(t=>filterHost.append(button(t,t==='全部'?'active':'',()=>{state.officeFilter=t;[...filterHost.children].forEach(n=>n.classList.toggle('active',n.textContent===t));renderOffices()})));renderOffices();renderBuilding()}catch{toast('行政與建築資料暫時無法載入')}}
function clearImagePreview(){if(previewObjectUrl)URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=null;$('image-preview-input').value='';$('attachment-preview').replaceChildren();$('attachment-preview').classList.add('hidden')}
function showImagePreview(file){clearImagePreview();if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>4*1024*1024){toast('僅可預覽小於 4 MB 的 JPG、PNG、WebP 圖片');return}previewObjectUrl=URL.createObjectURL(file);const host=$('attachment-preview');const image=document.createElement('img');image.src=previewObjectUrl;image.alt='選取圖片預覽';const note=element('span','','本機圖片預覽：不會上傳、辨識或提供給 AI');host.append(image,note,button('移除','',clearImagePreview));host.classList.remove('hidden')}
function setup(){if(storageGet(SIDEBAR_KEY)==='1'){document.body.classList.add('sidebar-collapsed');$('sidebar-collapse').setAttribute('aria-expanded','false');$('sidebar-collapse').querySelector('span').textContent='展開側欄'}$('sidebar-collapse').addEventListener('click',toggleSidebar);if(!Array.isArray(state.sessions))state.sessions=[];if(!Array.isArray(state.favorites))state.favorites=[];if(!currentSession())freshSession();if(!ROLES.some(r=>r.id===state.role))state.role='';$('current-role').textContent=state.role?role().name:'選擇身分';$('profile-role').textContent=state.role?role().name:'尚未選擇';document.querySelectorAll('[data-page]').forEach(n=>n.addEventListener('click',()=>route(n.dataset.page)));$('role-switch').addEventListener('click',showRolePicker);$('change-role').addEventListener('click',showRolePicker);$('new-chat').addEventListener('click',()=>{freshSession();route('chat');$('question').focus()});$('chat-form').addEventListener('submit',e=>{e.preventDefault();ask($('question').value)});$('question').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('chat-form').requestSubmit()}});$('image-preview-input').addEventListener('change',e=>showImagePreview(e.target.files[0]));$('question').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,140)+'px'});const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(SpeechRecognition&&window.isSecureContext){const mic=$('voice-input');mic.classList.remove('hidden');mic.addEventListener('click',()=>{try{const rec=new SpeechRecognition();rec.lang='zh-TW';rec.interimResults=false;rec.onresult=e=>{$('question').value=e.results[0][0].transcript;$('question').focus()};rec.onerror=e=>toast('語音辨識無法使用：'+e.error);rec.onend=()=>mic.classList.remove('listening');rec.start();mic.classList.add('listening');toast('正在聆聽，語音可能由瀏覽器服務處理，請勿說出個資。')}catch{toast('目前瀏覽器不支援語音輸入')}})};$('office-search').addEventListener('input',renderOffices);$('building-search').addEventListener('input',renderBuilding);$('export-history').addEventListener('click',exportHistory);$('clear-history').addEventListener('click',()=>{if(!confirm('確定清除這台裝置上的全部對話紀錄？無法復原。'))return;state.sessions=[];freshSession();renderProfile();renderChat();toast('對話紀錄已清除')});$('modal-overlay').addEventListener('click',e=>{if(e.target===$('modal-overlay')){if(!state.role)setRole('visitor');else closeModal()}});window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal-overlay').classList.contains('hidden')){if(!state.role)setRole('visitor');else closeModal()}});renderSuggestions();renderChat();loadStaticData();loadResources();checkHealth();if(!state.role)setTimeout(showRolePicker,180);if('serviceWorker' in navigator){const local=location.protocol==='http:';if(local){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));if('caches' in window)caches.keys().then(keys=>keys.filter(k=>k.startsWith('uni-bean-')).forEach(k=>caches.delete(k)))}else if(location.protocol==='https:'){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}))}}}
setup();
