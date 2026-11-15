/**
 * ÉTER — Sistema de Mundos, Sesiones y Versiones en Caché Local (localStorage)
 * Permite:
 * - Creación automática de un mundo inicial y auto-guardado continuo.
 * - Múltiples mundos independientes (cada uno con su semilla, bases, flota, códice).
 * - Múltiples versiones / momentos con nombre dentro de cada mundo.
 * - Respaldo e importación JSON.
 */

const ETER_SAVES_KEY = 'eter_worlds_v1';
const AUTO_SAVE_INTERVAL_MS = 20000;

let worldStore = {
    version: 1,
    activeWorldId: null,
    worlds: []
};

let autoSaveTimerId = null;
let pendingConfirmAction = null; // { type, id, expiresAt }

// --- UTILIDADES ---

function genSaveId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function generateRandomCosmicSeed() {
    const prefixes = ['COSMOS', 'ASTRAL', 'NOVA', 'VOYD', 'ZENITH', 'CHRONOS', 'PULSAR', 'NEBULA', 'ORION', 'SOL', 'ALTEA', 'VESPER'];
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${Math.floor(Math.random() * 8999 + 1000)}`;
}

function safeDeepClone(obj) {
    if (obj === null || obj === undefined) return obj;
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        return null;
    }
}

function escapeHtmlSave(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatRelativeTime(ts) {
    if (!ts) return 'Recién';
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 10) return 'Justo ahora';
    if (diffSec < 60) return `Hace ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `Hace ${diffHr} h`;
    const d = new Date(ts);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function resolvePlanetByKey(planetKey) {
    if (!planetKey || typeof getSectorPlanets !== 'function') return null;
    const parts = String(planetKey).split(':');
    if (parts.length !== 2) return null;
    const coords = parts[0].split(',');
    const sx = Number(coords[0]);
    const sy = Number(coords[1]);
    if (Number.isNaN(sx) || Number.isNaN(sy)) return null;
    const list = getSectorPlanets(sx, sy);
    return list.find(p => p.key === planetKey) || null;
}

function getCurrentLocationLabel() {
    if (typeof astronaut !== 'undefined' && astronaut.active && astronaut.planet) {
        return `${astronaut.planet.name} (EVA)`;
    }
    if (typeof getNearbyPlanets === 'function' && typeof ship !== 'undefined') {
        const nearby = getNearbyPlanets(ship.x, ship.y, 1);
        let best = null;
        let bestAlt = Infinity;
        for (const p of nearby) {
            const d = Math.hypot(ship.x - p.x, ship.y - p.y);
            const sr = typeof getSurfaceRadius === 'function'
                ? getSurfaceRadius(p, Math.atan2(ship.y - p.y, ship.x - p.x))
                : p.radius;
            const alt = d - sr;
            if (alt < bestAlt) {
                bestAlt = alt;
                best = p;
            }
        }
        if (best) {
            if (bestAlt < 120) return `Superficie de ${best.name}`;
            if (bestAlt < 2400) return `Órbita de ${best.name}`;
            return `Cerca de ${best.name}`;
        }
    }
    return 'Espacio Profundo';
}

// --- CAPTURA Y RESTAURACIÓN DE ESTADO DEL MUNDO ---

function captureCurrentGameState() {
    const harvestedNodes = [];
    if (typeof sectors !== 'undefined' && sectors instanceof Map) {
        for (const planetList of sectors.values()) {
            if (!Array.isArray(planetList)) continue;
            for (const p of planetList) {
                if (!p || !Array.isArray(p.nodes)) continue;
                for (let i = 0; i < p.nodes.length; i++) {
                    if (p.nodes[i] && p.nodes[i].harvested) {
                        harvestedNodes.push({ key: p.key, idx: i });
                    }
                }
            }
        }
    }
    // Incluir nodos pendientes que aún no se hayan regenerado en sectores lejanos
    if (typeof window !== 'undefined' && window._pendingHarvestedNodes instanceof Map) {
        const seen = new Set(harvestedNodes.map(n => `${n.key}#${n.idx}`));
        for (const [pKey, idxSet] of window._pendingHarvestedNodes.entries()) {
            for (const idx of idxSet) {
                if (!seen.has(`${pKey}#${idx}`)) {
                    harvestedNodes.push({ key: pKey, idx });
                }
            }
        }
    }

    const codexEntries = [];
    if (typeof codexPlanets !== 'undefined' && codexPlanets instanceof Map) {
        for (const [k, v] of codexPlanets.entries()) {
            codexEntries.push([k, safeDeepClone(v)]);
        }
    }

    const waypointsList = [];
    if (typeof window !== 'undefined' && window.navWaypoints instanceof Map) {
        for (const p of window.navWaypoints.values()) {
            if (p && p.key) waypointsList.push(p.key);
        }
    }

    const shipSnap = typeof ship !== 'undefined' ? {
        x: ship.x,
        y: ship.y,
        vx: ship.vx,
        vy: ship.vy,
        angle: ship.angle,
        av: ship.av,
        mass: ship.mass,
        inertia: ship.inertia,
        hull: ship.hull,
        maxHull: ship.maxHull,
        fuel: ship.fuel,
        maxFuel: ship.maxFuel,
        modelKey: ship.modelKey || 'vesper',
        scale: ship.scale || 1.0,
        passengers: ship.passengers || 1,
        smokeScale: ship.smokeScale || 1.0,
        artifacts: ship.artifacts || 0,
        throttle: ship.throttle || 0,
        isGrounded: !!ship.isGrounded,
        sasEnabled: ship.sasEnabled !== false,
        sasHoldAngle: ship.sasHoldAngle ?? null,
        sasAssistWeight: ship.sasAssistWeight ?? 0,
        headlightsOn: !!ship.headlightsOn,
        gearCompression: ship.gearCompression ?? 0,
        leftGearSpring: safeDeepClone(ship.leftGearSpring || { pos: 0, vel: 0, target: 0 }),
        rightGearSpring: safeDeepClone(ship.rightGearSpring || { pos: 0, vel: 0, target: 0 }),
        hullTemp: ship.hullTemp || 0,
        scorch: safeDeepClone(ship.scorch || { amount: 0, dirX: 1, dirY: 0, temp: 0 }),
        orbitMode: ship.orbitMode || 'off',
        orbitDir: ship.orbitDir || 1,
        orbitAngle: ship.orbitAngle || 0,
        orbitTargetRadius: ship.orbitTargetRadius || 0,
        orbitPlanetKey: ship.orbitPlanetKey || null,
        customRocket: safeDeepClone(ship.customRocket || null)
    } : null;

    const cameraSnap = typeof camera !== 'undefined' ? {
        x: camera.x,
        y: camera.y,
        zoom: camera.zoom,
        targetZoom: camera.targetZoom,
        rotation: camera.rotation,
        targetRotation: camera.targetRotation,
        userZoomMult: camera.userZoomMult || 1.0
    } : null;

    const astronautSnap = typeof astronaut !== 'undefined' ? {
        active: !!astronaut.active,
        planetKey: astronaut.planet ? astronaut.planet.key : null,
        angle: astronaut.angle,
        altitude: astronaut.altitude,
        vTangential: astronaut.vTangential,
        vRadial: astronaut.vRadial,
        facing: astronaut.facing,
        isGrounded: !!astronaut.isGrounded,
        jetpackFuel: astronaut.jetpackFuel,
        suitO2: astronaut.suitO2,
        headlamp: !!astronaut.headlamp,
        x: astronaut.x,
        y: astronaut.y,
        selectedBaseLevel: astronaut.selectedBaseLevel || 1,
        selectedRocketModel: astronaut.selectedRocketModel || 'starship',
        fuelReserve: Number(astronaut.fuelReserve) || 0,
        fuelReserveLevel: astronaut.fuelReserveLevel || 1,
        inventory: safeDeepClone(astronaut.inventory || {}),
        prospectedZones: safeDeepClone(astronaut.prospectedZones || {}),
        plantedBeacons: safeDeepClone(astronaut.plantedBeacons || [])
    } : null;

    return {
        seed: typeof universeSeed !== 'undefined' ? universeSeed : 'ASTRAL-7',
        cosmosSimTime: typeof cosmosSimTime !== 'undefined' ? cosmosSimTime : 0,
        ship: shipSnap,
        camera: cameraSnap,
        astronaut: astronautSnap,
        codexEntries,
        waypointsList,
        planetaryBases: typeof planetaryBases !== 'undefined' ? safeDeepClone(planetaryBases) : [],
        planetaryExtractors: typeof planetaryExtractors !== 'undefined' ? safeDeepClone(planetaryExtractors) : [],
        parkedShips: typeof parkedShips !== 'undefined' ? safeDeepClone(parkedShips) : [],
        freeVessels: typeof freeVessels !== 'undefined' ? safeDeepClone(freeVessels) : [],
        harvestedNodes
    };
}

function buildStateSummary(state) {
    const s = state || {};
    return {
        location: getCurrentLocationLabel(),
        cores: s.ship ? (s.ship.artifacts || 0) : 0,
        bases: Array.isArray(s.planetaryBases) ? s.planetaryBases.length : 0,
        beacons: s.astronaut && Array.isArray(s.astronaut.plantedBeacons) ? s.astronaut.plantedBeacons.length : 0,
        codexCount: Array.isArray(s.codexEntries) ? s.codexEntries.length : 1,
        hull: s.ship ? Math.round(s.ship.hull ?? 100) : 100,
        fuel: s.ship ? Math.round(s.ship.fuel ?? 100) : 100,
        mode: s.astronaut && s.astronaut.active ? 'EVA' : 'Sonda'
    };
}

function clearTransientEffects() {
    if (typeof smokePuffs !== 'undefined') smokePuffs.length = 0;
    if (typeof reentryParticles !== 'undefined') reentryParticles.length = 0;
    if (typeof particles !== 'undefined') particles.length = 0;
    if (typeof sparks !== 'undefined') sparks.length = 0;
    if (typeof sonarPulses !== 'undefined') sonarPulses.length = 0;
    if (typeof shockwaves !== 'undefined') shockwaves.length = 0;
    if (typeof debris !== 'undefined') debris.length = 0;
    if (typeof rcsParticles !== 'undefined') rcsParticles.length = 0;
    if (typeof liquidRipples !== 'undefined') liquidRipples.length = 0;
    if (typeof biomeParticles !== 'undefined') biomeParticles.length = 0;
}

function restoreGameState(state) {
    if (!state) return false;

    // 1. Semilla y tiempo cósmico
    universeSeed = state.seed || 'ASTRAL-7';
    if (typeof cosmosSimTime !== 'undefined' && typeof state.cosmosSimTime === 'number') {
        cosmosSimTime = state.cosmosSimTime;
    }

    // 2. Preparar nodos recolectados pendientes antes de regenerar sectores
    const pendingMap = new Map();
    if (Array.isArray(state.harvestedNodes)) {
        for (const item of state.harvestedNodes) {
            if (!item || !item.key) continue;
            if (!pendingMap.has(item.key)) pendingMap.set(item.key, new Set());
            pendingMap.get(item.key).add(item.idx);
        }
    }
    window._pendingHarvestedNodes = pendingMap;

    // 3. Bases planetarias, extractores, naves estacionadas y vehículos libres
    if (typeof planetaryBases !== 'undefined') {
        planetaryBases.length = 0;
        if (Array.isArray(state.planetaryBases)) {
            const validBases = state.planetaryBases.filter(b => b && typeof b === 'object');
            planetaryBases.push(...safeDeepClone(validBases));
        }
    }
    if (typeof planetaryExtractors !== 'undefined') {
        planetaryExtractors.length = 0;
        if (Array.isArray(state.planetaryExtractors)) {
            const validExts = state.planetaryExtractors.filter(e => e && typeof e === 'object' && e.planetKey);
            planetaryExtractors.push(...safeDeepClone(validExts));
        }
    }
    if (typeof parkedShips !== 'undefined') {
        parkedShips.length = 0;
        if (Array.isArray(state.parkedShips)) {
            const validParked = state.parkedShips.filter(p => p && typeof p === 'object' && Number.isFinite(p.x) && Number.isFinite(p.y));
            parkedShips.push(...safeDeepClone(validParked));
        }
    }
    if (typeof freeVessels !== 'undefined') {
        freeVessels.length = 0;
        if (Array.isArray(state.freeVessels)) {
            const validVessels = state.freeVessels.filter(v => v && typeof v === 'object' && Number.isFinite(v.x) && Number.isFinite(v.y));
            freeVessels.push(...safeDeepClone(validVessels));
        }
    }

    // 4. Limpiar caché de sectores y códice
    if (typeof sectors !== 'undefined') sectors.clear();
    if (typeof codexPlanets !== 'undefined') {
        codexPlanets.clear();
        if (Array.isArray(state.codexEntries)) {
            for (const entry of state.codexEntries) {
                if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && entry[1] && typeof entry[1] === 'object') {
                    codexPlanets.set(entry[0], safeDeepClone(entry[1]));
                }
            }
        }
    }

    // 5. Inicializar sector de origen (0,0) y resetear efectos
    clearTransientEffects();
    if (typeof getPlanet === 'function') getPlanet(0, 0);

    // 6. Restaurar Nave
    if (typeof ship !== 'undefined' && state.ship) {
        const ss = state.ship;
        try {
            if (ss.customRocket && typeof ss.customRocket === 'object') {
                ship.customRocket = safeDeepClone(ss.customRocket);
                ship.modelKey = 'custom';
                if (typeof ROCKET_MODELS !== 'undefined') {
                    ROCKET_MODELS['custom'] = ship.customRocket;
                }
                if (typeof applyRocketModel === 'function') {
                    applyRocketModel(ship, 'custom');
                }
            } else {
                ship.customRocket = null;
                ship.modelKey = ss.modelKey || 'vesper';
                if (typeof applyRocketModel === 'function') {
                    applyRocketModel(ship, ship.modelKey);
                }
            }
        } catch (e) {
            console.warn('ÉTER: Modelo de cohete guardado incompatible, usando Vesper por defecto.', e);
            ship.customRocket = null;
            ship.modelKey = 'vesper';
            if (typeof applyRocketModel === 'function') applyRocketModel(ship, 'vesper');
        }
        const fin = (v, fb) => (typeof v === 'number' && Number.isFinite(v)) ? v : fb;
        const posFin = (v, fb) => (typeof v === 'number' && Number.isFinite(v) && v > 0) ? v : fb;

        ship.x = fin(ss.x, 0);
        ship.y = fin(ss.y, 0);
        ship.vx = fin(ss.vx, 0);
        ship.vy = fin(ss.vy, 0);
        ship.angle = fin(ss.angle, -Math.PI / 2);
        ship.av = fin(ss.av, 0);
        ship.mass = posFin(ss.mass, ship.mass || 1.0);
        ship.inertia = posFin(ss.inertia, ship.inertia || 1.0);
        ship.maxHull = posFin(ss.maxHull, 100);
        ship.hull = Math.max(0, Math.min(ship.maxHull, fin(ss.hull, ship.maxHull)));
        ship.maxFuel = posFin(ss.maxFuel, 100);
        ship.fuel = Math.max(0, Math.min(ship.maxFuel, fin(ss.fuel, ship.maxFuel)));
        ship.scale = posFin(ss.scale, ship.scale || 1.0);
        ship.passengers = posFin(ss.passengers, ship.passengers || 1);
        ship.smokeScale = posFin(ss.smokeScale, ship.smokeScale || 1.0);
        ship.artifacts = Math.max(0, fin(ss.artifacts, 0));
        ship.throttle = Math.max(0, Math.min(1, fin(ss.throttle, 0)));
        ship.isGrounded = !!ss.isGrounded;
        ship.sasEnabled = ss.sasEnabled !== false;
        ship.sasHoldAngle = (typeof ss.sasHoldAngle === 'number' && Number.isFinite(ss.sasHoldAngle)) ? ss.sasHoldAngle : null;
        ship.sasAssistWeight = fin(ss.sasAssistWeight, ship.isGrounded ? 1.0 : 0);
        ship.headlightsOn = !!ss.headlightsOn;
        if (ss.leftGearSpring && typeof ss.leftGearSpring === 'object') {
            ship.leftGearSpring = {
                pos: fin(ss.leftGearSpring.pos, ship.isGrounded ? 0.32 : 0),
                vel: fin(ss.leftGearSpring.vel, 0),
                target: fin(ss.leftGearSpring.target, 0)
            };
        } else if (ship.leftGearSpring) {
            ship.leftGearSpring.pos = ship.isGrounded ? 0.32 : 0;
            ship.leftGearSpring.vel = 0;
        }
        if (ss.rightGearSpring && typeof ss.rightGearSpring === 'object') {
            ship.rightGearSpring = {
                pos: fin(ss.rightGearSpring.pos, ship.isGrounded ? 0.32 : 0),
                vel: fin(ss.rightGearSpring.vel, 0),
                target: fin(ss.rightGearSpring.target, 0)
            };
        } else if (ship.rightGearSpring) {
            ship.rightGearSpring.pos = ship.isGrounded ? 0.32 : 0;
            ship.rightGearSpring.vel = 0;
        }
        ship.gearCompression = fin(ss.gearCompression, ship.isGrounded ? 0.32 : 0);
        ship.hullTemp = Math.max(0, fin(ss.hullTemp, 0));
        const sc = (ss.scorch && typeof ss.scorch === 'object') ? ss.scorch : {};
        ship.scorch = {
            amount: fin(sc.amount, 0),
            dirX: fin(sc.dirX, 1),
            dirY: fin(sc.dirY, 0),
            temp: fin(sc.temp, 0)
        };
        ship.orbitMode = ss.orbitMode || 'off';
        ship.orbitDir = (ss.orbitDir === -1) ? -1 : 1;
        ship.orbitAngle = fin(ss.orbitAngle, 0);
        ship.orbitTargetRadius = Math.max(0, fin(ss.orbitTargetRadius, 0));
        ship.orbitPlanetKey = ss.orbitPlanetKey || null;
        if (ship.orbitMode !== 'off' && (!ship.orbitPlanetKey || ship.orbitTargetRadius <= 0)) {
            ship.orbitMode = 'off';
        }
        ship.thrustIntensity = 0;
        ship.reentryIntensity = 0;
        ship.vaporConeIntensity = 0;
    }

    // 7. Restaurar Cámara
    if (typeof camera !== 'undefined' && state.camera) {
        const cs = state.camera;
        const finC = (v, fb) => (typeof v === 'number' && Number.isFinite(v)) ? v : fb;
        const posC = (v, fb) => (typeof v === 'number' && Number.isFinite(v) && v > 0) ? v : fb;
        camera.x = finC(cs.x, ship.x);
        camera.y = finC(cs.y, ship.y);
        camera.zoom = posC(cs.zoom, 1.0);
        camera.targetZoom = posC(cs.targetZoom, camera.zoom);
        camera.rotation = finC(cs.rotation, 0);
        camera.targetRotation = finC(cs.targetRotation, camera.rotation);
        camera.userZoomMult = posC(cs.userZoomMult, 1.0);
    }

    // 8. Restaurar Astronauta EVA
    if (typeof astronaut !== 'undefined' && state.astronaut) {
        const as = state.astronaut;
        const finA = (v, fb) => (typeof v === 'number' && Number.isFinite(v)) ? v : fb;
        astronaut.active = !!as.active;
        astronaut.planet = as.planetKey ? resolvePlanetByKey(as.planetKey) : null;
        if (astronaut.active && !astronaut.planet) astronaut.active = false;
        astronaut.angle = finA(as.angle, -Math.PI / 2);
        astronaut.altitude = finA(as.altitude, 0);
        astronaut.vTangential = finA(as.vTangential, 0);
        astronaut.vRadial = finA(as.vRadial, 0);
        astronaut.facing = (as.facing === -1) ? -1 : 1;
        astronaut.isGrounded = as.isGrounded !== false;
        astronaut.jetpackFuel = Math.max(0, finA(as.jetpackFuel, 100));
        astronaut.suitO2 = Math.max(0, finA(as.suitO2, 100));
        astronaut.headlamp = false;
        astronaut.x = finA(as.x, ship.x);
        astronaut.y = finA(as.y, ship.y);
        astronaut.selectedBaseLevel = as.selectedBaseLevel ?? 1;
        astronaut.selectedRocketModel = as.selectedRocketModel ?? 'starship';
        astronaut.fuelReserve = Math.max(0, finA(as.fuelReserve, 30));
        astronaut.fuelReserveLevel = Math.max(1, Math.min(4, Math.round(finA(as.fuelReserveLevel, 1))));
        astronaut.inventory = (as.inventory && typeof as.inventory === 'object') ? safeDeepClone(as.inventory) : {};
        astronaut.prospectedZones = (as.prospectedZones && typeof as.prospectedZones === 'object') ? safeDeepClone(as.prospectedZones) : {};
        astronaut.plantedBeacons = Array.isArray(as.plantedBeacons) ? safeDeepClone(as.plantedBeacons) : [];
        astronaut.actionProgress = 0;
        astronaut.actionType = null;
    }

    // 9. Restaurar Waypoints de navegación
    if (typeof window !== 'undefined') {
        window.navWaypoints = window.navWaypoints || new Map();
        window.navWaypoints.clear();
        if (Array.isArray(state.waypointsList)) {
            for (const pKey of state.waypointsList) {
                const p = resolvePlanetByKey(pKey);
                if (p) window.navWaypoints.set(p.key, p);
            }
        }
    }

    // 10. Sincronizar UI existente
    if (typeof closeExtractorModal === 'function') closeExtractorModal();
    if (typeof closeResourceInventoryModal === 'function') closeResourceInventoryModal();
    if (typeof updateNavHUD === 'function') updateNavHUD();
    if (typeof getNearbyPlanets === 'function' && typeof ship !== 'undefined') {
        getNearbyPlanets(ship.x, ship.y, 1);
    }

    return true;
}

