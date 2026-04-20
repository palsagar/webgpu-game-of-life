# Architecture

## Module graph

```
main.js
├── solver.js      → WebGPU pipeline, 2 i32 ping-pong buffers, 1 uniform, step(substeps)
├── renderer.js    → Async staging readback, age→LUT mapping, putImageData
├── interaction.js → Mouse → grid conversion, brush & stamp placement
├── stamps.js      → 17 famous-pattern coord lists + bounding-box helper
├── rules.js       → 12 named Life-like rules + pack/unpack for 9-bit masks
├── presets.js     → 8 full-board scene seed generators
└── ui.js          → DOM bindings: rule editor, scenes, playback, stamps, grid, display,
                     keyboard, guide modal
shaders/life.wgsl  → 8×8 compute shader: Moore-neighborhood B/S bitmask rule with age update
```

## Frame loop (`main.js`)

```
requestAnimationFrame(frame):
    if not paused:
        solver.step(ui.substepsPerFrame)   // N compute dispatches, one per generation
        ui.tickGenCounter()                 // updates DOM text
    renderer.draw()                          // stages + maps + putImageData (guarded by pending flag)
    update perf HUD every ~10 frames
```

## Compute pipeline (`solver.js`)

- 2 storage buffers `ageA`, `ageB` (`i32`, `numX × numY × 4` bytes each). Usage:
  `STORAGE | COPY_SRC | COPY_DST`.
- 1 uniform buffer (32 bytes).
- Explicit bind-group layout (not `layout: 'auto'`) with entries for the uniform + one read-only
  storage + one read-write storage.
- Two bind groups: A reads `ageA`/writes `ageB`, B reads `ageB`/writes `ageA`.
- `step(substeps)` begins one command encoder, loops over substeps: each sets the alternating
  bind group and dispatches `ceil(numX/8) × ceil(numY/8)` workgroups.
- `_flip` bool tracks parity. `activeAgeBuffer` returns whichever buffer has the latest result.
- `seedField(int32)` writes the whole grid to BOTH `ageA` and `ageB` (so the next dispatch, which
  may read either, sees the seed). `writeCell(i, j, age)` does the same for a single cell.

## Renderer (`renderer.js`)

- Owns a `<canvas>` sized to `numX × numY` with `image-rendering: pixelated`, scaled up via CSS.
- Creates a staging buffer (`MAP_READ | COPY_DST`).
- On each `draw()`:
  - If not already pending, issues `copyBufferToBuffer(activeAgeBuffer, ..., staging)`, submits,
    then `stagingBuffer.mapAsync(READ)`. On resolution, copies into a retained `Int32Array` and
    clears the pending flag.
  - If the field data exists, runs the per-pixel age→LUT mapping and `putImageData`s it.
- The canvas Y-flip (`pixelIdx = ((numY - 1 - j) * numX + i) * 4`) mirrors Gray-Scott — simulation
  Y increases upward, canvas Y increases downward.

## Interaction (`interaction.js`)

Two modes, toggled via the Stamps panel:

- **Brush.** On `mousedown` + drag, writes cells in a circular radius. Left-button/no-shift →
  `age = 1`. Right-button or shift → `age = -1` (just-died; leaves a fade trail).
- **Stamp.** On single `mousedown`, reads the active stamp's offsets, centers its bounding box
  on the cursor, and writes `age = 1` to each offset. Right-click clears the bounding box to
  `age = 0`.

Both modes write to both ping-pong buffers via `solver.writeCell`.

## UI (`ui.js`)

Builds the sidebar: Rule Editor (dropdown + 18 checkboxes, matches named rules via `matchNamed`),
Scene Presets (8 buttons), Simulation (Play/Pause/Step/Reset/Clear + gen counter), Stamps (mode
toggle + grouped select), Grid (resolution tiers + boundary select), Display (brush radius, age
soft cap, gens/frame sliders). Also handles keyboard and the accordion guide modal.

## Numerical guarantees

- Ages are clamped every step: `maxAge = 255` (alive), `maxDeadAge = 64` (trail). No arithmetic
  can escape `[-maxDeadAge, maxAge]`.
- Rule changes are atomic: a single uniform write between dispatches. In practice users change
  rules much less frequently than generations, so there's no race.
- The only GPU→CPU path is the readback; its overhead is ~`numX × numY × 4` bytes per frame.
  At 2048² that's 16 MB/frame — monitor if porting to lower-bandwidth hardware.
