import { Solver } from './solver.js';
import { STAMPS } from './stamps.js';

async function init() {
    if (!navigator.gpu) {
        document.getElementById('no-webgpu').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        return;
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        document.getElementById('no-webgpu').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        return;
    }
    const device = await adapter.requestDevice();

    const info = adapter.info;
    const name = info.device || info.description
        || [info.vendor, info.architecture].filter(Boolean).join(' ') || 'Unknown GPU';
    document.getElementById('gpu-adapter-name').textContent = name;
    device.lost.then((e) => console.error('GPU device lost:', e.message));

    // Smoke test: seed a glider at (5, 5), run 4 generations, read back, confirm +1/+1 shift.
    const numX = 32, numY = 32;
    const solver = await Solver.create(device, numX, numY);

    const seed = new Int32Array(numX * numY);
    for (const [di, dj] of STAMPS.glider.offsets) {
        const i = 5 + di, j = 5 + dj;
        seed[i * numY + j] = 1;
    }
    solver.seedField(seed);

    solver.step(4);   // 4 generations → glider should have translated (+1, +1)

    // Read back
    const staging = device.createBuffer({
        size: numX * numY * 4,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    const encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(solver.activeAgeBuffer, 0, staging, 0, numX * numY * 4);
    device.queue.submit([encoder.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const field = new Int32Array(staging.getMappedRange().slice(0));
    staging.unmap();

    // Locate alive cells
    const alive = [];
    for (let i = 0; i < numX; i++) {
        for (let j = 0; j < numY; j++) {
            if (field[i * numY + j] > 0) alive.push([i, j]);
        }
    }
    // Sort for stable comparison
    alive.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    // Expected: the glider's original offsets, shifted by (+1, +1).
    const expected = STAMPS.glider.offsets
        .map(([di, dj]) => [6 + di, 6 + dj])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    const match = alive.length === expected.length
        && alive.every(([i, j], k) => i === expected[k][0] && j === expected[k][1]);

    console.log('Alive after 4 gens:', alive);
    console.log('Expected:', expected);
    console.log(match ? 'SMOKE TEST PASS: glider translated +1,+1 in 4 generations' : 'SMOKE TEST FAIL');

    solver.destroy();
    staging.destroy();
}

init();
