/**
 * ============================================================================
 * ÉTER — TALLER DE ENSAMBLAJE DE COHETES (ROCKET BUILDER VAB · ESTILO SFS)
 * Construcción modular limpia, personalizable (color + textura), simetría 2x
 * real, encaje magnético inteligente y física newtoniana acoplada al mundo.
 * ============================================================================
 */

const FLIGHT_SCALE = 0.5;
const WORLD_G_REF = 285; // 1.0 G en unidades del mundo ÉTER (px/s²)

// --- HELPERS DE DIMENSIONES PERSONALIZADAS Y ESCALADO DE PROPIEDADES ---
function getPartSize(part, def) {
    if (!def) return { width: 24, height: 24, wScale: 1, hScale: 1 };
    const w = (part && typeof part.customWidth === 'number' && part.customWidth > 0) ? part.customWidth : def.width;
    const h = (part && typeof part.customHeight === 'number' && part.customHeight > 0) ? part.customHeight : def.height;
    return {
        width: w,
        height: h,
        wScale: w / Math.max(1, def.width),
        hScale: h / Math.max(1, def.height)
    };
}

function getPartScaledStats(part, def) {
    if (!def) return { dryMass: 0.5, fuelCapacity: 0, thrust: 0, warpThrust: 0, consumption: 0, hull: 50, rcsPower: 0, electricalGen: 0 };
    const sz = getPartSize(part, def);
    const areaScale = sz.wScale * sz.hScale;
    const isUnscaled = (Math.abs(sz.wScale - 1) < 0.001 && Math.abs(sz.hScale - 1) < 0.001);
    if (isUnscaled) {
        return {
            dryMass: def.dryMass || 0,
            fuelCapacity: def.fuelCapacity || 0,
            thrust: def.thrust || 0,
            warpThrust: def.warpThrust || 0,
            consumption: def.consumption || 0,
            hull: def.hull || 50,
            rcsPower: def.rcsPower || 0,
            electricalGen: def.electricalGen || 0
        };
    }
    const massMult = Math.max(0.15, Math.pow(areaScale, 0.92));
    const thrustMult = Math.max(0.15, Math.pow(sz.wScale, 1.35) * Math.pow(sz.hScale, 0.45));
    return {
        dryMass: (def.dryMass || 0) * massMult,
        fuelCapacity: (def.fuelCapacity || 0) * areaScale,
        thrust: (def.thrust || 0) * thrustMult,
        warpThrust: (def.warpThrust || 0) * thrustMult,
        consumption: (def.consumption || 0) * thrustMult,
        hull: Math.max(20, (def.hull || 50) * Math.pow(areaScale, 0.7)),
        rcsPower: (def.rcsPower || 0) * Math.pow(areaScale, 0.8),
        electricalGen: (def.electricalGen || 0) * areaScale
    };
}

// --- DIBUJO UNIFICADO DE COFIAS (TRANSPARENTE EN TALLER, OPACO EN VUELO, MITADES AL ABRIR) ---
function drawFairingPart(ctx, w, h, s, def, opts = {}) {
    const baseRatio = opts.baseRatio || 1.0; // < 1.0 para cofias tipo bulbo
    const baseW = w * baseRatio;
    const baseH = Math.min(8, Math.max(5, h * 0.09));
    const shoulderY = -h * 0.08; // Inicio de la ojiva superior
    const neckY = h * 0.5 - baseH - (baseRatio < 0.95 ? Math.min(14, h * 0.14) : 0);
    const tipHalfW = Math.max(2, w * 0.08);
    const inBuilder = !!(s && s.inBuilder);
    const isOpened = !!(s && s.fairingOpened);
    const halfMode = s && s.fairingHalf; // 'left' | 'right' | undefined

    const traceShellPath = (side) => {
        ctx.beginPath();
        if (side === 'left') {
            ctx.moveTo(0, -h * 0.5);
            ctx.lineTo(-tipHalfW, -h * 0.5);
            ctx.bezierCurveTo(-w * 0.48, -h * 0.34, -w * 0.5, shoulderY, -w * 0.5, neckY);
            ctx.lineTo(-baseW * 0.5, h * 0.5 - baseH);
            ctx.lineTo(0, h * 0.5 - baseH);
            ctx.closePath();
        } else if (side === 'right') {
            ctx.moveTo(0, -h * 0.5);
            ctx.lineTo(tipHalfW, -h * 0.5);
            ctx.bezierCurveTo(w * 0.48, -h * 0.34, w * 0.5, shoulderY, w * 0.5, neckY);
            ctx.lineTo(baseW * 0.5, h * 0.5 - baseH);
            ctx.lineTo(0, h * 0.5 - baseH);
            ctx.closePath();
        } else {
            ctx.moveTo(-tipHalfW, -h * 0.5);
            ctx.lineTo(tipHalfW, -h * 0.5);
            ctx.bezierCurveTo(w * 0.48, -h * 0.34, w * 0.5, shoulderY, w * 0.5, neckY);
            ctx.lineTo(baseW * 0.5, h * 0.5 - baseH);
            ctx.lineTo(-baseW * 0.5, h * 0.5 - baseH);
            ctx.lineTo(-w * 0.5, neckY);
            ctx.bezierCurveTo(-w * 0.5, shoulderY, -w * 0.48, -h * 0.34, -tipHalfW, -h * 0.5);
            ctx.closePath();
        }
    };

    // 1. Anillo base estructural (siempre visible salvo en las mitades desprendidas)
    if (!halfMode) {
        ctx.save();
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(-baseW * 0.5, h * 0.5 - baseH, baseW, baseH);
        ctx.fill();
        ctx.stroke();
        // Detalles de anclaje en el anillo base
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-baseW * 0.38, h * 0.5 - baseH + 1.5, Math.max(2, baseW * 0.14), Math.max(1.5, baseH - 3));
        ctx.fillRect(baseW * 0.24, h * 0.5 - baseH + 1.5, Math.max(2, baseW * 0.14), Math.max(1.5, baseH - 3));
        ctx.restore();
    }

    if (isOpened) return; // En vuelo tras abrir, solo queda el anillo base

    // 2. Carcasa de la cofia
    if (inBuilder) {
        // Modo Taller VAB: semi-transparente estilo SFS para ver y armar la carga útil adentro
        ctx.save();
        traceShellPath(null);
        ctx.fillStyle = s?.color || def?.defaultColor || '#f1f5f9';
        ctx.globalAlpha = 0.18;
        ctx.fill();

        // Gradiente interno suave
        const grad = ctx.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0.22)');
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = grad;
        ctx.fill();

        // Contorno nítido de la cofia
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Línea de separación central discontinua
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(0, h * 0.5 - baseH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    } else {
        // Modo Vuelo (opaco, con acabado completo y línea de separación)
        applyPartBodyFinish(ctx, w, h, s, def, () => traceShellPath(halfMode || null));
        if (!halfMode) {
            ctx.save();
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(0, -h * 0.48);
            ctx.lineTo(0, h * 0.5 - baseH);
            ctx.stroke();
            ctx.restore();
        }
    }
}

// --- HELPER DE DESGASTE TÉRMICO Y QUEMADURAS DE REENTRADA POR PIEZA ---
function drawPartThermalScorch(ctx, w, h, partState, def, tex) {
    const sc = partState && partState.scorch;
    if (!sc) return;
    const amt = Math.max(0, Math.min(1, sc.amount || 0));
    const temp = Math.max(0, Math.min(1, sc.temp || 0));
    if (amt <= 0.005 && temp <= 0.015) return;

    const dLen = Math.hypot(sc.dirX || 0, sc.dirY || 0) || 1;
    const dx = (sc.dirX || 0) / dLen;
    const dy = (sc.dirY || -1) / dLen;
    const px = -dy;
    const py = dx;

    const rFlow = Math.abs(dx) * w * 0.5 + Math.abs(dy) * h * 0.5 + 1;
    const rPerp = Math.abs(px) * w * 0.5 + Math.abs(py) * h * 0.5 + 1;
    const isShield = !!(def && def.isHeatShield);

    // 1. Carbonización y hollín direccional persistente (lado de barlovento -> sotavento)
    if (amt > 0.005) {
        const reach = 0.25 + 0.85 * Math.pow(amt, 0.72); // Qué tan lejos llega la quemadura hacia atrás
        const x0 = dx * rFlow;
        const y0 = dy * rFlow;
        const x1 = dx * rFlow * (1 - 2 * reach);
        const y1 = dy * rFlow * (1 - 2 * reach);

        const sootGrad = ctx.createLinearGradient(x0, y0, x1, y1);
        if (isShield) {
            // Escudo térmico ablativo: carbonización fenólica profunda y rica
            sootGrad.addColorStop(0, `rgba(10, 8, 8, ${0.86 * Math.min(1, amt * 1.15)})`);
            sootGrad.addColorStop(0.45, `rgba(38, 22, 14, ${0.58 * amt})`);
            sootGrad.addColorStop(0.8, `rgba(24, 18, 15, ${0.24 * amt})`);
            sootGrad.addColorStop(1, 'rgba(15, 12, 10, 0)');
        } else if (tex === 'tiles' || tex === 'carbon') {
            // Losetas térmicas / carbono: polvo de ceniza y óxido sutil para conservar la grilla
            sootGrad.addColorStop(0, `rgba(12, 10, 10, ${0.55 * amt})`);
            sootGrad.addColorStop(0.4, `rgba(68, 42, 26, ${0.32 * amt})`);
            sootGrad.addColorStop(1, 'rgba(20, 16, 14, 0)');
        } else if (tex === 'steel') {
            // Acero inoxidable (estilo Starship): temple térmico iridiscente + hollín
            sootGrad.addColorStop(0, `rgba(14, 12, 14, ${0.78 * amt})`);
            sootGrad.addColorStop(0.28, `rgba(76, 48, 92, ${0.34 * amt})`);
            sootGrad.addColorStop(0.55, `rgba(180, 125, 58, ${0.26 * amt})`);
            sootGrad.addColorStop(1, 'rgba(20, 18, 22, 0)');
        } else if (tex === 'foil') {
            // Lámina dorada MLI: chamuscado bronce oscuro
            sootGrad.addColorStop(0, `rgba(18, 12, 8, ${0.82 * amt})`);
            sootGrad.addColorStop(0.45, `rgba(92, 52, 18, ${0.46 * amt})`);
            sootGrad.addColorStop(1, 'rgba(28, 18, 10, 0)');
        } else {
            // Pintura aeroespacial (smooth / stripes): hollín marrón-carbón estilo Falcon 9
            sootGrad.addColorStop(0, `rgba(12, 10, 10, ${0.84 * Math.min(1, amt * 1.1)})`);
            sootGrad.addColorStop(0.32, `rgba(48, 28, 16, ${0.56 * amt})`);
            sootGrad.addColorStop(0.68, `rgba(28, 24, 22, ${0.28 * amt})`);
            sootGrad.addColorStop(1, 'rgba(18, 16, 16, 0)');
        }
        ctx.fillStyle = sootGrad;
        ctx.fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);

        // 2. Estelas deterministas de hollín barridas por el flujo de plasma
        const seedBase = typeof sc.seed === 'number' ? sc.seed : 0.42;
        const streakCount = Math.max(4, Math.min(9, Math.round(rPerp / 3.5) + 3));
        for (let i = 0; i < streakCount; i++) {
            // Pseudo-aleatorio determinista por pieza y estela (sin parpadeo)
            const h1 = Math.sin((seedBase * 127.1 + i * 31.7) * 43758.5453);
            const r1 = h1 - Math.floor(h1);
            const h2 = Math.sin((seedBase * 269.5 + i * 73.1) * 19341.123);
            const r2 = h2 - Math.floor(h2);

            const lat = (r1 * 1.76 - 0.88) * rPerp;
            const startAdvance = rFlow * (0.78 + r2 * 0.24);
            const streakLen = rFlow * (0.45 + amt * (0.75 + r2 * 0.65));
            const sx = dx * startAdvance + px * lat;
            const sy = dy * startAdvance + py * lat;
            const ex = sx - dx * streakLen;
            const ey = sy - dy * streakLen;

            const stGrad = ctx.createLinearGradient(sx, sy, ex, ey);
            const sAlpha = (tex === 'tiles' || tex === 'carbon' ? 0.34 : 0.56) * amt * (0.55 + r1 * 0.45);
            stGrad.addColorStop(0, `rgba(10, 8, 8, ${sAlpha})`);
            stGrad.addColorStop(0.45, `rgba(42, 24, 14, ${sAlpha * 0.55})`);
            stGrad.addColorStop(1, 'rgba(15, 12, 10, 0)');

            ctx.strokeStyle = stGrad;
            ctx.lineWidth = Math.max(1.1, (1.4 + r2 * 2.6) * (0.5 + 0.6 * amt));
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }
    }

    // 3. Incandescencia térmica activa en el borde expuesto durante/después de la reentrada
    if (temp > 0.015) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gx0 = dx * rFlow * 1.05;
        const gy0 = dy * rFlow * 1.05;
        const gx1 = dx * rFlow * (1 - 1.15 * Math.min(1, 0.35 + temp * 0.65));
        const gy1 = dy * rFlow * (1 - 1.15 * Math.min(1, 0.35 + temp * 0.65));
        const heatGrad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);

        if (temp > 0.65) {
            heatGrad.addColorStop(0, `rgba(254, 240, 138, ${0.72 * temp})`);
            heatGrad.addColorStop(0.35, `rgba(249, 115, 22, ${0.58 * temp})`);
            heatGrad.addColorStop(0.75, `rgba(220, 38, 38, ${0.28 * temp})`);
            heatGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
            heatGrad.addColorStop(0, `rgba(249, 115, 22, ${0.65 * temp})`);
            heatGrad.addColorStop(0.45, `rgba(220, 38, 38, ${0.38 * temp})`);
            heatGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.fillStyle = heatGrad;
        ctx.fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
        ctx.restore();
    }
}

// --- HELPER DE ACABADO SFS (COLOR + TEXTURA + SOMBRA CILÍNDRICA) ---
function applyPartBodyFinish(ctx, w, h, partState, def, drawPathFn, opts = {}) {
    const baseColor = (partState && partState.color) || (def && def.defaultColor) || '#f1f5f9';
    const tex = (partState && partState.texture) || (def && def.defaultTexture) || 'smooth';

    ctx.save();
    drawPathFn();
    ctx.fillStyle = baseColor;
    ctx.fill();

    // Recortar al contorno de la pieza para aplicar textura y sombreado cilíndrico
    ctx.save();
    drawPathFn();
    ctx.clip();

    if (tex === 'steel') {
        const st = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        st.addColorStop(0, 'rgba(15,23,42,0.22)');
        st.addColorStop(0.28, 'rgba(255,255,255,0.34)');
        st.addColorStop(0.55, 'rgba(255,255,255,0.08)');
        st.addColorStop(0.82, 'rgba(15,23,42,0.18)');
        st.addColorStop(1, 'rgba(2,6,23,0.35)');
        ctx.fillStyle = st;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        // Bandas de soldadura horizontales
        ctx.strokeStyle = 'rgba(15,23,42,0.24)';
        ctx.lineWidth = 0.8;
        const step = Math.max(14, Math.round(h / 4));
        for (let yy = -h / 2 + step; yy < h / 2 - 4; yy += step) {
            ctx.beginPath();
            ctx.moveTo(-w / 2, yy);
            ctx.lineTo(w / 2, yy);
            ctx.stroke();
        }
    } else if (tex === 'stripes') {
        ctx.fillStyle = 'rgba(15,23,42,0.28)';
        if (h >= w) {
            ctx.fillRect(-w / 2, -h / 2 + 4, w, Math.max(5, h * 0.14));
            ctx.fillRect(-w / 2, h / 2 - Math.max(9, h * 0.18), w, Math.max(5, h * 0.14));
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(-w / 2, -3, w * 0.5, 6);
        } else {
            ctx.fillRect(-w / 2, -3, w, 6);
        }
    } else if (tex === 'tiles') {
        ctx.fillStyle = 'rgba(15,23,42,0.38)';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 0.6;
        const gs = 7;
        ctx.beginPath();
        for (let xx = -w / 2; xx <= w / 2; xx += gs) {
            ctx.moveTo(xx, -h / 2);
            ctx.lineTo(xx, h / 2);
        }
        for (let yy = -h / 2; yy <= h / 2; yy += gs) {
            ctx.moveTo(-w / 2, yy);
            ctx.lineTo(w / 2, yy);
        }
        ctx.stroke();
    } else if (tex === 'carbon') {
        ctx.fillStyle = 'rgba(2,6,23,0.45)';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let d = -w - h; d < w + h; d += 6) {
            ctx.moveTo(d, -h / 2);
            ctx.lineTo(d + h, h / 2);
        }
        ctx.stroke();
    } else if (tex === 'foil') {
        const fg = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        fg.addColorStop(0, 'rgba(234,179,8,0.55)');
        fg.addColorStop(0.35, 'rgba(254,240,138,0.65)');
        fg.addColorStop(0.65, 'rgba(202,138,4,0.55)');
        fg.addColorStop(1, 'rgba(161,98,7,0.65)');
        ctx.fillStyle = fg;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let yy = -h / 2 + 5; yy < h / 2; yy += 8) {
            ctx.moveTo(-w / 2, yy);
            ctx.lineTo(0, yy + 2);
            ctx.lineTo(w / 2, yy - 1);
        }
        ctx.stroke();
    }

    // Sombreado cilíndrico SFS limpio y sutil
    if (!opts.noCylinderShade) {
        const cyl = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        cyl.addColorStop(0, 'rgba(0,0,0,0.22)');
        cyl.addColorStop(0.22, 'rgba(255,255,255,0.20)');
        cyl.addColorStop(0.55, 'rgba(255,255,255,0.02)');
        cyl.addColorStop(1, 'rgba(0,0,0,0.28)');
        ctx.fillStyle = cyl;
        ctx.fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
    }

    // Desgaste térmico y quemaduras direccionales de reentrada atmosférica
    if (partState && partState.scorch) {
        drawPartThermalScorch(ctx, w, h, partState, def, tex);
    }

    ctx.restore();

    // Contorno limpio
    drawPathFn();
    ctx.strokeStyle = opts.strokeColor || '#0f172a';
    ctx.lineWidth = opts.lineWidth || 1.1;
    ctx.stroke();
    ctx.restore();
}

