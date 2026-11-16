/**
 * ÉTER — Datos del Sistema Meteorológico Planetario
 * ---------------------------------------------------------------------------
 * Perfiles de clima de cada mundo y morfología de nubes gaseosas.
 * Todas las altitudes se calculan como fracción real de la troposfera (atmoDepth)
 * para que siempre floten de forma natural sobre el relieve del planeta.
 */

const WX_TYPES = {
    //             altFrac (en % de atmoDepth - más bajas y cercanas al relieve)
    cumulus:  { altFrac: [0.08, 0.18], W: [650, 1500],  H: [60, 130],  life: [300, 700], opacity: 0.65 },
    stratus:  { altFrac: [0.05, 0.12], W: [1400, 3200], H: [40, 80],   life: [400, 900], opacity: 0.55 },
    stratocu: { altFrac: [0.07, 0.15], W: [900, 2200],  H: [50, 100],  life: [350, 800], opacity: 0.58 },
    cirrus:   { altFrac: [0.18, 0.28], W: [800, 2000],  H: [30, 60],   life: [450, 1100], opacity: 0.35 },
    nimbo:    { altFrac: [0.06, 0.14], W: [1200, 2800], H: [75, 150],  life: [350, 750], opacity: 0.75 },
    cb:       { altFrac: [0.06, 0.14], W: [1000, 2400], H: [110, 220], life: [300, 650], opacity: 0.82 },
    band:     { altFrac: [0.07, 0.18], W: [2500, 6000], H: [50, 110],  life: [600, 1400], opacity: 0.55 }
};

const WX_CLASS_TO_CLIMATE = {
    terrestrial: 'temperate',
    oceanic: 'oceanic',
    cryogenic: 'cryo',
    desert: 'arid',
    volcanic: 'volcanic',
    crystalline: 'crystal',
    toxic: 'toxic',
    anomaly: 'gas',
    hollow: 'hollow',
    shattered: 'shattered',
    megalithic: 'megalithic',
    living: 'living',
    cometary: 'cryo',
    gravitic: 'gravitic',
    artificial: 'artificial',
    temporal: 'temporal',
    misty: 'misty'
};

const WX_IRIS_VARIANTS = [
    { name: 'Bruma rosada etérea', lit: [250, 220, 235], tint: [230, 190, 215] },
    { name: 'Bruma cian perlada',  lit: [215, 248, 255], tint: [180, 230, 245] },
    { name: 'Bruma lila cósmica',  lit: [235, 225, 255], tint: [205, 195, 245] }
];

