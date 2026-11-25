export const CITY = { width: 1040, height: 1240, roadsX: [130, 380, 630], roadsY: [139, 359, 555, 745, 945, 1145],
    oneWay: { x: 130, end: 630, y: 1040, half: 10 } };
export const SERVICES = {
    police: { x: 253, y: 899, icon: '◆', name: 'Полиция', color: '#9ac9ff' },
    clinic: { x: 503, y: 899, icon: '+', name: 'Больница', color: '#b3f0d7' },
    fire: { x: 723, y: 899, icon: '▲', name: 'Пожарная часть', color: '#ffc49d' },
};
export const DUMPSTERS = [
    { x: 209, y: 204 }, { x: 552, y: 108 }, { x: 768, y: 319 },
    { x: 87, y: 516 }, { x: 320, y: 483 }, { x: 549, y: 700 },
    { x: 731, y: 715 }, { x: 92, y: 897 }, { x: 322, y: 895 },
];
export const BUILDINGS = [
    [22, 23, 68, 69, 2, 'coral'], [193, 24, 133, 69, 4, 'blue'], [453, 18, 114, 77, 6, 'cream'], [684, 31, 79, 61, 3, 'coral'],
    [15, 211, 75, 94, 3, 'blue'], [184, 207, 152, 105, 5, 'coral'], [443, 209, 129, 104, 2, 'cream'], [691, 216, 72, 91, 4, 'blue'],
    [24, 426, 72, 76, 2, 'cream'], [200, 432, 120, 43, 1, 'coral'], [448, 418, 125, 88, 7, 'blue'], [691, 423, 71, 69, 3, 'coral'],
    [35, 604, 58, 45, 2, 'cream'], [466, 612, 92, 46, 3, 'coral'], [687, 609, 74, 42, 1, 'cream'],
    [458, 675, 79, 30, 1, 'blue', 'ARMORY'], [684, 665, 78, 35, 1, 'blue', 'PORT LOCKERS'],
    [19, 800, 76, 86, 2, 'cream', 'SHOOTING CLUB'],
    [192, 802, 125, 81, 3, 'blue', 'POLICE', 'police'],
    [435, 804, 134, 79, 4, 'cream', 'CITY HOSPITAL', 'clinic'],
    [685, 803, 76, 80, 2, 'coral', 'FIRE STATION', 'fire'],
    [21, 997, 70, 31, 1, 'coral', 'CAFE'], [185, 990, 145, 40, 2, 'cream', 'MERCADO'],
    [455, 989, 110, 40, 3, 'blue', 'COAST LOFTS'], [689, 988, 74, 43, 1, 'cream', 'BEACH CLUB'],
    [18, 1061, 68, 37, 1, 'blue', 'COAST FUEL'], [180, 1069, 150, 39, 1, 'coral', 'NIGHT MARKET'],
    [451, 1055, 122, 57, 2, 'cream', 'MOTOR CLUB'], [691, 1065, 73, 31, 1, 'blue', 'YACHT WORKS'],
    [185, 1197, 61, 29, 1, 'cream', 'VILLA'], [269, 1197, 55, 28, 1, 'coral', 'VILLA'],
    [449, 1194, 115, 29, 2, 'blue', 'DOCK DEPOT'],
];

const PALETTES = {
    coral: ['#e58e8c', '#f5b6a2', '#a45768', '#613e59'],
    blue: ['#669eae', '#b2dfd9', '#496f88', '#3f4765'],
    cream: ['#eac5a1', '#fff0c9', '#ac7976', '#684e64'],
};

export function shoreline(y) {
    return 866 + 9 * Math.sin(y / 95) + 7 * Math.sin(y / 48);
}

export function box(ctx, color, x, y, width, height, radius = 0) {
    ctx.fillStyle = color;
    if (!radius) {
        ctx.fillRect(x, y, width, height);
        return;
    }
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
}

export function oval(ctx, color, x, y, rx, ry) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
}

function shape(ctx, color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
    ctx.fill();
}

function line(ctx, color, width, points) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.stroke();
}

function gradient(ctx, x, y, x2, y2, colors) {
    const fill = ctx.createLinearGradient(x, y, x2, y2);
    colors.forEach((color, i) => fill.addColorStop(i / (colors.length - 1), color));
    return fill;
}

