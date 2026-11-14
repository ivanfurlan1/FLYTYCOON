/**
 * ÉTER — Sistema de Seres Vivos Extraterrestres y Fauna Planetaria (Edición Rediseñada)
 * Siluetas elegantes y estilizadas inspiradas en juegos de autor (Alto's Adventure, Monument Valley, Journey).
 * Cinemática procedural orgánica con articulaciones IK, hábitats biológicos acotados (oasis/santuarios),
 * poblaciones equilibradas sin saturación, escalas refinadas y daño térmico por llamarada de cohete.
 */

// Utilidad de trazado seguro de rectángulos redondeados
function safeRoundRect(c, x, y, w, h, r) {
    if (typeof c.roundRect === 'function') {
        c.roundRect(x, y, w, h, r);
    } else {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
    }
}

// Utilidad para oscurecer / aclarar colores hexadecimales para miembros en sombra
function adjustHexBrightness(hex, factor) {
    if (!hex || hex[0] !== '#' || (hex.length !== 7 && hex.length !== 4)) return hex;
    let r, g, b;
    if (hex.length === 7) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    } else {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    }
    r = Math.max(0, Math.min(255, Math.round(r * factor)));
    g = Math.max(0, Math.min(255, Math.round(g * factor)));
    b = Math.max(0, Math.min(255, Math.round(b * factor)));
    return `rgb(${r},${g},${b})`;
}

// --- PROBABILIDADES SELECTIVAS DE VIDA POR CLASE PLANETARIA ---
// La mayoría de los planetas son estériles o inertes; encontrar vida es un evento especial
const LIFE_PROBABILITY_BY_CLASS = {
    terrestrial: 0.36, // Solo algunos mundos templados tienen biosferas activas
    oceanic:     0.28, // Océanos específicos con medusas y fauna celeste
    desert:      0.15, // Dunas remotas con escarabajos o zancudos de arena
    cryogenic:   0.12, // Tundras glaciares con colosos ancestrales solitarios
    crystalline: 0.10, // Entidades de cuarzo muy escasas
    hollow:      0.18, // Cavernas profundas con microclimas bioluminiscentes
    toxic:       0.06, // Raros extremófilos mutantes
    anomaly:     0.12, // Fenómenos arcanos y constructos orbitales
    volcanic:    0.05  // Extremadamente hostil; casi desierto
};

// --- CATÁLOGO DE TEMPERAMENTOS ---
const CREATURE_TEMPERAMENTS = {
    PEACEFUL_PASSIVE: {
        id: 'peaceful_passive',
        name: 'Dócil Pacífico',
        desc: 'Ser inofensivo y grácil. Si es asustado o atacado, huye con ligereza.',
        tagColor: '#34d399',
        badge: 'PACÍFICO'
    },
    PEACEFUL_CURIOUS: {
        id: 'peaceful_curious',
        name: 'Curioso Amigable',
        desc: 'Se acerca con cautela a observar tu nave. Si percibe peligro, huye.',
        tagColor: '#38bdf8',
        badge: 'CURIOSO'
    },
    NEUTRAL_TERRITORIAL: {
        id: 'neutral_territorial',
        name: 'Neutral Territorial',
        desc: 'Pacífico a distancia; vigila si te acercas demasiado y se defiende si lo atacas.',
        tagColor: '#fbbf24',
        badge: 'TERRITORIAL'
    },
    HOSTILE_WEAK: {
        id: 'hostile_weak',
        name: 'Carroñero Rápido',
        desc: 'Ágil pero frágil. Huye despavorido ante las llamas del cohete.',
        tagColor: '#f87171',
        badge: 'HOSTIL'
    },
    HOSTILE_ELITE: {
        id: 'hostile_elite',
        name: 'Depredador Alfa',
        desc: 'Agresivo y territorial. Capaz de abalanzarse sobre el explorador.',
        tagColor: '#ef4444',
        badge: 'DEPREDADOR ALFA'
    },
    PEACEFUL_COLOSSUS: {
        id: 'peaceful_colossus',
        name: 'Coloso Ancestral',
        desc: 'Titán venerado de marcha solemne y serena. Guardián místico del planeta.',
        tagColor: '#a78bfa',
        badge: 'COLOSO ANCESTRAL'
    },
    HOSTILE_COLOSSUS: {
        id: 'hostile_colossus',
        name: 'Leviatán Ancestral',
        desc: 'Titán mítico territorial. Sus rugidos retumban en la atmósfera.',
        tagColor: '#dc2626',
        badge: 'LEVIATÁN ÉLITE'
    }
};

// --- MORFOLOGÍAS / FAMILIAS ---
const CREATURE_FAMILIES = [
    'quadruped_grazer',    // Gacelas y ciervos astrales con cuernos de cristal
    'biped_runner',        // Zancudos ágiles y corredores nebulares
    'colossus_strider',    // Colosos solemnes cuadrúpedos de roca y lomo cristalino
    'aero_flier',          // Mantarrayas celestes y rapaces etéreas
    'floater_jelly',       // Medusas celestes atmosféricas con tentáculos fluidos
    'serpentine_glider',   // Serpientes celestes y dragones astrales ondulantes
    'crystal_arachnid',    // Arácnidos facetados de cuarzo prismático
    'spore_drifter',       // Hongos astrales flotantes con velos de seda
    'armored_tortoise',    // Quelonios minerales con placas y runas luminosas
    'mantis_stalker',      // Mantis zancudas de silicio con guadañas estilizadas
    'micro_swarmer',       // Pequeños escarabajos de dunas
    'multipod_crawler',    // Trilobites y miriápodos facetados
    'centipede_crawler',   // Ciempiés blindados ondulantes
    'avian_pterosaur',     // Pterosaurios y quetzales celestes
    'abstract_geom',       // Poliedros resonantes de geometría sagrada
    'orbital_construct'    // Constructos arcanos de anillos concéntricos
];

// --- PALETAS ARMÓNICAS DE COLOR ESTILO ALTO'S ADVENTURE ---
const ALTO_PALETTES = [
    { id: 'alto_sunset', body: '#1e293b', accent: '#f59e0b', eye: '#fef08a', horn: '#fde68a', glow: 'rgba(245, 158, 11, 0.45)' },
    { id: 'aurora_sky', body: '#0f172a', accent: '#38bdf8', eye: '#bae6fd', horn: '#7dd3fc', glow: 'rgba(56, 189, 248, 0.5)' },
    { id: 'desert_terracotta', body: '#292524', accent: '#e76f51', eye: '#fed7aa', horn: '#fdba74', glow: 'rgba(231, 111, 81, 0.45)' },
    { id: 'mystic_jade', body: '#134e4a', accent: '#2dd4bf', eye: '#99f6e4', horn: '#5eead4', glow: 'rgba(45, 212, 191, 0.5)' },
    { id: 'twilight_amethyst', body: '#312e81', accent: '#a78bfa', eye: '#ddd6fe', horn: '#c4b5fd', glow: 'rgba(167, 139, 250, 0.5)' },
    { id: 'crimson_nebula', body: '#3f1d38', accent: '#f43f5e', eye: '#fecdd3', horn: '#fda4af', glow: 'rgba(244, 63, 94, 0.45)' },
    { id: 'solar_eclipse', body: '#18181b', accent: '#fbbf24', eye: '#fef3c7', horn: '#fef08a', glow: 'rgba(251, 191, 36, 0.55)' },
    { id: 'deep_ocean', body: '#0c1b33', accent: '#06b6d4', eye: '#cffafe', horn: '#67e8f9', glow: 'rgba(6, 182, 212, 0.5)' },
    { id: 'cryo_glacier', body: '#1e293b', accent: '#93c5fd', eye: '#ffffff', horn: '#bfdbfe', glow: 'rgba(147, 197, 253, 0.55)' },
    { id: 'igneous_basalt', body: '#1c1917', accent: '#ea580c', eye: '#fde047', horn: '#fb923c', glow: 'rgba(234, 88, 12, 0.55)' },
    { id: 'bio_spore', body: '#14281d', accent: '#4ade80', eye: '#dcfce7', horn: '#86efac', glow: 'rgba(74, 222, 128, 0.5)' },
    { id: 'quartz_monolith', body: '#2e1065', accent: '#d946ef', eye: '#fae8ff', horn: '#f0abfc', glow: 'rgba(217, 70, 239, 0.5)' },
    { id: 'golden_dune', body: '#3c2415', accent: '#d97706', eye: '#fef3c7', horn: '#fbbf24', glow: 'rgba(217, 119, 6, 0.45)' },
    { id: 'stardust', body: '#1e1b4b', accent: '#c084fc', eye: '#f3e8ff', horn: '#e9d5ff', glow: 'rgba(192, 132, 252, 0.5)' }
];

// --- NOMBRES PROCEDURALES PARA ESPECIES ---
const CREATURE_NAME_PREFIXES = {
    terrestrial: ['Gacela', 'Ciervo', 'Quetzal', 'Zancudo', 'Fauno', 'Lémur', 'Alondra', 'Serafín'],
    oceanic:     ['Medusa', 'Manta', 'Nautilo', 'Orbe Flotante', 'Sombra Serena', 'Velo Marino'],
    desert:      ['Escarabajo', 'Geco de Duna', 'Órix', 'Zancudo de Arena', 'Víbora Solar'],
    cryogenic:   ['Coloso de Escarcha', 'Espíritu Glaciar', 'Zorro Nival', 'Búho de Aurora'],
    crystalline: ['Prisma Vivo', 'Arácnido de Cuarzo', 'Geoda Danzante', 'Monolito Resonante'],
    hollow:      ['Espora Abisal', 'Salamandra de Caverna', 'Ecolocalizador', 'Sombra Troglodita'],
    toxic:       ['Vermis Ácido', 'Espora Mutante', 'Mantis Cáustica', 'Velo Viridiano'],
    anomaly:     ['Constructo Astral', 'Entidad de Luz', 'Oráculo Celeste', 'Singularidad Serena'],
    volcanic:    ['Basalto Pírico', 'Salamandra de Lava', 'Obsidiana Viva', 'Coloso Ígneo']
};

const CREATURE_NAME_SUFFIXES = [
    'del Éter', 'Astral', 'Nebular', 'de Cristal', 'Crepuscular', 'de las Cumbres',
    'Bioluminiscente', 'Ancestral', 'del Horizonte', 'Sereno', 'Magnético', 'Solar'
];

// Arreglos globales para proyectiles y orbes de fauna
const plasmaProjectiles = [];
const creatureEtherOrbs = [];

/**
 * Genera de forma determinista la fauna de un planeta según su clase y semilla.
 * Ahora la vida habita en un único oasis o región biológica acotada, en pequeñas
 * manadas o ejemplares solitarios, dejando libre la mayor parte del planeta.
 */
