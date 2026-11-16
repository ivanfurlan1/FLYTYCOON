/**
 * ÉTER — Sistema de Astronautas Colonos: Skins Personalizadas,
 * Inteligencia Social (Reunirse, Conversar, Observar, Volver a Casa),
 * Logística Autónoma (Recolección de Extractores, Depósitos y Repostaje de Cohetes)
 * y Panel de Gestión de Colonia.
 */

const planetaryColonists = [];

const COLONIST_JOBS = {
    idle: {
        id: 'idle',
        name: 'Libre / Explorador',
        shortName: 'Libre',
        icon: '🧭',
        color: '#38bdf8',
        scarf: '#38bdf8',
        scarfGlow: 'rgba(56, 189, 248, 0.30)',
        desc: 'Pasea por la colonia, observa el entorno, se reúne a conversar con otros astronautas y descansa en su casa.'
    },
    collect_minerals: {
        id: 'collect_minerals',
        name: 'Recolector de Minerales',
        shortName: 'Minerales',
        icon: '⛏️',
        color: '#f59e0b',
        scarf: '#f59e0b',
        scarfGlow: 'rgba(245, 158, 11, 0.30)',
        desc: 'Recoge minerales de los extractores y los administra llevándolos a Silos de Minerales o Almacenes Mixtos.'
    },
    collect_fuel: {
        id: 'collect_fuel',
        name: 'Gestor de Combustible',
        shortName: 'Combustible',
        icon: '⚡',
        color: '#eab308',
        scarf: '#eab308',
        scarfGlow: 'rgba(234, 179, 8, 0.32)',
        desc: 'Extrae Éter Combustible acumulado en las perforadoras y lo almacena en Cisternas o Almacenes Mixtos.'
    },
    refuel_rockets: {
        id: 'refuel_rockets',
        name: 'Abastecedor de Cohetes',
        shortName: 'Cohetes',
        icon: '🚀',
        color: '#34d399',
        scarf: '#34d399',
        scarfGlow: 'rgba(52, 211, 153, 0.32)',
        desc: 'Toma Éter de depósitos o extractores y mantiene los tanques de tus cohetes aterrizados llenos al 100%.'
    },
    logistics_all: {
        id: 'logistics_all',
        name: 'Administrador Logístico',
        shortName: 'Logística',
        icon: '⚙️',
        color: '#a78bfa',
        scarf: '#a78bfa',
        scarfGlow: 'rgba(167, 139, 250, 0.32)',
        desc: 'IA integral: abastece cohetes prioritariamente y recolecta minerales y Éter hacia los depósitos disponibles.'
    }
};

const COLONIST_FIRST_NAMES = [
    'Aria', 'Mateo', 'Lyra', 'Soren', 'Elena', 'Kael', 'Nora', 'Lucas',
    'Vera', 'Thiago', 'Iris', 'Dante', 'Alma', 'Orion', 'Maya', 'Leo',
    'Cloe', 'Bruno', 'Selene', 'Ciro', 'Zoe', 'Nico', 'Gala', 'Atlas'
];

const COLONIST_SURNAMES = [
    'Vance', 'Solís', 'Kael', 'Vega', 'Ríos', 'Nox', 'Silva', 'Mora',
    'Luna', 'Cruz', 'Astral', 'Paz', 'Lagos', 'Vidal', 'Nova', 'Vera'
];

const COLONIST_SUIT_VARIANTS = [
    { name: 'Titanio Perla',   suit0: [226, 232, 240], suit1: [148, 163, 184], visor0: [224, 242, 254], visor1: [56, 189, 248], visor2: [14, 116, 144] },
    { name: 'Marfil Orbital',  suit0: [245, 240, 230], suit1: [185, 175, 160], visor0: [254, 249, 195], visor1: [250, 204, 21], visor2: [161, 98, 7] },
    { name: 'Bruma Celeste',   suit0: [219, 234, 254], suit1: [147, 177, 216], visor0: [236, 253, 245], visor1: [52, 211, 153], visor2: [6, 95, 70] },
    { name: 'Plata Lunar',     suit0: [228, 228, 231], suit1: [161, 161, 170], visor0: [254, 243, 199], visor1: [245, 158, 11], visor2: [146, 64, 14] },
    { name: 'Cuarzo Rosa',     suit0: [241, 230, 238], suit1: [179, 155, 173], visor0: [253, 230, 138], visor1: [244, 114, 182], visor2: [157, 23, 77] }
];

// ============================================================================
// 1. CREACIÓN Y GESTIÓN DE COLONOS POR VIVIENDA
// ============================================================================
function spawnColonistsForHouse(house, planet) {
    if (!house) return [];
    const def = (typeof HOUSE_CATALOG !== 'undefined') ? HOUSE_CATALOG[house.typeId] : null;
    const count = house.capacity || (def ? def.capacity : 1);
    const p = planet || (typeof getPlanetByKey === 'function' ? getPlanetByKey(house.planetKey) : null);
    const simNow = (typeof cosmosSimTime !== 'undefined') ? cosmosSimTime : 0;

    const spawned = [];
    for (let i = 0; i < count; i++) {
        const fn = COLONIST_FIRST_NAMES[(planetaryColonists.length + i * 3 + Math.floor(Math.random() * 5)) % COLONIST_FIRST_NAMES.length];
        const sn = COLONIST_SURNAMES[(planetaryColonists.length + i * 7 + Math.floor(Math.random() * 4)) % COLONIST_SURNAMES.length];
        const suitVar = COLONIST_SUIT_VARIANTS[(planetaryColonists.length + i) % COLONIST_SUIT_VARIANTS.length];
        const hScale = 0.88 + Math.random() * 0.09; // Levemente más bajos/distintos al jugador

        const col = {
            id: 'AST-' + (planetaryColonists.length + 1) + '-' + Math.floor(100 + Math.random() * 899),
            name: `${fn} ${sn}`,
            planetKey: house.planetKey,
            homeHouseId: house.id,
            job: 'idle',
            skin: {
                variantName: suitVar.name,
                suit0: suitVar.suit0,
                suit1: suitVar.suit1,
                visor0: suitVar.visor0,
                visor1: suitVar.visor1,
                visor2: suitVar.visor2,
                heightScale: hScale
            },
            angle: house.angle,
            radialPos: house.deckR,
            altitude: 0,
            vTangential: 0,
            vRadial: 0,
            facing: i % 2 === 0 ? 1 : -1,
            lookDir: i % 2 === 0 ? 1 : -1,
            isGrounded: true,
            inCavern: !!house.inCavern,
            onCeiling: !!house.onCeiling,
            walkCycle: Math.random() * Math.PI * 2,
            x: p ? p.x + Math.cos(house.angle) * house.deckR : 0,
            y: p ? p.y + Math.sin(house.angle) * house.deckR : 0,

            // Estado IA
            aiState: 'AT_HOME',
            aiTimer: 0.6 + i * 0.65, // Salen escalonadamente al construir la casa
            targetAngle: house.angle,
            targetEntityId: null,
            chatPartnerId: null,
            chatCooldown: 1.5 + Math.random() * 3.0,
            emoteType: null,
            emoteTimer: 0,
            energy: 85 + Math.random() * 15,
            statusText: 'Instalándose en su vivienda',

            // Carga personal de trabajo
            carryFuel: 0,
            carryMinerals: {},
            carryMineralCap: 18 + (def ? (def.carryBonus || 0) : 0),
            carryFuelCap: 32 + (def ? (def.carryBonus || 0) * 1.5 : 0),
            workSpeedMult: def ? (def.workSpeedMult || 1.0) : 1.0,
            lastUpdateSimTime: simNow
        };

        planetaryColonists.push(col);
        spawned.push(col);
    }
    return spawned;
}

function removeColonistsOfHouse(houseId) {
    for (let i = planetaryColonists.length - 1; i >= 0; i--) {
        if (planetaryColonists[i] && planetaryColonists[i].homeHouseId === houseId) {
            planetaryColonists.splice(i, 1);
        }
    }
}

function setColonistJob(colonistId, jobId) {
    const col = planetaryColonists.find(c => c && c.id === colonistId);
    if (!col || !COLONIST_JOBS[jobId]) return false;
    col.job = jobId;
    col.chatPartnerId = null;
    col.targetEntityId = null;
    if (col.aiState === 'AT_HOME' && jobId !== 'idle') {
        col.aiTimer = Math.min(col.aiTimer, 0.35);
    } else if (col.aiState === 'CHATTING' || col.aiState === 'SEEK_CHAT' || col.aiState === 'WANDERING' || col.aiState === 'LOOKING_AROUND') {
        col.aiState = 'WANDERING';
        col.aiTimer = 0.25;
    }
    col.statusText = `Asignado a ${COLONIST_JOBS[jobId].shortName}`;
    if (typeof autoSaveActiveWorld === 'function') autoSaveActiveWorld(false);
    return true;
}

function setHouseResidentsJob(houseId, jobId) {
    let changed = 0;
    for (const c of planetaryColonists) {
        if (c && c.homeHouseId === houseId) {
            if (setColonistJob(c.id, jobId)) changed++;
        }
    }
    return changed;
}

function callHouseResidentsOut(houseId) {
    for (const c of planetaryColonists) {
        if (c && c.homeHouseId === houseId && c.aiState === 'AT_HOME') {
            c.aiState = 'WANDERING';
            c.aiTimer = 6 + Math.random() * 6;
            c.energy = Math.max(c.energy, 75);
            c.statusText = 'Saliendo al exterior';
        }
    }
}

function sendHouseResidentsHome(houseId) {
    for (const c of planetaryColonists) {
        if (c && c.homeHouseId === houseId && c.aiState !== 'AT_HOME') {
            c.job = 'idle';
            c.chatPartnerId = null;
            c.targetEntityId = null;
            c.aiState = 'RETURNING_HOME';
            c.aiTimer = 25;
            c.statusText = 'Volviendo a casa';
        }
    }
}

function getColonistMineralTotal(col) {
    if (!col || !col.carryMinerals) return 0;
    let sum = 0;
    for (const v of Object.values(col.carryMinerals)) sum += Math.max(0, Math.floor(Number(v) || 0));
    return sum;
}

// ============================================================================
// 2. HELPERS DE NAVEGACIÓN PLANETARIA Y LOGÍSTICA
// ============================================================================
function signedAngleDiff(fromAng, toAng) {
    return Math.atan2(Math.sin(toAng - fromAng), Math.cos(toAng - fromAng));
}

function getPlanetRefRadius(planet, col) {
    return Math.max(400, (col && col.radialPos) || planet.radius || 1000);
}

function getArcDistance(planet, angA, angB, refR) {
    return Math.abs(signedAngleDiff(angA, angB)) * Math.max(400, refR || planet.radius || 1000);
}