function label(ctx, value, x, y, size, color, alignment = 'left') {
    ctx.fillStyle = color;
    ctx.font = '800 ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = alignment;
    ctx.fillText(value, x, y);
}

function palm(ctx, x, y, scale = 1, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(rotation);
    oval(ctx, '#26374735', 7, 6, 13, 5);
    line(ctx, '#724b48', 2.3, [[1, 8], [0, 4], [-1, -1]]);
    for (let i = 0; i < 7; i++) {
        ctx.rotate(Math.PI * 2 / 7);
        ctx.fillStyle = ['#245f59', '#3d8268', '#54966e'][i % 3];
        ctx.beginPath();
        ctx.moveTo(-1, 0);
        ctx.quadraticCurveTo(5, -5, 13, -1);
        ctx.quadraticCurveTo(10, -0.5, 9, 5);
        ctx.quadraticCurveTo(6, 1, -1, 0);
        ctx.fill();
        line(ctx, '#a7c78778', 0.55, [[0, 0], [5, -1], [10, 0]]);
    }
    oval(ctx, '#d2a663', 0, 0, 1.8, 1.5);
    ctx.restore();
}

function building(ctx, [x, y, w, h, floors, palette, name, service], index, textures) {
    const [roof, light, wall, dark] = PALETTES[palette];
    const setback = 5 + floors * 2.7;
    const roofHeight = h - setback;
    const edge = y + roofHeight;
    const shadow = 6 + floors * 2.7;
    shape(ctx, '#34334746', [[x, y], [x + w, y], [x + w + shadow, y + shadow * .7],
        [x + w + shadow, y + h + shadow * .7], [x + shadow, y + h + shadow * .7], [x, y + h]]);
    box(ctx, dark, x, y, w, h, 2);
    box(ctx, gradient(ctx, x, edge, x, y + h, [wall, dark]), x + 1, edge - 1, w - 2, setback);
    box(ctx, gradient(ctx, x, y, x + w, edge, [light, roof, wall]), x + 1, y + 1, w - 2, roofHeight, 2);
    const rooftop = gradient(ctx, x + 4, y + 4, x + w, edge, [light, roof, wall]);
    box(ctx, rooftop, x + 5, y + 5, w - 10, roofHeight - 9, 1);
    if (textures?.naturalWidth) {
        const material = service ? 2 : index % 6;
        ctx.save();
        ctx.globalAlpha = .64;
        ctx.drawImage(textures, (material % 3) * 144 + 2, Math.floor(material / 3) * 144 + 2, 140, 140,
            x + 5, y + 5, w - 10, roofHeight - 9);
        ctx.restore();
    }
    for (let row = 9; row < roofHeight - 5; row += 7) {
        line(ctx, '#43354e14', .6, [[x + 6, y + row], [x + w - 6, y + row]]);
    }
    if (index % 4 === 0 && roofHeight > 44) {
        const ridge = y + roofHeight * .44;
        shape(ctx, '#54334a55', [[x + 6, ridge], [x + w - 6, ridge],
            [x + w - 7, edge - 4], [x + 7, edge - 4]]);
        line(ctx, light, 1.2, [[x + 7, ridge], [x + w - 7, ridge]]);
        for (let tile = x + 10; tile < x + w - 7; tile += 4) {
            line(ctx, '#6c4c6055', .65, [[tile, y + 6], [tile, edge - 5]]);
        }
    }
    line(ctx, light, 1.5, [[x + 2, edge - 1], [x + 2, y + 2], [x + w - 2, y + 2]]);
    line(ctx, dark, 1.6, [[x + w - 2, y + 3], [x + w - 2, edge], [x + 3, edge]]);
    for (let stories = 0; stories < floors; stories++) {
        const windowY = edge + 2 + stories * 2.6;
        for (let i = 7; i < w - 5; i += 7) {
            box(ctx, (i + stories * 3 + index) % 5 < 2 ? '#ffdc9c' : '#344158', x + i, windowY, 3.6, 1.55, .4);
        }
        line(ctx, '#fbe6c630', .45, [[x + 2, windowY + 2.2], [x + w - 2, windowY + 2.2]]);
    }
    const units = w > 95 ? 3 : 2;
    for (let i = 0; i < units; i++) {
        const rx = x + 10 + i * 11;
        box(ctx, '#252d4c55', rx + 2, y + 13, 9, 8, 1);
        box(ctx, '#b7b0b5', rx, y + 11, 9, 7, 1);
        box(ctx, '#f7ddd0', rx + 1, y + 12, 7, 1);
        oval(ctx, '#5b647b', rx + 4.5, y + 15, 2.1, 1.8);
        line(ctx, '#d2d1dc', .45, [[rx + 3, y + 15], [rx + 6, y + 15]]);
    }
    if (index === 2 || index === 10) {
        box(ctx, '#47596d', x + w - 31, y + 10, 22, 19, 2);
        ctx.strokeStyle = '#d4edca';
        ctx.lineWidth = .7;
        ctx.strokeRect(x + w - 29, y + 12, 18, 15);
        label(ctx, 'H', x + w - 20, y + 23, 9, '#edf1c8', 'center');
    }
    if (index === 6 || index === 14) {
        box(ctx, '#456b78', x + w - 36, y + 11, 26, 13, 2);
        box(ctx, '#8ee3d6', x + w - 34, y + 13, 22, 9, 1);
        line(ctx, '#d4ffeb', .7, [[x + w - 31, y + 15], [x + w - 25, y + 15]]);
    }
    if (w > 100 && roofHeight > 50) {
        const serviceY = y + roofHeight - 24;
        for (let panel = 0; panel < 3; panel++) {
            const panelX = x + w - 45 + panel * 10;
            box(ctx, '#4c3b5666', panelX + 2, serviceY + 2, 8, 12, 1);
            box(ctx, '#435c79', panelX, serviceY, 8, 12, 1);
            box(ctx, '#88a8b6', panelX + .8, serviceY + .8, 6.4, .7);
            for (let joint = 3; joint <= 9; joint += 3) box(ctx, '#94bccc78', panelX + .7, serviceY + joint, 6.6, .4);
        }
        line(ctx, '#f1cdb077', .9, [[x + 18, y + 22], [x + 18, serviceY + 8], [x + w - 53, serviceY + 8]]);
    }
    if (index === 9) {
        box(ctx, '#593d67', x + w / 2 - 15, y + 11, 30, 11, 1.5);
        box(ctx, '#956695', x + w / 2 - 13, y + 12, 26, 7, 1);
        for (let strip = -9; strip <= 9; strip += 6) box(ctx, '#e6aabd', x + w / 2 + strip, y + 13, .8, 5);
    }
    if (index === 1 || index === 5 || index === 10) {
        const roofX = x + 12;
        const roofY = y + 29;
        const length = w * .35;
        box(ctx, '#5f4d6588', roofX + 3, roofY + 3, length + 2, 13, 2);
        box(ctx, '#cfb5ab', roofX, roofY, length, 13, 2);
        for (let unit = 4; unit < length - 3; unit += 8) {
            box(ctx, '#697d8a', roofX + unit, roofY + 3, 5, 7, .7);
            line(ctx, '#d6eff2', .5, [[roofX + unit + 1, roofY + 4], [roofX + unit + 1, roofY + 8]]);
        }
    }
    const names = {1:'HOTEL SOL',4:'MOTEL',5:'PALM HOUSE',6:'POOLSIDE',9:'ARCADE',10:'MARINA',11:'SURF',14:'TIKI BAR'};
    const sign = name ?? names[index];
    if (sign) {
        const size = service ? 5.6 : 4.45;
        const span = sign.length * size * .38 + 8;
        const marker = service ? SERVICES[service] : null;
        box(ctx, dark, x + w / 2 - span, y + h - 8, span * 2, 7, 1);
        line(ctx, marker?.color ?? (index % 2 ? '#ffc199' : '#7cfff1'), 1.1,
            [[x + w / 2 - span, y + h - 8], [x + w / 2 + span, y + h - 8]]);
        label(ctx, sign, x + w / 2, y + h - 2.4, size, '#fff3db', 'center');
        if (!service) {
            const frontX = x + w * .27;
            const frontY = y + h + 1;
            box(ctx, '#332d4647', frontX + 3, frontY + 2, w * .46, 8, 1);
            for (let stripe = 0; stripe < w * .46 - 4; stripe += 4) {
                box(ctx, stripe % 8 ? '#f1c4a0' : wall, frontX + stripe, frontY - 1, 4, 6, .45);
            }
        }
        if (marker) {
            const bay = x + w / 2;
            box(ctx, '#3a4c65', bay - 14, y + 8, 28, 25, 3);
            label(ctx, marker.icon, bay, y + 26, 19, marker.color, 'center');
            box(ctx, '#4e485e', bay - 13, y + h, 26, 8, 1.2);
            box(ctx, marker.color, bay - 10, y + h + 1, 20, 1);
        }
    }
}

