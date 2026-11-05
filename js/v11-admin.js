/** v11.1 calendar review summary — one source-level approval, not 47 separate buttons. */
const container=document.getElementById('v11-calendar-review');
const make=(tag,text)=>{const n=document.createElement(tag);n.textContent=String(text??'');return n};
async function renderCalendarSummary(){
 if(!container)return;
 try{
  const resp=await fetch('/api/admin/calendar-candidates',{credentials:'same-origin',cache:'no-store'});
  if(!resp.ok)throw Error('需先從 FastAPI 登入校務管理端');
  const data=await resp.json(),items=data.items||[];
  container.replaceChildren();
  container.append(make('p',`115 學年度行事曆：已解析 ${items.length} 筆，經管理端核對後發布 ${items.filter(x=>x.approved).length} 筆。`));
  const source=make('a','查看校方行事曆頁面 ↗');source.href='https://reg.ttu.edu.tw/p/405-1032-42221,c910.php';source.target='_blank';source.rel='noopener noreferrer';container.append(source);
  const sub=make('p','事件摘要（按「整份來源核對後批次發布」即可一次處理整份 PDF）：');sub.className='muted';container.append(sub);
  const list=make('div');list.className='v11-review-list';
  items.slice(0,8).forEach(ev=>{
   const row=make('div');row.className='v11-review-row';
   row.append(make('strong',`${ev.date} · ${ev.title}`),make('small',ev.approved?'已核對':'尚未批次發布'));
   list.append(row);
  });
  if(items.length>8)list.append(make('p',`其餘 ${items.length-8} 筆將一起處理，無須逐筆確認。`));
  container.append(list);
 }catch(err){container.replaceChildren(make('p',err.message))}
}
renderCalendarSummary();
document.addEventListener('ub:calendarPublished',renderCalendarSummary);
