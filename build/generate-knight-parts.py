"""Describe alpha bounds of the original 4x3 atlas; retain its artwork unchanged."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
folder = root / "templates" / "emberwatch-knight"
image = Image.open(folder / "armor.png").convert("RGBA")
names = ("helmet", "chest", "hips", "shoulder", "upperArm", "forearm", "thigh", "shin", "shield", "sword", "farShoulder", "cape")
parts = {}
# The generated sword tip and cape cross the nominal row boundary. These
# inspected normalized source regions separate neighboring components cleanly.
regions = ((0,0,1,345/1086), (0,0,1,346/1086), (0,0,1,335/1086), (0,0,1,335/1086),
           (0,345/1086,1,670/1086), (0,345/1086,1,669/1086),
           (0,345/1086,1,690/1086), (0,335/1086,1,680/1086),
           (0,674/1086,1,1), (0,670/1086,1,1), (0,700/1086,1,1), (0,682/1086,1,1))
for index, name in enumerate(names):
    col, row = index % 4, index // 4
    left, right = col * image.width // 4, (col + 1) * image.width // 4
    top, bottom = round(regions[index][1]*image.height), round(regions[index][3]*image.height)
    alpha = image.getchannel("A").crop((left, top, right, bottom))
    bounds = alpha.point(lambda value: 255 if value > 96 else 0).getbbox()
    if bounds is None:
        raise ValueError(f"Atlas component is empty: {name}")
    x0, y0, x1, y1 = bounds
    x0, y0, x1, y1 = max(0, x0 - 3), max(0, y0 - 3), min(right-left, x1+3), min(bottom-top, y1+3)
    parts[name] = [left+x0, top+y0, x1-x0, y1-y0]
(folder / "parts.js").write_text("window.seeKnightParts=" + json.dumps(parts, separators=(",", ":")) + ";\n", encoding="utf-8")
print(f"Twelve armor components described from unchanged {image.width}x{image.height} atlas")
