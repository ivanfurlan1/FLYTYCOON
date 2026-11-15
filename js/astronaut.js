/**
 * ÉTER — Módulo EVA del Astronauta (Cosmonauta Explorador Vesper-01)
 * Simulación física de superficie, animación procedural biomecánica,
 * estabilización hidráulica de nave volcada, balizas persistentes y escaneo.
 */

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

function sfx(name, ...args) {
    if (typeof audio !== 'undefined' && typeof audio[name] === 'function') {
        try { audio[name](...args); } catch(e) {}
    }
}

const astronaut = {
    active: false,           // ¿Está el jugador fuera de la nave a pie?
    planet: null,            // Referencia al planeta actual sobre el que camina
    angle: -Math.PI / 2,     // Posición angular polar en el planeta
    altitude: 0,             // Altura sobre el terreno (m)
    vTangential: 0,          // Velocidad a lo largo de la superficie (m/s)
    vRadial: 0,              // Velocidad vertical perpendicular al suelo (m/s)
    radialPos: 0,            // Radio actual respecto al centro del planeta
    inCavern: false,         // ¿Explorando dentro de un mundo hueco?
    onCeiling: false,        // ¿Caminando sobre el techo por gravedad invertida?
    facing: 1,               // 1 = derecha / sentido horario, -1 = izquierda
    isGrounded: true,
    walkCycle: 0,            // Fase de animación de piernas y brazos
    jetpackFuel: 100,        // Propargol de gas frío del jetpack (0..100)
    suitO2: 100,             // Soporte vital de oxígeno del traje
    headlamp: false,         // Proyector deshabilitado en el diseño limpio
    x: 0,
    y: 0,
    
    // Sistema de acciones interactivas y retención (Hold-to-action)
    actionProgress: 0,       // 0..1 para la barra de progreso
    actionType: null,        // 'right_ship' | 'repair_ship' | 'scan'
    stepSoundTimer: 0,
    puffTimer: 0,
    disembarkFade: 0,        // Efecto visual de despliegue
    scanAnimTimer: 0,        // Temporizador de onda de escaneo
    
    // Sistema de construcción de bases planetarias
    selectedBaseLevel: 1,    // 1: Plataforma, 2: Puesto, 3: Complejo
    isHoldingBuildBtn: false,// Pulsación táctil/ratón de construcción
    buildTargetBase: null,   // Base existente si se está mejorando
    
    // Sistema de selección y construcción de cohetes en el astillero
    selectedRocketModel: 'starship',
    isHoldingRocketBuildBtn: false,

    // Sistema de reserva de combustible, inventario de minerales y extractores
    fuelReserve: 30,             // Reserva portátil de Éter Combustible (L)
    fuelReserveLevel: 1,         // Nivel del tanque portátil EVA (1..4)
    inventory: {},               // Mapa { resourceId: cantidad }
    prospectedZones: {},         // Mapa { planetKey: [{ angle, deg, fuelRichness, regionName }] }
    isHoldingExtractorBtn: false,
    isHoldingRefuelBtn: false,
    autoDeployExtractor: false,
    autoRefuelShip: false,
    
    // Balizas persistentes plantadas en mundos
    plantedBeacons: []
};

// --- DESEMBARQUE Y ABORDAJE ---

/**
 * Desembarcar de la sonda Vesper-IX a la superficie del planeta
 */
function disembarkShip() {
    const nearby = getNearbyPlanets(ship.x, ship.y, 1);
    let targetPlanet = null;
    let minDist = Infinity;
    
    for (const p of nearby) {
        const d = Math.hypot(ship.x - p.x, ship.y - p.y);
        const surfaceR = getSurfaceRadius(p, Math.atan2(ship.y - p.y, ship.x - p.x));
        const alt = d - surfaceR;
        if (alt < minDist) {
            minDist = alt;
            targetPlanet = p;
        }
    }

    if (!targetPlanet) {
        showHoloCard(getPlanet(0, 0), 'DESEMBARQUE IMPOSIBLE', 'Se requiere aproximación inmediata a la superficie.');
        return false;
    }

    // Calcular cota inferior efectiva de la nave para desembarque seguro en cualquier modelo o cohete VAB
    let distToPads = 15.5;
    let halfWidth = 12;
    if (ship.customRocket) {
        if (ship.customRocket.contactPoints && ship.customRocket.contactPoints.length > 0) {
            const padPts = ship.customRocket.contactPoints.filter(pt => pt.isPad);
            const searchList = padPts.length > 0 ? padPts : ship.customRocket.contactPoints;
            distToPads = Math.abs(Math.min(...searchList.map(pt => pt.x)));
        }
        if (ship.customRocket.bounds) {
            halfWidth = Math.max(12, (ship.customRocket.bounds.width || 30) * 0.5 * 0.5);
        }
    } else if (ship.scale) {
        distToPads = 15.5 * ship.scale;
        halfWidth = 12 * ship.scale;
    }

    const altitudeAbovePads = Math.max(0, minDist - distToPads);
    const shipSpeed = Math.hypot(ship.vx, ship.vy);

    if (!ship.isGrounded && (altitudeAbovePads > 22 || shipSpeed > 22)) {
        showHoloCard(targetPlanet, 'SONDA EN MOVIMIENTO', 'Aterriza o posa la sonda firmemente antes de desembarcar.');
        return false;
    }

    // Inicializar posición del astronauta en la escotilla
    astronaut.active = true;
    astronaut.planet = targetPlanet;
    
    // Ángulo polar de la nave respecto al centro del planeta
    const shipAngle = Math.atan2(ship.y - targetPlanet.y, ship.x - targetPlanet.x);
    const shipDistR = Math.hypot(ship.x - targetPlanet.x, ship.y - targetPlanet.y);
    const inCav = !!(targetPlanet.isHollow && typeof isShipInsideCavern === 'function' && isShipInsideCavern(targetPlanet, ship.x, ship.y));
    const ceilR = targetPlanet.isHollow && typeof getCavernCeilingRadius === 'function' ? getCavernCeilingRadius(targetPlanet, shipAngle) : targetPlanet.radius;
    const onCeil = !!(inCav && targetPlanet.hollowPhysicsMode === 'inverted_shell' && Math.abs(shipDistR - ceilR) < Math.abs(shipDistR - (typeof getCavernFloorRadius === 'function' ? getCavernFloorRadius(targetPlanet, shipAngle) : targetPlanet.radius * 0.44)));

    // Desplegarse al costado seguro del cohete según su envergadura real
    const safeAngleOffset = Math.max(0.0004, (halfWidth + 14) / Math.max(800, shipDistR));
    astronaut.angle = shipAngle + (onCeil ? -safeAngleOffset : safeAngleOffset);
    if (typeof camera !== 'undefined') camera.userZoomMult = 1.0;
    astronaut.inCavern = inCav;
    astronaut.onCeiling = onCeil;
    astronaut.altitude = 1.5;
    astronaut.vTangential = 0;
    astronaut.vRadial = 0;
    astronaut.facing = 1;
    astronaut.isGrounded = false;
    astronaut.walkCycle = 0;
    astronaut.actionProgress = 0;
    astronaut.actionType = null;
    astronaut.disembarkFade = 1.0;

    // Calcular coordenadas cartesianas iniciales (exterior, isla flotante, suelo de caverna o techo invertido)
    const islStart = (typeof getFloatingIslandAt === 'function') ? getFloatingIslandAt(targetPlanet, astronaut.angle, shipDistR, true) : null;
    let sr = (typeof getCavernOrSurfaceRadius === 'function')
        ? getCavernOrSurfaceRadius(targetPlanet, astronaut.angle, inCav, onCeil)
        : getSurfaceRadius(targetPlanet, astronaut.angle);
    if (islStart && Math.abs(shipDistR - islStart.topR) < 60) sr = islStart.topR;
    astronaut.radialPos = onCeil ? (sr - astronaut.altitude) : (sr + astronaut.altitude);
    astronaut.x = targetPlanet.x + Math.cos(astronaut.angle) * astronaut.radialPos;
    astronaut.y = targetPlanet.y + Math.sin(astronaut.angle) * astronaut.radialPos;

    // Detener propulsión de la nave y poner en modo estacionario
    ship.thrusting = false;
    ship.warping = false;
    ship.turnVal = 0;
    ship.targetAngle = null;

    // Efectos sonoros y partículas de descompresión de escotilla
    if (typeof audio !== 'undefined' && audio.init) audio.init();
    sfx('playAirlock', true);
    
    // Puffs de vapor criogénico saliendo de la escotilla delantera
    const hatchDist = (ship.customRocket && ship.customRocket.bounds) ? (-ship.customRocket.bounds.minY * 0.5 * 0.6) : (3 * (ship.scale || 1.0));
    const hatchX = ship.x + Math.cos(ship.angle) * hatchDist;
    const hatchY = ship.y + Math.sin(ship.angle) * hatchDist;
    createSmoke(hatchX, hatchY, 6, 3.5, [220, 240, 255], 0, 0, 0.6, 25);
    createSparks(hatchX, hatchY, 8, ship.angle + Math.PI / 2, 0.4, 30, 90, [254, 240, 138], 0.35);

    showHoloCard(targetPlanet, 'EVA INICIADA — ' + targetPlanet.name.toUpperCase(), 
        'Explora la superficie y acércate a estructuras para interactuar.');
    return true;
}

/**
 * Localiza la nave más cercana al cosmonauta (ya sea la nave activa o cualquier nave estacionada)
 */
function getClosestShipToAstronaut() {
    let closest = { shipObj: ship, isParked: false, parkedIndex: -1, dist: Math.hypot(astronaut.x - ship.x, astronaut.y - ship.y) };
    if (typeof parkedShips !== 'undefined' && Array.isArray(parkedShips)) {
        for (let i = 0; i < parkedShips.length; i++) {
            const ps = parkedShips[i];
            const d = Math.hypot(astronaut.x - ps.x, astronaut.y - ps.y);
            if (d < closest.dist) {
                closest = { shipObj: ps, isParked: true, parkedIndex: i, dist: d };
            }
        }
    }
    return closest;
}

/**
 * Abordar de regreso a la sonda o cohete más próximo
 */
function boardShip() {
    if (!astronaut.active) return false;
    
    const target = getClosestShipToAstronaut();
    let padSpan = 25;
    if (target.shipObj && target.shipObj.customRocket && target.shipObj.customRocket.bounds) {
        padSpan = Math.max(25, (target.shipObj.customRocket.bounds.height || 60) * 0.5 * 0.5);
    }
    const targetScale = (target.shipObj && target.shipObj.scale) ? target.shipObj.scale : 1.0;
    const maxBoardDist = Math.max(70 * Math.max(1.0, targetScale * 0.9), padSpan * 2.2);

    if (target.dist > maxBoardDist) {
        showHoloCard(astronaut.planet, 'DISTANCIA EXCESIVA', 'Aproxímate a la escotilla del cohete para abordar.');
        return false;
    }

    // Si la nave más cercana es una nave estacionada, intercambiarla con la nave principal del jugador
    if (target.isParked) {
        const ps = parkedShips.splice(target.parkedIndex, 1)[0];
        
        // Guardar la nave activa previa en la flota estacionada
        parkedShips.push({
            id: 'ship_' + Date.now(),
            modelKey: ship.modelKey || 'vesper',
            customRocket: ship.customRocket || null,
            x: ship.x,
            y: ship.y,
            vx: 0, vy: 0,
            angle: ship.angle, av: 0,
            hull: ship.hull, maxHull: ship.maxHull || 100,
            fuel: ship.fuel, maxFuel: ship.maxFuel || 100,
            scale: ship.scale || 1.0,
            isGrounded: true,
            leftGearSpring: { pos: 0.8, vel: 0, target: 0 },
            rightGearSpring: { pos: 0.8, vel: 0, target: 0 }
        });

        // Configurar la nueva nave en ship
        ship.x = ps.x;
        ship.y = ps.y;
        ship.angle = ps.angle;
        ship.vx = 0; ship.vy = 0; ship.av = 0;
        ship.isGrounded = true;
        ship.leftGearSpring = ps.leftGearSpring || { pos: 0.8, vel: 0, target: 0 };
        ship.rightGearSpring = ps.rightGearSpring || { pos: 0.8, vel: 0, target: 0 };
        ship.customRocket = ps.customRocket || null;
        applyRocketModel(ship, ps.modelKey || 'vesper');
        ship.hull = ps.hull !== undefined ? ps.hull : ship.maxHull;
        ship.fuel = ps.fuel !== undefined ? ps.fuel : ship.maxFuel;
    }

    astronaut.active = false;
    astronaut.inCavern = false;
    astronaut.onCeiling = false;
    astronaut.actionProgress = 0;
    astronaut.actionType = null;

    // Efecto de sellado de esclusa y presurización
    sfx('playAirlock', false);
    sfx('playChime');

    const hatchDist = (ship.customRocket && ship.customRocket.bounds) ? (-ship.customRocket.bounds.minY * 0.5 * 0.6) : (3 * (ship.scale || 1.0));
    const hatchX = ship.x + Math.cos(ship.angle) * hatchDist;
    const hatchY = ship.y + Math.sin(ship.angle) * hatchDist;
    createSmoke(hatchX, hatchY, 4, 3, [200, 230, 255], 0, 0, 0.45, 15);

    const m = (typeof getRocketModel === 'function') ? getRocketModel(ship.modelKey) : { name: 'Cohete Espacial' };
    showHoloCard(astronaut.planet, 'SISTEMAS REENGANCHADOS — ' + m.name.toUpperCase(), 
        'Abordaje nominal completado. Control manual de vuelo activo.');
    return true;
}

// --- FÍSICA Y SIMULACIÓN CINEMÁTICA DE SUPERFICIE ---

