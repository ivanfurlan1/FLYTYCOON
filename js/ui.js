/**
 * ÉTER - Interfaz de Usuario, Telemetría Aeroespacial, Navball Progrado y Carta Astral
 */
let holoCardTimer = null;

function updateHUD(nearestPlanet, altFromSurface, speed) {
    const maxH = ship.maxHull || 100;
    const maxF = ship.maxFuel || 100;
    const hullPct = clamp(Math.round((ship.hull / maxH) * 100), 0, 100);
    const fuelPct = clamp(Math.round((ship.fuel / maxF) * 100), 0, 100);

    const uiHullVal = document.getElementById('uiHullVal');
    if (uiHullVal) uiHullVal.textContent = `${hullPct}%`;
    const hullBar = document.getElementById('uiHullBar');
    if (hullBar) {
        hullBar.style.width = `${hullPct}%`;
        hullBar.className = `telemetry-fill h-full rounded-full ${
            hullPct < 30 ? 'bg-rose-400' : (hullPct < 60 ? 'bg-amber-300' : 'bg-stone-200')
        }`;
    }

    const uiFuelVal = document.getElementById('uiFuelVal');
    if (uiFuelVal) uiFuelVal.textContent = `${fuelPct}%`;
    const fuelBar = document.getElementById('uiFuelBar');
    if (fuelBar) fuelBar.style.width = `${fuelPct}%`;

    const uiCoresVal = document.getElementById('uiCoresVal');
    if (uiCoresVal) uiCoresVal.textContent = ship.artifacts;

    // Actualización de Telemetría de Cohete Activo y Pasaje
    const uiActiveShipName = document.getElementById('uiActiveShipName');
    const uiActiveShipPassengers = document.getElementById('uiActiveShipPassengers');
    const curModel = (typeof getRocketModel === 'function') ? getRocketModel(ship.modelKey) : null;
    if (uiActiveShipName && curModel) {
        uiActiveShipName.textContent = curModel.name.split(' ')[0].toUpperCase();
    }
    if (uiActiveShipPassengers && curModel) {
        if (curModel.passengers > 0) {
            uiActiveShipPassengers.textContent = `${curModel.passengers}P`;
            uiActiveShipPassengers.className = 'text-[8px] font-mono-num px-1 py-0.1 rounded bg-cyan-500/25 text-cyan-200 border border-cyan-400/30';
            uiActiveShipPassengers.classList.remove('hidden');
        } else {
            uiActiveShipPassengers.textContent = 'IA VTOL';
            uiActiveShipPassengers.className = 'text-[8px] font-mono-num px-1 py-0.1 rounded bg-teal-500/25 text-teal-200 border border-teal-400/30';
            uiActiveShipPassengers.classList.remove('hidden');
        }
    }

    const uiVelVal = document.getElementById('uiVelVal');
    if (uiVelVal) {
        uiVelVal.textContent = Math.round(speed * 0.1);
        // Alerta cromática si el descenso vertical es peligroso cerca del terreno
        const isFastDescent = !ship.isGrounded && altFromSurface < 950 && ship.verticalSpeed < -175;
        uiVelVal.className = `font-mono-num text-xs sm:text-sm font-semibold ${
            isFastDescent ? 'text-rose-400 animate-pulse' : 'text-stone-100'
        }`;
    }

    const uiAlt = document.getElementById('uiAltVal');
    const altMeters = ship.isGrounded ? 0 : Math.max(0, Math.round(altFromSurface * 0.1));
    if (uiAlt) {
        if (typeof astronaut !== 'undefined' && astronaut.active) {
            uiAlt.textContent = (Math.round(astronaut.altitude * 10) / 10).toFixed(1);
        } else {
            uiAlt.textContent = altMeters;
        }
    }

    if (typeof astronaut !== 'undefined' && astronaut.active) {
        const evaSpeed = Math.round(Math.abs(astronaut.vTangential) + Math.abs(astronaut.vRadial));
        if (uiVelVal) uiVelVal.textContent = evaSpeed;
    }

    // Estado de vuelo compacto (siempre 1 línea) + Micro-píldora separada de Entorno
    const stateDot = document.getElementById('uiFlightStateDot');
    const stateText = document.getElementById('uiFlightStateText');
    const envStrip = document.getElementById('uiEnvStrip');
    const envText = document.getElementById('uiEnvText');

    const envParts = [];
    if (nearestPlanet && typeof getPlanetRegionAtAngle === 'function') {
        const zenithAngle = Math.atan2(ship.y - nearestPlanet.y, ship.x - nearestPlanet.x);
        const reg = getPlanetRegionAtAngle(nearestPlanet, zenithAngle);
        if (reg && altFromSurface < (nearestPlanet.atmoRadius - nearestPlanet.radius + 600)) {
            envParts.push(reg.name);
        }
    }
    if (ship.currentSolarState && nearestPlanet && altFromSurface < (nearestPlanet.atmoRadius - nearestPlanet.radius + 400)) {
        const sol = ship.currentSolarState;
        if (sol.phase === 'day') envParts.push('☀️ Día');
        else if (sol.phase === 'sunset') envParts.push('🌅 Atardecer');
        else if (sol.phase === 'sunrise') envParts.push('🌄 Amanecer');
        else if (sol.phase === 'night') envParts.push('🌌 Noche');
    }
    if (nearestPlanet && nearestPlanet.weather && altFromSurface < (nearestPlanet.atmoRadius - nearestPlanet.radius)) {
        const w = nearestPlanet.weather;
        if (w.stormIntensity > 0.4) {
            envParts.push('⚡ Tormenta');
        } else if (w.rainIntensity > 0.22) {
            const kind = w.profile && w.profile.precip && w.profile.precip.kind;
            envParts.push(kind === 'snow' ? '❄️ Nevada' : (kind === 'ash' ? '🌋 Ceniza' : '🌧️ Lluvia'));
        }
    }

    if (envStrip && envText) {
        if (envParts.length > 0 && ship.orbitMode === 'off') {
            envText.textContent = envParts.join(' · ');
            envStrip.classList.remove('hidden');
        } else {
            envStrip.classList.add('hidden');
        }
    }

    if (stateDot && stateText) {
        if (typeof astronaut !== 'undefined' && astronaut.active) {
            stateDot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-pulse shrink-0';
            stateText.textContent = 'EVA SUPERFICIE';
        } else if (ship.orbitMode === 'locked') {
            stateDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse shrink-0';
            stateText.textContent = nearestPlanet ? `ÓRBITA · ${nearestPlanet.name.toUpperCase()}` : 'ÓRBITA ESTABLE';
        } else if (ship.orbitMode === 'inserting') {
            stateDot.className = 'w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse shrink-0';
            stateText.textContent = 'INSERCIÓN';
        } else if (ship.warping && ship.fuel > 0) {
            stateDot.className = 'w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] shrink-0';
            stateText.textContent = 'HIPERIMPULSO';
        } else if (ship.reentryIntensity > 0.15) {
            stateDot.className = 'w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_10px_#f97316] animate-pulse shrink-0';
            stateText.textContent = 'REENTRADA';
        } else if (ship.vaporConeIntensity > 0.25) {
            stateDot.className = 'w-1.5 h-1.5 rounded-full bg-sky-300 shadow-[0_0_8px_#7dd3fc] shrink-0';
            stateText.textContent = 'MACH 1+';
        } else if (ship.isGrounded) {
            stateDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0';
            stateText.textContent = 'POSADO';
        } else if (nearestPlanet && altFromSurface < (nearestPlanet.atmoRadius - nearestPlanet.radius)) {
            stateDot.className = 'w-1.5 h-1.5 rounded-full bg-sky-300 shrink-0';
            stateText.textContent = ship.currentLayerName || 'ATMÓSFERA';
        } else {
            stateDot.className = 'w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0';
            stateText.textContent = 'ESPACIO';
        }
    }

    // Actualización de la consola EVA y botones de acción
    const evaBar = document.getElementById('evaActionBar');
    const btnEVA = document.getElementById('btnEVA');
    const uiEvaBtnText = document.getElementById('uiEvaBtnText');
    const gimbalZone = document.getElementById('gimbalZone');
    const throttleConsole = document.getElementById('throttleConsole');
    const btnThrust = document.getElementById('btnThrust');
    const btnWarp = document.getElementById('btnWarp');
    const btnSonar = document.getElementById('btnSonar');
    const btnOrbit = document.getElementById('btnOrbit');
    const orbitLed = document.getElementById('orbitLed');
    const uiOrbitBtnText = document.getElementById('uiOrbitBtnText');

    // Telemetría Orbital en HUD superior
    const uiOrbitTelemetry = document.getElementById('uiOrbitTelemetry');
    if (uiOrbitTelemetry) {
        const showOrbitHud = ship.orbitalInfo && !ship.isGrounded && !(typeof astronaut !== 'undefined' && astronaut.active);
        uiOrbitTelemetry.classList.toggle('hidden', !showOrbitHud);
        if (showOrbitHud) {
            const info = ship.orbitalInfo;
            const badge = document.getElementById('uiOrbitStatusBadge');
            const reqVelEl = document.getElementById('uiOrbitReqVel');
            const peApEl = document.getElementById('uiOrbitPeAp');

            if (reqVelEl) reqVelEl.textContent = Math.round(info.circularSpeed * 0.1);

            if (badge) {
                const stMap = {
                    LOCKED: { text: 'ÓRBITA ESTABLE', cls: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40' },
                    INSERTING: { text: 'INSERCIÓN', cls: 'bg-cyan-500/25 text-cyan-200 border-cyan-400/40 animate-pulse' },
                    STABLE: { text: 'ÓRBITA LIBRE', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35' },
                    GRAZING: { text: 'ÓRBITA RASANTE', cls: 'bg-amber-500/20 text-amber-300 border-amber-400/35' },
                    ESCAPE: { text: 'ESCAPE', cls: 'bg-amber-500/20 text-amber-300 border-amber-400/35' },
                    SUBORBITAL: { text: 'SUBORBITAL', cls: 'bg-sky-500/20 text-sky-300 border-sky-400/30' }
                };
                const st = stMap[info.state] || stMap.SUBORBITAL;
                badge.textContent = st.text;
                badge.className = `px-1.5 py-0.5 rounded-full font-semibold tracking-wider border ${st.cls}`;
            }

            if (peApEl) {
                if (ship.orbitPeriapsis && ship.orbitApoapsis && !ship.trajectoryImpact) {
                    const peM = Math.round(ship.orbitPeriapsis.alt * 0.1);
                    const apM = Math.round(ship.orbitApoapsis.alt * 0.1);
                    peApEl.textContent = `${peM}m / ${apM}m`;
                } else if (ship.trajectoryImpact) {
                    peApEl.textContent = 'IMPACTO';
                } else {
                    peApEl.textContent = '—';
                }
            }
        }
    }

    if (btnOrbit) {
        if (ship.orbitMode === 'locked') {
            btnOrbit.className = 'aero-pill aero-btn px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 text-emerald-200 border-emerald-400/60 shadow-[0_0_16px_rgba(52,211,153,0.35)] whitespace-nowrap cursor-pointer';
            if (orbitLed) orbitLed.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] shrink-0';
            if (uiOrbitBtnText) uiOrbitBtnText.textContent = 'EN ÓRBITA (O)';
        } else if (ship.orbitMode === 'inserting') {
            btnOrbit.className = 'aero-pill aero-btn px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 text-cyan-100 border-cyan-400/60 shadow-[0_0_16px_rgba(34,211,238,0.35)] whitespace-nowrap cursor-pointer';
            if (orbitLed) orbitLed.className = 'w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee] animate-pulse shrink-0';
            if (uiOrbitBtnText) uiOrbitBtnText.textContent = 'ORBITANDO...';
        } else {
            btnOrbit.className = 'aero-pill aero-btn px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 text-cyan-100 border-cyan-400/20 whitespace-nowrap cursor-pointer';
            if (orbitLed) orbitLed.className = 'w-1.5 h-1.5 rounded-full bg-cyan-400/60 shrink-0';
            if (uiOrbitBtnText) uiOrbitBtnText.textContent = 'ÓRBITA (O)';
        }
    }

    if (typeof drawOrbitScope === 'function') {
        drawOrbitScope(nearestPlanet);
    }

    if (typeof astronaut !== 'undefined' && astronaut.active) {
        if (evaBar) {
            evaBar.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
            evaBar.classList.add('opacity-100', 'translate-y-0');
        }
        if (uiEvaBtnText) uiEvaBtnText.textContent = 'ABORDAJE (F)';
        if (btnEVA) {
            btnEVA.classList.add('border-emerald-400/60', 'text-emerald-200');
            btnEVA.classList.remove('border-amber-400/30', 'text-amber-200');
        }

        const closestShipInfo = (typeof getClosestShipToAstronaut === 'function') ? getClosestShipToAstronaut() : { shipObj: ship, dist: Math.hypot(astronaut.x - ship.x, astronaut.y - ship.y) };
        const distToShip = closestShipInfo.dist;
        const uiEvaFuelText = document.getElementById('uiEvaFuelText');
        const uiEvaDistText = document.getElementById('uiEvaDistText');
        if (uiEvaFuelText) uiEvaFuelText.textContent = `${Math.round(astronaut.jetpackFuel)}%`;
        if (uiEvaDistText) uiEvaDistText.textContent = `${Math.round(distToShip * 0.1 * 10) / 10}m`;

        const btnEvaBoard = document.getElementById('btnEvaBoard');
        if (btnEvaBoard) {
            const targetMod = (typeof getRocketModel === 'function') ? getRocketModel(closestShipInfo.shipObj.modelKey) : null;
            const shortTargetName = targetMod ? targetMod.name.split(' ')[0] : 'Sonda';
            const boardSpan = btnEvaBoard.querySelector('span');
            if (boardSpan) boardSpan.textContent = `Abordar ${shortTargetName} (F)`;
        }

        const p = astronaut.planet;
        if (p) {
            const shipZenith = Math.atan2(ship.y - p.y, ship.x - p.x);
            const tilt = Math.atan2(Math.sin(ship.angle - shipZenith), Math.cos(ship.angle - shipZenith));
            const isShipTilted = Math.abs(tilt) > 0.32;
            const btnRight = document.getElementById('btnEvaRightShip');
            const rightBar = document.getElementById('uiRightShipBar');
            if (btnRight) {
                btnRight.classList.toggle('hidden', !(isShipTilted && distToShip < 60));
            }
            if (rightBar) {
                rightBar.style.width = `${Math.round(astronaut.actionProgress * 100)}%`;
            }

            const btnRepair = document.getElementById('btnEvaRepairShip');
            if (btnRepair) {
                btnRepair.classList.toggle('hidden', !(ship.hull < 99.0 && !isShipTilted && distToShip < 52));
            }

            // Actualización de Interfaz de Construcción y Mejora de Base Planetaria
            const uiBuildBaseLabel = document.getElementById('uiBuildBaseLabel');
            const uiBuildBaseLvlBadge = document.getElementById('uiBuildBaseLvlBadge');
            const uiBuildBaseBar = document.getElementById('uiBuildBaseBar');
            const nearbyBase = (typeof findNearbyBase === 'function') ? findNearbyBase(p, astronaut.angle, 1.05) : null;
            const currentSelectedLvl = astronaut.selectedBaseLevel || 1;

            if (nearbyBase) {
                if (nearbyBase.level < 3) {
                    const nextLvl = nearbyBase.level + 1;
                    if (uiBuildBaseLabel) uiBuildBaseLabel.textContent = `Mejorar a Nv.${nextLvl} (C)`;
                    if (uiBuildBaseLvlBadge) {
                        uiBuildBaseLvlBadge.textContent = `NV.${nearbyBase.level}➔${nextLvl}`;
                        uiBuildBaseLvlBadge.className = 'text-[8px] font-mono-num px-1 py-0.2 rounded bg-amber-400/25 text-amber-300 border border-amber-400/40';
                    }
                } else {
                    if (uiBuildBaseLabel) uiBuildBaseLabel.textContent = 'Base Nv.3 Completa';
                    if (uiBuildBaseLvlBadge) {
                        uiBuildBaseLvlBadge.textContent = 'MÁX';
                        uiBuildBaseLvlBadge.className = 'text-[8px] font-mono-num px-1 py-0.2 rounded bg-emerald-400/25 text-emerald-300 border border-emerald-400/40';
                    }
                }
            } else {
                if (uiBuildBaseLabel) uiBuildBaseLabel.textContent = 'Construir Base (C)';
                if (uiBuildBaseLvlBadge) {
                    uiBuildBaseLvlBadge.textContent = `NV.${currentSelectedLvl}`;
                    uiBuildBaseLvlBadge.className = 'text-[8px] font-mono-num px-1 py-0.2 rounded bg-sky-400/20 text-sky-300 border border-sky-400/30';
                }
            }

            if (uiBuildBaseBar) {
                const isBuilding = (astronaut.actionType === 'build_base');
                uiBuildBaseBar.style.width = isBuilding ? `${Math.round(astronaut.actionProgress * 100)}%` : '0%';
            }

            // Actualización de Interfaz de Construcción de Cohetes en EVA
            const uiBuildRocketBar = document.getElementById('uiBuildRocketBar');
            const uiCurrentRocketBadge = document.getElementById('uiCurrentRocketBadge');
            const selRocketModel = (typeof getRocketModel === 'function') ? getRocketModel(astronaut.selectedRocketModel || 'starship') : null;
            if (uiCurrentRocketBadge && selRocketModel) {
                uiCurrentRocketBadge.textContent = selRocketModel.badge.toUpperCase();
            }
            if (uiBuildRocketBar) {
                const isBuildingRocket = (astronaut.actionType === 'build_rocket');
                uiBuildRocketBar.style.width = isBuildingRocket ? `${Math.round(astronaut.actionProgress * 100)}%` : '0%';
            }

            // Resaltar botón de nivel seleccionado en la barra EVA
            for (let l = 1; l <= 3; l++) {
                const btnLvl = document.getElementById(`btnBaseLvl${l}`);
                if (btnLvl) {
                    const isSelected = (currentSelectedLvl === l);
                    if (isSelected) {
                        btnLvl.className = 'px-1.5 py-1 rounded-lg text-[8.5px] font-mono-num font-semibold text-sky-200 bg-sky-500/30 border border-sky-400/60 shadow-[0_0_8px_rgba(56,189,248,0.3)] cursor-pointer transition-all';
                    } else {
                        btnLvl.className = 'px-1.5 py-1 rounded-lg text-[8.5px] font-mono-num font-semibold text-slate-400 hover:text-white cursor-pointer transition-all';
                    }
                }
            }
        }

        if (gimbalZone) gimbalZone.style.opacity = '0.35';
        if (throttleConsole) throttleConsole.style.opacity = '0.35';
        else if (btnThrust) btnThrust.style.opacity = '0.35';
        if (btnWarp) btnWarp.style.opacity = '0.35';
        if (btnSonar) btnSonar.style.opacity = '0.35';
        if (btnOrbit) btnOrbit.style.opacity = '0.35';
    } else {
        if (evaBar) {
            evaBar.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
            evaBar.classList.remove('opacity-100', 'translate-y-0');
        }
        if (uiEvaBtnText) uiEvaBtnText.textContent = 'EVA (F)';
        if (btnEVA) {
            const canDisembark = ship.isGrounded || (nearestPlanet && altMeters < 3 && speed < 18);
            btnEVA.classList.toggle('shadow-[0_0_18px_rgba(245,158,11,0.5)]', canDisembark);
            btnEVA.classList.toggle('border-amber-400', canDisembark);
            btnEVA.classList.remove('border-emerald-400/60', 'text-emerald-200');
            btnEVA.classList.add('text-amber-200');
        }

        if (gimbalZone) gimbalZone.style.opacity = '1';
        if (throttleConsole) throttleConsole.style.opacity = '1';
        else if (btnThrust) btnThrust.style.opacity = '1';
        if (btnWarp) btnWarp.style.opacity = '1';
        if (btnSonar) btnSonar.style.opacity = '1';
        if (btnOrbit) btnOrbit.style.opacity = '1';
    }

    // Indicador SAS de auto-alineación
    const sasBadge = document.getElementById('uiSasBadge');
    if (sasBadge) {
        if (ship.sasEnabled) {
            sasBadge.className = 'sas-badge active px-1.5 sm:px-2 py-0.5 rounded-full border text-[8.5px] sm:text-[9px] font-mono-num font-semibold cursor-pointer whitespace-nowrap';
            sasBadge.textContent = ship.sasAssistWeight > 0.2 ? 'SAS ON' : 'SAS ESPERA';
            sasBadge.title = 'Asistencia de Horizonte Activa (Pulsa T para alternar a Manual)';
        } else {
            sasBadge.className = 'sas-badge manual px-1.5 sm:px-2 py-0.5 rounded-full border text-[8.5px] sm:text-[9px] font-mono-num font-semibold cursor-pointer whitespace-nowrap';
            sasBadge.textContent = 'MANUAL';
            sasBadge.title = 'Control 100% Manual Libre (Pulsa T para activar Asistencia)';
        }
    }

    // Navball: actitud en tiempo real RESPECTO AL HORIZONTE EN PANTALLA
    const screenAngle = ship.angle + camera.rotation;
    const deg = (((screenAngle * 180 / Math.PI) + 90) % 360 + 360) % 360;
    const actualNeedle = document.getElementById('gimbalActualNeedle');
    if (actualNeedle) actualNeedle.style.transform = `rotate(${deg}deg)`;
    const headingDeg = document.getElementById('uiHeadingDeg');
    if (headingDeg) headingDeg.textContent = `${String(Math.round(deg)).padStart(3, '0')}°`;

    // Marcador Progrado de Velocidad en el Navball (muestra hacia dónde viaja realmente el cohete)
    const progradeNeedle = document.getElementById('gimbalProgradeNeedle');
    if (progradeNeedle) {
        if (!ship.isGrounded && speed > 15) {
            const velScreenAngle = ship.velAngle + camera.rotation;
            const velDeg = (((velScreenAngle * 180 / Math.PI) + 90) % 360 + 360) % 360;
            progradeNeedle.style.transform = `rotate(${velDeg}deg)`;
            progradeNeedle.classList.remove('opacity-0');
        } else {
            progradeNeedle.classList.add('opacity-0');
        }
    }

    // Barra graduable de potencia y empuje activo en tiempo real
    const setThrottle = clamp(ship.throttle !== undefined ? ship.throttle : 0.0, 0, 1);
    const effectiveThrottle = ship.thrusting ? 1.0 : setThrottle;
    const liveThr = clamp(ship.thrustIntensity, 0, 1);
    const setFill = document.getElementById('throttleSetFill');
    const liveFill = document.getElementById('throttleLiveFill');
    const thumb = document.getElementById('throttleThumb');
    const throttlePct = document.getElementById('uiThrottlePct');
    const isWarping = Boolean(ship.warping && ship.fuel > 0);
    const isFiring = Boolean((ship.thrusting || setThrottle > 0.005) && ship.fuel > 0 && !isWarping);

    if (setFill) {
        setFill.style.height = `${(effectiveThrottle * 100).toFixed(1)}%`;
    }
    if (liveFill) {
        liveFill.style.height = `${(liveThr * 100).toFixed(1)}%`;
    }
    if (thumb) {
        thumb.style.bottom = `calc(${(effectiveThrottle * 100).toFixed(1)}% - 5px)`;
    }
    if (throttlePct) {
        if (isWarping) {
            throttlePct.textContent = 'WARP';
        } else if (ship.fuel <= 0 && (ship.thrusting || setThrottle > 0.005 || ship.warping)) {
            throttlePct.textContent = '0%';
        } else {
            throttlePct.textContent = `${Math.round(effectiveThrottle * 100)}%`;
        }
        throttlePct.classList.toggle('text-sky-300', isWarping);
        throttlePct.classList.toggle('text-amber-300', !isWarping);
    }

    if (throttleConsole) {
        throttleConsole.classList.toggle('is-firing', isFiring);
        throttleConsole.classList.toggle('is-warping', isWarping);
    }

    if (typeof updateNavHUD === 'function') {
        updateNavHUD();
    }
}

function showHoloCard(p, customTitle = null, customDesc = null) {
    const card = document.getElementById('planetHoloCard');
    if (!card) return;
    const dot = document.getElementById('holoDot');
    const title = document.getElementById('holoPlanetName');
    const badge = document.getElementById('holoBiomeBadge');
    const status = document.getElementById('holoStatusText');

    const rimCol = (p.colors && p.colors.rimColor) || p.archetype.rimColor;
    const sizeTag = p.sizeClass ? p.sizeClass.tag : (p.archetype.surfaceTag || 'PLANETA');

    title.textContent = customTitle || p.name;
    let tagExtra = '';
    if (p.isHollow) tagExtra = ' · 🕳️ CUEVAS INTERIORES';
    else if (p.isSuperVolcano) tagExtra = ' · 🌋 SUPER-VOLCÁN';
    else if (p.archetype.isAlpineTitans) tagExtra = ' · 🏔️ CORDILLERA TITÁNICA';
    else if (p.archetype.isZenDunes) tagExtra = ' · 🏜️ DUNAS ZEN';
    else if (p.archetype.hasMultiLakes) tagExtra = ' · 🌊 ARCHIPIÉLAGO LACUSTRE';
    if (p.creatures && p.creatures.length > 0) tagExtra += ' · 🐾 FAUNA DETECTADA';
    else tagExtra += ' · 🪐 MUNDO INERTE';

    badge.textContent = `${sizeTag} · ${p.archetype.surfaceTag}${tagExtra}`;
    badge.className = `text-[9px] font-mono-num uppercase tracking-wider px-2 py-0.5 rounded-md border ${
        p.archetype.isLiquid
            ? 'bg-rose-500/15 text-rose-200 border-rose-400/30'
            : (p.creatures && p.creatures.length > 0 ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30' : 'bg-white/[0.06] text-stone-200 border-white/10')
    }`;

    dot.style.backgroundColor = rgbStr(rimCol, 1);
    dot.style.boxShadow = `0 0 10px ${rgbStr(rimCol, 0.9)}`;

    if (customDesc) {
        status.textContent = customDesc;
    } else {
        const curZenith = Math.atan2(ship.y - p.y, ship.x - p.x);
        const curReg = typeof getPlanetRegionAtAngle === 'function' ? getPlanetRegionAtAngle(p, curZenith) : null;
        const regInfo = curReg ? ` | ${curReg.name} (${curReg.def.name})` : '';
        const gravVal = (p.gravityForce / 285).toFixed(1);
        const faunaInfo = (p.creatures && p.creatures.length > 0)
            ? ` · Fauna: ${p.creaturesSummary || `${p.creatures.length} seres detectados`}`
            : ' · Mundo Inerte (Sin seres vivos)';
        status.textContent = `Gravedad: ${gravVal}G · Peligro: ${p.hazardLevel}${regInfo}${faunaInfo}. ${p.archetype.desc}`;
    }

    card.classList.remove('opacity-0', '-translate-y-3');
    card.classList.add('opacity-100', 'translate-y-0');

    if (holoCardTimer) clearTimeout(holoCardTimer);
    holoCardTimer = setTimeout(() => {
        card.classList.remove('opacity-100', 'translate-y-0');
        card.classList.add('opacity-0', '-translate-y-3');
    }, 4500);
}

function registerCodex(p) {
    if (!codexPlanets.has(p.key)) {
        const rimCol = (p.colors && p.colors.rimColor) || p.archetype.rimColor;
        const sizeTag = p.sizeClass ? p.sizeClass.tag : 'PLANETA';
        const mineralsStr = (p.minerals || []).map(m => m.name).slice(0, 3).join(', ') || 'Silicato estándar';
        const regionsStr = (p.regions || []).map(r => r.name).slice(0, 3).join(' · ');
        const structuresStr = (p.structures || []).map(s => s.name).slice(0, 3).join(' · ');

        codexPlanets.set(p.key, {
            name: p.name,
            type: p.archetype.typeLabel,
            surface: p.archetype.surfaceTag,
            sizeTag,
            sizeName: p.sizeClass ? p.sizeClass.name : 'Estándar',
            isLiquid: p.archetype.isLiquid,
            hasRings: p.hasRings,
            lakesCount: (p.lakes && p.lakes.length > 0) ? p.lakes.length : 0,
            color: rgbStr(rimCol, 1),
            gravity: `${(p.gravityForce / 285).toFixed(1)}G`,
            atmo: `${(p.atmoDensity || 1).toFixed(2)} atm`,
            rotation: `${p.rotationPeriod || 260}s (${(p.rotationSpeed > 0 ? 'Directa' : 'Retrógrada')})`,
            hazard: p.hazardLevel,
            minerals: mineralsStr,
            regions: regionsStr,
            structures: structuresStr,
            fauna: (p.creatures && p.creatures.length > 0)
                ? (p.creaturesSummary || `${p.creatures.length} seres detectados`)
                : 'Mundo Inerte (Sin seres vivos)',
            hasLife: (p.creatures && p.creatures.length > 0),
            speciesMetaList: p.speciesMetaList || [],
            desc: p.archetype.desc
        });
        renderCodexList();
    }
}

function renderCodexList() {
    const list = document.getElementById('codexList');
    if (!list) return;
    const badge = document.getElementById('codexCountBadge');
    if (badge) badge.textContent = `${codexPlanets.size} ${codexPlanets.size === 1 ? 'descubierto' : 'descubiertos'}`;
    list.innerHTML = '';

    Array.from(codexPlanets.values()).reverse().forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex flex-col gap-2 hover:bg-white/[0.05] transition-all';
        div.innerHTML = `
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-2.5">
                    <span class="w-3 h-3 rounded-full mt-1 shrink-0" style="background:${item.color}; box-shadow:0 0 10px ${item.color}"></span>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-display font-semibold text-white text-sm sm:text-base">${item.name}</span>
                            <span class="text-[9px] font-mono-num uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-200 border border-amber-400/30">${item.sizeTag}</span>
                            ${item.hasRings ? '<span class="text-[9px] font-mono-num uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-400/15 text-sky-200 border border-sky-400/30">ANILLOS 3D</span>' : ''}
                            ${item.lakesCount ? `<span class="text-[9px] font-mono-num uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-400/15 text-teal-200 border border-teal-400/30">${item.lakesCount} LAGOS</span>` : ''}
                        </div>
                        <span class="text-xs text-slate-300 font-mono-num">${item.type} // ${item.surface}</span>
                    </div>
                </div>
                <div class="flex flex-col items-end shrink-0">
                    <span class="text-[10px] font-mono-num text-slate-400">GRAV: <strong class="text-white">${item.gravity}</strong></span>
                    <span class="text-[10px] font-mono-num text-slate-400">ATM: <strong class="text-sky-300">${item.atmo}</strong></span>
                    ${item.rotation ? `<span class="text-[9px] font-mono-num text-slate-400">DÍA/ROT: <strong class="text-amber-300/90 font-normal">${item.rotation}</strong></span>` : ''}
                </div>
            </div>

            <p class="text-[11px] text-slate-300/90 leading-relaxed">${item.desc}</p>

            <div class="pt-1.5 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-mono-num text-slate-400 flex-wrap gap-2">
                <div>MINERALES: <strong class="text-amber-200/90 font-normal">${item.minerals}</strong></div>
                <div class="text-[9px] px-1.5 py-0.5 rounded ${
                    item.hazard === 'Seguro' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20' :
                    (item.hazard === 'Peligro Crítico' ? 'bg-rose-500/15 text-rose-300 border border-rose-400/20' : 'bg-amber-500/15 text-amber-300 border border-amber-400/20')
                }">${item.hazard}</div>
            </div>
            ${item.regions ? `<div class="text-[9.5px] font-mono-num text-slate-400">BIOMAS: <span class="text-slate-300">${item.regions}</span></div>` : ''}
            ${item.structures ? `<div class="text-[9.5px] font-mono-num text-slate-400">ESTRUCTURAS: <span class="text-sky-300/90">${item.structures}</span></div>` : ''}
            <div class="text-[9.5px] font-mono-num flex items-center gap-1.5 flex-wrap">
                <span class="text-slate-400">FAUNA:</span>
                ${item.hasLife ? `
                    <span class="text-emerald-300 font-medium">${item.fauna}</span>
                ` : `
                    <span class="text-stone-400 italic">Mundo inerte (Sin seres vivos)</span>
                `}
            </div>
            ${(item.speciesMetaList && item.speciesMetaList.length > 0) ? `
                <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
                    ${item.speciesMetaList.map(sp => `
                        <span class="text-[8.5px] font-mono-num px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10" style="color:${sp.tagColor}">
                            ★ ${sp.name} [${sp.temperament}]
                        </span>
                    `).join('')}
                </div>
            ` : ''}
        `;
        list.appendChild(div);
    });
}

