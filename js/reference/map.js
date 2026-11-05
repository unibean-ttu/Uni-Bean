import {$,toast} from './utils.js';
const DESTINATION='大同大學 臺北市中山區中山北路三段40號';
export function initMap(){
 document.addEventListener('ub:open-navigation',event=>{
  const origin=String(event.detail?.origin||'').trim();
  const field=$('route-origin');if(!field)return;
  if(origin)field.value=origin;
  // Focus after the navigation tab becomes visible. The user must still choose
  // transport and submit; never open a route automatically without consent.
  requestAnimationFrame(()=>field.focus({preventScroll:true}));
  toast(origin?`已帶入出發地：${origin}，請選擇交通方式`:'請輸入出發地，例如：台北車站');
 });
 $('route-form').addEventListener('submit',e=>{
  e.preventDefault();const origin=$('route-origin').value.trim();if(!origin){toast('請輸入出發地');return}
  const travel=document.querySelector('input[name="travel"]:checked')?.value||'transit';
  const url=new URL('https://www.google.com/maps/dir/');url.searchParams.set('api','1');url.searchParams.set('origin',origin);url.searchParams.set('destination',DESTINATION);url.searchParams.set('travelmode',travel);window.open(url.href,'_blank','noopener,noreferrer');
 });
 document.querySelectorAll('.map-tips [data-query]').forEach(b=>b.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('ub:ask',{detail:{question:b.dataset.query}}))));
}
