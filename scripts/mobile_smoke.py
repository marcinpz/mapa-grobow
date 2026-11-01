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
        expect(page.locator('.grave')).to_have_count(5)
        if args.offline_map:
            expect(page.locator('#map')).to_contain_text('Mapa jest niedostępna')
        else:
            expect(page.locator('#map')).to_be_visible()
            expect(page.locator('#map img.leaflet-tile-loaded').first).to_be_visible(timeout=15000)
            assert page.locator('#map img.leaflet-tile-loaded').first.evaluate('(img) => img.naturalWidth > 0')
            assert page.evaluate('map.getZoom()') == 13
            page.locator('.leaflet-control-zoom-in').click()
            expect(page.locator('#map .leaflet-control-attribution')).to_contain_text('OpenStreetMap')
            page.wait_for_function('map.getZoom() === 14')
            expect(page.locator('.leaflet-marker-icon')).to_have_count(0)
        search = page.locator('#search')
        search.fill('  jozefina   jablonka ')
        expect(page.locator('.grave')).to_have_count(1)
        page.get_by_role('button', name='Zobacz szczegóły: Chrustek / Pilch', exact=True).click()
        expect(page.locator('#details h2')).to_have_text('Chrustek / Pilch')
        assert page.locator('#details h2').evaluate('(el) => el.getBoundingClientRect().top') < 844
        expect(page.locator('#details')).to_contain_text('Zdjęcie nagrobka czeka')
        expect(page.locator('#details a')).to_have_count(0)
        search.fill('Anna')
        expect(page.locator('.grave')).to_have_count(1)
        page.locator('.grave button').click()
        expect(page.locator('#details')).to_contain_text('data niepewna')
        expect(page.locator('#details')).to_contain_text('Andrzej Pilch — napis')
        search.fill('nieistniejace-nazwisko')
        expect(page.locator('#list')).to_contain_text('Brak wyników')
        search.fill('')
        expect(page.locator('.grave')).to_have_count(5)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
        assert page.locator('.grave button').first.bounding_box()['height'] >= 44
        assert not errors, errors
        page.screenshot(path=str(root / f'test-results/mobile-{width}.png'), full_page=True)
        context.close()
        print(f'PASS {width}px: search, details, layout, ' + ('map fallback' if args.offline_map else 'map zoom'))
    browser.close()
if not args.url:
    server.shutdown()
