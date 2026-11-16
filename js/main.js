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
function showIntroScreen() {
    if (!introOverlay) return;
    if (typeof autoSaveActiveWorld === 'function') autoSaveActiveWorld(true);
    if (typeof refreshSavesUI === 'function') refreshSavesUI();
    introOverlay.classList.remove('hidden', 'pointer-events-none');
    requestAnimationFrame(() => introOverlay.classList.remove('opacity-0'));
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

// Zoom táctil pellizcando con dos dedos (Pinch-to-Zoom) para móvil y tablet
let _pinchLastDist = null;
let _isPinchingCanvas = false;
const _canvasForPinch = document.getElementById('flightCanvas');
if (_canvasForPinch) {
    _canvasForPinch.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 2) {
            e.preventDefault();
            _isPinchingCanvas = true;
            _pinchLastDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, { passive: false });

    _canvasForPinch.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length === 2) {
            e.preventDefault();
            const d = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            if (_pinchLastDist && _pinchLastDist > 6 && d > 6) {
                if (!camera.userZoomMult) camera.userZoomMult = 1.0;
                const ratio = clamp(d / _pinchLastDist, 0.82, 1.22);
                camera.userZoomMult = clamp(camera.userZoomMult * ratio, 0.0025, 2.8);
            }
            _pinchLastDist = d;
            _isPinchingCanvas = true;
        }
    }, { passive: false });

    const endPinch = (e) => {
        if (!e.touches || e.touches.length < 2) {
            _pinchLastDist = null;
            if (!e.touches || e.touches.length === 0) {
                setTimeout(() => { _isPinchingCanvas = false; }, 80);
            }
        }
    };
    _canvasForPinch.addEventListener('touchend', endPinch, { passive: true });
    _canvasForPinch.addEventListener('touchcancel', endPinch, { passive: true });
}

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

window.addEventListener('pointermove', (e) => {
    lastMouseWorldPos = screenToWorld(e.clientX, e.clientY);
    if (typeof handleExtractorHover === 'function' && e.target && e.target.id === 'flightCanvas') {
        handleExtractorHover(lastMouseWorldPos.x, lastMouseWorldPos.y);
    }
    if (typeof LightingEngine !== 'undefined') {
        if (LightingEngine.isDraggingAim() || (e.target && e.target.id === 'flightCanvas')) {
            const lightHover = LightingEngine.handlePointerMove(lastMouseWorldPos.x, lastMouseWorldPos.y);
            if ((lightHover || LightingEngine.isPlacementMode()) && flightCanvasEl) {
                flightCanvasEl.style.cursor = LightingEngine.isPlacementMode() ? 'crosshair' : 'pointer';
            }
        }
    }
    if (typeof ColonyBuildings !== 'undefined' && e.target && e.target.id === 'flightCanvas') {
        const colHover = ColonyBuildings.handlePointerMove(lastMouseWorldPos.x, lastMouseWorldPos.y);
        if ((colHover || ColonyBuildings.placementMode) && flightCanvasEl) {
            flightCanvasEl.style.cursor = ColonyBuildings.placementMode ? 'crosshair' : 'pointer';
        }
    }
});

window.addEventListener('pointerup', () => {
    if (typeof LightingEngine !== 'undefined') {
        LightingEngine.handlePointerUp();
    }
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

// Interacción directa con el lienzo (extractores y partes del cohete)
const flightCanvasEl = document.getElementById('flightCanvas');
if (flightCanvasEl) {
    flightCanvasEl.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || _isPinchingCanvas) return; // Solo clic izquierdo y sin pellizco táctil
        if (introOverlay && !introOverlay.classList.contains('hidden')) return;

        // Comprobar si hay modales visibles
        const hm = document.getElementById('rocketHangarModal');
        const mm = document.getElementById('mapModal');
        const wm = document.getElementById('worldsModal');
        const cwm = document.getElementById('createWorldModal');
        const qsm = document.getElementById('quickSaveModal');
        const extm = document.getElementById('extractorModal');
        const invm = document.getElementById('resourceInventoryModal');
        const colm = document.getElementById('colonyModal');
        const wcm = document.getElementById('worldCategoriesModal');
        if ((hm && !hm.classList.contains('hidden')) || 
            (mm && !mm.classList.contains('hidden')) ||
            (wm && !wm.classList.contains('hidden')) ||
            (cwm && !cwm.classList.contains('hidden')) ||
            (qsm && !qsm.classList.contains('hidden')) ||
            (extm && !extm.classList.contains('hidden')) ||
            (invm && !invm.classList.contains('hidden')) ||
            (colm && !colm.classList.contains('hidden')) ||
            (wcm && !wcm.classList.contains('hidden'))) {
            return;
        }

        const worldTarget = screenToWorld(e.clientX, e.clientY);
        if (typeof closeFairingActionMenu === 'function') closeFairingActionMenu();
        if (typeof LightingEngine !== 'undefined' && LightingEngine.isPlacementMode() && LightingEngine.handlePointerDown(worldTarget.x, worldTarget.y)) {
            return;
        }
        if (typeof ColonyBuildings !== 'undefined' && ColonyBuildings.placementMode && ColonyBuildings.handlePointerDown(worldTarget.x, worldTarget.y)) {
            return;
        }
        if (typeof handleExtractorClick === 'function' && handleExtractorClick(worldTarget.x, worldTarget.y)) {
            return;
        }
        if (typeof handleCustomRocketPartClick === 'function' && handleCustomRocketPartClick(worldTarget.x, worldTarget.y, e.clientX, e.clientY)) {
            return;
        }
        if (typeof LightingEngine !== 'undefined' && LightingEngine.handlePointerDown(worldTarget.x, worldTarget.y)) {
            return;
        }
        if (typeof handleFreeVesselClick === 'function' && handleFreeVesselClick(worldTarget.x, worldTarget.y, e.clientX, e.clientY)) {
            return;
        }
        if (typeof handleWorldObjectClick === 'function' && handleWorldObjectClick(worldTarget.x, worldTarget.y, e.clientX, e.clientY)) {
            return;
        }
        if (typeof ColonyBuildings !== 'undefined' && ColonyBuildings.handlePointerDown(worldTarget.x, worldTarget.y)) {
            if (typeof closeWorldObjectMenu === 'function') closeWorldObjectMenu();
            return;
        }
        if (typeof closeColonyInspector === 'function') closeColonyInspector();
        if (typeof closeWorldObjectMenu === 'function') closeWorldObjectMenu();
    });

    flightCanvasEl.addEventListener('contextmenu', (e) => {
        if (typeof LightingEngine !== 'undefined' && LightingEngine.isPlacementMode()) {
            e.preventDefault();
            LightingEngine.exitPlacementMode();
        }
        if (typeof ColonyBuildings !== 'undefined' && ColonyBuildings.placementMode) {
            e.preventDefault();
            ColonyBuildings.exitPlacementMode();
        }
    });
}