// ============================================================================
// SISTEMA DE NAVEGACIÓN ASTRAL Y CARTA CELESTIAL INTERACTIVA
// ============================================================================

// Registro de planetas con indicación activa de rumbo (Waypoints fijados por el usuario)
window.navWaypoints = window.navWaypoints || new Map();

/**
 * Comprueba si un planeta tiene indicación de navegación activa
 */
function isPlanetWaypointed(planetKey) {
    if (!planetKey) return false;
    return window.navWaypoints.has(planetKey);
}

/**
 * Añade o retira la indicación de navegación hacia un planeta
 */
function togglePlanetWaypoint(planet) {
    if (!planet) return false;
    const key = planet.key;
    if (window.navWaypoints.has(key)) {
        window.navWaypoints.delete(key);
        if (typeof showHoloCard === 'function') {
            showHoloCard(planet, 'RUMBO ELIMINADO', `Se ha retirado el marcador de navegación hacia ${planet.name}.`);
        }
        updateNavHUD();
        updateStarMapDossier(planet);
        updateStarMapDirectory();
        return false;
    } else {
        window.navWaypoints.set(key, planet);
        if (typeof showHoloCard === 'function') {
            showHoloCard(planet, 'RUMBO FIJADO', `Indicaciones activadas hacia ${planet.name}. Sigue la retícula y el indicador HUD.`);
        }
        if (typeof audio !== 'undefined' && audio) {
            if (typeof audio.playChime === 'function') audio.playChime();
        }
        updateNavHUD();
        updateStarMapDossier(planet);
        updateStarMapDirectory();
        return true;
    }
}

