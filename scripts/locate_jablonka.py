"""Reproduce approximate grave coordinates from numbered parish sector plans."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
alignment = json.loads((ROOT / 'docs/overlay-alignment.json').read_text())
# Centres read on the original sector images; x right, y down, in pixels.
points = {
    'grave-001': ('L', '12', '9', [815, 833]),
    'grave-002': ('L', '12', '10', [819, 799]),
    'grave-003': ('H', '10', '18', [407, 493]),
    'grave-004': ('H', '7', '23', [294, 474]),
    'grave-006': ('A', '2', '10', [272, 298]),
    'grave-005': ('A', '11', '1', [658, 78]),
}

def transform(matrix, point):
    result = [sum(row[i] * point[i] for i in range(3)) for row in matrix]
    return [result[0] / result[2], result[1] / result[2], 1]

path = ROOT / 'data/jablonka.json'
data = json.loads(path.read_text(encoding='utf-8'))
for grave in data['graves']:
    sector, row, number, pixel = points[grave['id']]
    location = grave['location']
    assert (location['sector'], location['row'], location['number']) == (sector, row, number)
    overview = transform(alignment['sectorAlignment'][sector]['matrix'], [*pixel, 1])
    x, y, _ = transform(alignment['overviewToReference'], overview)
    extent = alignment['reference']
    width, height = alignment['referenceSize']
    mx = extent['xmin'] + (extent['xmax'] - extent['xmin']) * x / width
    my = extent['ymax'] - (extent['ymax'] - extent['ymin']) * y / height
    location.update({
        'coordinates': {
            'lat': round(math.degrees(2 * math.atan(math.exp(my / 6378137)) - math.pi / 2), 8),
            'lon': round(math.degrees(mx / 6378137), 8),
        },
        'precision': 'estimated-from-parish-plan',
        'source': f'https://parafiajablonka.katolicki.eu/cmentarz/4181/mapa_podklady/1-sektor%20{sector.lower()}.jpg',
        'planPixel': pixel,
        'coordinateNote': 'Położenie odczytane z numerowanego planu parafii i przeliczone według dopasowania nakładki. Przybliżone współrzędne, bez pomiaru GPS.',
    })
    if grave['id'] in ('grave-004', 'grave-005'):
        location['description'] = f'Sektor {sector}, rząd {row}, grób {number} ({sector}-{row}-{number}); katalog parafialny'
data['unresolved'][0] = 'Pozycje wszystkich grobów oszacowano z planów parafii. Brak pomiarów GPS.'
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Located all Jablonka graves from parish plans.')
