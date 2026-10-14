# Iron Vanguard

An original military outpost at dusk in the Cinematic collection. Everything is drawn procedurally on a canvas: there is no bitmap artwork, insignia, real unit marking or franchise design.

A fictional battle tank holds a ridge and fires its main gun every nine seconds, with barrel recoil, hull rock, antenna whip, muzzle flash lighting the terrain, blast dust and drifting barrel smoke. Each shot lands on the far range about 1.4 s later as a flash and a rising dust column. Searchlights sweep the sky, two helicopters cross at different depths with spinning rotors and blinking navigation lights, and a transport aircraft periodically drops a stick of paratroopers that sway down behind the hills. In the foreground a lookout raises binoculars behind a sandbag wall, a soldier patrols with an articulated walk and a plain olive flag waves. Distant artillery glows, tracer bursts, burning positions, embers and dust complete the atmosphere.

## Controls and runtime

Customize the horizon glow color, animation speed (0–2), light intensity, and toggle tank fire/impacts/tracers, searchlights, aircraft, smoke/dust/embers and the patrol/lookout/flag motion. Every element is a deterministic function of scene time, so `index.html?preview=<seconds>` renders an exact frame (the gallery uses `preview=9.08`, just after a shot). Host pause/resume, visibility changes and FPS settings drive one requestAnimationFrame loop; speed zero and reduced motion freeze the scene. The render surface is bounded to 1920 × 1080 pixels and portrait screens recenter on the tank.

There is no sound, text overlay, external font, downloaded library or network request.

## Packaging

The application includes this folder through its existing template content glob. Import `dist/iron-vanguard.seewall` into an existing installation.

```powershell
python build/package_iron_vanguard.py
```