// Cruz Direccional estilo Spaceflight Simulator (▲ / ◀ ▼ ▶)
const btnSteerLeftTop = document.getElementById('btnSteerLeftTop');
const btnSteerRightTop = document.getElementById('btnSteerRightTop');
const btnSteerLeft = document.getElementById('btnSteerLeft');
const btnSteerRight = document.getElementById('btnSteerRight');
const btnThrustUp = document.getElementById('btnThrustUp');
const btnBrakeDown = document.getElementById('btnBrakeDown');

function bindFlightPadButton(btn, onPress, onRelease) {
    if (!btn) return;
    let activePtrId = null;
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dismissIntro();
        audio.init();
        activePtrId = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch (_) {}
        onPress();
        btn.classList.add('is-active');
    });
    const release = (e) => {
        if (activePtrId !== null && (e.pointerId === undefined || e.pointerId === activePtrId)) {
            activePtrId = null;
            onRelease();
            btn.classList.remove('is-active');
        }
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

bindFlightPadButton(
    btnSteerLeftTop,
    () => { keys['ArrowLeft'] = true; ship.turnVal = -1; },
    () => {
        keys['ArrowLeft'] = false;
        if (keys['KeyD'] || keys['ArrowRight']) ship.turnVal = 1;
        else if (!keys['KeyA']) ship.turnVal = 0;
    }
);
bindFlightPadButton(
    btnSteerRightTop,
    () => { keys['ArrowRight'] = true; ship.turnVal = 1; },
    () => {
        keys['ArrowRight'] = false;
        if (keys['KeyA'] || keys['ArrowLeft']) ship.turnVal = -1;
        else if (!keys['KeyD']) ship.turnVal = 0;
    }
);
bindFlightPadButton(
    btnSteerLeft,
    () => { ship.rcsStrafe = -1; },
    () => { if (ship.rcsStrafe === -1) ship.rcsStrafe = 0; }
);
bindFlightPadButton(
    btnSteerRight,
    () => { ship.rcsStrafe = 1; },
    () => { if (ship.rcsStrafe === 1) ship.rcsStrafe = 0; }
);
bindFlightPadButton(
    btnThrustUp,
    () => { keys['ArrowUp'] = true; ship.thrusting = true; },
    () => { keys['ArrowUp'] = false; if (!keys['KeyW'] && !keys['Space']) ship.thrusting = false; }
);
bindFlightPadButton(
    btnBrakeDown,
    () => { keys['ArrowDown'] = true; ship.braking = true; },
    () => { keys['ArrowDown'] = false; if (!keys['KeyS']) ship.braking = false; }
);

// Barra Graduable de Potencia de Motores (0% - 100%, compatible multitáctil)
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
        try { throttleTrack.setPointerCapture(e.pointerId); } catch (_) {}
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
    throttleTrack.addEventListener('lostpointercapture', releaseThrottle);
    throttleTrack.addEventListener('contextmenu', (e) => e.preventDefault());
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

// Hiperimpulso Warp directo (clic para alternar o mantener pulsado)
const btnWarp = document.getElementById('btnWarp');
let warpPointerId = null;
let warpDownAt = 0;
let warpWasActiveOnDown = false;
if (btnWarp) {
    btnWarp.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dismissIntro();
        warpPointerId = e.pointerId;
        warpDownAt = performance.now();
        warpWasActiveOnDown = Boolean(ship.warping);
        try { btnWarp.setPointerCapture(e.pointerId); } catch (_) {}
        audio.init();
        ship.warping = true;
    });
    const releaseWarp = (e) => {
        if (e.pointerId === warpPointerId) {
            warpPointerId = null;
            const heldMs = performance.now() - warpDownAt;
            if (heldMs < 240) {
                ship.warping = !warpWasActiveOnDown;
            } else {
                ship.warping = false;
            }
        }
    };
    btnWarp.addEventListener('pointerup', releaseWarp);
    btnWarp.addEventListener('pointercancel', releaseWarp);
    btnWarp.addEventListener('lostpointercapture', releaseWarp);
    btnWarp.addEventListener('contextmenu', (e) => e.preventDefault());
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

    // Encender / apagar todas las luces del cohete con tecla L
    if (e.code === 'KeyL') {
        const bldModal = document.getElementById('rocketBuilderModal');
        if (!bldModal || bldModal.classList.contains('hidden')) {
            if (typeof LightingEngine !== 'undefined' && LightingEngine.toggleAllRocketLights()) {
                e.preventDefault();
                return;
            }
        }
    }

    if (e.code === 'Escape') {
        if (typeof ColonyBuildings !== 'undefined' && ColonyBuildings.placementMode) {
            ColonyBuildings.exitPlacementMode();
            return;
        }
        const colInsp = document.getElementById('colonyInspectorPanel');
        if (colInsp && !colInsp.classList.contains('hidden')) {
            if (typeof closeColonyInspector === 'function') closeColonyInspector();
            return;
        }
        const colm = document.getElementById('colonyModal');
        if (colm && !colm.classList.contains('hidden')) {
            if (typeof closeColonyModal === 'function') closeColonyModal();
            return;
        }
        if (typeof LightingEngine !== 'undefined') {
            if (LightingEngine.isPlacementMode()) {
                LightingEngine.exitPlacementMode();
                return;
            }
            const lightPanel = document.getElementById('lightInspectorPanel');
            if (lightPanel && !lightPanel.classList.contains('hidden')) {
                LightingEngine.closeLightInspector();
                return;
            }
            const evaLightMod = document.getElementById('evaLightingModal');
            if (evaLightMod && !evaLightMod.classList.contains('hidden')) {
                evaLightMod.classList.add('hidden');
                return;
            }
        }
        if (typeof closeAllHudDropdowns === 'function') closeAllHudDropdowns();
        const extm = document.getElementById('extractorModal');
        if (extm && !extm.classList.contains('hidden')) {
            if (typeof closeExtractorModal === 'function') closeExtractorModal();
            else extm.classList.add('hidden');
            return;
        }
        const invm = document.getElementById('resourceInventoryModal');
        if (invm && !invm.classList.contains('hidden')) {
            if (typeof closeResourceInventoryModal === 'function') closeResourceInventoryModal();
            else invm.classList.add('hidden');
            return;
        }
    }

    if (e.code === 'KeyI') {
        e.preventDefault();
        if (typeof toggleResourceInventoryModal === 'function') toggleResourceInventoryModal();
        return;
    }

    if (e.code === 'KeyB') {
        e.preventDefault();
        if (typeof toggleColonyModal === 'function') toggleColonyModal();
        return;
    }

    // Modo EVA a pie
    if (typeof astronaut !== 'undefined' && astronaut.active) {
        if (e.code === 'KeyC') {
            e.preventDefault();
            return;
        }
        if (e.code === 'KeyG') {
            e.preventDefault();
            if (!e.repeat) astronaut.autoDeployExtractor = true;
            return;
        }
        if (e.code === 'KeyU') {
            e.preventDefault();
            if (!e.repeat) astronaut.autoRefuelShip = !astronaut.autoRefuelShip;
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
        const wcm = document.getElementById('worldCategoriesModal');
        if (wcm && !wcm.classList.contains('hidden')) {
            if (typeof closeWorldCategoriesModal === 'function') closeWorldCategoriesModal();
            else wcm.classList.add('hidden');
            return;
        }
        const mm = document.getElementById('mapModal');
        if (mm && !mm.classList.contains('hidden')) {
            if (typeof closeMapModal === 'function') closeMapModal();
            else mm.classList.add('hidden');
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

// Botón táctil / ratón para abrir informe del Extractor cercano en EVA
const btnEvaInspectExtractor = document.getElementById('btnEvaInspectExtractor');
if (btnEvaInspectExtractor) {
    btnEvaInspectExtractor.addEventListener('click', () => {
        audio.init();
        if (window._nearbyExtractorId && typeof openExtractorModal === 'function') {
            openExtractorModal(window._nearbyExtractorId);
        }
    });
}

// Controles táctiles de movimiento en superficie EVA (Móvil / Tablet, multitáctil por pointerId)
function bindEvaTouchHold(btnId, keyCode) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    let activePtrId = null;
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        activePtrId = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch (_) {}
        keys[keyCode] = true;
        btn.classList.add('is-active');
        audio.init();
    });
    const release = (e) => {
        if (activePtrId !== null && (e.pointerId === undefined || e.pointerId === activePtrId)) {
            activePtrId = null;
            keys[keyCode] = false;
            btn.classList.remove('is-active');
        }
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
}
bindEvaTouchHold('btnEvaTouchLeft', 'KeyA');
bindEvaTouchHold('btnEvaTouchRight', 'KeyD');
bindEvaTouchHold('btnEvaTouchJump', 'Space');

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
const bindBuildBaseHold = (btn) => {
    if (!btn) return;
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.setPointerCapture(e.pointerId);
        if (typeof astronaut !== 'undefined') {
            astronaut.isHoldingBuildBtn = true;
        }
        keys['KeyC'] = true;
        audio.init();
    });
    const releaseBuild = () => {
        if (typeof astronaut !== 'undefined') {
            astronaut.isHoldingBuildBtn = false;
        }
        keys['KeyC'] = false;
    };
    btn.addEventListener('pointerup', releaseBuild);
    btn.addEventListener('pointercancel', releaseBuild);
};
bindBuildBaseHold(document.getElementById('btnEvaBuildBase'));
bindBuildBaseHold(document.getElementById('btnEvaUpgradeBase'));

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

