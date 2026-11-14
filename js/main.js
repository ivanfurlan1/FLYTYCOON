/**
 * ÉTER - Controlador Principal del Juego, Entrada de Usuario y Bucle de Simulación
 */
const audio = new SpaceSoundEngine();

function triggerSonar() {
    audio.init();
    audio.playSonar();
    sonarPulses.push({
        x: ship.x,
        y: ship.y,
        radius: 25,
        maxRadius: 8500,
        alpha: 1.0,
        scannedKeys: new Set()
    });
}

function resetOrigin() {
    const origin = getPlanet(0, 0);
    const startAngle = -Math.PI / 2;
    const sr = getSurfaceRadius(origin, startAngle);
    ship.x = origin.x + Math.cos(startAngle) * (sr + 15);
    ship.y = origin.y + Math.sin(startAngle) * (sr + 15);
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = startAngle;
    ship.av = 0;
    ship.hull = 100;
    ship.fuel = 100;
    ship.thrustIntensity = 0;
    ship.reentryIntensity = 0;
    ship.vaporConeIntensity = 0;
    ship.hullTemp = 0;
    ship.scorch = { amount: 0, dirX: 1, dirY: 0, temp: 0 };
    ship.isGrounded = true;
    ship.sasAssistWeight = 1.0;
    if (typeof disengageOrbitMode === 'function') disengageOrbitMode(true);
    if (ship.leftGearSpring) { ship.leftGearSpring.pos = 0.35; ship.leftGearSpring.vel = 0; }
    if (ship.rightGearSpring) { ship.rightGearSpring.pos = 0.35; ship.rightGearSpring.vel = 0; }
    if (typeof smokePuffs !== 'undefined') smokePuffs.length = 0;
    if (typeof reentryParticles !== 'undefined') reentryParticles.length = 0;
    if (typeof particles !== 'undefined') particles.length = 0;
    if (typeof sparks !== 'undefined') sparks.length = 0;
    camera.x = ship.x;
    camera.y = ship.y;
    camera.rotation = -Math.PI / 2 - startAngle; // = 0
    camera.zoom = 1.1;

    // Restablecer astronauta
    if (typeof astronaut !== 'undefined') {
        astronaut.active = false;
        astronaut.actionProgress = 0;
        astronaut.actionType = null;
    }
}

// Pantalla de Presentación
const introOverlay = document.getElementById('introOverlay');
function dismissIntro() {
    if (!introOverlay || introOverlay.classList.contains('pointer-events-none')) return;
    audio.init();
    audio.playChime();
    introOverlay.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => introOverlay.classList.add('hidden'), 700);
}
const btnStartExpedition = document.getElementById('btnStartExpedition');
if (btnStartExpedition) btnStartExpedition.addEventListener('click', dismissIntro);

// Zoom con rueda de ratón para observar el cosmos, órbitas y los anillos
window.addEventListener('wheel', (e) => {
    if (e.target && e.target.id === 'starMapCanvas') return;
    if (!camera.userZoomMult) camera.userZoomMult = 1.0;
    const factor = e.deltaY > 0 ? 0.88 : 1.14;
    camera.userZoomMult = clamp(camera.userZoomMult * factor, 0.0025, 2.8);
}, { passive: true });

// --- CONVERSIÓN DE COORDENADAS PANTALLA A MUNDO & DISPARO DE COMBATE FOTÓNICO ---
let lastMouseWorldPos = { x: 0, y: 0 };

function screenToWorld(sx, sy) {
    const cx = sx - screenW * 0.5;
    const cy = sy - screenH * 0.5;
    const z = Math.max(0.001, camera.zoom);
    const zx = cx / z;
    const zy = cy / z;
    const cosR = Math.cos(-camera.rotation);
    const sinR = Math.sin(-camera.rotation);
    const rx = zx * cosR - zy * sinR;
    const ry = zx * sinR + zy * cosR;
    return {
        x: rx + camera.x,
        y: ry + camera.y
    };
}

window.addEventListener('mousemove', (e) => {
    lastMouseWorldPos = screenToWorld(e.clientX, e.clientY);
});

function handlePlayerFire(targetX, targetY) {
    if (typeof audio !== 'undefined' && audio.init) audio.init();
    if (typeof firePhotonBlaster !== 'function') return;

    if (typeof astronaut !== 'undefined' && astronaut.active) {
        // Disparo del Cosmonauta EVA
        const normAngle = astronaut.angle;
        const spawnX = astronaut.x - Math.sin(normAngle) * (astronaut.facing * 4);
        const spawnY = astronaut.y + Math.cos(normAngle) * (astronaut.facing * 4) - 6;

        let tx = targetX;
        let ty = targetY;
        if (tx === undefined || ty === undefined || Number.isNaN(tx)) {
            const tangentAngle = astronaut.angle + (astronaut.facing > 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
            tx = spawnX + Math.cos(tangentAngle) * 160;
            ty = spawnY + Math.sin(tangentAngle) * 160;
        }
        firePhotonBlaster(spawnX, spawnY, tx, ty, false);
    } else if (typeof ship !== 'undefined') {
        // Disparo de la sonda Vesper-IX
        const sc = ship.scale || 1.0;
        const noseX = ship.x + Math.cos(ship.angle) * (22 * sc);
        const noseY = ship.y + Math.sin(ship.angle) * (22 * sc);

        let tx = targetX;
        let ty = targetY;
        if (tx === undefined || ty === undefined || Number.isNaN(tx)) {
            tx = noseX + Math.cos(ship.angle) * 180;
            ty = noseY + Math.sin(ship.angle) * 180;
        }
        firePhotonBlaster(noseX, noseY, tx, ty, true);
    }
}

// Disparo fotónico con clic en el lienzo (si no interfiere con la UI)
const flightCanvasEl = document.getElementById('flightCanvas');
if (flightCanvasEl) {
    flightCanvasEl.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return; // Solo clic izquierdo
        if (introOverlay && !introOverlay.classList.contains('hidden')) return;

        // Comprobar si hay modales visibles
        const hm = document.getElementById('rocketHangarModal');
        const cm = document.getElementById('codexModal');
        const mm = document.getElementById('mapModal');
        const wm = document.getElementById('worldsModal');
        const qsm = document.getElementById('quickSaveModal');
        if ((hm && !hm.classList.contains('hidden')) || 
            (cm && !cm.classList.contains('hidden')) || 
            (mm && !mm.classList.contains('hidden')) ||
            (wm && !wm.classList.contains('hidden')) ||
            (qsm && !qsm.classList.contains('hidden'))) {
            return;
        }

        const worldTarget = screenToWorld(e.clientX, e.clientY);
        if (typeof closeFairingActionMenu === 'function') closeFairingActionMenu();
        if (typeof handleCustomRocketPartClick === 'function' && handleCustomRocketPartClick(worldTarget.x, worldTarget.y, e.clientX, e.clientY)) {
            return;
        }
        if (typeof handleFreeVesselClick === 'function' && handleFreeVesselClick(worldTarget.x, worldTarget.y, e.clientX, e.clientY)) {
            return;
        }
        handlePlayerFire(worldTarget.x, worldTarget.y);
    });
}