const WX_CLIMATES = {
    // ── TELÚRICOS & BIOSFERAS: nubes normales blancas, cielos limpios o frentes de lluvia suave ──
    temperate: {
        label: 'Templado', cover: [0.50, 0.95],
        mix: { cumulus: 5, stratocu: 2, stratus: 1.5, cirrus: 2, nimbo: 0.8 },
        storm: { prop: 0.42, int: [0.60, 0.95] },
        stormShade: { skyDark: 0.62, worldDark: 0.56, desat: 0.68, tint: [36, 46, 66] },
        lightning: { rate: 0.90, power: [0.65, 1.0], colors: [[225, 238, 255], [210, 225, 255]], branch: 0.75, ic: 0.35 },
        precip: { kind: 'rain', color: [200, 220, 240], amount: 0.55, evap: 0.12 },
        wind: [12, 32],
        neutral: { lit: [252, 253, 255], shade: [168, 185, 212] },
        exotic: { chance: 0.04, variants: [
            { name: 'Cirros dorados', lit: [255, 235, 185], tint: [235, 200, 140] }
        ] }
    },

    // ── OCEÁNICOS: mucha humedad, masas vaporosas esponjosas ──
    oceanic: {
        label: 'Marítimo', cover: [0.70, 1.20],
        mix: { cumulus: 5, stratocu: 3, stratus: 2, nimbo: 1.5, cirrus: 1 },
        storm: { prop: 0.52, int: [0.65, 1.0] },
        stormShade: { skyDark: 0.68, worldDark: 0.62, desat: 0.72, tint: [24, 42, 62] },
        lightning: { rate: 0.95, power: [0.70, 1.0], colors: [[215, 238, 255], [195, 225, 255]], branch: 0.80, ic: 0.35 },
        precip: { kind: 'rain', color: [195, 220, 245], amount: 0.65, evap: 0.08 },
        wind: [15, 42],
        neutral: { lit: [250, 253, 255], shade: [160, 192, 224] },
        exotic: { chance: 0.05, variants: [
            { name: 'Bruma fosforescente', lit: [195, 255, 235], tint: [130, 235, 205] }
        ] }
    },

    // ── GÉLIDOS: cirros de hielo y estratos blanquecinos con nevadas muy suaves ──
    cryo: {
        label: 'Gélido', cover: [0.30, 0.70],
        mix: { cirrus: 4, stratus: 3, stratocu: 2, cumulus: 1, nimbo: 1 },
        storm: { prop: 0.25, int: [0.45, 0.85] },
        stormShade: { skyDark: 0.44, worldDark: 0.38, desat: 0.58, tint: [72, 92, 118] },
        lightning: { rate: 0.45, power: [0.5, 0.85], colors: [[220, 240, 255]], branch: 0.6, ic: 0.4 },
        precip: { kind: 'snow', color: [245, 250, 255], amount: 0.50, evap: 0.04 },
        wind: [14, 36],
        neutral: { lit: [250, 253, 255], shade: [180, 205, 232] },
        exotic: { chance: 0.05, variants: [
            { name: 'Polvo de diamante', lit: [225, 250, 255], tint: [170, 225, 250] }
        ] }
    },

    // ── ÁRIDOS: cielos casi limpios, pocas nubes o velos muy finos ──
    arid: {
        label: 'Árido', cover: [0.04, 0.25],
        mix: { cirrus: 6, cumulus: 2, stratus: 0.5 },
        storm: { prop: 0.12, int: [0.45, 0.85] },
        stormShade: { skyDark: 0.40, worldDark: 0.36, desat: 0.42, tint: [108, 76, 48] },
        lightning: { rate: 0.5, power: [0.7, 1.0], colors: [[250, 235, 255]], branch: 0.75, ic: 0.3 },
        precip: { kind: 'rain', color: [220, 210, 195], amount: 0.30, evap: 0.7 },
        wind: [16, 45],
        neutral: { lit: [252, 250, 246], shade: [210, 198, 185] },
        exotic: { chance: 0.08, variants: [
            { name: 'Bruma de polvo ámbar', lit: [245, 215, 165], tint: [205, 165, 115] }
        ] }
    },

    // ── ÍGNEOS: ceniza volcánica suave, resplandor rojizo inferior de magma ──
    volcanic: {
        label: 'Ceniza volcánica', cover: [0.45, 0.85],
        mix: { stratus: 3, cumulus: 3, stratocu: 2, nimbo: 1.5, cirrus: 0.8 },
        storm: { prop: 0.58, int: [0.7, 1.0] },
        stormShade: { skyDark: 0.80, worldDark: 0.74, desat: 0.78, tint: [32, 24, 24] },
        lightning: { rate: 1.0, power: [0.8, 1.0], colors: [[255, 205, 130], [255, 235, 205], [255, 165, 90]], branch: 0.90, ic: 0.4 },
        precip: { kind: 'ash', color: [110, 105, 108], amount: 0.5, evap: 0.15 },
        wind: [12, 38],
        underGlow: 0.35,
        neutral: { lit: [195, 188, 185], shade: [105, 98, 102] },
        exotic: { chance: 0.07, variants: [
            { name: 'Columnas de azufre', lit: [245, 225, 150], tint: [180, 155, 80] }
        ] }
    },

    // ── PRISMÁTICOS: brumas perladas tenues ──
    crystal: {
        label: 'Prismático', cover: [0.18, 0.50],
        mix: { cirrus: 5, stratus: 2, cumulus: 2, stratocu: 1.5 },
        storm: { prop: 0.15, int: [0.45, 0.85] },
        stormShade: { skyDark: 0.42, worldDark: 0.36, desat: 0.48, tint: [64, 68, 96] },
        lightning: { rate: 0.55, power: [0.6, 0.95], colors: [[235, 245, 255], [225, 210, 255]], branch: 0.8, ic: 0.4 },
        precip: { kind: 'sparkle', color: [240, 250, 255], amount: 0.40, evap: 0.25 },
        wind: [10, 28],
        neutral: { lit: [252, 253, 255], shade: [195, 212, 235] },
        exotic: { chance: 0.10, variants: WX_IRIS_VARIANTS }
    },

    // ── TÓXICOS: vapores químicos verdosos suaves ──
    toxic: {
        label: 'Tóxico', cover: [0.55, 0.90],
        mix: { stratus: 3, stratocu: 2, cumulus: 3, nimbo: 1.8, cirrus: 0.5 },
        storm: { prop: 0.55, int: [0.65, 1.0] },
        stormShade: { skyDark: 0.72, worldDark: 0.66, desat: 0.65, tint: [32, 48, 28] },
        lightning: { rate: 0.95, power: [0.75, 1.0], colors: [[210, 255, 190], [180, 255, 220]], branch: 0.88, ic: 0.4 },
        precip: { kind: 'acid', color: [195, 240, 165], amount: 0.50, evap: 0.12 },
        wind: [14, 42],
        neutral: { lit: [225, 242, 215], shade: [128, 155, 122] },
        exotic: { chance: 0.08, variants: [
            { name: 'Vapores de uraninita', lit: [210, 255, 175], tint: [130, 210, 100] }
        ] }
    },

    // ── GASEOSOS / ANOMALÍAS: bandas atmosféricas masivas ──
    gas: {
        label: 'Gaseoso', cover: [0.80, 1.25],
        mix: { band: 6, stratus: 2, cumulus: 2, cirrus: 0.8 },
        storm: { prop: 0.75, int: [0.75, 1.0] },
        stormShade: { skyDark: 0.74, worldDark: 0.68, desat: 0.60, tint: [42, 36, 48] },
        lightning: { rate: 1.0, power: [0.85, 1.0], colors: [[255, 245, 220], [225, 215, 255]], branch: 0.95, ic: 0.4 },
        precip: { kind: 'none', color: [230, 220, 205], amount: 0, evap: 0 },
        wind: [38, 105],
        neutral: { lit: [248, 242, 230], shade: [165, 145, 125] },
        exotic: { chance: 0.06, variants: [
            { name: 'Bruma anómala magenta', lit: [255, 205, 240], tint: [210, 140, 195] }
        ] }
    },

    // ── HUECOS: vapores y nieblas cavernosas suaves ──
    hollow: {
        label: 'Cavernoso', cover: [0.20, 0.55],
        mix: { cumulus: 3, stratus: 2.5, stratocu: 2, cirrus: 1.5 },
        storm: { prop: 0.12, int: [0.35, 0.75] },
        stormShade: { skyDark: 0.46, worldDark: 0.42, desat: 0.55, tint: [44, 42, 64] },
        lightning: { rate: 0.45, power: [0.5, 0.85], colors: [[225, 210, 255]], branch: 0.65, ic: 0.5 },
        precip: { kind: 'rain', color: [210, 215, 240], amount: 0.35, evap: 0.2 },
        wind: [6, 20],
        neutral: { lit: [245, 242, 250], shade: [175, 170, 195] },
        exotic: { chance: 0.05, variants: [
            { name: 'Bruma de cristal ancestral', lit: [240, 225, 255], tint: [180, 155, 225] }
        ] }
    },
    // ── FRAGMENTADOS: corrientes térmicas y polvo magnético entre islas ──
    shattered: {
        label: 'Turbulencia Magnética', cover: [0.35, 0.70],
        mix: { cirrus: 3.5, stratocu: 2.5, cumulus: 2.5, stratus: 1.5 },
        storm: { prop: 0.42, int: [0.55, 0.92] },
        stormShade: { skyDark: 0.56, worldDark: 0.50, desat: 0.54, tint: [62, 46, 42] },
        lightning: { rate: 0.85, power: [0.7, 1.0], colors: [[255, 195, 120], [165, 243, 252]], branch: 0.85, ic: 0.45 },
        precip: { kind: 'ash', color: [220, 185, 160], amount: 0.30, evap: 0.3 },
        wind: [20, 52],
        neutral: { lit: [245, 228, 215], shade: [155, 138, 150] },
        exotic: { chance: 0.10, variants: [
            { name: 'Velo de polvo ígneo', lit: [255, 205, 160], tint: [220, 145, 105] }
        ] }
    },
    // ── MEGALÍTICOS: bruma áurea seca y vientos constantes ──
    megalithic: {
        label: 'Cielo Astrolábico', cover: [0.15, 0.42],
        mix: { cirrus: 5, stratus: 2.5, cumulus: 1.5 },
        storm: { prop: 0.18, int: [0.4, 0.8] },
        stormShade: { skyDark: 0.42, worldDark: 0.36, desat: 0.46, tint: [76, 68, 54] },
        lightning: { rate: 0.65, power: [0.65, 0.95], colors: [[254, 240, 138], [186, 230, 253]], branch: 0.75, ic: 0.5 },
        precip: { kind: 'sparkle', color: [254, 240, 138], amount: 0.25, evap: 0.35 },
        wind: [10, 26],
        neutral: { lit: [252, 246, 232], shade: [185, 175, 158] },
        exotic: { chance: 0.08, variants: [
            { name: 'Cirros áureos', lit: [255, 238, 175], tint: [225, 195, 120] }
        ] }
    },
    // ── SUPERORGANISMOS: nieblas de esporas bioluminiscentes y llovizna cálida ──
    living: {
        label: 'Biosfera de Esporas', cover: [0.55, 0.95],
        mix: { cumulus: 4.5, stratus: 3, stratocu: 2.5, cirrus: 1.5 },
        storm: { prop: 0.30, int: [0.45, 0.82] },
        stormShade: { skyDark: 0.54, worldDark: 0.48, desat: 0.52, tint: [28, 54, 52] },
        lightning: { rate: 0.55, power: [0.55, 0.90], colors: [[153, 246, 228], [249, 168, 212]], branch: 0.70, ic: 0.45 },
        precip: { kind: 'rain', color: [190, 248, 235], amount: 0.55, evap: 0.10 },
        wind: [8, 24],
        neutral: { lit: [235, 252, 248], shade: [148, 192, 186] },
        exotic: { chance: 0.14, variants: [
            { name: 'Niebla de esporas rosadas', lit: [252, 215, 238], tint: [215, 155, 200] }
        ] }
    },
    // ── GRAVITATORIOS: jirones de acreción oscura, descargas relativistas ──
    gravitic: {
        label: 'Acreción Relativista', cover: [0.18, 0.48],
        mix: { band: 4, cirrus: 3, cb: 1.5 },
        storm: { prop: 0.55, int: [0.65, 1.0] },
        stormShade: { skyDark: 0.82, worldDark: 0.76, desat: 0.72, tint: [24, 18, 42] },
        lightning: { rate: 1.25, power: [0.75, 1.0], colors: [[192, 132, 252], [251, 146, 60]], branch: 0.85, ic: 0.65 },
        precip: { kind: 'sparkle', color: [216, 180, 254], amount: 0.30, evap: 0.30 },
        wind: [28, 70],
        neutral: { lit: [218, 205, 245], shade: [92, 74, 138] },
        exotic: { chance: 0.25, variants: [
            { name: 'Filamentos de púlsar', lit: [190, 245, 255], tint: [110, 175, 235] }
        ] }
    },
    // ── MEGAESTRUCTURAS: brumas de refrigerante ionizado y vientos laminares ──
    artificial: {
        label: 'Atmósfera Regulada', cover: [0.12, 0.34],
        mix: { stratus: 4, cirrus: 3, stratocu: 2 },
        storm: { prop: 0.15, int: [0.35, 0.70] },
        stormShade: { skyDark: 0.44, worldDark: 0.38, desat: 0.50, tint: [42, 56, 70] },
        lightning: { rate: 0.60, power: [0.55, 0.90], colors: [[56, 189, 248], [250, 204, 21]], branch: 0.60, ic: 0.50 },
        precip: { kind: 'sparkle', color: [125, 211, 252], amount: 0.22, evap: 0.40 },
        wind: [10, 24],
        neutral: { lit: [228, 240, 248], shade: [135, 158, 178] },
        exotic: { chance: 0.12, variants: [
            { name: 'Vapor de plasma áureo', lit: [254, 235, 175], tint: [220, 175, 95] }
        ] }
    },
    // ── EFÍMEROS & TORMENTAS: frentes eléctricos intensos y precipitación cristalina ──
    temporal: {
        label: 'Tormenta Cósmica', cover: [0.60, 1.05],
        mix: { cb: 3.5, nimbo: 3, band: 2.5, cumulus: 2 },
        storm: { prop: 0.82, int: [0.75, 1.0] },
        stormShade: { skyDark: 0.76, worldDark: 0.70, desat: 0.66, tint: [26, 32, 64] },
        lightning: { rate: 1.55, power: [0.80, 1.0], colors: [[103, 232, 249], [244, 114, 182]], branch: 0.92, ic: 0.55 },
        precip: { kind: 'sparkle', color: [186, 230, 253], amount: 0.65, evap: 0.15 },
        wind: [34, 82],
        neutral: { lit: [224, 242, 255], shade: [108, 132, 176] },
        exotic: { chance: 0.22, variants: [
            { name: 'Lluvia de diamantes prismáticos', lit: [240, 248, 255], tint: [165, 220, 255] }
        ] }
    },
    // ── BRUMOSOS: velos suaves continuos, llovizna etérea y luz muy difusa ──
    misty: {
        label: 'Brumoso Perpetuo', cover: [0.65, 1.05],
        mix: { stratus: 5, stratocu: 3, cirrus: 2, cumulus: 1.5 },
        storm: { prop: 0.14, int: [0.30, 0.65] },
        stormShade: { skyDark: 0.34, worldDark: 0.28, desat: 0.62, tint: [74, 86, 98] },
        lightning: { rate: 0.35, power: [0.45, 0.78], colors: [[210, 240, 255], [254, 232, 198]], branch: 0.55, ic: 0.70 },
        precip: { kind: 'rain', color: [215, 235, 248], amount: 0.32, evap: 0.12 },
        wind: [5, 16],
        neutral: { lit: [236, 244, 248], shade: [148, 168, 182] },
        exotic: { chance: 0.14, variants: [
            { name: 'Cirros de rocío perlado', lit: [238, 248, 255], tint: [195, 225, 240] }
        ] }
    }
};

