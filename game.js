import { driveBody, collideBodies } from './vehicle-physics.js';
import { mountTouch } from './touch.js';
import { WEAPONS, carFootprint, vehicleStats, damageStage, signalAt, createAudio } from './gameplay-kit.js';
import { DUMPSTERS, BUILDINGS, CITY, SERVICES, box, oval, paintCity, paintDumpster, paintMap, paintSurf, shoreline } from './city-art.js';
import { HEROES, createHeroRenderer, createPedestrianAtlas, createVehicleAtlas, paintActor, paintPortrait } from './sprite-art.js';
import { createNavigation, readCustody, setCustody } from './city-systems.js';

export function mountGame(dialog) {
    const controller = new AbortController();
    const audio = createAudio();
    const paintVehicle = createVehicleAtlas();
    const paintPedestrian = createPedestrianAtlas();
    const paintHero = createHeroRenderer();
    const { signal } = controller;
    const canvas = dialog.querySelector('.nb-city');
    const ctx = canvas.getContext('2d');
    const map = dialog.querySelector('.nb-map');
    const mini = map.getContext('2d');
    const selection = dialog.querySelector('.nb-selection');
    const hud = dialog.querySelector('.nb-hud');
    const switchHero = dialog.querySelector('.nb-switch');
    const mapToggle = dialog.querySelector('.nb-map-toggle');
    const healthBar = dialog.querySelector('.nb-health');
    const wantedHud = dialog.querySelector('.nb-wanted');
    const jail = dialog.querySelector('.nb-jail');
    const jailClock = jail.querySelector('strong');
    const VIEW_WIDTH = 448;
    const VIEW_HEIGHT = 252;
    const { width: WIDTH, height: HEIGHT, roadsX, roadsY } = CITY;
    const buildingSectors = new Map();
    const sector = value => Math.floor(value / 96);
    for (const building of BUILDINGS) {
        const [left, top, width, height] = building;
        for (let y = sector(top - 24); y <= sector(top + height + 24); y++) {
            for (let x = sector(left - 24); x <= sector(left + width + 24); x++) {
                const key = x + y * 32;
                if (!buildingSectors.has(key)) buildingSectors.set(key, []);
                buildingSectors.get(key).push(building);
            }
        }
    }
    const tiles = new Map();
    const tileSize = 256;
    const roofTextures = new Image();
    roofTextures.decoding = 'async';
    roofTextures.src = new URL('./assets/roofs.webp', import.meta.url);
    let low = window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    let quality = 'auto';
    let blood = true;
    let frameCost = 0;
    let slowFrames = 0;
    const options = dialog.querySelector('.nb-options');
    const arsenal = dialog.querySelector('.nb-arsenal');
    const weaponToggle = dialog.querySelector('.nb-weapon-toggle');
    const moneyHud = dialog.querySelector('.nb-money');
    const armorBar = dialog.querySelector('.nb-armor');
    let armor = 0;
    let money = 0;
    let delivery = false;
    let taxiFare = false;
    let vehicleTransition;
    let interior;
    let downfall;
    let pendingCustody;
    let trial;
    const trialGates = [{ x: 630, y: 945 }, { x: 380, y: 945 }, { x: 380, y: 1145 }, { x: 590, y: 1145 }];
    const doors = [
        { x: 510, y: 707, title: 'ОРУЖЕЙНАЯ', kind: 'shop' },
        { x: 503, y: 888, title: 'ПРИЁМНОЕ ОТДЕЛЕНИЕ', kind: 'clinic' },
        { x: 255, y: 1063, title: 'ЮЖНЫЙ РЫНОК', kind: 'market' },
    ];
    let roadblock;
    let eventIndex = 0;
    let neighborhoodEvent;
    const garagePad = { x: 595, y: 1125 };
    const paintOptions = [25, 75, 150, 225, 300];
    let nextIncident = 32;
    let sirenBeat = 0;
    let wheelOpen = false;
    let magazine = new Map();
    let reserves = new Map();
    let reloadTime = 0;
    let effects = [];
    const pool = [];
    let muzzle = 0;
    let footBeat = 0;
    let sectorTime = 0;
    let atlasDrag;
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    function setResolution() {
        const scale = low ? 1.5 : quality === 'high' ? 3 : 2;
        canvas.width = VIEW_WIDTH * scale;
        canvas.height = VIEW_HEIGHT * scale;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
    }
    setResolution();
    const mapBase = document.createElement('canvas');
    mapBase.width = map.width;
    mapBase.height = map.height;
    const atlas = dialog.querySelector('.nb-atlas');
    const fullMap = atlas.querySelector('canvas');
    const fullMapContext = fullMap.getContext('2d');
    const atlasBase = document.createElement('canvas');
    atlasBase.width = fullMap.width;
    atlasBase.height = fullMap.height;
    let mapOpen = false;
    const keys = new Set();
    const touch = mountTouch(dialog, {
        fire: () => attack(), punch: () => punch(), interact: () => interact(),
        alternate: () => interact(true),
        weapon: () => toggleWeapons(!wheelOpen), map: () => toggleMap(!mapOpen), reload: () => reload(),
    }, signal);
    dialog.addEventListener('pointerdown', () => audio.unlock(), { signal });
    dialog.addEventListener('keydown', () => audio.unlock(), { signal });
    dialog.querySelector('.nb-options-toggle').onclick = () => { options.hidden = !options.hidden; };
    dialog.querySelector('.nb-quality').onchange = event => {
        quality = event.target.value;
        low = quality === 'low' || quality === 'auto' && window.matchMedia('(pointer: coarse)').matches;
        tiles.clear();
        setResolution();
        if (running) render();
        else paintTiles({ x: WIDTH - VIEW_WIDTH, y: 700 });
    };
    dialog.querySelector('.nb-blood').onchange = event => {
        blood = event.target.checked;
        if (!blood) stains = [];
    };
    dialog.querySelector('.nb-volume').oninput = event => audio.volume(Number(event.target.value) / 100);
    const moveKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
    const status = dialog.querySelector('.nb-status');
    const prompt = dialog.querySelector('.nb-prompt');
    let wanted = 0;
    let heat = 0;
    let cruiser;
    let officers = [];
    let contact = 0;
    let casePosition;
    const holdTime = 4.8;
    let footSpeed = 0;
    let lawClock = 0;
    let evidenceScore = 0;
    let pendingReport;
    const reportTimes = new Map();
    const restraint = dialog.querySelector('.nb-restraint');
    let cell;
    let stains = [];
    let knife = false;
    let equipped = 1;
    let custody;
    let notice = '';
    let noticeTime = 0;
    let health = 100;
    let immunity = 0;
    const inWater = (x, y) => x >= shoreline(y) + 1;
    const legalFoot = (x, y) => blocked(x, y, 7) || inWater(x, y);
    const footRoute = createNavigation(WIDTH, HEIGHT, legalFoot);
    const roadRoute = createNavigation(WIDTH, HEIGHT, (x, y) => blocked(x, y, 15)
        || inWater(x, y) || (!roadsX.some((road) => Math.abs(x - road) <= 9)
            && !roadsY.some((road) => Math.abs(y - road) <= 9)));
    let pickups = [];
    let cars = [];
    let ride;
    let ammo = 0;
    let player;
    let pedestrians = [];
    let shots = [];
    let hits = 0;
    let cooldown = 0;
    let pointer;
    let running = false;
    let frame = 0;
    let lastTime;
    let elapsed = 0;

    function blocked(x, y, radius = 0) {
        return x < radius || x >= WIDTH - radius || y < radius || y >= HEIGHT - radius
            || Boolean(buildingSectors.get(sector(x) + sector(y) * 32)?.some(([left, top, width, height]) =>
                x + radius > left && x - radius < left + width
                && y + radius > top && y - radius < top + height));
    }

    function createPedestrians() {
        const blocks = [];
        for (let row = 0; row < roadsY.length - 1; row++) {
            for (let column = 0; column < roadsX.length; column++) {
                const left = roadsX[column] + 34;
                const right = (roadsX[column + 1] ?? 820) - 34;
                const top = roadsY[row] + 34;
                const bottom = roadsY[row + 1] - 34;
                blocks.push([[left, top], [right, top], [right, bottom], [left, bottom]]);
            }
        }
        const routes = [
            ...blocks, ...blocks.slice(0, 6),
            [[346, 173], [414, 173], [596, 173], [596, 325], [414, 325], [346, 325]],
            [[664, 393], [786, 393], [786, 588], [664, 588]],
            [[346, 521], [414, 521], [596, 521], [596, 589], [414, 589], [346, 589]],
            [[786, 83], [786, 205], [811, 205], [811, 83]],
            [[219, 911], [347, 911], [347, 979], [219, 979]],
            [[414, 911], [594, 911], [594, 977], [414, 977]],
            [[664, 911], [786, 911], [786, 975], [664, 975]],
        ];
        return routes.map((route, i) => {
            const direction = i % 3 ? 1 : -1;
            const start = i % route.length;
            const waypoint = (start + direction + route.length) % route.length;
            const [x, y] = route[start];
            const [nextX, nextY] = route[waypoint];
            const offset = .24 + (i % 5) * .13;
            return {
                x: x + (nextX - x) * offset, y: y + (nextY - y) * offset, route, waypoint, direction,
                angle: Math.atan2(nextY - y, nextX - x), speed: 25 + (i % 5) * 4,
                down: 0, panic: 0, stride: 0, gait: 1.3, grit: 2 + i % 2,
                look: i % 6,
                job: i === routes.length - 3 ? 'guard' : i === routes.length - 2 ? 'medic'
                    : i === routes.length - 1 ? 'rescue' : ['walker', 'jogger', 'visitor'][i % 3],
                shirt: ['#e9af79', '#ae7bad', '#73bbcc', '#e9928d', '#d9bc7d'][i % 5],
                hair: ['#392b45', '#654655', '#302535'][i % 3],
                skin: ['#c78c70', '#9c6055', '#e5a47e'][i % 3],
                pants: ['#555766', '#46536c', '#49405e'][i % 3],
            };
        });
    }

    function createCars() {
        const loop = [[392, 151], [582, 151], [642, 151], [642, 340], [392, 340]];
        const west = [[368, 373], [118, 373], [118, 543], [368, 543]];
        const south = [[642, 757], [392, 757], [392, 957], [642, 957]];
        return [
            { x: 405, y: 372, angle: 0, color: '#dd668c', model: 'coupe' },
            { x: 146, y: 251, angle: Math.PI / 2, color: '#58bfae', model: 'compact' },
            { x: 713, y: 570, angle: Math.PI, color: '#dea56c', model: 'wagon' },
            { x: 575, y: 151, angle: 0, color: '#688fce', model: 'wagon', route: loop, waypoint: 1, parkingIndex: 1 },
            { x: 368, y: 505, angle: -Math.PI / 2, color: '#aa89ca', model: 'compact', route: west, waypoint: 0 },
            { x: 602, y: 757, angle: Math.PI, color: '#d08a62', model: 'wagon', route: south, waypoint: 1 },
            { x: 549, y: 920, angle: 0, color: '#ca6578', model: 'van', service: true, lightbar: true },
            { x: 736, y: 893, angle: Math.PI / 2, color: '#d76260', model: 'van', service: true, lightbar: true },
            { x: 211, y: 574, angle: 0, color: '#e8b06a', model: 'taxi' },
            { x: 229, y: 689, angle: Math.PI / 2, color: '#8ab6b0', model: 'pickup' },
            { x: 286, y: 690, angle: Math.PI / 2, color: '#827acd', model: 'super' },
            { x: 538, y: 762, angle: 0, color: '#bd717d', model: 'suv' },
            { x: 766, y: 667, angle: Math.PI / 2, color: '#e4c2a0', model: 'truck' },
            { x: 118, y: 597, angle: Math.PI / 2, color: '#c6637d', model: 'bike' },
            { x: 159, y: 946, angle: 0, color: '#9eb0a1', model: 'sedan' },
            { x: 175, y: 1157, angle: 0, color: '#c4a69a', model: 'truck',
                route: [[642, 1157], [642, 1128], [144, 1128], [144, 1157]], waypoint: 0 },
            { x: 389, y: 1040, angle: Math.PI / 2, color: '#91aeca', model: 'police', service: true,
                route: [[389, 1154], [139, 1154], [139, 956], [389, 956]], waypoint: 0 },
            { x: 217, y: 1040, angle: 0, color: '#b198aa', model: 'compact',
                route: [[635,1040],[635,953],[141,953],[141,1040]], waypoint: 0 },
        ].map((car, index) => ({ ...car, fuel: 76 + index % 5 * 5, hp: vehicleStats(car.model)[6] }));
    }

    function distance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function carBlocked(x, y, own) {
        const size = own ? carFootprint(own) : 15;
        return blocked(x, y, size - 2) || x >= shoreline(y) - size * .6
            || (cruiser && cruiser !== own && !cruiser.delay && Math.hypot(x - cruiser.x, y - cruiser.y) < 27)
            || cars.some((car) => car !== own && Math.hypot(x - car.x, y - car.y) < (size + carFootprint(car)) * .88);
    }

    function walkBlocked(x, y, ignoredCar) {
        return blocked(x, y, 6)
            || (cruiser && !cruiser.delay && Math.hypot(x - cruiser.x, y - cruiser.y) < 15)
            || cars.some((car) => car !== ignoredCar && Math.hypot(x - car.x, y - car.y) < 15);
    }

    function findDumpster() {
        return pickups.find((site) => distance(site, player) < 23 && clearSight(player, site));
    }

    function nearbyPerson() {
        return pedestrians.find(npc => !npc.anger && distance(player, npc) < 19 && clearSight(player, npc));
    }

    function resetSearch() {
        const sites = DUMPSTERS.map((site) => ({ ...site, checked: false, item: null }));
        const shuffled = sites.slice();
        for (let last = shuffled.length - 1; last > 0; last--) {
            const index = Math.floor(Math.random() * (last + 1));
            [shuffled[last], shuffled[index]] = [shuffled[index], shuffled[last]];
        }
        shuffled[0].item = 'knife';
        shuffled[1].item = 'pistol';
        shuffled[2].item = 'ammo';
        shuffled.slice(3, 6).forEach((site, index) => { site.item = index + 4 + Math.floor(Math.random() * 2) * 3; });
        return sites;
    }

    function searchDumpster(site) {
        if (site.checked) {
            showNotice('Контейнер уже обыскан', 1.7);
            return;
        }
        site.checked = true;
        if (site.item === 'knife') {
            knife = true;
            equipped = 2;
            showNotice('В контейнере найден нож');
        } else if (site.item === 'pistol') {
            grantWeapon(3);
            showNotice('В контейнере найден пистолет · 8 патронов');
        } else if (site.item === 'ammo') {
            reserves.set(3, (reserves.get(3) ?? 0) + 5);
            showNotice('В контейнере найдено 5 патронов');
        } else if (Number.isInteger(site.item)) {
            grantWeapon(site.item);
            showNotice('Найдено: ' + WEAPONS[site.item].name);
        } else showNotice('В контейнере пусто', 1.7);
        audio.tone('interact');
    }

    function useInterior() {
        if (interior.y > 172 && Math.abs(interior.x - 224) < 35) {
            interior = undefined;
            cameraSeeded = false;
            return;
        }
        if (interior.y > 119) { showNotice('Подойди к стойке обслуживания', 2); return; }
        const kind = interior.door.kind;
        if (kind === 'clinic') {
            health = 100;
            showNotice('Медик восстановил здоровье', 2.5);
        } else if (kind === 'market') {
            if (delivery) { money += 240; delivery = false; showNotice('Заказ доставлен · +$240'); }
            else if (money >= 45) { money -= 45; health = Math.min(100, health + 30); showNotice('Аптечка использована'); }
            else showNotice('Аптечка · $45');
        } else if (WEAPONS[equipped] && (reserves.get(equipped) ?? 0) < WEAPONS[equipped].capacity && money >= 45) {
            money -= 45;
            reserves.set(equipped, (reserves.get(equipped) ?? 0) + WEAPONS[equipped].capacity);
            showNotice('Куплен запас патронов');
        } else {
            const slot = WEAPONS.findIndex((weapon, slot) => slot >= 3 && weapon && !magazine.has(slot));
            if (slot < 0 || money < 180) showNotice(slot < 0 ? 'Ассортимент разобран' : 'Оружие · $180');
            else { money -= 180; grantWeapon(slot); showNotice('Куплено: ' + WEAPONS[slot].name); }
        }
        audio.tone('interact');
    }

    function interact(force = false) {
        if (custody || downfall || player.swimming) return;
        if (interior) { useInterior(); return; }
        if (ride) {
            if (!trial && distance(player, { x: 590, y: 1145 }) < 24) {
                trial = { gate: 0, until: elapsed + 32, car: ride };
                showNotice('Испытание · пройди 4 контрольные точки', 3);
                return;
            }
            if (distance(player, { x: 595, y: 1125 }) < 28 && !ride.exploded) {
                if (force) {
                    if (money < 35) showNotice('Покраска · $35');
                    else {
                        money -= 35;
                        ride.paintIndex = ((ride.paintIndex ?? -1) + 1) % paintOptions.length;
                        ride.paintHue = paintOptions[ride.paintIndex];
                        ride.paintStripe = ['#e7b795','#9bd9b7','#9ab8f3','#cfafe1','#ed96a9'][ride.paintIndex];
                        showNotice('Motor Club · кузов перекрашен');
                    }
                    return;
                }
                if (ride.tuned) showNotice('Настройка уже установлена · Shift+E для покраски');
                else if (money < 125) showNotice('Motor Club · подвеска и мотор $125');
                else {
                    money -= 125;
                    ride.tuned = true;
                    ride.color = '#8f97d5';
                    showNotice('Настройка установлена · выше тяга и сцепление');
                }
                return;
            }
            if (ride.model === 'taxi' && !taxiFare && distance(player, { x: 242, y: 555 }) < 32) {
                taxiFare = true;
                showNotice('Пассажир сел · отвези к рынку');
                return;
            }
            if (ride.model === 'taxi' && taxiFare && distance(player, { x: 256, y: 1047 }) < 35) {
                taxiFare = false;
                money += 130;
                showNotice('Пассажир на месте · +$130');
                return;
            }
            if (!ride.exploded && distance(player, { x: 65, y: 1108 }) < 33) {
                if (ride.fuel < 88) {
                    const cost = Math.max(8, Math.ceil((100 - ride.fuel) * .68));
                    if (money < cost) showNotice('Заправка · $' + cost);
                    else { money -= cost; ride.fuel = 100; showNotice('Бак заправлен · −$' + cost); }
                    return;
                }
                if (money < 65) showNotice('Ремонт на заправке · $65');
                else if (ride.hp < vehicleStats(ride.model)[6]) {
                    money -= 65;
                    ride.hp = vehicleStats(ride.model)[6];
                    ride.burn = undefined;
                    showNotice('Заправка · машина отремонтирована');
                } else showNotice('Машина исправна');
                return;
            }
            for (const offset of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {
                const angle = ride.angle + offset;
                const x = ride.x + Math.cos(angle) * 29;
                const y = ride.y + Math.sin(angle) * 29;
                if (walkBlocked(x, y) || inWater(x, y)) continue;
                Object.assign(player, { x, y, angle });
                vehicleTransition = { car: ride, x, y, entering: false, until: elapsed + .32 };
                ride.speed = 0;
                ride.braking = false;
                ride = undefined;
                return;
            }
            return;
        }
        const bin = findDumpster();
        if (bin) {
            searchDumpster(bin);
            return;
        }
        const door = doors.find(door => distance(door, player) < 12);
        if (door) {
            interior = { door, x: 224, y: 181, angle: -Math.PI / 2, stride: 0, gait: 0 };
            audio.tone('interact');
            return;
        }
        if (distance(player, { x: 499, y: 714 }) < 23) {
            if (WEAPONS[equipped] && magazine.has(equipped) && (reserves.get(equipped) ?? 0) < WEAPONS[equipped].capacity) {
                if (money < 45) showNotice('Запас патронов · $45');
                else {
                    money -= 45;
                    reserves.set(equipped, (reserves.get(equipped) ?? 0) + WEAPONS[equipped].capacity);
                    showNotice('Куплен запас патронов');
                }
                return;
            }
            const next = WEAPONS.findIndex((weapon, slot) => slot > 3 && weapon && !magazine.has(slot));
            if (money < 180 || next < 0) showNotice(next < 0 ? 'Ассортимент разобран' : 'Снаряжение · $180');
            else {
                money -= 180;
                grantWeapon(next);
                showNotice('Куплено: ' + WEAPONS[next].name);
            }
            return;
        }
        if (distance(player, { x: 275, y: 657 }) < 23) {
            if (money < 90) showNotice('Бронежилет · $90');
            else { money -= 90; armor = 100; showNotice('Бронежилет получен'); }
            return;
        }
        if (distance(player, { x: 707, y: 718 }) < 23) {
            delivery = true;
            showNotice('Заказ из порта · доставь к рынку');
            return;
        }
        if (distance(player, { x: 256, y: 1050 }) < 23 && delivery) {
            delivery = false;
            money += 240;
            audio.tone('interact');
            showNotice('Заказ доставлен · +$240');
            return;
        }
        if (force && distance(player, garagePad) < 28) {
            const stored = cars.find(car => car.taken && !car.exploded && !car.service && distance(car, garagePad) > 100);
            if (!stored || money < 50 || cars.some(car => distance(car, garagePad) < 38)) {
                showNotice('Нужна свободная площадка и исправная машина · $50');
            } else {
                money -= 50;
                Object.assign(stored, { ...garagePad, angle: 0, vx: 0, vy: 0, speed: 0, spin: 0 });
                stored.route = undefined;
                showNotice('Motor Club · машина доставлена');
            }
            return;
        }
        const wreck = cars.find(car => car.exploded && distance(player, car) < 31);
        if (wreck) {
            if (money < 85) showNotice('Эвакуатор и ремонт · $85');
            else if (cars.some(car => car !== wreck && distance(car, { x: 595, y: 1125 }) < 36)) {
                showNotice('Место у мастерской занято');
            } else {
                money -= 85;
                Object.assign(wreck, { x: 595, y: 1125, angle: 0, exploded: false, burn: undefined,
                    hp: vehicleStats(wreck.model)[6], vx: 0, vy: 0, spin: 0, front: 0, rear: 0, side: 0, state: 'parked' });
                showNotice('Машина восстановлена · Motor Club');
            }
            return;
        }
        const nearest = cars.reduce((best, car) =>
            !car.service && !car.exploded && distance(player, car) < (best ? distance(player, best) : 31) ? car : best, undefined);
        if (!nearest) {
            const npc = nearbyPerson();
            if (!npc) return;
            if (force && !npc.down && !npc.rise) {
                if (npc.job === 'guard' || npc.job === 'officer') {
                    npc.home ??= { x: npc.x, y: npc.y };
                    npc.anger = 5;
                    report(1, 'melee');
                    showNotice('Прохожий оказывает сопротивление');
                } else {
                    const armed = equipped > 1;
                    const already = npc.robbed;
                    frighten(npc, player, 6);
                    npc.phone = 2;
                    if (armed && !already) {
                        npc.robbed = true;
                        money += 18;
                        report(1, 'melee');
                        showNotice('Прохожий бросил кошелёк · +$18');
                    } else {
                        const angle = Math.atan2(npc.y - player.y, npc.x - player.x);
                        const push = { x: npc.x + Math.cos(angle) * 5, y: npc.y + Math.sin(angle) * 5 };
                        if (!walkBlocked(push.x, push.y)) {
                            npc.home ??= { x: npc.x, y: npc.y };
                            Object.assign(npc, push);
                        }
                        npc.flinch = .24;
                    }
                }
            } else if (npc.fatal) {
                showNotice('Нужна помощь медиков');
            } else if (npc.down) {
                npc.down = Math.min(npc.down, .45);
                showNotice('Ты помог прохожему подняться');
            } else if (!npc.panic) {
                npc.greeting = 2;
                npc.pause = 2;
                npc.gait = 0;
                npc.angle = Math.atan2(player.y - npc.y, player.x - npc.x);
                showNotice(npc.job === 'medic' ? 'Медик: нужна помощь? Больница открыта.'
                    : npc.job === 'visitor' ? 'Прохожий: новый заказ можно взять у порта.' : 'Прохожий здоровается');
            }
            return;
        }
        if (nearest.route) {
            const side = nearest.angle + Math.PI / 2;
            for (const sign of [1, -1]) {
                const x = nearest.x + Math.cos(side) * 28 * sign;
                const y = nearest.y + Math.sin(side) * 28 * sign;
                if (walkBlocked(x, y) || inWater(x, y)) continue;
                const refuge = {
                    x: x + Math.cos(side) * 11 * sign,
                    y: y + Math.sin(side) * 11 * sign,
                };
                const safe = !walkBlocked(refuge.x, refuge.y);
                pedestrians.push({
                    x, y, angle: side, stride: 0, gait: 0, speed: 32, waypoint: 0, direction: 1,
                    route: safe ? [[refuge.x, refuge.y]] : [[x, y]], stays: true,
                    panic: 2, down: 0, shirt: '#e6ad81', hair: '#382641', skin: '#b87563',
                });
                break;
            }
        }
        if (!nearest.taken) {
            report(nearest.route ? 2 : 1, nearest.route ? 'driver' : 'theft');
            nearest.taken = true;
        }
        ride = nearest;
        vehicleTransition = { car: ride, x: player.x, y: player.y, entering: true, until: elapsed + .32 };
        ride.route = undefined;
        ride.speed ??= 0;
        ride.steer = 0;
        Object.assign(player, { x: ride.x, y: ride.y });
    }

    const driverTypes = [[67, 46], [82, 34], [109, 27], [96, 33], [72, 50]];
    const parkingBays = [{ x: 546, y: 163 }, { x: 581, y: 163 }, { x: 267, y: 382 }, { x: 310, y: 382 }];
    const cameraOffset = { x: 0, y: 0 };
    let cameraSeeded = false;
    let shake = 0;
    let streetZoom = 1;

    function roadWall(x, y, car) {
        if (blocked(x, y, 2) || roadblock?.some(point => Math.hypot(x-point.x,y-point.y) < 13)) return true;
        const [long, width] = vehicleStats(car.model);
        const c = Math.cos(car.angle), s = Math.sin(car.angle);
        for (const front of [-1, 1]) for (const side of [-1, 1]) {
            const px = x + c * long * front - s * width * side;
            const py = y + s * long * front + c * width * side;
            if (blocked(px, py, 1) || px >= shoreline(py) - 3) return true;
        }
        return false;
    }

    function advanceCar(car, gas, steer, dt) {
        const asphalt = roadsX.some(x => Math.abs(x - car.x) < 27) || roadsY.some(y => Math.abs(y - car.y) < 27);
        const lane = CITY.oneWay;
        const connector = car.x >= lane.x && car.x <= lane.end && Math.abs(car.y - lane.y) < lane.half;
        const grip = (asphalt || connector ? 1 : car.x > 799 ? .39 : .68) * (car.tuned ? 1.13 : 1);
        const consumed = (car.vx ?? 0) ** 2 + (car.vy ?? 0) ** 2;
        if (car.fuel !== undefined && gas > 0 && consumed > 25) {
            car.fuel = Math.max(0, car.fuel - dt * Math.sqrt(consumed) * .0023);
        }
        const impact = driveBody(car, car.fuel === 0 && gas * (car.speed ?? 0) >= 0 ? 0 : gas, steer, dt, grip, roadWall);
        if (impact > 38) collisionDamage(car, impact * .28, Math.sign(gas || car.speed));
    }

    function collisionDamage(car, damage, side, causedByPlayer = car === ride) {
        damageCar(car, damage, causedByPlayer);
        const panel = side > .55 ? 'front' : side < -.55 ? 'rear' : 'side';
        car[panel] = Math.min(100, (car[panel] ?? 0) + damage);
        if (damage < 12) return;
        addEffect(car.x, car.y, 'spark', .38);
        if (distance(car, player) < 165) audio.tone('hit');
        for (const npc of pedestrians) if (!npc.down && distance(npc, car) < 92) {
            frighten(npc, car, 3.8);
            if (!npc.panic || npc.job === 'visitor') npc.phone = 3;
        }
        if (car === ride) { shake = Math.min(5, damage / 7); hurt(Math.ceil(damage * .19)); }
        if (damage > 31 && car.route && car.hp < 40 && !car.service) {
            car.route = undefined;
            car.state = 'abandoned';
            for (const direction of [1, -1]) {
                const x = car.x - Math.sin(car.angle) * 29 * direction;
                const y = car.y + Math.cos(car.angle) * 29 * direction;
                if (walkBlocked(x, y) || inWater(x, y)) continue;
                pedestrians.push({ x, y, route: [[x,y]], waypoint: 0, direction: 1, stays: true,
                    speed: 26, stride: 0, angle: car.angle, panic: 2, phone: 3, shirt: '#a983a0',
                    hair: '#3b3349', skin: '#dfaf90', pants: '#41455b' });
                break;
            }
            dispatchIncident(car);
            if (causedByPlayer && ride && distance(ride, car) < 60) report(1, 'collision');
        }
    }

    function dispatchIncident(point) {
        const patrol = cars.find(car => car.service && car.model === 'police' && !car.exploded && !car.response);
        if (!patrol) return;
        const path = roadRoute(patrol, point);
        if (path.length < 2) return;
        patrol.response = { route: patrol.route, waypoint: patrol.waypoint, until: elapsed + 25 };
        patrol.route = path.map(({ x, y }) => [x, y]);
        patrol.waypoint = 1;
    }

    function updateTraffic(dt) {
        for (const [index, car] of cars.entries()) {
            if (car === ride || car.exploded) continue;
            if (car.response && elapsed >= car.response.until) {
                const { route, waypoint } = car.response;
                Object.assign(car, { route, waypoint, response: undefined, parkUntil: 0, detour: undefined });
            }
            if (!car.route || car.burn !== undefined) {
                if (Math.hypot(car.vx ?? 0, car.vy ?? 0) > .5) advanceCar(car, 0, 0, dt);
                continue;
            }
            const [cruise, margin] = driverTypes[index % driverTypes.length];
            if (car.parkUntil > elapsed) {
                car.state = 'parked';
                advanceCar(car, 0, 0, dt);
                continue;
            }
            if (car.parkUntil) {
                car.parkUntil = 0;
                car.bay = undefined;
                car.waypoint = (car.waypoint + 1) % car.route.length;
            }
            let [x, y] = car.route[car.waypoint];
            if (car.bay && cars.some(other => other !== car && distance(other, car.bay) < 21 && !other.route)) {
                car.bay = undefined;
            }
            if (car.parkingIndex === car.waypoint && !car.bay && Math.hypot(x - car.x, y - car.y) < 78) {
                car.bay = parkingBays.filter(bay => distance(bay, car) < 75 && !roadWall(bay.x, bay.y, car)
                    && cars.every(other => other === car || (other.bay !== bay && distance(other, bay) > 29)))
                    .sort((a, b) => distance(a, car) - distance(b, car))[0];
            }
            if (car.bay) ({ x, y } = car.bay);
            if (Math.hypot(x - car.x, y - car.y) < 11) {
                if (car.response && car.waypoint === car.route.length - 1) {
                    car.state = 'incident';
                    advanceCar(car, 0, 0, dt);
                    continue;
                }
                if (car.bay) {
                    car.parkUntil = elapsed + 6;
                    car.vx = car.vy = car.speed = 0;
                    car.state = 'parked';
                    continue;
                }
                car.waypoint = (car.waypoint + 1) % car.route.length;
                [x, y] = car.route[car.waypoint];
            }
            let angle = Math.atan2(y - car.y, x - car.x);
            const look = Math.min(margin, 17 + Math.abs(car.speed ?? 0) * .42);
            const nx = car.x + Math.cos(car.angle) * look;
            const ny = car.y + Math.sin(car.angle) * look;
            const red = crossingBlocked(car.x, car.y, nx, ny);
            const yielding = pedestrians.some(npc => !npc.down && Math.hypot(nx - npc.x, ny - npc.y) < 18);
            const obstacle = cars.find(other => other !== car && Math.hypot(nx - other.x, ny - other.y) < 24);
            const queued = Boolean(obstacle);
            car.queueTime = queued ? (car.queueTime ?? 0) + dt : 0;
            if (queued && car.queueTime > 1.1 && !car.detour && !red && !yielding
                && (obstacle.exploded || !obstacle.route || obstacle.state === 'breakdown')) {
                const heading = Math.atan2(y - car.y, x - car.x);
                for (const side of [-1, 1]) {
                    const ox = -Math.sin(heading) * side * 23;
                    const oy = Math.cos(heading) * side * 23;
                    const start = { x: car.x + ox + Math.cos(heading) * 21, y: car.y + oy + Math.sin(heading) * 21 };
                    const end = { x: obstacle.x + ox + Math.cos(heading) * 31, y: obstacle.y + oy + Math.sin(heading) * 31 };
                    if ([start, end].some(point => roadWall(point.x, point.y, car)
                        || cars.some(other => other !== car && other !== obstacle && distance(other, point) < 26))) continue;
                    car.detour = [start, end];
                    if (distance(car, obstacle) < 41 && Math.abs(car.speed ?? 0) < 10) {
                        const rear = { x: car.x - Math.cos(car.angle) * 26, y: car.y - Math.sin(car.angle) * 26 };
                        if (!roadWall(rear.x, rear.y, car) && !cars.some(other => other !== car && distance(other, rear) < 28)) {
                            car.backup = .76;
                        }
                    }
                    break;
                }
            }
            if (car.backup > 0 && !red && !yielding) {
                car.backup -= dt;
                car.state = 'detour';
                advanceCar(car, -.46, 0, dt);
                continue;
            }
            if (car.detour?.length) {
                if (distance(car, car.detour[0]) < 10) car.detour.shift();
                if (car.detour.length) angle = Math.atan2(car.detour[0].y - car.y, car.detour[0].x - car.x);
                else car.detour = undefined;
            }
            const diff = Math.atan2(Math.sin(angle - car.angle), Math.cos(angle - car.angle));
            const limit = Math.min(car.detour || car.bay ? 40 : cruise, Math.hypot(x - car.x, y - car.y) * 4 + 16);
            const speed = car.speed ?? 0;
            car.state = red ? 'red' : yielding ? 'yield' : car.detour ? 'detour' : queued ? 'queue' : car.bay ? 'parking' : 'route';
            const stop = red || yielding || (queued && !car.detour);
            const gas = stop ? (speed > 4 ? -.8 : 0) : Math.max(-.45, Math.min(1, (limit - speed) / 23));
            advanceCar(car, gas, stop ? 0 : Math.max(-1, Math.min(1, diff * 1.6)), dt);
        }
        const fleet = cruiser && !cruiser.delay ? [...cars, cruiser] : cars;
        for (let a = 0; a < fleet.length; a++) for (let b = a + 1; b < fleet.length; b++) {
            const crash = collideBodies(fleet[a], fleet[b], roadWall);
            if (!crash) continue;
            const causedByPlayer = fleet[a] === ride || fleet[b] === ride;
            collisionDamage(fleet[a], crash.a, crash.sideA, causedByPlayer);
            collisionDamage(fleet[b], crash.b, crash.sideB, causedByPlayer);
        }
        if (elapsed >= nextIncident) {
            nextIncident = elapsed + 38;
            const type = eventIndex++ % 6;
            if (type >= 3) {
                const actors = pedestrians.filter(npc => !npc.down && !npc.home && !npc.panic
                    && distance(npc, player) > 200 && npc.job === 'walker');
                const pair = actors.map(actor => [actor, actors.find(other => other !== actor && distance(actor, other) < 93)])
                    .find(([, partner]) => partner);
                if (pair) neighborhoodEvent = { aggressor: pair[0], target: pair[1], type, until: elapsed + 45, wait: 0 };
            }
            const candidate = type < 3 && cars.find(car => car.route && !car.service && car.burn === undefined
                && distance(car, player) > 260 && car.hp > 45);
            if (candidate) {
                candidate.state = 'breakdown';
                candidate.route = undefined;
                damageCar(candidate, candidate.hp - (type === 1 ? 12 : 24));
                if (type === 2) {
                    const follower = cars.find(other => other !== candidate && other.route && !other.service
                        && distance(other, candidate) < 135);
                    if (follower) {
                        follower.route = undefined;
                        follower.state = 'breakdown';
                        damageCar(follower, 38);
                    }
                }
                if (type !== 0) dispatchIncident(candidate);
                for (const npc of pedestrians) if (distance(npc, candidate) < 82) {
                    frighten(npc, candidate, 3);
                    npc.phone = 3.4;
                }
            }
        }
    }

    function updateNeighborhood(dt) {
        if (!neighborhoodEvent) return;
        const event = neighborhoodEvent;
        const { aggressor, target, type } = event;
        if (elapsed >= event.until || aggressor.down || target.down) {
            neighborhoodEvent = undefined;
            return;
        }
        if (distance(player, aggressor) > 330) return;
        const gap = distance(aggressor, target);
        event.wait -= dt;
        if (gap > (type === 5 ? 80 : 14)) {
            steer(aggressor, target, 72, dt, (x, y) => walkBlocked(x, y) || inWater(x, y));
            return;
        }
        if (event.wait > 0 || !clearSight(aggressor, target)) return;
        event.wait = 1.1;
        aggressor.swing = .28;
        aggressor.angle = Math.atan2(target.y - aggressor.y, target.x - aggressor.x);
        target.flinch = .28;
        if (type === 5) {
            audio.tone('shot');
            addEffect(aggressor.x, aggressor.y, 'spark', .23);
        }
        if (type === 4 || (target.grit = (target.grit ?? 2) - 1) <= 0) knockDown(target, 5);
        for (const npc of pedestrians) {
            if (npc !== aggressor && distance(npc, aggressor) < 85) frighten(npc, aggressor, 3);
        }
    }

    function updateDriving(dt, dx, dy) {
        advanceCar(ride, -dy, dx, dt);
    }

    function previousStop(npc) {
        return (npc.waypoint - npc.direction + npc.route.length) % npc.route.length;
    }

    function frighten(npc, source, seconds, takeCover = false) {
        if (takeCover && npc.job === 'visitor' && !npc.cover && !npc.home) {
            const wall = BUILDINGS.find(([x, y, w, h]) => Math.hypot(npc.x - (x + w / 2), npc.y - (y + h / 2)) < 75);
            if (wall) {
                const [x, y, w, h] = wall;
                const possible = [{ x: x - 9, y: y + h / 2 }, { x: x + w + 9, y: y + h / 2 },
                    { x: x + w / 2, y: y - 9 }, { x: x + w / 2, y: y + h + 9 }];
                const refuge = possible.find(point => !legalFoot(point.x, point.y)
                    && distance(point, npc) < 78 && !clearSight(source, point));
                if (refuge) {
                    const route = footRoute(npc, refuge);
                    if (route.length > 1 && route.length < 12) {
                        npc.cover = { route, origin: { x: npc.x, y: npc.y }, pause: 3.5 };
                    }
                }
            }
        }
        if (!npc.panic && !npc.stays) {
            const [x, y] = npc.route[npc.waypoint];
            if ((x - npc.x) * (npc.x - source.x) + (y - npc.y) * (npc.y - source.y) < 0) {
                npc.waypoint = previousStop(npc);
                npc.direction *= -1;
            }
        }
        npc.panic = Math.max(npc.panic, seconds);
    }

    function knockDown(npc, seconds, fatal = false) {
        if (npc.fatal) return;
        npc.down = seconds;
        npc.fallAge = 0;
        npc.rise = 0;
        npc.fatal = fatal;
        npc.gait = 0;
        npc.sitting = 0;
        npc.indoor = 0;
        npc.swing = 0;
    }

    function advanceCollapse(npc, dt) {
        if (npc.down > 0 || npc.fatal) {
            npc.fallAge = (npc.fallAge ?? 0) + dt;
            if (!npc.fatal) {
                npc.down = Math.max(0, npc.down - dt);
                if (!npc.down) {
                    npc.rise = 1.05;
                    npc.grit = 2;
                    if (npc.home) npc.returnRoute = footRoute(npc, npc.home);
                }
            }
            return true;
        }
        if (npc.rise > 0) {
            npc.rise = Math.max(0, npc.rise - dt);
            return true;
        }
        return false;
    }

    function updatePedestrian(npc, dt) {
        if (advanceCollapse(npc, dt)) return;
        npc.flinch = Math.max(0, (npc.flinch ?? 0) - dt);
        npc.phone = Math.max(0, (npc.phone ?? 0) - dt);
        npc.routineWait = Math.max(0, (npc.routineWait ?? 0) - dt);
        if (npc.indoor > 0) {
            npc.indoor -= dt;
            if (npc.indoor <= 0) npc.home = npc.routineOrigin;
            else return;
        }
        if (npc.sitting > 0) {
            npc.sitting = npc.panic ? 0 : Math.max(0, npc.sitting - dt);
            if (npc.sitting) return;
            npc.home = npc.routineOrigin;
        }
        npc.swing = Math.max(0, (npc.swing ?? 0) - dt);
        npc.socialCooldown = Math.max(0, (npc.socialCooldown ?? 0) - dt);
        npc.greeting = Math.max(0, (npc.greeting ?? 0) - dt);
        if (npc.cover) {
            const next = npc.cover.route[0];
            if (next) {
                if (steer(npc, next, 67, dt, legalFoot)) npc.cover.route.shift();
            } else {
                npc.cover.pause -= dt;
                npc.gait = 0;
                if (npc.cover.pause <= 0) {
                    npc.home = npc.cover.origin;
                    npc.cover = undefined;
                }
            }
            return;
        }
        if (npc.anger > 0) {
            npc.anger -= dt;
            if (!ride && !player.swimming && distance(npc, player) < 90) {
                const gap = distance(npc, player);
                if (gap < 14) {
                    npc.angle = Math.atan2(player.y - npc.y, player.x - npc.x);
                    npc.gait = 0;
                    if (!npc.swing && !immunity) {
                        npc.swing = .28;
                        hurt(14);
                    }
                } else steer(npc, player, 68, dt, (x, y) => walkBlocked(x, y) || inWater(x, y));
                return;
            }
            npc.anger = 0;
            if (npc.home) npc.returnRoute = footRoute(npc, npc.home);
        }
        if (npc.job === 'medic' && !npc.panic && !npc.home) {
                const patient = pedestrians.find((other) => other !== npc && other.down > .4 && !other.fatal
                && distance(npc, other) < 45 && clearSight(npc, other));
            if (patient) {
                npc.assist ??= { x: npc.x, y: npc.y };
                if (distance(npc, patient) > 8) {
                    steer(npc, patient, 48, dt, (x, y) => walkBlocked(x, y) || inWater(x, y));
                } else {
                    npc.gait = 0;
                    patient.down = Math.max(.01, patient.down - dt * 4);
                }
                return;
            }
        }
        if (npc.assist) {
            npc.home ??= npc.assist;
            npc.assist = undefined;
        }
        if (npc.routineTarget && !npc.panic) {
            const { target, activity } = npc.routineTarget;
            const previous = { x: npc.x, y: npc.y };
            if (distance(npc, target) < 2.5) {
                if (activity === 'bench') npc.sitting = 7;
                else npc.indoor = 8;
                npc.gait = 0;
                npc.routineTarget = undefined;
            } else {
                steer(npc, target, 45, dt, (x, y) => walkBlocked(x, y) || inWater(x, y));
                if (distance(previous, npc) < .1) {
                    npc.routineTarget = undefined;
                    npc.home = npc.routineOrigin;
                }
            }
            return;
        }
        if (npc.routineTarget && npc.panic) {
            npc.routineTarget = undefined;
            npc.home = npc.routineOrigin;
        }
        if (npc.home) {
            npc.returnRoute ??= footRoute(npc, npc.home);
            const target = npc.returnRoute?.[0] ?? npc.home;
            if (distance(npc, target) < 1.3) {
                if (npc.returnRoute?.length) npc.returnRoute.shift();
                else {
                    npc.home = undefined;
                    npc.returnRoute = undefined;
                }
            } else steer(npc, target, 46, dt, legalFoot);
            return;
        }
        npc.panic = Math.max(0, npc.panic - dt);
        if (ride && Math.abs(ride.speed) > 45 && distance(ride, npc) < 40) frighten(npc, ride, 1.2);
        const [x, y] = npc.route[npc.waypoint];
        const remaining = Math.hypot(x - npc.x, y - npc.y);
        if (remaining < .6) {
            npc.gait = 0;
            if (npc.job === 'visitor' || npc.job === 'medic' || npc.job === 'rescue') npc.pause = 1.1 + npc.speed % 3;
            npc.waypoint = (npc.waypoint + npc.direction + npc.route.length) % npc.route.length;
            return;
        }
        npc.pause = Math.max(0, (npc.pause ?? 0) - dt);
        if (npc.pause && !npc.panic) return;
        if (!npc.panic && !npc.socialCooldown && npc.job === 'visitor') {
            const neighbor = pedestrians.find((other) => other !== npc && other.job === 'walker'
                && !other.panic && !other.down && !other.anger && !other.socialCooldown && distance(npc, other) < 12);
            if (neighbor) {
                for (const unit of [npc, neighbor]) {
                    unit.pause = 1.15;
                    unit.greeting = 1;
                    unit.socialCooldown = 15;
                    unit.gait = 0;
                }
                return;
            }
        }
        if (npc.job === 'visitor' && !npc.panic && !npc.routineWait) {
            const bench = [{ x: 305, y: 331 }, { x: 322, y: 331 }, { x: 439, y: 330 }]
                .find(candidate => distance(npc, candidate) < 16 && !pedestrians.some(other => other !== npc && other.sitting
                    && distance(other, candidate) < 7));
            const entrance = doors.find(door => distance(npc, door) < 25);
            const target = bench ?? entrance;
            if (target) {
                npc.routineWait = 42;
                npc.routineOrigin = { x: npc.x, y: npc.y };
                npc.routineTarget = { target: bench ?? { x: entrance.x, y: entrance.y + (entrance.kind === 'market' ? -3 : 5) },
                    activity: bench ? 'bench' : 'door' };
                return;
            }
        }
        const running = npc.panic > 0 || npc.job === 'jogger';
        const step = Math.min(remaining, npc.speed * (running ? 1.75 : 1) * dt);
        const nx = npc.x + (x - npc.x) * step / remaining;
        const ny = npc.y + (y - npc.y) * step / remaining;
        if (ride && Math.abs(ride.speed) > 70 && distance(ride, npc) < 12) {
            knockDown(npc, 5.5);
            report(2, 'injury');
            npc.gait = 0;
            return;
        }
        if (crossingBlocked(npc.x, npc.y, nx, ny, true) && !npc.panic) return;
        if (walkBlocked(nx, ny, ride)) {
            npc.gait = 0;
            npc.wait = (npc.wait ?? 0) + dt;
            if (npc.wait > 1.6 && !npc.stays) {
                npc.waypoint = previousStop(npc);
                npc.direction *= -1;
                npc.wait = 0;
            }
            return;
        }
        npc.wait = 0;
        npc.angle = Math.atan2(y - npc.y, x - npc.x);
        npc.stride += step * (running ? .17 : .22);
        npc.gait = running ? 2.7 : 1.7;
        Object.assign(npc, { x: nx, y: ny });
    }

    const evidenceThreshold = [0, 1, 3, 6, 10, 15];

    function confirmIncident(points, position) {
        evidenceScore = Math.min(16, evidenceScore + points);
        const stars = evidenceThreshold.reduce((tier, threshold, index) => evidenceScore >= threshold ? index : tier, 0);
        if (!wanted && stars) showNotice('Сообщение принято · патруль в пути', 4);
        if (!stars) return;
        wanted = stars;
        casePosition = position;
        heat = Math.max(heat, 15 + wanted * 4);
    }

    function report(level, incident = 'dispatch') {
        const position = { x: player.x, y: player.y };
        if (incident === 'dispatch') {
            confirmIncident(evidenceThreshold[Math.min(5, level)], position);
            return;
        }
        if (lawClock - (reportTimes.get(incident) ?? -Infinity) < 3.2) return;
        const audible = incident === 'shot' || incident === 'blast';
        const sees = unit => !unit.down && !unit.indoor
            && distance(unit, player) < (audible ? 118 : 91) && clearSight(unit, player);
        const police = officers.some(sees) || (cruiser && !cruiser.delay && sees(cruiser)) || incident === 'officer';
        const caller = pedestrians.find(sees);
        if (!police && !caller && incident !== 'driver') return;
        reportTimes.set(incident, lawClock);
        if (police) {
            confirmIncident(level, position);
            return;
        }
        if (caller) caller.phone = 3;
        if (!pendingReport) {
            pendingReport = { points: level, position, due: lawClock + 2.1, caller };
            if (!wanted) showNotice('Очевидец звонит в полицию', 2.3);
        } else if (level > pendingReport.points) {
            pendingReport.points = level;
            pendingReport.position = position;
            pendingReport.caller = caller;
        }
    }

    function showNotice(text, seconds = 3) {
        notice = text;
        noticeTime = seconds;
    }

    function parkRide() {
        if (!ride) return;
        ride.speed = 0;
        ride.braking = false;
        ride = undefined;
    }

    function resetPolice() {
        wanted = 0;
        evidenceScore = 0;
        pendingReport = undefined;
        reportTimes.clear();
        heat = 0;
        cruiser = undefined;
        officers = [];
        contact = 0;
        casePosition = undefined;
        roadblock = undefined;
    }

    function hurt(amount) {
        if (custody || immunity || downfall) return;
        const absorbed = Math.min(armor, amount);
        armor -= absorbed;
        health = Math.max(0, health - amount + absorbed);
        immunity = .65;
        if (amount > absorbed) player.hurtPose = .31;
        if (health > 0) return;
        parkRide();
        downfall = { age: 0 };
        vehicleTransition = undefined;
        Object.assign(player, { gait: 0, swing: 0, swimming: false });
        keys.clear();
        touch.reset();
        touch.panel.hidden = true;
        switchHero.disabled = true;
        shots = [];
        reloadTime = 0;
        resetPolice();
        for (const npc of pedestrians) npc.anger = 0;
        audio.tone('hit');
        refreshHud();
    }

    function updateDownfall(dt) {
        downfall.age += dt;
        player.collapse = downfall.age < .47 ? 1 : 2;
        if (downfall.age < 2.35) return;
        downfall = undefined;
        Object.assign(player, { x: SERVICES.clinic.x, y: SERVICES.clinic.y, collapse: 0, swimming: false, gait: 0 });
        health = 100;
        immunity = 4;
        cameraSeeded = false;
        touch.panel.hidden = false;
        switchHero.disabled = false;
        showNotice('Тебя доставили в больницу', 5);
    }

    function steer(unit, target, speed, dt, obstacle) {
        const gap = distance(unit, target);
        if (gap < .25) {
            unit.gait = 0;
            return true;
        }
        const step = Math.min(gap, speed * dt);
        const nx = unit.x + (target.x - unit.x) * step / gap;
        const ny = unit.y + (target.y - unit.y) * step / gap;
        if (obstacle(nx, ny)) {
            unit.gait = 0;
            return false;
        }
        unit.angle = Math.atan2(target.y - unit.y, target.x - unit.x);
        unit.x = nx;
        unit.y = ny;
        if ('stride' in unit) {
            unit.stride += step * .18;
            unit.gait = 2.6;
        }
        return step === gap;
    }

    function clearSight(from, to) {
        const stops = Math.ceil(distance(from, to) / 8);
        for (let step = 1; step < stops; step++) {
            const ratio = step / stops;
            if (blocked(from.x + (to.x - from.x) * ratio, from.y + (to.y - from.y) * ratio)) return false;
        }
        return true;
    }

    function arrest(now) {
        if (custody) return;
        custody = { hero: player.name, until: now + 60_000 };
        setCustody(custody);
        cell = makePrisoner();
        parkRide();
        shots = [];
        ammo = 0;
        magazine.clear();
        reserves.clear();
        reloadTime = 0;
        knife = false;
        player.pistol = false;
        equipped = 1;
        keys.clear();
        resetPolice();
        jail.hidden = false;
        hud.hidden = true;
        jailClock.textContent = '60 с';
        mapToggle.disabled = true;
        switchHero.disabled = true;
        prompt.hidden = true;
    }

    function release() {
        custody = undefined;
        cell = undefined;
        pickups = resetSearch();
        setCustody(undefined);
        Object.assign(player, { x: SERVICES.police.x, y: SERVICES.police.y, swimming: false, gait: 0 });
        health = 100;
        jail.hidden = true;
        hud.hidden = false;
        mapToggle.disabled = false;
        switchHero.disabled = false;
        showNotice('Освобождение · полицейский участок', 5);
    }

    function deployOfficers() {
        for (const sign of [1, -1].slice(0, wanted >= 3 ? 2 : 1)) {
            const side = cruiser.angle + sign * Math.PI / 2;
            const x = cruiser.x + Math.cos(side) * 23;
            const y = cruiser.y + Math.sin(side) * 23;
            const location = legalFoot(x, y) ? cruiser : { x, y };
            officers.push({
                x: location.x, y: location.y, angle: side, stride: 0, gait: 0, replan: 0, path: [],
                job: 'officer', shirt: '#4977aa', light: '#b9d6ef', pants: '#2e3d61',
                skin: '#dfab8c', hair: '#25334e',
            });
        }
        cruiser.arrived = true;
    }

    function updatePolice(dt, now) {
        lawClock += dt;
        if (pendingReport && lawClock >= pendingReport.due) {
            const { points, position, caller } = pendingReport;
            pendingReport = undefined;
            if (!caller?.down && !caller?.indoor) confirmIncident(points, position);
        }
        if (!wanted) return;
        if (wanted < 5) roadblock = undefined;
        if (wanted === 5 && !roadblock) {
            const intersection = roadsY.find(y => y > casePosition.y + 100);
            const road = roadsX.reduce((best, x) => Math.abs(x - casePosition.x) < Math.abs(best - casePosition.x) ? x : best);
            if (intersection !== undefined) roadblock = [-18, 0, 18].map(offset => ({ x: road + offset, y: intersection }));
        }
        if (!cruiser) {
            cruiser = { x: SERVICES.police.x, y: 945, angle: 0, color: '#6a8fc3', model: 'police',
                lightbar: true, replan: 0, path: [], delay: wanted === 1 ? 8 : 5.8, stuck: 0 };
        }
        cruiser.delay = Math.max(0, cruiser.delay - dt);
        cruiser.flash = Math.floor(elapsed * 7) % 2 === 0;
        sirenBeat -= dt;
        if (!cruiser.delay && sirenBeat <= 0 && distance(cruiser, player) < 210) {
            audio.tone('siren');
            sirenBeat = 1.1;
        }
        if (!cruiser.arrived && !cruiser.delay) {
            cruiser.replan -= dt;
            if (cruiser.replan <= 0) {
                cruiser.path = roadRoute(cruiser, casePosition);
                cruiser.replan = 1.25;
            }
            const target = cruiser.path[0];
            const before = { x: cruiser.x, y: cruiser.y };
            if (target) {
                const heading = Math.atan2(target.y - cruiser.y, target.x - cruiser.x);
                const turn = Math.atan2(Math.sin(heading - cruiser.angle), Math.cos(heading - cruiser.angle));
                if (distance(cruiser, target) < 13) cruiser.path.shift();
                else advanceCar(cruiser, Math.max(.19, Math.min(.9, (100 - (cruiser.speed ?? 0)) / 45)),
                    Math.max(-1, Math.min(1, turn * 2)), dt);
            }
            cruiser.stuck = distance(before, cruiser) < .1 ? cruiser.stuck + dt : 0;
            if (!cruiser.path.length || distance(cruiser, casePosition) < 52 || cruiser.stuck > 2.4) deployOfficers();
        }
        for (const officer of officers) {
            if (advanceCollapse(officer, dt)) continue;
            const gap = distance(officer, player);
            const seesPlayer = gap < 132 && clearSight(officer, player);
            if (seesPlayer) casePosition = { x: player.x, y: player.y };
            officer.fireWait = (officer.fireWait ?? 1.5) - dt;
            if (wanted >= 4 && seesPlayer && gap > 32 && gap < 106 && officer.fireWait <= 0 && !player.swimming) {
                officer.fireWait = 1.5;
                audio.tone('shot');
                addEffect(officer.x, officer.y, 'spark', .18);
                hurt(9);
                if (!wanted) return;
            }
            officer.replan -= dt;
            if (officer.replan <= 0) {
                officer.path = footRoute(officer, casePosition);
                officer.replan = .7;
            }
            const next = officer.path[0];
            const speed = 84 + wanted * 10;
            if (gap < 8 && seesPlayer) officer.gait = 0;
            else if (gap < 37 && seesPlayer && !player.swimming) {
                steer(officer, player, speed, dt, legalFoot);
            } else if (next && steer(officer, next, speed, dt, legalFoot)) officer.path.shift();
        }
        const nearby = officers.some((officer) => !officer.down && !officer.rise && distance(officer, player) < 13 && clearSight(officer, player));
        if (nearby && !player.swimming && (!ride ? footSpeed < 38 : Math.abs(ride.speed) < 8)) {
            if (contact === 0) showNotice('Полиция требует остановиться', 2);
            contact += dt;
            if (contact >= holdTime) arrest(now);
        } else contact = Math.max(0, contact - dt * 4.5);
        if (custody) return;
        const seen = officers.some((officer) => !officer.down && distance(officer, player) < 145 && clearSight(officer, player))
            || (!cruiser.delay && !cruiser.arrived && distance(cruiser, player) < 120 && clearSight(cruiser, player));
        if (!seen && (cruiser.arrived || distance(casePosition, player) > 140)) heat -= dt;
        if (heat <= 0) {
            wanted--;
            evidenceScore = evidenceThreshold[wanted];
            heat = 9;
            if (!wanted) {
                resetPolice();
                showNotice('Розыск снят');
            }
        }
    }

    function markHit(x, y, source) {
        if (!blood) return;
        stains.push({ x, y, angle: Math.atan2(y - source.y, x - source.x), age: 0, seed: stains.length + 1 });
        if (stains.length > 40) stains.shift();
    }

    function punch(blade = false) {
        if (custody || downfall || interior || ride || player.swimming || player.swing > 0) return;
        player.swing = blade ? .34 : .28;
        player.stabbing = blade;
        player.hand = -(player.hand ?? 1);
        player.heading = player.angle;
        const victim = [...pedestrians, ...officers].find((npc) => {
            if (npc.down || distance(npc, player) > (blade ? 21 : 17)) return false;
            const angle = Math.atan2(npc.y - player.y, npc.x - player.x);
            return Math.cos(angle - player.angle) > .22;
        });
        if (!victim) return;
        report(1, 'melee');
        if (blade) markHit(victim.x, victim.y, player);
        victim.grit = (victim.grit ?? 3) - (blade ? 2 : 1);
        if (victim.grit <= 0) {
            knockDown(victim, 4.7);
            victim.anger = 0;
            victim.grit = 3;
            report(victim.job === 'officer' ? 3 : 1, victim.job === 'officer' ? 'officer' : 'melee');
        } else if (victim.job === 'guard' || (victim.job !== 'officer' && victim.grit === 1 && victim.speed % 2 === 1)) {
            if (!victim.home) victim.home = { x: victim.x, y: victim.y };
            victim.returnRoute = undefined;
            victim.anger = 6;
        } else if (victim.job !== 'officer') frighten(victim, player, 3.5);
    }

    function camera() {
        return {
            x: Math.round(Math.max(0, Math.min(WIDTH - VIEW_WIDTH, cameraOffset.x + Math.sin(elapsed * 101) * shake))),
            y: Math.round(Math.max(0, Math.min(HEIGHT - VIEW_HEIGHT, cameraOffset.y + Math.cos(elapsed * 93) * shake))),
        };
    }

    function grantWeapon(slot) {
        const spec = WEAPONS[slot];
        if (!magazine.has(slot)) {
            magazine.set(slot, spec.capacity);
            if (slot > 3) reserves.set(slot, spec.capacity);
        }
        else reserves.set(slot, (reserves.get(slot) ?? 0) + spec.capacity);
        equipped = slot;
        if (slot === 3) { player.pistol = true; ammo = magazine.get(3); }
    }

    function reload() {
        const weapon = WEAPONS[equipped];
        if (!weapon || reloadTime || ride || custody || player.swimming
            || magazine.get(equipped) >= weapon.capacity || !reserves.get(equipped)) return;
        reloadTime = weapon.time;
        audio.tone('reload');
    }

    function selectSlot(slot) {
        if (slot !== 1 && !(slot === 2 && knife) && !magazine.has(slot)) return;
        equipped = slot;
        reloadTime = 0;
    }

    function toggleWeapons(open) {
        if (!running || custody || downfall || mapOpen) return;
        wheelOpen = open;
        arsenal.hidden = !open;
        keys.clear();
        touch.reset();
        touch.panel.hidden = open;
        if (open) audio.hum(null, false);
        if (open) {
            arsenal.querySelectorAll('button').forEach(button => {
                const slot = Number(button.dataset.slot);
                button.disabled = slot !== 1 && !(slot === 2 && knife) && !magazine.has(slot);
            });
            arsenal.querySelector('button:not(:disabled)').focus();
        } else canvas.focus();
    }

    function attack() {
        if (!running || wheelOpen || mapOpen || custody || interior) return;
        if (equipped >= 3) fire();
        else punch(equipped === 2);
    }

    function fire() {
        if (cooldown > 0 || ride || player.swimming || custody || reloadTime) return;
        const weapon = WEAPONS[equipped];
        if (!weapon || !magazine.get(equipped)) { reload(); return; }
        report(1, 'shot');
        magazine.set(equipped, magazine.get(equipped) - 1);
        ammo = magazine.get(3) ?? 0;
        if (pointer) {
            const view = camera();
            const dx = view.x + pointer.x - player.x;
            const dy = view.y + pointer.y - player.y;
            if (dx || dy) player.angle = Math.atan2(dy, dx);
        }
        for (let pellet = 0; pellet < (weapon.pellets ?? 1) && shots.length < 75; pellet++) {
            const angle = player.angle + (Math.random() * 2 - 1) * weapon.spread;
            shots.push({ x: player.x, y: player.y, dx: Math.cos(angle), dy: Math.sin(angle),
                speed: weapon.speed, life: weapon.range / weapon.speed, damage: weapon.damage, pulse: weapon.pulse });
        }
        cooldown = weapon.interval;
        muzzle = .05;
        player.recoil = .15;
        audio.tone('shot');
        for (const npc of pedestrians) if (distance(npc, player) < 115) frighten(npc, player, 2.8, true);
    }

    function crossingBlocked(x, y, nx, ny, pedestrian = false) {
        const horizontal = Math.abs(nx - x) > Math.abs(ny - y);
        for (const roadX of roadsX) for (const roadY of roadsY) {
            const before = horizontal ? Math.abs(x - roadX) : Math.abs(y - roadY);
            const after = horizontal ? Math.abs(nx - roadX) : Math.abs(ny - roadY);
            const along = horizontal ? Math.abs(ny - roadY) : Math.abs(nx - roadX);
            const edge = pedestrian ? 27 : 32;
            if (before >= edge && after < edge && along < (pedestrian ? 43 : 24)) {
                const green = signalAt(elapsed, roadX, roadY);
                if (pedestrian) return green === (horizontal ? 'vertical' : 'horizontal');
                return green !== (horizontal ? 'horizontal' : 'vertical');
            }
        }
        return false;
    }

    function damageCar(car, amount, causedByPlayer = false) {
        if (car.exploded) return;
        if (causedByPlayer) car.playerImpactUntil = lawClock + 12;
        car.hp = Math.max(0, (car.hp ?? vehicleStats(car.model)[6]) - amount);
        if (car.hp < 15 && car.burn === undefined) car.burn = 3;
    }

    function addEffect(x, y, kind, life) {
        if (effects.length >= (low ? 24 : 74)) return;
        const particle = pool.pop() ?? {};
        Object.assign(particle, { x, y, kind, life, max: life });
        effects.push(particle);
    }

    function explode(car) {
        if (car?.exploded) return;
        if (car) { car.exploded = true; car.route = undefined; }
        const point = car ?? player;
        const playerCause = car?.playerImpactUntil > lawClock;
        addEffect(point.x, point.y, 'blast', .64);
        audio.tone('blast');
        for (const other of cars) {
            const gap = distance(point, other);
            if (other !== car && gap < 67) damageCar(other, (67 - gap) * 1.5, playerCause);
        }
        for (const npc of pedestrians) {
            const gap = distance(point, npc);
            if (gap < 31) knockDown(npc, 6, gap < 12);
            else if (gap < 130) frighten(npc, point, 4);
        }
        const gap = distance(point, player);
        if (ride === car) interact();
        if (ride === car) parkRide();
        if (gap < 62) hurt(Math.ceil((62 - gap) * 1.2));
        if (distance(point, player) < 140) shake = 5;
        if (playerCause) report(3, 'blast');
    }

    function moveAxes() {
        const keyboardX = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
        const keyboardY = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
        if (ride && touch.axes.x && !keyboardX) {
            return { x: touch.axes.x, y: touch.held('brake') ? 1 : touch.held('run') ? -1 : touch.axes.y };
        }
        if (ride && (touch.held('brake') || touch.held('run'))) {
            return { x: keyboardX, y: touch.held('brake') ? 1 : -1 };
        }
        return { x: keyboardX || touch.axes.x, y: keyboardY || touch.axes.y };
    }

    function makePrisoner() {
        return { ...player, x: 214, y: 121, heading: Math.PI / 2, angle: Math.PI / 2,
            shirt: '#d9815a', light: '#ffbe8d', pants: '#a95a54', gait: 0, swimming: false, swing: 0, shackled: true };
    }

    function movePrisoner(dt) {
        const { x, y } = moveAxes();
        const length = Math.hypot(x, y);
        cell.gait = 0;
        if (!length) return;
        const step = 54 * dt / length;
        const nextX = Math.max(68, Math.min(354, cell.x + x * step));
        const nextY = Math.max(31, Math.min(177, cell.y + y * step));
        const furniture = (px, py) => (px > 81 && px < 150 && py > 50 && py < 83)
            || (px > 275 && px < 320 && py > 49 && py < 72);
        if (!furniture(nextX, cell.y)) cell.x = nextX;
        if (!furniture(cell.x, nextY)) cell.y = nextY;
        cell.heading = Math.atan2(y, x);
        cell.stride += step * .18;
        cell.gait = 1.2;
    }

    function update(dt, now = Date.now()) {
        if (downfall) {
            updateDownfall(dt);
            if (downfall) return;
        }
        if (interior) {
            const { x, y } = moveAxes();
            const step = 83 * dt / Math.max(1, Math.hypot(x, y));
            interior.x = Math.max(76, Math.min(372, interior.x + x * step));
            interior.y = Math.max(94, Math.min(205, interior.y + y * step));
            if (x || y) interior.angle = Math.atan2(y, x);
            interior.gait = x || y ? 1.7 : 0;
            interior.stride += step * .15;
            noticeTime = Math.max(0, noticeTime - dt);
            prompt.hidden = false;
            const hint = noticeTime ? notice : interior.y > 172 ? 'E · выйти через дверь' : 'E · обслуживание у стойки';
            if (prompt.textContent !== hint) prompt.textContent = hint;
            refreshHud();
            return;
        }
        if (custody) {
            if (now < custody.until) {
                const count = Math.ceil((custody.until - now) / 1000) + ' с';
                if (jailClock.textContent !== count) jailClock.textContent = count;
                movePrisoner(dt);
                return;
            }
            release();
        }
        immunity = Math.max(0, immunity - dt);
        noticeTime = Math.max(0, noticeTime - dt);
        player.swing = Math.max(0, (player.swing ?? 0) - dt);
        player.hurtPose = Math.max(0, (player.hurtPose ?? 0) - dt);
        player.recoil = Math.max(0, (player.recoil ?? 0) - dt);
        player.bracePose = Math.max(0, (player.bracePose ?? 0) - dt);
        player.turnPose = Math.max(0, (player.turnPose ?? 0) - dt);
        const { x: dx, y: dy } = moveAxes();
        for (const stain of stains) stain.age += dt;
        stains = stains.filter((stain) => stain.age < 22);
        player.gait = 0;
        const previousFootSpeed = footSpeed;
        footSpeed = 0;
        if (ride) updateDriving(dt, dx, dy);
        else {
            const before = { x: player.x, y: player.y };
            const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.held('run');
            const depth = player.x - shoreline(player.y);
            const wade = Math.max(0, Math.min(1, (depth + 9) / 18));
            const water = depth >= (player.swimming ? 1 : 7);
            const directionLength = Math.max(1, Math.hypot(dx, dy));
            const landSpeed = (sprint ? 172 : 112) * (1 - wade * .43);
            let stepX = dx * landSpeed / directionLength, stepY = dy * landSpeed / directionLength;
            if (water) {
                const blend = 1 - Math.exp(-dt * (dx || dy ? 6.2 : 4.4));
                player.swimVX = (player.swimVX ?? 0) * (1 - blend) + dx * 63 / directionLength * blend;
                player.swimVY = (player.swimVY ?? 0) * (1 - blend) + dy * 63 / directionLength * blend;
                stepX = player.swimVX;
                stepY = player.swimVY;
            } else player.swimVX = player.swimVY = 0;
            if (stepX && !walkBlocked(player.x + stepX * dt, player.y)) player.x += stepX * dt;
            if (stepY && !walkBlocked(player.x, player.y + stepY * dt)) player.y += stepY * dt;
            const actual = distance(before, player);
            footSpeed = dt ? actual / dt : 0;
            const direction = Math.atan2(dy, dx);
            if (actual && (dx || dy)) {
                const turn = Math.atan2(Math.sin(direction - player.heading), Math.cos(direction - player.heading));
                player.heading += turn * Math.min(1, dt * (water ? 8 : 20));
                if (!water && previousFootSpeed > 45 && Math.abs(turn) > .75) player.turnPose = .18;
            }
            if (!water && previousFootSpeed > 65 && footSpeed < 15 && !(dx || dy)) player.bracePose = .23;
            player.stride += actual * (sprint ? .10 : .135);
            player.gait = actual ? (sprint ? 3.4 : 2.2) : 0;
            if ((dx || dy) && (!pointer || water)) player.angle = direction;
            player.swimSpeed = water ? footSpeed : 0;
            player.swimCycle = (player.swimCycle ?? 0) + dt * (water ? 2.6 + footSpeed * .12 : 0);
            player.swimming = player.x - shoreline(player.y) >= (water ? 1 : 7);
        }
        if (ride) player.swimming = false;
        if (!ride && !player.swimming && distance(player, SERVICES.clinic) < 23 && health < 100) {
            health = Math.min(100, health + dt * 30);
        }
        cooldown = Math.max(0, cooldown - dt);
        muzzle = Math.max(0, muzzle - dt);
        if (reloadTime > 0) {
            reloadTime = Math.max(0, reloadTime - dt);
            if (!reloadTime) {
                const rounds = magazine.get(equipped);
                const reserve = reserves.get(equipped);
                const added = Math.min(WEAPONS[equipped].capacity - rounds, reserve);
                magazine.set(equipped, rounds + added);
                reserves.set(equipped, reserve - added);
                ammo = magazine.get(3) ?? 0;
            }
        }
        for (let i = effects.length - 1; i >= 0; i--) {
            effects[i].life -= dt;
            if (effects[i].life <= 0) pool.push(effects.splice(i, 1)[0]);
        }
        for (const car of cars) {
            if (car.burn === undefined || car.exploded) continue;
            car.burn -= dt;
            if (car.burn <= 0) explode(car);
        }
        if (equipped >= 3 && (keys.has('Space') || touch.held('fire'))) fire();
        footBeat += dt;
        if (player.gait && !ride && !player.swimming && footBeat > .32) {
            footBeat = 0;
            audio.tone('step');
        }
        audio.hum(ride?.speed ?? null);
        updateTraffic(dt);
        if (downfall) return;
        if (ride) Object.assign(player, { x: ride.x, y: ride.y, heading: ride.angle });
        if (trial) {
            if (elapsed >= trial.until || ride !== trial.car || ride.exploded) {
                trial = undefined;
                showNotice('Испытание прервано');
            } else if (distance(player, trialGates[trial.gate]) < 26) {
                trial.gate++;
                audio.tone('interact');
                if (trial.gate === trialGates.length) {
                    trial = undefined;
                    money += 170;
                    showNotice('Испытание пройдено · +$170');
                }
            }
        }
        const targetX = player.x - VIEW_WIDTH / 2 + Math.max(-45, Math.min(45, (ride?.vx ?? 0) * .27));
        const targetY = player.y - VIEW_HEIGHT / 2 + Math.max(-32, Math.min(32, (ride?.vy ?? 0) * .27));
        const blend = cameraSeeded ? 1 - Math.exp(-dt * 7) : 1;
        cameraOffset.x += (targetX - cameraOffset.x) * blend;
        cameraOffset.y += (targetY - cameraOffset.y) * blend;
        cameraSeeded = true;
        shake = Math.max(0, shake - dt * 13);
        const targetZoom = 1 + Math.max(0, 1 - Math.abs(ride?.speed ?? 0) / 175) * .065;
        streetZoom += (targetZoom - streetZoom) * Math.min(1, dt * 4);
        sectorTime += dt;
        const distantTick = sectorTime >= .16;
        for (const npc of pedestrians) {
            const near = Math.abs(npc.x - player.x) < 300 && Math.abs(npc.y - player.y) < 240;
            if (npc === neighborhoodEvent?.aggressor && near) continue;
            if (near || distantTick) updatePedestrian(npc, near ? dt : sectorTime);
        }
        if (distantTick) sectorTime = 0;
        updateNeighborhood(dt);
        updatePolice(dt, now);
        refreshHud();
        if (custody) return;
        const nearCar = !ride && !player.swimming && cars.some((car) => !car.service && !car.exploded && distance(player, car) < 31);
        const nearBin = !ride && !player.swimming && findDumpster();
        const nearWreck = !ride && cars.some(car => car.exploded && distance(player, car) < 31);
        const person = !ride && !player.swimming && nearbyPerson();
        const service = !ride && [[499,714,'Магазин'],[275,657,'Бронежилет'],[707,718,'Заказ в порту'],[256,1050,'Рынок'],[595,1125,'гараж · Shift+E']]
            .find(([x,y]) => Math.hypot(x-player.x,y-player.y) < 23);
        const atTrial = ride && distance(player, { x: 590, y: 1145 }) < 24;
        prompt.hidden = !noticeTime && !ride && !nearCar && !nearBin && !nearWreck && !contact && !service && !person;
        const hint = contact ? 'Задержание · оторвись от патруля' : noticeTime ? notice : trial
            ? 'Точка ' + (trial.gate + 1) + '/4 · ' + Math.ceil(trial.until - elapsed) + ' с'
            : atTrial ? 'E · начать испытание' : ride ? 'W/S · газ и тормоз   A/D · руль   E · выйти'
            : nearBin ? 'E · обыскать контейнер' : nearWreck ? 'E · эвакуатор · $85' : service ? 'E · ' + service[2]
                : nearCar ? 'E · сесть в машину' : person?.fatal ? 'E · проверить' : person?.down ? 'E · помочь' : 'E · поговорить';
        if (!prompt.hidden && prompt.textContent !== hint) prompt.textContent = hint;
        const label = ride ? Math.round(Math.abs(ride.speed) * .63) + ' км/ч · кузов '
            + Math.ceil(ride.hp * 100 / vehicleStats(ride.model)[6]) + '% · бак ' + Math.ceil(ride.fuel ?? 100)
            + '%' + (ride.speed < 0 ? ' · R' : '')
            : player.swimming ? 'Плавание' : equipped >= 3 ? WEAPONS[equipped].name + ' · ' + magazine.get(equipped) + '/' + (reserves.get(equipped) ?? 0)
                + (reloadTime ? ' · перезарядка' : '') : equipped === 2 ? 'Нож' : 'Кулаки';
        if (status.textContent !== label) status.textContent = label;
        shots = shots.filter((shot) => {
            shot.life -= dt;
            if (shot.life <= 0) return false;
            // Short steps keep fast projectiles from skipping an NPC between frames.
            const steps = Math.ceil(shot.speed * dt / 3);
            for (let step = 0; step < steps; step++) {
                shot.x += shot.dx * shot.speed * dt / steps;
                shot.y += shot.dy * shot.speed * dt / steps;
                const hitCar = cars.find(car => !car.exploded && Math.hypot(car.x - shot.x, car.y - shot.y) < carFootprint(car) * .69);
                if (hitCar || blocked(shot.x, shot.y)) {
                    if (hitCar) damageCar(hitCar, shot.damage * (shot.pulse ? 20 : 8), true);
                    addEffect(shot.x, shot.y, shot.pulse ? 'blast' : 'spark', shot.pulse ? .54 : .35);
                    return false;
                }
                const hit = [...pedestrians, ...officers].find((npc) => !npc.down && Math.hypot(npc.x - shot.x, npc.y - shot.y) < 7);
                if (hit) {
                    hit.flinch = .2;
                    hit.grit = (hit.grit ?? 2) - shot.damage;
                    if (hit.grit <= 0) {
                        knockDown(hit, 5.1, shot.damage >= 5);
                        money += 5;
                    } else frighten(hit, player, 4);
                    hits++;
                    markHit(hit.x, hit.y, shot);
                    report(hit.job === 'officer' ? 3 : 2, hit.job === 'officer' ? 'officer' : 'injury');
                    return false;
                }
            }
            return true;
        });
    }

    function refreshHud() {
        restraint.hidden = !contact;
        if (!restraint.hidden) restraint.value = Math.min(100, contact / holdTime * 100);
        const balance = '$' + money;
        if (moneyHud.textContent !== balance) moneyHud.textContent = balance;
        if (armorBar.value !== armor) armorBar.value = armor;
        const hp = Math.ceil(health);
        if (healthBar.value !== hp) healthBar.value = hp;
        const stars = '★'.repeat(wanted) + '☆'.repeat(5 - wanted);
        if (wantedHud.textContent !== stars) {
            wantedHud.textContent = stars;
            wantedHud.setAttribute('aria-label', 'Розыск: ' + wanted + ' из 5');
        }
    }

    function renderMap(context, base, detailed) {
        const width = base.width;
        const height = base.height;
        const sx = width / WIDTH;
        const sy = height / HEIGHT;
        context.drawImage(base, 0, 0);
        if (casePosition && wanted) {
            context.beginPath();
            context.strokeStyle = '#ec9c9570';
            context.lineWidth = detailed ? 1.5 : 1;
            context.arc(casePosition.x * sx, casePosition.y * sy, detailed ? 25 : 10, 0, Math.PI * 2);
            context.stroke();
        }
        context.font = (detailed ? '700 13px' : '700 8px') + ' system-ui, sans-serif';
        for (const { x, y, icon, name, color } of Object.values(SERVICES)) {
            context.fillStyle = color;
            context.fillText(icon, x * sx - 3, y * sy);
            if (detailed) context.fillText(name, x * sx - 5, y * sy + 14);
        }
        for (const car of cars) oval(context, car.exploded ? '#696171' : '#d4b08e', car.x * sx, car.y * sy, 1.1, 1.1);
        if (trial) {
            const gate = trialGates[trial.gate];
            oval(context, '#b1f5de', gate.x * sx, gate.y * sy, 3.2, 3.2);
        }
        for (const unit of officers) {
            oval(context, '#8abcf1', unit.x * sx, unit.y * sy, detailed ? 3 : 1.5, detailed ? 3 : 1.5);
        }
        context.save();
        context.translate(player.x * sx, player.y * sy);
        context.rotate(ride?.angle ?? player.angle);
        context.fillStyle = '#fff5ea';
        context.beginPath();
        const size = detailed ? 8 : 4;
        context.moveTo(size, 0);
        context.lineTo(-size * .65, -size * .65);
        context.lineTo(-size * .30, 0);
        context.lineTo(-size * .65, size * .65);
        context.closePath();
        context.fill();
        context.restore();
        if (detailed) {
            context.fillStyle = '#f5e4d0';
            context.font = '700 13px system-ui, sans-serif';
            context.fillText('Гостиничный квартал', width * .22, height * .15);
            context.fillText('Марина', width * .49, height * .46);
            context.fillText('Пляж', width * .87, height * .47);
            context.fillText('Южный сквер', width * .16, height * .623);
            context.fillText('Квартал служб', width * .34, height * .765);
        }
    }

    function paintTiles(view) {
        const scale = low ? 1 : quality === 'high' ? 3 : 2;
        const firstX = Math.floor(view.x / tileSize);
        const firstY = Math.floor(view.y / tileSize);
        const lastX = Math.floor((view.x + VIEW_WIDTH - 1) / tileSize);
        const lastY = Math.floor((view.y + VIEW_HEIGHT - 1) / tileSize);
        for (let y = firstY; y <= lastY; y++) for (let x = firstX; x <= lastX; x++) {
            const textures = scale > 1 && roofTextures.naturalWidth ? roofTextures : null;
            const key = x + ':' + y + ':' + scale + ':' + Boolean(textures);
            let tile = tiles.get(key);
            if (!tile) {
                tile = document.createElement('canvas');
                tile.width = tile.height = tileSize * scale;
                const painter = tile.getContext('2d');
                painter.setTransform(scale, 0, 0, scale, -x * tileSize * scale, -y * tileSize * scale);
                paintCity(painter, { x: x * tileSize, y: y * tileSize, size: tileSize }, textures);
                if (tiles.size >= (low ? 8 : 12)) tiles.delete(tiles.keys().next().value);
            } else tiles.delete(key);
            tiles.set(key, tile);
            ctx.drawImage(tile, x * tileSize - view.x, y * tileSize - view.y, tileSize, tileSize);
        }
    }

    function render() {
        if (interior) {
            box(ctx, '#171d33', 0, 0, VIEW_WIDTH, VIEW_HEIGHT);
            box(ctx, '#626680', 56, 38, 336, 174, 4);
            box(ctx, '#b1928a', 64, 49, 320, 153, 2);
            for (let y = 50; y < 201; y += 10) {
                for (let x = 64; x < 382; x += 10) {
                    box(ctx, ((x + y) / 10 & 1) ? '#bba49d' : '#ab9291', x, y, 9.5, 9.5);
                }
            }
            box(ctx, '#51485f', 79, 66, 290, 20, 3);
            box(ctx, '#e4ba96', 79, 65, 290, 6, 1.3);
            box(ctx, '#725b73', 196, 186, 56, 16, 2);
            ctx.fillStyle = '#ffe3bf';
            ctx.font = '800 11px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(interior.door.title, 224, 58);
            ctx.textAlign = 'left';
            paintHero(ctx, { ...player, ...interior, heading: interior.angle, swing: 0 }, interior.x, interior.y, {});
            return;
        }
        if (custody) {
            paintCell();
            return;
        }
        const view = camera();
        ctx.save();
        ctx.translate(VIEW_WIDTH / 2, VIEW_HEIGHT / 2);
        ctx.scale(streetZoom, streetZoom);
        ctx.translate(-VIEW_WIDTH / 2, -VIEW_HEIGHT / 2);
        paintTiles(view);
        if (trial) {
            const gate = trialGates[trial.gate];
            ctx.beginPath();
            ctx.strokeStyle = '#a5f5d0b0';
            ctx.lineWidth = 2;
            ctx.ellipse(gate.x - view.x, gate.y - view.y, 18, 13, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        for (const point of roadblock ?? []) {
            const x = point.x - view.x, y = point.y - view.y;
            box(ctx, '#33344b', x - 8, y - 2, 16, 4, 1);
            for (let i = -7; i < 8; i += 5) box(ctx, '#eaa37d', x + i, y - 1.6, 2.5, 3.2, .3);
        }
        paintSurf(ctx, view, elapsed);
        for (const site of pickups) paintDumpster(ctx, site.x - view.x, site.y - view.y);
        for (const stain of stains) {
            ctx.save();
            ctx.translate(stain.x - view.x, stain.y - view.y);
            ctx.rotate(stain.angle);
            ctx.globalAlpha = Math.min(.8, (22 - stain.age) / 4);
            const spread = Math.min(stain.age * 17, 9);
            oval(ctx, '#883d55', 1, 1, 2.6, 1.25);
            for (let drop = 0; drop < 5; drop++) {
                const variance = Math.sin(stain.seed * 7 + drop * 4.1);
                oval(ctx, '#b34f65', .6 + spread * (drop + 1) / 5, variance * spread * .55, 1 - drop * .10, .48);
            }
            ctx.restore();
        }
        for (const npc of [...pedestrians, ...officers]) {
            if (npc.indoor > 0) continue;
            if (Math.abs(npc.x - view.x - VIEW_WIDTH / 2) > VIEW_WIDTH / 2 + 20
                || Math.abs(npc.y - view.y - VIEW_HEIGHT / 2) > VIEW_HEIGHT / 2 + 20) continue;
            paintPedestrian(ctx, npc, npc.x - view.x, npc.y - view.y);
        }
        for (const car of cars) {
            const x = car.x - view.x;
            const y = car.y - view.y;
            if (x < -45 || y < -45 || x > VIEW_WIDTH + 45 || y > VIEW_HEIGHT + 45) continue;
            paintVehicle(ctx, car, x, y);
            const stage = damageStage(car);
            if (stage === 'smoke' || stage === 'fire') {
                const rise = (elapsed * 13 + car.x) % 12;
                oval(ctx, '#3c3a5366', x + rise * .5, y - rise, 4 + rise * .27, 3.9);
                if (stage === 'fire') {
                    const pulse = .8 + Math.sin(elapsed * 14 + car.x) * .2;
                    oval(ctx, '#ff835c9e', x + 4, y, 8 * pulse, 5.8 * pulse);
                    oval(ctx, '#ffdb9dea', x + 4, y - 1, 4.1 * pulse, 3.2 * pulse);
                }
            }
        }
        for (const x of roadsX) for (const y of roadsY) {
            if (x < view.x - 45 || y < view.y - 45 || x > view.x + VIEW_WIDTH + 45 || y > view.y + VIEW_HEIGHT + 45) continue;
            const green = signalAt(elapsed, x, y);
            for (const [ox, oy, axis] of [[-34, -30, 'horizontal'], [34, 30, 'vertical']]) {
                box(ctx, '#232f3e', x + ox - view.x, y + oy - view.y, 4, 7, 1);
                oval(ctx, green === axis ? '#a8fac1' : '#f797a1', x + ox - view.x + 2, y + oy - view.y + 2.5, 1.2, 1.3);
            }
        }
        for (const effect of effects) {
            const t = effect.life / effect.max;
            ctx.save();
            ctx.globalAlpha = t;
            const x = effect.x - view.x;
            const y = effect.y - view.y;
            const range = effect.kind === 'blast' ? 12 + (1 - t) * 24 : 2 + (1 - t) * 7;
            oval(ctx, effect.kind === 'blast' ? '#f58575' : '#ffe3ab', x, y, range, range * .82);
            oval(ctx, '#fff2d5', x, y, range * .38, range * .32);
            ctx.restore();
        }
        if (!low) {
            for (let i = 0; i < 38; i++) {
                const x = (i * 73 + elapsed * 42) % (VIEW_WIDTH + 12);
                const y = (i * 53 + elapsed * 135) % VIEW_HEIGHT;
                box(ctx, '#afd4ec34', x, y, .65, 4);
            }
        }
        if (cruiser && !cruiser.delay) paintVehicle(ctx, cruiser, cruiser.x - view.x, cruiser.y - view.y);
        if (vehicleTransition && elapsed >= vehicleTransition.until) vehicleTransition = undefined;
        if (!ride && !vehicleTransition) {
            paintHero(ctx, player, player.x - view.x, player.y - view.y,
                { player: true, armed: equipped >= 3 && !reloadTime, knife: equipped === 2 && knife, reloading: reloadTime > 0 });
            if (muzzle > 0) {
                const x = player.x - view.x + Math.cos(player.angle) * 13;
                const y = player.y - view.y + Math.sin(player.angle) * 13;
                oval(ctx, '#ffbf7777', x, y, 5, 4);
                oval(ctx, '#fff4c1', x, y, 2.5, 1.75);
            }
        }
        if (vehicleTransition) {
            const { car, x, y, entering, until } = vehicleTransition;
            const fraction = Math.max(0, Math.min(1, (until - elapsed) / .32));
            const outside = entering ? fraction : 1 - fraction;
            const ax = car.x + (x - car.x) * outside;
            const ay = car.y + (y - car.y) * outside;
            const angle = Math.atan2(y - car.y, x - car.x);
            const open = Math.sin(Math.PI * fraction);
            ctx.save();
            ctx.translate(car.x - view.x, car.y - view.y);
            ctx.rotate(angle);
            box(ctx, car.color, 5, -1, 3 + open * 5, 2.7, .6);
            ctx.restore();
            if (outside > .28) paintHero(ctx, { ...player, heading: entering ? angle + Math.PI : angle,
                mountingPose: entering ? 2 : 3, stride: outside * 7, gait: 1.5 }, ax - view.x, ay - view.y, {});
        }
        for (const shot of shots) box(ctx, '#ffe1a4', shot.x - view.x, shot.y - view.y, 3, 2);
        ctx.restore();
        renderMap(mini, mapBase, false);
        if (downfall) {
            const shade = Math.min(.72, Math.max(0, (downfall.age - .65) * .52));
            box(ctx, 'rgba(20,14,30,' + shade + ')', 0, 0, VIEW_WIDTH, VIEW_HEIGHT);
            if (downfall.age > .72) {
                ctx.fillStyle = '#ffddce';
                ctx.textAlign = 'center';
                ctx.font = '800 13px system-ui';
                ctx.fillText('Потеря сознания', VIEW_WIDTH / 2, VIEW_HEIGHT * .76);
                ctx.textAlign = 'left';
            }
        }
    }

    function paintCell() {
        box(ctx, '#222941', 0, 0, VIEW_WIDTH, VIEW_HEIGHT);
        for (let y = 25; y < 236; y += 20) {
            for (let x = 60; x < 370; x += 20) {
                box(ctx, (x + y) % 40 ? '#353951' : '#373c55', x, y, 19, 19);
            }
        }
        box(ctx, '#12192c', 51, 15, 9, 221);
        box(ctx, '#12192c', 360, 15, 9, 221);
        box(ctx, '#141d33', 158, 27, 108, 13, 2);
        for (let x = 164; x < 263; x += 11) box(ctx, '#627695', x, 29, 2, 9, .5);
        box(ctx, '#c8d4da', 166, 37, 93, 1, .4);
        box(ctx, '#242c44', 88, 60, 60, 22, 2);
        box(ctx, '#7a849b', 87, 57, 58, 21, 2);
        box(ctx, '#bbc1c6', 89, 59, 17, 17, 2);
        box(ctx, '#4f6d83', 108, 60, 34, 16, 1);
        box(ctx, '#94a2ab', 109, 61, 2, 14, .4);
        box(ctx, '#646478', 279, 56, 36, 13, 2);
        box(ctx, '#a28e88', 281, 58, 32, 8, 1);
        paintActor(ctx, cell, cell.x, cell.y, {});
        for (let x = 60; x < 370; x += 16) box(ctx, '#1a243b', x, 187, 4, 33);
        box(ctx, '#67718b', 59, 190, 308, 4);
        box(ctx, '#67718b', 59, 215, 308, 4);
    }

    function toggleMap(visible) {
        if (visible && downfall) return;
        if ((custody || wheelOpen) && visible) return;
        mapOpen = visible;
        atlas.hidden = !visible;
        mapToggle.setAttribute('aria-expanded', String(visible));
        keys.clear();
        touch.reset();
        touch.panel.hidden = !running || visible;
        lastTime = undefined;
        if (visible) {
            audio.hum(null, false);
            drawAtlas();
            atlas.querySelector('.nb-atlas-back').focus();
        } else if (running) {
            canvas.focus();
        }
    }

    function drawAtlas() {
        fullMapContext.clearRect(0, 0, fullMap.width, fullMap.height);
        fullMapContext.save();
        fullMapContext.translate(panX + fullMap.width * (1 - zoom) / 2, panY + fullMap.height * (1 - zoom) / 2);
        fullMapContext.scale(zoom, zoom);
        renderMap(fullMapContext, atlasBase, true);
        fullMapContext.restore();
    }
    function changeZoom(direction) {
        zoom = Math.max(1, Math.min(4, zoom + direction * .45));
        if (zoom === 1) panX = panY = 0;
        drawAtlas();
    }
    atlas.querySelectorAll('[data-zoom]').forEach(button => {
        button.onclick = () => changeZoom(Number(button.dataset.zoom));
    });
    fullMap.addEventListener('pointerdown', event => {
        atlasDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
        try { fullMap.setPointerCapture(atlasDrag.id); } catch { /* Synthetic events. */ }
    }, { signal });
    fullMap.addEventListener('pointermove', event => {
        if (event.pointerId !== atlasDrag?.id || zoom === 1) return;
        const factor = fullMap.width / fullMap.getBoundingClientRect().width;
        const bound = fullMap.width * (zoom - 1) / 2;
        panX = Math.max(-bound, Math.min(bound, panX + (event.clientX - atlasDrag.x) * factor));
        panY = Math.max(-bound, Math.min(bound, panY + (event.clientY - atlasDrag.y) * factor));
        atlasDrag.x = event.clientX;
        atlasDrag.y = event.clientY;
        drawAtlas();
    }, { signal });
    fullMap.addEventListener('lostpointercapture', () => { atlasDrag = undefined; }, { signal });
    fullMap.addEventListener('wheel', event => { event.preventDefault(); changeZoom(Math.sign(-event.deltaY)); }, { signal, passive: false });

    function tick(time) {
        if (!running) return;
        const dt = lastTime === undefined ? 0 : Math.min((time - lastTime) / 1000, 0.04);
        lastTime = time;
        if (!mapOpen && !wheelOpen && !document.hidden) {
            const before = performance.now();
            elapsed += dt;
            update(dt);
            render();
            frameCost = frameCost * .96 + (performance.now() - before) * .04;
            if (quality === 'auto' && !low && frameCost > 22 && ++slowFrames > 70) {
                low = true;
                tiles.clear();
                setResolution();
            }
        }
        frame = requestAnimationFrame(tick);
    }

    function selectHero() {
        if (custody || downfall) return;
        if (wheelOpen) toggleWeapons(false);
        running = false;
        audio.hum(null, false);
        toggleMap(false);
        cancelAnimationFrame(frame);
        keys.clear();
        hud.hidden = true;
        weaponToggle.hidden = true;
        touch.panel.hidden = true;
        prompt.hidden = true;
        switchHero.hidden = true;
        mapToggle.hidden = true;
        selection.hidden = false;
        selection.querySelector('button').focus();
    }

    function start(hero, existingCustody) {
        cancelAnimationFrame(frame);
        selection.querySelector('h2').textContent = 'Выбери героя';
        selection.querySelectorAll('[data-hero]').forEach(button => { button.disabled = false; });
        player = { ...hero, x: 380, y: 359, angle: -Math.PI / 2, heading: -Math.PI / 2, stride: 0 };
        custody = existingCustody;
        downfall = undefined;
        cell = custody ? makePrisoner() : undefined;
        resetPolice();
        health = 100;
        immunity = 0;
        notice = '';
        noticeTime = 0;
        jail.hidden = !custody;
        mapToggle.disabled = Boolean(custody);
        switchHero.disabled = Boolean(custody);
        cars = createCars();
        ride = undefined;
        pickups = resetSearch();
        knife = false;
        equipped = 1;
        stains = [];
        effects = [];
        armor = 0;
        money = 200;
        delivery = false;
        magazine = new Map();
        reserves = new Map();
        reloadTime = 0;
        ammo = 0;
        pedestrians = createPedestrians();
        shots = [];
        cooldown = 0;
        hits = 0;
        pointer = undefined;
        lastTime = undefined;
        elapsed = 0;
        nextIncident = 32;
        eventIndex = 0;
        neighborhoodEvent = undefined;
        taxiFare = false;
        vehicleTransition = undefined;
        interior = undefined;
        trial = undefined;
        cameraSeeded = false;
        shake = 0;
        streetZoom = 1;
        footSpeed = 0;
        lawClock = 0;
        keys.clear();
        dialog.querySelector('.nb-hero').textContent = hero.name;
        refreshHud();
        selection.hidden = true;
        hud.hidden = Boolean(custody);
        switchHero.hidden = false;
        mapToggle.hidden = false;
        weaponToggle.hidden = false;
        touch.panel.hidden = false;
        running = true;
        canvas.focus();
        update(0);
        render();
        frame = requestAnimationFrame(tick);
    }

    selection.querySelectorAll('[data-hero]').forEach((button) => {
        const index = Number(button.dataset.hero);
        paintPortrait(button.querySelector('canvas'), HEROES[index]);
        button.onclick = () => {
            const saved = pendingCustody;
            if (saved && saved.until > Date.now() && saved.hero !== HEROES[index].name) return;
            pendingCustody = undefined;
            if (saved && saved.until <= Date.now()) setCustody(undefined);
            start(HEROES[index], saved && saved.until > Date.now() ? saved : undefined);
        };
    });
    switchHero.onclick = selectHero;
    mapToggle.onclick = () => toggleMap(!mapOpen);
    atlas.querySelector('.nb-atlas-back').onclick = () => toggleMap(false);
    weaponToggle.onclick = () => toggleWeapons(!wheelOpen);
    ['Кулаки', 'Нож', ...WEAPONS.slice(3).map(item => item.name)].forEach((name, index) => {
        const slot = index + 1;
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.slot = slot;
        button.textContent = slot + ' · ' + name;
        button.onclick = () => { selectSlot(slot); toggleWeapons(false); };
        arsenal.querySelector('div').append(button);
    });
    const capture = { capture: true, signal: controller.signal };
    window.addEventListener('keydown', (event) => {
        if (!dialog.open || !dialog.contains(event.target)) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.code === 'Escape' || (running && event.code === 'KeyM')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (event.code === 'Escape') {
                if (wheelOpen) toggleWeapons(false);
                else if (mapOpen) toggleMap(false);
                else dialog.close();
            } else if (!event.repeat) toggleMap(!mapOpen);
            return;
        }
        if (running && event.code === 'KeyQ' && !event.repeat) {
            event.preventDefault();
            event.stopImmediatePropagation();
            toggleWeapons(!wheelOpen);
            return;
        }
        if (!running || downfall || mapOpen || wheelOpen || event.target !== canvas
            || (!moveKeys.has(event.code) && !['Space', 'KeyE', 'KeyF', 'KeyR', 'KeyH', 'ShiftLeft', 'ShiftRight'].includes(event.code) && !/^Digit[1-9]$/.test(event.code))) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (custody) {
            if (moveKeys.has(event.code)) keys.add(event.code);
            return;
        }
        if (event.code.startsWith('Digit')) {
            const slot = Number(event.code.at(-1));
            selectSlot(slot);
            return;
        }
        if (event.code === 'KeyR') { reload(); return; }
        if (event.code === 'KeyH') { if (ride && !event.repeat) audio.tone('horn'); return; }
        if (event.code === 'KeyE' || event.code === 'KeyF') {
            if (!event.repeat) {
                if (event.code === 'KeyE') interact(event.shiftKey);
                else punch();
            }
            return;
        }
        keys.add(event.code);
    }, capture);
    window.addEventListener('keyup', (event) => {
        if (keys.delete(event.code)) event.stopImmediatePropagation();
    }, capture);
    window.addEventListener('blur', () => keys.clear(), { signal: controller.signal });
    document.addEventListener('visibilitychange', () => {
        keys.clear();
        touch.reset();
        lastTime = undefined;
        if (document.hidden) audio.hum(null, false);
    }, { signal });
    canvas.addEventListener('blur', () => keys.clear());
    function aim(event) {
        const bounds = canvas.getBoundingClientRect();
        pointer = {
            x: ((event.clientX - bounds.left) * VIEW_WIDTH / bounds.width - VIEW_WIDTH / 2) / streetZoom + VIEW_WIDTH / 2,
            y: ((event.clientY - bounds.top) * VIEW_HEIGHT / bounds.height - VIEW_HEIGHT / 2) / streetZoom + VIEW_HEIGHT / 2,
        };
        if (!running) return;
        const view = camera();
        player.angle = Math.atan2(view.y + pointer.y - player.y, view.x + pointer.x - player.x);
    }
    canvas.addEventListener('pointermove', aim);
    canvas.addEventListener('pointerleave', () => { pointer = undefined; });
    canvas.addEventListener('pointerdown', (event) => {
        if (!running || event.button !== 0) return;
        canvas.focus();
        aim(event);
        attack();
    });

    paintMap(mapBase.getContext('2d'), mapBase.width, mapBase.height);
    paintMap(atlasBase.getContext('2d'), atlasBase.width, atlasBase.height);
    paintTiles({ x: WIDTH - VIEW_WIDTH, y: 700 });
    const saved = readCustody();
    const detained = saved && saved.until > Date.now() && HEROES.some(hero => hero.name === saved.hero);
    if (detained) {
        pendingCustody = saved;
        selection.querySelector('h2').textContent = 'Выбери героя · срок в камере ещё идёт';
        const enable = () => {
            if (!pendingCustody || pendingCustody.until > Date.now()) return;
            pendingCustody = undefined;
            setCustody(undefined);
            selection.querySelector('h2').textContent = 'Выбери героя';
            selection.querySelectorAll('[data-hero]').forEach(button => { button.disabled = false; });
        };
        selection.querySelectorAll('[data-hero]').forEach(button => {
            button.disabled = HEROES[Number(button.dataset.hero)].name !== saved.hero;
        });
        const timeout = window.setTimeout(enable, Math.max(0, saved.until - Date.now()) + 10);
        signal.addEventListener('abort', () => window.clearTimeout(timeout), { once: true });
    } else if (saved) setCustody(undefined);
    return () => {
        running = false;
        cancelAnimationFrame(frame);
        controller.abort();
        audio.dispose();
        tiles.clear();
        effects.length = pool.length = 0;
    };
}
