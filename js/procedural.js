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

    // Probabilidad de existencia condicionada por la densidad galáctica
    if (!isOrigin && (rng() > 0.65 && galacticDensity < 0.45)) {
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
    if (isOrigin) {
        archetype = ARCHETYPES.find(a => a.id === 'terra') || ARCHETYPES[0];
    } else if (isMoonlet) {
        // Los satélites suelen ser mundos menores, núcleos metálicos o anomalías de impacto
        const moonletArchetypes = ARCHETYPES.filter(a =>
            a.id === 'dwarf_planetoid' || a.id === 'proto_impact' || a.id === 'ferrum_core' || a.id === 'nitrogen_ice' || a.id === 'shattered_core'
        );
        archetype = moonletArchetypes[Math.floor(bodyRNG() * moonletArchetypes.length)] || ARCHETYPES[0];
    } else {
        archetype = ARCHETYPES[Math.floor(bodyRNG() * ARCHETYPES.length)];
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

    // --- REGIONES GEOLÓGICAS HETEROGÉNEAS (ESTILO BIOMAS DE MINECRAFT EN UN MISMO PLANETA) ---
    const regions = [];
    const regionCount = isOrigin ? 4 : (Math.floor(bodyRNG() * 3) + 5); // 5 a 7 biomas en la superficie
    const candidateTypes = (archetype.possibleRegions && archetype.possibleRegions.length > 0)
        ? archetype.possibleRegions
        : ['landing_plains', 'colossal_peaks', 'impact_crater', 'spire_forest', 'terraced_canyon'];

    for (let r = 0; r < regionCount; r++) {
        const centerAngle = (r / regionCount) * Math.PI * 2;
        const span = (Math.PI * 2 / regionCount) * (0.88 + bodyRNG() * 0.28);
        
        let typeKey;
        let regName;
        if (isOrigin && r === 0) {
            typeKey = 'landing_plains';
            regName = 'Plataforma Central de Ignición';
        } else if (isOrigin && r === 1) {
            typeKey = 'colossal_peaks';
            regName = 'Cordillera de los Observadores';
        } else if (isOrigin && r === 2) {
            typeKey = 'ether_anomaly';
            regName = 'Santuario de los Núcleos';
        } else if (isOrigin && r === 3) {
            typeKey = 'terraced_canyon';
            regName = 'Altiplano Austral';
        } else {
            typeKey = candidateTypes[Math.floor(bodyRNG() * candidateTypes.length)];
            const regionPrefixes = ['Cordillera', 'Valle', 'Planicie', 'Garganta', 'Cuenca', 'Meseta', 'Fosa', 'Vértice', 'Terraza', 'Arco'];
            const regionNames = ['de Prometeo', 'de la Calma', 'Astraea', 'de Obsidiana', 'del Viento', 'de Ceniza', 'Nix', 'Titánica', 'del Silencio', 'Boreal', 'de Cuarzo', 'de Hiperión'];
            regName = `${regionPrefixes[Math.floor(bodyRNG() * regionPrefixes.length)]} ${regionNames[Math.floor(bodyRNG() * regionNames.length)]}`;
        }

        const rDef = REGION_TYPES[typeKey] || REGION_TYPES.landing_plains;
        regions.push({
            name: regName,
            type: typeKey,
            def: rDef,
            centerAngle,
            span,
            hazard: rDef.hazardMod || 'Estable'
        });
    }

    // --- CRÁTERES DE IMPACTO MULTI-ESCALA DETERMINISTAS ---
    const craters = [];
    if (!archetype.isLiquid) {
        const isCraterHeavy = archetype.terrainProfile === 'cratered_lunar' || archetype.id === 'proto_impact' || archetype.id === 'ferrum_core';
        const craterCount = isOrigin ? 4 : (isCraterHeavy ? (12 + Math.floor(bodyRNG() * 10)) : (4 + Math.floor(bodyRNG() * 6)));
        for (let c = 0; c < craterCount; c++) {
            const cAng = bodyRNG() * Math.PI * 2;
            if (isOrigin && Math.abs(Math.atan2(Math.sin(cAng + Math.PI / 2), Math.cos(cAng + Math.PI / 2))) < 0.32) continue;
            const cSpan = (isCraterHeavy ? (0.045 + bodyRNG() * 0.11) : (0.035 + bodyRNG() * 0.075));
            const cDepth = (16 + bodyRNG() * 34) * (isCraterHeavy ? 1.45 : 1.0) * Math.sqrt(radius / 2600);
            craters.push({
                angle: cAng,
                span: cSpan,
                depth: cDepth,
                rimHeight: cDepth * (0.32 + bodyRNG() * 0.18),
                hasCentralPeak: cSpan > 0.08 && bodyRNG() < 0.65
            });
        }
    }

    // --- CUENCAS Y LAGOS CINEMÁTICOS DE ALTA DEFINICIÓN ---
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
            let lAng = (l / lakeCount) * Math.PI * 2 + (bodyRNG() - 0.5) * 0.35;
            if (isOrigin) {
                lAng = (l === 0) ? 0.38 : 2.40; // Lejos de la plataforma central (-PI/2)
            }
            const lSpan = isMultiLakes ? (0.045 + bodyRNG() * 0.035) : (0.055 + bodyRNG() * 0.045);
            const lDepth = (18 + bodyRNG() * 16) * Math.sqrt(radius / 2600);
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
            const vSpan = 0.22 + bodyRNG() * 0.08; // ~600 a 900 metros de arco
            const vHeight = (150 + bodyRNG() * 65) * Math.sqrt(radius / 2600);
            const calderaDepth = (40 + bodyRNG() * 18) * Math.sqrt(radius / 2600);
            superVolcanoes.push({
                angle: vAngle,
                span: vSpan,
                height: vHeight,
                calderaDepth,
                hasActiveCaldera: true
            });
            // Añadir el lago de magma en la cima de la caldera del volcán
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
    const caveEntrances = [];
    const cavernCeilingHeights = [];
    const cavernFloorHeights = [];
    if (isHollow) {
        const cCount = (bodyRNG() < 0.45) ? 2 : 1;
        for (let c = 0; c < cCount; c++) {
            const cAngle = (c === 0) ? (bodyRNG() * Math.PI * 2) : wrapAngle(caveEntrances[0].centerAngle + Math.PI * (0.85 + bodyRNG() * 0.3));
            const cSpan = 0.15 + bodyRNG() * 0.05; // ~400 a 550 metros de arco (amplia entrada)
            const cDepth = (85 + bodyRNG() * 45) * Math.sqrt(radius / 2600);
            caveEntrances.push({
                centerAngle: cAngle,
                span: cSpan,
                depth: cDepth,
                name: (c === 0) ? 'Boca del Abismo Boreal' : 'Falla de los Ecos Subterráneos'
            });
        }
    }

    // --- TOPOGRAFÍA GEOLÓGICA DIFERENCIADA POR ARQUETIPO (RESOLUCIÓN ADAPTATIVA SEGÚN RADIO) ---
    const numVerts = radius < 1500 ? 480 : (radius < 8000 ? 720 : (radius < 35000 ? 1440 : (radius < 70000 ? 2160 : 2880)));
    const heights = [];
    const terrainProfile = archetype.terrainProfile || 'continental';
    const reliefMult = (archetype.reliefAmplitude || 1.35) * Math.sqrt(radius / 2600);
    const localDetailScale = Math.max(1, Math.round(Math.sqrt(radius / 2600)));

    const freq1 = Math.floor(bodyRNG() * 4) + 5;
    const freq2 = freq1 * 2 + 3;
    const freq3 = freq1 * 4 + 5;
    const freq4 = freq1 * 9 + 11;
    const p1 = bodyRNG() * Math.PI * 2;
    const p2 = bodyRNG() * Math.PI * 2;
    const p3 = bodyRNG() * Math.PI * 2;
    const p4 = bodyRNG() * Math.PI * 2;

    for (let i = 0; i < numVerts; i++) {
        const theta = (i / numVerts) * Math.PI * 2;

        // 1. Mezcla suave de regiones geológicas circundantes
        let regionalHeightMod = 1.0;
        let regionalRoughness = 1.0;
        let regionalOffset = 0;
        let dominantRegType = 'landing_plains';
        let maxRegWeight = -1;

        for (const reg of regions) {
            const diff = Math.abs(Math.atan2(Math.sin(theta - reg.centerAngle), Math.cos(theta - reg.centerAngle)));
            if (diff < reg.span * 0.55) {
                const normDist = diff / (reg.span * 0.55);
                const weight = Math.cos(normDist * Math.PI * 0.5) ** 2;
                if (weight > maxRegWeight) {
                    maxRegWeight = weight;
                    dominantRegType = reg.type;
                }

                regionalHeightMod += (reg.def.heightMod - 1.0) * weight;
                regionalRoughness += (reg.def.roughness - 1.0) * weight;

                if (reg.type === 'impact_crater') {
                    if (normDist < 0.62) {
                        const bowl = Math.cos((normDist / 0.62) * Math.PI * 0.5);
                        regionalOffset += -42 * bowl * weight * reliefMult;
                    } else {
                        regionalOffset += 20 * Math.sin(((normDist - 0.62) / 0.38) * Math.PI) * weight * reliefMult;
                    }
                } else if (reg.type === 'rift_chasm') {
                    if (normDist < 0.45) {
                        const chasm = Math.pow(1 - normDist / 0.45, 1.6);
                        regionalOffset += -56 * chasm * weight * reliefMult;
                    }
                } else if (reg.type === 'fluid_basin') {
                    if (normDist < 0.65) {
                        regionalOffset += -34 * Math.cos((normDist / 0.65) * Math.PI * 0.5) * weight * reliefMult;
                    }
                }
            }
        }

        // 2. Estampado de cráteres individuales con bordes eyectados y pico de rebote central
        for (const cr of craters) {
            const cDiff = Math.abs(Math.atan2(Math.sin(theta - cr.angle), Math.cos(theta - cr.angle)));
            if (cDiff < cr.span) {
                const u = cDiff / cr.span;
                if (u < 0.72) {
                    const bowlNorm = u / 0.72;
                    let cDelta = -cr.depth * (1 - bowlNorm * bowlNorm);
                    if (cr.hasCentralPeak && bowlNorm < 0.26) {
                        cDelta += cr.depth * 0.48 * Math.cos((bowlNorm / 0.26) * Math.PI * 0.5);
                    }
                    regionalOffset += cDelta;
                } else {
                    const rimNorm = (u - 0.72) / 0.28;
                    regionalOffset += cr.rimHeight * Math.sin(rimNorm * Math.PI);
                }
            }
        }

        // 3. Tallado de cuencas de lagos y mares con playas suaves
        for (const lk of lakes) {
            const lDiff = Math.abs(Math.atan2(Math.sin(theta - lk.centerAngle), Math.cos(theta - lk.centerAngle)));
            if (lDiff < lk.span) {
                const u = lDiff / lk.span;
                const bowl = Math.pow(Math.cos(u * Math.PI * 0.5), 1.75);
                regionalOffset -= (lk.depth + 8) * bowl;
            }
        }

        // 4. Estampado de Escudos Volcánicos Colosales (Olympus Mons)
        for (const sv of superVolcanoes) {
            const svDiff = Math.abs(Math.atan2(Math.sin(theta - sv.angle), Math.cos(theta - sv.angle)));
            if (svDiff < sv.span) {
                const u = svDiff / sv.span;
                const shieldCurve = Math.pow(Math.cos(u * Math.PI * 0.5), 1.55);
                let volcanoElev = sv.height * shieldCurve;
                if (u < 0.26) {
                    const calderaNorm = u / 0.26;
                    const calderaDip = -sv.calderaDepth * Math.pow(Math.cos(calderaNorm * Math.PI * 0.5), 1.8);
                    volcanoElev += calderaDip;
                }
                regionalOffset += volcanoElev;
            }
        }

        // 5. Estampado de Bocas de Abismo y Cuevas Subterráneas (Mundos Huecos)
        for (const cave of caveEntrances) {
            const cDiff = Math.abs(Math.atan2(Math.sin(theta - cave.centerAngle), Math.cos(theta - cave.centerAngle)));
            if (cDiff < cave.span) {
                const u = cDiff / cave.span;
                if (u < 0.65) {
                    const throat = Math.pow(1 - u / 0.65, 1.8);
                    regionalOffset -= (cave.depth + 45) * throat;
                } else {
                    const rimU = (u - 0.65) / 0.35;
                    regionalOffset += 16 * Math.sin(rimU * Math.PI);
                }
            }
        }

        // Alturas internas de techo y suelo si el planeta es hueco
        if (isHollow) {
            const stalactiteWave = Math.sin(theta * 20 + p1) * 12 + Math.cos(theta * 40 + p2) * 6;
            cavernCeilingHeights.push(radius * 0.84 + stalactiteWave * Math.sqrt(radius / 2600));
            const stalagmiteWave = Math.sin(theta * 16 + p3) * 14 + Math.cos(theta * 32 + p4) * 7;
            cavernFloorHeights.push(radius * 0.48 + stalagmiteWave * Math.sqrt(radius / 2600));
        }

        regionalHeightMod = clamp(regionalHeightMod, 0.14, 3.6);
        regionalRoughness = clamp(regionalRoughness, 0.18, 2.8);

        let h = 0;
        if (archetype.isLiquid) {
            h = Math.sin(theta * freq1 + p1) * 3.8 + Math.cos(theta * freq2 + p2) * 1.8;
        } else {
            // Señales armónicas base continuas y suaves
            const w1 = Math.sin(theta * freq1 + p1);
            const w2 = Math.cos(theta * freq2 + p2);
            const w3 = Math.sin(theta * freq3 + p3);
            const w4 = Math.cos(theta * freq4 + p4);

            // Cresta suavizada C2 (sin picos quebrados)
            const smoothAbs1 = Math.sqrt(w1 * w1 + 0.06);
            const smoothAbs2 = Math.sqrt(w2 * w2 + 0.06);

            if (terrainProfile === 'super_volcano' || isSuperVolcano) {
                // Llanuras basálticas llanas para resaltar los volcanes escudo colosales
                h = (w1 * 8 + w2 * 4) * regionalRoughness;
            } else if (terrainProfile === 'alpine_titans' || dominantRegType === 'alpine_spires') {
                // Cordilleras hiper-escarpadas con picos titánicos
                const ridge1 = Math.pow(Math.max(0, 1.14 - smoothAbs1), 1.95) * 72 - 18;
                const ridge2 = Math.pow(Math.max(0, 1.12 - smoothAbs2), 2.1) * 38 - 10;
                const needle = Math.pow(w3 * 0.5 + 0.5, 3.2) * 28;
                h = (ridge1 + ridge2 + needle) * regionalHeightMod + w4 * 2.8;
            } else if (terrainProfile === 'zen_dunes' || dominantRegType === 'zen_flats') {
                // Ondulaciones ultrasuaves y sedosas inspiradas en Alto's Odyssey
                const dune1 = Math.sin(theta * 3 + p1) * 10;
                const dune2 = Math.sin(theta * 6 + p2 + 0.25 * Math.sin(theta * 6 + p2)) * 5.0;
                h = (dune1 + dune2) * regionalHeightMod * 0.65;
            } else if (terrainProfile === 'archipelago_lakes' || dominantRegType === 'archipelago_basin') {
                // Relieve suave con colinas onduladas para contener múltiples lagunas
                h = (Math.sin(theta * 7 + p1) * 14 + Math.cos(theta * 14 + p2) * 7) * regionalHeightMod;
            } else if (terrainProfile === 'alpine_glacial') {
                // Cordilleras glaciares esbeltas con valles en U suaves
                const ridge1 = 1.08 - smoothAbs1;
                const ridge2 = 1.08 - smoothAbs2;
                h = (Math.pow(Math.max(0, ridge1), 1.65) * 38 - 14) * regionalHeightMod
                  + (Math.pow(Math.max(0, ridge2), 1.75) * 16 - 6) * regionalRoughness
                  + w3 * 5.0 * regionalRoughness
                  + w4 * 1.6;
            } else if (terrainProfile === 'volcanic_caldera') {
                // Domos volcánicos con depresión suave de caldera en la cima (sin quiebres bruscos)
                const dome = (w1 * 0.5 + 0.5);
                const calderaCurve = Math.sin(dome * Math.PI * 1.28) * 28 * regionalHeightMod - 10;
                h = calderaCurve + w2 * 11 * regionalRoughness + w3 * 4.2 * regionalRoughness;
            } else if (terrainProfile === 'barchan_dunes') {
                // Ondulaciones eólicas suaves y orgánicas de desierto
                const duneWave = Math.sin(theta * freq2 + p1 + 0.42 * Math.sin(theta * freq2 + p1));
                const subDune = Math.sin(theta * freq3 + p2 + 0.32 * Math.sin(theta * freq3 + p2));
                h = w1 * 16 * regionalHeightMod
                  + duneWave * 14 * regionalRoughness
                  + subDune * 5.0 * regionalRoughness;
            } else if (terrainProfile === 'terraced_mesa' || dominantRegType === 'terraced_canyon') {
                // Mesetas orgánicas de cima suave con laderas sigmoidales continuas (sin escalones rectos)
                const plateau = Math.tanh(w1 * 2.1) * 26 * regionalHeightMod;
                const subPlateau = Math.tanh(w2 * 1.8) * 10 * regionalRoughness;
                h = plateau + subPlateau + w3 * 3.2;
            } else if (terrainProfile === 'stepped_cubic' || terrainProfile === 'cubic_anomaly') {
                // Terrazas facetadas geométricas y prismas
                const waveTerrace = Math.tanh(Math.sin(theta * 8 + p1) * 2.8) * 24 * regionalHeightMod;
                const subStep = Math.tanh(Math.cos(theta * 16 + p2) * 2.4) * 10 * regionalRoughness;
                h = waveTerrace + subStep + w3 * 3.5;
            } else if (terrainProfile === 'karst_spires' || dominantRegType === 'spire_forest') {
                // Colinas kársticas elevadas y suaves
                const spireWave = Math.pow(w2 * 0.5 + 0.5, 2.4) * 34 - 12;
                h = w1 * 18 * regionalHeightMod
                  + spireWave * regionalRoughness
                  + w3 * 5.5 * regionalRoughness;
            } else if (terrainProfile === 'tectonic_rifts') {
                // Valles profundos y lomas redondeadas
                const block = Math.tanh(w1 * 1.9) * 24 * regionalHeightMod;
                const valley = -Math.pow(Math.max(0, -w2), 2.0) * 28 * regionalRoughness;
                h = block + valley + w3 * 5.5 * regionalRoughness;
            } else if (terrainProfile === 'cratered_lunar') {
                // Relieve lunar suavemente ondulado
                h = w1 * 15 * regionalHeightMod + w2 * 7.5 * regionalRoughness + w3 * 3.2 + w4 * 1.2;
            } else if (terrainProfile === 'organic_canopy') {
                // Colinas orgánicas vivas
                const waveOrg = Math.sin(theta * freq1 + p1) * 22 * regionalHeightMod;
                const rootWave = smoothAbs2 * 12 * regionalRoughness - 6;
                h = waveOrg + rootWave + w3 * 4.0;
            } else {
                // 'continental' equilibrado con cordilleras suaves y llanuras
                const mountain = Math.pow(w1 * 0.5 + 0.5, 1.8) * 32 * regionalHeightMod - 12;
                h = mountain + w2 * 10 * regionalRoughness + w3 * 4.2 * regionalRoughness + w4 * 1.4;
            }

            h = h * reliefMult + regionalOffset;
            if (localDetailScale > 1 && !archetype.isLiquid) {
                const fLoc1 = freq2 * localDetailScale;
                const fLoc2 = freq3 * localDetailScale;
                const localUndulation = Math.sin(theta * fLoc1 + p2) * 3.8 + Math.cos(theta * fLoc2 + p3) * 1.9;
                h += localUndulation * Math.min(2.6, Math.sqrt(localDetailScale)) * regionalRoughness;
            }
        }

        // En Cuna del Éter, meseta suave de despegue y aterrizaje en el cenit (-PI/2)
        if (isOrigin) {
            const distFromTop = Math.abs(Math.atan2(Math.sin(theta + Math.PI / 2), Math.cos(theta + Math.PI / 2)));
            if (distFromTop < 0.25) {
                const smoothBlend = clamp((distFromTop - 0.08) / 0.17, 0, 1);
                h *= smoothBlend * smoothBlend * (3 - 2 * smoothBlend);
            }
        }

        heights.push(radius + h);
    }

    // Pase de suavizado orgánico sobre el horizonte para lograr curvas geológicas fluidas y elegantes
    if (!archetype.isLiquid) {
        for (let pass = 0; pass < 3; pass++) {
            const copy = heights.slice();
            for (let i = 0; i < numVerts; i++) {
                const prev = copy[(i - 1 + numVerts) % numVerts];
                const curr = copy[i];
                const next = copy[(i + 1) % numVerts];
                heights[i] = prev * 0.24 + curr * 0.52 + next * 0.24;
            }
        }
    }

    // Calibración geodésica precisa de cuencas de lagunas a las cotas reales del terreno
    if (lakes.length > 0) {
        for (const lk of lakes) {
            const normC = ((lk.centerAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const idxCenter = Math.floor((normC / (Math.PI * 2)) * numVerts) % numVerts;
            const leftAng = (((normC - lk.span) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const rightAng = (((normC + lk.span) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const idxLeft = Math.floor((leftAng / (Math.PI * 2)) * numVerts) % numVerts;
            const idxRight = Math.floor((rightAng / (Math.PI * 2)) * numVerts) % numVerts;

            const rLeft = heights[idxLeft];
            const rRight = heights[idxRight];
            const shoreLevel = Math.min(rLeft, rRight);

            // Ajustar el nivel de agua en la cota de la orilla para un asentamiento perfecto
            lk.waterLevel = shoreLevel - 1.2;
            const rCenter = heights[idxCenter];
            lk.depth = Math.max(12, lk.waterLevel - rCenter);
        }
    }

    // --- ESTRATOS GEOLÓGICOS ESTÁTICOS PRE-SUAVIZADOS (Para el interior delicado bajo la corteza) ---
    const strataProfiles = [];
    let currentStrata = heights.slice();
    const scaleFactor = Math.sqrt(radius / 2600);
    const strataSpecs = [
        { depth: 18 * scaleFactor, smoothPasses: 4,  blendToSphere: 0.12 },
        { depth: 44 * scaleFactor, smoothPasses: 8,  blendToSphere: 0.26 },
        { depth: 82 * scaleFactor, smoothPasses: 14, blendToSphere: 0.44 },
        { depth: 135 * scaleFactor, smoothPasses: 22, blendToSphere: 0.65 }
    ];
    for (let s = 0; s < strataSpecs.length; s++) {
        const spec = strataSpecs[s];
        let prof = currentStrata.slice();
        for (let p = 0; p < spec.smoothPasses; p++) {
            const tmp = prof.slice();
            for (let i = 0; i < numVerts; i++) {
                const prev = tmp[(i - 2 + numVerts) % numVerts];
                const curr = tmp[i];
                const next = tmp[(i + 2) % numVerts];
                prof[i] = prev * 0.25 + curr * 0.50 + next * 0.25;
            }
        }
        currentStrata = prof.slice();
        const layerRadii = new Array(numVerts);
        for (let i = 0; i < numVerts; i++) {
            const theta = (i / numVerts) * Math.PI * 2;
            const gentleFold = Math.sin(theta * (freq1 + s) + p1 + s * 1.1) * (3.5 + s * 1.5) * scaleFactor;
            const baseR = lerp(prof[i], radius, spec.blendToSphere) - spec.depth + gentleFold;
            layerRadii[i] = Math.max(radius * 0.55, baseR);
        }
        strataProfiles.push(layerRadii);
    }

    // Sin estructuras artificiales: estética 100% natural y coherente con el paisaje de cada mundo
    const structures = [];

    // --- FORMACIONES NATURALES INTEGRADAS EN EL TERRENO (Coherentes por planeta y adaptadas a la curva de la corteza) ---
    const props = [];
    // Asignar una familia natural coherente y única por arquetipo/clase para que cada planeta tenga su propia identidad
    let planetNaturalPalette = ['layered_boulder', 'mesa_butte'];
    if (archetype.isLiquid) {
        planetNaturalPalette = ['coral_atoll', 'coastal_arch'];
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
        planetNaturalPalette = ['crystal_outcrop', 'desert_arch', 'organic_grove'];
    }

    const featureCount = archetype.isLiquid
        ? Math.floor(10 * Math.sqrt(radius / 2600))
        : Math.floor((20 + bodyRNG() * 8) * Math.sqrt(radius / 2600));

    for (let i = 0; i < featureCount; i++) {
        const ang = ((i / featureCount) * Math.PI * 2 + (bodyRNG() - 0.5) * (Math.PI / featureCount) + Math.PI * 2) % (Math.PI * 2);

        // Despejar la zona central de aterrizaje en Cuna del Éter
        if (isOrigin && Math.abs(Math.atan2(Math.sin(ang + Math.PI / 2), Math.cos(ang + Math.PI / 2))) < 0.08) continue;

        // Determinar el bioma regional activo
        let activeReg = regions[0];
        let minDiff = Infinity;
        for (const reg of regions) {
            const d = Math.abs(Math.atan2(Math.sin(ang - reg.centerAngle), Math.cos(ang - reg.centerAngle)));
            if (d < minDiff) {
                minDiff = d;
                activeReg = reg;
            }
        }

        // Selección coherente dentro de la paleta natural propia del planeta
        const formationType = planetNaturalPalette[Math.floor(bodyRNG() * planetNaturalPalette.length)];
        const arcMeters = (26 + bodyRNG() * 32) * Math.sqrt(radius / 2600);
        const angularSpan = arcMeters / radius;
        const elevation = (12 + bodyRNG() * 18) * (activeReg.type === 'colossal_peaks' ? 1.2 : 1.0) * Math.sqrt(radius / 2600);

        props.push({
            angle: ang,
            span: angularSpan,
            height: elevation,
            scale: 0.85 + bodyRNG() * 0.45,
            asymmetry: (bodyRNG() - 0.5) * 0.35,
            seed: bodyRNG(),
            subCount: 3 + Math.floor(bodyRNG() * 3),
            propType: formationType,
            regionName: activeReg.name
        });
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

    const planet = {
        key: `${sx},${sy}:${subIndex}`,
        sx,
        sy,
        subIndex,
        x: px,
        y: py,
        radius,
        atmoRadius,
        gravityRadius,
        gravityForce,
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
        caveEntrances,
        cavernCeilingHeights,
        cavernFloorHeights,
        interiorCoreRadius: isHollow ? Math.floor(radius * 0.18) : 0,
        isSuperVolcano,
        superVolcanoes,
        surfaceSeed: bodyRNG(),
        heights,
        craters,
        props,
        structures,
        interior,
        auroras,
        nodes,
        cloudBands,
        regions,
        minerals: discoveredMinerals,
        hazardLevel: archetype.hazardLevel || 'Moderado',
        hazards: archetype.hazards || ['Clima Espacial'],
        biosphereRating: archetype.biosphereRating || 'Inerte',
        wavePhase: bodyRNG() * 10,
        bases: (typeof planetaryBases !== 'undefined') ? planetaryBases.filter(b => b.planetKey === key) : [],
        // Sol central unificado y física de rotación diurna
        baseSunAngle,
        rotationPeriod,
        rotationSpeed,
        initialRotationPhase,
        lightAngle: initialLightAngle
    };

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
 * Determina si unas coordenadas globales están dentro de la cámara interior de un planeta hueco
 */
function isShipInsideCavern(planet, shipX, shipY) {
    if (!planet || !planet.isHollow) return false;
    const dx = shipX - planet.x;
    const dy = shipY - planet.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const surfaceR = getSurfaceRadius(planet, angle);
    const floorR = getCavernFloorRadius(planet, angle);
    // Si la nave descendió por debajo del horizonte exterior y no ha traspasado el núcleo
    return (dist < surfaceR - 5 && dist >= floorR - 35);
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
 * Obtiene la región geológica sobre la que se encuentra un ángulo determinado
 */
function getPlanetRegionAtAngle(planet, angle) {
    if (!planet || !planet.regions || planet.regions.length === 0) return null;
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
