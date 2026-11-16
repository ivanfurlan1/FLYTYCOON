/**
 * ÉTER - Motor Físico de Vuelo Espacial, Aerodinámica, Capas Atmosféricas y Partículas Volumétricas
 * Simulación newtoniana real en vacío, arrastre según ángulo de ataque (AoA),
 * nubes persistentes por estrato atmosférico y plasma de reentrada direccional.
 */

const ship = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // Orientación en el mundo (proa hacia +X local)
    av: 0,               // Velocidad angular (rad/s)
    mass: 1.0,
    inertia: 165.0,
    hull: 100,
    maxHull: 100,
    fuel: 100,
    maxFuel: 100,
    infiniteFuel: false,
    modelKey: 'vesper',
    scale: 1.0,
    passengers: 1,
    smokeScale: 1.0,
    flapAngleCanard: 0,
    flapAngleAft: 0,
    artifacts: 0,
    cargo: {},           // Bodega de minerales y materiales del cohete { resourceId: cantidad }
    thrusting: false,
    warping: false,
    braking: false,      // Retro-frenado / amortiguación de descenso (S / Flecha Abajo)
    throttle: 0.0,       // Potencia graduable del motor (0.0 .. 1.0)
    thrustIntensity: 0,
    gearCompression: 0,
    turnVal: 0,
    rcsStrafe: 0,
    targetAngle: null,
    isGrounded: false,
    contactsCount: 0,
    invulnTimer: 0,
    sasEnabled: true,       // Asistencia de actitud (SAS: mantiene orientación actual y amortigua giro)
    sasHoldAngle: null,     // Ángulo objetivo fijado por SAS al soltar los controles
    sasAssistWeight: 0,     // 0 = Espacio profundo libre, 1 = Cercanía planetaria
    landingAssistFactor: 0, // Suavizado en cota baja para aterrizaje seguro
    activeHarvestNode: null,
    activeHarvestPlanet: null,

    // --- PROPIEDADES AERODINÁMICAS, TÉRMICAS Y MECÁNICAS ---
    reentryIntensity: 0,    // Intensidad del plasma de reentrada (0..1)
    reentryFlowAngle: 0,    // Ángulo local del flujo hipersónico respecto al eje del cohete
    velAngle: -Math.PI / 2, // Dirección real del vector velocidad en el mundo
    aoa: 0,                 // Ángulo de ataque (rad) entre proa y vector velocidad
    machNumber: 0,          // Número de Mach local en atmósfera
    vaporConeIntensity: 0,  // Condensación transónica Prandtl-Glauert (Mach ~1) adherida al cohete
    dynamicPressure: 0,     // Presión dinámica q = 0.5 * rho * v^2
    aeroDragG: 0,           // Desaceleración aerodinámica actual en G
    hullTemp: 0,            // Temperatura del blindaje (0..1)
    heatAngle: 0,           // Ángulo local del casco donde incide el calor de reentrada
    scorch: { amount: 0, dirX: 1, dirY: 0, temp: 0 }, // Desgaste térmico direccional acumulado
    gimbalAngle: 0,         // Ángulo de inclinación de la campana del motor (TVC)
    atmoPressure: 1.0,      // Presión barométrica local (controla colimación vs expansión de la llama)
    currentLayerName: 'TROPOSFERA',
    localWind: null,        // Muestra viva del viento planetario local en la posición del cohete
    verticalSpeed: 0,       // Velocidad vertical respecto a la superficie (+ sube, - baja)
    horizontalSpeed: 0,     // Velocidad tangencial respecto a la superficie
    leftGearSpring: { pos: 0, vel: 0, target: 0 },
    rightGearSpring: { pos: 0, vel: 0, target: 0 },
    cryoVentTimer: 0,
    smokeSpawnAccum: 0,
    stratoCloudAccum: 0,
    headlightsOn: false,
    trajectory: [],         // Predicción balística de trayectoria en tiempo real
    trajectoryImpact: false,
    trajectoryEscape: false,
    orbitClosed: false,
    orbitPeriapsis: null,   // { x, y, alt, r }
    orbitApoapsis: null,    // { x, y, alt, r }
    orbitMode: 'off',       // 'off' | 'inserting' | 'locked'
    orbitDir: 1,            // 1 = antihorario, -1 = horario
    orbitAngle: 0,          // Ángulo polar actual alrededor del planeta orbitado
    orbitTargetRadius: 0,
    orbitPlanetKey: null,
    orbitAutoThrust: false,
    orbitAutoThrottle: 0,
    orbitalInfo: null
};

const camera = {
    x: 0,
    y: 0,
    zoom: 1.0,
    targetZoom: 1.0,
    rotation: 0,         // Rotación de cámara para mantener el horizonte abajo en aproximación
    targetRotation: 0,
    shake: 0,
    skyColor: [...DEEP_SPACE_RGB]
};

// --- CONTENEDORES DE PARTÍCULAS Y EFECTOS FÍSICOS ---
let particles = [];
let rcsParticles = [];
let sparks = [];
let smokePuffs = [];
let reentryParticles = [];
let biomeParticles = [];
let liquidRipples = [];
let shockwaves = [];
let debris = [];
let shatteredPartFX = [];
let wingTrails = [];
let warpFlashes = [];
let sonarPulses = [];
let starfield = [];
let spaceDust = [];
let nebulaClouds = [];

// Resortes amortiguados para suspensión oleoneumática independiente
function updateSpring(spring, target, dt, k = 155, d = 17) {
    spring.target = target;
    const force = -k * (spring.pos - spring.target) - d * spring.vel;
    spring.vel += force * dt;
    spring.pos += spring.vel * dt;
    spring.pos = clamp(spring.pos, 0, 1.25);
}

function initCosmos() {
    starfield = [];
    const starPalettes = [
        { h: 215, s: 65, l: 92 },
        { h: 42,  s: 75, l: 93 },
        { h: 28,  s: 80, l: 86 },
        { h: 200, s: 20, l: 96 }
    ];
    for (let i = 0; i < 540; i++) {
        const layer = Math.random();
        const pal = starPalettes[Math.floor(Math.random() * starPalettes.length)];
        const isBright = Math.random() < 0.09;
        starfield.push({
            x: Math.random() * 5600 - 2800,
            y: Math.random() * 5600 - 2800,
            size: isBright ? (Math.random() * 1.6 + 1.3) : (Math.random() * 1.0 + 0.45),
            parallax: layer < 0.5 ? 0.035 : (layer < 0.85 ? 0.11 : 0.22),
            alpha: isBright ? (Math.random() * 0.35 + 0.65) : (Math.random() * 0.45 + 0.18),
            twinkleSpeed: Math.random() * 2.2 + 0.6,
            twinklePhase: Math.random() * Math.PI * 2,
            isBright,
            color: `hsla(${pal.h}, ${pal.s}%, ${pal.l}%, `
        });
    }

    spaceDust = [];
    for (let i = 0; i < 95; i++) {
        spaceDust.push({
            x: Math.random() * 2600 - 1300,
            y: Math.random() * 2600 - 1300,
            size: Math.random() * 1.3 + 0.5,
            alpha: Math.random() * 0.25 + 0.05
        });
    }

    nebulaClouds = [
        { x: -1400, y: -900, r: 1400, color: [16, 28, 56], alpha: 0.16, parallax: 0.025 },
        { x: 1600,  y: 1100, r: 1550, color: [38, 22, 48], alpha: 0.13, parallax: 0.03 },
        { x: 400,   y: -1900, r: 1200, color: [14, 40, 48], alpha: 0.14, parallax: 0.02 }
    ];
}

// --- GENERADORES DE PARTÍCULAS Y HUMO VOLUMÉTRICO ---

function createSparks(x, y, count, baseAngle, spread, minSpd, maxSpd, color = null, maxLife = 0.45, gravityDir = null) {
    if (sparks.length > 420) return;
    for (let i = 0; i < count; i++) {
        const ang = baseAngle + (Math.random() - 0.5) * spread;
        const spd = minSpd + Math.random() * (maxSpd - minSpd);
        const life = maxLife * (0.65 + Math.random() * 0.65);
        sparks.push({
            x: x + (Math.random() - 0.5) * 3,
            y: y + (Math.random() - 0.5) * 3,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            life,
            maxLife: life,
            color: color || [255, 230, 160],
            gravityDir,
            bounces: 0
        });
    }
}

/**
 * Crea nubes de humo volumétrico o condensación atmosférica con persistencia realista.
 * Soporta iluminación interna de llama (heatGlow), cúmulos multi-lóbulo 3D y deriva por viento.
 */
function createSmoke(x, y, count, baseSize, color, baseVx = 0, baseVy = 0, life = 2.8, drift = 25, options = {}) {
    const MAX_SMOKE_PUFFS = 720;
    if (smokePuffs.length + count > MAX_SMOKE_PUFFS) {
        let excess = (smokePuffs.length + count) - MAX_SMOKE_PUFFS;
        // Eliminar primero humo realmente casi agotado (< 25% de vida), nunca partículas recién creadas
        for (let i = 0; i < smokePuffs.length && excess > 0; ) {
            const p = smokePuffs[i];
            if ((p.life / p.maxLife) < 0.25) {
                smokePuffs.splice(i, 1);
                excess--;
            } else {
                i++;
            }
        }
        if (excess > 0 && smokePuffs.length > 0) {
            smokePuffs.splice(0, Math.min(smokePuffs.length, excess));
        }
    }
    const cloudType = options.cloudType || 'exhaust'; // 'launch' | 'exhaust' | 'stratosphere' | 'dust'
    const expansionMult = options.expansionMult || (cloudType === 'stratosphere' ? 4.0 : (cloudType === 'launch' ? 3.8 : 3.0));
    const baseAlpha = options.alpha || (cloudType === 'stratosphere' ? 0.40 : (cloudType === 'launch' ? 0.62 : 0.50));
    const heatGlow = options.heatGlow || 0;
    const planetKey = options.planetKey || null;
    const windDrift = options.windDrift || 0;
    const baseDrag = cloudType === 'stratosphere' ? 0.42 : (cloudType === 'launch' ? 1.35 : (cloudType === 'dust' ? 1.2 : 1.15));

    for (let i = 0; i < count; i++) {
        const l = life * (0.8 + Math.random() * 0.4);
        const initSize = baseSize * (0.84 + Math.random() * 0.36);

        // Clúster de 2 a 3 sub-lóbulos para variación adicional en primeros planos
        const lobeCount = cloudType === 'launch' ? 2 : 1;
        const lobes = [
            { angle: 0, dist: 0, rScale: 1.0, orbitSpeed: 0 }
        ];
        for (let k = 0; k < lobeCount; k++) {
            const lAng = (k / lobeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
            const lDist = 0.28 + Math.random() * 0.32;
            const lScale = 0.62 + Math.random() * 0.28;
            const orbitSpd = (Math.random() - 0.5) * (cloudType === 'stratosphere' ? 0.22 : 0.75);
            lobes.push({
                angle: lAng,
                dist: lDist,
                rScale: lScale,
                orbitSpeed: orbitSpd
            });
        }

        const soot = options.soot !== undefined
            ? options.soot
            : (cloudType === 'exhaust' ? (0.10 + Math.random() * 0.22) : (cloudType === 'launch' ? (0.06 + Math.random() * 0.16) : 0));

        smokePuffs.push({
            x: x + (Math.random() - 0.5) * (baseSize * 0.65),
            y: y + (Math.random() - 0.5) * (baseSize * 0.65),
            vx: baseVx + (Math.random() - 0.5) * drift,
            vy: baseVy + (Math.random() - 0.5) * drift,
            size: initSize,
            currentSize: initSize,
            maxSize: initSize * expansionMult * (0.88 + Math.random() * 0.32),
            life: l,
            maxLife: l,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * (cloudType === 'stratosphere' ? 0.28 : 1.35),
            color: color || [222, 230, 240],
            alpha: baseAlpha * (0.86 + Math.random() * 0.28),
            heatGlow,
            cloudType,
            planetKey,
            windDrift,
            drag: baseDrag,
            variant: (Math.random() * 4) | 0,
            turbPhase: Math.random() * Math.PI * 2,
            vortexDir: options.vortexDir || (Math.random() < 0.5 ? 1 : -1),
            soot,
            lobes
        });
    }
}

function createDebris(x, y, count, color, minSpd = 50, maxSpd = 200, planet = null) {
    if (debris.length > 180) return;
    for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = minSpd + Math.random() * (maxSpd - minSpd);
        const life = 0.9 + Math.random() * 1.2;
        debris.push({
            x: x + (Math.random() - 0.5) * 8,
            y: y + (Math.random() - 0.5) * 8,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            size: 1.8 + Math.random() * 2.6,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 14,
            life,
            maxLife: life,
            color: color || [160, 175, 195],
            planet,
            bounces: 0
        });
    }
}

function spawnShatteredPartFX(x, y, vx, vy, angle, partW, partH, partColor, category, isTank, isSolar, planet = null) {
    if (shatteredPartFX.length > 120) return;
    const wF = Math.max(6, (partW || 24) * 0.5);
    const hF = Math.max(6, (partH || 24) * 0.5);

    // 1. Destello / bola de fuego expansiva de rotura
    shatteredPartFX.push({
        kind: 'flash',
        x, y,
        vx: (vx || 0) * 0.35,
        vy: (vy || 0) * 0.35,
        radius: Math.max(wF, hF) * (isTank ? 0.85 : 0.55),
        maxRadius: Math.max(wF, hF) * (isTank ? 2.8 : 1.7),
        isTank: !!isTank,
        isSolar: !!isSolar,
        life: isTank ? 0.42 : 0.26,
        maxLife: isTank ? 0.42 : 0.26
    });

    // 2. Fragmentos geométricos reconocibles de la pieza rota
    const shardCount = isSolar ? 5 : (isTank ? 6 : 4);
    for (let i = 0; i < shardCount; i++) {
        const ang = (angle || 0) + (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
        const spd = (isTank ? 85 : 55) + Math.random() * (isTank ? 165 : 110);
        const life = 1.35 + Math.random() * 1.1;
        const sw = Math.max(3.5, wF * (0.28 + Math.random() * 0.28));
        const sh = Math.max(2.5, hF * (0.22 + Math.random() * 0.26));
        shatteredPartFX.push({
            kind: 'shard',
            x: x + (Math.random() - 0.5) * wF * 0.45,
            y: y + (Math.random() - 0.5) * hF * 0.45,
            vx: (vx || 0) * 0.65 + Math.cos(ang) * spd,
            vy: (vy || 0) * 0.65 + Math.sin(ang) * spd,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 16,
            w: sw,
            h: sh,
            color: isSolar ? '#1d4ed8' : (category === 'engines' ? '#334155' : (partColor || '#cbd5e1')),
            isSolar: !!isSolar,
            isTank: !!isTank,
            planet,
            bounces: 0,
            life,
            maxLife: life
        });
    }
}

function createShockwave(x, y, maxRadius, speed, color = 'rgba(255, 255, 255, 0.85)', type = 'ring') {
    if (shockwaves.length > 20) return;
    shockwaves.push({
        x,
        y,
        radius: 4,
        maxRadius,
        speed,
        color,
        type,
        alpha: 1.0
    });
}

function createLiquidRipple(planet, angle, radius = 8, color = null) {
    if (liquidRipples.length > 45) return;
    const sr = getSurfaceRadius(planet, angle);
    const rx = planet.x + Math.cos(angle) * sr;
    const ry = planet.y + Math.sin(angle) * sr;
    liquidRipples.push({
        x: rx,
        y: ry,
        angle,
        radius,
        maxRadius: radius + 48 + Math.random() * 36,
        speed: 30 + Math.random() * 18,
        life: 1.0,
        color: color || planet.archetype.accentColor
    });
}

function bounceParticleOnPlanet(pt, planet, dt, restitution = 0.45, friction = 0.84) {
    const dx = pt.x - planet.x;
    const dy = pt.y - planet.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) return;
    const ang = Math.atan2(dy, dx);
    const sr = getSurfaceRadius(planet, ang);

    if (dist < sr + 2) {
        const nx = dx / dist;
        const ny = dy / dist;
        pt.x = planet.x + nx * (sr + 2.5);
        pt.y = planet.y + ny * (sr + 2.5);

        const vn = pt.vx * nx + pt.vy * ny;
        if (vn < 0) {
            const tx = -ny;
            const ty = nx;
            const vt = pt.vx * tx + pt.vy * ty;

            pt.vx = tx * (vt * friction) - nx * (vn * restitution);
            pt.vy = ty * (vt * friction) - ny * (vn * restitution);
            pt.bounces = (pt.bounces || 0) + 1;
        }
    }
}

// Poblador de partículas ambientales del bioma (Exclusivas, delicadas y diferenciadas por tipo de mundo)
function updateBiomeParticles(nearestPlanet, dt) {
    if (!nearestPlanet) {
        if (biomeParticles.length > 0) biomeParticles.length = 0;
        return;
    }

    const arch = nearestPlanet.archetype;
    const pType = arch ? arch.biomeParticleType : null;
    if (!pType) {
        // La gran mayoría de planetas no tienen partículas: cielo limpio y sin recarga
        if (biomeParticles.length > 0) biomeParticles.length = 0;
        return;
    }

    // Si cambiamos de planeta con un tipo diferente de partículas, reiniciar limpiamente
    if (biomeParticles.length > 0 && biomeParticles[0].type !== pType) {
        biomeParticles.length = 0;
    }

    const atmoDepth = nearestPlanet.atmoRadius - nearestPlanet.radius;
    const distFromCenter = Math.hypot(ship.x - nearestPlanet.x, ship.y - nearestPlanet.y);
    const alt = distFromCenter - nearestPlanet.radius;
    const maxParticleAlt = atmoDepth * 0.70;

    // Fuera de la troposfera baja/media, se desvanecen suavemente hacia el espacio
    if (alt > maxParticleAlt) {
        for (let i = biomeParticles.length - 1; i >= 0; i--) {
            biomeParticles[i].life -= dt * 2.5;
            if (biomeParticles[i].life <= 0) biomeParticles.splice(i, 1);
        }
        return;
    }

    const targetCount = arch.particleCount || 16;
    const colList = arch.particleColors || ['rgba(255,255,255,0.4)'];

    while (biomeParticles.length < targetCount) {
        const spawnAngle = Math.atan2(ship.y - nearestPlanet.y, ship.x - nearestPlanet.x) + (Math.random() - 0.5) * 1.1;
        const spawnR = nearestPlanet.radius + 15 + Math.random() * Math.min(alt + 220, maxParticleAlt);
        const px = nearestPlanet.x + Math.cos(spawnAngle) * spawnR;
        const py = nearestPlanet.y + Math.sin(spawnAngle) * spawnR;
        const col = colList[Math.floor(Math.random() * colList.length)];

        let size;
        if (pType === 'biolume_amber_spore') size = Math.random() * 1.5 + 1.4;
        else if (pType === 'amber_drift') size = Math.random() * 1.3 + 1.2;
        else if (pType === 'sea_phosphor') size = Math.random() * 1.4 + 1.1;
        else if (pType === 'volcanic_cinder') size = Math.random() * 1.8 + 1.2;
        else if (pType === 'ice_mote') size = Math.random() * 1.2 + 0.8;
        else if (pType === 'crystal_resonance') size = Math.random() * 1.7 + 1.3;
        else if (pType === 'toxic_vapor') size = Math.random() * 2.2 + 1.5;
        else if (pType === 'ether_dust') size = Math.random() * 1.7 + 1.3;
        else size = Math.random() * 1.5 + 1.2;

        biomeParticles.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: size,
            type: pType,
            color: col,
            life: 4.5 + Math.random() * 4.5,
            maxLife: 9.0,
            phase: Math.random() * Math.PI * 2,
            seed: Math.random()
        });
    }

    const shipSpeed = Math.hypot(ship.vx, ship.vy);
    for (let i = biomeParticles.length - 1; i >= 0; i--) {
        const bp = biomeParticles[i];
        bp.phase += dt * 1.5;

        // Geometría orbital local: radial (hacia el cenit / arriba) y tangencial (horizontal)
        const radAngle = Math.atan2(bp.y - nearestPlanet.y, bp.x - nearestPlanet.x);
        const upX = Math.cos(radAngle);
        const upY = Math.sin(radAngle);
        const tangX = -upY;
        const tangY = upX;

        let driftUp = 0;
        let driftTang = 0;

        if (bp.type === 'biolume_amber_spore') {
            // Esporas orgánicas cálidas: emanan hacia arriba suavemente desde la vegetación
            driftUp = 13 + Math.sin(bp.phase + bp.seed * 3) * 5;
            driftTang = Math.sin(bp.phase * 0.8 + bp.seed * 6) * 7;
        } else if (bp.type === 'amber_drift') {
            driftUp = 7 + Math.sin(bp.phase) * 3;
            driftTang = Math.sin(bp.phase * 0.6) * 8;
        } else if (bp.type === 'sea_phosphor') {
            // Micro-fosforescencia marina flotante rasante sobre el oleaje
            driftUp = Math.sin(bp.phase * 1.2) * 4;
            driftTang = Math.cos(bp.phase * 0.7) * 11;
        } else if (bp.type === 'volcanic_cinder') {
            // Pavesas y ceniza caliente: ascenso convectivo térmico con turbulencia
            driftUp = 32 + Math.sin(bp.phase * 2 + bp.seed * 5) * 12;
            driftTang = Math.sin(bp.phase * 2.5 + bp.seed * 9) * 14;
        } else if (bp.type === 'ice_mote') {
            // Polvo de diamante / Micro-escarcha: arrastrado horizontalmente por vientos polares
            driftTang = 22 + Math.sin(bp.phase + bp.seed * 2) * 7;
            driftUp = -3 + Math.sin(bp.phase * 1.5) * 2;
        } else if (bp.type === 'crystal_resonance') {
            // Geodas y resonancia piezoeléctrica: motas en suspensión ingrávida casi estacionarias
            driftUp = Math.sin(bp.phase) * 2;
            driftTang = Math.cos(bp.phase * 0.8) * 2;
        } else if (bp.type === 'toxic_vapor') {
            driftUp = 12 + Math.sin(bp.phase * 1.1) * 4;
            driftTang = Math.sin(bp.phase * 1.7) * 9;
        } else if (bp.type === 'ether_dust') {
            // Motas etéreas sagradas: ascenso pausado en espiral
            driftUp = 15 + Math.sin(bp.phase * 0.5) * 4;
            driftTang = Math.sin(bp.phase * 1.4) * 14;
        } else {
            driftUp = 5;
            driftTang = Math.sin(bp.phase) * 6;
        }

        let driftX = upX * driftUp + tangX * driftTang;
        const driftYBase = upY * driftUp + tangY * driftTang;
        let driftY = driftYBase;
        if (typeof samplePlanetWind === 'function' && nearestPlanet.wind && nearestPlanet.wind.hasWind) {
            const bw = samplePlanetWind(nearestPlanet, bp.x, bp.y);
            if (bw.hasWind) {
                driftX += bw.vx * 0.36;
                driftY += bw.vy * 0.36;
            }
        }

        // Desplazamiento fluido y proporcional al paso del cohete
        const dShipX = bp.x - ship.x;
        const dShipY = bp.y - ship.y;
        const dShip = Math.hypot(dShipX, dShipY);
        const interactRadius = 150;

        if (dShip < interactRadius && dShip > 1) {
            const normDist = dShip / interactRadius;
            const factor = Math.pow(1 - normDist, 2.0);
            let push = factor * (shipSpeed * 0.22 + 20);

            if (bp.type === 'volcanic_cinder' && ship.thrustIntensity > 0.05) {
                push *= (1.0 + ship.thrustIntensity * 1.4);
            }
            bp.vx += (dShipX / dShip) * push * dt * 2.5;
            bp.vy += (dShipY / dShip) * push * dt * 2.5;
        }

        bp.vx = lerp(bp.vx, driftX, dt * 1.6);
        bp.vy = lerp(bp.vy, driftY, dt * 1.6);
        bp.x += bp.vx * dt;
        bp.y += bp.vy * dt;

        // Apoyo suave en la superficie rocosa del planeta
        const distP = Math.hypot(bp.x - nearestPlanet.x, bp.y - nearestPlanet.y);
        const sr = getSurfaceRadius(nearestPlanet, radAngle);
        if (distP < sr) {
            bp.x = nearestPlanet.x + upX * (sr + 2);
            bp.y = nearestPlanet.y + upY * (sr + 2);
            bp.vx *= 0.3;
            bp.vy *= 0.3;
        }

        bp.life -= dt;
        if (bp.life <= 0 || dShip > 1400) {
            biomeParticles.splice(i, 1);
        }
    }
}

/**
 * Parámetro gravitacional estándar μ = g_superficie * R² (gravedad Kepleriana 1/r²).
 */
function getPlanetMu(planet) {
    if (!planet) return 0;
    return (planet.gravityForce || 280) * planet.radius * planet.radius;
}

/**
 * Calcula la aceleración gravitatoria Kepleriana 1/r² dentro de la SOI del planeta.
 */
function getPlanetGravityPull(planet, dist, x = null, y = null) {
    if (!planet || dist >= planet.gravityRadius || dist <= 10) return 0;
    const rEff = Math.max(dist, planet.radius * 0.65);
    let pull = getPlanetMu(planet) / (rEff * rEff);
    if (x !== null && y !== null && planet.isHollow && typeof isShipInsideCavern === 'function' && isShipInsideCavern(planet, x, y)) {
        const mode = planet.hollowPhysicsMode || 'microgravity_vortex';
        const coreSafeR = (planet.interiorCoreRadius || planet.radius * 0.17) + 115;
        if (dist < coreSafeR) return -pull * 0.90;
        if (mode === 'inverted_shell') return -pull * 0.42;
        if (mode === 'thermal_forge') return pull * 0.52;
        if (mode === 'crystal_resonance') return pull * 0.15;
        return pull * 0.18;
    }
    return pull;
}

/**
 * Devuelve los radios seguro (sobre atmósfera densa), ideal y máximo para orbitar un planeta.
 */
function getPlanetSafeOrbitBounds(planet) {
    if (!planet) return { minSafeR: 0, idealR: 0, maxSafeR: 0 };
    const atmoDepth = Math.max(200, planet.atmoRadius - planet.radius);
    const maxSafeR = planet.gravityRadius * 0.88;
    const karmanR = planet.radius + atmoDepth * 0.65;
    const minSafeR = Math.min(maxSafeR * 0.90, karmanR + Math.max(120, atmoDepth * 0.05));
    const idealR = clamp(karmanR + Math.max(360, atmoDepth * 0.14), minSafeR, maxSafeR);
    return { minSafeR, idealR, maxSafeR };
}

/**
 * Calcula la telemetría orbital instantánea respecto al planeta más cercano.
 */
