"""Rank live screenshot motion; this is a screening metric, not a quality score."""
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("folder", type=Path)
args = parser.parse_args()
rows = []
for last in sorted(args.folder.glob("*-2.png")):
    name = last.name[:-6]
    files = [args.folder / f"{name}-{i}.png" for i in range(3)]
    if not all(file.is_file() for file in files):
        continue
    images = [np.asarray(Image.open(file).convert("RGB"), dtype=np.int16) for file in files]
    change = np.maximum(np.max(abs(images[0]-images[1]), axis=2), np.max(abs(images[0]-images[2]), axis=2))
    rows.append({"id": name, "changed_pct": round(float((change > 8).mean()*100), 3), "mean_delta": round(float(change.mean()), 3)})
rows.sort(key=lambda item: item["changed_pct"])
(args.folder / "ranking.json").write_text(json.dumps(rows, indent=2)+"\n", encoding="utf-8")
print(f"{len(rows)} themes ranked; lowest sampled motion:")
print(json.dumps(rows[:10], indent=2))
