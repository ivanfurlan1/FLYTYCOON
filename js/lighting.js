/**
 * ÉTER — Sistema Avanzado de Iluminación Dinámica Eficiente (Motor Fotométrico 2D)
 * ---------------------------------------------------------------------------------
 * - Luces simples de superficie (3 variantes: Foco Compacto, Proyector Mediano, Reflector Súper Potente)
 * - Torres de celosía de hierro (3 variantes: Torre Mediana, Torre Alta, Torre Colosal Muy Alta)
 * - Luces modulares integradas en cohetes del Taller VAB (compiladas y controlables en vuelo)
 * - Iluminación realista sobre:
 *   1. Superficie del terreno (Ley de Lambert con pendiente topográfica, sombras por oclusión de relieve,
 *      revelado de albedo nocturno, reflejo en lagos y cordilleras cercanas)
 *   2. Cohetes (preset y personalizados VAB: revelado direccional de casco y brillo especular)
 *   3. Neblinas y nieblas (dispersión volumétrica Tyndall/Mie)
 *   4. Nubes planetarias (iluminación inferior/volumétrica y bloom de haz)
 *   5. Humo de lanzamiento del cohete y astronauta EVA
 * - Arquitectura de alto rendimiento: culling frustum por frame, rechazo AABB O(1),
 *   cero asignaciones en bucle interno de partículas y caché de sprites de corona.
 */

const planetaryLights = [];

const LIGHT_COLOR_PALETTE = [
    { id: 'xenon',   name: 'Blanco Xenón',    hex: '#f4f8ff', rgb: [244, 248, 255] },
    { id: 'warm',    name: 'Halógeno Cálido', hex: '#ffdfb0', rgb: [255, 223, 176] },
    { id: 'amber',   name: 'Sodio Ámbar',     hex: '#fbbf24', rgb: [251, 191, 36] },
    { id: 'cyan',    name: 'Cian Astral',     hex: '#38bdf8', rgb: [56, 189, 248] },
    { id: 'emerald', name: 'Esmeralda',       hex: '#34d399', rgb: [52, 211, 153] },
    { id: 'crimson', name: 'Rojo Táctico',    hex: '#fb7185', rgb: [251, 113, 133] }
];

const LIGHT_PRESETS = {
    // --- LUCES SIMPLES DE SUPERFICIE (3 VARIANTES) ---
    simple_low: {
        id: 'simple_low',
        kind: 'simple',
        tier: 1,
        name: 'Foco Compacto',
        shortName: 'Baja',
        desc: 'Luz portátil de corto alcance ideal para señalizar la zona de aterrizaje.',
        height: 9,
        baseWidth: 10,
        headWidth: 7.5,
        baseRange: 235,
        defaultIntensity: 0.78,
        defaultSpreadDeg: 54,
        defaultAimDeg: 0,
        defaultColor: '#ffe6b8'
    },
    simple_med: {
        id: 'simple_med',
        kind: 'simple',
        tier: 2,
        name: 'Proyector Mediano',
        shortName: 'Mediana',
        desc: 'Trípode reforzado con reflector dual de alcance medio.',
        height: 14,
        baseWidth: 14,
        headWidth: 10,
        baseRange: 500,
        defaultIntensity: 1.05,
        defaultSpreadDeg: 44,
        defaultAimDeg: 0,
        defaultColor: '#eef6ff'
    },
    simple_high: {
        id: 'simple_high',
        kind: 'simple',
        tier: 3,
        name: 'Reflector Súper Potente',
        shortName: 'Súper',
        desc: 'Cañón de luz Xenón de largo alcance capaz de iluminar nubes altas y cohetes en ascenso.',
        height: 19,
        baseWidth: 18,
        headWidth: 14,
        baseRange: 1220,
        defaultIntensity: 1.45,
        defaultSpreadDeg: 26,
        defaultAimDeg: 0,
        defaultColor: '#eef6ff'
    },

    // --- TORRES DE CELOSÍA DE HIERRO (3 VARIANTES) ---
    tower_med: {
        id: 'tower_med',
        kind: 'tower',
        tier: 1,
        name: 'Torre de Luz Mediana',
        shortName: 'T. Mediana',
        desc: 'Estructura reticulada de hierro con doble reflector elevado.',
        height: 60,
        baseWidth: 15,
        topWidth: 6.5,
        bays: 4,
        headWidth: 12,
        baseRange: 580,
        defaultIntensity: 1.15,
        defaultSpreadDeg: 60,
        defaultAimDeg: 118,
        defaultColor: '#ffe6b8'
    },
    tower_tall: {
        id: 'tower_tall',
        kind: 'tower',
        tier: 2,
        name: 'Torre de Luz Alta',
        shortName: 'T. Alta',
        desc: 'Torre de acero alta con pasarela de servicio y batería triple de proyectores.',
        height: 112,
        baseWidth: 21,
        topWidth: 8,
        bays: 7,
        headWidth: 15,
        baseRange: 960,
        defaultIntensity: 1.38,
        defaultSpreadDeg: 54,
        defaultAimDeg: 118,
        defaultColor: '#eef6ff'
    },
    tower_mega: {
        id: 'tower_mega',
        kind: 'tower',
        tier: 3,
        name: 'Torre Colosal (Muy Alta)',
        shortName: 'T. Muy Alta',
        desc: 'Mástil industrial gigante de hierro con matriz cuádruple de ultra potencia para plataformas completas.',
        height: 182,
        baseWidth: 28,
        topWidth: 10,
        bays: 11,
        headWidth: 19,
        baseRange: 1550,
        defaultIntensity: 1.65,
        defaultSpreadDeg: 50,
        defaultAimDeg: 116,
        defaultColor: '#eef6ff'
    }
};

function lightClamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
}

function lightLerp(a, b, t) {
    return a + (b - a) * t;
}

function lightSmoothstep(e0, e1, x) {
    const t = lightClamp((x - e0) / (e1 - e0 || 1), 0, 1);
    return t * t * (3 - 2 * t);
}

function lightWrapAngle(a) {
    return Math.atan2(Math.sin(a), Math.cos(a));
}

