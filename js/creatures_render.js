/**
 * ÉTER — Motor de Renderizado y Cinemática Procedural de Fauna Extraterrestre
 * 40 morfologías exclusivas diseñadas con siluetas estilizadas de autor,
 * cinemática inversa (IK) de 2 huesos, deformación elástica (squash & stretch),
 * colas/tentáculos multi-segmento, iluminación bioluminiscente y telegráfos de combate.
 */

// --- UTILIDADES DE GEOMETRÍA, COLOR Y CINEMÁTICA INVERSA (IK) ---

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

function adjustHexBrightness(hex, factor) {
    if (!hex || hex[0] !== '#' || (hex.length !== 7 && hex.length !== 4)) return hex;
    let r, g, b;
    if (hex.length === 7) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    } else {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    }
    r = Math.max(0, Math.min(255, Math.round(r * factor)));
    g = Math.max(0, Math.min(255, Math.round(g * factor)));
    b = Math.max(0, Math.min(255, Math.round(b * factor)));
    return `rgb(${r},${g},${b})`;
}

/**
 * Cinemática Inversa (IK) analítica de 2 segmentos: devuelve la articulación intermedia (rodilla/codo)
 * bendDir: +1 o -1 según hacia dónde dobla la articulación (rodilla adelante vs corvejón atrás)
 */
function solveIK2(hx, hy, fx, fy, l1, l2, bendDir = 1) {
    const dx = fx - hx;
    const dy = fy - hy;
    const dRaw = Math.hypot(dx, dy);
    const maxD = Math.max(0.001, l1 + l2 - 0.05);
    const minD = Math.abs(l1 - l2) + 0.05;
    const d = Math.max(minD, Math.min(maxD, dRaw));
    const baseAngle = Math.atan2(dy, dx);
    const cosA = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
    const a = Math.acos(cosA);
    const jointAngle = baseAngle + bendDir * a;
    return {
        jx: hx + Math.cos(jointAngle) * l1,
        jy: hy + Math.sin(jointAngle) * l1,
        ex: hx + (dx / (dRaw || 1)) * d,
        ey: hy + (dy / (dRaw || 1)) * d
    };
}

/**
 * Dibuja una pata articulada ahusada de 2 segmentos con pezuña o garra opcional
 */
function drawArticulatedLeg(c, hx, hy, fx, fy, l1, l2, bendDir, w1, w2, color, footType = 'hoof', accentColor = null) {
    const ik = solveIK2(hx, hy, fx, fy, l1, l2, bendDir);
    c.strokeStyle = color;
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // Muslo
    c.lineWidth = w1;
    c.beginPath();
    c.moveTo(hx, hy);
    c.lineTo(ik.jx, ik.jy);
    c.stroke();

    // Pantorrilla / caña
    c.lineWidth = w2;
    c.beginPath();
    c.moveTo(ik.jx, ik.jy);
    c.lineTo(ik.ex, ik.ey);
    c.stroke();

    // Detalle de pie
    if (footType === 'claw') {
        c.strokeStyle = accentColor || color;
        c.lineWidth = Math.max(0.8, w2 * 0.65);
        c.beginPath();
        c.moveTo(ik.ex, ik.ey);
        c.lineTo(ik.ex + w2 * 1.4, ik.ey + w2 * 0.2);
        c.moveTo(ik.ex, ik.ey);
        c.lineTo(ik.ex - w2 * 0.6, ik.ey + w2 * 0.2);
        c.stroke();
    } else if (footType === 'hoof' && accentColor) {
        c.fillStyle = accentColor;
        c.beginPath();
        c.arc(ik.ex, ik.ey, w2 * 0.65, 0, Math.PI * 2);
        c.fill();
    }
    return ik;
}

/**
 * Calcula desplazamiento de paso con arco de elevación al levantar la pata
 */
function calcStepTarget(baseX, groundY, phase, strideX, liftY, isAirborne) {
    if (isAirborne) {
        return { x: baseX - strideX * 0.35, y: groundY - liftY * 0.7 };
    }
    const s = Math.sin(phase);
    const c = Math.cos(phase);
    const lift = c > 0 ? c * liftY : 0;
    return {
        x: baseX + s * strideX,
        y: groundY - lift
    };
}

/**
 * Dibuja un ojo expresivo con parpadeo y seguimiento de pupila hacia el objetivo
 */
function drawCreatureEye(c, x, y, r, cr, pal, glow = true) {
    const isBlinking = (cr.blinkTimer < 0.13 && cr.aiState !== 'CHASE' && cr.aiState !== 'ATTACK' && cr.aiState !== 'TELEGRAPH');
    const isAggro = (cr.aiState === 'CHASE' || cr.aiState === 'ATTACK' || cr.aiState === 'TELEGRAPH' || cr.isEnraged || cr.alertTimer > 0);
    const eyeCol = isAggro ? (cr.isEnraged ? '#ff2a55' : '#ef4444') : pal.eye;

    if (isBlinking) {
        c.strokeStyle = eyeCol;
        c.lineWidth = Math.max(0.8, r * 0.55);
        c.beginPath();
        c.moveTo(x - r, y);
        c.lineTo(x + r, y);
        c.stroke();
        return;
    }

    if (glow) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(x, y, 0, x, y, r * 2.8);
        g.addColorStop(0, eyeCol);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r * 2.8, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }

    c.fillStyle = eyeCol;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();

    // Pupila direccional sutil
    const look = cr.eyeLookAngle || 0;
    c.fillStyle = '#09090b';
    c.beginPath();
    c.arc(x + Math.cos(look) * r * 0.25, y + Math.sin(look) * r * 0.2, r * 0.36, 0, Math.PI * 2);
    c.fill();
}

/**
 * Dibuja una cadena fluida/cola/látigo sinusoidal de N segmentos ahusados
 */
function drawFluidChain(c, x0, y0, count, segLen, baseAngle, amp, freq, phase, wStart, wEnd, color, tipGlowColor = null) {
    let px = x0;
    let py = y0;
    let curAng = baseAngle;
    c.lineCap = 'round';
    for (let i = 0; i < count; i++) {
        const t = i / count;
        const wave = Math.sin(phase - i * freq) * amp * (0.4 + t * 0.85);
        curAng = baseAngle + wave;
        const nx = px + Math.cos(curAng) * segLen;
        const ny = py + Math.sin(curAng) * segLen;
        c.strokeStyle = color;
        c.lineWidth = wStart + (wEnd - wStart) * t;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(nx, ny);
        c.stroke();
        px = nx;
        py = ny;
    }
    if (tipGlowColor) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = tipGlowColor;
        c.beginPath();
        c.arc(px, py, Math.max(1.2, wEnd * 1.9), 0, Math.PI * 2);
        c.fill();
        c.restore();
    }
    return { x: px, y: py };
}

/**
 * Efecto de destello de daño/telegráfo sin usar ctx.filter (60fps limpio)
 */
function drawCreatureFlashAura(c, cr, sc) {
    if (cr.flashTimer > 0) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        const alpha = Math.min(0.75, cr.flashTimer * 4.5);
        const col = cr.burnTimer > 0 ? `rgba(255, 130, 30, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
        const r = 15 * sc;
        const g = c.createRadialGradient(0, -6 * sc, 1, 0, -6 * sc, r);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, -6 * sc, r, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }
    if (cr.aiState === 'TELEGRAPH' || cr.isEnraged) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        const pulse = cr.aiState === 'TELEGRAPH' ? 0.55 : 0.25;
        const r = (cr.aiState === 'TELEGRAPH' ? 18 : 22) * sc;
        const g = c.createRadialGradient(0, -6 * sc, 1, 0, -6 * sc, r);
        g.addColorStop(0, `rgba(239, 68, 68, ${pulse})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, -6 * sc, r, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }
}

// =========================================================================
// DISPATCHER PRINCIPAL DE LAS 40 MORFOLOGÍAS EXCLUSIVAS
// =========================================================================

function drawCreatureByType(c, cr, timeSec) {
    // Aplicar deformación elástica (squash & stretch) e inclinación cinemática
    const sqX = cr.squashX || 1.0;
    const sqY = cr.squashY || 1.0;
    const pitch = cr.pitchAngle || 0;

    c.save();
    if (pitch !== 0) c.rotate(pitch);
    if (sqX !== 1.0 || sqY !== 1.0) c.scale(sqX, sqY);

    switch (cr.renderType) {
        // 1. TERRESTRIAL
        case 'terra_stag': drawTerraStag(c, cr, timeSec); break;
        case 'terra_hummingbird': drawTerraHummingbird(c, cr, timeSec); break;
        case 'terra_boar': drawTerraBoar(c, cr, timeSec); break;
        case 'terra_alpha_wolf': drawTerraAlphaWolf(c, cr, timeSec); break;
        // 2. OCEANIC
        case 'ocean_manta': drawOceanManta(c, cr, timeSec); break;
        case 'ocean_jelly_crown': drawOceanJellyCrown(c, cr, timeSec); break;
        case 'ocean_leviathan_eel': drawOceanLeviathanEel(c, cr, timeSec); break;
        // 3. DESERT
        case 'desert_jerboa': drawDesertJerboa(c, cr, timeSec); break;
        case 'desert_tortoise_titan': drawDesertTortoiseTitan(c, cr, timeSec); break;
        case 'desert_scorpion': drawDesertScorpion(c, cr, timeSec); break;
        case 'desert_sandwyrm': drawDesertSandwyrm(c, cr, timeSec); break;
        // 4. CRYOGENIC
        case 'cryo_fox': drawCryoFox(c, cr, timeSec); break;
        case 'cryo_mammoth': drawCryoMammoth(c, cr, timeSec); break;
        case 'cryo_wraith': drawCryoWraith(c, cr, timeSec); break;
        // 5. VOLCANIC
        case 'volc_ember_beetle': drawVolcEmberBeetle(c, cr, timeSec); break;
        case 'volc_magma_golem': drawVolcMagmaGolem(c, cr, timeSec); break;
        case 'volc_firedrake': drawVolcFiredrake(c, cr, timeSec); break;
        // 6. TOXIC
        case 'toxic_hopper': drawToxicHopper(c, cr, timeSec); break;
        case 'toxic_slug_tank': drawToxicSlugTank(c, cr, timeSec); break;
        case 'toxic_mantis_apex': drawToxicMantisApex(c, cr, timeSec); break;
        // 7. HOLLOW
        case 'hollow_lantern_moth': drawHollowLanternMoth(c, cr, timeSec); break;
        case 'hollow_echobat': drawHollowEchobat(c, cr, timeSec); break;
        case 'hollow_ceiling_weaver': drawHollowCeilingWeaver(c, cr, timeSec); break;
        case 'hollow_abyss_hydra': drawHollowAbyssHydra(c, cr, timeSec); break;
        // 8. SHATTERED
        case 'shattered_cloud_sprite': drawShatteredCloudSprite(c, cr, timeSec); break;
        case 'shattered_island_hopper': drawShatteredIslandHopper(c, cr, timeSec); break;
        case 'shattered_sky_condor': drawShatteredSkyCondor(c, cr, timeSec); break;
        // 9. LIVING
        case 'living_coral_walker': drawLivingCoralWalker(c, cr, timeSec); break;
        case 'living_spore_flea': drawLivingSporeFlea(c, cr, timeSec); break;
        case 'living_mycelial_brute': drawLivingMycelialBrute(c, cr, timeSec); break;
        case 'living_hive_queen': drawLivingHiveQueen(c, cr, timeSec); break;
        // 10. TEMPORAL
        case 'temp_volt_hound': drawTempVoltHound(c, cr, timeSec); break;
        case 'temp_phase_titan': drawTempPhaseTitan(c, cr, timeSec); break;
        case 'temp_storm_phoenix': drawTempStormPhoenix(c, cr, timeSec); break;
        // 11. ANOMALY
        case 'anom_seraph_poly': drawAnomSeraphPoly(c, cr, timeSec); break;
        case 'anom_rift_stalker': drawAnomRiftStalker(c, cr, timeSec); break;
        case 'anom_oracle_eye': drawAnomOracleEye(c, cr, timeSec); break;
        // 12. ARTIFICIAL
        case 'art_repair_bot': drawArtRepairBot(c, cr, timeSec); break;
        case 'art_hunter_drone': drawArtHunterDrone(c, cr, timeSec); break;
        case 'art_siege_mech': drawArtSiegeMech(c, cr, timeSec); break;
        default: drawTerraStag(c, cr, timeSec); break;
    }

    drawCreatureFlashAura(c, cr, cr.scale || 1.0);
    c.restore();
}

// =========================================================================
// 1. TERRESTRIAL
// =========================================================================

