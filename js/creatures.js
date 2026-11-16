/**
 * ÉTER — Motor de Generación Ecológica, IA, Físicas de Salto y Combate de Fauna
 * Gestiona la distribución inteligente por categoría planetaria, locomoción orgánica,
 * ataques directos a cohetes, jefes ápex, proyectiles hostiles y auras simbióticas.
 */

const plasmaProjectiles = [];
const creatureEtherOrbs = [];

// --- UTILIDADES DE TERRENO Y HÁBITAT ---

function isAngleOverLake(planet, angle, inCavern = false) {
    const list = inCavern ? planet.cavernLakes : planet.lakes;
    if (!list || list.length === 0) return false;
    const norm = wrapAngle(angle);
    for (const lk of list) {
        const diff = Math.abs(Math.atan2(Math.sin(norm - lk.angle), Math.cos(norm - lk.angle)));
        if (diff <= (lk.span || 0.05) * 1.1) return true;
    }
    return false;
}

function getCreatureSurfaceRadius(planet, angle, inCavern = false, onCeiling = false, islandRef = null) {
    if (islandRef) {
        const diff = Math.abs(Math.atan2(Math.sin(angle - islandRef.angle), Math.cos(angle - islandRef.angle)));
        if (diff <= islandRef.span) {
            const u = diff / islandRef.span;
            return islandRef.topRadius - Math.pow(u, 2.2) * (islandRef.thickness * 0.25);
        }
    }
    if (typeof getCavernOrSurfaceRadius === 'function') {
        return getCavernOrSurfaceRadius(planet, angle, inCavern, onCeiling);
    }
    if (typeof getSurfaceRadius === 'function') {
        return getSurfaceRadius(planet, angle);
    }
    return planet.radius;
}

function selectSmartHabitatAngle(planet, sp, usedAngles, rng) {
    const isOrigin = !!planet.isOrigin;
    const originPadAngle = -Math.PI / 2;

    // 1. Islas flotantes dedicadas
    if (sp.habitatPref === 'floating_island' && planet.floatingIslands && planet.floatingIslands.length > 0 && sp.locomotion !== 'flyer') {
        const idx = Math.floor(rng() * planet.floatingIslands.length);
        const isl = planet.floatingIslands[idx];
        return { angle: wrapAngle(isl.angle), islandRef: isl, inCavern: false, onCeiling: false };
    }

    // 2. Superficies líquidas / lagos
    if (sp.habitatPref === 'lake_surface' && planet.lakes && planet.lakes.length > 0) {
        const lk = planet.lakes[Math.floor(rng() * planet.lakes.length)];
        return { angle: wrapAngle(lk.angle + (rng() - 0.5) * 0.03), islandRef: null, inCavern: false, onCeiling: false };
    }

    // 3. Mundos huecos (suelo, techo o aire subterráneo)
    const inCavern = !!(planet.isHollow && (
        sp.habitatPref === 'cavern_air' ||
        sp.habitatPref === 'cavern_ceiling' ||
        sp.habitatPref === 'cavern_floor' ||
        rng() < 0.85
    ));
    const onCeiling = !!(inCavern && sp.habitatPref === 'cavern_ceiling' && (
        planet.archetype?.hollowPhysicsMode === 'inverted_shell' || rng() < 0.65
    ));

    // 4. Búsqueda inteligente de ángulo seco, espaciado y acorde al relieve
    let bestAngle = rng() * Math.PI * 2;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 24; attempt++) {
        const cand = rng() * Math.PI * 2;

        // Respetar plataforma de inicio en Cuna del Éter
        if (isOrigin) {
            const padDiff = Math.abs(Math.atan2(Math.sin(cand - originPadAngle), Math.cos(cand - originPadAngle)));
            if (padDiff < 0.28) continue;
            if (!sp.safeForOrigin && padDiff < 1.25) continue;
        }

        // Evitar caer en lagos si camina o salta en tierra
        const needsDry = (sp.locomotion === 'walker' || sp.locomotion === 'jumper' || sp.locomotion === 'crawler' || sp.locomotion === 'blinker');
        if (needsDry && isAngleOverLake(planet, cand, inCavern)) continue;

        // Separación angular mínima respecto a otros hábitats del mismo planeta
        let minSep = Math.PI;
        for (const ua of usedAngles) {
            const sep = Math.abs(Math.atan2(Math.sin(cand - ua), Math.cos(cand - ua)));
            if (sep < minSep) minSep = sep;
        }
        if (usedAngles.length > 0 && minSep < 0.45) continue;

        // Preferencia topográfica (valle vs cumbre)
        let score = minSep * 2.0;
        if (typeof getSurfaceRadius === 'function' && !inCavern) {
            const sr = getSurfaceRadius(planet, cand);
            const relH = sr - planet.radius;
            if (sp.habitatPref === 'ridge') score += relH * 0.04;
            else if (sp.habitatPref === 'valley') score -= relH * 0.04;
        }

        if (score > bestScore) {
            bestScore = score;
            bestAngle = cand;
        }
    }

    return { angle: wrapAngle(bestAngle), islandRef: null, inCavern, onCeiling };
}

// --- GENERADOR DE FAUNA DETERMINISTA POR CATEGORÍA ---

