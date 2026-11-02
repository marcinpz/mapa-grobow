"""Publish only explicitly approved public assets, never the repository root."""
import json
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parent.parent
cemetery_files = ['data/jablonka.json', 'data/orawka.json']
datasets = [json.loads((ROOT / name).read_text(encoding='utf-8')) for name in cemetery_files]
all_people = [p for data in datasets for p in data['people']]
all_graves = [g for data in datasets for g in data['graves']]
people = {person['id']: person for person in all_people}
assert len(people) == len(all_people), 'Duplicate person IDs'
assert len({g['id'] for g in all_graves}) == len(all_graves), 'Duplicate grave IDs'
for person in people.values():
    assert person.get('living') is not True, 'Living person in public dataset'
    assert not ({'email', 'phone', 'address', 'privateNotes'} & person.keys()), 'Private fields in public dataset'
photos = set()
plans = set()
for data in datasets:
    plan = data['cemetery'].get('plan')
    if plan:
        path = plan['image']
        assert re.fullmatch(r'plans/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)', path, re.I), 'Unsafe plan path'
        assert (ROOT / path).is_file(), 'Missing cemetery plan'
        plans.add(path)
for grave in all_graves:
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
for name in ['index.html', 'app.js', '.nojekyll', *cemetery_files, *sorted(photos), *sorted(plans)]:
    destination = output / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / name, destination)
print(f'Public build: {len(all_graves)} graves, {len(photos)} photos, {len(plans)} plans')