function roads(ctx) {
    const { width, height, roadsX, roadsY } = CITY;
    for (const y of roadsY) {
        box(ctx, '#ab9ba1', 0, y - 41, 808, 82);
        box(ctx, '#d2beb1', 0, y - 39, 808, 78);
    }
    for (const x of roadsX) {
        box(ctx, '#ab9ba1', x - 41, 0, 82, height);
        box(ctx, '#d2beb1', x - 39, 0, 78, height);
    }
    for (const y of roadsY) {
        box(ctx, '#f2d6bb', 0, y - 29, 790, 58);
        box(ctx, gradient(ctx, 0, y - 27, 0, y + 27, ['#4c4b66', '#55536b', '#44445e']), 0, y - 27, 790, 54);
        for (let x = 0; x < 775; x += 20) {
            if (roadsX.some((road) => Math.abs(x - road) < 47)) continue;
            box(ctx, '#e1b37e', x, y - .6, 9, 1.2);
            box(ctx, '#cfc3bc55', x, y - 23, 11, .65);
            box(ctx, '#cfc3bc55', x, y + 23, 11, .65);
        }
    }
    for (const x of roadsX) {
        box(ctx, '#f2d6bb', x - 29, 0, 58, height);
        box(ctx, gradient(ctx, x - 27, 0, x + 27, 0, ['#474760', '#55546e', '#494b65']), x - 27, 0, 54, height);
        for (let y = 0; y < height; y += 20) {
            if (roadsY.some((road) => Math.abs(y - road) < 47)) continue;
            box(ctx, '#e1b37e', x - .6, y, 1.2, 9);
            box(ctx, '#cfc3bc55', x - 23, y, .65, 11);
            box(ctx, '#cfc3bc55', x + 23, y, .65, 11);
        }
        for (const y of roadsY) {
            box(ctx, '#52526c', x - 37, y - 27, 74, 54);
            for (const side of [-1, 1]) {
                for (let n = -21; n <= 21; n += 7) {
                    box(ctx, '#e5d9c8', x + side * 32 - 3.5, y + n, 7, 3);
                    box(ctx, '#e5d9c8', x + n, y + side * 32 - 3.5, 3, 7);
                }
                for (const vertical of [-1, 1]) {
                    const sx = x + side * 42;
                    const sy = y + vertical * 40;
                    oval(ctx, '#8a796c44', sx + 3, sy + 2, 5, 3);
                    line(ctx, '#41405a', 1.5, [[sx, sy + 4], [sx, sy - 5], [sx - 4, sy - 5]]);
                    oval(ctx, '#fff0b8', sx - 4, sy - 5, 1.7, 1.1);
                }
            }
        }
    }
    for (const y of roadsY) {
        for (let x = 3; x < width - 240; x += 10) {
            if (roadsX.some((road) => Math.abs(x - road) < 43)) continue;
            box(ctx, '#b49f9f66', x, y - 39, .55, 10);
            box(ctx, '#b49f9f66', x, y + 29, .55, 10);
        }
    }
    for (let i = 0; i < 170; i++) {
        const centre = roadsY[i % roadsY.length];
        const x = (i * 193) % 778;
        const y = centre + (i * 29 % 38) - 19;
        if (i % 19 === 0) {
            oval(ctx, '#3e3b55', x, y, 4, 3);
            oval(ctx, '#737082', x - .5, y - .5, 3, 2);
            for (let rib = -2; rib <= 2; rib += 1) box(ctx, '#46455d', x + rib, y - 1, .5, 2);
        } else if (i % 7 === 0) box(ctx, '#39364f48', x, y, 7 + i % 9, 2.8, .55);
        else line(ctx, '#24203955', .53, [[x, y], [x + 2.5, y + 1], [x + 4, y - .45], [x + 6, y + .2]]);
    }
    const lane = CITY.oneWay;
    box(ctx, '#e1ba9e', lane.x, lane.y - lane.half - 1, lane.end - lane.x, 2 * lane.half + 2);
    box(ctx, '#4d4c66', lane.x, lane.y - lane.half, lane.end - lane.x, 2 * lane.half);
    for (let x = lane.x + 45; x < lane.end - 30; x += 37) {
        line(ctx, '#f4d7b2', .85, [[x - 4,lane.y],[x + 3,lane.y],[x + 1,lane.y - 2]]);
        line(ctx, '#f4d7b2', .85, [[x + 3,lane.y],[x + 1,lane.y + 2]]);
    }
}