function drawTerraStag(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const moving = Math.abs(cr.vTangential) > 0.4;
    const air = cr.isAirborne;
    const dark = adjustHexBrightness(pal.body, 0.58);
    const bob = air ? -1.5 * sc : (moving ? Math.abs(Math.sin(ph * 2)) * 1.4 * sc : Math.sin(timeSec * 2.2) * 0.35 * sc);
    const graze = (!moving && !air && cr.aiState === 'GRAZE') ? Math.sin(timeSec * 2.6) * 0.5 + 0.5 : 0;

    // Patas traseras (fondo)
    const bR = calcStepTarget(-6.0 * sc, 0, ph + Math.PI, 4.4 * sc, 2.8 * sc, air);
    const fR = calcStepTarget(5.2 * sc, 0, ph + 0.4, 4.4 * sc, 2.8 * sc, air);
    drawArticulatedLeg(c, -5.6 * sc, -6.5 * sc + bob, bR.x, bR.y, 4.0 * sc, 4.2 * sc, -1, 1.5 * sc, 0.9 * sc, dark, 'hoof', pal.accent);
    drawArticulatedLeg(c, 5.2 * sc, -6.5 * sc + bob, fR.x, fR.y, 3.8 * sc, 4.2 * sc, 1, 1.4 * sc, 0.9 * sc, dark, 'hoof', pal.accent);

    // Cola plumosa ondulante
    drawFluidChain(c, -7.8 * sc, -8.5 * sc + bob, 4, 2.1 * sc, -2.5, 0.28, 0.9, timeSec * 5 + ph, 1.8 * sc, 0.5 * sc, pal.accent, pal.horn);

    // Torso estilizado con grupa arqueada y pecho
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(-7.8 * sc, -6.8 * sc + bob);
    c.bezierCurveTo(-8.5 * sc, -11.2 * sc + bob, -2.5 * sc, -11.4 * sc + bob, 1.0 * sc, -10.2 * sc + bob);
    c.bezierCurveTo(4.0 * sc, -9.8 * sc + bob, 7.2 * sc, -10.8 * sc + bob, 6.8 * sc, -6.2 * sc + bob);
    c.quadraticCurveTo(0, -4.5 * sc + bob, -7.8 * sc, -6.8 * sc + bob);
    c.closePath();
    c.fill();

    // Franja dorsal luminosa
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.0 * sc;
    c.beginPath();
    c.moveTo(-7.0 * sc, -9.8 * sc + bob);
    c.quadraticCurveTo(0, -10.2 * sc + bob, 5.5 * sc, -9.8 * sc + bob);
    c.stroke();

    // Cuello esbelto y cabeza (baja al pastar)
    const hx = (9.6 + graze * 2.8) * sc;
    const hy = (-16.2 + graze * 10.5) * sc + bob * 0.7;
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(4.2 * sc, -9.6 * sc + bob);
    c.quadraticCurveTo(6.2 * sc, -13.5 * sc + bob, hx - 1.2 * sc, hy + 0.5 * sc);
    c.lineTo(hx + 1.8 * sc, hy + 1.2 * sc);
    c.quadraticCurveTo(7.4 * sc, -10.5 * sc + bob, 6.2 * sc, -6.4 * sc + bob);
    c.closePath();
    c.fill();

    // Cabeza fina
    c.beginPath();
    c.moveTo(hx - 1.8 * sc, hy - 0.6 * sc);
    c.lineTo(hx + 4.4 * sc, hy + 1.0 * sc);
    c.lineTo(hx + 3.8 * sc, hy + 2.0 * sc);
    c.lineTo(hx - 0.8 * sc, hy + 1.8 * sc);
    c.closePath();
    c.fill();

    // Oreja móvil
    const earAng = Math.sin(timeSec * 3.1) * 0.18;
    c.save();
    c.translate(hx - 1.2 * sc, hy - 0.5 * sc);
    c.rotate(earAng);
    c.fillStyle = pal.secondary || pal.body;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-2.8 * sc, -2.5 * sc);
    c.lineTo(-0.5 * sc, -1.5 * sc);
    c.closePath();
    c.fill();
    c.restore();

    // Astas ramificadas de cristal brillante
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.15 * sc;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(hx - 0.2 * sc, hy - 1.0 * sc);
    c.quadraticCurveTo(hx - 2.0 * sc, hy - 5.2 * sc, hx + 0.8 * sc, hy - 8.6 * sc);
    c.moveTo(hx - 0.8 * sc, hy - 4.2 * sc);
    c.lineTo(hx - 3.6 * sc, hy - 6.6 * sc);
    c.moveTo(hx - 0.3 * sc, hy - 6.2 * sc);
    c.lineTo(hx + 2.5 * sc, hy - 7.8 * sc);
    c.stroke();

    drawCreatureEye(c, hx + 1.5 * sc, hy + 0.3 * sc, 0.85 * sc, cr, pal);

    // Patas primer plano
    const bL = calcStepTarget(-6.5 * sc, 0, ph, 4.4 * sc, 2.8 * sc, air);
    const fL = calcStepTarget(4.5 * sc, 0, ph + Math.PI + 0.4, 4.4 * sc, 2.8 * sc, air);
    drawArticulatedLeg(c, -6.2 * sc, -6.5 * sc + bob, bL.x, bL.y, 4.0 * sc, 4.2 * sc, -1, 1.6 * sc, 0.95 * sc, pal.body, 'hoof', pal.horn);
    drawArticulatedLeg(c, 4.5 * sc, -6.5 * sc + bob, fL.x, fL.y, 3.8 * sc, 4.2 * sc, 1, 1.5 * sc, 0.95 * sc, pal.body, 'hoof', pal.horn);
}

function drawTerraHummingbird(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const hover = Math.sin(timeSec * 4.5) * 1.8 * sc;
    const wingFlap = Math.sin(cr.flapCycle * 3.2);
    const wingFlap2 = Math.cos(cr.flapCycle * 3.2);

    c.save();
    c.translate(0, hover);

    // Estela de polen benévolo
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
        const px = (-6 - i * 3.5) * sc;
        const py = Math.sin(timeSec * 6 + i * 1.3) * 2.2 * sc;
        c.fillStyle = pal.glow;
        c.beginPath();
        c.arc(px, py, (1.4 - i * 0.25) * sc, 0, Math.PI * 2);
        c.fill();
    }
    c.restore();

    // Ala trasera translúcida (figura-8)
    c.save();
    c.fillStyle = pal.glow;
    c.beginPath();
    c.moveTo(-1 * sc, -1.5 * sc);
    c.quadraticCurveTo(-5 * sc, (-9 - wingFlap2 * 5) * sc, -10 * sc, (-5 - wingFlap2 * 4) * sc);
    c.quadraticCurveTo(-4 * sc, -1 * sc, -1 * sc, -1.5 * sc);
    c.fill();
    c.restore();

    // Colas de cinta larga
    drawFluidChain(c, -4.5 * sc, 0.5 * sc, 5, 2.4 * sc, Math.PI + 0.15, 0.22, 0.8, timeSec * 8, 1.2 * sc, 0.3 * sc, pal.accent, pal.horn);

    // Cuerpo aerodinámico
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, 0, 5.2 * sc, 2.4 * sc, -0.18, 0, Math.PI * 2);
    c.fill();

    // Pecho iridiscente
    c.fillStyle = pal.accent;
    c.beginPath();
    c.ellipse(2.2 * sc, 0.5 * sc, 2.5 * sc, 1.4 * sc, -0.2, 0, Math.PI * 2);
    c.fill();

    // Cabeza y pico fino luminoso
    c.fillStyle = pal.body;
    c.beginPath();
    c.arc(4.8 * sc, -1.8 * sc, 2.2 * sc, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.1 * sc;
    c.beginPath();
    c.moveTo(6.5 * sc, -1.8 * sc);
    c.lineTo(12.0 * sc, -2.0 * sc);
    c.stroke();

    // Ala frontal rápida con desenfoque de velocidad
    c.fillStyle = pal.accent;
    c.globalAlpha = 0.85;
    c.beginPath();
    c.moveTo(0.5 * sc, -1.5 * sc);
    c.quadraticCurveTo(-3 * sc, (-11 - wingFlap * 6) * sc, -9 * sc, (-7 - wingFlap * 5) * sc);
    c.quadraticCurveTo(-3 * sc, -0.5 * sc, 0.5 * sc, -1.5 * sc);
    c.fill();
    c.globalAlpha = 1.0;

    drawCreatureEye(c, 5.4 * sc, -2.1 * sc, 0.75 * sc, cr, pal);
    c.restore();
}

function drawTerraBoar(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const moving = Math.abs(cr.vTangential) > 0.25;
    const dark = adjustHexBrightness(pal.body, 0.6);
    const bob = moving ? Math.abs(Math.sin(ph * 2)) * 0.9 * sc : Math.sin(timeSec * 1.8) * 0.4 * sc;

    // Patas traseras fondo
    const bR = calcStepTarget(-6.5 * sc, 0, ph + Math.PI, 2.8 * sc, 1.6 * sc, false);
    const fR = calcStepTarget(5.5 * sc, 0, ph, 2.8 * sc, 1.6 * sc, false);
    drawArticulatedLeg(c, -6.2 * sc, -5.0 * sc + bob, bR.x, bR.y, 3.2 * sc, 2.8 * sc, -1, 2.6 * sc, 1.8 * sc, dark, 'hoof', pal.horn);
    drawArticulatedLeg(c, 5.5 * sc, -5.0 * sc + bob, fR.x, fR.y, 3.2 * sc, 2.8 * sc, 1, 2.6 * sc, 1.8 * sc, dark, 'hoof', pal.horn);

    // Cuerpo acorazado pesado
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -7.8 * sc + bob, 9.5 * sc, 5.6 * sc, 0.05, 0, Math.PI * 2);
    c.fill();

    // Placas dorsales de corteza petrificada
    c.fillStyle = pal.secondary;
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.1 * sc;
    for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo((i * 4.5 - 2.6) * sc, -11.5 * sc + bob);
        c.lineTo((i * 4.5) * sc, -14.5 * sc + bob);
        c.lineTo((i * 4.5 + 2.8) * sc, -11.2 * sc + bob);
        c.lineTo((i * 4.5 + 1.8) * sc, -7.8 * sc + bob);
        c.lineTo((i * 4.5 - 1.8) * sc, -7.8 * sc + bob);
        c.closePath();
        c.fill();
        c.stroke();
    }

    // Cabeza maciza baja de ariete
    const chargeDrop = cr.aiState === 'CHASE' || cr.aiState === 'TELEGRAPH' ? 1.8 * sc : 0;
    const hx = 9.5 * sc;
    const hy = -6.8 * sc + bob + chargeDrop;
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(5.0 * sc, -11.0 * sc + bob);
    c.lineTo(hx + 4.8 * sc, hy + 1.5 * sc);
    c.lineTo(hx + 3.5 * sc, hy + 3.8 * sc);
    c.lineTo(5.5 * sc, -4.0 * sc + bob);
    c.closePath();
    c.fill();

    // Colmillos curvos enormes
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.8 * sc;
    c.beginPath();
    c.moveTo(hx + 2.5 * sc, hy + 2.5 * sc);
    c.quadraticCurveTo(hx + 6.8 * sc, hy + 2.0 * sc, hx + 5.2 * sc, hy - 3.8 * sc);
    c.stroke();

    drawCreatureEye(c, hx + 0.5 * sc, hy - 0.5 * sc, 1.0 * sc, cr, pal);

    // Patas primer plano
    const bL = calcStepTarget(-7.2 * sc, 0, ph, 2.8 * sc, 1.6 * sc, false);
    const fL = calcStepTarget(4.8 * sc, 0, ph + Math.PI, 2.8 * sc, 1.6 * sc, false);
    drawArticulatedLeg(c, -7.0 * sc, -5.0 * sc + bob, bL.x, bL.y, 3.2 * sc, 2.8 * sc, -1, 2.8 * sc, 1.9 * sc, pal.body, 'hoof', pal.horn);
    drawArticulatedLeg(c, 4.8 * sc, -5.0 * sc + bob, fL.x, fL.y, 3.2 * sc, 2.8 * sc, 1, 2.8 * sc, 1.9 * sc, pal.body, 'hoof', pal.horn);
}