// Botón Desplegar Extractor de Recursos (G) - clic rápido o mantener pulsado
const btnEvaDeployExtractor = document.getElementById('btnEvaDeployExtractor');
if (btnEvaDeployExtractor) {
    let extPressDownAt = 0;
    btnEvaDeployExtractor.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        extPressDownAt = performance.now();
        btnEvaDeployExtractor.setPointerCapture(e.pointerId);
        audio.init();
        if (typeof astronaut !== 'undefined') astronaut.isHoldingExtractorBtn = true;
    });
    const releaseDeployExt = () => {
        if (typeof astronaut !== 'undefined') {
            astronaut.isHoldingExtractorBtn = false;
            if (performance.now() - extPressDownAt < 450 && astronaut.actionProgress < 1.0) {
                astronaut.autoDeployExtractor = true;
            }
        }
    };
    btnEvaDeployExtractor.addEventListener('pointerup', releaseDeployExt);
    btnEvaDeployExtractor.addEventListener('pointercancel', releaseDeployExt);
}

// Botón Repostar Cohete desde Reserva EVA (U) - clic rápido o mantener pulsado
const btnEvaRefuelShip = document.getElementById('btnEvaRefuelShip');
if (btnEvaRefuelShip) {
    let refuelPressDownAt = 0;
    btnEvaRefuelShip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        refuelPressDownAt = performance.now();
        btnEvaRefuelShip.setPointerCapture(e.pointerId);
        audio.init();
        if (typeof astronaut !== 'undefined') astronaut.isHoldingRefuelBtn = true;
    });
    const releaseRefuelBtn = () => {
        if (typeof astronaut !== 'undefined') {
            astronaut.isHoldingRefuelBtn = false;
            if (performance.now() - refuelPressDownAt < 350) {
                astronaut.autoRefuelShip = !astronaut.autoRefuelShip;
            }
        }
    };
    btnEvaRefuelShip.addEventListener('pointerup', releaseRefuelBtn);
    btnEvaRefuelShip.addEventListener('pointercancel', releaseRefuelBtn);
}