function generatePlanetCreatures(planet, rng) {
    if (!planet) return [];

    // 1. Determinar si el planeta alberga vida
    const classId = (planet.archetype && planet.archetype.classId) || 'terrestrial';
    const isMicro = planet.sizeClass && planet.sizeClass.id === 'micro';
    let lifeChance = LIFE_PROBABILITY_BY_CLASS[classId] || 0.20;
    if (isMicro) lifeChance = 0.04;

    // Planeta de origen siempre tiene un santuario de vida armoniosa
    if (planet.isOrigin) {
        lifeChance = 1.0;
    } else if (planet.archetype && (planet.archetype.biosphereRating === 'Inerte' || planet.archetype.biosphereRating === 'Estéril')) {
        lifeChance = 0.0;
    }

    const hasLife = (rng() < lifeChance);
    if (!hasLife) {
        planet.creatures = [];
        planet.speciesMetaList = [];
        planet.creaturesSummary = 'Mundo inerte — Sin biosfera detectada';
        return [];
    }

    // 2. Por lo general una única especie autóctona por mundo habitado (máximo 2 en origen)
    const speciesCount = planet.isOrigin ? 2 : 1;
    const creatures = [];
    const speciesMetaList = [];
    const prefixes = CREATURE_NAME_PREFIXES[classId] || CREATURE_NAME_PREFIXES['terrestrial'];

    // Mapeo selectivo de familias según la ecología del mundo
    const familyPools = {
        terrestrial: ['quadruped_grazer', 'biped_runner', 'aero_flier', 'colossus_strider'],
        oceanic:     ['floater_jelly', 'serpentine_glider', 'aero_flier'],
        desert:      ['biped_runner', 'quadruped_grazer', 'micro_swarmer', 'armored_tortoise'],
        cryogenic:   ['colossus_strider', 'quadruped_grazer', 'crystal_arachnid'],
        crystalline: ['crystal_arachnid', 'abstract_geom', 'orbital_construct'],
        hollow:      ['spore_drifter', 'crystal_arachnid', 'micro_swarmer'],
        toxic:       ['spore_drifter', 'mantis_stalker', 'serpentine_glider'],
        anomaly:     ['abstract_geom', 'orbital_construct', 'serpentine_glider'],
        volcanic:    ['armored_tortoise', 'colossus_strider']
    };

    const eligibleFamilies = familyPools[classId] || ['quadruped_grazer', 'biped_runner', 'aero_flier'];

    for (let s = 0; s < speciesCount; s++) {
        let family = eligibleFamilies[Math.floor(rng() * eligibleFamilies.length)];
        if (s > 0 && speciesMetaList.some(sm => sm.family === family) && eligibleFamilies.length > 1) {
            const alternate = eligibleFamilies.filter(f => !speciesMetaList.some(sm => sm.family === f));
            if (alternate.length > 0) family = alternate[Math.floor(rng() * alternate.length)];
        }

        // Escalas refinadas y moderadas (nunca aberraciones gigantescas de 5x a 8x)
        let sizeClass = 'medium';
        let scale = 0.95;

        if (family === 'micro_swarmer') {
            sizeClass = 'tiny';
            scale = 0.38 + rng() * 0.12;
        } else if (family === 'colossus_strider') {
            sizeClass = 'colossal';
            // Escala equilibrada: imponente frente al astronauta de 12px pero elegante y proporcionado (~35-42px)
            scale = 1.70 + rng() * 0.30;
        } else if (family === 'serpentine_glider' || family === 'avian_pterosaur') {
            sizeClass = 'large';
            scale = 1.20 + rng() * 0.25;
        } else if (family === 'armored_tortoise') {
            sizeClass = 'medium';
            scale = 0.95 + rng() * 0.20;
        } else if (family === 'floater_jelly' || family === 'aero_flier' || family === 'spore_drifter') {
            sizeClass = 'medium';
            scale = 0.85 + rng() * 0.25;
        } else if (family === 'biped_runner' || family === 'quadruped_grazer') {
            sizeClass = 'medium';
            scale = 0.90 + rng() * 0.25;
        } else {
            sizeClass = 'small';
            scale = 0.70 + rng() * 0.20;
        }

        // Temperamento
        let temperamentKey = 'PEACEFUL_PASSIVE';
        if (sizeClass === 'colossal') {
            temperamentKey = (rng() < 0.85) ? 'PEACEFUL_COLOSSUS' : 'HOSTILE_COLOSSUS';
        } else if (classId === 'volcanic' || classId === 'toxic') {
            temperamentKey = (rng() < 0.45) ? 'NEUTRAL_TERRITORIAL' : 'HOSTILE_WEAK';
        } else {
            const rTemp = rng();
            if (rTemp < 0.55) temperamentKey = 'PEACEFUL_PASSIVE';
            else if (rTemp < 0.82) temperamentKey = 'PEACEFUL_CURIOUS';
            else temperamentKey = 'NEUTRAL_TERRITORIAL';
        }

        const temperament = CREATURE_TEMPERAMENTS[temperamentKey] || CREATURE_TEMPERAMENTS.PEACEFUL_PASSIVE;
        const pref = prefixes[Math.floor(rng() * prefixes.length)];
        const suff = CREATURE_NAME_SUFFIXES[Math.floor(rng() * CREATURE_NAME_SUFFIXES.length)];
        const speciesName = pref + ' ' + suff;
        const palette = ALTO_PALETTES[Math.floor(rng() * ALTO_PALETTES.length)];

        let baseHp = 50;
        let damage = 8;
        if (sizeClass === 'tiny') { baseHp = 15; damage = 2; }
        else if (sizeClass === 'small') { baseHp = 35; damage = 5; }
        else if (sizeClass === 'medium') { baseHp = 65; damage = 10; }
        else if (sizeClass === 'large') { baseHp = 120; damage = 18; }
        else if (sizeClass === 'colossal') { baseHp = 260; damage = 28; }

        // --- HÁBITAT REGIONAL ACOTADO (SANTUARIO / VALLE) ---
        // Toda la población de la especie vive en un único rincón del planeta
        const sanctuaryAngle = rng() * Math.PI * 2;
        let countInSanctuary = 2;

        if (sizeClass === 'colossal') {
            countInSanctuary = 1; // 1 solo coloso solitario majestuoso
        } else if (sizeClass === 'large') {
            countInSanctuary = (rng() < 0.65) ? 1 : 2; // Solitario o pareja
        } else if (sizeClass === 'tiny') {
            countInSanctuary = 4 + Math.floor(rng() * 3); // Pequeña colonia en una roca
        } else {
            countInSanctuary = 2 + (rng() < 0.35 ? 1 : 0); // Pareja o trío familiar
        }

        for (let c = 0; c < countInSanctuary; c++) {
            // Dispersión angular mínima: todos concentrados en la misma región
            const spread = (countInSanctuary === 1) ? 0 : (c - (countInSanctuary - 1) * 0.5) * (0.028 + rng() * 0.015);
            const angle = wrapAngle(sanctuaryAngle + spread);

            let initialAltitude = 0;
            if (family === 'floater_jelly' || family === 'spore_drifter') {
                initialAltitude = 16 + rng() * 24;
            } else if (family === 'aero_flier' || family === 'avian_pterosaur') {
                initialAltitude = 35 + rng() * 35;
            } else if (family === 'abstract_geom' || family === 'orbital_construct') {
                initialAltitude = 12 + rng() * 20;
            } else if (family === 'serpentine_glider') {
                initialAltitude = (rng() < 0.5) ? 0 : 20 + rng() * 25;
            }

            const surfaceR = (typeof getSurfaceRadius === 'function') ? getSurfaceRadius(planet, angle) : planet.radius;
            const totalR = surfaceR + initialAltitude;
            const initX = planet.x + Math.cos(angle) * totalR;
            const initY = planet.y + Math.sin(angle) * totalR;

            const creature = {
                id: 'c_' + planet.key + '_s' + s + '_' + c,
                planetKey: planet.key,
                species: speciesName,
                family,
                sizeClass,
                scale,
                temperamentKey,
                temperament,
                palette,
                sanctuaryAngle,
                angle,
                altitude: initialAltitude,
                targetAltitude: initialAltitude,
                vTangential: (rng() - 0.5) * 3.0,
                vRadial: 0,
                facing: rng() < 0.5 ? 1 : -1,
                walkCycle: rng() * Math.PI * 2,
                flapCycle: rng() * Math.PI * 2,
                tentaclePhase: rng() * Math.PI * 2,
                blinkTimer: 2.0 + rng() * 4.0,
                x: initX,
                y: initY,
                aiState: 'IDLE',
                aiTimer: 2.5 + rng() * 4.0,
                alertTimer: 0,
                fleeTimer: 0,
                burnTimer: 0,
                attackCooldown: 0,
                flashTimer: 0,
                sonarPingTime: 0,
                hp: baseHp,
                maxHp: baseHp,
                damage,
                baseSpeed: (family === 'aero_flier' || family === 'avian_pterosaur' ? 14.0 : (sizeClass === 'colossal' ? 4.8 : 7.5)) * (0.85 + rng() * 0.3),
                tailLength: 7 + rng() * 8,
                stepDustTimer: 0
            };

            creatures.push(creature);
        }

        speciesMetaList.push({
            name: speciesName,
            family,
            sizeClass,
            temperament: temperament.badge,
            tagColor: temperament.tagColor
        });
    }

    planet.creatures = creatures;
    planet.speciesMetaList = speciesMetaList;
    planet.creaturesSummary = speciesMetaList.length + ' ' + (speciesMetaList.length === 1 ? 'especie en santuario natural' : 'especies en santuarios') + ' (' + speciesMetaList.map(s => s.name).join(', ') + ')';

    return creatures;
}

// --- ACTUALIZACIÓN DE FÍSICAS, IA, DAÑO TÉRMICO Y COMPORTAMIENTO ---

