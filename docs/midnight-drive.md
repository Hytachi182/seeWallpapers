# Midnight Drive

An original fictional sports coupe cruising an elevated city highway in **Cinematic**. The car holds its place in frame while the world scrolls past in parallax layers: distant mountains, a hazy far skyline, a near skyline with flickering windows and blinking aviation lights, streetlights, the concrete barrier, lane markings and a foreground guardrail. Wheel rotation is derived from the distance travelled, with faded spoke copies standing in for motion blur instead of strobing. The body rides on a small suspension signal while the wheels stay planted on the road.

Streetlights glide across the paintwork as soft highlight bands, and the horizon is reflected along the shoulder line. Headlights cast a beam and a pool of light ahead, and the tail light leaves a long-exposure trail that follows the suspension history. Traffic in the far lane is overtaken by the coupe, with the occasional faster car passing it. Lamps and vehicle lights leave rippling reflections on the wet asphalt.

Visual direction: a synthwave dusk in indigo, magenta and amber, a striped setting sun behind the towers and a crimson coupe by default. The moonlit night palette switches to deep blue, cool LED streetlights, stars and a moon. Rain adds slanted streaks and road splashes. Settings control paint colour, driving speed, night, traffic, headlight beams, tail light trails, reflections and rain. Everything is drawn in code: no images, fonts or network requests.

Host pause/resume, visibility and frame-rate callbacks are supported. A speed of zero parks the scene; the reduced-motion preference shows a still frame. The render buffer is bounded to 1920 × 1080, and the car scales to fit portrait displays.

`index.html?preview=12` generates a deterministic still. `build/check-midnight-drive.mjs` verifies core motion with every optional effect disabled, settings, reduced motion, zero speed, pause, 4K bounding, portrait layout and offline loading. `build/capture-template-previews.mjs` checks real Edge rendering.