function generatePlanetCreatures(planet, rng) {
    if (!planet) return [];

    const arch = planet.archetype || {};
    const classId = arch.classId || 'terrestrial';
    const archId = arch.id || '';
    const isMicro = planet.sizeClass && planet.sizeClass.id === 'micro';

    // 1. Verificar categorías y arquetipos completamente estériles (sin seres)
    if (!planet.isOrigin && (
        LIFELESS_CLASSES.has(classId) ||
        LIFELESS_ARCHETYPES.has(archId) ||
        isMicro
    )) {
        planet.creatures = [];
        planet.speciesMetaList = [];
        planet.creaturesSummary = 'Mundo estéril — Sin biosfera animal';
        return [];
    }

    const pool = CREATURE_SPECIES_BY_CLASS[classId];
    if (!pool || pool.length === 0) {
        planet.creatures = [];
        planet.speciesMetaList = [];
        planet.creaturesSummary = 'Mundo inerte — Sin fauna detectada';
        return [];
    }

    // 2. Probabilidad de albergar vida en este planeta
    let lifeChance = LIFE_PROBABILITY_BY_CLASS[classId] !== undefined ? LIFE_PROBABILITY_BY_CLASS[classId] : 0.40;
    if (planet.isOrigin) lifeChance = 1.0;

    if (rng() >= lifeChance) {
        planet.creatures = [];
        planet.speciesMetaList = [];
        planet.creaturesSummary = 'Mundo deshabitado — Sin fauna en este planeta';
        return [];
    }

    // 3. Cantidad de bolsillos ecológicos según el tamaño del mundo (nunca saturado)
    const sizeId = planet.sizeClass ? planet.sizeClass.id : 'standard';
    let habitatCount = 1;
    if (planet.isOrigin) {
        habitatCount = 3;
    } else if (sizeId === 'dwarf') {
        habitatCount = 1;
    } else if (sizeId === 'standard') {
        habitatCount = rng() < 0.55 ? 2 : 1;
    } else {
        habitatCount = rng() < 0.45 ? 3 : 2;
    }
    habitatCount = Math.min(habitatCount, pool.length);

    // Seleccionar especies sin repetir dentro del planeta
    const availablePool = pool.slice();
    const chosenSpecies = [];
    for (let h = 0; h < habitatCount && availablePool.length > 0; h++) {
        let candidates = availablePool;
        // En el planeta de origen, los primeros 2 bolsillos son especies amigables/asustadizas
        if (planet.isOrigin && h < 2) {
            const safeList = availablePool.filter(sp => sp.safeForOrigin);
            if (safeList.length > 0) candidates = safeList;
        }
        const pickIdx = Math.floor(rng() * candidates.length);
        const picked = candidates[pickIdx];
        chosenSpecies.push(picked);
        const remIdx = availablePool.indexOf(picked);
        if (remIdx >= 0) availablePool.splice(remIdx, 1);
    }

    const creatures = [];
    const speciesMetaList = [];
    const usedAngles = [];

    for (let s = 0; s < chosenSpecies.length; s++) {
        const sp = chosenSpecies[s];
        const temp = CREATURE_TEMPERAMENTS[sp.temperamentKey] || CREATURE_TEMPERAMENTS.DOCILE_SHY;
        const pal = sp.palettes[Math.floor(rng() * sp.palettes.length)];
        const placement = selectSmartHabitatAngle(planet, sp, usedAngles, rng);
        usedAngles.push(placement.angle);

        const countInPocket = sp.groupMin + Math.floor(rng() * (sp.groupMax - sp.groupMin + 1));

        for (let c = 0; c < countInPocket; c++) {
            const spreadStep = sp.grouping === 'colony' ? 0.014 : 0.024;
            const spread = (countInPocket === 1)
                ? 0
                : (c - (countInPocket - 1) * 0.5) * (spreadStep + rng() * 0.01);
            const angle = wrapAngle(placement.angle + spread);

            let initialAltitude = 0;
            if (sp.locomotion === 'flyer' || sp.locomotion === 'floater') {
                const minAlt = sp.flyAltitudeMin || 20;
                const maxAlt = sp.flyAltitudeMax || 70;
                initialAltitude = minAlt + rng() * (maxAlt - minAlt);
            }

            const scale = sp.scaleMin + rng() * (sp.scaleMax - sp.scaleMin);
            const surfaceR = getCreatureSurfaceRadius(planet, angle, placement.inCavern, placement.onCeiling, placement.islandRef);
            const totalR = placement.onCeiling ? (surfaceR - initialAltitude) : (surfaceR + initialAltitude);
            const initX = planet.x + Math.cos(angle) * totalR;
            const initY = planet.y + Math.sin(angle) * totalR;

            creatures.push({
                id: `c_${planet.key}_${sp.id}_${c}`,
                planetKey: planet.key,
                speciesId: sp.id,
                species: sp.name,
                family: sp.renderType,
                renderType: sp.renderType,
                locomotion: sp.locomotion,
                sizeClass: sp.sizeClass,
                scale,
                temperamentKey: sp.temperamentKey,
                temperament: temp,
                spec: sp,
                palette: pal,
                sanctuaryAngle: placement.angle,
                islandRef: placement.islandRef,
                inCavern: placement.inCavern,
                onCeiling: placement.onCeiling,
                angle,
                altitude: initialAltitude,
                targetAltitude: initialAltitude,
                vTangential: (rng() - 0.5) * 2.5,
                vRadial: 0,
                isAirborne: false,
                squashX: 1.0,
                squashY: 1.0,
                pitchAngle: 0,
                eyeLookAngle: 0,
                facing: rng() < 0.5 ? 1 : -1,
                walkCycle: rng() * Math.PI * 2,
                flapCycle: rng() * Math.PI * 2,
                tentaclePhase: rng() * Math.PI * 2,
                blinkTimer: 2.0 + rng() * 4.5,
                x: initX,
                y: initY,
                aiState: 'IDLE',
                aiTimer: 1.8 + rng() * 3.5,
                alertTimer: 0,
                fleeTimer: 0,
                burnTimer: 0,
                attackCooldown: 0,
                rangedCooldown: 1.0 + rng() * 1.5,
                jumpCooldown: rng() * 1.2,
                telegraphTimer: 0,
                pendingAction: null,
                blinkPhaseTimer: 0,
                healPulseTimer: 0,
                flashTimer: 0,
                sonarPingTime: 0,
                isEnraged: false,
                _enrageTriggered: false,
                _hasAlerted: false,
                hp: sp.hp,
                maxHp: sp.hp,
                armor: sp.armor || 0,
                damage: sp.damage || 0,
                baseSpeed: sp.baseSpeed * (0.9 + rng() * 0.2),
                stepDustTimer: 0
            });
        }

        speciesMetaList.push({
            id: sp.id,
            name: sp.name,
            family: sp.renderType,
            sizeClass: sp.sizeClass,
            temperament: temp.badge,
            tagColor: temp.tagColor,
            count: countInPocket,
            desc: sp.desc
        });
    }

    planet.creatures = creatures;
    planet.speciesMetaList = speciesMetaList;
    planet.creaturesSummary = speciesMetaList.length + ' ' +
        (speciesMetaList.length === 1 ? 'especie autóctona' : 'especies autóctonas') +
        ' (' + speciesMetaList.map(s => s.name).join(', ') + ')';

    return creatures;
}

// --- ACTUALIZACIÓN DE FÍSICAS, SALTO, IA Y COMBATE CONTRA COHETE ---

