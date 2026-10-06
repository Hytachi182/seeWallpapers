"""Package and verify the complete offline cinematic space scene."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
source = root / 'templates' / 'galactic-battle'
files = ('manifest.json', 'index.html', 'scene.js', 'background.jpg', 'fighter.png', 'enemy.png', 'preview.jpg')
output = root / 'dist' / 'galactic-battle.seewall'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in files:
        if not (source / name).is_file() or not (source / name).stat().st_size:
            raise ValueError(f'Missing asset: {name}')
        archive.write(source / name, name)
with ZipFile(output) as archive:
    assert set(archive.namelist()) == set(files) and archive.testzip() is None
    for name in files:
        assert archive.read(name) == (source / name).read_bytes(), name
print(f'{output.name}: seven offline assets and archive CRC verified ({output.stat().st_size:,} bytes)')
