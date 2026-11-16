/**
 * ÉTER — Sistema de Recursos Planetarios, Yacimientos Regionales,
 * Infraestructura de Máquinas Extractoras (Nv.1–Nv.4), Análisis Geológico
 * y Reserva de Combustible del Astronauta.
 */

// ============================================================================
// 1. CATÁLOGO UNIFICADO DE RECURSOS Y MINERALES
// ============================================================================
const RESOURCE_CATALOG = {
    ether_fuel: {
        id: 'ether_fuel',
        name: 'Éter Combustible',
        shortName: 'Éter',
        family: 'fuel',
        rarity: 'Combustible',
        unit: 'L',
        color: '#fbbf24',
        rgb: [251, 191, 36],
        icon: '⚡',
        fuelYield: 1,
        desc: 'Plasma volátil subcortical. Propelente principal de cohetes y propulsores.'
    },
    basalt_stone: {
        id: 'basalt_stone',
        name: 'Piedra Basáltica',
        shortName: 'Piedra',
        family: 'structural',
        rarity: 'Común',
        unit: 'u',
        color: '#94a3b8',
        rgb: [148, 163, 184],
        icon: '🪨',
        desc: 'Roca densa silicática para cimentación, blindaje y futura construcción naval.'
    },
    ferrite: {
        id: 'ferrite',
        name: 'Ferrita / Hierro',
        shortName: 'Hierro',
        family: 'structural',
        rarity: 'Común',
        unit: 'u',
        color: '#cbd5e1',
        rgb: [203, 213, 225],
        icon: '⚙️',
        desc: 'Mineral férrico magnético para chasis de máquinas, reparación y cohetes.'
    },
    copper_ore: {
        id: 'copper_ore',
        name: 'Cobre Conductor',
        shortName: 'Cobre',
        family: 'catalyst',
        rarity: 'Común',
        unit: 'u',
        color: '#f97316',
        rgb: [249, 115, 22],
        icon: '🔶',
        desc: 'Veta cuprífera de alta conductividad para bobinas, circuitos y propulsores.'
    },
    silica: {
        id: 'silica',
        name: 'Sílice Cristalina',
        shortName: 'Sílice',
        family: 'structural',
        rarity: 'Común',
        unit: 'u',
        color: '#e2e8f0',
        rgb: [226, 232, 240],
        icon: '🏜️',
        desc: 'Cuarzo purificado para ópticas, tanques presurizados y sellos térmicos.'
    },
    calcite: {
        id: 'calcite',
        name: 'Calcita Lunar',
        shortName: 'Calcita',
        family: 'structural',
        rarity: 'Común',
        unit: 'u',
        color: '#d6d3d1',
        rgb: [214, 211, 209],
        icon: '🦴',
        desc: 'Carbonato mineral ligero para aleaciones estructurales y filtros.'
    },
    regolith: {
        id: 'regolith',
        name: 'Regolito Sinterizado',
        shortName: 'Regolito',
        family: 'structural',
        rarity: 'Común',
        unit: 'u',
        color: '#a8a29e',
        rgb: [168, 162, 158],
        icon: '🌑',
        desc: 'Polvo cósmico compactado para aislamiento térmico y cimentación.'
    },
    quartz_res: {
        id: 'quartz_res',
        name: 'Cuarzo Resonante',
        shortName: 'Cuarzo',
        family: 'catalyst',
        rarity: 'Poco Común',
        unit: 'u',
        color: '#c084fc',
        rgb: [192, 132, 252],
        icon: '🔮',
        desc: 'Cristal piezoeléctrico usado en resonadores de extracción de alto nivel.'
    },
    sulfur_pyr: {
        id: 'sulfur_pyr',
        name: 'Azufre Piroclástico',
        shortName: 'Azufre',
        family: 'catalyst',
        rarity: 'Poco Común',
        unit: 'u',
        color: '#eab308',
        rgb: [234, 179, 8],
        icon: '🌋',
        fuelYield: 2.5,
        desc: 'Compuesto volcánico reactivo. Refinable en Éter Combustible.'
    },
    helium_ice: {
        id: 'helium_ice',
        name: 'Hielo de Helio-3',
        shortName: 'Helio-3',
        family: 'catalyst',
        rarity: 'Poco Común',
        unit: 'u',
        color: '#38bdf8',
        rgb: [56, 189, 248],
        icon: '❄️',
        fuelYield: 4.0,
        desc: 'Isótopo criogénico de fusión. Altísimo rendimiento al refinarse en combustible.'
    },
    methane_h: {
        id: 'methane_h',
        name: 'Hidrato de Metano',
        shortName: 'Metano',
        family: 'catalyst',
        rarity: 'Poco Común',
        unit: 'u',
        color: '#60a5fa',
        rgb: [96, 165, 250],
        icon: '💧',
        fuelYield: 3.2,
        desc: 'Hidrocarburo congelado fácilmente refinable en propelente líquido.'
    },
    lithium: {
        id: 'lithium',
        name: 'Litio Salino',
        shortName: 'Litio',
        family: 'catalyst',
        rarity: 'Poco Común',
        unit: 'u',
        color: '#67e8f9',
        rgb: [103, 232, 249],
        icon: '🔋',
        desc: 'Metal alcalino ligero esencial para capacitores y almacenamiento energético.'
    },
    meteor_ir: {
        id: 'meteor_ir',
        name: 'Iridio Estelar',
        shortName: 'Iridio',
        family: 'advanced',
        rarity: 'Poco Común',
        unit: 'u',
        color: '#7dd3fc',
        rgb: [125, 211, 252],
        icon: '☄️',
        desc: 'Aleación meteórica ultradensa resistente a presiones extremas.'
    },
    obsidian_q: {
        id: 'obsidian_q',
        name: 'Obsidiana Cuántica',
        shortName: 'Obsidiana',
        family: 'advanced',
        rarity: 'Raro',
        unit: 'u',
        color: '#a855f7',
        rgb: [168, 85, 247],
        icon: '🖤',
        desc: 'Vidrio volcánico templado capaz de contener haces de perforación profunda.'
    },
    titanite: {
        id: 'titanite',
        name: 'Titanita Iónica',
        shortName: 'Titanita',
        family: 'advanced',
        rarity: 'Raro',
        unit: 'u',
        color: '#2dd4bf',
        rgb: [45, 212, 191],
        icon: '🛡️',
        desc: 'Aleación cristalina para toberas, reactores Nv.4 y blindaje espacial.'
    },
    bismuth_g: {
        id: 'bismuth_g',
        name: 'Bismuto Fractal',
        shortName: 'Bismuto',
        family: 'catalyst',
        rarity: 'Raro',
        unit: 'u',
        color: '#f472b6',
        rgb: [244, 114, 182],
        icon: '🌈',
        desc: 'Red metálica iridiscente para moduladores cuánticos y escáneres.'
    },
    uraninite: {
        id: 'uraninite',
        name: 'Uraninita Cósmica',
        shortName: 'Uraninita',
        family: 'catalyst',
        rarity: 'Raro',
        unit: 'u',
        color: '#4ade80',
        rgb: [74, 222, 128],
        icon: '☢️',
        fuelYield: 6.0,
        desc: 'Mineral fisionable de altísima densidad energética refinable en Éter.'
    },
    amber_resin: {
        id: 'amber_resin',
        name: 'Resina Astral Ámbar',
        shortName: 'Resina',
        family: 'catalyst',
        rarity: 'Exótico',
        unit: 'u',
        color: '#f59e0b',
        rgb: [245, 158, 11],
        icon: '🍯',
        fuelYield: 4.5,
        desc: 'Bio-polímero energético orgánico refinable en Éter de alta pureza.'
    },
    gravity_nod: {
        id: 'gravity_nod',
        name: 'Nódulo de Masa Negativa',
        shortName: 'Nódulo G',
        family: 'advanced',
        rarity: 'Exótico',
        unit: 'u',
        color: '#818cf8',
        rgb: [129, 140, 248],
        icon: '🌀',
        desc: 'Fragmento exótico que estabiliza anillos de contención de nivel máximo.'
    },
    tachyon_sil: {
        id: 'tachyon_sil',
        name: 'Silicato de Taquiones',
        shortName: 'Taquión',
        family: 'advanced',
        rarity: 'Ancestral',
        unit: 'u',
        color: '#fde047',
        rgb: [253, 224, 71],
        icon: '✨',
        desc: 'Cristal primordial hiper-lumínico para nexos cuánticos de extracción.'
    }
};

const RESOURCE_ALIASES = {
    cryo_ice: 'helium_ice',
    aether_cryst: 'quartz_res',
    pyrite_mag: 'copper_ore',
    obsidian_v: 'obsidian_q',
    dark_basalt: 'basalt_stone'
};

function resolveResourceId(id) {
    if (!id) return 'ferrite';
    return RESOURCE_ALIASES[id] || (RESOURCE_CATALOG[id] ? id : 'ferrite');
}

function getResourceDef(id) {
    return RESOURCE_CATALOG[resolveResourceId(id)] || RESOURCE_CATALOG.ferrite;
}

const RESOURCE_FAMILY_LABELS = {
    fuel: 'Combustible',
    structural: 'Estructural (Piedra/Hierro/Sílice)',
    catalyst: 'Conductor / Energético (Cobre/Cristal/Isótopo)',
    advanced: 'Avanzado / Exótico (Titanita/Iridio/Obsidiana)'
};

