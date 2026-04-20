import { STAMPS } from './stamps.js';

// Each preset produces an Int32Array of length numX*numY, column-major.
// Alive cells start at age = 1, dead at 0 (virgin).

function blankField(numX, numY) {
    return new Int32Array(numX * numY);  // zeros
}

function setAlive(field, numX, numY, i, j) {
    if (i < 0 || i >= numX || j < 0 || j >= numY) return;
    field[i * numY + j] = 1;
}

function randomSoup(density, numX, numY) {
    const f = blankField(numX, numY);
    for (let idx = 0; idx < f.length; idx++) {
        if (Math.random() < density) f[idx] = 1;
    }
    return f;
}

function symmetricSoup(numX, numY) {
    // 4-fold symmetric: fill the top-left quadrant randomly, mirror to the other three.
    const f = blankField(numX, numY);
    const hx = Math.floor(numX / 2);
    const hy = Math.floor(numY / 2);
    for (let i = 0; i < hx; i++) {
        for (let j = 0; j < hy; j++) {
            if (Math.random() < 0.35) {
                setAlive(f, numX, numY, i, j);
                setAlive(f, numX, numY, numX - 1 - i, j);
                setAlive(f, numX, numY, i, numY - 1 - j);
                setAlive(f, numX, numY, numX - 1 - i, numY - 1 - j);
            }
        }
    }
    return f;
}

function stampCentered(stampName, numX, numY) {
    const f = blankField(numX, numY);
    const s = STAMPS[stampName];
    const ci = Math.floor(numX / 2) - 2;
    const cj = Math.floor(numY / 2) - 2;
    for (const [di, dj] of s.offsets) setAlive(f, numX, numY, ci + di, cj + dj);
    return f;
}

function stampAt(stampName, ci, cj, numX, numY) {
    const f = blankField(numX, numY);
    const s = STAMPS[stampName];
    for (const [di, dj] of s.offsets) setAlive(f, numX, numY, ci + di, cj + dj);
    return f;
}

export const PRESETS = {
    soup30:        { name: 'Random soup (30%)', seedFn: (nX, nY) => randomSoup(0.30, nX, nY) },
    soup50:        { name: 'Random soup (50%)', seedFn: (nX, nY) => randomSoup(0.50, nX, nY) },
    symmetric:     { name: 'Symmetric soup',    seedFn: (nX, nY) => symmetricSoup(nX, nY) },
    rPentomino:    { name: 'R-pentomino',       seedFn: (nX, nY) => stampCentered('rPentomino', nX, nY) },
    acorn:         { name: 'Acorn',             seedFn: (nX, nY) => stampCentered('acorn', nX, nY) },
    gosperGun:     { name: 'Gosper glider gun', seedFn: (nX, nY) => stampAt('gosperGliderGun',
                                                                             Math.max(2, Math.floor(nX * 0.1)),
                                                                             Math.floor(nY * 0.7),
                                                                             nX, nY) },
    diehard:       { name: 'Diehard',           seedFn: (nX, nY) => stampCentered('diehard', nX, nY) },
    empty:         { name: 'Empty',             seedFn: (nX, nY) => blankField(nX, nY) },
};

export const PRESET_ORDER = [
    'soup30', 'soup50', 'symmetric',
    'rPentomino', 'acorn', 'gosperGun', 'diehard', 'empty',
];

export function countAlive(field) {
    let c = 0;
    for (let i = 0; i < field.length; i++) if (field[i] > 0) c++;
    return c;
}