// Gimbal Navball de Actitud
const gimbalZone = document.getElementById('gimbalZone');
const gimbalTargetNeedle = document.getElementById('gimbalTargetNeedle');
const gimbalKnob = document.getElementById('gimbalKnob');
let gimbalPointerId = null;

function updateGimbal(e) {
    if (!gimbalZone) return;
    const rect = gimbalZone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
        const ang = Math.atan2(dy, dx);
        // Conexión con el marco de horizonte en pantalla: convierte ángulo de pantalla a ángulo de mundo
        ship.targetAngle = ang - camera.rotation;
        const deg = (ang * 180 / Math.PI) + 90;
        if (gimbalTargetNeedle) {
            gimbalTargetNeedle.style.transform = `rotate(${deg}deg)`;
            gimbalTargetNeedle.classList.remove('opacity-0');
        }
        const maxShift = 14;
        const shift = Math.min(dist * 0.28, maxShift);
        if (gimbalKnob) {
            gimbalKnob.style.transform = `translate(${(dx / dist) * shift}px, ${(dy / dist) * shift}px)`;
        }
    }
}

if (gimbalZone) {
    gimbalZone.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        dismissIntro();
        gimbalZone.setPointerCapture(e.pointerId);
        gimbalPointerId = e.pointerId;
        gimbalZone.classList.add('is-dragging');
        audio.init();
        updateGimbal(e);
    });

    gimbalZone.addEventListener('pointermove', (e) => {
        if (e.pointerId === gimbalPointerId) {
            e.preventDefault();
            updateGimbal(e);
        }
    });

    const releaseGimbal = (e) => {
        if (e.pointerId === gimbalPointerId) {
            gimbalPointerId = null;
            ship.targetAngle = null;
            gimbalZone.classList.remove('is-dragging');
            if (gimbalTargetNeedle) gimbalTargetNeedle.classList.add('opacity-0');
            if (gimbalKnob) gimbalKnob.style.transform = 'translate(0px, 0px)';
        }
    };
    gimbalZone.addEventListener('pointerup', releaseGimbal);
    gimbalZone.addEventListener('pointercancel', releaseGimbal);
}

// Barra Graduable de Potencia de Motores (0% - 100%)
const throttleTrack = document.getElementById('throttleTrack');
let throttlePointerId = null;
function setThrottleFromPointer(clientY) {
    if (!throttleTrack) return;
    const rect = throttleTrack.getBoundingClientRect();
    const raw = (rect.bottom - clientY) / Math.max(1, rect.height);
    const snapped = Math.round(clamp(raw, 0, 1) * 100) / 100;
    ship.throttle = snapped;
}
if (throttleTrack) {
    throttleTrack.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dismissIntro();
        throttlePointerId = e.pointerId;
        throttleTrack.setPointerCapture(e.pointerId);
        setThrottleFromPointer(e.clientY);
    });
    throttleTrack.addEventListener('pointermove', (e) => {
        if (e.pointerId === throttlePointerId) {
            setThrottleFromPointer(e.clientY);
        }
    });
    const releaseThrottle = (e) => {
        if (e.pointerId === throttlePointerId) {
            throttlePointerId = null;
        }
    };
    throttleTrack.addEventListener('pointerup', releaseThrottle);
    throttleTrack.addEventListener('pointercancel', releaseThrottle);
    throttleTrack.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        ship.throttle = Math.round(clamp((ship.throttle ?? 1.0) + delta, 0, 1) * 100) / 100;
    }, { passive: false });
}

// Actuador Principal de Ignición
const btnThrust = document.getElementById('btnThrust');
let thrustPointerId = null;
if (btnThrust) {
    btnThrust.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        dismissIntro();
        thrustPointerId = e.pointerId;
        btnThrust.setPointerCapture(e.pointerId);
        audio.init();
        ship.thrusting = true;
    });
    const releaseThrust = (e) => {
        if (e.pointerId === thrustPointerId) {
            thrustPointerId = null;
            ship.thrusting = false;
        }
    };
    btnThrust.addEventListener('pointerup', releaseThrust);
    btnThrust.addEventListener('pointercancel', releaseThrust);
}

// Hiperimpulso Warp y Sonar
const btnWarp = document.getElementById('btnWarp');
let warpPointerId = null;
if (btnWarp) {
    btnWarp.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        dismissIntro();
        warpPointerId = e.pointerId;
        btnWarp.setPointerCapture(e.pointerId);
        audio.init();
        ship.warping = true;
    });
    const releaseWarp = (e) => {
        if (e.pointerId === warpPointerId) {
            warpPointerId = null;
            ship.warping = false;
        }
    };
    btnWarp.addEventListener('pointerup', releaseWarp);
    btnWarp.addEventListener('pointercancel', releaseWarp);
}

const btnSonar = document.getElementById('btnSonar');
if (btnSonar) {
    btnSonar.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        dismissIntro();
        triggerSonar();
    });
}

const btnOrbit = document.getElementById('btnOrbit');
if (btnOrbit) {
    btnOrbit.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        audio.init();
        dismissIntro();
        if (typeof toggleOrbitMode === 'function') toggleOrbitMode();
    });
}

// Conmutador interactivo SAS (por clic en el badge o tecla T)
function toggleSAS() {
    ship.sasEnabled = !ship.sasEnabled;
    const badge = document.getElementById('uiSasBadge');
    if (badge) {
        showHoloCard(getPlanet(0, 0), ship.sasEnabled ? 'SAS ACTIVADO' : 'SAS MODO MANUAL',
            ship.sasEnabled ? 'Auto-alineación con el horizonte del planeta habilitada.' : 'Control libre acrobático 100% inercial.');
    }
}
const uiSasBadge = document.getElementById('uiSasBadge');
if (uiSasBadge) {
    uiSasBadge.addEventListener('click', () => {
        audio.init();
        toggleSAS();
    });
}

