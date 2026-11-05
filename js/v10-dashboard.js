/** v10.0 – presentation-side real-data helpers; never creates demo metrics or events. */
const $=id=>document.getElementById(id);
const clean=(v)=>String(v??'');
async function read(url){const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json()}
function appendEvent(root,title,detail,state){const row=document.createElement('div');row.className='clean-row';const wrap=document.createElement('div');const strong=document.createElement('strong');strong.textContent=title;const small=document.createElement('small');small.textContent=detail;wrap.append(strong,small);row.append(wrap);if(state){const flag=document.createElement('span');flag.className='row-flag'+(state==='正常'?' good':'');flag.textContent=state;row.append(flag)}root.append(row)}
async function realEvents(){const host=$('v10-system-events');if(!host)return;host.textContent='正在檢查目前系統狀態…';try{
 const auth=await read('/api/admin/me');if(auth.role!=='dev')throw Error('需要開發者權限');
 const vals=await Promise.allSettled([read('/api/health'),read('/api/admin/model-status'),read('/api/admin/crawler-status')]);host.replaceChildren();
 if(vals[0].status==='fulfilled'){const h=vals[0].value;appendEvent(host,'FastAPI 健康檢查',`目前後端版本 ${h.version||'未知'}；文件 ${h.documents??'—'} 份`,h.ok?'正常':'異常')}
 else appendEvent(host,'API 健康檢查無法完成',clean(vals[0].reason?.message),'需確認');
 if(vals[1].status==='fulfilled'){const m=vals[1].value;appendEvent(host,'本地模型檢查',`Ollama：${m.online?'已連線':'未連線'}；設定 ${m.selected||'未設定'}`,m.ready?'正常':'待確認')}
 else appendEvent(host,'模型狀態未取得',clean(vals[1].reason?.message),'需確認');
 if(vals[2].status==='fulfilled'){const c=vals[2].value;appendEvent(host,'獨立爬蟲狀態',`執行中：${c.running?'是':'否'}；累計網址 ${c.urls_total??0}；最近錯誤：${c.last_error||'無已知紀錄'}`,c.running?'正常':'待確認')}
 else appendEvent(host,'爬蟲狀態未取得',clean(vals[2].reason?.message),'需確認');
 }catch(e){host.textContent='無法取得目前系統狀態：'+e.message}}
$('v10-refresh-events')?.addEventListener('click',realEvents);
$('v10-reindex')?.addEventListener('click',async()=>{
 if(!confirm('確定重新檢查已匯入文件並更新檢索索引？請先確認爬蟲未在更新文件。'))return;
 const button=$('v10-reindex');button.disabled=true;
 try{const me=await read('/api/admin/me');if(me.role!=='dev')throw Error('只有開發者可以執行索引更新');
 const r=await fetch('/api/admin/reindex',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':me.csrf}});const data=await r.json();if(!r.ok)throw Error(data.detail||`HTTP ${r.status}`);
 alert(`索引已檢查：${data.scanned} 份文件，更新 ${data.updated} 份，錯誤 ${(data.errors||[]).length} 項。`);
 await realEvents();
 }catch(e){alert('索引更新未完成：'+e.message)}finally{button.disabled=false}
});
$('v10-api-check')?.addEventListener('click',async()=>{try{const h=await read('/api/health');alert(`FastAPI ${h.ok?'正常':'異常'}\n版本：${h.version||'未知'}\n索引文件：${h.documents??'—'} 份`)}catch(e){alert('API 無法連線：'+e.message)}});
$('v10-export-state')?.addEventListener('click',async()=>{try{
 const me=await read('/api/admin/me');if(me.role!=='dev')throw Error('只有開發者可匯出狀態');
 const all=await Promise.allSettled([read('/api/health'),read('/api/admin/model-status'),read('/api/admin/crawler-status')]);
 const exportData={note:'Uni-Bean v10：此檔為即時狀態摘要，不是完整伺服器日誌；未包含密碼或使用者對話。',checked_at:new Date().toISOString(),health:all[0].status==='fulfilled'?all[0].value:null,model:all[1].status==='fulfilled'?all[1].value:null,crawler:all[2].status==='fulfilled'?all[2].value:null};
 const blob=new Blob([JSON.stringify(exportData,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='unibean-system-status.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
 }catch(e){alert('匯出失敗：'+e.message)}});
// Staff "資料核實" uses the existing authenticated review list.
for(const button of document.querySelectorAll('[data-v10-focus="review"]'))button.addEventListener('click',()=>{
 document.querySelectorAll('[data-admin-panel]').forEach(p=>p.hidden=p.dataset.adminPanel!=='review');
 document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.toggle('active',b===button));
 requestAnimationFrame(()=>document.getElementById('review-suggestions')?.scrollIntoView({block:'start',behavior:'smooth'}));
});
document.querySelector('[data-v10-dev-logs]')?.addEventListener('click',()=>{
 const overview=document.querySelector('[data-admin-tab="overview"]');overview?.click();realEvents();
 requestAnimationFrame(()=>$('v10-system-events')?.scrollIntoView({block:'center',behavior:'smooth'}));
});
if(document.body.classList.contains('dev-dashboard'))realEvents();

$('v10-admin-logout')?.addEventListener('click',()=>$('logout')?.click());
