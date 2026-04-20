export class Interaction {
    constructor(canvas, solver) {
        this.canvas = canvas;
        this.solver = solver;
        this.brushRadius = 5;
        this.painting = false;
        this.paintMode = 'alive';   // 'alive' | 'erase'
        this.mode = 'brush';         // 'brush' | 'stamp' (stamp wired in Task 9)
        this.activeStamp = null;     // set by UI in Task 9

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
        // Right-click OR shift+left-click = erase.
        this.paintMode = (e.button === 2 || e.shiftKey) ? 'erase' : 'alive';
        if (this.mode === 'brush') {
            this._paint(e.clientX, e.clientY);
        }
        // Stamp mode placement is single-click, handled in Task 9.
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
}