function updatePlanetCreatures(dt, nearbyPlanets) {
    if (!nearbyPlanets || nearbyPlanets.length === 0) return;

    // Posición del jugador (astronauta o nave)
    const isEVA = (typeof astronaut !== 'undefined' && astronaut.active);
    const playerX = isEVA ? astronaut.x : ship.x;
    const playerY = isEVA ? astronaut.y : ship.y;
    const playerVel = isEVA ? Math.hypot(astronaut.vTangential, astronaut.vRadial) : Math.hypot(ship.vx, ship.vy);

    // Parámetros de la llamarada del cohete para detección de daño térmico
    let flameActive = false;
    let flameNozX = 0, flameNozY = 0;
    let flameDirX = 0, flameDirY = 0;
    let flamePlumeLen = 0;
    let flameIntensity = 0;

    if (typeof ship !== 'undefined' && ship.thrustIntensity > 0.04) {
        flameActive = true;
        flameIntensity = clamp(ship.thrustIntensity, 0.05, 1.4);
        const cosA = Math.cos(ship.angle);
        const sinA = Math.sin(ship.angle);
        flameNozX = ship.x - cosA * 14.5;
        flameNozY = ship.y - sinA * 14.5;
        const fAng = ship.angle + Math.PI + (ship.gimbalAngle || 0);
        flameDirX = Math.cos(fAng);
        flameDirY = Math.sin(fAng);
        const isWarp = (typeof warpDrive !== 'undefined' && warpDrive.active);
        const vacFac = clamp(1 - (ship.atmoPressure || 0), 0, 1);
        flamePlumeLen = (isWarp ? 85 : lerp(52, 75, vacFac)) * flameIntensity;
    }

    for (const p of nearbyPlanets) {
        if (!p.creatures || p.creatures.length === 0) continue;

        for (let i = p.creatures.length - 1; i >= 0; i--) {
            const c = p.creatures[i];

            // 1. Muerte / desvanecimiento
            if (c.hp <= 0) {
                spawnCreatureDeathFX(c, p, c.burnTimer > 0);
                p.creatures.splice(i, 1);
                continue;
            }

            // 2. Temporizadores de estado
            if (c.flashTimer > 0) c.flashTimer = Math.max(0, c.flashTimer - dt);
            if (c.alertTimer > 0) c.alertTimer = Math.max(0, c.alertTimer - dt);
            if (c.attackCooldown > 0) c.attackCooldown = Math.max(0, c.attackCooldown - dt);
            if (c.sonarPingTime > 0) c.sonarPingTime = Math.max(0, c.sonarPingTime - dt);
            if (c.burnTimer > 0) c.burnTimer = Math.max(0, c.burnTimer - dt);

            // Temporizador de parpadeo de ojos
            c.blinkTimer -= dt;
            if (c.blinkTimer <= 0) {
                c.blinkTimer = 2.5 + Math.random() * 5.0;
            }

            // 3. Posición cartesiana actual
            const surfaceR = (typeof getSurfaceRadius === 'function') ? getSurfaceRadius(p, c.angle) : p.radius;
            const totalR = surfaceR + c.altitude;
            c.x = p.x + Math.cos(c.angle) * totalR;
            c.y = p.y + Math.sin(c.angle) * totalR;

            // --- 4. DETECCIÓN DE DAÑO POR LA LLAMARADA DEL COHETE ---
            if (flameActive) {
                const hitRadius = Math.max(7, 11 * c.scale);
                let hitByFlame = false;
                let flameFactor = 0;

                // A. Cono principal de escape de la tobera
                const toCrX = c.x - flameNozX;
                const toCrY = c.y - flameNozY;
                const projAlongBeam = toCrX * flameDirX + toCrY * flameDirY;

                if (projAlongBeam > -6 && projAlongBeam < flamePlumeLen * 1.15) {
                    const perpDist = Math.abs(toCrX * (-flameDirY) + toCrY * flameDirX);
                    const beamFrac = Math.max(0, projAlongBeam / flamePlumeLen);
                    // El chorro de gases se expande cónicamente
                    const beamRadius = lerp(5.5, 26.0 * (flameIntensity > 0.8 ? 1.25 : 1.0), beamFrac) + hitRadius;

                    if (perpDist <= beamRadius) {
                        hitByFlame = true;
                        flameFactor = clamp((1 - (perpDist / beamRadius) * 0.5) * (1 - beamFrac * 0.4), 0.25, 1.2);
                    }
                }

                // B. Deflexión de la llama contra el terreno (plasma en abanico)
                if (!hitByFlame && ship.flameDeflection && ship.flameDeflection.active) {
                    const defHitX = ship.flameDeflection.hitX;
                    const defHitY = ship.flameDeflection.hitY;
                    const distDef = Math.hypot(c.x - defHitX, c.y - defHitY);
                    const defRadius = 40 * ship.flameDeflection.intensity + hitRadius;

                    if (distDef <= defRadius) {
                        hitByFlame = true;
                        flameFactor = clamp((1 - distDef / defRadius) * ship.flameDeflection.intensity, 0.2, 1.1);
                    }
                }

                // C. Contacto directo con la tobera ardiente
                if (!hitByFlame) {
                    const distNoz = Math.hypot(c.x - flameNozX, c.y - flameNozY);
                    if (distNoz < 16 + hitRadius) {
                        hitByFlame = true;
                        flameFactor = 1.3;
                    }
                }

                // Aplicar daño térmico continuo y efectos físicos si es impactado
                if (hitByFlame) {
                    const dps = 150 * flameIntensity * flameFactor;
                    c.hp = Math.max(0, c.hp - dps * dt);
                    c.flashTimer = 0.14;
                    c.burnTimer = 1.2;
                    c.fleeTimer = 4.5;
                    c.aiState = 'FLEE';

                    // Empuje de los gases de escape a presión
                    const pushTangential = flameDirX * (-Math.sin(c.angle)) + flameDirY * (Math.cos(c.angle));
                    c.vTangential += Math.sign(pushTangential || 1) * (28 * flameIntensity * dt);

                    // Chispas ardientes y humo de combustión
                    if (Math.random() < 0.45 && typeof createSparks === 'function') {
                        createSparks(c.x, c.y, 3, c.angle + Math.PI / 2, 0.9, 45, 130, [255, 130, 30], 0.35);
                    }
                    if (Math.random() < 0.25 && typeof createSmoke === 'function' && p.archetype) {
                        createSmoke(c.x, c.y, 1, 1.4 * c.scale, [60, 50, 45], (Math.random() - 0.5) * 6, -10, 0.3);
                    }
                }
            }

            // Distancia al jugador
            const distToPlayer = Math.hypot(c.x - playerX, c.y - playerY);
            const playerPolar = Math.atan2(playerY - p.y, playerX - p.x);
            const angleDiffToPlayer = Math.atan2(Math.sin(playerPolar - c.angle), Math.cos(playerPolar - c.angle));

            // Retorno suave al hábitat si se aleja demasiado de su santuario
            const distFromSanctuary = Math.atan2(Math.sin(c.angle - c.sanctuaryAngle), Math.cos(c.angle - c.sanctuaryAngle));

            // --- INTELIGENCIA ARTIFICIAL Y TEMPERAMENTOS ---
            c.aiTimer -= dt;

            if (c.fleeTimer > 0) {
                // Huida asustada
                c.fleeTimer -= dt;
                c.aiState = 'FLEE';
                c.facing = angleDiffToPlayer > 0 ? -1 : 1;
                c.vTangential = c.facing * c.baseSpeed * 2.2;

                if (c.family === 'floater_jelly' || c.family === 'aero_flier') {
                    c.altitude = Math.min(110, c.altitude + dt * 14);
                }
            } else if (c.temperament.id === 'hostile_weak' || c.temperament.id === 'hostile_elite' || c.temperament.id === 'hostile_colossus' || c.isEnraged) {
                // Hostil: acechar y perseguir
                const detectionRange = (c.temperament.id === 'hostile_colossus') ? 280 : 160;

                if (distToPlayer < detectionRange) {
                    c.aiState = 'CHASE';
                    c.facing = angleDiffToPlayer > 0 ? 1 : -1;
                    const chaseSpeed = c.baseSpeed * (c.temperament.id === 'hostile_elite' ? 1.7 : 1.3);
                    c.vTangential = c.facing * chaseSpeed;

                    if (!c._hasAlerted) {
                        c._hasAlerted = true;
                        c.alertTimer = 1.4;
                        if (typeof audio !== 'undefined' && audio.playCreatureAlert) audio.playCreatureAlert();
                    }

                    const attackRange = 16 * c.scale;
                    if (distToPlayer < attackRange && c.attackCooldown <= 0) {
                        c.attackCooldown = 1.35;
                        c.aiState = 'ATTACK';
                        executeCreatureAttack(c, isEVA, p);
                    }
                } else {
                    c._hasAlerted = false;
                    // Deambular cerca de su hábitat
                    if (c.aiTimer <= 0) {
                        c.aiTimer = 3.0 + Math.random() * 4.0;
                        c.aiState = Math.random() < 0.4 ? 'IDLE' : 'WANDER';
                        if (c.aiState === 'WANDER') {
                            c.facing = (Math.abs(distFromSanctuary) > 0.08) ? (distFromSanctuary > 0 ? -1 : 1) : (Math.random() < 0.5 ? 1 : -1);
                        }
                    }
                    c.vTangential = (c.aiState === 'WANDER') ? c.facing * c.baseSpeed * 0.7 : 0;
                }
            } else if (c.temperament.id === 'neutral_territorial') {
                // Neutral territorial
                const territoryRange = 60;
                if (distToPlayer < territoryRange) {
                    c.aiState = 'ALERT';
                    c.alertTimer = 0.5;
                    c.facing = angleDiffToPlayer > 0 ? 1 : -1;
                    c.vTangential = 0;
                } else {
                    if (c.aiTimer <= 0) {
                        c.aiTimer = 3.0 + Math.random() * 5.0;
                        c.aiState = Math.random() < 0.45 ? 'IDLE' : 'WANDER';
                        if (c.aiState === 'WANDER') {
                            c.facing = (Math.abs(distFromSanctuary) > 0.06) ? (distFromSanctuary > 0 ? -1 : 1) : (Math.random() < 0.5 ? 1 : -1);
                        }
                    }
                    c.vTangential = (c.aiState === 'WANDER') ? c.facing * c.baseSpeed * 0.55 : 0;
                }
            } else if (c.temperament.id === 'peaceful_curious') {
                // Curioso amigable
                if (distToPlayer < 85 && distToPlayer > 22 && playerVel < 12) {
                    c.aiState = 'CURIOUS';
                    c.facing = angleDiffToPlayer > 0 ? 1 : -1;
                    c.vTangential = c.facing * c.baseSpeed * 0.4;
                } else if (distToPlayer <= 22) {
                    c.aiState = 'IDLE';
                    c.facing = angleDiffToPlayer > 0 ? 1 : -1;
                    c.vTangential = 0;
                } else {
                    if (c.aiTimer <= 0) {
                        c.aiTimer = 3.0 + Math.random() * 5.0;
                        c.aiState = Math.random() < 0.45 ? 'IDLE' : 'WANDER';
                        if (c.aiState === 'WANDER') {
                            c.facing = (Math.abs(distFromSanctuary) > 0.06) ? (distFromSanctuary > 0 ? -1 : 1) : (Math.random() < 0.5 ? 1 : -1);
                        }
                    }
                    c.vTangential = (c.aiState === 'WANDER') ? c.facing * c.baseSpeed * 0.6 : 0;
                }
            } else {
                // Pacífico / Coloso ancestral
                if (c.sizeClass !== 'colossal' && distToPlayer < 35 && playerVel > 15) {
                    c.fleeTimer = 4.5 + Math.random() * 3.0;
                    c.alertTimer = 1.2;
                    c.facing = angleDiffToPlayer > 0 ? -1 : 1;
                    if (typeof audio !== 'undefined' && audio.playCreatureChirp) audio.playCreatureChirp(1.2);
                } else {
                    if (c.aiTimer <= 0) {
                        c.aiTimer = 3.5 + Math.random() * 6.0;
                        c.aiState = Math.random() < 0.45 ? 'IDLE' : 'WANDER';
                        if (c.aiState === 'WANDER') {
                            c.facing = (Math.abs(distFromSanctuary) > 0.07) ? (distFromSanctuary > 0 ? -1 : 1) : (Math.random() < 0.5 ? 1 : -1);
                        }
                    }
                    c.vTangential = (c.aiState === 'WANDER') ? c.facing * c.baseSpeed * (c.sizeClass === 'colossal' ? 0.35 : 0.6) : 0;
                }
            }

            // 5. Integración cinemática a lo largo de la curvatura del planeta
            const angularVelocity = c.vTangential / surfaceR;
            c.angle = wrapAngle(c.angle + angularVelocity * dt);

            // Animación de caminata rítmica
            const moving = Math.abs(c.vTangential) > 0.3;
            if (moving) {
                c.walkCycle += dt * (Math.abs(c.vTangential) / (2.8 * c.scale));
                c.stepDustTimer -= dt;
                if (c.stepDustTimer <= 0 && c.altitude <= 1.0) {
                    c.stepDustTimer = (c.sizeClass === 'colossal') ? 0.45 : 0.24;
                    if (typeof createSmoke === 'function' && p.archetype) {
                        const dustScale = (c.sizeClass === 'colossal' ? 1.8 : 0.9) * c.scale;
                        createSmoke(c.x, c.y, 1, dustScale, p.archetype.surfaceDustColor || [200, 210, 225], -c.facing * 3, 0, 0.25);
                    }
                    if (c.sizeClass === 'colossal' && distToPlayer < 240) {
                        if (typeof camera !== 'undefined') camera.shake = Math.max(camera.shake, 1.2);
                    }
                }
            } else {
                c.walkCycle = lerp(c.walkCycle, 0, dt * 5);
            }

            // Dinámica aérea y flotante
            if (c.family === 'aero_flier' || c.family === 'avian_pterosaur') {
                c.flapCycle += dt * (moving ? 6.5 : 3.2);
                const waveH = Math.sin(c.angle * 12 + c.flapCycle * 0.4) * 8;
                c.altitude = clamp(c.targetAltitude + waveH, 20, 130);
            } else if (c.family === 'floater_jelly') {
                c.tentaclePhase += dt * 2.2;
                const bob = Math.sin(c.tentaclePhase) * 5;
                c.altitude = clamp(c.targetAltitude + bob, 10, 80);
            } else if (c.family === 'abstract_geom' || c.family === 'orbital_construct') {
                c.tentaclePhase += dt * 1.6;
                const bob = Math.sin(c.tentaclePhase) * 3;
                c.altitude = clamp(c.targetAltitude + bob, 6, 40);
            } else {
                c.altitude = 0;
            }
        }
    }
}