function updatePlanetCreatures(dt, nearbyPlanets) {
    if (!nearbyPlanets || nearbyPlanets.length === 0) return;

    const isEVA = (typeof astronaut !== 'undefined' && astronaut.active);
    const hasShip = (typeof ship !== 'undefined');
    const astroX = isEVA ? astronaut.x : (hasShip ? ship.x : 0);
    const astroY = isEVA ? astronaut.y : (hasShip ? ship.y : 0);
    const astroVel = isEVA ? Math.hypot(astronaut.vTangential || 0, astronaut.vRadial || 0) : (hasShip ? Math.hypot(ship.vx, ship.vy) : 0);
    const shipSpeed = hasShip ? Math.hypot(ship.vx, ship.vy) : 0;

    // Detección de llamarada térmica del cohete
    let flameActive = false;
    let flameNozX = 0, flameNozY = 0;
    let flameDirX = 0, flameDirY = 0;
    let flamePlumeLen = 0;
    let flameIntensity = 0;

    if (hasShip && ship.thrustIntensity > 0.04) {
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

        const gravScale = clamp((p.gravityForce || 285) / 285, 0.45, 1.65);

        for (let i = p.creatures.length - 1; i >= 0; i--) {
            const c = p.creatures[i];
            const sp = c.spec || {};
            const temp = c.temperament || {};

            // 1. Muerte de la criatura
            if (c.hp <= 0) {
                spawnCreatureDeathFX(c, p, c.burnTimer > 0);
                if (c.temperamentKey === 'APEX_BOSS' && typeof showHoloCard === 'function') {
                    showHoloCard(p, `DEPREDADOR ÁPEX DERROTADO`, `Has abatido a ${c.species}. Núcleos de Éter liberados.`);
                }
                p.creatures.splice(i, 1);
                continue;
            }

            // 2. Fase de furia en Jefes Ápex (<50% HP)
            if (c.temperamentKey === 'APEX_BOSS' && !c._enrageTriggered && c.hp < c.maxHp * 0.52) {
                c._enrageTriggered = true;
                c.isEnraged = true;
                c.alertTimer = 2.0;
                if (typeof createShockwave === 'function') {
                    createShockwave(c.x, c.y, 65 * c.scale, 160, 'rgba(239, 68, 68, 0.85)', 'ring');
                }
                if (typeof camera !== 'undefined') camera.shake = Math.max(camera.shake, 7.0);
                if (typeof audio !== 'undefined' && audio.playCreatureRoar) audio.playCreatureRoar(0.65);
                if (typeof showHoloCard === 'function') {
                    showHoloCard(p, `¡ALERTA ÁPEX · ${c.species.toUpperCase()}!`, `El depredador ha entrado en fase de furia extrema.`);
                }
            }

            // 3. Temporizadores
            if (c.flashTimer > 0) c.flashTimer = Math.max(0, c.flashTimer - dt);
            if (c.alertTimer > 0) c.alertTimer = Math.max(0, c.alertTimer - dt);
            if (c.attackCooldown > 0) c.attackCooldown = Math.max(0, c.attackCooldown - dt);
            if (c.rangedCooldown > 0) c.rangedCooldown = Math.max(0, c.rangedCooldown - dt);
            if (c.jumpCooldown > 0) c.jumpCooldown = Math.max(0, c.jumpCooldown - dt);
            if (c.sonarPingTime > 0) c.sonarPingTime = Math.max(0, c.sonarPingTime - dt);
            if (c.burnTimer > 0) c.burnTimer = Math.max(0, c.burnTimer - dt);
            if (c.blinkPhaseTimer > 0) c.blinkPhaseTimer = Math.max(0, c.blinkPhaseTimer - dt);
            if (c.healPulseTimer > 0) c.healPulseTimer = Math.max(0, c.healPulseTimer - dt);

            c.blinkTimer -= dt;
            if (c.blinkTimer <= 0) c.blinkTimer = 2.2 + Math.random() * 4.5;

            // Recuperación elástica de squash & stretch
            c.squashX = lerp(c.squashX || 1, 1.0, Math.min(1, dt * 10));
            c.squashY = lerp(c.squashY || 1, 1.0, Math.min(1, dt * 10));

            // 4. Posición cartesiana actualizada
            const surfaceR = getCreatureSurfaceRadius(p, c.angle, c.inCavern, c.onCeiling, c.islandRef);
            const totalR = c.onCeiling ? (surfaceR - c.altitude) : (surfaceR + c.altitude);
            c.x = p.x + Math.cos(c.angle) * totalR;
            c.y = p.y + Math.sin(c.angle) * totalR;

            // 5. Daño térmico de la llamarada del cohete
            if (flameActive) {
                const hitRadius = Math.max(8, 12 * c.scale);
                let hitByFlame = false;
                let flameFactor = 0;

                const toCrX = c.x - flameNozX;
                const toCrY = c.y - flameNozY;
                const projAlongBeam = toCrX * flameDirX + toCrY * flameDirY;

                if (projAlongBeam > -6 && projAlongBeam < flamePlumeLen * 1.15) {
                    const perpDist = Math.abs(toCrX * (-flameDirY) + toCrY * flameDirX);
                    const beamFrac = Math.max(0, projAlongBeam / flamePlumeLen);
                    const beamRadius = lerp(5.5, 26.0 * (flameIntensity > 0.8 ? 1.25 : 1.0), beamFrac) + hitRadius;
                    if (perpDist <= beamRadius) {
                        hitByFlame = true;
                        flameFactor = clamp((1 - (perpDist / beamRadius) * 0.5) * (1 - beamFrac * 0.4), 0.25, 1.2);
                    }
                }

                if (!hitByFlame && ship.flameDeflection && ship.flameDeflection.active) {
                    const distDef = Math.hypot(c.x - ship.flameDeflection.hitX, c.y - ship.flameDeflection.hitY);
                    const defRadius = 40 * ship.flameDeflection.intensity + hitRadius;
                    if (distDef <= defRadius) {
                        hitByFlame = true;
                        flameFactor = clamp((1 - distDef / defRadius) * ship.flameDeflection.intensity, 0.2, 1.1);
                    }
                }

                if (!hitByFlame) {
                    const distNoz = Math.hypot(c.x - flameNozX, c.y - flameNozY);
                    if (distNoz < 16 + hitRadius) {
                        hitByFlame = true;
                        flameFactor = 1.3;
                    }
                }

                if (hitByFlame) {
                    const armorMult = 1 - Math.min(0.6, c.armor || 0) * 0.5;
                    const dps = 145 * flameIntensity * flameFactor * armorMult;
                    c.hp = Math.max(0, c.hp - dps * dt);
                    c.flashTimer = 0.14;
                    c.burnTimer = 1.2;

                    // Los dóciles huyen despavoridos; los violentos / jefes se enfurecen
                    if (c.temperamentKey === 'APEX_BOSS' || c.temperamentKey === 'VIOLENT_ROCKET_HUNTER' || c.temperamentKey === 'HOSTILE_SLOW_TANK') {
                        c.isEnraged = true;
                    } else {
                        c.fleeTimer = 4.5;
                        c.aiState = 'FLEE';
                    }

                    const pushTangential = flameDirX * (-Math.sin(c.angle)) + flameDirY * (Math.cos(c.angle));
                    c.vTangential += Math.sign(pushTangential || 1) * (26 * flameIntensity * dt);

                    if (Math.random() < 0.45 && typeof createSparks === 'function') {
                        createSparks(c.x, c.y, 3, c.angle + Math.PI / 2, 0.9, 45, 130, [255, 130, 30], 0.35);
                    }
                    if (Math.random() < 0.22 && typeof createSmoke === 'function') {
                        createSmoke(c.x, c.y, 1, 1.4 * c.scale, [60, 50, 45], (Math.random() - 0.5) * 6, -10, 0.3);
                    }
                }
            }

            // 6. Selección inteligente de objetivo (Astronauta vs Cohete)
            const distToAstro = Math.hypot(c.x - astroX, c.y - astroY);
            const distToShip = hasShip ? Math.hypot(c.x - ship.x, c.y - ship.y) : Infinity;

            let targetX = astroX;
            let targetY = astroY;
            let distToTarget = distToAstro;
            let targetIsRocket = !isEVA;

            if (isEVA && hasShip && sp.attacksRocket && distToShip < (sp.rocketAggroRange || 200)) {
                // Si el cohete está más cerca o la criatura odia cohetes, puede atacar la nave estacionada
                if (c.temperamentKey === 'VIOLENT_ROCKET_HUNTER' || distToShip < distToAstro * 0.85) {
                    targetX = ship.x;
                    targetY = ship.y;
                    distToTarget = distToShip;
                    targetIsRocket = true;
                }
            } else if (!isEVA) {
                targetX = ship.x;
                targetY = ship.y;
                distToTarget = distToShip;
                targetIsRocket = true;
            }

            const targetPolar = Math.atan2(targetY - p.y, targetX - p.x);
            const angleDiff = Math.atan2(Math.sin(targetPolar - c.angle), Math.cos(targetPolar - c.angle));
            const distFromSanctuary = Math.atan2(Math.sin(c.angle - c.sanctuaryAngle), Math.cos(c.angle - c.sanctuaryAngle));

            // Seguimiento de pupila hacia la amenaza/jugador
            if (distToTarget < 280) {
                c.eyeLookAngle = angleDiff > 0 ? 0.1 : Math.PI - 0.1;
            }

            // --- 7. MÁQUINA DE ESTADOS DE INTELIGENCIA ARTIFICIAL ---
            c.aiTimer -= dt;
            const enrageSpeedMult = c.isEnraged ? 1.28 : 1.0;
            const enrageCdMult = c.isEnraged ? 0.65 : 1.0;

            // A. Telegráfo previo a salto o embestida (anticipación visual espectacular)
            if (c.telegraphTimer > 0) {
                c.telegraphTimer -= dt;
                c.aiState = 'TELEGRAPH';
                c.vTangential *= 0.75;
                c.facing = angleDiff > 0 ? 1 : -1;
                c.squashX = 1.24;
                c.squashY = 0.76;

                if (c.telegraphTimer <= 0) {
                    if (c.pendingAction === 'LEAP_ATTACK' || c.pendingAction === 'LEAP_FLEE') {
                        const dir = (c.pendingAction === 'LEAP_FLEE') ? (angleDiff > 0 ? -1 : 1) : (angleDiff > 0 ? 1 : -1);
                        c.facing = dir;
                        c.vRadial = (sp.jumpPower || 110) * (c.pendingAction === 'LEAP_FLEE' ? 1.08 : 1.0);
                        c.vTangential = dir * c.baseSpeed * (c.pendingAction === 'LEAP_FLEE' ? (sp.fleeMult || 2.1) : (sp.chaseMult || 1.65));
                        c.isAirborne = true;
                        c.squashX = 0.82;
                        c.squashY = 1.22;
                        c.jumpCooldown = (sp.jumpCooldown || 1.6) * enrageCdMult;
                        c.aiState = c.pendingAction === 'LEAP_FLEE' ? 'FLEE' : 'LEAP';
                        if (typeof createSmoke === 'function' && p.archetype) {
                            createSmoke(c.x, c.y, 2, 1.1 * c.scale, p.archetype.surfaceDustColor || [200, 210, 225], -dir * 8, -4, 0.28);
                        }
                    } else if (c.pendingAction === 'BLINK_AMBUSH' && sp.locomotion === 'blinker') {
                        // Salto dimensional instantáneo del Acechador de Grieta
                        if (typeof createSparks === 'function') {
                            createSparks(c.x, c.y, 12, 0, Math.PI * 2, 30, 120, [217, 70, 239], 0.35);
                        }
                        const jumpArc = clamp(angleDiff * 0.75, -0.09, 0.09);
                        c.angle = wrapAngle(c.angle + jumpArc);
                        c.blinkPhaseTimer = 0.35;
                        c.jumpCooldown = (sp.jumpCooldown || 1.8) * enrageCdMult;
                        c.aiState = 'CHASE';
                    }
                    c.pendingAction = null;
                }
            }
            // B. Huida asustadiza
            else if (c.fleeTimer > 0) {
                c.fleeTimer -= dt;
                c.aiState = 'FLEE';
                c.facing = angleDiff > 0 ? -1 : 1;
                const fleeSpd = c.baseSpeed * (sp.fleeMult || 2.2);

                if (!c.isAirborne && (c.locomotion === 'jumper' || c.locomotion === 'blinker') && c.jumpCooldown <= 0) {
                    c.telegraphTimer = 0.14;
                    c.pendingAction = 'LEAP_FLEE';
                } else {
                    c.vTangential = c.facing * fleeSpd;
                }

                if (c.locomotion === 'flyer' || c.locomotion === 'floater') {
                    const ceilingAlt = (sp.flyAltitudeMax || 80) + 32;
                    c.targetAltitude = Math.min(130, ceilingAlt);
                }
            }
            // C. Comportamiento Hostil / Violento / Jefe Ápex
            else if (temp.hostile || c.isEnraged) {
                const detRange = targetIsRocket ? (sp.rocketAggroRange || 200) : (sp.aggroRange || 160);

                if (distToTarget < detRange) {
                    c.facing = angleDiff > 0 ? 1 : -1;
                    c.aiState = 'CHASE';

                    if (!c._hasAlerted) {
                        c._hasAlerted = true;
                        c.alertTimer = 1.5;
                        if (typeof audio !== 'undefined') {
                            if (c.temperamentKey === 'APEX_BOSS' && audio.playCreatureRoar) audio.playCreatureRoar(0.75);
                            else if (audio.playCreatureAlert) audio.playCreatureAlert();
                        }
                    }

                    // Ajuste de altitud para voladores que atacan al cohete o al astronauta
                    if (c.locomotion === 'flyer' || c.locomotion === 'floater') {
                        const targetPolarR = Math.hypot(targetX - p.x, targetY - p.y);
                        const targetAlt = Math.max(8, c.onCeiling ? (surfaceR - targetPolarR) : (targetPolarR - surfaceR));
                        // Oscilación táctica: se lanzan en picada cuando están listos para atacar
                        c.targetAltitude = clamp(targetAlt + (c.attackCooldown > 0.5 ? 24 : 2), 6, 145);
                    }

                    // Movimiento de persecución o salto
                    const desiredRange = (sp.attackMode === 'ranged') ? 90 : 12 * c.scale;
                    if (distToTarget > desiredRange) {
                        const chaseSpd = c.baseSpeed * (sp.chaseMult || 1.45) * enrageSpeedMult;
                        if (!c.isAirborne && (c.locomotion === 'jumper' || c.locomotion === 'blinker') && c.jumpCooldown <= 0 && distToTarget < detRange * 0.92) {
                            c.telegraphTimer = 0.22 * enrageCdMult;
                            c.pendingAction = (c.locomotion === 'blinker' && distToTarget > 65) ? 'BLINK_AMBUSH' : 'LEAP_ATTACK';
                        } else {
                            c.vTangential = c.facing * chaseSpd;
                        }
                    } else {
                        c.vTangential *= 0.7;
                    }

                    // Ataque cuerpo a cuerpo / embestida al cohete o astronauta
                    const meleeRange = (targetIsRocket ? 26 : 16) * c.scale;
                    if (sp.attackMode !== 'ranged' && distToTarget <= meleeRange && c.attackCooldown <= 0) {
                        c.attackCooldown = (c.temperamentKey === 'HOSTILE_SLOW_TANK' ? 1.85 : 1.25) * enrageCdMult;
                        c.aiState = 'ATTACK';
                        c.squashX = 1.26;
                        c.squashY = 0.78;
                        executeCreatureMeleeAttack(c, targetIsRocket, p);
                    }

                    // Ataque a distancia / ráfaga de jefe
                    if ((sp.attackMode === 'ranged' || sp.attackMode === 'hybrid' || sp.attackMode === 'boss_multi') &&
                        distToTarget > meleeRange * 0.75 && distToTarget < detRange && c.rangedCooldown <= 0) {
                        const isBoss = (sp.attackMode === 'boss_multi');
                        c.rangedCooldown = (isBoss ? 1.9 : 2.5) * enrageCdMult;
                        c.aiState = 'ATTACK';
                        executeCreatureRangedAttack(c, targetX, targetY, isBoss);
                    }
                } else {
                    c._hasAlerted = false;
                    updateIdleWander(c, sp, distFromSanctuary, dt);
                }
            }
            // D. Neutral Territorial (advierte primero; ataca si te quedas encima)
            else if (c.temperamentKey === 'NEUTRAL_TERRITORIAL') {
                const warnRange = 88;
                if (distToTarget < warnRange) {
                    c.aiState = 'ALERT';
                    c.alertTimer = 0.5;
                    c.facing = angleDiff > 0 ? 1 : -1;
                    c.vTangential = 0;

                    if (distToTarget < 46 && c.rangedCooldown <= 0 && sp.attackMode === 'ranged') {
                        c.rangedCooldown = 2.4;
                        executeCreatureRangedAttack(c, targetX, targetY, false);
                    }
                } else {
                    updateIdleWander(c, sp, distFromSanctuary, dt);
                }
            }
            // E. Benévolo / Simbiótico (se acerca amigable y recarga O2)
            else if (c.temperamentKey === 'PEACEFUL_BENEVOLENT') {
                if (distToTarget < 110 && astroVel < 16 && shipSpeed < 22) {
                    c.facing = angleDiff > 0 ? 1 : -1;
                    if (distToTarget > 24) {
                        c.aiState = 'CURIOUS';
                        c.vTangential = c.facing * c.baseSpeed * 0.55;
                    } else {
                        c.aiState = 'IDLE';
                        c.vTangential = 0;
                    }
                    // Pulso restaurador de oxígeno EVA si está muy cerca
                    if (sp.healsO2 && isEVA && distToAstro < 55 && typeof astronaut !== 'undefined') {
                        astronaut.suitO2 = Math.min(100, (astronaut.suitO2 || 100) + dt * 4.5);
                        if (c.healPulseTimer <= 0) {
                            c.healPulseTimer = 0.85;
                            if (typeof createSparks === 'function') {
                                createSparks(c.x, c.y, 4, 0, Math.PI * 2, 12, 34, [56, 189, 248], 0.45);
                            }
                        }
                    }
                } else {
                    updateIdleWander(c, sp, distFromSanctuary, dt);
                }
            }
            // F. Asustadizos (DOCILE_SHY) y Colosos Serenos (PEACEFUL_COLOSSUS)
            else {
                const spookRange = (hasShip && !isEVA && ship.thrustIntensity > 0.25) ? 140 : 62;
                const spookSpeed = (hasShip && !isEVA) ? 18 : 10;

                if (c.temperamentKey === 'DOCILE_SHY' && (distToTarget < spookRange && (astroVel > spookSpeed || shipSpeed > spookSpeed || flameActive))) {
                    c.fleeTimer = 4.2 + Math.random() * 2.5;
                    c.alertTimer = 1.3;
                    c.facing = angleDiff > 0 ? -1 : 1;
                    if (typeof audio !== 'undefined' && audio.playCreatureChirp) audio.playCreatureChirp(1.25);
                } else {
                    updateIdleWander(c, sp, distFromSanctuary, dt);
                }
            }

            // --- 8. INTEGRACIÓN DE FÍSICA ORBITAL, SALTOS Y VUELO ---
            // Restricción de isla flotante para caminantes de islas
            if (c.islandRef && !c.isAirborne && c.locomotion !== 'flyer') {
                const islDiff = Math.atan2(Math.sin(c.angle - c.islandRef.angle), Math.cos(c.angle - c.islandRef.angle));
                if (Math.abs(islDiff) > c.islandRef.span * 0.86) {
                    c.facing = islDiff > 0 ? -1 : 1;
                    c.vTangential = c.facing * Math.abs(c.vTangential || c.baseSpeed * 0.5);
                }
            }

            const angVel = c.vTangential / Math.max(120, surfaceR);
            c.angle = wrapAngle(c.angle + angVel * dt);

            // Salto parabólico con gravedad del planeta
            if (c.isAirborne || c.vRadial !== 0) {
                const jumpGrav = clamp(185 * gravScale, 85, 320);
                c.vRadial -= jumpGrav * dt;
                c.altitude += c.vRadial * dt;
                c.pitchAngle = clamp(-c.vRadial * 0.0022, -0.35, 0.35);

                if (c.altitude <= 0) {
                    c.altitude = 0;
                    c.vRadial = 0;
                    c.isAirborne = false;
                    c.pitchAngle = 0;
                    c.squashX = 1.28;
                    c.squashY = 0.74;
                    if (typeof createSmoke === 'function' && p.archetype) {
                        createSmoke(c.x, c.y, 1, 1.0 * c.scale, p.archetype.surfaceDustColor || [200, 210, 225], 0, 0, 0.22);
                    }
                }
            } else if (c.locomotion === 'flyer') {
                c.flapCycle += dt * (Math.abs(c.vTangential) > 0.5 ? 6.5 : 3.6);
                const waveH = Math.sin(c.angle * 10 + c.flapCycle * 0.4) * 7;
                const desiredAlt = clamp(c.targetAltitude + waveH, 10, 145);
                c.altitude = lerp(c.altitude, desiredAlt, Math.min(1, dt * 3.2));
                c.pitchAngle = clamp((desiredAlt - c.altitude) * -0.015, -0.35, 0.35);
            } else if (c.locomotion === 'floater') {
                c.tentaclePhase += dt * 2.4;
                const bob = Math.sin(c.tentaclePhase) * 4.5;
                const desiredAlt = clamp(c.targetAltitude + bob, 10, 110);
                c.altitude = lerp(c.altitude, desiredAlt, Math.min(1, dt * 2.5));
                c.pitchAngle = 0;
            } else {
                c.altitude = 0;
                c.pitchAngle = 0;
            }

            // Ciclo de caminata y polvo de pisadas
            const moving = Math.abs(c.vTangential) > 0.3 && !c.isAirborne;
            if (moving) {
                c.walkCycle += dt * (Math.abs(c.vTangential) / (2.7 * Math.max(0.5, c.scale)));
                c.stepDustTimer -= dt;
                if (c.stepDustTimer <= 0 && c.altitude <= 1.0) {
                    c.stepDustTimer = (c.sizeClass === 'colossal' || c.sizeClass === 'titan_boss') ? 0.42 : 0.24;
                    if (typeof createSmoke === 'function' && p.archetype) {
                        const dScale = ((c.sizeClass === 'colossal' || c.sizeClass === 'titan_boss') ? 1.8 : 0.85) * c.scale;
                        createSmoke(c.x, c.y, 1, dScale, p.archetype.surfaceDustColor || [200, 210, 225], -c.facing * 3, 0, 0.24);
                    }
                    if ((c.sizeClass === 'colossal' || c.sizeClass === 'titan_boss') && distToTarget < 240 && typeof camera !== 'undefined') {
                        camera.shake = Math.max(camera.shake, 1.3);
                    }
                }
            } else if (!c.isAirborne) {
                c.walkCycle = lerp(c.walkCycle, 0, Math.min(1, dt * 5));
            }

            // Mantener altitud de vuelo base si no está persiguiendo
            if ((c.locomotion === 'flyer' || c.locomotion === 'floater') && c.aiState !== 'CHASE' && c.aiState !== 'FLEE') {
                const baseMid = ((sp.flyAltitudeMin || 22) + (sp.flyAltitudeMax || 68)) * 0.5;
                c.targetAltitude = lerp(c.targetAltitude, baseMid, dt * 0.5);
            }
        }
    }
}

