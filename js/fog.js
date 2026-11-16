/**
 * ÉTER — Sistema Cinemático de Nieblas y Neblinas Planetarias
 * ---------------------------------------------------------------------------
 * - Neblinas localizadas y temporales en planetas con atmósfera (mayor o menor
 *   frecuencia según categoría, bioma y personalidad del mundo).
 * - Neblinas perpetuas multicapa en planetas de categoría Brumoso (classId: 'misty').
 * - Alto rendimiento mediante plantillas offscreen cacheadas (cero gradientes por frame).
 * - Interacción volumétrica con la llamarada del cohete y plasma de reentrada:
 *   dispersión luminosa tipo Tyndall/Mie y remolinos de vapor iluminados.
 */

const _fogMaskTemplates = [];
const _fogSpriteCache = new Map();
const _fogScatterSpriteCache = new Map();
const FOG_SWIRL_PARTICLES = [];
let _fogSwirlPlanetKey = null;

function fogClamp(v, min, max) { return v < min ? min : (v > max ? max : v); }
function fogLerp(a, b, t) { return a + (b - a) * t; }
function fogSmoothstep(e0, e1, x) {
    const t = fogClamp((x - e0) / (e1 - e0 || 1), 0, 1);
    return t * t * (3 - 2 * t);
}
function fogWrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
function fogLerpRGB(c1, c2, t) {
    const k = fogClamp(t, 0, 1);
    return [
        Math.round(c1[0] + (c2[0] - c1[0]) * k),
        Math.round(c1[1] + (c2[1] - c1[1]) * k),
        Math.round(c1[2] + (c2[2] - c1[2]) * k)
    ];
}

/**
 * Pre-genera 4 máscaras sedosas de neblina (estratos alargados y bancos algodonosos)
 * con bordes 100% difuminados para evitar cualquier círculo duro o artefacto.
 */
function getFogMaskTemplates() {
    if (_fogMaskTemplates.length > 0) return _fogMaskTemplates;

    const specs = [
        { w: 224, h: 96, lobes: 9, seed: 401 },
        { w: 224, h: 96, lobes: 11, seed: 917 },
        { w: 192, h: 112, lobes: 10, seed: 1543 },
        { w: 160, h: 112, lobes: 8, seed: 2207 }
    ];

    for (let v = 0; v < specs.length; v++) {
        const sp = specs[v];
        let s = sp.seed;
        const rand = () => {
            s = (Math.imul(s, 1664525) + 1013904223) | 0;
            return (s >>> 0) / 4294967296;
        };

        const c = document.createElement('canvas');
        c.width = sp.w;
        c.height = sp.h;
        const g = c.getContext('2d');

        // Núcleo sedoso horizontal muy alargado
        g.save();
        g.translate(sp.w * 0.5, sp.h * 0.5);
        g.scale(1.0, sp.h / sp.w);
        const coreR = sp.w * 0.44;
        const coreG = g.createRadialGradient(0, 0, 2, 0, 0, coreR);
        coreG.addColorStop(0.00, 'rgba(255,255,255,0.62)');
        coreG.addColorStop(0.42, 'rgba(255,255,255,0.34)');
        coreG.addColorStop(0.75, 'rgba(255,255,255,0.10)');
        coreG.addColorStop(1.00, 'rgba(255,255,255,0.0)');
        g.fillStyle = coreG;
        g.beginPath();
        g.arc(0, 0, coreR, 0, Math.PI * 2);
        g.fill();
        g.restore();

        // Lóbulos de neblina superpuestos suavemente
        for (let i = 0; i < sp.lobes; i++) {
            const u = (i / Math.max(1, sp.lobes - 1)) * 2 - 1;
            const lx = sp.w * (0.5 + u * 0.28 + (rand() - 0.5) * 0.08);
            const ly = sp.h * (0.5 + (rand() - 0.5) * 0.24);
            const rx = sp.w * (0.16 + rand() * 0.14);
            const ry = sp.h * (0.24 + rand() * 0.18);
            const alpha = 0.20 + rand() * 0.22;

            g.save();
            g.translate(lx, ly);
            g.scale(1.0, ry / rx);
            const lg = g.createRadialGradient(0, 0, 1, 0, 0, rx);
            lg.addColorStop(0.00, `rgba(255,255,255,${alpha.toFixed(2)})`);
            lg.addColorStop(0.55, `rgba(255,255,255,${(alpha * 0.45).toFixed(2)})`);
            lg.addColorStop(1.00, 'rgba(255,255,255,0)');
            g.fillStyle = lg;
            g.beginPath();
            g.arc(0, 0, rx, 0, Math.PI * 2);
            g.fill();
            g.restore();
        }

        _fogMaskTemplates.push(c);
    }

    return _fogMaskTemplates;
}

/**
 * Devuelve un sprite de neblina pre-teñido en caché (cuantizado para altísimo rendimiento).
 */
function getFogMistSprite(r, g, b, variant = 0) {
    const qr = Math.min(255, Math.max(0, (Math.round(r / 16) * 16) | 0));
    const qg = Math.min(255, Math.max(0, (Math.round(g / 16) * 16) | 0));
    const qb = Math.min(255, Math.max(0, (Math.round(b / 16) * 16) | 0));
    const v = variant & 3;
    const key = ((qr & 255) << 18) | ((qg & 255) << 10) | ((qb & 255) << 2) | v;

    let sp = _fogSpriteCache.get(key);
    if (sp) return sp;

    if (_fogSpriteCache.size >= 140) {
        _fogSpriteCache.delete(_fogSpriteCache.keys().next().value);
    }

    const mask = getFogMaskTemplates()[v];
    sp = document.createElement('canvas');
    sp.width = mask.width;
    sp.height = mask.height;
    const sctx = sp.getContext('2d');

    sctx.fillStyle = `rgb(${qr}, ${qg}, ${qb})`;
    sctx.fillRect(0, 0, sp.width, sp.height);
    sctx.globalCompositeOperation = 'destination-in';
    sctx.drawImage(mask, 0, 0);
    sctx.globalCompositeOperation = 'source-over';

    _fogSpriteCache.set(key, sp);
    return sp;
}

