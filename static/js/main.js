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
        || [info.vendor, info.architecture].filter(Boolean).join(' ')
        || 'Unknown GPU';
    document.getElementById('gpu-adapter-name').textContent = name;

    device.lost.then((e) => console.error('GPU device lost:', e.message));

    window.__gpu = { adapter, device };  // temporary handle for the smoke check
}

init();