function updateIdleWander(c, sp, distFromSanctuary, dt) {
    if (c.aiTimer <= 0) {
        c.aiTimer = 2.6 + Math.random() * 4.2;
        const r = Math.random();
        c.aiState = r < 0.32 ? 'IDLE' : (r < 0.52 ? 'GRAZE' : 'WANDER');

        if (c.aiState === 'WANDER') {
            c.facing = (Math.abs(distFromSanctuary) > 0.08)
                ? (distFromSanctuary > 0 ? -1 : 1)
                : (Math.random() < 0.5 ? 1 : -1);

            // Saltadores pacíficos dan saltitos exploratorios de vez en cuando
            if (c.locomotion === 'jumper' && !c.isAirborne && c.jumpCooldown <= 0 && Math.random() < 0.45) {
                c.vRadial = (sp.jumpPower || 90) * 0.72;
                c.vTangential = c.facing * c.baseSpeed * 1.1;
                c.isAirborne = true;
                c.jumpCooldown = (sp.jumpCooldown || 1.5) * 1.4;
            }
        }
    }
    if (!c.isAirborne) {
        c.vTangential = (c.aiState === 'WANDER') ? c.facing * c.baseSpeed * 0.58 : 0;
    }
}

// --- ATAQUES CUERPO A CUERPO Y A DISTANCIA (CONTRA ASTRONAUTA Y COHETE) ---