// Botones y Modales de Extractor e Inventario de Recursos
['btnEvaResources', 'btnEvaReserveQuick', 'btnHudReservePill', 'btnHudResources'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', () => {
            if (typeof closeAllHudDropdowns === 'function') closeAllHudDropdowns();
            if (typeof toggleResourceInventoryModal === 'function') toggleResourceInventoryModal();
        });
    }
});

const btnCloseExtractorModal = document.getElementById('btnCloseExtractorModal');
if (btnCloseExtractorModal) {
    btnCloseExtractorModal.addEventListener('click', () => {
        if (typeof closeExtractorModal === 'function') closeExtractorModal();
    });
}
const btnCloseResourceInventoryModal = document.getElementById('btnCloseResourceInventoryModal');
if (btnCloseResourceInventoryModal) {
    btnCloseResourceInventoryModal.addEventListener('click', () => {
        if (typeof closeResourceInventoryModal === 'function') closeResourceInventoryModal();
    });
}
const btnExtCollect = document.getElementById('btnExtCollect');
if (btnExtCollect) {
    btnExtCollect.addEventListener('click', () => {
        if (typeof planetaryExtractors === 'undefined' || typeof selectedExtractorId === 'undefined') return;
        const m = planetaryExtractors.find(e => e.id === selectedExtractorId);
        if (m && typeof collectFromExtractor === 'function') {
            collectFromExtractor(m);
            if (typeof renderExtractorModal === 'function') renderExtractorModal();
        }
    });
}
const btnExtDismantle = document.getElementById('btnExtDismantle');
if (btnExtDismantle) {
    btnExtDismantle.addEventListener('click', () => {
        if (typeof planetaryExtractors === 'undefined' || typeof selectedExtractorId === 'undefined') return;
        const m = planetaryExtractors.find(e => e.id === selectedExtractorId);
        if (m && typeof dismantleExtractor === 'function') {
            dismantleExtractor(m);
        }
    });
}
const btnInvApplyFuelToRocket = document.getElementById('btnInvApplyFuelToRocket');
if (btnInvApplyFuelToRocket) {
    btnInvApplyFuelToRocket.addEventListener('click', () => {
        if (typeof transferFuelReserveToRocket === 'function') {
            const added = transferFuelReserveToRocket(Infinity);
            if (added > 0.05) {
                sfx('playResourceCollect');
                if (typeof renderResourceInventoryModal === 'function') renderResourceInventoryModal();
            }
        }
    });
}
const btnInvRepairHull = document.getElementById('btnInvRepairHull');
if (btnInvRepairHull) {
    btnInvRepairHull.addEventListener('click', () => {
        if (typeof repairRocketWithMaterials === 'function' && repairRocketWithMaterials()) {
            if (typeof renderResourceInventoryModal === 'function') renderResourceInventoryModal();
        }
    });
}