function drawTerraAlphaWolf(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const moving = Math.abs(cr.vTangential) > 0.4;
    const air = cr.isAirborne;
    const dark = adjustHexBrightness(pal.body, 0.55);
    const crouch = cr.aiState === 'TELEGRAPH' ? 2.4 * sc : 0;
    const bob = (air ? -1.5 * sc : (moving ? Math.abs(Math.sin(ph * 2)) * 1.5 * sc : Math.sin(timeSec * 2.8) * 0.4 * sc)) + crouch;

    // Patas fondo
    const bR = calcStepTarget(-6.5 * sc, 0, ph + Math.PI, 5.0 * sc, 3.0 * sc, air);
    const fR = calcStepTarget(5.5 * sc, 0, ph + 0.3, 5.0 * sc, 3.0 * sc, air);
    drawArticulatedLeg(c, -6.0 * sc, -6.2 * sc + bob, bR.x, bR.y, 4.2 * sc, 4.0 * sc, -1, 1.9 * sc, 1.1 * sc, dark, 'claw', pal.accent);
    drawArticulatedLeg(c, 5.5 * sc, -6.2 * sc + bob, fR.x, fR.y, 4.0 * sc, 3.8 * sc, 1, 1.8 * sc, 1.1 * sc, dark, 'claw', pal.accent);

    // Cola bífida en látigo
    drawFluidChain(c, -8.0 * sc, -7.8 * sc + bob, 5, 2.3 * sc, -2.7, 0.3, 0.85, timeSec * 7 + ph, 1.8 * sc, 0.4 * sc, pal.body, pal.accent);

    // Torso muscular ágil
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(-8.2 * sc, -6.2 * sc + bob);
    c.quadraticCurveTo(-5.0 * sc, -10.5 * sc + bob, 0.5 * sc, -9.2 * sc + bob);
    c.quadraticCurveTo(5.5 * sc, -11.0 * sc + bob, 7.2 * sc, -7.2 * sc + bob);
    c.quadraticCurveTo(3.0 * sc, -4.5 * sc + bob, -8.2 * sc, -6.2 * sc + bob);
    c.closePath();
    c.fill();

    // Melena espinosa luminosa
    c.fillStyle = pal.accent;
    for (let i = 0; i < 4; i++) {
        const sx = (2.0 + i * 1.6) * sc;
        const sy = (-9.5 - (i % 2) * 0.5) * sc + bob;
        c.beginPath();
        c.moveTo(sx - 1.0 * sc, sy + 1.0 * sc);
        c.lineTo(sx - 1.8 * sc, sy - 3.2 * sc);
        c.lineTo(sx + 1.0 * sc, sy + 0.5 * sc);
        c.closePath();
        c.fill();
    }

    // Cabeza con mandíbula articulada (se abre al atacar/cazar)
    const jawOpen = (cr.aiState === 'ATTACK' || cr.aiState === 'TELEGRAPH' || cr.aiState === 'CHASE') ? 0.42 : 0.06;
    const hx = 9.0 * sc;
    const hy = -9.8 * sc + bob;
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(hx - 2.0 * sc, hy - 2.0 * sc);
    c.lineTo(hx + 5.2 * sc, hy - 0.5 * sc);
    c.lineTo(hx + 3.5 * sc, hy + 0.8 * sc);
    c.lineTo(hx - 1.0 * sc, hy + 1.0 * sc);
    c.closePath();
    c.fill();

    // Mandíbula inferior
    c.save();
    c.translate(hx - 0.5 * sc, hy + 0.8 * sc);
    c.rotate(jawOpen);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(4.2 * sc, 0.6 * sc);
    c.lineTo(0.2 * sc, 1.4 * sc);
    c.closePath();
    c.fill();
    c.restore();

    // Oreja puntiaguda
    c.fillStyle = pal.secondary;
    c.beginPath();
    c.moveTo(hx - 1.0 * sc, hy - 1.8 * sc);
    c.lineTo(hx - 2.5 * sc, hy - 5.2 * sc);
    c.lineTo(hx + 0.5 * sc, hy - 1.8 * sc);
    c.closePath();
    c.fill();

    drawCreatureEye(c, hx + 1.5 * sc, hy - 0.8 * sc, 0.9 * sc, cr, pal);

    // Patas primer plano
    const bL = calcStepTarget(-7.2 * sc, 0, ph, 5.0 * sc, 3.0 * sc, air);
    const fL = calcStepTarget(4.8 * sc, 0, ph + Math.PI + 0.3, 5.0 * sc, 3.0 * sc, air);
    drawArticulatedLeg(c, -6.8 * sc, -6.2 * sc + bob, bL.x, bL.y, 4.2 * sc, 4.0 * sc, -1, 2.0 * sc, 1.15 * sc, pal.body, 'claw', pal.horn);
    drawArticulatedLeg(c, 4.8 * sc, -6.2 * sc + bob, fL.x, fL.y, 4.0 * sc, 3.8 * sc, 1, 1.9 * sc, 1.15 * sc, pal.body, 'claw', pal.horn);
}

// =========================================================================
// 2. OCEANIC
// =========================================================================

function drawOceanManta(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const wing = Math.sin(cr.flapCycle * 1.8);
    const wTipY = (-10 - wing * 7.5) * sc;

    // Dos colas de cinta largas
    drawFluidChain(c, -8 * sc, 0.5 * sc, 6, 3.2 * sc, Math.PI + 0.08, 0.2, 0.75, timeSec * 4 + cr.flapCycle, 1.3 * sc, 0.3 * sc, pal.accent, pal.horn);
    drawFluidChain(c, -8 * sc, -0.5 * sc, 5, 2.8 * sc, Math.PI - 0.12, 0.22, 0.85, timeSec * 4.3, 1.0 * sc, 0.25 * sc, pal.horn, null);

    // Ala trasera suave
    c.fillStyle = adjustHexBrightness(pal.body, 0.72);
    c.beginPath();
    c.moveTo(6 * sc, 0);
    c.quadraticCurveTo(0, wTipY * 0.65, -9 * sc, wTipY * 0.55);
    c.quadraticCurveTo(-4 * sc, 0, 6 * sc, 0);
    c.fill();

    // Cuerpo romboidal de manta
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(11 * sc, 0);
    c.quadraticCurveTo(4 * sc, -4 * sc, -9 * sc, 0);
    c.quadraticCurveTo(4 * sc, 4 * sc, 11 * sc, 0);
    c.fill();

    // Ala pectoral frontal sinuosa
    c.fillStyle = pal.secondary;
    c.beginPath();
    c.moveTo(7 * sc, 0);
    c.bezierCurveTo(2 * sc, wTipY * 0.5, -3 * sc, wTipY * 1.15, -10 * sc, wTipY);
    c.quadraticCurveTo(-5 * sc, wTipY * 0.2, -6 * sc, 1.0 * sc);
    c.closePath();
    c.fill();

    // Filo luminoso del ala
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.3 * sc;
    c.beginPath();
    c.moveTo(7 * sc, 0);
    c.bezierCurveTo(2 * sc, wTipY * 0.5, -3 * sc, wTipY * 1.15, -10 * sc, wTipY);
    c.stroke();

    // Branquias luminosas
    c.strokeStyle = pal.horn;
    c.lineWidth = 0.9 * sc;
    for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo((1 - i * 2) * sc, 1.0 * sc);
        c.lineTo((0 - i * 2) * sc, 2.4 * sc);
        c.stroke();
    }

    // Lóbulos cefálicos frontales
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.4 * sc;
    c.beginPath();
    c.moveTo(9 * sc, -1.0 * sc);
    c.quadraticCurveTo(13 * sc, -2.5 * sc, 14 * sc, -0.8 * sc);
    c.stroke();

    drawCreatureEye(c, 7.2 * sc, -1.2 * sc, 0.95 * sc, cr, pal);
}

function drawOceanJellyCrown(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const pulse = Math.sin(cr.tentaclePhase * 1.5) * 0.16 + 1.0;

    // Tentáculos largos eléctricos
    for (let t = -2; t <= 2; t++) {
        const x0 = t * 2.3 * sc;
        drawFluidChain(c, x0, 0, 5, 3.3 * sc, Math.PI * 0.5, 0.25, 0.85, cr.tentaclePhase + t * 0.9, 1.3 * sc, 0.35 * sc, pal.accent, pal.eye);
    }

    // Campana exterior translúcida
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -2.5 * sc, 8.8 * sc * pulse, 7.2 * sc * (2.05 - pulse), 0, Math.PI, 0);
    c.closePath();
    c.fill();

    // Anillo corona brillante
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.5 * sc;
    c.beginPath();
    c.ellipse(0, -2.5 * sc, 8.8 * sc * pulse, 2.2 * sc, 0, 0, Math.PI * 2);
    c.stroke();

    // Puntas corona superiores
    c.fillStyle = pal.horn;
    for (let i = -2; i <= 2; i++) {
        const cx = i * 2.8 * sc * pulse;
        const cy = (-6.8 + Math.abs(i) * 0.9) * sc * (2.05 - pulse);
        c.beginPath();
        c.arc(cx, cy, 0.9 * sc, 0, Math.PI * 2);
        c.fill();
    }

    // Núcleo bioeléctrico
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = pal.glow;
    c.beginPath();
    c.arc(0, -4.5 * sc, 3.6 * sc * pulse, 0, Math.PI * 2);
    c.fill();
    c.restore();
}

function drawOceanLeviathanEel(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const segs = 12;
    const spd = Math.abs(cr.vTangential) > 0.5 ? 7.5 : 4.2;

    // Aleta dorsal eléctrica continua
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.4 * sc;
    c.beginPath();
    for (let i = segs - 1; i >= 0; i--) {
        const w = Math.sin(timeSec * spd - i * 0.55) * 3.4 * sc;
        const sx = (5 - i) * 3.2 * sc;
        const sy = w - (3.6 - i * 0.2) * sc;
        if (i === segs - 1) c.moveTo(sx, sy);
        else c.lineTo(sx, sy);
    }
    c.stroke();

    // Segmentos corporales blindados
    for (let i = segs - 1; i >= 0; i--) {
        const frac = 1 - i / segs;
        const w = Math.sin(timeSec * spd - i * 0.55) * 3.4 * sc;
        const sx = (5 - i) * 3.2 * sc;
        const rad = (1.8 + frac * 2.8) * sc;

        c.fillStyle = (i % 2 === 0) ? pal.body : pal.secondary;
        c.beginPath();
        c.ellipse(sx, w, rad * 1.15, rad * 0.8, 0, 0, Math.PI * 2);
        c.fill();

        // Nodos eléctricos laterales
        c.fillStyle = pal.accent;
        c.beginPath();
        c.arc(sx, w, rad * 0.35, 0, Math.PI * 2);
        c.fill();
    }

    // Cabeza feroz con fauces articuladas
    const hw = Math.sin(timeSec * spd) * 3.4 * sc;
    const hx = 5 * 3.2 * sc;
    const jaw = (cr.aiState === 'ATTACK' || cr.aiState === 'TELEGRAPH' || cr.aiState === 'CHASE') ? 0.38 : 0.08;

    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(hx - 1 * sc, hw - 3.2 * sc);
    c.lineTo(hx + 7.5 * sc, hw - 0.8 * sc);
    c.lineTo(hx + 2.0 * sc, hw + 0.5 * sc);
    c.closePath();
    c.fill();

    // Mandíbula inferior con colmillo
    c.save();
    c.translate(hx, hw + 0.5 * sc);
    c.rotate(jaw);
    c.fillStyle = pal.secondary;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(6.5 * sc, 0.8 * sc);
    c.lineTo(0, 2.2 * sc);
    c.closePath();
    c.fill();
    c.restore();

    // Bigotes arpones
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.2 * sc;
    c.beginPath();
    c.moveTo(hx + 1 * sc, hw - 2.6 * sc);
    c.quadraticCurveTo(hx - 3 * sc, hw - 7 * sc, hx - 7 * sc, hw - 5 * sc);
    c.stroke();

    drawCreatureEye(c, hx + 2.8 * sc, hw - 1.3 * sc, 1.1 * sc, cr, pal);
}

// =========================================================================
// 3. DESERT
// =========================================================================

