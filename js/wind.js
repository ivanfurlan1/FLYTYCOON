/**
 * ÉTER — Sistema Eólico Planetario Inteligente, Ráfagas Móviles y Vórtices (Tornados & Huracanes)
 * ---------------------------------------------------------------------------
 * Arquitectura física y visual:
 *  - Cada planeta posee una identidad eólica única derivada de su clase, arquetipo,
 *    tamaño, densidad atmosférica y semilla procedural (variación intra-categoría).
 *  - El viento varía en espacio (regiones, relieve orográfico, altitud, ojo de huracán)
 *    y en tiempo (frentes viajeros que nacen, crecen, se trasladan y disipan).
 *  - Las tormentas intensifican las ráfagas y pueden nuclear tornados o huracanes.
 *  - Acoplamiento aerodinámico realista: las brisas leves no perturban al cohete,
 *    mientras que vendavales aislados, huracanes y tornados ejercen empuje y par real.
 */

const WIND_LOCAL_PARTICLES = [];
let _windParticlePlanetKey = null;

function windRand(rng) {
    return typeof rng === 'function' ? rng() : Math.random();
}

function windGetBaseProfile(planet) {
    const arch = (planet && planet.archetype) || {};
    if (typeof wxResolveWindProfile === 'function') {
        return wxResolveWindProfile(arch);
    }
    return {
        regimeId: 'breezy_variable',
        name: 'Brisas Variables',
        desc: 'Vientos planetarios variables.',
        baseSpeed: [8, 28],
        gustAmp: [20, 75],
        cellCount: [3, 5],
        cellDuration: [35, 70],
        cellAngVel: [0.004, 0.012],
        calmBias: 0.45,
        jetAltFrac: 0.40,
        jetBoost: 45,
        vortexTypes: ['tornado'],
        vortexChance: 0.16,
        vortexMax: 2,
        particleStyle: 'wisp',
        particleTint: [232, 242, 255]
    };
}

/**
 * Inicializa el sistema eólico único de un planeta.
 */
function initPlanetWind(planet, rng) {
    if (!planet) return;
    if (planet.wind && planet.wind.initialized) return;

    const prng = typeof rng === 'function' ? rng : Math.random;
    const arch = planet.archetype || {};
    const atmoDepth = Math.max(0, (planet.atmoRadius || 0) - (planet.radius || 0));
    const atmoDens = planet.atmoDensity !== undefined ? planet.atmoDensity : (arch.atmoDensity || 1.0);
    const profile = windGetBaseProfile(planet);

    // Mundos sin atmósfera suficiente o explícitamente de vacío -> 0 viento
    if (profile.regimeId === 'vacuum_none' || atmoDepth < 140 || atmoDens < 0.10 || (planet.sizeClass && planet.sizeClass.id === 'micro' && atmoDens < 0.22)) {
        planet.wind = {
            initialized: true,
            hasWind: false,
            regimeId: 'vacuum_none',
            regimeName: 'Sin Viento (Vacío)',
            desc: 'Sin atmósfera densa; calma total.',
            personalityLabel: 'Vacío absoluto',
            personalityMult: 0,
            dominantDir: 1,
            baseSpeed: 0,
            globalCoverage: 0,
            synopticPhase: 0,
            synopticSpeed: 0,
            jetAltFrac: 0.5,
            jetBoost: 0,
            cells: [],
            vortices: [],
            vortexSpawnTimer: 9999,
            profile
        };
        return;
    }

    // Personalidad procedural intra-categoría: hace que incluso dos planetas iguales tengan climas eólicos propios
    const sizeScale = planet.sizeClass
        ? (planet.sizeClass.id === 'dwarf' ? 0.62 : (planet.sizeClass.id === 'titan' ? 1.18 : (planet.sizeClass.id === 'colossal' ? 1.08 : 1.0)))
        : 1.0;

    const roll = prng();
    let personalityMult = 1.0;
    let personalityTag = 'Equilibrado';
    if (planet.isOrigin) {
        // Cuna del Éter: acogedora y realista (brisas suaves con calma en plataforma y frentes viajeros ocasionales)
        personalityMult = 0.85;
        personalityTag = 'Templado & Sereno';
    } else if (profile.regimeId === 'still_calm') {
        personalityMult = roll < 0.55 ? 0.35 : (roll < 0.88 ? 0.85 : 1.25);
        personalityTag = personalityMult < 0.5 ? 'Calma Casi Total' : 'Brisa Tenue';
    } else if (profile.regimeId === 'hyper_gale') {
        personalityMult = wxLerp(0.85, 1.35, prng());
        personalityTag = personalityMult > 1.18 ? 'Tormenta Eólica Extrema' : 'Vendaval Global';
    } else {
        if (roll < 0.22) {
            personalityMult = wxLerp(0.28, 0.55, prng());
            personalityTag = 'Inusualmente Calmo';
        } else if (roll < 0.82) {
            personalityMult = wxLerp(0.80, 1.18, prng());
            personalityTag = 'Variable Natural';
        } else {
            personalityMult = wxLerp(1.32, 1.72, prng());
            personalityTag = 'Propenso a Ráfagas';
        }
    }

    const densFactor = wxClamp(0.45 + atmoDens * 0.55, 0.35, 1.45);
    const dominantDir = prng() < 0.48 ? 1 : -1;
    const baseSpeed = wxLerp(profile.baseSpeed[0], profile.baseSpeed[1], prng()) * personalityMult * sizeScale * densFactor;

    // Cobertura global vs parches localizados de viento
    const globalCoverage = profile.regimeId === 'hyper_gale'
        ? wxLerp(0.78, 1.0, prng())
        : (profile.regimeId === 'still_calm'
            ? wxLerp(0.12, 0.35, prng())
            : wxLerp(0.32, 0.78, prng()));

    const windState = {
        initialized: true,
        hasWind: true,
        regimeId: profile.regimeId,
        regimeName: profile.name,
        desc: profile.desc,
        personalityLabel: personalityTag,
        personalityMult,
        sizeScale,
        densFactor,
        dominantDir,
        baseSpeed,
        globalCoverage,
        synopticPhase: prng() * Math.PI * 2,
        synopticSpeed: (0.04 + prng() * 0.06) * dominantDir,
        synopticWaveCount: 2 + Math.floor(prng() * 3),
        jetAltFrac: profile.jetAltFrac || 0.40,
        jetBoost: (profile.jetBoost || 45) * personalityMult * sizeScale,
        jetDir: prng() < 0.28 ? -dominantDir : dominantDir,
        cells: [],
        vortices: [],
        vortexSpawnTimer: 14 + prng() * 24,
        profile
    };

    planet.wind = windState;

    // Poblar celdas móviles iniciales (desfasadas en su ciclo de vida)
    const cMin = (profile.cellCount && profile.cellCount[0]) || 2;
    const cMax = (profile.cellCount && profile.cellCount[1]) || 5;
    const targetCells = Math.max(1, Math.round(wxLerp(cMin, cMax, prng()) * Math.sqrt(Math.max(0.5, planet.radius / 2600))));
    const clampedCells = Math.min(10, targetCells);

    for (let i = 0; i < clampedCells; i++) {
        const cell = createWindCell(planet, prng, true);
        if (cell) windState.cells.push(cell);
    }

    // Posibilidad inicial de un vórtice maduro en planetas propensos (nunca sobre la plataforma de origen)
    const vChance = (profile.vortexChance || 0) * (personalityMult > 0.65 ? 1.0 : 0.35);
    if (!planet.isOrigin && profile.vortexTypes && profile.vortexTypes.length > 0 && prng() < vChance * 0.85) {
        const v = createWindVortex(planet, prng, true);
        if (v) windState.vortices.push(v);
    }
}

