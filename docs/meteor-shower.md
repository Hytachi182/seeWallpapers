# Meteor Shower

An automatic, photographic meteor-shower wallpaper in the Space catalogue. A dark alpine lake and mountain silhouette sit beneath an original Milky Way photograph. Animated meteors travel outward from a common off-screen radiant, with fine luminous trails, tiny white-hot heads and restrained bloom. Occasional brighter fireballs have warm light catches and longer-lived atmospheric trains. Scintillation remains subtle.

The artwork aims for the appearance of night photography. It is a generated landscape with an artistic meteor simulation, not a real astronomical observation or date/location-specific forecast.

## Settings

| Setting | Behavior |
| --- | --- |
| Meteor shower intensity | Changes the frequency of arrivals. |
| Meteor speed | Changes the simulation speed, including the meteor passage and trail decay. |
| Meteor brightness | Changes the luminous cores, blooms and lingering trains. |
| Meteor light tint | Colors meteor light and the subtle scintillation overlay. |
| Lingering atmospheric trails | Shows or hides residual trains after meteor passages. |
| Subtle star scintillation | Shows or hides the fine star-light overlay. |

Host pause/resume, page visibility and the FPS limit are supported. Reduced motion opens a still sky with a meteor passage. The photograph fills desktop and portrait views with a centered cover crop; moving lights adapt to the viewport and remain clipped to the sky.

## Source and assets

`templates/meteor-shower/scene.js` owns the bounded meteor simulation, Canvas 2D rendering and lifecycle. `background.jpg` is an original photograph-style asset generated with the built-in Imagegen tool and converted to JPEG. Its [exact prompt](meteor-shower/background-prompt.txt) is retained in the documentation and embedded in JPEG metadata: a natural Milky Way, alpine mountains and lake, with no static shooting stars. All shooting stars are drawn by code.

The offline package has five root files: `manifest.json`, `index.html`, `scene.js`, `background.jpg`, `preview.jpg`. There are no network requests or external fonts. The application automatically includes the folder during compilation.

## Validation

- `node build/check-meteor-shower.mjs <temporary-playwright-folder>` checks a deterministic preview, ten simulated minutes, bounded actors, density response, real file-origin rendering, pause/resume, reduced motion and the pixel budget.
- `node build/capture-template-previews.mjs <temporary-playwright-folder> meteor-shower` captures desktop and portrait views and verifies every setting. The preview samples the first bright meteor at 6.1 seconds; the train setting is exercised after its passage finishes.
- `node build/capture-meteor-motion.mjs <temporary-playwright-folder>` records eight seconds of the actual animation to `build/visual-review/meteor-shower-motion.webm`; Playwright's FFmpeg component is required.
- `python build/package-meteor-shower.py` produces and verifies `dist/meteor-shower.seewall`.

At most 18 active meteors and 48 atmospheric trains remain in memory. Canvas backing pixels cap at 2,073,600, or 921,600 at 15 FPS and below. Physical desktop attachment and CPU/GPU consumption across real monitors require device validation.
