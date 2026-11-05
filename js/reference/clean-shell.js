/** The minimal ChatGPT-like shell; it does not touch FastAPI/RAG. */
import {HISTORY_STORAGE} from './data.js';
import {allConversations} from './conversations-v11.js';
import {$,el,getStored} from './utils.js';

export function initCleanShell({switchTab,ask,newChat}) {
  const sidebar=$('clean-sidebar');
  const overlay=$('sidebar-overlay');
  const menu=$('sidebar-mobile-toggle');
  const sidebarToggle=$('sidebar-toggle');
  const isMobile=()=>window.matchMedia('(max-width: 760px)').matches;
  const closeMobile=()=>{
    document.body.classList.remove('mobile-sidebar-open');
    if(menu)menu.setAttribute('aria-expanded','false');
    if(overlay)overlay.hidden=true;
  };
  const toggleSidebar=()=>{
    if(isMobile()){
      const open=!document.body.classList.contains('mobile-sidebar-open');
      document.body.classList.toggle('mobile-sidebar-open',open);
      if(menu)menu.setAttribute('aria-expanded',String(open));
      if(overlay)overlay.hidden=!open;
      return;
    }
    const collapsed=document.body.classList.toggle('sidebar-collapsed');
    try{localStorage.setItem('ub_sidebar_collapsed',String(collapsed))}catch{}
    if(sidebarToggle)sidebarToggle.setAttribute('aria-label',collapsed?'展開側欄':'收合側欄');
  };
  try{if(localStorage.getItem('ub_sidebar_collapsed')==='true')document.body.classList.add('sidebar-collapsed')}catch{}
  sidebarToggle?.addEventListener('click',toggleSidebar);
  menu?.addEventListener('click',toggleSidebar);
  overlay?.addEventListener('click',closeMobile);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobile()});
  window.addEventListener('resize',()=>{if(!isMobile())closeMobile()});
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
    const titles={chat:'智慧問答',directory:'行政資訊',map:'校園導航',architecture:'校務資訊',mine:'我的空間'};
    if($('current-page-title'))$('current-page-title').textContent=titles[button.dataset.tab]||'Uni-Bean';
    closeMobile();
  }));
  $('sidebar-new-chat')?.addEventListener('click',()=>{switchTab('chat');newChat();closeMobile();$('chat-input')?.focus()});
  const history=$('sidebar-history-list');
  const refresh=()=>{
    if(!history)return;
    history.replaceChildren();
    const records=allConversations();
    if(!Array.isArray(records)||!records.length){history.append(el('p','muted','尚無紀錄'));return}
    records.slice(0,8).forEach(record=>{
      if(!record.title)return;
      const button=el('button','history-link',record.title);
      button.type='button';button.title=record.title;
      button.addEventListener('click',()=>{switchTab('chat');document.dispatchEvent(new CustomEvent('ub:open-thread',{detail:{id:record.id}}));closeMobile()});
      history.append(button);
    });
  };
  refresh();document.addEventListener('ub:storage',refresh);
}
