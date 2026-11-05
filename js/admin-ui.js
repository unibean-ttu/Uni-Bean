/** Admin UI has no embedded passwords. All writes require HttpOnly session + CSRF. */
let csrf='';let editingFAQ=null,editingAnnouncement=null;const $=id=>document.getElementById(id);
function line(t,p,c=''){const e=document.createElement(t);if(c)e.className=c;if(p!==undefined)e.textContent=String(p);return e}
function status(message){const s=$('status')||$('message');if(s){s.classList.remove('hidden');s.textContent=String(message)}}
async function request(path,opts={}){
 if(location.protocol==='file:')throw new Error('不能直接雙擊後台 HTML；請用 VS Code 啟動 python run.py，再開啟 http://127.0.0.1:8765/login.html');const headers={...opts.headers};if(csrf&&opts.method&&opts.method!=='GET')headers['X-CSRF-Token']=csrf;
 if(opts.body)headers['Content-Type']='application/json';const res=await fetch(path,{credentials:'same-origin',...opts,headers});let json={};try{json=await res.json()}catch{}
 if(!res.ok)throw new Error(json.detail||`HTTP ${res.status}`);return json}
function objectForm(form){return Object.fromEntries(new FormData(form).entries())}
function card(host,title,value){const box=line('div',undefined,'stat');box.append(line('strong',value),line('span',title));host.append(box)}
function link(url){if(!url)return null;try{const parsed=new URL(String(url));if(!['https:','http:'].includes(parsed.protocol))return null;const a=line('a','查看來源 ↗');a.href=parsed.href;a.target='_blank';a.rel='noopener noreferrer';return a}catch{return null}}
async function initLogin(){if(location.protocol==='file:'){status('請勿直接雙擊 login.html。請先執行 python run.py，再於 http://127.0.0.1:8765/login.html 登入。');$('login-form').querySelector('button').disabled=true;return}const f=$('login-form');f.addEventListener('submit',async e=>{e.preventDefault();const b=f.querySelector('button');b.disabled=true;try{const x=await request('/api/admin/login',{method:'POST',body:JSON.stringify({role:$('role').value,password:$('password').value})});location.href=x.role==='dev'?'./dev.html':'./staff.html'}catch(err){status(err.message)}finally{b.disabled=false}})}
async function auth(){if(location.protocol==='file:'){status('這是本機 HTML 預覽，無法操作管理功能。請在 VS Code 執行 python run.py，然後使用 http://127.0.0.1:8765/login.html 登入。');return null}try{const m=await request('/api/admin/me');csrf=m.csrf;return m.role}catch{location.replace('./login.html');return null}}
function annList(items){const root=$('announcements');root.replaceChildren();if(!items.length)root.append(line('p','尚未新增公告。','muted'));
 for(const it of items){const item=line('article',undefined,'item');item.append(line('strong',`${it.title}｜${it.department}`),line('p',it.body),line('small',it.created_at));if(link(it.source_url))item.append(link(it.source_url));
 const edit=line('button','編輯公告','btn ghost');edit.addEventListener('click',()=>{const f=$('announcement-form');f.elements.title.value=it.title;f.elements.body.value=it.body;f.elements.department.value=it.department;f.elements.source_url.value=it.source_url||'';editingAnnouncement=it.id;f.querySelector('button[type=submit]').textContent='儲存公告修改';f.scrollIntoView({behavior:'smooth',block:'start'})});item.append(edit);const del=line('button','刪除公告','btn danger');del.addEventListener('click',async()=>{if(!confirm('確定刪除此公告？'))return;try{await request(`/api/admin/announcements/${it.id}`,{method:'DELETE'});await reloadStaff()}catch(e){status(e.message)}});item.append(del);root.append(item)}}
function faqList(items){const root=$('faqs');root.replaceChildren();if(!items.length)root.append(line('p','目前沒有新增 FAQ。','muted'));
 for(const it of items){const el=line('article',undefined,'item');el.append(line('strong',it.question),line('p',it.answer),line('small',`${it.department}｜${it.academic_year||'學年度待核實'}｜尚未人工核實`));if(link(it.source_url))el.append(link(it.source_url));
 const edit=line('button','編輯 FAQ','btn ghost');edit.addEventListener('click',()=>{const f=$('faq-form');f.elements.question.value=it.question;f.elements.answer.value=it.answer;f.elements.department.value=it.department;f.elements.source_url.value=it.source_url||'';f.elements.academic_year.value=it.academic_year||'';editingFAQ=it.id;f.querySelector('button[type=submit]').textContent='儲存 FAQ 修改';f.scrollIntoView({behavior:'smooth',block:'start'})});el.append(edit);const del=line('button','刪除 FAQ','btn danger');del.addEventListener('click',async()=>{if(!confirm('刪除後會重建索引，確定？'))return;try{await request(`/api/admin/faqs/${it.id}`,{method:'DELETE'});await reloadStaff()}catch(e){status(e.message)}});el.append(del);root.append(el)}}
