/**
 * ÉTER — Sistema de Colonia Planetaria: Viviendas Modulares (5 Niveles),
 * Almacenamientos de Combustible y Minerales (3 Tipos, Nv.1–Nv.3),
 * Bodega del Cohete y Adaptación Topográfica al Terreno.
 */

const planetaryHouses = [];
const planetaryDepots = [];

// ============================================================================
// 1. CATÁLOGO DE VIVIENDAS (5 NIVELES CON CAPACIDAD Y COSTES ESCALONADOS)
// ============================================================================
const HOUSE_CATALOG = {
    pod_1: {
        id: 'pod_1',
        tier: 1,
        name: 'Cápsula Modular "Refugio-I"',
        shortName: 'Refugio-I',
        code: 'HAB-01',
        capacity: 1,
        width: 46,
        height: 30,
        workSpeedMult: 1.0,
        carryBonus: 0,
        accent: '#38bdf8',
        rgb: [56, 189, 248],
        windowColor: '#fde68a',
        cost: { structural: 10 },
        desc: 'Módulo presurizado compacto para 1 astronauta. Ideal como primer hogar en mundos recién explorados.'
    },
    dome_2: {
        id: 'dome_2',
        tier: 2,
        name: 'Domo Habitable "Vesta-II"',
        shortName: 'Vesta-II',
        code: 'HAB-02',
        capacity: 2,
        width: 70,
        height: 38,
        workSpeedMult: 1.08,
        carryBonus: 4,
        accent: '#fbbf24',
        rgb: [251, 191, 36],
        windowColor: '#fed7aa',
        cost: { structural: 22, catalyst: 6 },
        desc: 'Vivienda abovedada de doble cámara para 2 astronautas, con esclusa lateral, invernadero y paneles solares.'
    },
    villa_2: {
        id: 'villa_2',
        tier: 3,
        name: 'Residencia Geodésica "Atrio-III"',
        shortName: 'Atrio-III',
        code: 'HAB-03',
        capacity: 2,
        width: 92,
        height: 48,
        workSpeedMult: 1.25,
        carryBonus: 8,
        accent: '#34d399',
        rgb: [52, 211, 153],
        windowColor: '#fef08a',
        cost: { structural: 36, catalyst: 16, advanced: 2 },
        desc: 'Residencia de lujo con atrio botánico y terraza panorámica. Sus 2 residentes rinden +25% en logística.'
    },
    family_4: {
        id: 'family_4',
        tier: 4,
        name: 'Casa Familiar "Hogar Orión-IV"',
        shortName: 'Orión-IV',
        code: 'HAB-04',
        capacity: 4,
        width: 122,
        height: 58,
        workSpeedMult: 1.22,
        carryBonus: 10,
        accent: '#f472b6',
        rgb: [244, 114, 182],
        windowColor: '#fde68a',
        cost: { structural: 58, catalyst: 28, advanced: 6 },
        desc: 'Amplia vivienda familiar de dos plantas con porche iluminado y cúpula verde para 4 astronautas.'
    },
    building_8: {
        id: 'building_8',
        tier: 5,
        name: 'Torre Residencial "Éter-V"',
        shortName: 'Torre Éter-V',
        code: 'HAB-05',
        capacity: 8,
        width: 114,
        height: 116,
        workSpeedMult: 1.38,
        carryBonus: 14,
        accent: '#c084fc',
        rgb: [192, 132, 252],
        windowColor: '#fef3c7',
        cost: { structural: 96, catalyst: 46, advanced: 14 },
        desc: 'Edificio colonial de 4 pisos con ascensor exterior, jardín en altura y torre cuántica para 8 astronautas.'
    }
};

const HOUSE_ORDER = ['pod_1', 'dome_2', 'villa_2', 'family_4', 'building_8'];

// ============================================================================
// 2. CATÁLOGO DE ALMACENAMIENTOS Y DEPÓSITOS (3 TIPOS, NV.1–NV.3)
// ============================================================================
const DEPOT_CATALOG = {
    fuel_tank: {
        id: 'fuel_tank',
        name: 'Cisterna Criogénica de Éter',
        shortName: 'Cisterna Éter',
        code: 'DEP-FUEL',
        storesFuel: true,
        storesMinerals: false,
        width: 56,
        height: 42,
        accent: '#fbbf24',
        rgb: [251, 191, 36],
        fuelCapacities: [500, 1200, 2800],
        mineralCapacities: [0, 0, 0],
        cost: { structural: 12, catalyst: 4 },
        upgradeCosts: [null, { structural: 20, catalyst: 10 }, { structural: 36, catalyst: 18, advanced: 4 }],
        desc: 'Depósito presurizado para almacenar Éter Combustible y abastecer cohetes automáticamente.'
    },
    mineral_silo: {
        id: 'mineral_silo',
        name: 'Silo Geológico de Minerales',
        shortName: 'Silo Mineral',
        code: 'DEP-MIN',
        storesFuel: false,
        storesMinerals: true,
        width: 60,
        height: 46,
        accent: '#38bdf8',
        rgb: [56, 189, 248],
        fuelCapacities: [0, 0, 0],
        mineralCapacities: [350, 900, 2200],
        cost: { structural: 14 },
        upgradeCosts: [null, { structural: 24, catalyst: 8 }, { structural: 40, catalyst: 16, advanced: 4 }],
        desc: 'Búnker blindado con contenedores modulares donde los astronautas depositan minerales extraídos.'
    },
    hybrid_hub: {
        id: 'hybrid_hub',
        name: 'Almacén Logístico Orbital',
        shortName: 'Almacén Mixto',
        code: 'DEP-HUB',
        storesFuel: true,
        storesMinerals: true,
        width: 98,
        height: 54,
        accent: '#34d399',
        rgb: [52, 211, 153],
        fuelCapacities: [800, 1800, 3800],
        mineralCapacities: [600, 1400, 3000],
        cost: { structural: 28, catalyst: 14, advanced: 4 },
        upgradeCosts: [null, { structural: 42, catalyst: 22, advanced: 8 }, { structural: 68, catalyst: 34, advanced: 14 }],
        desc: 'Centro dual de alta capacidad para Éter y minerales con grúa robótica y muelle de carga.'
    }
};

const DEPOT_ORDER = ['fuel_tank', 'mineral_silo', 'hybrid_hub'];

// ============================================================================
// 3. BODEGA DEL COHETE Y ECONOMÍA UNIFICADA (TRAJE + COHETE + DEPÓSITOS)
// ============================================================================
function ensureShipCargo(shipObj) {
    if (!shipObj) return {};
    if (!shipObj.cargo || typeof shipObj.cargo !== 'object') shipObj.cargo = {};
    return shipObj.cargo;
}

function getShipCargoCapacity(shipObj) {
    const s = shipObj || (typeof ship !== 'undefined' ? ship : null);
    if (!s) return 100;
    const sc = s.scale || 1.0;
    const passBonus = Math.min(180, (s.passengers || 1) * 5);
    return Math.round(100 * sc + passBonus);
}

function getShipCargoTotal(shipObj) {
    const c = ensureShipCargo(shipObj);
    let sum = 0;
    for (const v of Object.values(c)) sum += Math.max(0, Math.floor(Number(v) || 0));
    return sum;
}

function getDepotMineralTotal(depot) {
    if (!depot || !depot.storedMinerals) return 0;
    let sum = 0;
    for (const v of Object.values(depot.storedMinerals)) sum += Math.max(0, Math.floor(Number(v) || 0));
    return sum;
}

function getDepotFuelCapacity(depot) {
    const def = DEPOT_CATALOG[depot?.typeId];
    if (!def) return 0;
    const lvl = clamp((depot.level || 1) - 1, 0, 2);
    return def.fuelCapacities[lvl] || 0;
}

function getDepotMineralCapacity(depot) {
    const def = DEPOT_CATALOG[depot?.typeId];
    if (!def) return 0;
    const lvl = clamp((depot.level || 1) - 1, 0, 2);
    return def.mineralCapacities[lvl] || 0;
}

function getActiveBuildShipsForPlanet(planetKey) {
    const list = [];
    const checkShip = (s) => {
        if (!s) return;
        if (!planetKey) { list.push(s); return; }
        const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(planetKey) : null;
        if (!p) { list.push(s); return; }
        const dist = Math.hypot(s.x - p.x, s.y - p.y);
        if (dist <= (p.atmoRadius || p.radius * 1.65) + 450) list.push(s);
    };
    if (typeof ship !== 'undefined') checkShip(ship);
    if (typeof parkedShips !== 'undefined' && Array.isArray(parkedShips)) {
        for (const ps of parkedShips) checkShip(ps);
    }
    return list;
}

function getCombinedBuildPool(planetKey) {
    const suitMap = (typeof getInventoryMap === 'function') ? getInventoryMap() : {};
    const rocketMap = {};
    const depotMap = {};
    const totalMap = {};

    const addInto = (target, src) => {
        if (!src || typeof src !== 'object') return;
        for (const [rawId, rawQty] of Object.entries(src)) {
            const q = Math.floor(Number(rawQty) || 0);
            if (q <= 0) continue;
            const id = (typeof resolveResourceId === 'function') ? resolveResourceId(rawId) : rawId;
            target[id] = (target[id] || 0) + q;
            totalMap[id] = (totalMap[id] || 0) + q;
        }
    };

    for (const [rawId, rawQty] of Object.entries(suitMap)) {
        const q = Math.floor(Number(rawQty) || 0);
        if (q <= 0) continue;
        const id = (typeof resolveResourceId === 'function') ? resolveResourceId(rawId) : rawId;
        totalMap[id] = (totalMap[id] || 0) + q;
    }

    const ships = getActiveBuildShipsForPlanet(planetKey);
    for (const s of ships) addInto(rocketMap, s.cargo);

    if (planetKey) {
        for (const d of planetaryDepots) {
            if (d && d.planetKey === planetKey && d.storedMinerals) {
                addInto(depotMap, d.storedMinerals);
            }
        }
    }

    const familyTotals = (typeof getFamilyTotals === 'function')
        ? getFamilyTotals(totalMap)
        : { structural: 0, catalyst: 0, advanced: 0, fuel: 0 };

    return { totalMap, familyTotals, suitMap, rocketMap, depotMap };
}

