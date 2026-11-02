'use strict';
let dataset;
let cemeteryFilter = 'all';
const cemeteryMarkers = new Map();
const cemeteryCenters = new Map();
let map;
let selectedGrave = null;
let editMode = false;
let draftMarker = null;
let draftCoordinates = null;
const markers = new Map();
const byId = id => document.getElementById(id);
let planMap;
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
function initializePlan() {
  const plan = dataset.cemeteries.find(c => c.id === 'jablonka')?.plan;
  if (!plan) return;
  const panel = element('details');
  panel.id = 'cemetery-plan';
  panel.append(element('summary', 'Plan cmentarza w Jabłonce — powiększ'));
  panel.append(element('p', 'Zdjęcie tablicy z 2.11.2026. Plan można powiększać i przesuwać. Nie jest jeszcze dopasowany do współrzędnych mapy.', 'muted'));
  const viewer = element('div');
  viewer.style.height = '420px';
  viewer.setAttribute('aria-label', 'Powiększany plan cmentarza w Jabłonce');
  const link = element('a', 'Otwórz oryginalny plan w pełnej rozdzielczości');
  link.href = plan.image;
  link.target = '_blank';
  link.rel = 'noopener';
  panel.append(viewer, link);
  appendSources(panel, plan.sources);
  byId('details').before(panel);
  panel.addEventListener('toggle', () => {
    if (!panel.open) return;
    if (planMap) { planMap.invalidateSize(); return; }
    if (!window.L) {
      viewer.replaceChildren(element('p', 'Podgląd jest niedostępny. Otwórz oryginalny plan poniżej.'));
      return;
    }
    const picture = new Image();
    picture.onload = () => {
      planMap = L.map(viewer, {crs: L.CRS.Simple, minZoom: -3, maxZoom: 3, scrollWheelZoom: false});
      const bounds = [[0, 0], [picture.naturalHeight, picture.naturalWidth]];
      L.imageOverlay(plan.image, bounds).addTo(planMap);
      planMap.fitBounds(bounds);
    };
    picture.onerror = () => { viewer.textContent = 'Nie udało się wczytać planu.'; };
    picture.src = plan.image;
  });
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
    byId('map').textContent = 'Mapa jest niedostępna. Lista i karty grobów nadal działają.';
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
  map.on('click', event => {
    if (!editMode || !selectedGrave) return;
    const gps = {lat: Number(event.latlng.lat.toFixed(7)), lon: Number(event.latlng.lng.toFixed(7))};
    draftCoordinates = gps;
    if (draftMarker) draftMarker.setLatLng([gps.lat, gps.lon]);
    else draftMarker = L.marker([gps.lat, gps.lon], {draggable: true}).addTo(map);
    draftMarker.off('dragend').on('dragend', () => {
      const point = draftMarker.getLatLng();
      draftCoordinates = {lat: Number(point.lat.toFixed(7)), lon: Number(point.lng.toFixed(7))};
      renderDraft();
    });
    renderDraft();
  });
  dataset.graves.forEach(grave => {
    const gps = grave.location?.coordinates;
    if (!validGps(gps)) return;
    const marker = L.marker([gps.lat, gps.lon]).bindPopup(element('span', grave.label)).on('click', () => show(grave, true));
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
function stopEditing() {
  editMode = false;
  draftCoordinates = null;
  if (draftMarker && map) map.removeLayer(draftMarker);
  draftMarker = null;
  const panel = byId('location-editor');
  if (panel) panel.hidden = true;
  if (map) map.getContainer().style.cursor = '';
}
function renderDraft() {
  const status = byId('draft-coordinates');
  if (!status) return;
  status.textContent = draftCoordinates
    ? 'Wybrany punkt: ' + draftCoordinates.lat + ', ' + draftCoordinates.lon + ' (przeciągnij pinezkę, aby poprawić)'
    : 'Dotknij mapy w miejscu grobu. Możesz potem przeciągnąć pinezkę.';
  byId('copy-coordinates').disabled = !draftCoordinates;
}
function startEditing() {
  if (!map || !selectedGrave) return;
  stopEditing();
  editMode = true;
  byId('location-editor').hidden = false;
  map.getContainer().style.cursor = 'crosshair';
  const previous = selectedGrave.location?.coordinates;
  if (validGps(previous)) {
    draftCoordinates = {...previous};
    draftMarker = L.marker([previous.lat, previous.lon], {draggable: true}).addTo(map);
    draftMarker.on('dragend', () => {
      const point = draftMarker.getLatLng();
      draftCoordinates = {lat: Number(point.lat.toFixed(7)), lon: Number(point.lng.toFixed(7))};
      renderDraft();
    });
  }
  renderDraft();
  map.invalidateSize();
  byId('map').scrollIntoView({block: 'center', behavior: 'smooth'});
}
function show(grave, moveFocus = false) {
  if (selectedGrave?.id !== grave.id) stopEditing();
  selectedGrave = grave;
  const details = byId('details');
  const heading = element('h2', grave.label);
  heading.tabIndex = -1;
  details.replaceChildren(heading, element('p', grave.cemeteryName + ' · ' + (grave.location?.description || '')));
  for (const person of peopleFor(grave)) {
    const row = element('div', undefined, 'person');
    row.append(element('strong', person.name), document.createTextNode(' · ' + (person.birth || '?') + (person.birthDateConfidence === 'uncertain' ? ' (data niepewna)' : '') + ' – ' + (person.death || '?')));
    details.append(row);
  }
  if (grave.otherInscription) details.append(element('p', grave.otherInscription, 'muted'));
  appendSources(details, grave.sources);
  const photos = grave.photos || [];
  if (!photos.length) details.append(element('p', 'Zdjęcie nagrobka czeka na dodanie.', 'muted'));
  for (const source of photos) {
    if (!/^photos\/[a-zA-Z0-9/_-]+\.(jpe?g|png|webp)$/i.test(source) || source.includes('..')) continue;
    const photo = element('img', undefined, 'photo');
    photo.alt = 'Nagrobek: ' + grave.label;
    photo.loading = 'lazy';
    photo.src = source;
    photo.addEventListener('error', () => photo.replaceWith(element('p', 'Nie udało się wczytać zdjęcia.', 'muted')));
    details.append(photo);
  }
  const gps = grave.location?.coordinates;
  if (validGps(gps)) {
    const link = element('a', 'Nawiguj do grobu');
    link.href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(gps.lat + ',' + gps.lon);
    link.target = '_blank';
    link.rel = 'noopener';
    const paragraph = element('p');
    paragraph.append(link);
    details.append(paragraph);
    if (map) map.setView([gps.lat, gps.lon], 18);
  } else {
    details.append(element('p', 'Dokładne współrzędne grobu nieustalone. Znacznik na mapie wskazuje tylko cmentarz.', 'muted'));
    focusCemetery(grave.cemeteryId);
  }
  const editButton = element('button', 'Zaznacz położenie grobu');
  editButton.type = 'button';
  editButton.onclick = startEditing;
  details.append(element('p', 'Położenie możesz ustalić na zdjęciu lotniczym i skopiować do pliku danych.', 'muted'), editButton);
  if (moveFocus) {
    heading.focus({preventScroll: true});
    details.scrollIntoView({block: 'start'});
  }
}
function render(query = '') {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const filtered = dataset.graves.filter(grave => {
    if (cemeteryFilter !== 'all' && grave.cemeteryId !== cemeteryFilter) return false;
    const text = normalize([grave.label, grave.location?.description, ...peopleFor(grave).flatMap(person => [person.name, person.birthSurname]), grave.cemeteryName, grave.cemeteryLocality].join(' '));
    return words.every(word => text.includes(word));
  });
  byId('result-count').textContent = 'Znaleziono grobów: ' + filtered.length;
  const list = byId('list');
  list.replaceChildren();
  for (const grave of filtered) {
    const card = element('article', undefined, 'grave');
    const button = element('button', 'Zobacz szczegóły');
    button.type = 'button';
    button.setAttribute('aria-label', 'Zobacz szczegóły: ' + grave.label);
    button.onclick = () => show(grave, true);
    card.append(element('h3', grave.label), element('p', grave.cemeteryName), element('p', peopleFor(grave).map(person => person.name).join(' · ')), button);
    list.append(card);
  }
  if (!filtered.length) list.append(element('p', 'Brak wyników. Zmień wyszukiwanie.'));
  const visible = new Set(filtered.map(grave => grave.id));
  if (map) markers.forEach((marker, id) => visible.has(id) ? marker.addTo(map) : map.removeLayer(marker));
}
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
    stopEditing();
    cemeteryFilter = event.target.value;
    render(byId('search').value);
    updateMapForFilter();
  });
  initializeMap();
  initializePlan();
  render(byId('search').value);
  if (dataset.graves.length) show(dataset.graves[0]);
}).catch(error => { byId('list').textContent = error.message; });
byId('search').addEventListener('input', event => { if (dataset) render(event.target.value); });

byId('cancel-location').addEventListener('click', stopEditing);
byId('copy-coordinates').addEventListener('click', async () => {
  if (!selectedGrave || !draftCoordinates) return;
  const data = JSON.stringify({
    cemetery: selectedGrave.cemeteryId,
    graveId: selectedGrave.id,
    coordinates: draftCoordinates,
    precision: 'estimated-from-imagery'
  }, null, 2);
  const output = byId('location-json');
  output.value = data;
  output.hidden = false;
  output.select();
  try {
    await navigator.clipboard.writeText(data);
    byId('copy-status').textContent = 'Skopiowano. Współrzędne nie zostały jeszcze zapisane w repozytorium.';
  } catch (_) {
    byId('copy-status').textContent = 'Zaznaczony tekst skopiuj ręcznie. Współrzędne nie zostały jeszcze zapisane.';
  }
});
