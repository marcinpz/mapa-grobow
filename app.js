'use strict';
let dataset;
let cemeteryFilter = 'all';
let map;
const markers = new Map();
const byId = id => document.getElementById(id);
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
  map = L.map('map').setView([49.48, 19.69], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  dataset.graves.forEach(grave => {
    const gps = grave.location?.coordinates;
    if (!validGps(gps)) return;
    const marker = L.marker([gps.lat, gps.lon]).bindPopup(element('span', grave.label)).on('click', () => show(grave, true));
    markers.set(grave.id, marker);
  });
}
function show(grave, moveFocus = false) {
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
  } else details.append(element('p', 'Dokładne współrzędne GPS jeszcze nieustalone.', 'muted'));
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
  });
  initializeMap();
  render(byId('search').value);
  if (dataset.graves.length) show(dataset.graves[0]);
}).catch(error => { byId('list').textContent = error.message; });
byId('search').addEventListener('input', event => { if (dataset) render(event.target.value); });
