"""Keep each independently importable scene's offline motion helper identical."""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = (root / "build/living-scene-motion.js").read_bytes()
for scene in ("inkbound-courier", "satin-afterglow", "rose-riviera"):
    target = root / "templates" / scene / "motion.js"
    target.write_bytes(source)
    assert target.read_bytes() == source
    print(f"{scene}: offline motion helper synchronized")