// --- 1. CATÁLOGO MAESTRO DE PIEZAS MODULARES (ESTILO SFS LIMPIO) ---
const ROCKET_PARTS_CATALOG = {
    // ------------------------------------------------------------------------
    // CÁPSULAS Y SONDAS DE MANDO
    // ------------------------------------------------------------------------
    capsule_vesper: {
        id: 'capsule_vesper',
        category: 'capsules',
        name: 'Cápsula Mk-1',
        tagline: 'Cabina aerodinámica estándar (1 tripulante, SAS integrado)',
        width: 30,
        height: 34,
        dryMass: 1.0,
        fuelCapacity: 15,
        thrust: 0,
        passengers: 1,
        hull: 120,
        electricalGen: 4,
        dragCoeff: 0.22,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -17 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 17 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.capsule_vesper, () => {
                ctx.beginPath();
                ctx.moveTo(-w / 2, h / 2);
                ctx.lineTo(-w * 0.26, -h / 2);
                ctx.lineTo(w * 0.26, -h / 2);
                ctx.lineTo(w / 2, h / 2);
                ctx.closePath();
            });
            // Escudo térmico inferior limpio
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-w / 2 + 1, h / 2 - 3.5, w - 2, 3.5);
            // Ventanilla simple
            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.roundRect(-5, -4, 10, 7, 2.5);
            ctx.fill();
            ctx.stroke();
        }
    },

    capsule_titan: {
        id: 'capsule_titan',
        category: 'capsules',
        name: 'Cápsula Mk-2 Pesada',
        tagline: 'Módulo de mando ancho para 3 tripulantes con escudo térmico',
        width: 40,
        height: 38,
        dryMass: 2.2,
        fuelCapacity: 30,
        thrust: 0,
        passengers: 3,
        hull: 220,
        electricalGen: 6,
        dragCoeff: 0.26,
        defaultColor: '#cbd5e1',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -19 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 19 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.capsule_titan, () => {
                ctx.beginPath();
                ctx.moveTo(-w / 2, h / 2);
                ctx.lineTo(-w * 0.3, -h / 2);
                ctx.lineTo(w * 0.3, -h / 2);
                ctx.lineTo(w / 2, h / 2);
                ctx.closePath();
            });
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-w / 2 + 1, h / 2 - 4, w - 2, 4);
            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 0.8;
            [-8, 0, 8].forEach(ox => {
                ctx.beginPath();
                ctx.arc(ox, -2, 2.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        }
    },

    capsule_cupola: {
        id: 'capsule_cupola',
        category: 'capsules',
        name: 'Cúpula Panorámica',
        tagline: 'Observatorio espacial simple de 2 plazas con cristal templado',
        width: 40,
        height: 34,
        dryMass: 1.4,
        fuelCapacity: 10,
        thrust: 0,
        passengers: 2,
        hull: 110,
        electricalGen: 4,
        dragCoeff: 0.3,
        defaultColor: '#cbd5e1',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -17 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 17 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.capsule_cupola, () => {
                ctx.beginPath();
                ctx.rect(-w / 2, h / 2 - 12, w, 12);
            });
            // Domo simple
            const dg = ctx.createRadialGradient(-3, -4, 2, 0, 2, w * 0.45);
            dg.addColorStop(0, '#bae6fd');
            dg.addColorStop(0.7, '#0284c7');
            dg.addColorStop(1, '#0c4a6e');
            ctx.fillStyle = dg;
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.arc(0, h / 2 - 12, w * 0.42, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    },

    probe_hex: {
        id: 'probe_hex',
        category: 'capsules',
        name: 'Núcleo Sonda Autónoma',
        tagline: 'Unidad de control no tripulada ligera con SAS de precisión',
        width: 20,
        height: 20,
        dryMass: 0.4,
        fuelCapacity: 0,
        thrust: 0,
        passengers: 0,
        hull: 80,
        electricalGen: 2,
        dragCoeff: 0.2,
        defaultColor: '#eab308',
        defaultTexture: 'foil',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -10 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 10 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.probe_hex, () => {
                ctx.beginPath();
                ctx.roundRect(-w / 2, -h / 2, w, h, 3);
            });
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    capsule_probe_cube: {
        id: 'capsule_probe_cube',
        category: 'capsules',
        name: 'Satélite CubeSat',
        tagline: 'Módulo de sonda ultraligero para satélites y etapas superiores',
        width: 18,
        height: 16,
        dryMass: 0.25,
        fuelCapacity: 0,
        thrust: 0,
        passengers: 0,
        hull: 75,
        electricalGen: 3,
        dragCoeff: 0.16,
        defaultColor: '#cbd5e1',
        defaultTexture: 'foil',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -8 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 8 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.capsule_probe_cube, () => {
                ctx.beginPath();
                ctx.rect(-w / 2, -h / 2, w, h);
            });
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-w / 2 + 3, -3, w - 6, 6);
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // ------------------------------------------------------------------------
    // TANQUES DE COMBUSTIBLE (CON NIVEL AJUSTABLE 0-100%)
    // ------------------------------------------------------------------------
    tank_tiny: {
        id: 'tank_tiny',
        category: 'tanks',
        name: 'Tanque Mini XS',
        tagline: 'Tanque estrecho (20px) ideal para sondas y etapas superiores',
        width: 20,
        height: 18,
        dryMass: 0.15,
        fuelCapacity: 70,
        thrust: 0,
        hull: 75,
        dragCoeff: 0.11,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -9 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 9 }
        ],
        draw: (ctx, w, h, s) => drawSimpleTank(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_tiny)
    },

    tank_micro_s: {
        id: 'tank_micro_s',
        category: 'tanks',
        name: 'Tanque Corto S',
        tagline: 'Depósito compacto ideal para etapas superiores y landers',
        width: 30,
        height: 20,
        dryMass: 0.3,
        fuelCapacity: 150,
        thrust: 0,
        hull: 90,
        dragCoeff: 0.14,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -10 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 10 }
        ],
        draw: (ctx, w, h, s) => drawSimpleTank(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_micro_s)
    },

    tank_std_m: {
        id: 'tank_std_m',
        category: 'tanks',
        name: 'Tanque Estándar M',
        tagline: 'Tanque principal versátil de 30px de ancho',
        width: 30,
        height: 50,
        dryMass: 0.7,
        fuelCapacity: 400,
        thrust: 0,
        hull: 110,
        dragCoeff: 0.15,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -25 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 25 }
        ],
        draw: (ctx, w, h, s) => drawSimpleTank(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_std_m)
    },

    tank_long_l: {
        id: 'tank_long_l',
        category: 'tanks',
        name: 'Tanque Largo L',
        tagline: 'Cilindro de gran autonomía para primeras etapas',
        width: 30,
        height: 90,
        dryMass: 1.2,
        fuelCapacity: 800,
        thrust: 0,
        hull: 130,
        dragCoeff: 0.16,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -45 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 45 }
        ],
        draw: (ctx, w, h, s) => drawSimpleTank(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_long_l)
    },

    tank_wide_m: {
        id: 'tank_wide_m',
        category: 'tanks',
        name: 'Tanque Ancho M',
        tagline: 'Cuerpo medio de 40px para cohetes robustos',
        width: 40,
        height: 60,
        dryMass: 1.3,
        fuelCapacity: 900,
        thrust: 0,
        hull: 150,
        dragCoeff: 0.18,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -30 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 30 }
        ],
        draw: (ctx, w, h, s) => drawSimpleTank(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_wide_m)
    },

    tank_super_heavy: {
        id: 'tank_super_heavy',
        category: 'tanks',
        name: 'Tanque Pesado XL',
        tagline: 'Gran fuselaje de 50px para cargas pesadas',
        width: 50,
        height: 100,
        dryMass: 2.5,
        fuelCapacity: 1800,
        thrust: 0,
        hull: 220,
        dragCoeff: 0.22,
        defaultColor: '#cbd5e1',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -50 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 50 }
        ],
        draw: (ctx, w, h, s) => drawSimpleTank(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_super_heavy)
    },

    tank_jumbo_wide: {
        id: 'tank_jumbo_wide',
        category: 'tanks',
        name: 'Tanque Jumbo XXL',
        tagline: 'Fuselaje extra ancho (64px) de altísima capacidad para cohetes gigantes',
        width: 64,
        height: 90,
        dryMass: 3.4,
        fuelCapacity: 2600,
        thrust: 0,
        hull: 280,
        dragCoeff: 0.28,
        defaultColor: '#ea580c',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -45 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 45 }
        ],
        draw: (ctx, w, h, s) => drawSimpleTank(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_jumbo_wide)
    },

    tank_adapter_cone: {
        id: 'tank_adapter_cone',
        category: 'tanks',
        name: 'Adaptador Cónico',
        tagline: 'Transición aerodinámica de 30px a 50px con combustible',
        width: 50,
        height: 30,
        dryMass: 0.5,
        fuelCapacity: 250,
        thrust: 0,
        hull: 120,
        dragCoeff: 0.14,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -15 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 15 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_adapter_cone, () => {
                ctx.beginPath();
                ctx.moveTo(-15, -h / 2);
                ctx.lineTo(15, -h / 2);
                ctx.lineTo(w / 2, h / 2);
                ctx.lineTo(-w / 2, h / 2);
                ctx.closePath();
            });
        }
    },

    tank_spherical: {
        id: 'tank_spherical',
        category: 'tanks',
        name: 'Tanque Esférico',
        tagline: 'Depósito esférico ligero para sondas y módulos',
        width: 30,
        height: 30,
        dryMass: 0.4,
        fuelCapacity: 220,
        thrust: 0,
        hull: 90,
        dragCoeff: 0.2,
        defaultColor: '#cbd5e1',
        defaultTexture: 'foil',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -15 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 15 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_spherical, () => {
                ctx.beginPath();
                ctx.arc(0, 0, w / 2 - 1, 0, Math.PI * 2);
            });
        }
    },

    // ------------------------------------------------------------------------
    // MOTORES (CON DISTINTOS MODOS DE OPERACIÓN: ATMOSFÉRICO, VACÍO, SRB, IÓN)
    // ------------------------------------------------------------------------
    engine_titan_sea: {
        id: 'engine_titan_sea',
        category: 'engines',
        name: 'Motor "Titán" Atmósfera',
        tagline: 'Motor estándar de primera etapa para despegue planetario',
        width: 26,
        height: 24,
        dryMass: 1.5,
        fuelCapacity: 0,
        thrust: 210,
        warpThrust: 440,
        consumption: 2.6,
        engineMode: 'sea',
        flameColor: 'standard',
        nozzleOffset: { x: 0, y: 12, scale: 1.05 },
        hull: 140,
        dragCoeff: 0.2,
        defaultColor: '#475569',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -12 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 12 }
        ],
        draw: (ctx, w, h, s) => drawSimpleEngine(ctx, w, h, s, 'titan')
    },

    engine_hawk_vac: {
        id: 'engine_hawk_vac',
        category: 'engines',
        name: 'Motor "Halcón" Vacío',
        tagline: 'Alta eficiencia orbital (-45% consumo en el espacio)',
        width: 28,
        height: 26,
        dryMass: 0.75,
        fuelCapacity: 0,
        thrust: 85,
        warpThrust: 260,
        consumption: 0.85,
        engineMode: 'vacuum',
        flameColor: 'methalox',
        nozzleOffset: { x: 0, y: 13, scale: 1.15 },
        hull: 110,
        dragCoeff: 0.18,
        defaultColor: '#334155',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -13 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 13 }
        ],
        draw: (ctx, w, h, s) => drawSimpleEngine(ctx, w, h, s, 'vacuum')
    },

    engine_valiant: {
        id: 'engine_valiant',
        category: 'engines',
        name: 'Motor "Valiant"',
        tagline: 'Motor orbital equilibrado de segunda etapa con gimbal ágil',
        width: 26,
        height: 22,
        dryMass: 0.95,
        fuelCapacity: 0,
        thrust: 135,
        warpThrust: 380,
        consumption: 1.35,
        engineMode: 'vacuum',
        flameColor: 'methalox',
        nozzleOffset: { x: 0, y: 11, scale: 1.05 },
        hull: 125,
        dragCoeff: 0.16,
        defaultColor: '#475569',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -11 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 11 }
        ],
        draw: (ctx, w, h, s) => drawSimpleEngine(ctx, w, h, s, 'vacuum')
    },

    engine_frontier: {
        id: 'engine_frontier',
        category: 'engines',
        name: 'Motor "Frontier"',
        tagline: 'Sustainer de gran potencia para tanques anchos XL y XXL',
        width: 38,
        height: 26,
        dryMass: 2.3,
        fuelCapacity: 0,
        thrust: 360,
        warpThrust: 850,
        consumption: 4.1,
        engineMode: 'sea',
        flameColor: 'standard',
        nozzleOffset: { x: 0, y: 13, scale: 1.3 },
        hull: 185,
        dragCoeff: 0.22,
        defaultColor: '#334155',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -13 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 13 }
        ],
        draw: (ctx, w, h, s) => drawSimpleEngine(ctx, w, h, s, 'titan')
    },

    engine_raptor_cluster: {
        id: 'engine_raptor_cluster',
        category: 'engines',
        name: 'Clúster "Raptor" x3',
        tagline: 'Triple tobera de empuje masivo para cohetes súper pesados',
        width: 44,
        height: 26,
        dryMass: 3.2,
        fuelCapacity: 0,
        thrust: 480,
        warpThrust: 1050,
        consumption: 5.8,
        engineMode: 'sea',
        flameColor: 'methalox',
        nozzleOffset: { x: 0, y: 13, scale: 1.45 },
        hull: 200,
        dragCoeff: 0.25,
        defaultColor: '#334155',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -13 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 13 }
        ],
        draw: (ctx, w, h, s) => drawSimpleEngine(ctx, w, h, s, 'cluster')
    },

    engine_srb_booster: {
        id: 'engine_srb_booster',
        category: 'engines',
        name: 'Acelerador Sólido SRB',
        tagline: 'Motor + tanque sólido integrado (300L) de gran empuje inicial',
        width: 22,
        height: 76,
        dryMass: 1.1,
        fuelCapacity: 300,
        thrust: 220,
        warpThrust: 380,
        consumption: 3.6,
        engineMode: 'srb',
        flameColor: 'titan',
        nozzleOffset: { x: 0, y: 38, scale: 1.15 },
        hull: 150,
        dragCoeff: 0.16,
        defaultColor: '#f1f5f9',
        defaultTexture: 'stripes',
        radialAttachable: true,
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -38 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 38 },
            { id: 'left', type: 'radial', dir: 'left', x: -11, y: 0 },
            { id: 'right', type: 'radial', dir: 'right', x: 11, y: 0 }
        ],
        draw: (ctx, w, h, s) => {
            // Cuerpo sólido
            const bodyH = h - 14;
            ctx.save();
            ctx.translate(0, -7);
            applyPartBodyFinish(ctx, w, bodyH, s, ROCKET_PARTS_CATALOG.engine_srb_booster, () => {
                ctx.beginPath();
                ctx.rect(-w / 2, -bodyH / 2, w, bodyH);
            });
            ctx.restore();
            // Tobera inferior
            ctx.save();
            ctx.translate(0, h / 2 - 7);
            drawSimpleNozzleBell(ctx, 0, -7, w * 0.85, 14, '#fb923c');
            ctx.restore();
        }
    },

    engine_aerospike: {
        id: 'engine_aerospike',
        category: 'engines',
        name: 'Motor "Aerospike"',
        tagline: 'Rendimiento constante en atmósfera y vacío con plasma cian',
        width: 28,
        height: 20,
        dryMass: 1.2,
        fuelCapacity: 0,
        thrust: 165,
        warpThrust: 380,
        consumption: 1.75,
        engineMode: 'aerospike',
        flameColor: 'aerospike',
        nozzleOffset: { x: 0, y: 10, scale: 0.95 },
        hull: 130,
        dragCoeff: 0.14,
        defaultColor: '#334155',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -10 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 10 }
        ],
        draw: (ctx, w, h, s) => drawSimpleEngine(ctx, w, h, s, 'aerospike')
    },

    engine_ion_tachyon: {
        id: 'engine_ion_tachyon',
        category: 'engines',
        name: 'Propulsor Iónico',
        tagline: 'Consumo mínimo (0.06L/s) en vacío · +50% empuje con paneles solares',
        width: 20,
        height: 16,
        dryMass: 0.35,
        fuelCapacity: 0,
        thrust: 12,
        warpThrust: 160,
        consumption: 0.06,
        engineMode: 'ion',
        flameColor: 'ion',
        nozzleOffset: { x: 0, y: 8, scale: 0.6 },
        hull: 80,
        dragCoeff: 0.15,
        defaultColor: '#475569',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -8 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 8 }
        ],
        draw: (ctx, w, h, s) => drawSimpleEngine(ctx, w, h, s, 'ion')
    },

    engine_micro_lander: {
        id: 'engine_micro_lander',
        category: 'engines',
        name: 'Motor "Colibrí" Lander',
        tagline: 'Compacto y preciso para aterrizajes suaves en lunas y sondas',
        width: 18,
        height: 16,
        dryMass: 0.35,
        fuelCapacity: 0,
        thrust: 45,
        warpThrust: 140,
        consumption: 0.55,
        engineMode: 'lander',
        flameColor: 'standard',
        nozzleOffset: { x: 0, y: 8, scale: 0.68 },
        hull: 90,
        dragCoeff: 0.15,
        defaultColor: '#475569',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -8 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 8 }
        ],
        draw: (ctx, w, h, s) => drawSimpleEngine(ctx, w, h, s, 'micro')
    },

    // ------------------------------------------------------------------------
    // ENERGÍA Y PANELES SOLARES DESPLEGABLES (CLIC EN VUELO PARA ABRIR/CERRAR)
    // ------------------------------------------------------------------------
    solar_compact: {
        id: 'solar_compact',
        category: 'solar',
        name: 'Panel Solar 1x2',
        tagline: 'Haz clic en vuelo para desplegar o contraer (+15W)',
        width: 36,
        height: 14,
        foldedWidth: 8,
        foldedHeight: 14,
        dryMass: 0.15,
        electricalGen: 15,
        isSolarPanel: true,
        deployable: true,
        radialAttachable: true,
        dragCoeff: 0.06,
        defaultColor: '#cbd5e1',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'mount', type: 'radial', dir: 'right', x: 18, y: 0 }
        ],
        draw: (ctx, w, h, s) => drawDeployableSolarPanel(ctx, w, h, 2, s)
    },

    solar_array_1x3: {
        id: 'solar_array_1x3',
        category: 'solar',
        name: 'Panel Solar 1x3',
        tagline: 'Haz clic en vuelo para desplegar o contraer (+30W)',
        width: 52,
        height: 16,
        foldedWidth: 10,
        foldedHeight: 16,
        dryMass: 0.25,
        electricalGen: 30,
        isSolarPanel: true,
        deployable: true,
        radialAttachable: true,
        dragCoeff: 0.08,
        defaultColor: '#cbd5e1',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'mount', type: 'radial', dir: 'right', x: 26, y: 0 }
        ],
        draw: (ctx, w, h, s) => drawDeployableSolarPanel(ctx, w, h, 3, s)
    },

    solar_array_giant: {
        id: 'solar_array_giant',
        category: 'solar',
        name: 'Mega-Ala Solar 2x4',
        tagline: 'Gran matriz fotovoltaica desplegable (+70W para motor iónico)',
        width: 72,
        height: 22,
        foldedWidth: 12,
        foldedHeight: 22,
        dryMass: 0.55,
        electricalGen: 70,
        isSolarPanel: true,
        deployable: true,
        radialAttachable: true,
        dragCoeff: 0.12,
        defaultColor: '#cbd5e1',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'mount', type: 'radial', dir: 'right', x: 36, y: 0 }
        ],
        draw: (ctx, w, h, s) => drawDeployableSolarPanel(ctx, w, h, 4, s)
    },

    battery_quantum: {
        id: 'battery_quantum',
        category: 'solar',
        name: 'Módulo de Batería',
        tagline: 'Almacena energía y mejora la estabilidad del giroscopio SAS',
        width: 30,
        height: 12,
        dryMass: 0.3,
        electricalGen: 10,
        hull: 90,
        dragCoeff: 0.12,
        defaultColor: '#334155',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -6 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 6 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.battery_quantum, () => {
                ctx.beginPath();
                ctx.rect(-w / 2, -h / 2, w, h);
            });
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(-w / 2 + 4, -1.5, w - 8, 3);
        }
    },

    // ------------------------------------------------------------------------
    // RCS Y CONTROL
    // ------------------------------------------------------------------------
    rcs_quad: {
        id: 'rcs_quad',
        category: 'rcs',
        name: 'Propulsor RCS',
        tagline: 'Tobera de control de actitud para rotación y traslación (I/J/K/L)',
        width: 12,
        height: 14,
        dryMass: 0.1,
        rcsPower: 1.0,
        hull: 60,
        radialAttachable: true,
        dragCoeff: 0.05,
        defaultColor: '#e2e8f0',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'mount', type: 'radial', dir: 'right', x: 6, y: 0 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.rcs_quad, () => {
                ctx.beginPath();
                ctx.roundRect(-w / 2 + 2, -h / 2 + 2, w - 2, h - 4, 2);
            });
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-w / 2, -2, 3, 4);
            ctx.fillRect(-1, -h / 2, 3, 3);
            ctx.fillRect(-1, h / 2 - 3, 3, 3);
        }
    },

    rcs_heavy: {
        id: 'rcs_heavy',
        category: 'rcs',
        name: 'Bloque RCS Doble',
        tagline: 'Sistema RCS de alto torque para maniobrar cohetes grandes en vacío',
        width: 16,
        height: 18,
        dryMass: 0.22,
        rcsPower: 2.4,
        hull: 85,
        radialAttachable: true,
        dragCoeff: 0.07,
        defaultColor: '#cbd5e1',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'mount', type: 'radial', dir: 'right', x: 8, y: 0 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.rcs_heavy, () => {
                ctx.beginPath();
                ctx.roundRect(-w / 2 + 2, -h / 2 + 2, w - 2, h - 4, 3);
            });
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-w / 2, -4, 4, 3);
            ctx.fillRect(-w / 2, 1, 4, 3);
            ctx.fillRect(-2, -h / 2, 4, 3);
            ctx.fillRect(-2, h / 2 - 3, 4, 3);
        }
    },

    // ------------------------------------------------------------------------
    // ESTRUCTURA Y ATERRIZAJE
    // ------------------------------------------------------------------------
    decoupler_vertical: {
        id: 'decoupler_vertical',
        category: 'structures',
        name: 'Separador Axial',
        tagline: 'Anillo estructural limpio para dividir etapas del cohete',
        width: 30,
        height: 10,
        dryMass: 0.25,
        hull: 100,
        dragCoeff: 0.12,
        defaultColor: '#475569',
        defaultTexture: 'stripes',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -5 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 5 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.decoupler_vertical, () => {
                ctx.beginPath();
                ctx.rect(-w / 2, -h / 2, w, h);
            });
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-4, -1.5, 8, 3);
        }
    },

    decoupler_radial: {
        id: 'decoupler_radial',
        category: 'structures',
        name: 'Separador Lateral',
        tagline: 'Conector para acoplar aceleradores o tanques a los costados',
        width: 12,
        height: 22,
        dryMass: 0.2,
        hull: 90,
        radialAttachable: true,
        dragCoeff: 0.08,
        defaultColor: '#64748b',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'left', type: 'radial', dir: 'left', x: -6, y: 0 },
            { id: 'right', type: 'radial', dir: 'right', x: 6, y: 0 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.decoupler_radial, () => {
                ctx.beginPath();
                ctx.rect(-w / 2, -h / 2, w, h);
            });
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-1.5, -5, 3, 10);
        }
    },

    truss_girder: {
        id: 'truss_girder',
        category: 'structures',
        name: 'Viga Estructural',
        tagline: 'Armazón ligero para sondas, satélites y extensiones',
        width: 20,
        height: 40,
        dryMass: 0.2,
        hull: 110,
        dragCoeff: 0.15,
        defaultColor: '#94a3b8',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -20 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 20 }
        ],
        draw: (ctx, w, h, s) => {
            const col = (s && s.color) || '#94a3b8';
            ctx.strokeStyle = col;
            ctx.lineWidth = 2;
            ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
            ctx.beginPath();
            ctx.moveTo(-w / 2 + 1, -h / 2 + 1); ctx.lineTo(w / 2 - 1, 0);
            ctx.lineTo(-w / 2 + 1, h / 2 - 1);
            ctx.moveTo(w / 2 - 1, -h / 2 + 1); ctx.lineTo(-w / 2 + 1, 0);
            ctx.lineTo(w / 2 - 1, h / 2 - 1);
            ctx.stroke();
        }
    },

    landing_legs_small: {
        id: 'landing_legs_small',
        category: 'structures',
        name: 'Pata de Aterrizaje S',
        tagline: 'Tren de aterrizaje ligero desplegable para cápsulas y sondas',
        width: 22,
        height: 30,
        dryMass: 0.25,
        isLandingPad: true,
        deployable: true,
        radialAttachable: true,
        hull: 120,
        dragCoeff: 0.08,
        defaultColor: '#cbd5e1',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'mount', type: 'radial', dir: 'right', x: 11, y: -4 }
        ],
        draw: (ctx, w, h, s) => drawSimpleLandingLeg(ctx, w, h, false, s)
    },

    landing_legs_heavy: {
        id: 'landing_legs_heavy',
        category: 'structures',
        name: 'Pata Hidráulica XL',
        tagline: 'Soporte reforzado de amplia base para cohetes pesados',
        width: 30,
        height: 40,
        dryMass: 0.55,
        isLandingPad: true,
        deployable: true,
        radialAttachable: true,
        hull: 200,
        dragCoeff: 0.12,
        defaultColor: '#94a3b8',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'mount', type: 'radial', dir: 'right', x: 15, y: -6 }
        ],
        draw: (ctx, w, h, s) => drawSimpleLandingLeg(ctx, w, h, true, s)
    },

    // ------------------------------------------------------------------------
    // AERODINÁMICA
    // ------------------------------------------------------------------------
    nosecone_ogive: {
        id: 'nosecone_ogive',
        category: 'aero',
        name: 'Cono de Nariz',
        tagline: 'Punta aerodinámica limpia para reducir resistencia en atmósfera',
        width: 30,
        height: 28,
        dryMass: 0.25,
        hull: 100,
        dragCoeff: 0.06,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 14 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.nosecone_ogive, () => {
                ctx.beginPath();
                ctx.moveTo(-w / 2, h / 2);
                ctx.quadraticCurveTo(-w * 0.35, -h * 0.2, 0, -h / 2);
                ctx.quadraticCurveTo(w * 0.35, -h * 0.2, w / 2, h / 2);
                ctx.closePath();
            });
        }
    },

    nosecone_booster: {
        id: 'nosecone_booster',
        category: 'aero',
        name: 'Cono de Booster',
        tagline: 'Punta inclinada ideal para aceleradores laterales SRB o tanques',
        width: 22,
        height: 24,
        dryMass: 0.2,
        hull: 90,
        dragCoeff: 0.07,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 12 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.nosecone_booster, () => {
                ctx.beginPath();
                ctx.moveTo(-w / 2, h / 2);
                ctx.quadraticCurveTo(0, -h * 0.4, w / 2, -h / 2);
                ctx.lineTo(w / 2, h / 2);
                ctx.closePath();
            });
        }
    },

    fin_delta: {
        id: 'fin_delta',
        category: 'aero',
        name: 'Aleta Delta',
        tagline: 'Estabilizador aerodinámico simple para vuelo recto en atmósfera',
        width: 18,
        height: 26,
        dryMass: 0.12,
        hull: 80,
        radialAttachable: true,
        dragCoeff: 0.05,
        defaultColor: '#cbd5e1',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'mount', type: 'radial', dir: 'right', x: 9, y: 0 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.fin_delta, () => {
                ctx.beginPath();
                ctx.moveTo(w / 2, -h / 2);
                ctx.lineTo(-w / 2, h / 2 - 2);
                ctx.lineTo(w / 2, h / 2);
                ctx.closePath();
            }, { noCylinderShade: true });
        }
    },

    grid_fin: {
        id: 'grid_fin',
        category: 'aero',
        name: 'Aleta de Rejilla',
        tagline: 'Freno aerodinámico de precisión para descensos y aterrizajes',
        width: 14,
        height: 12,
        dryMass: 0.1,
        hull: 90,
        radialAttachable: true,
        dragCoeff: 0.14,
        defaultColor: '#475569',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'mount', type: 'radial', dir: 'right', x: 7, y: 0 }
        ],
        draw: (ctx, w, h, s) => {
            const col = (s && s.color) || '#475569';
            ctx.fillStyle = col;
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1;
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(-w / 2 + 4, -h / 2); ctx.lineTo(-w / 2 + 4, h / 2);
            ctx.moveTo(w / 2 - 4, -h / 2); ctx.lineTo(w / 2 - 4, h / 2);
            ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0);
            ctx.stroke();
        }
    },

    parachute_mk1: {
        id: 'parachute_mk1',
        category: 'aero',
        name: 'Paracaídas Mk1',
        tagline: 'Cono de recuperación atmosférica para aterrizajes suaves',
        width: 22,
        height: 10,
        dryMass: 0.15,
        isParachute: true,
        hull: 90,
        dragCoeff: 0.08,
        defaultColor: '#ea580c',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 5 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.parachute_mk1, () => {
                ctx.beginPath();
                ctx.moveTo(-w * 0.35, -h / 2);
                ctx.lineTo(w * 0.35, -h / 2);
                ctx.lineTo(w / 2, h / 2);
                ctx.lineTo(-w / 2, h / 2);
                ctx.closePath();
            });
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-w * 0.25, -1, w * 0.5, 2);
        }
    },

    heat_shield_m: {
        id: 'heat_shield_m',
        category: 'aero',
        name: 'Escudo Térmico',
        tagline: 'Base ablativa reforzada para soportar reentradas extremas',
        width: 32,
        height: 8,
        dryMass: 0.35,
        isHeatShield: true,
        hull: 320,
        dragCoeff: 0.18,
        defaultColor: '#475569',
        defaultTexture: 'tiles',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -4 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 4 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.heat_shield_m, () => {
                ctx.beginPath();
                ctx.moveTo(-w / 2, -h / 2);
                ctx.lineTo(w / 2, -h / 2);
                ctx.quadraticCurveTo(0, h * 0.9, -w / 2, -h / 2);
                ctx.closePath();
            });
        }
    },

    // ========================================================================
    // COFIAS AERODINÁMICAS (PAYLOAD FAIRINGS · TRANSPARENTES EN VAB)
    // ========================================================================
    fairing_mini_s: {
        id: 'fairing_mini_s',
        category: 'fairings',
        name: 'Cofia Mini S',
        tagline: 'Carenado compacto (24px) para nanosatélites y CubeSats',
        width: 24,
        height: 48,
        dryMass: 0.18,
        hull: 90,
        dragCoeff: 0.13,
        isFairing: true,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 24 },
            { id: 'payload', type: 'stack', dir: 'top', x: 0, y: 18 }
        ],
        draw: (ctx, w, h, s) => drawFairingPart(ctx, w, h, s, ROCKET_PARTS_CATALOG.fairing_mini_s)
    },

    fairing_std_m: {
        id: 'fairing_std_m',
        category: 'fairings',
        name: 'Cofia Estándar M',
        tagline: 'Cofia orbital estándar (34px) con apertura en dos mitades',
        width: 34,
        height: 68,
        dryMass: 0.35,
        hull: 130,
        dragCoeff: 0.14,
        isFairing: true,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 34 },
            { id: 'payload', type: 'stack', dir: 'top', x: 0, y: 28 }
        ],
        draw: (ctx, w, h, s) => drawFairingPart(ctx, w, h, s, ROCKET_PARTS_CATALOG.fairing_std_m)
    },

    fairing_wide_l: {
        id: 'fairing_wide_l',
        category: 'fairings',
        name: 'Cofia Ancha L',
        tagline: 'Carenado amplio (44px) para sondas, paneles y módulos medianos',
        width: 44,
        height: 86,
        dryMass: 0.55,
        hull: 170,
        dragCoeff: 0.14,
        isFairing: true,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 43 },
            { id: 'payload', type: 'stack', dir: 'top', x: 0, y: 36 }
        ],
        draw: (ctx, w, h, s) => drawFairingPart(ctx, w, h, s, ROCKET_PARTS_CATALOG.fairing_wide_l)
    },

    fairing_heavy_xl: {
        id: 'fairing_heavy_xl',
        category: 'fairings',
        name: 'Cofia Pesada XL',
        tagline: 'Gran cofia de carga (58px) para satélites pesados o landers',
        width: 58,
        height: 114,
        dryMass: 0.95,
        hull: 240,
        dragCoeff: 0.15,
        isFairing: true,
        defaultColor: '#cbd5e1',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 57 },
            { id: 'payload', type: 'stack', dir: 'top', x: 0, y: 49 }
        ],
        draw: (ctx, w, h, s) => drawFairingPart(ctx, w, h, s, ROCKET_PARTS_CATALOG.fairing_heavy_xl)
    },

    fairing_jumbo_xxl: {
        id: 'fairing_jumbo_xxl',
        category: 'fairings',
        name: 'Cofia Colosal XXL',
        tagline: 'Mega-cofia interplanetaria (80px) para estaciones y rovers grandes',
        width: 80,
        height: 154,
        dryMass: 1.8,
        hull: 360,
        dragCoeff: 0.16,
        isFairing: true,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 77 },
            { id: 'payload', type: 'stack', dir: 'top', x: 0, y: 69 }
        ],
        draw: (ctx, w, h, s) => drawFairingPart(ctx, w, h, s, ROCKET_PARTS_CATALOG.fairing_jumbo_xxl)
    },

    fairing_bulb_xl: {
        id: 'fairing_bulb_xl',
        category: 'fairings',
        name: 'Cofia Bulbo Hammerhead',
        tagline: 'Base de 40px ensanchada a 68px para cargas voluminosas',
        width: 68,
        height: 118,
        dryMass: 1.15,
        hull: 260,
        dragCoeff: 0.17,
        isFairing: true,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 59 },
            { id: 'payload', type: 'stack', dir: 'top', x: 0, y: 51 }
        ],
        draw: (ctx, w, h, s) => drawFairingPart(ctx, w, h, s, ROCKET_PARTS_CATALOG.fairing_bulb_xl, { baseRatio: 0.62 })
    },

    // ========================================================================
    // NUEVAS CÁPSULAS Y SONDAS (MICRO A COLOSAL)
    // ========================================================================
    probe_nano: {
        id: 'probe_nano',
        category: 'capsules',
        name: 'Micro-Sonda Pico',
        tagline: 'Controlador autónomo ultra-compacto (12px) para nanosatélites',
        width: 12,
        height: 12,
        dryMass: 0.08,
        fuelCapacity: 3,
        thrust: 0,
        passengers: 0,
        hull: 45,
        electricalGen: 3,
        dragCoeff: 0.25,
        defaultColor: '#eab308',
        defaultTexture: 'foil',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -6 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 6 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.probe_nano, () => {
                ctx.beginPath();
                ctx.roundRect(-w / 2, -h / 2, w, h, 2);
            });
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(0, 0, Math.min(w, h) * 0.22, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    probe_relay_dish: {
        id: 'probe_relay_dish',
        category: 'capsules',
        name: 'Sonda Parabólica Relay',
        tagline: 'Sonda orbital con antena de alta ganancia (26px)',
        width: 26,
        height: 26,
        dryMass: 0.45,
        fuelCapacity: 8,
        thrust: 0,
        passengers: 0,
        hull: 90,
        electricalGen: 6,
        dragCoeff: 0.28,
        defaultColor: '#cbd5e1',
        defaultTexture: 'foil',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -13 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 13 }
        ],
        draw: (ctx, w, h, s) => {
            // Cuerpo sonda
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.probe_relay_dish, () => {
                ctx.beginPath();
                ctx.rect(-w * 0.34, 0, w * 0.68, h * 0.5);
            });
            // Plato parabólico superior
            ctx.fillStyle = '#f8fafc';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-w * 0.48, -h * 0.15);
            ctx.quadraticCurveTo(0, h * 0.15, w * 0.48, -h * 0.15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Mástil receptor
            ctx.strokeStyle = '#94a3b8';
            ctx.beginPath();
            ctx.moveTo(0, -h * 0.02);
            ctx.lineTo(0, -h * 0.48);
            ctx.stroke();
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(0, -h * 0.48, Math.max(1.8, w * 0.08), 0, Math.PI * 2);
            ctx.fill();
        }
    },

    capsule_lander_mk1: {
        id: 'capsule_lander_mk1',
        category: 'capsules',
        name: 'Módulo Lunar "Águila"',
        tagline: 'Cabina ligera de aterrizaje lunar (2 tripulantes)',
        width: 34,
        height: 28,
        dryMass: 1.15,
        fuelCapacity: 20,
        thrust: 0,
        passengers: 2,
        hull: 150,
        electricalGen: 5,
        dragCoeff: 0.32,
        defaultColor: '#cbd5e1',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -14 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 14 },
            { id: 'left', type: 'radial', dir: 'left', x: -17, y: 0 },
            { id: 'right', type: 'radial', dir: 'right', x: 17, y: 0 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.capsule_lander_mk1, () => {
                ctx.beginPath();
                ctx.moveTo(-w * 0.36, -h / 2);
                ctx.lineTo(w * 0.36, -h / 2);
                ctx.lineTo(w * 0.5, -h * 0.08);
                ctx.lineTo(w * 0.44, h / 2);
                ctx.lineTo(-w * 0.44, h / 2);
                ctx.lineTo(-w * 0.5, -h * 0.08);
                ctx.closePath();
            });
            // Ventanas triangulares de alunizaje
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-w * 0.28, -h * 0.22, w * 0.2, h * 0.22);
            ctx.fillRect(w * 0.08, -h * 0.22, w * 0.2, h * 0.22);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(-w * 0.25, -h * 0.19, w * 0.14, h * 0.16);
            ctx.fillRect(w * 0.11, -h * 0.19, w * 0.14, h * 0.16);
        }
    },

    capsule_station_hub: {
        id: 'capsule_station_hub',
        category: 'capsules',
        name: 'Módulo Estación Orbital',
        tagline: 'Hábitat presurizado (50px, 4 tripulantes, nodos laterales)',
        width: 50,
        height: 44,
        dryMass: 3.4,
        fuelCapacity: 25,
        thrust: 0,
        passengers: 4,
        hull: 280,
        electricalGen: 10,
        dragCoeff: 0.30,
        defaultColor: '#f1f5f9',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -22 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 22 },
            { id: 'left', type: 'radial', dir: 'left', x: -25, y: 0 },
            { id: 'right', type: 'radial', dir: 'right', x: 25, y: 0 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.capsule_station_hub, () => {
                ctx.beginPath();
                ctx.roundRect(-w / 2, -h / 2, w, h, 3);
            });
            // Escotillas laterales y ojos de buey
            ctx.fillStyle = '#334155';
            ctx.fillRect(-w / 2, -h * 0.18, 4, h * 0.36);
            ctx.fillRect(w / 2 - 4, -h * 0.18, 4, h * 0.36);
            ctx.fillStyle = '#38bdf8';
            for (const ox of [-w * 0.22, 0, w * 0.22]) {
                ctx.beginPath();
                ctx.arc(ox, 0, Math.max(2.5, w * 0.065), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },

    capsule_colossus: {
        id: 'capsule_colossus',
        category: 'capsules',
        name: 'Cápsula "Orión" Mk-3',
        tagline: 'Cabina interplanetaria pesada (64px, 6 tripulantes)',
        width: 64,
        height: 52,
        dryMass: 4.8,
        fuelCapacity: 60,
        thrust: 0,
        passengers: 6,
        hull: 420,
        electricalGen: 12,
        dragCoeff: 0.25,
        defaultColor: '#e2e8f0',
        defaultTexture: 'tiles',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -26 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 26 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.capsule_colossus, () => {
                ctx.beginPath();
                ctx.moveTo(-w / 2, h / 2);
                ctx.lineTo(-w * 0.24, -h / 2);
                ctx.lineTo(w * 0.24, -h / 2);
                ctx.lineTo(w / 2, h / 2);
                ctx.closePath();
            });
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-w / 2 + 1, h / 2 - Math.max(4, h * 0.09), w - 2, Math.max(4, h * 0.09));
            ctx.fillStyle = '#38bdf8';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(-w * 0.18, -h * 0.14, w * 0.36, h * 0.18, 3);
            ctx.fill();
            ctx.stroke();
        }
    },

    // ========================================================================
    // NUEVOS TANQUES (NANO 14px HASTA COLOSO 100px + ADAPTADORES)
    // ========================================================================
    tank_nano_xs: {
        id: 'tank_nano_xs',
        category: 'tanks',
        name: 'Tanque Nano 14',
        tagline: 'Micro-depósito (14×18) para sondas y satélites dentro de cofias',
        width: 14,
        height: 18,
        dryMass: 0.06,
        fuelCapacity: 24,
        thrust: 0,
        hull: 45,
        dragCoeff: 0.18,
        defaultColor: '#eab308',
        defaultTexture: 'foil',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -9 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 9 }
        ],
        draw: (ctx, w, h, s) => drawSimpleTank(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_nano_xs)
    },

    tank_mini_tall: {
        id: 'tank_mini_tall',
        category: 'tanks',
        name: 'Tanque Mini Largo',
        tagline: 'Depósito delgado de 20×44 para cohetes sonda ligeros',
        width: 20,
        height: 44,
        dryMass: 0.24,
        fuelCapacity: 95,
        thrust: 0,
        hull: 75,
        dragCoeff: 0.18,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -22 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 22 }
        ],
        draw: (ctx, w, h, s) => drawSimpleTank(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_mini_tall)
    },

    tank_medium_xl: {
        id: 'tank_medium_xl',
        category: 'tanks',
        name: 'Tanque Ancho Largo',
        tagline: 'Tanque orbital de gran autonomía (40×100)',
        width: 40,
        height: 100,
        dryMass: 1.25,
        fuelCapacity: 520,
        thrust: 0,
        hull: 180,
        dragCoeff: 0.20,
        defaultColor: '#f1f5f9',
        defaultTexture: 'stripes',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -50 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 50 }
        ],
        draw: (ctx, w, h, s) => drawSimpleTank(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_medium_xl)
    },

    tank_heavy_short: {
        id: 'tank_heavy_short',
        category: 'tanks',
        name: 'Tanque Pesado Corto',
        tagline: 'Módulo ancho y compacto (50×40) para etapas superiores pesadas',
        width: 50,
        height: 40,
        dryMass: 0.72,
        fuelCapacity: 280,
        thrust: 0,
        hull: 170,
        dragCoeff: 0.22,
        defaultColor: '#cbd5e1',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -20 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 20 }
        ],
        draw: (ctx, w, h, s) => drawSimpleTank(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_heavy_short)
    },

    tank_titan_80: {
        id: 'tank_titan_80',
        category: 'tanks',
        name: 'Tanque Titán 80',
        tagline: 'Núcleo súper pesado de 80×120 para lanzadores interplanetarios',
        width: 80,
        height: 120,
        dryMass: 3.6,
        fuelCapacity: 1550,
        thrust: 0,
        hull: 340,
        dragCoeff: 0.26,
        defaultColor: '#ea580c',
        defaultTexture: 'stripes',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -60 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 60 }
        ],
        draw: (ctx, w, h, s) => drawSimpleTank(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_titan_80)
    },

    tank_colossus_100: {
        id: 'tank_colossus_100',
        category: 'tanks',
        name: 'Mega-Tanque Coloso 100',
        tagline: 'Coloso de acero inoxidable (100×150) para naves gigantes',
        width: 100,
        height: 150,
        dryMass: 5.8,
        fuelCapacity: 2600,
        thrust: 0,
        hull: 480,
        dragCoeff: 0.28,
        defaultColor: '#cbd5e1',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -75 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 75 }
        ],
        draw: (ctx, w, h, s) => drawSimpleTank(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_colossus_100)
    },

    tank_adapter_50_80: {
        id: 'tank_adapter_50_80',
        category: 'tanks',
        name: 'Adaptador Pesado 50→80',
        tagline: 'Transición cónica estructural con combustible interno',
        width: 80,
        height: 32,
        dryMass: 1.1,
        fuelCapacity: 220,
        thrust: 0,
        hull: 220,
        dragCoeff: 0.22,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -16 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 16 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_adapter_50_80, () => {
                ctx.beginPath();
                ctx.moveTo(-w * 0.31, -h / 2);
                ctx.lineTo(w * 0.31, -h / 2);
                ctx.lineTo(w * 0.5, h / 2);
                ctx.lineTo(-w * 0.5, h / 2);
                ctx.closePath();
            });
        }
    },

    tank_spherical_lg: {
        id: 'tank_spherical_lg',
        category: 'tanks',
        name: 'Tanque Esférico L',
        tagline: 'Esfera criogénica pesada de 44×44 para etapas orbitales',
        width: 44,
        height: 44,
        dryMass: 0.55,
        fuelCapacity: 260,
        thrust: 0,
        hull: 150,
        dragCoeff: 0.30,
        defaultColor: '#f1f5f9',
        defaultTexture: 'foil',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -22 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 22 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.tank_spherical_lg, () => {
                ctx.beginPath();
                ctx.ellipse(0, 0, w * 0.46, h * 0.46, 0, 0, Math.PI * 2);
            });
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1.6;
            ctx.strokeRect(-w * 0.36, -2.5, w * 0.72, 5);
        }
    },

    // ========================================================================
    // NUEVOS MOTORES (MICRO SATELITAL A CLÚSTER COLOSO)
    // ========================================================================
    engine_nano_rcs: {
        id: 'engine_nano_rcs',
        category: 'engines',
        name: 'Micro-Propulsor Satelital',
        tagline: 'Motor diminuto (12×12) para satélites y CubeSats en cofia',
        width: 12,
        height: 12,
        dryMass: 0.05,
        thrust: 14,
        warpThrust: 55,
        consumption: 0.14,
        hull: 45,
        dragCoeff: 0.20,
        flameColor: 'ion',
        engineMode: 'vac',
        nozzleOffset: { x: 0, y: 6, scale: 0.38 },
        defaultColor: '#64748b',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -6 }
        ],
        draw: (ctx, w, h, s) => drawSimpleEngine(ctx, w, h, s, 'ion')
    },

    engine_spark: {
        id: 'engine_spark',
        category: 'engines',
        name: 'Motor "Chispa" S',
        tagline: 'Motor compacto (18×18) de alto empuje relativo para cohetes chicos',
        width: 18,
        height: 18,
        dryMass: 0.16,
        thrust: 55,
        warpThrust: 130,
        consumption: 0.52,
        hull: 75,
        dragCoeff: 0.22,
        flameColor: 'standard',
        engineMode: 'sea',
        nozzleOffset: { x: 0, y: 9, scale: 0.55 },
        defaultColor: '#475569',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -9 }
        ],
        draw: (ctx, w, h, s) => drawSimpleEngine(ctx, w, h, s, 'sea')
    },

    engine_nuclear_nerva: {
        id: 'engine_nuclear_nerva',
        category: 'engines',
        name: 'Motor Nuclear "Nerva"',
        tagline: 'Propulsión térmica nuclear (28×34) de altísima eficiencia en vacío',
        width: 28,
        height: 34,
        dryMass: 1.45,
        thrust: 120,
        warpThrust: 520,
        consumption: 0.38,
        hull: 180,
        dragCoeff: 0.24,
        flameColor: 'ion',
        engineMode: 'vac',
        nozzleOffset: { x: 0, y: 17, scale: 0.92 },
        defaultColor: '#334155',
        defaultTexture: 'carbon',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -17 }
        ],
        draw: (ctx, w, h, s) => drawSimpleEngine(ctx, w, h, s, 'ion')
    },

    engine_mammoth_xl: {
        id: 'engine_mammoth_xl',
        category: 'engines',
        name: 'Motor "Mamut" XL',
        tagline: 'Cuádruple tobera atmosférica (58×34) para núcleos de 50-64px',
        width: 58,
        height: 34,
        dryMass: 2.6,
        thrust: 620,
        warpThrust: 1200,
        consumption: 4.8,
        hull: 260,
        dragCoeff: 0.28,
        flameColor: 'heavy',
        engineMode: 'sea',
        nozzleOffset: { x: 0, y: 17, scale: 1.45 },
        defaultColor: '#334155',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -17 }
        ],
        draw: (ctx, w, h, s) => drawSimpleEngine(ctx, w, h, s, 'cluster')
    },

    engine_saturn_f1: {
        id: 'engine_saturn_f1',
        category: 'engines',
        name: 'Clúster "F-1 Coloso" x5',
        tagline: 'Propulsor titánico de 5 toberas (76×42) para cohetes de 80-100px',
        width: 76,
        height: 42,
        dryMass: 4.4,
        thrust: 1180,
        warpThrust: 2300,
        consumption: 8.6,
        hull: 380,
        dragCoeff: 0.32,
        flameColor: 'heavy',
        engineMode: 'sea',
        nozzleOffset: { x: 0, y: 21, scale: 1.85 },
        defaultColor: '#1e293b',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -21 }
        ],
        draw: (ctx, w, h, s) => drawSimpleEngine(ctx, w, h, s, 'cluster')
    },

    engine_srb_mini: {
        id: 'engine_srb_mini',
        category: 'engines',
        name: 'Booster Sólido Mini',
        tagline: 'Acelerador lateral compacto (14×48) para cohetes ligeros',
        width: 14,
        height: 48,
        dryMass: 0.25,
        fuelCapacity: 42,
        thrust: 75,
        warpThrust: 140,
        consumption: 0.9,
        hull: 85,
        dragCoeff: 0.22,
        radialAttachable: true,
        flameColor: 'heavy',
        engineMode: 'sea',
        nozzleOffset: { x: 0, y: 24, scale: 0.5 },
        defaultColor: '#f1f5f9',
        defaultTexture: 'stripes',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -24 },
            { id: 'left', type: 'radial', dir: 'left', x: -7, y: 0 },
            { id: 'right', type: 'radial', dir: 'right', x: 7, y: 0 }
        ],
        draw: (ctx, w, h, s) => {
            const nozH = Math.max(6, h * 0.16);
            const bodyH = h - nozH;
            ctx.save();
            ctx.translate(0, -nozH / 2);
            applyPartBodyFinish(ctx, w, bodyH, s, ROCKET_PARTS_CATALOG.engine_srb_mini, () => {
                ctx.beginPath();
                ctx.rect(-w / 2, -bodyH / 2, w, bodyH);
            });
            ctx.restore();
            drawSimpleNozzleBell(ctx, 0, h / 2 - nozH, w * 0.72, nozH, '#f97316');
        }
    },

    engine_srb_heavy: {
        id: 'engine_srb_heavy',
        category: 'engines',
        name: 'Booster Sólido Pesado XL',
        tagline: 'Acelerador lateral gigante (32×115) estilo SLS de alto empuje',
        width: 32,
        height: 115,
        dryMass: 1.4,
        fuelCapacity: 240,
        thrust: 360,
        warpThrust: 650,
        consumption: 3.4,
        hull: 220,
        dragCoeff: 0.26,
        radialAttachable: true,
        flameColor: 'heavy',
        engineMode: 'sea',
        nozzleOffset: { x: 0, y: 57, scale: 1.1 },
        defaultColor: '#f1f5f9',
        defaultTexture: 'stripes',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -57.5 },
            { id: 'left', type: 'radial', dir: 'left', x: -16, y: 0 },
            { id: 'right', type: 'radial', dir: 'right', x: 16, y: 0 }
        ],
        draw: (ctx, w, h, s) => {
            const nozH = Math.max(10, h * 0.14);
            const bodyH = h - nozH;
            ctx.save();
            ctx.translate(0, -nozH / 2);
            applyPartBodyFinish(ctx, w, bodyH, s, ROCKET_PARTS_CATALOG.engine_srb_heavy, () => {
                ctx.beginPath();
                ctx.rect(-w / 2, -bodyH / 2, w, bodyH);
            });
            ctx.restore();
            drawSimpleNozzleBell(ctx, 0, h / 2 - nozH, w * 0.72, nozH, '#f97316');
        }
    },

    // ========================================================================
    // NUEVOS RCS, ENERGÍA, ESTRUCTURA Y AERO
    // ========================================================================
    rcs_micro: {
        id: 'rcs_micro',
        category: 'rcs',
        name: 'Micro-RCS Satélite',
        tagline: 'Mini tobera de control de actitud (8×10) para sondas',
        width: 8,
        height: 10,
        dryMass: 0.02,
        rcsPower: 0.6,
        hull: 35,
        dragCoeff: 0.16,
        radialAttachable: true,
        defaultColor: '#e2e8f0',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'left', type: 'radial', dir: 'left', x: -4, y: 0 },
            { id: 'right', type: 'radial', dir: 'right', x: 4, y: 0 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.rcs_micro, () => {
                ctx.beginPath();
                ctx.roundRect(-w / 2, -h / 2, w, h, 2);
            });
        }
    },

    solar_nano: {
        id: 'solar_nano',
        category: 'solar',
        name: 'Panel Solar Nano',
        tagline: 'Ala fotovoltaica compacta (20×10) para CubeSats en cofia',
        width: 20,
        height: 10,
        dryMass: 0.03,
        electricalGen: 6,
        hull: 35,
        dragCoeff: 0.25,
        radialAttachable: true,
        deployable: true,
        isSolarPanel: true,
        defaultColor: '#1d4ed8',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'left', type: 'radial', dir: 'left', x: -10, y: 0 },
            { id: 'right', type: 'radial', dir: 'right', x: 10, y: 0 }
        ],
        draw: (ctx, w, h, s) => drawDeployableSolarPanel(ctx, w, h, 2, s)
    },

    solar_mega_station: {
        id: 'solar_mega_station',
        category: 'solar',
        name: 'Mega-Ala Estación 3x6',
        tagline: 'Conjunto solar gigante (96×26) para estaciones orbitales',
        width: 96,
        height: 26,
        dryMass: 0.35,
        electricalGen: 55,
        hull: 75,
        dragCoeff: 0.45,
        radialAttachable: true,
        deployable: true,
        isSolarPanel: true,
        defaultColor: '#1d4ed8',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'left', type: 'radial', dir: 'left', x: -48, y: 0 },
            { id: 'right', type: 'radial', dir: 'right', x: 48, y: 0 }
        ],
        draw: (ctx, w, h, s) => drawDeployableSolarPanel(ctx, w, h, 6, s)
    },

    rtg_generator: {
        id: 'rtg_generator',
        category: 'solar',
        name: 'Generador Nuclear RTG',
        tagline: 'Genera energía constante sin luz solar con aletas radiadoras',
        width: 16,
        height: 22,
        dryMass: 0.22,
        electricalGen: 18,
        hull: 90,
        dragCoeff: 0.28,
        radialAttachable: true,
        defaultColor: '#1e293b',
        defaultTexture: 'carbon',
        snapNodes: [
            { id: 'left', type: 'radial', dir: 'left', x: -8, y: 0 },
            { id: 'right', type: 'radial', dir: 'right', x: 8, y: 0 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 11 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.rtg_generator, () => {
                ctx.beginPath();
                ctx.roundRect(-w * 0.34, -h / 2, w * 0.68, h, 2);
            });
            ctx.fillStyle = '#475569';
            for (let y = -h * 0.38; y <= h * 0.38; y += h * 0.2) {
                ctx.fillRect(-w * 0.5, y, w, 2);
            }
        }
    },

    battery_heavy: {
        id: 'battery_heavy',
        category: 'solar',
        name: 'Banco de Baterías XL',
        tagline: 'Módulo de energía de gran diámetro (50×16)',
        width: 50,
        height: 16,
        dryMass: 0.45,
        electricalGen: 22,
        hull: 130,
        dragCoeff: 0.22,
        defaultColor: '#334155',
        defaultTexture: 'carbon',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -8 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 8 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.battery_heavy, () => {
                ctx.beginPath();
                ctx.rect(-w / 2, -h / 2, w, h);
            });
            ctx.fillStyle = '#22d3ee';
            ctx.fillRect(-w * 0.35, -2, w * 0.7, 4);
        }
    },

    decoupler_mini: {
        id: 'decoupler_mini',
        category: 'structures',
        name: 'Separador Mini 20',
        tagline: 'Anillo desacoplador compacto (20×8) para satélites y cofias',
        width: 20,
        height: 8,
        dryMass: 0.06,
        hull: 55,
        dragCoeff: 0.18,
        defaultColor: '#475569',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -4 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 4 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.decoupler_mini, () => {
                ctx.beginPath();
                ctx.rect(-w / 2, -h / 2, w, h);
            });
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-w * 0.4, -1.2, w * 0.8, 2.4);
        }
    },

    decoupler_heavy: {
        id: 'decoupler_heavy',
        category: 'structures',
        name: 'Separador Pesado 50',
        tagline: 'Desacoplador axial reforzado (50×12) para etapas medias/pesadas',
        width: 50,
        height: 12,
        dryMass: 0.28,
        hull: 140,
        dragCoeff: 0.22,
        defaultColor: '#475569',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -6 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 6 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.decoupler_heavy, () => {
                ctx.beginPath();
                ctx.rect(-w / 2, -h / 2, w, h);
            });
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-w * 0.42, -2, w * 0.84, 4);
        }
    },

    decoupler_colossus: {
        id: 'decoupler_colossus',
        category: 'structures',
        name: 'Separador Coloso 80',
        tagline: 'Anillo pirotécnico gigante (80×14) para cohetes súper pesados',
        width: 80,
        height: 14,
        dryMass: 0.55,
        hull: 220,
        dragCoeff: 0.25,
        defaultColor: '#334155',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -7 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 7 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.decoupler_colossus, () => {
                ctx.beginPath();
                ctx.rect(-w / 2, -h / 2, w, h);
            });
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-w * 0.44, -2.2, w * 0.88, 4.4);
        }
    },

    docking_port: {
        id: 'docking_port',
        category: 'structures',
        name: 'Puerto de Acoplamiento',
        tagline: 'Conector orbital (24×8) para estaciones y cargas modulares',
        width: 24,
        height: 8,
        dryMass: 0.12,
        hull: 90,
        dragCoeff: 0.24,
        defaultColor: '#cbd5e1',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -4 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 4 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.docking_port, () => {
                ctx.beginPath();
                ctx.moveTo(-w / 2, h / 2);
                ctx.lineTo(-w * 0.36, -h / 2);
                ctx.lineTo(w * 0.36, -h / 2);
                ctx.lineTo(w / 2, h / 2);
                ctx.closePath();
            });
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(-w * 0.22, -h / 2, w * 0.44, 2);
        }
    },

    truss_heavy: {
        id: 'truss_heavy',
        category: 'structures',
        name: 'Estructura Reticular XL',
        tagline: 'Viga espacial liviana (36×70) para torres y estaciones',
        width: 36,
        height: 70,
        dryMass: 0.38,
        hull: 180,
        dragCoeff: 0.42,
        defaultColor: '#94a3b8',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -35 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 35 }
        ],
        draw: (ctx, w, h, s) => {
            ctx.strokeStyle = s?.color || '#94a3b8';
            ctx.lineWidth = Math.max(1.5, w * 0.08);
            ctx.strokeRect(-w / 2 + 2, -h / 2 + 1, w - 4, h - 2);
            ctx.beginPath();
            const steps = 4;
            const sh = h / steps;
            for (let i = 0; i < steps; i++) {
                const y0 = -h / 2 + i * sh;
                ctx.moveTo(-w / 2 + 2, y0);
                ctx.lineTo(w / 2 - 2, y0 + sh);
                ctx.moveTo(w / 2 - 2, y0);
                ctx.lineTo(-w / 2 + 2, y0 + sh);
            }
            ctx.stroke();
        }
    },

    landing_legs_micro: {
        id: 'landing_legs_micro',
        category: 'structures',
        name: 'Pata Micro Lander',
        tagline: 'Pata de aterrizaje compacta (14×18) para sondas y rovers',
        width: 14,
        height: 18,
        dryMass: 0.06,
        hull: 80,
        dragCoeff: 0.28,
        radialAttachable: true,
        deployable: true,
        isLandingPad: true,
        defaultColor: '#475569',
        defaultTexture: 'carbon',
        snapNodes: [
            { id: 'left', type: 'radial', dir: 'left', x: -7, y: 0 },
            { id: 'right', type: 'radial', dir: 'right', x: 7, y: 0 }
        ],
        draw: (ctx, w, h, s) => drawSimpleLandingLeg(ctx, w, h, false, s)
    },

    landing_legs_colossus: {
        id: 'landing_legs_colossus',
        category: 'structures',
        name: 'Pata Gigante Starship',
        tagline: 'Tren de aterrizaje pesado (42×58) para cohetes reutilizables',
        width: 42,
        height: 58,
        dryMass: 0.65,
        hull: 320,
        dragCoeff: 0.38,
        radialAttachable: true,
        deployable: true,
        isLandingPad: true,
        defaultColor: '#334155',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'left', type: 'radial', dir: 'left', x: -21, y: 0 },
            { id: 'right', type: 'radial', dir: 'right', x: 21, y: 0 }
        ],
        draw: (ctx, w, h, s) => drawSimpleLandingLeg(ctx, w, h, true, s)
    },

    nosecone_mini: {
        id: 'nosecone_mini',
        category: 'aero',
        name: 'Cono Mini 20',
        tagline: 'Punta aerodinámica compacta (20×20) para cohetes ligeros',
        width: 20,
        height: 20,
        dryMass: 0.08,
        hull: 65,
        dragCoeff: 0.12,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 10 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.nosecone_mini, () => {
                ctx.beginPath();
                ctx.moveTo(-w / 2, h / 2);
                ctx.quadraticCurveTo(-w * 0.25, -h * 0.2, 0, -h / 2);
                ctx.quadraticCurveTo(w * 0.25, -h * 0.2, w / 2, h / 2);
                ctx.closePath();
            });
        }
    },

    nosecone_heavy: {
        id: 'nosecone_heavy',
        category: 'aero',
        name: 'Cono Pesado 50',
        tagline: 'Ojiva aerodinámica ancha (50×44) para etapas de 50px',
        width: 50,
        height: 44,
        dryMass: 0.38,
        hull: 150,
        dragCoeff: 0.13,
        defaultColor: '#f1f5f9',
        defaultTexture: 'smooth',
        snapNodes: [
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 22 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.nosecone_heavy, () => {
                ctx.beginPath();
                ctx.moveTo(-w / 2, h / 2);
                ctx.quadraticCurveTo(-w * 0.35, -h * 0.25, 0, -h / 2);
                ctx.quadraticCurveTo(w * 0.35, -h * 0.25, w / 2, h / 2);
                ctx.closePath();
            });
        }
    },

    nosecone_colossus: {
        id: 'nosecone_colossus',
        category: 'aero',
        name: 'Cono Coloso 80',
        tagline: 'Punta gigante (80×64) para cohetes súper pesados',
        width: 80,
        height: 64,
        dryMass: 0.85,
        hull: 240,
        dragCoeff: 0.14,
        defaultColor: '#cbd5e1',
        defaultTexture: 'steel',
        snapNodes: [
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 32 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.nosecone_colossus, () => {
                ctx.beginPath();
                ctx.moveTo(-w / 2, h / 2);
                ctx.quadraticCurveTo(-w * 0.35, -h * 0.25, 0, -h / 2);
                ctx.quadraticCurveTo(w * 0.35, -h * 0.25, w / 2, h / 2);
                ctx.closePath();
            });
        }
    },

    fin_heavy: {
        id: 'fin_heavy',
        category: 'aero',
        name: 'Aleta Aerodinámica XL',
        tagline: 'Estabilizador grande (28×40) para cohetes altos y pesados',
        width: 28,
        height: 40,
        dryMass: 0.22,
        hull: 110,
        dragCoeff: 0.22,
        radialAttachable: true,
        defaultColor: '#cbd5e1',
        defaultTexture: 'carbon',
        snapNodes: [
            { id: 'left', type: 'radial', dir: 'left', x: -14, y: 0 },
            { id: 'right', type: 'radial', dir: 'right', x: 14, y: 0 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.fin_heavy, () => {
                ctx.beginPath();
                ctx.moveTo(w / 2, -h * 0.35);
                ctx.lineTo(-w / 2, h / 2);
                ctx.lineTo(w / 2, h / 2);
                ctx.closePath();
            });
        }
    },

    heat_shield_xl: {
        id: 'heat_shield_xl',
        category: 'aero',
        name: 'Escudo Térmico XL',
        tagline: 'Escudo ablativo pesado (52×10) para grandes cápsulas y módulos',
        width: 52,
        height: 10,
        dryMass: 0.75,
        isHeatShield: true,
        hull: 520,
        dragCoeff: 0.19,
        defaultColor: '#475569',
        defaultTexture: 'tiles',
        snapNodes: [
            { id: 'top', type: 'stack', dir: 'top', x: 0, y: -5 },
            { id: 'bottom', type: 'stack', dir: 'bottom', x: 0, y: 5 }
        ],
        draw: (ctx, w, h, s) => {
            applyPartBodyFinish(ctx, w, h, s, ROCKET_PARTS_CATALOG.heat_shield_xl, () => {
                ctx.beginPath();
                ctx.moveTo(-w / 2, -h / 2);
                ctx.lineTo(w / 2, -h / 2);
                ctx.quadraticCurveTo(0, h * 0.9, -w / 2, -h / 2);
                ctx.closePath();
            });
        }
    }
};