/**
 * Borra todas las indicaciones de rumbo activas
 */
function clearAllWaypoints() {
    window.navWaypoints.clear();
    updateNavHUD();
    if (starMapState.selectedPlanet) {
        updateStarMapDossier(starMapState.selectedPlanet);
    }
    updateStarMapDirectory();
}

/**
 * Actualiza el banner de navegación flotante en la pantalla principal del simulador
 */
function updateNavHUD() {
    const banner = document.getElementById('uiNavTargetBanner');
    if (!banner) return;

    if (!window.navWaypoints || window.navWaypoints.size === 0) {
        banner.classList.add('hidden');
        return;
    }

    // Tomamos el primer planeta marcado como destino principal
    const firstKey = window.navWaypoints.keys().next().value;
    const target = window.navWaypoints.get(firstKey);
    if (!target) {
        banner.classList.add('hidden');
        return;
    }

    banner.classList.remove('hidden');

    const nameEl = document.getElementById('uiNavTargetName');
    const distEl = document.getElementById('uiNavTargetDist');
    const etaEl = document.getElementById('uiNavTargetEta');

    if (nameEl) nameEl.textContent = target.name.toUpperCase();

    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const dist = Math.hypot(dx, dy);
    const surfaceDist = Math.max(0, dist - target.radius);
    const meters = Math.round(surfaceDist * 0.1);

    if (distEl) {
        distEl.textContent = meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
    }

    if (etaEl) {
        const unitX = dist > 0.001 ? dx / dist : 0;
        const unitY = dist > 0.001 ? dy / dist : 0;
        const approachSpeed = (ship.vx * unitX + ship.vy * unitY);
        if (approachSpeed > 12) {
            const etaSec = Math.round((surfaceDist * 0.1) / (approachSpeed * 0.1));
            if (etaSec > 0 && etaSec < 999) {
                etaEl.textContent = `ETA ~${etaSec}s`;
                etaEl.classList.remove('hidden');
            } else {
                etaEl.classList.add('hidden');
            }
        } else {
            etaEl.classList.add('hidden');
        }
    }
}