/**
 * Devuelve un halo aditivo suave pre-renderizado para dispersión de la llamarada en la niebla.
 */
function getFogScatterSprite(rgb) {
    const qr = Math.min(255, Math.max(0, (Math.round(rgb[0] / 16) * 16) | 0));
    const qg = Math.min(255, Math.max(0, (Math.round(rgb[1] / 16) * 16) | 0));
    const qb = Math.min(255, Math.max(0, (Math.round(rgb[2] / 16) * 16) | 0));
    const key = (qr << 16) | (qg << 8) | qb;

    let sp = _fogScatterSpriteCache.get(key);
    if (sp) return sp;

    if (_fogScatterSpriteCache.size >= 32) {
        _fogScatterSpriteCache.delete(_fogScatterSpriteCache.keys().next().value);
    }

    const size = 128;
    const half = 64;
    sp = document.createElement('canvas');
    sp.width = size;
    sp.height = size;
    const sctx = sp.getContext('2d');

    const grad = sctx.createRadialGradient(half, half, 2, half, half, half - 2);
    grad.addColorStop(0.00, `rgba(255, 250, 244, 0.85)`);
    grad.addColorStop(0.22, `rgba(${qr}, ${qg}, ${qb}, 0.68)`);
    grad.addColorStop(0.55, `rgba(${qr}, ${qg}, ${qb}, 0.24)`);
    grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = grad;
    sctx.beginPath();
    sctx.arc(half, half, half - 2, 0, Math.PI * 2);
    sctx.fill();

    _fogScatterSpriteCache.set(key, sp);
    return sp;
}

/**
 * Inicializa el sistema de nieblas y neblinas de un planeta.
 */
function initPlanetFog(planet, rng) {
    if (!planet) return;
    if (planet.fog && planet.fog.initialized) return;

    const prng = (typeof rng === 'function') ? rng : Math.random;
    const arch = planet.archetype || {};
    const atmoDepth = Math.max(0, (planet.atmoRadius || 0) - (planet.radius || 0));
    const atmoDens = planet.atmoDensity !== undefined ? planet.atmoDensity : (arch.atmoDensity || 1.0);
    const profile = (typeof wxResolveFogProfile === 'function')
        ? wxResolveFogProfile(arch)
        : { id: 'moderate_temporal', perpetual: false, bankCount: [1, 3], density: [0.35, 0.62], duration: [35, 75], spawnChance: 0.5, altRange: [-10, 50], thickness: [80, 150], dayColor: [226, 238, 248], twilightColor: [248, 186, 150], nightGlow: [34, 48, 72], nightGlowStrength: 0.12 };

    const isAirlessOrGas = profile.id === 'none' || atmoDepth < 140 || atmoDens < 0.10 ||
        (planet.sizeClass && planet.sizeClass.id === 'micro' && atmoDens < 0.25) ||
        arch.isLiquid && (arch.id || '').includes('gas');

    if (isAirlessOrGas) {
        planet.fog = {
            initialized: true,
            hasFog: false,
            isPerpetual: false,
            profile,
            personalityMult: 0,
            personalityLabel: 'Sin Neblina',
            perpetualBands: [],
            banks: []
        };
        return;
    }

    const isPerpetual = !!profile.perpetual;
    let personalityMult = 1.0;
    let personalityLabel = 'Neblina Moderada';

    if (isPerpetual) {
        personalityMult = fogLerp(0.95, 1.22, prng());
        personalityLabel = 'Niebla Perpetua';
    } else if (planet.isOrigin) {
        personalityMult = 0.85;
        personalityLabel = 'Brumas Localizadas';
    } else {
        const roll = prng();
        if (roll < 0.25) {
            personalityMult = fogLerp(0.32, 0.62, prng());
            personalityLabel = 'Poca Neblina';
        } else if (roll < 0.72) {
            personalityMult = fogLerp(0.82, 1.18, prng());
            personalityLabel = 'Neblinas Temporales';
        } else {
            personalityMult = fogLerp(1.28, 1.65, prng());
            personalityLabel = 'Muy Brumoso';
        }
    }

    const sizeFactor = fogClamp(Math.sqrt(Math.max(0.45, (planet.radius || 2600) / 2600)), 0.60, 1.65);

    const fogState = {
        initialized: true,
        hasFog: true,
        isPerpetual,
        profile,
        personalityMult,
        personalityLabel,
        sizeFactor,
        cycleTimer: 22 + prng() * 38,
        cycleDuration: 45 + prng() * 45,
        globalHumidity: isPerpetual ? 1.0 : fogLerp(0.42, 0.98, prng()),
        targetHumidity: isPerpetual ? 1.0 : fogLerp(0.38, 0.98, prng()),
        perpetualBands: [],
        banks: []
    };

    planet.fog = fogState;

    // 1. Estratos continuos perpetuos en planetas de categoría 'misty'
    if (isPerpetual) {
        const bandCount = Math.max(12, Math.min(20, Math.round(14 * sizeFactor)));
        for (let i = 0; i < bandCount; i++) {
            const bandAng = (i / bandCount) * Math.PI * 2 + (prng() - 0.5) * 0.14;
            const span = ((Math.PI * 2) / bandCount) * fogLerp(1.15, 1.55, prng());
            const layerIdx = i % 3;
            const altOffset = layerIdx === 0 ? fogLerp(-16, 18, prng()) : (layerIdx === 1 ? fogLerp(24, 72, prng()) : fogLerp(74, 138, prng()));
            const thickness = layerIdx === 0 ? fogLerp(120, 175, prng()) : (layerIdx === 1 ? fogLerp(145, 220, prng()) : fogLerp(150, 240, prng()));
            const baseDensity = layerIdx === 0 ? fogLerp(0.62, 0.85, prng()) : (layerIdx === 1 ? fogLerp(0.48, 0.72, prng()) : fogLerp(0.30, 0.50, prng()));

            fogState.perpetualBands.push({
                angle: fogWrapAngle(bandAng),
                angularSpan: span,
                altOffset,
                thickness,
                baseDensity,
                driftSpeed: (prng() > 0.3 ? 1 : -1) * fogLerp(0.0008, 0.0028, prng()) / Math.max(0.6, sizeFactor),
                breathePhase: prng() * Math.PI * 2,
                breatheSpeed: fogLerp(0.18, 0.42, prng()),
                wisps: buildFogBankWisps(10, true, prng)
            });
        }
    }

    // 2. Bancos de neblina localizados y temporales
    const bMin = profile.bankCount[0] || 0;
    const bMax = profile.bankCount[1] || 2;
    const rawCount = fogLerp(bMin, bMax, prng()) * personalityMult * (isPerpetual ? 1.0 : fogState.globalHumidity);
    const initialBanks = isPerpetual
        ? Math.max(6, Math.min(12, Math.round(rawCount * sizeFactor)))
        : Math.min(8, Math.round(rawCount * sizeFactor));

    for (let i = 0; i < initialBanks; i++) {
        const bank = createLocalizedFogBank(planet, prng, true);
        if (bank) fogState.banks.push(bank);
    }
}

