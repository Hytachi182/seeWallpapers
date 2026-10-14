# Floodlight Derby

A night football match that plays itself under stadium floodlights, in **Games**. Two fictional teams, the Comets and the Tides, each line up in a 4-4-2. The match is a real simulation. Players keep their shape and push up or drop back with possession. The nearest players press the ball carrier or chase loose balls to where they can meet them. Ball carriers dribble, pass into open lanes (rated by progress, space and pressure) or shoot when they are in range, and longer passes are lofted. Tackles win or poke the ball away, high balls are headed, and fast shots can be blocked.

The ball has 3D physics: gravity, bounces, and rolling friction on the ground. Keepers track the ball, dive at shots (sometimes too late), and catch or parry. Shots can ring off the post or the crossbar. A goal bulges the net, shows a GOAL! banner with the scorer's number, and sends the scorer running to the corner flag while teammates celebrate with raised arms. The crowd bounces, phone flashes multiply, and flares and smoke rise in the scoring team's end. Throw-ins, corners (with attackers crowding the box) and goal kicks restart play, and conceding teams kick off. Each match lasts 90 minutes on the clock, about 4 min 45 s in real time. It ends at full time with both teams lining up, and a new match with a different seed starts after a short break.

The broadcast camera sits high above the near touchline in perspective and pans smoothly with the ball. It shows the far stands packed in both teams' colours (the away fans in one block, with stair aisles), waving flags, LED boards that cycle their messages, light from the floodlights, and players drawn in their kits with numbers, running strides and four-way floodlight shadows.

Settings control game speed, both team colours (keepers switch to a contrasting kit automatically), attacking style (from defensive to attacking: more shots, wider shooting range and fewer saves), rain, snow (which whitens the pitch), the fan effects (flags, flares and phone flashes), and the scoreboard and banners. With the default style, the seeded matches tested averaged about 2.8 goals per match. Everything is drawn in code with system fonts: no images, web fonts or network requests.

Each match is deterministic. Its state at any moment is replayed from kick-off with a fixed 1/30 s step, so `index.html?preview=88.5` always shows the first match's opening goal. Portrait screens use a higher, wider camera. Host pause/resume, visibility and frame-rate callbacks are supported. A speed of zero freezes the match; the reduced-motion preference shows a still frame. The render buffer is bounded to 1920 × 1080.

`build/check-floodlight-derby.mjs` checks the following:

- motion with weather, fans and scoreboard disabled
- settings, including invalid values
- scoring, full time and the start of the next match
- reduced motion, zero speed and pause
- 4K bounding, portrait layout and offline loading

`build/capture-template-previews.mjs` checks real Edge rendering and that each setting has a visible effect.