function canAffordColonyCost(cost, planetKey) {
    if (!cost) return true;
    const pool = getCombinedBuildPool(planetKey);
    for (const [fam, req] of Object.entries(cost)) {
        if ((pool.familyTotals[fam] || 0) < req) return false;
    }
    return true;
}

function spendColonyCost(cost, planetKey) {
    if (!cost) return {};
    if (!canAffordColonyCost(cost, planetKey)) return null;

    const rarityPriority = { 'Común': 1, 'Poco Común': 2, 'Raro': 3, 'Exótico': 4, 'Ancestral': 5 };
    const suitInv = (typeof getInventoryMap === 'function') ? getInventoryMap() : {};
    const ships = getActiveBuildShipsForPlanet(planetKey);
    const localDepots = planetKey ? planetaryDepots.filter(d => d && d.planetKey === planetKey && d.storedMinerals) : [];

    // Construir lista ordenada de fuentes: 1) Traje, 2) Cohetes en el planeta, 3) Depósitos locales
    const sources = [suitInv];
    for (const s of ships) sources.push(ensureShipCargo(s));
    for (const d of localDepots) sources.push(d.storedMinerals);

    const spent = {};

    for (const [fam, reqRaw] of Object.entries(cost)) {
        let remaining = reqRaw;
        if (remaining <= 0) continue;

        for (const src of sources) {
            if (remaining <= 0) break;
            const candidates = Object.keys(src)
                .filter(id => {
                    const n = Math.floor(Number(src[id]) || 0);
                    const def = (typeof getResourceDef === 'function') ? getResourceDef(id) : { family: 'structural' };
                    return n > 0 && def.family === fam;
                })
                .sort((a, b) => {
                    const da = (typeof getResourceDef === 'function') ? getResourceDef(a) : { rarity: 'Común' };
                    const db = (typeof getResourceDef === 'function') ? getResourceDef(b) : { rarity: 'Común' };
                    const pa = (rarityPriority[da.rarity] || 3) + (da.fuelYield ? 0.5 : 0);
                    const pb = (rarityPriority[db.rarity] || 3) + (db.fuelYield ? 0.5 : 0);
                    if (pa !== pb) return pa - pb;
                    return (src[b] || 0) - (src[a] || 0);
                });

            for (const id of candidates) {
                if (remaining <= 0) break;
                const avail = Math.floor(src[id] || 0);
                const take = Math.min(avail, remaining);
                if (take > 0) {
                    src[id] = avail - take;
                    if (src[id] <= 0) delete src[id];
                    const canonId = (typeof resolveResourceId === 'function') ? resolveResourceId(id) : id;
                    spent[canonId] = (spent[canonId] || 0) + take;
                    remaining -= take;
                }
            }
        }
    }

    return spent;
}

function transferMaterialSuitToRocket(resId, count = 1) {
    if (typeof ship === 'undefined' || typeof astronaut === 'undefined') return 0;
    const inv = getInventoryMap();
    const id = resolveResourceId(resId);
    const avail = Math.floor(inv[id] || 0);
    if (avail <= 0) return 0;
    const cap = getShipCargoCapacity(ship);
    const curTotal = getShipCargoTotal(ship);
    const space = Math.max(0, cap - curTotal);
    const move = Math.min(avail, space, Math.max(1, Math.floor(count)));
    if (move <= 0) return 0;

    const cargo = ensureShipCargo(ship);
    inv[id] = avail - move;
    if (inv[id] <= 0) delete inv[id];
    cargo[id] = (cargo[id] || 0) + move;
    sfx('playResourceCollect');
    return move;
}

function transferMaterialRocketToSuit(resId, count = 1) {
    if (typeof ship === 'undefined' || typeof astronaut === 'undefined') return 0;
    const cargo = ensureShipCargo(ship);
    const id = resolveResourceId(resId);
    const avail = Math.floor(cargo[id] || 0);
    if (avail <= 0) return 0;
    const move = Math.min(avail, Math.max(1, Math.floor(count)));
    if (move <= 0) return 0;

    const inv = getInventoryMap();
    cargo[id] = avail - move;
    if (cargo[id] <= 0) delete cargo[id];
    inv[id] = (inv[id] || 0) + move;
    sfx('playResourceCollect');
    return move;
}

function transferAllSuitToRocket() {
    if (typeof ship === 'undefined' || typeof astronaut === 'undefined') return 0;
    const inv = getInventoryMap();
    let moved = 0;
    for (const id of Object.keys(inv)) {
        moved += transferMaterialSuitToRocket(id, inv[id]);
    }
    return moved;
}

function transferAllRocketToSuit() {
    if (typeof ship === 'undefined' || typeof astronaut === 'undefined') return 0;
    const cargo = ensureShipCargo(ship);
    let moved = 0;
    for (const id of Object.keys(cargo)) {
        moved += transferMaterialRocketToSuit(id, cargo[id]);
    }
    return moved;
}

function formatColonyCostBadges(cost, planetKey) {
    if (!cost) return '<span class="text-[9.5px] font-mono-num text-emerald-300">Gratis</span>';
    const pool = getCombinedBuildPool(planetKey);
    const labels = { structural: 'Estructural', catalyst: 'Conductor', advanced: 'Avanzado' };
    const icons = { structural: '🪨', catalyst: '🔋', advanced: '💎' };
    return Object.entries(cost).map(([fam, req]) => {
        const have = pool.familyTotals[fam] || 0;
        const ok = have >= req;
        const cls = ok
            ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/35'
            : 'bg-rose-500/15 text-rose-200 border-rose-400/35';
        return `<span class="px-1.5 py-0.5 rounded-md border text-[9px] font-mono-num ${cls}">${icons[fam] || '◆'} ${have}/${req} ${labels[fam] || fam}</span>`;
    }).join(' ');
}

// ============================================================================
// 4. ADAPTACIÓN TOPOGRÁFICA AL TERRENO Y DETECCIÓN DE COLISIONES
// ============================================================================
function getColonyGroundRadiusAt(planet, angle, inCavern = false, onCeiling = false, islandRef = null) {
    if (!planet) return 0;
    if (islandRef && typeof getFloatingIslandAt === 'function') {
        const isl = getFloatingIslandAt(planet, angle, islandRef.topR || null, true);
        if (isl) return isl.topR;
    }
    if (typeof getCavernOrSurfaceRadius === 'function' && inCavern) {
        return getCavernOrSurfaceRadius(planet, angle, inCavern, onCeiling);
    }
    if (typeof getSurfaceRadius === 'function') {
        return getSurfaceRadius(planet, angle);
    }
    return planet.radius || 1000;
}

/**
 * Calcula una cimentación completamente adaptada a la curvatura y relieve
 * del planeta: orienta suavemente la estructura con la pendiente local y
 * genera pilotes y muro de contención exactos hasta la corteza en cada punto.
 */
function computeTerrainFootprint(planet, angle, width, inCavern = false, onCeiling = false, refR = null) {
    const pRadius = Math.max(400, refR || planet.radius || 1000);
    const halfW = width * 0.5;
    const angularHalfSpan = halfW / pRadius;
    const sampleCount = 19;

    const islHit = (!inCavern && typeof getFloatingIslandAt === 'function')
        ? getFloatingIslandAt(planet, angle, refR, true)
        : null;

    const samples = [];
    let sumR = 0;
    for (let i = 0; i < sampleCount; i++) {
        const u = i / (sampleCount - 1);
        const localX = -halfW + u * width;
        const sAng = angle + localX / pRadius;
        const r = getColonyGroundRadiusAt(planet, sAng, inCavern, onCeiling, islHit);
        samples.push({ localX, sAng, r });
        sumR += r;
    }

    const leftAvgR = (samples[0].r + samples[1].r + samples[2].r) / 3;
    const rightAvgR = (samples[sampleCount - 1].r + samples[sampleCount - 2].r + samples[sampleCount - 3].r) / 3;
    const rawSlope = (rightAvgR - leftAvgR) / Math.max(12, width * 0.85);
    // Inclinación sutil y natural limitada a ±11° para que la estructura acompañe el terreno sin volcarse
    const slopeRad = clamp(Math.atan(rawSlope) * 0.55, -0.19, 0.19);
    const dirSign = onCeiling ? -1 : 1;

    // Elevación mínima para que el suelo de la casa nunca quede enterrado en ninguna loma del tramo
    let deckR = 0;
    if (onCeiling) {
        deckR = Infinity;
        for (const s of samples) {
            const slopeOffset = Math.sin(slopeRad) * s.localX;
            const candidate = (s.r - 2.5) / Math.max(0.92, Math.cos(s.sAng - angle)) + slopeOffset;
            if (candidate < deckR) deckR = candidate;
        }
    } else {
        for (const s of samples) {
            const slopeOffset = Math.tan(slopeRad) * s.localX;
            const projFloorR = (s.r + 2.8) / Math.max(0.92, Math.cos(s.sAng - angle)) - slopeOffset;
            if (projFloorR > deckR) deckR = projFloorR;
        }
    }

    // Calcular caída vertical exacta desde el piso estructural (y=0 local) hasta la superficie real (y>0)
    const profile = samples.map(s => {
        const floorWorldR = (deckR + Math.tan(slopeRad) * s.localX) * Math.max(0.92, Math.cos(s.sAng - angle));
        const drop = onCeiling ? Math.max(2.0, s.r - floorWorldR) : Math.max(2.0, floorWorldR - s.r);
        return {
            x: s.localX,
            drop: clamp(drop, 2.0, 72.0)
        };
    });

    const maxDrop = Math.max(...profile.map(pt => pt.drop));

    return {
        width,
        halfWidth: halfW,
        angularHalfSpan,
        deckR,
        slopeRad: onCeiling ? slopeRad : -slopeRad,
        onIsland: !!islHit,
        maxDrop,
        profile,
        avgGroundR: sumR / samples.length
    };
}

