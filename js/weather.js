/**
 * ÉTER — Motor Meteorológico Planetario Cinemático
 * Nubes Volumétricas Orgánicas Continuas, Iluminación Solar Direccional,
 * Sombra Atmosférica de Terreno, Estelas de Lluvia y Descargas Eléctricas
 * ---------------------------------------------------------------------------
 */

function wxClamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function wxLerp(a, b, t) { return a + (b - a) * t; }
function wxWrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
function wxSmoothstep(min, max, x) {
    const t = wxClamp((x - min) / (max - min), 0, 1);
    return t * t * (3 - 2 * t);
}
function wxLerpRGB(c1, c2, t) {
    return [
        Math.round(wxLerp(c1[0], c2[0], t)),
        Math.round(wxLerp(c1[1], c2[1], t)),
        Math.round(wxLerp(c1[2], c2[2], t))
    ];
}

/**
 * Inicializa el sistema meteorológico de un planeta
 */
function initPlanetWeather(planet, rng) {
    if (!planet) return;
    if (planet.weather && planet.weather.hasClouds !== undefined) return;

    const arch = planet.archetype || {};
    const atmoDepth = Math.max(0, planet.atmoRadius - planet.radius);

    if (arch.hasClouds === false || atmoDepth < 160 || (planet.atmoDensity || 1) < 0.08) {
        planet.weather = {
            hasAtmosphere: false,
            hasClouds: false,
            profile: null,
            clouds: [],
            lightningBolts: [],
            precipParticles: [],
            stormIntensity: 0,
            rainIntensity: 0,
            currentCover: 0,
            skyFlash: 0
        };
        planet.cloudBands = [];
        return;
    }

    const prng = (typeof rng === 'function') ? rng : Math.random;
    const profile = (typeof wxResolveProfile === 'function') ? wxResolveProfile(arch) : (WX_CLIMATES && WX_CLIMATES.temperate ? WX_CLIMATES.temperate : {});

    const coverRange = (profile && profile.cover) ? profile.cover : [0.50, 0.95];
    const coverTarget = wxLerp(coverRange[0], coverRange[1], prng()) * (arch.cloudDensity || 1.0);
    const windRange = (profile && profile.wind) ? profile.wind : [14, 34];
    const windBase = wxLerp(windRange[0], windRange[1], prng()) * (prng() > 0.48 ? 1 : -1);

    const stormProp = (profile.storm && profile.storm.prop !== undefined) ? profile.storm.prop : 0.40;

    // Sorteo del estado climático inicial: alta probabilidad de amanecer con tormenta activa en planetas que lo permiten
    const initRoll = prng();
    let initState = 'calm';
    let initStorm = 0.0;
    let initRain = 0.0;
    if (initRoll < stormProp * 0.90) {
        initState = 'storm';
        const sIntRange = (profile.storm && profile.storm.int) ? profile.storm.int : [0.65, 1.0];
        initStorm = wxLerp(sIntRange[0], sIntRange[1], prng());
        initRain = (profile.precip && profile.precip.amount) ? profile.precip.amount : 0.65;
    } else if (initRoll < stormProp * 1.5) {
        initState = 'gathering';
        initStorm = 0.35;
        initRain = 0.25;
    }

    planet.weather = {
        hasAtmosphere: true,
        hasClouds: true,
        profile,
        coverTarget,
        currentCover: coverTarget,
        windBase,
        state: initState,
        stormPropensity: stormProp,
        stormIntensity: initStorm,
        rainIntensity: initRain,
        // Ciclos meteorológicos dinámicos (40 a 75 segundos)
        cycleTimer: 35 + prng() * 45,
        cycleDuration: 55 + prng() * 40,
        clouds: [],
        frontCenters: [],
        lightningBolts: [],
        precipParticles: [],
        skyFlash: 0,
        nextLightningDelay: initState === 'storm' ? (1.5 + prng() * 3.5) : (5.0 + prng() * 10.0)
    };

    generatePlanetCloudPopulation(planet, prng);
    planet.cloudBands = planet.weather.clouds;
}

/**
 * Genera la población de nubes agrupadas en frentes acumulados y claros naturales
 */
function generatePlanetCloudPopulation(planet, rng) {
    const w = planet.weather;
    if (!w || !w.hasClouds) return;
    const profile = w.profile;
    const radius = planet.radius;

    w.clouds = [];

    // Definir de 2 a 4 frentes climáticos principales alrededor del planeta
    const frontCount = Math.max(2, Math.min(4, Math.round(2.6 * (w.coverTarget || 0.7) * (radius / 2500))));
    w.frontCenters = [];
    for (let f = 0; f < frontCount; f++) {
        w.frontCenters.push({
            angle: (f / frontCount) * Math.PI * 2 + (rng() - 0.5) * 0.7,
            span: 0.55 + rng() * 0.65,
            isStormFront: (f === 0 && (w.state === 'storm' || rng() < w.stormPropensity * 1.2))
        });
    }

    // Cantidad total de formaciones nubosas
    const totalClouds = Math.max(10, Math.floor((16 + rng() * 18) * (w.coverTarget || 0.75) * (radius / 2500)));

    for (let i = 0; i < totalClouds; i++) {
        const front = w.frontCenters[Math.floor(rng() * w.frontCenters.length)];
        
        // En los frentes acumulados, las nubes se concentran hacia el centro del frente
        const clusterBias = (rng() - 0.5) + (rng() - 0.5); // Distribución triangular centrada
        const baseAngle = front.angle + clusterBias * (front.span * 0.55);
        const initialLifeFrac = 0.10 + rng() * 0.80; // Desfasadas en su ciclo vital

        let forceType = null;
        if (front.isStormFront && rng() < 0.65) {
            forceType = 'supercell_storm';
        } else if (rng() < 0.40) {
            forceType = 'cumulus_congestus';
        }

        const cloud = createDiverseOrganicCloud(planet, baseAngle, rng, initialLifeFrac, forceType);
        if (cloud) {
            cloud.id = i;
            w.clouds.push(cloud);
        }
    }
}

/**
 * Crea una nube orgánica o formación acumulada seleccionando entre arquetipos reales
 */
