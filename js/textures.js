// ============================================================================
// ÉTER — MOTOR DE TEXTURAS PROCEDURALES Y MAPAS PLANETARIOS ESFÉRICOS 3D
// 1. VisualTextures: Patrones tileables sin costuras (ruido toroidal FBM/Worley)
//    para relieve táctil en primer plano (roca, dunas, hielo, basalto, cristal).
// 2. PlanetSurfaceBake: Proyección esférica 3D pre-renderizada por planeta
//    con relieve analítico (bump-shading), oclusión ambiental y emisión nocturna
//    para las 9 clases planetarias y todos sus arquetipos.
// ============================================================================

const ProceduralNoise = (function () {
    function hash2P(ix, iy, period, seed) {
        const px = ((ix % period) + period) % period;
        const py = ((iy % period) + period) % period;
        let n = Math.imul(px, 374761393) + Math.imul(py, 668265263) + Math.imul(seed | 0, 1597334677);
        n = (n ^ (n >>> 13)) | 0;
        n = Math.imul(n, 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    function valueNoise2P(x, y, period, seed) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);

        const a = hash2P(ix, iy, period, seed);
        const b = hash2P(ix + 1, iy, period, seed);
        const c = hash2P(ix, iy + 1, period, seed);
        const d = hash2P(ix + 1, iy + 1, period, seed);

        return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    }

    function fbm2P(u, v, basePeriod, octaves, seed) {
        let sum = 0;
        let amp = 0.5;
        let norm = 0;
        let freq = basePeriod;
        for (let o = 0; o < octaves; o++) {
            sum += valueNoise2P(u * freq, v * freq, freq, seed + o * 101) * amp;
            norm += amp;
            amp *= 0.5;
            freq *= 2;
        }
        return sum / norm;
    }

    function worley2P(u, v, period, seed) {
        const x = u * period;
        const y = v * period;
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        let d1 = 99;
        let d2 = 99;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = ix + dx;
                const cy = iy + dy;
                const px = cx + 0.15 + 0.70 * hash2P(cx, cy, period, seed);
                const py = cy + 0.15 + 0.70 * hash2P(cx, cy, period, seed + 7919);
                const dist = Math.hypot(px - x, py - y);
                if (dist < d1) {
                    d2 = d1;
                    d1 = dist;
                } else if (dist < d2) {
                    d2 = dist;
                }
            }
        }
        return { f1: d1, f2: d2 };
    }

    function hash3(ix, iy, iz, seed) {
        let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 1274126177) + Math.imul(seed | 0, 1597334677);
        n = (n ^ (n >>> 13)) | 0;
        n = Math.imul(n, 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    function noise3(x, y, z, seed) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const iz = Math.floor(z);
        const fx = x - ix;
        const fy = y - iy;
        const fz = z - iz;
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        const uz = fz * fz * (3 - 2 * fz);

        const c000 = hash3(ix, iy, iz, seed);
        const c100 = hash3(ix + 1, iy, iz, seed);
        const c010 = hash3(ix, iy + 1, iz, seed);
        const c110 = hash3(ix + 1, iy + 1, iz, seed);
        const c001 = hash3(ix, iy, iz + 1, seed);
        const c101 = hash3(ix + 1, iy, iz + 1, seed);
        const c011 = hash3(ix, iy + 1, iz + 1, seed);
        const c111 = hash3(ix + 1, iy + 1, iz + 1, seed);

        const x00 = c000 + (c100 - c000) * ux;
        const x10 = c010 + (c110 - c010) * ux;
        const x01 = c001 + (c101 - c001) * ux;
        const x11 = c011 + (c111 - c011) * ux;

        const y0 = x00 + (x10 - x00) * uy;
        const y1 = x01 + (x11 - x01) * uy;

        return y0 + (y1 - y0) * uz;
    }

    function fbm3(x, y, z, octaves, seed) {
        let sum = 0;
        let amp = 0.5;
        let norm = 0;
        let f = 1;
        for (let o = 0; o < octaves; o++) {
            sum += noise3(x * f, y * f, z * f, seed + o * 131) * amp;
            norm += amp;
            amp *= 0.5;
            f *= 2.03;
        }
        return sum / norm;
    }

    function ridged3(x, y, z, octaves, seed) {
        let sum = 0;
        let amp = 0.5;
        let norm = 0;
        let f = 1;
        for (let o = 0; o < octaves; o++) {
            const n = noise3(x * f, y * f, z * f, seed + o * 173);
            const r = 1 - Math.abs(n * 2 - 1);
            sum += r * r * amp;
            norm += amp;
            amp *= 0.5;
            f *= 2.07;
        }
        return sum / norm;
    }

    function worley3(x, y, z, seed) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const iz = Math.floor(z);
        let d1 = 99;
        let d2 = 99;
        for (let dz = -1; dz <= 1; dz++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const cx = ix + dx;
                    const cy = iy + dy;
                    const cz = iz + dz;
                    const px = cx + 0.12 + 0.76 * hash3(cx, cy, cz, seed);
                    const py = cy + 0.12 + 0.76 * hash3(cx, cy, cz, seed + 3119);
                    const pz = cz + 0.12 + 0.76 * hash3(cx, cy, cz, seed + 7919);
                    const ddx = px - x;
                    const ddy = py - y;
                    const ddz = pz - z;
                    const distSq = ddx * ddx + ddy * ddy + ddz * ddz;
                    if (distSq < d1) {
                        d2 = d1;
                        d1 = distSq;
                    } else if (distSq < d2) {
                        d2 = distSq;
                    }
                }
            }
        }
        return { f1: Math.sqrt(d1), f2: Math.sqrt(d2) };
    }

    return {
        hash2P,
        fbm2P,
        worley2P,
        noise3,
        fbm3,
        ridged3,
        worley3
    };
})();