// ============================================================================
// 2. PERFILES DE RECURSOS POR CATEGORÍA DE PLANETA (16 CLASES)
// ============================================================================
const PLANET_CATEGORY_RESOURCES = {
    terrestrial: {
        fuelProfile: { baseAvg: 0.48, variance: 0.44, minRichness: 0.16, maxRichness: 0.86, tierLabel: 'Moderado', summary: 'Vetas equilibradas de Éter entre cuencas sedimentarias y mesetas.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.48, variance: 0.44, min: 0.16, max: 0.86 },
            { id: 'ferrite',      avg: 0.62, variance: 0.36, min: 0.24, max: 0.92 },
            { id: 'copper_ore',   avg: 0.50, variance: 0.45, min: 0.15, max: 0.88 },
            { id: 'basalt_stone', avg: 0.66, variance: 0.30, min: 0.30, max: 0.94 },
            { id: 'amber_resin',  avg: 0.30, variance: 0.55, min: 0.08, max: 0.78 }
        ]
    },
    desert: {
        fuelProfile: { baseAvg: 0.21, variance: 0.30, minRichness: 0.06, maxRichness: 0.44, tierLabel: 'Escaso', summary: 'Corteza árida con muy poco Éter superficial; requiere prospección paciente.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.21, variance: 0.30, min: 0.06, max: 0.44 },
            { id: 'silica',       avg: 0.80, variance: 0.26, min: 0.45, max: 0.98 },
            { id: 'basalt_stone', avg: 0.64, variance: 0.32, min: 0.28, max: 0.92 },
            { id: 'copper_ore',   avg: 0.48, variance: 0.44, min: 0.14, max: 0.86 },
            { id: 'calcite',      avg: 0.42, variance: 0.40, min: 0.14, max: 0.80 }
        ]
    },
    cryogenic: {
        fuelProfile: { baseAvg: 0.49, variance: 0.82, minRichness: 0.07, maxRichness: 0.96, tierLabel: 'Muy Variable', summary: 'Glaciares estériles alternados con bolsas presurizadas de metano y Éter.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.49, variance: 0.82, min: 0.07, max: 0.96 },
            { id: 'helium_ice',   avg: 0.64, variance: 0.52, min: 0.16, max: 0.96 },
            { id: 'methane_h',    avg: 0.56, variance: 0.60, min: 0.12, max: 0.94 },
            { id: 'silica',       avg: 0.48, variance: 0.35, min: 0.20, max: 0.82 },
            { id: 'titanite',     avg: 0.26, variance: 0.58, min: 0.06, max: 0.76 }
        ]
    },
    volcanic: {
        fuelProfile: { baseAvg: 0.46, variance: 0.86, minRichness: 0.06, maxRichness: 0.98, tierLabel: 'Muy Variable', summary: 'Placas basálticas pobres junto a fallas térmicas extremadamente ricas en Éter.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.46, variance: 0.86, min: 0.06, max: 0.98 },
            { id: 'sulfur_pyr',   avg: 0.70, variance: 0.45, min: 0.22, max: 0.98 },
            { id: 'ferrite',      avg: 0.62, variance: 0.38, min: 0.22, max: 0.94 },
            { id: 'copper_ore',   avg: 0.52, variance: 0.48, min: 0.14, max: 0.90 },
            { id: 'obsidian_q',   avg: 0.34, variance: 0.62, min: 0.06, max: 0.86 }
        ]
    },
    oceanic: {
        fuelProfile: { baseAvg: 0.52, variance: 0.42, minRichness: 0.18, maxRichness: 0.86, tierLabel: 'Moderado', summary: 'Atolones y plataformas flotantes con depósitos hidrotermales constantes.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.52, variance: 0.42, min: 0.18, max: 0.86 },
            { id: 'lithium',      avg: 0.64, variance: 0.40, min: 0.22, max: 0.92 },
            { id: 'calcite',      avg: 0.60, variance: 0.34, min: 0.26, max: 0.90 },
            { id: 'silica',       avg: 0.50, variance: 0.32, min: 0.20, max: 0.82 },
            { id: 'amber_resin',  avg: 0.38, variance: 0.50, min: 0.10, max: 0.84 }
        ]
    },
    crystalline: {
        fuelProfile: { baseAvg: 0.23, variance: 0.36, minRichness: 0.07, maxRichness: 0.52, tierLabel: 'Escaso', summary: 'Corteza mineralizada densa; escaso combustible pero riqueza cristalina.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.23, variance: 0.36, min: 0.07, max: 0.52 },
            { id: 'quartz_res',   avg: 0.72, variance: 0.38, min: 0.30, max: 0.98 },
            { id: 'bismuth_g',    avg: 0.54, variance: 0.50, min: 0.14, max: 0.92 },
            { id: 'ferrite',      avg: 0.52, variance: 0.36, min: 0.20, max: 0.85 },
            { id: 'titanite',     avg: 0.40, variance: 0.55, min: 0.08, max: 0.88 }
        ]
    },
    toxic: {
        fuelProfile: { baseAvg: 0.44, variance: 0.88, minRichness: 0.06, maxRichness: 0.97, tierLabel: 'Muy Variable', summary: 'Zonas muertas irradiadas y bolsillos químicos saturados de Éter.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.44, variance: 0.88, min: 0.06, max: 0.97 },
            { id: 'uraninite',    avg: 0.58, variance: 0.55, min: 0.12, max: 0.95 },
            { id: 'sulfur_pyr',   avg: 0.62, variance: 0.44, min: 0.20, max: 0.94 },
            { id: 'ferrite',      avg: 0.50, variance: 0.36, min: 0.18, max: 0.86 },
            { id: 'titanite',     avg: 0.34, variance: 0.56, min: 0.08, max: 0.84 }
        ]
    },
    anomaly: {
        fuelProfile: { baseAvg: 0.74, variance: 0.48, minRichness: 0.32, maxRichness: 0.99, tierLabel: 'Abundante', summary: 'Flujo anómalo de Éter condensado en toda la corteza.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.74, variance: 0.48, min: 0.32, max: 0.99 },
            { id: 'quartz_res',   avg: 0.60, variance: 0.44, min: 0.20, max: 0.94 },
            { id: 'silica',       avg: 0.46, variance: 0.34, min: 0.18, max: 0.82 },
            { id: 'gravity_nod',  avg: 0.42, variance: 0.60, min: 0.08, max: 0.90 },
            { id: 'tachyon_sil',  avg: 0.34, variance: 0.62, min: 0.06, max: 0.86 }
        ]
    },
    hollow: {
        fuelProfile: { baseAvg: 0.46, variance: 0.82, minRichness: 0.08, maxRichness: 0.96, tierLabel: 'Muy Variable', summary: 'Corteza exterior pobre, pero cavidades interiores muy ricas en Éter.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.46, variance: 0.82, min: 0.08, max: 0.96 },
            { id: 'calcite',      avg: 0.60, variance: 0.36, min: 0.24, max: 0.90 },
            { id: 'copper_ore',   avg: 0.54, variance: 0.46, min: 0.16, max: 0.90 },
            { id: 'quartz_res',   avg: 0.58, variance: 0.48, min: 0.14, max: 0.94 },
            { id: 'obsidian_q',   avg: 0.32, variance: 0.58, min: 0.06, max: 0.84 }
        ]
    },
    shattered: {
        fuelProfile: { baseAvg: 0.19, variance: 0.36, minRichness: 0.06, maxRichness: 0.46, tierLabel: 'Escaso', summary: 'Restos fracturados con fugas de volátiles; combustible muy limitado.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.19, variance: 0.36, min: 0.06, max: 0.46 },
            { id: 'ferrite',      avg: 0.72, variance: 0.36, min: 0.32, max: 0.96 },
            { id: 'basalt_stone', avg: 0.68, variance: 0.32, min: 0.30, max: 0.94 },
            { id: 'meteor_ir',    avg: 0.54, variance: 0.52, min: 0.14, max: 0.92 },
            { id: 'gravity_nod',  avg: 0.36, variance: 0.60, min: 0.06, max: 0.85 }
        ]
    },
    megalithic: {
        fuelProfile: { baseAvg: 0.40, variance: 0.60, minRichness: 0.10, maxRichness: 0.88, tierLabel: 'Variable', summary: 'Antiguos conductos bajo megalitos concentran combustible en sectores concretos.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.40, variance: 0.60, min: 0.10, max: 0.88 },
            { id: 'basalt_stone', avg: 0.68, variance: 0.30, min: 0.32, max: 0.94 },
            { id: 'titanite',     avg: 0.54, variance: 0.48, min: 0.14, max: 0.92 },
            { id: 'bismuth_g',    avg: 0.46, variance: 0.52, min: 0.10, max: 0.88 },
            { id: 'tachyon_sil',  avg: 0.32, variance: 0.60, min: 0.06, max: 0.84 }
        ]
    },
    living: {
        fuelProfile: { baseAvg: 0.72, variance: 0.42, minRichness: 0.34, maxRichness: 0.96, tierLabel: 'Abundante', summary: 'Biosfera metabólica que genera abundante bio-Éter y resinas energéticas.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.72, variance: 0.42, min: 0.34, max: 0.96 },
            { id: 'amber_resin',  avg: 0.70, variance: 0.42, min: 0.28, max: 0.96 },
            { id: 'calcite',      avg: 0.56, variance: 0.34, min: 0.22, max: 0.88 },
            { id: 'quartz_res',   avg: 0.48, variance: 0.46, min: 0.14, max: 0.88 },
            { id: 'basalt_stone', avg: 0.44, variance: 0.30, min: 0.18, max: 0.78 }
        ]
    },
    cometary: {
        fuelProfile: { baseAvg: 0.78, variance: 0.38, minRichness: 0.40, maxRichness: 0.98, tierLabel: 'Abundante', summary: 'Núcleo volátil riquísimo en gases criogénicos y Éter listo para extraer.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.78, variance: 0.38, min: 0.40, max: 0.98 },
            { id: 'helium_ice',   avg: 0.74, variance: 0.40, min: 0.32, max: 0.98 },
            { id: 'methane_h',    avg: 0.68, variance: 0.42, min: 0.28, max: 0.95 },
            { id: 'meteor_ir',    avg: 0.52, variance: 0.48, min: 0.16, max: 0.90 },
            { id: 'copper_ore',   avg: 0.44, variance: 0.36, min: 0.16, max: 0.82 }
        ]
    },
    gravitic: {
        fuelProfile: { baseAvg: 0.38, variance: 0.90, minRichness: 0.06, maxRichness: 0.98, tierLabel: 'Muy Variable', summary: 'La compresión gravitatoria crea pozos extremos: casi vacío o hiper-denso.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.38, variance: 0.90, min: 0.06, max: 0.98 },
            { id: 'gravity_nod',  avg: 0.60, variance: 0.56, min: 0.12, max: 0.95 },
            { id: 'ferrite',      avg: 0.56, variance: 0.38, min: 0.20, max: 0.90 },
            { id: 'obsidian_q',   avg: 0.46, variance: 0.52, min: 0.10, max: 0.90 },
            { id: 'meteor_ir',    avg: 0.44, variance: 0.50, min: 0.10, max: 0.88 }
        ]
    },
    artificial: {
        fuelProfile: { baseAvg: 0.80, variance: 0.36, minRichness: 0.44, maxRichness: 0.99, tierLabel: 'Abundante', summary: 'Células de almacenamiento sintéticas con reservas masivas de Éter y metales.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.80, variance: 0.36, min: 0.44, max: 0.99 },
            { id: 'ferrite',      avg: 0.74, variance: 0.32, min: 0.36, max: 0.96 },
            { id: 'copper_ore',   avg: 0.68, variance: 0.36, min: 0.30, max: 0.94 },
            { id: 'bismuth_g',    avg: 0.52, variance: 0.48, min: 0.16, max: 0.90 },
            { id: 'titanite',     avg: 0.46, variance: 0.50, min: 0.12, max: 0.88 }
        ]
    },
    temporal: {
        fuelProfile: { baseAvg: 0.43, variance: 0.90, minRichness: 0.06, maxRichness: 0.99, tierLabel: 'Muy Variable', summary: 'Tormentas de fase concentran Éter en focos intensos dejando desiertos inertes.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.43, variance: 0.90, min: 0.06, max: 0.99 },
            { id: 'uraninite',    avg: 0.50, variance: 0.58, min: 0.10, max: 0.94 },
            { id: 'quartz_res',   avg: 0.56, variance: 0.50, min: 0.14, max: 0.92 },
            { id: 'bismuth_g',    avg: 0.48, variance: 0.52, min: 0.10, max: 0.90 },
            { id: 'basalt_stone', avg: 0.50, variance: 0.34, min: 0.20, max: 0.84 }
        ]
    },
    misty: {
        fuelProfile: { baseAvg: 0.62, variance: 0.36, minRichness: 0.26, maxRichness: 0.92, tierLabel: 'Rico (Condensado)', summary: 'Atmósfera saturada de vapor y condensado etéreo que recarga fácilmente los depósitos.' },
        resources: [
            { id: 'ether_fuel',   avg: 0.62, variance: 0.36, min: 0.26, max: 0.92 },
            { id: 'silica',       avg: 0.60, variance: 0.32, min: 0.24, max: 0.88 },
            { id: 'calcite',      avg: 0.58, variance: 0.34, min: 0.22, max: 0.88 },
            { id: 'quartz_res',   avg: 0.52, variance: 0.44, min: 0.16, max: 0.90 },
            { id: 'amber_resin',  avg: 0.44, variance: 0.48, min: 0.12, max: 0.86 }
        ]
    }
};

function getPlanetCategoryProfile(planet) {
    const classId = (planet && planet.archetype && planet.archetype.classId) || 'terrestrial';
    return PLANET_CATEGORY_RESOURCES[classId] || PLANET_CATEGORY_RESOURCES.terrestrial;
}

