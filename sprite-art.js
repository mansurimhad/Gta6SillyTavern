import { box, oval } from './city-art.js';
import { vehicleStats } from './gameplay-kit.js';
import { VEHICLE_FRAMES } from './vehicle-frames.js';

function loadAtlas(name) {
    const image = new Image();
    image.decoding = 'async';
    image.src = new URL('./assets/' + name + '.webp', import.meta.url);
    return image;
}

export function createHeroRenderer() {
    const atlas = loadAtlas('heroes');
    const actions = loadAtlas('hero-actions');
    const reactions = loadAtlas('hero-reactions');
    const swim = loadAtlas('swim');
    const motion = loadAtlas('hero-motion');
    const movement = loadAtlas('hero-movement');
    return (ctx, character, x, y, options) => {
        const column = HEROES.findIndex(hero => hero.name === character.name);
        if (column < 0 || !atlas.naturalWidth || character.shackled) {
            paintActor(ctx, character, x, y, options);
            return;
        }
        const gait = character.gait ?? 0;
        const step = Math.sin(character.stride);
        const reaction = character.collapse ? character.collapse - 1 : options.reloading ? 2 : -1;
        const action = character.swimming ? 1 : character.swing ? 0 : options.armed ? 2 : -1;
        const swimming = character.swimming && swim.naturalWidth;
        const current = character.swimCycle ?? 0;
        const strokePhase = current % (Math.PI * 2) / (Math.PI * 2);
        const motionPose = character.hurtPose ? 3 : character.recoil && options.armed ? 2 : action < 0 && gait > 3 ? step >= 0 ? 0 : 1 : -1;
        const movementPose = character.mountingPose ?? (action < 0 ? character.turnPose ? 1 : character.bracePose ? 0 : -1 : -1);
        const source = swimming ? swim : reaction >= 0 && reactions.naturalWidth ? reactions
            : movementPose >= 0 && movement.naturalWidth ? movement
            : motionPose >= 0 && motion.naturalWidth ? motion : action >= 0 && actions.naturalWidth ? actions : atlas;
        const frame = swimming ? Math.floor(strokePhase * 4) : source === reactions ? reaction
            : source === movement ? movementPose : source === motion ? motionPose : source === actions ? action
            : !gait || Math.abs(step) < .33 ? 0 : step >= 0 ? 1 : 2;
        const heading = character.swimming || action < 0 ? character.heading ?? character.angle : character.angle;
        if (!character.swimming) oval(ctx, '#30223d65', x + 1.9, y + 2.6, 9, 4.8);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(heading + (character.down || character.collapse && source !== reactions ? .9 : 0));
        if (character.collapse === 1) ctx.scale(.92, .90);
        if (character.swimming) {
            const effort = Math.min(1, (character.swimSpeed ?? 0) / 54);
            const spread = 3 + effort * 7;
            oval(ctx, '#70c8d530', -4, 0, 10 + spread, 4 + effort * 2);
            for (const side of [-1, 1]) {
                stroke(ctx, '#bcf5e77a', .66, p => {
                    p.moveTo(1, side * 3.4);
                    p.quadraticCurveTo(-5, side * (3.3 + effort * 2), -8 - spread, side * (2 + effort * 4));
                });
                oval(ctx, '#ddfff0a0', -1 - effort * 3, side * (3 + strokePhase * 2), 1 + effort * 1.3, .6);
            }
            ctx.translate(0, Math.sin(current) * (.25 + effort * .65));
            if (swimming && strokePhase >= .5) ctx.scale(1, -1);
        }
        if (character.swing) ctx.translate(2.5 * Math.sin(character.swing * 10), 0);
        if (swimming) ctx.drawImage(source, column * 96, frame * 64, 96, 64, -12, -7.5, 24, 15);
        else ctx.drawImage(source, column * 96, frame * 64, 96, 64, -12, -8, 24, 16);
        if (options.knife && !character.swimming) {
            stroke(ctx, '#e7eefb', 1.25, p => { p.moveTo(5, 3); p.lineTo(9, 2); });
        }
        ctx.restore();
        if (options.player) stroke(ctx, '#fff2d9', 1, p => { p.moveTo(x - 3, y - 13); p.lineTo(x, y - 15); p.lineTo(x + 3, y - 13); });
    };
}