const WX_ARCH_OVERRIDES = {
    biolume:            { exotic: { chance: 0.10, variants: [{ name: 'Bruma bioluminiscente', lit: [240, 210, 255], tint: [185, 140, 230] }] } },
    amber_forest:       { exotic: { chance: 0.08, variants: [{ name: 'Polen ámbar suspendido', lit: [255, 230, 165], tint: [215, 170, 95] }] } },
    verdant_gaia:       { cover: [0.50, 0.85] },
    verdant_terra:      { cover: [0.45, 0.80] },
    archipelago_lakes:  { cover: [0.45, 0.80] },
    acid_ocean:         { neutral: { lit: [230, 245, 210], shade: [150, 175, 130] } },
    bio_phosphor_ocean: { exotic: { chance: 0.12, variants: [{ name: 'Bruma fosforescente', lit: [195, 255, 235], tint: [130, 235, 205] }] } },
    red_dune:           { cover: [0.03, 0.20], exotic: { chance: 0.12 } },
    dune_arrakis:       { cover: [0.02, 0.18], wind: [22, 55], exotic: { chance: 0.15 }, stormShade: { skyDark: 0.46, worldDark: 0.40, desat: 0.45, tint: [118, 78, 42] } },
    zen_dunes:          { cover: [0.02, 0.15] },
    magma:              { underGlow: 0.45, stormShade: { skyDark: 0.82, worldDark: 0.76, desat: 0.80, tint: [36, 22, 20] } },
    sulfur_caldera:     { neutral: { lit: [240, 235, 185], shade: [160, 150, 100] } },
    chlorine_storm:     { cover: [0.65, 1.05], storm: { prop: 0.75, int: [0.7, 1.0] }, neutral: { lit: [220, 245, 195], shade: [135, 168, 115] }, stormShade: { skyDark: 0.78, worldDark: 0.72, desat: 0.68, tint: [30, 52, 26] } }
};