// --- FUNCIONES DE DIBUJO LIMPIO ESTILO SFS ---
function drawSimpleTank(ctx, w, h, s, def) {
    applyPartBodyFinish(ctx, w, h, s, def, () => {
        ctx.beginPath();
        ctx.rect(-w / 2, -h / 2, w, h);
    });
    // Sutil indicador de nivel de combustible en taller si no está al 100%
    if (s && typeof s.fuelPercent === 'number' && s.fuelPercent < 100 && typeof rocketBuilder !== 'undefined' && rocketBuilder.selectedPartId === s.instanceId) {
        const frac = Math.max(0, Math.min(1, s.fuelPercent / 100));
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        const barH = (h - 4) * frac;
        ctx.fillRect(-3, h / 2 - 2 - barH, 6, barH);
    }
}

function drawSimpleNozzleBell(ctx, x, y, width, height, glowColor) {
    const ng = ctx.createLinearGradient(x - width / 2, y, x + width / 2, y);
    ng.addColorStop(0, '#1e293b');
    ng.addColorStop(0.35, '#64748b');
    ng.addColorStop(0.7, '#334155');
    ng.addColorStop(1, '#0f172a');
    ctx.fillStyle = ng;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - width * 0.28, y);
    ctx.lineTo(x + width * 0.28, y);
    ctx.quadraticCurveTo(x + width * 0.45, y + height * 0.45, x + width / 2, y + height);
    ctx.lineTo(x - width / 2, y + height);
    ctx.quadraticCurveTo(x - width * 0.45, y + height * 0.45, x - width * 0.28, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (glowColor) {
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(x - width * 0.42, y + height - 1);
        ctx.lineTo(x + width * 0.42, y + height - 1);
        ctx.stroke();
    }
}

function drawSimpleEngine(ctx, w, h, s, type) {
    // Bloque superior de turbobomba (personalizable en color)
    const topH = Math.max(6, h * 0.32);
    applyPartBodyFinish(ctx, w * 0.72, topH, s, null, () => {
        ctx.beginPath();
        ctx.rect(-w * 0.36, -h / 2, w * 0.72, topH);
    });

    const bellY = -h / 2 + topH;
    const bellH = h - topH;

    if (type === 'cluster') {
        drawSimpleNozzleBell(ctx, -w * 0.28, bellY, w * 0.34, bellH * 0.92, '#2dd4bf');
        drawSimpleNozzleBell(ctx, w * 0.28, bellY, w * 0.34, bellH * 0.92, '#2dd4bf');
        drawSimpleNozzleBell(ctx, 0, bellY, w * 0.42, bellH, '#5eead4');
    } else if (type === 'aerospike') {
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-w * 0.42, bellY);
        ctx.lineTo(w * 0.42, bellY);
        ctx.lineTo(0, bellY + bellH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-w * 0.32, bellY + 2);
        ctx.lineTo(0, bellY + bellH);
        ctx.lineTo(w * 0.32, bellY + 2);
        ctx.stroke();
    } else if (type === 'ion') {
        drawSimpleNozzleBell(ctx, 0, bellY, w * 0.78, bellH, '#38bdf8');
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-w * 0.28, bellY + bellH - 2.5, w * 0.56, 2);
    } else if (type === 'vacuum') {
        drawSimpleNozzleBell(ctx, 0, bellY, w * 0.96, bellH, '#7dd3fc');
    } else {
        drawSimpleNozzleBell(ctx, 0, bellY, w * 0.86, bellH, '#fb923c');
    }

    // Indicador de estado en vuelo (verde = activo, rojo = apagado)
    if (s && typeof s.engineActive === 'boolean') {
        ctx.fillStyle = s.engineActive ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(0, -h / 2 + topH * 0.5, 2.0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawDeployableSolarPanel(ctx, w, h, segments, s) {
    // deployAnim: 1.0 = totalmente desplegado, 0.0 = contraído
    let anim = 1.0;
    if (s) {
        if (typeof s.deployAnim === 'number') anim = s.deployAnim;
        else if (s.deployed === false) anim = 0.0;
    }

    const baseCol = (s && s.color) || '#cbd5e1';
    // Carcasa de anclaje en el borde derecho (x = +w/2)
    ctx.fillStyle = baseCol;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.fillRect(w / 2 - 5, -h / 2 + 1, 5, h - 2);
    ctx.strokeRect(w / 2 - 5, -h / 2 + 1, 5, h - 2);

    if (anim <= 0.03) {
        // Plegado compacto junto al casco
        ctx.fillStyle = '#334155';
        ctx.fillRect(w / 2 - 9, -h / 2 + 2, 4, h - 4);
        ctx.strokeRect(w / 2 - 9, -h / 2 + 2, 4, h - 4);
        return;
    }

    const extW = (w - 6) * anim;
    const startX = w / 2 - 5 - extW;

    // Brazo articulado
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 5, 0);
    ctx.lineTo(startX, 0);
    ctx.stroke();

    // Panel fotovoltaico azul limpio
    const pg = ctx.createLinearGradient(startX, -h / 2, startX, h / 2);
    pg.addColorStop(0, '#0284c7');
    pg.addColorStop(0.5, '#0369a1');
    pg.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = pg;
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 0.9;
    ctx.fillRect(startX, -h / 2 + 1, extW, h - 2);
    ctx.strokeRect(startX, -h / 2 + 1, extW, h - 2);

    // Divisiones de celdas
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
    ctx.lineWidth = 0.7;
    const segW = extW / segments;
    ctx.beginPath();
    for (let i = 1; i < segments; i++) {
        const sx = startX + segW * i;
        ctx.moveTo(sx, -h / 2 + 1);
        ctx.lineTo(sx, h / 2 - 1);
    }
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX + extW, 0);
    ctx.stroke();
}

function drawSimpleLandingLeg(ctx, w, h, isHeavy, s) {
    let anim = 1.0;
    if (s) {
        if (typeof s.deployAnim === 'number') anim = s.deployAnim;
        else if (s.deployed === false) anim = 0.0;
    }

    const col = (s && s.color) || (isHeavy ? '#94a3b8' : '#cbd5e1');
    const podW = isHeavy ? 8 : 6;
    const podX = w / 2 - podW;

    // Carcasa aerodinámica limpia pegada al fuselaje (borde derecho x = +w/2)
    ctx.fillStyle = col;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(podX, -h / 2 + 2, podW, h * 0.68, 2);
    ctx.fill();
    ctx.stroke();

    if (anim <= 0.04) {
        // Plegada limpiamente dentro de la carcasa (estilo SFS)
        ctx.fillStyle = '#334155';
        ctx.fillRect(podX + 1.5, -h / 2 + 5, podW - 3, h * 0.52);
        return;
    }

    // Pata telescópica hidráulica que se despliega hacia afuera y abajo
    const pivotX = podX + 1;
    const pivotY = -h / 2 + 8;
    const footX = pivotX - (w - podW + 2) * anim;
    const footY = lerp(-h / 2 + 10, h / 2 + 6, anim);

    // Puntal principal
    ctx.strokeStyle = col;
    ctx.lineWidth = isHeavy ? 3.2 : 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(footX, footY);
    ctx.stroke();

    // Pistón hidráulico secundario desde la base de la carcasa
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = isHeavy ? 2.0 : 1.4;
    ctx.beginPath();
    ctx.moveTo(pivotX, h * 0.12);
    ctx.lineTo(lerp(pivotX, footX, 0.58), lerp(pivotY, footY, 0.58));
    ctx.stroke();

    // Zapata plana de aterrizaje
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(footX - 5, footY - 1.5, 10, 3, 1);
    ctx.fill();
    ctx.stroke();
}

// --- CARENADO INTERETAPA AUTOMÁTICO ESTILO SFS (TAPA MOTORES ENTRE ETAPAS) ---
function drawInterstageFairings(ctx, parts) {
    if (!parts || parts.length === 0) return;
    for (const eng of parts) {
        const engDef = ROCKET_PARTS_CATALOG[eng.partDefId];
        if (!engDef || !engDef.thrust || engDef.thrust <= 0 || eng.partDefId === 'engine_srb_booster' || eng.partDefId === 'engine_srb_mini' || eng.partDefId === 'engine_srb_heavy') continue;

        const engSz = getPartSize(eng, engDef);
        const engTop = eng.y - engSz.height * 0.5;
        const engBot = eng.y + engSz.height * 0.5;

        // Buscar tanque/estructura arriba y separador/tanque directamente abajo
        const above = parts.find(p => {
            if (p.instanceId === eng.instanceId) return false;
            const d = ROCKET_PARTS_CATALOG[p.partDefId];
            if (!d || d.radialAttachable) return false;
            const dSz = getPartSize(p, d);
            return Math.abs(p.x - eng.x) < 12 && Math.abs((p.y + dSz.height * 0.5) - engTop) <= 8;
        });

        const below = parts.find(p => {
            if (p.instanceId === eng.instanceId) return false;
            const d = ROCKET_PARTS_CATALOG[p.partDefId];
            if (!d || d.radialAttachable) return false;
            const dSz = getPartSize(p, d);
            return Math.abs(p.x - eng.x) < 12 && (p.y - dSz.height * 0.5) >= engBot - 6 && (p.y - dSz.height * 0.5) <= engBot + 16;
        });

        if (above && below) {
            const dAbove = ROCKET_PARTS_CATALOG[above.partDefId];
            const dBelow = ROCKET_PARTS_CATALOG[below.partDefId];
            const aSz = getPartSize(above, dAbove);
            const bSz = getPartSize(below, dBelow);
            const topY = above.y + aSz.height * 0.5;
            const botY = below.y - bSz.height * 0.5;
            const fh = Math.max(engSz.height, botY - topY);
            const fw = Math.max(aSz.width, bSz.width, engSz.width + 2);
            const cy = (topY + botY) * 0.5;

            ctx.save();
            ctx.translate(eng.x, cy);
            const fairingStyle = { color: above.color || '#cbd5e1', texture: above.texture || 'smooth', scorch: above.scorch };
            applyPartBodyFinish(ctx, fw, fh, fairingStyle, null, () => {
                ctx.beginPath();
                ctx.moveTo(-aSz.width * 0.5, -fh * 0.5);
                ctx.lineTo(aSz.width * 0.5, -fh * 0.5);
                ctx.lineTo(bSz.width * 0.5, fh * 0.5);
                ctx.lineTo(-bSz.width * 0.5, fh * 0.5);
                ctx.closePath();
            });
            ctx.restore();
        }
    }

    // Carenado que permanece adherido al separador tras desacoplar la etapa (estilo SFS)
    for (const dec of parts) {
        if ((dec.partDefId === 'decoupler_vertical' || dec.partDefId === 'decoupler_mini' || dec.partDefId === 'decoupler_heavy' || dec.partDefId === 'decoupler_colossus') && dec.interstageShroud) {
            const sh = dec.interstageShroud;
            const decDef = ROCKET_PARTS_CATALOG[dec.partDefId];
            const decSz = getPartSize(dec, decDef);
            const botY = dec.y - (decDef ? decSz.height * 0.5 : 5);
            const cy = botY - sh.height * 0.5;
            ctx.save();
            ctx.translate(dec.x, cy);
            applyPartBodyFinish(ctx, sh.width, sh.height, { color: sh.color, texture: sh.texture, scorch: dec.scorch }, null, () => {
                ctx.beginPath();
                ctx.moveTo(-sh.topWidth * 0.5, -sh.height * 0.5);
                ctx.lineTo(sh.topWidth * 0.5, -sh.height * 0.5);
                ctx.lineTo(sh.botWidth * 0.5, sh.height * 0.5);
                ctx.lineTo(-sh.botWidth * 0.5, sh.height * 0.5);
                ctx.closePath();
            });
            ctx.restore();
        }
    }
}

// --- TRANSICIONES AUTOMÁTICAS ENTRE TANQUES/PIEZAS DE DISTINTO DIÁMETRO (ESTILO SFS) ---
function drawWidthTransitions(ctx, parts) {
    if (!parts || parts.length < 2) return;
    const isStackBody = (def) => def && !def.radialAttachable && !def.isFairing && (!def.thrust || def.thrust <= 0) &&
        def.id !== 'nosecone_ogive' && def.id !== 'nosecone_booster' && def.id !== 'nosecone_mini' &&
        def.id !== 'nosecone_heavy' && def.id !== 'nosecone_colossus' &&
        def.id !== 'tank_adapter_cone' && def.id !== 'tank_adapter_50_80';

    for (let i = 0; i < parts.length; i++) {
        const pTop = parts[i];
        const dTop = ROCKET_PARTS_CATALOG[pTop.partDefId];
        if (!isStackBody(dTop) || (pTop.rotation || 0) % 180 !== 0) continue;

        const szTop = getPartSize(pTop, dTop);
        const topBottomY = pTop.y + szTop.height * 0.5;
        for (let j = 0; j < parts.length; j++) {
            if (i === j) continue;
            const pBot = parts[j];
            const dBot = ROCKET_PARTS_CATALOG[pBot.partDefId];
            if (!isStackBody(dBot) || (pBot.rotation || 0) % 180 !== 0) continue;

            const szBot = getPartSize(pBot, dBot);
            const botTopY = pBot.y - szBot.height * 0.5;
            if (Math.abs(pTop.x - pBot.x) <= 6 && Math.abs(topBottomY - botTopY) <= 4) {
                const wDiff = Math.abs(szTop.width - szBot.width);
                if (wDiff < 4) continue;

                const th = Math.min(20, Math.max(8, wDiff * 0.65));
                const seamY = (topBottomY + botTopY) * 0.5;
                const halfTop = szTop.width * 0.5;
                const halfBot = szBot.width * 0.5;
                const maxW = Math.max(szTop.width, szBot.width);
                const curve = (typeof pTop.transitionCurve === 'number')
                    ? pTop.transitionCurve
                    : ((typeof pBot.transitionCurve === 'number') ? pBot.transitionCurve : 0.5);
                const refPart = (szBot.width >= szTop.width) ? pBot : pTop;
                const refDef = (szBot.width >= szTop.width) ? dBot : dTop;

                ctx.save();
                ctx.translate(pTop.x, seamY);
                applyPartBodyFinish(ctx, maxW, th, refPart, refDef, () => {
                    ctx.beginPath();
                    ctx.moveTo(-halfTop, -th * 0.5);
                    ctx.lineTo(halfTop, -th * 0.5);
                    if (curve <= 0.05) {
                        ctx.lineTo(halfBot, th * 0.5);
                        ctx.lineTo(-halfBot, th * 0.5);
                    } else {
                        const cFactor = curve * 0.55;
                        ctx.bezierCurveTo(
                            halfTop, -th * (0.5 - cFactor),
                            halfBot, th * (0.5 - cFactor),
                            halfBot, th * 0.5
                        );
                        ctx.lineTo(-halfBot, th * 0.5);
                        ctx.bezierCurveTo(
                            -halfBot, th * (0.5 - cFactor),
                            -halfTop, -th * (0.5 - cFactor),
                            -halfTop, -th * 0.5
                        );
                    }
                    ctx.closePath();
                });
                ctx.restore();
            }
        }
    }
}

// --- 2. PRESETS LIMPIOS Y BIEN ALINEADOS ---
const ROCKET_PRESETS = [
    {
        id: 'vesper_default',
        name: 'Vesper-IX Explorador (Por Defecto)',
        desc: 'El cohete estándar por defecto del simulador: diseño equilibrado de una etapa con cápsula Mk-1, aletas delta y patas de aterrizaje.',
        badge: 'Por Defecto',
        parts: [
            { partDefId: 'capsule_vesper', x: 0, y: -62, rotation: 0, color: '#f1f5f9', texture: 'smooth' },
            { partDefId: 'tank_long_l', x: 0, y: 0, rotation: 0, color: '#f1f5f9', texture: 'smooth', fuelPercent: 100 },
            { partDefId: 'engine_titan_sea', x: 0, y: 57, rotation: 0 },
            { partDefId: 'fin_delta', x: -24, y: 32, rotation: 0, flipped: false },
            { partDefId: 'fin_delta', x: 24, y: 32, rotation: 0, flipped: true },
            { partDefId: 'landing_legs_small', x: -26, y: 42, rotation: 0, flipped: false, deployed: true },
            { partDefId: 'landing_legs_small', x: 26, y: 42, rotation: 0, flipped: true, deployed: true }
        ]
    },
    {
        id: 'satelite_cofia',
        name: 'Lanzador Satélite con Cofia',
        desc: 'Cohete orbital con cofia transparente en taller que protege un CubeSat solar en su interior.',
        badge: 'Nuevo · Cofia',
        parts: [
            { partDefId: 'fairing_wide_l', x: 0, y: -92, rotation: 0, color: '#f1f5f9', texture: 'smooth' },
            { partDefId: 'decoupler_mini', x: 0, y: -60, rotation: 0 },
            { partDefId: 'engine_nano_rcs', x: 0, y: -70, rotation: 0 },
            { partDefId: 'tank_nano_xs', x: 0, y: -85, rotation: 0, color: '#eab308', texture: 'foil', fuelPercent: 100 },
            { partDefId: 'probe_hex', x: 0, y: -104, rotation: 0, color: '#eab308', texture: 'foil' },
            { partDefId: 'solar_nano', x: -19, y: -85, rotation: 0, flipped: false, deployed: false },
            { partDefId: 'solar_nano', x: 19, y: -85, rotation: 0, flipped: true, deployed: false },
            { partDefId: 'tank_wide_m', x: 0, y: -19, rotation: 0, color: '#f1f5f9', texture: 'stripes', fuelPercent: 100 },
            { partDefId: 'engine_valiant', x: 0, y: 22, rotation: 0 },
            { partDefId: 'decoupler_vertical', x: 0, y: 38, rotation: 0 },
            { partDefId: 'tank_super_heavy', x: 0, y: 93, rotation: 0, color: '#f1f5f9', texture: 'smooth', fuelPercent: 100 },
            { partDefId: 'engine_frontier', x: 0, y: 156, rotation: 0 },
            { partDefId: 'fin_heavy', x: -39, y: 123, rotation: 0, flipped: false },
            { partDefId: 'fin_heavy', x: 39, y: 123, rotation: 0, flipped: true }
        ]
    },
    {
        id: 'vesper_explorer',
        name: 'Vesper Orbital Mk-1',
        desc: 'Cohete simple y equilibrado de dos etapas con paneles solares y patas.',
        badge: 'Estándar',
        parts: [
            { partDefId: 'capsule_vesper', x: 0, y: -112, rotation: 0, color: '#f1f5f9', texture: 'smooth' },
            { partDefId: 'tank_micro_s', x: 0, y: -85, rotation: 0, color: '#f1f5f9', texture: 'smooth', fuelPercent: 100 },
            { partDefId: 'engine_hawk_vac', x: 0, y: -62, rotation: 0 },
            { partDefId: 'decoupler_vertical', x: 0, y: -44, rotation: 0 },
            { partDefId: 'tank_long_l', x: 0, y: 6, rotation: 0, color: '#f1f5f9', texture: 'stripes', fuelPercent: 100 },
            { partDefId: 'engine_titan_sea', x: 0, y: 63, rotation: 0 },
            { partDefId: 'fin_delta', x: -24, y: 38, rotation: 0, flipped: false },
            { partDefId: 'fin_delta', x: 24, y: 38, rotation: 0, flipped: true },
            { partDefId: 'landing_legs_small', x: -26, y: 48, rotation: 0, flipped: false, deployed: true },
            { partDefId: 'landing_legs_small', x: 26, y: 48, rotation: 0, flipped: true, deployed: true },
            { partDefId: 'solar_compact', x: -33, y: -85, rotation: 0, flipped: false, deployed: true },
            { partDefId: 'solar_compact', x: 33, y: -85, rotation: 0, flipped: true, deployed: true }
        ]
    },
    {
        id: 'heavy_falcon',
        name: 'Falcon Heavy Dual',
        desc: 'Cohete de carga pesada con 2 aceleradores SRB laterales y núcleo Titán.',
        badge: 'Pesado',
        parts: [
            { partDefId: 'capsule_titan', x: 0, y: -114, rotation: 0, color: '#f1f5f9', texture: 'smooth' },
            { partDefId: 'tank_wide_m', x: 0, y: -65, rotation: 0, color: '#f1f5f9', texture: 'smooth', fuelPercent: 100 },
            { partDefId: 'tank_wide_m', x: 0, y: -5, rotation: 0, color: '#f1f5f9', texture: 'stripes', fuelPercent: 100 },
            { partDefId: 'engine_raptor_cluster', x: 0, y: 38, rotation: 0 },
            { partDefId: 'decoupler_radial', x: -26, y: -10, rotation: 0, flipped: false },
            { partDefId: 'nosecone_booster', x: -43, y: -60, rotation: 0, flipped: false, color: '#f1f5f9', texture: 'smooth' },
            { partDefId: 'engine_srb_booster', x: -43, y: -10, rotation: 0, flipped: false, color: '#f1f5f9', texture: 'stripes', fuelPercent: 100 },
            { partDefId: 'decoupler_radial', x: 26, y: -10, rotation: 0, flipped: true },
            { partDefId: 'nosecone_booster', x: 43, y: -60, rotation: 0, flipped: true, color: '#f1f5f9', texture: 'smooth' },
            { partDefId: 'engine_srb_booster', x: 43, y: -10, rotation: 0, flipped: true, color: '#f1f5f9', texture: 'stripes', fuelPercent: 100 },
            { partDefId: 'landing_legs_heavy', x: -35, y: 20, rotation: 0, flipped: false, deployed: true },
            { partDefId: 'landing_legs_heavy', x: 35, y: 20, rotation: 0, flipped: true, deployed: true }
        ]
    },
    {
        id: 'starship_steel',
        name: 'Starship Acero Pulido',
        desc: 'Monolito de acero inoxidable con tanque XL y clúster Raptor.',
        badge: 'Megacohete',
        parts: [
            { partDefId: 'nosecone_ogive', x: 0, y: -119, rotation: 0, color: '#cbd5e1', texture: 'steel' },
            { partDefId: 'tank_adapter_cone', x: 0, y: -90, rotation: 0, color: '#cbd5e1', texture: 'steel', fuelPercent: 100 },
            { partDefId: 'tank_super_heavy', x: 0, y: -25, rotation: 0, color: '#cbd5e1', texture: 'steel', fuelPercent: 100 },
            { partDefId: 'engine_raptor_cluster', x: 0, y: 38, rotation: 0 },
            { partDefId: 'grid_fin', x: -32, y: -60, rotation: 0, flipped: false },
            { partDefId: 'grid_fin', x: 32, y: -60, rotation: 0, flipped: true },
            { partDefId: 'landing_legs_heavy', x: -40, y: 18, rotation: 0, flipped: false, deployed: true },
            { partDefId: 'landing_legs_heavy', x: 40, y: 18, rotation: 0, flipped: true, deployed: true }
        ]
    },
    {
        id: 'solar_ion_probe',
        name: 'Sonda Iónica Voyager',
        desc: 'Sonda ligera de espacio profundo con mega-alas solares y propulsor iónico.',
        badge: 'Solar + Ión',
        parts: [
            { partDefId: 'probe_hex', x: 0, y: -42, rotation: 0, color: '#eab308', texture: 'foil' },
            { partDefId: 'battery_quantum', x: 0, y: -26, rotation: 0 },
            { partDefId: 'tank_spherical', x: 0, y: -5, rotation: 0, color: '#cbd5e1', texture: 'foil', fuelPercent: 100 },
            { partDefId: 'engine_ion_tachyon', x: 0, y: 18, rotation: 0 },
            { partDefId: 'solar_array_giant', x: -51, y: -5, rotation: 0, flipped: false, deployed: true },
            { partDefId: 'solar_array_giant', x: 51, y: -5, rotation: 0, flipped: true, deployed: true }
        ]
    },
    {
        id: 'lunar_lander',
        name: 'Lander Artemisa',
        desc: 'Módulo de aterrizaje con Cúpula Zen, motor Aerospike y 2 paneles.',
        badge: 'Lander',
        parts: [
            { partDefId: 'capsule_cupola', x: 0, y: -52, rotation: 0, color: '#f1f5f9', texture: 'smooth' },
            { partDefId: 'tank_wide_m', x: 0, y: -5, rotation: 0, color: '#eab308', texture: 'foil', fuelPercent: 100 },
            { partDefId: 'engine_aerospike', x: 0, y: 35, rotation: 0 },
            { partDefId: 'landing_legs_heavy', x: -35, y: 14, rotation: 0, flipped: false, deployed: true },
            { partDefId: 'landing_legs_heavy', x: 35, y: 14, rotation: 0, flipped: true, deployed: true },
            { partDefId: 'solar_array_1x3', x: -46, y: -12, rotation: 0, flipped: false, deployed: true },
            { partDefId: 'solar_array_1x3', x: 46, y: -12, rotation: 0, flipped: true, deployed: true },
            { partDefId: 'rcs_quad', x: -26, y: -28, rotation: 0, flipped: false },
            { partDefId: 'rcs_quad', x: 26, y: -28, rotation: 0, flipped: true }
        ]
    }
];

