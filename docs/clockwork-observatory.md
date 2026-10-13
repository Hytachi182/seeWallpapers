# Clockwork Observatory

A steampunk observatory at night, in **Cinematic**. The dome's ribbed shell turns on its riveted rail every forty seconds or so. During each turn, dust falls from the rail and the room trembles slightly. The open slit moves across the ceiling with the dome, and the brass telescope follows it. The telescope's declination wheel turns with the tube and meshes with a small drive pinion.

Through the slit, the Milky Way and the stars drift slowly, a few bright stars twinkle, and the moon shows its real phase for today's date. Shooting stars cross the slit on a regular schedule. A pale moonbeam falls on the floor, with dust motes floating in it.

On the left wall, a gear train turns continuously. Each gear's radius comes from its tooth count, its speed follows the gear ratio, and its phase is offset so that the teeth of neighbouring gears interleave. A compound gear shares an axle with its pinion. Beside the gears, a steam pipe with a valve wheel and a twitching pressure gauge vents puffs that swell every few seconds.

The long-case clock shows the real local time with Roman numerals and a red seconds hand. Its pendulum swings behind the glass, a moon-phase window sits in the crown, and every quarter hour a small automaton strikes a bell. The orrery on the round table starts from today's mean planetary longitudes (Mercury to Saturn, plus Earth's moon) and then advances a few days per second. A hanging lantern and a desk lamp flicker over bookshelves, a framed star chart, a quill and an inkwell.

Settings control the following:

- mechanism speed
- the metal finish, which blends continuously from brass to copper to blued steel
- the time of night, from night to dawn (the sky brightens, the stars fade and the light warms)
- real time on the clock and orrery (when off, the clock runs from 21:00 at ten times speed)
- shooting stars, the steam valve and dome rotation

Everything is drawn in code with system fonts: no images, web fonts or network requests. The walls, shelves, floor, clock case, table and desk are drawn to an off-screen layer, and each gear is pre-rendered once per finish. Each frame only redraws the sky, the dome ribs and the moving parts.

`index.html?preview=12` uses a fixed date (13 October 2026, 22:10), so stills are deterministic. Portrait screens move the pieces closer together and enlarge them. Host pause/resume, visibility and frame-rate callbacks are supported. A speed of zero freezes the scene; the reduced-motion preference shows a still frame. The render buffer is bounded to 1920 × 1080.

`build/check-clockwork-observatory.mjs` verifies core motion with meteors, steam, dome rotation and real time disabled, settings including invalid values, reduced motion, zero speed, pause, 4K bounding, portrait layout and offline loading. `build/capture-template-previews.mjs` checks real Edge rendering and that each setting has a visible effect.
