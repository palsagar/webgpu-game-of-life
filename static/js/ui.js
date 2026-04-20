import { NAMED_RULES, pack, matchNamed } from './rules.js';

export class UI {
    constructor(solver, renderer, interaction) {
        this.solver = solver;
        this.renderer = renderer;
        this.interaction = interaction;

        this._buildRuleEditor();
        this._syncRuleUiFromSolver();
    }

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
            if (key === '__custom') return;  // User must toggle a checkbox to leave Custom
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
        cb.dataset.kind = kind;
        cb.dataset.n = String(n);
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
}