/**
 * Ataque de una criatura hostil contra el astronauta o la sonda
 */
function executeCreatureAttack(c, isEVA, planet) {
    if (isEVA && typeof astronaut !== 'undefined' && astronaut.active) {
        astronaut.vTangential += c.facing * 16.0;
        astronaut.vRadial += 10.0;
        astronaut.suitO2 = Math.max(0, astronaut.suitO2 - c.damage);
        
        if (typeof camera !== 'undefined') camera.shake = Math.max(camera.shake, 8.0);
        if (typeof audio !== 'undefined') {
            if (audio.playCreatureRoar) audio.playCreatureRoar(c.sizeClass === 'colossal' ? 0.7 : 1.3);
            if (audio.playImpact) audio.playImpact(0.85);
        }
        if (typeof createSparks === 'function') {
            createSparks(astronaut.x, astronaut.y, 10, Math.random() * Math.PI * 2, 0.8, 45, 160, [239, 68, 68], 0.35);
        }
    } else if (typeof ship !== 'undefined') {
        ship.hull = Math.max(0, ship.hull - c.damage * 0.55);
        ship.vx += c.facing * 6.0;
        ship.vy -= 4.0;

        if (typeof camera !== 'undefined') camera.shake = Math.max(camera.shake, 6.0);
        if (typeof audio !== 'undefined') {
            if (audio.playCreatureRoar) audio.playCreatureRoar(1.0);
            if (audio.playImpact) audio.playImpact(0.85);
        }
        if (typeof createSparks === 'function') {
            createSparks(ship.x, ship.y, 12, Math.random() * Math.PI * 2, 0.8, 50, 180, [251, 191, 36], 0.4);
        }
    }
}

/**
 * Disparo fotónico del astronauta o de la nave
 */
function firePhotonBlaster(originX, originY, targetX, targetY, isShip = false) {
    const dx = targetX - originX;
    const dy = targetY - originY;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    const angle = Math.atan2(dy, dx);
    const speed = isShip ? 520 : 420;

    plasmaProjectiles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        life: 0.95,
        maxLife: 0.95,
        isShip,
        damage: isShip ? 48 : 32,
        color: isShip ? [56, 189, 248] : [251, 191, 36]
    });

    if (typeof audio !== 'undefined' && audio.playPhotonBlaster) {
        audio.playPhotonBlaster(isShip);
    }
    if (typeof createSparks === 'function') {
        createSparks(originX, originY, 4, angle, 0.35, 30, 90, isShip ? [56, 189, 248] : [251, 191, 36], 0.25);
    }
}

function updatePlasmaProjectiles(dt, nearbyPlanets) {
    for (let i = plasmaProjectiles.length - 1; i >= 0; i--) {
        const p = plasmaProjectiles[i];
        p.life -= dt;
        if (p.life <= 0) {
            plasmaProjectiles.splice(i, 1);
            continue;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Comprobar colisión con criaturas
        let hit = false;
        if (nearbyPlanets) {
            for (const pl of nearbyPlanets) {
                if (!pl.creatures || pl.creatures.length === 0) continue;
                for (const c of pl.creatures) {
                    const hitRadius = Math.max(9, 13 * c.scale);
                    const dist = Math.hypot(c.x - p.x, c.y - p.y);
                    if (dist < hitRadius) {
                        c.hp -= p.damage;
                        c.flashTimer = 0.15;
                        c.fleeTimer = 4.0;
                        c.aiState = 'FLEE';

                        if (typeof createSparks === 'function') {
                            createSparks(p.x, p.y, 10, p.angle + Math.PI, 0.6, 40, 140, p.color, 0.35);
                        }
                        if (typeof audio !== 'undefined' && audio.playImpact) {
                            audio.playImpact(0.7);
                        }
                        hit = true;
                        break;
                    }
                }
                if (hit) break;
            }
        }

        if (hit) {
            plasmaProjectiles.splice(i, 1);
        }
    }

    updateCreatureEtherOrbs(dt);
}

/**
 * Desvanecimiento poético de una criatura al morir (o incineración si fue por llamarada)
 */
function spawnCreatureDeathFX(c, planet, isBurned = false) {
    if (typeof audio !== 'undefined' && audio.playCreatureDissolve) {
        audio.playCreatureDissolve();
    }
    if (typeof createShockwave === 'function') {
        const shockColor = isBurned ? 'rgba(251, 146, 60, 0.85)' : 'rgba(254, 240, 138, 0.85)';
        createShockwave(c.x, c.y, 28 * c.scale, 75, shockColor, 'ring');
    }
    if (typeof createSparks === 'function') {
        const sparkColor = isBurned ? [255, 110, 20] : [251, 191, 36];
        createSparks(c.x, c.y, isBurned ? 26 : 18, -Math.PI / 2, Math.PI, 35, 150, sparkColor, 0.65);
    }
    if (isBurned && typeof createSmoke === 'function') {
        createSmoke(c.x, c.y, 2, 2.0 * c.scale, [50, 45, 40], 0, -12, 0.45);
    }

    // Soltar orbes de Éter cósmico
    const orbCount = c.sizeClass === 'colossal' ? 5 : (c.sizeClass === 'large' ? 3 : (c.sizeClass === 'tiny' ? 1 : 2));
    for (let o = 0; o < orbCount; o++) {
        creatureEtherOrbs.push({
            x: c.x + (Math.random() - 0.5) * 8,
            y: c.y + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 14,
            vy: -12 - Math.random() * 16,
            angle: c.angle,
            planet,
            life: 25.0,
            value: 20 * (c.sizeClass === 'colossal' ? 4 : 1)
        });
    }
}

/**
 * Actualiza los orbes de Éter flotantes y su absorción magnética por el jugador
 */
function updateCreatureEtherOrbs(dt) {
    const isEVA = (typeof astronaut !== 'undefined' && astronaut.active);
    const targetX = isEVA ? astronaut.x : ship.x;
    const targetY = isEVA ? astronaut.y : ship.y;

    for (let i = creatureEtherOrbs.length - 1; i >= 0; i--) {
        const o = creatureEtherOrbs[i];
        o.life -= dt;
        if (o.life <= 0) {
            creatureEtherOrbs.splice(i, 1);
            continue;
        }

        // Atracción magnética hacia el explorador
        const dx = targetX - o.x;
        const dy = targetY - o.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 120) {
            const pull = (1 - dist / 120) * 160;
            o.vx += (dx / dist) * pull * dt;
            o.vy += (dy / dist) * pull * dt;
        }

        o.vx *= 0.94;
        o.vy *= 0.94;
        o.x += o.vx * dt;
        o.y += o.vy * dt;

        // Recolección
        if (dist < 18) {
            if (typeof audio !== 'undefined' && audio.playCollectiblePickup) {
                audio.playCollectiblePickup();
            }
            if (typeof minerals !== 'undefined' && minerals.ether !== undefined) {
                minerals.ether = (minerals.ether || 0) + o.value;
            }
            if (typeof createSparks === 'function') {
                createSparks(o.x, o.y, 6, 0, Math.PI * 2, 20, 60, [254, 240, 138], 0.3);
            }
            creatureEtherOrbs.splice(i, 1);
        }
    }
}

// --- RENDERIZADO VISUAL CON SILUETAS REFINADAS DE AUTOR ---