function checkColonyPlacementValid(planet, angle, width, inCavern = false, onCeiling = false, refR = null) {
    if (!planet) return { ok: false, reason: 'Sin planeta cercano' };
    if (planet.archetype && planet.archetype.isLiquid && !inCavern) {
        const isl = (typeof getFloatingIslandAt === 'function') ? getFloatingIslandAt(planet, angle, refR, true) : null;
        if (!isl) return { ok: false, reason: 'No se puede cimentar sobre océano líquido' };
    }
    if (planet.isHollow && !inCavern && typeof getPlanetCaveEntranceAt === 'function') {
        const cave = getPlanetCaveEntranceAt(planet, angle);
        if (cave) return { ok: false, reason: 'Boca de caverna abierta' };
    }

    const r = Math.max(400, refR || planet.radius || 1000);
    const myHalf = width * 0.5;

    for (const h of planetaryHouses) {
        if (!h || h.planetKey !== planet.key || Boolean(h.onCeiling) !== Boolean(onCeiling)) continue;
        const arcDist = Math.abs(Math.atan2(Math.sin(h.angle - angle), Math.cos(h.angle - angle))) * r;
        if (arcDist < myHalf + (h.width || 50) * 0.5 + 8) {
            return { ok: false, reason: `Muy cerca de ${h.name || 'una vivienda'}` };
        }
    }
    for (const d of planetaryDepots) {
        if (!d || d.planetKey !== planet.key || Boolean(d.onCeiling) !== Boolean(onCeiling)) continue;
        const arcDist = Math.abs(Math.atan2(Math.sin(d.angle - angle), Math.cos(d.angle - angle))) * r;
        if (arcDist < myHalf + (d.width || 54) * 0.5 + 8) {
            return { ok: false, reason: `Muy cerca de ${d.name || 'un depósito'}` };
        }
    }
    if (typeof planetaryExtractors !== 'undefined') {
        for (const m of planetaryExtractors) {
            if (!m || m.planetKey !== planet.key || Boolean(m.onCeiling) !== Boolean(onCeiling)) continue;
            const arcDist = Math.abs(Math.atan2(Math.sin(m.angle - angle), Math.cos(m.angle - angle))) * r;
            if (arcDist < myHalf + 22) {
                return { ok: false, reason: `Espacio ocupado por extractor ${m.id}` };
            }
        }
    }
    return { ok: true, reason: '' };
}

// ============================================================================
// 5. CONSTRUCCIÓN, MEJORA Y DEMOLICIÓN DE CASAS Y DEPÓSITOS
// ============================================================================
function isFirstHouseFree(typeId) {
    return planetaryHouses.length === 0 && typeId === 'pod_1';
}

function buildHouseAt(planet, angle, typeId, opts = {}) {
    const def = HOUSE_CATALOG[typeId];
    if (!planet || !def) return null;

    const inCavern = !!opts.inCavern;
    const onCeiling = !!opts.onCeiling;
    const refR = opts.refR || null;

    const valid = checkColonyPlacementValid(planet, angle, def.width, inCavern, onCeiling, refR);
    if (!valid.ok) {
        if (typeof showHoloCard === 'function') showHoloCard(planet, 'TERRENO NO APTO', valid.reason);
        return null;
    }

    const isFreeFirst = isFirstHouseFree(def.id);
    const isFree = !!opts.free || isFreeFirst;
    if (!isFree && !canAffordColonyCost(def.cost, planet.key)) {
        if (typeof showHoloCard === 'function') {
            showHoloCard(planet, 'RECURSOS INSUFICIENTES', `Necesitas más materiales en tu traje, cohete o depósitos para construir ${def.shortName}.`);
        }
        return null;
    }

    const spent = isFree ? {} : spendColonyCost(def.cost, planet.key);
    if (!isFree && !spent) return null;

    const fp = computeTerrainFootprint(planet, angle, def.width, inCavern, onCeiling, refR);
    const house = {
        id: 'HSE-' + (planetaryHouses.length + 1) + '-' + Math.floor(100 + Math.random() * 899),
        typeId: def.id,
        tier: def.tier,
        name: def.name,
        shortName: def.shortName,
        planetKey: planet.key,
        planetName: planet.name,
        angle: wrapAngle(angle),
        inCavern,
        onCeiling,
        onIsland: fp.onIsland,
        width: fp.width,
        halfWidth: fp.halfWidth,
        height: def.height,
        capacity: def.capacity,
        deckR: fp.deckR,
        slopeRad: fp.slopeRad,
        profile: fp.profile,
        maxDrop: fp.maxDrop,
        investedMaterials: spent,
        seed: Math.random() * 100,
        createdAt: Date.now()
    };

    planetaryHouses.push(house);

    // Poblar con los astronautas residentes de esta vivienda
    if (typeof spawnColonistsForHouse === 'function') {
        spawnColonistsForHouse(house, planet);
    }

    const hx = planet.x + Math.cos(house.angle) * house.deckR;
    const hy = planet.y + Math.sin(house.angle) * house.deckR;
    sfx('playBaseComplete');
    if (typeof createShockwave === 'function') {
        createShockwave(hx, hy, 45, 190, `rgba(${def.rgb[0]}, ${def.rgb[1]}, ${def.rgb[2]}, 0.9)`, 'ring');
    }
    if (typeof createSparks === 'function') {
        createSparks(hx, hy, 22, house.angle, Math.PI, 45, 175, def.rgb, 0.55);
    }
    if (typeof showHoloCard === 'function') {
        showHoloCard(
            planet,
            `VIVIENDA CONSTRUIDA — ${def.shortName.toUpperCase()}`,
            `Capacidad para ${def.capacity} astronauta${def.capacity > 1 ? 's' : ''}. Haz clic en la casa o abre Colonia (B) para asignar trabajos.`
        );
    }

    if (typeof autoSaveActiveWorld === 'function') autoSaveActiveWorld(false);
    return house;
}

function buildDepotAt(planet, angle, typeId, opts = {}) {
    const def = DEPOT_CATALOG[typeId];
    if (!planet || !def) return null;

    const inCavern = !!opts.inCavern;
    const onCeiling = !!opts.onCeiling;
    const refR = opts.refR || null;

    const valid = checkColonyPlacementValid(planet, angle, def.width, inCavern, onCeiling, refR);
    if (!valid.ok) {
        if (typeof showHoloCard === 'function') showHoloCard(planet, 'TERRENO NO APTO', valid.reason);
        return null;
    }

    if (!opts.free && !canAffordColonyCost(def.cost, planet.key)) {
        if (typeof showHoloCard === 'function') {
            showHoloCard(planet, 'RECURSOS INSUFICIENTES', `Reúne materiales en tu inventario o cohete para construir ${def.shortName}.`);
        }
        return null;
    }

    const spent = opts.free ? {} : spendColonyCost(def.cost, planet.key);
    if (!opts.free && !spent) return null;

    const fp = computeTerrainFootprint(planet, angle, def.width, inCavern, onCeiling, refR);
    const depot = {
        id: 'DEP-' + (planetaryDepots.length + 1) + '-' + Math.floor(100 + Math.random() * 899),
        typeId: def.id,
        name: def.name,
        shortName: def.shortName,
        planetKey: planet.key,
        planetName: planet.name,
        angle: wrapAngle(angle),
        inCavern,
        onCeiling,
        onIsland: fp.onIsland,
        level: 1,
        width: fp.width,
        halfWidth: fp.halfWidth,
        height: def.height,
        deckR: fp.deckR,
        slopeRad: fp.slopeRad,
        profile: fp.profile,
        maxDrop: fp.maxDrop,
        storedFuel: 0,
        storedMinerals: {},
        investedMaterials: spent,
        seed: Math.random() * 100,
        createdAt: Date.now()
    };

    planetaryDepots.push(depot);

    const dx = planet.x + Math.cos(depot.angle) * depot.deckR;
    const dy = planet.y + Math.sin(depot.angle) * depot.deckR;
    sfx('playBaseComplete');
    if (typeof createShockwave === 'function') {
        createShockwave(dx, dy, 40, 175, `rgba(${def.rgb[0]}, ${def.rgb[1]}, ${def.rgb[2]}, 0.9)`, 'ring');
    }
    if (typeof createSparks === 'function') {
        createSparks(dx, dy, 18, depot.angle, Math.PI, 40, 150, def.rgb, 0.5);
    }
    if (typeof showHoloCard === 'function') {
        showHoloCard(
            planet,
            `ALMACENAMIENTO OPERATIVO — ${def.shortName.toUpperCase()}`,
            'Tus astronautas trabajadores administrarán y llevarán recursos automáticamente hasta aquí.'
        );
    }

    if (typeof autoSaveActiveWorld === 'function') autoSaveActiveWorld(false);
    return depot;
}