// --- 3. MOTOR DEL TALLER DE CONSTRUCCIÓN (ROCKET BUILDER ENGINE) ---
class RocketBuilderEngine {
    constructor() {
        this.placedParts = [];
        this.selectedPartId = null;
        this.selectedPartIds = new Set();
        this.selectionBox = null;
        this.hoveredPartId = null;
        this.draggedPart = null;
        this.symmetryMode = 1; // Espejo desactivado por defecto
        this.snapGridSize = 5;
        this.camera = { panX: 0, panY: 0, zoom: 1.0 };
        this.isPanning = false;
        this.lastMouse = { x: 0, y: 0 };
        this.rocketName = 'Vesper Orbital Mk-1';
        this.history = [];
        this.historyIndex = -1;
        this.activeCategory = 'capsules';
        this.instanceCounter = 1;
        this.snapIndicator = null;
        this.resizeMode = false;
        this.lockAspect = false;
        this.resizeDrag = null;
        this.floatingIds = new Set();

        this.canvas = null;
        this.ctx = null;
        this.animId = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.canvas = document.getElementById('builderCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.setupEventListeners();
        this.setupCategoriesUI();
        this.setupInspectorUI();
        this.renderCatalogParts();
        this.centerView();
        this.loadPreset('vesper_explorer');
        this.initialized = true;
    }

    // --- TRANSFORMACIÓN DE NODOS CON ROTACIÓN, FLIP Y TAMAÑO PERSONALIZADO ---
    getTransformedNodes(def, px, py, rotation = 0, flipped = false, part = null) {
        if (!def || !def.snapNodes) return [];
        const sz = getPartSize(part, def);
        const rad = ((rotation || 0) * Math.PI) / 180;
        const cosR = Math.cos(rad);
        const sinR = Math.sin(rad);
        const fxSign = flipped ? -1 : 1;

        return def.snapNodes.map(n => {
            const lx = n.x * sz.wScale * fxSign;
            const ly = n.y * sz.hScale;
            const rx = lx * cosR - ly * sinR;
            const ry = lx * sinR + ly * cosR;

            // Transformar dirección del nodo
            let dirX = 0, dirY = 0;
            if (n.dir === 'top') dirY = -1;
            else if (n.dir === 'bottom') dirY = 1;
            else if (n.dir === 'left') dirX = -1 * fxSign;
            else if (n.dir === 'right') dirX = 1 * fxSign;

            const rDirX = dirX * cosR - dirY * sinR;
            const rDirY = dirX * sinR + dirY * cosR;

            return {
                id: n.id,
                type: n.type,
                localX: rx,
                localY: ry,
                worldX: px + rx,
                worldY: py + ry,
                dirX: rDirX,
                dirY: rDirY
            };
        });
    }

    getPartBoundsLocal(def, rotation = 0, part = null) {
        const sz = getPartSize(part, def);
        const rad = ((rotation || 0) * Math.PI) / 180;
        const cosA = Math.abs(Math.cos(rad));
        const sinA = Math.abs(Math.sin(rad));
        return {
            halfW: (sz.width * cosA + sz.height * sinA) * 0.5,
            halfH: (sz.width * sinA + sz.height * cosA) * 0.5
        };
    }

    // --- MOTOR DE ENCAJE MAGNÉTICO INTELIGENTE (NODOS + BORDES LATERALES) ---
    calculateSnap(partDefId, targetX, targetY, ignoreIds = [], rotation = 0, flipped = false, partObj = null) {
        const defA = ROCKET_PARTS_CATALOG[partDefId];
        if (!defA) return { snapped: false, x: targetX, y: targetY, flipped };

        const SNAP_DIST = 22;
        let bestSnap = null;
        let minD = SNAP_DIST;
        let autoFlipped = flipped;

        // 1. Snapping al eje central x = 0 para piezas centrales (no radiales)
        if (!defA.radialAttachable && Math.abs(targetX) < 12) {
            targetX = 0;
        }

        const nodesA = this.getTransformedNodes(defA, 0, 0, rotation, flipped, partObj);

        // 2. Snapping nodo-a-nodo (stack <-> stack y radial <-> radial)
        for (const partB of this.placedParts) {
            if (ignoreIds.includes(partB.instanceId)) continue;
            const defB = ROCKET_PARTS_CATALOG[partB.partDefId];
            if (!defB) continue;

            const nodesB = this.getTransformedNodes(defB, partB.x, partB.y, partB.rotation || 0, partB.flipped || false, partB);

            for (const nA of nodesA) {
                for (const nB of nodesB) {
                    if (nA.type !== nB.type) continue;
                    // Direcciones deben oponerse (producto escalar < -0.5)
                    const dot = nA.dirX * nB.dirX + nA.dirY * nB.dirY;
                    if (dot > -0.5) continue;

                    const candX = targetX + nA.localX;
                    const candY = targetY + nA.localY;
                    const dist = Math.hypot(candX - nB.worldX, candY - nB.worldY);

                    if (dist < minD) {
                        minD = dist;
                        bestSnap = {
                            snapped: true,
                            x: Math.round(nB.worldX - nA.localX),
                            y: Math.round(nB.worldY - nA.localY),
                            flipped,
                            node: { x: nB.worldX, y: nB.worldY }
                        };
                    }
                }
            }
        }

        // 3. Snapping lateral al casco de tanques/cápsulas para piezas radiales (aletas, patas, paneles, RCS, SRB)
        if (!bestSnap && defA.radialAttachable) {
            const boundsA = this.getPartBoundsLocal(defA, rotation, partObj);
            for (const partB of this.placedParts) {
                if (ignoreIds.includes(partB.instanceId)) continue;
                const defB = ROCKET_PARTS_CATALOG[partB.partDefId];
                if (!defB || defB.radialAttachable) continue;

                const boundsB = this.getPartBoundsLocal(defB, partB.rotation || 0, partB);
                // Dentro del rango vertical del cuerpo B
                if (targetY >= partB.y - boundsB.halfH - 8 && targetY <= partB.y + boundsB.halfH + 8) {
                    const leftEdgeX = partB.x - boundsB.halfW - boundsA.halfW;
                    const rightEdgeX = partB.x + boundsB.halfW + boundsA.halfW;

                    const dLeft = Math.abs(targetX - leftEdgeX);
                    const dRight = Math.abs(targetX - rightEdgeX);

                    if (dLeft < SNAP_DIST && dLeft <= dRight && dLeft < minD) {
                        minD = dLeft;
                        bestSnap = {
                            snapped: true,
                            x: Math.round(leftEdgeX),
                            y: Math.round(targetY / this.snapGridSize) * this.snapGridSize,
                            flipped: false,
                            node: { x: partB.x - boundsB.halfW, y: Math.round(targetY / this.snapGridSize) * this.snapGridSize }
                        };
                    } else if (dRight < SNAP_DIST && dRight < minD) {
                        minD = dRight;
                        bestSnap = {
                            snapped: true,
                            x: Math.round(rightEdgeX),
                            y: Math.round(targetY / this.snapGridSize) * this.snapGridSize,
                            flipped: true,
                            node: { x: partB.x + boundsB.halfW, y: Math.round(targetY / this.snapGridSize) * this.snapGridSize }
                        };
                    }
                }
            }
        }

        return bestSnap || { snapped: false, x: Math.round(targetX / this.snapGridSize) * this.snapGridSize, y: Math.round(targetY / this.snapGridSize) * this.snapGridSize, flipped: autoFlipped };
    }

    // --- MANIJAS Y REDIMENSIONAMIENTO INTELIGENTE CON ADAPTACIÓN DE PARTES CONECTADAS ---
    getResizeHandles(part) {
        if (!part) return [];
        const def = ROCKET_PARTS_CATALOG[part.partDefId];
        if (!def) return [];
        const sz = getPartSize(part, def);
        const hw = sz.width * 0.5;
        const hh = sz.height * 0.5;
        const rad = ((part.rotation || 0) * Math.PI) / 180;
        const cosR = Math.cos(rad);
        const sinR = Math.sin(rad);
        const toWorld = (lx, ly) => ({ x: part.x + lx * cosR - ly * sinR, y: part.y + lx * sinR + ly * cosR });
        return [
            { side: 'top', ...toWorld(0, -hh), lx: 0, ly: -hh },
            { side: 'bottom', ...toWorld(0, hh), lx: 0, ly: hh },
            { side: 'left', ...toWorld(-hw, 0), lx: -hw, ly: 0 },
            { side: 'right', ...toWorld(hw, 0), lx: hw, ly: 0 },
            { side: 'corner', ...toWorld(hw, hh), lx: hw, ly: hh }
        ];
    }

    resizePartSmart(part, rawNewW, rawNewH, anchorSide = 'center', pushHistory = true) {
        if (!part) return;
        const def = ROCKET_PARTS_CATALOG[part.partDefId];
        if (!def) return;

        const oldSz = getPartSize(part, def);
        const oldW = oldSz.width;
        const oldH = oldSz.height;
        const newW = Math.max(8, Math.min(200, Math.round(rawNewW)));
        const newH = Math.max(8, Math.min(260, Math.round(rawNewH)));
        const dW = newW - oldW;
        const dH = newH - oldH;
        if (Math.abs(dW) < 0.1 && Math.abs(dH) < 0.1) return;

        const rad = ((part.rotation || 0) * Math.PI) / 180;
        const cosR = Math.cos(rad);
        const sinR = Math.sin(rad);

        // 1. Identificar y clasificar primero TODOS los vecinos directos por superficie ANTES de expandir subárboles
        const directNeighbors = this.placedParts.filter(o => o.instanceId !== part.instanceId && arePartsConnected(part, o));
        const sideSets = { top: new Set(), bottom: new Set(), left: new Set(), right: new Set() };
        const visitedGlobal = new Set([part.instanceId]);
        const directSeeds = { top: [], bottom: [], left: [], right: [] };

        for (const nb of directNeighbors) {
            visitedGlobal.add(nb.instanceId);
            const dx = nb.x - part.x;
            const dy = nb.y - part.y;
            const lx = dx * cosR + dy * sinR;
            const ly = -dx * sinR + dy * cosR;
            let bucket = 'right';
            if (ly <= -(oldH * 0.5 - 8) && Math.abs(lx) <= oldW * 0.5 + 10) bucket = 'top';
            else if (ly >= (oldH * 0.5 - 8) && Math.abs(lx) <= oldW * 0.5 + 10) bucket = 'bottom';
            else if (lx < 0) bucket = 'left';
            sideSets[bucket].add(nb.instanceId);
            directSeeds[bucket].push(nb);
        }

        const collectSubtree = (seeds, targetSet) => {
            const queue = [...seeds];
            while (queue.length > 0) {
                const cur = queue.shift();
                for (const cand of this.placedParts) {
                    if (visitedGlobal.has(cand.instanceId)) continue;
                    if (arePartsConnected(cur, cand)) {
                        visitedGlobal.add(cand.instanceId);
                        targetSet.add(cand.instanceId);
                        queue.push(cand);
                    }
                }
            }
        };

        collectSubtree(directSeeds.top, sideSets.top);
        collectSubtree(directSeeds.bottom, sideSets.bottom);
        collectSubtree(directSeeds.left, sideSets.left);
        collectSubtree(directSeeds.right, sideSets.right);

        // 2. Mantener la pieza centrada en su posición actual y expandir simétricamente desde el centro
        part.customWidth = newW;
        part.customHeight = newH;

        // 3. Desplazar cada subárbol conectado para que siga acoplado al borde exacto
        const applyLocalDelta = (idSet, dlx, dly) => {
            if (Math.abs(dlx) < 0.01 && Math.abs(dly) < 0.01) return;
            const dwx = dlx * cosR - dly * sinR;
            const dwy = dlx * sinR + dly * cosR;
            for (const p of this.placedParts) {
                if (idSet.has(p.instanceId)) {
                    p.x = Math.round(p.x + dwx);
                    p.y = Math.round(p.y + dwy);
                }
            }
        };

        applyLocalDelta(sideSets.top, 0, -dH * 0.5);
        applyLocalDelta(sideSets.bottom, 0, dH * 0.5);
        applyLocalDelta(sideSets.left, -dW * 0.5, 0);
        applyLocalDelta(sideSets.right, dW * 0.5, 0);

        this.syncMirrorForPart(part);
        this.updateStats();
        this.updateToolbarPosition();
        this.updateInspectorUI();
        if (pushHistory) this.saveHistory();
    }

    // --- SINCRONIZACIÓN DE ESPEJO BIDIRECCIONAL ---
    syncMirrorForPart(part) {
        if (!part) return;
        const mirrorPart = part.mirrorId ? this.placedParts.find(p => p.instanceId === part.mirrorId) : null;

        if (this.symmetryMode !== 2) {
            // Si el espejo está desactivado, desvincular el gemelo para evitar saltos inesperados
            if (mirrorPart && mirrorPart.mirrorId === part.instanceId) {
                mirrorPart.mirrorId = null;
            }
            part.mirrorId = null;
            return;
        }

        if (Math.abs(part.x) > 8) {
            const mirrorRot = (360 - (part.rotation || 0)) % 360;
            if (mirrorPart) {
                mirrorPart.x = -part.x;
                mirrorPart.y = part.y;
                mirrorPart.rotation = mirrorRot;
                mirrorPart.flipped = !part.flipped;
                mirrorPart.color = part.color;
                mirrorPart.texture = part.texture;
                mirrorPart.fuelPercent = part.fuelPercent;
                mirrorPart.thrustLimit = part.thrustLimit;
                mirrorPart.gimbalEnabled = part.gimbalEnabled;
                mirrorPart.deployed = part.deployed;
                mirrorPart.deployAnim = part.deployAnim;
                mirrorPart.customWidth = part.customWidth;
                mirrorPart.customHeight = part.customHeight;
            } else {
                const mirrorId = 'part_' + (this.instanceCounter++);
                part.mirrorId = mirrorId;
                this.placedParts.push({
                    ...JSON.parse(JSON.stringify(part)),
                    instanceId: mirrorId,
                    mirrorId: part.instanceId,
                    x: -part.x,
                    rotation: mirrorRot,
                    flipped: !part.flipped
                });
            }
        } else if (mirrorPart) {
            // Si la pieza volvió al eje central x=0, quitar su gemelo
            this.placedParts = this.placedParts.filter(p => p.instanceId !== mirrorPart.instanceId);
            part.mirrorId = null;
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());

        this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        window.addEventListener('mousemove', (e) => this.onPointerMove(e));
        window.addEventListener('mouseup', (e) => this.onPointerUp(e));

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.11;
            const newZoom = Math.max(0.35, Math.min(2.8, this.camera.zoom * zoomFactor));

            this.camera.panX = mouseX - (mouseX - this.camera.panX) * (newZoom / this.camera.zoom);
            this.camera.panY = mouseY - (mouseY - this.camera.panY) * (newZoom / this.camera.zoom);
            this.camera.zoom = newZoom;
            this.updateZoomDisplay();
        }, { passive: false });