function createDiverseOrganicCloud(planet, baseAngle, rng, initialLifeFrac = 0.0, forcedMorph = null) {
    const w = planet.weather;
    const profile = w.profile;
    const radius = planet.radius;
    const atmoDepth = planet.atmoRadius - planet.radius;

    const isStormActive = w.state === 'storm' || w.stormIntensity > 0.35;
    
    // Selección morfológica
    let morphKey = forcedMorph;
    if (!morphKey) {
        if (isStormActive && rng() < 0.50) {
            morphKey = 'supercell_storm';
        } else {
            const roll = rng();
            if (roll < 0.35) {
                morphKey = 'cumulus_congestus'; // Gran cúmulo acumulado en torre
            } else if (roll < 0.60) {
                morphKey = 'fluffy_cluster';     // Cúmulo esponjoso algodonoso
            } else if (roll < 0.80) {
                morphKey = 'stratocumulus_deck'; // Manto ondulado continuo
            } else {
                morphKey = 'cirrus_streamers';   // Filamentos dispersos de hielo
            }
        }
    }

    // Configuración física según la morfología
    let altFracMin = 0.08, altFracMax = 0.16;
    let baseWidth = 950, baseHeight = 90;
    let baseOpacity = 0.90;
    let isStorm = false;
    let hasRain = false;

    if (morphKey === 'cumulus_congestus') {
        // Cúmulo congestus masivo acumulado: base plana + torres convectivas
        altFracMin = 0.07; altFracMax = 0.15;
        baseWidth = 1100 + rng() * 700;
        baseHeight = 110 + rng() * 60;
        baseOpacity = 0.94;
        hasRain = rng() < 0.45;
    } else if (morphKey === 'supercell_storm') {
        // Supercélula de tormenta: muro oscuro, gran yunque y actividad eléctrica
        altFracMin = 0.05; altFracMax = 0.13;
        baseWidth = 1600 + rng() * 1200;
        baseHeight = 160 + rng() * 90;
        baseOpacity = 0.97;
        isStorm = true;
        hasRain = true;
    } else if (morphKey === 'stratocumulus_deck') {
        // Bancos estratocúmulos continuos: nubes horizontales acumuladas
        altFracMin = 0.06; altFracMax = 0.12;
        baseWidth = 1300 + rng() * 900;
        baseHeight = 55 + rng() * 35;
        baseOpacity = 0.88;
        hasRain = rng() < 0.25;
    } else if (morphKey === 'fluffy_cluster') {
        // Cúmulos algodonosos compactos de buen tiempo
        altFracMin = 0.08; altFracMax = 0.16;
        baseWidth = 800 + rng() * 450;
        baseHeight = 85 + rng() * 40;
        baseOpacity = 0.92;
    } else {
        // Cirros deshilachados en altitud (dispersos)
        altFracMin = 0.18; altFracMax = 0.28;
        baseWidth = 900 + rng() * 800;
        baseHeight = 35 + rng() * 25;
        baseOpacity = 0.58;
    }

    const altFrac = wxLerp(altFracMin, altFracMax, rng());
    const alt = atmoDepth * altFrac;
    const width = baseWidth * (0.85 + rng() * 0.3);
    const height = baseHeight * (0.85 + rng() * 0.3);
    const angularSpan = width / (radius + alt);

    const shear = 0.75 + altFrac * 0.65;
    const windSpeed = (w.windBase * shear) / (radius + alt);

    // Nube exótica rara según perfil planetario
    const isExotic = profile && profile.exotic && (rng() < profile.exotic.chance);
    let exoticData = null;
    if (isExotic && profile.exotic.variants && profile.exotic.variants.length > 0) {
        const vList = profile.exotic.variants;
        exoticData = vList[Math.floor(rng() * vList.length)];
    }

    const stormPower = isStorm ? (0.85 + rng() * 0.15) : 0.0;
    const maxLife = 300 + rng() * 420;
    const life = maxLife * (1.0 - initialLifeFrac);
    const growDuration = 22 + rng() * 18; // Condensación visible
    const fadeDuration = 28 + rng() * 20;
    const baseAlpha = baseOpacity * (0.92 + rng() * 0.15);

    // Asimetría y ondulaciones orgánicas
    const asymmetry = (rng() - 0.5) * 0.65;
    const undulAmp = (rng() - 0.5) * height * 0.30;
    const undulFreq = 1.6 + rng() * 2.4;
    const seed = rng() * 1000.0;

    // Construcción volumétrica continua: base sólida + cúpulas algodonosas
    const puffs = buildDiverseGasPuffs(morphKey, width, height, asymmetry, undulAmp, undulFreq, rng);

    return {
        id: Math.floor(rng() * 100000),
        morphKey,
        angle: baseAngle,
        alt,
        width,
        height,
        angularSpan,
        windSpeed,
        isExotic,
        exoticData,
        isStorm,
        stormPower,
        hasRain,
        maxLife,
        life,
        growDuration,
        fadeDuration,
        baseAlpha,
        growth: 1.0,
        lightningGlow: 0,
        asymmetry,
        seed,
        puffs
    };
}

/**
 * Genera la estructura de bocanadas de la nube:
 * Separa claramente la base plana de condensación (isBase: true) de las cúpulas convectivas (isBase: false).
 * Esto permite fusionar los lóbulos sin que aparezcan halos oscuros ni bordes circulares tipo viñeta.
 */
