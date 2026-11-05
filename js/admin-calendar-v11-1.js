/** Version-level review: single authenticated staff action, with audit trail. */
const host=document.getElementById('v11-calendar-review');
if(host){
 const panel=document.createElement('section');panel.className='ub-calendar-batch';
 const desc=document.createElement('p');desc.textContent='可先開啟下方 PDF 確認版本。核對整份來源後，按一次即可發布所有日期；保留檔案 SHA-256 與管理者審核紀錄。這不是 AI 自動核實。';
 const button=document.createElement('button');button.type='button';button.className='btn';button.textContent='整份來源核對後批次發布';
 const info=document.createElement('p');info.setAttribute('role','status');info.className='muted';
 panel.append(desc,button,info);host.parentElement?.insertBefore(panel,host);
 button.addEventListener('click',async()=>{
  const ok=window.confirm('請確認已對照校方最新官方行事曆，且確定一次發布這份 PDF 的所有日期。是否繼續？');if(!ok)return;
  button.disabled=true;info.textContent='正在檢查來源並建立審核紀錄…';
  try{const session=await fetch('/api/admin/me',{credentials:'same-origin'}).then(r=>r.ok?r.json():Promise.reject(Error('管理員未登入')));
   const resp=await fetch('/api/admin/calendar-approve-batch',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},body:JSON.stringify({confirmed_official_source:true,confirmation_text:'確認整份官方行事曆'})});
   const data=await resp.json();if(!resp.ok)throw Error(typeof data.detail==='string'?data.detail:'批次審核失敗');
   info.textContent=`已發布 ${data.total} 筆活動（本次新增 ${data.added} 筆），核實日期 ${data.reviewed_on}。重新開啟學生端即可查看。`;document.dispatchEvent(new Event('ub:calendarPublished'));
  }catch(err){info.textContent='無法批次發布：'+err.message}finally{button.disabled=false}
 });
}