function drawDesertJerboa(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const air = cr.isAirborne;
    const ph = cr.walkCycle;
    const bob = air ? -2 * sc : Math.abs(Math.sin(ph)) * 1.2 * sc;

    // Cola larguísima con penacho para equilibrar saltos
    const tip = drawFluidChain(c, -3.5 * sc, -4.5 * sc + bob, 5, 3.0 * sc, Math.PI - 0.25, 0.24, 0.7, timeSec * 6, 1.2 * sc, 0.5 * sc, pal.secondary, null);
    c.fillStyle = pal.accent;
    c.beginPath();
    c.ellipse(tip.x, tip.y, 2.2 * sc, 1.2 * sc, -0.3, 0, Math.PI * 2);
    c.fill();

    // Patas traseras enormes en Z (resorte)
    const jumpStretch = air ? 3.5 * sc : 0;
    const legTarget = calcStepTarget(0.5 * sc, 0, ph, 3.5 * sc, 2.5 * sc, air);
    drawArticulatedLeg(c, -1.5 * sc, -4.5 * sc + bob, legTarget.x - 1.0 * sc, legTarget.y + jumpStretch * 0.2, 4.6 * sc, 5.2 * sc, -1, 1.5 * sc, 0.9 * sc, adjustHexBrightness(pal.body, 0.6), 'claw', pal.horn);
    drawArticulatedLeg(c, -0.5 * sc, -4.5 * sc + bob, legTarget.x, legTarget.y, 4.6 * sc, 5.2 * sc, -1, 1.6 * sc, 1.0 * sc, pal.body, 'claw', pal.horn);

    // Cuerpo redondo ágil
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -6.2 * sc + bob, 4.2 * sc, 3.4 * sc, -0.25, 0, Math.PI * 2);
    c.fill();

    // Patitas delanteras diminutas
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.0 * sc;
    c.beginPath();
    c.moveTo(3.0 * sc, -6.0 * sc + bob);
    c.lineTo(5.2 * sc, -4.5 * sc + bob);
    c.stroke();

    // Cabeza y orejas gigantes parabólicas
    const hx = 3.2 * sc;
    const hy = -9.5 * sc + bob;
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(hx, hy, 2.8 * sc, 2.3 * sc, 0.1, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.secondary;
    c.strokeStyle = pal.accent;
    c.lineWidth = 0.8 * sc;
    c.beginPath();
    c.ellipse(hx - 1.5 * sc, hy - 4.5 * sc, 1.4 * sc, 3.6 * sc, -0.35, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    drawCreatureEye(c, hx + 1.2 * sc, hy - 0.5 * sc, 1.05 * sc, cr, pal);
}

function drawDesertTortoiseTitan(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const dark = adjustHexBrightness(pal.body, 0.6);
    const bob = Math.sin(timeSec * 1.2) * 0.35 * sc;

    // Patas columnares (fondo)
    const bR = calcStepTarget(-6.5 * sc, 0, ph + Math.PI, 2.2 * sc, 1.2 * sc, false);
    const fR = calcStepTarget(6.5 * sc, 0, ph, 2.2 * sc, 1.2 * sc, false);
    drawArticulatedLeg(c, -6.2 * sc, -4.5 * sc + bob, bR.x, bR.y, 2.8 * sc, 2.6 * sc, -1, 3.0 * sc, 2.4 * sc, dark, 'claw', pal.horn);
    drawArticulatedLeg(c, 6.2 * sc, -4.5 * sc + bob, fR.x, fR.y, 2.8 * sc, 2.6 * sc, 1, 3.0 * sc, 2.4 * sc, dark, 'claw', pal.horn);

    // Caparazón abovedado con terrazas de arenisca
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -5.0 * sc + bob, 11.2 * sc, 7.6 * sc, 0, Math.PI, 0);
    c.closePath();
    c.fill();

    // Terrazas esculpidas y cristales de sal
    c.fillStyle = pal.secondary;
    c.beginPath();
    c.ellipse(0, -8.5 * sc + bob, 8.2 * sc, 3.5 * sc, 0, Math.PI, 0);
    c.closePath();
    c.fill();

    c.fillStyle = pal.accent;
    for (let i = -1; i <= 1; i++) {
        const cx = i * 3.4 * sc;
        const cy = -11.5 * sc + Math.abs(i) * 1.0 * sc + bob;
        c.beginPath();
        c.moveTo(cx - 1.1 * sc, cy + 1.5 * sc);
        c.lineTo(cx, cy - 3.0 * sc);
        c.lineTo(cx + 1.1 * sc, cy + 1.5 * sc);
        c.closePath();
        c.fill();
    }

    // Cabeza sabia
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(11.5 * sc, -5.5 * sc + bob, 3.6 * sc, 2.4 * sc, 0.1, 0, Math.PI * 2);
    c.fill();
    drawCreatureEye(c, 12.8 * sc, -6.0 * sc + bob, 0.9 * sc, cr, pal);

    // Patas primer plano
    const bL = calcStepTarget(-7.2 * sc, 0, ph, 2.2 * sc, 1.2 * sc, false);
    const fL = calcStepTarget(5.5 * sc, 0, ph + Math.PI, 2.2 * sc, 1.2 * sc, false);
    drawArticulatedLeg(c, -7.0 * sc, -4.5 * sc + bob, bL.x, bL.y, 2.8 * sc, 2.6 * sc, -1, 3.2 * sc, 2.5 * sc, pal.body, 'claw', pal.horn);
    drawArticulatedLeg(c, 5.5 * sc, -4.5 * sc + bob, fL.x, fL.y, 2.8 * sc, 2.6 * sc, 1, 3.2 * sc, 2.5 * sc, pal.body, 'claw', pal.horn);
}

function drawDesertScorpion(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const dark = adjustHexBrightness(pal.body, 0.6);

    // 3 pares de patas articuladas (fondo + frente)
    for (let i = -1; i <= 1; i++) {
        const hipX = i * 3.4 * sc;
        const p1 = calcStepTarget(hipX - 1.2 * sc, 0, ph + i * 1.1, 2.4 * sc, 1.6 * sc, false);
        drawArticulatedLeg(c, hipX, -3.5 * sc, p1.x, p1.y, 3.5 * sc, 3.5 * sc, -1, 1.3 * sc, 0.8 * sc, dark, 'claw', null);
    }

    // Cola escorpión segmentada arqueada sobre el lomo
    const strike = (cr.aiState === 'ATTACK' || cr.aiState === 'TELEGRAPH') ? 0.5 : Math.sin(timeSec * 2.5) * 0.12;
    let tx = -7.0 * sc;
    let ty = -4.5 * sc;
    let ang = -2.2 + strike;
    for (let s = 0; s < 5; s++) {
        ang += 0.42;
        const nx = tx + Math.cos(ang) * 3.0 * sc;
        const ny = ty + Math.sin(ang) * 3.0 * sc;
        c.fillStyle = (s % 2 === 0) ? pal.body : pal.secondary;
        c.beginPath();
        c.arc((tx + nx) * 0.5, (ty + ny) * 0.5, (1.8 - s * 0.16) * sc, 0, Math.PI * 2);
        c.fill();
        tx = nx;
        ty = ny;
    }
    // Aguijón fulgurita incandescente
    c.fillStyle = pal.accent;
    c.beginPath();
    c.moveTo(tx, ty - 1.0 * sc);
    c.lineTo(tx + 4.0 * sc, ty + 0.5 * sc);
    c.lineTo(tx, ty + 1.2 * sc);
    c.closePath();
    c.fill();

    // Cuerpo segmentado blindado
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -4.5 * sc, 7.6 * sc, 3.2 * sc, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.0 * sc;
    c.stroke();

    // Pinza hidráulica delantera
    const snap = (cr.aiState === 'ATTACK' || cr.aiState === 'TELEGRAPH') ? 0.4 : Math.sin(timeSec * 3) * 0.12;
    c.strokeStyle = pal.secondary;
    c.lineWidth = 2.0 * sc;
    c.beginPath();
    c.moveTo(6.5 * sc, -4.5 * sc);
    c.lineTo(10.5 * sc, -5.5 * sc);
    c.stroke();

    c.fillStyle = pal.accent;
    c.beginPath();
    c.arc(11.8 * sc, -5.8 * sc, 2.2 * sc, snap, Math.PI * 2 - snap);
    c.lineTo(11.8 * sc, -5.8 * sc);
    c.fill();

    drawCreatureEye(c, 5.5 * sc, -5.8 * sc, 0.85 * sc, cr, pal);

    for (let i = -1; i <= 1; i++) {
        const hipX = i * 3.4 * sc;
        const p2 = calcStepTarget(hipX + 0.6 * sc, 0, ph + Math.PI + i * 1.1, 2.4 * sc, 1.6 * sc, false);
        drawArticulatedLeg(c, hipX, -3.5 * sc, p2.x, p2.y, 3.5 * sc, 3.5 * sc, 1, 1.4 * sc, 0.9 * sc, pal.body, 'claw', pal.horn);
    }
}

function drawDesertSandwyrm(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const segs = 11;
    const spd = Math.abs(cr.vTangential) > 0.3 ? 6.5 : 3.2;

    // Aura giratoria de arena si está furioso o en tierra
    c.save();
    c.strokeStyle = pal.glow;
    c.lineWidth = 1.0 * sc;
    c.beginPath();
    c.ellipse(0, -2 * sc, 16 * sc, 3 * sc, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();

    // Anillos quitinosos del cuerpo
    for (let i = segs - 1; i >= 0; i--) {
        const frac = 1 - i / segs;
        const wave = Math.sin(timeSec * spd - i * 0.5) * 2.5 * sc;
        const sx = (4 - i) * 2.8 * sc;
        const sy = (-5.5 + (i > 6 ? 1.5 : 0)) * sc + wave * 0.6;
        const rad = (2.4 + frac * 3.8) * sc;

        c.fillStyle = (i % 2 === 0) ? pal.body : pal.secondary;
        c.beginPath();
        c.ellipse(sx, sy, rad * 0.85, rad, 0, 0, Math.PI * 2);
        c.fill();

        // Espina dorsal
        c.fillStyle = pal.accent;
        c.beginPath();
        c.moveTo(sx - 1 * sc, sy - rad * 0.85);
        c.lineTo(sx, sy - rad * 1.4);
        c.lineTo(sx + 1 * sc, sy - rad * 0.85);
        c.closePath();
        c.fill();
    }

    // Cabeza enorme con fauces triples radiales
    const hw = Math.sin(timeSec * spd) * 1.5 * sc;
    const hx = 4 * 2.8 * sc;
    const hy = -6.0 * sc + hw;
    const mouthOpen = (cr.aiState === 'ATTACK' || cr.aiState === 'TELEGRAPH' || cr.isEnraged) ? 0.55 : 0.15;

    c.fillStyle = pal.body;
    c.beginPath();
    c.arc(hx, hy, 5.8 * sc, 0, Math.PI * 2);
    c.fill();

    // Tres mandíbulas articuladas con dientes de sílice
    for (let m = -1; m <= 1; m++) {
        c.save();
        c.translate(hx + 3.2 * sc, hy);
        c.rotate(m * mouthOpen);
        c.fillStyle = pal.secondary;
        c.beginPath();
        c.moveTo(0, -1.2 * sc);
        c.lineTo(6.2 * sc, 0);
        c.lineTo(0, 1.2 * sc);
        c.closePath();
        c.fill();
        c.fillStyle = pal.horn;
        c.beginPath();
        c.arc(5.5 * sc, 0, 0.7 * sc, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }

    drawCreatureEye(c, hx + 1.5 * sc, hy - 2.6 * sc, 1.15 * sc, cr, pal);
}

// =========================================================================
// 4. CRYOGENIC
// =========================================================================

function drawCryoFox(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const air = cr.isAirborne;
    const dark = adjustHexBrightness(pal.body, 0.6);
    const bob = air ? -1.2 * sc : Math.abs(Math.sin(ph * 2)) * 1.1 * sc;

    // Cola triple boreal esponjosa
    drawFluidChain(c, -6.5 * sc, -6.2 * sc + bob, 5, 2.5 * sc, -2.7, 0.3, 0.8, timeSec * 6 + ph, 3.0 * sc, 0.7 * sc, pal.accent, pal.horn);
    drawFluidChain(c, -6.5 * sc, -5.8 * sc + bob, 4, 2.3 * sc, -2.4, 0.25, 0.9, timeSec * 5.5 + 1, 2.2 * sc, 0.5 * sc, pal.secondary, null);

    // Patas fondo
    const bR = calcStepTarget(-5.0 * sc, 0, ph + Math.PI, 4.0 * sc, 2.4 * sc, air);
    const fR = calcStepTarget(4.5 * sc, 0, ph, 4.0 * sc, 2.4 * sc, air);
    drawArticulatedLeg(c, -4.8 * sc, -4.8 * sc + bob, bR.x, bR.y, 2.8 * sc, 2.8 * sc, -1, 1.3 * sc, 0.8 * sc, dark, 'claw', null);
    drawArticulatedLeg(c, 4.5 * sc, -4.8 * sc + bob, fR.x, fR.y, 2.8 * sc, 2.8 * sc, 1, 1.3 * sc, 0.8 * sc, dark, 'claw', null);

    // Cuerpo esbelto
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -6.2 * sc + bob, 6.8 * sc, 2.9 * sc, -0.08, 0, Math.PI * 2);
    c.fill();

    // Collar de escarcha en el pecho
    c.fillStyle = pal.accent;
    c.beginPath();
    c.ellipse(4.8 * sc, -6.8 * sc + bob, 2.6 * sc, 2.2 * sc, 0.3, 0, Math.PI * 2);
    c.fill();

    // Cabeza con hocico fino y orejas de lince
    const hx = 6.8 * sc;
    const hy = -9.0 * sc + bob;
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(hx - 2.2 * sc, hy - 1.5 * sc);
    c.lineTo(hx + 4.8 * sc, hy + 0.5 * sc);
    c.lineTo(hx - 0.5 * sc, hy + 1.8 * sc);
    c.closePath();
    c.fill();

    // Orejas con puntas de aurora
    c.fillStyle = pal.secondary;
    c.beginPath();
    c.moveTo(hx - 1.5 * sc, hy - 1.2 * sc);
    c.lineTo(hx - 2.8 * sc, hy - 5.2 * sc);
    c.lineTo(hx + 0.4 * sc, hy - 1.5 * sc);
    c.closePath();
    c.fill();

    drawCreatureEye(c, hx + 1.2 * sc, hy - 0.4 * sc, 0.8 * sc, cr, pal);

    // Patas primer plano
    const bL = calcStepTarget(-5.6 * sc, 0, ph, 4.0 * sc, 2.4 * sc, air);
    const fL = calcStepTarget(3.8 * sc, 0, ph + Math.PI, 4.0 * sc, 2.4 * sc, air);
    drawArticulatedLeg(c, -5.5 * sc, -4.8 * sc + bob, bL.x, bL.y, 2.8 * sc, 2.8 * sc, -1, 1.4 * sc, 0.85 * sc, pal.body, 'claw', pal.horn);
    drawArticulatedLeg(c, 3.8 * sc, -4.8 * sc + bob, fL.x, fL.y, 2.8 * sc, 2.8 * sc, 1, 1.4 * sc, 0.85 * sc, pal.body, 'claw', pal.horn);
}

function drawCryoMammoth(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const dark = adjustHexBrightness(pal.body, 0.6);
    const bob = Math.sin(timeSec * 1.4) * 0.5 * sc;

    // Patas columnares fondo
    const bR = calcStepTarget(-6.5 * sc, 0, ph + Math.PI, 2.8 * sc, 1.4 * sc, false);
    const fR = calcStepTarget(6.5 * sc, 0, ph, 2.8 * sc, 1.4 * sc, false);
    drawArticulatedLeg(c, -6.2 * sc, -7.2 * sc + bob, bR.x, bR.y, 4.0 * sc, 4.0 * sc, -1, 3.3 * sc, 2.8 * sc, dark, 'hoof', pal.horn);
    drawArticulatedLeg(c, 6.2 * sc, -7.2 * sc + bob, fR.x, fR.y, 4.0 * sc, 4.0 * sc, 1, 3.3 * sc, 2.8 * sc, dark, 'hoof', pal.horn);

    // Cuerpo lanudo macizo con joroba
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(-10 * sc, -7.5 * sc + bob);
    c.quadraticCurveTo(-11 * sc, -15 * sc + bob, -3 * sc, -15.5 * sc + bob);
    c.quadraticCurveTo(4 * sc, -18.5 * sc + bob, 9.5 * sc, -13 * sc + bob);
    c.lineTo(9.5 * sc, -6.8 * sc + bob);
    c.quadraticCurveTo(0, -5.5 * sc + bob, -10 * sc, -7.5 * sc + bob);
    c.closePath();
    c.fill();

    // Coraza glaciar translúcida en el lomo
    c.fillStyle = pal.accent;
    c.globalAlpha = 0.72;
    c.beginPath();
    c.moveTo(-6 * sc, -14.5 * sc + bob);
    c.lineTo(-2 * sc, -19.5 * sc + bob);
    c.lineTo(2 * sc, -17.5 * sc + bob);
    c.lineTo(5.5 * sc, -20.5 * sc + bob);
    c.lineTo(8.0 * sc, -14.0 * sc + bob);
    c.closePath();
    c.fill();
    c.globalAlpha = 1.0;

    // Cabeza y trompa sinuosa articulada
    const hx = 10.5 * sc;
    const hy = -12.0 * sc + bob;
    c.fillStyle = pal.body;
    c.beginPath();
    c.arc(hx, hy, 4.2 * sc, 0, Math.PI * 2);
    c.fill();

    drawFluidChain(c, hx + 2.5 * sc, hy + 1.0 * sc, 5, 2.0 * sc, 1.35, 0.25, 0.8, timeSec * 2.5, 2.2 * sc, 0.9 * sc, pal.secondary, null);

    // Colmillos bifurcados de diamante helado
    c.strokeStyle = pal.horn;
    c.lineWidth = 2.0 * sc;
    c.beginPath();
    c.moveTo(hx + 2.0 * sc, hy + 1.8 * sc);
    c.quadraticCurveTo(hx + 8.5 * sc, hy + 3.0 * sc, hx + 10.5 * sc, hy - 3.5 * sc);
    c.moveTo(hx + 6.5 * sc, hy + 1.2 * sc);
    c.lineTo(hx + 9.2 * sc, hy + 0.5 * sc);
    c.stroke();

    drawCreatureEye(c, hx + 1.5 * sc, hy - 1.2 * sc, 0.95 * sc, cr, pal);

    // Patas primer plano
    const bL = calcStepTarget(-7.5 * sc, 0, ph, 2.8 * sc, 1.4 * sc, false);
    const fL = calcStepTarget(5.2 * sc, 0, ph + Math.PI, 2.8 * sc, 1.4 * sc, false);
    drawArticulatedLeg(c, -7.2 * sc, -7.2 * sc + bob, bL.x, bL.y, 4.0 * sc, 4.0 * sc, -1, 3.5 * sc, 2.9 * sc, pal.body, 'hoof', pal.horn);
    drawArticulatedLeg(c, 5.2 * sc, -7.2 * sc + bob, fL.x, fL.y, 4.0 * sc, 4.0 * sc, 1, 3.5 * sc, 2.9 * sc, pal.body, 'hoof', pal.horn);
}

function drawCryoWraith(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const flap = Math.sin(cr.flapCycle * 2.1);
    const wY = (-12 - flap * 8.5) * sc;

    // Estela de ventisca
    drawFluidChain(c, -6 * sc, 0, 5, 3.2 * sc, Math.PI, 0.25, 0.9, timeSec * 8, 1.5 * sc, 0.3 * sc, pal.glow, pal.horn);

    // Alas en guadaña de hielo
    c.fillStyle = pal.secondary;
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.2 * sc;
    c.beginPath();
    c.moveTo(4 * sc, -1 * sc);
    c.quadraticCurveTo(0, wY, -13 * sc, wY * 0.85);
    c.lineTo(-6 * sc, -2 * sc);
    c.lineTo(-10 * sc, 0);
    c.closePath();
    c.fill();
    c.stroke();

    // Torso óseo helado
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, 0, 7.5 * sc, 2.6 * sc, 0, 0, Math.PI * 2);
    c.fill();

    // Cráneo estrecho y pico
    c.beginPath();
    c.moveTo(5 * sc, -2.2 * sc);
    c.lineTo(13 * sc, 0);
    c.lineTo(5 * sc, 2.0 * sc);
    c.closePath();
    c.fill();

    drawCreatureEye(c, 7.5 * sc, -0.5 * sc, 1.0 * sc, cr, pal);
}