// --- ESTADO Y CONTROLADOR DE LA CARTA ASTRAL INTERACTIVA ---
const starMapState = {
    camX: 0,
    camY: 0,
    zoom: 0.00085,
    minZoom: 0.00008,
    maxZoom: 0.045,
    targetCamX: 0,
    targetCamY: 0,
    targetZoom: 0.00085,
    selectedPlanet: null,
    hoveredPlanet: null,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragCamStartX: 0,
    dragCamStartY: 0,
    hasMoved: false,
    filter: 'all',          // 'all', 'waypoints', 'life', 'rings'
    searchQuery: '',
    animFrameId: null,
    initialized: false,
    touchDist: 0,
    touchZoomStart: 0.0055,
    stars: []
};

// Generación inicial de estrellas de fondo para la carta astral
for (let i = 0; i < 90; i++) {
    starMapState.stars.push({
        x: (Math.random() - 0.5) * 4000,
        y: (Math.random() - 0.5) * 4000,
        r: Math.random() * 1.4 + 0.6,
        alpha: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 2 + 1
    });
}

/**
 * Inicializa los escuchadores de eventos interactivos para la Carta Astral
 */
function initStarMap() {
    if (starMapState.initialized) return;
    const canvas = document.getElementById('starMapCanvas');
    if (!canvas) return;

    starMapState.initialized = true;

    // Rueda del ratón: Zoom centrado en la posición del puntero
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const cx = rect.width * 0.5;
        const cy = rect.height * 0.5;

        // Coordenadas de mundo antes del zoom
        const worldX = starMapState.camX + (mouseX - cx) / starMapState.zoom;
        const worldY = starMapState.camY + (mouseY - cy) / starMapState.zoom;

        const factor = e.deltaY < 0 ? 1.25 : 0.8;
        const nextZoom = clamp(starMapState.targetZoom * factor, starMapState.minZoom, starMapState.maxZoom);

        starMapState.targetZoom = nextZoom;
        // Ajustamos la cámara para mantener el punto bajo el cursor quieto
        starMapState.targetCamX = worldX - (mouseX - cx) / nextZoom;
        starMapState.targetCamY = worldY - (mouseY - cy) / nextZoom;
    }, { passive: false });

    // Arrastre con ratón (Pan)
    canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        starMapState.isDragging = true;
        starMapState.hasMoved = false;
        starMapState.dragStartX = e.clientX;
        starMapState.dragStartY = e.clientY;
        starMapState.dragCamStartX = starMapState.camX;
        starMapState.dragCamStartY = starMapState.camY;
    });

    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const isInside = (mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height);

        if (starMapState.isDragging) {
            const dx = e.clientX - starMapState.dragStartX;
            const dy = e.clientY - starMapState.dragStartY;
            if (Math.hypot(dx, dy) > 4) {
                starMapState.hasMoved = true;
            }
            starMapState.targetCamX = starMapState.dragCamStartX - dx / starMapState.zoom;
            starMapState.targetCamY = starMapState.dragCamStartY - dy / starMapState.zoom;
            starMapState.camX = starMapState.targetCamX;
            starMapState.camY = starMapState.targetCamY;
        }

        if (isInside && !mapModal.classList.contains('hidden')) {
            // Actualización de coordenadas del cursor en la interfaz
            const cx = rect.width * 0.5;
            const cy = rect.height * 0.5;
            const curWorldX = Math.round(starMapState.camX + (mouseX - cx) / starMapState.zoom);
            const curWorldY = Math.round(starMapState.camY + (mouseY - cy) / starMapState.zoom);
            const coordEl = document.getElementById('uiMapCursorCoord');
            if (coordEl) coordEl.textContent = `X: ${curWorldX} | Y: ${curWorldY}`;

            // Detección de planeta bajo el cursor (Hover)
            const hovered = getPlanetAtMapPos(mouseX, mouseY, rect.width, rect.height);
            starMapState.hoveredPlanet = hovered;
            canvas.style.cursor = hovered ? 'pointer' : (starMapState.isDragging ? 'grabbing' : 'grab');
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (!starMapState.isDragging) return;
        starMapState.isDragging = false;
        canvas.style.cursor = 'grab';

        // Si no se arrastró significativamente, es un CLIC para seleccionar planeta
        if (!starMapState.hasMoved) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            if (mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height) {
                const clicked = getPlanetAtMapPos(mouseX, mouseY, rect.width, rect.height);
                selectStarMapPlanet(clicked);
            }
        }
    });

    // Soporte Táctil Móvil (Pan y Pinch Zoom)
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            starMapState.isDragging = true;
            starMapState.hasMoved = false;
            starMapState.dragStartX = e.touches[0].clientX;
            starMapState.dragStartY = e.touches[0].clientY;
            starMapState.dragCamStartX = starMapState.camX;
            starMapState.dragCamStartY = starMapState.camY;
        } else if (e.touches.length === 2) {
            starMapState.isDragging = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            starMapState.touchDist = Math.hypot(dx, dy);
            starMapState.touchZoomStart = starMapState.zoom;
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && starMapState.isDragging) {
            const dx = e.touches[0].clientX - starMapState.dragStartX;
            const dy = e.touches[0].clientY - starMapState.dragStartY;
            if (Math.hypot(dx, dy) > 5) starMapState.hasMoved = true;
            starMapState.targetCamX = starMapState.dragCamStartX - dx / starMapState.zoom;
            starMapState.targetCamY = starMapState.dragCamStartY - dy / starMapState.zoom;
            starMapState.camX = starMapState.targetCamX;
            starMapState.camY = starMapState.targetCamY;
        } else if (e.touches.length === 2 && starMapState.touchDist > 0) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDist = Math.hypot(dx, dy);
            const scaleFactor = currentDist / starMapState.touchDist;
            starMapState.targetZoom = clamp(starMapState.touchZoomStart * scaleFactor, starMapState.minZoom, starMapState.maxZoom);
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (starMapState.isDragging && !starMapState.hasMoved && e.changedTouches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.changedTouches[0].clientX - rect.left;
            const mouseY = e.changedTouches[0].clientY - rect.top;
            const clicked = getPlanetAtMapPos(mouseX, mouseY, rect.width, rect.height);
            selectStarMapPlanet(clicked);
        }
        starMapState.isDragging = false;
        starMapState.touchDist = 0;
    });

    // Controles de Botones de Interfaz
    const btnZoomIn = document.getElementById('btnMapZoomIn');
    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => {
            starMapState.targetZoom = clamp(starMapState.targetZoom * 1.4, starMapState.minZoom, starMapState.maxZoom);
        });
    }

    const btnZoomOut = document.getElementById('btnMapZoomOut');
    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => {
            starMapState.targetZoom = clamp(starMapState.targetZoom * 0.72, starMapState.minZoom, starMapState.maxZoom);
        });
    }

    const btnCenterShip = document.getElementById('btnMapCenterShip');
    if (btnCenterShip) {
        btnCenterShip.addEventListener('click', () => {
            starMapState.targetCamX = ship.x;
            starMapState.targetCamY = ship.y;
            starMapState.targetZoom = 0.0065;
        });
    }

    // Botón principal de Dossier: AÑADIR / QUITAR INDICACIÓN
    const btnToggleWaypoint = document.getElementById('btnMapToggleWaypoint');
    if (btnToggleWaypoint) {
        btnToggleWaypoint.addEventListener('click', () => {
            if (starMapState.selectedPlanet) {
                togglePlanetWaypoint(starMapState.selectedPlanet);
            }
        });
    }

    // Botón de Centrar en el Planeta Seleccionado
    const btnFocusPlanet = document.getElementById('btnMapFocusPlanet');
    if (btnFocusPlanet) {
        btnFocusPlanet.addEventListener('click', () => {
            if (starMapState.selectedPlanet) {
                starMapState.targetCamX = starMapState.selectedPlanet.x;
                starMapState.targetCamY = starMapState.selectedPlanet.y;
                starMapState.targetZoom = 0.012;
            }
        });
    }

    // Botón de Escanear Planeta
    const btnScanPlanet = document.getElementById('btnMapScanPlanet');
    if (btnScanPlanet) {
        btnScanPlanet.addEventListener('click', () => {
            const p = starMapState.selectedPlanet;
            if (p) {
                p.scanned = true;
                registerCodex(p);
                if (typeof audio !== 'undefined' && audio && audio.playScanner) {
                    audio.playScanner();
                }
                updateStarMapDossier(p);
                updateStarMapDirectory();
                if (typeof showHoloCard === 'function') {
                    showHoloCard(p, 'SEÑAL CATALOGADA', `${p.name} analizado con éxito.`);
                }
            }
        });
    }

    // Botón de Limpiar Todas las Indicaciones
    const btnClearAll = document.getElementById('btnMapClearAllWaypoints');
    if (btnClearAll) {
        btnClearAll.addEventListener('click', clearAllWaypoints);
    }

    // Botón para volver al directorio desde el dossier
    const btnBackDir = document.getElementById('btnMapBackToDirectory');
    if (btnBackDir) {
        btnBackDir.addEventListener('click', () => {
            selectStarMapPlanet(null);
        });
    }

    // Buscador interactivo de planetas
    const inSearch = document.getElementById('inMapSearch');
    if (inSearch) {
        inSearch.addEventListener('input', (e) => {
            starMapState.searchQuery = (e.target.value || '').trim().toLowerCase();
            updateStarMapDirectory();
        });
        inSearch.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') {
                e.preventDefault();
                // Si hay coincidencia, seleccionamos y centramos
                const planets = getNearbyPlanets(starMapState.camX, starMapState.camY, 2);
                const matched = planets.find(p => p.name.toLowerCase().includes(starMapState.searchQuery));
                if (matched) {
                    selectStarMapPlanet(matched);
                    starMapState.targetCamX = matched.x;
                    starMapState.targetCamY = matched.y;
                    starMapState.targetZoom = 0.012;
                }
            }
        });
    }

    // Botones de Filtro
    const filterBtns = document.querySelectorAll('.map-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.className = 'map-filter-btn px-2 py-1 rounded-lg text-[9px] font-mono-num border border-white/10 bg-black/40 text-stone-400 hover:text-white cursor-pointer';
            });
            btn.className = 'map-filter-btn px-2 py-1 rounded-lg text-[9px] font-mono-num border border-amber-400/50 bg-amber-500/20 text-amber-200 cursor-pointer';
            starMapState.filter = btn.getAttribute('data-filter') || 'all';
            updateStarMapDirectory();
        });
    });

    // Interacción con Banner HUD Superior
    const hudClickArea = document.getElementById('uiNavTargetClickArea');
    if (hudClickArea) {
        hudClickArea.addEventListener('click', () => {
            const firstKey = window.navWaypoints.keys().next().value;
            const target = window.navWaypoints.get(firstKey);
            openMapModal(target);
        });
    }
    const btnClearNav = document.getElementById('uiBtnClearNav');
    if (btnClearNav) {
        btnClearNav.addEventListener('click', (e) => {
            e.stopPropagation();
            clearAllWaypoints();
        });
    }
}

