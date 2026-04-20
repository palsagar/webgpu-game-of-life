import { Solver } from './solver.js';
import { Renderer } from './renderer.js';
import { Interaction } from './interaction.js';
import { UI } from './ui.js';
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
    const ui = new UI(solver, renderer, interaction);

    // Temporary keyboard wiring (removed when UI is wired in Task 11)
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        if (e.key === 'g') { interaction.mode = 'stamp'; interaction.activeStamp = 'gosperGliderGun';
            console.log('Stamp mode: gosperGliderGun'); }
        if (e.key === 's') { interaction.mode = 'stamp'; interaction.activeStamp = 'glider';
            console.log('Stamp mode: glider'); }
        if (e.key === 'b') { interaction.mode = 'brush';
            console.log('Brush mode'); }
    });

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