export const HEROES = [
    { name: 'Амина', shirt: '#f586a4', light: '#ffc0ca', pants: '#514167', hair: '#d9a756', highlight: '#ffe8a9',
        skin: '#efae97', shade: '#bf7776', style: 'long', face: [34, 68, 43, 57, 79], eyes: '#64877a',
        backdrop: ['#9e547f', '#542e56'] },
    { name: 'Миша', shirt: '#6fcef0', light: '#bceaff', pants: '#394963', hair: '#9d7550', highlight: '#d6b887',
        skin: '#efb590', shade: '#b87564', style: 'short', face: [32, 69, 42, 60, 83], eyes: '#547a93',
        backdrop: ['#4b9daf', '#364e78'] },
    { name: 'Мансур', shirt: '#81d3a2', light: '#c5eabb', pants: '#394b54', hair: '#23202e', highlight: '#534353',
        skin: '#f1cbb6', shade: '#bf8e83', style: 'beard', face: [29, 73, 39, 63, 82], eyes: '#493f4d',
        backdrop: ['#6d9e76', '#304e57'] },
];

function path(ctx, color, draw) {
    ctx.fillStyle = color;
    ctx.beginPath();
    draw(ctx);
    ctx.closePath();
    ctx.fill();
}

function stroke(ctx, color, width, draw) {
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.beginPath();
    draw(ctx);
    ctx.stroke();
}

export function paintPortrait(canvas, hero) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(canvas.width / 100, canvas.height / 112);
    const fade = ctx.createLinearGradient(5, 0, 87, 105);
    fade.addColorStop(0, hero.backdrop[0]);
    fade.addColorStop(1, hero.backdrop[1]);
    box(ctx, fade, 0, 0, 100, 112);
    oval(ctx, '#ffe0aa45', 72, 32, 22, 22);
    for (let y = 22; y < 53; y += 8) box(ctx, '#894f7642', 50, y, 46, 2);
    for (let x = 1; x < 100; x += 11) {
        const y = 62 + x * 17 % 21;
        box(ctx, '#26283d75', x, y, 8, 112 - y, .7);
        box(ctx, '#f6ce9a75', x + 2, y + 3, 1.8, 2);
    }
    path(ctx, '#2c263f', p => {
        p.moveTo(8, 112); p.bezierCurveTo(9, 93, 22, 87, 37, 83);
        p.lineTo(65, 83); p.bezierCurveTo(83, 89, 91, 96, 93, 112);
    });
    path(ctx, hero.shirt, p => {
        p.moveTo(10, 112); p.bezierCurveTo(13, 94, 24, 89, 41, 84);
        p.lineTo(63, 84); p.bezierCurveTo(80, 89, 88, 96, 91, 112);
    });
    if (hero.style === 'long') {
        path(ctx, hero.hair, p => {
            p.moveTo(24, 47); p.bezierCurveTo(14, 76, 27, 87, 17, 103);
            p.bezierCurveTo(31, 101, 41, 96, 42, 81); p.lineTo(62, 81);
            p.bezierCurveTo(62, 98, 70, 102, 83, 102); p.bezierCurveTo(73, 86, 83, 69, 73, 41);
        });
        stroke(ctx, hero.highlight, 1.5, p => {
            p.moveTo(27, 60); p.bezierCurveTo(25, 76, 31, 90, 24, 97);
            p.moveTo(73, 58); p.bezierCurveTo(78, 78, 70, 88, 77, 96);
        });
    }
    path(ctx, hero.shade, p => {
        p.moveTo(40, 72); p.lineTo(61, 72); p.lineTo(62, 85);
        p.quadraticCurveTo(54, 95, 49, 94); p.quadraticCurveTo(43, 92, 38, 85);
    });
    path(ctx, hero.skin, p => {
        p.moveTo(43, 75); p.lineTo(59, 74); p.lineTo(58, 87); p.quadraticCurveTo(50, 94, 43, 87);
    });
    path(ctx, '#253149', p => {
        p.moveTo(38, 85); p.quadraticCurveTo(50, 99, 62, 86); p.lineTo(67, 89);
        p.quadraticCurveTo(53, 106, 34, 89);
    });
    stroke(ctx, hero.light, 2, p => {
        p.moveTo(13, 110); p.quadraticCurveTo(19, 96, 29, 94);
        p.moveTo(71, 94); p.quadraticCurveTo(83, 98, 86, 108);
    });
    path(ctx, hero.hair, p => {
        p.moveTo(25, 52); p.bezierCurveTo(20, 24, 38, 14, 52, 17);
        p.bezierCurveTo(71, 15, 80, 30, 76, 54); p.lineTo(68, 66); p.lineTo(32, 66);
    });
    oval(ctx, hero.shade, 29, 58, 4, 7);
    oval(ctx, hero.shade, 72, 58, 4, 7);
    path(ctx, hero.shade, p => {
        p.moveTo(30, 42); p.quadraticCurveTo(52, 30, 72, 42);
        p.bezierCurveTo(74, 62, 66, 81, 51, 84);
        p.bezierCurveTo(35, 81, 30, 65, 30, 42);
    });
    const face = ctx.createLinearGradient(31, 50, 72, 70);
    face.addColorStop(0, '#ffcb9b');
    face.addColorStop(.42, hero.skin);
    face.addColorStop(1, hero.shade);
    const [left, right, jawLeft, jawRight, chin] = hero.face;
    path(ctx, face, p => {
        p.moveTo(left, 42); p.quadraticCurveTo(52, 31, right, 42);
        p.bezierCurveTo(right + 1, 62, jawRight + 3, chin - 5, jawRight, chin - 6);
        p.quadraticCurveTo(50, chin + 2, jawLeft, chin - 6);
        p.bezierCurveTo(jawLeft - 6, chin - 9, left - 1, 56, left, 42);
    });
    if (hero.style === 'beard') {
        path(ctx, hero.hair, p => {
            p.moveTo(29, 56); p.quadraticCurveTo(34, 66, 39, 67);
            p.quadraticCurveTo(49, 61, 58, 67); p.quadraticCurveTo(65, 67, 72, 55);
            p.bezierCurveTo(72, 72, 64, 82, 53, 86); p.bezierCurveTo(38, 85, 31, 74, 29, 56);
        });
        stroke(ctx, hero.highlight, 1.15, p => {
            p.moveTo(36, 69); p.quadraticCurveTo(40, 78, 49, 80); p.moveTo(63, 69); p.lineTo(57, 78);
        });
    }
    path(ctx, hero.hair, p => {
        p.moveTo(27, 47); p.quadraticCurveTo(24, 21, 47, 20); p.quadraticCurveTo(72, 16, 76, 49);
        p.quadraticCurveTo(67, 44, 62, 36);
        if (hero.style === 'long') p.quadraticCurveTo(53, 46, 31, 48);
        else p.quadraticCurveTo(51, 33, 45, 38);
        p.quadraticCurveTo(37, 41, 28, 52);
    });
    stroke(ctx, hero.highlight, 1.45, p => {
        p.moveTo(30, 39); p.quadraticCurveTo(36, 25, 54, 24);
        p.moveTo(34, 42); p.quadraticCurveTo(45, 37, 54, 28);
        p.moveTo(63, 28); p.quadraticCurveTo(69, 34, 71, 41);
    });
    stroke(ctx, hero.hair, 1.95, p => {
        p.moveTo(35, 50); p.quadraticCurveTo(40, 47, 45, 49);
        p.moveTo(55, 49); p.quadraticCurveTo(60, 48, 65, 51);
    });
    for (const x of hero.style === 'long' ? [41, 59] : [39, 61]) {
        const eyeY = hero.style === 'beard' ? 56 : 55;
        oval(ctx, '#fff2dd', x, eyeY, hero.style === 'long' ? 4.4 : 3.6, hero.style === 'short' ? 1.3 : 1.85);
        oval(ctx, hero.eyes, x + .25, eyeY, 1.45, 1.5);
        oval(ctx, '#ffffffc9', x + .7, eyeY - .55, .42, .42);
        if (hero.style === 'long') oval(ctx, '#de8a9070', x, 62, 3.8, 1.8);
    }
    stroke(ctx, hero.shade, 1.16, p => {
        p.moveTo(hero.style === 'short' ? 52 : 50, 54);
        p.lineTo(hero.style === 'beard' ? 47 : 49, 63);
        p.quadraticCurveTo(51, 65, hero.style === 'beard' ? 55 : 53, 63);
    });
    stroke(ctx, hero.style === 'beard' ? '#d09886' : '#a94f64', 1.35, p => {
        p.moveTo(hero.style === 'long' ? 46 : 44, 69); p.quadraticCurveTo(51, hero.style === 'short' ? 70 : 73, 57, 69);
    });
    if (hero.style === 'long') {
        oval(ctx, '#ffd392', 29, 65, 1.7, 2.4);
        oval(ctx, '#ffd392', 72, 65, 1.7, 2.4);
    }
    ctx.restore();
}