/**
 * Construye la estructura interna de jirones sedosos de un banco de niebla.
 */
function buildFogBankWisps(count, includeForeground, rng) {
    const wisps = [];
    for (let i = 0; i < count; i++) {
        const u = (count > 1 ? (i / (count - 1)) - 0.5 : 0) * 1.65 + (rng() - 0.5) * 0.24;
        const v = rng();
        const isForeground = includeForeground && (i % 3 === 1);
        wisps.push({
            u,
            v,
            scaleX: fogLerp(1.10, 1.85, rng()),
            scaleY: fogLerp(0.62, 1.15, rng()),
            alpha: isForeground ? fogLerp(0.24, 0.42, rng()) : fogLerp(0.50, 0.85, rng()),
            spriteIdx: Math.floor(rng() * 4),
            phase: rng() * Math.PI * 2,
            driftAmp: fogLerp(0.03, 0.09, rng()),
            bobAmp: fogLerp(4, 12, rng()),
            isForeground
        });
    }
    return wisps;
}

/**
 * Elige una zona natural propicia para condensar neblina localizada (lagos, valles o terminador).
 */
function pickFogSpawnAngle(planet, rng) {
    // 1. Preferencia frecuente por lagos y cuencas húmedas
    if (planet.lakes && planet.lakes.length > 0 && rng() < 0.46) {
        const lk = planet.lakes[Math.floor(rng() * planet.lakes.length)];
        if (lk) return fogWrapAngle(lk.centerAngle + (rng() - 0.5) * (lk.span || 0.08) * 1.4);
    }

    // 2. Preferencia por zonas frescas del amanecer / crepúsculo (terminador)
    if (planet.lightAngle !== undefined && rng() < 0.35) {
        const side = rng() < 0.5 ? 1 : -1;
        return fogWrapAngle(planet.lightAngle + side * (Math.PI * 0.5) + (rng() - 0.5) * 0.55);
    }

    // 3. Buscar un valle o depresión topográfica probando 5 muestras aleatorias
    let bestAng = rng() * Math.PI * 2 - Math.PI;
    if (typeof getSurfaceRadius === 'function' && planet.heights && planet.heights.length > 0) {
        let lowestR = Infinity;
        for (let k = 0; k < 5; k++) {
            const cand = rng() * Math.PI * 2 - Math.PI;
            const sr = getSurfaceRadius(planet, cand);
            if (sr < lowestR) {
                lowestR = sr;
                bestAng = cand;
            }
        }
    }

    // En Cuna del Éter evitar tapar la plataforma inicial en los primeros bancos iniciales
    if (planet.isOrigin && Math.abs(fogWrapAngle(bestAng + Math.PI * 0.5)) < 0.16 && rng() < 0.72) {
        bestAng = fogWrapAngle(bestAng + (rng() < 0.5 ? 0.38 : -0.38));
    }

    return fogWrapAngle(bestAng);
}

/**
 * Crea un banco de niebla localizado y temporal.
 */
