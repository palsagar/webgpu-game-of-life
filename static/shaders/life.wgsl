struct Params {
    numX         : u32,
    numY         : u32,
    birthMask    : u32,
    survivalMask : u32,
    boundary     : u32,   // 0 = periodic, 1 = dead
    maxAge       : u32,
    maxDeadAge   : u32,
    pad          : u32,
}

@group(0) @binding(0) var<uniform> p : Params;
@group(0) @binding(1) var<storage, read>       ageIn  : array<i32>;
@group(0) @binding(2) var<storage, read_write> ageOut : array<i32>;

// Sample a neighbor at column-major offset (ni, nj). Returns 1 if alive, 0 otherwise.
// Honors the boundary mode.
fn neighborAlive(i : i32, j : i32) -> i32 {
    let nx = i32(p.numX);
    let ny = i32(p.numY);
    var ii = i;
    var jj = j;
    if (p.boundary == 0u) {
        // Periodic: wrap with modular arithmetic (handles negatives).
        ii = ((i % nx) + nx) % nx;
        jj = ((j % ny) + ny) % ny;
    } else {
        // Dead: out-of-bounds neighbors contribute 0.
        if (ii < 0 || ii >= nx || jj < 0 || jj >= ny) {
            return 0;
        }
    }
    let idx = ii * ny + jj;
    if (ageIn[idx] > 0) { return 1; }
    return 0;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id : vec3u) {
    let i = i32(id.x);
    let j = i32(id.y);
    if (i >= i32(p.numX) || j >= i32(p.numY)) {
        return;
    }

    let idx  = i * i32(p.numY) + j;
    let prev = ageIn[idx];
    let wasAlive = prev > 0;

    // Moore neighborhood (8 neighbors)
    var n : i32 = 0;
    n += neighborAlive(i - 1, j - 1);
    n += neighborAlive(i    , j - 1);
    n += neighborAlive(i + 1, j - 1);
    n += neighborAlive(i - 1, j    );
    n += neighborAlive(i + 1, j    );
    n += neighborAlive(i - 1, j + 1);
    n += neighborAlive(i    , j + 1);
    n += neighborAlive(i + 1, j + 1);

    // Rule: B/S bitmask on 0..8.
    let mask = select(p.birthMask, p.survivalMask, wasAlive);
    let alive : bool = ((mask >> u32(n)) & 1u) == 1u;

    var next : i32;
    if (alive) {
        if (wasAlive) {
            next = min(prev + 1, i32(p.maxAge));
        } else {
            next = 1;
        }
    } else {
        if (wasAlive) {
            next = -1;
        } else {
            next = max(prev - 1, -i32(p.maxDeadAge));
        }
    }
    ageOut[idx] = next;
}