export function paintActor(ctx, character, x, y, { player, armed, knife }) {
    oval(ctx, character.swimming ? '#b6fdf450' : '#282a4266', x + 1.8, y + 2.6, 7.2, 4.2);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(character.heading ?? character.angle);
    ctx.scale(1.14, 1.14);
    if (character.look !== undefined) ctx.scale(.94 + character.look * .024, [1.10,.89,1,.96,1.13,.92][character.look]);
    if (character.flinch) ctx.translate(-character.flinch * 14, character.flinch * 6);
    if (character.swimming) {
        const pull = Math.sin(character.stride);
        oval(ctx, '#85f8e78c', -4, 0, 11, 5.7);
        oval(ctx, '#326e8499', -3, 0, 8.5, 3.6);
        oval(ctx, character.shirt, -1.5, 0, 4.7, 3.9);
        for (const side of [-1, 1]) {
            stroke(ctx, character.skin, 2.0, p => {
                p.moveTo(0, side * 3); p.quadraticCurveTo(3.6 * pull * side, side * 7, 4.8 * pull * side, side * 4.9);
            });
            oval(ctx, '#f0fff4b3', -7 + 2 * pull * side, side * 4.6, 2.6, .65);
        }
        oval(ctx, character.skin, 3.2, 0, 3, 2.8);
        oval(ctx, character.hair, 2.35, 0, 2.65, 2.5);
        ctx.restore();
        return;
    }
    if (character.down) {
        box(ctx, character.pants ?? '#45415b', -8, -1.8, 8, 3.6, 1);
        box(ctx, character.shirt, -2, -2.8, 6, 5.6, 2);
        oval(ctx, character.hair, 5.2, 0, 2.5, 2.2);
        ctx.restore();
        return;
    }
    const gait = character.gait ?? 0;
    const stride = Math.sin(character.stride) * gait;
    const swingLength = character.stabbing ? .34 : .28;
    const reach = character.swing > 0 ? Math.sin((1 - character.swing / swingLength) * Math.PI) : 0;
    const pants = character.pants ?? '#4e485d';
    const accent = character.light ?? '#fff1cb81';
    if (character.shackled) {
        const a = -6.2 + stride;
        const b = -6.2 - stride;
        stroke(ctx, '#282838', 1.35, p => { p.moveTo(a, -2.2); p.quadraticCurveTo(-8, 0, b, 2.2); });
        stroke(ctx, '#bec6d2', .55, p => { p.moveTo(a, -2.2); p.quadraticCurveTo(-8, 0, b, 2.2); });
    }
    for (const side of [-1, 1]) {
        const offset = stride * side;
        const lift = Math.max(0, Math.cos(character.stride) * side) * gait * .32;
        const footX = -6.4 + offset;
        const footY = side * (2.15 + lift * .48);
        stroke(ctx, '#302638', 3.05, p => {
            p.moveTo(-2, side * 2.15); p.lineTo(-4.25 + offset * .47, side * 2.5); p.lineTo(footX, footY);
        });
        stroke(ctx, pants, 2.2, p => {
            p.moveTo(-2, side * 2); p.lineTo(-4.25 + offset * .47, side * 2.45); p.lineTo(footX, footY);
        });
        box(ctx, '#242737', footX - 1.0, footY - 1.25, 3.1, 2.5, .75);
        box(ctx, '#d9c9ba', footX + 1.45, footY - .85, .65, 1.7, .3);
        if (character.shackled) box(ctx, '#aebacc', footX - .65, footY - 1.4, 1.05, 2.8, .25);
        stroke(ctx, character.skin, 1.6, p => {
            p.moveTo(.4, side * 4.3); p.lineTo(.8 - offset * .75, side * 5.3);
            p.lineTo(2.8 - offset * .83 + (side === (character.hand ?? 1) ? reach * (character.stabbing ? 9 : 6) : 0),
                side * (4.9 - reach * 1.2));
        });
    }
    path(ctx, '#433049', p => {
        p.moveTo(-4.4, -3.1); p.lineTo(-1.7, -4.5); p.quadraticCurveTo(1.9, -5.2, 3.2, -3.0);
        p.lineTo(3.2, 3.0); p.quadraticCurveTo(1.9, 5.2, -1.7, 4.5); p.lineTo(-4.4, 3.1);
    });
    const uniform = { officer: '#5176a8', guard: '#625887', medic: '#e8e2d2', rescue: '#a75461' }[character.job];
    path(ctx, uniform ?? character.shirt, p => {
        p.moveTo(-4.0, -2.8); p.lineTo(-1.6, -4.1); p.quadraticCurveTo(1.9, -4.7, 2.8, -2.8);
        p.lineTo(2.8, 2.8); p.quadraticCurveTo(1.9, 4.7, -1.6, 4.1); p.lineTo(-4.0, 2.8);
    });
    if (character.style === 'short') {
        box(ctx, '#88adb8', -2.9, -.65, 4.9, 1.3, .35);
        box(ctx, '#d6e9d8', -2.4, -.29, 3, .58, .2);
    } else if (character.style === 'beard' && !character.shackled) {
        stroke(ctx, '#375964', .9, p => {
            p.moveTo(-2.9, -2.8); p.lineTo(2.5, -2.8);
            p.moveTo(-2.9, 2.8); p.lineTo(2.5, 2.8);
        });
    }
    oval(ctx, '#fff2ce25', -.8, -2.2, 2.3, 1.35);
    if (character.shackled) box(ctx, '#ffe2a3', -2.4, 1.8, 1.65, 2.1, .25);
    if (uniform) {
        box(ctx, character.job === 'medic' ? '#c65d72' : '#ffe2ae', -.5, 2.4, 2.5, 1.5, .45);
        if (character.job === 'medic') box(ctx, '#c65d72', .5, 1.8, .7, 2.6, .25);
    }
    if (character.look === 1 || character.look === 4) {
        box(ctx, character.look === 1 ? '#70525f' : '#333f59', -4.2, -2.3, 4.1, 4.6, 1.1);
        stroke(ctx, '#d7ab9280', .65, p => { p.moveTo(-3.1,-1.5); p.lineTo(-3.1,1.5); });
    }
    stroke(ctx, accent, .7, p => {
        p.moveTo(-2.4, -3.4); p.quadraticCurveTo(.6, -4.4, 2.6, -3.2);
        p.moveTo(-2.4, 3.4); p.quadraticCurveTo(.6, 4.4, 2.6, 3.2);
    });
    if (character.style === 'long') {
        oval(ctx, character.hair, -1.2, -1.8, 2.4, 1.65);
        oval(ctx, character.highlight, -1.8, -1.8, 1.65, .7);
    }
    oval(ctx, '#36283761', 2.2, .2, 2.8, 2.45);
    oval(ctx, character.skin, 3.1, 0, 2.82, 2.35);
    oval(ctx, character.hair, 2.05, 0, 2.85, 2.38);
    if (character.look === 0) oval(ctx, character.hair, -.35, .65, 2.05, 2.9);
    if (character.look === 2) box(ctx, '#c19b73', 1, -2.8, 4.9, 5.6, 1.6);
    if (character.look === 3) oval(ctx, '#3b374c', 2, 0, 2.7, 2.75);
    if (character.look === 5) stroke(ctx, '#e9c2a0', .7, p => { p.moveTo(1,-1.8); p.quadraticCurveTo(3,-1,3.4,.9); });
    if (character.phone) box(ctx, '#303149', 3.7, -4.3, 2.8, 1.5, .35);
    if (character.job === 'rescue' || character.job === 'officer') {
        oval(ctx, character.job === 'rescue' ? '#f1ba69' : '#303b55', 2.35, 0, 3, 2.9);
        box(ctx, '#fff1d083', 2.7, -.4, 2.4, .8, .2);
    }
    oval(ctx, character.highlight ?? '#ffffff30', 1.2, -.7, 1.53, .95);
    if (character.style === 'beard') {
        stroke(ctx, character.hair, .95, p => { p.moveTo(4.5, -1.6); p.quadraticCurveTo(5.7, 0, 4.5, 1.6); });
    }
    if (armed) {
        ctx.save();
        ctx.rotate(character.angle - (character.heading ?? character.angle));
        box(ctx, '#e5cec0', 4, 2.95, 2.4, 2, .5);
        box(ctx, '#333749', 5.2, 3.1, 4.8, 1.65, .45);
        ctx.restore();
    } else if (knife) {
        const side = character.hand ?? 1;
        const tip = 5.9 + reach * 7;
        stroke(ctx, '#323044', 1.55, p => { p.moveTo(tip - 3, side * 4.1); p.lineTo(tip, side * 4.1); });
        stroke(ctx, '#d9edf0', 1.0, p => { p.moveTo(tip - .2, side * 4.1); p.lineTo(tip + 2.7, side * 3.3); });
    }
    ctx.restore();
    if (character.greeting) {
        box(ctx, '#f6dfbd', x - 4.5, y - 13.2, 9, 4.1, 1.6);
        for (const offset of [-2.2, 0, 2.2]) oval(ctx, '#696078', x + offset, y - 11, .55, .55);
    }
    if (player) {
        stroke(ctx, '#fff2d9', 1, p => {
            p.moveTo(x - 3.2, y - 9.4); p.lineTo(x, y - 11.9); p.lineTo(x + 3.2, y - 9.4);
        });
    }
}

