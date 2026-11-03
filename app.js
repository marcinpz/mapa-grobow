'use strict';
let dataset;
let cemeteryFilter = 'all';
const cemeteryMarkers = new Map();
const cemeteryCenters = new Map();
let map;
let selectedGrave = null;
const markers = new Map();
const byId = id => document.getElementById(id);
// New URL avoids cached, truncated JPEGs from the first publication.
const completeImageUrl = source => source + '?v=complete-20261102';
let sectorOverlay;
let sectorOverlayBounds;
let overlayEnabled = true;
function focusCemetery(id) {
  if (!map) return;
  if (id === 'jablonka' && sectorOverlayBounds) map.fitBounds(sectorOverlayBounds, {padding: [8, 8]});
  else if (cemeteryCenters.has(id)) map.setView(cemeteryCenters.get(id), 18);
}
function updateOverlay() {
  if (!sectorOverlay || !map) return;
  const visible = cemeteryFilter !== 'orawka';
  byId('overlay-controls').hidden = !visible;
  if (visible && overlayEnabled) sectorOverlay.addTo(map);
  else map.removeLayer(sectorOverlay);
}
function initializeOverlay() {
  const config = dataset.cemeteries.find(c => c.id === 'jablonka')?.overlay;
  if (!map || !config) return;
  sectorOverlayBounds = L.latLngBounds(config.bounds);
  sectorOverlay = L.imageOverlay(config.image, sectorOverlayBounds, {
    opacity: config.opacity, attribution: config.attribution, interactive: false
  });
  sectorOverlay.on('error', () => { byId('overlay-status').textContent = 'Nie udało się wczytać planu. Możesz nadal korzystać ze zdjęć satelitarnych.'; });
  const controls = element('section');
  controls.id = 'overlay-controls';
  controls.setAttribute('aria-label', 'Plan sektorów');
  const toggle = element('button', 'Ukryj plan sektorów');
  toggle.id = 'overlay-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-pressed', 'true');
  toggle.onclick = () => {
    overlayEnabled = !overlayEnabled;
    toggle.textContent = overlayEnabled ? 'Ukryj plan sektorów' : 'Pokaż plan sektorów';
    toggle.setAttribute('aria-pressed', String(overlayEnabled));
    updateOverlay();
  };
  const label = element('label', 'Widoczność planu ');
  label.htmlFor = 'overlay-opacity';
  const slider = element('input');
  slider.id = 'overlay-opacity';
  slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '5';
  slider.value = String(config.opacity * 100);
  const value = element('output', slider.value + '%');
  value.htmlFor = slider.id;
  slider.oninput = () => { sectorOverlay.setOpacity(Number(slider.value)/100); value.textContent = slider.value + '%'; };
  label.append(value);
  const status = element('p', 'Plan parafialny: 11 sektorów. Dopasowanie orientacyjne do zdjęć satelitarnych.', 'muted');
  status.id = 'overlay-status';
  status.setAttribute('role', 'status');
  controls.append(toggle, label, slider, status);
  byId('map').parentElement.after(controls);
  updateOverlay();
}
function appendSources(parent, sources) {
  for (const source of sources || []) {
    if (!/^https:\/\//i.test(source.url)) continue;
    const link = element('a', source.label);
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener';
    const paragraph = element('p');
    paragraph.append(link);
    parent.append(paragraph);
  }
}
const normalize = value => String(value ?? '').toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').trim();
const peopleFor = grave => grave.personIds.map(id => dataset.people.find(person => person.id === id)).filter(Boolean);
const validGps = value => value && Number.isFinite(value.lat) && Number.isFinite(value.lon) && Math.abs(value.lat) <= 90 && Math.abs(value.lon) <= 180;
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function initializeMap() {
  if (!window.L) {
    byId('map').textContent = 'Mapa jest niedostępna. Galeria nadal działa.';
    return;
  }
  map = L.map('map', {maxZoom: 21}).setView([49.50, 19.71], 12);
  const streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap contributors'
  });
  const aerial = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 21, maxNativeZoom: 19,
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community'
  }).addTo(map);
  const layerToggle = byId('basemap-toggle');
  let aerialActive = true;
  layerToggle.textContent = '🗺️ Mapa';
  layerToggle.setAttribute('aria-pressed', 'true');
  layerToggle.title = 'Przełącz na mapę OpenStreetMap';
  layerToggle.addEventListener('click', () => {
    aerialActive = !aerialActive;
    if (aerialActive) {
      map.removeLayer(streets);
      aerial.addTo(map);
    } else {
      map.removeLayer(aerial);
      streets.addTo(map);
    }
    layerToggle.textContent = aerialActive ? '🗺️ Mapa' : '🛰️ Zdjęcia';
    layerToggle.setAttribute('aria-pressed', String(aerialActive));
    layerToggle.title = aerialActive ? 'Przełącz na mapę OpenStreetMap' : 'Przełącz na zdjęcia lotnicze i satelitarne';
  });
  for (const cemetery of dataset.cemeteries) {
    const gps = cemetery.coordinates;
    if (!validGps(gps)) continue;
    cemeteryCenters.set(cemetery.id, [gps.lat, gps.lon]);
    const marker = L.marker([gps.lat, gps.lon]).bindPopup(
      element('span', cemetery.name + ' — orientacyjny środek cmentarza, nie położenie grobu')
    ).addTo(map);
    cemeteryMarkers.set(cemetery.id, marker);
  }
  initializeOverlay();
  updateMapForFilter();
  dataset.graves.forEach(grave => {
    const gps = grave.location?.coordinates;
    if (!validGps(gps)) return;
    const marker = L.marker([gps.lat, gps.lon]).bindPopup(element('span', grave.label)).on('click', () => show(grave, true));
    marker.options.title = grave.label;
    markers.set(grave.id, marker);
  });
}
function updateMapForFilter() {
  if (!map) return;
  updateOverlay();
  for (const [id, marker] of cemeteryMarkers) {
    if (cemeteryFilter === 'all' || cemeteryFilter === id) marker.addTo(map);
    else map.removeLayer(marker);
  }
  if (cemeteryFilter !== 'all' && cemeteryCenters.has(cemeteryFilter)) {
    focusCemetery(cemeteryFilter);
  } else if (cemeteryCenters.size > 1) {
    map.fitBounds([...cemeteryCenters.values()], {padding: [25, 25]});
  }
}
let filteredGraves = [];
let currentView = 'gallery';
let photoIndex = 0;
let returnFocus;
const locationLabel = g => g.location?.sector ? [g.location.sector,g.location.row,g.location.number].join('–') : 'Położenie do ustalenia';
function setView(view) {
  currentView = view;
  byId('gallery-view').hidden = view !== 'gallery';
  byId('map-view').hidden = view !== 'map';
  byId('gallery-tab').setAttribute('aria-pressed',String(view === 'gallery'));
  byId('map-tab').setAttribute('aria-pressed',String(view === 'map'));
  byId('view-title').textContent = view === 'gallery' ? 'Zachowane w pamięci' : 'Odnajdź miejsce spoczynku';
  byId('view-description').textContent = view === 'gallery' ? 'Nagrobki, fotografie i miejsca spoczynku bliskich.' : 'Wybierz znacznik, aby otworzyć grób.';
  if (view === 'map' && map) { map.invalidateSize(); updateMapForFilter(); }
}
function placeholder() {
  const node = element('div', undefined, 'missing-photo');
  node.innerHTML = '<svg viewBox="0 0 64 80" fill="none" aria-hidden="true"><path d="M12 70V29a20 20 0 0 1 40 0v41M7 70h50M32 22v27M23 31h18" stroke="currentColor" stroke-width="2"/></svg><span>Zdjęcie wkrótce</span>';
  return node;
}
function show(grave) { location.hash = 'grave/' + grave.id; }
function openGrave(grave) {
  selectedGrave = grave;
  photoIndex = 0;
  const dialog = byId('grave-dialog');
  if (!dialog.open) { returnFocus = document.activeElement; dialog.showModal(); }
  const layout = element('div', undefined, 'detail-layout');
  const stage = element('section', undefined, 'photo-stage');
  stage.setAttribute('aria-label','Zdjęcia nagrobka');
  const photos = grave.photos || [];
  if (photos.length) {
    const photo = element('img'); photo.alt = 'Nagrobek: ' + grave.label;
    const controls = element('div', undefined, 'photo-controls');
    const previous = element('button','←'); previous.setAttribute('aria-label','Poprzednie zdjęcie');
    const next = element('button','→'); next.setAttribute('aria-label','Następne zdjęcie');
    const count = element('span'); count.setAttribute('aria-live','polite');
    const full = element('a','Otwórz pełne zdjęcie'); full.target='_blank'; full.rel='noopener';
    const update = () => { photo.src=completeImageUrl(photos[photoIndex]); full.href=photo.src; count.textContent=(photoIndex+1)+' / '+photos.length; };
    previous.onclick=()=>{photoIndex=(photoIndex+photos.length-1)%photos.length;update();};
    next.onclick=()=>{photoIndex=(photoIndex+1)%photos.length;update();};
    let touchX;
    photo.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX;},{passive:true});
    photo.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>50)(dx<0?next:previous).click();},{passive:true});
    photo.onerror=()=>{photo.alt='Nie udało się wczytać zdjęcia. Użyj odnośnika poniżej.';};
    controls.append(previous,count,next); controls.hidden=photos.length<2;
    stage.append(photo,controls,full); update();
  } else stage.append(placeholder());
  if (grave.photoCaption) stage.append(element('p', grave.photoCaption, 'muted'));
  const info=element('section',undefined,'detail-info');
  info.append(element('p',grave.cemeteryLocality+' · '+locationLabel(grave),'eyebrow'));
  const title=element('h2',grave.label);title.id='grave-title';info.append(title);
  for (const person of peopleFor(grave)) {
    const row=element('div',undefined,'person');
    row.append(element('strong',person.name),element('span',(person.birth||'?')+' – '+(person.death||'?')));
    if (person.dateConfidence==='to-verify' || person.birthDateConfidence==='uncertain') row.append(element('span','Daty do weryfikacji'));
    info.append(row);
  }
  const actions=element('div',undefined,'actions');
  const onMap=element('button','Pokaż na mapie');
  onMap.onclick=()=>{location.hash='map';setTimeout(()=>{if(!map)return;const gps=grave.location?.coordinates;if(validGps(gps))map.setView([gps.lat,gps.lon],21);else focusCemetery(grave.cemeteryId);},50);};
  actions.append(onMap);
  const gps=grave.location?.coordinates;
  if(validGps(gps)) {
    const directions=element('a','Wyznacz trasę ↗');directions.href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(gps.lat+','+gps.lon);directions.target='_blank';directions.rel='noopener';actions.append(directions);
  }
  info.append(actions,element('p',validGps(gps)?'Położenie przybliżone, według planu parafii.':'Dokładne położenie tego grobu nie jest jeszcze ustalone.','muted'));
  const sources=element('details');sources.append(element('summary','Źródła i informacje'));
  if(grave.photoCredit)sources.append(element('p',grave.photoCredit,'muted'));
  if(grave.location?.description)sources.append(element('p',grave.location.description,'muted'));
  appendSources(sources,grave.sources);info.append(sources);
  layout.append(stage,info);byId('details').replaceChildren(layout);
  const i=filteredGraves.findIndex(g=>g.id===grave.id);
  byId('previous-grave').disabled=i<=0;byId('next-grave').disabled=i<0||i===filteredGraves.length-1;
}
function route() {
  if(!dataset)return;
  const hash=location.hash.slice(1);
  const grave=hash.startsWith('grave/')?dataset.graves.find(g=>g.id===hash.slice(6)):null;
  if(grave){openGrave(grave);return;}
  if(byId('grave-dialog').open){byId('grave-dialog').close();returnFocus?.focus();}
  setView(hash==='map'?'map':'gallery');
}
function render(query = '') {
  const words=normalize(query).split(/\s+/).filter(Boolean);
  filteredGraves=dataset.graves.filter(grave=>{
    if(cemeteryFilter!=='all'&&grave.cemeteryId!==cemeteryFilter)return false;
    const text=normalize([grave.label,grave.location?.description,...peopleFor(grave).flatMap(p=>[p.name,p.birthSurname]),grave.cemeteryName].join(' '));
    return words.every(w=>text.includes(w));
  });
  byId('result-count').textContent=filteredGraves.length+' miejsc pamięci';
  const list=byId('list');list.replaceChildren();
  for(const grave of filteredGraves){
    const card=element('article',undefined,'grave');
    const link=element('a',undefined,'grave-link');link.href='#grave/'+grave.id;link.setAttribute('aria-label','Otwórz grób: '+grave.label);
    const cover=element('div',undefined,'cover');
    if(grave.photos?.length){const photo=element('img');photo.src=completeImageUrl(grave.photos[0]);photo.alt='Nagrobek: '+grave.label;photo.loading='lazy';photo.onerror=()=>cover.replaceChildren(placeholder());cover.append(photo);}else cover.append(placeholder());
    const caption=element('div',undefined,'caption');caption.append(element('h2',grave.label),element('p',grave.cemeteryLocality+' · '+locationLabel(grave)),element('p',peopleFor(grave).map(p=>p.name).join(' · '),'names'));
    link.append(cover,caption);card.append(link);list.append(card);
  }
  if(!filteredGraves.length)list.append(element('p','Nie znaleziono grobów. Spróbuj innego nazwiska lub cmentarza.','empty'));
  const visible=new Set(filteredGraves.map(g=>g.id));if(map)markers.forEach((m,id)=>visible.has(id)?m.addTo(map):map.removeLayer(m));
}
window.addEventListener('hashchange',route);
byId('gallery-tab').onclick=()=>location.hash='gallery';
byId('map-tab').onclick=()=>location.hash='map';
byId('close-grave').onclick=()=>location.hash=currentView;
byId('grave-dialog').addEventListener('cancel',e=>{e.preventDefault();location.hash=currentView;});
for(const [id,delta] of [['previous-grave',-1],['next-grave',1]])byId(id).onclick=()=>{const i=filteredGraves.findIndex(g=>g.id===selectedGrave?.id);if(filteredGraves[i+delta])show(filteredGraves[i+delta]);};
byId('grave-dialog').addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const button=byId('details').querySelector('[aria-label="'+(e.key==='ArrowLeft'?'Poprzednie':'Następne')+' zdjęcie"]');button?.click();}});
Promise.all(['jablonka', 'orawka'].map(async id => {
  const response = await fetch('./data/' + id + '.json');
  if (!response.ok) throw Error('Nie udało się pobrać danych cmentarza: ' + id);
  const data = await response.json();
  return data;
})).then(cemeteries => {
  dataset = {
    cemeteries: cemeteries.map(c => c.cemetery),
    people: cemeteries.flatMap(c => c.people),
    graves: cemeteries.flatMap(c => c.graves.map(g => ({
      ...g, cemeteryId: c.cemetery.id, cemeteryName: c.cemetery.name,
      cemeteryLocality: c.cemetery.locality
    })))
  };
  const filter = byId('cemetery-filter');
  for (const c of cemeteries) {
    const option = element('option', c.cemetery.name);
    option.value = c.cemetery.id;
    filter.append(option);
  }
  filter.addEventListener('change', event => {
    cemeteryFilter = event.target.value;
    render(byId('search').value);
    updateMapForFilter();
  });
  initializeMap();
  render(byId('search').value);
  route();
}).catch(error => { byId('list').textContent = error.message; });
byId('search').addEventListener('input', event => { if (dataset) render(event.target.value); });

