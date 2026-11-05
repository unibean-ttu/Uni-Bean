/** Uni-Bean UI shell. 身分只透過右上角下拉選單切換，免登入。 */
import {ROLES, SCENARIOS, ROLE_STORAGE} from './data.js';
import {$, el, getStored, setStored, closeDialog, toast, getRoleId} from './utils.js';
import {initChat, ask, updatePrompts} from './chat.js?v=12.1.1';
import {initDirectory} from './directory.js';
import {initMap} from './map.js';
import {initMine, refreshMine} from './mine.js';
import {health,apiFetch} from '../api.js';
import {initCampusInformation} from './campus-info.js';
import {initCleanShell} from './clean-shell.js';

const tabs = ['chat', 'directory', 'map', 'architecture', 'mine'];

function switchTab(target) {
  if (!tabs.includes(target)) return;
  const titles = {chat:'智慧問答',directory:'行政資訊',map:'校園導航',architecture:'校務資訊',mine:'我的空間'};
  if ($('current-page-title')) $('current-page-title').textContent = titles[target];
  for (const tab of tabs) {
    const active = tab === target;
    $('page-' + tab).classList.toggle('is-active', active);
    document.querySelectorAll(`[data-tab="${tab}"]`).forEach(button => {
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }
  window.scrollTo({top: 0, behavior: 'instant'});
}

function selectRole(id, announce = true) {
  const role = ROLES.find(item => item.id === id);
  if (!role) return;
  setStored(ROLE_STORAGE, id);
  // 相容之前版本的身分設定；只是導覽偏好，不是身分驗證。
  try { localStorage.setItem('unibean_role', id); } catch {}
  $('role-select').value = id;
  const icon = $('role-visual');if(icon)icon.textContent=role.icon;
  updatePrompts();
  refreshMine();
  if (announce) toast(`已切換為「${role.label}」，常見問題已更新；先前對話保留。`);
}

function initRoleDropdown() {
  const select = $('role-select');
  const stored = getStored(ROLE_STORAGE, null);
  const validRole = ROLES.some(role => role.id === stored) ? stored : 'student';
  selectRole(validRole, false);
  select.addEventListener('change', event => selectRole(event.target.value));
}

function renderGuide() {
  const host = $('guide-grid');
  host.replaceChildren();
  SCENARIOS.forEach(scenario => {
    const button = el('button');
    button.type = 'button';
    button.append(el('strong', '', scenario.icon + ' ' + scenario.label),
                  el('small', '', scenario.hint));
    button.addEventListener('click', () => {
      closeDialog('guide-dialog');
      switchTab('chat');
      ask(scenario.question);
    });
    host.append(button);
  });
}

function bindNavigation() {
  document.querySelectorAll('[data-tab]').forEach(button =>
    button.addEventListener('click', () => switchTab(button.dataset.tab)));
  $('open-guide').addEventListener('click', () => $('guide-dialog').showModal());
  $('close-guide').addEventListener('click', () => closeDialog('guide-dialog'));
  document.addEventListener('ub:ask', event => {
    switchTab('chat');
    ask(event.detail.question);
  });
  document.addEventListener('ub:open-navigation', () => switchTab('map'));
  document.addEventListener('ub:open-service', event => {
    const action=event.detail||{};
    if(action.type==='open_directory'){
      switchTab('directory');const field=$('directory-search');if(field){field.value=action.query||'';field.dispatchEvent(new Event('input'));}
      field?.focus({preventScroll:true});
    }else if(action.type==='open_calendar'){
      switchTab('architecture');
      document.querySelector('[data-campus-tab="calendar"]')?.click();
      document.dispatchEvent(new CustomEvent('ub:calendar-filter',{detail:{query:action.query||''}}));
    }else if(action.type==='open_announcements'){
      switchTab('architecture');document.querySelector('[data-campus-tab="announcements"]')?.click();
    }
  });
  // 情境導引可由 ESC 與背景點擊關閉。
  $('guide-dialog').addEventListener('click', event => {
    if (event.target === $('guide-dialog')) closeDialog('guide-dialog');
  });
}

async function checkHealth() {
  const node = $('connection');
  try {
    const result = await health();
    node.classList.add('ok');
    node.querySelector('span').textContent = result.ok ? '服務已連線' : '服務異常';
    try{
      const details=await apiFetch('/api/v12/status',{},5000);
      node.title=`Uni-Bean ${details.version}｜索引段落 ${details.indexed_chunks}｜最近同步 ${details.last_synced_at||'尚無紀錄'}｜模型狀態尚未確認`;
    }catch{node.title='後端已連線，但 v12 資料狀態暫無法確認';}
  } catch {
    node.classList.add('offline');
    node.querySelector('span').textContent = '後端未連線';
  }
}

async function main() {
  if (location.protocol === 'file:') {
    toast('請由 VS Code 執行 python .\\run.py，不能直接雙擊 HTML 使用問答功能。');
  }
  bindNavigation();
  initChat();
  initMap();
  initMine();
  initRoleDropdown();
  initCleanShell({switchTab, ask, newChat: () => $('new-chat').click()});
  renderGuide();
  void initDirectory();
  initCampusInformation();
  void checkHealth();
  if ('serviceWorker' in navigator &&
      (location.protocol === 'https:' || ['127.0.0.1', 'localhost'].includes(location.hostname))) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

main();