function computeOrbitalInfo(nearestPlanet, distFromPlanetCenter) {
    const maxRange = ship.orbitMode !== 'off' ? nearestPlanet?.gravityRadius * 1.5 : nearestPlanet?.gravityRadius;
    if (!nearestPlanet || distFromPlanetCenter >= maxRange || distFromPlanetCenter <= 10) {
        ship.orbitalInfo = null;
        return null;
    }
    const relX = ship.x - nearestPlanet.x;
    const relY = ship.y - nearestPlanet.y;
    const r = distFromPlanetCenter;
    const radX = relX / r;
    const radY = relY / r;
    const tangX = -radY;
    const tangY = radX;
    const vRad = ship.vx * radX + ship.vy * radY;
    const vTang = ship.vx * tangX + ship.vy * tangY;
    const pull = getPlanetGravityPull(nearestPlanet, r, ship.x, ship.y);
    const circularSpeed = Math.sqrt(Math.max(0, r * pull));
    const speedRatio = circularSpeed > 1 ? Math.abs(vTang) / circularSpeed : 0;
    const bounds = getPlanetSafeOrbitBounds(nearestPlanet);

    let state = 'SUBORBITAL';
    if (ship.orbitMode === 'locked') {
        state = 'LOCKED';
    } else if (ship.orbitMode === 'inserting') {
        state = 'INSERTING';
    } else if (ship.trajectoryEscape) {
        state = 'ESCAPE';
    } else if (ship.orbitClosed && !ship.trajectoryImpact) {
        const minSafeAlt = bounds.minSafeR - nearestPlanet.radius;
        const peAlt = ship.orbitPeriapsis ? ship.orbitPeriapsis.alt : 0;
        state = peAlt >= minSafeAlt * 0.72 ? 'STABLE' : 'GRAZING';
    }

    ship.orbitalInfo = {
        planet: nearestPlanet,
        r,
        radX,
        radY,
        tangX,
        tangY,
        vRad,
        vTang,
        circularSpeed,
        speedRatio,
        bounds,
        state
    };
    return ship.orbitalInfo;
}

/**
 * Desactiva el piloto automático orbital limpiamente.
 */
function disengageOrbitMode(silent = false, reason = null) {
    if (ship.orbitMode === 'off') return;
    ship.orbitMode = 'off';
    ship.orbitAutoThrust = false;
    ship.orbitAutoThrottle = 0;
    if (!silent && typeof showHoloCard === 'function') {
        const p = ship.nearestPlanet || getPlanet(0, 0);
        showHoloCard(p, 'PILOTO ORBITAL DESACTIVADO', reason || 'Control de vuelo devuelto al piloto.');
    }
}

/**
 * Activa o desactiva la inserción y mantenimiento de órbita alrededor del planeta actual.
 */
function toggleOrbitMode() {
    if (typeof astronaut !== 'undefined' && astronaut.active) return;

    if (ship.orbitMode !== 'off') {
        disengageOrbitMode(false, 'Órbita liberada. Control manual activo.');
        return;
    }

    const p = ship.nearestPlanet;
    if (!p) {
        if (typeof showHoloCard === 'function') {
            showHoloCard(getPlanet(0, 0), 'SIN PLANETA CERCANO', 'Acércate a un planeta para activar el Piloto Orbital.');
        }
        return;
    }

    const relX = ship.x - p.x;
    const relY = ship.y - p.y;
    const dist = Math.hypot(relX, relY);

    if (dist >= p.gravityRadius * 1.45) {
        if (typeof showHoloCard === 'function') {
            showHoloCard(p, 'FUERA DE POZO GRAVITATORIO', 'Acércate más al planeta para iniciar la inserción orbital.');
        }
        return;
    }

    if (!ship.infiniteFuel && ship.fuel <= 0.5) {
        if (typeof showHoloCard === 'function') {
            showHoloCard(p, 'COMBUSTIBLE INSUFICIENTE', 'Necesitas Éter para realizar la maniobra de inserción orbital.');
        }
        return;
    }

    const radX = relX / (dist || 1);
    const radY = relY / (dist || 1);
    const tangX = -radY;
    const tangY = radX;

    // Si está posado en la superficie, dar un impulso inicial de despegue hacia órbita
    if (ship.isGrounded) {
        ship.isGrounded = false;
        ship.x += radX * 18;
        ship.y += radY * 18;
        ship.vx = radX * 220 + tangX * 80;
        ship.vy = radY * 220 + tangY * 80;
    }

    const vTang = ship.vx * tangX + ship.vy * tangY;
    const bounds = getPlanetSafeOrbitBounds(p);

    ship.orbitPlanetKey = p.key;
    ship.orbitDir = Math.abs(vTang) > 14 ? Math.sign(vTang) : (ship.orbitDir || 1);
    ship.orbitAngle = Math.atan2(relY, relX);
    ship.orbitTargetRadius = clamp(dist, bounds.minSafeR, bounds.maxSafeR);
    ship.orbitMode = 'inserting';

    const targetAltM = Math.round((ship.orbitTargetRadius - p.radius) * 0.1);
    if (typeof showHoloCard === 'function') {
        showHoloCard(p, 'INSERCIÓN ORBITAL INICIADA', `Subiendo y circularizando órbita alrededor de ${p.name} (${targetAltM} m).`);
    }
    if (typeof sfx === 'function') sfx('playChime');
}

/**
 * Proyecta la trayectoria interplanetaria en espacio profundo (recta inercial hasta entrar en la SOI de otro planeta).
 */
function projectInterplanetaryTail(startX, startY, vx, vy, ignorePlanetKey = null) {
    const speed = Math.hypot(vx, vy);
    if (speed < 8) return;
    const ux = vx / speed;
    const uy = vy / speed;
    const stepLen = clamp(speed * 1.4, 1600, 6500);
    const maxDeepSteps = 85; // Hasta ~550,000 px de alcance interplanetario (escala sectorial completa)
    const nearby = (typeof getNearbyPlanets === 'function') ? getNearbyPlanets(startX, startY, 2) : [];

    let cx = startX;
    let cy = startY;
    for (let k = 0; k < maxDeepSteps; k++) {
        cx += ux * stepLen;
        cy += uy * stepLen;

        // Comprobar si la trayectoria entra en la SOI de otro planeta
        let enteredPlanet = null;
        for (const p of nearby) {
            if (ignorePlanetKey && p.key === ignorePlanetKey) continue;
            const d = Math.hypot(cx - p.x, cy - p.y);
            if (d < p.gravityRadius) {
                enteredPlanet = p;
                break;
            }
        }

        if (enteredPlanet) {
            const p = enteredPlanet;
            // Trazar la curva gravitatoria de encuentro dentro de la SOI del planeta destino
            let simX = cx - ux * (stepLen * 0.5);
            let simY = cy - uy * (stepLen * 0.5);
            let simVx = vx;
            let simVy = vy;
            const mu = getPlanetMu(p);
            for (let j = 0; j < 180; j++) {
                const dx = p.x - simX;
                const dy = p.y - simY;
                const dist = Math.hypot(dx, dy);
                const ang = Math.atan2(-dy, -dx);
                const sr = getSurfaceRadius(p, ang);
                if (dist <= sr + 6) {
                    ship.trajectory.push({ x: p.x + Math.cos(ang) * (sr + 4), y: p.y + Math.sin(ang) * (sr + 4) });
                    ship.trajectoryImpact = true;
                    return;
                }
                if (dist > p.gravityRadius * 1.06 && j > 3) {
                    ship.trajectory.push({ x: simX, y: simY });
                    return;
                }
                const simSpd = Math.hypot(simVx, simVy);
                const subDt = clamp((dist * 0.045) / Math.max(120, simSpd), 0.08, 1.8);
                const pull = mu / Math.max(dist * dist, p.radius * p.radius * 0.45);
                simVx += (dx / dist) * pull * subDt;
                simVy += (dy / dist) * pull * subDt;
                simX += simVx * subDt;
                simY += simVy * subDt;
                ship.trajectory.push({ x: simX, y: simY });
            }
            return;
        }

        ship.trajectory.push({ x: cx, y: cy });
    }
}

/**
 * Calcula la órbita Kepleriana analítica exacta (elipse / hipérbola / impacto / escape interplanetario).
 */
function computeTrajectoryPrediction(nearestPlanet) {
    ship.trajectory.length = 0;
    ship.trajectoryImpact = false;
    ship.trajectoryEscape = false;
    ship.orbitClosed = false;
    ship.orbitPeriapsis = null;
    ship.orbitApoapsis = null;
    if (ship.isGrounded) return;
    if (typeof astronaut !== 'undefined' && astronaut.active) return;

    if (ship.orbitMode === 'locked' && nearestPlanet && ship.orbitTargetRadius > 0) {
        ship.orbitClosed = true;
        const r = ship.orbitTargetRadius;
        const steps = 120;
        for (let i = 1; i <= steps; i++) {
            const ang = ship.orbitAngle + ship.orbitDir * (i / steps) * Math.PI * 2;
            ship.trajectory.push({ x: nearestPlanet.x + Math.cos(ang) * r, y: nearestPlanet.y + Math.sin(ang) * r });
        }
        const alt = Math.max(0, r - nearestPlanet.radius);
        ship.orbitPeriapsis = { x: nearestPlanet.x + Math.cos(ship.orbitAngle) * r, y: nearestPlanet.y + Math.sin(ship.orbitAngle) * r, r, alt };
        ship.orbitApoapsis = { x: nearestPlanet.x - Math.cos(ship.orbitAngle) * r, y: nearestPlanet.y - Math.sin(ship.orbitAngle) * r, r, alt };
        return;
    }

    // Si estamos en espacio profundo fuera de toda SOI, proyectar trayectoria recta interplanetaria
    if (!nearestPlanet) {
        projectInterplanetaryTail(ship.x, ship.y, ship.vx, ship.vy, null);
        return;
    }

    const rx = ship.x - nearestPlanet.x;
    const ry = ship.y - nearestPlanet.y;
    const r = Math.hypot(rx, ry);
    if (r < 10) return;

    if (r >= nearestPlanet.gravityRadius) {
        ship.trajectoryEscape = true;
        projectInterplanetaryTail(ship.x, ship.y, ship.vx, ship.vy, nearestPlanet.key);
        return;
    }

    const vx = ship.vx;
    const vy = ship.vy;
    const v2 = vx * vx + vy * vy;
    const mu = getPlanetMu(nearestPlanet);
    if (mu <= 0) return;

    // Momento angular específico h = r × v
    const h = rx * vy - ry * vx;
    const rv = rx * vx + ry * vy;

    // Caso casi radial (sin velocidad tangencial): caída o subida recta
    if (Math.abs(h) < 1e-2) {
        const radX = rx / r;
        const radY = ry / r;
        const sr = getSurfaceRadius(nearestPlanet, Math.atan2(ry, rx));
        if (rv <= 0) {
            const hitX = nearestPlanet.x + radX * (sr + 4);
            const hitY = nearestPlanet.y + radY * (sr + 4);
            ship.trajectory.push(
                { x: lerp(ship.x, hitX, 0.33), y: lerp(ship.y, hitY, 0.33) },
                { x: lerp(ship.x, hitX, 0.66), y: lerp(ship.y, hitY, 0.66) },
                { x: hitX, y: hitY }
            );
            ship.trajectoryImpact = true;
        } else {
            const exitX = nearestPlanet.x + radX * nearestPlanet.gravityRadius;
            const exitY = nearestPlanet.y + radY * nearestPlanet.gravityRadius;
            ship.trajectory.push(
                { x: lerp(ship.x, exitX, 0.33), y: lerp(ship.y, exitY, 0.33) },
                { x: lerp(ship.x, exitX, 0.66), y: lerp(ship.y, exitY, 0.66) },
                { x: exitX, y: exitY }
            );
            ship.trajectoryEscape = true;
            projectInterplanetaryTail(exitX, exitY, vx, vy, nearestPlanet.key);
        }
        return;
    }

    // Vector de excentricidad e = ((v² - μ/r)*r - (r·v)*v) / μ
    const ex = ((v2 - mu / r) * rx - rv * vx) / mu;
    const ey = ((v2 - mu / r) * ry - rv * vy) / mu;
    const e = Math.hypot(ex, ey);
    const pOrb = (h * h) / mu; // Semi-latus rectum
    const hAbs = Math.abs(h);
    const dir = h >= 0 ? 1 : -1;

    const curAng = Math.atan2(ry, rx);
    const omega = e > 1e-5 ? Math.atan2(ey, ex) : curAng;
    const nu0 = e > 1e-5 ? Math.atan2(Math.sin(curAng - omega), Math.cos(curAng - omega)) : 0;

    const rp = pOrb / (1 + e);
    const ra = e < 0.9995 ? pOrb / (1 - e) : Infinity;

    let closed = (e < 0.9995 && ra <= nearestPlanet.gravityRadius * 1.02);
    let nu = nu0;
    let swept = 0;
    let rk = r;
    const maxSteps = 420;
    const otherBodies = (typeof getNearbyPlanets === 'function')
        ? getNearbyPlanets(nearestPlanet.x, nearestPlanet.y, 1).filter(b => b.key !== nearestPlanet.key)
        : [];

    for (let i = 0; i < maxSteps; i++) {
        // Paso adaptativo según distancia para que la curva sea siempre perfectamente suave sin segmentos rectos
        const stepNu = clamp((pOrb / Math.max(rk, 120)) * 0.042, 0.016, 0.062);
        const nextSwept = swept + stepNu;
        const clampedStep = (closed && nextSwept >= Math.PI * 2) ? (Math.PI * 2 - swept) : stepNu;
        nu += dir * clampedStep;
        swept += clampedStep;

        const denom = 1 + e * Math.cos(nu);
        if (denom <= 0.015) {
            ship.trajectoryEscape = true;
            closed = false;
            const lastPt = ship.trajectory[ship.trajectory.length - 1] || { x: ship.x, y: ship.y };
            projectInterplanetaryTail(lastPt.x, lastPt.y, vx, vy, nearestPlanet.key);
            break;
        }
        rk = pOrb / denom;
        const ang = omega + nu;
        const px = nearestPlanet.x + Math.cos(ang) * rk;
        const py = nearestPlanet.y + Math.sin(ang) * rk;

        const sr = getSurfaceRadius(nearestPlanet, ang);
        if (rk <= sr + 6) {
            ship.trajectory.push({ x: nearestPlanet.x + Math.cos(ang) * (sr + 4), y: nearestPlanet.y + Math.sin(ang) * (sr + 4) });
            ship.trajectoryImpact = true;
            closed = false;
            break;
        }
        // Verificar colisión con lunas o cuerpos secundarios dentro de la misma SOI
        let hitOther = false;
        for (const ob of otherBodies) {
            const dOb = Math.hypot(px - ob.x, py - ob.y);
            if (dOb <= ob.radius + 6) {
                const obAng = Math.atan2(py - ob.y, px - ob.x);
                const obSr = getSurfaceRadius(ob, obAng);
                if (dOb <= obSr + 6) {
                    ship.trajectory.push({ x: ob.x + Math.cos(obAng) * (obSr + 4), y: ob.y + Math.sin(obAng) * (obSr + 4) });
                    ship.trajectoryImpact = true;
                    closed = false;
                    hitOther = true;
                    break;
                }
            }
        }
        if (hitOther) break;
        if (rk >= nearestPlanet.gravityRadius) {
            const exitX = nearestPlanet.x + Math.cos(ang) * nearestPlanet.gravityRadius;
            const exitY = nearestPlanet.y + Math.sin(ang) * nearestPlanet.gravityRadius;
            ship.trajectory.push({ x: exitX, y: exitY });
            ship.trajectoryEscape = true;
            closed = false;
            // Calcular velocidad exacta al salir de la SOI para continuar la línea recta en el espacio
            const vRadExit = (mu / hAbs) * e * Math.sin(nu) * dir;
            const vTangExit = (mu / hAbs) * (1 + e * Math.cos(nu));
            const exitVx = vRadExit * Math.cos(ang) - vTangExit * dir * Math.sin(ang);
            const exitVy = vRadExit * Math.sin(ang) + vTangExit * dir * Math.cos(ang);
            projectInterplanetaryTail(exitX, exitY, exitVx, exitVy, nearestPlanet.key);
            break;
        }

        ship.trajectory.push({ x: px, y: py });
        if (closed && swept >= Math.PI * 2 - 1e-4) {
            break;
        }
    }

    if (closed && !ship.trajectoryImpact && !ship.trajectoryEscape) {
        ship.orbitClosed = true;
        ship.orbitPeriapsis = {
            x: nearestPlanet.x + Math.cos(omega) * rp,
            y: nearestPlanet.y + Math.sin(omega) * rp,
            r: rp,
            alt: Math.max(0, rp - nearestPlanet.radius)
        };
        ship.orbitApoapsis = {
            x: nearestPlanet.x - Math.cos(omega) * ra,
            y: nearestPlanet.y - Math.sin(omega) * ra,
            r: ra,
            alt: Math.max(0, ra - nearestPlanet.radius)
        };
    } else if (!ship.trajectoryImpact && ra < Infinity) {
        ship.orbitPeriapsis = {
            x: nearestPlanet.x + Math.cos(omega) * rp,
            y: nearestPlanet.y + Math.sin(omega) * rp,
            r: rp,
            alt: Math.max(0, rp - nearestPlanet.radius)
        };
        ship.orbitApoapsis = {
            x: nearestPlanet.x - Math.cos(omega) * ra,
            y: nearestPlanet.y - Math.sin(omega) * ra,
            r: ra,
            alt: Math.max(0, ra - nearestPlanet.radius)
        };
    }
}

let cosmosSimTime = 0;

