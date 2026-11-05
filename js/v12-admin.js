/* Separate staff/dev review UI; same-origin HttpOnly cookie + explicit CSRF. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);let csrf='',role='';
 const el=(name,value,cls='')=>{const n=document.createElement(name);n.textContent=String(value??'');if(cls)n.className=cls;return n};
 const setStatus=s=>{$('message').textContent=s};
 async function req(path,opts={}){const headers={...opts.headers};if(opts.method&&opts.method!=='GET')headers['X-CSRF-Token']=csrf;
  if(opts.body)headers['Content-Type']='application/json';const r=await fetch(path,{...opts,headers,credentials:'same-origin',cache:'no-store'});
  let data={};try{data=await r.json()}catch{}if(!r.ok)throw Error(data.detail||`HTTP ${r.status}`);return data;
 }
 function sourceLink(url){try{const u=new URL(url);if(u.protocol!=='https:'||!(u.hostname==='ttu.edu.tw'||u.hostname.endsWith('.ttu.edu.tw')))return null;
  const a=el('a','官方原文 ↗');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a;}catch{return null}}
 async function update(id,status){if(!confirm(`確定將第 ${id} 筆公告標記為「${status}」？`))return;
  try{await req(`/api/v12/admin/candidates/${id}/review`,{method:'POST',body:JSON.stringify({status})});setStatus('已更新公告顯示狀態；不代表規章內容已核實。');await reload();}
  catch(e){setStatus(`更新失敗：${e.message}`)}
 }
 function renderCandidates(items){const host=$('candidates');host.replaceChildren();if(!items.length){host.append(el('p','沒有符合條件的公告候選資料。'));return}
  for(const x of items){const card=el('article','','card');card.append(el('h3',x.title||'未命名公告'),el('small',`${x.department||'發布單位待確認'} · ${x.published_at||'發布日期待確認'}`),el('small',`狀態：${x.display_status}`));
   if(x.excerpt)card.append(el('p',x.excerpt));const a=sourceLink(x.source_url);if(a)card.append(a);
   const actions=el('div','','actions');for(const [value,label] of [['approved','核准顯示'],['source_checked','恢復來源已檢查'],['hidden','隱藏']]){if(value===x.display_status)continue;const button=el('button',label);button.addEventListener('click',()=>update(x.id,value));actions.append(button)}
   card.append(actions);host.append(card)}
 }
 function renderRuns(items){const host=$('runs');host.replaceChildren();if(!items.length){host.append(el('p','沒有執行紀錄，或目前使用舊版爬蟲程序。'));return}
  for(const run of items){const card=el('article','','card audit');card.append(el('strong',`#${run.id} · ${run.status}`),el('p',`開始：${run.started_at}\n完成：${run.finished_at}`),el('p',`造訪 ${run.visited_count}｜更新 ${run.updated_count}｜失敗 ${run.error_count}`));host.append(card)}
 }
 async function reload(){try{const res=await req('/api/v12/admin/candidates?status='+encodeURIComponent($('filter').value));renderCandidates(res.items||[]);
   if(role==='dev'){const audit=await req('/api/v12/admin/crawl-runs');renderRuns(audit.items||[])}
  }catch(e){setStatus(`讀取失敗：${e.message}`)}}
 async function main(){try{const me=await req('/api/admin/me');role=me.role;csrf=me.csrf;
  if(!['staff','dev'].includes(role))throw Error('權限不足');setStatus(`已登入：${role}。公告核准與規章人工核實為不同程序。`);$('dev-audit').hidden=role!=='dev';$('filter').addEventListener('change',reload);$('refresh').addEventListener('click',reload);await reload();
 }catch(e){setStatus(`需要管理員登入：${e.message}。請先由原管理端登入。`);const a=el('a','前往管理員登入');a.href='./login.html';$('message').append(document.createTextNode(' '),a)}}
 main();
})();