function getLandedShipsOnPlanet(planet) {
    const ships = [];
    if (!planet) return ships;
    const maxDist = (planet.atmoRadius || planet.radius * 1.6) + 280;
    const check = (s) => {
        if (!s) return;
        const d = Math.hypot(s.x - planet.x, s.y - planet.y);
        if (d <= maxDist && (s.isGrounded || d - planet.radius < 180)) {
            ships.push({
                shipObj: s,
                angle: Math.atan2(s.y - planet.y, s.x - planet.x)
            });
        }
    };
    if (typeof ship !== 'undefined') check(ship);
    if (typeof parkedShips !== 'undefined' && Array.isArray(parkedShips)) {
        for (const ps of parkedShips) check(ps);
    }
    return ships;
}

function findBestExtractorForMinerals(planet, col) {
    if (typeof planetaryExtractors === 'undefined') return null;
    let best = null;
    let bestScore = -Infinity;
    const refR = getPlanetRefRadius(planet, col);
    for (const m of planetaryExtractors) {
        if (!m || m.planetKey !== planet.key || Boolean(m.onCeiling) !== Boolean(col.onCeiling)) continue;
        const total = (typeof getExtractorMineralTotal === 'function') ? Math.floor(getExtractorMineralTotal(m)) : 0;
        if (total < 1) continue;
        const dist = getArcDistance(planet, col.angle, m.angle, refR);
        const score = total * 4 - dist * 0.05;
        if (score > bestScore) {
            bestScore = score;
            best = m;
        }
    }
    return best;
}

function findBestExtractorForFuel(planet, col) {
    if (typeof planetaryExtractors === 'undefined') return null;
    let best = null;
    let bestScore = -Infinity;
    const refR = getPlanetRefRadius(planet, col);
    for (const m of planetaryExtractors) {
        if (!m || m.planetKey !== planet.key || Boolean(m.onCeiling) !== Boolean(col.onCeiling)) continue;
        const fuel = Number(m.storedFuel) || 0;
        if (fuel < 1.5) continue;
        const dist = getArcDistance(planet, col.angle, m.angle, refR);
        const score = fuel * 3 - dist * 0.05;
        if (score > bestScore) {
            bestScore = score;
            best = m;
        }
    }
    return best;
}

function findBestDepotForMinerals(planet, col) {
    if (typeof planetaryDepots === 'undefined') return null;
    let best = null;
    let bestDist = Infinity;
    const refR = getPlanetRefRadius(planet, col);
    for (const d of planetaryDepots) {
        if (!d || d.planetKey !== planet.key || Boolean(d.onCeiling) !== Boolean(col.onCeiling)) continue;
        const def = DEPOT_CATALOG[d.typeId];
        if (!def || !def.storesMinerals) continue;
        const cap = getDepotMineralCapacity(d);
        const cur = getDepotMineralTotal(d);
        if (cap - cur < 1) continue;
        const dist = getArcDistance(planet, col.angle, d.angle, refR);
        if (dist < bestDist) {
            bestDist = dist;
            best = d;
        }
    }
    return best;
}

function findBestDepotForFuelDeposit(planet, col) {
    if (typeof planetaryDepots === 'undefined') return null;
    let best = null;
    let bestDist = Infinity;
    const refR = getPlanetRefRadius(planet, col);
    for (const d of planetaryDepots) {
        if (!d || d.planetKey !== planet.key || Boolean(d.onCeiling) !== Boolean(col.onCeiling)) continue;
        const def = DEPOT_CATALOG[d.typeId];
        if (!def || !def.storesFuel) continue;
        const cap = getDepotFuelCapacity(d);
        const cur = Number(d.storedFuel) || 0;
        if (cap - cur < 1) continue;
        const dist = getArcDistance(planet, col.angle, d.angle, refR);
        if (dist < bestDist) {
            bestDist = dist;
            best = d;
        }
    }
    return best;
}

function findBestDepotWithFuel(planet, col) {
    if (typeof planetaryDepots === 'undefined') return null;
    let best = null;
    let bestScore = -Infinity;
    const refR = getPlanetRefRadius(planet, col);
    for (const d of planetaryDepots) {
        if (!d || d.planetKey !== planet.key || Boolean(d.onCeiling) !== Boolean(col.onCeiling)) continue;
        const def = DEPOT_CATALOG[d.typeId];
        if (!def || !def.storesFuel) continue;
        const fuel = Number(d.storedFuel) || 0;
        if (fuel < 1.5) continue;
        const dist = getArcDistance(planet, col.angle, d.angle, refR);
        const score = fuel - dist * 0.05;
        if (score > bestScore) {
            bestScore = score;
            best = d;
        }
    }
    return best;
}

function findRocketNeedingFuel(planet, col) {
    const landed = getLandedShipsOnPlanet(planet);
    const refR = getPlanetRefRadius(planet, col);
    let best = null;
    let bestDist = Infinity;
    for (const item of landed) {
        const s = item.shipObj;
        const maxF = s.maxFuel || 100;
        if ((s.fuel || 0) >= maxF - 0.5) continue;
        const dist = getArcDistance(planet, col.angle, item.angle, refR);
        if (dist < bestDist) {
            bestDist = dist;
            best = item;
        }
    }
    return best;
}

function stepColonistTowardAngle(col, planet, targetAngle, speed, dt) {
    const refR = getPlanetRefRadius(planet, col);
    const diff = signedAngleDiff(col.angle, targetAngle);
    const arcDist = Math.abs(diff) * refR;
    if (arcDist < 6) {
        col.vTangential = lerp(col.vTangential, 0, clamp(dt * 12, 0, 1));
        return true; // Llegó
    }

    const dir = diff > 0 ? 1 : -1;
    col.facing = col.onCeiling ? -dir : dir;
    col.lookDir = col.facing;

    // Detección de pendiente pronunciada para activar micro-salto con jetpack
    const lookAheadAng = col.angle + dir * (10 / refR);
    const curGround = getColonyGroundRadiusAt(planet, col.angle, col.inCavern, col.onCeiling);
    const nextGround = getColonyGroundRadiusAt(planet, lookAheadAng, col.inCavern, col.onCeiling);
    const stepUp = col.onCeiling ? (curGround - nextGround) : (nextGround - curGround);
    if (col.isGrounded && stepUp > 4.5) {
        col.vRadial = 26 + Math.min(18, stepUp * 1.4);
        col.isGrounded = false;
        if (typeof particles !== 'undefined') {
            const jetA = col.onCeiling ? (col.angle + Math.PI) : col.angle;
            particles.push({
                x: col.x, y: col.y,
                vx: Math.cos(jetA) * 35, vy: Math.sin(jetA) * 35,
                size: 1.8, life: 0.18, maxLife: 0.18, isWarp: false, type: 'plume',
                customRGB: [224, 242, 254]
            });
        }
    }

    const targetVel = dir * speed * (col.onCeiling ? -1 : 1);
    col.vTangential = lerp(col.vTangential, targetVel, clamp(dt * 8.5, 0, 1));
    return false;
}

// ============================================================================
// 3. SIMULACIÓN COMPLETA DE IA, SOCIALIZACIÓN Y FÍSICA DE COLONOS
// ============================================================================
function updateColonyColonists(dt, nearbyPlanets) {
    if (!planetaryColonists.length || !Array.isArray(nearbyPlanets) || !nearbyPlanets.length) return;
    const simNow = (typeof cosmosSimTime !== 'undefined') ? cosmosSimTime : 0;
    const planetMap = new Map();
    for (const p of nearbyPlanets) {
        if (p && p.key) planetMap.set(p.key, p);
    }

    for (let i = 0; i < planetaryColonists.length; i++) {
        const col = planetaryColonists[i];
        const p = planetMap.get(col.planetKey);
        if (!p) continue;

        const home = planetaryHouses.find(h => h && h.id === col.homeHouseId) || null;
        if (!home) continue;

        // Catch-up ligero si el jugador estuvo en otro planeta
        if (typeof col.lastUpdateSimTime === 'number' && simNow - col.lastUpdateSimTime > Math.max(3.0, dt * 5)) {
            const elapsed = Math.min(900, simNow - col.lastUpdateSimTime);
            runColonistCatchup(col, p, elapsed);
        }
        col.lastUpdateSimTime = simNow;

        if (col.emoteTimer > 0) col.emoteTimer = Math.max(0, col.emoteTimer - dt);
        if (col.chatCooldown > 0) col.chatCooldown = Math.max(0, col.chatCooldown - dt);

        const refR = getPlanetRefRadius(p, col);
        const speedBase = 36 * (col.workSpeedMult || 1.0);
        const strollSpeed = 24;
        const job = col.job || 'idle';

        // Verificar estado nocturno/tormenta para comportamiento natural
        const solar = (p.atmoRadius && typeof getPlanetSolarState === 'function')
            ? (p.currentSolarState || getPlanetSolarState(p, col.x, col.y, performance.now() / 1000))
            : null;
        const isNight = solar ? (solar.nightFactor > 0.65) : false;

        // ------------------------------------------------------------------
        // MÁQUINA DE ESTADOS FINITOS (FSM)
        // ------------------------------------------------------------------
        if (col.aiState === 'AT_HOME') {
            col.angle = home.angle;
            col.radialPos = home.deckR;
            col.altitude = 0;
            col.vTangential = 0;
            col.vRadial = 0;
            col.energy = Math.min(100, col.energy + dt * 16);
            col.aiTimer -= dt;
            col.statusText = 'Descansando en su hogar';

            if (col.aiTimer <= 0 && (job !== 'idle' || col.energy > 65)) {
                // Salir por la puerta de la casa
                const exitOff = ((i % 2 === 0 ? 1 : -1) * (10 + Math.random() * 14)) / refR;
                col.angle = wrapAngle(home.angle + exitOff);
                col.aiState = 'WANDERING';
                col.aiTimer = 2.5 + Math.random() * 4.5;
                col.targetAngle = wrapAngle(home.angle + ((Math.random() - 0.5) * 160) / refR);
                col.statusText = 'Saliendo de casa';
            }
        } else if (job !== 'idle' && !isWorkerBusy(col)) {
            // Despachar tarea laboral según el rol asignado
            const dispatched = dispatchColonistWork(col, p, home, job);
            if (!dispatched) {
                runIdleBehavior(col, p, home, strollSpeed, isNight, dt, refR);
            }
        } else if (isWorkerBusy(col)) {
            runActiveWorkState(col, p, home, speedBase, dt, refR);
        } else {
            runIdleBehavior(col, p, home, strollSpeed, isNight, dt, refR);
        }

        // ------------------------------------------------------------------
        // FÍSICA DE SUPERFICIE CURVA PARA COLONOS EN EL EXTERIOR
        // ------------------------------------------------------------------
        if (col.aiState !== 'AT_HOME') {
            const groundR = getColonyGroundRadiusAt(p, col.angle, col.inCavern, col.onCeiling);
            const g = Math.max(90, (p.gravityForce || 280) * 0.45);

            if (!col.isGrounded) {
                col.vRadial -= g * dt;
            }
            col.altitude += col.vRadial * dt;
            if (col.altitude <= 0) {
                col.altitude = 0;
                col.vRadial = 0;
                col.isGrounded = true;
            }

            const curR = Math.max(300, col.onCeiling ? (groundR - col.altitude) : (groundR + col.altitude));
            col.radialPos = curR;
            col.angle = wrapAngle(col.angle + (col.vTangential / curR) * dt);

            const updatedGroundR = getColonyGroundRadiusAt(p, col.angle, col.inCavern, col.onCeiling);
            col.radialPos = col.onCeiling ? (updatedGroundR - col.altitude) : (updatedGroundR + col.altitude);
            col.x = p.x + Math.cos(col.angle) * col.radialPos;
            col.y = p.y + Math.sin(col.angle) * col.radialPos;

            if (col.isGrounded && Math.abs(col.vTangential) > 1.5) {
                col.walkCycle += Math.abs(col.vTangential) * dt * 0.24;
            }
            col.energy = Math.max(0, col.energy - dt * (job === 'idle' ? 1.1 : 0.45));
        } else {
            col.x = p.x + Math.cos(home.angle) * home.deckR;
            col.y = p.y + Math.sin(home.angle) * home.deckR;
        }
    }
}

