/**
 * ÉTER - Motor de Renderizado Gráfico HDR, Bloom Multicapa, Nubes Atmosféricas y Reentrada Direccional
 */

const canvas = document.getElementById('flightCanvas');
const _isMobileDevice = (typeof window !== 'undefined') && (
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    /Mobi|Android|iPhone|iPad|iPod/i.test((typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '')
);
let ctx = canvas.getContext('2d', _isMobileDevice ? { alpha: false } : { alpha: false, desynchronized: true });
let dpr = 1;
let screenW = window.innerWidth;
let screenH = window.innerHeight;

function getEffectiveDpr() {
    const nativeDpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const baseCap = _isMobileDevice ? 1.25 : 2.0;
    return Math.max(1.0, Math.min(nativeDpr, baseCap));
}

function resize() {
    dpr = getEffectiveDpr();
    screenW = window.innerWidth;
    screenH = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(screenW * dpr));
    canvas.height = Math.max(1, Math.floor(screenH * dpr));
    canvas.style.width = screenW + 'px';
    canvas.style.height = screenH + 'px';
}
window.addEventListener('resize', resize);

// =======================================================================
// ESTADOS VISUALES CELESTIALES DE ALTO'S ADVENTURE & ALTO'S ODYSSEY
// =======================================================================

// 2. Cintas y Brisas Atmosféricas (Wind Wisps)
const windWisps = [];
for (let w = 0; w < 8; w++) {
    windWisps.push({
        x: Math.random() * 2000,
        y: Math.random() * 1200,
        len: Math.random() * 140 + 80,
        speed: Math.random() * 65 + 40,
        phase: Math.random() * Math.PI * 2,
        amp: Math.random() * 10 + 5,
        alpha: Math.random() * 0.35 + 0.15
    });
}

function updateWindWisps(dt) {
    const lw = (typeof ship !== 'undefined' && ship.localWind) ? ship.localWind : null;
    if (!lw || !lw.hasWind || lw.speed < 85) return;
    const dir = lw.tangSpeed >= 0 ? 1 : -1;
    const speedScale = clamp(lw.speed / 120, 0.7, 2.4);
    for (const w of windWisps) {
        w.x += w.speed * speedScale * dir * dt;
        if (dir > 0 && w.x > screenW + 150) {
            w.x = -w.len - 50;
            w.y = Math.random() * (screenH * 0.85);
            w.alpha = Math.random() * 0.30 + 0.12;
        } else if (dir < 0 && w.x < -w.len - 150) {
            w.x = screenW + 50;
            w.y = Math.random() * (screenH * 0.85);
            w.alpha = Math.random() * 0.30 + 0.12;
        }
    }
}

// 3. Estrellas Fugaces Periódicas (Shooting Stars)
const shootingStars = [];
let shootingStarCooldown = 4.0;

function updateShootingStars(dt) {
    shootingStarCooldown -= dt;
    if (shootingStarCooldown <= 0 && shootingStars.length < 2) {
        shootingStars.push({
            x: Math.random() * screenW * 0.8 + screenW * 0.1,
            y: Math.random() * (screenH * 0.4),
            vx: -360 - Math.random() * 200,
            vy: 220 + Math.random() * 140,
            len: Math.random() * 100 + 70,
            life: 1.0,
            decay: Math.random() * 0.7 + 0.55
        });
        shootingStarCooldown = Math.random() * 12 + 7;
    }
    
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= s.decay * dt;
        if (s.life <= 0) shootingStars.splice(i, 1);
    }
}

// 4. Estado de Transición Continua del Sol Celestial (Fusión Cosmos <-> Atmósfera)
let smoothCelestialSunBlend = 0;

function render(timeSec) {
    if (typeof PlanetSurfaceBake !== 'undefined') PlanetSurfaceBake.beginFrame();
    ctx.save();
    ctx.scale(dpr, dpr);

    // Actualizar dinámicas atmosféricas
    updateWindWisps(0.016);
    updateShootingStars(0.016);

    const isOrbitalZoom = camera.zoom < 0.015;
    const halfViewWorld = (Math.hypot(screenW, screenH) * 0.5) / Math.max(0.0015, camera.zoom);
    const sectorRange = clamp(Math.ceil((halfViewWorld + 60000) / SECTOR_SIZE), 1, 4);
    const nearby = getNearbyPlanets(camera.x, camera.y, sectorRange);
    for (const p of nearby) {
        p.lightAngle = getPlanetCurrentLightAngle(p, timeSec);
    }
    if (typeof LightingEngine !== 'undefined') {
        LightingEngine.beginFrame(timeSec, nearby);
    }

    // 1. Cielo Cósmico y Bóveda Atmosférica Diurna / Crepuscular / Nocturna
    const hasAtmo = (ship.nearestPlanet && ship.currentAtmoWeight > 0.02);
    const pNear = ship.nearestPlanet;
    const solarState = (hasAtmo && pNear)
        ? (ship.currentSolarState || getPlanetSolarState(pNear, camera.x, camera.y, timeSec))
        : null;

    if (hasAtmo && pNear) {
        const atmoW = ship.currentAtmoWeight;
        const col = pNear.colors || {};
        const arch = pNear.archetype;

        // Bóveda Atmosférica orientada:
        // Hacia el horizonte planetario (suelo), la dispersión atmosférica es densa y luminosa;
        // Hacia el cenit (arriba), la atmósfera se abre radiantemente de día o se sumerge en la noche cósmica.
        const dayFactor = solarState ? clamp(solarState.dayFactor, 0, 1) : 0;
        const nightFactor = solarState ? clamp(solarState.nightFactor, 0, 1) : 0;
        const cloudOvercast = clamp((ship && ship.cloudOvercast) ? ship.cloudOvercast : 0, 0, 1) * atmoW;
        const cloudStorm = clamp((ship && ship.cloudStorm) ? ship.cloudStorm : 0, 0, 1) * atmoW;
        const stormInfo = (typeof getLocalStormDarkness === 'function') ? getLocalStormDarkness(pNear) : null;
        let topSkyRGB = lerpRGB(camera.skyColor, DEEP_SPACE_RGB, lerp(0.18, 0.96, nightFactor));
        if (cloudOvercast > 0.01 && dayFactor > 0.01) {
            const ceilDark = stormInfo ? (0.76 - stormInfo.skyDark * 0.48) : (0.72 - cloudStorm * 0.14);
            const overcastCeiling = [
                Math.max(2, Math.round(camera.skyColor[0] * ceilDark)),
                Math.max(3, Math.round(camera.skyColor[1] * ceilDark)),
                Math.max(4, Math.round(camera.skyColor[2] * Math.min(0.85, ceilDark + 0.04)))
            ];
            topSkyRGB = lerpRGB(topSkyRGB, overcastCeiling, cloudOvercast * dayFactor * 0.72);
        }

        const skyGrad = ctx.createLinearGradient(
            screenW * 0.5, screenH,
            screenW * 0.5, 0
        );
        skyGrad.addColorStop(0, rgbStr(camera.skyColor, 1));
        skyGrad.addColorStop(0.35, rgbStr(camera.skyColor, lerp(0.96, 0.82, nightFactor)));
        skyGrad.addColorStop(0.70, rgbStr(lerpRGB(camera.skyColor, topSkyRGB, 0.5), lerp(0.85, 0.45, nightFactor)));
        skyGrad.addColorStop(1, rgbStr(topSkyRGB, lerp(0.75, 1.0, nightFactor)));
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, screenW, screenH);

        // Resplandor crepuscular dinámico en el horizonte durante el amanecer / atardecer
        if (solarState && solarState.twilightFactor > 0.02) {
            const sunsetCol = col.sunsetRGB || arch.sunsetRGB || [251, 146, 60];
            const twIntensity = solarState.twilightFactor * atmoW * (1 - cloudOvercast * (0.55 + cloudStorm * 0.25));
            const twGrad = ctx.createRadialGradient(
                screenW * 0.5, screenH * 0.98, 20,
                screenW * 0.5, screenH * 0.98, screenW * 0.88
            );
            twGrad.addColorStop(0, rgbStr(sunsetCol, 0.62 * twIntensity));
            twGrad.addColorStop(0.32, rgbStr(sunsetCol, 0.30 * twIntensity));
            twGrad.addColorStop(0.68, rgbStr(sunsetCol, 0.08 * twIntensity));
            twGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = twGrad;
            ctx.fillRect(0, 0, screenW, screenH);
        }

        // Luminiscencia aérea nocturna sutil (Airglow / Brillo químico fino en el horizonte sin velar la noche)
        if (solarState && solarState.nightFactor > 0.05) {
            const airglowCol = col.nightAirglow || arch.nightAirglow || [56, 189, 248];
            const airglowAlpha = (col.nightAirglowAlpha || 0.45) * solarState.nightFactor * atmoW * 0.052 * (1 - cloudOvercast * 0.85);
            const agGrad = ctx.createLinearGradient(
                screenW * 0.5, screenH,
                screenW * 0.5, screenH * 0.72
            );
            agGrad.addColorStop(0, rgbStr(airglowCol, airglowAlpha));
            agGrad.addColorStop(0.45, rgbStr(airglowCol, airglowAlpha * 0.30));
            agGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = agGrad;
            ctx.fillRect(0, screenH * 0.72, screenW, screenH * 0.28);
        }
    } else {
        // En Espacio Profundo: Fondo cósmico clásico radial con gradiente de estrella
        const bgGrad = ctx.createRadialGradient(
            screenW * 0.5, screenH * 0.5, 20,
            screenW * 0.5, screenH * 0.5, Math.max(screenW, screenH) * 0.88
        );
        bgGrad.addColorStop(0, rgbStr(camera.skyColor, 1));
        bgGrad.addColorStop(1, '#020307');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, screenW, screenH);
    }

    // 2. Campo Estelar, Nebulosas y Polvo de Alta Velocidad
    // Dispersión de Rayleigh y ocultación subterránea dentro de mundos huecos:
    const cavBlend = (typeof ship !== 'undefined' && ship.cavernDepthBlend) ? ship.cavernDepthBlend : 0;
    const dayScatter = (hasAtmo && solarState) ? (solarState.dayFactor * ship.currentAtmoWeight) : 0;
    const cloudStarVeil = (hasAtmo && typeof ship !== 'undefined')
        ? (1 - clamp((ship.cloudOvercast || 0) * ship.currentAtmoWeight * 0.90, 0, 0.92))
        : 1.0;
    const starDimming = lerp(1.0, 0.08, Math.pow(dayScatter, 0.85)) * clamp(1 - cavBlend * 0.98, 0, 1) * cloudStarVeil;

    ctx.save();
    ctx.translate(screenW * 0.5, screenH * 0.5);
    ctx.rotate(camera.rotation);
    ctx.translate(-screenW * 0.5, -screenH * 0.5);

    // Banda Galáctica / Vía Láctea sutil en el fondo cósmico profundo (paralaje acotado sin reinicios ni saltos)
    const galacticAlpha = lerp(0.16, 0.015, Math.pow(dayScatter, 0.75)) * clamp(1 - cavBlend, 0, 1) * cloudStarVeil;
    if (galacticAlpha > 0.01) {
        ctx.save();
        const mwShiftX = clamp(camera.x * 0.00012, -140, 140);
        const mwShiftY = clamp(camera.y * 0.00012, -140, 140);
        ctx.translate(screenW * 0.5 - mwShiftX, screenH * 0.5 - mwShiftY);
        ctx.rotate(-0.42);
        const bandH = Math.max(screenW, screenH) * 0.36;
        const bandW = Math.max(screenW, screenH) * 2.8;
        const mwGrad = ctx.createLinearGradient(0, -bandH, 0, bandH);
        mwGrad.addColorStop(0.00, 'rgba(0,0,0,0)');
        mwGrad.addColorStop(0.28, `rgba(56, 189, 248, ${galacticAlpha * 0.35})`);
        mwGrad.addColorStop(0.46, `rgba(196, 181, 253, ${galacticAlpha * 0.65})`);
        mwGrad.addColorStop(0.54, `rgba(253, 230, 138, ${galacticAlpha * 0.55})`);
        mwGrad.addColorStop(0.72, `rgba(129, 140, 248, ${galacticAlpha * 0.30})`);
        mwGrad.addColorStop(1.00, 'rgba(0,0,0,0)');
        ctx.fillStyle = mwGrad;
        ctx.fillRect(-bandW * 0.5, -bandH, bandW, bandH * 2);
        ctx.restore();
    }

    const nebSpan = 7200;
    const nebMargin = 1800;
    if (!render._nebulaCache) render._nebulaCache = new WeakMap();
    for (const neb of nebulaClouds) {
        const nx = ((neb.x - camera.x * neb.parallax) % nebSpan + nebSpan) % nebSpan - nebMargin;
        const ny = ((neb.y - camera.y * neb.parallax) % nebSpan + nebSpan) % nebSpan - nebMargin;
        if (nx < -neb.r * 1.6 || nx > screenW + neb.r * 1.6 || ny < -neb.r * 1.6 || ny > screenH + neb.r * 1.6) continue;

        const nebAlphaMult = lerp(1.0, 0.18, dayScatter) * cloudStarVeil;
        if (nebAlphaMult <= 0.01) continue;
        const tilt = (neb.x * 0.013 + neb.y * 0.007) % Math.PI;

        let nebSprite = render._nebulaCache.get(neb);
        if (!nebSprite && typeof document !== 'undefined') {
            const dim = 384;
            const half = dim * 0.5;
            const unitR = 180;
            const c = document.createElement('canvas');
            c.width = dim;
            c.height = dim;
            const g = c.getContext('2d');
            if (g) {
                g.translate(half, half);
                const nGrad = g.createRadialGradient(0, 0, unitR * 0.04, 0, 0, unitR);
                nGrad.addColorStop(0.00, rgbStr(neb.color, neb.alpha * 1.25));
                nGrad.addColorStop(0.35, rgbStr(neb.color, neb.alpha * 0.68));
                nGrad.addColorStop(0.70, rgbStr(neb.color, neb.alpha * 0.20));
                nGrad.addColorStop(1.00, 'rgba(0,0,0,0)');
                g.fillStyle = nGrad;
                g.beginPath();
                g.arc(0, 0, unitR, 0, Math.PI * 2);
                g.fill();

                const subR = unitR * 0.62;
                const offX = Math.sin(neb.x * 0.017) * (unitR * 0.28);
                const offY = Math.cos(neb.y * 0.019) * (unitR * 0.22);
                const filGrad = g.createRadialGradient(offX, offY, subR * 0.08, offX, offY, subR);
                filGrad.addColorStop(0.0, rgbStr(lerpRGB(neb.color, [255, 240, 220], 0.25), neb.alpha * 0.75));
                filGrad.addColorStop(0.55, rgbStr(neb.color, neb.alpha * 0.24));
                filGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
                g.fillStyle = filGrad;
                g.beginPath();
                g.arc(offX, offY, subR, 0, Math.PI * 2);
                g.fill();

                const dustR = unitR * 0.42;
                const dOffX = -offX * 0.6;
                const dOffY = offY * 0.5 + unitR * 0.08;
                const dustGrad = g.createRadialGradient(dOffX, dOffY, dustR * 0.05, dOffX, dOffY, dustR);
                dustGrad.addColorStop(0.0, 'rgba(2, 4, 10, 0.32)');
                dustGrad.addColorStop(0.6, 'rgba(2, 4, 10, 0.12)');
                dustGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
                g.fillStyle = dustGrad;
                g.beginPath();
                g.arc(dOffX, dOffY, dustR, 0, Math.PI * 2);
                g.fill();
                nebSprite = c;
                render._nebulaCache.set(neb, nebSprite);
            }
        }

        ctx.save();
        ctx.translate(nx, ny);
        ctx.rotate(tilt);
        ctx.scale(1.45, 0.72);
        if (nebSprite) {
            const drawSpan = neb.r * (192 / 180);
            ctx.globalAlpha = nebAlphaMult;
            ctx.drawImage(nebSprite, -drawSpan, -drawSpan, drawSpan * 2, drawSpan * 2);
        }
        ctx.restore();
    }

    const shipSpeed = Math.hypot(ship.vx, ship.vy);
    const warpStretch = ship.warping ? clamp((shipSpeed - 300) / 750, 0, 1) : clamp((shipSpeed - 460) / 400, 0, 0.35);
    const stretchAngle = shipSpeed > 15 ? ship.velAngle : ship.angle;
    const stretchCos = Math.cos(stretchAngle);
    const stretchSin = Math.sin(stretchAngle);
    const camStarX = camera.x;
    const camStarY = camera.y;
    const maxStarX = screenW + 100;
    const maxStarY = screenH + 100;

    for (let i = 0; i < starfield.length; i++) {
        const s = starfield[i];
        const sx = ((s.x - camStarX * s.parallax) % 5600 + 5600) % 5600 - 200;
        const sy = ((s.y - camStarY * s.parallax) % 5600 + 5600) % 5600 - 200;
        if (sx >= -100 && sx <= maxStarX && sy >= -100 && sy <= maxStarY) {
            const tw = 0.78 + 0.22 * Math.sin(timeSec * s.twinkleSpeed + s.twinklePhase);
            const a = ((s.alpha * tw * (s.isBright ? Math.max(0.40, starDimming) : starDimming)) * 100 | 0) * 0.01;
            if (a <= 0.01) continue;

            if (warpStretch > 0.04 && s.parallax > 0.08) {
                const len = warpStretch * s.parallax * 135;
                ctx.strokeStyle = s.color + a + ')';
                ctx.lineWidth = s.size * (1 + warpStretch * 0.45);
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx - stretchCos * len, sy - stretchSin * len);
                ctx.stroke();
            } else if (!s.isBright && s.size < 1.3) {
                ctx.fillStyle = s.color + a + ')';
                const sz = s.size * 1.75;
                ctx.fillRect(sx - sz * 0.5, sy - sz * 0.5, sz, sz);
            } else {
                ctx.fillStyle = s.color + a + ')';
                ctx.beginPath();
                ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
                ctx.fill();

                if (s.isBright) {
                    ctx.strokeStyle = s.color + (a * 0.35) + ')';
                    ctx.lineWidth = 0.75;
                    const fl = s.size * 4.2;
                    ctx.beginPath();
                    ctx.moveTo(sx - fl, sy); ctx.lineTo(sx + fl, sy);
                    ctx.moveTo(sx, sy - fl); ctx.lineTo(sx, sy + fl);
                    ctx.stroke();
                }
            }
        }
    }

    // Polvo espacial con estela de velocidad real (solo cuando el cohete está acelerando)
    const isAccelerating = (ship.thrustIntensity > 0.05) || (ship.warping && (ship.fuel > 0 || ship.infiniteFuel));
    const dustSpan = Math.max(3400, screenW + 500);
    const dustStretch = isAccelerating && shipSpeed > 180;
    const dustLen = dustStretch ? Math.min(42, (shipSpeed - 180) * 0.065) : 0;
    for (let i = 0; i < spaceDust.length; i++) {
        const d = spaceDust[i];
        const dx = ((d.x - camStarX * 0.55) % dustSpan + dustSpan) % dustSpan - 250;
        const dy = ((d.y - camStarY * 0.55) % dustSpan + dustSpan) % dustSpan - 250;
        if (dx >= -50 && dx <= screenW + 50 && dy >= -50 && dy <= screenH + 50) {
            if (dustStretch) {
                ctx.strokeStyle = `rgba(226, 232, 240, ${d.alpha * 0.85})`;
                ctx.lineWidth = d.size;
                ctx.beginPath();
                ctx.moveTo(dx, dy);
                ctx.lineTo(dx - stretchCos * dustLen, dy - stretchSin * dustLen);
                ctx.stroke();
            } else {
                ctx.fillStyle = `rgba(226, 232, 240, ${d.alpha})`;
                const sz = d.size * 1.75;
                ctx.fillRect(dx - sz * 0.5, dy - sz * 0.5, sz, sz);
            }
        }
    }
    ctx.restore();

    // Actualización de transición solar suave (fusión orgánica entre vacío cósmico y atmósfera planetaria)
    const targetSunBlend = (pNear && ship.currentAtmoWeight) ? clamp(ship.currentAtmoWeight, 0, 1) : 0;
    smoothCelestialSunBlend = lerp(smoothCelestialSunBlend, targetSunBlend, 0.05);

    // El Gran Sol Celestial se dibuja SIEMPRE con transición fotométrica continua (sin desaparecer de golpe)
    drawCelestialSunAndGodRays(pNear, solarState, timeSec, smoothCelestialSunBlend);

    // Arco Celeste de Anillos Planetarios visto desde la superficie y atmósfera baja
    if (!isOrbitalZoom && pNear && pNear.hasRings && smoothCelestialSunBlend > 0.01) {
        drawSurfaceRingArch(pNear, solarState, timeSec, smoothCelestialSunBlend);
    }

    // Elementos Atmosféricos Cinemáticos de Alto's Adventure & Odyssey
    if (!isOrbitalZoom && hasAtmo && pNear) {
        drawWindWisps(timeSec);
        drawAtmosphericDepthFog(pNear, ship.currentAtmoWeight, timeSec);
    }
    drawShootingStars(timeSec);

    // 3. Transformación al Espacio Mundial con Rotación de Horizonte Planetario
    ctx.save();
    const shakeX = (Math.random() - 0.5) * camera.shake * 2.2;
    const shakeY = (Math.random() - 0.5) * camera.shake * 2.2;
    ctx.translate(screenW * 0.5 + shakeX, screenH * 0.5 + shakeY);
    ctx.rotate(camera.rotation);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 4. Planetas Masivos, Capas Atmosféricas y Terrenos
    for (const p of nearby) {
        drawCinematicPlanet(p, timeSec);
    }

    // 5. Predicción Balística de Trayectoria (Guía Visual de Físicas)
    drawTrajectoryGuide(timeSec);

    if (!isOrbitalZoom) {
        // 6. Ondas de Superficie Líquida
        drawLiquidRipples();

        // 7. Iluminación Realista de la Llama sobre el Suelo (Sin círculos gigantes)
        drawDynamicGroundGlow(nearby);
        if (typeof LightingEngine !== 'undefined') {
            LightingEngine.drawTerrainLighting(nearby, timeSec);
        }

        // 8. Nubes Atmosféricas Planetarias, Neblinas Trasera y Vórtices Eólicos (se ocultan al descender al núcleo de cavernas)
        if (!ship.cavernDepthBlend || ship.cavernDepthBlend < 0.88) {
            for (const p of nearby) {
                if (typeof drawPlanetWindVortices === 'function') {
                    drawPlanetWindVortices(p, timeSec);
                }
                drawPlanetCloudBands(p, timeSec);
                if (typeof drawPlanetFogBackground === 'function') {
                    drawPlanetFogBackground(p, timeSec);
                }
            }
        }

        // 9. Faros Volumétricos de Exploración
        drawHeadlights(timeSec);
    }

    // 10. Filamento Electromagnético de Cosecha de Éter
    drawHarvestTether(timeSec);

    // 11. Ondas de Choque de Impacto / Asimilación
    drawShockwaves();

    // 12. Ondas de Sonar Astral
    for (const sp of sonarPulses) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(125, 211, 252, ${sp.alpha * 0.72})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(251, 191, 36, ${sp.alpha * 0.28})`;
        ctx.lineWidth = 8.0;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, Math.max(1, sp.radius - 16), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // 13. Trazas de Alta Velocidad e Hiperimpulso (Alineadas con el Vector Velocidad)
    if (warpFlashes.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const wf of warpFlashes) {
            const a = clamp(wf.life / wf.maxLife, 0, 1);
            const tailX = wf.x - Math.cos(wf.angle) * wf.len;
            const tailY = wf.y - Math.sin(wf.angle) * wf.len;
            const grad = ctx.createLinearGradient(wf.x, wf.y, tailX, tailY);
            if (wf.isWarp) {
                grad.addColorStop(0, `rgba(224, 242, 254, ${a * 0.9})`);
                grad.addColorStop(0.35, `rgba(56, 189, 248, ${a * 0.55})`);
                grad.addColorStop(1, 'rgba(37, 99, 235, 0)');
            } else {
                grad.addColorStop(0, `rgba(248, 250, 252, ${a * 0.55})`);
                grad.addColorStop(1, 'rgba(148, 163, 184, 0)');
            }
            ctx.strokeStyle = grad;
            ctx.lineWidth = wf.isWarp ? 2.0 : 1.2;
            ctx.beginPath();
            ctx.moveTo(wf.x, wf.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();
        }
        ctx.restore();
    }

    if (!isOrbitalZoom) {
        // 14. Humo Volumétrico de Lanzamiento y Nubes Persistentes de Estratosfera
        drawSmokePuffs();

        // 15. Estelas Aerodinámicas de Aletas (Wingtip Vortices)
        drawWingTrails();

        // 16. Partículas Ambientales del Bioma y Corrientes Eólicas Delicadas
        drawBiomeParticles(timeSec);
        if (typeof drawPlanetWindParticles === 'function') {
            drawPlanetWindParticles(nearby, timeSec);
        }
    }

    // 17. Escombros Físicos (Debris) y Fragmentos Animados de Piezas Rotas
    drawDebris();
    drawShatteredPartFX();

    // 18. Estela de Plasma de Reentrada Atmosférica
    drawReentryWakeParticles();

    // 19. Partículas de Escape de Plasma de Alta Velocidad y RCS
    drawParticles();

    // 20. Chispas Incandescentes con Motion Blur
    drawSparks();

    if (!isOrbitalZoom) {
        // 21. Balizas y Banderas Cuánticas Plantadas en Superficie
        if (typeof drawBeacons === 'function') {
            drawBeacons(timeSec);
        }

        // 21.2 Bases Planetarias Modulares y Plataformas de Aterrizaje
        if (typeof drawBases === 'function') {
            drawBases(timeSec);
        }

        // 21.3 Máquinas Extractoras de Recursos Planetarios (Nv.1 - Nv.4)
        if (typeof drawExtractors === 'function') {
            drawExtractors(timeSec);
        }

        // 21.35 Viviendas, Casas y Almacenamientos de Colonia
        if (typeof drawColonyBuildings === 'function') {
            drawColonyBuildings(timeSec);
        }

        // 21.4 Luminarias Simples y Torres de Iluminación de Hierro
        if (typeof LightingEngine !== 'undefined') {
            LightingEngine.drawSurfaceFixtures(nearby, timeSec);
        }

        // 21.5 Deflexión de la Llama del Cohete contra la Superficie
        if (ship.flameDeflection && ship.flameDeflection.active) {
            drawGroundFlameDeflection(ship.flameDeflection, timeSec);
        }
    }

    // 22. Naves Estacionadas en Planetas y Nave Activa del Jugador
    if (typeof parkedShips !== 'undefined' && Array.isArray(parkedShips)) {
        for (const ps of parkedShips) {
            drawRocket(timeSec, ps);
        }
    }
    if (typeof freeVessels !== 'undefined' && Array.isArray(freeVessels)) {
        for (const fv of freeVessels) {
            drawRocket(timeSec, fv);
            if (fv.customRocket && fv.customRocket.hasCommand) {
                ctx.save();
                ctx.translate(fv.x, fv.y);
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
                ctx.lineWidth = 1.2 / Math.max(0.25, camera.zoom);
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(0, 0, 22, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }
    }
    drawRocket(timeSec, ship);

    // 23. Cosmonauta EVA Vesper-01 y Efectos de Interacción
    if (typeof drawAstronaut === 'function') {
        drawAstronaut(timeSec);
    }
    if (typeof drawColonyColonists === 'function') {
        drawColonyColonists(timeSec);
    }
    if (typeof drawInteractionEffects === 'function') {
        drawInteractionEffects(timeSec);
    }

    if (!isOrbitalZoom) {
        // 23.5. Fauna Extraterrestre y Seres Vivos de los Planetas
        if (typeof drawPlanetCreatures === 'function') {
            drawPlanetCreatures(nearby, timeSec);
        }
        if (typeof drawPlasmaProjectiles === 'function') {
            drawPlasmaProjectiles(timeSec);
        }
        if (typeof drawCreatureEtherOrbs === 'function') {
            drawCreatureEtherOrbs(timeSec);
        }
        // 23.55. Haces Volumétricos de Iluminación Dinámica y Previsualización de Colocación
        if (typeof LightingEngine !== 'undefined') {
            LightingEngine.drawVolumetricBeams(nearby, timeSec);
            LightingEngine.drawPlacementPreview(timeSec);
        }
        if (typeof ColonyBuildings !== 'undefined') {
            ColonyBuildings.drawPlacementPreview(timeSec);
        }
        // 23.6. Capa Frontal Translúcida de Neblinas y Dispersión Volumétrica de Cohete
        if ((!ship.cavernDepthBlend || ship.cavernDepthBlend < 0.88) && typeof drawPlanetFogForeground === 'function') {
            for (const p of nearby) {
                drawPlanetFogForeground(p, timeSec);
            }
        }
    }

    ctx.restore();

    // 23.8. Indicador Táctico de Orientación del Cohete en Zoom Lejano
    drawRocketOrientationOverlay(timeSec);

    // 24. Radar Perimetral Orbital en Pantalla
    drawPerimeterRadar(nearby);

    // 25. Grano Fílmico Sutil Anti-Banding (suaviza degradados de cielo y atmósfera)
    if (typeof VisualTextures !== 'undefined') {
        const filmPat = VisualTextures.getPattern(ctx, 'film');
        if (filmPat) {
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = filmPat;
            ctx.fillRect(0, 0, screenW, screenH);
            ctx.restore();
        }
    }

    ctx.restore();
}

// --- GUÍA PREDICTIVA DE TRAYECTORIA BALÍSTICA Y ÓRBITA ---
function drawTrajectoryGuide(timeSec) {
    const invZoom = 1 / Math.max(0.004, camera.zoom);

    // Anillo guía de órbita objetivo cuando el Piloto Orbital está activo
    if (ship.orbitMode !== 'off' && ship.nearestPlanet && ship.orbitTargetRadius > 0) {
        const p = ship.nearestPlanet;
        ctx.save();
        ctx.strokeStyle = ship.orbitMode === 'locked'
            ? 'rgba(52, 211, 153, 0.32)'
            : 'rgba(56, 189, 248, 0.36)';
        ctx.lineWidth = 1.6 * invZoom;
        ctx.setLineDash([12 * invZoom, 10 * invZoom]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, ship.orbitTargetRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    if (!ship.trajectory || ship.trajectory.length < 3) return;
    const speed = Math.hypot(ship.vx, ship.vy);
    const alphaBase = clamp((speed - 12) / 45, 0, 0.85);
    if (alphaBase <= 0.02) return;

    ctx.save();
    const isWarning = ship.trajectoryImpact && ship.verticalSpeed < -145;
    let strokeCol = `rgba(125, 211, 252, ${alphaBase * 0.90})`;
    if (isWarning) {
        strokeCol = `rgba(251, 113, 133, ${alphaBase})`;
    } else if (ship.orbitClosed && !ship.trajectoryImpact) {
        const orbState = ship.orbitalInfo ? ship.orbitalInfo.state : 'STABLE';
        strokeCol = (orbState === 'LOCKED' || orbState === 'STABLE')
            ? `rgba(52, 211, 153, ${alphaBase})`
            : `rgba(56, 189, 248, ${alphaBase})`;
    } else if (ship.trajectoryEscape) {
        strokeCol = `rgba(251, 191, 36, ${alphaBase * 0.92})`;
    }

    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 2.2 * invZoom;
    ctx.setLineDash([8 * invZoom, 7 * invZoom]);
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y);
    for (let i = 0; i < ship.trajectory.length; i++) {
        ctx.lineTo(ship.trajectory[i].x, ship.trajectory[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Marcadores de Periapsis (PE) y Apoapsis (AP) en órbitas cerradas
    if (ship.orbitClosed && !ship.trajectoryImpact && ship.orbitPeriapsis && ship.orbitApoapsis) {
        const markers = [
            { pt: ship.orbitPeriapsis, label: 'PE', col: '#34d399' },
            { pt: ship.orbitApoapsis, label: 'AP', col: '#38bdf8' }
        ];
        const sz = 4.2 * invZoom;
        ctx.font = `600 ${Math.round(9.5 * invZoom)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        for (const m of markers) {
            ctx.fillStyle = m.col;
            ctx.beginPath();
            ctx.moveTo(m.pt.x, m.pt.y - sz);
            ctx.lineTo(m.pt.x + sz, m.pt.y);
            ctx.lineTo(m.pt.x, m.pt.y + sz);
            ctx.lineTo(m.pt.x - sz, m.pt.y);
            ctx.closePath();
            ctx.fill();

            ctx.save();
            ctx.translate(m.pt.x, m.pt.y);
            ctx.rotate(-camera.rotation);
            ctx.fillText(`${m.label} ${Math.round(m.pt.alt * 0.1)}m`, 0, -sz * 1.9);
            ctx.restore();
        }
    }

    // Punto estimado de contacto en la superficie
    if (ship.trajectoryImpact) {
        const lastPt = ship.trajectory[ship.trajectory.length - 1];
        const pulse = 0.75 + 0.25 * Math.sin(timeSec * 8);
        ctx.fillStyle = isWarning ? 'rgba(244, 63, 94, 0.75)' : 'rgba(56, 189, 248, 0.65)';
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, 3.8 * pulse * invZoom, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// --- RENDERIZADO CINEMÁTICO DE PLANETAS, CAPAS INTERNAS, ESTRUCTURAS Y ATMÓSFERAS ---

// --- SISTEMAS VISUALES CELESTIALES DE ALTO'S ADVENTURE & ALTO'S ODYSSEY ---

/**
 * Renderiza brisas y cintas de viento flotantes (Wind Wisps)
 */
function drawWindWisps(timeSec) {
    // Las cintas de viento en espacio mundial (drawPlanetWindParticles) responden a la dirección,
    // intensidad y calma real de cada planeta; las líneas estáticas de pantalla solo se muestran
    // muy sutilmente durante ráfagas intensas para no crear falso viento en planetas en calma.
    const lw = ship.localWind;
    if (!lw || !lw.hasWind || lw.speed < 85) return;

    const pNear = ship.nearestPlanet;
    const nightFactor = (pNear && ship.currentSolarState) ? clamp(ship.currentSolarState.nightFactor, 0, 1) : 0;
    const galeFactor = clamp((lw.speed - 85) / 140, 0, 1);
    const wispAlphaMult = lerp(0.22, 0.06, nightFactor) * galeFactor;
    const wispCol = lerpRGB([255, 255, 255], [148, 163, 184], nightFactor * 0.75);

    ctx.save();
    ctx.lineCap = 'round';
    for (const w of windWisps) {
        const waveY = Math.sin(timeSec * 2.2 + w.phase) * w.amp;
        ctx.strokeStyle = `rgba(${wispCol[0]}, ${wispCol[1]}, ${wispCol[2]}, ${w.alpha * wispAlphaMult})`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(w.x, w.y);
        ctx.quadraticCurveTo(w.x + w.len * 0.5, w.y + waveY, w.x + w.len, w.y);
        ctx.stroke();
    }
    ctx.restore();
}

/**
 * Renderiza estrellas fugaces periódicas a través del cielo
 */
function drawShootingStars(timeSec) {
    if (shootingStars.length === 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const s of shootingStars) {
        const angle = Math.atan2(s.vy, s.vx);
        const tailX = s.x - Math.cos(angle) * s.len;
        const tailY = s.y - Math.sin(angle) * s.len;
        
        const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${s.life * 0.95})`);
        grad.addColorStop(0.3, `rgba(254, 240, 138, ${s.life * 0.7})`);
        grad.addColorStop(1, 'rgba(251, 146, 60, 0)');
        
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
    }
    ctx.restore();
}

/**
 * Interpolación angular más corta (Shortest Angular Slerp)
 */
function lerpAngle(a, b, t) {
    const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a));
    return a + diff * t;
}

/**
 * Renderiza el Gran Sol Celestial con transición cinemática continua (Cosmos <-> Atmósfera),
 * Halos Concéntricos y Rayos Crepusculares Volumétricos (God Rays)
 */
function drawCelestialSunAndGodRays(pNear, solarState, timeSec, atmoBlend = 0) {
    // 1. Cálculo de orientación del Sol: Cósmica (espacio) vs Cenital Planetaria (atmósfera)
    const cosVecX = (typeof GALAXY_SUN_POS !== 'undefined' ? GALAXY_SUN_POS.x : 0) - camera.x;
    const cosVecY = (typeof GALAXY_SUN_POS !== 'undefined' ? GALAXY_SUN_POS.y : -250000) - camera.y;
    const cosmosAngle = Math.atan2(cosVecY, cosVecX) + camera.rotation + Math.PI * 0.5;

    let targetSunAngle = cosmosAngle;
    let arch = pNear ? pNear.archetype : {};
    let col = (pNear && pNear.colors) ? pNear.colors : {};

    if (pNear) {
        const planetSunAngle = (pNear.lightAngle || 0) + camera.rotation + Math.PI * 0.5;
        targetSunAngle = lerpAngle(cosmosAngle, planetSunAngle, atmoBlend);
    }

    const sunAngle = targetSunAngle;
    const sunDist = Math.min(screenW, screenH) * (0.58 - atmoBlend * 0.05);
    const sunX = screenW * 0.5 + Math.sin(sunAngle) * sunDist;
    const sunY = screenH * 0.45 - Math.cos(sunAngle) * sunDist * 0.75;

    // Atenuación suave y continua al ocultarse bajo el horizonte en la cara nocturna de la superficie
    const nightDim = (solarState && atmoBlend > 0.25)
        ? smoothstep(0.85, 0.15, solarState.nightFactor)
        : 1.0;

    if (nightDim <= 0.01) return;

    // Factores continuos del ciclo día / atardecer / noche (sin saltos bruscos)
    const twilight = solarState ? clamp(solarState.twilightFactor, 0, 1) : 0;
    const day = solarState ? clamp(solarState.dayFactor, 0, 1) : 1;
    const night = solarState ? clamp(solarState.nightFactor, 0, 1) : 0;

    const sunVis = (pNear && pNear.archetype && pNear.archetype.sunVisuals) ? pNear.archetype.sunVisuals : { type: 'sol', tint: [254, 240, 138], haloMult: 1.0 };
    const sunsetCol = col.sunsetRGB || arch.sunsetRGB || sunVis.tint || [251, 146, 60];
    const daySunRGB = sunVis.type === 'copper' ? [255, 235, 210] : (sunVis.type === 'ice_halo' ? [240, 249, 255] : [255, 253, 246]);
    const nightSunRGB = [224, 242, 254];

    // Fusión cromática continua y analógica del disco solar
    let curSunRGB = lerpRGB(daySunRGB, sunsetCol, Math.pow(twilight, 0.72));
    if (night > 0.05) {
        curSunRGB = lerpRGB(curSunRGB, nightSunRGB, clamp((night - 0.05) / 0.75, 0, 1));
    }

    const sunOcc = clamp((typeof ship !== 'undefined' && ship.sunCloudOcclusion ? ship.sunCloudOcclusion : 0) * smoothstep(0.05, 0.35, atmoBlend), 0, 1);
    const cloudOv = clamp((typeof ship !== 'undefined' && ship.cloudOvercast ? ship.cloudOvercast : 0) * smoothstep(0.05, 0.35, atmoBlend), 0, 1);
    const fogVeil = clamp((typeof ship !== 'undefined' && ship.localFogDensity ? ship.localFogDensity : 0) * 0.72 * smoothstep(0.05, 0.30, atmoBlend), 0, 1);
    const sunVeil = clamp(Math.max(sunOcc, cloudOv * 0.72, fogVeil), 0, 1);

    ctx.save();
    ctx.globalAlpha = nightDim;

    // 2. Halos concéntricos amplios de difusión (Transición cromática suave hacia el atardecer y difusión nubosa)
    const haloRadius = lerp(90, 310 * (sunVis.haloMult || 1.0), atmoBlend) * lerp(1.0, 1.42, sunVeil);
    const hGrad = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, haloRadius);
    
    if (atmoBlend > 0.08) {
        const haloInner = lerpRGB([255, 252, 235], sunsetCol, Math.pow(twilight, 0.75));
        const haloMid = lerpRGB([254, 243, 199], sunsetCol, Math.pow(twilight, 0.68));
        const haloOuter = lerpRGB([244, 162, 97], sunsetCol, Math.pow(twilight, 0.58));
        const alphaScale = atmoBlend * (day * 0.44 + twilight * 0.48 + 0.04) * lerp(1.0, 0.34, sunVeil);

        hGrad.addColorStop(0.00, rgbStr(haloInner, alphaScale));
        hGrad.addColorStop(0.35, rgbStr(haloMid, alphaScale * 0.45));
        hGrad.addColorStop(0.70, rgbStr(haloOuter, alphaScale * 0.14));
    } else {
        // En el vacío cósmico: Corona estelar limpia y compacta
        const spaceCorona = 1.0 - atmoBlend / 0.08;
        hGrad.addColorStop(0, `rgba(255, 255, 255, ${0.35 * spaceCorona})`);
        hGrad.addColorStop(0.45, `rgba(254, 243, 199, ${0.12 * spaceCorona})`);
        hGrad.addColorStop(0.85, `rgba(56, 189, 248, ${0.02 * spaceCorona})`);
    }
    hGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, haloRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2.5. Anillo de Parhelio Prismático en mundos criogénicos
    const ringVeil = 1 - smoothstep(0.10, 0.65, sunVeil);
    if (sunVis.hasIceRing && atmoBlend > 0.15 && ringVeil > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(186, 230, 253, ${0.25 * atmoBlend * ringVeil})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(sunX, sunY, haloRadius * 0.68, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // 3. Destello Anamórfico Estelar en el Espacio Profundo (Lens Flare Cinemático)
    const flareVeil = 1 - smoothstep(0.05, 0.50, sunVeil);
    if (atmoBlend < 0.35 && flareVeil > 0.01) {
        const flareAlpha = (1.0 - atmoBlend / 0.35) * 0.45 * flareVeil;
        const flareWidth = Math.min(screenW, screenH) * 0.42;
        const flareGrad = ctx.createLinearGradient(sunX - flareWidth, sunY, sunX + flareWidth, sunY);
        flareGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        flareGrad.addColorStop(0.45, `rgba(224, 242, 254, ${flareAlpha * 0.85})`);
        flareGrad.addColorStop(0.50, `rgba(255, 255, 255, ${flareAlpha * 1.25})`);
        flareGrad.addColorStop(0.55, `rgba(254, 240, 138, ${flareAlpha * 0.85})`);
        flareGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = flareGrad;
        ctx.fillRect(sunX - flareWidth, sunY - 1.6, flareWidth * 2, 3.2);
        ctx.restore();
    }

    // 4. Rayos Crepusculares Volumétricos Suaves (God Rays sin bordes duros, cacheados)
    const rayCloudMult = smoothstep(0.92, 0.28, sunVeil);
    if (atmoBlend > 0.12 && (day > 0.05 || twilight > 0.02) && rayCloudMult > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const numRays = 7;
        const rayBlendFactor = clamp((atmoBlend - 0.12) / 0.38, 0, 1) * rayCloudMult;
        const rayColor = lerpRGB([255, 250, 235], sunsetCol, Math.pow(twilight, 0.72));
        const maxScreen = Math.max(screenW, screenH);

        if (!drawCelestialSunAndGodRays._rayCache) drawCelestialSunAndGodRays._rayCache = new Map();
        const qr = Math.min(255, Math.max(0, (Math.round(rayColor[0]) + 4) >> 3 << 3));
        const qg = Math.min(255, Math.max(0, (Math.round(rayColor[1]) + 4) >> 3 << 3));
        const qb = Math.min(255, Math.max(0, (Math.round(rayColor[2]) + 4) >> 3 << 3));
        const rayKey = (qr << 16) | (qg << 8) | qb;
        let raySprite = drawCelestialSunAndGodRays._rayCache.get(rayKey);
        if (!raySprite && typeof document !== 'undefined') {
            if (drawCelestialSunAndGodRays._rayCache.size > 24) drawCelestialSunAndGodRays._rayCache.clear();
            const rw = 256, rh = 96, rHalfH = 48;
            const rc = document.createElement('canvas');
            rc.width = rw;
            rc.height = rh;
            const rg = rc.getContext('2d');
            if (rg) {
                const colStr = `${qr}, ${qg}, ${qb}`;
                const rGrad = rg.createRadialGradient(0, rHalfH, 6, 0, rHalfH, rw);
                rGrad.addColorStop(0.00, `rgba(${colStr}, 1.0)`);
                rGrad.addColorStop(0.28, `rgba(${colStr}, 0.53)`);
                rGrad.addColorStop(0.65, `rgba(${colStr}, 0.16)`);
                rGrad.addColorStop(1.00, `rgba(${colStr}, 0.0)`);
                rg.fillStyle = rGrad;
                rg.beginPath();
                rg.moveTo(0, rHalfH);
                rg.lineTo(rw, 4);
                rg.lineTo(rw, rh - 4);
                rg.closePath();
                rg.fill();

                // Suavizado vertical para evitar bordes duros laterales
                rg.globalCompositeOperation = 'destination-in';
                const vGrad = rg.createLinearGradient(0, 0, 0, rh);
                vGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
                vGrad.addColorStop(0.35, 'rgba(0,0,0,1)');
                vGrad.addColorStop(0.65, 'rgba(0,0,0,1)');
                vGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
                rg.fillStyle = vGrad;
                rg.fillRect(0, 0, rw, rh);
                raySprite = rc;
                drawCelestialSunAndGodRays._rayCache.set(rayKey, raySprite);
            }
        }

        const prevAlpha = ctx.globalAlpha;
        for (let r = 0; r < numRays; r++) {
            const rayAngle = (r / numRays) * Math.PI * 0.9 + 0.12 + Math.sin(timeSec * 0.07 + r * 1.7) * 0.06;
            const rayLen = maxScreen * (0.72 + (r % 3) * 0.14);
            const spread = 0.095 + (r % 2) * 0.04;
            const baseAlpha = (0.042 + 0.032 * twilight) * rayBlendFactor * (0.75 + 0.25 * Math.sin(timeSec * 0.45 + r * 1.3));

            if (raySprite) {
                const halfSpanW = rayLen * Math.tan(spread) * 1.15;
                ctx.save();
                ctx.translate(sunX, sunY);
                ctx.rotate(rayAngle);
                ctx.globalAlpha = prevAlpha * Math.min(1, baseAlpha * 1.6);
                ctx.drawImage(raySprite, 0, -halfSpanW, rayLen, halfSpanW * 2);
                ctx.restore();
            }
        }
        ctx.restore();
    }

    // 4.5. Reflejos Ópticos de Lente (Optical Bokeh Ghosts) a lo largo del eje solar
    const dxCenter = screenW * 0.5 - sunX;
    const dyCenter = screenH * 0.5 - sunY;
    const sunScreenDist = Math.hypot(dxCenter, dyCenter);
    const ghostVeil = 1 - smoothstep(0.05, 0.55, sunVeil);
    if (sunScreenDist < Math.max(screenW, screenH) * 0.85 && ghostVeil > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const ghostAlpha = (0.055 + 0.04 * twilight) * (1 - sunScreenDist / (Math.max(screenW, screenH) * 0.9)) * ghostVeil;
        if (ghostAlpha > 0.004) {
            if (!drawCelestialSunAndGodRays._ghostCache) drawCelestialSunAndGodRays._ghostCache = new Map();
            const ghosts = [
                { t: 0.45, r: 16, col: [254, 240, 138] },
                { t: 0.82, r: 28, col: sunsetCol },
                { t: 1.28, r: 11, col: [125, 211, 252] },
                { t: 1.55, r: 36, col: sunsetCol }
            ];
            const prevAlpha = ctx.globalAlpha;
            for (const gh of ghosts) {
                const gx = sunX + dxCenter * gh.t;
                const gy = sunY + dyCenter * gh.t;
                const qr = Math.min(255, Math.max(0, (Math.round(gh.col[0]) + 4) >> 3 << 3));
                const qg = Math.min(255, Math.max(0, (Math.round(gh.col[1]) + 4) >> 3 << 3));
                const qb = Math.min(255, Math.max(0, (Math.round(gh.col[2]) + 4) >> 3 << 3));
                const gKey = (qr << 16) | (qg << 8) | qb;
                let gSprite = drawCelestialSunAndGodRays._ghostCache.get(gKey);
                if (!gSprite && typeof document !== 'undefined') {
                    if (drawCelestialSunAndGodRays._ghostCache.size > 24) drawCelestialSunAndGodRays._ghostCache.clear();
                    const gc = document.createElement('canvas');
                    gc.width = 64;
                    gc.height = 64;
                    const gg = gc.getContext('2d');
                    if (gg) {
                        const cs = `${qr}, ${qg}, ${qb}`;
                        const gGrad = gg.createRadialGradient(32, 32, 6, 32, 32, 32);
                        gGrad.addColorStop(0, `rgba(${cs}, 0.35)`);
                        gGrad.addColorStop(0.75, `rgba(${cs}, 0.85)`);
                        gGrad.addColorStop(0.95, `rgba(${cs}, 0.2)`);
                        gGrad.addColorStop(1, 'rgba(0,0,0,0)');
                        gg.fillStyle = gGrad;
                        gg.fillRect(0, 0, 64, 64);
                        gSprite = gc;
                        drawCelestialSunAndGodRays._ghostCache.set(gKey, gSprite);
                    }
                }
                if (gSprite) {
                    ctx.globalAlpha = prevAlpha * ghostAlpha;
                    ctx.drawImage(gSprite, gx - gh.r, gy - gh.r, gh.r * 2, gh.r * 2);
                }
            }
        }
        ctx.restore();
    }

    // 5. Disco Solar Fotométrico (Fotosfera con oscurecimiento de limbo y veladura nubosa)
    const baseDiskR = (sunVis.type === 'alto_sunset') ? 38 : (sunVis.type === 'copper' ? 32 : 28);
    const sunR = lerp(22, baseDiskR, atmoBlend);
    const diskRGB = atmoBlend > 0.15 ? curSunRGB : [255, 253, 245];

    // Corona interior difusa
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const innerCorona = ctx.createRadialGradient(sunX, sunY, sunR * 0.85, sunX, sunY, sunR * lerp(1.9, 2.4, sunVeil));
    innerCorona.addColorStop(0, rgbStr(diskRGB, lerp(0.55, 0.10, sunVeil)));
    innerCorona.addColorStop(0.5, rgbStr(sunsetCol, lerp(0.18, 0.04, sunVeil)));
    innerCorona.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = innerCorona;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * lerp(1.9, 2.4, sunVeil), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Fotosfera con limb-darkening realista y atenuación orgánica detrás de las nubes
    const discAlpha = lerp(1.0, 0.12, Math.pow(sunVeil, 0.85));
    const coreRGB = lerpRGB([255, 255, 255], diskRGB, sunVeil * 0.85);
    const diskGrad = ctx.createRadialGradient(sunX - sunR * 0.12, sunY - sunR * 0.12, sunR * 0.05, sunX, sunY, sunR);
    diskGrad.addColorStop(0.00, rgbStr(coreRGB, discAlpha));
    diskGrad.addColorStop(0.68, rgbStr(lerpRGB([255, 255, 255], diskRGB, 0.55), 0.98 * discAlpha));
    diskGrad.addColorStop(0.92, rgbStr(diskRGB, lerp(0.96, 0.55, sunVeil) * discAlpha));
    diskGrad.addColorStop(1.00, rgbStr(lerpRGB(diskRGB, sunsetCol, 0.45), lerp(0.85, 0.22, sunVeil) * discAlpha));
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/**
 * Renderiza la bruma y niebla atmosférica en cota baja y valles adaptada al ciclo solar:
 * brillante y luminosa de día, cálida en el crepúsculo y oscura/tenue de noche.
 */
function drawAtmosphericDepthFog(pNear, atmoW, timeSec) {
    if (!pNear || atmoW <= 0.05) return;
    const arch = pNear.archetype;
    const col = pNear.colors || {};
    const baseFogCol = col.condensationColor || arch.condensationColor || [244, 235, 225];
    const sunsetCol = col.sunsetRGB || arch.sunsetRGB || [251, 146, 60];
    const nightSky = col.nightSkyRGB || arch.nightSkyRGB || [6, 10, 20];
    const solar = ship.currentSolarState;

    const dayW = solar ? solar.dayFactor : 1.0;
    const twiW = solar ? solar.twilightFactor : 0.0;
    const nightW = solar ? solar.nightFactor : 0.0;
    const cloudOv = clamp((ship && ship.cloudOvercast) ? ship.cloudOvercast : 0, 0, 1);
    const localFog = clamp((ship && ship.localFogDensity) ? ship.localFogDensity : 0, 0, 1);
    const localFogRGB = (ship && ship.localFogColor) ? ship.localFogColor : baseFogCol;
    const fogNightGlow = clamp((ship && ship.localFogNightGlow) ? ship.localFogNightGlow : 0, 0, 1);

    // Fusión cromática de la niebla según el ciclo solar
    let curFog = lerpRGB(baseFogCol, [255, 252, 245], 0.35); // Día brillante
    if (localFog > 0.02) {
        curFog = lerpRGB(curFog, localFogRGB, clamp(localFog * 0.75, 0, 0.85));
    }
    if (twiW > 0.01) curFog = lerpRGB(curFog, sunsetCol, twiW * 0.65);
    if (cloudOv > 0.01 && (dayW + twiW) > 0.01) {
        const overcastMist = lerpRGB(camera.skyColor || [60, 75, 95], baseFogCol, 0.35);
        curFog = lerpRGB(curFog, overcastMist, cloudOv * 0.68 * clamp(dayW + twiW, 0, 1));
    }
    if (nightW > 0.01) {
        const nightMistTarget = lerpRGB(nightSky, localFogRGB, fogNightGlow * 0.42);
        curFog = lerpRGB(curFog, nightMistTarget, nightW * (0.88 - fogNightGlow * 0.16));
    }

    // En la noche la niebla es tenue y oscura para preservar el negro profundo nocturno;
    // al sumergirse en un banco de niebla o mundo brumoso, la bruma de horizonte se intensifica suavemente.
    const baseAlpha = (0.24 * dayW + 0.30 * twiW + (0.06 + fogNightGlow * 0.10) * nightW) * atmoW;
    const fogBoost = localFog * (0.24 * dayW + 0.26 * twiW + (0.06 + fogNightGlow * 0.12) * nightW) * smoothstep(0.05, 0.35, atmoW);
    const alpha = clamp(baseAlpha + fogBoost, 0, 0.56);
    const fogTopFrac = lerp(0.60, 0.34, localFog);

    ctx.save();
    const fogGrad = ctx.createLinearGradient(0, screenH, 0, screenH * fogTopFrac);
    fogGrad.addColorStop(0, rgbStr(curFog, alpha));
    fogGrad.addColorStop(0.45, rgbStr(curFog, alpha * 0.42));
    fogGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, screenH * Math.max(0.25, fogTopFrac - 0.05), screenW, screenH * (1 - Math.max(0.25, fogTopFrac - 0.05)));
    ctx.restore();
}

/**
 * Calcula el rango angular visible [kMin..kMax] y el paso adaptativo (stride) sobre p.heights
 * para renderizar con máxima resolución en superficie (stride=1) y costo O(1) constante en cualquier escala.
 */
function getPlanetRenderArc(p, maxPoints = 320) {
    const total = (p && p.heights && p.heights.length) ? p.heights.length : 360;
    const dTheta = (Math.PI * 2) / total;
    const screenR = p.radius * camera.zoom;
    const maxScreenDim = Math.max(screenW || 1280, screenH || 720);

    // Si el planeta entra completo o casi completo en pantalla, dibujamos los 360° con stride uniforme
    if (screenR < maxScreenDim * 0.85) {
        const stride = Math.max(1, Math.floor(total / maxPoints));
        return { total, dTheta, partialArc: false, kMin: 0, kMax: total, stride };
    }

    const camAngle = Math.atan2(camera.y - p.y, camera.x - p.x);
    const halfViewWorld = (Math.hypot(screenW || 1280, screenH || 720) * 0.5) / Math.max(0.004, camera.zoom) + 360;
    const refR = Math.max(300, p.maxSurfaceRadius || p.radius);
    const halfArc = clamp((halfViewWorld * 1.48) / refR, 0.018, Math.PI * 0.92);

    let kMin = Math.floor((camAngle - halfArc) / dTheta);
    let kMax = Math.ceil((camAngle + halfArc) / dTheta);
    const spanK = Math.max(1, kMax - kMin);
    const stride = spanK <= maxPoints ? 1 : Math.max(1, Math.ceil(spanK / maxPoints));
    if (stride > 1) {
        kMin = Math.floor(kMin / stride) * stride;
        kMax = Math.ceil(kMax / stride) * stride;
    }
    return { total, dTheta, partialArc: true, kMin, kMax, stride };
}

/**
 * Renderiza capas de siluetas de cordilleras y dunas en la lejanía (Paralaje atmosférico cinemático)
 * con perspectiva aérea real, desvanecimiento en la bruma del horizonte y opacidad gradual.
 */
function drawPlanetBackgroundRidges(p, timeSec, colors, arch) {
    if (!p.hasBackgroundRidges) return;
    if (typeof ship !== 'undefined' && (ship.cavernDepthBlend || 0) > 0.88) return;
    const distCam = Math.hypot(camera.x - p.x, camera.y - p.y) - p.radius;
    const maxRidgeDist = Math.max(2400, (p.atmoRadius - p.radius) * 0.80);
    if (distCam > maxRidgeDist) return;

    const atmoW = smoothstep(maxRidgeDist, maxRidgeDist * 0.42, distCam);
    if (atmoW <= 0.01) return;

    const sizeSqrt = Math.sqrt(p.radius / 2600);
    let relief = (arch.reliefAmplitude || 1.3) * sizeSqrt;
    if (arch.isAlpineTitans) relief *= 2.1;
    if (arch.isZenDunes) relief *= 0.35;
    const freqScale = Math.max(1, Math.round(sizeSqrt));
    const skyCol = camera.skyColor || [14, 38, 72];
    const crustCol = colors.crustColor || arch.crustColor || [52, 70, 90];
    const hazeCol = colors.condensationColor || arch.condensationColor || skyCol;
    const sunsetCol = colors.sunsetRGB || arch.sunsetRGB || [251, 146, 60];
    const nightDeepSky = colors.nightSkyRGB ? lerpRGB([1, 2, 5], colors.nightSkyRGB, 0.16) : [2, 3, 7];
    const nightCol = lerpRGB(nightDeepSky, crustCol, 0.10);
    const seed = ((p.surfaceSeed || 0.42) * 17.29) % 10;

    // Estado solar y de tormenta local para coherencia atmosférica de montañas y brumas
    const localSolar = (typeof getPlanetSolarState === 'function')
        ? ((p === ship.nearestPlanet && ship.currentSolarState) ? ship.currentSolarState : getPlanetSolarState(p, camera.x, camera.y, timeSec))
        : null;
    const localNightF = localSolar ? clamp(localSolar.nightFactor, 0, 1) : 0;
    const localTwiF = localSolar ? clamp(localSolar.twilightFactor, 0, 1) : 0;
    const stormInfo = (typeof getLocalStormDarkness === 'function' && p === ship.nearestPlanet)
        ? getLocalStormDarkness(p)
        : { worldDark: 0, tint: [36, 46, 66] };
    const stormDark = stormInfo.worldDark || 0;
    const applyStormToRidge = (rgb) => stormDark > 0.01 ? lerpRGB(rgb, stormInfo.tint, stormDark * 0.85) : rgb;

    const sunX = p.x + Math.cos(p.lightAngle) * p.radius;
    const sunY = p.y + Math.sin(p.lightAngle) * p.radius;
    const antiSunX = p.x - Math.cos(p.lightAngle) * p.radius;
    const antiSunY = p.y - Math.sin(p.lightAngle) * p.radius;

    ctx.save();
    if (atmoW < 0.999) {
        ctx.globalAlpha *= atmoW;
    }

    const camAngle = Math.atan2(camera.y - p.y, camera.x - p.x);
    const halfViewWorld = (Math.hypot(screenW, screenH) * 0.5) / Math.max(0.01, camera.zoom);
    const halfArc = clamp((halfViewWorld * 1.55) / Math.max(400, p.radius), 0.04, Math.PI);
    const partialArc = halfArc < Math.PI * 0.90;
    const fixedGridCount = clamp(Math.round((Math.PI * 2 * p.radius) / 90), 180, 4096);
    const gridStep = (Math.PI * 2) / fixedGridCount;
    let kMin = 0;
    let kMax = fixedGridCount;
    let stride = 1;
    if (partialArc) {
        kMin = Math.floor((camAngle - halfArc) / gridStep);
        kMax = Math.ceil((camAngle + halfArc) / gridStep);
        const spanK = kMax - kMin;
        if (spanK > 240) {
            stride = Math.pow(2, Math.ceil(Math.log2(spanK / 180)));
            kMin = Math.floor(kMin / stride) * stride;
            kMax = Math.ceil(kMax / stride) * stride;
        }
    } else if (fixedGridCount > 240) {
        stride = Math.max(1, Math.floor(fixedGridCount / 200));
    }
    const rimCol = colors.rimColor || arch.rimColor || [254, 215, 170];
    const isDunes = !!arch.isZenDunes;

    // Función de perfil montañoso "Ridged Multifractal" (cumbres nítidas o dunas suaves)
    function sampleRidgeWave(theta, freqA, freqB, freqC, phase) {
        const fA = freqA * freqScale;
        const fB = freqB * freqScale;
        const fC = freqC * freqScale;
        if (arch.classId === 'megalithic') {
            const rawM = Math.sin(theta * fA + phase) * 0.75 + Math.cos(theta * fB + phase * 1.2) * 0.35;
            return Math.round(rawM * 2.5) / 2.5;
        }
        if (arch.classId === 'living') {
            return Math.abs(Math.sin(theta * fA * 0.8 + phase)) * 1.1 + Math.sin(theta * fB + phase) * 0.25 - 0.35;
        }
        if (arch.classId === 'shattered' || arch.classId === 'cometary') {
            return Math.pow(1 - Math.abs(Math.sin(theta * fA + phase)), 2.2) * 2.2 - 0.65 + Math.sin(theta * fC) * 0.25;
        }
        if (isDunes) {
            return Math.sin(theta * fA + phase) * 0.6 + Math.sin(theta * fB + phase * 1.4) * 0.3 + Math.cos(theta * fC) * 0.1;
        }
        const r1 = 1 - Math.abs(Math.sin(theta * fA + phase));
        const r2 = 1 - Math.abs(Math.sin(theta * fB + phase * 1.6));
        const r3 = Math.cos(theta * fC + phase * 2.1) * 0.5 + 0.5;
        return (r1 * r1 * 0.62 + r2 * r2 * 0.28 + r3 * 0.10) * 2 - 0.85;
    }

    function buildAndDrawRidgeLayer(freqA, freqB, freqC, phase, amp, baseH, grad, rimHighlightAlpha) {
        const hasProv = !!(p.provinces && p.provinces.length > 0 && typeof getPlanetProvinceAtAngle === 'function');
        ctx.beginPath();
        let first = true;
        for (let k = kMin; k <= kMax; k += stride) {
            const theta = k * gridStep;
            let bgMult = 1.0;
            if (hasProv) {
                const pv = getPlanetProvinceAtAngle(p, theta);
                if (pv && pv.spec && pv.spec.bgRidgeMult !== undefined) {
                    bgMult = pv.spec.bgRidgeMult;
                }
            }
            const surfLift = (p.heights && p.heights.length > 0 && typeof sampleHeightArray === 'function')
                ? clamp((sampleHeightArray(p.heights, theta, p.radius) - p.radius) * 0.28, -24, 160)
                : 0;
            const wave = sampleRidgeWave(theta, freqA, freqB, freqC, phase) * amp * bgMult;
            const rawAlt = wave * relief + baseH * (0.65 + 0.35 * bgMult) + surfLift;
            // Fondo suave sin escalón duro plano en depresiones
            const smoothAlt = rawAlt > 4 ? rawAlt : 4 + Math.atan((rawAlt - 4) * 0.08) * 14;
            const r = p.radius + smoothAlt;
            const vx = p.x + Math.cos(theta) * r;
            const vy = p.y + Math.sin(theta) * r;
            if (first) {
                ctx.moveTo(vx, vy);
                first = false;
            } else {
                ctx.lineTo(vx, vy);
            }
        }
        const effRimAlpha = rimHighlightAlpha * (1 - stormDark * 0.85);
        if (effRimAlpha > 0.01) {
            const crestGrad = ctx.createLinearGradient(sunX, sunY, antiSunX, antiSunY);
            crestGrad.addColorStop(0.00, rgbStr(lerpRGB(rimCol, [255, 255, 255], 0.45), effRimAlpha * atmoW));
            crestGrad.addColorStop(0.45, rgbStr(sunsetCol, effRimAlpha * 0.45 * atmoW));
            crestGrad.addColorStop(0.62, 'rgba(0,0,0,0)');
            crestGrad.addColorStop(1.00, 'rgba(0,0,0,0)');
            ctx.strokeStyle = crestGrad;
            ctx.lineWidth = 1.25;
            ctx.stroke();
        }
        if (partialArc) {
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
    }

    // Perspectiva aérea opaca: las cordilleras bloquean completamente el fondo estelar/espacial,
    // simulando la dispersión atmosférica y neblina mediante mezcla de color y velos de bruma entre capas.
    const atmoHaze = applyStormToRidge(lerpRGB(skyCol, hazeCol, 0.38 * (1 - stormDark * 0.65)));
    const twilightHaze = applyStormToRidge(lerpRGB(atmoHaze, sunsetCol, 0.28 * (1 - stormDark * 0.70)));
    const nightAtmo = lerpRGB(nightDeepSky, nightCol, 0.25);

    const dayMistBase = applyStormToRidge(lerpRGB(skyCol, hazeCol, 0.55 * (1 - stormDark * 0.70)));
    const twiMistBase = applyStormToRidge(lerpRGB(dayMistBase, sunsetCol, 0.30 * (1 - stormDark * 0.65)));
    const nightMistBase = lerpRGB(nightDeepSky, nightCol, 0.20);
    const valleyMistCol = lerpRGB(
        lerpRGB(dayMistBase, twiMistBase, localTwiF),
        nightMistBase,
        localNightF
    );
    const mistNightFade = lerp(1.0, 0.28, localNightF) * lerp(1.0, 0.65, stormDark);

    // --- CAPA 3: CORDILLERA REMOTA FIJA EN LA GEOLOGÍA DEL PLANETA ---
    const farCol = applyStormToRidge(lerpRGB(atmoHaze, crustCol, 0.16));
    const twiFarCol = applyStormToRidge(lerpRGB(twilightHaze, crustCol, 0.20));
    const nightFarCol = lerpRGB(nightAtmo, crustCol, 0.04);
    const nightDeepFarCol = lerpRGB(nightAtmo, crustCol, 0.02);
    const ridgeGrad3 = ctx.createLinearGradient(sunX, sunY, antiSunX, antiSunY);
    ridgeGrad3.addColorStop(0.00, rgbStr(farCol, 1.0));
    ridgeGrad3.addColorStop(0.35, rgbStr(farCol, 1.0));
    ridgeGrad3.addColorStop(0.55, rgbStr(twiFarCol, 1.0));
    ridgeGrad3.addColorStop(0.70, rgbStr(nightFarCol, 1.0));
    ridgeGrad3.addColorStop(1.00, rgbStr(nightDeepFarCol, 1.0));
    buildAndDrawRidgeLayer(7, 15, 31, seed, 72, 54, ridgeGrad3, 0.16);

    // Velo de bruma entre la cordillera remota y la intermedia (desvanecido en ambos extremos para evitar bordes circulares en cañones)
    const minSurfR = Math.max(200, (p.minSurfaceRadius || p.radius) - 18);
    const hazeR3 = Math.max(p.radius + 42 * relief, minSurfR + 60);
    const hazeGrad3 = ctx.createRadialGradient(p.x, p.y, minSurfR, p.x, p.y, hazeR3 + 42);
    hazeGrad3.addColorStop(0.00, 'rgba(0,0,0,0)');
    hazeGrad3.addColorStop(0.28, rgbStr(valleyMistCol, 0.34 * mistNightFade));
    hazeGrad3.addColorStop(0.65, rgbStr(valleyMistCol, 0.15 * mistNightFade));
    hazeGrad3.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.fillStyle = hazeGrad3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, hazeR3 + 42, 0, Math.PI * 2);
    ctx.fill();

    // --- CAPA 2: MACIZO INTERMEDIO FIJO ---
    const midCol = applyStormToRidge(lerpRGB(atmoHaze, crustCol, 0.44));
    const twiMidCol = applyStormToRidge(lerpRGB(twilightHaze, crustCol, 0.46));
    const nightMidCol = lerpRGB(nightAtmo, crustCol, 0.08);
    const nightDeepMidCol = lerpRGB(nightAtmo, crustCol, 0.05);
    const ridgeGrad2 = ctx.createLinearGradient(sunX, sunY, antiSunX, antiSunY);
    ridgeGrad2.addColorStop(0.00, rgbStr(midCol, 1.0));
    ridgeGrad2.addColorStop(0.35, rgbStr(midCol, 1.0));
    ridgeGrad2.addColorStop(0.55, rgbStr(twiMidCol, 1.0));
    ridgeGrad2.addColorStop(0.70, rgbStr(nightMidCol, 1.0));
    ridgeGrad2.addColorStop(1.00, rgbStr(nightDeepMidCol, 1.0));
    buildAndDrawRidgeLayer(11, 23, 43, seed * 2.2, 48, 30, ridgeGrad2, 0.24);

    // Bruma ligera de valle entre macizo intermedio y colinas próximas
    const hazeR2 = Math.max(p.radius + 24 * relief, minSurfR + 40);
    const hazeGrad2 = ctx.createRadialGradient(p.x, p.y, minSurfR, p.x, p.y, hazeR2 + 28);
    hazeGrad2.addColorStop(0.00, 'rgba(0,0,0,0)');
    hazeGrad2.addColorStop(0.32, rgbStr(valleyMistCol, 0.24 * mistNightFade));
    hazeGrad2.addColorStop(0.70, rgbStr(valleyMistCol, 0.09 * mistNightFade));
    hazeGrad2.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.fillStyle = hazeGrad2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, hazeR2 + 28, 0, Math.PI * 2);
    ctx.fill();

    // --- CAPA 1: COLINAS DE FONDO PRÓXIMAS FIJAS ---
    const nearCol = applyStormToRidge(lerpRGB(atmoHaze, crustCol, 0.74));
    const twiNearCol = applyStormToRidge(lerpRGB(twilightHaze, crustCol, 0.72));
    const nightNearCol = lerpRGB(nightAtmo, crustCol, 0.14);
    const nightDeepNearCol = lerpRGB(nightAtmo, crustCol, 0.09);
    const ridgeGrad1 = ctx.createLinearGradient(sunX, sunY, antiSunX, antiSunY);
    ridgeGrad1.addColorStop(0.00, rgbStr(nearCol, 1.0));
    ridgeGrad1.addColorStop(0.35, rgbStr(nearCol, 1.0));
    ridgeGrad1.addColorStop(0.55, rgbStr(twiNearCol, 1.0));
    ridgeGrad1.addColorStop(0.70, rgbStr(nightNearCol, 1.0));
    ridgeGrad1.addColorStop(1.00, rgbStr(nightDeepNearCol, 1.0));
    buildAndDrawRidgeLayer(17, 31, 59, seed * 3.4, 30, 16, ridgeGrad1, 0.32);

    // Bruma suave en la base de las colinas próximas para separarlas del primer plano
    const hazeR1 = Math.max(p.radius + 14 * relief, minSurfR + 26);
    const hazeGrad1 = ctx.createRadialGradient(p.x, p.y, minSurfR, p.x, p.y, hazeR1 + 18);
    hazeGrad1.addColorStop(0.00, 'rgba(0,0,0,0)');
    hazeGrad1.addColorStop(0.35, rgbStr(valleyMistCol, 0.14 * mistNightFade));
    hazeGrad1.addColorStop(0.75, rgbStr(valleyMistCol, 0.04 * mistNightFade));
    hazeGrad1.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.fillStyle = hazeGrad1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, hazeR1 + 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/**
 * Renderiza banderas de oración ondeando en el viento de las cumbres (Firma visual de Alto's Adventure)
 */
function drawPrayerFlags(p, prop, timeSec, colors, arch) {
    const centerR = getSurfaceRadius(p, prop.angle);
    const poleH = 20;
    const spanAng = 0.012; // Separación angular entre los dos mástiles
    
    const theta0 = prop.angle - spanAng * 0.5;
    const theta1 = prop.angle + spanAng * 0.5;
    
    const r0 = getSurfaceRadius(p, theta0);
    const r1 = getSurfaceRadius(p, theta1);
    
    // Coordenadas base y punta del mástil 1
    const p0BaseX = p.x + Math.cos(theta0) * r0;
    const p0BaseY = p.y + Math.sin(theta0) * r0;
    const p0TopX = p.x + Math.cos(theta0) * (r0 + poleH);
    const p0TopY = p.y + Math.sin(theta0) * (r0 + poleH);
    
    // Coordenadas base y punta del mástil 2
    const p1BaseX = p.x + Math.cos(theta1) * r1;
    const p1BaseY = p.y + Math.sin(theta1) * r1;
    const p1TopX = p.x + Math.cos(theta1) * (r1 + poleH);
    const p1TopY = p.y + Math.sin(theta1) * (r1 + poleH);
    
    ctx.save();
    
    // Mástiles de bambú / madera rústica
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p0BaseX, p0BaseY); ctx.lineTo(p0TopX, p0TopY);
    ctx.moveTo(p1BaseX, p1BaseY); ctx.lineTo(p1TopX, p1TopY);
    ctx.stroke();
    
    // Cuerda catenaria ondulante
    const midX = (p0TopX + p1TopX) * 0.5;
    const midY = (p0TopY + p1TopY) * 0.5;
    const sag = 6.0;
    const normX = Math.cos(prop.angle);
    const normY = Math.sin(prop.angle);
    const ctrlX = midX - normX * sag;
    const ctrlY = midY - normY * sag;

    const sunDot = Math.cos(prop.angle - (p.lightAngle || -Math.PI * 0.35));
    const nightWeight = smoothstep(0.25, -0.35, sunDot);
    const twiWeight = Math.exp(-Math.pow(sunDot / 0.24, 2)) * smoothstep(-0.16, 0.08, sunDot);
    
    ctx.strokeStyle = `rgba(255, 255, 255, ${lerp(0.45, 0.14, nightWeight)})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(p0TopX, p0TopY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, p1TopX, p1TopY);
    ctx.stroke();
    
    // Banderines triangulares de colores de Alto con adaptación orgánica a noche y crepúsculo
    const flagPaletteRGB = [
        [231, 111, 81],
        [244, 162, 97],
        [42, 157, 143],
        [248, 250, 252],
        [224, 122, 95]
    ];
    const numPennants = 5;
    for (let f = 0; f < numPennants; f++) {
        const u = (f + 0.5) / numPennants;
        // Posición sobre la curva cuadrática
        const fx = Math.pow(1 - u, 2) * p0TopX + 2 * (1 - u) * u * ctrlX + Math.pow(u, 2) * p1TopX;
        const fy = Math.pow(1 - u, 2) * p0TopY + 2 * (1 - u) * u * ctrlY + Math.pow(u, 2) * p1TopY;
        
        const flutter = Math.sin(timeSec * 8 + f * 1.2) * 2.8;
        const tangX = -(p1TopY - p0TopY);
        const tangY = (p1TopX - p0TopX);
        const tangLen = Math.hypot(tangX, tangY) || 1;
        const dirX = tangX / tangLen;
        const dirY = tangY / tangLen;
        
        const pLen = 6.5;
        const pTipX = fx - normX * pLen + dirX * flutter;
        const pTipY = fy - normY * pLen + dirY * flutter;
        
        let pCol = flagPaletteRGB[f % flagPaletteRGB.length];
        if (nightWeight > 0.02) {
            const nightFlagCol = (colors && colors.nightSkyRGB)
                ? lerpRGB([15, 23, 42], colors.nightSkyRGB, 0.45)
                : [15, 23, 42];
            pCol = lerpRGB(pCol, nightFlagCol, nightWeight * 0.78);
        }
        if (twiWeight > 0.02) {
            const sunsetCol = (colors && colors.sunsetRGB) || [251, 146, 60];
            pCol = lerpRGB(pCol, sunsetCol, twiWeight * 0.45);
        }

        ctx.fillStyle = rgbStr(pCol, 1);
        ctx.beginPath();
        ctx.moveTo(fx - dirX * 2, fy - dirY * 2);
        ctx.lineTo(fx + dirX * 2, fy + dirY * 2);
        ctx.lineTo(pTipX, pTipY);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

/**
 * Renderiza la sombra que proyectan los anillos sobre la superficie iluminada del planeta,
 * incluyendo la hendidura brillante correspondiente a la División de Cassini.
 */
function drawPlanetRingShadowOnGlobe(p, timeSec) {
    if (!p.hasRings) return;
    const distCamSurf = Math.hypot(p.x - camera.x, p.y - camera.y) - p.radius;
    const orbitalFade = smoothstep(p.radius * 0.08, p.radius * 0.35, distCamSurf);
    if (orbitalFade <= 0.01) return;

    const tilt = p.ringTilt || 0.25;
    const inclination = p.ringInclination || 0.28;
    const lightAng = p.lightAngle || 0;
    const relSun = lightAng - tilt;

    ctx.save();
    ctx.globalAlpha *= orbitalFade;
    ctx.translate(p.x, p.y);
    ctx.rotate(tilt);

    const shadowOffset = -Math.sin(relSun) * p.radius * 0.22;
    const ringW = p.radius * 0.20;

    // Sombra fotométrica de los anillos con hendidura brillante (División de Cassini)
    const shadowGrad = ctx.createLinearGradient(0, shadowOffset - ringW, 0, shadowOffset + ringW);
    shadowGrad.addColorStop(0.00, 'rgba(0,0,0,0)');
    shadowGrad.addColorStop(0.18, 'rgba(4,6,14,0.48)');  // Anillo A
    shadowGrad.addColorStop(0.36, 'rgba(4,6,14,0.62)');
    shadowGrad.addColorStop(0.43, 'rgba(0,0,0,0.03)');   // División de Cassini (luz solar filtrada)
    shadowGrad.addColorStop(0.51, 'rgba(4,6,14,0.78)');  // Anillo B denso
    shadowGrad.addColorStop(0.75, 'rgba(4,6,14,0.68)');
    shadowGrad.addColorStop(0.90, 'rgba(4,6,14,0.24)');  // Anillo C
    shadowGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

    // Atenuar en los extremos horizontales (curvatura hacia el terminador)
    const sunSideSign = Math.cos(relSun);
    const fadeGrad = ctx.createLinearGradient(-p.radius * 0.96, 0, p.radius * 0.96, 0);
    if (sunSideSign >= 0) {
        fadeGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
        fadeGrad.addColorStop(0.42, 'rgba(0,0,0,0.45)');
        fadeGrad.addColorStop(0.85, 'rgba(0,0,0,0.95)');
        fadeGrad.addColorStop(1.0, 'rgba(0,0,0,0.2)');
    } else {
        fadeGrad.addColorStop(0.0, 'rgba(0,0,0,0.2)');
        fadeGrad.addColorStop(0.15, 'rgba(0,0,0,0.95)');
        fadeGrad.addColorStop(0.58, 'rgba(0,0,0,0.45)');
        fadeGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
    }

    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, shadowOffset, p.radius * 0.97, p.radius * inclination * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/**
 * Renderiza la superficie macroscópica y esférica del planeta desde la órbita y aproximación:
 * - Volumen 3D con curvatura normal real e iluminación direccional del Sol central.
 * - Texturas proceduradas ricas y exclusivas por familia de mundos:
 *   * Gigantes Gaseosos: Cinturones zonales turbulentos, rizos de Kelvin-Helmholtz y Vórtices Ciclónicos Ovales.
 *   * Telúricos y Oceánicos: Continentes con costas fracturadas, plataformas coralinas turquesas y cordilleras.
 *   * Volcánicos: Placas basálticas con red de fisuras de lava que brillan incandescentes en la noche.
 *   * Criogénicos: Campos de hielo fracturados con "tiger stripes" de agua subsuperficial y grietas cobalto.
 *   * Desiertos: Grandes cañones tectónicos (estilo Valles Marineris) y mares de dunas eólicas.
 *   * Cristalinos: Terrazas geométricas facetadas e iridiscencia mineral piezoeléctrica.
 * - Casquetes polares glaciares en los polos norte y sur con bordes de sublimación.
 * - Sombra curva proyectada por los anillos sobre el hemisferio iluminado.
 * - Resplandor térmico, volcánico y bioluminiscente en el hemisferio nocturno.
 */
function drawPlanetMacroSurface(p, timeSec, colors, arch) {
    const sunX = p.x + Math.cos(p.lightAngle) * p.radius;
    const sunY = p.y + Math.sin(p.lightAngle) * p.radius;
    const antiSunX = p.x - Math.cos(p.lightAngle) * p.radius;
    const antiSunY = p.y - Math.sin(p.lightAngle) * p.radius;

    const litCol = colors.litColor || arch.litColor;
    const crustCol = colors.crustColor || arch.crustColor;
    const coreCol = colors.coreColor || arch.coreColor;
    const rimCol = colors.rimColor || arch.rimColor;
    const accentCol = colors.accentColor || arch.accentColor || rimCol;
    const topsoilCol = colors.topsoilColor || arch.topsoilColor || litCol;
    const sunsetCol = colors.sunsetRGB || arch.sunsetRGB || [251, 146, 60];
    const nightCol = lerpRGB(coreCol, [2, 4, 9], 0.90);
    const deepNightCol = [1, 2, 4];

    const brightLitCol = [
        Math.min(255, Math.round(litCol[0] * 1.28 + 24)),
        Math.min(255, Math.round(litCol[1] * 1.28 + 24)),
        Math.min(255, Math.round(litCol[2] * 1.28 + 24))
    ];

    const maxR = p.maxSurfaceRadius || p.radius;
    const mapR = maxR * 1.04;

    // 1. Base del Cuerpo Planetario Sólido: Núcleo y Manto Geológicos (radio extendido a maxR para no cortar montañas)
    const coreGrad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.10, p.x, p.y, maxR * 1.04);
    coreGrad.addColorStop(0.00, rgbStr(coreCol, 1));
    coreGrad.addColorStop(0.55, rgbStr(crustCol, 1));
    coreGrad.addColorStop(0.88, rgbStr(topsoilCol, 1));
    coreGrad.addColorStop(1.00, rgbStr(litCol, 1));
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // 2. Iluminación Solar Diurna 3D Volumétrica (Curvatura esférica con isolíneas curvas naturales, nunca líneas rectas)
    const lx = p.x + Math.cos(p.lightAngle) * maxR * 0.40;
    const ly = p.y + Math.sin(p.lightAngle) * maxR * 0.40;
    const sphDayGrad = ctx.createRadialGradient(lx, ly, maxR * 0.05, lx, ly, maxR * 1.25);
    sphDayGrad.addColorStop(0.00, rgbStr(brightLitCol, 0.95));
    sphDayGrad.addColorStop(0.35, rgbStr(litCol, 0.70));
    sphDayGrad.addColorStop(0.68, rgbStr(crustCol, 0.35));
    sphDayGrad.addColorStop(0.88, 'rgba(0, 0, 0, 0)');
    sphDayGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sphDayGrad;
    ctx.fill();

    // 2.5. Curvatura Normal Esférica (Atenuación volumétrica en el limbo, ajustada a maxR)
    const sphGrad = ctx.createRadialGradient(lx, ly, maxR * 0.05, p.x, p.y, maxR * 1.04);
    sphGrad.addColorStop(0.00, 'rgba(255,255,255,0.18)');
    sphGrad.addColorStop(0.48, 'rgba(255,255,255,0.0)');
    sphGrad.addColorStop(0.86, 'rgba(0,0,0,0.10)');
    sphGrad.addColorStop(1.00, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = sphGrad;
    ctx.fill();

    // 3. TEXTURIZADO ESFÉRICO 3D PRE-RENDERIZADO POR FAMILIA DE PLANETAS (se desvanece en vuelo bajo para evitar círculos/píxeles estirados)
    const isVolcanic = (arch.classId === 'volcanic' || arch.id.includes('caldera') || arch.id.includes('magma'));
    const isNearest = (ship.nearestPlanet && ship.nearestPlanet.id === p.id);
    const distCamSurf = Math.hypot(camera.x - p.x, camera.y - p.y) - p.radius;
    const macroFade = clamp(1 - smoothstep(0.14, 0.42, camera.zoom), 0, 1) * smoothstep(220, Math.max(1200, p.radius * 0.14), distCamSurf);
    const bakedMaps = (macroFade > 0.03 && typeof PlanetSurfaceBake !== 'undefined')
        ? PlanetSurfaceBake.getSurfaceMaps(p, isNearest)
        : null;

    if (bakedMaps && bakedMaps.albedo && macroFade > 0.03) {
        ctx.save();
        ctx.globalAlpha = 0.94 * macroFade;
        ctx.drawImage(bakedMaps.albedo, p.x - mapR, p.y - mapR, mapR * 2, mapR * 2);
        ctx.restore();
    }

    // 4.5. CAPA MAESTRA DE ILUMINACIÓN SOLAR Y SOMBRA NOCTURNA ESFÉRICA 3D
    // A. Realce solar esférico diurno sobre formaciones y continentes iluminados
    const dayShine = ctx.createRadialGradient(lx, ly, maxR * 0.08, p.x, p.y, maxR * 1.08);
    dayShine.addColorStop(0.00, 'rgba(255, 255, 255, 0.26)');
    dayShine.addColorStop(0.28, 'rgba(255, 250, 240, 0.14)');
    dayShine.addColorStop(0.55, 'rgba(255, 245, 225, 0.03)');
    dayShine.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
    dayShine.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    ctx.beginPath();
    ctx.arc(p.x, p.y, maxR * 1.05, 0, Math.PI * 2);
    ctx.fillStyle = dayShine;
    ctx.fill();

    // B. Sombra nocturna esférica con terminador curvo 3D
    const darkFocusX = p.x - Math.cos(p.lightAngle) * (maxR * 0.60);
    const darkFocusY = p.y - Math.sin(p.lightAngle) * (maxR * 0.60);
    const shadowRad = maxR * 1.60;

    const globeShadow = ctx.createRadialGradient(
        darkFocusX, darkFocusY, maxR * 0.10,
        darkFocusX, darkFocusY, shadowRad
    );
    globeShadow.addColorStop(0.00, rgbStr(deepNightCol, 0.98));
    globeShadow.addColorStop(0.38, rgbStr(nightCol, 0.92));
    globeShadow.addColorStop(0.58, rgbStr(nightCol, 0.62));
    globeShadow.addColorStop(0.75, 'rgba(0, 0, 0, 0.18)');
    globeShadow.addColorStop(0.92, 'rgba(0, 0, 0, 0)');
    globeShadow.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    ctx.beginPath();
    ctx.arc(p.x, p.y, maxR * 1.05, 0, Math.PI * 2);
    ctx.fillStyle = globeShadow;
    ctx.fill();

    // B2. Velo de tormenta local sobre la superficie macroscópica cuando el observador está bajo frente de tormenta
    if (typeof getLocalStormDarkness === 'function' && p === ship.nearestPlanet) {
        const stInfo = getLocalStormDarkness(p);
        if (stInfo.worldDark > 0.01) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, maxR * 1.05, 0, Math.PI * 2);
            ctx.fillStyle = rgbStr(stInfo.tint, stInfo.worldDark * 0.78);
            ctx.fill();
        }
    }

    // C. Emisión nocturna que resplandece en la oscuridad (magma, bioluminiscencia, uraninita, fallas y cristales)
    if (bakedMaps && bakedMaps.emissive && macroFade > 0.03) {
        const pulse = isVolcanic
            ? (0.72 + 0.28 * Math.sin(timeSec * 2.6 + (p.surfaceSeed || 0) * 10))
            : (0.62 + 0.30 * Math.sin(timeSec * 1.8 + (p.surfaceSeed || 0) * 10));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = pulse * 0.85 * macroFade;
        ctx.drawImage(bakedMaps.emissive, p.x - mapR, p.y - mapR, mapR * 2, mapR * 2);
        ctx.restore();
    }

    // 5. SOMBRA CURVA DE LOS ANILLOS SOBRE LA CARA ILUMINADA
    if (p.hasRings) {
        drawPlanetRingShadowOnGlobe(p, timeSec);
    }

    // 6. ESTRATIGRAFÍA GEOLÓGICA INTERNA (Solo en proximidad o superficie)
    if (camera.zoom > 0.45) {
        drawPlanetInterior(p, timeSec, colors, arch);
    }
}

/**
 * Renderiza columnas de humo piroclástico continuo y cenizas incandescentes en la cima de los Super-Volcanes
 */
function drawSuperVolcanoPlumes(p, timeSec, colors, arch) {
    if (!p.isSuperVolcano || !p.superVolcanoes || p.superVolcanoes.length === 0) return;
    const accentCol = colors.accentColor || arch.accentColor || [249, 115, 22];
    const smokeCol = colors.launchSmokeColor || arch.launchSmokeColor || [160, 130, 120];

    ctx.save();
    for (const sv of p.superVolcanoes) {
        const calX = p.x + Math.cos(sv.angle) * (p.radius + sv.height - 18);
        const calY = p.y + Math.sin(sv.angle) * (p.radius + sv.height - 18);

        // 1. Resplandor térmico incandescente de la caldera activa
        ctx.globalCompositeOperation = 'lighter';
        const calPulse = 1.0 + Math.sin(timeSec * 2.5 + sv.angle) * 0.15;
        const calR = sv.span * p.radius * 0.28 * calPulse;
        const calGrad = ctx.createRadialGradient(calX, calY, 2, calX, calY, calR);
        calGrad.addColorStop(0.0, 'rgba(254, 240, 138, 0.95)');
        calGrad.addColorStop(0.35, rgbStr(accentCol, 0.85));
        calGrad.addColorStop(0.75, 'rgba(239, 68, 68, 0.45)');
        calGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
        ctx.fillStyle = calGrad;
        ctx.beginPath();
        ctx.arc(calX, calY, calR, 0, Math.PI * 2);
        ctx.fill();

        // 2. Columna de ceniza y humo piroclástico ascendiendo hacia la exosfera
        ctx.globalCompositeOperation = 'source-over';
        const radX = Math.cos(sv.angle);
        const radY = Math.sin(sv.angle);
        const tangX = -radY;
        const tangY = radX;

        const numPuffs = 8;
        for (let k = 1; k <= numPuffs; k++) {
            const progress = (k / numPuffs);
            const driftSine = Math.sin(timeSec * 0.8 + k * 1.2) * 12 * progress;
            const puffDist = progress * 135 * Math.sqrt(p.radius / 2600);
            const px = calX + radX * puffDist + tangX * driftSine;
            const py = calY + radY * puffDist + tangY * driftSine;
            const pRad = (14 + progress * 26) * Math.sqrt(p.radius / 2600);
            const pAlpha = (1.0 - progress * 0.75) * 0.38;

            const puffGrad = ctx.createRadialGradient(px, py, 2, px, py, pRad);
            puffGrad.addColorStop(0, rgbStr(smokeCol, pAlpha));
            puffGrad.addColorStop(0.5, rgbStr(smokeCol, pAlpha * 0.6));
            puffGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = puffGrad;
            ctx.beginPath();
            ctx.arc(px, py, pRad, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Chispas incandescentes que flotan alrededor de la caldera
        ctx.globalCompositeOperation = 'lighter';
        for (let s = 0; s < 5; s++) {
            const sparkAng = timeSec * 1.5 + s * 1.25;
            const sparkDist = (sv.span * p.radius * 0.15) * (0.4 + 0.6 * Math.sin(timeSec * 2.2 + s * 1.8));
            const sx = calX + Math.cos(sparkAng) * sparkDist + radX * (s * 4);
            const sy = calY + Math.sin(sparkAng) * sparkDist + radY * (s * 4);
            ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
            ctx.beginPath();
            ctx.arc(sx, sy, 2.0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

/**
 * Renderiza las bocas de abismo y el interior cavernoso iluminado de los mundos huecos
 */
function drawHollowPlanetCaverns(p, timeSec, colors, arch) {
    if (!p.isHollow) return;
    const rimCol = colors.rimColor || arch.rimColor || [233, 213, 255];
    const accentCol = p.cavernGlowColor || colors.accentColor || arch.accentColor || [56, 189, 248];
    const coreCol = colors.coreColor || arch.coreColor || [14, 12, 26];
    const crustCol = colors.crustColor || arch.crustColor || [38, 24, 60];
    const maxR = p.maxSurfaceRadius || p.radius;

    // 1. Señalización atmosférica y bruma luminosa en las Bocas del Abismo (visibles desde órbita y superficie)
    if (p.caveEntrances && p.caveEntrances.length > 0) {
        ctx.save();
        for (const cave of p.caveEntrances) {
            const sr = getSurfaceRadius(p, cave.centerAngle);
            const bx = p.x + Math.cos(cave.centerAngle) * sr;
            const by = p.y + Math.sin(cave.centerAngle) * sr;
            const mouthR = cave.span * p.radius * 0.58;

            ctx.globalCompositeOperation = 'lighter';
            const mistPulse = 1.0 + Math.sin(timeSec * 2.2 + cave.centerAngle) * 0.16;
            const mistGrad = ctx.createRadialGradient(bx, by, 4, bx, by, mouthR * 1.45 * mistPulse);
            mistGrad.addColorStop(0.0, rgbStr(accentCol, 0.42));
            mistGrad.addColorStop(0.45, rgbStr(rimCol, 0.16));
            mistGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
            ctx.fillStyle = mistGrad;
            ctx.beginPath();
            ctx.arc(bx, by, mouthR * 1.45 * mistPulse, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // Cámara Interior Subterránea Completa (visible tanto en superficie como al despegar y hacer zoom out en órbita)
    if (p.cavernCeilingHeights && p.cavernFloorHeights) {
        const total = p.heights.length;
        const step = Math.max(1, Math.floor(total / (camera.zoom > 0.55 ? 420 : 280)));

        ctx.save();
        // Recortar estrictamente al contorno exterior p.heights para que las gargantas abiertas empalmen sin fugas con el cielo exterior
        ctx.beginPath();
        for (let i = 0; i <= total; i += step) {
            const idx = i % total;
            const theta = (idx / total) * Math.PI * 2;
            const r = p.heights[idx];
            const vx = p.x + Math.cos(theta) * r;
            const vy = p.y + Math.sin(theta) * r;
            if (i === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.clip();

        // A. Bóveda hueca (incluyendo el embudo abierto de cada entrada de cueva)
        const ceilTotal = p.cavernCeilingHeights.length;
        const ceilStep = Math.max(1, Math.floor(ceilTotal / 320));
        ctx.beginPath();
        for (let i = 0; i <= ceilTotal; i += ceilStep) {
            const idx = i % ceilTotal;
            const theta = (idx / ceilTotal) * Math.PI * 2;
            const bounds = (typeof getHollowBoundsAt === 'function')
                ? getHollowBoundsAt(p, theta)
                : { effectiveCeilingR: p.cavernCeilingHeights[idx] };
            const vx = p.x + Math.cos(theta) * bounds.effectiveCeilingR;
            const vy = p.y + Math.sin(theta) * bounds.effectiveCeilingR;
            if (i === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
        }
        ctx.closePath();

        const voidGrad = ctx.createRadialGradient(p.x, p.y, Math.max(10, p.interiorCoreRadius * 0.4), p.x, p.y, p.radius * 0.98);
        voidGrad.addColorStop(0.00, rgbStr(accentCol, 0.48));
        voidGrad.addColorStop(0.24, rgbStr(lerpRGB(coreCol, accentCol, 0.22), 0.96));
        voidGrad.addColorStop(0.58, rgbStr(lerpRGB(coreCol, [2, 4, 10], 0.82), 0.99));
        voidGrad.addColorStop(0.88, 'rgba(3, 5, 13, 0.99)');
        voidGrad.addColorStop(1.00, 'rgba(2, 3, 9, 0.99)');
        ctx.fillStyle = voidGrad;
        ctx.fill();

        // Paredes rocosas escalonadas y haces de luz en cada boca de cueva
        if (p.caveEntrances && p.caveEntrances.length > 0) {
            for (const cave of p.caveEntrances) {
                const halfMouth = cave.span * 0.56;
                const angL = cave.centerAngle - halfMouth;
                const angR = cave.centerAngle + halfMouth;
                const extL = getSurfaceRadius(p, angL);
                const extR = getSurfaceRadius(p, angR);
                const ceilL = getCavernCeilingRadius(p, angL);
                const ceilR = getCavernCeilingRadius(p, angR);

                // Haz de luz tenue saliendo desde la cámara hacia la boca
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const shaftGrad = ctx.createRadialGradient(
                    p.x + Math.cos(cave.centerAngle) * (p.radius * 0.65),
                    p.y + Math.sin(cave.centerAngle) * (p.radius * 0.65),
                    10,
                    p.x + Math.cos(cave.centerAngle) * (p.radius * 0.98),
                    p.y + Math.sin(cave.centerAngle) * (p.radius * 0.98),
                    cave.span * p.radius * 0.95
                );
                shaftGrad.addColorStop(0.0, rgbStr(accentCol, 0.22));
                shaftGrad.addColorStop(0.6, rgbStr(rimCol, 0.08));
                shaftGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
                ctx.fillStyle = shaftGrad;
                ctx.beginPath();
                ctx.moveTo(p.x + Math.cos(angL) * ceilL, p.y + Math.sin(angL) * ceilL);
                ctx.lineTo(p.x + Math.cos(angL) * (extL + 40), p.y + Math.sin(angL) * (extL + 40));
                ctx.lineTo(p.x + Math.cos(angR) * (extR + 40), p.y + Math.sin(angR) * (extR + 40));
                ctx.lineTo(p.x + Math.cos(angR) * ceilR, p.y + Math.sin(angR) * ceilR);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // Bordes de acantilado iluminados en ambas paredes de entrada
                for (const sideAng of [angL, angR]) {
                    const sExt = getSurfaceRadius(p, sideAng);
                    const sCeil = getCavernCeilingRadius(p, sideAng);
                    const x0 = p.x + Math.cos(sideAng) * sExt;
                    const y0 = p.y + Math.sin(sideAng) * sExt;
                    const x1 = p.x + Math.cos(sideAng) * sCeil;
                    const y1 = p.y + Math.sin(sideAng) * sCeil;
                    ctx.strokeStyle = rgbStr(rimCol, 0.72);
                    ctx.lineWidth = Math.max(2.4, 3.8 / Math.max(0.15, camera.zoom * 3));
                    ctx.beginPath();
                    ctx.moveTo(x0, y0);
                    ctx.lineTo(x1, y1);
                    ctx.stroke();
                }
            }
        }

        // B. Borde interior rocoso del techo de la caverna (salvo en bocas abiertas)
        ctx.beginPath();
        let drawingCeil = false;
        for (let i = 0; i <= total; i += step) {
            const idx = i % total;
            const theta = (idx / total) * Math.PI * 2;
            const bounds = getHollowBoundsAt(p, theta);
            if (!bounds.isThroatOpen) {
                const vx = p.x + Math.cos(theta) * bounds.effectiveCeilingR;
                const vy = p.y + Math.sin(theta) * bounds.effectiveCeilingR;
                if (!drawingCeil) { ctx.moveTo(vx, vy); drawingCeil = true; }
                else ctx.lineTo(vx, vy);
            } else {
                drawingCeil = false;
            }
        }
        ctx.strokeStyle = rgbStr(accentCol, 0.78);
        ctx.lineWidth = 3.6;
        ctx.stroke();

        // C. Núcleo Solar Interno y corona luminosa abisal
        if (p.interiorCoreRadius > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const coreR = p.interiorCoreRadius * (1.0 + Math.sin(timeSec * 2.8) * 0.07);
            const coreGrad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, coreR * 3.0);
            coreGrad.addColorStop(0.00, '#ffffff');
            coreGrad.addColorStop(0.18, rgbStr(rimCol, 0.95));
            coreGrad.addColorStop(0.45, rgbStr(accentCol, 0.55));
            coreGrad.addColorStop(0.75, rgbStr(accentCol, 0.16));
            coreGrad.addColorStop(1.00, 'rgba(0,0,0,0)');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, coreR * 3.0, 0, Math.PI * 2);
            ctx.fill();

            // Rayos radiales suaves del núcleo interno
            const rayCount = 8;
            ctx.strokeStyle = rgbStr(rimCol, 0.22);
            ctx.lineWidth = Math.max(4, coreR * 0.14);
            for (let rIdx = 0; rIdx < rayCount; rIdx++) {
                const rAng = timeSec * 0.12 + (rIdx / rayCount) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(p.x + Math.cos(rAng) * (coreR * 0.6), p.y + Math.sin(rAng) * (coreR * 0.6));
                ctx.lineTo(p.x + Math.cos(rAng) * (coreR * 2.5), p.y + Math.sin(rAng) * (coreR * 2.5));
                ctx.stroke();
            }
            ctx.restore();
        }

        // D. Suelo Interior Subterráneo y Lagos de Caverna
        const fTotal = p.cavernFloorHeights.length;
        ctx.beginPath();
        for (let i = 0; i <= fTotal; i += step) {
            const idx = i % fTotal;
            const theta = (idx / fTotal) * Math.PI * 2;
            const rFl = p.cavernFloorHeights[idx];
            const vx = p.x + Math.cos(theta) * rFl;
            const vy = p.y + Math.sin(theta) * rFl;
            if (i === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        const floorGrad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.16, p.x, p.y, p.radius * 0.52);
        floorGrad.addColorStop(0.0, rgbStr(lerpRGB(coreCol, [2, 3, 8], 0.5), 0.96));
        floorGrad.addColorStop(0.75, rgbStr(crustCol, 0.98));
        floorGrad.addColorStop(1.0, rgbStr(lerpRGB(crustCol, accentCol, 0.25), 0.98));
        ctx.fillStyle = floorGrad;
        ctx.fill();
        ctx.strokeStyle = rgbStr(accentCol, 0.55);
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Lagos subterráneos en el suelo de la caverna
        if (p.cavernLakes && p.cavernLakes.length > 0) {
            for (const lk of p.cavernLakes) {
                const lCol = lk.liquidType === 'magma' ? [251, 146, 60] : (lk.liquidType === 'liquid_crystal' ? [167, 243, 208] : accentCol);
                const stepsL = 18;
                ctx.beginPath();
                for (let s = 0; s <= stepsL; s++) {
                    const th = lk.centerAngle + ((s / stepsL) * 2 - 1) * lk.span;
                    const vx = p.x + Math.cos(th) * lk.waterLevel;
                    const vy = p.y + Math.sin(th) * lk.waterLevel;
                    if (s === 0) ctx.moveTo(vx, vy);
                    else ctx.lineTo(vx, vy);
                }
                for (let s = stepsL; s >= 0; s--) {
                    const th = lk.centerAngle + ((s / stepsL) * 2 - 1) * lk.span;
                    const rf = getCavernFloorRadius(p, th) - 2;
                    ctx.lineTo(p.x + Math.cos(th) * rf, p.y + Math.sin(th) * rf);
                }
                ctx.closePath();
                ctx.fillStyle = rgbStr(lCol, 0.72);
                ctx.fill();
                ctx.strokeStyle = rgbStr(rimCol, 0.8);
                ctx.lineWidth = 1.6;
                ctx.stroke();
            }
        }

        // E. Formaciones subterráneas (estalactitas, lianas, cristales colgantes, estalagmitas y hongos abisales)
        if (p.cavernProps && p.cavernProps.length > 0) {
            for (const cp of p.cavernProps) {
                const baseR = cp.onCeiling ? getCavernCeilingRadius(p, cp.angle) : getCavernFloorRadius(p, cp.angle);
                const tipOffset = cp.onCeiling ? -cp.height : cp.height;
                const bx = p.x + Math.cos(cp.angle) * baseR;
                const by = p.y + Math.sin(cp.angle) * baseR;
                if (Math.hypot(bx - camera.x, by - camera.y) > (Math.max(screenW, screenH) / Math.max(0.12, camera.zoom)) * 0.9 + 200) continue;

                ctx.save();
                ctx.translate(bx, by);
                ctx.rotate(cp.angle + Math.PI / 2);
                if (cp.onCeiling) ctx.scale(1, -1);

                if (cp.propType === 'cavern_vine') {
                    const sway = Math.sin(timeSec * 1.6 + cp.seed * 12) * 5;
                    ctx.strokeStyle = rgbStr(accentCol, 0.75);
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(sway, -cp.height * 0.5, sway * 1.4, -cp.height);
                    ctx.stroke();
                    ctx.fillStyle = rgbStr(rimCol, 0.95);
                    ctx.beginPath();
                    ctx.arc(sway * 1.4, -cp.height, 3.2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (cp.propType === 'cavern_mushroom') {
                    ctx.strokeStyle = rgbStr(crustCol, 0.9);
                    ctx.lineWidth = cp.width * 0.28;
                    ctx.beginPath();
                    ctx.moveTo(0, 2);
                    ctx.lineTo(0, -cp.height * 0.72);
                    ctx.stroke();
                    ctx.fillStyle = rgbStr(accentCol, 0.88);
                    ctx.beginPath();
                    ctx.ellipse(0, -cp.height * 0.74, cp.width * 0.85, cp.height * 0.28, 0, Math.PI, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = rgbStr(rimCol, 0.85);
                    ctx.lineWidth = 1.3;
                    ctx.stroke();
                } else {
                    // Estalactita, estalagmita o cristal de techo
                    const isCrystal = (cp.propType === 'ceiling_crystal');
                    ctx.fillStyle = rgbStr(isCrystal ? accentCol : crustCol, isCrystal ? 0.82 : 0.95);
                    ctx.strokeStyle = rgbStr(isCrystal ? rimCol : accentCol, 0.55);
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(-cp.width * 0.5, 4);
                    ctx.lineTo(0, -cp.height);
                    ctx.lineTo(cp.width * 0.5, 4);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // F. Islas flotantes interiores y nodos de Éter subterráneos
        if (p.cavernFloatingIslands && p.cavernFloatingIslands.length > 0) {
            drawFloatingIslandsList(p, p.cavernFloatingIslands, timeSec, colors, arch);
        }
        if (p.cavernNodes && p.cavernNodes.length > 0) {
            for (const cNode of p.cavernNodes) {
                if (!cNode.harvested) drawEtherNode(p, cNode, timeSec);
            }
        }

        // G. Niebla luminiscente suspendida en el vacío interior de la cueva
        ctx.globalCompositeOperation = 'lighter';
        for (let m = 0; m < 6; m++) {
            const mAng = timeSec * 0.15 + (m / 6) * Math.PI * 2;
            const mDist = (p.radius * 0.64) + Math.sin(timeSec * 0.4 + m) * (p.radius * 0.08);
            const mx = p.x + Math.cos(mAng) * mDist;
            const my = p.y + Math.sin(mAng) * mDist;
            const mGrad = ctx.createRadialGradient(mx, my, 2, mx, my, 130);
            mGrad.addColorStop(0.0, rgbStr(accentCol, 0.14));
            mGrad.addColorStop(0.7, rgbStr(rimCol, 0.05));
            mGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
            ctx.fillStyle = mGrad;
            ctx.beginPath();
            ctx.arc(mx, my, 130, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

/**
 * Cola doble iónica y de polvo para Cometas Activos (vista orbital y cinemática)
 */
function drawCometTail(p, timeSec, colors, arch) {
    if (!p.isComet) return;
    const antiSunAngle = (p.lightAngle || 0) + Math.PI;
    const tailLen = Math.max(p.radius * 6.5, 4800);
    const accentCol = colors.accentColor || arch.accentColor || [125, 211, 252];
    const rimCol = colors.rimColor || arch.rimColor || [240, 249, 255];

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(antiSunAngle);
    ctx.globalCompositeOperation = 'lighter';

    // Cola iónica azul/cian recta
    const ionGrad = ctx.createLinearGradient(0, 0, tailLen, 0);
    ionGrad.addColorStop(0.00, rgbStr(accentCol, 0.36));
    ionGrad.addColorStop(0.35, rgbStr(accentCol, 0.14));
    ionGrad.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.fillStyle = ionGrad;
    ctx.beginPath();
    ctx.moveTo(0, -p.radius * 0.65);
    ctx.quadraticCurveTo(tailLen * 0.5, -p.radius * 1.15 + Math.sin(timeSec * 0.9) * 35, tailLen, -p.radius * 1.8);
    ctx.lineTo(tailLen, p.radius * 1.8);
    ctx.quadraticCurveTo(tailLen * 0.5, p.radius * 1.15 + Math.sin(timeSec * 0.9) * 35, 0, p.radius * 0.65);
    ctx.closePath();
    ctx.fill();

    // Cola de polvo luminoso ligeramente curvada
    const dustGrad = ctx.createLinearGradient(0, 0, tailLen * 0.78, 0);
    dustGrad.addColorStop(0.00, rgbStr(rimCol, 0.24));
    dustGrad.addColorStop(0.45, rgbStr(rimCol, 0.08));
    dustGrad.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.fillStyle = dustGrad;
    ctx.beginPath();
    ctx.moveTo(0, -p.radius * 0.45);
    ctx.quadraticCurveTo(tailLen * 0.4, p.radius * 0.8, tailLen * 0.78, p.radius * 2.5);
    ctx.lineTo(tailLen * 0.78, p.radius * 0.4);
    ctx.quadraticCurveTo(tailLen * 0.35, -p.radius * 0.1, 0, p.radius * 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

/**
 * Plataformas e islas flotantes (aéreas, balsas coralinas/témpanos oceánicos o losas de caverna)
 */
function drawFloatingIslandsList(p, list, timeSec, colors, arch) {
    if (!list || list.length === 0) return;
    const litCol = colors.litColor || arch.litColor || [148, 163, 184];
    const crustCol = colors.crustColor || arch.crustColor || [51, 65, 85];
    const rimCol = colors.rimColor || arch.rimColor || [248, 250, 252];

    for (const isl of list) {
        const steps = 12;
        ctx.save();
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
            const u = (s / steps) * 2 - 1;
            const th = isl.angle + u * isl.span;
            const rTop = isl.topRadius - Math.pow(Math.abs(u), 2.2) * (isl.thickness * 0.25);
            const vx = p.x + Math.cos(th) * rTop;
            const vy = p.y + Math.sin(th) * rTop;
            if (s === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
        }
        for (let s = steps; s >= 0; s--) {
            const u = (s / steps) * 2 - 1;
            const th = isl.angle + u * isl.span;
            const keelWave = Math.sin(u * Math.PI * 2 + isl.seed * 7) * (isl.thickness * 0.14);
            const rBot = isl.bottomRadius + Math.pow(Math.abs(u), 1.4) * (isl.thickness * 0.55) + keelWave;
            ctx.lineTo(p.x + Math.cos(th) * rBot, p.y + Math.sin(th) * rBot);
        }
        ctx.closePath();

        const cx = p.x + Math.cos(isl.angle) * isl.topRadius;
        const cy = p.y + Math.sin(isl.angle) * isl.topRadius;
        const bx = p.x + Math.cos(isl.angle) * isl.bottomRadius;
        const by = p.y + Math.sin(isl.angle) * isl.bottomRadius;
        const islGrad = ctx.createLinearGradient(cx, cy, bx, by);
        const gc = isl.glowColor || [56, 189, 248];
        if (isl.style === 'ice_shelf') {
            islGrad.addColorStop(0.0, '#f0f9ff');
            islGrad.addColorStop(0.45, '#7dd3fc');
            islGrad.addColorStop(1.0, '#0369a1');
        } else if (isl.style === 'coral_raft') {
            islGrad.addColorStop(0.0, rgbStr(litCol, 0.96));
            islGrad.addColorStop(0.55, rgbStr(gc, 0.85));
            islGrad.addColorStop(1.0, rgbStr(crustCol, 0.95));
        } else {
            islGrad.addColorStop(0.0, rgbStr(litCol, 0.98));
            islGrad.addColorStop(0.55, rgbStr(crustCol, 0.98));
            islGrad.addColorStop(1.0, rgbStr(gc, 0.82));
        }
        ctx.fillStyle = islGrad;
        ctx.fill();

        // Contorno luminoso inferior y superior + estratos internos para mayor volumen
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = 'rgba(2, 6, 18, 0.28)';
        ctx.lineWidth = 1.8;
        const midLineR = (isl.topRadius + isl.bottomRadius) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, midLineR, isl.angle - isl.span, isl.angle + isl.span);
        ctx.stroke();
        ctx.restore();

        ctx.strokeStyle = rgbStr(rimCol, 0.78);
        ctx.lineWidth = 1.8;
        ctx.stroke();

        if (isl.style === 'shattered_rock' || isl.style === 'monolith_platform' || isl.style === 'crystal_platform' || isl.style === 'cavern_slab') {
            ctx.globalCompositeOperation = 'lighter';
            const pulse = 0.45 + 0.25 * Math.sin(timeSec * 2.2 + isl.seed * 9);
            const gGlow = ctx.createRadialGradient(bx, by, 2, bx, by, isl.thickness * 1.4);
            gGlow.addColorStop(0, rgbStr(gc, pulse));
            gGlow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gGlow;
            ctx.beginPath();
            ctx.arc(bx, by, isl.thickness * 1.4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

/**
 * Géiseres activos eruptivos y bolsillos visibles de anomalía gravitatoria
 */
function drawPlanetPhenomena(p, timeSec, colors, arch) {
    if (!p.phenomena || p.phenomena.length === 0) return;
    if (typeof ship !== 'undefined' && (ship.cavernDepthBlend || 0) > 0.88) return;

    for (const ph of p.phenomena) {
        if (ph.type === 'geyser') {
            const sr = getSurfaceRadius(p, ph.angle);
            const gx = p.x + Math.cos(ph.angle) * sr;
            const gy = p.y + Math.sin(ph.angle) * sr;
            if (Math.hypot(gx - camera.x, gy - camera.y) > (Math.max(screenW, screenH) / Math.max(0.12, camera.zoom)) * 0.9 + 400) continue;

            const intensity = (typeof getGeyserIntensity === 'function') ? getGeyserIntensity(ph, timeSec) : 0;
            const col = ph.geyserType === 'spore' ? [163, 230, 53]
                : (ph.geyserType === 'plasma' ? [251, 146, 60]
                : (ph.geyserType === 'cryo' ? [125, 211, 252] : [226, 232, 240]));

            ctx.save();
            ctx.translate(gx, gy);
            ctx.rotate(ph.angle + Math.PI / 2);

            // Cráter respiradero
            ctx.fillStyle = rgbStr(colors.coreColor || [30, 41, 59], 0.95);
            ctx.beginPath();
            ctx.moveTo(-12, 3);
            ctx.lineTo(-7, -7);
            ctx.lineTo(7, -7);
            ctx.lineTo(12, 3);
            ctx.closePath();
            ctx.fill();

            if (intensity > 0.04) {
                ctx.globalCompositeOperation = 'lighter';
                const jetH = ph.reachHeight * intensity;
                const jetGrad = ctx.createLinearGradient(0, -6, 0, -jetH);
                jetGrad.addColorStop(0.0, rgbStr(col, 0.78 * intensity));
                jetGrad.addColorStop(0.45, rgbStr(col, 0.35 * intensity));
                jetGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
                ctx.fillStyle = jetGrad;
                const wTop = 18 + 26 * intensity;
                ctx.beginPath();
                ctx.moveTo(-6, -6);
                ctx.lineTo(-wTop, -jetH);
                ctx.lineTo(wTop, -jetH);
                ctx.lineTo(6, -6);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        } else if (ph.type === 'gravity_anomaly') {
            const ax = p.x + Math.cos(ph.angle) * ph.radiusPos;
            const ay = p.y + Math.sin(ph.angle) * ph.radiusPos;
            if (Math.hypot(ax - camera.x, ay - camera.y) > (Math.max(screenW, screenH) / Math.max(0.12, camera.zoom)) * 0.9 + 350) continue;

            ctx.save();
            ctx.translate(ax, ay);
            ctx.globalCompositeOperation = 'lighter';
            const pulse = 0.75 + 0.25 * Math.sin(timeSec * 3.0 + ph.phase);
            const rGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, ph.effectRadius);
            rGrad.addColorStop(0.0, rgbStr(ph.color, 0.28 * pulse));
            rGrad.addColorStop(0.65, rgbStr(ph.color, 0.12 * pulse));
            rGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
            ctx.fillStyle = rGrad;
            ctx.beginPath();
            ctx.arc(0, 0, ph.effectRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = rgbStr(ph.color, 0.55);
            ctx.lineWidth = 1.4;
            ctx.setLineDash([10, 8]);
            ctx.rotate(timeSec * (ph.anomalyMode === 'vortex' ? 1.2 : -0.45));
            ctx.beginPath();
            ctx.arc(0, 0, ph.effectRadius * (0.62 + 0.08 * Math.sin(timeSec * 2 + ph.phase)), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

/**
 * Renderizado Orbital Simplificado (LOD de Zoom Lejano):
 * Reemplaza texturas y detalles de superficie por una representación limpia y liviana
 * enfocada en la lectura de órbitas, atmósfera, anillos y posición relativa.
 */
/**
 * Renderiza efectos orbitales y atmosféricos exclusivos de mundos singulares, magnetares y gigantes de diamante.
 */
function drawExoticPlanetAura(p, timeSec, colors, arch, drawR, invZoom) {
    const cls = arch?.classId;
    const isSing = !!(p.isSingularity || arch?.isSingularity);
    const isMag = !!(p.isMagnetar || arch?.isMagnetar);
    const isEyeball = !!(p.isEyeballWorld || arch?.isEyeballWorld);
    const isDiamond = arch?.id === 'diamond_rain_giant';
    const hasAurora = !p.isMoonlet && (p.atmoDensity || 1.0) > 0.35 && (cls === 'cryogenic' || cls === 'temporal' || (cls === 'terrestrial' && ((p.surfaceSeed || 0) > 0.45)));
    const isHostileMiasma = (cls === 'volcanic' || cls === 'toxic');

    if (!isSing && !isMag && !isEyeball && !isDiamond && !hasAurora && !isHostileMiasma) return;

    const accentCol = colors.accentColor || arch.accentColor || [192, 132, 252];
    const rimCol = colors.rimColor || arch.rimColor || [251, 146, 60];

    ctx.save();

    // 1. Halo oscuro opresivo para singularidades (absorbe la luz de fondo)
    if (isSing) {
        const voidGrad = ctx.createRadialGradient(p.x, p.y, drawR * 0.92, p.x, p.y, drawR * 1.45);
        voidGrad.addColorStop(0.0, 'rgba(2, 1, 6, 0.88)');
        voidGrad.addColorStop(0.55, 'rgba(6, 2, 16, 0.42)');
        voidGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = voidGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawR * 1.45, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalCompositeOperation = 'lighter';

    if (isSing) {
        const pulse = 1 + Math.sin(timeSec * 2.4) * 0.04;
        const innerR = drawR * 1.06;
        const outerR = drawR * 2.05 * pulse;
        const accGrad = ctx.createRadialGradient(p.x, p.y, innerR * 0.92, p.x, p.y, outerR);
        accGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
        accGrad.addColorStop(0.14, rgbStr(rimCol, 0.68));
        accGrad.addColorStop(0.42, rgbStr(accentCol, 0.32));
        accGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
        ctx.fillStyle = accGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2);
        ctx.fill();

        // Disco de acreción inclinado + chorros relativistas polares
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.ringTilt || 0.28) + Math.sin(timeSec * 0.3) * 0.03);
        ctx.strokeStyle = rgbStr(rimCol, 0.55);
        ctx.lineWidth = Math.max(1.5 * invZoom, drawR * 0.028);
        ctx.beginPath();
        ctx.ellipse(0, 0, drawR * 2.15, drawR * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();

        for (const dir of [-1, 1]) {
            const jetGrad = ctx.createLinearGradient(0, dir * drawR * 0.9, 0, dir * drawR * 2.65);
            jetGrad.addColorStop(0.0, rgbStr(accentCol, 0.48));
            jetGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
            ctx.fillStyle = jetGrad;
            ctx.beginPath();
            ctx.moveTo(-drawR * 0.08, dir * drawR * 0.92);
            ctx.lineTo(drawR * 0.08, dir * drawR * 0.92);
            ctx.lineTo(drawR * 0.28, dir * drawR * 2.65);
            ctx.lineTo(-drawR * 0.28, dir * drawR * 2.65);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // Anillo de fotones (lente gravitacional)
        ctx.strokeStyle = rgbStr([255, 245, 220], 0.78);
        ctx.lineWidth = Math.max(1.2 * invZoom, drawR * 0.013);
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawR * 1.11, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (isMag) {
        const axis = (p.initialRotationPhase || 0) + timeSec * 0.08;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(axis);
        for (let loop = 0; loop < 3; loop++) {
            const spread = drawR * (1.35 + loop * 0.34);
            const alpha = (0.38 - loop * 0.08) * (0.75 + 0.25 * Math.sin(timeSec * 3.2 + loop));
            ctx.strokeStyle = rgbStr(accentCol, Math.max(0.08, alpha));
            ctx.lineWidth = Math.max(1.1 * invZoom, drawR * 0.011);
            for (const dir of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(0, -drawR * 0.94);
                ctx.bezierCurveTo(dir * spread, -drawR * 0.85, dir * spread, drawR * 0.85, 0, drawR * 0.94);
                ctx.stroke();
            }
        }
        // Conos de haz de púlsar rotatorios
        const beamAlpha = 0.16 + 0.10 * Math.sin(timeSec * 4.5);
        for (const dir of [-1, 1]) {
            const beamGrad = ctx.createLinearGradient(0, dir * drawR * 0.95, 0, dir * drawR * 2.4);
            beamGrad.addColorStop(0.0, rgbStr(rimCol, beamAlpha));
            beamGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
            ctx.fillStyle = beamGrad;
            ctx.beginPath();
            ctx.moveTo(-drawR * 0.10, dir * drawR * 0.95);
            ctx.lineTo(drawR * 0.10, dir * drawR * 0.95);
            ctx.lineTo(drawR * 0.55, dir * drawR * 2.4);
            ctx.lineTo(-drawR * 0.55, dir * drawR * 2.4);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    if (isEyeball) {
        const sunAng = p.lightAngle || 0;
        const hotX = p.x + Math.cos(sunAng) * drawR * 0.82;
        const hotY = p.y + Math.sin(sunAng) * drawR * 0.82;
        const hotGrad = ctx.createRadialGradient(hotX, hotY, drawR * 0.05, hotX, hotY, drawR * 0.72);
        hotGrad.addColorStop(0.0, 'rgba(251, 146, 60, 0.38)');
        hotGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
        ctx.fillStyle = hotGrad;
        ctx.beginPath();
        ctx.arc(hotX, hotY, drawR * 0.72, 0, Math.PI * 2);
        ctx.fill();

        const coldX = p.x - Math.cos(sunAng) * drawR * 0.82;
        const coldY = p.y - Math.sin(sunAng) * drawR * 0.82;
        const coldGrad = ctx.createRadialGradient(coldX, coldY, drawR * 0.05, coldX, coldY, drawR * 0.72);
        coldGrad.addColorStop(0.0, 'rgba(186, 230, 253, 0.28)');
        coldGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
        ctx.fillStyle = coldGrad;
        ctx.beginPath();
        ctx.arc(coldX, coldY, drawR * 0.72, 0, Math.PI * 2);
        ctx.fill();
    }

    if (hasAurora) {
        const axis = p.initialRotationPhase || 0;
        const auroraCol = cls === 'temporal' ? [244, 114, 182] : [52, 211, 153];
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(axis);
        for (const pole of [-1, 1]) {
            const shimmer = 0.22 + 0.14 * Math.sin(timeSec * 2.1 + pole * 1.7 + (p.surfaceSeed || 0) * 8);
            ctx.strokeStyle = rgbStr(auroraCol, shimmer);
            ctx.lineWidth = Math.max(2.0 * invZoom, drawR * 0.025);
            ctx.beginPath();
            ctx.arc(0, pole * drawR * 0.94, drawR * 0.36, pole < 0 ? Math.PI * 0.15 : Math.PI * 1.15, pole < 0 ? Math.PI * 0.85 : Math.PI * 1.85);
            ctx.stroke();
        }
        ctx.restore();
    }

    if (isHostileMiasma) {
        const miasmaCol = cls === 'volcanic' ? [249, 115, 22] : [163, 230, 53];
        const pulse = 0.14 + 0.06 * Math.sin(timeSec * 1.9 + (p.surfaceSeed || 0) * 6);
        const miasmaGrad = ctx.createRadialGradient(p.x, p.y, drawR * 0.92, p.x, p.y, drawR * 1.18);
        miasmaGrad.addColorStop(0.0, rgbStr(miasmaCol, pulse));
        miasmaGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
        ctx.fillStyle = miasmaGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawR * 1.18, 0, Math.PI * 2);
        ctx.fill();
    }

    if (isDiamond && invZoom < 3.2) {
        const count = 18;
        for (let i = 0; i < count; i++) {
            const ang = (i / count) * Math.PI * 2 + (p.surfaceSeed || 0) * 6.28;
            const fallFrac = ((timeSec * 0.42 + i * 0.17) % 1);
            const r = drawR * (1.03 + (1 - fallFrac) * 0.14);
            const dx = p.x + Math.cos(ang) * r;
            const dy = p.y + Math.sin(ang) * r;
            const glint = Math.sin(timeSec * 5 + i * 2.1) * 0.5 + 0.5;
            ctx.fillStyle = rgbStr([224, 248, 255], 0.35 + glint * 0.55);
            ctx.beginPath();
            ctx.arc(dx, dy, Math.max(1.2 * invZoom, drawR * 0.005), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

function drawSimplifiedOrbitalPlanet(p, timeSec) {
    const arch = p.archetype;
    const colors = p.colors || {};
    const litCol = colors.litColor || arch.litColor;
    const crustCol = colors.crustColor || arch.crustColor;
    const coreCol = colors.coreColor || arch.coreColor;
    const rimCol = colors.rimColor || arch.rimColor;
    const atmoGlowCol = colors.atmoGlow || arch.atmoGlow;

    const invZoom = 1 / Math.max(0.004, camera.zoom);
    const minWorldR = 4.2 * invZoom;
    const drawR = Math.max(p.radius, minWorldR);
    const drawAtmoR = Math.max(p.atmoRadius, drawR * 1.18);
    const isCurrent = (ship.nearestPlanet && ship.nearestPlanet.id === p.id);

    // Helper liviano para mitad trasera / delantera de anillos sin sprite pesado
    const drawSimpleRingHalf = (isBack) => {
        if (!p.hasRings) return;
        const rIn = drawR * (p.ringInnerMult || 1.25);
        const rOut = drawR * (p.ringOuterMult || 2.35);
        const rMid = (rIn + rOut) * 0.5;
        const ringWidth = Math.max(1.5 * invZoom, rOut - rIn);
        const tilt = p.ringTilt || 0.25;
        const inc = p.ringInclination || 0.28;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(tilt);
        ctx.strokeStyle = rgbStr(rimCol, isBack ? 0.22 : 0.38);
        ctx.lineWidth = ringWidth;
        ctx.beginPath();
        ctx.ellipse(0, 0, rMid, rMid * inc, 0, isBack ? Math.PI : 0, isBack ? Math.PI * 2 : Math.PI);
        ctx.stroke();

        // Borde fino exterior del anillo para nitidez orbital
        ctx.strokeStyle = rgbStr(litCol, isBack ? 0.16 : 0.34);
        ctx.lineWidth = 1.1 * invZoom;
        ctx.beginPath();
        ctx.ellipse(0, 0, rOut, rOut * inc, 0, isBack ? Math.PI : 0, isBack ? Math.PI * 2 : Math.PI);
        ctx.stroke();
        ctx.restore();
    };

    drawSimpleRingHalf(true);
    if (p.isComet) drawCometTail(p, timeSec, colors, arch);
    drawExoticPlanetAura(p, timeSec, colors, arch, drawR, invZoom);

    // 1. Halo Atmosférico Suave + Límite de Atmósfera
    if (drawAtmoR > drawR * 1.02) {
        const atmoGrad = ctx.createRadialGradient(p.x, p.y, drawR * 0.92, p.x, p.y, drawAtmoR);
        atmoGrad.addColorStop(0.0, rgbStr(atmoGlowCol, 0.34));
        atmoGrad.addColorStop(0.55, rgbStr(atmoGlowCol, 0.12));
        atmoGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
        ctx.fillStyle = atmoGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawAtmoR, 0, Math.PI * 2);
        ctx.fill();

        // Anillo sutil del borde atmosférico (útil para aerofrenado y órbitas bajas)
        if (p.atmoRadius * camera.zoom > 16) {
            ctx.save();
            ctx.strokeStyle = rgbStr(atmoGlowCol, isCurrent ? 0.32 : 0.18);
            ctx.lineWidth = 1.0 * invZoom;
            ctx.setLineDash([5 * invZoom, 5 * invZoom]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.atmoRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // 2. Esfera Planetaria Limpia con Iluminación Direccional 3D
    const sunX = Math.cos(p.lightAngle || 0);
    const sunY = Math.sin(p.lightAngle || 0);
    const sphereGrad = ctx.createRadialGradient(
        p.x + sunX * drawR * 0.42,
        p.y + sunY * drawR * 0.42,
        drawR * 0.08,
        p.x - sunX * drawR * 0.15,
        p.y - sunY * drawR * 0.15,
        drawR * 1.15
    );
    sphereGrad.addColorStop(0.00, rgbStr(litCol, 1));
    sphereGrad.addColorStop(0.50, rgbStr(crustCol, 1));
    sphereGrad.addColorStop(0.85, rgbStr(coreCol, 1));
    sphereGrad.addColorStop(1.00, '#040711');

    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2);
    ctx.fill();

    // Superficie esférica pre-renderizada en vista orbital (continentes, bandas, rifts)
    const orbitalMaps = (typeof PlanetSurfaceBake !== 'undefined')
        ? PlanetSurfaceBake.getSurfaceMaps(p, isCurrent)
        : null;
    if (orbitalMaps && orbitalMaps.albedo) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = 0.88;
        ctx.drawImage(orbitalMaps.albedo, p.x - drawR, p.y - drawR, drawR * 2, drawR * 2);

        // Sombra direccional nocturna sobre el mapa orbital
        const orbShadow = ctx.createRadialGradient(
            p.x - sunX * drawR * 0.55,
            p.y - sunY * drawR * 0.55,
            drawR * 0.10,
            p.x - sunX * drawR * 0.55,
            p.y - sunY * drawR * 0.55,
            drawR * 1.55
        );
        orbShadow.addColorStop(0.00, 'rgba(2, 4, 12, 0.92)');
        orbShadow.addColorStop(0.45, 'rgba(3, 6, 16, 0.68)');
        orbShadow.addColorStop(0.75, 'rgba(0, 0, 0, 0.12)');
        orbShadow.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = orbShadow;
        ctx.fillRect(p.x - drawR, p.y - drawR, drawR * 2, drawR * 2);
        ctx.restore();
    }

    // Contorno nítido del planeta
    ctx.strokeStyle = isCurrent ? rgbStr(rimCol, 0.78) : rgbStr(rimCol, 0.40);
    ctx.lineWidth = (isCurrent ? 1.8 : 1.1) * invZoom;
    ctx.beginPath();
    ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2);
    ctx.stroke();

    // En zoom out lejano, mostrar claramente las bocas abiertas y brillo interno de mundos huecos
    if (p.isHollow && p.caveEntrances && p.caveEntrances.length > 0) {
        const gCol = p.cavernGlowColor || arch.accentColor || [56, 189, 248];
        ctx.save();
        for (const cave of p.caveEntrances) {
            const halfW = Math.max(0.14, cave.span * 0.62);
            ctx.fillStyle = 'rgba(2, 4, 12, 0.95)';
            ctx.beginPath();
            ctx.moveTo(p.x + Math.cos(cave.centerAngle) * (drawR * 0.52), p.y + Math.sin(cave.centerAngle) * (drawR * 0.52));
            ctx.arc(p.x, p.y, drawR * 1.01, cave.centerAngle - halfW, cave.centerAngle + halfW);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = rgbStr(gCol, 0.85);
            ctx.lineWidth = 1.6 * invZoom;
            ctx.stroke();
        }
        // Núcleo interior tenue visible en previsualización orbital
        ctx.globalCompositeOperation = 'lighter';
        const cDot = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, drawR * 0.38);
        cDot.addColorStop(0.0, rgbStr(gCol, 0.65));
        cDot.addColorStop(1.0, 'rgba(0,0,0,0)');
        ctx.fillStyle = cDot;
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawR * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawSimpleRingHalf(false);

    // 3. Rótulo Cartográfico en Tamaño de Pantalla (siempre legible y horizontal)
    const screenR = drawR * camera.zoom;
    if (screenR >= 4 || isCurrent) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(-camera.rotation);
        const labelOffset = (drawAtmoR * camera.zoom > 18 ? drawAtmoR : drawR) + 14 * invZoom;
        ctx.textAlign = 'center';
        ctx.font = `600 ${Math.round(12 * invZoom)}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = isCurrent ? '#f8fafc' : 'rgba(226, 232, 240, 0.88)';
        ctx.fillText(p.name.toUpperCase(), 0, -labelOffset - 4 * invZoom);

        if (screenR >= 10 || isCurrent) {
            const sizeTag = p.sizeClass ? p.sizeClass.tag : (arch.surfaceTag || 'PLANETA');
            const sub = p.scanned ? `${arch.typeLabel.toUpperCase()} · ${sizeTag}` : 'SEÑAL SIN CATALOGAR';
            ctx.font = `500 ${Math.round(9 * invZoom)}px "JetBrains Mono", monospace`;
            ctx.fillStyle = p.scanned ? rgbStr(rimCol, 0.85) : 'rgba(251, 191, 36, 0.82)';
            ctx.fillText(sub, 0, -labelOffset + 8 * invZoom);
        }
        ctx.restore();
    }
}

function drawCinematicPlanet(p, timeSec) {
    const arch = p.archetype;
    const colors = p.colors || {};
    const litCol = colors.litColor || arch.litColor;
    const crustCol = colors.crustColor || arch.crustColor;
    const coreCol = colors.coreColor || arch.coreColor;
    const rimCol = colors.rimColor || arch.rimColor;
    const accentCol = colors.accentColor || arch.accentColor || rimCol;
    const atmoGlowCol = colors.atmoGlow || arch.atmoGlow;
    const condensationCol = colors.cloudColor || arch.condensationColor || rimCol;

    // Culling orbital lejano
    const distCamCenter = Math.hypot(p.x - camera.x, p.y - camera.y);
    const maxDrawDist = p.atmoRadius + (Math.hypot(screenW, screenH) * 0.5 / Math.max(0.0015, camera.zoom)) + Math.max(1800, p.radius * 0.15);
    if (distCamCenter > maxDrawDist) return;

    // LOD Orbital: basado en el tamaño real en pantalla para que planetas colosales sigan detallados en órbita
    if ((p.radius * camera.zoom) < 42 || camera.zoom < 0.0035) {
        drawSimplifiedOrbitalPlanet(p, timeSec);
        return;
    }

    if (p.hasRings) {
        drawPlanetRingHalf(p, true, timeSec);
    }

    if (p.isComet) {
        drawCometTail(p, timeSec, colors, arch);
    }
    const distCamSurf = Math.hypot(camera.x - p.x, camera.y - p.y) - p.radius;
    const orbitalAuraFade = smoothstep(Math.max(450, p.radius * 0.06), Math.max(1800, p.radius * 0.24), distCamSurf);
    if (orbitalAuraFade > 0.02) {
        ctx.save();
        ctx.globalAlpha *= orbitalAuraFade;
        drawExoticPlanetAura(p, timeSec, colors, arch, p.maxSurfaceRadius || p.radius, 1 / Math.max(0.08, camera.zoom));
        ctx.restore();
    }

    // 1. Atmósfera Continua y Sedosa (Degradado exponencial multi-parada sin anillos bruscos)
    drawPlanetAtmosphere(p, timeSec, atmoGlowCol, condensationCol, accentCol);

    // 1.5 Capas de Siluetas de Paralaje en Múltiples Planos (Estilo Cordilleras/Dunas de Alto's Odyssey)
    drawPlanetBackgroundRidges(p, timeSec, colors, arch);

    // 2. Formaciones Naturales Integradas en la Curvatura del Terreno (Mesetas, arcos, crestas, bosques orgánicos)
    drawSurfaceProps(p, timeSec);

    // 3. Cuerpo Planetario, Sombreado Esférico Volumétrico y Superficie Macro Cinemática
    ctx.save();
    ctx.beginPath();
    const arc = getPlanetRenderArc(p, 340);
    if (!arc.partialArc) {
        for (let k = 0; k <= arc.total; k += arc.stride) {
            const theta = (k % arc.total) * arc.dTheta;
            const r = getSurfaceRadius(p, theta);
            const vx = p.x + Math.cos(theta) * r;
            const vy = p.y + Math.sin(theta) * r;
            if (k === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
        }
    } else {
        let firstPt = true;
        for (let k = arc.kMin; k <= arc.kMax; k += arc.stride) {
            const theta = k * arc.dTheta;
            const r = getSurfaceRadius(p, theta);
            const vx = p.x + Math.cos(theta) * r;
            const vy = p.y + Math.sin(theta) * r;
            if (firstPt) { ctx.moveTo(vx, vy); firstPt = false; }
            else ctx.lineTo(vx, vy);
        }
        // Cerrar suavemente por el arco trasero fuera de pantalla con ~14 puntos gruesos
        const backSpan = (arc.kMin + arc.total) - arc.kMax;
        if (backSpan > 0) {
            const backSteps = 14;
            for (let b = 1; b < backSteps; b++) {
                const theta = (arc.kMax + (b / backSteps) * backSpan) * arc.dTheta;
                ctx.lineTo(p.x + Math.cos(theta) * p.radius, p.y + Math.sin(theta) * p.radius);
            }
        }
    }
    ctx.closePath();
    ctx.clip();

    // Renderizar superficie macroscópica completa con 3D normal, continentes, bandas, casquetes y sombras
    drawPlanetMacroSurface(p, timeSec, colors, arch);

    // 3.5. Textura Procedural Táctil (anclada al planeta y con fade suave según zoom para evitar aliasing orbital)
    if (typeof VisualTextures !== 'undefined' && camera.zoom > 0.12) {
        const texPat = VisualTextures.getForArchetype(ctx, arch);
        if (texPat) {
            const texAlpha = clamp((camera.zoom - 0.12) * 1.15, 0, 0.34);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.globalCompositeOperation = 'soft-light';
            ctx.globalAlpha = texAlpha;
            ctx.fillStyle = texPat;
            const spanR = (p.maxSurfaceRadius || p.radius) + 120;
            ctx.fillRect(-spanR, -spanR, spanR * 2, spanR * 2);
            ctx.restore();
        }
    }

    // 3.6. Dispersión Cromática en el Terminador y Limbo Atmosférico Fresnel (Sombreado 3D Realista)
    const maxGlowR = (p.maxSurfaceRadius || p.radius);
    const sunDirX = Math.cos(p.lightAngle);
    const sunDirY = Math.sin(p.lightAngle);
    const sunsetCol = colors.sunsetRGB || arch.sunsetRGB || [251, 146, 60];
    const termGrad = ctx.createLinearGradient(
        p.x + sunDirX * maxGlowR, p.y + sunDirY * maxGlowR,
        p.x - sunDirX * maxGlowR, p.y - sunDirY * maxGlowR
    );
    termGrad.addColorStop(0.00, 'rgba(255,255,255,0)');
    termGrad.addColorStop(0.42, 'rgba(255,255,255,0)');
    termGrad.addColorStop(0.54, rgbStr(sunsetCol, 0.16));
    termGrad.addColorStop(0.62, 'rgba(3, 5, 12, 0.45)');
    termGrad.addColorStop(1.00, 'rgba(1, 2, 6, 0.80)');
    ctx.fillStyle = termGrad;
    ctx.fillRect(p.x - maxGlowR - 120, p.y - maxGlowR - 120, (maxGlowR + 120) * 2, (maxGlowR + 120) * 2);

    const fresnelGrad = ctx.createRadialGradient(
        p.x - sunDirX * maxGlowR * 0.24, p.y - sunDirY * maxGlowR * 0.24, maxGlowR * 0.74,
        p.x, p.y, maxGlowR * 1.02
    );
    fresnelGrad.addColorStop(0.00, 'rgba(0,0,0,0)');
    fresnelGrad.addColorStop(0.75, rgbStr(atmoGlowCol, 0.05));
    fresnelGrad.addColorStop(0.95, rgbStr(lerpRGB(atmoGlowCol, [255, 255, 255], 0.30), 0.18));
    fresnelGrad.addColorStop(1.00, rgbStr(rimCol, 0.22));
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = fresnelGrad;
    ctx.fillRect(p.x - maxGlowR - 120, p.y - maxGlowR - 120, (maxGlowR + 120) * 2, (maxGlowR + 120) * 2);
    ctx.restore();

    ctx.restore();

    // 4. Corteza Superficial Integrada, Cuencas Naturales de Agua/Lava/Hielo y Borde de Horizonte Iluminado
    drawPlanetSurfaceCrust(p, timeSec, colors, arch);

    // 4.5. Cavernas y Cámaras Subterráneas de Mundos Huecos
    drawHollowPlanetCaverns(p, timeSec, colors, arch);

    // 4.6. Islas Flotantes y Plataformas Oceánicas/Aéreas
    if (p.floatingIslands && p.floatingIslands.length > 0) {
        drawFloatingIslandsList(p, p.floatingIslands, timeSec, colors, arch);
    }

    // 4.7. Columnas de Ceniza y Fenómenos Activos (Géiseres y Anomalías Gravitatorias)
    drawSuperVolcanoPlumes(p, timeSec, colors, arch);
    drawPlanetPhenomena(p, timeSec, colors, arch);

    // 5. Nodos de Éter
    for (const node of p.nodes) {
        if (node.harvested) continue;
        drawEtherNode(p, node, timeSec);
    }

    if (p.hasRings) {
        drawPlanetRingHalf(p, false, timeSec);
    }

    // 6. Rótulo Cartográfico en Distancia Orbital
    const distToShip = Math.hypot(ship.x - p.x, ship.y - p.y) - p.radius;
    const labelAlpha = clamp((distToShip - 220) / 450, 0, 0.92);
    if (labelAlpha > 0.03) {
        ctx.save();
        ctx.globalAlpha = labelAlpha;
        ctx.textAlign = 'center';
        ctx.font = '600 17px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(p.name.toUpperCase(), p.x, p.y - 12);

        ctx.font = '500 10.5px "JetBrains Mono", monospace';
        ctx.fillStyle = p.scanned ? rgbStr(rimCol, 0.9) : 'rgba(251, 191, 36, 0.85)';
        
        let subText = 'SEÑAL SIN CATALOGAR · PULSA SONAR [E]';
        if (p.scanned) {
            const sizeTag = p.sizeClass ? p.sizeClass.tag : (arch.surfaceTag || 'PLANETA');
            let regTag = '';
            const regionTagDist = Math.max(850, (p.atmoRadius - p.radius) * 0.35);
            if (distToShip < regionTagDist && typeof getPlanetRegionAtAngle === 'function') {
                const curAng = Math.atan2(ship.y - p.y, ship.x - p.x);
                const curReg = getPlanetRegionAtAngle(p, curAng);
                if (curReg) regTag = ` // ${curReg.name.toUpperCase()}`;
            }
            subText = `${arch.typeLabel.toUpperCase()} [${sizeTag}]${regTag}`;
        }
        ctx.fillText(subText, p.x, p.y + 10);
        ctx.restore();
    }
}

/**
 * Renderiza una atmósfera óptica 100% continua y sedosa mediante un degradado radial exponencial de 14 paradas
 * con dispersión diurna suave, resplandores crepusculares en el terminador y luminiscencia aérea (airglow) nocturna.
 */
function drawPlanetAtmosphere(p, timeSec, atmoGlowCol, condensationCol, accentCol) {
    const arch = p.archetype;
    const colors = p.colors || {};
    const atmoDepth = p.atmoRadius - p.radius;
    if (atmoDepth <= 15) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Halo atmosférico principal diurno concentrado hacia el hemisferio iluminado por el sol
    const sunShiftX = Math.cos(p.lightAngle) * (atmoDepth * 0.72);
    const sunShiftY = Math.sin(p.lightAngle) * (atmoDepth * 0.72);
    const innerR = p.radius * 0.97;
    const atmoGrad = ctx.createRadialGradient(
        p.x + sunShiftX, p.y + sunShiftY, innerR,
        p.x, p.y, p.atmoRadius
    );

    const baseAlpha = clamp(0.38 * Math.pow(p.atmoDensity || 1.0, 0.35), 0.18, 0.48);
    const stops = [0.00, 0.04, 0.09, 0.15, 0.22, 0.30, 0.39, 0.49, 0.60, 0.72, 0.83, 0.92, 1.00];
    for (let i = 0; i < stops.length; i++) {
        const t = stops[i];
        if (t >= 1.0) {
            atmoGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
        } else {
            const falloff = Math.pow(1 - t, 2.75);
            let col;
            if (t < 0.35) {
                col = lerpRGB(atmoGlowCol, condensationCol, t / 0.35);
            } else {
                col = lerpRGB(condensationCol, accentCol, (t - 0.35) / 0.65);
            }
            atmoGrad.addColorStop(t, rgbStr(col, baseAlpha * falloff));
        }
    }

    // El halo atmosférico es un anillo 360° continuo y orgánico (cero cortes angulares rectos o líneas artificiales)
    ctx.fillStyle = atmoGrad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.atmoRadius, 0, Math.PI * 2);
    ctx.arc(p.x, p.y, innerR * 0.96, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    // 2. Resplandor atmosférico diurno hacia el hemisferio iluminado (Tonalidad luminosa celeste/blanca/propia del bioma, no naranja de atardecer)
    const dayX = p.x + Math.cos(p.lightAngle) * (p.radius * 0.70);
    const dayY = p.y + Math.sin(p.lightAngle) * (p.radius * 0.70);
    const dayRad = p.radius * 0.68 + atmoDepth * 0.85;
    const dayGrad = ctx.createRadialGradient(dayX, dayY, p.radius * 0.05, dayX, dayY, dayRad);
    dayGrad.addColorStop(0.00, rgbStr(lerpRGB(atmoGlowCol, [255, 255, 255], 0.35), 0.16));
    dayGrad.addColorStop(0.28, rgbStr(atmoGlowCol, 0.12));
    dayGrad.addColorStop(0.58, rgbStr(condensationCol, 0.04));
    dayGrad.addColorStop(0.85, rgbStr(accentCol, 0.012));
    dayGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

    ctx.fillStyle = dayGrad;
    ctx.beginPath();
    ctx.arc(dayX, dayY, dayRad, 0, Math.PI * 2);
    ctx.fill();

    // 3. Resplandor crepuscular en los dos extremos del terminador (confinado al anillo atmosférico exterior para no manchar la superficie)
    const sunsetRGB = colors.sunsetRGB || arch.sunsetRGB || (arch.atmoVisuals && arch.atmoVisuals.sunsetColor) || [251, 146, 60];
    const termR = p.radius + atmoDepth * 0.28;
    const tAngle1 = p.lightAngle + Math.PI * 0.5;
    const tAngle2 = p.lightAngle - Math.PI * 0.5;
    const flareRad = atmoDepth * 0.78 + p.radius * 0.08;

    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.atmoRadius, 0, Math.PI * 2);
    ctx.arc(p.x, p.y, p.radius * 0.97, 0, Math.PI * 2, true);
    ctx.clip();
    for (const tAng of [tAngle1, tAngle2]) {
        const tx = p.x + Math.cos(tAng) * termR;
        const ty = p.y + Math.sin(tAng) * termR;
        const twGrad = ctx.createRadialGradient(tx, ty, 5, tx, ty, flareRad);
        twGrad.addColorStop(0.00, rgbStr(sunsetRGB, 0.20));
        twGrad.addColorStop(0.45, rgbStr(sunsetRGB, 0.07));
        twGrad.addColorStop(1.00, 'rgba(0,0,0,0)');
        ctx.fillStyle = twGrad;
        ctx.beginPath();
        ctx.arc(tx, ty, flareRad, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 4. Luminiscencia aérea nocturna sutil (Airglow) en el hemisferio oscuro (sin blanquear la noche)
    const nightAirglowCol = colors.nightAirglow || arch.nightAirglow || atmoGlowCol;
    const airglowAlpha = (colors.nightAirglowAlpha || arch.nightAirglowAlpha || 0.45) * 0.14;
    const nightX = p.x - Math.cos(p.lightAngle) * (p.radius * 0.82);
    const nightY = p.y - Math.sin(p.lightAngle) * (p.radius * 0.82);
    const nightRad = p.radius * 0.85 + atmoDepth * 0.45;
    const nightGrad = ctx.createRadialGradient(nightX, nightY, p.radius * 0.4, nightX, nightY, nightRad);
    nightGrad.addColorStop(0.00, 'rgba(0,0,0,0)');
    nightGrad.addColorStop(0.65, rgbStr(nightAirglowCol, airglowAlpha * 0.5));
    nightGrad.addColorStop(0.92, rgbStr(nightAirglowCol, airglowAlpha));
    nightGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

    ctx.fillStyle = nightGrad;
    ctx.beginPath();
    ctx.arc(nightX, nightY, nightRad, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/**
 * Renderiza el interior geológico del planeta de forma 100% ESTÁTICA, SERENA Y DELICADA:
 * Estratos litosféricos finos cerca de la corteza que siguen la topografía y se funden suavemente
 * hacia el interior oscuro, sin movimiento, sin círculos concéntricos duros y sin manchas bruscas.
 */
function drawPlanetInterior(p, timeSec, colors, arch) {
    const inter = p.interior || {};
    const strataProfiles = inter.strataProfiles || [];
    const arc = getPlanetRenderArc(p, 340);
    const total = arc.total;
    const step = arc.stride;
    const kMin = arc.kMin;
    const kMax = arc.kMax;

    const topsoilCol = colors.topsoilColor || arch.topsoilColor || colors.litColor;
    const subcrustCol = colors.subcrustColor || arch.subcrustColor || colors.crustColor;
    const crustCol = colors.crustColor || arch.crustColor;
    const coreCol = colors.coreColor || arch.coreColor;
    const rimCol = colors.rimColor || arch.rimColor;
    const innerCoreCol = colors.innerCoreColor || arch.innerCoreColor || colors.accentColor || rimCol;

    // 1. Bandas Estratigráficas Subsuperficiales Estáticas (Solo cerca de la corteza, fundiéndose hacia el interior)
    const bandColors = [
        { fill: lerpRGB(topsoilCol, subcrustCol, 0.45), fillAlpha: 0.30, lineAlpha: 0.16 },
        { fill: lerpRGB(subcrustCol, crustCol, 0.50),   fillAlpha: 0.22, lineAlpha: 0.11 },
        { fill: lerpRGB(crustCol, coreCol, 0.38),       fillAlpha: 0.14, lineAlpha: 0.07 },
        { fill: lerpRGB(crustCol, coreCol, 0.72),       fillAlpha: 0.08, lineAlpha: 0.04 }
    ];

    const strataTex = (typeof VisualTextures !== 'undefined') ? VisualTextures.getForArchetype(ctx, arch) : null;

    for (let s = 0; s < strataProfiles.length; s++) {
        const upperProf = (s === 0) ? p.heights : strataProfiles[s - 1];
        const lowerProf = strataProfiles[s];
        const styleSpec = bandColors[s] || bandColors[bandColors.length - 1];

        // Cinta cerrada entre el estrato superior y el inferior (solo arco visible)
        ctx.beginPath();
        let firstU = true;
        for (let k = kMin; k <= kMax; k += step) {
            const idx = ((k % total) + total) % total;
            const theta = idx * arc.dTheta;
            const r = upperProf[idx];
            const vx = p.x + Math.cos(theta) * r;
            const vy = p.y + Math.sin(theta) * r;
            if (firstU) { ctx.moveTo(vx, vy); firstU = false; }
            else ctx.lineTo(vx, vy);
        }
        for (let k = kMax; k >= kMin; k -= step) {
            const idx = ((k % total) + total) % total;
            const theta = idx * arc.dTheta;
            const r = lowerProf[idx];
            const vx = p.x + Math.cos(theta) * r;
            const vy = p.y + Math.sin(theta) * r;
            ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.fillStyle = rgbStr(styleSpec.fill, styleSpec.fillAlpha);
        ctx.fill();

        if (strataTex && s < 2) {
            ctx.save();
            ctx.clip();
            ctx.translate(p.x, p.y);
            ctx.globalCompositeOperation = 'soft-light';
            ctx.globalAlpha = s === 0 ? 0.24 : 0.14;
            ctx.fillStyle = strataTex;
            const spanR = (p.maxSurfaceRadius || p.radius) + 140;
            ctx.fillRect(-spanR, -spanR, spanR * 2, spanR * 2);
            ctx.restore();
        }
    }

    // 2. Sombra abisal profunda y tenue luminiscencia térmica estática en el centro del planeta (Sin bordes ni movimiento)
    const coreRadius = p.radius * 0.58;
    const deepGrad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.02, p.x, p.y, coreRadius);
    deepGrad.addColorStop(0.00, rgbStr(innerCoreCol, 0.14));
    deepGrad.addColorStop(0.22, rgbStr(innerCoreCol, 0.08));
    deepGrad.addColorStop(0.50, rgbStr(coreCol, 0.04));
    deepGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

    ctx.fillStyle = deepGrad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, coreRadius, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Renderiza los lagos, mares y cuencas de líquido planetarias con:
 * - Profundidad óptica multicapa (orillas cristalinas translúcidas y núcleo abisal profundo).
 * - Playas de arena, basalto o hielo en el contorno de contacto con la corteza.
 * - Destello solar especular (Sunglint) fotométrico que brilla intensamente cuando el sol y la cámara se alinean.
 * - Micro-oleaje animado y bruma/vapor atmosférico según el tipo de fluido.
 */
function drawCinematicPlanetLakes(p, timeSec, colors, arch) {
    if (!p.lakes || p.lakes.length === 0) return;
    const rimCol = colors.rimColor || arch.rimColor || [224, 242, 254];
    const accentCol = colors.accentColor || arch.accentColor || rimCol;
    const crustCol = colors.crustColor || arch.crustColor || [40, 50, 70];
    const topsoilCol = colors.topsoilColor || arch.topsoilColor || colors.litColor || [60, 100, 120];

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const lightAng = (p.lightAngle !== undefined) ? p.lightAngle : -Math.PI * 0.35;
    const sunVecX = Math.cos(lightAng);
    const sunVecY = Math.sin(lightAng);
    const stormInfo = (typeof getLocalStormDarkness === 'function' && p === ship.nearestPlanet)
        ? getLocalStormDarkness(p)
        : { worldDark: 0, tint: [36, 46, 66] };
    const stormDark = stormInfo.worldDark || 0;

    for (const lake of p.lakes) {
        const spanHalf = lake.span;
        const centerAng = lake.centerAngle;
        const normCenter = ((centerAng % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

        // Vector normal de la superficie del lago
        const normX = Math.cos(normCenter);
        const normY = Math.sin(normCenter);

        // Ángulo solar respecto a la normal del lago y factores continuos
        const sunDot = normX * sunVecX + normY * sunVecY;
        const dayLake = smoothstep(-0.25, 0.35, sunDot);
        const twiLake = Math.exp(-Math.pow(sunDot / 0.24, 2));
        const nightLake = smoothstep(0.25, -0.35, sunDot);

        const isSelfLuminous = (lake.liquidType === 'magma' || lake.liquidType === 'biolume' || lake.liquidType === 'acid');
        // Radiancia diurna viva vs espejo nocturno oscuro (los lagos no emisivos se oscurecen profundamente de noche y en tormenta)
        const stormDim = isSelfLuminous ? 1.0 : (1.0 - stormDark * 0.72);
        const sunIntensity = isSelfLuminous
            ? clamp(0.45 + 0.85 * dayLake + 0.30 * twiLake, 0.45, 1.35)
            : clamp((0.08 + 1.15 * dayLake + 0.38 * twiLake) * stormDim, 0.06, 1.40);

        // Determinación de paletas cromáticas según el tipo de fluido
        let deepCol, shallowCol, shoreCol, specCol;
        if (lake.liquidType === 'magma') {
            deepCol = [220, 38, 38];
            shallowCol = [249, 115, 22];
            shoreCol = [120, 25, 10];
            specCol = [254, 240, 138];
        } else if (lake.liquidType === 'methane') {
            deepCol = [12, 74, 110];
            shallowCol = [56, 189, 248];
            shoreCol = [224, 242, 254];
            specCol = [255, 255, 255];
        } else if (lake.liquidType === 'biolume') {
            deepCol = [107, 33, 168];
            shallowCol = [192, 132, 252];
            shoreCol = [233, 213, 255];
            specCol = [244, 114, 182];
        } else if (lake.liquidType === 'acid') {
            deepCol = [20, 83, 45];
            shallowCol = [74, 222, 128];
            shoreCol = [187, 247, 208];
            specCol = [254, 240, 138];
        } else if (lake.liquidType === 'crystal') {
            deepCol = [88, 28, 135];
            shallowCol = [168, 85, 247];
            shoreCol = [245, 208, 254];
            specCol = [255, 255, 255];
        } else { // 'water'
            deepCol = [14, 60, 105];
            shallowCol = [45, 212, 191];
            shoreCol = [254, 243, 199];
            specCol = [255, 255, 255];
        }

        if (!isSelfLuminous) {
            if (stormDark > 0.01) {
                deepCol = lerpRGB(deepCol, stormInfo.tint, stormDark * 0.72);
                shallowCol = lerpRGB(shallowCol, stormInfo.tint, stormDark * 0.75);
                shoreCol = lerpRGB(shoreCol, stormInfo.tint, stormDark * 0.80);
            }
            if (nightLake > 0.01) {
                deepCol = lerpRGB(deepCol, [2, 4, 10], nightLake * 0.90);
                shallowCol = lerpRGB(shallowCol, [3, 6, 14], nightLake * 0.88);
                shoreCol = lerpRGB(shoreCol, [4, 8, 16], nightLake * 0.90);
            }
        }

        const steps = 48;
        const wavePhase = timeSec * 3.4;

        // 1. Trazado del cuerpo de fluido (superficie con micro-oleaje amortiguado en orillas + cuenca)
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
            const u = (s / steps) * 2 - 1;
            const theta = normCenter + u * spanHalf;
            // Amortiguación hiperbólica en orillas: en los bordes u = ±1 el oleaje se anula a 0 con exactitud
            const shoreDamp = Math.max(0, 1 - u * u);
            const wave = (Math.sin(theta * 32 + wavePhase) * 1.35 + Math.cos(theta * 64 - wavePhase * 1.25) * 0.65) * shoreDamp;
            const rWater = lake.waterLevel + wave;
            const wx = p.x + Math.cos(theta) * rWater;
            const wy = p.y + Math.sin(theta) * rWater;
            if (s === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
        }
        for (let s = steps; s >= 0; s--) {
            const u = (s / steps) * 2 - 1;
            const theta = normCenter + u * spanHalf;
            const rBed = getSurfaceRadius(p, theta) - 1.5;
            const bx = p.x + Math.cos(theta) * rBed;
            const by = p.y + Math.sin(theta) * rBed;
            ctx.lineTo(bx, by);
        }
        ctx.closePath();

        const surfX = p.x + normX * lake.waterLevel;
        const surfY = p.y + normY * lake.waterLevel;
        const bedX = p.x + normX * (lake.waterLevel - lake.depth);
        const bedY = p.y + normY * (lake.waterLevel - lake.depth);

        const waterGrad = ctx.createLinearGradient(surfX, surfY, bedX, bedY);
        waterGrad.addColorStop(0.00, rgbStr(shallowCol, 0.82 * sunIntensity));
        waterGrad.addColorStop(0.35, rgbStr(lerpRGB(shallowCol, deepCol, 0.50), 0.90 * sunIntensity));
        waterGrad.addColorStop(1.00, rgbStr(deepCol, 0.98 * sunIntensity));

        ctx.fillStyle = waterGrad;
        ctx.fill();

        // Confinar reflejos, brillos solares y magma al interior estricto de la cuenca del lago (evita círculos saliendo al cielo o bajo tierra)
        ctx.save();
        ctx.clip();

        // 2. Borde sutil de menisco superficial únicamente sobre la lámina de agua (sin trazar líneas bajo tierra)
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
            const u = (s / steps) * 2 - 1;
            const theta = normCenter + u * spanHalf;
            const shoreDamp = Math.max(0, 1 - u * u);
            const wave = (Math.sin(theta * 32 + wavePhase) * 1.35 + Math.cos(theta * 64 - wavePhase * 1.25) * 0.65) * shoreDamp;
            const rWater = lake.waterLevel + wave;
            const wx = p.x + Math.cos(theta) * rWater;
            const wy = p.y + Math.sin(theta) * rWater;
            if (s === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
        }
        ctx.strokeStyle = rgbStr(shoreCol, 0.52 * sunIntensity);
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 3. Destello solar especular (Sunglint fotométrico confinado al agua)
        if (dayLake > 0.05) {
            const reflX = 2 * sunDot * normX - sunVecX;
            const reflY = 2 * sunDot * normY - sunVecY;

            const viewCamX = camera.x - surfX;
            const viewCamY = camera.y - surfY;
            const viewDist = Math.hypot(viewCamX, viewCamY) || 1;
            const viewDirX = viewCamX / viewDist;
            const viewDirY = viewCamY / viewDist;

            const specDot = Math.max(0, reflX * viewDirX + reflY * viewDirY);
            const specPower = Math.pow(specDot, 6);
            const glintIntensity = clamp((0.25 * sunDot + 0.75 * specPower) * dayLake, 0, 1.25);

            const glintRadius = lake.span * p.radius * 0.44;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const glintGrad = ctx.createRadialGradient(surfX, surfY, 2, surfX, surfY, glintRadius);
            glintGrad.addColorStop(0.00, rgbStr(specCol, 0.78 * glintIntensity));
            glintGrad.addColorStop(0.24, rgbStr(shallowCol, 0.42 * glintIntensity));
            glintGrad.addColorStop(0.65, rgbStr(deepCol, 0.14 * glintIntensity));
            glintGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

            ctx.fillStyle = glintGrad;
            ctx.beginPath();
            ctx.arc(surfX, surfY, glintRadius, 0, Math.PI * 2);
            ctx.fill();

            // Chispas de diamante dinámicas sobre la línea del oleaje
            for (let g = -3; g <= 3; g++) {
                const sparkleAng = normCenter + g * (lake.span * 0.15);
                const sparkleR = lake.waterLevel - 1.2 + Math.sin(sparkleAng * 38 + timeSec * 5.5) * 1.2;
                const sx = p.x + Math.cos(sparkleAng) * sparkleR;
                const sy = p.y + Math.sin(sparkleAng) * sparkleR;
                const spAlpha = 0.30 + 0.55 * Math.sin(timeSec * 7 + g * 2.1);
                ctx.fillStyle = `rgba(255, 255, 255, ${spAlpha * glintIntensity})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 2.0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 4. Núcleo incandescente de magma confinado al estanque (sin halo circular flotando en cielo/roca)
        if (lake.liquidType === 'magma') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const pulse = 0.72 + 0.28 * Math.sin(timeSec * 2.8 + normCenter * 3);
            const magmaGrad = ctx.createLinearGradient(surfX, surfY, bedX, bedY);
            magmaGrad.addColorStop(0.00, `rgba(254, 240, 138, ${0.42 * pulse})`);
            magmaGrad.addColorStop(0.55, `rgba(249, 115, 22, ${0.22 * pulse})`);
            magmaGrad.addColorStop(1.00, 'rgba(0,0,0,0)');
            ctx.fillStyle = magmaGrad;
            ctx.fillRect(Math.min(surfX, bedX) - lake.span * p.radius, Math.min(surfY, bedY) - lake.span * p.radius, lake.span * p.radius * 2, lake.span * p.radius * 2);
            ctx.restore();
        }
        ctx.restore();

        // Ascuas o neblina rasante que sigue el arco del lago (sin esferas gigantes)
        if (lake.liquidType === 'magma') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let e = -2; e <= 2; e++) {
                const eAng = normCenter + e * (lake.span * 0.18);
                const eAlt = (timeSec * 14 + e * 19) % 28;
                const ex = p.x + Math.cos(eAng) * (lake.waterLevel + eAlt);
                const ey = p.y + Math.sin(eAng) * (lake.waterLevel + eAlt);
                const eAlpha = (1 - eAlt / 28) * 0.8;
                ctx.fillStyle = `rgba(254, 240, 138, ${eAlpha})`;
                ctx.beginPath();
                ctx.arc(ex, ey, 1.4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        } else if (lake.liquidType === 'water' || lake.liquidType === 'methane') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const mistR = lake.waterLevel + 4 + 2 * Math.sin(timeSec * 1.5 + normCenter);
            ctx.beginPath();
            for (let s = 0; s <= 14; s++) {
                const u = (s / 14) * 2 - 1;
                const theta = normCenter + u * spanHalf * 0.85;
                const vx = p.x + Math.cos(theta) * (mistR + (1 - u * u) * 5);
                const vy = p.y + Math.sin(theta) * (mistR + (1 - u * u) * 5);
                if (s === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            ctx.strokeStyle = rgbStr(shallowCol, 0.14);
            ctx.lineWidth = 6.0;
            ctx.stroke();
            ctx.restore();
        }
    }

    ctx.restore();
}

/**
 * Renderiza el manto superficial de regolito con espesor orgánico variable, cuencas naturales
 * rellenas de fluido/hielo/magma equipotencial y borde de horizonte con iluminación solar suave.
 */
function drawPlanetSurfaceCrust(p, timeSec, colors, arch) {
    const total = p.heights.length;
    const scaleFactor = Math.sqrt(p.radius / 2600);
    const rimCol = colors.rimColor || arch.rimColor;
    const topsoilCol = colors.topsoilColor || arch.topsoilColor || colors.litColor;
    const subcrustCol = colors.subcrustColor || arch.subcrustColor || colors.crustColor;
    const crustCol = colors.crustColor || arch.crustColor;
    const accentCol = colors.accentColor || arch.accentColor;

    const stormInfo = (typeof getLocalStormDarkness === 'function' && p === ship.nearestPlanet)
        ? getLocalStormDarkness(p)
        : { worldDark: 0, tint: [36, 46, 66] };
    const stormDark = stormInfo.worldDark || 0;
    const applyStorm = (rgb) => stormDark > 0.01 ? lerpRGB(rgb, stormInfo.tint, stormDark * 0.85) : rgb;
    const effRimCol = applyStorm(rimCol);
    const effTopsoilCol = applyStorm(topsoilCol);

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const sunX = p.x + Math.cos(p.lightAngle) * p.radius;
    const sunY = p.y + Math.sin(p.lightAngle) * p.radius;
    const antiSunX = p.x - Math.cos(p.lightAngle) * p.radius;
    const antiSunY = p.y - Math.sin(p.lightAngle) * p.radius;

    const arc = getPlanetRenderArc(p, 340);

    if (arch.isLiquid) {
        // Superficie oceánica translúcida con profundidad marina suave (optimizada al arco visible)
        ctx.beginPath();
        for (let k = arc.kMin; k <= arc.kMax; k += arc.stride) {
            const theta = k * arc.dTheta;
            const r = getSurfaceRadius(p, theta);
            const vx = p.x + Math.cos(theta) * r;
            const vy = p.y + Math.sin(theta) * r;
            if (k === arc.kMin) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
        }
        if ((arc.kMax - arc.kMin) % arc.stride !== 0) {
            const theta = arc.kMax * arc.dTheta;
            const r = getSurfaceRadius(p, theta);
            ctx.lineTo(p.x + Math.cos(theta) * r, p.y + Math.sin(theta) * r);
        }
        if (!arc.partialArc) ctx.closePath();
        ctx.strokeStyle = rgbStr(effTopsoilCol, 0.45 * (1 - stormDark * 0.4));
        ctx.lineWidth = 5.5;
        ctx.stroke();

        const oceanRim = ctx.createLinearGradient(sunX, sunY, antiSunX, antiSunY);
        oceanRim.addColorStop(0, rgbStr(lerpRGB(effRimCol, [255, 255, 255], 0.35 * (1 - stormDark * 0.8)), 0.90 * (1 - stormDark * 0.55)));
        oceanRim.addColorStop(0.55, rgbStr(effRimCol, 0.55 * (1 - stormDark * 0.55)));
        oceanRim.addColorStop(0.78, 'rgba(3, 6, 14, 0.25)');
        oceanRim.addColorStop(1, 'rgba(1, 2, 6, 0.10)');
        ctx.strokeStyle = oceanRim;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
        return;
    }

    // 1. Cinta Orgánica de Suelo Superficial / Regolito con espesor natural variable (respeta gargantas abiertas y recorte de viewport)
    const staticCrustPhase = ((p.surfaceSeed || 0.42) * 17.3);
    const hasOpenCaves = !!(p.isHollow && p.caveEntrances && p.caveEntrances.length > 0);
    const isSolidRimIdx = (idx) => {
        if (!hasOpenCaves) return true;
        const th = (idx / total) * Math.PI * 2;
        const cInfo = getPlanetCaveEntranceAt(p, th);
        return !(cInfo && cInfo.normDist < 0.56);
    };

    const crustSpans = [];
    if (!hasOpenCaves) {
        crustSpans.push({ lo: arc.kMin, hi: arc.kMax });
    } else {
        let inSolid = false;
        let spanStart = arc.kMin;
        let prevSolidK = arc.kMin;
        for (let k = arc.kMin; k <= arc.kMax; k += arc.stride) {
            const idx = ((k % total) + total) % total;
            const solid = isSolidRimIdx(idx);
            if (solid && !inSolid) {
                inSolid = true;
                spanStart = k;
                prevSolidK = k;
            } else if (solid) {
                prevSolidK = k;
            } else if (inSolid) {
                inSolid = false;
                crustSpans.push({ lo: spanStart, hi: prevSolidK });
            }
        }
        if (inSolid) {
            crustSpans.push({ lo: spanStart, hi: prevSolidK });
        }
    }

    ctx.beginPath();
    for (const span of crustSpans) {
        const ks = [];
        for (let k = span.lo; k <= span.hi; k += arc.stride) ks.push(k);
        if (ks.length === 0 || ks[ks.length - 1] !== span.hi) ks.push(span.hi);

        for (let j = 0; j < ks.length; j++) {
            const k = ks[j];
            const idx = ((k % total) + total) % total;
            const theta = k * arc.dTheta;
            const r = p.heights[idx];
            const vx = p.x + Math.cos(theta) * r;
            const vy = p.y + Math.sin(theta) * r;
            if (j === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
        }
        for (let j = ks.length - 1; j >= 0; j--) {
            const k = ks[j];
            const idx = ((k % total) + total) % total;
            const theta = k * arc.dTheta;
            const elevBonus = Math.max(0, (p.heights[idx] - p.radius) * 0.14);
            const thickness = (5.2 + Math.sin(theta * 17 + staticCrustPhase) * 1.8) * scaleFactor + elevBonus;
            const rSub = p.heights[idx] - thickness;
            ctx.lineTo(p.x + Math.cos(theta) * rSub, p.y + Math.sin(theta) * rSub);
        }
        ctx.closePath();
    }

    const sunsetCol = colors.sunsetRGB || arch.sunsetRGB || [251, 146, 60];
    const nightCol = lerpRGB(subcrustCol, [2, 3, 7], 0.92);
    const deepNightCol = [1, 2, 4];
    const nightAirglow = colors.nightAirglow || arch.nightAirglow || rimCol;

    const brightTopsoil = applyStorm([
        Math.min(255, Math.round(topsoilCol[0] * 1.25 + 22)),
        Math.min(255, Math.round(topsoilCol[1] * 1.25 + 22)),
        Math.min(255, Math.round(topsoilCol[2] * 1.25 + 22))
    ]);

    const topsoilGrad = ctx.createLinearGradient(sunX, sunY, antiSunX, antiSunY);
    topsoilGrad.addColorStop(0.00, rgbStr(brightTopsoil, 0.96));
    topsoilGrad.addColorStop(0.35, rgbStr(effTopsoilCol, 0.92));
    topsoilGrad.addColorStop(0.55, rgbStr(lerpRGB(effTopsoilCol, nightCol, 0.65), 0.92));
    topsoilGrad.addColorStop(0.72, rgbStr(lerpRGB(nightCol, deepNightCol, 0.55), 0.96));
    topsoilGrad.addColorStop(1.00, rgbStr(deepNightCol, 0.98));
    ctx.fillStyle = topsoilGrad;
    ctx.fill();

    // Textura mineral/eólica sutil anclada al planeta sobre la cinta de corteza superficial
    if (typeof VisualTextures !== 'undefined' && camera.zoom > 0.14) {
        const crustTex = VisualTextures.getForArchetype(ctx, arch);
        if (crustTex) {
            ctx.save();
            ctx.clip();
            ctx.translate(p.x, p.y);
            ctx.globalCompositeOperation = 'soft-light';
            ctx.globalAlpha = clamp((camera.zoom - 0.14) * 1.2, 0, 0.42);
            ctx.fillStyle = crustTex;
            const spanR = (p.maxSurfaceRadius || p.radius) + 140;
            ctx.fillRect(-spanR, -spanR, spanR * 2, spanR * 2);
            ctx.restore();
        }
    }

    // 1.4 y 1.5. Cintas continuas suaves de realce altitudinal (cumbres/cráteres) y hillshading direccional sin uniones circulares
    if (camera.zoom > 0.14) {
        const arcKs = [];
        for (let k = arc.kMin; k <= arc.kMax; k += arc.stride) arcKs.push(k);
        if (arcKs.length > 0 && arcKs[arcKs.length - 1] !== arc.kMax) arcKs.push(arc.kMax);

        const nS = arcKs.length;
        if (nS >= 2) {
            const drawTaperedRibbon = (depths, fillStyle) => {
                let j = 0;
                while (j < nS) {
                    if (depths[j] <= 0.05) { j++; continue; }
                    const start = j;
                    while (j < nS && depths[j] > 0.05) j++;
                    const end = j - 1;
                    if (end - start < 1) continue;

                    const lo = (start > 0 && isSolidRimIdx(((arcKs[start - 1] % total) + total) % total)) ? start - 1 : start;
                    const hi = (end < nS - 1 && isSolidRimIdx(((arcKs[end + 1] % total) + total) % total)) ? end + 1 : end;

                    ctx.beginPath();
                    for (let i = lo; i <= hi; i++) {
                        const k = arcKs[i];
                        const idx = ((k % total) + total) % total;
                        const theta = k * arc.dTheta;
                        const r = p.heights[idx];
                        const vx = p.x + Math.cos(theta) * r;
                        const vy = p.y + Math.sin(theta) * r;
                        if (i === lo) ctx.moveTo(vx, vy);
                        else ctx.lineTo(vx, vy);
                    }
                    for (let i = hi; i >= lo; i--) {
                        const k = arcKs[i];
                        const idx = ((k % total) + total) % total;
                        const theta = k * arc.dTheta;
                        const rSub = p.heights[idx] - depths[i];
                        ctx.lineTo(p.x + Math.cos(theta) * rSub, p.y + Math.sin(theta) * rSub);
                    }
                    ctx.closePath();
                    ctx.fillStyle = fillStyle;
                    ctx.fill();
                }
            };

            const highPeakCol = applyStorm(colors.highPeakCapColor || arch.highPeakCapColor || lerpRGB(rimCol, [255, 255, 255], 0.45));
            const hScale = p.heightScale || 1;
            const elevAlphaBase = clamp((camera.zoom - 0.14) * 1.1, 0, 0.46) * (1 - stormDark * 0.72);
            const sunVecX = Math.cos(p.lightAngle);
            const sunVecY = Math.sin(p.lightAngle);
            const ribbonScale = Math.min(2.1, scaleFactor);

            const peakDepths = new Float32Array(nS);
            const basinDepths = new Float32Array(nS);

            for (let i = 0; i < nS; i++) {
                const k = arcKs[i];
                const idx = ((k % total) + total) % total;
                if (!isSolidRimIdx(idx)) continue;
                const h = p.heights[idx] - p.radius;
                if (h > 24 * hScale) {
                    const theta = k * arc.dTheta;
                    const sunDot = Math.cos(theta) * sunVecX + Math.sin(theta) * sunVecY;
                    if (sunDot > -0.15) {
                        const strength = clamp((h - 24 * hScale) / (68 * hScale), 0, 1);
                        const lightMult = clamp((sunDot + 0.15) * 1.15, 0.0, 1.0);
                        peakDepths[i] = (3.5 + strength * 7.5) * ribbonScale * lightMult;
                    }
                } else if (h < -16 * hScale) {
                    const depthStrength = clamp((-h - 16 * hScale) / (58 * hScale), 0, 1);
                    basinDepths[i] = (3.2 + depthStrength * 6.8) * ribbonScale;
                }
            }

            drawTaperedRibbon(peakDepths, rgbStr(highPeakCol, elevAlphaBase));
            drawTaperedRibbon(basinDepths, rgbStr(lerpRGB(subcrustCol, [2, 4, 10], 0.72), elevAlphaBase * 0.65));

            if (camera.zoom > 0.22) {
                const hillAlphaBase = clamp((camera.zoom - 0.22) * 0.9, 0, 0.44) * (1 - stormDark * 0.80);
                const sunSlopeDepths = new Float32Array(nS);
                const shadeSlopeDepths = new Float32Array(nS);

                for (let i = 0; i < nS - 1; i++) {
                    const k0 = arcKs[i];
                    const k1 = arcKs[i + 1];
                    const spanK = Math.max(1, k1 - k0);
                    const idx0 = ((k0 % total) + total) % total;
                    const idx1 = ((k1 % total) + total) % total;
                    if (!isSolidRimIdx(idx0) || !isSolidRimIdx(idx1)) continue;

                    const theta0 = k0 * arc.dTheta;
                    const arcSpan = Math.max(1, p.radius * arc.dTheta * spanK);
                    const slope = clamp((p.heights[idx1] - p.heights[idx0]) / arcSpan, -1.5, 1.5);
                    if (Math.abs(slope) < 0.05) continue;

                    const radX = Math.cos(theta0);
                    const radY = Math.sin(theta0);
                    const nX = radX + radY * slope;
                    const nY = radY - radX * slope;
                    const nLen = Math.hypot(nX, nY) || 1;
                    const sunDot = (nX * sunVecX + nY * sunVecY) / nLen;
                    if (sunDot < -0.12) continue;

                    const slopeBias = sunDot - (radX * sunVecX + radY * sunVecY);
                    if (slopeBias > 0.05) {
                        sunSlopeDepths[i] = clamp((slopeBias - 0.05) * 9.5, 0, 5.2) * ribbonScale;
                    } else if (slopeBias < -0.05) {
                        shadeSlopeDepths[i] = clamp((-slopeBias - 0.05) * 9.5, 0, 5.2) * ribbonScale;
                    }
                }

                drawTaperedRibbon(sunSlopeDepths, rgbStr(lerpRGB(effRimCol, [255, 255, 255], 0.45 * (1 - stormDark * 0.8)), 0.50 * hillAlphaBase));
                drawTaperedRibbon(shadeSlopeDepths, `rgba(2, 5, 14, ${0.46 * hillAlphaBase})`);
            }
        }
    }

    // 2. Cuencas, Lagos y Mares Cinemáticos asentados sobre el manto rocoso con destellos solares especulares (Sunglint)
    drawCinematicPlanetLakes(p, timeSec, colors, arch);

    // 3. BORDE DE HORIZONTE BESADO POR EL SOL (SUN-KISSED RIM GLOW — omite gargantas abiertas y recorta al viewport)
    ctx.beginPath();
    if (!hasOpenCaves) {
        let first = true;
        for (let k = arc.kMin; k <= arc.kMax; k += arc.stride) {
            const idx = ((k % total) + total) % total;
            const theta = k * arc.dTheta;
            const r = p.heights[idx];
            const vx = p.x + Math.cos(theta) * r;
            const vy = p.y + Math.sin(theta) * r;
            if (first) { ctx.moveTo(vx, vy); first = false; }
            else ctx.lineTo(vx, vy);
        }
        if ((arc.kMax - arc.kMin) % arc.stride !== 0) {
            const idx = ((arc.kMax % total) + total) % total;
            const theta = arc.kMax * arc.dTheta;
            const r = p.heights[idx];
            ctx.lineTo(p.x + Math.cos(theta) * r, p.y + Math.sin(theta) * r);
        }
        if (!arc.partialArc) ctx.closePath();
    } else {
        let drawing = false;
        for (let k = arc.kMin; k <= arc.kMax; k += arc.stride) {
            const idx = ((k % total) + total) % total;
            const solid = isSolidRimIdx(idx);
            const theta = k * arc.dTheta;
            const r = p.heights[idx];
            const vx = p.x + Math.cos(theta) * r;
            const vy = p.y + Math.sin(theta) * r;
            if (solid) {
                if (!drawing) { ctx.moveTo(vx, vy); drawing = true; }
                else ctx.lineTo(vx, vy);
            } else {
                drawing = false;
            }
        }
        if ((arc.kMax - arc.kMin) % arc.stride !== 0) {
            const idx = ((arc.kMax % total) + total) % total;
            if (isSolidRimIdx(idx)) {
                const theta = arc.kMax * arc.dTheta;
                const r = p.heights[idx];
                if (drawing) ctx.lineTo(p.x + Math.cos(theta) * r, p.y + Math.sin(theta) * r);
            }
        }
    }

    const rimStormFade = 1 - stormDark * 0.78;
    const rimGrad = ctx.createLinearGradient(sunX, sunY, antiSunX, antiSunY);
    rimGrad.addColorStop(0.00, rgbStr(lerpRGB(effRimCol, [255, 255, 255], 0.6 * (1 - stormDark * 0.85)), 0.98 * rimStormFade));
    rimGrad.addColorStop(0.35, rgbStr(effRimCol, 0.90 * rimStormFade));
    rimGrad.addColorStop(0.55, rgbStr(lerpRGB(effRimCol, nightCol, 0.55), 0.35 * rimStormFade));
    rimGrad.addColorStop(0.70, rgbStr(lerpRGB(nightAirglow, nightCol, 0.75), 0.04));
    rimGrad.addColorStop(0.86, 'rgba(0, 0, 0, 0)');
    rimGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');

    // Halo exterior cálido de dunas / cumbres
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 3.4;
    ctx.stroke();

    // Trazo nítido interior iluminado por el sol SOLO en el hemisferio iluminado (sin halo blanco nocturno ni aristas duras)
    const sunStrokeGrad = ctx.createLinearGradient(sunX, sunY, antiSunX, antiSunY);
    sunStrokeGrad.addColorStop(0.00, `rgba(255, 252, 242, ${(0.85 * (1 - stormDark * 0.88)).toFixed(3)})`);
    sunStrokeGrad.addColorStop(0.30, `rgba(255, 252, 242, ${(0.60 * (1 - stormDark * 0.88)).toFixed(3)})`);
    sunStrokeGrad.addColorStop(0.50, `rgba(254, 215, 170, ${(0.20 * (1 - stormDark * 0.88)).toFixed(3)})`);
    sunStrokeGrad.addColorStop(0.62, 'rgba(255, 252, 242, 0.0)');
    sunStrokeGrad.addColorStop(1.00, 'rgba(255, 252, 242, 0.0)');

    ctx.strokeStyle = sunStrokeGrad;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Brillo sutil de corteza activa en mundos volcánicos, tóxicos, vivos, artificiales, fragmentados o singulares
    if (['volcanic', 'toxic', 'gravitic', 'artificial', 'living', 'shattered', 'temporal'].includes(arch.classId)) {
        const pulse = 0.24 + 0.14 * Math.sin(timeSec * 2.2 + (p.surfaceSeed || 0) * 10);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rgbStr(accentCol || rimCol, pulse);
        ctx.lineWidth = 2.1;
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}

/**
 * Dibuja el Sistema Meteorológico Planetario Cinemático: Nubes Volumétricas Orgánicas 3D,
 * Sombreado Solar Direccional, Deformación de Estela por Cohete, Rayos Ocasionales y Lluvia Delicada.
 */
function getCloudBandPuffSprite(r, g, b) {
    if (!getCloudBandPuffSprite._cache) getCloudBandPuffSprite._cache = new Map();
    const qr = Math.min(255, Math.max(0, (Math.round(r) + 4) >> 3 << 3));
    const qg = Math.min(255, Math.max(0, (Math.round(g) + 4) >> 3 << 3));
    const qb = Math.min(255, Math.max(0, (Math.round(b) + 4) >> 3 << 3));
    const key = (qr << 16) | (qg << 8) | qb;
    let sp = getCloudBandPuffSprite._cache.get(key);
    if (sp) return sp;
    if (getCloudBandPuffSprite._cache.size > 64) getCloudBandPuffSprite._cache.clear();
    const dim = 96;
    const half = 48;
    const c = document.createElement('canvas');
    c.width = dim;
    c.height = dim;
    const gctx = c.getContext('2d');
    if (gctx) {
        const cs = `${qr}, ${qg}, ${qb}`;
        const grad = gctx.createRadialGradient(half, half, half * 0.05, half, half, half);
        grad.addColorStop(0.00, `rgba(${cs}, 1.0)`);
        grad.addColorStop(0.35, `rgba(${cs}, 0.65)`);
        grad.addColorStop(0.70, `rgba(${cs}, 0.22)`);
        grad.addColorStop(1.00, 'rgba(0,0,0,0)');
        gctx.fillStyle = grad;
        gctx.fillRect(0, 0, dim, dim);
    }
    getCloudBandPuffSprite._cache.set(key, c);
    return c;
}

function drawPlanetCloudBands(p, timeSec) {
    if (p.weather && p.weather.hasClouds && typeof drawPlanetWeather === 'function') {
        drawPlanetWeather(p, timeSec);
        return;
    }
    if (!p.cloudBands || p.cloudBands.length === 0) return;
    const dCam = Math.hypot(p.x - camera.x, p.y - camera.y);
    if (dCam > p.atmoRadius + Math.max(3200, (p.atmoRadius - p.radius) * 0.5)) return;

    const cloudCol = (p.colors && p.colors.cloudColor) || p.archetype.cloudColor || [235, 245, 255];
    const lightAng = (p.lightAngle !== undefined) ? p.lightAngle : -Math.PI * 0.35;
    const brightCloud = [
        Math.min(255, Math.round(cloudCol[0] * 1.15 + 24)),
        Math.min(255, Math.round(cloudCol[1] * 1.15 + 24)),
        Math.min(255, Math.round(cloudCol[2] * 1.15 + 24))
    ];
    const sunsetCol = (p.colors && p.colors.sunsetRGB) || p.archetype.sunsetRGB || [251, 146, 60];
    const baseNightRGB = (p.colors && p.colors.deepNightRGB)
        || (p.colors && p.colors.nightSkyRGB)
        || [4, 7, 14];
    const nightCloud = lerpRGB([4, 6, 12], baseNightRGB, 0.65);

    const curShip = (typeof ship !== 'undefined' && ship) ? ship : null;
    const isEngineFiring = !!(curShip && (
        (curShip.thrustIntensity > 0.03 || curShip.thrusting || (curShip.warping && (curShip.fuel > 0 || curShip.infiniteFuel))) &&
        (curShip.fuel > 0 || curShip.godMode || curShip.infiniteFuel)
    ));
    let flameInfo = null;
    let flameX = 0, flameY = 0, flameRad = 0;
    if (isEngineFiring) {
        flameInfo = (typeof getRocketFlameInfo === 'function')
            ? getRocketFlameInfo(curShip)
            : { flameColor: 'standard', rgb: (curShip.warping && (curShip.fuel > 0 || curShip.infiniteFuel)) ? [125, 211, 252] : [251, 175, 60] };
        const sScale = curShip.scale || 1.0;
        const nozDist = 16 * sScale;
        const nozX = curShip.x - Math.cos(curShip.angle) * nozDist;
        const nozY = curShip.y - Math.sin(curShip.angle) * nozDist;
        const flameExtend = 26 * sScale * Math.min(1.4, Math.max(0.4, curShip.thrustIntensity));
        flameX = nozX - Math.cos(curShip.angle) * flameExtend;
        flameY = nozY - Math.sin(curShip.angle) * flameExtend;
        flameRad = (360 + (curShip.smokeScale || 1.0) * 90) * Math.max(0.75, sScale * 0.9);
    }
    const hasLightingEngine = (typeof LightingEngine !== 'undefined');
    const viewLim = (screenW / camera.zoom) + 600;

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    for (const cb of p.cloudBands) {
        const baseR = p.radius + cb.alt;
        const cx = p.x + Math.cos(cb.angle) * baseR;
        const cy = p.y + Math.sin(cb.angle) * baseR;

        if (Math.hypot(cx - camera.x, cy - camera.y) > viewLim) continue;

        for (const sp of cb.subPuffs) {
            const ang = cb.angle + sp.angOffset;
            const r = baseR + sp.rOffset;
            const px = p.x + Math.cos(ang) * r;
            const py = p.y + Math.sin(ang) * r;

            const sunDot = Math.cos(ang - lightAng);
            const dayWeight = smoothstep(-0.25, 0.35, sunDot);
            const nightWeight = smoothstep(0.25, -0.35, sunDot);
            const twiGate = smoothstep(-0.16, 0.08, sunDot);
            const twiWeight = Math.exp(-Math.pow(sunDot / 0.24, 2)) * twiGate;

            let cCol = lerpRGB(cloudCol, brightCloud, dayWeight * 0.85);
            if (twiWeight > 0.01) {
                cCol = lerpRGB(cCol, sunsetCol, twiWeight * 0.65);
            }
            if (nightWeight > 0.01) {
                cCol = lerpRGB(cCol, nightCloud, nightWeight * 0.96);
            }

            let thrusterGlow = 0;
            let lightDx = 0.5;
            let lightDy = -0.866;
            if (isEngineFiring) {
                const dFlame = Math.hypot(px - flameX, py - flameY);
                if (dFlame < flameRad) {
                    thrusterGlow = Math.pow(1 - dFlame / flameRad, 1.22) * clamp(curShip.thrustIntensity, 0.2, 1.35);
                    lightDx = (px - flameX) / (dFlame || 1);
                    lightDy = (py - flameY) / (dFlame || 1);
                }
            }

            if (thrusterGlow > 0.01 && flameInfo) {
                if (nightWeight > 0.01) {
                    const effNight = nightWeight * (1.0 - clamp(thrusterGlow * 1.35, 0, 1.0));
                    cCol = lerpRGB(cCol, cloudCol, 1.0 - (effNight / nightWeight));
                }
                cCol = lerpRGB(cCol, flameInfo.rgb, clamp(thrusterGlow * (0.90 + 0.35 * nightWeight), 0, 0.95));
            }

            const dynLight = hasLightingEngine ? LightingEngine.samplePoint(px, py, sp.rad) : null;
            let dynIllum = 0;
            if (dynLight && dynLight.illum > 0.01) {
                dynIllum = dynLight.illum;
                const dynRGB = [dynLight.r, dynLight.g, dynLight.b];
                if (nightWeight > 0.01) {
                    cCol = lerpRGB(cCol, cloudCol, clamp(dynIllum * 0.85 * nightWeight, 0, 0.88));
                }
                cCol = lerpRGB(cCol, dynRGB, clamp(dynIllum * (0.68 + 0.32 * nightWeight), 0, 0.90));
                if (thrusterGlow <= 0.02) {
                    lightDx = -dynLight.dirX;
                    lightDy = -dynLight.dirY;
                }
            }

            const aPeak = sp.alpha * (0.09 + 0.91 * dayWeight + 0.35 * twiWeight + thrusterGlow * 0.55 + dynIllum * 0.48);
            if (aPeak <= 0.005) continue;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(ang + Math.PI * 0.5);
            ctx.scale(2.1, 0.52);

            if (thrusterGlow <= 0.02 && dynIllum <= 0.02) {
                const puffSprite = getCloudBandPuffSprite(cCol[0], cCol[1], cCol[2]);
                ctx.globalAlpha = baseAlpha * clamp(aPeak, 0, 1);
                ctx.drawImage(puffSprite, -sp.rad, -sp.rad, sp.rad * 2, sp.rad * 2);
            } else {
                const rot = ang + Math.PI * 0.5;
                const cosR = Math.cos(rot);
                const sinR = Math.sin(rot);
                const hlX = (-lightDx * cosR - lightDy * sinR) * (sp.rad * 0.25);
                const hlY = (-lightDx * (-sinR) - lightDy * cosR) * (sp.rad * 0.25);
                const cR = cCol[0], cG = cCol[1], cB = cCol[2];
                const grad = ctx.createRadialGradient(hlX, hlY, sp.rad * 0.05, 0, 0, sp.rad);
                grad.addColorStop(0.00, `rgba(${cR}, ${cG}, ${cB}, ${aPeak})`);
                grad.addColorStop(0.35, `rgba(${cR}, ${cG}, ${cB}, ${aPeak * 0.65})`);
                grad.addColorStop(0.70, `rgba(${cR}, ${cG}, ${cB}, ${aPeak * 0.22})`);
                grad.addColorStop(1.00, 'rgba(0,0,0,0)');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, sp.rad, 0, Math.PI * 2);
                ctx.fill();

                if ((thrusterGlow > 0.16 && flameInfo) || dynIllum > 0.14) {
                    ctx.globalCompositeOperation = 'lighter';
                    const fRGB = (thrusterGlow > dynIllum && flameInfo) ? flameInfo.rgb : [dynLight ? dynLight.r : 238, dynLight ? dynLight.g : 246, dynLight ? dynLight.b : 255];
                    const peakGlow = Math.max(thrusterGlow - 0.16, dynIllum - 0.14);
                    const glowR = sp.rad * 0.65;
                    const glowGrad = ctx.createRadialGradient(hlX, hlY, 1, 0, 0, glowR);
                    const gStr = peakGlow * (0.75 + 0.45 * nightWeight) * aPeak;
                    glowGrad.addColorStop(0, `rgba(${fRGB[0]}, ${fRGB[1]}, ${fRGB[2]}, ${gStr})`);
                    glowGrad.addColorStop(0.45, `rgba(${fRGB[0]}, ${fRGB[1]}, ${fRGB[2]}, ${gStr * 0.35})`);
                    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = glowGrad;
                    ctx.beginPath();
                    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        }
    }
    ctx.restore();
}

// ============================================================================
// MOTOR CINEMÁTICO DE ANILLOS PLANETARIOS (ÓRBITA HD + BÓVEDA EN SUPERFICIE)
// ============================================================================

const ringSpriteCache = new Map();
let ringScratchCanvas = null;
let ringScratchCtx = null;

/**
 * Genera el perfil radial normalizado (256 muestras) compartido tanto por el sprite orbital
 * como por el arco celeste en superficie, garantizando coherencia física y estética total.
 */
function getRingRadialProfile(style, rimCol, accentCol, litCol, alphaBase) {
    const N = 256;
    const profile = new Array(N);
    const warmCream = [255, 250, 232];
    const iceWhite = [248, 252, 255];
    const dustBrown = lerpRGB(litCol, [150, 130, 105], 0.45);

    for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        // Suavizado orgánico en bordes interno y externo (cero cortes bruscos)
        const edgeFade = smoothstep(0.0, 0.055, t) * smoothstep(1.0, 0.945, t);
        // Micro-anillos concéntricos armónicos (ondas de densidad tipo Cassini)
        const ringlets =
            0.82 +
            0.10 * Math.sin(t * 145.0) * Math.cos(t * 31.0) +
            0.05 * Math.sin(t * 290.0 + 1.3) +
            0.03 * Math.cos(t * 480.0);

        let a = 0;
        let col = rimCol;

        if (style === 'saturnian_rings') {
            // Anillo C interior (velo crepe translúcido)
            const cBand = Math.exp(-Math.pow((t - 0.13) / 0.085, 2)) * 0.28;
            // Anillo B (cuerpo principal denso, cálido y luminoso)
            const bBand = smoothstep(0.18, 0.23, t) * smoothstep(0.57, 0.53, t) *
                (0.86 + 0.14 * Math.sin((t - 0.22) * 26.0));
            // División de Cassini (brecha limpia real entre 0.55 y 0.63)
            const cassiniMask = 1.0 - Math.exp(-Math.pow((t - 0.59) / 0.028, 2)) * 0.97;
            // Anillo A (banda exterior sedosa)
            const aBand = smoothstep(0.62, 0.65, t) * smoothstep(0.91, 0.88, t) * 0.78;
            // Brecha de Encke (estrecha en 0.82)
            const enckeMask = 1.0 - Math.exp(-Math.pow((t - 0.82) / 0.009, 2)) * 0.92;
            // Anillo F exterior (cinta fina brillante)
            const fBand = Math.exp(-Math.pow((t - 0.955) / 0.014, 2)) * 0.74;

            a = (cBand + bBand + aBand) * cassiniMask * enckeMask + fBand;

            if (t < 0.21) {
                col = lerpRGB(dustBrown, accentCol, 0.35);
            } else if (t < 0.58) {
                col = lerpRGB(rimCol, warmCream, 0.35 + 0.25 * Math.sin(t * 18.0));
            } else if (t < 0.92) {
                col = lerpRGB(rimCol, accentCol, 0.30);
            } else {
                col = lerpRGB(rimCol, iceWhite, 0.65);
            }
        } else if (style === 'crystalline_ring') {
            const inner = smoothstep(0.06, 0.12, t) * smoothstep(0.54, 0.50, t) * 0.85;
            const crest = Math.exp(-Math.pow((t - 0.44) / 0.045, 2)) * 0.35;
            const gap = 1.0 - Math.exp(-Math.pow((t - 0.58) / 0.030, 2)) * 0.96;
            const outer = smoothstep(0.61, 0.65, t) * smoothstep(0.95, 0.90, t) * 0.82;
            const haloF = Math.exp(-Math.pow((t - 0.955) / 0.015, 2)) * 0.88;

            a = (inner + crest + outer) * gap + haloF;
            col = lerpRGB(accentCol, iceWhite, 0.35 + 0.55 * Math.pow(Math.sin(t * Math.PI), 2));
            if (t > 0.40 && t < 0.50) col = lerpRGB(col, iceWhite, 0.6);
        } else if (style === 'opalescent_rings') {
            const band1 = smoothstep(0.08, 0.16, t) * smoothstep(0.56, 0.50, t) * 0.82;
            const gap = 1.0 - Math.exp(-Math.pow((t - 0.58) / 0.022, 2)) * 0.82;
            const band2 = smoothstep(0.58, 0.64, t) * smoothstep(0.96, 0.88, t) * 0.76;
            const rimF = Math.exp(-Math.pow((t - 0.95) / 0.016, 2)) * 0.72;

            a = (band1 + band2) * gap + rimF;
            // Iridiscencia espectral suave
            const cA = [192, 132, 252];
            const cB = [244, 114, 182];
            const cC = [254, 240, 138];
            const cD = [56, 189, 248];
            if (t < 0.33) col = lerpRGB(cA, cB, t / 0.33);
            else if (t < 0.66) col = lerpRGB(cB, cC, (t - 0.33) / 0.33);
            else col = lerpRGB(cC, cD, (t - 0.66) / 0.34);
        } else if (style === 'dust_halo') {
            const bell1 = Math.exp(-Math.pow((t - 0.36) / 0.22, 2)) * 0.58;
            const bell2 = Math.exp(-Math.pow((t - 0.68) / 0.18, 2)) * 0.64;
            const wisp = Math.exp(-Math.pow((t - 0.88) / 0.06, 2)) * 0.32;
            a = bell1 + bell2 + wisp;
            col = lerpRGB(accentCol, rimCol, t * 0.75);
        } else { // 'double_band' / 'dense_rings'
            const inner = smoothstep(0.08, 0.14, t) * smoothstep(0.47, 0.43, t) * 0.90;
            const gap = 1.0 - Math.exp(-Math.pow((t - 0.51) / 0.036, 2)) * 0.96;
            const outer = smoothstep(0.55, 0.60, t) * smoothstep(0.92, 0.87, t) * 0.86;
            const outerEdge = Math.exp(-Math.pow((t - 0.955) / 0.014, 2)) * 0.70;

            a = (inner + outer) * gap + outerEdge;
            col = lerpRGB(accentCol, rimCol, 0.45 + 0.35 * Math.sin(t * 10.0));
        }

        const finalAlpha = clamp(a * ringlets * edgeFade * alphaBase, 0, 0.96);
        profile[i] = {
            t,
            alpha: finalAlpha,
            r: Math.round(col[0]),
            g: Math.round(col[1]),
            b: Math.round(col[2])
        };
    }
    return profile;
}

/**
 * Construye y cachea un sprite de alta definición (768x768) del sistema de anillos.
 */
function getPlanetRingSprite(p, rIn, rOut) {
    const rimCol = (p.colors && p.colors.rimColor) || p.archetype.rimColor || [224, 242, 254];
    const accentCol = (p.colors && p.colors.accentColor) || p.archetype.accentColor || rimCol;
    const litCol = (p.colors && p.colors.litColor) || p.archetype.litColor || rimCol;
    const alphaBase = p.ringAlpha || 0.88;
    const style = p.ringStyle || 'saturnian_rings';
    const ratio = clamp(rIn / Math.max(1, rOut), 0.25, 0.85);
    const ratioKey = Math.round(ratio * 50);

    const key = `${style}_${ratioKey}_${rimCol.join(',')}_${accentCol.join(',')}_${Math.round(alphaBase * 20)}`;
    if (ringSpriteCache.has(key)) {
        return ringSpriteCache.get(key);
    }

    const size = 768;
    const half = size * 0.5;
    const maxR = half - 6;
    const minR = maxR * ratio;
    const spanR = Math.max(1, maxR - minR);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const cctx = canvas.getContext('2d');
    const img = cctx.createImageData(size, size);
    const data = img.data;

    const profile = getRingRadialProfile(style, rimCol, accentCol, litCol, alphaBase);
    const profMax = profile.length - 1;

    for (let py = 0; py < size; py++) {
        const dy = py - half;
        for (let px = 0; px < size; px++) {
            const dx = px - half;
            const dist = Math.hypot(dx, dy);
            if (dist < minR || dist > maxR) continue;

            const t = (dist - minR) / spanR;
            const fIdx = t * profMax;
            const idx0 = Math.floor(fIdx);
            const idx1 = Math.min(profMax, idx0 + 1);
            const frac = fIdx - idx0;

            const p0 = profile[idx0];
            const p1 = profile[idx1];
            const baseA = p0.alpha + (p1.alpha - p0.alpha) * frac;
            if (baseA <= 0.003) continue;

            // Micro-grano azimutal sutil (polvo y hielo en órbita)
            const ang = Math.atan2(dy, dx);
            const grain = 0.94 + 0.06 * Math.sin(ang * 22.0 + t * 85.0) * Math.cos(ang * 13.0 - t * 42.0);
            const outA = Math.min(255, Math.round(baseA * grain * 255));

            const outIdx = (py * size + px) * 4;
            data[outIdx] = Math.round(p0.r + (p1.r - p0.r) * frac);
            data[outIdx + 1] = Math.round(p0.g + (p1.g - p0.g) * frac);
            data[outIdx + 2] = Math.round(p0.b + (p1.b - p0.b) * frac);
            data[outIdx + 3] = outA;
        }
    }

    cctx.putImageData(img, 0, 0);

    if (ringSpriteCache.size >= 20) {
        const firstKey = ringSpriteCache.keys().next().value;
        ringSpriteCache.delete(firstKey);
    }
    ringSpriteCache.set(key, canvas);
    return canvas;
}

function drawPlanetRingHalf(p, isBack, timeSec = 0) {
    if (!p.hasRings) return;
    const inclination = p.ringInclination || 0.28;
    const tilt = p.ringTilt || 0.25;

    // Distancia de la cámara a la superficie del planeta
    const distCamCenter = Math.hypot(p.x - camera.x, p.y - camera.y);
    const distCamSurf = distCamCenter - p.radius;

    // Transición suave al descender a la superficie: ambos hemisferios orbitales se atenúan
    // suavemente para dar paso al Arco Celeste en Superficie sin dejar cortes en el ecuador.
    const backFade = smoothstep(p.radius * 0.05, p.radius * 0.28, distCamSurf);
    const frontFade = smoothstep(p.radius * 0.14, p.radius * 0.42, distCamSurf);
    const activeFade = isBack ? backFade : frontFade;
    if (activeFade <= 0.01) return;

    const rIn = p.radius * (p.ringInnerMult || 1.25);
    const rOut = p.radius * (p.ringOuterMult || 2.35);

    const sprite = getPlanetRingSprite(p, rIn, rOut);
    const spriteSize = sprite.width;
    const spriteHalf = spriteSize * 0.5;
    const spriteMaxR = spriteHalf - 6;

    // Dispersión fotométrica según la orientación del Sol
    const viewSunDot = Math.cos((p.lightAngle || 0) - (camera.rotation || 0));
    const forwardScatter = clamp(viewSunDot * 0.22 + 0.92, 0.72, 1.15);

    ctx.save();
    ctx.globalAlpha *= activeFade * clamp(forwardScatter, 0.7, 1.0);

    if (isBack) {
        // Usar canvas scratch para aplicar la sombra del planeta EXCLUSIVAMENTE sobre los anillos
        if (!ringScratchCanvas) {
            ringScratchCanvas = document.createElement('canvas');
            ringScratchCanvas.width = spriteSize;
            ringScratchCanvas.height = spriteSize;
            ringScratchCtx = ringScratchCanvas.getContext('2d');
        }
        const sctx = ringScratchCtx;
        sctx.clearRect(0, 0, spriteSize, spriteSize);

        // Copiar solo la mitad trasera (y <= spriteHalf)
        sctx.save();
        sctx.beginPath();
        sctx.rect(0, 0, spriteSize, spriteHalf + 1);
        sctx.clip();
        sctx.drawImage(sprite, 0, 0);

        // Aplicar sombra cónica real del planeta solo sobre los píxeles del anillo (source-atop)
        sctx.globalCompositeOperation = 'source-atop';
        const shadowAngle = (p.lightAngle || 0) + Math.PI;
        const relShadow = shadowAngle - tilt;
        // Proyectar dirección de sombra al plano circular del anillo (deshaciendo inclination)
        const localShadowAng = Math.atan2(Math.sin(relShadow) / Math.max(0.12, inclination), Math.cos(relShadow));

        const planetRadiusInSprite = (p.radius / rOut) * spriteMaxR;
        const shWidth = planetRadiusInSprite * 1.02;
        const penumbra = planetRadiusInSprite * 0.20;

        sctx.save();
        sctx.translate(spriteHalf, spriteHalf);
        sctx.rotate(localShadowAng);

        const shGrad = sctx.createLinearGradient(0, -shWidth - penumbra, 0, shWidth + penumbra);
        shGrad.addColorStop(0.00, 'rgba(0, 0, 0, 0)');
        shGrad.addColorStop(0.14, 'rgba(32, 14, 10, 0.42)'); // Penumbra cálida refractada
        shGrad.addColorStop(0.30, 'rgba(4, 6, 14, 0.90)');
        shGrad.addColorStop(0.50, 'rgba(2, 4, 10, 0.95)');
        shGrad.addColorStop(0.70, 'rgba(4, 6, 14, 0.90)');
        shGrad.addColorStop(0.86, 'rgba(32, 14, 10, 0.42)');
        shGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');

        sctx.fillStyle = shGrad;
        sctx.fillRect(planetRadiusInSprite * 0.72, -shWidth - penumbra, spriteHalf, (shWidth + penumbra) * 2);
        sctx.restore();
        sctx.restore();

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(tilt);
        ctx.scale(1, inclination);
        const drawScale = rOut / spriteMaxR;
        const drawSize = spriteSize * drawScale;
        ctx.drawImage(ringScratchCanvas, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
        ctx.restore();
    } else {
        // Mitad delantera (y >= spriteHalf)
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(tilt);
        ctx.scale(1, inclination);
        const drawScale = rOut / spriteMaxR;
        const drawHalf = (spriteSize * drawScale) * 0.5;
        ctx.drawImage(
            sprite,
            0, spriteHalf, spriteSize, spriteHalf,
            -drawHalf, 0, drawHalf * 2, drawHalf
        );
        ctx.restore();
    }

    // Destellos suaves continuos de micro-partículas cristalinas en órbita (sin saltos discretos ni óvalos aplastados)
    const startAng = isBack ? Math.PI : 0;
    const endAng = isBack ? Math.PI * 2 : Math.PI;
    const particleCount = 18;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < particleCount; i++) {
        const speed = 0.012 + (i % 5) * 0.004;
        const u = ((i * 0.173 + timeSec * speed) % 1 + 1) % 1;
        const pAng = startAng + u * (endAng - startAng);
        const rFrac = ((i * 37) % 100) / 100;
        // Evitar la brecha de Cassini (~0.56 - 0.62)
        if (rFrac > 0.55 && rFrac < 0.63) continue;

        const pR = rIn + rFrac * (rOut - rIn);
        const lx = Math.cos(pAng) * pR;
        const ly = Math.sin(pAng) * pR * inclination;
        const wx = p.x + lx * cosT - ly * sinT;
        const wy = p.y + lx * sinT + ly * cosT;

        const glintAlpha = (0.18 + 0.34 * Math.pow(0.5 + 0.5 * Math.sin(timeSec * 2.6 + i * 2.1), 2)) * activeFade;
        const glintR = Math.max(1.2, 2.2 / Math.max(0.25, camera.zoom * 0.7));
        ctx.fillStyle = `rgba(255, 255, 255, ${glintAlpha})`;
        ctx.beginPath();
        ctx.arc(wx, wy, Math.min(glintR, p.radius * 0.006), 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Renderiza el Arco Celeste de Anillos Planetarios visto desde la superficie o atmósfera baja.
 * Cruza la bóveda del cielo de horizonte a horizonte con perspectiva gran angular,
 * División de Cassini transparente, eclipse nocturno del planeta y dispersión atmosférica.
 */
function drawSurfaceRingArch(pNear, solarState, timeSec, atmoBlend) {
    if (!pNear || !pNear.hasRings || atmoBlend <= 0.01) return;

    const distCamSurf = Math.hypot(pNear.x - camera.x, pNear.y - camera.y) - pNear.radius;
    const archVis = atmoBlend * smoothstep(pNear.radius * 0.36, pNear.radius * 0.06, distCamSurf);
    if (archVis <= 0.01) return;

    const col = pNear.colors || {};
    const arch = pNear.archetype || {};
    const rimCol = col.rimColor || arch.rimColor || [224, 242, 254];
    const accentCol = col.accentColor || arch.accentColor || rimCol;
    const litCol = col.litColor || arch.litColor || rimCol;
    const sunsetCol = col.sunsetRGB || arch.sunsetRGB || [251, 146, 60];
    const skyCol = camera.skyColor || [56, 189, 248];
    const style = pNear.ringStyle || 'saturnian_rings';
    const alphaBase = pNear.ringAlpha || 0.88;

    const dayFactor = solarState ? clamp(solarState.dayFactor, 0, 1) : 0.5;
    const twilightFactor = solarState ? clamp(solarState.twilightFactor, 0, 1) : 0;
    const nightFactor = solarState ? clamp(solarState.nightFactor, 0, 1) : 0;

    // En superficie: de día los anillos son etéreos/translúcidos en el azul del cielo;
    // al atardecer toman tonos cálidos; de noche brillan nítidos contra las estrellas.
    const atmoOpacity = lerp(0.30, 0.86, Math.pow(nightFactor, 0.75)) + twilightFactor * 0.16;
    const finalVis = archVis * clamp(atmoOpacity, 0.18, 0.92);

    // Latitud del observador respecto al plano ecuatorial de los anillos
    const obsAngle = Math.atan2(camera.y - pNear.y, camera.x - pNear.x);
    const lat = obsAngle - (pNear.ringTilt || 0.25);

    // Geometría del arco en perspectiva sobre la bóveda celeste
    const cx = screenW * 0.5 + Math.sin(lat) * screenW * 0.08;
    const horizonY = screenH * 0.94;
    const archSpanX = Math.max(screenW, screenH) * 0.76;
    const archHeight = screenH * (0.58 + 0.16 * Math.cos(lat * 2.0));
    const archTilt = Math.sin(lat * 2.0) * 0.12;
    const bandThickness = Math.min(screenW, screenH) * 0.135;

    // Perfil radial compartido
    const profile = getRingRadialProfile(style, rimCol, accentCol, litCol, alphaBase);
    const steps = 30;
    const segs = 36;

    // Parámetros del eclipse nocturno del planeta sobre su propio anillo
    const sunRel = (pNear.lightAngle || 0) - obsAngle;
    const eclipseCenterU = 0.5 + Math.sin(sunRel) * 0.28;
    const eclipseStrength = smoothstep(0.18, 0.75, nightFactor);

    ctx.save();
    ctx.translate(cx, horizonY);
    ctx.rotate(archTilt);

    // Brillo atmosférico suave detrás del arco (halo sutil de polvo helado)
    ctx.save();
    const glowAlpha = finalVis * 0.10;
    ctx.strokeStyle = rgbStr(lerpRGB(rimCol, sunsetCol, twilightFactor * 0.6), glowAlpha);
    ctx.lineWidth = bandThickness * 1.45;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(0, 0, archSpanX, archHeight, 0, Math.PI * 1.02, Math.PI * 1.98);
    ctx.stroke();
    ctx.restore();

    // Trazar el arco por bandas concéntricas usando el perfil radial real
    for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const pIdx = Math.min(profile.length - 1, Math.floor(t * (profile.length - 1)));
        const sample = profile[pIdx];
        if (sample.alpha <= 0.015) continue; // Brechas reales transparentes (Cassini / Encke)

        // Mezcla cromática con la atmósfera diurna y el crepúsculo
        let bandRGB = [sample.r, sample.g, sample.b];
        if (dayFactor > 0.05) {
            bandRGB = lerpRGB(bandRGB, lerpRGB(skyCol, [255, 255, 255], 0.55), dayFactor * 0.42);
        }
        if (twilightFactor > 0.02) {
            bandRGB = lerpRGB(bandRGB, sunsetCol, twilightFactor * 0.55);
        }

        const rOff = (t - 0.5) * bandThickness;
        const rx = archSpanX + rOff * 0.65;
        const ry = archHeight + rOff;
        const baseStepW = (bandThickness / steps) * 1.28;

        for (let k = 0; k < segs; k++) {
            const u0 = k / segs;
            const u1 = (k + 1) / segs;
            const uMid = (u0 + u1) * 0.5;

            const a0 = Math.PI + u0 * Math.PI;
            const a1 = Math.PI + u1 * Math.PI;

            // Perspectiva: más ancho en el cenit (uMid ~ 0.5), más fino hacia los horizontes
            const persp = 0.52 + 0.48 * Math.sin(uMid * Math.PI);
            // Desvanecimiento suave cerca del horizonte para fundirse con la neblina
            const horizFade = smoothstep(0.0, 0.14, uMid) * smoothstep(1.0, 0.86, uMid);

            // Sombra eclipsada del propio planeta en la noche
            let eclipseFactor = 1.0;
            let segRGB = bandRGB;
            if (eclipseStrength > 0.02) {
                const distEc = Math.abs(uMid - eclipseCenterU);
                const umbra = smoothstep(0.08, 0.19, distEc);
                const penumbraRim = Math.exp(-Math.pow((distEc - 0.13) / 0.035, 2)) * eclipseStrength;
                eclipseFactor = lerp(1.0, 0.06 + 0.94 * umbra, eclipseStrength);
                if (penumbraRim > 0.05) {
                    segRGB = lerpRGB(segRGB, [220, 110, 65], penumbraRim * 0.55);
                }
            }

            const segAlpha = sample.alpha * finalVis * horizFade * eclipseFactor;
            if (segAlpha <= 0.004) continue;

            ctx.strokeStyle = rgbStr(segRGB, segAlpha);
            ctx.lineWidth = Math.max(0.8, baseStepW * persp);
            ctx.beginPath();
            ctx.ellipse(0, 0, rx, ry, 0, a0, a1 + 0.008);
            ctx.stroke();
        }
    }

    ctx.restore();
}

/**
 * Renderiza formaciones geológicas y biológicas 100% naturales e integradas en la curvatura real de la corteza:
 * Cada formación muestrea getSurfaceRadius(p, theta) a lo largo de su arco base, hundiendo sus raíces en la roca
 * y fundiéndose cromáticamente con la paleta del suelo del planeta.
 */
function drawSurfaceProps(p, timeSec) {
    if (!p.props || p.props.length === 0) return;
    const arch = p.archetype;
    const colors = p.colors || {};
    const rimCol = colors.rimColor || arch.rimColor;
    const accentCol = colors.accentColor || arch.accentColor || rimCol;
    const crustCol = colors.crustColor || arch.crustColor;
    const topsoilCol = colors.topsoilColor || arch.topsoilColor || colors.litColor;
    const subcrustCol = colors.subcrustColor || arch.subcrustColor || crustCol;
    const coreCol = colors.coreColor || arch.coreColor;

    const viewRange = (Math.max(screenW, screenH) / Math.max(0.22, camera.zoom)) * 0.85 + 320;
    const camDistFromPlanet = Math.hypot(camera.x - p.x, camera.y - p.y);
    const camAngle = Math.atan2(camera.y - p.y, camera.x - p.x);
    const maxSurfR = p.maxSurfaceRadius || (p.radius + 300);
    // Si la cámara está lejos del planeta y fuera de viewRange respecto a la superficie máxima, salir temprano
    if (camDistFromPlanet - maxSurfR > viewRange) return;
    const minSurfR = Math.max(200, p.radius - 200);
    const useAngCull = camDistFromPlanet > viewRange * 0.45;
    const maxHalfArc = useAngCull ? Math.min(Math.PI, (viewRange / minSurfR) + 0.25) : Math.PI;
    const twoPi = Math.PI * 2;

    const stormInfo = (typeof getLocalStormDarkness === 'function' && p === ship.nearestPlanet)
        ? getLocalStormDarkness(p)
        : { worldDark: 0, tint: [36, 46, 66] };
    const stormDark = stormInfo.worldDark || 0;
    const sunsetCol = colors.sunsetRGB || arch.sunsetRGB || [251, 146, 60];
    const nightPropCol = lerpRGB(crustCol, [2, 3, 7], 0.93);
    const brightTopsoil = [
        Math.min(255, Math.round(topsoilCol[0] * 1.25 + 24)),
        Math.min(255, Math.round(topsoilCol[1] * 1.25 + 24)),
        Math.min(255, Math.round(topsoilCol[2] * 1.25 + 24))
    ];
    const baseColStatic = lerpRGB(crustCol, subcrustCol, 0.5);
    const planetLightAngle = p.lightAngle || -Math.PI * 0.35;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (const prop of p.props) {
        if (useAngCull) {
            let dAng = (prop.angle - camAngle) % twoPi;
            if (dAng > Math.PI) dAng -= twoPi;
            else if (dAng < -Math.PI) dAng += twoPi;
            if (dAng > maxHalfArc || dAng < -maxHalfArc) continue;
        }
        const centerR = getSurfaceRadius(p, prop.angle);
        const cx = p.x + Math.cos(prop.angle) * centerR;
        const cy = p.y + Math.sin(prop.angle) * centerR;

        if (Math.hypot(cx - camera.x, cy - camera.y) > viewRange) continue;

        const halfSpan = (prop.span || (32 / p.radius)) * 0.5;
        const maxH = (prop.height || 16) * (prop.scale || 1.0);
        const asym = prop.asymmetry || 0;
        const type = prop.propType || 'layered_boulder';

        // Iluminación solar local para el relieve natural y adaptación diurna/crepuscular/nocturna
        const sunDot = Math.cos(prop.angle - planetLightAngle);
        const dayWeight = smoothstep(-0.25, 0.35, sunDot);
        const nightWeight = smoothstep(0.25, -0.35, sunDot);
        const twiWeight = Math.exp(-Math.pow(sunDot / 0.24, 2));

        let crestCol = lerpRGB(topsoilCol, brightTopsoil, dayWeight * 0.75 * (1 - stormDark * 0.85));
        let baseCol = baseColStatic;

        // Transición crepuscular continua y cálida en el terminador
        if (twiWeight > 0.01) {
            crestCol = lerpRGB(crestCol, sunsetCol, 0.55 * twiWeight * (1 - stormDark * 0.75));
            baseCol = lerpRGB(baseCol, sunsetCol, 0.35 * twiWeight * (1 - stormDark * 0.75));
        }

        // Oscurecimiento por tormenta atmosférica en la cara iluminada / crepuscular
        if (stormDark > 0.01 && nightWeight < 0.98) {
            const stMix = stormDark * 0.84 * (1 - nightWeight * 0.7);
            crestCol = lerpRGB(crestCol, stormInfo.tint, stMix);
            baseCol = lerpRGB(baseCol, stormInfo.tint, stMix);
        }

        // Iluminación dinámica sobre rocas, árboles, arcos y formaciones del terreno
        const propLight = (typeof LightingEngine !== 'undefined') ? LightingEngine.samplePoint(cx, cy, maxH * 1.1) : null;
        const propIllum = propLight ? propLight.illum : 0;

        // Noche profunda: se oscurece con suavidad analógica preservando la paleta nocturna (salvo donde impacte un foco)
        if (nightWeight > 0.01) {
            const effNight = nightWeight * (1.0 - clamp(propIllum * 1.15, 0, 0.94));
            crestCol = lerpRGB(crestCol, nightPropCol, 0.94 * effNight);
            baseCol = lerpRGB(baseCol, [1, 2, 5], 0.96 * effNight);
        }

        if (propIllum > 0.01 && propLight) {
            const pRGB = [propLight.r, propLight.g, propLight.b];
            crestCol = lerpRGB(crestCol, pRGB, clamp(propIllum * (0.48 + 0.34 * nightWeight), 0, 0.85));
            baseCol = lerpRGB(baseCol, pRGB, clamp(propIllum * (0.28 + 0.24 * nightWeight), 0, 0.65));
        }

        const gx0 = p.x + Math.cos(prop.angle) * (centerR - 6);
        const gy0 = p.y + Math.sin(prop.angle) * (centerR - 6);
        const gx1 = p.x + Math.cos(prop.angle) * (centerR + maxH);
        const gy1 = p.y + Math.sin(prop.angle) * (centerR + maxH);

        // Guirnaldas de banderas de oración en cumbres y lomas (Firma visual de Alto's Adventure)
        if (prop.hasFlags || (prop.index !== undefined && prop.index % 5 === 0 && !arch.isLiquid)) {
            drawPrayerFlags(p, prop, timeSec, colors, arch);
        }

        if (type === 'desert_arch' || type === 'ice_arch' || type === 'coastal_arch') {
            // Arco natural de roca o hielo cuyas dos patas nacen directamente de la curva exacta del terreno
            const isIce = (type === 'ice_arch');
            const steps = 16;
            ctx.beginPath();
            // Contorno superior del arco natural
            for (let s = 0; s <= steps; s++) {
                const u = (s / steps) * 2 - 1; // [-1, 1]
                const theta = prop.angle + u * halfSpan * 1.15;
                const rGround = getSurfaceRadius(p, theta);
                const env = Math.pow(Math.max(0, 1 - u * u), 0.75);
                const rOuter = (rGround - 5) + env * (maxH * 1.15 + 5);
                const vx = p.x + Math.cos(theta) * rOuter;
                const vy = p.y + Math.sin(theta) * rOuter;
                if (s === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            // Contorno inferior con abertura central suave sobre el terreno
            for (let s = steps; s >= 0; s--) {
                const u = (s / steps) * 2 - 1;
                const theta = prop.angle + u * halfSpan * 1.15;
                const rGround = getSurfaceRadius(p, theta);
                let rInner = rGround - 6;
                if (Math.abs(u) < 0.56) {
                    const holeU = u / 0.56;
                    rInner = rGround + Math.pow(1 - holeU * holeU, 0.85) * (maxH * 0.62);
                }
                const vx = p.x + Math.cos(theta) * rInner;
                const vy = p.y + Math.sin(theta) * rInner;
                ctx.lineTo(vx, vy);
            }
            ctx.closePath();

            const archGrad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            if (isIce) {
                archGrad.addColorStop(0, rgbStr(baseCol, 0.90));
                archGrad.addColorStop(0.45, rgbStr(accentCol, 0.68));
                archGrad.addColorStop(1, rgbStr(lerpRGB(rimCol, [255, 255, 255], 0.4), 0.88));
            } else {
                archGrad.addColorStop(0, rgbStr(baseCol, 0.96));
                archGrad.addColorStop(0.55, rgbStr(topsoilCol, 0.94));
                archGrad.addColorStop(1, rgbStr(crestCol, 0.92));
            }
            ctx.fillStyle = archGrad;
            ctx.fill();

            ctx.strokeStyle = rgbStr(rimCol, isIce ? 0.65 : 0.38);
            ctx.lineWidth = 1.1;
            ctx.stroke();

        } else if (type === 'mesa_butte') {
            // Meseta sedimentaria de cima plana y laderas suaves esculpidas directamente sobre el horizonte
            const steps = 16;
            ctx.beginPath();
            for (let s = 0; s <= steps; s++) {
                const u = (s / steps) * 2 - 1;
                const theta = prop.angle + u * halfSpan;
                const rGround = getSurfaceRadius(p, theta);
                const shiftedU = clamp(u - asym * 0.4, -1, 1);
                // Perfil sigmoidal de meseta plana arriba y suave en la base
                const plateau = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(shiftedU), 2.8)), 0.65);
                const rTop = (rGround - 5) + plateau * (maxH + 5);
                const vx = p.x + Math.cos(theta) * rTop;
                const vy = p.y + Math.sin(theta) * rTop;
                if (s === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            for (let s = steps; s >= 0; s--) {
                const u = (s / steps) * 2 - 1;
                const theta = prop.angle + u * halfSpan;
                const rBase = getSurfaceRadius(p, theta) - 6;
                ctx.lineTo(p.x + Math.cos(theta) * rBase, p.y + Math.sin(theta) * rBase);
            }
            ctx.closePath();

            const mGrad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            mGrad.addColorStop(0, rgbStr(baseCol, 0.98));
            mGrad.addColorStop(0.6, rgbStr(topsoilCol, 0.94));
            mGrad.addColorStop(1, rgbStr(crestCol, 0.90));
            ctx.fillStyle = mGrad;
            ctx.fill();

            // Estrato sedimentario fino siguiendo la curva de la meseta
            ctx.beginPath();
            for (let s = 2; s <= steps - 2; s++) {
                const u = (s / steps) * 2 - 1;
                const theta = prop.angle + u * halfSpan;
                const rGround = getSurfaceRadius(p, theta);
                const plateau = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.8)), 0.65);
                const rBand = rGround + plateau * maxH * 0.58;
                const vx = p.x + Math.cos(theta) * rBand;
                const vy = p.y + Math.sin(theta) * rBand;
                if (s === 2) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            ctx.strokeStyle = rgbStr(rimCol, 0.28);
            ctx.lineWidth = 1.0;
            ctx.stroke();

        } else if (type === 'basalt_columns') {
            // Terrazas escalonadas naturales de roca basáltica que emergen siguiendo la pendiente
            const colCount = 5;
            for (let c = 0; c < colCount; c++) {
                const u0 = -1 + (c / colCount) * 2;
                const u1 = -1 + ((c + 1) / colCount) * 2;
                const uMid = (u0 + u1) * 0.5;
                const tierFactor = 1.0 - Math.abs(uMid - asym * 0.3) * 0.72;
                const colH = maxH * clamp(tierFactor, 0.25, 1.0);

                const th0 = prop.angle + u0 * halfSpan * 0.85;
                const th1 = prop.angle + u1 * halfSpan * 0.85;
                const rG0 = getSurfaceRadius(p, th0);
                const rG1 = getSurfaceRadius(p, th1);
                const rTop = ((rG0 + rG1) * 0.5) + colH;

                ctx.beginPath();
                ctx.moveTo(p.x + Math.cos(th0) * (rG0 - 6), p.y + Math.sin(th0) * (rG0 - 6));
                ctx.lineTo(p.x + Math.cos(th0) * rTop, p.y + Math.sin(th0) * rTop);
                ctx.lineTo(p.x + Math.cos(th1) * rTop, p.y + Math.sin(th1) * rTop);
                ctx.lineTo(p.x + Math.cos(th1) * (rG1 - 6), p.y + Math.sin(th1) * (rG1 - 6));
                ctx.closePath();

                const bGrad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
                bGrad.addColorStop(0, rgbStr(baseCol, 0.98));
                bGrad.addColorStop(0.7, rgbStr(lerpRGB(crustCol, topsoilCol, (c % 2) * 0.45), 0.95));
                bGrad.addColorStop(1, rgbStr(crestCol, 0.88));
                ctx.fillStyle = bGrad;
                ctx.fill();

                ctx.strokeStyle = rgbStr(rimCol, 0.25);
                ctx.lineWidth = 0.85;
                ctx.stroke();
            }

        } else if (type === 'glacial_ridge') {
            // Crestas translúcidas de hielo glaciar integradas suavemente con la corteza helada
            const steps = 16;
            ctx.beginPath();
            for (let s = 0; s <= steps; s++) {
                const u = (s / steps) * 2 - 1;
                const theta = prop.angle + u * halfSpan;
                const rGround = getSurfaceRadius(p, theta);
                const env = Math.sin(((u + 1) * 0.5) * Math.PI);
                const wave = 0.65 + 0.35 * Math.sin(u * Math.PI * 2.5 + prop.seed * 6);
                const rTop = (rGround - 5) + Math.pow(env, 1.2) * wave * (maxH + 5);
                const vx = p.x + Math.cos(theta) * rTop;
                const vy = p.y + Math.sin(theta) * rTop;
                if (s === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            for (let s = steps; s >= 0; s--) {
                const u = (s / steps) * 2 - 1;
                const theta = prop.angle + u * halfSpan;
                const rBase = getSurfaceRadius(p, theta) - 6;
                ctx.lineTo(p.x + Math.cos(theta) * rBase, p.y + Math.sin(theta) * rBase);
            }
            ctx.closePath();

            const iceGrad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            iceGrad.addColorStop(0, rgbStr(crustCol, 0.85));
            iceGrad.addColorStop(0.45, rgbStr(accentCol, 0.58));
            iceGrad.addColorStop(0.85, rgbStr(rimCol, 0.78));
            iceGrad.addColorStop(1, 'rgba(255, 255, 255, 0.90)');
            ctx.fillStyle = iceGrad;
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.lineWidth = 1.0;
            ctx.stroke();

        } else if (type === 'crystal_outcrop') {
            // Afloramiento mineral de cuarzo translúcido enraizado en el lecho rocoso
            const prisms = [
                { uOff: -0.42, wFrac: 0.28, hFrac: 0.68, tilt: -0.002 },
                { uOff: 0.00,  wFrac: 0.34, hFrac: 1.05, tilt: 0.0005 },
                { uOff: 0.40,  wFrac: 0.26, hFrac: 0.76, tilt: 0.002 }
            ];
            for (const pr of prisms) {
                const thL = prop.angle + (pr.uOff - pr.wFrac) * halfSpan;
                const thM = prop.angle + pr.uOff * halfSpan + pr.tilt;
                const thR = prop.angle + (pr.uOff + pr.wFrac) * halfSpan;

                const rGL = getSurfaceRadius(p, thL) - 5;
                const rGM = getSurfaceRadius(p, thM);
                const rGR = getSurfaceRadius(p, thR) - 5;
                const rTip = rGM + maxH * pr.hFrac;

                ctx.beginPath();
                ctx.moveTo(p.x + Math.cos(thL) * rGL, p.y + Math.sin(thL) * rGL);
                ctx.lineTo(p.x + Math.cos(thL * 0.7 + thM * 0.3) * (rGM + maxH * pr.hFrac * 0.72), p.y + Math.sin(thL * 0.7 + thM * 0.3) * (rGM + maxH * pr.hFrac * 0.72));
                ctx.lineTo(p.x + Math.cos(thM) * rTip, p.y + Math.sin(thM) * rTip);
                ctx.lineTo(p.x + Math.cos(thR * 0.7 + thM * 0.3) * (rGM + maxH * pr.hFrac * 0.72), p.y + Math.sin(thR * 0.7 + thM * 0.3) * (rGM + maxH * pr.hFrac * 0.72));
                ctx.lineTo(p.x + Math.cos(thR) * rGR, p.y + Math.sin(thR) * rGR);
                ctx.closePath();

                const cGrad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
                cGrad.addColorStop(0, rgbStr(crustCol, 0.92));
                cGrad.addColorStop(0.45, rgbStr(accentCol, 0.65));
                cGrad.addColorStop(0.88, rgbStr(rimCol, 0.85));
                cGrad.addColorStop(1, 'rgba(255, 255, 255, 0.92)');
                ctx.fillStyle = cGrad;
                ctx.fill();

                ctx.strokeStyle = rgbStr(rimCol, 0.55);
                ctx.lineWidth = 0.85;
                ctx.stroke();
            }

        } else if (type === 'organic_grove' || type === 'biolume_canopy') {
            // Manto vegetal / dosel orgánico ondulado que abraza suavemente la colina o el valle
            const isBiolume = (type === 'biolume_canopy' || arch.id === 'biolume_forest');
            const steps = 18;
            ctx.beginPath();
            for (let s = 0; s <= steps; s++) {
                const u = (s / steps) * 2 - 1;
                const theta = prop.angle + u * halfSpan * 1.15;
                const rGround = getSurfaceRadius(p, theta);
                const env = Math.sin(((u + 1) * 0.5) * Math.PI);
                // Tres domos de follaje orgánico suaves y continuos
                const canopyWave = 0.72 + 0.28 * Math.cos(u * Math.PI * 3 + prop.seed * 5);
                const rTop = (rGround - 4) + Math.pow(env, 0.85) * canopyWave * (maxH * 0.88 + 4);
                const vx = p.x + Math.cos(theta) * rTop;
                const vy = p.y + Math.sin(theta) * rTop;
                if (s === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            for (let s = steps; s >= 0; s--) {
                const u = (s / steps) * 2 - 1;
                const theta = prop.angle + u * halfSpan * 1.15;
                const rBase = getSurfaceRadius(p, theta) - 5;
                ctx.lineTo(p.x + Math.cos(theta) * rBase, p.y + Math.sin(theta) * rBase);
            }
            ctx.closePath();

            const groveGrad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            groveGrad.addColorStop(0, rgbStr(crustCol, 0.95));
            groveGrad.addColorStop(0.5, rgbStr(lerpRGB(topsoilCol, accentCol, 0.45), 0.90));
            groveGrad.addColorStop(1, rgbStr(isBiolume ? accentCol : crestCol, 0.85));
            ctx.fillStyle = groveGrad;
            ctx.fill();

            ctx.strokeStyle = rgbStr(rimCol, isBiolume ? 0.55 : 0.32);
            ctx.lineWidth = 1.1;
            ctx.stroke();

            // 2 esporas / luciérnagas sutiles flotando suavemente sobre el manto bioluminiscente
            if (isBiolume) {
                for (let m = -1; m <= 1; m += 2) {
                    const mAng = prop.angle + m * halfSpan * 0.35;
                    const mR = getSurfaceRadius(p, mAng) + maxH * 0.95 + Math.sin(timeSec * 1.4 + prop.seed * 10 + m) * 3.5;
                    const mx = p.x + Math.cos(mAng) * mR;
                    const my = p.y + Math.sin(mAng) * mR;
                    const mGlow = ctx.createRadialGradient(mx, my, 0.5, mx, my, 5.5);
                    mGlow.addColorStop(0, '#ffffff');
                    mGlow.addColorStop(0.4, rgbStr(rimCol, 0.55));
                    mGlow.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = mGlow;
                    ctx.beginPath();
                    ctx.arc(mx, my, 5.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

        } else if (type === 'volcanic_fumarole') {
            // Domo volcánico suave integrado en la pendiente con fisura térmica y bruma difusa
            const steps = 14;
            ctx.beginPath();
            for (let s = 0; s <= steps; s++) {
                const u = (s / steps) * 2 - 1;
                const theta = prop.angle + u * halfSpan;
                const rGround = getSurfaceRadius(p, theta);
                const env = Math.sin(((u + 1) * 0.5) * Math.PI);
                // Ligera depresión de caldera en el centro (u ~ 0)
                const calderaDip = 1.0 - 0.28 * Math.exp(-(u * u) / 0.08);
                const rTop = (rGround - 5) + Math.pow(env, 1.1) * calderaDip * (maxH * 0.85 + 5);
                const vx = p.x + Math.cos(theta) * rTop;
                const vy = p.y + Math.sin(theta) * rTop;
                if (s === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            for (let s = steps; s >= 0; s--) {
                const u = (s / steps) * 2 - 1;
                const theta = prop.angle + u * halfSpan;
                const rBase = getSurfaceRadius(p, theta) - 6;
                ctx.lineTo(p.x + Math.cos(theta) * rBase, p.y + Math.sin(theta) * rBase);
            }
            ctx.closePath();

            const vGrad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            vGrad.addColorStop(0, rgbStr(coreCol, 0.98));
            vGrad.addColorStop(0.65, rgbStr(crustCol, 0.95));
            vGrad.addColorStop(1, rgbStr(topsoilCol, 0.90));
            ctx.fillStyle = vGrad;
            ctx.fill();

            // Resplandor térmico suave en la boca de la caldera
            const ventR = centerR + maxH * 0.62;
            const vx = p.x + Math.cos(prop.angle) * ventR;
            const vy = p.y + Math.sin(prop.angle) * ventR;
            const glowGrad = ctx.createRadialGradient(vx, vy, 1, vx, vy, 12);
            glowGrad.addColorStop(0, rgbStr(rimCol, 0.72));
            glowGrad.addColorStop(0.45, rgbStr(accentCol, 0.32));
            glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(vx, vy, 12, 0, Math.PI * 2);
            ctx.fill();

        } else if (type === 'giant_mushroom') {
            // Hongo gigante micelial con tallo sinuoso y sombrero bioluminiscente
            const tipX = p.x + Math.cos(prop.angle) * (centerR + maxH * 1.15);
            const tipY = p.y + Math.sin(prop.angle) * (centerR + maxH * 1.15);
            const stemCtrlX = p.x + Math.cos(prop.angle + prop.asymmetry * 0.04) * (centerR + maxH * 0.55);
            const stemCtrlY = p.y + Math.sin(prop.angle + prop.asymmetry * 0.04) * (centerR + maxH * 0.55);
            ctx.strokeStyle = rgbStr(baseCol, 0.96);
            ctx.lineWidth = Math.max(4, halfSpan * p.radius * 0.14);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(gx0, gy0);
            ctx.quadraticCurveTo(stemCtrlX, stemCtrlY, tipX, tipY);
            ctx.stroke();

            ctx.save();
            ctx.translate(tipX, tipY);
            ctx.rotate(prop.angle + Math.PI / 2);
            const capW = Math.max(16, halfSpan * p.radius * 0.85);
            const capH = Math.max(10, maxH * 0.42);
            const capGrad = ctx.createLinearGradient(0, -capH, 0, capH * 0.3);
            capGrad.addColorStop(0.0, rgbStr(rimCol, 0.96));
            capGrad.addColorStop(0.55, rgbStr(accentCol, 0.92));
            capGrad.addColorStop(1.0, rgbStr(baseCol, 0.95));
            ctx.fillStyle = capGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, capW, capH, 0, Math.PI, Math.PI * 2);
            ctx.quadraticCurveTo(0, capH * 0.28, -capW, 0);
            ctx.closePath();
            ctx.fill();
            // Láminas inferiores y manchas bioluminiscentes en el sombrero
            ctx.strokeStyle = rgbStr(baseCol, 0.45);
            ctx.lineWidth = 1.0;
            for (let gIdx = -2; gIdx <= 2; gIdx++) {
                ctx.beginPath();
                ctx.moveTo(0, capH * 0.1);
                ctx.lineTo(gIdx * capW * 0.34, 0);
                ctx.stroke();
            }
            ctx.fillStyle = rgbStr(rimCol, 0.85);
            for (let dIdx = -1; dIdx <= 1; dIdx++) {
                ctx.beginPath();
                ctx.arc(dIdx * capW * 0.42, -capH * (0.45 - Math.abs(dIdx) * 0.12), 2.4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.strokeStyle = rgbStr(rimCol, 0.72);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(0, 0, capW, capH, 0, Math.PI, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

        } else if (type === 'coral_tower') {
            // Agujas coralinas ramificadas orgánicas
            const branches = 3 + Math.floor(prop.seed * 2);
            ctx.lineCap = 'round';
            for (let b = 0; b < branches; b++) {
                const u = branches === 1 ? 0 : (b / (branches - 1)) * 2 - 1;
                const angB = prop.angle + u * halfSpan * 0.55;
                const bH = maxH * (1.0 - Math.abs(u) * 0.25);
                const r0 = getSurfaceRadius(p, angB) - 4;
                const bx0 = p.x + Math.cos(angB) * r0;
                const by0 = p.y + Math.sin(angB) * r0;
                const bx1 = p.x + Math.cos(angB + u * 0.015) * (r0 + bH);
                const by1 = p.y + Math.sin(angB + u * 0.015) * (r0 + bH);
                ctx.strokeStyle = rgbStr(lerpRGB(baseCol, accentCol, 0.55 + u * 0.2), 0.95);
                ctx.lineWidth = Math.max(3, 5.5 - Math.abs(u) * 2);
                ctx.beginPath();
                ctx.moveTo(bx0, by0);
                ctx.lineTo(bx1, by1);
                ctx.stroke();
                ctx.fillStyle = rgbStr(rimCol, 0.92);
                ctx.beginPath();
                ctx.arc(bx1, by1, 3.8, 0, Math.PI * 2);
                ctx.fill();
            }

        } else if (type === 'monolith_pylon' || type === 'stargate_arch' || type === 'floating_obelisk') {
            // Monolitos ancestrales, pórticos rúnicos o agujas levitantes con halo energético
            ctx.save();
            const isFloating = (type === 'floating_obelisk');
            const isGate = (type === 'stargate_arch');
            const hover = isFloating ? (14 + Math.sin(timeSec * 2.1 + prop.seed * 10) * 6) : 0;
            const anchorR = centerR + hover;
            ctx.translate(p.x + Math.cos(prop.angle) * anchorR, p.y + Math.sin(prop.angle) * anchorR);
            ctx.rotate(prop.angle + Math.PI / 2);

            if (isGate) {
                const spanW = Math.max(14, halfSpan * p.radius * 0.6);
                ctx.fillStyle = rgbStr(baseCol, 0.96);
                ctx.strokeStyle = rgbStr(accentCol, 0.78);
                ctx.lineWidth = 1.5;
                ctx.fillRect(-spanW - 5, -maxH, 7, maxH + 4);
                ctx.fillRect(spanW - 2, -maxH, 7, maxH + 4);
                ctx.fillRect(-spanW - 7, -maxH - 6, spanW * 2 + 14, 7);
                ctx.strokeRect(-spanW - 5, -maxH, 7, maxH + 4);
                ctx.strokeRect(spanW - 2, -maxH, 7, maxH + 4);
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = rgbStr(accentCol, 0.55 + 0.25 * Math.sin(timeSec * 2.6 + prop.seed * 8));
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.ellipse(0, -maxH * 0.5, spanW * 0.58, maxH * 0.36, 0, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                const w = isFloating ? 9 : 11;
                ctx.fillStyle = rgbStr(baseCol, 0.98);
                ctx.strokeStyle = rgbStr(accentCol, 0.85);
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(-w * 0.55, isFloating ? 0 : 5);
                ctx.lineTo(-w * 0.35, -maxH * 0.82);
                ctx.lineTo(0, -maxH * 1.15);
                ctx.lineTo(w * 0.35, -maxH * 0.82);
                ctx.lineTo(w * 0.55, isFloating ? 0 : 5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = rgbStr(rimCol, 0.85);
                ctx.fillRect(-1.2, -maxH * 0.85, 2.4, maxH * 0.6);
            }
            ctx.restore();

        } else if (type === 'bismuth_terrace') {
            // Terrazas minerales escalonadas iridiscentes
            const tiers = 4;
            ctx.save();
            ctx.translate(p.x + Math.cos(prop.angle) * centerR, p.y + Math.sin(prop.angle) * centerR);
            ctx.rotate(prop.angle + Math.PI / 2);
            const totalW = Math.max(18, halfSpan * p.radius * 1.15);
            for (let t = 0; t < tiers; t++) {
                const frac = t / tiers;
                const tw = totalW * (1 - frac * 0.58);
                const th = (maxH / tiers) * 1.05;
                const ty = -t * th * 0.85 - th;
                ctx.fillStyle = rgbStr(lerpRGB(baseCol, accentCol, frac), 0.95);
                ctx.strokeStyle = rgbStr(rimCol, 0.72);
                ctx.lineWidth = 1.1;
                ctx.fillRect(-tw * 0.5, ty, tw, th + 3);
                ctx.strokeRect(-tw * 0.5, ty, tw, th + 3);
            }
            ctx.restore();

        } else {
            // 'layered_boulder' / 'coral_atoll' — Afloramiento rocoso o arrecife suavemente redondeado y fundido con el suelo
            const steps = 14;
            ctx.beginPath();
            for (let s = 0; s <= steps; s++) {
                const u = (s / steps) * 2 - 1;
                const theta = prop.angle + u * halfSpan;
                const rGround = getSurfaceRadius(p, theta);
                const env = Math.sin(((u + 1) * 0.5) * Math.PI);
                const subBump = 0.82 + 0.18 * Math.sin(u * Math.PI * 2 + prop.seed * 8);
                const rTop = (rGround - 5) + Math.pow(env, 0.9) * subBump * (maxH * 0.72 + 5);
                const vx = p.x + Math.cos(theta) * rTop;
                const vy = p.y + Math.sin(theta) * rTop;
                if (s === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            for (let s = steps; s >= 0; s--) {
                const u = (s / steps) * 2 - 1;
                const theta = prop.angle + u * halfSpan;
                const rBase = getSurfaceRadius(p, theta) - 6;
                ctx.lineTo(p.x + Math.cos(theta) * rBase, p.y + Math.sin(theta) * rBase);
            }
            ctx.closePath();

            const rGrad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            rGrad.addColorStop(0, rgbStr(baseCol, 0.98));
            rGrad.addColorStop(0.6, rgbStr(topsoilCol, 0.94));
            rGrad.addColorStop(1, rgbStr(crestCol, 0.88));
            ctx.fillStyle = rGrad;
            ctx.fill();

            ctx.strokeStyle = rgbStr(rimCol, 0.30);
            ctx.lineWidth = 0.95;
            ctx.stroke();
        }

        // Emisión bioluminiscente / geotermal nocturna sobre formaciones naturales y cristales
        if (nightWeight > 0.04) {
            const emissiveCol = colors.nightEmissiveGlow || arch.nightEmissiveGlow || accentCol;
            if (type.includes('biolume') || type.includes('spore') || type.includes('crystal') || type.includes('bismuth') || type.includes('geode') || type.includes('monolith')) {
                const pulse = 0.55 + 0.45 * Math.sin(timeSec * 2.5 + prop.angle * 8);
                const tipX = p.x + Math.cos(prop.angle) * (centerR + maxH * 0.9);
                const tipY = p.y + Math.sin(prop.angle) * (centerR + maxH * 0.9);
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const spGlow = ctx.createRadialGradient(tipX, tipY, 1, tipX, tipY, maxH * 0.75 + 10);
                const emAlpha = nightWeight * pulse;
                spGlow.addColorStop(0.00, rgbStr(emissiveCol, 0.75 * emAlpha));
                spGlow.addColorStop(0.40, rgbStr(emissiveCol, 0.28 * emAlpha));
                spGlow.addColorStop(1.00, 'rgba(0,0,0,0)');
                ctx.fillStyle = spGlow;
                ctx.beginPath();
                ctx.arc(tipX, tipY, maxH * 0.75 + 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    ctx.restore();
}

function drawEtherNode(p, node, timeSec) {
    const hoverOffset = 16 + Math.sin(timeSec * 2.5 + node.phase) * 4.0;
    const sr = (typeof getCavernOrSurfaceRadius === 'function')
        ? getCavernOrSurfaceRadius(p, node.angle, node.inCavern, node.onCeiling)
        : getSurfaceRadius(p, node.angle);
    const totalR = node.onCeiling ? (sr - hoverOffset) : (sr + hoverOffset);
    const nx = p.x + Math.cos(node.angle) * totalR;
    const ny = p.y + Math.sin(node.angle) * totalR;

    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(node.angle + Math.PI / 2);

    // 1. Halo Lumínico Celestial Armónico (Reliquia Sagrada de Alto's Odyssey)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.85 + 0.15 * Math.sin(timeSec * 3.5 + node.phase);
    const glowR = 28 * pulse;
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, glowR);
    glow.addColorStop(0, 'rgba(255, 248, 230, 0.85)');
    glow.addColorStop(0.35, 'rgba(244, 162, 97, 0.45)');
    glow.addColorStop(0.7, 'rgba(231, 111, 81, 0.15)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Anillo Orbital Sagrado
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.7)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 5.5, timeSec * 1.4 + node.phase, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Prisma Crystalline de Éter (Geometría Facetada de Oro y Cristal)
    ctx.fillStyle = '#fffdf5';
    ctx.strokeStyle = '#f4a261';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(6.5, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-6.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Faceta interna sombreada cálida
    ctx.fillStyle = 'rgba(244, 162, 97, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(6.5, 0);
    ctx.lineTo(0, 11);
    ctx.closePath();
    ctx.fill();

    // 4. Arco de Progreso de Asimilación Zen
    if (node.value < node.maxValue) {
        const pct = clamp(1 - node.value / node.maxValue, 0, 1);
        ctx.strokeStyle = '#f4a261';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, 17, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function drawHarvestTether(timeSec) {
    if (!ship.activeHarvestNode || !ship.activeHarvestPlanet) return;
    const p = ship.activeHarvestPlanet;
    const node = ship.activeHarvestNode;
    const sr = getSurfaceRadius(p, node.angle);
    const nx = p.x + Math.cos(node.angle) * (sr + 15);
    const ny = p.y + Math.sin(node.angle) * (sr + 15);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const grad = ctx.createLinearGradient(nx, ny, ship.x, ship.y);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0.95)');
    grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.75)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    const midX = (nx + ship.x) * 0.5 + Math.sin(timeSec * 16) * 10;
    const midY = (ny + ship.y) * 0.5 + Math.cos(timeSec * 16) * 10;
    ctx.quadraticCurveTo(midX, midY, ship.x, ship.y);
    ctx.stroke();

    const dist = Math.hypot(ship.x - nx, ship.y - ny) || 1;
    const steps = 18;
    ctx.lineWidth = 1.4;
    for (let h = 0; h < 2; h++) {
        const phaseShift = h * Math.PI;
        ctx.strokeStyle = h === 0 ? 'rgba(254, 240, 138, 0.8)' : 'rgba(125, 211, 252, 0.8)';
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const bx = lerp(nx, ship.x, t);
            const by = lerp(ny, ship.y, t);
            const wave = Math.sin(t * Math.PI * 5 + timeSec * 18 + phaseShift) * 14 * Math.sin(t * Math.PI);
            const perpX = -(ship.y - ny) / dist;
            const perpY = (ship.x - nx) / dist;
            const px = bx + perpX * wave;
            const py = by + perpY * wave;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
    ctx.restore();
}

/**
 * Iluminación rasante de la tobera sobre la superficie del terreno (elíptica tangente al suelo, no un círculo flotante)
 */
function drawDynamicGroundGlow(planets) {
    if (ship.thrustIntensity <= 0.02) return;

    for (const p of planets) {
        const dx = ship.x - p.x;
        const dy = ship.y - p.y;
        const dist = Math.hypot(dx, dy);
        const angleFromCenter = Math.atan2(dy, dx);
        const sr = getSurfaceRadius(p, angleFromCenter);
        const alt = dist - sr;

        if (alt < 260) {
            const nx = Math.cos(angleFromCenter);
            const ny = Math.sin(angleFromCenter);
            const exX = Math.cos(ship.angle);
            const exY = Math.sin(ship.angle);
            const towardGround = -(exX * nx + exY * ny);

            if (towardGround > 0.05) {
                const fogD = clamp(ship.localFogDensity || 0, 0, 1);
                const prox = clamp(1 - alt / 260, 0, 1);
                const intensity = prox * prox * clamp(towardGround, 0, 1) * clamp(ship.thrustIntensity, 0, 1.25);
                const spreadTang = 75 * (0.6 + 0.4 * prox) * (1.0 + fogD * 0.68);
                const gx = p.x + nx * sr;
                const gy = p.y + ny * sr;

                const flameInfo = (typeof getRocketFlameInfo === 'function') ? getRocketFlameInfo(ship) : null;
                const fRGB = flameInfo ? flameInfo.rgb : [245, 158, 11];
                const hRGB = flameInfo ? flameInfo.highlightRGB : [254, 243, 199];

                ctx.save();
                ctx.translate(gx, gy);
                ctx.rotate(angleFromCenter + Math.PI / 2);
                ctx.scale(1.0, 0.28 + fogD * 0.16); // Más difuso y volumétrico dentro de neblina
                ctx.globalCompositeOperation = 'lighter';

                const lightGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, spreadTang);
                if (ship.warping) {
                    lightGrad.addColorStop(0, `rgba(186, 230, 253, ${(0.65 + fogD * 0.14) * intensity})`);
                    lightGrad.addColorStop(0.45, `rgba(56, 189, 248, ${(0.24 + fogD * 0.16) * intensity})`);
                } else {
                    lightGrad.addColorStop(0, `rgba(${hRGB[0]}, ${hRGB[1]}, ${hRGB[2]}, ${(0.72 + fogD * 0.12) * intensity})`);
                    lightGrad.addColorStop(0.42, `rgba(${fRGB[0]}, ${fRGB[1]}, ${fRGB[2]}, ${(0.32 + fogD * 0.18) * intensity})`);
                }
                lightGrad.addColorStop(1, 'rgba(0,0,0,0)');

                ctx.fillStyle = lightGrad;
                ctx.beginPath();
                ctx.arc(0, 0, spreadTang, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }
}

function drawHeadlights(timeSec) {
    // Faros frontales de la sonda desactivados en el diseño limpio
    return;
    if (!ship.headlightsOn) return;

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.globalCompositeOperation = 'lighter';

    const lightLen = 280;
    const lightSpread = 42;
    const headlightGrad = ctx.createRadialGradient(18, 0, 2, 18 + lightLen * 0.7, 0, lightLen);
    headlightGrad.addColorStop(0, 'rgba(240, 249, 255, 0.42)');
    headlightGrad.addColorStop(0.28, 'rgba(186, 230, 253, 0.18)');
    headlightGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.05)');
    headlightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = headlightGrad;
    ctx.beginPath();
    ctx.moveTo(18, -4);
    ctx.lineTo(18 + lightLen, -lightSpread);
    ctx.lineTo(18 + lightLen, lightSpread);
    ctx.lineTo(18, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// --- SISTEMAS DE PARTÍCULAS VOLUMÉTRICAS, HUMO PERSISTENTE Y CHISPAS ---

const _smokeSpriteCache = new Map();
const _fireGlowSpriteCache = new Map();
const _smokeTemplates = [];
const _hotSmokeGlows = [];

/**
 * Pre-genera 4 plantillas procedurales de nubes tipo coliflor (billowing smoke)
 * con bordes turbulentos y volumen orgánico para renderizado de alto rendimiento.
 */
function getSmokeTemplates() {
    if (_smokeTemplates.length > 0) return _smokeTemplates;
    const size = 112;
    const half = 56;

    // Semilla determinista por variante para generar 4 nubes coliflor con volumen interno 3D
    for (let v = 0; v < 4; v++) {
        let seed = 1337 + v * 7919;
        const rand = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const tctx = c.getContext('2d');

        // Núcleo denso central con ligero sombreado interno para dar volumen
        const coreGrad = tctx.createRadialGradient(half, half - 4, 4, half, half, 36);
        coreGrad.addColorStop(0, 'rgba(255,255,255,0.98)');
        coreGrad.addColorStop(0.55, 'rgba(232,236,242,0.78)');
        coreGrad.addColorStop(1, 'rgba(195,202,212,0)');
        tctx.fillStyle = coreGrad;
        tctx.beginPath();
        tctx.arc(half, half, 36, 0, Math.PI * 2);
        tctx.fill();

        // 13 sub-lóbulos periféricos con relieve y auto-sombreado interno
        const lobeCount = 13;
        for (let i = 0; i < lobeCount; i++) {
            const ang = (i / lobeCount) * Math.PI * 2 + (rand() - 0.5) * 0.42;
            const dist = 10 + rand() * 20;
            const lx = half + Math.cos(ang) * dist;
            const ly = half + Math.sin(ang) * dist;
            const lRad = 14 + rand() * 15;
            const maxAlpha = 0.58 + rand() * 0.36;
            const lum = Math.round(225 + rand() * 30);
            const midLum = Math.round(lum * 0.84);

            const g = tctx.createRadialGradient(lx, ly - lRad * 0.15, lRad * 0.1, lx, ly, lRad);
            g.addColorStop(0, `rgba(${lum},${lum},${lum},${maxAlpha.toFixed(2)})`);
            g.addColorStop(0.55, `rgba(${midLum},${midLum},${midLum + 4},${(maxAlpha * 0.62).toFixed(2)})`);
            g.addColorStop(1, `rgba(${midLum},${midLum},${midLum + 6},0)`);
            tctx.fillStyle = g;
            tctx.beginPath();
            tctx.arc(lx, ly, lRad, 0, Math.PI * 2);
            tctx.fill();
        }

        _smokeTemplates.push(c);
    }
    return _smokeTemplates;
}

/**
 * Devuelve un sprite offscreen pre-renderizado de nube volumétrica tipo coliflor
 * cuantizado por color, nivel de luz y variante para evitar gradientes por frame.
 */
function getSmokePuffSprite(r, g, b, lightPower, variant = 0) {
    const qr = Math.min(255, (Math.round(r / 16) * 16) | 0);
    const qg = Math.min(255, (Math.round(g / 16) * 16) | 0);
    const qb = Math.min(255, (Math.round(b / 16) * 16) | 0);
    const qLight = Math.max(0, Math.min(5, Math.round(lightPower * 3.5)));
    const v = variant & 3;
    const key = ((qr & 255) << 21) | ((qg & 255) << 13) | ((qb & 255) << 5) | ((qLight & 7) << 2) | v;

    let sprite = _smokeSpriteCache.get(key);
    if (sprite) return sprite;

    if (_smokeSpriteCache.size >= 360) {
        _smokeSpriteCache.delete(_smokeSpriteCache.keys().next().value);
    }

    const templates = getSmokeTemplates();
    const mask = templates[v];
    const size = 112;
    const lp = qLight / 3.5;

    const hiR = Math.min(255, Math.round(qr * (0.86 + 0.30 * lp) + 18 * lp));
    const hiG = Math.min(255, Math.round(qg * (0.86 + 0.30 * lp) + 18 * lp));
    const hiB = Math.min(255, Math.round(qb * (0.86 + 0.30 * lp) + 22 * lp));

    const shR = Math.max(4, Math.round(qr * 0.56));
    const shG = Math.max(6, Math.round(qg * 0.58));
    const shB = Math.max(10, Math.round(qb * 0.62));

    sprite = document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    const sctx = sprite.getContext('2d');

    // Paso 1: Gradiente de volumen suave centro-exterior (sin rotación brusca al moverse)
    const half = size * 0.5;
    const volGrad = sctx.createRadialGradient(half, half * 0.85, size * 0.06, half, half, size * 0.48);
    volGrad.addColorStop(0, `rgb(${hiR}, ${hiG}, ${hiB})`);
    volGrad.addColorStop(0.55, `rgb(${qr}, ${qg}, ${qb})`);
    volGrad.addColorStop(1, `rgb(${shR}, ${shG}, ${shB})`);

    sctx.fillStyle = volGrad;
    sctx.fillRect(0, 0, size, size);

    // Paso 2: Multiplicar por el volumen interno de los lóbulos
    sctx.globalCompositeOperation = 'multiply';
    sctx.drawImage(mask, 0, 0);

    // Paso 3: Recortar exactamente al canal alfa de la silueta coliflor
    sctx.globalCompositeOperation = 'destination-in';
    sctx.drawImage(mask, 0, 0);

    sctx.globalCompositeOperation = 'source-over';
    _smokeSpriteCache.set(key, sprite);
    return sprite;
}

function getFireGlowSprite(fireRGB) {
    const key = ((fireRGB[0] & 255) << 16) | ((fireRGB[1] & 255) << 8) | (fireRGB[2] & 255);
    let sprite = _fireGlowSpriteCache.get(key);
    if (sprite) return sprite;

    if (_fireGlowSpriteCache.size >= 16) {
        _fireGlowSpriteCache.delete(_fireGlowSpriteCache.keys().next().value);
    }

    const size = 96;
    const half = 48;
    sprite = document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    const sctx = sprite.getContext('2d');

    const grad = sctx.createRadialGradient(half, half, 1, half, half, half - 2);
    grad.addColorStop(0, `rgba(${fireRGB[0]}, ${fireRGB[1]}, ${fireRGB[2]}, 1)`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    sctx.fillStyle = grad;
    sctx.beginPath();
    sctx.arc(half, half, half - 2, 0, Math.PI * 2);
    sctx.fill();

    _fireGlowSpriteCache.set(key, sprite);
    return sprite;
}

/**
 * Renderiza el humo volumétrico tipo coliflor de lanzamiento y las nubes estratosféricas persistentes
 * con iluminación direccional solar, enfriamiento cromático, incandescencia por lotes y sprites cacheados.
 */
function drawSmokePuffs() {
    if (smokePuffs.length === 0) return;

    const nozzleX = ship.x - Math.cos(ship.angle) * 16;
    const nozzleY = ship.y - Math.sin(ship.angle) * 16;
    const isEngineFiring = ship.thrustIntensity > 0.05;
    const isWarp = ship.warping && (ship.fuel > 0 || ship.infiniteFuel);
    const zoom = Math.max(0.2, camera.zoom);
    const halfW = (screenW * 0.5) / zoom + 220;
    const halfH = (screenH * 0.5) / zoom + 220;
    const minX = camera.x - halfW;
    const maxX = camera.x + halfW;
    const minY = camera.y - halfH;
    const maxY = camera.y + halfH;

    const flameInfo = (typeof getRocketFlameInfo === 'function')
        ? getRocketFlameInfo(ship)
        : { flameColor: 'standard', rgb: isWarp ? [125, 211, 252] : [251, 175, 60], highlightRGB: [254, 240, 138] };
    const fireRGB = flameInfo.rgb;
    const glowSprite = getFireGlowSprite(fireRGB);

    const pSm = ship.nearestPlanet;
    const pSmHasLight = pSm && pSm.lightAngle !== undefined;
    const planetNightSky = (pSm && pSm.colors && pSm.colors.deepNightRGB)
        || (pSm && pSm.colors && pSm.colors.nightSkyRGB)
        || [8, 12, 20];
    const nightSmokeCol = lerpRGB([10, 14, 22], planetNightSky, 0.55);
    const sunsetCol = (pSm && pSm.colors && pSm.colors.sunsetRGB) || [251, 146, 60];
    const pSmAtmoLimit = pSm ? pSm.atmoRadius + 400 : 0;
    const pSmAtmoLimitSq = pSmAtmoLimit * pSmAtmoLimit;

    _hotSmokeGlows.length = 0;

    ctx.save();
    const baseT = ctx.getTransform();
    for (let i = 0; i < smokePuffs.length; i++) {
        const sm = smokePuffs[i];
        const rad = sm.currentSize || sm.size;
        if (sm.x + rad < minX || sm.x - rad > maxX || sm.y + rad < minY || sm.y - rad > maxY) continue;

        const screenRad = rad * zoom;
        if (screenRad < 1.2) continue;

        const lifeRatio = clamp(sm.life / sm.maxLife, 0, 1);
        const ageRatio = 1 - lifeRatio;

        // Curva de densidad suave: entrada rápida sin sobresalto y desvanecimiento orgánico prolongado
        const fadeCurve = ageRatio < 0.06
            ? (ageRatio / 0.06)
            : Math.pow(lifeRatio, 0.72);

        const alpha = clamp(sm.alpha * fadeCurve, 0, 0.86);
        if (alpha <= 0.008) continue;

        // Iluminación interna suave cuando está cerca de la llama del cohete o recién eyectada
        let fireIllum = sm.heatGlow || 0;
        if (isEngineFiring) {
            const dxN = sm.x - nozzleX;
            const dyN = sm.y - nozzleY;
            const dNozSq = dxN * dxN + dyN * dyN;
            if (dNozSq < 38025) { // 195^2
                const dNozzle = Math.sqrt(dNozSq);
                const tProx = 1 - dNozzle / 195;
                const proxIllum = tProx * tProx * clamp(ship.thrustIntensity, 0, 1.25);
                fireIllum = Math.max(fireIllum, proxIllum * 0.95);
            }
        }

        let smNight = 0;
        let smDay = 1;
        let smTwi = 0;
        if (pSm) {
            const dxP = sm.x - pSm.x;
            const dyP = sm.y - pSm.y;
            if (dxP * dxP + dyP * dyP < pSmAtmoLimitSq) {
                const smAng = Math.atan2(dyP, dxP);
                const curLight = pSmHasLight ? pSm.lightAngle : -Math.PI * 0.35;
                const smSunDot = Math.cos(smAng - curLight);
                smDay = smoothstep(-0.20, 0.32, smSunDot);
                smNight = smoothstep(0.20, -0.32, smSunDot);
                const smTwiGate = smoothstep(-0.16, 0.08, smSunDot);
                smTwi = Math.exp(-Math.pow(smSunDot / 0.24, 2)) * smTwiGate;
            }
        }

        const baseCol = sm.color;
        let r = baseCol[0], g = baseCol[1], b = baseCol[2];

        // 0. Enfriamiento cromático natural (de vapor denso brillante a humo/hollín más frío al disiparse)
        if (sm.soot > 0 && ageRatio > 0.14) {
            const coolMix = smoothstep(0.14, 0.86, ageRatio) * sm.soot;
            r = Math.round(lerp(r, 98, coolMix));
            g = Math.round(lerp(g, 105, coolMix));
            b = Math.round(lerp(b, 118, coolMix));
        }

        const dynLight = (typeof LightingEngine !== 'undefined') ? LightingEngine.samplePoint(sm.x, sm.y, rad) : null;
        const dynIllum = dynLight ? dynLight.illum : 0;
        const totalReveal = clamp(fireIllum * 1.25 + dynIllum * 1.05, 0, 1.0);

        // 1. Modulación por noche/crepúsculo planetario para el humo ambiental
        if (smNight > 0.02) {
            const nightBlend = smNight * (1.0 - totalReveal);
            r = Math.round(lerp(r, nightSmokeCol[0], nightBlend * 0.90));
            g = Math.round(lerp(g, nightSmokeCol[1], nightBlend * 0.90));
            b = Math.round(lerp(b, nightSmokeCol[2], nightBlend * 0.90));
        }
        if (smTwi > 0.02 && fireIllum < 0.25 && dynIllum < 0.35) {
            const twiBlend = smTwi * (1.0 - clamp(fireIllum * 2.0 + dynIllum * 1.4, 0, 1.0)) * 0.55;
            r = Math.round(lerp(r, sunsetCol[0], twiBlend));
            g = Math.round(lerp(g, sunsetCol[1], twiBlend));
            b = Math.round(lerp(b, sunsetCol[2], twiBlend));
        }

        // 2. Mezcla de incandescencia interna de fuego y reflectores dinámicos
        if (fireIllum > 0.02) {
            const fMix = clamp(fireIllum * (0.92 + 0.32 * smNight), 0, 0.92);
            r = Math.round(lerp(r, fireRGB[0], fMix));
            g = Math.round(lerp(g, fireRGB[1], fMix));
            b = Math.round(lerp(b, fireRGB[2], fMix));
        }
        if (dynIllum > 0.02 && dynLight) {
            const dMix = clamp(dynIllum * (0.68 + 0.32 * smNight), 0, 0.88);
            r = Math.round(lerp(r, dynLight.r, dMix));
            g = Math.round(lerp(g, dynLight.g, dMix));
            b = Math.round(lerp(b, dynLight.b, dMix));
        }

        // 3. Efecto Nacarado / Iridiscente para nubes estratosféricas
        if (sm.cloudType === 'stratosphere') {
            const iridPower = lerp(1.0, 0.22, smNight * (1 - clamp(fireIllum, 0, 1)));
            const iridPhase = (sm.x * 0.008 + sm.y * 0.008 + sm.rot);
            r = clamp(r + Math.sin(iridPhase) * (18 * iridPower), 10, 255);
            b = clamp(b + Math.cos(iridPhase * 1.3) * (22 * iridPower), 15, 255);
        }

        const lightPower = clamp(smDay * 1.0 + fireIllum * 1.35 + dynIllum * 1.15, 0.14, 1.35);
        const variant = sm.variant !== undefined ? sm.variant : (i & 3);
        const puffSprite = getSmokePuffSprite(r, g, b, lightPower, variant);

        // Rotación continua propia de cada nube mediante matriz directa (sin deriva de punto flotante)
        const drawRot = sm.rot || 0;
        const cosR = Math.cos(drawRot);
        const sinR = Math.sin(drawRot);
        ctx.setTransform(
            baseT.a * cosR + baseT.c * sinR,
            baseT.b * cosR + baseT.d * sinR,
            baseT.c * cosR - baseT.a * sinR,
            baseT.d * cosR - baseT.b * sinR,
            baseT.a * sm.x + baseT.c * sm.y + baseT.e,
            baseT.b * sm.x + baseT.d * sm.y + baseT.f
        );
        ctx.globalAlpha = alpha;
        ctx.drawImage(puffSprite, -rad, -rad, rad * 2, rad * 2);

        // Encolar brillo aditivo caliente con transición suave para evitar parpadeos
        if (fireIllum > 0.08) {
            const glowStrength = smoothstep(0.08, 0.45, fireIllum);
            const glowAlpha = clamp(glowStrength * (0.62 + 0.35 * smNight) * alpha, 0, 0.9);
            if (glowAlpha > 0.012) {
                _hotSmokeGlows.push({
                    x: sm.x,
                    y: sm.y,
                    r: rad * (0.65 + 0.30 * smNight),
                    a: glowAlpha
                });
            }
        }
    }

    // Pasada 2: Brillo incandescente aditivo por lotes
    if (_hotSmokeGlows.length > 0) {
        ctx.setTransform(baseT);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < _hotSmokeGlows.length; i++) {
            const gItem = _hotSmokeGlows[i];
            ctx.globalAlpha = gItem.a;
            ctx.drawImage(glowSprite, gItem.x - gItem.r, gItem.y - gItem.r, gItem.r * 2, gItem.r * 2);
        }
    }
    ctx.restore();
}

function drawSparks() {
    if (sparks.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const sp of sparks) {
        const t = clamp(sp.life / sp.maxLife, 0, 1);
        const col = sp.color;
        const velLen = Math.hypot(sp.vx, sp.vy);
        const tailLen = Math.min(velLen * 0.032, 18);
        const ang = Math.atan2(sp.vy, sp.vx);

        ctx.strokeStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${t * 0.95})`;
        ctx.lineWidth = 1.5 * t + 0.45;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(sp.x - Math.cos(ang) * tailLen, sp.y - Math.sin(ang) * tailLen);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${t * 0.92})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 1.15, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawReentryWakeParticles() {
    if (reentryParticles.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const rp of reentryParticles) {
        const t = clamp(rp.life / rp.maxLife, 0, 1);
        const spd = Math.hypot(rp.vx, rp.vy);
        const ang = Math.atan2(rp.vy, rp.vx);
        const stretch = Math.min(22, spd * 0.045 + rp.size * 1.6);

        let r, g, b;
        if (t > 0.65) {
            r = 255;
            g = Math.round(lerp(185, 245, (t - 0.65) / 0.35));
            b = Math.round(lerp(80, 210, (t - 0.65) / 0.35));
        } else if (t > 0.3) {
            r = 255;
            g = Math.round(lerp(75, 180, (t - 0.3) / 0.35));
            b = Math.round(lerp(40, 75, (t - 0.3) / 0.35));
        } else {
            // Borde exterior de plasma ionizado rojizo-magenta
            r = Math.round(lerp(190, 245, t / 0.3));
            g = Math.round(lerp(30, 75, t / 0.3));
            b = Math.round(lerp(140, 50, t / 0.3));
        }

        const tailX = rp.x - Math.cos(ang) * stretch;
        const tailY = rp.y - Math.sin(ang) * stretch;
        const grad = ctx.createLinearGradient(rp.x, rp.y, tailX, tailY);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${t * 0.85})`);
        grad.addColorStop(0.55, `rgba(${r}, ${Math.round(g * 0.65)}, ${Math.min(255, b + 35)}, ${t * 0.38})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // Halo suave de plasma alrededor de la partícula
        ctx.strokeStyle = grad;
        ctx.lineWidth = rp.size * (1.85 - t * 0.35);
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.moveTo(rp.x, rp.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Núcleo luminoso de la estela
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = rp.size * (1.05 - t * 0.25);
        ctx.beginPath();
        ctx.moveTo(rp.x, rp.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
    }
    ctx.restore();
}

function drawBiomeParticles(timeSec) {
    if (biomeParticles.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const bp of biomeParticles) {
        // Envolvente de desvanecimiento suave (fade in al nacer, fade out al morir)
        const age = (bp.maxLife || 9.0) - bp.life;
        const fadeIn = clamp(age / 0.9, 0, 1);
        const fadeOut = clamp(bp.life / 1.4, 0, 1);
        const lifeAlpha = fadeIn * fadeOut;
        if (lifeAlpha <= 0.005) continue;

        const pulse = 0.80 + 0.20 * Math.sin(bp.phase);

        if (bp.type === 'biolume_amber_spore' || bp.type === 'amber_drift') {
            // Esporas orgánicas cálidas: núcleo cálido translúcido con halo etéreo difuminado
            const rad = bp.size * (0.92 + 0.22 * Math.sin(bp.phase));
            const sporeGrad = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, rad * 2.5);
            sporeGrad.addColorStop(0.00, bp.color);
            sporeGrad.addColorStop(0.35, bp.color);
            sporeGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

            ctx.globalAlpha = lifeAlpha * pulse * 0.90;
            ctx.fillStyle = sporeGrad;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, rad * 2.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (bp.type === 'volcanic_cinder') {
            // Pavesas volcánicas incandescentes: núcleo térmico con halo de calor
            const rad = bp.size * (0.85 + 0.20 * Math.sin(bp.phase * 1.5));
            const cinGrad = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, rad * 2.2);
            cinGrad.addColorStop(0.00, bp.color);
            cinGrad.addColorStop(0.40, bp.color);
            cinGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

            ctx.globalAlpha = lifeAlpha * 0.95;
            ctx.fillStyle = cinGrad;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, rad * 2.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (bp.type === 'ice_mote') {
            // Polvo de diamante / Micro-escarcha: pequeña mota cristalina con tenue destello especular
            const rad = bp.size;
            const shimmer = Math.pow(Math.max(0, Math.sin(bp.phase * 2.2)), 4.0);
            ctx.globalAlpha = lifeAlpha * (0.50 + 0.50 * shimmer);
            ctx.fillStyle = bp.color;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, rad, 0, Math.PI * 2);
            ctx.fill();
        } else if (bp.type === 'crystal_resonance') {
            // Geodas y resonancia piezoeléctrica: motas prismáticas ingrávidas con respiración armónica
            const rad = bp.size * pulse;
            const resGrad = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, rad * 2.2);
            resGrad.addColorStop(0.00, bp.color);
            resGrad.addColorStop(0.45, bp.color);
            resGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

            ctx.globalAlpha = lifeAlpha * pulse * 0.85;
            ctx.fillStyle = resGrad;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, rad * 2.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (bp.type === 'sea_phosphor') {
            // Micro-fitoplancton marino fosforescente sobre el agua
            const rad = bp.size * (0.90 + 0.20 * Math.sin(bp.phase * 1.3));
            const seaGrad = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, rad * 2.0);
            seaGrad.addColorStop(0.00, bp.color);
            seaGrad.addColorStop(0.40, bp.color);
            seaGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

            ctx.globalAlpha = lifeAlpha * pulse * 0.80;
            ctx.fillStyle = seaGrad;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, rad * 2.0, 0, Math.PI * 2);
            ctx.fill();
        } else if (bp.type === 'toxic_vapor') {
            // Vapor ácido ionizado difuso
            const rad = bp.size * 2.2;
            const toxGrad = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, rad);
            toxGrad.addColorStop(0.00, bp.color);
            toxGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

            ctx.globalAlpha = lifeAlpha * 0.65;
            ctx.fillStyle = toxGrad;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, rad, 0, Math.PI * 2);
            ctx.fill();
        } else if (bp.type === 'ether_dust') {
            // Polvo de éter sagrado en ruinas y anomalías
            const rad = bp.size * (1.0 + 0.25 * Math.sin(bp.phase));
            const ethGrad = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, rad * 2.4);
            ethGrad.addColorStop(0.00, bp.color);
            ethGrad.addColorStop(0.35, bp.color);
            ethGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

            ctx.globalAlpha = lifeAlpha * pulse * 0.90;
            ctx.fillStyle = ethGrad;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, rad * 2.4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.globalAlpha = lifeAlpha * 0.5;
            ctx.fillStyle = bp.color;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, bp.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawDebris() {
    if (debris.length === 0) return;
    ctx.save();
    for (const d of debris) {
        const a = clamp(d.life / d.maxLife, 0, 1);
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rot);
        ctx.fillStyle = `rgba(${d.color[0]}, ${d.color[1]}, ${d.color[2]}, ${a})`;
        ctx.fillRect(-d.size * 0.5, -d.size * 0.5, d.size, d.size);
        ctx.restore();
    }
    ctx.restore();
}

function drawShatteredPartFX() {
    if (typeof shatteredPartFX === 'undefined' || shatteredPartFX.length === 0) return;
    ctx.save();
    for (const fx of shatteredPartFX) {
        const a = clamp(fx.life / fx.maxLife, 0, 1);
        if (fx.kind === 'flash') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, fx.radius);
            if (fx.isTank) {
                grad.addColorStop(0, `rgba(255, 255, 235, ${a * 0.95})`);
                grad.addColorStop(0.35, `rgba(251, 146, 60, ${a * 0.78})`);
                grad.addColorStop(0.72, `rgba(220, 38, 38, ${a * 0.4})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else {
                grad.addColorStop(0, `rgba(255, 255, 255, ${a * 0.85})`);
                grad.addColorStop(0.45, fx.isSolar ? `rgba(56, 189, 248, ${a * 0.5})` : `rgba(251, 191, 36, ${a * 0.55})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            }
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(fx.x, fx.y, fx.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (fx.kind === 'shard') {
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.rotate(fx.rot);
            ctx.globalAlpha = a;
            ctx.fillStyle = fx.color || '#cbd5e1';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(-fx.w * 0.5, -fx.h * 0.45);
            ctx.lineTo(fx.w * 0.5, -fx.h * 0.25);
            ctx.lineTo(fx.w * 0.35, fx.h * 0.5);
            ctx.lineTo(-fx.w * 0.45, fx.h * 0.35);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            if (fx.isSolar) {
                ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(-fx.w * 0.3, 0);
                ctx.lineTo(fx.w * 0.3, 0);
                ctx.stroke();
            }
            ctx.restore();
        }
    }
    ctx.restore();
}

function drawLiquidRipples() {
    if (liquidRipples.length === 0) return;
    ctx.save();
    for (const lr of liquidRipples) {
        ctx.save();
        ctx.translate(lr.x, lr.y);
        ctx.rotate(lr.angle + Math.PI / 2);
        ctx.scale(1, 0.35);
        ctx.strokeStyle = `rgba(${lr.color[0]}, ${lr.color[1]}, ${lr.color[2]}, ${lr.life * 0.75})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, lr.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

function drawShockwaves() {
    if (shockwaves.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const sw of shockwaves) {
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = Math.max(1, (1 - sw.radius / sw.maxRadius) * 4.0);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function drawWingTrails() {
    if (wingTrails.length === 0) return;
    const pNear = ship.nearestPlanet;
    const nightFactor = (pNear && ship.currentSolarState) ? clamp(ship.currentSolarState.nightFactor, 0, 1) : 0;
    const isFiring = ship.thrustIntensity > 0.08;
    const trailCol = isFiring
        ? (ship.warping ? [186, 230, 253] : [254, 215, 170])
        : lerpRGB([224, 242, 254], [48, 64, 88], nightFactor * 0.85);
    const trailAlphaMult = isFiring ? 0.45 : lerp(0.38, 0.10, nightFactor);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const wt of wingTrails) {
        const a = clamp(wt.life / wt.maxLife, 0, 1);
        ctx.fillStyle = `rgba(${trailCol[0]}, ${trailCol[1]}, ${trailCol[2]}, ${a * trailAlphaMult})`;
        ctx.beginPath();
        ctx.arc(wt.x, wt.y, wt.width * (1.4 - a * 0.4), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawParticles() {
    // Chorros de gas frío RCS adaptados a iluminación ambiental
    const pNearPart = ship.nearestPlanet;
    const rcsNight = (pNearPart && ship.currentSolarState) ? clamp(ship.currentSolarState.nightFactor, 0, 1) : 0;
    const rcsAlphaMult = lerp(0.72, 0.28, rcsNight);
    for (const rp of rcsParticles) {
        const a = clamp(rp.life / rp.maxLife, 0, 1);
        const rRad = rp.size * (1.5 - a * 0.6);
        const rGrad = ctx.createRadialGradient(rp.x, rp.y, 0, rp.x, rp.y, rRad);
        rGrad.addColorStop(0, `rgba(241, 245, 249, ${a * rcsAlphaMult})`);
        rGrad.addColorStop(1, 'rgba(226, 232, 240, 0)');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rRad, 0, Math.PI * 2);
        ctx.fill();
    }

    if (particles.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const pt of particles) {
        const t = clamp(pt.life / pt.maxLife, 0, 1);
        if (pt.type === 'dust') {
            let c = pt.customRGB || [203, 213, 225];
            const pNear = ship.nearestPlanet;
            const dustNight = (pNear && ship.currentSolarState) ? clamp(ship.currentSolarState.nightFactor, 0, 1) : 0;
            if (dustNight > 0.02) {
                c = lerpRGB(c, [30, 42, 60], dustNight * 0.78);
            }
            ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${t * lerp(0.45, 0.18, dustNight)})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size * (1.35 - t * 0.4), 0, Math.PI * 2);
            ctx.fill();
        } else if (pt.type === 'vacuum_plume') {
            // Nebulosa de expansión de gas en el vacío / alta atmósfera
            const vRad = pt.size * (2.6 - t * 1.4);
            const vGrad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, vRad);
            if (pt.isWarp) {
                vGrad.addColorStop(0, `rgba(125, 211, 252, ${t * 0.24})`);
                vGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
            } else {
                vGrad.addColorStop(0, `rgba(186, 230, 253, ${t * 0.18})`);
                vGrad.addColorStop(0.5, `rgba(251, 191, 36, ${t * 0.08})`);
                vGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            }
            ctx.fillStyle = vGrad;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, vRad, 0, Math.PI * 2);
            ctx.fill();
        } else if (pt.type === 'surface_plasma') {
            // Partículas incandescentes rasantes deflectadas por el suelo
            const spd = Math.hypot(pt.vx, pt.vy);
            const ang = Math.atan2(pt.vy, pt.vx);
            const streak = Math.min(22, spd * 0.035 + pt.size);
            const radius = pt.size * t + 1.0;
            ctx.strokeStyle = pt.isWarp
                ? `rgba(186, 230, 253, ${t * 0.95})`
                : `rgba(254, 240, 138, ${t * 0.95})`;
            ctx.lineWidth = radius * 1.4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt.x - Math.cos(ang) * streak, pt.y - Math.sin(ang) * streak);
            ctx.stroke();
        } else {
            // Partículas de plasma de alta velocidad con motion-blur direccional
            let r, g, b;
            if (pt.customRGB) {
                [r, g, b] = pt.customRGB;
            } else if (pt.isWarp) {
                r = Math.round(lerp(56, 240, t));
                g = Math.round(lerp(145, 249, t));
                b = 255;
            } else if (t > 0.65) {
                r = 255;
                g = Math.round(lerp(215, 255, (t - 0.65) / 0.35));
                b = Math.round(lerp(110, 245, (t - 0.65) / 0.35));
            } else {
                r = Math.round(lerp(220, 255, t / 0.65));
                g = Math.round(lerp(55, 205, t / 0.65));
                b = Math.round(lerp(12, 85, t / 0.65));
            }

            const spd = Math.hypot(pt.vx, pt.vy);
            const ang = Math.atan2(pt.vy, pt.vx);
            const streak = Math.min(16, spd * 0.025 + pt.size);
            const radius = pt.size * t + 0.8;

            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${t * 0.88})`;
            ctx.lineWidth = radius * 1.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt.x - Math.cos(ang) * streak, pt.y - Math.sin(ang) * streak);
            ctx.stroke();
        }
    }
    ctx.restore();
}

/**
 * Renderiza la deflexión hiperbólica de la llama del motor contra el suelo (Wall-Jet Supersónico).
 * Las llamas chocan contra el relieve, fanning out hacia los laterales sin penetrar bajo tierra,
 * con shock de estancamiento, láminas de plasma lamiendo el suelo y resplandor térmico de superficie.
 */
function drawGroundFlameDeflection(def, timeSec) {
    if (!def || !def.active || def.intensity <= 0.01) return;
    const p = def.planet;
    if (!p) return;

    const isWarp = ship.warping && (ship.fuel > 0 || ship.infiniteFuel);
    const thr = clamp(ship.thrustIntensity, 0.2, 1.4);
    const intens = clamp(def.intensity, 0.05, 1.3);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Stagnation Point Shock Bloom (Punto de impacto y choque frontal)
    const stagR = (16 + 15 * intens) * (isWarp ? 1.25 : 1.0);
    const stagGrad = ctx.createRadialGradient(def.hitX, def.hitY, 1, def.hitX, def.hitY, stagR);
    if (isWarp) {
        stagGrad.addColorStop(0, `rgba(255, 255, 255, ${0.98 * intens})`);
        stagGrad.addColorStop(0.25, `rgba(186, 230, 253, ${0.85 * intens})`);
        stagGrad.addColorStop(0.6, `rgba(56, 189, 248, ${0.45 * intens})`);
        stagGrad.addColorStop(0.85, `rgba(37, 99, 235, ${0.15 * intens})`);
    } else {
        stagGrad.addColorStop(0, `rgba(255, 255, 255, ${0.98 * intens})`);
        stagGrad.addColorStop(0.2, `rgba(254, 240, 138, ${0.92 * intens})`);
        stagGrad.addColorStop(0.55, `rgba(245, 158, 11, ${0.52 * intens})`);
        stagGrad.addColorStop(0.82, `rgba(234, 88, 12, ${0.18 * intens})`);
    }
    stagGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = stagGrad;
    ctx.beginPath();
    ctx.arc(def.hitX, def.hitY, stagR, 0, Math.PI * 2);
    ctx.fill();

    // 2. Manto de Llamas Rasantes Deflectadas a lo largo de la Superficie (Wall-Jet Supersónico)
    const sides = [
        { dir: 1, ratio: def.ratioLeft },
        { dir: -1, ratio: def.ratioRight }
    ];

    const baseWashLen = (def.freePlumeLen - def.sHit) * (1.75 + 0.45 * thr);
    const flickerBase = Math.sin(timeSec * 58) * 1.8 + Math.cos(timeSec * 37) * 1.2;

    for (const s of sides) {
        const sideLen = Math.max(8, baseWashLen * s.ratio * 2.0) + flickerBase * (s.dir > 0 ? 1 : -1);
        if (sideLen <= 3) continue;

        const steps = 10;
        const groundPts = [];
        const flamePts = [];
        const coreFlamePts = [];

        for (let i = 0; i <= steps; i++) {
            const u = i / steps;
            const distOnSurf = u * sideLen;
            const sr0 = getSurfaceRadius(p, def.angle);
            const dAng = (s.dir * distOnSurf) / sr0;
            const currAng = def.angle + dAng;
            const sr = getSurfaceRadius(p, currAng);

            const gx = p.x + Math.cos(currAng) * sr;
            const gy = p.y + Math.sin(currAng) * sr;
            groundPts.push({ x: gx, y: gy, u });

            // Altura y turbulencia de la lámina de fuego sobre el terreno
            const normX = Math.cos(currAng);
            const normY = Math.sin(currAng);
            const flameWiggle = Math.sin(timeSec * 48 + u * 12 + s.dir * 3) * 1.5;
            const flameH = (7.5 + 5.5 * intens) * Math.pow(1 - u, 0.65) * (1 + 0.35 * flameWiggle);
            const coreH = flameH * 0.46;

            flamePts.push({
                x: gx + normX * flameH,
                y: gy + normY * flameH
            });

            coreFlamePts.push({
                x: gx + normX * coreH,
                y: gy + normY * coreH
            });
        }

        // 2A. Manto exterior de fuego deflectado
        const tipX = groundPts[steps].x;
        const tipY = groundPts[steps].y;
        const sideGrad = ctx.createLinearGradient(def.hitX, def.hitY, tipX, tipY);
        if (isWarp) {
            sideGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * intens})`);
            sideGrad.addColorStop(0.22, `rgba(186, 230, 253, ${0.85 * intens})`);
            sideGrad.addColorStop(0.55, `rgba(56, 189, 248, ${0.52 * intens})`);
            sideGrad.addColorStop(0.85, `rgba(37, 99, 235, ${0.22 * intens})`);
        } else {
            sideGrad.addColorStop(0, `rgba(255, 255, 255, ${0.98 * intens})`);
            sideGrad.addColorStop(0.18, `rgba(254, 240, 138, ${0.92 * intens})`);
            sideGrad.addColorStop(0.48, `rgba(245, 158, 11, ${0.68 * intens})`);
            sideGrad.addColorStop(0.78, `rgba(234, 88, 12, ${0.35 * intens})`);
            sideGrad.addColorStop(0.95, `rgba(185, 28, 28, ${0.12 * intens})`);
        }
        sideGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = sideGrad;
        ctx.beginPath();
        ctx.moveTo(groundPts[0].x, groundPts[0].y);
        for (let i = 1; i <= steps; i++) {
            ctx.lineTo(groundPts[i].x, groundPts[i].y);
        }
        for (let i = steps; i >= 0; i--) {
            ctx.lineTo(flamePts[i].x, flamePts[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // 2B. Núcleo incandescente de plasma blanco-dorado rasante
        const coreGrad = ctx.createLinearGradient(def.hitX, def.hitY, tipX, tipY);
        coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.98 * intens})`);
        coreGrad.addColorStop(0.4, isWarp ? `rgba(224, 242, 254, ${0.85 * intens})` : `rgba(255, 251, 235, ${0.92 * intens})`);
        coreGrad.addColorStop(0.75, isWarp ? `rgba(125, 211, 252, ${0.45 * intens})` : `rgba(253, 224, 71, ${0.55 * intens})`);
        coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.moveTo(groundPts[0].x, groundPts[0].y);
        for (let i = 1; i <= steps; i++) {
            ctx.lineTo(groundPts[i].x, groundPts[i].y);
        }
        for (let i = steps; i >= 0; i--) {
            ctx.lineTo(coreFlamePts[i].x, coreFlamePts[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // 2C. Lenguas de fuego lamiendo el suelo hacia arriba
        const tongueCount = Math.floor(sideLen / 12);
        for (let t = 1; t <= tongueCount; t++) {
            const idx = Math.min(steps - 1, Math.floor((t / (tongueCount + 1)) * steps));
            const ptG = groundPts[idx];
            const ptF = flamePts[idx];
            const tFlutter = Math.sin(timeSec * 60 + t * 4.2) * 4.5;
            const tLen = (ptF.x - ptG.x) * 1.5;
            const tLenY = (ptF.y - ptG.y) * 1.5;

            ctx.strokeStyle = isWarp
                ? `rgba(186, 230, 253, ${(0.8 - idx / steps * 0.6) * intens})`
                : `rgba(254, 240, 138, ${(0.85 - idx / steps * 0.6) * intens})`;
            ctx.lineWidth = Math.max(1.2, (3.2 - idx * 0.25) * intens);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ptG.x, ptG.y);
            ctx.quadraticCurveTo(ptF.x + tFlutter * 0.5, ptF.y + tFlutter * 0.5, ptG.x + tLen, ptG.y + tLenY + tFlutter);
            ctx.stroke();
        }
    }

    // 3. Resplandor térmico de suelo sobrecalentado (Ground Scorch Glow)
    const scorchR = (35 + 25 * intens);
    const scorchGrad = ctx.createRadialGradient(def.hitX, def.hitY, 2, def.hitX, def.hitY, scorchR);
    if (isWarp) {
        scorchGrad.addColorStop(0, `rgba(56, 189, 248, ${0.45 * intens})`);
        scorchGrad.addColorStop(0.5, `rgba(37, 99, 235, ${0.18 * intens})`);
    } else {
        scorchGrad.addColorStop(0, `rgba(249, 115, 22, ${0.52 * intens})`);
        scorchGrad.addColorStop(0.45, `rgba(185, 28, 28, ${0.22 * intens})`);
    }
    scorchGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = scorchGrad;
    ctx.beginPath();
    ctx.arc(def.hitX, def.hitY, scorchR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// --- ASTILLERO AEROESPACIAL: RENDERIZADO DE FLOTA DE COHETES ---

let _presetRocketNightCanvas = null;
let _presetRocketNightCtx = null;

/**
 * Aplica sombreado nocturno y revelado direccional por luces dinámicas sobre un lienzo offscreen del cohete.
 */
function applyRocketNightAndLightShading(targetCtx, s, night, minX, minY, boxW, boxH, customSpan) {
    const rl = (typeof LightingEngine !== 'undefined') ? LightingEngine.sampleRocketLighting(s) : null;
    const cx = minX + boxW * 0.5;
    const cy = minY + boxH * 0.5;
    const span = customSpan || Math.max(18, Math.min(boxW, boxH) * 0.38);

    targetCtx.save();
    targetCtx.globalCompositeOperation = 'source-atop';

    if (night > 0.005) {
        if (rl && rl.strength > 0.02) {
            const grad = targetCtx.createLinearGradient(
                cx + rl.dirX * span, cy + rl.dirY * span,
                cx - rl.dirX * span, cy - rl.dirY * span
            );
            const litDarkA = (0.90 * night * (1 - clamp(rl.ambientLift * 1.45, 0, 1.0))).toFixed(3);
            const midDarkA = (0.88 * night * (1 - clamp(rl.ambientLift * 0.78, 0, 0.86))).toFixed(3);
            const shdDarkA = (0.94 * night * (1 - clamp(rl.ambientLift * 0.22, 0, 0.38))).toFixed(3);
            grad.addColorStop(0.00, `rgba(10, 16, 30, ${litDarkA})`);
            grad.addColorStop(0.50, `rgba(5, 8, 17, ${midDarkA})`);
            grad.addColorStop(1.00, `rgba(2, 4, 9, ${shdDarkA})`);
            targetCtx.fillStyle = grad;
            targetCtx.fillRect(minX, minY, boxW, boxH);
        } else {
            const nightGrad = targetCtx.createLinearGradient(cx, minY + boxH * 0.15, cx, minY + boxH * 0.85);
            nightGrad.addColorStop(0.0, `rgba(10, 16, 30, ${(0.85 * night).toFixed(3)})`);
            nightGrad.addColorStop(0.5, `rgba(5, 8, 17, ${(0.90 * night).toFixed(3)})`);
            nightGrad.addColorStop(1.0, `rgba(2, 4, 9, ${(0.94 * night).toFixed(3)})`);
            targetCtx.fillStyle = nightGrad;
            targetCtx.fillRect(minX, minY, boxW, boxH);
        }
    }

    if (rl && rl.strength > 0.03) {
        const specGrad = targetCtx.createLinearGradient(
            cx + rl.dirX * span, cy + rl.dirY * span,
            cx - rl.dirX * span * 0.45, cy - rl.dirY * span * 0.45
        );
        const peakA = clamp(rl.strength * (0.36 + 0.30 * night), 0, 0.68);
        specGrad.addColorStop(0.00, `rgba(${rl.r}, ${rl.g}, ${rl.b}, ${peakA.toFixed(3)})`);
        specGrad.addColorStop(0.52, `rgba(${rl.r}, ${rl.g}, ${rl.b}, ${(peakA * 0.34).toFixed(3)})`);
        specGrad.addColorStop(1.00, `rgba(${rl.r}, ${rl.g}, ${rl.b}, 0)`);
        targetCtx.fillStyle = specGrad;
        targetCtx.fillRect(minX, minY, boxW, boxH);
    }

    targetCtx.restore();
}

function drawPresetRocketWithNightShade(drawFn, s, timeSec, localNight, sScale, thr) {
    const night = clamp(localNight || 0, 0, 1);
    const rl = (typeof LightingEngine !== 'undefined') ? LightingEngine.sampleRocketLighting(s) : null;
    if ((night <= 0.005 && (!rl || rl.strength <= 0.06)) || typeof document === 'undefined') {
        drawFn(s, timeSec, night, sScale, thr);
        return;
    }

    const halfBox = 110 * Math.max(1, sScale || 1);
    const boxSize = halfBox * 2;
    const camZoom = (typeof camera !== 'undefined' && camera.zoom) ? camera.zoom : 1.0;
    const effDpr = (typeof dpr === 'number' && dpr > 0) ? dpr : 1.0;
    const offScale = Math.max(1.25, Math.min(_isMobileDevice ? 2.25 : 4.0, camZoom * effDpr * 1.25));
    const maxDim = _isMobileDevice ? 512 : 1024;
    const dim = Math.min(maxDim, Math.max(1, Math.ceil(boxSize * offScale)));
    const actualScale = dim / boxSize;

    if (!_presetRocketNightCanvas) {
        _presetRocketNightCanvas = document.createElement('canvas');
        _presetRocketNightCtx = _presetRocketNightCanvas.getContext('2d');
    }
    if (!_presetRocketNightCtx) {
        drawFn(s, timeSec, night, sScale, thr);
        return;
    }
    if (_presetRocketNightCanvas.width !== dim || _presetRocketNightCanvas.height !== dim) {
        _presetRocketNightCanvas.width = dim;
        _presetRocketNightCanvas.height = dim;
    } else {
        _presetRocketNightCtx.clearRect(0, 0, dim, dim);
    }

    const mainCtx = ctx;
    _presetRocketNightCtx.save();
    _presetRocketNightCtx.scale(actualScale, actualScale);
    _presetRocketNightCtx.translate(halfBox, halfBox);

    try {
        ctx = _presetRocketNightCtx;
        drawFn(s, timeSec, night, sScale, thr);
    } finally {
        ctx = mainCtx;
    }

    applyRocketNightAndLightShading(_presetRocketNightCtx, s, night, -halfBox, -halfBox, boxSize, boxSize, 32 * Math.max(1, sScale || 1));

    _presetRocketNightCtx.restore();
    ctx.drawImage(_presetRocketNightCanvas, -halfBox, -halfBox, boxSize, boxSize);
}

function drawRocket(timeSec, customShip) {
    const s = customShip || ship;
    if (!s) return;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);

    const thr = s.thrustIntensity || 0;
    const isWarp = s.warping && (s.fuel > 0 || s.infiniteFuel);
    const mKey = s.modelKey || 'vesper';
    const curModel = (typeof getRocketModel === 'function') ? getRocketModel(mKey) : null;
    const sScale = curModel ? (curModel.scale || 1.0) : 1.0;

    // Factor de noche local en la posición de la nave (o etapa/nave estacionada) para adaptación orgánica
    const isMainShip = (s === ship);
    const pNear = isMainShip ? ship.nearestPlanet : (s.nearestPlanet || s.planet || ship.nearestPlanet);
    let atmoW = 0;
    if (pNear) {
        if (typeof s.currentAtmoWeight === 'number') {
            atmoW = s.currentAtmoWeight;
        } else if (isMainShip) {
            atmoW = ship.currentAtmoWeight || 0;
        } else {
            const distP = Math.hypot(s.x - pNear.x, s.y - pNear.y);
            const atmoLim = (pNear.atmoRadius && pNear.atmoRadius > pNear.radius) ? pNear.atmoRadius : (pNear.radius * 1.45);
            atmoW = distP <= atmoLim ? 1.0 : 0.0;
        }
    }
    const solar = (pNear && atmoW > 0.02)
        ? (s.currentSolarState || (isMainShip ? ship.currentSolarState : null) || getPlanetSolarState(pNear, s.x, s.y, timeSec))
        : null;
    const rawNight = solar ? clamp(solar.nightFactor, 0, 1) : 0;
    const stormInfo = (pNear && atmoW > 0.02 && typeof getLocalStormDarkness === 'function')
        ? getLocalStormDarkness(pNear)
        : null;
    const stormDark = (stormInfo && pNear === ship.nearestPlanet) ? (stormInfo.worldDark || 0) : 0;
    const localNight = clamp(1 - (1 - rawNight) * (1 - stormDark * 0.88), 0, 1);

    // 1. PLUMA DE PROPULSIÓN PERSONALIZADA SEGÚN EL COHETE
    if (thr > 0.02) {
        drawRocketPlume(s, timeSec, localNight, mKey, sScale, isWarp, thr);
    }

    // 2. DISPATCH DE RENDERIZADO VISUAL SEGÚN EL MODELO
    if (mKey === 'custom' || s.customRocket) {
        if (typeof drawCustomRocketInFlight === 'function') {
            drawCustomRocketInFlight(ctx, s, timeSec, localNight, sScale, thr);
        } else {
            drawRocket_Vesper(s, timeSec, localNight, sScale, thr);
        }
    } else if (mKey === 'starship') {
        drawPresetRocketWithNightShade(drawRocket_Starship, s, timeSec, localNight, sScale, thr);
    } else if (mKey === 'celestia') {
        drawPresetRocketWithNightShade(drawRocket_Celestia, s, timeSec, localNight, sScale, thr);
    } else if (mKey === 'titan') {
        drawPresetRocketWithNightShade(drawRocket_Titan, s, timeSec, localNight, sScale, thr);
    } else if (mKey === 'aerodart') {
        drawPresetRocketWithNightShade(drawRocket_AeroDart, s, timeSec, localNight, sScale, thr);
    } else if (mKey === 'hyperion') {
        drawPresetRocketWithNightShade(drawRocket_Hyperion, s, timeSec, localNight, sScale, thr);
    } else if (mKey === 'drone') {
        drawPresetRocketWithNightShade(drawRocket_Drone, s, timeSec, localNight, sScale, thr);
    } else {
        drawPresetRocketWithNightShade((sObj, t, n, sc, th) => drawRocket_Vesper(sObj, t, 0, sc, th), s, timeSec, localNight, sScale, thr);
    }

    // Desgaste térmico direccional para cohetes predefinidos
    if (mKey !== 'custom' && !s.customRocket && s.scorch && (s.scorch.amount > 0.005 || s.scorch.temp > 0.015)) {
        drawPresetRocketScorch(s, mKey, sScale);
    }

    // 3. CONO DE VAPOR TRANSÓNICO Y PLASMA DE REENTRADA
    if (s === ship) {
        if (s.vaporConeIntensity > 0.02) {
            drawTransonicVaporCone(s.vaporConeIntensity, timeSec);
        }
        if (s.reentryIntensity > 0.025) {
            drawReentryPlasmaSheath(s.reentryIntensity, timeSec);
        }
    }

    ctx.restore();
}

/**
 * Renderizado de la Pluma de Fuego y Diamantes de Choque Mach adaptable
 */
function drawRocketPlume(s, timeSec, localNight, mKey, sScale, isWarp, thr) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const vacFactor = clamp(1 - (s.atmoPressure || ship.atmoPressure || 0), 0, 1);
    const flicker = Math.sin(timeSec * 45) * 1.5;

    // Colores y dimensiones calculados unificadamente según el modelo, toberas y reacciones químicas
    const flameInfo = (typeof getRocketFlameInfo === 'function')
        ? getRocketFlameInfo(s)
        : null;
    let nozzleOffsets = flameInfo ? flameInfo.nozzleOffsets : [{ x: -14.5 * sScale, y: 0, scale: 1.0 }];
    const defaultFlameColor = flameInfo ? flameInfo.flameColor : (isWarp ? 'warp' : 'standard');
    const fRGB = (flameInfo && flameInfo.rgb) ? flameInfo.rgb : [251, 175, 60];
    const hRGB = (flameInfo && flameInfo.highlightRGB) ? flameInfo.highlightRGB : [254, 240, 138];

    // Densidad local de neblina alrededor del cohete para dispersión volumétrica de la llamarada
    let fogFactor = 0;
    if (s === ship) {
        fogFactor = clamp(s.localFogDensity || 0, 0, 1);
    } else if (s.nearestPlanet && s.nearestPlanet.fog && s.nearestPlanet.fog.hasFog && typeof samplePlanetFog === 'function') {
        fogFactor = clamp(samplePlanetFog(s.nearestPlanet, s.x, s.y).density, 0, 1);
    }

    for (const noz of nozzleOffsets) {
        const flameColor = noz.flameColor || defaultFlameColor;
        ctx.save();
        ctx.translate(noz.x, noz.y);
        ctx.rotate((noz.angleOffset || 0) + (noz.gimbalEnabled === false ? 0 : (s.gimbalAngle || 0)));

        const baseLen = (isWarp ? 78 : lerp(42, 62, vacFactor)) * clamp(thr, 0.25, 1.35) * noz.scale * Math.max(0.7, sScale * 0.85) + flicker;
        const baseWid = (isWarp ? 11.5 : lerp(7.2, 16.5, vacFactor)) * clamp(thr, 0.3, 1.25) * noz.scale * Math.max(0.7, sScale * 0.85) * (1.0 + fogFactor * 0.18);

        // Halo Lumínico
        const bloomR = (isWarp ? 130 : 100) * clamp(thr, 0.3, 1.25) * noz.scale * (1.0 + 0.8 * localNight);
        const bloom = ctx.createRadialGradient(-baseLen * 0.3, 0, 2, -baseLen * 0.3, 0, bloomR);

        if (flameColor === 'warp') {
            bloom.addColorStop(0, `rgba(224, 242, 254, ${0.75 * thr})`);
            bloom.addColorStop(0.3, `rgba(56, 189, 248, ${0.40 * thr})`);
            bloom.addColorStop(0.7, `rgba(37, 99, 235, ${0.15 * thr})`);
        } else if (flameColor === 'methalox') {
            bloom.addColorStop(0, `rgba(240, 253, 250, ${0.85 * thr})`);
            bloom.addColorStop(0.25, `rgba(45, 212, 191, ${0.55 * thr})`);
            bloom.addColorStop(0.65, `rgba(14, 165, 233, ${0.25 * thr})`);
        } else if (flameColor === 'heavy_inferno') {
            bloom.addColorStop(0, `rgba(255, 241, 242, ${0.85 * thr})`);
            bloom.addColorStop(0.25, `rgba(249, 115, 22, ${0.65 * thr})`);
            bloom.addColorStop(0.65, `rgba(225, 29, 72, ${0.28 * thr})`);
        } else if (flameColor === 'cyan_plasma') {
            bloom.addColorStop(0, `rgba(236, 253, 245, ${0.82 * thr})`);
            bloom.addColorStop(0.3, `rgba(52, 211, 153, ${0.50 * thr})`);
            bloom.addColorStop(0.7, `rgba(6, 182, 212, ${0.20 * thr})`);
        } else if (flameColor === 'scramjet_violet') {
            bloom.addColorStop(0, `rgba(255, 255, 255, ${0.90 * thr})`);
            bloom.addColorStop(0.28, `rgba(192, 132, 252, ${0.60 * thr})`);
            bloom.addColorStop(0.68, `rgba(147, 51, 234, ${0.25 * thr})`);
        } else if (flameColor === 'ion_blue') {
            bloom.addColorStop(0, `rgba(240, 249, 255, ${0.75 * thr})`);
            bloom.addColorStop(0.35, `rgba(56, 189, 248, ${0.45 * thr})`);
            bloom.addColorStop(0.75, `rgba(3, 105, 161, ${0.15 * thr})`);
        } else {
            bloom.addColorStop(0, `rgba(255, 248, 230, ${0.75 * thr})`);
            bloom.addColorStop(0.25, `rgba(251, 191, 36, ${0.55 * thr})`);
            bloom.addColorStop(0.6, `rgba(244, 114, 182, ${0.22 * thr})`);
            bloom.addColorStop(0.85, `rgba(225, 29, 72, ${0.08 * thr})`);
        }
        bloom.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(-baseLen * 0.3, 0, bloomR, 0, Math.PI * 2);
        ctx.fill();

        // Dispersión Volumétrica de la Llamarada dentro de Neblina (Halo Tyndall + Jirones Envolventes)
        if (fogFactor > 0.015) {
            const fogBloomR = bloomR * (1.35 + 0.72 * fogFactor);
            const fogCx = -baseLen * (0.42 + fogFactor * 0.12);
            const fogBloom = ctx.createRadialGradient(fogCx, 0, 4, fogCx, 0, fogBloomR);
            const fAlpha = fogFactor * clamp(thr, 0.25, 1.2) * (0.42 + 0.24 * localNight);
            fogBloom.addColorStop(0.00, `rgba(${hRGB[0]}, ${hRGB[1]}, ${hRGB[2]}, ${fAlpha * 0.72})`);
            fogBloom.addColorStop(0.28, `rgba(${fRGB[0]}, ${fRGB[1]}, ${fRGB[2]}, ${fAlpha * 0.48})`);
            fogBloom.addColorStop(0.64, `rgba(${fRGB[0]}, ${fRGB[1]}, ${fRGB[2]}, ${fAlpha * 0.16})`);
            fogBloom.addColorStop(1.00, 'rgba(0,0,0,0)');
            ctx.fillStyle = fogBloom;
            ctx.beginPath();
            ctx.ellipse(fogCx, 0, fogBloomR * 1.18, fogBloomR * 0.92, 0, 0, Math.PI * 2);
            ctx.fill();

            // Jirones de neblina iluminados envolviendo la estela de la llamarada
            if (typeof getFogMistSprite === 'function') {
                const billowCol = lerpRGB([236, 244, 250], fRGB, 0.68);
                for (let b = 0; b < 3; b++) {
                    const bFrac = 0.25 + b * 0.36;
                    const bx = -baseLen * bFrac - Math.sin(timeSec * 16 + b * 2.1) * 3.5;
                    const by = Math.sin(timeSec * 12 + b * 3.4) * (4 + b * 3) * fogFactor;
                    const bw = baseLen * (0.95 + b * 0.38) * (0.85 + 0.35 * fogFactor);
                    const bh = baseWid * (2.6 + b * 0.95) * (0.85 + 0.45 * fogFactor);
                    const mistSp = getFogMistSprite(billowCol[0], billowCol[1], billowCol[2], (b + 1) & 3);
                    ctx.save();
                    ctx.globalAlpha = clamp(fogFactor * (0.34 - b * 0.06) * clamp(thr, 0.3, 1.15), 0, 0.42);
                    ctx.drawImage(mistSp, bx - bw * 0.5, by - bh * 0.5, bw, bh);
                    ctx.restore();
                }
            }
        }

        // Manto de fuego curvado suave
        const outerGrad = ctx.createLinearGradient(0, 0, -baseLen, 0);
        if (flameColor === 'warp' || flameColor === 'ion_blue') {
            outerGrad.addColorStop(0, '#ffffff');
            outerGrad.addColorStop(0.2, '#bae6fd');
            outerGrad.addColorStop(0.6, '#38bdf8');
            outerGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
        } else if (flameColor === 'methalox') {
            outerGrad.addColorStop(0, '#ffffff');
            outerGrad.addColorStop(0.18, '#ccfbf1');
            outerGrad.addColorStop(0.52, '#2dd4bf');
            outerGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
        } else if (flameColor === 'heavy_inferno') {
            outerGrad.addColorStop(0, '#ffffff');
            outerGrad.addColorStop(0.15, '#fef08a');
            outerGrad.addColorStop(0.48, '#ea580c');
            outerGrad.addColorStop(0.82, '#b91c1c');
            outerGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
        } else if (flameColor === 'cyan_plasma') {
            outerGrad.addColorStop(0, '#ffffff');
            outerGrad.addColorStop(0.2, '#a7f3d0');
            outerGrad.addColorStop(0.6, '#10b981');
            outerGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        } else if (flameColor === 'scramjet_violet') {
            outerGrad.addColorStop(0, '#ffffff');
            outerGrad.addColorStop(0.18, '#f5d0fe');
            outerGrad.addColorStop(0.55, '#c084fc');
            outerGrad.addColorStop(1, 'rgba(126, 34, 206, 0)');
        } else {
            outerGrad.addColorStop(0, '#ffffff');
            outerGrad.addColorStop(0.18, '#fef08a');
            outerGrad.addColorStop(0.46, '#f4a261');
            outerGrad.addColorStop(0.76, '#e76f51');
            outerGrad.addColorStop(1, 'rgba(217, 93, 57, 0)');
        }

        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.moveTo(0, -baseWid * 0.35);
        ctx.quadraticCurveTo(-baseLen * 0.45, -baseWid, -baseLen, 0);
        ctx.quadraticCurveTo(-baseLen * 0.45, baseWid, 0, baseWid * 0.35);
        ctx.closePath();
        ctx.fill();

        // Núcleo Incandescente Blanco Cálido
        const coreLen = baseLen * 0.65;
        const coreWid = baseWid * 0.42;
        const coreGrad = ctx.createLinearGradient(0, 0, -coreLen, 0);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.5, '#fffbeb');
        coreGrad.addColorStop(0.85, (flameColor === 'scramjet_violet') ? '#e9d5ff' : '#fde047');
        coreGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.moveTo(0, -coreWid * 0.5);
        ctx.quadraticCurveTo(-coreLen * 0.5, -coreWid, -coreLen, 0);
        ctx.quadraticCurveTo(-coreLen * 0.5, coreWid, 0, coreWid * 0.5);
        ctx.closePath();
        ctx.fill();

        // Diamantes de Choque de Mach suaves con halo radial (sin rombos planos)
        const diamondCount = (flameColor === 'scramjet_violet') ? 5 : (isWarp ? 4 : 3);
        for (let d = 0; d < diamondCount; d++) {
            const dx = -4.5 - d * (baseLen * 0.21);
            if (Math.abs(dx) > baseLen * 0.85) break;
            const dw = (3.8 - d * 0.55) * clamp(thr, 0.4, 1.15) * noz.scale;
            const dh = (2.4 - d * 0.35) * clamp(thr, 0.4, 1.15) * noz.scale;
            const dAlpha = (0.88 - d * 0.18) * clamp(thr, 0, 1);
            const dGrad = ctx.createRadialGradient(dx, 0, 0.2, dx, 0, dw * 1.35);
            dGrad.addColorStop(0.0, `rgba(255, 255, 255, ${dAlpha})`);
            dGrad.addColorStop(0.45, `rgba(255, 250, 230, ${dAlpha * 0.55})`);
            dGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = dGrad;
            ctx.beginPath();
            ctx.ellipse(dx, 0, dw * 1.35, dh * 0.95, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    ctx.restore();
}

/**
 * 1. VESPER-IX: Sonda Clásica de Exploración Equilibrada
 */
function drawRocket_Vesper(s, timeSec, localNight, sScale, thr) {
    const isWarp = s.warping && (s.fuel > 0 || s.infiniteFuel);

    // Tren de aterrizaje articulado
    const compL = (s.leftGearSpring ? s.leftGearSpring.pos : 0) * 3.5;
    const compR = (s.rightGearSpring ? s.rightGearSpring.pos : 0) * 3.5;
    const padLX = -15 + compL;
    const padRX = -15 + compR;

    const gearCol = lerpRGB([148, 163, 184], [12, 17, 28], localNight * 0.92);
    ctx.strokeStyle = rgbStr(gearCol, 1);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(-4, -6.0);
    ctx.lineTo(padLX + 3, -10);
    ctx.lineTo(padLX, -11.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-4, 6.0);
    ctx.lineTo(padRX + 3, 10);
    ctx.lineTo(padRX, 11.5);
    ctx.stroke();

    const padCol = lerpRGB([226, 232, 240], [18, 24, 38], localNight * 0.92);
    ctx.fillStyle = rgbStr(padCol, 1);
    ctx.fillRect(padLX - 2, -12.5, 4.5, 2.0);
    ctx.fillRect(padRX - 2, 10.5, 4.5, 2.0);

    // Campana de Tobera con interior incandescente al acelerar
    ctx.save();
    ctx.translate(-10.5, 0);
    ctx.rotate(s.gimbalAngle || 0);
    const nozGrad = ctx.createLinearGradient(0, -4.8, 0, 4.8);
    nozGrad.addColorStop(0, '#475569');
    nozGrad.addColorStop(0.35, '#1e293b');
    nozGrad.addColorStop(0.75, '#0f172a');
    nozGrad.addColorStop(1, '#334155');
    ctx.fillStyle = nozGrad;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, -3.2);
    ctx.lineTo(-4.2, -5.0);
    ctx.lineTo(-4.2, 5.0);
    ctx.lineTo(0, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Brillo térmico en la garganta de la tobera
    if (thr > 0.05) {
        const throatGlow = ctx.createRadialGradient(-3.6, 0, 0.3, -3.6, 0, 4.8);
        throatGlow.addColorStop(0, `rgba(255, 251, 235, ${0.95 * thr})`);
        throatGlow.addColorStop(0.55, `rgba(251, 146, 60, ${0.7 * thr})`);
        throatGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = throatGlow;
        ctx.beginPath();
        ctx.arc(-3.6, 0, 4.8, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Aletas Delta Escandinavas con bisel iluminado
    const finCol = lerpRGB([15, 23, 42], [3, 5, 11], localNight * 0.92);
    const finLight = lerpRGB([51, 65, 85], [8, 12, 22], localNight * 0.92);
    const finGradTop = ctx.createLinearGradient(0, -13.5, 0, -5.5);
    finGradTop.addColorStop(0, rgbStr(finLight, 1));
    finGradTop.addColorStop(1, rgbStr(finCol, 1));
    ctx.fillStyle = finGradTop;
    ctx.strokeStyle = `rgba(244, 162, 97, ${lerp(0.65, 0.14, localNight)})`;
    ctx.lineWidth = 0.95;

    ctx.beginPath();
    ctx.moveTo(1, -6.2);
    ctx.lineTo(-11.5, -13.5);
    ctx.lineTo(-13.0, -11.8);
    ctx.lineTo(-10.0, -5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const finGradBot = ctx.createLinearGradient(0, 5.5, 0, 13.5);
    finGradBot.addColorStop(0, rgbStr(finCol, 1));
    finGradBot.addColorStop(1, rgbStr(finLight, 1));
    ctx.fillStyle = finGradBot;
    ctx.beginPath();
    ctx.moveTo(1, 6.2);
    ctx.lineTo(-11.5, 13.5);
    ctx.lineTo(-13.0, 11.8);
    ctx.lineTo(-10.0, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fuselaje Cerámico Marfil con sombreado cilíndrico realista y costuras de paneles
    let col0 = lerpRGB([255, 255, 255], [14, 20, 34], localNight * 0.94);
    let col1 = lerpRGB([186, 198, 214], [4, 7, 14], localNight * 0.96);

    const hullGrad = ctx.createLinearGradient(0, -8.5, 0, 8.5);
    hullGrad.addColorStop(0.00, rgbStr(col0, 1));
    hullGrad.addColorStop(0.24, rgbStr(lerpRGB(col0, [255, 255, 255], 0.35 * (1 - localNight * 0.90)), 1));
    hullGrad.addColorStop(0.55, rgbStr(lerpRGB(col0, col1, 0.42), 1));
    hullGrad.addColorStop(0.88, rgbStr(lerpRGB(col0, col1, 0.88), 1));
    hullGrad.addColorStop(1.00, rgbStr(col1, 1));

    ctx.fillStyle = hullGrad;
    ctx.strokeStyle = `rgba(255, 255, 255, ${lerp(0.65, 0.08, localNight)})`;
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(21.5, 0);
    ctx.quadraticCurveTo(8.5, -8.2, -11.0, -5.8);
    ctx.lineTo(-11.0, 5.8);
    ctx.quadraticCurveTo(8.5, 8.2, 21.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Costuras sutiles de paneles aeroespaciales
    ctx.strokeStyle = `rgba(15, 23, 42, ${lerp(0.22, 0.35, localNight)})`;
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(-2.5, -6.5); ctx.lineTo(-2.5, 6.5);
    ctx.moveTo(6.8, -5.8); ctx.lineTo(6.8, 5.8);
    ctx.stroke();

    // Franja dorada de telemetría
    ctx.strokeStyle = `rgba(244, 162, 97, ${lerp(0.90, 0.45, localNight)})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(13, -2.3);
    ctx.lineTo(-8.5, -2.3);
    ctx.stroke();

    // Cono de proa obsidiana con brillo especular metálico
    const noseGrad = ctx.createLinearGradient(12, -5, 18, 5);
    noseGrad.addColorStop(0, '#334155');
    noseGrad.addColorStop(0.4, '#0f172a');
    noseGrad.addColorStop(1, '#020617');
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.moveTo(21.5, 0);
    ctx.quadraticCurveTo(16, -3.8, 12.5, -4.8);
    ctx.lineTo(12.5, 4.8);
    ctx.quadraticCurveTo(16, 3.8, 21.5, 0);
    ctx.closePath();
    ctx.fill();

    // Visor de Oro con arco especular de cristal
    const visorGrad = ctx.createRadialGradient(4.5, -0.7, 0.4, 3.2, 0, 4.6);
    visorGrad.addColorStop(0.00, '#fffbeb');
    visorGrad.addColorStop(0.32, '#fde68a');
    visorGrad.addColorStop(0.68, '#f59e0b');
    visorGrad.addColorStop(1.00, '#92400e');
    ctx.fillStyle = visorGrad;
    ctx.strokeStyle = `rgba(15, 23, 42, ${lerp(0.55, 0.85, localNight)})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.ellipse(3.2, 0, 4.6, 2.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Reflejo nítido en el cristal del visor
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(3.6, -0.3, 2.5, -Math.PI * 0.75, -Math.PI * 0.15);
    ctx.stroke();

    // Luces de posición
    ctx.fillStyle = '#2dd4bf';
    ctx.beginPath();
    ctx.arc(-11.5, 12.5, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(-11.5, -12.5, 1.1, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * 2. STARSHIP PROMETHEUS: Megacohete Super Heavy de Acero Inoxidable (El más grande de todos)
 */
function drawRocket_Starship(s, timeSec, localNight, sScale, thr) {
    const sc = sScale; // 2.15x

    // 1. Patas de aterrizaje anchas y telescópicas
    const compL = (s.leftGearSpring ? s.leftGearSpring.pos : 0) * 4.5;
    const compR = (s.rightGearSpring ? s.rightGearSpring.pos : 0) * 4.5;
    const padLX = (-30 + compL) * (sc / 2.0);
    const padRX = (-30 + compR) * (sc / 2.0);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    // Patas articuladas dobles
    ctx.beginPath();
    ctx.moveTo(-10 * sc, -8 * sc);
    ctx.lineTo(padLX, -14 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10 * sc, 8 * sc);
    ctx.lineTo(padRX, 14 * sc);
    ctx.stroke();

    // Pies de apoyo anchos
    ctx.fillStyle = '#64748b';
    ctx.fillRect(padLX - 3, -15 * sc, 7, 3);
    ctx.fillRect(padRX - 3, 13 * sc, 7, 3);

    // 2. Flaps Aerodinámicos de Reentrada Articulados (Canards Delanteros y Aft Flaps Traseros)
    const canardAng = s.flapAngleCanard || 0;
    const aftAng = s.flapAngleAft || 0;

    ctx.save();
    // Flap Canard Superior (Delantero)
    ctx.translate(14 * sc, -6.5 * sc);
    ctx.rotate(canardAng);
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-7 * sc, -7 * sc);
    ctx.lineTo(-10 * sc, -7 * sc);
    ctx.lineTo(-4 * sc, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    // Flap Canard Inferior (Delantero)
    ctx.translate(14 * sc, 6.5 * sc);
    ctx.rotate(-canardAng);
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-7 * sc, 7 * sc);
    ctx.lineTo(-10 * sc, 7 * sc);
    ctx.lineTo(-4 * sc, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    // Aft Body Flap Superior (Trasero)
    ctx.translate(-10 * sc, -7.5 * sc);
    ctx.rotate(aftAng);
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10 * sc, -9 * sc);
    ctx.lineTo(-14 * sc, -8 * sc);
    ctx.lineTo(-8 * sc, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    // Aft Body Flap Inferior (Trasero)
    ctx.translate(-10 * sc, 7.5 * sc);
    ctx.rotate(-aftAng);
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10 * sc, 9 * sc);
    ctx.lineTo(-14 * sc, 8 * sc);
    ctx.lineTo(-8 * sc, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Cluster de Motores Raptor en Popa
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    for (const bellY of [-5 * sc, 0, 5 * sc]) {
        ctx.beginPath();
        ctx.moveTo(-16 * sc, bellY - 2.2);
        ctx.lineTo(-19.5 * sc, bellY - 3.2);
        ctx.lineTo(-19.5 * sc, bellY + 3.2);
        ctx.lineTo(-16 * sc, bellY + 2.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // 4. Fuselaje Cilíndrico de Acero Inoxidable Pulido Espejo con Escudo Térmico Hexagonal
    // Escudo térmico negro en el lado de sotavento / panza (+Y)
    const bodyL = 22 * sc;
    const bodyW = 7.8 * sc;

    // Gradiente metálico de acero inoxidable 304L
    const steelGrad = ctx.createLinearGradient(0, -bodyW, 0, bodyW);
    steelGrad.addColorStop(0.00, '#f8fafc'); // Reflejo blanco plateado superior
    steelGrad.addColorStop(0.20, '#e2e8f0');
    steelGrad.addColorStop(0.48, '#94a3b8');
    steelGrad.addColorStop(0.52, '#0f172a'); // Frontera con las losetas cerámicas negras
    steelGrad.addColorStop(0.70, '#1e293b');
    steelGrad.addColorStop(1.00, '#090d16'); // Escudo térmico negro mate inferior

    ctx.fillStyle = steelGrad;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    // Proa redondeada ojival estilo Starship
    ctx.moveTo(bodyL, 0);
    ctx.quadraticCurveTo(bodyL * 0.6, -bodyW, -16 * sc, -bodyW);
    ctx.lineTo(-16 * sc, bodyW);
    ctx.quadraticCurveTo(bodyL * 0.6, bodyW, bodyL, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Anillos de soldadura de acero inoxidable longitudinales
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 0.8;
    for (let rx = -12 * sc; rx <= 10 * sc; rx += 5.5 * sc) {
        ctx.beginPath();
        ctx.moveTo(rx, -bodyW * 0.95);
        ctx.lineTo(rx, 0);
        ctx.stroke();
    }

    // Ventilación de gas criogénico en el morro (SpaceX Cryo Venting)
    if (Math.random() < 0.25) {
        ctx.fillStyle = 'rgba(240, 249, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(bodyL * 0.7, -bodyW * 0.7, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }

    // Balizas estroboscópicas rojas y blancas de fuselaje masivo
    const strobe = (Math.sin(timeSec * 5.0) > 0.85);
    if (strobe) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -bodyW - 1, 2.0, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * 3. CELESTIA CRUISER V-8: Transporte Masivo de Pasajeros y Colonos (24 Pasajeros)
 */
function drawRocket_Celestia(s, timeSec, localNight, sScale, thr) {
    const sc = sScale; // 1.38x

    // 1. Patas de aterrizaje oleoneumáticas dobles
    const compL = (s.leftGearSpring ? s.leftGearSpring.pos : 0) * 3.2;
    const compR = (s.rightGearSpring ? s.rightGearSpring.pos : 0) * 3.2;
    const padLX = (-20 + compL) * (sc / 1.3);
    const padRX = (-20 + compR) * (sc / 1.3);

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-5 * sc, -7 * sc);
    ctx.lineTo(padLX, -12 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5 * sc, 7 * sc);
    ctx.lineTo(padRX, 12 * sc);
    ctx.stroke();

    // 2. Alas curvadas señoriales con winglets canted
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(6 * sc, -7 * sc);
    ctx.lineTo(-14 * sc, -16 * sc);
    ctx.lineTo(-16 * sc, -14 * sc);
    ctx.lineTo(-11 * sc, -6 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6 * sc, 7 * sc);
    ctx.lineTo(-14 * sc, 16 * sc);
    ctx.lineTo(-16 * sc, 14 * sc);
    ctx.lineTo(-11 * sc, 6 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Toberas gemelas aerospike
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-15 * sc, -7 * sc, 4 * sc, 3 * sc);
    ctx.fillRect(-15 * sc, 4 * sc, 4 * sc, 3 * sc);

    // 4. Fuselaje Aerodinámico de Crucero Colonial en Blanco Perlado y Azul Cielo
    const hullGrad = ctx.createLinearGradient(0, -9 * sc, 0, 9 * sc);
    hullGrad.addColorStop(0.0, '#ffffff');
    hullGrad.addColorStop(0.4, '#e0f2fe');
    hullGrad.addColorStop(0.8, '#38bdf8');
    hullGrad.addColorStop(1.0, '#0369a1');

    ctx.fillStyle = hullGrad;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(22 * sc, 0);
    ctx.quadraticCurveTo(10 * sc, -8.5 * sc, -14 * sc, -7.5 * sc);
    ctx.lineTo(-14 * sc, 7.5 * sc);
    ctx.quadraticCurveTo(10 * sc, 8.5 * sc, 22 * sc, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. FILA DE VENTANALES PANORÁMICOS DE PASAJEROS ILUMINADOS DE NOCHE
    // Brilla con luz cálida de cabina presurizada donde viajan los 24 colonos
    const windowAlpha = 0.5 + 0.45 * localNight;
    ctx.fillStyle = `rgba(254, 240, 138, ${windowAlpha})`;
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 0.7;

    for (let wx = -7 * sc; wx <= 11 * sc; wx += 3.2 * sc) {
        ctx.beginPath();
        ctx.ellipse(wx, -2.5 * sc, 1.2 * sc, 0.8 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Silueta diminuta de pasajero mirando por la ventana
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.arc(wx, -2.5 * sc, 0.45 * sc, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(254, 240, 138, ${windowAlpha})`;
    }

    // Cabina de mando panorámica en el morro
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(16 * sc, 0, 3.5 * sc, 1.8 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * 4. COLOSSUS TITAN-IV: Super-Carguero Industrial Blindado (200 HP)
 */
function drawRocket_Titan(s, timeSec, localNight, sScale, thr) {
    const sc = sScale; // 1.58x

    // 1. Patas pesadas de pistón hidráulico cuádruple
    const compL = (s.leftGearSpring ? s.leftGearSpring.pos : 0) * 4.0;
    const compR = (s.rightGearSpring ? s.rightGearSpring.pos : 0) * 4.0;
    const padLX = (-24 + compL) * (sc / 1.5);
    const padRX = (-24 + compR) * (sc / 1.5);

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-6 * sc, -9 * sc);
    ctx.lineTo(padLX, -15 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6 * sc, 9 * sc);
    ctx.lineTo(padRX, 15 * sc);
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(padLX - 3, -16 * sc, 8, 3.5);
    ctx.fillRect(padRX - 3, 14 * sc, 8, 3.5);

    // 2. Toberas gemelas industriales pesadas
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1.3;
    ctx.fillRect(-17 * sc, -9 * sc, 5 * sc, 4.5 * sc);
    ctx.strokeRect(-17 * sc, -9 * sc, 5 * sc, 4.5 * sc);
    ctx.fillRect(-17 * sc, 4.5 * sc, 5 * sc, 4.5 * sc);
    ctx.strokeRect(-17 * sc, 4.5 * sc, 5 * sc, 4.5 * sc);

    // 3. Fuselaje Blindado Angular de Titanio Oscuro
    const titanGrad = ctx.createLinearGradient(0, -11 * sc, 0, 11 * sc);
    titanGrad.addColorStop(0.0, '#475569');
    titanGrad.addColorStop(0.4, '#334155');
    titanGrad.addColorStop(0.8, '#1e293b');
    titanGrad.addColorStop(1.0, '#0f172a');

    ctx.fillStyle = titanGrad;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    ctx.moveTo(25 * sc, 0);
    ctx.lineTo(12 * sc, -9.5 * sc);
    ctx.lineTo(-14 * sc, -9.5 * sc);
    ctx.lineTo(-15 * sc, 0);
    ctx.lineTo(-14 * sc, 9.5 * sc);
    ctx.lineTo(12 * sc, 9.5 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Franjas de advertencia industrial (Hazard Stripes)
    ctx.save();
    ctx.beginPath();
    ctx.rect(-4 * sc, -8 * sc, 8 * sc, 16 * sc);
    ctx.clip();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.0;
    for (let hx = -8 * sc; hx <= 8 * sc; hx += 3.5 * sc) {
        ctx.beginPath();
        ctx.moveTo(hx, -10 * sc);
        ctx.lineTo(hx + 4 * sc, 10 * sc);
        ctx.stroke();
    }
    ctx.restore();

    // Placas de refuerzo estructural remachadas
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-10 * sc, -6 * sc, 18 * sc, 12 * sc);

    // Ranuras de visión reforzadas
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(16 * sc, -2 * sc, 3 * sc, 4 * sc);
}

/**
 * 5. AERODART X-1: Interceptor Compacto y Rápido (Chico, Ágil y Ligero)
 */
function drawRocket_AeroDart(s, timeSec, localNight, sScale, thr) {
    const sc = sScale; // 0.72x

    // 1. Patines aerodinámicos compactos
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-2 * sc, -6 * sc);
    ctx.lineTo(-11 * sc, -8.5 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2 * sc, 6 * sc);
    ctx.lineTo(-11 * sc, 8.5 * sc);
    ctx.stroke();

    // 2. Alas delta en flecha invertida con bordes de neón ciano/esmeralda
    ctx.fillStyle = '#090e17';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(4 * sc, -5 * sc);
    ctx.lineTo(-13 * sc, -13 * sc);
    ctx.lineTo(-11 * sc, -4 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4 * sc, 5 * sc);
    ctx.lineTo(-13 * sc, 13 * sc);
    ctx.lineTo(-11 * sc, 4 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Fuselaje afilado en punta de flecha
    const dartGrad = ctx.createLinearGradient(0, -5 * sc, 0, 5 * sc);
    dartGrad.addColorStop(0.0, '#334155');
    dartGrad.addColorStop(0.5, '#1e293b');
    dartGrad.addColorStop(1.0, '#0f172a');

    ctx.fillStyle = dartGrad;
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 1.1;

    ctx.beginPath();
    ctx.moveTo(18 * sc, 0);
    ctx.lineTo(2 * sc, -5 * sc);
    ctx.lineTo(-12 * sc, -4.5 * sc);
    ctx.lineTo(-12 * sc, 4.5 * sc);
    ctx.lineTo(2 * sc, 5 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Cúpula de cabina de piloto esmeralda polarizada
    ctx.fillStyle = '#059669';
    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(3 * sc, 0, 4.5 * sc, 2.0 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

/**
 * 6. VELOCITAS HYPERION-X: Bólido Hipersónico Scramjet (Extremadamente para la Velocidad)
 */
function drawRocket_Hyperion(s, timeSec, localNight, sScale, thr) {
    const sc = sScale; // 0.96x

    // 1. Aguja de proa pitot hipersónica
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(26 * sc, 0);
    ctx.lineTo(34 * sc, 0);
    ctx.stroke();

    // 2. Aletas canard de penetración hipersónica
    ctx.fillStyle = '#2e1065';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(10 * sc, -3 * sc);
    ctx.lineTo(-12 * sc, -9 * sc);
    ctx.lineTo(-14 * sc, -2 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(10 * sc, 3 * sc);
    ctx.lineTo(-12 * sc, 9 * sc);
    ctx.lineTo(-14 * sc, 2 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Fuselaje Aerodinámico de Aguja Cerámica Blanca y Obsidian
    const hypGrad = ctx.createLinearGradient(0, -4.5 * sc, 0, 4.5 * sc);
    hypGrad.addColorStop(0.0, '#ffffff');
    hypGrad.addColorStop(0.35, '#f5d0fe');
    hypGrad.addColorStop(0.7, '#a855f7');
    hypGrad.addColorStop(1.0, '#3b0764');

    ctx.fillStyle = hypGrad;
    ctx.strokeStyle = '#f0abfc';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(26 * sc, 0);
    ctx.lineTo(4 * sc, -4.2 * sc);
    ctx.lineTo(-15 * sc, -3.5 * sc);
    ctx.lineTo(-15 * sc, 3.5 * sc);
    ctx.lineTo(4 * sc, 4.2 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Línea de energía fotónica violeta a lo largo del fuselaje
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(22 * sc, 0);
    ctx.lineTo(-13 * sc, 0);
    ctx.stroke();

    // Branquias térmicas de disipación de choque
    ctx.fillStyle = '#581c87';
    for (let gx = -6 * sc; gx <= 2 * sc; gx += 2.8 * sc) {
        ctx.fillRect(gx, -3 * sc, 1.4 * sc, 6 * sc);
    }
}

/**
 * 7. AERODRONE SCOUT-09: Sonda Robótica Autónoma VTOL (Estilo Dron)
 */
function drawRocket_Drone(s, timeSec, localNight, sScale, thr) {
    const sc = sScale; // 0.82x

    // 1. Cuatro brazos de propulsores vectoriales VTOL en cruz
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.0;

    // Brazos
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8 * sc, -9 * sc);
    ctx.moveTo(0, 0);
    ctx.lineTo(-8 * sc, 9 * sc);
    ctx.moveTo(0, 0);
    ctx.lineTo(6 * sc, -8 * sc);
    ctx.moveTo(0, 0);
    ctx.lineTo(6 * sc, 8 * sc);
    ctx.stroke();

    // Góndolas cilíndricas VTOL con halo iónico
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1.0;
    for (const pod of [
        { x: -8 * sc, y: -9 * sc },
        { x: -8 * sc, y: 9 * sc },
        { x: 6 * sc, y: -8 * sc },
        { x: 6 * sc, y: 8 * sc }
    ]) {
        ctx.beginPath();
        ctx.arc(pod.x, pod.y, 2.8 * sc, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    // 2. Chasis Hexagonal Táctico de Carbono
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(11 * sc, 0);
    ctx.lineTo(5 * sc, -7 * sc);
    ctx.lineTo(-7 * sc, -7 * sc);
    ctx.lineTo(-12 * sc, 0);
    ctx.lineTo(-7 * sc, 7 * sc);
    ctx.lineTo(5 * sc, 7 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. SENSOR LIDAR GIRATORIO 360° (Ojo robótico cibernético con barrido radar)
    const sweepAng = timeSec * 4.5;
    ctx.fillStyle = '#042f2e';
    ctx.beginPath();
    ctx.arc(0, 0, 4.2 * sc, 0, Math.PI * 2);
    ctx.fill();

    // Anillo exterior
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Haz de barrido óptico
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 4.0 * sc, sweepAng, sweepAng + 0.6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(45, 212, 191, 0.45)';
    ctx.fill();
    ctx.restore();

    // Núcleo central pulsante
    ctx.fillStyle = '#5eead4';
    ctx.beginPath();
    ctx.arc(0, 0, 1.4 * sc, 0, Math.PI * 2);
    ctx.fill();

    // Antenas de enlace satelital con LED intermitente
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-11 * sc, -3 * sc);
    ctx.lineTo(-15 * sc, -6 * sc);
    ctx.moveTo(-11 * sc, 3 * sc);
    ctx.lineTo(-15 * sc, 6 * sc);
    ctx.stroke();

    const blink = (Math.sin(timeSec * 8) > 0);
    ctx.fillStyle = blink ? '#22c55e' : '#0f766e';
    ctx.beginPath();
    ctx.arc(-15 * sc, -6 * sc, 1.0, 0, Math.PI * 2);
    ctx.arc(-15 * sc, 6 * sc, 1.0, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Renderizado de Vista Previa de Cohete en el Canvas del Hangar
 */
function renderRocketPreview(canvas, modelKey) {
    if (!canvas) return;
    const c = canvas.getContext('2d');
    if (!c) return;

    const w = canvas.width;
    const h = canvas.height;
    c.clearRect(0, 0, w, h);

    // Fondo estelar tenue
    const bgGrad = c.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#030712');
    bgGrad.addColorStop(1, '#0b1329');
    c.fillStyle = bgGrad;
    c.fillRect(0, 0, w, h);

    // Rejilla técnica sutil
    c.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    c.lineWidth = 1;
    for (let x = 0; x < w; x += 18) {
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
    }
    for (let y = 0; y < h; y += 18) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    }

    const curM = (typeof getRocketModel === 'function') ? getRocketModel(modelKey) : null;
    const isCustomModel = (modelKey === 'custom' && curM && curM.customParts);
    const previewShip = {
        modelKey: modelKey,
        customRocket: isCustomModel ? curM : null,
        x: w * 0.48,
        y: h * 0.5,
        angle: 0, // Proa hacia la derecha
        thrustIntensity: 0.35,
        warping: false,
        fuel: 100,
        gimbalAngle: 0,
        leftGearSpring: { pos: 0.2 },
        rightGearSpring: { pos: 0.2 },
        flapAngleCanard: 0.2,
        flapAngleAft: -0.2
    };

    // Guardar contexto principal y suplantar temporalmente para dibujar en el preview
    const oldCtx = ctx;
    ctx = c;
    try {
        if (isCustomModel && curM.bounds) {
            const flightLen = Math.max(40, (curM.bounds.height || 120) * 0.5);
            const fitScale = Math.min(1.0, (w * 0.65) / flightLen, (h * 0.75) / Math.max(20, (curM.bounds.width || 40) * 0.5));
            c.save();
            c.translate(previewShip.x, previewShip.y);
            c.scale(fitScale, fitScale);
            c.translate(-previewShip.x, -previewShip.y);
            drawRocket(performance.now() * 0.001, previewShip);
            c.restore();
        } else {
            drawRocket(performance.now() * 0.001, previewShip);
        }
    } catch(e) {}
    ctx = oldCtx;
}


/**
 * Dibuja la nube cónica de condensación transónica (Prandtl-Glauert) adherida al fuselaje
 * cuando la sonda atraviesa la barrera del sonido en atmósfera densa.
 */
function getShipAtmosphericDimensions() {
    const cr = (ship && ship.customRocket && ship.customRocket.bounds && ship.customRocket.com) ? ship.customRocket : null;
    if (cr) {
        const halfLen = Math.max(18, (cr.bounds.height || 74) * 0.25);
        const halfWid = Math.max(10, (cr.bounds.width || 40) * 0.25);
        const geoCenterX = -(((cr.bounds.minY + cr.bounds.maxY) * 0.5) - cr.com.y) * 0.5;
        return { halfLen, halfWid, geoCenterX };
    }
    const sc = (ship && ship.scale) ? ship.scale : 1.0;
    return { halfLen: 18.5 * sc, halfWid: 11.0 * sc, geoCenterX: 0 };
}

function drawTransonicVaporCone(intensity, timeSec) {
    const dims = getShipAtmosphericDimensions();
    ctx.save();
    ctx.translate(dims.geoCenterX, 0);
    ctx.rotate(ship.reentryFlowAngle); // Alineado con el flujo relativo
    ctx.globalCompositeOperation = 'lighter';

    const sinFlow = Math.abs(Math.sin(ship.reentryFlowAngle));
    const cosFlow = Math.cos(ship.reentryFlowAngle);
    const bodyDepth = Math.abs(cosFlow) * dims.halfLen + sinFlow * dims.halfWid;
    const bodySpan = Math.abs(cosFlow) * dims.halfWid + sinFlow * dims.halfLen;

    const coneLead = bodyDepth * 0.46;
    const coneTail = -bodyDepth * 1.18;
    const coneTipY = Math.max(4.5, bodySpan * 0.42);
    const coneFlareY = Math.max(22, bodySpan * 2.05);

    const pNear = ship.nearestPlanet;
    const nightFactor = (pNear && ship.currentSolarState) ? clamp(ship.currentSolarState.nightFactor, 0, 1) : 0;
    const isFiring = ship.thrustIntensity > 0.05;

    const coneAlpha = clamp(intensity * (isFiring ? 0.6 : lerp(0.55, 0.20, nightFactor)), 0, 0.65);
    const flutter = Math.sin(timeSec * 45) * 1.2;

    const baseTint = isFiring
        ? [254, 215, 170]
        : lerpRGB([240, 249, 255], [71, 85, 105], nightFactor * 0.75);

    // Primer manto de condensación en la sección media
    const vGrad = ctx.createLinearGradient(coneLead, 0, coneTail, 0);
    vGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    vGrad.addColorStop(0.22, `rgba(${baseTint[0]}, ${baseTint[1]}, ${baseTint[2]}, ${coneAlpha})`);
    vGrad.addColorStop(0.55, `rgba(${baseTint[0]}, ${baseTint[1]}, ${baseTint[2]}, ${coneAlpha * 0.55})`);
    vGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = vGrad;
    ctx.beginPath();
    ctx.moveTo(coneLead + 1, -coneTipY);
    ctx.lineTo(coneTail * 0.82, -coneFlareY + flutter);
    ctx.lineTo(coneTail, 0);
    ctx.lineTo(coneTail * 0.82, coneFlareY - flutter);
    ctx.lineTo(coneLead + 1, coneTipY);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

/**
 * Calcula la envolvente aerodinámica real de barlovento/sotavento del cohete
 * proyectada en el marco del flujo de aire (flowAngle).
 * Permite que el plasma de reentrada abrace con precisión la silueta real de
 * cualquier cohete (pequeño, gigante, con boosters laterales, cofias o escudos).
 */
function getShipWindwardProfile(s, flowAngle) {
    const cF = Math.cos(flowAngle);
    const sF = Math.sin(flowAngle);
    const polys = [];

    const cr = (s && s.customRocket && Array.isArray(s.customRocket.customParts) && typeof ROCKET_PARTS_CATALOG !== 'undefined')
        ? s.customRocket : null;

    if (cr && cr.customParts.length > 0) {
        const com = cr.com || { x: 0, y: 0 };
        const scale = (s.scale || 1.0) * (typeof FLIGHT_SCALE !== 'undefined' ? FLIGHT_SCALE : 0.5);
        for (const p of cr.customParts) {
            const def = ROCKET_PARTS_CATALOG[p.partDefId];
            if (!def) continue;
            if (def.isFairing && p.fairingOpened) continue;
            const sz = (typeof getPartSize === 'function') ? getPartSize(p, def) : { width: def.width || 24, height: def.height || 24 };
            const fx = -(p.y - com.y) * scale;
            const fy = (p.x - com.x) * scale;
            const rawW = sz.width || 24;
            const hw = rawW * 0.5 * scale;
            const hh = (sz.height || 24) * 0.5 * scale;
            const rot = Math.PI / 2 + ((p.rotation || 0) * Math.PI) / 180;
            const cR = Math.cos(rot);
            const sR = Math.sin(rot);

            let anim = 1.0;
            if (def.deployable) {
                if (typeof p.deployAnim === 'number') anim = p.deployAnim;
                else if (p.deployed === false) anim = 0.0;
            }

            // Afinar la parte superior de cofias, cápsulas y adaptadores cónicos para una silueta fiel
            let xLeft = -hw;
            let xRight = hw;
            let xTopLeft = -hw;
            let xTopRight = hw;
            if (def.isSolarPanel) {
                const effW = (9 + (rawW - 9) * anim) * scale;
                xLeft = hw - effW;
                xTopLeft = xLeft;
            } else if (def.isLandingPad) {
                const effW = (8 + (rawW - 8) * anim) * scale;
                xLeft = hw - effW;
                xTopLeft = xLeft;
            } else if (p.partDefId === 'nosecone_ogive' || p.partDefId === 'nosecone_booster') {
                xTopLeft = -hw * 0.14;
                xTopRight = hw * 0.14;
            } else if (p.partDefId === 'capsule_vesper' || p.partDefId === 'capsule_titan') {
                xTopLeft = -hw * 0.42;
                xTopRight = hw * 0.42;
            } else if (p.partDefId === 'tank_adapter_cone') {
                xTopLeft = -hw * 0.52;
                xTopRight = hw * 0.52;
            }

            const flip = p.flipped ? -1 : 1;
            const localPts = [
                [xTopLeft * flip, -hh],
                [xTopRight * flip, -hh],
                [xRight * flip, hh],
                [xLeft * flip, hh]
            ];
            const poly = new Array(4);
            for (let k = 0; k < 4; k++) {
                const sx = fx + localPts[k][0] * cR - localPts[k][1] * sR;
                const sy = fy + localPts[k][0] * sR + localPts[k][1] * cR;
                poly[k] = [sx * cF + sy * sF, -sx * sF + sy * cF];
            }
            polys.push(poly);
        }
    } else {
        const sc = (s && s.scale) ? s.scale : 1.0;
        const mKey = (s && s.modelKey) || 'vesper';
        const curModel = (typeof getRocketModel === 'function') ? getRocketModel(mKey) : null;
        const mScale = curModel ? (curModel.scale || 1.0) : sc;
        const hl = 17.5 * mScale;
        const hw = 7.2 * mScale;
        const localPts = [
            [hl, 0],
            [hl * 0.42, -hw * 0.85],
            [-hl * 0.85, -hw],
            [-hl, -hw * 1.12],
            [-hl, hw * 1.12],
            [-hl * 0.85, hw],
            [hl * 0.42, hw * 0.85]
        ];
        const poly = localPts.map(([sx, sy]) => [sx * cF + sy * sF, -sx * sF + sy * cF]);
        polys.push(poly);
    }

    if (polys.length === 0) return null;

    let minV = Infinity, maxV = -Infinity;
    for (const poly of polys) {
        for (const pt of poly) {
            if (pt[1] < minV) minV = pt[1];
            if (pt[1] > maxV) maxV = pt[1];
        }
    }
    if (!isFinite(minV) || maxV - minV < 2) return null;

    const N = 28;
    const ys = new Array(N);
    const frontX = new Array(N).fill(-Infinity);
    const backX = new Array(N).fill(Infinity);
    const dv = (maxV - minV) / (N - 1);
    for (let i = 0; i < N; i++) ys[i] = minV + i * dv;

    // Rasterización exacta de la envolvente de barlovento y sotavento
    for (const poly of polys) {
        const m = poly.length;
        for (let e = 0; e < m; e++) {
            const a = poly[e];
            const b = poly[(e + 1) % m];

            // Asegurar que los vértices agudos (puntas de cofia / aletas) queden registrados
            const vIdx = clamp(Math.round((a[1] - minV) / dv), 0, N - 1);
            if (a[0] > frontX[vIdx]) frontX[vIdx] = a[0];
            if (a[0] < backX[vIdx]) backX[vIdx] = a[0];

            const vMinE = Math.min(a[1], b[1]);
            const vMaxE = Math.max(a[1], b[1]);
            const iStart = Math.max(0, Math.ceil((vMinE - minV) / dv));
            const iEnd = Math.min(N - 1, Math.floor((vMaxE - minV) / dv));
            const dvy = b[1] - a[1];

            for (let i = iStart; i <= iEnd; i++) {
                const t = Math.abs(dvy) > 1e-4 ? (ys[i] - a[1]) / dvy : 0.5;
                const ux = a[0] + (b[0] - a[0]) * clamp(t, 0, 1);
                if (ux > frontX[i]) frontX[i] = ux;
                if (ux < backX[i]) backX[i] = ux;
            }
        }
    }

    // Rellenar cualquier hueco entre etapas o boosters mediante interpolación vecina
    for (let i = 0; i < N; i++) {
        if (frontX[i] === -Infinity) {
            let l = i - 1, r = i + 1;
            while (l >= 0 && frontX[l] === -Infinity) l--;
            while (r < N && frontX[r] === -Infinity) r++;
            if (l >= 0 && r < N) {
                const frac = (i - l) / (r - l);
                frontX[i] = lerp(frontX[l], frontX[r], frac);
                backX[i] = lerp(backX[l], backX[r], frac);
            } else if (l >= 0) {
                frontX[i] = frontX[l];
                backX[i] = backX[l];
            } else if (r < N) {
                frontX[i] = frontX[r];
                backX[i] = backX[r];
            } else {
                frontX[i] = 0;
                backX[i] = 0;
            }
        }
    }

    // Suavizado aerodinámico (2 pasadas) para obtener la onda de choque desprendida continua
    let shockFrontX = frontX.slice();
    for (let pass = 0; pass < 2; pass++) {
        const next = shockFrontX.slice();
        for (let i = 1; i < N - 1; i++) {
            next[i] = shockFrontX[i - 1] * 0.25 + shockFrontX[i] * 0.5 + shockFrontX[i + 1] * 0.25;
        }
        next[0] = shockFrontX[0] * 0.65 + shockFrontX[1] * 0.35;
        next[N - 1] = shockFrontX[N - 1] * 0.65 + shockFrontX[N - 2] * 0.35;
        shockFrontX = next;
    }

    let maxFrontX = -Infinity, minBackX = Infinity;
    for (let i = 0; i < N; i++) {
        if (frontX[i] > maxFrontX) maxFrontX = frontX[i];
        if (backX[i] < minBackX) minBackX = backX[i];
    }

    return {
        count: N,
        ys,
        frontX,
        backX,
        shockFrontX,
        minY: minV,
        maxY: maxV,
        spanY: maxV - minV,
        maxFrontX,
        minBackX,
        bodyDepth: Math.max(8, maxFrontX - minBackX)
    };
}

/**
 * Dibuja quemaduras direccionales e incandescencia sobre cohetes predefinidos.
 */
function drawPresetRocketScorch(s, mKey, sScale) {
    const sc = s.scorch;
    if (!sc) return;
    const amt = clamp(sc.amount || 0, 0, 1);
    const temp = clamp(sc.temp || 0, 0, 1);
    const peakTemp = Math.max(temp, clamp(sc.peakTemp || 0, 0, 1));
    if (amt <= 0.005 && temp <= 0.015) return;

    const hl = 17.5 * sScale;
    const hw = 7.4 * sScale;
    const dLen = Math.hypot(sc.dirX || 1, sc.dirY || 0) || 1;
    const dx = (sc.dirX || 1) / dLen;
    const dy = (sc.dirY || 0) / dLen;
    const px = -dy;
    const py = dx;
    const rFlow = Math.abs(dx) * hl + Math.abs(dy) * hw;
    const rPerp = Math.abs(px) * hl + Math.abs(py) * hw;
    const isStarship = mKey === 'starship';

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(hl * 1.02, 0);
    ctx.quadraticCurveTo(hl * 0.5, -hw * 0.9, -hl * 0.85, -hw);
    ctx.lineTo(-hl, hw);
    ctx.lineTo(-hl * 0.85, hw);
    ctx.quadraticCurveTo(hl * 0.5, hw * 0.9, hl * 1.02, 0);
    ctx.closePath();
    ctx.clip();

    if (amt > 0.005) {
        // Velo general irregular de hollín para que el cohete no quede blanco como nuevo
        const overallPow = Math.pow(amt, 0.76);
        ctx.fillStyle = `rgba(18, 14, 12, ${(isStarship ? 0.34 : 0.46) * overallPow})`;
        ctx.fillRect(-hl * 1.25, -hw * 1.35, hl * 2.5, hw * 2.7);
        for (let g = 0; g < 5; g++) {
            const h1 = Math.sin((g * 43.1 + 11.7) * 43758.5453);
            const r1 = h1 - Math.floor(h1);
            const h2 = Math.sin((g * 91.3 + 5.2) * 19341.123);
            const r2 = h2 - Math.floor(h2);
            const gx = (r1 - 0.5) * hl * 1.75;
            const gy = (r2 - 0.5) * hw * 1.65;
            const gr = Math.max(4, (0.35 + r1 * 0.4) * hw * 1.6);
            const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
            gg.addColorStop(0, `rgba(${r2 > 0.5 ? '42, 26, 16' : '10, 9, 9'}, ${0.30 * overallPow})`);
            gg.addColorStop(1, 'rgba(12, 10, 10, 0)');
            ctx.fillStyle = gg;
            ctx.beginPath();
            ctx.arc(gx, gy, gr, 0, Math.PI * 2);
            ctx.fill();
        }

        const burnLayers = (Array.isArray(sc.burns) && sc.burns.length > 0)
            ? sc.burns
            : [{ dirX: dx, dirY: dy, amount: amt, peakTemp }];

        for (let li = 0; li < burnLayers.length; li++) {
            const b = burnLayers[li];
            const bAmt = clamp(b.amount || 0, 0, 1);
            if (bAmt <= 0.005) continue;
            const bPeak = Math.max(bAmt, clamp(b.peakTemp || 0, 0, 1));
            const bdLen = Math.hypot(b.dirX || 1, b.dirY || 0) || 1;
            const bdx = (b.dirX || 1) / bdLen;
            const bdy = (b.dirY || 0) / bdLen;
            const bpx = -bdy;
            const bpy = bdx;
            const bRFlow = Math.abs(bdx) * hl + Math.abs(bdy) * hw;
            const bRPerp = Math.abs(bpx) * hl + Math.abs(bpy) * hw;

            const reach = 0.42 + 0.90 * Math.pow(bAmt, 0.62);
            const g = ctx.createLinearGradient(bdx * bRFlow, bdy * bRFlow, bdx * bRFlow * (1 - 2 * reach), bdy * bRFlow * (1 - 2 * reach));
            if (isStarship) {
                const tStr = Math.max(bAmt, bPeak * 0.85);
                g.addColorStop(0, `rgba(12, 11, 14, ${0.82 * bAmt})`);
                g.addColorStop(0.25, `rgba(186, 132, 58, ${0.34 * tStr})`);
                g.addColorStop(0.55, `rgba(118, 58, 134, ${0.30 * tStr})`);
                g.addColorStop(0.80, `rgba(48, 86, 142, ${0.22 * tStr})`);
                g.addColorStop(1, 'rgba(18, 16, 22, 0)');
            } else {
                g.addColorStop(0, `rgba(10, 8, 8, ${0.86 * Math.min(1, bAmt * 1.1)})`);
                g.addColorStop(0.30, `rgba(58, 30, 16, ${0.56 * bAmt})`);
                g.addColorStop(0.65, `rgba(32, 24, 20, ${0.28 * bAmt})`);
                g.addColorStop(1, 'rgba(15, 12, 10, 0)');
            }
            ctx.fillStyle = g;
            ctx.fillRect(-hl * 1.25, -hw * 1.35, hl * 2.5, hw * 2.7);

            // Estelas sinuosas deterministas de hollín para esta capa
            for (let i = 0; i < 6; i++) {
                const h1 = Math.sin(((i + li * 11) * 31.7 + 7.3) * 43758.5453);
                const r1 = h1 - Math.floor(h1);
                const h2 = Math.sin(((i + li * 11) * 73.1 + 19.4) * 19341.123);
                const r2 = h2 - Math.floor(h2);
                const lat = (r1 * 1.7 - 0.85) * bRPerp;
                const adv = bRFlow * (0.72 + r2 * 0.25);
                const len = bRFlow * (0.52 + bAmt * (0.80 + r2 * 0.5));
                const sx = bdx * adv + bpx * lat;
                const sy = bdy * adv + bpy * lat;
                const ex = sx - bdx * len;
                const ey = sy - bdy * len;
                const sg = ctx.createLinearGradient(sx, sy, ex, ey);
                sg.addColorStop(0, `rgba(8, 7, 7, ${0.54 * bAmt})`);
                sg.addColorStop(0.5, `rgba(48, 26, 14, ${0.30 * bAmt})`);
                sg.addColorStop(1, 'rgba(15, 12, 10, 0)');
                ctx.strokeStyle = sg;
                ctx.lineWidth = (1.1 + r2 * 1.8) * sScale * 0.65;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.quadraticCurveTo((sx + ex) * 0.5 + bpx * (r2 - 0.5) * 3, (sy + ey) * 0.5 + bpy * (r2 - 0.5) * 3, ex, ey);
                ctx.stroke();
            }
        }
    }

    if (temp > 0.015) {
        ctx.globalCompositeOperation = 'lighter';
        const hg = ctx.createLinearGradient(dx * rFlow * 1.05, dy * rFlow * 1.05, -dx * rFlow * 0.45, -dy * rFlow * 0.45);
        hg.addColorStop(0, temp > 0.60 ? `rgba(255, 232, 130, ${0.72 * temp})` : `rgba(249, 115, 22, ${0.64 * temp})`);
        hg.addColorStop(0.42, `rgba(220, 38, 38, ${0.36 * temp})`);
        hg.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = hg;
        ctx.fillRect(-hl * 1.25, -hw * 1.35, hl * 2.5, hw * 2.7);

        if (temp > 0.10) {
            const rg = ctx.createLinearGradient(dx * rFlow * 1.02, dy * rFlow * 1.02, dx * rFlow * 0.45, dy * rFlow * 0.45);
            rg.addColorStop(0, `rgba(255, 252, 232, ${0.88 * temp})`);
            rg.addColorStop(0.40, `rgba(253, 224, 71, ${0.62 * temp})`);
            rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = rg;
            ctx.fillRect(-hl * 1.25, -hw * 1.35, hl * 2.5, hw * 2.7);
        }
    }
    ctx.restore();
}

/**
 * Dibuja la capa de plasma de reentrada atmosférica adaptándose con precisión
 * a la silueta real del cohete (pequeño o gigante) y a su orientación respecto al flujo.
 */
function drawReentryPlasmaSheath(reI, timeSec) {
    const profile = getShipWindwardProfile(ship, ship.reentryFlowAngle);
    if (!profile || profile.count < 3) return;

    ctx.save();
    // Rotamos al ángulo local del flujo de aire incidente:
    // +X en este sistema local apunta hacia donde el aire golpea al cohete (Barlovento)
    // -X apunta hacia la estela de plasma (Sotavento)
    ctx.rotate(ship.reentryFlowAngle);
    ctx.globalCompositeOperation = 'lighter';

    const intensity = clamp(reI, 0, 1.25);
    const N = profile.count;
    const ys = profile.ys;
    const frontX = profile.frontX;
    const shockFrontX = profile.shockFrontX;
    const spanY = Math.max(14, profile.spanY);
    const bodyDepth = profile.bodyDepth;
    const midY = (profile.minY + profile.maxY) * 0.5;

    // Distancia física de desprendimiento de la onda de choque (Bow Shock Standoff)
    const standoff = clamp(2.4 + Math.sqrt(spanY) * 0.48, 2.8, 9.5) + Math.sin(timeSec * 48) * 0.35;
    const wakeLen = clamp(bodyDepth * 0.95 + spanY * 0.55, 28, 165) + intensity * 26 + Math.sin(timeSec * 52) * 3.0;
    const wakeFlare = clamp(spanY * 0.22 + intensity * 14, 6, 42);
    const hugDepth = clamp(3.5 + spanY * 0.04, 3.5, 8.0);

    // Puntos desplazados de la onda de choque
    const sx = new Array(N);
    for (let i = 0; i < N; i++) {
        // Leve retroceso aerodinámico en los extremos laterales para redondear el arco de choque
        const edgeFrac = Math.abs((ys[i] - midY) / (spanY * 0.5 || 1));
        sx[i] = shockFrontX[i] + standoff * (1.0 - 0.35 * edgeFrac * edgeFrac);
    }

    // 1. Corona Exterior Ionizada (Nitrógeno/Oxígeno: blanco -> naranja -> carmesí -> violeta-magenta)
    const coronaR = Math.max(spanY * 1.05, 26) + intensity * 18;
    const coronaCX = profile.maxFrontX - Math.min(bodyDepth * 0.25, 22);
    const outerGlow = ctx.createRadialGradient(coronaCX, midY, 2, coronaCX - 8, midY, coronaR);
    outerGlow.addColorStop(0, `rgba(255, 250, 230, ${0.42 * intensity})`);
    outerGlow.addColorStop(0.28, `rgba(249, 115, 22, ${0.35 * intensity})`);
    outerGlow.addColorStop(0.58, `rgba(225, 29, 72, ${0.22 * intensity})`);
    outerGlow.addColorStop(0.84, `rgba(168, 85, 247, ${0.11 * intensity})`);
    outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(coronaCX - 4, midY, coronaR, 0, Math.PI * 2);
    ctx.fill();

    // 1B. Halo hipersónico de aire ionizado (destello azul-violeta en el frente de choque a alta intensidad)
    if (intensity > 0.42) {
        const ionAlpha = (intensity - 0.42) / 0.83;
        const ionR = Math.max(spanY * 0.72, 18) + intensity * 10;
        const ionGrad = ctx.createRadialGradient(profile.maxFrontX + standoff * 0.5, midY, 1, profile.maxFrontX - 4, midY, ionR);
        ionGrad.addColorStop(0, `rgba(224, 242, 254, ${0.32 * ionAlpha})`);
        ionGrad.addColorStop(0.45, `rgba(147, 197, 253, ${0.16 * ionAlpha})`);
        ionGrad.addColorStop(0.8, `rgba(192, 132, 252, ${0.09 * ionAlpha})`);
        ionGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = ionGrad;
        ctx.beginPath();
        ctx.arc(profile.maxFrontX, midY, ionR, 0, Math.PI * 2);
        ctx.fill();
    }

    // 2. Manto de Plasma y Onda de Choque Desprendida (abrazando el contorno real del cohete)
    const wakeTailX = profile.minBackX - wakeLen;
    const sheathGrad = ctx.createLinearGradient(profile.maxFrontX + standoff, midY, wakeTailX, midY);
    sheathGrad.addColorStop(0, `rgba(255, 255, 255, ${0.92 * intensity})`);
    sheathGrad.addColorStop(0.14, `rgba(254, 240, 138, ${0.80 * intensity})`);
    sheathGrad.addColorStop(0.42, `rgba(249, 115, 22, ${0.52 * intensity})`);
    sheathGrad.addColorStop(0.76, `rgba(225, 29, 72, ${0.22 * intensity})`);
    sheathGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = sheathGrad;
    ctx.beginPath();
    // Contorno exterior siguiendo la onda de choque suave desde ys[0] hasta ys[N-1]
    ctx.moveTo(sx[0] - standoff * 0.6, ys[0]);
    for (let i = 0; i < N - 1; i++) {
        const mx = (sx[i] + sx[i + 1]) * 0.5;
        const my = (ys[i] + ys[i + 1]) * 0.5;
        ctx.quadraticCurveTo(sx[i], ys[i], mx, my);
    }
    ctx.lineTo(sx[N - 1] - standoff * 0.6, ys[N - 1]);

    // Estela inferior expandiéndose hacia sotavento
    ctx.quadraticCurveTo(
        sx[N - 1] - wakeLen * 0.45, ys[N - 1] + wakeFlare * 0.55,
        wakeTailX, ys[N - 1] + wakeFlare
    );
    // Retorno por la cavidad interna abrazando la silueta real del fuselaje
    ctx.lineTo(wakeTailX * 0.65 + frontX[N - 1] * 0.35, ys[N - 1] + wakeFlare * 0.28);
    for (let i = N - 1; i > 0; i--) {
        const ix = frontX[i] - hugDepth;
        const nx = frontX[i - 1] - hugDepth;
        ctx.quadraticCurveTo(ix, ys[i], (ix + nx) * 0.5, (ys[i] + ys[i - 1]) * 0.5);
    }
    ctx.lineTo(wakeTailX * 0.65 + frontX[0] * 0.35, ys[0] - wakeFlare * 0.28);
    ctx.lineTo(wakeTailX, ys[0] - wakeFlare);
    ctx.quadraticCurveTo(
        sx[0] - wakeLen * 0.45, ys[0] - wakeFlare * 0.55,
        sx[0] - standoff * 0.6, ys[0]
    );
    ctx.closePath();
    ctx.fill();

    // 3. Arco Luminoso de Compresión en los Puntos de Estancamiento (doble pasada: halo térmico + núcleo de choque)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < N - 1; i++) {
        const dxSeg = sx[i + 1] - sx[i];
        const dySeg = ys[i + 1] - ys[i];
        const segLen = Math.hypot(dxSeg, dySeg) || 1;
        // Coseno de incidencia normal respecto al flujo (+X): máximo cuando el borde es perpendicular al flujo
        const normalDotFlow = Math.abs(dySeg) / segLen;
        const localHeat = clamp(Math.pow(normalDotFlow, 0.85) * intensity, 0, 1);
        if (localHeat < 0.08) continue;

        // Halo ancho naranja-dorado de compresión
        ctx.strokeStyle = `rgba(251, 146, 60, ${0.42 * localHeat})`;
        ctx.lineWidth = (4.2 + 3.4 * localHeat) * clamp(intensity, 0.5, 1.15);
        ctx.beginPath();
        ctx.moveTo(sx[i], ys[i]);
        ctx.lineTo(sx[i + 1], ys[i + 1]);
        ctx.stroke();

        // Núcleo incandescente blanco-azulado / blanco-oro de la onda de choque
        ctx.strokeStyle = intensity > 0.72
            ? `rgba(235, 248, 255, ${0.92 * localHeat})`
            : `rgba(255, 250, 224, ${0.88 * localHeat})`;
        ctx.lineWidth = (1.5 + 1.8 * localHeat) * clamp(intensity, 0.5, 1.15);
        ctx.beginPath();
        ctx.moveTo(sx[i], ys[i]);
        ctx.lineTo(sx[i + 1], ys[i + 1]);
        ctx.stroke();
    }

    // 4. Filamentos de Plasma Turbulento desprendiéndose desde los hombros reales de la silueta
    const ribbonIndices = [
        0,
        Math.floor(N * 0.14),
        Math.floor(N * 0.28),
        Math.floor(N * 0.44),
        Math.floor(N * 0.56),
        Math.floor(N * 0.72),
        Math.floor(N * 0.86),
        N - 1
    ];
    for (let k = 0; k < ribbonIndices.length; k++) {
        const idx = clamp(ribbonIndices[k], 0, N - 1);
        const startX = sx[idx] - 1.5;
        const startY = ys[idx];
        const sideDir = startY >= midY ? 1 : -1;
        const edgeRatio = Math.abs(startY - midY) / (spanY * 0.5 || 1);
        const waveY = Math.sin(timeSec * 44 + k * 1.95) * (2.4 + edgeRatio * 2.8);
        const endX = startX - wakeLen * (0.58 + 0.38 * edgeRatio);
        const endY = startY + sideDir * wakeFlare * (0.35 + 0.70 * edgeRatio) + waveY;

        const fGrad = ctx.createLinearGradient(startX, startY, endX, endY);
        fGrad.addColorStop(0, `rgba(255, 248, 196, ${0.78 * intensity})`);
        fGrad.addColorStop(0.32, `rgba(249, 115, 22, ${0.50 * intensity})`);
        fGrad.addColorStop(0.68, `rgba(225, 29, 72, ${0.26 * intensity})`);
        fGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

        ctx.strokeStyle = fGrad;
        ctx.lineWidth = 1.4 + 0.7 * intensity;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(
            (startX + endX) * 0.5,
            startY + sideDir * wakeFlare * 0.25 + waveY * 0.45,
            endX,
            endY
        );
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Indicador Táctico de Orientación del Cohete en Zoom Lejano (Screen-Space):
 * Cuando el cohete es demasiado pequeño en pantalla, dibuja un anillo localizador,
 * una flecha direccional nítida y un cartelito superior con flecha de proa.
 */
function drawRocketOrientationOverlay(timeSec) {
    if (camera.zoom >= 0.26) return;
    if (typeof astronaut !== 'undefined' && astronaut.active) return;

    const fade = clamp((0.26 - camera.zoom) / 0.10, 0, 1);
    if (fade <= 0.01) return;

    // Proyección exacta del cohete a coordenadas de pantalla
    const relX = (ship.x - camera.x) * camera.zoom;
    const relY = (ship.y - camera.y) * camera.zoom;
    const cosR = Math.cos(camera.rotation);
    const sinR = Math.sin(camera.rotation);
    const sx = screenW * 0.5 + (relX * cosR - relY * sinR);
    const sy = screenH * 0.5 + (relX * sinR + relY * cosR);

    const screenAngle = ship.angle + camera.rotation;
    const thr = ship.thrustIntensity || 0;
    const isBurning = thr > 0.05;
    const primaryCol = isBurning ? '#fb923c' : '#38bdf8';
    const primaryGlow = isBurning ? 'rgba(251, 146, 60, 0.45)' : 'rgba(56, 189, 248, 0.40)';

    ctx.save();
    ctx.globalAlpha = fade;

    // 1. Anillo localizador alrededor del cohete
    ctx.save();
    ctx.translate(sx, sy);
    ctx.strokeStyle = primaryCol;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.stroke();

    // Marcador sutil de vector velocidad (Progrado) si la nave se está moviendo
    const shipSpeed = Math.hypot(ship.vx, ship.vy);
    if (shipSpeed > 20) {
        const velScreenAngle = Math.atan2(ship.vy, ship.vx) + camera.rotation;
        const vx = Math.cos(velScreenAngle) * 14;
        const vy = Math.sin(velScreenAngle) * 14;
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(vx, vy, 2.4, 0, Math.PI * 2);
        ctx.fill();
    }

    // 2. Flecha direccional principal desde el cohete hacia donde apunta la proa
    ctx.save();
    ctx.rotate(screenAngle);

    ctx.shadowColor = primaryGlow;
    ctx.shadowBlur = 8;

    // Vástago de la flecha
    const shaftStart = 10;
    const shaftEnd = isBurning ? 34 : 30;
    const tipEnd = shaftEnd + 9;
    ctx.strokeStyle = primaryCol;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shaftStart, 0);
    ctx.lineTo(shaftEnd, 0);
    ctx.stroke();

    // Punta triangular nítida
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = primaryCol;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tipEnd, 0);
    ctx.lineTo(shaftEnd - 2, -5.2);
    ctx.lineTo(shaftEnd + 0.8, 0);
    ctx.lineTo(shaftEnd - 2, 5.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // 3. Cartelito táctico justo encima del cohete con mini-flecha y rumbo
    const pointingUp = Math.sin(screenAngle) < -0.45;
    const badgeOffsetY = pointingUp ? 54 : 38;
    const bx = clamp(sx, 58, screenW - 58);
    const by = clamp(sy - badgeOffsetY, 24, screenH - 24);

    // Rumbo en grados [0..359] relativo a la pantalla (0° = arriba/norte visual)
    const deg = ((Math.round((screenAngle * 180) / Math.PI) + 90) % 360 + 360) % 360;
    const labelText = isBurning ? `EMPUJE ${Math.round(thr * 100)}%` : `PROA ${deg}°`;

    ctx.font = '600 10px "JetBrains Mono", monospace';
    const textW = ctx.measureText(labelText).width;
    const pillW = 24 + textW + 10;
    const pillH = 22;
    const px = bx - pillW * 0.5;
    const py = by - pillH * 0.5;

    // Fondo glassmórfico del cartelito
    ctx.fillStyle = 'rgba(8, 13, 26, 0.86)';
    ctx.strokeStyle = isBurning ? 'rgba(251, 146, 60, 0.65)' : 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(px, py, pillW, pillH, 6);
    ctx.fill();
    ctx.stroke();

    // Mini-flecha rotada dentro del cartelito
    const iconX = px + 13;
    const iconY = by;
    ctx.save();
    ctx.translate(iconX, iconY);
    ctx.rotate(screenAngle);
    ctx.fillStyle = primaryCol;
    ctx.beginPath();
    ctx.moveTo(6.5, 0);
    ctx.lineTo(-4.0, -4.0);
    ctx.lineTo(-1.8, 0);
    ctx.lineTo(-4.0, 4.0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Texto de orientación
    ctx.fillStyle = '#f1f5f9';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, px + 24, by + 0.5);

    ctx.restore();
}

// Radar Perimetral Orbital y Marcadores de Rumbo HUD
function drawPerimeterRadar(planets) {
    // Si no hay rumbos fijados por el usuario desde el mapa, no dibujamos ningún indicador.
    // La pantalla de vuelo permanece 100% limpia y despejada como pidió el usuario.
    if (!window.navWaypoints || window.navWaypoints.size === 0) return;

    const cx = screenW * 0.5;
    const cy = screenH * 0.5;
    const rx = Math.min(screenW * 0.44, Math.max(260, screenW * 0.5 - 65));
    const ry = Math.min(screenH * 0.42, Math.max(200, screenH * 0.5 - 65));
    const timeSec = performance.now() * 0.001;

    for (const p of window.navWaypoints.values()) {
        const dx = p.x - ship.x;
        const dy = p.y - ship.y;
        const dist = Math.hypot(dx, dy);
        const surfaceDist = Math.max(0, dist - p.radius);

        // Vector unitario y velocidad relativa de aproximación (closing speed)
        const unitX = dist > 0.001 ? dx / dist : 0;
        const unitY = dist > 0.001 ? dy / dist : 0;
        const approachSpeed = (ship.vx * unitX + ship.vy * unitY);

        // Transformación matemática de la posición del planeta a coordenadas de pantalla (Screen Space)
        const relX = (p.x - camera.x) * camera.zoom;
        const relY = (p.y - camera.y) * camera.zoom;
        const cosR = Math.cos(camera.rotation);
        const sinR = Math.sin(camera.rotation);
        const rotX = relX * cosR - relY * sinR;
        const rotY = relX * sinR + relY * cosR;
        const screenX = cx + rotX;
        const screenY = cy + rotY;
        const planetScreenRadius = p.radius * camera.zoom;

        const margin = 40;
        const isOnScreen = (
            screenX >= margin && screenX <= screenW - margin &&
            screenY >= margin && screenY <= screenH - margin
        );

        const rimCol = (p.colors && p.colors.rimColor) || (p.archetype && p.archetype.rimColor) || [245, 158, 11];
        const markerColor = rgbStr(rimCol, 0.95);

        // Formateo de distancia (metros o kilómetros)
        const meters = Math.round(surfaceDist * 0.1);
        const distText = meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;

        if (isOnScreen) {
            // --- PLANETA VISIBLE EN PANTALLA: RETÍCULA TÁCTICA HOLOGRÁFICA CUÁNTICA ---
            ctx.save();
            ctx.translate(screenX, screenY);

            const reticleR = Math.max(planetScreenRadius + 22, 34);
            const bracketLen = Math.min(18, reticleR * 0.45);
            const pulse = 0.85 + 0.15 * Math.sin(timeSec * 4);

            ctx.strokeStyle = markerColor;
            ctx.lineWidth = 1.8;
            ctx.shadowColor = markerColor;
            ctx.shadowBlur = 10;

            // 4 esquinas de retícula táctica
            // Esquina Superior Izquierda (TL)
            ctx.beginPath();
            ctx.moveTo(-reticleR, -reticleR + bracketLen);
            ctx.lineTo(-reticleR, -reticleR);
            ctx.lineTo(-reticleR + bracketLen, -reticleR);
            ctx.stroke();

            // Esquina Superior Derecha (TR)
            ctx.beginPath();
            ctx.moveTo(reticleR - bracketLen, -reticleR);
            ctx.lineTo(reticleR, -reticleR);
            ctx.lineTo(reticleR, -reticleR + bracketLen);
            ctx.stroke();

            // Esquina Inferior Derecha (BR)
            ctx.beginPath();
            ctx.moveTo(reticleR, reticleR - bracketLen);
            ctx.lineTo(reticleR, reticleR);
            ctx.lineTo(reticleR - bracketLen, reticleR);
            ctx.stroke();

            // Esquina Inferior Izquierda (BL)
            ctx.beginPath();
            ctx.moveTo(-reticleR + bracketLen, reticleR);
            ctx.lineTo(-reticleR, reticleR);
            ctx.lineTo(-reticleR, reticleR - bracketLen);
            ctx.stroke();

            // Baliza diamante parpadeante sobre el planeta
            ctx.fillStyle = markerColor;
            ctx.beginPath();
            ctx.moveTo(0, -reticleR - 9 * pulse);
            ctx.lineTo(6 * pulse, -reticleR - 15 * pulse);
            ctx.lineTo(0, -reticleR - 21 * pulse);
            ctx.lineTo(-6 * pulse, -reticleR - 15 * pulse);
            ctx.closePath();
            ctx.fill();

            // Tipografía de destino fijado
            ctx.shadowBlur = 0;
            ctx.textAlign = 'center';
            ctx.font = '600 12px "Space Grotesk", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(p.name.toUpperCase(), 0, reticleR + 18);

            ctx.font = '500 10px "JetBrains Mono", monospace';
            ctx.fillStyle = markerColor;
            let sub = `DESTINO · ${distText}`;
            if (approachSpeed > 10) {
                const etaSec = Math.round((surfaceDist * 0.1) / (approachSpeed * 0.1));
                if (etaSec > 0 && etaSec < 999) sub += ` · ETA ${etaSec}s`;
            }
            ctx.fillText(sub, 0, reticleR + 32);

            ctx.restore();

        } else {
            // --- PLANETA FUERA DE PANTALLA: MARCADOR PERIMETRAL DE RUMBO CON FLECHA ZEN ---
            const angle = Math.atan2(rotY, rotX);
            const px = cx + Math.cos(angle) * rx;
            const py = cy + Math.sin(angle) * ry;

            ctx.save();
            ctx.translate(px, py);

            // Flecha direccional orientada exactamente al planeta
            ctx.save();
            ctx.rotate(angle);

            ctx.shadowColor = markerColor;
            ctx.shadowBlur = 12;

            ctx.fillStyle = markerColor;
            ctx.beginPath();
            ctx.moveTo(14, 0);
            ctx.lineTo(-4, -7);
            ctx.lineTo(1, 0);
            ctx.lineTo(-4, 7);
            ctx.closePath();
            ctx.fill();

            // Onda de radar sutil
            const wave = (timeSec * 3) % 1;
            ctx.strokeStyle = rgbStr(rimCol, (1 - wave) * 0.8);
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(-2, 0, 8 + wave * 14, -Math.PI * 0.6, Math.PI * 0.6);
            ctx.stroke();

            ctx.restore();

            // Pastilla de telemetría flotante junto a la flecha
            ctx.shadowBlur = 0;
            ctx.textAlign = 'center';

            const textY = py > cy ? -22 : 22;
            const label = p.name.toUpperCase();

            ctx.font = '600 10.5px "Space Grotesk", sans-serif';
            const nameW = ctx.measureText(label).width;
            ctx.font = '500 9.5px "JetBrains Mono", monospace';
            const distW = ctx.measureText(distText).width;
            const pillW = Math.max(nameW, distW) + 20;
            const pillH = 30;

            ctx.fillStyle = 'rgba(6, 10, 20, 0.88)';
            ctx.strokeStyle = markerColor;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(-pillW * 0.5, textY - 14, pillW, pillH, 8);
            } else {
                ctx.rect(-pillW * 0.5, textY - 14, pillW, pillH);
            }
            ctx.fill();
            ctx.stroke();

            // Texto con Nombre y Distancia precisa
            ctx.fillStyle = '#f8fafc';
            ctx.font = '600 10px "Space Grotesk", sans-serif';
            ctx.fillText(label, 0, textY - 1);

            ctx.fillStyle = markerColor;
            ctx.font = '500 9px "JetBrains Mono", monospace';
            ctx.fillText(distText, 0, textY + 11);

            ctx.restore();
        }
    }
}