function updateAstronautPhysics(dt) {
    if (!astronaut.active || !astronaut.planet) return;

    const p = astronaut.planet;
    const baseG = (p.gravityForce || 280) * 0.48; // Gravedad local ajustada para movimiento ágil
    const hollowBounds = (p.isHollow && typeof getHollowBoundsAt === 'function') ? getHollowBoundsAt(p, astronaut.angle) : null;

    // Transición automática de entrada/salida de cueva al explorar a pie o con jetpack
    if (p.isHollow && hollowBounds) {
        if (!astronaut.inCavern && astronaut.radialPos > 0 && astronaut.radialPos < hollowBounds.cavernTriggerR) {
            astronaut.inCavern = true;
        } else if (astronaut.inCavern && hollowBounds.isThroatOpen && astronaut.radialPos > hollowBounds.extR - 6) {
            astronaut.inCavern = false;
            astronaut.onCeiling = false;
        }
        astronaut.onCeiling = !!(astronaut.inCavern && p.hollowPhysicsMode === 'inverted_shell' && astronaut.radialPos > (hollowBounds.floorR + hollowBounds.ceilR) * 0.48);
    } else {
        astronaut.inCavern = false;
        astronaut.onCeiling = false;
    }

    const g = (astronaut.inCavern && p.hollowPhysicsMode === 'microgravity_vortex')
        ? baseG * 0.25
        : ((astronaut.inCavern && p.hollowPhysicsMode === 'crystal_resonance') ? baseG * 0.22 : (astronaut.onCeiling ? baseG * 0.55 : baseG));

    // Seleccionar radio de soporte actual (isla flotante, garganta, suelo de caverna, techo invertido o corteza)
    const islHit = (typeof getFloatingIslandAt === 'function') ? getFloatingIslandAt(p, astronaut.angle, astronaut.radialPos || null, true) : null;
    const useFloatingSupport = !!(islHit && (astronaut.radialPos || 0) >= islHit.topR - 18 && (astronaut.radialPos || 0) <= islHit.topR + 180);

    let surfaceR = getSurfaceRadius(p, astronaut.angle);
    if (useFloatingSupport) {
        surfaceR = islHit.topR;
    } else if (p.isHollow && hollowBounds) {
        if (astronaut.inCavern) {
            surfaceR = astronaut.onCeiling ? hollowBounds.effectiveCeilingR : hollowBounds.floorR;
        } else if (hollowBounds.isThroatOpen) {
            surfaceR = hollowBounds.floorR;
        } else {
            surfaceR = hollowBounds.extR;
        }
    }

    // Controles de entrada de usuario cuando se está en modo EVA
    let inputMove = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) inputMove -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) inputMove += 1;
    const isSprinting = !!(keys['ShiftLeft'] || keys['ShiftRight']);
    astronaut.isSprinting = isSprinting && inputMove !== 0;

    if (inputMove !== 0) {
        astronaut.facing = inputMove > 0 ? 1 : -1;
    }

    // Aceleración tangencial (trote ágil y carrera/sprint con Shift sobre la superficie, con respuesta sutil a pendientes)
    const walkSpeed = 48.0;
    const sprintSpeed = 96.0;
    let slopeFactor = 1.0;
    if (astronaut.isGrounded && !astronaut.inCavern && !astronaut.onCeiling && inputMove !== 0 && p.radius > 0) {
        const eps = clamp(8 / Math.max(250, p.radius), 0.00015, 0.015);
        const dirSign = astronaut.onCeiling ? -inputMove : inputMove;
        const dr = getSurfaceRadius(p, astronaut.angle + dirSign * eps) - getSurfaceRadius(p, astronaut.angle - dirSign * eps);
        const dirSlope = dr / (2 * eps * Math.max(250, surfaceR));
        if (dirSlope > 0.14) {
            slopeFactor = clamp(1 - (dirSlope - 0.14) * 0.40, 0.58, 1.0);
        } else if (dirSlope < -0.14) {
            slopeFactor = clamp(1 + (-dirSlope - 0.14) * 0.12, 1.0, 1.12);
        }
    }
    const groundSpeed = (isSprinting ? sprintSpeed : walkSpeed) * slopeFactor;
    const airSpeed = isSprinting ? 72.0 : 38.0;
    const targetTangential = inputMove * (astronaut.isGrounded ? groundSpeed : airSpeed);
    const accelRate = astronaut.isGrounded ? (isSprinting ? 11.5 : 14.5) : 5.5;
    astronaut.vTangential = lerp(astronaut.vTangential, targetTangential, dt * accelRate);

    const wasGrounded = astronaut.isGrounded;
    // Salto y Jetpack de gas frío (Espacio / W / Flecha arriba)
    const jumpRequested = keys['Space'] || keys['KeyW'] || keys['ArrowUp'];

    if (jumpRequested) {
        if (astronaut.isGrounded) {
            // Impulso inicial de despegue con las botas (más potente en carrera)
            astronaut.vRadial = isSprinting ? 46.0 : 40.0;
            astronaut.isGrounded = false;
            sfx('playJetpackPuff');

            // Polvo en el suelo al despegar
            const dustSign = astronaut.onCeiling ? 1 : -1;
            const pNorm = astronaut.angle;
            createSmoke(astronaut.x, astronaut.y, isSprinting ? 4 : 3, 2.5, p.archetype.surfaceDustColor, dustSign * Math.cos(pNorm) * 10, dustSign * Math.sin(pNorm) * 10, 0.35);
        } else if (astronaut.jetpackFuel > 0) {
            // Sustentación sostenida por micro-propulsores de mochila PLSS
            const thrustAcc = Math.max(g * 1.65, 95);
            const maxAscent = isSprinting ? 56.0 : 46.0;
            astronaut.vRadial = Math.min(maxAscent, astronaut.vRadial + thrustAcc * dt);
            astronaut.jetpackFuel = Math.max(0, astronaut.jetpackFuel - dt * 18.0);

            // Emisión de micro-chorros de gas frío
            astronaut.puffTimer += dt;
            if (astronaut.puffTimer > 0.08) {
                astronaut.puffTimer = 0;
                sfx('playJetpackPuff');

                const jetAngle = astronaut.onCeiling ? (astronaut.angle + Math.PI) : astronaut.angle;
                const rotBasis = astronaut.onCeiling ? (astronaut.angle - Math.PI / 2) : (astronaut.angle + Math.PI / 2);
                const backX = astronaut.x - Math.cos(rotBasis) * (astronaut.facing * 3);
                const backY = astronaut.y - Math.sin(rotBasis) * (astronaut.facing * 3);

                particles.push({
                    x: backX + (Math.random() - 0.5) * 2,
                    y: backY + (Math.random() - 0.5) * 2,
                    vx: Math.cos(jetAngle) * (60 + Math.random() * 40),
                    vy: Math.sin(jetAngle) * (60 + Math.random() * 40),
                    size: 2.2 + Math.random() * 1.2,
                    life: 0.22,
                    maxLife: 0.22,
                    isWarp: false,
                    type: 'plume',
                    customRGB: [224, 242, 254]
                });
            }
        }
    } else {
        // Recargar propargol en reposo en tierra
        if (astronaut.isGrounded) {
            astronaut.jetpackFuel = Math.min(100, astronaut.jetpackFuel + dt * 32.0);
        }
    }

    // Impulso de géiseres activos bajo los pies del astronauta
    if (p.phenomena && p.phenomena.length > 0 && !astronaut.inCavern) {
        const curT = performance.now() / 1000;
        for (const ph of p.phenomena) {
            if (ph.type !== 'geyser') continue;
            const intensity = (typeof getGeyserIntensity === 'function') ? getGeyserIntensity(ph, curT) : 0;
            if (intensity <= 0.1) continue;
            const dAng = Math.abs(Math.atan2(Math.sin(astronaut.angle - ph.angle), Math.cos(astronaut.angle - ph.angle)));
            if (dAng <= ph.span * 1.4 && astronaut.altitude <= ph.reachHeight) {
                astronaut.vRadial = Math.min(140, astronaut.vRadial + ph.force * 2.2 * intensity * dt);
                astronaut.isGrounded = false;
            }
        }
    }

    // Aplicar gravedad radial relativa a la superficie de apoyo actual
    astronaut.vRadial -= g * dt;
    const stepSign = astronaut.onCeiling ? -1 : 1;
    const prevRadial = astronaut.radialPos || (surfaceR + astronaut.altitude);
    let nextRadial = prevRadial + stepSign * astronaut.vRadial * dt;

    // Resolver soporte y techo en mundos huecos e islas flotantes
    if (astronaut.onCeiling) {
        if (nextRadial >= surfaceR) {
            nextRadial = surfaceR;
            if (!astronaut.isGrounded && astronaut.vRadial < -12) sfx('playFootstep');
            astronaut.vRadial = 0;
            astronaut.isGrounded = true;
        } else {
            astronaut.isGrounded = false;
        }
        astronaut.altitude = Math.max(0, surfaceR - nextRadial);
    } else {
        if (nextRadial <= surfaceR || (wasGrounded && !jumpRequested && astronaut.vRadial <= 2 && (nextRadial - surfaceR) < 4.5)) {
            nextRadial = surfaceR;
            if (!wasGrounded && astronaut.vRadial < -12) {
                sfx('playFootstep');
                createSmoke(astronaut.x, astronaut.y, 2, 2.2, p.archetype.surfaceDustColor, 0, 0, 0.3);
            }
            astronaut.vRadial = 0;
            astronaut.isGrounded = true;
        } else {
            astronaut.isGrounded = false;
        }
        // Evitar atravesar techo sólido de la caverna en mundos huecos con gravedad normal
        if (astronaut.inCavern && hollowBounds && !hollowBounds.isThroatOpen && nextRadial > hollowBounds.effectiveCeilingR - 14) {
            nextRadial = hollowBounds.effectiveCeilingR - 14;
            if (astronaut.vRadial > 0) astronaut.vRadial = -4;
        }
        astronaut.altitude = Math.max(0, nextRadial - surfaceR);
    }
    astronaut.radialPos = nextRadial;

    // Actualizar coordenada angular polar a lo largo del perímetro esférico
    const currentRadius = Math.max(200, astronaut.radialPos);
    const tangSign = astronaut.onCeiling ? -1 : 1;
    astronaut.angle += tangSign * (astronaut.vTangential / currentRadius) * dt;

    // Calcular coordenadas cartesianas en el cosmos
    astronaut.x = p.x + Math.cos(astronaut.angle) * currentRadius;
    astronaut.y = p.y + Math.sin(astronaut.angle) * currentRadius;

    // Detección de inmersión en lagunas exteriores o subterráneas (excluyendo plataformas flotantes)
    const lakeInfo = !useFloatingSupport
        ? (astronaut.inCavern
            ? (typeof getCavernLakeAtAngle === 'function' ? getCavernLakeAtAngle(p, astronaut.angle) : null)
            : (typeof getPlanetLakeAtAngle === 'function' ? getPlanetLakeAtAngle(p, astronaut.angle) : null))
        : null;
    const inLake = !astronaut.onCeiling && !!lakeInfo && (currentRadius <= lakeInfo.waterLevel + 2.5);

    if (inLake) {
        // Amortiguación viscosa hidrodinámica al vadear fluido
        astronaut.vTangential *= Math.pow(0.86, dt * 8);
        if (astronaut.altitude <= 0 && lakeInfo.waterLevel > surfaceR + 1) {
            astronaut.vRadial += (p.gravityForce || 280) * 0.22 * dt;
        }
    }

    // Animación de pasos e infusión de pisadas
    if (astronaut.isGrounded && Math.abs(astronaut.vTangential) > 1.2) {
        astronaut.walkCycle += dt * (Math.abs(astronaut.vTangential) * (astronaut.isSprinting ? 0.30 : 0.38));
        astronaut.stepSoundTimer += dt;
        const stepInterval = astronaut.isSprinting ? 0.16 : 0.24;
        if (astronaut.stepSoundTimer > stepInterval) {
            astronaut.stepSoundTimer = 0;
            sfx('playFootstep');
            if (inLake) {
                // Ondas y salpicaduras líquidas al caminar en el agua
                createLiquidRipple(p, astronaut.angle, 9, p.archetype.accentColor);
            } else {
                // Pequeña mota de polvo al correr
                createSmoke(astronaut.x, astronaut.y, astronaut.isSprinting ? 2 : 1, astronaut.isSprinting ? 2.2 : 1.8, p.archetype.surfaceDustColor, -astronaut.facing * (astronaut.isSprinting ? 14 : 8), 0, 0.25);
            }
        }
    } else if (astronaut.isGrounded) {
        astronaut.walkCycle = lerp(astronaut.walkCycle, 0, dt * 10);
    }

    // Actualizar efectos de temporizador
    if (astronaut.disembarkFade > 0) {
        astronaut.disembarkFade = Math.max(0, astronaut.disembarkFade - dt * 2.0);
    }
    if (astronaut.scanAnimTimer > 0) {
        astronaut.scanAnimTimer = Math.max(0, astronaut.scanAnimTimer - dt * 2.2);
    }

    // --- DETECCIÓN DE INTERACCIONES CON LA NAVE ---
    handleAstronautInteractions(dt);
}

// --- INTERACCIONES: ENDEREZAR NAVE, REPARAR Y ESCANEAR ---

