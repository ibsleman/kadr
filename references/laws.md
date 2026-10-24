# The laws

These apply to every motion in this skill. They are not style preferences — they are the
difference between work that reads as designed and work that reads as generated.

## 1. One concept, named out loud

Before any code, say the concept in one line: *"ink becomes type becomes architecture"*,
*"the grid builds the product"*, *"one signal, many instruments"*. Then commit. A piece
without a concept becomes a tour of effects, which is the most common failure.

## 2. Every shot is made out of the previous one

Shapes, type and color **transform** into the next scene. They do not cut, and they never
crossfade. If you cannot see how shot 3 is built from shot 2's geometry, the storyboard
is not finished.

## 3. One typeface

Geist, Inter, or one bold display face from Google Fonts. Weight and size carry the
hierarchy, not a second family. Set real optical sizes: display type at 180px+ gets
tighter tracking, small type gets looser.

## 4. At most three colors plus black and white

Pick them before you start. A palette that grows mid-piece is a piece without a concept.

## 5. One camera language

Pick dolly / crane / orbit / push-in / rack focus and use named moves, eased in and out.
Never orbit controls. The camera never passes through geometry.

## 6. Something happens on every beat

Set `BPM` once. The first bar is the hook. Then one technique per bar, each flowing out of
the last. The last full bar is the strongest moment. The final frame matches the first, so
it loops.

## 7. Nothing is held longer than half a second

If a frame sits still for more than 0.5s it reads as a stall. Something must be moving,
settling or arriving.

## 8. Show range

A showreel-class piece needs, in roughly equal share: kinetic type, shape morphing, a
2D-to-3D moment, a data or UI moment, and an end title.

---

## The ban list

Never, in any motion:

- particle bursts
- glows and bloom on everything
- lens flares
- camera shake
- RGB / chromatic split
- crossfades and dissolves
- generic gradients (a two-stop purple-to-blue mesh is the signature of a template)
- bouncy / elastic easing
- holds longer than half a second
- default three.js materials and default lighting
- floating text labels pinned to 3D objects
- a slowly spinning object as the whole idea
- stock "tech" iconography: circuit boards, binary rain, glowing brains, wireframe globes
- anything that looks like an After Effects template

---

## For 3D pieces specifically

- `MeshPhysicalMaterial` with varied roughness, never `MeshBasicMaterial` or an untouched
  `MeshStandardMaterial`.
- A key, a fill and a rim light, with soft shadows. Plus a PMREM environment from
  `RoomEnvironment` for reflections.
- ACES filmic tone mapping, antialiasing on, fog for depth.
- Things react to each other: what is hit moves, what is near lights up. Driven by springs
  or simple physics, never linear tweens.
- **Set `shadow.bias`** or surfaces get striped acne.
- **Keep near and far planes tight** or distant surfaces flicker.
- **Seed every random number** or the render will not match the preview.
- Depth of field only on shots that need it.

---

## Design a signature shot first

Decide the one frame the whole piece exists to deliver — the pull-back, the reveal, the
moment the letters resolve. Build every other shot toward it. Then the storyboard writes
itself.
