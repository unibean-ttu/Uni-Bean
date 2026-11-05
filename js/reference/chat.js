import {askBackend,apiFetch} from '../api.js';
import {studentT,markStudentText,refreshStudentText} from './student-i18n-v11-2.js';
import {prepareAnswerCard,cleanAnswerText,conciseSourceWarning} from './answer-card-format-v12-1.js?v=12.1.1';
import {ROLES,HISTORY_STORAGE,FAVORITES_STORAGE} from './data.js';
import {migrateLegacy,allConversations,createConversation,activeConversation,selectConversation,saveTurn} from './conversations-v11.js';
import {$,el,getStored,setStored,safeLink,toast,getRoleId} from './utils.js';
let sending=false, lastResult=null;
const validModes=new Set(['rag','retrieval_only','expired','no_evidence','smalltalk','navigation','service']);
const modes={rag:'已整理來源',retrieval_only:'文件檢索',expired:'資料已過期',no_evidence:'查無足夠證據',smalltalk:'豆豆閒聊',navigation:'校園導航',service:'服務導覽'};
export function updatePrompts(){
 const role=ROLES.find(r=>r.id===getRoleId())||ROLES[0];
 $('prompt-label').textContent=`${role.label}常見提問`;
 const box=$('prompt-buttons');box.replaceChildren();
 for(const question of role.prompts){const btn=el('button','',studentT(question));btn.type='button';const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('class','v10-prompt-icon');icon.setAttribute('aria-hidden','true');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','./assets/clean-icons.svg#chat');icon.append(use);btn.prepend(icon);btn.addEventListener('click',()=>ask(studentT(question)));box.append(btn)}
}
function pipeline(stage,status){
 const steps=['search','review','model','response'];
 steps.forEach((step,i)=>{const node=document.querySelector(`[data-step="${step}"]`);const pill=node?.querySelector('b');if(!node||!pill)return;node.classList.toggle('active',i===stage);node.classList.toggle('done',i<stage);pill.textContent=i<stage?'完成':i===stage?status:'待命'});
}
function setEvidence(result){
 lastResult=result;
 $('rag-mode').textContent=modes[result.mode]||'檢索結果';
 pipeline(4,'已完成');document.querySelectorAll('[data-step]').forEach(x=>{x.classList.remove('active');x.classList.toggle('done',!['navigation','service','smalltalk'].includes(result.mode))});
 const model=document.querySelector('[data-step="model"] b');if(model)model.textContent=result.mode==='rag'?'生成完成':result.mode==='smalltalk'?'閒聊模式':'未使用模型';
 const sources=Array.isArray(result.sources)?result.sources:[];$('source-count').textContent=result.mode==='navigation'?'不需規章':`${sources.length} 份`;
 const root=$('rag-sources');root.replaceChildren();if(['navigation','service','smalltalk'].includes(result.mode)){root.append(el('p','muted',result.mode==='smalltalk'?'這是一般閒聊，沒有引用校務文件。':'這次是服務導覽操作，不需要搜尋校務規章。'));return}if(!sources.length){root.append(el('p','muted','未找到足夠可用文件。'));return;}
 for(const src of sources.slice(0,5)){
  const box=el('div','source-mini-card');box.append(el('strong','',src.title||'相關文件'),el('small','',[src.verified_official?'已核實':'來源待確認',src.published_at?'發布 '+src.published_at:'',src.reviewed_on?'核實 '+src.reviewed_on:'',src.last_synced_at?'索引 '+src.last_synced_at:''].filter(Boolean).join(' · ')));
  const url=safeLink(src.url||src.source_url);if(url){const a=el('a','','查看官方原文 ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.style.fontSize='.8rem';box.append(a)}root.append(box);
 }
}
function saveHistory(item){const items=getStored(HISTORY_STORAGE,[]);items.unshift({...item,at:new Date().toISOString()});if(!setStored(HISTORY_STORAGE,items.slice(0,30)))toast('儲存空間不足，這則紀錄未保存；請先備份並清理舊對話。');document.dispatchEvent(new Event('ub:storage'));}
// Icon SVG paths are local, accessible and independent of fonts/CDNs.
const iconLines={
 heart:['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z'],
 copy:['M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2','M10 4h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'],
 volume:['M11 5 6 9H3v6h3l5 4V5Z','M15.5 8.5a5 5 0 0 1 0 7','M18.5 5.5a9 9 0 0 1 0 13'],
 up:['M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3ZM7 10l4-8a2 2 0 0 1 3 1.8V7h5a3 3 0 0 1 2.9 3.8l-2.2 8A3 3 0 0 1 16.8 21H7'],
 down:['M7 14V3H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3ZM7 14l4 8a2 2 0 0 0 3-1.8V17h5a3 3 0 0 0 2.9-3.8l-2.2-8A3 3 0 0 0 16.8 3H7'],
 paperclip:['m20 12-7 7a6 6 0 0 1-8.5-8.5l8.7-8.7a4 4 0 1 1 5.7 5.7L10 16.4a2 2 0 1 1-2.8-2.8l8-8'],
 chevron:['m6 9 6 6 6-6']
};
function cardIcon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.classList.add('ub13-icon');for(const d of iconLines[name]||[]){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);svg.append(path)}return svg}
function actionButton(icon,name){const button=el('button','ub13-action');button.type='button';button.append(cardIcon(icon),markStudentText(el('span'),name));button.setAttribute('aria-label',studentT(name));return button}
function detailsForSources(sources){
 const details=el('details','source-details');details.classList.add('ub12-evidence-card','ub13-sources');
 const summary=el('summary','ub13-source-header');summary.append(cardIcon('paperclip'),markStudentText(el('strong'),'資料來源'));summary.append(el('span','ub13-source-count',`（${sources.length}）`),cardIcon('chevron'));details.append(summary);
 for(const s of sources){const entry=el('div','source-entry');entry.append(el('strong','',cleanAnswerText(s.title||'來源文件')));
  const meta=[s.department,s.academic_year&&`${s.academic_year} 學年度`,s.verified_official?'已人工核實':'待核實',s.expired?'已知過期':null,s.published_at?'發布：'+s.published_at:null,s.reviewed_on?'核實：'+s.reviewed_on:null,s.last_synced_at?'索引：'+s.last_synced_at:null].filter(Boolean).join(' · ');if(meta)entry.append(el('small','',meta));if(s.excerpt)entry.append(el('p','ub13-source-excerpt',cleanAnswerText(s.excerpt).slice(0,200)));
  const url=safeLink(s.url||s.source_url);if(url){const link=el('a','','開啟官方原文 ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';entry.append(link)}details.append(entry)
 }
 return details;
}
function answerMessage(question,result,turnId=null){
 const empty=$('chat-messages').querySelector('.empty-chat');empty?.remove();
 const box=el('article','message assistant ub-answer-card ub13-answer-card');if(turnId)box.id='ub-turn-'+turnId;
 const isService=['navigation','service','smalltalk'].includes(result.mode);
 const sources=Array.isArray(result.sources)?result.sources:[];
 const title=el('header','ub13-card-header');const identity=el('div','ub13-identity');const avatar=el('img','ub-answer-avatar');avatar.src='./assets/mascot-trim.png';avatar.alt='Uni-Bean 豆豆';
 // Keep a friendly name; technical mode is diagnostic only.
 identity.append(avatar,el('span','ub13-assistant-name','Uni-Bean 校務助理'));title.append(identity);
 const state=result.verification_status||(result.mode==='no_evidence'?'insufficient':'pending');
 const statusNames={verified:'已核實來源',pending:'版本待核實',expired:'可能過期',insufficient:'證據不足',not_applicable:'服務導覽'};
 if(!isService){const badges=el('div','ub13-badges');if(sources.length)badges.append(el('span','ub13-count-badge',`來源 · ${sources.length} 份文件`));const status=el('span',`ub13-state ub13-state-${state}`,studentT(statusNames[state]||'來源待確認'));badges.append(status);title.append(badges)}
 box.append(title);
 if(!isService){const questionRow=el('div','ub13-question');questionRow.append(el('span','ub13-question-label','問題'),el('h3','v12-answer-title',cleanAnswerText(String(result.answer_heading||question)).slice(0,100)));box.append(questionRow)}
 const fullText=String(result.answer||'無法取得回答。');const formatted=prepareAnswerCard(result);
 if(isService){box.append(el('div','message-text ub13-simple-answer',cleanAnswerText(fullText)))}
 else{
  if(formatted.summary){const summary=el('div','ub13-summary');summary.append(el('strong','ub13-summary-label','摘要'),el('p','',formatted.summary));box.append(summary)}
  if(formatted.points.length){
   const block=el('section','ub13-points');block.append(el('h4','v12-points-title',studentT(Array.isArray(result.suggested_steps)&&result.suggested_steps.length?'建議步驟（依已核實資料）':'重點整理')));
   const items=el('ol','ub13-points-list');formatted.points.slice(0,6).forEach(item=>items.append(el('li','',item)));block.append(items);
   if(formatted.points.length>6){const more=el('details','ub13-more-points');more.append(el('summary','',`查看更多重點（${formatted.points.length-6}）`));const extra=el('ol','ub13-points-list');extra.start=7;formatted.points.slice(6).forEach(item=>extra.append(el('li','',item)));more.append(extra);block.append(more)}
   box.append(block)
  }else{box.append(el('div','message-text ub13-simple-answer',formatted.body))}
  // Only show information absent from the summary and key-point list.
  // Full original evidence is available in the existing 資訊詳情 dialog.
  if(formatted.points.length && formatted.body){
   const full=el('details','ub13-full-answer');full.append(markStudentText(el('summary'), '查看補充說明'),el('div','ub13-original-text',formatted.body));
   full.addEventListener('toggle',()=>{full.querySelector('summary').dataset.studentLabel=full.open?'收合補充說明':'查看補充說明';full.querySelector('summary').textContent=studentT(full.querySelector('summary').dataset.studentLabel)});
   box.append(full);
  }
 }
 if(result.warning){const warning=el('div','chat-warning ub13-warning');warning.append(el('strong','','提醒：'),el('span','',conciseSourceWarning(result.warning)));box.append(warning)}
 if(result.mode==='navigation' && result.action?.type==='campus_navigation'){
  const lang=localStorage.getItem('ub_v11_lang')||'zh-TW';const button=el('button','ub-nav-action',lang==='en'?'🗺️ Open Campus Navigation':lang==='ja'?'🗺️ キャンパス案内を開く':'🗺️ 開啟校園導航');button.type='button';button.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('ub:open-navigation',{detail:{origin:result.action.origin||''}})));box.append(button);$('chat-messages').append(box);scrollBottom();return box;
 }
 if(result.mode==='service' && result.action?.type?.startsWith('open_')){
  const labels={open_calendar:'📅 查看校務行事曆',open_directory:'🏛️ 查詢處室／系所',open_announcements:'📢 查看校務公告'};const button=markStudentText(el('button','ub-nav-action'),labels[result.action.type]||'開啟相關服務');button.type='button';button.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('ub:open-service',{detail:result.action})));box.append(button);$('chat-messages').append(box);scrollBottom();return box;
 }
 if(sources.length){const details=detailsForSources(sources);
  const tools=el('div','ub13-source-tools');
  const office=markStudentText(el('button','ub13-text-action'),'查詢承辦單位');office.type='button';office.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('ub:open-service',{detail:{type:'open_directory',query:String(sources[0]?.department||'').slice(0,60)}})));tools.append(office);
  const full=markStudentText(el('button','ub13-text-action'),'📋 資訊詳情');full.type='button';full.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('ub:details',{detail:{question,result}})));tools.append(full);
  const recheck=markStudentText(el('button','ub13-text-action'),'重新查證');recheck.type='button';recheck.addEventListener('click',()=>ask(question));tools.append(recheck);
  details.append(tools);box.append(details);
 }
 const foot=el('div','answer-footer ub13-actions');
 const fav=actionButton('heart','收藏'),copy=actionButton('copy','複製'),read=actionButton('volume','朗讀'),good=actionButton('up','有幫助'),bad=actionButton('down','需改善');
 read.setAttribute('aria-label',studentT('朗讀')+'這則校務回答');
 const readLabel=read.querySelector('[data-student-label]');
 function setReadLabel(value){readLabel.dataset.studentLabel=value;readLabel.textContent=studentT(value);read.setAttribute('aria-label',studentT(value))}
 read.addEventListener('click',()=>{
  if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){toast('此瀏覽器不支援朗讀功能');return}
  if(window.speechSynthesis.speaking){window.speechSynthesis.cancel();setReadLabel('朗讀');toast('已停止朗讀');return}
  const text=cleanAnswerText(fullText);const speech=new SpeechSynthesisUtterance(text);speech.lang=localStorage.getItem('ub_v11_lang')||'zh-TW';
  const speed=Number(localStorage.getItem('ub_speech_rate_v101')||'1');speech.rate=[0.85,1,1.15].includes(speed)?speed:1;
  speech.onend=()=>setReadLabel('朗讀');speech.onerror=()=>setReadLabel('朗讀');setReadLabel('停止朗讀');window.speechSynthesis.speak(speech);
 });
 const savedAlready=getStored(FAVORITES_STORAGE,[]).some(x=>x.question===question&&x.answer===fullText);
 fav.classList.toggle('is-active',savedAlready);fav.setAttribute('aria-pressed',String(savedAlready));
 fav.addEventListener('click',()=>{const items=getStored(FAVORITES_STORAGE,[]);if(items.some(x=>x.question===question&&x.answer===fullText)){toast('這則回答已收藏');return}const active=activeConversation();const turn=active?.turns?.slice().reverse().find(t=>t.question===question&&t.result?.answer===fullText);items.unshift({conversationId:active?.id||null,turnId:turn?.id||null,question,answer:fullText,summary:result.summary||'',key_points:result.key_points||[],sources:result.sources||[],mode:result.mode,warning:result.warning||'',at:new Date().toISOString()});if(!setStored(FAVORITES_STORAGE,items.slice(0,30))){toast('儲存空間不足，這則收藏未保存');return}fav.classList.add('is-active');fav.setAttribute('aria-pressed','true');toast('已加入我的收藏');document.dispatchEvent(new Event('ub:storage'))});
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText([cleanAnswerText(fullText),...sources.filter(s=>safeLink(s.url||s.source_url)).slice(0,5).map(s=>`${s.title||'官方來源'}：${safeLink(s.url||s.source_url)}`),`查詢日期：${new Date().toLocaleDateString('zh-TW')}`].join('\n'));toast('已複製回答與來源')}catch{toast('瀏覽器未允許複製，請選取文字複製')}});
 let rated=false;const rate=async(rating,reason)=>{if(rated)return;const report=rating<0?await window.unibeanFeedbackReport?.():{reason:'none',comment:'',shareContext:false};if(!report)return;const comment=report.comment||'';reason=report.reason||reason;const shareContext=Boolean(report.shareContext);try{await apiFetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating,reason,mode:validModes.has(result.mode)?result.mode:'no_evidence',comment,share_context:shareContext,question:shareContext?question:'',answer_excerpt:shareContext?fullText.slice(0,800):'',source_urls:shareContext?(result.sources||[]).map(s=>s.url||s.source_url).filter(Boolean).slice(0,5):[]})});rated=true;good.disabled=true;bad.disabled=true;(rating>0?good:bad).classList.add('is-active');(rating>0?good:bad).setAttribute('aria-pressed','true');toast('感謝回饋，已提交至管理端')}catch(e){toast('回饋未送出：'+e.message)}};
 good.setAttribute('aria-pressed','false');bad.setAttribute('aria-pressed','false');good.addEventListener('click',()=>rate(1,'none'));bad.addEventListener('click',()=>rate(-1,'unclear'));
 foot.append(fav,copy,read,good,bad);box.append(foot);$('chat-messages').append(box);scrollBottom();return box;
}
function scrollBottom(){const host=$('chat-messages');host.scrollTop=host.scrollHeight}
function userMessage(question){const empty=$('chat-messages').querySelector('.empty-chat');empty?.remove();$('chat-messages').append(el('div','message user',question));scrollBottom()}
export async function ask(raw, options={}){
 const question=String(raw||'').trim();
 if(question.length<2){toast('請至少輸入兩個字');return}
 if(sending){toast('上一題正在處理');return}
 const prior=activeConversation()?.turns?.slice(-3).map(t=>String(t.question||'').slice(0,180))||[];
 document.body.classList.add('chat-started');const formInput=$('chat-input');formInput.value='';if(!options.retry)userMessage(question);options.errorNode?.remove();
 sending=true;$('send-message').disabled=true;
 const status=el('div','ub12-wait-message');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 status.append(el('span','ub12-pulse',''),markStudentText(el('span'), '豆豆正在理解你的問題…'));const controller=new AbortController();let cancelled=false;const stop=markStudentText(el('button','v12-cancel-request'),'取消查詢');stop.type='button';stop.addEventListener('click',()=>{cancelled=true;controller.abort()});status.append(stop);$('chat-messages').append(status);scrollBottom();
 pipeline(0,'查詢中');$('rag-mode').textContent='查詢中';$('source-count').textContent='查詢中';
 $('rag-sources').replaceChildren(el('p','muted',studentT('正在分析問題並查找適合的校務服務…')));
 try{
  const result=await askBackend(question,getRoleId(),localStorage.getItem('ub_v11_lang')||'zh-TW',prior,controller.signal);
  status.remove();pipeline(3,'整理結果');
  const saved=saveTurn(question,result);
  if(!saved)toast('本機空間不足，回答已顯示但未保存，請先備份重要紀錄。');
  answerMessage(question,result,saved?.turnId);setEvidence(result);
  saveHistory({question,answer:result.answer,mode:result.mode,sources:result.sources});
  if(result.mode==='navigation' && result.action?.type==='campus_navigation'){
   document.dispatchEvent(new CustomEvent('ub:open-navigation',{detail:{origin:result.action.origin||''}}));
  }else if(result.mode==='service' && result.action?.type?.startsWith('open_')){
   document.dispatchEvent(new CustomEvent('ub:open-service',{detail:result.action}));
  }
 }catch(err){
  status.remove();
  const timeout=err.name==='AbortError';
  const fail=el('article','message assistant ub12-error');
  fail.append(markStudentText(el('strong'), '這次沒有成功取得回答'));
  fail.append(el('p','',cancelled?'你已取消這次查詢，原本的提問仍保留。':studentT(timeout?'目前查詢等待過久，可能是模型忙碌或連線中斷。':'目前服務暫時無法完成這次查詢。請確認 Uni-Bean 後端是否啟動。')));
  const detail=el('small','',String(err?.message||'無法連線').slice(0,160));fail.append(detail);
  const retry=markStudentText(el('button','secondary-btn'), '重新送出這題');retry.type='button';retry.addEventListener('click',()=>ask(question,{retry:true,errorNode:fail}));fail.append(retry);
  $('chat-messages').append(fail);scrollBottom();
  $('rag-mode').textContent='查詢失敗';$('source-count').textContent='—';
  $('rag-sources').replaceChildren(el('p','muted','請稍後重試。錯誤回答不會儲存為正常對話。'));
  document.querySelectorAll('[data-step] b').forEach(x=>x.textContent='未完成');
 }finally{sending=false;$('send-message').disabled=false;formInput.focus()}
}