function createWindCell(planet, rng, staggerLife = false) {
    const w = planet.wind;
    if (!w || !w.hasWind) return null;
    const prng = typeof rng === 'function' ? rng : Math.random;
    const profile = w.profile;

    const spanBase = wxLerp(0.18, 0.58, prng());
    const radiusScale = wxClamp(2800 / Math.max(900, planet.radius), 0.25, 1.35);
    const angularSpan = wxClamp(spanBase * Math.sqrt(radiusScale), 0.12, 0.78);

    const durRange = profile.cellDuration || [32, 68];
    const maxLife = wxLerp(durRange[0], durRange[1], prng());
    const life = staggerLife ? maxLife * wxLerp(0.20, 0.90, prng()) : maxLife;

    const gustRange = profile.gustAmp || [18, 80];
    // Distribución sesgada: la mayoría de las celdas son brisas suaves, solo algunas aisladas son intensas
    const intensityRoll = prng();
    const rarityBoost = intensityRoll > 0.84 ? wxLerp(1.25, 1.75, prng()) : (intensityRoll < (profile.calmBias || 0.35) ? 0.28 : 0.78);
    const peakSpeed = wxLerp(gustRange[0], gustRange[1], prng()) * rarityBoost * w.personalityMult * w.densFactor;

    const angVelRange = profile.cellAngVel || [0.004, 0.012];
    const speedRadiusFactor = wxClamp(2800 / Math.max(1200, planet.radius), 0.22, 1.4);
    const dir = prng() < 0.76 ? w.dominantDir : -w.dominantDir;
    const angVel = wxLerp(angVelRange[0], angVelRange[1], prng()) * speedRadiusFactor * dir;

    let angle = prng() * Math.PI * 2 - Math.PI;
    // En Cuna del Éter al iniciar, despejar la zona inmediata de lanzamiento (-PI/2) de ráfagas fuertes
    if (planet.isOrigin && staggerLife && peakSpeed > 65) {
        if (Math.abs(wxWrapAngle(angle + Math.PI * 0.5)) < 0.32) {
            angle = wxWrapAngle(angle + 0.65);
        }
    }

    const isJetPocket = prng() < 0.28;
    const altMinFrac = isJetPocket ? wxLerp(0.20, 0.34, prng()) : 0.0;
    const altMaxFrac = isJetPocket ? wxLerp(0.46, 0.64, prng()) : wxLerp(0.24, 0.48, prng());

    return {
        angle,
        angularSpan,
        angVel,
        altMinFrac,
        altMaxFrac,
        peakSpeed,
        dir,
        updraftRatio: (prng() - 0.45) * 0.16,
        life,
        maxLife,
        fadeIn: Math.min(maxLife * 0.30, 8 + prng() * 8),
        fadeOut: Math.min(maxLife * 0.35, 10 + prng() * 10),
        phase: prng() * Math.PI * 2
    };
}

function pickVortexAngle(planet, kind, prng) {
    // Intentar alinear tornados/huracanes con frentes o nubes de tormenta si existen
    const wx = planet.weather;
    if (wx && wx.clouds && wx.clouds.length > 0 && (kind === 'tornado' || kind === 'hurricane' || kind === 'waterspout' || kind === 'cryo_vortex')) {
        const stormClouds = wx.clouds.filter(c => c.isStorm || c.morphKey === 'supercell_storm' || c.morphKey === 'cumulus_congestus');
        const pool = stormClouds.length > 0 ? stormClouds : wx.clouds;
        const cl = pool[Math.floor(prng() * pool.length)];
        if (cl) {
            return wxWrapAngle(cl.angle + (prng() - 0.5) * (cl.angularSpan * 0.5));
        }
    }

    // Tolvaneras y remolinos térmicos prefieren el lado diurno iluminado
    if ((kind === 'dust_devil' || kind === 'fire_whirl') && planet.lightAngle !== undefined && prng() < 0.78) {
        return wxWrapAngle(planet.lightAngle + (prng() - 0.5) * 1.6);
    }

    // En mundos Eyeball, priorizar el anillo del terminador
    if (planet.isEyeballWorld && planet.lightAngle !== undefined && prng() < 0.80) {
        const side = prng() < 0.5 ? 1 : -1;
        return wxWrapAngle(planet.lightAngle + side * (Math.PI * 0.5) + (prng() - 0.5) * 0.35);
    }

    return prng() * Math.PI * 2 - Math.PI;
}