// =========================================================================
// 5. VOLCANIC
// =========================================================================

function drawVolcEmberBeetle(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const air = cr.isAirborne || cr.aiState === 'FLEE';

    // Patitas rápidas
    c.strokeStyle = pal.secondary;
    c.lineWidth = 1.2 * sc;
    for (let i = -1; i <= 1; i++) {
        const wave = Math.sin(ph + i * 1.8) * 2.2 * sc;
        c.beginPath();
        c.moveTo(i * 2.4 * sc, -2.5 * sc);
        c.lineTo(i * 3.8 * sc + wave, 0);
        c.stroke();
    }

    // Abdomen ascua incandescente
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = pal.glow;
    c.beginPath();
    c.arc(-2.5 * sc, -3.5 * sc, 4.2 * sc, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Alas térmicas abiertas al saltar/huir
    if (air) {
        const wingFlick = Math.sin(timeSec * 38) * 2.5 * sc;
        c.fillStyle = pal.accent;
        c.globalAlpha = 0.78;
        c.beginPath();
        c.ellipse(-2 * sc, -8.5 * sc + wingFlick, 5.5 * sc, 2.0 * sc, -0.45, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1.0;
    }

    // Élitros de obsidiana lustrosa
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -4.0 * sc, 5.2 * sc, 3.0 * sc, -0.1, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = pal.accent;
    c.lineWidth = 0.9 * sc;
    c.stroke();

    drawCreatureEye(c, 3.8 * sc, -4.2 * sc, 0.85 * sc, cr, pal);
}

function drawVolcMagmaGolem(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const dark = adjustHexBrightness(pal.body, 0.55);
    const pulse = Math.sin(timeSec * 3.2) * 0.25 + 0.75;
    const bob = Math.abs(Math.sin(ph)) * 1.0 * sc;

    // Brazo trasero enorme
    const armR = Math.sin(ph) * 3.5 * sc;
    drawArticulatedLeg(c, 2.5 * sc, -13 * sc + bob, 6.5 * sc + armR, -3.5 * sc, 5.5 * sc, 5.5 * sc, 1, 3.6 * sc, 3.0 * sc, dark, 'claw', pal.accent);

    // Pierna trasera
    const lR = calcStepTarget(-3.5 * sc, 0, ph + Math.PI, 3.0 * sc, 1.5 * sc, false);
    drawArticulatedLeg(c, -2.5 * sc, -7.5 * sc + bob, lR.x, lR.y, 4.2 * sc, 4.2 * sc, 1, 3.4 * sc, 2.8 * sc, dark, 'claw', null);

    // Torso de basalto fracturado con grietas de lava
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(-7.5 * sc, -7.0 * sc + bob);
    c.lineTo(-9.0 * sc, -15.5 * sc + bob);
    c.lineTo(-3.0 * sc, -19.0 * sc + bob);
    c.lineTo(5.5 * sc, -17.5 * sc + bob);
    c.lineTo(7.0 * sc, -10.5 * sc + bob);
    c.lineTo(3.0 * sc, -7.0 * sc + bob);
    c.closePath();
    c.fill();

    // Grietas incandescentes de magma
    c.strokeStyle = pal.accent;
    c.lineWidth = (1.5 + pulse * 0.8) * sc;
    c.beginPath();
    c.moveTo(-4.5 * sc, -15 * sc + bob);
    c.lineTo(-1.0 * sc, -12 * sc + bob);
    c.lineTo(3.5 * sc, -14 * sc + bob);
    c.moveTo(-1.0 * sc, -12 * sc + bob);
    c.lineTo(0.5 * sc, -8.5 * sc + bob);
    c.stroke();

    // Cabeza rocosa hundida con visor ardiente
    c.fillStyle = pal.secondary;
    c.beginPath();
    c.arc(4.0 * sc, -17.0 * sc + bob, 3.2 * sc, 0, Math.PI * 2);
    c.fill();
    drawCreatureEye(c, 5.5 * sc, -17.2 * sc + bob, 1.15 * sc, cr, pal);

    // Pierna y brazo primer plano
    const lL = calcStepTarget(2.0 * sc, 0, ph, 3.0 * sc, 1.5 * sc, false);
    drawArticulatedLeg(c, 1.5 * sc, -7.5 * sc + bob, lL.x, lL.y, 4.2 * sc, 4.2 * sc, 1, 3.6 * sc, 3.0 * sc, pal.body, 'claw', pal.accent);

    const punch = (cr.aiState === 'ATTACK' || cr.aiState === 'TELEGRAPH') ? 5.5 * sc : -Math.sin(ph) * 3.5 * sc;
    drawArticulatedLeg(c, -1.5 * sc, -13 * sc + bob, 3.0 * sc + punch, -3.0 * sc, 5.5 * sc, 5.5 * sc, 1, 3.8 * sc, 3.4 * sc, pal.secondary, 'claw', pal.horn);
}

function drawVolcFiredrake(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const flap = Math.sin(cr.flapCycle * 2.0);
    const wingY = (-14 - flap * 9.0) * sc;

    // Cola con maza de obsidiana
    const tailTip = drawFluidChain(c, -7 * sc, -1 * sc, 6, 3.0 * sc, Math.PI - 0.1, 0.28, 0.75, timeSec * 5, 2.4 * sc, 0.8 * sc, pal.body, pal.accent);
    c.fillStyle = pal.accent;
    c.beginPath();
    c.arc(tailTip.x, tailTip.y, 2.5 * sc, 0, Math.PI * 2);
    c.fill();

    // Ala trasera
    c.fillStyle = adjustHexBrightness(pal.secondary, 0.7);
    c.beginPath();
    c.moveTo(2 * sc, -2 * sc);
    c.lineTo(-4 * sc, wingY * 0.7);
    c.lineTo(-14 * sc, wingY * 0.55);
    c.lineTo(-7 * sc, 0);
    c.closePath();
    c.fill();

    // Cuerpo dragón acorazado
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, 0, 8.2 * sc, 3.6 * sc, -0.1, 0, Math.PI * 2);
    c.fill();

    // Cuello serpentino y cabeza con cuernos ardientes
    const headBob = Math.sin(timeSec * 4) * 1.2 * sc;
    const hx = 10.5 * sc;
    const hy = -5.5 * sc + headBob;
    c.strokeStyle = pal.body;
    c.lineWidth = 3.6 * sc;
    c.beginPath();
    c.moveTo(5.5 * sc, -1.5 * sc);
    c.quadraticCurveTo(8.5 * sc, -3.0 * sc, hx, hy);
    c.stroke();

    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(hx - 1.5 * sc, hy - 2.6 * sc);
    c.lineTo(hx + 6.5 * sc, hy - 0.5 * sc);
    c.lineTo(hx + 3.0 * sc, hy + 2.5 * sc);
    c.lineTo(hx - 1.5 * sc, hy + 1.5 * sc);
    c.closePath();
    c.fill();

    // Cuernos en llamas
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.6 * sc;
    c.beginPath();
    c.moveTo(hx, hy - 2.0 * sc);
    c.lineTo(hx - 5.0 * sc, hy - 6.5 * sc);
    c.stroke();

    // Ala frontal con nervaduras de fuego
    c.fillStyle = pal.secondary;
    c.beginPath();
    c.moveTo(3 * sc, -2 * sc);
    c.lineTo(-3 * sc, wingY);
    c.lineTo(-16 * sc, wingY * 0.78);
    c.quadraticCurveTo(-8 * sc, wingY * 0.25, -6 * sc, 0.5 * sc);
    c.closePath();
    c.fill();

    c.strokeStyle = pal.accent;
    c.lineWidth = 1.3 * sc;
    c.beginPath();
    c.moveTo(3 * sc, -2 * sc);
    c.lineTo(-3 * sc, wingY);
    c.lineTo(-16 * sc, wingY * 0.78);
    c.moveTo(-3 * sc, wingY);
    c.lineTo(-9 * sc, wingY * 0.35);
    c.stroke();

    drawCreatureEye(c, hx + 2.5 * sc, hy - 0.8 * sc, 1.15 * sc, cr, pal);
}

// =========================================================================
// 6. TOXIC
// =========================================================================

function drawToxicHopper(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const air = cr.isAirborne;
    const sacPulse = Math.sin(timeSec * 5) * 0.35 + 1.0;

    // Ancas traseras enormes en Z
    const fTarget = air ? { x: -5 * sc, y: 3 * sc } : { x: -2.0 * sc, y: 0 };
    drawArticulatedLeg(c, -2.5 * sc, -3.5 * sc, fTarget.x, fTarget.y, 4.4 * sc, 4.8 * sc, -1, 2.0 * sc, 1.2 * sc, adjustHexBrightness(pal.body, 0.6), 'claw', null);
    drawArticulatedLeg(c, -1.8 * sc, -3.5 * sc, fTarget.x + 1.2 * sc, fTarget.y, 4.4 * sc, 4.8 * sc, -1, 2.1 * sc, 1.3 * sc, pal.body, 'claw', pal.accent);

    // Cuerpo anfibio rechoncho
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0.5 * sc, -5.0 * sc, 5.2 * sc, 3.6 * sc, -0.35, 0, Math.PI * 2);
    c.fill();

    // Saco gular pulsante verde neón
    c.fillStyle = pal.accent;
    c.beginPath();
    c.arc(4.2 * sc, -4.5 * sc, 2.0 * sc * sacPulse, 0, Math.PI * 2);
    c.fill();

    // Tres ojos asimétricos
    drawCreatureEye(c, 3.6 * sc, -8.0 * sc, 0.85 * sc, cr, pal);
    drawCreatureEye(c, 5.4 * sc, -7.2 * sc, 0.65 * sc, cr, pal);
}