function wxResolveProfile(arch) {
    const ov = (arch && WX_ARCH_OVERRIDES[arch.id]) || {};
    const climateId = ov.climate || WX_CLASS_TO_CLIMATE[arch && arch.classId] || 'temperate';
    const base = WX_CLIMATES[climateId] || WX_CLIMATES.temperate;
    const out = {};
    for (const k in base) out[k] = base[k];
    out.id = climateId;
    for (const k in ov) {
        if (k === 'climate') continue;
        const v = ov[k];
        if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
            out[k] = Object.assign({}, base[k], v);
        } else {
            out[k] = v;
        }
    }
    return out;
}

/**
 * ---------------------------------------------------------------------------
 * PERFILES DE VIENTOS PLANETARIOS, RÁFAGAS Y VÓRTICES (Tornados / Huracanes)
 * ---------------------------------------------------------------------------
 * Velocidades en px/s del simulador (10 px/s ≈ 1 m/s ≈ 3.6 km/h).
 * Regla de realismo aeroespacial:
 *  - Brisas suaves (< 55 px/s ≈ 20 km/h): imperceptibles para cohetes en vuelo o plataforma.
 *  - Ráfagas moderadas/fuertes (75 - 150 px/s): deriva sutil y respuesta aerodinámica progresiva.
 *  - Vendavales, huracanes y tornados (160 - 460+ px/s): corrientes notables y desafiantes.
 */
