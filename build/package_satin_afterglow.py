"""Package the original offline manga fashion scene and verify every archived byte."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
source = root / "templates" / "satin-afterglow"
files = ("manifest.json", "index.html", "scene.js", "motion.js", "artwork.jpg", "preview.jpg")
output = root / "dist" / "satin-afterglow.seewall"
output.parent.mkdir(exist_ok=True)
with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for name in files:
        asset = source / name
        if not asset.is_file() or not asset.stat().st_size:
            raise ValueError(f"Missing asset: {name}")
        archive.write(asset, name)
with ZipFile(output) as archive:
    assert set(archive.namelist()) == set(files) and archive.testzip() is None
    for name in files:
        assert archive.read(name) == (source / name).read_bytes(), name
print(f"{output.name}: offline assets, CRC and byte equality verified ({output.stat().st_size:,} bytes)")
