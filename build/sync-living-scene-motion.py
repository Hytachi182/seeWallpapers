"""Keep each independently importable scene's offline motion helper identical."""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = (root / "build/living-scene-motion.js").read_bytes()
for scene in ("inkbound-courier", "satin-afterglow", "rose-riviera", "stratos-flight", "emberwatch-knight", "hollow-lantern", "gilded-court", "pirate-cove"):
    target = root / "templates" / scene / "motion.js"
    target.write_bytes(source)
    assert target.read_bytes() == source
    print(f"{scene}: offline motion helper synchronized")