const VisualTextures = (function () {
    const cache = {};
    let initialized = false;

    function createCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    // 1. Grano Mineral, Estratos Sedimentarios y Porosidad Basáltica (Sin costuras)
    function buildRockGrain() {
        const size = 256;
        const c = createCanvas(size, size);
        const g = c.getContext('2d');
        const img = g.createImageData(size, size);
        const d = img.data;

        for (let y = 0; y < size; y++) {
            const v = y / size;
            for (let x = 0; x < size; x++) {
                const u = x / size;
                const warp = ProceduralNoise.fbm2P(u, v, 4, 2, 101) * 0.08;
                const strata = Math.sin((v + warp) * Math.PI * 10) * 0.16;
                const fbm = ProceduralNoise.fbm2P(u, v, 8, 4, 1047);
                const grit = ProceduralNoise.fbm2P(u, v, 32, 2, 3319);
                const w = ProceduralNoise.worley2P(u, v, 10, 557);
                const pit = Math.max(0, 1 - w.f1 * 3.5) * 0.15;

                const lum = 128 + (fbm - 0.5) * 95 + (grit - 0.5) * 42 + strata * 50 - pit * 60;
                const val = Math.max(0, Math.min(255, lum));
                const idx = (y * size + x) * 4;
                d[idx] = val;
                d[idx + 1] = val;
                d[idx + 2] = val;
                d[idx + 3] = 48;
            }
        }
        g.putImageData(img, 0, 0);
        return c;
    }

    // 2. Ondulaciones de Dunas Eólicas con Cresta Iluminada y Valle en Sombra
    function buildSandRipples() {
        const size = 256;
        const c = createCanvas(size, size);
        const g = c.getContext('2d');
        const img = g.createImageData(size, size);
        const d = img.data;

        for (let y = 0; y < size; y++) {
            const v = y / size;
            for (let x = 0; x < size; x++) {
                const u = x / size;
                const warp = ProceduralNoise.fbm2P(u, v, 4, 3, 8821);
                const phase = (v * 14 + u * 2 + warp * 2.6) * Math.PI * 2;
                // Onda asimétrica de duna (pendiente suave a barlovento, cresta nítida a sotavento)
                const ripple = Math.sin(phase) + 0.32 * Math.sin(phase * 2 - 0.6);
                const grain = ProceduralNoise.fbm2P(u, v, 32, 2, 4421);

                const lum = 128 + ripple * 36 + (grain - 0.5) * 24;
                const val = Math.max(0, Math.min(255, lum));
                const idx = (y * size + x) * 4;
                d[idx] = Math.min(255, val + 6);
                d[idx + 1] = val;
                d[idx + 2] = Math.max(0, val - 8);
                d[idx + 3] = 46;
            }
        }
        g.putImageData(img, 0, 0);
        return c;
    }

    // 3. Facetas Glaciares, Fracturas de Hielo y Escarcha Cristalina
    function buildIceFacets() {
        const size = 256;
        const c = createCanvas(size, size);
        const g = c.getContext('2d');
        const img = g.createImageData(size, size);
        const d = img.data;

        for (let y = 0; y < size; y++) {
            const v = y / size;
            for (let x = 0; x < size; x++) {
                const u = x / size;
                const w = ProceduralNoise.worley2P(u, v, 7, 4491);
                const edge = Math.exp(-Math.pow((w.f2 - w.f1) * 14, 2));
                const frost = ProceduralNoise.fbm2P(u, v, 12, 3, 9127);

                const base = 124 + (frost - 0.5) * 54;
                const crack = edge * 75;
                const idx = (y * size + x) * 4;
                d[idx] = Math.max(0, Math.min(255, base - crack * 0.4));
                d[idx + 1] = Math.max(0, Math.min(255, base + crack * 0.35));
                d[idx + 2] = Math.max(0, Math.min(255, base + crack * 0.9));
                d[idx + 3] = 52;
            }
        }
        g.putImageData(img, 0, 0);
        return c;
    }

    // 4. Placas Basálticas y Fisuras Volcánicas
    function buildVolcanicCracks() {
        const size = 256;
        const c = createCanvas(size, size);
        const g = c.getContext('2d');
        const img = g.createImageData(size, size);
        const d = img.data;

        for (let y = 0; y < size; y++) {
            const v = y / size;
            for (let x = 0; x < size; x++) {
                const u = x / size;
                const warp = ProceduralNoise.fbm2P(u, v, 6, 2, 7199) * 0.05;
                const w = ProceduralNoise.worley2P(u + warp, v - warp, 6, 7199);
                const fissure = Math.exp(-Math.pow((w.f2 - w.f1) * 15, 2));
                const basalt = ProceduralNoise.fbm2P(u, v, 16, 3, 5511);

                const lum = 122 + (basalt - 0.5) * 65;
                const idx = (y * size + x) * 4;
                d[idx] = Math.max(0, Math.min(255, lum + fissure * 95));
                d[idx + 1] = Math.max(0, Math.min(255, lum - fissure * 25));
                d[idx + 2] = Math.max(0, Math.min(255, lum - fissure * 75));
                d[idx + 3] = 56;
            }
        }
        g.putImageData(img, 0, 0);
        return c;
    }

    // 5. Facetas Geométricas de Cristal y Bismuto
    function buildCrystalFacets() {
        const size = 256;
        const c = createCanvas(size, size);
        const g = c.getContext('2d');
        const img = g.createImageData(size, size);
        const d = img.data;

        for (let y = 0; y < size; y++) {
            const v = y / size;
            for (let x = 0; x < size; x++) {
                const u = x / size;
                const w = ProceduralNoise.worley2P(u, v, 8, 2293);
                const facetShade = (w.f2 - w.f1) * 140;
                const ridge = Math.exp(-Math.pow((w.f2 - w.f1) * 18, 2)) * 85;
                const val = Math.max(0, Math.min(255, 95 + facetShade + ridge));
                const idx = (y * size + x) * 4;
                d[idx] = val;
                d[idx + 1] = Math.min(255, val + 12);
                d[idx + 2] = Math.min(255, val + 24);
                d[idx + 3] = 48;
            }
        }
        g.putImageData(img, 0, 0);
        return c;
    }

    // 6. Vetas Tóxicas / Corrosivas y Orgánicas
    function buildToxicSwirl() {
        const size = 256;
        const c = createCanvas(size, size);
        const g = c.getContext('2d');
        const img = g.createImageData(size, size);
        const d = img.data;

        for (let y = 0; y < size; y++) {
            const v = y / size;
            for (let x = 0; x < size; x++) {
                const u = x / size;
                const w1 = ProceduralNoise.fbm2P(u, v, 6, 3, 6113);
                const w2 = ProceduralNoise.fbm2P(u + w1 * 0.25, v - w1 * 0.25, 10, 3, 6199);
                const val = Math.max(0, Math.min(255, 110 + (w2 - 0.5) * 130));
                const idx = (y * size + x) * 4;
                d[idx] = val;
                d[idx + 1] = Math.min(255, val + 18);
                d[idx + 2] = val;
                d[idx + 3] = 44;
            }
        }
        g.putImageData(img, 0, 0);
        return c;
    }

    // 7. Grano Fílmico / Dither Anti-Banding
    function buildFilmGrain() {
        const size = 192;
        const c = createCanvas(size, size);
        const g = c.getContext('2d');
        const img = g.createImageData(size, size);
        const d = img.data;
        let s = 99371;
        for (let i = 0; i < d.length; i += 4) {
            s = (Math.imul(s, 1664525) + 1013904223) | 0;
            const r = ((s >>> 16) & 255);
            const v = r > 127 ? 255 : 0;
            d[i] = v;
            d[i + 1] = v;
            d[i + 2] = v;
            d[i + 3] = (r % 9);
        }
        g.putImageData(img, 0, 0);
        return c;
    }

    function ensureInit(ctx) {
        if (initialized || !ctx) return;
        initialized = true;
        cache.rockCanvas = buildRockGrain();
        cache.sandCanvas = buildSandRipples();
        cache.iceCanvas = buildIceFacets();
        cache.volcanicCanvas = buildVolcanicCracks();
        cache.crystalCanvas = buildCrystalFacets();
        cache.toxicCanvas = buildToxicSwirl();
        cache.filmCanvas = buildFilmGrain();

        cache.rockPattern = ctx.createPattern(cache.rockCanvas, 'repeat');
        cache.sandPattern = ctx.createPattern(cache.sandCanvas, 'repeat');
        cache.icePattern = ctx.createPattern(cache.iceCanvas, 'repeat');
        cache.volcanicPattern = ctx.createPattern(cache.volcanicCanvas, 'repeat');
        cache.crystalPattern = ctx.createPattern(cache.crystalCanvas, 'repeat');
        cache.toxicPattern = ctx.createPattern(cache.toxicCanvas, 'repeat');
        cache.filmPattern = ctx.createPattern(cache.filmCanvas, 'repeat');
    }

    return {
        getPattern(ctx, kind) {
            ensureInit(ctx);
            switch (kind) {
                case 'sand': return cache.sandPattern;
                case 'ice': return cache.icePattern;
                case 'volcanic': return cache.volcanicPattern;
                case 'crystal': return cache.crystalPattern;
                case 'toxic': return cache.toxicPattern;
                case 'film': return cache.filmPattern;
                case 'rock':
                default:
                    return cache.rockPattern;
            }
        },
        getForArchetype(ctx, arch) {
            ensureInit(ctx);
            if (!arch) return cache.rockPattern;
            const id = arch.id || '';
            const cls = arch.classId || '';
            if (cls === 'desert' || id.includes('dune') || id.includes('canyon') || id.includes('salt')) return cache.sandPattern;
            if (cls === 'cryogenic' || id.includes('ice') || id.includes('methane') || id.includes('nitrogen')) return cache.icePattern;
            if (cls === 'volcanic' || id.includes('magma') || id.includes('caldera') || id.includes('sulfur') || id.includes('obsidian')) return cache.volcanicPattern;
            if (cls === 'crystalline' || id.includes('crystal') || id.includes('bismuth') || id.includes('amethyst')) return cache.crystalPattern;
            if (cls === 'toxic' || cls === 'anomaly' || id.includes('uraninite') || id.includes('acid') || id.includes('chlorine')) return cache.toxicPattern;
            return cache.rockPattern;
        }
    };
})();