function upgradeDepot(depot) {
    if (!depot || depot.level >= 3) return false;
    const def = DEPOT_CATALOG[depot.typeId];
    if (!def) return false;
    const cost = def.upgradeCosts[depot.level];
    if (!cost) return false;

    if (!canAffordColonyCost(cost, depot.planetKey)) {
        const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(depot.planetKey) : null;
        if (p && typeof showHoloCard === 'function') {
            showHoloCard(p, 'RECURSOS INSUFICIENTES', `Faltan materiales para ampliar ${depot.shortName} a Nv.${depot.level + 1}.`);
        }
        return false;
    }

    const spent = spendColonyCost(cost, depot.planetKey);
    if (!spent) return false;

    if (!depot.investedMaterials) depot.investedMaterials = {};
    for (const [id, amt] of Object.entries(spent)) {
        depot.investedMaterials[id] = (depot.investedMaterials[id] || 0) + amt;
    }

    depot.level += 1;
    sfx('playExtractorUpgrade', depot.level);
    const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(depot.planetKey) : null;
    if (p) {
        const dx = p.x + Math.cos(depot.angle) * depot.deckR;
        const dy = p.y + Math.sin(depot.angle) * depot.deckR;
        if (typeof createShockwave === 'function') createShockwave(dx, dy, 45, 190, `rgba(${def.rgb[0]}, ${def.rgb[1]}, ${def.rgb[2]}, 0.9)`, 'ring');
        if (typeof showHoloCard === 'function') {
            showHoloCard(p, `DEPÓSITO AMPLIADO — NV.${depot.level}`, `${depot.shortName} ahora tiene mayor capacidad de almacenamiento.`);
        }
    }
    if (typeof autoSaveActiveWorld === 'function') autoSaveActiveWorld(false);
    return true;
}

function refundInvestedMaterials(invested, factor = 0.85) {
    if (!invested || typeof getInventoryMap !== 'function') return;
    const inv = getInventoryMap();
    for (const [id, qty] of Object.entries(invested)) {
        const back = Math.max(1, Math.round((Number(qty) || 0) * factor));
        if (back > 0) inv[id] = (inv[id] || 0) + back;
    }
}

function demolishHouse(house) {
    if (!house) return false;
    const idx = planetaryHouses.findIndex(h => h && h.id === house.id);
    if (idx === -1) return false;

    refundInvestedMaterials(house.investedMaterials, 0.85);
    planetaryHouses.splice(idx, 1);

    // Remover residentes asociados a la casa
    if (typeof removeColonistsOfHouse === 'function') {
        removeColonistsOfHouse(house.id);
    }

    sfx('playResourceCollect');
    const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(house.planetKey) : null;
    if (p && typeof showHoloCard === 'function') {
        showHoloCard(p, `VIVIENDA DESMANTELADA`, `Materiales recuperados (85%) e incorporados a tu bodega.`);
    }
    if (typeof autoSaveActiveWorld === 'function') autoSaveActiveWorld(false);
    return true;
}

function demolishDepot(depot) {
    if (!depot) return false;
    const idx = planetaryDepots.findIndex(d => d && d.id === depot.id);
    if (idx === -1) return false;

    // Recuperar recursos almacenados al traje del astronauta
    if (typeof astronaut !== 'undefined') {
        if ((depot.storedFuel || 0) > 0 && typeof getFuelReserveCapacity === 'function') {
            astronaut.fuelReserve = Math.min(getFuelReserveCapacity(), (astronaut.fuelReserve || 0) + depot.storedFuel);
        }
        if (depot.storedMinerals && typeof getInventoryMap === 'function') {
            const inv = getInventoryMap();
            for (const [id, q] of Object.entries(depot.storedMinerals)) {
                const whole = Math.floor(Number(q) || 0);
                if (whole > 0) inv[id] = (inv[id] || 0) + whole;
            }
        }
    }
    refundInvestedMaterials(depot.investedMaterials, 0.85);
    planetaryDepots.splice(idx, 1);

    sfx('playResourceCollect');
    const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(depot.planetKey) : null;
    if (p && typeof showHoloCard === 'function') {
        showHoloCard(p, `DEPÓSITO DESMANTELADO`, `Contenido y materiales recuperados en tu inventario.`);
    }
    if (typeof autoSaveActiveWorld === 'function') autoSaveActiveWorld(false);
    return true;
}

// ============================================================================
// 6. OPERACIONES DE DEPÓSITO (COHETE <-> DEPÓSITO <-> ASTRONAUTA)
// ============================================================================
function transferDepotFuelToRocket(depot) {
    if (!depot || (depot.storedFuel || 0) <= 0.05) return 0;
    const target = (typeof getTargetShipForRefuel === 'function') ? getTargetShipForRefuel() : (typeof ship !== 'undefined' ? ship : null);
    if (!target) return 0;
    const maxF = target.maxFuel || 100;
    const need = Math.max(0, maxF - (target.fuel || 0));
    const take = Math.min(need, depot.storedFuel || 0);
    if (take > 0.05) {
        target.fuel = Math.min(maxF, (target.fuel || 0) + take);
        depot.storedFuel = Math.max(0, (depot.storedFuel || 0) - take);
        sfx('playRefuelTransfer');
    }
    return take;
}

function transferDepotFuelToSuit(depot) {
    if (!depot || (depot.storedFuel || 0) <= 0.05 || typeof astronaut === 'undefined') return 0;
    const cap = (typeof getFuelReserveCapacity === 'function') ? getFuelReserveCapacity() : 150;
    const space = Math.max(0, cap - (astronaut.fuelReserve || 0));
    const take = Math.min(space, depot.storedFuel || 0);
    if (take > 0.05) {
        astronaut.fuelReserve = Math.min(cap, (astronaut.fuelReserve || 0) + take);
        depot.storedFuel = Math.max(0, (depot.storedFuel || 0) - take);
        sfx('playResourceCollect');
    }
    return take;
}

function transferSuitFuelToDepot(depot) {
    if (!depot || typeof astronaut === 'undefined') return 0;
    const cap = getDepotFuelCapacity(depot);
    const space = Math.max(0, cap - (depot.storedFuel || 0));
    const avail = Math.max(0, astronaut.fuelReserve || 0);
    const give = Math.min(space, avail);
    if (give > 0.05) {
        depot.storedFuel = Math.min(cap, (depot.storedFuel || 0) + give);
        astronaut.fuelReserve = Math.max(0, avail - give);
        sfx('playResourceCollect');
    }
    return give;
}

function transferDepotMineralsToSuit(depot) {
    if (!depot || !depot.storedMinerals || typeof getInventoryMap !== 'function') return 0;
    const inv = getInventoryMap();
    let moved = 0;
    for (const [id, rawAmt] of Object.entries(depot.storedMinerals)) {
        const whole = Math.floor(Number(rawAmt) || 0);
        if (whole > 0) {
            inv[id] = (inv[id] || 0) + whole;
            depot.storedMinerals[id] = rawAmt - whole;
            if (depot.storedMinerals[id] <= 0.01) delete depot.storedMinerals[id];
            moved += whole;
        }
    }
    if (moved > 0) sfx('playResourceCollect');
    return moved;
}

function transferSuitMineralsToDepot(depot) {
    if (!depot || typeof getInventoryMap !== 'function') return 0;
    const cap = getDepotMineralCapacity(depot);
    let free = Math.max(0, cap - getDepotMineralTotal(depot));
    if (free <= 0) return 0;
    const inv = getInventoryMap();
    if (!depot.storedMinerals) depot.storedMinerals = {};
    let moved = 0;
    for (const [id, rawAmt] of Object.entries(inv)) {
        if (free <= 0) break;
        const whole = Math.floor(Number(rawAmt) || 0);
        const take = Math.min(whole, free);
        if (take > 0) {
            inv[id] = whole - take;
            if (inv[id] <= 0) delete inv[id];
            depot.storedMinerals[id] = (depot.storedMinerals[id] || 0) + take;
            free -= take;
            moved += take;
        }
    }
    if (moved > 0) sfx('playResourceCollect');
    return moved;
}

// ============================================================================
// 7. RENDERIZADO PROCEDURAL DE CIMENTACIÓN Y ARQUITECTURA DE CASAS Y DEPÓSITOS
// ============================================================================
function drawTerrainFoundation(c, struct, localNight, accentHex) {
    const hw = struct.halfWidth || (struct.width * 0.5);
    const prof = struct.profile;

    // 1. Muro de contención adaptado exactamente a la curva/relieve de la superficie
    const plinthGrad = c.createLinearGradient(0, -1, 0, Math.min(48, struct.maxDrop || 14));
    plinthGrad.addColorStop(0, localNight > 0.55 ? '#1e293b' : '#475569');
    plinthGrad.addColorStop(0.5, localNight > 0.55 ? '#0f172a' : '#334155');
    plinthGrad.addColorStop(1, '#090d16');

    c.fillStyle = plinthGrad;
    c.strokeStyle = localNight > 0.55 ? '#334155' : '#64748b';
    c.lineWidth = 0.9;

    c.beginPath();
    c.moveTo(-hw + 1, 0);
    c.lineTo(hw - 1, 0);
    if (Array.isArray(prof) && prof.length > 2) {
        for (let i = prof.length - 1; i >= 0; i--) {
            c.lineTo(prof[i].x, prof[i].drop + 2.5);
        }
    } else {
        c.lineTo(hw - 1, 10);
        c.lineTo(-hw + 1, 10);
    }
    c.closePath();
    c.fill();
    c.stroke();

    // 2. Pilotes hidráulicos anclados al terreno
    if (Array.isArray(prof) && prof.length >= 5) {
        const legIndices = [1, Math.floor(prof.length * 0.33), Math.floor(prof.length * 0.66), prof.length - 2];
        c.strokeStyle = localNight > 0.55 ? '#475569' : '#94a3b8';
        c.lineWidth = 1.6;
        for (const li of legIndices) {
            const pt = prof[li];
            if (!pt) continue;
            c.beginPath();
            c.moveTo(pt.x, 0.5);
            c.lineTo(pt.x, pt.drop + 1.5);
            c.stroke();
            c.fillStyle = '#0f172a';
            c.fillRect(pt.x - 2.6, pt.drop - 0.5, 5.2, 2.4);
        }
    }

    // 3. Cubierta nivelada superior (Deck) con ribete luminoso
    c.fillStyle = localNight > 0.55 ? '#1e293b' : '#334155';
    c.strokeStyle = accentHex || '#38bdf8';
    c.lineWidth = 0.8;
    c.beginPath();
    safeRoundRect(c, -hw - 1, -2.8, hw * 2 + 2, 3.6, 1.4);
    c.fill();
    c.stroke();

    // 4. Rampa de acceso lateral izquierda o derecha hasta el suelo
    if (Array.isArray(prof) && prof.length > 2) {
        const rightDrop = prof[prof.length - 1].drop;
        c.strokeStyle = localNight > 0.55 ? '#475569' : '#cbd5e1';
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(hw - 4, -2.5);
        c.lineTo(hw + 7, rightDrop + 1.5);
        c.stroke();
    }
}

