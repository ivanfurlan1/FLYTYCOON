/**
 * ÉTER — Generador Procedural Determinista de Universos, Galaxias y Planetas
 * Inspirado en la generación infinita y determinista de Minecraft:
 * - Semillas universales (Seeds) que garantizan mundos únicos e irrepetibles.
 * - Clasificación galáctica con distribución estadística de tamaños (extremos raros).
 * - Heterogeneidad regional en cada planeta (Cordilleras colosales, llanuras de aterrizaje,
 *   cuencas de impacto, fallas tectónicas y vórtices de anomalía en un mismo mundo).
 * - Mutación cromática y combinatoria infinita para que nunca se repitan.
 * - Metadatos geológicos, minerales y amenazas listos para exploración profunda.
 */

function hashString(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return function() {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}

function createRNG(seedInt) {
    let a = seedInt >>> 0;
    return function() {
        let t = (a += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}
function lerpRGB(c1, c2, t) {
    return [
        Math.round(lerp(c1[0], c2[0], t)),
        Math.round(lerp(c1[1], c2[1], t)),
        Math.round(lerp(c1[2], c2[2], t))
    ];
}
function rgbStr(c, a = 1) { return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`; }

function wrapAngle(a) {
    return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * Calcula el ángulo solar actual relativo al planeta según el tiempo cósmico y su velocidad de rotación.
 */
function getPlanetCurrentLightAngle(p, timeSec = 0) {
    if (!p) return -Math.PI * 0.35;
    const base = (p.baseSunAngle !== undefined) ? p.baseSunAngle : (p.lightAngle !== undefined ? p.lightAngle : -Math.PI * 0.35);
    const speed = p.rotationSpeed || 0;
    const phase = p.initialRotationPhase || 0;
    return wrapAngle(base + phase + speed * timeSec);
}

/**
 * Determina el estado solar del observador respecto a un cuerpo celeste:
 * Retorna factores continuos y orgánicos para Día, Crepúsculo (Atardecer/Amanecer) y Noche cerrada,
 * calculados con curvas C1-continuas (smoothstep y gaussianas) para eliminar cualquier arista o salto brusco.
 */
function getPlanetSolarState(p, obsX, obsY, timeSec = 0) {
    if (!p) return { sunDot: 1, dayFactor: 1, twilightFactor: 0, nightFactor: 0, phase: 'day', curLight: -Math.PI * 0.35 };
    const curLight = getPlanetCurrentLightAngle(p, timeSec);
    const angleToObs = Math.atan2(obsY - p.y, obsX - p.x);
    // Producto escalar entre la normal al terreno (cenit local) y el vector hacia el sol
    const sunDot = Math.cos(angleToObs - curLight);
    
    // Curva gaussiana continua y amplia para el resplandor crepuscular en el terminador (horizonte solar, sunDot = 0)
    const twilightFactor = Math.exp(-Math.pow(sunDot / 0.26, 2));

    // Transiciones de hermite (smoothstep) orgánicas sin límites exactos:
    // El día se extiende suavemente desde el cenit hasta cruzar el horizonte
    const dayRaw = smoothstep(-0.18, 0.35, sunDot);
    const dayFactor = dayRaw * (1.0 - twilightFactor * 0.45);

    // La noche se adueña del hemisferio opuesto con suavidad analógica
    const nightRaw = smoothstep(0.18, -0.35, sunDot);
    const nightFactor = nightRaw * (1.0 - twilightFactor * 0.45);
    
    let phase = 'day';
    if (twilightFactor > 0.40) {
        const angDiff = wrapAngle(angleToObs - curLight);
        const isSunrise = (p.rotationSpeed >= 0) ? (angDiff < 0) : (angDiff > 0);
        phase = isSunrise ? 'sunrise' : 'sunset';
    } else if (sunDot < -0.15) {
        phase = 'night';
    }
    return { sunDot, dayFactor, twilightFactor, nightFactor, phase, curLight };
}

function hashCoord(x, y, seed) {
    let h = (seed ^ (x * 374761393) ^ (y * 668265263)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smoothNoise2D(x, y, seed) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const n00 = hashCoord(xi, yi, seed);
    const n10 = hashCoord(xi + 1, yi, seed);
    const n01 = hashCoord(xi, yi + 1, seed);
    const n11 = hashCoord(xi + 1, yi + 1, seed);
    const nx0 = lerp(n00, n10, sx);
    const nx1 = lerp(n01, n11, sx);
    return lerp(nx0, nx1, sy);
}

let universeSeed = 'ASTRAL-7';
let sectors = new Map();
let codexPlanets = new Map();

// Generador de nombres astronómicos procedurables
const STAR_PREFIXES = [
    'Aethel', 'Vesper', 'Zephyr', 'Kalyx', 'Nox', 'Hyperion', 'Astraea', 'Vaelin',
    'Ophiuchus', 'Lyra', 'Thalassa', 'Sol-Aeterna', 'Caelum', 'Cronos', 'Orion',
    'Elysium', 'Aurelia', 'Nadir', 'Pyros', 'Glacies', 'Boreas', 'Australis',
    'Nemesis', 'Zenith', 'Altair', 'Cygnus', 'Vortex', 'Alkaid', 'Draconis', 'Antares'
];
const GREEK_SUFFIXES = [
    'Prime', 'Secundus', 'Major', 'Minor', 'Alpha', 'Beta', 'Gamma', 'Delta',
    'Epsilon', 'Zeta', 'Borealis', 'Australis', 'Nexus', 'Corona', 'Apex'
];

/**
 * Selecciona una clase de tamaño usando distribución ponderada
 * (Los extremos como Micro-Planetoides o Titanes son infrecuentes)
 */
function pickSizeClass(rng) {
    const totalWeight = SIZE_CLASSES.reduce((acc, c) => acc + c.weight, 0);
    let r = rng() * totalWeight;
    for (const sc of SIZE_CLASSES) {
        if (r < sc.weight) return sc;
        r -= sc.weight;
    }
    return SIZE_CLASSES[2]; // 'standard' fallback
}

/**
 * Aplica una mutación cromática determinista a una paleta RGB
 * para garantizar combinatoria visual inagotable
 */
function mutateColor(rgb, hueFactor, brightFactor) {
    return [
        clamp(Math.round(rgb[0] * brightFactor * (1 + (hueFactor - 0.5) * 0.28)), 5, 255),
        clamp(Math.round(rgb[1] * brightFactor * (1 - (hueFactor - 0.5) * 0.22)), 5, 255),
        clamp(Math.round(rgb[2] * brightFactor * (1 + (hueFactor - 0.5) * 0.35)), 5, 255)
    ];
}

/**
 * Genera el conjunto de sectores y planetas en una coordenada (sx, sy).
 * Permite sistemas binarios (Planeta principal + Luna/Planetoide enano cercano).
 */
function getSectorPlanets(sx, sy) {
    const key = `${sx},${sy}`;
    if (sectors.has(key)) return sectors.get(key) || [];

    const isOrigin = (sx === 0 && sy === 0);
    const seedHash = hashString(`${universeSeed}:${key}`);
    const rng = createRNG(seedHash());

    const seedInt = hashString(universeSeed)() >>> 0;
    const galacticDensity = smoothNoise2D(sx * 0.28, sy * 0.28, seedInt);

    // Probabilidad de existencia condicionada por la densidad galáctica (el anillo cercano 3x3 siempre tiene mundos)
    const isInnerRing = (Math.abs(sx) <= 1 && Math.abs(sy) <= 1);
    if (!isOrigin && !isInnerRing && (rng() > 0.65 && galacticDensity < 0.45)) {
        sectors.set(key, null);
        return [];
    }

    const planets = [];

    // --- 1. PLANETA PRIMARIO DEL SECTOR ---
    const primaryPlanet = generateCelestialBody({
        sx, sy,
        subIndex: 0,
        isOrigin,
        isMoonlet: false,
        rng,
        seedHash: seedHash(),
        parentPos: null
    });
    planets.push(primaryPlanet);

    // --- 2. POSIBLE CUERPO SECUNDARIO / LUNA / ASTEROIDE SATÉLITE ---
    // En zonas densas o alrededor de mundos masivos, se forman lunas o asteroides capturados
    if (!isOrigin && rng() < 0.32 && galacticDensity > 0.44) {
        const moonlet = generateCelestialBody({
            sx, sy,
            subIndex: 1,
            isOrigin: false,
            isMoonlet: true,
            rng,
            seedHash: seedHash(),
            parentPos: { x: primaryPlanet.x, y: primaryPlanet.y, radius: primaryPlanet.radius, hasRings: primaryPlanet.hasRings }
        });
        planets.push(moonlet);

        // Segunda luna o asteroide menor en mundos colosales / titanes
        if ((primaryPlanet.sizeClass.id === 'colossal' || primaryPlanet.sizeClass.id === 'titan') && rng() < 0.42) {
            const outerMoon = generateCelestialBody({
                sx, sy,
                subIndex: 2,
                isOrigin: false,
                isMoonlet: true,
                rng,
                seedHash: seedHash() ^ 0x9e3779b9,
                parentPos: {
                    x: primaryPlanet.x,
                    y: primaryPlanet.y,
                    radius: Math.max(primaryPlanet.radius, Math.hypot(moonlet.x - primaryPlanet.x, moonlet.y - primaryPlanet.y) + moonlet.radius * 2),
                    hasRings: false
                }
            });
            planets.push(outerMoon);
        }
    }

    sectors.set(key, planets);
    for (const p of planets) {
        if (isOrigin || p.isOrigin) registerCodex(p);
    }
    return planets;
}

/**
 * Genera un cuerpo celeste completo (arquetipo, tamaño, topografía heterogénea, biomas regionales)
 */
function generateCelestialBody({ sx, sy, subIndex, isOrigin, isMoonlet, rng, seedHash, parentPos }) {
    const bodyRNG = createRNG(seedHash ^ (subIndex * 9973));

    // Selección de Arquetipo
    let archetype;
    const ring1ShowcasePool = {
        '1,0':  ['hollow_inverted_world', 'hollow_crystal_geode', 'hollow_sanctuary', 'hollow_abyssal_ocean'],
        '-1,0': ['shattered_archipelago', 'levitating_bastion', 'ring_shepherd_shards'],
        '0,1':  ['living_mycelia', 'coral_leviathan', 'leviathan_hive'],
        '0,-1': ['megalithic_vault', 'clockwork_monolith'],
        '1,1':  ['active_comet', 'binary_shard', 'razor_comet_splinter'],
        '-1,1': ['micro_black_hole_remnant', 'magnetic_pulsar_core', 'anti_gravity_well'],
        '-1,-1':['dyson_shell_fragment', 'orbital_foundry', 'ringed_archive'],
        '1,-1': ['twilight_eyeball', 'diamond_rain_giant', 'chrono_storm_world']
    };
    const showcaseKey = (!isOrigin && !isMoonlet) ? `${sx},${sy}` : null;
    const showcaseChoices = showcaseKey ? ring1ShowcasePool[showcaseKey] : null;
    if (typeof window !== 'undefined' && window._forcePlanetArchetypeId) {
        archetype = ARCHETYPES.find(a => a.id === window._forcePlanetArchetypeId) || ARCHETYPES[0];
    } else if (isOrigin) {
        archetype = ARCHETYPES.find(a => a.id === 'terra') || ARCHETYPES[0];
    } else if (showcaseChoices && showcaseChoices.length > 0) {
        const pickId = showcaseChoices[Math.floor(bodyRNG() * showcaseChoices.length)];
        archetype = ARCHETYPES.find(a => a.id === pickId) || ARCHETYPES[0];
    } else if (isMoonlet) {
        // Los satélites suelen ser mundos menores, cometas binarios o anomalías de impacto
        const moonletArchetypes = ARCHETYPES.filter(a =>
            a.id === 'dwarf_planetoid' || a.id === 'proto_impact' || a.id === 'ferrum_core' || a.id === 'nitrogen_ice' || a.id === 'shattered_core' || a.id === 'binary_shard' || a.id === 'active_comet'
        );
        archetype = moonletArchetypes[Math.floor(bodyRNG() * moonletArchetypes.length)] || ARCHETYPES[0];
    } else {
        // Ponderación equilibrada para que los mundos huecos y raros sean descubribles sin monopolizar
        const classWeights = {
            hollow: 1.5, shattered: 1.4, living: 1.4, megalithic: 1.35, cometary: 1.3,
            gravitic: 1.3, artificial: 1.3, temporal: 1.3,
            anomaly: 1.2, volcanic: 1.1, oceanic: 1.0, crystalline: 1.05,
            terrestrial: 0.9, desert: 0.9, cryogenic: 0.95, toxic: 0.9
        };
        let totalW = 0;
        for (const a of ARCHETYPES) totalW += (classWeights[a.classId] || 1.0);
        let roll = bodyRNG() * totalW;
        archetype = ARCHETYPES[0];
        for (const a of ARCHETYPES) {
            roll -= (classWeights[a.classId] || 1.0);
            if (roll <= 0) { archetype = a; break; }
        }
    }

    // Determinación de la Clase de Tamaño
    let sizeClass;
    if (isOrigin) {
        sizeClass = SIZE_CLASSES[2]; // Standard
    } else if (isMoonlet) {
        sizeClass = bodyRNG() < 0.6 ? SIZE_CLASSES[0] : SIZE_CLASSES[1]; // Micro o Dwarf
    } else {
        sizeClass = pickSizeClass(bodyRNG);
    }

    // Radio base y escalas físicas
    const sizeMult = lerp(sizeClass.radiusMultMin, sizeClass.radiusMultMax, bodyRNG());
    const radius = isOrigin ? 28000 : Math.max(260, Math.floor((archetype.baseRadius + bodyRNG() * archetype.radiusJitter) * sizeMult));
    
    // Anillos planetarios cinemáticos de alta definición (exclusivos: ~15-20% del universo)
    const ringChance = archetype.hasRings
        ? 0.45
        : (sizeClass.id === 'titan' ? 0.24
        : (sizeClass.id === 'colossal' ? 0.14
        : (archetype.classId === 'cryogenic' || archetype.classId === 'crystalline' ? 0.10 : 0.05)));
    const hasRings = isOrigin ? false : (!isMoonlet && sizeClass.id !== 'micro' && sizeClass.id !== 'dwarf' && bodyRNG() < ringChance);
    const ringStyleList = ['saturnian_rings', 'crystalline_ring', 'opalescent_rings', 'dense_rings', 'double_band', 'dust_halo'];
    const ringStyle = archetype.ringStyle || ringStyleList[Math.floor(bodyRNG() * ringStyleList.length)];
    const ringTilt = (bodyRNG() - 0.5) * 0.85;
    const ringInclination = 0.26 + bodyRNG() * 0.10; // Aspect ratio / aplanamiento elíptico 3D
    const ringAlpha = archetype.ringAlpha || (0.75 + bodyRNG() * 0.22);
    const ringInnerMult = 1.25 + bodyRNG() * 0.10;
    const ringOuterMult = 2.25 + bodyRNG() * 0.40;

    // Cordilleras y montañas de fondo atmosféricas (solo en planetas sólidos con relieve)
    const hasBackgroundRidges = !archetype.isLiquid &&
        archetype.classId !== 'gas' &&
        !isMoonlet &&
        (archetype.reliefAmplitude || 1) >= 0.50 &&
        (isOrigin || bodyRNG() < 0.82);

    // Radios de atmósfera, Esfera de Influencia Gravitatoria (SOI) y gravedad superficial equilibrada
    const REF_RADIUS = 24000;
    const baseAtmoThickRatio = Math.max(0.14, (archetype.atmoScale || 1.35) - 1.0);
    const scaledAtmoThickRatio = baseAtmoThickRatio * (sizeClass.atmoMult || 1.0) * Math.pow(REF_RADIUS / Math.max(radius, 3600), 0.28);
    const minAtmoRatio = sizeClass.id === 'micro' ? 0.05 : (sizeClass.id === 'dwarf' ? 0.09 : 0.14);
    const maxAtmoRatio = sizeClass.id === 'micro' ? 0.22 : 0.68;
    const atmoMultiplier = 1.0 + clamp(scaledAtmoThickRatio, minAtmoRatio, maxAtmoRatio);
    const atmoRadius = Math.floor(radius * atmoMultiplier);

    const soiBaseScale = 1.85 + 2.45 * Math.pow(REF_RADIUS / Math.max(radius, 1800), 0.36);
    const soiGravityFactor = 0.85 + 0.15 * Math.sqrt(sizeClass.gravityMult || 1.0);
    const minSoiForFeatures = Math.max(atmoRadius * 1.55, hasRings ? radius * (ringOuterMult + 0.45) : 0);
    const gravityRadius = Math.floor(Math.min(SECTOR_SIZE * 0.44, Math.max(minSoiForFeatures, radius * soiBaseScale * soiGravityFactor)));

    // Gravedad superficial acotada (0.16G - 1.35G) para mantener maniobrabilidad y despegue realistas en mundos colosales
    const classMidMult = (sizeClass.radiusMultMin + sizeClass.radiusMultMax) * 0.5;
    const withinClassFactor = clamp(1.0 + ((sizeMult / Math.max(0.01, classMidMult)) - 1.0) * 0.15, 0.92, 1.08);
    const rawGravity = (isOrigin ? 275 : archetype.gravityForce) * (sizeClass.gravityMult || 1.0) * withinClassFactor;
    const gravityForce = isOrigin ? 275 : Math.floor(clamp(rawGravity, 45, 385));

    // Posición en el Universo
    let px = 0;
    let py = 0;
    if (isOrigin) {
        px = 0;
        py = 0;
    } else if (isMoonlet && parentPos) {
        // Órbita satelital fuera de la atmósfera y anillos del planeta principal
        const minClearance = Math.max(5500, parentPos.radius * (parentPos.hasRings ? 1.85 : 0.95));
        const orbitDist = parentPos.radius + radius + minClearance + bodyRNG() * (7500 + parentPos.radius * 0.40);
        const orbitAngle = bodyRNG() * Math.PI * 2;
        px = parentPos.x + Math.cos(orbitAngle) * orbitDist;
        py = parentPos.y + Math.sin(orbitAngle) * orbitDist;
    } else {
        const maxJitter = SECTOR_SIZE * 0.20;
        px = sx * SECTOR_SIZE + (bodyRNG() * 2 - 1) * maxJitter;
        py = sy * SECTOR_SIZE + (bodyRNG() * 2 - 1) * maxJitter;
    }

    // Nombre Procedural Único
    let name = 'Cuna del Éter';
    if (!isOrigin) {
        const prefix = STAR_PREFIXES[Math.floor(bodyRNG() * STAR_PREFIXES.length)];
        const suffix = GREEK_SUFFIXES[Math.floor(bodyRNG() * GREEK_SUFFIXES.length)];
        const num = Math.floor(bodyRNG() * 98) + 2;
        if (isMoonlet) {
            name = `${prefix}-${suffix} Luna-${String.fromCharCode(65 + Math.floor(bodyRNG() * 6))}`;
        } else {
            name = bodyRNG() < 0.45 ? `${prefix} ${suffix}` : `${prefix}-${num}`;
        }
    }

    // Mutación Cromática Procedural (Para que dos mundos del mismo arquetipo tengan tonos únicos)
    const hueFactor = isOrigin ? 0.5 : bodyRNG();
    const brightFactor = isOrigin ? 1.0 : (0.88 + bodyRNG() * 0.24);
    const colors = {
        litColor: mutateColor(archetype.litColor, hueFactor, brightFactor),
        crustColor: mutateColor(archetype.crustColor, hueFactor, brightFactor * 0.95),
        coreColor: mutateColor(archetype.coreColor, hueFactor, brightFactor * 0.9),
        rimColor: mutateColor(archetype.rimColor, hueFactor, 1.0),
        accentColor: mutateColor(archetype.accentColor, hueFactor, 1.0),
        atmoGlow: mutateColor(archetype.atmoGlow, hueFactor, 1.0),
        cloudColor: archetype.cloudColor ? mutateColor(archetype.cloudColor, hueFactor, 1.0) : [240, 248, 255],
        mantleColor: mutateColor(archetype.mantleColor || archetype.crustColor, hueFactor, brightFactor),
        outerCoreColor: mutateColor(archetype.outerCoreColor || archetype.accentColor, hueFactor, 1.05),
        innerCoreColor: mutateColor(archetype.innerCoreColor || archetype.rimColor, hueFactor, 1.1),
        subcrustColor: mutateColor(archetype.subcrustColor || archetype.litColor, hueFactor, brightFactor * 0.95),
        topsoilColor: mutateColor(archetype.topsoilColor || archetype.litColor, hueFactor, brightFactor * 1.04),
        highPeakCapColor: mutateColor(archetype.highPeakCapColor || archetype.rimColor, hueFactor, 1.05),
        daySkyRGB: archetype.daySkyRGB ? mutateColor(archetype.daySkyRGB, hueFactor, brightFactor) : [14, 38, 72],
        upperSkyRGB: archetype.upperSkyRGB || [8, 18, 42],
        sunsetRGB: archetype.sunsetRGB ? mutateColor(archetype.sunsetRGB, hueFactor, 1.0) : [251, 146, 60],
        nightSkyRGB: archetype.nightSkyRGB || [3, 5, 12],
        nightUpperSkyRGB: archetype.nightUpperSkyRGB || [2, 3, 8],
        nightAirglow: archetype.nightAirglow ? mutateColor(archetype.nightAirglow, hueFactor, 1.0) : [56, 189, 248],
        nightAirglowAlpha: archetype.nightAirglowAlpha || 0.45,
        nightEmissiveGlow: archetype.nightEmissiveGlow ? mutateColor(archetype.nightEmissiveGlow, hueFactor, 1.0) : [56, 189, 248]
    };

    // --- SISTEMA INTEGRADO DE SUPERFICIES PLANETARIAS PROCEDURALES MULTI-ESCALA ---
    // Combina provincias geológicas variadas (grandes llanuras, cordilleras, campos de cráteres,
    // mesetas, cañones, agujas, dunas, calderas, zigurats) adaptadas a la categoría del planeta,
    // con estampado multi-escala de cráteres (chicos, normales, gigantes) y picos/montañas esculpidas.

    const scaleFactor = Math.sqrt(radius / 2600);
    const heightScale = clamp(Math.pow(radius / 8000, 0.30), 0.36, 2.05);
    const arcWidthScale = clamp(Math.pow(radius / 10000, 0.28), 0.38, 1.85);

    // Resolución adaptativa alta (~10-15u por vértice) para cráteres chicos, picos nítidos y acantilados definidos
    const targetArcStep = clamp(radius * 0.0042, 4.5, 13.5);
    const numVerts = archetype.isLiquid
        ? (radius < 1500 ? 480 : 720)
        : clamp(Math.round((Math.PI * 2 * radius) / targetArcStep), 720, 28800);

    // --- RESERVA TEMPRANA DE CUENCAS DE LAGOS (Para evitar montañas o cráteres encima) ---
    const lakes = [];
    const supportsLiquids = !archetype.isLiquid && (
        archetype.classId === 'terrestrial' ||
        archetype.classId === 'oceanic' ||
        archetype.classId === 'volcanic' ||
        archetype.classId === 'cryogenic' ||
        archetype.classId === 'toxic' ||
        archetype.classId === 'hollow' ||
        archetype.id === 'biolume' ||
        archetype.id === 'amethyst_hollow'
    );

    if (supportsLiquids) {
        let liquidType = 'water';
        if (archetype.classId === 'volcanic' || archetype.id.includes('magma') || archetype.id.includes('caldera')) {
            liquidType = 'magma';
        } else if (archetype.classId === 'cryogenic' || archetype.id.includes('methane') || archetype.id.includes('ice') || archetype.id.includes('neptune')) {
            liquidType = 'methane';
        } else if (archetype.id === 'biolume') {
            liquidType = 'biolume';
        } else if (archetype.classId === 'toxic') {
            liquidType = 'acid';
        } else if (archetype.id.includes('amethyst') || archetype.classId === 'crystalline' || archetype.classId === 'hollow') {
            liquidType = 'crystal';
        }

        const isMultiLakes = archetype.hasMultiLakes || archetype.terrainProfile === 'archipelago_lakes';
        const lakeCount = isOrigin ? 2 : (isMultiLakes ? (6 + Math.floor(bodyRNG() * 3)) : (2 + Math.floor(bodyRNG() * 3)));
        const lakeNames = {
            water: ['Lago Sereno', 'Laguna Turquesa', 'Bahía Zafiro', 'Océano Interior Austral', 'Cuenca Esmeralda', 'Remanso de Cristal', 'Lago Espejo'],
            magma: ['Caldera Incandescente', 'Mar de Lava Piroclástica', 'Falla de Fuego Primordial', 'Lago de Magma Fundido'],
            methane: ['Mar de Metano Criogénico', 'Lago Cobalto', 'Cuenca de Hielo Perpetuo', 'Laguna Boreal de Gas'],
            biolume: ['Laguna Bioluminiscente', 'Mar de Esporas Radiales', 'Remanso de Micelio Fluido', 'Bahía Espectral'],
            acid: ['Cuenca de Ácido Sulfúrico', 'Laguna Corrosiva de Cloro', 'Vórtice Químico Viridián'],
            crystal: ['Lago de Rocío de Amatista', 'Cuenca de Cuarzo Líquido', 'Mar de Prisma Resonante']
        }[liquidType] || ['Lago Astral', 'Cuenca Fluida'];

        for (let l = 0; l < lakeCount; l++) {
            let lAng = wrapAngle((l / lakeCount) * Math.PI * 2 + (bodyRNG() - 0.5) * 0.35);
            if (lAng < 0) lAng += Math.PI * 2;
            if (isOrigin) {
                lAng = (l === 0) ? 0.38 : 2.40; // Lejos de la plataforma central (-PI/2)
            }
            const lSpan = isMultiLakes ? (0.040 + bodyRNG() * 0.032) : (0.048 + bodyRNG() * 0.040);
            const lDepth = (18 + bodyRNG() * 16) * heightScale * 0.72;
            const waterLevelOffset = -(4 + bodyRNG() * 5);

            lakes.push({
                centerAngle: lAng,
                span: lSpan,
                depth: lDepth,
                waterLevel: radius + waterLevelOffset,
                liquidType: liquidType,
                name: lakeNames[l % lakeNames.length]
            });
        }
    }

    // --- ESCUDOS VOLCÁNICOS TITÁNICOS (SUPER-VOLCANES OLYMPUS MONS) ---
    const isSuperVolcano = archetype.hasSuperVolcano || archetype.terrainProfile === 'super_volcano';
    const superVolcanoes = [];
    if (isSuperVolcano) {
        const vCount = (bodyRNG() < 0.35) ? 2 : 1;
        for (let v = 0; v < vCount; v++) {
            const vAngle = (v === 0) ? (bodyRNG() * Math.PI * 2) : wrapAngle(superVolcanoes[0].angle + Math.PI * (0.8 + bodyRNG() * 0.4));
            const vSpan = 0.19 + bodyRNG() * 0.07;
            const vHeight = (155 + bodyRNG() * 75) * scaleFactor;
            const calderaDepth = (42 + bodyRNG() * 20) * scaleFactor;
            superVolcanoes.push({
                angle: vAngle,
                span: vSpan,
                height: vHeight,
                calderaDepth,
                hasActiveCaldera: true
            });
            lakes.push({
                centerAngle: vAngle,
                span: vSpan * 0.22,
                depth: calderaDepth,
                waterLevel: radius + vHeight - 16,
                liquidType: 'magma',
                name: 'Caldera Primordial de Fuego'
            });
        }
    }

    // --- MUNDOS HUECOS: BOCAS DE ABISMO Y CAVIDADES SUBTERRÁNEAS NAVEGABLES ---
    const isHollow = archetype.isHollow || archetype.classId === 'hollow' || archetype.terrainProfile === 'hollow_planet';
    const hollowPhysicsMode = isHollow ? (archetype.hollowPhysicsMode || 'microgravity_vortex') : null;
    const cavernLiquidType = isHollow ? (archetype.cavernLiquidType || 'biolume') : null;
    const cavernGlowColor = isHollow ? (archetype.cavernGlowColor || [56, 189, 248]) : null;
    const caveEntrances = [];
    const cavernCeilingHeights = [];
    const cavernFloorHeights = [];
    const cavernLakes = [];
    const cavernProps = [];
    const cavernFloatingIslands = [];
    const cavernNodes = [];
    if (isHollow) {
        const cCount = (radius < 1500) ? 2 : (bodyRNG() < 0.55 ? 3 : 2);
        const baseCaveAngle = bodyRNG() * Math.PI * 2;
        for (let c = 0; c < cCount; c++) {
            const cAngle = wrapAngle(baseCaveAngle + (c * (Math.PI * 2 / cCount)) + (bodyRNG() - 0.5) * 0.35);
            const cSpan = clamp((0.18 + bodyRNG() * 0.05) * Math.sqrt(2600 / Math.max(900, radius)), 0.11, 0.30);
            const cDepth = (145 + bodyRNG() * 75) * scaleFactor;
            const caveNames = ['Boca del Abismo Boreal', 'Falla de los Ecos Subterráneos', 'Fauces de Geoda Profunda'];
            caveEntrances.push({
                centerAngle: cAngle,
                span: cSpan,
                depth: cDepth,
                name: caveNames[c % caveNames.length]
            });
        }
        const clCount = 2 + Math.floor(bodyRNG() * 2);
        for (let l = 0; l < clCount; l++) {
            const clAngle = wrapAngle((l / clCount) * Math.PI * 2 + bodyRNG() * 0.9);
            const clSpan = 0.07 + bodyRNG() * 0.06;
            cavernLakes.push({
                centerAngle: clAngle,
                span: clSpan,
                waterLevel: radius * 0.44,
                depth: 18 * scaleFactor,
                liquidType: cavernLiquidType || 'biolume',
                name: cavernLiquidType === 'magma' ? 'Lago Magmático Abisal' : (cavernLiquidType === 'liquid_crystal' ? 'Estanque de Cristal Líquido' : 'Laguna Bioluminiscente')
            });
        }
    }

    // --- GENERACIÓN DE PROVINCIAS GEOLÓGICAS VARIADAS POR CATEGORÍA ---
    const surfData = generatePlanetSurfaceHeights({
        radius,
        numVerts,
        archetype,
        isOrigin,
        isMoonlet,
        lakes,
        superVolcanoes,
        caveEntrances,
        heightScale,
        arcWidthScale,
        scaleFactor,
        px,
        py,
        bodyRNG
    });

    const heights = surfData.heights;
    const regions = surfData.regions;
    const provinces = surfData.provinces;
    const craters = surfData.craters;

    // Alturas internas de techo y suelo si el planeta es hueco
    if (isHollow) {
        const cP1 = bodyRNG() * Math.PI * 2;
        const cP2 = bodyRNG() * Math.PI * 2;
        const cP3 = bodyRNG() * Math.PI * 2;
        const cP4 = bodyRNG() * Math.PI * 2;
        const hollowVerts = Math.min(numVerts, 2880);
        for (let i = 0; i < hollowVerts; i++) {
            const theta = (i / hollowVerts) * Math.PI * 2;
            const stalactiteWave = Math.sin(theta * 18 + cP1) * 18 + Math.cos(theta * 42 + cP2) * 9;
            cavernCeilingHeights.push(radius * 0.84 + stalactiteWave * scaleFactor);

            const stalagmiteWave = Math.sin(theta * 14 + cP3) * 20 + Math.cos(theta * 35 + cP4) * 10;
            let floorBasinOffset = 0;
            for (const cl of cavernLakes) {
                const ld = Math.abs(Math.atan2(Math.sin(theta - cl.centerAngle), Math.cos(theta - cl.centerAngle)));
                if (ld < cl.span * 1.15) {
                    const lu = clamp(ld / (cl.span * 1.15), 0, 1);
                    floorBasinOffset -= Math.cos(lu * Math.PI * 0.5) * 34 * scaleFactor;
                }
            }
            cavernFloorHeights.push(radius * 0.44 + stalagmiteWave * scaleFactor + floorBasinOffset);
        }
    }

    // Calibración geodésica precisa de cuencas de lagunas a las cotas reales del terreno
    calibrateLakeBasins(lakes, heights, numVerts, 12);
    if (isHollow && cavernLakes.length > 0) {
        calibrateLakeBasins(cavernLakes, cavernFloorHeights, cavernFloorHeights.length, 10);
    }

    let maxSurfaceRadius = radius;
    let minSurfaceRadius = radius;
    for (let i = 0; i < numVerts; i++) {
        if (heights[i] > maxSurfaceRadius) maxSurfaceRadius = heights[i];
        if (heights[i] < minSurfaceRadius) minSurfaceRadius = heights[i];
    }

    // --- ESTRATOS GEOLÓGICOS ESTÁTICOS PRE-SUAVIZADOS (Filtro O(N) ultra-rápido con suma de prefijos) ---
    const strataProfiles = buildStrataProfiles(heights, numVerts, radius, scaleFactor, bodyRNG);

    // Sin estructuras artificiales: estética 100% natural y coherente con el paisaje de cada mundo
    const structures = [];

    // --- FORMACIONES NATURALES INTEGRADAS EN EL TERRENO (Sensibles al bioma y la pendiente local) ---
    const props = generateSurfaceProps({
        radius,
        numVerts,
        heights,
        archetype,
        isOrigin,
        provinces,
        regions,
        lakes,
        caveEntrances,
        heightScale,
        scaleFactor,
        px,
        py,
        bodyRNG
    });

    // --- ISLAS FLOTANTES Y PLATAFORMAS AÉREAS / OCEÁNICAS ---
    const floatingIslands = [];
    const spawnFloating = archetype.hasFloatingIslands || archetype.classId === 'shattered' || archetype.id === 'clockwork_monolith';
    if (spawnFloating) {
        const isLiquidDeck = !!archetype.isLiquid;
        const fCount = isLiquidDeck ? (6 + Math.floor(bodyRNG() * 3)) : (8 + Math.floor(bodyRNG() * 5));
        for (let f = 0; f < fCount; f++) {
            const fAng = wrapAngle((f / fCount) * Math.PI * 2 + (bodyRNG() - 0.5) * 0.25);
            const surfR = sampleHeightArray(heights, fAng, radius);
            const fScale = Math.sqrt(radius / 2600);
            const alt = isLiquidDeck ? (10 + bodyRNG() * 8) : ((115 + bodyRNG() * 250) * fScale);
            const thick = (isLiquidDeck ? 16 : (26 + bodyRNG() * 22)) * fScale;
            const spanRad = clamp(((isLiquidDeck ? 95 : 105) + bodyRNG() * 85) * fScale / radius, 0.03, 0.14);
            const topR = surfR + alt;
            floatingIslands.push({
                angle: fAng,
                span: spanRad,
                topRadius: topR,
                bottomRadius: topR - thick,
                thickness: thick,
                style: isLiquidDeck ? (archetype.id === 'bio_phosphor_ocean' ? 'coral_raft' : 'ice_shelf') : (archetype.classId === 'megalithic' ? 'monolith_platform' : 'shattered_rock'),
                glowColor: archetype.glowColor || [56, 189, 248],
                seed: bodyRNG()
            });
        }
    }

    // --- FENÓMENOS ACTIVOS (GEISERS IMPULSORES Y BOLSILLOS DE ANOMALÍA GRAVITATORIA) ---
    const phenomena = [];
    const spawnGeysers = archetype.hasGeysers || archetype.classId === 'volcanic' || archetype.classId === 'living' || archetype.classId === 'cometary';
    if (spawnGeysers) {
        const gType = archetype.geyserType || (archetype.classId === 'living' ? 'spore' : (archetype.classId === 'cometary' ? 'cryo' : (archetype.classId === 'volcanic' ? 'plasma' : 'steam')));
        const gCount = 4 + Math.floor(bodyRNG() * 4);
        for (let g = 0; g < gCount; g++) {
            const gAng = wrapAngle((g / gCount) * Math.PI * 2 + (bodyRNG() - 0.5) * 0.4);
            let skipCave = false;
            for (const cave of caveEntrances) {
                if (Math.abs(wrapAngle(gAng - cave.centerAngle)) < cave.span * 0.75) { skipCave = true; break; }
            }
            if (skipCave) continue;
            const gScale = Math.sqrt(radius / 2600);
            phenomena.push({
                type: 'geyser',
                geyserType: gType,
                angle: gAng,
                span: clamp(0.025 * (2600 / Math.max(1000, radius)), 0.015, 0.06),
                reachHeight: (170 + bodyRNG() * 140) * gScale,
                force: (gType === 'cryo' ? 44 : (gType === 'spore' ? 28 : 52)),
                cyclePeriod: 4.5 + bodyRNG() * 4.0,
                phase: bodyRNG() * 10,
                seed: bodyRNG()
            });
        }
    }
    const spawnAnom = archetype.hasGravityAnomalies || archetype.classId === 'shattered' || archetype.classId === 'megalithic' || archetype.classId === 'anomaly';
    if (spawnAnom) {
        const aCount = 3 + Math.floor(bodyRNG() * 3);
        for (let a = 0; a < aCount; a++) {
            const aAng = wrapAngle((a / aCount) * Math.PI * 2 + bodyRNG() * 0.5);
            const aScale = Math.sqrt(radius / 2600);
            const surfR = sampleHeightArray(heights, aAng, radius);
            const mode = bodyRNG() < 0.58 ? 'antigrav' : 'vortex';
            phenomena.push({
                type: 'gravity_anomaly',
                anomalyMode: mode,
                angle: aAng,
                radiusPos: surfR + (85 + bodyRNG() * 165) * aScale,
                effectRadius: (125 + bodyRNG() * 85) * aScale,
                strength: mode === 'antigrav' ? 1.45 : 1.15,
                color: mode === 'antigrav' ? [56, 189, 248] : [192, 132, 252],
                phase: bodyRNG() * Math.PI * 2,
                seed: bodyRNG()
            });
        }
    }

    // --- DETALLES SUBTERRÁNEOS PARA MUNDOS HUECOS ---
    if (isHollow) {
        const cScale = Math.sqrt(radius / 2600);
        // Propiedades del techo (estalactitas, cristales colgantes, lianas) y del suelo (estalagmitas, hongos gigantes)
        const cPropCount = Math.floor(24 * cScale);
        for (let cp = 0; cp < cPropCount; cp++) {
            const cpAng = ((cp / cPropCount) * Math.PI * 2 + (bodyRNG() - 0.5) * 0.15 + Math.PI * 2) % (Math.PI * 2);
            const onCeiling = bodyRNG() < 0.52;
            if (onCeiling) {
                let nearMouth = false;
                for (const cave of caveEntrances) {
                    if (Math.abs(wrapAngle(cpAng - cave.centerAngle)) < cave.span * 0.72) { nearMouth = true; break; }
                }
                if (nearMouth) continue;
            }
            const cType = onCeiling
                ? (hollowPhysicsMode === 'crystal_resonance' ? 'ceiling_crystal' : (bodyRNG() < 0.55 ? 'stalactite' : 'cavern_vine'))
                : (hollowPhysicsMode === 'thermal_forge' ? 'stalagmite' : (bodyRNG() < 0.5 ? 'cavern_mushroom' : 'stalagmite'));
            cavernProps.push({
                angle: cpAng,
                onCeiling,
                propType: cType,
                height: (24 + bodyRNG() * 44) * cScale,
                width: (10 + bodyRNG() * 14) * cScale,
                seed: bodyRNG()
            });
        }
        // Plataformas flotantes dentro de la caverna
        const cfCount = 4 + Math.floor(bodyRNG() * 3);
        for (let cf = 0; cf < cfCount; cf++) {
            const cfAng = wrapAngle((cf / cfCount) * Math.PI * 2 + bodyRNG() * 0.4);
            const cFloor = sampleHeightArray(cavernFloorHeights, cfAng, radius * 0.44);
            const cCeil = sampleHeightArray(cavernCeilingHeights, cfAng, radius * 0.84);
            const midR = lerp(cFloor, cCeil, 0.38 + bodyRNG() * 0.28);
            const thick = (20 + bodyRNG() * 14) * cScale;
            cavernFloatingIslands.push({
                angle: cfAng,
                span: clamp((75 + bodyRNG() * 55) * cScale / Math.max(800, midR), 0.04, 0.16),
                topRadius: midR + thick * 0.5,
                bottomRadius: midR - thick * 0.5,
                thickness: thick,
                style: hollowPhysicsMode === 'crystal_resonance' ? 'crystal_platform' : 'cavern_slab',
                glowColor: cavernGlowColor || [56, 189, 248],
                seed: bodyRNG()
            });
        }
        // Nodos de Éter subterráneos (en el suelo, o en el techo si es gravedad invertida)
        const cnCount = 5 + Math.floor(bodyRNG() * 3);
        for (let cn = 0; cn < cnCount; cn++) {
            const cnAng = wrapAngle((cn / cnCount) * Math.PI * 2 + bodyRNG() * 0.35);
            const onCeilNode = (hollowPhysicsMode === 'inverted_shell' && bodyRNG() < 0.65);
            let skipCeil = false;
            if (onCeilNode) {
                for (const cave of caveEntrances) {
                    if (Math.abs(wrapAngle(cnAng - cave.centerAngle)) < cave.span * 0.72) { skipCeil = true; break; }
                }
            }
            cavernNodes.push({
                angle: cnAng,
                inCavern: true,
                onCeiling: onCeilNode && !skipCeil,
                harvested: false,
                value: 160,
                maxValue: 160,
                phase: bodyRNG() * Math.PI * 2
            });
        }
    }

    const interior = {
        style: archetype.interiorStyle || 'silicate_iron',
        innerCoreFrac: 0.22 + bodyRNG() * 0.05,
        outerCoreFrac: 0.48 + bodyRNG() * 0.06,
        strataProfiles
    };

    const auroras = [];
    if (archetype.atmoVisuals && archetype.atmoVisuals.hasAurora) {
        const bandCount = 3 + Math.floor(bodyRNG() * 3);
        const colorsList = archetype.auroraColors || [[56, 189, 248], [167, 139, 250], [74, 222, 128]];
        for (let a = 0; a < bandCount; a++) {
            auroras.push({
                altFrac: 0.52 + (a / bandCount) * 0.38,
                phase: bodyRNG() * Math.PI * 2,
                speed: 0.35 + bodyRNG() * 0.55,
                wavelength: 2 + Math.floor(bodyRNG() * 4),
                amplitude: 10 + bodyRNG() * 14,
                color: colorsList[a % colorsList.length]
            });
        }
    }

    // --- NODOS DE ÉTER DISTRIBUIDOS ---
    const nodes = [];
    const nodeCount = isOrigin ? 8 : Math.min(36, Math.max(3, Math.floor((4 + bodyRNG() * 5) * Math.sqrt(radius / 2600))));
    for (let i = 0; i < nodeCount; i++) {
        let ang = (i / nodeCount) * Math.PI * 2 + bodyRNG() * 0.35;
        if (isOrigin && Math.abs(Math.atan2(Math.sin(ang + Math.PI / 2), Math.cos(ang + Math.PI / 2))) < 0.18) {
            ang += 0.35;
        }
        nodes.push({
            angle: ang,
            harvested: false,
            value: 100,
            maxValue: 100,
            phase: bodyRNG() * Math.PI * 2
        });
    }

    // --- SISTEMA METEOROLÓGICO PLANETARIO Y NUBES CINEMÁTICAS ---
    const cloudBands = [];

    // --- METADATOS Y MINERALOGÍA PROCEDURAL PARA EXPLORACIÓN ---
    const discoveredMinerals = [];
    const possibleMinKeys = archetype.possibleMinerals || ['silica', 'ferrite', 'calcite'];
    for (const mKey of possibleMinKeys) {
        const minData = MINERALS.find(m => m.id === mKey);
        if (minData) discoveredMinerals.push(minData);
    }

    // Sol Celestial Unificado en el Archipiélago Cósmico
    const sunGx = (typeof GALAXY_SUN_POS !== 'undefined') ? GALAXY_SUN_POS.x : 0;
    const sunGy = (typeof GALAXY_SUN_POS !== 'undefined') ? GALAXY_SUN_POS.y : -250000;
    const baseSunAngle = Math.atan2(sunGy - py, sunGx - px);

    // Cinemática de Rotación Axial Planetaria (con variación natural y escala de masa)
    const basePeriod = archetype.baseRotationPeriod || 260;
    const sizeRotMod = (sizeClass.id === 'colossal' || sizeClass.id === 'titan') ? 1.25 : (sizeClass.id === 'micro' ? 0.75 : 1.0);
    const rotJitter = 0.85 + bodyRNG() * 0.3;
    const rotationPeriod = Math.round(basePeriod * rotJitter * sizeRotMod);
    const isRetrograde = bodyRNG() < 0.15; // 15% de mundos con rotación retrógrada
    const rotationDir = isRetrograde ? -1 : 1;
    const rotationSpeed = ((Math.PI * 2) / rotationPeriod) * rotationDir;
    const initialRotationPhase = bodyRNG() * Math.PI * 2;
    const initialLightAngle = wrapAngle(baseSunAngle + initialRotationPhase);

    const planetKey = `${sx},${sy}:${subIndex}`;
    const planet = {
        key: planetKey,
        sx,
        sy,
        subIndex,
        x: px,
        y: py,
        radius,
        maxSurfaceRadius,
        minSurfaceRadius,
        atmoRadius,
        gravityRadius,
        gravityForce,
        isComet: !!(archetype.isComet || archetype.classId === 'cometary'),
        isSingularity: !!archetype.isSingularity,
        isMagnetar: !!archetype.isMagnetar,
        isEyeballWorld: !!archetype.isEyeballWorld,
        atmoDensity: (archetype.atmoDensity || 1.0) * (sizeClass.atmoMult || 1.0),
        atmoPressure: (archetype.atmoPressure || 1.0) * (sizeClass.atmoMult || 1.0),
        name,
        archetype,
        sizeClass,
        colors,
        scanned: isOrigin,
        visited: isOrigin,
        isOrigin,
        isMoonlet,
        hasRings,
        hasBackgroundRidges,
        ringStyle,
        ringTilt,
        ringInclination,
        ringInnerMult,
        ringOuterMult,
        ringAlpha,
        lakes,
        isHollow,
        hollowPhysicsMode,
        cavernLiquidType,
        cavernGlowColor,
        caveEntrances,
        cavernCeilingHeights,
        cavernFloorHeights,
        cavernLakes,
        cavernProps,
        cavernFloatingIslands,
        cavernNodes,
        floatingIslands,
        phenomena,
        interiorCoreRadius: isHollow ? Math.floor(radius * 0.17) : 0,
        isSuperVolcano,
        superVolcanoes,
        surfaceSeed: bodyRNG(),
        heightScale,
        heights,
        craters,
        props,
        structures,
        interior,
        auroras,
        nodes,
        cloudBands,
        regions,
        provinces,
        minerals: discoveredMinerals,
        hazardLevel: archetype.hazardLevel || 'Moderado',
        hazards: archetype.hazards || ['Clima Espacial'],
        biosphereRating: archetype.biosphereRating || 'Inerte',
        wavePhase: bodyRNG() * 10,
        bases: (typeof planetaryBases !== 'undefined') ? planetaryBases.filter(b => b && b.planetKey === planetKey) : [],
        extractors: (typeof planetaryExtractors !== 'undefined') ? planetaryExtractors.filter(e => e && e.planetKey === planetKey) : [],
        // Sol central unificado y física de rotación diurna
        baseSunAngle,
        rotationPeriod,
        rotationSpeed,
        initialRotationPhase,
        lightAngle: initialLightAngle
    };

    // --- YACIMIENTOS REGIONALES Y RECURSOS PLANETARIOS ---
    if (typeof initPlanetResourceField === 'function') {
        initPlanetResourceField(planet);
    }

    // --- FAUNA Y SERES VIVOS EXTRATERRESTRES PROCEDURALES ---
    if (typeof generatePlanetCreatures === 'function') {
        generatePlanetCreatures(planet, bodyRNG);
    }

    // --- SISTEMA METEOROLÓGICO PLANETARIO Y NUBES VOLUMÉTRICAS ---
    if (typeof initPlanetWeather === 'function') {
        initPlanetWeather(planet, bodyRNG);
        if (planet.weather && planet.weather.clouds) {
            planet.cloudBands = planet.weather.clouds;
        }
    }

    // Restaurar nodos de Éter recolectados desde caché local / snapshot
    if (typeof window !== 'undefined' && window._pendingHarvestedNodes && window._pendingHarvestedNodes.has(planet.key)) {
        const harvestedIdxs = window._pendingHarvestedNodes.get(planet.key);
        for (const idx of harvestedIdxs) {
            if (planet.nodes && planet.nodes[idx]) {
                planet.nodes[idx].harvested = true;
            }
        }
    }

    return planet;
}

/**
 * Busca un planeta por su clave completa ("sx,sy:subIndex" o "sx,sy")
 */
function getPlanetByKey(planetKey) {
    if (!planetKey) return null;
    const parts = String(planetKey).split(':');
    const sectorCoord = parts[0];
    const subIdx = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    const [sxStr, syStr] = sectorCoord.split(',');
    const sx = parseInt(sxStr, 10);
    const sy = parseInt(syStr, 10);
    if (Number.isNaN(sx) || Number.isNaN(sy)) return null;
    const list = getSectorPlanets(sx, sy);
    if (!list || list.length === 0) return null;
    return list.find(p => p.subIndex === subIdx) || list[0];
}

/**
 * Retorna el planeta primario de un sector (compatible con llamadas existentes)
 */
function getPlanet(sx, sy) {
    const list = getSectorPlanets(sx, sy);
    return (list && list.length > 0) ? list[0] : null;
}

/**
 * Retorna todos los planetas cercanos a una posición dada
 */
function getNearbyPlanets(x, y, range = 1) {
    const cx = Math.round(x / SECTOR_SIZE);
    const cy = Math.round(y / SECTOR_SIZE);
    const results = [];
    for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
            const list = getSectorPlanets(cx + dx, cy + dy);
            for (const p of list) {
                if (p) results.push(p);
            }
        }
    }
    return results;
}

/**
 * Calcula el radio del terreno natural sin modificaciones artificiales
 */
function getNaturalSurfaceRadius(planet, angle) {
    if (!planet) return 0;
    if (planet.archetype.isLiquid) {
        return planet.radius
            + Math.sin(angle * 18 + planet.wavePhase) * 3.4
            + Math.cos(angle * 32 - planet.wavePhase * 1.5) * 1.6;
    }
    const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const idxFloat = (norm / (Math.PI * 2)) * planet.heights.length;
    const i0 = Math.floor(idxFloat) % planet.heights.length;
    const i1 = (i0 + 1) % planet.heights.length;
    const frac = idxFloat - Math.floor(idxFloat);
    return lerp(planet.heights[i0], planet.heights[i1], frac);
}

/**
 * Calcula el radio exacto de superficie a cualquier ángulo polar,
 * integrando plataformas y bases construidas como cubiertas niveladas.
 */
function getSurfaceRadius(planet, angle) {
    if (!planet) return 0;
    const naturalR = getNaturalSurfaceRadius(planet, angle);

    // Integración de bases planetarias construidas
    if (planet.bases && planet.bases.length > 0) {
        for (let i = 0; i < planet.bases.length; i++) {
            const b = planet.bases[i];
            const dAng = Math.atan2(Math.sin(angle - b.angle), Math.cos(angle - b.angle));
            if (Math.abs(dAng) <= b.angularHalfSpan) {
                // Cubierta plana horizontal en el espacio tangente: r = deckR / cos(dAng)
                const cosD = Math.cos(dAng);
                const deckR = cosD > 0.001 ? (b.deckR / cosD) : b.deckR;
                
                // Zona de rampa suave en los extremos para acceso fluido
                const rampThresh = b.angularHalfSpan * 0.85;
                if (Math.abs(dAng) > rampThresh) {
                    const u = (Math.abs(dAng) - rampThresh) / (b.angularHalfSpan - rampThresh);
                    return lerp(deckR, naturalR, u);
                }
                return Math.max(naturalR, deckR);
            }
        }
    }

    return naturalR;
}

/**
 * Retorna la entrada de cueva si el ángulo polar se encuentra sobre una boca de abismo
 */
function getPlanetCaveEntranceAt(planet, angle) {
    if (!planet || !planet.isHollow || !planet.caveEntrances || planet.caveEntrances.length === 0) return null;
    const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    for (const cave of planet.caveEntrances) {
        const diff = Math.abs(Math.atan2(Math.sin(norm - cave.centerAngle), Math.cos(norm - cave.centerAngle)));
        if (diff <= cave.span) {
            return {
                cave,
                diff,
                normDist: diff / cave.span
            };
        }
    }
    return null;
}

/**
 * Retorna la cota del techo rocoso interior de la caverna (sub-corteza)
 */
function getCavernCeilingRadius(planet, angle) {
    if (!planet || !planet.cavernCeilingHeights || planet.cavernCeilingHeights.length === 0) return planet ? planet.radius * 0.84 : 0;
    const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const idxFloat = (norm / (Math.PI * 2)) * planet.cavernCeilingHeights.length;
    const i0 = Math.floor(idxFloat) % planet.cavernCeilingHeights.length;
    const i1 = (i0 + 1) % planet.cavernCeilingHeights.length;
    const frac = idxFloat - Math.floor(idxFloat);
    return lerp(planet.cavernCeilingHeights[i0], planet.cavernCeilingHeights[i1], frac);
}

/**
 * Retorna la cota del suelo rocoso inferior de la caverna
 */
function getCavernFloorRadius(planet, angle) {
    if (!planet || !planet.cavernFloorHeights || planet.cavernFloorHeights.length === 0) return planet ? planet.radius * 0.48 : 0;
    const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const idxFloat = (norm / (Math.PI * 2)) * planet.cavernFloorHeights.length;
    const i0 = Math.floor(idxFloat) % planet.cavernFloorHeights.length;
    const i1 = (i0 + 1) % planet.cavernFloorHeights.length;
    const frac = idxFloat - Math.floor(idxFloat);
    return lerp(planet.cavernFloorHeights[i0], planet.cavernFloorHeights[i1], frac);
}

/**
 * Determina si unas coordenadas globales están dentro de la cámara interior o garganta de cueva de un planeta hueco
 */
function isShipInsideCavern(planet, shipX, shipY) {
    if (!planet || !planet.isHollow) return false;
    const dx = shipX - planet.x;
    const dy = shipY - planet.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const bounds = getHollowBoundsAt(planet, angle);
    return (dist < bounds.cavernTriggerR && dist >= (planet.interiorCoreRadius || planet.radius * 0.17) * 0.5);
}

/**
 * Retorna la información de lago o cuenca líquida si el ángulo polar se encuentra sobre uno
 */
function getPlanetLakeAtAngle(planet, angle) {
    if (!planet || !planet.lakes || planet.lakes.length === 0) return null;
    const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    for (const lake of planet.lakes) {
        const diff = Math.abs(Math.atan2(Math.sin(norm - lake.centerAngle), Math.cos(norm - lake.centerAngle)));
        if (diff <= lake.span) {
            const u = diff / lake.span;
            return {
                lake,
                normDist: u,
                waterLevel: lake.waterLevel,
                liquidType: lake.liquidType,
                name: lake.name
            };
        }
    }
    return null;
}

/**
 * Obtiene la provincia geológica exacta que contiene un ángulo polar (0..2π)
 */
function getPlanetProvinceAtAngle(planet, angle) {
    if (!planet || !planet.provinces || planet.provinces.length === 0) return null;
    const TWO_PI = Math.PI * 2;
    const norm = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
    for (let i = 0; i < planet.provinces.length; i++) {
        const pv = planet.provinces[i];
        if ((norm >= pv.startAngle && norm < pv.endAngle) || (pv.endAngle > TWO_PI && norm + TWO_PI < pv.endAngle)) {
            return pv;
        }
    }
    return planet.provinces[0];
}

/**
 * Obtiene la región geológica sobre la que se encuentra un ángulo determinado
 */
function getPlanetRegionAtAngle(planet, angle) {
    if (!planet) return null;
    const pv = getPlanetProvinceAtAngle(planet, angle);
    if (pv) return pv;
    if (!planet.regions || planet.regions.length === 0) return null;
    const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let bestReg = planet.regions[0];
    let minDiff = Infinity;
    for (const reg of planet.regions) {
        const diff = Math.abs(Math.atan2(Math.sin(norm - reg.centerAngle), Math.cos(norm - reg.centerAngle)));
        if (diff < minDiff) {
            minDiff = diff;
            bestReg = reg;
        }
    }
    return bestReg;
}

/**
 * Devuelve los modificadores atmosféricos propios del tipo de planeta
 * (escala de altura, viscosidad/arrastre y compresión térmica del gas).
 */
function getPlanetAtmoProfile(planet) {
    const arch = (planet && planet.archetype) || {};
    const id = arch.id || '';
    const classId = arch.classId || '';
    const baseDensity = planet ? (planet.atmoDensity || arch.atmoDensity || 1.0) : 1.0;

    // Atmósferas superdensas, gaseosas o tormentosas: escala más alta y mayor arrastre
    if (
        id === 'gas_jovian' || id === 'titan_gas_dense' || id === 'saturnian_crown' ||
        id === 'chlorine_storm' || id === 'acid_ocean' || id === 'methane_tundra' ||
        id === 'super_volcano' || id === 'sulfur_caldera' ||
        ((classId === 'oceanic' || classId === 'toxic') && baseDensity >= 1.2)
    ) {
        return { scaleFalloff: 2.95, dragMult: 1.22, heatingMult: 1.15 };
    }

    // Atmósferas tenues o casi de vacío: decaimiento rápido y bajo arrastre
    if (
        id === 'dwarf_planetoid' || id === 'ferrum_core' || id === 'shattered_core' ||
        id === 'proto_impact' || id === 'glass_desert' || id === 'nitrogen_ice' ||
        id === 'obsidian_crag' || baseDensity < 0.5
    ) {
        return { scaleFalloff: 3.95, dragMult: 0.85, heatingMult: 0.78 };
    }

    return { scaleFalloff: 3.4, dragMult: 1.0, heatingMult: 1.0 };
}

/**
 * Calcula las propiedades físicas y visuales de la capa atmosférica según la altitud local
 */
function getAtmoLayerInfo(planet, altFromSurface) {
    if (!planet) {
        return {
            inAtmo: false,
            atmoFrac: 1,
            density: 0,
            pressure: 0,
            dragFactor: 0,
            dragMult: 1,
            heatingMult: 1,
            layerId: 'space',
            layerName: 'ESPACIO PROFUNDO',
            condensationFactor: 0,
            troposphereFactor: 0,
            vacuumPlumeFactor: 1
        };
    }

    const atmoDepth = planet.atmoRadius - planet.radius;
    if (altFromSurface >= atmoDepth || atmoDepth <= 10) {
        return {
            inAtmo: false,
            atmoFrac: 1,
            density: 0,
            pressure: 0,
            dragFactor: 0,
            dragMult: 1,
            heatingMult: 1,
            layerId: 'space',
            layerName: 'ESPACIO PROFUNDO',
            condensationFactor: 0,
            troposphereFactor: 0,
            vacuumPlumeFactor: 1
        };
    }

    const atmoFrac = clamp(altFromSurface / atmoDepth, 0, 1);
    const profile = getPlanetAtmoProfile(planet);
    const rawExp = Math.exp(-atmoFrac * profile.scaleFalloff) * (1 - atmoFrac);
    const density = rawExp * (planet.atmoDensity || planet.archetype.atmoDensity || 1.0);
    const pressure = rawExp * (planet.atmoPressure || planet.archetype.atmoPressure || 1.0);

    // Transición suave hacia la línea de Kármán (sin cortes bruscos; vacío orbital limpio sobre 68%)
    let dragFactor = 1.0;
    if (atmoFrac >= 0.68) {
        dragFactor = 0.0;
    } else if (atmoFrac > 0.54) {
        const t = (atmoFrac - 0.54) / 0.14;
        dragFactor = 1.0 - t * t * (3 - 2 * t);
    }

    const troposphereFactor = clamp(1 - atmoFrac / 0.28, 0, 1);

    let condensationFactor = 0;
    if (atmoFrac > 0.22 && atmoFrac < 0.76) {
        const mid = 0.47;
        const halfSpan = 0.26;
        condensationFactor = Math.max(0, 1 - Math.pow((atmoFrac - mid) / halfSpan, 2));
    }

    const vacuumPlumeFactor = clamp((atmoFrac - 0.35) / 0.65, 0, 1);

    let layerId = 'troposphere';
    let layerName = 'TROPOSFERA';
    if (atmoFrac < 0.26) {
        layerId = 'troposphere';
        layerName = 'TROPOSFERA';
    } else if (atmoFrac < 0.58) {
        layerId = 'stratosphere';
        layerName = 'ESTRATOSFERA (CONDENSACIÓN)';
    } else if (atmoFrac < 0.82) {
        layerId = 'mesosphere';
        layerName = 'MESOSFERA ALTA';
    } else {
        layerId = 'exosphere';
        layerName = 'TERMÓSFERA / EXOSFERA';
    }

    return {
        inAtmo: true,
        atmoFrac,
        density,
        pressure,
        dragFactor,
        dragMult: profile.dragMult,
        heatingMult: profile.heatingMult,
        layerId,
        layerName,
        condensationFactor,
        troposphereFactor,
        vacuumPlumeFactor
    };
}

/**
 * Interpola una tabla radial polar arbitraria (heights, ceiling, floor)
 */
function sampleHeightArray(arr, angle, fallback = 0) {
    if (!arr || arr.length === 0) return fallback;
    const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const idxFloat = (norm / (Math.PI * 2)) * arr.length;
    const i0 = Math.floor(idxFloat) % arr.length;
    const i1 = (i0 + 1) % arr.length;
    return lerp(arr[i0], arr[i1], idxFloat - Math.floor(idxFloat));
}

/**
 * Calibra niveles de agua y profundidades para lagos exteriores o subterráneos
 */
function calibrateLakeBasins(lakeList, heightArr, numVerts, minDepth = 12) {
    if (!lakeList || lakeList.length === 0 || !heightArr || heightArr.length === 0) return;
    for (const lk of lakeList) {
        const normC = ((lk.centerAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const idxCenter = Math.floor((normC / (Math.PI * 2)) * numVerts) % numVerts;
        const leftAng = (((normC - lk.span) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const rightAng = (((normC + lk.span) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const rLeft = heightArr[Math.floor((leftAng / (Math.PI * 2)) * numVerts) % numVerts];
        const rRight = heightArr[Math.floor((rightAng / (Math.PI * 2)) * numVerts) % numVerts];
        const shoreLevel = Math.min(rLeft, rRight);
        lk.waterLevel = shoreLevel - 1.2;
        lk.depth = Math.max(minDepth, lk.waterLevel - heightArr[idxCenter]);
    }
}

/**
 * Geometría unificada de planeta hueco en un ángulo dado: garganta de entrada, techo interior y suelo abisal
 */
function getHollowBoundsAt(planet, angle) {
    const extR = getSurfaceRadius(planet, angle);
    const ceilR = getCavernCeilingRadius(planet, angle);
    const floorR = getCavernFloorRadius(planet, angle);
    const coreR = planet ? (planet.interiorCoreRadius || planet.radius * 0.17) : 0;
    const caveInfo = getPlanetCaveEntranceAt(planet, angle);

    let inThroat = false;
    let isThroatOpen = false;
    let effectiveCeilingR = ceilR;
    let cavernTriggerR = ceilR + 8;

    if (caveInfo) {
        const u = caveInfo.normDist;
        inThroat = u < 0.72;
        isThroatOpen = u < 0.56;
        const funnelT = smoothstep(0.46, 0.72, u);
        effectiveCeilingR = lerp(extR + 140, ceilR, funnelT);
        cavernTriggerR = lerp(extR - 12, ceilR + 10, smoothstep(0.40, 0.72, u));
    }

    return {
        extR,
        ceilR,
        effectiveCeilingR,
        floorR,
        coreR,
        caveInfo,
        inThroat,
        isThroatOpen,
        cavernTriggerR
    };
}

/**
 * Retorna el radio de apoyo según si el ente está fuera, en el suelo de la caverna o en el techo invertido
 */
function getCavernOrSurfaceRadius(planet, angle, inCavern = false, onCeiling = false) {
    if (!planet) return 0;
    if (inCavern && planet.isHollow) {
        return onCeiling ? getCavernCeilingRadius(planet, angle) : getCavernFloorRadius(planet, angle);
    }
    return getSurfaceRadius(planet, angle);
}

/**
 * Consulta la plataforma flotante (exterior o subterránea) bajo un ángulo y radio dados
 */
function getFloatingIslandAt(planet, angle, radiusPos = null, includeCavern = true) {
    if (!planet) return null;
    const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const lists = [];
    if (planet.floatingIslands && planet.floatingIslands.length > 0) lists.push({ list: planet.floatingIslands, inCavern: false });
    if (includeCavern && planet.isHollow && planet.cavernFloatingIslands && planet.cavernFloatingIslands.length > 0) {
        lists.push({ list: planet.cavernFloatingIslands, inCavern: true });
    }

    let best = null;
    let bestDelta = Infinity;
    for (const entry of lists) {
        for (const isl of entry.list) {
            const diff = Math.abs(Math.atan2(Math.sin(norm - isl.angle), Math.cos(norm - isl.angle)));
            if (diff <= isl.span) {
                const u = diff / isl.span;
                const topR = isl.topRadius - Math.pow(u, 2.2) * (isl.thickness * 0.25);
                const bottomR = isl.bottomRadius + Math.pow(u, 1.4) * (isl.thickness * 0.55);
                if (radiusPos === null) {
                    if (u < bestDelta) {
                        bestDelta = u;
                        best = { island: isl, u, topR, bottomR, inCavern: entry.inCavern };
                    }
                } else {
                    const mid = (topR + bottomR) * 0.5;
                    const radialDist = Math.abs(radiusPos - mid);
                    if (radialDist < bestDelta) {
                        bestDelta = radialDist;
                        best = { island: isl, u, topR, bottomR, inCavern: entry.inCavern };
                    }
                }
            }
        }
    }
    return best;
}

/**
 * Retorna el lago subterráneo de caverna si el ángulo coincide con uno
 */
function getCavernLakeAtAngle(planet, angle) {
    if (!planet || !planet.isHollow || !planet.cavernLakes || planet.cavernLakes.length === 0) return null;
    const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    for (const lake of planet.cavernLakes) {
        const diff = Math.abs(Math.atan2(Math.sin(norm - lake.centerAngle), Math.cos(norm - lake.centerAngle)));
        if (diff <= lake.span) {
            return {
                lake,
                normDist: diff / lake.span,
                waterLevel: lake.waterLevel,
                liquidType: lake.liquidType,
                name: lake.name
            };
        }
    }
    return null;
}

/**
 * Estado eruptivo de un géiser en el tiempo timeSec (0..1 de intensidad activa)
 */
function getGeyserIntensity(geyser, timeSec) {
    if (!geyser) return 0;
    const period = geyser.cyclePeriod || 6.0;
    const phaseT = ((timeSec + (geyser.phase || 0)) % period) / period;
    // Activo durante el ~48% del ciclo con subida y bajada orgánica
    if (phaseT > 0.52) return 0;
    const u = phaseT / 0.52;
    return Math.sin(u * Math.PI);
}

// ============================================================================
// MOTOR AVANZADO DE TOPOGRAFÍA PLANETARIA MULTI-ESCALA Y PROVINCIAS GEOLÓGICAS
// ============================================================================

function sampleCircleFbm(cx, cy, baseFreq, octaves, seed, ox, oy) {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    let freq = baseFreq;
    for (let o = 0; o < octaves; o++) {
        const n = smoothNoise2D(cx * freq + ox + o * 17.3, cy * freq + oy + o * 31.7, (seed + o * 1013) | 0);
        sum += (n * 2 - 1) * amp;
        norm += amp;
        amp *= 0.5;
        freq *= 2.04;
    }
    return norm > 0 ? (sum / norm) : 0;
}

function sampleCircleRidged(cx, cy, baseFreq, octaves, seed, ox, oy) {
    let sum = 0;
    let amp = 0.55;
    let norm = 0;
    let freq = baseFreq;
    for (let o = 0; o < octaves; o++) {
        const n = smoothNoise2D(cx * freq + ox + o * 23.1, cy * freq + oy + o * 41.9, (seed + o * 1997) | 0);
        const ridge = 1 - Math.abs(n * 2 - 1);
        sum += ridge * ridge * amp;
        norm += amp;
        amp *= 0.48;
        freq *= 2.09;
    }
    return norm > 0 ? (sum / norm) : 0;
}

const PROVINCE_SURFACE_SPECS = {
    vast_plains: {
        regionType: 'landing_plains',
        prefixes: ['Llanura', 'Planicie', 'Altiplano', 'Estepa', 'Mar', 'Explanada'],
        names: ['de la Calma', 'Serena', 'Astraea', 'del Silencio', 'Boreal', 'de Basalto', 'Ecuatorial', 'Dorada'],
        spanWeight: 1.65,
        baseElev: -2,
        noiseAmp: 6.5,
        ridgeAmp: 0,
        noiseKind: 'smooth',
        roughness: 0.25,
        bgRidgeMult: 0.38,
        intense: false
    },
    rolling_hills: {
        regionType: 'rolling_hills',
        prefixes: ['Colinas', 'Lomas', 'Valle', 'Pradera', 'Ondulación'],
        names: ['de Prometeo', 'del Viento', 'Esmeralda', 'de Cuarzo', 'Austral', 'de Bruma', 'Verdante'],
        spanWeight: 1.15,
        baseElev: 8,
        noiseAmp: 34,
        ridgeAmp: 10,
        noiseKind: 'fbm',
        roughness: 0.65,
        bgRidgeMult: 0.85,
        intense: false
    },
    mountain_range: {
        regionType: 'colossal_peaks',
        prefixes: ['Cordillera', 'Macizo', 'Sierra', 'Cumbres', 'Cresta'],
        names: ['Titánica', 'de los Observadores', 'de Hiperión', 'del Alba', 'de Obsidiana', 'de Granito', 'Escarlata'],
        spanWeight: 0.95,
        baseElev: 48,
        noiseAmp: 46,
        ridgeAmp: 82,
        noiseKind: 'ridged',
        roughness: 1.45,
        bgRidgeMult: 1.32,
        intense: true
    },
    lone_peaks_steppe: {
        regionType: 'lone_peaks_steppe',
        prefixes: ['Estepa', 'Planicie', 'Llano', 'Sabana'],
        names: ['de los Monolitos', 'del Centinela', 'de Agujas', 'de Vigía', 'Solitaria', 'del Horizonte'],
        spanWeight: 1.25,
        baseElev: 4,
        noiseAmp: 12,
        ridgeAmp: 6,
        noiseKind: 'smooth',
        roughness: 0.40,
        bgRidgeMult: 0.62,
        intense: false
    },
    crater_field: {
        regionType: 'crater_field',
        prefixes: ['Campo', 'Cuenca', 'Llanura', 'Cinturón'],
        names: ['de Impactos', 'de Cráteres', 'de Meteoros', 'de Tycho', 'de Ceniza', 'Marcado', 'de Hierro'],
        spanWeight: 1.05,
        baseElev: -6,
        noiseAmp: 15,
        ridgeAmp: 8,
        noiseKind: 'fbm',
        roughness: 0.72,
        bgRidgeMult: 0.72,
        intense: true
    },
    giant_basin: {
        regionType: 'giant_basin',
        prefixes: ['Gran Cuenca', 'Cráter', 'Abismo Circular', 'Anillo'],
        names: ['de Caloris', 'de Hellas', 'de Prometeo', 'del Coloso', 'de Aitken', 'Primordial'],
        spanWeight: 0.88,
        baseElev: -8,
        noiseAmp: 12,
        ridgeAmp: 6,
        noiseKind: 'fbm',
        roughness: 0.60,
        bgRidgeMult: 0.65,
        intense: true
    },
    mesa_plateau: {
        regionType: 'terraced_canyon',
        prefixes: ['Meseta', 'Altiplano', 'Terrazas', 'Cañón'],
        names: ['Escarlata', 'de Sedimento', 'de Colorado', 'del Viento', 'de Ocre', 'Escalonada'],
        spanWeight: 0.98,
        baseElev: 26,
        noiseAmp: 22,
        ridgeAmp: 14,
        noiseKind: 'terraced',
        roughness: 0.90,
        bgRidgeMult: 0.95,
        intense: true
    },
    rift_canyon: {
        regionType: 'rift_chasm',
        prefixes: ['Falla', 'Garganta', 'Cañón', 'Fosa', 'Grieta'],
        names: ['de Marineris', 'Tectónica', 'Abisal', 'de Sombra', 'del Manto', 'Profunda'],
        spanWeight: 0.78,
        baseElev: -12,
        noiseAmp: 20,
        ridgeAmp: 24,
        noiseKind: 'ridged',
        roughness: 1.25,
        bgRidgeMult: 1.05,
        intense: true
    },
    dune_sea: {
        regionType: 'dune_sea',
        prefixes: ['Mar de Dunas', 'Erg', 'Arenales', 'Desierto'],
        names: ['Dorado', 'del Viento', 'de Ámbar', 'de Sílice', 'Errante', 'Siroco'],
        spanWeight: 1.25,
        baseElev: 6,
        noiseAmp: 30,
        ridgeAmp: 18,
        noiseKind: 'dunes',
        roughness: 0.68,
        bgRidgeMult: 0.78,
        intense: false
    },
    spire_badlands: {
        regionType: 'spire_forest',
        prefixes: ['Agujas', 'Tierras Yermas', 'Bosque Pétreo', 'Prisma'],
        names: ['de Cuarzo', 'de Obsidiana', 'de Cristal', 'de Karst', 'del Vértice', 'Afilado'],
        spanWeight: 0.85,
        baseElev: 18,
        noiseAmp: 24,
        ridgeAmp: 42,
        noiseKind: 'ridged',
        roughness: 1.55,
        bgRidgeMult: 1.15,
        intense: true
    },
    volcanic_caldera: {
        regionType: 'volcanic_caldera',
        prefixes: ['Caldera', 'Campos', 'Domos', 'Falla Ígnea'],
        names: ['Piroclástica', 'de Azufre', 'de Ceniza', 'de Magma', 'de Hefesto', 'Ardiente'],
        spanWeight: 0.95,
        baseElev: 20,
        noiseAmp: 26,
        ridgeAmp: 36,
        noiseKind: 'ridged',
        roughness: 1.25,
        bgRidgeMult: 1.15,
        intense: true
    },
    glacial_seracs: {
        regionType: 'glacial_shelf',
        prefixes: ['Glaciar', 'Barrera', 'Agujas de Hielo', 'Séracs'],
        names: ['Boreal', 'de Nitrógeno', 'de Escarcha', 'Nix', 'de Diamante', 'Perpetuo'],
        spanWeight: 0.95,
        baseElev: 28,
        noiseAmp: 32,
        ridgeAmp: 62,
        noiseKind: 'ridged',
        roughness: 1.40,
        bgRidgeMult: 1.22,
        intense: true
    },
    ziggurat_monolith: {
        regionType: 'ziggurat_terrace',
        prefixes: ['Terrazas', 'Ciudadela', 'Zigurat', 'Calzada'],
        names: ['Ancestral', 'de Bismuto', 'Geométrica', 'del Arquitecto', 'Monolítica', 'del Éter'],
        spanWeight: 0.95,
        baseElev: 22,
        noiseAmp: 16,
        ridgeAmp: 10,
        noiseKind: 'stepped',
        roughness: 0.85,
        bgRidgeMult: 0.95,
        intense: true
    },
    organic_canopy: {
        regionType: 'mycelial_canopy',
        prefixes: ['Arboleda', 'Domos', 'Bosque', 'Cuenca Viva'],
        names: ['de Micelio', 'Bioluminiscente', 'de Esporas', 'Coralina', 'Simbiótica', 'del Dosel'],
        spanWeight: 1.05,
        baseElev: 14,
        noiseAmp: 28,
        ridgeAmp: 8,
        noiseKind: 'fbm',
        roughness: 0.78,
        bgRidgeMult: 0.92,
        intense: false
    }
};

/**
 * Define la gramática geológica y densidad de cráteres/montañas/llanuras según categoría y arquetipo del planeta
 */
function getCategorySurfaceProfile(archetype) {
    const cid = archetype.classId || 'terrestrial';
    const tp = archetype.terrainProfile || 'continental';
    const aid = archetype.id || '';

    // Base equilibrada por defecto
    let weights = {
        vast_plains: 28,
        rolling_hills: 18,
        mountain_range: 14,
        lone_peaks_steppe: 12,
        crater_field: 10,
        giant_basin: 6,
        mesa_plateau: 6,
        rift_canyon: 6
    };
    let craterStyle = 'crisp';
    let craterDensity = 1.0;
    let giantCraterChance = 0.42;
    let peakSharpness = 1.0;
    let reliefMult = clamp((archetype.reliefAmplitude || 1.35) / 1.35, 0.55, 2.2);

    if (aid === 'proto_impact' || aid === 'ferrum_core' || tp === 'cratered_lunar') {
        weights = {
            vast_plains: 24,       // Mares basálticos planos
            crater_field: 30,      // Campos densos multi-escala
            giant_basin: 18,       // Grandes cuencas de impacto
            lone_peaks_steppe: 10, // Picos aislados / eyecta
            mountain_range: 10,    // Anillos montañosos de cuenca
            rift_canyon: 8
        };
        craterStyle = 'crisp';
        craterDensity = 2.4;
        giantCraterChance = 0.72;
        peakSharpness = 1.05;
    } else if (aid === 'salt_flats') {
        weights = {
            vast_plains: 52,
            lone_peaks_steppe: 16,
            mesa_plateau: 14,
            dune_sea: 8,
            crater_field: 6,
            rift_canyon: 4
        };
        craterStyle = 'eroded';
        craterDensity = 0.55;
        giantCraterChance = 0.25;
        reliefMult *= 0.85;
    } else if (tp === 'zen_dunes') {
        weights = {
            vast_plains: 46,
            dune_sea: 30,
            rolling_hills: 14,
            lone_peaks_steppe: 6,
            crater_field: 4
        };
        craterStyle = 'eroded';
        craterDensity = 0.35;
        giantCraterChance = 0.18;
        reliefMult *= 0.75;
    } else if (tp === 'super_volcano' || archetype.hasSuperVolcano) {
        weights = {
            vast_plains: 42,
            volcanic_caldera: 22,
            rift_canyon: 14,
            crater_field: 12,
            lone_peaks_steppe: 10
        };
        craterStyle = 'volcanic_pit';
        craterDensity = 1.05;
        giantCraterChance = 0.35;
    } else if (aid === 'alpine_titans' || tp === 'alpine_titans') {
        weights = {
            mountain_range: 34,
            glacial_seracs: 24,
            vast_plains: 18,
            lone_peaks_steppe: 12,
            rift_canyon: 8,
            crater_field: 4
        };
        craterStyle = 'icy';
        craterDensity = 0.75;
        peakSharpness = 1.38;
    } else if (cid === 'terrestrial') {
        weights = (aid === 'amber_forest') ? {
            vast_plains: 28,
            mesa_plateau: 22,
            rolling_hills: 18,
            mountain_range: 12,
            lone_peaks_steppe: 10,
            crater_field: 6,
            rift_canyon: 4
        } : (aid === 'biolume' ? {
            vast_plains: 26,
            organic_canopy: 26,
            rolling_hills: 18,
            spire_badlands: 12,
            lone_peaks_steppe: 10,
            crater_field: 5,
            giant_basin: 3
        } : {
            vast_plains: 32,
            rolling_hills: 22,
            mountain_range: 16,
            lone_peaks_steppe: 11,
            mesa_plateau: 7,
            crater_field: 7,
            giant_basin: 3,
            rift_canyon: 2
        });
        craterStyle = 'eroded';
        craterDensity = 0.72;
        giantCraterChance = 0.32;
    } else if (cid === 'desert') {
        weights = {
            vast_plains: 30,
            dune_sea: 28,
            mesa_plateau: 18,
            lone_peaks_steppe: 10,
            crater_field: 8,
            rift_canyon: 4,
            giant_basin: 2
        };
        craterStyle = 'eroded';
        craterDensity = 0.85;
        giantCraterChance = 0.35;
    } else if (cid === 'cryogenic') {
        weights = {
            vast_plains: 25,
            glacial_seracs: 26,
            mountain_range: 18,
            crater_field: 13,
            lone_peaks_steppe: 8,
            rift_canyon: 6,
            giant_basin: 4
        };
        craterStyle = 'icy';
        craterDensity = 1.15;
        giantCraterChance = 0.45;
        peakSharpness = 1.25;
    } else if (cid === 'volcanic') {
        weights = {
            vast_plains: 22,
            volcanic_caldera: 25,
            spire_badlands: 14,
            rift_canyon: 14,
            mountain_range: 10,
            crater_field: 10,
            giant_basin: 5
        };
        craterStyle = 'volcanic_pit';
        craterDensity = 1.20;
        giantCraterChance = 0.42;
        peakSharpness = 1.20;
    } else if (cid === 'crystalline') {
        weights = {
            vast_plains: 24,
            spire_badlands: 26,
            mesa_plateau: 14,
            crater_field: 14,
            lone_peaks_steppe: 10,
            rift_canyon: 7,
            giant_basin: 5
        };
        craterStyle = 'faceted';
        craterDensity = 1.10;
        giantCraterChance = 0.42;
        peakSharpness = 1.32;
    } else if (cid === 'toxic') {
        weights = {
            vast_plains: 26,
            crater_field: 22,
            volcanic_caldera: 16,
            mesa_plateau: 12,
            rift_canyon: 10,
            giant_basin: 8,
            lone_peaks_steppe: 6
        };
        craterStyle = 'eroded';
        craterDensity = 1.45;
        giantCraterChance = 0.55;
    } else if (cid === 'megalithic' || cid === 'artificial') {
        weights = {
            vast_plains: 32,
            ziggurat_monolith: 34,
            mesa_plateau: 12,
            rift_canyon: 10,
            crater_field: 8,
            giant_basin: 4
        };
        craterStyle = 'stepped';
        craterDensity = 0.80;
        giantCraterChance = 0.30;
    } else if (cid === 'living') {
        weights = {
            vast_plains: 26,
            organic_canopy: 34,
            rolling_hills: 16,
            spire_badlands: 10,
            crater_field: 8,
            lone_peaks_steppe: 6
        };
        craterStyle = 'organic';
        craterDensity = 0.70;
        giantCraterChance = 0.25;
    } else if (cid === 'shattered' || cid === 'gravitic') {
        weights = {
            vast_plains: 18,
            rift_canyon: 22,
            spire_badlands: 20,
            mountain_range: 14,
            crater_field: 14,
            giant_basin: 7,
            lone_peaks_steppe: 5
        };
        craterStyle = 'crisp';
        craterDensity = 1.45;
        giantCraterChance = 0.50;
        peakSharpness = 1.28;
    } else if (cid === 'hollow') {
        weights = {
            vast_plains: 24,
            spire_badlands: 18,
            crater_field: 18,
            rift_canyon: 16,
            mountain_range: 12,
            lone_peaks_steppe: 7,
            giant_basin: 5
        };
        craterStyle = 'crisp';
        craterDensity = 1.25;
        giantCraterChance = 0.40;
    } else if (cid === 'cometary') {
        weights = {
            glacial_seracs: 26,
            spire_badlands: 22,
            rift_canyon: 18,
            crater_field: 18,
            vast_plains: 10,
            giant_basin: 6
        };
        craterStyle = 'icy';
        craterDensity = 1.65;
        giantCraterChance = 0.45;
        peakSharpness = 1.35;
    } else if (cid === 'temporal' || cid === 'anomaly') {
        weights = {
            vast_plains: 25,
            spire_badlands: 18,
            ziggurat_monolith: 14,
            crater_field: 14,
            mountain_range: 11,
            dune_sea: 10,
            giant_basin: 8
        };
        craterStyle = 'faceted';
        craterDensity = 1.20;
        giantCraterChance = 0.48;
    }

    return {
        weights,
        craterStyle,
        craterDensity,
        giantCraterChance,
        peakSharpness,
        reliefMult
    };
}

function pickWeightedProvinceType(weights, prevSpec, consecIntense, rng) {
    const entries = Object.entries(weights);
    let total = 0;
    const adjusted = [];
    for (let i = 0; i < entries.length; i++) {
        const key = entries[i][0];
        let w = entries[i][1];
        const spec = PROVINCE_SURFACE_SPECS[key];
        if (!spec) continue;
        // Ritmo orgánico: tras 1-2 zonas escarpadas, favorecer llanuras/colinas/estepas para no recargar
        if (consecIntense >= 2 && spec.intense) w *= 0.22;
        else if (consecIntense === 1 && spec.intense) w *= 0.60;
        if (consecIntense >= 1 && !spec.intense) w *= 1.55;
        // Evitar repetir exactamente la misma provincia dos veces seguidas
        if (prevSpec && prevSpec.key === key) w *= 0.25;
        if (w > 0) {
            total += w;
            adjusted.push({ key, w });
        }
    }
    if (total <= 0) return 'vast_plains';
    let roll = rng() * total;
    for (let i = 0; i < adjusted.length; i++) {
        roll -= adjusted[i].w;
        if (roll <= 0) return adjusted[i].key;
    }
    return adjusted[adjusted.length - 1].key;
}

/**
 * Construye provincias contiguas sobre [0, 2π] con ritmo geológico equilibrado
 */
function buildPlanetProvinces(radius, profile, isOrigin, rng) {
    const provCount = radius < 800
        ? (5 + Math.floor(rng() * 3))
        : (radius < 4000
            ? (8 + Math.floor(rng() * 5))
            : (radius < 38000
                ? (18 + Math.floor(rng() * 8))
                : (radius < 64000 ? (24 + Math.floor(rng() * 9)) : (28 + Math.floor(rng() * 10)))));

    const picked = [];
    let consecIntense = 0;
    let prevSpec = null;

    for (let i = 0; i < provCount; i++) {
        let key;
        if (isOrigin && i === 0) {
            key = 'vast_plains';
        } else if (isOrigin && i === 1) {
            key = 'mountain_range';
        } else if (isOrigin && i === 2) {
            key = 'crater_field';
        } else if (isOrigin && i === 3) {
            key = 'giant_basin';
        } else if (isOrigin && i === provCount - 1) {
            key = 'lone_peaks_steppe';
        } else {
            key = pickWeightedProvinceType(profile.weights, prevSpec, consecIntense, rng);
        }
        const spec = PROVINCE_SURFACE_SPECS[key] || PROVINCE_SURFACE_SPECS.vast_plains;
        const spanW = spec.spanWeight * (0.72 + rng() * 0.62);
        consecIntense = spec.intense ? (consecIntense + 1) : 0;
        prevSpec = { key, spec };
        picked.push({ key, spec, spanW });
    }

    // Rotar si es origen para que la provincia 0 quede centrada en el cenit (-PI/2 => 1.5*PI)
    const totalW = picked.reduce((acc, p) => acc + p.spanW, 0);
    const originAngle = 1.5 * Math.PI;
    let cursor = isOrigin ? (originAngle - (picked[0].spanW / totalW) * Math.PI) : 0;

    const provinces = [];
    const regions = [];
    for (let i = 0; i < picked.length; i++) {
        const item = picked[i];
        const span = (item.spanW / totalW) * Math.PI * 2;
        const rawStart = cursor;
        const rawEnd = cursor + span;
        cursor = rawEnd;

        const normCenter = ((rawStart + span * 0.5) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const sSpec = item.spec;
        const rDef = REGION_TYPES[sSpec.regionType] || REGION_TYPES.landing_plains;
        let regName;
        if (isOrigin && i === 0) {
            regName = 'Plataforma Central de Ignición';
        } else if (isOrigin && i === 1) {
            regName = 'Cordillera de los Observadores';
        } else {
            const pfx = sSpec.prefixes[Math.floor(rng() * sSpec.prefixes.length)];
            const nmx = sSpec.names[Math.floor(rng() * sSpec.names.length)];
            regName = `${pfx} ${nmx}`;
        }

        const startMod = ((rawStart % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const endMod = startMod + span;
        const provObj = {
            index: i,
            key: item.key,
            type: sSpec.regionType,
            name: regName,
            def: rDef,
            spec: sSpec,
            startAngle: startMod,
            endAngle: endMod,
            centerAngle: normCenter,
            span,
            hazard: rDef.hazardMod || 'Estable'
        };
        provinces.push(provObj);
        regions.push(provObj);
    }
    return { provinces, regions };
}

function getProvinceBlendAt(provinces, theta) {
    const TWO_PI = Math.PI * 2;
    let norm = theta % TWO_PI;
    if (norm < 0) norm += TWO_PI;

    let activeIdx = 0;
    for (let i = 0; i < provinces.length; i++) {
        const pv = provinces[i];
        const a0 = pv.startAngle;
        const a1 = pv.endAngle;
        if ((norm >= a0 && norm < a1) || (a1 > TWO_PI && norm + TWO_PI < a1)) {
            activeIdx = i;
            break;
        }
    }

    const cur = provinces[activeIdx];
    let localTheta = norm;
    if (localTheta < cur.startAngle) localTheta += TWO_PI;
    const distStart = localTheta - cur.startAngle;
    const distEnd = cur.endAngle - localTheta;
    const blendZone = Math.min(cur.span * 0.24, 0.085);

    if (distStart < blendZone && provinces.length > 1) {
        const prev = provinces[(activeIdx - 1 + provinces.length) % provinces.length];
        const t = smoothstep(0, blendZone * 2, distStart + blendZone);
        return { primary: cur, secondary: prev, weightPrimary: t };
    }
    if (distEnd < blendZone && provinces.length > 1) {
        const next = provinces[(activeIdx + 1) % provinces.length];
        const t = smoothstep(0, blendZone * 2, distEnd + blendZone);
        return { primary: cur, secondary: next, weightPrimary: t };
    }
    return { primary: cur, secondary: null, weightPrimary: 1.0 };
}

function isAngleInExclusionZone(angle, zones, marginRad = 0) {
    for (let i = 0; i < zones.length; i++) {
        const z = zones[i];
        const diff = Math.abs(Math.atan2(Math.sin(angle - z.angle), Math.cos(angle - z.angle)));
        if (diff < (z.span + marginRad)) return true;
    }
    return false;
}

/**
 * Estampa un cráter realista multi-escala directamente en los vértices afectados
 */
function stampCrater(heights, numVerts, radius, cr) {
    const TWO_PI = Math.PI * 2;
    const stepRad = TWO_PI / numVerts;
    const halfVerts = Math.ceil(cr.span / stepRad) + 2;
    const normCenter = ((cr.angle % TWO_PI) + TWO_PI) % TWO_PI;
    const centerIdx = Math.round((normCenter / TWO_PI) * numVerts);

    // Línea base de cuerda para cráteres gigantes (suaviza laderas subyacentes sin crear escalones)
    let leftBaseR = radius;
    let rightBaseR = radius;
    if (cr.tier === 'giant') {
        const iL = ((centerIdx - halfVerts) % numVerts + numVerts) % numVerts;
        const iR = ((centerIdx + halfVerts) % numVerts + numVerts) % numVerts;
        leftBaseR = heights[iL];
        rightBaseR = heights[iR];
    }

    for (let di = -halfVerts; di <= halfVerts; di++) {
        const idx = ((centerIdx + di) % numVerts + numVerts) % numVerts;
        const theta = (idx / numVerts) * TWO_PI;
        const dAng = Math.atan2(Math.sin(theta - normCenter), Math.cos(theta - normCenter));
        const absDiff = Math.abs(dAng);
        if (absDiff >= cr.span) continue;

        const u = absDiff / cr.span; // 0 centro .. 0.68 cresta .. 1.0 faldón exterior
        const rimU = cr.style === 'volcanic_pit' ? 0.76 : 0.68;
        let delta = 0;

        if (u < rimU) {
            const b = u / rimU; // 0..1 dentro de la cubeta
            let bowlPower = cr.tier === 'giant' ? 2.8 : (cr.tier === 'medium' ? 2.3 : 1.9);
            if (cr.style === 'volcanic_pit') bowlPower = 3.2;
            else if (cr.style === 'eroded') bowlPower = 1.75;

            let bowl = -(1 - Math.pow(b, bowlPower)) * cr.depth;

            // Terrazas de deslizamiento en paredes interiores de cráteres gigantes
            if (cr.tier === 'giant' && b > 0.48 && b < 0.96) {
                const terrEnv = smoothstep(0.48, 0.66, b) * (1 - smoothstep(0.88, 0.98, b));
                bowl += Math.sin((b - 0.48) * Math.PI * 5.0) * cr.depth * 0.055 * terrEnv;
            }
            // Facetado cristalino o escalonado megalítico
            if (cr.style === 'faceted' || cr.style === 'stepped') {
                const steps = cr.tier === 'giant' ? 5 : 3;
                const q = Math.round((1 - Math.pow(b, 1.8)) * steps) / steps;
                bowl = lerp(bowl, -q * cr.depth, 0.45);
            }

            // Labio elevado hacia la cresta del borde
            const rimSlope = cr.style === 'organic'
                ? smoothstep(0.55, 1.0, b)
                : Math.pow(smoothstep(0.45, 1.0, b), 1.35);
            delta = bowl + rimSlope * cr.rimHeight;

            // Pico de rebote central (en cráteres gigantes y medianos complejos)
            if (cr.hasCentralPeak && b < 0.30) {
                const pNorm = b / 0.30;
                const peakShape = Math.pow(Math.cos(pNorm * Math.PI * 0.5), 1.65);
                delta += cr.depth * (cr.peakRatio || 0.48) * peakShape;
            }
        } else {
            // Faldón de eyecta exterior (C0 continuo en rimU, decae suavemente a 0 en u=1)
            const e = (u - rimU) / (1 - rimU);
            const skirt = Math.pow(1 - e, 2.1) * (1 + 0.35 * e);
            delta = cr.rimHeight * skirt;
        }

        if (cr.tier === 'giant' && u < 0.85) {
            const chordT = clamp((dAng / cr.span) * 0.5 + 0.5, 0, 1);
            const chordR = lerp(leftBaseR, rightBaseR, chordT);
            const flattenW = 0.58 * (1 - smoothstep(0.55, 0.85, u));
            heights[idx] = lerp(heights[idx], chordR, flattenW) + delta;
        } else {
            heights[idx] += delta;
        }
    }
}

/**
 * Estampa formaciones geológicas esculpidas (picos, macizos, mesetas, cañones, agujas, zigurats, dunas, domos)
 */
function stampLandform(heights, numVerts, radius, feat) {
    const TWO_PI = Math.PI * 2;
    const stepRad = TWO_PI / numVerts;
    const halfVerts = Math.ceil(feat.span / stepRad) + 2;
    const normCenter = ((feat.angle % TWO_PI) + TWO_PI) % TWO_PI;
    const centerIdx = Math.round((normCenter / TWO_PI) * numVerts);
    const asym = feat.asymmetry || 0;

    for (let di = -halfVerts; di <= halfVerts; di++) {
        const idx = ((centerIdx + di) % numVerts + numVerts) % numVerts;
        const theta = (idx / numVerts) * TWO_PI;
        const dAng = Math.atan2(Math.sin(theta - normCenter), Math.cos(theta - normCenter));
        const absU = Math.abs(dAng) / feat.span;
        if (absU >= 1.0) continue;

        const signedU = dAng / feat.span; // -1..1
        const edgeFade = smoothstep(1.0, 0.72, absU);
        const sShifted = clamp(signedU - asym * (1 - absU * absU), -1, 1);
        const absS = Math.abs(sShifted);
        let delta = 0;

        if (feat.kind === 'peak') {
            // Pico montañoso escarpado con talud suave en la base y posible hombro lateral
            const sharpExp = clamp(1.45 * (feat.sharpness || 1.0), 1.15, 2.35);
            const mainPeak = Math.pow(Math.max(0, 1 - absS), sharpExp) * feat.height;
            const shoulderOff = asym >= 0 ? -0.38 : 0.38;
            const shoulder = Math.exp(-Math.pow((signedU - shoulderOff) / 0.24, 2)) * feat.height * 0.34;
            const ridgeDetail = Math.sin(signedU * Math.PI * 5 + (feat.phase || 0)) * feat.height * 0.045 * (1 - absU);
            delta = (mainPeak + shoulder + ridgeDetail) * edgeFade;
        } else if (feat.kind === 'massif') {
            // Macizo montañoso ancho con múltiples crestas y valles intermedios
            const env = Math.pow(Math.cos(absU * Math.PI * 0.5), 1.15);
            const lobes = 0.68 + 0.32 * Math.cos(signedU * Math.PI * (feat.lobes || 2.6) + (feat.phase || 0));
            const sub = Math.sin(signedU * Math.PI * 7.0 + (feat.phase || 0)) * 0.08;
            delta = feat.height * env * clamp(lobes + sub, 0.2, 1.15);
        } else if (feat.kind === 'mesa') {
            // Meseta de cima plana y laderas acantiladas
            const wall = smoothstep(0.96, 0.46, absS);
            const plateauRipple = Math.sin(signedU * Math.PI * 4 + (feat.phase || 0)) * 2.2 * (1 - absU);
            delta = feat.height * wall + plateauRipple * wall;
        } else if (feat.kind === 'canyon') {
            // Garganta/cañón profundo con bordes levemente elevados y terrazas en las paredes
            if (absU > 0.68) {
                const rimU = (absU - 0.68) / 0.32;
                delta = feat.depth * 0.14 * Math.sin(rimU * Math.PI);
            } else {
                const cNorm = absU / 0.68;
                const cut = Math.pow(Math.cos(cNorm * Math.PI * 0.5), 1.15);
                const wallStep = (cNorm > 0.28 && cNorm < 0.85) ? Math.sin(cNorm * Math.PI * 4) * feat.depth * 0.05 : 0;
                delta = -feat.depth * cut + wallStep;
            }
        } else if (feat.kind === 'spire') {
            // Aguja pétrea / prisma cristalino estrecho y dramático
            const needle = Math.pow(Math.max(0, 1 - absS), 2.15) * feat.height;
            delta = needle * smoothstep(1.0, 0.82, absU);
        } else if (feat.kind === 'ziggurat') {
            // Zigurat monumental escalonado en terrazas planas con biseles limpios
            const rawEnv = Math.max(0, 1 - absU);
            const tiers = feat.tiers || 4;
            const scaled = rawEnv * tiers;
            const baseTier = Math.floor(scaled);
            const frac = scaled - baseTier;
            const bevel = smoothstep(0.0, 0.22, frac);
            const stepped = (baseTier + bevel) / tiers;
            delta = feat.height * clamp(stepped, 0, 1);
        } else if (feat.kind === 'dune_crest') {
            // Duna barján asimétrica (ladera de barlovento suave, cara de avalancha empinada)
            const dir = feat.windDir || 1;
            const uW = signedU * dir; // -1..1
            let profile = 0;
            if (uW < 0.25) {
                profile = smoothstep(-1.0, 0.25, uW);
            } else {
                profile = Math.pow(1 - smoothstep(0.25, 0.92, uW), 1.45);
            }
            delta = feat.height * profile * edgeFade;
        } else if (feat.kind === 'bio_dome') {
            // Domo orgánico fúngico con ligera depresión de esporas opcional en la cima
            const dome = Math.pow(Math.cos(absU * Math.PI * 0.5), 0.72);
            let topDimple = 0;
            if (feat.hasDimple && absU < 0.34) {
                topDimple = -feat.height * 0.28 * Math.cos((absU / 0.34) * Math.PI * 0.5);
            }
            delta = (feat.height * dome + topDimple) * edgeFade;
        } else if (feat.kind === 'volcano_cone') {
            // Cono volcánico con caldera hundida en la cima
            const cone = Math.pow(Math.cos(absU * Math.PI * 0.5), 1.35) * feat.height;
            let caldera = 0;
            if (absU < 0.28) {
                caldera = -feat.height * 0.46 * Math.pow(Math.cos((absU / 0.28) * Math.PI * 0.5), 1.5);
            }
            delta = (cone + caldera) * edgeFade;
        }

        heights[idx] += delta;
    }
}

/**
 * Pipeline completo de generación de relieve planetario:
 * 1) Silueta macro (cometas/asteroides binarios/mundos ojo)
 * 2) Provincias variadas con ruido continuo sin costuras y amplias llanuras
 * 3) Estampado de montañas, picos, mesetas, cañones, agujas, dunas y zigurats
 * 4) Estampado multi-escala de cráteres (gigantes, normales y racimos de chicos)
 * 5) Super-volcanes, cuencas de lagos y bocas de cavernas huecas
 */
function generatePlanetSurfaceHeights(params) {
    const {
        radius, numVerts, archetype, isOrigin, isMoonlet,
        lakes, superVolcanoes, caveEntrances,
        heightScale, arcWidthScale, px, py, bodyRNG
    } = params;

    const heights = new Float64Array(numVerts);
    const TWO_PI = Math.PI * 2;
    const terrainProfile = archetype.terrainProfile || 'continental';

    // Tablas trigonométricas precalculadas
    const cosT = new Float64Array(numVerts);
    const sinT = new Float64Array(numVerts);
    for (let i = 0; i < numVerts; i++) {
        const theta = (i / numVerts) * TWO_PI;
        cosT[i] = Math.cos(theta);
        sinT[i] = Math.sin(theta);
    }

    if (archetype.isLiquid) {
        const f1 = Math.floor(bodyRNG() * 4) + 5;
        const p1 = bodyRNG() * TWO_PI;
        const p2 = bodyRNG() * TWO_PI;
        for (let i = 0; i < numVerts; i++) {
            const theta = (i / numVerts) * TWO_PI;
            heights[i] = radius + Math.sin(theta * f1 + p1) * 3.8 + Math.cos(theta * (f1 * 2 + 3) + p2) * 1.8;
        }
        const oceanReg = {
            index: 0,
            key: 'vast_plains',
            type: 'fluid_basin',
            name: 'Océano Abisal Global',
            def: REGION_TYPES.fluid_basin,
            startAngle: 0,
            endAngle: TWO_PI,
            centerAngle: 0,
            span: TWO_PI,
            hazard: REGION_TYPES.fluid_basin.hazardMod
        };
        return { heights, regions: [oceanReg], provinces: [oceanReg], craters: [] };
    }

    const catProfile = getCategorySurfaceProfile(archetype);
    const { provinces, regions } = buildPlanetProvinces(radius, catProfile, isOrigin, bodyRNG);

    const circumference = TWO_PI * radius;
    const baseWaveMeters = 880 * arcWidthScale;
    const baseFreq = clamp(circumference / Math.max(120, baseWaveMeters), 4.0, 520.0);
    const fineFreq = clamp(baseFreq * 3.8, 12.0, 1400.0);
    const seedA = Math.floor(bodyRNG() * 1000000);
    const seedB = Math.floor(bodyRNG() * 1000000);
    const ox = bodyRNG() * 200 - 100;
    const oy = bodyRNG() * 200 - 100;
    const lobeP1 = bodyRNG() * TWO_PI;
    const lobeP2 = bodyRNG() * TWO_PI;

    const rScale = catProfile.reliefMult * heightScale;

    // 1. Campo continuo de provincias geológicas y macro-silueta
    for (let i = 0; i < numVerts; i++) {
        const theta = (i / numVerts) * TWO_PI;
        const cx = cosT[i];
        const cy = sinT[i];

        const blend = getProvinceBlendAt(provinces, theta);
        const s1 = blend.primary.spec;
        const s2 = blend.secondary ? blend.secondary.spec : s1;
        const w1 = blend.weightPrimary;
        const w2 = 1 - w1;

        const baseElev = s1.baseElev * w1 + s2.baseElev * w2;
        const noiseAmp = s1.noiseAmp * w1 + s2.noiseAmp * w2;
        const ridgeAmp = s1.ridgeAmp * w1 + s2.ridgeAmp * w2;
        const roughness = s1.roughness * w1 + s2.roughness * w2;

        const fbmVal = sampleCircleFbm(cx, cy, baseFreq, 3, seedA, ox, oy);
        const ridgeVal = sampleCircleRidged(cx, cy, baseFreq * 0.85, 3, seedB, ox, oy);
        const fineVal = sampleCircleFbm(cx, cy, fineFreq, 2, seedA + 4099, ox, oy);

        let localH = baseElev + fbmVal * noiseAmp + (ridgeVal - 0.35) * ridgeAmp + fineVal * (3.8 * roughness);

        // Modulación de estilo específico del arquetipo
        if (s1.noiseKind === 'dunes') {
            const duneSig = Math.sin(fbmVal * 4.5 + fineVal * 1.4);
            localH = baseElev + duneSig * noiseAmp * 0.72 + fineVal * 3.5;
        } else if (s1.noiseKind === 'stepped' || s1.noiseKind === 'terraced') {
            const steps = s1.noiseKind === 'stepped' ? 4 : 5;
            const steppedFbm = Math.round(fbmVal * steps) / steps;
            localH = baseElev + lerp(fbmVal, steppedFbm, 0.72) * (noiseAmp + ridgeAmp * 0.5) + fineVal * 2.2;
        } else if (s1.noiseKind === 'smooth') {
            localH = baseElev + fbmVal * noiseAmp + fineVal * 1.6;
        }

        localH *= rScale;

        // Siluetas asimétricas para cometas y asteroides binarios de contacto
        if (terrainProfile === 'irregular_comet') {
            localH += Math.cos(theta * 2 + lobeP1) * (radius * 0.13)
                    + Math.sin(theta * 3 + lobeP2) * (radius * 0.07);
        } else if (terrainProfile === 'lobed_asteroid') {
            localH += Math.cos(theta * 2 + lobeP1) * (radius * 0.19)
                    - Math.pow(Math.abs(Math.sin(theta + lobeP1)), 1.5) * (radius * 0.08);
        } else if (archetype.isEyeballWorld) {
            const sunGx = (typeof GALAXY_SUN_POS !== 'undefined') ? GALAXY_SUN_POS.x : 0;
            const sunGy = (typeof GALAXY_SUN_POS !== 'undefined') ? GALAXY_SUN_POS.y : -900000;
            const eyeSun = Math.atan2(sunGy - py, sunGx - px);
            const sunDot = Math.cos(theta - eyeSun);
            if (sunDot > 0.25) localH += (sunDot - 0.25) * 28 * rScale;
        }

        heights[i] = radius + localH;
    }

    // Construir zonas de exclusión para no tapar lagos, super-volcanes, bocas de cueva ni plataforma origen
    const exclusionZones = [];
    if (isOrigin) {
        exclusionZones.push({ angle: 1.5 * Math.PI, span: 0.085 });
    }
    for (const lk of lakes) {
        exclusionZones.push({ angle: lk.centerAngle, span: lk.span * 1.15 });
    }
    for (const sv of superVolcanoes) {
        exclusionZones.push({ angle: sv.angle, span: sv.span * 0.95 });
    }
    for (const cv of caveEntrances) {
        exclusionZones.push({ angle: cv.centerAngle, span: cv.span * 1.05 });
    }

    const placedLandmarks = [];
    const placedCraters = [];
    const craters = [];
    const widthToRad = (meters) => (meters * arcWidthScale) / Math.max(240, radius);

    // 2. Estampado de Formaciones Geológicas Discretas por Provincia (Picos, Montañas, Mesetas, Cañones, Dunas, Zigurats)
    for (const pv of provinces) {
        const key = pv.key;
        const margin = Math.min(pv.span * 0.14, widthToRad(120));
        if (pv.span <= margin * 2.2) continue;

        const usableStart = pv.startAngle + margin;
        const usableSpan = pv.span - margin * 2;
        const provMeters = pv.span * radius;

        if (key === 'mountain_range') {
            const count = clamp(Math.round(provMeters / (850 * arcWidthScale)), 2, 6);
            for (let m = 0; m < count; m++) {
                const ang = usableStart + ((m + 0.2 + bodyRNG() * 0.6) / count) * usableSpan;
                const span = clamp(widthToRad(260 + bodyRNG() * 320), 0.008, pv.span * 0.42);
                if (isAngleInExclusionZone(ang, exclusionZones, span * 0.6)) continue;
                if (isAngleInExclusionZone(ang, placedLandmarks, span * 0.55)) continue;
                const isPeak = bodyRNG() < 0.62;
                const featH = (isPeak ? (105 + bodyRNG() * 145) : (85 + bodyRNG() * 115)) * rScale;
                stampLandform(heights, numVerts, radius, {
                    kind: isPeak ? 'peak' : 'massif',
                    angle: ang,
                    span,
                    height: featH,
                    sharpness: catProfile.peakSharpness * (0.9 + bodyRNG() * 0.3),
                    asymmetry: (bodyRNG() - 0.5) * 0.48,
                    lobes: 2.2 + bodyRNG() * 1.6,
                    phase: bodyRNG() * TWO_PI
                });
                placedLandmarks.push({ angle: ang, span: span * 0.72 });
            }
        } else if (key === 'lone_peaks_steppe') {
            const count = (provMeters > 3200 * arcWidthScale && bodyRNG() < 0.65) ? 2 : 1;
            for (let m = 0; m < count; m++) {
                const ang = usableStart + ((m + 0.25 + bodyRNG() * 0.5) / count) * usableSpan;
                const isSpire = bodyRNG() < 0.35;
                const span = clamp(widthToRad(isSpire ? (150 + bodyRNG() * 110) : (290 + bodyRNG() * 210)), 0.007, pv.span * 0.36);
                if (isAngleInExclusionZone(ang, exclusionZones, span * 0.8)) continue;
                stampLandform(heights, numVerts, radius, {
                    kind: isSpire ? 'spire' : 'peak',
                    angle: ang,
                    span,
                    height: (isSpire ? (85 + bodyRNG() * 85) : (105 + bodyRNG() * 115)) * rScale,
                    sharpness: catProfile.peakSharpness * 1.05,
                    asymmetry: (bodyRNG() - 0.5) * 0.42,
                    phase: bodyRNG() * TWO_PI
                });
                placedLandmarks.push({ angle: ang, span: span * 0.85 });
            }
        } else if (key === 'mesa_plateau') {
            const count = clamp(Math.round(provMeters / (1100 * arcWidthScale)), 1, 4);
            for (let m = 0; m < count; m++) {
                const ang = usableStart + ((m + 0.2 + bodyRNG() * 0.6) / count) * usableSpan;
                const span = clamp(widthToRad(260 + bodyRNG() * 280), 0.010, pv.span * 0.42);
                if (isAngleInExclusionZone(ang, exclusionZones, span * 0.7) || isAngleInExclusionZone(ang, placedLandmarks, span * 0.65)) continue;
                stampLandform(heights, numVerts, radius, {
                    kind: 'mesa',
                    angle: ang,
                    span,
                    height: (55 + bodyRNG() * 85) * rScale,
                    asymmetry: (bodyRNG() - 0.5) * 0.25,
                    phase: bodyRNG() * TWO_PI
                });
                placedLandmarks.push({ angle: ang, span: span * 0.85 });
            }
        } else if (key === 'rift_canyon') {
            const count = (provMeters > 2600 * arcWidthScale && bodyRNG() < 0.55) ? 2 : 1;
            for (let m = 0; m < count; m++) {
                const ang = usableStart + ((m + 0.25 + bodyRNG() * 0.5) / count) * usableSpan;
                const span = clamp(widthToRad(190 + bodyRNG() * 210), 0.008, pv.span * 0.45);
                if (isAngleInExclusionZone(ang, exclusionZones, span * 0.6) || isAngleInExclusionZone(ang, placedLandmarks, span * 0.6)) continue;
                stampLandform(heights, numVerts, radius, {
                    kind: 'canyon',
                    angle: ang,
                    span,
                    depth: (75 + bodyRNG() * 110) * rScale
                });
                placedLandmarks.push({ angle: ang, span: span * 0.85 });
            }
        } else if (key === 'spire_badlands') {
            const count = clamp(Math.round(provMeters / (560 * arcWidthScale)), 2, 7);
            for (let m = 0; m < count; m++) {
                const ang = usableStart + ((m + 0.15 + bodyRNG() * 0.7) / count) * usableSpan;
                const span = clamp(widthToRad(115 + bodyRNG() * 105), 0.005, pv.span * 0.28);
                if (isAngleInExclusionZone(ang, exclusionZones, span * 0.7) || isAngleInExclusionZone(ang, placedLandmarks, span * 0.5)) continue;
                stampLandform(heights, numVerts, radius, {
                    kind: 'spire',
                    angle: ang,
                    span,
                    height: (72 + bodyRNG() * 98) * rScale,
                    asymmetry: (bodyRNG() - 0.5) * 0.35
                });
                placedLandmarks.push({ angle: ang, span: span * 0.75 });
            }
        } else if (key === 'volcanic_caldera') {
            const count = clamp(Math.round(provMeters / (1250 * arcWidthScale)), 1, 3);
            for (let m = 0; m < count; m++) {
                const ang = usableStart + ((m + 0.25 + bodyRNG() * 0.5) / count) * usableSpan;
                const span = clamp(widthToRad(260 + bodyRNG() * 240), 0.010, pv.span * 0.42);
                if (isAngleInExclusionZone(ang, exclusionZones, span * 0.7) || isAngleInExclusionZone(ang, placedLandmarks, span * 0.65)) continue;
                stampLandform(heights, numVerts, radius, {
                    kind: bodyRNG() < 0.7 ? 'volcano_cone' : 'peak',
                    angle: ang,
                    span,
                    height: (85 + bodyRNG() * 115) * rScale,
                    sharpness: 1.25
                });
                placedLandmarks.push({ angle: ang, span: span * 0.8 });
            }
        } else if (key === 'glacial_seracs') {
            const count = clamp(Math.round(provMeters / (750 * arcWidthScale)), 2, 5);
            for (let m = 0; m < count; m++) {
                const ang = usableStart + ((m + 0.2 + bodyRNG() * 0.6) / count) * usableSpan;
                const isCrevasse = (m % 3 === 2) && bodyRNG() < 0.55;
                const span = clamp(widthToRad(isCrevasse ? (140 + bodyRNG() * 120) : (160 + bodyRNG() * 190)), 0.006, pv.span * 0.35);
                if (isAngleInExclusionZone(ang, exclusionZones, span * 0.7) || isAngleInExclusionZone(ang, placedLandmarks, span * 0.6)) continue;
                stampLandform(heights, numVerts, radius, isCrevasse ? {
                    kind: 'canyon',
                    angle: ang,
                    span,
                    depth: (65 + bodyRNG() * 85) * rScale
                } : {
                    kind: bodyRNG() < 0.65 ? 'peak' : 'spire',
                    angle: ang,
                    span,
                    height: (90 + bodyRNG() * 120) * rScale,
                    sharpness: 1.32,
                    asymmetry: (bodyRNG() - 0.5) * 0.45
                });
                placedLandmarks.push({ angle: ang, span: span * 0.8 });
            }
        } else if (key === 'dune_sea') {
            const count = clamp(Math.round(provMeters / (850 * arcWidthScale)), 2, 6);
            const windDir = bodyRNG() < 0.5 ? 1 : -1;
            for (let m = 0; m < count; m++) {
                const ang = usableStart + ((m + 0.2 + bodyRNG() * 0.6) / count) * usableSpan;
                const span = clamp(widthToRad(240 + bodyRNG() * 210), 0.008, pv.span * 0.38);
                if (isAngleInExclusionZone(ang, exclusionZones, span * 0.6) || isAngleInExclusionZone(ang, placedLandmarks, span * 0.65)) continue;
                stampLandform(heights, numVerts, radius, {
                    kind: 'dune_crest',
                    angle: ang,
                    span,
                    height: (32 + bodyRNG() * 44) * rScale,
                    windDir
                });
                placedLandmarks.push({ angle: ang, span: span * 0.75 });
            }
        } else if (key === 'ziggurat_monolith') {
            const count = clamp(Math.round(provMeters / (1150 * arcWidthScale)), 1, 4);
            for (let m = 0; m < count; m++) {
                const ang = usableStart + ((m + 0.25 + bodyRNG() * 0.5) / count) * usableSpan;
                const isTrench = bodyRNG() < 0.24;
                const span = clamp(widthToRad(isTrench ? 180 : (280 + bodyRNG() * 220)), 0.009, pv.span * 0.40);
                if (isAngleInExclusionZone(ang, exclusionZones, span * 0.7) || isAngleInExclusionZone(ang, placedLandmarks, span * 0.7)) continue;
                stampLandform(heights, numVerts, radius, isTrench ? {
                    kind: 'canyon',
                    angle: ang,
                    span,
                    depth: (60 + bodyRNG() * 70) * rScale
                } : {
                    kind: 'ziggurat',
                    angle: ang,
                    span,
                    height: (70 + bodyRNG() * 95) * rScale,
                    tiers: 3 + Math.floor(bodyRNG() * 3)
                });
                placedLandmarks.push({ angle: ang, span: span * 0.85 });
            }
        } else if (key === 'organic_canopy') {
            const count = clamp(Math.round(provMeters / (900 * arcWidthScale)), 2, 5);
            for (let m = 0; m < count; m++) {
                const ang = usableStart + ((m + 0.2 + bodyRNG() * 0.6) / count) * usableSpan;
                const span = clamp(widthToRad(200 + bodyRNG() * 190), 0.008, pv.span * 0.38);
                if (isAngleInExclusionZone(ang, exclusionZones, span * 0.65) || isAngleInExclusionZone(ang, placedLandmarks, span * 0.65)) continue;
                stampLandform(heights, numVerts, radius, {
                    kind: 'bio_dome',
                    angle: ang,
                    span,
                    height: (52 + bodyRNG() * 72) * rScale,
                    hasDimple: bodyRNG() < 0.55
                });
                placedLandmarks.push({ angle: ang, span: span * 0.8 });
            }
        } else if (key === 'rolling_hills' && bodyRNG() < 0.55) {
            const ang = usableStart + (0.25 + bodyRNG() * 0.5) * usableSpan;
            const span = clamp(widthToRad(320 + bodyRNG() * 260), 0.010, pv.span * 0.40);
            if (!isAngleInExclusionZone(ang, exclusionZones, span * 0.7)) {
                stampLandform(heights, numVerts, radius, {
                    kind: 'massif',
                    angle: ang,
                    span,
                    height: (58 + bodyRNG() * 58) * rScale,
                    lobes: 2.0 + bodyRNG(),
                    phase: bodyRNG() * TWO_PI
                });
                placedLandmarks.push({ angle: ang, span: span * 0.8 });
            }
        }
    }

    // 3. Sistema Multi-Escala de Cráteres (Gigantes, Normales y Chicos + Racimos Localizados)
    const tryAddCrater = (cr, allowPartialOverlap = false) => {
        if (isAngleInExclusionZone(cr.angle, exclusionZones, cr.span * 0.95)) return false;
        const margin = allowPartialOverlap ? cr.span * 0.35 : cr.span * 0.85;
        if (cr.tier === 'giant' && isAngleInExclusionZone(cr.angle, placedLandmarks, cr.span * 0.55)) return false;
        if (isAngleInExclusionZone(cr.angle, placedCraters, margin)) return false;

        stampCrater(heights, numVerts, radius, cr);
        craters.push(cr);
        placedCraters.push({ angle: cr.angle, span: cr.span });
        return true;
    };

    for (const pv of provinces) {
        const key = pv.key;
        const provMeters = pv.span * radius;
        const margin = Math.min(pv.span * 0.12, widthToRad(90));
        if (pv.span <= margin * 2.2) continue;
        const usableStart = pv.startAngle + margin;
        const usableSpan = pv.span - margin * 2;

        // A. Cráteres Gigantes (Cuencas con pico central y paredes en terraza)
        const wantGiant = (key === 'giant_basin') ||
            (key === 'crater_field' && bodyRNG() < catProfile.giantCraterChance) ||
            ((key === 'vast_plains' || key === 'rolling_hills') && bodyRNG() < 0.09 * catProfile.craterDensity);

        if (wantGiant && provMeters > 700 * arcWidthScale) {
            const gAng = usableStart + (0.28 + bodyRNG() * 0.44) * usableSpan;
            const gSpan = clamp(widthToRad(480 + bodyRNG() * 620), 0.016, Math.min(0.14, pv.span * 0.46));
            const gDepth = (95 + bodyRNG() * 115) * heightScale * (catProfile.craterStyle === 'eroded' ? 0.82 : 1.0);
            tryAddCrater({
                angle: gAng,
                span: gSpan,
                depth: gDepth,
                rimHeight: gDepth * (0.34 + bodyRNG() * 0.16),
                hasCentralPeak: bodyRNG() < 0.78,
                peakRatio: 0.36 + bodyRNG() * 0.22,
                tier: 'giant',
                style: catProfile.craterStyle
            }, false);
        }

        // B. Cráteres Normales / Medianos
        let medTarget = 0;
        if (key === 'crater_field') medTarget = Math.round((1.5 + bodyRNG() * 2.5) * catProfile.craterDensity);
        else if (key === 'giant_basin') medTarget = Math.round((0.8 + bodyRNG() * 1.2) * catProfile.craterDensity);
        else if (key === 'vast_plains' || key === 'lone_peaks_steppe') medTarget = (bodyRNG() < 0.22 * catProfile.craterDensity) ? 1 : 0;
        else if (key !== 'mountain_range' && key !== 'rift_canyon') medTarget = (bodyRNG() < 0.40 * catProfile.craterDensity) ? 1 : 0;

        medTarget = clamp(medTarget, 0, Math.max(1, Math.floor(provMeters / (650 * arcWidthScale))));
        for (let c = 0; c < medTarget; c++) {
            const mAng = usableStart + bodyRNG() * usableSpan;
            const mSpan = clamp(widthToRad(115 + bodyRNG() * 145), 0.0055, pv.span * 0.28);
            const mDepth = (28 + bodyRNG() * 38) * heightScale;
            tryAddCrater({
                angle: mAng,
                span: mSpan,
                depth: mDepth,
                rimHeight: mDepth * (0.30 + bodyRNG() * 0.18),
                hasCentralPeak: mSpan > widthToRad(190) && bodyRNG() < 0.45,
                peakRatio: 0.28 + bodyRNG() * 0.14,
                tier: 'medium',
                style: catProfile.craterStyle
            }, bodyRNG() < 0.18);
        }

        // C. Cráteres Chicos (aislados o en racimos ocasionales dentro de campos de cráteres)
        let smallTarget = 0;
        if (key === 'crater_field') smallTarget = Math.round((3 + bodyRNG() * 5) * catProfile.craterDensity);
        else if (key === 'giant_basin') smallTarget = Math.round((2 + bodyRNG() * 3) * catProfile.craterDensity);
        else if (key === 'vast_plains' || key === 'lone_peaks_steppe') smallTarget = (bodyRNG() < 0.38 * catProfile.craterDensity) ? (1 + (bodyRNG() < 0.35 ? 1 : 0)) : 0;
        else smallTarget = (bodyRNG() < 0.45 * catProfile.craterDensity) ? 1 : 0;

        smallTarget = clamp(smallTarget, 0, 12);
        // En campos de cráteres, opcionalmente agrupar parte de los chicos en un racimo localizado
        const clusterAnchor = (key === 'crater_field' && smallTarget >= 4 && bodyRNG() < 0.55)
            ? (usableStart + (0.2 + bodyRNG() * 0.6) * usableSpan)
            : null;
        for (let c = 0; c < smallTarget; c++) {
            let sAng;
            if (clusterAnchor !== null && c < Math.ceil(smallTarget * 0.55)) {
                sAng = clusterAnchor + (bodyRNG() - 0.5) * Math.min(usableSpan * 0.32, widthToRad(520));
            } else {
                sAng = usableStart + bodyRNG() * usableSpan;
            }
            const sSpan = clamp(widthToRad(36 + bodyRNG() * 48), 0.0022, 0.045);
            const sDepth = (9 + bodyRNG() * 17) * heightScale;
            const crObj = {
                angle: ((sAng % TWO_PI) + TWO_PI) % TWO_PI,
                span: sSpan,
                depth: sDepth,
                rimHeight: sDepth * (0.26 + bodyRNG() * 0.18),
                hasCentralPeak: false,
                tier: 'small',
                style: catProfile.craterStyle
            };
            if (!isAngleInExclusionZone(crObj.angle, exclusionZones, crObj.span)) {
                stampCrater(heights, numVerts, radius, crObj);
                craters.push(crObj);
            }
        }
    }

    // 4. Tallado de Escudos Super-Volcánicos (Olympus Mons) y Bocas de Cavernas Huecas
    for (const sv of superVolcanoes) {
        const halfVerts = Math.ceil(sv.span / (TWO_PI / numVerts)) + 2;
        const centerIdx = Math.round(((((sv.angle % TWO_PI) + TWO_PI) % TWO_PI) / TWO_PI) * numVerts);
        for (let di = -halfVerts; di <= halfVerts; di++) {
            const idx = ((centerIdx + di) % numVerts + numVerts) % numVerts;
            const theta = (idx / numVerts) * TWO_PI;
            const svDiff = Math.abs(Math.atan2(Math.sin(theta - sv.angle), Math.cos(theta - sv.angle)));
            if (svDiff < sv.span) {
                const u = svDiff / sv.span;
                const shieldCurve = Math.pow(Math.cos(u * Math.PI * 0.5), 1.55);
                let volcanoElev = sv.height * shieldCurve;
                if (u < 0.26) {
                    const calderaNorm = u / 0.26;
                    volcanoElev -= sv.calderaDepth * Math.pow(Math.cos(calderaNorm * Math.PI * 0.5), 1.8);
                }
                heights[idx] += volcanoElev;
            }
        }
    }

    for (const lk of lakes) {
        const halfVerts = Math.ceil(lk.span / (TWO_PI / numVerts)) + 2;
        const centerIdx = Math.round(((((lk.centerAngle % TWO_PI) + TWO_PI) % TWO_PI) / TWO_PI) * numVerts);
        for (let di = -halfVerts; di <= halfVerts; di++) {
            const idx = ((centerIdx + di) % numVerts + numVerts) % numVerts;
            const theta = (idx / numVerts) * TWO_PI;
            const lDiff = Math.abs(Math.atan2(Math.sin(theta - lk.centerAngle), Math.cos(theta - lk.centerAngle)));
            if (lDiff < lk.span) {
                const u = lDiff / lk.span;
                const bowl = Math.pow(Math.cos(u * Math.PI * 0.5), 1.75);
                heights[idx] -= (lk.depth + 8) * bowl;
            }
        }
    }

    for (const cave of caveEntrances) {
        const halfVerts = Math.ceil(cave.span / (TWO_PI / numVerts)) + 2;
        const centerIdx = Math.round(((((cave.centerAngle % TWO_PI) + TWO_PI) % TWO_PI) / TWO_PI) * numVerts);
        for (let di = -halfVerts; di <= halfVerts; di++) {
            const idx = ((centerIdx + di) % numVerts + numVerts) % numVerts;
            const theta = (idx / numVerts) * TWO_PI;
            const cDiff = Math.abs(Math.atan2(Math.sin(theta - cave.centerAngle), Math.cos(theta - cave.centerAngle)));
            if (cDiff < cave.span) {
                const u = cDiff / cave.span;
                if (u < 0.65) {
                    const throat = Math.pow(1 - u / 0.65, 1.6);
                    heights[idx] -= (cave.depth + 55) * throat;
                } else {
                    const rimU = (u - 0.65) / 0.35;
                    heights[idx] += 24 * Math.sin(rimU * Math.PI);
                }
            }
        }
    }

    // 5. Meseta segura de lanzamiento en Cuna del Éter (-PI/2)
    if (isOrigin) {
        for (let i = 0; i < numVerts; i++) {
            const theta = (i / numVerts) * TWO_PI;
            const distFromTop = Math.abs(Math.atan2(Math.sin(theta + Math.PI / 2), Math.cos(theta + Math.PI / 2)));
            if (distFromTop < 0.105) {
                const smoothBlend = clamp((distFromTop - 0.042) / 0.063, 0, 1);
                const t = smoothBlend * smoothBlend * (3 - 2 * smoothBlend);
                heights[i] = lerp(radius, heights[i], t);
            }
        }
    }

    // 6. Micro-suavizado muy sutil (1 pasada en mundos orgánicos; 0 en megalíticos/cúbicos/cristalinos) para conservar aristas y picos
    if (terrainProfile !== 'stepped_megalith' && terrainProfile !== 'stepped_cubic' && terrainProfile !== 'cubic_anomaly' && archetype.classId !== 'crystalline') {
        const copy = heights.slice();
        for (let i = 0; i < numVerts; i++) {
            const prev = copy[(i - 1 + numVerts) % numVerts];
            const curr = copy[i];
            const next = copy[(i + 1) % numVerts];
            heights[i] = prev * 0.14 + curr * 0.72 + next * 0.14;
        }
    }

    return { heights, regions, provinces, craters };
}

/**
 * Suavizado circular O(N) mediante suma de prefijos para generar estratos geológicos instantáneamente
 */
function circularBoxBlur(src, numVerts, halfWin) {
    const out = new Float64Array(numVerts);
    if (halfWin <= 0) {
        out.set(src);
        return out;
    }
    const winSize = halfWin * 2 + 1;
    let sum = 0;
    for (let k = -halfWin; k <= halfWin; k++) {
        sum += src[((k % numVerts) + numVerts) % numVerts];
    }
    for (let i = 0; i < numVerts; i++) {
        out[i] = sum / winSize;
        const outIdx = ((i - halfWin) % numVerts + numVerts) % numVerts;
        const inIdx = (i + halfWin + 1) % numVerts;
        sum += src[inIdx] - src[outIdx];
    }
    return out;
}

function buildStrataProfiles(heights, numVerts, radius, scaleFactor, bodyRNG) {
    const strataProfiles = [];
    const resMult = Math.max(1, Math.round(numVerts / 1440));
    const strataSpecs = [
        { depth: 18 * scaleFactor, win: 4 * resMult,  blendToSphere: 0.12 },
        { depth: 44 * scaleFactor, win: 10 * resMult, blendToSphere: 0.26 },
        { depth: 82 * scaleFactor, win: 18 * resMult, blendToSphere: 0.44 },
        { depth: 135 * scaleFactor, win: 30 * resMult, blendToSphere: 0.65 }
    ];
    const fFold = 5 + Math.floor(bodyRNG() * 4);
    const pFold = bodyRNG() * Math.PI * 2;
    let current = heights;

    for (let s = 0; s < strataSpecs.length; s++) {
        const spec = strataSpecs[s];
        const prof = circularBoxBlur(current, numVerts, Math.min(Math.floor(numVerts * 0.12), spec.win));
        current = prof;
        const layerRadii = new Float64Array(numVerts);
        for (let i = 0; i < numVerts; i++) {
            const theta = (i / numVerts) * Math.PI * 2;
            const gentleFold = Math.sin(theta * (fFold + s) + pFold + s * 1.1) * (3.5 + s * 1.5) * scaleFactor;
            const baseR = lerp(prof[i], radius, spec.blendToSphere) - spec.depth + gentleFold;
            layerRadii[i] = Math.max(radius * 0.55, baseR);
        }
        strataProfiles.push(layerRadii);
    }
    return strataProfiles;
}

/**
 * Genera formaciones naturales de superficie respetando lagos, cavernas, pendientes extremas y bioma local
 */
function generateSurfaceProps(params) {
    const {
        radius, numVerts, heights, archetype, isOrigin,
        provinces, regions, lakes, caveEntrances,
        heightScale, scaleFactor, px, py, bodyRNG
    } = params;

    const props = [];
    const terrainProfile = archetype.terrainProfile || 'continental';
    let planetNaturalPalette = ['layered_boulder', 'mesa_butte'];
    if (archetype.isLiquid) {
        planetNaturalPalette = ['coral_atoll', 'coastal_arch'];
    } else if (archetype.classId === 'living') {
        planetNaturalPalette = ['giant_mushroom', 'coral_tower', 'biolume_canopy'];
    } else if (archetype.classId === 'megalithic') {
        planetNaturalPalette = ['monolith_pylon', 'stargate_arch', 'bismuth_terrace'];
    } else if (archetype.classId === 'shattered') {
        planetNaturalPalette = ['floating_obelisk', 'basalt_columns', 'crystal_outcrop'];
    } else if (archetype.classId === 'cometary') {
        planetNaturalPalette = ['glacial_ridge', 'volcanic_fumarole', 'ice_arch'];
    } else if (archetype.classId === 'hollow') {
        planetNaturalPalette = ['crystal_outcrop', 'layered_boulder', 'volcanic_fumarole'];
    } else if (archetype.classId === 'terrestrial' || archetype.id === 'biolume_forest' || archetype.id === 'verdant_gaia' || archetype.id === 'cradle_prime') {
        planetNaturalPalette = ['organic_grove', 'biolume_canopy', 'layered_boulder'];
    } else if (archetype.classId === 'desert' || terrainProfile === 'terraced_mesa' || terrainProfile === 'barchan_dunes') {
        planetNaturalPalette = ['mesa_butte', 'desert_arch', 'layered_boulder'];
    } else if (archetype.classId === 'cryogenic' || terrainProfile === 'alpine_glacial') {
        planetNaturalPalette = ['glacial_ridge', 'ice_arch'];
    } else if (archetype.classId === 'volcanic') {
        planetNaturalPalette = ['basalt_columns', 'volcanic_fumarole'];
    } else if (archetype.classId === 'crystalline' || archetype.id === 'quartz_geode' || archetype.id === 'amethyst_hollow') {
        planetNaturalPalette = ['crystal_outcrop', 'basalt_columns'];
    } else if (archetype.classId === 'toxic') {
        planetNaturalPalette = ['organic_grove', 'volcanic_fumarole', 'mesa_butte'];
    } else if (archetype.classId === 'anomaly') {
        planetNaturalPalette = ['crystal_outcrop', 'desert_arch', 'stargate_arch'];
    } else if (archetype.classId === 'gravitic') {
        planetNaturalPalette = ['floating_obelisk', 'basalt_columns', 'crystal_outcrop'];
    } else if (archetype.classId === 'artificial') {
        planetNaturalPalette = ['monolith_pylon', 'stargate_arch', 'bismuth_terrace'];
    } else if (archetype.classId === 'temporal') {
        planetNaturalPalette = ['crystal_outcrop', 'glacial_ridge', 'desert_arch'];
    }

    const featureCount = archetype.isLiquid
        ? Math.floor(10 * scaleFactor)
        : Math.floor((26 + bodyRNG() * 14) * clamp(scaleFactor, 0.65, 2.2));

    const TWO_PI = Math.PI * 2;
    for (let i = 0; i < featureCount; i++) {
        const ang = ((i / featureCount) * TWO_PI + (bodyRNG() - 0.5) * (Math.PI / featureCount) + TWO_PI) % TWO_PI;

        if (isOrigin && Math.abs(Math.atan2(Math.sin(ang + Math.PI / 2), Math.cos(ang + Math.PI / 2))) < 0.08) continue;

        let inBlocked = false;
        for (const cave of caveEntrances) {
            if (Math.abs(Math.atan2(Math.sin(ang - cave.centerAngle), Math.cos(ang - cave.centerAngle))) < cave.span * 0.78) {
                inBlocked = true; break;
            }
        }
        if (inBlocked) continue;
        for (const lk of lakes) {
            if (Math.abs(Math.atan2(Math.sin(ang - lk.centerAngle), Math.cos(ang - lk.centerAngle))) < lk.span * 0.92) {
                inBlocked = true; break;
            }
        }
        if (inBlocked) continue;

        const pv = (provinces && provinces.length > 0)
            ? getPlanetProvinceAtAngle({ provinces }, ang)
            : regions[0];

        // Mantener las grandes llanuras despejadas y espaciosas (solo algunos elementos ocasionales)
        if (pv && pv.key === 'vast_plains' && bodyRNG() < 0.58) continue;

        // Comprobar pendiente local para no plantar props anchos en acantilados casi verticales
        if (!archetype.isLiquid && numVerts > 0) {
            const idx = Math.floor((ang / TWO_PI) * numVerts) % numVerts;
            const iPrev = (idx - 2 + numVerts) % numVerts;
            const iNext = (idx + 2) % numVerts;
            const arcDist = Math.max(1, (TWO_PI * radius / numVerts) * 4);
            const slope = Math.abs(heights[iNext] - heights[iPrev]) / arcDist;
            if (slope > 0.78) continue;
        }

        let formationType = planetNaturalPalette[Math.floor(bodyRNG() * planetNaturalPalette.length)];
        if (archetype.isEyeballWorld) {
            const sunGx = (typeof GALAXY_SUN_POS !== 'undefined') ? GALAXY_SUN_POS.x : 0;
            const sunGy = (typeof GALAXY_SUN_POS !== 'undefined') ? GALAXY_SUN_POS.y : -900000;
            const eyeballSunAngle = Math.atan2(sunGy - py, sunGx - px);
            const sunDot = Math.cos(ang - eyeballSunAngle);
            if (sunDot > 0.35) {
                formationType = bodyRNG() < 0.5 ? 'volcanic_fumarole' : 'mesa_butte';
            } else if (sunDot < -0.35) {
                formationType = bodyRNG() < 0.5 ? 'glacial_ridge' : 'ice_arch';
            } else {
                formationType = bodyRNG() < 0.55 ? 'biolume_canopy' : 'crystal_outcrop';
            }
        }

        const isHeroLandmark = (formationType === 'giant_mushroom' || formationType === 'monolith_pylon' || formationType === 'stargate_arch' || formationType === 'floating_obelisk' || formationType === 'coral_tower');
        const arcMeters = ((isHeroLandmark ? 32 : 24) + bodyRNG() * 30) * clamp(heightScale, 0.5, 1.8);
        const angularSpan = arcMeters / radius;
        const elevation = ((isHeroLandmark ? 22 : 13) + bodyRNG() * (isHeroLandmark ? 24 : 18)) * (pv && pv.key === 'mountain_range' ? 1.15 : 1.0) * clamp(heightScale, 0.5, 1.8);

        props.push({
            index: props.length,
            angle: ang,
            span: angularSpan,
            height: elevation,
            scale: 0.9 + bodyRNG() * 0.45,
            asymmetry: (bodyRNG() - 0.5) * 0.35,
            seed: bodyRNG(),
            subCount: 3 + Math.floor(bodyRNG() * 3),
            propType: formationType,
            regionName: pv ? pv.name : 'Superficie',
            hasFlags: !archetype.isLiquid && (pv && (pv.key === 'mountain_range' || pv.key === 'lone_peaks_steppe')) && bodyRNG() < 0.25
        });
    }

    return props;
}