function createLocalizedFogBank(planet, rng, staggerLife = false) {
    const f = planet.fog;
    if (!f || !f.hasFog) return null;

    const prng = (typeof rng === 'function') ? rng : Math.random;
    const profile = f.profile;
    const radius = planet.radius || 2600;

    const angle = pickFogSpawnAngle(planet, prng);
    const widthPx = f.isPerpetual
        ? fogLerp(750, 1550, prng()) * Math.sqrt(f.sizeFactor)
        : fogLerp(420, 1150, prng()) * Math.sqrt(f.sizeFactor);
    const angularSpan = fogClamp(widthPx / Math.max(600, radius), 0.04, 0.58);

    const altOffset = fogLerp(profile.altRange[0], profile.altRange[1], prng());
    const thickness = fogLerp(profile.thickness[0], profile.thickness[1], prng()) * fogClamp(0.85 + 0.15 * f.sizeFactor, 0.75, 1.35);
    const peakDensity = fogClamp(
        fogLerp(profile.density[0], profile.density[1], prng()) * fogClamp(0.65 + 0.35 * f.personalityMult, 0.38, 1.15),
        0.18,
        0.96
    );

    const durMin = profile.duration[0] || 30;
    const durMax = profile.duration[1] || 75;
    const maxLife = fogLerp(durMin, durMax, prng());
    const life = staggerLife ? maxLife * fogLerp(0.25, 0.90, prng()) : maxLife;
    const fadeIn = Math.min(maxLife * 0.28, fogLerp(9, 18, prng()));
    const fadeOut = Math.min(maxLife * 0.32, fogLerp(11, 22, prng()));

    // Deriva suave siguiendo la dirección dominante del viento planetario
    const windDir = (planet.wind && planet.wind.dominantDir) ? planet.wind.dominantDir : (prng() < 0.5 ? 1 : -1);
    const windSpdBase = (planet.weather && planet.weather.windBase) ? Math.abs(planet.weather.windBase) : 18;
    const tangVel = fogClamp(windSpdBase * 0.32, 4, 24) * (prng() < 0.82 ? windDir : -windDir);
    const angVel = tangVel / Math.max(800, radius + altOffset);

    const wispCount = f.isPerpetual ? (9 + Math.floor(prng() * 4)) : (7 + Math.floor(prng() * 4));

    return {
        angle,
        angularSpan,
        widthPx,
        altOffset,
        thickness,
        peakDensity,
        life,
        maxLife,
        fadeIn,
        fadeOut,
        angVel,
        growth: staggerLife ? 1.0 : 0.02,
        seed: prng() * 1000,
        wisps: buildFogBankWisps(wispCount, true, prng)
    };
}

/**
 * Actualiza bancos temporales de neblina, ciclos de humedad y remolinos agitados por el cohete.
 */
function updatePlanetFog(planet, dt, ship, cosmosSimTime) {
    const f = planet && planet.fog;
    if (!f || !f.hasFog) return;

    const profile = f.profile;

    // 1. Ciclo global de humedad / periodos con más o menos neblinas
    if (!f.isPerpetual) {
        f.cycleTimer -= dt;
        if (f.cycleTimer <= 0) {
            f.cycleTimer = f.cycleDuration * (0.7 + Math.random() * 0.6);
            // Alternar entre olas de bruma y claros atmosféricos
            const mistyPhase = Math.random() < (profile.spawnChance * fogClamp(f.personalityMult, 0.4, 1.3));
            f.targetHumidity = mistyPhase ? fogLerp(0.65, 1.0, Math.random()) : fogLerp(0.12, 0.45, Math.random());
        }
        f.globalHumidity = fogLerp(f.globalHumidity, f.targetHumidity, dt * 0.14);
    }

    // 2. Deriva de estratos perpetuos en planetas 'misty'
    if (f.isPerpetual && f.perpetualBands) {
        for (let i = 0; i < f.perpetualBands.length; i++) {
            const b = f.perpetualBands[i];
            b.angle = fogWrapAngle(b.angle + b.driftSpeed * dt);
        }
    }

    // 3. Ciclo de vida y deriva suave de bancos localizados
    for (let i = f.banks.length - 1; i >= 0; i--) {
        const bk = f.banks[i];
        bk.angle = fogWrapAngle(bk.angle + bk.angVel * dt);
        bk.life -= dt;
        const age = bk.maxLife - bk.life;

        if (age < bk.fadeIn) {
            bk.growth = fogSmoothstep(0, bk.fadeIn, age);
        } else if (bk.life < bk.fadeOut) {
            bk.growth = fogSmoothstep(0, bk.fadeOut, bk.life);
        } else {
            bk.growth = 1.0;
        }

        if (bk.life <= 0) {
            f.banks.splice(i, 1);
        }
    }

    // 4. Condensación de nuevas neblinas temporales según perfil, personalidad y humedad
    const bMin = profile.bankCount[0] || 0;
    const bMax = profile.bankCount[1] || 2;
    const baseDesired = f.isPerpetual
        ? fogLerp(bMin, bMax, 0.72) * f.sizeFactor
        : fogLerp(bMin, bMax, f.globalHumidity) * f.personalityMult * f.sizeFactor;
    const desiredBanks = f.isPerpetual
        ? Math.max(6, Math.min(12, Math.round(baseDesired)))
        : Math.min(9, Math.round(baseDesired));

    if (f.banks.length < desiredBanks) {
        const spawnProb = f.isPerpetual ? 0.55 : (0.14 * (profile.spawnChance || 0.5) * f.personalityMult);
        if (Math.random() < spawnProb * Math.max(0.5, dt * 60)) {
            const newBank = createLocalizedFogBank(planet, Math.random, false);
            if (newBank) f.banks.push(newBank);
        }
    }

    // 5. Remolinos de niebla iluminados por la llamarada del cohete activo
    if (ship && ship.nearestPlanet === planet) {
        if (_fogSwirlPlanetKey !== planet.key) {
            FOG_SWIRL_PARTICLES.length = 0;
            _fogSwirlPlanetKey = planet.key;
        }

        const localFog = ship.localFogDensity || 0;
        const isFiring = !!(
            (ship.thrustIntensity > 0.08 || (ship.warping && (ship.fuel > 0 || ship.infiniteFuel))) &&
            (ship.fuel > 0 || ship.godMode || ship.infiniteFuel)
        );

        if (isFiring && localFog > 0.07 && FOG_SWIRL_PARTICLES.length < 44) {
            const spawnChance = fogClamp(localFog * ship.thrustIntensity * 0.95, 0.08, 0.85);
            if (Math.random() < spawnChance) {
                const sScale = ship.scale || 1.0;
                const flameInfo = (typeof getRocketFlameInfo === 'function')
                    ? getRocketFlameInfo(ship)
                    : { rgb: [251, 175, 60] };
                const backAng = ship.angle + Math.PI + (Math.random() - 0.5) * 0.95;
                const nozX = ship.x - Math.cos(ship.angle) * (16 * sScale);
                const nozY = ship.y - Math.sin(ship.angle) * (16 * sScale);
                const perpAng = backAng + (Math.random() < 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5);
                const ejSpd = (45 + Math.random() * 70) * fogClamp(ship.thrustIntensity, 0.4, 1.3);
                const sideSpd = (26 + Math.random() * 44) * (Math.random() < 0.5 ? 1 : -1);

                FOG_SWIRL_PARTICLES.push({
                    x: nozX + Math.cos(backAng) * (14 + Math.random() * 24) * sScale,
                    y: nozY + Math.sin(backAng) * (14 + Math.random() * 24) * sScale,
                    vx: ship.vx * 0.16 + Math.cos(backAng) * ejSpd + Math.cos(perpAng) * sideSpd,
                    vy: ship.vy * 0.16 + Math.sin(backAng) * ejSpd + Math.sin(perpAng) * sideSpd,
                    size: (26 + Math.random() * 30) * Math.max(0.85, sScale * 0.85),
                    growRate: 28 + Math.random() * 22,
                    alpha: fogClamp(0.22 + localFog * 0.34, 0.18, 0.52),
                    life: 1.2 + Math.random() * 0.9,
                    maxLife: 2.1,
                    rot: Math.random() * Math.PI * 2,
                    rotVel: (Math.random() - 0.5) * 0.85,
                    spriteIdx: Math.floor(Math.random() * 4),
                    fogRGB: ship.localFogColor || profile.dayColor || [224, 240, 248],
                    fireRGB: flameInfo.rgb || [251, 175, 60]
                });
            }
        }

        for (let i = FOG_SWIRL_PARTICLES.length - 1; i >= 0; i--) {
            const sw = FOG_SWIRL_PARTICLES[i];
            sw.x += sw.vx * dt;
            sw.y += sw.vy * dt;
            sw.vx *= Math.max(0, 1 - dt * 1.45);
            sw.vy *= Math.max(0, 1 - dt * 1.45);
            sw.size += sw.growRate * dt;
            sw.rot += sw.rotVel * dt;
            sw.life -= dt;
            if (sw.life <= 0) {
                FOG_SWIRL_PARTICLES.splice(i, 1);
            }
        }
    }
}