function createWindVortex(planet, rng, staggerLife = false) {
    const w = planet.wind;
    if (!w || !w.hasWind) return null;
    const profile = w.profile;
    const types = profile.vortexTypes;
    if (!types || types.length === 0) return null;

    const prng = typeof rng === 'function' ? rng : Math.random;
    const kind = types[Math.floor(prng() * types.length)];
    const atmoDepth = Math.max(240, planet.atmoRadius - planet.radius);

    let angle = pickVortexAngle(planet, kind, prng);
    // Nunca generar un vórtice justo encima de la plataforma de inicio de Cuna del Éter
    if (planet.isOrigin && Math.abs(wxWrapAngle(angle + Math.PI * 0.5)) < 0.22) {
        angle = wxWrapAngle(angle + (prng() < 0.5 ? 0.45 : -0.45));
    }
    // Evitar aparecer encima de una base existente
    if (planet.bases && planet.bases.length > 0) {
        for (const b of planet.bases) {
            if (Math.abs(wxWrapAngle(angle - b.angle)) < 0.08) {
                angle = wxWrapAngle(angle + 0.16);
            }
        }
    }

    const isHurricane = kind === 'hurricane';
    const isDustDevil = kind === 'dust_devil';
    const isFireWhirl = kind === 'fire_whirl';

    const maxLife = isHurricane ? wxLerp(65, 130, prng()) : (isDustDevil ? wxLerp(26, 52, prng()) : wxLerp(36, 75, prng()));
    const life = staggerLife ? maxLife * wxLerp(0.35, 0.85, prng()) : maxLife;

    const radiusScale = wxClamp(planet.radius / 3200, 0.45, 2.2);
    const coreRadius = isHurricane
        ? wxLerp(135, 240, prng()) * Math.sqrt(radiusScale)
        : (isDustDevil ? wxLerp(24, 42, prng()) : wxLerp(38, 72, prng()));
    const outerRadius = isHurricane
        ? coreRadius * wxLerp(4.2, 6.2, prng())
        : coreRadius * wxLerp(3.0, 4.4, prng());
    const altHeight = isHurricane
        ? Math.min(atmoDepth * 0.34, wxLerp(420, 920, prng()))
        : (isDustDevil ? Math.min(atmoDepth * 0.16, wxLerp(190, 340, prng())) : Math.min(atmoDepth * 0.24, wxLerp(280, 560, prng())));

    const baseTang = isHurricane
        ? wxLerp(195, 340, prng())
        : (isDustDevil ? wxLerp(105, 175, prng()) : (isFireWhirl ? wxLerp(155, 260, prng()) : wxLerp(180, 315, prng())));

    const peakTangSpeed = baseTang * wxClamp(0.75 + w.personalityMult * 0.25, 0.65, 1.45);
    const updraftSpeed = isHurricane
        ? peakTangSpeed * 0.32
        : (isDustDevil ? peakTangSpeed * 0.45 : peakTangSpeed * 0.62);

    const angVel = (wxLerp(12, 34, prng()) * w.dominantDir) / Math.max(900, planet.radius);

    // Partículas visuales propias del vórtice (delicadas, pocas, eficientes)
    const swirlCount = isHurricane ? 26 : 18;
    const swirlParticles = [];
    for (let i = 0; i < swirlCount; i++) {
        swirlParticles.push({
            hFrac: prng(),
            phase: prng() * Math.PI * 2,
            radialMult: 0.45 + prng() * 0.85,
            speedMult: 0.75 + prng() * 0.55,
            size: isHurricane ? (1.4 + prng() * 1.6) : (1.1 + prng() * 1.4)
        });
    }

    const labelMap = {
        tornado: 'Tornado Mesociclónico',
        dust_devil: 'Tolvanera de Polvo',
        fire_whirl: 'Remolino Ígneo',
        cryo_vortex: 'Vórtice Criogénico',
        waterspout: 'Tromba Marina',
        hurricane: 'Huracán Planetario'
    };

    return {
        id: Math.floor(prng() * 1e6),
        kind,
        label: labelMap[kind] || 'Vórtice Atmosférico',
        isHurricane,
        angle,
        angVel,
        coreRadius,
        outerRadius,
        eyeRadius: isHurricane ? coreRadius * 0.78 : coreRadius * 0.22,
        altHeight,
        peakTangSpeed,
        updraftSpeed,
        spinDir: prng() < 0.5 ? 1 : -1,
        spinRate: isHurricane ? 1.8 : 4.2,
        life,
        maxLife,
        fadeIn: Math.min(maxLife * 0.22, 9.0),
        fadeOut: Math.min(maxLife * 0.26, 11.0),
        envelope: staggerLife ? 0.9 : 0.02,
        seed: prng() * 1000,
        swirlParticles
    };
}

/**
 * Actualiza celdas de viento, vórtices y partículas eólicas delicadas.
 */
function updatePlanetWind(planet, dt, shipObj, cosmosSimTime) {
    if (!planet) return;
    if (!planet.wind) initPlanetWind(planet);
    const w = planet.wind;
    if (!w || !w.hasWind) return;

    const wx = planet.weather;
    const stormBoost = wx ? (wx.stormIntensity || 0) : 0;

    // 1. Circulación sinóptica global lenta
    w.synopticPhase += w.synopticSpeed * dt;

    // 2. Celdas móviles de viento (nacen, se intensifican, viajan y decrecen)
    for (let i = w.cells.length - 1; i >= 0; i--) {
        const c = w.cells[i];
        c.angle = wxWrapAngle(c.angle + c.angVel * (1 + stormBoost * 0.35) * dt);
        c.life -= dt;
        if (c.life <= 0) {
            w.cells.splice(i, 1);
        }
    }

    const cMin = (w.profile.cellCount && w.profile.cellCount[0]) || 2;
    const cMax = (w.profile.cellCount && w.profile.cellCount[1]) || 5;
    const desiredCells = Math.max(1, Math.min(10, Math.round(((cMin + cMax) * 0.5 + stormBoost * 2.0) * Math.sqrt(Math.max(0.5, planet.radius / 2600)))));
    if (w.cells.length < desiredCells && Math.random() < 0.16) {
        const nc = createWindCell(planet, Math.random, false);
        if (nc) w.cells.push(nc);
    }

    // 3. Vórtices (Tornados, Tolvaneras, Remolinos de Fuego/Hielo, Huracanes)
    for (let i = w.vortices.length - 1; i >= 0; i--) {
        const v = w.vortices[i];
        v.angle = wxWrapAngle(v.angle + v.angVel * dt);
        v.life -= dt;
        const age = v.maxLife - v.life;
        v.envelope = wxSmoothstep(0, v.fadeIn, age) * wxSmoothstep(0, v.fadeOut, v.life);

        for (const sp of v.swirlParticles) {
            sp.phase += dt * v.spinRate * sp.speedMult * v.spinDir;
            sp.hFrac += dt * (v.isHurricane ? 0.14 : 0.34) * sp.speedMult;
            if (sp.hFrac > 1.0) sp.hFrac -= 1.0;
        }

        if (v.life <= 0) {
            w.vortices.splice(i, 1);
        }
    }

    const vMax = w.profile.vortexMax || 0;
    const effectiveVChance = (w.profile.vortexChance || 0) * (0.45 + stormBoost * 1.15);
    if (vMax > 0 && w.vortices.length < vMax) {
        w.vortexSpawnTimer -= dt * (1 + stormBoost * 1.5);
        if (w.vortexSpawnTimer <= 0) {
            w.vortexSpawnTimer = 18 + Math.random() * 28;
            if (Math.random() < effectiveVChance) {
                const nv = createWindVortex(planet, Math.random, false);
                if (nv) w.vortices.push(nv);
            }
        }
    }

    // 4. Partículas delicadas cerca del planeta activo
    if (shipObj && shipObj.nearestPlanet === planet) {
        updatePlanetWindParticles(planet, dt, shipObj, cosmosSimTime);
    }
}