function executeCreatureMeleeAttack(c, targetIsRocket, planet) {
    const sp = c.spec || {};
    const isHeavy = (c.sizeClass === 'colossal' || c.sizeClass === 'titan_boss' || c.temperamentKey === 'HOSTILE_SLOW_TANK');

    if (!targetIsRocket && typeof astronaut !== 'undefined' && astronaut.active) {
        astronaut.vTangential += c.facing * (isHeavy ? 26.0 : 16.0);
        astronaut.vRadial += isHeavy ? 18.0 : 11.0;
        astronaut.suitO2 = Math.max(0, astronaut.suitO2 - c.damage);

        if (typeof camera !== 'undefined') camera.shake = Math.max(camera.shake, isHeavy ? 10.5 : 7.0);
        if (typeof audio !== 'undefined') {
            if (audio.playCreatureRoar) audio.playCreatureRoar(isHeavy ? 0.7 : 1.25);
            if (audio.playImpact) audio.playImpact(0.9);
        }
        if (typeof createSparks === 'function') {
            createSparks(astronaut.x, astronaut.y, 12, Math.random() * Math.PI * 2, 0.9, 45, 175, [239, 68, 68], 0.35);
        }
    } else if (typeof ship !== 'undefined') {
        const dmg = c.damage * (sp.rocketDamageMult || 0.75);
        // Empuje físico real al fuselaje del cohete
        const rx = ship.x - planet.x;
        const ry = ship.y - planet.y;
        const rLen = Math.hypot(rx, ry) || 1;
        const nx = rx / rLen;
        const ny = ry / rLen;
        const tx = -ny;
        const ty = nx;
        const impulse = isHeavy ? 24.0 : 13.0;

        ship.vx += tx * c.facing * impulse + nx * (isHeavy ? 12.0 : 6.0);
        ship.vy += ty * c.facing * impulse + ny * (isHeavy ? 12.0 : 6.0);
        ship.av += c.facing * (isHeavy ? 1.15 : 0.45);

        if (typeof takeDamage === 'function') {
            takeDamage(dmg, `¡Impacto de ${c.species} contra el casco del cohete!`);
        } else {
            ship.hull = Math.max(0, ship.hull - dmg);
        }

        if (typeof camera !== 'undefined') camera.shake = Math.max(camera.shake, isHeavy ? 11.0 : 6.5);
        if (typeof audio !== 'undefined') {
            if (audio.playCreatureRoar) audio.playCreatureRoar(isHeavy ? 0.72 : 1.1);
            if (audio.playImpact) audio.playImpact(0.95);
        }
        if (typeof createSparks === 'function') {
            createSparks(ship.x, ship.y, 16, Math.random() * Math.PI * 2, 1.0, 55, 200, [251, 191, 36], 0.42);
        }
    }
}

