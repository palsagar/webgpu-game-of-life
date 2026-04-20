// Stamps: famous patterns as lists of (di, dj) cell offsets.
// Column-major (di = column, dj = row). Origin is the stamp's bottom-left.

export const STAMPS = {
    // --- Still lifes ---
    block: {
        name: 'Block',
        category: 'Still lifes',
        offsets: [[0,0],[1,0],[0,1],[1,1]],
    },
    beehive: {
        name: 'Beehive',
        category: 'Still lifes',
        offsets: [[1,0],[2,0],[0,1],[3,1],[1,2],[2,2]],
    },
    loaf: {
        name: 'Loaf',
        category: 'Still lifes',
        offsets: [[1,0],[2,1],[3,2],[2,3],[1,3],[0,2],[1,1]],
    },
    boat: {
        name: 'Boat',
        category: 'Still lifes',
        offsets: [[0,0],[1,0],[0,1],[2,1],[1,2]],
    },

    // --- Oscillators ---
    blinker: {
        name: 'Blinker',
        category: 'Oscillators',
        offsets: [[0,0],[1,0],[2,0]],
    },
    toad: {
        name: 'Toad',
        category: 'Oscillators',
        offsets: [[1,0],[2,0],[3,0],[0,1],[1,1],[2,1]],
    },
    beacon: {
        name: 'Beacon',
        category: 'Oscillators',
        offsets: [[0,2],[1,2],[0,3],[1,3],[2,0],[3,0],[2,1],[3,1]],
    },
    pulsar: {
        name: 'Pulsar',
        category: 'Oscillators',
        offsets: (() => {
            // Standard 13×13 pulsar. Enumerate cells by symmetry.
            const base = [
                [2,0],[3,0],[4,0],[8,0],[9,0],[10,0],
                [0,2],[5,2],[7,2],[12,2],
                [0,3],[5,3],[7,3],[12,3],
                [0,4],[5,4],[7,4],[12,4],
                [2,5],[3,5],[4,5],[8,5],[9,5],[10,5],
                [2,7],[3,7],[4,7],[8,7],[9,7],[10,7],
                [0,8],[5,8],[7,8],[12,8],
                [0,9],[5,9],[7,9],[12,9],
                [0,10],[5,10],[7,10],[12,10],
                [2,12],[3,12],[4,12],[8,12],[9,12],[10,12],
            ];
            return base;
        })(),
    },
    pentadecathlon: {
        name: 'Pentadecathlon',
        category: 'Oscillators',
        // 10×3 with notches on cells 2 and 7 of the middle row.
        offsets: [
            [0,1],[1,1],[2,0],[2,2],[3,1],[4,1],[5,1],[6,1],[7,0],[7,2],[8,1],[9,1],
        ],
    },

    // --- Spaceships ---
    glider: {
        name: 'Glider',
        category: 'Spaceships',
        offsets: [[0,2],[1,2],[2,2],[2,1],[1,0]],
    },
    lwss: {
        name: 'Lightweight Spaceship',
        category: 'Spaceships',
        offsets: [[1,0],[2,0],[3,0],[4,0],[0,1],[4,1],[4,2],[0,3],[3,3]],
    },
    mwss: {
        name: 'Middleweight Spaceship',
        category: 'Spaceships',
        offsets: [[1,0],[2,0],[3,0],[4,0],[5,0],[0,1],[5,1],[5,2],[0,3],[4,3],[2,4]],
    },
    hwss: {
        name: 'Heavyweight Spaceship',
        category: 'Spaceships',
        offsets: [[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[0,1],[6,1],[6,2],[0,3],[5,3],[2,4],[3,4]],
    },

    // --- Guns ---
    gosperGliderGun: {
        name: 'Gosper Glider Gun',
        category: 'Guns',
        offsets: [
            // Left block
            [0,4],[0,5],[1,4],[1,5],
            // Left reflector
            [10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],
            [14,5],[15,3],[15,7],[16,4],[16,5],[16,6],[17,5],
            // Right reflector
            [20,6],[20,7],[20,8],[21,6],[21,7],[21,8],[22,5],[22,9],
            [24,4],[24,5],[24,9],[24,10],
            // Right block
            [34,7],[34,8],[35,7],[35,8],
        ],
    },

    // --- Methuselahs ---
    rPentomino: {
        name: 'R-pentomino',
        category: 'Methuselahs',
        offsets: [[1,0],[2,0],[0,1],[1,1],[1,2]],
    },
    acorn: {
        name: 'Acorn',
        category: 'Methuselahs',
        offsets: [[1,0],[0,2],[1,2],[4,2],[5,2],[6,2],[3,1]],
    },
    diehard: {
        name: 'Diehard',
        category: 'Methuselahs',
        offsets: [[0,1],[1,1],[1,2],[5,2],[6,0],[6,2],[7,2]],
    },
};

// Ordered categories for dropdown rendering.
export const STAMP_CATEGORIES = [
    'Still lifes',
    'Oscillators',
    'Spaceships',
    'Guns',
    'Methuselahs',
];

export function stampBoundingBox(name) {
    const { offsets } = STAMPS[name];
    let minI = Infinity, maxI = -Infinity, minJ = Infinity, maxJ = -Infinity;
    for (const [di, dj] of offsets) {
        if (di < minI) minI = di;
        if (di > maxI) maxI = di;
        if (dj < minJ) minJ = dj;
        if (dj > maxJ) maxJ = dj;
    }
    return { minI, maxI, minJ, maxJ, width: maxI - minI + 1, height: maxJ - minJ + 1 };
}