/**
 * Encuentra el planeta bajo la posición de pantalla del canvas del mapa
 */
function getPlanetAtMapPos(canvasMouseX, canvasMouseY, canvasW, canvasH) {
    const cx = canvasW * 0.5;
    const cy = canvasH * 0.5;
    const worldX = starMapState.camX + (canvasMouseX - cx) / starMapState.zoom;
    const worldY = starMapState.camY + (canvasMouseY - cy) / starMapState.zoom;

    const planets = getNearbyPlanets(starMapState.camX, starMapState.camY, 2);
    // Incluir también planetas con rumbos activos
    for (const wp of window.navWaypoints.values()) {
        if (!planets.some(p => p.key === wp.key)) planets.push(wp);
    }

    let closest = null;
    let minDist = Infinity;

    for (const p of planets) {
        const d = Math.hypot(p.x - worldX, p.y - worldY);
        // Radio de detección: tamaño del planeta o mínimo 24 píxeles en pantalla
        const hitRadius = Math.max(p.radius, 24 / starMapState.zoom);
        if (d < hitRadius && d < minDist) {
            minDist = d;
            closest = p;
        }
    }
    return closest;
}

/**
 * Selecciona un planeta para mostrar en el Dossier táctico
 */
function selectStarMapPlanet(p) {
    starMapState.selectedPlanet = p;
    const dossierView = document.getElementById('mapDossierView');
    const directoryView = document.getElementById('mapDirectoryView');

    if (p) {
        if (dossierView) dossierView.classList.remove('hidden');
        if (directoryView) directoryView.classList.add('hidden');
        updateStarMapDossier(p);
    } else {
        if (dossierView) dossierView.classList.add('hidden');
        if (directoryView) directoryView.classList.remove('hidden');
        updateStarMapDirectory();
    }
}

/**
 * Actualiza el panel de Dossier con toda la información y estado del botón de indicación
 */
function updateStarMapDossier(p) {
    if (!p) return;
    const nameEl = document.getElementById('dossierPlanetName');
    const sizeBadge = document.getElementById('dossierSizeBadge');
    const typeSub = document.getElementById('dossierTypeSubtitle');
    const avatarSphere = document.getElementById('dossierAvatarSphere');
    const distEl = document.getElementById('dossierDist');
    const bearingEl = document.getElementById('dossierBearing');
    const gravEl = document.getElementById('dossierGravity');
    const atmoEl = document.getElementById('dossierAtmo');
    const hazardBadge = document.getElementById('dossierHazardBadge');
    const faunaEl = document.getElementById('dossierFauna');
    const mineralsEl = document.getElementById('dossierMinerals');
    const descEl = document.getElementById('dossierDesc');

    const rimCol = (p.colors && p.colors.rimColor) || (p.archetype && p.archetype.rimColor) || [245, 158, 11];
    const colStr = rgbStr(rimCol, 1);

    if (nameEl) nameEl.textContent = p.name;
    if (sizeBadge) {
        sizeBadge.textContent = p.sizeClass ? p.sizeClass.tag : (p.archetype.surfaceTag || 'PLANETA');
    }
    if (typeSub) {
        typeSub.textContent = `${p.archetype.typeLabel} // ${p.archetype.surfaceTag}`;
    }
    if (avatarSphere) {
        avatarSphere.style.backgroundColor = colStr;
        avatarSphere.style.boxShadow = `0 0 16px ${colStr}`;
    }

    // Distancia y rumbo en tiempo real
    const dx = p.x - ship.x;
    const dy = p.y - ship.y;
    const dist = Math.hypot(dx, dy);
    const surfaceDist = Math.max(0, dist - p.radius);
    const meters = Math.round(surfaceDist * 0.1);

    if (distEl) {
        distEl.textContent = meters >= 1000 ? `${(meters / 1000).toFixed(1)} km (${meters.toLocaleString()} m)` : `${meters} m`;
    }

    const angRad = Math.atan2(dy, dx);
    const deg = Math.round((((angRad * 180 / Math.PI) + 90) % 360 + 360) % 360);
    if (bearingEl) bearingEl.textContent = `${String(deg).padStart(3, '0')}°`;

    if (gravEl) gravEl.textContent = `${(p.gravityForce / 285).toFixed(1)} G`;
    if (atmoEl) atmoEl.textContent = `${(p.atmoDensity || 1.0).toFixed(2)} atm`;

    if (hazardBadge) {
        hazardBadge.textContent = p.hazardLevel || 'Seguro';
        hazardBadge.className = `text-[9px] px-1.5 py-0.5 rounded ${
            p.hazardLevel === 'Seguro' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20' :
            (p.hazardLevel === 'Peligro Crítico' ? 'bg-rose-500/15 text-rose-300 border border-rose-400/20' : 'bg-amber-500/15 text-amber-300 border border-amber-400/20')
        }`;
    }

    if (faunaEl) {
        if (p.creatures && p.creatures.length > 0) {
            faunaEl.innerHTML = `<span class="text-emerald-300 font-medium">🐾 Fauna Activa: ${p.creaturesSummary || `${p.creatures.length} seres registrados`}</span>`;
        } else {
            faunaEl.innerHTML = '<span class="text-stone-400 italic">Mundo inerte (Sin fauna viva)</span>';
        }
    }

    if (mineralsEl) {
        mineralsEl.textContent = (p.minerals || []).map(m => m.name).slice(0, 4).join(', ') || 'Silicatos estándar y trazas de hierro';
    }

    if (descEl) {
        let extraDesc = p.archetype.desc || 'Planeta del sector astral explorado por la misión Vesper.';
        if (p.hasRings) extraDesc += ' · Cuenta con un sistema de anillos masivos 3D en su plano ecuatorial.';
        if (p.isSuperVolcano) extraDesc += ' · Se detectan calderas supervolcánicas activas con columnas piroclásticas.';
        if (p.isHollow) extraDesc += ' · Contiene fallas cavernosas y abismos subterráneos navegables en su interior.';
        if (p.lakes && p.lakes.length > 0) extraDesc += ` · Alberga ${p.lakes.length} mares y cuencas líquidas superficiales.`;
        descEl.textContent = extraDesc;
    }

    // Actualización visual del botón principal de Waypoint
    const btnWaypoint = document.getElementById('btnMapToggleWaypoint');
    const btnWaypointText = document.getElementById('btnMapToggleWaypointText');
    const isMarked = isPlanetWaypointed(p.key);

    if (btnWaypoint && btnWaypointText) {
        if (isMarked) {
            btnWaypointText.textContent = 'QUITAR INDICACIÓN';
            btnWaypoint.className = 'w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-display font-semibold text-xs tracking-wider transition-all duration-200 shadow-lg cursor-pointer bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 shadow-rose-950/40';
        } else {
            btnWaypointText.textContent = 'AÑADIR INDICACIÓN';
            btnWaypoint.className = 'w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-display font-semibold text-xs tracking-wider transition-all duration-200 shadow-lg cursor-pointer bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-500/20';
        }
    }
}