function handleAstronautInteractions(dt) {
    const p = astronaut.planet;
    const distToShip = Math.hypot(astronaut.x - ship.x, astronaut.y - ship.y);
    const shipZenith = Math.atan2(ship.y - p.y, ship.x - p.x);
    
    // Inclinación respecto a la vertical del planeta
    const tilt = Math.atan2(Math.sin(ship.angle - shipZenith), Math.cos(ship.angle - shipZenith));
    const isShipTilted = Math.abs(tilt) > 0.32; // Más de ~18 grados volcada o sobre el flanco
    const isShipDamaged = ship.hull < 99.0;

    // Cota inferior efectiva y distancia de interacción adaptativa según modelo
    let padDist = 15.5;
    if (ship.customRocket && ship.customRocket.contactPoints) {
        const padPts = ship.customRocket.contactPoints.filter(pt => pt.isPad);
        const searchList = padPts.length > 0 ? padPts : ship.customRocket.contactPoints;
        padDist = Math.abs(Math.min(...searchList.map(pt => pt.x)));
    } else if (ship.scale) {
        padDist = 15.5 * ship.scale;
    }
    const maxInteractDist = Math.max(58, padDist * 1.6);

    // 1. ENDEREZAR NAVE VOLCADA (Gato hidráulico de campo / Rayo cinético tractor)
    if (distToShip < maxInteractDist && isShipTilted) {
        const isHoldingRight = keys['KeyR'] || keys['KeyX'] || (keys['Space'] && astronaut.isGrounded);
        
        if (isHoldingRight) {
            astronaut.actionType = 'right_ship';
            astronaut.actionProgress += dt / 1.6; // ~1.6 segundos para completar

            // Efectos visuales y de sonido durante la estabilización
            if (Math.random() < 0.4) {
                sfx('playHydraulic');
            }
            if (Math.random() < 0.7) {
                createSparks(ship.x + (Math.random() - 0.5) * 12, ship.y + (Math.random() - 0.5) * 12, 
                    2, Math.random() * Math.PI * 2, 0.4, 40, 120, [56, 189, 248], 0.3);
            }

            if (astronaut.actionProgress >= 1.0) {
                // ¡ACCIÓN COMPLETADA: Enderezar la nave erguida con sus patas!
                astronaut.actionProgress = 0;
                astronaut.actionType = null;

                // Restablecer ángulo y física de la nave
                ship.angle = shipZenith;
                ship.av = 0;
                ship.vx = 0;
                ship.vy = 0;
                
                // Elevarla al nivel nominal de sus patas sobre el terreno
                const shipSr = getSurfaceRadius(p, shipZenith);
                ship.x = p.x + Math.cos(shipZenith) * (shipSr + padDist + 1.0);
                ship.y = p.y + Math.sin(shipZenith) * (shipSr + padDist + 1.0);
                ship.isGrounded = true;
                ship.leftGearSpring.pos = 0.55;
                ship.rightGearSpring.pos = 0.55;

                // Efectos de asentamiento
                sfx('playImpact', 0.7);
                sfx('playChime');
                createShockwave(ship.x, ship.y, 40, 160, 'rgba(56, 189, 248, 0.85)', 'ring');
                createSmoke(ship.x, ship.y, 8, 4.5, p.archetype.surfaceDustColor, 0, 0, 0.5, 35);

                showHoloCard(p, 'SONDA ENDEREZADA Y ESTABILIZADA', 'Tren oleoneumático nivelado al cenit. Vector de despegue nominal.');
            }
        } else if (astronaut.actionType === 'right_ship') {
            astronaut.actionProgress = Math.max(0, astronaut.actionProgress - dt * 2.5);
            if (astronaut.actionProgress === 0) astronaut.actionType = null;
        }
    }
    // 2. REPARACIÓN DE EMERGENCIA DE CASCO (Soplete de nanitas)
    else if (distToShip < maxInteractDist && isShipDamaged && !isShipTilted) {
        const isHoldingRepair = keys['KeyR'];
        if (isHoldingRepair) {
            astronaut.actionType = 'repair_ship';
            astronaut.actionProgress += dt / 2.2;
            
            ship.hull = Math.min(100, ship.hull + dt * 26.0);
            
            if (Math.random() < 0.6) {
                sfx('playRepairTorch');
                createSparks(ship.x + (Math.random() - 0.5) * 16, ship.y + (Math.random() - 0.5) * 16, 
                    3, Math.random() * Math.PI * 2, 0.4, 50, 160, [251, 191, 36], 0.35);
            }

            if (ship.hull >= 100) {
                astronaut.actionProgress = 0;
                astronaut.actionType = null;
                sfx('playChime');
                showHoloCard(p, 'INTEGRIDAD REPARADA AL 100%', 'Casco reforzado de titanio completamente reconstituido.');
            }
        } else if (astronaut.actionType === 'repair_ship') {
            astronaut.actionProgress = Math.max(0, astronaut.actionProgress - dt * 2.5);
            if (astronaut.actionProgress === 0) astronaut.actionType = null;
        }
    } else {
        if (astronaut.actionType === 'right_ship' || astronaut.actionType === 'repair_ship') {
            astronaut.actionProgress = Math.max(0, astronaut.actionProgress - dt * 3.0);
            if (astronaut.actionProgress === 0) astronaut.actionType = null;
        }
    }

    // 3. CONSTRUCCIÓN Y MEJORA DE BASE PLANETARIA (MANTENER TECLA C O BOTÓN SOSTENIDO)
    const isHoldingBuild = (keys['KeyC'] || astronaut.isHoldingBuildBtn) && astronaut.isGrounded;
    const nearbyBase = findNearbyBase(p, astronaut.angle, 1.05);

    if (isHoldingBuild) {
        const isUpgrade = !!nearbyBase;
        const targetLevel = isUpgrade ? Math.min(3, nearbyBase.level + 1) : (astronaut.selectedBaseLevel || 1);

        if (isUpgrade && nearbyBase.level >= 3) {
            astronaut.actionProgress = 0;
            astronaut.actionType = null;
            if (!astronaut._maxBaseAlertShown) {
                astronaut._maxBaseAlertShown = true;
                showHoloCard(p, 'COMPLEJO AL MÁXIMO NIVEL (NV. 3)', 'La Ciudadela Colonial Cuántica ya posee todas las instalaciones avanzadas.');
                setTimeout(() => { astronaut._maxBaseAlertShown = false; }, 3200);
            }
        } else {
            astronaut.actionType = 'build_base';
            astronaut.buildTargetBase = nearbyBase;
            const buildTime = isUpgrade ? (targetLevel === 2 ? 2.5 : 3.5) : (BASE_LEVELS[targetLevel].buildTime || 2.5);
            astronaut.actionProgress += dt / buildTime;

            sfx('playBaseBuild', astronaut.actionProgress);

            // Chispas y efectos de ensamblaje en el suelo
            const baseSpan = isUpgrade ? nearbyBase.width : BASE_LEVELS[targetLevel].width;
            if (Math.random() < 0.75) {
                const off = (Math.random() - 0.5) * baseSpan * 0.75;
                const spAng = (isUpgrade ? nearbyBase.angle : astronaut.angle) + off / p.radius;
                const spR = getSurfaceRadius(p, spAng);
                const spX = p.x + Math.cos(spAng) * spR;
                const spY = p.y + Math.sin(spAng) * spR;
                createSparks(spX, spY, 2, astronaut.angle - Math.PI / 2 + (Math.random() - 0.5) * 1.5, 0.45, 40, 150, [56, 189, 248], 0.3);
                createSparks(spX, spY, 1, astronaut.angle - Math.PI / 2, 0.3, 30, 100, [254, 240, 138], 0.2);
            }
            if (Math.random() < 0.25) {
                const off = (Math.random() - 0.5) * baseSpan * 0.5;
                const smAng = (isUpgrade ? nearbyBase.angle : astronaut.angle) + off / p.radius;
                const smR = getSurfaceRadius(p, smAng);
                createSmoke(p.x + Math.cos(smAng) * smR, p.y + Math.sin(smAng) * smR, 2, 2.2, p.archetype.surfaceDustColor, 0, 0, 0.35);
            }

            if (astronaut.actionProgress >= 1.0) {
                astronaut.actionProgress = 0;
                astronaut.actionType = null;
                if (isUpgrade) {
                    upgradeBase(nearbyBase);
                } else {
                    deployNewBase(p, astronaut.angle, targetLevel);
                }
            }
        }
    } else if (astronaut.actionType === 'build_base') {
        astronaut.actionProgress = Math.max(0, astronaut.actionProgress - dt * 2.8);
        if (astronaut.actionProgress === 0) {
            astronaut.actionType = null;
            astronaut.buildTargetBase = null;
        }
    }

    // 4. CONSTRUCCIÓN Y ENSAMBLAJE DE NUEVO COHETE (MANTENER TECLA V O BOTÓN SOSTENIDO)
    const isHoldingBuildRocket = (keys['KeyV'] || astronaut.isHoldingRocketBuildBtn) && astronaut.isGrounded;

    if (isHoldingBuildRocket) {
        astronaut.actionType = 'build_rocket';
        const targetModelKey = astronaut.selectedRocketModel || 'starship';
        const model = (typeof getRocketModel === 'function') ? getRocketModel(targetModelKey) : { buildTime: 3.5, scale: 1.0 };
        const buildTime = model.buildTime || 3.5;
        astronaut.actionProgress += dt / buildTime;

        sfx('playBaseBuild', astronaut.actionProgress);

        // Efectos cuánticos de ensamblaje en el suelo (chispas ciano/doradas y polvo de superficie)
        if (Math.random() < 0.8) {
            const span = (model.scale || 1.0) * 26;
            const off = (Math.random() - 0.5) * span;
            const spAng = astronaut.angle + off / p.radius;
            const spR = getSurfaceRadius(p, spAng);
            const spX = p.x + Math.cos(spAng) * spR;
            const spY = p.y + Math.sin(spAng) * spR;
            createSparks(spX, spY, 3, astronaut.angle - Math.PI / 2 + (Math.random() - 0.5) * 1.4, 0.45, 50, 180, [56, 189, 248], 0.35);
            createSparks(spX, spY, 1, astronaut.angle - Math.PI / 2, 0.3, 30, 100, [244, 162, 97], 0.25);
        }
        if (Math.random() < 0.25) {
            createSmoke(astronaut.x, astronaut.y, 2, 3.2, p.archetype.surfaceDustColor, 0, 0, 0.4);
        }

        if (astronaut.actionProgress >= 1.0) {
            astronaut.actionProgress = 0;
            astronaut.actionType = null;
            deployNewRocket(p, astronaut.angle, targetModelKey);
        }
    } else if (astronaut.actionType === 'build_rocket') {
        astronaut.actionProgress = Math.max(0, astronaut.actionProgress - dt * 2.8);
        if (astronaut.actionProgress === 0) {
            astronaut.actionType = null;
        }
    }

    // Soporte vital y recarga de combustible de jetpack si está en el radio de una base activa
    if (nearbyBase) {
        astronaut.jetpackFuel = Math.min(100, astronaut.jetpackFuel + dt * 42.0);
        astronaut.suitO2 = 100;
    }

    // 5. DESPLIEGUE DE MÁQUINA EXTRACTORA DE RECURSOS (CLIC, TECLA G O MANTENER SOSTENIDO)
    const onFirmSurface = astronaut.isGrounded || astronaut.altitude < 4.5;
    if (astronaut.autoDeployExtractor && !onFirmSurface) {
        astronaut.autoDeployExtractor = false;
        showHoloCard(p, 'ATERRIZA PARA INSTALAR', 'Posa los pies sobre la superficie y vuelve a pulsar [G] o el botón ⛏️ Poner Extractor.');
    }
    const isHoldingExtractor = (keys['KeyG'] || astronaut.isHoldingExtractorBtn || astronaut.autoDeployExtractor) && onFirmSurface;
    if (isHoldingExtractor) {
        astronaut.actionType = 'deploy_extractor';
        astronaut.actionProgress += dt / 0.75;
        sfx('playBaseBuild', astronaut.actionProgress);

        if (Math.random() < 0.7) {
            createSparks(astronaut.x, astronaut.y, 2, astronaut.angle - Math.PI / 2 + (Math.random() - 0.5), 0.5, 40, 130, [56, 189, 248], 0.25);
        }

        if (astronaut.actionProgress >= 1.0) {
            astronaut.actionProgress = 0;
            astronaut.actionType = null;
            astronaut.isHoldingExtractorBtn = false;
            astronaut.autoDeployExtractor = false;
            keys['KeyG'] = false;
            if (typeof deployExtractorAtAstronaut === 'function') {
                deployExtractorAtAstronaut();
            } else {
                showHoloCard(p, 'MÓDULO DE RECURSOS NO CARGADO', 'Recarga la página con Ctrl+F5 o abre index.html para activar js/resources.js.');
            }
        }
    } else if (astronaut.actionType === 'deploy_extractor') {
        astronaut.actionProgress = Math.max(0, astronaut.actionProgress - dt * 3.0);
        if (astronaut.actionProgress === 0) astronaut.actionType = null;
    }

    // 6. TRANSFERENCIA DE COMBUSTIBLE DE RESERVA EVA AL COHETE (CLIC, TECLA U O MANTENER SOSTENIDO)
    const closestTarget = (typeof getClosestShipToAstronaut === 'function') ? getClosestShipToAstronaut() : { shipObj: ship, dist: distToShip };
    const targetShip = closestTarget.shipObj || ship;
    const distTarget = closestTarget.dist;
    const isNearRefuelShip = distTarget < maxInteractDist + 32;
    if (astronaut.autoRefuelShip && !isNearRefuelShip) astronaut.autoRefuelShip = false;
    const isHoldingRefuel = (keys['KeyU'] || astronaut.isHoldingRefuelBtn || astronaut.autoRefuelShip) && isNearRefuelShip;

    if (isHoldingRefuel && (astronaut.fuelReserve || 0) > 0.05 && targetShip.fuel < (targetShip.maxFuel || 100) - 0.05) {
        astronaut.actionType = 'refuel_ship';
        const pumpRate = 42.0; // L/s
        const transferred = (typeof transferFuelReserveToRocket === 'function')
            ? transferFuelReserveToRocket(pumpRate * dt)
            : 0;
        astronaut.actionProgress = clamp(targetShip.fuel / Math.max(1, targetShip.maxFuel || 100), 0, 1);

        if (transferred > 0 && Math.random() < 0.45) {
            sfx('playRefuelTransfer');
            createSparks(targetShip.x, targetShip.y, 2, Math.random() * Math.PI * 2, 0.5, 25, 95, [251, 191, 36], 0.25);
        }
        if (targetShip.fuel >= (targetShip.maxFuel || 100) - 0.05 || (astronaut.fuelReserve || 0) <= 0.05) {
            astronaut.autoRefuelShip = false;
            astronaut.actionType = null;
            astronaut.actionProgress = 0;
            if (targetShip.fuel >= (targetShip.maxFuel || 100) - 0.05) {
                sfx('playChime');
                showHoloCard(p, 'COHETE REPOSTADO AL 100%', 'Tanque principal de Éter completamente cargado desde tu reserva.');
            }
        }
    } else if (astronaut.actionType === 'refuel_ship') {
        astronaut.autoRefuelShip = false;
        astronaut.actionType = null;
        astronaut.actionProgress = 0;
    }
}