export function paintVehicle(ctx, car, x, y) {
    const type = car.model ?? 'coupe';
    const [long, half, , , , , durability] = vehicleStats(type);
    const cabinFront = type === 'truck' ? 16 : type === 'super' ? 6 : 7.8;
    const cabinRear = type === 'wagon' ? -12 : type === 'truck' ? 5 : type === 'pickup' ? -2 : -8.8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(car.angle);
    if (car.exploded) {
        box(ctx, '#383344', -long - 1, -half, long * 2 + 2, half * 2, 4);
        box(ctx, '#211e31', -long + 4, -half + 2, long * 2 - 10, half * 2 - 4, 2);
        stroke(ctx, '#888085', .8, p => { p.moveTo(-long + 2, -half); p.lineTo(-4, -half + 2); p.lineTo(2, -half); });
        ctx.restore();
        return;
    }
    if (type === 'bike') {
        box(ctx, '#232334', -11, -1.55, 6, 3.1, 1.4);
        box(ctx, '#232334', 5, -1.55, 6, 3.1, 1.4);
        box(ctx, car.color, -7, -2.6, 15, 5.2, 2);
        box(ctx, '#332f4d', -5, -1.8, 7, 3.6, 1);
        box(ctx, '#c7cacf', 4, -3.5, 1.5, 7, .5);
        oval(ctx, '#fff0c9', 8, 0, 1.2, 1.25);
        ctx.restore();
        return;
    }
    const headlights = ctx.createLinearGradient(long - .5, 0, long + 25, 0);
    headlights.addColorStop(0, '#ffdeb34e');
    headlights.addColorStop(1, '#ffdeb300');
    for (const side of [-1, 1]) {
        path(ctx, headlights, p => {
            p.moveTo(long - 1, side * 4); p.lineTo(long + 23, side * 4 - 4);
            p.lineTo(long + 23, side * 4 + 4);
        });
    }
    box(ctx, '#24274270', -long + 1.5, -half + 1.8, 2 * long + 1.5, 2 * half + 1, 3.8);
    for (const wheel of [-long + 4.6, long - 5]) {
        for (const direction of [-1, 1]) {
            box(ctx, '#252a39', wheel - 2.2, direction * (half - .1) - 1.1, 4.4, 2.2, .5);
            box(ctx, '#b2a6b290', wheel - 1.5, direction * half - .21, 3, .42);
        }
    }
    box(ctx, '#444055', -long, -half, long * 2, half * 2, 3.2);
    const body = ctx.createLinearGradient(0, -half, 0, half);
    body.addColorStop(0, '#fff4d9');
    body.addColorStop(.15, car.color);
    body.addColorStop(.86, car.color);
    body.addColorStop(1, '#51455e');
    box(ctx, body, -long + .5, -half + .4, long * 2 - 1, half * 2 - .8, 3);
    if (type === 'van' || type === 'truck') {
        box(ctx, '#f1dbbf', -16.7, -6.2, 18, 12.4, 1.8);
        box(ctx, car.color, -16.5, -4.2, 16.5, 8.4, 1);
        box(ctx, '#f8edd9', -13, -2.3, 6, 4.6, 1);
        box(ctx, car.color, -11, -3.4, 1.5, 6.8);
    }
    if (type === 'pickup') {
        box(ctx, '#424454', -long + 2, -half + 1.8, 12, half * 2 - 3.6, 1);
        for (let x = -long + 4; x < -long + 13; x += 2) box(ctx, '#7b8190', x, -half + 2.8, .55, half * 2 - 5.6);
    }
    path(ctx, '#29394f', p => {
        p.moveTo(cabinRear, -half + 1.7); p.lineTo(cabinFront - 2, -half + 1.75); p.lineTo(cabinFront, -3.5);
        p.lineTo(cabinFront, 3.5); p.lineTo(cabinFront - 2, half - 1.75);
        p.lineTo(cabinRear, half - 1.7); p.quadraticCurveTo(cabinRear - 2, 0, cabinRear, -half + 1.7);
    });
    stroke(ctx, '#86bad0', .9, p => { p.moveTo(cabinFront - 2, -3.8); p.lineTo(cabinFront - 1, -2); p.lineTo(cabinFront - 1, 2.8); });
    box(ctx, car.color, cabinRear + 2.65, -half + 2.4, Math.max(2, cabinFront - cabinRear - 6.45), half * 2 - 4.8, 1.4);
    stroke(ctx, '#fff3df95', .72, p => {
        p.moveTo(cabinRear + 3.8, -half + 2.8); p.lineTo(cabinFront - 5, -half + 2.8);
        p.moveTo(9, -half + 1.8); p.lineTo(long - 2, -half + 2.5);
    });
    stroke(ctx, '#3a344f6a', .65, p => {
        p.moveTo(-10, -half + 1.1); p.lineTo(8, -half + 1.1);
        p.moveTo(-10, half - 1.0); p.lineTo(8, half - 1.0);
        p.moveTo(7.8, -half + 1); p.lineTo(7.8, half - 1);
    });
    box(ctx, '#f4d6bb8a', 9.1, -2.9, long - 11, 1, .3);
    for (const side of [-1, 1]) {
        box(ctx, '#4c4e65', 4.5, side * (half + .15) - .7, 2.5, 1.4, .5);
        box(ctx, '#fff1bc', long - 2.1, side * 4.6 - .72, 1.65, 1.5, .5);
        box(ctx, car.braking ? '#ff9d98' : '#e9486d', -long + .4, side * 4.7 - .68, 1.5, 1.45, .45);
    }
    box(ctx, '#696174', long - 1.2, -2.6, .85, 5.2, .3);
    if (car.lightbar) {
        box(ctx, '#2d343f', .2, -6.4, 2.95, 12.8, .9);
        box(ctx, car.flash ? '#fff1e3' : '#ee577b', .5, -5.9, 2.25, 5.15, .45);
        box(ctx, car.flash ? '#75c6ff' : '#344f85', .5, .75, 2.25, 5.15, .45);
    }
    if (type === 'taxi') {
        box(ctx, '#f8e0a5', -2.2, -2.6, 4.8, 5.2, .6);
        box(ctx, '#725a56', -.5, -1.4, .8, 2.8, .3);
    }
    if (car.hp < durability * .76) {
        stroke(ctx, '#452d51', 1.05, p => {
            p.moveTo(long - 8, -3.6); p.lineTo(long - 5, -.8); p.lineTo(long - 7, 1.4);
        });
        if (car.hp < durability * .45) box(ctx, '#2e2b3f90', long - 8, -half + 2, 6, half * 2 - 4, 2);
    }
    if (car.front > 12 || car.rear > 12 || car.side > 12) {
        const damagedEnd = car.front >= (car.rear ?? 0) ? long - 4 : -long + 4;
        if (car.front > 12 || car.rear > 12) {
            box(ctx, '#554352', damagedEnd - 2,-half + .6,4.4,half * 2 - 1.2,1);
            stroke(ctx, '#968398', .7, p => { p.moveTo(damagedEnd,-half+1); p.lineTo(damagedEnd+1,1); p.lineTo(damagedEnd-2,half-1); });
        }
        if (car.side > 12) {
            stroke(ctx,'#e4c3ac',.72,p => {p.moveTo(-7,-half+.65);p.lineTo(-2,-half+2);p.lineTo(6,-half+1);});
            stroke(ctx,'#a9bdcb',.7,p => {p.moveTo(5,0);p.lineTo(2,-3);p.moveTo(5,0);p.lineTo(6,3);});
        }
    }
    ctx.restore();
}

