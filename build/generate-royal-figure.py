"""Describe the original sovereign's visible alpha bounds without editing her image."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
folder = root / "templates/gilded-court"
image = Image.open(folder / "sovereign.png")
bounds = image.getchannel("A").point(lambda value: 255 if value > 64 else 0).getbbox()
if bounds is None:
    raise ValueError("The sovereign sprite is empty")
x0,y0,x1,y1 = bounds
data = [max(0,x0-3),max(0,y0-3),min(image.width,x1+3)-max(0,x0-3),min(image.height,y1+3)-max(0,y0-3)]
(folder / "figure.js").write_text("window.seeRoyalFigure="+json.dumps(data)+";\n",encoding="utf-8")
print("Royal figure source bounds:",data)