// ============================================================================
// 3. GENERACIÓN DETERMINISTA DE YACIMIENTOS REGIONALES POR PLANETA
// ============================================================================
function hashStringSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function createDeterministicRNG(seedStr) {
    let a = hashStringSeed(seedStr) || 1337;
    return function() {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function initPlanetResourceField(planet) {
    if (!planet || planet.resourceField) return;

    const catProf = getPlanetCategoryProfile(planet);
    const seedKey = (typeof universeSeed !== 'undefined' ? universeSeed : 'ASTRAL-7') + '|' + planet.key + ':res_v1';
    const rng = createDeterministicRNG(seedKey);

    // Combinar recursos de categoría + posibles minerales propios del arquetipo sin duplicados
    const entryMap = new Map();
    for (const r of catProf.resources) {
        entryMap.set(r.id, { ...r });
    }
    const archMins = (planet.archetype && planet.archetype.possibleMinerals) || [];
    for (const rawId of archMins) {
        const rid = resolveResourceId(rawId);
        if (!entryMap.has(rid)) {
            const def = getResourceDef(rid);
            const avg = def.rarity === 'Común' ? 0.50 : (def.rarity === 'Poco Común' ? 0.36 : 0.24);
            entryMap.set(rid, { id: rid, avg, variance: 0.50, min: 0.07, max: 0.84 });
        }
    }

    // Limitar a 5-6 recursos bien diferenciados por planeta (siempre Éter primero)
    const allEntries = Array.from(entryMap.values());
    const etherEntry = allEntries.find(e => e.id === 'ether_fuel') || { id: 'ether_fuel', avg: 0.45, variance: 0.5, min: 0.1, max: 0.9 };
    const otherEntries = allEntries.filter(e => e.id !== 'ether_fuel').slice(0, 5);
    const finalEntries = [etherEntry, ...otherEntries];

    const deposits = {};
    for (const entry of finalEntries) {
        // Desviación natural por planeta dentro de su categoría (+/- 12%)
        const planetBias = (rng() - 0.5) * 0.16;
        const planetAvg = clamp(entry.avg + planetBias, entry.min, entry.max);
        const veinCount = 2 + Math.floor(rng() * 3); // 2 a 4 grandes secciones geológicas por recurso
        const veins = [];
        const baseOffset = rng() * Math.PI * 2;

        for (let v = 0; v < veinCount; v++) {
            const vAng = wrapAngle(baseOffset + (v / veinCount) * Math.PI * 2 + (rng() - 0.5) * 0.65);
            const width = 0.42 + rng() * 0.65; // Grandes secciones del planeta (~24° a 60° radio => 48°-120° ancho!)
            const polarity = (v === 0) ? 1 : (rng() < 0.58 ? 1 : -1); // Vetas ricas y cuencas pobres
            const strength = (0.35 + rng() * 0.65) * entry.variance * polarity;
            veins.push({ angle: vAng, width, strength });
        }

        // En el planeta origen, garantizar una zona rica accesible y una zona moderada cerca del inicio (-PI/2)
        if (planet.isOrigin && entry.id === 'ether_fuel') {
            veins[0] = { angle: -Math.PI * 0.5 + 0.55, width: 0.52, strength: 0.42 };
        }

        deposits[entry.id] = {
            id: entry.id,
            planetAvg,
            min: entry.min,
            max: entry.max,
            variance: entry.variance,
            phaseA: rng() * Math.PI * 2,
            phaseB: rng() * Math.PI * 2,
            veins
        };
    }

    planet.resourceField = {
        fuelProfile: catProf.fuelProfile,
        resourceIds: finalEntries.map(e => e.id),
        deposits
    };

    // Sincronizar planet.minerals para el Códice, Escáner y Carta Astral
    planet.minerals = finalEntries.filter(e => e.id !== 'ether_fuel').map(e => getResourceDef(e.id));
}

function getPlanetResourceIds(planet) {
    if (!planet) return ['ether_fuel', 'ferrite', 'basalt_stone', 'copper_ore'];
    if (!planet.resourceField) initPlanetResourceField(planet);
    return planet.resourceField.resourceIds;
}

function samplePlanetResourceRichness(planet, angle, resourceId, inCavern = false) {
    if (!planet) return { richness: 0.45, avg: 0.45, delta: 0, rating: 'Moderado', color: '#fbbf24' };
    if (!planet.resourceField) initPlanetResourceField(planet);

    const rid = resolveResourceId(resourceId);
    const dep = planet.resourceField.deposits[rid];
    if (!dep) {
        return { richness: 0.12, avg: 0.12, delta: 0, rating: 'Traza', color: '#94a3b8' };
    }

    let val = dep.planetAvg;

    // 1. Grandes secciones geológicas (veins)
    for (const vein of dep.veins) {
        const dAng = Math.abs(Math.atan2(Math.sin(angle - vein.angle), Math.cos(angle - vein.angle)));
        if (dAng < vein.width * 1.6) {
            const u = dAng / (vein.width * 1.6);
            const lobe = Math.cos(u * Math.PI * 0.5);
            val += lobe * lobe * vein.strength * 0.72;
        }
    }

    // 2. Variación secundaria de estratos locales
    const wave = Math.sin(angle * 3 + dep.phaseA) * 0.08 + Math.cos(angle * 7 + dep.phaseB) * 0.045;
    val += wave * (0.5 + dep.variance * 0.7);

    // 3. Modificador por provincia geológica si existe
    if (typeof getPlanetRegionAtAngle === 'function') {
        const reg = getPlanetRegionAtAngle(planet, angle);
        const regType = reg && reg.def && reg.def.id;
        if (regType) {
            if (rid === 'ether_fuel' && (regType === 'volcanic_caldera' || regType === 'ether_anomaly' || regType === 'geyser_field' || regType === 'fluid_basin')) {
                val += 0.12;
            } else if ((rid === 'ferrite' || rid === 'meteor_ir') && (regType === 'impact_crater' || regType === 'crater_field')) {
                val += 0.14;
            } else if ((rid === 'quartz_res' || rid === 'titanite') && (regType === 'crystalline_geode' || regType === 'colossal_peaks')) {
                val += 0.12;
            } else if (rid === 'silica' && (regType === 'dune_sea' || regType === 'landing_plains')) {
                val += 0.10;
            }
        }
    }

    // 4. Bonus subterráneo en mundos huecos
    if (inCavern && planet.isHollow) {
        val += 0.16;
    }

    const richness = clamp(val, dep.min, dep.max);
    const delta = richness - dep.planetAvg;
    const ratingInfo = getRichnessRating(richness);

    return {
        richness,
        avg: dep.planetAvg,
        delta,
        rating: ratingInfo.label,
        color: ratingInfo.color,
        badgeCls: ratingInfo.badgeCls
    };
}

function getRichnessRating(richness) {
    if (richness >= 0.78) return { label: 'Veta Maestra', color: '#34d399', badgeCls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' };
    if (richness >= 0.56) return { label: 'Rico',         color: '#38bdf8', badgeCls: 'bg-sky-500/20 text-sky-300 border-sky-400/40' };
    if (richness >= 0.34) return { label: 'Moderado',     color: '#fbbf24', badgeCls: 'bg-amber-500/20 text-amber-300 border-amber-400/40' };
    if (richness >= 0.18) return { label: 'Escaso',       color: '#fb923c', badgeCls: 'bg-orange-500/20 text-orange-300 border-orange-400/40' };
    return                       { label: 'Muy Escaso',   color: '#fb7185', badgeCls: 'bg-rose-500/20 text-rose-300 border-rose-400/40' };
}

function analyzeSurfaceSpot(planet, angle, inCavern = false) {
    const ids = getPlanetResourceIds(planet);
    const reg = (typeof getPlanetRegionAtAngle === 'function') ? getPlanetRegionAtAngle(planet, angle) : null;
    const entries = ids.map(id => {
        const def = getResourceDef(id);
        const sample = samplePlanetResourceRichness(planet, angle, id, inCavern);
        return {
            id,
            def,
            ...sample
        };
    });
    return {
        planetKey: planet.key,
        planetName: planet.name,
        angle: wrapAngle(angle),
        deg: Math.round((((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * 180 / Math.PI),
        inCavern: !!inCavern,
        regionName: reg ? reg.name : 'Superficie',
        biomeName: (reg && reg.def) ? reg.def.name : planet.archetype.typeLabel,
        fuelProfile: getPlanetCategoryProfile(planet).fuelProfile,
        entries
    };
}

// ============================================================================
// 4. DEFINICIÓN DE MÁQUINAS EXTRACTORAS (4 NIVELES EVOLUTIVOS)
// ============================================================================
const EXTRACTOR_TIERS = {
    1: {
        level: 1,
        name: 'Perforadora Portátil "Taladro-01"',
        shortName: 'Taladro-01',
        code: 'DRILL-01',
        accent: '#38bdf8',
        rgb: [56, 189, 248],
        baseCycle: 4.8,
        fuelBaseYield: 4.4,
        mineralBaseYield: 2.0,
        purityBonus: 1.0,
        maxFuelBuffer: 35,
        maxMineralBuffer: 30,
        width: 24,
        height: 26,
        desc: 'Extractor básico de despliegue inmediato. Ideal para prospectar zonas y obtener combustible inicial.',
        upgradeCost: null // Nivel inicial gratuito
    },
    2: {
        level: 2,
        name: 'Extractor Neumático "Barreno-II"',
        shortName: 'Barreno-II',
        code: 'AUGER-02',
        accent: '#fbbf24',
        rgb: [251, 191, 36],
        baseCycle: 3.8,
        fuelBaseYield: 9.0,
        mineralBaseYield: 4.2,
        purityBonus: 1.15,
        maxFuelBuffer: 110,
        maxMineralBuffer: 90,
        width: 34,
        height: 38,
        desc: 'Barreno rotatorio de doble pistón con tanque presurizado y escáner profundo (+15% pureza).',
        upgradeCost: { structural: 12 }
    },
    3: {
        level: 3,
        name: 'Torre de Bombeo "Titán-III"',
        shortName: 'Titán-III',
        code: 'RIG-03',
        accent: '#34d399',
        rgb: [52, 211, 153],
        baseCycle: 3.1,
        fuelBaseYield: 17.5,
        mineralBaseYield: 8.5,
        purityBonus: 1.32,
        maxFuelBuffer: 300,
        maxMineralBuffer: 240,
        width: 48,
        height: 54,
        desc: 'Torre industrial pesada con balancín hidráulico y separador de plasma (+32% pureza).',
        upgradeCost: { structural: 26, catalyst: 12 }
    },
    4: {
        level: 4,
        name: 'Complejo Cuántico "Nexo-IV"',
        shortName: 'Nexo-IV',
        code: 'NEXUS-04',
        accent: '#c084fc',
        rgb: [192, 132, 252],
        baseCycle: 2.5,
        fuelBaseYield: 32.0,
        mineralBaseYield: 16.0,
        purityBonus: 1.55,
        maxFuelBuffer: 800,
        maxMineralBuffer: 600,
        width: 64,
        height: 76,
        desc: 'Megaextractor de contención magnética que perfora el manto planetario (+55% pureza).',
        upgradeCost: { structural: 45, catalyst: 22, advanced: 6 }
    }
};

const FUEL_RESERVE_TIERS = {
    1: { level: 1, capacity: 150,  name: 'Tanque EVA Estándar',      upgradeCost: null },
    2: { level: 2, capacity: 350,  name: 'Mochila Presurizada Mk.II', upgradeCost: { structural: 16, catalyst: 8 } },
    3: { level: 3, capacity: 750,  name: 'Depósito Criogénico Mk.III',upgradeCost: { structural: 34, catalyst: 18 } },
    4: { level: 4, capacity: 1500, name: 'Célula Cuántica Mk.IV',    upgradeCost: { structural: 60, catalyst: 30, advanced: 8 } }
};

const MAX_EXTRACTORS_PER_PLANET = 16;
const planetaryExtractors = [];

let selectedExtractorId = null;
let hoveredExtractorId = null;

function getFuelReserveCapacity() {
    const lvl = (typeof astronaut !== 'undefined' && astronaut.fuelReserveLevel) ? astronaut.fuelReserveLevel : 1;
    return (FUEL_RESERVE_TIERS[lvl] || FUEL_RESERVE_TIERS[1]).capacity;
}

// ============================================================================
// 5. ECONOMÍA DE INVENTARIO Y MEJORAS POR FAMILIA
// ============================================================================
function getInventoryMap() {
    if (typeof astronaut === 'undefined') return {};
    if (!astronaut.inventory || typeof astronaut.inventory !== 'object') astronaut.inventory = {};
    return astronaut.inventory;
}

function getFamilyTotals(inv) {
    const totals = { structural: 0, catalyst: 0, advanced: 0, fuel: 0 };
    if (!inv) return totals;
    for (const [rawId, qty] of Object.entries(inv)) {
        const n = Math.floor(Number(qty) || 0);
        if (n <= 0) continue;
        const def = getResourceDef(rawId);
        if (totals[def.family] !== undefined) totals[def.family] += n;
    }
    return totals;
}

function canAffordFamilyCost(inv, cost) {
    if (!cost) return true;
    const totals = getFamilyTotals(inv);
    for (const [fam, req] of Object.entries(cost)) {
        if ((totals[fam] || 0) < req) return false;
    }
    return true;
}

/**
 * Consume materiales de cada familia priorizando los más comunes/abundantes
 * para no gastar minerales raros/energéticos innecesariamente.
 */
function spendFamilyCost(inv, cost) {
    if (!cost || !canAffordFamilyCost(inv, cost)) return null;
    const spent = {};
    const rarityPriority = { 'Común': 1, 'Poco Común': 2, 'Raro': 3, 'Exótico': 4, 'Ancestral': 5 };

    for (const [fam, reqRaw] of Object.entries(cost)) {
        let remaining = reqRaw;
        if (remaining <= 0) continue;

        const candidates = Object.keys(inv)
            .filter(id => {
                const n = Math.floor(Number(inv[id]) || 0);
                return n > 0 && getResourceDef(id).family === fam;
            })
            .sort((a, b) => {
                const da = getResourceDef(a);
                const db = getResourceDef(b);
                const pa = (rarityPriority[da.rarity] || 3) + (da.fuelYield ? 0.5 : 0);
                const pb = (rarityPriority[db.rarity] || 3) + (db.fuelYield ? 0.5 : 0);
                if (pa !== pb) return pa - pb;
                return (inv[b] || 0) - (inv[a] || 0);
            });

        for (const id of candidates) {
            if (remaining <= 0) break;
            const avail = Math.floor(inv[id] || 0);
            const take = Math.min(avail, remaining);
            if (take > 0) {
                inv[id] = avail - take;
                if (inv[id] <= 0) delete inv[id];
                spent[id] = (spent[id] || 0) + take;
                remaining -= take;
            }
        }
    }
    return spent;
}

// ============================================================================
// 6. CÁLCULO DE RENDIMIENTO DE EXTRACCIÓN Y SIMULACIÓN
// ============================================================================
function getExtractorMineralTotal(m) {
    if (!m || !m.storedMinerals) return 0;
    let sum = 0;
    for (const v of Object.values(m.storedMinerals)) {
        sum += Number(v) || 0;
    }
    return sum;
}

function getExtractorPerformance(m, planet) {
    const tier = EXTRACTOR_TIERS[m.level] || EXTRACTOR_TIERS[1];
    const p = planet || (typeof getPlanetByKey === 'function' ? getPlanetByKey(m.planetKey) : null);
    const mode = m.mode || 'mixed';

    // Determinar recurso objetivo y su riqueza local
    const planetResIds = p ? getPlanetResourceIds(p) : ['ether_fuel', 'ferrite'];
    const mineralIds = planetResIds.filter(id => id !== 'ether_fuel');
    const fuelSample = samplePlanetResourceRichness(p, m.angle, 'ether_fuel', !!m.inCavern);

    let activeResourceId = 'ether_fuel';
    let activeSample = fuelSample;
    if (mode !== 'mixed' && mode !== 'ether_fuel') {
        activeResourceId = resolveResourceId(mode);
        activeSample = samplePlanetResourceRichness(p, m.angle, activeResourceId, !!m.inCavern);
    }

    const r = activeSample.richness;
    const cycleTime = Math.max(1.2, tier.baseCycle * (1.85 - 1.15 * r));
    const richnessYieldFactor = (0.25 + 1.15 * r) * tier.purityBonus;

    let fuelPerCycle = 0;
    let mineralPerCycle = 0;
    let primaryMineralId = mineralIds[0] || 'ferrite';

    if (mode === 'ether_fuel') {
        fuelPerCycle = tier.fuelBaseYield * richnessYieldFactor * 1.32;
        mineralPerCycle = 0;
    } else if (mode === 'mixed') {
        fuelPerCycle = tier.fuelBaseYield * (0.25 + 1.15 * fuelSample.richness) * tier.purityBonus * 0.85;
        // En modo mixto también extrae minerales de la zona según su riqueza relativa
        const rotIdx = (m.totalCycles || 0) % Math.max(1, mineralIds.length);
        primaryMineralId = mineralIds[rotIdx] || 'ferrite';
        const minSample = samplePlanetResourceRichness(p, m.angle, primaryMineralId, !!m.inCavern);
        mineralPerCycle = tier.mineralBaseYield * (0.25 + 1.15 * minSample.richness) * tier.purityBonus * 0.72;
    } else {
        primaryMineralId = activeResourceId;
        fuelPerCycle = 0;
        mineralPerCycle = tier.mineralBaseYield * richnessYieldFactor * 1.55;
    }

    return {
        tier,
        mode,
        fuelRichness: fuelSample.richness,
        activeRichness: r,
        cycleTime,
        fuelPerCycle,
        mineralPerCycle,
        primaryMineralId,
        fuelRatePerSec: fuelPerCycle / cycleTime,
        mineralRatePerSec: mineralPerCycle / cycleTime
    };
}

function recordProspectedSpot(planet, machine) {
    if (!planet || !machine || typeof astronaut === 'undefined') return;
    if (!astronaut.prospectedZones || typeof astronaut.prospectedZones !== 'object') {
        astronaut.prospectedZones = {};
    }
    const list = astronaut.prospectedZones[planet.key] || [];
    const deg = Math.round((((machine.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * 180 / Math.PI);
    const fuelRichness = samplePlanetResourceRichness(planet, machine.angle, 'ether_fuel', !!machine.inCavern).richness;
    const reg = (typeof getPlanetRegionAtAngle === 'function') ? getPlanetRegionAtAngle(planet, machine.angle) : null;

    const existing = list.find(z => Math.abs(Math.atan2(Math.sin(z.angle - machine.angle), Math.cos(z.angle - machine.angle))) < 0.08);
    const entry = {
        angle: machine.angle,
        deg,
        fuelRichness,
        inCavern: !!machine.inCavern,
        regionName: reg ? reg.name : 'Superficie',
        extractorId: machine.id
    };
    if (existing) {
        Object.assign(existing, entry);
    } else {
        list.push(entry);
        astronaut.prospectedZones[planet.key] = list;
    }
}

function applyExtractorCycles(m, planet, cyclesCount, notifyFirstAnalysis = true) {
    if (cyclesCount <= 0) return;
    const tier = EXTRACTOR_TIERS[m.level] || EXTRACTOR_TIERS[1];
    const p = planet || (typeof getPlanetByKey === 'function' ? getPlanetByKey(m.planetKey) : null);
    if (!p) return;

    const planetResIds = getPlanetResourceIds(p);
    const mineralIds = planetResIds.filter(id => id !== 'ether_fuel');
    const mode = m.mode || 'mixed';

    // Para ráfagas grandes (ej. catch-up al regresar al planeta), promediar eficientemente
    const maxBatch = Math.min(cyclesCount, 200);
    const scaleFactor = cyclesCount > 200 ? (cyclesCount / maxBatch) : 1;

    for (let c = 0; c < maxBatch; c++) {
        const perf = getExtractorPerformance(m, p);

        if (perf.fuelPerCycle > 0) {
            const freeFuelSpace = Math.max(0, tier.maxFuelBuffer - (m.storedFuel || 0));
            const addF = Math.min(freeFuelSpace, perf.fuelPerCycle * scaleFactor);
            m.storedFuel = (m.storedFuel || 0) + addF;
            m.totalFuelExtracted = (m.totalFuelExtracted || 0) + addF;
        }

        if (perf.mineralPerCycle > 0 && mineralIds.length > 0) {
            const curMinTotal = getExtractorMineralTotal(m);
            const freeMinSpace = Math.max(0, tier.maxMineralBuffer - curMinTotal);
            if (freeMinSpace > 0.01) {
                const targetId = (mode === 'mixed') ? mineralIds[(m.totalCycles || 0) % mineralIds.length] : perf.primaryMineralId;
                const addM = Math.min(freeMinSpace, perf.mineralPerCycle * scaleFactor);
                if (!m.storedMinerals) m.storedMinerals = {};
                m.storedMinerals[targetId] = (m.storedMinerals[targetId] || 0) + addM;
                m.totalMineralsExtracted = (m.totalMineralsExtracted || 0) + addM;
            }
        }

        m.totalCycles = (m.totalCycles || 0) + 1;

        if (!m.analyzed) {
            m.analyzed = true;
            m.firstTestDone = true;
            recordProspectedSpot(p, m);
            if (notifyFirstAnalysis && typeof showHoloCard === 'function') {
                const fuelS = samplePlanetResourceRichness(p, m.angle, 'ether_fuel', !!m.inCavern);
                sfx('playChime');
                showHoloCard(
                    p,
                    `ANÁLISIS GEOLÓGICO COMPLETADO [${m.id}]`,
                    `Éter: ${Math.round(fuelS.richness * 100)}% (${fuelS.rating}) · Haz clic en la máquina para ver informe completo.`
                );
            }
        }
    }
}

function updateExtractors(dt, nearbyPlanets) {
    if (!planetaryExtractors.length) return;
    const simNow = (typeof cosmosSimTime !== 'undefined') ? cosmosSimTime : 0;
    const nearbyMap = new Map();
    if (Array.isArray(nearbyPlanets)) {
        for (const p of nearbyPlanets) {
            if (p && p.key) nearbyMap.set(p.key, p);
        }
    }

    for (let i = 0; i < planetaryExtractors.length; i++) {
        const m = planetaryExtractors[i];
        const p = nearbyMap.get(m.planetKey);
        if (!p) continue;

        if (!p.resourceField) initPlanetResourceField(p);

        const tier = EXTRACTOR_TIERS[m.level] || EXTRACTOR_TIERS[1];
        const perf = getExtractorPerformance(m, p);

        // Catch-up si el jugador estuvo lejos del planeta o en otro sector
        if (typeof m.lastUpdateSimTime === 'number' && simNow - m.lastUpdateSimTime > Math.max(2.0, dt * 4)) {
            const elapsed = Math.min(3600, simNow - m.lastUpdateSimTime);
            const catchupCycles = Math.floor(elapsed / perf.cycleTime);
            if (catchupCycles > 0) {
                applyExtractorCycles(m, p, catchupCycles, false);
            }
            m.cycleProgress = (m.cycleProgress + (elapsed % perf.cycleTime) / perf.cycleTime) % 1;
        }
        m.lastUpdateSimTime = simNow;

        // Comprobar si los depósitos internos relevantes están llenos
        const fuelFull = (m.storedFuel || 0) >= tier.maxFuelBuffer - 0.05;
        const minFull = getExtractorMineralTotal(m) >= tier.maxMineralBuffer - 0.05;
        const isBufferFull = (m.mode === 'ether_fuel')
            ? fuelFull
            : ((m.mode === 'mixed') ? (fuelFull && minFull) : minFull);

        if (isBufferFull && m.analyzed) {
            m.status = 'full';
            continue;
        }

        m.status = m.analyzed ? 'extracting' : 'analyzing';
        m.cycleProgress = (m.cycleProgress || 0) + dt / perf.cycleTime;

        if (m.cycleProgress >= 1.0) {
            const completed = Math.floor(m.cycleProgress);
            m.cycleProgress -= completed;
            applyExtractorCycles(m, p, completed, true);
        }

        // Partículas sutiles si la máquina está cerca de la cámara
        if (typeof camera !== 'undefined' && typeof particles !== 'undefined') {
            const mx = p.x + Math.cos(m.angle) * m.radialPos;
            const my = p.y + Math.sin(m.angle) * m.radialPos;
            const dCam = Math.hypot(mx - camera.x, my - camera.y);
            if (dCam < 1600 && Math.random() < (m.level * 0.16) * clamp(dt * 30, 0.2, 2.0)) {
                const upAngle = m.onCeiling ? (m.angle + Math.PI) : m.angle;
                const tang = upAngle + Math.PI / 2;
                if (m.level >= 2 && Math.random() < 0.45 && typeof createSmoke === 'function') {
                    const puffR = m.radialPos + (m.onCeiling ? -18 : 18);
                    createSmoke(
                        p.x + Math.cos(m.angle) * puffR,
                        p.y + Math.sin(m.angle) * puffR,
                        1, 1.8 + m.level * 0.4,
                        [200, 220, 240],
                        Math.cos(upAngle) * 18, Math.sin(upAngle) * 18,
                        0.45, 16
                    );
                } else if (typeof createSparks === 'function') {
                    createSparks(
                        mx, my, 1,
                        tang + (Math.random() - 0.5) * 0.6,
                        0.5, 15, 45,
                        m.level === 4 ? [192, 132, 252] : [251, 191, 36],
                        0.22
                    );
                }
            }
        }
    }
}

// ============================================================================
// 7. DESPLIEGUE, RECOLECCIÓN, EVOLUCIÓN Y DESMANTELAMIENTO
// ============================================================================
function getPlanetExtractors(planetKey) {
    return planetaryExtractors.filter(m => m && m.planetKey === planetKey);
}

function findNearbyExtractor(planet, angle, maxArcDist = 38) {
    if (!planet) return null;
    const list = getPlanetExtractors(planet.key);
    for (const m of list) {
        const dAng = Math.abs(Math.atan2(Math.sin(m.angle - angle), Math.cos(m.angle - angle)));
        const arcDist = dAng * (m.radialPos || planet.radius);
        if (arcDist < maxArcDist) return m;
    }
    return null;
}

function deployExtractorAtAstronaut() {
    if (typeof astronaut === 'undefined' || !astronaut.active || !astronaut.planet) return null;
    const p = astronaut.planet;

    const existingOnPlanet = getPlanetExtractors(p.key);
    if (existingOnPlanet.length >= MAX_EXTRACTORS_PER_PLANET) {
        showHoloCard(p, 'LÍMITE DE INFRAESTRUCTURA', `Máximo ${MAX_EXTRACTORS_PER_PLANET} extractores activos en ${p.name}. Desmonta alguno para reubicar.`);
        return null;
    }

    const nearbyOther = findNearbyExtractor(p, astronaut.angle, 38);
    if (nearbyOther) {
        showHoloCard(p, 'ZONA OCUPADA', `Ya existe el extractor [${nearbyOther.id}] aquí. Haz clic en él para gestionarlo o aléjate un poco.`);
        openExtractorModal(nearbyOther.id);
        return null;
    }

    if (!p.resourceField) initPlanetResourceField(p);

    const stepAng = (astronaut.facing || 1) * (22 / Math.max(400, astronaut.radialPos || p.radius || 1000));
    const frontAng = astronaut.angle + stepAng;
    const deployAng = findNearbyExtractor(p, frontAng, 34) ? astronaut.angle : frontAng;

    const islHit = (typeof getFloatingIslandAt === 'function')
        ? getFloatingIslandAt(p, deployAng, astronaut.radialPos || null, true)
        : null;
    let groundR = (typeof getCavernOrSurfaceRadius === 'function')
        ? getCavernOrSurfaceRadius(p, deployAng, !!astronaut.inCavern, !!astronaut.onCeiling)
        : getSurfaceRadius(p, deployAng);
    if (islHit && Math.abs((astronaut.radialPos || groundR) - islHit.topR) < 42) {
        groundR = islHit.topR;
    }

    const reg = (typeof getPlanetRegionAtAngle === 'function') ? getPlanetRegionAtAngle(p, deployAng) : null;
    const simNow = (typeof cosmosSimTime !== 'undefined') ? cosmosSimTime : 0;

    const machine = {
        id: 'EXT-' + (planetaryExtractors.length + 1) + '-' + Math.floor(100 + Math.random() * 899),
        planetKey: p.key,
        planetName: p.name,
        angle: deployAng,
        inCavern: !!astronaut.inCavern,
        onCeiling: !!astronaut.onCeiling,
        onIsland: !!islHit,
        radialPos: groundR,
        level: 1,
        mode: 'mixed',
        status: 'analyzing',
        cycleProgress: 0,
        analyzed: false,
        firstTestDone: false,
        totalCycles: 0,
        totalFuelExtracted: 0,
        totalMineralsExtracted: 0,
        storedFuel: 0,
        storedMinerals: {},
        investedMaterials: {},
        regionName: reg ? reg.name : 'Superficie',
        deploySimTime: simNow,
        lastUpdateSimTime: simNow
    };

    planetaryExtractors.push(machine);
    if (!p.extractors) p.extractors = [];
    p.extractors.push(machine);

    const mx = p.x + Math.cos(machine.angle) * machine.radialPos;
    const my = p.y + Math.sin(machine.angle) * machine.radialPos;
    sfx('playExtractorDeploy');
    if (typeof createShockwave === 'function') createShockwave(mx, my, 24, 110, 'rgba(56, 189, 248, 0.85)', 'ring');
    if (typeof createSparks === 'function') createSparks(mx, my, 14, machine.angle, 1.2, 30, 120, [56, 189, 248], 0.45);

    showHoloCard(
        p,
        `PERFORADORA DESPLEGADA [${machine.id}]`,
        'Extracción inicial en curso para análisis geológico. Haz clic en la máquina para inspeccionar.'
    );

    if (typeof autoSaveActiveWorld === 'function') autoSaveActiveWorld(false);
    return machine;
}

function collectFromExtractor(machine, silent = false) {
    if (!machine || typeof astronaut === 'undefined') return { fuelCollected: 0, mineralsCollected: 0 };

    const cap = getFuelReserveCapacity();
    const curReserve = Number(astronaut.fuelReserve) || 0;
    const space = Math.max(0, cap - curReserve);
    const availFuel = Number(machine.storedFuel) || 0;
    const takeFuel = Math.min(space, availFuel);

    if (takeFuel > 0.01) {
        astronaut.fuelReserve = Math.min(cap, curReserve + takeFuel);
        machine.storedFuel = Math.max(0, availFuel - takeFuel);
    }

    const inv = getInventoryMap();
    let mineralsCollected = 0;
    if (machine.storedMinerals) {
        for (const [id, rawAmt] of Object.entries(machine.storedMinerals)) {
            const whole = Math.floor(Number(rawAmt) || 0);
            if (whole > 0) {
                inv[id] = (inv[id] || 0) + whole;
                machine.storedMinerals[id] = rawAmt - whole;
                mineralsCollected += whole;
            }
        }
    }

    if ((takeFuel > 0.05 || mineralsCollected > 0) && !silent) {
        sfx('playResourceCollect');
        const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(machine.planetKey) : astronaut.planet;
        if (p) {
            const parts = [];
            if (takeFuel > 0.05) parts.push(`+${takeFuel.toFixed(1)} L Éter`);
            if (mineralsCollected > 0) parts.push(`+${mineralsCollected} u Minerales`);
            showHoloCard(p, `RECOLECCIÓN COMPLETADA [${machine.id}]`, parts.join(' · '));
        }
    } else if (!silent && availFuel > 0.1 && space <= 0.01) {
        const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(machine.planetKey) : astronaut.planet;
        if (p) showHoloCard(p, 'RESERVA DE COMBUSTIBLE LLENA', 'Transfiere Éter al cohete o mejora el tanque del traje en Inventario (I).');
    }

    return { fuelCollected: takeFuel, mineralsCollected };
}

function upgradeExtractor(machine) {
    if (!machine || machine.level >= 4) return false;
    const nextTier = EXTRACTOR_TIERS[machine.level + 1];
    if (!nextTier || !nextTier.upgradeCost) return false;

    const inv = getInventoryMap();
    if (!canAffordFamilyCost(inv, nextTier.upgradeCost)) {
        const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(machine.planetKey) : astronaut.planet;
        if (p) showHoloCard(p, 'RECURSOS INSUFICIENTES', `Reúne los materiales necesarios para evolucionar a ${nextTier.shortName}.`);
        return false;
    }

    const spent = spendFamilyCost(inv, nextTier.upgradeCost);
    if (!spent) return false;

    if (!machine.investedMaterials) machine.investedMaterials = {};
    for (const [id, amt] of Object.entries(spent)) {
        machine.investedMaterials[id] = (machine.investedMaterials[id] || 0) + amt;
    }

    machine.level += 1;
    const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(machine.planetKey) : astronaut.planet;
    if (p) {
        const mx = p.x + Math.cos(machine.angle) * machine.radialPos;
        const my = p.y + Math.sin(machine.angle) * machine.radialPos;
        sfx('playExtractorUpgrade', machine.level);
        if (typeof createShockwave === 'function') createShockwave(mx, my, 45, 190, `rgba(${nextTier.rgb[0]}, ${nextTier.rgb[1]}, ${nextTier.rgb[2]}, 0.9)`, 'ring');
        if (typeof createSparks === 'function') createSparks(mx, my, 24, machine.angle, Math.PI, 50, 180, nextTier.rgb, 0.65);
        showHoloCard(p, `MÁQUINA EVOLUCIONADA — NV.${machine.level}`, `${nextTier.name} operativa. Producción y búfer aumentados.`);
    }

    if (typeof autoSaveActiveWorld === 'function') autoSaveActiveWorld(false);
    return true;
}

function dismantleExtractor(machine) {
    if (!machine) return false;
    collectFromExtractor(machine, true);

    const inv = getInventoryMap();
    if (machine.investedMaterials) {
        for (const [id, amt] of Object.entries(machine.investedMaterials)) {
            if (amt > 0) inv[id] = (inv[id] || 0) + amt;
        }
    }

    const idx = planetaryExtractors.findIndex(e => e.id === machine.id);
    if (idx !== -1) planetaryExtractors.splice(idx, 1);

    const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(machine.planetKey) : null;
    if (p && Array.isArray(p.extractors)) {
        const pIdx = p.extractors.findIndex(e => e.id === machine.id);
        if (pIdx !== -1) p.extractors.splice(pIdx, 1);
    }

    if (selectedExtractorId === machine.id) closeExtractorModal();
    sfx('playResourceCollect');
    if (p) showHoloCard(p, `EXTRACTOR DESMONTADO [${machine.id}]`, 'Recursos recuperados e incorporados a tu inventario.');
    if (typeof autoSaveActiveWorld === 'function') autoSaveActiveWorld(false);
    return true;
}

// ============================================================================
// 8. REPOSTAJE DE COHETE, REFINERÍA Y MEJORAS DEL TRAJE
// ============================================================================
function getTargetShipForRefuel() {
    if (typeof astronaut !== 'undefined' && astronaut.active && typeof getClosestShipToAstronaut === 'function') {
        const info = getClosestShipToAstronaut();
        if (info && info.shipObj && info.dist < 140) return info.shipObj;
    }
    if (typeof ship !== 'undefined' && ship.isGrounded) return ship;
    return null;
}

function transferFuelReserveToRocket(requestedAmount = Infinity) {
    if (typeof astronaut === 'undefined') return 0;
    const target = getTargetShipForRefuel();
    if (!target) return 0;

    const maxF = target.maxFuel || 100;
    const need = Math.max(0, maxF - (target.fuel || 0));
    const avail = Math.max(0, astronaut.fuelReserve || 0);
    const amount = Math.min(need, avail, requestedAmount);

    if (amount > 0.01) {
        target.fuel = Math.min(maxF, (target.fuel || 0) + amount);
        astronaut.fuelReserve = Math.max(0, avail - amount);
    }
    return amount;
}

function upgradeFuelReserveTank() {
    if (typeof astronaut === 'undefined') return false;
    const curLvl = astronaut.fuelReserveLevel || 1;
    if (curLvl >= 4) return false;
    const nextTier = FUEL_RESERVE_TIERS[curLvl + 1];
    if (!nextTier || !nextTier.upgradeCost) return false;

    const inv = getInventoryMap();
    if (!canAffordFamilyCost(inv, nextTier.upgradeCost)) return false;
    spendFamilyCost(inv, nextTier.upgradeCost);
    astronaut.fuelReserveLevel = curLvl + 1;
    sfx('playExtractorUpgrade', astronaut.fuelReserveLevel);
    const p = astronaut.planet || (typeof getPlanet === 'function' ? getPlanet(0, 0) : null);
    if (p) showHoloCard(p, `RESERVA EVA MEJORADA — NV.${astronaut.fuelReserveLevel}`, `${nextTier.name}: capacidad ampliada a ${nextTier.capacity} L.`);
    if (typeof autoSaveActiveWorld === 'function') autoSaveActiveWorld(false);
    return true;
}

function refineMineralToFuel(mineralId, count = 1) {
    if (typeof astronaut === 'undefined') return 0;
    const def = getResourceDef(mineralId);
    if (!def.fuelYield) return 0;
    const inv = getInventoryMap();
    const avail = Math.floor(inv[def.id] || 0);
    if (avail <= 0) return 0;

    const cap = getFuelReserveCapacity();
    const space = Math.max(0, cap - (astronaut.fuelReserve || 0));
    if (space <= 0.1) return 0;

    const maxBySpace = Math.ceil(space / def.fuelYield);
    const units = Math.min(avail, Math.max(1, count), maxBySpace);
    const fuelAdded = Math.min(space, units * def.fuelYield);

    inv[def.id] = avail - units;
    if (inv[def.id] <= 0) delete inv[def.id];
    astronaut.fuelReserve = Math.min(cap, (astronaut.fuelReserve || 0) + fuelAdded);
    sfx('playResourceCollect');
    return fuelAdded;
}

function repairRocketWithMaterials() {
    const target = getTargetShipForRefuel();
    if (!target) return false;
    const maxH = target.maxHull || 100;
    if (target.hull >= maxH - 0.5) return false;
    const inv = getInventoryMap();
    const cost = { structural: 6 };
    if (!canAffordFamilyCost(inv, cost)) return false;
    spendFamilyCost(inv, cost);
    target.hull = Math.min(maxH, target.hull + maxH * 0.25);
    sfx('playRepairTorch');
    return true;
}

// ============================================================================
// 9. RENDERIZADO PROCEDURAL EN CANVAS DE MÁQUINAS (NIVEL 1 A 4)
// ============================================================================
function drawExtractors(timeSec) {
    if (!planetaryExtractors.length || typeof ctx === 'undefined') return;
    const nearby = (typeof getNearbyPlanets === 'function') ? getNearbyPlanets(camera.x, camera.y, 1) : [];
    if (!nearby.length) return;

    const nearbyMap = new Map();
    for (const p of nearby) nearbyMap.set(p.key, p);

    for (let i = 0; i < planetaryExtractors.length; i++) {
        const m = planetaryExtractors[i];
        const p = nearbyMap.get(m.planetKey);
        if (!p) continue;

        const mx = p.x + Math.cos(m.angle) * m.radialPos;
        const my = p.y + Math.sin(m.angle) * m.radialPos;
        const dCam = Math.hypot(mx - camera.x, my - camera.y);
        if (dCam > 4200) continue;

        const tier = EXTRACTOR_TIERS[m.level] || EXTRACTOR_TIERS[1];
        const sunDot = Math.cos(m.angle - (p.lightAngle || 0));
        const rawNight = clamp(1 - (sunDot + 0.15) / 0.85, 0, 1);
        const extLight = (typeof LightingEngine !== 'undefined') ? LightingEngine.samplePoint(mx, my, tier.height * 0.9) : null;
        const extIllum = extLight ? clamp(extLight.illum * 1.15, 0, 1) : 0;
        const localNight = clamp(rawNight * (1 - extIllum * 0.92), 0, 1);
        const isSelected = (selectedExtractorId === m.id);
        const isHovered = (hoveredExtractorId === m.id);
        const fuelFill = clamp((m.storedFuel || 0) / Math.max(1, tier.maxFuelBuffer), 0, 1);
        const spin = timeSec * (2.5 + m.level * 1.4);

        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(m.angle + (m.onCeiling ? -Math.PI / 2 : Math.PI / 2));

        // Halo de selección o hover
        if (isSelected || isHovered) {
            ctx.save();
            ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(251, 191, 36, 0.85)';
            ctx.lineWidth = 1.4;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, -tier.height * 0.45, Math.max(tier.width, tier.height) * 0.68, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Sombra de contacto
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.beginPath();
        ctx.ellipse(0, 1, tier.width * 0.55, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();

        const metalDark = localNight > 0.5 ? '#1e293b' : '#334155';
        const metalMid = localNight > 0.5 ? '#334155' : '#64748b';
        const metalLight = localNight > 0.5 ? '#475569' : '#94a3b8';

        if (m.level === 1) {
            // --- NIVEL 1: PERFORADORA PORTÁTIL COMPACTA ---
            const bob = Math.sin(timeSec * 22) * 0.8;
            // Patas trípode
            ctx.strokeStyle = metalMid;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(-10, 0); ctx.lineTo(-3, -13);
            ctx.moveTo(10, 0);  ctx.lineTo(3, -13);
            ctx.stroke();

            // Barreno giratorio central
            ctx.fillStyle = '#475569';
            ctx.fillRect(-1.8, -11 + bob, 3.6, 13);
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 0.9;
            for (let s = 0; s < 3; s++) {
                const sy = -9 + ((s * 4 + (timeSec * 14) % 4));
                ctx.beginPath();
                ctx.moveTo(-2, sy); ctx.lineTo(2, sy + 2);
                ctx.stroke();
            }

            // Cabezal motor
            ctx.fillStyle = metalDark;
            ctx.strokeStyle = metalLight;
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            safeRoundRect(ctx, -7, -18 + bob * 0.4, 14, 7, 2);
            ctx.fill();
            ctx.stroke();

            // Visor cilíndrico de Éter lateral
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(3.5, -16, 4.5, 9);
            if (fuelFill > 0.02) {
                ctx.fillStyle = '#fbbf24';
                const fh = Math.max(1, 8 * fuelFill);
                ctx.fillRect(4, -7.5 - fh, 3.5, fh);
            }
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 0.7;
            ctx.strokeRect(3.5, -16, 4.5, 9);

            // Mini ala solar izquierda
            ctx.fillStyle = '#0c4a6e';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 0.7;
            ctx.fillRect(-12, -16, 5, 3);
            ctx.strokeRect(-12, -16, 5, 3);

            // LED de estado
            const ledPulse = 0.55 + 0.45 * Math.sin(timeSec * 6);
            ctx.fillStyle = !m.analyzed ? `rgba(56, 189, 248, ${ledPulse})` : (m.status === 'full' ? '#fbbf24' : '#34d399');
            ctx.beginPath();
            ctx.arc(-3, -15, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (m.level === 2) {
            // --- NIVEL 2: EXTRACTOR NEUMÁTICO BARRENO-II ---
            const vib = Math.sin(timeSec * 26) * 0.6;
            // Zapatas hidráulicas
            ctx.fillStyle = metalDark;
            ctx.fillRect(-16, -2.5, 7, 3);
            ctx.fillRect(9, -2.5, 7, 3);
            ctx.strokeStyle = metalMid;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(-13, -2); ctx.lineTo(-7, -18);
            ctx.moveTo(13, -2);  ctx.lineTo(7, -18);
            ctx.stroke();

            // Barreno helicoidal grueso
            ctx.fillStyle = '#334155';
            ctx.fillRect(-3.2, -17, 6.4, 19);
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.1;
            for (let s = 0; s < 5; s++) {
                const sy = -15 + ((s * 3.5 + (timeSec * 18) % 3.5));
                ctx.beginPath();
                ctx.moveTo(-3.4, sy); ctx.lineTo(3.4, sy + 2);
                ctx.stroke();
            }

            // Chasis principal
            ctx.fillStyle = metalDark;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            safeRoundRect(ctx, -11, -26 + vib, 22, 11, 2.5);
            ctx.fill();
            ctx.stroke();

            // Tanque derecho de Éter presurizado
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            safeRoundRect(ctx, 5, -24, 6, 15, 2);
            ctx.fill();
            if (fuelFill > 0.02) {
                const grad = ctx.createLinearGradient(0, -9, 0, -23);
                grad.addColorStop(0, '#f59e0b');
                grad.addColorStop(1, '#fde68a');
                ctx.fillStyle = grad;
                const fh = Math.max(1.5, 13 * fuelFill);
                ctx.fillRect(5.8, -9.5 - fh, 4.4, fh);
            }
            ctx.strokeStyle = metalLight;
            ctx.lineWidth = 0.8;
            ctx.strokeRect(5, -24, 6, 15);

            // Chimenea de escape + antena rotatoria
            ctx.fillStyle = metalMid;
            ctx.fillRect(-9, -33, 3, 7);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, -26); ctx.lineTo(0, -35);
            ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(Math.sin(spin) * 3, -36, 1.6, 0, Math.PI * 2);
            ctx.fill();
        } else if (m.level === 3) {
            // --- NIVEL 3: TORRE DE BOMBEO INDUSTRIAL TITÁN-III ---
            // Base y torre de acero reticulada
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-22, -3.5, 44, 4);
            ctx.strokeStyle = metalMid;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(-18, -3); ctx.lineTo(-9, -38);
            ctx.moveTo(18, -3);  ctx.lineTo(9, -38);
            ctx.moveTo(-14, -15); ctx.lineTo(14, -15);
            ctx.moveTo(-11, -27); ctx.lineTo(11, -27);
            ctx.stroke();

            // Cerchas en X
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-18, -3); ctx.lineTo(14, -15);
            ctx.moveTo(18, -3);  ctx.lineTo(-14, -15);
            ctx.moveTo(-14, -15); ctx.lineTo(11, -27);
            ctx.moveTo(14, -15);  ctx.lineTo(-11, -27);
            ctx.stroke();

            // Haz de perforación plasma-térmica central
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const beamGlow = 0.55 + 0.3 * Math.sin(timeSec * 14);
            ctx.fillStyle = `rgba(52, 211, 153, ${beamGlow * 0.45})`;
            ctx.fillRect(-3.5, -28, 7, 30);
            ctx.fillStyle = '#a7f3d0';
            ctx.fillRect(-1.2, -28, 2.4, 30);
            ctx.restore();

            // Cilindro separador de Éter
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            safeRoundRect(ctx, -6, -34, 12, 18, 2.5);
            ctx.fill();
            if (fuelFill > 0.02) {
                ctx.fillStyle = '#fbbf24';
                const fh = Math.max(2, 15 * fuelFill);
                ctx.fillRect(-4.5, -17 - fh, 9, fh);
            }
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 1;
            ctx.strokeRect(-6, -34, 12, 18);

            // Balancín superior animado
            const rock = Math.sin(timeSec * 3.2) * 0.24;
            ctx.save();
            ctx.translate(0, -40);
            ctx.rotate(rock);
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            safeRoundRect(ctx, -16, -3, 32, 6, 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(-15, -4, 4, 8);
            ctx.restore();

            // Alas radiadoras
            ctx.fillStyle = '#064e3b';
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 0.8;
            ctx.fillRect(-23, -32, 9, 4.5);
            ctx.strokeRect(-23, -32, 9, 4.5);
            ctx.fillRect(14, -32, 9, 4.5);
            ctx.strokeRect(14, -32, 9, 4.5);

            // Baliza superior
            const strobe = Math.sin(timeSec * 7) > 0.3;
            ctx.fillStyle = strobe ? '#34d399' : '#065f46';
            ctx.beginPath();
            ctx.arc(0, -48, 2.2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // --- NIVEL 4: COMPLEJO EXTRACTOR CUÁNTICO NEXO-IV ---
            // Base monumental + 4 puntales anclados
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            safeRoundRect(ctx, -28, -5, 56, 6, 2);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-25, -4); ctx.lineTo(-14, -34);
            ctx.moveTo(25, -4);  ctx.lineTo(14, -34);
            ctx.moveTo(-16, -4); ctx.lineTo(-8, -52);
            ctx.moveTo(16, -4);  ctx.lineTo(8, -52);
            ctx.stroke();

            // Haz cuántico de perforación profunda
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const qPulse = 0.65 + 0.35 * Math.sin(timeSec * 10);
            const qGrad = ctx.createLinearGradient(-7, 0, 7, 0);
            qGrad.addColorStop(0, 'rgba(192, 132, 252, 0)');
            qGrad.addColorStop(0.5, `rgba(192, 132, 252, ${qPulse * 0.85})`);
            qGrad.addColorStop(1, 'rgba(192, 132, 252, 0)');
            ctx.fillStyle = qGrad;
            ctx.fillRect(-7, -56, 14, 60);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(-1.5, -56, 3, 60);
            ctx.restore();

            // Tanques gemelos de Éter cuántico
            for (const tx of [-17, 11]) {
                ctx.fillStyle = '#090d16';
                ctx.fillRect(tx, -34, 6, 24);
                if (fuelFill > 0.02) {
                    ctx.fillStyle = '#fbbf24';
                    const fh = Math.max(2, 21 * fuelFill);
                    ctx.fillRect(tx + 1, -11 - fh, 4, fh);
                }
                ctx.strokeStyle = '#c084fc';
                ctx.lineWidth = 0.9;
                ctx.strokeRect(tx, -34, 6, 24);
            }

            // Anillos magnéticos flotantes contrarrotatorios
            for (let rIdx = 0; rIdx < 2; rIdx++) {
                const ry = -32 - rIdx * 16 + Math.sin(timeSec * 3 + rIdx) * 1.8;
                const rw = 16 - rIdx * 3;
                ctx.strokeStyle = rIdx === 0 ? '#c084fc' : '#38bdf8';
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.ellipse(0, ry, rw, 3.8, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Aguja condensadora superior + halo
            ctx.fillStyle = '#c084fc';
            ctx.beginPath();
            ctx.moveTo(0, -72);
            ctx.lineTo(-5, -54);
            ctx.lineTo(5, -54);
            ctx.closePath();
            ctx.fill();

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const aura = ctx.createRadialGradient(0, -64, 1, 0, -64, 16);
            aura.addColorStop(0, 'rgba(192, 132, 252, 0.8)');
            aura.addColorStop(1, 'rgba(192, 132, 252, 0)');
            ctx.fillStyle = aura;
            ctx.beginPath();
            ctx.arc(0, -64, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Micro-etiqueta flotante cuando está cerca o seleccionada
        if (isHovered || isSelected || dCam < 480) {
            ctx.save();
            ctx.translate(0, -tier.height - 12);
            const tag = !m.analyzed
                ? `ANALIZANDO ${Math.round((m.cycleProgress || 0) * 100)}%`
                : (isHovered ? `VER INFORME · ${Math.round(m.storedFuel || 0)}L` : `${tier.code} · ${Math.round(m.storedFuel || 0)}L`);
            ctx.font = 'bold 7px JetBrains Mono, monospace';
            const tw = Math.max(46, ctx.measureText(tag).width + 10);
            ctx.fillStyle = 'rgba(6, 10, 20, 0.88)';
            ctx.strokeStyle = isSelected ? '#38bdf8' : tier.accent;
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            safeRoundRect(ctx, -tw * 0.5, -8, tw, 13, 4);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#f8fafc';
            ctx.textAlign = 'center';
            ctx.fillText(tag, 0, 1);
            ctx.restore();
        }

        ctx.restore();
    }
}

// ============================================================================
// 10. DETECCIÓN DE CLIC / HOVER EN CANVAS SOBRE MÁQUINAS
// ============================================================================
function findExtractorAtWorldPos(worldX, worldY) {
    if (!planetaryExtractors.length) return null;
    const nearby = (typeof getNearbyPlanets === 'function') ? getNearbyPlanets(worldX, worldY, 1) : [];
    const zoomSafe = (typeof camera !== 'undefined' && camera.zoom) ? camera.zoom : 1.0;
    const minScreenPxRadius = 24 / Math.max(0.18, zoomSafe);

    let best = null;
    let bestDist = Infinity;

    for (const p of nearby) {
        for (const m of planetaryExtractors) {
            if (m.planetKey !== p.key) continue;
            const tier = EXTRACTOR_TIERS[m.level] || EXTRACTOR_TIERS[1];
            const dir = m.onCeiling ? -1 : 1;
            const centerR = m.radialPos + dir * (tier.height * 0.45);
            const cx = p.x + Math.cos(m.angle) * centerR;
            const cy = p.y + Math.sin(m.angle) * centerR;
            const hitR = Math.max(tier.width * 0.85, tier.height * 0.75, minScreenPxRadius);
            const d = Math.hypot(worldX - cx, worldY - cy);
            if (d <= hitR && d < bestDist) {
                bestDist = d;
                best = m;
            }
        }
    }
    return best;
}

function handleExtractorHover(worldX, worldY) {
    const hit = findExtractorAtWorldPos(worldX, worldY);
    hoveredExtractorId = hit ? hit.id : null;
    const canvasEl = document.getElementById('flightCanvas');
    if (canvasEl) {
        canvasEl.style.cursor = hit ? 'pointer' : '';
    }
}

function handleExtractorClick(worldX, worldY) {
    const hit = findExtractorAtWorldPos(worldX, worldY);
    if (!hit) return false;
    openExtractorModal(hit.id);
    return true;
}

// ============================================================================
// 11. CONTROLADORES DE INTERFAZ DE EXTRACTOR E INVENTARIO
// ============================================================================
function openExtractorModal(extractorId) {
    selectedExtractorId = extractorId;
    const modal = document.getElementById('extractorModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    renderExtractorModal();
}

function closeExtractorModal() {
    selectedExtractorId = null;
    const modal = document.getElementById('extractorModal');
    if (modal) modal.classList.add('hidden');
}

function openResourceInventoryModal() {
    const modal = document.getElementById('resourceInventoryModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    renderResourceInventoryModal();
}

function closeResourceInventoryModal() {
    const modal = document.getElementById('resourceInventoryModal');
    if (modal) modal.classList.add('hidden');
}

function toggleResourceInventoryModal() {
    const modal = document.getElementById('resourceInventoryModal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) openResourceInventoryModal();
    else closeResourceInventoryModal();
}

function formatFamilyCostBadges(cost, inv) {
    if (!cost) return '';
    const totals = getFamilyTotals(inv);
    return Object.entries(cost).map(([fam, req]) => {
        const have = totals[fam] || 0;
        const ok = have >= req;
        const shortFam = fam === 'structural' ? 'Estructural' : (fam === 'catalyst' ? 'Conductor/Energ.' : 'Avanzado');
        return `<span class="px-2 py-0.5 rounded-lg text-[10px] font-mono-num border ${ok ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40' : 'bg-rose-500/15 text-rose-300 border-rose-400/40'}">${shortFam}: <strong>${have}/${req}</strong></span>`;
    }).join(' ');
}

function renderExtractorModal() {
    const modal = document.getElementById('extractorModal');
    if (!modal || modal.classList.contains('hidden') || !selectedExtractorId) return;

    const m = planetaryExtractors.find(e => e.id === selectedExtractorId);
    if (!m) { closeExtractorModal(); return; }

    const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(m.planetKey) : (typeof astronaut !== 'undefined' ? astronaut.planet : null);
    const tier = EXTRACTOR_TIERS[m.level] || EXTRACTOR_TIERS[1];
    const perf = getExtractorPerformance(m, p);
    const spot = p ? analyzeSurfaceSpot(p, m.angle, !!m.inCavern) : null;
    const inv = getInventoryMap();

    const setEl = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setEl('extModalTitle', tier.name);
    setEl('extModalIdBadge', `${m.id} · NV.${m.level}`);
    setEl('extModalLocation', `${m.planetName} · ${m.regionName || 'Superficie'} (${spot ? spot.deg + '°' : ''}${m.inCavern ? ' · Caverna' : ''})`);

    const statusBadge = document.getElementById('extModalStatusBadge');
    if (statusBadge) {
        if (!m.analyzed) {
            statusBadge.textContent = 'ANALIZANDO SUBSUELO...';
            statusBadge.className = 'px-2 py-0.5 rounded-full text-[9px] font-mono-num font-bold bg-sky-500/20 text-sky-300 border border-sky-400/40 animate-pulse';
        } else if (m.status === 'full') {
            statusBadge.textContent = 'DEPÓSITO LLENO';
            statusBadge.className = 'px-2 py-0.5 rounded-full text-[9px] font-mono-num font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40';
        } else {
            statusBadge.textContent = 'EXTRACCION ACTIVA';
            statusBadge.className = 'px-2 py-0.5 rounded-full text-[9px] font-mono-num font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40';
        }
    }

    // Progreso del ciclo y tasas
    const cycBar = document.getElementById('extModalCycleBar');
    if (cycBar) cycBar.style.width = `${Math.round((m.cycleProgress || 0) * 100)}%`;
    setEl('extModalCycleInfo', `Ciclo: ${perf.cycleTime.toFixed(1)}s · ${perf.fuelRatePerSec > 0 ? '+' + perf.fuelRatePerSec.toFixed(2) + ' L/s Éter' : ''}${perf.fuelRatePerSec > 0 && perf.mineralRatePerSec > 0 ? ' | ' : ''}${perf.mineralRatePerSec > 0 ? '+' + perf.mineralRatePerSec.toFixed(2) + ' u/s Min.' : ''}`);

    // Búfer de Combustible y Minerales
    const storedFuel = m.storedFuel || 0;
    const fuelPct = clamp(Math.round((storedFuel / tier.maxFuelBuffer) * 100), 0, 100);
    setEl('extModalFuelText', `${storedFuel.toFixed(1)} / ${tier.maxFuelBuffer} L`);
    const fBar = document.getElementById('extModalFuelBar');
    if (fBar) fBar.style.width = `${fuelPct}%`;

    const minTotal = getExtractorMineralTotal(m);
    const minPct = clamp(Math.round((minTotal / tier.maxMineralBuffer) * 100), 0, 100);
    setEl('extModalMinText', `${Math.floor(minTotal)} / ${tier.maxMineralBuffer} u`);
    const mBar = document.getElementById('extModalMinBar');
    if (mBar) mBar.style.width = `${minPct}%`;

    // Desglose de minerales en el búfer
    const storedChips = document.getElementById('extModalStoredChips');
    if (storedChips) {
        const entries = Object.entries(m.storedMinerals || {}).filter(([, v]) => v >= 0.1);
        storedChips.innerHTML = entries.length > 0
            ? entries.map(([id, v]) => {
                const def = getResourceDef(id);
                return `<span class="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/10 text-[10px] font-mono-num text-stone-200">${def.icon} ${def.shortName}: <strong style="color:${def.color}">${v.toFixed(1)}u</strong></span>`;
            }).join('')
            : '<span class="text-[10px] text-stone-500 italic">Sin minerales acumulados aún...</span>';
    }

    // Selector de Modo de Extracción (solo reconstruir botones si cambió el planeta/id)
    const modeContainer = document.getElementById('extModalModeButtons');
    if (modeContainer) {
        const planetIds = p ? getPlanetResourceIds(p) : ['ether_fuel'];
        const modeOptions = [
            { id: 'mixed', label: '⚖️ Mixto (Éter + Min.)' },
            { id: 'ether_fuel', label: '⚡ Solo Éter (+32%)' },
            ...planetIds.filter(id => id !== 'ether_fuel').map(id => {
                const d = getResourceDef(id);
                return { id, label: `${d.icon} ${d.shortName}` };
            })
        ];
        const sig = m.id + ':' + m.mode + ':' + planetIds.join(',');
        if (modeContainer.dataset.sig !== sig) {
            modeContainer.dataset.sig = sig;
            modeContainer.innerHTML = modeOptions.map(opt => {
                const active = (m.mode === opt.id);
                return `<button data-ext-mode="${opt.id}" class="px-2.5 py-1 rounded-xl text-[10px] font-mono-num transition-all cursor-pointer border ${active ? 'bg-sky-500/25 text-sky-200 border-sky-400/60 font-bold' : 'bg-white/[0.03] text-stone-300 border-white/10 hover:bg-white/[0.08]'}">${opt.label}</button>`;
            }).join('');
            modeContainer.querySelectorAll('button[data-ext-mode]').forEach(btn => {
                btn.addEventListener('click', () => {
                    m.mode = btn.dataset.extMode;
                    m.cycleProgress = 0;
                    renderExtractorModal();
                });
            });
        }
    }

    // Sección de Análisis Geológico
    const analysisBox = document.getElementById('extModalAnalysisContent');
    if (analysisBox) {
        if (!m.analyzed) {
            const pPct = Math.round((m.cycleProgress || 0) * 100);
            analysisBox.innerHTML = `
                <div class="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-400/30 space-y-2">
                    <div class="flex items-center justify-between text-[11px] font-mono-num text-sky-200">
                        <span>🔬 Primera prueba de extracción en curso...</span>
                        <strong>${pPct}%</strong>
                    </div>
                    <div class="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-sky-400 to-cyan-200 transition-all duration-100" style="width:${pPct}%"></div>
                    </div>
                    <p class="text-[10px] text-stone-400">Al finalizar el primer ciclo se revelará la concentración exacta de combustible y minerales de esta zona.</p>
                </div>
            `;
        } else if (spot) {
            const zones = (typeof astronaut !== 'undefined' && astronaut.prospectedZones && astronaut.prospectedZones[m.planetKey]) || [];
            const fuelPctZone = Math.round(perf.fuelRichness * 100);

            const rowsHtml = spot.entries.map(e => {
                const pct = Math.round(e.richness * 100);
                const avgPct = Math.round(e.avg * 100);
                const diffPct = Math.round(e.delta * 100);
                const diffStr = diffPct >= 0 ? `▲ +${diffPct}% vs media (${avgPct}%)` : `▼ ${diffPct}% vs media (${avgPct}%)`;
                const estTime = Math.max(1.2, tier.baseCycle * (1.85 - 1.15 * e.richness)).toFixed(1);
                const estYield = ((e.id === 'ether_fuel' ? tier.fuelBaseYield : tier.mineralBaseYield) * (0.25 + 1.15 * e.richness) * tier.purityBonus).toFixed(1);

                return `
                    <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5 min-w-0">
                                <span>${e.def.icon}</span>
                                <span class="font-display text-xs font-semibold text-white truncate">${e.def.name}</span>
                                <span class="px-1.5 py-0.2 rounded text-[8.5px] font-mono-num border ${e.badgeCls}">${e.rating}</span>
                            </div>
                            <span class="font-mono-num text-xs font-bold" style="color:${e.color}">${pct}%</span>
                        </div>
                        <div class="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                            <div class="h-full rounded-full" style="width:${pct}%; background:${e.color}"></div>
                        </div>
                        <div class="flex items-center justify-between text-[9.5px] font-mono-num text-stone-400">
                            <span>${diffStr}</span>
                            <span>Rendimiento: <strong class="text-stone-200">+${estYield}${e.def.unit} / ${estTime}s</strong></span>
                        </div>
                    </div>
                `;
            }).join('');

            // Mapa lineal de prospección del planeta (0°..360°)
            const radarMarkers = zones.map(z => {
                const leftPct = clamp((z.deg / 360) * 100, 1, 99);
                const zr = getRichnessRating(z.fuelRichness);
                const isHere = Math.abs(Math.atan2(Math.sin(z.angle - m.angle), Math.cos(z.angle - m.angle))) < 0.08;
                return `<div title="${z.deg}° (${z.regionName}): Éter ${Math.round(z.fuelRichness * 100)}%" style="left:${leftPct}%; background:${zr.color};" class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full ${isHere ? 'w-3.5 h-3.5 ring-2 ring-white z-10' : 'w-2.5 h-2.5 opacity-85'}"></div>`;
            }).join('');

            analysisBox.innerHTML = `
                <div class="space-y-2">
                    <div class="p-2.5 rounded-xl bg-black/35 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-num">
                        <span class="text-stone-300">CATEGORÍA DEL PLANETA: <strong class="text-amber-300">${spot.fuelProfile.tierLabel.toUpperCase()}</strong></span>
                        <span class="text-stone-400">ÉTER EN ESTA ZONA: <strong class="text-white">${fuelPctZone}%</strong></span>
                    </div>
                    <p class="text-[10.5px] text-stone-400 leading-snug">${spot.fuelProfile.summary}</p>
                    <div class="space-y-1.5">${rowsHtml}</div>
                    <div class="pt-1">
                        <div class="flex items-center justify-between text-[9.5px] font-mono-num text-stone-400 mb-1">
                            <span>RADAR DE ZONAS SONDEADAS EN ${m.planetName.toUpperCase()} (0° – 360°)</span>
                            <span>${zones.length} ${zones.length === 1 ? 'zona' : 'zonas'}</span>
                        </div>
                        <div class="relative w-full h-5 rounded-lg bg-slate-950 border border-white/10 overflow-hidden">
                            <div class="absolute inset-x-0 top-1/2 h-[1px] bg-white/10"></div>
                            ${radarMarkers}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Sección de Evolución
    const evoBox = document.getElementById('extModalUpgradeBox');
    if (evoBox) {
        if (m.level >= 4) {
            evoBox.innerHTML = `
                <div class="p-3 rounded-2xl bg-purple-500/10 border border-purple-400/35 text-[11px] font-mono-num text-purple-200 flex items-center justify-between">
                    <span>★ MÁXIMO NIVEL ALCANZADO — COMPLEJO CUÁNTICO NEXO-IV</span>
                    <span class="text-purple-300 font-bold">NV. 4</span>
                </div>
            `;
        } else {
            const nextTier = EXTRACTOR_TIERS[m.level + 1];
            const affordable = canAffordFamilyCost(inv, nextTier.upgradeCost);
            evoBox.innerHTML = `
                <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div class="flex items-center justify-between gap-2">
                        <div>
                            <span class="text-[9px] font-mono-num uppercase tracking-wider text-amber-300 block">EVOLUCIÓN DISPONIBLE</span>
                            <h4 class="font-display text-xs font-bold text-white">${nextTier.name}</h4>
                        </div>
                        <button id="btnExtUpgradeConfirm" class="px-3 py-1.5 rounded-xl font-display text-xs font-bold transition-all cursor-pointer shrink-0 ${affordable ? 'bg-amber-300 text-stone-950 hover:brightness-110 shadow-[0_0_12px_rgba(251,191,36,0.35)]' : 'bg-white/10 text-stone-400 cursor-not-allowed'}">
                            Evolucionar a Nv.${nextTier.level}
                        </button>
                    </div>
                    <p class="text-[10px] text-stone-400">${nextTier.desc} Búfer: ${nextTier.maxFuelBuffer}L Éter / ${nextTier.maxMineralBuffer}u Min.</p>
                    <div class="flex flex-wrap items-center gap-1.5 pt-0.5">${formatFamilyCostBadges(nextTier.upgradeCost, inv)}</div>
                </div>
            `;
            const upBtn = document.getElementById('btnExtUpgradeConfirm');
            if (upBtn) {
                upBtn.onclick = () => {
                    if (upgradeExtractor(m)) renderExtractorModal();
                };
            }
        }
    }
}

function renderResourceInventoryModal() {
    const modal = document.getElementById('resourceInventoryModal');
    if (!modal || modal.classList.contains('hidden') || typeof astronaut === 'undefined') return;

    const inv = getInventoryMap();
    const reserve = Number(astronaut.fuelReserve) || 0;
    const cap = getFuelReserveCapacity();
    const resPct = clamp(Math.round((reserve / cap) * 100), 0, 100);
    const curTier = FUEL_RESERVE_TIERS[astronaut.fuelReserveLevel || 1];

    const setEl = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setEl('invReserveLabel', `${reserve.toFixed(1)} / ${cap} L`);
    setEl('invReserveTierName', `${curTier.name} (Nv.${curTier.level})`);
    const rBar = document.getElementById('invReserveBar');
    if (rBar) rBar.style.width = `${resPct}%`;

    // Botón de aplicar reserva al cohete
    const targetShip = getTargetShipForRefuel();
    const btnApplyFuel = document.getElementById('btnInvApplyFuelToRocket');
    if (btnApplyFuel) {
        if (targetShip) {
            const need = Math.max(0, (targetShip.maxFuel || 100) - (targetShip.fuel || 0));
            const canPump = need > 0.1 && reserve > 0.1;
            btnApplyFuel.disabled = !canPump;
            btnApplyFuel.textContent = need <= 0.1
                ? 'Cohete al 100%'
                : (reserve <= 0.1 ? 'Sin Éter en Reserva' : `Aplicar al Cohete (+${Math.min(need, reserve).toFixed(1)} L)`);
            btnApplyFuel.className = `px-3 py-1.5 rounded-xl font-display text-xs font-bold transition-all cursor-pointer ${canPump ? 'bg-amber-300 text-stone-950 hover:brightness-110' : 'bg-white/10 text-stone-400 cursor-not-allowed'}`;
        } else {
            btnApplyFuel.disabled = true;
            btnApplyFuel.textContent = 'Acércate o aterriza el cohete';
            btnApplyFuel.className = 'px-3 py-1.5 rounded-xl font-display text-xs font-bold bg-white/10 text-stone-400 cursor-not-allowed';
        }
    }

    // Botón reparar casco con minerales
    const btnRepair = document.getElementById('btnInvRepairHull');
    if (btnRepair) {
        const canAffordRep = canAffordFamilyCost(inv, { structural: 6 });
        const needsRep = targetShip && targetShip.hull < (targetShip.maxHull || 100) - 0.5;
        const ok = !!(targetShip && needsRep && canAffordRep);
        btnRepair.disabled = !ok;
        btnRepair.className = `px-3 py-1.5 rounded-xl font-mono-num text-[10.5px] font-semibold transition-all cursor-pointer border ${ok ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50 hover:bg-emerald-500/30' : 'bg-white/[0.04] text-stone-500 border-white/10 cursor-not-allowed'}`;
    }

    // Mejora del tanque de reserva EVA
    const tankUpBox = document.getElementById('invTankUpgradeBox');
    if (tankUpBox) {
        if (curTier.level >= 4) {
            tankUpBox.innerHTML = `<span class="text-[10px] font-mono-num text-purple-300">★ Tanque de Reserva EVA al Máximo (1500 L)</span>`;
        } else {
            const nextT = FUEL_RESERVE_TIERS[curTier.level + 1];
            const ok = canAffordFamilyCost(inv, nextT.upgradeCost);
            tankUpBox.innerHTML = `
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex flex-wrap items-center gap-1.5">
                        <span class="text-[10px] font-mono-num text-stone-300">Ampliar a ${nextT.capacity} L:</span>
                        ${formatFamilyCostBadges(nextT.upgradeCost, inv)}
                    </div>
                    <button id="btnInvUpgradeTank" class="px-2.5 py-1 rounded-xl font-display text-[11px] font-bold cursor-pointer ${ok ? 'bg-sky-400 text-stone-950 hover:brightness-110' : 'bg-white/10 text-stone-400 cursor-not-allowed'}">Mejorar Tanque</button>
                </div>
            `;
            const upBtn = document.getElementById('btnInvUpgradeTank');
            if (upBtn) {
                upBtn.onclick = () => { if (upgradeFuelReserveTank()) renderResourceInventoryModal(); };
            }
        }
    }

    // Rejilla de Minerales en Inventario + Refinería
    const grid = document.getElementById('invMineralsGrid');
    if (grid) {
        const items = Object.entries(inv).filter(([, v]) => Math.floor(v) > 0);
        if (items.length === 0) {
            grid.innerHTML = `<div class="col-span-full p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center text-xs text-stone-400">Tu bodega de minerales está vacía. Despliega una <strong class="text-sky-300">Perforadora (G)</strong> sobre cualquier planeta para comenzar a extraer.</div>`;
        } else {
            grid.innerHTML = items.map(([id, qty]) => {
                const def = getResourceDef(id);
                const refineBtn = def.fuelYield
                    ? `<button data-refine-id="${def.id}" class="mt-1.5 w-full py-1 rounded-lg text-[9.5px] font-mono-num font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/40 hover:bg-amber-500/30 cursor-pointer">⚡ Refinar (+${def.fuelYield} L Éter)</button>`
                    : '';
                const toRocketBtn = (typeof transferMaterialSuitToRocket === 'function')
                    ? `<button data-suit-to-rocket="${def.id}" class="mt-1 w-full py-1 rounded-lg text-[9px] font-mono-num font-semibold bg-cyan-500/15 text-cyan-200 border border-cyan-400/35 hover:bg-cyan-500/25 cursor-pointer">🚀 Guardar en Cohete</button>`
                    : '';
                return `
                    <div class="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between gap-1">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-1.5 min-w-0">
                                <span class="text-base">${def.icon}</span>
                                <div class="min-w-0">
                                    <div class="font-display text-xs font-semibold text-white truncate">${def.name}</div>
                                    <div class="text-[9px] font-mono-num text-stone-400">${def.rarity}</div>
                                </div>
                            </div>
                            <span class="font-mono-num text-sm font-bold shrink-0" style="color:${def.color}">${Math.floor(qty)}</span>
                        </div>
                        <p class="text-[9.5px] text-stone-400 leading-tight">${def.desc}</p>
                        ${refineBtn}
                        ${toRocketBtn}
                    </div>
                `;
            }).join('');
            grid.querySelectorAll('button[data-refine-id]').forEach(btn => {
                btn.addEventListener('click', () => {
                    refineMineralToFuel(btn.dataset.refineId, 1);
                    renderResourceInventoryModal();
                });
            });
            grid.querySelectorAll('button[data-suit-to-rocket]').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (typeof transferMaterialSuitToRocket === 'function') {
                        transferMaterialSuitToRocket(btn.dataset.suitToRocket, 10);
                        renderResourceInventoryModal();
                    }
                });
            });
        }
    }

    // Bodega del Cohete Activo
    const rocketCargoGrid = document.getElementById('invRocketCargoGrid');
    const rocketCargoLabel = document.getElementById('invRocketCargoLabel');
    if (rocketCargoGrid && typeof ship !== 'undefined' && typeof ensureShipCargo === 'function') {
        const cargo = ensureShipCargo(ship);
        const cap = getShipCargoCapacity(ship);
        const total = getShipCargoTotal(ship);
        if (rocketCargoLabel) rocketCargoLabel.textContent = `${total} / ${cap} u en bodega del cohete`;

        const cItems = Object.entries(cargo).filter(([, v]) => Math.floor(v) > 0);
        if (cItems.length === 0) {
            rocketCargoGrid.innerHTML = `<div class="col-span-full text-[11px] text-stone-400 italic py-2">La bodega del cohete está vacía. Puedes guardar materiales aquí para transportarlos entre planetas y construir viviendas.</div>`;
        } else {
            rocketCargoGrid.innerHTML = cItems.map(([id, qty]) => {
                const def = getResourceDef(id);
                return `
                    <div class="p-2 rounded-xl bg-black/35 border border-cyan-400/20 flex items-center justify-between gap-2">
                        <div class="flex items-center gap-1.5 min-w-0">
                            <span class="text-sm">${def.icon}</span>
                            <div class="min-w-0">
                                <div class="text-[11px] font-display font-semibold text-white truncate">${def.shortName}</div>
                                <div class="text-[9.5px] font-mono-num" style="color:${def.color}">${Math.floor(qty)} u</div>
                            </div>
                        </div>
                        <button data-rocket-to-suit="${def.id}" class="px-2 py-1 rounded-lg text-[9px] font-mono-num bg-white/10 hover:bg-white/20 text-stone-200 cursor-pointer shrink-0">⬇ Traje</button>
                    </div>
                `;
            }).join('');
            rocketCargoGrid.querySelectorAll('button[data-rocket-to-suit]').forEach(btn => {
                btn.addEventListener('click', () => {
                    transferMaterialRocketToSuit(btn.dataset.rocketToSuit, 10);
                    renderResourceInventoryModal();
                });
            });
        }
    }

    // Lista de Máquinas Extractoras Activas
    const extListEl = document.getElementById('invExtractorsList');
    if (extListEl) {
        if (planetaryExtractors.length === 0) {
            extListEl.innerHTML = `<div class="text-[11px] text-stone-400 italic">No hay máquinas extractoras desplegadas todavía.</div>`;
        } else {
            extListEl.innerHTML = planetaryExtractors.map(m => {
                const tier = EXTRACTOR_TIERS[m.level] || EXTRACTOR_TIERS[1];
                return `
                    <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-2">
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5">
                                <span class="text-[9px] font-mono-num px-1.5 py-0.2 rounded bg-white/10 font-bold" style="color:${tier.accent}">NV.${m.level}</span>
                                <span class="font-display text-xs font-semibold text-white truncate">${m.id} · ${m.planetName}</span>
                            </div>
                            <div class="text-[10px] font-mono-num text-stone-400">${m.regionName || 'Superficie'} · Éter: <strong class="text-amber-300">${(m.storedFuel || 0).toFixed(1)}L</strong> · Min: <strong class="text-sky-300">${Math.floor(getExtractorMineralTotal(m))}u</strong></div>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <button data-collect-ext="${m.id}" class="px-2 py-1 rounded-lg text-[9.5px] font-mono-num bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/30 cursor-pointer">Recolectar</button>
                            <button data-inspect-ext="${m.id}" class="px-2 py-1 rounded-lg text-[9.5px] font-mono-num bg-sky-500/20 text-sky-200 border border-sky-400/40 hover:bg-sky-500/30 cursor-pointer">Inspeccionar</button>
                        </div>
                    </div>
                `;
            }).join('');

            extListEl.querySelectorAll('button[data-collect-ext]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const m = planetaryExtractors.find(e => e.id === btn.dataset.collectExt);
                    if (m) { collectFromExtractor(m); renderResourceInventoryModal(); }
                });
            });
            extListEl.querySelectorAll('button[data-inspect-ext]').forEach(btn => {
                btn.addEventListener('click', () => {
                    closeResourceInventoryModal();
                    openExtractorModal(btn.dataset.inspectExt);
                });
            });
        }
    }
}

let _lastModalRefreshTs = 0;
function refreshOpenResourceModals(nowMs) {
    if (nowMs - _lastModalRefreshTs < 180) return;
    _lastModalRefreshTs = nowMs;
    const extModal = document.getElementById('extractorModal');
    if (extModal && !extModal.classList.contains('hidden')) renderExtractorModal();
    const invModal = document.getElementById('resourceInventoryModal');
    if (invModal && !invModal.classList.contains('hidden')) renderResourceInventoryModal();
}