/**
 * Muestrea de manera continua y suave la densidad de neblina local (0..1) y su color
 * en cualquier punto (x, y) alrededor del planeta.
 */
function samplePlanetFog(planet, obsX, obsY) {
    const f = planet && planet.fog;
    if (!f || !f.hasFog) {
        return { density: 0, color: [224, 240, 248], nightGlow: 0 };
    }

    const dx = obsX - planet.x;
    const dy = obsY - planet.y;
    const dist = Math.hypot(dx, dy);
    const obsAng = Math.atan2(dy, dx);
    const surfR = (typeof getSurfaceRadius === 'function' && planet.heights && planet.heights.length > 0)
        ? getSurfaceRadius(planet, obsAng)
        : planet.radius;
    const alt = dist - surfR;

    if (alt > 460 || alt < -80) {
        return { density: 0, color: f.profile.dayColor || [224, 240, 248], nightGlow: 0 };
    }

    let rawDensity = 0;

    if (f.isPerpetual && f.perpetualBands) {
        for (let i = 0; i < f.perpetualBands.length; i++) {
            const b = f.perpetualBands[i];
            const dAng = Math.abs(fogWrapAngle(obsAng - b.angle));
            const halfSpan = b.angularSpan * 0.65;
            if (dAng > halfSpan) continue;
            const angW = fogSmoothstep(halfSpan, halfSpan * 0.15, dAng);
            const vMin = b.altOffset - 35;
            const vMax = b.altOffset + b.thickness + 65;
            if (alt < vMin || alt > vMax) continue;
            const altW = fogSmoothstep(vMin, b.altOffset + b.thickness * 0.22, alt) *
                         fogSmoothstep(vMax, b.altOffset + b.thickness * 0.65, alt);
            rawDensity += b.baseDensity * angW * altW;
        }
    }

    if (f.banks) {
        for (let i = 0; i < f.banks.length; i++) {
            const bk = f.banks[i];
            if (!bk || bk.growth <= 0.01) continue;
            const dAng = Math.abs(fogWrapAngle(obsAng - bk.angle));
            const halfSpan = bk.angularSpan * 0.85;
            if (dAng > halfSpan) continue;
            const angW = fogSmoothstep(halfSpan, halfSpan * 0.12, dAng);
            const vMin = bk.altOffset - 35;
            const vMax = bk.altOffset + bk.thickness + 65;
            if (alt < vMin || alt > vMax) continue;
            const altW = fogSmoothstep(vMin, bk.altOffset + bk.thickness * 0.25, alt) *
                         fogSmoothstep(vMax, bk.altOffset + bk.thickness * 0.68, alt);
            rawDensity += bk.peakDensity * bk.growth * angW * altW;
        }
    }

    // Piso mínimo garantizado en la superficie de planetas perpetuos para continuidad sedosa
    if (f.isPerpetual && alt < 240) {
        const floorFade = fogSmoothstep(240, 20, alt);
        rawDensity = Math.max(rawDensity, 0.78 * floorFade);
    }

    const density = fogClamp(1 - Math.exp(-rawDensity * 1.12), 0, 1);
    return {
        density,
        color: f.profile.dayColor || [224, 240, 248],
        nightGlow: f.profile.nightGlowStrength || 0
    };
}

