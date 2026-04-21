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

    const info = adapter.info ?? {};
    const name = info.device || info.description
        || [info.vendor, info.architecture].filter(Boolean).join(' ') || 'Unknown GPU';
    document.getElementById('gpu-adapter-name').textContent = name;
    device.lost.then((e) => {
        console.error('GPU device lost:', e.message);
        document.getElementById('device-lost-banner').style.display = 'block';
    });

    const overlay = document.getElementById('welcome-overlay');
    const dismissWelcome = () => {
        overlay.classList.add('welcome-hidden');
        overlay.addEventListener('transitionend', () => { overlay.style.display = 'none'; }, { once: true });
    };
    document.getElementById('start-sim-btn').addEventListener('click', dismissWelcome);

    const container = document.getElementById('canvas-container');
    const numY = 512;
    const aspectRatio = container.clientWidth / container.clientHeight;
    const numX = Math.max(8, Math.round(numY * aspectRatio / 8) * 8);

    const solver = await Solver.create(device, numX, numY);
    const renderer = new Renderer(container, device, solver);
    const interaction = new Interaction(renderer.canvas, solver);

    const initial = PRESETS.soup30.seedFn(numX, numY);
    solver.seedField(initial);

    const ui = new UI(solver, renderer, interaction);

    document.getElementById('open-guide-from-welcome')?.addEventListener('click', (e) => {
        e.preventDefault();
        dismissWelcome();
        setTimeout(() => ui.openGuide?.(), 350);
    });

    let frameTimeSmoothed = 0;
    let hudCounter = 0;
    const perfHud = document.getElementById('perf-hud');

    function frame() {
        const t0 = performance.now();

        if (!solver.paused) {
            solver.step(ui.substepsPerFrame);
            ui.tickGenCounter();
        }
        renderer.draw();

        const frameTime = performance.now() - t0;
        frameTimeSmoothed = frameTimeSmoothed * 0.9 + frameTime * 0.1;
        hudCounter++;
        if (hudCounter % 10 === 0 && perfHud) {
            perfHud.textContent =
                frameTimeSmoothed.toFixed(1) + ' ms/frame | ' +
                Math.round(1000 / frameTimeSmoothed) + ' fps\n' +
                'grid: ' + solver.numX + '×' + solver.numY +
                ' | gens/frame: ' + ui.substepsPerFrame;
        }

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

init().catch((err) => {
    console.error('Initialization failed:', err);
    document.getElementById('no-webgpu').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
});