// --- BUCLE PRINCIPAL DE SIMULACIÓN FÍSICA ---
function updatePhysics(dt, skipExpensiveUI = false) {
    cosmosSimTime += dt;
    const nearby = getNearbyPlanets(ship.x, ship.y, 1);

    let nearestPlanet = null;
    let nearestDist = Infinity;
    let atmoWeight = 0;
    let targetSkyRGB = [...DEEP_SPACE_RGB];

    for (const p of nearby) {
        // Actualizar la rotación del planeta y su ángulo solar en tiempo real
        p.lightAngle = getPlanetCurrentLightAngle(p, cosmosSimTime);
        p.wavePhase += dt * 1.8;

        // Actualizar Sistema Meteorológico Planetario (Nubes Volumétricas, Interacción con Cohete, Tormentas y Rayos)
        if (!p.weather && typeof initPlanetWeather === 'function') {
            initPlanetWeather(p);
        }
        if (!p.wind && typeof initPlanetWind === 'function') {
            initPlanetWind(p);
        }
        if (!p.fog && typeof initPlanetFog === 'function') {
            initPlanetFog(p);
        }
        if (p.wind && typeof updatePlanetWind === 'function') {
            updatePlanetWind(p, dt, ship, cosmosSimTime);
        }
        if (p.weather && typeof updatePlanetWeather === 'function') {
            updatePlanetWeather(p, dt, ship, cosmosSimTime);
        } else if (p.cloudBands) {
            for (const cb of p.cloudBands) {
                cb.angle = (cb.angle + cb.windSpeed * dt) % (Math.PI * 2);
            }
        }
        if (p.fog && typeof updatePlanetFog === 'function') {
            updatePlanetFog(p, dt, ship, cosmosSimTime);
        }

        const dx = ship.x - p.x;
        const dy = ship.y - p.y;
        const dist = Math.hypot(dx, dy);
        const surfaceDist = dist - p.radius;

        if (surfaceDist < nearestDist) {
            nearestDist = surfaceDist;
            nearestPlanet = p;
        }

        // Dispersión atmosférica diurna/nocturna y crepuscular multicapa
        if (dist < p.atmoRadius) {
            const w = clamp(1 - (dist - p.radius) / (p.atmoRadius - p.radius), 0, 1);
            if (w > atmoWeight) {
                atmoWeight = w;
                const solar = getPlanetSolarState(p, ship.x, ship.y, cosmosSimTime);
                ship.currentSolarState = solar;
                ship.currentAtmoWeight = w;

                const col = p.colors || {};
                const arch = p.archetype;
                const rawDayRGB = col.daySkyRGB || arch.daySkyRGB || arch.skyRGB || [14, 38, 72];
                const sunsetRGB = col.sunsetRGB || arch.sunsetRGB || arch.atmoGlow || [251, 146, 60];
                const rawNightRGB = col.nightSkyRGB || arch.nightSkyRGB || [3, 5, 12];

                // Radiancia diurna solar enriquecida: mantiene la tonalidad cromática distintiva del planeta pero con luz viva y resplandeciente
                const dayMaxLum = Math.max(rawDayRGB[0], rawDayRGB[1], rawDayRGB[2], 1);
                const lumMultiplier = dayMaxLum < 110 ? (1.65 + (110 - dayMaxLum) / 120) : 1.40;
                const brightDayRGB = [
                    Math.min(255, Math.round(rawDayRGB[0] * lumMultiplier + 22 * solar.dayFactor)),
                    Math.min(255, Math.round(rawDayRGB[1] * lumMultiplier + 24 * solar.dayFactor)),
                    Math.min(255, Math.round(rawDayRGB[2] * lumMultiplier + 28 * solar.dayFactor))
                ];

                // Noche atmosférica profunda: conserva un sutil matiz propio del planeta con oscuridad nocturna real
                const deepNightRGB = [
                    Math.max(1, Math.round(Math.min(6, rawNightRGB[0] * 0.16))),
                    Math.max(1, Math.round(Math.min(8, rawNightRGB[1] * 0.16))),
                    Math.max(2, Math.round(Math.min(15, rawNightRGB[2] * 0.22)))
                ];

                // Fusión continua y armónica mediante ponderación de energía normalizada
                // El resplandor crepuscular se extingue al caer la noche cerrada (sunDot < -0.14) para que la noche sea verdaderamente oscura y limpia
                const twiGate = smoothstep(-0.16, 0.08, solar.sunDot);
                const wDay = Math.max(0, solar.dayFactor);
                const wTwi = Math.max(0, solar.twilightFactor * 1.15 * twiGate);
                const wNight = Math.max(0, solar.nightFactor);
                const wSum = (wDay + wTwi + wNight) || 1.0;
                const nDay = wDay / wSum;
                const nTwi = wTwi / wSum;
                const nNight = wNight / wSum;

                const surfaceSky = [
                    Math.round(brightDayRGB[0] * nDay + sunsetRGB[0] * nTwi + deepNightRGB[0] * nNight),
                    Math.round(brightDayRGB[1] * nDay + sunsetRGB[1] * nTwi + deepNightRGB[1] * nNight),
                    Math.round(brightDayRGB[2] * nDay + sunsetRGB[2] * nTwi + deepNightRGB[2] * nNight)
                ];

                // La estratosfera superior también responde al ciclo día/noche con contraste aumentado
                const dayUpperBase = col.upperSkyRGB || arch.upperSkyRGB || lerpRGB(DEEP_SPACE_RGB, rawDayRGB, 0.45);
                const dayUpper = [
                    Math.min(255, Math.round(dayUpperBase[0] * 1.35 + 12)),
                    Math.min(255, Math.round(dayUpperBase[1] * 1.35 + 14)),
                    Math.min(255, Math.round(dayUpperBase[2] * 1.35 + 18))
                ];
                const nightUpper = [1, 2, 4];
                const upperRGB = lerpRGB(nightUpper, dayUpper, Math.pow(solar.dayFactor, 0.90) + solar.twilightFactor * 0.35);

                if (w > 0.45) {
                    const lowT = (w - 0.45) / 0.55;
                    targetSkyRGB = lerpRGB(upperRGB, surfaceSky, Math.pow(lowT, 0.78));
                } else {
                    const highT = w / 0.45;
                    targetSkyRGB = lerpRGB(DEEP_SPACE_RGB, upperRGB, Math.pow(highT, 0.85));
                }
            }
            if (w > 0.25 && !p.visited) {
                p.visited = true;
                p.scanned = true;
                registerCodex(p);
                showHoloCard(p);
            }
        }
    }

    const obsX = (typeof astronaut !== 'undefined' && astronaut.active) ? astronaut.x : ship.x;
    const obsY = (typeof astronaut !== 'undefined' && astronaut.active) ? astronaut.y : ship.y;

    if (atmoWeight <= 0.01) {
        ship.currentSolarState = null;
        ship.currentAtmoWeight = 0;
    }

    // Cobertura nubosa y oclusión solar local bajo las nubes (transición suave y continua)
    if (nearestPlanet && atmoWeight > 0.01 && typeof getLocalCloudOvercast === 'function') {
        const wxCover = getLocalCloudOvercast(nearestPlanet, obsX, obsY);
        const wxBlend = clamp(dt * 1.6, 0, 1);
        ship.cloudOvercast = lerp(ship.cloudOvercast || 0, wxCover.overcast, wxBlend);
        ship.cloudStorm = lerp(ship.cloudStorm || 0, wxCover.storm, clamp(dt * 1.4, 0, 1));
        ship.sunCloudOcclusion = lerp(ship.sunCloudOcclusion || 0, wxCover.sunOcclusion, clamp(dt * 1.8, 0, 1));
    } else {
        const wxClear = clamp(dt * 2.2, 0, 1);
        ship.cloudOvercast = lerp(ship.cloudOvercast || 0, 0, wxClear);
        ship.cloudStorm = lerp(ship.cloudStorm || 0, 0, wxClear);
        ship.sunCloudOcclusion = lerp(ship.sunCloudOcclusion || 0, 0, wxClear);
    }

    // Densidad local continua de neblina sobre el observador (nave o astronauta)
    if (nearestPlanet && atmoWeight > 0.01 && typeof samplePlanetFog === 'function') {
        const fogSample = samplePlanetFog(nearestPlanet, obsX, obsY);
        const fogBlend = clamp(dt * 2.4, 0, 1);
        ship.localFogDensity = lerp(ship.localFogDensity || 0, fogSample.density, fogBlend);
        ship.localFogNightGlow = lerp(ship.localFogNightGlow || 0, fogSample.nightGlow || 0, fogBlend);
        if (fogSample.color) {
            if (!ship.localFogColor) ship.localFogColor = [...fogSample.color];
            else {
                ship.localFogColor[0] = Math.round(lerp(ship.localFogColor[0], fogSample.color[0], fogBlend));
                ship.localFogColor[1] = Math.round(lerp(ship.localFogColor[1], fogSample.color[1], fogBlend));
                ship.localFogColor[2] = Math.round(lerp(ship.localFogColor[2], fogSample.color[2], fogBlend));
            }
        }
    } else {
        ship.localFogDensity = lerp(ship.localFogDensity || 0, 0, clamp(dt * 2.8, 0, 1));
        ship.localFogNightGlow = lerp(ship.localFogNightGlow || 0, 0, clamp(dt * 2.8, 0, 1));
    }

    // Oscurecimiento realista y desaturación atmosférica del cielo según el tipo de tormenta y cobertura nubosa
    if ((ship.cloudOvercast || 0) > 0.004 && atmoWeight > 0.01) {
        const stormInfo = (typeof getLocalStormDarkness === 'function')
            ? getLocalStormDarkness(nearestPlanet)
            : {
                overcast: clamp(ship.cloudOvercast, 0, 1) * smoothstep(0.01, 0.25, atmoWeight),
                storm: clamp(ship.cloudStorm || 0, 0, 1),
                skyDark: clamp(ship.cloudOvercast, 0, 1) * (0.20 + clamp(ship.cloudStorm || 0, 0, 1) * 0.40),
                tint: [36, 46, 66],
                desat: 0.62
            };
        const ov = stormInfo.overcast;
        const st = stormInfo.storm;
        const sol = ship.currentSolarState;
        const dayW = sol ? clamp(sol.dayFactor, 0, 1) : 1.0;
        const twiW = sol ? clamp(sol.twilightFactor, 0, 1) : 0.0;
        const nightW = sol ? clamp(sol.nightFactor, 0, 1) : 0.0;
        const wSum = Math.max(0.001, dayW + twiW + nightW);

        const lum = targetSkyRGB[0] * 0.299 + targetSkyRGB[1] * 0.587 + targetSkyRGB[2] * 0.114;
        const tintLum = Math.max(1, stormInfo.tint[0] * 0.299 + stormInfo.tint[1] * 0.587 + stormInfo.tint[2] * 0.114);
        const scaledTint = [
            stormInfo.tint[0] * (lum / tintLum) * 0.92,
            stormInfo.tint[1] * (lum / tintLum) * 0.92,
            stormInfo.tint[2] * (lum / tintLum) * 0.92
        ];
        const desatAmt = ov * (stormInfo.desat * (0.55 + st * 0.45)) * ((dayW + twiW * 0.72) / wSum);

        const dayDark = 1.0 - stormInfo.skyDark;
        const twiDark = 1.0 - Math.min(0.88, stormInfo.skyDark * 1.05);
        const nightDark = 1.0 - ov * 0.24;
        const darkMult = (dayDark * dayW + twiDark * twiW + nightDark * nightW) / wSum;

        targetSkyRGB = [
            Math.max(1, Math.round(lerp(targetSkyRGB[0], scaledTint[0], desatAmt) * darkMult)),
            Math.max(1, Math.round(lerp(targetSkyRGB[1], scaledTint[1], desatAmt) * darkMult)),
            Math.max(2, Math.round(lerp(targetSkyRGB[2], scaledTint[2], desatAmt) * darkMult))
        ];
    }

    const activeCavern = !!(nearestPlanet && nearestPlanet.isHollow && typeof isShipInsideCavern === 'function' && isShipInsideCavern(nearestPlanet, obsX, obsY));
    ship.insideCavernPlanet = activeCavern ? nearestPlanet : null;
    ship.cavernDepthBlend = lerp(ship.cavernDepthBlend || 0, activeCavern ? 1 : 0, clamp(dt * 4.5, 0, 1));
    ship.cavernInvertedGravity = !!(activeCavern && nearestPlanet.hollowPhysicsMode === 'inverted_shell');
    if (ship.cavernDepthBlend > 0.01 && nearestPlanet && nearestPlanet.isHollow) {
        const gc = nearestPlanet.cavernGlowColor || [56, 189, 248];
        const cavernTint = [Math.round(4 + gc[0] * 0.08), Math.round(6 + gc[1] * 0.09), Math.round(12 + gc[2] * 0.11)];
        targetSkyRGB = lerpRGB(targetSkyRGB, cavernTint, ship.cavernDepthBlend);
    }

    camera.skyColor[0] = lerp(camera.skyColor[0], targetSkyRGB[0], dt * 3.0);
    camera.skyColor[1] = lerp(camera.skyColor[1], targetSkyRGB[1], dt * 3.0);
    camera.skyColor[2] = lerp(camera.skyColor[2], targetSkyRGB[2], dt * 3.0);

    // --- CAPAS ATMOSFÉRICAS, TELEMETRÍA LOCAL Y REORIENTACIÓN DE HORIZONTE ---
    let localZenith = -Math.PI / 2;
    let distFromPlanetCenter = Infinity;
    let altFromSurface = Infinity;
    let atmoInfo = getAtmoLayerInfo(null, Infinity);

    if (nearestPlanet) {
        ship.nearestPlanet = nearestPlanet;
        const relX = ship.x - nearestPlanet.x;
        const relY = ship.y - nearestPlanet.y;
        distFromPlanetCenter = Math.hypot(relX, relY);
        localZenith = Math.atan2(relY, relX);
        altFromSurface = Math.max(0, distFromPlanetCenter - getSurfaceRadius(nearestPlanet, localZenith));
        atmoInfo = getAtmoLayerInfo(nearestPlanet, altFromSurface);

        // Descomposición de velocidad en vertical (radial) y horizontal (tangencial)
        const radX = Math.cos(localZenith);
        const radY = Math.sin(localZenith);
        const tangX = -radY;
        const tangY = radX;
        ship.verticalSpeed = ship.vx * radX + ship.vy * radY;
        ship.horizontalSpeed = ship.vx * tangX + ship.vy * tangY;

        // Corredor de aproximación y horizonte planetario (escalado al tamaño y atmósfera del cuerpo celeste)
        const atmoDepth = Math.max(120, nearestPlanet.atmoRadius - nearestPlanet.radius);
        const approachLimit = Math.min(
            nearestPlanet.gravityRadius * 0.72,
            Math.max(atmoDepth * 1.35, nearestPlanet.radius * 0.24, 1500)
        );
        if (altFromSurface < approachLimit && ship.orbitMode === 'off') {
            const horizonBlend = smoothstep(approachLimit, approachLimit * 0.14, altFromSurface);
            const lowAltRef = Math.max(950, approachLimit * 0.32);
            const lowAltFrac = clamp(1 - altFromSurface / lowAltRef, 0, 1);
            ship.sasAssistWeight = lerp(ship.sasAssistWeight, Math.max(0.55 * horizonBlend, lowAltFrac), dt * 4.5);
            ship.landingAssistFactor = lowAltFrac;

            const flipCavern = ship.cavernInvertedGravity ? Math.PI : 0;
            const targetHorizonCamRot = -Math.PI / 2 - localZenith + flipCavern;
            const rotDiff = Math.atan2(Math.sin(targetHorizonCamRot - camera.rotation), Math.cos(targetHorizonCamRot - camera.rotation));
            const alignSpeed = ship.isGrounded ? 6.8 : lerp(1.35, 5.2, horizonBlend);
            camera.rotation += rotDiff * clamp(dt * alignSpeed, 0, 1);
        } else {
            ship.sasAssistWeight = lerp(ship.sasAssistWeight, 0, dt * 3.0);
            ship.landingAssistFactor = 0;
            if (ship.orbitMode !== 'off') {
                const targetHorizonCamRot = -Math.PI / 2 - localZenith;
                const rotDiff = Math.atan2(Math.sin(targetHorizonCamRot - camera.rotation), Math.cos(targetHorizonCamRot - camera.rotation));
                camera.rotation += rotDiff * clamp(dt * 2.4, 0, 1);
            }
        }
    } else {
        ship.nearestPlanet = null;
        ship.sasAssistWeight = lerp(ship.sasAssistWeight, 0, dt * 2.5);
        ship.landingAssistFactor = 0;
        ship.verticalSpeed = 0;
        ship.horizontalSpeed = Math.hypot(ship.vx, ship.vy);
        if (ship.orbitMode !== 'off') disengageOrbitMode(true);
    }

    // Telemetría orbital instantánea
    const orbInfo = computeOrbitalInfo(nearestPlanet, distFromPlanetCenter);

    ship.atmoPressure = atmoInfo.pressure;
    ship.currentLayerName = atmoInfo.layerName;
    ship.localWind = (nearestPlanet && typeof samplePlanetWind === 'function')
        ? samplePlanetWind(nearestPlanet, ship.x, ship.y)
        : null;

    // Si el astronauta está en EVA, desactivar controles de vuelo de la sonda
    if (typeof astronaut !== 'undefined' && astronaut.active) {
        ship.thrusting = false;
        ship.warping = false;
        ship.braking = false;
        ship.turnVal = 0;
        ship.rcsStrafe = 0;
        ship.targetAngle = null;
        if (ship.orbitMode !== 'off') disengageOrbitMode(true);
    }

    // --- PILOTO AUTOMÁTICO ORBITAL (INSERCIÓN Y MANTENIMIENTO DE ÓRBITA) ---
    ship.orbitAutoThrust = false;
    ship.orbitAutoThrottle = 0;
    let orbitSteerAngle = null;

    if (ship.orbitMode !== 'off') {
        if (!nearestPlanet || !orbInfo || ship.isGrounded || distFromPlanetCenter >= nearestPlanet.gravityRadius * 1.48) {
            disengageOrbitMode(false, 'Fuera del pozo gravitatorio.');
        } else if (ship.orbitMode === 'inserting') {
            if (!ship.infiniteFuel && ship.fuel <= 0.1) {
                disengageOrbitMode(false, 'Combustible agotado durante la inserción orbital.');
            } else {
                const bounds = orbInfo.bounds;
                ship.orbitTargetRadius = clamp(ship.orbitTargetRadius || bounds.idealR, bounds.minSafeR, bounds.maxSafeR);
                const rErr = ship.orbitTargetRadius - orbInfo.r;
                const targetPull = getPlanetGravityPull(nearestPlanet, ship.orbitTargetRadius);
                const targetVCirc = Math.sqrt(Math.max(0, ship.orbitTargetRadius * targetPull));

                const desiredVRad = clamp(rErr * 0.72, -300, 300);
                const desiredVTang = ship.orbitDir * targetVCirc;
                const errRad = desiredVRad - orbInfo.vRad;
                const errTang = desiredVTang - orbInfo.vTang;
                const errMag = Math.hypot(errRad, errTang);

                if (Math.abs(rErr) < 95 && Math.abs(orbInfo.vRad) < 40 && Math.abs(errTang) < 45) {
                    ship.orbitMode = 'locked';
                    ship.orbitAngle = Math.atan2(ship.y - nearestPlanet.y, ship.x - nearestPlanet.x);
                    if (typeof showHoloCard === 'function') {
                        const altM = Math.round((ship.orbitTargetRadius - nearestPlanet.radius) * 0.1);
                        showHoloCard(nearestPlanet, 'ÓRBITA ESTABLE ALCANZADA', `En órbita continua (${altM} m). [W/S] Ajustar altura · [O] o [Shift] Salir.`);
                    }
                    if (typeof sfx === 'function') sfx('playChime');
                } else {
                    const dvx = orbInfo.tangX * errTang + orbInfo.radX * errRad;
                    const dvy = orbInfo.tangY * errTang + orbInfo.radY * errRad;
                    orbitSteerAngle = Math.atan2(dvy, dvx);
                    ship.orbitAutoThrust = true;
                    ship.orbitAutoThrottle = clamp(errMag / 160, 0.35, 1.0);
                }
            }
        } else if (ship.orbitMode === 'locked') {
            const bounds = orbInfo.bounds;
            if (ship.thrusting) {
                ship.orbitTargetRadius = clamp(ship.orbitTargetRadius + 280 * dt, bounds.minSafeR, bounds.maxSafeR);
            } else if (ship.braking) {
                ship.orbitTargetRadius = clamp(ship.orbitTargetRadius - 280 * dt, bounds.minSafeR, bounds.maxSafeR);
            }
            // Orientar proa suavemente en dirección progrado (tangente orbital)
            orbitSteerAngle = Math.atan2(orbInfo.tangY * ship.orbitDir, orbInfo.tangX * ship.orbitDir);
        }
    }

    // Vectorización de empuje (TVC - Gimbal dinámico de la campana del motor)
    const targetGimbal = (ship.turnVal * -0.28) + clamp(ship.av * -0.12, -0.18, 0.18);
    ship.gimbalAngle = lerp(ship.gimbalAngle, targetGimbal, dt * 16);

    // --- PROPULSIÓN, PLUMA MULTI-CAPA Y GENERACIÓN DE NUBES ATMOSFÉRICAS ---
    const sliderThrottle = clamp(ship.throttle !== undefined ? ship.throttle : 0.0, 0, 1);
    const hasFuel = ship.fuel > 0 || !!ship.infiniteFuel;
    const isWarp = ship.warping && hasFuel;
    const isManualThrust = (ship.thrusting || sliderThrottle > 0.005) && !isWarp;
    const manualPower = ship.thrusting ? 1.0 : sliderThrottle;
    const isFiring = (isManualThrust || isWarp || ship.orbitAutoThrust) && hasFuel;
    const manualThrottle = isWarp ? 1.38 : (isManualThrust ? manualPower : 0.0);
    const targetIntensity = isFiring ? Math.max(manualThrottle, ship.orbitAutoThrottle || 0) : 0.0;
    ship.thrustIntensity = lerp(ship.thrustIntensity, targetIntensity, dt * (isFiring ? 15 : 9));

    const cosA = Math.cos(ship.angle);
    const sinA = Math.sin(ship.angle);
    const persistenceMult = nearestPlanet ? (nearestPlanet.archetype.smokePersistence || 1.2) : 1.0;

    // --- CÁLCULO PRECISO DE INTERSECCIÓN Y DEFLEXIÓN DE LA LLAMA CONTRA EL TERRENO ---
    ship.flameDeflection = null;
    if (ship.thrustIntensity > 0.01 && nearestPlanet) {
        let nozX = ship.x - cosA * (14.5 * (ship.scale || 1.0));
        let nozY = ship.y - sinA * (14.5 * (ship.scale || 1.0));
        if (ship.customRocket && ship.customRocket.engines) {
            const activeEngs = ship.customRocket.engines.filter(eng => eng.active !== false);
            if (activeEngs.length > 0) {
                const sScaleDef = ship.customRocket.scale || 1.0;
                let minAltNoz = Infinity;
                for (const eng of activeEngs) {
                    const ex = ship.x + cosA * (eng.flightX * sScaleDef) - sinA * (eng.flightY * sScaleDef);
                    const ey = ship.y + sinA * (eng.flightX * sScaleDef) + cosA * (eng.flightY * sScaleDef);
                    const dNoz = Math.hypot(ex - nearestPlanet.x, ey - nearestPlanet.y);
                    if (dNoz < minAltNoz) {
                        minAltNoz = dNoz;
                        nozX = ex;
                        nozY = ey;
                    }
                }
            }
        }
        const fAng = ship.angle + Math.PI + (ship.gimbalAngle || 0);
        const dirX = Math.cos(fAng);
        const dirY = Math.sin(fAng);

        const vacFac = clamp(1 - (ship.atmoPressure || 0), 0, 1);
        const freePlumeLen = (isWarp ? 78 : lerp(48, 66, vacFac)) * clamp(ship.thrustIntensity, 0.2, 1.4);

        const dNozCent = Math.hypot(nozX - nearestPlanet.x, nozY - nearestPlanet.y);
        const angNoz = Math.atan2(nozY - nearestPlanet.y, nozX - nearestPlanet.x);
        const srNoz = getSurfaceRadius(nearestPlanet, angNoz);
        const altNoz = dNozCent - srNoz;

        if (ship.isGrounded || altNoz <= 2.0) {
            const normX = Math.cos(angNoz);
            const normY = Math.sin(angNoz);
            const tangLeftX = -normY;
            const tangLeftY = normX;
            const dotT = dirX * tangLeftX + dirY * tangLeftY;
            const ratioLeft = clamp(0.5 + dotT * 0.45, 0.15, 0.85);

            ship.flameDeflection = {
                active: true,
                sHit: Math.max(0.5, altNoz),
                hitX: nozX,
                hitY: nozY,
                angle: angNoz,
                normalX: normX,
                normalY: normY,
                tangentLeftX: tangLeftX,
                tangentLeftY: tangLeftY,
                tangentRightX: -tangLeftX,
                tangentRightY: -tangLeftY,
                ratioLeft,
                ratioRight: 1 - ratioLeft,
                intensity: clamp(ship.thrustIntensity, 0.1, 1.3),
                freePlumeLen,
                planet: nearestPlanet
            };
        } else {
            const toCentX = nearestPlanet.x - nozX;
            const toCentY = nearestPlanet.y - nozY;
            const dotCent = dirX * toCentX + dirY * toCentY;

            if (dotCent > 0 && altNoz < freePlumeLen + 40) {
                let sMin = 0;
                let sMax = freePlumeLen + 15;
                let hitFound = false;

                const endX = nozX + dirX * sMax;
                const endY = nozY + dirY * sMax;
                const endAng = Math.atan2(endY - nearestPlanet.y, endX - nearestPlanet.x);
                const endSr = getSurfaceRadius(nearestPlanet, endAng);
                const endDist = Math.hypot(endX - nearestPlanet.x, endY - nearestPlanet.y);

                if (endDist <= endSr) {
                    hitFound = true;
                    for (let step = 0; step < 6; step++) {
                        const sMid = (sMin + sMax) * 0.5;
                        const mx = nozX + dirX * sMid;
                        const my = nozY + dirY * sMid;
                        const mang = Math.atan2(my - nearestPlanet.y, mx - nearestPlanet.x);
                        const msr = getSurfaceRadius(nearestPlanet, mang);
                        const mdist = Math.hypot(mx - nearestPlanet.x, my - nearestPlanet.y);
                        if (mdist <= msr) {
                            sMax = sMid;
                        } else {
                            sMin = sMid;
                        }
                    }
                }

                const sHit = (sMin + sMax) * 0.5;
                if (hitFound && sHit <= freePlumeLen) {
                    const hitX = nozX + dirX * sHit;
                    const hitY = nozY + dirY * sHit;
                    const hitAng = Math.atan2(hitY - nearestPlanet.y, hitX - nearestPlanet.x);
                    const normX = Math.cos(hitAng);
                    const normY = Math.sin(hitAng);
                    const tangLeftX = -normY;
                    const tangLeftY = normX;

                    const dotN = -(dirX * normX + dirY * normY);
                    if (dotN > 0.02) {
                        const dotT = dirX * tangLeftX + dirY * tangLeftY;
                        const ratioLeft = clamp(0.5 + dotT * 0.45, 0.15, 0.85);
                        const deflectIntensity = clamp((1 - sHit / freePlumeLen) * Math.max(0.25, dotN) * ship.thrustIntensity, 0.05, 1.3);

                        ship.flameDeflection = {
                            active: true,
                            sHit,
                            hitX,
                            hitY,
                            angle: hitAng,
                            normalX: normX,
                            normalY: normY,
                            tangentLeftX: tangLeftX,
                            tangentLeftY: tangLeftY,
                            tangentRightX: -tangLeftX,
                            tangentRightY: -tangLeftY,
                            ratioLeft,
                            ratioRight: 1 - ratioLeft,
                            intensity: deflectIntensity,
                            freePlumeLen,
                            planet: nearestPlanet
                        };
                    }
                }
            }
        }
    }

    // Modelo de cohete activo y propiedades físicas vectoriales
    const curModel = (typeof getRocketModel === 'function') ? getRocketModel(ship.modelKey) : null;
    const modelSmokeScale = curModel ? (curModel.smokeScale || 1.0) : 1.0;
    const modelPuffBase = curModel ? (curModel.puffBaseSize || 5.5) : 5.5;

    // Animar piezas desplegables (paneles solares y patas) y calcular potencia solar activa
    let activeSolarWatts = 0;
    let deployAnimChanged = false;
    if (ship.customRocket && ship.customRocket.customParts && typeof ROCKET_PARTS_CATALOG !== 'undefined') {
        for (const p of ship.customRocket.customParts) {
            const def = ROCKET_PARTS_CATALOG[p.partDefId];
            if (!def) continue;
            if (def.deployable) {
                const targetAnim = (p.deployed === false) ? 0.0 : 1.0;
                const curAnim = (typeof p.deployAnim === 'number') ? p.deployAnim : targetAnim;
                const nextAnim = curAnim + (targetAnim - curAnim) * Math.min(1, dt * 4.5);
                if (Math.abs(nextAnim - curAnim) > 0.002) deployAnimChanged = true;
                p.deployAnim = nextAnim;
                if (def.isSolarPanel && p.deployAnim > 0.6) {
                    activeSolarWatts += (def.electricalGen || 0) * p.deployAnim;
                }
            } else if (def.electricalGen) {
                activeSolarWatts += def.electricalGen;
            }
        }
        ship.customRocket.activeSolarWatts = activeSolarWatts;
        if (deployAnimChanged && typeof buildCustomContactPoints === 'function' && ship.customRocket.com) {
            ship.customRocket.contactPoints = buildCustomContactPoints(
                ship.customRocket.customParts,
                ship.customRocket.com.x,
                ship.customRocket.com.y
            );
        }
        if ((deployAnimChanged || !ship.customRocket.aero) && typeof analyzeRocketAerodynamics === 'function') {
            ship.customRocket.aero = analyzeRocketAerodynamics(
                ship.customRocket.customParts,
                ship.customRocket.com,
                ship.customRocket.bounds
            );
        }
    }

    let activeGimbalThrust = 0;
    const fuelFrac = clamp(ship.fuel / Math.max(1, ship.maxFuel), 0, 1);
    if (ship.customRocket) {
        const cr = ship.customRocket;
        const currentMass = Math.max(0.4, (cr.dryMass || 1.0) + (cr.fuelMass || 0) * fuelFrac);
        const baseMass = Math.max(0.4, cr.mass || currentMass);
        ship.mass = currentMass;
        if (cr.inertia) {
            ship.inertia = Math.max(60, cr.inertia * (currentMass / baseMass));
        }
    } else if (curModel) {
        const baseMass = Math.max(0.4, curModel.mass || 1.0);
        ship.mass = baseMass * (0.58 + 0.42 * fuelFrac);
    }

    if (isFiring) {
        const autoOnly = ship.orbitAutoThrust && !isManualThrust && !isWarp;
        const throttleMult = isWarp ? 1.0 : (autoOnly ? (ship.orbitAutoThrottle || 1.0) : manualPower);

        let thrustAcc = (curModel ? (isWarp ? curModel.warpThrust : curModel.thrust) : (isWarp ? 1200 : 475)) * throttleMult;
        if (isWarp && (!atmoInfo.inAtmo || atmoInfo.atmoFrac > 0.65)) {
            thrustAcc *= 2.1;
        }
        if (curModel && curModel.mass) {
            // Relación empuje-peso real (TWR): al quemar combustible o aligerar la nave, aumenta la aceleración
            const massRatio = clamp((curModel.mass || 1.0) / Math.max(0.4, ship.mass || curModel.mass || 1.0), 0.55, 2.2);
            if (isWarp || !ship.customRocket) {
                thrustAcc *= massRatio;
            }
        }
        let baseFuelBurn = curModel ? (isWarp ? curModel.fuelConsumption * 2.4 : curModel.fuelConsumption) : (isWarp ? 4.6 : 1.8);

        // Física newtoniana real (F = m * a) y modos de motor para cohetes personalizados
        if (ship.customRocket && ship.customRocket.engines && ship.customRocket.engines.length > 0 && !isWarp) {
            const cr = ship.customRocket;
            const currentMass = Math.max(0.4, ship.mass || cr.mass || 1.0);
            const atmoP = clamp(atmoInfo.pressure || 0, 0, 1.2);
            const vacBonus = 1.0 - clamp(atmoP, 0, 1);
            const hasSolarPower = activeSolarWatts > 5;

            let effThrustX = 0;
            let effFuelBurn = 0;

            for (const eng of cr.engines) {
                if (eng.active === false) continue;
                let engT = eng.thrust || 0;
                let engC = eng.consumption || 1.0;
                const mode = eng.engineMode || 'sea';

                if (mode === 'vacuum') {
                    // Alta eficiencia en vacío (-45% consumo)
                    engC *= lerp(1.0, 0.55, vacBonus);
                    engT *= lerp(0.85, 1.08, vacBonus);
                } else if (mode === 'ion') {
                    // Potenciado +50% con paneles solares desplegados
                    if (hasSolarPower) engT *= 1.5;
                    if (atmoP > 0.35) engT *= 0.45; // Pierde eficiencia en atmósfera densa
                } else if (mode === 'sea') {
                    engT *= lerp(1.0, 0.94, vacBonus);
                }

                effThrustX += engT * Math.cos(eng.angleOffset || 0);
                effFuelBurn += engC;
            }

            const worldG = 285; // 1.0 G en ÉTER
            thrustAcc = Math.max(0, (effThrustX / currentMass) * (worldG / 9.81)) * throttleMult;
            baseFuelBurn = Math.max(0.1, effFuelBurn);
        }

        const fuelBurn = baseFuelBurn * throttleMult * (autoOnly ? 0.25 : 1.0);
        const preSpd = Math.hypot(ship.vx, ship.vy);
        const refMass = (curModel && curModel.mass) ? curModel.mass : 1.0;
        const massSpeedBonus = clamp(Math.pow(refMass / Math.max(0.4, ship.mass || refMass), 0.25), 0.75, 1.35);
        const baseNormalCap = (curModel && curModel.maxSpeed ? curModel.maxSpeed * 3.2 : 2100) * massSpeedBonus;
        const baseWarpCap = (curModel && curModel.warpMaxSpeed ? curModel.warpMaxSpeed * 3.6 : 4860) * massSpeedBonus;
        let activeThrustCap = isWarp ? baseWarpCap : baseNormalCap;
        if (nearestPlanet && distFromPlanetCenter < nearestPlanet.gravityRadius && orbInfo) {
            activeThrustCap = Math.max(activeThrustCap, (orbInfo.circularSpeed || 0) * 1.85);
        }

        const dvx = cosA * thrustAcc * dt;
        const dvy = sinA * thrustAcc * dt;
        if (preSpd > 1) {
            // Factor relativista suave: sin tope rígido, pero a mayor velocidad cuesta progresivamente más acelerar hacia adelante
            const nx = ship.vx / preSpd;
            const ny = ship.vy / preSpd;
            const proj = dvx * nx + dvy * ny;
            if (proj > 0) {
                const speedRatio = preSpd / Math.max(400, activeThrustCap);
                const relFactor = 1 / Math.pow(1 + speedRatio * speedRatio, 1.25);
                const latX = dvx - nx * proj;
                const latY = dvy - ny * proj;
                ship.vx += latX + nx * (proj * relFactor);
                ship.vy += latY + ny * (proj * relFactor);
            } else {
                // Frenado retrógrado o empuje perpendicular conservan el 100% de su potencia
                ship.vx += dvx;
                ship.vy += dvy;
            }
        } else {
            ship.vx += dvx;
            ship.vy += dvy;
        }
        if (!ship.infiniteFuel) {
            ship.fuel = Math.max(0, ship.fuel - dt * fuelBurn);
        }

        const sScale = curModel ? (curModel.scale || 1.0) : 1.0;

        // Lista de toberas activas reales en el mundo (multi-motor para cohetes custom, o tobera única)
        const activeCustomEngines = (ship.customRocket && ship.customRocket.engines)
            ? ship.customRocket.engines.filter(eng => eng.active !== false)
            : [];
        const activeNozzles = activeCustomEngines.length > 0
            ? activeCustomEngines.map(eng => ({
                wx: ship.x + cosA * (eng.flightX * sScale) - sinA * (eng.flightY * sScale),
                wy: ship.y + sinA * (eng.flightX * sScale) + cosA * (eng.flightY * sScale),
                scale: eng.scale || 1.0,
                angOff: eng.angleOffset || 0
            }))
            : [{
                wx: ship.x - cosA * (15.5 * sScale),
                wy: ship.y - sinA * (15.5 * sScale),
                scale: 1.0,
                angOff: 0
            }];

        const primaryNoz = activeNozzles[0];
        const nozzleX = primaryNoz.wx;
        const nozzleY = primaryNoz.wy;

        // 1. Partículas de Plasma de Alta Velocidad en el Núcleo del Escape (por cada motor)
        const plumeCount = isWarp ? 4 : Math.max(2, Math.round(4 / Math.sqrt(activeNozzles.length)));
        const expansionSpread = isWarp ? 0.22 : lerp(0.68, 0.18, clamp(atmoInfo.pressure, 0, 1.2));
        for (const noz of activeNozzles) {
            for (let i = 0; i < plumeCount; i++) {
                const spread = (Math.random() - 0.5) * expansionSpread;
                const ejAngle = ship.angle + Math.PI + noz.angOff + ship.gimbalAngle * 0.65 + spread;
                const ejSpeed = (isWarp ? 420 : 280) + Math.random() * 160;
                const life = (isWarp ? 0.24 : 0.26) + Math.random() * 0.22;

                particles.push({
                    x: noz.wx + (Math.random() - 0.5) * 2.8,
                    y: noz.wy + (Math.random() - 0.5) * 2.8,
                    vx: ship.vx * 0.35 + Math.cos(ejAngle) * ejSpeed,
                    vy: ship.vy * 0.35 + Math.sin(ejAngle) * ejSpeed,
                    size: ((isWarp ? 4.4 : 3.6) + Math.random() * 2.2) * clamp(noz.scale, 0.65, 1.35),
                    life,
                    maxLife: life,
                    isWarp,
                    type: 'plume',
                    atmoPressure: atmoInfo.pressure
                });
            }
        }

        // 2. En vacío o exosfera alta: Halo de gas en expansión rápida ("Nebulosa de Vacío")
        if (atmoInfo.vacuumPlumeFactor > 0.35 && Math.random() < 0.75) {
            const vNoz = activeNozzles[Math.floor(Math.random() * activeNozzles.length)];
            const vacSpread = (Math.random() - 0.5) * 1.15;
            const vacAngle = ship.angle + Math.PI + vNoz.angOff + ship.gimbalAngle * 0.5 + vacSpread;
            const vacSpeed = 140 + Math.random() * 110;
            const vLife = 0.45 + Math.random() * 0.35;
            particles.push({
                x: vNoz.wx,
                y: vNoz.wy,
                vx: ship.vx * 0.5 + Math.cos(vacAngle) * vacSpeed,
                vy: ship.vy * 0.5 + Math.sin(vacAngle) * vacSpeed,
                size: 7 + Math.random() * 6,
                life: vLife,
                maxLife: vLife,
                isWarp,
                type: 'vacuum_plume'
            });
        }

        // 3. Chispas incandescentes de alta velocidad del motor
        if (Math.random() < (isWarp ? 0.75 : 0.85)) {
            const spNoz = activeNozzles[Math.floor(Math.random() * activeNozzles.length)];
            const sparkAngle = ship.angle + Math.PI + spNoz.angOff + ship.gimbalAngle * 0.6 + (Math.random() - 0.5) * 0.32;
            const sparkSpeed = (isWarp ? 360 : 250) + Math.random() * 210;
            createSparks(
                spNoz.wx, spNoz.wy, 2, sparkAngle, 0.22,
                sparkSpeed * 0.85, sparkSpeed * 1.25,
                isWarp ? [186, 230, 253] : [255, 238, 175],
                0.38
            );
        }

        // 4. NUBES DE HUMO SEGÚN LA CAPA ATMOSFÉRICA Y EL PLANETA
        // Escalado sublineal realista: evita humo desproporcionado en cohetes gigantes y protege el rendimiento
        const smokeRateMult = Math.min(1.85, Math.pow(Math.max(0.2, modelSmokeScale), 0.52));
        const effectivePuffBase = modelPuffBase > 4.2 ? Math.min(9.5, 4.2 + (modelPuffBase - 4.2) * 0.5) : modelPuffBase;

        if (nearestPlanet && atmoInfo.inAtmo) {
            const arch = nearestPlanet.archetype;

            // 4A. CAPA TROPOSFÉRICA BAJA: Estela continua de humo denso y turbulento
            if (atmoInfo.troposphereFactor > 0.06) {
                const baseSpawnRate = 38 * atmoInfo.troposphereFactor * smokeRateMult;
                ship.smokeSpawnAccum += dt * baseSpawnRate;
                const spawnTotal = Math.floor(ship.smokeSpawnAccum);
                let spawnIdx = 0;
                while (ship.smokeSpawnAccum >= 1) {
                    ship.smokeSpawnAccum -= 1;
                    spawnIdx++;
                    const smNoz = activeNozzles[Math.floor(Math.random() * activeNozzles.length)];
                    const ejAngle = ship.angle + Math.PI + smNoz.angOff + ship.gimbalAngle * 0.5 + (Math.random() - 0.5) * 0.24;
                    const ejSpd = (95 + Math.random() * 80) * clamp(ship.thrustIntensity, 0.45, 1.35);
                    const smokeCol = arch.launchSmokeColor || [226, 232, 240];
                    const smokeLife = (4.8 + Math.random() * 3.2) * persistenceMult;
                    // Interpolar posición hacia atrás en el vector de desplazamiento para evitar huecos a alta velocidad
                    const interpFrac = spawnTotal > 1 ? ((spawnIdx - 1) / spawnTotal) : (Math.random() * 0.45);
                    const trailX = smNoz.wx - ship.vx * dt * interpFrac + Math.cos(ejAngle) * (8 + Math.random() * 6);
                    const trailY = smNoz.wy - ship.vy * dt * interpFrac + Math.sin(ejAngle) * (8 + Math.random() * 6);
                    createSmoke(
                        trailX,
                        trailY,
                        1,
                        (effectivePuffBase * 1.18) + Math.random() * (effectivePuffBase * 0.48),
                        smokeCol,
                        ship.vx * 0.22 + Math.cos(ejAngle) * ejSpd,
                        ship.vy * 0.22 + Math.sin(ejAngle) * ejSpd,
                        smokeLife,
                        28 * Math.max(0.75, Math.min(1.4, smokeRateMult * 0.9)),
                        {
                            cloudType: 'exhaust',
                            expansionMult: 3.25 * clamp(0.82 + sScale * 0.16, 0.78, 1.22),
                            alpha: 0.56 * atmoInfo.troposphereFactor,
                            heatGlow: 0.92,
                            planetKey: nearestPlanet.key,
                            windDrift: 0.0022
                        }
                    );
                }
            }

            // 4B. CAPA ESTRATOSFÉRICA / MESOSFÉRICA DE CONDENSACIÓN:
            // Genera la gran nube nacarada / estela de condensación de alta atmósfera
            if (atmoInfo.condensationFactor > 0.08) {
                ship.stratoCloudAccum += dt * (26 * atmoInfo.condensationFactor * smokeRateMult);
                while (ship.stratoCloudAccum >= 1) {
                    ship.stratoCloudAccum -= 1;
                    const stNoz = activeNozzles[Math.floor(Math.random() * activeNozzles.length)];
                    const ejAngle = ship.angle + Math.PI + stNoz.angOff + (Math.random() - 0.5) * 0.44;
                    const ejSpd = 50 + Math.random() * 55;
                    const condCol = isWarp ? [186, 230, 253] : (arch.condensationColor || [224, 242, 254]);
                    const condLife = (14.0 + Math.random() * 8.5) * persistenceMult;
                    createSmoke(
                        stNoz.wx + Math.cos(ejAngle) * 10 - ship.vx * dt * Math.random() * 0.5,
                        stNoz.wy + Math.sin(ejAngle) * 10 - ship.vy * dt * Math.random() * 0.5,
                        1,
                        (effectivePuffBase * 1.32) + Math.random() * 3.4,
                        condCol,
                        ship.vx * 0.15 + Math.cos(ejAngle) * ejSpd,
                        ship.vy * 0.15 + Math.sin(ejAngle) * ejSpd,
                        condLife,
                        22,
                        {
                            cloudType: 'stratosphere',
                            expansionMult: 4.1 * clamp(0.85 + sScale * 0.14, 0.8, 1.2),
                            alpha: 0.42 * atmoInfo.condensationFactor,
                            heatGlow: 0.5,
                            planetKey: nearestPlanet.key,
                            windDrift: 0.0036
                        }
                    );
                }
            }
        }

        // 5. LANZAMIENTO, ATERRIZAJE Y DEFLEXIÓN MASIVA DE HUMO CONTRA EL SUELO
        if (ship.flameDeflection && ship.flameDeflection.active) {
            const def = ship.flameDeflection;
            const P_prox = clamp(1 - def.sHit / 320, 0, 1);
            const arch = nearestPlanet.archetype;
            const launchSmokeCol = arch.launchSmokeColor || arch.surfaceDustColor || [228, 234, 242];

            // Tasa volumétrica continua de nubes rodantes sobre el relieve (acotada para realismo y FPS)
            const groundRate = curModel ? (curModel.groundSmokeRate || 36) : 36;
            const effGroundRate = Math.min(72, groundRate * 0.95);
            ship.groundSmokeAccum = (ship.groundSmokeAccum || 0) + dt * (effGroundRate + 42 * P_prox * smokeRateMult) * clamp(ship.thrustIntensity, 0.25, 1.35);
            while (ship.groundSmokeAccum >= 1) {
                ship.groundSmokeAccum -= 1;

                const side = Math.random() < def.ratioLeft ? 1 : -1;
                const tx = side > 0 ? def.tangentLeftX : def.tangentRightX;
                const ty = side > 0 ? def.tangentLeftY : def.tangentRightY;
                const nx = def.normalX;
                const ny = def.normalY;

                // Alta velocidad tangencial lateral rodando sobre el relieve antes de rizarse hacia arriba
                const rollSpeed = (105 + Math.random() * 170) * (0.45 + 0.55 * P_prox) * clamp(ship.thrustIntensity, 0.4, 1.3) * Math.max(0.8, Math.min(1.25, smokeRateMult));
                const bvx = tx * rollSpeed + nx * (16 + Math.random() * 24);
                const bvy = ty * rollSpeed + ny * (16 + Math.random() * 24);

                const cloudLife = (6.5 + Math.random() * 4.5) * persistenceMult;
                const puffSize = (effectivePuffBase * 1.55 + Math.random() * 4.5) * (0.65 + 0.45 * P_prox);
                // Nacer siempre por encima de la superficie (a lo largo de la normal) para nunca atravesar el suelo
                const spawnLift = puffSize * 0.86;
                const lateralOff = (Math.random() - 0.5) * 10 * Math.min(1.5, sScale) + Math.random() * 10;

                createSmoke(
                    def.hitX + nx * spawnLift + tx * lateralOff,
                    def.hitY + ny * spawnLift + ty * lateralOff,
                    1,
                    puffSize,
                    launchSmokeCol,
                    bvx,
                    bvy,
                    cloudLife,
                    22 * Math.max(0.8, Math.min(1.3, smokeRateMult * 0.85)),
                    {
                        cloudType: 'launch',
                        expansionMult: 3.9 * clamp(0.84 + sScale * 0.16, 0.8, 1.22),
                        alpha: 0.64 * (0.48 + 0.52 * P_prox),
                        heatGlow: 0.98 * P_prox,
                        planetKey: nearestPlanet.key,
                        windDrift: 0.0022,
                        vortexDir: side
                    }
                );
            }

            // Polvo rasante de eyección horizontal rápida
            if (Math.random() < 0.85 * P_prox) {
                const side = Math.random() < def.ratioLeft ? 1 : -1;
                const tx = side > 0 ? def.tangentLeftX : def.tangentRightX;
                const ty = side > 0 ? def.tangentLeftY : def.tangentRightY;
                const dustSpeed = (110 + Math.random() * 180) * P_prox;
                const dLife = 0.45 + Math.random() * 0.45;
                particles.push({
                    x: def.hitX + (Math.random() - 0.5) * 12,
                    y: def.hitY + (Math.random() - 0.5) * 12,
                    vx: tx * dustSpeed + def.normalX * (Math.random() * 18),
                    vy: ty * dustSpeed + def.normalY * (Math.random() * 18),
                    size: 2.8 + Math.random() * 3.5,
                    life: dLife,
                    maxLife: dLife,
                    isWarp,
                    type: 'dust',
                    customRGB: arch.surfaceDustColor || arch.rimColor
                });
            }

            // Chispas de impacto térmico en el punto de estancamiento
            if (Math.random() < 0.48 * P_prox) {
                const hitSpkAngle = def.angle + (Math.random() - 0.5) * Math.PI * 0.85;
                createSparks(def.hitX, def.hitY, 2, hitSpkAngle, 0.42, 80, 210, arch.impactSparksColor, 0.45);
            }

            if (arch.isLiquid && Math.random() < 0.45) {
                createLiquidRipple(nearestPlanet, def.angle, 14, arch.accentColor);
            }
        }
    } else {
        // Venteo criogénico suave de oxígeno líquido (LOX boil-off) en plataforma antes del despegue
        if (ship.isGrounded || (nearestPlanet && altFromSurface < 250 && Math.hypot(ship.vx, ship.vy) < 20)) {
            ship.cryoVentTimer += dt;
            if (ship.cryoVentTimer > 1.1) {
                ship.cryoVentTimer = 0;
                const ventSide = Math.random() < 0.5 ? 1 : -1;
                const ventX = ship.x + cosA * 2 - sinA * (ventSide * 7);
                const ventY = ship.y + sinA * 2 + cosA * (ventSide * 7);
                const ventAng = ship.angle + ventSide * (Math.PI * 0.58);
                createSmoke(
                    ventX, ventY, 2, 2.8, [225, 242, 255],
                    Math.cos(ventAng) * 22, Math.sin(ventAng) * 22,
                    1.35, 10,
                    { cloudType: 'dust', expansionMult: 2.2, alpha: 0.32 }
                );
            }
        }
    }

    // --- FÍSICA AERODINÁMICA REALISTA, REENTRADA ORIENTADA Y CONDENSACIÓN TRANSÓNICA ---
    const shipSpeed = Math.hypot(ship.vx, ship.vy);
    if (shipSpeed > 1.5) {
        ship.velAngle = Math.atan2(ship.vy, ship.vx);
        ship.aoa = Math.atan2(Math.sin(ship.angle - ship.velAngle), Math.cos(ship.angle - ship.velAngle));
    } else {
        ship.velAngle = ship.angle;
        ship.aoa = 0;
    }

    // Trazas de alta velocidad / hiperimpulso alineadas con el vector velocidad real (solo cuando está acelerando)
    const isAccelerating = isFiring || isWarp;
    if (isAccelerating && shipSpeed > 260 && (isWarp || shipSpeed > 420)) {
        const spawnProb = isWarp ? 0.78 : clamp((shipSpeed - 380) / 400, 0.1, 0.5);
        if (Math.random() < spawnProb) {
            const perpAngle = ship.velAngle + Math.PI / 2;
            const lateralOffset = (Math.random() - 0.5) * 850;
            const forwardOffset = 320 + Math.random() * 450;
            warpFlashes.push({
                x: ship.x + Math.cos(ship.velAngle) * forwardOffset + Math.cos(perpAngle) * lateralOffset,
                y: ship.y + Math.sin(ship.velAngle) * forwardOffset + Math.sin(perpAngle) * lateralOffset,
                len: (isWarp ? 160 : 95) + (shipSpeed * 0.16) + Math.random() * 110,
                angle: ship.velAngle,
                isWarp,
                life: 0.22,
                maxLife: 0.22
            });
        }
    }

    let targetReentry = 0;
    let targetVaporCone = 0;
    ship.dynamicPressure = 0.5 * atmoInfo.density * shipSpeed * shipSpeed;
    ship.aeroDragG = 0;

    if (nearestPlanet && atmoInfo.inAtmo && atmoInfo.density > 0.008 && ship.orbitMode !== 'locked') {
        const dragFactor = (atmoInfo.dragFactor !== undefined)
            ? atmoInfo.dragFactor
            : ((altFromSurface > Math.max(100, nearestPlanet.atmoRadius - nearestPlanet.radius) * 0.65) ? 0 : 1.0);
        const atmoDragMult = atmoInfo.dragMult || 1.0;

        // 1. Número de Mach local y Cono de Condensación Transónico (Prandtl-Glauert)
        const localSoundSpeed = nearestPlanet.archetype.speedOfSound || 330;
        ship.machNumber = shipSpeed / localSoundSpeed;
        if (atmoInfo.density > 0.15 && ship.machNumber > 0.84 && ship.machNumber < 1.28) {
            const machBell = 1 - Math.pow((ship.machNumber - 1.02) / 0.20, 2);
            targetVaporCone = clamp(machBell, 0, 1) * clamp(atmoInfo.density * 1.4, 0, 1);
        }

        // 2. Arrastre Aerodinámico (Drag) y Sustentación (Lift) según geometría global, AoA, Mach y masa/sección
        const aero = (ship.customRocket && ship.customRocket.aero) ? ship.customRocket.aero : null;
        const sinAoA = Math.sin(ship.aoa);
        const cosAoA = Math.cos(ship.aoa);
        const sin2AoA = sinAoA * sinAoA;
        const axialCd = aero
            ? (cosAoA >= 0 ? aero.cdForward : aero.cdRetro)
            : (cosAoA >= 0 ? 0.18 : 0.42);
        const broadsideCd = aero ? aero.cdBroadside : 1.35;
        let cdEffective = lerp(axialCd, broadsideCd, sin2AoA);

        // Arrastre de onda transónico alrededor de Mach 1 (menor en cohetes estilizados, mayor en diseños romos)
        if (ship.machNumber > 0.82 && ship.machNumber < 1.30) {
            const waveBell = Math.max(0, 1 - Math.pow((ship.machNumber - 1.02) / 0.24, 2));
            const wavePenalty = aero ? clamp(0.22 + (aero.cdForward - 0.14) * 0.45, 0.22, 0.62) : 0.38;
            cdEffective *= 1 + wavePenalty * waveBell;
        }

        // Factor balístico (sección transversal real expuesta al flujo / masa del cohete)
        let refCrossSection = curModel ? Math.pow(curModel.scale || 1.0, 1.4) : 1.0;
        if (aero) {
            const axialSpan = cosAoA >= 0 ? aero.frontSpan : aero.retroSpan;
            refCrossSection = lerp(axialSpan, aero.sideSpan, sin2AoA);
        } else if (ship.customRocket && ship.customRocket.bounds) {
            const frontSpan = clamp((ship.customRocket.bounds.width || 40) / 40, 0.7, 2.2);
            const sideSpan = clamp((ship.customRocket.bounds.height || 74) / 74, 0.7, 2.5);
            refCrossSection = lerp(frontSpan, sideSpan, sin2AoA);
        }
        const effMass = Math.pow(Math.max(0.5, ship.mass || 1.0), 0.52);
        const ballisticScale = clamp(refCrossSection / effMass, 0.45, 2.15);

        const rawDragAccel = 0.5 * atmoInfo.density * atmoDragMult * shipSpeed * shipSpeed * cdEffective * ballisticScale * 0.00185 * dragFactor;
        // Compresión suave en regímenes extremos para mantener la jugabilidad sin muros artificiales
        const dragForce = rawDragAccel > 320 ? 320 + (rawDragAccel - 320) * 0.45 : rawDragAccel;
        ship.aeroDragG = dragForce / 285;

        if (shipSpeed > 0.5) {
            const dragDv = Math.min(shipSpeed * 0.35, dragForce * dt);
            ship.vx -= (ship.vx / shipSpeed) * dragDv;
            ship.vy -= (ship.vy / shipSpeed) * dragDv;

            // Sustentación aerodinámica de cuerpo (Lift perpendicular al flujo)
            const liftSlope = aero ? clamp(0.24 + aero.finDamping * 0.8, 0.22, 0.42) : 0.26;
            const clEffective = Math.sin(2 * ship.aoa) * liftSlope;
            const liftAcc = Math.min(200, atmoInfo.density * atmoDragMult * shipSpeed * shipSpeed * clEffective * ballisticScale * 0.00045 * dragFactor);
            const liftNormalX = -Math.sin(ship.velAngle);
            const liftNormalY = Math.cos(ship.velAngle);
            ship.vx += liftNormalX * liftAcc * dt;
            ship.vy += liftNormalY * liftAcc * dt;
        }

        // 3. Reentrada Atmosférica y Compresión Hipersónica Direccional
        // El plasma solo se genera en estratos densos (Estratosfera / Troposfera alta, por debajo de la línea de Kármán)
        // y a velocidades hipersónicas reales, evitando ionización prematura en la exosfera o en ascensos suaves.
        const velDotToCenter = (ship.vx * -(ship.x - nearestPlanet.x) + ship.vy * -(ship.y - nearestPlanet.y)) / (distFromPlanetCenter * (shipSpeed || 1));
        const descentBoost = clamp(velDotToCenter + 0.45, 0.25, 1.35);
        const shapeBluntness = aero ? clamp(0.68 + cdEffective * 0.42, 0.68, 1.45) : 0.75;
        const bluntFactor = shapeBluntness + 0.35 * Math.abs(sinAoA); // Mayor sección y romo = mayor choque de plasma

        const atmoPlasmaGate = smoothstep(0.58, 0.32, atmoInfo.atmoFrac) * clamp(dragFactor, 0, 1);
        if (shipSpeed > 260 && atmoInfo.density > 0.035 && atmoPlasmaGate > 0.01 && ship.orbitMode !== 'locked') {
            const speedHeating = clamp((shipSpeed - 260) / 560, 0, 1.45);
            const heatingMult = atmoInfo.heatingMult || 1.0;
            const densityHeating = clamp(Math.pow(atmoInfo.density, 0.85) * heatingMult * 1.12, 0, 1.35);
            targetReentry = clamp(speedHeating * speedHeating * densityHeating * descentBoost * bluntFactor * atmoPlasmaGate, 0, 1.25);
        }

        // Dirección del flujo de aire incidente en el sistema de coordenadas LOCAL del cohete:
        // Si es 0: el aire golpea la PROA (+X). Si es PI: golpea la TOBERA (-X). Si es +-PI/2: golpea el COSTADO/PANZA.
        const targetFlowLocal = Math.atan2(Math.sin(ship.velAngle - ship.angle), Math.cos(ship.velAngle - ship.angle));
        const flowDiff = Math.atan2(Math.sin(targetFlowLocal - ship.reentryFlowAngle), Math.cos(targetFlowLocal - ship.reentryFlowAngle));
        ship.reentryFlowAngle += flowDiff * clamp(dt * 14, 0, 1);

        // Estelas de vórtice en las aletas y proa en maniobras atmosféricas rápidas
        const customExt = (ship.customRocket && ship.customRocket.bounds && ship.customRocket.com) ? ship.customRocket : null;
        const shipHalfLen = customExt ? Math.max(18, (customExt.bounds.height || 74) * 0.25) : 18.5 * (ship.scale || 1.0);
        const liveWidPx = (aero && aero.frontSpan) ? (aero.frontSpan * 40) : (customExt ? (customExt.bounds.width || 40) : 44);
        const shipHalfWid = customExt ? Math.max(10, liveWidPx * 0.25) : 11.0 * (ship.scale || 1.0);
        const shipGeoOffsetX = customExt
            ? -(((customExt.bounds.minY + customExt.bounds.maxY) * 0.5) - customExt.com.y) * 0.5
            : 0;

        if (shipSpeed > 110 && atmoInfo.density > 0.12 && (Math.abs(ship.av) > 0.3 || Math.abs(sinAoA) > 0.25 || targetVaporCone > 0.2)) {
            if (Math.random() < 0.75) {
                const tailOff = shipGeoOffsetX - shipHalfLen * 0.62;
                const wingSpan = shipHalfWid * 1.12;
                const wingL_X = ship.x + cosA * tailOff - sinA * -wingSpan;
                const wingL_Y = ship.y + sinA * tailOff + cosA * -wingSpan;
                const wingR_X = ship.x + cosA * tailOff - sinA * wingSpan;
                const wingR_Y = ship.y + sinA * tailOff + cosA * wingSpan;
                wingTrails.push({
                    x: wingL_X, y: wingL_Y,
                    vx: -ship.vx * 0.12, vy: -ship.vy * 0.12,
                    life: 0.38, maxLife: 0.38, width: 2.0
                });
                wingTrails.push({
                    x: wingR_X, y: wingR_Y,
                    vx: -ship.vx * 0.12, vy: -ship.vy * 0.12,
                    life: 0.38, maxLife: 0.38, width: 2.0
                });
            }
        }
    } else {
        ship.machNumber = 0;
    }

    ship.vaporConeIntensity = lerp(ship.vaporConeIntensity, targetVaporCone, dt * 8.0);
    ship.reentryIntensity = lerp(ship.reentryIntensity, targetReentry, dt * 6.0);

    // Termodinámica direccional del casco (Hull Temperature & Heat Orientation)
    const aeroThermal = (ship.customRocket && ship.customRocket.aero) ? ship.customRocket.aero : null;
    const shieldFacingFlow = (aeroThermal && Math.cos(ship.aoa) < -0.35)
        ? clamp(aeroThermal.retroHeatShieldFactor * (-Math.cos(ship.aoa) - 0.35) / 0.65, 0, 1)
        : 0;
    const solarThermalPenalty = aeroThermal ? aeroThermal.deployedSolarDragFactor * 0.18 : 0;
    const thermalProtection = (1 - 0.45 * shieldFacingFlow) * (1 + solarThermalPenalty);
    const heatingRate = Math.pow(ship.reentryIntensity, 1.25) * 2.4 * thermalProtection + (ship.thrustIntensity > 0.1 ? 0.12 * ship.thrustIntensity : 0);
    const coolingRate = 0.38 * Math.pow(ship.hullTemp, 1.5) + 0.09 * ship.hullTemp;
    ship.hullTemp = clamp(ship.hullTemp + (heatingRate - coolingRate) * dt, 0, 1);
    if (ship.reentryIntensity > 0.05) {
        const hDiff = Math.atan2(Math.sin(ship.reentryFlowAngle - ship.heatAngle), Math.cos(ship.reentryFlowAngle - ship.heatAngle));
        ship.heatAngle += hDiff * clamp(dt * 8, 0, 1);
    }

    // Desgaste térmico direccional, oclusión aerodinámica y enfriamiento por pieza
    updateShipReentryScorch(ship, dt);

    // Emisión de Partículas de Plasma de Reentrada y Chispas de Ablación según la Orientación de Entrada
    if (ship.reentryIntensity > 0.06 && shipSpeed > 90) {
        const reI = clamp(ship.reentryIntensity, 0, 1.2);
        const flowWorldAngle = ship.velAngle; // Hacia donde avanza el cohete
        const wakeWorldAngle = flowWorldAngle + Math.PI; // Hacia donde sale despedido el plasma (-V)
        const perpWorldAngle = flowWorldAngle + Math.PI / 2;
        const cosFlowWorld = Math.cos(flowWorldAngle);
        const sinFlowWorld = Math.sin(flowWorldAngle);
        const cosPerpWorld = Math.cos(perpWorldAngle);
        const sinPerpWorld = Math.sin(perpWorldAngle);

        const profile = (typeof getShipWindwardProfile === 'function')
            ? getShipWindwardProfile(ship, ship.reentryFlowAngle)
            : null;

        let stagnationX, stagnationY, effectiveSpan;
        if (profile && profile.count > 2) {
            stagnationX = ship.x + cosFlowWorld * profile.maxFrontX;
            stagnationY = ship.y + sinFlowWorld * profile.maxFrontX;
            effectiveSpan = Math.max(10, (profile.maxY - profile.minY) * 0.52);
        } else {
            const customExt = (ship.customRocket && ship.customRocket.bounds && ship.customRocket.com) ? ship.customRocket : null;
            const shipHalfLen = customExt ? Math.max(18, (customExt.bounds.height || 74) * 0.25) : 18.5 * (ship.scale || 1.0);
            const shipHalfWid = customExt ? Math.max(10, (customExt.bounds.width || 40) * 0.25) : 11.0 * (ship.scale || 1.0);
            const shipGeoOffsetX = customExt
                ? -(((customExt.bounds.minY + customExt.bounds.maxY) * 0.5) - customExt.com.y) * 0.5
                : 0;
            const sinFlow = Math.abs(Math.sin(ship.reentryFlowAngle));
            const cosFlow = Math.cos(ship.reentryFlowAngle);
            effectiveSpan = lerp(shipHalfWid * 0.92, shipHalfLen * 1.12, sinFlow);
            const forwardLead = lerp(shipHalfLen * Math.sign(cosFlow || 1), shipHalfWid * 0.85, sinFlow);
            const geoCenterX = ship.x + cosA * shipGeoOffsetX;
            const geoCenterY = ship.y + sinA * shipGeoOffsetX;
            stagnationX = geoCenterX + cosFlowWorld * Math.abs(forwardLead);
            stagnationY = geoCenterY + sinFlowWorld * Math.abs(forwardLead);
        }

        // Partículas de estela de plasma ionizado siguiendo el contorno de choque real del cohete
        const plasmaCount = Math.ceil(reI * 4.0);
        for (let i = 0; i < plasmaCount; i++) {
            let spawnX, spawnY, sideSign;
            if (profile && profile.count > 2) {
                // Muestreo sesgado hacia los bordes y hombros de la silueta para formar una estela hueca realista
                const u = Math.random();
                const idx = Math.min(profile.count - 1, Math.floor(u * profile.count));
                const py = profile.ys[idx];
                const px = profile.frontX[idx];
                sideSign = py >= 0 ? 1 : -1;
                const worldBaseX = ship.x + cosFlowWorld * px + cosPerpWorld * py;
                const worldBaseY = ship.y + sinFlowWorld * px + sinPerpWorld * py;
                spawnX = worldBaseX - cosFlowWorld * (Math.random() * 6);
                spawnY = worldBaseY - sinFlowWorld * (Math.random() * 6);
            } else {
                sideSign = Math.random() < 0.5 ? 1 : -1;
                const edgeFrac = 0.4 + Math.random() * 0.7;
                const lateralDist = sideSign * effectiveSpan * edgeFrac;
                spawnX = stagnationX + cosPerpWorld * lateralDist - cosFlowWorld * (Math.random() * 8);
                spawnY = stagnationY + sinPerpWorld * lateralDist - sinFlowWorld * (Math.random() * 8);
            }

            const deflectAngle = wakeWorldAngle + sideSign * (0.09 + Math.random() * 0.18);
            const plasmaSpd = shipSpeed * (0.34 + Math.random() * 0.28);
            const pLife = (0.18 + Math.random() * 0.24) * clamp(reI + 0.3, 0.5, 1.2);

            if (reentryParticles.length < 340) {
                reentryParticles.push({
                    x: spawnX,
                    y: spawnY,
                    vx: ship.vx * 0.25 + Math.cos(deflectAngle) * plasmaSpd,
                    vy: ship.vy * 0.25 + Math.sin(deflectAngle) * plasmaSpd,
                    size: (2.8 + Math.random() * 3.4) * clamp(reI + 0.2, 0.55, 1.25),
                    life: pLife,
                    maxLife: pLife,
                    intensity: reI
                });
            }
        }

        // Chispas de ablación térmica y pavesas incandescentes desprendiéndose del borde expuesto
        if (reI > 0.25 && Math.random() < Math.min(0.95, reI * 0.92)) {
            const sideSign = Math.random() < 0.5 ? 1 : -1;
            let spkX, spkY;
            if (profile && profile.count > 2) {
                const idx = Math.floor(Math.random() * profile.count);
                spkX = ship.x + cosFlowWorld * profile.frontX[idx] + cosPerpWorld * profile.ys[idx];
                spkY = ship.y + sinFlowWorld * profile.frontX[idx] + sinPerpWorld * profile.ys[idx];
            } else {
                spkX = stagnationX + cosPerpWorld * (sideSign * effectiveSpan * Math.random());
                spkY = stagnationY + sinPerpWorld * (sideSign * effectiveSpan * Math.random());
            }
            const isHotEmber = Math.random() < 0.42;
            createSparks(
                spkX, spkY, isHotEmber ? 1 : 2,
                wakeWorldAngle + sideSign * (0.18 + Math.random() * 0.22), 0.48,
                isHotEmber ? 95 : 135, isHotEmber ? 220 : 320,
                isHotEmber ? [255, 118, 38] : [255, 224, 145],
                isHotEmber ? 0.48 : 0.34
            );
        }

        // Vibración aerodinámica proporcional a la severidad de la reentrada
        camera.shake = Math.max(camera.shake, reI * 1.6);
    }

    // Audio de viento atmosférico y turbulencia
    if (nearestPlanet) {
        const ambWind = (typeof astronaut !== 'undefined' && astronaut.active && astronaut.localWind)
            ? astronaut.localWind.speed
            : (ship.localWind ? ship.localWind.speed : 0);
        audio.setAtmosphericFlight(atmoInfo.density, shipSpeed, ambWind);
    }

    // --- RETRO-FRENADO Y AMORTIGUACIÓN DE DESCENSO (TECLA S / FLECHA ABAJO) ---
    let isBrakingRcs = false;
    if (ship.braking && !ship.isGrounded && hasFuel && shipSpeed > 4) {
        isBrakingRcs = true;
        const refMass = (curModel && curModel.mass) ? curModel.mass : 2.2;
        const curMass = Math.max(0.4, ship.mass || refMass);
        const massBrakeFactor = clamp(Math.pow(refMass / curMass, 0.45), 0.55, 1.75);
        // En crucero interplanetario a alta velocidad, los retro-propulsores aplican mayor impulso para mantener la jugabilidad
        const highSpeedAssist = shipSpeed > 550 ? clamp(1.0 + (shipSpeed - 550) / 1400, 1.0, 2.8) : 1.0;
        const brakeAcc = 225 * massBrakeFactor * highSpeedAssist;
        const dv = Math.min(shipSpeed, brakeAcc * dt);
        ship.vx -= (ship.vx / shipSpeed) * dv;
        ship.vy -= (ship.vy / shipSpeed) * dv;
        if (!ship.infiniteFuel) {
            ship.fuel = Math.max(0, ship.fuel - dt * (0.65 * Math.min(1.8, highSpeedAssist)));
        }

        if (Math.random() < 0.75) {
            const noseX = ship.x + cosA * 14;
            const noseY = ship.y + sinA * 14;
            rcsParticles.push({
                x: noseX + (Math.random() - 0.5) * 4,
                y: noseY + (Math.random() - 0.5) * 4,
                vx: ship.vx + Math.cos(ship.velAngle) * 85,
                vy: ship.vy + Math.sin(ship.velAngle) * 85,
                size: 2.2 + Math.random() * 1.2,
                life: 0.18,
                maxLife: 0.18
            });
        }
    }

    // Amortiguación suave horizontal automática cuando SAS está activo a muy baja altura sin acelerar
    if (ship.sasEnabled && nearestPlanet && !ship.isGrounded && altFromSurface < 320 && !hasPilotTurnInput() && !isFiring) {
        const radX = Math.cos(localZenith);
        const radY = Math.sin(localZenith);
        const tangX = -radY;
        const tangY = radX;
        const vHorz = ship.vx * tangX + ship.vy * tangY;
        if (Math.abs(vHorz) > 2.0) {
            const dampH = Math.sign(vHorz) * Math.min(Math.abs(vHorz), 38 * ship.landingAssistFactor * dt);
            ship.vx -= tangX * dampH;
            ship.vy -= tangY * dampH;
        }
    }

    // 2.2 Auto-Hover asistido inteligente para el Dron Autónomo Scout-09
    if (ship.modelKey === 'drone' && nearestPlanet && !ship.isGrounded && altFromSurface < 140 && !ship.thrusting && !ship.braking) {
        const radX = Math.cos(localZenith);
        const radY = Math.sin(localZenith);
        const vVert = ship.vx * radX + ship.vy * radY;
        const targetV = 0;
        const dvVert = (targetV - vVert) * dt * 4.5;
        ship.vx += radX * dvVert;
        ship.vy += radY * dvVert;
    }

    // 2.3 Articulación Dinámica de Flaps Aerodinámicos de Reentrada para Starship
    if (ship.modelKey === 'starship') {
        const targetCanard = clamp(ship.aoa * 0.45 - (ship.turnVal || 0) * 0.35, -0.65, 0.65);
        const targetAft = clamp(-ship.aoa * 0.55 + (ship.turnVal || 0) * 0.35, -0.75, 0.75);
        ship.flapAngleCanard = lerp(ship.flapAngleCanard || 0, targetCanard, dt * 9);
        ship.flapAngleAft = lerp(ship.flapAngleAft || 0, targetAft, dt * 9);
    }

    // --- CONTROL DE ACTITUD, RCS, TORQUE AERODINÁMICO Y SAS ---
    let rcsTorque = 0;
    const groundFrictionFactor = ship.isGrounded ? 0.28 : 1.0;
    let hasPilotInput = false;

    const baseTurnRate = curModel ? (curModel.turnRate || 5.2) : 5.2;
    const customRcsList = (ship.customRocket && ship.customRocket.rcsList) ? ship.customRocket.rcsList : null;
    const hasCustomRcs = !!(customRcsList && customRcsList.length > 0 && hasFuel);
    let physTurnAccel = baseTurnRate;
    let maxAv = 4.5;
    if (ship.customRocket) {
        const cr = ship.customRocket;
        if (isFiring && cr.engines && cr.engines.length > 0) {
            for (const eng of cr.engines) {
                if (eng.enabled !== false && eng.gimbalEnabled !== false) {
                    activeGimbalThrust += (eng.thrust || 0) * manualPower;
                }
            }
        }
        const wheelTorque = 420;
        const rcsTorqueCap = hasCustomRcs ? (cr.rcsAuthority || 1.0) * 480 : 0;
        const tvcTorque = activeGimbalThrust > 0 ? activeGimbalThrust * 2.2 : 0;
        const atmoControlBonus = (atmoInfo.pressure > 0.05 && !hasCustomRcs && activeGimbalThrust <= 0) ? 140 : 0;
        const inertiaVal = Math.max(150, ship.inertia || cr.inertia || 400);
        physTurnAccel = clamp((wheelTorque + rcsTorqueCap + tvcTorque + atmoControlBonus) / Math.pow(inertiaVal, 0.58), 0.75, 5.2);
        maxAv = clamp(4.2 / Math.pow(Math.max(1, (ship.mass || 8) / 8), 0.22), 1.6, 4.5);
    }
    const modelTurnRate = physTurnAccel;
    const turnResponseScale = clamp(modelTurnRate / 4.2, 0.25, 1.3);

    if (orbitSteerAngle !== null && !hasPilotTurnInput()) {
        ship.sasHoldAngle = null;
        let diff = orbitSteerAngle - ship.angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (Math.abs(diff) > 0.04) rcsTorque = clamp(diff * 2.2, -1, 1);
        ship.av += (diff * 9.0 - ship.av * 3.8) * turnResponseScale * dt;
    } else if (ship.targetAngle !== null) {
        hasPilotInput = true;
        ship.sasHoldAngle = null;
        let diff = ship.targetAngle - ship.angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const desiredAv = clamp(diff * 12.0, -maxAv, maxAv);
        const maxTurnAccel = modelTurnRate * groundFrictionFactor;
        const appliedAccel = clamp((desiredAv - ship.av) * 16.0, -maxTurnAccel, maxTurnAccel);
        if (Math.abs(diff) > 0.02) {
            rcsTorque = clamp(appliedAccel / Math.max(0.01, modelTurnRate), -1, 1);
        }
        ship.av += appliedAccel * dt;
        ship.av = clamp(ship.av, -maxAv, maxAv);
    } else if (ship.turnVal !== 0) {
        hasPilotInput = true;
        ship.sasHoldAngle = null;
        rcsTorque = ship.turnVal;
        ship.av += ship.turnVal * modelTurnRate * groundFrictionFactor * dt;
        ship.av = clamp(ship.av, -maxAv, maxAv);
    }

    // SAS realista estilo SFS: mantiene la orientación actual del cohete en vuelo sin forzarlo a apuntar arriba.
    // En tierra (isGrounded) el SAS se libera para que la gravedad y los apoyos gobiernen el equilibrio real.
    if (ship.sasEnabled && !ship.isGrounded && !hasPilotInput && orbitSteerAngle === null) {
        if (ship.sasHoldAngle === null) ship.sasHoldAngle = ship.angle;
        const holdDiff = Math.atan2(
            Math.sin(ship.sasHoldAngle - ship.angle),
            Math.cos(ship.sasHoldAngle - ship.angle)
        );
        const sasAuthority = clamp(physTurnAccel / 3.2, 0.35, 1.35);
        ship.av += (holdDiff * 6.5 - ship.av * 4.2) * sasAuthority * dt;
    } else if (ship.isGrounded) {
        ship.sasHoldAngle = null;
    }

    // Partículas RCS de gas frío a presión en las toberas reales del cohete
    const allowRcsPuffs = !ship.customRocket || hasCustomRcs;
    if (ship.rcsStrafe && hasFuel && allowRcsPuffs) {
        const strafeAngle = ship.angle + ship.rcsStrafe * (Math.PI / 2);
        const strafeAccel = (hasCustomRcs ? (cr.rcsAuthority || 1.0) * 145 : 95) / Math.max(0.6, (ship.mass || 8) / 8);
        ship.vx += Math.cos(strafeAngle) * strafeAccel * dt;
        ship.vy += Math.sin(strafeAngle) * strafeAccel * dt;
        if (!ship.infiniteFuel) {
            ship.fuel = Math.max(0, ship.fuel - dt * 0.14);
        }
        if (Math.random() < 0.85) {
            const exhaustAngle = ship.angle - ship.rcsStrafe * (Math.PI / 2) + (Math.random() - 0.5) * 0.16;
            if (hasCustomRcs) {
                for (const rcs of customRcsList) {
                    const rcsX = ship.x + cosA * rcs.flightX - sinA * rcs.flightY;
                    const rcsY = ship.y + sinA * rcs.flightX + cosA * rcs.flightY;
                    rcsParticles.push({
                        x: rcsX,
                        y: rcsY,
                        vx: ship.vx * 0.5 + Math.cos(exhaustAngle) * 85,
                        vy: ship.vy * 0.5 + Math.sin(exhaustAngle) * 85,
                        size: (2.0 + Math.random() * 1.2) * Math.min(1.4, rcs.power || 1.0),
                        life: 0.18,
                        maxLife: 0.18
                    });
                }
            } else {
                const rcsX = ship.x + cosA * 4 - sinA * (-ship.rcsStrafe * 5.2);
                const rcsY = ship.y + sinA * 4 + cosA * (-ship.rcsStrafe * 5.2);
                rcsParticles.push({
                    x: rcsX,
                    y: rcsY,
                    vx: ship.vx * 0.5 + Math.cos(exhaustAngle) * 80,
                    vy: ship.vy * 0.5 + Math.sin(exhaustAngle) * 80,
                    size: 2.1 + Math.random() * 1.0,
                    life: 0.16,
                    maxLife: 0.16
                });
            }
        }
    }
    const isRcsActive = (Math.abs(rcsTorque) > 0.15 && !ship.isGrounded && allowRcsPuffs) || isBrakingRcs || !!(ship.rcsStrafe && hasFuel && allowRcsPuffs);
    if (Math.abs(rcsTorque) > 0.15 && !ship.isGrounded && allowRcsPuffs && Math.random() < 0.78) {
        if (hasCustomRcs) {
            if (!ship.infiniteFuel) {
                ship.fuel = Math.max(0, ship.fuel - dt * 0.08);
            }
            for (const rcs of customRcsList) {
                const isFront = rcs.flightX >= 0;
                const pushDir = isFront ? (rcsTorque > 0 ? -1 : 1) : (rcsTorque > 0 ? 1 : -1);
                // Solo disparan los bloques del lado correspondiente al chorro hacia afuera
                if ((pushDir < 0 && rcs.flightY <= 2) || (pushDir > 0 && rcs.flightY >= -2)) {
                    const rcsX = ship.x + cosA * rcs.flightX - sinA * rcs.flightY;
                    const rcsY = ship.y + sinA * rcs.flightX + cosA * rcs.flightY;
                    const puffAngle = ship.angle + pushDir * (Math.PI / 2) + (Math.random() - 0.5) * 0.18;
                    rcsParticles.push({
                        x: rcsX,
                        y: rcsY,
                        vx: ship.vx * 0.5 + Math.cos(puffAngle) * 85,
                        vy: ship.vy * 0.5 + Math.sin(puffAngle) * 85,
                        size: (2.0 + Math.random() * 1.2) * Math.min(1.4, rcs.power || 1.0),
                        life: 0.18,
                        maxLife: 0.18
                    });
                }
            }
        } else {
            const dirSign = rcsTorque > 0 ? -1 : 1;
            const rcsX = ship.x + cosA * 12 - sinA * (dirSign * 5.2);
            const rcsY = ship.y + sinA * 12 + cosA * (dirSign * 5.2);
            const puffAngle = ship.angle + dirSign * (Math.PI / 2) + (Math.random() - 0.5) * 0.22;
            rcsParticles.push({
                x: rcsX,
                y: rcsY,
                vx: ship.vx * 0.5 + Math.cos(puffAngle) * 80,
                vy: ship.vy * 0.5 + Math.sin(puffAngle) * 80,
                size: 2.1 + Math.random() * 1.4,
                life: 0.18,
                maxLife: 0.18
            });
        }
    }

    audio.setThrust(ship.thrustIntensity, isWarp, isRcsActive);

    // Torque aerodinámico realista (estabilidad por CoP vs CoM, asimetría lateral y amortiguación de aletas)
    const aeroTorqueModel = (ship.customRocket && ship.customRocket.aero) ? ship.customRocket.aero : null;
    if (aeroTorqueModel && !ship.isGrounded && atmoInfo.inAtmo && atmoInfo.density > 0.01 && shipSpeed > 18 && ship.orbitMode !== 'locked') {
        const qFactor = clamp((ship.dynamicPressure || 0) * 0.000018, 0, 1.85);
        const sinAoA_t = Math.sin(ship.aoa || 0);
        const cosAoA_t = Math.cos(ship.aoa || 0);
        // Si stabilityMargin > 0 (CoP detrás del CoM), la flecha aerodinámica alinea la proa al vector velocidad (aoa -> 0)
        const weathercockDir = cosAoA_t >= -0.2 ? -1 : 0.45;
        const weathercockTorque = aeroTorqueModel.stabilityMargin * sinAoA_t * qFactor * weathercockDir * 5.2;
        const asymTorque = aeroTorqueModel.asymFactor * qFactor * 1.45;
        ship.av += clamp(weathercockTorque + asymTorque, -3.5, 3.5) * dt;
    }

    // Amortiguación angular realista: mínima en vacío cuando SAS está apagado, suave en atmósfera (potenciada por aletas)
    const finDampBonus = aeroTorqueModel ? aeroTorqueModel.finDamping : 0;
    const atmoSpinDamp = atmoInfo.inAtmo ? lerp(0.992, clamp(0.90 - finDampBonus, 0.72, 0.90), clamp(atmoInfo.density, 0, 1)) : 0.996;
    const dampingBase = ship.isGrounded ? 0.86 : (hasPilotInput ? 0.96 : (ship.sasEnabled ? 0.78 : atmoSpinDamp));
    ship.av *= Math.pow(dampingBase, dt * 10);

    // Despertar estado de reposo estable ante cualquier entrada de control, ignición, despliegue o perturbación externa
    const lwWake = ship.localWind;
    const extremeWindWake = !!(lwWake && lwWake.hasWind && atmoInfo.inAtmo && (lwWake.speed > 175 || (lwWake.inVortex && lwWake.vortexIntensity > 0.45)));
    if (isFiring || hasPilotInput || ship.rcsStrafe || ship.braking || ship.warping || ship.orbitMode !== 'off' || !nearestPlanet || (nearestPlanet.archetype && nearestPlanet.archetype.isLiquid) || deployAnimChanged || extremeWindWake) {
        ship.isResting = false;
    }
    if (ship.isResting) {
        ship.vx = 0;
        ship.vy = 0;
        ship.av = 0;
    } else {
        ship.angle += ship.av * dt;
    }

    // Inercia newtoniana pura: sin freno artificial en el espacio al apagar los motores.
    // La velocidad solo se regula de forma natural mediante el rendimiento relativista del empuje, la gravedad y la atmósfera.

    // Control polar directo durante inserción orbital (inmune a caídas por gravedad)
    if (ship.orbitMode === 'inserting' && nearestPlanet && orbInfo) {
        const bounds = orbInfo.bounds;
        const targetPull = getPlanetGravityPull(nearestPlanet, ship.orbitTargetRadius);
        const targetVCirc = Math.sqrt(Math.max(0, ship.orbitTargetRadius * targetPull));
        const rErr = ship.orbitTargetRadius - orbInfo.r;
        const desiredVRad = clamp(rErr * 0.72, -300, 300);
        const desiredVTang = ship.orbitDir * targetVCirc;

        const curVRad = ship.vx * orbInfo.radX + ship.vy * orbInfo.radY;
        const curVTang = ship.vx * orbInfo.tangX + ship.vy * orbInfo.tangY;
        const errRad = desiredVRad - curVRad;
        const errTang = desiredVTang - curVTang;
        const errMag = Math.hypot(errRad, errTang);
        const maxAcc = (curModel ? curModel.thrust : 475) * 1.18;
        const step = Math.min(errMag, maxAcc * dt);
        if (errMag > 0.01) {
            const newVRad = curVRad + (errRad / errMag) * step;
            const newVTang = curVTang + (errTang / errMag) * step;
            ship.vx = orbInfo.radX * newVRad + orbInfo.tangX * newVTang;
            ship.vy = orbInfo.radY * newVRad + orbInfo.tangY * newVTang;
        }
    }

    // Órbita circular exacta y perpetua sin deriva cuando está en modo 'locked'
    if (ship.orbitMode === 'locked' && nearestPlanet && orbInfo) {
        const targetPull = getPlanetGravityPull(nearestPlanet, ship.orbitTargetRadius);
        const targetVCirc = Math.sqrt(Math.max(0, ship.orbitTargetRadius * targetPull));
        const omega = (ship.orbitDir * targetVCirc) / Math.max(100, ship.orbitTargetRadius);
        ship.orbitAngle += omega * dt;
        ship.x = nearestPlanet.x + Math.cos(ship.orbitAngle) * ship.orbitTargetRadius;
        ship.y = nearestPlanet.y + Math.sin(ship.orbitAngle) * ship.orbitTargetRadius;
        ship.vx = -Math.sin(ship.orbitAngle) * ship.orbitDir * targetVCirc;
        ship.vy = Math.cos(ship.orbitAngle) * ship.orbitDir * targetVCirc;
    } else if (ship.orbitMode === 'off' && !ship.isResting) {
        // Integración simpléctica Velocity-Verlet en 4 sub-pasos (siempre activa salvo en reposo estable)
        const soiPlanet = (nearestPlanet && distFromPlanetCenter < nearestPlanet.gravityRadius) ? nearestPlanet : null;
        const subSteps = 4;
        const subDt = dt / subSteps;
        const getGravAccel = (px, py) => {
            if (soiPlanet) {
                const dx = soiPlanet.x - px;
                const dy = soiPlanet.y - py;
                const d = Math.hypot(dx, dy);
                const pull = getPlanetGravityPull(soiPlanet, d, px, py);
                return pull !== 0 ? [(dx / d) * pull, (dy / d) * pull] : [0, 0];
            }
            let ax = 0, ay = 0;
            for (const p of nearby) {
                const dx = p.x - px;
                const dy = p.y - py;
                const d = Math.hypot(dx, dy);
                const pull = getPlanetGravityPull(p, d, px, py);
                if (pull !== 0) {
                    ax += (dx / d) * pull;
                    ay += (dy / d) * pull;
                }
            }
            return [ax, ay];
        };
        for (let s = 0; s < subSteps; s++) {
            const [ax0, ay0] = getGravAccel(ship.x, ship.y);
            ship.x += ship.vx * subDt + 0.5 * ax0 * subDt * subDt;
            ship.y += ship.vy * subDt + 0.5 * ay0 * subDt * subDt;
            const [ax1, ay1] = getGravAccel(ship.x, ship.y);
            ship.vx += 0.5 * (ax0 + ax1) * subDt;
            ship.vy += 0.5 * (ay0 + ay1) * subDt;
        }
    } else {
        ship.x += ship.vx * dt;
        ship.y += ship.vy * dt;
    }

    // --- FENÓMENOS ACTIVOS PLANETARIOS (GÉISERES, ANOMALÍAS GRAVITATORIAS, VIENTOS Y CAVERNAS) ---
    if (nearestPlanet && ship.orbitMode === 'off') {
        const curT = performance.now() / 1000;
        const radX = Math.cos(localZenith);
        const radY = Math.sin(localZenith);
        const tangX = -radY;
        const tangY = radX;

        if (nearestPlanet.phenomena && nearestPlanet.phenomena.length > 0) {
            for (const ph of nearestPlanet.phenomena) {
                if (ph.type === 'geyser' && !ship.insideCavernPlanet) {
                    const intensity = (typeof getGeyserIntensity === 'function') ? getGeyserIntensity(ph, curT) : 0;
                    if (intensity > 0.08) {
                        const dAng = Math.abs(Math.atan2(Math.sin(localZenith - ph.angle), Math.cos(localZenith - ph.angle)));
                        if (dAng <= ph.span * 1.45 && altFromSurface <= ph.reachHeight) {
                            const hFrac = clamp(1 - altFromSurface / ph.reachHeight, 0.08, 1);
                            const jetAccel = ph.force * 4.5 * intensity * hFrac;
                            ship.vx += radX * jetAccel * dt;
                            ship.vy += radY * jetAccel * dt;
                            if (ph.geyserType === 'spore') {
                                ship.fuel = Math.min(ship.maxFuel || 100, ship.fuel + dt * 4.5 * intensity);
                            } else if (ph.geyserType === 'plasma') {
                                ship.hullTemp = Math.min(1200, (ship.hullTemp || 0) + dt * 85 * intensity);
                            }
                        }
                    }
                } else if (ph.type === 'gravity_anomaly') {
                    const axPos = nearestPlanet.x + Math.cos(ph.angle) * ph.radiusPos;
                    const ayPos = nearestPlanet.y + Math.sin(ph.angle) * ph.radiusPos;
                    const adx = ship.x - axPos;
                    const ady = ship.y - ayPos;
                    const aDist = Math.hypot(adx, ady);
                    if (aDist < ph.effectRadius && aDist > 2) {
                        const aFrac = 1 - aDist / ph.effectRadius;
                        if (ph.anomalyMode === 'antigrav') {
                            const lift = 68 * ph.strength * aFrac;
                            ship.vx += (radX * lift - ship.vx * 0.45 * aFrac) * dt;
                            ship.vy += (radY * lift - ship.vy * 0.45 * aFrac) * dt;
                        } else {
                            // Vórtice espiral suave
                            const rx = -adx / aDist;
                            const ry = -ady / aDist;
                            const tx = -ry;
                            const ty = rx;
                            const swirl = 58 * ph.strength * aFrac;
                            ship.vx += (tx * swirl + rx * swirl * 0.25) * dt;
                            ship.vy += (ty * swirl + ry * swirl * 0.25) * dt;
                        }
                    }
                }
            }
        }

        // Microclima interno de caverna hueca y acoplamiento aerodinámico con el Sistema Eólico Planetario
        if (ship.insideCavernPlanet === nearestPlanet) {
            const hMode = nearestPlanet.hollowPhysicsMode;
            if (hMode === 'thermal_forge') {
                const updraft = (Math.sin(localZenith * 6 + curT * 1.4) * 0.5 + 0.5) * 32;
                ship.vx += radX * updraft * dt;
                ship.vy += radY * updraft * dt;
            } else if (hMode === 'crystal_resonance') {
                ship.fuel = Math.min(ship.maxFuel || 100, ship.fuel + dt * 2.5);
            }
        } else if (ship.localWind && ship.localWind.hasWind && atmoInfo.inAtmo && atmoInfo.density > 0.01) {
            const lw = ship.localWind;
            const wSpd = lw.speed || 0;
            const dragF = atmoInfo.dragFactor !== undefined ? atmoInfo.dragFactor : 1.0;

            if (wSpd > 1 && dragF > 0.01) {
                const aeroW = (ship.customRocket && ship.customRocket.aero) ? ship.customRocket.aero : null;
                const windAng = Math.atan2(lw.vy, lw.vx);
                const relWindAng = Math.atan2(Math.sin(ship.angle - windAng), Math.cos(ship.angle - windAng));
                const sinW = Math.sin(relWindAng);
                const frontSp = aeroW ? (aeroW.frontSpan || 1.0) : (curModel ? (curModel.scale || 1.0) : 1.0);
                const sideSp = aeroW ? (aeroW.sideSpan || 1.2) : (curModel ? (curModel.scale || 1.0) * 1.35 : 1.35);
                const solarPen = aeroW ? (aeroW.deployedSolarDragFactor || 0) : 0;
                const exposedSpan = lerp(frontSp, sideSp * (1 + solarPen * 0.45), sinW * sinW);
                const ballistic = clamp(exposedSpan / Math.pow(Math.max(0.6, ship.mass || 1.0), 0.56), 0.35, 1.85);

                if (ship.isGrounded) {
                    // En plataforma/suelo: vientos normales o moderados no mueven ni vuelcan el cohete.
                    // Solo un vendaval extremo o el núcleo de un tornado/huracán logra sacudirlo.
                    if (wSpd > 175 || (lw.inVortex && lw.vortexIntensity > 0.45)) {
                        const excess = Math.max(0, wSpd - 165) + (lw.inVortex ? lw.vortexIntensity * 65 : 0);
                        const padPush = Math.min(95, 0.5 * atmoInfo.density * excess * excess * ballistic * 0.00055);
                        ship.vx += (lw.vx / wSpd) * padPush * dt;
                        ship.vy += (lw.vy / wSpd) * padPush * dt;
                        if (lw.inVortex && lw.vortexIntensity > 0.50) {
                            camera.shake = Math.max(camera.shake, Math.min(1.6, lw.vortexIntensity * 1.1));
                        }
                    }
                } else {
                    // En vuelo: umbral realista para que brisas leves no molesten en absoluto al cohete,
                    // mientras ráfagas aisladas fuertes, vendavales, huracanes y tornados sí lo afecten.
                    const breezeGate = smoothstep(55, 115, wSpd);
                    const windEngage = Math.max(breezeGate, lw.inVortex ? clamp(lw.vortexIntensity * 1.15, 0, 1) : 0);
                    if (windEngage > 0.005) {
                        const pushAccel = Math.min(
                            265,
                            0.5 * atmoInfo.density * (atmoInfo.dragMult || 1.0) * wSpd * wSpd * ballistic * 0.00135 * windEngage * dragF
                        );
                        ship.vx += (lw.vx / wSpd) * pushAccel * dt;
                        ship.vy += (lw.vy / wSpd) * pushAccel * dt;

                        // Par aerodinámico por viento cruzado / ráfaga fuerte
                        if (wSpd > 105 || (lw.inVortex && lw.vortexIntensity > 0.28)) {
                            const torqueScale = (aeroW ? (0.35 + Math.abs(aeroW.stabilityMargin || 0) * 0.45) : 0.45) * ballistic;
                            ship.av += clamp(-sinW * (pushAccel * 0.0105) * torqueScale, -1.6, 1.6) * dt;
                        }

                        if (lw.vortexIntensity > 0.32 || lw.turbulence > 0.45) {
                            camera.shake = Math.max(camera.shake, Math.min(2.2, Math.max(lw.vortexIntensity || 0, lw.turbulence || 0) * 1.35));
                        }
                    }
                }
            }
        }

        // Campos extremos de singularidad (arrastre de marco) y magnetar (pulsos polares)
        if (!ship.insideCavernPlanet) {
            if ((nearestPlanet.isSingularity || nearestPlanet.archetype?.isSingularity) && altFromSurface < 900) {
                const prox = clamp(1 - altFromSurface / 900, 0, 1);
                const frameDrag = 46 * prox * prox;
                ship.vx += tangX * frameDrag * dt;
                ship.vy += tangY * frameDrag * dt;
            }
            if ((nearestPlanet.isMagnetar || nearestPlanet.archetype?.isMagnetar) && altFromSurface < 550) {
                const poleAlignment = Math.abs(Math.cos(localZenith - (nearestPlanet.initialRotationPhase || 0)));
                if (poleAlignment > 0.85) {
                    const pulse = Math.max(0, Math.sin(curT * 3.2)) * ((poleAlignment - 0.85) / 0.15) * clamp(1 - altFromSurface / 550, 0.15, 1);
                    const repulse = 120 * pulse;
                    ship.vx += (radX * repulse + tangX * 38 * pulse) * dt;
                    ship.vy += (radY * repulse + tangY * 38 * pulse) * dt;
                }
            }
        }
    }

    // --- COLISIÓN DE CUERPO RÍGIDO Y SUSPENSIÓN OLEONEUMÁTICA ---
    const wasGrounded = ship.isGrounded;
    ship.isGrounded = false;
    ship.contactsCount = 0;

    let targetLeftComp = 0;
    let targetRightComp = 0;

    if (nearestPlanet) {
        if (ship.isResting && (Math.hypot(ship.vx, ship.vy) > 0.1 || Math.abs(ship.av) > 0.01)) {
            ship.isResting = false;
        }
        let maxPenetration = 0;
        let avgNormalX = 0;
        let avgNormalY = 0;
        let sumPenNx = 0;
        let sumPenNy = 0;
        let sumPenW = 0;
        const collidingContacts = [];
        let touchedFloatingIsland = false;
        let anyLiquidContact = false;
        const contactSkin = ship.isResting ? 0.75 : (wasGrounded ? 0.15 : 0);

        const activeContactPoints = (ship.customRocket && Array.isArray(ship.customRocket.contactPoints) && ship.customRocket.contactPoints.length > 0)
            ? ship.customRocket.contactPoints
            : ((ship.contactPoints && ship.contactPoints.length > 0)
                ? ship.contactPoints
                : ((curModel && curModel.contactPoints) ? curModel.contactPoints : CONTACT_POINTS));
        const inCavern = !!(nearestPlanet.isHollow && typeof isShipInsideCavern === 'function' && isShipInsideCavern(nearestPlanet, ship.x, ship.y));
        const curCosA = Math.cos(ship.angle);
        const curSinA = Math.sin(ship.angle);
        for (const pt of activeContactPoints) {
            const worldX = ship.x + curCosA * pt.x - curSinA * pt.y;
            const worldY = ship.y + curSinA * pt.x + curCosA * pt.y;

            const pToPtX = worldX - nearestPlanet.x;
            const pToPtY = worldY - nearestPlanet.y;
            const distToPt = Math.hypot(pToPtX, pToPtY) || 1;
            const angleAtPt = Math.atan2(pToPtY, pToPtX);
            const surfaceR = getSurfaceRadius(nearestPlanet, angleAtPt);

            // Comprobar si este punto de contacto reposa sobre la cubierta plana de una plataforma de base
            let baseUnderPt = null;
            if (nearestPlanet.bases && nearestPlanet.bases.length > 0) {
                for (let bi = 0; bi < nearestPlanet.bases.length; bi++) {
                    const b = nearestPlanet.bases[bi];
                    const dAng = Math.abs(Math.atan2(Math.sin(angleAtPt - b.angle), Math.cos(angleAtPt - b.angle)));
                    if (dAng <= b.angularHalfSpan * 0.85) {
                        const cosD = Math.cos(dAng);
                        const deckR = cosD > 0.001 ? (b.deckR / cosD) : b.deckR;
                        const natR = (typeof getNaturalSurfaceRadius === 'function') ? getNaturalSurfaceRadius(nearestPlanet, angleAtPt) : surfaceR;
                        if (deckR >= natR - 0.5) {
                            baseUnderPt = b;
                        }
                        break;
                    }
                }
            }

            let contactCollision = false;
            let effectiveR = surfaceR;
            let normalDirSign = 1;
            let ptOnIsland = false;
            let customPenetration = null;
            let customNx = null;
            let customNy = null;

            // 1. Islas flotantes / balsas oceánicas / plataformas de caverna
            const islHit = (typeof getFloatingIslandAt === 'function') ? getFloatingIslandAt(nearestPlanet, angleAtPt, distToPt, true) : null;
            if (islHit && distToPt <= islHit.topR + contactSkin && distToPt >= islHit.bottomR - contactSkin) {
                const midI = (islHit.topR + islHit.bottomR) * 0.5;
                contactCollision = true;
                ptOnIsland = true;
                touchedFloatingIsland = true;
                if (distToPt >= midI) {
                    effectiveR = islHit.topR;
                    normalDirSign = 1;
                } else {
                    effectiveR = islHit.bottomR;
                    normalDirSign = -1;
                }
            } else if (nearestPlanet.isHollow && typeof getHollowBoundsAt === 'function') {
                // 2. Planetas huecos: geometría continua de boca de cueva, suelo, techo y núcleo interior
                const bounds = getHollowBoundsAt(nearestPlanet, angleAtPt);
                if (inCavern) {
                    if (distToPt < bounds.coreR + contactSkin) {
                        contactCollision = true;
                        effectiveR = bounds.coreR;
                        normalDirSign = 1;
                    } else if (distToPt < bounds.floorR + contactSkin) {
                        contactCollision = true;
                        effectiveR = bounds.floorR;
                        normalDirSign = 1;
                    } else if (!bounds.isThroatOpen && distToPt > bounds.effectiveCeilingR - contactSkin) {
                        contactCollision = true;
                        effectiveR = bounds.effectiveCeilingR;
                        normalDirSign = -1;
                    }
                } else if (bounds.isThroatOpen) {
                    if (distToPt < bounds.floorR + contactSkin) {
                        contactCollision = true;
                        effectiveR = bounds.floorR;
                        normalDirSign = 1;
                    }
                } else {
                    if (distToPt < bounds.extR + contactSkin) {
                        contactCollision = true;
                        effectiveR = bounds.extR;
                        normalDirSign = 1;
                    }
                }
            } else if (baseUnderPt) {
                // 3a. Plataforma nivelada: distancia perpendicular exacta al plano de la cubierta
                const bnx = Math.cos(baseUnderPt.angle);
                const bny = Math.sin(baseUnderPt.angle);
                const projOnBase = pToPtX * bnx + pToPtY * bny;
                const deckPen = baseUnderPt.deckR - projOnBase;
                if (deckPen > -contactSkin) {
                    contactCollision = true;
                    effectiveR = surfaceR;
                    normalDirSign = 1;
                    customPenetration = Math.max(0, deckPen);
                    customNx = bnx;
                    customNy = bny;
                }
            } else {
                // 3b. Superficie exterior estándar
                if (distToPt < surfaceR + contactSkin) {
                    contactCollision = true;
                    effectiveR = surfaceR;
                    normalDirSign = 1;
                }
            }

            if (contactCollision) {
                const rawPen = (customPenetration !== null)
                    ? customPenetration
                    : (normalDirSign > 0 ? Math.max(0, effectiveR - distToPt) : Math.max(0, distToPt - effectiveR));
                let nx = (customNx !== null) ? customNx : ((pToPtX / distToPt) * normalDirSign);
                let ny = (customNy !== null) ? customNy : ((pToPtY / distToPt) * normalDirSign);

                if (customNx === null && normalDirSign > 0 && !ptOnIsland && !inCavern && !nearestPlanet.archetype.isLiquid) {
                    // Normal topográfica según la pendiente local de cráteres, dunas y laderas de montaña
                    const eps = clamp(10 / Math.max(300, nearestPlanet.radius), 0.00015, 0.015);
                    const dr = getSurfaceRadius(nearestPlanet, angleAtPt + eps) - getSurfaceRadius(nearestPlanet, angleAtPt - eps);
                    const slope = clamp(dr / (2 * eps * Math.max(300, effectiveR)), -0.82, 0.82);
                    if (Math.abs(slope) > 0.02) {
                        const radX = pToPtX / distToPt;
                        const radY = pToPtY / distToPt;
                        const tanX = -radY;
                        const tanY = radX;
                        const snx = radX - tanX * slope;
                        const sny = radY - tanY * slope;
                        const sLen = Math.hypot(snx, sny) || 1;
                        nx = snx / sLen;
                        ny = sny / sLen;
                    }
                }

                const tx = -ny;
                const ty = nx;

                ship.contactsCount++;
                ship.isGrounded = true;

                if (rawPen > 0) {
                    const w = rawPen + 0.01;
                    sumPenNx += nx * w;
                    sumPenNy += ny * w;
                    sumPenW += w;
                    if (rawPen > maxPenetration) {
                        maxPenetration = rawPen;
                        avgNormalX = nx;
                        avgNormalY = ny;
                    }
                }

                const lakeAtPt = inCavern
                    ? ((typeof getCavernLakeAtAngle === 'function') ? getCavernLakeAtAngle(nearestPlanet, angleAtPt) : null)
                    : getPlanetLakeAtAngle(nearestPlanet, angleAtPt);
                const isPointInLake = !ptOnIsland && !!lakeAtPt && (distToPt <= lakeAtPt.waterLevel + 3);
                const isLiquid = (!ptOnIsland && nearestPlanet.archetype.isLiquid && !inCavern) || isPointInLake;
                if (isLiquid) anyLiquidContact = true;

                collidingContacts.push({
                    pt, worldX, worldY, angleAtPt, nx, ny, tx, ty, isLiquid, pen: rawPen
                });

                // Efectos de inmersión en fluidos peligrosos o corrosivos
                if (!ptOnIsland && !touchedFloatingIsland) {
                    if (nearestPlanet.archetype.isLiquid && !inCavern) {
                        takeDamage(dt * 22, 'Fluido corrosivo detectado — mantén ignición de sustentación');
                    } else if (isPointInLake && lakeAtPt) {
                        if (lakeAtPt.liquidType === 'magma') {
                            takeDamage(dt * 26, 'Inmersión en caldera de magma piroclástico — temperaturas críticas');
                        } else if (lakeAtPt.liquidType === 'acid') {
                            takeDamage(dt * 18, 'Inmersión en cuenca ácida corrosiva — daño estructural');
                        }
                    }
                }
            }
        }

        if (collidingContacts.length === 0) {
            ship.isResting = false;
        }

        if (maxPenetration > 0) {
            const penSlop = (ship.isResting || (wasGrounded && Math.hypot(ship.vx, ship.vy) < 15 && Math.abs(ship.av) < 0.25)) ? 0.03 : 0;
            const corr = Math.max(0, maxPenetration - penSlop);
            if (corr > 0) {
                const nLen = sumPenW > 0 ? Math.hypot(sumPenNx, sumPenNy) : 0;
                const pushNx = nLen > 0.001 ? (sumPenNx / nLen) : avgNormalX;
                const pushNy = nLen > 0.001 ? (sumPenNy / nLen) : avgNormalY;
                ship.x += pushNx * corr;
                ship.y += pushNy * corr;
            }
        }

        // Resolución de impulso de cuerpo rígido mediante Gauss-Seidel secuencial (cero vibración ni rebote residual)
        if (collidingContacts.length > 0 && !ship.isResting) {
            const contactCount = collidingContacts.length;
            const shipMass = Math.max(0.5, ship.mass || 1);
            const shipInertia = Math.max(10, ship.inertia || 100);

            // 1. Efectos visuales y de daño por impacto evaluados una sola vez con la velocidad previa
            for (const c of collidingContacts) {
                const { pt, worldX, worldY, angleAtPt, nx, ny, isLiquid } = c;
                const rx = worldX - ship.x;
                const ry = worldY - ship.y;
                const ptVx = ship.vx - ship.av * ry;
                const ptVy = ship.vy + ship.av * rx;
                const vn = ptVx * nx + ptVy * ny;

                if (vn < 0) {
                    const compAmt = clamp(-vn / 120, 0.25, 1.0);
                    if (pt.id === 'left_pad') targetLeftComp = Math.max(targetLeftComp, compAmt);
                    if (pt.id === 'right_pad') targetRightComp = Math.max(targetRightComp, compAmt);

                    if (-vn > 25 && !wasGrounded) {
                        const arch = nearestPlanet.archetype;
                        if (isLiquid) {
                            createLiquidRipple(nearestPlanet, angleAtPt, 16, arch.accentColor);
                            if (typeof audio !== 'undefined' && audio.playImpact) {
                                audio.playImpact(Math.min(0.65, -vn / 400));
                            }
                        } else {
                            createSmoke(
                                worldX, worldY, 3, 4.5, arch.surfaceDustColor,
                                -nx * 12, -ny * 12, 2.2, 24,
                                { cloudType: 'launch', expansionMult: 2.8, alpha: 0.45 }
                            );
                            createSparks(worldX, worldY, 4, angleAtPt + Math.PI, 0.7, 40, 130, arch.impactSparksColor, 0.35);
                        }
                    }

                    // Sistema de rotura por dureza de pieza (estilo SFS sin indicadores)
                    if (!isLiquid && ship.customRocket && pt.partInstanceId && ship.invulnTimer <= 0 && typeof damageCustomRocketPartAt === 'function') {
                        const hitPart = ship.customRocket.customParts.find(p => p.instanceId === pt.partInstanceId);
                        const hitDef = hitPart && typeof ROCKET_PARTS_CATALOG !== 'undefined' ? ROCKET_PARTS_CATALOG[hitPart.partDefId] : null;
                        const tol = (typeof getPartImpactTolerance === 'function') ? getPartImpactTolerance(hitDef) : 165;
                        if (-vn > tol) {
                            const partDmg = (-vn - tol) * (hitDef && hitDef.isSolarPanel ? 2.4 : 1.15);
                            damageCustomRocketPartAt(ship, pt.partInstanceId, partDmg, worldX, worldY, -vn, nx, ny, nearestPlanet);
                        }
                    }

                    const dmgSpeedThreshold = isLiquid ? 260 : 215;
                    if (-vn > dmgSpeedThreshold && ship.invulnTimer <= 0 && !ship.customRocket) {
                        const arch = nearestPlanet.archetype;
                        takeDamage((-vn - dmgSpeedThreshold) * (isLiquid ? 0.08 : 0.15), 'Impacto hidrodinámico violento — modera la velocidad de descenso');
                        audio.playImpact(-vn / 300);
                        if (isLiquid) {
                            createLiquidRipple(nearestPlanet, angleAtPt, 28, arch.accentColor);
                        } else {
                            createShockwave(worldX, worldY, 85, 300, 'rgba(255, 255, 255, 0.85)');
                            createDebris(worldX, worldY, 10, arch.surfaceDustColor, 60, 240, nearestPlanet);
                            createSparks(worldX, worldY, 14, angleAtPt + Math.PI, 1.2, 90, 280, [255, 220, 130], 0.6);
                        }
                    }
                }
            }

            // 2. Iteraciones secuenciales de impulso normal + fricción tangencial
            const accumJn = new Array(contactCount).fill(0);
            const solverIters = 4;
            for (let iter = 0; iter < solverIters; iter++) {
                for (let ci = 0; ci < contactCount; ci++) {
                    const c = collidingContacts[ci];
                    const { pt, worldX, worldY, nx, ny, tx, ty, isLiquid } = c;
                    const rx = worldX - ship.x;
                    const ry = worldY - ship.y;
                    const ptVx = ship.vx - ship.av * ry;
                    const ptVy = ship.vy + ship.av * rx;

                    const vn = ptVx * nx + ptVy * ny;
                    const baseRestitution = isLiquid ? 0.03 : (pt.isPad ? 0.04 : 0.10);
                    const restitution = (iter === 0 && !wasGrounded && -vn >= 28) ? baseRestitution : 0;

                    const torque = (rx * ny - ry * nx);
                    const effDenomN = 1 + (shipMass * torque * torque) / shipInertia;
                    let dJn = (-(1 + restitution) * vn) / effDenomN;
                    const newAccumJn = Math.max(0, accumJn[ci] + dJn);
                    dJn = newAccumJn - accumJn[ci];
                    accumJn[ci] = newAccumJn;

                    if (dJn !== 0) {
                        ship.vx += dJn * nx;
                        ship.vy += dJn * ny;
                        ship.av += clamp((dJn * shipMass * torque * 0.78) / shipInertia, -3.5, 3.5);
                    }

                    if (vn < 2.0) {
                        const vt = (ship.vx - ship.av * ry) * tx + (ship.vy + ship.av * rx) * ty;
                        const frictionCoeff = isLiquid ? 0.12 : 0.78;
                        const torqueT = (rx * ty - ry * tx);
                        const effDenomT = 1 + (shipMass * torqueT * torqueT) / shipInertia;
                        const dJt = (-vt * frictionCoeff) / effDenomT;
                        ship.vx += dJt * tx;
                        ship.vy += dJt * ty;
                        ship.av += clamp((dJt * shipMass * torqueT * 0.45) / shipInertia, -3.5, 3.5);
                    }
                }
            }

            if (!isFiring && !hasPilotInput) {
                if (contactCount >= 2) {
                    ship.av *= 0.76;
                    if (Math.hypot(ship.vx, ship.vy) < 10.0 && Math.abs(ship.av) < 0.22) {
                        ship.vx *= 0.62;
                        ship.vy *= 0.62;
                        ship.av *= 0.55;
                    }
                } else if (Math.hypot(ship.vx, ship.vy) < 8.0 && Math.abs(ship.av) < 0.18) {
                    ship.vx *= 0.78;
                    ship.vy *= 0.78;
                    ship.av *= 0.78;
                }
            }
        }

        // Asentamiento firme en tierra y transición a reposo estable
        if (ship.isGrounded && !nearestPlanet.archetype.isLiquid) {
            let baseUnderShip = null;
            if (nearestPlanet.bases && nearestPlanet.bases.length > 0) {
                for (let bi = 0; bi < nearestPlanet.bases.length; bi++) {
                    const b = nearestPlanet.bases[bi];
                    const dAng = Math.abs(Math.atan2(Math.sin(localZenith - b.angle), Math.cos(localZenith - b.angle)));
                    if (dAng <= b.angularHalfSpan * 0.88) {
                        baseUnderShip = b;
                        break;
                    }
                }
            }

            if (baseUnderShip) {
                if (collidingContacts.length >= 2 && !hasPilotInput && !isFiring) {
                    ship.av = lerp(ship.av, 0, Math.min(1, dt * 10.0));
                }

                // Servicio de reparación estructural según nivel de la base (el combustible requiere extractores y reserva EVA)
                const repairRates = [12, 22, 45];
                const rp = repairRates[baseUnderShip.level - 1] || 10;
                ship.hull = Math.min(ship.maxHull || 100, ship.hull + rp * dt);
            }
            if (nearestPlanet.archetype.id === 'biolume') {
                ship.hull = Math.min(100, ship.hull + dt * 6.5);
            }

            // Activar reposo estable (cero vibración) cuando el cohete está apoyado y detenido
            if (!anyLiquidContact && !isFiring && !hasPilotInput && !ship.rcsStrafe && !ship.braking && ship.orbitMode === 'off' && !deployAnimChanged && !extremeWindWake) {
                const spdNow = Math.hypot(ship.vx, ship.vy);
                const avNow = Math.abs(ship.av);
                const onStableBase = !!(baseUnderShip && Math.abs(Math.atan2(Math.sin(ship.angle - baseUnderShip.angle), Math.cos(ship.angle - baseUnderShip.angle))) < 0.12);
                if ((collidingContacts.length >= 2 || onStableBase) && spdNow < 4.5 && avNow < 0.09) {
                    ship.vx = 0;
                    ship.vy = 0;
                    ship.av = 0;
                    ship.isResting = true;
                }
            }
        }

        // Detección de Despegue Explosivo (Liftoff Blast Ring)
        if (wasGrounded && !ship.isGrounded && ship.thrustIntensity > 0.25) {
            const arch = nearestPlanet.archetype;
            const launchSmokeCol = arch.launchSmokeColor || arch.surfaceDustColor || [225, 232, 240];
            const pAngle = localZenith;
            const nx = Math.cos(pAngle);
            const ny = Math.sin(pAngle);
            const tx = -ny;
            const ty = nx;
            const sr = getSurfaceRadius(nearestPlanet, pAngle);
            const padX = nearestPlanet.x + nx * sr;
            const padY = nearestPlanet.y + ny * sr;

            for (let b = 0; b < 8; b++) {
                const side = b % 2 === 0 ? 1 : -1;
                const spd = (95 + Math.random() * 145) * (0.8 + 0.4 * (b / 8));
                const bvx = tx * (side * spd) + nx * (18 + Math.random() * 28);
                const bvy = ty * (side * spd) + ny * (18 + Math.random() * 28);
                createSmoke(
                    padX + tx * (side * Math.random() * 18),
                    padY + ty * (side * Math.random() * 18),
                    1,
                    9 + Math.random() * 5,
                    launchSmokeCol,
                    bvx, bvy,
                    (4.2 + Math.random() * 2.5) * persistenceMult,
                    26,
                    { cloudType: 'launch', expansionMult: 3.6, alpha: 0.60, heatGlow: 0.95, planetKey: nearestPlanet.key }
                );
            }
            createShockwave(padX, padY, 70, 240, 'rgba(255, 255, 255, 0.7)');
        }

        // Detección de Aterrizaje / Contacto de Patas (Touchdown Dust Cushion)
        if (!wasGrounded && ship.isGrounded) {
            const arch = nearestPlanet.archetype;
            const dustCol = arch.surfaceDustColor || [220, 230, 240];
            const cA = Math.cos(ship.angle);
            const sA = Math.sin(ship.angle);
            for (const padId of [-11, 11]) {
                const wx = ship.x + cA * (-15) - sA * padId;
                const wy = ship.y + sA * (-15) + cA * padId;
                createSmoke(
                    wx, wy, 3, 7.5, dustCol,
                    (Math.random() - 0.5) * 55, (Math.random() - 0.5) * 55,
                    2.6 + Math.random() * 1.8, 35,
                    { cloudType: 'launch', expansionMult: 3.6, alpha: 0.5, planetKey: nearestPlanet.key }
                );
            }
        }
    }

    updateSpring(ship.leftGearSpring, targetLeftComp || (ship.isGrounded ? 0.32 : 0.0), dt);
    updateSpring(ship.rightGearSpring, targetRightComp || (ship.isGrounded ? 0.32 : 0.0), dt);
    ship.gearCompression = (ship.leftGearSpring.pos + ship.rightGearSpring.pos) * 0.5;

    // --- EXTRACCIÓN DE NÚCLEOS DE ÉTER ---
    ship.activeHarvestNode = null;
    ship.activeHarvestPlanet = null;
    if (nearestPlanet && (altFromSurface < 220 || ship.insideCavernPlanet === nearestPlanet)) {
        const allNodes = nearestPlanet.isHollow && nearestPlanet.cavernNodes
            ? nearestPlanet.nodes.concat(nearestPlanet.cavernNodes)
            : nearestPlanet.nodes;
        for (const node of allNodes) {
            if (node.harvested) continue;
            const sr = (typeof getCavernOrSurfaceRadius === 'function')
                ? getCavernOrSurfaceRadius(nearestPlanet, node.angle, node.inCavern, node.onCeiling)
                : getSurfaceRadius(nearestPlanet, node.angle);
            const rOff = node.onCeiling ? (sr - 16) : (sr + 16);
            const nx = nearestPlanet.x + Math.cos(node.angle) * rOff;
            const ny = nearestPlanet.y + Math.sin(node.angle) * rOff;
            const dNode = Math.hypot(ship.x - nx, ship.y - ny);

            if (dNode < 220) {
                ship.activeHarvestNode = node;
                ship.activeHarvestPlanet = nearestPlanet;
                node.value -= dt * 62;

                if (Math.random() < 0.75) {
                    const toShipAng = Math.atan2(ship.y - ny, ship.x - nx) + (Math.random() - 0.5) * 0.4;
                    const spd = 120 + Math.random() * 150;
                    particles.push({
                        x: nx + (Math.random() - 0.5) * 14,
                        y: ny + (Math.random() - 0.5) * 14,
                        vx: Math.cos(toShipAng) * spd,
                        vy: Math.sin(toShipAng) * spd,
                        size: 2.2 + Math.random() * 1.5,
                        life: 0.32,
                        maxLife: 0.32,
                        isWarp: true,
                        type: 'plume'
                    });
                }

                if (node.value <= 0) {
                    node.harvested = true;
                    ship.artifacts += 1;
                    ship.fuel = Math.min(ship.maxFuel || 100, ship.fuel + 25);
                    if (typeof astronaut !== 'undefined' && typeof getFuelReserveCapacity === 'function') {
                        astronaut.fuelReserve = Math.min(getFuelReserveCapacity(), (astronaut.fuelReserve || 0) + 15);
                    }
                    ship.hull = Math.min(ship.maxHull || 100, ship.hull + 25);
                    audio.playChime();
                    showHoloCard(nearestPlanet, 'NÚCLEO DE ÉTER ASIMILADO', '+25 L de combustible a la sonda y +15 L a reserva EVA.');
                    createShockwave(nx, ny, 240, 480, 'rgba(251, 191, 36, 0.95)', 'ring');
                    createSparks(nx, ny, 26, 0, Math.PI * 2, 80, 250, [254, 240, 138], 0.7);
                }
                break;
            }
        }
    }

    // Ondas de Sonar Astral
    for (let i = sonarPulses.length - 1; i >= 0; i--) {
        const s = sonarPulses[i];
        s.radius += 2400 * dt;
        s.alpha = clamp(1 - s.radius / s.maxRadius, 0, 1);
        for (const p of nearby) {
            const d = Math.hypot(p.x - s.x, p.y - s.y);
            if (s.radius >= d - p.radius && !s.scannedKeys.has(p.key)) {
                s.scannedKeys.add(p.key);
                p.scanned = true;
                registerCodex(p);
                
                // Resaltar fauna autóctona si existe en el planeta
                if (p.creatures && p.creatures.length > 0) {
                    for (const cr of p.creatures) cr.sonarPingTime = 8.0;
                    showHoloCard(p, `SONAR · ${p.name.toUpperCase()}`, `🐾 FAUNA DETECTADA: ${p.creatures.length} seres autóctonos activos.`);
                } else {
                    showHoloCard(p, `ECO SONAR · ${p.name.toUpperCase()}`, `${p.archetype.typeLabel} — ${p.archetype.surfaceTag} (Mundo Inerte)`);
                }
            }
        }
        if (s.radius >= s.maxRadius) sonarPulses.splice(i, 1);
    }

    // Actualizar partículas ambientales del bioma
    updateBiomeParticles(nearestPlanet, dt);

    // Actualizar chispas con gravedad y rebote
    for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vx *= (1 - 0.65 * dt);
        sp.vy *= (1 - 0.65 * dt);

        if (nearestPlanet) {
            const dpx = nearestPlanet.x - sp.x;
            const dpy = nearestPlanet.y - sp.y;
            const dpDist = Math.hypot(dpx, dpy);
            if (dpDist > 10 && dpDist < nearestPlanet.atmoRadius) {
                sp.vx += (dpx / dpDist) * 115 * dt;
                sp.vy += (dpy / dpDist) * 115 * dt;
                bounceParticleOnPlanet(sp, nearestPlanet, dt, 0.42, 0.85);
            }
        }

        sp.life -= dt;
        if (sp.life <= 0) sparks.splice(i, 1);
    }

    // Actualizar humo volumétrico y nubes estratosféricas persistentes
    const planetTerrainMaxR = nearestPlanet
        ? (nearestPlanet.radius + ((nearestPlanet.archetype && nearestPlanet.archetype.radiusJitter) || 500) + 220)
        : 0;
    for (let i = smokePuffs.length - 1; i >= 0; i--) {
        const sm = smokePuffs[i];
        sm.x += sm.vx * dt;
        sm.y += sm.vy * dt;

        // Arrastre aerodinámico no lineal: el gas eyectado a alta velocidad frena rápido y luego flota
        const spd = Math.hypot(sm.vx, sm.vy);
        const effDrag = (sm.drag || 1.0) * (1 + spd * 0.0045);
        const dragFactor = 1 / (1 + effDrag * dt);
        sm.vx *= dragFactor;
        sm.vy *= dragFactor;
        sm.rot += sm.rotSpeed * dt;

        const progress = 1 - (sm.life / sm.maxLife);
        const elapsed = sm.maxLife - sm.life;

        // Expansión rápida inicial por descompresión térmica, seguida de difusión turbulenta gradual
        const expT = 1 - Math.pow(1 - progress, 2.15);
        sm.currentSize = lerp(sm.size, sm.maxSize, expT);

        // Turbulencia rotacional suave de baja frecuencia (evita vibración/temblor y produce remolinos fluidos)
        const turbStrength = sm.cloudType === 'stratosphere' ? 5.5 : (sm.cloudType === 'launch' ? 9.5 : 8.5);
        const phase = sm.turbPhase || 0;
        const swX = Math.sin(sm.y * 0.006 + phase + elapsed * 0.45);
        const swY = Math.cos(sm.x * 0.006 - phase + elapsed * 0.38);
        sm.vx += swX * turbStrength * dt;
        sm.vy += swY * turbStrength * dt;

        // Si pertenece a la atmósfera de un planeta, deriva con viento, flotabilidad térmica y deflexión sólida contra el suelo
        if (nearestPlanet && sm.planetKey === nearestPlanet.key) {
            const dx = sm.x - nearestPlanet.x;
            const dy = sm.y - nearestPlanet.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > 100) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                const tx = -ny;
                const ty = nx;
                const isStrato = sm.cloudType === 'stratosphere';
                const isLaunch = sm.cloudType === 'launch';

                // Convección térmica: en lanzamiento, primero rueda por el suelo y luego asciende rizado
                let buoyancy;
                if (isLaunch) {
                    const liftRamp = smoothstep(0.08, 0.45, progress);
                    buoyancy = (14.0 + 26.0 * (sm.heatGlow || 0)) * (0.22 + 0.98 * liftRamp);
                } else if (isStrato) {
                    buoyancy = 3.2;
                } else {
                    buoyancy = 7.5 + 14.0 * (sm.heatGlow || 0);
                }
                let windTang = isStrato ? 14.0 : 5.0;
                let windRad = 0;
                if (typeof samplePlanetWind === 'function' && nearestPlanet.wind && nearestPlanet.wind.hasWind) {
                    const smWind = samplePlanetWind(nearestPlanet, sm.x, sm.y);
                    if (smWind.hasWind) {
                        windTang = smWind.tangSpeed * (isStrato ? 0.55 : 0.42);
                        windRad = smWind.radSpeed * 0.35;
                    } else {
                        windTang = 0;
                    }
                }
                sm.vx += (nx * (buoyancy + windRad) + tx * windTang) * dt;
                sm.vy += (ny * (buoyancy + windRad) + ty * windTang) * dt;

                // Colisión estricta contra el relieve: el borde inferior de la nube nunca atraviesa la superficie
                if (!isStrato && dist < planetTerrainMaxR) {
                    const ang = Math.atan2(dy, dx);
                    const sr = getSurfaceRadius(nearestPlanet, ang);
                    const minR = sr + sm.currentSize * 0.84;
                    if (dist < minR) {
                        sm.x = nearestPlanet.x + nx * minR;
                        sm.y = nearestPlanet.y + ny * minR;
                        const vn = sm.vx * nx + sm.vy * ny;
                        const vt = sm.vx * tx + sm.vy * ty;
                        if (vn < 0) {
                            // Anular velocidad hacia el suelo y redirigir impulso tangencialmente sobre la superficie
                            const spreadBoost = -vn * 0.48;
                            const tangSign = vt !== 0 ? (vt > 0 ? 1 : -1) : (sm.vortexDir || 1);
                            sm.vx -= nx * vn;
                            sm.vy -= ny * vn;
                            sm.vx += tx * tangSign * spreadBoost;
                            sm.vy += ty * tangSign * spreadBoost;
                        }
                        // Rodamiento tangencial sobre el suelo inducido por la fricción del terreno y vórtice
                        const vDir = sm.vortexDir || 1;
                        sm.rotSpeed = lerp(sm.rotSpeed, (vt / Math.max(14, sm.currentSize)) * 0.9 + vDir * 0.45, Math.min(1, dt * 4));
                        const groundFric = Math.max(0.3, 1 - 0.32 * dt);
                        sm.vx *= groundFric;
                        sm.vy *= groundFric;
                    }
                }
            }
        }

        if (sm.heatGlow > 0) {
            sm.heatGlow = Math.max(0, sm.heatGlow - dt * 1.15);
        }
        sm.life -= dt;
        if (sm.life <= 0) smokePuffs.splice(i, 1);
    }

    // Actualizar partículas de plasma de reentrada
    for (let i = reentryParticles.length - 1; i >= 0; i--) {
        const rp = reentryParticles[i];
        rp.x += rp.vx * dt;
        rp.y += rp.vy * dt;
        rp.vx *= (1 - 1.5 * dt);
        rp.vy *= (1 - 1.5 * dt);
        rp.life -= dt;
        if (rp.life <= 0) reentryParticles.splice(i, 1);
    }

    // Actualizar escombros
    for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.rot += d.rotSpeed * dt;
        if (d.planet) {
            const dpx = d.planet.x - d.x;
            const dpy = d.planet.y - d.y;
            const dpDist = Math.hypot(dpx, dpy);
            if (dpDist > 10) {
                d.vx += (dpx / dpDist) * 190 * dt;
                d.vy += (dpy / dpDist) * 190 * dt;
            }
            bounceParticleOnPlanet(d, d.planet, dt, 0.35, 0.75);
        }
        d.life -= dt;
        if (d.life <= 0) debris.splice(i, 1);
    }

    // Actualizar fragmentos animados de piezas rotas
    for (let i = shatteredPartFX.length - 1; i >= 0; i--) {
        const fx = shatteredPartFX[i];
        fx.x += fx.vx * dt;
        fx.y += fx.vy * dt;
        if (fx.kind === 'shard') {
            fx.rot += fx.rotSpeed * dt;
            if (fx.planet) {
                const dpx = fx.planet.x - fx.x;
                const dpy = fx.planet.y - fx.y;
                const dpDist = Math.hypot(dpx, dpy);
                if (dpDist > 10) {
                    fx.vx += (dpx / dpDist) * 210 * dt;
                    fx.vy += (dpy / dpDist) * 210 * dt;
                }
                bounceParticleOnPlanet(fx, fx.planet, dt, 0.28, 0.72);
            }
            if (fx.isTank && Math.random() < 0.35 && smokePuffs.length < 220) {
                createSmoke(fx.x, fx.y, 1, 2.5, [120, 125, 135], fx.vx * 0.1, fx.vy * 0.1, 0.55, 8, { alpha: 0.28 });
            }
        } else if (fx.kind === 'flash') {
            const p = 1 - fx.life / fx.maxLife;
            fx.radius = lerp(fx.radius, fx.maxRadius, clamp(p * 1.4, 0, 1));
        }
        fx.life -= dt;
        if (fx.life <= 0) shatteredPartFX.splice(i, 1);
    }

    // Actualizar ondas en líquidos
    for (let i = liquidRipples.length - 1; i >= 0; i--) {
        const lr = liquidRipples[i];
        lr.radius += lr.speed * dt;
        lr.life = clamp(1 - (lr.radius / lr.maxRadius), 0, 1);
        if (lr.life <= 0) liquidRipples.splice(i, 1);
    }

    // Actualizar ondas de choque de impacto / asimilación
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += sw.speed * dt;
        sw.alpha = clamp(1 - sw.radius / sw.maxRadius, 0, 1);
        if (sw.radius >= sw.maxRadius) shockwaves.splice(i, 1);
    }

    // Actualizar vórtices de aleta
    for (let i = wingTrails.length - 1; i >= 0; i--) {
        const wt = wingTrails[i];
        if (wt.vx) wt.x += wt.vx * dt;
        if (wt.vy) wt.y += wt.vy * dt;
        wt.life -= dt;
        if (wt.life <= 0) wingTrails.splice(i, 1);
    }

    // Actualizar partículas de escape de plasma, deflexión rasante y polvo
    for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        const drag = pt.type === 'vacuum_plume' ? 0.35 : (pt.type === 'surface_plasma' ? 1.8 : 1.1);
        pt.vx *= (1 - drag * dt);
        pt.vy *= (1 - drag * dt);

        if (nearestPlanet && (pt.type === 'plume' || pt.type === 'dust')) {
            const dx = pt.x - nearestPlanet.x;
            const dy = pt.y - nearestPlanet.y;
            const dist = Math.hypot(dx, dy);
            const ang = Math.atan2(dy, dx);
            const sr = getSurfaceRadius(nearestPlanet, ang);

            if (dist < sr + 2.5) {
                const nx = dx / (dist || 1);
                const ny = dy / (dist || 1);
                const tx = -ny;
                const ty = nx;
                const vn = pt.vx * nx + pt.vy * ny;
                const vt = pt.vx * tx + pt.vy * ty;

                if (vn < 0) {
                    pt.x = nearestPlanet.x + nx * (sr + 2.8);
                    pt.y = nearestPlanet.y + ny * (sr + 2.8);
                    if (pt.type === 'plume') {
                        // Desviar el plasma a ras de superficie con alta velocidad tangencial
                        const side = (ship.flameDeflection && Math.random() < ship.flameDeflection.ratioLeft) ? 1 : (Math.random() < 0.5 ? 1 : -1);
                        const ejectSpeed = (Math.abs(vn) * 0.95 + Math.abs(vt)) * (0.8 + Math.random() * 0.5);
                        pt.vx = tx * (side * ejectSpeed) + nx * (Math.random() * 12 + 3);
                        pt.vy = ty * (side * ejectSpeed) + ny * (Math.random() * 12 + 3);
                        pt.type = 'surface_plasma';
                        pt.life = Math.min(pt.life, 0.28 + Math.random() * 0.2);
                        pt.maxLife = pt.life;
                    } else {
                        pt.vx = tx * (vt * 0.6) - nx * (vn * 0.25);
                        pt.vy = ty * (vt * 0.6) - ny * (vn * 0.25);
                    }
                }
            }
        }

        pt.life -= dt;
        if (pt.life <= 0) particles.splice(i, 1);
    }

    for (let i = rcsParticles.length - 1; i >= 0; i--) {
        const rp = rcsParticles[i];
        rp.x += rp.vx * dt;
        rp.y += rp.vy * dt;
        rp.life -= dt;
        if (rp.life <= 0) rcsParticles.splice(i, 1);
    }

    for (let i = warpFlashes.length - 1; i >= 0; i--) {
        const wf = warpFlashes[i];
        wf.life -= dt;
        if (wf.life <= 0) warpFlashes.splice(i, 1);
    }

    // Calcular trayectoria predictiva (solo en el último sub-paso del frame)
    if (!skipExpensiveUI) {
        computeTrajectoryPrediction(nearestPlanet);
    }

    // Física del astronauta en modo EVA
    if (typeof updateAstronautPhysics === 'function') {
        updateAstronautPhysics(dt);
    }

    // Simulación de máquinas extractoras de recursos planetarios
    if (typeof updateExtractors === 'function') {
        updateExtractors(dt, nearby);
    }

    // Simulación de astronautas colonos, socialización y logística de depósitos/cohetes
    if (typeof updateColonyColonists === 'function') {
        updateColonyColonists(dt, nearby);
    }

    // Física e IA de seres vivos extraterrestres y proyectiles de combate
    if (typeof updatePlanetCreatures === 'function') {
        updatePlanetCreatures(dt, nearby);
    }
    if (typeof updatePlasmaProjectiles === 'function') {
        updatePlasmaProjectiles(dt, nearby);
    }

    // Cámara Cinematográfica Adaptativa
    if (typeof astronaut !== 'undefined' && astronaut.active) {
        camera.x = lerp(camera.x, astronaut.x + (astronaut.facing * 8), dt * 6.0);
        camera.y = lerp(camera.y, astronaut.y, dt * 6.0);
        const evaBaseZoom = 1.85;
        const evaUserMult = (camera.userZoomMult !== undefined) ? camera.userZoomMult : 1.0;
        camera.targetZoom = clamp(evaBaseZoom * evaUserMult, 0.08, 3.2);

        const evaFlip = astronaut.onCeiling ? Math.PI : 0;
        const targetHorizonCamRot = -Math.PI / 2 - astronaut.angle + evaFlip;
        const rotDiff = Math.atan2(Math.sin(targetHorizonCamRot - camera.rotation), Math.cos(targetHorizonCamRot - camera.rotation));
        camera.rotation += rotDiff * clamp(dt * 6.2, 0, 1);
    } else {
        // Anclaje directo al cohete con anticipación acotada en píxeles de pantalla (cero retraso a altas velocidades)
        const leadMaxWorld = 45 / Math.max(0.05, camera.zoom);
        const targetLeadX = clamp(ship.vx * 0.08, -leadMaxWorld, leadMaxWorld);
        const targetLeadY = clamp(ship.vy * 0.08, -leadMaxWorld, leadMaxWorld);
        camera.leadX = lerp(camera.leadX || 0, targetLeadX, clamp(dt * 8.0, 0, 1));
        camera.leadY = lerp(camera.leadY || 0, targetLeadY, clamp(dt * 8.0, 0, 1));
        camera.x = ship.x + camera.leadX;
        camera.y = ship.y + camera.leadY;

        let baseTargetZoom = 1.0;
        if (ship.isGrounded) {
            baseTargetZoom = 1.12;
        } else if (ship.orbitMode === 'locked') {
            const pRad = nearestPlanet ? nearestPlanet.radius : 28000;
            baseTargetZoom = clamp(0.52 * (12000 / Math.max(8000, pRad * 0.45)), 0.10, 0.68);
        } else if (altFromSurface < 450) {
            baseTargetZoom = 0.98;
        } else if (nearestPlanet && altFromSurface < (nearestPlanet.atmoRadius - nearestPlanet.radius)) {
            baseTargetZoom = 0.76;
        } else {
            baseTargetZoom = clamp(0.68 - (shipSpeed / 1800) * 0.34, 0.28, 0.72);
        }

        if (camera.userZoomMult !== undefined) {
            camera.targetZoom = clamp(baseTargetZoom * camera.userZoomMult, 0.0018, 2.2);
        } else {
            camera.targetZoom = baseTargetZoom;
        }
    }
    const curZ = Math.max(0.001, camera.zoom);
    const tgtZ = Math.max(0.001, camera.targetZoom);
    camera.zoom = Math.exp(lerp(Math.log(curZ), Math.log(tgtZ), clamp(dt * 4.5, 0, 1)));

    if (camera.shake > 0) camera.shake = Math.max(0, camera.shake - dt * 7.5);
    if (ship.invulnTimer > 0) ship.invulnTimer = Math.max(0, ship.invulnTimer - dt);

    if (typeof updateFreeVessels === 'function') {
        updateFreeVessels(dt, nearby);
    }
    resolveVesselCollisions(dt);

    if (!skipExpensiveUI) {
        updateHUD(nearestPlanet, altFromSurface, shipSpeed);
    }
}

