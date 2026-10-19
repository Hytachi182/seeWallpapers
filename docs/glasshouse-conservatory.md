# Glasshouse Conservatory

Inside a Victorian glasshouse on a rainy afternoon, in **Nature**. The view runs down a tiled aisle under a barrel vault of painted iron ribs, purlins and glazing bars, toward a glazed end wall with an arched door. Raindrops run down the curve of the glass, following the vault from the ridge toward the sides, while beads of water glint on the panes. Beyond the glass, rain falls over blurred garden trees under a soft grey sky.

The raised beds on both sides are planted with tree ferns, ferns, banana plants, monstera and flowering shrubs, with ground cover between them. Plants fade slightly into the humid air with distance. In the foreground, monstera leaves, an arching frond and a hanging fern basket sway gently. A small stone fountain in the aisle sends arcs of water into its basin, where ripples spread. Butterflies of five colours flutter between the beds, mist drifts up from the soil, and sunbeams, with dust motes, break through the roof between showers. Three pendant lamps hang from the ridge, casting pools of light on the aisle.

Settings control the following:

- animation speed
- rain on the glass (0 for a dry day, up to a downpour)
- the time of day, from afternoon to dusk (the sky turns violet, the interior darkens, the frames lose their brightness and the lamps grow warmer)
- butterflies
- rising mist
- the fountain

Everything is drawn in code: no images, fonts or network requests. The view outside, the iron structure, the floor, the beds and their plants are drawn to off-screen layers, rebuilt only when the size or time of day changes. Each frame redraws only the rain, water, mist, light, lamps, butterflies and foreground foliage.

`index.html?preview=12` generates a deterministic still. Portrait screens move the vanishing point closer, so the view looks straight down the aisle. Host pause/resume, visibility and frame-rate callbacks are supported. A speed of zero freezes the scene; the reduced-motion preference shows a still frame. The render buffer is bounded to 1920 × 1080.

`build/check-glasshouse-conservatory.mjs` verifies deterministic previews and core motion with rain, butterflies, mist and the fountain disabled. It also checks settings including invalid values, reduced motion, zero speed, pause, 4K bounding, portrait layout and offline loading. `build/capture-template-previews.mjs` checks real Edge rendering and that each setting has a visible effect.
