import {health,needsRemoteApi} from './api.js';
export const state = { tab:'chat', sourceOpen:true, sources:[] };
const $ = id => document.getElementById(id);
export function showToast(message) {
  const host=$('toast-container');if(!host)return;
  const toast=document.createElement('div');toast.className='bg-bean-forest text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium';
  toast.textContent=message;host.append(toast);setTimeout(()=>toast.remove(),3600);
}
export function switchTab(name){
  if(!['chat','directory','map','architecture'].includes(name))return;
  state.tab=name;
  for(const tab of ['chat','directory','map','architecture']){
    const panel=$(`tab-panel-${tab}`),button=$(`nav-btn-${tab}`);
    if(!panel||!button)continue;
    panel.classList.toggle('hidden',tab!==name);panel.classList.toggle('flex',tab===name);
    button.classList.toggle('is-active',tab===name);
    button.setAttribute('aria-current',tab===name?'page':'false');
  }
  toggleMobileSidebar(false);
  if(name==='map') window.dispatchEvent(new Event('unibean:map-visible'));
}
export function toggleMobileSidebar(show){
  $('app-sidebar')?.classList.toggle('-translate-x-full',!show);
  $('mobile-sidebar-backdrop')?.classList.toggle('hidden',!show);
  $('mobile-menu-btn')?.setAttribute('aria-expanded',String(!!show));
}
export function toggleDesktopRightSidebar(force){
  state.sourceOpen=typeof force==='boolean'?force:!state.sourceOpen;
  const el=$('desktop-source-sidebar'); if(!el)return;
  el.classList.toggle('lg:hidden',!state.sourceOpen);el.classList.toggle('lg:flex',state.sourceOpen);
  const text=$('desktop-source-toggle-text');if(text)text.textContent=state.sourceOpen?'收合參考來源側欄':'展開參考來源側欄';
}
export function toggleMobileSourceSheet(show){
  $('mobile-source-sheet')?.classList.toggle('translate-y-full',!show);
  $('mobile-source-backdrop')?.classList.toggle('hidden',!show);
}
export async function toggleBackendMode(){await probeBackend(true);}
export async function probeBackend(notify=false){
  const btn=$('backend-mode-btn'), label=$('arch-mode-label'), dot=$('engine-status-dot');
  try {
    if(needsRemoteApi)throw Error('請設定公開 HTTPS API 網址');
    const d=await health();
    if(btn)btn.textContent=`API 已連線 · ${d.documents} 文件`;
    if(label)label.textContent='FastAPI + BM25（Ollama 可選）';
    dot?.classList.replace('bg-red-400','bg-bean-mint');
    if(notify)showToast(`後端連線成功，目前有 ${d.documents} 份文件`);
  }catch(err){
    if(btn)btn.textContent='後端未連線';
    if(label)label.textContent='介面預覽模式（不產生模擬校務答案）';
    dot?.classList.remove('bg-bean-mint');dot?.classList.add('bg-red-400');
    if(notify)showToast(String(err.message || 'FastAPI 尚未啟動'));
  }
}
export function openPwaQrModal(){
  const modal=$('pwa-qr-modal'),viewport=$('modal-viewport-label');
  if(viewport)viewport.textContent=window.innerWidth>=1024?`電腦版布局（${window.innerWidth}px）`:`行動版布局（${window.innerWidth}px）`;
  modal?.classList.remove('hidden');
}
export function closePwaQrModal(){$('pwa-qr-modal')?.classList.add('hidden')}
export function initShell(){
  // Staff tools require a same-origin FastAPI host, not GitHub Pages static hosting.
  if(location.hostname.endsWith('.github.io'))document.querySelector('.ub-admin-link')?.classList.add('hidden');
  // escape closes overlays and sidebar
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){toggleMobileSidebar(false);toggleMobileSourceSheet(false);closePwaQrModal()}});
  const urlInput=$('fastapi-url-input');
  if(urlInput){
    urlInput.value=window.UNIBEAN_API_BASE_URL || '(本機請留空：使用同源 /api/chat)';
    urlInput.readOnly=true;
    urlInput.title='修改 frontend/config.js 或部署時設定 UNIBEAN_API_URL；不接受任意網址輸入，避免混合內容';
  }
  probeBackend();
}