function drawPlanetCreatures(nearbyPlanets, timeSec) {
    if (!nearbyPlanets || nearbyPlanets.length === 0) return;

    for (const p of nearbyPlanets) {
        if (!p.creatures || p.creatures.length === 0) continue;

        const solar = (p.atmoRadius && typeof getPlanetSolarState === 'function')
            ? (p.currentSolarState || getPlanetSolarState(p, camera.x, camera.y, timeSec))
            : null;
        const nightFactor = solar ? clamp(solar.nightFactor, 0, 1) : 0;
        const twiFactor = solar ? clamp(solar.twilightFactor, 0, 1) : 0;

        for (const c of p.creatures) {
            const surfaceR = (typeof getSurfaceRadius === 'function') ? getSurfaceRadius(p, c.angle) : p.radius;
            const totalR = surfaceR + c.altitude;
            c.x = p.x + Math.cos(c.angle) * totalR;
            c.y = p.y + Math.sin(c.angle) * totalR;

            // Culling de pantalla
            const distCam = Math.hypot(c.x - camera.x, c.y - camera.y);
            const viewRadius = (Math.max(screenW, screenH) / Math.max(0.12, camera.zoom)) * 0.85 + 200;
            if (distCam > viewRadius) continue;

            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.angle + Math.PI / 2);

            // Halo bioluminiscente en zoom alejado para avistar fauna desde la órbita
            if (camera.zoom < 0.65) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const haloRadius = Math.max(3, 7 * c.scale * (0.65 / Math.max(0.06, camera.zoom)));
                const haloGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, haloRadius);
                haloGrad.addColorStop(0, c.palette.eye || 'rgba(254, 240, 138, 0.9)');
                haloGrad.addColorStop(0.4, c.palette.glow || 'rgba(251, 191, 36, 0.35)');
                haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = haloGrad;
                ctx.beginPath();
                ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Resaltado de sonar biológico
            if (c.sonarPingTime > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const pulse = Math.sin(timeSec * 6 + (c.id ? c.id.charCodeAt(c.id.length - 1) : 0)) * 0.2 + 1.0;
                const pingR = Math.max(5, (16 * c.scale + Math.sin(timeSec * 4) * 2.5)) * pulse;
                const alpha = clamp(c.sonarPingTime / 3, 0.15, 0.85);
                ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.arc(0, -c.altitude * 0.5, pingR, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Sombra suave en el suelo
            const shadowAlpha = clamp(1 - c.altitude / 25, 0, 0.45);
            if (shadowAlpha > 0.02) {
                ctx.save();
                ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
                ctx.beginPath();
                const sw = Math.max(1, 9 * c.scale);
                const sh = Math.max(0.5, 2.8 * c.scale);
                ctx.ellipse(0, 0, sw, sh, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            ctx.translate(0, -c.altitude);
            ctx.scale(c.facing, 1);

            // Destello de daño (fotónico o quemadura térmica)
            if (c.flashTimer > 0) {
                ctx.filter = (c.burnTimer > 0) ? 'brightness(2.2) sepia(1) hue-rotate(-25deg)' : 'brightness(2.2)';
            }

            // Dibujo de morfología específica
            switch (c.family) {
                case 'quadruped_grazer':
                    drawAltoQuadruped(ctx, c, timeSec, nightFactor, twiFactor);
                    break;
                case 'biped_runner':
                    drawAltoBiped(ctx, c, timeSec, nightFactor, twiFactor);
                    break;
                case 'colossus_strider':
                    drawAltoColossus(ctx, c, timeSec, nightFactor);
                    break;
                case 'aero_flier':
                    drawAltoAeroFlier(ctx, c, timeSec, nightFactor);
                    break;
                case 'floater_jelly':
                    drawAltoFloaterJelly(ctx, c, timeSec, nightFactor);
                    break;
                case 'serpentine_glider':
                    drawAltoSerpentine(ctx, c, timeSec, nightFactor, twiFactor);
                    break;
                case 'crystal_arachnid':
                    drawAltoCrystalArachnid(ctx, c, timeSec, nightFactor);
                    break;
                case 'spore_drifter':
                    drawAltoSporeDrifter(ctx, c, timeSec, nightFactor);
                    break;
                case 'armored_tortoise':
                    drawAltoArmoredTortoise(ctx, c, timeSec, nightFactor);
                    break;
                case 'mantis_stalker':
                    drawAltoMantis(ctx, c, timeSec, nightFactor, twiFactor);
                    break;
                case 'micro_swarmer':
                    drawAltoMicroSwarmer(ctx, c, timeSec, nightFactor);
                    break;
                case 'multipod_crawler':
                    drawAltoMultipod(ctx, c, timeSec, nightFactor);
                    break;
                case 'centipede_crawler':
                    drawAltoCentipede(ctx, c, timeSec, nightFactor);
                    break;
                case 'avian_pterosaur':
                    drawAltoAvianPterosaur(ctx, c, timeSec, nightFactor);
                    break;
                case 'abstract_geom':
                    drawAltoAbstractGeom(ctx, c, timeSec, nightFactor);
                    break;
                case 'orbital_construct':
                    drawAltoOrbitalConstruct(ctx, c, timeSec, nightFactor);
                    break;
                default:
                    drawAltoQuadruped(ctx, c, timeSec, nightFactor, twiFactor);
                    break;
            }

            // Alerta o huida
            if (c.alertTimer > 0 || c.aiState === 'ALERT' || c.aiState === 'FLEE') {
                ctx.save();
                ctx.scale(c.facing, 1);
                const isFlee = (c.aiState === 'FLEE');
                ctx.fillStyle = isFlee ? '#fbbf24' : '#ef4444';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(isFlee ? '!' : '!!', 0, -20 * c.scale);
                ctx.restore();
            }

            // Barra de vida sutil (solo si ha sido dañado)
            if (c.hp < c.maxHp) {
                ctx.save();
                ctx.scale(c.facing, 1);
                const barW = 18 * c.scale;
                const barH = 2.0;
                const barY = -17 * c.scale;
                const pct = clamp(c.hp / c.maxHp, 0, 1);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
                safeRoundRect(ctx, -barW * 0.5 - 1, barY - 1, barW + 2, barH + 2, 1.2);
                ctx.fill();

                ctx.fillStyle = pct > 0.4 ? '#34d399' : '#f87171';
                safeRoundRect(ctx, -barW * 0.5, barY, barW * pct, barH, 1.0);
                ctx.fill();
                ctx.restore();
            }

            ctx.restore();
        }
    }
}

// =========================================================================
// MORFOLOGÍAS REHECHAS — SILUETAS ORGÁNICAS, ARTICULADAS Y CINEMÁTICAS
// =========================================================================

/**
 * 1. Cuadrúpedos rumiantes y Ciervos Astrales (estilo Alto's Adventure)
 * Patas articuladas en 3 puntos, zancadas rítmicas con contrafase, cuello esbelto con cabeceo.
 */
function drawAltoQuadruped(c, cr, timeSec, nightFactor, twiFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const isMoving = Math.abs(cr.vTangential) > 0.3;
    const shadowBody = adjustHexBrightness(pal.body, 0.65);

    // Amplitud de marcha y balanceo elástico
    const stepAmp = isMoving ? 4.5 * sc : 0;
    const bob = isMoving ? Math.abs(Math.sin(ph * 2)) * 1.3 * sc : Math.sin(timeSec * 2.2) * 0.4 * sc;
    const headNod = isMoving ? Math.sin(ph * 2 - 0.4) * 0.9 * sc : Math.sin(timeSec * 1.8) * 0.3 * sc;

    // Fases de articulación de patas (cuadrúpedo en trote suave)
    const legBackL = Math.sin(ph) * stepAmp;
    const legFrontL = -Math.sin(ph + 0.3) * stepAmp;
    const legBackR = -Math.sin(ph) * stepAmp;
    const legFrontR = Math.sin(ph + 0.3) * stepAmp;

    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // --- PAR DE PATAS TRASERAS (EN SOMBRA / PLANO FONDO) ---
    c.strokeStyle = shadowBody;
    c.lineWidth = 1.4 * sc;

    // Pata posterior derecha
    c.beginPath();
    c.moveTo(-5.5 * sc, -4.5 * sc + bob);
    c.lineTo(-7.5 * sc + legBackR * 0.4, -2.5 * sc);
    c.lineTo(-6.0 * sc + legBackR, 0);
    c.stroke();

    // Pata delantera derecha
    c.beginPath();
    c.moveTo(5.5 * sc, -4.5 * sc + bob);
    c.lineTo(4.0 * sc + legFrontR * 0.4, -2.5 * sc);
    c.lineTo(5.5 * sc + legFrontR, 0);
    c.stroke();

    // --- COLA FLUIDA ONDULANTE ---
    const tailWave = Math.sin(timeSec * 5 + ph) * 2.0 * sc;
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.3 * sc;
    c.beginPath();
    c.moveTo(-7.5 * sc, -7.0 * sc + bob);
    c.quadraticCurveTo(-12 * sc, -9.5 * sc + bob + tailWave, -14 * sc, -6.5 * sc + bob + tailWave * 1.3);
    c.stroke();

    // --- LOMO Y GRUPA (SILUETA AERODINÁMICA) ---
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(-7.5 * sc, -5.5 * sc + bob);
    c.quadraticCurveTo(-8.0 * sc, -9.0 * sc + bob, -4.0 * sc, -9.2 * sc + bob);
    c.quadraticCurveTo(1.0 * sc, -8.0 * sc + bob, 5.5 * sc, -9.0 * sc + bob);
    c.lineTo(6.5 * sc, -4.5 * sc + bob);
    c.quadraticCurveTo(0, -3.5 * sc + bob, -7.5 * sc, -5.5 * sc + bob);
    c.closePath();
    c.fill();

    // Línea dorsal de luz crepuscular
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.0 * sc;
    c.beginPath();
    c.moveTo(-7.0 * sc, -8.5 * sc + bob);
    c.quadraticCurveTo(-1.0 * sc, -7.8 * sc + bob, 5.5 * sc, -8.8 * sc + bob);
    c.stroke();

    // --- CUELLO ESBELTO Y CABEZA ---
    const neckBaseX = 5.0 * sc;
    const neckBaseY = -8.0 * sc + bob;
    const headX = 9.5 * sc;
    const headY = -14.5 * sc + headNod;

    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(neckBaseX - 1.5 * sc, neckBaseY);
    c.lineTo(headX - 1.5 * sc, headY + 1.5 * sc);
    c.lineTo(headX + 2.5 * sc, headY);
    c.lineTo(neckBaseX + 1.8 * sc, neckBaseY + 2.5 * sc);
    c.closePath();
    c.fill();

    // Cabeza geométrica limpia
    c.beginPath();
    c.moveTo(headX - 1.5 * sc, headY);
    c.lineTo(headX + 3.8 * sc, headY + 1.0 * sc);
    c.lineTo(headX + 1.5 * sc, headY - 1.5 * sc);
    c.closePath();
    c.fill();

    // Oreja atenta
    c.strokeStyle = pal.body;
    c.lineWidth = 1.0 * sc;
    c.beginPath();
    c.moveTo(headX - 0.5 * sc, headY - 0.5 * sc);
    c.lineTo(headX - 2.8 * sc, headY - 3.2 * sc);
    c.stroke();

    // Cuernos etéreos ramificados de cristal (con tenue halo)
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.1 * sc;
    c.beginPath();
    c.moveTo(headX + 0.5 * sc, headY - 1.0 * sc);
    c.lineTo(headX - 1.5 * sc, headY - 5.5 * sc);
    c.lineTo(headX + 0.5 * sc, headY - 8.0 * sc);
    c.moveTo(headX - 0.5 * sc, headY - 4.0 * sc);
    c.lineTo(headX - 2.8 * sc, headY - 6.5 * sc);
    c.stroke();

    // Ojo bioluminiscente con pestañeo procedural
    const isBlinking = (cr.blinkTimer < 0.14);
    if (!isBlinking) {
        c.fillStyle = (cr.alertTimer > 0 || cr.isEnraged) ? '#ef4444' : pal.eye;
        c.beginPath();
        c.arc(headX + 1.8 * sc, headY + 0.2 * sc, 0.85 * sc, 0, Math.PI * 2);
        c.fill();
    }

    // --- PAR DE PATAS DELANTERAS (PRIMER PLANO) ---
    c.strokeStyle = pal.body;
    c.lineWidth = 1.5 * sc;

    // Pata posterior izquierda
    c.beginPath();
    c.moveTo(-6.5 * sc, -4.5 * sc + bob);
    c.lineTo(-8.5 * sc + legBackL * 0.4, -2.5 * sc);
    c.lineTo(-7.0 * sc + legBackL, 0);
    c.stroke();

    // Pata delantera izquierda
    c.beginPath();
    c.moveTo(4.5 * sc, -4.5 * sc + bob);
    c.lineTo(3.2 * sc + legFrontL * 0.4, -2.5 * sc);
    c.lineTo(4.5 * sc + legFrontL, 0);
    c.stroke();

    c.restore();
}

/**
 * 2. Bípedos corredores y Zancudos Cósmicos
 * Piernas aviares digitígradas articuladas, torso inclinado aerodinámico y cola de timón.
 */
function drawAltoBiped(c, cr, timeSec, nightFactor, twiFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const isMoving = Math.abs(cr.vTangential) > 0.3;
    const shadowBody = adjustHexBrightness(pal.body, 0.65);

    const stepAmp = isMoving ? 5.2 * sc : 0;
    const legL = Math.sin(ph) * stepAmp;
    const legR = -Math.sin(ph) * stepAmp;
    const bob = isMoving ? Math.abs(Math.sin(ph * 2)) * 1.4 * sc : Math.sin(timeSec * 2.5) * 0.3 * sc;

    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // Pata trasera derecha (sombra)
    c.strokeStyle = shadowBody;
    c.lineWidth = 1.3 * sc;
    c.beginPath();
    c.moveTo(0, -6.5 * sc + bob);
    c.lineTo(-2.5 * sc + legR * 0.3, -3.5 * sc);
    c.lineTo(0.5 * sc + legR, 0);
    c.lineTo(2.0 * sc + legR, 0); // Dedos
    c.stroke();

    // Torso inclinado esbelto
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(1.0 * sc, -8.0 * sc + bob, 6.0 * sc, 3.2 * sc, 0.25, 0, Math.PI * 2);
    c.fill();

    // Cola de timón / plumas dorsales
    const tailWave = Math.sin(ph + timeSec * 4) * 1.5 * sc;
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.5 * sc;
    c.beginPath();
    c.moveTo(-4.5 * sc, -8.5 * sc + bob);
    c.quadraticCurveTo(-8.5 * sc, -9.0 * sc + bob + tailWave, -11 * sc, -6.5 * sc + bob + tailWave * 1.2);
    c.stroke();

    // Cuello en 'S' y cabeza
    const headX = 6.0 * sc;
    const headY = -14.0 * sc + bob * 0.7;
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(4.0 * sc, -9.5 * sc + bob);
    c.lineTo(headX - 1.0 * sc, headY + 1.0 * sc);
    c.lineTo(headX + 2.5 * sc, headY);
    c.lineTo(headX - 1.5 * sc, headY - 1.5 * sc);
    c.lineTo(4.5 * sc, -7.5 * sc + bob);
    c.closePath();
    c.fill();

    // Cresta luminosa estilizada
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.1 * sc;
    c.beginPath();
    c.moveTo(headX - 1.0 * sc, headY - 1.5 * sc);
    c.lineTo(headX - 3.5 * sc, headY - 3.5 * sc);
    c.stroke();

    // Ojo
    const isBlinking = (cr.blinkTimer < 0.14);
    if (!isBlinking) {
        c.fillStyle = (cr.alertTimer > 0 || cr.isEnraged) ? '#ef4444' : pal.eye;
        c.beginPath();
        c.arc(headX + 1.2 * sc, headY - 0.2 * sc, 0.75 * sc, 0, Math.PI * 2);
        c.fill();
    }

    // Pata delantera izquierda (primer plano)
    c.strokeStyle = pal.body;
    c.lineWidth = 1.5 * sc;
    c.beginPath();
    c.moveTo(0.5 * sc, -6.5 * sc + bob);
    c.lineTo(-2.0 * sc + legL * 0.3, -3.5 * sc);
    c.lineTo(1.0 * sc + legL, 0);
    c.lineTo(2.5 * sc + legL, 0);
    c.stroke();

    c.restore();
}

/**
 * 3. Colosos Ancestrales (Titanes Cuadrúpedos Sagrados) — ¡Completamente rediseñado!
 * Ya no es una tosca caja rectangular con palitos.
 * Ahora es una majestuosa bestia cuadrúpeda con patas columnares articuladas, lomo arqueado
 * con cresta de cristales luminosos, cabeza noble y respiración profunda solemne.
 */
function drawAltoColossus(c, cr, timeSec, nightFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const isMoving = Math.abs(cr.vTangential) > 0.2;
    const shadowBody = adjustHexBrightness(pal.body, 0.65);

    // Respiración pausada y amortiguación de paso
    const breath = Math.sin(timeSec * 1.4) * 0.6 * sc;
    const stepAmp = isMoving ? 3.0 * sc : 0;
    const bob = isMoving ? Math.abs(Math.sin(ph)) * 0.9 * sc : breath * 0.4;

    // Fases de marcha lenta y firme
    const legBL = Math.sin(ph) * stepAmp;
    const legFL = -Math.sin(ph + 0.4) * stepAmp;
    const legBR = -Math.sin(ph) * stepAmp;
    const legFR = Math.sin(ph + 0.4) * stepAmp;

    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // --- PATAS DERECHAS (PLANO FONDO EN SOMBRA) ---
    c.strokeStyle = shadowBody;
    c.lineWidth = 2.8 * sc;

    // Pata trasera derecha
    c.beginPath();
    c.moveTo(-7.0 * sc, -8.0 * sc + bob);
    c.lineTo(-8.5 * sc + legBR * 0.5, -4.0 * sc);
    c.lineTo(-7.5 * sc + legBR, 0);
    c.stroke();

    // Pata delantera derecha
    c.beginPath();
    c.moveTo(7.0 * sc, -8.0 * sc + bob);
    c.lineTo(6.0 * sc + legFR * 0.5, -4.0 * sc);
    c.lineTo(7.0 * sc + legFR, 0);
    c.stroke();

    // --- COLA PESADA / ESTANDARTE MINERAL ---
    const tailSway = Math.sin(timeSec * 1.8 + ph) * 1.2 * sc;
    c.strokeStyle = pal.body;
    c.lineWidth = 2.2 * sc;
    c.beginPath();
    c.moveTo(-11 * sc, -11 * sc + bob);
    c.quadraticCurveTo(-14 * sc, -10 * sc + bob + tailSway, -16 * sc, -5 * sc + bob + tailSway * 1.3);
    c.stroke();

    // --- CUERPO MACIZO Y ARQUEADO ---
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(-11 * sc, -9.0 * sc + bob);
    c.quadraticCurveTo(-12 * sc, -16 * sc + bob + breath, -4.0 * sc, -17 * sc + bob + breath);
    c.quadraticCurveTo(4.0 * sc, -17 * sc + bob + breath, 9.0 * sc, -13 * sc + bob + breath);
    c.lineTo(10 * sc, -8.0 * sc + bob);
    c.quadraticCurveTo(0, -6.0 * sc + bob, -11 * sc, -9.0 * sc + bob);
    c.closePath();
    c.fill();

    // Borde inferior con sombreado sutil
    c.fillStyle = shadowBody;
    c.beginPath();
    c.ellipse(0, -8.0 * sc + bob, 9.5 * sc, 2.5 * sc, 0, 0, Math.PI);
    c.fill();

    // --- ESPINAS Y CRISTALES LUMINOSOS SOBRE EL LOMO ---
    c.fillStyle = pal.accent;
    const spines = [-7, -3, 1, 5];
    for (let i = 0; i < spines.length; i++) {
        const sx = spines[i] * sc;
        const sh = (3.5 + Math.sin(timeSec * 2.5 + i) * 0.8) * sc;
        const sy = -16.5 * sc + bob + breath;
        c.beginPath();
        c.moveTo(sx - 1.2 * sc, sy);
        c.lineTo(sx, sy - sh);
        c.lineTo(sx + 1.2 * sc, sy);
        c.closePath();
        c.fill();
    }

    // --- CABEZA ANCESTRAL Y PLACAS CRANEALES ---
    const headX = 13.5 * sc;
    const headY = -12.0 * sc + bob * 0.6;

    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(8.5 * sc, -14 * sc + bob + breath);
    c.lineTo(headX - 1.0 * sc, headY - 2.5 * sc);
    c.lineTo(headX + 3.0 * sc, headY);
    c.lineTo(headX + 1.0 * sc, headY + 3.5 * sc);
    c.lineTo(8.0 * sc, -8.5 * sc + bob);
    c.closePath();
    c.fill();

    // Cuernos de mineral curvados hacia atrás
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.6 * sc;
    c.beginPath();
    c.moveTo(headX - 0.5 * sc, headY - 2.0 * sc);
    c.quadraticCurveTo(headX - 3.0 * sc, headY - 6.0 * sc, headX - 6.5 * sc, headY - 4.5 * sc);
    c.stroke();

    // Ojo sereno brillante
    const isBlinking = (cr.blinkTimer < 0.16);
    if (!isBlinking) {
        c.fillStyle = (cr.alertTimer > 0 || cr.isEnraged) ? '#ef4444' : pal.eye;
        c.beginPath();
        c.arc(headX + 1.4 * sc, headY + 0.3 * sc, 1.1 * sc, 0, Math.PI * 2);
        c.fill();
    }

    // --- PATAS IZQUIERDAS (PRIMER PLANO) ---
    c.strokeStyle = pal.body;
    c.lineWidth = 3.2 * sc;

    // Pata posterior izquierda
    c.beginPath();
    c.moveTo(-8.0 * sc, -8.0 * sc + bob);
    c.lineTo(-9.5 * sc + legBL * 0.5, -4.0 * sc);
    c.lineTo(-8.5 * sc + legBL, 0);
    c.stroke();

    // Pata delantera izquierda
    c.beginPath();
    c.moveTo(6.0 * sc, -8.0 * sc + bob);
    c.lineTo(5.0 * sc + legFL * 0.5, -4.0 * sc);
    c.lineTo(6.0 * sc + legFL, 0);
    c.stroke();

    c.restore();
}

/**
 * 4. Mantarrayas y Rapaces Celestes (vuelo ondulatorio aerodinámico)
 */
function drawAltoAeroFlier(c, cr, timeSec, nightFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const wingPh = Math.sin(cr.flapCycle);
    const wingDeflect = wingPh * 7.0 * sc;

    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // Cola estilizada con timón etéreo
    const tailWave = Math.sin(timeSec * 4 + cr.flapCycle) * 2.2 * sc;
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.2 * sc;
    c.beginPath();
    c.moveTo(-6 * sc, 0);
    c.quadraticCurveTo(-12 * sc, tailWave, -16 * sc, tailWave * 1.4);
    c.stroke();

    // Ala membranosa (curvas de Bézier suaves)
    c.fillStyle = pal.accent;
    c.beginPath();
    c.moveTo(4 * sc, 0);
    c.quadraticCurveTo(0, -wingDeflect - 8 * sc, -8 * sc, -wingDeflect - 10 * sc);
    c.quadraticCurveTo(-5 * sc, -wingDeflect * 0.4, -4 * sc, 0);
    c.closePath();
    c.fill();

    // Borde brillante de ala
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.1 * sc;
    c.beginPath();
    c.moveTo(4 * sc, 0);
    c.quadraticCurveTo(0, -wingDeflect - 8 * sc, -8 * sc, -wingDeflect - 10 * sc);
    c.stroke();

    // Cuerpo fusiforme aerodinámico
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, 0, 7.0 * sc, 2.5 * sc, 0, 0, Math.PI * 2);
    c.fill();

    // Ojo brillante
    c.fillStyle = (cr.alertTimer > 0 || cr.isEnraged) ? '#ef4444' : pal.eye;
    c.beginPath();
    c.arc(4.5 * sc, -0.4 * sc, 0.8 * sc, 0, Math.PI * 2);
    c.fill();

    c.restore();
}

/**
 * 5. Medusas Celestes y Drifters de Éter (cúpula translúcida palpitante y tentáculos fluidos)
 */
function drawAltoFloaterJelly(c, cr, timeSec, nightFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const pulse = Math.sin(cr.tentaclePhase) * 0.15 + 1.0;

    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // Tentáculos bioluminiscentes con física de arrastre
    const count = 4;
    for (let t = 0; t < count; t++) {
        const offX = (t - (count - 1) * 0.5) * (3.0 * sc);
        const wave = Math.sin(cr.tentaclePhase + t * 0.8) * (3.5 * sc);
        const len = (14 + t * 2) * sc;

        c.strokeStyle = pal.glow || pal.accent;
        c.lineWidth = 1.0 * sc;
        c.beginPath();
        c.moveTo(offX, 0);
        c.quadraticCurveTo(offX + wave * 0.6, len * 0.5, offX + wave, len);
        c.stroke();
    }

    // Cúpula traslúcida acampanada
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -2 * sc, 7.5 * sc * pulse, 6.0 * sc * (2.0 - pulse), 0, Math.PI, 0);
    c.closePath();
    c.fill();

    // Borde bioluminiscente acentuado
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.3 * sc;
    c.beginPath();
    c.ellipse(0, -2 * sc, 7.5 * sc * pulse, 1.8 * sc, 0, 0, Math.PI * 2);
    c.stroke();

    // Núcleo estelar interno palpitante
    c.fillStyle = pal.eye;
    c.beginPath();
    c.arc(0, -3.5 * sc, 1.8 * sc * pulse, 0, Math.PI * 2);
    c.fill();

    c.restore();
}

