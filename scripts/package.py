"""Create and verify a reproducible, minimal Chrome extension archive."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
dist = root / 'dist'
allowed = {'manifest.json', 'content.js', 'font-worker.js', 'icon.png'}
actual = {p.name for p in dist.iterdir()}
if actual != allowed:
    raise SystemExit(f'Unexpected dist contents: {sorted(actual)}')
manifest = json.loads((dist / 'manifest.json').read_text())
if manifest.get('icons', {}).get('128') != 'icon.png':
    raise SystemExit('Missing extension icon')
if manifest != json.loads((root / 'manifest.json').read_text()):
    raise SystemExit('Manifest differs from source; rebuild first')
if manifest.get('permissions') or manifest.get('host_permissions') != ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'] or manifest.get('background') != {'service_worker': 'font-worker.js'}:
    raise SystemExit('Unexpected extension permissions/background')
assert manifest['content_scripts'][0]['world'] == 'ISOLATED'
assert all(pattern.startswith('https://*.slack.com/customize/emoji') for pattern in manifest['content_scripts'][0]['matches'])
version = manifest['version']
if not all(part.isdigit() for part in version.split('.')):
    raise SystemExit('Invalid version')
release = root / 'releases'
release.mkdir(exist_ok=True)
archive = release / f'slack-emoji-{version}.zip'
with ZipFile(archive, 'w', compression=ZIP_DEFLATED) as z:
    for name in sorted(allowed):
        info = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        z.writestr(info, (dist / name).read_bytes())
with ZipFile(archive) as z:
    assert set(z.namelist()) == allowed
    assert z.testzip() is None
    for name in allowed:
        assert z.read(name) == (dist / name).read_bytes()
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(archive.with_suffix('.zip.sha256')).write_text(f'{digest}  {archive.name}\n')
print(f'Created and verified: {archive.relative_to(root)}')
print(f'SHA-256: {digest}')
