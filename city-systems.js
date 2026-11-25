const CUSTODY_KEY = 'silly-city:custody-v1';
let memoryCustody;

export function readCustody() {
    try {
        const value = JSON.parse(sessionStorage.getItem(CUSTODY_KEY) ?? 'null');
        if (value && Number.isFinite(value.until) && typeof value.hero === 'string') return value;
    } catch {
        return memoryCustody;
    }
    return memoryCustody;
}

export function setCustody(record) {
    memoryCustody = record;
    try {
        if (record) sessionStorage.setItem(CUSTODY_KEY, JSON.stringify(record));
        else sessionStorage.removeItem(CUSTODY_KEY);
    } catch {
        // In-memory custody still survives closing and reopening the game in this tab.
    }
}

export function createNavigation(width, height, obstructed, spacing = 14) {
    const columns = Math.floor(width / spacing);
    const rows = Math.floor(height / spacing);
    const size = columns * rows;
    const open = new Uint8Array(size);
    const point = (index) => ({
        x: (index % columns + .5) * spacing,
        y: (Math.floor(index / columns) + .5) * spacing,
    });
    for (let index = 0; index < size; index++) {
        const { x, y } = point(index);
        open[index] = Number(!obstructed(x, y));
    }

    function nearest(target) {
        const column = Math.max(0, Math.min(columns - 1, Math.floor(target.x / spacing)));
        const row = Math.max(0, Math.min(rows - 1, Math.floor(target.y / spacing)));
        let best = -1;
        let distance = Infinity;
        for (let y = Math.max(0, row - 5); y <= Math.min(rows - 1, row + 5); y++) {
            for (let x = Math.max(0, column - 5); x <= Math.min(columns - 1, column + 5); x++) {
                const candidate = y * columns + x;
                if (!open[candidate]) continue;
                const location = point(candidate);
                const gap = (location.x - target.x) ** 2 + (location.y - target.y) ** 2;
                if (gap < distance) {
                    best = candidate;
                    distance = gap;
                }
            }
        }
        return best;
    }

    return (from, target) => {
        const start = nearest(from);
        const finish = nearest(target);
        if (start < 0 || finish < 0) return [];
        const queue = new Int32Array(size);
        const previous = new Int32Array(size).fill(-1);
        previous[start] = start;
        queue[0] = start;
        let tail = 1;
        for (let head = 0; head < tail && previous[finish] < 0; head++) {
            const index = queue[head];
            const column = index % columns;
            const row = Math.floor(index / columns);
            for (const next of [
                column > 0 ? index - 1 : -1, column + 1 < columns ? index + 1 : -1,
                row > 0 ? index - columns : -1, row + 1 < rows ? index + columns : -1,
            ]) {
                if (next < 0 || !open[next] || previous[next] >= 0) continue;
                previous[next] = index;
                queue[tail++] = next;
            }
        }
        if (previous[finish] < 0) return [];
        const route = [];
        for (let index = finish; index !== start; index = previous[index]) route.push(point(index));
        route.push(point(start));
        return route.reverse();
    };
}
