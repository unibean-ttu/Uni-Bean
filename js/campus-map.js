/** Uni-Bean 校園地圖：示意位置與 Google Maps 真實導航分開處理。 */
import {switchTab,showToast} from './shell.js';
const $=id=>document.getElementById(id);
let buildings=[],map=null,markers={},selected='B2';
const campus='大同大學 臺北市中山區';
function node(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x}
function mapsUrl(type,value){
  const url=new URL(`https://www.google.com/maps/${type}/`);
  url.searchParams.set('api','1');
  if(type==='dir'){
    url.searchParams.set('destination',value);
    url.searchParams.set('travelmode','transit');
  }else url.searchParams.set('query',value);
  return url.href;
}
function mapsButton(label,url,primary=false){
  const a=node('a',primary?'ub-map-link ub-map-primary':'ub-map-link',label);
  a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
export async function initMapData(){
  try{
    const response=await fetch('./assets/buildings.json');
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    const parsed=await response.json(); buildings=Array.isArray(parsed)?parsed:[];
  }catch(err){console.error('校園資料載入失敗',err);showToast('校園資料目前無法載入');}
  window.addEventListener('unibean:map-visible',()=>setTimeout(initCampusMap,80));
}
export function initCampusMap(){
  renderMapBuildingChips();renderMapDetailPanel(selected);
  if(map){setTimeout(()=>map.invalidateSize(),120);return;}
  if(!window.L){showToast('地圖圖層未載入，可使用 Google Maps 校區導航');return;}
  try{
    map=L.map('ttu-leaflet-map',{center:[25.06725,121.5223],zoom:17});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,attribution:'&copy; OpenStreetMap contributors · 建物座標為待核對展示資料'
    }).addTo(map);
    for(const b of buildings){
      if(!Number.isFinite(b.lat)||!Number.isFinite(b.lng))continue;
      const marker=L.marker([b.lat,b.lng]).addTo(map);
      const label=node('div','',`${b.name}｜${b.verified?'已核實':'示意位置，請勿直接導航'}`);
      marker.bindPopup(label);marker.on('click',()=>selectBuilding(b.id));markers[b.id]=marker;
    }
    setTimeout(()=>map.invalidateSize(),120);
  }catch(err){console.warn('Leaflet 初始化失敗',err);switchMapViewMode('svg');}
}
export function renderMapBuildingChips(){
  const target=$('map-building-chips');if(!target)return;target.replaceChildren();
  for(const b of buildings){
    const btn=node('button',b.id===selected?'px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 bg-bean-forest text-white':'px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 bg-white text-bean-forestDark border border-bean-mint/30',b.name);
    btn.type='button';btn.addEventListener('click',()=>selectBuilding(b.id));target.append(btn);
  }
}
export function selectBuilding(id){
  selected=id;renderMapBuildingChips();renderMapDetailPanel(id);
  const b=buildings.find(item=>item.id===id);
  if(b&&map&&markers[id]){map.setView([b.lat,b.lng],18);markers[id].openPopup();}
}
export function renderMapDetailPanel(id){
  const b=buildings.find(item=>item.id===id)||buildings[0],target=$('map-detail-panel');
  if(!target)return;target.replaceChildren();
  if(!b){target.append(node('p','p-5','尚無校園建築資料。'));return;}
  const header=node('div','p-5 bg-bean-softGreen border-b border-bean-creamGreen');
  header.append(node('div','text-xs text-bean-forest font-bold',`${b.code}｜${b.verified?'已核實':'展示資料・尚未核實'}`));
  header.append(node('h3','text-lg font-bold mt-2',b.name));
  header.append(node('p','text-sm text-gray-600 mt-2 leading-relaxed',b.summary||''));
  const body=node('div','p-5 space-y-3');
  body.append(node('p','preview-note','注意：建築座標、處室與樓層為待核對展示資料；不可直接當成精確導航終點。'));
  for(const office of b.offices||[])body.append(node('p','p-3 rounded-xl bg-bean-creamWhite border border-bean-creamGreen text-sm',office));
  const actions=node('div','ub-map-actions');
  // 尚未核實樓館座標，只對「大同大學校區」提供正式導航入口。
  actions.append(mapsButton('🧭 Google Maps 導航至大同大學',mapsUrl('dir',campus),true));
  actions.append(mapsButton(`🔎 在 Google Maps 搜尋「${b.name}」`,mapsUrl('search',`大同大學 ${b.name}`)));
  body.append(actions);
  body.append(node('p','ub-muted','Google Maps 的搜尋結果或終點由 Google 提供，出發前請再確認目的地。'));
  const back=node('button','ub-tool w-full','回到智慧問答');back.type='button';back.addEventListener('click',()=>switchTab('chat'));body.append(back);
  target.append(header,body);
}
export function switchMapViewMode(mode){
  const leaflet=$('ttu-leaflet-map'),svg=$('ttu-svg-map');if(!leaflet||!svg)return;
  leaflet.classList.toggle('hidden',mode!=='leaflet');svg.classList.toggle('hidden',mode==='leaflet');
  const a=$('map-mode-leaflet-btn'),b=$('map-mode-svg-btn');
  for(const [btn,active] of [[a,mode==='leaflet'],[b,mode!=='leaflet']]){
    if(btn)btn.className=active?'px-3 py-1.5 rounded-lg text-xs font-semibold bg-bean-forest text-white':'px-3 py-1.5 rounded-lg text-xs font-semibold text-bean-forestDark hover:bg-white/60';
  }
  if(mode==='leaflet')setTimeout(()=>map?.invalidateSize(),180);
}
export function jumpToMapBuilding(id){switchTab('map');setTimeout(()=>selectBuilding(id),200)}
