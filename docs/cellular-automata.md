# Cellular Automata on the GPU

## Why CAs map cleanly onto GPU compute

A cellular automaton updates every cell based purely on its own current state and a fixed set
of neighbors' current states. There's no global coordination, no cross-cell serial dependencies —
every cell's next state can be computed independently from the same snapshot.

That's the ideal GPU workload: embarrassingly parallel, read-mostly, with a small stencil per
invocation. A 1024×1024 Life grid is ~1 million independent updates per generation, and a modern
GPU dispatches them in milliseconds.

## The double-buffer hazard

The update rule is *synchronous*: every cell reads its neighbors' **old** states and writes its
new state. If we updated in place, some neighbor reads would see half-updated values and the
simulation would go off the rails.

Solution: two buffers (ping-pong). On any given step, the shader reads buffer A and writes
buffer B. Next step, we swap their roles. No read-write hazards.

In this project:

```
ageA, ageB : two i32 storage buffers of the same size
_flip : bool, flipped each substep
bindGroupA: uniform + read(ageA) + write(ageB)
bindGroupB: uniform + read(ageB) + write(ageA)
```

There's no data copy — we just change which bind group the dispatch uses.

## Age encoding

Game of Life is binary (alive/dead), but rendering a binary field through our continuous
5-stop colormap (the same gradient used in the Gray-Scott sibling project) would collapse to
two colours and lose all aesthetic nuance.

Instead we store one **`i32`** per cell, with the following encoding:

| Value     | Meaning                                      |
|-----------|----------------------------------------------|
| `age > 0` | Currently alive; value = generations alive    |
| `age == 0`| Virgin dead (never lived since last clear)    |
| `age < 0` | Currently dead; `-age` = generations since death |

One number carries both state (the sign tells you alive/dead/virgin) and history (the magnitude
gives the colormap something to grade). The renderer maps age → `t ∈ [0, 1]` with a soft cap and
feeds it through the LUT:

```
if age > 0: t = 0.25 + 0.75 * min(age / ageSoftCap, 1)   → green → yellow → red → white
if age == 0: t = 0                                         → black
if age < 0: t = 0.20 * (1 - min(-age / maxDeadAge, 1))     → green → black (trail fade)
```

The shader clamps age to `[-maxDeadAge, maxAge]` so the encoding never overflows.

## Uniform buffer

The compute shader reads its parameters from a 32-byte std140-aligned uniform:

```
 0: numX          (u32)
 4: numY          (u32)
 8: birthMask     (u32)   // 9-bit: bit n set = birth with n alive neighbors
12: survivalMask  (u32)   // 9-bit: bit n set = survive with n alive neighbors
16: boundary      (u32)   // 0 = periodic (wrap), 1 = dead border
20: maxAge        (u32)   // clamp for positive age
24: maxDeadAge    (u32)   // clamp for trail length
28: pad           (u32)
```

Changing the rule live (e.g., switching from Life to HighLife while the simulation is running)
is a single `writeBuffer` on the mask fields — no pipeline rebuild, no pause.

## Workgroup sizing

We dispatch with workgroup size `(8, 8)` and `ceil(numX/8) × ceil(numY/8)` workgroups. This is
the same choice as the Gray-Scott sibling project — 64 invocations per workgroup is a sweet spot
on most desktop GPUs. Cells outside the grid (when `numX` or `numY` isn't a multiple of 8) early-
return in the shader entry.

## GPU → CPU readback

For rendering we read the active age buffer back to JS via an async staging buffer:

```
encoder.copyBufferToBuffer(activeAgeBuffer, 0, stagingBuffer, 0, size);
device.queue.submit(...);
await stagingBuffer.mapAsync(GPUMapMode.READ);
const field = new Int32Array(stagingBuffer.getMappedRange().slice(0));
```

A `readbackPending` flag prevents stacking multiple readback requests — one is in flight at a
time. This introduces ~1 frame of visual latency, which is imperceptible at interactive frame
rates and bounds our memory pressure.