// Controles de Teclado
const keys = {};
window.addEventListener('keydown', (e) => {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' || e.code === 'ArrowUp' || e.code === 'KeyF') dismissIntro();
    audio.init();
    keys[e.code] = true;

    // Control de Aceleración Temporal (, lento / . rápido)
    if (e.code === 'Comma') {
        e.preventDefault();
        stepTimeScale(-1);
        return;
    }
    if (e.code === 'Period') {
        e.preventDefault();
        stepTimeScale(1);
        return;
    }

    // Desembarque o abordaje con tecla F
    if (e.code === 'KeyF') {
        e.preventDefault();
        if (typeof astronaut !== 'undefined') {
            if (astronaut.active) {
                boardShip();
            } else {
                disembarkShip();
            }
        }
        return;
    }

    // Separar etapa con tecla X
    if (e.code === 'KeyX') {
        const bldModal = document.getElementById('rocketBuilderModal');
        if (!bldModal || bldModal.classList.contains('hidden')) {
            if (typeof stageNextDecoupler === 'function' && stageNextDecoupler()) {
                e.preventDefault();
                return;
            }
        }
    }

    // Desplegar / contraer todos los paneles solares del cohete personalizado con tecla P
    if (e.code === 'KeyP') {
        const bldModal = document.getElementById('rocketBuilderModal');
        if (!bldModal || bldModal.classList.contains('hidden')) {
            if (typeof toggleAllCustomSolarPanels === 'function' && toggleAllCustomSolarPanels()) {
                e.preventDefault();
                return;
            }
        }
    }

    // Disparo fotónico / defensa contra criaturas con tecla Q o J
    if (e.code === 'KeyQ' || e.code === 'KeyJ') {
        e.preventDefault();
        handlePlayerFire(lastMouseWorldPos.x, lastMouseWorldPos.y);
        return;
    }

    // Modo EVA a pie
    if (typeof astronaut !== 'undefined' && astronaut.active) {
        if (e.code === 'KeyC') {
            e.preventDefault();
            // La lógica de mantenimiento continuado se procesa en el bucle físico
            return;
        }
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
            e.preventDefault();
            astronaut.selectedBaseLevel = 1;
            const bInfo = (typeof BASE_LEVELS !== 'undefined' && BASE_LEVELS[1]) ? BASE_LEVELS[1] : null;
            showHoloCard(astronaut.planet, 'OBJETIVO: PLATAFORMA DE HIERRO (NV. 1)', (bInfo ? bInfo.desc : 'Plataforma amplia de hierro para aterrizaje') + ' · Mantén pulsado [C] para construir.');
            return;
        }
        if (e.code === 'Digit2' || e.code === 'Numpad2') {
            e.preventDefault();
            astronaut.selectedBaseLevel = 2;
            const bInfo = (typeof BASE_LEVELS !== 'undefined' && BASE_LEVELS[2]) ? BASE_LEVELS[2] : null;
            showHoloCard(astronaut.planet, 'OBJETIVO: PLATAFORMA CON CABINA (NV. 2)', (bInfo ? bInfo.desc : 'Pista mediana con cabina de control lateral') + ' · Mantén pulsado [C] para construir.');
            return;
        }
        if (e.code === 'Digit3' || e.code === 'Numpad3') {
            e.preventDefault();
            astronaut.selectedBaseLevel = 3;
            const bInfo = (typeof BASE_LEVELS !== 'undefined' && BASE_LEVELS[3]) ? BASE_LEVELS[3] : null;
            showHoloCard(astronaut.planet, 'OBJETIVO: SUPERPLATAFORMA CON TORRE (NV. 3)', (bInfo ? bInfo.desc : 'Superpista masiva de hierro con torre de control 360°') + ' · Mantén pulsado [C] para construir.');
            return;
        }
        if (e.code === 'KeyB') {
            e.preventDefault();
            plantExplorationBeacon();
            return;
        }
        if (e.code === 'KeyE') {
            e.preventDefault();
            triggerAstronautScan();
            return;
        }
        if (e.code === 'KeyL') {
            e.preventDefault();
            astronaut.headlamp = !astronaut.headlamp;
            showHoloCard(astronaut.planet, astronaut.headlamp ? 'FAROS DEL CASCO ENCENDIDOS' : 'FAROS DEL CASCO APAGADOS',
                astronaut.headlamp ? 'Proyector frontal de haz halógeno activado.' : 'Iluminación táctica desactivada.');
            return;
        }
        if (e.code === 'KeyV') {
            e.preventDefault();
            toggleRocketHangarModal();
            return;
        }
        return;
    }

    if (e.code === 'Escape') {
        if (typeof closeAllHudDropdowns === 'function') closeAllHudDropdowns();
        const hm = document.getElementById('rocketHangarModal');
        if (hm && !hm.classList.contains('hidden')) {
            closeRocketHangarModal();
            return;
        }
        const mm = document.getElementById('mapModal');
        if (mm && !mm.classList.contains('hidden')) {
            if (typeof closeMapModal === 'function') closeMapModal();
            else mm.classList.add('hidden');
            return;
        }
        const cm = document.getElementById('codexModal');
        if (cm && !cm.classList.contains('hidden')) {
            cm.classList.add('hidden');
            return;
        }
    }

    // Modo Vuelo en Sonda
    if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') ship.thrusting = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') ship.braking = true;
    if (e.code === 'Minus' || e.code === 'NumpadSubtract' || e.code === 'BracketLeft') {
        e.preventDefault();
        ship.throttle = Math.round(clamp((ship.throttle ?? 0.0) - 0.05, 0, 1) * 100) / 100;
    }
    if (e.code === 'Equal' || e.code === 'NumpadAdd' || e.code === 'BracketRight') {
        e.preventDefault();
        ship.throttle = Math.round(clamp((ship.throttle ?? 0.0) + 0.05, 0, 1) * 100) / 100;
    }
    if (e.code === 'KeyX') {
        e.preventDefault();
        ship.throttle = 0;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        ship.warping = true;
        if (ship.orbitMode !== 'off' && typeof disengageOrbitMode === 'function') {
            disengageOrbitMode(false, 'Hiperimpulso activado. Órbita liberada.');
        }
    }
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') ship.turnVal = -1;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') ship.turnVal = 1;
    if (e.code === 'KeyO') {
        e.preventDefault();
        if (typeof toggleOrbitMode === 'function') toggleOrbitMode();
    }
    if (e.code === 'KeyE') {
        e.preventDefault();
        triggerSonar();
    }
    if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMapModal();
    }
    if (e.code === 'KeyT') {
        e.preventDefault();
        toggleSAS();
    }
    if (e.code === 'KeyL') {
        e.preventDefault();
        ship.headlightsOn = !ship.headlightsOn;
        showHoloCard(getPlanet(0, 0), ship.headlightsOn ? 'FAROS ACTIVADOS' : 'FAROS APAGADOS',
            ship.headlightsOn ? 'Proyectores volumétricos frontales de aterrizaje encendidos.' : 'Luces frontales apagadas.');
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (typeof astronaut !== 'undefined' && astronaut.active) {
        return;
    }
    if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') ship.thrusting = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') ship.braking = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') ship.warping = false;
    if (keys['KeyA'] || keys['ArrowLeft']) ship.turnVal = -1;
    else if (keys['KeyD'] || keys['ArrowRight']) ship.turnVal = 1;
    else ship.turnVal = 0;
});

