"""Build the standalone Burrow Battle package after preview capture."""
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
FILES = ("manifest.json", "index.html", "scene.js", "preview.jpg")


def main():
    source = ROOT / "templates" / "burrow-battle"
    manifest = json.loads((source / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["id"] == "burrow-battle"
    for name in FILES:
        assert (source / name).is_file() and (source / name).stat().st_size, name
    package = ROOT / "dist" / "burrow-battle.seewall"
    package.parent.mkdir(exist_ok=True)
    with ZipFile(package, "w", ZIP_DEFLATED) as archive:
        for name in FILES:
            archive.write(source / name, name)
    with ZipFile(package) as archive:
        assert set(archive.namelist()) == set(FILES) and archive.testzip() is None
        for name in FILES:
            assert archive.read(name) == (source / name).read_bytes(), name
    print(f"{package.name}: four root entries and content verified ({package.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