/**
 * Despliega y ensambla un nuevo cohete orbital en la superficie del planeta
 */
function deployNewRocket(planet, angle, modelKey) {
    if (!planet) planet = astronaut.planet;
    if (!planet) return;
    const model = (typeof getRocketModel === 'function') ? getRocketModel(modelKey || 'starship') : null;
    if (!model) return;

    // Preservar la nave previa en la lista de naves estacionadas si está en otra posición
    const curShipX = ship.x;
    const curShipY = ship.y;
    const spawnSurfaceR = getSurfaceRadius(planet, angle);
    const spawnApproxX = planet.x + Math.cos(angle) * spawnSurfaceR;
    const spawnApproxY = planet.y + Math.sin(angle) * spawnSurfaceR;
    const distToOld = Math.hypot(curShipX - spawnApproxX, curShipY - spawnApproxY);

    if (distToOld > 35) {
        parkedShips.push({
            id: 'ship_' + Date.now(),
            modelKey: ship.modelKey || 'vesper',
            customRocket: ship.customRocket || null,
            x: ship.x,
            y: ship.y,
            vx: 0, vy: 0,
            angle: ship.angle,
            av: 0,
            hull: ship.hull,
            maxHull: ship.maxHull || 100,
            fuel: ship.fuel,
            maxFuel: ship.maxFuel || 100,
            scale: ship.scale || 1.0,
            isGrounded: true,
            leftGearSpring: { pos: 0.85, vel: 0, target: 0 },
            rightGearSpring: { pos: 0.85, vel: 0, target: 0 }
        });
    }

    // Posicionar el nuevo cohete en la superficie usando el punto de apoyo inferior real
    const sr = getSurfaceRadius(planet, angle);
    let padDist = 15 * (model.scale || 1.0);
    if (model.contactPoints && model.contactPoints.length > 0) {
        const pads = model.contactPoints.filter(pt => pt.isPad);
        const pts = pads.length > 0 ? pads : model.contactPoints;
        const minX = Math.min(...pts.map(pt => pt.x || 0));
        padDist = Math.max(8, -minX * (model.scale || 1.0));
    }
    ship.x = planet.x + Math.cos(angle) * (sr + padDist + 0.5);
    ship.y = planet.y + Math.sin(angle) * (sr + padDist + 0.5);
    ship.angle = angle; // Orientado perpendicularmente a la superficie hacia el cenit
    ship.vx = 0;
    ship.vy = 0;
    ship.av = 0;
    ship.isGrounded = true;
    ship.thrusting = false;
    ship.braking = false;
    ship.throttle = 0;
    ship.thrustIntensity = 0;
    ship.warping = false;
    ship.hullTemp = 0;
    ship.scorch = { amount: 0, dirX: 1, dirY: 0, temp: 0 };
    ship.reentryIntensity = 0;
    ship.vaporConeIntensity = 0;
    ship.sasHoldAngle = null;
    ship.activeHarvestNode = null;
    ship.activeHarvestPlanet = null;
    ship.leftGearSpring = { pos: 0.85, vel: 0, target: 0 };
    ship.rightGearSpring = { pos: 0.85, vel: 0, target: 0 };
    
    // Aplicar física y reservas del modelo (limpiando o asignando customRocket según corresponda)
    ship.customRocket = (model.id === 'custom' && model.customParts) ? model : null;
    applyRocketModel(ship, model.id);
    // Carga inicial de emergencia (25%): requiere combustible extraído para viajes largos
    ship.fuel = Math.max(15, Math.round((model.fuelCapacity || 100) * 0.25));
    ship.hull = model.maxHull;
    if (typeof updateStageHudButton === 'function') updateStageHudButton();

    // Efectos audiovisuales de finalización
    sfx('playBaseComplete');
    sfx('playHydraulic');
    sfx('playAirlock', true);
    createSparks(ship.x, ship.y, 24, angle - Math.PI / 2, 0.6, 50, 220, [56, 189, 248], 0.5);
    createSmoke(ship.x, ship.y, 8, 8.5 * (model.scale || 1.0), planet.archetype.surfaceDustColor, 0, 0, 0.9, 32);

    showHoloCard(planet, 'COHETE ENSAMBLADO: ' + model.name.toUpperCase(), 
        model.tagline + ' · Carga inicial 25%. Reposta con [U] o extrae Éter con [G].');
}

// --- GESTIÓN DE BASES PLANETARIAS MODULARES ---

/**
 * Encuentra una base cercana al ángulo indicado sobre el planeta
 */
function findNearbyBase(planet, angle, spanMult = 1.0) {
    if (!planet || !planet.bases || planet.bases.length === 0) return null;
    for (let i = 0; i < planet.bases.length; i++) {
        const b = planet.bases[i];
        const dAng = Math.abs(Math.atan2(Math.sin(angle - b.angle), Math.cos(angle - b.angle)));
        if (dAng <= b.angularHalfSpan * spanMult) {
            return b;
        }
    }
    return null;
}

/**
 * Calcula la geometría y adaptación al terreno de una base para que quede recta y nivelada
 */
function calculateBaseGeometry(planet, angle, level) {
    const pRadius = planet.radius;
    const lvlInfo = (typeof BASE_LEVELS !== 'undefined' && BASE_LEVELS[level]) ? BASE_LEVELS[level] : { width: 96 };
    const totalWidth = lvlInfo.width;
    const halfWidth = totalWidth / 2;
    const angularHalfSpan = halfWidth / pRadius;

    // Muestreo denso del relieve natural para posicionar la plataforma sobre cualquier elevación
    const sampleCount = Math.max(37, Math.round(totalWidth / 3));
    let maxGroundR = 0;
    for (let i = 0; i < sampleCount; i++) {
        const u = i / (sampleCount - 1);
        const sAng = angle - angularHalfSpan + u * (angularHalfSpan * 2);
        const natR = (typeof getNaturalSurfaceRadius === 'function') 
            ? getNaturalSurfaceRadius(planet, sAng) 
            : getSurfaceRadius(planet, sAng);
        const projR = natR * Math.cos(sAng - angle);
        if (projR > maxGroundR) maxGroundR = projR;
    }

    // Elevación sobre la cota más alta para que la cubierta de hierro flote con holgura estructural
    const clearance = 4.2;
    const deckR = maxGroundR + clearance;

    // Patas niveladoras telescópicas adaptadas a la topografía local
    const legCounts = [6, 10, 16];
    const legCount = legCounts[level - 1] || 6;
    const legs = [];
    for (let i = 0; i < legCount; i++) {
        const legU = (i + 0.5) / legCount;
        const legX = -halfWidth * 0.92 + legU * (halfWidth * 1.84);
        const legAng = angle + legX / pRadius;
        const natR = (typeof getNaturalSurfaceRadius === 'function') 
            ? getNaturalSurfaceRadius(planet, legAng) 
            : getSurfaceRadius(planet, legAng);
        const deckHeightAtLeg = deckR / Math.cos(legX / pRadius);
        const legLength = Math.max(2.0, deckHeightAtLeg - natR);
        legs.push({
            x: legX,
            angle: legAng,
            length: legLength,
            groundR: natR
        });
    }

    return {
        width: totalWidth,
        halfWidth: halfWidth,
        angularHalfSpan: angularHalfSpan,
        deckR: deckR,
        legs: legs
    };
}

/**
 * Despliega una nueva base planetaria nivelada sobre el terreno
 */
function deployNewBase(planet, angle, level = 1) {
    const geo = calculateBaseGeometry(planet, angle, level);
    const lvlInfo = (typeof BASE_LEVELS !== 'undefined' && BASE_LEVELS[level]) ? BASE_LEVELS[level] : { name: 'Base Colonial' };

    const base = {
        id: 'BASE-' + ((planet.bases ? planet.bases.length : 0) + 1) + '-' + Math.floor(Math.random() * 899 + 100),
        planetKey: planet.key,
        planetName: planet.name,
        angle: angle,
        level: level,
        width: geo.width,
        halfWidth: geo.halfWidth,
        angularHalfSpan: geo.angularHalfSpan,
        deckR: geo.deckR,
        legs: geo.legs,
        createdTime: Date.now(),
        radarAngle: 0,
        lightPhase: Math.random() * Math.PI * 2,
        accentColor: planet.archetype.accentColor || [56, 189, 248]
    };

    if (!planet.bases) planet.bases = [];
    planet.bases.push(base);

    if (typeof planetaryBases !== 'undefined') {
        if (!planetaryBases.some(b => b.id === base.id)) {
            planetaryBases.push(base);
        }
    }

    // Coordenadas cartesianas del centro de la base
    const bX = planet.x + Math.cos(angle) * geo.deckR;
    const bY = planet.y + Math.sin(angle) * geo.deckR;

    sfx('playBaseComplete');
    createShockwave(bX, bY, 80, 280, 'rgba(56, 189, 248, 0.95)', 'ring');
    createSparks(bX, bY, 28, angle - Math.PI / 2, Math.PI, 60, 220, [254, 240, 138], 0.7);
    createSmoke(bX, bY, 8, 4.5, planet.archetype.surfaceDustColor, 0, 0, 0.6, 35);

    showHoloCard(planet, `BASE ASTRAL DESPLEGADA — [NV. ${level}: ${lvlInfo.name.toUpperCase()}]`, 
        `${lvlInfo.desc} · Plataforma nivelada operativa para aterrizaje y suministro.`);

    return base;
}

/**
 * Mejora una base planetaria existente al siguiente nivel estructural
 */
function upgradeBase(base) {
    const planet = (typeof getPlanetByKey === 'function') ? getPlanetByKey(base.planetKey) : astronaut.planet;
    if (!planet) return;

    base.level = Math.min(3, base.level + 1);
    const geo = calculateBaseGeometry(planet, base.angle, base.level);
    base.width = geo.width;
    base.halfWidth = geo.halfWidth;
    base.angularHalfSpan = geo.angularHalfSpan;
    base.deckR = geo.deckR;
    base.legs = geo.legs;

    const lvlInfo = (typeof BASE_LEVELS !== 'undefined' && BASE_LEVELS[base.level]) ? BASE_LEVELS[base.level] : { name: 'Base Mejorada' };
    const bX = planet.x + Math.cos(base.angle) * geo.deckR;
    const bY = planet.y + Math.sin(base.angle) * geo.deckR;

    sfx('playBaseComplete');
    createShockwave(bX, bY, 110, 340, 'rgba(251, 191, 36, 0.95)', 'ring');
    createSparks(bX, bY, 35, base.angle - Math.PI / 2, Math.PI, 80, 260, [56, 189, 248], 0.85);
    createSmoke(bX, bY, 12, 5.5, planet.archetype.surfaceDustColor, 0, 0, 0.7, 45);

    showHoloCard(planet, `BASE MEJORADA — [NV. ${base.level}: ${lvlInfo.name.toUpperCase()}]`,
        `Ampliación estructural completada: ${lvlInfo.desc}`);
}

/**
 * Plantar una baliza de exploración y bandera cuántica sobre el terreno
 */
function plantExplorationBeacon() {
    if (!astronaut.active || !astronaut.planet) return false;

    // Verificar si ya existe una baliza muy cerca
    for (const b of astronaut.plantedBeacons) {
        if (b.planetKey === astronaut.planet.key) {
            const diff = Math.abs(Math.atan2(Math.sin(b.angle - astronaut.angle), Math.cos(b.angle - astronaut.angle)));
            if (diff < 0.04) {
                showHoloCard(astronaut.planet, 'BALIZA YA PRESENTE', 'Ya existe un marcador cuántico anclado en este radio geográfico.');
                return false;
            }
        }
    }

    const bX = astronaut.x;
    const bY = astronaut.y;
    const p = astronaut.planet;

    astronaut.plantedBeacons.push({
        id: 'BCN-' + (astronaut.plantedBeacons.length + 1),
        planetKey: p.key,
        planetName: p.name,
        angle: astronaut.angle,
        x: bX,
        y: bY,
        accentColor: p.archetype.accentColor || [245, 158, 11],
        createdTime: Date.now()
    });

    sfx('playBeaconPlant');
    createShockwave(bX, bY, 30, 140, 'rgba(251, 191, 36, 0.9)', 'ring');
    createSparks(bX, bY, 12, astronaut.angle + Math.PI, 0.8, 40, 140, [254, 240, 138], 0.5);
    createSmoke(bX, bY, 4, 3, p.archetype.surfaceDustColor, 0, 0, 0.4);

    showHoloCard(p, 'BALIZA CUÁNTICA ANCLADA', `Marcador [BCN-${astronaut.plantedBeacons.length}] activado. Enlace orbital verificado.`);
    return true;
}

/**
 * Activar escáner geológico de superficie
 */