function buildDiverseGasPuffs(morphKey, width, height, asymmetry, undulAmp, undulFreq, rng) {
    const puffs = [];

    function addDome(u, v, rad, scaleX, scaleY, alpha, withSubPuffs = true, isBase = false) {
        puffs.push({
            u, v, rad, scaleX, scaleY, alpha,
            isBase,
            phase: rng() * Math.PI * 2
        });

        if (withSubPuffs) {
            // Micro-cúpulas superpuestas a lo largo de la corona superior para relieve algodonoso
            const subCount = 3 + Math.floor(rng() * 3);
            for (let s = 0; s < subCount; s++) {
                const sAng = -Math.PI * 0.15 - (s / (subCount - 1)) * Math.PI * 0.70 + (rng() - 0.5) * 0.30;
                const sDist = rad * (0.42 + rng() * 0.28);
                const subU = u + (Math.cos(sAng) * sDist * scaleX) / (width * 0.5);
                const subV = v + (Math.sin(sAng) * sDist * scaleY) / height;
                puffs.push({
                    u: subU,
                    v: subV,
                    rad: rad * (0.38 + rng() * 0.20),
                    scaleX: 1.15 + rng() * 0.20,
                    scaleY: 1.00 + rng() * 0.20,
                    alpha: alpha * 0.92,
                    isBase: false,
                    phase: rng() * Math.PI * 2
                });
            }
        }
    }

    if (morphKey === 'cumulus_congestus') {
        // CÚMULO CONGESTUS ACUMULADO
        // 1. Base plana continua densa
        const baseCount = 7;
        for (let i = 0; i < baseCount; i++) {
            const u = (i / (baseCount - 1) - 0.5) * 0.92;
            const undul = Math.sin(u * Math.PI * undulFreq) * (undulAmp / height);
            addDome(u, 0.12 + undul, height * 0.52, 1.85, 0.70, 0.96, false, true);
        }

        // 2. Torres convectivas principales superpuestas
        const towerU = asymmetry * 0.35;
        addDome(towerU, 0.48, height * 0.65, 1.35, 1.05, 0.98, true, false);
        addDome(towerU + (rng() - 0.5) * 0.08, 0.82, height * 0.58, 1.25, 1.10, 0.98, true, false);

        // 3. Cúpulas secundarias en flancos
        const sideA = towerU > 0 ? -1 : 1;
        addDome(towerU + sideA * 0.28, 0.50, height * 0.52, 1.25, 1.05, 0.96, true, false);
        addDome(towerU + sideA * 0.52, 0.30, height * 0.44, 1.35, 0.95, 0.94, true, false);
        addDome(towerU - sideA * 0.25, 0.42, height * 0.48, 1.25, 1.05, 0.95, true, false);

    } else if (morphKey === 'supercell_storm') {
        // SUPERCÉLULA DE TORMENTA
        // 1. Base oscura horizontal masiva continua
        const baseCount = 9;
        for (let i = 0; i < baseCount; i++) {
            const u = (i / (baseCount - 1) - 0.5) * 0.96;
            addDome(u, 0.08, height * 0.45, 1.95, 0.72, 0.98, false, true);
        }

        // 2. Columna ascendente central
        const towerU = asymmetry * 0.20;
        addDome(towerU - 0.12, 0.35, height * 0.52, 1.40, 1.05, 0.98, true, false);
        addDome(towerU + 0.12, 0.38, height * 0.52, 1.40, 1.05, 0.98, true, false);
        addDome(towerU, 0.62, height * 0.55, 1.45, 1.10, 0.98, true, false);

        // 3. Yunque expansivo horizontal (Incus)
        const anvilCount = 7;
        for (let i = 0; i < anvilCount; i++) {
            const u = towerU + (i / (anvilCount - 1) - 0.45) * 0.98;
            addDome(u, 0.92, height * 0.42, 2.10, 0.58, 0.96, true, false);
        }

    } else if (morphKey === 'stratocumulus_deck') {
        // MANTO DE ESTRATOCÚMULOS
        const count = 8;
        for (let i = 0; i < count; i++) {
            const u = (i / (count - 1) - 0.5) * 0.94;
            const undul = Math.sin(u * Math.PI * undulFreq) * (undulAmp / height);
            addDome(u, 0.18 + undul, height * 0.55, 1.80, 0.68, 0.94, false, true);
            if (i % 2 === 1) {
                addDome(u, 0.48 + undul, height * 0.42, 1.30, 0.90, 0.90, true, false);
            }
        }

    } else if (morphKey === 'fluffy_cluster') {
        // RACIMO ESPONJOSO ALGODONOSO
        addDome(-0.25, 0.16, height * 0.52, 1.65, 0.75, 0.95, false, true);
        addDome(0.25, 0.16, height * 0.52, 1.65, 0.75, 0.95, false, true);
        addDome(0.00, 0.22, height * 0.55, 1.60, 0.85, 0.96, false, true);
        addDome(-0.18, 0.56, height * 0.52, 1.20, 1.05, 0.98, true, false);
        addDome(0.18, 0.58, height * 0.52, 1.20, 1.05, 0.98, true, false);
        addDome(0.00, 0.82, height * 0.46, 1.15, 1.10, 0.96, true, false);

    } else {
        // CIRROS FILAMENTOSOS DE GRAN ALTITUD
        const count = 6;
        for (let i = 0; i < count; i++) {
            const u = (i / (count - 1) - 0.5) * 0.94;
            const hook = Math.pow(Math.max(0, u + 0.45), 1.7) * 0.38;
            addDome(u, 0.32 + hook, height * 0.60, 2.60, 0.45, 0.80, false, false);
        }
    }

    return puffs;
}

/**
 * Actualiza la simulación meteorológica planetaria, ciclos de tormenta, rayos continuos y precipitación
 */
function updatePlanetWeather(planet, dt, ship, cosmosSimTime) {
    const w = planet.weather;
    if (!w || !w.hasClouds) return;

    const profile = w.profile;

    // 1. Desvanecimiento suave del destello atmosférico de rayo (Sky Flash)
    if (w.skyFlash > 0.005) {
        w.skyFlash = Math.max(0, w.skyFlash - dt * 4.8);
    }

    // 2. Ciclos Meteorológicos Dinámicos y Perceptibles
    w.cycleTimer -= dt;
    if (w.cycleTimer <= 0) {
        w.cycleTimer = w.cycleDuration * (0.75 + Math.random() * 0.50);

        if (w.state === 'calm') {
            w.state = Math.random() < w.stormPropensity ? 'gathering' : 'calm';
        } else if (w.state === 'gathering') {
            w.state = Math.random() < (w.stormPropensity * 1.6) ? 'storm' : 'clearing';
        } else if (w.state === 'storm') {
            w.state = 'clearing';
        } else {
            w.state = 'calm';
        }
    }

    let targetStorm = 0.0;
    let targetRain = 0.0;
    if (w.state === 'storm') {
        const stormRange = (profile && profile.storm && profile.storm.int) ? profile.storm.int : [0.65, 1.0];
        targetStorm = wxLerp(stormRange[0], stormRange[1], 0.80);
        targetRain = (profile && profile.precip && profile.precip.amount) ? profile.precip.amount : 0.65;
    } else if (w.state === 'gathering') {
        targetStorm = 0.38;
        targetRain = (profile && profile.precip && profile.precip.amount) ? profile.precip.amount * 0.45 : 0.25;
    } else if (w.state === 'clearing') {
        targetStorm = 0.10;
        targetRain = 0.08;
    }

    w.stormIntensity = wxLerp(w.stormIntensity, targetStorm, dt * 0.20);
    w.rainIntensity = wxLerp(w.rainIntensity, targetRain, dt * 0.22);

    // 3. Deriva Eólica y Mecanismo de Condensación / Disipación en Tiempo Real
    for (let cIdx = w.clouds.length - 1; cIdx >= 0; cIdx--) {
        const cl = w.clouds[cIdx];
        cl.angle = wxWrapAngle(cl.angle + cl.windSpeed * dt);

        cl.life -= dt;
        const age = cl.maxLife - cl.life;

        if (age < cl.growDuration) {
            cl.growth = wxSmoothstep(0, cl.growDuration, age);
        } else if (cl.life < cl.fadeDuration) {
            cl.growth = wxSmoothstep(0, cl.fadeDuration, cl.life);
        } else {
            cl.growth = 1.0;
        }

        if (cl.lightningGlow > 0.001) {
            cl.lightningGlow = Math.max(0, cl.lightningGlow - dt * 3.8);
        }

        if (cl.life <= 0) {
            w.clouds.splice(cIdx, 1);
        }
    }

    // Nacimiento continuo de nuevas nubes acumuladas en los frentes activos
    const desiredCount = Math.max(10, Math.floor(18 * (w.coverTarget || 0.75) * (planet.radius / 2500)));
    if (w.clouds.length < desiredCount && Math.random() < 0.28) {
        const front = (w.frontCenters && w.frontCenters.length > 0)
            ? w.frontCenters[Math.floor(Math.random() * w.frontCenters.length)]
            : { angle: Math.random() * Math.PI * 2, span: 0.7, isStormFront: false };
        const newAng = front.angle + (Math.random() - 0.5) * front.span;
        const forceType = (front.isStormFront || w.state === 'storm') ? 'supercell_storm' : null;
        const newCl = createDiverseOrganicCloud(planet, newAng, Math.random, 0.0, forceType);
        if (newCl) {
            newCl.growth = 0.02;
            w.clouds.push(newCl);
        }
    }

    // 4. Rayos Reales y Frecuentes con Truenos Acústicos y Destello Atmosférico
    const hasLightning = profile.lightning && profile.lightning.rate > 0;
    const isStormActive = (w.stormIntensity > 0.18 || w.state === 'storm' || profile.id === 'gas' || profile.id === 'volcanic');

    if (hasLightning && isStormActive) {
        const rateFactor = Math.max(0.5, profile.lightning.rate) * (0.8 + w.stormIntensity * 1.4);
        w.nextLightningDelay -= dt * rateFactor;

        if (w.nextLightningDelay <= 0) {
            // Frecuencia dinámica: entre 2.2 y 5.5 segundos durante tormenta activa
            w.nextLightningDelay = (2.2 + Math.random() * 3.3) / rateFactor;

            const stormClouds = w.clouds.filter(c => c.isStorm || c.morphKey === 'supercell_storm' || c.morphKey === 'cumulus_congestus');
            const targetCloud = (stormClouds.length > 0)
                ? stormClouds[Math.floor(Math.random() * stormClouds.length)]
                : w.clouds[Math.floor(Math.random() * w.clouds.length)];

            if (targetCloud) {
                triggerLightningDischarge(planet, targetCloud, w, ship);
            }
        }
    }

    for (let lIdx = w.lightningBolts.length - 1; lIdx >= 0; lIdx--) {
        const bolt = w.lightningBolts[lIdx];
        bolt.life -= dt;
        if (bolt.life <= 0) w.lightningBolts.splice(lIdx, 1);
    }

    updateDelicatePrecipitation(planet, dt, ship, cosmosSimTime);
}

