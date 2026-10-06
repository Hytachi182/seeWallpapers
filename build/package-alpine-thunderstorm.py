"""Package and verify the self-contained photographic thunderstorm wallpaper."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
source = root / "templates" / "alpine-thunderstorm"
files = ("manifest.json", "index.html", "scene.js", "background.jpg", "preview.jpg")
for name in files:
    if not (source / name).is_file() or not (source / name).stat().st_size:
        raise ValueError(f"Missing or empty file: {name}")
output = root / "dist"
output.mkdir(exist_ok=True)
package = output / "alpine-thunderstorm.seewall"
with ZipFile(package, "w", ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(source / name, name)
with ZipFile(package) as archive:
    if set(archive.namelist()) != set(files) or archive.testzip() is not None:
        raise ValueError("Invalid storm archive")
    for name in files:
        if archive.read(name) != (source / name).read_bytes():
            raise ValueError(f"Package content mismatch: {name}")
print(f"{package.name}: all five files verified ({package.stat().st_size:,} bytes)")
