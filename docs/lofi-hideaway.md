# Lofi Hideaway

A cozy late-night room in **Lifestyle**, made for focus and background listening. An orange tabby sleeps curled on the windowsill: its body rises and falls with each breath, an ear flicks now and then, the tail tip twitches and small "z" strokes drift up from its head. Behind the glass, rain falls over an out-of-focus city with slowly changing lit windows and soft bokeh lights. Droplets cling to the window, then slide down and leave a trail, each on its own deterministic cycle.

On the desk, a record spins under a fixed lamp highlight, the tonearm rests in the groove and musical notes float upward. Steam curls from a mug of coffee. The desk lamp casts a warm cone and pool of light with an almost imperceptible flicker. Fairy lights twinkle along the top of the window, a potted plant and a hanging vine sway, and headlights from passing cars occasionally sweep across the wall.

Visual direction: a dim indigo night room lit warmly by the lamp, with wood, cream and coral accents. All objects are shaded by a single night-to-lamp lighting rule, so changing the lamp colour retints the whole room. Settings control animation speed, lamp warmth, cat fur colour, and toggles for the cat, rain, record, steam, fairy lights and car lights. Everything is drawn in code: no images, fonts or network requests.

Portrait screens get a stacked layout, with the window above and the desk below. Host pause/resume, visibility and frame-rate callbacks are supported. A speed of zero freezes the scene; the reduced-motion preference shows a still frame. The render buffer is bounded to 1920 × 1080.

`index.html?preview=8` generates a deterministic still. `build/check-lofi-hideaway.mjs` verifies core motion with optional effects disabled, settings, reduced motion, zero speed, pause, 4K bounding, portrait layout and offline loading. `build/capture-template-previews.mjs` checks real Edge rendering.