function beach(ctx) {
    const { width, height } = CITY;
    box(ctx, gradient(ctx, 775, 0, width, 0, ['#70d6bc','#317b97','#303f77']), 775, 0, width - 775, height);
    for (let i = 0; i < 185; i++) {
        const y = (i * 113 + 11) % height;
        const x = shoreline(y) + 18 + i * 37 % 152;
        line(ctx, i % 3 ? '#c8f6e73e' : '#b6f8e177', .6, [[x, y], [x + 4 + i % 10, y + 1]]);
    }
    for (const [margin, color] of [[15, '#79d5bf'], [8, '#b4e4c4'], [3, '#fff5d7'], [0, '#dbbb9b'], [-5, '#f4d6aa']]) {
        const points = [[775, 0]];
        for (let y = 0; y <= height; y += 4) points.push([shoreline(y) + margin, y]);
        points.push([775, height]);
        shape(ctx, color, points);
    }
    for (let i = 0; i < 400; i++) {
        const y = i * 131 % height;
        const x = 801 + i * 53 % 62;
        if (x > shoreline(y) - 9) continue;
        box(ctx, i % 3 ? '#bf98736b' : '#fff3c98a', x, y, .65 + i % 2, .55);
    }
    box(ctx, '#765964', 776, 0, 24, height);
    box(ctx, '#c59778', 777, 0, 20, height);
    for (let y = 3; y < height; y += 3.6) {
        line(ctx, y % 5 ? '#9f7668' : '#e3baa0', .45, [[778, y], [796, y]]);
    }
    line(ctx, '#ffe2bd', 1.2, [[777, 0], [777, height]]);
    line(ctx, '#f1c9a5', 1.2, [[798, 0], [798, height]]);
    for (let y = 13; y < height; y += 42) {
        palm(ctx, 801, y, .78, y * .22);
        box(ctx, '#655268', 781, y + 13, 3, 9, .6);
        box(ctx, '#efa889', 781, y + 12, 2, 8, .5);
    }
    for (const [x, y, color] of [[829, 66, '#f3818c'], [846, 154, '#608fac'], [824, 267, '#efad72'],
        [838, 305, '#5faaa1'], [828, 463, '#f09b82'], [849, 570, '#e0a7a3'], [823, 624, '#71aeb5']]) {
        oval(ctx, '#a1796f60', x + 4, y + 3, 8, 5);
        box(ctx, '#faf1d2', x + 6, y + 5, 4, 8, 1);
        box(ctx, color, x + 6.4, y + 8, 3.2, 1);
        for (let wedge = 0; wedge < 8; wedge++) {
            const start = wedge * Math.PI / 4;
            const end = start + Math.PI / 4;
            shape(ctx, wedge % 2 ? color : '#fff0cf', [[x, y], [x + Math.cos(start) * 7, y + Math.sin(start) * 7],
                [x + Math.cos(end) * 7, y + Math.sin(end) * 7]]);
        }
    }
    for (const [x, y, color] of [[837, 102, '#e59b9d'], [831, 203, '#80b6b6'], [848, 337, '#e89782'],
        [827, 533, '#8dc0c2'], [842, 594, '#dc9a91']]) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-.35 + (y % 3) * .3);
        box(ctx, '#9b6e6455', -2, -4, 5, 10, .6);
        box(ctx, color, -2.6, -4.6, 5, 10, .6);
        line(ctx, '#fff1d3', .55, [[-1.8, -2.8], [1.6, -2.8]]);
        line(ctx, '#fff1d3', .55, [[-1.8, 3.7], [1.6, 3.7]]);
        ctx.restore();
    }
    box(ctx, '#a36e62', 812, 391, 13, 12, 2);
    box(ctx, '#f0a566', 813, 390, 12, 8, 1);
    box(ctx, '#ffe3a3', 816, 391, 6, 2);
    label(ctx, 'ПЛЯЖ', 820, 409, 4.7, '#926c64', 'center');
}