/**
 * Actualiza la lista y directorio de planetas en la barra lateral del mapa
 */
function updateStarMapDirectory() {
    const listEl = document.getElementById('mapPlanetList');
    if (!listEl) return;

    let planets = getNearbyPlanets(starMapState.camX, starMapState.camY, 2);

    // Filtrado por categoría
    if (starMapState.filter === 'waypoints') {
        planets = planets.filter(p => isPlanetWaypointed(p.key));
        // Aseguramos que se incluyan todos los rumbos aunque estén más lejos
        for (const wp of window.navWaypoints.values()) {
            if (!planets.some(p => p.key === wp.key)) planets.push(wp);
        }
    } else if (starMapState.filter === 'life') {
        planets = planets.filter(p => p.creatures && p.creatures.length > 0);
    } else if (starMapState.filter === 'rings') {
        planets = planets.filter(p => p.hasRings);
    }

    // Filtrado por buscador de texto
    if (starMapState.searchQuery) {
        planets = planets.filter(p => p.name.toLowerCase().includes(starMapState.searchQuery));
    }

    // Ordenar por distancia respecto a la nave
    planets.sort((a, b) => {
        const da = Math.hypot(a.x - ship.x, a.y - ship.y);
        const db = Math.hypot(b.x - ship.x, b.y - ship.y);
        return da - db;
    });

    const countEl = document.getElementById('uiMapDirectoryCount');
    if (countEl) countEl.textContent = `${planets.length} ${planets.length === 1 ? 'mundo' : 'mundos'}`;

    // Sección de rumbos activos
    const wpSec = document.getElementById('mapActiveWaypointsSection');
    const wpList = document.getElementById('mapActiveWaypointsList');
    if (wpSec && wpList) {
        if (window.navWaypoints.size > 0) {
            wpSec.classList.remove('hidden');
            wpList.innerHTML = '';
            for (const p of window.navWaypoints.values()) {
                const distM = Math.round(Math.max(0, Math.hypot(p.x - ship.x, p.y - ship.y) - p.radius) * 0.1);
                const dStr = distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`;
                const row = document.createElement('div');
                row.className = 'px-2 py-1 rounded-lg bg-sky-500/10 border border-sky-400/25 flex items-center justify-between text-[10px] font-mono-num';
                row.innerHTML = `
                    <div class="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0" title="Seleccionar">
                        <span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                        <strong class="text-white truncate">${p.name}</strong>
                        <span class="text-sky-300 ml-1 font-normal">${dStr}</span>
                    </div>
                    <button class="text-rose-400 hover:text-rose-200 ml-2 px-1 cursor-pointer" title="Quitar indicación">✕</button>
                `;
                row.querySelector('div').addEventListener('click', () => {
                    selectStarMapPlanet(p);
                    starMapState.targetCamX = p.x;
                    starMapState.targetCamY = p.y;
                });
                row.querySelector('button').addEventListener('click', (e) => {
                    e.stopPropagation();
                    togglePlanetWaypoint(p);
                });
                wpList.appendChild(row);
            }
        } else {
            wpSec.classList.add('hidden');
        }
    }

    listEl.innerHTML = '';
    if (planets.length === 0) {
        listEl.innerHTML = '<div class="text-[11px] text-stone-500 italic p-3 text-center">No se encontraron planetas con este filtro.</div>';
        return;
    }

    planets.forEach(p => {
        const rimCol = (p.colors && p.colors.rimColor) || (p.archetype && p.archetype.rimColor) || [245, 158, 11];
        const colStr = rgbStr(rimCol, 1);
        const distM = Math.round(Math.max(0, Math.hypot(p.x - ship.x, p.y - ship.y) - p.radius) * 0.1);
        const dStr = distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`;
        const isMarked = isPlanetWaypointed(p.key);

        const card = document.createElement('div');
        card.className = `p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
            isMarked
                ? 'bg-amber-500/10 border-amber-400/40 hover:bg-amber-500/15'
                : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
        }`;

        card.innerHTML = `
            <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${colStr}; box-shadow:0 0 8px ${colStr}"></span>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                        <span class="font-display font-semibold text-white text-xs truncate">${p.name}</span>
                        ${p.creatures && p.creatures.length > 0 ? '<span title="Fauna viva detectada" class="text-[9px]">🐾</span>' : ''}
                        ${p.hasRings ? '<span title="Anillos 3D" class="text-[9px]">🪐</span>' : ''}
                    </div>
                    <span class="text-[9.5px] font-mono-num text-stone-400 block truncate">${p.archetype.typeLabel} · ${dStr}</span>
                </div>
            </div>
            <button class="waypoint-quick-btn px-2 py-1 rounded-lg text-[9px] font-mono-num font-semibold transition-all shrink-0 cursor-pointer ${
                isMarked
                    ? 'bg-amber-400 text-stone-950 hover:bg-rose-400'
                    : 'bg-white/[0.06] hover:bg-amber-400/20 text-stone-300 hover:text-amber-200 border border-white/10'
            }" title="${isMarked ? 'Quitar indicación' : 'Añadir indicación'}">
                ${isMarked ? '✓ RUMBO' : '+ INDICACIÓN'}
            </button>
        `;

        card.addEventListener('click', (e) => {
            selectStarMapPlanet(p);
            starMapState.targetCamX = p.x;
            starMapState.targetCamY = p.y;
        });

        const qBtn = card.querySelector('.waypoint-quick-btn');
        if (qBtn) {
            qBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePlanetWaypoint(p);
            });
        }

        listEl.appendChild(card);
    });
}

/**
 * Bucle continuo de renderizado de la Carta Astral a 60 FPS
 */
function starMapLoop() {
    const mapModal = document.getElementById('mapModal');
    if (!mapModal || mapModal.classList.contains('hidden')) {
        starMapState.animFrameId = null;
        return;
    }
    renderStarMap();
    starMapState.animFrameId = requestAnimationFrame(starMapLoop);
}

/**
 * Abre el modal de la Carta Astral e inicia la animación continua
 */
function openMapModal(planetToFocus = null) {
    const mapModal = document.getElementById('mapModal');
    if (!mapModal) return;
    initStarMap();
    mapModal.classList.remove('hidden');

    if (planetToFocus) {
        selectStarMapPlanet(planetToFocus);
        starMapState.targetCamX = planetToFocus.x;
        starMapState.targetCamY = planetToFocus.y;
        starMapState.camX = planetToFocus.x;
        starMapState.camY = planetToFocus.y;
        starMapState.targetZoom = 0.011;
        starMapState.zoom = 0.011;
    } else {
        selectStarMapPlanet(null);
        starMapState.targetCamX = ship.x;
        starMapState.targetCamY = ship.y;
        starMapState.camX = ship.x;
        starMapState.camY = ship.y;
    }

    updateStarMapDirectory();

    if (!starMapState.animFrameId) {
        starMapState.animFrameId = requestAnimationFrame(starMapLoop);
    }
}

/**
 * Cierra el modal de la Carta Astral
 */
function closeMapModal() {
    const mapModal = document.getElementById('mapModal');
    if (!mapModal) return;
    mapModal.classList.add('hidden');
    if (starMapState.animFrameId) {
        cancelAnimationFrame(starMapState.animFrameId);
        starMapState.animFrameId = null;
    }
}

/**
 * Alterna entre abrir y cerrar el modal de la Carta Astral
 */
function toggleMapModal() {
    const mapModal = document.getElementById('mapModal');
    if (!mapModal) return;
    if (mapModal.classList.contains('hidden')) {
        openMapModal();
    } else {
        closeMapModal();
    }
}

/**
 * Renderizado de fotograma de la Carta Astral con alta precisión y estilo cinematográfico
 */
