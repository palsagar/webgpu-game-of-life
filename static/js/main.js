import { Solver } from './solver.js';
import { Renderer } from './renderer.js';
import { Interaction } from './interaction.js';
import { UI } from './ui.js';
import { PRESETS } from './presets.js';

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

    // Seed default scene
    const initial = PRESETS.soup30.seedFn(numX, numY);
    solver.seedField(initial);

    const ui = new UI(solver, renderer, interaction);

    function frame() {
        if (!solver.paused) {
            solver.step(ui.substepsPerFrame);
            ui.tickGenCounter();
        }
        renderer.draw();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

init();