function garden(ctx, x, y, w, h) {
    box(ctx, '#bda18e', x, y, w, h, 6);
    box(ctx, '#719374', x + 2, y + 2, w - 4, h - 4, 5);
    box(ctx, '#92a77e', x + 4, y + 4, w - 8, h - 8, 4);
    line(ctx, '#e1ccac', 5, [[x + 5, y + h / 2], [x + w - 5, y + h / 2]]);
    for (let tx = x + 11; tx < x + w - 6; tx += 20) {
        palm(ctx, tx, y + 7, .62, tx);
        if (h > 24) palm(ctx, tx + 5, y + h - 6, .56, -tx);
    }
}

function plaza(ctx, x, y, w, h, kind) {
    box(ctx, '#48415657', x + 3, y + 4, w, h, 5);
    box(ctx, '#d3ae9d', x, y, w, h, 5);
    box(ctx, kind === 'court' ? '#467c82' : '#bda7a6', x + 3, y + 3, w - 6, h - 6, 4);
    if (kind === 'court') {
        ctx.strokeStyle = '#e8ded0';
        ctx.lineWidth = .85;
        ctx.strokeRect(x + 8, y + 6, w - 16, h - 12);
        line(ctx, '#e8ded0', .9, [[x + w / 2, y + 6], [x + w / 2, y + h - 6]]);
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 7, 0, Math.PI * 2);
        ctx.stroke();
        return;
    }
    for (let tx = x + 5; tx < x + w - 3; tx += 6) line(ctx, '#93778466', .5, [[tx, y + 3], [tx, y + h - 3]]);
    for (let ty = y + 4; ty < y + h - 3; ty += 6) line(ctx, '#f0cfb775', .5, [[x + 3, ty], [x + w - 4, ty]]);
    const cx = x + w * .5;
    const cy = y + h * .52;
    oval(ctx, '#76607966', cx + 2, cy + 2, 17, 11);
    oval(ctx, '#e1b5a0', cx, cy, 17, 11);
    oval(ctx, '#558c9e', cx, cy, 14, 8.6);
    oval(ctx, '#90c6c7', cx - 2, cy - 1, 8, 3.7);
    oval(ctx, '#f9d5b6', cx, cy, 3.2, 2.3);
}