export function createPedestrianAtlas() {
    const raster = loadAtlas('pedestrians');
    const reactions = loadAtlas('pedestrian-actions');
    const atlas = document.createElement('canvas');
    const side = 52;
    const columns = 16;
    atlas.width = columns * side;
    atlas.height = columns * side;
    const painter = atlas.getContext('2d');
    const frames = new Map();
    return (ctx, npc, x, y) => {
        if (raster.naturalWidth) {
            const column = npc.job === 'officer' || npc.job === 'guard' ? 3 : (npc.look ?? 0) % 4;
            const phase = Math.sin(npc.stride);
            const fallAge = npc.fallAge ?? 1;
            const rising = npc.rise ?? 0;
            const falling = npc.down && fallAge < .90;
            const action = falling ? fallAge < .48 ? 0 : 1 : npc.down ? 1
                : rising > .70 ? 1 : rising > .20 ? 0 : npc.flinch ? 0 : npc.sitting ? 2 : -1;
            const art = action >= 0 && reactions.naturalWidth ? reactions : raster;
            const pose = art === reactions ? action : npc.down || !npc.gait || Math.abs(phase) < .35 ? 0 : phase > 0 ? 1 : 2;
            const size = 22 + ((npc.look ?? 3) % 3) * 1.2;
            oval(ctx, '#30243c5c', x + 1.8, y + 2.1, 8.4, 4.6);
            ctx.save();
            ctx.translate(x, y);
            const lean = (column % 2 ? -1 : 1) * (falling ? Math.min(fallAge * .8, .48) : 0);
            const slide = falling ? Math.min(fallAge, .65) * 5.4 : 0;
            ctx.rotate((npc.heading ?? npc.angle) + lean + (npc.down && art === raster ? (column % 2 ? -.95 : .9) : 0));
            ctx.translate(-slide, 0);
            if (npc.down && action === 1 && !falling && !npc.fatal) ctx.scale(1, 1 + Math.sin((fallAge - .9) * 2.4) * .025);
            if (npc.flinch) ctx.translate(-npc.flinch * 12, npc.flinch * 4);
            ctx.drawImage(art, column * 96, pose * 64, 96, 64, -size / 2, -7.7, size, 15.4);
            if (npc.phone) box(ctx, '#3e3753', 4, -5, 2.6, 1.5, .5);
            if (npc.greeting) {
                box(ctx, '#f6dfbd', -4, -13, 8, 3, 1.1);
                oval(ctx, '#7a6486', 0, -11.4, 1.2, .45);
            }
            ctx.restore();
            return;
        }
        if (npc.down || npc.phone || npc.flinch || npc.greeting || npc.swing || npc.swimming) {
            paintActor(ctx, npc, x, y, {});
            return;
        }
        const gait = npc.gait > 2 ? 2.7 : npc.gait ? 1.7 : 0;
        const phase = gait ? Math.floor(npc.stride * 8 / (2 * Math.PI)) % 8 : 0;
        const key = [npc.look, npc.job, npc.shirt, npc.hair, npc.pants, npc.skin, gait, phase].join(':');
        if (!frames.has(key)) {
            if (frames.size === 256) frames.clear();
            const index = frames.size;
            const left = index % columns * side;
            const top = Math.floor(index / columns) * side;
            frames.set(key, { left, top });
            painter.clearRect(left, top, side, side);
            painter.save();
            painter.translate(left + side / 2, top + side / 2);
            painter.scale(2, 2);
            paintActor(painter, { ...npc, heading: 0, angle: 0, stride: phase * Math.PI / 4, gait }, 0, 0, {});
            painter.restore();
        }
        const source = frames.get(key);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(npc.heading ?? npc.angle);
        ctx.drawImage(atlas, source.left, source.top, side, side, -13, -13, 26, 26);
        ctx.restore();
    };
}