        window.addEventListener('keydown', (e) => {
            const modal = document.getElementById('rocketBuilderModal');
            if (!modal || modal.classList.contains('hidden')) return;
            if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                this.deleteSelectedPart();
            } else if (e.key === 'r' || e.key === 'R') {
                this.rotateSelectedPart();
            } else if (e.key === 'f' || e.key === 'F') {
                this.flipSelectedPart();
            } else if (e.key === 's' || e.key === 'S') {
                if (!e.ctrlKey) this.toggleResizeMode();
            } else if (e.key === 'd' || e.key === 'D') {
                if (e.ctrlKey) { e.preventDefault(); this.duplicateSelectedPart(); }
            } else if (e.key === 'z' || e.key === 'Z') {
                if (e.ctrlKey) { e.preventDefault(); this.undo(); }
            } else if (e.key === 'y' || e.key === 'Y') {
                if (e.ctrlKey) { e.preventDefault(); this.redo(); }
            } else if (e.key === 'Escape') {
                const presetsModal = document.getElementById('builderPresetsModal');
                if (presetsModal && !presetsModal.classList.contains('hidden')) {
                    presetsModal.classList.add('hidden');
                } else {
                    closeRocketBuilder();
                }
            }
        });

        const bindClick = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        };

        bindClick('btnBldClose', () => closeRocketBuilder());
        bindClick('btnBldLaunch', () => this.launchRocket());
        bindClick('btnBldClear', () => {
            if (confirm('¿Vaciar todo el plano de ensamblaje?')) this.clearBlueprint();
        });
        bindClick('btnBldUndo', () => this.undo());
        bindClick('btnBldRedo', () => this.redo());
        bindClick('btnBldAutoCenter', () => this.autoCenterRocket());

        const btnSym = document.getElementById('btnBldSymmetry');
        const lblSym = document.getElementById('bldSymmetryLabel');
        if (btnSym) {
            btnSym.addEventListener('click', () => {
                this.symmetryMode = (this.symmetryMode === 1) ? 2 : 1;
                if (lblSym) {
                    lblSym.textContent = (this.symmetryMode === 2) ? '2x ON' : '1x OFF';
                    lblSym.className = (this.symmetryMode === 2) ? 'text-amber-300 font-bold' : 'text-stone-400';
                }
                this.playClickSound();
            });
        }

        bindClick('btnBldCenterView', () => this.centerView());
        bindClick('btnBldZoomIn', () => {
            this.camera.zoom = Math.min(2.8, this.camera.zoom * 1.15);
            this.updateZoomDisplay();
        });
        bindClick('btnBldZoomOut', () => {
            this.camera.zoom = Math.max(0.35, this.camera.zoom / 1.15);
            this.updateZoomDisplay();
        });

        bindClick('btnBldRotatePart', () => this.rotateSelectedPart());
        bindClick('btnBldFlipPart', () => this.flipSelectedPart());
        bindClick('btnBldResizePart', () => this.toggleResizeMode());
        bindClick('btnBldDupPart', () => this.duplicateSelectedPart());
        bindClick('btnBldDelPart', () => this.deleteSelectedPart());
        bindClick('btnBldPresets', () => this.renderPresetsModal('saved'));
        bindClick('btnBldTabSaved', () => this.renderPresetsModal('saved'));
        bindClick('btnBldTabTemplates', () => this.renderPresetsModal('templates'));
        bindClick('btnBldModalSaveNow', () => {
            if (!this.placedParts || this.placedParts.length === 0) return;
            this.renderPresetsModal('saved');
            const row = document.getElementById('bldSaveFormRow');
            const inp = document.getElementById('bldSaveNameInput');
            const nameInput = document.getElementById('builderRocketName');
            if (row && inp) {
                row.classList.remove('hidden');
                inp.value = (nameInput && nameInput.value) ? nameInput.value : (this.rocketName || 'Mi Cohete');
                inp.focus();
                inp.select();
            }
        });
        const confirmSave = () => {
            const inp = document.getElementById('bldSaveNameInput');
            const row = document.getElementById('bldSaveFormRow');
            const customName = inp ? inp.value.trim() : '';
            if (this.saveCurrentRocketDesign(true, customName || null)) {
                if (row) row.classList.add('hidden');
                this.renderPresetsModal('saved');
            }
        };
        bindClick('btnBldConfirmSave', confirmSave);
        bindClick('btnBldCancelSave', () => {
            const row = document.getElementById('bldSaveFormRow');
            if (row) row.classList.add('hidden');
        });
        const saveNameInp = document.getElementById('bldSaveNameInput');
        if (saveNameInp) {
            saveNameInp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmSave();
                } else if (e.key === 'Escape') {
                    const row = document.getElementById('bldSaveFormRow');
                    if (row) row.classList.add('hidden');
                }
            });
        }
        bindClick('btnClosePresetsModal', () => {
            const modal = document.getElementById('builderPresetsModal');
            const row = document.getElementById('bldSaveFormRow');
            if (row) row.classList.add('hidden');
            if (modal) modal.classList.add('hidden');
        });
    }

    setupInspectorUI() {
        const closeBtn = document.getElementById('btnBldInspClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.selectedPartId = null;
                this.updateToolbarPosition();
                this.updateInspectorUI();
            });
        }

        document.querySelectorAll('.bld-color-swatch').forEach(btn => {
            btn.addEventListener('click', () => {
                const col = btn.getAttribute('data-color');
                this.updateSelectedPartProps({ color: col });
            });
        });

        const colorPicker = document.getElementById('bldCustomColorInput');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                this.updateSelectedPartProps({ color: e.target.value });
            });
        }

        const btnColorAll = document.getElementById('btnBldApplyColorAll');
        if (btnColorAll) {
            btnColorAll.addEventListener('click', () => {
                const p = this.placedParts.find(x => x.instanceId === this.selectedPartId);
                if (!p) return;
                const col = p.color || ROCKET_PARTS_CATALOG[p.partDefId]?.defaultColor || '#f1f5f9';
                this.placedParts.forEach(part => { part.color = col; });
                this.saveHistory();
                this.playSnapSound();
            });
        }

        document.querySelectorAll('.bld-tex-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tex = btn.getAttribute('data-tex');
                this.updateSelectedPartProps({ texture: tex });
            });
        });

        const btnColorTanks = document.getElementById('btnBldApplyColorTanks');
        if (btnColorTanks) {
            btnColorTanks.addEventListener('click', () => {
                const p = this.placedParts.find(x => x.instanceId === this.selectedPartId);
                if (!p) return;
                const col = p.color || ROCKET_PARTS_CATALOG[p.partDefId]?.defaultColor || '#f1f5f9';
                this.placedParts.forEach(part => {
                    if (ROCKET_PARTS_CATALOG[part.partDefId]?.category === 'tanks') {
                        part.color = col;
                    }
                });
                this.saveHistory();
                this.playSnapSound();
            });
        }

        const btnTexAll = document.getElementById('btnBldApplyTexAll');
        if (btnTexAll) {
            btnTexAll.addEventListener('click', () => {
                const p = this.placedParts.find(x => x.instanceId === this.selectedPartId);
                if (!p) return;
                const tex = p.texture || ROCKET_PARTS_CATALOG[p.partDefId]?.defaultTexture || 'smooth';
                this.placedParts.forEach(part => { part.texture = tex; });
                this.saveHistory();
                this.playSnapSound();
            });
        }

        const fuelSlider = document.getElementById('bldInspFuelSlider');
        if (fuelSlider) {
            fuelSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                const lbl = document.getElementById('bldInspFuelVal');
                if (lbl) lbl.textContent = `${val}%`;
                this.updateSelectedPartProps({ fuelPercent: val }, false);
            });
            fuelSlider.addEventListener('change', () => this.saveHistory());
        }

        const thrustSlider = document.getElementById('bldInspThrustSlider');
        if (thrustSlider) {
            thrustSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                const lbl = document.getElementById('bldInspThrustVal');
                if (lbl) lbl.textContent = `${val}%`;
                this.updateSelectedPartProps({ thrustLimit: val }, false);
            });
            thrustSlider.addEventListener('change', () => this.saveHistory());
        }

        const gimbalCheck = document.getElementById('bldInspGimbalCheck');
        if (gimbalCheck) {
            gimbalCheck.addEventListener('change', (e) => {
                this.updateSelectedPartProps({ gimbalEnabled: e.target.checked });
            });
        }

        const deployBtn = document.getElementById('btnBldInspDeploy');
        if (deployBtn) {
            deployBtn.addEventListener('click', () => {
                const p = this.placedParts.find(x => x.instanceId === this.selectedPartId);
                if (!p) return;
                const next = !(p.deployed !== false);
                this.updateSelectedPartProps({ deployed: next, deployAnim: next ? 1 : 0 });
                this.playClickSound();
            });
        }

        document.querySelectorAll('.bld-trans-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const c = parseFloat(btn.getAttribute('data-curve'));
                this.updateSelectedPartProps({ transitionCurve: isNaN(c) ? 0.5 : c });
                this.playClickSound();
            });
        });

        const transSlider = document.getElementById('bldInspTransSlider');
        if (transSlider) {
            transSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10) / 100;
                this.updateSelectedPartProps({ transitionCurve: val }, false);
            });
            transSlider.addEventListener('change', () => this.saveHistory());
        }

        // Controles de Redimensionamiento Inteligente
        const aspectChk = document.getElementById('bldInspAspectCheck');
        if (aspectChk) {
            aspectChk.addEventListener('change', (e) => {
                this.lockAspect = !!e.target.checked;
            });
        }

        const applyDim = (newW, newH, pushHist = true) => {
            const p = this.placedParts.find(x => x.instanceId === this.selectedPartId);
            if (!p) return;
            this.resizePartSmart(p, newW, newH, 'center', pushHist);
        };

        const wSlider = document.getElementById('bldInspWidthSlider');
        const hSlider = document.getElementById('bldInspHeightSlider');
        if (wSlider) {
            wSlider.addEventListener('input', (e) => {
                const p = this.placedParts.find(x => x.instanceId === this.selectedPartId);
                if (!p) return;
                const def = ROCKET_PARTS_CATALOG[p.partDefId];
                const curSz = getPartSize(p, def);
                const nw = parseInt(e.target.value, 10);
                const nh = this.lockAspect ? Math.round(nw * (curSz.height / Math.max(1, curSz.width))) : curSz.height;
                applyDim(nw, nh, false);
            });
            wSlider.addEventListener('change', () => this.saveHistory());
        }
        if (hSlider) {
            hSlider.addEventListener('input', (e) => {
                const p = this.placedParts.find(x => x.instanceId === this.selectedPartId);
                if (!p) return;
                const def = ROCKET_PARTS_CATALOG[p.partDefId];
                const curSz = getPartSize(p, def);
                const nh = parseInt(e.target.value, 10);
                const nw = this.lockAspect ? Math.round(nh * (curSz.width / Math.max(1, curSz.height))) : curSz.width;
                applyDim(nw, nh, false);
            });
            hSlider.addEventListener('change', () => this.saveHistory());
        }

        const bindStep = (id, dw, dh) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('click', () => {
                const p = this.placedParts.find(x => x.instanceId === this.selectedPartId);
                if (!p) return;
                const def = ROCKET_PARTS_CATALOG[p.partDefId];
                const curSz = getPartSize(p, def);
                let nw = curSz.width + dw;
                let nh = curSz.height + dh;
                if (this.lockAspect) {
                    if (dw !== 0) nh = Math.round(nw * (curSz.height / Math.max(1, curSz.width)));
                    else if (dh !== 0) nw = Math.round(nh * (curSz.width / Math.max(1, curSz.height)));
                }
                applyDim(nw, nh, true);
                this.playClickSound();
            });
        };
        bindStep('btnBldWMinus', -2, 0);
        bindStep('btnBldWPlus', 2, 0);
        bindStep('btnBldHMinus', 0, -2);
        bindStep('btnBldHPlus', 0, 2);

        document.querySelectorAll('.bld-width-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetW = parseInt(btn.getAttribute('data-w'), 10);
                const p = this.placedParts.find(x => x.instanceId === this.selectedPartId);
                if (!p || isNaN(targetW)) return;
                const def = ROCKET_PARTS_CATALOG[p.partDefId];
                const curSz = getPartSize(p, def);
                const nh = this.lockAspect ? Math.round(targetW * (curSz.height / Math.max(1, curSz.width))) : curSz.height;
                applyDim(targetW, nh, true);
                this.playSnapSound();
            });
        });

        const btnMatch = document.getElementById('btnBldMatchWidth');
        if (btnMatch) {
            btnMatch.addEventListener('click', () => {
                const p = this.placedParts.find(x => x.instanceId === this.selectedPartId);
                if (!p) return;
                const def = ROCKET_PARTS_CATALOG[p.partDefId];
                const curSz = getPartSize(p, def);
                const neighbor = this.placedParts.find(o => o.instanceId !== p.instanceId && Math.abs(o.x - p.x) < 12 && arePartsConnected(p, o));
                if (!neighbor) return;
                const nbDef = ROCKET_PARTS_CATALOG[neighbor.partDefId];
                const nbSz = getPartSize(neighbor, nbDef);
                const nh = this.lockAspect ? Math.round(nbSz.width * (curSz.height / Math.max(1, curSz.width))) : curSz.height;
                applyDim(nbSz.width, nh, true);
                this.playSnapSound();
            });
        }

        const btnReset = document.getElementById('btnBldResetSize');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                const p = this.placedParts.find(x => x.instanceId === this.selectedPartId);
                if (!p) return;
                const def = ROCKET_PARTS_CATALOG[p.partDefId];
                if (!def) return;
                applyDim(def.width, def.height, true);
                this.playClickSound();
            });
        }
    }

    updateSelectedPartProps(props, pushHistory = true) {
        const part = this.placedParts.find(p => p.instanceId === this.selectedPartId);
        if (!part) return;
        Object.assign(part, props);
        this.syncMirrorForPart(part);
        this.updateStats();
        this.updateInspectorUI();
        if (pushHistory) this.saveHistory();
    }

    updateInspectorUI() {
        const panel = document.getElementById('builderPartInspector');
        if (!panel) return;

        const part = this.placedParts.find(p => p.instanceId === this.selectedPartId);
        const def = part ? ROCKET_PARTS_CATALOG[part.partDefId] : null;
        if (!part || !def) {
            panel.classList.add('hidden');
            return;
        }

        panel.classList.remove('hidden');
        const titleEl = document.getElementById('bldInspTitle');
        if (titleEl) titleEl.textContent = def.name;

        // Dimensiones actuales en el inspector
        const curSz = getPartSize(part, def);
        const wSlider = document.getElementById('bldInspWidthSlider');
        const hSlider = document.getElementById('bldInspHeightSlider');
        const wVal = document.getElementById('bldInspWidthVal');
        const hVal = document.getElementById('bldInspHeightVal');
        const aspectChk = document.getElementById('bldInspAspectCheck');
        if (wSlider) wSlider.value = Math.round(curSz.width);
        if (hSlider) hSlider.value = Math.round(curSz.height);
        if (wVal) wVal.textContent = `${Math.round(curSz.width)}px`;
        if (hVal) hVal.textContent = `${Math.round(curSz.height)}px`;
        if (aspectChk) aspectChk.checked = !!this.lockAspect;

        const activeColor = part.color || def.defaultColor || '#f1f5f9';
        const colorPicker = document.getElementById('bldCustomColorInput');
        if (colorPicker) colorPicker.value = activeColor;

        document.querySelectorAll('.bld-color-swatch').forEach(btn => {
            const c = btn.getAttribute('data-color');
            btn.style.outline = (c.toLowerCase() === activeColor.toLowerCase()) ? '2px solid #38bdf8' : 'none';
            btn.style.outlineOffset = '1px';
        });

        const activeTex = part.texture || def.defaultTexture || 'smooth';
        document.querySelectorAll('.bld-tex-btn').forEach(btn => {
            const t = btn.getAttribute('data-tex');
            if (t === activeTex) {
                btn.classList.add('bg-cyan-500/30', 'border-cyan-400', 'text-white');
            } else {
                btn.classList.remove('bg-cyan-500/30', 'border-cyan-400', 'text-white');
            }
        });

        // Combustible
        const fuelRow = document.getElementById('bldInspFuelRow');
        if (fuelRow) {
            if (def.fuelCapacity && def.fuelCapacity > 0) {
                fuelRow.classList.remove('hidden');
                const fp = (typeof part.fuelPercent === 'number') ? part.fuelPercent : 100;
                const slider = document.getElementById('bldInspFuelSlider');
                const lbl = document.getElementById('bldInspFuelVal');
                if (slider) slider.value = fp;
                if (lbl) lbl.textContent = `${fp}%`;
            } else {
                fuelRow.classList.add('hidden');
            }
        }

        // Motor
        const engRow = document.getElementById('bldInspEngineRow');
        if (engRow) {
            if (def.thrust && def.thrust > 0) {
                engRow.classList.remove('hidden');
                const tl = (typeof part.thrustLimit === 'number') ? part.thrustLimit : 100;
                const slider = document.getElementById('bldInspThrustSlider');
                const lbl = document.getElementById('bldInspThrustVal');
                const chk = document.getElementById('bldInspGimbalCheck');
                if (slider) slider.value = tl;
                if (lbl) lbl.textContent = `${tl}%`;
                if (chk) chk.checked = (part.gimbalEnabled !== false);
            } else {
                engRow.classList.add('hidden');
            }
        }

        // Desplegable (Panel solar / pata)
        const depRow = document.getElementById('bldInspDeployRow');
        if (depRow) {
            if (def.deployable) {
                depRow.classList.remove('hidden');
                const btn = document.getElementById('btnBldInspDeploy');
                const isOpen = (part.deployed !== false);
                if (btn) btn.textContent = isOpen ? '☀️ Contraer / Plegar' : '☀️ Desplegar / Abrir';
            } else {
                depRow.classList.add('hidden');
            }
        }

        // Transición entre diámetros
        const transRow = document.getElementById('bldInspTransitionRow');
        if (transRow) {
            const canTransition = !def.radialAttachable && (!def.thrust || def.thrust <= 0);
            if (canTransition) {
                transRow.classList.remove('hidden');
                const curve = (typeof part.transitionCurve === 'number') ? part.transitionCurve : 0.5;
                const lbl = document.getElementById('bldInspTransVal');
                const slider = document.getElementById('bldInspTransSlider');
                if (slider) slider.value = Math.round(curve * 100);
                if (lbl) lbl.textContent = curve <= 0.1 ? 'Recto' : (curve >= 0.85 ? 'Curvo' : `Suave (${Math.round(curve * 100)}%)`);
                document.querySelectorAll('.bld-trans-btn').forEach(btn => {
                    const c = parseFloat(btn.getAttribute('data-curve'));
                    if (Math.abs(c - curve) < 0.15) {
                        btn.classList.add('bg-emerald-500/30', 'border-emerald-400', 'text-white');
                    } else {
                        btn.classList.remove('bg-emerald-500/30', 'border-emerald-400', 'text-white');
                    }
                });
            } else {
                transRow.classList.add('hidden');
            }
        }
    }

    getSavedRockets() {
        try {
            const raw = localStorage.getItem('eter_saved_rockets_v1');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    saveCurrentRocketDesign(showFeedback = true, customName = null) {
        if (!this.placedParts || this.placedParts.length === 0) return false;
        const nameInput = document.getElementById('builderRocketName');
        const rawName = (customName !== null && String(customName).trim())
            ? String(customName)
            : ((nameInput && nameInput.value) ? nameInput.value : (this.rocketName || 'Mi Cohete'));
        const name = String(rawName).trim() || 'Mi Cohete';
        this.rocketName = name;
        if (nameInput) nameInput.value = name;

        const specs = this.calculateRocketSpecs ? this.calculateRocketSpecs() : { totalMass: 0, twr: 0 };
        const serializedParts = this.placedParts.map(p => ({
            instanceId: p.instanceId,
            partDefId: p.partDefId,
            x: p.x,
            y: p.y,
            rotation: p.rotation || 0,
            flipped: !!p.flipped,
            color: p.color,
            texture: p.texture,
            fuelPercent: (typeof p.fuelPercent === 'number') ? p.fuelPercent : 100,
            thrustLimit: (typeof p.thrustLimit === 'number') ? p.thrustLimit : 100,
            gimbalEnabled: p.gimbalEnabled !== false,
            deployed: p.deployed !== false,
            mirrorId: p.mirrorId || null,
            customWidth: (typeof p.customWidth === 'number') ? p.customWidth : undefined,
            customHeight: (typeof p.customHeight === 'number') ? p.customHeight : undefined
        }));

        const saved = this.getSavedRockets();
        const existingIdx = saved.findIndex(r => (r.name || '').trim().toLowerCase() === name.toLowerCase());
        const entry = {
            id: existingIdx >= 0 ? saved[existingIdx].id : ('saved_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
            name,
            savedAt: new Date().toISOString(),
            partCount: serializedParts.length,
            totalMass: Math.round(specs.totalMass || 0),
            twr: Number((specs.twr || 0).toFixed(2)),
            parts: serializedParts
        };
        if (existingIdx >= 0) saved.splice(existingIdx, 1);
        saved.unshift(entry);

        try {
            localStorage.setItem('eter_saved_rockets_v1', JSON.stringify(saved));
        } catch (e) {
            return false;
        }

        if (showFeedback) {
            this.playSnapSound();
            const lbl = document.getElementById('bldSaveBtnLabel');
            if (lbl) {
                lbl.textContent = '✓ Guardado';
                clearTimeout(this._saveLabelTimer);
                this._saveLabelTimer = setTimeout(() => {
                    lbl.textContent = '💾 Guardar';
                }, 1500);
            }
        }
        return true;
    }

    loadSavedRocket(savedId) {
        const entry = this.getSavedRockets().find(r => r.id === savedId);
        if (!entry || !Array.isArray(entry.parts)) return false;

        this.placedParts = [];
        this.instanceCounter = 1;
        const idMap = new Map();

        for (const item of entry.parts) {
            const newId = 'part_' + (this.instanceCounter++);
            if (item.instanceId) idMap.set(item.instanceId, newId);
            const def = ROCKET_PARTS_CATALOG[item.partDefId];
            if (!def) continue;
            const part = {
                instanceId: newId,
                partDefId: item.partDefId,
                x: item.x,
                y: item.y,
                rotation: item.rotation || 0,
                flipped: !!item.flipped,
                color: item.color || def.defaultColor || '#f1f5f9',
                texture: item.texture || def.defaultTexture || 'smooth',
                fuelPercent: (typeof item.fuelPercent === 'number') ? item.fuelPercent : 100,
                thrustLimit: (typeof item.thrustLimit === 'number') ? item.thrustLimit : 100,
                gimbalEnabled: item.gimbalEnabled !== false,
                deployed: item.deployed !== false,
                deployAnim: (item.deployed === false) ? 0.0 : 1.0,
                fairingOpened: false,
                mirrorId: item.mirrorId || null
            };
            if (typeof item.customWidth === 'number') part.customWidth = item.customWidth;
            if (typeof item.customHeight === 'number') part.customHeight = item.customHeight;
            this.placedParts.push(part);
        }

        for (const p of this.placedParts) {
            p.mirrorId = (p.mirrorId && idMap.has(p.mirrorId)) ? idMap.get(p.mirrorId) : null;
        }

        const nameInput = document.getElementById('builderRocketName');
        if (nameInput) {
            nameInput.value = entry.name || 'Mi Cohete';
        }
        this.rocketName = entry.name || 'Mi Cohete';

        this.history = [];
        this.historyIndex = -1;
        this.saveHistory();
        this.selectedPartId = null;
        if (this.selectedPartIds) this.selectedPartIds.clear();
        this.centerView();
        this.updateStats();
        this.updateToolbarPosition();
        this.updateInspectorUI();
        return true;
    }

    deleteSavedRocket(savedId) {
        const filtered = this.getSavedRockets().filter(r => r.id !== savedId);
        try {
            localStorage.setItem('eter_saved_rockets_v1', JSON.stringify(filtered));
        } catch (e) {}
        this.renderPresetsModal('saved');
    }

    renderPresetsModal(activeTab = null) {
        const modal = document.getElementById('builderPresetsModal');
        const list = document.getElementById('builderPresetsList');
        if (!modal || !list) return;

        const tab = activeTab || this.presetsModalTab || 'saved';
        this.presetsModalTab = tab;

        const tabSaved = document.getElementById('btnBldTabSaved');
        const tabTemplates = document.getElementById('btnBldTabTemplates');
        const activeCls = 'px-3 py-1.5 rounded-lg text-xs font-display font-semibold bg-amber-400/20 text-amber-200 border border-amber-400/40 cursor-pointer transition-all';
        const idleCls = 'px-3 py-1.5 rounded-lg text-xs font-display font-semibold text-stone-400 hover:text-white border border-transparent cursor-pointer transition-all';
        if (tabSaved) tabSaved.className = (tab === 'saved') ? activeCls : idleCls;
        if (tabTemplates) tabTemplates.className = (tab === 'templates') ? activeCls : idleCls;
        const saveRow = document.getElementById('bldSaveFormRow');
        if (saveRow && tab !== 'saved') saveRow.classList.add('hidden');

        const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        list.innerHTML = '';
        if (tab === 'saved') {
            const savedList = this.getSavedRockets();
            if (savedList.length === 0) {
                list.innerHTML = `
                    <div class="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 text-center space-y-2">
                        <div class="text-2xl">📂</div>
                        <h4 class="font-display text-sm font-bold text-white">Todavía no tenés cohetes guardados</h4>
                        <p class="text-[11px] text-stone-400 max-w-md mx-auto">Diseñá tu cohete en el taller y tocá <span class="text-emerald-300 font-semibold">💾 Guardar</span> para tenerlo siempre disponible acá, o explorá la pestaña <span class="text-amber-300 font-semibold">🚀 Plantillas</span>.</p>
                    </div>
                `;
            } else {
                for (const item of savedList) {
                    const card = document.createElement('div');
                    card.className = 'p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/40 hover:bg-white/[0.06] transition-all flex items-center justify-between gap-3';
                    const dateStr = item.savedAt ? new Date(item.savedAt).toLocaleDateString() : '';
                    card.innerHTML = `
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-bold text-base shrink-0">🛸</div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h4 class="font-display text-sm font-bold text-white truncate">${esc(item.name)}</h4>
                                    <span class="text-[9px] font-mono-num px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 font-semibold uppercase">${item.partCount || (item.parts ? item.parts.length : 0)} piezas</span>
                                </div>
                                <p class="text-[11px] text-stone-300 font-mono-num mt-0.5">Masa: ${item.totalMass || 0} t · TWR: ${item.twr || 0}${dateStr ? ' · ' + esc(dateStr) : ''}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <button class="btn-load-saved aero-pill aero-btn px-3.5 py-1.5 rounded-xl text-xs font-display font-semibold text-emerald-200 border-emerald-400/40 hover:bg-emerald-400/20 cursor-pointer" data-id="${esc(item.id)}">Cargar</button>
                            <button class="btn-del-saved aero-pill aero-btn p-1.5 rounded-xl text-stone-400 hover:text-rose-400 border-white/10 cursor-pointer" data-id="${esc(item.id)}" title="Eliminar guardado">🗑️</button>
                        </div>
                    `;
                    list.appendChild(card);
                }

                list.querySelectorAll('.btn-load-saved').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.loadSavedRocket(btn.getAttribute('data-id'));
                        modal.classList.add('hidden');
                        this.playSnapSound();
                    });
                });
                list.querySelectorAll('.btn-del-saved').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.deleteSavedRocket(btn.getAttribute('data-id'));
                        this.playClickSound();
                    });
                });
            }
        } else {
            for (const preset of ROCKET_PRESETS) {
                const card = document.createElement('div');
                card.className = 'p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/40 hover:bg-white/[0.06] transition-all flex items-center justify-between gap-3';
                card.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold text-base">🚀</div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h4 class="font-display text-sm font-bold text-white">${preset.name}</h4>
                                <span class="text-[9px] font-mono-num px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold uppercase">${preset.badge}</span>
                            </div>
                            <p class="text-[11px] text-stone-300 font-light mt-0.5 leading-snug">${preset.desc}</p>
                        </div>
                    </div>
                    <button class="btn-load-preset aero-pill aero-btn px-3.5 py-1.5 rounded-xl text-xs font-display font-semibold text-amber-200 border-amber-400/40 hover:bg-amber-400/20 shrink-0 cursor-pointer" data-id="${preset.id}">Cargar</button>
                `;
                list.appendChild(card);
            }

            list.querySelectorAll('.btn-load-preset').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.loadPreset(btn.getAttribute('data-id'));
                    modal.classList.add('hidden');
                    this.playSnapSound();
                });
            });
        }

        modal.classList.remove('hidden');
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    centerView() {
        this.resizeCanvas();
        if (!this.canvas) return;
        this.camera.panX = this.canvas.width / 2;
        this.camera.panY = this.canvas.height / 2 + 20;
        this.camera.zoom = 1.25;
        this.updateZoomDisplay();
    }

    autoCenterRocket() {
        if (this.placedParts.length === 0) return;
        let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of this.placedParts) {
            const def = ROCKET_PARTS_CATALOG[p.partDefId];
            if (!def) continue;
            const b = this.getPartBoundsLocal(def, p.rotation || 0);
            minX = Math.min(minX, p.x - b.halfW);
            maxX = Math.max(maxX, p.x + b.halfW);
            maxY = Math.max(maxY, p.y + b.halfH);
        }
        const cx = Math.round(((minX + maxX) * 0.5) / this.snapGridSize) * this.snapGridSize;
        const dy = Math.round(145 - maxY);
        for (const p of this.placedParts) {
            p.x -= cx;
            p.y += dy;
        }
        this.saveHistory();
        this.updateStats();
        this.updateToolbarPosition();
        this.playSnapSound();
    }

    updateZoomDisplay() {
        const zoomEl = document.getElementById('bldZoomLevel');
        if (zoomEl) zoomEl.textContent = `${Math.round(this.camera.zoom * 100)}%`;
    }

    screenToWorld(sx, sy) {
        return {
            x: (sx - this.camera.panX) / this.camera.zoom,
            y: (sy - this.camera.panY) / this.camera.zoom
        };
    }

    worldToScreen(wx, wy) {
        return {
            x: wx * this.camera.zoom + this.camera.panX,
            y: wy * this.camera.zoom + this.camera.panY
        };
    }

    onPointerDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const worldPos = this.screenToWorld(sx, sy);

        this.lastMouse = { x: sx, y: sy };

        if (e.button === 1 || e.button === 2) {
            this.isPanning = true;
            return;
        }

        // 1. Verificar si se hizo clic en una manija de redimensionamiento
        if (this.resizeMode && this.selectedPartId) {
            const selPart = this.placedParts.find(p => p.instanceId === this.selectedPartId);
            if (selPart) {
                const handles = this.getResizeHandles(selPart);
                const hitR = 11 / Math.max(0.4, this.camera.zoom);
                for (const h of handles) {
                    if (Math.hypot(worldPos.x - h.x, worldPos.y - h.y) <= hitR) {
                        const def = ROCKET_PARTS_CATALOG[selPart.partDefId];
                        const sz = getPartSize(selPart, def);
                        this.resizeDrag = {
                            instanceId: selPart.instanceId,
                            side: h.side,
                            lastWorldX: worldPos.x,
                            lastWorldY: worldPos.y,
                            accumW: sz.width,
                            accumH: sz.height,
                            aspect: sz.width / Math.max(1, sz.height)
                        };
                        this.playClickSound();
                        return;
                    }
                }
            }
        }

        const clickedPart = this.getPartAtWorld(worldPos.x, worldPos.y);
        if (clickedPart) {
            if (e.shiftKey) {
                if (this.selectedPartIds.has(clickedPart.instanceId)) {
                    this.selectedPartIds.delete(clickedPart.instanceId);
                    this.selectedPartId = this.selectedPartIds.size > 0 ? [...this.selectedPartIds][0] : null;
                } else {
                    this.selectedPartIds.add(clickedPart.instanceId);
                    this.selectedPartId = clickedPart.instanceId;
                }
                this.resizeMode = false;
            } else {
                if (!this.selectedPartIds.has(clickedPart.instanceId)) {
                    this.selectedPartIds.clear();
                    this.selectedPartIds.add(clickedPart.instanceId);
                }
                if (this.selectedPartId !== clickedPart.instanceId) {
                    this.resizeMode = false;
                }
                this.selectedPartId = clickedPart.instanceId;
            }
            this.draggedPart = {
                instanceId: clickedPart.instanceId,
                partDefId: clickedPart.partDefId,
                fromPalette: false,
                offsetX: worldPos.x - clickedPart.x,
                offsetY: worldPos.y - clickedPart.y
            };
            this.playClickSound();
        } else {
            this.resizeMode = false;
            const preSelected = e.shiftKey ? new Set(this.selectedPartIds) : new Set();
            if (!e.shiftKey) {
                this.selectedPartId = null;
                this.selectedPartIds.clear();
            }
            this.selectionBox = {
                startX: worldPos.x,
                startY: worldPos.y,
                currentX: worldPos.x,
                currentY: worldPos.y,
                preSelected
            };
        }

        this.updateToolbarPosition();
        this.updateInspectorUI();
        this.updateStats();
    }

    onPointerMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const worldPos = this.screenToWorld(sx, sy);

        if (this.isPanning) {
            this.camera.panX += sx - this.lastMouse.x;
            this.camera.panY += sy - this.lastMouse.y;
            this.lastMouse = { x: sx, y: sy };
            return;
        }

        this.lastMouse = { x: sx, y: sy };

        // Selección múltiple por recuadro de arrastre
        if (this.selectionBox) {
            this.selectionBox.currentX = worldPos.x;
            this.selectionBox.currentY = worldPos.y;
            const minX = Math.min(this.selectionBox.startX, this.selectionBox.currentX);
            const maxX = Math.max(this.selectionBox.startX, this.selectionBox.currentX);
            const minY = Math.min(this.selectionBox.startY, this.selectionBox.currentY);
            const maxY = Math.max(this.selectionBox.startY, this.selectionBox.currentY);
            const nextSet = new Set(this.selectionBox.preSelected);
            if (maxX - minX > 3 || maxY - minY > 3) {
                for (const p of this.placedParts) {
                    const def = ROCKET_PARTS_CATALOG[p.partDefId];
                    if (!def) continue;
                    const b = this.getPartBoundsLocal(def, p.rotation || 0, p);
                    if (p.x + b.halfW >= minX && p.x - b.halfW <= maxX && p.y + b.halfH >= minY && p.y - b.halfH <= maxY) {
                        nextSet.add(p.instanceId);
                    }
                }
            }
            this.selectedPartIds = nextSet;
            this.selectedPartId = nextSet.size > 0 ? [...nextSet][0] : null;
            return;
        }

        // Arrastre de manija de redimensionamiento (centrado: el borde se mueve la mitad, por eso * 2)
        if (this.resizeDrag) {
            const part = this.placedParts.find(p => p.instanceId === this.resizeDrag.instanceId);
            if (part) {
                const rad = ((part.rotation || 0) * Math.PI) / 180;
                const cosR = Math.cos(rad);
                const sinR = Math.sin(rad);
                const dxW = worldPos.x - this.resizeDrag.lastWorldX;
                const dyW = worldPos.y - this.resizeDrag.lastWorldY;
                this.resizeDrag.lastWorldX = worldPos.x;
                this.resizeDrag.lastWorldY = worldPos.y;

                const dlx = dxW * cosR + dyW * sinR;
                const dly = -dxW * sinR + dyW * cosR;
                const side = this.resizeDrag.side;

                if (side === 'right') this.resizeDrag.accumW += dlx * 2;
                else if (side === 'left') this.resizeDrag.accumW -= dlx * 2;
                else if (side === 'bottom') this.resizeDrag.accumH += dly * 2;
                else if (side === 'top') this.resizeDrag.accumH -= dly * 2;
                else if (side === 'corner') {
                    this.resizeDrag.accumW += dlx * 2;
                    this.resizeDrag.accumH += dly * 2;
                }

                let targetW = Math.round(this.resizeDrag.accumW / 2) * 2;
                let targetH = Math.round(this.resizeDrag.accumH / 2) * 2;

                if (this.lockAspect || side === 'corner') {
                    if (side === 'top' || side === 'bottom') {
                        targetW = Math.round(targetH * this.resizeDrag.aspect);
                    } else {
                        targetH = Math.round(targetW / Math.max(0.1, this.resizeDrag.aspect));
                    }
                }

                // Encaje magnético de ancho al ancho de piezas conectadas/cercanas
                if (side === 'left' || side === 'right' || side === 'corner') {
                    for (const other of this.placedParts) {
                        if (other.instanceId === part.instanceId) continue;
                        const oDef = ROCKET_PARTS_CATALOG[other.partDefId];
                        if (!oDef || oDef.radialAttachable) continue;
                        const oSz = getPartSize(other, oDef);
                        if (Math.abs(targetW - oSz.width) <= 3) {
                            targetW = oSz.width;
                            break;
                        }
                    }
                }

                this.resizePartSmart(part, targetW, targetH, side, false);
            }
            return;
        }

        if (this.draggedPart) {
            const rawX = worldPos.x - this.draggedPart.offsetX;
            const rawY = worldPos.y - this.draggedPart.offsetY;

            if (this.draggedPart.fromPalette) {
                const snapResult = this.calculateSnap(this.draggedPart.partDefId, rawX, rawY, [], 0, false, null);
                this.draggedPart.currentX = snapResult.x;
                this.draggedPart.currentY = snapResult.y;
                this.draggedPart.currentFlipped = snapResult.flipped;
                this.snapIndicator = snapResult.snapped ? snapResult.node : null;
            } else {
                const part = this.placedParts.find(p => p.instanceId === this.draggedPart.instanceId);
                if (part) {
                    const groupIds = (this.selectedPartIds && this.selectedPartIds.size > 1 && this.selectedPartIds.has(part.instanceId))
                        ? this.selectedPartIds
                        : new Set([part.instanceId]);

                    const ignoreSet = new Set(groupIds);
                    for (const gid of groupIds) {
                        const gp = this.placedParts.find(x => x.instanceId === gid);
                        if (gp && gp.mirrorId) ignoreSet.add(gp.mirrorId);
                    }

                    const prevX = part.x;
                    const prevY = part.y;
                    const snapResult = this.calculateSnap(part.partDefId, rawX, rawY, [...ignoreSet], part.rotation || 0, part.flipped || false, part);
                    const deltaX = snapResult.x - prevX;
                    const deltaY = snapResult.y - prevY;

                    if (groupIds.size > 1) {
                        const movedX = Math.abs(deltaX) >= 1;
                        const unlinkedInGroup = new Set();
                        for (const gp of this.placedParts) {
                            if (groupIds.has(gp.instanceId)) {
                                gp.x = Math.round(gp.x + deltaX);
                                gp.y = Math.round(gp.y + deltaY);
                                if (unlinkedInGroup.has(gp.instanceId)) continue;
                                if (gp.mirrorId && groupIds.has(gp.mirrorId)) {
                                    if (movedX) {
                                        const twin = this.placedParts.find(m => m.instanceId === gp.mirrorId);
                                        if (twin) {
                                            twin.mirrorId = null;
                                            unlinkedInGroup.add(twin.instanceId);
                                        }
                                        gp.mirrorId = null;
                                        unlinkedInGroup.add(gp.instanceId);
                                    }
                                } else {
                                    this.syncMirrorForPart(gp);
                                }
                            }
                        }
                    } else {
                        part.x = snapResult.x;
                        part.y = snapResult.y;
                        if (snapResult.snapped && ROCKET_PARTS_CATALOG[part.partDefId]?.radialAttachable) {
                            part.flipped = snapResult.flipped;
                        }
                        this.syncMirrorForPart(part);
                    }
                    this.snapIndicator = snapResult.snapped ? snapResult.node : null;
                }
            }
            this.updateToolbarPosition();
            const trashOv = document.getElementById('builderTrashOverlay');
            if (trashOv) {
                if (!this.draggedPart.fromPalette && e.clientX < rect.left - 36) {
                    trashOv.classList.remove('hidden');
                } else {
                    trashOv.classList.add('hidden');
                }
            }
        } else {
            const hovered = this.getPartAtWorld(worldPos.x, worldPos.y);
            this.hoveredPartId = hovered ? hovered.instanceId : null;
        }
    }

    onPointerUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
        }
        if (this.selectionBox) {
            this.selectionBox = null;
            this.updateToolbarPosition();
            this.updateInspectorUI();
            this.updateStats();
            if (this.selectedPartIds.size > 0) this.playClickSound();
            return;
        }
        if (this.resizeDrag) {
            this.resizeDrag = null;
            this.saveHistory();
            this.playSnapSound();
            this.updateStats();
            this.updateToolbarPosition();
            this.updateInspectorUI();
            return;
        }
        const trashOv = document.getElementById('builderTrashOverlay');
        if (trashOv) trashOv.classList.add('hidden');

        if (this.draggedPart) {
            if (this.draggedPart.fromPalette) {
                const rect = this.canvas.getBoundingClientRect();
                const insideCanvas = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
                if (insideCanvas && this.draggedPart.currentX !== undefined) {
                    this.addPart(
                        this.draggedPart.partDefId,
                        this.draggedPart.currentX,
                        this.draggedPart.currentY,
                        0,
                        this.draggedPart.currentFlipped || false
                    );
                    this.playSnapSound();
                } else if (this.draggedPart.clickMode) {
                    // Clic rápido en catálogo: colocar automáticamente conectado al cohete
                    this.smartAddPart(this.draggedPart.partDefId);
                    this.playSnapSound();
                }
            } else {
                // Solo eliminar si se arrastra claramente dentro del panel izquierdo (> 36px)
                const rect = this.canvas.getBoundingClientRect();
                if (e.clientX < rect.left - 36) {
                    this.deleteSelectedPart();
                } else {
                    this.saveHistory();
                    this.playSnapSound();
                }
            }

            this.draggedPart = null;
            this.snapIndicator = null;
            this.updateStats();
            this.updateToolbarPosition();
            this.updateInspectorUI();
        }
    }

    smartAddPart(partDefId) {
        const def = ROCKET_PARTS_CATALOG[partDefId];
        if (!def) return;
        if (this.placedParts.length === 0) {
            this.addPart(partDefId, 0, 0, 0, false);
            return;
        }
        // Encontrar el extremo inferior o superior del cohete central
        let minY = Infinity, maxY = -Infinity;
        for (const p of this.placedParts) {
            const d = ROCKET_PARTS_CATALOG[p.partDefId];
            if (!d) continue;
            const b = this.getPartBoundsLocal(d, p.rotation || 0, p);
            if (Math.abs(p.x) < 15) {
                minY = Math.min(minY, p.y - b.halfH);
                maxY = Math.max(maxY, p.y + b.halfH);
            }
        }
        if (def.radialAttachable) {
            this.addPart(partDefId, -25, 0, 0, false);
        } else if (def.category === 'capsules' || def.category === 'aero' || def.category === 'fairings') {
            const yPos = isFinite(minY) ? minY - def.height / 2 : -40;
            this.addPart(partDefId, 0, yPos, 0, false);
        } else {
            const yPos = isFinite(maxY) ? maxY + def.height / 2 : 40;
            this.addPart(partDefId, 0, yPos, 0, false);
        }
    }

    getPartAtWorld(wx, wy) {
        // Priorizar piezas internas (no-cofias) para poder seleccionar cargas dentro de cofias transparentes
        let fairingHit = null;
        for (let i = this.placedParts.length - 1; i >= 0; i--) {
            const p = this.placedParts[i];
            const def = ROCKET_PARTS_CATALOG[p.partDefId];
            if (!def) continue;
            const b = this.getPartBoundsLocal(def, p.rotation || 0, p);
            if (wx >= p.x - b.halfW - 3 && wx <= p.x + b.halfW + 3 &&
                wy >= p.y - b.halfH - 3 && wy <= p.y + b.halfH + 3) {
                if (def.isFairing) {
                    if (!fairingHit) fairingHit = p;
                } else {
                    return p;
                }
            }
        }
        return fairingHit;
    }

    addPart(partDefId, x, y, rotation = 0, flipped = false) {
        const def = ROCKET_PARTS_CATALOG[partDefId];
        const id = 'part_' + (this.instanceCounter++);
        const newPart = {
            instanceId: id,
            partDefId,
            x: Math.round(x),
            y: Math.round(y),
            rotation,
            flipped,
            color: def?.defaultColor || '#f1f5f9',
            texture: def?.defaultTexture || 'smooth',
            fuelPercent: 100,
            thrustLimit: 100,
            gimbalEnabled: true,
            deployed: true,
            deployAnim: 1.0,
            mirrorId: null
        };

        this.placedParts.push(newPart);
        this.selectedPartId = id;
        this.selectedPartIds = new Set([id]);
        this.syncMirrorForPart(newPart);

        this.saveHistory();
        this.updateStats();
        this.updateToolbarPosition();
        this.updateInspectorUI();
        return newPart;
    }

    deleteSelectedPart() {
        const idsToDelete = new Set();
        if (this.selectedPartIds && this.selectedPartIds.size > 0) {
            for (const id of this.selectedPartIds) idsToDelete.add(id);
        } else if (this.selectedPartId) {
            idsToDelete.add(this.selectedPartId);
        }
        if (idsToDelete.size === 0) return;

        for (const p of this.placedParts) {
            if (idsToDelete.has(p.instanceId) && p.mirrorId) {
                idsToDelete.add(p.mirrorId);
            }
        }
        this.placedParts = this.placedParts.filter(p => !idsToDelete.has(p.instanceId));
        this.selectedPartId = null;
        this.selectedPartIds.clear();
        this.resizeMode = false;
        this.saveHistory();
        this.updateStats();
        this.updateToolbarPosition();
        this.updateInspectorUI();
        this.playTrashSound();
    }

    rotateSelectedPart() {
        const ids = (this.selectedPartIds && this.selectedPartIds.size > 0)
            ? [...this.selectedPartIds]
            : (this.selectedPartId ? [this.selectedPartId] : []);
        if (ids.length === 0) return;

        const handled = new Set();
        let changed = false;
        for (const id of ids) {
            if (handled.has(id)) continue;
            const part = this.placedParts.find(p => p.instanceId === id);
            if (!part) continue;
            part.rotation = ((part.rotation || 0) + 90) % 360;
            handled.add(id);
            if (this.symmetryMode === 2 && part.mirrorId) handled.add(part.mirrorId);
            this.syncMirrorForPart(part);
            changed = true;
        }
        if (!changed) return;
        this.saveHistory();
        this.updateStats();
        this.playClickSound();
    }

    flipSelectedPart() {
        const ids = (this.selectedPartIds && this.selectedPartIds.size > 0)
            ? [...this.selectedPartIds]
            : (this.selectedPartId ? [this.selectedPartId] : []);
        if (ids.length === 0) return;

        const handled = new Set();
        let changed = false;
        for (const id of ids) {
            if (handled.has(id)) continue;
            const part = this.placedParts.find(p => p.instanceId === id);
            if (!part) continue;
            part.flipped = !part.flipped;
            handled.add(id);
            if (this.symmetryMode === 2 && part.mirrorId) handled.add(part.mirrorId);
            this.syncMirrorForPart(part);
            changed = true;
        }
        if (!changed) return;
        this.saveHistory();
        this.updateStats();
        this.playClickSound();
    }

    toggleResizeMode() {
        if (!this.selectedPartId) return;
        this.resizeMode = !this.resizeMode;
        this.updateToolbarPosition();
        this.playClickSound();
    }

    duplicateSelectedPart() {
        const srcIds = (this.selectedPartIds && this.selectedPartIds.size > 1)
            ? [...this.selectedPartIds]
            : (this.selectedPartId ? [this.selectedPartId] : []);
        if (srcIds.length === 0) return;

        const newIds = new Set();
        for (const sid of srcIds) {
            const part = this.placedParts.find(p => p.instanceId === sid);
            if (!part) continue;
            const dup = this.addPart(part.partDefId, part.x + 30, part.y + 15, part.rotation || 0, part.flipped || false);
            dup.color = part.color;
            dup.texture = part.texture;
            dup.fuelPercent = part.fuelPercent;
            dup.thrustLimit = part.thrustLimit;
            dup.gimbalEnabled = part.gimbalEnabled;
            dup.deployed = part.deployed;
            if (part.customWidth) dup.customWidth = part.customWidth;
            if (part.customHeight) dup.customHeight = part.customHeight;
            this.syncMirrorForPart(dup);
            newIds.add(dup.instanceId);
        }
        this.selectedPartIds = newIds;
        this.selectedPartId = newIds.size > 0 ? [...newIds][0] : null;
        this.saveHistory();
        this.updateToolbarPosition();
        this.updateInspectorUI();
        this.playClickSound();
    }

    clearBlueprint() {
        this.placedParts = [];
        this.selectedPartId = null;
        this.selectedPartIds.clear();
        this.resizeMode = false;
        this.saveHistory();
        this.updateStats();
        this.updateToolbarPosition();
        this.updateInspectorUI();
    }

    saveHistory() {
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        this.history.push(JSON.stringify(this.placedParts));
        this.historyIndex++;
        if (this.history.length > 35) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.placedParts = JSON.parse(this.history[this.historyIndex]);
            this.selectedPartId = null;
            this.updateStats();
            this.updateToolbarPosition();
            this.updateInspectorUI();
            this.playClickSound();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.placedParts = JSON.parse(this.history[this.historyIndex]);
            this.selectedPartId = null;
            this.updateStats();
            this.updateToolbarPosition();
            this.updateInspectorUI();
            this.playClickSound();
        }
    }

    loadPreset(presetId) {
        const preset = ROCKET_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        this.placedParts = [];
        this.instanceCounter = 1;

        for (const item of preset.parts) {
            const def = ROCKET_PARTS_CATALOG[item.partDefId];
            this.placedParts.push({
                instanceId: 'part_' + (this.instanceCounter++),
                partDefId: item.partDefId,
                x: item.x,
                y: item.y,
                rotation: item.rotation || 0,
                flipped: item.flipped || false,
                color: item.color || def?.defaultColor || '#f1f5f9',
                texture: item.texture || def?.defaultTexture || 'smooth',
                fuelPercent: (typeof item.fuelPercent === 'number') ? item.fuelPercent : 100,
                thrustLimit: (typeof item.thrustLimit === 'number') ? item.thrustLimit : 100,
                gimbalEnabled: item.gimbalEnabled !== false,
                deployed: item.deployed !== false,
                deployAnim: (item.deployed === false) ? 0.0 : 1.0,
                mirrorId: null
            });
        }

        // Vincular espejos simétricos automáticamente en presets
        for (let i = 0; i < this.placedParts.length; i++) {
            const a = this.placedParts[i];
            if (a.mirrorId || Math.abs(a.x) < 5) continue;
            for (let j = i + 1; j < this.placedParts.length; j++) {
                const b = this.placedParts[j];
                if (!b.mirrorId && a.partDefId === b.partDefId && Math.abs(a.x + b.x) < 2 && Math.abs(a.y - b.y) < 2) {
                    a.mirrorId = b.instanceId;
                    b.mirrorId = a.instanceId;
                    break;
                }
            }
        }

        const nameInput = document.getElementById('builderRocketName');
        if (nameInput) {
            nameInput.value = preset.name;
            this.rocketName = preset.name;
        }

        this.history = [];
        this.historyIndex = -1;
        this.saveHistory();
        this.selectedPartId = null;
        this.centerView();
        this.updateStats();
        this.updateToolbarPosition();
        this.updateInspectorUI();
    }

    // --- CÁLCULO FÍSICO PRECISO (CoM, CoT, TWR REAL, TAMAÑO Y PUNTOS DE CONTACTO) ---
    calculateRocketSpecs() {
        let dryMass = 0;
        let fuelCapacity = 0;
        let currentFuel = 0;
        let netThrustUp = 0;
        let totalThrustMag = 0;
        let totalWarpThrust = 0;
        let fuelConsumption = 0;
        let passengers = 0;
        let totalHull = 80;
        let electricalGen = 0;
        let hasCommand = false;
        let enginesCount = 0;
        let landingPadsCount = 0;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let weightedMassX = 0, weightedMassY = 0;
        let weightedThrustX = 0, weightedThrustY = 0;

        for (const p of this.placedParts) {
            const def = ROCKET_PARTS_CATALOG[p.partDefId];
            if (!def) continue;

            const st = getPartScaledStats(p, def);
            const fuelFrac = (typeof p.fuelPercent === 'number' ? p.fuelPercent : 100) / 100;
            const partFuelCap = st.fuelCapacity || 0;
            const partFuel = partFuelCap * fuelFrac;
            const partMass = st.dryMass + partFuel * 0.01;

            dryMass += st.dryMass;
            fuelCapacity += partFuelCap;
            currentFuel += partFuel;
            passengers += def.passengers || 0;
            totalHull += (st.hull || 50) * 0.25;
            electricalGen += st.electricalGen || 0;

            weightedMassX += p.x * partMass;
            weightedMassY += p.y * partMass;

            if (def.category === 'capsules') hasCommand = true;

            if (st.thrust && st.thrust > 0) {
                const limit = (typeof p.thrustLimit === 'number' ? p.thrustLimit : 100) / 100;
                const effThrust = st.thrust * limit;
                const rotRad = ((p.rotation || 0) * Math.PI) / 180;
                // Empuje apunta hacia arriba (-Y) cuando rotation = 0
                const dirUp = Math.cos(rotRad);
                netThrustUp += effThrust * dirUp;
                totalThrustMag += effThrust;
                totalWarpThrust += (st.warpThrust || st.thrust * 2.0) * limit;
                fuelConsumption += (st.consumption || 1.0) * limit;
                enginesCount++;
                weightedThrustX += p.x * effThrust;
                weightedThrustY += p.y * effThrust;
            }

            if (def.isLandingPad) landingPadsCount++;

            const b = this.getPartBoundsLocal(def, p.rotation || 0, p);
            minX = Math.min(minX, p.x - b.halfW);
            maxX = Math.max(maxX, p.x + b.halfW);
            minY = Math.min(minY, p.y - b.halfH);
            maxY = Math.max(maxY, p.y + b.halfH);
        }

        if (!isFinite(minX)) { minX = -15; maxX = 15; minY = -20; maxY = 20; }

        const totalFuelMass = currentFuel * 0.01;
        const totalMass = Math.max(0.4, dryMass + totalFuelMass);
        const comX = weightedMassX / totalMass;
        const comY = weightedMassY / totalMass;
        const cotX = totalThrustMag > 0 ? weightedThrustX / totalThrustMag : comX;
        const cotY = totalThrustMag > 0 ? weightedThrustY / totalThrustMag : maxY;

        // Ahora calcular posiciones de motores, RCS y puntos de contacto RELATIVOS AL CENTRO DE MASA (comX, comY)
        const engines = [];
        const rcsList = [];
        const padsList = [];

        for (const p of this.placedParts) {
            const def = ROCKET_PARTS_CATALOG[p.partDefId];
            if (!def) continue;

            if (def.thrust && def.thrust > 0) {
                const sz = getPartSize(p, def);
                const st = getPartScaledStats(p, def);
                const limit = (typeof p.thrustLimit === 'number' ? p.thrustLimit : 100) / 100;
                const rotRad = ((p.rotation || 0) * Math.PI) / 180;
                const localBellY = sz.height * 0.5;
                const worldBellX = p.x - localBellY * Math.sin(rotRad);
                const worldBellY = p.y + localBellY * Math.cos(rotRad);

                engines.push({
                    flightX: -(worldBellY - comY) * FLIGHT_SCALE,
                    flightY: (worldBellX - comX) * FLIGHT_SCALE,
                    angleOffset: rotRad,
                    scale: (def.nozzleOffset ? def.nozzleOffset.scale : 1.0) * 0.95 * Math.max(0.4, sz.wScale),
                    flameColor: def.flameColor || 'standard',
                    engineMode: def.engineMode || 'sea',
                    thrust: st.thrust * limit,
                    warpThrust: (st.warpThrust || st.thrust * 2.0) * limit,
                    consumption: (st.consumption || 1.0) * limit,
                    gimbalEnabled: p.gimbalEnabled !== false,
                    offsetFromCoM: (worldBellX - comX)
                });
            }

            if (def.category === 'rcs') {
                rcsList.push({
                    flightX: -(p.y - comY) * FLIGHT_SCALE,
                    flightY: (p.x - comX) * FLIGHT_SCALE,
                    side: p.x >= comX ? 'right' : 'left'
                });
            }

            if (def.isLandingPad) {
                const sz = getPartSize(p, def);
                const rotRad = ((p.rotation || 0) * Math.PI) / 180;
                const legSpanX = p.flipped ? (sz.width * 0.45) : -(sz.width * 0.45);
                const legSpanY = sz.height * 0.48;
                const worldFootX = p.x + legSpanX * Math.cos(rotRad) - legSpanY * Math.sin(rotRad);
                const worldFootY = p.y + legSpanX * Math.sin(rotRad) + legSpanY * Math.cos(rotRad);
                padsList.push({
                    id: 'pad_' + p.instanceId,
                    x: -(worldFootY - comY) * FLIGHT_SCALE,
                    y: (worldFootX - comX) * FLIGHT_SCALE,
                    isPad: true
                });
            }
        }

        // TWR real en 1.0G (mismo valor que en la física del mundo)
        const twr = totalMass > 0 ? Math.max(0, netThrustUp) / (totalMass * 9.81) : 0;
        const burnTime = fuelConsumption > 0 ? (currentFuel / fuelConsumption) : 0;

        // Puntos de contacto precisos relativos al CoM
        const contactPoints = [];
        const bottomFlightX = -(maxY - comY) * FLIGHT_SCALE;
        const topFlightX = -(minY - comY) * FLIGHT_SCALE;
        const leftSpanY = (minX - comX) * FLIGHT_SCALE;
        const rightSpanY = (maxX - comX) * FLIGHT_SCALE;

        if (padsList.length >= 2) {
            contactPoints.push(...padsList);
            contactPoints.push({ id: 'base_center', x: bottomFlightX, y: 0, isPad: true });
        } else {
            const halfW = Math.max(12, Math.max(Math.abs(leftSpanY), Math.abs(rightSpanY)) * 0.85);
            contactPoints.push({ id: 'base_left', x: bottomFlightX, y: -halfW, isPad: true });
            contactPoints.push({ id: 'base_right', x: bottomFlightX, y: halfW, isPad: true });
            contactPoints.push({ id: 'base_mid', x: bottomFlightX, y: 0, isPad: true });
        }
        contactPoints.push({ id: 'nose', x: topFlightX, y: 0, isPad: false });
        contactPoints.push({ id: 'side_l', x: (topFlightX + bottomFlightX) * 0.5, y: Math.min(-10, leftSpanY), isPad: false });
        contactPoints.push({ id: 'side_r', x: (topFlightX + bottomFlightX) * 0.5, y: Math.max(10, rightSpanY), isPad: false });

        const bounds = { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
        const aero = (typeof analyzeRocketAerodynamics === 'function')
            ? analyzeRocketAerodynamics(this.placedParts, { x: comX, y: comY }, bounds)
            : null;

        return {
            partsCount: this.placedParts.length,
            dryMass,
            totalMass,
            fuelCapacity: Math.max(0, currentFuel),
            maxFuelCapacity: fuelCapacity,
            fuelConsumption: Math.max(0.15, fuelConsumption),
            totalThrust: Math.max(0, netThrustUp),
            totalWarpThrust,
            twr,
            burnTime,
            passengers,
            totalHull: Math.round(totalHull),
            electricalGen,
            hasCommand,
            enginesCount,
            landingPadsCount,
            com: { x: comX, y: comY },
            cot: { x: cotX, y: cotY },
            engines,
            rcsList,
            contactPoints,
            bounds,
            aero
        };
    }

    updateStats() {
        const specs = this.calculateRocketSpecs();
        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setTxt('bldStatMass', `${specs.totalMass.toFixed(1)}t`);
        setTxt('bldStatThrust', `${Math.round(specs.totalThrust)} kN`);
        setTxt('bldStatFuel', `${Math.round(specs.fuelCapacity)} L`);
        setTxt('bldStatBurn', `${Math.round(specs.burnTime)}s`);
        setTxt('bldStatPassengers', `${specs.passengers}P`);
        setTxt('bldStatParts', specs.partsCount);

        const elTWR = document.getElementById('bldStatTWR');
        if (elTWR) {
            elTWR.textContent = `TWR ${specs.twr.toFixed(2)}`;
            if (specs.twr >= 1.25) {
                elTWR.className = 'font-mono-num text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30';
            } else if (specs.twr >= 1.0) {
                elTWR.className = 'font-mono-num text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30';
            } else {
                elTWR.className = 'font-mono-num text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30';
            }
        }

        const elAero = document.getElementById('bldStatAero');
        if (elAero && specs.aero) {
            const a = specs.aero;
            const stabLabel = a.stabilityMargin > 0.05 ? 'Estable' : (a.stabilityMargin < -0.05 ? 'Inestable' : 'Neutral');
            elAero.textContent = `AERO ${a.aeroScore}%`;
            if (a.aeroScore >= 78) {
                elAero.className = 'font-mono-num text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 cursor-help';
            } else if (a.aeroScore >= 52) {
                elAero.className = 'font-mono-num text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 cursor-help';
            } else {
                elAero.className = 'font-mono-num text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 cursor-help';
            }
            const tipsTxt = (a.tips && a.tips.length > 0) ? `\n• ${a.tips.join('\n• ')}` : '';
            elAero.title = `Aerodinámica Global: ${a.aeroScore}/100\nArrastre Frontal (Cd): ${a.cdForward.toFixed(2)}\nFrenado Reentrada (Cd): ${a.cdRetro.toFixed(2)}\nEstabilidad: ${stabLabel}${tipsTxt}`;
        }

        // Detectar piezas desconectadas / flotando
        this.floatingIds = new Set();
        if (this.placedParts.length > 1 && typeof findConnectedComponents === 'function') {
            const comps = findConnectedComponents(this.placedParts);
            if (comps.length > 1) {
                let mainIdx = comps.findIndex(c => c.some(p => ROCKET_PARTS_CATALOG[p.partDefId]?.category === 'capsules'));
                if (mainIdx < 0) {
                    mainIdx = 0;
                    comps.forEach((c, idx) => { if (c.length > comps[mainIdx].length) mainIdx = idx; });
                }
                comps.forEach((c, idx) => {
                    if (idx !== mainIdx) c.forEach(p => this.floatingIds.add(p.instanceId));
                });
            }
        }
        const warnEl = document.getElementById('bldFloatingWarn');
        const warnCnt = document.getElementById('bldFloatingCount');
        if (warnEl && warnCnt) {
            if (this.floatingIds.size > 0) {
                warnCnt.textContent = this.floatingIds.size;
                warnEl.classList.remove('hidden');
                warnEl.classList.add('flex');
            } else {
                warnEl.classList.add('hidden');
                warnEl.classList.remove('flex');
            }
        }
    }

    updateToolbarPosition() {
        const toolbar = document.getElementById('builderPartToolbar');
        if (!toolbar) return;
        const part = this.placedParts.find(p => p.instanceId === this.selectedPartId);
        const def = part ? ROCKET_PARTS_CATALOG[part.partDefId] : null;
        if (!part || !def) {
            toolbar.classList.add('hidden');
            return;
        }
        const b = this.getPartBoundsLocal(def, part.rotation || 0, part);
        const screenPos = this.worldToScreen(part.x, part.y - b.halfH - 16);
        toolbar.style.left = `${screenPos.x}px`;
        toolbar.style.top = `${screenPos.y}px`;
        toolbar.classList.remove('hidden');

        const resizeBtn = document.getElementById('btnBldResizePart');
        if (resizeBtn) {
            if (this.resizeMode) {
                resizeBtn.classList.add('bg-emerald-500/35', 'border', 'border-emerald-400', 'text-emerald-200');
                resizeBtn.classList.remove('bg-white/10');
            } else {
                resizeBtn.classList.remove('bg-emerald-500/35', 'border', 'border-emerald-400', 'text-emerald-200');
                resizeBtn.classList.add('bg-white/10');
            }
        }
    }

    setupCategoriesUI() {
        const catButtons = document.querySelectorAll('.bld-category-tab');
        catButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                catButtons.forEach(b => b.classList.remove('active', 'bg-white/10', 'text-amber-300', 'border-amber-400/40'));
                btn.classList.add('active', 'bg-white/10', 'text-amber-300', 'border-amber-400/40');
                this.activeCategory = btn.getAttribute('data-cat');
                this.renderCatalogParts();
                this.playClickSound();
            });
        });
    }

    renderCatalogParts() {
        const list = document.getElementById('builderPartsList');
        if (!list) return;
        list.innerHTML = '';

        const parts = Object.values(ROCKET_PARTS_CATALOG).filter(p => p.category === this.activeCategory);

        for (const p of parts) {
            const card = document.createElement('div');
            card.className = 'p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/50 hover:bg-white/[0.06] transition-all flex items-center gap-3 cursor-grab active:cursor-grabbing select-none group';

            const cvs = document.createElement('canvas');
            cvs.width = 56;
            cvs.height = 56;
            cvs.className = 'w-14 h-14 shrink-0 rounded-xl bg-black/40 border border-white/10 p-1 block';
            const miniCtx = cvs.getContext('2d');
            miniCtx.translate(28, 28);
            const maxDim = Math.max(p.width, p.height);
            const scale = Math.min(1.0, 42 / maxDim);
            miniCtx.scale(scale, scale);
            p.draw(miniCtx, p.width, p.height, null);
            card.appendChild(cvs);

            const info = document.createElement('div');
            info.className = 'flex-1 min-w-0';
            let statsBadge = `${p.dryMass}t`;
            if (p.fuelCapacity) statsBadge += ` · ${p.fuelCapacity}L`;
            if (p.thrust) statsBadge += ` · ${p.thrust}kN`;
            if (p.passengers) statsBadge += ` · ${p.passengers}P`;
            if (p.electricalGen) statsBadge += ` · +${p.electricalGen}W`;

            info.innerHTML = `
                <h4 class="font-display text-xs font-bold text-white group-hover:text-cyan-200 transition-colors truncate">${p.name}</h4>
                <p class="text-[10px] text-stone-400 truncate leading-snug">${p.tagline}</p>
                <div class="mt-1"><span class="text-[9px] font-mono-num px-1.5 py-0.5 rounded bg-white/[0.06] text-amber-300/90 border border-white/10">${statsBadge}</span></div>
            `;
            card.appendChild(info);

            card.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                const rect = this.canvas.getBoundingClientRect();
                const worldPos = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
                this.draggedPart = {
                    partDefId: p.id,
                    fromPalette: true,
                    clickMode: true,
                    offsetX: 0,
                    offsetY: 0,
                    currentX: worldPos.x,
                    currentY: worldPos.y,
                    currentFlipped: false
                };
                this.playClickSound();
            });

            list.appendChild(card);
        }
    }

    startRenderLoop() {
        if (this.animId) cancelAnimationFrame(this.animId);
        const loop = () => {
            const modal = document.getElementById('rocketBuilderModal');
            if (modal && !modal.classList.contains('hidden')) {
                this.draw();
                this.animId = requestAnimationFrame(loop);
            }
        };
        this.animId = requestAnimationFrame(loop);
    }

    stopRenderLoop() {
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    }

    draw() {
        if (!this.canvas || !this.ctx) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);
        this.drawBlueprintGrid(ctx, w, h);

        ctx.save();
        ctx.translate(this.camera.panX, this.camera.panY);
        ctx.scale(this.camera.zoom, this.camera.zoom);

        this.drawLaunchpadGround(ctx);

        // Eje central de simetría
        ctx.strokeStyle = this.symmetryMode === 2 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1 / this.camera.zoom;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, -1200);
        ctx.lineTo(0, 400);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dibujar piezas (las cofias se dibujan al final con transparencia para ver el interior)
        const drawOrderParts = [...this.placedParts].sort((a, b) => {
            const fA = ROCKET_PARTS_CATALOG[a.partDefId]?.isFairing ? 1 : 0;
            const fB = ROCKET_PARTS_CATALOG[b.partDefId]?.isFairing ? 1 : 0;
            return fA - fB;
        });

        for (const p of drawOrderParts) {
            const def = ROCKET_PARTS_CATALOG[p.partDefId];
            if (!def) continue;

            const sz = getPartSize(p, def);
            const isSelected = (p.instanceId === this.selectedPartId) || (this.selectedPartIds && this.selectedPartIds.has(p.instanceId));
            const isHovered = (p.instanceId === this.hoveredPartId);
            const isFloating = this.floatingIds && this.floatingIds.has(p.instanceId);

            ctx.save();
            ctx.translate(p.x, p.y);
            if (p.rotation) ctx.rotate((p.rotation * Math.PI) / 180);
            if (p.flipped) ctx.scale(-1, 1);
            const drawState = def.isFairing ? { ...p, inBuilder: true } : p;
            def.draw(ctx, sz.width, sz.height, drawState);

            if (isFloating) {
                ctx.save();
                ctx.setLineDash([4, 3]);
                ctx.strokeStyle = '#fb7185';
                ctx.lineWidth = 1.8 / this.camera.zoom;
                ctx.strokeRect(-sz.width / 2 - 2.5, -sz.height / 2 - 2.5, sz.width + 5, sz.height + 5);
                ctx.restore();
            }

            if (isSelected) {
                ctx.strokeStyle = this.resizeMode ? '#34d399' : '#38bdf8';
                ctx.lineWidth = 1.6 / this.camera.zoom;
                ctx.strokeRect(-sz.width / 2 - 2, -sz.height / 2 - 2, sz.width + 4, sz.height + 4);
            } else if (isHovered) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1 / this.camera.zoom;
                ctx.strokeRect(-sz.width / 2 - 1.5, -sz.height / 2 - 1.5, sz.width + 3, sz.height + 3);
            }
            ctx.restore();
        }

        // Transiciones automáticas entre piezas de distinto diámetro y carenados interetapa estilo SFS
        drawWidthTransitions(ctx, this.placedParts);
        drawInterstageFairings(ctx, this.placedParts);

        // Manijas interactivas de redimensionamiento y etiqueta W × H en vivo
        if (this.resizeMode && this.selectedPartId) {
            const selPart = this.placedParts.find(p => p.instanceId === this.selectedPartId);
            const selDef = selPart ? ROCKET_PARTS_CATALOG[selPart.partDefId] : null;
            if (selPart && selDef) {
                const handles = this.getResizeHandles(selPart);
                const rHandle = 5 / this.camera.zoom;
                for (const hnd of handles) {
                    ctx.save();
                    ctx.fillStyle = hnd.side === 'corner' ? '#fbbf24' : '#34d399';
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 1.5 / this.camera.zoom;
                    ctx.beginPath();
                    if (hnd.side === 'corner') {
                        ctx.rect(hnd.x - rHandle, hnd.y - rHandle, rHandle * 2, rHandle * 2);
                    } else {
                        ctx.arc(hnd.x, hnd.y, rHandle, 0, Math.PI * 2);
                    }
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                }
                const sz = getPartSize(selPart, selDef);
                const b = this.getPartBoundsLocal(selDef, selPart.rotation || 0, selPart);
                ctx.save();
                ctx.fillStyle = 'rgba(9, 14, 29, 0.88)';
                ctx.strokeStyle = '#34d399';
                ctx.lineWidth = 1 / this.camera.zoom;
                const badgeW = 68 / this.camera.zoom;
                const badgeH = 16 / this.camera.zoom;
                const bx = selPart.x - badgeW * 0.5;
                const by = selPart.y + b.halfH + 6 / this.camera.zoom;
                ctx.beginPath();
                ctx.roundRect(bx, by, badgeW, badgeH, 4 / this.camera.zoom);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#a7f3d0';
                ctx.font = `bold ${Math.round(9.5 / this.camera.zoom)}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${Math.round(sz.width)}×${Math.round(sz.height)}`, selPart.x, by + badgeH * 0.5);
                ctx.restore();
            }
        }

        // Previsualización de arrastre desde paleta (con espejo si está activo)
        if (this.draggedPart && this.draggedPart.fromPalette && this.draggedPart.currentX !== undefined) {
            const def = ROCKET_PARTS_CATALOG[this.draggedPart.partDefId];
            if (def) {
                const drawGhost = (gx, gy, gflip) => {
                    ctx.save();
                    ctx.translate(gx, gy);
                    if (gflip) ctx.scale(-1, 1);
                    ctx.globalAlpha = 0.72;
                    def.draw(ctx, def.width, def.height, def.isFairing ? { inBuilder: true } : null);
                    ctx.restore();
                };
                drawGhost(this.draggedPart.currentX, this.draggedPart.currentY, this.draggedPart.currentFlipped);
                if (this.symmetryMode === 2 && Math.abs(this.draggedPart.currentX) > 8) {
                    drawGhost(-this.draggedPart.currentX, this.draggedPart.currentY, !this.draggedPart.currentFlipped);
                }
            }
        }

        if (this.snapIndicator) {
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2 / this.camera.zoom;
            ctx.beginPath();
            ctx.arc(this.snapIndicator.x, this.snapIndicator.y, 5 / this.camera.zoom, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Rectángulo de selección múltiple (arrastre en el vacío)
        if (this.selectionBox) {
            const bx = Math.min(this.selectionBox.startX, this.selectionBox.currentX);
            const by = Math.min(this.selectionBox.startY, this.selectionBox.currentY);
            const bw = Math.abs(this.selectionBox.currentX - this.selectionBox.startX);
            const bh = Math.abs(this.selectionBox.currentY - this.selectionBox.startY);
            if (bw > 2 || bh > 2) {
                ctx.save();
                ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.4 / this.camera.zoom;
                ctx.setLineDash([5 / this.camera.zoom, 3 / this.camera.zoom]);
                ctx.fillRect(bx, by, bw, bh);
                ctx.strokeRect(bx, by, bw, bh);
                ctx.restore();
            }
        }

        this.drawCenterOfMassAndThrust(ctx);
        ctx.restore();
    }

    drawBlueprintGrid(ctx, w, h) {
        ctx.fillStyle = '#070d1a';
        ctx.fillRect(0, 0, w, h);

        const zoom = this.camera.zoom;
        const panX = this.camera.panX;
        const panY = this.camera.panY;

        const subGridSize = 20 * zoom;
        const mainGridSize = 100 * zoom;

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.045)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = panX % subGridSize; x < w; x += subGridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = panY % subGridSize; y < h; y += subGridSize) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let x = panX % mainGridSize; x < w; x += mainGridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = panY % mainGridSize; y < h; y += mainGridSize) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();
    }

    drawLaunchpadGround(ctx) {
        const groundY = 145;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-240, groundY, 480, 22);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-200, groundY);
        ctx.lineTo(200, groundY);
        ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.font = '600 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PLATAFORMA DE ENSAMBLAJE VAB · [NIVEL CERO]', 0, groundY + 15);
    }

    drawCenterOfMassAndThrust(ctx) {
        if (this.placedParts.length === 0) return;
        const specs = this.calculateRocketSpecs();
        const r = 6.5 / this.camera.zoom;

        // CoM
        ctx.save();
        ctx.translate(specs.com.x, specs.com.y);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.arc(0, 0, r, 0, Math.PI / 2); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.arc(0, 0, r, Math.PI, Math.PI * 1.5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1 / this.camera.zoom;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // CoT
        if (specs.totalThrust > 0) {
            ctx.save();
            ctx.translate(specs.cot.x, specs.cot.y);
            ctx.strokeStyle = '#38bdf8';
            ctx.fillStyle = '#38bdf8';
            ctx.lineWidth = 2 / this.camera.zoom;
            ctx.beginPath();
            ctx.moveTo(0, 14 / this.camera.zoom);
            ctx.lineTo(0, -16 / this.camera.zoom);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-4.5 / this.camera.zoom, -9 / this.camera.zoom);
            ctx.lineTo(0, -20 / this.camera.zoom);
            ctx.lineTo(4.5 / this.camera.zoom, -9 / this.camera.zoom);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    playClickSound() {
        try {
            if (typeof audio !== 'undefined' && audio.init) {
                audio.init();
                if (audio.ctx) {
                    const osc = audio.ctx.createOscillator();
                    const gain = audio.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, audio.ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(880, audio.ctx.currentTime + 0.04);
                    gain.gain.setValueAtTime(0.08, audio.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + 0.04);
                    osc.connect(gain); gain.connect(audio.ctx.destination);
                    osc.start(); osc.stop(audio.ctx.currentTime + 0.04);
                }
            }
        } catch (e) {}
    }

    playSnapSound() {
        try {
            if (typeof audio !== 'undefined' && audio.init) {
                audio.init();
                if (audio.ctx) {
                    const osc = audio.ctx.createOscillator();
                    const gain = audio.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(220, audio.ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(660, audio.ctx.currentTime + 0.07);
                    gain.gain.setValueAtTime(0.12, audio.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + 0.07);
                    osc.connect(gain); gain.connect(audio.ctx.destination);
                    osc.start(); osc.stop(audio.ctx.currentTime + 0.07);
                }
            }
        } catch (e) {}
    }

    playTrashSound() {
        try {
            if (typeof audio !== 'undefined' && audio.init) {
                audio.init();
                if (audio.ctx) {
                    const osc = audio.ctx.createOscillator();
                    const gain = audio.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(220, audio.ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(110, audio.ctx.currentTime + 0.1);
                    gain.gain.setValueAtTime(0.09, audio.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + 0.1);
                    osc.connect(gain); gain.connect(audio.ctx.destination);
                    osc.start(); osc.stop(audio.ctx.currentTime + 0.1);
                }
            }
        } catch (e) {}
    }

    // --- LANZAMIENTO DEL COHETE HACIA LA SIMULACIÓN ---
    launchRocket() {
        const specs = this.calculateRocketSpecs();
        if (this.placedParts.length === 0) {
            alert('¡El taller está vacío! Añade piezas para armar tu cohete antes del despegue.');
            return;
        }
        if (!specs.hasCommand) {
            alert('¡Falta módulo de mando! Añade una Cápsula o Sonda Autónoma para controlar el cohete.');
            return;
        }
        if (specs.totalThrust <= 0) {
            alert('¡Falta propulsión! Añade al menos un motor para despegar.');
            return;
        }

        const nameInput = document.getElementById('builderRocketName');
        const customName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : 'Cohete Personalizado';

        const rocketH = Math.max(30, (specs.bounds.height || 80) * FLIGHT_SCALE);
        const rocketR = Math.max(10, (specs.bounds.width || 30) * FLIGHT_SCALE * 0.5);
        const baseGeomInertia = (1 / 12) * specs.totalMass * (3 * rocketR * rocketR + rocketH * rocketH);
        const calcInertia = Math.max(250, Math.min(35000, baseGeomInertia * 2.0 + specs.totalMass * 120));

        // Clonar piezas con sus estados de animación (paneles solares y patas)
        const allParts = JSON.parse(JSON.stringify(this.placedParts)).map(p => ({
            ...p,
            deployAnim: (p.deployed === false) ? 0.0 : 1.0
        }));

        // Separar componentes desconectados: solo lo unido al módulo de mando forma el cohete principal;
        // cualquier pieza suelta/flotante cae por gravedad como objeto independiente.
        const components = findConnectedComponents(allParts);
        let mainIdx = components.findIndex(comp => comp.some(p => ROCKET_PARTS_CATALOG[p.partDefId]?.category === 'capsules'));
        if (mainIdx < 0) mainIdx = 0;

        const mainParts = components[mainIdx] || allParts;
        const looseComponents = components.filter((_, idx) => idx !== mainIdx);

        if (looseComponents.length > 0) {
            const firstLoose = looseComponents[0][0];
            if (firstLoose) {
                this.selectedPartId = firstLoose.instanceId;
                this.updateToolbarPosition();
                this.updateInspectorUI();
            }
            alert('⚠ Hay piezas flotando sin conectar al cohete (marcadas en rojo). Todo elemento, incluso dentro de una cofia, debe estar conectado a un nodo o estructura del cohete.');
            return;
        }

        // Activar por defecto solo los motores de la primera etapa (debajo de separadores verticales)
        computeStageEngineStates(mainParts);

        const customModel = compileCustomRocketModel(mainParts, customName);
        if (!customModel) return;

        // Limpiar vehículos independientes previos
        if (typeof freeVessels !== 'undefined') freeVessels.length = 0;

        if (typeof ROCKET_MODELS !== 'undefined') {
            ROCKET_MODELS['custom'] = customModel;
        }

        if (typeof ship !== 'undefined') {
            ship.customRocket = customModel;
            if (typeof applyRocketModel === 'function') applyRocketModel(ship, 'custom');
            ship.fuel = ship.maxFuel;
            ship.hull = ship.maxHull;
        }

        if (typeof astronaut !== 'undefined') {
            astronaut.selectedRocketModel = 'custom';
            astronaut.active = false;
        }

        const origin = (typeof getPlanet === 'function') ? getPlanet(0, 0) : null;
        if (origin) {
            const startAngle = -Math.PI / 2;
            const sr = (typeof getSurfaceRadius === 'function') ? getSurfaceRadius(origin, startAngle) : origin.radius;

            let safeAltitude = sr + 20;
            if (customModel.contactPoints && customModel.contactPoints.length > 0) {
                safeAltitude = sr + 2;
                for (const pt of customModel.contactPoints) {
                    const ptAngle = startAngle + ((pt.y || 0) / Math.max(1, sr));
                    const ptSr = (typeof getSurfaceRadius === 'function') ? getSurfaceRadius(origin, ptAngle) : sr;
                    const neededCenterR = ptSr - pt.x + 1.5;
                    if (neededCenterR > safeAltitude) safeAltitude = neededCenterR;
                }
            }

            ship.x = origin.x + Math.cos(startAngle) * safeAltitude;
            ship.y = origin.y + Math.sin(startAngle) * safeAltitude;
            ship.vx = 0;
            ship.vy = 0;
            ship.angle = startAngle;
            ship.av = 0;
            ship.isGrounded = true;
            ship.thrustIntensity = 0;
            ship.hull = ship.maxHull;
            ship.fuel = ship.maxFuel;
            ship.hullTemp = 0;
            ship.scorch = { amount: 0, dirX: 1, dirY: 0, temp: 0 };
            ship.reentryIntensity = 0;
            ship.vaporConeIntensity = 0;
            ship.sasAssistWeight = 1.0;
            if (ship.leftGearSpring) { ship.leftGearSpring.pos = 0.35; ship.leftGearSpring.vel = 0; }
            if (ship.rightGearSpring) { ship.rightGearSpring.pos = 0.35; ship.rightGearSpring.vel = 0; }
            if (typeof smokePuffs !== 'undefined') smokePuffs.length = 0;
            if (typeof reentryParticles !== 'undefined') reentryParticles.length = 0;
            if (typeof particles !== 'undefined') particles.length = 0;
            if (typeof sparks !== 'undefined') sparks.length = 0;

            // Crear vehículos independientes para cualquier pieza que haya quedado suelta sin conectar
            for (const loose of looseComponents) {
                spawnFreeVesselFromParts(loose, ship.x, ship.y, 0, 0, ship.angle, customModel.com, 'Pieza Suelta');
            }

            if (typeof camera !== 'undefined') {
                camera.x = ship.x;
                camera.y = ship.y;
                camera.rotation = 0;
                camera.zoom = 1.15;
            }
        } else if (typeof resetOrigin === 'function') {
            resetOrigin();
        }

        updateStageHudButton();
        closeRocketBuilder();

        const intro = document.getElementById('introOverlay');
        if (intro) {
            intro.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => intro.classList.add('hidden'), 500);
        }

        if (typeof audio !== 'undefined' && audio.init && audio.playChime) {
            audio.init();
            audio.playChime();
        }

        if (typeof showHoloCard === 'function') {
            showHoloCard(getPlanet(0, 0), 'VECTOR EN PLATAFORMA', `${customName.toUpperCase()} listo · TWR ${specs.twr.toFixed(2)} · Masa ${specs.totalMass.toFixed(1)}t`);
        }
    }
}

const rocketBuilder = new RocketBuilderEngine();

// --- REGISTRO GLOBAL DE VEHÍCULOS Y ETAPAS INDEPENDIENTES EN EL MUNDO ---
const freeVessels = [];
let freeVesselCounter = 1;
let activeFreeVesselMenuId = null;

function arePartsConnected(partA, partB) {
    const defA = ROCKET_PARTS_CATALOG[partA.partDefId];
    const defB = ROCKET_PARTS_CATALOG[partB.partDefId];
    if (!defA || !defB) return false;

    // 1. Proximidad de nodos de encaje
    const nodesA = rocketBuilder.getTransformedNodes(defA, partA.x, partA.y, partA.rotation || 0, partA.flipped || false, partA);
    const nodesB = rocketBuilder.getTransformedNodes(defB, partB.x, partB.y, partB.rotation || 0, partB.flipped || false, partB);
    for (const nA of nodesA) {
        for (const nB of nodesB) {
            if (Math.hypot(nA.worldX - nB.worldX, nA.worldY - nB.worldY) <= 8) {
                return true;
            }
        }
    }

    // 2. Contacto/solapamiento de bordes (para piezas radiales acopladas al casco)
    const bA = rocketBuilder.getPartBoundsLocal(defA, partA.rotation || 0, partA);
    const bB = rocketBuilder.getPartBoundsLocal(defB, partB.rotation || 0, partB);
    const dx = Math.abs(partA.x - partB.x);
    const dy = Math.abs(partA.y - partB.y);
    return dx <= (bA.halfW + bB.halfW + 4) && dy <= (bA.halfH + bB.halfH + 4);
}

function findConnectedComponents(parts, ignoredIds = [], severedPairs = []) {
    const valid = parts.filter(p => !ignoredIds.includes(p.instanceId));
    const visited = new Set();
    const components = [];
    const isSevered = (idA, idB) => severedPairs.some(([a, b]) => (a === idA && b === idB) || (a === idB && b === idA));

    for (const start of valid) {
        if (visited.has(start.instanceId)) continue;
        const comp = [];
        const queue = [start];
        visited.add(start.instanceId);

        while (queue.length > 0) {
            const cur = queue.shift();
            comp.push(cur);
            for (const cand of valid) {
                if (!visited.has(cand.instanceId) && !isSevered(cur.instanceId, cand.instanceId) && arePartsConnected(cur, cand)) {
                    visited.add(cand.instanceId);
                    queue.push(cand);
                }
            }
        }
        components.push(comp);
    }
    return components;
}

function isVerticalDecouplerId(id) {
    return id === 'decoupler_vertical' || id === 'decoupler_mini' || id === 'decoupler_heavy' || id === 'decoupler_colossus';
}

// Determina qué motores deben empezar activos (solo primera etapa; los superiores esperan separación)
function computeStageEngineStates(parts) {
    const vertDecouplers = parts.filter(p => isVerticalDecouplerId(p.partDefId)).map(p => p.instanceId);
    if (vertDecouplers.length === 0) {
        parts.forEach(p => {
            if (ROCKET_PARTS_CATALOG[p.partDefId]?.thrust > 0 && typeof p.engineActive !== 'boolean') {
                p.engineActive = true;
            }
        });
        return;
    }

    // Sin los separadores verticales, el sub-componente que contiene la cápsula es la etapa superior
    const subComps = findConnectedComponents(parts, vertDecouplers);
    const upperComp = subComps.find(c => c.some(p => ROCKET_PARTS_CATALOG[p.partDefId]?.category === 'capsules'));
    const upperIds = new Set(upperComp ? upperComp.map(p => p.instanceId) : []);

    for (const p of parts) {
        if (ROCKET_PARTS_CATALOG[p.partDefId]?.thrust > 0) {
            // Si está en la etapa superior y hay un separador debajo, empieza apagado; si está debajo, empieza encendido
            p.engineActive = !upperIds.has(p.instanceId);
        }
    }
}

function buildCustomContactPoints(parts, comX, comY) {
    const rawPts = [];
    const addLocalPt = (p, lx, ly, isPad, idPrefix) => {
        const rotRad = ((p.rotation || 0) * Math.PI) / 180;
        const cosR = Math.cos(rotRad);
        const sinR = Math.sin(rotRad);
        const wx = p.x + lx * cosR - ly * sinR;
        const wy = p.y + lx * sinR + ly * cosR;
        rawPts.push({
            id: `${idPrefix}_${p.instanceId}`,
            partInstanceId: p.instanceId,
            x: -(wy - comY) * FLIGHT_SCALE,
            y: (wx - comX) * FLIGHT_SCALE,
            isPad: !!isPad
        });
    };

    for (const p of parts) {
        const def = ROCKET_PARTS_CATALOG[p.partDefId];
        if (!def) continue;
        if (def.isFairing && p.fairingOpened) continue;
        const sz = getPartSize(p, def);
        const hw = (sz.width || 20) * 0.5;
        const hh = (sz.height || 20) * 0.5;

        if (def.isLandingPad) {
            const anim = (typeof p.deployAnim === 'number') ? p.deployAnim : (p.deployed === false ? 0.0 : 1.0);
            const sideSign = p.flipped ? 1 : -1;
            if (anim > 0.25) {
                const footX = sideSign * sz.width * lerp(0.18, 0.47, anim);
                const footY = sz.height * lerp(0.22, 0.49, anim);
                addLocalPt(p, footX, footY, true, 'pad');
            } else {
                addLocalPt(p, sideSign * sz.width * 0.14, sz.height * 0.30, false, 'pad_retracted');
            }
            addLocalPt(p, -sideSign * hw * 0.35, -hh * 0.4, false, 'pad_mount');
            continue;
        }

        if (def.isSolarPanel) {
            const anim = (typeof p.deployAnim === 'number') ? p.deployAnim : (p.deployed === false ? 0.0 : 1.0);
            const mountSign = p.flipped ? -1 : 1; // +hw sin voltear, -hw volteado
            const mountX = mountSign * (hw - 2);
            addLocalPt(p, mountX, 0, false, 'solar_base');
            if (anim > 0.25) {
                const tipX = mountSign * ((hw - 5) - (sz.width - 5) * anim);
                const midX = (mountX + tipX) * 0.5;
                addLocalPt(p, tipX, -hh * 0.65, false, 'solar_tip_t');
                addLocalPt(p, tipX, hh * 0.65, false, 'solar_tip_b');
                addLocalPt(p, midX, 0, false, 'solar_mid');
            }
            continue;
        }

        if (def.category === 'capsules' && (def.id === 'capsule_mk1' || def.id === 'capsule_mk2' || def.id === 'nose_cone' || def.id === 'fairing_cone')) {
            addLocalPt(p, 0, -hh, false, 'nose');
            addLocalPt(p, -hw, hh, false, 'cap_bl');
            addLocalPt(p, hw, hh, false, 'cap_br');
        } else {
            const isBottomPart = (def.thrust && def.thrust > 0);
            addLocalPt(p, -hw, -hh, false, 'tl');
            addLocalPt(p, hw, -hh, false, 'tr');
            addLocalPt(p, -hw, hh, isBottomPart, 'bl');
            addLocalPt(p, hw, hh, isBottomPart, 'br');
        }
    }

    // Deduplicar puntos muy cercanos (< 3.5 px en vuelo) priorizando patas/bases
    rawPts.sort((a, b) => (b.isPad ? 1 : 0) - (a.isPad ? 1 : 0));
    const filtered = [];
    for (const pt of rawPts) {
        let tooClose = false;
        for (const ex of filtered) {
            if (Math.hypot(pt.x - ex.x, pt.y - ex.y) < 3.5) {
                tooClose = true;
                break;
            }
        }
        if (!tooClose) filtered.push(pt);
    }

    return filtered.length > 0 ? filtered : [
        { id: 'fallback_bl', x: -15, y: -8, isPad: true },
        { id: 'fallback_br', x: -15, y: 8, isPad: true },
        { id: 'fallback_nose', x: 15, y: 0, isPad: false }
    ];
}

function _classifyPartAero(p, def) {
    const rotDeg = p.rotation || 0;
    const rotRad = (rotDeg * Math.PI) / 180;
    const absCos = Math.abs(Math.cos(rotRad));
    const absSin = Math.abs(Math.sin(rotRad));
    const upright = Math.cos(rotRad) > 0.7;
    const inverted = Math.cos(rotRad) < -0.7;

    let anim = 1.0;
    if (def.deployable) {
        if (typeof p.deployAnim === 'number') anim = p.deployAnim;
        else if (p.deployed === false) anim = 0.0;
    }

    // Dimensiones efectivas según despliegue y tamaño personalizado
    const sz = getPartSize(p, def);
    let effW = sz.width || 24;
    let effH = sz.height || 24;
    let localOffsetX = 0;

    if (def.isSolarPanel) {
        const retractedW = 9;
        effW = retractedW + (effW - retractedW) * anim;
        // La carcasa está en el borde de anclaje (+w/2, o -w/2 si flipped)
        const mountSign = p.flipped ? -1 : 1;
        localOffsetX = mountSign * ((sz.width || 28) - effW) * 0.5;
    } else if (def.isLandingPad) {
        const retractedW = 8;
        effW = retractedW + (effW - retractedW) * anim;
        const mountSign = p.flipped ? -1 : 1;
        localOffsetX = mountSign * ((sz.width || 22) - effW) * 0.5;
    } else if (def.isFairing && p.fairingOpened) {
        effH = 6;
    }

    // Rotar offset local del centro efectivo
    const effCenterX = p.x + localOffsetX * Math.cos(rotRad);
    const effCenterY = p.y + localOffsetX * Math.sin(rotRad);
    const projW = Math.max(4, effW * absCos + effH * absSin);
    const projH = Math.max(4, effW * absSin + effH * absCos);

    // Clasificación automática compatible con cualquier pieza actual o futura
    let role = def.aeroProfile || 'body';
    if (!def.aeroProfile) {
        if (def.isFairing && !p.fairingOpened) role = 'nosecone';
        else if (def.isHeatShield) role = 'heat_shield';
        else if (def.isSolarPanel) role = 'solar_panel';
        else if (def.isLandingPad) role = 'landing_leg';
        else if (def.isParachute) role = 'parachute';
        else if (def.id === 'grid_fin') role = 'grid_fin';
        else if (def.category === 'aero' && def.radialAttachable) role = 'fin';
        else if (def.id.includes('nosecone') || (def.category === 'capsules' && !def.id.includes('probe_cube'))) role = 'nosecone';
        else if (def.id.includes('adapter')) role = 'adapter';
        else if (def.radialAttachable || def.category === 'rcs' || def.id === 'truss_girder') role = 'radial_pod';
    }

    const baseCd = (typeof def.dragCoeff === 'number') ? def.dragCoeff : 0.14;
    let cdFwd = 0.72;
    let cdRet = 0.78;
    let cdSide = 1.25;
    let streamline = 0.18;     // Qué tan limpio desvía el flujo para lo que viene detrás (0..1)
    let normalSlope = 0.35;    // Fuerza lateral/estabilizadora por unidad de área
    let blocksFlow = true;     // Si proyecta sombra aerodinámica hacia atrás
    let heatShieldPower = 0.55;

    switch (role) {
        case 'nosecone':
            cdFwd = upright ? Math.max(0.09, baseCd * 1.9) : 0.88;
            cdRet = inverted ? 0.22 : 0.78;
            cdSide = 1.05;
            streamline = upright ? 0.92 : 0.20;
            normalSlope = 0.45;
            heatShieldPower = 0.55;
            break;
        case 'parachute':
            cdFwd = upright ? 0.24 : 0.76;
            cdRet = 0.75;
            cdSide = 1.15;
            streamline = upright ? 0.75 : 0.20;
            normalSlope = 0.30;
            break;
        case 'adapter':
            cdFwd = upright ? 0.22 : 0.65;
            cdRet = inverted ? 0.24 : 0.65;
            cdSide = 1.18;
            streamline = upright ? 0.80 : 0.30;
            normalSlope = 0.40;
            break;
        case 'heat_shield':
            cdFwd = 0.86;
            cdRet = 1.42;
            cdSide = 1.35;
            streamline = 0.25;
            normalSlope = 0.35;
            heatShieldPower = 0.92;
            break;
        case 'fin':
            cdFwd = 0.09;
            cdRet = 0.16;
            cdSide = 1.45;
            streamline = 0.50;
            normalSlope = 3.2;
            blocksFlow = false;
            heatShieldPower = 0.20;
            break;
        case 'grid_fin':
            cdFwd = 0.24;
            cdRet = 1.05;
            cdSide = 1.30;
            streamline = 0.15;
            normalSlope = 2.5;
            blocksFlow = false;
            heatShieldPower = 0.25;
            break;
        case 'solar_panel':
            cdFwd = 0.10 + 1.12 * anim;
            cdRet = 0.14 + 1.15 * anim;
            cdSide = 0.55 + 0.95 * anim;
            streamline = 0.12;
            normalSlope = 0.25 + 1.45 * anim;
            blocksFlow = anim < 0.2;
            heatShieldPower = 0.10;
            break;
        case 'landing_leg':
            cdFwd = 0.12 + 0.52 * anim;
            cdRet = 0.18 + 0.68 * anim;
            cdSide = 0.85 + 0.50 * anim;
            streamline = 0.22;
            normalSlope = 0.30 + 0.65 * anim;
            blocksFlow = anim < 0.25;
            heatShieldPower = 0.25;
            break;
        case 'radial_pod':
            cdFwd = 0.56;
            cdRet = 0.62;
            cdSide = 1.30;
            streamline = 0.18;
            normalSlope = 0.45;
            heatShieldPower = 0.35;
            break;
        default: // body (tanks, engines, decouplers, probes)
            cdFwd = def.thrust ? 0.52 : (0.62 + Math.min(0.35, baseCd));
            cdRet = def.thrust ? 0.82 : 0.78;
            cdSide = 1.25;
            streamline = def.id && def.id.includes('spherical') ? 0.48 : 0.18;
            normalSlope = 0.42;
            heatShieldPower = def.thrust ? 0.72 : 0.62;
            break;
    }

    return {
        part: p,
        def,
        role,
        anim,
        cx: effCenterX,
        cy: effCenterY,
        halfW: projW * 0.5,
        halfH: projH * 0.5,
        projW,
        projH,
        cdFwd,
        cdRet,
        cdSide,
        streamline,
        normalSlope,
        blocksFlow,
        heatShieldPower,
        isHeatShield: role === 'heat_shield',
        isDeployedSolar: role === 'solar_panel' && anim > 0.2
    };
}

function _runAxialAeroPass(items, direction, comX) {
    // direction: +1 = flujo frontal (desde -Y hacia +Y), -1 = flujo retrógrado (desde +Y hacia -Y)
    const sorted = items.slice().sort((a, b) => {
        const aLead = direction > 0 ? (a.cy - a.halfH) : -(a.cy + a.halfH);
        const bLead = direction > 0 ? (b.cy - b.halfH) : -(b.cy + b.halfH);
        return aLead - bLead;
    });

    const shadowIntervals = []; // { x0, x1, streamline, shieldPower }
    let totalDragArea = 0;
    let totalRefWidth = 0;
    let asymTorqueMoment = 0;
    let exposedBluntCount = 0;
    let hasLeadingCone = false;
    let unfairedSteps = 0;
    let heatShieldCoverage = 0;
    let deployedSolarPenalty = 0;

    for (let i = 0; i < sorted.length; i++) {
        const it = sorted[i];
        const x0 = it.cx - it.halfW;
        const x1 = it.cx + it.halfW;
        const w = Math.max(1, x1 - x0);

        // Calcular cuánto de [x0, x1] está cubierto por piezas corriente arriba
        let coveredW = 0;
        let weightedStreamline = 0;
        let maxShieldUp = 0;

        // Unión simple de intervalos solapados mediante muestreo de puntos o fusión de intervalos
        const overlaps = [];
        for (let k = 0; k < shadowIntervals.length; k++) {
            const sh = shadowIntervals[k];
            const ox0 = Math.max(x0, sh.x0);
            const ox1 = Math.min(x1, sh.x1);
            if (ox1 > ox0 + 0.5) {
                overlaps.push({ x0: ox0, x1: ox1, streamline: sh.streamline, shieldPower: sh.shieldPower });
            }
        }

        if (overlaps.length > 0) {
            overlaps.sort((a, b) => a.x0 - b.x0);
            let curX0 = overlaps[0].x0;
            let curX1 = overlaps[0].x1;
            let curStr = overlaps[0].streamline;
            let curShd = overlaps[0].shieldPower;

            for (let m = 1; m < overlaps.length; m++) {
                const ov = overlaps[m];
                if (ov.x0 <= curX1) {
                    const segW = Math.max(0, ov.x1 - curX1);
                    curStr = Math.max(curStr, ov.streamline);
                    curShd = Math.max(curShd, ov.shieldPower);
                    curX1 = Math.max(curX1, ov.x1);
                } else {
                    const seg = curX1 - curX0;
                    coveredW += seg;
                    weightedStreamline += seg * curStr;
                    if (curShd > maxShieldUp) maxShieldUp = curShd;
                    curX0 = ov.x0; curX1 = ov.x1; curStr = ov.streamline; curShd = ov.shieldPower;
                }
            }
            const lastSeg = curX1 - curX0;
            coveredW += lastSeg;
            weightedStreamline += lastSeg * curStr;
            if (curShd > maxShieldUp) maxShieldUp = curShd;
        }

        coveredW = Math.min(w, coveredW);
        const exposedW = Math.max(0, w - coveredW);
        const avgStreamline = coveredW > 0.5 ? (weightedStreamline / coveredW) : 0;

        const baseCd = direction > 0 ? it.cdFwd : it.cdRet;
        // Área frontal expuesta directamente al flujo
        const exposedDrag = exposedW * baseCd;

        // Arrastre de fricción superficial o estela turbulenta en la parte cubierta
        const skinCd = it.role === 'adapter'
            ? 0.04
            : (0.045 + (1 - avgStreamline) * 0.14);
        const coveredDrag = coveredW * skinCd;

        // Escalón aerodinámico brusco (hombro expuesto sin adaptador)
        let shoulderDrag = 0;
        if (direction > 0 && coveredW > 2 && exposedW > 5 && it.role !== 'fin' && it.role !== 'grid_fin' && it.role !== 'adapter' && it.role !== 'solar_panel') {
            shoulderDrag = exposedW * 0.22;
            unfairedSteps++;
        }

        // Penalización extra por paneles solares desplegados en flujo
        let solarExtra = 0;
        if (it.isDeployedSolar) {
            solarExtra = w * 0.45 * it.anim;
            deployedSolarPenalty += it.anim;
        }

        const partDragArea = exposedDrag + coveredDrag + shoulderDrag + solarExtra;
        totalDragArea += partDragArea;
        totalRefWidth = Math.max(totalRefWidth, x1) - Math.min(0, x0) > 0 ? totalRefWidth : totalRefWidth;

        // Torque parásito por asimetría lateral respecto al CoM
        const leverX = (it.cx - comX);
        asymTorqueMoment += partDragArea * leverX;

        if (direction > 0 && exposedW > 8) {
            if (it.role === 'nosecone' || it.role === 'parachute') hasLeadingCone = true;
            else if (it.role === 'body' || it.role === 'radial_pod' || it.role === 'heat_shield') exposedBluntCount++;
        }

        if (direction < 0 && it.isHeatShield && exposedW > w * 0.4) {
            heatShieldCoverage = Math.max(heatShieldCoverage, exposedW / w);
        }

        if (it.blocksFlow) {
            shadowIntervals.push({
                x0,
                x1,
                streamline: it.streamline,
                shieldPower: it.heatShieldPower
            });
        }
    }

    // Calcular envergadura real proyectada (unión de todos los intervalos)
    let spanW = 12;
    if (sorted.length > 0) {
        const allX = sorted.map(it => [it.cx - it.halfW, it.cx + it.halfW]).sort((a, b) => a[0] - b[0]);
        let mergedW = 0;
        let c0 = allX[0][0], c1 = allX[0][1];
        for (let i = 1; i < allX.length; i++) {
            if (allX[i][0] <= c1) c1 = Math.max(c1, allX[i][1]);
            else { mergedW += (c1 - c0); c0 = allX[i][0]; c1 = allX[i][1]; }
        }
        mergedW += (c1 - c0);
        spanW = Math.max(12, mergedW);
    }

    const cdEffective = Math.max(0.08, totalDragArea / Math.max(10, spanW));
    const asymRatio = asymTorqueMoment / Math.max(120, totalDragArea * Math.max(16, spanW * 0.5));

    return {
        cdEffective,
        spanW,
        totalDragArea,
        asymRatio: Math.max(-1, Math.min(1, asymRatio)),
        exposedBluntCount,
        hasLeadingCone,
        unfairedSteps,
        heatShieldCoverage,
        deployedSolarPenalty
    };
}

function analyzeRocketAerodynamics(parts, com, bounds) {
    if (!parts || parts.length === 0) {
        return {
            cdForward: 0.20,
            cdRetro: 0.45,
            cdBroadside: 1.30,
            frontSpan: 1.0,
            retroSpan: 1.0,
            sideSpan: 1.0,
            copY: com ? com.y : 0,
            stabilityMargin: 0.05,
            asymFactor: 0,
            finDamping: 0.04,
            retroHeatShieldFactor: 0,
            deployedSolarDragFactor: 0,
            aeroScore: 70,
            tips: []
        };
    }

    const comX = com ? com.x : 0;
    const comY = com ? com.y : 0;
    const items = [];
    for (const p of parts) {
        const def = ROCKET_PARTS_CATALOG[p.partDefId];
        if (!def) continue;
        items.push(_classifyPartAero(p, def));
    }

    if (items.length === 0) {
        return {
            cdForward: 0.20, cdRetro: 0.45, cdBroadside: 1.30,
            frontSpan: 1.0, retroSpan: 1.0, sideSpan: 1.0,
            copY: comY, stabilityMargin: 0.05, asymFactor: 0, finDamping: 0.04,
            retroHeatShieldFactor: 0, deployedSolarDragFactor: 0, aeroScore: 70, tips: []
        };
    }

    const fwd = _runAxialAeroPass(items, +1, comX);
    const ret = _runAxialAeroPass(items, -1, comX);

    // Pasada lateral (broadside, flujo perpendicular +-X) y Centro de Presión (CoP)
    let broadsideDragArea = 0;
    let broadsideSpan = 0;
    let copWeightedY = 0;
    let copWeightSum = 0;
    let finDamping = 0.03;

    // Intervalos en Y para área lateral
    const ySorted = items.slice().sort((a, b) => (a.cy - a.halfH) - (b.cy - b.halfH));
    let y0 = ySorted[0].cy - ySorted[0].halfH;
    let y1 = ySorted[0].cy + ySorted[0].halfH;
    for (let i = 1; i < ySorted.length; i++) {
        const a0 = ySorted[i].cy - ySorted[i].halfH;
        const a1 = ySorted[i].cy + ySorted[i].halfH;
        if (a0 <= y1) y1 = Math.max(y1, a1);
        else { broadsideSpan += (y1 - y0); y0 = a0; y1 = a1; }
    }
    broadsideSpan += (y1 - y0);
    broadsideSpan = Math.max(20, broadsideSpan);

    for (const it of items) {
        const areaSide = it.projH * it.cdSide;
        broadsideDragArea += areaSide;

        // Contribución al Centro de Presión (CoP)
        const normalWeight = Math.max(0.5, it.projH * it.normalSlope * (it.role === 'fin' || it.role === 'grid_fin' ? 1.8 : 1.0));
        copWeightedY += it.cy * normalWeight;
        copWeightSum += normalWeight;

        if (it.role === 'fin' || it.role === 'grid_fin') {
            const arm = Math.abs(it.cy - comY) / 35;
            finDamping += 0.035 * Math.max(0.4, arm);
        }
    }

    const cdBroadside = Math.max(0.95, Math.min(1.75, broadsideDragArea / Math.max(20, broadsideSpan * 1.15)));
    const copY = copWeightSum > 0 ? (copWeightedY / copWeightSum) : comY;
    const rocketH = Math.max(30, bounds && bounds.height ? bounds.height : broadsideSpan);

    // En builder +Y es abajo (cola): copY > comY => estable (margen positivo)
    const stabilityMargin = Math.max(-0.65, Math.min(0.65, (copY - comY) / rocketH));

    // Normalizar Cd dentro de un rango realista y jugable
    const cdForward = Math.max(0.11, Math.min(1.35, fwd.cdEffective * 0.52));
    const cdRetro = Math.max(0.24, Math.min(1.55, ret.cdEffective * 0.68));

    const frontSpan = Math.max(0.65, Math.min(2.6, fwd.spanW / 40));
    const retroSpan = Math.max(0.70, Math.min(2.6, ret.spanW / 40));
    const sideSpan = Math.max(0.70, Math.min(2.8, broadsideSpan / 74));

    // Puntuación global 0..100 y consejos inteligentes para el jugador
    let score = 100;
    score -= Math.max(0, (cdForward - 0.14) * 95);
    if (stabilityMargin < -0.05) score -= Math.min(25, Math.abs(stabilityMargin + 0.05) * 90);
    score -= Math.min(18, Math.abs(fwd.asymRatio) * 35);
    score -= Math.min(12, fwd.unfairedSteps * 6);
    if (fwd.deployedSolarPenalty > 0.2) score -= Math.min(24, fwd.deployedSolarPenalty * 10);
    const aeroScore = Math.max(5, Math.min(99, Math.round(score)));

    const tips = [];
    if (!fwd.hasLeadingCone && fwd.exposedBluntCount > 0) {
        tips.push('Añade un cono aerodinámico en la proa para reducir el arrastre');
    }
    if (fwd.deployedSolarPenalty > 0.2) {
        tips.push('Contrae los paneles solares antes de despegar');
    }
    if (stabilityMargin < -0.05) {
        tips.push('Inestable: coloca aletas estabilizadoras en la parte trasera');
    } else if (stabilityMargin > 0.08 && cdForward < 0.22) {
        tips.push('Perfil aerodinámico limpio y estable');
    }
    if (Math.abs(fwd.asymRatio) > 0.18) {
        tips.push('Diseño asimétrico: equilibra los salientes laterales');
    }
    if (fwd.unfairedSteps > 0) {
        tips.push('Usa adaptadores cónicos en transiciones de ancho');
    }

    return {
        cdForward,
        cdRetro,
        cdBroadside,
        frontSpan,
        retroSpan,
        sideSpan,
        copY,
        stabilityMargin,
        asymFactor: fwd.asymRatio,
        finDamping: Math.min(0.28, finDamping),
        retroHeatShieldFactor: ret.heatShieldCoverage,
        deployedSolarDragFactor: Math.min(2.0, fwd.deployedSolarPenalty),
        aeroScore,
        tips
    };
}

function compileCustomRocketModel(parts, name = 'Cohete Modular') {
    if (!parts || parts.length === 0) return null;

    let dryMass = 0, fuelCapacity = 0, currentFuel = 0, netThrustUp = 0, totalWarpThrust = 0;
    let fuelConsumption = 0, passengers = 0, totalHull = 60, electricalGen = 0;
    let hasCommand = false, enginesCount = 0;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let weightedMassX = 0, weightedMassY = 0;
    let weightedThrustX = 0, weightedThrustY = 0, totalThrustMag = 0;

    for (const p of parts) {
        const def = ROCKET_PARTS_CATALOG[p.partDefId];
        if (!def) continue;

        const st = getPartScaledStats(p, def);
        const fuelFrac = (typeof p.fuelPercent === 'number' ? p.fuelPercent : 100) / 100;
        const partFuelCap = st.fuelCapacity || 0;
        const partFuel = partFuelCap * fuelFrac;
        const partMass = st.dryMass + partFuel * 0.01;

        dryMass += st.dryMass;
        fuelCapacity += partFuelCap;
        currentFuel += partFuel;
        passengers += def.passengers || 0;
        totalHull += (st.hull || 50) * 0.25;
        electricalGen += st.electricalGen || 0;

        weightedMassX += p.x * partMass;
        weightedMassY += p.y * partMass;
        if (def.category === 'capsules') hasCommand = true;

        if (st.thrust && st.thrust > 0) {
            const limit = (typeof p.thrustLimit === 'number' ? p.thrustLimit : 100) / 100;
            const effThrust = st.thrust * limit;
            const rotRad = ((p.rotation || 0) * Math.PI) / 180;
            const isActive = (p.engineActive !== false);
            if (isActive) {
                netThrustUp += effThrust * Math.cos(rotRad);
                totalWarpThrust += (st.warpThrust || st.thrust * 2.0) * limit;
                fuelConsumption += (st.consumption || 1.0) * limit;
            }
            totalThrustMag += effThrust;
            enginesCount++;
            weightedThrustX += p.x * effThrust;
            weightedThrustY += p.y * effThrust;
        }

        if (!(def.isFairing && p.fairingOpened)) {
            const b = rocketBuilder.getPartBoundsLocal(def, p.rotation || 0, p);
            minX = Math.min(minX, p.x - b.halfW);
            maxX = Math.max(maxX, p.x + b.halfW);
            minY = Math.min(minY, p.y - b.halfH);
            maxY = Math.max(maxY, p.y + b.halfH);
        }
    }

    if (!isFinite(minX)) { minX = -15; maxX = 15; minY = -20; maxY = 20; }

    const totalFuelMass = currentFuel * 0.01;
    const totalMass = Math.max(0.35, dryMass + totalFuelMass);
    const comX = weightedMassX / totalMass;
    const comY = weightedMassY / totalMass;
    const cotX = totalThrustMag > 0 ? weightedThrustX / totalThrustMag : comX;
    const cotY = totalThrustMag > 0 ? weightedThrustY / totalThrustMag : maxY;

    const engines = [];
    const rcsList = [];
    const padsList = [];

    for (const p of parts) {
        const def = ROCKET_PARTS_CATALOG[p.partDefId];
        if (!def) continue;

        if (def.thrust && def.thrust > 0) {
            const sz = getPartSize(p, def);
            const st = getPartScaledStats(p, def);
            const limit = (typeof p.thrustLimit === 'number' ? p.thrustLimit : 100) / 100;
            const rotRad = ((p.rotation || 0) * Math.PI) / 180;
            const localBellY = sz.height * 0.5;
            const worldBellX = p.x - localBellY * Math.sin(rotRad);
            const worldBellY = p.y + localBellY * Math.cos(rotRad);

            engines.push({
                instanceId: p.instanceId,
                active: (p.engineActive !== false),
                flightX: -(worldBellY - comY) * FLIGHT_SCALE,
                flightY: (worldBellX - comX) * FLIGHT_SCALE,
                angleOffset: rotRad,
                scale: (def.nozzleOffset ? def.nozzleOffset.scale : 1.0) * 0.95 * Math.max(0.4, sz.wScale),
                flameColor: def.flameColor || 'standard',
                engineMode: def.engineMode || 'sea',
                thrust: st.thrust * limit,
                warpThrust: (st.warpThrust || st.thrust * 2.0) * limit,
                consumption: (st.consumption || 1.0) * limit,
                gimbalEnabled: p.gimbalEnabled !== false,
                offsetFromCoM: (worldBellX - comX)
            });
        }

        if (def.category === 'rcs') {
            const st = getPartScaledStats(p, def);
            rcsList.push({
                flightX: -(p.y - comY) * FLIGHT_SCALE,
                flightY: (p.x - comX) * FLIGHT_SCALE,
                side: p.x >= comX ? 'right' : 'left',
                power: st.rcsPower || 1.0
            });
        }

        if (def.isLandingPad) {
            const sz = getPartSize(p, def);
            const rotRad = ((p.rotation || 0) * Math.PI) / 180;
            const legSpanX = p.flipped ? (sz.width * 0.45) : -(sz.width * 0.45);
            const legSpanY = sz.height * 0.48;
            const worldFootX = p.x + legSpanX * Math.cos(rotRad) - legSpanY * Math.sin(rotRad);
            const worldFootY = p.y + legSpanX * Math.sin(rotRad) + legSpanY * Math.cos(rotRad);
            padsList.push({
                id: 'pad_' + p.instanceId,
                x: -(worldFootY - comY) * FLIGHT_SCALE,
                y: (worldFootX - comX) * FLIGHT_SCALE,
                isPad: true
            });
        }
    }

    const twr = totalMass > 0 ? Math.max(0, netThrustUp) / (totalMass * 9.81) : 0;
    const contactPoints = buildCustomContactPoints(parts, comX, comY);

    const rocketH = Math.max(20, (maxY - minY) * FLIGHT_SCALE);
    const rocketR = Math.max(8, (maxX - minX) * FLIGHT_SCALE * 0.5);
    const baseGeomInertia = (1 / 12) * totalMass * (3 * rocketR * rocketR + rocketH * rocketH);
    const calcInertia = Math.max(180, Math.min(1200000, baseGeomInertia * 1.6 + totalMass * 120));
    const equivThrustAccel = twr * WORLD_G_REF;
    const warpTwr = totalMass > 0 ? Math.max(0, totalWarpThrust) / (totalMass * 9.81) : 0;
    const equivWarpAccel = warpTwr * WORLD_G_REF;
    const computedWarpThrust = enginesCount > 0 ? Math.max(equivThrustAccel * 3.4, equivWarpAccel * 1.15, 1350) : 0;

    const bounds = { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
    const aero = analyzeRocketAerodynamics(parts, { x: comX, y: comY }, bounds);

    return {
        id: 'custom',
        name,
        class: hasCommand ? 'Vector Personalizado VAB' : 'Etapa / Escombro',
        tagline: `Cohete de ${parts.length} piezas · Masa ${totalMass.toFixed(1)}t · TWR ${twr.toFixed(2)}`,
        scale: 1.0,
        mass: totalMass,
        dryMass,
        fuelMass: totalFuelMass,
        totalThrustKN: Math.max(0, netThrustUp),
        inertia: calcInertia,
        thrust: equivThrustAccel,
        warpThrust: computedWarpThrust,
        maxSpeed: 750,
        warpMaxSpeed: 1850,
        fuelCapacity: Math.max(0.1, currentFuel),
        fuelConsumption: Math.max(0.1, fuelConsumption),
        maxHull: Math.round(totalHull),
        passengers,
        hasCommand,
        smokeScale: Math.max(0.6, Math.min(2.6, Math.max(0, netThrustUp) / 220)),
        puffBaseSize: 6.0,
        groundSmokeRate: 40,
        buildTime: 3.0,
        turnRate: Math.max(2.0, Math.min(5.8, 18 / Math.max(1, Math.pow(totalMass, 0.38)))),
        specialAbility: 'Diseño Modular VAB',
        specialDesc: `${enginesCount} motores · TWR ${twr.toFixed(2)}`,
        badge: 'VAB Modular',
        badgeColor: 'amber',
        color: '#f59e0b',
        contactPoints,
        customParts: parts,
        com: { x: comX, y: comY },
        cot: { x: cotX, y: cotY },
        engines,
        rcsList,
        rcsAuthority: rcsList.reduce((acc, r) => acc + (r.power || 1.0) * Math.max(0.5, Math.hypot(r.flightX, r.flightY) / 18), 0),
        electricalGen,
        bounds,
        aero
    };
}

function spawnFreeVesselFromParts(parts, refWorldX, refWorldY, refVx, refVy, refAngle, refCom, label = 'Etapa Separada', impulseDirLocal = null) {
    if (!parts || parts.length === 0) return null;
    const model = compileCustomRocketModel(parts, label);
    if (!model) return null;

    const scale = FLIGHT_SCALE;
    const fx = -(model.com.y - refCom.y) * scale;
    const fy = (model.com.x - refCom.x) * scale;
    const cosA = Math.cos(refAngle);
    const sinA = Math.sin(refAngle);

    const worldX = refWorldX + cosA * fx - sinA * fy;
    const worldY = refWorldY + sinA * fx + cosA * fy;

    let dvx = 0, dvy = 0;
    if (impulseDirLocal) {
        dvx = cosA * impulseDirLocal.x - sinA * impulseDirLocal.y;
        dvy = sinA * impulseDirLocal.x + cosA * impulseDirLocal.y;
    }

    const vessel = {
        id: 'fv_' + (freeVesselCounter++),
        name: model.hasCommand ? `${label} (Controlable)` : label,
        x: worldX,
        y: worldY,
        vx: refVx + dvx,
        vy: refVy + dvy,
        angle: refAngle,
        av: (Math.random() - 0.5) * 0.35,
        mass: model.mass,
        inertia: model.inertia,
        fuel: model.fuelCapacity,
        maxFuel: model.fuelCapacity,
        hull: model.maxHull,
        maxHull: model.maxHull,
        scale: 1.0,
        modelKey: 'custom',
        isGrounded: false,
        thrustIntensity: 0,
        invulnTimer: 0.45,
        customRocket: model,
        contactPoints: model.contactPoints
    };

    freeVessels.push(vessel);
    return vessel;
}

function getPartImpactTolerance(def) {
    if (!def) return 150;
    if (def.isSolarPanel) return 45;
    if (def.isParachute) return 95;
    if (def.isLandingPad) return 235;
    if (def.isHeatShield) return 320;
    if (def.thrust && def.thrust > 0) return 165;
    return 135 + (def.hull || 80) * 0.35;
}

function damageCustomRocketPartAt(targetVessel, partInstanceId, damage, worldX, worldY, impactSpeed, normalX, normalY, planetRef) {
    if (!targetVessel || !targetVessel.customRocket || !targetVessel.customRocket.customParts || !partInstanceId) return false;
    const parts = targetVessel.customRocket.customParts;
    const idx = parts.findIndex(p => p.instanceId === partInstanceId);
    if (idx < 0) return false;

    const part = parts[idx];
    const def = ROCKET_PARTS_CATALOG[part.partDefId];
    if (!def) return false;

    if (typeof part.hp !== 'number') part.hp = def.hull || 80;
    part.hp -= damage;

    if (part.hp > 0) {
        if (impactSpeed > 70 && typeof createSparks === 'function') {
            createSparks(worldX, worldY, 4, Math.atan2(normalY || -1, normalX || 0), 0.9, 60, 170, [255, 220, 140], 0.35);
        }
        return false;
    }

    // ¡Pieza destruida! Efectos visuales y separación estructural de componentes restantes
    const isTank = (def.fuelCapacity && def.fuelCapacity > 0);
    const isSolar = !!def.isSolarPanel;
    const isCommand = (def.category === 'capsules');
    const debrisCol = isTank ? [249, 115, 22] : [180, 192, 208];

    if (typeof spawnShatteredPartFX === 'function') {
        spawnShatteredPartFX(
            worldX, worldY, targetVessel.vx, targetVessel.vy, targetVessel.angle,
            def.width, def.height, part.color || def.defaultColor, def.category, isTank, isSolar, planetRef || null
        );
    }

    if (typeof createDebris === 'function') {
        createDebris(worldX, worldY, isTank ? 12 : 8, debrisCol, 70, 260, planetRef || null);
    }
    if (typeof createSparks === 'function') {
        createSparks(worldX, worldY, isTank ? 18 : 12, Math.atan2(normalY || -1, normalX || 0), 1.5, 80, 310, [255, 215, 110], 0.55);
    }
    if (typeof createSmoke === 'function') {
        createSmoke(
            worldX, worldY, isTank ? 6 : 3, isTank ? 9.5 : 6.0,
            isTank ? [255, 155, 65] : [180, 190, 205],
            (normalX || 0) * 32, (normalY || -1) * 32,
            1.4, 28,
            { cloudType: 'launch', expansionMult: 3.1, alpha: 0.65, heatGlow: isTank ? 1.0 : 0.3 }
        );
    }
    if (typeof createShockwave === 'function' && (isTank || impactSpeed > 170)) {
        createShockwave(worldX, worldY, isTank ? 92 : 52, 260, isTank ? 'rgba(255, 190, 90, 0.9)' : 'rgba(255, 255, 255, 0.75)');
    }
    if (typeof audio !== 'undefined' && audio.playImpact) {
        audio.playImpact(Math.min(1.0, Math.max(0.35, impactSpeed / 220)));
    }

    const oldCom = targetVessel.customRocket.com || { x: 0, y: 0 };
    const fuelRatio = targetVessel.maxFuel > 0 ? Math.max(0, Math.min(1, targetVessel.fuel / targetVessel.maxFuel)) : 1;
    const remaining = parts.filter(p => p.instanceId !== partInstanceId);

    if (remaining.length === 0) {
        if (typeof ship !== 'undefined' && targetVessel === ship) {
            if (typeof takeDamage === 'function') takeDamage(999, 'Estructura del cohete destruida en colisión');
        } else if (typeof freeVessels !== 'undefined') {
            const fvIdx = freeVessels.indexOf(targetVessel);
            if (fvIdx >= 0) freeVessels.splice(fvIdx, 1);
        }
        return true;
    }

    const components = findConnectedComponents(remaining);
    let mainIdx = components.findIndex(comp => comp.some(p => ROCKET_PARTS_CATALOG[p.partDefId]?.category === 'capsules'));
    const lostCommand = (isCommand && mainIdx < 0 && typeof ship !== 'undefined' && targetVessel === ship);
    if (mainIdx < 0) {
        // Conservar el fragmento más grande si no hay cápsula
        mainIdx = 0;
        for (let i = 1; i < components.length; i++) {
            if (components[i].length > components[mainIdx].length) mainIdx = i;
        }
    }

    const mainParts = components[mainIdx];
    const brokenOff = components.filter((_, i) => i !== mainIdx);
    const newModel = compileCustomRocketModel(mainParts, targetVessel.customRocket.name);
    if (!newModel) return true;

    const fxShift = -(newModel.com.y - oldCom.y) * FLIGHT_SCALE;
    const fyShift = (newModel.com.x - oldCom.x) * FLIGHT_SCALE;
    const cosA = Math.cos(targetVessel.angle);
    const sinA = Math.sin(targetVessel.angle);
    const prevX = targetVessel.x;
    const prevY = targetVessel.y;
    targetVessel.x += cosA * fxShift - sinA * fyShift;
    targetVessel.y += sinA * fxShift + cosA * fyShift;

    for (const comp of brokenOff) {
        const compComY = comp.reduce((s, p) => s + p.y, 0) / comp.length;
        const compComX = comp.reduce((s, p) => s + p.x, 0) / comp.length;
        const sepDirX = -(compComY - oldCom.y);
        const sepDirY = (compComX - oldCom.x);
        const mag = Math.hypot(sepDirX, sepDirY) || 1;
        const scatter = { x: (sepDirX / mag) * 38, y: (sepDirY / mag) * 38 };
        spawnFreeVesselFromParts(comp, prevX, prevY, targetVessel.vx, targetVessel.vy, targetVessel.angle, oldCom, 'Fragmento', scatter);
    }

    targetVessel.customRocket = newModel;
    targetVessel.mass = newModel.mass;
    targetVessel.inertia = newModel.inertia;
    targetVessel.contactPoints = newModel.contactPoints;
    targetVessel.maxFuel = newModel.fuelCapacity;
    targetVessel.fuel = newModel.fuelCapacity * fuelRatio;

    if (typeof ship !== 'undefined' && targetVessel === ship) {
        if (typeof ROCKET_MODELS !== 'undefined') ROCKET_MODELS['custom'] = newModel;
        if (typeof applyRocketModel === 'function') applyRocketModel(ship, 'custom');
        ship.fuel = newModel.fuelCapacity * fuelRatio;
        if (lostCommand && typeof takeDamage === 'function') {
            takeDamage(999, 'Módulo de mando destruido en impacto');
        }
    }
    return true;
}

function decoupleCustomPart(decouplerInstanceId) {
    if (typeof ship === 'undefined' || !ship.customRocket || !ship.customRocket.customParts) return false;
    const parts = ship.customRocket.customParts;
    const dec = parts.find(p => p.instanceId === decouplerInstanceId);
    if (!dec) return false;

    const oldCom = ship.customRocket.com || { x: 0, y: 0 };
    const fuelRatio = ship.maxFuel > 0 ? Math.max(0, Math.min(1, ship.fuel / ship.maxFuel)) : 1;

    // Cortar solo la conexión del lado de separación (el separador + carenado permanecen adheridos a la etapa que se desprende, estilo SFS)
    const severedPairs = [];
    if (isVerticalDecouplerId(dec.partDefId)) {
        // Guardar carenado interetapa en el separador si cubría un motor arriba
        const decDef = ROCKET_PARTS_CATALOG[dec.partDefId];
        const decSz = getPartSize(dec, decDef);
        const decTop = dec.y - (decDef ? decSz.height * 0.5 : 5);
        const engAbove = parts.find(p => {
            const d = ROCKET_PARTS_CATALOG[p.partDefId];
            if (!d || !d.thrust || d.thrust <= 0) return false;
            const dSz = getPartSize(p, d);
            return Math.abs(p.x - dec.x) < 12 && p.y < dec.y && (decTop - (p.y + dSz.height * 0.5)) <= 16;
        });
        if (engAbove) {
            const engDef = ROCKET_PARTS_CATALOG[engAbove.partDefId];
            const engSz = getPartSize(engAbove, engDef);
            const engTop = engAbove.y - engSz.height * 0.5;
            const tankAbove = parts.find(p => {
                const d = ROCKET_PARTS_CATALOG[p.partDefId];
                if (!d || d.radialAttachable) return false;
                const dSz = getPartSize(p, d);
                return Math.abs(p.x - engAbove.x) < 12 && Math.abs((p.y + dSz.height * 0.5) - engTop) <= 8;
            });
            const dTank = tankAbove ? ROCKET_PARTS_CATALOG[tankAbove.partDefId] : null;
            const tankSz = dTank ? getPartSize(tankAbove, dTank) : null;
            const topW = tankSz ? tankSz.width : (decDef ? decSz.width : 30);
            const botW = decDef ? decSz.width : 30;
            const shH = Math.max(engSz.height, decTop - engTop);
            dec.interstageShroud = {
                width: Math.max(topW, botW),
                topWidth: topW,
                botWidth: botW,
                height: shH,
                color: (tankAbove && tankAbove.color) || '#cbd5e1',
                texture: (tankAbove && tankAbove.texture) || 'smooth'
            };
        }
        // Severar toda conexión entre `dec` y cualquier pieza por encima de `dec`
        for (const p of parts) {
            if (p.instanceId !== dec.instanceId && p.y < dec.y - 2 && arePartsConnected(dec, p)) {
                severedPairs.push([dec.instanceId, p.instanceId]);
            }
        }
        dec.detached = true;
    } else if (dec.partDefId === 'decoupler_radial') {
        // Severar conexión entre `dec` y la pieza más cercana al eje central (núcleo)
        const neighbors = parts.filter(p => p.instanceId !== dec.instanceId && arePartsConnected(dec, p));
        if (neighbors.length > 0) {
            neighbors.sort((a, b) => Math.abs(a.x) - Math.abs(b.x));
            severedPairs.push([dec.instanceId, neighbors[0].instanceId]);
        }
        dec.detached = true;
    }

    const components = findConnectedComponents(parts, [], severedPairs);
    if (components.length <= 1) {
        // Fallback: si estaba conectado por ambos lados, eliminar el separador para garantizar la separación
        const remaining = parts.filter(p => p.instanceId !== decouplerInstanceId);
        const fbComps = findConnectedComponents(remaining);
        if (fbComps.length === 0) return false;
        return finalizeDecouple(fbComps, dec, oldCom, fuelRatio);
    }

    return finalizeDecouple(components, dec, oldCom, fuelRatio);
}

function finalizeDecouple(components, dec, oldCom, fuelRatio) {
    let mainIdx = components.findIndex(comp => comp.some(p => ROCKET_PARTS_CATALOG[p.partDefId]?.category === 'capsules'));
    if (mainIdx < 0) mainIdx = 0;

    const mainParts = components[mainIdx];
    const separatedComps = components.filter((_, idx) => idx !== mainIdx);

    // Activar motores recién expuestos en la etapa restante
    if (isVerticalDecouplerId(dec.partDefId)) {
        for (const p of mainParts) {
            if (ROCKET_PARTS_CATALOG[p.partDefId]?.thrust > 0) {
                p.engineActive = true;
            }
        }
    }

    const newModel = compileCustomRocketModel(mainParts, ship.customRocket.name);
    if (!newModel) return false;

    const fxShift = -(newModel.com.y - oldCom.y) * FLIGHT_SCALE;
    const fyShift = (newModel.com.x - oldCom.x) * FLIGHT_SCALE;
    const cosA = Math.cos(ship.angle);
    const sinA = Math.sin(ship.angle);
    const prevShipX = ship.x;
    const prevShipY = ship.y;
    ship.x += cosA * fxShift - sinA * fyShift;
    ship.y += sinA * fxShift + cosA * fyShift;

    for (const comp of separatedComps) {
        const compComY = comp.reduce((s, p) => s + p.y, 0) / comp.length;
        const compComX = comp.reduce((s, p) => s + p.x, 0) / comp.length;
        const sepDirX = -(compComY - oldCom.y);
        const sepDirY = (compComX - oldCom.x);
        const mag = Math.hypot(sepDirX, sepDirY) || 1;
        const impulse = { x: (sepDirX / mag) * 28, y: (sepDirY / mag) * 28 };
        spawnFreeVesselFromParts(comp, prevShipX, prevShipY, ship.vx, ship.vy, ship.angle, oldCom, 'Etapa Separada', impulse);
    }

    if (typeof ROCKET_MODELS !== 'undefined') ROCKET_MODELS['custom'] = newModel;
    ship.customRocket = newModel;
    if (typeof applyRocketModel === 'function') applyRocketModel(ship, 'custom');
    ship.fuel = Math.min(ship.maxFuel, newModel.fuelCapacity * fuelRatio);

    ship.vx += cosA * 12;
    ship.vy += sinA * 12;

    if (typeof createSmoke === 'function') {
        createSmoke(prevShipX, prevShipY, 6, 4.5, [226, 232, 240], 0, 0, 1.4, 22, { cloudType: 'dust', expansionMult: 2.2, alpha: 0.45 });
    }
    if (typeof rocketBuilder !== 'undefined') rocketBuilder.playSnapSound();
    updateStageHudButton();
    return true;
}

function stageNextDecoupler() {
    if (typeof ship === 'undefined' || !ship.customRocket || !ship.customRocket.customParts) return false;
    const decouplers = ship.customRocket.customParts.filter(p =>
        isVerticalDecouplerId(p.partDefId) || p.partDefId === 'decoupler_radial'
    );
    if (decouplers.length === 0) return false;

    // Priorizar separadores radiales primero (boosters laterales), luego el vertical más bajo
    const radial = decouplers.find(d => d.partDefId === 'decoupler_radial');
    if (radial) return decoupleCustomPart(radial.instanceId);

    decouplers.sort((a, b) => b.y - a.y);
    return decoupleCustomPart(decouplers[0].instanceId);
}

function updateStageHudButton() {
    const btn = document.getElementById('btnStageSeparate');
    const countEl = document.getElementById('uiStageCount');
    if (!btn) return;
    if (typeof ship === 'undefined' || !ship.customRocket || !ship.customRocket.customParts) {
        btn.classList.add('hidden');
        return;
    }
    const count = ship.customRocket.customParts.filter(p =>
        isVerticalDecouplerId(p.partDefId) || p.partDefId === 'decoupler_radial'
    ).length;
    if (count > 0) {
        btn.classList.remove('hidden');
        if (countEl) countEl.textContent = count;
    } else {
        btn.classList.add('hidden');
    }
}

function switchControlToVessel(vesselId) {
    // Soporta tanto vehículos en freeVessels como naves estacionadas en parkedShips
    if (typeof vesselId === 'string' && vesselId.startsWith('parked_')) {
        const pIdx = parseInt(vesselId.replace('parked_', ''), 10);
        if (typeof parkedShips !== 'undefined' && parkedShips[pIdx]) {
            const target = parkedShips[pIdx];
            const oldShipSnap = {
                x: ship.x, y: ship.y, vx: ship.vx, vy: ship.vy, angle: ship.angle, av: 0,
                modelKey: ship.modelKey, customRocket: ship.customRocket || null,
                fuel: ship.fuel, hull: ship.hull, isGrounded: ship.isGrounded,
                scale: ship.scale || 1.0, thrustIntensity: 0
            };
            parkedShips.splice(pIdx, 1, oldShipSnap);
            ship.customRocket = target.customRocket || null;
            if (target.customRocket && typeof ROCKET_MODELS !== 'undefined') ROCKET_MODELS['custom'] = target.customRocket;
            if (typeof applyRocketModel === 'function') applyRocketModel(ship, target.customRocket ? 'custom' : (target.modelKey || 'vesper'));
            ship.x = target.x; ship.y = target.y; ship.vx = target.vx || 0; ship.vy = target.vy || 0;
            ship.angle = target.angle; ship.av = 0;
            ship.fuel = target.fuel !== undefined ? target.fuel : ship.maxFuel;
            ship.hull = target.hull !== undefined ? target.hull : ship.maxHull;
            ship.isGrounded = !!target.isGrounded;
            ship.thrustIntensity = 0;
            if (typeof camera !== 'undefined') { camera.x = ship.x; camera.y = ship.y; }
            closeFreeVesselMenu();
            updateStageHudButton();
            if (typeof rocketBuilder !== 'undefined') rocketBuilder.playSnapSound();
            return true;
        }
        return false;
    }

    const idx = freeVessels.findIndex(v => v.id === vesselId);
    if (idx < 0) return false;
    const target = freeVessels[idx];
    if (!target.customRocket || !target.customRocket.hasCommand) return false;

    // Guardar el cohete actual como vehículo independiente en el mundo
    if (typeof ship !== 'undefined' && ship.customRocket && ship.customRocket.customParts) {
        const oldVessel = {
            id: 'fv_' + (freeVesselCounter++),
            name: ship.customRocket.name || 'Cohete Anterior',
            x: ship.x,
            y: ship.y,
            vx: ship.vx,
            vy: ship.vy,
            angle: ship.angle,
            av: ship.av,
            mass: ship.mass,
            inertia: ship.inertia,
            fuel: ship.fuel,
            maxFuel: ship.maxFuel,
            hull: ship.hull,
            maxHull: ship.maxHull,
            scale: ship.scale || 1.0,
            modelKey: 'custom',
            isGrounded: ship.isGrounded,
            thrustIntensity: 0,
            customRocket: ship.customRocket,
            contactPoints: ship.customRocket.contactPoints
        };
        freeVessels.splice(idx, 1, oldVessel);
    } else {
        freeVessels.splice(idx, 1);
    }

    // Pasar el control al vehículo seleccionado
    if (typeof ROCKET_MODELS !== 'undefined') ROCKET_MODELS['custom'] = target.customRocket;
    ship.customRocket = target.customRocket;
    if (typeof applyRocketModel === 'function') applyRocketModel(ship, 'custom');
    ship.x = target.x;
    ship.y = target.y;
    ship.vx = target.vx;
    ship.vy = target.vy;
    ship.angle = target.angle;
    ship.av = target.av;
    ship.fuel = target.fuel;
    ship.hull = target.hull;
    ship.isGrounded = target.isGrounded;
    ship.thrustIntensity = 0;

    if (typeof camera !== 'undefined') {
        camera.x = ship.x;
        camera.y = ship.y;
    }

    closeFreeVesselMenu();
    updateStageHudButton();
    if (typeof rocketBuilder !== 'undefined') rocketBuilder.playSnapSound();
    return true;
}

function closeFreeVesselMenu() {
    activeFreeVesselMenuId = null;
    const menu = document.getElementById('freeVesselMenu');
    if (menu) menu.classList.add('hidden');
}

function showFreeVesselPopup(id, name, mass, engCnt, hasCmd, screenX, screenY) {
    activeFreeVesselMenuId = id;
    const menu = document.getElementById('freeVesselMenu');
    const title = document.getElementById('fvMenuTitle');
    const meta = document.getElementById('fvMenuMeta');
    const btnCtrl = document.getElementById('btnFvControl');
    if (!menu || !title || !meta || !btnCtrl) return false;

    title.textContent = name;
    meta.innerHTML = `
        <div>Masa: <strong class="text-white">${Number(mass || 1).toFixed(1)}t</strong> · Motores: <strong class="text-amber-300">${engCnt}</strong></div>
        <div>Mando: <strong class="${hasCmd ? 'text-emerald-300' : 'text-rose-400'}">${hasCmd ? 'Operativo (Controlable)' : 'Sin cabina / Escombro'}</strong></div>
    `;
    if (hasCmd) {
        btnCtrl.disabled = false;
        btnCtrl.textContent = 'Controlar';
        btnCtrl.className = 'w-full py-1.5 px-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider text-stone-950 bg-gradient-to-r from-cyan-300 to-emerald-300 hover:brightness-110 cursor-pointer transition-all';
    } else {
        btnCtrl.disabled = true;
        btnCtrl.textContent = 'Sin módulo de mando';
        btnCtrl.className = 'w-full py-1.5 px-3 rounded-xl font-display text-xs font-semibold uppercase tracking-wider text-stone-400 bg-white/5 border border-white/10 cursor-not-allowed';
    }
    const mx = Math.min(window.innerWidth - 240, Math.max(12, screenX + 14));
    const my = Math.min(window.innerHeight - 160, Math.max(60, screenY - 20));
    menu.style.left = `${mx}px`;
    menu.style.top = `${my}px`;
    menu.classList.remove('hidden');
    return true;
}

function worldPointToScreenCoords(wx, wy) {
    if (typeof camera === 'undefined') return { x: 0, y: 0 };
    const sw = (typeof screenW !== 'undefined') ? screenW : window.innerWidth;
    const sh = (typeof screenH !== 'undefined') ? screenH : window.innerHeight;
    const dx = wx - camera.x;
    const dy = wy - camera.y;
    const cosR = Math.cos(camera.rotation || 0);
    const sinR = Math.sin(camera.rotation || 0);
    const rx = dx * cosR - dy * sinR;
    const ry = dx * sinR + dy * cosR;
    return {
        x: sw * 0.5 + rx * (camera.zoom || 1),
        y: sh * 0.5 + ry * (camera.zoom || 1)
    };
}

function handleFreeVesselClick(worldX, worldY, screenX, screenY) {
    const zoom = (typeof camera !== 'undefined' && camera.zoom) ? Math.max(0.2, camera.zoom) : 1.0;

    // 1. Revisar vehículos y etapas independientes (freeVessels)
    for (let i = freeVessels.length - 1; i >= 0; i--) {
        const v = freeVessels[i];
        const parts = v.customRocket?.customParts || [];
        const com = v.customRocket?.com || { x: 0, y: 0 };
        const scale = (v.scale || 1.0) * FLIGHT_SCALE;

        const dx = worldX - v.x;
        const dy = worldY - v.y;
        const cosA = Math.cos(-v.angle);
        const sinA = Math.sin(-v.angle);
        const lx = dx * cosA - dy * sinA;
        const ly = dx * sinA + dy * cosA;
        const bx = com.x + ly / scale;
        const by = com.y - lx / scale;

        let hit = false;
        const pad = 20 / zoom;
        for (const p of parts) {
            const def = ROCKET_PARTS_CATALOG[p.partDefId];
            if (!def) continue;
            const b = rocketBuilder.getPartBoundsLocal(def, p.rotation || 0);
            if (Math.abs(bx - p.x) <= b.halfW + pad / scale && Math.abs(by - p.y) <= b.halfH + pad / scale) {
                hit = true;
                break;
            }
        }
        if (!hit) {
            const sc = worldPointToScreenCoords(v.x, v.y);
            const bounds = v.customRocket?.bounds || { width: 40, height: 60 };
            const screenR = Math.max(36, Math.max(bounds.width, bounds.height) * FLIGHT_SCALE * 0.75 * zoom);
            if (Math.hypot(screenX - sc.x, screenY - sc.y) <= screenR) hit = true;
        }

        if (hit) {
            const hasCmd = !!(v.customRocket && v.customRocket.hasCommand);
            const engCnt = v.customRocket ? v.customRocket.engines.length : 0;
            return showFreeVesselPopup(v.id, v.name, v.mass, engCnt, hasCmd, screenX, screenY);
        }
    }

    // 2. Revisar también naves estacionadas (parkedShips)
    if (typeof parkedShips !== 'undefined' && Array.isArray(parkedShips)) {
        for (let i = parkedShips.length - 1; i >= 0; i--) {
            const ps = parkedShips[i];
            const sc = worldPointToScreenCoords(ps.x, ps.y);
            if (Math.hypot(screenX - sc.x, screenY - sc.y) <= 38) {
                const name = ps.customRocket ? ps.customRocket.name : (typeof getRocketModel === 'function' ? getRocketModel(ps.modelKey).name : 'Cohete Estacionado');
                const mass = ps.customRocket ? ps.customRocket.mass : (typeof getRocketModel === 'function' ? getRocketModel(ps.modelKey).mass : 1.0);
                const engCnt = ps.customRocket ? ps.customRocket.engines.length : 1;
                return showFreeVesselPopup(`parked_${i}`, name, mass, engCnt, true, screenX, screenY);
            }
        }
    }

    closeFreeVesselMenu();
    return false;
}

function openRocketBuilder() {
    const modal = document.getElementById('rocketBuilderModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    rocketBuilder.init();
    rocketBuilder.centerView();
    rocketBuilder.startRenderLoop();
    rocketBuilder.updateStats();
    if (typeof audio !== 'undefined' && audio.init && audio.playChime) {
        audio.init();
        audio.playChime();
    }
}

function closeRocketBuilder() {
    const modal = document.getElementById('rocketBuilderModal');
    if (!modal) return;
    modal.classList.add('hidden');
    rocketBuilder.stopRenderLoop();
}

// --- RENDERIZADO DEL COHETE PERSONALIZADO EN VUELO (CENTRADO EN CoM) ---
function drawCustomRocketInFlight(ctx, s, timeSec, localNight, sScale, thr) {
    if (!s || !s.customRocket || !s.customRocket.customParts) return;

    const parts = s.customRocket.customParts;
    const com = s.customRocket.com || { x: 0, y: 0 };

    ctx.save();
    const scale = (sScale || 1.0) * FLIGHT_SCALE;

    const Z_MAP = { structures: 1, tanks: 2, engines: 3, capsules: 4, aero: 5, solar: 6, rcs: 7, fairings: 9 };
    const sortedParts = [...parts].sort((a, b) => {
        const defA = ROCKET_PARTS_CATALOG[a.partDefId];
        const defB = ROCKET_PARTS_CATALOG[b.partDefId];
        const zA = defA ? (defA.isFairing && a.fairingOpened ? 0 : (Z_MAP[defA.category] || 3)) : 3;
        const zB = defB ? (defB.isFairing && b.fairingOpened ? 0 : (Z_MAP[defB.category] || 3)) : 3;
        return zA - zB;
    });

    for (const p of sortedParts) {
        const def = ROCKET_PARTS_CATALOG[p.partDefId];
        if (!def) continue;

        const sz = getPartSize(p, def);
        const fx = -(p.y - com.y) * scale;
        const fy = (p.x - com.x) * scale;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.scale(scale, scale);
        ctx.rotate(Math.PI / 2 + ((p.rotation || 0) * Math.PI) / 180);
        if (p.flipped) ctx.scale(-1, 1);

        def.draw(ctx, sz.width, sz.height, p);
        ctx.restore();
    }

    // Dibujar transiciones de ancho y carenados interetapa automáticos en vuelo
    ctx.save();
    ctx.scale(scale, scale);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-com.x, -com.y);
    drawWidthTransitions(ctx, parts);
    drawInterstageFairings(ctx, parts);
    ctx.restore();

    ctx.restore();
}

// --- MENÚ CONTEXTUAL Y APERTURA DE COFIAS EN EL MUNDO ABIERTO ---
let activeFairingPartId = null;

function closeFairingActionMenu() {
    activeFairingPartId = null;
    const menu = document.getElementById('fairingActionMenu');
    if (menu) menu.classList.add('hidden');
}

function showFairingActionMenu(part, def, screenX, screenY) {
    const menu = document.getElementById('fairingActionMenu');
    const title = document.getElementById('fairingMenuTitle');
    const btnOpen = document.getElementById('btnFairingOpen');
    const btnClose = document.getElementById('btnFairingMenuClose');
    if (!menu || !title || !btnOpen) return false;

    activeFairingPartId = part.instanceId;
    title.textContent = def ? def.name : 'Cofia Aerodinámica';

    const mx = Math.min(window.innerWidth - 240, Math.max(12, (screenX || window.innerWidth * 0.5) + 14));
    const my = Math.min(window.innerHeight - 150, Math.max(60, (screenY || window.innerHeight * 0.5) - 20));
    menu.style.left = `${mx}px`;
    menu.style.top = `${my}px`;
    menu.classList.remove('hidden');

    btnOpen.onclick = () => {
        const idToOpen = activeFairingPartId;
        closeFairingActionMenu();
        if (idToOpen) deployFairing(idToOpen);
    };
    if (btnClose) btnClose.onclick = () => closeFairingActionMenu();
    return true;
}

function deployFairing(fairingInstanceId) {
    if (typeof ship === 'undefined' || !ship.customRocket || !ship.customRocket.customParts) return false;
    const parts = ship.customRocket.customParts;
    const fairing = parts.find(p => p.instanceId === fairingInstanceId);
    if (!fairing || fairing.fairingOpened) return false;
    const def = ROCKET_PARTS_CATALOG[fairing.partDefId];
    if (!def || !def.isFairing) return false;

    const oldCom = ship.customRocket.com || { x: 0, y: 0 };
    const fuelRatio = ship.maxFuel > 0 ? Math.max(0, Math.min(1, ship.fuel / ship.maxFuel)) : 1;

    // Dejar solo el anillo base en el cohete para mantener la carga útil conectada
    fairing.fairingOpened = true;

    const rotRad = ((fairing.rotation || 0) * Math.PI) / 180;
    const shipCos = Math.cos(ship.angle);
    const shipSin = Math.sin(ship.angle);

    // Desprender las dos mitades de la cofia (izquierda y derecha) hacia los costados
    ['left', 'right'].forEach(side => {
        const sideSign = (side === 'left') ? -1 : 1;
        const halfPart = {
            ...JSON.parse(JSON.stringify(fairing)),
            instanceId: `${fairing.instanceId}_half_${side}`,
            fairingOpened: false,
            fairingHalf: side,
            mirrorId: null
        };
        // Vector lateral en coordenadas del cohete -> mundo
        const localImpX = sideSign * Math.cos(rotRad);
        const localImpY = sideSign * Math.sin(rotRad);
        const flightImpX = -localImpY;
        const flightImpY = localImpX;
        const worldImpX = (shipCos * flightImpX - shipSin * flightImpY) * 42 + shipCos * 12;
        const worldImpY = (shipSin * flightImpX + shipCos * flightImpY) * 42 + shipSin * 12;

        spawnFreeVesselFromParts(
            [halfPart],
            ship.x,
            ship.y,
            ship.vx,
            ship.vy,
            ship.angle,
            oldCom,
            'Mitad de Cofia',
            { x: worldImpX, y: worldImpY }
        );
        const spawned = freeVessels[freeVessels.length - 1];
        if (spawned) spawned.av = sideSign * 1.8;
    });

    const newModel = compileCustomRocketModel(parts, ship.customRocket.name);
    if (newModel) {
        if (typeof ROCKET_MODELS !== 'undefined') ROCKET_MODELS['custom'] = newModel;
        ship.customRocket = newModel;
        if (typeof applyRocketModel === 'function') applyRocketModel(ship, 'custom');
        ship.fuel = Math.min(ship.maxFuel, newModel.fuelCapacity * fuelRatio);
    }

    if (typeof createSmoke === 'function') {
        createSmoke(ship.x, ship.y, 6, 4, [226, 232, 240], 0, 0, 1.3, 20, { cloudType: 'dust', expansionMult: 2.0, alpha: 0.4 });
    }
    if (typeof rocketBuilder !== 'undefined') rocketBuilder.playSnapSound();
    return true;
}

// --- INTERACCIÓN EN VUELO: CLIC EN COFIAS, PANELES SOLARES, PATAS, MOTORES O SEPARADORES ---
function handleCustomRocketPartClick(worldX, worldY, screenX, screenY) {
    if (typeof ship === 'undefined' || !ship.customRocket || !ship.customRocket.customParts) return false;
    const com = ship.customRocket.com || { x: 0, y: 0 };
    const scale = (ship.scale || 1.0) * FLIGHT_SCALE;

    const dx = worldX - ship.x;
    const dy = worldY - ship.y;
    const cosA = Math.cos(-ship.angle);
    const sinA = Math.sin(-ship.angle);
    const localFlightX = dx * cosA - dy * sinA;
    const localFlightY = dx * sinA + dy * cosA;

    const builderX = com.x + localFlightY / scale;
    const builderY = com.y - localFlightX / scale;

    for (let i = ship.customRocket.customParts.length - 1; i >= 0; i--) {
        const p = ship.customRocket.customParts[i];
        const def = ROCKET_PARTS_CATALOG[p.partDefId];
        if (!def) continue;

        const isClosedFairing = !!(def.isFairing && !p.fairingOpened);
        const isDecoupler = (p.partDefId === 'decoupler_vertical' || p.partDefId === 'decoupler_radial' || p.partDefId === 'decoupler_mini' || p.partDefId === 'decoupler_heavy' || p.partDefId === 'decoupler_colossus');
        const isEngine = (def.thrust && def.thrust > 0);
        if (!isClosedFairing && !def.deployable && !isDecoupler && !isEngine) continue;

        const sz = getPartSize(p, def);
        const hitW = sz.width * 0.5 + 10;
        const hitH = sz.height * 0.5 + 10;
        if (Math.abs(builderX - p.x) <= hitW && Math.abs(builderY - p.y) <= hitH) {
            if (isClosedFairing) {
                return showFairingActionMenu(p, def, screenX, screenY);
            }
            if (def.deployable) {
                const nextState = !(p.deployed !== false);
                p.deployed = nextState;
                if (p.mirrorId) {
                    const twin = ship.customRocket.customParts.find(t => t.instanceId === p.mirrorId);
                    if (twin) twin.deployed = nextState;
                }
                if (typeof rocketBuilder !== 'undefined') rocketBuilder.playSnapSound();
                return true;
            }
            if (isDecoupler) {
                return decoupleCustomPart(p.instanceId);
            }
            if (isEngine) {
                p.engineActive = !(p.engineActive !== false);
                if (ship.customRocket.engines) {
                    const eng = ship.customRocket.engines.find(e => e.instanceId === p.instanceId);
                    if (eng) eng.active = p.engineActive;
                }
                if (typeof rocketBuilder !== 'undefined') rocketBuilder.playClickSound();
                return true;
            }
        }
    }
    return false;
}

function toggleAllCustomSolarPanels() {
    if (typeof ship === 'undefined' || !ship.customRocket || !ship.customRocket.customParts) return false;
    const panels = ship.customRocket.customParts.filter(p => ROCKET_PARTS_CATALOG[p.partDefId]?.isSolarPanel);
    if (panels.length === 0) return false;
    const anyClosed = panels.some(p => p.deployed === false);
    panels.forEach(p => { p.deployed = anyClosed; });
    if (typeof rocketBuilder !== 'undefined') rocketBuilder.playSnapSound();
    return true;
}

function setupGlobalRocketBuilderTriggers() {
    const btnOpenHome = document.getElementById('btnOpenRocketBuilder');
    if (btnOpenHome) btnOpenHome.addEventListener('click', () => openRocketBuilder());

    const btnOpenHUD = document.getElementById('btnOpenBuilderHUD');
    if (btnOpenHUD) btnOpenHUD.addEventListener('click', () => openRocketBuilder());

    const btnOpenHangar = document.getElementById('btnHangarOpenBuilder');
    if (btnOpenHangar) {
        btnOpenHangar.addEventListener('click', () => {
            if (typeof closeRocketHangarModal === 'function') closeRocketHangarModal();
            openRocketBuilder();
        });
    }

    const btnStage = document.getElementById('btnStageSeparate');
    if (btnStage) {
        btnStage.addEventListener('click', () => stageNextDecoupler());
    }

    const btnFvClose = document.getElementById('btnFvClose');
    if (btnFvClose) btnFvClose.addEventListener('click', () => closeFreeVesselMenu());

    const btnFvCtrl = document.getElementById('btnFvControl');
    if (btnFvCtrl) {
        btnFvCtrl.addEventListener('click', () => {
            if (activeFreeVesselMenuId) switchControlToVessel(activeFreeVesselMenuId);
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGlobalRocketBuilderTriggers);
} else {
    setupGlobalRocketBuilderTriggers();
}