export function paintDumpster(ctx, x, y) {
    box(ctx, '#362c4860', x - 9, y - 2, 22, 9, 2.5);
    box(ctx, '#343e4e', x - 9, y - 4.5, 18, 10, 2);
    box(ctx, '#517a70', x - 8.5, y - 5, 17, 7.8, 1.5);
    box(ctx, '#7f9b84', x - 7, y - 4.7, 14, 2, .45);
    for (const rib of [-5, -1.5, 2, 5.5]) box(ctx, '#3c645d', x + rib, y - 3.5, .75, 4.7, .3);
    box(ctx, '#e5c499', x + 4, y + 1, 2, 1, .35);
    oval(ctx, '#3b434f', x + 11, y + 3, 3.1, 2.2);
}

export function paintCity(ctx, area, textures) {
    const { width, height } = CITY;
    const visible = (x, y, w, h) => !area || (x <= area.x + area.size && y <= area.y + area.size
        && x + w >= area.x && y + h >= area.y);
    box(ctx, gradient(ctx, 70, 0, width * .67, height, ['#d4a797','#b795a4','#9a999d','#d4a28c']), 0, 0, width, height);
    roads(ctx);
    for (let i = 0; i < 1800; i++) {
        const x = i * 179 % 775;
        const y = (i * 277 + Math.floor(i / 7) * 11) % height;
        if (!visible(x, y, 4, 1)) continue;
        box(ctx, i % 3 ? '#ffd8be16' : '#38334c18', x, y, 1 + i % 3, .5);
    }
    garden(ctx, 183, 603, 151, 56);
    garden(ctx, 200, 485, 120, 28);
    garden(ctx, 688, 498, 71, 15);
    garden(ctx, 461, 101, 96, 9);
    garden(ctx, 194, 782, 129, 15);
    garden(ctx, 450, 897, 35, 13);
    garden(ctx, 532, 897, 36, 13);
    garden(ctx, 692, 892, 15, 22);
    plaza(ctx, 224, 604, 93, 43, 'court');
    plaza(ctx, 188, 474, 126, 32, 'fountain');
    for (const [x, y] of [[546,163],[581,163],[267,382],[310,382]]) {
        ctx.strokeStyle = '#ead1af99';
        ctx.lineWidth = .75;
        ctx.strokeRect(x - 16, y - 7, 32, 14);
    }
    for (const [x, y, color] of [[305, 330, '#c389a2'], [322, 330, '#9abeb4'], [438, 329, '#d7ab7d']]) {
        box(ctx, '#5d435d66', x + 3, y + 2, 11, 6, 1.3);
        box(ctx, color, x, y, 11, 5, 1);
        line(ctx, '#f3d4bd', .6, [[x + 1, y + 1], [x + 9, y + 1]]);
        for (const offset of [1.8, 8.5]) box(ctx, '#555268', x + offset, y + 4, 1.1, 2.3, .25);
    }
    plaza(ctx, 694, 112, 70, 18, 'fountain');
    plaza(ctx, 190, 1043, 132, 22, 'fountain');
    garden(ctx, 190, 1177, 128, 15);
    for (const [x, y] of [[228, 528], [481, 964], [696, 1120]]) {
        box(ctx, '#51495c', x + 2, y + 3, 31, 9, 1);
        box(ctx, '#416977', x, y, 31, 8, 1);
        box(ctx, '#b6d3cc', x + 2, y + 1, 26, 2, .5);
        box(ctx, '#e2ab87', x + 4, y + 5, 18, 1.5, .45);
    }
    for (const [x, y, width] of [[25, 683, 65], [188, 683, 141], [181, 902, 54], [279, 902, 50]]) {
        box(ctx, '#6d6878', x, y, width, 23, 2);
        for (let slot = 4; slot < width - 5; slot += 11) {
            line(ctx, '#d9c6ab', .7, [[x + slot, y + 3], [x + slot, y + 16], [x + slot + 6, y + 16]]);
        }
    }
    for (const { x, y, color } of Object.values(SERVICES)) {
        box(ctx, '#b39ca0', x - 27, y - 16, 54, 28, 2.5);
        box(ctx, '#ddc3ad', x - 25, y - 14, 50, 25, 2.5);
        for (let tile = -20; tile <= 20; tile += 8) line(ctx, '#af9a9d97', .55, [[x + tile, y - 13], [x + tile, y + 9]]);
        line(ctx, color, 1.4, [[x - 16, y + 9], [x + 16, y + 9]]);
        for (const side of [-1, 1]) {
            oval(ctx, '#7a6d7540', x + side * 19 + 2, y + 9, 5, 2.7);
            box(ctx, '#765f68', x + side * 19 - 2, y + 5, 4, 4, .7);
            oval(ctx, '#648e74', x + side * 19, y + 5, 2.7, 2.5);
        }
    }
    for (const y of [757, 957]) {
        for (let x = 20; x < 758; x += 21) {
            if (CITY.roadsX.some((road) => Math.abs(x - road) < 46)) continue;
            line(ctx, '#dcd4bf52', 1, [[x, y + 8], [x + 8, y + 8]]);
        }
    }
    if (visible(775, 0, width - 775, height)) beach(ctx);
    BUILDINGS.forEach((item, index) => {
        if (visible(item[0] - 2, item[1] - 2, item[2] + 34, item[3] + 26)) building(ctx, item, index, textures);
    });
    const dusk = ctx.createLinearGradient(0, 0, width, height);
    dusk.addColorStop(0, '#3c2c6457');
    dusk.addColorStop(.48, '#42305d36');
    dusk.addColorStop(1, '#ff956924');
    box(ctx, dusk, 0, 0, width, height);
    for (const x of CITY.roadsX) {
        for (const y of CITY.roadsY) {
            for (const [dx, dy] of [[-44, -45], [39, 35]]) {
                const px = x + dx;
                const py = y + dy;
                const radius = 19;
                if (!visible(px - radius, py - radius, 2 * radius, 2 * radius)) continue;
                const halo = ctx.createRadialGradient(px, py, 1, px, py, radius);
                halo.addColorStop(0, '#ffe4a788');
                halo.addColorStop(.47, '#ffc0923d');
                halo.addColorStop(1, '#ffc09200');
                oval(ctx, halo, px, py, radius, radius);
                oval(ctx, '#fff1cb', px, py, 1.7, .95);
            }
        }
    }
    box(ctx, '#8e8798', CITY.oneWay.x, CITY.oneWay.y - CITY.oneWay.half, CITY.oneWay.end - CITY.oneWay.x, 2 * CITY.oneWay.half);
    for (const index of [1, 5, 6, 9, 10, 11, 14, 21, 24]) {
        const [x, y, w, h] = BUILDINGS[index];
        const cx = x + w / 2;
        const cy = y + h + 2;
        if (!visible(cx - 23, cy - 13, 46, 26)) continue;
        const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 23);
        glow.addColorStop(0, index % 2 ? '#f48fc271' : '#7ccddc77');
        glow.addColorStop(1, '#e6a8c500');
        oval(ctx, glow, cx, cy, 23, 13);
    }
    label(ctx, 'ЮЖНЫЙ СКВЕР', 252, 639, 6, '#315c54', 'center');
    label(ctx, 'БУЛЬВАР', 335, 348, 5, '#e5d7d1', 'right');
    label(ctx, 'ПРИМОРСКИЙ', 328, 733, 6, '#f3e2cf', 'right');
    label(ctx, 'КВАРТАЛ СЛУЖБ', 598, 933, 6, '#f3e2cf', 'right');
}

