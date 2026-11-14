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
    hollow: 'hollow'
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
        lightning: { rate: 0.45, power: [0.5, 0.85], colors: [[225, 210, 255]], branch: 0.65, ic: 0.5 },
        precip: { kind: 'rain', color: [210, 215, 240], amount: 0.35, evap: 0.2 },
        wind: [6, 20],
        neutral: { lit: [245, 242, 250], shade: [175, 170, 195] },
        exotic: { chance: 0.05, variants: [
            { name: 'Bruma de cristal ancestral', lit: [240, 225, 255], tint: [180, 155, 225] }
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
    dune_arrakis:       { cover: [0.02, 0.18], wind: [22, 55], exotic: { chance: 0.15 } },
    zen_dunes:          { cover: [0.02, 0.15] },
    magma:              { underGlow: 0.45 },
    sulfur_caldera:     { neutral: { lit: [240, 235, 185], shade: [160, 150, 100] } },
    chlorine_storm:     { cover: [0.65, 1.05], storm: { prop: 0.75, int: [0.7, 1.0] }, neutral: { lit: [220, 245, 195], shade: [135, 168, 115] } }
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