function renderStarMap() {
    const mapCanvas = document.getElementById('starMapCanvas');
    if (!mapCanvas) return;
    const container = mapCanvas.parentElement;
    const rect = container ? container.getBoundingClientRect() : mapCanvas.getBoundingClientRect();
    const mw = rect.width || 800;
    const mh = rect.height || 500;

    if (mapCanvas.width !== Math.floor(mw * dpr) || mapCanvas.height !== Math.floor(mh * dpr)) {
        mapCanvas.width = Math.floor(mw * dpr);
        mapCanvas.height = Math.floor(mh * dpr);
    }

    const mctx = mapCanvas.getContext('2d');
    const timeSec = performance.now() * 0.001;

    // Interpolación suave de cámara y zoom (Lerp fluido)
    starMapState.camX = lerp(starMapState.camX, starMapState.targetCamX, 0.16);
    starMapState.camY = lerp(starMapState.camY, starMapState.targetCamY, 0.16);
    starMapState.zoom = lerp(starMapState.zoom, starMapState.targetZoom, 0.16);

    const zoom = starMapState.zoom;
    const camX = starMapState.camX;
    const camY = starMapState.camY;
    const cx = mw * 0.5;
    const cy = mh * 0.5;

    // Actualización de Telemetría de Sector y Rumbos en Cabecera
    const secX = Math.round(ship.x / SECTOR_SIZE);
    const secY = Math.round(ship.y / SECTOR_SIZE);
    const mapSectorBadge = document.getElementById('uiMapSectorBadge');
    if (mapSectorBadge) mapSectorBadge.textContent = `[${secX}, ${secY}]`;

    const waypointsBadge = document.getElementById('uiMapWaypointsBadge');
    if (waypointsBadge) {
        const wpCount = window.navWaypoints.size;
        waypointsBadge.textContent = `${wpCount} ${wpCount === 1 ? 'RUMBO' : 'RUMBOS'}`;
        waypointsBadge.className = wpCount > 0
            ? 'hidden sm:inline-block text-[9.5px] font-mono-num px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/40 animate-pulse'
            : 'hidden sm:inline-block text-[9.5px] font-mono-num px-2 py-0.5 rounded bg-white/[0.05] text-stone-400 border border-white/10';
    }

    const zoomVal = document.getElementById('uiMapZoomVal');
    if (zoomVal) zoomVal.textContent = `${(zoom / 0.0028).toFixed(1)}x`;

    mctx.save();
    mctx.scale(dpr, dpr);

    // 1. Fondo cósmico profundo
    mctx.fillStyle = '#020409';
    mctx.fillRect(0, 0, mw, mh);

    // Gradiente radial zen en el centro del mapa
    const bgGrad = mctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(mw, mh) * 0.7);
    bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
    bgGrad.addColorStop(0.6, 'rgba(6, 10, 20, 0.2)');
    bgGrad.addColorStop(1, 'rgba(2, 4, 9, 0)');
    mctx.fillStyle = bgGrad;
    mctx.fillRect(0, 0, mw, mh);

    // 2. Estrellas de fondo suaves
    for (const st of starMapState.stars) {
        const sx = ((st.x - camX * 0.04) % mw + mw) % mw;
        const sy = ((st.y - camY * 0.04) % mh + mh) % mh;
        const a = st.alpha * (0.8 + 0.2 * Math.sin(timeSec * st.twinkleSpeed));
        mctx.fillStyle = `rgba(226, 232, 240, ${a})`;
        mctx.beginPath();
        mctx.arc(sx, sy, st.r, 0, Math.PI * 2);
        mctx.fill();
    }

    // 3. Cuadrícula y Círculos Concéntricos de Telemetría (Radar Rings)
    const shipCanvasX = cx + (ship.x - camX) * zoom;
    const shipCanvasY = cy + (ship.y - camY) * zoom;

    mctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    mctx.lineWidth = 1;

    // Anillos concéntricos centrados en la nave para evaluar distancias intuitivamente
    const radarDistances = [10000, 25000, 50000, 100000]; // en unidades físicas (1km, 2.5km, 5km, 10km)
    for (const rDist of radarDistances) {
        const ringPix = rDist * zoom;
        if (ringPix > 25 && ringPix < Math.max(mw, mh) * 1.6) {
            mctx.beginPath();
            mctx.arc(shipCanvasX, shipCanvasY, ringPix, 0, Math.PI * 2);
            mctx.stroke();

            // Etiqueta sutil de distancia en el anillo
            mctx.font = '500 8.5px "JetBrains Mono", monospace';
            mctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            mctx.textAlign = 'center';
            mctx.fillText(`${rDist * 0.0001} km`, shipCanvasX, shipCanvasY - ringPix - 3);
        }
    }

    // Obtención de planetas de los sectores visibles
    const planets = getNearbyPlanets(camX, camY, 2);
    // Incluir también los planetas marcados aunque estén fuera de rango
    for (const wp of window.navWaypoints.values()) {
        if (!planets.some(p => p.key === wp.key)) planets.push(wp);
    }

    // 4. LÍNEAS DE RUMBO DE NAVEGACIÓN ACTIVAS (VECTORES CUÁNTICOS)
    if (window.navWaypoints.size > 0) {
        for (const wp of window.navWaypoints.values()) {
            const destX = cx + (wp.x - camX) * zoom;
            const destY = cy + (wp.y - camY) * zoom;

            mctx.save();
            const dashOffset = (timeSec * 35) % 24;
            mctx.lineDashOffset = -dashOffset;
            mctx.setLineDash([8, 6]);
            mctx.lineWidth = 1.8;
            mctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';

            mctx.beginPath();
            mctx.moveTo(shipCanvasX, shipCanvasY);
            mctx.lineTo(destX, destY);
            mctx.stroke();
            mctx.setLineDash([]);

            // Etiqueta flotante a medio camino del vector de navegación
            const midX = (shipCanvasX + destX) * 0.5;
            const midY = (shipCanvasY + destY) * 0.5;
            const distKm = ((Math.hypot(wp.x - ship.x, wp.y - ship.y) - wp.radius) * 0.0001).toFixed(1);

            mctx.font = '600 9px "JetBrains Mono", monospace';
            mctx.fillStyle = '#fde68a';
            mctx.textAlign = 'center';
            mctx.fillText(`🧭 RUMBO · ${distKm} km`, midX, midY - 6);
            mctx.restore();
        }
    }

    // 5. RENDERIZADO DE PLANETAS EN LA CARTA ASTRAL
    for (const p of planets) {
        const px = cx + (p.x - camX) * zoom;
        const py = cy + (p.y - camY) * zoom;

        // Descartar planetas fuera de los límites de la pantalla visible con margen
        if (px < -120 || px > mw + 120 || py < -120 || py > mh + 120) continue;

        const rimCol = (p.colors && p.colors.rimColor) || (p.archetype && p.archetype.rimColor) || [245, 158, 11];
        const atmoGlow = (p.colors && p.colors.atmoGlow) || (p.archetype && p.archetype.atmoGlow) || [125, 211, 252];
        const distToShip = Math.hypot(ship.x - p.x, ship.y - p.y);
        const isSelected = (starMapState.selectedPlanet && starMapState.selectedPlanet.key === p.key);
        const isHovered = (starMapState.hoveredPlanet && starMapState.hoveredPlanet.key === p.key);
        const isMarked = isPlanetWaypointed(p.key);

        // Pozo Gravitatorio (Círculo punteado)
        mctx.strokeStyle = p.scanned ? rgbStr(rimCol, isSelected ? 0.45 : 0.2) : 'rgba(251, 191, 36, 0.16)';
        mctx.setLineDash([3, 5]);
        mctx.lineWidth = 1;
        mctx.beginPath();
        mctx.arc(px, py, p.gravityRadius * zoom, 0, Math.PI * 2);
        mctx.stroke();
        mctx.setLineDash([]);

        // Límite de Atmósfera (Halo suave)
        mctx.strokeStyle = rgbStr(atmoGlow, isSelected ? 0.4 : 0.18);
        mctx.lineWidth = 1.2;
        mctx.beginPath();
        mctx.arc(px, py, p.atmoRadius * zoom, 0, Math.PI * 2);
        mctx.stroke();

        // Anillos planetarios en 2D con inclinación
        if (p.hasRings) {
            mctx.strokeStyle = rgbStr(rimCol, isSelected ? 0.7 : 0.4);
            mctx.lineWidth = Math.max(1.2, 1.8 * zoom * 100);
            mctx.beginPath();
            mctx.ellipse(px, py, (p.radius * 1.85) * zoom, (p.radius * 0.7) * zoom, p.ringTilt || 0, 0, Math.PI * 2);
            mctx.stroke();
        }

        // Esfera planetaria
        const planetDotRadius = Math.max(4.0, p.radius * zoom);
        mctx.fillStyle = p.scanned ? rgbStr(rimCol, 0.95) : '#fbbf24';
        mctx.beginPath();
        mctx.arc(px, py, planetDotRadius, 0, Math.PI * 2);
        mctx.fill();

        // Resplandor de selección / hover
        if (isSelected || isHovered) {
            mctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.6)';
            mctx.lineWidth = 1.6;
            mctx.beginPath();
            mctx.arc(px, py, planetDotRadius + 5, 0, Math.PI * 2);
            mctx.stroke();

            if (isSelected) {
                // Retícula táctica giratoria alrededor del planeta seleccionado
                mctx.save();
                mctx.translate(px, py);
                mctx.rotate(timeSec * 0.8);
                const brLen = 6;
                const brDist = planetDotRadius + 8;
                mctx.strokeStyle = '#38bdf8';
                mctx.lineWidth = 1.5;
                // 4 esquinas de selección
                [-brDist, brDist].forEach(bx => {
                    [-brDist, brDist].forEach(by => {
                        mctx.beginPath();
                        mctx.moveTo(bx, by - Math.sign(by) * brLen);
                        mctx.lineTo(bx, by);
                        mctx.lineTo(bx - Math.sign(bx) * brLen, by);
                        mctx.stroke();
                    });
                });
                mctx.restore();
            }
        }

        // Indicador de Waypoint activo sobre el planeta (Diamante Dorado)
        if (isMarked) {
            mctx.save();
            const wpPulse = 0.85 + 0.15 * Math.sin(timeSec * 5);
            mctx.fillStyle = '#f59e0b';
            mctx.beginPath();
            mctx.arc(px, py - (planetDotRadius + 14 * wpPulse), 3.5, 0, Math.PI * 2);
            mctx.fill();
            mctx.strokeStyle = '#fbbf24';
            mctx.lineWidth = 1.2;
            mctx.stroke();
            mctx.restore();
        }

        // Rótulo cartográfico del planeta
        mctx.textAlign = 'center';
        mctx.font = isSelected ? '600 10.5px "Space Grotesk", sans-serif' : '500 9px "JetBrains Mono", monospace';
        mctx.fillStyle = isSelected ? '#38bdf8' : (p.scanned ? '#f1f5f9' : 'rgba(251, 191, 36, 0.9)');

        const distM = Math.round((distToShip - p.radius) * 0.1);
        const distLabel = distM >= 1000 ? `${(distM / 1000).toFixed(1)}km` : `${distM}m`;
        const waypointTag = isMarked ? '🧭 ' : '';
        const nameText = p.scanned ? `${waypointTag}${p.name} [${distLabel}]` : `${waypointTag}SEÑAL [${distLabel}]`;

        mctx.fillText(nameText, px, py - (planetDotRadius + 6));
    }

    // 5.5 TRAYECTORIA PREDICTIVA Y ÓRBITA EN CARTA ASTRAL
    if (ship.trajectory && ship.trajectory.length >= 3 && !ship.isGrounded) {
        mctx.save();
        mctx.strokeStyle = (ship.orbitClosed && !ship.trajectoryImpact)
            ? 'rgba(52, 211, 153, 0.72)'
            : (ship.trajectoryImpact ? 'rgba(251, 113, 133, 0.65)' : 'rgba(56, 189, 248, 0.65)');
        mctx.lineWidth = 1.4;
        mctx.setLineDash([4, 4]);
        mctx.beginPath();
        mctx.moveTo(shipCanvasX, shipCanvasY);
        for (let i = 0; i < ship.trajectory.length; i++) {
            const tx = cx + (ship.trajectory[i].x - camX) * zoom;
            const ty = cy + (ship.trajectory[i].y - camY) * zoom;
            mctx.lineTo(tx, ty);
        }
        mctx.stroke();
        mctx.setLineDash([]);
        mctx.restore();
    }

    // 6. POSICIÓN Y ORIENTACIÓN DE LA SONDA DEL JUGADOR
    mctx.save();
    mctx.translate(shipCanvasX, shipCanvasY);

    // Vector de velocidad hacia donde viaja la sonda
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > 8) {
        const velAng = Math.atan2(ship.vy, ship.vx);
        const velLen = Math.min(45, speed * 0.18 * (zoom / 0.0055));
        mctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        mctx.lineWidth = 1.4;
        mctx.beginPath();
        mctx.moveTo(0, 0);
        mctx.lineTo(Math.cos(velAng) * velLen, Math.sin(velAng) * velLen);
        mctx.stroke();
    }

    // Triángulo dorado de la sonda
    mctx.rotate(ship.angle);
    mctx.fillStyle = '#f59e0b';
    mctx.beginPath();
    mctx.moveTo(10, 0);
    mctx.lineTo(-7, -6);
    mctx.lineTo(-3, 0);
    mctx.lineTo(-7, 6);
    mctx.closePath();
    mctx.fill();

    // Pulso de sonar radar concéntrico expandiéndose desde la nave
    const pingRadius = ((timeSec * 45) % 65);
    const pingAlpha = (1 - pingRadius / 65) * 0.6;
    mctx.strokeStyle = `rgba(245, 158, 11, ${pingAlpha})`;
    mctx.lineWidth = 1.2;
    mctx.beginPath();
    mctx.arc(0, 0, pingRadius, 0, Math.PI * 2);
    mctx.stroke();

    mctx.restore();

    // Rótulo de la Sonda
    mctx.font = '600 8.5px "Space Grotesk", sans-serif';
    mctx.fillStyle = '#fbbf24';
    mctx.textAlign = 'center';
    mctx.fillText('VESPER-IX (TÚ)', shipCanvasX, shipCanvasY + 16);

    mctx.restore();

    // Actualización dinámica de la distancia en tiempo real si hay un planeta en el dossier
    if (starMapState.selectedPlanet) {
        const p = starMapState.selectedPlanet;
        const liveDistEl = document.getElementById('dossierDist');
        if (liveDistEl) {
            const surfaceDist = Math.max(0, Math.hypot(p.x - ship.x, p.y - ship.y) - p.radius);
            const meters = Math.round(surfaceDist * 0.1);
            liveDistEl.textContent = meters >= 1000 ? `${(meters / 1000).toFixed(1)} km (${meters.toLocaleString()} m)` : `${meters} m`;
        }
    }
}

