export class Renderer {
    constructor(container, device, solver) {
        this.device = device;
        this.solver = solver;
        this.numX = solver.numX;
        this.numY = solver.numY;

        this.ageSoftCap = 16;  // user-tunable; see spec §6 and §11

        this.readbackPending = false;
        this.fieldData = null;
        this.colormapData = null;

        this._canvas = document.createElement('canvas');
        this._canvas.width = this.numX;
        this._canvas.height = this.numY;
        // Preserve aspect ratio so mouse coords in screenToSim map to the right cell
        // regardless of window size. object-fit: contain lets the canvas keep its
        // native numX:numY ratio inside the container.
        this._canvas.style.maxWidth = '100%';
        this._canvas.style.maxHeight = '100%';
        this._canvas.style.width = 'auto';
        this._canvas.style.height = 'auto';
        this._canvas.style.display = 'block';
        this._canvas.style.imageRendering = 'pixelated';
        this._canvas.style.objectFit = 'contain';
        container.appendChild(this._canvas);

        this._ctx = this._canvas.getContext('2d');
        this._imageData = this._ctx.createImageData(this.numX, this.numY);

        this._stagingBuffer = this._createStagingBuffer();

        this._loadColormap();
    }

    get canvas() { return this._canvas; }

    _createStagingBuffer() {
        return this.device.createBuffer({
            size: this.numX * this.numY * 4,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
    }

    async _loadColormap() {
        const resp = await fetch('/colormaps/viridis.png');
        if (!resp.ok) { console.error('Failed to load colormap:', resp.status); return; }
        const blob = await resp.blob();
        const bitmap = await createImageBitmap(blob);
        const offscreen = document.createElement('canvas');
        offscreen.width = 256;
        offscreen.height = 1;
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        this.colormapData = new Uint8Array(ctx.getImageData(0, 0, 256, 1).data.buffer);
    }

    draw() {
        const { device, solver } = this;

        if (!this.readbackPending) {
            this.readbackPending = true;
            const encoder = device.createCommandEncoder();
            encoder.copyBufferToBuffer(
                solver.activeAgeBuffer, 0,
                this._stagingBuffer, 0,
                this.numX * this.numY * 4,
            );
            device.queue.submit([encoder.finish()]);

            this._stagingBuffer.mapAsync(GPUMapMode.READ).then(() => {
                const raw = this._stagingBuffer.getMappedRange();
                this.fieldData = new Int32Array(raw.slice(0));   // NOTE: Int32, not Float32
                this._stagingBuffer.unmap();
                this.readbackPending = false;
            }).catch(() => { this.readbackPending = false; });
        }

        if (this.fieldData && this.colormapData) {
            this._renderField(this.fieldData);
        }
    }

    _renderField(data) {
        const { numX, numY, ageSoftCap } = this;
        const maxDeadAge = this.solver.params.maxDeadAge;
        const cmap = this.colormapData;
        const pixels = this._imageData.data;

        for (let j = 0; j < numY; j++) {
            for (let i = 0; i < numX; i++) {
                const idx = i * numY + j;
                const pixelIdx = ((numY - 1 - j) * numX + i) * 4;
                const age = data[idx];

                let t;
                if (age > 0) {
                    const a = Math.min(age / ageSoftCap, 1);
                    t = 0.25 + 0.75 * a;
                } else if (age === 0) {
                    t = 0;
                } else {
                    const d = Math.min(-age / maxDeadAge, 1);
                    t = 0.20 * (1 - d);
                }

                const lutIdx = Math.floor(Math.max(0, Math.min(1, t)) * 255) * 4;
                pixels[pixelIdx]     = cmap[lutIdx];
                pixels[pixelIdx + 1] = cmap[lutIdx + 1];
                pixels[pixelIdx + 2] = cmap[lutIdx + 2];
                pixels[pixelIdx + 3] = 255;
            }
        }

        this._ctx.putImageData(this._imageData, 0, 0);
    }

    resize(numX, numY) {
        // Guard against destroying a buffer while a map is in flight.
        // If a readback is pending, try to cancel it first.
        if (this.readbackPending) {
            try { this._stagingBuffer.unmap(); } catch { /* map hadn't resolved yet */ }
            this.readbackPending = false;
        }
        this._stagingBuffer.destroy();
        this.numX = numX;
        this.numY = numY;
        this._canvas.width = numX;
        this._canvas.height = numY;
        this._imageData = this._ctx.createImageData(numX, numY);
        this._stagingBuffer = this._createStagingBuffer();
        this.fieldData = null;
    }
}