function drawHouseArchitecture(c, def, house, timeSec, localNight, residentsInsideCount = 0) {
    const hw = def.width * 0.5;
    const bodyDay0 = localNight > 0.5 ? '#334155' : '#f1f5f9';
    const bodyDay1 = localNight > 0.5 ? '#1e293b' : '#cbd5e1';
    const trimCol = localNight > 0.5 ? '#475569' : '#64748b';
    const darkMetal = localNight > 0.5 ? '#0f172a' : '#334155';

    const winGlowAlpha = clamp(0.42 + localNight * 0.52 + (residentsInsideCount > 0 ? 0.14 : 0), 0.35, 1.0);
    const drawLitWindow = (wx, wy, ww, wh, r = 2, tint = def.windowColor || '#fde68a') => {
        c.save();
        const wg = c.createLinearGradient(wx, wy, wx, wy + wh);
        wg.addColorStop(0, '#fffbeb');
        wg.addColorStop(0.55, tint);
        wg.addColorStop(1, '#f59e0b');
        c.globalAlpha = winGlowAlpha;
        c.fillStyle = wg;
        c.beginPath();
        safeRoundRect(c, wx, wy, ww, wh, r);
        c.fill();
        c.globalAlpha = 1;
        c.strokeStyle = darkMetal;
        c.lineWidth = 0.8;
        c.stroke();

        // Halo cálido exterior nocturno
        if (localNight > 0.25) {
            c.globalCompositeOperation = 'lighter';
            const glowR = Math.max(ww, wh) * 1.45;
            const g = c.createRadialGradient(wx + ww * 0.5, wy + wh * 0.5, 1, wx + ww * 0.5, wy + wh * 0.5, glowR);
            g.addColorStop(0, `rgba(253, 230, 138, ${(localNight * 0.32).toFixed(3)})`);
            g.addColorStop(1, 'rgba(253, 230, 138, 0)');
            c.fillStyle = g;
            c.beginPath();
            c.arc(wx + ww * 0.5, wy + wh * 0.5, glowR, 0, Math.PI * 2);
            c.fill();
        }
        c.restore();
    };

    const drawAirlockDoor = (dx, dy, dw, dh) => {
        c.fillStyle = '#0f172a';
        c.strokeStyle = trimCol;
        c.lineWidth = 1.0;
        c.beginPath();
        safeRoundRect(c, dx, dy, dw, dh, 2);
        c.fill();
        c.stroke();

        // Visor vertical de esclusa + luz verde de acceso
        c.fillStyle = 'rgba(56, 189, 248, 0.75)';
        c.fillRect(dx + dw * 0.35, dy + 2.5, dw * 0.3, dh * 0.35);
        c.fillStyle = '#34d399';
        c.beginPath();
        c.arc(dx + dw + 1.8, dy + 3, 1.0, 0, Math.PI * 2);
        c.fill();
    };

    const gBody = c.createLinearGradient(-hw, -def.height, hw, 0);
    gBody.addColorStop(0, bodyDay0);
    gBody.addColorStop(1, bodyDay1);

    if (def.id === 'pod_1') {
        // --- TIER 1: CÁPSULA MODULAR REFUGIO-I (1 ASTRONAUTA) ---
        c.fillStyle = gBody;
        c.strokeStyle = trimCol;
        c.lineWidth = 1.1;
        c.beginPath();
        c.moveTo(-18, -2.5);
        c.lineTo(-15, -18);
        c.quadraticCurveTo(0, -24, 15, -18);
        c.lineTo(18, -2.5);
        c.closePath();
        c.fill();
        c.stroke();

        // Franja de identidad cian
        c.fillStyle = def.accent;
        c.fillRect(-14, -9, 28, 2.2);

        // Esclusa derecha + ojo de buey luminoso
        drawAirlockDoor(6, -15, 7.5, 12.5);
        drawLitWindow(-11.5, -16.5, 10, 6.5, 3);

        // Ala solar en el techo + antena
        c.fillStyle = '#0c4a6e';
        c.strokeStyle = '#38bdf8';
        c.lineWidth = 0.8;
        c.fillRect(-13, -24.5, 14, 3);
        c.strokeRect(-13, -24.5, 14, 3);
        c.strokeStyle = '#cbd5e1';
        c.beginPath();
        c.moveTo(8, -20.5); c.lineTo(8, -29);
        c.stroke();
        const pulse = Math.sin(timeSec * 4 + (house.seed || 0)) > 0.2;
        c.fillStyle = pulse ? '#38bdf8' : '#0c4a6e';
        c.beginPath();
        c.arc(8, -29.5, 1.3, 0, Math.PI * 2);
        c.fill();
    } else if (def.id === 'dome_2') {
        // --- TIER 2: DOMO HABITABLE VESTA-II (2 ASTRONAUTAS) ---
        // Bóveda geodésica central
        c.fillStyle = gBody;
        c.strokeStyle = trimCol;
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(-30, -2.5);
        c.lineTo(-30, -14);
        c.bezierCurveTo(-28, -32, 16, -34, 22, -16);
        c.lineTo(30, -16);
        c.lineTo(30, -2.5);
        c.closePath();
        c.fill();
        c.stroke();

        // Costillas estructurales de la cúpula
        c.strokeStyle = 'rgba(100, 116, 139, 0.45)';
        c.lineWidth = 0.9;
        for (const rx of [-16, -4, 8]) {
            c.beginPath();
            c.moveTo(rx, -2.5);
            c.quadraticCurveTo(rx * 0.7, -26, rx * 0.4, -27.5);
            c.stroke();
        }

        // Banda solar ámbar
        c.fillStyle = '#f59e0b';
        c.fillRect(-28, -7, 46, 2);

        // Ventanales curvos cálidos + esclusa derecha
        drawLitWindow(-24, -18.5, 14, 8, 3);
        drawLitWindow(-7, -19.5, 14, 9, 3);
        drawAirlockDoor(18, -15, 8.5, 12.5);

        // Paneles solares inclinados + condensador superior
        c.fillStyle = '#1e293b';
        c.fillRect(-10, -32, 12, 4);
        c.fillStyle = '#0c4a6e';
        c.strokeStyle = '#38bdf8';
        c.lineWidth = 0.8;
        c.fillRect(-24, -29, 12, 3);
        c.strokeRect(-24, -29, 12, 3);
    } else if (def.id === 'villa_2') {
        // --- TIER 3: RESIDENCIA GEODÉSICA ATRIO-III (2 ESPECIALISTAS) ---
        // Cuerpo principal escalonado + atrio botánico izquierdo
        c.fillStyle = gBody;
        c.strokeStyle = trimCol;
        c.lineWidth = 1.2;
        c.beginPath();
        safeRoundRect(c, -22, -32, 62, 29.5, 4);
        c.fill();
        c.stroke();

        // Segundo nivel retranqueado con terraza panorámica
        c.fillStyle = darkMetal;
        c.fillRect(-24, -20, 66, 2.5);

        // Invernadero lateral de vidrio (Atrio botánico)
        c.fillStyle = 'rgba(16, 185, 129, 0.22)';
        c.strokeStyle = '#34d399';
        c.lineWidth = 1.0;
        c.beginPath();
        c.moveTo(-42, -2.5);
        c.lineTo(-42, -16);
        c.quadraticCurveTo(-33, -24, -22, -19);
        c.lineTo(-22, -2.5);
        c.closePath();
        c.fill();
        c.stroke();

        // Pequeñas plantas iluminadas dentro del atrio
        c.fillStyle = '#34d399';
        for (const px of [-36, -31, -26]) {
            c.beginPath();
            c.arc(px, -6.5, 3.2, 0, Math.PI * 2);
            c.fill();
        }

        // Ventanas de ambos pisos y esclusa
        drawLitWindow(-16, -28.5, 20, 7, 2);
        drawLitWindow(8, -28.5, 18, 7, 2);
        drawLitWindow(-16, -15.5, 22, 9, 2.5);
        drawAirlockDoor(26, -15.5, 9, 13);

        // Pérgola solar y antena parabólica
        c.fillStyle = '#0c4a6e';
        c.strokeStyle = '#34d399';
        c.lineWidth = 0.8;
        c.fillRect(-18, -36.5, 44, 3);
        c.strokeRect(-18, -36.5, 44, 3);

        c.strokeStyle = '#cbd5e1';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(31, -32); c.lineTo(31, -43);
        c.stroke();
        c.beginPath();
        c.arc(31, -44, 4.5, Math.PI * 0.2, Math.PI * 1.1);
        c.stroke();
    } else if (def.id === 'family_4') {
        // --- TIER 4: CASA FAMILIAR HOGAR ORIÓN-IV (4 ASTRONAUTAS) ---
        // Ala izquierda y derecha + cuerpo central de dos plantas
        c.fillStyle = gBody;
        c.strokeStyle = trimCol;
        c.lineWidth = 1.2;

        // Alas laterales
        c.beginPath();
        safeRoundRect(c, -56, -24, 112, 21.5, 3);
        c.fill();
        c.stroke();

        // Cuerpo superior abovedado
        c.beginPath();
        c.moveTo(-36, -24);
        c.lineTo(-30, -44);
        c.quadraticCurveTo(0, -52, 30, -44);
        c.lineTo(36, -24);
        c.closePath();
        c.fill();
        c.stroke();

        // Franja arquitectónica rosa/ámbar
        c.fillStyle = def.accent;
        c.fillRect(-54, -25.5, 108, 2.2);

        // Ventanas familiares cálidas (planta baja y planta alta)
        drawLitWindow(-49, -18, 16, 10, 2.5);
        drawLitWindow(-28, -18, 18, 10, 2.5);
        drawLitWindow(-5, -18, 18, 10, 2.5);
        drawLitWindow(-22, -39, 18, 9, 2.5);
        drawLitWindow(4, -39, 18, 9, 2.5);

        // Porche con marquesina y esclusa amplia
        c.fillStyle = darkMetal;
        c.fillRect(18, -19, 32, 2.5);
        drawAirlockDoor(36, -16.5, 10, 14);

        // Farol cálido del porche
        c.fillStyle = '#fde68a';
        c.beginPath();
        c.arc(32, -16, 1.7, 0, Math.PI * 2);
        c.fill();

        // Cúpula invernadero en azotea + micro-turbina eólica giratoria
        c.fillStyle = 'rgba(52, 211, 153, 0.25)';
        c.strokeStyle = '#34d399';
        c.lineWidth = 1.0;
        c.beginPath();
        c.arc(0, -47, 11, Math.PI, 0);
        c.closePath();
        c.fill();
        c.stroke();

        // Turbina eólica izquierda
        const turbX = -46;
        c.strokeStyle = '#cbd5e1';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(turbX, -24); c.lineTo(turbX, -42);
        c.stroke();
        c.save();
        c.translate(turbX, -42);
        c.rotate(timeSec * 3.8 + (house.seed || 0));
        c.strokeStyle = '#f8fafc';
        c.lineWidth = 1.3;
        for (let b = 0; b < 3; b++) {
            const ba = (b * Math.PI * 2) / 3;
            c.beginPath();
            c.moveTo(0, 0);
            c.lineTo(Math.cos(ba) * 6.5, Math.sin(ba) * 6.5);
            c.stroke();
        }
        c.restore();
    } else {
        // --- TIER 5: TORRE RESIDENCIAL ÉTER-V (8 ASTRONAUTAS) ---
        // Podio base amplio
        c.fillStyle = darkMetal;
        c.strokeStyle = trimCol;
        c.lineWidth = 1.2;
        c.beginPath();
        safeRoundRect(c, -52, -20, 104, 17.5, 3);
        c.fill();
        c.stroke();

        // Cuerpo principal de 4 niveles (torre escalonada)
        const towerGrad = c.createLinearGradient(-42, -96, 42, -20);
        towerGrad.addColorStop(0, localNight > 0.5 ? '#1e293b' : '#f8fafc');
        towerGrad.addColorStop(1, localNight > 0.5 ? '#0f172a' : '#cbd5e1');
        c.fillStyle = towerGrad;
        c.beginPath();
        safeRoundRect(c, -40, -92, 80, 72, 4);
        c.fill();
        c.stroke();

        // Exoesqueleto violeta/titanio y cornisas entre pisos
        c.fillStyle = def.accent;
        for (const fy of [-38, -56, -74, -92]) {
            c.fillRect(-41, fy, 82, 2.2);
        }

        // Núcleo de ascensor panorámico acristalado en el centro-izquierda
        c.fillStyle = 'rgba(15, 23, 42, 0.85)';
        c.strokeStyle = '#38bdf8';
        c.lineWidth = 0.9;
        c.fillRect(-8, -90, 11, 70);
        c.strokeRect(-8, -90, 11, 70);
        // Cabina del ascensor subiendo y bajando suavemente
        const elevY = -30 - (0.5 + 0.5 * Math.sin(timeSec * 0.75 + (house.seed || 0))) * 52;
        c.fillStyle = '#fde68a';
        c.fillRect(-6, elevY, 7, 5);

        // Ventanas iluminadas de apartamentos (4 pisos x 2 alas)
        const floors = [-34, -52, -70, -88];
        for (let fi = 0; fi < floors.length; fi++) {
            const wy = floors[fi];
            drawLitWindow(-34, wy, 20, 9, 2);
            drawLitWindow(9, wy, 24, 9, 2);
        }

        // Terraza jardín en el nivel 3 (lateral derecho)
        c.fillStyle = 'rgba(52, 211, 153, 0.25)';
        c.strokeStyle = '#34d399';
        c.lineWidth = 1.0;
        c.fillRect(40, -56, 14, 18);
        c.strokeRect(40, -56, 14, 18);
        c.fillStyle = '#34d399';
        c.beginPath();
        c.arc(47, -42, 3.5, 0, Math.PI * 2);
        c.fill();

        // Lobby y gran esclusa en el podio inferior
        drawLitWindow(-44, -15, 28, 9, 2, '#bae6fd');
        drawAirlockDoor(24, -17, 12, 14.5);

        // Corona superior + espiras cuánticas y baliza
        c.fillStyle = '#1e293b';
        c.beginPath();
        c.moveTo(-26, -92);
        c.lineTo(-18, -104);
        c.lineTo(18, -104);
        c.lineTo(26, -92);
        c.closePath();
        c.fill();
        c.stroke();

        c.strokeStyle = '#e2e8f0';
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(0, -104); c.lineTo(0, -118);
        c.stroke();
        const topStrobe = Math.sin(timeSec * 5 + (house.seed || 0)) > 0;
        c.fillStyle = topStrobe ? '#c084fc' : '#4c1d95';
        c.beginPath();
        c.arc(0, -119, 2.0, 0, Math.PI * 2);
        c.fill();
    }
}