function executeCreatureRangedAttack(c, targetX, targetY, isBossBurst = false) {
    const sp = c.spec || {};
    const dx = targetX - c.x;
    const dy = targetY - c.y;
    const baseAngle = Math.atan2(dy, dx);
    const projType = sp.projectileType || 'arcane';

    const styleMap = {
        magma:    { color: [249, 115, 22],  speed: 240, dmg: 14, radius: 4.5 },
        acid:     { color: [163, 230, 53],  speed: 225, dmg: 12, radius: 4.0 },
        cryo:     { color: [125, 211, 252], speed: 270, dmg: 13, radius: 3.6 },
        electric: { color: [56, 189, 248],  speed: 310, dmg: 14, radius: 3.5 },
        arcane:   { color: [217, 70, 239],  speed: 235, dmg: 15, radius: 4.2 },
        laser:    { color: [244, 63, 94],   speed: 340, dmg: 13, radius: 3.2 },
        spore:    { color: [74, 222, 128],  speed: 205, dmg: 12, radius: 4.4 },
        silica:   { color: [251, 191, 36],  speed: 275, dmg: 14, radius: 3.6 },
        hydro:    { color: [34, 211, 238],  speed: 265, dmg: 15, radius: 4.2 }
    };
    const st = styleMap[projType] || styleMap.arcane;

    const shots = isBossBurst ? (c.isEnraged ? 3 : 2) : 1;
    for (let s = 0; s < shots; s++) {
        const spread = shots === 1 ? 0 : (s - (shots - 1) * 0.5) * 0.22;
        const ang = baseAngle + spread;
        plasmaProjectiles.push({
            x: c.x,
            y: c.y,
            vx: Math.cos(ang) * st.speed,
            vy: Math.sin(ang) * st.speed,
            angle: ang,
            life: 1.85,
            maxLife: 1.85,
            isShip: false,
            isHostile: true,
            projType,
            radius: st.radius,
            damage: st.dmg * (c.isEnraged ? 1.25 : 1.0),
            color: st.color
        });
    }

    if (typeof audio !== 'undefined' && audio.playCreatureAlert) {
        audio.playCreatureAlert();
    }
}