/**
 * Dispara una descarga eléctrica real:
 *  - Rayos nube-tierra (CG) con impacto brillante en relieve/océano
 *  - Relámpagos nube-nube (IC crawlers) que iluminan el cúmulo
 *  - Destello ambiental en cielo y trueno acústico con reverberación
 */
function triggerLightningDischarge(planet, cloud, weather, ship) {
    const profile = weather.profile;
    const lConf = profile.lightning || { power: [0.7, 1.0], colors: [[225, 240, 255]], branch: 0.75, ic: 0.35 };

    cloud.lightningGlow = 1.0;
    weather.skyFlash = 0.85 + Math.random() * 0.15;

    const power = wxLerp(lConf.power[0], lConf.power[1], Math.random());
    const colorsList = lConf.colors || [[225, 240, 255]];
    const color = colorsList[Math.floor(Math.random() * colorsList.length)];

    const cloudR = planet.radius + cloud.alt;
    const originX = planet.x + Math.cos(cloud.angle) * cloudR;
    const originY = planet.y + Math.sin(cloud.angle) * cloudR;

    const isCloudToGround = Math.random() > (lConf.ic || 0.35);

    let targetX, targetY;
    let distToShip = 3000;

    if (isCloudToGround) {
        // RAYO NUBE-TIERRA: impacta directamente sobre el relieve o el mar
        const targetAng = cloud.angle + (Math.random() - 0.5) * (cloud.angularSpan * 0.65);
        const surfaceR = (typeof getSurfaceRadius === 'function' && planet.heights && planet.heights.length > 0)
            ? getSurfaceRadius(planet, targetAng)
            : planet.radius;
        targetX = planet.x + Math.cos(targetAng) * surfaceR;
        targetY = planet.y + Math.sin(targetAng) * surfaceR;

        const segments = generateFractalLightningSegments(originX, originY, targetX, targetY, power);

        if (ship) distToShip = Math.hypot(ship.x - targetX, ship.y - targetY);

        weather.lightningBolts.push({
            type: 'cg',
            originX, originY, targetX, targetY,
            segments, color, power,
            life: 0.32 + Math.random() * 0.12,
            maxLife: 0.44,
            flicker: [1.0, 0.35, 0.95, 0.25, 0.85, 0.40, 0.15]
        });

        if (typeof createLiquidRipple === 'function' && planet.lakes && planet.lakes.length > 0) {
            createLiquidRipple(planet, targetAng, 6.5 * power);
        }
    } else {
        // RELÁMPAGO INTRA-NUBE (Crawler horizontal)
        const targetAng = cloud.angle + (Math.random() > 0.5 ? 1 : -1) * (cloud.angularSpan * (0.35 + Math.random() * 0.35));
        const targetR = cloudR + (Math.random() - 0.5) * cloud.height * 0.5;
        targetX = planet.x + Math.cos(targetAng) * targetR;
        targetY = planet.y + Math.sin(targetAng) * targetR;

        const segments = generateFractalLightningSegments(originX, originY, targetX, targetY, power * 0.85);

        if (ship) distToShip = Math.hypot(ship.x - targetX, ship.y - targetY);

        weather.lightningBolts.push({
            type: 'ic',
            originX, originY, targetX, targetY,
            segments, color, power: power * 0.85,
            life: 0.28 + Math.random() * 0.10,
            maxLife: 0.38,
            flicker: [0.9, 0.4, 1.0, 0.3, 0.7, 0.2]
        });
    }

    if (typeof audio !== 'undefined' && audio && audio.playThunder) {
        audio.playThunder(power, distToShip);
    }

    if (typeof camera !== 'undefined' && distToShip < 3200) {
        const proxShake = (1 - distToShip / 3200) * power * 4.2;
        camera.shake = Math.min(6.5, camera.shake + proxShake);
    }
}

/**
 * Genera segmentos fractales ramificados con bifurcaciones orgánicas
 */