function updateFreeVessels(dt, nearbyPlanets) {
    if (typeof freeVessels === 'undefined' || freeVessels.length === 0) return;
    const planetsList = nearbyPlanets && nearbyPlanets.length > 0 ? nearbyPlanets : (typeof getNearbyPlanets === 'function' ? getNearbyPlanets(ship.x, ship.y, 1) : []);

    for (const v of freeVessels) {
        if (!v) continue;
        if (v.invulnTimer > 0) v.invulnTimer = Math.max(0, v.invulnTimer - dt);
        // Gravedad Kepleriana desde planetas cercanos
        let ax = 0, ay = 0;
        let nearP = null;
        let minDist = Infinity;
        for (const p of planetsList) {
            const dx = p.x - v.x;
            const dy = p.y - v.y;
            const d = Math.hypot(dx, dy);
            if (d < minDist) { minDist = d; nearP = p; }
            const pull = getPlanetGravityPull(p, d, v.x, v.y);
            if (pull > 0 && d > 1) {
                ax += (dx / d) * pull;
                ay += (dy / d) * pull;
            }
        }

        if (v.isResting && (Math.hypot(v.vx, v.vy) > 0.1 || Math.abs(v.av) > 0.01)) {
            v.isResting = false;
        }

        if (!v.isResting) {
            v.vx += ax * dt;
            v.vy += ay * dt;
            v.x += v.vx * dt;
            v.y += v.vy * dt;
            v.angle += v.av * dt;
            v.av *= Math.pow(0.85, dt * 10);
        }

        // Colisión con la superficie del planeta más cercano
        const vWasGrounded = !!v.isGrounded;
        v.isGrounded = false;
        if (nearP && minDist < nearP.radius * 2.2) {
            const cosA = Math.cos(v.angle);
            const sinA = Math.sin(v.angle);
            const pts = (v.customRocket && Array.isArray(v.customRocket.contactPoints) && v.customRocket.contactPoints.length > 0)
                ? v.customRocket.contactPoints
                : (v.contactPoints || [{ x: -10, y: 0 }, { x: 10, y: 0 }]);
            const vSkin = v.isResting ? 0.75 : (vWasGrounded ? 0.15 : 0);
            let maxPen = 0, avgNx = 0, avgNy = 0;
            const vContacts = [];

            for (const pt of pts) {
                const wx = v.x + cosA * pt.x - sinA * pt.y;
                const wy = v.y + sinA * pt.x + cosA * pt.y;
                const dx = wx - nearP.x;
                const dy = wy - nearP.y;
                const d = Math.hypot(dx, dy) || 1;
                const ang = Math.atan2(dy, dx);
                const sr = getSurfaceRadius(nearP, ang);

                let baseUnderPt = null;
                if (nearP.bases && nearP.bases.length > 0) {
                    for (let bi = 0; bi < nearP.bases.length; bi++) {
                        const b = nearP.bases[bi];
                        const dAng = Math.abs(Math.atan2(Math.sin(ang - b.angle), Math.cos(ang - b.angle)));
                        if (dAng <= b.angularHalfSpan * 0.85) {
                            const cosD = Math.cos(dAng);
                            const deckR = cosD > 0.001 ? (b.deckR / cosD) : b.deckR;
                            const natR = (typeof getNaturalSurfaceRadius === 'function') ? getNaturalSurfaceRadius(nearP, ang) : sr;
                            if (deckR >= natR - 0.5) baseUnderPt = b;
                            break;
                        }
                    }
                }

                if (baseUnderPt) {
                    const bnx = Math.cos(baseUnderPt.angle);
                    const bny = Math.sin(baseUnderPt.angle);
                    const deckPen = baseUnderPt.deckR - (dx * bnx + dy * bny);
                    if (deckPen > -vSkin) {
                        const pen = Math.max(0, deckPen);
                        v.isGrounded = true;
                        if (pen > maxPen) { maxPen = pen; avgNx = bnx; avgNy = bny; }
                        vContacts.push({ pt, wx, wy, nx: bnx, ny: bny, tx: -bny, ty: bnx });
                    }
                } else if (d < sr + vSkin) {
                    const pen = Math.max(0, sr - d);
                    const nx = dx / d;
                    const ny = dy / d;
                    v.isGrounded = true;
                    if (pen > maxPen) { maxPen = pen; avgNx = nx; avgNy = ny; }
                    vContacts.push({ pt, wx, wy, nx, ny, tx: -ny, ty: nx });
                }
            }
            if (vContacts.length === 0) v.isResting = false;
            if (maxPen > 0) {
                const corr = Math.max(0, maxPen - (vWasGrounded ? 0.03 : 0));
                if (corr > 0) {
                    v.x += avgNx * corr;
                    v.y += avgNy * corr;
                }
            }
            if (vContacts.length > 0 && !v.isResting) {
                const vCount = vContacts.length;
                const vMass = Math.max(0.5, v.mass || 1);
                const vInertia = Math.max(10, v.inertia || 100);
                const brokenChecked = new Set();
                for (const c of vContacts) {
                    const rx = c.wx - v.x;
                    const ry = c.wy - v.y;
                    const ptVx = v.vx - v.av * ry;
                    const ptVy = v.vy + v.av * rx;
                    const vn = ptVx * c.nx + ptVy * c.ny;
                    if (vn < 0 && v.customRocket && c.pt && c.pt.partInstanceId && (v.invulnTimer || 0) <= 0 && !brokenChecked.has(c.pt.partInstanceId) && typeof damageCustomRocketPartAt === 'function') {
                        brokenChecked.add(c.pt.partInstanceId);
                        const hitPart = v.customRocket.customParts.find(p => p.instanceId === c.pt.partInstanceId);
                        const hitDef = hitPart && typeof ROCKET_PARTS_CATALOG !== 'undefined' ? ROCKET_PARTS_CATALOG[hitPart.partDefId] : null;
                        const tol = (typeof getPartImpactTolerance === 'function') ? getPartImpactTolerance(hitDef) : 165;
                        if (-vn > tol) {
                            damageCustomRocketPartAt(v, c.pt.partInstanceId, (-vn - tol) * 1.25, c.wx, c.wy, -vn, c.nx, c.ny, nearP);
                        }
                    }
                }
                const accumJn = new Array(vCount).fill(0);
                for (let iter = 0; iter < 4; iter++) {
                    for (let ci = 0; ci < vCount; ci++) {
                        const c = vContacts[ci];
                        const rx = c.wx - v.x;
                        const ry = c.wy - v.y;
                        const vn = (v.vx - v.av * ry) * c.nx + (v.vy + v.av * rx) * c.ny;
                        const restitution = (iter === 0 && !vWasGrounded && -vn >= 24) ? 0.08 : 0;
                        const torque = rx * c.ny - ry * c.nx;
                        const effDenomN = 1 + (vMass * torque * torque) / vInertia;
                        let dJn = (-(1 + restitution) * vn) / effDenomN;
                        const newAccum = Math.max(0, accumJn[ci] + dJn);
                        dJn = newAccum - accumJn[ci];
                        accumJn[ci] = newAccum;
                        if (dJn !== 0) {
                            v.vx += dJn * c.nx;
                            v.vy += dJn * c.ny;
                            v.av += clamp((dJn * vMass * torque * 0.72) / vInertia, -3.5, 3.5);
                        }
                        if (vn < 2.0) {
                            const vt = (v.vx - v.av * ry) * c.tx + (v.vy + v.av * rx) * c.ty;
                            const torqueT = rx * c.ty - ry * c.tx;
                            const effDenomT = 1 + (vMass * torqueT * torqueT) / vInertia;
                            const dJt = (-vt * 0.72) / effDenomT;
                            v.vx += dJt * c.tx;
                            v.vy += dJt * c.ty;
                            v.av += clamp((dJt * vMass * torqueT * 0.45) / vInertia, -3.5, 3.5);
                        }
                    }
                }
                if (vCount >= 2) v.av *= 0.76;
            }
            if (v.isGrounded && Math.hypot(v.vx, v.vy) < 10) {
                v.vx *= 0.75;
                v.vy *= 0.75;
                v.av *= 0.70;
                if (vContacts.length >= 2 && Math.hypot(v.vx, v.vy) < 3.5 && Math.abs(v.av) < 0.08) {
                    v.vx = 0;
                    v.vy = 0;
                    v.av = 0;
                    v.isResting = true;
                }
            }
        }
    }

    resolveVesselCollisions(dt);
}