// --- DISPARO FOTÓNICO DEL JUGADOR Y PROYECTILES HOSTILES ---

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
        isHostile: false,
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
    const isEVA = (typeof astronaut !== 'undefined' && astronaut.active);
    const hasShip = (typeof ship !== 'undefined');

    for (let i = plasmaProjectiles.length - 1; i >= 0; i--) {
        const p = plasmaProjectiles[i];
        p.life -= dt;
        if (p.life <= 0) {
            plasmaProjectiles.splice(i, 1);
            continue;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        let hit = false;

        if (p.isHostile) {
            // Colisión de proyectil enemigo contra astronauta
            if (isEVA && Math.hypot(astronaut.x - p.x, astronaut.y - p.y) < 12 + (p.radius || 3)) {
                astronaut.suitO2 = Math.max(0, astronaut.suitO2 - p.damage);
                if (typeof camera !== 'undefined') camera.shake = Math.max(camera.shake, 5.5);
                if (typeof createSparks === 'function') {
                    createSparks(p.x, p.y, 10, p.angle + Math.PI, 0.8, 35, 130, p.color, 0.35);
                }
                if (typeof audio !== 'undefined' && audio.playImpact) audio.playImpact(0.75);
                hit = true;
            }
            // Colisión de proyectil enemigo contra cohete
            else if (hasShip && Math.hypot(ship.x - p.x, ship.y - p.y) < 18 * (ship.scale || 1) + (p.radius || 3)) {
                if (typeof takeDamage === 'function') {
                    takeDamage(p.damage * 0.8, '¡Proyectil alienígena impactó el casco!');
                } else {
                    ship.hull = Math.max(0, ship.hull - p.damage * 0.8);
                }
                ship.vx += Math.cos(p.angle) * 14;
                ship.vy += Math.sin(p.angle) * 14;
                if (typeof createSparks === 'function') {
                    createSparks(p.x, p.y, 12, p.angle + Math.PI, 0.9, 45, 160, p.color, 0.38);
                }
                hit = true;
            }
        } else if (nearbyPlanets) {
            // Proyectil del jugador contra criaturas
            for (const pl of nearbyPlanets) {
                if (!pl.creatures || pl.creatures.length === 0) continue;
                for (const c of pl.creatures) {
                    const hitRadius = Math.max(10, 14 * c.scale);
                    const dist = Math.hypot(c.x - p.x, c.y - p.y);
                    if (dist < hitRadius) {
                        const armorMult = 1 - Math.min(0.65, c.armor || 0);
                        c.hp -= p.damage * armorMult;
                        c.flashTimer = 0.16;

                        // Solo los no-jefes y no-violentos huyen al ser disparados; los violentos contraatacan!
                        if (c.temperamentKey === 'DOCILE_SHY' || c.temperamentKey === 'PEACEFUL_BENEVOLENT') {
                            c.fleeTimer = 4.5;
                            c.aiState = 'FLEE';
                        } else {
                            c.isEnraged = true;
                            c.alertTimer = 1.0;
                        }

                        if (typeof createSparks === 'function') {
                            createSparks(p.x, p.y, 10, p.angle + Math.PI, 0.6, 40, 140, p.color, 0.35);
                        }
                        if (typeof audio !== 'undefined' && audio.playCreatureHurt) {
                            audio.playCreatureHurt();
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

function spawnCreatureDeathFX(c, planet, isBurned = false) {
    if (typeof audio !== 'undefined' && audio.playCreatureDissolve) {
        audio.playCreatureDissolve();
    }
    if (typeof createShockwave === 'function') {
        const shockColor = isBurned ? 'rgba(251, 146, 60, 0.85)' : 'rgba(254, 240, 138, 0.85)';
        createShockwave(c.x, c.y, 32 * c.scale, 85, shockColor, 'ring');
    }
    if (typeof createSparks === 'function') {
        const sparkColor = isBurned ? [255, 110, 20] : [251, 191, 36];
        createSparks(c.x, c.y, isBurned ? 28 : 20, -Math.PI / 2, Math.PI, 35, 155, sparkColor, 0.65);
    }
    if (isBurned && typeof createSmoke === 'function') {
        createSmoke(c.x, c.y, 2, 2.0 * c.scale, [50, 45, 40], 0, -12, 0.45);
    }

    const orbCount = c.sizeClass === 'titan_boss' ? 8 : (c.sizeClass === 'colossal' ? 5 : (c.sizeClass === 'large' ? 3 : (c.sizeClass === 'tiny' ? 1 : 2)));
    for (let o = 0; o < orbCount; o++) {
        creatureEtherOrbs.push({
            x: c.x + (Math.random() - 0.5) * 10,
            y: c.y + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 18,
            vy: -12 - Math.random() * 18,
            angle: c.angle,
            planet,
            life: 28.0,
            value: 20 * (c.sizeClass === 'titan_boss' ? 6 : (c.sizeClass === 'colossal' ? 4 : 1))
        });
    }
}

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

        const dx = targetX - o.x;
        const dy = targetY - o.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 130 && dist > 0.1) {
            const pull = (1 - dist / 130) * 170;
            o.vx += (dx / dist) * pull * dt;
            o.vy += (dy / dist) * pull * dt;
        }

        o.vx *= 0.94;
        o.vy *= 0.94;
        o.x += o.vx * dt;
        o.y += o.vy * dt;

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

// --- RENDERIZADO EN ESCENA DE TODA LA FAUNA Y PROYECTILES ---

function drawPlanetCreatures(nearbyPlanets, timeSec) {
    if (!nearbyPlanets || nearbyPlanets.length === 0) return;

    for (const p of nearbyPlanets) {
        if (!p.creatures || p.creatures.length === 0) continue;

        for (const c of p.creatures) {
            const surfaceR = getCreatureSurfaceRadius(p, c.angle, c.inCavern, c.onCeiling, c.islandRef);
            const totalR = c.onCeiling ? (surfaceR - c.altitude) : (surfaceR + c.altitude);
            c.x = p.x + Math.cos(c.angle) * totalR;
            c.y = p.y + Math.sin(c.angle) * totalR;

            const distCam = Math.hypot(c.x - camera.x, c.y - camera.y);
            const viewRadius = (Math.max(screenW, screenH) / Math.max(0.12, camera.zoom)) * 0.85 + 220;
            if (distCam > viewRadius) continue;

            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.onCeiling ? (c.angle - Math.PI / 2) : (c.angle + Math.PI / 2));

            // Halo bioluminiscente en zoom alejado para avistar vida desde la órbita
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

            // Sombra proyectada en el suelo (se achica suavemente al saltar)
            const shadowAlpha = clamp(1 - c.altitude / 38, 0, 0.45);
            if (shadowAlpha > 0.02) {
                ctx.save();
                ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
                ctx.beginPath();
                const sShrink = clamp(1 - c.altitude / 60, 0.4, 1.0);
                ctx.ellipse(0, 0, Math.max(1, 9.5 * c.scale * sShrink), Math.max(0.5, 2.8 * c.scale * sShrink), 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            ctx.translate(0, -c.altitude);
            ctx.scale(c.facing, 1);

            // Renderizado articulado de la especie exclusiva
            if (typeof drawCreatureByType === 'function') {
                drawCreatureByType(ctx, c, timeSec);
            }

            // Iluminación dinámica sobre criaturas alcanzadas por focos o torres de luz
            const cLight = (typeof LightingEngine !== 'undefined') ? LightingEngine.samplePoint(c.x, c.y, 14 * c.scale) : null;
            if (cLight && cLight.illum > 0.03) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const crR = Math.max(12, 18 * c.scale);
                const cGlow = ctx.createRadialGradient(0, -6 * c.scale, 1, 0, -6 * c.scale, crR);
                const ca = clamp(cLight.illum * 0.42, 0, 0.50);
                cGlow.addColorStop(0.0, `rgba(${cLight.r}, ${cLight.g}, ${cLight.b}, ${ca.toFixed(3)})`);
                cGlow.addColorStop(0.6, `rgba(${cLight.r}, ${cLight.g}, ${cLight.b}, ${(ca * 0.30).toFixed(3)})`);
                cGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = cGlow;
                ctx.beginPath();
                ctx.arc(0, -6 * c.scale, crR, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Indicador de estado (huida / alerta / telegráfo / jefe)
            if (c.alertTimer > 0 || c.aiState === 'ALERT' || c.aiState === 'FLEE' || c.aiState === 'TELEGRAPH') {
                ctx.save();
                ctx.scale(c.facing, 1);
                const isFlee = (c.aiState === 'FLEE');
                const isTele = (c.aiState === 'TELEGRAPH');
                ctx.fillStyle = isFlee ? '#fbbf24' : (isTele ? '#f43f5e' : '#ef4444');
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(isFlee ? '!' : (isTele ? '⚡' : '!!'), 0, -22 * c.scale);
                ctx.restore();
            }

            // Barra de vida (siempre visible en Jefes Ápex cercanos o si ha sido dañada)
            if (c.hp < c.maxHp || c.temperamentKey === 'APEX_BOSS') {
                ctx.save();
                ctx.scale(c.facing, 1);
                const isBoss = (c.temperamentKey === 'APEX_BOSS');
                const barW = (isBoss ? 28 : 18) * c.scale;
                const barH = isBoss ? 2.8 : 2.0;
                const barY = -19 * c.scale;
                const pct = clamp(c.hp / c.maxHp, 0, 1);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                safeRoundRect(ctx, -barW * 0.5 - 1, barY - 1, barW + 2, barH + 2, 1.3);
                ctx.fill();

                ctx.fillStyle = isBoss ? (c.isEnraged ? '#f43f5e' : '#fb923c') : (pct > 0.4 ? '#34d399' : '#f87171');
                safeRoundRect(ctx, -barW * 0.5, barY, barW * pct, barH, 1.0);
                ctx.fill();
                ctx.restore();
            }

            ctx.restore();
        }
    }
}

function drawPlasmaProjectiles(timeSec) {
    if (plasmaProjectiles.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    for (const p of plasmaProjectiles) {
        if (p.isHostile) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const r = (p.radius || 3.8) * (1 + Math.sin(timeSec * 18) * 0.15);
            const g = ctx.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, r * 2.5);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.35, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0.9)`);
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Estela direccional
            ctx.strokeStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0.75)`;
            ctx.lineWidth = r * 0.9;
            ctx.beginPath();
            ctx.moveTo(p.x - Math.cos(p.angle) * 10, p.y - Math.sin(p.angle) * 10);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.restore();
        } else {
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