/**
 * Helper interno para resolver parámetros de luz solar y llama activa del cohete.
 */
function _getFogRenderContext(planet) {
    const camX = (typeof camera !== 'undefined' && camera) ? camera.x : 0;
    const camY = (typeof camera !== 'undefined' && camera) ? camera.y : 0;
    const camZoom = (typeof camera !== 'undefined' && camera && camera.zoom) ? camera.zoom : 1;
    const sW = (typeof screenW !== 'undefined') ? screenW : 1200;
    const sH = (typeof screenH !== 'undefined') ? screenH : 800;
    const viewLimit = (Math.max(sW, sH) / Math.max(0.2, camZoom)) + 850;

    const curShip = (typeof ship !== 'undefined' && ship) ? ship : null;
    const sScale = curShip ? (curShip.scale || 1.0) : 1.0;

    const isEngineFiring = !!(curShip && (
        (curShip.thrustIntensity > 0.03 || curShip.thrusting || (curShip.warping && (curShip.fuel > 0 || curShip.infiniteFuel))) &&
        (curShip.fuel > 0 || curShip.godMode || curShip.infiniteFuel)
    ));

    let flameInfo = null;
    let flameX = 0, flameY = 0, flameRadius = 0;
    if (isEngineFiring) {
        flameInfo = (typeof getRocketFlameInfo === 'function')
            ? getRocketFlameInfo(curShip)
            : { rgb: [251, 175, 60], highlightRGB: [254, 240, 138] };
        const nozDist = 16 * sScale;
        const nozX = curShip.x - Math.cos(curShip.angle) * nozDist;
        const nozY = curShip.y - Math.sin(curShip.angle) * nozDist;
        const flameExtend = 24 * sScale * Math.min(1.4, Math.max(0.4, curShip.thrustIntensity));
        flameX = nozX - Math.cos(curShip.angle) * flameExtend;
        flameY = nozY - Math.sin(curShip.angle) * flameExtend;
        flameRadius = (360 + (curShip.smokeScale || 1.0) * 80) * Math.max(0.8, sScale * 0.9);
    }

    const reI = Math.min(1.25, Math.max(0, curShip ? (curShip.reentryIntensity || 0) : 0));
    const isReentering = reI > 0.04;
    let plasmaX = 0, plasmaY = 0, plasmaRadius = 0, plasmaRGB = [255, 145, 55];
    if (isReentering) {
        plasmaX = curShip.x;
        plasmaY = curShip.y;
        plasmaRadius = (420 + sScale * 180) * Math.min(1.5, Math.max(0.4, reI * 1.25));
        plasmaRGB = [255, Math.round(fogLerp(95, 215, fogClamp(reI, 0, 1))), Math.round(fogLerp(35, 120, fogClamp(reI, 0, 1)))];
    }

    return {
        camX, camY, camZoom, viewLimit,
        curShip, sScale, isEngineFiring, flameInfo, flameX, flameY, flameRadius,
        isReentering, reI, plasmaX, plasmaY, plasmaRadius, plasmaRGB
    };
}

/**
 * Renderiza una pasada de jirones de neblina (capa trasera o capa frontal inmersiva).
 */