function generateFractalLightningSegments(x0, y0, x1, y1, power) {
    const segments = [];
    function divide(ax, ay, bx, by, depth, maxDepth, branchProb) {
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy);

        if (depth >= maxDepth || len < 16) {
            segments.push({
                x0: ax, y0: ay, x1: bx, y1: by,
                depth,
                width: Math.max(1.2, (maxDepth - depth + 1.2) * (power * 1.15))
            });
            return;
        }

        const midX = (ax + bx) * 0.5;
        const midY = (ay + by) * 0.5;
        const perpX = -dy / len;
        const perpY = dx / len;
        const offset = (Math.random() - 0.5) * len * 0.36;
        const nx = midX + perpX * offset;
        const ny = midY + perpY * offset;

        divide(ax, ay, nx, ny, depth + 1, maxDepth, branchProb);
        divide(nx, ny, bx, by, depth + 1, maxDepth, branchProb);

        if (depth < maxDepth - 1 && Math.random() < branchProb) {
            const bAng = Math.atan2(dy, dx) + (Math.random() > 0.5 ? 1 : -1) * (0.32 + Math.random() * 0.42);
            const bLen = len * (0.35 + Math.random() * 0.35);
            const bEndX = nx + Math.cos(bAng) * bLen;
            const bEndY = ny + Math.sin(bAng) * bLen;
            divide(nx, ny, bEndX, bEndY, depth + 1, maxDepth - 1, 0.10);
        }
    }
    divide(x0, y0, x1, y1, 0, 5, 0.48);
    return segments;
}

/**
 * Actualiza partículas de precipitación atmosféricas
 */
function updateDelicatePrecipitation(planet, dt, ship, cosmosSimTime) {
    const w = planet.weather;
    const profile = w.profile;
    const pConf = profile.precip;
    if (!pConf || pConf.kind === 'none' || w.rainIntensity <= 0.02) {
        w.precipParticles.length = 0;
        return;
    }

    if (!ship || ship.nearestPlanet !== planet || ship.currentAtmoWeight <= 0.04) {
        w.precipParticles.length = 0;
        return;
    }

    const maxParticles = Math.min(110, Math.floor(130 * w.rainIntensity));

    if (w.precipParticles.length < maxParticles) {
        const spawnCount = Math.min(5, maxParticles - w.precipParticles.length);
        const camViewW = (typeof screenW !== 'undefined' ? screenW : 1200) / (typeof camera !== 'undefined' ? Math.max(0.35, camera.zoom) : 1);
        const camViewH = (typeof screenH !== 'undefined' ? screenH : 800) / (typeof camera !== 'undefined' ? Math.max(0.35, camera.zoom) : 1);

        for (let i = 0; i < spawnCount; i++) {
            const angToShip = Math.atan2(ship.y - planet.y, ship.x - planet.x);
            const tanX = -Math.sin(angToShip);
            const tanY = Math.cos(angToShip);
            const radX = Math.cos(angToShip);
            const radY = Math.sin(angToShip);

            const spreadT = (Math.random() - 0.5) * (camViewW + 180);
            const altAbove = 180 + Math.random() * (camViewH * 0.65);

            w.precipParticles.push({
                x: ship.x + tanX * spreadT + radX * altAbove,
                y: ship.y + tanY * spreadT + radY * altAbove,
                vx: -radX * (180 + Math.random() * 100) + tanX * (w.windBase * 0.35),
                vy: -radY * (180 + Math.random() * 100) + tanY * (w.windBase * 0.35),
                len: pConf.kind === 'snow' ? (2.5 + Math.random() * 2.5) : (12 + Math.random() * 9),
                alpha: (0.18 + Math.random() * 0.15) * w.rainIntensity,
                life: 1.8 + Math.random() * 0.9,
                maxLife: 2.4,
                kind: pConf.kind,
                color: pConf.color || [195, 220, 245]
            });
        }
    }

    for (let i = w.precipParticles.length - 1; i >= 0; i--) {
        const pt = w.precipParticles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;

        if (pt.kind === 'snow') {
            pt.x += Math.sin(cosmosSimTime * 3.0 + i) * 10 * dt;
            pt.y += Math.cos(cosmosSimTime * 2.0 + i) * 5 * dt;
        }

        const dPt = Math.hypot(pt.x - planet.x, pt.y - planet.y);
        const angPt = Math.atan2(pt.y - planet.y, pt.x - planet.x);
        const surfR = (typeof getSurfaceRadius === 'function' && planet.heights && planet.heights.length > 0)
            ? getSurfaceRadius(planet, angPt)
            : planet.radius;

        if (dPt <= surfR + 4) {
            if (Math.random() < 0.18 && typeof createLiquidRipple === 'function' && planet.lakes && planet.lakes.length > 0) {
                createLiquidRipple(planet, angPt, 3.8);
            }
            w.precipParticles.splice(i, 1);
            continue;
        }

        pt.life -= dt;
        if (pt.life <= 0) w.precipParticles.splice(i, 1);
    }
}

/**
 * Renderizado Cinemático del Sistema Meteorológico Planetario:
 *  - Destello celestial de relámpago en el cielo (Sky Flash)
 *  - Sombra suave y natural proyectada en el relieve bajo tormentas (sin polígonos/conos artificiales)
 *  - Estelas de lluvia orgánicas en caída libre
 *  - Fusión volumétrica limpia de nubes (sin anillos oscuros ni viñetas en cada esfera)
 *  - Rayos fractales y partículas atmosféricas
 */