const WIND_REGIMES = {
    vacuum_none: {
        id: 'vacuum_none',
        name: 'Sin Viento (Vacío)',
        desc: 'Ausencia de atmósfera densa; silencio eólico absoluto.',
        baseSpeed: [0, 0],
        gustAmp: [0, 0],
        cellCount: [0, 0],
        cellDuration: [30, 60],
        cellAngVel: [0, 0],
        calmBias: 1.0,
        jetAltFrac: 0.5,
        jetBoost: 0,
        vortexTypes: [],
        vortexChance: 0,
        vortexMax: 0,
        particleStyle: 'none',
        particleTint: [220, 230, 245]
    },
    still_calm: {
        id: 'still_calm',
        name: 'Calma Serene',
        desc: 'Atmósfera quieta casi todo el tiempo, con brisas sumamente débiles y aisladas.',
        baseSpeed: [0, 10],
        gustAmp: [4, 22],
        cellCount: [1, 3],
        cellDuration: [45, 90],
        cellAngVel: [0.002, 0.006],
        calmBias: 0.78,
        jetAltFrac: 0.44,
        jetBoost: 18,
        vortexTypes: [],
        vortexChance: 0,
        vortexMax: 0,
        particleStyle: 'mote',
        particleTint: [225, 235, 248]
    },
    breezy_variable: {
        id: 'breezy_variable',
        name: 'Brisas Variables',
        desc: 'Zonas de calma alternadas con frentes móviles suaves y ráfagas aisladas en tormentas.',
        baseSpeed: [6, 28],
        gustAmp: [22, 82],
        cellCount: [3, 6],
        cellDuration: [34, 70],
        cellAngVel: [0.004, 0.012],
        calmBias: 0.52,
        jetAltFrac: 0.42,
        jetBoost: 45,
        vortexTypes: ['tornado'],
        vortexChance: 0.16,
        vortexMax: 2,
        particleStyle: 'wisp',
        particleTint: [236, 245, 255]
    },
    trade_steady: {
        id: 'trade_steady',
        name: 'Alisios Constantes',
        desc: 'Circulación planetaria fluida con bandas de brisa estable y claros tranquilos.',
        baseSpeed: [18, 46],
        gustAmp: [20, 68],
        cellCount: [3, 5],
        cellDuration: [42, 85],
        cellAngVel: [0.005, 0.014],
        calmBias: 0.25,
        jetAltFrac: 0.40,
        jetBoost: 62,
        vortexTypes: ['tornado', 'hurricane'],
        vortexChance: 0.12,
        vortexMax: 1,
        particleStyle: 'wisp',
        particleTint: [242, 240, 226]
    },
    maritime_cyclone: {
        id: 'maritime_cyclone',
        name: 'Corrientes Marinas y Ciclones',
        desc: 'Brisas oceánicas húmedas capaces de organizar huracanes de ojo calmo y trombas marinas.',
        baseSpeed: [14, 44],
        gustAmp: [32, 105],
        cellCount: [3, 6],
        cellDuration: [38, 76],
        cellAngVel: [0.005, 0.014],
        calmBias: 0.34,
        jetAltFrac: 0.38,
        jetBoost: 72,
        vortexTypes: ['hurricane', 'waterspout'],
        vortexChance: 0.34,
        vortexMax: 2,
        particleStyle: 'mist',
        particleTint: [215, 238, 252]
    },
    arid_aeolian: {
        id: 'arid_aeolian',
        name: 'Ráfagas Eólicas y Tolvaneras',
        desc: 'Desierto cambiante donde nacen remolinos de polvo térmicos y frentes de arena viajeros.',
        baseSpeed: [10, 38],
        gustAmp: [36, 118],
        cellCount: [3, 6],
        cellDuration: [28, 62],
        cellAngVel: [0.006, 0.016],
        calmBias: 0.42,
        jetAltFrac: 0.36,
        jetBoost: 58,
        vortexTypes: ['dust_devil'],
        vortexChance: 0.42,
        vortexMax: 3,
        particleStyle: 'dust',
        particleTint: [235, 198, 152]
    },
    cryo_katabatic: {
        id: 'cryo_katabatic',
        name: 'Vientos Catabáticos Polares',
        desc: 'Aire denso y gélido que desciende por cordilleras y desata remolinos de escarcha.',
        baseSpeed: [12, 48],
        gustAmp: [40, 125],
        cellCount: [3, 6],
        cellDuration: [32, 68],
        cellAngVel: [0.006, 0.015],
        calmBias: 0.38,
        jetAltFrac: 0.34,
        jetBoost: 78,
        vortexTypes: ['cryo_vortex'],
        vortexChance: 0.28,
        vortexMax: 2,
        particleStyle: 'frost',
        particleTint: [224, 244, 255]
    },
    pyro_thermal: {
        id: 'pyro_thermal',
        name: 'Convección Ígnea y Remolinos',
        desc: 'Corrientes térmicas ascendentes sobre calderas con ocasionales remolinos de fuego y ceniza.',
        baseSpeed: [10, 38],
        gustAmp: [35, 108],
        cellCount: [3, 5],
        cellDuration: [26, 56],
        cellAngVel: [0.005, 0.013],
        calmBias: 0.40,
        jetAltFrac: 0.36,
        jetBoost: 60,
        vortexTypes: ['fire_whirl'],
        vortexChance: 0.32,
        vortexMax: 2,
        particleStyle: 'ember',
        particleTint: [255, 195, 130]
    },
    toxic_squall: {
        id: 'toxic_squall',
        name: 'Chubascos Densos y Ciclones',
        desc: 'Atmósfera pesada con frentes de ráfagas corrosivas, tornados y ciclones activos.',
        baseSpeed: [22, 62],
        gustAmp: [48, 135],
        cellCount: [4, 7],
        cellDuration: [30, 62],
        cellAngVel: [0.006, 0.016],
        calmBias: 0.26,
        jetAltFrac: 0.36,
        jetBoost: 85,
        vortexTypes: ['tornado', 'hurricane'],
        vortexChance: 0.36,
        vortexMax: 2,
        particleStyle: 'vapor',
        particleTint: [195, 240, 175]
    },
    hyper_gale: {
        id: 'hyper_gale',
        name: 'Vendavales Planetarios',
        desc: 'Vientos intensos y persistentes en todo el globo, con grandes ciclones y supertornados.',
        baseSpeed: [68, 148],
        gustAmp: [60, 155],
        cellCount: [4, 8],
        cellDuration: [36, 75],
        cellAngVel: [0.008, 0.020],
        calmBias: 0.06,
        jetAltFrac: 0.34,
        jetBoost: 120,
        vortexTypes: ['hurricane', 'tornado'],
        vortexChance: 0.56,
        vortexMax: 3,
        particleStyle: 'wisp',
        particleTint: [240, 228, 205]
    },
    terminator_convection: {
        id: 'terminator_convection',
        name: 'Vientos de Terminador',
        desc: 'Brisas suaves en los polos térmico-nocturnos y fuertes corrientes en el anillo crepuscular.',
        baseSpeed: [12, 36],
        gustAmp: [42, 125],
        cellCount: [3, 6],
        cellDuration: [32, 64],
        cellAngVel: [0.005, 0.014],
        calmBias: 0.45,
        jetAltFrac: 0.38,
        jetBoost: 80,
        vortexTypes: ['tornado', 'hurricane'],
        vortexChance: 0.30,
        vortexMax: 2,
        particleStyle: 'wisp',
        particleTint: [220, 235, 255]
    },
    canyon_shear: {
        id: 'canyon_shear',
        name: 'Cizalladura de Islas y Grietas',
        desc: 'Corrientes canalizadas entre islas flotantes y abismos con ráfagas cambiantes.',
        baseSpeed: [16, 48],
        gustAmp: [38, 108],
        cellCount: [3, 6],
        cellDuration: [28, 58],
        cellAngVel: [0.006, 0.015],
        calmBias: 0.35,
        jetAltFrac: 0.35,
        jetBoost: 72,
        vortexTypes: ['dust_devil', 'tornado'],
        vortexChance: 0.22,
        vortexMax: 2,
        particleStyle: 'dust',
        particleTint: [225, 205, 190]
    },
    organic_drift: {
        id: 'organic_drift',
        name: 'Brisas de Esporas',
        desc: 'Corrientes orgánicas tibias y suaves que transportan esporas y polen en suspensión.',
        baseSpeed: [6, 24],
        gustAmp: [14, 48],
        cellCount: [2, 5],
        cellDuration: [40, 80],
        cellAngVel: [0.003, 0.009],
        calmBias: 0.56,
        jetAltFrac: 0.44,
        jetBoost: 32,
        vortexTypes: ['waterspout'],
        vortexChance: 0.08,
        vortexMax: 1,
        particleStyle: 'spore',
        particleTint: [195, 248, 232]
    },
    regulated_laminar: {
        id: 'regulated_laminar',
        name: 'Flujo Laminar Regulado',
        desc: 'Circulación atmosférica estabilizada artificialmente; corrientes suaves sin tornados.',
        baseSpeed: [8, 22],
        gustAmp: [6, 18],
        cellCount: [2, 3],
        cellDuration: [55, 100],
        cellAngVel: [0.003, 0.007],
        calmBias: 0.45,
        jetAltFrac: 0.42,
        jetBoost: 24,
        vortexTypes: [],
        vortexChance: 0,
        vortexMax: 0,
        particleStyle: 'mote',
        particleTint: [186, 230, 253]
    },
    gravitic_swirl: {
        id: 'gravitic_swirl',
        name: 'Mareas Atmosféricas Singulares',
        desc: 'Arrastre gravitatorio en espiral con cizalladura de alta altitud.',
        baseSpeed: [28, 78],
        gustAmp: [38, 105],
        cellCount: [3, 5],
        cellDuration: [32, 65],
        cellAngVel: [0.008, 0.018],
        calmBias: 0.20,
        jetAltFrac: 0.35,
        jetBoost: 92,
        vortexTypes: ['tornado'],
        vortexChance: 0.24,
        vortexMax: 2,
        particleStyle: 'mote',
        particleTint: [216, 180, 254]
    },
    mist_drift: {
        id: 'mist_drift',
        name: 'Deriva de Bruma Serena',
        desc: 'Corrientes laminares muy suaves que mecen los bancos de niebla sin perturbar el vuelo.',
        baseSpeed: [4, 16],
        gustAmp: [8, 26],
        cellCount: [2, 4],
        cellDuration: [45, 88],
        cellAngVel: [0.002, 0.007],
        calmBias: 0.68,
        jetAltFrac: 0.45,
        jetBoost: 22,
        vortexTypes: [],
        vortexChance: 0,
        vortexMax: 0,
        particleStyle: 'mist',
        particleTint: [224, 242, 250]
    }
};