function drawToxicSlugTank(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const crawl = Math.sin(timeSec * 3.5 + cr.walkCycle) * 0.8 * sc;

    // Cuerpo peristáltico ondulante
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(-10 * sc, 0);
    c.quadraticCurveTo(-5 * sc, -4.5 * sc + crawl, 2 * sc, -3.8 * sc);
    c.quadraticCurveTo(8 * sc, -5.5 * sc, 10.5 * sc, -2.5 * sc);
    c.quadraticCurveTo(10.5 * sc, 0, 8.0 * sc, 0);
    c.closePath();
    c.fill();

    // Concha espiral metálica corroída
    c.fillStyle = pal.secondary;
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.3 * sc;
    c.beginPath();
    c.arc(-2.0 * sc, -6.0 * sc, 5.6 * sc, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    c.beginPath();
    c.arc(-2.5 * sc, -6.2 * sc, 2.8 * sc, 0, Math.PI * 1.5);
    c.stroke();

    // Tentáculos oculares
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.1 * sc;
    c.beginPath();
    c.moveTo(8.5 * sc, -4.2 * sc);
    c.lineTo(10.8 * sc, -8.5 * sc + crawl);
    c.moveTo(7.5 * sc, -4.5 * sc);
    c.lineTo(8.5 * sc, -9.2 * sc - crawl * 0.5);
    c.stroke();

    drawCreatureEye(c, 10.8 * sc, -8.5 * sc + crawl, 0.9 * sc, cr, pal);
    drawCreatureEye(c, 8.5 * sc, -9.2 * sc - crawl * 0.5, 0.75 * sc, cr, pal);
}

function drawToxicMantisApex(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const air = cr.isAirborne;
    const dark = adjustHexBrightness(pal.body, 0.58);
    const breath = Math.sin(timeSec * 3.5) * 0.7 * sc;
    const slash = (cr.aiState === 'ATTACK' || cr.aiState === 'TELEGRAPH') ? Math.sin(timeSec * 18) * 3.5 * sc : 0;

    // 4 patas zancudas IK
    const p1 = calcStepTarget(-5.5 * sc, 0, ph, 4.0 * sc, 2.5 * sc, air);
    const p2 = calcStepTarget(4.5 * sc, 0, ph + Math.PI, 4.0 * sc, 2.5 * sc, air);
    drawArticulatedLeg(c, -2.0 * sc, -7.5 * sc, p1.x, p1.y, 5.5 * sc, 6.0 * sc, -1, 1.5 * sc, 0.9 * sc, dark, 'claw', pal.accent);
    drawArticulatedLeg(c, 1.5 * sc, -7.5 * sc, p2.x, p2.y, 5.5 * sc, 6.0 * sc, 1, 1.6 * sc, 1.0 * sc, pal.body, 'claw', pal.horn);

    // Abdomen largo segmentado
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(-6.5 * sc, -8.5 * sc, 7.2 * sc, 2.8 * sc, -0.3, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.0 * sc;
    c.stroke();

    // Tórax erguido
    c.strokeStyle = pal.body;
    c.lineWidth = 3.0 * sc;
    c.beginPath();
    c.moveTo(0, -8.2 * sc);
    c.lineTo(3.8 * sc, -16.8 * sc + breath);
    c.stroke();

    // Dos guadañas enormes dentadas
    c.strokeStyle = pal.horn;
    c.lineWidth = 2.0 * sc;
    c.beginPath();
    c.moveTo(3.2 * sc, -15.5 * sc + breath);
    c.lineTo(9.0 * sc + slash, -12.0 * sc);
    c.lineTo(6.2 * sc + slash, -6.5 * sc);
    c.stroke();

    c.strokeStyle = pal.accent;
    c.lineWidth = 1.6 * sc;
    c.beginPath();
    c.moveTo(3.5 * sc, -15.5 * sc + breath);
    c.lineTo(7.5 * sc - slash * 0.5, -10.5 * sc);
    c.lineTo(4.0 * sc, -6.5 * sc);
    c.stroke();

    // Cabeza triangular y antenas
    c.fillStyle = pal.accent;
    c.beginPath();
    c.moveTo(3.8 * sc, -19.8 * sc + breath);
    c.lineTo(6.8 * sc, -16.5 * sc + breath);
    c.lineTo(2.0 * sc, -16.5 * sc + breath);
    c.closePath();
    c.fill();

    drawCreatureEye(c, 5.2 * sc, -17.5 * sc + breath, 1.15 * sc, cr, pal);
}

// =========================================================================
// 7. HOLLOW
// =========================================================================

function drawHollowLanternMoth(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const flap = Math.sin(cr.flapCycle * 2.2);

    // 4 Alas aterciopeladas con ocelos
    c.fillStyle = pal.secondary;
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.1 * sc;
    c.beginPath();
    c.ellipse(-1.5 * sc, (-5.5 - flap * 4.0) * sc, 7.2 * sc, 3.8 * sc, -0.35, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Ocelo hipnótico en ala
    c.fillStyle = pal.eye;
    c.beginPath();
    c.arc(-3.5 * sc, (-5.5 - flap * 4.0) * sc, 1.3 * sc, 0, Math.PI * 2);
    c.fill();

    // Cuerpo y farolillo colgante
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, 0, 5.2 * sc, 2.2 * sc, 0.2, 0, Math.PI * 2);
    c.fill();

    // Farolillo luminoso
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = pal.glow;
    c.beginPath();
    c.arc(-4.5 * sc, 2.5 * sc, 4.0 * sc, 0, Math.PI * 2);
    c.fill();
    c.restore();

    c.fillStyle = pal.eye;
    c.beginPath();
    c.arc(-4.5 * sc, 2.5 * sc, 1.6 * sc, 0, Math.PI * 2);
    c.fill();

    // Antenas plumosas
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.0 * sc;
    c.beginPath();
    c.moveTo(4.5 * sc, -1 * sc);
    c.quadraticCurveTo(8 * sc, -5 * sc, 10 * sc, -4 * sc);
    c.stroke();

    drawCreatureEye(c, 4.5 * sc, -0.5 * sc, 0.8 * sc, cr, pal);
}

function drawHollowEchobat(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const flap = Math.sin(cr.flapCycle * 2.8);
    const wingY = (-10 - flap * 7.5) * sc;

    // Anillo visual de sonar cuando alerta o persigue
    if (cr.aiState === 'CHASE' || cr.aiState === 'ATTACK') {
        const ringR = ((timeSec * 25) % 18 + 4) * sc;
        c.strokeStyle = pal.glow;
        c.lineWidth = 1.0 * sc;
        c.beginPath();
        c.arc(7 * sc, 0, ringR, -0.7, 0.7);
        c.stroke();
    }

    // Alas membranosas entre dedos largos
    c.fillStyle = pal.secondary;
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.1 * sc;
    c.beginPath();
    c.moveTo(3 * sc, -1 * sc);
    c.lineTo(-1 * sc, wingY);
    c.lineTo(-11 * sc, wingY * 0.7);
    c.lineTo(-6 * sc, 1.5 * sc);
    c.closePath();
    c.fill();
    c.stroke();

    // Cuerpo quiróptero
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, 0, 5.2 * sc, 2.6 * sc, 0, 0, Math.PI * 2);
    c.fill();

    // Orejas parabólicas enormes
    c.fillStyle = pal.accent;
    c.beginPath();
    c.moveTo(3 * sc, -1.5 * sc);
    c.lineTo(1 * sc, -6.8 * sc);
    c.lineTo(5 * sc, -2.5 * sc);
    c.closePath();
    c.fill();

    drawCreatureEye(c, 4.2 * sc, -0.6 * sc, 0.9 * sc, cr, pal);
}

function drawHollowCeilingWeaver(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const air = cr.isAirborne;

    // 4 pares de patas arácnidas con ventosas luminosas
    for (let i = 0; i < 4; i++) {
        const side = i < 2 ? -1 : 1;
        const idx = i % 2;
        const hipX = side * (1.8 + idx * 1.8) * sc;
        const foot = calcStepTarget(side * (6.2 + idx * 2.5) * sc, 0, ph + i * 1.3, 2.8 * sc, 2.2 * sc, air);
        drawArticulatedLeg(c, hipX, -5.0 * sc, foot.x, foot.y, 4.8 * sc, 5.4 * sc, side, 1.35 * sc, 0.85 * sc, i % 2 === 0 ? pal.body : pal.secondary, 'hoof', pal.accent);
    }

    // Abdomen y cefalotórax
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(-2.5 * sc, -6.2 * sc, 4.4 * sc, 3.2 * sc, 0.2, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(3.0 * sc, -5.2 * sc, 2.8 * sc, 0, Math.PI * 2);
    c.fill();

    // Múltiples ojos agrupados
    drawCreatureEye(c, 4.8 * sc, -5.8 * sc, 0.8 * sc, cr, pal);
    drawCreatureEye(c, 5.2 * sc, -4.4 * sc, 0.55 * sc, cr, pal, false);
}

function drawHollowAbyssHydra(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;

    // Patas ancladas pesadas
    const p1 = calcStepTarget(-6 * sc, 0, ph, 2.5 * sc, 1.2 * sc, false);
    const p2 = calcStepTarget(5 * sc, 0, ph + Math.PI, 2.5 * sc, 1.2 * sc, false);
    drawArticulatedLeg(c, -5 * sc, -6 * sc, p1.x, p1.y, 3.8 * sc, 3.8 * sc, -1, 2.8 * sc, 2.0 * sc, pal.secondary, 'claw', pal.accent);
    drawArticulatedLeg(c, 4 * sc, -6 * sc, p2.x, p2.y, 3.8 * sc, 3.8 * sc, 1, 2.8 * sc, 2.0 * sc, pal.secondary, 'claw', pal.accent);

    // Cuerpo bulboso bioluminiscente
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -8.5 * sc, 9.0 * sc, 6.2 * sc, 0, 0, Math.PI * 2);
    c.fill();

    // Tres cuellos serpentinos independientes
    const neckConfigs = [
        { ang: -1.4, len: 3.0, phase: 0 },
        { ang: -0.9, len: 3.5, phase: 2.1 },
        { ang: -0.45, len: 2.8, phase: 4.2 }
    ];
    for (let n = 0; n < neckConfigs.length; n++) {
        const nc = neckConfigs[n];
        const tip = drawFluidChain(c, 4.0 * sc, -10.5 * sc, 4, nc.len * sc, nc.ang, 0.25, 0.9, timeSec * 4 + nc.phase, 2.4 * sc, 1.5 * sc, n === 1 ? pal.body : pal.secondary, null);
        // Cabeza de hidra
        c.fillStyle = pal.body;
        c.beginPath();
        c.moveTo(tip.x - 1.2 * sc, tip.y - 2.0 * sc);
        c.lineTo(tip.x + 4.8 * sc, tip.y);
        c.lineTo(tip.x - 0.8 * sc, tip.y + 1.8 * sc);
        c.closePath();
        c.fill();
        drawCreatureEye(c, tip.x + 1.8 * sc, tip.y - 0.5 * sc, 0.85 * sc, cr, pal);
    }
}

// =========================================================================
// 8. SHATTERED
// =========================================================================

function drawShatteredCloudSprite(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const bob = Math.sin(timeSec * 3.5) * 2.0 * sc;

    c.save();
    c.translate(0, bob);
    // Cuatro cintas sedosas ondeantes
    for (let i = -1; i <= 1; i++) {
        drawFluidChain(c, -2 * sc, i * 1.4 * sc, 5, 2.8 * sc, Math.PI + i * 0.15, 0.28, 0.9, timeSec * 6 + i, 1.4 * sc, 0.3 * sc, pal.accent, pal.horn);
    }

    // Cuerpo cometa aerodinámico
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(7.5 * sc, 0);
    c.quadraticCurveTo(0, -4.5 * sc, -5.0 * sc, 0);
    c.quadraticCurveTo(0, 4.5 * sc, 7.5 * sc, 0);
    c.fill();

    // Núcleo brillante
    c.fillStyle = pal.eye;
    c.beginPath();
    c.arc(2.5 * sc, 0, 1.6 * sc, 0, Math.PI * 2);
    c.fill();
    c.restore();
}

function drawShatteredIslandHopper(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const air = cr.isAirborne;
    const dark = adjustHexBrightness(pal.body, 0.6);

    // Piernas larguísimas en compás articulado con discos gravitatorios
    const pR = calcStepTarget(1.5 * sc, 0, ph + Math.PI, 4.5 * sc, 3.2 * sc, air);
    const pL = calcStepTarget(-1.0 * sc, 0, ph, 4.5 * sc, 3.2 * sc, air);
    drawArticulatedLeg(c, 0, -10 * sc, pR.x, pR.y, 6.0 * sc, 6.2 * sc, 1, 1.5 * sc, 0.95 * sc, dark, 'hoof', pal.accent);
    drawArticulatedLeg(c, 0, -10 * sc, pL.x, pL.y, 6.0 * sc, 6.2 * sc, 1, 1.6 * sc, 1.0 * sc, pal.body, 'hoof', pal.horn);

    // Torso estrecho vertical con crestas estabilizadoras
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0.5 * sc, -11.5 * sc, 3.6 * sc, 5.0 * sc, 0.25, 0, Math.PI * 2);
    c.fill();

    // Cresta estabilizadora dorsal
    c.fillStyle = pal.accent;
    c.beginPath();
    c.moveTo(-1.5 * sc, -14 * sc);
    c.lineTo(-6.5 * sc, -19 * sc);
    c.lineTo(1.5 * sc, -16 * sc);
    c.closePath();
    c.fill();

    drawCreatureEye(c, 2.8 * sc, -13.5 * sc, 0.95 * sc, cr, pal);
}