function isWorkerBusy(col) {
    const st = col.aiState;
    return st === 'GOING_TO_WORK' || st === 'WORKING_HARVEST' ||
        st === 'HAULING_TO_DEPOT' || st === 'DEPOSITING' ||
        st === 'GOING_TO_DEPOT_FOR_FUEL' || st === 'LOADING_FUEL' ||
        st === 'HAULING_TO_ROCKET' || st === 'REFUELING_ROCKET';
}

function dispatchColonistWork(col, planet, home, job) {
    const minCarried = getColonistMineralTotal(col);
    const fuelCarried = Number(col.carryFuel) || 0;

    // Si ya lleva recursos en la mochila, primero entregarlos
    if (minCarried > 0) {
        const dep = findBestDepotForMinerals(planet, col);
        if (dep) {
            col.targetEntityId = dep.id;
            col.targetAngle = dep.angle;
            col.aiState = 'HAULING_TO_DEPOT';
            col.statusText = `Llevando ${minCarried}u minerales al depósito`;
            return true;
        }
    }
    if (fuelCarried >= 2) {
        if (job === 'refuel_rockets' || job === 'logistics_all') {
            const rInfo = findRocketNeedingFuel(planet, col);
            if (rInfo) {
                col.targetAngle = rInfo.angle;
                col.targetEntityId = rInfo.shipObj.id || 'active_ship';
                col.aiState = 'HAULING_TO_ROCKET';
                col.statusText = `Llevando ${Math.round(fuelCarried)}L Éter al cohete`;
                return true;
            }
        }
        const fDep = findBestDepotForFuelDeposit(planet, col);
        if (fDep) {
            col.targetEntityId = fDep.id;
            col.targetAngle = fDep.angle;
            col.aiState = 'HAULING_TO_DEPOT';
            col.statusText = `Llevando ${Math.round(fuelCarried)}L Éter al depósito`;
            return true;
        }
    }

    // Asignar nueva tarea según rol
    if (job === 'refuel_rockets' || job === 'logistics_all') {
        const rInfo = findRocketNeedingFuel(planet, col);
        if (rInfo) {
            const fDep = findBestDepotWithFuel(planet, col);
            if (fDep) {
                col.targetEntityId = fDep.id;
                col.targetAngle = fDep.angle;
                col.aiState = 'GOING_TO_DEPOT_FOR_FUEL';
                col.statusText = 'Buscando Éter en depósito para el cohete';
                return true;
            }
            const extF = findBestExtractorForFuel(planet, col);
            if (extF) {
                col.targetEntityId = extF.id;
                col.targetAngle = extF.angle;
                col.aiState = 'GOING_TO_WORK';
                col.workTaskKind = 'fuel_for_rocket';
                col.statusText = `Extrayendo Éter de ${extF.id} para el cohete`;
                return true;
            }
        }
    }

    if (job === 'collect_minerals' || job === 'logistics_all') {
        const extM = findBestExtractorForMinerals(planet, col);
        const depM = findBestDepotForMinerals(planet, col);
        if (extM && depM) {
            col.targetEntityId = extM.id;
            col.targetAngle = extM.angle;
            col.aiState = 'GOING_TO_WORK';
            col.workTaskKind = 'minerals';
            col.statusText = `Yendo a recoger minerales de ${extM.id}`;
            return true;
        }
    }

    if (job === 'collect_fuel' || job === 'logistics_all') {
        const extF = findBestExtractorForFuel(planet, col);
        const depF = findBestDepotForFuelDeposit(planet, col);
        if (extF && depF) {
            col.targetEntityId = extF.id;
            col.targetAngle = extF.angle;
            col.aiState = 'GOING_TO_WORK';
            col.workTaskKind = 'fuel';
            col.statusText = `Yendo a extraer Éter de ${extF.id}`;
            return true;
        }
    }

    return false;
}

function runActiveWorkState(col, planet, home, speedBase, dt, refR) {
    if (col.aiState === 'GOING_TO_WORK') {
        const m = (typeof planetaryExtractors !== 'undefined') ? planetaryExtractors.find(e => e && e.id === col.targetEntityId) : null;
        if (!m) { col.aiState = 'WANDERING'; col.aiTimer = 1.5; return; }
        const arrived = stepColonistTowardAngle(col, planet, m.angle, speedBase, dt);
        if (arrived) {
            col.aiState = 'WORKING_HARVEST';
            col.aiTimer = 1.15 / (col.workSpeedMult || 1.0);
            col.emoteType = col.workTaskKind === 'minerals' ? '⛏️' : '⚡';
            col.emoteTimer = 1.2;
            col.statusText = `Recolectando de ${m.id}`;
        }
    } else if (col.aiState === 'WORKING_HARVEST') {
        col.vTangential = lerp(col.vTangential, 0, clamp(dt * 12, 0, 1));
        col.aiTimer -= dt;
        const m = (typeof planetaryExtractors !== 'undefined') ? planetaryExtractors.find(e => e && e.id === col.targetEntityId) : null;
        if (!m) { col.aiState = 'WANDERING'; col.aiTimer = 1.5; return; }

        if (col.aiTimer <= 0) {
            if (col.workTaskKind === 'minerals') {
                let space = Math.max(0, col.carryMineralCap - getColonistMineralTotal(col));
                if (m.storedMinerals && space > 0) {
                    for (const [id, rawAmt] of Object.entries(m.storedMinerals)) {
                        if (space <= 0) break;
                        const whole = Math.floor(Number(rawAmt) || 0);
                        const take = Math.min(whole, space);
                        if (take > 0) {
                            col.carryMinerals[id] = (col.carryMinerals[id] || 0) + take;
                            m.storedMinerals[id] = rawAmt - take;
                            if (m.storedMinerals[id] <= 0.01) delete m.storedMinerals[id];
                            space -= take;
                        }
                    }
                }
                const dep = findBestDepotForMinerals(planet, col);
                if (dep && getColonistMineralTotal(col) > 0) {
                    col.targetEntityId = dep.id;
                    col.targetAngle = dep.angle;
                    col.aiState = 'HAULING_TO_DEPOT';
                    col.statusText = `Llevando minerales → ${dep.shortName}`;
                } else {
                    col.aiState = 'WANDERING';
                    col.aiTimer = 2.0;
                }
            } else {
                const spaceF = Math.max(0, col.carryFuelCap - (col.carryFuel || 0));
                const takeF = Math.min(spaceF, Number(m.storedFuel) || 0);
                if (takeF > 0.1) {
                    col.carryFuel = (col.carryFuel || 0) + takeF;
                    m.storedFuel = Math.max(0, (m.storedFuel || 0) - takeF);
                }
                if (col.workTaskKind === 'fuel_for_rocket') {
                    const rInfo = findRocketNeedingFuel(planet, col);
                    if (rInfo && col.carryFuel > 0.5) {
                        col.targetAngle = rInfo.angle;
                        col.targetEntityId = rInfo.shipObj.id || 'active_ship';
                        col.aiState = 'HAULING_TO_ROCKET';
                        col.statusText = 'Llevando Éter al cohete';
                        return;
                    }
                }
                const depF = findBestDepotForFuelDeposit(planet, col);
                if (depF && col.carryFuel > 0.5) {
                    col.targetEntityId = depF.id;
                    col.targetAngle = depF.angle;
                    col.aiState = 'HAULING_TO_DEPOT';
                    col.statusText = `Llevando Éter → ${depF.shortName}`;
                } else {
                    col.aiState = 'WANDERING';
                    col.aiTimer = 2.0;
                }
            }
        }
    } else if (col.aiState === 'HAULING_TO_DEPOT') {
        const dep = planetaryDepots.find(d => d && d.id === col.targetEntityId);
        if (!dep) { col.aiState = 'WANDERING'; col.aiTimer = 1.5; return; }
        const arrived = stepColonistTowardAngle(col, planet, dep.angle, speedBase * 0.94, dt);
        if (arrived) {
            col.aiState = 'DEPOSITING';
            col.aiTimer = 0.75;
            col.statusText = `Depositando en ${dep.shortName}`;
        }
    } else if (col.aiState === 'DEPOSITING') {
        col.vTangential = lerp(col.vTangential, 0, clamp(dt * 12, 0, 1));
        col.aiTimer -= dt;
        if (col.aiTimer <= 0) {
            const dep = planetaryDepots.find(d => d && d.id === col.targetEntityId);
            if (dep) {
                const def = DEPOT_CATALOG[dep.typeId];
                if (def && def.storesMinerals && getColonistMineralTotal(col) > 0) {
                    let freeM = Math.max(0, getDepotMineralCapacity(dep) - getDepotMineralTotal(dep));
                    if (!dep.storedMinerals) dep.storedMinerals = {};
                    for (const [id, q] of Object.entries(col.carryMinerals)) {
                        if (freeM <= 0) break;
                        const take = Math.min(Math.floor(q), freeM);
                        if (take > 0) {
                            dep.storedMinerals[id] = (dep.storedMinerals[id] || 0) + take;
                            col.carryMinerals[id] -= take;
                            if (col.carryMinerals[id] <= 0) delete col.carryMinerals[id];
                            freeM -= take;
                        }
                    }
                }
                if (def && def.storesFuel && (col.carryFuel || 0) > 0.1) {
                    const freeF = Math.max(0, getDepotFuelCapacity(dep) - (dep.storedFuel || 0));
                    const putF = Math.min(freeF, col.carryFuel);
                    dep.storedFuel = (dep.storedFuel || 0) + putF;
                    col.carryFuel = Math.max(0, col.carryFuel - putF);
                }
                col.emoteType = '✓';
                col.emoteTimer = 1.1;
                if (typeof createSparks === 'function') {
                    createSparks(col.x, col.y, 6, col.angle, 0.8, 15, 65, [52, 211, 153], 0.28);
                }
            }
            col.aiState = 'WANDERING';
            col.aiTimer = 0.4;
        }
    } else if (col.aiState === 'GOING_TO_DEPOT_FOR_FUEL') {
        const dep = planetaryDepots.find(d => d && d.id === col.targetEntityId);
        if (!dep) { col.aiState = 'WANDERING'; col.aiTimer = 1.5; return; }
        const arrived = stepColonistTowardAngle(col, planet, dep.angle, speedBase, dt);
        if (arrived) {
            col.aiState = 'LOADING_FUEL';
            col.aiTimer = 0.85;
            col.statusText = `Cargando Éter desde ${dep.shortName}`;
        }
    } else if (col.aiState === 'LOADING_FUEL') {
        col.vTangential = lerp(col.vTangential, 0, clamp(dt * 12, 0, 1));
        col.aiTimer -= dt;
        if (col.aiTimer <= 0) {
            const dep = planetaryDepots.find(d => d && d.id === col.targetEntityId);
            if (dep && (dep.storedFuel || 0) > 0.1) {
                const space = Math.max(0, col.carryFuelCap - (col.carryFuel || 0));
                const take = Math.min(space, dep.storedFuel);
                col.carryFuel = (col.carryFuel || 0) + take;
                dep.storedFuel = Math.max(0, dep.storedFuel - take);
            }
            const rInfo = findRocketNeedingFuel(planet, col);
            if (rInfo && col.carryFuel > 0.5) {
                col.targetAngle = rInfo.angle;
                col.targetEntityId = rInfo.shipObj.id || 'active_ship';
                col.aiState = 'HAULING_TO_ROCKET';
                col.statusText = 'Llevando Éter al cohete';
            } else {
                col.aiState = 'WANDERING';
                col.aiTimer = 1.0;
            }
        }
    } else if (col.aiState === 'HAULING_TO_ROCKET') {
        const rInfo = findRocketNeedingFuel(planet, col);
        if (!rInfo || (col.carryFuel || 0) <= 0.1) {
            col.aiState = 'WANDERING';
            col.aiTimer = 1.0;
            return;
        }
        const arrived = stepColonistTowardAngle(col, planet, rInfo.angle, speedBase, dt);
        if (arrived || getArcDistance(planet, col.angle, rInfo.angle, refR) < 34) {
            col.aiState = 'REFUELING_ROCKET';
            col.aiTimer = 3.0;
            col.statusText = 'Repostando Éter al cohete';
        }
    } else if (col.aiState === 'REFUELING_ROCKET') {
        col.vTangential = lerp(col.vTangential, 0, clamp(dt * 12, 0, 1));
        const rInfo = findRocketNeedingFuel(planet, col);
        if (!rInfo || (col.carryFuel || 0) <= 0.05) {
            col.aiState = 'WANDERING';
            col.aiTimer = 0.6;
            return;
        }
        const s = rInfo.shipObj;
        const maxF = s.maxFuel || 100;
        const need = Math.max(0, maxF - (s.fuel || 0));
        const pump = Math.min(need, col.carryFuel, 22 * (col.workSpeedMult || 1.0) * dt);
        if (pump > 0.001) {
            s.fuel = Math.min(maxF, (s.fuel || 0) + pump);
            col.carryFuel = Math.max(0, col.carryFuel - pump);
            col.emoteType = '⛽';
            col.emoteTimer = 0.5;
            if (Math.random() < 0.25 && typeof createSparks === 'function') {
                createSparks(s.x, s.y, 1, Math.random() * Math.PI * 2, 0.5, 18, 65, [251, 191, 36], 0.22);
            }
        } else {
            col.aiState = 'WANDERING';
            col.aiTimer = 0.6;
        }
    }
}