const WIND_CLASS_DEFAULTS = {
    terrestrial: 'breezy_variable',
    oceanic:     'maritime_cyclone',
    desert:      'arid_aeolian',
    cryogenic:   'cryo_katabatic',
    volcanic:    'pyro_thermal',
    crystalline: 'still_calm',
    toxic:       'toxic_squall',
    anomaly:     'still_calm',
    hollow:      'breezy_variable',
    shattered:   'canyon_shear',
    megalithic:  'trade_steady',
    living:      'organic_drift',
    cometary:    'vacuum_none',
    gravitic:    'gravitic_swirl',
    artificial:  'regulated_laminar',
    temporal:    'hyper_gale',
    misty:       'mist_drift'
};

const WIND_ARCH_OVERRIDES = {
    // Planetas de calma notable o vacío
    zen_dunes:                { regime: 'still_calm', particleTint: [248, 224, 182] },
    salt_flats:               { regime: 'still_calm', particleTint: [242, 240, 236] },
    glass_desert:             { regime: 'still_calm', particleTint: [235, 225, 210] },
    nitrogen_ice:             { regime: 'still_calm', particleTint: [238, 246, 255] },
    obsidian_crag:            { regime: 'still_calm', particleTint: [200, 180, 175] },
    bismuth_fractal:          { regime: 'still_calm', particleTint: [215, 230, 255] },
    ferrum_core:              { regime: 'vacuum_none' },
    dwarf_planetoid:          { regime: 'vacuum_none' },
    proto_impact:             { regime: 'vacuum_none' },
    shattered_core:           { regime: 'vacuum_none' },
    relic:                    { regime: 'still_calm', particleTint: [220, 225, 240] },
    cubic_anomaly:            { regime: 'still_calm', particleTint: [190, 235, 255] },
    hollow_crystal_geode:     { regime: 'still_calm', particleTint: [210, 225, 255] },
    clockwork_monolith:       { regime: 'regulated_laminar', particleTint: [250, 235, 185] },
    active_comet:             { regime: 'vacuum_none' },
    binary_shard:             { regime: 'vacuum_none' },
    razor_comet_splinter:     { regime: 'vacuum_none' },

    // Planetas con identidad propia de viento intenso o especial
    dune_arrakis:             { regime: 'hyper_gale', vortexTypes: ['dust_devil'], vortexChance: 0.62, particleStyle: 'dust', particleTint: [245, 185, 115] },
    chlorine_storm:           { regime: 'hyper_gale', vortexTypes: ['tornado', 'hurricane'], vortexChance: 0.62, particleStyle: 'vapor', particleTint: [190, 245, 155] },
    gas_jovian:               { regime: 'hyper_gale', vortexTypes: ['hurricane'], vortexChance: 0.68, particleStyle: 'wisp', particleTint: [248, 222, 185] },
    saturnian_crown:          { regime: 'hyper_gale', vortexTypes: ['hurricane'], vortexChance: 0.58, particleStyle: 'wisp', particleTint: [248, 238, 200] },
    titan_gas_dense:          { regime: 'hyper_gale', vortexTypes: ['hurricane', 'tornado'], vortexChance: 0.55, particleStyle: 'mist', particleTint: [238, 202, 148] },
    ice_neptune:              { regime: 'hyper_gale', vortexTypes: ['cryo_vortex', 'hurricane'], vortexChance: 0.60, particleStyle: 'frost', particleTint: [175, 225, 255] },
    chrono_storm_world:       { regime: 'hyper_gale', vortexTypes: ['tornado', 'hurricane'], vortexChance: 0.66, particleStyle: 'wisp', particleTint: [165, 238, 255] },
    diamond_rain_giant:       { regime: 'hyper_gale', vortexTypes: ['hurricane'], vortexChance: 0.58, particleStyle: 'frost', particleTint: [225, 245, 255] },
    twilight_eyeball:         { regime: 'terminator_convection', particleTint: [228, 238, 255] },
    crystal:                  { regime: 'still_calm', particleTint: [225, 245, 255] },
    amethyst_hollow:          { regime: 'still_calm', particleTint: [232, 205, 255] },
    amber_forest:             { regime: 'breezy_variable', vortexChance: 0.08, particleTint: [254, 228, 160] },
    biolume:                  { regime: 'organic_drift', particleTint: [232, 195, 255] },
    archipelago_lakes:        { regime: 'maritime_cyclone', vortexChance: 0.22, particleTint: [225, 244, 255] },
    super_volcano:            { regime: 'pyro_thermal', vortexChance: 0.44, particleTint: [255, 175, 110] },
    inferno_caldera:          { regime: 'pyro_thermal', vortexChance: 0.40, particleTint: [255, 165, 95] }
};