// --- PERSISTENCIA EN CACHÉ LOCAL ---

function persistWorldStore() {
    try {
        localStorage.setItem(ETER_SAVES_KEY, JSON.stringify(worldStore));
        return true;
    } catch (e) {
        // Si se llenó la cuota de localStorage, recortar los snapshots más antiguos
        try {
            let trimmed = true;
            while (trimmed) {
                trimmed = false;
                for (let i = worldStore.worlds.length - 1; i >= 0; i--) {
                    const w = worldStore.worlds[i];
                    if (w && Array.isArray(w.snapshots) && w.snapshots.length > 0) {
                        w.snapshots.pop();
                        trimmed = true;
                        break;
                    }
                }
                if (trimmed) {
                    try {
                        localStorage.setItem(ETER_SAVES_KEY, JSON.stringify(worldStore));
                        return true;
                    } catch (_) {}
                }
            }
        } catch (_) {}
        console.warn('ÉTER: Error al guardar en caché local:', e);
        return false;
    }
}

function normalizeWorldStore(parsed) {
    if (!parsed || !Array.isArray(parsed.worlds)) return null;
    const now = Date.now();
    const validWorlds = parsed.worlds
        .filter(w => w && typeof w === 'object')
        .map((w, idx) => ({
            id: typeof w.id === 'string' && w.id ? w.id : genSaveId('w'),
            name: typeof w.name === 'string' && w.name.trim() ? w.name : `Mundo ${idx + 1}`,
            seed: typeof w.seed === 'string' && w.seed.trim() ? w.seed : 'ASTRAL-7',
            createdAt: Number.isFinite(w.createdAt) ? w.createdAt : now,
            updatedAt: Number.isFinite(w.updatedAt) ? w.updatedAt : now,
            liveState: (w.liveState && typeof w.liveState === 'object') ? w.liveState : null,
            liveSummary: (w.liveSummary && typeof w.liveSummary === 'object') ? w.liveSummary : null,
            snapshots: Array.isArray(w.snapshots)
                ? w.snapshots.filter(s => s && typeof s === 'object').map((s, sIdx) => ({
                    ...s,
                    id: typeof s.id === 'string' && s.id ? s.id : genSaveId('s'),
                    name: typeof s.name === 'string' && s.name.trim() ? s.name : `Versión ${sIdx + 1}`,
                    createdAt: Number.isFinite(s.createdAt) ? s.createdAt : now,
                    summary: (s.summary && typeof s.summary === 'object') ? s.summary : {}
                }))
                : []
        }));

    if (validWorlds.length === 0) return null;
    const activeId = validWorlds.some(w => w.id === parsed.activeWorldId)
        ? parsed.activeWorldId
        : validWorlds[0].id;
    return {
        version: parsed.version || 1,
        activeWorldId: activeId,
        worlds: validWorlds
    };
}