function drawShatteredSkyCondor(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const flap = Math.sin(cr.flapCycle * 2.0);
    const wingY = (-14 - flap * 9.5) * sc;

    // Ala enorme con plumas primarias separadas tipo dedos alares
    c.fillStyle = pal.secondary;
    c.beginPath();
    c.moveTo(4 * sc, -1 * sc);
    c.lineTo(-4 * sc, wingY);
    c.lineTo(-16 * sc, wingY * 0.72);
    c.lineTo(-8 * sc, 0.5 * sc);
    c.closePath();
    c.fill();

    c.strokeStyle = pal.accent;
    c.lineWidth = 1.4 * sc;
    for (let f = 0; f < 3; f++) {
        c.beginPath();
        c.moveTo(-12 * sc, wingY * (0.7 + f * 0.08));
        c.lineTo(-19 * sc, wingY * (0.62 + f * 0.1));
        c.stroke();
    }

    // Cuerpo robusto y placas magnéticas en pecho
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, 0, 8.0 * sc, 3.4 * sc, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.accent;
    c.beginPath();
    c.ellipse(3.5 * sc, 1.5 * sc, 3.2 * sc, 1.5 * sc, -0.2, 0, Math.PI * 2);
    c.fill();

    // Cabeza con pico ganchudo feroz
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(6 * sc, -2.5 * sc);
    c.lineTo(12.5 * sc, -0.5 * sc);
    c.lineTo(11.0 * sc, 2.0 * sc);
    c.lineTo(6.0 * sc, 1.5 * sc);
    c.closePath();
    c.fill();

    drawCreatureEye(c, 8.2 * sc, -0.8 * sc, 1.05 * sc, cr, pal);
}

// =========================================================================
// 9. LIVING
// =========================================================================

function drawLivingCoralWalker(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const breath = Math.sin(timeSec * 2.5) * 0.8 * sc;

    // Patas-raíces articuladas
    const p1 = calcStepTarget(-5.5 * sc, 0, ph, 3.0 * sc, 1.8 * sc, false);
    const p2 = calcStepTarget(5.0 * sc, 0, ph + Math.PI, 3.0 * sc, 1.8 * sc, false);
    drawArticulatedLeg(c, -4.5 * sc, -6.5 * sc, p1.x, p1.y, 3.8 * sc, 3.8 * sc, -1, 1.8 * sc, 1.1 * sc, pal.secondary, 'claw', null);
    drawArticulatedLeg(c, 4.5 * sc, -6.5 * sc, p2.x, p2.y, 3.8 * sc, 3.8 * sc, 1, 1.9 * sc, 1.1 * sc, pal.body, 'claw', pal.accent);

    // Cuerpo simbiótico
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -7.8 * sc, 7.5 * sc, 4.0 * sc, 0, 0, Math.PI * 2);
    c.fill();

    // Corales respiratorios luminosos sobre el lomo
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.6 * sc;
    for (let i = -2; i <= 2; i++) {
        const bx = i * 2.3 * sc;
        const h = (4.5 + (2 - Math.abs(i)) * 1.4) * sc + breath;
        c.beginPath();
        c.moveTo(bx, -10.5 * sc);
        c.lineTo(bx + i * 0.8 * sc, -10.5 * sc - h);
        c.stroke();
        c.fillStyle = pal.eye;
        c.beginPath();
        c.arc(bx + i * 0.8 * sc, -10.5 * sc - h, 1.0 * sc, 0, Math.PI * 2);
        c.fill();
    }

    drawCreatureEye(c, 5.5 * sc, -7.5 * sc, 0.9 * sc, cr, pal);
}

function drawLivingSporeFlea(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const air = cr.isAirborne;
    const pulse = Math.sin(timeSec * 5) * 0.1 + 1.0;

    // Patas resorte
    drawArticulatedLeg(c, -2 * sc, -3 * sc, air ? -4 * sc : -1 * sc, air ? 2 * sc : 0, 3.5 * sc, 3.8 * sc, -1, 1.4 * sc, 0.9 * sc, pal.body, 'hoof', pal.accent);

    // Cuerpo bulboso elástico
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -5.2 * sc, 4.4 * sc * pulse, 3.6 * sc / pulse, -0.2, 0, Math.PI * 2);
    c.fill();

    // Antenas espirales
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.0 * sc;
    c.beginPath();
    c.moveTo(2.5 * sc, -8.0 * sc);
    c.quadraticCurveTo(5.0 * sc, -12.0 * sc, 2.0 * sc, -13.0 * sc);
    c.stroke();

    drawCreatureEye(c, 3.0 * sc, -5.6 * sc, 0.9 * sc, cr, pal);
}

function drawLivingMycelialBrute(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const bob = Math.abs(Math.sin(ph)) * 1.1 * sc;

    // Tentáculos/brazos pesados
    const swing = Math.sin(ph) * 4.0 * sc;
    drawArticulatedLeg(c, 3 * sc, -11 * sc + bob, 6 * sc + swing, -2 * sc, 5 * sc, 5 * sc, 1, 3.0 * sc, 2.2 * sc, pal.secondary, 'claw', pal.accent);

    // Piernas robustas
    const p1 = calcStepTarget(-4 * sc, 0, ph, 2.6 * sc, 1.4 * sc, false);
    const p2 = calcStepTarget(3 * sc, 0, ph + Math.PI, 2.6 * sc, 1.4 * sc, false);
    drawArticulatedLeg(c, -3 * sc, -7 * sc + bob, p1.x, p1.y, 4 * sc, 4 * sc, -1, 3.0 * sc, 2.4 * sc, adjustHexBrightness(pal.body, 0.65), 'claw', null);
    drawArticulatedLeg(c, 2 * sc, -7 * sc + bob, p2.x, p2.y, 4 * sc, 4 * sc, 1, 3.2 * sc, 2.5 * sc, pal.body, 'claw', pal.horn);

    // Masa muscular y capucha fúngica
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -11 * sc + bob, 7.2 * sc, 6.2 * sc, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.secondary;
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.3 * sc;
    c.beginPath();
    c.ellipse(0, -15.5 * sc + bob, 9.0 * sc, 4.0 * sc, 0.1, Math.PI, 0);
    c.closePath();
    c.fill();
    c.stroke();

    // Racimo de ojos
    drawCreatureEye(c, 5.0 * sc, -12.0 * sc + bob, 1.0 * sc, cr, pal);
    drawCreatureEye(c, 3.6 * sc, -10.5 * sc + bob, 0.7 * sc, cr, pal, false);
}

