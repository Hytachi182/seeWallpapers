"""Package the five audited scenes, including every local layer/dependency."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
for scene in ("moonlit-dunes", "satin-afterglow", "inkbound-courier", "pirate-cove", "lunar-silence"):
    source = root / "templates" / scene
    files = sorted(path for path in source.rglob("*") if path.is_file())
    names = {path.relative_to(source).as_posix() for path in files}
    assert {"manifest.json", "index.html", "scene.js", "preview.jpg"} <= names
    output = root / "dist" / f"{scene}.seewall"
    output.parent.mkdir(exist_ok=True)
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        for file in files:
            archive.write(file, file.relative_to(source).as_posix())
    with ZipFile(output) as archive:
        assert set(archive.namelist()) == names and archive.testzip() is None
        for file in files:
            assert archive.read(file.relative_to(source).as_posix()) == file.read_bytes()
    print(f"{scene}: {len(files)} offline assets, archive CRC and byte equality verified")