function loadWorldStoreFromCache() {
    try {
        const raw = localStorage.getItem(ETER_SAVES_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return normalizeWorldStore(parsed);
    } catch (e) {
        console.warn('ÉTER: Caché corrupta o inaccesible, se inicializará una nueva.', e);
    }
    return null;
}

function getActiveWorld() {
    if (!worldStore.worlds.length) return null;
    let w = worldStore.worlds.find(item => item.id === worldStore.activeWorldId);
    if (!w) {
        w = worldStore.worlds[0];
        worldStore.activeWorldId = w.id;
    }
    return w;
}

function autoSaveActiveWorld(silent = true) {
    const active = getActiveWorld();
    if (!active) return false;
    if (typeof ship !== 'undefined' && (!Number.isFinite(ship.x) || !Number.isFinite(ship.y))) {
        return false;
    }
    if (typeof camera !== 'undefined' && (!Number.isFinite(camera.zoom) || camera.zoom <= 0)) {
        return false;
    }
    const state = captureCurrentGameState();
    active.seed = state.seed;
    active.liveState = state;
    active.liveSummary = buildStateSummary(state);
    active.updatedAt = Date.now();
    const ok = persistWorldStore();
    if (!silent) refreshSavesUI();
    return ok;
}

// --- ACCIONES DE MUNDOS Y VERSIONES ---

function createNewWorldAndEnter(nameInput, seedInput) {
    // Guardar progreso del mundo anterior antes de cambiar
    autoSaveActiveWorld(true);

    const cleanName = (nameInput || '').trim() || `Mundo ${worldStore.worlds.length + 1}`;
    const cleanSeed = (seedInput || '').trim().toUpperCase() || generateRandomCosmicSeed();

    // Reiniciar universo con la nueva semilla
    universeSeed = cleanSeed;
    if (typeof sectors !== 'undefined') sectors.clear();
    if (typeof codexPlanets !== 'undefined') codexPlanets.clear();
    window._pendingHarvestedNodes = new Map();
    if (typeof clearAllWaypoints === 'function') clearAllWaypoints();
    if (typeof planetaryBases !== 'undefined') planetaryBases.length = 0;
    if (typeof planetaryExtractors !== 'undefined') planetaryExtractors.length = 0;
    if (typeof closeExtractorModal === 'function') closeExtractorModal();
    if (typeof closeResourceInventoryModal === 'function') closeResourceInventoryModal();
    if (typeof parkedShips !== 'undefined') parkedShips.length = 0;
    if (typeof freeVessels !== 'undefined') freeVessels.length = 0;
    if (typeof ship !== 'undefined') {
        ship.customRocket = null;
        ship.modelKey = 'vesper';
        ship.artifacts = 0;
        if (typeof applyRocketModel === 'function') applyRocketModel(ship, 'vesper');
    }
    if (typeof astronaut !== 'undefined') {
        astronaut.plantedBeacons = [];
        astronaut.fuelReserve = 30;
        astronaut.fuelReserveLevel = 1;
        astronaut.inventory = {};
        astronaut.prospectedZones = {};
    }
    if (typeof resetOrigin === 'function') resetOrigin();

    const initialState = captureCurrentGameState();
    const newWorld = {
        id: genSaveId('w'),
        name: cleanName,
        seed: cleanSeed,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        liveState: initialState,
        liveSummary: buildStateSummary(initialState),
        snapshots: []
    };

    worldStore.worlds.unshift(newWorld);
    worldStore.activeWorldId = newWorld.id;
    persistWorldStore();
    refreshSavesUI();

    if (typeof showHoloCard === 'function' && typeof getPlanet === 'function') {
        showHoloCard(getPlanet(0, 0), `MUNDO CREADO: ${cleanName}`, `Semilla #${cleanSeed} · Guardado en caché local.`);
    }
    if (typeof sfx === 'function') sfx('playChime');
    return newWorld;
}

function switchToWorld(worldId) {
    const target = worldStore.worlds.find(w => w.id === worldId);
    if (!target) return false;

    // Auto-guardar mundo actual si es distinto
    if (worldStore.activeWorldId && worldStore.activeWorldId !== worldId) {
        autoSaveActiveWorld(true);
    }

    worldStore.activeWorldId = target.id;
    if (target.liveState) {
        restoreGameState(target.liveState);
    }
    target.updatedAt = Date.now();
    persistWorldStore();
    refreshSavesUI();

    if (typeof showHoloCard === 'function' && typeof getPlanet === 'function') {
        showHoloCard(getPlanet(0, 0), `MUNDO CARGADO: ${target.name}`, `Semilla #${target.seed}`);
    }
    if (typeof sfx === 'function') sfx('playChime');
    return true;
}

function renameWorld(worldId, newName) {
    const w = worldStore.worlds.find(item => item.id === worldId);
    const clean = (newName || '').trim();
    if (!w || !clean) return false;
    w.name = clean;
    w.updatedAt = Date.now();
    persistWorldStore();
    refreshSavesUI();
    return true;
}

function deleteWorld(worldId) {
    if (worldStore.worlds.length <= 1) return false;
    const idx = worldStore.worlds.findIndex(w => w.id === worldId);
    if (idx === -1) return false;

    const wasActive = worldStore.activeWorldId === worldId;
    worldStore.worlds.splice(idx, 1);

    if (wasActive && worldStore.worlds.length > 0) {
        const nextWorld = worldStore.worlds[0];
        worldStore.activeWorldId = nextWorld.id;
        if (nextWorld.liveState) restoreGameState(nextWorld.liveState);
    }
    persistWorldStore();
    refreshSavesUI();
    return true;
}

// --- VERSIONES / MOMENTOS DENTRO DEL MISMO MUNDO ---

function createSnapshotInActiveWorld(snapshotName) {
    const active = getActiveWorld();
    if (!active) return null;

    const state = captureCurrentGameState();
    const cleanName = (snapshotName || '').trim() || `${getCurrentLocationLabel()} · v${active.snapshots.length + 1}`;
    const snap = {
        id: genSaveId('s'),
        name: cleanName,
        createdAt: Date.now(),
        summary: buildStateSummary(state),
        state
    };

    active.snapshots.unshift(snap);
    active.liveState = state;
    active.liveSummary = snap.summary;
    active.updatedAt = Date.now();
    const ok = persistWorldStore();
    refreshSavesUI();

    if (ok && typeof showHoloCard === 'function' && typeof getPlanet === 'function') {
        showHoloCard(getPlanet(0, 0), 'MOMENTO GUARDADO', `Versión "${cleanName}" guardada en ${active.name}.`);
    }
    if (typeof sfx === 'function') sfx('playChime');
    return snap;
}

function loadSnapshotFromActiveWorld(snapshotId) {
    const active = getActiveWorld();
    if (!active) return false;
    const snap = active.snapshots.find(s => s.id === snapshotId);
    if (!snap || !snap.state) return false;

    restoreGameState(snap.state);
    active.liveState = safeDeepClone(snap.state);
    active.liveSummary = safeDeepClone(snap.summary);
    active.updatedAt = Date.now();
    persistWorldStore();
    refreshSavesUI();

    if (typeof showHoloCard === 'function' && typeof getPlanet === 'function') {
        showHoloCard(getPlanet(0, 0), 'VERSIÓN CARGADA', `Sesión "${snap.name}" restaurada en ${active.name}.`);
    }
    if (typeof sfx === 'function') sfx('playChime');
    return true;
}

function overwriteSnapshotInActiveWorld(snapshotId) {
    const active = getActiveWorld();
    if (!active) return false;
    const snap = active.snapshots.find(s => s.id === snapshotId);
    if (!snap) return false;

    const state = captureCurrentGameState();
    snap.state = state;
    snap.summary = buildStateSummary(state);
    snap.createdAt = Date.now();
    active.liveState = state;
    active.liveSummary = snap.summary;
    active.updatedAt = Date.now();
    persistWorldStore();
    refreshSavesUI();

    if (typeof showHoloCard === 'function' && typeof getPlanet === 'function') {
        showHoloCard(getPlanet(0, 0), 'VERSIÓN ACTUALIZADA', `"${snap.name}" sobrescrita con el estado actual.`);
    }
    return true;
}

function renameSnapshotInActiveWorld(snapshotId, newName) {
    const active = getActiveWorld();
    const clean = (newName || '').trim();
    if (!active || !clean) return false;
    const snap = active.snapshots.find(s => s.id === snapshotId);
    if (!snap) return false;
    snap.name = clean;
    persistWorldStore();
    refreshSavesUI();
    return true;
}

function deleteSnapshotFromActiveWorld(snapshotId) {
    const active = getActiveWorld();
    if (!active) return false;
    const idx = active.snapshots.findIndex(s => s.id === snapshotId);
    if (idx === -1) return false;
    active.snapshots.splice(idx, 1);
    persistWorldStore();
    refreshSavesUI();
    return true;
}

// --- INTERFAZ DE USUARIO (UI) ---

function openWorldsModal(defaultTab = 'snapshots') {
    const modal = document.getElementById('worldsModal');
    if (!modal) return;
    if (typeof closeAllHudDropdowns === 'function') closeAllHudDropdowns();
    autoSaveActiveWorld(true);
    setWorldsModalTab(defaultTab);
    refreshSavesUI();
    modal.classList.remove('hidden');
}

function closeWorldsModal() {
    const modal = document.getElementById('worldsModal');
    if (modal) modal.classList.add('hidden');
    pendingConfirmAction = null;
}

function setWorldsModalTab(tab) {
    const btnSnap = document.getElementById('tabBtnWorldSnapshots');
    const btnAll = document.getElementById('tabBtnAllWorlds');
    const panelSnap = document.getElementById('tabPanelWorldSnapshots');
    const panelAll = document.getElementById('tabPanelAllWorlds');
    if (!btnSnap || !btnAll || !panelSnap || !panelAll) return;

    const isSnap = tab === 'snapshots';
    panelSnap.classList.toggle('hidden', !isSnap);
    panelAll.classList.toggle('hidden', isSnap);

    btnSnap.className = isSnap
        ? 'px-3.5 py-1.5 rounded-xl font-display text-xs font-semibold transition-all cursor-pointer bg-amber-400/15 text-amber-200 border border-amber-400/40'
        : 'px-3.5 py-1.5 rounded-xl font-display text-xs font-semibold transition-all cursor-pointer bg-white/[0.03] text-stone-400 border border-white/10 hover:text-stone-200';
    btnAll.className = !isSnap
        ? 'px-3.5 py-1.5 rounded-xl font-display text-xs font-semibold transition-all cursor-pointer bg-amber-400/15 text-amber-200 border border-amber-400/40'
        : 'px-3.5 py-1.5 rounded-xl font-display text-xs font-semibold transition-all cursor-pointer bg-white/[0.03] text-stone-400 border border-white/10 hover:text-stone-200';
}

function openQuickSaveModal() {
    const modal = document.getElementById('quickSaveModal');
    const input = document.getElementById('inQuickSaveName');
    const worldLbl = document.getElementById('quickSaveWorldLabel');
    if (!modal || !input) return;

    if (typeof closeAllHudDropdowns === 'function') closeAllHudDropdowns();
    const active = getActiveWorld();
    if (worldLbl && active) {
        worldLbl.textContent = `Mundo: ${active.name} (#${active.seed})`;
    }
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    input.value = `${getCurrentLocationLabel()} · ${hhmm}`;
    modal.classList.remove('hidden');
    setTimeout(() => {
        input.focus();
        input.select();
    }, 30);
}

function closeQuickSaveModal() {
    const modal = document.getElementById('quickSaveModal');
    if (modal) modal.classList.add('hidden');
}

function isTwoStepConfirmed(type, id) {
    const now = Date.now();
    if (pendingConfirmAction && pendingConfirmAction.type === type && pendingConfirmAction.id === id && now < pendingConfirmAction.expiresAt) {
        pendingConfirmAction = null;
        return true;
    }
    pendingConfirmAction = { type, id, expiresAt: now + 3500 };
    refreshSavesUI();
    return false;
}

function refreshSavesUI() {
    const active = getActiveWorld();
    if (!active) return;

    // 1. Actualizar Pantalla de Inicio (#introOverlay)
    const introWorldStatus = document.getElementById('introWorldStatus');
    const introWorldName = document.getElementById('introWorldName');
    const introWorldSeed = document.getElementById('introWorldSeed');
    const introWorldMeta = document.getElementById('introWorldMeta');
    const introWorldsCount = document.getElementById('introWorldsCount');
    const startBtnLabel = document.getElementById('btnStartExpeditionLabel');
    const hudWorldTag = document.getElementById('hudActiveWorldTag');

    if (introWorldStatus) introWorldStatus.classList.remove('hidden');
    if (introWorldName) introWorldName.textContent = active.name;
    if (introWorldSeed) introWorldSeed.textContent = `#${active.seed}`;
    if (introWorldsCount) introWorldsCount.textContent = worldStore.worlds.length;

    const sum = active.liveSummary || buildStateSummary(active.liveState);
    if (introWorldMeta) {
        const snapCount = active.snapshots ? active.snapshots.length : 0;
        introWorldMeta.textContent = `${sum.location || 'Cuna del Éter'} · ${snapCount} ${snapCount === 1 ? 'momento' : 'momentos'} · ${formatRelativeTime(active.updatedAt)}`;
    }
    if (startBtnLabel) {
        const hasProgress = (sum.cores > 0 || sum.bases > 0 || (active.snapshots && active.snapshots.length > 0) || (active.liveState && active.liveState.cosmosSimTime > 5));
        startBtnLabel.textContent = hasProgress ? 'Continuar Viaje' : 'Comenzar Viaje';
    }
    if (hudWorldTag) {
        hudWorldTag.textContent = active.name;
    }

    // 2. Actualizar Cabecera del Modal
    const worldsCountLabel = document.getElementById('worldsCountLabel');
    if (worldsCountLabel) worldsCountLabel.textContent = worldStore.worlds.length;

    const curTitle = document.getElementById('currentWorldNameTitle');
    const curSeed = document.getElementById('currentWorldSeedBadge');
    if (curTitle) curTitle.textContent = active.name;
    if (curSeed) curSeed.textContent = `#${active.seed}`;

    // 3. Renderizar Versiones / Momentos del Mundo Actual
    const snapList = document.getElementById('snapshotsListContainer');
    const snaps = active.snapshots || [];

    if (snapList) {
        if (snaps.length === 0) {
            snapList.innerHTML = `
                <div class="py-6 px-4 rounded-2xl border border-dashed border-white/10 text-center text-stone-400 text-xs">
                    Todavía no hay momentos guardados en <span class="text-stone-200 font-medium">${escapeHtmlSave(active.name)}</span>.
                </div>`;
        } else {
            snapList.innerHTML = snaps.map(snap => {
                const sSum = snap.summary || {};
                const confirmDel = pendingConfirmAction && pendingConfirmAction.type === 'delSnap' && pendingConfirmAction.id === snap.id && Date.now() < pendingConfirmAction.expiresAt;
                return `
                <div class="px-4 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 transition-colors flex items-center justify-between gap-3">
                    <div class="min-w-0">
                        <div class="font-display text-sm font-medium text-white truncate">${escapeHtmlSave(snap.name)}</div>
                        <div class="text-[11px] text-stone-400 mt-0.5 truncate">
                            ${escapeHtmlSave(sSum.location || 'Cosmos')} · ${formatRelativeTime(snap.createdAt)}
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button data-snap-action="load" data-snap-id="${snap.id}" class="px-3.5 py-1.5 rounded-xl font-display text-xs font-semibold bg-amber-300 text-stone-950 hover:brightness-110 cursor-pointer">
                            Cargar
                        </button>
                        <button data-snap-action="rename" data-snap-id="${snap.id}" class="px-2 py-1.5 rounded-xl text-xs text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer" title="Renombrar">
                            ✎
                        </button>
                        <button data-snap-action="delete" data-snap-id="${snap.id}" class="px-2.5 py-1.5 rounded-xl text-xs ${confirmDel ? 'bg-rose-500 text-white font-semibold' : 'text-stone-400 hover:text-rose-300 hover:bg-rose-500/15'} cursor-pointer" title="Borrar">
                            ${confirmDel ? '¿Borrar?' : '✕'}
                        </button>
                    </div>
                </div>`;
            }).join('');
        }
    }

    // 4. Renderizar Lista de Todos los Mundos (en Modal e Inicio)
    const renderWorldRowsHtml = () => worldStore.worlds.map(w => {
        const isActive = w.id === active.id;
        const snapCount = w.snapshots ? w.snapshots.length : 0;
        const confirmDelW = pendingConfirmAction && pendingConfirmAction.type === 'delWorld' && pendingConfirmAction.id === w.id && Date.now() < pendingConfirmAction.expiresAt;
        return `
        <div class="px-3.5 py-2.5 rounded-2xl ${isActive ? 'bg-amber-400/[0.08] border-amber-300/35' : 'bg-white/[0.03] hover:bg-white/[0.05] border-white/10'} border transition-colors flex items-center justify-between gap-2.5">
            <div class="min-w-0">
                <div class="flex items-center gap-2">
                    <span class="font-display text-xs sm:text-sm font-medium text-white truncate">${escapeHtmlSave(w.name)}</span>
                    ${isActive ? '<span class="text-[9.5px] px-1.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 shrink-0">Actual</span>' : ''}
                </div>
                <div class="text-[10.5px] text-stone-400 mt-0.5 truncate">
                    #${escapeHtmlSave(w.seed)} · ${snapCount} ${snapCount === 1 ? 'momento' : 'momentos'} · ${formatRelativeTime(w.updatedAt)}
                </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                ${isActive
                    ? `<button data-world-action="enter" data-world-id="${w.id}" class="px-3 py-1.5 rounded-xl font-display text-[11px] font-semibold bg-white/10 text-white hover:bg-white/20 cursor-pointer">Jugar</button>`
                    : `<button data-world-action="load" data-world-id="${w.id}" class="px-3 py-1.5 rounded-xl font-display text-[11px] font-semibold bg-amber-300 text-stone-950 hover:brightness-110 cursor-pointer">Cargar</button>`
                }
                <button data-world-action="rename" data-world-id="${w.id}" class="px-2 py-1.5 rounded-xl text-xs text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer" title="Renombrar">✎</button>
                ${worldStore.worlds.length > 1 ? `
                    <button data-world-action="delete" data-world-id="${w.id}" class="px-2 py-1.5 rounded-xl text-xs ${confirmDelW ? 'bg-rose-500 text-white font-semibold' : 'text-stone-400 hover:text-rose-300 hover:bg-rose-500/15'} cursor-pointer" title="Borrar">
                        ${confirmDelW ? '¿Borrar?' : '✕'}
                    </button>` : ''
                }
            </div>
        </div>`;
    }).join('');

    const worldsHtml = renderWorldRowsHtml();
    const worldsList = document.getElementById('allWorldsListContainer');
    if (worldsList) worldsList.innerHTML = worldsHtml;
    const introWorldsList = document.getElementById('introWorldsList');
    if (introWorldsList) introWorldsList.innerHTML = worldsHtml;
}

// --- EXPORTAR / IMPORTAR RESPALDO JSON ---

function exportWorldsBackupJSON() {
    autoSaveActiveWorld(true);
    const blob = new Blob([JSON.stringify(worldStore, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eter_mundos_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function importWorldsBackupJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            if (!data || !Array.isArray(data.worlds) || data.worlds.length === 0) {
                throw new Error('Formato inválido');
            }
            worldStore = data;
            const active = getActiveWorld();
            if (active && active.liveState) restoreGameState(active.liveState);
            persistWorldStore();
            refreshSavesUI();
            if (typeof showHoloCard === 'function' && typeof getPlanet === 'function') {
                showHoloCard(getPlanet(0, 0), 'RESPALDO IMPORTADO', `${worldStore.worlds.length} mundos cargados en caché local.`);
            }
        } catch (e) {
            if (typeof showHoloCard === 'function' && typeof getPlanet === 'function') {
                showHoloCard(getPlanet(0, 0), 'ERROR DE IMPORTACIÓN', 'El archivo JSON no corresponde a un respaldo válido de ÉTER.');
            }
        }
    };
    reader.readAsText(file);
}

// --- INICIALIZACIÓN Y EVENTOS ---

function initWorldSaveSystem(skipRestore = false) {
    const cached = loadWorldStoreFromCache();
    if (cached && cached.worlds.length > 0) {
        worldStore = cached;
        const active = getActiveWorld();
        if (!skipRestore && active && active.liveState) {
            restoreGameState(active.liveState);
        }
    } else {
        const initialState = captureCurrentGameState();
        const defaultWorld = {
            id: genSaveId('w'),
            name: 'Expedición Astral',
            seed: initialState.seed || 'ASTRAL-7',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            liveState: initialState,
            liveSummary: buildStateSummary(initialState),
            snapshots: []
        };
        worldStore = {
            version: 1,
            activeWorldId: defaultWorld.id,
            worlds: [defaultWorld]
        };
        persistWorldStore();
    }

    refreshSavesUI();

    if (autoSaveTimerId) clearInterval(autoSaveTimerId);
    autoSaveTimerId = setInterval(() => {
        const intro = document.getElementById('introOverlay');
        if (intro && !intro.classList.contains('hidden')) return;
        autoSaveActiveWorld(true);
    }, AUTO_SAVE_INTERVAL_MS);

    window.addEventListener('beforeunload', () => {
        autoSaveActiveWorld(true);
    });
}

function openCreateWorldModal() {
    const modal = document.getElementById('createWorldModal');
    if (!modal) return;
    if (typeof closeAllHudDropdowns === 'function') closeAllHudDropdowns();
    const inName = document.getElementById('inNewWorldName');
    const inSeed = document.getElementById('inNewWorldSeed');
    if (inName) inName.value = '';
    if (inSeed) inSeed.value = '';
    modal.classList.remove('hidden');
    if (inName) setTimeout(() => inName.focus(), 40);
}

function closeCreateWorldModal() {
    const modal = document.getElementById('createWorldModal');
    if (modal) modal.classList.add('hidden');
}

function bindSaveSystemEvents() {
    const btnOpenWorldsIntro = document.getElementById('btnOpenWorldsIntro');
    const btnIntroSwitchWorld = document.getElementById('btnIntroSwitchWorld');
    const btnOpenWorldsHUD = document.getElementById('btnOpenWorldsHUD');
    const btnQuickSaveHUD = document.getElementById('btnQuickSaveHUD');
    const btnCloseWorlds = document.getElementById('btnCloseWorldsModal');

    if (btnOpenWorldsIntro) btnOpenWorldsIntro.addEventListener('click', () => openWorldsModal('worlds'));
    if (btnIntroSwitchWorld) btnIntroSwitchWorld.addEventListener('click', () => openWorldsModal('worlds'));
    const btnOpenSnapshotsIntro = document.getElementById('btnOpenSnapshotsIntro');
    if (btnOpenSnapshotsIntro) btnOpenSnapshotsIntro.addEventListener('click', () => openWorldsModal('snapshots'));
    if (btnOpenWorldsHUD) btnOpenWorldsHUD.addEventListener('click', () => openWorldsModal('snapshots'));
    if (btnQuickSaveHUD) btnQuickSaveHUD.addEventListener('click', openQuickSaveModal);
    if (btnCloseWorlds) btnCloseWorlds.addEventListener('click', closeWorldsModal);

    const btnOpenCreateIntro = document.getElementById('btnOpenCreateWorldIntro');
    const btnOpenCreateHUD = document.getElementById('btnOpenCreateWorldHUD');
    const btnOpenCreateFromModal = document.getElementById('btnOpenCreateWorldFromModal');
    const btnCloseCreate = document.getElementById('btnCloseCreateWorld');
    const btnCancelCreate = document.getElementById('btnCancelCreateWorld');
    if (btnOpenCreateIntro) btnOpenCreateIntro.addEventListener('click', openCreateWorldModal);
    if (btnOpenCreateHUD) btnOpenCreateHUD.addEventListener('click', openCreateWorldModal);
    if (btnOpenCreateFromModal) btnOpenCreateFromModal.addEventListener('click', openCreateWorldModal);
    if (btnCloseCreate) btnCloseCreate.addEventListener('click', closeCreateWorldModal);
    if (btnCancelCreate) btnCancelCreate.addEventListener('click', closeCreateWorldModal);

    const tabSnap = document.getElementById('tabBtnWorldSnapshots');
    const tabAll = document.getElementById('tabBtnAllWorlds');
    if (tabSnap) tabSnap.addEventListener('click', () => setWorldsModalTab('snapshots'));
    if (tabAll) tabAll.addEventListener('click', () => setWorldsModalTab('worlds'));

    // Crear Snapshot desde el modal
    const btnCreateSnap = document.getElementById('btnCreateSnapshot');
    const inNewSnap = document.getElementById('inNewSnapshotName');
    const handleCreateSnap = () => {
        const name = inNewSnap ? inNewSnap.value : '';
        createSnapshotInActiveWorld(name);
        if (inNewSnap) inNewSnap.value = '';
    };
    if (btnCreateSnap) btnCreateSnap.addEventListener('click', handleCreateSnap);
    if (inNewSnap) {
        inNewSnap.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleCreateSnap();
        });
    }

    // Renombrar mundo actual desde el header del tab 1
    const btnRenameCur = document.getElementById('btnRenameCurrentWorld');
    if (btnRenameCur) {
        btnRenameCur.addEventListener('click', () => {
            const active = getActiveWorld();
            if (!active) return;
            const next = prompt('Nuevo nombre para este mundo:', active.name);
            if (next && next.trim()) renameWorld(active.id, next);
        });
    }

    // Crear Nuevo Mundo
    const btnRandNewSeed = document.getElementById('btnNewWorldRandomSeed');
    const inNewWorldSeed = document.getElementById('inNewWorldSeed');
    const inNewWorldName = document.getElementById('inNewWorldName');
    const btnCreateWorld = document.getElementById('btnCreateNewWorld');

    if (btnRandNewSeed && inNewWorldSeed) {
        btnRandNewSeed.addEventListener('click', () => {
            inNewWorldSeed.value = generateRandomCosmicSeed();
        });
    }
    const handleCreateWorld = () => {
        const wName = inNewWorldName ? inNewWorldName.value : '';
        const wSeed = inNewWorldSeed ? inNewWorldSeed.value : '';
        createNewWorldAndEnter(wName, wSeed);
        if (inNewWorldName) inNewWorldName.value = '';
        if (inNewWorldSeed) inNewWorldSeed.value = '';
        closeCreateWorldModal();
        closeWorldsModal();
        if (typeof dismissIntro === 'function') dismissIntro();
    };
    if (btnCreateWorld) btnCreateWorld.addEventListener('click', handleCreateWorld);
    [inNewWorldName, inNewWorldSeed].forEach(inp => {
        if (!inp) return;
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleCreateWorld();
            if (e.key === 'Escape') closeCreateWorldModal();
        });
    });

    // Delegación de eventos en lista de versiones
    const snapList = document.getElementById('snapshotsListContainer');
    if (snapList) {
        snapList.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-snap-action]');
            if (!btn) return;
            const action = btn.dataset.snapAction;
            const id = btn.dataset.snapId;
            if (action === 'load') {
                if (loadSnapshotFromActiveWorld(id)) {
                    closeWorldsModal();
                    if (typeof dismissIntro === 'function') dismissIntro();
                }
            } else if (action === 'overwrite') {
                if (isTwoStepConfirmed('ovrSnap', id)) overwriteSnapshotInActiveWorld(id);
            } else if (action === 'rename') {
                const active = getActiveWorld();
                const snap = active && active.snapshots.find(s => s.id === id);
                const next = prompt('Nuevo nombre de la versión:', snap ? snap.name : '');
                if (next && next.trim()) renameSnapshotInActiveWorld(id, next);
            } else if (action === 'delete') {
                if (isTwoStepConfirmed('delSnap', id)) deleteSnapshotFromActiveWorld(id);
            }
        });
    }

    // Delegación de eventos en lista de mundos (modal e inicio)
    const bindWorldsListActions = (container) => {
        if (!container) return;
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-world-action]');
            if (!btn) return;
            const action = btn.dataset.worldAction;
            const id = btn.dataset.worldId;
            if (action === 'enter') {
                closeWorldsModal();
                if (typeof dismissIntro === 'function') dismissIntro();
            } else if (action === 'load') {
                if (switchToWorld(id)) {
                    closeWorldsModal();
                    if (typeof dismissIntro === 'function') dismissIntro();
                }
            } else if (action === 'rename') {
                const w = worldStore.worlds.find(item => item.id === id);
                const next = prompt('Nuevo nombre del mundo:', w ? w.name : '');
                if (next && next.trim()) renameWorld(id, next);
            } else if (action === 'delete') {
                if (isTwoStepConfirmed('delWorld', id)) deleteWorld(id);
            }
        });
    };
    bindWorldsListActions(document.getElementById('allWorldsListContainer'));
    bindWorldsListActions(document.getElementById('introWorldsList'));

    // Exportar / Importar JSON (Modal + Pantalla de Inicio)
    ['btnExportWorldsJSON', 'btnIntroExportJSON'].forEach(id => {
        const b = document.getElementById(id);
        if (b) b.addEventListener('click', exportWorldsBackupJSON);
    });
    ['inImportWorldsJSON', 'inIntroImportJSON'].forEach(id => {
        const inp = document.getElementById(id);
        if (inp) {
            inp.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    importWorldsBackupJSON(e.target.files[0]);
                    e.target.value = '';
                }
            });
        }
    });

    // Modal rápido de Guardar Momento
    const btnCloseQS = document.getElementById('btnCloseQuickSave');
    const btnCancelQS = document.getElementById('btnCancelQuickSave');
    const btnConfirmQS = document.getElementById('btnConfirmQuickSave');
    const inQS = document.getElementById('inQuickSaveName');
    const submitQS = () => {
        createSnapshotInActiveWorld(inQS ? inQS.value : '');
        closeQuickSaveModal();
    };
    if (btnCloseQS) btnCloseQS.addEventListener('click', closeQuickSaveModal);
    if (btnCancelQS) btnCancelQS.addEventListener('click', closeQuickSaveModal);
    if (btnConfirmQS) btnConfirmQS.addEventListener('click', submitQS);
    if (inQS) {
        inQS.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitQS();
            if (e.key === 'Escape') closeQuickSaveModal();
        });
    }

    // Atajo Ctrl+S para Guardar Momento y Escape para cerrar modales
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            const intro = document.getElementById('introOverlay');
            if (intro && !intro.classList.contains('hidden')) return;
            openQuickSaveModal();
        } else if (e.key === 'Escape') {
            closeCreateWorldModal();
            closeQuickSaveModal();
            closeWorldsModal();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSaveSystemEvents);
} else {
    bindSaveSystemEvents();
}