function runIdleBehavior(col, planet, home, strollSpeed, isNight, dt, refR) {
    // Decidir si volver a casa (por energía baja, noche o ciclo terminado)
    if (col.aiState === 'RETURNING_HOME') {
        col.statusText = 'Regresando a casa';
        const arrived = stepColonistTowardAngle(col, planet, home.angle, strollSpeed * 1.1, dt);
        if (arrived) {
            col.aiState = 'AT_HOME';
            col.aiTimer = isNight ? (10 + Math.random() * 12) : (4.5 + Math.random() * 7);
            col.vTangential = 0;
            col.statusText = 'Descansando en casa';
        }
        return;
    }

    if (col.aiState === 'SEEK_CHAT') {
        const partner = planetaryColonists.find(c => c && c.id === col.chatPartnerId);
        if (!partner || partner.planetKey !== planet.key || partner.aiState === 'AT_HOME' || isWorkerBusy(partner)) {
            col.chatPartnerId = null;
            col.aiState = 'WANDERING';
            col.aiTimer = 3.0;
            return;
        }
        col.statusText = `Acercándose a ${partner.name.split(' ')[0]}`;
        const diff = signedAngleDiff(col.angle, partner.angle);
        const arcDist = Math.abs(diff) * refR;
        if (arcDist <= 22) {
            // Iniciar conversación no-verbal
            const chatDur = 3.8 + Math.random() * 3.0;
            col.aiState = 'CHATTING';
            col.aiTimer = chatDur;
            col.vTangential = 0;
            col.facing = diff >= 0 ? 1 : -1;
            col.lookDir = col.facing;
            col.emoteType = '···';
            col.emoteTimer = chatDur;
            col.statusText = `Conversando con ${partner.name.split(' ')[0]}`;

            if (partner.aiState !== 'CHATTING') {
                partner.aiState = 'CHATTING';
                partner.chatPartnerId = col.id;
                partner.aiTimer = chatDur;
                partner.vTangential = 0;
                partner.facing = -col.facing;
                partner.lookDir = partner.facing;
                partner.emoteType = ['💬', '✦', '🚀', '🏠'][Math.floor(Math.random() * 4)];
                partner.emoteTimer = chatDur;
                partner.statusText = `Conversando con ${col.name.split(' ')[0]}`;
            }
            return;
        }
        stepColonistTowardAngle(col, planet, partner.angle, strollSpeed * 1.05, dt);
        col.aiTimer -= dt;
        if (col.aiTimer <= 0) {
            col.chatPartnerId = null;
            col.aiState = 'WANDERING';
            col.aiTimer = 3.0;
        }
        return;
    }

    if (col.aiState === 'CHATTING') {
        col.vTangential = lerp(col.vTangential, 0, clamp(dt * 10, 0, 1));
        col.aiTimer -= dt;
        const partner = planetaryColonists.find(c => c && c.id === col.chatPartnerId);
        if (partner) {
            const diff = signedAngleDiff(col.angle, partner.angle);
            if (Math.abs(diff) > 0.0001) {
                col.facing = diff >= 0 ? 1 : -1;
                col.lookDir = col.facing;
            }
        }
        if (Math.random() < dt * 0.65) {
            col.emoteType = ['···', '✦', '⛏️', '🚀', '🏠'][Math.floor(Math.random() * 5)];
            col.emoteTimer = 1.6;
        }
        if (col.aiTimer <= 0) {
            col.chatPartnerId = null;
            col.chatCooldown = 10 + Math.random() * 14;
            col.aiState = 'SEPARATING';
            col.aiTimer = 2.5;
            const awayDir = col.facing !== 0 ? -col.facing : (Math.random() < 0.5 ? -1 : 1);
            col.targetAngle = wrapAngle(col.angle + awayDir * ((45 + Math.random() * 55) / refR));
            col.statusText = 'Despidiéndose y paseando';
        }
        return;
    }

    if (col.aiState === 'SEPARATING') {
        const arrived = stepColonistTowardAngle(col, planet, col.targetAngle, strollSpeed, dt);
        col.aiTimer -= dt;
        if (arrived || col.aiTimer <= 0) {
            col.aiState = 'LOOKING_AROUND';
            col.aiTimer = 2.0 + Math.random() * 3.0;
            col.statusText = 'Observando el paisaje';
        }
        return;
    }

    if (col.aiState === 'LOOKING_AROUND') {
        col.vTangential = lerp(col.vTangential, 0, clamp(dt * 10, 0, 1));
        col.aiTimer -= dt;
        col.statusText = 'Observando el entorno';
        if (Math.random() < dt * 0.7) {
            col.facing = -col.facing;
            col.lookDir = col.facing;
        }
        if (col.aiTimer <= 0) {
            if (col.energy < 28 || (isNight && Math.random() < 0.55) || Math.random() < 0.22) {
                col.aiState = 'RETURNING_HOME';
                col.aiTimer = 25;
                col.statusText = 'Volviendo a casa';
            } else {
                // Buscar otro astronauta libre cercano para juntarse y conversar
                const candidate = findNearbyChatPartner(col, planet, refR);
                if (candidate && col.chatCooldown <= 0 && Math.random() < 0.6) {
                    col.aiState = 'SEEK_CHAT';
                    col.chatPartnerId = candidate.id;
                    col.aiTimer = 10;
                } else {
                    col.aiState = 'WANDERING';
                    col.aiTimer = 4 + Math.random() * 6;
                    col.targetAngle = wrapAngle(home.angle + ((Math.random() - 0.5) * 380) / refR);
                    col.statusText = 'Dando una vuelta por la zona';
                }
            }
        }
        return;
    }

    // Estado por defecto: WANDERING
    col.statusText = 'Caminando por la colonia';
    const arrived = stepColonistTowardAngle(col, planet, col.targetAngle, strollSpeed, dt);
    col.aiTimer -= dt;

    // Oportunidad espontánea de saludar/juntarse con alguien al cruzarse
    if (col.chatCooldown <= 0 && Math.random() < dt * 0.35) {
        const partner = findNearbyChatPartner(col, planet, refR);
        if (partner) {
            col.aiState = 'SEEK_CHAT';
            col.chatPartnerId = partner.id;
            col.aiTimer = 10;
            return;
        }
    }

    if (arrived || col.aiTimer <= 0) {
        col.aiState = 'LOOKING_AROUND';
        col.aiTimer = 2.4 + Math.random() * 3.8;
        if (Math.random() < 0.35) {
            col.emoteType = ['✦', '🔭'][Math.floor(Math.random() * 2)];
            col.emoteTimer = 2.0;
        }
    }
}

function findNearbyChatPartner(col, planet, refR) {
    let best = null;
    let bestDist = 175;
    for (const other of planetaryColonists) {
        if (!other || other.id === col.id || other.planetKey !== planet.key) continue;
        if (Boolean(other.onCeiling) !== Boolean(col.onCeiling)) continue;
        if (other.aiState !== 'WANDERING' && other.aiState !== 'LOOKING_AROUND') continue;
        if (other.chatCooldown > 0 || isWorkerBusy(other)) continue;
        const d = getArcDistance(planet, col.angle, other.angle, refR);
        if (d < bestDist) {
            bestDist = d;
            best = other;
        }
    }
    return best;
}