// Eventos interactivos para botones EVA
const btnEVA = document.getElementById('btnEVA');
if (btnEVA) {
    btnEVA.addEventListener('click', () => {
        audio.init();
        if (typeof astronaut !== 'undefined') {
            if (astronaut.active) {
                boardShip();
            } else {
                disembarkShip();
            }
        }
    });
}

const btnEvaBoard = document.getElementById('btnEvaBoard');
if (btnEvaBoard) {
    btnEvaBoard.addEventListener('click', () => {
        audio.init();
        boardShip();
    });
}

const btnEvaBeacon = document.getElementById('btnEvaBeacon');
if (btnEvaBeacon) {
    btnEvaBeacon.addEventListener('click', () => {
        audio.init();
        plantExplorationBeacon();
    });
}

const btnEvaScan = document.getElementById('btnEvaScan');
if (btnEvaScan) {
    btnEvaScan.addEventListener('click', () => {
        audio.init();
        triggerAstronautScan();
    });
}

const btnEvaShoot = document.getElementById('btnEvaShoot');
if (btnEvaShoot) {
    btnEvaShoot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        audio.init();
        if (typeof astronaut !== 'undefined' && astronaut.active) {
            handlePlayerFire();
        }
    });
}

const btnEvaLamp = document.getElementById('btnEvaLamp');
if (btnEvaLamp) {
    btnEvaLamp.addEventListener('click', () => {
        audio.init();
        if (typeof astronaut !== 'undefined') {
            astronaut.headlamp = !astronaut.headlamp;
            showHoloCard(astronaut.planet, astronaut.headlamp ? 'FAROS DEL CASCO ENCENDIDOS' : 'FAROS DEL CASCO APAGADOS');
        }
    });
}

// Botón táctil / ratón sostenido para "Enderezar Nave"
const btnEvaRightShip = document.getElementById('btnEvaRightShip');
let rightShipHolding = false;
if (btnEvaRightShip) {
    btnEvaRightShip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        rightShipHolding = true;
        btnEvaRightShip.setPointerCapture(e.pointerId);
        keys['KeyR'] = true; // Activa lógica de enderezado
        audio.init();
    });
    const releaseRight = (e) => {
        if (rightShipHolding) {
            rightShipHolding = false;
            keys['KeyR'] = false;
        }
    };
    btnEvaRightShip.addEventListener('pointerup', releaseRight);
    btnEvaRightShip.addEventListener('pointercancel', releaseRight);
}

// Botón táctil / ratón sostenido para "Reparar Casco"
const btnEvaRepairShip = document.getElementById('btnEvaRepairShip');
let repairShipHolding = false;
if (btnEvaRepairShip) {
    btnEvaRepairShip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        repairShipHolding = true;
        btnEvaRepairShip.setPointerCapture(e.pointerId);
        keys['KeyR'] = true;
        audio.init();
    });
    const releaseRepair = (e) => {
        if (repairShipHolding) {
            repairShipHolding = false;
            keys['KeyR'] = false;
        }
    };
    btnEvaRepairShip.addEventListener('pointerup', releaseRepair);
    btnEvaRepairShip.addEventListener('pointercancel', releaseRepair);
}

// Botón táctil / ratón sostenido para "Construir / Mejorar Base Planetaria"
const btnEvaBuildBase = document.getElementById('btnEvaBuildBase');
if (btnEvaBuildBase) {
    btnEvaBuildBase.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btnEvaBuildBase.setPointerCapture(e.pointerId);
        if (typeof astronaut !== 'undefined') {
            astronaut.isHoldingBuildBtn = true;
        }
        keys['KeyC'] = true;
        audio.init();
    });
    const releaseBuild = (e) => {
        if (typeof astronaut !== 'undefined') {
            astronaut.isHoldingBuildBtn = false;
        }
        keys['KeyC'] = false;
    };
    btnEvaBuildBase.addEventListener('pointerup', releaseBuild);
    btnEvaBuildBase.addEventListener('pointercancel', releaseBuild);
}

// Botón táctil / ratón para "Construir Cohete / Astillero Aeroespacial"
const btnEvaBuildRocket = document.getElementById('btnEvaBuildRocket');
if (btnEvaBuildRocket) {
    let holdTimer = null;
    let didHoldAction = false;

    btnEvaBuildRocket.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btnEvaBuildRocket.setPointerCapture(e.pointerId);
        didHoldAction = false;
        audio.init();

        holdTimer = setTimeout(() => {
            didHoldAction = true;
            if (typeof astronaut !== 'undefined') {
                astronaut.isHoldingRocketBuildBtn = true;
            }
            keys['KeyV'] = true;
        }, 280);
    });

    const releaseBuildRocket = (e) => {
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }
        if (!didHoldAction) {
            // Pulsación corta: abrir el modal del astillero de cohetes
            toggleRocketHangarModal();
        }
        if (typeof astronaut !== 'undefined') {
            astronaut.isHoldingRocketBuildBtn = false;
        }
        keys['KeyV'] = false;
    };

    btnEvaBuildRocket.addEventListener('pointerup', releaseBuildRocket);
    btnEvaBuildRocket.addEventListener('pointercancel', releaseBuildRocket);
}

