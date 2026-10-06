"""Package the offline particles theme with its unmodified upstream library and license."""
import hashlib
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
source = root / "templates" / "particle-nexus"
files = ("manifest.json", "index.html", "scene.js", "particles.js", "PARTICLES-LICENSE.md", "preview.jpg")
for name in files:
    if not (source / name).is_file() or not (source / name).stat().st_size:
        raise ValueError(f"Missing or empty file: {name}")
if hashlib.sha256((source / "particles.js").read_bytes()).hexdigest() != "89c8e085c3da89b31fd63bf88102068b931e58d1de9b64a2b29728ac28827d28":
    raise ValueError("Bundled upstream library no longer matches the documented revision")
output = root / "dist"
output.mkdir(exist_ok=True)
package = output / "particle-nexus.seewall"
with ZipFile(package, "w", ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(source / name, name)
with ZipFile(package) as archive:
    if set(archive.namelist()) != set(files) or archive.testzip() is not None:
        raise ValueError("Invalid particle package")
    for name in files:
        if archive.read(name) != (source / name).read_bytes():
            raise ValueError(f"Package content mismatch: {name}")
print(f"{package.name}: upstream hash, license and all six files verified ({package.stat().st_size:,} bytes)")