function drawLivingHiveQueen(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const hover = Math.sin(timeSec * 2.2) * 2.5 * sc;
    const bloom = (cr.aiState === 'ATTACK' || cr.aiState === 'TELEGRAPH' || cr.isEnraged) ? 1.35 : 0.9;

    c.save();
    c.translate(0, hover);

    // 6 Látigos simbióticos ondulantes
    for (let i = -2; i <= 2; i++) {
        drawFluidChain(c, i * 2.2 * sc, -2 * sc, 5, 3.0 * sc, Math.PI * 0.5 + i * 0.18, 0.25, 0.85, timeSec * 4 + i, 1.6 * sc, 0.4 * sc, pal.secondary, pal.accent);
    }

    // Corona floral de pétalos bioluminiscentes
    for (let p = -2; p <= 2; p++) {
        c.save();
        c.translate(0, -12 * sc);
        c.rotate(p * 0.42 * bloom);
        c.fillStyle = p % 2 === 0 ? pal.accent : pal.horn;
        c.beginPath();
        c.ellipse(0, -6.5 * sc, 2.4 * sc, 6.0 * sc, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }

    // Torso y abdomen reina palpitante
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(0, -8 * sc, 6.2 * sc, 8.2 * sc, 0, 0, Math.PI * 2);
    c.fill();

    drawCreatureEye(c, 2.2 * sc, -11.5 * sc, 1.3 * sc, cr, pal);
    c.restore();
}

// =========================================================================
// 10. TEMPORAL
// =========================================================================

function drawTempVoltHound(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const air = cr.isAirborne;
    const dark = adjustHexBrightness(pal.body, 0.6);

    // Patas angulares veloces
    const p1 = calcStepTarget(-6 * sc, 0, ph, 5.2 * sc, 3.0 * sc, air);
    const p2 = calcStepTarget(5 * sc, 0, ph + Math.PI, 5.2 * sc, 3.0 * sc, air);
    drawArticulatedLeg(c, -5.5 * sc, -6.5 * sc, p1.x, p1.y, 4.0 * sc, 4.0 * sc, -1, 1.7 * sc, 1.0 * sc, dark, 'claw', null);
    drawArticulatedLeg(c, 4.8 * sc, -6.5 * sc, p2.x, p2.y, 4.0 * sc, 4.0 * sc, 1, 1.8 * sc, 1.0 * sc, pal.body, 'claw', pal.accent);

    // Cola en rayo bifurcado
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.6 * sc;
    c.beginPath();
    c.moveTo(-7.5 * sc, -7.5 * sc);
    c.lineTo(-11.5 * sc, -10.5 * sc);
    c.lineTo(-10.0 * sc, -8.0 * sc);
    c.lineTo(-14.5 * sc, -11.0 * sc);
    c.stroke();

    // Torso angular estilizado
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(-8 * sc, -6.5 * sc);
    c.lineTo(-4 * sc, -10.5 * sc);
    c.lineTo(6.5 * sc, -9.5 * sc);
    c.lineTo(7.5 * sc, -6.0 * sc);
    c.closePath();
    c.fill();

    // Arcos eléctricos crepitando entre hombros
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.1 * sc;
    c.beginPath();
    c.moveTo(-2 * sc, -10.5 * sc);
    c.lineTo(Math.sin(timeSec * 30) * 1.5 * sc, -13.5 * sc);
    c.lineTo(4 * sc, -10.0 * sc);
    c.stroke();

    // Cabeza angular
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(5.5 * sc, -9.8 * sc);
    c.lineTo(12.5 * sc, -8.5 * sc);
    c.lineTo(7.0 * sc, -6.5 * sc);
    c.closePath();
    c.fill();

    drawCreatureEye(c, 8.8 * sc, -8.6 * sc, 0.95 * sc, cr, pal);
}

function drawTempPhaseTitan(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const rot = timeSec * 0.9;
    const bob = Math.sin(timeSec * 1.5) * 0.5 * sc;

    // Piernas solemnes
    const p1 = calcStepTarget(-4 * sc, 0, ph, 2.4 * sc, 1.2 * sc, false);
    const p2 = calcStepTarget(4 * sc, 0, ph + Math.PI, 2.4 * sc, 1.2 * sc, false);
    drawArticulatedLeg(c, -3.5 * sc, -8.5 * sc + bob, p1.x, p1.y, 4.8 * sc, 4.8 * sc, -1, 2.8 * sc, 2.2 * sc, adjustHexBrightness(pal.body, 0.65), 'hoof', null);
    drawArticulatedLeg(c, 3.5 * sc, -8.5 * sc + bob, p2.x, p2.y, 4.8 * sc, 4.8 * sc, 1, 2.8 * sc, 2.2 * sc, pal.body, 'hoof', pal.accent);

    // Torso reloj de arena
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(-6.5 * sc, -18 * sc + bob);
    c.lineTo(6.5 * sc, -18 * sc + bob);
    c.lineTo(2.0 * sc, -12 * sc + bob);
    c.lineTo(5.5 * sc, -8 * sc + bob);
    c.lineTo(-5.5 * sc, -8 * sc + bob);
    c.lineTo(-2.0 * sc, -12 * sc + bob);
    c.closePath();
    c.fill();

    // Anillo temporal orbital alrededor del torso
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.4 * sc;
    c.beginPath();
    c.ellipse(0, -12.5 * sc + bob, 11.5 * sc, 3.2 * sc, Math.sin(rot) * 0.25, 0, Math.PI * 2);
    c.stroke();

    // Cabeza monolítica
    c.fillStyle = pal.secondary;
    c.beginPath();
    c.arc(0, -21.0 * sc + bob, 3.2 * sc, 0, Math.PI * 2);
    c.fill();
    drawCreatureEye(c, 1.5 * sc, -21.2 * sc + bob, 1.0 * sc, cr, pal);
}

function drawTempStormPhoenix(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const flap = Math.sin(cr.flapCycle * 2.4);

    // Cola larga de plumas incandescentes
    drawFluidChain(c, -6 * sc, 0, 6, 3.5 * sc, Math.PI, 0.26, 0.8, timeSec * 8, 2.2 * sc, 0.4 * sc, pal.accent, pal.eye);
    drawFluidChain(c, -6 * sc, 1 * sc, 5, 3.0 * sc, Math.PI + 0.15, 0.3, 0.9, timeSec * 8.5 + 1, 1.4 * sc, 0.3 * sc, pal.horn, null);

    // Triple par de alas escalonadas
    for (let w = 0; w < 3; w++) {
        const wY = (-10 - flap * (7.5 - w * 1.4) - w * 2.2) * sc;
        c.fillStyle = w === 0 ? pal.accent : (w === 1 ? pal.horn : pal.secondary);
        c.beginPath();
        c.moveTo((3 - w * 2.5) * sc, -1 * sc);
        c.quadraticCurveTo((-2 - w * 2) * sc, wY, (-14 - w * 2) * sc, wY * 0.8);
        c.quadraticCurveTo(-5 * sc, -1 * sc, (3 - w * 2.5) * sc, -1 * sc);
        c.fill();
    }

    // Cuerpo fénix
    c.fillStyle = pal.body;
    c.beginPath();
    c.ellipse(1 * sc, 0, 6.8 * sc, 2.6 * sc, 0, 0, Math.PI * 2);
    c.fill();

    // Cabeza con penacho ígneo
    c.beginPath();
    c.moveTo(6 * sc, -2 * sc);
    c.lineTo(11.5 * sc, -0.5 * sc);
    c.lineTo(6 * sc, 1.8 * sc);
    c.closePath();
    c.fill();

    drawCreatureEye(c, 8.2 * sc, -0.7 * sc, 0.95 * sc, cr, pal);
}

// =========================================================================
// 11. ANOMALY
// =========================================================================

function drawAnomSeraphPoly(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const rot = timeSec * 1.0;

    // Anillo astrolábico orbital
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.2 * sc;
    c.beginPath();
    c.ellipse(0, 0, 12.5 * sc, 4.2 * sc, rot * 0.6, 0, Math.PI * 2);
    c.stroke();

    // 4 Alas cristalinas independientes
    for (let i = 0; i < 4; i++) {
        const side = i < 2 ? -1 : 1;
        const vert = i % 2 === 0 ? -1 : 1;
        const breathe = Math.sin(timeSec * 3 + i) * 1.6 * sc;
        c.fillStyle = pal.secondary;
        c.strokeStyle = pal.horn;
        c.lineWidth = 1.0 * sc;
        c.beginPath();
        c.moveTo(side * 4 * sc, vert * 1.5 * sc);
        c.lineTo(side * (11.5 * sc + breathe), vert * 7.5 * sc);
        c.lineTo(side * 6.5 * sc, vert * 2.0 * sc);
        c.closePath();
        c.fill();
        c.stroke();
    }

    // Octaedro central
    c.fillStyle = pal.body;
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.2 * sc;
    c.beginPath();
    c.moveTo(0, -6.5 * sc);
    c.lineTo(4.8 * sc, 0);
    c.lineTo(0, 6.5 * sc);
    c.lineTo(-4.8 * sc, 0);
    c.closePath();
    c.fill();
    c.stroke();

    drawCreatureEye(c, 0, 0, 1.4 * sc, cr, pal);
}

function drawAnomRiftStalker(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const air = cr.isAirborne;
    const flicker = (cr.blinkPhaseTimer > 0) ? 0.38 : 1.0;

    c.save();
    c.globalAlpha = flicker;

    // Piernas largas sombrías
    const p1 = calcStepTarget(-4 * sc, 0, ph, 4.5 * sc, 3.0 * sc, air);
    const p2 = calcStepTarget(4 * sc, 0, ph + Math.PI, 4.5 * sc, 3.0 * sc, air);
    drawArticulatedLeg(c, -2 * sc, -9 * sc, p1.x, p1.y, 5.2 * sc, 5.4 * sc, -1, 1.6 * sc, 0.8 * sc, adjustHexBrightness(pal.body, 0.55), 'claw', pal.accent);
    drawArticulatedLeg(c, 2 * sc, -9 * sc, p2.x, p2.y, 5.2 * sc, 5.4 * sc, 1, 1.6 * sc, 0.8 * sc, pal.body, 'claw', pal.horn);

    // Manto fractal deshilachado
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(-6 * sc, -7 * sc);
    c.quadraticCurveTo(-4 * sc, -18 * sc, 2 * sc, -18.5 * sc);
    c.quadraticCurveTo(6 * sc, -13 * sc, 4 * sc, -7 * sc);
    c.lineTo(-1 * sc, -9 * sc);
    c.closePath();
    c.fill();

    // Brazos largos con garras de vacío
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.5 * sc;
    c.beginPath();
    c.moveTo(2 * sc, -14 * sc);
    c.lineTo(8 * sc, -10 * sc);
    c.lineTo(10.5 * sc, -12.5 * sc);
    c.stroke();

    // Corona de ojos violeta
    drawCreatureEye(c, 2.5 * sc, -16.5 * sc, 1.0 * sc, cr, pal);
    drawCreatureEye(c, 0.2 * sc, -17.5 * sc, 0.7 * sc, cr, pal, false);
    drawCreatureEye(c, 4.0 * sc, -15.2 * sc, 0.65 * sc, cr, pal, false);
    c.restore();
}

function drawAnomOracleEye(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const rot = timeSec * 0.85;

    // 3 Anillos concéntricos giratorios con runas
    for (let r = 0; r < 3; r++) {
        c.strokeStyle = r === 1 ? pal.horn : pal.accent;
        c.lineWidth = (1.6 - r * 0.25) * sc;
        c.beginPath();
        c.ellipse(0, 0, (14.5 - r * 3.0) * sc, (5.0 - r * 1.0) * sc, rot * (r % 2 === 0 ? 1 : -1.3) + r * 0.8, 0, Math.PI * 2);
        c.stroke();
    }

    // 4 Pilares satélites orbitando
    for (let p = 0; p < 4; p++) {
        const a = rot * 1.2 + (p * Math.PI * 0.5);
        const px = Math.cos(a) * 11 * sc;
        const py = Math.sin(a) * 6 * sc;
        c.fillStyle = pal.secondary;
        c.beginPath();
        c.moveTo(px, py - 2.6 * sc);
        c.lineTo(px + 1.4 * sc, py);
        c.lineTo(px, py + 2.6 * sc);
        c.lineTo(px - 1.4 * sc, py);
        c.closePath();
        c.fill();
    }

    // Esfera ocular arcana central
    c.fillStyle = pal.body;
    c.beginPath();
    c.arc(0, 0, 5.4 * sc, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.2 * sc;
    c.stroke();

    drawCreatureEye(c, 0, 0, 2.5 * sc, cr, pal);
}

// =========================================================================
// 12. ARTIFICIAL
// =========================================================================

function drawArtRepairBot(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const bob = Math.sin(timeSec * 5) * 1.4 * sc;

    c.save();
    c.translate(0, bob);
    // Mini-alas estabilizadoras
    const tilt = Math.sin(timeSec * 9) * 0.2;
    c.fillStyle = pal.secondary;
    c.beginPath();
    c.ellipse(-2 * sc, -4.5 * sc + tilt * 3, 5.0 * sc, 1.4 * sc, -0.35, 0, Math.PI * 2);
    c.fill();

    // Carcasa esférica limpia
    c.fillStyle = pal.body;
    c.beginPath();
    c.arc(0, 0, 4.4 * sc, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.1 * sc;
    c.stroke();

    // Pinza retráctil inferior
    c.strokeStyle = pal.horn;
    c.lineWidth = 1.0 * sc;
    c.beginPath();
    c.moveTo(1.5 * sc, 3.8 * sc);
    c.lineTo(3.5 * sc, 6.2 * sc);
    c.stroke();

    drawCreatureEye(c, 2.4 * sc, -0.4 * sc, 1.25 * sc, cr, pal);
    c.restore();
}

function drawArtHunterDrone(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const hover = Math.sin(timeSec * 6) * 1.2 * sc;

    c.save();
    c.translate(0, hover);
    // Haz de escaneo láser rojo cuando persigue/alerta
    if (cr.aiState === 'CHASE' || cr.aiState === 'ATTACK' || cr.aiState === 'TELEGRAPH') {
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = 'rgba(244, 63, 94, 0.16)';
        c.beginPath();
        c.moveTo(6 * sc, 1 * sc);
        c.lineTo(28 * sc, 14 * sc);
        c.lineTo(18 * sc, 19 * sc);
        c.closePath();
        c.fill();
        c.restore();
    }

    // Turbinas laterales
    c.fillStyle = pal.secondary;
    safeRoundRect(c, -6.5 * sc, -4.5 * sc, 4.5 * sc, 2.5 * sc, 1 * sc);
    c.fill();

    // Chasis hexagonal agresivo
    c.fillStyle = pal.body;
    c.beginPath();
    c.moveTo(-7 * sc, 0);
    c.lineTo(-2 * sc, -4.2 * sc);
    c.lineTo(8.5 * sc, -1.0 * sc);
    c.lineTo(8.5 * sc, 1.5 * sc);
    c.lineTo(-2 * sc, 4.0 * sc);
    c.closePath();
    c.fill();
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.2 * sc;
    c.stroke();

    // Cañón ventral
    c.fillStyle = pal.horn;
    c.fillRect(2 * sc, 3.2 * sc, 5.5 * sc, 1.5 * sc);

    drawCreatureEye(c, 5.2 * sc, 0, 1.15 * sc, cr, pal);
    c.restore();
}

function drawArtSiegeMech(c, cr, timeSec) {
    const sc = cr.scale;
    const pal = cr.palette;
    const ph = cr.walkCycle;
    const dark = adjustHexBrightness(pal.body, 0.6);
    const bob = Math.abs(Math.sin(ph)) * 0.9 * sc;

    // Piernas hidráulicas inversas (fondo + frente)
    const pR = calcStepTarget(-3.5 * sc, 0, ph + Math.PI, 3.2 * sc, 1.6 * sc, false);
    const pL = calcStepTarget(3.5 * sc, 0, ph, 3.2 * sc, 1.6 * sc, false);
    drawArticulatedLeg(c, -2.5 * sc, -9.5 * sc + bob, pR.x, pR.y, 5.6 * sc, 5.8 * sc, -1, 2.8 * sc, 2.0 * sc, dark, 'claw', null);
    drawArticulatedLeg(c, 2.0 * sc, -9.5 * sc + bob, pL.x, pL.y, 5.6 * sc, 5.8 * sc, -1, 3.0 * sc, 2.2 * sc, pal.secondary, 'claw', pal.accent);

    // Torso blindado con hombrera lanzamisiles
    c.fillStyle = pal.body;
    c.beginPath();
    safeRoundRect(c, -7.5 * sc, -20.5 * sc + bob, 14.0 * sc, 11.5 * sc, 2.2 * sc);
    c.fill();
    c.strokeStyle = pal.accent;
    c.lineWidth = 1.3 * sc;
    c.stroke();

    // Hombrera lanzamisiles superior
    c.fillStyle = pal.secondary;
    c.beginPath();
    safeRoundRect(c, -5.5 * sc, -24.0 * sc + bob, 7.0 * sc, 3.8 * sc, 1.0 * sc);
    c.fill();

    // Reactor central pulsante
    const rPulse = Math.sin(timeSec * 4.5) * 0.25 + 1.0;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = pal.glow;
    c.beginPath();
    c.arc(1.5 * sc, -14.5 * sc + bob, 3.2 * sc * rPulse, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Cañón de brazo pesado
    c.fillStyle = pal.secondary;
    c.fillRect(3.0 * sc, -13.5 * sc + bob, 10.5 * sc, 3.0 * sc);
    c.fillStyle = pal.horn;
    c.fillRect(12.0 * sc, -13.2 * sc + bob, 2.0 * sc, 2.4 * sc);

    // Visor óptico
    drawCreatureEye(c, 4.8 * sc, -17.5 * sc + bob, 1.25 * sc, cr, pal);
}