// Astillero Planetario & Hangar de Cohetes
const rocketHangarModal = document.getElementById('rocketHangarModal');
const btnCloseRocketHangar = document.getElementById('btnCloseRocketHangar');
let hangarPreviewAnimId = null;

function toggleRocketHangarModal() {
    if (!rocketHangarModal) return;
    const isHidden = rocketHangarModal.classList.contains('hidden');
    if (isHidden) {
        openRocketHangarModal();
    } else {
        closeRocketHangarModal();
    }
}

function openRocketHangarModal() {
    if (!rocketHangarModal) return;
    renderRocketHangarCards();
    rocketHangarModal.classList.remove('hidden');
    startHangarPreviewLoop();
}

function closeRocketHangarModal() {
    if (!rocketHangarModal) return;
    rocketHangarModal.classList.add('hidden');
    if (hangarPreviewAnimId) {
        cancelAnimationFrame(hangarPreviewAnimId);
        hangarPreviewAnimId = null;
    }
}

function startHangarPreviewLoop() {
    if (hangarPreviewAnimId) cancelAnimationFrame(hangarPreviewAnimId);
    function loop() {
        if (!rocketHangarModal || rocketHangarModal.classList.contains('hidden')) return;
        const canvases = document.querySelectorAll('.rocket-card-canvas');
        canvases.forEach(cvs => {
            const mKey = cvs.getAttribute('data-model');
            if (mKey && typeof renderRocketPreview === 'function') {
                renderRocketPreview(cvs, mKey);
            }
        });
        hangarPreviewAnimId = requestAnimationFrame(loop);
    }
    hangarPreviewAnimId = requestAnimationFrame(loop);
}

function renderRocketHangarCards() {
    const container = document.getElementById('rocketCardsContainer');
    if (!container || typeof ROCKET_MODELS === 'undefined') return;

    container.innerHTML = '';
    const currentModelId = (typeof astronaut !== 'undefined' && astronaut.selectedRocketModel) ? astronaut.selectedRocketModel : (ship.modelKey || 'vesper');
    const activeVesselId = ship.modelKey || 'vesper';

    for (const key of Object.keys(ROCKET_MODELS)) {
        const m = ROCKET_MODELS[key];
        const isSelected = (currentModelId === m.id);
        const isActiveShip = (activeVesselId === m.id);

        const card = document.createElement('div');
        card.className = `p-4 rounded-2xl flex flex-col justify-between transition-all duration-200 border ${
            isActiveShip 
                ? 'bg-cyan-950/30 border-cyan-400/50 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                : (isSelected 
                    ? 'bg-white/[0.05] border-amber-400/40' 
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]')
        }`;

        let badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-400/30';
        if (m.badgeColor === 'rose') badgeBg = 'bg-rose-500/20 text-rose-300 border-rose-400/30';
        else if (m.badgeColor === 'sky') badgeBg = 'bg-sky-500/20 text-sky-300 border-sky-400/30';
        else if (m.badgeColor === 'orange') badgeBg = 'bg-orange-500/20 text-orange-300 border-orange-400/30';
        else if (m.badgeColor === 'emerald') badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
        else if (m.badgeColor === 'purple') badgeBg = 'bg-purple-500/20 text-purple-300 border-purple-400/30';
        else if (m.badgeColor === 'teal') badgeBg = 'bg-teal-500/20 text-teal-300 border-teal-400/30';

        card.innerHTML = `
            <div>
                <!-- Vista Previa 2D Animada en Canvas -->
                <div class="relative w-full h-24 rounded-xl overflow-hidden mb-3 border border-white/10 bg-black/60 shadow-inner">
                    <canvas class="rocket-card-canvas w-full h-full block" width="220" height="96" data-model="${m.id}"></canvas>
                    <span class="absolute top-2 left-2 text-[9px] font-mono-num font-bold px-2 py-0.5 rounded-full border ${badgeBg}">
                        ${m.badge.toUpperCase()}
                    </span>
                    <span class="absolute top-2 right-2 text-[9px] font-mono-num text-stone-400 bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
                        ${m.scale}x ESCALA
                    </span>
                    ${isActiveShip ? `
                        <span class="absolute bottom-2 left-2 text-[8px] font-mono-num font-bold px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-200 border border-cyan-400/40">
                            ★ NAVE ACTUAL
                        </span>
                    ` : ''}
                </div>

                <!-- Título y Clase -->
                <div class="flex items-start justify-between gap-2 mb-1">
                    <div>
                        <h3 class="font-display text-sm sm:text-base font-bold text-white tracking-wide">${m.name}</h3>
                        <span class="text-[10px] font-mono-num text-stone-400 block">${m.class}</span>
                    </div>
                </div>

                <!-- Descripción y Lema -->
                <p class="text-[11px] text-stone-300 mb-3 leading-snug">${m.tagline}</p>

                <!-- Cuadrícula de Especificaciones Físicas y Funcionales -->
                <div class="grid grid-cols-2 gap-2 text-[10px] font-mono-num bg-black/30 p-2.5 rounded-xl border border-white/[0.06] mb-3">
                    <div>
                        <span class="text-stone-400 block text-[9px]">PASAJEROS / TRIP.</span>
                        <strong class="${m.passengers >= 20 ? 'text-sky-300' : 'text-stone-200'}">
                            ${m.passengers > 0 ? (m.passengers + (m.passengers >= 10 ? ' Colonos' : ' Pasajero(s)')) : '0 (IA Autónoma)'}
                        </strong>
                    </div>
                    <div>
                        <span class="text-stone-400 block text-[9px]">EMISIÓN DE HUMO</span>
                        <strong class="${m.smokeScale >= 2.0 ? 'text-rose-300' : (m.smokeScale < 0.6 ? 'text-teal-300' : 'text-stone-200')}">
                            ${m.smokeScale >= 2.0 ? 'Colosal (' + m.smokeScale + 'x)' : (m.smokeScale < 0.5 ? 'Iónico (' + m.smokeScale + 'x)' : m.smokeScale + 'x Normal')}
                        </strong>
                    </div>
                    <div>
                        <span class="text-stone-400 block text-[9px]">VELOCIDAD MÁX.</span>
                        <strong class="${m.maxSpeed >= 800 ? 'text-purple-300 font-bold' : 'text-stone-200'}">${m.maxSpeed} m/s</strong>
                    </div>
                    <div>
                        <span class="text-stone-400 block text-[9px]">MASA / INERCIA</span>
                        <strong class="text-stone-200">${m.mass}t · ${m.inertia}</strong>
                    </div>
                    <div>
                        <span class="text-stone-400 block text-[9px]">CASCO / BLINDAJE</span>
                        <strong class="${m.maxHull >= 180 ? 'text-orange-300' : 'text-stone-200'}">${m.maxHull} HP</strong>
                    </div>
                    <div>
                        <span class="text-stone-400 block text-[9px]">ÉTER / TANQUE</span>
                        <strong class="text-amber-200">${m.fuelCapacity} L</strong>
                    </div>
                </div>

                <!-- Función Especial Única -->
                <div class="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-3 text-[10.5px]">
                    <span class="text-[9px] font-mono-num font-semibold uppercase tracking-wider text-amber-300/90 block mb-0.5">⚡ ${m.specialAbility}</span>
                    <span class="text-stone-300/90 text-[10px] leading-tight block">${m.specialDesc}</span>
                </div>
            </div>

            <!-- Botón de Acción -->
            <button class="btn-build-rocket-card w-full py-2.5 px-3 rounded-xl font-display text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isActiveShip
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 hover:bg-cyan-500/30'
                    : 'bg-white/10 text-white border border-white/15 hover:bg-white/20 active:scale-[0.98]'
            }" data-model="${m.id}">
                <svg class="w-3.5 h-3.5 ${isActiveShip ? 'text-cyan-300' : 'text-amber-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                </svg>
                <span>${isActiveShip ? 'Re-ensamblar en Suelo' : 'Ensamblar y Desplegar'}</span>
            </button>
        `;

        container.appendChild(card);
    }

    container.querySelectorAll('.btn-build-rocket-card').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mId = btn.getAttribute('data-model');
            if (mId && typeof astronaut !== 'undefined') {
                astronaut.selectedRocketModel = mId;
                closeRocketHangarModal();
                if (astronaut.active && astronaut.planet) {
                    deployNewRocket(astronaut.planet, astronaut.angle, mId);
                } else if (!astronaut.active) {
                    applyRocketModel(ship, mId);
                    if (typeof updateStageHudButton === 'function') updateStageHudButton();
                    const mod = getRocketModel(mId);
                    showHoloCard(getPlanet(0, 0), 'SISTEMAS RECONFIGURADOS', `${mod.name.toUpperCase()} activo con física y capacidad sincronizadas.`);
                    sfx('playBaseComplete');
                }
            }
        });
    });
}

