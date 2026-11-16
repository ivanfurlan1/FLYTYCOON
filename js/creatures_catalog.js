/**
 * ÉTER — Catálogo Exclusivo de Fauna Planetaria y Seres Extraterrestres
 * Cada categoría planetaria posee sus propias especies únicas e irrepetibles,
 * con temperamentos, locomoción, agrupamiento y comportamientos tácticos diferenciados.
 * Ciertas categorías planetarias son completamente estériles (sin seres vivos).
 */

// Categorías planetarias COMPLETAMENTE SIN SERES (mundos estériles / inertes / extremos)
const LIFELESS_CLASSES = new Set([
    'cometary',    // Cometas errantes de hielo y volátiles sin ecosistema
    'gravitic',    // Agujeros negros, magnetares y anomalías de masa negativa
    'crystalline', // Mundos minerales puros de cuarzo, bismuto y hierro inerte
    'megalithic'   // Ruinas ancestrales silenciosas abandonadas hace eones
]);

// Arquetipos específicos que también son estériles (gigantes gaseosos o páramos muertos)
const LIFELESS_ARCHETYPES = new Set([
    'gas_jovian',
    'saturnian_crown',
    'titan_gas_dense',
    'ice_neptune',
    'nitrogen_ice',
    'obsidian_crag',
    'salt_flats',
    'glass_desert',
    'ferrum_core',
    'bismuth_fractal',
    'shattered_core',
    'proto_impact',
    'dwarf_planetoid',
    'acid_ocean'
]);

// Probabilidad de que un planeta dentro de una categoría habitable albergue fauna
// (No todos los planetas tienen vida; encontrar vida es un descubrimiento significativo)
const LIFE_PROBABILITY_BY_CLASS = {
    terrestrial: 0.72,
    oceanic:     0.62,
    desert:      0.52,
    cryogenic:   0.48,
    volcanic:    0.42,
    toxic:       0.46,
    hollow:      0.74,
    shattered:   0.58,
    living:      0.94,
    temporal:    0.55,
    anomaly:     0.50,
    artificial:  0.65,
    misty:       0.72,
    // Categorías estériles: siempre 0
    cometary:    0.0,
    gravitic:    0.0,
    crystalline: 0.0,
    megalithic:  0.0
};

// --- CATÁLOGO DE TEMPERAMENTOS Y COMPORTAMIENTO ---
const CREATURE_TEMPERAMENTS = {
    DOCILE_SHY: {
        id: 'docile_shy',
        name: 'Asustadizo / Huidizo',
        badge: 'ASUSTADIZO',
        desc: 'Criatura nerviosa e inofensiva. Al detectar movimiento brusco o llamas, escapa despavorida.',
        tagColor: '#6ee7b7',
        hostile: false,
        attacksRocket: false
    },
    PEACEFUL_BENEVOLENT: {
        id: 'peaceful_benevolent',
        name: 'Benévolo / Simbiótico',
        badge: 'BENÉVOLO',
        desc: 'Ser luminoso y amigable. Se acerca con serenidad y emite pulsos armónicos que estabilizan el soporte vital.',
        tagColor: '#38bdf8',
        hostile: false,
        attacksRocket: false
    },
    PEACEFUL_COLOSSUS: {
        id: 'peaceful_colossus',
        name: 'Coloso Pacífico',
        badge: 'COLOSO SERENO',
        desc: 'Gigante ancestral imperturbable. Ignora al viajero salvo que sea herido o acosado.',
        tagColor: '#a78bfa',
        hostile: false,
        attacksRocket: false
    },
    NEUTRAL_TERRITORIAL: {
        id: 'neutral_territorial',
        name: 'Territorial Defensivo',
        badge: 'TERRITORIAL',
        desc: 'Advierte si invades su santuario. Embestirá si te acercas demasiado o lo atacas.',
        tagColor: '#fbbf24',
        hostile: false,
        attacksRocket: true
    },
    HOSTILE_SKIRMISHER: {
        id: 'hostile_skirmisher',
        name: 'Depredador Ágil',
        badge: 'HOSTIL',
        desc: 'Cazador veloz y agresivo. Acecha al explorador y ataca en ráfagas.',
        tagColor: '#f87171',
        hostile: true,
        attacksRocket: false
    },
    HOSTILE_LEAPER: {
        id: 'hostile_leaper',
        name: 'Acechador Saltarín',
        badge: 'SALTARÍN HOSTIL',
        desc: 'Se agazapa y ejecuta saltos parabólicos feroces sobre el explorador o el cohete.',
        tagColor: '#fb7185',
        hostile: true,
        attacksRocket: true
    },
    HOSTILE_SLOW_TANK: {
        id: 'hostile_slow_tank',
        name: 'Acorazado Lento Letal',
        badge: 'BLINDADO LENTO',
        desc: 'Avanza con lentitud implacable pero posee gran resistencia y golpes devastadores.',
        tagColor: '#f97316',
        hostile: true,
        attacksRocket: true
    },
    VIOLENT_ROCKET_HUNTER: {
        id: 'violent_rocket_hunter',
        name: 'Violento Anticohete',
        badge: 'EXTREMADAMENTE VIOLENTO',
        desc: 'Furia territorial desatada. Embiste, salta o bombardea directamente al cohete y al explorador.',
        tagColor: '#ef4444',
        hostile: true,
        attacksRocket: true
    },
    APEX_BOSS: {
        id: 'apex_boss',
        name: 'Apex Supremo (Extremo)',
        badge: 'PELIGRO EXTREMO · JEFE',
        desc: 'Entidad ápex de enorme vitalidad, ataques múltiples y fase de furia. Ataca cohetes sin piedad.',
        tagColor: '#dc2626',
        hostile: true,
        attacksRocket: true
    }
};