function getVesselBox(v) {
    if (v && v.customRocket && v.customRocket.bounds && v.customRocket.com) {
        const b = v.customRocket.bounds;
        const halfLen = Math.max(12, (b.height || 40) * 0.25);
        const halfWid = Math.max(8, (b.width || 24) * 0.25);
        const centerOffX = -(((b.minY + b.maxY) * 0.5) - v.customRocket.com.y) * 0.5;
        return { halfLen, halfWid, centerOffX, radius: Math.hypot(halfLen, halfWid) + Math.abs(centerOffX) };
    }
    const sc = (v && v.scale) ? v.scale : 1.0;
    return { halfLen: 18 * sc, halfWid: 10 * sc, centerOffX: 0, radius: 22 * sc };
}

function resolveVesselPairCollision(A, B) {
    const boxA = getVesselBox(A);
    const boxB = getVesselBox(B);
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const dist = Math.hypot(dx, dy);
    if (dist > boxA.radius + boxB.radius + 8) return;

    const testPointsAgainstParts = (src, dst, dstBox) => {
        const pts = (src.customRocket && src.customRocket.contactPoints) || src.contactPoints || [
            { x: 14, y: 0 }, { x: -14, y: -7 }, { x: -14, y: 7 }
        ];
        const cosS = Math.cos(src.angle), sinS = Math.sin(src.angle);
        const cosD = Math.cos(dst.angle), sinD = Math.sin(dst.angle);
        const hasDstParts = !!(dst.customRocket && dst.customRocket.customParts && dst.customRocket.customParts.length > 0 && typeof ROCKET_PARTS_CATALOG !== 'undefined');
        const dstCom = hasDstParts ? (dst.customRocket.com || { x: 0, y: 0 }) : null;

        let deepest = null;
        for (const pt of pts) {
            const wx = src.x + cosS * pt.x - sinS * pt.y;
            const wy = src.y + sinS * pt.x + cosS * pt.y;
            const rx = wx - dst.x;
            const ry = wy - dst.y;
            // Transformar al marco de vuelo local de dst
            const lxBase = rx * cosD + ry * sinD;
            const lyBase = -rx * sinD + ry * cosD;

            if (hasDstParts) {
                for (const dPart of dst.customRocket.customParts) {
                    const def = ROCKET_PARTS_CATALOG[dPart.partDefId];
                    if (!def) continue;
                    if (def.isFairing && dPart.fairingOpened) continue;
                    const sz = (typeof getPartSize === 'function') ? getPartSize(dPart, def) : { width: def.width || 20, height: def.height || 20 };
                    // Ignorar paneles solares contraídos en colisión de cuerpo
                    const anim = (typeof dPart.deployAnim === 'number') ? dPart.deployAnim : (dPart.deployed === false ? 0 : 1);
                    if (def.isSolarPanel && anim <= 0.25) continue;

                    const pfx = -(dPart.y - dstCom.y) * 0.5;
                    const pfy = (dPart.x - dstCom.x) * 0.5;
                    const pRot = ((dPart.rotation || 0) * Math.PI) / 180;
                    const cosP = Math.cos(pRot), sinP = Math.sin(pRot);
                    const dxP = lxBase - pfx;
                    const dyP = lyBase - pfy;
                    const plx = dxP * cosP + dyP * sinP;
                    const ply = -dxP * sinP + dyP * cosP;

                    const halfLen = (sz.height || 20) * 0.25;
                    const halfWid = (def.isSolarPanel ? (sz.width * anim) : (sz.width || 20)) * 0.25;
                    const penX = halfLen - Math.abs(plx);
                    const penY = halfWid - Math.abs(ply);
                    if (penX > 0 && penY > 0) {
                        let lnx = 0, lny = 0, pen = 0;
                        if (penX < penY) {
                            pen = penX;
                            lnx = plx >= 0 ? 1 : -1;
                        } else {
                            pen = penY;
                            lny = ply >= 0 ? 1 : -1;
                        }
                        if (!deepest || pen > deepest.pen) {
                            // Rotar normal desde el marco de dPart -> marco de dst -> mundo
                            const dnx = lnx * cosP - lny * sinP;
                            const dny = lnx * sinP + lny * cosP;
                            const nx = dnx * cosD - dny * sinD;
                            const ny = dnx * sinD + dny * cosD;
                            deepest = { wx, wy, nx, ny, pen, pt, dstPartId: dPart.instanceId };
                        }
                    }
                }
            } else {
                const lx = lxBase - dstBox.centerOffX;
                const ly = lyBase;
                const penX = dstBox.halfLen - Math.abs(lx);
                const penY = dstBox.halfWid - Math.abs(ly);
                if (penX > 0 && penY > 0) {
                    let lnx = 0, lny = 0, pen = 0;
                    if (penX < penY) {
                        pen = penX;
                        lnx = lx >= 0 ? 1 : -1;
                    } else {
                        pen = penY;
                        lny = ly >= 0 ? 1 : -1;
                    }
                    if (!deepest || pen > deepest.pen) {
                        const nx = lnx * cosD - lny * sinD;
                        const ny = lnx * sinD + lny * cosD;
                        deepest = { wx, wy, nx, ny, pen, pt, dstPartId: null };
                    }
                }
            }
        }
        return deepest;
    };

    let hit = testPointsAgainstParts(A, B, boxB);
    let src = A, dst = B;
    if (!hit) {
        hit = testPointsAgainstParts(B, A, boxA);
        src = B; dst = A;
    }
    if (!hit) return;

    // Separar cuerpos inversamente proporcional a sus masas
    const mS = Math.max(0.5, src.mass || 1);
    const mD = Math.max(0.5, dst.mass || 1);
    const invS = 1 / mS;
    const invD = 1 / mD;
    const invSum = invS + invD;

    src.x += hit.nx * hit.pen * (invS / invSum);
    src.y += hit.ny * hit.pen * (invS / invSum);
    dst.x -= hit.nx * hit.pen * (invD / invSum);
    dst.y -= hit.ny * hit.pen * (invD / invSum);

    // Impulso de cuerpo rígido 2D entre src y dst (normal apunta hacia afuera de dst, hacia src)
    const rSx = hit.wx - src.x, rSy = hit.wy - src.y;
    const rDx = hit.wx - dst.x, rDy = hit.wy - dst.y;
    const vSx = src.vx - (src.av || 0) * rSy;
    const vSy = src.vy + (src.av || 0) * rSx;
    const vDx = dst.vx - (dst.av || 0) * rDy;
    const vDy = dst.vy + (dst.av || 0) * rDx;

    const rvx = vSx - vDx;
    const rvy = vSy - vDy;
    const vn = rvx * hit.nx + rvy * hit.ny;
    if (vn >= 0) return;

    const iS = Math.max(20, src.inertia || 150);
    const iD = Math.max(20, dst.inertia || 150);
    const crossS = rSx * hit.ny - rSy * hit.nx;
    const crossD = rDx * hit.ny - rDy * hit.nx;
    const denom = invSum + (crossS * crossS) / iS + (crossD * crossD) / iD;

    const restitution = Math.abs(vn) < 18 ? 0.1 : 0.35;
    const j = (-(1 + restitution) * vn) / denom;

    src.vx += (j * invS) * hit.nx;
    src.vy += (j * invS) * hit.ny;
    src.av = (src.av || 0) + clamp((j * crossS) / iS, -3.5, 3.5);

    dst.vx -= (j * invD) * hit.nx;
    dst.vy -= (j * invD) * hit.ny;
    dst.av = (dst.av || 0) - clamp((j * crossD) / iD, -3.5, 3.5);

    // Despertar si estaba posado y recibió un golpe apreciable
    if (-vn > 12) {
        src.isGrounded = false;
        dst.isGrounded = false;
    }

    // Fricción tangencial
    const tx = -hit.ny, ty = hit.nx;
    const vt = rvx * tx + rvy * ty;
    const jt = (-vt * 0.45) / invSum;
    src.vx += (jt * invS) * tx;
    src.vy += (jt * invS) * ty;
    dst.vx -= (jt * invD) * tx;
    dst.vy -= (jt * invD) * ty;

    // Chispas y rotura de piezas según dureza y velocidad de impacto
    const impactSpeed = -vn;
    if (impactSpeed > 32 && typeof createSparks === 'function') {
        createSparks(hit.wx, hit.wy, 6, Math.atan2(hit.ny, hit.nx), 1.4, 50, 180, [255, 225, 140], 0.35);
    }
    if (impactSpeed > 45 && typeof damageCustomRocketPartAt === 'function') {
        const srcGrace = (src.invulnTimer || 0) > 0;
        const dstGrace = (dst.invulnTimer || 0) > 0;
        const effMass = Math.min(mS, mD);
        const dmgMultS = clamp(effMass / Math.max(0.5, mS * 0.5), 0.4, 1.8);
        const dmgMultD = clamp(effMass / Math.max(0.5, mD * 0.5), 0.4, 1.8);

        if (!srcGrace && src.customRocket && hit.pt && hit.pt.partInstanceId) {
            const pS = src.customRocket.customParts.find(p => p.instanceId === hit.pt.partInstanceId);
            const dS = pS && typeof ROCKET_PARTS_CATALOG !== 'undefined' ? ROCKET_PARTS_CATALOG[pS.partDefId] : null;
            const tolS = (typeof getPartImpactTolerance === 'function') ? getPartImpactTolerance(dS) : 165;
            if (impactSpeed > tolS) {
                damageCustomRocketPartAt(src, hit.pt.partInstanceId, (impactSpeed - tolS) * 1.2 * dmgMultS, hit.wx, hit.wy, impactSpeed, hit.nx, hit.ny, null);
            }
        }
        if (!dstGrace && dst.customRocket && dst.customRocket.customParts.length > 0) {
            let nearPart = hit.dstPartId ? dst.customRocket.customParts.find(p => p.instanceId === hit.dstPartId) : null;
            if (!nearPart) {
                let minD = Infinity;
                const cosD = Math.cos(dst.angle), sinD = Math.sin(dst.angle);
                const comD = dst.customRocket.com || { x: 0, y: 0 };
                for (const p of dst.customRocket.customParts) {
                    const fx = -(p.y - comD.y) * 0.5;
                    const fy = (p.x - comD.x) * 0.5;
                    const px = dst.x + cosD * fx - sinD * fy;
                    const py = dst.y + sinD * fx + cosD * fy;
                    const d = Math.hypot(px - hit.wx, py - hit.wy);
                    if (d < minD) { minD = d; nearPart = p; }
                }
            }
            if (nearPart) {
                const dD = typeof ROCKET_PARTS_CATALOG !== 'undefined' ? ROCKET_PARTS_CATALOG[nearPart.partDefId] : null;
                const tolD = (typeof getPartImpactTolerance === 'function') ? getPartImpactTolerance(dD) : 165;
                if (impactSpeed > tolD) {
                    damageCustomRocketPartAt(dst, nearPart.instanceId, (impactSpeed - tolD) * 1.2 * dmgMultD, hit.wx, hit.wy, impactSpeed, -hit.nx, -hit.ny, null);
                }
            }
        }
    }
}

