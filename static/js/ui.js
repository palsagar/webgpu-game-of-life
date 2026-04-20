import { NAMED_RULES, pack, matchNamed } from './rules.js';
import { PRESETS, PRESET_ORDER } from './presets.js';
import { STAMPS, STAMP_CATEGORIES } from './stamps.js';

export class UI {
    constructor(solver, renderer, interaction) {
        this.solver = solver;
        this.renderer = renderer;
        this.interaction = interaction;

        this.currentPreset = 'soup30';
        this.substepsPerFrame = 2;
        this.generation = 0;

        this._buildRuleEditor();
        this._syncRuleUiFromSolver();
        this._buildScenes();
        this._buildStamps();
        this._bindPlayback();
        this._bindGrid();
        this._bindDisplay();
        this._bindKeyboard();
        this._bindGuideModal();
    }

    // ---- Rule Editor ----

    _buildRuleEditor() {
        const sel = document.getElementById('rule-named');
        for (const [key, rule] of Object.entries(NAMED_RULES)) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = rule.name;
            sel.appendChild(opt);
        }
        const customOpt = document.createElement('option');
        customOpt.value = '__custom';
        customOpt.textContent = 'Custom';
        sel.appendChild(customOpt);

        sel.addEventListener('change', () => {
            const key = sel.value;
            if (key === '__custom') return;
            const { bMask, sMask } = pack(NAMED_RULES[key]);
            this.solver.setParams({ birthMask: bMask, survivalMask: sMask });
            this._syncCheckboxesFromMasks(bMask, sMask);
        });