function _drawFogStrataPass(p, timeSec, passMode) {
    const f = p && p.fog;
    if (!f || !f.hasFog) return;
    if (typeof ship !== 'undefined' && (ship.cavernDepthBlend || 0) > 0.88) return;

    const rc = _getFogRenderContext(p);
    const dCam = Math.hypot(p.x - rc.camX, p.y - rc.camY);
    if (dCam > p.atmoRadius + Math.max(2600, (p.atmoRadius - p.radius) * 0.45)) return;

    const profile = f.profile;
    const lightAng = (p.lightAngle !== undefined) ? p.lightAngle : -Math.PI * 0.35;
    const dayBase = profile.dayColor || [224, 240, 248];
    const twiBase = profile.twilightColor || (p.colors && p.colors.sunsetRGB) || [248, 186, 150];
    const nightSky = (p.colors && p.colors.nightSkyRGB) || [8, 12, 24];
    const nightGlowCol = profile.nightGlow || [48, 72, 98];
    const nightGlowMix = profile.nightGlowStrength || 0.14;
    const nightTarget = fogLerpRGB(nightSky, nightGlowCol, fogClamp(nightGlowMix * 1.4, 0.10, 0.85));
    const skyFlash = (p.weather && p.weather.skyFlash) ? p.weather.skyFlash : 0;

    const isFront = (passMode === 'front');
    const fireRGB = (rc.flameInfo && rc.flameInfo.rgb) ? rc.flameInfo.rgb : [251, 175, 60];
    const scatterSprite = rc.isEngineFiring ? getFogScatterSprite(fireRGB) : null;
    const plasmaScatterSprite = rc.isReentering ? getFogScatterSprite(rc.plasmaRGB) : null;

    const drawStratum = (stratum, isPerpetualBand) => {
        const growth = isPerpetualBand ? 1.0 : stratum.growth;
        if (growth <= 0.01) return;

        const baseSurfR = (typeof getSurfaceRadius === 'function' && p.heights && p.heights.length > 0)
            ? getSurfaceRadius(p, stratum.angle)
            : p.radius;
        const centerR = baseSurfR + stratum.altOffset + stratum.thickness * 0.45;
        const cx = p.x + Math.cos(stratum.angle) * centerR;
        const cy = p.y + Math.sin(stratum.angle) * centerR;
        const maxWidth = (p.radius * stratum.angularSpan) + 320;
        if (Math.hypot(cx - rc.camX, cy - rc.camY) > rc.viewLimit + maxWidth * 0.65) return;

        const sunDot = Math.cos(stratum.angle - lightAng);
        const dayW = fogSmoothstep(-0.22, 0.30, sunDot);
        const nightW = fogSmoothstep(0.18, -0.24, sunDot);
        const twiGate = fogSmoothstep(-0.18, 0.08, sunDot);
        const twiW = Math.exp(-Math.pow(sunDot / 0.20, 2)) * twiGate;

        let fogRGB = dayBase;
        if (twiW > 0.02) fogRGB = fogLerpRGB(fogRGB, twiBase, twiW * 0.82);
        if (nightW > 0.02) fogRGB = fogLerpRGB(fogRGB, nightTarget, nightW * 0.86);
        if (skyFlash > 0.02) fogRGB = fogLerpRGB(fogRGB, [235, 245, 255], skyFlash * 0.55);

        const breathe = isPerpetualBand
            ? (0.86 + 0.14 * Math.sin(timeSec * stratum.breatheSpeed + stratum.breathePhase))
            : 1.0;
        const densityBase = (isPerpetualBand ? stratum.baseDensity : stratum.peakDensity) * growth * breathe;
        const nightAlphaScale = fogLerp(1.0, fogClamp(0.28 + nightGlowMix * 1.15, 0.26, 0.72), nightW);

        const wisps = stratum.wisps;
        const spanArcPx = (p.radius + stratum.altOffset) * stratum.angularSpan;
        const wispBaseW = Math.max(220, (spanArcPx / Math.max(3, wisps.length * 0.55)) * 1.45);
        const wispBaseH = Math.max(76, stratum.thickness * 0.92);

        for (let j = 0; j < wisps.length; j++) {
            const pf = wisps[j];
            if (pf.isForeground !== isFront) continue;

            const uDrift = Math.sin(timeSec * 0.28 + pf.phase) * pf.driftAmp;
            const vBob = Math.cos(timeSec * 0.35 + pf.phase * 1.3) * pf.bobAmp;

            const wAng = stratum.angle + (pf.u + uDrift) * (stratum.angularSpan * 0.55);
            const localSurfR = (typeof getSurfaceRadius === 'function' && p.heights && p.heights.length > 0)
                ? getSurfaceRadius(p, wAng)
                : p.radius;
            const wR = localSurfR + stratum.altOffset + pf.v * stratum.thickness + vBob;

            let wx = p.x + Math.cos(wAng) * wR;
            let wy = p.y + Math.sin(wAng) * wR;

            const drawW = wispBaseW * pf.scaleX;
            const drawH = wispBaseH * pf.scaleY;
            if (Math.hypot(wx - rc.camX, wy - rc.camY) > rc.viewLimit + drawW * 0.6) continue;

            // Interacción térmica/luminosa con la llamarada del cohete y reentrada
            let fireIllum = 0;
            if (rc.isEngineFiring) {
                const df = Math.hypot(wx - rc.flameX, wy - rc.flameY);
                const effR = rc.flameRadius + drawW * 0.35;
                if (df < effR) {
                    const prox = 1 - df / effR;
                    fireIllum = Math.pow(prox, 1.35) * fogClamp(rc.curShip.thrustIntensity * 1.15, 0.15, 1.3);
                    // Sutil desplazamiento turbulento de los jirones de niebla por el chorro del cohete
                    const push = fireIllum * 16 * rc.sScale;
                    const invD = 1 / (df || 1);
                    wx += (wx - rc.flameX) * invD * push;
                    wy += (wy - rc.flameY) * invD * push;
                }
            }

            let plasmaIllum = 0;
            if (rc.isReentering) {
                const dp = Math.hypot(wx - rc.plasmaX, wy - rc.plasmaY);
                const effPR = rc.plasmaRadius + drawW * 0.30;
                if (dp < effPR) {
                    const prox = 1 - dp / effPR;
                    plasmaIllum = Math.pow(prox, 1.3) * fogClamp(rc.reI * 1.25, 0.1, 1.35);
                }
            }

            // Iluminación dinámica por luces de superficie, torres y reflectores del cohete
            const dynLight = (typeof LightingEngine !== 'undefined') ? LightingEngine.samplePoint(wx, wy, drawW * 0.35) : null;
            const dynIllum = dynLight ? dynLight.illum : 0;

            let curRGB = fogRGB;
            if (fireIllum > 0.01) {
                curRGB = fogLerpRGB(curRGB, fireRGB, fogClamp(fireIllum * (0.72 + 0.28 * nightW), 0, 0.90));
            }
            if (plasmaIllum > 0.01) {
                curRGB = fogLerpRGB(curRGB, rc.plasmaRGB, fogClamp(plasmaIllum * 0.78, 0, 0.88));
            }
            if (dynIllum > 0.01 && dynLight) {
                const dynRGB = [dynLight.r, dynLight.g, dynLight.b];
                curRGB = fogLerpRGB(curRGB, dynRGB, fogClamp(dynIllum * (0.68 + 0.32 * nightW), 0, 0.92));
            }

            const wispAlpha = fogClamp(
                densityBase * pf.alpha * nightAlphaScale * (isFront ? 0.54 : 0.82) + fireIllum * 0.18 + plasmaIllum * 0.16 + dynIllum * 0.19,
                0,
                isFront ? 0.48 : 0.72
            );
            if (wispAlpha <= 0.008) continue;

            const sprite = getFogMistSprite(curRGB[0], curRGB[1], curRGB[2], pf.spriteIdx);

            ctx.save();
            ctx.translate(wx, wy);
            ctx.rotate(wAng + Math.PI * 0.5);
            ctx.globalAlpha = wispAlpha;
            ctx.drawImage(sprite, -drawW * 0.5, -drawH * 0.5, drawW, drawH);

            // Dispersión luminosa aditiva (Tyndall/Mie) cuando la llamarada o un haz de luz atraviesa la niebla
            if (fireIllum > 0.08 && scatterSprite) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = fogClamp((fireIllum - 0.08) * (0.48 + 0.34 * nightW) * (0.55 + densityBase * 0.45), 0, 0.75);
                ctx.drawImage(scatterSprite, -drawW * 0.48, -drawH * 0.65, drawW * 0.96, drawH * 1.30);
            }
            if (plasmaIllum > 0.08 && plasmaScatterSprite) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = fogClamp((plasmaIllum - 0.08) * 0.45, 0, 0.65);
                ctx.drawImage(plasmaScatterSprite, -drawW * 0.45, -drawH * 0.60, drawW * 0.90, drawH * 1.20);
            }
            if (dynIllum > 0.07 && dynLight) {
                const dynScatter = getFogScatterSprite([dynLight.r, dynLight.g, dynLight.b]);
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = fogClamp((dynIllum - 0.07) * (0.40 + 0.38 * nightW) * (0.50 + densityBase * 0.50), 0, 0.68);
                ctx.drawImage(dynScatter, -drawW * 0.48, -drawH * 0.65, drawW * 0.96, drawH * 1.30);
            }

            ctx.restore();
        }
    };

    ctx.save();
    if (f.isPerpetual && f.perpetualBands) {
        for (let i = 0; i < f.perpetualBands.length; i++) {
            drawStratum(f.perpetualBands[i], true);
        }
    }
    if (f.banks) {
        for (let i = 0; i < f.banks.length; i++) {
            drawStratum(f.banks[i], false);
        }
    }
    ctx.restore();
}

