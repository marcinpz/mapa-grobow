"""Chromium mobile viewport checks; optional live URL and offline map fallback."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import threading
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
    browser = playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'))
    for width in [360, 390, 768]:
        context = browser.new_context(viewport={'width': width, 'height': 844}, is_mobile=True, has_touch=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        if args.offline_map:
            page.route('https://unpkg.com/**', lambda route: route.abort())
        response = page.goto(url, wait_until='networkidle')
        assert response.status == 200, response.status
        expect(page.locator('.grave')).to_have_count(11)
        if args.offline_map:
            expect(page.locator('#map')).to_contain_text('Mapa jest niedostępna')
        else:
            expect(page.locator('#map')).to_be_visible()
            expect(page.locator('#map img.leaflet-tile-loaded').first).to_be_visible(timeout=15000)
            assert page.locator('#map img.leaflet-tile-loaded').first.evaluate('(img) => img.naturalWidth > 0')
            assert page.evaluate('map.getZoom()') >= 10
            page.locator('.leaflet-control-zoom-in').click()
            expect(page.locator('#map .leaflet-control-attribution')).to_contain_text('OpenStreetMap')
            page.wait_for_function('map.getZoom() >= 11')
            expect(page.locator('.leaflet-marker-icon')).to_have_count(2)
            expect(page.locator('#basemap-toggle')).to_have_text('🛰️ Zdjęcia')
            page.locator('#basemap-toggle').click()
            expect(page.locator('#basemap-toggle')).to_have_text('🗺️ Mapa')
            expect(page.locator('#basemap-toggle')).to_have_attribute('aria-pressed', 'true')
            page.locator('#basemap-toggle').click()
            expect(page.locator('#basemap-toggle')).to_have_text('🛰️ Zdjęcia')
        search = page.locator('#search')
        search.fill('  jozefina   jablonka ')
        expect(page.locator('.grave')).to_have_count(1)
        page.get_by_role('button', name='Zobacz szczegóły: Chrustek / Pilch', exact=True).click()
        expect(page.locator('#details h2')).to_have_text('Chrustek / Pilch')
        assert page.locator('#details h2').evaluate('(el) => el.getBoundingClientRect().top') < 844
        expect(page.locator('#details')).to_contain_text('Zdjęcie nagrobka czeka')
        expect(page.locator('#details a')).to_have_count(0)
        search.fill('Anna Basisty')
        expect(page.locator('.grave')).to_have_count(1)
        page.locator('.grave button').click()
        expect(page.locator('#details')).to_contain_text('2018-11')
        expect(page.locator('#details')).to_contain_text('Andrzej Pilch')
        expect(page.locator('#details')).to_contain_text('1875-10-30 – 1941-07-28')
        expect(page.locator('#details img')).to_have_count(2)
        for photo in page.locator('#details img').all():
            photo.scroll_into_view_if_needed()
            expect(photo).to_be_visible()
            page.wait_for_function('(img) => img.complete && img.naturalWidth > 0', arg=photo.element_handle())
        page.locator('#cemetery-plan summary').click()
        expect(page.locator('#cemetery-plan a')).to_have_attribute('href', 'plans/jablonka-2026-11-02.jpg')
        if not args.offline_map:
            expect(page.locator('#cemetery-plan .leaflet-image-layer')).to_be_visible()
            page.locator('#cemetery-plan .leaflet-control-zoom-in').click()
        page.locator('#cemetery-plan summary').click()
        search.fill('Arkadiusz Antolak')
        expect(page.locator('.grave')).to_have_count(1)
        page.locator('#cemetery-filter').select_option('jablonka')
        expect(page.locator('.grave')).to_have_count(0)
        page.locator('#cemetery-filter').select_option('orawka')
        expect(page.locator('.grave')).to_have_count(1)
        page.locator('#cemetery-filter').select_option('all')
        if not args.offline_map:
            page.locator('.grave button').click()
            page.get_by_role('button', name='Zaznacz położenie grobu').click()
            expect(page.locator('#location-editor')).to_be_visible()
            expect(page.locator('#copy-coordinates')).to_be_disabled()
            page.evaluate("""() => map.fire('click', {latlng: L.latLng(49.51083, 19.71755)})""")
            expect(page.locator('#copy-coordinates')).to_be_enabled()
            expect(page.locator('#draft-coordinates')).to_contain_text('49.51083')
            page.locator('#cancel-location').click()
            expect(page.locator('#location-editor')).to_be_hidden()
        search.fill('nieistniejace-nazwisko')
        expect(page.locator('#list')).to_contain_text('Brak wyników')
        search.fill('')
        expect(page.locator('.grave')).to_have_count(11)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
        assert page.locator('.grave button').first.bounding_box()['height'] >= 44
        assert not errors, errors
        page.screenshot(path=str(root / f'test-results/mobile-{width}.png'), full_page=True)
        context.close()
        print(f'PASS {width}px: search, details, layout, ' + ('map fallback' if args.offline_map else 'map zoom'))
    browser.close()
if not args.url:
    server.shutdown()