function drawDepotArchitecture(c, def, depot, timeSec, localNight) {
    const lvl = depot.level || 1;
    const fuelCap = Math.max(1, getDepotFuelCapacity(depot));
    const minCap = Math.max(1, getDepotMineralCapacity(depot));
    const fuelPct = clamp((depot.storedFuel || 0) / fuelCap, 0, 1);
    const minPct = clamp(getDepotMineralTotal(depot) / minCap, 0, 1);

    const metal0 = localNight > 0.5 ? '#334155' : '#94a3b8';
    const metal1 = localNight > 0.5 ? '#1e293b' : '#475569';
    const dark = '#0f172a';

    if (def.id === 'fuel_tank') {
        // --- CISTERNA CRIOGÉNICA DE ÉTER ---
        // Cuna metálica
        c.fillStyle = dark;
        c.fillRect(-23, -8, 46, 5.5);

        const tankCount = lvl >= 3 ? 3 : 2;
        const span = tankCount === 3 ? 15 : 13;
        for (let t = 0; t < tankCount; t++) {
            const tx = tankCount === 3 ? (t - 1) * span : (t === 0 ? -11 : 11);
            const r = lvl >= 2 ? 9.5 : 8.2;
            const cy = -18 - (lvl - 1) * 1.5;

            // Esfera presurizada
            const sg = c.createRadialGradient(tx - 3, cy - 3, 1, tx, cy, r * 1.2);
            sg.addColorStop(0, localNight > 0.5 ? '#475569' : '#f1f5f9');
            sg.addColorStop(1, metal1);
            c.fillStyle = sg;
            c.strokeStyle = '#fbbf24';
            c.lineWidth = 1.0;
            c.beginPath();
            c.arc(tx, cy, r, 0, Math.PI * 2);
            c.fill();
            c.stroke();

            // Mirilla vertical con nivel líquido de Éter
            c.fillStyle = '#090d16';
            c.fillRect(tx - 2.6, cy - r * 0.65, 5.2, r * 1.3);
            if (fuelPct > 0.01) {
                const fh = Math.max(1.5, r * 1.2 * fuelPct);
                c.fillStyle = '#fbbf24';
                c.fillRect(tx - 2, cy + r * 0.6 - fh, 4, fh);
            }
            c.strokeStyle = '#64748b';
            c.lineWidth = 0.7;
            c.strokeRect(tx - 2.6, cy - r * 0.65, 5.2, r * 1.3);
        }

        // Tubería superior y válvula
        c.strokeStyle = '#cbd5e1';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(-16, -28); c.lineTo(16, -28);
        c.stroke();
        c.fillStyle = '#fbbf24';
        c.beginPath();
        c.arc(0, -34, 1.6, 0, Math.PI * 2);
        c.fill();
    } else if (def.id === 'mineral_silo') {
        // --- SILO GEOLÓGICO DE MINERALES ---
        const h = 28 + (lvl - 1) * 5;
        const g = c.createLinearGradient(-24, -h, 24, 0);
        g.addColorStop(0, metal0);
        g.addColorStop(1, metal1);
        c.fillStyle = g;
        c.strokeStyle = '#38bdf8';
        c.lineWidth = 1.1;
        c.beginPath();
        c.moveTo(-25, -2.5);
        c.lineTo(-22, -h);
        c.lineTo(22, -h);
        c.lineTo(25, -2.5);
        c.closePath();
        c.fill();
        c.stroke();

        // Puerta de bahía con barra de llenado mineral
        c.fillStyle = '#090d16';
        c.fillRect(-16, -h + 7, 32, h - 12);
        if (minPct > 0.01) {
            const mh = Math.max(2, (h - 14) * minPct);
            const mg = c.createLinearGradient(0, -5 - mh, 0, -5);
            mg.addColorStop(0, '#38bdf8');
            mg.addColorStop(1, '#0284c7');
            c.fillStyle = mg;
            c.fillRect(-14, -5 - mh, 28, mh);
        }
        c.strokeStyle = '#475569';
        c.lineWidth = 0.9;
        c.strokeRect(-16, -h + 7, 32, h - 12);

        // Grúa puente superior
        c.fillStyle = '#f59e0b';
        c.fillRect(-18, -h - 3.5, 36, 3);
    } else {
        // --- ALMACÉN LOGÍSTICO MIXTO ---
        const h = 34 + (lvl - 1) * 5;
        // Hangar izquierdo (Minerales)
        c.fillStyle = metal1;
        c.strokeStyle = '#34d399';
        c.lineWidth = 1.1;
        c.beginPath();
        safeRoundRect(c, -44, -h, 52, h - 2.5, 3);
        c.fill();
        c.stroke();

        // Bahía mineral
        c.fillStyle = '#090d16';
        c.fillRect(-38, -h + 8, 40, h - 14);
        if (minPct > 0.01) {
            const mh = Math.max(2, (h - 16) * minPct);
            c.fillStyle = '#38bdf8';
            c.fillRect(-36, -6 - mh, 36, mh);
        }

        // Esfera derecha (Éter Combustible)
        const cy = -21;
        const r = 14 + (lvl - 1) * 1.5;
        c.fillStyle = metal0;
        c.strokeStyle = '#fbbf24';
        c.lineWidth = 1.1;
        c.beginPath();
        c.arc(27, cy, r, 0, Math.PI * 2);
        c.fill();
        c.stroke();

        c.fillStyle = '#090d16';
        c.fillRect(23.5, cy - r * 0.65, 7, r * 1.3);
        if (fuelPct > 0.01) {
            const fh = Math.max(2, r * 1.2 * fuelPct);
            c.fillStyle = '#fbbf24';
            c.fillRect(24.5, cy + r * 0.6 - fh, 5, fh);
        }

        // Antena logística central
        c.strokeStyle = '#e2e8f0';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(-4, -h); c.lineTo(-4, -h - 11);
        c.stroke();
        const strobe = Math.sin(timeSec * 4.5 + (depot.seed || 0)) > 0;
        c.fillStyle = strobe ? '#34d399' : '#065f46';
        c.beginPath();
        c.arc(-4, -h - 12, 1.8, 0, Math.PI * 2);
        c.fill();
    }
}

