import {groups} from './data/brands.js';
const $=id=>document.getElementById(id);
for(const g of groups){for(const id of ['group','hotelGroup']){const o=document.createElement('option');o.value=g.id;o.textContent=g.name;$(id).append(o)}}
function brands(){const q=$('search').value.trim().toLowerCase(),s=$('group').value;const found=groups.flatMap(g=>g.brands.filter(b=>(!s||g.id===s)&&(!q||b.toLowerCase().includes(q)||g.name.toLowerCase().includes(q))).map(b=>({name:b,group:g.name})));$('brands').replaceChildren(...found.map(b=>{const el=document.createElement('article');el.className='card';const label=document.createElement('div');label.className='group';label.textContent=b.group;const title=document.createElement('h3');title.textContent=b.name;const p=document.createElement('p');p.textContent='호텔별 정보 준비 중';el.append(label,title,p);return el}));if(!found.length)$('brands').textContent='검색 결과가 없습니다.'}
$('search').addEventListener('input',brands);$('group').addEventListener('change',brands);brands();
for(const g of groups){const a=document.createElement('a');a.href=g.loyaltyUrl;a.target='_blank';a.rel='noopener noreferrer';const title=document.createElement('strong');title.textContent=g.program;const hint=document.createElement('span');hint.textContent='공식 웹사이트 ↗';a.append(title,hint);$('loyalty').append(a)}
$('year').textContent=new Date().getFullYear();
let map=null,markerLayer=null,hotels=[],filtered=[],page=0;
const PAGE_SIZE=100;
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
    title.textContent=h.name;desc.textContent=[h.brand,h.city,h.country].filter(Boolean).join(' · ');
    link.href=h.osm_url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='OSM 원본 확인 ↗';
    popup.append(title,desc,link);marker.bindPopup(popup);marker.addTo(markerLayer);
  }
  $('mapHint').textContent=visible.length>max?'현재 지도 범위 '+visible.length.toLocaleString('ko-KR')+'개 중 일부 표시 · 확대하면 더 자세히 볼 수 있습니다':'현재 지도 범위 '+visible.length.toLocaleString('ko-KR')+'개 표시';
}
function renderPage(){
  const items=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  $('hotelResults').replaceChildren(...items.map(h=>{const card=document.createElement('article');card.className='hotel-item';const name=document.createElement('strong');name.textContent=h.name;const detail=document.createElement('span');detail.textContent=[h.brand,h.city,h.country].filter(Boolean).join(' · ');const a=document.createElement('a');a.href=h.osm_url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='출처 ↗';card.append(name,detail,a);return card}));
  if(!filtered.length)$('hotelResults').textContent='현재 조건에 맞는 호텔 데이터가 없습니다.';
  $('pageStatus').textContent=filtered.length?((page*PAGE_SIZE+1).toLocaleString('ko-KR')+'–'+Math.min((page+1)*PAGE_SIZE,filtered.length).toLocaleString('ko-KR')+' / '+filtered.length.toLocaleString('ko-KR')):'0 / 0';
  $('prevPage').disabled=page===0;$('nextPage').disabled=(page+1)*PAGE_SIZE>=filtered.length;
}
function renderHotels(){
  const q=$('hotelSearch').value.trim().toLocaleLowerCase(),group=$('hotelGroup').value;
  filtered=hotels.filter(h=>(!group||h.group===group)&&(!q||[h.name,h.city,h.country,h.brand].some(x=>String(x||'').toLocaleLowerCase().includes(q))));
  page=0;$('hotelCount').textContent=filtered.length.toLocaleString('ko-KR')+'개 호텔';renderPage();updateMarkers();
}
$('prevPage').addEventListener('click',()=>{if(page>0){page--;renderPage()}});
$('nextPage').addEventListener('click',()=>{if((page+1)*PAGE_SIZE<filtered.length){page++;renderPage()}});
$('hotelSearch').addEventListener('input',renderHotels);$('hotelGroup').addEventListener('change',renderHotels);
try{
  const response=await fetch('/data/hotels.json',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();if(!Array.isArray(data.hotels))throw Error('Invalid data');
  hotels=data.hotels.filter(h=>Number.isFinite(h.lat)&&Number.isFinite(h.lon)&&h.name&&groups.some(g=>g.id===h.group));
  $('dataStatus').textContent=hotels.length?'OSM 수집 데이터 · 최종 갱신 '+(data.updated_at||'미상')+' · 전 세계 데이터 확대 중':'데이터 수집 대기 중';
}catch(e){$('dataStatus').textContent='호텔 데이터 파일을 불러오지 못했습니다.';console.error(e)}
renderHotels();