// Bodega del Cohete: transferencia masiva Traje <-> Cohete
const btnInvAllToRocket = document.getElementById('btnInvAllToRocket');
if (btnInvAllToRocket) {
    btnInvAllToRocket.addEventListener('click', () => {
        if (typeof transferAllSuitToRocket === 'function') {
            transferAllSuitToRocket();
            if (typeof renderResourceInventoryModal === 'function') renderResourceInventoryModal();
        }
    });
}
const btnInvAllToSuit = document.getElementById('btnInvAllToSuit');
if (btnInvAllToSuit) {
    btnInvAllToSuit.addEventListener('click', () => {
        if (typeof transferAllRocketToSuit === 'function') {
            transferAllRocketToSuit();
            if (typeof renderResourceInventoryModal === 'function') renderResourceInventoryModal();
        }
    });
}

// Sistema de Colonia: Viviendas, Depósitos y Astronautas
['btnHudColony', 'btnEvaOpenColony'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', () => {
            if (typeof closeAllHudDropdowns === 'function') closeAllHudDropdowns();
            if (typeof toggleColonyModal === 'function') toggleColonyModal();
        });
    }
});
const btnCloseColonyModal = document.getElementById('btnCloseColonyModal');
if (btnCloseColonyModal) {
    btnCloseColonyModal.addEventListener('click', () => {
        if (typeof closeColonyModal === 'function') closeColonyModal();
    });
}
const btnCancelColonyPlacement = document.getElementById('btnCancelColonyPlacement');
if (btnCancelColonyPlacement) {
    btnCancelColonyPlacement.addEventListener('click', () => {
        if (typeof ColonyBuildings !== 'undefined') ColonyBuildings.exitPlacementMode();
    });
}
const btnCloseColonyInspector = document.getElementById('btnCloseColonyInspector');
if (btnCloseColonyInspector) {
    btnCloseColonyInspector.addEventListener('click', () => {
        if (typeof closeColonyInspector === 'function') closeColonyInspector();
    });
}
['houses', 'depots', 'colonists'].forEach(t => {
    const tabBtn = document.getElementById(`tabColony_${t}`);
    if (tabBtn) {
        tabBtn.addEventListener('click', () => {
            if (typeof openColonyModal === 'function') openColonyModal(t);
        });
    }
});
const bindBulk = (id, mode) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => {
        if (typeof assignBulkColonyJob === 'function') assignBulkColonyJob(mode);
    });
};
bindBulk('btnColonyBulkBalanced', 'balanced');
bindBulk('btnColonyBulkLogistics', 'logistics_all');
bindBulk('btnColonyBulkRocket', 'refuel_rockets');
bindBulk('btnColonyBulkIdle', 'idle');

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

