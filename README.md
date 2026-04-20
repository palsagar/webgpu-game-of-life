# WebGPU Game of Life

**Real-time Conway-style Game of Life running entirely on your GPU via WebGPU.**

Paint cells to seed patterns, drop famous stamps (gliders, pulsars, Gosper gun), and change
the rules live across the whole Life-like family (HighLife, Seeds, Day & Night, Maze, and
the rest of the 512² B/S rule space).

## Features

- **GPU-accelerated solver.** Single WGSL compute shader, 8×8 workgroup, Moore neighborhood,
  B/S bitmask rule, ping-pong i32 storage buffers.
- **Live rule editor.** 12 named Life-like rules + 18-checkbox B/S editor — swap rules without
  pausing the simulation.
- **Age-field rendering.** Each cell stores how long it's been alive (or how recently it died),
  mapped through a 5-stop black→green→yellow→red→white gradient. Fresh births glow green;
  long-lived still-lifes saturate to white; dying cells leave a fading comet tail.
- **17 famous patterns.** Still lifes, oscillators, spaceships, the Gosper glider gun,
  methuselahs — drop them at the cursor.
- **8 scene presets.** Random soups, symmetric soup, R-pentomino, acorn, Gosper gun, diehard.
- **Periodic or dead-border boundaries.** Toggle live.
- **512 / 1024 / 2048 resolution tiers.**

## Running Locally

```bash
uv run uvicorn server:app --port 8003
```

Open `http://localhost:8003` in Chrome 113+ (WebGPU required).

## Docs

- [`docs/game-of-life.md`](docs/game-of-life.md) — Rules, B/S notation, famous patterns, universality.
- [`docs/cellular-automata.md`](docs/cellular-automata.md) — Why CAs map onto GPU compute, age
  encoding, ping-pong buffers, uniform layout.
- [`docs/architecture.md`](docs/architecture.md) — Module graph, frame loop, compute pipeline,
  renderer, interaction, UI.

## Keyboard

| Key           | Action                                    |
|---------------|-------------------------------------------|
| `P`           | Play / Pause                              |
| `M`           | Step one frame (while paused)             |
| `R`           | Reset current scene                       |
| `C`           | Clear board                                |
| `B`           | Toggle boundary (periodic ↔ dead)         |
| `[` / `]`     | Decrease / increase brush radius           |

## Template Project

Architectural patterns mirror [`webgpu-gray-scott`](https://github.com/palsagar/webgpu-gray-scott)
(deployed at [patterns.gpuphysics.dev](https://patterns.gpuphysics.dev)) — the Gray-Scott
reaction-diffusion sibling. Same render pipeline, same colormap LUT, same ping-pong discipline.