/**
 * Capa de niebla trasera (detrás de bases, cohetes, astronauta y fauna).
 */
function drawPlanetFogBackground(planet, timeSec) {
    _drawFogStrataPass(planet, timeSec, 'back');
}

/**
 * Capa de niebla frontal translúcida + remolinos agitados por la llamarada del cohete.
 */
function drawPlanetFogForeground(planet, timeSec) {
    _drawFogStrataPass(planet, timeSec, 'front');

    // Remolinos de niebla luminosos agitados alrededor de la tobera y la llamarada
    if (FOG_SWIRL_PARTICLES.length > 0 && typeof ship !== 'undefined' && ship && ship.nearestPlanet === planet) {
        const curShip = ship;
        const camX = (typeof camera !== 'undefined' && camera) ? camera.x : 0;
        const camY = (typeof camera !== 'undefined' && camera) ? camera.y : 0;
        const camZoom = (typeof camera !== 'undefined' && camera && camera.zoom) ? camera.zoom : 1;
        const viewLimit = (Math.max(screenW || 1200, screenH || 800) / Math.max(0.2, camZoom)) + 400;

        ctx.save();
        for (let i = 0; i < FOG_SWIRL_PARTICLES.length; i++) {
            const sw = FOG_SWIRL_PARTICLES[i];
            if (Math.hypot(sw.x - camX, sw.y - camY) > viewLimit) continue;

            const lifeFrac = fogClamp(sw.life / sw.maxLife, 0, 1);
            const ageFrac = 1 - lifeFrac;
            const env = fogSmoothstep(0, 0.14, ageFrac) * Math.pow(lifeFrac, 0.85);
            const a = sw.alpha * env;
            if (a <= 0.01) continue;

            // Color que transita de cálida incandescencia de llama hacia el tono natural de la neblina
            const heatMix = Math.pow(lifeFrac, 1.45) * 0.82;
            const mixCol = fogLerpRGB(sw.fogRGB, sw.fireRGB, heatMix);
            const mistSp = getFogMistSprite(mixCol[0], mixCol[1], mixCol[2], sw.spriteIdx);

            ctx.save();
            ctx.translate(sw.x, sw.y);
            ctx.rotate(sw.rot);
            ctx.globalAlpha = a * 0.72;
            ctx.drawImage(mistSp, -sw.size * 1.15, -sw.size * 0.65, sw.size * 2.3, sw.size * 1.3);

            if (heatMix > 0.18) {
                const scSp = getFogScatterSprite(sw.fireRGB);
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = a * (heatMix - 0.12) * 0.85;
                ctx.drawImage(scSp, -sw.size * 0.95, -sw.size * 0.95, sw.size * 1.9, sw.size * 1.9);
            }
            ctx.restore();
        }
        ctx.restore();
    }
}
