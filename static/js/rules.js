// Life-like rules: totalistic on a Moore (8-cell) neighborhood.
// A rule is a pair of 9-bit masks. Bit n of birthMask is set iff a dead cell
// with exactly n alive neighbors becomes alive. survivalMask is analogous.

export const NAMED_RULES = {
    life:              { name: 'Life',                B: [3],       S: [2, 3]           },
    highLife:          { name: 'HighLife',            B: [3, 6],    S: [2, 3]           },
    seeds:             { name: 'Seeds',               B: [2],       S: []               },
    dayAndNight:       { name: 'Day & Night',         B: [3,6,7,8], S: [3,4,6,7,8]      },
    lifeWithoutDeath:  { name: 'Life Without Death',  B: [3],       S: [0,1,2,3,4,5,6,7,8] },
    replicator:        { name: 'Replicator',          B: [1,3,5,7], S: [1,3,5,7]        },
    life34:            { name: '34 Life',              B: [3, 4],    S: [3, 4]           },
    diamoeba:          { name: 'Diamoeba',            B: [3,5,7,8], S: [5,6,7,8]        },
    maze:              { name: 'Maze',                B: [3],       S: [1,2,3,4,5]      },
    mazectric:         { name: 'Mazectric',           B: [3],       S: [1,2,3,4]        },
    coagulations:      { name: 'Coagulations',        B: [3,7,8],   S: [2,3,5,6,7,8]    },
    assimilation:      { name: 'Assimilation',        B: [3,4,5],   S: [4,5,6,7]        },
};

export function pack({ B, S }) {
    let bMask = 0;
    let sMask = 0;
    for (const n of B) bMask |= (1 << n);
    for (const n of S) sMask |= (1 << n);
    return { bMask: bMask >>> 0, sMask: sMask >>> 0 };
}

export function unpack({ bMask, sMask }) {
    const B = [];
    const S = [];
    for (let n = 0; n <= 8; n++) {
        if (bMask & (1 << n)) B.push(n);
        if (sMask & (1 << n)) S.push(n);
    }
    return { B, S };
}

// Convenience: find which named rule (if any) matches a mask pair.
// Returns the key (e.g. 'life') or null if custom.
export function matchNamed({ bMask, sMask }) {
    for (const [key, rule] of Object.entries(NAMED_RULES)) {
        const packed = pack(rule);
        if (packed.bMask === bMask && packed.sMask === sMask) return key;
    }
    return null;
}