// ============================================================================
// GENERADOR DE SUPERFICIES ESFÉRICAS 3D PRE-RENDERIZADAS (CACHED PER PLANET)
// ============================================================================
const PlanetSurfaceBake = (function () {
    let bakedThisFrame = 0;

    function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
    function smooth(e0, e1, x) {
        const t = clamp01((x - e0) / (e1 - e0));
        return t * t * (3 - 2 * t);
    }
    function mixRGB(c1, c2, t) {
        const k = clamp01(t);
        return [
            c1[0] + (c2[0] - c1[0]) * k,
            c1[1] + (c2[1] - c1[1]) * k,
            c1[2] + (c2[2] - c1[2]) * k
        ];
    }

    function bakePlanet(p) {
        const arch = p.archetype || {};
        const colors = p.colors || {};
        const id = arch.id || '';
        const cls = arch.classId || 'terrestrial';

        const litCol = colors.litColor || arch.litColor || [140, 160, 180];
        const crustCol = colors.crustColor || arch.crustColor || [70, 85, 100];
        const coreCol = colors.coreColor || arch.coreColor || [30, 38, 48];
        const rimCol = colors.rimColor || arch.rimColor || [220, 235, 250];
        const accentCol = colors.accentColor || arch.accentColor || rimCol;
        const topsoilCol = colors.topsoilColor || arch.topsoilColor || litCol;
        const sunsetCol = colors.sunsetRGB || arch.sunsetRGB || [251, 146, 60];

        const isGas = (id.includes('gas') || id.includes('saturn') || id.includes('neptune') || id === 'titan_gas_dense' || id === 'storm_titan');
        const isShattered = (cls === 'shattered');
        const isMegalithic = (cls === 'megalithic');
        const isLiving = (cls === 'living');
        const isCometary = (cls === 'cometary');
        const isGravitic = (cls === 'gravitic');
        const isArtificial = (cls === 'artificial');
        const isTemporal = (cls === 'temporal');
        const isEyeball = !!(arch.isEyeballWorld || p.isEyeballWorld);
        const isVolcanic = (cls === 'volcanic' || id.includes('magma') || id.includes('caldera') || id.includes('sulfur') || id.includes('obsidian'));
        const isCryo = (cls === 'cryogenic' || id.includes('ice') || id.includes('methane') || id.includes('nitrogen'));
        const isDesert = (cls === 'desert' || id.includes('dune') || id.includes('canyon') || id.includes('salt') || id.includes('glass'));
        const isCrystalline = (cls === 'crystalline' || id.includes('crystal') || id.includes('bismuth') || id.includes('amethyst') || id.includes('metallic'));
        const isOceanic = (cls === 'oceanic' || id.includes('ocean') || id.includes('biolume') || id.includes('acid'));
        const isToxic = (cls === 'toxic' || id.includes('uraninite') || id.includes('chlorine'));
        const isHollowOrAnomaly = (cls === 'hollow' || p.isHollow || cls === 'anomaly' || id.includes('hollow') || id.includes('monolith') || id.includes('crater'));
        const isTerrestrial = (cls === 'terrestrial' || (!isGas && !isShattered && !isMegalithic && !isLiving && !isCometary && !isGravitic && !isArtificial && !isTemporal && !isVolcanic && !isCryo && !isDesert && !isCrystalline && !isOceanic && !isToxic && !isHollowOrAnomaly));

        const hasEmissive = isVolcanic || isShattered || isMegalithic || isLiving || isCometary || isGravitic || isArtificial || isTemporal || id.includes('biolume') || id.includes('phosphor') || id.includes('toxic') || isCrystalline || cls === 'anomaly' || cls === 'hollow' || !!p.isHollow;

        // Resolución óptima según tamaño del planeta (360px - 440px ofrece gran nitidez y ~15ms de bake único)
        const size = p.radius > 2800 ? 440 : (p.radius < 1500 ? 340 : 384);
        const half = size * 0.5;
        const invR = 1 / (half - 2);

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const g = canvas.getContext('2d');
        const img = g.createImageData(size, size);
        const data = img.data;

        let emCanvas = null;
        let emG = null;
        let emImg = null;
        let emData = null;
        if (hasEmissive) {
            emCanvas = document.createElement('canvas');
            emCanvas.width = size;
            emCanvas.height = size;
            emG = emCanvas.getContext('2d');
            emImg = emG.createImageData(size, size);
            emData = emImg.data;
        }

        const seedNum = Math.floor((p.surfaceSeed || 0.42) * 99991) + 17;
        const rot = p.initialRotationPhase || 0;
        const cosRot = Math.cos(rot);
        const sinRot = Math.sin(rot);
        const tilt = p.ringTilt ? p.ringTilt * 0.45 : 0.14;
        const cosTilt = Math.cos(tilt);
        const sinTilt = Math.sin(tilt);

        // Precalcular cráteres para mundos rocosos/lunares/metálicos
        const useCraters = id.includes('crater') || id.includes('micro') || id.includes('metallic') || id.includes('monolith') || cls === 'hollow';
        const craters = [];
        if (useCraters) {
            let cs = seedNum + 511;
            for (let c = 0; c < 18; c++) {
                cs = (Math.imul(cs, 1664525) + 1013904223) | 0;
                const a1 = ((cs >>> 0) / 4294967296) * Math.PI * 2;
                cs = (Math.imul(cs, 1664525) + 1013904223) | 0;
                const zc = (((cs >>> 0) / 4294967296) * 2 - 1) * 0.85;
                const rc = Math.sqrt(Math.max(0, 1 - zc * zc));
                cs = (Math.imul(cs, 1664525) + 1013904223) | 0;
                const rad = 0.09 + ((cs >>> 0) / 4294967296) * 0.22;
                craters.push({ x: Math.cos(a1) * rc, y: zc, z: Math.sin(a1) * rc, r: rad });
            }
        }

        const prevRowLuma = new Float32Array(size);
        for (let py = 0; py < size; py++) {
            const dy = (py - half + 0.5) * invR;
            const dy2 = dy * dy;
            let prevLuma = 0;
            let rowHasPrev = false;
            for (let px = 0; px < size; px++) {
                const dx = (px - half + 0.5) * invR;
                const r2 = dx * dx + dy2;
                if (r2 > 1.0) { rowHasPrev = false; prevRowLuma[px] = 0; continue; }

                const nz0 = Math.sqrt(1.0 - r2);
                // Rotar por inclinación axial (Z) y fase de rotación (Y)
                const tx = dx * cosTilt - dy * sinTilt;
                const ty = dx * sinTilt + dy * cosTilt;
                const nx = tx * cosRot + nz0 * sinRot;
                const ny = ty;
                const nz = -tx * sinRot + nz0 * cosRot;

                // Oclusión ambiental esférica suave hacia el limbo
                const limbAO = 0.62 + 0.38 * Math.pow(nz0, 0.45);
                const lat = Math.abs(ny);

                let r = litCol[0], gr = litCol[1], b = litCol[2];
                let er = 0, eg = 0, eb = 0, ea = 0;

                if (isGas) {
                    // === GIGANTES GASEOSOS: BANDAS ZONALES, TURBULENCIA KELVIN-HELMHOLTZ Y TORMENTAS ===
                    const turb = ProceduralNoise.fbm3(nx * 2.4, ny * 3.8, nz * 2.4, 4, seedNum);
                    const fineTurb = ProceduralNoise.fbm3(nx * 7.5 + turb, ny * 11.0, nz * 7.5, 3, seedNum + 41);
                    const bandCoord = ny * 7.5 + (turb - 0.5) * 1.65 + (fineTurb - 0.5) * 0.38;
                    const bandWave = Math.sin(bandCoord * Math.PI);
                    const subBand = Math.cos(bandCoord * Math.PI * 2.3 + 0.8);

                    let col = mixRGB(crustCol, litCol, 0.5 + 0.5 * bandWave);
                    col = mixRGB(col, topsoilCol, 0.32 * (0.5 + 0.5 * subBand));
                    col = mixRGB(col, rimCol, Math.max(0, fineTurb - 0.55) * 0.65);

                    // Gran Mancha Ciclónica Ovalada
                    const sdx = (nx - 0.25) * 1.4;
                    const sdy = (ny + 0.28) * 2.6;
                    const sdz = nz - 0.82;
                    const stormDist = Math.sqrt(sdx * sdx + sdy * sdy + sdz * sdz);
                    if (stormDist < 0.45 && nz > 0.2) {
                        const swirl = ProceduralNoise.fbm3(nx * 10, ny * 10, nz * 10, 3, seedNum + 99);
                        const stormT = smooth(0.45, 0.05, stormDist);
                        const stormCol = mixRGB(accentCol, sunsetCol, swirl * 0.7);
                        col = mixRGB(col, stormCol, stormT * 0.88);
                    }

                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isTerrestrial) {
                    // === TELÚRICOS: CONTINENTES FRACTALES, ARRECIFES, CORDILLERAS CON RELIEVE Y NUBES ===
                    const warp = ProceduralNoise.fbm3(nx * 1.9, ny * 1.9, nz * 1.9, 3, seedNum + 7) * 0.42;
                    const elev = ProceduralNoise.fbm3(nx * 2.3 + warp, ny * 2.3 - warp, nz * 2.3 + warp * 0.5, 5, seedNum);
                    const ridge = ProceduralNoise.ridged3(nx * 4.5 + warp, ny * 4.5, nz * 4.5, 4, seedNum + 33);
                    const seaLevel = 0.48;

                    let col;
                    if (elev < seaLevel) {
                        // Océano con batimetría y plataforma continental turquesa
                        const depth = clamp01((seaLevel - elev) / 0.28);
                        const shelf = smooth(0.22, 0.0, depth);
                        const oceanDeep = mixRGB(coreCol, [12, 42, 82], 0.45);
                        const oceanMid = mixRGB(crustCol, [24, 92, 138], 0.55);
                        col = mixRGB(oceanMid, oceanDeep, depth);
                        col = mixRGB(col, accentCol, shelf * 0.55);
                    } else {
                        // Continente: costa -> llanura -> bosque/meseta -> cordillera alpina -> nieve
                        const landH = clamp01((elev - seaLevel) / 0.36);
                        const mtn = landH * 0.65 + ridge * 0.45;
                        const detail = ProceduralNoise.fbm3(nx * 12, ny * 12, nz * 12, 2, seedNum + 77);
                        // Relieve analítico (sombreado de crestas vs valles)
                        const reliefShade = 0.78 + 0.44 * clamp01(ridge * 0.85 + (detail - 0.3) * 0.5);

                        col = mixRGB(topsoilCol, litCol, smooth(0.05, 0.45, landH));
                        col = mixRGB(col, crustCol, smooth(0.45, 0.82, mtn));
                        col = mixRGB(col, [242, 248, 255], smooth(0.76, 0.96, mtn));
                        col = [col[0] * reliefShade, col[1] * reliefShade, col[2] * reliefShade];
                    }

                    // Casquetes polares orgánicos modulados por ruido
                    const polarLine = 0.76 + (elev - 0.5) * 0.18;
                    const polarT = smooth(polarLine, polarLine + 0.12, lat);
                    col = mixRGB(col, [245, 250, 255], polarT * 0.92);

                    // Velos nubosos atmosféricos sutiles
                    const cloudW = ProceduralNoise.fbm3(nx * 3.1 + 1.4, ny * 4.2, nz * 3.1, 4, seedNum + 211);
                    const cloudT = smooth(0.56, 0.78, cloudW) * 0.42;
                    col = mixRGB(col, [255, 255, 255], cloudT);

                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isOceanic) {
                    // === OCEÁNICOS: BATIMETRÍA ABISAL, ATOLONES Y CORRIENTES BIOLUMINISCENTES ===
                    const curr = ProceduralNoise.fbm3(nx * 2.6, ny * 3.2, nz * 2.6, 4, seedNum);
                    const swirl = ProceduralNoise.fbm3(nx * 4.5 + curr * 0.8, ny * 4.5, nz * 4.5 - curr * 0.6, 4, seedNum + 19);
                    const ridge = ProceduralNoise.ridged3(nx * 3.8, ny * 3.8, nz * 3.8, 3, seedNum + 61);

                    let col = mixRGB(coreCol, crustCol, swirl);
                    col = mixRGB(col, litCol, smooth(0.45, 0.78, curr) * 0.65);

                    // Islas volcánicas / arrecifes dispersos
                    const islandT = smooth(0.72, 0.82, ridge * 0.6 + curr * 0.45);
                    col = mixRGB(col, accentCol, smooth(0.65, 0.74, ridge * 0.6 + curr * 0.45) * 0.5);
                    col = mixRGB(col, topsoilCol, islandT * 0.95);

                    if (id.includes('biolume') || id.includes('phosphor')) {
                        const bio = smooth(0.58, 0.78, swirl);
                        er = accentCol[0]; eg = accentCol[1]; eb = accentCol[2];
                        ea = bio * 220;
                    }
                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isDesert) {
                    // === DESIERTOS: DUNAS EÓLICAS, CAÑONES ESTRATIFICADOS Y SALARES POLIGONALES ===
                    const warp = ProceduralNoise.fbm3(nx * 2.5, ny * 2.5, nz * 2.5, 3, seedNum);
                    if (id.includes('salt')) {
                        const w = ProceduralNoise.worley3(nx * 6.5 + warp * 0.3, ny * 6.5, nz * 6.5, seedNum);
                        const crack = Math.exp(-Math.pow((w.f2 - w.f1) * 14, 2));
                        const base = mixRGB(litCol, rimCol, 0.3 + 0.4 * warp);
                        const col = mixRGB(base, coreCol, crack * 0.55);
                        r = col[0]; gr = col[1]; b = col[2];
                    } else {
                        const duneWave = Math.sin((nx * 14 + nz * 10 + warp * 5.5) * Math.PI);
                        const canyon = ProceduralNoise.ridged3(nx * 3.2 + warp * 0.4, ny * 3.2, nz * 3.2, 4, seedNum + 47);
                        const canyonCut = smooth(0.68, 0.86, canyon);
                        let col = mixRGB(crustCol, topsoilCol, 0.5 + 0.5 * duneWave);
                        col = mixRGB(col, litCol, smooth(0.35, 0.85, duneWave) * 0.65);
                        col = mixRGB(col, coreCol, canyonCut * 0.75);
                        col = mixRGB(col, sunsetCol, smooth(0.62, 0.72, canyon) * (1 - canyonCut) * 0.5);
                        r = col[0]; gr = col[1]; b = col[2];
                    }

                } else if (isCryo) {
                    // === CRIOGÉNICOS: BANQUISAS DE HIELO Y FRACTURAS "TIGER STRIPES" ===
                    const warp = ProceduralNoise.fbm3(nx * 2.8, ny * 2.8, nz * 2.8, 3, seedNum) * 0.35;
                    const w = ProceduralNoise.worley3(nx * 4.2 + warp, ny * 4.2 - warp, nz * 4.2, seedNum);
                    const stripe = Math.exp(-Math.pow((w.f2 - w.f1) * 16, 2));
                    const frost = ProceduralNoise.fbm3(nx * 7.5, ny * 7.5, nz * 7.5, 4, seedNum + 83);

                    let col = mixRGB(crustCol, litCol, frost);
                    col = mixRGB(col, [240, 249, 255], smooth(0.58, 0.85, frost) * 0.6);
                    col = mixRGB(col, accentCol, stripe * 0.85);
                    col = mixRGB(col, [255, 255, 255], Math.pow(stripe, 2.5) * 0.6);
                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isVolcanic) {
                    // === VOLCÁNICOS: PLACAS BASÁLTICAS WORLEY Y FISURAS DE MAGMA INCANDESCENTE ===
                    const warp = ProceduralNoise.fbm3(nx * 3.0, ny * 3.0, nz * 3.0, 3, seedNum) * 0.35;
                    const w = ProceduralNoise.worley3(nx * 4.5 + warp, ny * 4.5 - warp, nz * 4.5 + warp, seedNum);
                    const lavaCrack = Math.exp(-Math.pow((w.f2 - w.f1) * 14, 2));
                    const basalt = ProceduralNoise.fbm3(nx * 8.0, ny * 8.0, nz * 8.0, 4, seedNum + 29);

                    let col = mixRGB(coreCol, crustCol, basalt);
                    if (id.includes('sulfur')) {
                        col = mixRGB(col, topsoilCol, smooth(0.5, 0.8, basalt) * 0.7);
                    }
                    const lavaGlow = clamp01(lavaCrack * 1.15);
                    const lavaCol = mixRGB(accentCol, [254, 240, 138], lavaGlow * lavaGlow);
                    col = mixRGB(col, lavaCol, lavaGlow * 0.92);

                    er = lavaCol[0]; eg = lavaCol[1]; eb = lavaCol[2];
                    ea = lavaGlow * 245;

                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isCrystalline) {
                    // === CRISTALINOS / METÁLICOS: FACETAS ANGULARES Y TERRAZAS DE BISMUTO ===
                    const w = ProceduralNoise.worley3(nx * 5.2, ny * 5.2, nz * 5.2, seedNum);
                    const facet = clamp01((w.f2 - w.f1) * 2.2);
                    const edge = Math.exp(-Math.pow((w.f2 - w.f1) * 18, 2));
                    let col = mixRGB(crustCol, litCol, facet);
                    col = mixRGB(col, accentCol, smooth(0.2, 0.8, w.f1) * 0.55);
                    col = mixRGB(col, rimCol, edge * 0.85);

                    er = accentCol[0]; eg = accentCol[1]; eb = accentCol[2];
                    ea = edge * 140;

                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isToxic) {
                    // === TÓXICOS / RADIACTIVOS: TORMENTAS DENSAS Y VETAS DE URANINITA ===
                    const swirl = ProceduralNoise.fbm3(nx * 3.4, ny * 4.0, nz * 3.4, 4, seedNum);
                    const veins = ProceduralNoise.ridged3(nx * 5.0 + swirl * 0.4, ny * 5.0, nz * 5.0, 3, seedNum + 91);
                    const veinGlow = smooth(0.68, 0.90, veins);

                    let col = mixRGB(coreCol, crustCol, swirl);
                    col = mixRGB(col, litCol, smooth(0.45, 0.8, swirl) * 0.7);
                    col = mixRGB(col, accentCol, veinGlow * 0.85);

                    er = accentCol[0]; eg = accentCol[1]; eb = accentCol[2];
                    ea = veinGlow * 210;

                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isShattered) {
                    // === MUNDOS FRAGMENTADOS (Placas tectónicas separadas por grietas de energía) ===
                    const plate = ProceduralNoise.fbm3(nx * 2.8, ny * 2.8, nz * 2.8, 4, seedNum);
                    const crack = ProceduralNoise.ridged3(nx * 4.8, ny * 4.8, nz * 4.8, 3, seedNum + 33);
                    const fissure = smooth(0.68, 0.90, crack);
                    let col = mixRGB(coreCol, crustCol, smooth(0.2, 0.8, plate));
                    col = mixRGB(col, litCol, smooth(0.55, 0.85, plate) * 0.75);
                    col = mixRGB(col, accentCol, fissure * 0.95);
                    er = accentCol[0]; eg = accentCol[1]; eb = accentCol[2];
                    ea = fissure * 225;
                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isMegalithic) {
                    // === ARQUEOLOGÍA MEGALÍTICA (Bóvedas geométricas, placas y circuitos rúnicos) ===
                    const gx = Math.abs(Math.sin(nx * 10.5 + ny * 2.5));
                    const gy = Math.abs(Math.cos(ny * 10.5 - nz * 2.5));
                    const gridLine = smooth(0.92, 0.99, Math.max(gx, gy));
                    const stepTerrace = Math.floor(ProceduralNoise.fbm3(nx * 3.0, ny * 3.0, nz * 3.0, 3, seedNum) * 5.0) / 5.0;
                    let col = mixRGB(coreCol, litCol, 0.25 + stepTerrace * 0.65);
                    col = mixRGB(col, rimCol, gridLine * 0.55);
                    const glyphMask = gridLine * smooth(0.45, 0.75, ProceduralNoise.fbm3(nx * 6.0, ny * 6.0, nz * 6.0, 2, seedNum + 91));
                    er = accentCol[0]; eg = accentCol[1]; eb = accentCol[2];
                    ea = glyphMask * 210;
                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isLiving) {
                    // === SUPERORGANISMOS VIVOS (Arrecifes, venas miceliales pulsantes y esporas) ===
                    const dome = ProceduralNoise.fbm3(nx * 3.6, ny * 3.6, nz * 3.6, 4, seedNum);
                    const vein = ProceduralNoise.ridged3(nx * 5.4, ny * 5.4, nz * 5.4, 3, seedNum + 47);
                    const netGlow = smooth(0.66, 0.92, vein);
                    let col = mixRGB(crustCol, topsoilCol, smooth(0.25, 0.78, dome));
                    col = mixRGB(col, litCol, smooth(0.58, 0.88, dome) * 0.6);
                    col = mixRGB(col, accentCol, netGlow * 0.85);
                    er = accentCol[0]; eg = accentCol[1]; eb = accentCol[2];
                    ea = netGlow * 220;
                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isCometary) {
                    // === COMETAS ACTIVOS (Hielo estriado por ablación solar y fumarolas crio-activas) ===
                    const streak = ProceduralNoise.fbm3(nx * 2.2 + ny * 3.5, ny * 5.2, nz * 3.0, 4, seedNum);
                    const vent = ProceduralNoise.ridged3(nx * 4.5, ny * 4.5, nz * 4.5, 3, seedNum + 19);
                    const jetHotspot = smooth(0.75, 0.96, vent);
                    let col = mixRGB(coreCol, crustCol, streak);
                    col = mixRGB(col, rimCol, smooth(0.55, 0.9, streak) * 0.8);
                    col = mixRGB(col, accentCol, jetHotspot * 0.9);
                    er = accentCol[0]; eg = accentCol[1]; eb = accentCol[2];
                    ea = jetHotspot * 235;
                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isGravitic) {
                    // === POZOS GRAVITATORIOS & PÚLSARES (Horizontes oscuros y espirales de marea) ===
                    const swirlAngle = Math.atan2(ny, nx) + Math.sqrt(nx * nx + ny * ny) * 2.4;
                    const spiral = ProceduralNoise.fbm3(Math.cos(swirlAngle) * 2.5, Math.sin(swirlAngle) * 2.5, nz * 3.2, 4, seedNum);
                    const arc = ProceduralNoise.ridged3(nx * 4.6, ny * 4.6, nz * 4.6, 3, seedNum + 53);
                    const energyMask = smooth(0.68, 0.94, arc);
                    let col = mixRGB(coreCol, crustCol, smooth(0.2, 0.85, spiral));
                    if (arch.isMagnetar) {
                        const polarCap = smooth(0.62, 0.92, Math.abs(ny));
                        col = mixRGB(col, accentCol, polarCap * 0.85);
                        ea = Math.max(energyMask, polarCap * 0.9) * 230;
                    } else {
                        col = mixRGB(col, accentCol, energyMask * 0.92);
                        ea = energyMask * 235;
                    }
                    er = accentCol[0]; eg = accentCol[1]; eb = accentCol[2];
                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isArtificial) {
                    // === MEGAESTRUCTURAS & MUNDOS SINTÉTICOS (Placas hexagonales, costuras y puertos luminosos) ===
                    const panelX = Math.abs(Math.sin(nx * 14.0));
                    const panelY = Math.abs(Math.sin(ny * 14.0));
                    const seam = smooth(0.93, 0.995, Math.max(panelX, panelY));
                    const sectorNoise = Math.floor(ProceduralNoise.fbm3(nx * 4.2, ny * 4.2, nz * 4.2, 2, seedNum) * 4.0) / 4.0;
                    let col = mixRGB(coreCol, litCol, 0.28 + sectorNoise * 0.62);
                    col = mixRGB(col, crustCol, seam * 0.65);
                    const portPulse = smooth(0.76, 0.95, ProceduralNoise.ridged3(nx * 6.5, ny * 6.5, nz * 6.5, 2, seedNum + 77));
                    const glowMask = Math.max(seam * 0.55, portPulse);
                    col = mixRGB(col, accentCol, glowMask * 0.85);
                    er = accentCol[0]; eg = accentCol[1]; eb = accentCol[2];
                    ea = glowMask * 225;
                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isEyeball) {
                    // === MUNDO OJO CREPUSCULAR (Hemisferio abrasador vs hemisferio glacial + cinturón de tormenta) ===
                    const n1 = ProceduralNoise.fbm3(nx * 3.8, ny * 3.8, nz * 3.8, 4, seedNum);
                    const hotSide = smooth(-0.22, 0.35, nx);
                    const twilightBand = Math.exp(-Math.pow((nx + 0.02) * 5.2, 2));
                    const desertCol = mixRGB(coreCol, [234, 88, 12], smooth(0.3, 0.85, n1));
                    const iceCol = mixRGB([186, 230, 253], [240, 249, 255], smooth(0.25, 0.8, n1));
                    let col = mixRGB(iceCol, desertCol, hotSide);
                    col = mixRGB(col, accentCol, twilightBand * 0.72);
                    er = accentCol[0]; eg = accentCol[1]; eb = accentCol[2];
                    ea = twilightBand * 185;
                    r = col[0]; gr = col[1]; b = col[2];

                } else if (isTemporal) {
                    // === MUNDOS EFÍMEROS & TORMENTAS CÓSMICAS (Bandas de tormenta eléctrica y lluvia de diamantes) ===
                    const stormBand = ProceduralNoise.fbm3(nx * 2.2, ny * 6.4, nz * 2.8, 4, seedNum);
                    const bolt = ProceduralNoise.ridged3(nx * 5.6, ny * 5.6, nz * 5.6, 3, seedNum + 83);
                    const arcGlow = smooth(0.70, 0.94, bolt);
                    let col = mixRGB(coreCol, crustCol, smooth(0.18, 0.82, stormBand));
                    col = mixRGB(col, litCol, smooth(0.52, 0.88, stormBand) * 0.78);
                    col = mixRGB(col, accentCol, arcGlow * 0.92);
                    er = accentCol[0]; eg = accentCol[1]; eb = accentCol[2];
                    ea = arcGlow * 235;
                    r = col[0]; gr = col[1]; b = col[2];

                } else {
                    // === ANOMALÍAS, MUNDOS HUECOS Y PLANETOIDES CRATERIZADOS ===
                    const n1 = ProceduralNoise.fbm3(nx * 3.5, ny * 3.5, nz * 3.5, 4, seedNum);
                    const rift = ProceduralNoise.ridged3(nx * 4.2, ny * 4.2, nz * 4.2, 3, seedNum + 67);
                    let col = mixRGB(coreCol, crustCol, n1);
                    col = mixRGB(col, litCol, smooth(0.48, 0.82, n1) * 0.7);

                    const riftGlow = smooth(0.70, 0.92, rift);
                    if (cls === 'hollow' || cls === 'anomaly' || p.isHollow) {
                        const glowCol = (p.cavernGlowColor || accentCol);
                        col = mixRGB(col, glowCol, riftGlow * 0.82);
                        er = glowCol[0]; eg = glowCol[1]; eb = glowCol[2];
                        ea = riftGlow * 210;
                    }
                    r = col[0]; gr = col[1]; b = col[2];
                }

                // Aplicar cráteres realistas (borde iluminado + cuenca sombreada) si corresponde
                if (useCraters) {
                    let craterMod = 0;
                    for (let c = 0; c < craters.length; c++) {
                        const cr = craters[c];
                        const cd = Math.hypot(nx - cr.x, ny - cr.y, nz - cr.z);
                        if (cd < cr.r * 1.35) {
                            const u = cd / cr.r;
                            if (u < 0.85) {
                                craterMod -= (1 - (u / 0.85) * (u / 0.85)) * 0.28;
                            } else {
                                const rimU = (u - 0.85) / 0.50;
                                craterMod += Math.sin(rimU * Math.PI) * 0.22;
                            }
                        }
                    }
                    r += craterMod * 95;
                    gr += craterMod * 95;
                    b += craterMod * 95;
                }

                // Casquetes polares naturales en mundos telúricos y oceánicos
                if ((isTerrestrial || isOceanic) && !isEyeball) {
                    const polarLine = 0.79 + (ProceduralNoise.fbm3(nx * 5, ny * 5, nz * 5, 2, seedNum + 13) - 0.5) * 0.16;
                    if (lat > polarLine) {
                        const iceT = smooth(polarLine, Math.min(0.99, polarLine + 0.10), lat);
                        r = r + (242 - r) * iceT * 0.85;
                        gr = gr + (248 - gr) * iceT * 0.85;
                        b = b + (255 - b) * iceT * 0.88;
                    }
                }

                // Velos nubosos orbitales suaves en mundos con atmósfera densa (telúricos/oceánicos/temporales)
                if ((isTerrestrial || isOceanic) && (p.atmoDensity || 1.0) > 0.35) {
                    const cw = ProceduralNoise.fbm3(nx * 3.1 + ny * 1.4, ny * 4.4, nz * 3.1, 3, seedNum + 211);
                    if (cw > 0.56) {
                        const cloudT = smooth(0.56, 0.84, cw) * 0.52;
                        r = r + (246 - r) * cloudT;
                        gr = gr + (250 - gr) * cloudT;
                        b = b + (255 - b) * cloudT;
                    }
                }

                // Micro-relieve 3D por gradiente de luminancia local (esculpido sin ruido extra)
                const curLuma = r * 0.299 + gr * 0.587 + b * 0.114;
                let reliefMult = 1.0;
                if (!isGas && rowHasPrev && prevRowLuma[px] > 0) {
                    const slopeX = curLuma - prevLuma;
                    const slopeY = curLuma - prevRowLuma[px];
                    const bump = Math.max(-0.20, Math.min(0.24, (slopeX * 0.65 + slopeY * 0.55) * 0.016));
                    reliefMult = 1.0 + bump;
                }
                prevLuma = curLuma;
                prevRowLuma[px] = curLuma;
                rowHasPrev = true;

                const idx = (py * size + px) * 4;
                const shade = limbAO * reliefMult;
                data[idx] = Math.max(0, Math.min(255, r * shade));
                data[idx + 1] = Math.max(0, Math.min(255, gr * shade));
                data[idx + 2] = Math.max(0, Math.min(255, b * shade));
                data[idx + 3] = 255;

                if (emData && ea > 2) {
                    emData[idx] = Math.max(0, Math.min(255, er));
                    emData[idx + 1] = Math.max(0, Math.min(255, eg));
                    emData[idx + 2] = Math.max(0, Math.min(255, eb));
                    emData[idx + 3] = Math.max(0, Math.min(255, ea));
                }
            }
        }

        g.putImageData(img, 0, 0);
        p._macroSurfaceCanvas = canvas;
        if (emCanvas) {
            emG.putImageData(emImg, 0, 0);
            p._emissiveSurfaceCanvas = emCanvas;
        }
    }

    return {
        beginFrame() {
            bakedThisFrame = 0;
        },
        getSurfaceMaps(p, forceImmediate = false) {
            if (!p) return null;
            if (p._macroSurfaceCanvas) {
                return { albedo: p._macroSurfaceCanvas, emissive: p._emissiveSurfaceCanvas || null };
            }
            if (forceImmediate || bakedThisFrame < 1) {
                bakedThisFrame++;
                bakePlanet(p);
                return { albedo: p._macroSurfaceCanvas, emissive: p._emissiveSurfaceCanvas || null };
            }
            return null;
        }
    };
})();