function wxResolveWindProfile(arch) {
    const ov = (arch && WIND_ARCH_OVERRIDES[arch.id]) || {};
    const classId = (arch && arch.classId) || 'terrestrial';
    const regimeId = ov.regime || WIND_CLASS_DEFAULTS[classId] || 'breezy_variable';
    const base = WIND_REGIMES[regimeId] || WIND_REGIMES.breezy_variable;
    const out = Object.assign({}, base, ov);
    out.regimeId = regimeId;
    return out;
}

/**
 * ---------------------------------------------------------------------------
 * PERFILES DE NIEBLAS Y NEBLINAS PLANETARIAS (LOCALIZADAS, TEMPORALES Y PERPETUAS)
 * ---------------------------------------------------------------------------
 */
const FOG_REGIMES = {
    none: {
        id: 'none',
        label: 'Sin Neblina',
        perpetual: false,
        bankCount: [0, 0],
        density: [0, 0],
        duration: [30, 60],
        spawnChance: 0,
        altRange: [0, 0],
        thickness: [0, 0],
        dayColor: [220, 230, 240],
        twilightColor: [245, 195, 155],
        nightGlow: [25, 35, 55],
        nightGlowStrength: 0.0
    },
    rare_transient: {
        id: 'rare_transient',
        label: 'Brumas Efímeras Raras',
        perpetual: false,
        bankCount: [0, 2],
        density: [0.22, 0.42],
        duration: [26, 52],
        spawnChance: 0.28,
        altRange: [-10, 42],
        thickness: [65, 115],
        dayColor: [236, 228, 218],
        twilightColor: [248, 192, 148],
        nightGlow: [24, 30, 48],
        nightGlowStrength: 0.06
    },
    moderate_temporal: {
        id: 'moderate_temporal',
        label: 'Neblinas Localizadas Temporales',
        perpetual: false,
        bankCount: [1, 4],
        density: [0.34, 0.64],
        duration: [36, 78],
        spawnChance: 0.56,
        altRange: [-12, 55],
        thickness: [82, 155],
        dayColor: [226, 238, 248],
        twilightColor: [248, 186, 150],
        nightGlow: [34, 48, 72],
        nightGlowStrength: 0.12
    },
    frequent_temporal: {
        id: 'frequent_temporal',
        label: 'Bancos de Niebla Frecuentes',
        perpetual: false,
        bankCount: [3, 6],
        density: [0.46, 0.80],
        duration: [42, 92],
        spawnChance: 0.82,
        altRange: [-14, 72],
        thickness: [95, 195],
        dayColor: [224, 242, 248],
        twilightColor: [245, 190, 175],
        nightGlow: [52, 84, 110],
        nightGlowStrength: 0.22
    },
    perpetual_dense: {
        id: 'perpetual_dense',
        label: 'Niebla Perpetua Omnipresente',
        perpetual: true,
        bankCount: [7, 11],
        density: [0.68, 0.96],
        duration: [55, 115],
        spawnChance: 1.0,
        altRange: [-18, 135],
        thickness: [130, 260],
        dayColor: [224, 240, 246],
        twilightColor: [248, 196, 166],
        nightGlow: [74, 116, 138],
        nightGlowStrength: 0.34
    }
};

