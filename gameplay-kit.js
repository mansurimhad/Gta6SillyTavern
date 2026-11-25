export const WEAPONS = [
    null, null, null,
    { name: 'Пистолет', capacity: 8, interval: .24, speed: 390, range: 245, spread: .025, damage: 2, time: .9 },
    { name: 'Тяжёлый пистолет', capacity: 6, interval: .38, speed: 430, range: 285, spread: .04, damage: 3, time: 1.2 },
    { name: 'ПП', capacity: 18, interval: .10, speed: 375, range: 185, spread: .12, damage: 1, time: 1.1 },
    { name: 'Карабин', capacity: 16, interval: .15, speed: 510, range: 355, spread: .045, damage: 2, time: 1.35 },
    { name: 'Дробовик', capacity: 5, interval: .65, speed: 340, range: 120, spread: .26, damage: 1, pellets: 5, time: 1.55 },
    { name: 'Винтовка', capacity: 4, interval: .76, speed: 625, range: 480, spread: .009, damage: 4, time: 1.6 },
    { name: 'Импульсный гранатомёт', capacity: 2, interval: 1.05, speed: 235, range: 270, spread: .02, damage: 5, pulse: true, time: 2.1 },
];

const specs = {
    compact: [13, 6, 175, 165, 2.9, 360, 75, .8],
    sedan: [16, 7, 203, 150, 2.45, 335, 105, 1.1],
    coupe: [15, 7, 220, 171, 2.68, 355, 85, .94],
    super: [15, 8, 260, 224, 2.3, 390, 86, .91],
    wagon: [16, 7.5, 183, 145, 2.38, 350, 104, 1.12],
    suv: [17, 8, 181, 133, 2.24, 328, 145, 1.43],
    pickup: [18, 8, 186, 143, 2.15, 320, 141, 1.51],
    van: [18, 8, 161, 112, 2.0, 300, 151, 1.7],
    truck: [23, 9, 146, 92, 1.65, 290, 185, 2.2],
    taxi: [16, 7, 195, 155, 2.48, 342, 99, 1.08],
    police: [17, 7.5, 221, 181, 2.54, 385, 135, 1.35],
    bike: [11, 3.8, 245, 215, 3.55, 375, 52, .39],
};
export function vehicleStats(model) {
    return specs[model] ?? specs.sedan;
}
export function carFootprint(car) {
    return vehicleStats(car.model)[0];
}
export function damageStage(car) {
    if (car.exploded) return 'wreck';
    if (car.burn !== undefined) return 'fire';
    const fraction = (car.hp ?? vehicleStats(car.model)[6]) / vehicleStats(car.model)[6];
    if (fraction <= .38) return 'smoke';
    if (fraction <= .6) return 'severe';
    if (fraction < .95) return 'scratches';
    return 'intact';
}
export function createAudio() {
    let context;
    let master;
    let volume = .35;
    let engine;
    let engineGain;
    const voices = new Set();
    function unlock() {
        if (!context && (window.AudioContext || window.webkitAudioContext)) {
            context = new (window.AudioContext || window.webkitAudioContext)();
            master = context.createGain();
            master.gain.value = volume;
            master.connect(context.destination);
        }
        if (context?.state === 'suspended') context.resume().catch(() => {});
    }
    function tone(kind) {
        if (context?.state !== 'running' || !volume || voices.size >= 12) return;
        const [high, low, duration, level] = {
            shot:[170, 34, .17, .17], blast:[90, 21, .54, .23], hit:[140, 45, .13, .10],
            interact:[480, 680, .12, .055], reload:[410, 160, .16, .05], step:[95, 55, .08, .026],
            horn:[265, 258, .32, .105],
            siren:[620, 350, .72, .10],
        }[kind] ?? [340, 220, .1, .04];
        const node = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        node.type = kind === 'shot' || kind === 'blast' ? 'sawtooth' : 'triangle';
        node.frequency.setValueAtTime(high, now);
        node.frequency.exponentialRampToValueAtTime(low, now + duration);
        gain.gain.setValueAtTime(level, now);
        gain.gain.exponentialRampToValueAtTime(.001, now + duration);
        node.connect(gain).connect(master);
        voices.add(node);
        node.onended = () => { voices.delete(node); node.disconnect(); gain.disconnect(); };
        node.start();
        node.stop(now + duration);
    }
    function hum(speed, city = true) {
        if (context?.state !== 'running') return;
        if (!engine) {
            engine = context.createOscillator();
            engineGain = context.createGain();
            engine.type = 'triangle';
            engineGain.gain.value = 0;
            engine.connect(engineGain).connect(master);
            engine.start();
        }
        const time = context.currentTime;
        engine.frequency.setTargetAtTime(speed === null ? 37 : 44 + Math.abs(speed) * .54, time, .10);
        engineGain.gain.setTargetAtTime(city ? speed === null ? .007 : .049 : 0, time, .07);
    }
    return { unlock, tone, hum, volume: value => { volume = value; if (master) master.gain.value = volume; },
        dispose() { if (context && context.state !== 'closed') context.close().catch(() => {}); } };
}
export function signalAt(time, x, y) {
    const phase = (time + x / 140 + y / 215) % 13;
    if (phase < 5.25) return 'horizontal';
    if (phase >= 6.25 && phase < 11.5) return 'vertical';
    return 'all-stop';
}