function hexToRgbTuple(hex) {
    if (!hex || typeof hex !== 'string') return [238, 246, 255];
    let clean = hex.trim().replace('#', '');
    if (clean.length === 3) {
        clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    if (clean.length !== 6) return [238, 246, 255];
    const num = parseInt(clean, 16);
    if (Number.isNaN(num)) return [238, 246, 255];
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbTupleToHex(rgb) {
    if (!rgb || rgb.length < 3) return '#eef6ff';
    const toHex = (n) => lightClamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
    return '#' + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
}

const _lightCoronaCache = new Map();
function getLightCoronaSprite(rgb) {
    const qr = Math.min(255, Math.max(0, Math.round(rgb[0] / 8) * 8));
    const qg = Math.min(255, Math.max(0, Math.round(rgb[1] / 8) * 8));
    const qb = Math.min(255, Math.max(0, Math.round(rgb[2] / 8) * 8));
    const key = `${qr}_${qg}_${qb}`;
    let sp = _lightCoronaCache.get(key);
    if (sp) return sp;
    if (_lightCoronaCache.size >= 48) {
        _lightCoronaCache.delete(_lightCoronaCache.keys().next().value);
    }

    const size = 96;
    const half = 48;
    sp = document.createElement('canvas');
    sp.width = size;
    sp.height = size;
    const sctx = sp.getContext('2d');

    const g = sctx.createRadialGradient(half, half, 1, half, half, half - 2);
    g.addColorStop(0.00, 'rgba(255, 255, 255, 0.96)');
    g.addColorStop(0.16, `rgba(${qr}, ${qg}, ${qb}, 0.76)`);
    g.addColorStop(0.45, `rgba(${qr}, ${qg}, ${qb}, 0.24)`);
    g.addColorStop(0.78, `rgba(${qr}, ${qg}, ${qb}, 0.05)`);
    g.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = g;
    sctx.beginPath();
    sctx.arc(half, half, half - 2, 0, Math.PI * 2);
    sctx.fill();

    _lightCoronaCache.set(key, sp);
    return sp;
}

const _beamTextureCache = new Map();
/**
 * Pre-genera una textura volumétrica 2D suave por píxel (degradado gaussiano angular + atenuación axial)
 * con fidelidad cromática exacta (sin desbordamiento de canal) y garganta óptica suave en la lente.
 */
function getBeamTextureSprite(spreadDeg, rgb) {
    const qSpread = lightClamp(Math.round(spreadDeg / 3) * 3, 6, 135);
    const qr = Math.min(255, Math.max(0, Math.round(rgb[0] / 8) * 8));
    const qg = Math.min(255, Math.max(0, Math.round(rgb[1] / 8) * 8));
    const qb = Math.min(255, Math.max(0, Math.round(rgb[2] / 8) * 8));
    const key = `${qSpread}_${qr}_${qg}_${qb}`;

    let cached = _beamTextureCache.get(key);
    if (cached) return cached;
    if (_beamTextureCache.size >= 96) {
        _beamTextureCache.delete(_beamTextureCache.keys().next().value);
    }

    const size = 192;
    const halfH = size * 0.5;
    const originX = 14;
    const texLen = size - originX - 4;
    const maxY = halfH - 4;

    const halfSpread = (qSpread * 0.5) * (Math.PI / 180);
    const outerRad = Math.min(Math.PI * 0.49, halfSpread * 1.48 + 0.08);
    const sinOuter = Math.sin(outerRad);

    const canvasEl = document.createElement('canvas');
    canvasEl.width = size;
    canvasEl.height = size;
    const bctx = canvasEl.getContext('2d');
    const img = bctx.createImageData(size, size);
    const data = img.data;

    const coreR = Math.min(255, Math.round(qr * 0.48 + 255 * 0.52));
    const coreG = Math.min(255, Math.round(qg * 0.48 + 255 * 0.52));
    const coreB = Math.min(255, Math.round(qb * 0.48 + 255 * 0.52));

    const angSigma = Math.max(0.055, halfSpread * 0.68);
    const coreSigma = Math.max(0.032, halfSpread * 0.28);

    for (let py = 0; py < size; py++) {
        const ny = ((py - halfH) / maxY) * sinOuter;
        const absNy = Math.abs(ny);
        for (let px = 0; px < size; px++) {
            const nx = (px - originX) / texLen;
            // Estrictamente hacia adelante desde la lente: cero fuga hacia atrás
            if (nx <= 0.0) continue;
            const r = Math.hypot(nx, ny);
            if (r >= 0.99) continue;

            // Vértice óptico pegado a la lente real (0.007) para que el cono nazca fino y fiel al foco
            const theta = Math.atan2(absNy, nx + 0.007);
            const u = theta / outerRad;
            if (u >= 1.0) continue;

            // Atenuación longitudinal suave hasta 0 en el alcance máximo
            const distFade = Math.pow(1.0 - r, 1.55) / (1.0 + r * r * 2.8);
            // Perfil transversal gaussiano unificado (sin cuña interna dura)
            const edgeSmooth = lightSmoothstep(1.0, 0.14, u);
            const bell = Math.exp(-Math.pow(theta / angSigma, 1.85)) * edgeSmooth;
            const coreGlow = Math.exp(-Math.pow(theta / coreSigma, 1.85)) * edgeSmooth;

            // Suave arranque justo en el cristal frontal
            const frontGate = lightSmoothstep(0.0, 0.014, nx);

            const intensity = frontGate * distFade * (bell * 0.72 + coreGlow * 0.24);
            if (intensity <= 0.002) continue;

            const coreMix = lightClamp(coreGlow * (1.0 - r * 0.65), 0, 1);
            const idx = (py * size + px) * 4;
            data[idx]     = Math.round(lightLerp(qr, coreR, coreMix));
            data[idx + 1] = Math.round(lightLerp(qg, coreG, coreMix));
            data[idx + 2] = Math.round(lightLerp(qb, coreB, coreMix));
            data[idx + 3] = Math.min(255, Math.round(lightClamp(intensity, 0, 1) * 255));
        }
    }

    bctx.putImageData(img, 0, 0);
    cached = { canvas: canvasEl, size, originX, texLen, maxY, sinOuter, outerRad };
    _beamTextureCache.set(key, cached);
    return cached;
}

const LightingEngine = (() => {
    const _frameLights = [];
    const _sampleOut = { illum: 0, r: 255, g: 255, b: 255, dirX: 0, dirY: -1 };
    const _rocketOut = {
        ambientLift: 0,
        strength: 0,
        dirX: 0,
        dirY: -1,
        r: 255,
        g: 255,
        b: 255
    };
    const _rayHits = new Float32Array(36);
    const _rayCos = new Float32Array(36);
    const _raySin = new Float32Array(36);
    let _lastTimeSec = 0;

    const state = {
        selectedPresetId: 'simple_med',
        placementMode: false,
        relocateLightId: null,
        selectedRef: null, // { kind: 'surface', lightId } | { kind: 'rocket', shipRef, partId }
        hoveredSurfaceLightId: null,
        draggingAim: false
    };

    function getSurfaceLightHeadPosition(planet, light) {
        const preset = LIGHT_PRESETS[light.presetId] || LIGHT_PRESETS.simple_med;
        const baseR = (typeof getSurfaceRadius === 'function')
            ? getSurfaceRadius(planet, light.angle)
            : planet.radius;
        const dirSign = light.onCeiling ? -1 : 1;
        const hScale = preset.kind === 'tower' ? lightClamp(light.heightScale || 1.0, 0.65, 1.55) : 1.0;
        const effHeight = preset.height * hScale;
        const headR = baseR + dirSign * effHeight;
        const cosA = Math.cos(light.angle);
        const sinA = Math.sin(light.angle);
        return {
            baseR,
            effHeight,
            dirSign,
            baseX: planet.x + cosA * baseR,
            baseY: planet.y + sinA * baseR,
            headX: planet.x + cosA * headR,
            headY: planet.y + sinA * headR,
            zenithAngle: light.onCeiling ? (light.angle + Math.PI) : light.angle
        };
    }

    function pushFrameLight(entry) {
        const camX = (typeof camera !== 'undefined' && camera) ? camera.x : 0;
        const camY = (typeof camera !== 'undefined' && camera) ? camera.y : 0;
        const camZoom = (typeof camera !== 'undefined' && camera && camera.zoom) ? camera.zoom : 1;
        const sW = (typeof screenW !== 'undefined') ? screenW : 1280;
        const sH = (typeof screenH !== 'undefined') ? screenH : 720;
        const viewHalf = (Math.hypot(sW, sH) * 0.5) / Math.max(0.08, camZoom) + 280;

        // Culling frustum rápido con margen del alcance del haz
        if (Math.hypot(entry.wx - camX, entry.wy - camY) > viewHalf + entry.effRange) {
            return;
        }

        const dirX = Math.cos(entry.dir);
        const dirY = Math.sin(entry.dir);
        const halfSpread = lightClamp((entry.spreadDeg * 0.5) * (Math.PI / 180), 0.05, Math.PI * 0.48);
        const outerSpread = Math.min(Math.PI * 0.49, halfSpread * 1.24 + 0.05);

        // AABB ajustado del cono (muestreo de los 3 puntos extremos + origen)
        const r = entry.effRange;
        const p1x = entry.wx + dirX * r;
        const p1y = entry.wy + dirY * r;
        const aL = entry.dir - outerSpread;
        const aR = entry.dir + outerSpread;
        const p2x = entry.wx + Math.cos(aL) * r;
        const p2y = entry.wy + Math.sin(aL) * r;
        const p3x = entry.wx + Math.cos(aR) * r;
        const p3y = entry.wy + Math.sin(aR) * r;

        let minX = Math.min(entry.wx, p1x, p2x, p3x);
        let maxX = Math.max(entry.wx, p1x, p2x, p3x);
        let minY = Math.min(entry.wy, p1y, p2y, p3y);
        let maxY = Math.max(entry.wy, p1y, p2y, p3y);

        // Si el ángulo abarca ejes cardinales dentro del cono, expandir el AABB con seguridad
        if (outerSpread > 0.65) {
            minX = Math.min(minX, entry.wx - r * 0.35);
            maxX = Math.max(maxX, entry.wx + r * 0.35);
            minY = Math.min(minY, entry.wy - r * 0.35);
            maxY = Math.max(maxY, entry.wy + r * 0.35);
        }

        entry.dirX = dirX;
        entry.dirY = dirY;
        entry.halfSpread = halfSpread;
        entry.outerSpread = outerSpread;
        entry.cosInner = Math.cos(halfSpread * 0.65);
        entry.sinInner = Math.sin(halfSpread * 0.65);
        entry.cosOuter = Math.cos(outerSpread);
        entry.sinOuter = Math.sin(outerSpread);
        entry.minX = minX;
        entry.maxX = maxX;
        entry.minY = minY;
        entry.maxY = maxY;

        _frameLights.push(entry);
    }

    function addShipLightsToFrame(s) {
        if (!s || !s.customRocket || !Array.isArray(s.customRocket.lights) || s.customRocket.lights.length === 0) return;
        const sScale = s.scale || 1.0;
        const cosA = Math.cos(s.angle);
        const sinA = Math.sin(s.angle);
        const lights = s.customRocket.lights;

        for (let i = 0; i < lights.length; i++) {
            const rl = lights[i];
            if (!rl || rl.enabled === false) continue;
            const intensity = lightClamp(rl.intensity ?? 1.0, 0.05, 2.5);
            const lx = rl.flightX * sScale;
            const ly = rl.flightY * sScale;
            const wx = s.x + (cosA * lx - sinA * ly);
            const wy = s.y + (sinA * lx + cosA * ly);
            const effRange = (rl.baseRange || 450) * (0.55 + 0.55 * intensity) * Math.max(0.65, Math.sqrt(sScale));

            pushFrameLight({
                kind: 'rocket',
                id: rl.instanceId,
                ownerShip: s,
                planet: s.nearestPlanet || null,
                onCeiling: false,
                wx,
                wy,
                dir: s.angle + (rl.localAngle || 0),
                spreadDeg: lightClamp(rl.spreadDeg ?? 42, 8, 130),
                intensity,
                effRange,
                rgb: rl.rgb || hexToRgbTuple(rl.colorHex || '#eef6ff'),
                headSize: (rl.headSize || 8) * sScale
            });
        }
    }

    function isSurfaceLightActive(planet, lt, timeSec) {
        if (!lt || lt.enabled === false) return false;
        if (lt.autoNight === false) return true;
        if (lt.onCeiling) return true;
        if (!planet || typeof getPlanetSolarState !== 'function') return true;
        const baseR = (typeof getSurfaceRadius === 'function')
            ? getSurfaceRadius(planet, lt.angle)
            : planet.radius;
        const bx = planet.x + Math.cos(lt.angle) * baseR;
        const by = planet.y + Math.sin(lt.angle) * baseR;
        const sol = getPlanetSolarState(planet, bx, by, timeSec);
        if (!sol) return true;
        return sol.sunDot < 0.12 || sol.nightFactor >= 0.08 || sol.phase === 'sunset' || sol.phase === 'night';
    }

    function beginFrame(timeSec, nearbyPlanets) {
        _lastTimeSec = timeSec || 0;
        _frameLights.length = 0;
        if (typeof camera !== 'undefined' && camera && camera.zoom < 0.015) return;

        // 1. Luces y torres plantadas en planetas cercanos
        if (Array.isArray(nearbyPlanets) && planetaryLights.length > 0) {
            for (let i = 0; i < nearbyPlanets.length; i++) {
                const p = nearbyPlanets[i];
                if (!p) continue;
                for (let j = 0; j < planetaryLights.length; j++) {
                    const lt = planetaryLights[j];
                    if (!lt || lt.planetKey !== p.key || !isSurfaceLightActive(p, lt, timeSec)) continue;
                    const preset = LIGHT_PRESETS[lt.presetId] || LIGHT_PRESETS.simple_med;
                    const pos = getSurfaceLightHeadPosition(p, lt);
                    const intensity = lightClamp(lt.intensity ?? preset.defaultIntensity, 0.05, 2.5);
                    const effRange = preset.baseRange * (0.48 + 0.62 * intensity);
                    const aimRad = ((lt.aimDeg ?? preset.defaultAimDeg) * Math.PI) / 180;

                    pushFrameLight({
                        kind: 'surface',
                        id: lt.id,
                        lightObj: lt,
                        preset,
                        ownerShip: null,
                        planet: p,
                        onCeiling: !!lt.onCeiling,
                        wx: pos.headX,
                        wy: pos.headY,
                        baseX: pos.baseX,
                        baseY: pos.baseY,
                        dir: pos.zenithAngle + aimRad,
                        spreadDeg: lightClamp(lt.spreadDeg ?? preset.defaultSpreadDeg, 8, 135),
                        intensity,
                        effRange,
                        rgb: hexToRgbTuple(lt.colorHex || preset.defaultColor),
                        headSize: preset.headWidth || 10
                    });
                }
            }
        }

        // 2. Luces montadas en cohetes (activo, estacionados y etapas libres)
        if (typeof ship !== 'undefined' && ship) addShipLightsToFrame(ship);
        if (typeof parkedShips !== 'undefined' && Array.isArray(parkedShips)) {
            for (let i = 0; i < parkedShips.length; i++) addShipLightsToFrame(parkedShips[i]);
        }
        if (typeof freeVessels !== 'undefined' && Array.isArray(freeVessels)) {
            for (let i = 0; i < freeVessels.length; i++) addShipLightsToFrame(freeVessels[i]);
        }
    }

    function getFrameLights() {
        return _frameLights;
    }

    /**
     * Muestrea la iluminación acumulada en un punto (x, y) con radio de objeto `radius`.
     * Escribe el resultado en el objeto reutilizable `_sampleOut` para cero asignaciones GC.
     */
    function samplePoint(x, y, radius = 0) {
        const count = _frameLights.length;
        if (count === 0) return null;

        let totalIllum = 0;
        let sumR = 0, sumG = 0, sumB = 0;
        let sumDirX = 0, sumDirY = 0;

        for (let i = 0; i < count; i++) {
            const L = _frameLights[i];
            if (x + radius < L.minX || x - radius > L.maxX || y + radius < L.minY || y - radius > L.maxY) {
                continue;
            }
            const dx = x - L.wx;
            const dy = y - L.wy;
            const distSq = dx * dx + dy * dy;
            const maxR = L.effRange + radius;
            if (distSq > maxR * maxR) continue;

            const dist = Math.sqrt(distSq);
            const invD = dist > 0.001 ? (1 / dist) : 0;
            const ux = dx * invD;
            const uy = dy * invD;

            let coneFactor = 1.0;
            if (dist > Math.max(4, radius * 0.45)) {
                const dot = ux * L.dirX + uy * L.dirY;
                let cosOut = L.cosOuter;
                let cosIn = L.cosInner;
                if (radius > 1 && dist > radius * 0.8) {
                    const sinTol = Math.min(0.92, (radius * 0.72) * invD);
                    const cosTol = Math.sqrt(1 - sinTol * sinTol);
                    cosOut = L.cosOuter * cosTol - L.sinOuter * sinTol;
                    cosIn = L.cosInner * cosTol - L.sinInner * sinTol;
                }
                if (dot <= cosOut) continue;
                coneFactor = dot >= cosIn ? 1.0 : lightSmoothstep(cosOut, cosIn, dot);
            }

            const normD = Math.max(0, dist - radius * 0.35) / L.effRange;
            if (normD >= 1.0) continue;
            const edgeFade = 1.0 - normD;
            const distAtten = Math.pow(edgeFade, 1.25) / (1.0 + normD * normD * 0.85);
            const contrib = coneFactor * distAtten * L.intensity;
            if (contrib <= 0.004) continue;

            totalIllum += contrib;
            sumR += L.rgb[0] * contrib;
            sumG += L.rgb[1] * contrib;
            sumB += L.rgb[2] * contrib;
            sumDirX += -ux * contrib;
            sumDirY += -uy * contrib;
        }

        if (totalIllum <= 0.004) return null;

        const invT = 1 / totalIllum;
        const dirLen = Math.hypot(sumDirX, sumDirY) || 1;
        _sampleOut.illum = lightClamp(1.0 - Math.exp(-totalIllum * 1.85), 0, 1.35);
        _sampleOut.r = Math.min(255, Math.round(sumR * invT));
        _sampleOut.g = Math.min(255, Math.round(sumG * invT));
        _sampleOut.b = Math.min(255, Math.round(sumB * invT));
        _sampleOut.dirX = sumDirX / dirLen;
        _sampleOut.dirY = sumDirY / dirLen;
        return _sampleOut;
    }

    /**
     * Calcula la iluminación direccional en el espacio local de un cohete `s`
     * muestreando cola, centro y proa para responder con precisión a haces estrechos o altos.
     */
    function sampleRocketLighting(s) {
        if (!s) return null;
        const count = _frameLights.length;

        const sScale = s.scale || 1.0;
        const axisHalfLen = (s.customRocket && s.customRocket.bounds)
            ? Math.max(18, s.customRocket.bounds.height * 0.22)
            : 28 * sScale;
        const hullRad = Math.max(32, axisHalfLen * 1.35);

        const cosS = Math.cos(s.angle);
        const sinS = Math.sin(s.angle);

        let totalStr = 0;
        let ambientLift = 0;
        let sumR = 0, sumG = 0, sumB = 0;
        let sumWX = 0, sumWY = 0;

        for (let i = 0; i < count; i++) {
            const L = _frameLights[i];
            if (s.x + hullRad < L.minX || s.x - hullRad > L.maxX || s.y + hullRad < L.minY || s.y - hullRad > L.maxY) {
                continue;
            }

            const isOwnLight = (L.ownerShip === s);
            let bestContrib = 0;
            let bestUx = 0, bestUy = -1;

            // Muestrear 3 puntos del fuselaje: cola, centro y proa
            for (let pIdx = -1; pIdx <= 1; pIdx++) {
                const px = s.x + cosS * (axisHalfLen * pIdx);
                const py = s.y + sinS * (axisHalfLen * pIdx);
                const dx = px - L.wx;
                const dy = py - L.wy;
                const distSq = dx * dx + dy * dy;
                const sampleRad = 18 * sScale;
                const maxR = L.effRange + sampleRad;
                if (distSq > maxR * maxR) continue;

                const dist = Math.sqrt(distSq);
                const invD = dist > 0.001 ? (1 / dist) : 0;
                const ux = dx * invD;
                const uy = dy * invD;

                let coneFactor = 1.0;
                if (isOwnLight) {
                    coneFactor = 0.36;
                } else if (dist > sampleRad * 0.5) {
                    const dot = ux * L.dirX + uy * L.dirY;
                    const sinTol = Math.min(0.92, (sampleRad * 0.85) * invD);
                    const cosTol = Math.sqrt(1 - sinTol * sinTol);
                    const cosOut = L.cosOuter * cosTol - L.sinOuter * sinTol;
                    const cosIn = L.cosInner * cosTol - L.sinInner * sinTol;
                    if (dot <= cosOut) continue;
                    coneFactor = dot >= cosIn ? 1.0 : lightSmoothstep(cosOut, cosIn, dot);
                }

                const normD = Math.max(0, dist - sampleRad * 0.4) / L.effRange;
                if (normD >= 1.0) continue;
                const edgeFade = 1.0 - normD;
                const distAtten = Math.pow(edgeFade, 1.15) / (1.0 + normD * normD * 0.65);
                const c = coneFactor * distAtten * L.intensity;
                if (c > bestContrib) {
                    bestContrib = c;
                    bestUx = ux;
                    bestUy = uy;
                }
            }

            if (bestContrib <= 0.004) continue;

            totalStr += bestContrib;
            ambientLift += isOwnLight ? bestContrib * 0.65 : bestContrib;
            sumR += L.rgb[0] * bestContrib;
            sumG += L.rgb[1] * bestContrib;
            sumB += L.rgb[2] * bestContrib;
            sumWX += -bestUx * bestContrib;
            sumWY += -bestUy * bestContrib;
        }

        // Auto-iluminación realista por la llamarada del motor (desde la tobera trasera)
        const thr = s.thrustIntensity || 0;
        const hasFuel = (s.fuel === undefined || s.fuel > 0 || s.godMode || s.infiniteFuel);
        if (thr > 0.03 && hasFuel) {
            const flameInfo = (typeof getRocketFlameInfo === 'function')
                ? getRocketFlameInfo(s)
                : { rgb: (s.warping ? [125, 211, 252] : [251, 175, 60]) };
            const fRGB = flameInfo.rgb || [251, 175, 60];
            const fContrib = lightClamp(thr, 0, 1.3) * 0.78;
            totalStr += fContrib;
            ambientLift += fContrib * 0.85;
            sumR += fRGB[0] * fContrib;
            sumG += fRGB[1] * fContrib;
            sumB += fRGB[2] * fContrib;
            // La tobera está en (-1, 0) local -> (-cosS, -sinS) en mundo
            sumWX += -cosS * fContrib;
            sumWY += -sinS * fContrib;
        }

        // Auto-iluminación por plasma incandescente de reentrada atmosférica (lado de ataque al viento)
        const reI = lightClamp(s.reentryIntensity || 0, 0, 1.35);
        if (reI > 0.03) {
            const spd = Math.hypot(s.vx || 0, s.vy || 0);
            const rDirX = spd > 5 ? (s.vx / spd) : cosS;
            const rDirY = spd > 5 ? (s.vy / spd) : sinS;
            const pRGB = [
                255,
                Math.round(lightLerp(105, 215, lightClamp(reI, 0, 1))),
                Math.round(lightLerp(40, 125, lightClamp(reI, 0, 1)))
            ];
            const pContrib = reI * 1.15;
            totalStr += pContrib;
            ambientLift += pContrib;
            sumR += pRGB[0] * pContrib;
            sumG += pRGB[1] * pContrib;
            sumB += pRGB[2] * pContrib;
            sumWX += rDirX * pContrib;
            sumWY += rDirY * pContrib;
        }

        if (totalStr <= 0.004) return null;

        const invT = 1 / totalStr;
        const wLen = Math.hypot(sumWX, sumWY) || 1;
        const wxDir = sumWX / wLen;
        const wyDir = sumWY / wLen;

        const cosN = Math.cos(-s.angle);
        const sinN = Math.sin(-s.angle);
        _rocketOut.dirX = wxDir * cosN - wyDir * sinN;
        _rocketOut.dirY = wxDir * sinN + wyDir * cosN;
        _rocketOut.strength = lightClamp(1.0 - Math.exp(-totalStr * 2.8), 0, 1.0);
        _rocketOut.ambientLift = lightClamp(1.0 - Math.exp(-ambientLift * 3.4), 0, 1.0);
        _rocketOut.r = Math.min(255, Math.round(sumR * invT));
        _rocketOut.g = Math.min(255, Math.round(sumG * invT));
        _rocketOut.b = Math.min(255, Math.round(sumB * invT));
        return _rocketOut;
    }

    /**
     * Comprueba oclusión topográfica entre la fuente de luz (lx, ly) y un punto de terreno (sx, sy).
     * Permite que montañas, cráteres y lomas proyecten sombras reales sobre valles detrás de ellos.
     */
    function computeTerrainOcclusion(planet, lx, ly, sx, sy, onCeiling) {
        if (!planet || !planet.heights || planet.heights.length === 0) return 1.0;
        const dx = sx - lx;
        const dy = sy - ly;
        const segLen = Math.hypot(dx, dy);
        if (segLen < 22) return 1.0;

        const steps = segLen > 320 ? 7 : 5;
        for (let k = 1; k < steps; k++) {
            const t = k / steps;
            const px = lx + dx * t;
            const py = ly + dy * t;
            const r = Math.hypot(px - planet.x, py - planet.y);
            const th = Math.atan2(py - planet.y, px - planet.x);
            const groundR = getSurfaceRadius(planet, th);
            if (!onCeiling) {
                if (r < groundR - 1.8) return 0.0;
                if (r < groundR + 0.6) return 0.45;
            } else {
                if (r > groundR + 1.8) return 0.0;
            }
        }
        return 1.0;
    }

    /**
     * Traza un abanico de rayos contra la superficie del planeta para recortar los haces volumétricos
     * exactamente sobre montañas, cráteres y plataformas de bases. Devuelve true si algún rayo toca el suelo.
     */
    function traceBeamRayFan(L, rayCount, maxAngSpread) {
        const p = L.planet;
        const span = maxAngSpread || (L.outerSpread * 1.15);
        const startAng = L.dir - span;
        const stepAng = (span * 2) / Math.max(1, rayCount - 1);
        let canHitTerrain = false;
        let anyGroundHit = false;

        if (p && !L.onCeiling) {
            const dCenter = Math.hypot(L.wx - p.x, L.wy - p.y);
            const maxSurf = p.maxSurfaceRadius || (p.radius + 140);
            if (dCenter - L.effRange <= maxSurf + 24) {
                canHitTerrain = true;
            }
        }

        // Plataformas cercanas en el planeta cuyo tablero sólido puede ocluir rayos descendentes
        let deckSegs = null;
        if (p && !L.onCeiling && Array.isArray(p.bases) && p.bases.length > 0) {
            for (let bi = 0; bi < p.bases.length; bi++) {
                const b = p.bases[bi];
                if (!b) continue;
                const zenX = Math.cos(b.angle);
                const zenY = Math.sin(b.angle);
                const bx = p.x + zenX * b.deckR;
                const by = p.y + zenY * b.deckR;
                if (Math.hypot(L.wx - bx, L.wy - by) > L.effRange + b.halfWidth + 24) continue;
                // Solo ocluir si la fuente de luz está por encima de la cubierta
                const altAbove = (L.wx - bx) * zenX + (L.wy - by) * zenY;
                if (altAbove <= 2.0) continue;
                const tx = -zenY;
                const ty = zenX;
                if (!deckSegs) deckSegs = [];
                deckSegs.push({
                    x1: bx - tx * b.halfWidth,
                    y1: by - ty * b.halfWidth,
                    sx: tx * b.halfWidth * 2,
                    sy: ty * b.halfWidth * 2
                });
            }
        }

        const marchSteps = 14;
        for (let i = 0; i < rayCount; i++) {
            const ang = startAng + i * stepAng;
            const ca = Math.cos(ang);
            const sa = Math.sin(ang);
            _rayCos[i] = ca;
            _raySin[i] = sa;

            if (!canHitTerrain && !deckSegs) {
                _rayHits[i] = L.effRange;
                continue;
            }

            let hitD = L.effRange;
            if (canHitTerrain) {
                let prevD = 0;
                for (let s = 1; s <= marchSteps; s++) {
                    const d = (s / marchSteps) * L.effRange;
                    const rx = L.wx + ca * d;
                    const ry = L.wy + sa * d;
                    const distP = Math.hypot(rx - p.x, ry - p.y);
                    const th = Math.atan2(ry - p.y, rx - p.x);
                    const gR = getSurfaceRadius(p, th);
                    if (distP < gR) {
                        let lo = prevD, hi = d;
                        for (let b = 0; b < 3; b++) {
                            const mid = (lo + hi) * 0.5;
                            const mx = L.wx + ca * mid;
                            const my = L.wy + sa * mid;
                            const mDist = Math.hypot(mx - p.x, my - p.y);
                            const mGr = getSurfaceRadius(p, Math.atan2(my - p.y, mx - p.x));
                            if (mDist < mGr) hi = mid;
                            else lo = mid;
                        }
                        hitD = hi + 2.0;
                        anyGroundHit = true;
                        break;
                    }
                    prevD = d;
                }
            }

            if (deckSegs) {
                for (let di = 0; di < deckSegs.length; di++) {
                    const seg = deckSegs[di];
                    const denom = ca * seg.sy - sa * seg.sx;
                    if (Math.abs(denom) < 1e-6) continue;
                    const dx = seg.x1 - L.wx;
                    const dy = seg.y1 - L.wy;
                    const t = (dx * seg.sy - dy * seg.sx) / denom;
                    if (t <= 2.0 || t >= hitD) continue;
                    const u = (dx * sa - dy * ca) / denom;
                    if (u >= 0 && u <= 1) {
                        hitD = t;
                        anyGroundHit = true;
                    }
                }
            }

            _rayHits[i] = hitD;
        }
        return anyGroundHit;
    }

    /**
     * Ilumina el terreno planetario con transiciones horizontales y verticales continuas:
     * - Ley de Lambert usando la pendiente real del terreno
     * - Oclusión por montañas/cráteres (sombras reales)
     * - Revelado suave sin escalones en corteza, borde superior y lagos
     */
    function drawTerrainLighting(planets, timeSec) {
        if (_frameLights.length === 0 || !Array.isArray(planets)) return;
        const zoom = (typeof camera !== 'undefined' && camera && camera.zoom) ? camera.zoom : 1;
        if (zoom < 0.025) return;

        for (let pi = 0; pi < planets.length; pi++) {
            const p = planets[pi];
            if (!p || !p.heights || p.heights.length === 0) continue;

            const colors = p.colors || {};
            const arch = p.archetype || {};
            const topsoilCol = colors.topsoilColor || arch.topsoilColor || colors.litColor || [180, 190, 200];
            const crustDepth = 24 * Math.sqrt(Math.max(0.4, (p.radius || 2600) / 2600));
            const maxSurf = p.maxSurfaceRadius || (p.radius + 140);

            for (let li = 0; li < _frameLights.length; li++) {
                const L = _frameLights[li];
                const dCenter = Math.hypot(L.wx - p.x, L.wy - p.y);
                if (dCenter - L.effRange > maxSurf + 30) continue;

                const lightAng = Math.atan2(L.wy - p.y, L.wx - p.x);
                const maxArcSpan = Math.min(Math.PI * 0.45, L.effRange / Math.max(400, p.radius));
                const segCount = Math.max(30, Math.min(64, Math.round((maxArcSpan * p.radius) / 14)));
                const dTheta = (maxArcSpan * 2) / segCount;

                const pts = [];
                let anyLit = false;
                for (let k = 0; k <= segCount; k++) {
                    const theta = lightAng - maxArcSpan + k * dTheta;
                    const sr = getSurfaceRadius(p, theta);
                    const cosT = Math.cos(theta);
                    const sinT = Math.sin(theta);
                    const sx = p.x + cosT * sr;
                    const sy = p.y + sinT * sr;

                    const eps = 0.003;
                    const srPrev = getSurfaceRadius(p, theta - eps);
                    const srNext = getSurfaceRadius(p, theta + eps);
                    const xPrev = p.x + Math.cos(theta - eps) * srPrev;
                    const yPrev = p.y + Math.sin(theta - eps) * srPrev;
                    const xNext = p.x + Math.cos(theta + eps) * srNext;
                    const yNext = p.y + Math.sin(theta + eps) * srNext;
                    const tx = xNext - xPrev;
                    const ty = yNext - yPrev;
                    const tLen = Math.hypot(tx, ty) || 1;
                    let nx = ty / tLen;
                    let ny = -tx / tLen;
                    if (nx * cosT + ny * sinT < 0) {
                        nx = -nx;
                        ny = -ny;
                    }

                    const vx = sx - L.wx;
                    const vy = sy - L.wy;
                    const dist = Math.hypot(vx, vy);
                    let strength = 0;

                    if (dist < L.effRange) {
                        const invD = dist > 0.01 ? (1 / dist) : 0;
                        const ux = vx * invD;
                        const uy = vy * invD;

                        let cone = 0;
                        if (dist < 28) {
                            cone = 0.36 * (1 - dist / 28);
                        }
                        const dot = ux * L.dirX + uy * L.dirY;
                        if (dot > L.cosOuter) {
                            const cTerm = dot >= L.cosInner ? 1.0 : lightSmoothstep(L.cosOuter, L.cosInner, dot);
                            cone = Math.max(cone, cTerm);
                        }

                        if (cone > 0.004) {
                            const lambert = dist < 16 ? 0.62 : lightClamp(-(ux * nx + uy * ny) * 0.88 + 0.22, 0, 1);
                            if (lambert > 0.01) {
                                const normD = dist / L.effRange;
                                const edge = 1 - normD;
                                const atten = Math.pow(edge, 1.25) / (1 + normD * normD * 0.9);
                                const occ = computeTerrainOcclusion(p, L.wx, L.wy, sx, sy, L.onCeiling);
                                strength = cone * lambert * atten * occ * L.intensity;
                            }
                        }
                    }

                    if (strength > 0.005) anyLit = true;
                    pts.push({
                        sx, sy,
                        bx: p.x + cosT * (sr - crustDepth),
                        by: p.y + sinT * (sr - crustDepth),
                        strength,
                        isLake: !!(p.lakes && p.lakes.some(lk => Math.abs(lightWrapAngle(theta - lk.centerAngle)) < (lk.span || 0.05) * 0.6 && sr <= lk.waterLevel + 1.5))
                    });
                }

                if (!anyLit) continue;

                const litSoilR = Math.min(255, Math.round((topsoilCol[0] * 0.62 + 82) * (L.rgb[0] / 255)));
                const litSoilG = Math.min(255, Math.round((topsoilCol[1] * 0.62 + 82) * (L.rgb[1] / 255)));
                const litSoilB = Math.min(255, Math.round((topsoilCol[2] * 0.62 + 82) * (L.rgb[2] / 255)));

                ctx.save();
                ctx.globalCompositeOperation = 'lighter';

                for (let k = 0; k < pts.length - 1; k++) {
                    const a = pts[k];
                    const b = pts[k + 1];
                    const segStr = (a.strength + b.strength) * 0.5;
                    if (segStr <= 0.005) continue;

                    const sA = lightClamp(a.strength, 0, 1.4);
                    const sB = lightClamp(b.strength, 0, 1.4);
                    const sMid = (sA + sB) * 0.5;

                    // Degradado vertical suave hacia el subsuelo (se funde a 0 sin borde duro inferior)
                    const midTopX = (a.sx + b.sx) * 0.5;
                    const midTopY = (a.sy + b.sy) * 0.5;
                    const midBotX = (a.bx + b.bx) * 0.5;
                    const midBotY = (a.by + b.by) * 0.5;
                    const vGrad = ctx.createLinearGradient(midTopX, midTopY, midBotX, midBotY);
                    vGrad.addColorStop(0.00, `rgba(${litSoilR}, ${litSoilG}, ${litSoilB}, ${lightClamp(sMid * 0.42, 0, 0.56).toFixed(3)})`);
                    vGrad.addColorStop(0.35, `rgba(${litSoilR}, ${litSoilG}, ${litSoilB}, ${lightClamp(sMid * 0.16, 0, 0.24).toFixed(3)})`);
                    vGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');

                    ctx.fillStyle = vGrad;
                    ctx.beginPath();
                    ctx.moveTo(a.sx, a.sy);
                    ctx.lineTo(b.sx, b.sy);
                    ctx.lineTo(b.bx, b.by);
                    ctx.lineTo(a.bx, a.by);
                    ctx.closePath();
                    ctx.fill();

                    // Borde superior especular interpolado suavemente (suelo y lagos)
                    const rimGrad = ctx.createLinearGradient(a.sx, a.sy, b.sx, b.sy);
                    const mult = (a.isLake || b.isLake) ? 0.96 : 0.78;
                    rimGrad.addColorStop(0.0, `rgba(${L.rgb[0]}, ${L.rgb[1]}, ${L.rgb[2]}, ${lightClamp(sA * mult, 0, 0.98).toFixed(3)})`);
                    rimGrad.addColorStop(1.0, `rgba(${L.rgb[0]}, ${L.rgb[1]}, ${L.rgb[2]}, ${lightClamp(sB * mult, 0, 0.98).toFixed(3)})`);
                    ctx.strokeStyle = rimGrad;
                    ctx.lineWidth = (a.isLake || b.isLake ? 3.4 : 2.4) / Math.max(0.4, Math.min(1.6, zoom));
                    ctx.beginPath();
                    ctx.moveTo(a.sx, a.sy);
                    ctx.lineTo(b.sx, b.sy);
                    ctx.stroke();
                }

                ctx.restore();
            }
        }
    }

    /**
     * Renderiza los haces volumétricos con textura 2D gaussiana suave (sin líneas rectas laterales),
     * recorte topográfico real, dispersión atmosférica/neblina, motas y corona de lente.
     */
    function drawVolumetricBeams(planets, timeSec) {
        if (_frameLights.length === 0) return;
        const zoom = (typeof camera !== 'undefined' && camera && camera.zoom) ? camera.zoom : 1;
        if (zoom < 0.025) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const rayCount = 33;
        const midRayIdx = (rayCount - 1) >> 1;

        for (let li = 0; li < _frameLights.length; li++) {
            const L = _frameLights[li];
            const beamTex = getBeamTextureSprite(L.spreadDeg, L.rgb);
            const clipSpan = beamTex.outerRad * 1.15;
            const anyGroundHit = traceBeamRayFan(L, rayCount, clipSpan);

            // Muestrear densidad atmosférica y neblina para dispersión volumétrica Tyndall/Mie realista
            let atmoFactor = 0.24;
            let fogBoost = 0;
            if (L.planet) {
                const p = L.planet;
                const dMid = Math.hypot(L.wx + L.dirX * (L.effRange * 0.25) - p.x, L.wy + L.dirY * (L.effRange * 0.25) - p.y);
                const atmoDepth = Math.max(1, (p.atmoRadius || p.radius) - p.radius);
                const alt = dMid - p.radius;
                if (alt < atmoDepth) {
                    const atmoW = lightClamp(1 - alt / atmoDepth, 0, 1);
                    atmoFactor = lightLerp(0.16, 0.58 * lightClamp(p.atmoDensity ?? 1.0, 0.2, 1.5), atmoW);
                }
                if (typeof samplePlanetFog === 'function') {
                    const fogSample = samplePlanetFog(p, L.wx + L.dirX * 65, L.wy + L.dirY * 65);
                    if (fogSample && fogSample.density > 0.01) {
                        fogBoost = fogSample.density * 1.05;
                    }
                }
            }

            const volGain = lightClamp((atmoFactor + fogBoost) * (0.52 + 0.48 * L.intensity), 0.14, 1.25);

            const lensFwd = Math.min(5.5, (L.headSize || 10) * 0.38);
            const emitX = L.wx + L.dirX * lensFwd;
            const emitY = L.wy + L.dirY * lensFwd;

            ctx.save();
            // Solo recortar si algún rayo del haz intersecta el terreno
            if (anyGroundHit) {
                ctx.beginPath();
                ctx.moveTo(emitX, emitY);
                const startAng = L.dir - clipSpan;
                const stepAng = (clipSpan * 2) / (rayCount - 1);
                for (let i = 0; i < rayCount; i++) {
                    const rayAng = startAng + i * stepAng;
                    const hitD = Math.max(2, _rayHits[i]);
                    ctx.lineTo(L.wx + Math.cos(rayAng) * hitD, L.wy + Math.sin(rayAng) * hitD);
                }
                ctx.closePath();
                ctx.clip();
            }

            const sx = L.effRange / beamTex.texLen;
            const sy = (L.effRange * beamTex.sinOuter) / beamTex.maxY;
            const drawX = -beamTex.originX * sx;
            const drawY = -(beamTex.size * 0.5) * sy;
            const drawW = beamTex.size * sx;
            const drawH = beamTex.size * sy;

            ctx.save();
            ctx.translate(emitX, emitY);
            ctx.rotate(L.dir);
            ctx.globalAlpha = lightClamp(volGain * 0.78, 0.12, 0.96);
            ctx.drawImage(beamTex.canvas, drawX, drawY, drawW, drawH);
            ctx.restore();
            ctx.restore();

            // Rebote suave de dispersión en el punto de impacto central sobre el suelo
            if (anyGroundHit && _rayHits[midRayIdx] < L.effRange * 0.92) {
                const hitD = _rayHits[midRayIdx];
                const hx = L.wx + L.dirX * hitD;
                const hy = L.wy + L.dirY * hitD;
                const bounceCorona = getLightCoronaSprite(L.rgb);
                const splashR = lightClamp((38 + hitD * Math.tan(Math.min(0.95, L.halfSpread)) * 0.75), 34, 240);
                const distFade = Math.pow(1 - hitD / L.effRange, 1.3);
                ctx.globalAlpha = lightClamp(distFade * L.intensity * 0.32, 0.04, 0.42);
                ctx.drawImage(bounceCorona, hx - splashR * 0.5, hy - splashR * 0.5, splashR, splashR);
                ctx.globalAlpha = 1.0;
            }

            // Motas de polvo/vapor iluminadas dentro del haz cuando el zoom es cercano
            if (zoom > 0.45 && volGain > 0.20) {
                const r = L.rgb[0], g = L.rgb[1], b = L.rgb[2];
                const coreR = Math.min(255, Math.round(r * 0.55 + 255 * 0.45));
                const coreG = Math.min(255, Math.round(g * 0.55 + 255 * 0.45));
                const coreB = Math.min(255, Math.round(b * 0.55 + 255 * 0.45));
                const moteCount = Math.min(10, Math.round(4 + L.intensity * 3 + fogBoost * 4));
                const seedBase = (L.wx * 0.13 + L.wy * 0.17);
                for (let m = 0; m < moteCount; m++) {
                    const ph = seedBase + m * 2.399;
                    const tDist = 0.08 + ((Math.sin(ph * 1.7 + timeSec * 0.22) * 0.5 + 0.5) * 0.65);
                    const uAng = Math.sin(ph * 3.1 + timeSec * 0.35) * 0.65;
                    const mAng = L.dir + uAng * L.halfSpread;
                    const rayIdx = Math.round(lightClamp((uAng * 0.5 + 0.5) * (rayCount - 1), 0, rayCount - 1));
                    const d = tDist * _rayHits[rayIdx];
                    if (d < 12) continue;
                    const mx = L.wx + Math.cos(mAng) * d;
                    const my = L.wy + Math.sin(mAng) * d;
                    const mAlpha = (1 - tDist) * 0.34 * volGain;
                    if (mAlpha <= 0.02) continue;
                    ctx.fillStyle = `rgba(${coreR}, ${coreG}, ${coreB}, ${mAlpha.toFixed(3)})`;
                    ctx.beginPath();
                    ctx.arc(mx, my, (0.9 + (m % 3) * 0.45) / Math.max(0.6, Math.min(1.4, zoom)), 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Corona luminosa en la lente emisora (sprite pre-renderizado)
            const corona = getLightCoronaSprite(L.rgb);
            const cSize = Math.max(18, (L.headSize * 2.4 + 14) * (0.75 + 0.35 * L.intensity));
            ctx.globalAlpha = lightClamp(0.48 + L.intensity * 0.34, 0.28, 0.94);
            ctx.drawImage(corona, L.wx - cSize * 0.5, L.wy - cSize * 0.5, cSize, cSize);
            ctx.globalAlpha = 1.0;
        }

        ctx.restore();
    }

    /**
     * Dibuja una luminaria o torre de hierro individual en coordenadas locales donde (0, 0) es el suelo
     * y -Y apunta hacia el cenit.
     */
    function drawFixtureGeometry(targetCtx, preset, lightData, timeSec, nightFactor, isGhost, effectiveEnabled = true) {
        const isTower = preset.kind === 'tower';
        const hScale = isTower ? lightClamp(lightData.heightScale || 1.0, 0.65, 1.55) : 1.0;
        const height = preset.height * hScale;
        const enabled = isGhost ? true : (effectiveEnabled && lightData.enabled !== false);
        const aimRad = ((lightData.aimDeg ?? preset.defaultAimDeg) * Math.PI) / 180;
        const rgb = hexToRgbTuple(lightData.colorHex || preset.defaultColor);

        const steelDark = isGhost ? [56, 189, 248] : [
            Math.round(lightLerp(71, 16, nightFactor * 0.85)),
            Math.round(lightLerp(85, 22, nightFactor * 0.85)),
            Math.round(lightLerp(105, 34, nightFactor * 0.85))
        ];
        const steelLight = isGhost ? [125, 211, 252] : [
            Math.round(lightLerp(148, 38, nightFactor * 0.82)),
            Math.round(lightLerp(163, 48, nightFactor * 0.82)),
            Math.round(lightLerp(184, 68, nightFactor * 0.82))
        ];
        const steelCol = `rgb(${steelDark[0]}, ${steelDark[1]}, ${steelDark[2]})`;
        const steelHiCol = `rgb(${steelLight[0]}, ${steelLight[1]}, ${steelLight[2]})`;

        if (isTower) {
            const bw = preset.baseWidth * 0.5;
            const tw = preset.topWidth * 0.5;
            const bays = Math.max(3, Math.round(preset.bays * hScale));

            // Zapatas de hormigón y anclajes metálicos
            targetCtx.fillStyle = isGhost ? 'rgba(56, 189, 248, 0.35)' : `rgb(${Math.round(lightLerp(51, 14, nightFactor))}, ${Math.round(lightLerp(65, 18, nightFactor))}, ${Math.round(lightLerp(85, 26, nightFactor))})`;
            targetCtx.fillRect(-bw - 3, -3.5, 6.5, 4.5);
            targetCtx.fillRect(bw - 3.5, -3.5, 6.5, 4.5);

            // Montantes laterales principales de celosía de hierro
            targetCtx.strokeStyle = steelHiCol;
            targetCtx.lineWidth = preset.tier === 3 ? 2.1 : (preset.tier === 2 ? 1.7 : 1.4);
            targetCtx.lineCap = 'round';
            targetCtx.beginPath();
            targetCtx.moveTo(-bw, -2);
            targetCtx.lineTo(-tw, -height);
            targetCtx.moveTo(bw, -2);
            targetCtx.lineTo(tw, -height);
            targetCtx.stroke();

            // Tirantes internos X-bracing y peldaños horizontales
            targetCtx.strokeStyle = steelCol;
            targetCtx.lineWidth = preset.tier === 3 ? 1.05 : 0.85;
            targetCtx.beginPath();
            for (let b = 0; b < bays; b++) {
                const t0 = b / bays;
                const t1 = (b + 1) / bays;
                const y0 = -2 - t0 * (height - 2);
                const y1 = -2 - t1 * (height - 2);
                const w0 = lightLerp(bw, tw, t0);
                const w1 = lightLerp(bw, tw, t1);
                targetCtx.moveTo(-w0, y0);
                targetCtx.lineTo(w1, y1);
                targetCtx.moveTo(w0, y0);
                targetCtx.lineTo(-w1, y1);
                targetCtx.moveTo(-w1, y1);
                targetCtx.lineTo(w1, y1);
            }
            targetCtx.stroke();

            // Plataforma de mantenimiento superior (y media en torre colosal)
            targetCtx.fillStyle = steelHiCol;
            targetCtx.fillRect(-tw - 4, -height - 1.5, (tw + 4) * 2, 2.5);
            if (preset.tier >= 2) {
                targetCtx.strokeStyle = steelCol;
                targetCtx.lineWidth = 0.8;
                targetCtx.strokeRect(-tw - 4, -height - 6, (tw + 4) * 2, 4.5);
            }
            if (preset.tier === 3) {
                const midY = -height * 0.52;
                const midW = lightLerp(bw, tw, 0.52);
                targetCtx.fillRect(-midW - 3, midY, (midW + 3) * 2, 2.2);
                // Baliza roja de aviación en el ápice del mástil
                const strobe = 0.35 + 0.65 * Math.max(0, Math.sin(timeSec * 3.4 + (lightData.seed || 0)));
                targetCtx.fillStyle = `rgba(248, 113, 113, ${strobe.toFixed(2)})`;
                targetCtx.beginPath();
                targetCtx.arc(0, -height - 9, 1.8, 0, Math.PI * 2);
                targetCtx.fill();
            }

            // Cabezal articulado de proyectores industriales en la cima
            targetCtx.save();
            targetCtx.translate(0, -height);
            targetCtx.rotate(aimRad);
            const hw = preset.headWidth;
            const headCount = preset.tier;
            for (let h = 0; h < headCount; h++) {
                const ox = headCount === 1 ? 0 : ((h / (headCount - 1)) - 0.5) * (hw * 0.72);
                targetCtx.fillStyle = '#0f172a';
                targetCtx.strokeStyle = steelHiCol;
                targetCtx.lineWidth = 0.9;
                targetCtx.beginPath();
                targetCtx.roundRect(ox - 3.6, -5.2, 7.2, 5.6, 1.4);
                targetCtx.fill();
                targetCtx.stroke();

                targetCtx.fillStyle = enabled
                    ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
                    : 'rgba(71, 85, 105, 0.65)';
                targetCtx.fillRect(ox - 2.6, -5.8, 5.2, 1.9);
            }
            targetCtx.restore();
        } else {
            // --- LUZ SIMPLE DE SUPERFICIE (3 VARIANTES) ---
            const bw = preset.baseWidth * 0.5;
            // Base / Trípode adaptado al terreno
            targetCtx.strokeStyle = steelHiCol;
            targetCtx.lineWidth = preset.tier === 3 ? 2.0 : 1.5;
            targetCtx.lineCap = 'round';
            targetCtx.beginPath();
            targetCtx.moveTo(-bw, 0);
            targetCtx.lineTo(0, -height + 2);
            targetCtx.moveTo(bw, 0);
            targetCtx.lineTo(0, -height + 2);
            if (preset.tier >= 2) {
                targetCtx.moveTo(0, 0);
                targetCtx.lineTo(0, -height + 2);
            }
            targetCtx.stroke();

            // Placa base
            targetCtx.fillStyle = steelCol;
            targetCtx.fillRect(-bw - 1.5, -2.2, (bw + 1.5) * 2, 2.4);

            // Cabezal del reflector orientable
            targetCtx.save();
            targetCtx.translate(0, -height);
            targetCtx.rotate(aimRad);

            const hw = preset.headWidth;
            const hh = preset.tier === 3 ? 9.5 : (preset.tier === 2 ? 7.2 : 5.4);
            targetCtx.fillStyle = '#0f172a';
            targetCtx.strokeStyle = steelHiCol;
            targetCtx.lineWidth = 1.0;
            targetCtx.beginPath();
            targetCtx.roundRect(-hw * 0.5, -hh * 0.55, hw, hh, 2);
            targetCtx.fill();
            targetCtx.stroke();

            // Lente óptica frontal
            targetCtx.fillStyle = enabled
                ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
                : 'rgba(71, 85, 105, 0.65)';
            targetCtx.beginPath();
            targetCtx.roundRect(-hw * 0.42, -hh * 0.66, hw * 0.84, 2.5, 1);
            targetCtx.fill();
            targetCtx.restore();
        }
    }

    /**
     * Dibuja todas las luminarias y torres construidas sobre los planetas visibles,
     * además del gizmo de selección y manija de puntería interactiva.
     */
    function drawSurfaceFixtures(planets, timeSec) {
        if (planetaryLights.length === 0 || !Array.isArray(planets)) return;
        const zoom = (typeof camera !== 'undefined' && camera && camera.zoom) ? camera.zoom : 1;
        if (zoom < 0.025) return;

        for (let pi = 0; pi < planets.length; pi++) {
            const p = planets[pi];
            if (!p) continue;

            for (let li = 0; li < planetaryLights.length; li++) {
                const lt = planetaryLights[li];
                if (!lt || lt.planetKey !== p.key) continue;

                const preset = LIGHT_PRESETS[lt.presetId] || LIGHT_PRESETS.simple_med;
                const pos = getSurfaceLightHeadPosition(p, lt);
                if (Math.hypot(pos.baseX - camera.x, pos.baseY - camera.y) > (Math.max(screenW, screenH) / Math.max(0.1, zoom)) + 320) {
                    continue;
                }

                // Sombreado nocturno local para la estructura metálica
                let localNight = 0;
                if (typeof getPlanetSolarState === 'function') {
                    const sol = getPlanetSolarState(p, pos.baseX, pos.baseY, timeSec);
                    localNight = sol ? lightClamp(sol.nightFactor, 0, 1) : 0;
                }
                const litSample = samplePoint(pos.headX, pos.headY, 14);
                if (litSample && litSample.illum > 0.05) {
                    localNight *= (1 - lightClamp(litSample.illum * 0.72, 0, 0.78));
                }

                ctx.save();
                ctx.translate(pos.baseX, pos.baseY);
                ctx.rotate(pos.zenithAngle + Math.PI * 0.5);
                drawFixtureGeometry(ctx, preset, lt, timeSec, localNight, false, isSurfaceLightActive(p, lt, timeSec));
                ctx.restore();

                const isSelected = state.selectedRef && state.selectedRef.kind === 'surface' && state.selectedRef.lightId === lt.id;
                const isHovered = state.hoveredSurfaceLightId === lt.id;

                if (isSelected || isHovered) {
                    ctx.save();
                    const ringR = Math.max(12, (preset.headWidth || 10) * 1.15) / Math.max(0.55, Math.min(1.5, zoom));
                    ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.95)' : 'rgba(251, 191, 36, 0.8)';
                    ctx.lineWidth = (isSelected ? 1.8 : 1.3) / Math.max(0.4, zoom);
                    ctx.setLineDash([4 / Math.max(0.4, zoom), 3 / Math.max(0.4, zoom)]);
                    ctx.beginPath();
                    ctx.arc(pos.headX, pos.headY, ringR, 0, Math.PI * 2);
                    ctx.stroke();

                    // Manija interactiva para apuntar arrastrando directamente sobre el lienzo
                    if (isSelected) {
                        const aimRad = ((lt.aimDeg ?? preset.defaultAimDeg) * Math.PI) / 180;
                        const worldAim = pos.zenithAngle + aimRad;
                        const handleDist = 48 / Math.max(0.45, Math.min(1.4, zoom));
                        const hx = pos.headX + Math.cos(worldAim) * handleDist;
                        const hy = pos.headY + Math.sin(worldAim) * handleDist;

                        ctx.setLineDash([3 / Math.max(0.4, zoom), 3 / Math.max(0.4, zoom)]);
                        ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
                        ctx.beginPath();
                        ctx.moveTo(pos.headX, pos.headY);
                        ctx.lineTo(hx, hy);
                        ctx.stroke();

                        ctx.setLineDash([]);
                        ctx.fillStyle = state.draggingAim ? '#fbbf24' : '#38bdf8';
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1.4 / Math.max(0.4, zoom);
                        ctx.beginPath();
                        ctx.arc(hx, hy, 5.5 / Math.max(0.45, Math.min(1.4, zoom)), 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            }
        }
    }

    /**
     * Dibuja una vista previa holográfica sobre el terreno cuando el modo de colocación por clic está activo.
     */
    function drawPlacementPreview(timeSec) {
        if (!state.placementMode) return;
        const p = (typeof astronaut !== 'undefined' && astronaut.planet) ? astronaut.planet : (typeof ship !== 'undefined' ? ship.nearestPlanet : null);
        if (!p || typeof lastMouseWorldPos === 'undefined' || !lastMouseWorldPos) return;

        const preset = LIGHT_PRESETS[state.selectedPresetId] || LIGHT_PRESETS.simple_med;
        const ang = Math.atan2(lastMouseWorldPos.y - p.y, lastMouseWorldPos.x - p.x);
        const sr = (typeof getSurfaceRadius === 'function') ? getSurfaceRadius(p, ang) : p.radius;
        const gx = p.x + Math.cos(ang) * sr;
        const gy = p.y + Math.sin(ang) * sr;
        const hx = p.x + Math.cos(ang) * (sr + preset.height);
        const hy = p.y + Math.sin(ang) * (sr + preset.height);

        const pulse = 0.55 + 0.25 * Math.sin(timeSec * 6.0);
        const aimRad = (preset.defaultAimDeg * Math.PI) / 180;
        const worldAim = ang + aimRad;
        const spreadRad = (preset.defaultSpreadDeg * 0.5 * Math.PI) / 180;

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.translate(gx, gy);
        ctx.rotate(ang + Math.PI * 0.5);
        drawFixtureGeometry(ctx, preset, { aimDeg: preset.defaultAimDeg, colorHex: preset.defaultColor }, timeSec, 0, true);
        ctx.restore();

        // Cono holográfico de previsualización
        ctx.save();
        const prevLen = Math.min(260, preset.baseRange * 0.35);
        const grad = ctx.createRadialGradient(hx, hy, 2, hx, hy, prevLen);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.32)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.arc(hx, hy, prevLen, worldAim - spreadRad, worldAim + spreadRad);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // --- GESTIÓN, COLOCACIÓN E INSPECTOR EN TIEMPO REAL ---

    function suggestInitialAimDeg(planet, angle, preset) {
        if (preset.kind !== 'tower') return preset.defaultAimDeg;
        // Si hay un cohete cerca, orientar automáticamente la torre hacia el cohete para magia instantánea
        let targetShip = (typeof ship !== 'undefined' && ship) ? ship : null;
        if (!targetShip || Math.hypot(targetShip.x - (planet.x + Math.cos(angle) * planet.radius), targetShip.y - (planet.y + Math.sin(angle) * planet.radius)) > 750) {
            return preset.defaultAimDeg;
        }
        const sr = (typeof getSurfaceRadius === 'function') ? getSurfaceRadius(planet, angle) : planet.radius;
        const hx = planet.x + Math.cos(angle) * (sr + preset.height);
        const hy = planet.y + Math.sin(angle) * (sr + preset.height);
        const worldToShip = Math.atan2(targetShip.y - hy, targetShip.x - hx);
        const rel = lightWrapAngle(worldToShip - angle);
        return Math.round((rel * 180) / Math.PI);
    }

    function placeLightAt(planet, angle, presetId, opts = {}) {
        if (!planet) return null;
        const preset = LIGHT_PRESETS[presetId] || LIGHT_PRESETS.simple_med;
        const aimDeg = (typeof opts.aimDeg === 'number')
            ? opts.aimDeg
            : suggestInitialAimDeg(planet, angle, preset);

        const lt = {
            id: 'LGT-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 899),
            planetKey: planet.key,
            presetId: preset.id,
            angle,
            onCeiling: !!opts.onCeiling,
            enabled: true,
            autoNight: opts.autoNight !== undefined ? !!opts.autoNight : true,
            intensity: opts.intensity ?? preset.defaultIntensity,
            spreadDeg: opts.spreadDeg ?? preset.defaultSpreadDeg,
            aimDeg,
            heightScale: opts.heightScale ?? 1.0,
            colorHex: opts.colorHex || preset.defaultColor,
            seed: Math.random() * 10
        };
        planetaryLights.push(lt);

        const pos = getSurfaceLightHeadPosition(planet, lt);
        if (typeof sfx === 'function') sfx('playBaseComplete');
        else if (typeof audio !== 'undefined' && audio.playBaseComplete) audio.playBaseComplete();
        if (typeof createSparks === 'function') {
            createSparks(pos.baseX, pos.baseY, 14, angle - Math.PI * 0.5, 0.7, 35, 135, [56, 189, 248], 0.35);
        }
        selectLight({ kind: 'surface', lightId: lt.id }, false);
        return lt;
    }

    function placeLightAtAstronaut(presetId) {
        if (typeof astronaut === 'undefined' || !astronaut.active || !astronaut.planet) return null;
        const pid = presetId || state.selectedPresetId || 'simple_med';
        const lt = placeLightAt(astronaut.planet, astronaut.angle, pid, { onCeiling: !!astronaut.onCeiling });
        if (lt) {
            const preset = LIGHT_PRESETS[pid] || LIGHT_PRESETS.simple_med;
            if (typeof showHoloCard === 'function') {
                showHoloCard(astronaut.planet, `${preset.name.toUpperCase()} INSTALADA`,
                    'Haz clic sobre la luz para ajustar potencia, apertura, orientación o color en tiempo real.');
            }
        }
        return lt;
    }

    function setSelectedPreset(presetId) {
        if (!LIGHT_PRESETS[presetId]) return;
        state.selectedPresetId = presetId;
        syncEvaLightingPaletteUI();
    }

    function enterPlacementMode(presetId, relocateLightId = null) {
        if (presetId && LIGHT_PRESETS[presetId]) state.selectedPresetId = presetId;
        state.placementMode = true;
        state.relocateLightId = relocateLightId || null;
        syncEvaLightingPaletteUI();
        const banner = document.getElementById('lightPlacementBanner');
        const label = document.getElementById('lightPlacementLabel');
        if (banner) banner.classList.remove('hidden');
        if (label) {
            const preset = LIGHT_PRESETS[state.selectedPresetId] || LIGHT_PRESETS.simple_med;
            label.textContent = relocateLightId
                ? 'Haz clic en la superficie para reubicar la luz'
                : `Modo Colocar: ${preset.name} · Clic en el terreno`;
        }
    }

    function exitPlacementMode() {
        state.placementMode = false;
        state.relocateLightId = null;
        const banner = document.getElementById('lightPlacementBanner');
        if (banner) banner.classList.add('hidden');
        syncEvaLightingPaletteUI();
    }

    function resolveActiveLightObj(ref) {
        if (!ref) return null;
        if (ref.kind === 'surface') {
            const lt = planetaryLights.find(x => x && x.id === ref.lightId);
            if (!lt) return null;
            const preset = LIGHT_PRESETS[lt.presetId] || LIGHT_PRESETS.simple_med;
            return { kind: 'surface', lt, preset };
        }
        if (ref.kind === 'rocket' && ref.shipRef && ref.shipRef.customRocket) {
            const rl = (ref.shipRef.customRocket.lights || []).find(x => x && x.instanceId === ref.partId);
            const rawPart = (ref.shipRef.customRocket.customParts || []).find(x => x && x.instanceId === ref.partId);
            if (!rl) return null;
            return { kind: 'rocket', shipRef: ref.shipRef, rl, rawPart };
        }
        return null;
    }

    function selectLight(ref, openPanel = true) {
        state.selectedRef = ref || null;
        if (openPanel && ref) {
            openLightInspector(ref);
        } else if (!ref) {
            closeLightInspector();
        }
    }

    function openLightInspector(ref) {
        if (ref) state.selectedRef = ref;
        const panel = document.getElementById('lightInspectorPanel');
        if (!panel) return;
        panel.classList.remove('hidden');
        syncLightInspectorUI();
    }

    function closeLightInspector() {
        state.selectedRef = null;
        state.draggingAim = false;
        const panel = document.getElementById('lightInspectorPanel');
        if (panel) panel.classList.add('hidden');
    }

    function updateSelectedLightProp(patch) {
        const resolved = resolveActiveLightObj(state.selectedRef);
        if (!resolved) return;

        if (resolved.kind === 'surface') {
            Object.assign(resolved.lt, patch);
        } else if (resolved.kind === 'rocket') {
            const { shipRef, rl, rawPart } = resolved;
            if (patch.enabled !== undefined) {
                rl.enabled = patch.enabled;
                if (rawPart) rawPart.lightEnabled = patch.enabled;
                syncRocketLightsHudBtn();
            }
            if (patch.intensity !== undefined) {
                rl.intensity = patch.intensity;
                if (rawPart) rawPart.lightIntensity = patch.intensity;
            }
            if (patch.spreadDeg !== undefined) {
                rl.spreadDeg = patch.spreadDeg;
                if (rawPart) rawPart.lightSpread = patch.spreadDeg;
            }
            if (patch.colorHex !== undefined) {
                rl.colorHex = patch.colorHex;
                rl.rgb = hexToRgbTuple(patch.colorHex);
                if (rawPart) rawPart.lightColor = patch.colorHex;
            }
            if (patch.aimDeg !== undefined) {
                rl.aimDeg = patch.aimDeg;
                if (rawPart) rawPart.lightAimDeg = patch.aimDeg;
                const rotRad = (((rawPart ? rawPart.rotation : 0) || 0) * Math.PI) / 180;
                const cosR = Math.cos(rotRad);
                const sinR = Math.sin(rotRad);
                const aimRad = (patch.aimDeg * Math.PI) / 180;
                const ax0 = Math.sin(aimRad);
                const ay0 = -Math.cos(aimRad);
                const ax1 = (rawPart && rawPart.flipped) ? -ax0 : ax0;
                const axB = ax1 * cosR - ay0 * sinR;
                const ayB = ax1 * sinR + ay0 * cosR;
                rl.localAngle = Math.atan2(axB, -ayB);
            }
        }
        syncLightInspectorUI();
    }

    function drawAimDial(aimDeg, colorHex) {
        const dial = document.getElementById('lightAimDialCanvas');
        if (!dial) return;
        const dctx = dial.getContext('2d');
        const w = dial.width, h = dial.height;
        const cx = w * 0.5, cy = h * 0.5, r = Math.min(w, h) * 0.42;

        dctx.clearRect(0, 0, w, h);
        dctx.fillStyle = 'rgba(2, 6, 18, 0.75)';
        dctx.beginPath();
        dctx.arc(cx, cy, r, 0, Math.PI * 2);
        dctx.fill();

        dctx.strokeStyle = 'rgba(255,255,255,0.16)';
        dctx.lineWidth = 1.2;
        dctx.stroke();

        // Línea de horizonte
        dctx.strokeStyle = 'rgba(148,163,184,0.28)';
        dctx.beginPath();
        dctx.moveTo(cx - r + 4, cy);
        dctx.lineTo(cx + r - 4, cy);
        dctx.moveTo(cx, cy - r + 4);
        dctx.lineTo(cx, cy + r - 4);
        dctx.stroke();

        // 0° apunta arriba (-PI/2 en el canvas del dial)
        const rad = ((aimDeg - 90) * Math.PI) / 180;
        const resolved = resolveActiveLightObj(state.selectedRef);
        const spreadDeg = resolved ? (resolved.kind === 'surface' ? resolved.lt.spreadDeg : resolved.rl.spreadDeg) : 45;
        const halfSpreadRad = ((spreadDeg * 0.5) * Math.PI) / 180;

        dctx.fillStyle = `${colorHex || '#eef6ff'}40`;
        dctx.beginPath();
        dctx.moveTo(cx, cy);
        dctx.arc(cx, cy, r - 3, rad - halfSpreadRad, rad + halfSpreadRad);
        dctx.closePath();
        dctx.fill();

        const tx = cx + Math.cos(rad) * (r - 4);
        const ty = cy + Math.sin(rad) * (r - 4);
        dctx.strokeStyle = colorHex || '#38bdf8';
        dctx.lineWidth = 2.2;
        dctx.beginPath();
        dctx.moveTo(cx, cy);
        dctx.lineTo(tx, ty);
        dctx.stroke();

        dctx.fillStyle = '#ffffff';
        dctx.beginPath();
        dctx.arc(tx, ty, 3.2, 0, Math.PI * 2);
        dctx.fill();
    }

    function syncLightInspectorUI() {
        const panel = document.getElementById('lightInspectorPanel');
        const resolved = resolveActiveLightObj(state.selectedRef);
        if (!panel || !resolved) {
            if (panel) panel.classList.add('hidden');
            return;
        }

        const isSurface = resolved.kind === 'surface';
        const data = isSurface ? resolved.lt : resolved.rl;
        const title = isSurface ? resolved.preset.name : (resolved.rl.name || 'Foco del Cohete');
        const badge = isSurface ? resolved.preset.shortName : 'COHETE';
        const enabled = data.enabled !== false;
        const intensity = data.intensity ?? 1.0;
        const spreadDeg = data.spreadDeg ?? 45;
        const aimDeg = Math.round(data.aimDeg ?? 0);
        const colorHex = data.colorHex || '#eef6ff';

        const titleEl = document.getElementById('lightInspTitle');
        const badgeEl = document.getElementById('lightInspBadge');
        const toggleBtn = document.getElementById('btnLightInspPower');
        const intSlider = document.getElementById('lightInspIntensitySlider');
        const intVal = document.getElementById('lightInspIntensityVal');
        const sprSlider = document.getElementById('lightInspSpreadSlider');
        const sprVal = document.getElementById('lightInspSpreadVal');
        const aimSlider = document.getElementById('lightInspAimSlider');
        const aimVal = document.getElementById('lightInspAimVal');
        const heightRow = document.getElementById('lightInspTowerHeightRow');
        const heightSlider = document.getElementById('lightInspHeightSlider');
        const heightVal = document.getElementById('lightInspHeightVal');
        const colorInput = document.getElementById('lightInspCustomColor');
        const surfaceActions = document.getElementById('lightInspSurfaceActions');

        if (titleEl) titleEl.textContent = title;
        if (badgeEl) badgeEl.textContent = badge;
        if (toggleBtn) {
            toggleBtn.textContent = enabled ? '💡 ENCENDIDA' : '🌑 APAGADA';
            toggleBtn.className = enabled
                ? 'px-2.5 py-1 rounded-lg text-[10px] font-mono-num font-bold bg-amber-400/20 text-amber-200 border border-amber-400/50 cursor-pointer'
                : 'px-2.5 py-1 rounded-lg text-[10px] font-mono-num font-bold bg-white/5 text-stone-400 border border-white/15 cursor-pointer';
        }
        if (intSlider) intSlider.value = Math.round(intensity * 100);
        if (intVal) intVal.textContent = `${Math.round(intensity * 100)}%`;
        if (sprSlider) sprSlider.value = Math.round(spreadDeg);
        if (sprVal) sprVal.textContent = `${Math.round(spreadDeg)}°`;
        if (aimSlider) aimSlider.value = lightClamp(aimDeg, -180, 180);
        if (aimVal) aimVal.textContent = `${aimDeg}°`;
        if (colorInput) colorInput.value = colorHex;

        if (heightRow) {
            const showTowerHeight = isSurface && resolved.preset.kind === 'tower';
            heightRow.classList.toggle('hidden', !showTowerHeight);
            if (showTowerHeight && heightSlider && heightVal) {
                const hs = Math.round((data.heightScale || 1.0) * 100);
                heightSlider.value = hs;
                heightVal.textContent = `${hs}%`;
            }
        }
        if (surfaceActions) surfaceActions.classList.toggle('hidden', !isSurface);

        const scheduleRow = document.getElementById('lightInspScheduleRow');
        if (scheduleRow) {
            scheduleRow.classList.toggle('hidden', !isSurface);
            if (isSurface) {
                const isAutoNight = resolved.lt.autoNight !== false;
                const btnNight = document.getElementById('btnLightInspAutoNight');
                const btnAlways = document.getElementById('btnLightInspAlwaysOn');
                const statusEl = document.getElementById('lightInspScheduleStatus');
                const activeCls = 'py-1 px-1.5 rounded-lg border cursor-pointer transition-colors bg-indigo-500/30 text-indigo-100 border-indigo-400/60 font-bold';
                const idleCls = 'py-1 px-1.5 rounded-lg border cursor-pointer transition-colors bg-white/5 text-stone-400 border-white/10 hover:bg-white/10';
                if (btnNight) btnNight.className = isAutoNight ? activeCls : idleCls;
                if (btnAlways) btnAlways.className = !isAutoNight ? 'py-1 px-1.5 rounded-lg border cursor-pointer transition-colors bg-amber-500/25 text-amber-100 border-amber-400/55 font-bold' : idleCls;
                if (statusEl) {
                    if (!enabled) {
                        statusEl.textContent = 'Apagada';
                    } else if (!isAutoNight) {
                        statusEl.textContent = 'Activa 24h';
                    } else {
                        const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(resolved.lt.planetKey) : null;
                        const activeNow = p ? isSurfaceLightActive(p, resolved.lt, _lastTimeSec) : true;
                        statusEl.textContent = activeNow ? 'Activa (Noche/Ocaso)' : 'En espera (Día)';
                    }
                }
            }
        }

        document.querySelectorAll('.light-insp-swatch').forEach(btn => {
            const c = (btn.getAttribute('data-color') || '').toLowerCase();
            btn.style.outline = (c === colorHex.toLowerCase()) ? '2px solid #38bdf8' : 'none';
            btn.style.outlineOffset = '1px';
        });

        drawAimDial(aimDeg, colorHex);
    }

    function aimLightTowardNearestRocket(ref) {
        const resolved = resolveActiveLightObj(ref || state.selectedRef);
        if (!resolved || resolved.kind !== 'surface') return false;
        const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(resolved.lt.planetKey) : null;
        const targetShip = (typeof ship !== 'undefined' && ship) ? ship : null;
        if (!p || !targetShip) return false;

        const pos = getSurfaceLightHeadPosition(p, resolved.lt);
        const worldToShip = Math.atan2(targetShip.y - pos.headY, targetShip.x - pos.headX);
        const relDeg = Math.round((lightWrapAngle(worldToShip - pos.zenithAngle) * 180) / Math.PI);
        updateSelectedLightProp({ aimDeg: relDeg });
        return true;
    }

    function removeSurfaceLight(lightId) {
        const idx = planetaryLights.findIndex(x => x && x.id === lightId);
        if (idx === -1) return false;
        const lt = planetaryLights[idx];
        const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(lt.planetKey) : null;
        if (p && typeof createSparks === 'function') {
            const pos = getSurfaceLightHeadPosition(p, lt);
            createSparks(pos.baseX, pos.baseY, 10, lt.angle - Math.PI * 0.5, 0.7, 30, 110, [251, 191, 36], 0.3);
        }
        planetaryLights.splice(idx, 1);
        if (state.selectedRef && state.selectedRef.kind === 'surface' && state.selectedRef.lightId === lightId) {
            closeLightInspector();
        }
        return true;
    }

    function findSurfaceLightAtWorldPos(worldX, worldY) {
        if (planetaryLights.length === 0) return null;
        const nearby = (typeof getNearbyPlanets === 'function') ? getNearbyPlanets(worldX, worldY, 1) : [];
        const zoomSafe = (typeof camera !== 'undefined' && camera && camera.zoom) ? camera.zoom : 1.0;
        const minHit = 22 / Math.max(0.2, zoomSafe);

        let best = null;
        let bestDist = Infinity;
        for (let pi = 0; pi < nearby.length; pi++) {
            const p = nearby[pi];
            for (let li = 0; li < planetaryLights.length; li++) {
                const lt = planetaryLights[li];
                if (!lt || lt.planetKey !== p.key) continue;
                const preset = LIGHT_PRESETS[lt.presetId] || LIGHT_PRESETS.simple_med;
                const pos = getSurfaceLightHeadPosition(p, lt);
                // Comprobar cercanía a la cabeza o al mástil de la torre
                const dHead = Math.hypot(worldX - pos.headX, worldY - pos.headY);
                const midX = (pos.baseX + pos.headX) * 0.5;
                const midY = (pos.baseY + pos.headY) * 0.5;
                const dMid = Math.hypot(worldX - midX, worldY - midY);
                const d = Math.min(dHead, dMid);
                const hitR = Math.max(minHit, preset.kind === 'tower' ? pos.effHeight * 0.42 : 18);
                if (d <= hitR && d < bestDist) {
                    bestDist = d;
                    best = { lt, pos, preset };
                }
            }
        }
        return best;
    }

    function isPointOnAimHandle(worldX, worldY) {
        const resolved = resolveActiveLightObj(state.selectedRef);
        if (!resolved || resolved.kind !== 'surface') return false;
        const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(resolved.lt.planetKey) : null;
        if (!p) return false;
        const pos = getSurfaceLightHeadPosition(p, resolved.lt);
        const zoom = (typeof camera !== 'undefined' && camera && camera.zoom) ? camera.zoom : 1.0;
        const handleDist = 48 / Math.max(0.45, Math.min(1.4, zoom));
        const worldAim = pos.zenithAngle + ((resolved.lt.aimDeg ?? resolved.preset.defaultAimDeg) * Math.PI) / 180;
        const hx = pos.headX + Math.cos(worldAim) * handleDist;
        const hy = pos.headY + Math.sin(worldAim) * handleDist;
        return Math.hypot(worldX - hx, worldY - hy) <= 16 / Math.max(0.3, zoom);
    }

    function handlePointerDown(worldX, worldY) {
        // 1. Si estamos arrastrando la manija de puntería de la luz seleccionada
        if (isPointOnAimHandle(worldX, worldY)) {
            state.draggingAim = true;
            return true;
        }

        // 2. Si el modo de colocación por clic está activo
        if (state.placementMode) {
            const p = (typeof astronaut !== 'undefined' && astronaut.planet) ? astronaut.planet : (typeof ship !== 'undefined' ? ship.nearestPlanet : null);
            if (!p) return false;
            const ang = Math.atan2(worldY - p.y, worldX - p.x);

            if (state.relocateLightId) {
                const lt = planetaryLights.find(x => x && x.id === state.relocateLightId);
                if (lt) {
                    lt.planetKey = p.key;
                    lt.angle = ang;
                    lt.onCeiling = !!(typeof astronaut !== 'undefined' && astronaut.active && astronaut.onCeiling);
                    const pos = getSurfaceLightHeadPosition(p, lt);
                    if (typeof createSparks === 'function') {
                        createSparks(pos.baseX, pos.baseY, 12, ang - Math.PI * 0.5, 0.7, 30, 120, [56, 189, 248], 0.35);
                    }
                    selectLight({ kind: 'surface', lightId: lt.id }, true);
                }
                exitPlacementMode();
                return true;
            }

            placeLightAt(p, ang, state.selectedPresetId, {
                onCeiling: !!(typeof astronaut !== 'undefined' && astronaut.active && astronaut.onCeiling)
            });
            return true;
        }

        // 3. Selección de luz/torre existente en superficie
        const hit = findSurfaceLightAtWorldPos(worldX, worldY);
        if (hit) {
            selectLight({ kind: 'surface', lightId: hit.lt.id }, true);
            return true;
        }

        // 4. Clic fuera de cualquier luz o manija: cerrar el inspector si estaba abierto
        const panel = document.getElementById('lightInspectorPanel');
        if (panel && !panel.classList.contains('hidden')) {
            closeLightInspector();
        }

        return false;
    }

    function handlePointerMove(worldX, worldY) {
        if (state.draggingAim) {
            const resolved = resolveActiveLightObj(state.selectedRef);
            if (resolved && resolved.kind === 'surface') {
                const p = (typeof getPlanetByKey === 'function') ? getPlanetByKey(resolved.lt.planetKey) : null;
                if (p) {
                    const pos = getSurfaceLightHeadPosition(p, resolved.lt);
                    const worldAim = Math.atan2(worldY - pos.headY, worldX - pos.headX);
                    const relDeg = Math.round((lightWrapAngle(worldAim - pos.zenithAngle) * 180) / Math.PI);
                    updateSelectedLightProp({ aimDeg: relDeg });
                }
            }
            return true;
        }

        const hit = findSurfaceLightAtWorldPos(worldX, worldY);
        state.hoveredSurfaceLightId = hit ? hit.lt.id : null;
        return !!hit;
    }

    function handlePointerUp() {
        if (state.draggingAim) {
            state.draggingAim = false;
            return true;
        }
        return false;
    }

    function toggleAllRocketLights() {
        if (typeof ship === 'undefined' || !ship || !ship.customRocket || !Array.isArray(ship.customRocket.lights) || ship.customRocket.lights.length === 0) {
            return false;
        }
        const lights = ship.customRocket.lights;
        const anyOn = lights.some(l => l && l.enabled !== false);
        const nextState = !anyOn;
        for (let i = 0; i < lights.length; i++) {
            lights[i].enabled = nextState;
        }
        if (Array.isArray(ship.customRocket.customParts)) {
            for (let i = 0; i < ship.customRocket.customParts.length; i++) {
                const cp = ship.customRocket.customParts[i];
                const def = (typeof ROCKET_PARTS_CATALOG !== 'undefined') ? ROCKET_PARTS_CATALOG[cp.partDefId] : null;
                if (def && def.isLight) cp.lightEnabled = nextState;
            }
        }
        syncRocketLightsHudBtn();
        syncLightInspectorUI();
        if (typeof rocketBuilder !== 'undefined' && rocketBuilder.playSnapSound) rocketBuilder.playSnapSound();
        return true;
    }

    function syncRocketLightsHudBtn() {
        const btn = document.getElementById('btnHudRocketLights');
        if (!btn) return;
        const hasLights = typeof ship !== 'undefined' && ship && ship.customRocket && Array.isArray(ship.customRocket.lights) && ship.customRocket.lights.length > 0;
        btn.classList.toggle('hidden', !hasLights);
        if (!hasLights) return;
        const anyOn = ship.customRocket.lights.some(l => l && l.enabled !== false);
        btn.className = anyOn
            ? 'aero-pill aero-btn px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-display text-amber-200 border-amber-400/50 bg-amber-500/15 cursor-pointer whitespace-nowrap'
            : 'aero-pill aero-btn px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-display text-stone-300 border-white/15 cursor-pointer whitespace-nowrap';
    }

    function syncEvaLightingPaletteUI() {
        document.querySelectorAll('[data-light-preset]').forEach(btn => {
            const pid = btn.getAttribute('data-light-preset');
            const active = pid === state.selectedPresetId;
            if (active) {
                btn.classList.add('bg-amber-400/25', 'border-amber-300', 'text-amber-100');
                btn.classList.remove('bg-white/[0.04]', 'border-white/10', 'text-stone-300');
            } else {
                btn.classList.remove('bg-amber-400/25', 'border-amber-300', 'text-amber-100');
                btn.classList.add('bg-white/[0.04]', 'border-white/10', 'text-stone-300');
            }
        });
        const placeBtn = document.getElementById('btnEvaLightPlaceMode');
        if (placeBtn) {
            placeBtn.classList.toggle('bg-cyan-500/30', state.placementMode);
            placeBtn.classList.toggle('border-cyan-300', state.placementMode);
            placeBtn.textContent = state.placementMode ? '✓ Terminar Colocación' : '🎯 Colocar con Clic';
        }
    }

    function bindInspectorUI() {
        const btnClose = document.getElementById('btnCloseLightInspector');
        if (btnClose) btnClose.addEventListener('click', closeLightInspector);

        document.addEventListener('pointerdown', (e) => {
            const panel = document.getElementById('lightInspectorPanel');
            if (!panel || panel.classList.contains('hidden')) return;
            if (panel.contains(e.target)) return;
            if (e.target && e.target.id === 'flightCanvas') return;
            closeLightInspector();
        });

        const btnPower = document.getElementById('btnLightInspPower');
        if (btnPower) {
            btnPower.addEventListener('click', () => {
                const res = resolveActiveLightObj(state.selectedRef);
                if (!res) return;
                const cur = res.kind === 'surface' ? res.lt.enabled !== false : res.rl.enabled !== false;
                updateSelectedLightProp({ enabled: !cur });
            });
        }

        const btnAutoNight = document.getElementById('btnLightInspAutoNight');
        if (btnAutoNight) {
            btnAutoNight.addEventListener('click', () => {
                const res = resolveActiveLightObj(state.selectedRef);
                if (!res || res.kind !== 'surface') return;
                updateSelectedLightProp({ autoNight: true });
            });
        }

        const btnAlwaysOn = document.getElementById('btnLightInspAlwaysOn');
        if (btnAlwaysOn) {
            btnAlwaysOn.addEventListener('click', () => {
                const res = resolveActiveLightObj(state.selectedRef);
                if (!res || res.kind !== 'surface') return;
                updateSelectedLightProp({ autoNight: false });
            });
        }

        const intSlider = document.getElementById('lightInspIntensitySlider');
        if (intSlider) {
            intSlider.addEventListener('input', (e) => {
                updateSelectedLightProp({ intensity: parseFloat(e.target.value) / 100 });
            });
        }

        const sprSlider = document.getElementById('lightInspSpreadSlider');
        if (sprSlider) {
            sprSlider.addEventListener('input', (e) => {
                updateSelectedLightProp({ spreadDeg: parseFloat(e.target.value) });
            });
        }

        document.querySelectorAll('.light-spread-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                updateSelectedLightProp({ spreadDeg: parseFloat(btn.getAttribute('data-spread')) });
            });
        });

        const aimSlider = document.getElementById('lightInspAimSlider');
        if (aimSlider) {
            aimSlider.addEventListener('input', (e) => {
                updateSelectedLightProp({ aimDeg: parseFloat(e.target.value) });
            });
        }

        document.querySelectorAll('.light-aim-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                updateSelectedLightProp({ aimDeg: parseFloat(btn.getAttribute('data-aim')) });
            });
        });

        const btnAimShip = document.getElementById('btnLightInspAimRocket');
        if (btnAimShip) {
            btnAimShip.addEventListener('click', () => aimLightTowardNearestRocket());
        }

        const hSlider = document.getElementById('lightInspHeightSlider');
        if (hSlider) {
            hSlider.addEventListener('input', (e) => {
                updateSelectedLightProp({ heightScale: parseFloat(e.target.value) / 100 });
            });
        }

        document.querySelectorAll('.light-insp-swatch').forEach(btn => {
            btn.addEventListener('click', () => {
                updateSelectedLightProp({ colorHex: btn.getAttribute('data-color') });
            });
        });

        const colIn = document.getElementById('lightInspCustomColor');
        if (colIn) {
            colIn.addEventListener('input', (e) => {
                updateSelectedLightProp({ colorHex: e.target.value });
            });
        }

        const btnRelocate = document.getElementById('btnLightInspRelocate');
        if (btnRelocate) {
            btnRelocate.addEventListener('click', () => {
                const res = resolveActiveLightObj(state.selectedRef);
                if (res && res.kind === 'surface') {
                    enterPlacementMode(res.lt.presetId, res.lt.id);
                }
            });
        }

        const btnDelete = document.getElementById('btnLightInspDelete');
        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                const res = resolveActiveLightObj(state.selectedRef);
                if (res && res.kind === 'surface') {
                    removeSurfaceLight(res.lt.id);
                }
            });
        }

        // Dial visual interactivo de orientación 360°
        const dial = document.getElementById('lightAimDialCanvas');
        if (dial) {
            let dialDragging = false;
            const updateDialFromEvent = (e) => {
                const rect = dial.getBoundingClientRect();
                const x = (e.clientX - rect.left) - rect.width * 0.5;
                const y = (e.clientY - rect.top) - rect.height * 0.5;
                if (Math.hypot(x, y) < 3) return;
                // Canvas 0° es arriba (-PI/2)
                let deg = Math.round((Math.atan2(y, x) * 180) / Math.PI + 90);
                if (deg > 180) deg -= 360;
                if (deg < -180) deg += 360;
                updateSelectedLightProp({ aimDeg: deg });
            };
            dial.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                dialDragging = true;
                try { dial.setPointerCapture(e.pointerId); } catch (_) {}
                updateDialFromEvent(e);
            });
            dial.addEventListener('pointermove', (e) => {
                if (!dialDragging) return;
                e.stopPropagation();
                updateDialFromEvent(e);
            });
            const stopDial = () => { dialDragging = false; };
            dial.addEventListener('pointerup', stopDial);
            dial.addEventListener('pointercancel', stopDial);
        }

        const panel = document.getElementById('lightInspectorPanel');
        if (panel) {
            panel.addEventListener('pointerdown', (e) => e.stopPropagation());
            panel.addEventListener('click', (e) => e.stopPropagation());
        }

        const palettePanel = document.getElementById('evaLightingModal');
        if (palettePanel) {
            palettePanel.addEventListener('pointerdown', (e) => e.stopPropagation());
            palettePanel.addEventListener('click', (e) => e.stopPropagation());
        }

        document.querySelectorAll('[data-light-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                setSelectedPreset(btn.getAttribute('data-light-preset'));
            });
        });

        const btnPlaceHere = document.getElementById('btnEvaLightPlaceHere');
        if (btnPlaceHere) {
            btnPlaceHere.addEventListener('click', () => {
                placeLightAtAstronaut(state.selectedPresetId);
            });
        }

        const btnPlaceMode = document.getElementById('btnEvaLightPlaceMode');
        if (btnPlaceMode) {
            btnPlaceMode.addEventListener('click', () => {
                if (state.placementMode) {
                    exitPlacementMode();
                } else {
                    enterPlacementMode(state.selectedPresetId);
                    const mod = document.getElementById('evaLightingModal');
                    if (mod) mod.classList.add('hidden');
                }
            });
        }

        const btnCancelPlace = document.getElementById('btnCancelLightPlacement');
        if (btnCancelPlace) {
            btnCancelPlace.addEventListener('click', (e) => {
                e.stopPropagation();
                exitPlacementMode();
            });
        }

        const btnOpenEvaLights = document.getElementById('btnEvaBuildLights');
        if (btnOpenEvaLights) {
            btnOpenEvaLights.addEventListener('click', () => {
                if (typeof closeWorldObjectMenu === 'function') closeWorldObjectMenu();
                const mod = document.getElementById('evaLightingModal');
                if (mod) {
                    mod.classList.remove('hidden');
                    syncEvaLightingPaletteUI();
                }
            });
        }

        const btnCloseEvaLights = document.getElementById('btnCloseEvaLightingModal');
        if (btnCloseEvaLights) {
            btnCloseEvaLights.addEventListener('click', () => {
                const mod = document.getElementById('evaLightingModal');
                if (mod) mod.classList.add('hidden');
            });
        }

        const btnHudRocketLights = document.getElementById('btnHudRocketLights');
        if (btnHudRocketLights) {
            btnHudRocketLights.addEventListener('click', () => {
                toggleAllRocketLights();
            });
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindInspectorUI);
        } else {
            bindInspectorUI();
        }
    }

    return {
        beginFrame,
        getFrameLights,
        samplePoint,
        sampleRocketLighting,
        drawTerrainLighting,
        drawSurfaceFixtures,
        drawVolumetricBeams,
        drawPlacementPreview,
        placeLightAt,
        placeLightAtAstronaut,
        setSelectedPreset,
        enterPlacementMode,
        exitPlacementMode,
        selectLight,
        openLightInspector,
        closeLightInspector,
        syncLightInspectorUI,
        syncRocketLightsHudBtn,
        syncEvaLightingPaletteUI,
        updateSelectedLightProp,
        aimLightTowardNearestRocket,
        removeSurfaceLight,
        findSurfaceLightAtWorldPos,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        toggleAllRocketLights,
        isPlacementMode: () => state.placementMode,
        isDraggingAim: () => state.draggingAim,
        getSelectedPresetId: () => state.selectedPresetId,
        getSurfaceLightHeadPosition
    };
})();
