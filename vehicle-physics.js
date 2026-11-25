import { vehicleStats } from './gameplay-kit.js';

export function driveBody(car, gas, steering, dt, grip, blocked) {
    const [, , max, acceleration, handling, brake, hp] = vehicleStats(car.model);
    const c = Math.cos(car.angle), s = Math.sin(car.angle);
    let forward = (car.vx ?? 0) * c + (car.vy ?? 0) * s;
    let lateral = -(car.vx ?? 0) * s + (car.vy ?? 0) * c;
    const control = car.stun > 0 ? .22 : 1;
    const condition = .55 + .45 * Math.min(1, (car.hp ?? hp) / hp);
    if (gas) forward += gas * ((gas * forward < 0) ? brake : acceleration * condition * (car.tuned ? 1.17 : 1)) * dt * control;
    else forward *= Math.exp(-2.4 * dt);
    forward = Math.max(-82, Math.min(max * condition, forward));
    car.steer = (car.steer ?? 0) + (steering - (car.steer ?? 0)) * Math.min(1, dt * 8);
    const yaw = car.steer * handling * Math.min(Math.abs(forward) / 81, 1) * Math.sign(forward) * grip * control;
    lateral *= Math.exp(-dt * grip * 7.5);
    car.vx = c * forward - s * lateral;
    car.vy = s * forward + c * lateral;
    car.angle += (yaw + (car.spin ?? 0)) * dt;
    car.spin = (car.spin ?? 0) * Math.exp(-dt * 3.6);
    car.stun = Math.max(0, (car.stun ?? 0) - dt);
    car.speed = forward;
    car.braking = gas * forward < 0;
    const x = car.x + car.vx * dt, y = car.y + car.vy * dt;
    const wallX = blocked(x, car.y, car);
    const wallY = blocked(car.x, y, car);
    if (!wallX && !wallY && !blocked(x, y, car)) {
        car.x = x; car.y = y;
        return 0;
    }
    const impact = Math.hypot(wallX ? car.vx : 0, wallY ? car.vy : 0) || Math.hypot(car.vx, car.vy);
    if (!wallX && wallY) car.x = x;
    if (!wallY && wallX) car.y = y;
    car.vx *= wallX || !wallY ? -.19 : .75;
    car.vy *= wallY || !wallX ? -.19 : .75;
    return impact;
}

export function collideBodies(a, b, blocked) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const [al, aw, , , , , , am] = vehicleStats(a.model);
    const [bl, bw, , , , , , bm] = vehicleStats(b.model);
    if (dx * dx + dy * dy > (al + bl + 4) ** 2) return;
    const ca = Math.cos(a.angle), sa = Math.sin(a.angle);
    const cb = Math.cos(b.angle), sb = Math.sin(b.angle);
    let depth = Infinity, nx = 0, ny = 0;
    for (const [x, y] of [[ca,sa],[-sa,ca],[cb,sb],[-sb,cb]]) {
        const signed = dx * x + dy * y;
        const gap = al * Math.abs(x * ca + y * sa) + aw * Math.abs(y * ca - x * sa)
            + bl * Math.abs(x * cb + y * sb) + bw * Math.abs(y * cb - x * sb) - Math.abs(signed);
        if (gap <= 0) return;
        if (gap < depth) { depth = gap; nx = signed < 0 ? -x : x; ny = signed < 0 ? -y : y; }
    }
    const ia = a.exploded ? 0 : 1 / am, ib = b.exploded ? 0 : 1 / bm;
    if (!ia && !ib) return;
    const approach = ((a.vx ?? 0) - (b.vx ?? 0)) * nx + ((a.vy ?? 0) - (b.vy ?? 0)) * ny;
    const impulse = Math.max(0, approach) * 1.2 / (ia + ib);
    const strike = (car, inv, sign, c, s) => {
        if (!inv) return;
        const x = car.x + nx * sign * depth * inv / (ia + ib);
        const y = car.y + ny * sign * depth * inv / (ia + ib);
        if (!blocked(x, y, car)) { car.x = x; car.y = y; }
        car.vx = (car.vx ?? 0) + sign * impulse * nx * inv;
        car.vy = (car.vy ?? 0) + sign * impulse * ny * inv;
        car.spin = (car.spin ?? 0) + (nx * s - ny * c) * sign * impulse * inv * .018;
        if (approach > 47) car.stun = Math.min(1.5, approach / 120);
    };
    strike(a, ia, -1, ca, sa);
    strike(b, ib, 1, cb, sb);
    if (approach < 20) return;
    return { a: impulse * ia * .32, b: impulse * ib * .32,
        sideA: ca * nx + sa * ny, sideB: -(cb * nx + sb * ny) };
}