        const bHost = document.getElementById('rule-b-checks');
        const sHost = document.getElementById('rule-s-checks');
        for (let n = 0; n <= 8; n++) {
            bHost.appendChild(this._makeCheckbox('b', n));
            sHost.appendChild(this._makeCheckbox('s', n));
        }
    }

    _makeCheckbox(kind, n) {
        const wrap = document.createElement('label');
        wrap.className = 'rule-check';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = `rule-${kind}-${n}`;
        cb.addEventListener('change', () => this._onCheckboxToggle());
        const lbl = document.createElement('span');
        lbl.textContent = String(n);
        wrap.appendChild(cb);
        wrap.appendChild(lbl);
        return wrap;
    }

    _onCheckboxToggle() {
        let bMask = 0, sMask = 0;
        for (let n = 0; n <= 8; n++) {
            if (document.getElementById(`rule-b-${n}`).checked) bMask |= (1 << n);
            if (document.getElementById(`rule-s-${n}`).checked) sMask |= (1 << n);
        }
        this.solver.setParams({ birthMask: bMask >>> 0, survivalMask: sMask >>> 0 });
        const match = matchNamed({ bMask: bMask >>> 0, sMask: sMask >>> 0 });
        document.getElementById('rule-named').value = match || '__custom';
    }

    _syncCheckboxesFromMasks(bMask, sMask) {
        for (let n = 0; n <= 8; n++) {
            document.getElementById(`rule-b-${n}`).checked = !!(bMask & (1 << n));
            document.getElementById(`rule-s-${n}`).checked = !!(sMask & (1 << n));
        }
    }

    _syncRuleUiFromSolver() {
        const { birthMask, survivalMask } = this.solver.params;
        this._syncCheckboxesFromMasks(birthMask, survivalMask);
        const match = matchNamed({ bMask: birthMask, sMask: survivalMask });
        document.getElementById('rule-named').value = match || '__custom';
    }

    // ---- Scene Presets ----

    _buildScenes() {
        const host = document.getElementById('scene-buttons');
        for (const key of PRESET_ORDER) {
            const btn = document.createElement('button');
            btn.textContent = PRESETS[key].name;
            btn.dataset.preset = key;
            if (key === this.currentPreset) btn.classList.add('active');
            btn.addEventListener('click', () => this._applyScene(key));
            host.appendChild(btn);
        }
    }

    _applyScene(key) {
        this.currentPreset = key;
        document.querySelectorAll('#scene-buttons button').forEach(b => b.classList.remove('active'));
        document.querySelector(`#scene-buttons button[data-preset="${key}"]`).classList.add('active');
        const field = PRESETS[key].seedFn(this.solver.numX, this.solver.numY);
        this.solver.seedField(field);
        this.generation = 0;
        this._updateGenCounter();
    }

    // ---- Stamps ----

    _buildStamps() {
        const sel = document.getElementById('stamp-select');
        for (const cat of STAMP_CATEGORIES) {
            const group = document.createElement('optgroup');
            group.label = cat;
            for (const [key, stamp] of Object.entries(STAMPS)) {
                if (stamp.category !== cat) continue;
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = stamp.name;
                group.appendChild(opt);
            }
            sel.appendChild(group);
        }
        sel.value = 'glider';
        this.interaction.activeStamp = 'glider';
        sel.addEventListener('change', () => {
            this.interaction.activeStamp = sel.value;
        });

        const brushBtn = document.getElementById('btn-mode-brush');
        const stampBtn = document.getElementById('btn-mode-stamp');
        const setMode = (mode) => {
            this.interaction.mode = mode;
            brushBtn.classList.toggle('mode-active', mode === 'brush');
            stampBtn.classList.toggle('mode-active', mode === 'stamp');
        };
        brushBtn.addEventListener('click', () => setMode('brush'));
        stampBtn.addEventListener('click', () => setMode('stamp'));
    }

    // ---- Playback ----

    _bindPlayback() {
        const btnPlay  = document.getElementById('btn-play');
        const btnStep  = document.getElementById('btn-step');
        const btnReset = document.getElementById('btn-reset');
        const btnClear = document.getElementById('btn-clear');

        this._togglePause = () => {
            this.solver.paused = !this.solver.paused;
            btnPlay.textContent = this.solver.paused ? '▶ Play' : '⏸ Pause';
        };
        this._stepOnce = () => {
            if (this.solver.paused) {
                this.solver.step(this.substepsPerFrame);
                this.generation += this.substepsPerFrame;
                this._updateGenCounter();
            }
        };
        this._reset = () => {
            this._applyScene(this.currentPreset);
        };
        this._clear = () => {
            const blank = new Int32Array(this.solver.numX * this.solver.numY);
            this.solver.seedField(blank);
            this.generation = 0;
            this._updateGenCounter();
        };

        btnPlay.addEventListener('click', this._togglePause);
        btnStep.addEventListener('click', this._stepOnce);
        btnReset.addEventListener('click', this._reset);
        btnClear.addEventListener('click', this._clear);
    }

    _updateGenCounter() {
        document.getElementById('gen-counter').textContent = String(this.generation);
    }

    tickGenCounter() {
        if (!this.solver.paused) {
            this.generation += this.substepsPerFrame;
            this._updateGenCounter();
        }
    }

    // ---- Grid ----

    _bindGrid() {
        document.querySelectorAll('[data-res]').forEach(btn => {
            btn.addEventListener('click', () => {
                const numY = parseInt(btn.dataset.res, 10);
                const container = document.getElementById('canvas-container');
                const aspectRatio = container.clientWidth / container.clientHeight;
                const numX = Math.max(8, Math.round(numY * aspectRatio / 8) * 8);
                this.solver.resize(numX, numY);
                this.renderer.resize(numX, numY);
                this._applyScene(this.currentPreset);
                document.querySelectorAll('[data-res]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        const boundarySel = document.getElementById('boundary-select');
        boundarySel.value = String(this.solver.params.boundary);
        boundarySel.addEventListener('change', () => {
            this.solver.setParams({ boundary: parseInt(boundarySel.value, 10) });
        });
    }

    // ---- Display ----

    _bindDisplay() {
        const brush = document.getElementById('slider-brush');
        brush.addEventListener('input', () => {
            this.interaction.brushRadius = parseInt(brush.value, 10);
            document.getElementById('val-brush').textContent = brush.value;
        });

        const age = document.getElementById('slider-age');
        age.addEventListener('input', () => {
            this.renderer.ageSoftCap = parseInt(age.value, 10);
            document.getElementById('val-age').textContent = age.value;
        });

        const sub = document.getElementById('slider-substeps');
        sub.addEventListener('input', () => {
            this.substepsPerFrame = parseInt(sub.value, 10);
            document.getElementById('val-substeps').textContent = sub.value;
        });
    }

    _bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            switch (e.key) {
                case 'p': this._togglePause(); break;
                case 'm': this._stepOnce(); break;
                case 'r': this._reset(); break;
                case 'c': this._clear(); break;
                case 'b': {
                    const sel = document.getElementById('boundary-select');
                    sel.value = sel.value === '0' ? '1' : '0';
                    this.solver.setParams({ boundary: parseInt(sel.value, 10) });
                    break;
                }
                case '[': this._nudgeBrush(-1); break;
                case ']': this._nudgeBrush(+1); break;
            }
        });
    }

    _nudgeBrush(delta) {
        const slider = document.getElementById('slider-brush');
        const next = Math.max(1, Math.min(30, parseInt(slider.value, 10) + delta));
        slider.value = next;
        this.interaction.brushRadius = next;
        document.getElementById('val-brush').textContent = String(next);
    }

    _bindGuideModal() {
        const overlay = document.getElementById('guide-overlay');
        const open = () => overlay.classList.add('guide-visible');
        const close = () => overlay.classList.remove('guide-visible');
        document.getElementById('btn-guide').addEventListener('click', open);
        document.getElementById('guide-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.querySelectorAll('.guide-section-header').forEach(h => {
            h.addEventListener('click', () => {
                const s = h.parentElement;
                const wasOpen = s.classList.contains('guide-section-open');
                overlay.querySelectorAll('.guide-section').forEach(x => x.classList.remove('guide-section-open'));
                if (!wasOpen) s.classList.add('guide-section-open');
            });
        });
        this.openGuide = open;
    }
}
