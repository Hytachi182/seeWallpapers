"""Package and verify the offline circuit-board wallpaper."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
source = root / "templates" / "copper-current"
files = ("manifest.json", "index.html", "scene.js", "preview.jpg")
output = root / "dist" / "copper-current.seewall"
output.parent.mkdir(exist_ok=True)
with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for name in files:
        if not (source / name).is_file() or not (source / name).stat().st_size:
            raise ValueError(f"Missing asset: {name}")
        archive.write(source / name, name)
with ZipFile(output) as archive:
    assert set(archive.namelist()) == set(files) and archive.testzip() is None
    for name in files:
        assert archive.read(name) == (source / name).read_bytes(), name
print(f"{output.name}: four offline assets and archive CRC verified ({output.stat().st_size:,} bytes)")
