"""Publish only explicitly approved public assets, never the repository root."""
import json
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parent.parent
data = json.loads((ROOT / 'data/jablonka.json').read_text())
people = {person['id']: person for person in data['people']}
assert len(people) == len(data['people']), 'Duplicate person IDs'
assert len({g['id'] for g in data['graves']}) == len(data['graves']), 'Duplicate grave IDs'
for person in people.values():
    assert person.get('living') is not True, 'Living person in public dataset'
    assert not ({'email', 'phone', 'address', 'privateNotes'} & person.keys()), 'Private fields in public dataset'
photos = set()
for grave in data['graves']:
    assert all(pid in people for pid in grave['personIds']), 'Unknown person reference'
    assert grave.get('photosPending') == (not bool(grave.get('photos'))), 'Inconsistent photo status'
    for photo in grave.get('photos', []):
        assert re.fullmatch(r'photos/[a-zA-Z0-9/_-]+\.(?:jpe?g|png|webp)', photo, re.I), 'Unsafe photo path'
        assert (ROOT / photo).is_file(), 'Missing grave photo'
        photos.add(photo)
output = ROOT / '_site'
if output.exists():
    shutil.rmtree(output)
output.mkdir()
for name in ['index.html', 'app.js', '.nojekyll', 'data/jablonka.json', *sorted(photos)]:
    destination = output / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / name, destination)
print(f'Public build: {len(data["graves"])} graves, {len(photos)} photos')
