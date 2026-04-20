# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Running Locally

```bash
uv run uvicorn server:app --port 8003
```

Open `http://localhost:8003` in Chrome/Edge (requires WebGPU). No build step — vanilla ES modules served directly. `NoCacheMiddleware` in `server.py` disables browser caching for `.js/.css/.html/.wgsl` files during development.

## Architecture

Real-time Conway-style Game of Life running on the client GPU via a single WebGPU compute shader. Supports the full Life-like rule family (B/S totalistic on a Moore neighborhood) with live rule editing.

See `docs/architecture.md` for the module graph and `docs/superpowers/specs/2026-04-21-webgpu-game-of-life-design.md` for the approved design.

## Key Conventions

**Column-major indexing:** `idx = i * numY + j` (i=column, j=row) across all JS and WGSL.

**Age encoding:** one `i32` per cell. `age > 0` = alive (generations alive), `age == 0` = virgin dead, `age < 0` = dying trail (`-age` = generations since death). See `docs/cellular-automata.md`.

**Explicit bind group layouts** (not `layout: 'auto'`), ping-pong bind groups A/B.

**Write to BOTH buffer pairs from CPU** when seeding — the solver may read from either depending on `_flip` state.

**Canvas Y-flip:** `pixelIdx = ((numY - 1 - j) * numX + i) * 4`.

## Uniform buffer (32 bytes)

```
 0: numX (u32)   16: boundary    (u32)   // 0=periodic, 1=dead
 4: numY (u32)   20: maxAge      (u32)
 8: birthMask (u32)   24: maxDeadAge  (u32)
12: survivalMask (u32)   28: pad      (u32)
```

## Never commit

Anything under `docs/superpowers/`. The directory is gitignored and contains spec/plan working documents.

## Template Project

Architectural patterns mirror `/Users/sagarpal/projects/webgpu-gray-scott/` (deployed at https://patterns.gpuphysics.dev). When adding features, check if gray-scott already has the pattern and copy it rather than inventing new approaches.