async function reloadStaff(){const [stats,ann,faq]=await Promise.all([request('/api/admin/stats'),request('/api/announcements'),request('/api/admin/faqs')]);const host=$('stats');host.replaceChildren();card(host,'知識文件數',stats.documents);card(host,'索引段落數',stats.chunks);card(host,'公告數',stats.announcements);card(host,'匿名回饋筆數',(stats.feedback||[]).reduce((a,b)=>a+b.count,0));annList(ann.items||[]);faqList(faq.items||[]);await loadRecords()}
async function initStaff(){await reloadStaff();const filter=$('review-filter');if(filter)filter.addEventListener('change',loadRecords);const upload=$('upload-form');if(upload)upload.addEventListener('submit',async e=>{e.preventDefault();const b=upload.querySelector('button[type=submit]');b.disabled=true;try{const body=new FormData(upload);const r=await fetch('/api/admin/upload',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':csrf},body});let json={};try{json=await r.json()}catch{}if(!r.ok)throw new Error(json.detail||'上傳失敗');status(json.warning+' '+(json.errors?.length?'請查看錯誤：'+json.errors.join('；'):'請進一步人工核實來源'));upload.reset();await reloadStaff()}catch(err){status(err.message)}finally{b.disabled=false}});for(const [id,path] of [['announcement-form','/api/admin/announcements'],['faq-form','/api/admin/faqs']]){
 const form=$(id);form.addEventListener('submit',async e=>{e.preventDefault();const b=form.querySelector('button[type=submit]');b.disabled=true;try{const isFaq=path.endsWith('/faqs');const currentId=isFaq?editingFAQ:editingAnnouncement;const target=currentId?path+'/'+encodeURIComponent(currentId):path;const result=await request(target,{method:currentId?'PUT':'POST',body:JSON.stringify(objectForm(form))});status(result.warning||'已儲存；前台將顯示更新內容。');form.reset();if(isFaq)editingFAQ=null;else editingAnnouncement=null;b.textContent=isFaq?'儲存並更新 BM25 索引':'發布至前台公告欄';await reloadStaff()}catch(err){status(err.message)}finally{b.disabled=false}})}}
async function initDev(){const h=$('backend-api-status');if(h){try{const r=await request('/api/health');h.textContent='後端 API 已連線 · Uni-Bean v'+(r.version||'版本待確認')}catch(e){h.textContent='API 無法連線：'+e.message}}const data=await request('/api/admin/stats');const host=$('stats');host.replaceChildren();card(host,'文件',data.documents);card(host,'段落',data.chunks);card(host,'公告',data.announcements);card(host,'檢索','SQLite FTS5 / BM25');
  try { const crawl = await request('/api/admin/crawler-status');
    card(host,'爬蟲上限／每分鐘',crawl.limits.max_requests_per_minute);
    card(host,'爬蟲上限／每小時',crawl.limits.max_requests_per_hour);
    card(host,'近 1 分鐘請求數',crawl.usage.last_minute);
    card(host,'近 1 小時請求數',crawl.usage.last_hour);
    card(host,'最近一輪頁面',crawl.last_run?.crawl?.visited ?? '尚未執行');
    card(host,'最近更新文件數',crawl.last_run?.crawl?.updated ?? '尚未執行');
  } catch (err) { card(host,'爬蟲狀態','尚無統計或無法連線'); }
 try{const model=await request('/api/admin/model-status');const host=$('model-status');host.replaceChildren();host.append(line('strong', model.ready?'模型可使用':'模型尚未就緒'));host.append(line('p','設定模型：'+model.selected));host.append(line('p',model.online?'Ollama 服務已連線；已下載模型：'+(model.installed.join('、')||'無'):'Ollama 尚未連線：RAG 將退回純檢索模式。'))}catch(err){status('模型檢查失敗：'+err.message)}
 const table=$('role-stats');table.replaceChildren();for(const d of data.role_usage||[]){const p=line('p',`${d.role}：${d.count} 次`,'item');table.append(p)}if(!data.role_usage?.length)table.textContent='尚無匿名角色查詢資料。';
 const feed=$('feedback-stats');feed.replaceChildren();for(const d of data.feedback||[])feed.append(line('p',`${d.mode}｜${d.rating===1?'正向':'負向'}：${d.count} 筆`,'item'));if(!data.feedback?.length)feed.textContent='目前沒有匿名回饋。';
 $('sandbox-form').addEventListener('submit',async e=>{e.preventDefault();try{const x=await request(`/api/search?q=${encodeURIComponent($('sandbox-query').value)}`);const target=$('sandbox-result');target.replaceChildren();if(!x.sources?.length)target.textContent='沒有足夠文件證據';for(const item of x.sources||[]){const c=line('div',undefined,'item');c.append(line('strong',item.title||'未知來源'),line('p',item.excerpt||item.snippet||item.content||''));if(link(item.url||item.source_url))c.append(link(item.url||item.source_url));target.append(c)}}catch(e){status(e.message)}})}
async function init(){if($('login-form'))return initLogin();const role=await auth();if(!role)return;
 const changeAccount=$('switch-admin-account');
 if(changeAccount)changeAccount.addEventListener('click',async()=>{
   if(!confirm('切換管理帳號會登出目前帳號；請先儲存正在編輯的內容。確定繼續？'))return;
   changeAccount.disabled=true;
   try{await request('/api/admin/logout',{method:'POST'});location.assign('./login.html')}
   catch(e){status('切換管理帳號失敗：'+e.message);changeAccount.disabled=false}
 });
 if($('logout'))$('logout').addEventListener('click',async()=>{try{await request('/api/admin/logout',{method:'POST'});location.href='./login.html'}catch(e){status(e.message)}});
 if($('faq-form')&&role!=='staff'&&role!=='dev'){location.replace('./login.html');return}
 try{if($('faq-form'))await initStaff();if($('sandbox-form')){if(role!=='dev'){status('此帳號沒有開發者權限');return}await initDev()}}catch(e){status(e.message)}}
init();


async function loadRecords(){
  const feedback=$('feedback-detail'),docs=$('document-list');
  if(!feedback||!docs)return;
  try {const data=await request('/api/admin/feedback');feedback.replaceChildren();
    if(!data.items?.length)feedback.append(line('div','目前沒有使用者回饋','item muted'));
    for(const f of data.items||[]){const item=line('div',undefined,'item');item.append(line('strong',(f.rating===1?'有幫助':'需改善')+' · '+f.reason+' · '+f.mode),line('small',f.created_at));if(f.comment)item.append(line('p',f.comment));
     if(f.question){item.append(line('p','使用者自願提供的問題：'+f.question));if(f.answer_excerpt)item.append(line('p','回答摘要：'+f.answer_excerpt));try{for(const url of JSON.parse(f.source_urls||'[]')){const node=link(url);if(node)item.append(node)}}catch{}}
     item.append(line('small','案件狀態：'+(f.status||'open')+(f.resolution?' · 更正紀錄：'+f.resolution:'')));
     const select=line('select');[['open','待處理'],['in_review','處理中'],['resolved','已完成']].forEach(([v,t])=>{const op=line('option',t);op.value=v;select.append(op)});select.value=f.status||'open';
     const note=line('input');note.placeholder='更正處理說明（建議附上 FAQ 或來源）';note.value=f.resolution||'';note.maxLength=500;
     const action=line('button','更新案件狀態','btn ghost');action.type='button';action.addEventListener('click',async()=>{try{await request(`/api/admin/feedback/${f.id}`,{method:'PATCH',body:JSON.stringify({status:select.value,resolution:note.value})});status('案件狀態已更新');await loadRecords()}catch(e){status('無法更新案件：'+e.message)}});
     item.append(select,note,action);feedback.append(item)}
  } catch(err){feedback.textContent='回饋載入失敗：'+err.message}
  try {const data=await request('/api/admin/documents');docs.replaceChildren();
    const filter=$('review-filter')?.value||'pending';
    const source=data.items||[];const pending=source.filter(x=>!x.verified_official);
    if($('review-count'))$('review-count').textContent=`待核實 ${pending.length} 筆／全部 ${source.length} 筆；官方網址不等於內容已核實`;
    const shown=source.filter(x=>filter==='all'||(filter==='pending'&&!x.verified_official)||(filter==='verified'&&x.verified_official));
    if(!shown.length)docs.append(line('div','知識庫尚無文件，請使用文件匯入流程。','item muted'));
    for(const row of shown){const item=line('div',undefined,'item');item.append(line('strong',row.title));item.append(line('small',(row.department||'未分類')+' · '+(row.verified_official?'已人工核實官方來源':'尚未人工核實')+(row.is_demo?' · 專題測試資料':'')));if(link(row.source_url))item.append(link(row.source_url));if(!row.verified_official&&row.source_url&&(/^https:\/\/([a-z0-9-]+\.)*ttu\.edu\.tw(\/|$)/i).test(row.source_url)){const btn=line('button','已逐項核對官方原文，標記核實','btn ghost');btn.addEventListener('click',async()=>{if(!confirm('你已查閱官方原文並確認文件標題、適用學年度及內容正確嗎？'))return;try{const result=await request('/api/admin/documents/verify',{method:'POST',body:JSON.stringify({filepath:row.filepath})});status(result.warning);await reloadStaff()}catch(err){status(err.message)}});item.append(btn)}docs.append(item)}
  } catch(err){docs.textContent='知識庫清單載入失敗：'+err.message}
  const suggestions=$('review-suggestions');
  if(!suggestions)return;
  try{
    const data=await request('/api/admin/review-queue');
    suggestions.replaceChildren();
    suggestions.append(line('p',`共有 ${data.needs_attention} 筆文件有待檢查項目（本清單最多顯示 200 筆）`,'muted'));
    for(const item of (data.items||[]).slice(0,40)){
      const row=line('div',undefined,'review-item');
      row.append(line('strong',item.title||'未命名文件'),line('small',(item.reasons||[]).join(' · ')));
      const href=link(item.source_url);if(href)row.append(href);
      suggestions.append(row);
    }
    if(!data.items?.length)suggestions.append(line('p','目前沒有自動發現的待辦事項；仍需按校務更新週期人工巡查。','muted'));
  }catch(e){suggestions.replaceChildren(line('p','核實待辦載入失敗：'+e.message,'muted'))}
}
