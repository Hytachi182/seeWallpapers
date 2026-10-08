# Rose Riviera

An original coastal fashion miniature in rose, champagne and turquoise. A curved Mediterranean villa, tropical flowers, striped parasols, original adult fashion figurines and a pearlescent convertible overlook a sunset pool.

The artwork was generated with the built-in ImageGen tool and saved in `templates/rose-riviera/artwork.jpg`. The prompt asked for a premium wide miniature diorama with a rose-pink villa, turquoise pool, coastal sunset, original adult fashion figurines and a pink convertible, without brands, logos, lettering, recognizable copyrighted characters, or replicas of branded sets and toys. The original generation is kept separately; the wallpaper includes a JPEG copy.

Rose Riviera uses its own title and artwork. It is not presented as an official or affiliated branded theme, and includes no Barbie name, logo, character assets, music or borrowed promotional artwork.

Continuous source-pixel refraction and coherent caustics animate the pool; a separate water region animates the coast. Bougainvillea petals follow layered wind gusts, lantern flames flicker and a soft highlight travels across the car bonnet instead of floating star-shaped glints. Characters, architecture and the car remain stable. Settings control animation speed, petal density, water, lighting and sparkle. Speed zero and reduced-motion preferences show the untouched illustration. Host pause/resume, frame-rate changes and visibility suspension are supported.

The scene is fully offline. The existing template content glob includes it in application builds. Import `dist/rose-riviera.seewall` into an installed application. Preview at `index.html?preview=12`. Run `node build/check-rose-riviera.mjs <temporary-playwright-folder>` to check stable characters, animation, reduced motion and repeated lifecycle callbacks. The shared preview tool checks desktop/portrait rendering and settings. Physical desktop attachment and performance still require live application validation.

Animation revision 1.0.1 uses the shared offline motion helper, bundled as `motion.js` in each package. Its requestAnimationFrame clock honors 15/30/60 FPS budgets without recounting elapsed time. Regenerate identical helper copies with `python build/sync-living-scene-motion.py`; verify scheduling with `node build/check-living-scene-clock.mjs`.