export function paintSurf(ctx, view, time) {
    if (view.x + 448 < 839) return;
    const first = Math.floor(view.y / 23) * 23;
    ctx.save();
    for (let y = first; y < view.y + 260; y += 23) {
        const phase = time * 1.9 + y * .135;
        const flow = Math.sin(phase);
        const x = shoreline(y) + 8 + 4.5 * flow - view.x;
        const y0 = y - view.y;
        ctx.globalAlpha = .2 + (Math.cos(phase) + 1) * .2;
        line(ctx, '#fff3dd', 1.05, [[x + 2, y0], [x, y0 + 5], [x - .55, y0 + 11], [x + .75, y0 + 16]]);
    }
    ctx.globalAlpha = 1;
    for (let y = 82; y < CITY.height; y += 85) {
        if (y < view.y - 9 || y > view.y + 260) continue;
        const x = shoreline(y) + 28 - view.x;
        const float = Math.sin(time * 2.3 + y) * 1.4;
        const screenY = y - view.y + float;
        oval(ctx, '#dbfcef60', x, screenY + 1, 3.2, 2);
        oval(ctx, '#da7484', x, screenY, 1.4, 1.65);
        oval(ctx, '#ffd5a8', x - .3, screenY - .65, .85, .64);
    }
    ctx.restore();
}

export function paintMap(ctx, width, height) {
    const sx = width / CITY.width;
    const sy = height / CITY.height;
    ctx.save();
    ctx.scale(sx, sy);
    box(ctx, '#183e55', 0, 0, CITY.width, CITY.height);
    const land = [[0, 0]];
    for (let y = 0; y <= CITY.height; y += 10) land.push([shoreline(y), y]);
    land.push([0, CITY.height]);
    shape(ctx, '#3d4058', land);
    box(ctx, '#897a71', 777, 0, 24, CITY.height);
    for (const y of CITY.roadsY) {
        box(ctx, '#7d819a', 0, y - 25, 777, 50);
        box(ctx, '#9f9db1', 0, y - 1.5, 777, 3);
    }
    for (const x of CITY.roadsX) {
        box(ctx, '#7d819a', x - 25, 0, 50, CITY.height);
        box(ctx, '#9f9db1', x - 1.5, 0, 3, CITY.height);
    }
    for (const [x, y, w, h] of BUILDINGS) box(ctx, '#20283d', x, y, w, h, 2);
    box(ctx, '#407569', 183, 603, 151, 56);
    box(ctx, '#407569', 200, 485, 120, 28);
    ctx.restore();
}