/**
 * Dibuja el Radar Orbital en tiempo real (planeta, atmósfera, nave y órbita completa 360°)
 */
function drawOrbitScope(nearestPlanet) {
    const wrap = document.getElementById('orbitScopeWrap');
    const canvas = document.getElementById('orbitScopeCanvas');
    const label = document.getElementById('uiOrbitScopeLabel');
    if (!wrap || !canvas) return;

    const isEva = (typeof astronaut !== 'undefined' && astronaut.active);
    const dist = nearestPlanet ? Math.hypot(ship.x - nearestPlanet.x, ship.y - nearestPlanet.y) : Infinity;
    const shouldShow = !!(nearestPlanet && !ship.isGrounded && !isEva && dist < nearestPlanet.gravityRadius * 1.48);

    wrap.classList.toggle('hidden', !shouldShow);
    if (!shouldShow) return;

    const octx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;

    octx.clearRect(0, 0, w, h);
    octx.fillStyle = 'rgba(4, 8, 18, 0.85)';
    octx.fillRect(0, 0, w, h);

    const maxR = Math.max(nearestPlanet.gravityRadius, dist * 1.15, (ship.orbitApoapsis ? ship.orbitApoapsis.r * 1.08 : 0));
    const scale = (w * 0.44) / Math.max(1, maxR);

    // Límite gravitatorio
    octx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    octx.lineWidth = 1;
    octx.setLineDash([2, 3]);
    octx.beginPath();
    octx.arc(cx, cy, nearestPlanet.gravityRadius * scale, 0, Math.PI * 2);
    octx.stroke();
    octx.setLineDash([]);

    // Límite atmosférico y Línea Espacial (Karman 65%)
    const karmanR = nearestPlanet.radius + (nearestPlanet.atmoRadius - nearestPlanet.radius) * 0.65;
    octx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    octx.lineWidth = 1;
    octx.beginPath();
    octx.arc(cx, cy, nearestPlanet.atmoRadius * scale, 0, Math.PI * 2);
    octx.stroke();

    octx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
    octx.setLineDash([2, 2]);
    octx.beginPath();
    octx.arc(cx, cy, karmanR * scale, 0, Math.PI * 2);
    octx.stroke();
    octx.setLineDash([]);

    // Órbita objetivo si el Piloto Orbital está activo
    if (ship.orbitMode !== 'off' && ship.orbitTargetRadius > 0) {
        octx.strokeStyle = ship.orbitMode === 'locked' ? 'rgba(52, 211, 153, 0.35)' : 'rgba(34, 211, 238, 0.40)';
        octx.lineWidth = 1.2;
        octx.setLineDash([3, 3]);
        octx.beginPath();
        octx.arc(cx, cy, ship.orbitTargetRadius * scale, 0, Math.PI * 2);
        octx.stroke();
        octx.setLineDash([]);
    }

    // Cuerpo del planeta
    const rimCol = (nearestPlanet.colors && nearestPlanet.colors.rimColor) || (nearestPlanet.archetype && nearestPlanet.archetype.rimColor) || [245, 158, 11];
    const pRad = Math.max(5, nearestPlanet.radius * scale);
    octx.fillStyle = `rgb(${rimCol[0]}, ${rimCol[1]}, ${rimCol[2]})`;
    octx.beginPath();
    octx.arc(cx, cy, pRad, 0, Math.PI * 2);
    octx.fill();

    // Trayectoria / Órbita completa predicha
    const sx = cx + (ship.x - nearestPlanet.x) * scale;
    const sy = cy + (ship.y - nearestPlanet.y) * scale;
    if (ship.trajectory && ship.trajectory.length >= 2) {
        octx.strokeStyle = (ship.orbitClosed && !ship.trajectoryImpact)
            ? '#34d399'
            : (ship.trajectoryImpact ? '#fb7185' : (ship.trajectoryEscape ? '#fbbf24' : '#38bdf8'));
        octx.lineWidth = (ship.orbitClosed && !ship.trajectoryImpact) ? 1.8 : 1.4;
        octx.beginPath();
        octx.moveTo(sx, sy);
        for (let i = 0; i < ship.trajectory.length; i++) {
            const tx = cx + (ship.trajectory[i].x - nearestPlanet.x) * scale;
            const ty = cy + (ship.trajectory[i].y - nearestPlanet.y) * scale;
            octx.lineTo(tx, ty);
        }
        octx.stroke();
    }

    // Marcadores PE y AP en el Radar Orbital
    if (ship.orbitClosed && !ship.trajectoryImpact && ship.orbitPeriapsis && ship.orbitApoapsis) {
        const pex = cx + (ship.orbitPeriapsis.x - nearestPlanet.x) * scale;
        const pey = cy + (ship.orbitPeriapsis.y - nearestPlanet.y) * scale;
        const apx = cx + (ship.orbitApoapsis.x - nearestPlanet.x) * scale;
        const apy = cy + (ship.orbitApoapsis.y - nearestPlanet.y) * scale;
        octx.fillStyle = '#34d399';
        octx.fillRect(pex - 2, pey - 2, 4, 4);
        octx.fillStyle = '#38bdf8';
        octx.fillRect(apx - 2, apy - 2, 4, 4);
    }

    // Marcador de la nave
    octx.fillStyle = '#fef08a';
    octx.beginPath();
    octx.arc(sx, sy, 3.0, 0, Math.PI * 2);
    octx.fill();
    octx.strokeStyle = '#0f172a';
    octx.lineWidth = 1;
    octx.stroke();

    if (label) {
        if (ship.orbitMode === 'locked') {
            label.textContent = 'EN ÓRBITA';
            label.className = 'font-mono-num text-[8px] tracking-[0.16em] uppercase text-emerald-300 font-semibold';
        } else if (ship.orbitMode === 'inserting') {
            label.textContent = 'INSERCIÓN...';
            label.className = 'font-mono-num text-[8px] tracking-[0.16em] uppercase text-cyan-300 font-semibold animate-pulse';
        } else if (ship.orbitClosed && !ship.trajectoryImpact) {
            label.textContent = 'ÓRBITA CERRADA';
            label.className = 'font-mono-num text-[8px] tracking-[0.16em] uppercase text-emerald-300 font-semibold';
        } else if (ship.trajectoryImpact) {
            label.textContent = 'IMPACTO';
            label.className = 'font-mono-num text-[8px] tracking-[0.16em] uppercase text-rose-300 font-semibold';
        } else {
            label.textContent = 'RADAR ORBITAL';
            label.className = 'font-mono-num text-[8px] tracking-[0.16em] uppercase text-sky-300/90';
        }
    }
}

// Inicialización de la Carta Astral al cargar el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStarMap);
} else {
    initStarMap();
}