function getStructureLocalNight(planet, angle, wx, wy, height, timeSec) {
    const solar = (planet && planet.atmoRadius && typeof getPlanetSolarState === 'function')
        ? (planet.currentSolarState || getPlanetSolarState(planet, wx, wy, timeSec))
        : null;
    const rawNight = solar ? clamp(solar.nightFactor, 0, 1) : 0;
    const stormInfo = (planet && typeof ship !== 'undefined' && planet === ship.nearestPlanet && typeof getLocalStormDarkness === 'function')
        ? getLocalStormDarkness(planet)
        : null;
    const stormDark = stormInfo ? (stormInfo.worldDark || 0) : 0;
    const rawEffNight = clamp(1 - (1 - rawNight) * (1 - stormDark * 0.88), 0, 1);
    const lightSample = (typeof LightingEngine !== 'undefined') ? LightingEngine.samplePoint(wx, wy, height * 0.8) : null;
    const boost = lightSample ? clamp(lightSample.illum * 1.15, 0, 1) : 0;
    return clamp(rawEffNight * (1 - boost * 0.9), 0, 1);
}

function drawColonyBuildings(timeSec) {
    if ((!planetaryHouses.length && !planetaryDepots.length) || typeof ctx === 'undefined') return;
    const nearby = (typeof getNearbyPlanets === 'function') ? getNearbyPlanets(camera.x, camera.y, 1) : [];
    if (!nearby.length) return;

    const nearbyMap = new Map();
    for (const p of nearby) nearbyMap.set(p.key, p);

    // 1. Renderizar Depósitos de Almacenamiento
    for (let i = 0; i < planetaryDepots.length; i++) {
        const d = planetaryDepots[i];
        const p = nearbyMap.get(d.planetKey);
        if (!p) continue;
        const def = DEPOT_CATALOG[d.typeId];
        if (!def) continue;

        const wx = p.x + Math.cos(d.angle) * d.deckR;
        const wy = p.y + Math.sin(d.angle) * d.deckR;
        if (Math.hypot(wx - camera.x, wy - camera.y) > 4500) continue;

        const localNight = getStructureLocalNight(p, d.angle, wx, wy, d.height, timeSec);
        const isSel = ColonyBuildings.selectedRef && ColonyBuildings.selectedRef.kind === 'depot' && ColonyBuildings.selectedRef.id === d.id;
        const isHov = ColonyBuildings.hoveredRef && ColonyBuildings.hoveredRef.kind === 'depot' && ColonyBuildings.hoveredRef.id === d.id;

        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(d.angle + (d.onCeiling ? -Math.PI * 0.5 : Math.PI * 0.5) + (d.slopeRad || 0));

        if (isSel || isHov) {
            ctx.save();
            ctx.strokeStyle = isSel ? '#38bdf8' : '#fbbf24';
            ctx.lineWidth = 1.4;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(-d.halfWidth - 4, -d.height - 6, d.width + 8, d.height + (d.maxDrop || 12) + 8);
            ctx.restore();
        }

        drawTerrainFoundation(ctx, d, localNight, def.accent);
        drawDepotArchitecture(ctx, def, d, timeSec, localNight);

        // Etiqueta compacta al acercarse o pasar cursor
        if (isSel || isHov || Math.hypot(wx - camera.x, wy - camera.y) < 380) {
            ctx.save();
            ctx.translate(0, -d.height - 14);
            const parts = [];
            if (def.storesFuel) parts.push(`${Math.round(d.storedFuel || 0)}/${getDepotFuelCapacity(d)}L`);
            if (def.storesMinerals) parts.push(`${getDepotMineralTotal(d)}/${getDepotMineralCapacity(d)}u`);
            const tag = `${def.shortName} · ${parts.join(' | ')}`;
            ctx.font = 'bold 7px JetBrains Mono, monospace';
            const tw = Math.max(54, ctx.measureText(tag).width + 10);
            ctx.fillStyle = 'rgba(6, 10, 20, 0.88)';
            ctx.strokeStyle = def.accent;
            ctx.lineWidth = 0.85;
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

    // 2. Renderizar Casas / Viviendas
    for (let i = 0; i < planetaryHouses.length; i++) {
        const h = planetaryHouses[i];
        const p = nearbyMap.get(h.planetKey);
        if (!p) continue;
        const def = HOUSE_CATALOG[h.typeId];
        if (!def) continue;

        const wx = p.x + Math.cos(h.angle) * h.deckR;
        const wy = p.y + Math.sin(h.angle) * h.deckR;
        const dCam = Math.hypot(wx - camera.x, wy - camera.y);
        if (dCam > 4500) continue;

        const localNight = getStructureLocalNight(p, h.angle, wx, wy, h.height, timeSec);
        const isSel = ColonyBuildings.selectedRef && ColonyBuildings.selectedRef.kind === 'house' && ColonyBuildings.selectedRef.id === h.id;
        const isHov = ColonyBuildings.hoveredRef && ColonyBuildings.hoveredRef.kind === 'house' && ColonyBuildings.hoveredRef.id === h.id;

        let insideCount = 0;
        if (typeof planetaryColonists !== 'undefined') {
            for (const c of planetaryColonists) {
                if (c && c.homeHouseId === h.id && c.aiState === 'AT_HOME') insideCount++;
            }
        }

        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(h.angle + (h.onCeiling ? -Math.PI * 0.5 : Math.PI * 0.5) + (h.slopeRad || 0));

        if (isSel || isHov) {
            ctx.save();
            ctx.strokeStyle = isSel ? '#38bdf8' : '#fbbf24';
            ctx.lineWidth = 1.4;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(-h.halfWidth - 4, -h.height - 6, h.width + 8, h.height + (h.maxDrop || 12) + 8);
            ctx.restore();
        }

        drawTerrainFoundation(ctx, h, localNight, def.accent);
        drawHouseArchitecture(ctx, def, h, timeSec, localNight, insideCount);

        if (isSel || isHov || dCam < 380) {
            ctx.save();
            ctx.translate(0, -h.height - 14);
            const residents = (typeof planetaryColonists !== 'undefined')
                ? planetaryColonists.filter(c => c && c.homeHouseId === h.id).length
                : h.capacity;
            const tag = `${def.shortName} · ${residents} 👨‍🚀${insideCount > 0 ? ` (${insideCount} dentro)` : ''}`;
            ctx.font = 'bold 7px JetBrains Mono, monospace';
            const tw = Math.max(58, ctx.measureText(tag).width + 10);
            ctx.fillStyle = 'rgba(6, 10, 20, 0.88)';
            ctx.strokeStyle = def.accent;
            ctx.lineWidth = 0.85;
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

function renderColonyPreviewCanvas(canvas, kind, typeId, timeSec = 0) {
    if (!canvas) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    const w = canvas.width;
    const h = canvas.height;
    c.clearRect(0, 0, w, h);

    // Cielo sutil nocturno/estelar
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#040814');
    bg.addColorStop(0.75, '#0b1428');
    bg.addColorStop(1, '#1e293b');
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);

    // Suelo de vista previa
    c.fillStyle = '#1e293b';
    c.fillRect(0, h - 14, w, 14);
    c.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    c.beginPath();
    c.moveTo(0, h - 14); c.lineTo(w, h - 14);
    c.stroke();

    const def = (kind === 'house') ? HOUSE_CATALOG[typeId] : DEPOT_CATALOG[typeId];
    if (!def) return;

    const maxScaleW = (w - 22) / Math.max(40, def.width);
    const maxScaleH = (h - 24) / Math.max(30, def.height);
    const sc = Math.min(1.15, maxScaleW, maxScaleH);

    c.save();
    c.translate(w * 0.5, h - 15);
    c.scale(sc, sc);

    const mockStruct = {
        width: def.width,
        halfWidth: def.width * 0.5,
        maxDrop: 7,
        profile: [
            { x: -def.width * 0.5, drop: 5 },
            { x: -def.width * 0.25, drop: 5 },
            { x: 0, drop: 5 },
            { x: def.width * 0.25, drop: 5 },
            { x: def.width * 0.5, drop: 5 }
        ],
        seed: 1.5,
        level: 1,
        storedFuel: kind === 'depot' ? def.fuelCapacities[0] * 0.65 : 0,
        storedMinerals: kind === 'depot' ? { ferrite: Math.round((def.mineralCapacities[0] || 0) * 0.6) } : {}
    };

    drawTerrainFoundation(c, mockStruct, 0.35, def.accent);
    if (kind === 'house') {
        drawHouseArchitecture(c, def, mockStruct, timeSec, 0.35, 1);
    } else {
        drawDepotArchitecture(c, def, mockStruct, timeSec, 0.35);
    }
    c.restore();
}

// ============================================================================
// 8. MODO COLOCACIÓN EN TERRENO Y CLICS EN EL CANVAS
// ============================================================================
const ColonyBuildings = {
    placementMode: false,
    placementKind: 'house', // 'house' | 'depot'
    placementTypeId: 'pod_1',
    selectedRef: null,      // { kind: 'house'|'depot'|'colonist', id: string }
    hoveredRef: null,

    enterPlacementMode(kind, typeId) {
        this.placementMode = true;
        this.placementKind = kind;
        this.placementTypeId = typeId;
        if (typeof LightingEngine !== 'undefined' && LightingEngine.exitPlacementMode) {
            LightingEngine.exitPlacementMode();
        }
        const def = kind === 'house' ? HOUSE_CATALOG[typeId] : DEPOT_CATALOG[typeId];
        const banner = document.getElementById('colonyPlacementBanner');
        const label = document.getElementById('colonyPlacementLabel');
        if (banner) banner.classList.remove('hidden');
        if (label && def) {
            label.textContent = `Colocar ${def.shortName} · Clic en la superficie del planeta`;
        }
    },

    exitPlacementMode() {
        this.placementMode = false;
        const banner = document.getElementById('colonyPlacementBanner');
        if (banner) banner.classList.add('hidden');
    },

    drawPlacementPreview(timeSec) {
        if (!this.placementMode || typeof ctx === 'undefined') return;
        const p = (typeof astronaut !== 'undefined' && astronaut.planet) ? astronaut.planet : (typeof ship !== 'undefined' ? ship.nearestPlanet : null);
        if (!p || typeof lastMouseWorldPos === 'undefined' || !lastMouseWorldPos) return;

        const def = this.placementKind === 'house' ? HOUSE_CATALOG[this.placementTypeId] : DEPOT_CATALOG[this.placementTypeId];
        if (!def) return;

        const ang = Math.atan2(lastMouseWorldPos.y - p.y, lastMouseWorldPos.x - p.x);
        const inCav = !!(typeof astronaut !== 'undefined' && astronaut.inCavern);
        const onCeil = !!(typeof astronaut !== 'undefined' && astronaut.onCeiling);
        const refR = Math.hypot(lastMouseWorldPos.x - p.x, lastMouseWorldPos.y - p.y);
        const valid = checkColonyPlacementValid(p, ang, def.width, inCav, onCeil, refR);
        const affordable = (this.placementKind === 'house' && isFirstHouseFree(this.placementTypeId)) || canAffordColonyCost(def.cost, p.key);
        const fp = computeTerrainFootprint(p, ang, def.width, inCav, onCeil, refR);

        const wx = p.x + Math.cos(ang) * fp.deckR;
        const wy = p.y + Math.sin(ang) * fp.deckR;
        const ok = valid.ok && affordable;

        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(ang + (onCeil ? -Math.PI * 0.5 : Math.PI * 0.5) + fp.slopeRad);
        ctx.globalAlpha = 0.65 + 0.15 * Math.sin(timeSec * 7);

        const mock = {
            width: fp.width,
            halfWidth: fp.halfWidth,
            profile: fp.profile,
            maxDrop: fp.maxDrop,
            level: 1,
            seed: 0,
            storedFuel: 0,
            storedMinerals: {}
        };
        drawTerrainFoundation(ctx, mock, 0.2, ok ? '#34d399' : '#fb7185');
        if (this.placementKind === 'house') {
            drawHouseArchitecture(ctx, def, mock, timeSec, 0.2, 0);
        } else {
            drawDepotArchitecture(ctx, def, mock, timeSec, 0.2);
        }

        // Borde indicador válido / bloqueado
        ctx.globalAlpha = 0.92;
        ctx.strokeStyle = ok ? '#34d399' : '#fb7185';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(-fp.halfWidth - 3, -def.height - 4, fp.width + 6, def.height + fp.maxDrop + 6);
        ctx.setLineDash([]);

        if (!ok) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(-58, -def.height - 24, 116, 15);
            ctx.fillStyle = '#fda4af';
            ctx.font = 'bold 7.5px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(!affordable ? 'Faltan materiales' : valid.reason, 0, -def.height - 14);
        }
        ctx.restore();
    },

    handlePointerDown(worldX, worldY) {
        if (this.placementMode) {
            const p = (typeof astronaut !== 'undefined' && astronaut.planet) ? astronaut.planet : (typeof ship !== 'undefined' ? ship.nearestPlanet : null);
            if (!p) return false;
            const ang = Math.atan2(worldY - p.y, worldX - p.x);
            const inCav = !!(typeof astronaut !== 'undefined' && astronaut.inCavern);
            const onCeil = !!(typeof astronaut !== 'undefined' && astronaut.onCeiling);
            const refR = Math.hypot(worldX - p.x, worldY - p.y);
            const opts = { inCavern: inCav, onCeiling: onCeil, refR };

            const created = (this.placementKind === 'house')
                ? buildHouseAt(p, ang, this.placementTypeId, opts)
                : buildDepotAt(p, ang, this.placementTypeId, opts);

            if (created) {
                this.exitPlacementMode();
                if (typeof refreshColonyUI === 'function') refreshColonyUI();
            }
            return true;
        }

        // Si no estamos en modo colocación, comprobar clic en casa o depósito
        const hit = this.findAtWorldPos(worldX, worldY);
        if (hit) {
            this.selectedRef = hit;
            if (typeof openColonyInspector === 'function') openColonyInspector(hit);
            return true;
        }
        return false;
    },

    handlePointerMove(worldX, worldY) {
        if (this.placementMode) return true;
        this.hoveredRef = this.findAtWorldPos(worldX, worldY);
        return !!this.hoveredRef;
    },

    findAtWorldPos(worldX, worldY) {
        const nearby = (typeof getNearbyPlanets === 'function') ? getNearbyPlanets(worldX, worldY, 1) : [];
        if (!nearby.length) return null;

        let best = null;
        let bestDist = Infinity;

        for (const p of nearby) {
            // Primero comprobar si clicó en un colonizador (tienen prioridad por tamaño más pequeño)
            if (typeof findColonistAtWorldPos === 'function') {
                const cHit = findColonistAtWorldPos(worldX, worldY, p);
                if (cHit) return { kind: 'colonist', id: cHit.id };
            }

            for (const h of planetaryHouses) {
                if (!h || h.planetKey !== p.key) continue;
                const dir = h.onCeiling ? -1 : 1;
                const cx = p.x + Math.cos(h.angle) * (h.deckR + dir * h.height * 0.45);
                const cy = p.y + Math.sin(h.angle) * (h.deckR + dir * h.height * 0.45);
                const hitR = Math.max(h.width * 0.55, h.height * 0.65);
                const d = Math.hypot(worldX - cx, worldY - cy);
                if (d <= hitR && d < bestDist) {
                    bestDist = d;
                    best = { kind: 'house', id: h.id };
                }
            }

            for (const dep of planetaryDepots) {
                if (!dep || dep.planetKey !== p.key) continue;
                const dir = dep.onCeiling ? -1 : 1;
                const cx = p.x + Math.cos(dep.angle) * (dep.deckR + dir * dep.height * 0.45);
                const cy = p.y + Math.sin(dep.angle) * (dep.deckR + dir * dep.height * 0.45);
                const hitR = Math.max(dep.width * 0.55, dep.height * 0.65);
                const d = Math.hypot(worldX - cx, worldY - cy);
                if (d <= hitR && d < bestDist) {
                    bestDist = d;
                    best = { kind: 'depot', id: dep.id };
                }
            }
        }
        return best;
    }
};