/**
 * 6. Serpientes Celestes y Dragones de Viento (cuerpo segmentado en spline suave continuo)
 */
function drawAltoSerpentine(c, cr, timeSec, nightFactor, twiFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const segments = 8;
    const speed = Math.abs(cr.vTangential) > 0.3 ? 5.5 : 2.5;

    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // Aleta dorsal translúcida continua
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.2 * sc;
    c.beginPath();
    for (let i = segments - 1; i >= 0; i--) {
        const wave = Math.sin(timeSec * speed - i * 0.7) * (2.8 * sc);
        const sx = (i - 4) * (-3.8 * sc);
        const sy = -5 * sc + wave;
        const finY = sy - (2.8 * sc * (1 - Math.abs(i - 4) / 5));
        if (i === segments - 1) c.moveTo(sx, finY);
        else c.lineTo(sx, finY);
    }
    c.stroke();

    // Segmentos vertebrales en degradé suave
    for (let i = segments - 1; i >= 0; i--) {
        const frac = 1 - (i / segments);
        const wave = Math.sin(timeSec * speed - i * 0.7) * (2.8 * sc);
        const sx = (i - 4) * (-3.8 * sc);
        const sy = -5 * sc + wave;
        const rad = (2.4 + frac * 2.2) * sc;

        c.fillStyle = (i % 2 === 0) ? pal.body : pal.accent;
        c.beginPath();
        c.ellipse(sx, sy, rad, rad * 0.75, wave * 0.08, 0, Math.PI * 2);
        c.fill();
    }

    // Cabeza estilizada
    const headWave = Math.sin(timeSec * speed) * (2.8 * sc);
    const headX = 4 * (3.8 * sc);
    const headY = -5 * sc + headWave;

    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(headX, headY - 2.5 * sc);
    c.lineTo(headX + 5.5 * sc, headY);
    c.lineTo(headX + 2.5 * sc, headY + 2.2 * sc);
    c.lineTo(headX - 1.5 * sc, headY + 1.0 * sc);
    c.closePath();
    c.fill();

    // Cuerno dorsal
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.2 * sc;
    c.beginPath();
    c.moveTo(headX + 0.5 * sc, headY - 1.5 * sc);
    c.lineTo(headX - 3.0 * sc, headY - 5.5 * sc);
    c.stroke();

    // Ojo brillante
    c.fillStyle = (cr.alertTimer > 0 || cr.isEnraged) ? '#ef4444' : pal.eye;
    c.beginPath();
    c.arc(headX + 2.5 * sc, headY - 0.5 * sc, 0.9 * sc, 0, Math.PI * 2);
    c.fill();

    c.restore();
}

