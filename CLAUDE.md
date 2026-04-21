# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running

```bash
uv run uvicorn server:app --port 8003     # dev server (no build step)
docker build -t game-of-life .            # container build
docker run -p 8003:8003 game-of-life      # container run
```

Open `http://localhost:8003` in Chrome 113+ / Edge 113+ (WebGPU required). `server.py` mounts `static/` directly; `NoCacheMiddleware` disables browser caching for `.js/.css/.html/.wgsl` during development so edits are picked up on reload.

Active branch: **`feat/implementation`** — has not yet been merged to `main`.

## Testing

**No automated test framework** — deliberate project decision mirroring the sibling project. Verification is manual/visual via Playwright MCP or an actual browser. Known-correct golden patterns for smoke checks: glider (translates (+1,+1) every 4 generations), blinker (period 2), pulsar (period 3), pentadecathlon (period 15), Gosper gun (emits a glider every 30 generations). When adding a pure-JS module, verify behavior with an ephemeral `scripts/sanity/*.mjs` Node script you delete before committing — **never** add a test framework.

## Architecture

Real-time Game of Life running entirely on the client GPU via a single WGSL compute shader. Supports the whole Life-like rule family (B/S totalistic on a Moore neighborhood) with live rule editing.

```
static/js/main.js          → WebGPU init, welcome modal, RAF loop
├── solver.js              → 2 i32 ping-pong buffers, compute pipeline, step(n)
├── renderer.js            → Async staging readback → age→LUT → putImageData
├── interaction.js         → Mouse brush + stamp placement (column-major via screenToSim)
├── rules.js               → 12 named B/S rules + pack/unpack/matchNamed for 9-bit masks
├── stamps.js              → 17 famous patterns as [di,dj] coord lists + bboxes
├── presets.js             → 8 full-board scene seed generators (returns Int32Array)
└── ui.js                  → DOM bindings for all 6 sidebar panels + keyboard + guide modal
static/shaders/life.wgsl   → Single compute entry (8×8 workgroup), Moore neighborhood,
                             B/S bitmask rule, age update, periodic/dead boundary branch
```

`docs/architecture.md`, `docs/cellular-automata.md`, and `docs/game-of-life.md` are the topical references. The sibling project at `/Users/sagarpal/projects/webgpu-gray-scott/` deployed at `https://patterns.gpuphysics.dev` uses the same architecture — check there first if you need a pattern that isn't obvious.

## Load-bearing conventions

These are invariants that cut across multiple files. Violating any of them breaks the simulation.

**Column-major indexing:** `idx = i * numY + j` (i = column, j = row). Used identically in all JS modules and the WGSL shader. Don't silently switch to `j * numX + i` — it will look correct at square grids and break everywhere else.

**Age encoding:** one `i32` per cell. `age > 0` = alive (generations alive so far), `age == 0` = virgin dead (never lived since last clear), `age < 0` = dying trail (`-age` = generations since death). Renderer maps this to `t ∈ [0, 1]` via a piecewise decay and feeds it through the 5-stop LUT. The shader clamps to `[-maxDeadAge, maxAge]` every step so the encoding never overflows.

**Dual-write on seed:** when CPU writes to the field (brush, stamp, preset, clear), write to **both** `ageA` and `ageB`. The next `solver.step()` may read from either depending on `_flip` state. `Solver.seedField` and `Solver.writeCell` already do this — use them rather than writing `queue.writeBuffer` directly.

**Explicit bind-group layouts:** `solver.js` defines a single `BindGroupLayout` with three entries (uniform, read-only storage, storage) and two bind groups (A: read ageA/write ageB; B: the swap). Don't use `layout: 'auto'` — the sibling project's discipline is explicit-everything for predictability.

**Uniform buffer layout (32 bytes, std140):**
```
 0: numX         (u32)   16: boundary    (u32)    // 0 = periodic, 1 = dead
 4: numY         (u32)   20: maxAge      (u32)    // clamp for alive age
 8: birthMask    (u32)   24: maxDeadAge  (u32)    // clamp for trail length
12: survivalMask (u32)   28: pad         (u32)
```
Mask bits: bit `n` set in `birthMask` ⇔ "dead cell with `n` alive neighbors is born." Rules are packed via `rules.js::pack({B, S})`; `>>> 0` unsigned coercion on the result is deliberate for shader `u32` interop — keep it.

**Canvas Y-flip:** simulation `j=0` is the bottom row; the canvas `y=0` is the top. `renderer.js` writes `pixelIdx = ((numY - 1 - j) * numX + i) * 4`. `interaction.js::screenToSim` inverts Y symmetrically with `(1.0 - my/rect.height)`. Change one without the other and clicks miss by a mirror.

**Readback is asynchronous and guarded.** `renderer.draw()` uses a `readbackPending` flag so only one `mapAsync(READ)` is in flight at a time. This introduces one frame of latency — expected. When resizing, `renderer.resize()` unmaps any in-flight buffer before `.destroy()` to avoid WebGPU's implementation-defined behavior for destroying mapped buffers. **Don't destroy GPU buffers while their `mapAsync` is unresolved.**

## Never commit

Anything under `docs/superpowers/`. That directory is gitignored and holds spec/plan working documents; the `.gitignore` also excludes `.playwright-mcp/`, `__pycache__/`, `uv.lock`, and stray `/*.png` at repo root. Always stage specific files (`git add path/to/file`), never `git add .` or `-A`.

## Gotchas discovered in implementation

- **Stamp bbox centering.** `stampBoundingBox` returns `minI`/`minJ`, not just `width`/`height`. Stamps whose offsets don't start at `(0, 0)` (notably the Gosper gun, which has `minJ = 2`) need their origin computed as `cursor - floor(width/2) - minI`. Dropping the `-minI` looks correct until someone stamps the gun and it lands 2 cells off.

- **`adapter.info` can be undefined.** Firefox Nightly leaves it unset. `main.js` uses `adapter.info ?? {}` before reading sub-fields — don't remove the nullish-coalesce.

- **`init().catch(...)` top-level.** Any throw from `requestAdapter/requestDevice`, shader fetch, or colormap load is surfaced as the `#no-webgpu` banner. Don't strip the catch.

- **Shader / colormap fetches check `resp.ok`.** A 404 on `/shaders/life.wgsl` would otherwise feed the HTML error page to `createShaderModule` with a cryptic WGSL parse failure. Same story for `viridis.png`.

## Entry points for common changes

| Change | Where |
|--------|-------|
| New named Life-like rule | `rules.js::NAMED_RULES` |
| New famous-pattern stamp | `stamps.js::STAMPS` (and add to `STAMP_CATEGORIES` if new category) |
| New full-board scene | `presets.js::PRESETS` + `PRESET_ORDER` |
| Sim parameter (uniform) | Add field to `Params` in `life.wgsl` **and** mirror in `solver.js::writeUniforms` byte-for-byte; bump the buffer size if struct grows |
| Age→color mapping | `renderer.js::_renderField` piecewise |
| New keyboard shortcut | `ui.js::_bindKeyboard` |
| New sidebar panel | `index.html` (section), `style.css` (styles), `ui.js` (`_build*` + `_bind*` methods, called from constructor) |