function triggerAstronautScan() {
    if (!astronaut.active || !astronaut.planet) return;
    
    astronaut.scanAnimTimer = 1.0;
    sfx('playScanner');

    const p = astronaut.planet;
    let nodeHarvestedCount = 0;

    // Asimilar núcleos cercanos a pie si están en rango
    for (const node of p.nodes) {
        if (node.harvested) continue;
        const diffAng = Math.abs(Math.atan2(Math.sin(node.angle - astronaut.angle), Math.cos(node.angle - astronaut.angle)));
        if (diffAng < 0.08) {
            node.harvested = true;
            ship.artifacts += 1;
            astronaut.jetpackFuel = 100;
            ship.fuel = Math.min(ship.maxFuel || 100, ship.fuel + 25);
            if (typeof getFuelReserveCapacity === 'function') {
                astronaut.fuelReserve = Math.min(getFuelReserveCapacity(), (astronaut.fuelReserve || 0) + 15);
            }
            nodeHarvestedCount++;
            sfx('playChime');
            createShockwave(astronaut.x, astronaut.y, 80, 240, 'rgba(251, 191, 36, 0.95)', 'ring');
            createSparks(astronaut.x, astronaut.y, 20, 0, Math.PI * 2, 70, 220, [254, 240, 138], 0.65);
        }
    }

    if (nodeHarvestedCount > 0) {
        showHoloCard(p, 'NÚCLEO DE ÉTER ASIMILADO A PIE', '+25 L a la sonda y +15 L a tu reserva portátil EVA.');
        return;
    }

    // Comprobar si hay una criatura extraterrestre cercana para escaneo biológico
    if (p.creatures && p.creatures.length > 0) {
        let closestCreature = null;
        let minCreatureDist = Infinity;
        for (const c of p.creatures) {
            const d = Math.hypot(c.x - astronaut.x, c.y - astronaut.y);
            if (d < minCreatureDist) {
                minCreatureDist = d;
                closestCreature = c;
            }
        }
        if (closestCreature && minCreatureDist < 85) {
            const temp = closestCreature.temperament;
            const healthPct = Math.round((closestCreature.hp / closestCreature.maxHp) * 100);
            const spDesc = (closestCreature.spec && closestCreature.spec.desc) ? closestCreature.spec.desc : temp.desc;
            showHoloCard(
                p,
                `ESPECIE AUTÓCTONA: ${closestCreature.species.toUpperCase()}`,
                `[${temp.badge}] ${spDesc} · Locomoción: ${(closestCreature.locomotion || 'terrestre').toUpperCase()} · Vitalidad: ${healthPct}%`
            );
            sfx('playChime');
            return;
        }
    }

    // Comprobar si hay una estructura arquitectónica/científica cercana para analizar
    if (p.structures && p.structures.length > 0) {
        for (const st of p.structures) {
            const diffSt = Math.abs(Math.atan2(Math.sin(st.angle - astronaut.angle), Math.cos(st.angle - astronaut.angle)));
            if (diffSt < 0.055) {
                st.scanned = true;
                astronaut.jetpackFuel = 100;
                ship.fuel = Math.min(100, ship.fuel + 35);
                createShockwave(astronaut.x, astronaut.y, 70, 210, 'rgba(56, 189, 248, 0.9)', 'ring');
                showHoloCard(
                    p,
                    `ESTRUCTURA CATALOGADA: ${st.name.toUpperCase()}`,
                    `[${st.category}] ${st.desc} · Reservas de propulsión recargadas.`
                );
                sfx('playChime');
                return;
            }
        }
    }

    const curReg = typeof getPlanetRegionAtAngle === 'function' ? getPlanetRegionAtAngle(p, astronaut.angle) : null;
    const regTitle = curReg ? `${curReg.name.toUpperCase()} [${curReg.def.name.toUpperCase()}]` : p.name.toUpperCase();
    const minStr = (p.minerals && p.minerals.length > 0) ? p.minerals.map(m => m.name).slice(0, 3).join(', ') : 'Silicatos estándar';
    const catFuel = (typeof getPlanetCategoryProfile === 'function') ? getPlanetCategoryProfile(p).fuelProfile.tierLabel : 'Variable';
    const scanText = `Éter planetario: ${catFuel}. Minerales: ${minStr} · Despliega un Extractor [G] para análisis exacto de esta zona.`;
    showHoloCard(p, `SONDEO: ${regTitle}`, scanText);
    sfx('playChime');
}

// --- RENDERIZADO VISUAL DEL ASTRONAUTA, BALIZAS Y EFECTOS ---

/**
 * Dibuja todas las balizas y banderas plantadas en la superficie
 */
function drawBeacons(timeSec) {
    if (!astronaut.plantedBeacons.length) return;

    for (const b of astronaut.plantedBeacons) {
        // Encontrar el planeta asociado mediante su clave completa
        const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(b.planetKey) : null;
        if (!p) continue;

        // Comprobar cercanía a cámara
        const dCam = Math.hypot(b.x - camera.x, b.y - camera.y);
        if (dCam > 3200) continue;

        const surfaceR = getSurfaceRadius(p, b.angle);
        const bx = p.x + Math.cos(b.angle) * surfaceR;
        const by = p.y + Math.sin(b.angle) * surfaceR;

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(b.angle + Math.PI / 2); // Alinear tangente al suelo (+X adelante, -Y al cielo)

        // 1. Haz cuántico de luz vertical hacia el espacio
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const beamH = 280;
        const beamGrad = ctx.createLinearGradient(0, 0, 0, -beamH);
        beamGrad.addColorStop(0, `rgba(${b.accentColor[0]}, ${b.accentColor[1]}, ${b.accentColor[2]}, 0.45)`);
        beamGrad.addColorStop(0.3, `rgba(${b.accentColor[0]}, ${b.accentColor[1]}, ${b.accentColor[2]}, 0.18)`);
        beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(-2.5, -beamH, 5, beamH);
        ctx.restore();

        // 2. Trípode de fijación de titanio
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(0, -6);
        ctx.lineTo(6, 0);
        ctx.stroke();

        // 3. Mástil de carbono y emisor
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -24);
        ctx.stroke();

        // 4. Baliza luminiscente estroboscópica superior
        const bFlash = 0.65 + 0.35 * Math.sin(timeSec * 6 + b.createdTime);
        ctx.fillStyle = `rgba(${b.accentColor[0]}, ${b.accentColor[1]}, ${b.accentColor[2]}, ${bFlash})`;
        ctx.beginPath();
        ctx.arc(0, -24, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 5. Bandera holográfica astral proyectada
        const flagWave = Math.sin(timeSec * 4.5) * 1.5;
        const flagGrad = ctx.createLinearGradient(0, -23, 16, -15);
        flagGrad.addColorStop(0, `rgba(${b.accentColor[0]}, ${b.accentColor[1]}, ${b.accentColor[2]}, 0.85)`);
        flagGrad.addColorStop(1, 'rgba(255, 255, 255, 0.45)');
        
        ctx.fillStyle = flagGrad;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -23);
        ctx.lineTo(15, -23 + flagWave);
        ctx.lineTo(13, -15 + flagWave * 0.8);
        ctx.lineTo(0, -15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glifo dentro de la bandera
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(6.5, -19 + flagWave * 0.5, 1.4, 0, Math.PI * 2);
        ctx.fill();

        // 6. Rótulo de identificación en pantalla
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '7px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(b.id, 0, -29);

        ctx.restore();
    }
}

/**
 * Dibuja todas las bases planetarias construidas en mundos visibles
 */