/**
 * 7. Arácnidos de Cristal (patas prismáticas en trípode y caparazón facetado)
 */
function drawAltoCrystalArachnid(c, cr, timeSec, nightFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;

    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // 6 patas de cuarzo prismático
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.1 * sc;
    for (let i = 0; i < 3; i++) {
        const offX = (i - 1) * (3.0 * sc);
        const waveL = Math.sin(ph + i * 1.4) * 2.5 * sc;
        const waveR = -Math.sin(ph + i * 1.4) * 2.5 * sc;

        // Pata izquierda
        c.beginPath();
        c.moveTo(offX - 1.5 * sc, -3.5 * sc);
        c.lineTo(offX - 6.0 * sc, -7.0 * sc);
        c.lineTo(offX - 7.0 * sc + waveL, 0);
        c.stroke();

        // Pata derecha
        c.beginPath();
        c.moveTo(offX + 1.5 * sc, -3.5 * sc);
        c.lineTo(offX + 6.0 * sc, -7.0 * sc);
        c.lineTo(offX + 7.0 * sc + waveR, 0);
        c.stroke();
    }

    // Cuerpo romboidal facetado
    c.fillStyle = pal.body;
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.0 * sc;
    c.beginPath();
    c.moveTo(0, -8.0 * sc);
    c.lineTo(4.5 * sc, -4.5 * sc);
    c.lineTo(0, -1.0 * sc);
    c.lineTo(-4.5 * sc, -4.5 * sc);
    c.closePath();
    c.fill();
    c.stroke();

    // Núcleo radiante
    c.fillStyle = pal.eye;
    c.beginPath();
    c.arc(0, -4.5 * sc, 1.4 * sc, 0, Math.PI * 2);
    c.fill();

    c.restore();
}

/**
 * 8. Quelonios Acorazados (Tortugas de Obsidiana con runas sutiles)
 */
function drawAltoArmoredTortoise(c, cr, timeSec, nightFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;

    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // Patas cortas y firmes
    const leg1 = Math.sin(ph) * 2.2 * sc;
    const leg2 = -Math.sin(ph) * 2.2 * sc;
    c.strokeStyle = pal.body;
    c.lineWidth = 2.4 * sc;
    c.beginPath();
    c.moveTo(-5 * sc, -3 * sc); c.lineTo(-5 * sc + leg1, 0);
    c.moveTo(5 * sc, -3 * sc);  c.lineTo(5 * sc + leg2, 0);
    c.stroke();

    // Caparazón abovedado
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -5.5 * sc, 8.0 * sc, 5.0 * sc, 0, Math.PI, 0);
    c.closePath();
    c.fill();

    // Cresta mineral geométrica
    c.fillStyle = pal.accent;
    c.beginPath();
    c.moveTo(-4.5 * sc, -7.0 * sc);
    c.lineTo(-2.0 * sc, -10.0 * sc);
    c.lineTo(0, -7.5 * sc);
    c.lineTo(2.0 * sc, -10.5 * sc);
    c.lineTo(4.5 * sc, -7.0 * sc);
    c.closePath();
    c.fill();

    // Cabeza robusta
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(7.5 * sc, -4.0 * sc, 2.6 * sc, 1.8 * sc, 0.1, 0, Math.PI * 2);
    c.fill();

    // Ojo
    c.fillStyle = pal.eye;
    c.beginPath();
    c.arc(8.6 * sc, -4.2 * sc, 0.7 * sc, 0, Math.PI * 2);
    c.fill();

    c.restore();
}

/**
 * 9. Mantis Zancudas de Silicio
 */