const btnEmergencyRescue = document.getElementById('btnEmergencyRescue');
if (btnEmergencyRescue) {
    btnEmergencyRescue.addEventListener('click', () => {
        if (typeof closeAllHudDropdowns === 'function') closeAllHudDropdowns();
        resetOrigin();
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

// --- CONTROL DE ACELERACIÓN TEMPORAL (2 FLECHAS) Y MENÚ DE SISTEMAS ---
const TIME_WARP_LEVELS = [1, 2, 4, 8, 16, 32, 64];
let timeScale = 1;

function setTimeScale(newScale) {
    if (!TIME_WARP_LEVELS.includes(newScale)) newScale = 1;
    timeScale = newScale;

    const label = document.getElementById('uiTimeWarpLabel');
    const control = document.getElementById('timeWarpControl');
    const btnSlower = document.getElementById('btnTimeSlower');
    const btnFaster = document.getElementById('btnTimeFaster');

    if (label) {
        label.textContent = `${timeScale}×`;
        label.className = timeScale > 1 ? 'text-amber-300 font-bold' : 'text-stone-200';
    }
    if (control) {
        control.classList.toggle('time-warp-active-pill', timeScale > 1);
    }
    if (btnSlower) btnSlower.disabled = timeScale <= 1;
    if (btnFaster) btnFaster.disabled = timeScale >= TIME_WARP_LEVELS[TIME_WARP_LEVELS.length - 1];
}

function stepTimeScale(dir) {
    const idx = TIME_WARP_LEVELS.indexOf(timeScale);
    const nextIdx = clamp((idx === -1 ? 0 : idx) + dir, 0, TIME_WARP_LEVELS.length - 1);
    setTimeScale(TIME_WARP_LEVELS[nextIdx]);
}

const btnTimeSlower = document.getElementById('btnTimeSlower');
const btnTimeFaster = document.getElementById('btnTimeFaster');
const btnTimeWarpReset = document.getElementById('btnTimeWarpReset');
const btnSystemsMenu = document.getElementById('btnSystemsMenu');
const systemsDropdown = document.getElementById('systemsDropdown');
const worldObjectMenu = document.getElementById('worldObjectMenu');
let worldMenuOpenedAt = 0;

function closeWorldObjectMenu() {
    if (worldObjectMenu) worldObjectMenu.classList.add('hidden');
}

function openWorldObjectMenu(kind, clientX, clientY) {
    if (!worldObjectMenu) return;
    closeAllHudDropdowns();

    const titleEl = document.getElementById('worldMenuTitle');
    const hullBox = document.getElementById('worldMenuRocketHullBox');
    const gFlight = document.getElementById('worldMenuFlightGroup');
    const gEvaRocket = document.getElementById('worldMenuEvaRocketGroup');
    const gEvaAstro = document.getElementById('worldMenuEvaAstroGroup');
    const gBase = document.getElementById('worldMenuBaseGroup');

    const isRocketMenu = (kind === 'flight_rocket' || kind === 'eva_rocket');
    if (hullBox) hullBox.classList.toggle('hidden', !isRocketMenu);
    if (gFlight) gFlight.classList.toggle('hidden', kind !== 'flight_rocket');
    if (gEvaRocket) gEvaRocket.classList.toggle('hidden', kind !== 'eva_rocket');
    if (gEvaAstro) gEvaAstro.classList.toggle('hidden', kind !== 'astro');
    if (gBase) gBase.classList.toggle('hidden', kind !== 'base');

    if (isRocketMenu && typeof updateWorldMenuHullInfo === 'function') {
        updateWorldMenuHullInfo();
    }

    if (titleEl) {
        if (kind === 'flight_rocket' || kind === 'eva_rocket') {
            const m = (typeof getRocketModel === 'function') ? getRocketModel(ship.modelId || 'starship') : null;
            titleEl.textContent = m ? m.name.toUpperCase() : 'COHETE';
        } else if (kind === 'astro') {
            titleEl.textContent = 'ASTRONAUTA · CONSTRUCCIÓN';
        } else if (kind === 'base') {
            titleEl.textContent = 'BASE PLANETARIA';
        }
    }

    worldObjectMenu.classList.remove('hidden');
    const mw = worldObjectMenu.offsetWidth || 225;
    const mh = worldObjectMenu.offsetHeight || 200;
    const px = clamp(clientX - mw * 0.5, 10, window.innerWidth - mw - 10);
    const py = clamp(clientY - mh - 14, 56, window.innerHeight - mh - 76);
    worldObjectMenu.style.left = `${Math.round(px)}px`;
    worldObjectMenu.style.top = `${Math.round(py)}px`;
    worldMenuOpenedAt = performance.now();
}

function handleWorldObjectClick(worldX, worldY, clientX, clientY) {
    const z = Math.max(0.25, camera.zoom || 1);
    const isEva = Boolean(typeof astronaut !== 'undefined' && astronaut.active);

    if (isEva) {
        if (Math.hypot(worldX - astronaut.x, worldY - astronaut.y) < 34 / z) {
            openWorldObjectMenu('astro', clientX, clientY);
            return true;
        }
        if (Math.hypot(worldX - ship.x, worldY - ship.y) < 50 / z) {
            openWorldObjectMenu('eva_rocket', clientX, clientY);
            return true;
        }
        if (typeof nearestPlanet !== 'undefined' && nearestPlanet && Array.isArray(nearestPlanet.bases)) {
            for (let i = 0; i < nearestPlanet.bases.length; i++) {
                const b = nearestPlanet.bases[i];
                const bx = nearestPlanet.x + Math.cos(b.angle) * (b.radius || nearestPlanet.radius);
                const by = nearestPlanet.y + Math.sin(b.angle) * (b.radius || nearestPlanet.radius);
                if (Math.hypot(worldX - bx, worldY - by) < 55 / z) {
                    openWorldObjectMenu('base', clientX, clientY);
                    return true;
                }
            }
        }
    } else {
        if (Math.hypot(worldX - ship.x, worldY - ship.y) < 50 / z) {
            openWorldObjectMenu('flight_rocket', clientX, clientY);
            return true;
        }
    }
    return false;
}

function closeAllHudDropdowns() {
    if (systemsDropdown) systemsDropdown.classList.add('hidden');
    closeWorldObjectMenu();
}

if (btnTimeSlower) btnTimeSlower.addEventListener('click', () => stepTimeScale(-1));
if (btnTimeFaster) btnTimeFaster.addEventListener('click', () => stepTimeScale(1));
if (btnTimeWarpReset) btnTimeWarpReset.addEventListener('click', () => setTimeScale(1));
setTimeScale(1);

if (btnSystemsMenu && systemsDropdown) {
    btnSystemsMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = systemsDropdown.classList.contains('hidden');
        closeAllHudDropdowns();
        if (willOpen) systemsDropdown.classList.remove('hidden');
    });
    systemsDropdown.addEventListener('click', (e) => e.stopPropagation());
}

const btnToggleInfiniteFuel = document.getElementById('btnToggleInfiniteFuel');
function syncInfiniteFuelUI() {
    const active = !!ship.infiniteFuel;
    if (!btnToggleInfiniteFuel) return;
    btnToggleInfiniteFuel.setAttribute('aria-checked', active ? 'true' : 'false');
    const track = document.getElementById('infiniteFuelTrack');
    const thumb = document.getElementById('infiniteFuelThumb');
    if (track) {
        track.className = active
            ? 'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-emerald-500/80 border border-emerald-300/60 shadow-[0_0_10px_rgba(16,185,129,0.45)] transition-all duration-200'
            : 'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-white/15 border border-white/15 transition-all duration-200';
    }
    if (thumb) {
        thumb.className = active
            ? 'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 translate-x-4'
            : 'inline-block h-3.5 w-3.5 rounded-full bg-stone-300 shadow transition-transform duration-200 translate-x-0.5';
    }
}
try {
    ship.infiniteFuel = localStorage.getItem('eter_infinite_fuel_v1') === '1';
} catch (e) {
    ship.infiniteFuel = false;
}
syncInfiniteFuelUI();
if (btnToggleInfiniteFuel) {
    btnToggleInfiniteFuel.addEventListener('click', () => {
        ship.infiniteFuel = !ship.infiniteFuel;
        try {
            localStorage.setItem('eter_infinite_fuel_v1', ship.infiniteFuel ? '1' : '0');
        } catch (e) {}
        syncInfiniteFuelUI();
        if (typeof audio !== 'undefined' && audio && typeof audio.playChime === 'function') {
            audio.init();
            audio.playChime();
        }
    });
}

const btnWorldCategories = document.getElementById('btnWorldCategories');
if (btnWorldCategories) {
    btnWorldCategories.addEventListener('click', () => {
        closeAllHudDropdowns();
        if (typeof openWorldCategoriesModal === 'function') openWorldCategoriesModal();
    });
}
const btnCloseWorldCategoriesModal = document.getElementById('btnCloseWorldCategoriesModal');
if (btnCloseWorldCategoriesModal) {
    btnCloseWorldCategoriesModal.addEventListener('click', () => {
        if (typeof closeWorldCategoriesModal === 'function') closeWorldCategoriesModal();
    });
}
const worldCategoriesModalEl = document.getElementById('worldCategoriesModal');
if (worldCategoriesModalEl) {
    worldCategoriesModalEl.addEventListener('click', (e) => {
        if (e.target === worldCategoriesModalEl && typeof closeWorldCategoriesModal === 'function') {
            closeWorldCategoriesModal();
        }
    });
}

if (worldObjectMenu) {
    worldObjectMenu.addEventListener('click', (e) => e.stopPropagation());
    worldObjectMenu.addEventListener('pointerdown', (e) => e.stopPropagation());
}

const btnCloseWorldObjectMenu = document.getElementById('btnCloseWorldObjectMenu');
if (btnCloseWorldObjectMenu) {
    btnCloseWorldObjectMenu.addEventListener('click', () => closeWorldObjectMenu());
}

const btnEvaWorldMenuQuick = document.getElementById('btnEvaWorldMenuQuick');
if (btnEvaWorldMenuQuick) {
    btnEvaWorldMenuQuick.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = worldObjectMenu && !worldObjectMenu.classList.contains('hidden') && !document.getElementById('worldMenuEvaAstroGroup')?.classList.contains('hidden');
        if (isOpen) {
            closeWorldObjectMenu();
        } else {
            const rect = btnEvaWorldMenuQuick.getBoundingClientRect();
            openWorldObjectMenu('astro', rect.left + rect.width * 0.5, rect.top);
        }
    });
}

