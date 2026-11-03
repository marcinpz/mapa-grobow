"""Chromium mobile viewport checks; optional live URL and offline map fallback."""
import argparse
import hashlib
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import threading
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url')
parser.add_argument('--offline-map', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
if not args.url:
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(root / '_site')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
url = args.url or f'http://127.0.0.1:{server.server_port}/'
(root / 'test-results').mkdir(exist_ok=True)
with sync_playwright() as playwright:
    client = playwright.request.new_context()
    checksums = json.loads((root / 'data/asset-checksums.json').read_text(encoding='utf-8'))
    for asset, expected in checksums.items():
        response = client.get(urljoin(url.rstrip('/') + '/', asset))
        assert response.ok, f'Cannot download asset: {asset}'
        assert hashlib.sha256(response.body()).hexdigest() == expected, f'Corrupt published asset: {asset}'
    client.dispose()
    browser = playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'))
    for width in [360, 390, 768, 1280]:
        context = browser.new_context(viewport={'width': width, 'height': 844}, is_mobile=True, has_touch=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        if args.offline_map:
            page.route('https://unpkg.com/**', lambda route: route.abort())
        response = page.goto(url, wait_until='networkidle')
        assert response.status == 200, response.status
        expect(page.locator('.grave')).to_have_count(11)
        expect(page.locator('#gallery-view')).to_be_visible()
        expect(page.locator('#map-view')).to_be_hidden()
        assert page.get_by_text('Zobacz szczegóły', exact=True).count() == 0
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(root / f'test-results/gallery-{width}.png'), full_page=True)
        page.get_by_role('link', name='Otwórz grób: Zborek', exact=True).click()
        expect(page.locator('#grave-dialog')).to_be_visible()
        expect(page.locator('#grave-title')).to_have_text('Zborek')
        photo = page.locator('.photo-stage img')
        expect(photo).to_have_attribute('src', 'photos/grave-001/parish-1.jpg?v=complete-20261102')
        page.get_by_role('button', name='Następne zdjęcie', exact=True).click()
        expect(photo).to_have_attribute('src', 'photos/grave-001/parish-2.jpg?v=complete-20261102')
        page.keyboard.press('ArrowLeft')
        expect(photo).to_have_attribute('src', 'photos/grave-001/parish-1.jpg?v=complete-20261102')
        page.wait_for_function("document.querySelector('.photo-stage img').naturalWidth > 0")
        assert photo.evaluate("el => getComputedStyle(el).objectFit === 'contain'")
        page.screenshot(path=str(root / f'test-results/grave-{width}.png'), full_page=False)
        page.get_by_role('button', name='Następny grób', exact=True).click()
        expect(page.locator('#grave-title')).to_have_text('Burtan / Pilch')
        page.go_back()
        expect(page.locator('#grave-title')).to_have_text('Zborek')
        page.keyboard.press('Escape')
        expect(page.locator('#grave-dialog')).not_to_be_visible()
        search = page.locator('#search')
        search.fill('jozefina')
        expect(page.locator('.grave')).to_have_count(1)
        page.locator('.grave-link').click()
        expect(page.locator('#details')).to_contain_text('2003-05-21')
        expect(page.locator('#details')).to_contain_text('1940-11-02')
        page.get_by_role('button', name='Pokaż na mapie', exact=True).click()
        expect(page.locator('#map-view')).to_be_visible()
        expect(page.locator('#grave-dialog')).not_to_be_visible()
        if args.offline_map:
            expect(page.locator('#map')).to_contain_text('Mapa jest niedostępna')
        else:
            page.wait_for_function("map.getCenter().distanceTo(markers.get('grave-004').getLatLng()) < 1")
            assert page.evaluate('markers.size') == 5
            expect(page.locator('#map .leaflet-image-layer')).to_be_visible()
            page.locator('#overlay-opacity').fill('40')
            assert page.evaluate('sectorOverlay.options.opacity') == 0.4
            page.locator('#overlay-toggle').click()
            assert not page.evaluate('map.hasLayer(sectorOverlay)')
            page.locator('#overlay-toggle').click()
            page.locator('#basemap-toggle').click()
            expect(page.locator('#map .leaflet-control-attribution')).to_contain_text('OpenStreetMap')
            page.locator('#basemap-toggle').click()
        search.fill('')
        page.locator('#cemetery-filter').select_option('orawka')
        if not args.offline_map:
            assert not page.evaluate('map.hasLayer(sectorOverlay)')
        page.get_by_role('button', name='Galeria', exact=True).click()
        expect(page.locator('.grave')).to_have_count(6)
        page.get_by_role('link', name='Otwórz grób: Arkadiusz Antolak', exact=True).click()
        expect(page.locator('.photo-stage')).to_contain_text('Zdjęcie wkrótce')
        expect(page.locator('#details')).to_contain_text('nie jest jeszcze ustalone')
        page.get_by_role('button', name='← Wróć', exact=True).click()
        expect(page.locator('#grave-dialog')).not_to_be_visible()
        expect(page.locator('#gallery-view')).to_be_visible()
        expect(page.locator('#cemetery-filter')).to_have_value('orawka')
        search.fill('brak-takiego-nazwiska')
        expect(search).to_have_value('brak-takiego-nazwiska')
        expect(page.locator('.empty')).to_be_visible()
        assert not errors, errors
        print(f'PASS {width}px: gallery, photos, history, filters, map, missing photos')
        context.close()
    browser.close()
if not args.url:
    server.shutdown()
