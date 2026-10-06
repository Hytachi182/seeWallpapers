"""Package the offline underwater theme and check the embedded photograph matches its source."""
import base64
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
source = root / "templates" / "underwater-blue"
files = ("manifest.json", "index.html", "scene.js", "background.jpg", "background.js", "fish.png", "preview.jpg")
for name in files:
    if not (source / name).is_file() or not (source / name).stat().st_size:
        raise ValueError(f"Missing or empty file: {name}")
embedded = (source / "background.js").read_text(encoding="utf-8").split("base64,", 1)[1].split("'", 1)[0]
if base64.b64decode(embedded, validate=True) != (source / "background.jpg").read_bytes():
    raise ValueError("Embedded photograph is stale; run node build/generate-underwater-texture.mjs")
fish = (source / "background.js").read_text(encoding="utf-8").split("data:image/png;base64,", 1)[1].split("'", 1)[0]
if base64.b64decode(fish, validate=True) != (source / "fish.png").read_bytes():
    raise ValueError("Embedded fish is stale; run node build/generate-underwater-texture.mjs")
output = root / "dist"
output.mkdir(exist_ok=True)
package = output / "underwater-blue.seewall"
with ZipFile(package, "w", ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(source / name, name)
with ZipFile(package) as archive:
    if set(archive.namelist()) != set(files) or archive.testzip() is not None:
        raise ValueError("Invalid underwater archive")
    for name in files:
        if archive.read(name) != (source / name).read_bytes():
            raise ValueError(f"Package content mismatch: {name}")
print(f"{package.name}: matching photograph/fish and all seven files verified ({package.stat().st_size:,} bytes)")