if (btnCloseRocketHangar) {
    btnCloseRocketHangar.addEventListener('click', closeRocketHangarModal);
}

// Botones de selección de nivel de base (1, 2, 3) en la barra EVA
for (let lvl = 1; lvl <= 3; lvl++) {
    const btnLvl = document.getElementById(`btnBaseLvl${lvl}`);
    if (btnLvl) {
        btnLvl.addEventListener('click', () => {
            audio.init();
            if (typeof astronaut !== 'undefined') {
                astronaut.selectedBaseLevel = lvl;
                const info = (typeof BASE_LEVELS !== 'undefined' && BASE_LEVELS[lvl]) ? BASE_LEVELS[lvl] : null;
                if (info && astronaut.planet) {
                    showHoloCard(astronaut.planet, `NIVEL DE BASE SELECCIONADO: NV. ${lvl}`, `${info.name} — ${info.desc}`);
                }
            }
        });
    }
}

// Modales: Carta Astral y Códice
const mapModal = document.getElementById('mapModal');
const btnOpenMap = document.getElementById('btnOpenMap');
if (btnOpenMap) {
    btnOpenMap.addEventListener('click', () => {
        if (typeof toggleMapModal === 'function') toggleMapModal();
    });
}
const btnCloseMap = document.getElementById('btnCloseMap');
if (btnCloseMap) {
    btnCloseMap.addEventListener('click', () => {
        if (typeof closeMapModal === 'function') closeMapModal();
        else if (mapModal) mapModal.classList.add('hidden');
    });
}

const codexModal = document.getElementById('codexModal');
const btnOpenCodex = document.getElementById('btnOpenCodex');
if (btnOpenCodex) {
    btnOpenCodex.addEventListener('click', () => {
        renderCodexList();
        if (codexModal) codexModal.classList.remove('hidden');
    });
}
const btnCloseCodex = document.getElementById('btnCloseCodex');
if (btnCloseCodex) {
    btnCloseCodex.addEventListener('click', () => {
        if (codexModal) codexModal.classList.add('hidden');
    });
}

const btnRandomSeed = document.getElementById('btnRandomSeed');
if (btnRandomSeed) {
    btnRandomSeed.addEventListener('click', () => {
        const seedInput = document.getElementById('inSeed');
        const prefixes = ['COSMOS', 'ASTRAL', 'NOVA', 'VOYD', 'MINECRAFT', 'ZENITH', 'CHRONOS', 'PULSAR', 'NEBULA', 'ORION', 'SOL'];
        const randSeed = `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${Math.floor(Math.random() * 8999 + 1000)}`;
        if (seedInput) seedInput.value = randSeed;
        universeSeed = randSeed;
        sectors.clear();
        codexPlanets.clear();
        if (typeof clearAllWaypoints === 'function') clearAllWaypoints();
        if (typeof astronaut !== 'undefined') astronaut.plantedBeacons = [];
        if (typeof planetaryBases !== 'undefined') planetaryBases.length = 0;
        resetOrigin();
        if (typeof autoSaveActiveWorld === 'function') autoSaveActiveWorld(false);
        if (codexModal) codexModal.classList.add('hidden');
        showHoloCard(getPlanet(0, 0), 'NUEVO UNIVERSO GENERADO', `Semilla Única: #${universeSeed}`);
        sfx('playChime');
    });
}

const btnApplySeed = document.getElementById('btnApplySeed');
if (btnApplySeed) {
    btnApplySeed.addEventListener('click', () => {
        const seedInput = document.getElementById('inSeed');
        const val = (seedInput && seedInput.value.trim().toUpperCase()) || 'ASTRAL-7';
        universeSeed = val;
        sectors.clear();
        codexPlanets.clear();
        if (typeof clearAllWaypoints === 'function') clearAllWaypoints();
        if (typeof astronaut !== 'undefined') astronaut.plantedBeacons = [];
        if (typeof planetaryBases !== 'undefined') planetaryBases.length = 0;
        resetOrigin();
        if (typeof autoSaveActiveWorld === 'function') autoSaveActiveWorld(false);
        if (codexModal) codexModal.classList.add('hidden');
        showHoloCard(getPlanet(0, 0), 'CONSTELACIÓN GENERADA', `Semilla Astral: #${universeSeed}`);
        sfx('playChime');
    });
}

