"""Package and verify the seven self-contained pixel worlds after preview capture."""
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
IDS = ("pixel-defender", "castle-raid", "tiny-city", "dungeon-loop",
       "pixel-island", "robot-factory", "tower-climber")
FILES = ("manifest.json", "index.html", "scene.js", "preview.jpg")


def main():
    output = ROOT / "dist"
    output.mkdir(exist_ok=True)
    for theme_id in IDS:
        source = ROOT / "templates" / theme_id
        manifest = json.loads((source / "manifest.json").read_text(encoding="utf-8"))
        if manifest["id"] != theme_id:
            raise ValueError(f"Manifest mismatch: {theme_id}")
        for name in FILES:
            if not (source / name).is_file() or not (source / name).stat().st_size:
                raise ValueError(f"Missing or empty file: {theme_id}/{name}")
        package = output / f"{theme_id}.seewall"
        with ZipFile(package, "w", ZIP_DEFLATED) as archive:
            for name in FILES:
                archive.write(source / name, name)
        with ZipFile(package) as archive:
            if set(archive.namelist()) != set(FILES) or archive.testzip() is not None:
                raise ValueError(f"Invalid package: {theme_id}")
            for name in FILES:
                if archive.read(name) != (source / name).read_bytes():
                    raise ValueError(f"Package content mismatch: {theme_id}/{name}")
        print(f"{package.name}: four root entries and content verified ({package.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