function runColonistCatchup(col, planet, elapsedSec) {
    if (!col || !planet || elapsedSec <= 2 || col.job === 'idle') return;
    // Simular transferencias proporcionales al tiempo fuera del planeta
    const ops = Math.min(8, Math.floor(elapsedSec / 14));
    for (let k = 0; k < ops; k++) {
        if (col.job === 'collect_minerals' || col.job === 'logistics_all') {
            const m = findBestExtractorForMinerals(planet, col);
            const dep = findBestDepotForMinerals(planet, col);
            if (m && dep && m.storedMinerals) {
                let free = Math.max(0, getDepotMineralCapacity(dep) - getDepotMineralTotal(dep));
                let budget = Math.min(free, col.carryMineralCap);
                if (!dep.storedMinerals) dep.storedMinerals = {};
                for (const [id, amt] of Object.entries(m.storedMinerals)) {
                    if (budget <= 0) break;
                    const take = Math.min(Math.floor(amt), budget);
                    if (take > 0) {
                        dep.storedMinerals[id] = (dep.storedMinerals[id] || 0) + take;
                        m.storedMinerals[id] -= take;
                        if (m.storedMinerals[id] <= 0.01) delete m.storedMinerals[id];
                        budget -= take;
                    }
                }
            }
        }
        if (col.job === 'collect_fuel' || col.job === 'logistics_all') {
            const m = findBestExtractorForFuel(planet, col);
            const dep = findBestDepotForFuelDeposit(planet, col);
            if (m && dep && (m.storedFuel || 0) > 1) {
                const free = Math.max(0, getDepotFuelCapacity(dep) - (dep.storedFuel || 0));
                const take = Math.min(free, m.storedFuel, col.carryFuelCap);
                if (take > 0.5) {
                    dep.storedFuel = (dep.storedFuel || 0) + take;
                    m.storedFuel -= take;
                }
            }
        }
        if (col.job === 'refuel_rockets' || col.job === 'logistics_all') {
            const rInfo = findRocketNeedingFuel(planet, col);
            if (rInfo) {
                const s = rInfo.shipObj;
                const need = Math.max(0, (s.maxFuel || 100) - (s.fuel || 0));
                if (need > 0.5) {
                    const dep = findBestDepotWithFuel(planet, col);
                    if (dep) {
                        const give = Math.min(need, dep.storedFuel, col.carryFuelCap);
                        s.fuel += give;
                        dep.storedFuel -= give;
                    } else {
                        const ext = findBestExtractorForFuel(planet, col);
                        if (ext) {
                            const give = Math.min(need, ext.storedFuel, col.carryFuelCap);
                            s.fuel += give;
                            ext.storedFuel -= give;
                        }
                    }
                }
            }
        }
    }
}

