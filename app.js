import {groups} from './data/brands.js';
const $=id=>document.getElementById(id);
for(const g of groups){for(const id of ['group','hotelGroup']){const o=document.createElement('option');o.value=g.id;o.textContent=g.name;$(id).append(o)}}
function brands(){const q=$('search').value.trim().toLowerCase(),s=$('group').value;const found=groups.flatMap(g=>g.brands.filter(b=>(!s||g.id===s)&&(!q||b.toLowerCase().includes(q)||g.name.toLowerCase().includes(q))).map(b=>({name:b,group:g.name})));$('brands').replaceChildren(...found.map(b=>{const el=document.createElement('article');el.className='card';const label=document.createElement('div');label.className='group';label.textContent=b.group;const title=document.createElement('h3');title.textContent=b.name;const p=document.createElement('p');p.textContent='호텔별 정보 준비 중';el.append(label,title,p);return el}));if(!found.length)$('brands').textContent='검색 결과가 없습니다.'}
$('search').addEventListener('input',brands);$('group').addEventListener('change',brands);brands();
for(const g of groups){const a=document.createElement('a');a.href=g.loyaltyUrl;a.target='_blank';a.rel='noopener noreferrer';const title=document.createElement('strong');title.textContent=g.program;const hint=document.createElement('span');hint.textContent='공식 웹사이트 ↗';a.append(title,hint);$('loyalty').append(a)}
$('year').textContent=new Date().getFullYear();
let map=null,markerLayer=null,hotels=[],filtered=[],page=0;
const PAGE_SIZE=100;
let regionNames=null;try{regionNames=new Intl.DisplayNames(['ko'],{type:'region'})}catch(e){}
function countryLabel(c){if(!c)return'';if(/^[A-Za-z]{2}$/.test(c)){try{return regionNames?.of(c.toUpperCase())||c}catch(e){return c}}return c}
function details(h){return[h.brand,h.city||h.address,countryLabel(h.country)].filter(Boolean).join(' · ')}
function sourceLink(h,short){return h.url?{href:h.url,text:short?'공식 페이지 ↗':'공식 페이지에서 확인 ↗'}:{href:h.osm_url,text:short?'출처 ↗':'OSM 원본 확인 ↗'}}
// Drop an OSM record when All the Places has the same group's hotel within ~150 m.
function mergeSources(atp,osm){
  const cell=(lat,lon)=>Math.round(lat*100)+':'+Math.round(lon*100),grid=new Map();
  for(const h of atp){const k=cell(h.lat,h.lon);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(h)}
  const near=(a,b)=>{const dy=(a.lat-b.lat)*111320,dx=(a.lon-b.lon)*111320*Math.cos(a.lat*Math.PI/180);return dx*dx+dy*dy<=150*150};
  const keep=osm.filter(o=>{const la=Math.round(o.lat*100),lo=Math.round(o.lon*100);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){for(const a of grid.get((la+i)+':'+(lo+j))||[])if(a.group===o.group&&near(a,o))return false}return true});
  return atp.concat(keep);
}
try{
  if(!window.L)throw Error('지도 라이브러리를 불러오지 못했습니다');
  map=L.map('map',{scrollWheelZoom:false,worldCopyJump:true,preferCanvas:true}).setView([20,10],2);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',maxZoom:18}).addTo(map);
  markerLayer=L.layerGroup().addTo(map);
  map.on('moveend zoomend',updateMarkers);
  setTimeout(()=>map.invalidateSize(),250);
}catch(e){$('map').textContent='지도를 불러오지 못했습니다. 새로고침하거나 네트워크 연결을 확인하세요.';console.error(e)}
function updateMarkers(){
  if(!map||!markerLayer)return;
  markerLayer.clearLayers();
  const bounds=map.getBounds().pad(.1),visible=filtered.filter(h=>bounds.contains([h.lat,h.lon]));
  const max=600,step=Math.max(1,Math.ceil(visible.length/max));
  for(let i=0;i<visible.length;i+=step){
    const h=visible[i],marker=L.circleMarker([h.lat,h.lon],{radius:6,color:'#173e47',weight:1,fillColor:'#c9a777',fillOpacity:.85});
    const popup=document.createElement('div'),title=document.createElement('strong'),desc=document.createElement('p'),link=document.createElement('a');
    const src=sourceLink(h,false);title.textContent=h.name;desc.textContent=details(h);
    link.href=src.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent=src.text;
    popup.append(title,desc,link);marker.bindPopup(popup);marker.addTo(markerLayer);
  }
  $('mapHint').textContent=visible.length>max?'현재 지도 범위 '+visible.length.toLocaleString('ko-KR')+'개 중 일부 표시 · 확대하면 더 자세히 볼 수 있습니다':'현재 지도 범위 '+visible.length.toLocaleString('ko-KR')+'개 표시';
}
function renderPage(){
  const items=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  $('hotelResults').replaceChildren(...items.map(h=>{const card=document.createElement('article');card.className='hotel-item';const name=document.createElement('strong');name.textContent=h.name;const detail=document.createElement('span');detail.textContent=details(h);const src=sourceLink(h,true);const a=document.createElement('a');a.href=src.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=src.text;card.append(name,detail,a);return card}));
  if(!filtered.length)$('hotelResults').textContent='현재 조건에 맞는 호텔 데이터가 없습니다.';
  $('pageStatus').textContent=filtered.length?((page*PAGE_SIZE+1).toLocaleString('ko-KR')+'–'+Math.min((page+1)*PAGE_SIZE,filtered.length).toLocaleString('ko-KR')+' / '+filtered.length.toLocaleString('ko-KR')):'0 / 0';
  $('prevPage').disabled=page===0;$('nextPage').disabled=(page+1)*PAGE_SIZE>=filtered.length;
}
function renderHotels(){
  const q=$('hotelSearch').value.trim().toLocaleLowerCase(),group=$('hotelGroup').value;
  filtered=hotels.filter(h=>(!group||h.group===group)&&(!q||[h.name,h.city,h.address,h.country,countryLabel(h.country),h.brand].some(x=>String(x||'').toLocaleLowerCase().includes(q))));
  page=0;$('hotelCount').textContent=filtered.length.toLocaleString('ko-KR')+'개 호텔';renderPage();updateMarkers();
}
$('prevPage').addEventListener('click',()=>{if(page>0){page--;renderPage()}});
$('nextPage').addEventListener('click',()=>{if((page+1)*PAGE_SIZE<filtered.length){page++;renderPage()}});
$('hotelSearch').addEventListener('input',renderHotels);$('hotelGroup').addEventListener('change',renderHotels);
async function loadCatalog(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error(path+' HTTP '+r.status);const d=await r.json();if(!Array.isArray(d.hotels))throw Error(path+' invalid data');return d}
const valid=h=>Number.isFinite(h.lat)&&Number.isFinite(h.lon)&&h.name&&groups.some(g=>g.id===h.group);
const [atpRes,osmRes]=await Promise.allSettled([loadCatalog('/data/hotels_atp.json'),loadCatalog('/data/hotels.json')]);
const atp=atpRes.status==='fulfilled'?atpRes.value.hotels.filter(valid):[];
const osm=osmRes.status==='fulfilled'?osmRes.value.hotels.filter(valid):[];
if(atpRes.status==='rejected')console.error(atpRes.reason);
if(osmRes.status==='rejected')console.error(osmRes.reason);
hotels=mergeSources(atp,osm);
if(atpRes.status==='rejected'&&osmRes.status==='rejected'){$('dataStatus').textContent='호텔 데이터 파일을 불러오지 못했습니다.'}
else{const parts=[];if(atp.length)parts.push('All the Places '+atp.length.toLocaleString('ko-KR')+'개 ('+(atpRes.value.updated_at||'날짜 미상')+')');if(osm.length)parts.push('OSM '+(hotels.length-atp.length).toLocaleString('ko-KR')+'개 추가 ('+(osmRes.value.updated_at||'날짜 미상')+')');$('dataStatus').textContent=parts.length?'출처: '+parts.join(' · '):'데이터 수집 대기 중'}
renderHotels();