const btnEmergencyRescue = document.getElementById('btnEmergencyRescue');
if (btnEmergencyRescue) {
    btnEmergencyRescue.addEventListener('click', () => {
        resetOrigin();
        if (codexModal) codexModal.classList.add('hidden');
        showHoloCard(getPlanet(0, 0), 'RETORNO COMPLETADO', 'Sonda estabilizada en Cuna del Éter.');
    });
}

const btnAudioToggle = document.getElementById('btnAudioToggle');
if (btnAudioToggle) {
    btnAudioToggle.addEventListener('click', () => {
        audio.init();
        const muted = audio.toggleMute();
        const iconOn = document.getElementById('iconAudioOn');
        const iconOff = document.getElementById('iconAudioOff');
        const statusTxt = document.getElementById('uiAudioStatusText');
        if (iconOn) iconOn.classList.toggle('hidden', muted);
        if (iconOff) iconOff.classList.toggle('hidden', !muted);
        if (statusTxt) {
            statusTxt.textContent = muted ? 'OFF' : 'ON';
            statusTxt.className = `font-mono-num text-[9px] ${muted ? 'text-rose-400' : 'text-emerald-300'}`;
        }
    });
}

// --- CONTROL DE ACELERACIÓN TEMPORAL (TIME WARP EXPONENCIAL) Y MENÚS DESPLEGABLES ---
const TIME_WARP_LEVELS = [1, 2, 4, 8, 16, 32, 64];
let timeScale = 1;

function setTimeScale(newScale) {
    if (!TIME_WARP_LEVELS.includes(newScale)) newScale = 1;
    timeScale = newScale;

    const label = document.getElementById('uiTimeWarpLabel');
    const status = document.getElementById('uiTimeWarpMenuStatus');
    const toggleBtn = document.getElementById('btnTimeWarpToggle');

    if (label) label.textContent = `${timeScale}×`;
    if (status) {
        status.textContent = timeScale === 1 ? 'NORMAL' : `ACELERADO ${timeScale}×`;
        status.className = `font-mono-num text-[9.5px] font-semibold ${timeScale > 1 ? 'text-amber-300' : 'text-stone-400'}`;
    }
    if (toggleBtn) {
        toggleBtn.classList.toggle('time-warp-active-pill', timeScale > 1);
    }

    document.querySelectorAll('.time-warp-opt').forEach(btn => {
        const sp = Number(btn.dataset.speed);
        btn.classList.toggle('active', sp === timeScale);
    });
}

function stepTimeScale(dir) {
    const idx = TIME_WARP_LEVELS.indexOf(timeScale);
    const nextIdx = clamp((idx === -1 ? 0 : idx) + dir, 0, TIME_WARP_LEVELS.length - 1);
    setTimeScale(TIME_WARP_LEVELS[nextIdx]);
}

const btnTimeWarpToggle = document.getElementById('btnTimeWarpToggle');
const timeWarpMenu = document.getElementById('timeWarpMenu');
const btnSystemsMenu = document.getElementById('btnSystemsMenu');
const systemsDropdown = document.getElementById('systemsDropdown');

function closeAllHudDropdowns() {
    if (timeWarpMenu) timeWarpMenu.classList.add('hidden');
    if (systemsDropdown) systemsDropdown.classList.add('hidden');
}

if (btnTimeWarpToggle && timeWarpMenu) {
    btnTimeWarpToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = timeWarpMenu.classList.contains('hidden');
        closeAllHudDropdowns();
        if (willOpen) timeWarpMenu.classList.remove('hidden');
    });
    timeWarpMenu.addEventListener('click', (e) => e.stopPropagation());
}

document.querySelectorAll('.time-warp-opt').forEach(btn => {
    btn.addEventListener('click', () => {
        setTimeScale(Number(btn.dataset.speed));
    });
});

const btnTimeWarpReset = document.getElementById('btnTimeWarpReset');
if (btnTimeWarpReset) {
    btnTimeWarpReset.addEventListener('click', () => setTimeScale(1));
}

if (btnSystemsMenu && systemsDropdown) {
    btnSystemsMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = systemsDropdown.classList.contains('hidden');
        closeAllHudDropdowns();
        if (willOpen) systemsDropdown.classList.remove('hidden');
    });
    systemsDropdown.addEventListener('click', (e) => e.stopPropagation());
}

const btnHudHeadlights = document.getElementById('btnHudHeadlights');
if (btnHudHeadlights) {
    btnHudHeadlights.addEventListener('click', () => {
        if (typeof astronaut !== 'undefined' && astronaut.active) {
            astronaut.headlamp = !astronaut.headlamp;
            showHoloCard(astronaut.planet, astronaut.headlamp ? 'FAROS DEL CASCO ENCENDIDOS' : 'FAROS DEL CASCO APAGADOS',
                astronaut.headlamp ? 'Proyector frontal de haz halógeno activado.' : 'Iluminación táctica desactivada.');
        } else {
            ship.headlightsOn = !ship.headlightsOn;
            showHoloCard(getPlanet(0, 0), ship.headlightsOn ? 'FAROS ACTIVADOS' : 'FAROS APAGADOS',
                ship.headlightsOn ? 'Proyectores volumétricos frontales de aterrizaje encendidos.' : 'Luces frontales apagadas.');
        }
        closeAllHudDropdowns();
    });
}

// Cerrar menús al hacer clic fuera o abrir un modal
document.addEventListener('click', () => closeAllHudDropdowns());
['btnOpenBuilderHUD', 'btnOpenCodex', 'btnOpenMap', 'btnOpenWorldsHUD', 'btnQuickSaveHUD'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => closeAllHudDropdowns());
});

// Bucle Principal de Animación con Sub-pasos para Aceleración Temporal
let lastTime = performance.now();
let _loopErrorReported = false;