// ============================================================================
// 4. RENDERIZADO PROCEDURAL DE LOS ASTRONAUTAS COLONOS (SKIN ÚNICA POR ROL)
// ============================================================================
function drawColonyColonists(timeSec) {
    if (!planetaryColonists.length || typeof ctx === 'undefined') return;
    const nearby = (typeof getNearbyPlanets === 'function') ? getNearbyPlanets(camera.x, camera.y, 1) : [];
    if (!nearby.length) return;
    const nearbyMap = new Map();
    for (const p of nearby) nearbyMap.set(p.key, p);

    for (let i = 0; i < planetaryColonists.length; i++) {
        const col = planetaryColonists[i];
        if (col.aiState === 'AT_HOME') continue;
        const p = nearbyMap.get(col.planetKey);
        if (!p) continue;
        if (Math.hypot(col.x - camera.x, col.y - camera.y) > 3600) continue;

        const jobDef = COLONIST_JOBS[col.job] || COLONIST_JOBS.idle;
        const skin = col.skin || COLONIST_SUIT_VARIANTS[0];
        const sc = skin.heightScale || 0.92;
        const localNight = (typeof getStructureLocalNight === 'function')
            ? getStructureLocalNight(p, col.angle, col.x, col.y, 16, timeSec)
            : 0;

        // Haz de transferencia si está repostando un cohete
        if (col.aiState === 'REFUELING_ROCKET') {
            const rInfo = findRocketNeedingFuel(p, col);
            if (rInfo) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
                ctx.lineWidth = 1.8 + Math.sin(timeSec * 22) * 0.6;
                ctx.beginPath();
                ctx.moveTo(col.x, col.y);
                ctx.lineTo(rInfo.shipObj.x, rInfo.shipObj.y);
                ctx.stroke();
                ctx.restore();
            }
        }

        const isSel = ColonyBuildings.selectedRef && ColonyBuildings.selectedRef.kind === 'colonist' && ColonyBuildings.selectedRef.id === col.id;
        const isHov = ColonyBuildings.hoveredRef && ColonyBuildings.hoveredRef.kind === 'colonist' && ColonyBuildings.hoveredRef.id === col.id;

        ctx.save();
        ctx.translate(col.x, col.y);
        ctx.rotate(col.onCeiling ? (col.angle - Math.PI * 0.5) : (col.angle + Math.PI * 0.5));

        // Aro de selección
        if (isSel || isHov) {
            ctx.save();
            ctx.strokeStyle = isSel ? '#38bdf8' : '#fbbf24';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 2]);
            ctx.beginPath();
            ctx.arc(0, -9, 13, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Sombra de contacto
        const shAlpha = clamp(1 - col.altitude / 30, 0, 0.55);
        if (shAlpha > 0.02) {
            ctx.fillStyle = `rgba(0, 0, 0, ${shAlpha})`;
            ctx.beginPath();
            ctx.ellipse(0, 0.5, 5.8 * sc, 2.0 * sc, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.translate(0, -col.altitude);
        ctx.scale((col.facing || 1) * sc, sc);

        const isMoving = col.isGrounded && Math.abs(col.vTangential) > 1.2;
        const legPhase = isMoving ? col.walkCycle : 0;
        const chatWave = (col.aiState === 'CHATTING') ? Math.sin(timeSec * 6.5 + i) * 1.4 : 0;
        const bodyBob = isMoving ? Math.abs(Math.sin(legPhase)) * 1.1 : Math.sin(timeSec * 2.4 + i) * 0.35;

        const legL = Math.sin(legPhase) * 3.9;
        const legR = -Math.sin(legPhase) * 3.9;
        const armL = -Math.sin(legPhase) * 3.0;
        const armR = Math.sin(legPhase) * 3.0 + chatWave;

        // 1. Bufanda / Manto distintivo del rol (viento real + adaptación día/noche)
        const scarfSegs = 5;
        const cWind = (!col.inCavern && typeof samplePlanetWind === 'function') ? samplePlanetWind(p, col.x, col.y) : null;
        const cwX = (cWind && cWind.hasWind) ? (cWind.tangSpeed || 0) * (col.onCeiling ? -1 : 1) * (col.facing || 1) : 0;
        const cwY = (cWind && cWind.hasWind) ? -(cWind.radSpeed || 0) * (col.onCeiling ? -1 : 1) : 0;
        const cwNorm = (cWind && cWind.hasWind) ? clamp((cWind.speed || 0) / 140, 0, 1.5) : 0;
        const tailEndX = -(isMoving ? 17 : 10) + clamp(cwX * 0.14, -20, 20);
        const liftY = clamp(cwY * 0.1, -10, 6);
        const freq = 7.0 + cwNorm * 10.0 + (isMoving ? 2.0 : 0);
        const amp = (isMoving ? 2.6 : 1.5) + cwNorm * 2.8;
        const pts = [];
        for (let s = 0; s <= scarfSegs; s++) {
            const f = s / scarfSegs;
            const wy = Math.sin(timeSec * freq - f * 3.4 + i) * (f * amp);
            const wx = Math.cos(timeSec * (freq * 0.7) - f * 2.2) * (f * (0.8 + cwNorm * 1.1));
            pts.push({ x: f * tailEndX + wx, y: -11.2 + bodyBob - f * (isMoving ? 1.6 : 0.2) + f * liftY + wy });
        }
        const parseHex = (hx) => {
            const m = /^#?([0-9a-f]{6})$/i.exec(hx || '#38bdf8');
            if (!m) return [56, 189, 248];
            const n = parseInt(m[1], 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        };
        const scarfRgb = lerpRGB(parseHex(jobDef.scarf), [16, 22, 34], localNight * 0.92);
        const scarfColStr = rgbStr(scarfRgb, 1);
        const glowAlpha = lerp(0.24, 0.0, clamp(localNight * 1.15, 0, 1));
        ctx.save();
        ctx.lineCap = 'round';
        if (glowAlpha > 0.01) {
            ctx.strokeStyle = rgbStr(scarfRgb, glowAlpha);
            ctx.lineWidth = 3.6;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s].x, pts[s].y);
            ctx.stroke();
        }
        for (let s = 0; s < pts.length - 1; s++) {
            const f = s / (pts.length - 1);
            ctx.strokeStyle = scarfColStr;
            ctx.lineWidth = lerp(2.5, 0.9, f);
            ctx.beginPath();
            ctx.moveTo(pts[s].x, pts[s].y);
            ctx.lineTo(pts[s + 1].x, pts[s + 1].y);
            ctx.stroke();
        }
        ctx.restore();

        // 2. Pierna trasera
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-0.5, -5 + bodyBob);
        ctx.lineTo(legL * 0.7 - 0.5, -2);
        ctx.lineTo(legL, 0);
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(legL - 1, -1.2, 3.0, 1.3);

        // 3. Mochila PLSS con indicador del recurso transportado
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        safeRoundRect(ctx, -4.6, -12.8 + bodyBob, 3.6, 7.6, 1);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = jobDef.color;
        ctx.beginPath();
        ctx.arc(-2.8, -10.8 + bodyBob, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // 4. Brazo trasero
        const armBackCol = lerpRGB([148, 163, 184], [10, 14, 24], localNight * 0.92);
        ctx.strokeStyle = rgbStr(armBackCol, 1);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -10 + bodyBob);
        ctx.lineTo(armL * 0.7 - 1, -6 + bodyBob);
        ctx.lineTo(armL - 0.5, -3 + bodyBob);
        ctx.stroke();

        // 5. Torso con variante cromática del traje
        const c0 = lerpRGB(skin.suit0, [14, 20, 34], localNight * 0.92);
        const c1 = lerpRGB(skin.suit1, [6, 10, 18], localNight * 0.92);
        const sg = ctx.createLinearGradient(-3, -12, 3, -4);
        sg.addColorStop(0, rgbStr(c0, 1));
        sg.addColorStop(1, rgbStr(c1, 1));
        ctx.fillStyle = sg;
        ctx.strokeStyle = `rgba(255,255,255,${lerp(0.35, 0.08, localNight)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        safeRoundRect(ctx, -2.5, -11.8 + bodyBob, 5.0, 7.2, 1.7);
        ctx.fill();
        ctx.stroke();

        // Banda pectoral del rol
        ctx.fillStyle = jobDef.color;
        ctx.fillRect(-1.4, -10.2 + bodyBob, 2.8, 0.9);

        // 6. Pierna delantera
        ctx.strokeStyle = rgbStr(lerpRGB(skin.suit0, [12, 16, 28], localNight * 0.92), 1);
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(0.8, -5 + bodyBob);
        ctx.lineTo(legR * 0.7 + 0.8, -2);
        ctx.lineTo(legR + 0.8, 0);
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(legR, -1.3, 3.2, 1.4);

        // 7. Casco esférico y visor tintado especular
        ctx.fillStyle = rgbStr(lerpRGB(skin.suit0, [14, 20, 34], localNight * 0.92), 1);
        ctx.strokeStyle = rgbStr(armBackCol, 1);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(0.5, -14.3 + bodyBob, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const vg = ctx.createRadialGradient(2.3, -15 + bodyBob, 0.4, 1.7, -14.3 + bodyBob, 3.0);
        vg.addColorStop(0.0, rgbStr(lerpRGB(skin.visor0, [75, 90, 110], localNight * 0.8), 1));
        vg.addColorStop(0.5, rgbStr(lerpRGB(skin.visor1, [45, 58, 78], localNight * 0.82), 1));
        vg.addColorStop(1.0, rgbStr(lerpRGB(skin.visor2, [20, 28, 42], localNight * 0.86), 1));
        ctx.fillStyle = vg;
        ctx.beginPath();
        ctx.ellipse(1.7, -14.3 + bodyBob, 2.2, 2.0, 0.12, -Math.PI * 0.48, Math.PI * 0.48);
        ctx.lineTo(1.0, -12.5 + bodyBob);
        ctx.lineTo(1.0, -16.1 + bodyBob);
        ctx.closePath();
        ctx.fill();

        // Reflejo blanco en visor
        ctx.fillStyle = `rgba(255,255,255,${lerp(0.9, 0.25, localNight)})`;
        ctx.beginPath();
        ctx.arc(2.3, -15.2 + bodyBob, 0.5, 0, Math.PI * 2);
        ctx.fill();

        // 8. Brazo delantero + carga visual (mineral o canister de Éter)
        ctx.strokeStyle = rgbStr(c0, 1);
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(1.2, -9.8 + bodyBob);
        ctx.lineTo(armR * 0.45 + 3.0, -7.2 + bodyBob);
        ctx.lineTo(armR * 0.5 + 4.4, -6.2 + bodyBob);
        ctx.stroke();

        if ((col.carryFuel || 0) > 0.5) {
            ctx.fillStyle = '#fbbf24';
            ctx.strokeStyle = '#fef3c7';
            ctx.lineWidth = 0.6;
            ctx.fillRect(3.6, -8.5 + bodyBob, 2.8, 4.2);
            ctx.strokeRect(3.6, -8.5 + bodyBob, 2.8, 4.2);
        } else if (getColonistMineralTotal(col) > 0) {
            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#bae6fd';
            ctx.lineWidth = 0.6;
            ctx.fillRect(3.5, -8.0 + bodyBob, 3.4, 3.2);
            ctx.strokeRect(3.5, -8.0 + bodyBob, 3.4, 3.2);
        }

        ctx.restore();

        // 9. Burbuja sutil de conversación / estado social o selección (en coordenadas verticales de pantalla)
        if ((col.emoteTimer > 0 && col.emoteType) || isSel || isHov) {
            ctx.save();
            ctx.translate(col.x, col.y);
            ctx.rotate(col.onCeiling ? (col.angle - Math.PI * 0.5) : (col.angle + Math.PI * 0.5));
            ctx.translate(0, -col.altitude - 23 * sc);
            if (col.emoteTimer > 0 && col.emoteType) {
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                ctx.strokeStyle = jobDef.color;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                safeRoundRect(ctx, -10, -10, 20, 11, 5);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#f8fafc';
                ctx.font = 'bold 7px Plus Jakarta Sans, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(col.emoteType, 0, -2.5);
            }
            if (isSel || isHov) {
                ctx.font = 'bold 7px JetBrains Mono, monospace';
                const tag = `${col.name.split(' ')[0]} · ${jobDef.shortName}`;
                const tw = Math.max(46, ctx.measureText(tag).width + 8);
                ctx.fillStyle = 'rgba(6, 10, 20, 0.9)';
                ctx.strokeStyle = jobDef.color;
                ctx.lineWidth = 0.85;
                ctx.beginPath();
                safeRoundRect(ctx, -tw * 0.5, -24, tw, 12, 4);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#f8fafc';
                ctx.textAlign = 'center';
                ctx.fillText(tag, 0, -15.5);
            }
            ctx.restore();
        }
    }
}

function findColonistAtWorldPos(worldX, worldY, planet) {
    const p = planet || (typeof astronaut !== 'undefined' ? astronaut.planet : null);
    let best = null;
    let bestDist = Infinity;
    for (const c of planetaryColonists) {
        if (!c || c.aiState === 'AT_HOME') continue;
        if (p && c.planetKey !== p.key) continue;
        const d = Math.hypot(worldX - c.x, worldY - c.y);
        if (d < 18 && d < bestDist) {
            bestDist = d;
            best = c;
        }
    }
    return best;
}

// ============================================================================
// 5. INTERFAZ DE COLONIA, CONSTRUCCIÓN E INSPECTOR EN VIVO
// ============================================================================
let _colonyActiveTab = 'houses';
let _colonyPreviewAnimId = null;

function openColonyModal(tab = null) {
    const modal = document.getElementById('colonyModal');
    if (!modal) return;
    if (tab) _colonyActiveTab = tab;
    if (typeof closeAllHudDropdowns === 'function') closeAllHudDropdowns();
    modal.classList.remove('hidden');
    renderColonyModal();
    startColonyPreviewLoop();
}

function closeColonyModal() {
    const modal = document.getElementById('colonyModal');
    if (modal) modal.classList.add('hidden');
    if (_colonyPreviewAnimId) {
        cancelAnimationFrame(_colonyPreviewAnimId);
        _colonyPreviewAnimId = null;
    }
}

function toggleColonyModal() {
    const modal = document.getElementById('colonyModal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) openColonyModal();
    else closeColonyModal();
}

function startColonyPreviewLoop() {
    if (_colonyPreviewAnimId) cancelAnimationFrame(_colonyPreviewAnimId);
    function tick() {
        const modal = document.getElementById('colonyModal');
        if (!modal || modal.classList.contains('hidden')) return;
        const t = performance.now() * 0.001;
        document.querySelectorAll('.colony-preview-canvas').forEach(cvs => {
            const kind = cvs.getAttribute('data-kind');
            const typeId = cvs.getAttribute('data-type');
            if (kind && typeId) renderColonyPreviewCanvas(cvs, kind, typeId, t);
        });
        _colonyPreviewAnimId = requestAnimationFrame(tick);
    }
    _colonyPreviewAnimId = requestAnimationFrame(tick);
}

function getCurrentColonyPlanet() {
    if (typeof astronaut !== 'undefined' && astronaut.active && astronaut.planet) return astronaut.planet;
    if (typeof ship !== 'undefined' && ship.nearestPlanet) return ship.nearestPlanet;
    if (typeof getPlanet === 'function') return getPlanet(0, 0);
    return null;
}

function renderColonyModal() {
    const modal = document.getElementById('colonyModal');
    if (!modal || modal.classList.contains('hidden')) return;

    const p = getCurrentColonyPlanet();
    const pKey = p ? p.key : null;
    const pool = getCombinedBuildPool(pKey);

    // Actualizar pestañas
    ['houses', 'depots', 'colonists'].forEach(t => {
        const btn = document.getElementById(`tabColony_${t}`);
        const panel = document.getElementById(`panelColony_${t}`);
        const active = (_colonyActiveTab === t);
        if (btn) {
            btn.className = active
                ? 'px-3.5 py-1.5 rounded-xl font-display text-xs font-bold bg-amber-400/20 text-amber-200 border border-amber-400/50 cursor-pointer'
                : 'px-3.5 py-1.5 rounded-xl font-display text-xs font-semibold bg-white/[0.04] text-stone-400 border border-white/10 hover:text-white cursor-pointer';
        }
        if (panel) panel.classList.toggle('hidden', !active);
    });

    // Resumen de recursos disponibles (Traje + Cohete + Depósitos locales)
    const poolEl = document.getElementById('colonyResourcesPoolSummary');
    if (poolEl) {
        const f = pool.familyTotals;
        const suitCount = Object.values(pool.suitMap).reduce((a, b) => a + Math.floor(Number(b) || 0), 0);
        const shipCount = Object.values(pool.rocketMap).reduce((a, b) => a + Math.floor(Number(b) || 0), 0);
        const depCount = Object.values(pool.depotMap).reduce((a, b) => a + Math.floor(Number(b) || 0), 0);
        poolEl.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-mono-num">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="px-2 py-0.5 rounded-lg bg-slate-900/70 border border-white/10 text-stone-200">🪨 Estructural: <strong class="text-white">${f.structural || 0}</strong></span>
                    <span class="px-2 py-0.5 rounded-lg bg-slate-900/70 border border-white/10 text-amber-200">🔋 Conductor: <strong>${f.catalyst || 0}</strong></span>
                    <span class="px-2 py-0.5 rounded-lg bg-slate-900/70 border border-white/10 text-purple-200">💎 Avanzado: <strong>${f.advanced || 0}</strong></span>
                </div>
                <span class="text-[9.5px] text-stone-400">Traje: ${suitCount}u · Cohete: ${shipCount}u · Depósitos: ${depCount}u</span>
            </div>
        `;
    }

    const canBuildOnFoot = !!(typeof astronaut !== 'undefined' && astronaut.active && astronaut.planet);

    // 1. VIVIENDAS
    const housesGrid = document.getElementById('colonyHousesGrid');
    if (housesGrid) {
        housesGrid.innerHTML = HOUSE_ORDER.map(id => {
            const def = HOUSE_CATALOG[id];
            const freeTrial = (typeof isFirstHouseFree === 'function') && isFirstHouseFree(def.id);
            const affordable = freeTrial || canAffordColonyCost(def.cost, pKey);
            const bonusTxt = def.workSpeedMult > 1 ? `+${Math.round((def.workSpeedMult - 1) * 100)}% eficiencia` : 'Estándar';
            const costHtml = freeTrial
                ? '<span class="px-2 py-0.5 rounded-md border text-[9.5px] font-mono-num bg-emerald-500/20 text-emerald-200 border-emerald-400/50 font-bold">🎁 1ª Casa Gratis (Prueba)</span>'
                : formatColonyCostBadges(def.cost, pKey);
            return `
                <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-2.5">
                    <div>
                        <div class="relative w-full h-28 rounded-xl overflow-hidden mb-2.5 border border-white/10 bg-black/50">
                            <canvas class="colony-preview-canvas w-full h-full block" width="240" height="112" data-kind="house" data-type="${def.id}"></canvas>
                            <span class="absolute top-2 left-2 text-[9px] font-mono-num font-bold px-2 py-0.5 rounded-full bg-black/70 border border-white/15" style="color:${def.accent}">NIVEL ${def.tier}</span>
                            <span class="absolute top-2 right-2 text-[9.5px] font-mono-num font-bold px-2 py-0.5 rounded-full bg-black/70 text-white border border-white/15">👨‍🚀 ${def.capacity} ${def.capacity === 1 ? 'Astronauta' : 'Astronautas'}</span>
                        </div>
                        <div class="flex items-center justify-between gap-2">
                            <h4 class="font-display text-sm font-bold text-white truncate">${def.name}</h4>
                            <span class="text-[9px] font-mono-num text-emerald-300 shrink-0">${bonusTxt}</span>
                        </div>
                        <p class="text-[10.5px] text-stone-400 mt-1 leading-snug">${def.desc}</p>
                        <div class="flex flex-wrap gap-1 mt-2">${costHtml}</div>
                    </div>
                    <div class="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/10">
                        <button data-build-here-house="${def.id}" class="py-1.5 px-2 rounded-xl font-mono-num text-[10px] font-bold cursor-pointer ${affordable && canBuildOnFoot ? 'bg-amber-300 text-stone-950 hover:brightness-110' : 'bg-white/10 text-stone-500 cursor-not-allowed'}" ${affordable && canBuildOnFoot ? '' : 'disabled'} title="${canBuildOnFoot ? 'Construir en la posición del astronauta' : 'Desembarca (EVA) para construir aquí'}">⚡ Aquí</button>
                        <button data-place-house="${def.id}" class="py-1.5 px-2 rounded-xl font-mono-num text-[10px] font-bold cursor-pointer ${affordable && p ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/45 hover:bg-cyan-500/30' : 'bg-white/10 text-stone-500 cursor-not-allowed'}" ${affordable && p ? '' : 'disabled'}>🎯 Colocar</button>
                    </div>
                </div>
            `;
        }).join('');

        housesGrid.querySelectorAll('button[data-build-here-house]').forEach(btn => {
            btn.onclick = () => {
                if (typeof astronaut === 'undefined' || !astronaut.active || !astronaut.planet) return;
                const res = buildHouseAt(astronaut.planet, astronaut.angle, btn.dataset.buildHereHouse, {
                    inCavern: !!astronaut.inCavern,
                    onCeiling: !!astronaut.onCeiling,
                    refR: astronaut.radialPos
                });
                if (res) renderColonyModal();
            };
        });
        housesGrid.querySelectorAll('button[data-place-house]').forEach(btn => {
            btn.onclick = () => {
                closeColonyModal();
                ColonyBuildings.enterPlacementMode('house', btn.dataset.placeHouse);
            };
        });
    }

    // 2. ALMACENAMIENTOS Y DEPÓSITOS
    const depotsGrid = document.getElementById('colonyDepotsGrid');
    if (depotsGrid) {
        depotsGrid.innerHTML = DEPOT_ORDER.map(id => {
            const def = DEPOT_CATALOG[id];
            const affordable = canAffordColonyCost(def.cost, pKey);
            const capText = [
                def.storesFuel ? `⚡ ${def.fuelCapacities[0]}L Éter` : '',
                def.storesMinerals ? `🪨 ${def.mineralCapacities[0]}u Min.` : ''
            ].filter(Boolean).join(' · ');
            return `
                <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-2.5">
                    <div>
                        <div class="relative w-full h-28 rounded-xl overflow-hidden mb-2.5 border border-white/10 bg-black/50">
                            <canvas class="colony-preview-canvas w-full h-full block" width="240" height="112" data-kind="depot" data-type="${def.id}"></canvas>
                            <span class="absolute top-2 left-2 text-[9px] font-mono-num font-bold px-2 py-0.5 rounded-full bg-black/70 border border-white/15" style="color:${def.accent}">${def.code}</span>
                            <span class="absolute top-2 right-2 text-[9px] font-mono-num font-bold px-2 py-0.5 rounded-full bg-black/70 text-white border border-white/15">${capText}</span>
                        </div>
                        <h4 class="font-display text-sm font-bold text-white">${def.name}</h4>
                        <p class="text-[10.5px] text-stone-400 mt-1 leading-snug">${def.desc}</p>
                        <div class="flex flex-wrap gap-1 mt-2">${formatColonyCostBadges(def.cost, pKey)}</div>
                    </div>
                    <div class="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/10">
                        <button data-build-here-depot="${def.id}" class="py-1.5 px-2 rounded-xl font-mono-num text-[10px] font-bold cursor-pointer ${affordable && canBuildOnFoot ? 'bg-amber-300 text-stone-950 hover:brightness-110' : 'bg-white/10 text-stone-500 cursor-not-allowed'}" ${affordable && canBuildOnFoot ? '' : 'disabled'}>⚡ Aquí</button>
                        <button data-place-depot="${def.id}" class="py-1.5 px-2 rounded-xl font-mono-num text-[10px] font-bold cursor-pointer ${affordable && p ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/45 hover:bg-cyan-500/30' : 'bg-white/10 text-stone-500 cursor-not-allowed'}" ${affordable && p ? '' : 'disabled'}>🎯 Colocar</button>
                    </div>
                </div>
            `;
        }).join('');

        depotsGrid.querySelectorAll('button[data-build-here-depot]').forEach(btn => {
            btn.onclick = () => {
                if (typeof astronaut === 'undefined' || !astronaut.active || !astronaut.planet) return;
                const res = buildDepotAt(astronaut.planet, astronaut.angle, btn.dataset.buildHereDepot, {
                    inCavern: !!astronaut.inCavern,
                    onCeiling: !!astronaut.onCeiling,
                    refR: astronaut.radialPos
                });
                if (res) renderColonyModal();
            };
        });
        depotsGrid.querySelectorAll('button[data-place-depot]').forEach(btn => {
            btn.onclick = () => {
                closeColonyModal();
                ColonyBuildings.enterPlacementMode('depot', btn.dataset.placeDepot);
            };
        });
    }

    // 3. ASTRONAUTAS Y ASIGNACIÓN DE TRABAJOS
    const colList = document.getElementById('colonyColonistsList');
    if (colList) {
        const localCols = pKey ? planetaryColonists.filter(c => c && c.planetKey === pKey) : planetaryColonists;
        const localHouses = pKey ? planetaryHouses.filter(h => h && h.planetKey === pKey) : planetaryHouses;
        const localDepots = pKey ? planetaryDepots.filter(d => d && d.planetKey === pKey) : planetaryDepots;

        const statsEl = document.getElementById('colonyStatsLine');
        if (statsEl) {
            statsEl.textContent = `${p ? p.name : 'Sistema'} · ${localHouses.length} Viviendas · ${localDepots.length} Depósitos · ${localCols.length} Astronautas`;
        }

        if (localCols.length === 0) {
            colList.innerHTML = `<div class="p-5 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-xs text-stone-400">Aún no hay viviendas ni astronautas en ${p ? p.name : 'este planeta'}. Construye una <strong class="text-amber-300">Cápsula o Casa</strong> en la pestaña Viviendas.</div>`;
        } else {
            colList.innerHTML = localCols.map(c => {
                const jDef = COLONIST_JOBS[c.job] || COLONIST_JOBS.idle;
                const house = planetaryHouses.find(h => h && h.id === c.homeHouseId);
                const carryTxt = [];
                if ((c.carryFuel || 0) > 0.2) carryTxt.push(`⚡ ${c.carryFuel.toFixed(1)}L`);
                if (getColonistMineralTotal(c) > 0) carryTxt.push(`🪨 ${getColonistMineralTotal(c)}u`);

                const jobBtns = Object.values(COLONIST_JOBS).map(j => {
                    const active = c.job === j.id;
                    return `<button data-set-job="${c.id}|${j.id}" class="px-2 py-1 rounded-lg text-[9.5px] font-mono-num border cursor-pointer transition-all ${active ? 'bg-white/20 text-white border-white/50 font-bold' : 'bg-black/30 text-stone-400 border-white/10 hover:text-white'}" style="${active ? `border-color:${j.color}; color:${j.color}` : ''}" title="${j.desc}">${j.icon} ${j.shortName}</button>`;
                }).join('');

                return `
                    <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="w-3 h-3 rounded-full shrink-0" style="background:${jDef.color}"></span>
                                <div class="min-w-0">
                                    <div class="font-display text-xs font-bold text-white truncate">${c.name} <span class="text-[9.5px] font-mono-num text-stone-400 font-normal">(${house ? house.shortName : 'Sin hogar'})</span></div>
                                    <div class="text-[10px] font-mono-num text-stone-300">${c.statusText || jDef.name}${carryTxt.length ? ' · Carga: ' + carryTxt.join(' ') : ''}</div>
                                </div>
                            </div>
                            <span class="text-[9px] font-mono-num px-2 py-0.5 rounded-full bg-black/40 border border-white/10" style="color:${jDef.color}">${jDef.icon} ${jDef.name}</span>
                        </div>
                        <div class="flex flex-wrap gap-1">${jobBtns}</div>
                    </div>
                `;
            }).join('');

            colList.querySelectorAll('button[data-set-job]').forEach(btn => {
                btn.onclick = () => {
                    const [cid, jid] = btn.dataset.setJob.split('|');
                    setColonistJob(cid, jid);
                    renderColonyModal();
                };
            });
        }
    }
}

