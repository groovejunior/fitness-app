# Exercise animation style guide

All exercise illustrations are drawn by one renderer (`src/anim/Figure.tsx`) from pose data. You never draw SVG by hand: you write **keyframe poses** (angles) and the renderer produces the line art. That is what keeps every animation in one consistent stroke style.

## Look
- Calm, minimal line figure: 3.2 px round strokes, hollow round head, no hands/face details.
- Side view by default, figure **faces right**. Far-side limbs are drawn faint automatically.
- Front view (`view: 'front'`) only when the move only reads from the front (jumping jack, skater jump, side-to-side moves).
- Equipment is drawn with `props`: the load (barbell plate end-on, dumbbell, kettlebell, band) appears in the accent colour, static kit (bench, box, bar, cable pulley) in a muted grey.
- Slow, smooth motion: 2–3 keyframes, holds 250–500 ms, moves 800–1100 ms (fast moves like jumps or swings 350–600 ms).

## Geometry (see `src/anim/types.ts`, `src/anim/skeleton.ts`)
- Box is 100 × 100, y grows **downward**. Feet on the floor sit at **y = 92**.
- Angles are **absolute**, in degrees: `0` = pointing straight down, `90` = pointing forward (right), `180` = straight up, `-90` = pointing backward (left). Direction vector = `(sin a, cos a)`.
- Fixed lengths: torso (hip→shoulder) 26, neck (shoulder→head centre) 8, head radius 5, upper arm 15, forearm 14, thigh 21, shin 20, foot 7.
- Standing tall: `torso: 180, legNear: [0, 0], armNear: [0, 0]`; ankle 41 below hip → with the ankle anchored at y 92 the hip is at y 51.
- A pose only has angles. Position comes from the clip's **anchor**: the joint that stays fixed (`ankleNear` for standing work, `toeNear` for push-up style, `wristNear` for hanging from a bar, `hip` with an explicit `pose.hip` for jumps, lying or seated moves).
- `armFar` / `legFar` default to the near values. Give them different values for split stances, single-arm moves, or alternating limbs.
- `footNear` / `footFar` default 90 (flat foot pointing forward). Toes on the floor in a plank ≈ 20. In front view use `footFar: -90` so the far foot points outward.
- Useful trig: a point at distance L in direction a from (x, y) is `(x + L·sin a, y + L·cos a)`.

## Props
`barbell | dumbbell | kettlebell` attach to a joint (`at`, optional absolute `offset`).
`bench {x1, x2, y}`, `box {x, y, w}`, `bar {at}` are static. `band {from, to}` and `cable {from, to}` run from a fixed point to a joint.

## References (copy their structure)
`src/anim/poses/reference.ts`: `back-squat` (ankle anchor, barbell), `push-up` (toe anchor, two keyframes), `jumping-jack` (front view, hip anchor, fast).

## Check your work
1. `npm run dev`, open `http://localhost:5173/#/dev/animations`, tick **keyframes** to see stills side by side.
2. Screenshot: `node scripts/shoot.mjs "http://localhost:5173/#/dev/animations" out.png light 900 1400 true`.
3. Look for: limbs bending the wrong way (knees bend forward, elbows bend backward), feet or hands sliding or sinking under the floor, props floating away from hands, a pose that does not look like the exercise at a glance.
4. `npx vitest run src/anim` checks that every exercise has a clip and that no joint leaves the frame or goes under the floor.