function drawAltoMantis(c, cr, timeSec, nightFactor, twiFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const breath = Math.sin(timeSec * 3) * 0.6 * sc;

    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // Patas zancudas finas
    c.strokeStyle = pal.body;
    c.lineWidth = 1.2 * sc;
    for (let i = -1; i <= 1; i += 2) {
        const legPh = Math.sin(ph + i * 1.5) * 3.0 * sc;
        c.beginPath();
        c.moveTo(i * 2.5 * sc, -8 * sc);
        c.lineTo(i * 5.0 * sc + legPh * 0.4, -13 * sc);
        c.lineTo(i * 5.5 * sc + legPh, 0);
        c.stroke();
    }

    // Abdomen y tórax erguido
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(-4.5 * sc, -7.5 * sc, 6.0 * sc, 2.4 * sc, -0.25, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = pal.body;
    c.lineWidth = 2.4 * sc;
    c.beginPath();
    c.moveTo(0, -7.5 * sc);
    c.lineTo(3.0 * sc, -15 * sc + breath);
    c.stroke();

    // Guadañas raptoriales
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.4 * sc;
    c.beginPath();
    c.moveTo(2.5 * sc, -14 * sc + breath);
    c.lineTo(6.5 * sc, -11 * sc);
    c.lineTo(4.0 * sc, -7.0 * sc);
    c.stroke();

    // Cabeza triangular y antenas
    c.fillStyle = pal.accent;
    c.beginPath();
    c.moveTo(3.0 * sc, -18 * sc + breath);
    c.lineTo(5.5 * sc, -15 * sc + breath);
    c.lineTo(1.5 * sc, -15 * sc + breath);
    c.closePath();
    c.fill();

    c.strokeStyle = pal.horn;
    c.lineWidth = 0.8 * sc;
    c.beginPath();
    c.moveTo(3.0 * sc, -18 * sc + breath);
    c.lineTo(1.0 * sc, -23 * sc);
    c.moveTo(4.0 * sc, -18 * sc + breath);
    c.lineTo(6.0 * sc, -23 * sc);
    c.stroke();

    // Ojo
    c.fillStyle = (cr.alertTimer > 0 || cr.isEnraged) ? '#ef4444' : pal.eye;
    c.beginPath();
    c.arc(4.5 * sc, -16 * sc + breath, 0.9 * sc, 0, Math.PI * 2);
    c.fill();

    c.restore();
}

/**
 * 10. Hongos Esporíferos y Drifters de Seda
 */
function drawAltoSporeDrifter(c, cr, timeSec, nightFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const pulse = Math.sin(timeSec * 2.5) * 0.1 + 1.0;

    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // Zarcillos colgantes
    for (let t = -2; t <= 2; t++) {
        const tx = t * 2.2 * sc;
        const wave = Math.sin(cr.tentaclePhase + t * 0.8) * 3.0 * sc;
        c.strokeStyle = pal.glow || pal.accent;
        c.lineWidth = 0.9 * sc;
        c.beginPath();
        c.moveTo(tx, 0);
        c.quadraticCurveTo(tx + wave * 0.5, 6 * sc, tx + wave, 12 * sc);
        c.stroke();
    }

    // Sombrero de campana
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -4.5 * sc * pulse, 7.0 * sc * pulse, 4.5 * sc * pulse, 0, Math.PI, 0);
    c.closePath();
    c.fill();

    // Borde acampanado
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.2 * sc;
    c.beginPath();
    c.ellipse(0, -4.5 * sc * pulse, 7.0 * sc * pulse, 1.8 * sc, 0, 0, Math.PI * 2);
    c.stroke();

    // Motas bioluminiscentes
    c.fillStyle = pal.eye;
    for (let p = -1; p <= 1; p++) {
        c.beginPath();
        c.arc(p * 2.5 * sc, (-3.5 + Math.sin(timeSec * 3 + p) * 1.2) * sc, 0.7 * sc, 0, Math.PI * 2);
        c.fill();
    }

    c.restore();
}

/**
 * 11. Escarabajos de Dunas y Micro-swarmers
 */
function drawAltoMicroSwarmer(c, cr, timeSec, nightFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;

    c.save();
    c.lineCap = 'round';

    // Patitas rápidas
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.0 * sc;
    for (let i = -1; i <= 1; i++) {
        const wave = Math.sin(ph + i * 2) * 2.0 * sc;
        c.beginPath();
        c.moveTo(i * 2 * sc, -2 * sc);
        c.lineTo(i * 3.5 * sc + wave, 0);
        c.stroke();
    }

    // Caparazón diminuto lustroso
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -2.5 * sc, 4.0 * sc, 2.2 * sc, 0, 0, Math.PI * 2);
    c.fill();

    // Antenas y ojos
    c.fillStyle = pal.eye;
    c.beginPath();
    c.arc(3.0 * sc, -2.8 * sc, 0.6 * sc, 0, Math.PI * 2);
    c.fill();

    c.restore();
}

/**
 * 12. Trilobites y Multipodos
 */
function drawAltoMultipod(c, cr, timeSec, nightFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;

    c.save();
    c.lineCap = 'round';

    // 4 pares de patas
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.0 * sc;
    for (let i = -1.5; i <= 1.5; i++) {
        const wave = Math.sin(ph + i * 1.2) * 2.0 * sc;
        c.beginPath();
        c.moveTo(i * 2.5 * sc, -2 * sc);
        c.lineTo(i * 3.5 * sc + wave, 0);
        c.stroke();
    }

    // Segmentos
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -3.0 * sc, 6.0 * sc, 2.5 * sc, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.eye;
    c.beginPath();
    c.arc(4.5 * sc, -3.2 * sc, 0.7 * sc, 0, Math.PI * 2);
    c.fill();

    c.restore();
}

/**
 * 13. Ciempiés Blindados
 */
function drawAltoCentipede(c, cr, timeSec, nightFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const segs = 6;

    c.save();
    c.lineCap = 'round';

    // Patitas
    c.strokeStyle = pal.accent;
    c.lineWidth = 0.9 * sc;
    for (let i = 0; i < segs; i++) {
        const sx = (i - segs * 0.5) * 2.8 * sc;
        const wave = Math.sin(ph + i * 0.9) * 1.8 * sc;
        c.beginPath();
        c.moveTo(sx, -1.8 * sc);
        c.lineTo(sx + wave, 0);
        c.stroke();
    }

    // Segmentos acorazados
    for (let i = 0; i < segs; i++) {
        const sx = (i - segs * 0.5) * 2.8 * sc;
        c.fillStyle = (i % 2 === 0) ? pal.body : pal.accent;
        c.beginPath();
        c.ellipse(sx, -2.8 * sc, 2.2 * sc, 1.8 * sc, 0, 0, Math.PI * 2);
        c.fill();
    }

    // Cabeza
    const hx = (segs * 0.5) * 2.8 * sc;
    c.fillStyle = pal.eye;
    c.beginPath();
    c.arc(hx + 1.0 * sc, -3.0 * sc, 0.7 * sc, 0, Math.PI * 2);
    c.fill();

    c.restore();
}

/**
 * 14. Pterosaurios Astrales
 */
function drawAltoAvianPterosaur(c, cr, timeSec, nightFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const wingY = Math.sin(cr.flapCycle) * 8.0 * sc;

    c.save();
    c.lineCap = 'round';

    // Alas afiladas de gran envergadura
    c.fillStyle = pal.accent;
    c.beginPath();
    c.moveTo(2 * sc, -1 * sc);
    c.lineTo(-4 * sc, -wingY - 11 * sc);
    c.lineTo(-9 * sc, -1 * sc);
    c.closePath();
    c.fill();

    // Cuerpo
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, 0, 7.0 * sc, 2.4 * sc, 0, 0, Math.PI * 2);
    c.fill();

    // Cabeza con pico y cresta
    c.beginPath();
    c.moveTo(5 * sc, -1.5 * sc);
    c.lineTo(11 * sc, 0);
    c.lineTo(5 * sc, 1.5 * sc);
    c.lineTo(1 * sc, -4.5 * sc);
    c.closePath();
    c.fill();

    // Ojo
    c.fillStyle = pal.eye;
    c.beginPath();
    c.arc(6.5 * sc, -0.4 * sc, 0.8 * sc, 0, Math.PI * 2);
    c.fill();

    c.restore();
}

/**
 * 15. Formas Geométricas Abstractas
 */
function drawAltoAbstractGeom(c, cr, timeSec, nightFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const rot = timeSec * 0.8;

    c.save();
    c.lineCap = 'round';

    // Anillo giratorio
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.2 * sc;
    c.beginPath();
    c.ellipse(0, 0, 11 * sc, 4.2 * sc, rot, 0, Math.PI * 2);
    c.stroke();

    // Hexágono central
    c.save();
    c.rotate(-rot * 1.3);
    c.fillStyle = pal.body;
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.0 * sc;
    c.beginPath();
    for (let s = 0; s < 6; s++) {
        const ang = (s / 6) * Math.PI * 2;
        const px = Math.cos(ang) * 5.5 * sc;
        const py = Math.sin(ang) * 5.5 * sc;
        if (s === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();

    // Núcleo
    c.fillStyle = pal.eye;
    c.beginPath();
    c.arc(0, 0, 2.0 * sc, 0, Math.PI * 2);
    c.fill();

    c.restore();
}

/**
 * 16. Constructos Anulares Arcanos
 */
function drawAltoOrbitalConstruct(c, cr, timeSec, nightFactor) {
    const sc = cr.scale;
    const pal = cr.palette;
    const rot = timeSec * 0.7;

    c.save();
    c.lineCap = 'round';

    // Anillos concéntricos contrarrotantes
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.2 * sc;
    c.beginPath();
    c.ellipse(0, 0, 12 * sc, 4.0 * sc, rot, 0, Math.PI * 2);
    c.stroke();

    c.strokeStyle = pal.horn;
    c.beginPath();
    c.ellipse(0, 0, 8.5 * sc, 3.0 * sc, -rot * 1.2, 0, Math.PI * 2);
    c.stroke();

    // Núcleo
    c.fillStyle = pal.eye;
    c.beginPath();
    c.arc(0, 0, 2.2 * sc, 0, Math.PI * 2);
    c.fill();

    c.restore();
}

// --- RENDERIZADO DE PROYECTILES Y ORBES DE ÉTER ---

function drawPlasmaProjectiles(timeSec) {
    if (plasmaProjectiles.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    for (const p of plasmaProjectiles) {
        const len = p.isShip ? 14 : 9;
        const tailX = p.x - Math.cos(p.angle) * len;
        const tailY = p.y - Math.sin(p.angle) * len;

        ctx.strokeStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${clamp(p.life / p.maxLife, 0.2, 1.0)})`;
        ctx.lineWidth = p.isShip ? 2.6 : 1.8;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.isShip ? 2.0 : 1.4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawCreatureEtherOrbs(timeSec) {
    if (creatureEtherOrbs.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const o of creatureEtherOrbs) {
        const pulse = Math.sin(timeSec * 5 + o.x) * 0.25 + 1.0;
        const r = 3.2 * pulse;
        const alpha = clamp(o.life / 5, 0.2, 0.95);

        const grad = ctx.createRadialGradient(o.x, o.y, 0.5, o.x, o.y, r * 2.2);
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(0.4, `rgba(254, 240, 138, ${alpha * 0.8})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(o.x, o.y, r * 2.2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}