function assignBulkColonyJob(mode) {
    const p = getCurrentColonyPlanet();
    const list = p ? planetaryColonists.filter(c => c && c.planetKey === p.key) : planetaryColonists;
    if (!list.length) return;
    if (mode === 'balanced') {
        const cycle = ['logistics_all', 'collect_minerals', 'collect_fuel', 'refuel_rockets'];
        list.forEach((c, idx) => setColonistJob(c.id, cycle[idx % cycle.length]));
    } else {
        list.forEach(c => setColonistJob(c.id, mode));
    }
    renderColonyModal();
}

// ============================================================================
// 6. INSPECTOR FLOTANTE AL HACER CLIC EN CASA, DEPÓSITO O ASTRONAUTA
// ============================================================================
function openColonyInspector(ref) {
    ColonyBuildings.selectedRef = ref;
    const panel = document.getElementById('colonyInspectorPanel');
    if (!panel) return;
    panel.classList.remove('hidden');
    renderColonyInspector();
}

function closeColonyInspector() {
    ColonyBuildings.selectedRef = null;
    const panel = document.getElementById('colonyInspectorPanel');
    if (panel) panel.classList.add('hidden');
}

function renderColonyInspector() {
    const panel = document.getElementById('colonyInspectorPanel');
    const body = document.getElementById('colonyInspectorBody');
    const title = document.getElementById('colonyInspectorTitle');
    const badge = document.getElementById('colonyInspectorBadge');
    if (!panel || !body || panel.classList.contains('hidden')) return;

    const ref = ColonyBuildings.selectedRef;
    if (!ref) { closeColonyInspector(); return; }

    if (ref.kind === 'house') {
        const h = planetaryHouses.find(x => x && x.id === ref.id);
        if (!h) { closeColonyInspector(); return; }
        const def = HOUSE_CATALOG[h.typeId] || {};
        const residents = planetaryColonists.filter(c => c && c.homeHouseId === h.id);
        if (badge) badge.textContent = `VIVIENDA NV.${h.tier || 1}`;
        if (title) title.textContent = h.name;

        const bulkBtns = Object.values(COLONIST_JOBS).map(j => `
            <button data-house-job="${j.id}" class="px-2 py-1 rounded-lg text-[9px] font-mono-num bg-white/[0.06] hover:bg-white/15 border border-white/10 text-stone-200 cursor-pointer">${j.icon} ${j.shortName}</button>
        `).join('');

        const resHtml = residents.map(c => {
            const jDef = COLONIST_JOBS[c.job] || COLONIST_JOBS.idle;
            const opts = Object.values(COLONIST_JOBS).map(j =>
                `<option value="${j.id}" ${c.job === j.id ? 'selected' : ''}>${j.icon} ${j.shortName}</option>`
            ).join('');
            return `
                <div class="p-2 rounded-xl bg-black/35 border border-white/10 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                        <div class="text-[11px] font-display font-bold text-white truncate">${c.name}</div>
                        <div class="text-[9px] font-mono-num truncate" style="color:${jDef.color}">${c.statusText}</div>
                    </div>
                    <select data-res-job="${c.id}" class="bg-slate-900 border border-white/15 rounded-lg px-1.5 py-1 text-[9.5px] font-mono-num text-white cursor-pointer">${opts}</select>
                </div>
            `;
        }).join('');

        body.innerHTML = `
            <div class="text-[10px] font-mono-num text-stone-300">Capacidad: <strong class="text-white">${residents.length} / ${h.capacity}</strong> astronautas · Eficiencia <strong class="text-emerald-300">${Math.round((def.workSpeedMult || 1) * 100)}%</strong></div>
            <div class="space-y-1">
                <span class="text-[9px] font-mono-num uppercase text-stone-400 block">Asignar trabajo a toda la casa</span>
                <div class="flex flex-wrap gap-1">${bulkBtns}</div>
            </div>
            <div class="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">${resHtml}</div>
            <div class="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10">
                <button id="btnInspHouseOut" class="py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-[9.5px] font-mono-num font-bold cursor-pointer">👋 Llamar Fuera</button>
                <button id="btnInspHouseIn" class="py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-stone-200 text-[9.5px] font-mono-num font-bold cursor-pointer">🏠 Descansar</button>
            </div>
            <button id="btnInspHouseDemolish" class="w-full py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-400/35 text-rose-200 text-[9.5px] font-mono-num font-bold cursor-pointer">🗑️ Desmantelar Casa (85% reembolso)</button>
        `;

        body.querySelectorAll('button[data-house-job]').forEach(b => {
            b.onclick = () => { setHouseResidentsJob(h.id, b.dataset.houseJob); renderColonyInspector(); };
        });
        body.querySelectorAll('select[data-res-job]').forEach(sel => {
            sel.onchange = () => { setColonistJob(sel.dataset.resJob, sel.value); renderColonyInspector(); };
        });
        const btnOut = document.getElementById('btnInspHouseOut');
        if (btnOut) btnOut.onclick = () => { callHouseResidentsOut(h.id); renderColonyInspector(); };
        const btnIn = document.getElementById('btnInspHouseIn');
        if (btnIn) btnIn.onclick = () => { sendHouseResidentsHome(h.id); renderColonyInspector(); };
        const btnDem = document.getElementById('btnInspHouseDemolish');
        if (btnDem) btnDem.onclick = () => { demolishHouse(h); closeColonyInspector(); };
    } else if (ref.kind === 'depot') {
        const d = planetaryDepots.find(x => x && x.id === ref.id);
        if (!d) { closeColonyInspector(); return; }
        const def = DEPOT_CATALOG[d.typeId];
        if (badge) badge.textContent = `DEPÓSITO NV.${d.level || 1}`;
        if (title) title.textContent = d.name;

        const fCap = getDepotFuelCapacity(d);
        const mCap = getDepotMineralCapacity(d);
        const mTotal = getDepotMineralTotal(d);
        const minEntries = Object.entries(d.storedMinerals || {}).filter(([, q]) => Math.floor(q) > 0);
        const minHtml = minEntries.length
            ? minEntries.map(([id, q]) => {
                const rd = (typeof getResourceDef === 'function') ? getResourceDef(id) : { icon: '◆', shortName: id, color: '#cbd5e1' };
                return `<span class="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[9.5px] font-mono-num" style="color:${rd.color}">${rd.icon} ${rd.shortName}: <strong>${Math.floor(q)}</strong></span>`;
            }).join(' ')
            : '<span class="text-[10px] text-stone-400 italic">Sin minerales almacenados</span>';

        const nextCost = d.level < 3 ? def.upgradeCosts[d.level] : null;
        const canUp = nextCost ? canAffordColonyCost(nextCost, d.planetKey) : false;

        body.innerHTML = `
            ${def.storesFuel ? `
                <div class="p-2 rounded-xl bg-black/35 border border-amber-400/25 space-y-1.5">
                    <div class="flex justify-between text-[10px] font-mono-num">
                        <span class="text-amber-300">⚡ Éter Combustible</span>
                        <strong class="text-white">${(d.storedFuel || 0).toFixed(1)} / ${fCap} L</strong>
                    </div>
                    <div class="grid grid-cols-3 gap-1">
                        <button id="btnDepFuelRocket" class="py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-200 text-[9px] font-mono-num font-bold cursor-pointer">🚀 Al Cohete</button>
                        <button id="btnDepFuelSuit" class="py-1 rounded-lg bg-white/10 hover:bg-white/20 text-stone-200 text-[9px] font-mono-num cursor-pointer">⬇ Al Traje</button>
                        <button id="btnDepSuitFuel" class="py-1 rounded-lg bg-white/10 hover:bg-white/20 text-stone-200 text-[9px] font-mono-num cursor-pointer">⬆ Guardar</button>
                    </div>
                </div>
            ` : ''}
            ${def.storesMinerals ? `
                <div class="p-2 rounded-xl bg-black/35 border border-sky-400/25 space-y-1.5">
                    <div class="flex justify-between text-[10px] font-mono-num">
                        <span class="text-sky-300">🪨 Minerales</span>
                        <strong class="text-white">${mTotal} / ${mCap} u</strong>
                    </div>
                    <div class="flex flex-wrap gap-1 max-h-24 overflow-y-auto">${minHtml}</div>
                    <div class="grid grid-cols-2 gap-1">
                        <button id="btnDepMinTake" class="py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-[9px] font-mono-num font-bold cursor-pointer">⬇ Retirar Todo</button>
                        <button id="btnDepMinPut" class="py-1 rounded-lg bg-white/10 hover:bg-white/20 text-stone-200 text-[9px] font-mono-num cursor-pointer">⬆ Depositar Traje</button>
                    </div>
                </div>
            ` : ''}
            ${nextCost ? `
                <div class="p-2 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-[9.5px] font-mono-num text-emerald-300">Ampliar a Nivel ${d.level + 1}</span>
                        <button id="btnDepUpgrade" class="px-2.5 py-1 rounded-lg text-[9.5px] font-mono-num font-bold cursor-pointer ${canUp ? 'bg-emerald-400 text-stone-950' : 'bg-white/10 text-stone-500 cursor-not-allowed'}" ${canUp ? '' : 'disabled'}>Mejorar</button>
                    </div>
                    <div class="flex flex-wrap gap-1">${formatColonyCostBadges(nextCost, d.planetKey)}</div>
                </div>
            ` : '<div class="text-[9.5px] font-mono-num text-purple-300">★ Depósito al Nivel Máximo (Nv.3)</div>'}
            <button id="btnInspDepDemolish" class="w-full py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-400/35 text-rose-200 text-[9.5px] font-mono-num font-bold cursor-pointer">🗑️ Desmantelar Depósito</button>
        `;

        const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = () => { fn(); renderColonyInspector(); }; };
        bind('btnDepFuelRocket', () => transferDepotFuelToRocket(d));
        bind('btnDepFuelSuit', () => transferDepotFuelToSuit(d));
        bind('btnDepSuitFuel', () => transferSuitFuelToDepot(d));
        bind('btnDepMinTake', () => transferDepotMineralsToSuit(d));
        bind('btnDepMinPut', () => transferSuitMineralsToDepot(d));
        bind('btnDepUpgrade', () => upgradeDepot(d));
        const btnDem = document.getElementById('btnInspDepDemolish');
        if (btnDem) btnDem.onclick = () => { demolishDepot(d); closeColonyInspector(); };
    } else if (ref.kind === 'colonist') {
        const c = planetaryColonists.find(x => x && x.id === ref.id);
        if (!c) { closeColonyInspector(); return; }
        const house = planetaryHouses.find(h => h && h.id === c.homeHouseId);
        const jDef = COLONIST_JOBS[c.job] || COLONIST_JOBS.idle;
        if (badge) badge.textContent = 'ASTRONAUTA COLONO';
        if (title) title.textContent = c.name;

        const jobBtns = Object.values(COLONIST_JOBS).map(j => {
            const active = c.job === j.id;
            return `<button data-col-job="${j.id}" class="w-full py-1.5 px-2.5 rounded-xl text-left text-[10px] font-mono-num border flex items-center justify-between cursor-pointer ${active ? 'bg-white/15 border-white/40 text-white font-bold' : 'bg-black/30 border-white/10 text-stone-300 hover:bg-white/10'}"><span>${j.icon} ${j.name}</span>${active ? '<span class="text-emerald-300">ACTIVO</span>' : ''}</button>`;
        }).join('');

        body.innerHTML = `
            <div class="p-2 rounded-xl bg-black/35 border border-white/10 space-y-1 text-[10px] font-mono-num">
                <div class="text-stone-300">Hogar: <strong class="text-white">${house ? house.name : 'Sin asignar'}</strong></div>
                <div style="color:${jDef.color}">Estado: <strong>${c.statusText}</strong></div>
                <div class="text-stone-400">Carga: ⚡ ${(c.carryFuel || 0).toFixed(1)}L · 🪨 ${getColonistMineralTotal(c)}u</div>
            </div>
            <div class="space-y-1">
                <span class="text-[9px] font-mono-num uppercase text-stone-400 block">Asignar Trabajo</span>
                ${jobBtns}
            </div>
        `;
        body.querySelectorAll('button[data-col-job]').forEach(btn => {
            btn.onclick = () => { setColonistJob(c.id, btn.dataset.colJob); renderColonyInspector(); };
        });
    }
}

let _lastColonyInspRefresh = 0;
function refreshColonyUI(nowMs = performance.now()) {
    if (nowMs - _lastColonyInspRefresh < 220) return;
    _lastColonyInspRefresh = nowMs;
    const modal = document.getElementById('colonyModal');
    if (modal && !modal.classList.contains('hidden')) renderColonyModal();
    const insp = document.getElementById('colonyInspectorPanel');
    if (insp && !insp.classList.contains('hidden')) renderColonyInspector();
}