export function newChat(){if(sending){toast('上一題還在處理');return}createConversation();document.body.classList.remove('chat-started');$('chat-messages').replaceChildren();const empty=el('div','empty-chat');const img=el('img');img.src='./assets/mascot-trim.png';img.alt='';empty.append(img,el('strong','','你好！有什麼校務問題嗎？'),el('span','','例如：獎學金在哪裡查詢？'));$('chat-messages').append(empty);$('rag-mode').textContent='待提問';$('source-count').textContent='尚未搜尋';$('rag-sources').replaceChildren(el('p','muted','輸入問題後，相關文件會顯示在這裡。'));document.querySelectorAll('[data-step]').forEach(x=>{x.classList.remove('active','done');x.querySelector('b').textContent='待命'})}
export function restoreConversation(id,turnId=null){
 const chat=selectConversation(id);if(!chat)return;
 const host=$('chat-messages');host.replaceChildren();
 document.body.classList.toggle('chat-started',Boolean(chat.turns.length));
 if(!chat.turns.length){host.append(el('div','empty-chat','這是一段新對話。'));return}
 chat.turns.forEach(turn=>{userMessage(turn.question);answerMessage(turn.question,turn.result,turn.id)});
 setEvidence(chat.turns.at(-1).result);
 if(turnId){const target=document.getElementById('ub-turn-'+turnId);target?.scrollIntoView({behavior:'smooth',block:'center'});if(target){target.classList.add('ub12-highlight');setTimeout(()=>target.classList.remove('ub12-highlight'),1800)}}
 toast(`已恢復對話（${chat.turns.length} 則）`);
}
export function showSavedRecord(record){
 createConversation();saveTurn(record.question||'收藏問答',{answer:record.answer||'',summary:record.summary||'',key_points:record.key_points||[],sources:record.sources||[],mode:record.mode||'retrieval_only',warning:record.warning||''});
 $('chat-messages').replaceChildren();document.body.classList.add('chat-started');
 userMessage(record.question||'收藏問答');
 const result={answer:record.answer||'',summary:record.summary||'',key_points:record.key_points||[],sources:record.sources||[],mode:record.mode||'retrieval_only',warning:record.warning||''};
 answerMessage(record.question||'收藏問答',result);setEvidence(result);toast('已開啟收藏回答；現在可以接著聊。');
}
export function initChat(){document.addEventListener('ub:storage-failed',()=>toast('儲存空間不足，請備份並清理舊對話。'));migrateLegacy();updatePrompts();document.addEventListener('ub:locale-changed',()=>{updatePrompts();refreshStudentText()});document.addEventListener('ub:open-thread',e=>restoreConversation(e.detail.id,e.detail.turnId));document.addEventListener('ub:open-saved',e=>{const r=e.detail.record;if(r?.conversationId&&allConversations().some(c=>c.id===r.conversationId))restoreConversation(r.conversationId,r.turnId);else showSavedRecord(r)});$('new-chat').addEventListener('click',newChat);$('chat-form').addEventListener('submit',e=>{e.preventDefault();ask($('chat-input').value)});$('chat-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();$('chat-form').requestSubmit()}});
 $('voice-input').addEventListener('click',()=>{const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){toast('此瀏覽器不支援語音輸入；請改用文字提問');return}const rec=new Speech();rec.lang=localStorage.getItem('ub_v11_lang')||'zh-TW';rec.onresult=e=>{$('chat-input').value=e.results[0][0].transcript;$('chat-input').focus()};rec.onerror=()=>toast('語音辨識不可用，請檢查麥克風權限');try{rec.start();toast('請開始說話…')}catch{toast('語音功能暫時不可用')}});
}