const FOG_CLASS_DEFAULTS = {
    misty:       'perpetual_dense',
    oceanic:     'frequent_temporal',
    living:      'frequent_temporal',
    hollow:      'frequent_temporal',
    terrestrial: 'moderate_temporal',
    cryogenic:   'moderate_temporal',
    toxic:       'moderate_temporal',
    volcanic:    'moderate_temporal',
    shattered:   'rare_transient',
    megalithic:  'rare_transient',
    artificial:  'rare_transient',
    temporal:    'rare_transient',
    anomaly:     'rare_transient',
    crystalline: 'rare_transient',
    desert:      'rare_transient',
    cometary:    'none',
    gravitic:    'none'
};

const FOG_ARCH_OVERRIDES = {
    // Mundos de niebla perpetua (clase misty): paletas personalizadas de alta estética
    velvet_mist: {
        regime: 'perpetual_dense',
        dayColor: [224, 242, 246],
        twilightColor: [244, 198, 182],
        nightGlow: [72, 128, 146],
        nightGlowStrength: 0.32
    },
    amber_haze: {
        regime: 'perpetual_dense',
        dayColor: [248, 224, 192],
        twilightColor: [252, 182, 124],
        nightGlow: [128, 86, 56],
        nightGlowStrength: 0.30
    },
    abyssal_shroud: {
        regime: 'perpetual_dense',
        dayColor: [194, 214, 246],
        twilightColor: [204, 168, 238],
        nightGlow: [78, 132, 188],
        nightGlowStrength: 0.45
    },
    // Planetas de otras categorías con neblinas especialmente frecuentes o características
    biolume:            { regime: 'frequent_temporal', dayColor: [228, 206, 248], twilightColor: [242, 162, 218], nightGlow: [118, 74, 168], nightGlowStrength: 0.34 },
    archipelago_lakes:  { regime: 'frequent_temporal', dayColor: [228, 244, 252], nightGlow: [58, 92, 124], nightGlowStrength: 0.20 },
    verdant_gaia:       { regime: 'frequent_temporal', dayColor: [232, 246, 242], nightGlow: [46, 86, 88], nightGlowStrength: 0.16 },
    bio_phosphor_ocean: { regime: 'frequent_temporal', dayColor: [198, 248, 236], nightGlow: [56, 158, 138], nightGlowStrength: 0.36 },
    chlorine_storm:     { regime: 'frequent_temporal', dayColor: [206, 238, 184], twilightColor: [222, 218, 144], nightGlow: [72, 118, 62], nightGlowStrength: 0.24 },
    sulfur_caldera:     { regime: 'frequent_temporal', dayColor: [238, 228, 174], twilightColor: [248, 184, 110], nightGlow: [115, 88, 42], nightGlowStrength: 0.22 },
    cryo_ring:          { regime: 'moderate_temporal', dayColor: [224, 244, 255], nightGlow: [64, 112, 152], nightGlowStrength: 0.22 },
    methane_tundra:     { regime: 'moderate_temporal', dayColor: [205, 242, 246], nightGlow: [48, 116, 132], nightGlowStrength: 0.22 },
    amber_forest:       { regime: 'moderate_temporal', dayColor: [250, 232, 192], twilightColor: [248, 178, 102], nightGlow: [110, 82, 42], nightGlowStrength: 0.20 },
    magma:              { regime: 'moderate_temporal', dayColor: [202, 184, 176], twilightColor: [248, 146, 94], nightGlow: [148, 68, 34], nightGlowStrength: 0.28 },
    // Sin neblina en gigantes gaseosos, vacío o salares/desiertos secos extremos
    gas_jovian:         { regime: 'none' },
    saturnian_crown:    { regime: 'none' },
    titan_gas_dense:    { regime: 'none' },
    ice_neptune:        { regime: 'none' },
    diamond_rain_giant: { regime: 'none' },
    ferrum_core:        { regime: 'none' },
    dwarf_planetoid:    { regime: 'none' },
    proto_impact:       { regime: 'none' },
    shattered_core:     { regime: 'none' },
    zen_dunes:          { regime: 'rare_transient', dayColor: [246, 224, 192], spawnChance: 0.14 },
    salt_flats:         { regime: 'none' },
    glass_desert:       { regime: 'none' }
};

function wxResolveFogProfile(arch) {
    const ov = (arch && FOG_ARCH_OVERRIDES[arch.id]) || {};
    const classId = (arch && arch.classId) || 'terrestrial';
    const regimeId = ov.regime || FOG_CLASS_DEFAULTS[classId] || 'moderate_temporal';
    const base = FOG_REGIMES[regimeId] || FOG_REGIMES.moderate_temporal;
    const out = Object.assign({}, base, ov);
    out.regimeId = regimeId;
    return out;
}