function drawBases(timeSec) {
    const nearby = (typeof getNearbyPlanets === 'function') ? getNearbyPlanets(camera.x, camera.y, 1) : [];
    if (!nearby.length) return;

    for (let pi = 0; pi < nearby.length; pi++) {
        const p = nearby[pi];
        if (!p.bases || p.bases.length === 0) continue;

        for (let bi = 0; bi < p.bases.length; bi++) {
            const b = p.bases[bi];
            // Centro de la plataforma en coordenadas de mundo
            const bx = p.x + Math.cos(b.angle) * b.deckR;
            const by = p.y + Math.sin(b.angle) * b.deckR;
            const dCam = Math.hypot(bx - camera.x, by - camera.y);
            if (dCam > 4200) continue;

            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(b.angle + Math.PI / 2); // Eje +X hacia la derecha tangente al terreno, -Y hacia el cenit

            // ==============================================================
            // 1. FARO CENITAL DE NAVEGACIÓN ORBITAL (SOLO NIVEL 3)
            // ==============================================================
            if (b.level === 3) {
                const towerBeaconX = -b.halfWidth + 28;
                const towerTopY = -48;
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const beamH = 520;
                const beamW = 16;
                const beamGrad = ctx.createLinearGradient(towerBeaconX, towerTopY, towerBeaconX, towerTopY - beamH);
                beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
                beamGrad.addColorStop(0.25, 'rgba(56, 189, 248, 0.22)');
                beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = beamGrad;
                ctx.fillRect(towerBeaconX - beamW / 2, towerTopY - beamH, beamW, beamH);

                // Haz estrecho central súper brillante
                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.fillRect(towerBeaconX - 1.5, towerTopY - beamH, 3, beamH);
                ctx.restore();
            }

            // ==============================================================
            // 2. PATAS TELESCÓPICAS Y CERCHAS EN X DE HIERRO ESTRUCTURAL
            // ==============================================================
            if (b.legs && b.legs.length > 0) {
                // Cerchas en cruz (Cross-bracing) entre patas adyacentes
                for (let li = 1; li < b.legs.length; li++) {
                    const legA = b.legs[li - 1];
                    const legB = b.legs[li];
                    const minL = Math.min(legA.length, legB.length);
                    const braceDepth = Math.min(minL * 0.75, 14);

                    ctx.strokeStyle = 'rgba(51, 65, 85, 0.75)';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(legA.x, 5.0);
                    ctx.lineTo(legB.x, 5.0 + braceDepth);
                    ctx.moveTo(legB.x, 5.0);
                    ctx.lineTo(legA.x, 5.0 + braceDepth);
                    ctx.stroke();

                    // Perno central de unión de cerchas
                    ctx.fillStyle = '#64748b';
                    ctx.fillRect((legA.x + legB.x) / 2 - 1.0, 5.0 + braceDepth / 2 - 1.0, 2.0, 2.0);
                }

                // Dibujo de cada pata hidráulica individual
                for (let li = 0; li < b.legs.length; li++) {
                    const leg = b.legs[li];
                    const lx = leg.x;
                    const L = Math.max(2.0, leg.length);

                    // Cilindro exterior de fundición de hierro pesado
                    const sleeveH = Math.min(L * 0.58, L - 1.5);
                    const sleeveW = 5.6;
                    const sleeveGrad = ctx.createLinearGradient(lx - sleeveW / 2, 0, lx + sleeveW / 2, 0);
                    sleeveGrad.addColorStop(0, '#1e293b');
                    sleeveGrad.addColorStop(0.35, '#334155');
                    sleeveGrad.addColorStop(0.7, '#475569');
                    sleeveGrad.addColorStop(1, '#0f172a');

                    ctx.fillStyle = sleeveGrad;
                    ctx.strokeStyle = '#090d16';
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    safeRoundRect(ctx, lx - sleeveW / 2, 4.8, sleeveW, sleeveH, 0.8);
                    ctx.fill();
                    ctx.stroke();

                    // Brida de sellado hidráulico con pernos
                    ctx.fillStyle = '#64748b';
                    ctx.fillRect(lx - sleeveW / 2 - 0.6, 4.8 + sleeveH - 1.4, sleeveW + 1.2, 1.6);
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillRect(lx - sleeveW / 2, 4.8 + sleeveH - 1.2, 1.0, 1.2);
                    ctx.fillRect(lx + sleeveW / 2 - 1.0, 4.8 + sleeveH - 1.2, 1.0, 1.2);

                    // Vástago interior cromado telescópico
                    const pistonW = 3.2;
                    const pistonH = L - sleeveH + 1.0;
                    const pistonGrad = ctx.createLinearGradient(lx - pistonW / 2, 0, lx + pistonW / 2, 0);
                    pistonGrad.addColorStop(0, '#94a3b8');
                    pistonGrad.addColorStop(0.4, '#ffffff');
                    pistonGrad.addColorStop(1, '#64748b');

                    ctx.fillStyle = pistonGrad;
                    ctx.fillRect(lx - pistonW / 2, 4.8 + sleeveH, pistonW, pistonH);

                    // Zapata de hierro pesada articulada al suelo
                    const footY = 5.2 + L;
                    const footW = 9.0;
                    ctx.fillStyle = '#1e293b';
                    ctx.strokeStyle = '#475569';
                    ctx.lineWidth = 1.0;
                    ctx.beginPath();
                    ctx.moveTo(lx - footW / 2, footY + 2.0);
                    ctx.lineTo(lx - footW / 2 + 1.5, footY - 1.8);
                    ctx.lineTo(lx + footW / 2 - 1.5, footY - 1.8);
                    ctx.lineTo(lx + footW / 2, footY + 2.0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Pernos de fijación a la roca
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillRect(lx - footW / 2 + 1.2, footY + 1.6, 1.4, 2.2);
                    ctx.fillRect(lx + footW / 2 - 2.6, footY + 1.6, 1.4, 2.2);
                }
            }

            // ==============================================================
            // 3. VIGA MAESTRA DE HIERRO Y CUBIERTA PESADA (THE HEAVY IRON DECK)
            // ==============================================================
            const deckH = 5.2;

            // Cuerpo principal de la viga I de hierro
            const girderGrad = ctx.createLinearGradient(0, 0, 0, deckH);
            girderGrad.addColorStop(0, '#334155');
            girderGrad.addColorStop(0.2, '#1e293b');
            girderGrad.addColorStop(0.7, '#151d2a');
            girderGrad.addColorStop(1, '#090d16');

            ctx.fillStyle = girderGrad;
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            safeRoundRect(ctx, -b.halfWidth, 0, b.width, deckH, 1.2);
            ctx.fill();
            ctx.stroke();

            // Ala inferior de la viga de acero
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 0.8;
            ctx.fillRect(-b.halfWidth + 1.0, deckH - 1.2, b.width - 2.0, 1.4);
            ctx.strokeRect(-b.halfWidth + 1.0, deckH - 1.2, b.width - 2.0, 1.4);

            // Bisel superior brillante de acero pulido reflectante
            ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(-b.halfWidth, 0.5);
            ctx.lineTo(b.halfWidth, 0.5);
            ctx.stroke();

            // Planchas de blindaje de hierro con juntas y remaches
            const plateStep = 14;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.lineWidth = 0.8;
            ctx.fillStyle = '#64748b';
            for (let px = -b.halfWidth + plateStep; px < b.halfWidth - 4; px += plateStep) {
                ctx.beginPath();
                ctx.moveTo(px, 0.5);
                ctx.lineTo(px, deckH - 1.0);
                ctx.stroke();

                // Cabezas de remache de hierro
                ctx.fillRect(px - 1.6, 1.4, 0.9, 0.9);
                ctx.fillRect(px + 0.7, 1.4, 0.9, 0.9);
                ctx.fillRect(px - 1.6, deckH - 2.4, 0.9, 0.9);
                ctx.fillRect(px + 0.7, deckH - 2.4, 0.9, 0.9);
            }

            // Rampas laterales de hierro para acceso
            const rampLen = 8.0;
            // Rampa izquierda
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(-b.halfWidth, 0.5);
            ctx.lineTo(-b.halfWidth - rampLen, deckH);
            ctx.lineTo(-b.halfWidth, deckH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Rampa derecha
            ctx.beginPath();
            ctx.moveTo(b.halfWidth, 0.5);
            ctx.lineTo(b.halfWidth + rampLen, deckH);
            ctx.lineTo(b.halfWidth, deckH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Franjas diagonales de advertencia en los extremos (Hazard Stripes)
            const drawHazard = (startX, w) => {
                ctx.save();
                ctx.beginPath();
                ctx.rect(startX, 0.5, w, deckH - 0.8);
                ctx.clip();
                const stripeW = 2.0;
                for (let sx = startX - 8; sx < startX + w + 8; sx += stripeW * 2) {
                    ctx.fillStyle = '#eab308';
                    ctx.beginPath();
                    ctx.moveTo(sx, deckH);
                    ctx.lineTo(sx + 4.0, 0.5);
                    ctx.lineTo(sx + 4.0 + stripeW, 0.5);
                    ctx.lineTo(sx + stripeW, deckH);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            };
            drawHazard(-b.halfWidth, 9.0);
            drawHazard(b.halfWidth - 9.0, 9.0);

            // ==============================================================
            // 4. ZONA DE ATERRIZAJE DE COHETES (ROCKET TOUCHDOWN ZONE)
            // ==============================================================
            // Configuración del área de apontaje según nivel
            let padCenterX = 0;
            let padRadius = 24;
            let grateW = 54;
            let padCode = 'IRON PAD · LZ-01';

            if (b.level === 2) {
                // En Nivel 2, la cabina está en la izquierda; la pista de aterrizaje va de -10 a +b.halfWidth
                padCenterX = 26;
                padRadius = 34;
                grateW = 96;
                padCode = 'FLIGHT DECK · 02-BETA';
            } else if (b.level === 3) {
                // En Nivel 3, la torre está en la izquierda; la inmensa pista continua va de 0 a +b.halfWidth
                padCenterX = 40;
                padRadius = 46;
                grateW = 160;
                padCode = 'STARPORT LZ · 03-GAMMA';
            }

            // A. Rejilla disipadora de escape térmico (Flame trench / Blast grating)
            const grateX = padCenterX - grateW / 2;
            ctx.fillStyle = '#090d16';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 0.8;
            ctx.fillRect(grateX, 0.5, grateW, 3.2);
            ctx.strokeRect(grateX, 0.5, grateW, 3.2);

            // Ranuras de ventilación térmica de la rejilla
            ctx.strokeStyle = 'rgba(71, 85, 105, 0.65)';
            ctx.lineWidth = 0.7;
            for (let rx = grateX + 2.5; rx < grateX + grateW - 2; rx += 3.0) {
                ctx.beginPath();
                ctx.moveTo(rx, 0.8);
                ctx.lineTo(rx, 3.2);
                ctx.stroke();
            }

            // B. Círculo / Octágono de apontaje aeroespacial en pintura cian reflectante
            ctx.save();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            const octSteps = 12;
            for (let oi = 0; oi <= octSteps; oi++) {
                const oAng = (oi / octSteps) * Math.PI * 2;
                const ox = padCenterX + Math.cos(oAng) * padRadius;
                const oy = Math.sin(oAng) * (padRadius * 0.32) + 0.5;
                if (oi === 0) ctx.moveTo(ox, oy);
                else ctx.lineTo(ox, oy);
            }
            ctx.stroke();

            // Círculo concéntrico interior
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            for (let oi = 0; oi <= octSteps; oi++) {
                const oAng = (oi / octSteps) * Math.PI * 2;
                const ox = padCenterX + Math.cos(oAng) * (padRadius * 0.55);
                const oy = Math.sin(oAng) * (padRadius * 0.55 * 0.32) + 0.5;
                if (oi === 0) ctx.moveTo(ox, oy);
                else ctx.lineTo(ox, oy);
            }
            ctx.stroke();

            // Cruz táctica de aterrizaje en amarillo brillante
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            // Brazo horizontal
            ctx.moveTo(padCenterX - padRadius * 0.72, 0.5);
            ctx.lineTo(padCenterX + padRadius * 0.72, 0.5);
            // Marcas guía de extremos
            ctx.moveTo(padCenterX - padRadius * 0.72, -1.8);
            ctx.lineTo(padCenterX - padRadius * 0.72, 2.8);
            ctx.moveTo(padCenterX + padRadius * 0.72, -1.8);
            ctx.lineTo(padCenterX + padRadius * 0.72, 2.8);
            ctx.stroke();
            ctx.restore();

            // C. Rótulo de pista serigrafiado en la cubierta de hierro
            ctx.fillStyle = 'rgba(241, 245, 249, 0.9)';
            ctx.font = 'bold 7px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(padCode, padCenterX, -2.5);

            // D. Luces LED secuenciales de aproximación de pista (Nivel 2 y 3)
            if (b.level >= 2) {
                const chase = (timeSec * 3.5) % 1;
                const runSpan = grateW * 0.44;
                for (let li = -runSpan; li <= runSpan; li += 6.0) {
                    const normU = (li + runSpan) / (runSpan * 2);
                    const isLit = Math.abs(normU - chase) < 0.16;
                    ctx.fillStyle = isLit ? '#f59e0b' : 'rgba(245, 158, 11, 0.22)';
                    ctx.fillRect(padCenterX + li - 1.2, -0.6, 2.4, 1.2);
                }
            }

            // E. Balizas estroboscópicas perimetrales en las esquinas de la plataforma
            const strobeLit = Math.sin(timeSec * 5 + b.lightPhase) > 0.1;
            ctx.fillStyle = strobeLit ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)';
            ctx.beginPath();
            ctx.arc(-b.halfWidth + 2.0, -1.4, 1.5, 0, Math.PI * 2);
            ctx.arc(b.halfWidth - 2.0, -1.4, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Deflector de chorro de escape (Blast deflector) en el extremo derecho para NV.2 y NV.3
            if (b.level >= 2) {
                const defX = b.halfWidth - 14;
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 1.0;
                ctx.beginPath();
                ctx.moveTo(defX - 5.0, 0);
                ctx.lineTo(defX + 5.0, -7.5);
                ctx.lineTo(defX + 7.5, -7.5);
                ctx.lineTo(defX - 1.5, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Rejillas de absorción térmica en el deflector
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 0.8;
                for (let di = 1; di <= 3; di++) {
                    const u = di / 4;
                    ctx.beginPath();
                    ctx.moveTo(defX - 5.0 + u * 10.0, -u * 7.5);
                    ctx.lineTo(defX - 3.0 + u * 10.0, -u * 7.5);
                    ctx.stroke();
                }
            }

            // ==============================================================
            // 5. CABINA DE CONTROL DE OPERACIONES (EXCLUSIVO NIVEL 2)
            // ==============================================================
            if (b.level === 2) {
                // Ubicada en el lateral izquierdo, dejando la amplia pista de aterrizaje libre a la derecha
                const cabX = -b.halfWidth + 24;
                const cabW = 24;
                const cabH = 13.5;

                // Estructura blindada de hierro de la casamata de control
                const cabGrad = ctx.createLinearGradient(cabX - cabW / 2, -cabH, cabX + cabW / 2, 0);
                cabGrad.addColorStop(0, '#334155');
                cabGrad.addColorStop(0.5, '#1e293b');
                cabGrad.addColorStop(1, '#0f172a');

                ctx.fillStyle = cabGrad;
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 1.0;
                ctx.beginPath();
                // Pared izquierda achaflanada
                ctx.moveTo(cabX - cabW / 2 + 3.0, -cabH);
                ctx.lineTo(cabX + cabW / 2 - 2.0, -cabH);
                ctx.lineTo(cabX + cabW / 2, 0);
                ctx.lineTo(cabX - cabW / 2, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Gran visor panorámico inclinado de vidrio polarizado
                const winGrad = ctx.createLinearGradient(cabX - 7, -cabH + 2.5, cabX + 7, -cabH + 8.5);
                winGrad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
                winGrad.addColorStop(0.5, 'rgba(14, 116, 144, 0.85)');
                winGrad.addColorStop(1, 'rgba(8, 51, 68, 0.95)');

                ctx.fillStyle = winGrad;
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(cabX - 7.5, -cabH + 2.5);
                ctx.lineTo(cabX + 7.5, -cabH + 2.5);
                ctx.lineTo(cabX + 8.5, -cabH + 8.0);
                ctx.lineTo(cabX - 8.5, -cabH + 8.0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Montante central de refuerzo del vidrio
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 0.9;
                ctx.beginPath();
                ctx.moveTo(cabX, -cabH + 2.5);
                ctx.lineTo(cabX, -cabH + 8.0);
                ctx.stroke();

                // Techo reforzado con barandilla de acero
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(cabX - cabW / 2 + 3.0, -cabH - 2.5);
                ctx.lineTo(cabX + cabW / 2 - 2.0, -cabH - 2.5);
                ctx.moveTo(cabX - cabW / 2 + 3.0, -cabH);
                ctx.lineTo(cabX - cabW / 2 + 3.0, -cabH - 2.5);
                ctx.moveTo(cabX + cabW / 2 - 2.0, -cabH);
                ctx.lineTo(cabX + cabW / 2 - 2.0, -cabH - 2.5);
                ctx.stroke();

                // Antena de telemetría de comunicaciones en el techo
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1.0;
                ctx.beginPath();
                ctx.moveTo(cabX - 4.0, -cabH);
                ctx.lineTo(cabX - 4.0, -cabH - 8.0);
                ctx.stroke();

                // Luz verde de estado de pista (CLEAR TO LAND)
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.arc(cabX + 5.0, -cabH - 3.5, 1.2, 0, Math.PI * 2);
                ctx.fill();

                // Escalera de hierro adosada al lateral
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 0.8;
                const ladderX = cabX - cabW / 2 + 1.2;
                ctx.beginPath();
                ctx.moveTo(ladderX, 0);
                ctx.lineTo(ladderX, -cabH);
                for (let ry = -2.5; ry > -cabH; ry -= 2.6) {
                    ctx.moveTo(ladderX - 1.5, ry);
                    ctx.lineTo(ladderX + 1.5, ry);
                }
                ctx.stroke();
            }

            // ==============================================================
            // 6. TORRE DE CONTROL AEROESPACIAL MASIVA (EXCLUSIVO NIVEL 3)
            // ==============================================================
            if (b.level === 3) {
                // Ubicada en el lateral izquierdo, sin invadir la inmensa pista continua
                const towerX = -b.halfWidth + 28;
                const towerH = 40;
                const baseW = 16;
                const topW = 11;

                // A. Fuste de celosía de vigas de hierro estructural (Truss steel tower)
                const fusteTopY = -26;
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 1.2;

                // Columnas maestras inclinadas de la torre
                ctx.beginPath();
                ctx.moveTo(towerX - baseW / 2, 0);
                ctx.lineTo(towerX - topW / 2, fusteTopY);
                ctx.lineTo(towerX + topW / 2, fusteTopY);
                ctx.lineTo(towerX + baseW / 2, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Celosías en X de hierro en el cuerpo de la torre
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 1.0;
                const stages = 4;
                for (let si = 0; si < stages; si++) {
                    const y1 = (si / stages) * fusteTopY;
                    const y2 = ((si + 1) / stages) * fusteTopY;
                    const u1 = si / stages;
                    const u2 = (si + 1) / stages;
                    const x1L = (towerX - baseW / 2) + u1 * ((baseW - topW) / 2);
                    const x1R = (towerX + baseW / 2) - u1 * ((baseW - topW) / 2);
                    const x2L = (towerX - baseW / 2) + u2 * ((baseW - topW) / 2);
                    const x2R = (towerX + baseW / 2) - u2 * ((baseW - topW) / 2);

                    ctx.beginPath();
                    ctx.moveTo(x1L, y1);
                    ctx.lineTo(x2R, y2);
                    ctx.moveTo(x1R, y1);
                    ctx.lineTo(x2L, y2);
                    ctx.moveTo(x2L, y2);
                    ctx.lineTo(x2R, y2);
                    ctx.stroke();
                }

                // B. Pasarela intermedia de mantenimiento con barandilla
                ctx.fillStyle = '#0f172a';
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 0.9;
                ctx.fillRect(towerX - topW / 2 - 2.5, fusteTopY - 1.2, topW + 5.0, 1.8);
                ctx.strokeRect(towerX - topW / 2 - 2.5, fusteTopY - 1.2, topW + 5.0, 1.8);

                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.moveTo(towerX - topW / 2 - 2.5, fusteTopY - 3.5);
                ctx.lineTo(towerX + topW / 2 + 2.5, fusteTopY - 3.5);
                ctx.moveTo(towerX - topW / 2 - 2.5, fusteTopY - 1.2);
                ctx.lineTo(towerX - topW / 2 - 2.5, fusteTopY - 3.5);
                ctx.moveTo(towerX + topW / 2 + 2.5, fusteTopY - 1.2);
                ctx.lineTo(towerX + topW / 2 + 2.5, fusteTopY - 3.5);
                ctx.stroke();

                // C. Puesto de Mando y Control de Vuelo 360° (Flight Ops Deck)
                const bridgeH = 11.0;
                const bridgeY = fusteTopY - bridgeH;
                const bridgeW = 18.0;

                // Base achaflanada de la cabina
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 1.0;
                ctx.beginPath();
                ctx.moveTo(towerX - bridgeW / 2 + 2.0, bridgeY);
                ctx.lineTo(towerX + bridgeW / 2 - 2.0, bridgeY);
                ctx.lineTo(towerX + topW / 2, fusteTopY);
                ctx.lineTo(towerX - topW / 2, fusteTopY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Ventanales poligonales 360° en cian luminoso
                const bridgeWinGrad = ctx.createLinearGradient(towerX - bridgeW / 2, bridgeY, towerX + bridgeW / 2, bridgeY + 6.0);
                bridgeWinGrad.addColorStop(0, '#38bdf8');
                bridgeWinGrad.addColorStop(0.5, '#0ea5e9');
                bridgeWinGrad.addColorStop(1, '#0369a1');

                ctx.fillStyle = bridgeWinGrad;
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(towerX - bridgeW / 2 + 1.5, bridgeY + 1.0);
                ctx.lineTo(towerX + bridgeW / 2 - 1.5, bridgeY + 1.0);
                ctx.lineTo(towerX + bridgeW / 2, bridgeY + 6.0);
                ctx.lineTo(towerX - bridgeW / 2, bridgeY + 6.0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Montantes de acero de los ventanales
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 0.9;
                ctx.beginPath();
                ctx.moveTo(towerX - 4.5, bridgeY + 1.0);
                ctx.lineTo(towerX - 4.5, bridgeY + 6.0);
                ctx.moveTo(towerX + 4.5, bridgeY + 1.0);
                ctx.lineTo(towerX + 4.5, bridgeY + 6.0);
                ctx.stroke();

                // Techo blindado superior
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(towerX - bridgeW / 2 + 1.0, bridgeY - 1.4, bridgeW - 2.0, 1.8);

                // D. Mástil de comunicaciones, antena de radar y baliza aeronáutica
                const mastTopY = bridgeY - 10.0;
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(towerX, bridgeY - 1.4);
                ctx.lineTo(towerX, mastTopY);
                ctx.stroke();

                // Antena de radar giratoria continua
                const radarRot = timeSec * 3.5;
                ctx.save();
                ctx.translate(towerX, mastTopY + 3.0);
                ctx.rotate(radarRot);
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(-4.5, -1.0, 9.0, 2.0);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(2.8, -1.0, 1.6, 2.0);
                ctx.restore();

                // Baliza estroboscópica roja aeronáutica en la cima del mástil
                const redPulse = Math.sin(timeSec * 5) > 0;
                ctx.fillStyle = redPulse ? '#ef4444' : '#7f1d1d';
                ctx.beginPath();
                ctx.arc(towerX, mastTopY, 1.4, 0, Math.PI * 2);
                ctx.fill();

                // Proyector halógeno (floodlight) iluminando la pista hacia la derecha
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const floodGrad = ctx.createRadialGradient(towerX + 6, fusteTopY, 2, towerX + 50, fusteTopY + 15, 65);
                floodGrad.addColorStop(0, 'rgba(254, 240, 138, 0.25)');
                floodGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.08)');
                floodGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = floodGrad;
                ctx.beginPath();
                ctx.moveTo(towerX + 6, fusteTopY - 2);
                ctx.lineTo(towerX + 90, 0);
                ctx.lineTo(towerX + 30, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // ==============================================================
            // 7. RÓTULO HOLOGRÁFICO EN PANTALLA
            // ==============================================================
            ctx.save();
            ctx.rotate(camera.rotation);
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 8px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            const lvlBadge = `[NV. ${b.level}] ${b.name || 'PLATAFORMA DE HIERRO'}`;
            ctx.fillText(lvlBadge, 0, -18 - (b.level === 3 ? 18 : 6));
            ctx.restore();

            ctx.restore();
        }
    }
}

/**
 * Previsualización holográfica durante la construcción o mejora sostenida de base
 */
function drawBaseHoloPreview(timeSec) {
    if (!astronaut.active || !astronaut.planet) return;
    if (astronaut.actionType !== 'build_base' || astronaut.actionProgress <= 0) return;

    const p = astronaut.planet;
    const isUpgrade = !!astronaut.buildTargetBase;
    const targetLvl = isUpgrade ? Math.min(3, astronaut.buildTargetBase.level + 1) : (astronaut.selectedBaseLevel || 1);
    const lvlInfo = (typeof BASE_LEVELS !== 'undefined' && BASE_LEVELS[targetLvl]) ? BASE_LEVELS[targetLvl] : { width: 96 };
    const baseW = lvlInfo.width;
    const halfW = baseW / 2;
    const prg = astronaut.actionProgress;

    const previewAngle = isUpgrade ? astronaut.buildTargetBase.angle : astronaut.angle;
    const previewSr = (typeof getNaturalSurfaceRadius === 'function') 
        ? getNaturalSurfaceRadius(p, previewAngle) 
        : getSurfaceRadius(p, previewAngle);
    const previewDeckR = previewSr + 4.2;

    const cx = p.x + Math.cos(previewAngle) * previewDeckR;
    const cy = p.y + Math.sin(previewAngle) * previewDeckR;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(previewAngle + Math.PI / 2);

    // Efecto holográfico aditivo
    ctx.globalCompositeOperation = 'lighter';
    const holoColor = targetLvl === 1 ? '56, 189, 248' : (targetLvl === 2 ? '251, 191, 36' : '52, 211, 153');

    // 1. Silueta alámbrica de la plataforma con animación de escaneo
    const alphaSweep = Math.sin(timeSec * 16) * 0.15 + 0.65;
    ctx.strokeStyle = `rgba(${holoColor}, ${alphaSweep})`;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 3]);

    // Viga de la plataforma
    ctx.strokeRect(-halfW, 0, baseW, 5.2);

    // Patas telescópicas
    const legCount = [6, 10, 16][targetLvl - 1] || 6;
    for (let i = 0; i < legCount; i++) {
        const lx = -halfW * 0.92 + (i / (legCount - 1)) * (halfW * 1.84);
        ctx.beginPath();
        ctx.moveTo(lx, 5.2);
        ctx.lineTo(lx, 12.0);
        ctx.stroke();
    }

    // Círculo de apontaje central
    const padCenterX = targetLvl === 1 ? 0 : (targetLvl === 2 ? 26 : 40);
    const padR = targetLvl === 1 ? 24 : (targetLvl === 2 ? 34 : 46);
    ctx.beginPath();
    ctx.ellipse(padCenterX, 0.5, padR, padR * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Silueta de cabina de control en Nivel 2
    if (targetLvl === 2) {
        const cabX = -halfW + 24;
        ctx.strokeRect(cabX - 12, -13.5, 24, 13.5);
        ctx.beginPath();
        ctx.moveTo(cabX - 4.0, -13.5);
        ctx.lineTo(cabX - 4.0, -21.0);
        ctx.stroke();
    }

    // Silueta de torre de control en Nivel 3
    if (targetLvl === 3) {
        const towerX = -halfW + 28;
        ctx.beginPath();
        ctx.moveTo(towerX - 8, 0);
        ctx.lineTo(towerX - 5.5, -26);
        ctx.lineTo(towerX + 5.5, -26);
        ctx.lineTo(towerX + 8, 0);
        ctx.closePath();
        ctx.stroke();

        ctx.strokeRect(towerX - 9, -37, 18, 11);
        ctx.beginPath();
        ctx.moveTo(towerX, -37);
        ctx.lineTo(towerX, -48);
        ctx.stroke();
    }

    ctx.setLineDash([]);

    // Plano vertical de llenado de energía (Materialización de abajo hacia arriba)
    const scanHeight = prg * 28;
    const scanGrad = ctx.createLinearGradient(0, 5, 0, -scanHeight);
    scanGrad.addColorStop(0, `rgba(${holoColor}, 0.35)`);
    scanGrad.addColorStop(0.8, `rgba(${holoColor}, 0.15)`);
    scanGrad.addColorStop(1, `rgba(${holoColor}, 0.0)`);
    ctx.fillStyle = scanGrad;
    ctx.fillRect(-halfW, 5 - scanHeight, baseW, scanHeight);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(-halfW, 5 - scanHeight, baseW, 1.2);

    ctx.restore();
}

/**
 * Dibuja el personaje del astronauta con altísima fidelidad estética y biomecánica
 */
function drawAstronaut(timeSec) {
    if (!astronaut.active) return;

    // Estado solar local en la posición del astronauta para sombreado adaptativo
    const pNear = astronaut.planet || (typeof ship !== 'undefined' ? ship.nearestPlanet : null);
    const solar = (pNear && pNear.atmoRadius && typeof getPlanetSolarState === 'function')
        ? (pNear.currentSolarState || getPlanetSolarState(pNear, astronaut.x, astronaut.y, timeSec))
        : null;
    const localNight = solar ? clamp(solar.nightFactor, 0, 1) : 0;

    ctx.save();
    ctx.translate(astronaut.x, astronaut.y);
    ctx.rotate(astronaut.onCeiling ? (astronaut.angle - Math.PI / 2) : (astronaut.angle + Math.PI / 2)); // Aligned to local terrain or inverted ceiling tangent

    // 1. Sombra elíptica en el suelo que atenúa con la altura
    const shadowAlpha = clamp(1 - astronaut.altitude / 35, 0, 0.65);
    if (shadowAlpha > 0.02) {
        const shadowScale = clamp(1 - astronaut.altitude / 55, 0.4, 1.0);
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0.5, 6.5 * shadowScale, 2.2 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 2. Trasladar al modelo según altitud sobre el suelo
    ctx.translate(0, -astronaut.altitude);
    ctx.scale(astronaut.facing, 1); // Orientar hacia izquierda o derecha

    // Parámetros de animación procedural orgánica estilo Alto's Adventure
    const isMoving = astronaut.isGrounded && Math.abs(astronaut.vTangential) > 0.8;
    const legPhase = isMoving ? astronaut.walkCycle : 0;
    const bodyBob = isMoving ? Math.abs(Math.sin(legPhase)) * 1.2 : Math.sin(timeSec * 2.5) * 0.4;
    
    // Pierna izquierda y derecha con balanceo suave y natural
    const legL = Math.sin(legPhase) * 4.2;
    const legR = -Math.sin(legPhase) * 4.2;
    const armL = -Math.sin(legPhase) * 3.2;
    const armR = Math.sin(legPhase) * 3.2;

    // 3.5 BUFANDA FLUIDA DE MÚLTIPLES SEGMENTOS (FIRMA VISUAL DE ALTO'S ADVENTURE)
    const scarfSegs = 6;
    const scarfLen = isMoving ? 22 : 14;
    const pts = [];
    for (let i = 0; i <= scarfSegs; i++) {
        const f = i / scarfSegs;
        const waveY = Math.sin(timeSec * 8.5 - f * 3.8 + (isMoving ? legPhase * 1.1 : 0)) * (f * 3.2);
        const waveX = Math.cos(timeSec * 6.0 - f * 2.5) * (f * 1.4);
        const px = -f * scarfLen + waveX;
        const py = -11.4 + bodyBob - f * (isMoving ? 2.2 : 0.4) + waveY;
        pts.push({ x: px, y: py });
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Resplandor cálido exterior
    ctx.strokeStyle = 'rgba(231, 111, 81, 0.32)';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    // Manto principal ahusado (de ancho 2.8 a 1.0)
    for (let i = 0; i < pts.length - 1; i++) {
        const f = i / (pts.length - 1);
        ctx.strokeStyle = '#e76f51';
        ctx.lineWidth = lerp(2.8, 1.0, f);
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
        ctx.stroke();

        // Hilo de oro celestial
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
        ctx.lineWidth = lerp(0.9, 0.35, f);
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y + 0.5);
        ctx.lineTo(pts[i + 1].x, pts[i + 1].y + 0.5);
        ctx.stroke();
    }
    ctx.restore();

    // 4. Pierna trasera en silueta elegante
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.5, -5 + bodyBob);
    ctx.lineTo(legL * 0.7 - 0.5, -2);
    ctx.lineTo(legL, 0);
    ctx.stroke();

    // Bota trasera
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(legL - 1, -1.2, 3.2, 1.4);

    // 5. Mochila de soporte vital PLSS minimalista
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    safeRoundRect(ctx, -4.6, -13 + bodyBob, 3.6, 7.8, 1);
    ctx.fill();
    ctx.stroke();

    // LED sutil de telemetría
    const ledColor = astronaut.suitO2 < 30 ? '#f43f5e' : (astronaut.jetpackFuel < 25 ? '#f59e0b' : '#38bdf8');
    ctx.fillStyle = ledColor;
    ctx.beginPath();
    ctx.arc(-2.8, -11 + bodyBob, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Toberas gemelas del jetpack
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-4.2, -14.2 + bodyBob, 1.3, 1.3);
    ctx.fillRect(-2.6, -14.2 + bodyBob, 1.3, 1.3);

    // 6. Brazo trasero en silueta
    const armBackCol = lerpRGB([148, 163, 184], [30, 40, 56], localNight * 0.72);
    ctx.strokeStyle = rgbStr(armBackCol, 1);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -10 + bodyBob);
    ctx.lineTo(armL * 0.7 - 1, -6 + bodyBob);
    ctx.lineTo(armL - 0.5, -3 + bodyBob);
    ctx.stroke();

    // 7. Torso: Silueta esculpida de explorador celestial con traje adaptativo a luz diurna y nocturna
    const suitGrad = ctx.createLinearGradient(-3, -12, 3, -4);
    const sDay0 = [248, 250, 252];
    const sNight0 = [45, 55, 72];
    const sDay1 = [203, 213, 225];
    const sNight1 = [22, 28, 40];
    const c0 = lerpRGB(sDay0, sNight0, localNight * 0.72);
    const c1 = lerpRGB(sDay1, sNight1, localNight * 0.72);
    suitGrad.addColorStop(0, rgbStr(c0, 1));
    suitGrad.addColorStop(1, rgbStr(c1, 1));

    ctx.fillStyle = suitGrad;
    ctx.strokeStyle = `rgba(255, 255, 255, ${lerp(0.4, 0.12, localNight)})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    safeRoundRect(ctx, -2.6, -12 + bodyBob, 5.2, 7.4, 1.8);
    ctx.fill();
    ctx.stroke();

    // Banda de oro sutil en el pecho
    ctx.fillStyle = '#f4a261';
    ctx.fillRect(-1.4, -10.5 + bodyBob, 2.8, 0.8);

    // 8. Pierna delantera
    const legCol = lerpRGB([241, 245, 249], [40, 50, 68], localNight * 0.72);
    ctx.strokeStyle = rgbStr(legCol, 1);
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.8, -5 + bodyBob);
    ctx.lineTo(legR * 0.7 + 0.8, -2);
    ctx.lineTo(legR + 0.8, 0);
    ctx.stroke();

    // Bota delantera
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(legR, -1.4, 3.4, 1.5);

    // 9. Casco esférico con reflejo celestial
    const helmCol = lerpRGB([255, 255, 255], [45, 55, 72], localNight * 0.72);
    ctx.fillStyle = rgbStr(helmCol, 1);
    ctx.strokeStyle = rgbStr(armBackCol, 1);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0.5, -14.5 + bodyBob, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cuello
    ctx.fillStyle = '#334155';
    ctx.fillRect(-1.6, -11.6 + bodyBob, 4.2, 1.1);

    // 10. Visor de Oro Estelar Especular (Lente Solar estilo Alto)
    const visorGrad = ctx.createRadialGradient(2.4, -15.2 + bodyBob, 0.4, 1.8, -14.5 + bodyBob, 3.2);
    visorGrad.addColorStop(0.00, '#fffbeb');
    visorGrad.addColorStop(0.35, '#fde68a');
    visorGrad.addColorStop(0.75, '#f59e0b');
    visorGrad.addColorStop(1.00, '#b45309');

    ctx.fillStyle = visorGrad;
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(1.8, -14.5 + bodyBob, 2.3, 2.1, 0.12, -Math.PI * 0.48, Math.PI * 0.48);
    ctx.lineTo(1.0, -12.6 + bodyBob);
    ctx.lineTo(1.0, -16.4 + bodyBob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Destello de estrella y arco especular en el visor
    ctx.strokeStyle = `rgba(255, 255, 255, ${lerp(0.85, 0.40, localNight)})`;
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.arc(1.9, -14.7 + bodyBob, 1.55, -Math.PI * 0.72, -Math.PI * 0.12);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 255, 255, ${lerp(0.95, 0.45, localNight)})`;
    ctx.beginPath();
    ctx.arc(2.4, -15.4 + bodyBob, 0.55, 0, Math.PI * 2);
    ctx.fill();

    // 11. Brazo delantero sosteniendo el escáner astral
    const armForeCol = lerpRGB([248, 250, 252], [42, 52, 70], localNight * 0.72);
    ctx.strokeStyle = rgbStr(armForeCol, 1);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(1.2, -10 + bodyBob);
    ctx.lineTo(armR * 0.6 + 3.2, -7.5 + bodyBob);
    ctx.lineTo(armR * 0.8 + 4.8, -6.0 + bodyBob);
    ctx.stroke();

    // Multi-herramienta telemétrica (Sensor / Gato hidráulico / Soplete)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(armR * 0.8 + 4.5, -7.2 + bodyBob, 3.2, 2.0);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(armR * 0.8 + 7.5, -6.6 + bodyBob, 1.2, 1.0);

    ctx.restore();
}

/**
 * Dibuja los efectos interactivos: rayo hidráulico tractor, soplete nanita, escaneo y barras de progreso
 */
function drawInteractionEffects(timeSec) {
    if (!astronaut.active || !astronaut.planet) return;

    const p = astronaut.planet;
    const distToShip = Math.hypot(astronaut.x - ship.x, astronaut.y - ship.y);
    const shipZenith = Math.atan2(ship.y - p.y, ship.x - p.x);
    const tilt = Math.atan2(Math.sin(ship.angle - shipZenith), Math.cos(ship.angle - shipZenith));
    const isShipTilted = Math.abs(tilt) > 0.32;
    const isShipDamaged = ship.hull < 99.0;

    let padDist = 15.5;
    if (ship.customRocket && ship.customRocket.contactPoints) {
        const padPts = ship.customRocket.contactPoints.filter(pt => pt.isPad);
        const searchList = padPts.length > 0 ? padPts : ship.customRocket.contactPoints;
        padDist = Math.abs(Math.min(...searchList.map(pt => pt.x)));
    } else if (ship.scale) {
        padDist = 15.5 * ship.scale;
    }
    const maxInteractDist = Math.max(85, padDist * 1.8);

    // 1. RAYO TRACTOR HIDRÁULICO KINÉTICO (ENDEREZANDO NAVE)
    if (astronaut.actionType === 'right_ship' && astronaut.actionProgress > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const prg = astronaut.actionProgress;
        const toolX = astronaut.x + Math.cos(astronaut.angle + Math.PI / 2) * (astronaut.facing * 6);
        const toolY = astronaut.y + Math.sin(astronaut.angle + Math.PI / 2) * (astronaut.facing * 6);

        // Rayo de energía electromagnética de sujeción
        const beamGrad = ctx.createLinearGradient(toolX, toolY, ship.x, ship.y);
        beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.95)');
        beamGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.85)');
        beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0.95)');

        ctx.strokeStyle = beamGrad;
        ctx.lineWidth = 2.4 + Math.sin(timeSec * 32) * 1.2;
        ctx.beginPath();
        ctx.moveTo(toolX, toolY);
        // Curva de catenaria vibrante
        const midX = (toolX + ship.x) * 0.5 + Math.sin(timeSec * 24) * 4;
        const midY = (toolY + ship.y) * 0.5 + Math.cos(timeSec * 24) * 4;
        ctx.quadraticCurveTo(midX, midY, ship.x, ship.y);
        ctx.stroke();

        // Anillos kinéticos concéntricos que viajan hacia la nave
        const ringDist = (timeSec * 2.5) % 1;
        const rx = lerp(toolX, ship.x, ringDist);
        const ry = lerp(toolY, ship.y, ringDist);
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rx, ry, 6 + ringDist * 8, 0, Math.PI * 2);
        ctx.stroke();

        // 3. BARRA DE PROGRESO CIRCULAR FLOTANTE ALREDEDOR DEL ASTRONAUTA
        ctx.translate(astronaut.x, astronaut.y);
        ctx.rotate(camera.rotation);

        // Pista de fondo
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.arc(0, -26, 10, 0, Math.PI * 2);
        ctx.stroke();

        // Arco de progreso activo
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, -26, 10, -Math.PI / 2, -Math.PI / 2 + prg * Math.PI * 2);
        ctx.stroke();

        // Porcentaje en el centro
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(prg * 100) + '%', 0, -23.5);

        ctx.restore();
    }

    // 4. SOPLETE DE NANITAS (REPARANDO CASCO)
    if (astronaut.actionType === 'repair_ship' && astronaut.actionProgress > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const toolX = astronaut.x + Math.cos(astronaut.angle + Math.PI / 2) * (astronaut.facing * 6);
        const toolY = astronaut.y + Math.sin(astronaut.angle + Math.PI / 2) * (astronaut.facing * 6);

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(toolX, toolY);
        ctx.lineTo(ship.x, ship.y);
        ctx.stroke();

        // Barra de progreso de casco
        ctx.translate(astronaut.x, astronaut.y);
        ctx.rotate(camera.rotation);
        
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, -26, 10, -Math.PI / 2, -Math.PI / 2 + (ship.hull / 100) * Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(ship.hull) + '%', 0, -23.5);

        ctx.restore();
    }

    // 4.5 RAYO DE CONSTRUCCIÓN Y PREVISUALIZACIÓN DE BASE PLANETARIA
    if (astronaut.actionType === 'build_base' && astronaut.actionProgress > 0) {
        // Previsualización holográfica alámbrica
        if (typeof drawBaseHoloPreview === 'function') {
            drawBaseHoloPreview(timeSec);
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const prg = astronaut.actionProgress;
        const isUpgrade = !!astronaut.buildTargetBase;
        const targetLvl = isUpgrade ? Math.min(3, astronaut.buildTargetBase.level + 1) : (astronaut.selectedBaseLevel || 1);
        const holoCol = targetLvl === 1 ? '56, 189, 248' : (targetLvl === 2 ? '251, 191, 36' : '52, 211, 153');

        // Posición de la multi-herramienta del astronauta
        const toolX = astronaut.x + Math.cos(astronaut.angle + Math.PI / 2) * (astronaut.facing * 5);
        const toolY = astronaut.y + Math.sin(astronaut.angle + Math.PI / 2) * (astronaut.facing * 5);

        // Posición objetivo en el suelo
        const baseAng = isUpgrade ? astronaut.buildTargetBase.angle : astronaut.angle;
        const groundR = (typeof getNaturalSurfaceRadius === 'function') ? getNaturalSurfaceRadius(p, baseAng) : getSurfaceRadius(p, baseAng);
        const targetX = p.x + Math.cos(baseAng) * groundR;
        const targetY = p.y + Math.sin(baseAng) * groundR;

        // Rayo de soldadura cuántica y emisión de nanitas
        const beamGrad = ctx.createLinearGradient(toolX, toolY, targetX, targetY);
        beamGrad.addColorStop(0, `rgba(${holoCol}, 0.95)`);
        beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
        beamGrad.addColorStop(1, `rgba(${holoCol}, 0.95)`);

        ctx.strokeStyle = beamGrad;
        ctx.lineWidth = 2.2 + Math.sin(timeSec * 28) * 1.0;
        ctx.beginPath();
        ctx.moveTo(toolX, toolY);
        const midX = (toolX + targetX) * 0.5 + Math.sin(timeSec * 20) * 3;
        const midY = (toolY + targetY) * 0.5 + Math.cos(timeSec * 20) * 3;
        ctx.quadraticCurveTo(midX, midY, targetX, targetY);
        ctx.stroke();

        // Anillos kinéticos de energía que descienden hacia el suelo
        const ringP = (timeSec * 3) % 1;
        const rx = lerp(toolX, targetX, ringP);
        const ry = lerp(toolY, targetY, ringP);
        ctx.strokeStyle = `rgba(${holoCol}, 0.8)`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(rx, ry, 4 + ringP * 6, 0, Math.PI * 2);
        ctx.stroke();

        // Barra de progreso circular flotante sobre el astronauta
        ctx.translate(astronaut.x, astronaut.y);
        ctx.rotate(camera.rotation);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(0, -28, 12, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgb(${holoCol})`;
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, -28, 12, -Math.PI / 2, -Math.PI / 2 + prg * Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(prg * 100) + '%', 0, -25.5);

        // Etiqueta de acción
        ctx.font = 'bold 6px JetBrains Mono, monospace';
        ctx.fillStyle = `rgb(${holoCol})`;
        const actionLabel = isUpgrade ? `MEJORANDO NV.${targetLvl}` : `CONSTRUYENDO NV.${targetLvl}`;
        ctx.fillText(actionLabel, 0, -42);

        ctx.restore();
    }

    // 5. EFECTO DE ONDA DEL ESCÁNER GEOLÓGICO
    if (astronaut.scanAnimTimer > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(astronaut.x, astronaut.y);
        ctx.rotate(astronaut.angle + Math.PI / 2);
        ctx.scale(astronaut.facing, 1);

        const sProgress = 1 - astronaut.scanAnimTimer;
        const scanR = sProgress * 85;
        const scanAlpha = clamp(astronaut.scanAnimTimer * 1.2, 0, 0.85);

        ctx.strokeStyle = `rgba(56, 189, 248, ${scanAlpha})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, -10, scanR, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.stroke();

        // Relleno cónico suave
        const scanConeGrad = ctx.createRadialGradient(0, -10, 2, 0, -10, scanR);
        scanConeGrad.addColorStop(0, `rgba(56, 189, 248, ${scanAlpha * 0.25})`);
        scanConeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = scanConeGrad;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.arc(0, -10, scanR, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // 6. HOLOGRAMA DE DESPLIEGUE DE EXTRACTOR (TECLA G)
    if (astronaut.actionType === 'deploy_extractor' && astronaut.actionProgress > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const prg = astronaut.actionProgress;
        ctx.translate(astronaut.x, astronaut.y);
        ctx.rotate(camera.rotation);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.arc(0, -28, 11, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, -28, 11, -Math.PI / 2, -Math.PI / 2 + prg * Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#e0f2fe';
        ctx.font = 'bold 6.5px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PERFORADORA', 0, -43);
        ctx.fillText(Math.round(prg * 100) + '%', 0, -25.5);
        ctx.restore();
    }

    // 7. HAZ DE TRANSFERENCIA DE ÉTER AL COHETE (TECLA U) Y AVISO DE REPOSTAJE
    const closestRefuel = (typeof getClosestShipToAstronaut === 'function') ? getClosestShipToAstronaut() : { shipObj: ship, dist: distToShip };
    const rShip = closestRefuel.shipObj || ship;
    const rDist = closestRefuel.dist;
    const rMaxF = rShip.maxFuel || 100;

    if (astronaut.actionType === 'refuel_ship') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createLinearGradient(astronaut.x, astronaut.y, rShip.x, rShip.y);
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.95)');
        grad.addColorStop(0.5, 'rgba(254, 240, 138, 0.95)');
        grad.addColorStop(1, 'rgba(245, 158, 11, 0.95)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.6 + Math.sin(timeSec * 28) * 0.9;
        ctx.beginPath();
        ctx.moveTo(astronaut.x, astronaut.y);
        ctx.lineTo(rShip.x, rShip.y);
        ctx.stroke();

        const pulseP = (timeSec * 3.2) % 1;
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(lerp(astronaut.x, rShip.x, pulseP), lerp(astronaut.y, rShip.y, pulseP), 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