['btnWorldResources', 'btnWorldOpenVab', 'btnBaseOpenHangar', 'btnBaseOpenVab'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
        closeWorldObjectMenu();
        if (id === 'btnWorldResources' && typeof toggleResourceInventoryModal === 'function') toggleResourceInventoryModal();
        if ((id === 'btnWorldOpenVab' || id === 'btnBaseOpenVab') && typeof openRocketBuilder === 'function') openRocketBuilder();
        if (id === 'btnBaseOpenHangar' && typeof openRocketHangarModal === 'function') openRocketHangarModal();
    });
});

const btnReturnToIntro = document.getElementById('btnReturnToIntro');
if (btnReturnToIntro) {
    btnReturnToIntro.addEventListener('click', () => {
        closeAllHudDropdowns();
        showIntroScreen();
    });
}

// Cerrar menús al hacer clic fuera o abrir un modal
document.addEventListener('click', () => {
    if (performance.now() - worldMenuOpenedAt < 350) return;
    closeAllHudDropdowns();
});
['btnOpenBuilderHUD', 'btnOpenMap', 'btnQuickSaveHUD', 'btnHudResources'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => closeAllHudDropdowns());
});

// Bucle Principal de Animación con Sub-pasos para Aceleración Temporal
let lastTime = performance.now();
let _loopErrorLogged = false;
let _consecutiveLoopErrors = 0;