/**
 * Muestrea el vector de viento local exacto en (worldX, worldY) sobre un planeta.
 * Combina circulación base, ondas sinópticas, perfil de altitud (capa límite + jetstream),
 * modulación orográfica/regional, tormentas locales, celdas viajeras y vórtices.
 */
function samplePlanetWind(planet, worldX, worldY) {
    const empty = {
        hasWind: false,
        speed: 0,
        vx: 0,
        vy: 0,
        tangSpeed: 0,
        radSpeed: 0,
        gustFactor: 0,
        turbulence: 0,
        inVortex: false,
        vortexIntensity: 0,
        vortexKind: null,
        vortexName: null,
        inHurricaneEye: false,
        regimeId: 'vacuum_none',
        label: 'Sin viento'
    };

    if (!planet) return empty;
    if (!planet.wind) initPlanetWind(planet);
    const w = planet.wind;
    if (!w || !w.hasWind) return empty;

    const dx = worldX - planet.x;
    const dy = worldY - planet.y;
    const r = Math.hypot(dx, dy);
    if (r < 10) return empty;

    const atmoDepth = Math.max(120, planet.atmoRadius - planet.radius);
    const ang = Math.atan2(dy, dx);
    const surfR = (typeof getSurfaceRadius === 'function' && planet.heights && planet.heights.length > 0)
        ? getSurfaceRadius(planet, ang)
        : planet.radius;

    // Microclima protegido dentro de cavernas de mundos huecos
    if (planet.isHollow && typeof isShipInsideCavern === 'function' && isShipInsideCavern(planet, worldX, worldY)) {
        const radX = dx / r;
        const radY = dy / r;
        const tangX = -radY;
        const tangY = radX;
        const isThermal = planet.hollowPhysicsMode === 'thermal_forge';
        const cavTang = isThermal ? Math.sin(ang * 4 + w.synopticPhase) * 14 : Math.sin(ang * 3 + w.synopticPhase) * 4;
        const cavRad = isThermal ? 16 : 0;
        const cavSpd = Math.hypot(cavTang, cavRad);
        return {
            hasWind: cavSpd > 2,
            speed: cavSpd,
            vx: tangX * cavTang + radX * cavRad,
            vy: tangY * cavTang + radY * cavRad,
            tangSpeed: cavTang,
            radSpeed: cavRad,
            gustFactor: 0,
            turbulence: 0.05,
            inVortex: false,
            vortexIntensity: 0,
            vortexKind: null,
            vortexName: null,
            inHurricaneEye: false,
            regimeId: 'hollow_sheltered',
            label: isThermal ? 'Corriente Térmica Interna' : 'Aire Cavernoso Protegido'
        };
    }

    const alt = Math.max(0, r - surfR);
    const atmoFrac = alt / atmoDepth;
    // Por encima de la línea de Kármán (68% de atmoDepth), el viento se desvanece suavemente al vacío
    if (atmoFrac >= 0.68) return empty;

    const karmanFade = atmoFrac > 0.50 ? wxSmoothstep(0.68, 0.50, atmoFrac) : 1.0;
    const radX = dx / r;
    const radY = dy / r;
    const tangX = -radY;
    const tangY = radX;

    // 1. Capa límite superficial y corriente en chorro de altura (Jetstream)
    const boundaryLayer = wxLerp(0.58, 1.0, wxSmoothstep(0, 75, alt));
    const jetCenter = w.jetAltFrac || 0.40;
    const jetBell = Math.exp(-Math.pow((atmoFrac - jetCenter) / 0.14, 2));

    // 2. Onda sinóptica planetaria (varía según posición angular y tiempo)
    const wave1 = Math.sin(ang * (w.synopticWaveCount || 2) - w.synopticPhase);
    const wave2 = Math.cos(ang * ((w.synopticWaveCount || 2) + 1) + w.synopticPhase * 0.7);
    const synopticNorm = 0.5 + 0.35 * wave1 + 0.15 * wave2; // ~0..1

    // Zonas de calma vs zonas ventosas según globalCoverage del planeta
    const calmThreshold = 1.0 - w.globalCoverage;
    const synopticGain = w.regimeId === 'hyper_gale'
        ? (0.65 + 0.55 * synopticNorm)
        : wxSmoothstep(calmThreshold * 0.85, calmThreshold * 0.85 + 0.42, synopticNorm);

    // En mundos Eyeball, pico en el anillo terminador (crepuscular)
    let eyeballMult = 1.0;
    if (planet.isEyeballWorld && planet.lightAngle !== undefined) {
        const sunDot = Math.cos(ang - planet.lightAngle);
        const termBelt = Math.exp(-Math.pow(sunDot / 0.34, 2));
        eyeballMult = 0.32 + termBelt * 1.45;
    }

    // 3. Modulación regional / orográfica
    let regionMult = 1.0;
    let orographicRad = 0;
    if (typeof getPlanetRegionAtAngle === 'function' && planet.regions && planet.regions.length > 0) {
        const reg = getPlanetRegionAtAngle(planet, ang);
        const rId = reg && reg.def ? reg.def.id : null;
        if (rId === 'landing_plains' || rId === 'zen_flats' || rId === 'archipelago_basin') {
            regionMult = 0.65;
        } else if (rId === 'impact_crater' || rId === 'hollow_maw') {
            regionMult = alt < 110 ? 0.52 : 0.92;
        } else if (rId === 'colossal_peaks' || rId === 'alpine_spires' || rId === 'volcano_shield') {
            regionMult = 1.32;
            orographicRad = 8 * boundaryLayer;
        } else if (rId === 'rift_chasm' || rId === 'terraced_canyon') {
            regionMult = 1.24;
        } else if (rId === 'dune_sea') {
            regionMult = 1.22;
        } else if (rId === 'volcanic_caldera' || rId === 'geyser_field') {
            regionMult = 1.12;
            orographicRad = 18 * wxSmoothstep(220, 20, alt);
        }
    }

    // En Cuna del Éter, mantener una ligera protección suave en la zona de despegue si no hay tormenta
    let originPadShelter = 1.0;
    if (planet.isOrigin && alt < 180) {
        const padAngDist = Math.abs(wxWrapAngle(ang + Math.PI * 0.5));
        if (padAngDist < 0.14) {
            originPadShelter = wxLerp(0.45, 1.0, padAngDist / 0.14);
        }
    }

    let tangSpeed = (w.baseSpeed * synopticGain * boundaryLayer * regionMult * eyeballMult * originPadShelter) * w.dominantDir;
    tangSpeed += w.jetBoost * jetBell * w.jetDir * (0.45 + 0.55 * synopticNorm);
    let radSpeed = orographicRad;

    // 4. Intensificación por Tormentas Globales/Locales
    const wx = planet.weather;
    const stormInt = wx ? (wx.stormIntensity || 0) : 0;
    let localCloudStorm = 0;
    if (wx && wx.hasClouds && wx.clouds && wx.clouds.length > 0 && atmoFrac < 0.36) {
        for (let i = 0; i < wx.clouds.length; i++) {
            const cl = wx.clouds[i];
            if (!cl || cl.growth <= 0.05) continue;
            if (!cl.isStorm && cl.morphKey !== 'supercell_storm' && cl.morphKey !== 'cumulus_congestus') continue;
            const dAng = Math.abs(wxWrapAngle(ang - cl.angle));
            const span = (cl.angularSpan || 0.15) * 0.75;
            if (dAng < span) {
                const cw = wxSmoothstep(span, 0, dAng) * cl.growth * (cl.isStorm ? 1.0 : 0.45);
                if (cw > localCloudStorm) localCloudStorm = cw;
            }
        }
    }
    const stormFactor = wxClamp(stormInt * 0.70 + localCloudStorm * 0.85, 0, 1.45);
    if (stormFactor > 0.05) {
        tangSpeed *= (1 + stormFactor * 0.55);
        // Ráfagas descendentes / convergentes de tormenta
        radSpeed -= stormFactor * 14 * wxSmoothstep(0.28, 0.02, atmoFrac);
    }

    // 5. Celdas Móviles de Ráfagas
    let gustAccum = 0;
    for (let i = 0; i < w.cells.length; i++) {
        const c = w.cells[i];
        const dAng = Math.abs(wxWrapAngle(ang - c.angle));
        if (dAng >= c.angularSpan) continue;
        if (atmoFrac < c.altMinFrac - 0.08 || atmoFrac > c.altMaxFrac + 0.08) continue;

        const age = c.maxLife - c.life;
        const lifeEnv = wxSmoothstep(0, c.fadeIn, age) * wxSmoothstep(0, c.fadeOut, c.life);
        const angEnv = Math.pow(wxSmoothstep(c.angularSpan, 0, dAng), 1.4);
        const altEnv = wxSmoothstep(c.altMinFrac - 0.08, c.altMinFrac + 0.04, atmoFrac) *
                       wxSmoothstep(c.altMaxFrac + 0.08, c.altMaxFrac - 0.04, atmoFrac);

        const cMag = c.peakSpeed * lifeEnv * angEnv * altEnv * (1 + stormFactor * 0.42);
        tangSpeed += cMag * c.dir;
        radSpeed += cMag * c.updraftRatio;
        gustAccum += Math.abs(cMag);
    }

    // 6. Vórtices: Tornados, Tolvaneras, Remolinos y Huracanes
    let inVortex = false;
    let vortexIntensity = 0;
    let vortexKind = null;
    let vortexName = null;
    let inHurricaneEye = false;
    let turbulence = stormFactor * 0.25;

    for (let i = 0; i < w.vortices.length; i++) {
        const v = w.vortices[i];
        if (v.envelope <= 0.02) continue;

        const dAng = wxWrapAngle(ang - v.angle);
        const arcDist = dAng * surfR;
        const absArc = Math.abs(arcDist);
        if (absArc > v.outerRadius * 1.15) continue;

        const hFrac = alt / Math.max(80, v.altHeight);
        if (hFrac > 1.25) continue;

        const vAltEnv = wxSmoothstep(1.25, 0.72, hFrac);

        if (v.isHurricane) {
            // Estructura de Huracán: ojo calmo + pared intensa + bandas espirales exteriores
            const eyeR = v.eyeRadius;
            const wallR = v.coreRadius * 1.55;
            if (absArc < eyeR * 0.75) {
                // Dentro del ojo del huracán: notable calma relativa
                const eyeCalm = wxSmoothstep(0, eyeR * 0.75, absArc);
                tangSpeed *= (0.18 + 0.35 * eyeCalm);
                inVortex = true;
                inHurricaneEye = true;
                vortexIntensity = Math.max(vortexIntensity, 0.25 * v.envelope);
                vortexKind = v.kind;
                vortexName = `Ojo del ${v.label}`;
            } else {
                const wallEnv = absArc < wallR
                    ? wxSmoothstep(eyeR * 0.65, wallR, absArc)
                    : Math.exp(-Math.pow((absArc - wallR) / Math.max(120, v.outerRadius - wallR), 2) * 2.2);
                const strength = v.envelope * vAltEnv * wallEnv;
                if (strength > 0.02) {
                    const sideSign = arcDist >= 0 ? 1 : -1;
                    // En vista 2D lateral, un lado de la pared empuja en una dirección y el otro opuesto + corriente ascendente en la pared
                    const swirlSign = Math.cos(hFrac * 2.0 + (w.synopticPhase * 1.5)) >= 0 ? 1 : -1;
                    tangSpeed += v.peakTangSpeed * strength * (sideSign * v.spinDir * 0.65 + swirlSign * 0.35);
                    radSpeed += v.updraftSpeed * strength;
                    inVortex = true;
                    vortexIntensity = Math.max(vortexIntensity, strength);
                    vortexKind = v.kind;
                    vortexName = v.label;
                    turbulence = Math.max(turbulence, strength * 0.75);
                }
            }
        } else {
            // Tornado / Tolvanera / Remolino de Fuego / Crio-Vórtice / Tromba
            const u = absArc / Math.max(25, v.outerRadius);
            const radialEnv = Math.exp(-u * u * 2.4);
            const strength = v.envelope * vAltEnv * radialEnv;
            if (strength > 0.02) {
                const timePhase = (typeof cosmosSimTime !== 'undefined' ? cosmosSimTime : performance.now() * 0.001) * v.spinRate;
                const whipOsc = Math.sin(timePhase + hFrac * 3.8 + v.seed);
                // Succión convergente hacia el eje cerca del suelo + oscilación rotacional + fuerte corriente ascendente
                const inflow = (hFrac < 0.35 ? -Math.sign(arcDist) * (1 - hFrac / 0.35) * 0.55 : 0.25);
                tangSpeed += v.peakTangSpeed * strength * (whipOsc * 0.85 + inflow);
                radSpeed += v.updraftSpeed * strength;
                inVortex = true;
                vortexIntensity = Math.max(vortexIntensity, strength);
                vortexKind = v.kind;
                vortexName = v.label;
                turbulence = Math.max(turbulence, strength);
            }
        }
    }

    tangSpeed *= karmanFade;
    radSpeed *= karmanFade;

    const vx = tangX * tangSpeed + radX * radSpeed;
    const vy = tangY * tangSpeed + radY * radSpeed;
    const speed = Math.hypot(vx, vy);

    let label = 'Calma';
    if (inHurricaneEye) label = vortexName || 'Ojo del Huracán';
    else if (inVortex && vortexIntensity > 0.30) label = vortexName || 'Vórtice Activo';
    else if (speed > 180) label = 'Vendaval Severo';
    else if (speed > 105) label = 'Ráfaga Fuerte';
    else if (speed > 55) label = 'Brisa Viva';
    else if (speed > 16) label = 'Brisa Suave';

    return {
        hasWind: true,
        speed,
        vx,
        vy,
        tangSpeed,
        radSpeed,
        gustFactor: wxClamp(gustAccum / 90, 0, 2),
        turbulence,
        inVortex,
        vortexIntensity,
        vortexKind,
        vortexName,
        inHurricaneEye,
        regimeId: w.regimeId,
        label
    };
}