function resolveVesselCollisions(dt) {
    const vessels = [];
    if (typeof ship !== 'undefined' && (typeof astronaut === 'undefined' || !astronaut.active)) {
        vessels.push(ship);
    }
    if (typeof freeVessels !== 'undefined' && Array.isArray(freeVessels)) {
        for (const fv of freeVessels) {
            if (fv) vessels.push(fv);
        }
    }
    if (typeof parkedShips !== 'undefined' && Array.isArray(parkedShips)) {
        for (const ps of parkedShips) {
            if (ps) vessels.push(ps);
        }
    }
    if (vessels.length < 2) return;

    for (let i = 0; i < vessels.length; i++) {
        for (let j = i + 1; j < vessels.length; j++) {
            resolveVesselPairCollision(vessels[i], vessels[j]);
        }
    }
}

function _hashPartSeed(str) {
    let h = 2166136261;
    const s = String(str || 'part');
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
}

function _accumulateBurnLayer(sc, fx, fy, charDelta, currentTemp, maxLayers = 4) {
    if (!Array.isArray(sc.burns)) sc.burns = [];
    const fLen = Math.hypot(fx, fy) || 1;
    const nx = fx / fLen;
    const ny = fy / fLen;

    let bestIdx = -1;
    let bestDot = -2;
    for (let i = 0; i < sc.burns.length; i++) {
        const b = sc.burns[i];
        const dot = b.dirX * nx + b.dirY * ny;
        if (dot > bestDot) {
            bestDot = dot;
            bestIdx = i;
        }
    }

    // Misma dirección (~32°) o ya alcanzamos el límite de capas: acumular sin rotar manchas viejas
    if (bestIdx >= 0 && (bestDot >= 0.848 || sc.burns.length >= maxLayers)) {
        const target = sc.burns[bestIdx];
        // Solo ajustar dirección levemente si la mancha recién empieza y el ángulo es cercano
        if (bestDot >= 0.848 && target.amount < 0.08) {
            const bx = lerp(target.dirX, nx, 0.25);
            const by = lerp(target.dirY, ny, 0.25);
            const bl = Math.hypot(bx, by) || 1;
            target.dirX = bx / bl;
            target.dirY = by / bl;
        }
        target.amount = clamp(target.amount + charDelta, 0, 1);
        target.peakTemp = Math.max(target.peakTemp || 0, currentTemp);
    } else if (charDelta > 0.0005 || currentTemp > 0.08) {
        sc.burns.push({
            dirX: nx,
            dirY: ny,
            amount: clamp(charDelta, 0, 1),
            peakTemp: currentTemp
        });
    }
}