function selfHealSimulationState(level) {
    try {
        if (typeof astronaut !== 'undefined') astronaut.active = false;
        if (typeof disengageOrbitMode === 'function') disengageOrbitMode(true);
        if (typeof resetOrigin === 'function') resetOrigin();
        if (level >= 2 && typeof ship !== 'undefined') {
            ship.customRocket = null;
            ship.modelKey = 'vesper';
            if (typeof applyRocketModel === 'function') applyRocketModel(ship, 'vesper');
            if (typeof parkedShips !== 'undefined') parkedShips.length = 0;
            if (typeof freeVessels !== 'undefined') freeVessels.length = 0;
        }
    } catch (_) {}
}

function loop(now) {
    requestAnimationFrame(loop);

    const rawDt = Math.min(0.04, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    try {
        if (typeof canvas !== 'undefined' && (canvas.width <= 0 || canvas.height <= 0) && typeof resize === 'function') {
            resize();
        }
        // Autosanación silenciosa si alguna coordenada o zoom perdiera finitud
        if (typeof ship !== 'undefined' && (!Number.isFinite(ship.x) || !Number.isFinite(ship.y) || !Number.isFinite(ship.angle))) {
            if (typeof resetOrigin === 'function') resetOrigin();
        }
        if (typeof camera !== 'undefined' && (!Number.isFinite(camera.x) || !Number.isFinite(camera.y) || !Number.isFinite(camera.zoom) || camera.zoom <= 0 || !Number.isFinite(camera.rotation))) {
            if (typeof ship !== 'undefined' && Number.isFinite(ship.x) && Number.isFinite(ship.y)) {
                camera.x = ship.x;
                camera.y = ship.y;
            }
            camera.zoom = 1.0;
            camera.targetZoom = 1.0;
            camera.rotation = 0;
            camera.targetRotation = 0;
            camera.userZoomMult = 1.0;
        }

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
        if (typeof ctx !== 'undefined' && ctx.save) ctx.save();
        try {
            render(typeof cosmosSimTime !== 'undefined' ? cosmosSimTime : (now / 1000));
        } finally {
            if (typeof ctx !== 'undefined' && ctx.restore) ctx.restore();
        }
        _consecutiveLoopErrors = 0;
    } catch (err) {
        _consecutiveLoopErrors++;
        if (!_loopErrorLogged) {
            _loopErrorLogged = true;
            console.error('ÉTER Error en bucle de simulación:', err);
        }
        if (_consecutiveLoopErrors === 3) {
            selfHealSimulationState(1);
        } else if (_consecutiveLoopErrors >= 6) {
            selfHealSimulationState(2);
            _consecutiveLoopErrors = 0;
        }
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
            const match = window.location.search.match(/archetype=([a-z0-9_]+)/);
            if (match) {
                const targetArchId = match[1];
                const nearby = getNearbyPlanets(0, 0, 8);
                let targetPlanet = nearby.find(p => p.archetype && p.archetype.id === targetArchId);
                if (!targetPlanet && typeof ARCHETYPES !== 'undefined') {
                    const archDef = ARCHETYPES.find(a => a.id === targetArchId);
                    if (archDef) {
                        window._forcePlanetArchetypeId = targetArchId;
                        sectors.delete('12,12');
                        const genList = getSectorPlanets(12, 12);
                        window._forcePlanetArchetypeId = null;
                        if (genList && genList.length > 0) targetPlanet = genList[0];
                    }
                }
                if (targetPlanet) {
                    const spawnAng = (targetPlanet.isHollow && targetPlanet.caveEntrances && targetPlanet.caveEntrances.length > 0)
                        ? targetPlanet.caveEntrances[0].centerAngle
                        : -Math.PI / 2;
                    const spawnR = (targetPlanet.maxSurfaceRadius || targetPlanet.radius) + 320;
                    ship.x = targetPlanet.x + Math.cos(spawnAng) * spawnR;
                    ship.y = targetPlanet.y + Math.sin(spawnAng) * spawnR;
                    ship.angle = spawnAng;
                    ship.vx = 0;
                    ship.vy = 0;
                    ship.isGrounded = false;
                    camera.x = ship.x;
                    camera.y = ship.y;
                    camera.rotation = -Math.PI / 2 - spawnAng;
                    camera.userZoomMult = 0.25;
                    camera.zoom = 0.25;
                    camera.targetZoom = 0.25;
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
