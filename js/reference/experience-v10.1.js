/** v10.1 閱讀偏好、右上角設定和手機「更多」底部抽屜。
 * 顯示層，不碰 FastAPI、RAG、使用者角色權限。 */
import {$,toast} from './utils.js';

const FONT_KEY='ub_ui_font_size_v101';
const RATE_KEY='ub_speech_rate_v101';
const FONT_VALUES=new Set(['normal','large','xl']);
const RATE_VALUES=new Set(['0.85','1','1.15']);
function read(key,fallback){try{return localStorage.getItem(key)||fallback}catch{return fallback}}
function save(key,value){try{localStorage.setItem(key,value)}catch{toast('瀏覽器無法保存偏好，這次設定仍然有效')}}
export function applyPreferences(){
  const font=read(FONT_KEY,'normal');
  document.documentElement.dataset.ubFont=FONT_VALUES.has(font)?font:'normal';
  const fontSelect=$('font-size-select');if(fontSelect)fontSelect.value=document.documentElement.dataset.ubFont;
  const rate=read(RATE_KEY,'1');const rateSelect=$('speech-rate-select');if(rateSelect)rateSelect.value=RATE_VALUES.has(rate)?rate:'1';
}
function open(id){const dialog=$(id);if(dialog&&!dialog.open)dialog.showModal()}
function close(id){const dialog=$(id);if(dialog?.open)dialog.close()}
function initDialogs(){
  const bind=(id,event,fn)=>$(id)?.addEventListener(event,fn);
  bind('open-settings','click',()=>open('settings-dialog'));
  bind('mine-open-settings','click',()=>open('settings-dialog'));
  bind('close-settings','click',()=>close('settings-dialog'));
  bind('open-more','click',()=>open('more-dialog'));
  bind('close-more','click',()=>close('more-dialog'));
  bind('more-open-settings','click',()=>{close('more-dialog');open('settings-dialog')});
  for(const dialog of ['settings-dialog','more-dialog']){
    bind(dialog,'click',event=>{if(event.target===event.currentTarget)close(dialog)});
  }
  document.querySelectorAll('#more-dialog [data-tab]').forEach(btn=>btn.addEventListener('click',()=>close('more-dialog')));
  document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    const target=btn.dataset.tab;
    const more=$('open-more');
    if(more){const selected=['mine','directory'].includes(target);more.classList.toggle('is-active',selected);more.setAttribute('aria-current',selected?'page':'false')}
  }));
  bind('font-size-select','change',ev=>{const value=ev.target.value;if(!FONT_VALUES.has(value))return;save(FONT_KEY,value);applyPreferences();toast('文字大小已更新')});
  bind('speech-rate-select','change',ev=>{const value=ev.target.value;if(!RATE_VALUES.has(value))return;save(RATE_KEY,value);toast('朗讀速度已更新')});
}
initDialogs();applyPreferences();