export function createVehicleAtlas() {
    const raster = loadAtlas('vehicles');
    const fleet = loadAtlas('fleet');
    const forms = { coupe: 0, taxi: 1, suv: 2, police: 3 };
    const fleetForms = { compact: 0, sedan: 1, wagon: 2, super: 3, pickup: 4, van: 5, truck: 6, bike: 7 };
    const atlas = document.createElement('canvas');
    const width = 148;
    const height = 50;
    const columns = 6;
    atlas.width = width * columns;
    atlas.height = height * 8;
    const painter = atlas.getContext('2d');
    const frames = new Map();
    return (ctx, car, x, y) => {
        const form = forms[car.model] ?? fleetForms[car.model];
        const art = forms[car.model] !== undefined ? raster : fleet;
        if (form !== undefined && art.naturalWidth) {
            const [long, half, , , , , hp] = vehicleStats(car.model);
            const [left, top, width, height] = VEHICLE_FRAMES[art === raster ? 'vehicles' : 'fleet'][form];
            const bodyWidth = long * 2;
            const bodyHeight = Math.max(half * 2, bodyWidth * height / width) * (car.model === 'bike' ? .78 : 1);
            const frame = car.exploded ? 2 : car.hp < hp * .75 ? 1 : 0;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(car.angle);
            oval(ctx, '#211b3680', 2, 2, long, bodyHeight / 2);
            ctx.save();
            if (car.paintHue && frame !== 2 && 'filter' in ctx) ctx.filter = 'hue-rotate(' + car.paintHue + 'deg)';
            ctx.drawImage(art, form * 96 + left, frame * 64 + top, width, height, -long, -bodyHeight / 2, bodyWidth, bodyHeight);
            ctx.restore();
            if (car.paintStripe && frame !== 2) {
                stroke(ctx, car.paintStripe, .9, p => { p.moveTo(-long + 5, -bodyHeight * .29); p.lineTo(long - 5, -bodyHeight * .29); });
            }
            if (frame === 1) {
                if (car.front > 8) stroke(ctx, '#35273e', 1.25, p => { p.moveTo(long - 5, -half + 1); p.lineTo(long - 1, -half + 5); });
                if (car.rear > 8) stroke(ctx, '#35273e', 1.2, p => { p.moveTo(-long + 1, 0); p.lineTo(-long + 4, half - 1); });
                if (car.side > 8) stroke(ctx, '#ecd4c89a', .7, p => { p.moveTo(-6, -half + 2);p.lineTo(-2, -half + 3);p.lineTo(4, -half + 1); });
            }
            if (car.tuned && !car.exploded) {
                stroke(ctx, '#b9aff2bf', .72, p => { p.moveTo(-long + 3, -half + 2); p.lineTo(long - 3, -half + 2); });
            }
            if (car.braking && !car.exploded) {
                oval(ctx, '#ff8a9a', -long + 2, -half + 3, 1.2, .65);
                oval(ctx, '#ff8a9a', -long + 2, half - 3, 1.2, .65);
            }
            if (car.flash && car.model === 'police') {
                oval(ctx, '#63c5ffb5', 0, -2, 3, 2.7);
                oval(ctx, '#fa6787b5', 0, 2, 3, 2.7);
            }
            ctx.restore();
            return;
        }
        if (car.exploded || car.front > 12 || car.rear > 12 || car.side > 12 || car.hp < vehicleStats(car.model)[6] * .76) {
            paintVehicle(ctx, car, x, y);
            return;
        }
        const key = [car.model, car.color, Boolean(car.braking), Boolean(car.flash)].join(':');
        if (!frames.has(key)) {
            if (frames.size >= 48) { paintVehicle(ctx, car, x, y); return; }
            const index = frames.size;
            const left = (index % columns) * width;
            const top = Math.floor(index / columns) * height;
            frames.set(key, { left, top });
            painter.save();
            painter.translate(left + 52, top + 25);
            painter.scale(2, 2);
            paintVehicle(painter, { ...car, angle: 0 }, 0, 0);
            painter.restore();
        }
        const { left, top } = frames.get(key);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(car.angle);
        ctx.drawImage(atlas, left, top, width, height, -26, -12.5, 74, 25);
        ctx.restore();
    };
}
