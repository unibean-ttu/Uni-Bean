/** 前端組裝入口：先載入 HTML partials 再註冊模組、支援原頁面 onclick。 */
import * as shell from './shell.js';
import * as chat from './chat.js?v=6.0.0';
import * as directory from './directory.js';
import * as campus from './campus-map.js?v=6.0.0';
import * as speech from './speech.js';
import {initStudentTools} from './student-tools.js?v=6.0.0';
const partialNames=['mobile-header','sidebar','chat','directory','map','architecture','overlays'];
async function mount(){
 const html=await Promise.all(partialNames.map(async name=>{
  const res=await fetch(`./partials/${name}.html?v=6.0.0`,{cache:'no-store'});
  if(!res.ok)throw Error(`無法讀取 ${name}.html (${res.status})`);
  return res.text();
 }));
 partialNames.forEach((name,i)=>{const host=document.getElementById(`${name}-mount`);if(!host)throw Error(`缺少容器 ${name}-mount`);host.innerHTML=html[i]});
 // Inline callbacks are retained for backward compatibility with user's original HTML.
 Object.assign(window, {
  switchTab:shell.switchTab,toggleMobileSidebar:shell.toggleMobileSidebar,
  toggleDesktopRightSidebar:shell.toggleDesktopRightSidebar,toggleMobileSourceSheet:shell.toggleMobileSourceSheet,
  toggleBackendMode:shell.toggleBackendMode,openPwaQrModal:shell.openPwaQrModal,closePwaQrModal:shell.closePwaQrModal,
  askQuestion:chat.askQuestion,handleChatSubmit:chat.handleChatSubmit,triggerQuickQuestion:chat.triggerQuickQuestion,
  clearChatHistory:chat.clearChatHistory,focusSourceDoc:chat.focusSourceDoc,
  renderOffices:directory.renderOffices,filterOffices:directory.filterOffices,setOfficeCategory:directory.setOfficeCategory,jumpToOfficeDirectory:directory.jumpToOfficeDirectory,
  initCampusMap:campus.initCampusMap,selectBuilding:campus.selectBuilding,switchMapViewMode:campus.switchMapViewMode,jumpToMapBuilding:campus.jumpToMapBuilding,
  toggleVoiceRecognition:speech.toggleVoiceRecognition,stopVoiceRecognition:speech.stopVoiceRecognition,simulateVoiceInput:speech.simulateVoiceInput
 });
 chat.initChat();shell.initShell();speech.initSpeechRecognition();initStudentTools();
 await Promise.all([directory.initDirectory(),campus.initMapData()]);
 if('serviceWorker' in navigator && window.isSecureContext)navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Service Worker:',err));
}
mount().catch(err=>{
 console.error(err);
 document.body.innerHTML='';const block=document.createElement('main');block.style='margin:12vh auto;max-width:650px;padding:30px;font:16px sans-serif;line-height:1.9';
 block.textContent=`Uni-Bean 元件載入失敗：${err.message}。請使用 scripts/start-local.bat 或 python -m http.server 啟動；不要直接雙擊 index.html。`;
 document.body.append(block);
});
