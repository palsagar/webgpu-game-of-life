import { NAMED_RULES, pack } from './rules.js';

export class Solver {
    constructor(device, numX, numY) {
        this.device = device;
        this.numX = numX;
        this.numY = numY;
        this.paused = false;
        this._flip = false;

        const { bMask, sMask } = pack(NAMED_RULES.life);
        this.params = {
            birthMask:    bMask,
            survivalMask: sMask,
            boundary:     0,       // periodic
            maxAge:       255,
            maxDeadAge:   64,
        };

        this._createBuffers();
    }

    _createBuffers() {
        const { device, numX, numY } = this;
        const size = numX * numY * 4;
        const storageUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;

        this.ageA = device.createBuffer({ size, usage: storageUsage });
        this.ageB = device.createBuffer({ size, usage: storageUsage });

        this.uniformBuf = device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    writeUniforms() {
        const { numX, numY } = this;
        const p = this.params;
        const ab = new ArrayBuffer(32);
        const dv = new DataView(ab);
        dv.setUint32(0,  numX,           true);
        dv.setUint32(4,  numY,           true);
        dv.setUint32(8,  p.birthMask,    true);
        dv.setUint32(12, p.survivalMask, true);
        dv.setUint32(16, p.boundary,     true);
        dv.setUint32(20, p.maxAge,       true);
        dv.setUint32(24, p.maxDeadAge,   true);
        dv.setUint32(28, 0,              true);
        this.device.queue.writeBuffer(this.uniformBuf, 0, ab);
    }

    destroy() {
        this.ageA.destroy();
        this.ageB.destroy();
        this.uniformBuf.destroy();
    }

    static async create(device, numX, numY) {
        const solver = new Solver(device, numX, numY);

        const wgsl = await fetch('/shaders/life.wgsl').then(r => r.text());
        const module = device.createShaderModule({ code: wgsl });

        const bglEntry = (binding, type) => ({
            binding,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type },
        });

        solver._bgl = device.createBindGroupLayout({
            entries: [
                bglEntry(0, 'uniform'),
                bglEntry(1, 'read-only-storage'),
                bglEntry(2, 'storage'),
            ],
        });

        solver._pipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [solver._bgl] }),
            compute: { module, entryPoint: 'main' },
        });

        solver._createBindGroups();
        solver.writeUniforms();

        return solver;
    }

    _createBindGroups() {
        const { device, _bgl: layout } = this;
        const entry = (binding, buffer) => ({ binding, resource: { buffer } });

        // A: read ageA, write ageB
        this._bindGroupA = device.createBindGroup({
            layout,
            entries: [
                entry(0, this.uniformBuf),
                entry(1, this.ageA),
                entry(2, this.ageB),
            ],
        });

        // B: read ageB, write ageA
        this._bindGroupB = device.createBindGroup({
            layout,
            entries: [
                entry(0, this.uniformBuf),
                entry(1, this.ageB),
                entry(2, this.ageA),
            ],
        });

        this._flip = false;
    }

    step(substeps) {
        this.writeUniforms();
        const { device, numX, numY } = this;
        const dx = Math.ceil(numX / 8);
        const dy = Math.ceil(numY / 8);
        const encoder = device.createCommandEncoder();
        for (let s = 0; s < substeps; s++) {
            const pass = encoder.beginComputePass();
            pass.setPipeline(this._pipeline);
            pass.setBindGroup(0, this._flip ? this._bindGroupB : this._bindGroupA);
            pass.dispatchWorkgroups(dx, dy, 1);
            pass.end();
            this._flip = !this._flip;
        }
        device.queue.submit([encoder.finish()]);
    }

    // The buffer that holds the most recent results.
    get activeAgeBuffer() {
        // After an even number of flips, ageA is fresh; after odd, ageB is.
        return this._flip ? this.ageB : this.ageA;
    }

    resetFlipState() {
        this._flip = false;
    }

    setParams(overrides) {
        Object.assign(this.params, overrides);
        this.writeUniforms();
    }

    // Seed the whole field (writes to BOTH ping-pong buffers).
    seedField(int32Field) {
        this.resetFlipState();
        this.device.queue.writeBuffer(this.ageA, 0, int32Field);
        this.device.queue.writeBuffer(this.ageB, 0, int32Field);
    }

    // Write a single cell to both buffers (used by brush/stamp).
    writeCell(i, j, age) {
        if (i < 0 || i >= this.numX || j < 0 || j >= this.numY) return;
        const idx = i * this.numY + j;
        const val = new Int32Array([age]);
        this.device.queue.writeBuffer(this.ageA, idx * 4, val);
        this.device.queue.writeBuffer(this.ageB, idx * 4, val);
    }

    resize(numX, numY) {
        this.destroy();
        this.numX = numX;
        this.numY = numY;
        this._createBuffers();
        this._createBindGroups();
        this.writeUniforms();
    }
}
