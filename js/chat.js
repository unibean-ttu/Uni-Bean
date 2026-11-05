import {askBackend,apiFetch,needsRemoteApi} from './api.js';
import {state,switchTab,toggleMobileSidebar,toggleMobileSourceSheet,toggleDesktopRightSidebar,showToast} from './shell.js';
const $=id=>document.getElementById(id);
let busy=false;
let lastSources=[];
function scrolling(){$('chat-messages-container')?.scrollTo({top:$('chat-messages-container').scrollHeight,behavior:'smooth'})}
function userBubble(value){
  const row=document.createElement('div');row.className='flex justify-end items-start gap-2.5';
  const bubble=document.createElement('div');bubble.className='max-w-[85%] sm:max-w-[75%] bg-bean-creamGreen text-bean-forestDark px-4 py-3 rounded-2xl shadow-xs border border-bean-mint/40 text-sm leading-relaxed chat-copy';
  bubble.textContent=value;
  const icon=document.createElement('div');icon.className='w-8 h-8 rounded-xl bg-bean-forest text-white flex items-center justify-center text-xs shrink-0';
  const roleNames={student:'學生',freshman:'新生',parent:'家長',alumni:'校友',staff:'教職員',visitor:'訪客'};
  icon.textContent=roleNames[localStorage.getItem('unibean_role')]||'訪客';
  row.append(bubble,icon);$('chat-stream').append(row);$('chat-messages-container')?.classList.add('ub-has-messages');scrolling();
}
function assistantBubble(){
  const row=document.createElement('div');row.className='flex items-start gap-3';
  const avatar=document.createElement('div');avatar.className='msg-avatar shrink-0';
  const img=document.createElement('img');img.src='./assets/mascot.png';img.alt='Uni-Bean';avatar.append(img);
  const card=document.createElement('div');card.className='flex-1 min-w-0 max-w-[94%] sm:max-w-[87%] bg-white border border-bean-creamGreen p-4 sm:p-5 rounded-2xl shadow-soft space-y-3';
  const heading=document.createElement('div');heading.className='text-xs font-bold text-bean-forest border-b pb-2 border-gray-100';heading.textContent='Uni-Bean 豆有所應';
  const text=document.createElement('div');text.className='chat-copy text-sm text-bean-ink leading-relaxed';text.textContent='正在搜尋校務文件……';
  const foot=document.createElement('div');card.append(heading,text,foot);row.append(avatar,card);$('chat-stream').append(row);scrolling();
  return {heading,text,foot};
}
function sourceCard(src,index){
  const card=document.createElement('article');card.id=`source-card-${index}`;card.className='bg-bean-creamWhite rounded-2xl p-4 border border-bean-mint/40 space-y-2';
  const label=document.createElement('div');label.className='text-xs font-semibold text-bean-forest';label.textContent=`[來源${src.id ?? index+1}] ${src.title || '未命名文件'}`;
  const tag=document.createElement('div');tag.className='text-xs text-gray-500';tag.textContent=src.is_demo?'非官方測試資料':src.verified_official?'已有來源核實標記':'尚未核實來源內容';
  const desc=document.createElement('p');desc.className='text-xs text-gray-700 leading-relaxed chat-copy';desc.textContent=String(src.excerpt||'未提供摘錄');
  card.append(label,tag,desc);
  if(src.academic_year||src.reviewed_on){const meta=document.createElement('p');meta.className='text-xs text-gray-500';meta.textContent=`學年度：${src.academic_year || '待核實'}　查閱日期：${src.reviewed_on||'待核實'}`;card.append(meta)}
  if(src.expired){const expired=document.createElement('p');expired.className='text-xs font-bold text-red-700';expired.textContent='已標記過期';card.append(expired)}
  if(src.url){try{const url=new URL(src.url);if(url.protocol==='https:'){const a=document.createElement('a');a.className='source-link text-xs';a.textContent='開啟原始文件 ↗';a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';card.append(a)}}catch{}}
  return card;
}
function renderSources(sources){
  lastSources=Array.isArray(sources)?sources:[];state.sources=lastSources;
  const d=$('desktop-source-list'),m=$('mobile-source-list');if(!d||!m)return;
  d.replaceChildren();m.replaceChildren();
  lastSources.forEach((s,i)=>{d.append(sourceCard(s,i));m.append(sourceCard(s,i))});
  if(!lastSources.length){for(const target of [d,m]){const hint=document.createElement('p');hint.className='text-gray-500 text-sm';hint.textContent='本次沒有可引用的文件。';target.append(hint)}}
  $('desktop-source-badge').textContent=`${lastSources.length} 筆來源`;
  $('mobile-source-count').textContent=String(lastSources.length);
}
export function focusSourceDoc(id){
  const index=lastSources.findIndex(s=>String(s.id)===String(id));
  if(index<0)return;
  if(window.innerWidth<1024)toggleMobileSourceSheet(true);
  else toggleDesktopRightSidebar(true);
  setTimeout(()=>document.querySelectorAll(`#source-card-${index}`).forEach(el=>{el.scrollIntoView({behavior:'smooth',block:'nearest'});el.classList.add('ring-2','ring-bean-mint');setTimeout(()=>el.classList.remove('ring-2','ring-bean-mint'),1200)}),120);
}
function addFeedbackControls(target,mode){
 const allowed=new Set(['rag','retrieval_only','no_evidence','expired']);if(!allowed.has(mode))return;
 const wrap=document.createElement('section');wrap.className='ub-feedback';
 const heading=document.createElement('strong');heading.textContent='這則回答對你有幫助嗎？';wrap.append(heading);
 const status=document.createElement('span');status.className='ub-feedback-status';status.setAttribute('aria-live','polite');
 const yes=document.createElement('button'),no=document.createElement('button');yes.type=no.type='button';yes.textContent='👍 有幫助';no.textContent='👎 需要改善';wrap.append(yes,no);
 const form=document.createElement('div');form.className='ub-feedback-detail';form.hidden=true;
 const reason=document.createElement('select');reason.setAttribute('aria-label','選擇需要改善的原因');
 for(const [v,label] of [['incorrect','答案不正確'],['outdated','資訊過期'],['missing_source','缺乏原始來源'],['unclear','內容不清楚'],['other','其他']]){const opt=document.createElement('option');opt.value=v;opt.textContent=label;reason.append(opt)}
 const comment=document.createElement('textarea');comment.maxLength=300;comment.placeholder='可以簡述原因（選填；請勿輸入學號、電話或其他個資）';comment.rows=2;
 const send=document.createElement('button');send.type='button';send.textContent='送出改善建議';form.append(reason,comment,send);wrap.append(form,status);
 async function submit(rating){yes.disabled=true;no.disabled=true;send.disabled=true;status.textContent='回饋送出中…';try{await apiFetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating,mode,reason:rating===1?'none':reason.value,comment:rating===1?'':comment.value.trim()})});status.textContent='已收到回饋，感謝協助改善 Uni-Bean！';form.hidden=true}catch(err){status.textContent=`送出失敗：${err.message||'連線錯誤'}`;yes.disabled=false;no.disabled=false;send.disabled=false}}
 yes.addEventListener('click',()=>submit(1));no.addEventListener('click',()=>{form.hidden=false;reason.focus()});send.addEventListener('click',()=>submit(-1));target.foot.append(wrap);
}
function resultView(target,result){
  target.text.textContent=String(result.answer||'後端未提供答案');
  const modeText={rag:'本地 LLM + 文件檢索',retrieval_only:'僅文件檢索（Ollama 未啟用）',no_evidence:'未找到足夠證據',expired:'檢索來源已過期'};
  target.heading.textContent=`Uni-Bean 豆有所應｜${modeText[result.mode]||'系統回覆'}`;
  if(result.warning){const p=document.createElement('p');p.className='preview-note';p.textContent=result.warning;target.foot.append(p)}
  renderSources(result.sources);
  if(lastSources.length){
    const title=document.createElement('p');title.className='text-xs text-gray-500 mt-2';title.textContent='查看本次檢索來源：';target.foot.append(title);
    const pills=document.createElement('div');pills.className='flex flex-wrap gap-2 mt-2';
    lastSources.forEach((src,i)=>{const b=document.createElement('button');b.type='button';b.className='px-3 py-1.5 rounded-xl bg-bean-softGreen border border-bean-mint/50 text-xs text-bean-forestDark';b.textContent=`[來源${src.id??i+1}] ${src.title||'文件'}`;b.addEventListener('click',()=>focusSourceDoc(src.id??i+1));pills.append(b)});
    target.foot.append(pills);
  }
  addFeedbackControls(target,result.mode);
}
export async function askQuestion(question){
  const q=String(question||'').trim();if(!q||busy)return;
  if(state.tab!=='chat')switchTab('chat');toggleMobileSidebar(false);
  busy=true;const input=$('chat-input'), send=$('chat-form')?.querySelector('[type=submit]');if(input)input.value='';if(send)send.disabled=true;
  userBubble(q);const target=assistantBubble();
  try {
    if(needsRemoteApi)throw new Error('GitHub Pages 尚未設定 HTTPS FastAPI 後端；請先依 README 配置公開 API');
    const data=await askBackend(q,localStorage.getItem("unibean_role")||"student");resultView(target,data);document.dispatchEvent(new CustomEvent("unibean:chat-complete",{detail:{question:q,answer:String(data.answer||""),mode:data.mode||"",sources:data.sources||[]}}));
  } catch(err){
    target.text.textContent=`目前無法查詢校務文件：${err.message||'後端無回應'}。請確認 FastAPI 已啟動，或先參考學校官方網站。`;
    target.heading.textContent='Uni-Bean｜後端未連線';renderSources([]);
  } finally{busy=false;if(send)send.disabled=false;scrolling();}
}
export function handleChatSubmit(e){e.preventDefault();askQuestion($('chat-input').value)}
export function triggerQuickQuestion(q){toggleMobileSidebar(false);askQuestion(q)}
export function clearChatHistory(){if(busy)return;$('chat-stream').replaceChildren();$('chat-messages-container')?.classList.remove('ub-has-messages');renderSources([]);document.dispatchEvent(new CustomEvent('unibean:new-session'));showToast('已建立新對話，之前的對話仍保留在本機歷史紀錄。')}
export function renderSavedSession(turns=[]){
 if(busy)return;
 $('chat-stream')?.replaceChildren();renderSources([]);$('chat-messages-container')?.classList.toggle('ub-has-messages',turns.length>0);
 for(const turn of turns){
  userBubble(String(turn.question||''));
  const target=assistantBubble();
  resultView(target,{answer:String(turn.answer||''),mode:turn.mode||'retrieval_only',sources:Array.isArray(turn.sources)?turn.sources:[]});
 }
 if(turns.length)scrolling();
}
export function initChat(){
  renderSources([]);
  const input=$('chat-input');
  const group=$('chat-form');
  if(group && !document.getElementById('ub-image-pick')){
    const pick=document.createElement('input');pick.type='file';pick.id='ub-image-pick';pick.accept='image/jpeg,image/png,image/webp';pick.hidden=true;
    const launch=document.createElement('button');launch.type='button';launch.className='ub-attach';launch.textContent='📎 圖片預覽';launch.title='僅在本機預覽，尚不支援 OCR 或圖片問答';
    launch.addEventListener('click',()=>pick.click());
    const preview=document.createElement('div');preview.className='ub-image-preview';preview.hidden=true;
    let url='';
    pick.addEventListener('change',()=>{
      const file=pick.files?.[0];if(!file)return;
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024){alert('僅支援 3 MB 以下的 JPG / PNG / WebP 圖片');pick.value='';return}
      if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(file);preview.replaceChildren();
      const img=document.createElement('img');img.src=url;img.alt='僅本機預覽的附件';
      const note=document.createElement('p');note.textContent='圖片只在本機預覽，尚未傳送給 AI，也不支援 OCR。可將圖片內容用文字描述後提問。';
      const clear=document.createElement('button');clear.type='button';clear.textContent='移除圖片';clear.addEventListener('click',()=>{if(url)URL.revokeObjectURL(url);url='';pick.value='';preview.hidden=true});
      preview.append(img,note,clear);preview.hidden=false;
    });
    group.before(preview);group.prepend(pick);group.prepend(launch);
  }
  $('chat-input')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();askQuestion(e.target.value)}});
  // no fabricated answer on load. Clear demo claim.
  const chatMeta=$('chat-messages-container');if(chatMeta){const n=document.createElement('p');n.className='preview-note mb-4';n.textContent='學生研究展示版：正式答案由 FastAPI 取得，內建頁面不包含人工編造的官方規章。請以來源連結與最新公告為準。';(chatMeta.querySelector('.ub-campus-hub')||chatMeta.querySelector('.ub-hero'))?.after(n)}
}