function drawPlanetWeather(p, timeSec) {
    const w = p.weather;
    if (!w || !w.hasClouds || w.clouds.length === 0) return;

    const camX = (typeof camera !== 'undefined' && camera) ? camera.x : 0;
    const camY = (typeof camera !== 'undefined' && camera) ? camera.y : 0;
    const camZoom = (typeof camera !== 'undefined' && camera && camera.zoom) ? camera.zoom : 1;
    const sW = (typeof screenW !== 'undefined') ? screenW : 1200;
    const sH = (typeof screenH !== 'undefined') ? screenH : 800;

    const dCam = Math.hypot(p.x - camX, p.y - camY);
    if (dCam > p.atmoRadius + Math.max(3400, (p.atmoRadius - p.radius) * 0.5)) return;

    const profile = w.profile;
    const lightAng = (p.lightAngle !== undefined) ? p.lightAngle : -Math.PI * 0.35;
    const baseCloudCol = (profile && profile.neutral && profile.neutral.lit)
        ? profile.neutral.lit
        : [252, 253, 255];
    const sunsetCol = (p.colors && p.colors.sunsetRGB) || (p.archetype && p.archetype.sunsetRGB) || [251, 146, 60];

    const viewLimit = (Math.max(sW, sH) / Math.max(0.3, camZoom)) + 750;

    // Fuego de motor de cohete para iluminación volumétrica
    const curShip = (typeof ship !== 'undefined' && ship) ? ship : null;
    const sScale = curShip ? (curShip.scale || 1.0) : 1.0;

    const isEngineFiring = !!(curShip && (
        (curShip.thrustIntensity > 0.03 || curShip.thrusting || (curShip.warping && curShip.fuel > 0)) &&
        (curShip.fuel > 0 || curShip.godMode)
    ));

    let flameInfo = null;
    let flameX = 0, flameY = 0;
    let flameRadius = 0;

    if (isEngineFiring) {
        flameInfo = (typeof getRocketFlameInfo === 'function')
            ? getRocketFlameInfo(curShip)
            : { flameColor: 'standard', rgb: [251, 175, 60], coreRGB: [255, 248, 230], highlightRGB: [254, 240, 138] };

        const nozDist = 16 * sScale;
        const nozX = curShip.x - Math.cos(curShip.angle) * nozDist;
        const nozY = curShip.y - Math.sin(curShip.angle) * nozDist;

        const flameExtend = 26 * sScale * Math.min(1.4, Math.max(0.4, curShip.thrustIntensity));
        flameX = nozX - Math.cos(curShip.angle) * flameExtend;
        flameY = nozY - Math.sin(curShip.angle) * flameExtend;

        const thrFactor = Math.min(1.35, Math.max(0.4, curShip.thrustIntensity));
        flameRadius = (380 + (curShip.smokeScale || 1.0) * 90) * Math.max(0.75, sScale * 0.9) * (0.7 + 0.3 * thrFactor);
    }

    // Plasma térmico y onda de choque por reentrada atmosférica hipersónica (fricción y compresión de aire)
    const reI = Math.min(1.25, Math.max(0, curShip ? (curShip.reentryIntensity || 0) : 0));
    const isReentering = reI > 0.035;
    let plasmaX = 0, plasmaY = 0;
    let plasmaRadius = 0;
    let plasmaRGB = [255, 140, 45];

    if (isReentering) {
        plasmaX = curShip.x;
        plasmaY = curShip.y;
        // Alcance expansivo según la escala del cohete y la intensidad del calentamiento de reentrada
        plasmaRadius = (460 + sScale * 210) * Math.min(1.6, Math.max(0.40, reI * 1.30));
        // Gradación cromática del plasma: de naranja-rojizo en inicio hasta plasma blanco-dorado incandescente en el pico
        const plasmaG = Math.round(wxLerp(95, 215, wxClamp(reI, 0, 1)));
        const plasmaB = Math.round(wxLerp(35, 120, wxClamp(reI, 0, 1)));
        plasmaRGB = [255, plasmaG, plasmaB];
    }

    ctx.save();

    // ── 1. DESTELLO ATMOSFÉRICO DE RAYO (SKY FLASH) ──
    if (w.skyFlash > 0.01) {
        const flashAlpha = w.skyFlash * 0.30;
        const flashGrad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.88, p.x, p.y, p.atmoRadius * 1.08);
        flashGrad.addColorStop(0.00, `rgba(225, 240, 255, ${flashAlpha * 0.35})`);
        flashGrad.addColorStop(0.70, `rgba(210, 235, 255, ${flashAlpha * 0.70})`);
        flashGrad.addColorStop(1.00, 'rgba(200, 225, 255, 0.0)');

        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.atmoRadius * 1.08, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── 2. SOMBRA ATMOSFÉRICA SUAVE EN EL RELIEVE Y ESTELAS DE LLUVIA (Sin conos ni triángulos artificiales) ──
    for (let cIdx = 0; cIdx < w.clouds.length; cIdx++) {
        const cl = w.clouds[cIdx];
        if (!cl.isStorm && !cl.hasRain && w.rainIntensity <= 0.20) continue;

        const rBase = p.radius + cl.alt;
        const cx = p.x + Math.cos(cl.angle) * rBase;
        const cy = p.y + Math.sin(cl.angle) * rBase;

        if (Math.hypot(cx - camX, cy - camY) > viewLimit + cl.width * 0.7) continue;

        const surfaceR = (typeof getSurfaceRadius === 'function' && p.heights && p.heights.length > 0)
            ? getSurfaceRadius(p, cl.angle)
            : p.radius;

        const shadowIntensity = cl.growth * (cl.isStorm ? 0.35 : (w.rainIntensity * 0.25));
        if (shadowIntensity <= 0.01) continue;

        // A. Sombra difusa proyectada suavemente en la superficie directamente bajo la tormenta
        const groundX = p.x + Math.cos(cl.angle) * surfaceR;
        const groundY = p.y + Math.sin(cl.angle) * surfaceR;
        const shadowRadius = cl.width * 0.45;

        const gShadow = ctx.createRadialGradient(groundX, groundY, 4, groundX, groundY, shadowRadius);
        gShadow.addColorStop(0.00, `rgba(18, 22, 34, ${shadowIntensity * 0.55})`);
        gShadow.addColorStop(0.55, `rgba(18, 22, 34, ${shadowIntensity * 0.28})`);
        gShadow.addColorStop(1.00, 'rgba(18, 22, 34, 0.0)');

        ctx.fillStyle = gShadow;
        ctx.beginPath();
        ctx.arc(groundX, groundY, shadowRadius, 0, Math.PI * 2);
        ctx.fill();

        // B. Estelas de lluvia finas y dinámicas en caída (delicadas líneas atmosféricas, NADA de conos ni polígonos sólidos)
        const streakCount = Math.floor(cl.width / 45);
        const rainDist = Math.max(20, rBase - surfaceR);
        const windDrift = w.windBase * 0.22;

        ctx.save();
        ctx.lineWidth = 1.1;
        const rainAlpha = shadowIntensity * 0.65;
        const rCol = cl.isStorm ? [175, 195, 225] : [195, 215, 240];
        ctx.strokeStyle = `rgba(${rCol[0]}, ${rCol[1]}, ${rCol[2]}, ${rainAlpha})`;

        for (let s = 0; s < streakCount; s++) {
            // Distribución determinista de estelas dentro del ancho de la nube
            const uFrac = (s / streakCount) - 0.5;
            const streakAng = cl.angle + uFrac * (cl.angularSpan * 0.85);
            
            // Movimiento vertical cíclico con la velocidad de caída de la lluvia
            const cycleSpeed = 380; // píxeles por segundo
            const offsetCycle = (timeSec * cycleSpeed + s * 97.3) % rainDist;
            const currentR = rBase - offsetCycle;
            if (currentR <= surfaceR) continue;

            const stX1 = p.x + Math.cos(streakAng) * currentR;
            const stY1 = p.y + Math.sin(streakAng) * currentR;

            // Inclinación tangencial por el viento
            const dropLen = 14 + (s % 5) * 3;
            const stX2 = stX1 - Math.cos(streakAng) * dropLen - Math.sin(streakAng) * (windDrift * 0.04);
            const stY2 = stY1 - Math.sin(streakAng) * dropLen + Math.cos(streakAng) * (windDrift * 0.04);

            ctx.beginPath();
            ctx.moveTo(stX1, stY1);
            ctx.lineTo(stX2, stY2);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ── 3. RENDERIZADO DE LAS NUBES VOLUMÉTRICAS (Fusión limpia sin halos oscuros ni viñetas circulares) ──
    for (let cIdx = 0; cIdx < w.clouds.length; cIdx++) {
        const cl = w.clouds[cIdx];
        const rBase = p.radius + cl.alt;
        const cx = p.x + Math.cos(cl.angle) * rBase;
        const cy = p.y + Math.sin(cl.angle) * rBase;

        if (Math.hypot(cx - camX, cy - camY) > viewLimit + cl.width * 0.65) continue;

        let cloudFlameDist = 99999;
        if (isEngineFiring) {
            cloudFlameDist = Math.hypot(cx - flameX, cy - flameY);
        }
        const cloudNearFlame = isEngineFiring && (cloudFlameDist < flameRadius + cl.width * 0.65 + 150);

        let cloudPlasmaDist = 99999;
        if (isReentering) {
            cloudPlasmaDist = Math.hypot(cx - plasmaX, cy - plasmaY);
        }
        const cloudNearPlasma = isReentering && (cloudPlasmaDist < plasmaRadius + cl.width * 0.65 + 150);

        const sunDot = Math.cos(cl.angle - lightAng);
        const dayWeight = wxSmoothstep(-0.20, 0.28, sunDot);
        const nightWeight = wxSmoothstep(0.18, -0.22, sunDot);
        const twiWeight = Math.exp(-Math.pow(sunDot / 0.18, 2));

        let gasCol = baseCloudCol;
        if (cl.isExotic && cl.exoticData) {
            gasCol = cl.exoticData.lit || baseCloudCol;
        }

        // Tinte de tormenta: oscurecimiento profundo y realista en la base
        if (cl.isStorm || w.stormIntensity > 0.30) {
            const stormCol = (profile.id === 'toxic') ? [55, 75, 52] : ((profile.id === 'volcanic') ? [75, 62, 58] : [52, 60, 78]);
            const sMix = Math.min(1.0, (cl.isStorm ? 0.90 : 0.60) * (0.65 + w.stormIntensity * 0.35));
            gasCol = wxLerpRGB(gasCol, stormCol, sMix * 0.85);
        }

        let renderCol = [...gasCol];

        if (twiWeight > 0.02) {
            renderCol = wxLerpRGB(renderCol, sunsetCol, twiWeight * 0.88);
        }

        if (cl.lightningGlow > 0.02) {
            renderCol = wxLerpRGB(renderCol, [255, 255, 255], cl.lightningGlow * 0.96);
        }

        const dayTwiCol = [...renderCol];

        const nightSky = (p.colors && p.colors.nightSkyRGB) || [8, 14, 24];
        const nightGas = wxLerpRGB(nightSky, [20, 28, 44], 0.70);

        if (nightWeight > 0.02) {
            renderCol = wxLerpRGB(renderCol, nightGas, nightWeight * 0.88);
        }

        const alphaBase = cl.baseAlpha * cl.growth * (0.50 + 0.50 * dayWeight + 0.35 * twiWeight);
        if (alphaBase <= 0.008) continue;

        const cR = renderCol[0];
        const cG = renderCol[1];
        const cB = renderCol[2];

        // Sombra de la base atmosférica (se aplica gradualmente según la altura vertical pf.v)
        const shadeCol = (profile && profile.neutral && profile.neutral.shade)
            ? profile.neutral.shade
            : (cl.isStorm ? [42, 48, 65] : [175, 192, 220]);
        const shR = Math.round(wxLerp(cR, shadeCol[0], 0.38 * dayWeight));
        const shG = Math.round(wxLerp(cG, shadeCol[1], 0.38 * dayWeight));
        const shB = Math.round(wxLerp(cB, shadeCol[2], 0.38 * dayWeight));

        // Dirección solar estática para los lóbulos (100% estable, no se mueve con la nave)
        const sunRelAng = lightAng - cl.angle - Math.PI * 0.5;
        const sunDx = Math.cos(sunRelAng);
        const sunDy = Math.sin(sunRelAng);

        // Renderizado de los lóbulos orgánicos de la nube:
        // Cada lóbulo tiene un núcleo luminoso/difuso y NUNCA una bola oscura o viñeta en el centro.
        // La sombra se distribuye naturalmente por altura (la base de la nube es más sombreada que las cimas).
        for (let pIdx = 0; pIdx < cl.puffs.length; pIdx++) {
            const pf = cl.puffs[pIdx];

            const effRad = pf.rad;

            const pAng = cl.angle + pf.u * cl.angularSpan;
            const pR = rBase + pf.v * cl.height;

            const px = p.x + Math.cos(pAng) * pR;
            const py = p.y + Math.sin(pAng) * pR;

            if (Math.hypot(px - camX, py - camY) > viewLimit + effRad * 1.5) continue;

            const puffAlpha = alphaBase * pf.alpha;
            if (puffAlpha <= 0.006) continue;

            // Factor de sombreado según la altura del lóbulo dentro de la nube:
            // Los lóbulos inferiores (base) son más oscuros, los superiores son más luminosos.
            // Ningún lóbulo tiene una oscuridad interior concéntrica: el centro siempre es luminoso y denso.
            const heightFrac = wxClamp(pf.v, 0, 1);
            const shadeAmount = (1.0 - heightFrac) * 0.40;

            let curR = Math.round(wxLerp(cR, shR, shadeAmount));
            let curG = Math.round(wxLerp(cG, shG, shadeAmount));
            let curB = Math.round(wxLerp(cB, shB, shadeAmount));

            // Iluminación reactiva por el fuego del motor del cohete (sin alterar posición ni coordenadas)
            let fireIllum = 0;
            if (cloudNearFlame) {
                const dFlame = Math.hypot(px - flameX, py - flameY);
                if (dFlame < flameRadius) {
                    const prox = 1.0 - (dFlame / flameRadius);
                    fireIllum = Math.pow(prox, 1.25) * Math.min(1.3, Math.max(0.15, curShip.thrustIntensity * 1.15));
                }
            }

            // Iluminación reactiva por el plasma y fricción de reentrada atmosférica
            let plasmaIllum = 0;
            if (cloudNearPlasma) {
                const dPlasma = Math.hypot(px - plasmaX, py - plasmaY);
                if (dPlasma < plasmaRadius) {
                    const prox = 1.0 - (dPlasma / plasmaRadius);
                    plasmaIllum = Math.pow(prox, 1.22) * Math.min(1.4, reI * 1.30);
                }
            }

            // Fusión térmica sinérgica (motores y/o plasma de choque)
            let thermalIllum = 0;
            let thermalRGB = null;
            if (fireIllum > 0.01 && plasmaIllum > 0.01) {
                thermalIllum = Math.min(1.45, Math.hypot(fireIllum, plasmaIllum));
                const pWeight = plasmaIllum / (fireIllum + plasmaIllum);
                const fRGB = flameInfo ? flameInfo.rgb : [251, 175, 60];
                thermalRGB = [
                    Math.round(wxLerp(fRGB[0], plasmaRGB[0], pWeight)),
                    Math.round(wxLerp(fRGB[1], plasmaRGB[1], pWeight)),
                    Math.round(wxLerp(fRGB[2], plasmaRGB[2], pWeight))
                ];
            } else if (plasmaIllum > 0.01) {
                thermalIllum = plasmaIllum;
                thermalRGB = plasmaRGB;
            } else if (fireIllum > 0.01) {
                thermalIllum = fireIllum;
                thermalRGB = flameInfo ? flameInfo.rgb : [251, 175, 60];
            }

            if (thermalIllum > 0.01 && thermalRGB) {
                const tMix = wxClamp(thermalIllum * (0.90 + 0.35 * nightWeight), 0, 0.95);
                curR = Math.round(wxLerp(curR, thermalRGB[0], tMix));
                curG = Math.round(wxLerp(curG, thermalRGB[1], tMix));
                curB = Math.round(wxLerp(curB, thermalRGB[2], tMix));
            }

            // Resplandor directo en el núcleo del lóbulo (siempre más claro que el contorno para evitar bolas oscuras)
            const hiR = Math.min(255, Math.round(curR * 1.15 + 15));
            const hiG = Math.min(255, Math.round(curG * 1.15 + 15));
            const hiB = Math.min(255, Math.round(curB * 1.15 + 15));

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(pAng + Math.PI * 0.5);
            ctx.scale(pf.scaleX, pf.scaleY);

            // Centro del resplandor estático respecto al sol (nunca cambia de posición cuando el cohete se mueve)
            const hlX = sunDx * (effRad * 0.22);
            const hlY = sunDy * (effRad * 0.22);

            // Gradiente limpio: el centro es brillante y se desvanece suavemente hacia el tono del cuerpo,
            // sin oscurecerse en el centro ni en el borde exterior.
            const grad = ctx.createRadialGradient(hlX, hlY, 0, 0, 0, effRad);
            grad.addColorStop(0.00, `rgba(${hiR}, ${hiG}, ${hiB}, ${puffAlpha * 0.95})`);
            grad.addColorStop(0.55, `rgba(${curR}, ${curG}, ${curB}, ${puffAlpha * 0.90})`);
            grad.addColorStop(0.85, `rgba(${curR}, ${curG}, ${curB}, ${puffAlpha * 0.42})`);
            grad.addColorStop(1.00, `rgba(${curR}, ${curG}, ${curB}, 0.0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, effRad, 0, Math.PI * 2);
            ctx.fill();

            // Resplandor cálido aditivo al paso del cohete (bloom cinematográfico de motor o reentrada)
            if (thermalIllum > 0.18 && thermalRGB) {
                ctx.globalCompositeOperation = 'lighter';
                const glowR = effRad * 0.85;
                const glowGrad = ctx.createRadialGradient(hlX, hlY, 1, 0, 0, glowR);
                const glowStrength = (thermalIllum - 0.18) * 0.70 * puffAlpha;
                glowGrad.addColorStop(0.00, `rgba(${thermalRGB[0]}, ${thermalRGB[1]}, ${thermalRGB[2]}, ${glowStrength})`);
                glowGrad.addColorStop(0.50, `rgba(${thermalRGB[0]}, ${thermalRGB[1]}, ${thermalRGB[2]}, ${glowStrength * 0.35})`);
                glowGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(0, 0, glowR, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    // ── 4. RENDERIZADO DE RAYOS FRACTALES ACTIVOS ──
    if (w.lightningBolts && w.lightningBolts.length > 0) {
        ctx.save();
        for (const bolt of w.lightningBolts) {
            const lifeFrac = wxClamp(bolt.life / bolt.maxLife, 0, 1);
            const flickerIdx = Math.floor((1 - lifeFrac) * bolt.flicker.length);
            const flickerVal = bolt.flicker[flickerIdx] || 0.85;
            const boltAlpha = lifeFrac * flickerVal;
            if (boltAlpha <= 0.02) continue;

            const bCol = bolt.color;

            // Halo difuso exterior (ionización de gas)
            ctx.lineCap = 'round';
            ctx.lineJoin = 'miter';
            ctx.strokeStyle = `rgba(${bCol[0]}, ${bCol[1]}, ${bCol[2]}, ${boltAlpha * 0.45})`;
            for (const seg of bolt.segments) {
                ctx.lineWidth = seg.width * 3.8;
                ctx.beginPath();
                ctx.moveTo(seg.x0, seg.y0);
                ctx.lineTo(seg.x1, seg.y1);
                ctx.stroke();
            }

            // Núcleo blanco brillante de plasma
            ctx.strokeStyle = `rgba(255, 255, 255, ${boltAlpha * 0.98})`;
            for (const seg of bolt.segments) {
                ctx.lineWidth = Math.max(1.2, seg.width * 1.25);
                ctx.beginPath();
                ctx.moveTo(seg.x0, seg.y0);
                ctx.lineTo(seg.x1, seg.y1);
                ctx.stroke();
            }

            // Estallido de impacto en el punto de contacto en la superficie
            if (bolt.type === 'cg') {
                const impactRadius = 140 * bolt.power;
                const groundGrad = ctx.createRadialGradient(bolt.targetX, bolt.targetY, 4, bolt.targetX, bolt.targetY, impactRadius);
                groundGrad.addColorStop(0.00, `rgba(255, 255, 255, ${boltAlpha * 0.95})`);
                groundGrad.addColorStop(0.25, `rgba(${bCol[0]}, ${bCol[1]}, ${bCol[2]}, ${boltAlpha * 0.80})`);
                groundGrad.addColorStop(0.70, `rgba(${bCol[0]}, ${bCol[1]}, ${bCol[2]}, ${boltAlpha * 0.35})`);
                groundGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = groundGrad;
                ctx.beginPath();
                ctx.arc(bolt.targetX, bolt.targetY, impactRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    // ── 5. RENDERIZADO DE PARTÍCULAS DE PRECIPITACIÓN ──
    if (w.precipParticles && w.precipParticles.length > 0) {
        ctx.save();
        ctx.lineCap = 'round';

        for (const pt of w.precipParticles) {
            const lifeFrac = wxClamp(pt.life / pt.maxLife, 0, 1);
            const a = pt.alpha * lifeFrac;
            if (a <= 0.01) continue;

            const col = pt.color;

            if (pt.kind === 'snow') {
                ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${a * 0.90})`;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.len * 0.70, 0, Math.PI * 2);
                ctx.fill();
            } else if (pt.kind === 'sparkle') {
                ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${a})`;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 1.4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const spd = Math.hypot(pt.vx, pt.vy) || 1;
                const dirX = pt.vx / spd;
                const dirY = pt.vy / spd;

                ctx.strokeStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${a})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(pt.x, pt.y);
                ctx.lineTo(pt.x - dirX * pt.len, pt.y - dirY * pt.len);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    ctx.restore();
}