// --- CATÁLOGO DE 40 ESPECIES ÚNICAS EXCLUSIVAS POR CATEGORÍA PLANETARIA ---
// Ninguna especie se repite entre categorías.
const CREATURE_SPECIES_BY_CLASS = {

    // =========================================================================
    // 1. TERRESTRIAL (Telúricos & Biosferas) — 4 especies únicas
    // =========================================================================
    terrestrial: [
        {
            id: 'terra_stag',
            name: 'Ciervo Silvano de Éter',
            classId: 'terrestrial',
            renderType: 'terra_stag',
            temperamentKey: 'DOCILE_SHY',
            locomotion: 'jumper',
            grouping: 'herd',
            groupMin: 3, groupMax: 4,
            sizeClass: 'medium',
            scaleMin: 0.92, scaleMax: 1.12,
            hp: 48, armor: 0.0, damage: 0, rocketDamageMult: 0,
            baseSpeed: 13.5, chaseMult: 1.2, fleeMult: 2.35,
            jumpPower: 92, jumpCooldown: 1.6,
            attackMode: 'none', projectileType: null,
            aggroRange: 95, rocketAggroRange: 130, attacksRocket: false,
            habitatPref: 'valley',
            safeForOrigin: true,
            desc: 'Elegante cérvido de astas cristalinas. Pasta en manadas pequeñas y huye dando grandes saltos si percibe peligro.',
            palettes: [
                { body: '#1e293b', secondary: '#334155', accent: '#f59e0b', eye: '#fef08a', horn: '#fde68a', glow: 'rgba(245, 158, 11, 0.45)' },
                { body: '#16302b', secondary: '#274c43', accent: '#34d399', eye: '#d1fae5', horn: '#6ee7b7', glow: 'rgba(52, 211, 153, 0.45)' },
                { body: '#27223a', secondary: '#3b3355', accent: '#fbbf24', eye: '#fef3c7', horn: '#fcd34d', glow: 'rgba(251, 191, 36, 0.45)' }
            ]
        },
        {
            id: 'terra_hummingbird',
            name: 'Colibrí Lumínico Astral',
            classId: 'terrestrial',
            renderType: 'terra_hummingbird',
            temperamentKey: 'PEACEFUL_BENEVOLENT',
            locomotion: 'flyer',
            grouping: 'flock',
            groupMin: 2, groupMax: 3,
            sizeClass: 'small',
            scaleMin: 0.78, scaleMax: 0.95,
            hp: 32, armor: 0.0, damage: 0, rocketDamageMult: 0,
            baseSpeed: 18.0, chaseMult: 1.0, fleeMult: 2.2,
            flyAltitudeMin: 26, flyAltitudeMax: 68,
            attackMode: 'none', projectileType: null,
            aggroRange: 110, rocketAggroRange: 90, attacksRocket: false,
            habitatPref: 'valley',
            safeForOrigin: true,
            healsO2: true,
            desc: 'Ave etérea de batido hipnótico que dispersa polen dorado. Si caminas en calma, se aproxima y revitaliza tu traje.',
            palettes: [
                { body: '#0f293a', secondary: '#164e63', accent: '#38bdf8', eye: '#e0f2fe', horn: '#7dd3fc', glow: 'rgba(56, 189, 248, 0.55)' },
                { body: '#1b3126', secondary: '#2d4f3e', accent: '#4ade80', eye: '#dcfce7', horn: '#bef264', glow: 'rgba(74, 222, 128, 0.55)' }
            ]
        },
        {
            id: 'terra_boar',
            name: 'Jabalí Coraza de Roble',
            classId: 'terrestrial',
            renderType: 'terra_boar',
            temperamentKey: 'HOSTILE_SLOW_TANK',
            locomotion: 'walker',
            grouping: 'solitary',
            groupMin: 1, groupMax: 2,
            sizeClass: 'large',
            scaleMin: 1.18, scaleMax: 1.35,
            hp: 195, armor: 0.35, damage: 22, rocketDamageMult: 0.95,
            baseSpeed: 5.4, chaseMult: 1.55, fleeMult: 1.3,
            attackMode: 'melee', projectileType: null,
            aggroRange: 120, rocketAggroRange: 145, attacksRocket: true,
            habitatPref: 'ridge',
            safeForOrigin: false,
            desc: 'Bestia lenta pero blindada con placas de corteza petrificada. Su embestida sacude al astronauta y golpea el casco de las naves.',
            palettes: [
                { body: '#2c1e16', secondary: '#4a3222', accent: '#ea580c', eye: '#fde047', horn: '#fed7aa', glow: 'rgba(234, 88, 12, 0.5)' },
                { body: '#23201e', secondary: '#3f3934', accent: '#d97706', eye: '#fef08a', horn: '#fde68a', glow: 'rgba(217, 119, 6, 0.5)' }
            ]
        },
        {
            id: 'terra_alpha_wolf',
            name: 'Lobo Alfa Crepuscular',
            classId: 'terrestrial',
            renderType: 'terra_alpha_wolf',
            temperamentKey: 'HOSTILE_LEAPER',
            locomotion: 'jumper',
            grouping: 'pack',
            groupMin: 2, groupMax: 3,
            sizeClass: 'medium',
            scaleMin: 1.0, scaleMax: 1.18,
            hp: 105, armor: 0.1, damage: 16, rocketDamageMult: 0.75,
            baseSpeed: 13.0, chaseMult: 1.75, fleeMult: 1.8,
            jumpPower: 118, jumpCooldown: 1.75,
            attackMode: 'pounce', projectileType: null,
            aggroRange: 185, rocketAggroRange: 170, attacksRocket: true,
            habitatPref: 'any_solid',
            safeForOrigin: false,
            desc: 'Depredador ágil con melena de espinas luminosas. Acecha en jauría y pega saltos feroces contra exploradores y cohetes.',
            palettes: [
                { body: '#1a1829', secondary: '#312b4a', accent: '#f43f5e', eye: '#fecdd3', horn: '#fda4af', glow: 'rgba(244, 63, 94, 0.55)' },
                { body: '#171717', secondary: '#2e2b2b', accent: '#fb923c', eye: '#fef08a', horn: '#fdba74', glow: 'rgba(251, 146, 60, 0.55)' }
            ]
        }
    ],

    // =========================================================================
    // 2. OCEANIC (Oceánicos & Fluidos) — 3 especies únicas
    // =========================================================================
    oceanic: [
        {
            id: 'ocean_manta',
            name: 'Manta Abisal Celeste',
            classId: 'oceanic',
            renderType: 'ocean_manta',
            temperamentKey: 'PEACEFUL_BENEVOLENT',
            locomotion: 'flyer',
            grouping: 'pair',
            groupMin: 2, groupMax: 3,
            sizeClass: 'large',
            scaleMin: 1.12, scaleMax: 1.38,
            hp: 95, armor: 0.05, damage: 0, rocketDamageMult: 0,
            baseSpeed: 14.5, chaseMult: 1.0, fleeMult: 1.9,
            flyAltitudeMin: 24, flyAltitudeMax: 85,
            attackMode: 'none', projectileType: null,
            aggroRange: 120, rocketAggroRange: 120, attacksRocket: false,
            habitatPref: 'lake_surface',
            healsO2: true,
            desc: 'Mantarraya atmosférica de aletas sinuosas y colas de cinta. Planea con elegancia sobre las olas e irradia calma bioluminiscente.',
            palettes: [
                { body: '#0b1d35', secondary: '#143258', accent: '#06b6d4', eye: '#cffafe', horn: '#67e8f9', glow: 'rgba(6, 182, 212, 0.55)' },
                { body: '#0f2338', secondary: '#1d4466', accent: '#34d399', eye: '#d1fae5', horn: '#5eead4', glow: 'rgba(52, 211, 153, 0.55)' }
            ]
        },
        {
            id: 'ocean_jelly_crown',
            name: 'Medusa Corona de Tormenta',
            classId: 'oceanic',
            renderType: 'ocean_jelly_crown',
            temperamentKey: 'NEUTRAL_TERRITORIAL',
            locomotion: 'floater',
            grouping: 'flock',
            groupMin: 2, groupMax: 4,
            sizeClass: 'medium',
            scaleMin: 0.92, scaleMax: 1.18,
            hp: 85, armor: 0.1, damage: 15, rocketDamageMult: 0.7,
            baseSpeed: 8.5, chaseMult: 1.25, fleeMult: 1.4,
            flyAltitudeMin: 14, flyAltitudeMax: 58,
            attackMode: 'ranged', projectileType: 'electric',
            aggroRange: 88, rocketAggroRange: 105, attacksRocket: true,
            habitatPref: 'lake_surface',
            desc: 'Cúpula eléctrica flotante de filamentos largos. Pacífica a distancia, pero descarga arcos voltaicos si invades su zona.',
            palettes: [
                { body: '#17153b', secondary: '#2e236c', accent: '#38bdf8', eye: '#e0f2fe', horn: '#a5f3fc', glow: 'rgba(56, 189, 248, 0.65)' },
                { body: '#1f1235', secondary: '#3e1f6b', accent: '#c084fc', eye: '#f3e8ff', horn: '#e879f9', glow: 'rgba(192, 132, 252, 0.65)' }
            ]
        },
        {
            id: 'ocean_leviathan_eel',
            name: 'Leviatán Arpón de Marea',
            classId: 'oceanic',
            renderType: 'ocean_leviathan_eel',
            temperamentKey: 'APEX_BOSS',
            locomotion: 'flyer',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'titan_boss',
            scaleMin: 1.55, scaleMax: 1.75,
            hp: 460, armor: 0.25, damage: 28, rocketDamageMult: 1.15,
            baseSpeed: 16.5, chaseMult: 1.65, fleeMult: 1.2,
            flyAltitudeMin: 18, flyAltitudeMax: 105,
            attackMode: 'boss_multi', projectileType: 'hydro',
            aggroRange: 270, rocketAggroRange: 300, attacksRocket: true,
            habitatPref: 'lake_surface',
            desc: 'Serpiente marina aérea de 12 anillos electrificados. Depredador ápex que embiste cohetes en vuelo y lanza chorros hidro-eléctricos.',
            palettes: [
                { body: '#07172a', secondary: '#113052', accent: '#22d3ee', eye: '#f43f5e', horn: '#67e8f9', glow: 'rgba(34, 211, 238, 0.65)' },
                { body: '#12102c', secondary: '#231c54', accent: '#818cf8', eye: '#fb7185', horn: '#38bdf8', glow: 'rgba(129, 140, 248, 0.65)' }
            ]
        }
    ],

    // =========================================================================
    // 3. DESERT (Áridos & Dunas) — 4 especies únicas
    // =========================================================================
    desert: [
        {
            id: 'desert_jerboa',
            name: 'Jerbo Saltarín de Sílice',
            classId: 'desert',
            renderType: 'desert_jerboa',
            temperamentKey: 'DOCILE_SHY',
            locomotion: 'jumper',
            grouping: 'herd',
            groupMin: 3, groupMax: 5,
            sizeClass: 'small',
            scaleMin: 0.72, scaleMax: 0.88,
            hp: 26, armor: 0.0, damage: 0, rocketDamageMult: 0,
            baseSpeed: 14.0, chaseMult: 1.0, fleeMult: 2.5,
            jumpPower: 132, jumpCooldown: 0.95,
            attackMode: 'none', projectileType: null,
            aggroRange: 105, rocketAggroRange: 145, attacksRocket: false,
            habitatPref: 'valley',
            desc: 'Pequeño saltador bípedo de orejas parabólicas y patas en resorte. Rebota de duna en duna y escapa en supersaltos al menor ruido.',
            palettes: [
                { body: '#3b2416', secondary: '#5e3a23', accent: '#f59e0b', eye: '#fef3c7', horn: '#fde68a', glow: 'rgba(245, 158, 11, 0.45)' },
                { body: '#2e241f', secondary: '#4f3e35', accent: '#fb923c', eye: '#ffedd5', horn: '#fed7aa', glow: 'rgba(251, 146, 60, 0.45)' }
            ]
        },
        {
            id: 'desert_tortoise_titan',
            name: 'Quelonio Monolito de Arena',
            classId: 'desert',
            renderType: 'desert_tortoise_titan',
            temperamentKey: 'PEACEFUL_COLOSSUS',
            locomotion: 'walker',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'colossal',
            scaleMin: 1.65, scaleMax: 1.9,
            hp: 340, armor: 0.48, damage: 24, rocketDamageMult: 1.0,
            baseSpeed: 3.6, chaseMult: 1.25, fleeMult: 1.0,
            attackMode: 'melee', projectileType: null,
            aggroRange: 80, rocketAggroRange: 90, attacksRocket: true,
            habitatPref: 'valley',
            desc: 'Titán milenario con terrazas de arenisca y cristales de sal sobre su caparazón. Pacífico y majestuoso salvo que lo hieran.',
            palettes: [
                { body: '#31231b', secondary: '#523b2c', accent: '#eab308', eye: '#fef9c3', horn: '#fde047', glow: 'rgba(234, 179, 8, 0.4)' },
                { body: '#292524', secondary: '#44403c', accent: '#e76f51', eye: '#fed7aa', horn: '#fdba74', glow: 'rgba(231, 111, 81, 0.4)' }
            ]
        },
        {
            id: 'desert_scorpion',
            name: 'Escorpión Fulgurita',
            classId: 'desert',
            renderType: 'desert_scorpion',
            temperamentKey: 'HOSTILE_SLOW_TANK',
            locomotion: 'walker',
            grouping: 'pair',
            groupMin: 1, groupMax: 2,
            sizeClass: 'large',
            scaleMin: 1.08, scaleMax: 1.28,
            hp: 175, armor: 0.36, damage: 20, rocketDamageMult: 0.9,
            baseSpeed: 5.8, chaseMult: 1.35, fleeMult: 1.15,
            attackMode: 'hybrid', projectileType: 'silica',
            aggroRange: 155, rocketAggroRange: 175, attacksRocket: true,
            habitatPref: 'ridge',
            desc: 'Arácnido lento de quitina vitrificada y pinzas hidráulicas. Su aguijón incandescente dispara esquirlas térmicas contra naves.',
            palettes: [
                { body: '#261715', secondary: '#47251f', accent: '#f97316', eye: '#fde047', horn: '#fb923c', glow: 'rgba(249, 115, 22, 0.55)' },
                { body: '#1f1b24', secondary: '#382f42', accent: '#f43f5e', eye: '#fecdd3', horn: '#fb7185', glow: 'rgba(244, 63, 94, 0.55)' }
            ]
        },
        {
            id: 'desert_sandwyrm',
            name: 'Sierpe Rey de las Dunas',
            classId: 'desert',
            renderType: 'desert_sandwyrm',
            temperamentKey: 'APEX_BOSS',
            locomotion: 'jumper',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'titan_boss',
            scaleMin: 1.65, scaleMax: 1.88,
            hp: 540, armor: 0.3, damage: 30, rocketDamageMult: 1.2,
            baseSpeed: 10.5, chaseMult: 1.6, fleeMult: 1.1,
            jumpPower: 138, jumpCooldown: 2.6,
            attackMode: 'boss_multi', projectileType: 'silica',
            aggroRange: 280, rocketAggroRange: 310, attacksRocket: true,
            habitatPref: 'valley',
            desc: 'Coloso segmentado de fauces triples y placas rotatorias. Se impulsa en saltos sísmicos para devorar cohetes enteros.',
            palettes: [
                { body: '#2d1c12', secondary: '#52321e', accent: '#f59e0b', eye: '#ef4444', horn: '#fde68a', glow: 'rgba(245, 158, 11, 0.6)' }
            ]
        }
    ],

    // =========================================================================
    // 4. CRYOGENIC (Gélidos & Criogénicos) — 3 especies únicas
    // =========================================================================
    cryogenic: [
        {
            id: 'cryo_fox',
            name: 'Zorro Glaciar de Aurora',
            classId: 'cryogenic',
            renderType: 'cryo_fox',
            temperamentKey: 'DOCILE_SHY',
            locomotion: 'jumper',
            grouping: 'pack',
            groupMin: 2, groupMax: 3,
            sizeClass: 'small',
            scaleMin: 0.85, scaleMax: 1.0,
            hp: 40, armor: 0.0, damage: 0, rocketDamageMult: 0,
            baseSpeed: 15.0, chaseMult: 1.1, fleeMult: 2.4,
            jumpPower: 95, jumpCooldown: 1.5,
            attackMode: 'none', projectileType: null,
            aggroRange: 100, rocketAggroRange: 135, attacksRocket: false,
            habitatPref: 'valley',
            desc: 'Cánido ágil de cola triple boreal que deja destellos de escarcha al correr. Tímido; huye veloz si te acercas demasiado.',
            palettes: [
                { body: '#1a273d', secondary: '#2c4163', accent: '#93c5fd', eye: '#ffffff', horn: '#e0f2fe', glow: 'rgba(147, 197, 253, 0.55)' },
                { body: '#1a2d38', secondary: '#294959', accent: '#5eead4', eye: '#f0fdfa', horn: '#99f6e4', glow: 'rgba(94, 234, 212, 0.55)' }
            ]
        },
        {
            id: 'cryo_mammoth',
            name: 'Mamut Cristalino de Escarcha',
            classId: 'cryogenic',
            renderType: 'cryo_mammoth',
            temperamentKey: 'HOSTILE_SLOW_TANK',
            locomotion: 'walker',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'colossal',
            scaleMin: 1.62, scaleMax: 1.85,
            hp: 360, armor: 0.42, damage: 28, rocketDamageMult: 1.1,
            baseSpeed: 4.5, chaseMult: 1.45, fleeMult: 1.0,
            attackMode: 'melee', projectileType: null,
            aggroRange: 115, rocketAggroRange: 140, attacksRocket: true,
            habitatPref: 'valley',
            desc: 'Gigante lanudo coronado de glaciar translúcido y colmillos bifurcados. Lento pero devastador si invades su territorio.',
            palettes: [
                { body: '#172030', secondary: '#283652', accent: '#60a5fa', eye: '#dbeafe', horn: '#e0f2fe', glow: 'rgba(96, 165, 250, 0.5)' }
            ]
        },
        {
            id: 'cryo_wraith',
            name: 'Espectro Alado de Ventisca',
            classId: 'cryogenic',
            renderType: 'cryo_wraith',
            temperamentKey: 'VIOLENT_ROCKET_HUNTER',
            locomotion: 'flyer',
            grouping: 'pair',
            groupMin: 1, groupMax: 2,
            sizeClass: 'large',
            scaleMin: 1.15, scaleMax: 1.35,
            hp: 155, armor: 0.12, damage: 19, rocketDamageMult: 1.0,
            baseSpeed: 17.5, chaseMult: 1.65, fleeMult: 1.4,
            flyAltitudeMin: 28, flyAltitudeMax: 95,
            attackMode: 'hybrid', projectileType: 'cryo',
            aggroRange: 225, rocketAggroRange: 255, attacksRocket: true,
            habitatPref: 'ridge',
            desc: 'Rapaz glacial de alas en guadaña. Patrulla las cumbres heladas y se lanza en picada disparando estacas criogénicas al cohete.',
            palettes: [
                { body: '#0f172a', secondary: '#1e3a5f', accent: '#38bdf8', eye: '#fb7185', horn: '#bae6fd', glow: 'rgba(56, 189, 248, 0.65)' }
            ]
        }
    ],

    // =========================================================================
    // 5. VOLCANIC (Ígneos & Vulcanismo) — 3 especies únicas
    // =========================================================================
    volcanic: [
        {
            id: 'volc_ember_beetle',
            name: 'Escarabajo Brasa',
            classId: 'volcanic',
            renderType: 'volc_ember_beetle',
            temperamentKey: 'DOCILE_SHY',
            locomotion: 'jumper',
            grouping: 'colony',
            groupMin: 3, groupMax: 5,
            sizeClass: 'tiny',
            scaleMin: 0.56, scaleMax: 0.72,
            hp: 22, armor: 0.1, damage: 0, rocketDamageMult: 0,
            baseSpeed: 12.0, chaseMult: 1.0, fleeMult: 2.3,
            jumpPower: 82, jumpCooldown: 1.2,
            attackMode: 'none', projectileType: null,
            aggroRange: 85, rocketAggroRange: 120, attacksRocket: false,
            habitatPref: 'valley',
            desc: 'Pequeño coleóptero de obsidiana con abdomen incandescente. Despliega alas térmicas para saltar y escapar despavorido.',
            palettes: [
                { body: '#1c1917', secondary: '#292524', accent: '#f97316', eye: '#fef08a', horn: '#fb923c', glow: 'rgba(249, 115, 22, 0.6)' }
            ]
        },
        {
            id: 'volc_magma_golem',
            name: 'Gólem Basáltico Lento',
            classId: 'volcanic',
            renderType: 'volc_magma_golem',
            temperamentKey: 'HOSTILE_SLOW_TANK',
            locomotion: 'walker',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'colossal',
            scaleMin: 1.55, scaleMax: 1.8,
            hp: 390, armor: 0.45, damage: 30, rocketDamageMult: 1.15,
            baseSpeed: 4.0, chaseMult: 1.35, fleeMult: 1.0,
            attackMode: 'melee', projectileType: null,
            aggroRange: 150, rocketAggroRange: 185, attacksRocket: true,
            habitatPref: 'ridge',
            desc: 'Coloso de basalto fracturado con magma hirviendo en su núcleo. Extremadamente lento, pero sus golpes sísmicos destrozan naves.',
            palettes: [
                { body: '#181412', secondary: '#2c221e', accent: '#ea580c', eye: '#fde047', horn: '#f97316', glow: 'rgba(234, 88, 12, 0.65)' }
            ]
        },
        {
            id: 'volc_firedrake',
            name: 'Draco Piroclástico Alfa',
            classId: 'volcanic',
            renderType: 'volc_firedrake',
            temperamentKey: 'APEX_BOSS',
            locomotion: 'flyer',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'titan_boss',
            scaleMin: 1.6, scaleMax: 1.82,
            hp: 520, armor: 0.25, damage: 29, rocketDamageMult: 1.25,
            baseSpeed: 17.0, chaseMult: 1.7, fleeMult: 1.1,
            flyAltitudeMin: 26, flyAltitudeMax: 105,
            attackMode: 'boss_multi', projectileType: 'magma',
            aggroRange: 270, rocketAggroRange: 315, attacksRocket: true,
            habitatPref: 'ridge',
            desc: 'Dragón volcánico supremo de alas nervadas de fuego y maza caudal. Ataca cohetes sin tregua con picadas y descargas de magma.',
            palettes: [
                { body: '#1c1210', secondary: '#3b1812', accent: '#ef4444', eye: '#fef08a', horn: '#fb923c', glow: 'rgba(239, 68, 68, 0.7)' }
            ]
        }
    ],

    // =========================================================================
    // 6. TOXIC (Tóxicos & Radiactivos) — 3 especies únicas
    // =========================================================================
    toxic: [
        {
            id: 'toxic_hopper',
            name: 'Sapillo Mutante de Espora',
            classId: 'toxic',
            renderType: 'toxic_hopper',
            temperamentKey: 'DOCILE_SHY',
            locomotion: 'jumper',
            grouping: 'herd',
            groupMin: 3, groupMax: 4,
            sizeClass: 'small',
            scaleMin: 0.78, scaleMax: 0.96,
            hp: 36, armor: 0.0, damage: 0, rocketDamageMult: 0,
            baseSpeed: 11.5, chaseMult: 1.1, fleeMult: 2.2,
            jumpPower: 126, jumpCooldown: 1.05,
            attackMode: 'none', projectileType: null,
            aggroRange: 95, rocketAggroRange: 130, attacksRocket: false,
            habitatPref: 'valley',
            desc: 'Anfibio de tres ojos y saco gular fosforescente. Se desplaza a saltos altísimos y huye rebotando cuando detecta actividad.',
            palettes: [
                { body: '#14291d', secondary: '#1f442e', accent: '#4ade80', eye: '#ecfccb', horn: '#a3e635', glow: 'rgba(74, 222, 128, 0.55)' }
            ]
        },
        {
            id: 'toxic_slug_tank',
            name: 'Babosa Blindada Cáustica',
            classId: 'toxic',
            renderType: 'toxic_slug_tank',
            temperamentKey: 'HOSTILE_SLOW_TANK',
            locomotion: 'crawler',
            grouping: 'pair',
            groupMin: 1, groupMax: 2,
            sizeClass: 'large',
            scaleMin: 1.18, scaleMax: 1.38,
            hp: 215, armor: 0.38, damage: 18, rocketDamageMult: 0.9,
            baseSpeed: 3.4, chaseMult: 1.25, fleeMult: 1.05,
            attackMode: 'ranged', projectileType: 'acid',
            aggroRange: 145, rocketAggroRange: 170, attacksRocket: true,
            habitatPref: 'any_solid',
            desc: 'Gasterópodo masivo de caparazón corroído. Se arrastra con lentitud exasperante pero escupe globos ácidos corrosivos sobre el cohete.',
            palettes: [
                { body: '#1f2414', secondary: '#364021', accent: '#a3e635', eye: '#fef08a', horn: '#d9f99d', glow: 'rgba(163, 230, 53, 0.55)' }
            ]
        },
        {
            id: 'toxic_mantis_apex',
            name: 'Mantis Segadora de Uraninita',
            classId: 'toxic',
            renderType: 'toxic_mantis_apex',
            temperamentKey: 'APEX_BOSS',
            locomotion: 'jumper',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'titan_boss',
            scaleMin: 1.38, scaleMax: 1.56,
            hp: 430, armor: 0.22, damage: 27, rocketDamageMult: 1.15,
            baseSpeed: 13.5, chaseMult: 1.75, fleeMult: 1.2,
            jumpPower: 145, jumpCooldown: 1.85,
            attackMode: 'boss_multi', projectileType: 'acid',
            aggroRange: 250, rocketAggroRange: 275, attacksRocket: true,
            habitatPref: 'ridge',
            desc: 'Mantis letal de guadañas radiactivas. Ejecuta saltos fulminantes directamente sobre la cabina del cohete y dispara espinas ácidas.',
            palettes: [
                { body: '#16241d', secondary: '#243d30', accent: '#22c55e', eye: '#f43f5e', horn: '#d946ef', glow: 'rgba(34, 197, 94, 0.6)' }
            ]
        }
    ],

    // =========================================================================
    // 7. HOLLOW (Cavernosos & Huecos) — 4 especies únicas subterráneas
    // =========================================================================
    hollow: [
        {
            id: 'hollow_lantern_moth',
            name: 'Polilla Farolillo Abisal',
            classId: 'hollow',
            renderType: 'hollow_lantern_moth',
            temperamentKey: 'PEACEFUL_BENEVOLENT',
            locomotion: 'flyer',
            grouping: 'flock',
            groupMin: 2, groupMax: 4,
            sizeClass: 'medium',
            scaleMin: 0.88, scaleMax: 1.08,
            hp: 45, armor: 0.0, damage: 0, rocketDamageMult: 0,
            baseSpeed: 11.5, chaseMult: 1.0, fleeMult: 1.9,
            flyAltitudeMin: 20, flyAltitudeMax: 65,
            attackMode: 'none', projectileType: null,
            aggroRange: 100, rocketAggroRange: 90, attacksRocket: false,
            habitatPref: 'cavern_air',
            healsO2: true,
            desc: 'Polilla cavernaria de cuatro alas aterciopeladas y abdomen luminoso. Ilumina el subsuelo y recarga suavemente el O₂ cercano.',
            palettes: [
                { body: '#172038', secondary: '#263861', accent: '#38bdf8', eye: '#fef08a', horn: '#7dd3fc', glow: 'rgba(56, 189, 248, 0.6)' },
                { body: '#23193b', secondary: '#3c2966', accent: '#f472b6', eye: '#fef08a', horn: '#fbcfe8', glow: 'rgba(244, 114, 182, 0.6)' }
            ]
        },
        {
            id: 'hollow_echobat',
            name: 'Arpía Alada de Eco',
            classId: 'hollow',
            renderType: 'hollow_echobat',
            temperamentKey: 'VIOLENT_ROCKET_HUNTER',
            locomotion: 'flyer',
            grouping: 'pack',
            groupMin: 2, groupMax: 3,
            sizeClass: 'medium',
            scaleMin: 0.98, scaleMax: 1.18,
            hp: 92, armor: 0.05, damage: 15, rocketDamageMult: 0.85,
            baseSpeed: 16.5, chaseMult: 1.65, fleeMult: 1.5,
            flyAltitudeMin: 25, flyAltitudeMax: 78,
            attackMode: 'hybrid', projectileType: 'arcane',
            aggroRange: 185, rocketAggroRange: 210, attacksRocket: true,
            habitatPref: 'cavern_air',
            desc: 'Quiróptero subterráneo con sonar visible. Caza en grupo dentro de las cavernas y hostiga naves invasoras.',
            palettes: [
                { body: '#1b1626', secondary: '#312647', accent: '#a855f7', eye: '#f43f5e', horn: '#c084fc', glow: 'rgba(168, 85, 247, 0.55)' }
            ]
        },
        {
            id: 'hollow_ceiling_weaver',
            name: 'Tejedor Invertido de Gruta',
            classId: 'hollow',
            renderType: 'hollow_ceiling_weaver',
            temperamentKey: 'HOSTILE_LEAPER',
            locomotion: 'jumper',
            grouping: 'pair',
            groupMin: 1, groupMax: 2,
            sizeClass: 'medium',
            scaleMin: 0.95, scaleMax: 1.15,
            hp: 110, armor: 0.15, damage: 17, rocketDamageMult: 0.85,
            baseSpeed: 10.5, chaseMult: 1.6, fleeMult: 1.6,
            jumpPower: 112, jumpCooldown: 1.8,
            attackMode: 'pounce', projectileType: null,
            aggroRange: 155, rocketAggroRange: 165, attacksRocket: true,
            habitatPref: 'cavern_ceiling',
            desc: 'Arácnido articulado de ocho patas luminosas capaz de caminar en el techo invertido y abalanzarse desde las sombras.',
            palettes: [
                { body: '#161b26', secondary: '#263042', accent: '#2dd4bf', eye: '#ef4444', horn: '#5eead4', glow: 'rgba(45, 212, 191, 0.55)' }
            ]
        },
        {
            id: 'hollow_abyss_hydra',
            name: 'Hidra Tricéfala Subcortical',
            classId: 'hollow',
            renderType: 'hollow_abyss_hydra',
            temperamentKey: 'APEX_BOSS',
            locomotion: 'walker',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'titan_boss',
            scaleMin: 1.52, scaleMax: 1.72,
            hp: 510, armor: 0.28, damage: 28, rocketDamageMult: 1.15,
            baseSpeed: 6.2, chaseMult: 1.45, fleeMult: 1.0,
            attackMode: 'boss_multi', projectileType: 'arcane',
            aggroRange: 250, rocketAggroRange: 285, attacksRocket: true,
            habitatPref: 'cavern_floor',
            desc: 'Monstruo cavernario de tres cuellos serpentinos independientes. Dispara salvas abisales triples contra cohetes subterráneos.',
            palettes: [
                { body: '#101b2d', secondary: '#1c3254', accent: '#38bdf8', eye: '#fb7185', horn: '#818cf8', glow: 'rgba(56, 189, 248, 0.65)' }
            ]
        }
    ],

    // =========================================================================
    // 8. SHATTERED (Fragmentados & Islas Flotantes) — 3 especies únicas
    // =========================================================================
    shattered: [
        {
            id: 'shattered_cloud_sprite',
            name: 'Velo Alado de Deriva',
            classId: 'shattered',
            renderType: 'shattered_cloud_sprite',
            temperamentKey: 'DOCILE_SHY',
            locomotion: 'flyer',
            grouping: 'flock',
            groupMin: 3, groupMax: 4,
            sizeClass: 'small',
            scaleMin: 0.82, scaleMax: 1.02,
            hp: 34, armor: 0.0, damage: 0, rocketDamageMult: 0,
            baseSpeed: 16.0, chaseMult: 1.0, fleeMult: 2.3,
            flyAltitudeMin: 32, flyAltitudeMax: 95,
            attackMode: 'none', projectileType: null,
            aggroRange: 105, rocketAggroRange: 140, attacksRocket: false,
            habitatPref: 'floating_island',
            desc: 'Criatura etérea de cintas sedosas que surca las corrientes entre islas flotantes. Huye en espirales ascendentes al verte.',
            palettes: [
                { body: '#192a3d', secondary: '#2c4866', accent: '#7dd3fc', eye: '#ffffff', horn: '#bae6fd', glow: 'rgba(125, 211, 252, 0.55)' }
            ]
        },
        {
            id: 'shattered_island_hopper',
            name: 'Zancudo Saltarín de Falla',
            classId: 'shattered',
            renderType: 'shattered_island_hopper',
            temperamentKey: 'HOSTILE_LEAPER',
            locomotion: 'jumper',
            grouping: 'pair',
            groupMin: 1, groupMax: 2,
            sizeClass: 'medium',
            scaleMin: 1.0, scaleMax: 1.2,
            hp: 95, armor: 0.1, damage: 16, rocketDamageMult: 0.8,
            baseSpeed: 11.5, chaseMult: 1.55, fleeMult: 1.6,
            jumpPower: 142, jumpCooldown: 1.45,
            attackMode: 'pounce', projectileType: null,
            aggroRange: 155, rocketAggroRange: 175, attacksRocket: true,
            habitatPref: 'floating_island',
            desc: 'Habitante de las islas suspendidas con patas compás de baja gravedad. Salta grandes distancias para emboscar al explorador.',
            palettes: [
                { body: '#242230', secondary: '#3f3a54', accent: '#fbbf24', eye: '#fef08a', horn: '#fde68a', glow: 'rgba(251, 191, 36, 0.5)' }
            ]
        },
        {
            id: 'shattered_sky_condor',
            name: 'Cóndor Tectónico Alfa',
            classId: 'shattered',
            renderType: 'shattered_sky_condor',
            temperamentKey: 'VIOLENT_ROCKET_HUNTER',
            locomotion: 'flyer',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'large',
            scaleMin: 1.32, scaleMax: 1.55,
            hp: 210, armor: 0.18, damage: 24, rocketDamageMult: 1.15,
            baseSpeed: 20.5, chaseMult: 1.75, fleeMult: 1.25,
            flyAltitudeMin: 40, flyAltitudeMax: 125,
            attackMode: 'hybrid', projectileType: 'silica',
            aggroRange: 250, rocketAggroRange: 295, attacksRocket: true,
            habitatPref: 'floating_island',
            desc: 'Rapaz colosal con placas magnéticas en el pecho. Patrulla el cielo fragmentado y embiste cohetes a velocidades vertiginosas.',
            palettes: [
                { body: '#1f1b24', secondary: '#3b3042', accent: '#f43f5e', eye: '#fef08a', horn: '#fda4af', glow: 'rgba(244, 63, 94, 0.6)' }
            ]
        }
    ],

    // =========================================================================
    // 9. LIVING (Superorganismos & Flora Titánica) — 4 especies únicas
    // =========================================================================
    living: [
        {
            id: 'living_coral_walker',
            name: 'Caminante Coralino Simbionte',
            classId: 'living',
            renderType: 'living_coral_walker',
            temperamentKey: 'PEACEFUL_BENEVOLENT',
            locomotion: 'walker',
            grouping: 'herd',
            groupMin: 2, groupMax: 3,
            sizeClass: 'medium',
            scaleMin: 0.98, scaleMax: 1.18,
            hp: 85, armor: 0.1, damage: 0, rocketDamageMult: 0,
            baseSpeed: 6.5, chaseMult: 1.0, fleeMult: 1.5,
            attackMode: 'none', projectileType: null,
            aggroRange: 100, rocketAggroRange: 90, attacksRocket: false,
            habitatPref: 'valley',
            healsO2: true,
            desc: 'Simbionte dócil con corales respiratorios sobre el lomo. Libera esporas doradas que restauran el oxígeno de tu traje.',
            palettes: [
                { body: '#13332b', secondary: '#1e5245', accent: '#2dd4bf', eye: '#ccfbf1', horn: '#5eead4', glow: 'rgba(45, 212, 191, 0.55)' }
            ]
        },
        {
            id: 'living_spore_flea',
            name: 'Pulga Esporal Saltarina',
            classId: 'living',
            renderType: 'living_spore_flea',
            temperamentKey: 'DOCILE_SHY',
            locomotion: 'jumper',
            grouping: 'colony',
            groupMin: 3, groupMax: 5,
            sizeClass: 'small',
            scaleMin: 0.7, scaleMax: 0.88,
            hp: 30, armor: 0.0, damage: 0, rocketDamageMult: 0,
            baseSpeed: 12.0, chaseMult: 1.0, fleeMult: 2.3,
            jumpPower: 120, jumpCooldown: 0.9,
            attackMode: 'none', projectileType: null,
            aggroRange: 90, rocketAggroRange: 125, attacksRocket: false,
            habitatPref: 'valley',
            desc: 'Criatura bulbosa elástica de antenas espirales. Rebota alegremente sobre el micelio y escapa a los saltos si te acercas.',
            palettes: [
                { body: '#1f3622', secondary: '#315936', accent: '#a3e635', eye: '#fef9c3', horn: '#bef264', glow: 'rgba(163, 230, 53, 0.5)' }
            ]
        },
        {
            id: 'living_mycelial_brute',
            name: 'Centinela Micelial Pesado',
            classId: 'living',
            renderType: 'living_mycelial_brute',
            temperamentKey: 'HOSTILE_SLOW_TANK',
            locomotion: 'walker',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'large',
            scaleMin: 1.25, scaleMax: 1.45,
            hp: 250, armor: 0.35, damage: 24, rocketDamageMult: 1.0,
            baseSpeed: 4.3, chaseMult: 1.35, fleeMult: 1.0,
            attackMode: 'melee', projectileType: null,
            aggroRange: 145, rocketAggroRange: 175, attacksRocket: true,
            habitatPref: 'ridge',
            desc: 'Guardián muscular fúngico de pasos lentos pero golpes demoledores. Protege el superorganismo atacando cualquier nave intrusa.',
            palettes: [
                { body: '#271730', secondary: '#40254f', accent: '#ec4899', eye: '#fde047', horn: '#f472b6', glow: 'rgba(236, 72, 153, 0.55)' }
            ]
        },
        {
            id: 'living_hive_queen',
            name: 'Reina de la Colmena Viva',
            classId: 'living',
            renderType: 'living_hive_queen',
            temperamentKey: 'APEX_BOSS',
            locomotion: 'floater',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'titan_boss',
            scaleMin: 1.55, scaleMax: 1.78,
            hp: 530, armor: 0.22, damage: 28, rocketDamageMult: 1.2,
            baseSpeed: 10.5, chaseMult: 1.55, fleeMult: 1.1,
            flyAltitudeMin: 18, flyAltitudeMax: 68,
            attackMode: 'boss_multi', projectileType: 'spore',
            aggroRange: 265, rocketAggroRange: 300, attacksRocket: true,
            habitatPref: 'valley',
            desc: 'Matriarca simbiótica con corona floral pulsante y seis látigos. Lanza salvas de esporas corrosivas y castiga cohetes intrusos.',
            palettes: [
                { body: '#1f162e', secondary: '#392657', accent: '#4ade80', eye: '#f43f5e', horn: '#f472b6', glow: 'rgba(74, 222, 128, 0.65)' }
            ]
        }
    ],

    // =========================================================================
    // 10. TEMPORAL (Mundos Efímeros & Tormentas Cósmicas) — 3 especies únicas
    // =========================================================================
    temporal: [
        {
            id: 'temp_volt_hound',
            name: 'Sabueso de Relámpago',
            classId: 'temporal',
            renderType: 'temp_volt_hound',
            temperamentKey: 'HOSTILE_LEAPER',
            locomotion: 'jumper',
            grouping: 'pair',
            groupMin: 2, groupMax: 3,
            sizeClass: 'medium',
            scaleMin: 0.96, scaleMax: 1.14,
            hp: 96, armor: 0.08, damage: 17, rocketDamageMult: 0.85,
            baseSpeed: 15.5, chaseMult: 1.75, fleeMult: 1.8,
            jumpPower: 130, jumpCooldown: 1.35,
            attackMode: 'pounce', projectileType: null,
            aggroRange: 195, rocketAggroRange: 205, attacksRocket: true,
            habitatPref: 'any_solid',
            desc: 'Depredador eléctrico de silueta angular con arcos voltaicos entre sus hombros. Ejecuta saltos fulminantes en zigzag.',
            palettes: [
                { body: '#151936', secondary: '#242b5c', accent: '#38bdf8', eye: '#fef08a', horn: '#a5f3fc', glow: 'rgba(56, 189, 248, 0.65)' }
            ]
        },
        {
            id: 'temp_phase_titan',
            name: 'Titán Reloj de Arena',
            classId: 'temporal',
            renderType: 'temp_phase_titan',
            temperamentKey: 'PEACEFUL_COLOSSUS',
            locomotion: 'walker',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'colossal',
            scaleMin: 1.65, scaleMax: 1.88,
            hp: 360, armor: 0.4, damage: 27, rocketDamageMult: 1.05,
            baseSpeed: 3.9, chaseMult: 1.35, fleeMult: 1.0,
            attackMode: 'melee', projectileType: null,
            aggroRange: 95, rocketAggroRange: 110, attacksRocket: true,
            habitatPref: 'valley',
            desc: 'Gigante crepuscular envuelto en anillos de polvo temporal. Camina en silencio majestuoso salvo que sea atacado.',
            palettes: [
                { body: '#1c1936', secondary: '#312c5c', accent: '#fbbf24', eye: '#e0e7ff', horn: '#fde68a', glow: 'rgba(251, 191, 36, 0.5)' }
            ]
        },
        {
            id: 'temp_storm_phoenix',
            name: 'Fénix de Tormenta Cronal',
            classId: 'temporal',
            renderType: 'temp_storm_phoenix',
            temperamentKey: 'APEX_BOSS',
            locomotion: 'flyer',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'titan_boss',
            scaleMin: 1.52, scaleMax: 1.75,
            hp: 495, armor: 0.2, damage: 28, rocketDamageMult: 1.25,
            baseSpeed: 21.0, chaseMult: 1.75, fleeMult: 1.2,
            flyAltitudeMin: 34, flyAltitudeMax: 115,
            attackMode: 'boss_multi', projectileType: 'electric',
            aggroRange: 280, rocketAggroRange: 320, attacksRocket: true,
            habitatPref: 'ridge',
            desc: 'Ave mítica de triple par alar y cola de plasma iónico. Desata ráfagas de relámpagos y embiste cohetes a velocidad supersónica.',
            palettes: [
                { body: '#1e1633', secondary: '#392761', accent: '#f59e0b', eye: '#38bdf8', horn: '#fde047', glow: 'rgba(245, 158, 11, 0.7)' }
            ]
        }
    ],

    // =========================================================================
    // 11. ANOMALY (Arcanos & Anomalías — Mundos sólidos) — 3 especies únicas
    // =========================================================================
    anomaly: [
        {
            id: 'anom_seraph_poly',
            name: 'Serafín Poliedro Resonante',
            classId: 'anomaly',
            renderType: 'anom_seraph_poly',
            temperamentKey: 'PEACEFUL_BENEVOLENT',
            locomotion: 'floater',
            grouping: 'pair',
            groupMin: 1, groupMax: 2,
            sizeClass: 'medium',
            scaleMin: 0.98, scaleMax: 1.18,
            hp: 95, armor: 0.15, damage: 0, rocketDamageMult: 0,
            baseSpeed: 9.0, chaseMult: 1.0, fleeMult: 1.8,
            flyAltitudeMin: 22, flyAltitudeMax: 58,
            attackMode: 'none', projectileType: null,
            aggroRange: 110, rocketAggroRange: 100, attacksRocket: false,
            habitatPref: 'valley',
            healsO2: true,
            desc: 'Geometría sagrada viviente con cuatro alas flotantes y anillos astrolábicos. Emite resonancias que estabilizan el traje.',
            palettes: [
                { body: '#1e1b4b', secondary: '#312e81', accent: '#c084fc', eye: '#f3e8ff', horn: '#e9d5ff', glow: 'rgba(192, 132, 252, 0.6)' }
            ]
        },
        {
            id: 'anom_rift_stalker',
            name: 'Acechador de Grieta',
            classId: 'anomaly',
            renderType: 'anom_rift_stalker',
            temperamentKey: 'HOSTILE_LEAPER',
            locomotion: 'blinker',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'large',
            scaleMin: 1.12, scaleMax: 1.3,
            hp: 165, armor: 0.15, damage: 22, rocketDamageMult: 0.95,
            baseSpeed: 12.5, chaseMult: 1.65, fleeMult: 1.6,
            jumpPower: 132, jumpCooldown: 1.9,
            attackMode: 'pounce', projectileType: null,
            aggroRange: 195, rocketAggroRange: 215, attacksRocket: true,
            habitatPref: 'ridge',
            desc: 'Sombra esbelta coronada de ojos violetas. Ejecuta saltos dimensionales instantáneos para emboscar exploradores y cohetes.',
            palettes: [
                { body: '#140f24', secondary: '#2a1b4a', accent: '#d946ef', eye: '#fae8ff', horn: '#f0abfc', glow: 'rgba(217, 70, 239, 0.65)' }
            ]
        },
        {
            id: 'anom_oracle_eye',
            name: 'Ojo del Oráculo Arcano',
            classId: 'anomaly',
            renderType: 'anom_oracle_eye',
            temperamentKey: 'APEX_BOSS',
            locomotion: 'floater',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'titan_boss',
            scaleMin: 1.55, scaleMax: 1.78,
            hp: 560, armor: 0.3, damage: 30, rocketDamageMult: 1.2,
            baseSpeed: 9.5, chaseMult: 1.45, fleeMult: 1.0,
            flyAltitudeMin: 26, flyAltitudeMax: 85,
            attackMode: 'boss_multi', projectileType: 'arcane',
            aggroRange: 280, rocketAggroRange: 320, attacksRocket: true,
            habitatPref: 'ridge',
            desc: 'Constructo supremo de anillos rúnicos y pilares orbitales. Su iris sigue al objetivo y desata andanadas arcanas contra naves.',
            palettes: [
                { body: '#16112b', secondary: '#2c1f57', accent: '#a78bfa', eye: '#f43f5e', horn: '#fde047', glow: 'rgba(167, 139, 250, 0.7)' }
            ]
        }
    ],

    // =========================================================================
    // 12. ARTIFICIAL (Megaestructuras & Mundos Sintéticos) — 3 especies únicas
    // =========================================================================
    artificial: [
        {
            id: 'art_repair_bot',
            name: 'Micro-Dron Reparador',
            classId: 'artificial',
            renderType: 'art_repair_bot',
            temperamentKey: 'DOCILE_SHY',
            locomotion: 'flyer',
            grouping: 'flock',
            groupMin: 3, groupMax: 4,
            sizeClass: 'small',
            scaleMin: 0.72, scaleMax: 0.88,
            hp: 35, armor: 0.1, damage: 0, rocketDamageMult: 0,
            baseSpeed: 15.0, chaseMult: 1.0, fleeMult: 2.3,
            flyAltitudeMin: 18, flyAltitudeMax: 65,
            attackMode: 'none', projectileType: null,
            aggroRange: 95, rocketAggroRange: 130, attacksRocket: false,
            habitatPref: 'valley',
            desc: 'Autómata esférico de mantenimiento con pinzas retráctiles. Patrulla en escuadrón y huye emitiendo alertas si se siente amenazado.',
            palettes: [
                { body: '#1e293b', secondary: '#334155', accent: '#38bdf8', eye: '#7dd3fc', horn: '#e2e8f0', glow: 'rgba(56, 189, 248, 0.55)' }
            ]
        },
        {
            id: 'art_hunter_drone',
            name: 'Interceptor Hexagonal',
            classId: 'artificial',
            renderType: 'art_hunter_drone',
            temperamentKey: 'VIOLENT_ROCKET_HUNTER',
            locomotion: 'flyer',
            grouping: 'pair',
            groupMin: 1, groupMax: 2,
            sizeClass: 'medium',
            scaleMin: 1.0, scaleMax: 1.18,
            hp: 135, armor: 0.2, damage: 18, rocketDamageMult: 1.1,
            baseSpeed: 18.5, chaseMult: 1.65, fleeMult: 1.3,
            flyAltitudeMin: 28, flyAltitudeMax: 95,
            attackMode: 'ranged', projectileType: 'laser',
            aggroRange: 235, rocketAggroRange: 280, attacksRocket: true,
            habitatPref: 'any_solid',
            desc: 'Dron interceptor táctico con turbinas basculantes y visor de puntería láser. Persigue activamente al cohete disparando ráfagas.',
            palettes: [
                { body: '#18181b', secondary: '#27272a', accent: '#f43f5e', eye: '#ef4444', horn: '#fbbf24', glow: 'rgba(244, 63, 94, 0.6)' }
            ]
        },
        {
            id: 'art_siege_mech',
            name: 'Autómata Titán de Asedio',
            classId: 'artificial',
            renderType: 'art_siege_mech',
            temperamentKey: 'APEX_BOSS',
            locomotion: 'walker',
            grouping: 'solitary',
            groupMin: 1, groupMax: 1,
            sizeClass: 'titan_boss',
            scaleMin: 1.55, scaleMax: 1.75,
            hp: 580, armor: 0.45, damage: 32, rocketDamageMult: 1.25,
            baseSpeed: 3.8, chaseMult: 1.3, fleeMult: 1.0,
            attackMode: 'boss_multi', projectileType: 'laser',
            aggroRange: 260, rocketAggroRange: 310, attacksRocket: true,
            habitatPref: 'valley',
            desc: 'Meca de combate pesado de marcha lentísima, blindaje masivo y reactor expuesto. Bombardeo de plasma continuo contra cohetes.',
            palettes: [
                { body: '#18181b', secondary: '#3f3f46', accent: '#f59e0b', eye: '#ef4444', horn: '#fde047', glow: 'rgba(245, 158, 11, 0.6)' }
            ]
        }
    ],

    // =========================================================================
    // 13. MISTY (Brumosos & Nieblas Eternas) — 3 especies únicas
    // =========================================================================
    misty: [
        {
            id: 'mist_lantern_moth',
            name: 'Polilla Farol de Bruma',
            classId: 'misty',
            renderType: 'mist_lantern_moth',
            temperamentKey: 'PEACEFUL_BENEVOLENT',
            locomotion: 'flyer',
            grouping: 'flock',
            groupMin: 2, groupMax: 4,
            sizeClass: 'small',
            scaleMin: 0.82, scaleMax: 1.05,
            hp: 36, armor: 0.0, damage: 0, rocketDamageMult: 0,
            baseSpeed: 12.0, chaseMult: 1.0, fleeMult: 1.9,
            flyAltitudeMin: 22, flyAltitudeMax: 78,
            attackMode: 'none', projectileType: null,
            aggroRange: 110, rocketAggroRange: 95, attacksRocket: false,
            habitatPref: 'valley',
            healsO2: true,
            desc: 'Crisálida alada que ilumina los bancos de neblina con destellos perlados y áureos, guiando a los exploradores en la bruma.',
            palettes: [
                { body: '#1e293b', secondary: '#334155', accent: '#7dd3fc', eye: '#e0f2fe', horn: '#bae6fd', glow: 'rgba(125, 211, 252, 0.62)' },
                { body: '#292524', secondary: '#44403c', accent: '#fcd34d', eye: '#fef3c7', horn: '#fde68a', glow: 'rgba(252, 211, 77, 0.58)' }
            ]
        },
        {
            id: 'mist_veil_manta',
            name: 'Mantarraya de Velo Etéreo',
            classId: 'misty',
            renderType: 'mist_veil_manta',
            temperamentKey: 'DOCILE_SHY',
            locomotion: 'flyer',
            grouping: 'pair',
            groupMin: 2, groupMax: 3,
            sizeClass: 'medium',
            scaleMin: 0.95, scaleMax: 1.20,
            hp: 54, armor: 0.05, damage: 0, rocketDamageMult: 0,
            baseSpeed: 14.5, chaseMult: 1.0, fleeMult: 2.1,
            flyAltitudeMin: 34, flyAltitudeMax: 115,
            attackMode: 'none', projectileType: null,
            aggroRange: 105, rocketAggroRange: 140, attacksRocket: false,
            habitatPref: 'valley',
            desc: 'Navega silenciosamente entre las capas de niebla baja ondeando largas cintas translúcidas.',
            palettes: [
                { body: '#164e63', secondary: '#155e75', accent: '#a5f3fc', eye: '#ecfeff', horn: '#cffafe', glow: 'rgba(165, 243, 252, 0.52)' },
                { body: '#312e81', secondary: '#3730a3', accent: '#c4b5fd', eye: '#ede9fe', horn: '#ddd6fe', glow: 'rgba(196, 181, 253, 0.52)' }
            ]
        },
        {
            id: 'mist_stag_sentinel',
            name: 'Ciervo Fantasma de la Bruma',
            classId: 'misty',
            renderType: 'mist_stag_sentinel',
            temperamentKey: 'NEUTRAL_TERRITORIAL',
            locomotion: 'jumper',
            grouping: 'herd',
            groupMin: 2, groupMax: 3,
            sizeClass: 'large',
            scaleMin: 1.08, scaleMax: 1.28,
            hp: 135, armor: 0.15, damage: 14, rocketDamageMult: 0.65,
            baseSpeed: 12.5, chaseMult: 1.5, fleeMult: 1.8,
            jumpPower: 102, jumpCooldown: 1.8,
            attackMode: 'melee', projectileType: null,
            aggroRange: 125, rocketAggroRange: 140, attacksRocket: true,
            habitatPref: 'ridge',
            desc: 'Guardián silencioso de los altiplanos brumosos cuyas astas brillan suavemente entre la neblina nocturna.',
            palettes: [
                { body: '#1e293b', secondary: '#334155', accent: '#99f6e4', eye: '#f0fdfa', horn: '#5eead4', glow: 'rgba(153, 246, 228, 0.55)' }
            ]
        }
    ]
};

// Índice plano por ID para búsqueda rápida
const CREATURE_SPECIES_MAP = {};
for (const clsKey of Object.keys(CREATURE_SPECIES_BY_CLASS)) {
    for (const sp of CREATURE_SPECIES_BY_CLASS[clsKey]) {
        CREATURE_SPECIES_MAP[sp.id] = sp;
    }
}
