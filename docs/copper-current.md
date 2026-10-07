# Copper Current

An original macro circuit-board wallpaper, rendered procedurally without external imagery, libraries or network requests. A deep green solder mask, copper routing, plated vias, miniature resistors and capacitors, graphite chip packages and metal pins fill the screen. Component markings are fictional decorative silkscreen, not live system readings or a functional circuit schematic.

Seventy-two routes fan out from the main chip. Light pulses use cumulative segment lengths to follow those exact routes; chip packages and larger components occlude the underlying tracks. Small status LEDs glow softly. All components and the board material remain fixed. The scene is decorative and does not represent measured electrical signals.

Settings control signal color, animation speed, moving signals, status LEDs and component markings. Speed zero, reduced motion and host pause freeze time. Frame-rate changes, visibility suspension and repeated resume calls are supported. The static board is cached separately; only signals and LEDs redraw in each animation frame. Rendering is capped at 1920 x 1080. Portrait crops focus on the main chip.

Import `dist/copper-current.seewall` into an installed application, or build the application to include it through the existing template content glob. `index.html?preview=12` gives a deterministic still. The shared preview tool verifies Edge rendering, settings and pause/resume. Physical desktop attachment and hardware performance require live application validation.
