import { Solver } from './solver.js';
import { Renderer } from './renderer.js';
import { Interaction } from './interaction.js';
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

    const container = document.getElementById('canvas-container');
    const numY = 512;
    const aspectRatio = container.clientWidth / container.clientHeight;
    const numX = Math.max(8, Math.round(numY * aspectRatio / 8) * 8);

    const solver = await Solver.create(device, numX, numY);
    const renderer = new Renderer(container, device, solver);
    const interaction = new Interaction(renderer.canvas, solver);

    // Seed with a single glider near the top-left for visual verification.
    const seed = new Int32Array(numX * numY);
    const gi = Math.floor(numX * 0.1);
    const gj = Math.floor(numY * 0.8);
    for (const [di, dj] of STAMPS.glider.offsets) {
        seed[(gi + di) * numY + (gj + dj)] = 1;
    }
    solver.seedField(seed);

    const substepsPerFrame = 2;

    function frame() {
        if (!solver.paused) solver.step(substepsPerFrame);
        renderer.draw();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

init();