/**
 * Actualiza partículas eólicas ultra-delicadas en espacio mundial alrededor de la cámara.
 */
function updatePlanetWindParticles(planet, dt, shipObj, cosmosSimTime) {
    if (!planet || !planet.wind || !planet.wind.hasWind) {
        WIND_LOCAL_PARTICLES.length = 0;
        return;
    }

    if (_windParticlePlanetKey !== planet.key) {
        WIND_LOCAL_PARTICLES.length = 0;
        _windParticlePlanetKey = planet.key;
    }

    const camX = (typeof camera !== 'undefined' && camera) ? camera.x : shipObj.x;
    const camY = (typeof camera !== 'undefined' && camera) ? camera.y : shipObj.y;
    const camZoom = (typeof camera !== 'undefined' && camera && camera.zoom) ? camera.zoom : 1;

    // En zoom orbital lejano no saturar con motas microscópicas
    if (camZoom < 0.045) {
        WIND_LOCAL_PARTICLES.length = 0;
        return;
    }

    const distCam = Math.hypot(camX - planet.x, camY - planet.y);
    const atmoDepth = Math.max(120, planet.atmoRadius - planet.radius);
    if (distCam - planet.radius > atmoDepth * 0.65) {
        for (let i = WIND_LOCAL_PARTICLES.length - 1; i >= 0; i--) {
            WIND_LOCAL_PARTICLES[i].life -= dt * 2.0;
            if (WIND_LOCAL_PARTICLES[i].life <= 0) WIND_LOCAL_PARTICLES.splice(i, 1);
        }
        return;
    }

    const refWind = shipObj.localWind || samplePlanetWind(planet, camX, camY);
    const refSpd = refWind ? refWind.speed : 0;

    // Cantidad dinámica y discreta: 0 en calma absoluta, 4..10 en brisa, hasta 34 en vendaval/tormenta
    let targetCount = 0;
    if (refSpd > 10) {
        targetCount = Math.min(36, Math.max(3, Math.round(wxLerp(3, 34, wxClamp((refSpd - 10) / 180, 0, 1)))));
    }

    const viewW = ((typeof screenW !== 'undefined' ? screenW : 1200) / Math.max(0.25, camZoom)) * 1.15;
    const viewH = ((typeof screenH !== 'undefined' ? screenH : 800) / Math.max(0.25, camZoom)) * 1.15;

    let spawnAttempts = 0;
    while (WIND_LOCAL_PARTICLES.length < targetCount && spawnAttempts < 4) {
        spawnAttempts++;
        const px = camX + (Math.random() - 0.5) * viewW;
        const py = camY + (Math.random() - 0.5) * viewH;
        const pDist = Math.hypot(px - planet.x, py - planet.y);
        const pAng = Math.atan2(py - planet.y, px - planet.x);
        const surfR = (typeof getSurfaceRadius === 'function' && planet.heights && planet.heights.length > 0)
            ? getSurfaceRadius(planet, pAng)
            : planet.radius;
        if (pDist < surfR + 6 || pDist > planet.radius + atmoDepth * 0.62) continue;

        const pw = samplePlanetWind(planet, px, py);
        if (!pw.hasWind || pw.speed < 8) continue;

        const maxLife = 1.8 + Math.random() * 2.2;
        const isRibbon = pw.speed > 42 && Math.random() < wxClamp((pw.speed - 35) / 130, 0.15, 0.72);
        WIND_LOCAL_PARTICLES.push({
            x: px,
            y: py,
            vx: pw.vx,
            vy: pw.vy,
            life: maxLife,
            maxLife,
            isRibbon,
            size: isRibbon ? (1.0 + Math.random() * 0.5) : (0.9 + Math.random() * 1.1),
            alpha: (isRibbon ? 0.12 : 0.18) + Math.random() * 0.12,
            phase: Math.random() * Math.PI * 2,
            history: []
        });
    }

    const maxKeepDist = Math.max(viewW, viewH) * 0.85;
    for (let i = WIND_LOCAL_PARTICLES.length - 1; i >= 0; i--) {
        const pt = WIND_LOCAL_PARTICLES[i];
        const pw = samplePlanetWind(planet, pt.x, pt.y);
        if (pw.hasWind) {
            pt.vx = wxLerp(pt.vx, pw.vx, Math.min(1, dt * 6));
            pt.vy = wxLerp(pt.vy, pw.vy, Math.min(1, dt * 6));
        }

        // Leve ondulación orgánica para que las cintas parezcan aire fluido
        const wave = Math.sin((cosmosSimTime || 0) * 3.2 + pt.phase) * 8;
        const spd = Math.hypot(pt.vx, pt.vy) || 1;
        const perpX = -pt.vy / spd;
        const perpY = pt.vx / spd;

        pt.x += (pt.vx + perpX * wave) * dt;
        pt.y += (pt.vy + perpY * wave) * dt;

        if (pt.isRibbon) {
            pt.history.push({ x: pt.x, y: pt.y });
            if (pt.history.length > 7) pt.history.shift();
        }

        // Evitar atravesar el suelo
        const pDist = Math.hypot(pt.x - planet.x, pt.y - planet.y);
        const pAng = Math.atan2(pt.y - planet.y, pt.x - planet.x);
        const surfR = (typeof getSurfaceRadius === 'function' && planet.heights && planet.heights.length > 0)
            ? getSurfaceRadius(planet, pAng)
            : planet.radius;
        if (pDist < surfR + 3) {
            pt.x = planet.x + Math.cos(pAng) * (surfR + 4);
            pt.y = planet.y + Math.sin(pAng) * (surfR + 4);
        }

        pt.life -= dt;
        if (pt.life <= 0 || Math.hypot(pt.x - camX, pt.y - camY) > maxKeepDist) {
            WIND_LOCAL_PARTICLES.splice(i, 1);
        }
    }
}

