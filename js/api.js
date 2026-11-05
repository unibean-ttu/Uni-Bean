/** 唯一與 FastAPI 溝通的模組；保留 same-origin 及 GitHub Pages 外接 HTTPS 模式。 */
export const apiBase = String(window.UNIBEAN_API_BASE_URL || '').trim().replace(/\/+$/, '');
export const needsRemoteApi = !apiBase && location.hostname.endsWith('.github.io');
export async function apiFetch(path, options = {}, timeoutMs = 12000) {
  if (needsRemoteApi) throw new Error('GitHub Pages 尚未設定 HTTPS 後端 API 網址');
  const ctrl = new AbortController();
  if(options.signal){if(options.signal.aborted)ctrl.abort();else options.signal.addEventListener('abort',()=>ctrl.abort(),{once:true});}
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBase}${path}`, { ...options, signal: ctrl.signal });
    if (!res.ok) throw new Error(`API HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}
export const health = () => apiFetch('/api/health', {}, 7000);
export const askBackend = (question,role="student",lang="zh-TW",context=[],signal=null) => apiFetch('/api/chat', {
  method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({question,role,lang,context:Array.isArray(context)?context.slice(-3).map(x=>String(x).slice(0,180)):[]})
}, 105000);