window.__reportEterError = function(err, sourceLabel) {
    if (_loopErrorReported) return;
    _loopErrorReported = true;
    console.error('ÉTER Error [' + (sourceLabel || 'runtime') + ']:', err);
    try {
        let box = document.getElementById('eterErrorBanner');
        if (!box) {
            box = document.createElement('div');
            box.id = 'eterErrorBanner';
            box.style.cssText = 'position:fixed;bottom:14px;left:14px;z-index:99999;max-width:440px;background:rgba(15,23,42,0.95);color:#fecaca;border:1px solid rgba(248,113,113,0.45);border-radius:14px;padding:12px 14px;font-family:monospace;font-size:11px;box-shadow:0 12px 32px rgba(0,0,0,0.6);';
            document.body.appendChild(box);
        }
        const msg = (err && (err.message || String(err))) || 'Error desconocido';
        box.innerHTML = `<div style="font-weight:700;color:#fca5a5;margin-bottom:6px;">Error en ÉTER (${sourceLabel || 'JS'})</div>`
            + `<div style="color:#e2e8f0;word-break:break-word;margin-bottom:8px;">${msg.replace(/</g, '&lt;')}</div>`
            + `<div style="display:flex;gap:8px;flex-wrap:wrap;">`
            + `<button id="btnEterClearCache" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-weight:600;">Reiniciar sesión local y recargar</button>`
            + `<button id="btnEterCloseErr" style="background:rgba(255,255,255,0.1);color:#e2e8f0;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;">Cerrar</button>`
            + `</div>`;
        const btnClr = document.getElementById('btnEterClearCache');
        if (btnClr) btnClr.onclick = () => {
            try { localStorage.removeItem('eter_worlds_v1'); } catch (_) {}
            location.reload();
        };
        const btnCls = document.getElementById('btnEterCloseErr');
        if (btnCls) btnCls.onclick = () => box.remove();
    } catch (_) {}
};

window.addEventListener('error', (ev) => {
    window.__reportEterError(ev.error || ev.message, ev.filename ? ev.filename.split('/').pop() + ':' + ev.lineno : 'window');
});

function loop(now) {
    requestAnimationFrame(loop);

    const rawDt = Math.min(0.04, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    try {
        if (timeScale <= 1) {
            updatePhysics(rawDt, false);
        } else {
            const totalSimDt = rawDt * timeScale;
            const maxSubStep = 0.025;
            const steps = Math.min(48, Math.max(1, Math.ceil(totalSimDt / maxSubStep)));
            const subDt = totalSimDt / steps;
            for (let s = 0; s < steps; s++) {
                updatePhysics(subDt, s < steps - 1);
            }
        }
        render(typeof cosmosSimTime !== 'undefined' ? cosmosSimTime : (now / 1000));
    } catch (err) {
        window.__reportEterError(err, 'loop');
    }
}

let _simInitialized = false;
function initSimulator() {
    if (_simInitialized) return;
    _simInitialized = true;
    resize();
    initCosmos();
    resetOrigin();

    const isAutostart = !!(window.location.search && window.location.search.includes('autostart'));
    if (typeof initWorldSaveSystem === 'function') {
        try {
            initWorldSaveSystem(isAutostart);
        } catch (e) {
            console.warn('ÉTER: Error inicializando sistema de mundos:', e);
            window.__reportEterError(e, 'saves');
        }
    }

    if (isAutostart) {
        dismissIntro();
        if (window.location.search.includes('saturn')) {
            const nearby = getNearbyPlanets(0, 0, 4);
            const ringed = nearby.find(p => p.hasRings && !p.isOrigin) || nearby.find(p => p.hasRings) || nearby[1];
            if (ringed) {
                ship.x = ringed.x;
                ship.y = ringed.y;
                ship.vx = 0;
                ship.vy = 0;
                ship.isGrounded = false;
                camera.x = ringed.x;
                camera.y = ringed.y;
                camera.rotation = 0;
                camera.userZoomMult = 0.14;
                camera.zoom = 0.14;
                camera.targetZoom = 0.14;
            }
        } else if (window.location.search.includes('lake')) {
            const p = getPlanet(0, 0);
            if (p && p.lakes && p.lakes.length > 0) {
                const lk = p.lakes[0];
                ship.x = p.x + Math.cos(lk.centerAngle) * (lk.waterLevel + 18);
                ship.y = p.y + Math.sin(lk.centerAngle) * (lk.waterLevel + 18);
                ship.vx = 0;
                ship.vy = 0;
                ship.isGrounded = false;
                camera.x = ship.x;
                camera.y = ship.y;
                camera.userZoomMult = 1.0;
                camera.rotation = -Math.PI / 2 - lk.centerAngle;
            }
        } else if (window.location.search.includes('orbit')) {
            const p = getPlanet(0, 0);
            ship.x = p.x;
            ship.y = p.y;
            ship.vx = 0;
            ship.vy = 0;
            ship.isGrounded = false;
            camera.x = p.x;
            camera.y = p.y;
            camera.rotation = 0;
            camera.userZoomMult = 0.14;
            camera.zoom = 0.14;
            camera.targetZoom = 0.14;
        } else if (window.location.search.includes('archetype=')) {
            const match = window.location.search.match(/archetype=([a-z_]+)/);
            if (match) {
                const targetArchId = match[1];
                const nearby = getNearbyPlanets(0, 0, 8);
                let targetPlanet = nearby.find(p => p.archetype && p.archetype.id === targetArchId);
                if (!targetPlanet && typeof ARCHETYPES !== 'undefined' && ARCHETYPES[targetArchId]) {
                    targetPlanet = getPlanet(0, 0);
                    targetPlanet.archetype = ARCHETYPES[targetArchId];
                    if (targetPlanet.archetype.hasRings) {
                        targetPlanet.hasRings = true;
                        targetPlanet.ringStyle = targetPlanet.archetype.ringStyle || 'saturnian_rings';
                    }
                }
                if (targetPlanet) {
                    ship.x = targetPlanet.x;
                    ship.y = targetPlanet.y;
                    ship.vx = 0;
                    ship.vy = 0;
                    ship.isGrounded = false;
                    camera.x = targetPlanet.x;
                    camera.y = targetPlanet.y;
                    camera.rotation = 0;
                    camera.userZoomMult = 0.06;
                    camera.zoom = 0.06;
                    camera.targetZoom = 0.06;
                }
            }
        }
    }

    requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSimulator);
} else {
    initSimulator();
}
window.addEventListener('load', initSimulator);
