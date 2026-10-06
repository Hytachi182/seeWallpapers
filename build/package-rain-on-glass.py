"""Create the offline rain theme package and verify its texture and archive contents."""
import base64
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent.parent
source = root / "templates" / "rain-on-glass"
files = ("manifest.json", "index.html", "scene.js", "background.jpg", "background.js", "preview.jpg")
for name in files:
    if not (source / name).is_file() or not (source / name).stat().st_size:
        raise ValueError(f"Missing or empty theme asset: {name}")
embedded = (source / "background.js").read_text(encoding="utf-8").split("base64,", 1)[1].split("'", 1)[0]
if base64.b64decode(embedded, validate=True) != (source / "background.jpg").read_bytes():
    raise ValueError("Embedded photograph is stale; run node build/generate-rain-texture.mjs")
output = root / "dist"
output.mkdir(exist_ok=True)
package = output / "rain-on-glass.seewall"
with ZipFile(package, "w", ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(source / name, name)
with ZipFile(package) as archive:
    if set(archive.namelist()) != set(files) or archive.testzip() is not None:
        raise ValueError("Invalid rain package")
    for name in files:
        if archive.read(name) != (source / name).read_bytes():
            raise ValueError(f"Package content mismatch: {name}")
print(f"{package.name}: embedded photo and all six archive entries verified ({package.stat().st_size:,} bytes)")
