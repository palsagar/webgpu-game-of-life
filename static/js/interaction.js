import { STAMPS, stampBoundingBox } from './stamps.js';

export class Interaction {
    constructor(canvas, solver) {
        this.canvas = canvas;
        this.solver = solver;
        this.brushRadius = 5;
        this.painting = false;
        this.paintMode = 'alive';   // 'alive' | 'erase'
        this.mode = 'brush';         // 'brush' | 'stamp'
        this.activeStamp = null;     // set by UI (stamp dropdown in Task 11)

        canvas.addEventListener('mousedown', (e) => this._onDown(e));
        canvas.addEventListener('mousemove', (e) => this._onMove(e));
        canvas.addEventListener('mouseup',   ()  => this._onUp());
        canvas.addEventListener('mouseleave', () => this._onUp());
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    screenToSim(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = clientX - rect.left;
        const my = clientY - rect.top;
        const { numX, numY } = this.solver;
        const i = Math.floor(mx / rect.width * numX);
        const j = Math.floor((1.0 - my / rect.height) * numY);
        return { i, j };
    }

    _onDown(e) {
        this.painting = true;
        this.paintMode = (e.button === 2 || e.shiftKey) ? 'erase' : 'alive';

        if (this.mode === 'brush') {
            this._paint(e.clientX, e.clientY);
        } else if (this.mode === 'stamp' && this.activeStamp) {
            if (this.paintMode === 'erase') {
                this._eraseStampArea(e.clientX, e.clientY);
            } else {
                this._placeStamp(e.clientX, e.clientY);
            }
        }
    }

    _onMove(e) {
        if (!this.painting) return;
        if (this.mode !== 'brush') return;
        this._paint(e.clientX, e.clientY);
    }

    _onUp() {
        this.painting = false;
    }

    _paint(clientX, clientY) {
        const { i: ci, j: cj } = this.screenToSim(clientX, clientY);
        const r = this.brushRadius;
        const age = (this.paintMode === 'alive') ? 1 : -1;
        for (let di = -r; di <= r; di++) {
            for (let dj = -r; dj <= r; dj++) {
                if (di * di + dj * dj > r * r) continue;
                this.solver.writeCell(ci + di, cj + dj, age);
            }
        }
    }

    _placeStamp(clientX, clientY) {
        const stamp = STAMPS[this.activeStamp];
        if (!stamp) return;
        const bb = stampBoundingBox(this.activeStamp);
        const { i: ci, j: cj } = this.screenToSim(clientX, clientY);
        // Center the bounding box on the cursor.
        // Subtract bb.minI/minJ so stamps with non-zero-origin offsets land correctly.
        const originI = ci - Math.floor(bb.width / 2) - bb.minI;
        const originJ = cj - Math.floor(bb.height / 2) - bb.minJ;
        for (const [di, dj] of stamp.offsets) {
            this.solver.writeCell(originI + di, originJ + dj, 1);
        }
    }

    _eraseStampArea(clientX, clientY) {
        if (!this.activeStamp) return;
        const bb = stampBoundingBox(this.activeStamp);
        const { i: ci, j: cj } = this.screenToSim(clientX, clientY);
        // Mirror the centering logic from _placeStamp so erase aligns with placement.
        const originI = ci - Math.floor(bb.width / 2) - bb.minI;
        const originJ = cj - Math.floor(bb.height / 2) - bb.minJ;
        // Wipe the entire bounding box (not just the live cells of the stamp): users
        // expect a predictable rectangular cursor footprint when right-clicking.
        for (let di = bb.minI; di <= bb.maxI; di++) {
            for (let dj = bb.minJ; dj <= bb.maxJ; dj++) {
                this.solver.writeCell(originI + di, originJ + dj, 0);  // age = 0, virgin dead, no trail
            }
        }
    }
}