/**
 * Renderizado delicado y translúcido de Tornados, Tolvaneras, Remolinos y Huracanes.
 */
function drawPlanetWindVortices(planet, timeSec) {
    const w = planet && planet.wind;
    if (!w || !w.hasWind || !w.vortices || w.vortices.length === 0) return;

    const camX = (typeof camera !== 'undefined' && camera) ? camera.x : 0;
    const camY = (typeof camera !== 'undefined' && camera) ? camera.y : 0;
    const camZoom = (typeof camera !== 'undefined' && camera && camera.zoom) ? camera.zoom : 1;
    const sW = (typeof screenW !== 'undefined') ? screenW : 1200;
    const sH = (typeof screenH !== 'undefined') ? screenH : 800;
    const viewLimit = (Math.max(sW, sH) / Math.max(0.15, camZoom)) + 1400;

    // Colores atmosféricos suaves según tipo de vórtice
    const styleColors = {
        tornado:     { core: [175, 192, 214], edge: [220, 232, 248], glow: null },
        waterspout:  { core: [165, 215, 245], edge: [225, 246, 255], glow: null },
        dust_devil:  { core: [214, 168, 118], edge: [242, 206, 162], glow: null },
        fire_whirl:  { core: [120, 72, 58],   edge: [255, 165, 80],  glow: [255, 120, 40] },
        cryo_vortex: { core: [195, 228, 252], edge: [240, 250, 255], glow: null },
        hurricane:   { core: [148, 174, 208], edge: [226, 238, 252], glow: null }
    };

    const nightFactor = (typeof ship !== 'undefined' && ship.currentSolarState && ship.nearestPlanet === planet)
        ? wxClamp(ship.currentSolarState.nightFactor, 0, 1)
        : 0;

    ctx.save();

    for (const v of w.vortices) {
        if (v.envelope <= 0.015) continue;

        const surfR = (typeof getSurfaceRadius === 'function' && planet.heights && planet.heights.length > 0)
            ? getSurfaceRadius(planet, v.angle)
            : planet.radius;
        const baseX = planet.x + Math.cos(v.angle) * surfR;
        const baseY = planet.y + Math.sin(v.angle) * surfR;
        if (Math.hypot(baseX - camX, baseY - camY) > viewLimit + v.outerRadius) continue;

        const pal = styleColors[v.kind] || styleColors.tornado;
        const cCol = wxLerpRGB(pal.core, [68, 80, 102], nightFactor * 0.55);
        const eCol = wxLerpRGB(pal.edge, [120, 138, 165], nightFactor * 0.55);

        ctx.save();
        ctx.translate(baseX, baseY);
        ctx.rotate(v.angle + Math.PI * 0.5); // +X = tangente, -Y = arriba (cenit)

        const env = v.envelope;

        if (v.isHurricane) {
            // --- HURACÁN: Bandas espirales translúcidas y pared nubosa alrededor de un ojo calmo ---
            const eyeR = v.eyeRadius;
            const wallR = v.outerRadius * 0.62;
            const hTop = v.altHeight;

            // Dos brazos de pared flanqueando el ojo
            for (const side of [-1, 1]) {
                const wallX = side * (eyeR + (wallR - eyeR) * 0.45);
                const bandW = (wallR - eyeR) * 0.85;
                const wallGrad = ctx.createRadialGradient(wallX, -hTop * 0.45, bandW * 0.15, wallX, -hTop * 0.45, Math.max(bandW, hTop * 0.65));
                wallGrad.addColorStop(0.0, `rgba(${cCol[0]}, ${cCol[1]}, ${cCol[2]}, ${0.22 * env})`);
                wallGrad.addColorStop(0.6, `rgba(${eCol[0]}, ${eCol[1]}, ${eCol[2]}, ${0.10 * env})`);
                wallGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
                ctx.fillStyle = wallGrad;
                ctx.beginPath();
                ctx.ellipse(wallX, -hTop * 0.45, bandW, hTop * 0.58, side * 0.12, 0, Math.PI * 2);
                ctx.fill();
            }

            // Bandas de viento delicadas girando en la pared del huracán
            ctx.lineCap = 'round';
            for (let b = 0; b < 8; b++) {
                const frac = (b / 8 + (timeSec * 0.18 * v.spinDir)) % 1;
                const normF = frac < 0 ? frac + 1 : frac;
                const yPos = -hTop * (0.10 + normF * 0.80);
                const span = eyeR * 1.15 + Math.sin(normF * Math.PI) * (v.outerRadius * 0.52);
                const sweep = Math.sin(timeSec * 2.2 + b * 1.7) * span * 0.65;
                const bAlpha = Math.sin(normF * Math.PI) * 0.14 * env;
                ctx.strokeStyle = `rgba(${eCol[0]}, ${eCol[1]}, ${eCol[2]}, ${bAlpha})`;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(-span * 0.75 + sweep * 0.2, yPos);
                ctx.quadraticCurveTo(sweep * 0.5, yPos - 14, span * 0.75 + sweep * 0.2, yPos);
                ctx.stroke();
            }
        } else {
            // --- TORNADO / TOLVANERA / REMOLINO ÍGNEO / VÓRTICE CRIOGÉNICO ---
            const hTop = v.altHeight;
            const steps = 14;

            // 1. Columna cónica translúcida orgánica con suave ondulación en S
            const leftPts = [];
            const rightPts = [];
            for (let s = 0; s <= steps; s++) {
                const hf = s / steps;
                const swayX = Math.sin(hf * 3.4 - timeSec * 2.8 * v.spinDir + v.seed) * v.coreRadius * (0.28 + hf * 0.35);
                const halfW = wxLerp(v.coreRadius * 0.32, v.coreRadius * 1.55, Math.pow(hf, 1.18));
                const py = -hf * hTop;
                leftPts.push({ x: swayX - halfW, y: py });
                rightPts.push({ x: swayX + halfW, y: py });
            }

            const colGrad = ctx.createLinearGradient(0, 0, 0, -hTop);
            colGrad.addColorStop(0.00, `rgba(${cCol[0]}, ${cCol[1]}, ${cCol[2]}, ${0.26 * env})`);
            colGrad.addColorStop(0.45, `rgba(${eCol[0]}, ${eCol[1]}, ${eCol[2]}, ${0.18 * env})`);
            colGrad.addColorStop(0.85, `rgba(${eCol[0]}, ${eCol[1]}, ${eCol[2]}, ${0.09 * env})`);
            colGrad.addColorStop(1.00, `rgba(${eCol[0]}, ${eCol[1]}, ${eCol[2]}, 0.0)`);

            ctx.fillStyle = colGrad;
            ctx.beginPath();
            ctx.moveTo(leftPts[0].x, leftPts[0].y);
            for (let s = 1; s <= steps; s++) ctx.lineTo(leftPts[s].x, leftPts[s].y);
            for (let s = steps; s >= 0; s--) ctx.lineTo(rightPts[s].x, rightPts[s].y);
            ctx.closePath();
            ctx.fill();

            // Resplandor térmico interior sutil en remolinos de fuego
            if (pal.glow) {
                const gCol = pal.glow;
                const glowGrad = ctx.createRadialGradient(0, -hTop * 0.16, 2, 0, -hTop * 0.25, v.coreRadius * 1.4);
                glowGrad.addColorStop(0, `rgba(${gCol[0]}, ${gCol[1]}, ${gCol[2]}, ${0.26 * env})`);
                glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(0, -hTop * 0.18, v.coreRadius * 1.4, 0, Math.PI * 2);
                ctx.fill();
            }

            // 2. Filamentos helicoidales ascendentes muy delicados
            ctx.lineCap = 'round';
            for (let f = 0; f < 5; f++) {
                const fPhase = (f / 5) * Math.PI * 2 + timeSec * v.spinRate * v.spinDir;
                ctx.strokeStyle = `rgba(${eCol[0]}, ${eCol[1]}, ${eCol[2]}, ${0.18 * env})`;
                ctx.lineWidth = 1.05;
                ctx.beginPath();
                for (let s = 0; s <= 12; s++) {
                    const hf = s / 12;
                    const swayX = Math.sin(hf * 3.4 - timeSec * 2.8 * v.spinDir + v.seed) * v.coreRadius * (0.28 + hf * 0.35);
                    const rad = wxLerp(v.coreRadius * 0.30, v.coreRadius * 1.35, Math.pow(hf, 1.15));
                    const rx = swayX + Math.sin(fPhase + hf * 7.5) * rad;
                    const ry = -hf * hTop;
                    if (s === 0) ctx.moveTo(rx, ry);
                    else ctx.lineTo(rx, ry);
                }
                ctx.stroke();
            }

            // 3. Halo suave de contacto con polvo/rocío en la superficie
            const baseDust = ctx.createRadialGradient(0, -6, 2, 0, -6, v.coreRadius * 1.9);
            baseDust.addColorStop(0.0, `rgba(${eCol[0]}, ${eCol[1]}, ${eCol[2]}, ${0.24 * env})`);
            baseDust.addColorStop(0.55, `rgba(${cCol[0]}, ${cCol[1]}, ${cCol[2]}, ${0.10 * env})`);
            baseDust.addColorStop(1.0, 'rgba(0,0,0,0)');
            ctx.fillStyle = baseDust;
            ctx.beginPath();
            ctx.ellipse(0, -6, v.coreRadius * 1.9, v.coreRadius * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4. Motas orbitales del vórtice
        for (const sp of v.swirlParticles) {
            const hf = sp.hFrac;
            const swayX = v.isHurricane
                ? 0
                : Math.sin(hf * 3.4 - timeSec * 2.8 * v.spinDir + v.seed) * v.coreRadius * (0.28 + hf * 0.35);
            const orbitR = v.isHurricane
                ? wxLerp(v.eyeRadius * 0.9, v.outerRadius * 0.65, hf) * sp.radialMult
                : wxLerp(v.coreRadius * 0.45, v.coreRadius * 1.65, hf) * sp.radialMult;
            const px = swayX + Math.cos(sp.phase) * orbitR;
            const py = -hf * v.altHeight + Math.sin(sp.phase) * (v.isHurricane ? 12 : 4);
            const pAlpha = Math.sin(hf * Math.PI) * 0.38 * env;
            if (pAlpha <= 0.02) continue;

            ctx.fillStyle = `rgba(${eCol[0]}, ${eCol[1]}, ${eCol[2]}, ${pAlpha})`;
            ctx.beginPath();
            ctx.arc(px, py, sp.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    ctx.restore();
}

/**
 * Renderiza partículas eólicas delicadas y cintas de brisa en espacio mundial.
 */
function drawPlanetWindParticles(nearbyPlanets, timeSec) {
    if (WIND_LOCAL_PARTICLES.length === 0) return;
    const pNear = (typeof ship !== 'undefined' && ship.nearestPlanet) ? ship.nearestPlanet : (nearbyPlanets && nearbyPlanets[0]);
    if (!pNear || !pNear.wind || !pNear.wind.hasWind) return;

    const tint = (pNear.wind.profile && pNear.wind.profile.particleTint) || [232, 242, 255];
    const nightFactor = (typeof ship !== 'undefined' && ship.currentSolarState)
        ? wxClamp(ship.currentSolarState.nightFactor, 0, 1)
        : 0;
    const col = wxLerpRGB(tint, [148, 168, 196], nightFactor * 0.65);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < WIND_LOCAL_PARTICLES.length; i++) {
        const pt = WIND_LOCAL_PARTICLES[i];
        const age = pt.maxLife - pt.life;
        const env = wxSmoothstep(0, 0.45, age) * wxSmoothstep(0, 0.55, pt.life);
        const a = pt.alpha * env * (1 - nightFactor * 0.45);
        if (a <= 0.008) continue;

        if (pt.isRibbon && pt.history && pt.history.length >= 2) {
            const first = pt.history[0];
            const last = pt.history[pt.history.length - 1];
            const grad = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
            grad.addColorStop(0.0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, 0)`);
            grad.addColorStop(0.5, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${a * 0.85})`);
            grad.addColorStop(1.0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${a * 0.35})`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = pt.size;
            ctx.beginPath();
            ctx.moveTo(first.x, first.y);
            for (let k = 1; k < pt.history.length; k++) {
                ctx.lineTo(pt.history[k].x, pt.history[k].y);
            }
            ctx.stroke();
        } else {
            ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${a})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}
