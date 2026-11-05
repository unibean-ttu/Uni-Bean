/** v9.4 dashboard enhancements, read-only: live values, no demo metrics. */
const $ = id => document.getElementById(id);
const node=(tag,cls='',text='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=String(text);return n};
async function read(path){const r=await fetch(path,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json()}
function put(id,value){const n=$(id);if(n)n.textContent=String(value)}
function list(id,items,empty='目前沒有資料'){
 const root=$(id);if(!root)return;root.replaceChildren();
 if(!items.length){root.append(node('p','muted',empty));return}
 items.forEach(({title,sub,flag,good})=>{
  const r=node('div','clean-row');const d=node('div','');d.append(node('strong','',title),node('small','',sub||''));r.append(d);
  if(flag)r.append(node('span','row-flag'+(good?' good':''),flag));root.append(r)
 });
}
const labelReason = text => String(text||'').slice(0,80);
async function staffDashboard(){
 const [stats,queue,faq,fb]=await Promise.all([
  read('/api/admin/stats'),read('/api/admin/review-queue'),read('/api/admin/faqs'),read('/api/admin/feedback')
 ]);
 const total=(stats.feedback||[]).reduce((sum,row)=>sum+(Number(row.count)||0),0);
 put('staff-pending',queue.needs_attention??'—');put('staff-published',stats.announcements??'—');
 put('staff-faq',Array.isArray(faq.items)?faq.items.length:'—');put('staff-feedback',total);
 list('staff-pending-preview',(queue.items||[]).slice(0,4).map(x=>({title:x.title||'未命名文件',sub:(x.reasons||[]).join(' · '),flag:'待核實'})),'目前沒有自動辨識的核實待辦，仍須定期人工確認。');
 list('staff-feedback-preview',(fb.items||[]).slice(0,4).map(x=>({title:(x.rating===1?'有幫助':'需改善')+' · '+(x.reason||'未分類'),sub:(x.created_at||'')+(x.comment?' · '+labelReason(x.comment):''),flag:x.rating===1?'正面':'待處理',good:x.rating===1})),'目前沒有匿名回饋。');
}
async function devDashboard(){
 const [health,stats,model,crawler]=await Promise.allSettled([
   read('/api/health'),read('/api/admin/stats'),read('/api/admin/model-status'),read('/api/admin/crawler-status')
 ]);
 const ok=r=>r.status==='fulfilled';
 put('dev-api',ok(health)&&health.value.ok?'運作中':'無法確認');
 put('dev-api-sub',ok(health)?`FastAPI v${health.value.version||'未取得'}`:'健康檢查失敗');
 put('dev-index',ok(stats)?stats.value.chunks??'—':'未取得');
 put('dev-index-sub',ok(stats)?`文件 ${stats.value.documents??'—'} 份 · 索引段落數`:'無法取得索引統計');
 put('dev-ollama',ok(model)?(model.value.ready?'可使用':'未就緒'):'無法確認');
 put('dev-ollama-sub',ok(model)?`設定模型：${model.value.selected||'未知'}`:'模型檢查失敗');
 put('dev-crawler',ok(crawler)?(crawler.value.running?'執行中':'未執行／未確認'):'無法確認');
 put('dev-crawler-sub',ok(crawler)?`已追蹤網址：${crawler.value.urls_total??'—'}`:'無法讀取爬蟲紀錄');
 list('dev-model-summary',ok(model)?[
   {title:'Ollama 服務',sub:model.value.online?'已連到本地服務':'未連線',flag:model.value.online?'已連線':'未連線',good:model.value.online},
   {title:'Qwen 模型',sub:'設定：'+(model.value.selected||'未設定'),flag:model.value.ready?'已下載':'待確認',good:model.value.ready},
   {title:'全文檢索',sub:'SQLite FTS5 / BM25',flag:ok(stats)?'可查統計':'未知',good:ok(stats)}
 ]:[],'無法取得模型資訊。');
 const c=ok(crawler)?crawler.value:null;
 list('dev-crawler-summary',c?[
  {title:'爬蟲目前狀態',sub:'爬蟲是獨立 Python 程序，不隨網站啟動',flag:c.running?'執行中':'未確認',good:c.running},
  {title:'近一小時請求',sub:'依限速與 robots 規則執行',flag:String(c.usage?.last_hour??'—')+' 次'},
  {title:'最近一輪更新',sub:c.last_run?'請前往爬蟲頁查看完整紀錄':'尚無最近執行紀錄',flag:c.last_run?String(c.last_run.crawl?.updated??'—')+' 份':'尚無'}
 ]:[],'目前無法讀取爬蟲統計');
 list('dev-environment-summary',ok(health)?[
  {title:'系統版本',sub:'後端回報版本',flag:health.value.version||'—'},
  {title:'Python',sub:'伺服器執行環境',flag:health.value.python_version||'—'},
  {title:'檢索模組',sub:'從後端回報',flag:'FTS5/BM25'}
 ]:[],'後端無法提供環境資訊');
}
async function refresh(){
 put('admin-system-status','正在讀取系統資料…');
 try{const auth=await read('/api/admin/me');if(!auth.role)return;
  if(document.body.classList.contains('staff-dashboard'))await staffDashboard();
  else if(auth.role==='dev')await devDashboard();
  put('admin-system-status','● 後端已連線');
 }catch(err){put('admin-system-status','無法讀取資料 · '+err.message)}
}
function navigate(tab,target){
 const button=document.querySelector(`[data-admin-tab="${tab}"]`);
 if(!button)return;button.click();
 if(target){requestAnimationFrame(()=>document.getElementById(target)?.scrollIntoView({behavior:'smooth',block:'start'}))}
}
document.querySelectorAll('[data-admin-open]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.adminOpen,button.dataset.scrollTo)));
$('dev-refresh')?.addEventListener('click',refresh);
refresh();

const adminToggle=$('admin-sidebar-toggle');
adminToggle?.addEventListener('click',()=>{const collapsed=document.body.classList.toggle('admin-rail-collapsed');adminToggle.setAttribute('aria-expanded',String(!collapsed))});