function updateShipReentryScorch(s, dt) {
    if (!s) return;
    const reI = clamp(s.reentryIntensity || 0, 0, 1.25);
    const flowAngle = s.reentryFlowAngle || 0;
    const flowX = Math.cos(flowAngle);
    const flowY = Math.sin(flowAngle);
    const activeHeating = reI > 0.04;

    // 1. Estado térmico global del casco (para cohetes predefinidos y referencia general)
    if (!s.scorch) s.scorch = { amount: 0, dirX: 1, dirY: 0, temp: 0, peakTemp: 0, burns: [] };
    if (activeHeating) {
        const blend = clamp(dt * 4.5 * reI, 0, 1);
        const nx = lerp(s.scorch.dirX, flowX, blend);
        const ny = lerp(s.scorch.dirY, flowY, blend);
        const nl = Math.hypot(nx, ny) || 1;
        s.scorch.dirX = nx / nl;
        s.scorch.dirY = ny / nl;
        const rate = Math.pow(reI, 1.35) * 0.064;
        const delta = rate * dt;
        s.scorch.amount = clamp(s.scorch.amount + delta, 0, 1);
        s.scorch.temp = clamp(lerp(s.scorch.temp, clamp(reI * 1.05, 0, 1), dt * 3.8), 0, 1);
        s.scorch.peakTemp = Math.max(s.scorch.peakTemp || 0, s.scorch.temp);
        _accumulateBurnLayer(s.scorch, flowX, flowY, delta, s.scorch.temp, 4);
    } else if (s.scorch.temp > 0.001) {
        s.scorch.temp = Math.max(0, s.scorch.temp - dt * (0.28 * s.scorch.temp + 0.06));
    }

    // 2. Desgaste térmico adaptativo por pieza en cohetes personalizados
    if (s.customRocket && Array.isArray(s.customRocket.customParts) && typeof ROCKET_PARTS_CATALOG !== 'undefined') {
        const parts = s.customRocket.customParts;
        const com = s.customRocket.com || { x: 0, y: 0 };
        const scale = (s.scale || 1.0) * (typeof FLIGHT_SCALE !== 'undefined' ? FLIGHT_SCALE : 0.5);

        if (!activeHeating) {
            // Enfriar suavemente las piezas que aún brillan al rojo vivo tras salir del plasma
            for (let i = 0; i < parts.length; i++) {
                const sc = parts[i].scorch;
                if (sc && sc.temp > 0.001) {
                    sc.temp = Math.max(0, sc.temp - dt * (0.32 * sc.temp + 0.07));
                }
            }
            return;
        }

        // Proyectar todas las piezas al marco del flujo para calcular oclusión aerodinámica real
        const n = parts.length;
        const proj = new Array(n);
        for (let i = 0; i < n; i++) {
            const p = parts[i];
            const def = ROCKET_PARTS_CATALOG[p.partDefId];
            if (!def) { proj[i] = null; continue; }
            if (def.isFairing && p.fairingOpened) { proj[i] = null; continue; }
            const sz = (typeof getPartSize === 'function') ? getPartSize(p, def) : { width: def.width || 24, height: def.height || 24 };
            const rotRadLocal = ((p.rotation || 0) * Math.PI) / 180;
            let effW = sz.width || 24;
            let localOffsetX = 0;
            if (def.deployable) {
                const anim = (typeof p.deployAnim === 'number') ? p.deployAnim : (p.deployed === false ? 0.0 : 1.0);
                if (def.isSolarPanel) {
                    effW = 9 + (effW - 9) * anim;
                    localOffsetX = (p.flipped ? -1 : 1) * ((sz.width || 24) - effW) * 0.5;
                } else if (def.isLandingPad) {
                    effW = 8 + (effW - 8) * anim;
                    localOffsetX = (p.flipped ? -1 : 1) * ((sz.width || 24) - effW) * 0.5;
                }
            }
            const effPx = p.x + localOffsetX * Math.cos(rotRadLocal);
            const effPy = p.y + localOffsetX * Math.sin(rotRadLocal);
            const fx = -(effPy - com.y) * scale;
            const fy = (effPx - com.x) * scale;
            const partRot = Math.PI / 2 + rotRadLocal;
            const cR = Math.cos(partRot);
            const sR = Math.sin(partRot);
            const hw = effW * 0.5 * scale;
            const hh = (sz.height || 24) * 0.5 * scale;

            const u = fx * flowX + fy * flowY;
            const v = -fx * flowY + fy * flowX;
            const projLen = Math.abs(cR * flowX + sR * flowY) * hw + Math.abs(-sR * flowX + cR * flowY) * hh;
            const projSpan = Math.abs(-cR * flowY + sR * flowX) * hw + Math.abs(sR * flowY + cR * flowX) * hh;
            proj[i] = { u, v, projLen, projSpan, isHeatShield: !!def.isHeatShield, cR, sR };
        }

        for (let i = 0; i < n; i++) {
            const p = parts[i];
            const pi = proj[i];
            if (!pi) continue;
            const def = ROCKET_PARTS_CATALOG[p.partDefId];

            // Calcular cuánta protección aerodinámica le dan las piezas situadas corriente arriba
            let shielding = 0;
            const pFront = pi.u + pi.projLen * 0.35;
            const pVMin = pi.v - pi.projSpan;
            const pVMax = pi.v + pi.projSpan;
            const pSpanTotal = Math.max(1, pi.projSpan * 2);

            for (let j = 0; j < n; j++) {
                if (i === j || !proj[j]) continue;
                const qj = proj[j];
                const qFront = qj.u + qj.projLen * 0.35;
                if (qFront <= pFront + 1.5) continue;

                const overlap = Math.min(pVMax, qj.v + qj.projSpan) - Math.max(pVMin, qj.v - qj.projSpan);
                if (overlap <= 0.5) continue;

                const overlapFrac = overlap / pSpanTotal;
                const distAtten = clamp(1.0 - (qFront - pFront) / 360, 0.45, 1.0);
                const shieldPower = qj.isHeatShield ? 0.88 : 0.68;
                const effShield = overlapFrac * shieldPower * distAtten;
                if (effShield > shielding) shielding = effShield;
            }

            const exposure = clamp(1.0 - shielding, 0.24, 1.0);

            // Vector del flujo incidente en coordenadas LOCALES de la pieza
            let lx = flowX * pi.cR + flowY * pi.sR;
            let ly = -flowX * pi.sR + flowY * pi.cR;
            if (p.flipped) lx = -lx;

            if (!p.scorch) {
                p.scorch = {
                    amount: 0,
                    dirX: lx,
                    dirY: ly,
                    exposure,
                    temp: 0,
                    peakTemp: 0,
                    edgeHeat: 0,
                    seed: _hashPartSeed(p.instanceId || (p.partDefId + '_' + i)),
                    burns: []
                };
            }

            const sc = p.scorch;
            sc.exposure = exposure;

            // Dirección viva del flujo actual (solo para incandescencia activa en tiempo real)
            const dirBlend = clamp(dt * (4.2 + reI * 3.5), 0, 1);
            const ndx = lerp(sc.dirX, lx, dirBlend);
            const ndy = lerp(sc.dirY, ly, dirBlend);
            const ndLen = Math.hypot(ndx, ndy) || 1;
            sc.dirX = ndx / ndLen;
            sc.dirY = ndy / ndLen;

            // Tasa de carbonización adaptada al material y tipo de pieza
            const tex = p.texture || def.defaultTexture || 'smooth';
            let matRate = 1.0;
            if (def.isHeatShield) matRate = 1.48;
            else if (tex === 'tiles' || tex === 'carbon') matRate = 0.58;
            else if (tex === 'steel') matRate = 0.88;
            else if (tex === 'foil') matRate = 1.22;
            else if (def.isSolarPanel) matRate = 1.18;
            else if (def.thrust && def.thrust > 0) matRate = 0.96;
            else if (def.category === 'aero') matRate = 1.06;

            // Retropropulsión supersónica: el encendido de motores hacia el flujo empuja la onda de choque
            const retroShield = (s.thrustIntensity > 0.15 && flowX < -0.55)
                ? (1 - 0.22 * clamp(s.thrustIntensity, 0, 1) * (-flowX - 0.55) / 0.45)
                : 1.0;

            const charDelta = Math.pow(reI, 1.35) * 0.082 * exposure * matRate * dt;
            sc.amount = clamp(sc.amount + charDelta, 0, 1);

            const targetTemp = clamp(reI * (0.44 + 0.68 * exposure) * retroShield, 0, 1);
            sc.temp = clamp(lerp(sc.temp, targetTemp, dt * (targetTemp > sc.temp ? 4.4 : 1.8)), 0, 1);
            sc.peakTemp = Math.max(sc.peakTemp || 0, sc.temp);
            sc.edgeHeat = clamp(reI * Math.pow(exposure, 0.78) * retroShield, 0, 1);

            // Fijar la quemadura en capas direccionales estáticas (no rotan al girar el cohete)
            _accumulateBurnLayer(sc, lx, ly, charDelta, sc.temp, 4);
        }
    }
}

function hasPilotTurnInput() {
    return ship.turnVal !== 0 || ship.targetAngle !== null;
}

function takeDamage(amt, msg) {
    // Blindaje pesado de titanio absorbe el 50% del impacto
    if (ship.modelKey === 'titan') {
        amt *= 0.5;
    }
    ship.hull = Math.max(0, ship.hull - amt);
    camera.shake = Math.max(camera.shake, 3.8);
    if (ship.invulnTimer <= 0) {
        ship.invulnTimer = 0.48;
        audio.playImpact(0.85);
        if (msg) showHoloCard(getPlanet(0, 0), 'ALERTA DE INTEGRIDAD', msg);
    }
    if (ship.hull <= 0) {
        resetOrigin();
        showHoloCard(getPlanet(0, 0), 'SONDA RECONSTITUIDA', 'Retorno de emergencia completado en Cuna del Éter.');
    }
}
