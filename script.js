
window.toggleFlvCard = (headerEl) => {
    const card = headerEl.closest('.flv-card');
    if (!card) return;
    const opId = card.getAttribute('data-opid-card');
    const wrap = card.querySelector('.flv-legs-wrap');
    const icon = headerEl.querySelector('.flv-expand-icon');
    if (!wrap) return;
    
    window.rtCardsState = window.rtCardsState || {};
    const nowOpen = wrap.style.maxHeight && wrap.style.maxHeight !== '0px';
    window.rtCardsState[opId] = !nowOpen;
    
    if (!nowOpen) {
        wrap.style.maxHeight = '500px';
        wrap.style.opacity = '1';
        if (icon) icon.style.transform = 'rotate(180deg)';
    } else {
        wrap.style.maxHeight = '0px';
        wrap.style.opacity = '0';
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
};

// --- DATOS GLOBALES ---
const AIRPORTS = [
    { id: 'EZE', name: 'Buenos Aires (Ezeiza)', lat: -34.8222, lng: -58.5358, congestion: 'low' },
    { id: 'GRU', name: 'São Paulo (Guarulhos)', lat: -23.4356, lng: -46.4731, congestion: 'medium' },
    { id: 'JFK', name: 'New York (JFK)', lat: 40.6413, lng: -73.7781, congestion: 'high' },
    { id: 'LAX', name: 'Los Angeles (LAX)', lat: 33.9416, lng: -118.4085, congestion: 'high' },
    { id: 'LHR', name: 'London (Heathrow)', lat: 51.4700, lng: -0.4543, congestion: 'high' },
    { id: 'DXB', name: 'Dubai (DXB)', lat: 25.2532, lng: 55.3657, congestion: 'high' },
    { id: 'HND', name: 'Tokyo (Haneda)', lat: 35.5494, lng: 139.7798, congestion: 'high' }
];

/* MODELOS VECTORIALES ALTAMENTE DETALLADOS.
   El 'currentColor' se usa para la pintura (cola, motores o panza).
   El fuselaje usa el gradiente 'fuseBase' para mantenerlo blanco realista 3D.
*/
const AIRCRAFT_MODELS = [

    { 
        id: 'c208', name: 'Cessna 208 Caravan', type: 'Regional Ligero', category: 'commercial', price: 2500000, capacity: 14, maxSeats: 14, range: 1980, dailyProfit: 18000, defaultColor: '#ef4444',
        modelUrl: 'models/Cesium_Air.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(100, 50)">
                <!-- Tren Fijo -->
                <rect x="230" y="170" width="6" height="45" fill="#475569"/><circle cx="233" cy="215" r="14" fill="#0f172a" stroke="#475569" stroke-width="2"/>
                <rect x="520" y="160" width="8" height="55" fill="#475569"/><circle cx="524" cy="215" r="16" fill="#0f172a" stroke="#475569" stroke-width="2"/>
                
                <!-- Fuselaje Blanco -->
                <path d="M 120 120 L 750 120 L 850 70 L 820 50 L 150 50 C 120 50 100 80 100 100 C 100 110 110 120 120 120 Z" fill="url(#fuseBase)" />
                <!-- Cargo Pod Inferior (Pintado) -->
                <path d="M 280 120 L 580 120 Q 590 140 570 145 L 300 145 Q 280 140 280 120 Z" fill="currentColor" />
                <!-- Cola (Pintada) -->
                <path d="M 750 50 L 780 -30 L 850 -30 L 850 70 Z" fill="currentColor" />
                <!-- Ala -->
                <rect x="350" y="45" width="250" height="12" rx="4" fill="url(#fuseBase)" />
                <line x1="450" y1="55" x2="480" y2="120" stroke="#94a3b8" stroke-width="6"/>
                <!-- Motor/Hélice -->
                <path d="M 90 90 L 100 90 L 100 110 L 90 110 Z" fill="#334155"/>
                <rect x="94" y="20" width="4" height="160" rx="2" fill="#1e293b" opacity="0.6"/>
                <!-- Cockpit y Ventanas cuadradas -->
                <path d="M 150 70 L 190 70 L 180 55 L 140 55 Z" fill="url(#glass)"/>
                <rect x="320" y="70" width="35" height="25" rx="3" fill="url(#glass)"/><rect x="380" y="70" width="35" height="25" rx="3" fill="url(#glass)"/>
                <rect x="440" y="70" width="35" height="25" rx="3" fill="url(#glass)"/><rect x="500" y="70" width="35" height="25" rx="3" fill="url(#glass)"/>
            </g>
        </svg>`, maintFactor: 1.5
    },
    { 
        id: 'e190', name: 'Embraer E190', type: 'Regional Jet', category: 'commercial', price: 50000000, capacity: 114, maxSeats: 114, range: 4537, dailyProfit: 135000, defaultColor: '#2563eb',
        modelUrl: 'https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/e190/glTF2/E190.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(50, 40)">
                <!-- Tren -->
                <rect x="220" y="160" width="4" height="40" fill="#475569"/><circle cx="222" cy="200" r="10" fill="#0f172a"/>
                <rect x="520" y="160" width="6" height="40" fill="#475569"/><circle cx="516" cy="205" r="12" fill="#0f172a"/><circle cx="528" cy="205" r="12" fill="#0f172a"/>
                
                <!-- Cola E190 (Pintada) -->
                <path d="M 800 100 L 860 -10 L 930 -10 L 910 100 Z" fill="currentColor" />
                <!-- Estabilizador Horizontal -->
                <path d="M 750 100 L 820 80 L 870 100 Z" fill="url(#fuseBase)" />
                
                <!-- Fuselaje Blanco Delgado -->
                <path d="M 120 160 Q 50 160 50 130 C 50 100 80 80 180 80 L 800 80 Q 950 80 960 110 L 960 120 Q 920 160 800 160 Z" fill="url(#fuseBase)" />
                <!-- Franja Inferior Decorativa (Pintada) -->
                <path d="M 80 135 L 925 135 Q 920 160 800 160 L 120 160 Q 70 160 80 135 Z" fill="currentColor" opacity="0.9"/>
                
                <!-- Ala -->
                <path d="M 400 135 L 560 135 L 680 230 L 450 230 Z" fill="url(#fuseBase)" />
                
                <!-- Motor CF34 (Gris Metálico) -->
                <path d="M 380 140 L 460 140 L 455 180 L 380 180 Q 370 160 380 140 Z" fill="url(#engineBase)" />
                <path d="M 378 142 L 388 142 L 388 178 L 378 178 Z" fill="#0f172a"/>
                
                <!-- Cockpit Embraer 4 Ventanas -->
                <path d="M 160 105 L 185 105 L 175 88 C 160 88 150 95 145 102 Z" fill="url(#glass)" />
                <!-- Ventanas Pasajeros -->
                <line x1="220" y1="110" x2="750" y2="110" stroke="url(#glass)" stroke-width="7" stroke-dasharray="6 12" />
                <!-- Puertas -->
                <rect x="195" y="90" width="16" height="35" rx="3" fill="none" stroke="#94a3b8" stroke-width="2"/>
                <rect x="760" y="90" width="16" height="35" rx="3" fill="none" stroke="#94a3b8" stroke-width="2"/>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'b737', name: 'Boeing 737 MAX 8', type: 'Medio Alcance', category: 'commercial', price: 122000000, capacity: 178, maxSeats: 210, range: 6570, dailyProfit: 445000, defaultColor: '#0ea5e9',
        modelUrl: 'https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/b752/glTF2/B752.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(30, 40)">
                <!-- Tren Corto B737 -->
                <rect x="200" y="150" width="5" height="35" fill="#475569"/><circle cx="202" cy="185" r="9" fill="#0f172a"/>
                <rect x="530" y="150" width="8" height="40" fill="#475569"/><circle cx="525" cy="190" r="14" fill="#0f172a"/><circle cx="538" cy="190" r="14" fill="#0f172a"/>
                
                <!-- Cola 737 con Extensión Dorsal (Pintada) -->
                <path d="M 750 80 L 820 -10 L 900 -10 L 880 80 Z" fill="currentColor" />
                <path d="M 650 80 L 750 80 L 790 30 Z" fill="currentColor" /> 
                
                <!-- Fuselaje Blanco -->
                <path d="M 120 160 Q 50 160 50 130 Q 50 110 90 90 L 150 80 L 800 80 Q 950 80 960 110 L 960 120 Q 930 160 800 160 Z" fill="url(#fuseBase)" />
                
                <!-- Ala -->
                <path d="M 400 135 L 550 135 L 700 240 L 460 240 Z" fill="url(#fuseBase)" />
                <!-- Split Scimitar Winglet (Pintado) -->
                <path d="M 680 240 L 710 190 L 720 190 L 690 240 Z" fill="currentColor" />
                <path d="M 680 240 L 700 260 L 710 260 L 690 240 Z" fill="currentColor" />
                
                <!-- Motor LEAP-1B Fondo Plano con Cheurones (Pintado opcional o Metálico) -->
                <path d="M 370 130 L 460 130 L 450 180 L 390 180 L 370 150 Z" fill="currentColor" opacity="0.9" />
                <!-- Cheurones -->
                <path d="M 460 130 L 450 140 L 460 150 L 450 160 L 460 170 L 450 180" fill="none" stroke="#64748b" stroke-width="2"/>
                <path d="M 368 132 L 378 132 L 378 178 L 368 178 Z" fill="#0f172a"/> 
                
                <!-- Nariz Afilada Boeing y Cockpit V -->
                <path d="M 155 105 L 180 105 L 170 86 Q 160 86 148 95 Z" fill="url(#glass)" />
                <path d="M 148 95 L 138 102" fill="none" stroke="url(#glass)" stroke-width="2"/>
                <!-- Ventanas -->
                <line x1="210" y1="108" x2="740" y2="108" stroke="url(#glass)" stroke-width="6" stroke-dasharray="5 10" />
                <!-- Puertas -->
                <rect x="185" y="90" width="16" height="35" rx="3" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
                <rect x="750" y="90" width="16" height="35" rx="3" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'a320', name: 'Airbus A320neo', type: 'Corto Alcance', category: 'commercial', price: 111000000, capacity: 165, maxSeats: 195, range: 6300, dailyProfit: 410000, defaultColor: '#10b981',
        modelUrl: 'models/white_airbus_a320-200.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(30, 40)">
                <!-- Tren A320 (Alto) -->
                <rect x="200" y="160" width="6" height="40" fill="#475569"/><circle cx="203" cy="200" r="10" fill="#0f172a"/>
                <rect x="520" y="160" width="10" height="45" fill="#475569"/><circle cx="515" cy="205" r="14" fill="#0f172a"/><circle cx="528" cy="205" r="14" fill="#0f172a"/>
                
                <!-- Cola Airbus Recta (Pintada) -->
                <path d="M 760 80 L 820 -10 L 890 -10 L 880 80 Z" fill="currentColor" />
                <path d="M 720 80 L 760 80 L 780 40 Z" fill="url(#fuseBase)"/>
                
                <!-- Fuselaje Nariz Redondeada -->
                <path d="M 100 160 Q 40 160 40 120 C 40 90 60 80 150 80 L 800 80 Q 940 80 950 110 L 950 120 Q 920 160 800 160 Z" fill="url(#fuseBase)" />
                
                <!-- Ala -->
                <path d="M 420 135 L 560 135 L 680 240 L 480 240 Z" fill="url(#fuseBase)" />
                <!-- Sharklet (Pintado) -->
                <path d="M 670 240 L 680 180 L 690 180 L 680 240 Z" fill="currentColor" />
                
                <!-- Motor CFM LEAP Grande Redondo (Pintado) -->
                <rect x="360" y="125" width="105" height="58" rx="29" fill="currentColor" opacity="0.9" />
                <path d="M 358 135 L 370 135 L 370 173 L 358 173 Z" fill="#0f172a"/>
                
                <!-- Cockpit Airbus (Recorte en esquina inferior) -->
                <path d="M 145 105 L 175 105 L 165 88 Q 155 88 135 100 Z" fill="url(#glass)" />
                
                <!-- Ventanas -->
                <line x1="200" y1="112" x2="750" y2="112" stroke="url(#glass)" stroke-width="6" stroke-dasharray="5 10" />
                <!-- Puertas -->
                <rect x="180" y="90" width="16" height="35" rx="3" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
                <rect x="760" y="90" width="16" height="35" rx="3" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b787', name: 'Boeing 787-9 Dreamliner', type: 'Largo Alcance', category: 'commercial', price: 293000000, capacity: 290, maxSeats: 420, range: 14140, dailyProfit: 1050000, defaultColor: '#8b5cf6',
        modelUrl: 'https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/b788/glTF2/B788.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(10, 40)">
                <!-- Tren Widebody -->
                <rect x="180" y="160" width="6" height="40" fill="#475569"/><circle cx="183" cy="200" r="11" fill="#0f172a"/>
                <rect x="520" y="160" width="12" height="45" fill="#475569"/><circle cx="510" cy="205" r="16" fill="#0f172a"/><circle cx="530" cy="205" r="16" fill="#0f172a"/>
                
                <!-- Cola 787 Curva Suave (Pintada) -->
                <path d="M 750 80 Q 850 0 880 -10 L 950 -10 L 920 80 Z" fill="currentColor" />
                
                <!-- Fuselaje Ultra Aerodinámico -->
                <path d="M 120 160 Q 40 160 40 120 C 40 100 80 80 160 80 L 800 80 C 950 80 970 100 970 120 Q 940 160 800 160 Z" fill="url(#fuseBase)" />
                <!-- Vientre (Pintado) -->
                <path d="M 100 140 L 850 140 Q 930 140 940 120 Q 940 160 800 160 L 120 160 Q 50 160 50 130 C 50 120 80 140 100 140 Z" fill="currentColor" opacity="0.2"/>
                
                <!-- Ala Flexible Raked Wingtip -->
                <path d="M 400 135 Q 550 150 720 230 C 740 240 750 220 730 210 L 500 135 Z" fill="url(#fuseBase)" />
                
                <!-- Motor GEnx (Gris Metálico con Cheurones exactos) -->
                <path d="M 340 130 L 460 130 L 450 190 L 350 190 C 330 170 330 150 340 130 Z" fill="url(#engineBase)" />
                <path d="M 460 130 L 440 140 L 460 150 L 440 160 L 460 170 L 440 180 L 460 190" fill="none" stroke="#334155" stroke-width="3"/>
                <ellipse cx="345" cy="160" rx="10" ry="26" fill="#0f172a" />
                
                <!-- Nariz 787 Lisa 4 Ventanas -->
                <path d="M 125 102 L 155 102 L 145 88 Q 135 88 115 97 Z" fill="url(#glass)" />
                
                <!-- Ventanas Grandes Dreamliner -->
                <line x1="200" y1="110" x2="750" y2="110" stroke="url(#glass)" stroke-width="8" stroke-dasharray="6 14" />
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'a350', name: 'Airbus A350-900', type: 'Largo Alcance', category: 'commercial', price: 317000000, capacity: 315, maxSeats: 440, range: 15000, dailyProfit: 1150000, defaultColor: '#6366f1',
        modelUrl: 'models/a350.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(10, 40)">
                <!-- Tren A350 Pesado -->
                <rect x="180" y="160" width="8" height="40" fill="#475569"/><circle cx="184" cy="200" r="11" fill="#0f172a"/>
                <rect x="520" y="160" width="14" height="50" fill="#475569"/><circle cx="510" cy="210" r="18" fill="#0f172a"/><circle cx="535" cy="210" r="18" fill="#0f172a"/>
                
                <!-- Cola A350 Curva (Pintada) -->
                <path d="M 750 80 Q 800 20 840 -10 L 920 -10 L 900 80 Z" fill="currentColor" />
                
                <!-- Fuselaje Widebody -->
                <path d="M 100 160 Q 30 160 30 120 C 30 90 70 80 150 80 L 820 80 C 960 80 980 100 980 120 Q 950 160 800 160 Z" fill="url(#fuseBase)" />
                
                <!-- Ala A350 Blended Winglet (Pintado) -->
                <path d="M 400 135 L 560 135 L 720 220 Q 750 240 760 200 L 750 200 Q 740 220 710 210 L 480 135 Z" fill="url(#fuseBase)" />
                <path d="M 720 220 Q 750 240 760 200 L 750 200 Q 740 220 710 210 Z" fill="currentColor" />
                
                <!-- Motor Trent XWB Masivo -->
                <rect x="330" y="125" width="130" height="70" rx="35" fill="url(#engineBase)" />
                <ellipse cx="335" cy="160" rx="12" ry="32" fill="#0f172a" />
                
                <!-- Antifaz Negro (Raccoon Mask) característico del A350 -->
                <path d="M 110 108 L 160 108 L 150 85 L 105 85 C 100 95 100 105 110 108 Z" fill="#020617" opacity="0.8"/>
                <path d="M 115 105 L 155 105 L 145 88 Q 130 88 110 98 Z" fill="url(#glass)" />
                
                <!-- Ventanas -->
                <line x1="200" y1="112" x2="780" y2="112" stroke="url(#glass)" stroke-width="7" stroke-dasharray="6 12" />
                <rect x="180" y="90" width="18" height="40" rx="3" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
                <rect x="400" y="90" width="18" height="40" rx="3" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
                <rect x="790" y="90" width="18" height="40" rx="3" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'f22', name: 'Lockheed Martin F-22 Raptor', type: 'Caza Furtivo', category: 'military', price: 150000000, capacity: 1, maxSeats: 1, range: 2960, dailyProfit: 250000, defaultColor: '#475569',
        modelUrl: 'models/f-22_raptor_-_fighter_jet_-_free.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(50, 60)">
                <!-- Fuselaje Furtivo -->
                <path d="M 100 130 L 300 120 L 500 110 L 750 110 L 900 120 L 950 140 L 850 150 L 700 160 L 400 160 L 200 150 Z" fill="currentColor" />
                <!-- Ala Delta Furtiva -->
                <path d="M 400 140 L 600 220 L 750 220 L 700 140 Z" fill="currentColor" opacity="0.8"/>
                <!-- Estabilizador Vertical -->
                <path d="M 700 110 L 800 20 L 880 20 L 850 110 Z" fill="currentColor" />
                <!-- Motor Vectorial -->
                <path d="M 900 125 L 980 125 L 970 145 L 900 145 Z" fill="#1e293b"/>
                <!-- Nariz y Cockpit -->
                <path d="M 100 130 L 50 140 L 150 145 Z" fill="currentColor"/>
                <path d="M 180 125 L 280 120 L 300 100 L 200 105 Z" fill="url(#glass)"/>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'p40', name: 'Curtiss P-40 Warhawk', type: 'Caza Histórico', category: 'military', price: 4000000, capacity: 1, maxSeats: 1, range: 1100, dailyProfit: 35000, defaultColor: '#4d7c0f',
        modelUrl: 'https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/p40/glTF2/P40.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(100, 100)">
                <path d="M 100 50 L 500 50 L 600 0 L 700 0 L 700 50 L 800 50 L 800 100 L 100 100 Z" fill="currentColor"/>
            </g>
        </svg>`, maintFactor: 1.5
    },
    { 
        id: 'rq4', name: 'RQ-4 Global Hawk (Dron Militar)', type: 'Vigilancia Avanzada', category: 'military', price: 130000000, capacity: 0, maxSeats: 0, range: 22780, dailyProfit: 180000, defaultColor: '#94a3b8',
        modelUrl: 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Global%20Hawk/Global%20Hawk.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(100, 100)">
                <path d="M 100 50 L 500 50 L 600 0 L 700 0 L 700 50 L 800 50 L 800 100 L 100 100 Z" fill="currentColor"/>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b2', name: 'Northrop Grumman B-2 Spirit', type: 'Bombardero Furtivo', category: 'military', price: 2000000000, capacity: 2, maxSeats: 2, range: 11100, dailyProfit: 450000, defaultColor: '#1e293b',
        modelUrl: 'models/northrop_grumman_b-2_spirit_-_free.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(50, 100)">
                <!-- B-2 Flying Wing profile (side view) -->
                <path d="M 100 50 L 400 40 L 700 35 L 850 40 L 900 60 L 800 65 L 500 65 L 200 60 L 100 50 Z" fill="currentColor"/>
                <path d="M 250 45 L 350 40 L 450 45 Z" fill="url(#glass)"/>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b1', name: 'Rockwell B-1 Lancer', type: 'Bombardero Estratégico', category: 'military', price: 283000000, capacity: 4, maxSeats: 4, range: 11998, dailyProfit: 300000, defaultColor: '#64748b',
        modelUrl: 'models/battlefield_4_-_b1-_lancer.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(50, 100)">
                <!-- B-1 Long sleek fuselage -->
                <path d="M 50 70 L 300 60 L 600 55 L 800 50 L 950 50 L 950 80 L 800 80 L 600 85 L 300 85 L 50 70 Z" fill="currentColor"/>
                <!-- Swept wing -->
                <path d="M 500 80 L 700 180 L 850 180 L 650 80 Z" fill="currentColor" opacity="0.8"/>
                <!-- Vertical tail -->
                <path d="M 800 50 L 900 -20 L 950 -20 L 920 50 Z" fill="currentColor"/>
                <!-- Cockpit -->
                <path d="M 150 65 L 250 60 L 300 60 L 200 65 Z" fill="url(#glass)"/>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b52', name: 'Boeing B-52 Stratofortress', type: 'Bombardero Pesado', category: 'military', price: 84000000, capacity: 5, maxSeats: 5, range: 14200, dailyProfit: 250000, defaultColor: '#4b5563',
        modelUrl: 'models/boeing_b-52_stratofortress.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(20, 100)">
                <!-- B-52 massive fuselage -->
                <path d="M 50 60 L 250 50 L 600 45 L 850 45 L 980 50 L 950 90 L 800 90 L 500 95 L 200 85 L 50 60 Z" fill="currentColor"/>
                <!-- Huge swept wing -->
                <path d="M 400 90 L 600 200 L 750 200 L 550 90 Z" fill="currentColor" opacity="0.8"/>
                <!-- Tail -->
                <path d="M 850 45 L 900 -10 L 950 -10 L 950 45 Z" fill="currentColor"/>
                <!-- Engines -->
                <rect x="450" y="110" width="40" height="20" rx="10" fill="#1e293b"/>
                <rect x="550" y="140" width="40" height="20" rx="10" fill="#1e293b"/>
                <!-- Cockpit -->
                <path d="M 100 55 L 150 50 L 200 50 Z" fill="url(#glass)"/>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'a310_mrtt', name: 'Airbus A310 MRTT', type: 'Transporte Militar', category: 'military', price: 150000000, capacity: 187, maxSeats: 214, range: 13000, dailyProfit: 600000, defaultColor: '#708090',
        modelUrl: 'models/airbus_a310_mrtt.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(30, 40)">
                <!-- Fuselaje Militar -->
                <path d="M 120 160 Q 50 160 50 130 Q 50 100 150 100 L 800 100 Q 940 100 950 125 L 950 135 Q 920 160 800 160 Z" fill="url(#fuseBase)" />
                <path d="M 750 100 L 830 -5 L 890 -5 L 870 100 Z" fill="currentColor" />
                <path d="M 420 145 L 560 145 L 670 230 L 480 230 Z" fill="url(#fuseBase)" />
                <rect x="360" y="135" width="90" height="45" rx="22" fill="currentColor" opacity="0.9" />
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'a380', name: 'Airbus A380 Superjumbo', type: 'Largo Alcance Pesado', category: 'commercial', price: 446000000, capacity: 525, maxSeats: 853, range: 15200, dailyProfit: 1800000, defaultColor: '#1a365d',
        modelUrl: 'models/airbus_a380.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(10, 30)">
                <!-- Fuselaje Doble Cubierta A380 -->
                <path d="M 100 170 Q 30 170 30 120 C 30 70 80 60 180 60 L 800 60 Q 960 60 970 110 L 970 130 Q 950 170 800 170 Z" fill="url(#fuseBase)" />
                <!-- Cola Gigante -->
                <path d="M 730 60 L 820 -20 L 920 -20 L 890 60 Z" fill="currentColor" />
                <!-- Dos Filas de Ventanas -->
                <line x1="200" y1="90" x2="780" y2="90" stroke="url(#glass)" stroke-width="5" stroke-dasharray="4 8" />
                <line x1="180" y1="125" x2="800" y2="125" stroke="url(#glass)" stroke-width="5" stroke-dasharray="4 8" />
                <!-- Alas y Motores (4 motores representados de perfil) -->
                <path d="M 380 150 L 550 150 L 680 240 L 450 240 Z" fill="url(#fuseBase)" />
                <rect x="350" y="140" width="80" height="40" rx="20" fill="currentColor" opacity="0.95" />
                <rect x="420" y="160" width="70" height="35" rx="17" fill="currentColor" opacity="0.85" />
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'f15', name: 'McDonnell Douglas F-15 Eagle', type: 'Caza de Superioridad', category: 'military', price: 30000000, capacity: 1, maxSeats: 1, range: 4800, dailyProfit: 120000, defaultColor: '#78909c',
        modelUrl: 'models/f-15.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(50, 60)">
                <!-- Perfil F-15 -->
                <path d="M 80 130 L 300 120 L 700 120 L 850 130 L 920 140 L 800 150 L 600 150 L 200 145 Z" fill="currentColor" />
                <!-- Estabilizadores doble cola -->
                <path d="M 720 120 L 780 30 L 850 30 L 830 120 Z" fill="currentColor" />
                <path d="M 450 135 L 650 210 L 750 210 L 700 135 Z" fill="currentColor" opacity="0.8"/>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'f35', name: 'Lockheed Martin F-35 Lightning II', type: 'Caza Polivalente Furtivo', category: 'military', price: 85000000, capacity: 1, maxSeats: 1, range: 2800, dailyProfit: 220000, defaultColor: '#37474f',
        modelUrl: 'models/f-35_lightning_ii_-_fighter_jet_-_free.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(50, 60)">
                <!-- Perfil F-35 -->
                <path d="M 100 130 L 320 122 L 680 120 L 820 130 L 900 140 L 780 148 L 580 148 L 200 145 Z" fill="currentColor" />
                <!-- Estabilizadores verticales inclinados -->
                <path d="M 680 120 L 750 40 L 820 40 L 800 120 Z" fill="currentColor" />
                <path d="M 400 135 L 580 215 L 680 215 L 640 135 Z" fill="currentColor" opacity="0.8"/>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'fjets_lowpoly', name: 'Caza Polivalente Low-Poly', type: 'Caza Ligero', category: 'military', price: 15000000, capacity: 1, maxSeats: 1, range: 2200, dailyProfit: 80000, defaultColor: '#0f766e',
        modelUrl: 'models/free_-_fighter_jet_collection_-_low_poly.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(50, 60)">
                <path d="M 120 130 L 300 125 L 650 125 L 800 130 L 880 140 L 780 145 L 600 145 Z" fill="currentColor" />
                <path d="M 680 125 L 740 45 L 800 45 L 780 125 Z" fill="currentColor" />
                <path d="M 420 135 L 570 205 L 660 205 L 620 135 Z" fill="currentColor" opacity="0.8"/>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'a340', name: 'Airbus A340-600', type: 'Largo Alcance Cuatrimotor', category: 'commercial', price: 275000000, capacity: 380, maxSeats: 475, range: 14450, dailyProfit: 950000, defaultColor: '#0f172a',
        modelUrl: 'models/lufthansa_airbus_a340-600.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(15, 40)">
                <!-- Fuselaje Ultra Largo del A340-600 -->
                <path d="M 80 155 Q 30 155 30 125 C 30 95 60 85 150 85 L 880 85 Q 970 85 980 115 L 980 125 Q 950 155 850 155 Z" fill="url(#fuseBase)" />
                <!-- Cola -->
                <path d="M 800 85 L 860 0 L 930 0 L 910 85 Z" fill="currentColor" />
                <!-- Alas y 4 Motores -->
                <path d="M 450 140 L 600 140 L 720 240 L 500 240 Z" fill="url(#fuseBase)" />
                <rect x="420" y="130" width="70" height="35" rx="17" fill="currentColor" opacity="0.9" />
                <rect x="490" y="145" width="60" height="30" rx="15" fill="currentColor" opacity="0.8" />
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'mig35', name: 'Mikoyan MiG-35', type: 'Caza Multirrol', category: 'military', price: 40000000, capacity: 1, maxSeats: 1, range: 2000, dailyProfit: 110000, defaultColor: '#546e7a',
        modelUrl: 'models/mig-35_-_fighter_jet_-_free.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(50, 60)">
                <path d="M 90 130 L 290 122 L 670 122 L 810 130 L 890 140 L 790 146 L 590 146 Z" fill="currentColor" />
                <path d="M 670 122 L 730 42 L 790 42 L 770 122 Z" fill="currentColor" />
                <path d="M 410 135 L 560 210 L 650 210 L 610 135 Z" fill="currentColor" opacity="0.8"/>
            </g>
        </svg>`, maintFactor: 1
    },

    { 
        id: 'a318', name: 'Airbus A318', type: 'Corto Alcance', category: 'commercial', price: 77000000, capacity: 107, maxSeats: 132, range: 5750, dailyProfit: 250000, defaultColor: '#10b981',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'a319', name: 'Airbus A319', type: 'Corto Alcance', category: 'commercial', price: 90000000, capacity: 124, maxSeats: 156, range: 6950, dailyProfit: 320000, defaultColor: '#10b981',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'a321', name: 'Airbus A321neo', type: 'Medio Alcance', category: 'commercial', price: 129000000, capacity: 206, maxSeats: 240, range: 7400, dailyProfit: 500000, defaultColor: '#10b981',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'a332', name: 'Airbus A330-200', type: 'Largo Alcance', category: 'commercial', price: 238000000, capacity: 246, maxSeats: 406, range: 13450, dailyProfit: 800000, defaultColor: '#3b82f6',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'a333', name: 'Airbus A330-300', type: 'Largo Alcance', category: 'commercial', price: 264000000, capacity: 277, maxSeats: 440, range: 11750, dailyProfit: 850000, defaultColor: '#3b82f6',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'a338', name: 'Airbus A330-800neo', type: 'Largo Alcance', category: 'commercial', price: 260000000, capacity: 257, maxSeats: 406, range: 15090, dailyProfit: 900000, defaultColor: '#3b82f6',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'a339', name: 'Airbus A330-900neo', type: 'Largo Alcance', category: 'commercial', price: 296000000, capacity: 287, maxSeats: 440, range: 13330, dailyProfit: 950000, defaultColor: '#3b82f6',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'a343', name: 'Airbus A340-300', type: 'Largo Alcance', category: 'commercial', price: 238000000, capacity: 277, maxSeats: 440, range: 13500, dailyProfit: 750000, defaultColor: '#8b5cf6',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'a346', name: 'Airbus A340-600', type: 'Largo Alcance Pesado', category: 'commercial', price: 275000000, capacity: 326, maxSeats: 475, range: 14450, dailyProfit: 900000, defaultColor: '#8b5cf6',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'a351', name: 'Airbus A350-1000', type: 'Largo Alcance Pesado', category: 'commercial', price: 366000000, capacity: 369, maxSeats: 480, range: 16100, dailyProfit: 1300000, defaultColor: '#6366f1',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },

    { 
        id: 'b717', name: 'Boeing 717-200', type: 'Regional Jet', category: 'commercial', price: 25000000, capacity: 106, maxSeats: 134, range: 3820, dailyProfit: 120000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'b734', name: 'Boeing 737-400', type: 'Corto Alcance', category: 'commercial', price: 40000000, capacity: 146, maxSeats: 188, range: 3800, dailyProfit: 250000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'b738', name: 'Boeing 737-800', type: 'Medio Alcance', category: 'commercial', price: 106000000, capacity: 162, maxSeats: 189, range: 5436, dailyProfit: 350000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b744', name: 'Boeing 747-400', type: 'Largo Alcance Pesado', category: 'commercial', price: 240000000, capacity: 416, maxSeats: 660, range: 13450, dailyProfit: 800000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b748', name: 'Boeing 747-8 Intercontinental', type: 'Largo Alcance Pesado', category: 'commercial', price: 418000000, capacity: 467, maxSeats: 605, range: 14320, dailyProfit: 1200000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b752', name: 'Boeing 757-200', type: 'Medio Alcance', category: 'commercial', price: 65000000, capacity: 200, maxSeats: 239, range: 7222, dailyProfit: 350000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'b763', name: 'Boeing 767-300ER', type: 'Largo Alcance', category: 'commercial', price: 197000000, capacity: 218, maxSeats: 350, range: 11090, dailyProfit: 550000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b772', name: 'Boeing 777-200ER', type: 'Largo Alcance Pesado', category: 'commercial', price: 306000000, capacity: 313, maxSeats: 440, range: 13080, dailyProfit: 950000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b773', name: 'Boeing 777-300ER', type: 'Largo Alcance Pesado', category: 'commercial', price: 375000000, capacity: 396, maxSeats: 550, range: 13649, dailyProfit: 1300000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b779', name: 'Boeing 777-9', type: 'Largo Alcance Pesado', category: 'commercial', price: 442000000, capacity: 426, maxSeats: 550, range: 13500, dailyProfit: 1500000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'e170', name: 'Embraer E170', type: 'Regional Jet', category: 'commercial', price: 35000000, capacity: 66, maxSeats: 78, range: 3982, dailyProfit: 95000, defaultColor: '#2563eb',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'e175', name: 'Embraer E175', type: 'Regional Jet', category: 'commercial', price: 40000000, capacity: 76, maxSeats: 88, range: 4074, dailyProfit: 105000, defaultColor: '#2563eb',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'e195', name: 'Embraer E195', type: 'Regional Jet', category: 'commercial', price: 55000000, capacity: 118, maxSeats: 124, range: 4260, dailyProfit: 145000, defaultColor: '#2563eb',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'e190e2', name: 'Embraer E190-E2', type: 'Regional Jet', category: 'commercial', price: 60000000, capacity: 106, maxSeats: 114, range: 5278, dailyProfit: 165000, defaultColor: '#2563eb',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'erj145', name: 'Embraer ERJ-145', type: 'Regional Jet', category: 'commercial', price: 15000000, capacity: 50, maxSeats: 50, range: 2870, dailyProfit: 75000, defaultColor: '#2563eb',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'crj2', name: 'Bombardier CRJ-200', type: 'Regional Jet', category: 'commercial', price: 12000000, capacity: 50, maxSeats: 50, range: 3148, dailyProfit: 70000, defaultColor: '#64748b',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'crj7', name: 'Bombardier CRJ-700', type: 'Regional Jet', category: 'commercial', price: 24000000, capacity: 78, maxSeats: 78, range: 2553, dailyProfit: 90000, defaultColor: '#64748b',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'crj9', name: 'Bombardier CRJ-900', type: 'Regional Jet', category: 'commercial', price: 46000000, capacity: 90, maxSeats: 90, range: 2871, dailyProfit: 110000, defaultColor: '#64748b',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'a221', name: 'Airbus A220-100', type: 'Regional Jet', category: 'commercial', price: 81000000, capacity: 116, maxSeats: 135, range: 6390, dailyProfit: 180000, defaultColor: '#10b981',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'a223', name: 'Airbus A220-300', type: 'Medio Alcance', category: 'commercial', price: 91000000, capacity: 140, maxSeats: 160, range: 6297, dailyProfit: 220000, defaultColor: '#10b981',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'atr42', name: 'ATR 42-600', type: 'Turbohélice Regional', category: 'commercial', price: 20000000, capacity: 48, maxSeats: 50, range: 1326, dailyProfit: 50000, defaultColor: '#f59e0b',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'atr72', name: 'ATR 72-600', type: 'Turbohélice Regional', category: 'commercial', price: 26000000, capacity: 72, maxSeats: 78, range: 1528, dailyProfit: 70000, defaultColor: '#f59e0b',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'md80', name: 'McDonnell Douglas MD-80', type: 'Corto Alcance', category: 'commercial', price: 15000000, capacity: 155, maxSeats: 172, range: 2897, dailyProfit: 180000, defaultColor: '#ef4444',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'md11', name: 'McDonnell Douglas MD-11', type: 'Largo Alcance Pesado', category: 'commercial', price: 85000000, capacity: 298, maxSeats: 410, range: 12633, dailyProfit: 450000, defaultColor: '#ef4444',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },

    { 
        id: 'a300', name: 'Airbus A300-600', type: 'Medio Alcance Pesado', category: 'commercial', price: 75000000, capacity: 266, maxSeats: 345, range: 7500, dailyProfit: 450000, defaultColor: '#10b981',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'a321xlr', name: 'Airbus A321XLR', type: 'Largo Alcance Estrecho', category: 'commercial', price: 142000000, capacity: 200, maxSeats: 244, range: 8700, dailyProfit: 550000, defaultColor: '#10b981',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b707', name: 'Boeing 707-320B', type: 'Clásico Largo Alcance', category: 'commercial', price: 15000000, capacity: 141, maxSeats: 189, range: 9300, dailyProfit: 150000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'b727', name: 'Boeing 727-200', type: 'Clásico Medio Alcance', category: 'commercial', price: 10000000, capacity: 145, maxSeats: 189, range: 3500, dailyProfit: 120000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'b737_700', name: 'Boeing 737-700', type: 'Corto Alcance', category: 'commercial', price: 89000000, capacity: 126, maxSeats: 149, range: 6230, dailyProfit: 280000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'b737_900er', name: 'Boeing 737-900ER', type: 'Medio Alcance', category: 'commercial', price: 112000000, capacity: 177, maxSeats: 215, range: 5460, dailyProfit: 380000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b737_max9', name: 'Boeing 737 MAX 9', type: 'Medio Alcance', category: 'commercial', price: 128000000, capacity: 193, maxSeats: 220, range: 6500, dailyProfit: 460000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b737_max10', name: 'Boeing 737 MAX 10', type: 'Medio Alcance', category: 'commercial', price: 134000000, capacity: 204, maxSeats: 230, range: 6110, dailyProfit: 500000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b767_400er', name: 'Boeing 767-400ER', type: 'Largo Alcance Pesado', category: 'commercial', price: 220000000, capacity: 245, maxSeats: 375, range: 10415, dailyProfit: 600000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b777_200lr', name: 'Boeing 777-200LR', type: 'Ultra Largo Alcance', category: 'commercial', price: 346000000, capacity: 317, maxSeats: 440, range: 15843, dailyProfit: 1000000, defaultColor: '#0ea5e9',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b787_8', name: 'Boeing 787-8 Dreamliner', type: 'Largo Alcance', category: 'commercial', price: 248000000, capacity: 242, maxSeats: 359, range: 13620, dailyProfit: 950000, defaultColor: '#8b5cf6',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'b787_10', name: 'Boeing 787-10 Dreamliner', type: 'Largo Alcance Pesado', category: 'commercial', price: 338000000, capacity: 330, maxSeats: 440, range: 11910, dailyProfit: 1150000, defaultColor: '#8b5cf6',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'l1011', name: 'Lockheed L-1011 TriStar', type: 'Clásico Pesado', category: 'commercial', price: 35000000, capacity: 256, maxSeats: 400, range: 7410, dailyProfit: 250000, defaultColor: '#94a3b8',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'c130', name: 'Lockheed C-130 Hercules', type: 'Transporte Militar/Cargo', category: 'military', price: 30000000, capacity: 92, maxSeats: 92, range: 3800, dailyProfit: 150000, defaultColor: '#4b5563',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'an124', name: 'Antonov An-124 Ruslan', type: 'Carga Súper Pesada', category: 'cargo', price: 150000000, capacity: 0, maxSeats: 88, range: 15000, dailyProfit: 1200000, defaultColor: '#eab308',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'an225', name: 'Antonov An-225 Mriya', type: 'Carga Ultra Pesada', category: 'cargo', price: 300000000, capacity: 0, maxSeats: 70, range: 15400, dailyProfit: 2500000, defaultColor: '#eab308',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'tu154', name: 'Tupolev Tu-154', type: 'Clásico Medio Alcance', category: 'commercial', price: 15000000, capacity: 164, maxSeats: 180, range: 5280, dailyProfit: 180000, defaultColor: '#ef4444',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'il76', name: 'Ilyushin Il-76', type: 'Carga Pesada / Militar', category: 'cargo', price: 50000000, capacity: 0, maxSeats: 140, range: 4400, dailyProfit: 400000, defaultColor: '#94a3b8',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'ssj100', name: 'Sukhoi Superjet 100', type: 'Regional Jet', category: 'commercial', price: 35000000, capacity: 87, maxSeats: 108, range: 4578, dailyProfit: 110000, defaultColor: '#2563eb',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'conc', name: 'Aerospatiale/BAC Concorde', type: 'Supersónico Comercial', category: 'commercial', price: 200000000, capacity: 100, maxSeats: 128, range: 7222, dailyProfit: 2000000, defaultColor: '#f8fafc',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 0.8
    },
    { 
        id: 'g650', name: 'Gulfstream G650', type: 'Jet de Negocios VIP', category: 'commercial', price: 65000000, capacity: 18, maxSeats: 19, range: 12960, dailyProfit: 300000, defaultColor: '#334155',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'citx', name: 'Cessna Citation X', type: 'Jet de Negocios Rápido', category: 'commercial', price: 23000000, capacity: 9, maxSeats: 12, range: 6408, dailyProfit: 150000, defaultColor: '#334155',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    },
    { 
        id: 'glob6k', name: 'Bombardier Global 6000', type: 'Jet de Negocios VIP', category: 'commercial', price: 62000000, capacity: 13, maxSeats: 17, range: 11112, dailyProfit: 280000, defaultColor: '#334155',
        modelUrl: '',
        svg: `<svg viewBox="0 0 1000 300" class="w-full h-full" style="color: #94a3b8;">
            <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <line x1="-21" y1="-21" x2="21" y2="21" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                <text x="0" y="55" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="sans-serif" font-size="12" font-weight="300" letter-spacing="1">SIN MODELO VISUAL</text>
            </g>
        </svg>`, maintFactor: 1
    }

];

const AIRCRAFT_SPECS_LOOKUP = {
    a300: { speed: "833 km/h", range: "7,500 km", fuel: "5.8 L/km", takeoff: "2,324 m", engine: "GE CF6-80C2", weight: "171.7 t", wingspan: "44.8 m" },
    a321xlr: { speed: "833 km/h", range: "8,700 km", fuel: "2.3 L/km", takeoff: "2,150 m", engine: "CFM LEAP-1A", weight: "101.0 t", wingspan: "35.8 m" },
    b707: { speed: "972 km/h", range: "9,300 km", fuel: "7.5 L/km", takeoff: "3,100 m", engine: "P&W JT3D", weight: "151.3 t", wingspan: "44.4 m" },
    b727: { speed: "953 km/h", range: "3,500 km", fuel: "5.0 L/km", takeoff: "2,500 m", engine: "P&W JT8D", weight: "95.0 t", wingspan: "32.9 m" },
    b737_700: { speed: "838 km/h", range: "6,230 km", fuel: "2.4 L/km", takeoff: "2,042 m", engine: "CFM56-7B", weight: "70.0 t", wingspan: "34.3 m" },
    b737_900er: { speed: "838 km/h", range: "5,460 km", fuel: "2.7 L/km", takeoff: "2,804 m", engine: "CFM56-7B", weight: "85.1 t", wingspan: "35.8 m" },
    b737_max9: { speed: "838 km/h", range: "6,500 km", fuel: "2.3 L/km", takeoff: "2,600 m", engine: "CFM LEAP-1B", weight: "88.3 t", wingspan: "35.9 m" },
    b737_max10: { speed: "838 km/h", range: "6,110 km", fuel: "2.4 L/km", takeoff: "2,700 m", engine: "CFM LEAP-1B", weight: "89.8 t", wingspan: "35.9 m" },
    b767_400er: { speed: "851 km/h", range: "10,415 km", fuel: "5.7 L/km", takeoff: "2,800 m", engine: "GE CF6-80C2", weight: "204.1 t", wingspan: "51.9 m" },
    b777_200lr: { speed: "905 km/h", range: "15,843 km", fuel: "6.8 L/km", takeoff: "2,800 m", engine: "GE90-110B", weight: "347.5 t", wingspan: "64.8 m" },
    b787_8: { speed: "903 km/h", range: "13,620 km", fuel: "4.8 L/km", takeoff: "2,600 m", engine: "GEnx-1B", weight: "227.9 t", wingspan: "60.1 m" },
    b787_10: { speed: "903 km/h", range: "11,910 km", fuel: "5.4 L/km", takeoff: "2,800 m", engine: "GEnx-1B", weight: "254.0 t", wingspan: "60.1 m" },
    l1011: { speed: "894 km/h", range: "7,410 km", fuel: "8.0 L/km", takeoff: "2,800 m", engine: "RR RB211", weight: "211.4 t", wingspan: "47.3 m" },
    c130: { speed: "592 km/h", range: "3,800 km", fuel: "3.5 L/km", takeoff: "1,093 m", engine: "Allison T56", weight: "70.3 t", wingspan: "40.4 m" },
    an124: { speed: "865 km/h", range: "15,000 km", fuel: "12.0 L/km", takeoff: "2,520 m", engine: "Progress D-18T", weight: "402.0 t", wingspan: "73.3 m" },
    an225: { speed: "850 km/h", range: "15,400 km", fuel: "18.0 L/km", takeoff: "3,500 m", engine: "Progress D-18T", weight: "640.0 t", wingspan: "88.4 m" },
    tu154: { speed: "950 km/h", range: "5,280 km", fuel: "6.0 L/km", takeoff: "2,200 m", engine: "Soloviev D-30", weight: "100.0 t", wingspan: "37.5 m" },
    il76: { speed: "900 km/h", range: "4,400 km", fuel: "8.5 L/km", takeoff: "1,700 m", engine: "Soloviev D-30KP", weight: "195.0 t", wingspan: "50.5 m" },
    ssj100: { speed: "870 km/h", range: "4,578 km", fuel: "1.9 L/km", takeoff: "1,731 m", engine: "PowerJet SaM146", weight: "49.4 t", wingspan: "27.8 m" },
    conc: { speed: "2,179 km/h (Mach 2.04)", range: "7,222 km", fuel: "20.5 L/km", takeoff: "3,600 m", engine: "RR/Snecma Olympus", weight: "185.0 t", wingspan: "25.6 m" },
    g650: { speed: "956 km/h", range: "12,960 km", fuel: "1.8 L/km", takeoff: "1,786 m", engine: "RR BR725", weight: "45.2 t", wingspan: "30.3 m" },
    citx: { speed: "972 km/h", range: "6,408 km", fuel: "1.2 L/km", takeoff: "1,567 m", engine: "RR AE 3007", weight: "16.3 t", wingspan: "19.3 m" },
    glob6k: { speed: "904 km/h", range: "11,112 km", fuel: "1.7 L/km", takeoff: "1,974 m", engine: "RR BR710", weight: "45.1 t", wingspan: "28.6 m" },

    b717: { speed: "811 km/h", range: "3,820 km", fuel: "2.3 L/km", takeoff: "1,500 m", engine: "RR BR715", weight: "54.8 t", wingspan: "28.4 m" },
    b734: { speed: "780 km/h", range: "3,800 km", fuel: "3.2 L/km", takeoff: "2,540 m", engine: "CFM56-3", weight: "68.0 t", wingspan: "28.9 m" },
    b738: { speed: "838 km/h", range: "5,436 km", fuel: "2.5 L/km", takeoff: "2,300 m", engine: "CFM56-7B", weight: "79.0 t", wingspan: "34.3 m" },
    b744: { speed: "920 km/h", range: "13,450 km", fuel: "10.0 L/km", takeoff: "3,018 m", engine: "PW4000 / GE CF6", weight: "396.8 t", wingspan: "64.4 m" },
    b748: { speed: "914 km/h", range: "14,320 km", fuel: "8.5 L/km", takeoff: "3,100 m", engine: "GEnx-2B67", weight: "447.7 t", wingspan: "68.4 m" },
    b752: { speed: "850 km/h", range: "7,222 km", fuel: "4.1 L/km", takeoff: "2,000 m", engine: "RR RB211", weight: "115.6 t", wingspan: "38.0 m" },
    b763: { speed: "851 km/h", range: "11,090 km", fuel: "5.5 L/km", takeoff: "2,410 m", engine: "GE CF6-80C2", weight: "186.8 t", wingspan: "47.6 m" },
    b772: { speed: "905 km/h", range: "13,080 km", fuel: "6.5 L/km", takeoff: "3,000 m", engine: "GE90 / RR Trent 800", weight: "297.5 t", wingspan: "60.9 m" },
    b773: { speed: "896 km/h", range: "13,649 km", fuel: "7.0 L/km", takeoff: "3,200 m", engine: "GE90-115B", weight: "351.5 t", wingspan: "64.8 m" },
    b779: { speed: "896 km/h", range: "13,500 km", fuel: "6.3 L/km", takeoff: "3,000 m", engine: "GE9X", weight: "351.5 t", wingspan: "71.7 m" },
    e170: { speed: "829 km/h", range: "3,982 km", fuel: "1.8 L/km", takeoff: "1,644 m", engine: "CF34-8E", weight: "38.6 t", wingspan: "26.0 m" },
    e175: { speed: "829 km/h", range: "4,074 km", fuel: "1.9 L/km", takeoff: "2,244 m", engine: "CF34-8E", weight: "40.3 t", wingspan: "26.0 m" },
    e195: { speed: "829 km/h", range: "4,260 km", fuel: "2.3 L/km", takeoff: "2,179 m", engine: "CF34-10E", weight: "52.2 t", wingspan: "28.7 m" },
    e190e2: { speed: "870 km/h", range: "5,278 km", fuel: "2.0 L/km", takeoff: "1,650 m", engine: "PW1900G", weight: "56.4 t", wingspan: "33.7 m" },
    erj145: { speed: "833 km/h", range: "2,870 km", fuel: "1.5 L/km", takeoff: "2,270 m", engine: "AE 3007", weight: "24.1 t", wingspan: "20.0 m" },
    crj2: { speed: "860 km/h", range: "3,148 km", fuel: "1.5 L/km", takeoff: "1,918 m", engine: "CF34-3B1", weight: "24.0 t", wingspan: "21.2 m" },
    crj7: { speed: "829 km/h", range: "2,553 km", fuel: "1.8 L/km", takeoff: "1,600 m", engine: "CF34-8C5B1", weight: "34.0 t", wingspan: "23.2 m" },
    crj9: { speed: "829 km/h", range: "2,871 km", fuel: "2.0 L/km", takeoff: "1,778 m", engine: "CF34-8C5", weight: "38.3 t", wingspan: "24.8 m" },
    a221: { speed: "829 km/h", range: "6,390 km", fuel: "1.8 L/km", takeoff: "1,463 m", engine: "PW1500G", weight: "63.1 t", wingspan: "35.1 m" },
    a223: { speed: "829 km/h", range: "6,297 km", fuel: "2.0 L/km", takeoff: "1,890 m", engine: "PW1500G", weight: "70.9 t", wingspan: "35.1 m" },
    atr42: { speed: "556 km/h", range: "1,326 km", fuel: "0.8 L/km", takeoff: "1,107 m", engine: "PW127M", weight: "18.6 t", wingspan: "24.5 m" },
    atr72: { speed: "510 km/h", range: "1,528 km", fuel: "1.1 L/km", takeoff: "1,367 m", engine: "PW127M", weight: "23.0 t", wingspan: "27.0 m" },
    md80: { speed: "811 km/h", range: "2,897 km", fuel: "3.5 L/km", takeoff: "2,200 m", engine: "JT8D-200", weight: "67.8 t", wingspan: "32.8 m" },
    md11: { speed: "876 km/h", range: "12,633 km", fuel: "8.5 L/km", takeoff: "3,100 m", engine: "GE CF6-80C2", weight: "285.9 t", wingspan: "51.6 m" },

    a318: { speed: "828 km/h", range: "5,750 km", fuel: "2.4 L/km", takeoff: "1,355 m", engine: "CFM56-5B", weight: "39.5 t", wingspan: "34.1 m" },
    a319: { speed: "828 km/h", range: "6,950 km", fuel: "2.5 L/km", takeoff: "1,950 m", engine: "CFM56-5B", weight: "40.8 t", wingspan: "35.8 m" },
    a321: { speed: "833 km/h", range: "7,400 km", fuel: "2.2 L/km", takeoff: "1,988 m", engine: "CFM LEAP-1A", weight: "50.1 t", wingspan: "35.8 m" },
    a332: { speed: "871 km/h", range: "13,450 km", fuel: "5.6 L/km", takeoff: "2,770 m", engine: "RR Trent 700", weight: "119.6 t", wingspan: "60.3 m" },
    a333: { speed: "871 km/h", range: "11,750 km", fuel: "5.8 L/km", takeoff: "2,770 m", engine: "RR Trent 700", weight: "124.5 t", wingspan: "60.3 m" },
    a338: { speed: "871 km/h", range: "15,090 km", fuel: "5.0 L/km", takeoff: "2,770 m", engine: "RR Trent 7000", weight: "132 t", wingspan: "64.0 m" },
    a339: { speed: "871 km/h", range: "13,330 km", fuel: "5.2 L/km", takeoff: "2,770 m", engine: "RR Trent 7000", weight: "137 t", wingspan: "64.0 m" },
    a343: { speed: "871 km/h", range: "13,500 km", fuel: "6.5 L/km", takeoff: "3,000 m", engine: "CFM56-5C", weight: "130.2 t", wingspan: "60.3 m" },
    a346: { speed: "871 km/h", range: "14,450 km", fuel: "7.2 L/km", takeoff: "3,100 m", engine: "RR Trent 556", weight: "177.8 t", wingspan: "63.4 m" },
    a351: { speed: "903 km/h", range: "16,100 km", fuel: "5.6 L/km", takeoff: "2,600 m", engine: "RR Trent XWB-97", weight: "155 t", wingspan: "64.75 m" },

    c208: {
        speed: "340 km/h",
        ceiling: "25.000 ft (7.620 m)",
        fuelBurn: "180 L/h",
        engine: "Pratt & Whitney PT6A-114A Turboprop",
        wingspan: "15,85 m"
    },
    e190: {
        speed: "870 km/h",
        ceiling: "41.000 ft (12.500 m)",
        fuelBurn: "1.850 L/h",
        engine: "2x GE CF34-10E Turbofan",
        wingspan: "28,72 m"
    },
    b737: {
        speed: "839 km/h",
        ceiling: "41.000 ft (12.500 m)",
        fuelBurn: "2.500 L/h",
        engine: "2x CFM International LEAP-1B Turbofan",
        wingspan: "35,92 m"
    },
    a320: {
        speed: "828 km/h",
        ceiling: "39.800 ft (12.100 m)",
        fuelBurn: "2.400 L/h",
        engine: "2x CFM International LEAP-1A Turbofan",
        wingspan: "35,80 m"
    },
    b787: {
        speed: "903 km/h",
        ceiling: "43.000 ft (13.100 m)",
        fuelBurn: "5.400 L/h",
        engine: "2x General Electric GEnx-1B Turbofan",
        wingspan: "60,17 m"
    },
    a350: {
        speed: "903 km/h",
        ceiling: "43.100 ft (13.100 m)",
        fuelBurn: "5.800 L/h",
        engine: "2x Rolls-Royce Trent XWB Turbofan",
        wingspan: "64,75 m"
    },
    a380: {
        speed: "903 km/h",
        ceiling: "43.000 ft (13.100 m)",
        fuelBurn: "12.000 L/h",
        engine: "4x Engine Alliance GP7200 / RR Trent 900",
        wingspan: "79,75 m"
    },
    f22: {
        speed: "2.410 km/h (Mach 2,25)",
        ceiling: "65.000 ft (20.000 m)",
        fuelBurn: "4.500 L/h",
        engine: "2x Pratt & Whitney F119-PW-100 con postcombustión",
        wingspan: "13,56 m"
    },
    p40: {
        speed: "580 km/h",
        ceiling: "29.000 ft (8.800 m)",
        fuelBurn: "280 L/h",
        engine: "Allison V-1710-39 V12",
        wingspan: "11,38 m"
    },
    rq4: {
        speed: "575 km/h",
        ceiling: "60.000 ft (18.300 m)",
        fuelBurn: "320 L/h",
        engine: "Rolls-Royce F137-RR-100 Turbofan",
        wingspan: "39,90 m"
    },
    b2: {
        speed: "1.010 km/h",
        ceiling: "50.000 ft (15.200 m)",
        fuelBurn: "7.200 L/h",
        engine: "4x General Electric F118-GE-100 Turbofan",
        wingspan: "52,40 m"
    },
    b1: {
        speed: "1.330 km/h (Mach 1,25)",
        ceiling: "60.000 ft (18.000 m)",
        fuelBurn: "8.500 L/h",
        engine: "4x General Electric F101-GE-102 Turbofan con postcombustión",
        wingspan: "41,80 m"
    },
    b52: {
        speed: "1.047 km/h",
        ceiling: "50.000 ft (15.200 m)",
        fuelBurn: "11.500 L/h",
        engine: "8x Pratt & Whitney TF33-P-3/103 Turbofan",
        wingspan: "56,40 m"
    },
    a310_mrtt: {
        speed: "858 km/h",
        ceiling: "41.000 ft (12.500 m)",
        fuelBurn: "5.100 L/h",
        engine: "2x General Electric CF6-80C2 Turbofan",
        wingspan: "43,90 m"
    }
};



let gameState = { base: null, money: 50000000, time: { day: 1, hour: 8, minute: 0 }, fleet: [], routes: [], activeDispatches: [], currentTab: 'dashboard', gameLoop: null, employees: null, upgrades: { atcPriority: false, paxSatisfaction: false, extraHubs: 0, militaryAccess: false } };
let selectedAirportTemp = null;
let leafletMap = null;

let isCatchingUp = false;

// --- SISTEMA DE METEOROLOGÍA (MARKOV CHAIN) ---
const WEATHER_STATES = {
    CLEAR: { id: 'Despejado', icon: '☀️', color: '#fbbf24' },
    CLOUDY: { id: 'Nublado', icon: '☁️', color: '#9ca3af' },
    RAIN: { id: 'Lluvia', icon: '🌧️', color: '#60a5fa' },
    STORM: { id: 'Tormenta', icon: '⛈️', color: '#818cf8' },
    FOG: { id: 'Niebla', icon: '🌫️', color: '#cbd5e1' }
};


const getAircraftSpeed = (model) => {
    if (!model) return 800;
    if (model.speed) return model.speed;
    const lookup = typeof AIRCRAFT_SPECS_LOOKUP !== 'undefined' ? AIRCRAFT_SPECS_LOOKUP[model.id] : null;
    if (lookup && lookup.speed) {
        const match = lookup.speed.match(/([\d,]+)/);
        if (match) return parseInt(match[1].replace(/,/g, ''), 10);
    }
    if (model.category === 'military') {
        if (model.type.includes('Furtivo') || model.type.includes('Caza') || model.type.includes('Superioridad') || model.type.includes('Multirrol')) return 2000;
        if (model.type.includes('Bombardero')) return 1000;
        return 900;
    }
    if (model.id === 'c208' || model.type.includes('Ligero') || model.type.includes('Helicóptero')) return 340;
    if (model.type.includes('Regional')) return 700;
    return 800;
};

const WEATHER_TRANSITIONS = {
    'Despejado': [ { state: 'Despejado', prob: 0.60 }, { state: 'Nublado', prob: 0.90 }, { state: 'Niebla', prob: 1.00 } ],
    'Nublado':   [ { state: 'Nublado', prob: 0.45 }, { state: 'Despejado', prob: 0.75 }, { state: 'Lluvia', prob: 0.95 }, { state: 'Niebla', prob: 0.98 }, { state: 'Tormenta', prob: 1.00 } ],
    'Lluvia':    [ { state: 'Lluvia', prob: 0.50 }, { state: 'Nublado', prob: 0.70 }, { state: 'Tormenta', prob: 0.90 }, { state: 'Despejado', prob: 1.00 } ],
    'Tormenta':  [ { state: 'Tormenta', prob: 0.40 }, { state: 'Lluvia', prob: 0.70 }, { state: 'Nublado', prob: 1.00 } ],
    'Niebla':    [ { state: 'Niebla', prob: 0.30 }, { state: 'Nublado', prob: 0.60 }, { state: 'Despejado', prob: 1.00 } ]
};

const getNextWeather = (currentState) => {
    const r = Math.random();
    const transitions = WEATHER_TRANSITIONS[currentState] || WEATHER_TRANSITIONS['Despejado'];
    for (let t of transitions) {
        if (r <= t.prob) return t.state;
    }
    return 'Despejado';
};

const getRandomSeverity = (state) => {
    if (state === 'Despejado' || state === 'Nublado') return 0;
    const r = Math.random();
    if (r < 0.6) return 1; // Ligera
    if (r < 0.9) return 2; // Moderada
    return 3; // Extrema
};

const initWeatherSystem = () => {
    if (!gameState.weather) gameState.weather = {};
    AIRPORTS.forEach(ap => {
        if (!gameState.weather[ap.id]) {
            const initialStates = ['Despejado', 'Despejado', 'Nublado', 'Nublado', 'Lluvia', 'Niebla'];
            const state = initialStates[Math.floor(Math.random() * initialStates.length)];
            gameState.weather[ap.id] = {
                state: state,
                severity: getRandomSeverity(state),
                hoursRemaining: 3
            };
        }
    });
};

const updateWeatherSystem = () => {
    if (!gameState.weather) return;
    Object.keys(gameState.weather).forEach(apId => {
        let w = gameState.weather[apId];
        w.hoursRemaining--;
        if (w.hoursRemaining <= 0) {
            w.state = getNextWeather(w.state);
            w.severity = getRandomSeverity(w.state);
            w.hoursRemaining = 3;
        }
    });
};

const getWeatherInfo = (apId) => {
    if (!gameState.weather || !gameState.weather[apId]) return { ...WEATHER_STATES.CLEAR, text: 'Despejado', isExtreme: false };
    const w = gameState.weather[apId];
    const baseInfo = Object.values(WEATHER_STATES).find(x => x.id === w.state) || WEATHER_STATES.CLEAR;
    
    let severityText = '';
    if (w.severity > 0) {
        if (w.state === 'Niebla') severityText = w.severity === 1 ? ' (Ligera)' : w.severity === 2 ? ' (Densa)' : ' (Extrema)';
        else if (w.state === 'Tormenta') severityText = w.severity === 1 ? ' (Eléctrica)' : w.severity === 2 ? ' (Fuerte)' : ' (Extrema)';
        else if (w.state === 'Lluvia') severityText = w.severity === 1 ? ' (Ligera)' : w.severity === 2 ? ' (Moderada)' : ' (Torrencial)';
    }
    
    return {
        id: baseInfo.id,
        icon: baseInfo.icon,
        color: w.severity === 3 ? '#ef4444' : baseInfo.color,
        text: `${baseInfo.id}${severityText}`,
        isExtreme: w.severity === 3
    };
};

const saveGame = () => {
    gameState.lastSavedRealTime = lastRealTime;
    gameState.unprocessedSimMs = unprocessedSimMs;
    const stateToSave = { ...gameState, gameLoop: null };
    localStorage.setItem('airlineTycoonStatePro', JSON.stringify(stateToSave));
};

const loadGame = () => {
    const saved = localStorage.getItem('airlineTycoonStatePro');
    if (saved) {
        const parsed = JSON.parse(saved);
        gameState = { ...gameState, ...parsed, gameLoop: null };
        if (!gameState.routes) gameState.routes = [];
        if (!gameState.activeDispatches) gameState.activeDispatches = [];
        if (!gameState.time) gameState.time = { day: gameState.day || 1, hour: 8, minute: 0 };
        if (gameState.fuelReserves === undefined) gameState.fuelReserves = 0;
        if (gameState.fuelPrice === undefined) gameState.fuelPrice = 0.80;
        if (!gameState.fuelHistory) gameState.fuelHistory = [];
        fillFuelHistory();
        
        if (!gameState.moneyHistory) gameState.moneyHistory = [];
        if (!gameState.loans) gameState.loans = [];
        fillMoneyHistory();

        if (!gameState.upgrades) gameState.upgrades = { atcPriority: false, paxSatisfaction: false, extraHubs: 0, militaryAccess: false };
        
        if (!gameState.dailyRatings) gameState.dailyRatings = [];
        if (gameState.airlineRating === undefined) gameState.airlineRating = 3.0;

        // Initialize flight hours for backwards compatibility
        if (gameState.fleet) {
            gameState.fleet.forEach(plane => {
                if (plane.flightHours === undefined) plane.flightHours = 0;
            });
        }

        if (!gameState.stats) gameState.stats = {
            totalFlights: 0, totalPassengers: 0, totalRevenue: 0,
            totalFuelConsumed: 0, paxFirst: 0, paxBusiness: 0, paxEco: 0, paxCargo: 0,
            foundingDay: gameState.time ? gameState.time.day : 1,
            routesCreated: 0, totalDelayedFlights: 0, totalFlightsForOTP: 0,
            kmFlown: 0, peakFleetSize: 0
        };
        if (gameState.stats.foundingDay === undefined) gameState.stats.foundingDay = gameState.time ? gameState.time.day : 1;
        
        if (gameState.lastSavedRealTime) {
            lastRealTime = gameState.lastSavedRealTime;
            unprocessedSimMs = gameState.unprocessedSimMs || 0;
        } else {
            lastRealTime = Date.now();
            unprocessedSimMs = 0;
        }
        
        // Ensure planes have status and location
        gameState.fleet.forEach(p => { 
            if(!p.status) p.status = 'idle'; 
            if(!p.location) p.location = gameState.base ? gameState.base.id : 'EZE';
        });
        
        return true;
    } else {
        // Try to load legacy save just to keep fleet and money
        const legacy = localStorage.getItem('airlineTycoonState');
        if (legacy) {
            const parsed = JSON.parse(legacy);
            gameState.base = parsed.base;
            gameState.money = parsed.money;
            gameState.fleet = parsed.fleet || [];
            gameState.fleet.forEach(p => { p.status = 'idle'; });
            gameState.time = { day: parsed.day || 1, hour: 8, minute: 0 };
            return true;
        }
    }
    return false;
};

const resetGame = () => {
    if(confirm("¿Estás seguro de que quieres borrar todo tu progreso y empezar de cero?")) {
        localStorage.removeItem('airlineTycoonStatePro');
        localStorage.removeItem('airlineTycoonState');
        location.reload();
    }
};

const formatMoney = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
// Formato corto garantizado — máximo ~7 caracteres, nunca desborda el header
const formatMoneyShort = (amount) => {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    if (abs >= 1_000_000)     return `${sign}$${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (abs >= 1_000)         return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    return `${sign}$${abs}`;
};
const formatTime = (h, m) => {
    if (h === undefined || m === undefined) return '--:--';
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};
const getDayName = (dayIndex) => ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][(dayIndex - 1) % 7];
const generateRegistration = () => { const l = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; const c = () => l[Math.floor(Math.random() * l.length)]; return `LV-${c()}${c()}${c()}`; };

// Math helpers
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
};

const logMsg = (msg, type = 'info') => {
    const log = document.getElementById('log-container');
    if (!log) return;
    
    // Clear placeholder on first log
    const placeholder = log.querySelector('div');
    if (placeholder && placeholder.innerText.includes('Esperando')) placeholder.remove();

    const d = new Date(2026, 0, 1);
    d.setDate(d.getDate() + (gameState.time.day - 1));
    const dateStr = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    const timeStr = formatTime(gameState.time.hour, gameState.time.minute);

    const item = document.createElement('div');
    item.className = 'activity-item';

    let iconClass = 'act-icon-alert';
    let iconHTML = '<i class="ph-light ph-info"></i>';
    
    if (msg.toLowerCase().includes('aterrizado') || msg.toLowerCase().includes('despegado')) {
        iconClass = 'act-icon-plane';
        iconHTML = msg.toLowerCase().includes('despegado') ? '<i class="ph-light ph-airplane-takeoff"></i>' : '<i class="ph-light ph-airplane-landing"></i>';
    } else if (msg.toLowerCase().includes('comprado')) {
        iconClass = 'act-icon-buy';
        iconHTML = '<i class="ph-light ph-shopping-cart"></i>';
    } else if (msg.toLowerCase().includes('ingresos') || msg.toLowerCase().includes('$')) {
        iconClass = 'act-icon-money';
        iconHTML = '<i class="ph-light ph-money"></i>';
    }

    item.innerHTML = `
        <div class="act-icon ${iconClass}">${iconHTML}</div>
        <div class="act-content">
            <div class="act-header">
                <span class="act-title">${type === 'info' ? 'Actualización' : 'Atención'}</span>
                <span class="act-time">${dateStr} ${timeStr}</span>
            </div>
            <div class="act-desc">${msg}</div>
        </div>
    `;

    log.prepend(item);
};

const showToast = (title, message, type = 'success') => {
    // Notifications disabled per user request
};

// --- LEAFLET MAP ---
const initMap = () => {
    leafletMap = L.map('map', {zoomControl: false}).setView([20, 0], 2);
    L.control.zoom({ position: 'topright' }).addTo(leafletMap);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OSM &copy; CARTO', maxZoom: 19 }).addTo(leafletMap);
    AIRPORTS.forEach(ap => {
        const marker = L.circleMarker([ap.lat, ap.lng], { radius: 6, fillColor: "#0a84ff", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.8 }).addTo(leafletMap);
        marker.bindPopup(`<b>${ap.name}</b><br>Click para seleccionar.`);
        marker.on('click', () => {
            selectedAirportTemp = ap;
            document.getElementById('selected-airport-name').innerText = ap.name;
            
            // Actualizar clima en info del mapa
            const weatherSpan = document.getElementById('airport-weather-info');
            if (weatherSpan) {
                const wInfo = getWeatherInfo(ap.id);
                weatherSpan.innerHTML = `<span style="color:${wInfo.color};" title="${wInfo.id}">${wInfo.icon} ${wInfo.id}</span>`;
            }

            document.getElementById('airport-info').classList.remove('hidden');
            leafletMap.flyTo([ap.lat, ap.lng], 5, { duration: 1 });
        });
    });
    setTimeout(() => leafletMap.invalidateSize(), 300);
};

const startGame = () => {
    if (!selectedAirportTemp && !gameState.base) return;
    if (selectedAirportTemp) gameState.base = selectedAirportTemp;
    
    initWeatherSystem();

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-screen').classList.remove('hidden');
    
    logMsg(`Hub logístico establecido en ${gameState.base.name}.`);
    if(selectedAirportTemp) showToast('Base Establecida', `Operaciones iniciadas.`, 'info');
    else showToast('Partida Cargada', `Bienvenido de vuelta.`, 'info');

    // Offline progress is now handled naturally by gameTick using the real time anchor
    let deltaMs = Date.now() - lastRealTime;
    if (deltaMs > 60000) {
        let simHours = Math.floor((deltaMs * SIM_SPEED_MULTIPLIER) / 3600000);
        let simDays = Math.floor(simHours / 24);
        simHours = simHours % 24;
        if (simDays > 0 || simHours > 0) {
            logMsg(`Progreso offline recuperado: ${simDays}d y ${simHours}h simuladas.`);
        }
    }

    if (typeof applyBentoLayoutOrder === 'function') applyBentoLayoutOrder();
    renderMarket(); updateUI(); renderFlights();
    if (gameState.currentTab) switchTab(gameState.currentTab);
    
    if (gameState.gameLoop) clearInterval(gameState.gameLoop);
    
    fillFuelHistory();
    
    // Process initial catch-up and start interval
    gameTick();
    gameState.gameLoop = setInterval(gameTick, 100);
    saveGame();
};

window.setHeaderBack = function(action, text) {
    const brandDefault = document.getElementById('header-brand-default');
    const brandBack = document.getElementById('header-brand-back');
    const backText = document.getElementById('header-back-text');
    
    if (action) {
        window.headerBackAction = action;
        if(backText) backText.innerText = text || 'Atrás';
        if(brandDefault) brandDefault.style.display = 'none';
        if(brandBack) brandBack.style.display = 'flex';
    } else {
        window.headerBackAction = null;
        if(brandDefault) brandDefault.style.display = 'flex';
        if(brandBack) brandBack.style.display = 'none';
    }
};


const switchTab = (tab) => {
    // Hide all views
    ['dashboard', 'market', 'fleet', 'fuel', 'flights', 'routes', 'history', 'planner', 'aircraft-detail', 'bank', 'airline', 'employees', 'menu', 'stats', 'store', 'maintenance', 'maintenance-detail', 'passenger-reviews'].forEach(t => {
        const view = document.getElementById(`view-${t}`);
        if(view) {
            view.classList.remove('view-active');
            view.classList.add('view');
        }
    });

    // Update Top Nav (Market / Fleet / Fuel)
    const topNavMarket = document.getElementById('top-nav-market');
    if (tab === 'market' || tab === 'fleet' || tab === 'fuel') {
        if(topNavMarket) topNavMarket.classList.remove('hidden-nav');
        ['market', 'fleet', 'fuel'].forEach(t => {
            const btn = document.getElementById(`tab-${t}`);
            if(btn) btn.className = t === tab ? 'nav-tab nav-tab-active' : 'nav-tab';
        });
    } else {
        if(topNavMarket) topNavMarket.classList.add('hidden-nav');
    }

    // Update Top Nav (Flights / New Route / History / Planner)
    const topNavFlights = document.getElementById('top-nav-flights');
    if (tab === 'flights' || tab === 'routes' || tab === 'history' || tab === 'planner') {
        if(topNavFlights) topNavFlights.classList.remove('hidden-nav');
        ['flights', 'routes', 'history'].forEach(t => {
            const btn = document.getElementById(`tab-${t}`);
            if(btn) btn.className = t === tab ? 'nav-tab nav-tab-active' : 'nav-tab';
        });
        const plannerBtn = document.getElementById('tab-planner');
        if (plannerBtn) {
            if (tab === 'planner') {
                plannerBtn.classList.add('nav-tab-active');
            } else {
                plannerBtn.classList.remove('nav-tab-active');
            }
        }
    } else {
        if(topNavFlights) topNavFlights.classList.add('hidden-nav');
    }

    // Update Bottom Nav
    ['dashboard', 'market', 'flights', 'airline', 'menu'].forEach(t => {
        const bottomBtn = document.getElementById(`bottom-tab-${t}`);
        if(bottomBtn) bottomBtn.className = 'bottom-nav-btn';
    });
    
    // Bottom nav mapping
    let bottomTabId = tab;
    if (tab === 'fleet' || tab === 'fuel' || tab === 'aircraft-detail') bottomTabId = 'market';
    if (tab === 'routes' || tab === 'history' || tab === 'planner') bottomTabId = 'flights';
    if (tab === 'employees') bottomTabId = 'airline';
    if (tab === 'stats') bottomTabId = 'menu';
    if (tab === 'store') bottomTabId = 'menu';
    if (tab === 'maintenance' || tab === 'maintenance-detail') bottomTabId = 'menu';
    if (tab === 'passenger-reviews') bottomTabId = 'dashboard';
    const activeBottomBtn = document.getElementById(`bottom-tab-${bottomTabId}`);
    if(activeBottomBtn) activeBottomBtn.className = 'bottom-nav-btn active';

    // (Menu button handled by the forEach above now)

    // Show selected view
    const activeView = document.getElementById(`view-${tab}`);
    if(activeView) activeView.classList.add('view-active');
    
    gameState.currentTab = tab;
    if(tab === 'fleet') renderFleet();
    if(tab === 'fuel') renderFuelMarket();
    if(tab === 'flights') renderFlights();
    if(tab === 'history') renderHistory();
    if(tab === 'routes') renderRoutes();
    if(tab === 'planner') renderPlanner();
    if(tab === 'airline') renderAirline();
    if(tab === 'employees') renderEmployees();
    if(tab === 'menu') { if(window.renderMenuScreen) window.renderMenuScreen(); }
    if(tab === 'stats') { if(window.renderStats) window.renderStats(); }
    if(tab === 'store') { if(window.updateStoreUI) window.updateStoreUI(); }
    if(tab === 'maintenance') { if(window.renderMaintenance) window.renderMaintenance(); }
    if(tab === 'passenger-reviews') { renderPassengerReviewsScreen(); }
    
    // Update header back button logic
    if (tab === 'dashboard' || tab === 'flights' || tab === 'menu') {
        if (window.setHeaderBack) window.setHeaderBack(null);
    } else if (tab === 'market') {
        if (document.getElementById('market-models-view') && document.getElementById('market-models-view').style.display === 'block') {
            if (window.setHeaderBack) window.setHeaderBack(() => showManufacturers(), 'a Fabricantes');
        } else {
            if (window.setHeaderBack) window.setHeaderBack(null);
        }
    } else if (tab === 'fleet' || tab === 'fuel') {
        if (window.setHeaderBack) window.setHeaderBack(() => switchTab('market'), 'a Mercado');
    } else if (tab === 'routes' || tab === 'history' || tab === 'planner') {
        if (window.setHeaderBack) window.setHeaderBack(() => switchTab('flights'), 'a Vuelos');
    } else if (tab === 'aircraft-detail') {
        if (window.setHeaderBack) window.setHeaderBack(() => switchTab('market'), 'al Catálogo');
    } else if (tab === 'airline') {
        if (window.setHeaderBack) window.setHeaderBack(null);
    } else if (tab === 'employees') {
        if (window.setHeaderBack) window.setHeaderBack(() => switchTab('airline'), 'a Aerolínea');
    } else if (tab === 'stats') {
        if (window.setHeaderBack) window.setHeaderBack(() => switchTab('menu'), 'al Menú');
    } else if (tab === 'store') {
        if (window.setHeaderBack) window.setHeaderBack(() => switchTab('menu'), 'al Menú');
    } else if (tab === 'maintenance') {
        if (window.setHeaderBack) window.setHeaderBack(() => switchTab('menu'), 'al Menú');
    } else if (tab === 'maintenance-detail') {
        if (window.setHeaderBack) window.setHeaderBack(() => switchTab('maintenance'), 'a Mantenimiento');
    }
    
    saveGame();
};

// --- MARKET & COLOR LOGIC ---
window.updatePlaneColor = (id, color) => {
    const svgContainer = document.getElementById(`svg-container-${id}`);
    if(svgContainer) {
        svgContainer.style.setProperty('--plane-color', color);
    }
    
    const modelViewer = document.getElementById(`model-${id}`);
    if(modelViewer) {
        const setColor = () => {
            if (modelViewer.model && modelViewer.model.materials) {
                // Cambiamos el color de todos los materiales para asegurar que se pinte
                modelViewer.model.materials.forEach(mat => {
                    if(mat.name.toLowerCase().includes('glass') || mat.name.toLowerCase().includes('window')) return;
                    
                    // Remover la textura (librea) solo si no es el Cessna (que pierde las ventanas)
                    if (id !== 'c208') {
                        try {
                            if (mat.pbrMetallicRoughness.baseColorTexture) {
                                mat.pbrMetallicRoughness.baseColorTexture.setTexture(null);
                            }
                        } catch(e) { console.warn("Error quitando textura", e); }
                    }

                    mat.pbrMetallicRoughness.setBaseColorFactor(color);
                    
                    // Agregar brillo y reflejos metálicos para que la pintura no se vea plana
                    mat.pbrMetallicRoughness.setMetallicFactor(0.3);
                    mat.pbrMetallicRoughness.setRoughnessFactor(0.2);
                });
            }
        };
        if (modelViewer.model) setColor();
        else modelViewer.addEventListener('load', setColor, { once: true });
    }
};

const toggle3DControl = (modelId, btn) => {
    const mv = document.getElementById(`model-${modelId}`);
    if (!mv) return;
    
    if (mv.hasAttribute('camera-controls')) {
        mv.removeAttribute('camera-controls');
        mv.style.pointerEvents = 'none';
        btn.classList.remove('active');
        btn.innerHTML = '<i class="ph ph-cube"></i> Activar 3D';
    } else {
        mv.setAttribute('camera-controls', '');
        mv.style.pointerEvents = 'auto';
        btn.classList.add('active');
        btn.innerHTML = '<i class="ph ph-hand-grabbing"></i> Desactivar 3D';
    }
};

const MANUFACTURERS = [
    { id: 'Airbus', name: 'Airbus', description: 'Consorcio europeo, líder en aviación comercial moderna.', logoClass: 'ph-airplane' },
    { id: 'Boeing', name: 'Boeing', description: 'Gigante aeroespacial estadounidense, pionero en la industria.', logoClass: 'ph-airplane-tilt' },
    { id: 'Embraer', name: 'Embraer', description: 'Fabricante brasileño especializado en jets regionales.', logoClass: 'ph-paper-plane' },
    { id: 'Cessna', name: 'Cessna', description: 'Aviones ligeros y regionales de alta confiabilidad.', logoClass: 'ph-paper-plane-tilt' },
    { id: 'Lockheed Martin', name: 'Lockheed Martin', description: 'Corporación enfocada en defensa y tecnología aeroespacial.', logoClass: 'ph-crosshair' },
    { id: 'Northrop Grumman', name: 'Northrop Grumman', description: 'Empresa de tecnología militar y aeroespacial de vanguardia.', logoClass: 'ph-target' },
    { id: 'Rockwell', name: 'Rockwell', description: 'Fabricante histórico de bombarderos estratégicos.', logoClass: 'ph-rocket' },
    { id: 'Curtiss', name: 'Curtiss', description: 'Pioneros en la aviación militar temprana.', logoClass: 'ph-fan' }
];

const renderMarket = () => {
    const gridMfr = document.getElementById('market-grid-manufacturers');
    if (!gridMfr) return;
    
    gridMfr.innerHTML = '';
    
    // Tarjeta de Mercado de Usados
    if (!gameState.usedMarket) generateUsedMarket();
    const usedCard = document.createElement('div');
    usedCard.className = 'manufacturer-card';
    usedCard.onclick = () => showUsedMarket();
    usedCard.innerHTML = `
        <div class="mfr-logo"><i class="ph ph-shopping-bag"></i></div>
        <div class="mfr-info">
            <h3>Mercado de Usados</h3>
            <p>Aeronaves pre-configuradas a precios reducidos. Rotación periódica.</p>
            <span class="mfr-count">${gameState.usedMarket ? gameState.usedMarket.length : 0} opciones disponibles</span>
        </div>
    `;
    gridMfr.appendChild(usedCard);

    MANUFACTURERS.forEach(mfr => {
        // Count how many models this manufacturer has
        let modelCount = 0;
        AIRCRAFT_MODELS.forEach(m => {
            if (m.name.includes(mfr.name) || (mfr.name === 'Northrop Grumman' && m.name.includes('RQ-4'))) {
                modelCount++;
            }
        });

        // Solo mostrar si tiene modelos
        if (modelCount === 0) return;

        const card = document.createElement('div');
        card.className = 'manufacturer-card';
        card.onclick = () => showManufacturerModels(mfr.name);
        
        card.innerHTML = `
            <div class="mfr-logo"><i class="ph ${mfr.logoClass}"></i></div>
            <div class="mfr-info">
                <h3>${mfr.name}</h3>
                <p>${mfr.description}</p>
                <span class="mfr-count">${modelCount} modelos disponibles</span>
            </div>
        `;
        
        gridMfr.appendChild(card);
    });

    showManufacturers(); // Asegura que estemos en la vista correcta
};

const generateUsedMarket = () => {
    gameState.usedMarket = [];
    gameState.lastUsedMarketRefreshDay = gameState.time.day;
    
    // Generar entre 8 y 15 aviones usados
    const numPlanes = Math.floor(Math.random() * 8) + 8;
    
    for(let i=0; i<numPlanes; i++) {
        // Elegir un modelo comercial al azar
        const commercialModels = AIRCRAFT_MODELS.filter(m => m.category === 'commercial');
        const baseModel = commercialModels[Math.floor(Math.random() * commercialModels.length)];
        
        // Edad entre 5 y 30 años
        const age = Math.floor(Math.random() * 26) + 5;
        
        // Descuento: 2% por año, máximo 60%
        const discountPercent = Math.min(60, age * 2);
        const usedPrice = Math.floor(baseModel.price * (1 - discountPercent/100));
        
        // Generar configuración aleatoria
        let seatsFirst = 0, seatsBusiness = 0, seatsEco = baseModel.maxSeats;
        
        if (baseModel.maxSeats > 50) {
            if (Math.random() > 0.3) {
                seatsBusiness = Math.floor(Math.random() * (baseModel.maxSeats * 0.2));
                seatsEco -= seatsBusiness;
            }
            if (Math.random() > 0.6) {
                seatsFirst = Math.floor(Math.random() * (baseModel.maxSeats * 0.1));
                seatsEco -= seatsFirst;
            }
        }
        
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#64748b', '#0f172a', '#ffffff'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        gameState.usedMarket.push({
            usedId: 'used_' + Math.random().toString(36).substr(2, 9),
            baseModelId: baseModel.id,
            age: age,
            price: usedPrice,
            seatsFirst: seatsFirst,
            seatsBusiness: seatsBusiness,
            seatsEco: seatsEco,
            color: randomColor
        });
    }
};

const showUsedMarket = () => {
    document.getElementById('market-manufacturers-view').style.display = 'none';
    document.getElementById('market-models-view').style.display = 'block';
    document.getElementById('market-manufacturer-title').innerText = 'Mercado de Usados';
    
    const descEl = document.querySelector('#market-models-view .market-header p');
    if (descEl) descEl.innerText = 'Aviones con historial de vuelo. Configuración de asientos fija, entrega inmediata.';

    if (window.setHeaderBack) window.setHeaderBack(() => showManufacturers(), 'a Fabricantes');

    const gridCom = document.getElementById('market-grid-commercial');
    const gridMil = document.getElementById('market-grid-military');
    gridCom.innerHTML = '';
    gridMil.innerHTML = ''; 
    document.getElementById('market-models-military-section').style.display = 'none';
    document.getElementById('market-models-commercial-section').style.display = 'block';
    
    if (!gameState.usedMarket) generateUsedMarket();

    gameState.usedMarket.forEach(used => {
        const model = AIRCRAFT_MODELS.find(m => m.id === used.baseModelId);
        if (!model) return;

        const card = document.createElement('div');
        card.className = 'compact-aircraft-card';
        card.onclick = () => window.openUsedAircraftDetail(used.usedId);
        
        const visualHtml = model.modelUrl
            ? `<model-viewer id="model-${used.usedId}" src="${model.modelUrl}" loading="lazy" auto-rotate shadow-intensity="1" style="width:100%;height:100%;background-color:transparent; pointer-events: none;" exposure="1.2" environment-image="neutral" interaction-prompt="none"></model-viewer>`
            : `<div id="svg-container-${used.usedId}" class="svg-wrap" style="--plane-color: ${used.color}; width:100%; height:100%;">${model.svg}</div>`;

        const catIconClass = 'ph-briefcase';
        const profitHtml = model.dailyProfit 
            ? `<span class="compact-spec-item text-profit" title="Rentabilidad Diaria Proyectada"><i class="ph ph-trend-up"></i> +$${new Intl.NumberFormat('es-AR').format(model.dailyProfit)}/d</span>`
            : '';

        card.innerHTML = `
            <div class="compact-preview">
                <div class="blueprint-grid"></div>
                ${visualHtml}
            </div>
            <div class="compact-body">
                <div class="compact-meta-row">
                    <span class="compact-type-badge">${model.type} · ${used.age} años</span>
                    <i class="ph ${catIconClass} compact-category-icon" title="Usado Comercial"></i>
                </div>
                <h3 class="compact-name">${model.name}</h3>
                <div class="compact-specs">
                    <span class="compact-spec-item" title="Rango Operativo"><i class="ph ph-arrows-out-line-horizontal"></i> ${model.range} km</span>
                    <span class="compact-spec-item" title="Configuración de Asientos"><i class="ph ph-users"></i> ${used.seatsFirst+used.seatsBusiness+used.seatsEco} pax</span>
                    ${profitHtml}
                </div>
                <div class="compact-price-tag">
                    <i class="ph ph-tag"></i> ${formatMoney(used.price)}
                </div>
            </div>
        `;
        gridCom.appendChild(card);
    });
};

const showManufacturers = () => {
    document.getElementById('market-manufacturers-view').style.display = 'block';
    document.getElementById('market-models-view').style.display = 'none';
    if (window.setHeaderBack) window.setHeaderBack(null);
};

const showManufacturerModels = (manufacturerName) => {
    document.getElementById('market-manufacturers-view').style.display = 'none';
    document.getElementById('market-models-view').style.display = 'block';
    document.getElementById('market-manufacturer-title').innerText = `Modelos de ${manufacturerName}`;
    
    // Inyección dinámica de la descripción del fabricante
    const mfr = MANUFACTURERS.find(m => m.name === manufacturerName);
    const descEl = document.querySelector('#market-models-view .market-header p');
    if (descEl && mfr) {
        descEl.innerText = mfr.description;
    } else if (descEl) {
        descEl.innerText = 'Modelos técnicos precisos. Seleccioná el color de la aerolínea antes de la compra.';
    }

    if (window.setHeaderBack) window.setHeaderBack(() => showManufacturers(), 'a Fabricantes');

    const gridCom = document.getElementById('market-grid-commercial');
    const gridMil = document.getElementById('market-grid-military');
    gridCom.innerHTML = '';
    gridMil.innerHTML = '';
    
    // Sort AIRCRAFT_MODELS by price
    const sortedModels = [...AIRCRAFT_MODELS].sort((a, b) => a.price - b.price);
    
    let hasCom = false;
    let hasMil = false;

    sortedModels.forEach(model => {
        // Filtro por fabricante
        let isMatch = model.name.includes(manufacturerName);
        if (manufacturerName === 'Northrop Grumman' && model.name.includes('RQ-4')) isMatch = true;

        if (!isMatch) return;

        const card = document.createElement('div');
        card.className = 'compact-aircraft-card';
        card.onclick = () => openAircraftDetail(model.id);
        
        const visualHtml = model.modelUrl
            ? `<model-viewer id="model-${model.id}" src="${model.modelUrl}" loading="lazy" auto-rotate shadow-intensity="1" style="width:100%;height:100%;background-color:transparent; pointer-events: none;" exposure="1.2" environment-image="neutral" interaction-prompt="none"></model-viewer>`
            : `<div id="svg-container-${model.id}" class="svg-wrap" style="--plane-color: ${model.defaultColor}; width:100%; height:100%;">${model.svg}</div>`;

        const catIconClass = model.category === 'military' ? 'ph-shield-chevron' : 'ph-briefcase';
        const profitHtml = model.dailyProfit 
            ? `<span class="compact-spec-item text-profit" title="Rentabilidad Diaria Proyectada"><i class="ph ph-trend-up"></i> +$${new Intl.NumberFormat('es-AR').format(model.dailyProfit)}/d</span>`
            : '';

        card.innerHTML = `
            <div class="compact-preview">
                <div class="blueprint-grid"></div>
                ${visualHtml}
            </div>
            <div class="compact-body">
                <div class="compact-meta-row">
                    <span class="compact-type-badge">${model.type}</span>
                    <i class="ph ${catIconClass} compact-category-icon" title="${model.category === 'military' ? 'Militar' : 'Comercial'}"></i>
                </div>
                <h3 class="compact-name">${model.name}</h3>
                <div class="compact-specs">
                    <span class="compact-spec-item" title="Rango Operativo"><i class="ph ph-arrows-out-line-horizontal"></i> ${model.range} km</span>
                    <span class="compact-spec-item" title="Capacidad Máxima"><i class="ph ph-users"></i> ${model.capacity} pax</span>
                    ${profitHtml}
                </div>
                <div class="compact-price-tag">
                    <i class="ph ph-tag"></i> ${formatMoney(model.price)}
                </div>
            </div>
        `;
        
        if (model.category === 'military') {
            gridMil.appendChild(card);
            hasMil = true;
        } else {
            gridCom.appendChild(card);
            hasCom = true;
        }
        

    });

    document.getElementById('market-models-commercial-section').style.display = hasCom ? 'block' : 'none';
    const milSection = document.getElementById('market-models-military-section');
    if (hasMil) {
        const hasLicense = gameState.upgrades && gameState.upgrades.militaryAccess;
        milSection.style.display = 'block';
        let lockedBanner = milSection.querySelector('.military-locked-banner');
        if (!hasLicense) {
            if (!lockedBanner) {
                lockedBanner = document.createElement('div');
                lockedBanner.className = 'military-locked-banner';
                lockedBanner.innerHTML = `<i class="ph-fill ph-lock"></i> <span>Se requiere <strong>Licencia Militar</strong>. Adquirila en la <a href="#" onclick="switchTab('store'); return false;" style="color:#30d158; text-decoration:underline;">Tienda de Mejoras</a>.</span>`;
                milSection.insertBefore(lockedBanner, milSection.querySelector('.market-grid'));
            }
            document.getElementById('market-grid-military').style.opacity = '0.25';
            document.getElementById('market-grid-military').style.pointerEvents = 'none';
        } else {
            if (lockedBanner) lockedBanner.remove();
            document.getElementById('market-grid-military').style.opacity = '1';
            document.getElementById('market-grid-military').style.pointerEvents = 'auto';
        }
    } else {
        milSection.style.display = 'none';
    }
};

const buyAircraft = (modelId, customLiveryData = null, qty = 1) => {
    const model = AIRCRAFT_MODELS.find(m => m.id === modelId); if (!model) return;
    const totalCost = model.price * qty;
    if (gameState.money >= totalCost) {
        gameState.money -= totalCost;
        let regList = [];

        for (let i = 0; i < qty; i++) {
            const registration = generateRegistration();
            regList.push(registration);
            gameState.fleet.push({ 
                ...model, 
                id: Math.random().toString(36).substr(2, 9), 
                registration: registration,
                flightHours: 0,
                customLivery: customLiveryData,
                savedColor: model.defaultColor, // Fallback
                location: gameState.base ? gameState.base.id : 'EZE'
            });
        }
        
        if (qty === 1) {
            logMsg(`Compra procesada: ${model.name}. Matrícula: ${regList[0]}.`);
            showToast('Aeronave Integrada', `El ${model.name} está listo para operar.`, 'success');
        } else {
            logMsg(`Compra procesada: ${qty}x ${model.name}. Matrículas: ${regList.join(', ')}.`);
            showToast('Aeronaves Integradas', `${qty}x ${model.name} listos para operar.`, 'success');
        }
        
        updateUI(); if (gameState.currentTab === 'fleet') renderFleet();
        saveGame();
    } else {
        showToast('Fondos Insuficientes', 'Balance negativo para esta transacción.', 'error');
    }
};

// --- LIVERY EDITOR LOGIC ---
const liveryEditor = {
    activeModelId: null,
    canvas: null,
    ctx: null,
    isDrawing: false,
    modelViewer: null,
    paintOverlay: null,
    textureObj: null,
    currentMode: 'camera',
    _pendingApply: false,
    _lastU: null,
    _lastV: null,
    _materialColors: {},
    _debugLogged: false,
    // Maps THREE.js material UUID -> model-viewer material index
    _uuidToMatIdx: null,

    open: function(modelId) {
        this.activeModelId = modelId;
        const model = AIRCRAFT_MODELS.find(m => m.id === modelId);
        if (!model) return;

        const qtySelector = document.querySelector('.quantity-selector');
        if (qtySelector) qtySelector.style.display = 'flex';
        const qtyInput = document.getElementById('buy-qty-input');
        if (qtyInput) qtyInput.value = 1;
        window.activeDetailModelPrice = model.price;

        document.getElementById('livery-editor').classList.remove('hidden');
        this.setMode('camera');
        this._materialColors = {};
        this._debugLogged = false;
        this._uuidToMatIdx = null;

        const container = document.getElementById('livery-viewer-container');
        if (model.modelUrl) {
            container.innerHTML = `
                <div style="position:relative;width:100%;height:100%;">
                    <model-viewer id="livery-mv" src="${model.modelUrl}" loading="lazy" auto-rotate camera-controls shadow-intensity="1" exposure="1.2" environment-image="neutral" style="width:100%;height:100%;display:block;"></model-viewer>
                    <div id="livery-paint-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;display:none;cursor:crosshair;z-index:10;touch-action:none;user-select:none;"></div>
                </div>`;
            this.modelViewer = document.getElementById('livery-mv');
            this.paintOverlay = document.getElementById('livery-paint-overlay');
            this.modelViewer.addEventListener('load', () => this.setupCanvas());
        } else {
            container.innerHTML = `<div class="flex items-center justify-center h-full w-full"><p class="text-white text-center">Este modelo no admite edicion en 3D todavia.</p></div>`;
            this.modelViewer = null;
            this.paintOverlay = null;
        }
    },

    close: function() {
        this._removeEvents();
        document.getElementById('livery-editor').classList.add('hidden');
        this.activeModelId = null;
        this.modelViewer = null;
        this.paintOverlay = null;
        this.canvas = null;
        this.textureObj = null;
        this._lastU = null;
        this._lastV = null;
        this.isDrawing = false;
        this._materialColors = {};
        this._uuidToMatIdx = null;
    },

    setMode: function(mode) {
        this.currentMode = mode;
        document.getElementById('btn-mode-camera').className = mode === 'camera' ? 'livery-mode-btn active' : 'livery-mode-btn';
        document.getElementById('btn-mode-paint').className = mode === 'paint' ? 'livery-mode-btn active' : 'livery-mode-btn';

        if (this.modelViewer) {
            if (mode === 'paint') {
                this.modelViewer.removeAttribute('camera-controls');
                this.modelViewer.removeAttribute('auto-rotate');
                this.modelViewer.style.cursor = 'crosshair';
            } else {
                this.modelViewer.setAttribute('camera-controls', '');
                this.modelViewer.setAttribute('auto-rotate', '');
                this.modelViewer.style.cursor = 'grab';
            }
        }
        if (this.paintOverlay) {
            this.paintOverlay.style.display = mode === 'paint' ? 'block' : 'none';
        }
        this.isDrawing = false;
        this._lastU = null;
        this._lastV = null;
    },

    setupCanvas: function() {
        if (!this.modelViewer) return;

        this.canvas = document.createElement('canvas');
        this.canvas.width = 2048;
        this.canvas.height = 2048;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, 2048, 2048);
        const baseColorEl = document.getElementById('livery-base-color');
        if (baseColorEl) baseColorEl.value = '#ffffff';

        // Build UUID -> material index map for faster lookup
        this._buildMaterialMap();
        this.setupEvents();
    },

    // Build a mapping from THREE.js material UUID to model-viewer material index
    // This lets us identify exactly which material was hit via surface.node.material
    _buildMaterialMap: function() {
        this._uuidToMatIdx = {};
        if (!this.modelViewer || !this.modelViewer.model) return;
        const mvMats = this.modelViewer.model.materials;
        if (!mvMats) return;

        // Walk the scene graph to find all Three.js meshes and their materials
        // model-viewer exposes the scene via its internal structure
        // We probe the scene by looking at all symbols on the model-viewer element
        // to find the Three.js scene object
        try {
            const symbols = Object.getOwnPropertySymbols(this.modelViewer);
            for (const sym of symbols) {
                const val = this.modelViewer[sym];
                if (val && typeof val === 'object' && val.scene) {
                    const scene = val.scene;
                    scene.traverse(obj => {
                        if (obj.isMesh) {
                            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                            mats.forEach(m => {
                                if (!m) return;
                                // Try to match by name
                                const mvMat = mvMats.find(mm => mm.name === m.name);
                                if (mvMat) {
                                    this._uuidToMatIdx[m.uuid] = mvMats.indexOf(mvMat);
                                }
                            });
                        }
                    });
                    break;
                }
            }
        } catch(e) {
            // Scene access failed, fall back to name-based matching
        }

        console.log('[LiveryEditor] Material map built:', this._uuidToMatIdx);
        console.log('[LiveryEditor] Model-viewer materials:', mvMats.map((m,i) => `[${i}] "${m.name}"`));
    },

    // --- TEXTURE APPROACH ---
    applyTexture: async function() {
        if (!this.modelViewer || !this.canvas) return;
        const url = this.canvas.toDataURL('image/png');
        try {
            if (!this.textureObj) {
                this.textureObj = await this.modelViewer.createTexture(url);
            } else if (this.textureObj.source && this.textureObj.source.setURI) {
                await this.textureObj.source.setURI(url);
            } else {
                this.textureObj = await this.modelViewer.createTexture(url);
            }

            if (this.modelViewer.model && this.modelViewer.model.materials) {
                for (const mat of this.modelViewer.model.materials) {
                    const n = mat.name.toLowerCase();
                    if (n.includes('glass') || n.includes('window')) continue;
                    const pbr = mat.pbrMetallicRoughness;
                    // Keep the base color factor white so texture shows correctly
                    pbr.setBaseColorFactor([1, 1, 1, 1]);
                    if (pbr.baseColorTexture) {
                        pbr.baseColorTexture.setTexture(this.textureObj);
                    } else if (typeof pbr.setBaseColorTexture === 'function') {
                        await pbr.setBaseColorTexture(this.textureObj);
                    }
                }
            }
        } catch (e) {
            console.warn('applyTexture error:', e);
        }
    },

    _scheduleApply: function() {
        if (!this._pendingApply) {
            this._pendingApply = true;
            requestAnimationFrame(() => {
                this._pendingApply = false;
                this.applyTexture();
            });
        }
    },

    fillBaseColor: function() {
        if (!this.modelViewer) return;
        const color = document.getElementById('livery-base-color').value;
        const [r, g, b] = this._hexToLinear(color);

        if (this.modelViewer.model && this.modelViewer.model.materials) {
            this.modelViewer.model.materials.forEach(mat => {
                const n = mat.name.toLowerCase();
                if (n.includes('glass') || n.includes('window')) return;
                mat.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1]);
                this._materialColors[mat.name] = [r, g, b, 1];
            });
        }

        if (this.ctx) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.applyTexture();
        }
    },

    resetColors: function() {
        if (!this.modelViewer || !this.modelViewer.model) return;
        this._materialColors = {};
        this.modelViewer.model.materials.forEach(mat => {
            const n = mat.name.toLowerCase();
            if (n.includes('glass') || n.includes('window')) return;
            mat.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1]);
        });
        if (this.ctx) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.textureObj = null;
            this.applyTexture();
        }
        const statusEl = document.getElementById('livery-paint-status');
        if (statusEl) statusEl.style.display = 'none';
    },

    _hexToLinear: function(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const toLinear = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        return [toLinear(r), toLinear(g), toLinear(b)];
    },

    _getUV: function(surface) {
        if (!surface || !surface.uv) return null;
        const uv = surface.uv;
        const u = uv.u !== undefined ? uv.u : (uv.x !== undefined ? uv.x : (Array.isArray(uv) ? uv[0] : null));
        const v = uv.v !== undefined ? uv.v : (uv.y !== undefined ? uv.y : (Array.isArray(uv) ? uv[1] : null));
        if (u === null || v === null || isNaN(u) || isNaN(v)) return null;
        return { u, v };
    },

    _paintDot: function(u, v, size, color) {
        this.ctx.beginPath();
        this.ctx.arc(u, v, size / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    },

    _paintStroke: function(u1, v1, u2, v2, size, color) {
        this.ctx.beginPath();
        this.ctx.moveTo(u1, v1);
        this.ctx.lineTo(u2, v2);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = size;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
    },

    // Find the model-viewer material for a THREE.js material
    _findMvMat: function(threeMat) {
        if (!threeMat || !this.modelViewer || !this.modelViewer.model) return null;
        const mvMats = this.modelViewer.model.materials;
        if (!mvMats) return null;

        // Method 1: UUID map (built during setup)
        if (this._uuidToMatIdx && this._uuidToMatIdx[threeMat.uuid] !== undefined) {
            return mvMats[this._uuidToMatIdx[threeMat.uuid]];
        }

        // Method 2: Match by name
        if (threeMat.name) {
            const byName = mvMats.find(m => m.name === threeMat.name);
            if (byName) return byName;
        }

        return null;
    },

    // --- CORE PAINT ACTION ---
    _doPaint: function(clientX, clientY) {
        if (!this.modelViewer) return;
        const brushSize = parseInt(document.getElementById('livery-brush-size').value) || 20;
        const brushColor = document.getElementById('livery-brush-color').value;

        const surface = this.modelViewer.surfaceFromPoint(clientX, clientY);
        if (!surface) {
            this._lastU = null;
            this._lastV = null;
            return;
        }

        // One-time diagnostics
        if (!this._debugLogged) {
            this._debugLogged = true;
            const node = surface.node;
            const threeMat = node ? (Array.isArray(node.material) ? node.material[0] : node.material) : null;
            console.log('[LiveryEditor] surface keys:', Object.keys(surface));
            console.log('[LiveryEditor] node name:', node?.name);
            console.log('[LiveryEditor] THREE material name:', threeMat?.name);
            console.log('[LiveryEditor] THREE material uuid:', threeMat?.uuid);
            console.log('[LiveryEditor] surface.uv:', surface.uv);
            if (this.modelViewer.model?.materials) {
                console.log('[LiveryEditor] MV materials:', this.modelViewer.model.materials.map((m, i) => ({
                    idx: i, name: m.name, hasTexSlot: !!m.pbrMetallicRoughness.baseColorTexture
                })));
            }
        }

        const [r, g, b] = this._hexToLinear(brushColor);
        let paintedSection = false;

        // --- STRATEGY 1: Identify the specific material from surface.node ---
        if (surface.node && this.modelViewer.model) {
            const node = surface.node;
            const mats = Array.isArray(node.material) ? node.material : [node.material];

            for (const threeMat of mats) {
                if (!threeMat) continue;
                const mvMat = this._findMvMat(threeMat);

                if (mvMat) {
                    const n = mvMat.name.toLowerCase();
                    if (!n.includes('glass') && !n.includes('window')) {
                        mvMat.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1]);
                        this._materialColors[mvMat.name] = [r, g, b, 1];
                        const statusEl = document.getElementById('livery-paint-status');
                        const sectionEl = document.getElementById('livery-paint-section');
                        if (statusEl) statusEl.style.display = 'block';
                        if (sectionEl) sectionEl.textContent = mvMat.name || 'Seccion';
                        paintedSection = true;
                    }
                } else if (threeMat) {
                    // Model-viewer material not found, paint THREE.js material directly
                    // This handles models where names don't match
                    const n = (threeMat.name || '').toLowerCase();
                    if (!n.includes('glass') && !n.includes('window')) {
                        threeMat.color.setRGB(r, g, b);
                        threeMat.needsUpdate = true;
                        const statusEl = document.getElementById('livery-paint-status');
                        const sectionEl = document.getElementById('livery-paint-section');
                        if (statusEl) statusEl.style.display = 'block';
                        if (sectionEl) sectionEl.textContent = threeMat.name || node.name || 'Seccion';
                        paintedSection = true;
                    }
                }
            }
        }

        // --- STRATEGY 2: UV canvas painting ---
        if (this.canvas && this.ctx) {
            const uv = this._getUV(surface);
            if (uv) {
                const px = uv.u * this.canvas.width;
                const py = (1 - uv.v) * this.canvas.height;
                if (this._lastU !== null) {
                    this._paintStroke(this._lastU, this._lastV, px, py, brushSize, brushColor);
                } else {
                    this._paintDot(px, py, brushSize, brushColor);
                }
                this._lastU = px;
                this._lastV = py;
                this._scheduleApply();
                return;
            }
        }

        this._lastU = null;
        this._lastV = null;
    },

    // --- TEXT STAMP ---
    _doStampText: function(clientX, clientY) {
        const textInput = (document.getElementById('livery-text-input').value || '').trim();
        if (!textInput || !this.canvas || !this.ctx) return false;

        const surface = this.modelViewer.surfaceFromPoint(clientX, clientY);
        const uv = this._getUV(surface);
        if (!uv) return false;

        const px = uv.u * this.canvas.width;
        const py = (1 - uv.v) * this.canvas.height;
        const fontSize = parseInt(document.getElementById('livery-text-size').value) || 60;
        const textColor = document.getElementById('livery-text-color').value;
        this.ctx.font = `bold ${fontSize}px sans-serif`;
        this.ctx.fillStyle = textColor;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(textInput, px, py);
        document.getElementById('livery-text-input').value = '';
        this._scheduleApply();
        return true;
    },

    _removeEvents: function() {
        if (this._overlayHandlers && this.paintOverlay) {
            this.paintOverlay.removeEventListener('pointerdown', this._overlayHandlers.down);
            this.paintOverlay.removeEventListener('pointermove', this._overlayHandlers.move);
            this.paintOverlay.removeEventListener('pointerup', this._overlayHandlers.up);
        }
        if (this._overlayHandlers && this._overlayHandlers.windowUp) {
            window.removeEventListener('pointerup', this._overlayHandlers.windowUp);
        }
        this._overlayHandlers = null;
    },

    setupEvents: function() {
        if (!this.paintOverlay) return;
        this._removeEvents();

        const onDown = (e) => {
            e.preventDefault();
            if (this._doStampText(e.clientX, e.clientY)) return;
            this.isDrawing = true;
            this._lastU = null;
            this._lastV = null;
            this._doPaint(e.clientX, e.clientY);
        };

        const onMove = (e) => {
            e.preventDefault();
            if (!this.isDrawing) return;
            this._doPaint(e.clientX, e.clientY);
        };

        const onUp = () => {
            if (!this.isDrawing) return;
            this.isDrawing = false;
            this._lastU = null;
            this._lastV = null;
        };

        const onWindowUp = () => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this._lastU = null;
                this._lastV = null;
            }
        };

        this._overlayHandlers = { down: onDown, move: onMove, up: onUp, windowUp: onWindowUp };
        this.paintOverlay.addEventListener('pointerdown', onDown, { passive: false });
        this.paintOverlay.addEventListener('pointermove', onMove, { passive: false });
        this.paintOverlay.addEventListener('pointerup', onUp, { passive: false });
        window.addEventListener('pointerup', onWindowUp);
    },

    save: function() {
        if (!this.activeModelId) return;
        const liveryData = this.canvas ? this.canvas.toDataURL('image/png') : null;
        buyAircraft(this.activeModelId, liveryData);
        this.close();
        switchTab('market');
    }
};

// --- FUEL MARKET LOGIC ---
let fuelChartInstance = null;
let fuelChartTimeframe = '1M';

window.setFuelTimeframe = (tf) => {
    fuelChartTimeframe = tf;
    const btns = document.querySelectorAll('.fmp-time-btn');
    if (btns.length > 0) {
        btns.forEach(btn => {
            if (btn.innerText.trim() === tf) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    renderFuelChart();
};

const renderFuelMarket = () => {
    const view = document.getElementById('view-fuel');
    if (!view) return;
    
    const isTrendUp = gameState.fuelHistory && gameState.fuelHistory.length > 1 && gameState.fuelHistory[gameState.fuelHistory.length - 1] > gameState.fuelHistory[gameState.fuelHistory.length - 2];
    
    const trendIcon = isTrendUp 
        ? '<i class="ph ph-trend-up" style="color: #ef4444; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);"></i>' 
        : '<i class="ph ph-trend-down" style="color: #22c55e; text-shadow: 0 0 10px rgba(34, 197, 94, 0.5);"></i>';

    view.innerHTML = `
        <div class="fuel-market-premium">
            <div class="fmp-header">
                <div>
                    <h2 class="fmp-header-title"><i class="ph-fill ph-gas-pump" style="color: #38bdf8; margin-right: 8px;"></i> Mercado Global de Petróleo</h2>
                    <p class="fmp-header-sub">Cotización en tiempo real del Jet A1 y gestión estratégica de reservas.</p>
                </div>
            </div>
            
            <div class="fmp-grid">
                <!-- Panel Izquierdo: Gráfico Integrado -->
                <div class="fmp-chart-area">
                    <div class="fmp-stat-row" style="flex-wrap: wrap; gap: 12px;">
                        <div>
                            <span class="fmp-label">Precio Spot (Jet A1)</span>
                            <div class="fmp-value">
                                <span style="font-size: 1rem; color: #94a3b8;">$</span>${gameState.fuelPrice.toFixed(2)} ${trendIcon}
                            </div>
                        </div>
                        <div class="fmp-btn-group">
                            <button class="fmp-time-btn ${fuelChartTimeframe === '10D' ? 'active' : ''}" onclick="setFuelTimeframe('10D')">10D</button>
                            <button class="fmp-time-btn ${fuelChartTimeframe === '1M' ? 'active' : ''}" onclick="setFuelTimeframe('1M')">1M</button>
                            <button class="fmp-time-btn ${fuelChartTimeframe === '3M' ? 'active' : ''}" onclick="setFuelTimeframe('3M')">3M</button>
                            <button class="fmp-time-btn ${fuelChartTimeframe === '1Y' ? 'active' : ''}" onclick="setFuelTimeframe('1Y')">1Y</button>
                        </div>
                    </div>
                    <div class="fmp-chart-container">
                        <canvas id="fuel-chart"></canvas>
                    </div>
                </div>
                
                <!-- Panel Derecho: Trading -->
                <div class="fmp-glass-panel" style="display: flex; flex-direction: column;">
                    <div class="fmp-reserves-box" id="fmp-reserves-container">
                        <span class="fmp-label" style="color: #7dd3fc;">Tus Reservas (L)</span>
                        <div class="fmp-reserves-value" id="fmp-reserves-val">
                            <i class="ph-fill ph-drop" style="font-size: 1.4rem;"></i> ${new Intl.NumberFormat('es-AR').format(Math.round(gameState.fuelReserves))}
                        </div>
                    </div>
                    
                    <span class="fmp-label" style="margin-bottom: 12px;"><i class="ph-bold ph-lightning"></i> Compras Rápidas</span>
                    
                    <div class="fmp-buy-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
                        <button class="fmp-buy-row-btn" onclick="buyFuel(10000)">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div class="fmp-row-icon"><i class="ph-bold ph-shopping-cart"></i></div>
                                <span class="fmp-row-title">10.000 L</span>
                            </div>
                            <span class="fmp-row-price">~$${formatMoney(10000 * gameState.fuelPrice)}</span>
                        </button>
                        <button class="fmp-buy-row-btn" onclick="buyFuel(50000)">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div class="fmp-row-icon"><i class="ph-bold ph-shopping-cart"></i></div>
                                <span class="fmp-row-title">50.000 L</span>
                            </div>
                            <span class="fmp-row-price">~$${formatMoney(50000 * gameState.fuelPrice)}</span>
                        </button>
                        <button class="fmp-buy-row-btn" onclick="buyFuel(100000)">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div class="fmp-row-icon"><i class="ph-bold ph-shopping-cart"></i></div>
                                <span class="fmp-row-title">100.000 L</span>
                            </div>
                            <span class="fmp-row-price">~$${formatMoney(100000 * gameState.fuelPrice)}</span>
                        </button>
                        <button class="fmp-buy-row-btn" onclick="buyFuel(500000)">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div class="fmp-row-icon"><i class="ph-bold ph-shopping-cart"></i></div>
                                <span class="fmp-row-title">500.000 L</span>
                            </div>
                            <span class="fmp-row-price">~$${formatMoney(500000 * gameState.fuelPrice)}</span>
                        </button>
                    </div>
                    
                    <div style="margin-top: auto;">
                        <span class="fmp-label" style="margin-bottom: 8px;">Volumen Personalizado (L)</span>
                        <div class="fmp-input-group">
                            <input type="number" id="custom-fuel-amount" class="fmp-input" placeholder="Ej: 25000" min="1">
                            <button class="fmp-action-btn" onclick="buyFuel(document.getElementById('custom-fuel-amount').value)">
                                <i class="ph-bold ph-shopping-cart" style="font-size: 1.1rem;"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    renderFuelChart();
};

window.renderFuelChart = () => {
    const canvas = document.getElementById('fuel-chart');
    if (!canvas) return;
    
    if (fuelChartInstance) {
        fuelChartInstance.destroy();
    }
    
    let dataPoints = 30;
    if (fuelChartTimeframe === '10D') dataPoints = 10;
    if (fuelChartTimeframe === '1M') dataPoints = 30;
    if (fuelChartTimeframe === '3M') dataPoints = 90;
    if (fuelChartTimeframe === '1Y') dataPoints = 360;
    
    const historySlice = gameState.fuelHistory.slice(-dataPoints);
    
    const labels = historySlice.map((_, i) => {
        const daysAgo = historySlice.length - 1 - i;
        if (daysAgo === 0) return 'Hoy';
        return `-${daysAgo}d`;
    });
    
    const isUp = historySlice.length > 1 && historySlice[historySlice.length - 1] > historySlice[0];
    const lineColor = isUp ? '#d32f2f' : '#30d158'; 
    const gradientColorStart = isUp ? 'rgba(255, 69, 58, 0.5)' : 'rgba(48, 209, 88, 0.5)';
    const gradientColorEnd = isUp ? 'rgba(255, 69, 58, 0.0)' : 'rgba(48, 209, 88, 0.0)';

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, gradientColorStart);
    gradient.addColorStop(1, gradientColorEnd);

    fuelChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Precio USD',
                data: historySlice,
                borderColor: lineColor,
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#94a3b8',
                    bodyColor: '#fff',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) { return '$' + context.parsed.y.toFixed(2); }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false, drawBorder: false },
                    ticks: { maxTicksLimit: 6, color: '#64748b' }
                },
                y: {
                    display: true,
                    grid: { color: '#1e293b', drawBorder: false },
                    ticks: {
                        color: '#64748b',
                        callback: function(value) { return '$' + value.toFixed(2); }
                    }
                }
            }
        }
    });
};

window.buyFuel = (amountStr) => {
    const amount = parseInt(amountStr);
    if(isNaN(amount) || amount <= 0) return;
    
    const cost = amount * gameState.fuelPrice;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.fuelReserves += amount;
        logMsg(`Compra de ${new Intl.NumberFormat('es-AR').format(amount)} L de combustible a $${gameState.fuelPrice.toFixed(2)}/L.`);
        showToast('Combustible Adquirido', `+${new Intl.NumberFormat('es-AR').format(amount)} L en reserva.`, 'success');
        
        // Auto-retry fuel delayed flights
        const fuelDelayed = gameState.activeDispatches.filter(d => d.status === 'delayed' && d.reason === 'fuel');
        fuelDelayed.forEach(d => {
            logMsg(`Reintentando vuelo ${d.id} tras recarga de combustible.`);
            retryDelayedFlight(d.id);
        });
        
        updateUI();
        if(gameState.currentTab === 'fuel') {
            const reservesEl = document.getElementById('fmp-reserves-val');
            const reservesContainer = document.getElementById('fmp-reserves-container');
            if (reservesEl && reservesContainer) {
                reservesEl.innerHTML = `<i class="ph-fill ph-drop" style="font-size: 1.4rem;"></i> ${new Intl.NumberFormat('es-AR').format(Math.round(gameState.fuelReserves))}`;
                
                reservesContainer.classList.remove('pulse-buy');
                void reservesContainer.offsetWidth; // Trigger reflow
                reservesContainer.classList.add('pulse-buy');
            } else {
                renderFuelMarket();
            }
        }
        saveGame();
    } else {
        showToast('Fondos Insuficientes', `Necesitas $${formatMoney(cost)} para esta compra.`, 'error');
    }
};

// ==========================================
// BANK SYSTEM
// ==========================================

const LOAN_TYPES = [
    { id: 'micro', name: 'Micro Crédito', amount: 5000000, termDays: 30, dailyInterestRate: 0.001 }, // 3% monthly
    { id: 'expansion', name: 'Préstamo Expansión', amount: 20000000, termDays: 90, dailyInterestRate: 0.0008 }, // ~2.4% monthly
    { id: 'jumbo', name: 'Crédito Jumbo (Flota)', amount: 100000000, termDays: 180, dailyInterestRate: 0.0005 } // ~1.5% monthly
];

window.bankChartTimeframe = '1M';
let bankChartInstance = null;

window.openBankModal = () => {
    setHeaderBack(() => switchTab('dashboard'), 'Banco Central');
    switchTab('bank');
    renderBankScreen();
};

window.setBankTimeframe = (tf) => {
    window.bankChartTimeframe = tf;
    renderBankScreen();
};

window.renderBankScreen = () => {
    const balanceEl = document.getElementById('bank-current-balance');
    const debtEl = document.getElementById('bank-total-debt');
    const activeLoansEl = document.getElementById('bank-active-loans');
    const availableLoansEl = document.getElementById('bank-available-loans');
    
    if(!balanceEl) return;
    
    // Total Debt
    let totalDebt = 0;
    if(gameState.loans) {
        totalDebt = gameState.loans.reduce((sum, l) => sum + l.remainingAmount, 0);
    }
    
    balanceEl.innerText = `$${formatMoney(gameState.money)}`;
    debtEl.innerText = totalDebt > 0 ? `$${formatMoney(totalDebt)}` : '$0';
    
    // Active Loans List
    if (!gameState.loans || gameState.loans.length === 0) {
        activeLoansEl.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:20px;">No tienes préstamos activos.</div>';
    } else {
        activeLoansEl.innerHTML = gameState.loans.map((l, index) => {
            const progress = ((l.amount - l.remainingAmount) / l.amount) * 100;
            return `
                <div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; display:flex; flex-direction:column; gap:8px; border:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:600; color:#fff; font-size:0.9rem;">${l.name}</span>
                        <span class="mono" style="color:var(--danger); font-size:0.85rem;">-$${formatMoneyShort(l.dailyInstallment)}/día</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-secondary);">
                        <span>Resta: $${formatMoneyShort(l.remainingAmount)}</span>
                        <span>Quedan ${l.remainingTermDays}d</span>
                    </div>
                    <div class="progress-bar-container" style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden;">
                        <div class="progress-bar-fill" style="height:100%; width:${progress}%; background:var(--money); transition:width 0.3s;"></div>
                    </div>
                    <div style="text-align:right; margin-top:4px;">
                        <button class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="payLoanEarly(${index})">Pagar</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Available Loans List
    availableLoansEl.innerHTML = LOAN_TYPES.map(l => {
        const totalToPay = l.amount * (1 + (l.dailyInterestRate * l.termDays));
        const dailyPay = totalToPay / l.termDays;
        return `
            <div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; display:flex; flex-direction:column; gap:6px; border:1px solid rgba(255,255,255,0.02); transition:background 0.2s;" class="hover-bg-light">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:600; color:#fff; font-size:0.9rem;">${l.name}</span>
                    <span class="mono" style="color:var(--money); font-size:0.85rem;">+$${formatMoneyShort(l.amount)}</span>
                </div>
                <div style="font-size:0.75rem; color:var(--text-secondary);">
                    Plazo: ${l.termDays}d &nbsp;&bull;&nbsp; Tasa: ${(l.dailyInterestRate*30*100).toFixed(1)}%/m
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                    <span class="mono" style="font-size:0.8rem; color:var(--danger);">Cuota: $${formatMoneyShort(dailyPay)}/día</span>
                    <button class="btn btn-primary" style="padding:4px 8px; font-size:0.75rem; background:var(--money); color:#000;" onclick="requestLoan('${l.id}')">Pedir</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Update chart toggles
    ['10D', '1M', '3M', '1Y'].forEach(tf => {
        const btn = document.getElementById(`bank-time-${tf}`);
        if(btn) {
            if(window.bankChartTimeframe === tf) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
    
    renderBankChart();
};

window.requestLoan = (typeId) => {
    const type = LOAN_TYPES.find(t => t.id === typeId);
    if(!type) return;
    
    const activeOfSameType = gameState.loans.filter(l => l.id === typeId).length;
    if(activeOfSameType >= 2) {
        showToast('Límite Alcanzado', `Ya tienes demasiados préstamos de tipo ${type.name}.`, 'warning');
        return;
    }
    
    const totalToPay = type.amount * (1 + (type.dailyInterestRate * type.termDays));
    const dailyPay = totalToPay / type.termDays;
    
    gameState.loans.push({
        id: type.id,
        name: type.name,
        amount: type.amount,
        remainingAmount: totalToPay,
        dailyInstallment: dailyPay,
        termDays: type.termDays,
        remainingTermDays: type.termDays
    });
    
    gameState.money += type.amount;
    
    logMsg(`[BANCO] Préstamo "${type.name}" aprobado por $${formatMoney(type.amount)}. Cuota diaria: $${formatMoney(dailyPay)}.`);
    showToast('Préstamo Aprobado', `+$${formatMoneyShort(type.amount)} añadidos a tu cuenta.`, 'success');
    
    updateUI();
    renderBankScreen();
    saveGame();
};

window.payLoanEarly = (index) => {
    const loan = gameState.loans[index];
    if(!loan) return;
    
    if(gameState.money >= loan.remainingAmount) {
        gameState.money -= loan.remainingAmount;
        logMsg(`[BANCO] Cancelación anticipada del préstamo "${loan.name}" por $${formatMoney(loan.remainingAmount)}.`);
        showToast('Préstamo Cancelado', `Has saldado tu deuda anticipadamente.`, 'success');
        gameState.loans.splice(index, 1);
        
        updateUI();
        renderBankScreen();
        saveGame();
    } else {
        showToast('Fondos Insuficientes', `Necesitas $${formatMoney(loan.remainingAmount)} para cancelar este préstamo.`, 'error');
    }
};

window.renderBankChart = () => {
    const canvas = document.getElementById('bank-chart');
    if (!canvas) return;
    
    if (bankChartInstance) {
        bankChartInstance.destroy();
    }
    
    let dataPoints = 30;
    if (window.bankChartTimeframe === '10D') dataPoints = 10;
    if (window.bankChartTimeframe === '1M') dataPoints = 30;
    if (window.bankChartTimeframe === '3M') dataPoints = 90;
    if (window.bankChartTimeframe === '1Y') dataPoints = 360;
    
    if(!gameState.moneyHistory || gameState.moneyHistory.length === 0) fillMoneyHistory();
    const historySlice = gameState.moneyHistory.slice(-dataPoints);
    
    const labels = historySlice.map((_, i) => {
        const daysAgo = historySlice.length - 1 - i;
        if (daysAgo === 0) return 'Hoy';
        return `-${daysAgo}d`;
    });
    
    const isUp = historySlice.length > 1 && historySlice[historySlice.length - 1] > historySlice[0];
    const lineColor = isUp ? '#30d158' : '#d32f2f'; // Green if up, Red if down
    const gradientColorStart = isUp ? 'rgba(48, 209, 88, 0.5)' : 'rgba(255, 69, 58, 0.5)';
    const gradientColorEnd = isUp ? 'rgba(48, 209, 88, 0.0)' : 'rgba(255, 69, 58, 0.0)';

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, gradientColorStart);
    gradient.addColorStop(1, gradientColorEnd);

    bankChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Capital USD',
                data: historySlice,
                borderColor: lineColor,
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(20,20,25,0.9)',
                    titleColor: 'rgba(255,255,255,0.6)',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return ' $' + formatMoney(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: 'rgba(255,255,255,0.4)', maxTicksLimit: 6 }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                    ticks: {
                        color: 'rgba(255,255,255,0.4)',
                        callback: function(value) {
                            return '$' + formatMoneyShort(value);
                        }
                    }
                }
            }
        }
    });
};

const fillMoneyHistory = () => {
    if (gameState.moneyHistory.length < 360) {
        const missing = 360 - gameState.moneyHistory.length;
        let newHistory = [];
        let p = gameState.money;
        // Simulamos hacia atrás un crecimiento moderado
        for(let i = 0; i < missing; i++) {
            p = p * (1 - (Math.random() * 0.005 - 0.001)); // Leve tendencia al alza a lo largo del tiempo
            newHistory.unshift(Math.max(1000000, p));
        }
        gameState.moneyHistory = newHistory.concat(gameState.moneyHistory);
    }
};

const processDailyBank = () => {
    // Registrar historia de dinero
    gameState.moneyHistory.push(gameState.money);
    if(gameState.moneyHistory.length > 360) gameState.moneyHistory.shift();
    
    // Procesar préstamos
    if(gameState.loans && gameState.loans.length > 0) {
        for(let i = gameState.loans.length - 1; i >= 0; i--) {
            let loan = gameState.loans[i];
            
            // Pagar cuota diaria
            gameState.money -= loan.dailyInstallment;
            loan.remainingAmount -= loan.dailyInstallment;
            loan.remainingTermDays--;
            
            if(!isCatchingUp && gameState.money < 0 && (gameState.money + loan.dailyInstallment) >= 0) {
                logMsg(`[BANCO] Cuenta en descubierto por pago de préstamo de $${formatMoneyShort(loan.dailyInstallment)}.`);
                showToast('Banco Central', 'Cuenta en descubierto por cobro de préstamo.', 'warning');
            }
            
            if(loan.remainingTermDays <= 0 || loan.remainingAmount <= 0) {
                if(!isCatchingUp) {
                    logMsg(`[BANCO] Préstamo de $${formatMoneyShort(loan.amount)} ha sido saldado.`);
                    showToast('Préstamo Saldado', 'Has terminado de pagar un préstamo.', 'success');
                }
                gameState.loans.splice(i, 1);
            }
        }
    }
    
    if(gameState.currentTab === 'bank' && !isCatchingUp) renderBankScreen();
};

const fillFuelHistory = () => {
    if (gameState.fuelHistory.length < 360) {
        const missing = 360 - gameState.fuelHistory.length;
        let newHistory = [];
        let p = 0.80;
        for(let i = 0; i < missing; i++) {
            const basePrice = 0.80;
            const noise = (Math.random() - 0.5) * 0.15; // Mayor ruido diario
            const meanReversion = (basePrice - p) * 0.1;
            let shock = Math.random() < 0.05 ? (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.4) : 0;
            p += noise + meanReversion + shock;
            if(p < 0.3) p = 0.3 + Math.random() * 0.2;
            if(p > 3.0) p = 3.0 - Math.random() * 0.3;
            newHistory.push(p);
        }
        gameState.fuelHistory = newHistory.concat(gameState.fuelHistory);
        gameState.fuelPrice = gameState.fuelHistory[gameState.fuelHistory.length - 1];
    }
};

const updateFuelMarket = () => {
    const basePrice = 0.80;
    const noise = (Math.random() - 0.5) * 0.15; // Ruido diario (más amplio que el horario)
    const meanReversion = (basePrice - gameState.fuelPrice) * 0.1;
    
    let shock = 0;
    // 5% chance por día de shock
    if(Math.random() < 0.05) {
        shock = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.4);
        if(!isCatchingUp) {
            logMsg(`[NOTICIA] Fuerte fluctuación en el precio del combustible detectada.`);
            showToast('Mercado de Combustible', 'Fluctuación abrupta de precios.', 'info');
        }
    }
    
    gameState.fuelPrice += noise + meanReversion + shock;
    if(gameState.fuelPrice < 0.3) gameState.fuelPrice = 0.3 + Math.random() * 0.2;
    if(gameState.fuelPrice > 3.0) gameState.fuelPrice = 3.0 - Math.random() * 0.3;
    
    gameState.fuelHistory.push(gameState.fuelPrice);
    if(gameState.fuelHistory.length > 360) gameState.fuelHistory.shift();
    
    if(gameState.currentTab === 'fuel' && !isCatchingUp) renderFuelMarket();
};

const renderFleet = () => {
    const list = document.getElementById('fleet-list'); const emptyMsg = document.getElementById('empty-fleet-msg');
    if (!list) return;
    list.innerHTML = '';
    if (gameState.fleet.length === 0) { emptyMsg.style.display = 'block'; return; }
    emptyMsg.style.display = 'none';
    
    gameState.fleet.forEach(plane => {
        const card = document.createElement('div');
        card.className = 'fleet-card';
        
        const visualHtml = plane.modelUrl
            ? `<model-viewer id="fleet-model-${plane.id}" src="${plane.modelUrl}" loading="lazy" auto-rotate shadow-intensity="1" style="width:100%;height:100%;background-color:transparent;" exposure="1.2" environment-image="neutral" interaction-prompt="none"></model-viewer>`
            : `<div style="width:100%;height:100%;--plane-color: ${plane.savedColor};">${plane.svg}</div>`;

        // Determine status styling
        let statusText = 'Disponible';
        let statusClass = 'status-idle';
        if (plane.status === 'turnaround') {
            statusText = 'En Escala';
            statusClass = 'status-turnaround';
        } else if (plane.status === 'active' || plane.status === 'flight') {
            statusText = 'En Operación';
            statusClass = 'status-active';
        }

        // Color actual block
        const colorBlock = plane.customLivery 
            ? `<div class="fleet-color-indicator custom" title="Pintura Personalizada"><i class="ph-fill ph-palette"></i> Personalizado</div>`
            : `<div class="fleet-color-indicator"><span class="fleet-plane-color-dot" style="background-color: ${plane.savedColor}"></span><span class="fleet-plane-color-label">Color de fábrica</span></div>`;

        card.innerHTML = `
            <div class="fleet-card-header">
                <div class="fleet-card-preview blueprint-grid">
                    ${visualHtml}
                </div>
                <div class="fleet-card-info">
                    <div class="fleet-plane-reg-row">
                        <span class="fleet-plane-reg">${plane.registration}</span>
                        <span class="status-badge ${statusClass}"><span class="status-dot"></span>${statusText}</span>
                    </div>
                    <div class="fleet-plane-name">${plane.name}</div>
                    <div class="fleet-meta-row">
                        <span class="fleet-location-badge"><i class="ph-fill ph-map-pin"></i> ${plane.location || 'EZE'}</span>
                        ${colorBlock}
                    </div>
                </div>
            </div>
            
            <div class="fleet-card-stats-grid">
                <div class="fleet-card-stat">
                    <span class="fleet-stat-label">Capacidad</span>
                    <span class="fleet-stat-value"><i class="ph ph-users"></i> ${plane.capacity} pax</span>
                </div>
                <div class="fleet-card-stat">
                    <span class="fleet-stat-label">Alcance</span>
                    <span class="fleet-stat-value"><i class="ph ph-arrows-out-line-horizontal"></i> ${plane.range} km</span>
                </div>
                <div class="fleet-card-stat">
                    <span class="fleet-stat-label">Rentabilidad / Día</span>
                    <span class="fleet-stat-value"><i class="ph ph-currency-dollar profit-icon"></i> +${formatMoney(plane.dailyProfit)}</span>
                </div>
            </div>
            
            ${(plane.status === 'idle' && plane.location && gameState.base && plane.location !== gameState.base.id) ? `
            <div class="fleet-card-actions">
                <button class="btn btn-ferry" onclick="requestFerryFlight('${plane.id}')"><i class="ph ph-airplane-takeoff"></i> Vuelo Ferry</button>
            </div>
            ` : ''}
        `;
        list.appendChild(card);

        // Set color for 3D model in fleet
        if (plane.modelUrl) {
            setTimeout(() => {
                const mv = document.getElementById(`fleet-model-${plane.id}`);
                if (mv) {
                    const setCol = async () => {
                        if (mv.model && mv.model.materials) {
                            let customTexture = null;
                            if (plane.customLivery) {
                                customTexture = await mv.createTexture(plane.customLivery);
                            }
                            
                            mv.model.materials.forEach(mat => {
                                if(mat.name.toLowerCase().includes('glass') || mat.name.toLowerCase().includes('window')) return;
                                
                                if (plane.customLivery && customTexture) {
                                    mat.pbrMetallicRoughness.setBaseColorFactor([1,1,1,1]);
                                    if (mat.pbrMetallicRoughness.baseColorTexture) {
                                        mat.pbrMetallicRoughness.baseColorTexture.setTexture(customTexture);
                                    }
                                }
                                
                                mat.pbrMetallicRoughness.setMetallicFactor(0.3);
                                mat.pbrMetallicRoughness.setRoughnessFactor(0.2);
                            });
                        }
                    };
                    if (mv.model) setCol();
                    else mv.addEventListener('load', setCol, {once:true});
                }
            }, 100);
        }
    });
};

const simulatePassengers = (seatsEco, seatsBusiness, seatsFirst, model, destId, flightHour = 12, isSimulation = true, routeMultiplier = 1.0) => {
    const isMilitary = model.category === 'military' || model.category === 'cargo';
    if (isMilitary) return { eco: 0, business: 0, first: 0, total: 0 }; // No passengers

    const airlineRating = gameState.airlineRating || 3.0; // 1.0 a 5.0
    const marketingLevel = 1.0; // 0.0 a 1.0
    // Higher price -> lower demand. 
    let priceCompetitiveness = 1.0 - (routeMultiplier - 1.0);
    priceCompetitiveness = Math.max(0.1, Math.min(2.0, priceCompetitiveness));

    // 1. Demanda Base
    let baseDemand = (airlineRating / 5.0) * marketingLevel * priceCompetitiveness;
    
    // 2. Multiplicador de destino
    const premiumHubs = ['JFK', 'LHR', 'HND', 'DXB'];
    if (premiumHubs.includes(destId)) baseDemand *= 1.1;

    // 3. Modificador por hora (Pico vs Valle)
    if ((flightHour >= 7 && flightHour <= 10) || (flightHour >= 17 && flightHour <= 20)) {
        baseDemand *= 1.15;
    } else if (flightHour < 5 || flightHour > 23) {
        baseDemand *= 0.8; // Nocturnos
    }

    baseDemand = Math.min(1.2, Math.max(0.1, baseDemand));

    const getOccupancy = (base, min, max, volatility) => {
        const noise = isSimulation ? (Math.random() * 2 - 1) * volatility : 0;
        let occ = base + noise;
        return Math.min(max, Math.max(min, occ));
    };

    const occEco = getOccupancy(baseDemand * 0.95, 0.4, 1.0, 0.15);
    const occBus = getOccupancy(baseDemand * 0.85, 0.2, 1.0, 0.25);
    const occFir = getOccupancy(baseDemand * 0.70, 0.0, 1.0, 0.40);

    return {
        eco: Math.floor(seatsEco * occEco),
        business: Math.floor(seatsBusiness * occBus),
        first: Math.floor(seatsFirst * occFir),
        total: Math.floor(seatsEco * occEco) + Math.floor(seatsBusiness * occBus) + Math.floor(seatsFirst * occFir)
    };
};

const calculateFlightProfit = (model, distance, destId, freq = null, plane = null, isSimulation = true, flightHour = 12, routeMultiplier = 1.0) => {
    // Sistema Avanzado de Ganancias por Clase y Pasajeros Reales
    
    // 1. Multiplicador de destino para precios
    const premiumHubs = ['JFK', 'LHR', 'HND', 'DXB'];
    const destMultiplier = premiumHubs.includes(destId) ? 1.5 : 1.0;
    
    if (model.type === 'passenger' || model.category === 'commercial') {
        // Asientos máximos
        let config = { first: 0, business: 20, eco: 80 }; // defaults
        let modelMaxSeats = model.maxSeats || model.capacity;
        if (plane && plane.seatConfig) {
            config = plane.seatConfig;
            modelMaxSeats = config.modelMaxSeats || modelMaxSeats;
        }

        const spaceFirst = (config.first / 100) * modelMaxSeats;
        const spaceBusiness = (config.business / 100) * modelMaxSeats;
        const spaceEco = (config.eco / 100) * modelMaxSeats;
        
        const maxSeatsFirst = Math.floor(spaceFirst / 3.5);
        const maxSeatsBusiness = Math.floor(spaceBusiness / 2);
        const maxSeatsEco = Math.floor(spaceEco / 1);

        // Pasajeros reales usando el simulador probabilístico
        const pax = simulatePassengers(maxSeatsEco, maxSeatsBusiness, maxSeatsFirst, model, destId, flightHour, isSimulation, routeMultiplier);

        // Precios base y yields (precio por km)
        const baseEco = 40; const yieldEco = 0.10 * destMultiplier;
        const baseBus = 150; const yieldBus = 0.28 * destMultiplier;
        const baseFir = 400; const yieldFir = 0.65 * destMultiplier;

        const ticketEco = (baseEco + (distance * yieldEco)) * routeMultiplier;
        const ticketBus = (baseBus + (distance * yieldBus)) * routeMultiplier;
        const ticketFir = (baseFir + (distance * yieldFir)) * routeMultiplier;

        // CASM (Cost per Available Seat Mile/Km)
        let casm = 0.15; 
        if (modelMaxSeats > 200) casm = 0.08;
        else if (modelMaxSeats > 100) casm = 0.10;
        else if (modelMaxSeats <= 20) casm = 0.25; 

        // Costos Fijos (Tripulación, Combustible, Mantenimiento)
        const baseSeatCost = 15 + (distance * casm);
        const fixedCostEco = baseSeatCost * 0.6; // 60% es fijo
        const totalFixedCost = (maxSeatsEco * fixedCostEco) + (maxSeatsBusiness * fixedCostEco * 1.5) + (maxSeatsFirst * fixedCostEco * 2.5);

        // Costos Variables por Pasajero Real (Catering, Handling)
        let varCostEco = baseSeatCost * 0.4; // 40% es variable
        let varCostBus = varCostEco * 1.5;
        let varCostFir = varCostEco * 2.5;

        // Catering costs per pax
        if (freq && freq.catering) {
            if (freq.catering === 'low_cost') {
                varCostEco += 5; varCostBus += 5; varCostFir += 5;
            } else if (freq.catering === 'standard') {
                varCostEco += 15; varCostBus += 20; varCostFir += 25;
            } else if (freq.catering === 'luxury') {
                varCostEco += 30; varCostBus += 50; varCostFir += 80;
            }
        }
        
        // Ancillary Revenue (Equipaje, extras)
        const ancillaryEco = ticketEco * 0.20;
        const ancillaryBus = ticketBus * 0.10;
        const ancillaryFir = ticketFir * 0.05;

        // Ingresos y Costos Variables Totales
        const revenueEco = pax.eco * (ticketEco + ancillaryEco);
        const revenueBus = pax.business * (ticketBus + ancillaryBus);
        const revenueFir = pax.first * (ticketFir + ancillaryFir);
        
        const totalVarCost = (pax.eco * varCostEco) + (pax.business * varCostBus) + (pax.first * varCostFir);

        let totalProfit = (revenueEco + revenueBus + revenueFir) - totalFixedCost - totalVarCost;
        
        // Bonus por características del avión
        if (model.type && (model.type.includes('Jet') || model.type.includes('Alcance') || model.type.includes('Medio'))) {
            totalProfit *= 1.1; 
        }
        
        return { profit: Math.round(totalProfit), passengers: pax.total };
    } else {
        // Contratos Militares o Cargo
        const missionBase = model.price * 0.0005; 
        const distanceBonus = distance * 50; 
        return { profit: Math.round(missionBase + distanceBonus), passengers: 0 };
    }
};

const getActiveProfit = () => {
    if (!gameState.routes) return 0;
    let total = 0;
    gameState.routes.forEach(r => {
        if (!r) return;
        (r.frequencies || []).forEach(f => {
            const model = AIRCRAFT_MODELS.find(m => m.name === f.modelId || m.id === f.modelId);
            if(model) {
                // Estimación prorrateada diaria de esta frecuencia
                const assignedPlaneId = f.assignedPlanes && f.assignedPlanes.length > 0 ? f.assignedPlanes[0] : null;
                const assignedPlane = assignedPlaneId ? gameState.fleet.find(p => p.id === assignedPlaneId) : null;
                const routeMultiplier = r.priceMultiplier || 1.0;
                const flightResult = calculateFlightProfit(model, r.distance, r.destinationId, f, assignedPlane, false, 12, routeMultiplier);
                total += (flightResult.profit * f.days.length) / 7; 
            }
        });
    });
    // Descontar costo de empleados diarios para que el Profit Diario sea neto
    total -= getDailyEmployeesCost();
    return Math.round(total);
};

const calculateFlightDelay = (originId, scheduledHour) => {
    const airport = AIRPORTS.find(a => a.id === originId);
    let delayMins = 0;
    const rand = Math.random();
    
    let congestionFactor = 1.0;
    if (airport) {
        if (airport.congestion === 'high') congestionFactor = 2.0;
        else if (airport.congestion === 'medium') congestionFactor = 1.3;
    }
    
    let peakFactor = 1.0;
    if ((scheduledHour >= 7 && scheduledHour < 10) || (scheduledHour >= 17 && scheduledHour < 20)) {
        peakFactor = 1.5;
    }
    
    // Check employee shortage penalty
    let staffPenaltyFactor = 1.0;
    if (gameState.employees) {
        const reqs = calculateMinimumEmployees();
        let unmetCount = 0;
        Object.keys(EMPLOYEES_CONFIG).forEach(key => {
            if (gameState.employees.staff[key].count < reqs[key]) unmetCount++;
        });
        if (unmetCount > 0) {
            staffPenaltyFactor = 1.0 + (unmetCount * 0.5); // Increase delay probabilities significantly per missing role
        }
    }

    const overallStress = congestionFactor * peakFactor * staffPenaltyFactor;
    const severeProb = 0.02 * overallStress;
    const modProb = 0.08 * overallStress;
    const minorProb = 0.20 * overallStress;
    const earlyProb = Math.max(0.05, 0.15 / overallStress);
    
    if (rand < severeProb) {
        delayMins = Math.floor(Math.random() * 76) + 45; // 45 a 120 mins
    } else if (rand < severeProb + modProb) {
        delayMins = Math.floor(Math.random() * 31) + 15; // 15 a 45 mins
    } else if (rand < severeProb + modProb + minorProb) {
        delayMins = Math.floor(Math.random() * 11) + 4;  // 4 a 14 mins
    } else if (rand > 1 - earlyProb) {
        delayMins = -Math.floor(Math.random() * 5) - 1;  // -1 a -5 mins
    } else {
        delayMins = Math.floor(Math.random() * 5) - 1;   // -1 a 3 mins
    }
    
    return delayMins;
};

const getTurnaroundMins = (model) => {
    if (!model) return 60;
    if (model.capacity <= 20) return 20;
    if (model.capacity < 100) return 45;
    if (model.capacity <= 200) return 60;
    if (model.capacity <= 400) return 120;
    return 150;
};

const getScheduleBufferMins = (durationMinutes) => {
    if (durationMinutes < 120) return 45; // Short haul
    if (durationMinutes < 240) return 60; // Medium haul
    if (durationMinutes < 480) return 90; // Long haul
    return 120; // Ultra long haul
};

const calculateFlightSatisfaction = (dispatch, plane) => {
    let score = 5.0; // Base score
    
    // 1. Relacion Calidad-Precio (35% peso)
    const route = gameState.routes.find(r => r.id === dispatch.routeId);
    let routeMultiplier = route ? (route.priceMultiplier || 1.0) : 1.0;
    let priceEffect = 0;
    if (routeMultiplier > 1.0) priceEffect = -((routeMultiplier - 1.0) * 1.5);
    else if (routeMultiplier < 1.0) priceEffect = (1.0 - routeMultiplier) * 0.5;
    score += priceEffect;

    // 2. Personal y Servicio (25% peso)
    let avgSat = 100;
    if (gameState.employees && gameState.employees.staff) {
        const staff = Object.values(gameState.employees.staff);
        if (staff.length > 0) {
            let totalSat = 0;
            staff.forEach(emp => { totalSat += (emp.satisfaction || 100); });
            avgSat = totalSat / staff.length;
        }
    }
    let staffEffect = 0;
    if (avgSat < 80) staffEffect = -((80 - avgSat) / 20);
    score += staffEffect;

    // 3. Puntualidad (25% peso)
    let delayEffect = 0;
    const delayMins = dispatch.totalDelayMins || 0;
    if (delayMins > 15) delayEffect = -((delayMins - 15) / 10) * 0.1; 
    score += delayEffect;

    // 4. Mantenimiento y Calidad del avion (15% peso)
    let planeEffect = 0;
    if (plane) {
        const hours = plane.flightHours || 0;
        if (hours < 100) planeEffect = 0.2;
        else if (hours > 5000) planeEffect = -0.5;
        else if (hours > 2000) planeEffect = -0.2;
    }
    score += planeEffect;

    // 5. Factor Aleatorio (+/- 0.3)
    score += (Math.random() * 0.6) - 0.3;

    return Math.max(1.0, Math.min(5.0, score));
};

const updateGlobalAirlineRating = () => {
    if (!gameState.dailyRatings) gameState.dailyRatings = [];
    const currentDay = gameState.time.day;
    
    // Eliminar valoraciones mas antiguas a 30 dias
    gameState.dailyRatings = gameState.dailyRatings.filter(bucket => currentDay - bucket.day < 30);
    
    let totalScoreSum = 0;
    let totalPaxSum = 0;
    
    gameState.dailyRatings.forEach(bucket => {
        totalScoreSum += bucket.totalScore;
        totalPaxSum += bucket.totalPax;
    });
    
    if (totalPaxSum > 0) {
        gameState.airlineRating = totalScoreSum / totalPaxSum;
    } else {
        if(gameState.airlineRating === undefined) gameState.airlineRating = 3.0;
        else gameState.airlineRating = (gameState.airlineRating * 0.99) + (3.0 * 0.01);
    }
    
    gameState.airlineRating = Math.round(gameState.airlineRating * 10) / 10;
    gameState.airlineRating = Math.max(1.0, Math.min(5.0, gameState.airlineRating));
};

const checkAndDispatchFlights = () => {
    const nowAbs = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
    
    // Auto-heal stuck planes & process Turnarounds
    gameState.fleet.forEach(p => {
        if (p.status === 'turnaround' || p.status === 'maintenance') {
            if (nowAbs >= p.readyAbs) {
                if (p.status === 'maintenance' && !isCatchingUp) {
                    showToast('Mantenimiento Terminado', `El avión ${p.registration} está listo para volar.`, 'success');
                    logMsg(`Mantenimiento completado para el avión ${p.registration} (${p.name}).`);
                }
                p.status = 'idle';
                
                // Check for delayed flights waiting for this plane and auto-retry
                const delayedForThisPlane = gameState.activeDispatches.find(d => {
                    if (d.status === 'delayed' && d.reason === 'plane') {
                        const r = gameState.routes.find(ro => ro.id === d.routeId);
                        if (r) {
                            const f = r.frequencies.find(fr => fr.id === d.freqId);
                            if (f && f.assignedPlanes.includes(p.id)) {
                                const originId = f.isReturn ? r.destinationId : (gameState.base ? gameState.base.id : 'EZE');
                                if (p.location === originId) {
                                    return true;
                                }
                            }
                        }
                    }
                    return false;
                });
                if (delayedForThisPlane) {
                    retryDelayedFlight(delayedForThisPlane.id, p.id);
                }
                if(!isCatchingUp && gameState.currentTab === 'fleet') renderFleet();
            }
        } else if (p.status === 'idle') {
            const hasDispatch = gameState.activeDispatches.some(d => d.planeId === p.id);
            if (!hasDispatch && p.location && p.location !== (gameState.base ? gameState.base.id : 'EZE')) {
                if (!p.lastIdleAbs) p.lastIdleAbs = nowAbs;
                if (nowAbs - p.lastIdleAbs > 24 * 60) {
                    console.warn(`[Auto-Heal] Plane ${p.registration} stranded at ${p.location} for >24h. Initiating auto-ferry.`);
                    requestFerryFlightSilent(p.id);
                }
            } else {
                p.lastIdleAbs = nowAbs; // reset if it has a dispatch or is at base
            }
        } else if (p.status !== 'idle') {
            const hasDispatch = gameState.activeDispatches.some(d => d.planeId === p.id);
            if (!hasDispatch) {
                p.status = 'idle';
                p.lastIdleAbs = nowAbs;
            }
        }
    });
    
    // 1. Iniciar Embarque (Boarding phase)
    gameState.routes.forEach(route => {
        if (!route) return;
        const dest = AIRPORTS.find(a => a.id === route.destinationId) || { id: '???', name: '?' };
        (route.frequencies || []).forEach(freq => {
            const model = AIRCRAFT_MODELS.find(m => m.name === freq.modelId || m.id === freq.modelId);
            let boardingMins = 30;
            if (model) {
                if (model.capacity > 200) boardingMins = 45;
                else if (model.capacity < 100) boardingMins = 20;
            }
            
            let checkHour = gameState.time.hour;
            let checkMinute = gameState.time.minute + boardingMins;
            let checkDay = gameState.time.day;
            
            if (checkMinute >= 60) {
                checkHour += Math.floor(checkMinute / 60);
                checkMinute %= 60;
            }
            if (checkHour >= 24) {
                checkHour %= 24;
                checkDay += 1;
            }
            
            const checkDayName = getDayName(checkDay);
            
            if (freq.days.includes(checkDayName) && freq.time === formatTime(checkHour, checkMinute)) {
                // Check if not already active for this specific scheduled time
                const schedAbs = checkDay * 24 * 60 + checkHour * 60 + checkMinute;
                const alreadyActive = gameState.activeDispatches.some(d => d.freqId === freq.id && d.schedAbs === schedAbs);
                const alreadyInHistory = gameState.flightHistory && gameState.flightHistory.some(h => h.freqId === freq.id && (h.originalSchedAbs === schedAbs || h.schedAbs === schedAbs));
                
                if (!alreadyActive && !alreadyInHistory) {
                    startBoarding(route, freq, model, dest, schedAbs);
                }
            }
        });
    });
    
    // 2. Procesar despachos activos
    gameState.activeDispatches = gameState.activeDispatches.filter(dispatch => {
        if (dispatch.status === 'canceled') {
            return nowAbs < (dispatch.cancelAbs || nowAbs) + 15;
        } else if (dispatch.status === 'boarding' || dispatch.status === 'delayed_weather') {
            if (nowAbs >= dispatch.actualDepartureAbs) {
                return processFlightDeparture(dispatch);
            }
            return true;
        } else if (dispatch.status === 'in_flight') {
            const arrAbs = dispatch.arrivalDay * 24 * 60 + dispatch.arrivalHour * 60 + dispatch.arrivalMinute;
            if (nowAbs >= arrAbs) {
                const plane = gameState.fleet.find(p => p.id === dispatch.planeId);

                if (!gameState.flightHistory) gameState.flightHistory = [];
                if (!dispatch.isFerry) {
                    const flightScore = calculateFlightSatisfaction(dispatch, plane);
                    const pax = dispatch.passengers || 0;
                    
                    if (!gameState.dailyRatings) gameState.dailyRatings = [];
                    const currentDay = gameState.time.day;
                    let bucket = gameState.dailyRatings.find(b => b.day === currentDay);
                    if (!bucket) {
                        bucket = { day: currentDay, totalScore: 0, totalPax: 0 };
                        gameState.dailyRatings.push(bucket);
                    }
                    bucket.totalScore += flightScore * pax;
                    bucket.totalPax += pax;
                    
                    updateGlobalAirlineRating();

                    gameState.flightHistory.unshift({
                        id: dispatch.id,
                        routeId: dispatch.routeId,
                        freqId: dispatch.freqId,
                        destName: dispatch.destName,
                        isReturn: dispatch.isReturn || false,
                        planeReg: plane ? plane.registration : 'Desconocido',
                        planeModel: plane ? plane.name : 'Desconocido',
                        profit: dispatch.profit || 0,
                        passengers: pax,
                        rating: flightScore,
                        departureDay: dispatch.departureDay,
                        departureHour: dispatch.departureHour,
                        departureMinute: dispatch.departureMinute,
                        arrivalDay: dispatch.arrivalDay,
                        arrivalHour: dispatch.arrivalHour,
                        arrivalMinute: dispatch.arrivalMinute,
                        totalDelayMins: dispatch.totalDelayMins || 0,
                        originalSchedAbs: dispatch.originalSchedAbs || dispatch.schedAbs,
                        timestamp: nowAbs,
                        flightNumberStr: dispatch.flightNumberStr || 'Completado',
                        delayReason: dispatch.reason || (dispatch.totalDelayMins >= 15 ? 'congestion' : 'none')
                    });
                    if (gameState.flightHistory.length > 50) gameState.flightHistory.pop();
                }

                const planeModel = AIRCRAFT_MODELS.find(m => m.name === dispatch.modelId || m.id === dispatch.modelId);
                const turnaround = dispatch.isFerry ? 20 : getTurnaroundMins(planeModel);

                if (dispatch.isFerry) {
                    if (plane) {
                        plane.status = 'turnaround';
                        plane.readyAbs = nowAbs + turnaround;
                        plane.location = dispatch.destinationId;
                    }
                    if (!isCatchingUp) {
                        logMsg(`Vuelo Ferry completado: ${plane ? plane.registration : 'Desconocido'} posicionado en ${dispatch.destName}. Iniciando revisión de rutina.`);
                        showToast('Ferry Completado', `Aeronave en ${dispatch.destName}`, 'info');
                    }
                } else if (!dispatch.isReturn) {
                    if (plane) {
                        plane.flightHours = (plane.flightHours || 0) + (dispatch.durationHours || 0);
                        plane.hoursSinceACheck = (plane.hoursSinceACheck || 0) + (dispatch.durationHours || 0);
                        plane.hoursSinceCCheck = (plane.hoursSinceCCheck || 0) + (dispatch.durationHours || 0);
                        plane.hoursSinceDCheck = (plane.hoursSinceDCheck || 0) + (dispatch.durationHours || 0);
                        
                        // Check if grounded due to D-Check
                        if (plane.hoursSinceDCheck >= 5000 && plane.status !== 'maintenance') {
                            plane.status = 'grounded';
                        }

                        plane.status = 'turnaround';
                        plane.readyAbs = nowAbs + turnaround;
                        const r = gameState.routes.find(ro => ro.id === dispatch.routeId);
                        plane.location = r ? r.destinationId : 'Desconocido';
                    }
                    if (!isCatchingUp) {
                        logMsg(`Aterrizaje completado: ${plane ? plane.registration : 'Desconocido'} en ${dispatch.destName}. En escala.`);
                        showToast('Vuelo Completado', `Aterrizaje exitoso en ${dispatch.destName}`, 'info');
                    }
                } else {
                    if (plane) {
                        plane.flightHours = (plane.flightHours || 0) + (dispatch.durationHours || 0);
                        plane.hoursSinceACheck = (plane.hoursSinceACheck || 0) + (dispatch.durationHours || 0);
                        plane.hoursSinceCCheck = (plane.hoursSinceCCheck || 0) + (dispatch.durationHours || 0);
                        plane.hoursSinceDCheck = (plane.hoursSinceDCheck || 0) + (dispatch.durationHours || 0);
                        
                        // Check if grounded due to D-Check
                        if (plane.hoursSinceDCheck >= 5000 && plane.status !== 'maintenance') {
                            plane.status = 'grounded';
                        }

                        plane.status = 'turnaround';
                        plane.readyAbs = nowAbs + turnaround;
                        plane.location = gameState.base ? gameState.base.id : 'EZE';
                    }
                    if (!isCatchingUp) {
                        const baseName = gameState.base ? gameState.base.name : 'Buenos Aires';
                        logMsg(`Aterrizaje completado: ${plane ? plane.registration : 'Desconocido'} en ${baseName}. En escala.`);
                        showToast('Regreso Completado', `Aterrizaje exitoso en ${baseName}`, 'info');
                    }
                }

                if(!isCatchingUp && gameState.currentTab === 'flights') renderFlights();
                dispatch.status = 'completed';
                return true; // Mantener en activeDispatches para visualización
            }
            return true;
        } else if (dispatch.status === 'completed') {
            const arrAbs = dispatch.arrivalDay * 24 * 60 + dispatch.arrivalHour * 60 + dispatch.arrivalMinute;
            if (nowAbs >= arrAbs + 24 * 60) {
                return false; // Eliminar después de 24 horas
            }
            return true;
        }
        return true;
    });
};

const startBoarding = (route, freq, model, dest, schedAbs, originalSchedAbs = null, originalReason = null, forcedPlaneId = null) => {
    const originId = freq.isReturn ? dest.id : (gameState.base ? gameState.base.id : 'EZE');
    
    let availablePlaneId = null;
    if (forcedPlaneId) {
        const p = gameState.fleet.find(fl => fl.id === forcedPlaneId);
        if (p && p.location === originId && (p.status === 'idle' || (p.status === 'turnaround' && p.readyAbs <= schedAbs))) {
            availablePlaneId = forcedPlaneId;
        } else {
            console.warn(`[Tycoon Anti-Teleport] Airplane ${p ? p.registration : forcedPlaneId} rejected for flight to ${dest.id}. Wrong location or busy.`);
        }
    }
    
    if (!availablePlaneId) {
        availablePlaneId = freq.assignedPlanes.find(pid => {
            const p = gameState.fleet.find(fl => fl.id === pid);
            if (!p || p.location !== originId) return false;
            if (p.status === 'idle') return true;
            if (p.status === 'turnaround' && p.readyAbs <= schedAbs) return true;
            return false;
        });
    }
    
    let fuelNeeded = 0;
    if (model) {
        const fuelFactor = model.capacity === 0 ? 0.5 : model.capacity * 0.025;
        fuelNeeded = Math.round(route.distance * fuelFactor);
        if(model.category === 'military') fuelNeeded = Math.round(route.distance * 5); 
    }
    
    if (availablePlaneId && gameState.fuelReserves >= fuelNeeded) {
        gameState.fuelReserves -= fuelNeeded;
        if (!gameState.stats) gameState.stats = { totalFuelConsumed: 0 };
        gameState.stats.totalFuelConsumed = (gameState.stats.totalFuelConsumed || 0) + fuelNeeded;
        const plane = gameState.fleet.find(p => p.id === availablePlaneId);
        plane.status = 'boarding';
        
        const scheduledHour = Math.floor((schedAbs % (24 * 60)) / 60);
        const delayMins = calculateFlightDelay(freq.isReturn ? gameState.base.id : dest.id, scheduledHour);
        const actualDepartureAbs = schedAbs + delayMins;
        
        gameState.activeDispatches.push({
            id: Math.random().toString(36).substr(2, 9),
            routeId: route.id,
            freqId: freq.id,
            destName: dest.name,
            planeId: availablePlaneId,
            modelId: freq.modelId,
            status: 'boarding',
            delayMins: delayMins,
            schedAbs: schedAbs,
            originalSchedAbs: originalSchedAbs !== null ? originalSchedAbs : schedAbs,
            actualDepartureAbs: actualDepartureAbs,
            fuelNeeded: fuelNeeded,
            reqTime: formatTime(scheduledHour, schedAbs % 60),
            isReturn: freq.isReturn || false,
            flightNumberStr: (freq.flightCode || 'AR') + ' ' + (freq.flightNumber || ''),
            reason: originalReason || (delayMins > 3 ? 'congestion' : undefined)
        });
        
        if (!isCatchingUp) {
            let timingMsg = 'En horario.';
            if (delayMins > 3) timingMsg = `(Demora est: +${delayMins}m)`;
            else if (delayMins < -1) timingMsg = `(Adelanto est: ${delayMins}m)`;
            else if (delayMins !== 0) timingMsg = `(Desvío: ${delayMins > 0 ? '+' : ''}${delayMins}m)`;
            
            const destToLog = freq.isReturn ? gameState.base.id : dest.id;
            logMsg(`Embarque: ${plane.registration} hacia ${destToLog}. ${timingMsg}`);
            if(gameState.currentTab === 'flights') renderFlights();
        }
    } else {
        let delayReason = 'plane';
        if (availablePlaneId && gameState.fuelReserves < fuelNeeded) {
            delayReason = 'fuel';
            if (!isCatchingUp) {
                const destToLog = freq.isReturn ? gameState.base.id : dest.id;
                logMsg(`[ALERTA] Vuelo a ${destToLog} retrasado por falta de combustible (Req: ${fuelNeeded} L).`);
                showToast('Falta Combustible', `El vuelo requiere repostaje.`, 'error');
            }
        } else if (!isCatchingUp) {
            const destToLog = freq.isReturn ? gameState.base.id : dest.id;
            const planeBusy = freq.assignedPlanes.some(pid => gameState.fleet.find(fl => fl.id === pid));
            
            if (planeBusy) {
                logMsg(`Vuelo a ${destToLog} demorado. Esperando llegada o preparación de la aeronave.`);
                showToast('Demora en Conexión', `Esperando aeronave para vuelo a ${destToLog}.`, 'warning');
            } else {
                logMsg(`[ALERTA] Vuelo a ${destToLog} retrasado. Ningún avión asignado en la flota.`);
                showToast('Demora Operativa', `El vuelo no tiene aeronave asignada.`, 'error');
            }
        }
        
        const scheduledHour = Math.floor((schedAbs % (24 * 60)) / 60);
        gameState.activeDispatches.push({
            id: Math.random().toString(36).substr(2, 9),
            routeId: route.id,
            freqId: freq.id,
            destName: dest.name,
            planeId: null,
            modelId: freq.modelId,
            status: 'delayed',
            reason: delayReason,
            schedAbs: schedAbs,
            originalSchedAbs: originalSchedAbs !== null ? originalSchedAbs : schedAbs,
            fuelNeeded: fuelNeeded,
            reqTime: formatTime(scheduledHour, schedAbs % 60),
            isReturn: freq.isReturn || false
        });
        if(!isCatchingUp && gameState.currentTab === 'flights') renderFlights();
    }
};

const processFlightDeparture = (dispatch) => {
    const r = gameState.routes.find(ro => ro.id === dispatch.routeId);
    if (!r) return false;

    // Verificar Clima Extremo
    const originId = dispatch.isReturn ? r.destinationId : gameState.base.id;
    const destIdWeather = dispatch.isReturn ? gameState.base.id : r.destinationId;
    const originWeather = getWeatherInfo(originId);
    const destWeather = getWeatherInfo(destIdWeather);
    
    if (originWeather.isExtreme || destWeather.isExtreme) {
        dispatch.actualDepartureAbs += 60; // Retrasar una hora
        dispatch.status = 'delayed_weather';
        dispatch.reason = 'weather';
        
        if (!isCatchingUp) {
            const destToLog = dispatch.isReturn ? gameState.base.name : dispatch.destName;
            logMsg(`[CLIMA] Vuelo a ${destToLog} demorado en tierra. Condiciones extremas.`);
            if(gameState.currentTab === 'flights') renderFlights();
        }
        return true; // Mantener en activeDispatches
    }

    const plane = gameState.fleet.find(p => p.id === dispatch.planeId);
    if(plane) plane.status = 'in_flight';
    
    dispatch.status = 'in_flight';
    const nowAbs = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
    dispatch.totalDelayMins = nowAbs - (dispatch.originalSchedAbs || dispatch.schedAbs);
    
    const _m3420 = typeof plane !== 'undefined' && plane ? AIRCRAFT_MODELS.find(m=>m.id===plane.modelId||m.name===plane.modelId) : null;
    const durationHours = r.distance / getAircraftSpeed(_m3420);
    const durationMinutes = Math.round(durationHours * 60);
    
    // Store duration on dispatch for maintenance tracking
    dispatch.durationHours = durationHours;
    
    const arrAbs = dispatch.actualDepartureAbs + durationMinutes;
    
    dispatch.departureDay = Math.floor(dispatch.actualDepartureAbs / (24 * 60));
    dispatch.departureHour = Math.floor((dispatch.actualDepartureAbs % (24 * 60)) / 60);
    dispatch.departureMinute = dispatch.actualDepartureAbs % 60;
    
    dispatch.arrivalDay = Math.floor(arrAbs / (24 * 60));
    dispatch.arrivalHour = Math.floor((arrAbs % (24 * 60)) / 60);
    dispatch.arrivalMinute = arrAbs % 60;
    
    const model = AIRCRAFT_MODELS.find(m => m.name === dispatch.modelId || m.id === dispatch.modelId);
    if(model) {
        const destId = dispatch.isReturn ? gameState.base.id : r.destinationId;
        const freq = r.frequencies ? r.frequencies.find(f => f.id === dispatch.frequencyId) : null;
        const assignedPlaneId = dispatch.planeId || (freq && freq.assignedPlanes && freq.assignedPlanes.length > 0 ? freq.assignedPlanes[0] : null);
        const assignedPlane = assignedPlaneId ? gameState.fleet.find(p => p.id === assignedPlaneId) : null;
        const routeMultiplier = r.priceMultiplier || 1.0;
        const flightResult = calculateFlightProfit(model, r.distance, destId, freq, assignedPlane, true, dispatch.departureHour, routeMultiplier);
        dispatch.passengers = flightResult.passengers;
        const profit = flightResult.profit;
        dispatch.profit = profit;
        gameState.money += profit;

        // --- Statistics Tracking ---
        if (!gameState.stats) gameState.stats = { totalFlights: 0, totalPassengers: 0, totalRevenue: 0, totalFuelConsumed: 0, paxFirst: 0, paxBusiness: 0, paxEco: 0, paxCargo: 0, foundingDay: 1, routesCreated: 0, totalDelayedFlights: 0, totalFlightsForOTP: 0, kmFlown: 0, peakFleetSize: 0 };
        if (!dispatch.isFerry) {
            gameState.stats.totalFlights++;
            gameState.stats.totalPassengers += flightResult.passengers || 0;
            gameState.stats.totalRevenue += Math.max(0, profit);
            gameState.stats.totalFlightsForOTP++;
            if ((dispatch.totalDelayMins || 0) >= 15) gameState.stats.totalDelayedFlights++;
            gameState.stats.kmFlown += r.distance || 0;
            if (gameState.fleet.length > (gameState.stats.peakFleetSize || 0)) gameState.stats.peakFleetSize = gameState.fleet.length;
            if ((flightResult.passengers || 0) > 0) {
                if (model.type === 'passenger' || model.category === 'commercial') {
                    gameState.stats.paxFirst    += Math.round((flightResult.passengers || 0) * 0.06);
                    gameState.stats.paxBusiness += Math.round((flightResult.passengers || 0) * 0.22);
                    gameState.stats.paxEco      += Math.round((flightResult.passengers || 0) * 0.72);
                } else {
                    gameState.stats.paxCargo += flightResult.passengers || 0;
                }
            }
        }

        if (!isCatchingUp) {
            const logDest = dispatch.isReturn ? gameState.base.name : dispatch.destName;
            showToast('Vuelo Despegó', `+${formatMoney(profit)} (Ingresos de vuelo a ${logDest})`, 'success');
        }
    }

    if (!isCatchingUp) {
        const logDest = dispatch.isReturn ? gameState.base.id : r.destinationId;
        logMsg(`Despegue: ${plane ? plane.registration : ''} cubriendo vuelo a ${logDest}. Llegada est: Día ${dispatch.arrivalDay} ${formatTime(dispatch.arrivalHour, dispatch.arrivalMinute)}.`);
        if(gameState.currentTab === 'flights') renderFlights();
    }
    return true;
};

let lastRealTime = Date.now();
let unprocessedSimMs = 0;
const SIM_SPEED_MULTIPLIER = 600; // 100ms real = 60000ms sim (1 minuto)

let ticksCounter = 0;
const gameTick = () => {
    let now = Date.now();
    let deltaRealMs = now - lastRealTime;
    
    // Limit delta to prevent massive freezes if paused in debugger, etc.
    // Max 1 real day per tick catch-up (86,400,000 ms)
    if (deltaRealMs > 86400000) {
        deltaRealMs = 86400000; 
    }
    
    lastRealTime = now;
    unprocessedSimMs += deltaRealMs * SIM_SPEED_MULTIPLIER;
    
    let ticksToProcess = Math.floor(unprocessedSimMs / 60000);
    
    if (ticksToProcess > 0) {
        unprocessedSimMs -= ticksToProcess * 60000;
        
        // Flag to prevent UI spam and toasts during fast-forward
        const wasCatchingUp = isCatchingUp;
        if (ticksToProcess > 10) isCatchingUp = true;
        
        for (let i = 0; i < ticksToProcess; i++) {
            gameState.time.minute += 1;
            if (gameState.time.minute >= 60) {
                gameState.time.minute -= 60;
                gameState.time.hour++;
                if (gameState.time.hour >= 24) {
                    gameState.time.hour -= 24;
                    gameState.time.day++;
                    updateFuelMarket();
                    processDailyBank();
                    processDailyEmployeesCost();
                    
                    if (!gameState.lastUsedMarketRefreshDay) gameState.lastUsedMarketRefreshDay = gameState.time.day;
                    if (gameState.time.day - gameState.lastUsedMarketRefreshDay >= 3) {
                        generateUsedMarket();
                        if (gameState.currentTab === 'market') renderMarket();
                    }
                }
                updateWeatherSystem();
            }
            checkAndDispatchFlights();
        }
        
        isCatchingUp = wasCatchingUp;
        updateUI();
    }
    
    ticksCounter++;
    if (ticksCounter >= 20) { // Guardar partida cada ~2 segundos reales
        saveGame();
        ticksCounter = 0;
    }
};

const renderAirlineReputationCard = (boxId) => {
    const box = document.getElementById(boxId);
    if (!box) return;

    const ar = gameState.airlineRating || 3.0;
    const arFStars = Math.floor(ar);
    const arHStar = ar - arFStars >= 0.5;
    let gStarsHtml = '';
    for(let i=0; i<5; i++) {
        if (i < arFStars) gStarsHtml += '<i class="ph-fill ph-star"></i>';
        else if (i === arFStars && arHStar) gStarsHtml += '<i class="ph-fill ph-star-half"></i>';
        else gStarsHtml += '<i class="ph ph-star"></i>';
    }
    
    let arLabel = 'Aceptable';
    if (ar >= 4.5) arLabel = 'Excelente reputación';
    else if (ar >= 3.5) arLabel = 'Muy bien valorada';
    else if (ar >= 2.5) arLabel = 'Aceptable';
    else arLabel = 'Deficiente';

    box.innerHTML = `
        <div class="bento-title" style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span><i class="ph-fill ph-star" style="color: var(--warning);"></i> Puntaje de la Compañía</span>
            <i class="ph ph-arrow-right" style="color: var(--text-muted);"></i>
        </div>
        <div class="reputation-score-wrap">
            <div class="reputation-score">${ar.toFixed(1)}</div>
            <div class="reputation-stars">${gStarsHtml}</div>
        </div>
        <div class="text-sm text-muted" style="margin-top: 10px;">${arLabel}</div>
    `;
};

const renderPassengerReviewsScreen = () => {
    const ar = gameState.airlineRating || 3.0;
    const globalScoreEl = document.getElementById('prv-global-score');
    const globalStarsEl = document.getElementById('prv-global-stars');
    
    if (globalScoreEl) globalScoreEl.innerText = ar.toFixed(1);
    
    if (globalStarsEl) {
        const fStars = Math.floor(ar);
        const hStar = ar - fStars >= 0.5;
        let gStarsHtml = '';
        for(let i=0; i<5; i++) {
            if (i < fStars) gStarsHtml += '<i class="ph-fill ph-star"></i>';
            else if (i === fStars && hStar) gStarsHtml += '<i class="ph-fill ph-star-half"></i>';
            else gStarsHtml += '<i class="ph ph-star"></i>';
        }
        globalStarsEl.innerHTML = gStarsHtml;
    }
    
    let totalPaxSum = 0;
    if (gameState.dailyRatings) {
        gameState.dailyRatings.forEach(bucket => totalPaxSum += bucket.totalPax);
    }
    const paxEl = document.getElementById('prv-total-pax');
    if (paxEl) paxEl.innerText = formatMoneyShort(totalPaxSum).replace('$', '');

    // Analyze Pros and Cons
    const pros = [];
    const cons = [];
    
    // Check ticket pricing
    if (gameState.marketMultiplier <= 0.8) pros.push({text: 'Precios muy accesibles', icon: 'ph-tag'});
    else if (gameState.marketMultiplier >= 1.5) cons.push({text: 'Precios de boletos muy elevados', icon: 'ph-money'});
    else if (gameState.marketMultiplier >= 1.2) cons.push({text: 'Precios ligeramente altos', icon: 'ph-money'});
    else pros.push({text: 'Tarifas equilibradas', icon: 'ph-scales'});
    
    // Check maintenance
    let avgMaint = 100;
    if (gameState.fleet && gameState.fleet.length > 0) {
        avgMaint = gameState.fleet.reduce((sum, ac) => sum + (100 - (ac.maintenanceHours / ac.maintenanceInterval) * 100), 0) / gameState.fleet.length;
    }
    if (avgMaint >= 85) pros.push({text: 'Flota en excelentes condiciones', icon: 'ph-wrench'});
    else if (avgMaint <= 40) cons.push({text: 'Aviones deteriorados o sucios', icon: 'ph-warning'});
    else if (avgMaint <= 60) cons.push({text: 'Mantenimiento de flota irregular', icon: 'ph-wrench'});
    
    // Check staff satisfaction
    let totalSat = 0;
    let empCount = 0;
    if (gameState.employees && gameState.employees.staff) {
        Object.values(gameState.employees.staff).forEach(emp => {
            if (emp.count > 0) {
                totalSat += emp.satisfaction;
                empCount++;
            }
        });
    }
    let avgSat = empCount > 0 ? totalSat / empCount : 100;
    if (avgSat >= 80) pros.push({text: 'Atención del personal amable', icon: 'ph-smiley'});
    else if (avgSat <= 40) cons.push({text: 'Mala actitud de la tripulación', icon: 'ph-smiley-sad'});
    
    // Check for shortages (affects delays/service)
    if (gameState.employees) {
        const minReqs = typeof calculateMinimumEmployees === 'function' ? calculateMinimumEmployees() : {};
        let shortage = false;
        Object.keys(minReqs).forEach(key => {
            const hired = gameState.employees.staff[key]?.count || 0;
            if (hired < minReqs[key]) shortage = true;
        });
        if (shortage) cons.push({text: 'Servicio lento por falta de personal', icon: 'ph-users'});
    }
    
    // If we have very few pros/cons, add generic ones
    if (pros.length === 0) pros.push({text: 'Llegamos a destino', icon: 'ph-airplane-landing'});
    if (cons.length === 0 && ar < 5.0) cons.push({text: 'Comodidad promedio en cabina', icon: 'ph-armchair'});
    
    // Render Pros
    const prosList = document.getElementById('prv-pros-list');
    if (prosList) {
        prosList.innerHTML = pros.slice(0, 3).map(p => `<li style="display: flex; align-items: center; gap: 8px; color: #fff;"><i class="${p.icon}" style="color: #30d158;"></i> ${p.text}</li>`).join('');
    }
    
    // Render Cons
    const consList = document.getElementById('prv-cons-list');
    if (consList) {
        consList.innerHTML = cons.slice(0, 3).map(c => `<li style="display: flex; align-items: center; gap: 8px; color: #fff;"><i class="${c.icon}" style="color: #ff453a;"></i> ${c.text}</li>`).join('');
    }

    // Generate Procedural Reviews feed based on pros and cons
    const feed = document.getElementById('prv-reviews-feed');
    if (!feed) return;
    
    if (!gameState.flightHistory || gameState.flightHistory.length === 0) {
        feed.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;"><i class="ph ph-airplane-tilt" style="font-size: 3rem; margin-bottom: 10px; opacity: 0.5;"></i><br>Aún no hay reseñas. Realiza algunos vuelos primero.</div>`;
        return;
    }
    
    let html = '';
    const recentFlights = gameState.flightHistory.slice(-15).reverse(); // top 15 flights
    
    const firstNames = ["Carlos", "María", "José", "Laura", "Diego", "Ana", "Fernando", "Lucía", "Jorge", "Sofía", "Martín", "Valentina", "Juan", "Camila", "Miguel", "Julieta"];
    const lastNames = ["Gómez", "Rodríguez", "López", "Fernández", "Pérez", "Martínez", "González", "Sánchez", "Díaz", "Romero", "Álvarez", "Ruiz", "Torres", "Suárez"];
    
    recentFlights.forEach(flight => {
        if (!flight.rating) return;
        
        const paxName = firstNames[Math.floor(Math.random() * firstNames.length)] + ' ' + lastNames[Math.floor(Math.random() * lastNames.length)];
        let paxScore = flight.rating + (Math.random() * 0.8 - 0.4);
        paxScore = Math.max(1.0, Math.min(5.0, paxScore));
        
        let comment = '';
        
        // Context-aware comments
        if (paxScore >= 4.0) {
            const goodComments = [
                "¡Un vuelo excelente! Llegamos a tiempo y la atención fue inmejorable.",
                "Súper cómodo y tranquilo. Todo el personal fue muy amable.",
                "Me sorprendió para bien. Definitivamente volveré a viajar con ellos.",
            ];
            if (pros.some(p => p.text.includes('accesibles'))) goodComments.push("El precio del pasaje fue excelente para la calidad del servicio.");
            if (pros.some(p => p.text.includes('condiciones'))) goodComments.push("El avión se notaba muy limpio y bien mantenido.");
            comment = goodComments[Math.floor(Math.random() * goodComments.length)];
        } else if (paxScore >= 2.5) {
            const midComments = [
                "Un viaje normal. Cumplieron con lo básico, pero nada del otro mundo.",
                "El vuelo estuvo bien, aunque hubo un poco de demora en el embarque.",
                "Aceptable. Podría mejorar la comodidad de los asientos.",
            ];
            if (cons.some(c => c.text.includes('altos'))) midComments.push("El vuelo fue decente, pero me pareció un poco caro para lo que ofrecen.");
            if (cons.some(c => c.text.includes('personal'))) midComments.push("Llegamos bien, pero tardaron muchísimo en atendernos a bordo.");
            comment = midComments[Math.floor(Math.random() * midComments.length)];
        } else {
            const badComments = [
                "Pésima experiencia. No recomiendo esta aerolínea.",
                "El asiento era súper incómodo y el avión parecía viejo.",
                "Mala atención. El personal parecía estar de muy mal humor todo el viaje.",
            ];
            if (cons.some(c => c.text.includes('elevados'))) badComments.push("Una estafa. Pagué un montón de dinero por un servicio terrible y lleno de demoras.");
            if (cons.some(c => c.text.includes('sucios'))) badComments.push("El avión estaba sucio y descuidado. Me dio desconfianza.");
            comment = badComments[Math.floor(Math.random() * badComments.length)];
        }
        
        const fS = Math.floor(paxScore);
        const hS = paxScore - fS >= 0.5;
        let sH = '';
        for(let k=0; k<5; k++) {
            if (k < fS) sH += '<i class="ph-fill ph-star"></i>';
            else if (k === fS && hS) sH += '<i class="ph-fill ph-star-half"></i>';
            else sH += '<i class="ph ph-star"></i>';
        }
        
        const dest = typeof AIRPORTS !== 'undefined' ? AIRPORTS.find(a => a.id === flight.destinationId) : null;
        const routeTxt = gameState.base ? `${gameState.base.id} ✈ ${dest ? dest.id : '?'}` : 'Vuelo';
        
        // Random badge
        const badges = ['Viaje de Negocios', 'Familia', 'Turismo', 'Solo'];
        const badge = badges[Math.floor(Math.random() * badges.length)];

        html += `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--surface-light); display: flex; align-items: center; justify-content: center; font-weight: bold; color: var(--accent);">
                            ${paxName.charAt(0)}${paxName.split(' ')[1].charAt(0)}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #fff; font-size: 1rem;">${paxName}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                                <span>${routeTxt}</span>
                                <span>•</span>
                                <span style="background: var(--surface-light); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">${badge}</span>
                            </div>
                        </div>
                    </div>
                    <div style="color: var(--warning); font-size: 1.1rem; display: flex; gap: 2px;">
                        ${sH}
                    </div>
                </div>
                <div style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; font-style: italic;">
                    "${comment}"
                </div>
            </div>
        `;
    });
    
    feed.innerHTML = html;
};

const updateUI = () => {
    if (typeof renderPassengerReviewsScreen === 'function') renderPassengerReviewsScreen();
    if (typeof renderAirlineReputationCard === 'function') renderAirlineReputationCard('dash-rating-card');
    if (gameState.employees) {
        const headerBrand = document.querySelector('.header-brand-name');
        if (headerBrand && headerBrand.innerText !== 'Volver') {
            headerBrand.innerText = gameState.employees.airlineName || 'Mi Aerolínea';
        }
        
        const headerIcon = document.querySelector('.header-brand-icon');
        if (headerIcon) {
            const logoIcon = gameState.employees.logoIcon || 'ph-airplane-tilt';
            const logoColor = gameState.employees.logoColor || '#0a84ff';
            headerIcon.className = `ph-fill ph-${logoIcon.replace('ph-', '')} header-brand-icon`;
            headerIcon.style.color = logoColor;
            headerIcon.style.textShadow = `0 0 8px ${logoColor}`;
        }
    }

    // Usar formato abreviado en header — nunca desborda
    document.getElementById('header-money').innerText = formatMoneyShort(gameState.money);

    // Sync store balance if visible
    const storeBalance = document.getElementById('store-current-balance');
    if (storeBalance) storeBalance.innerText = formatMoney(gameState.money);
    
    const timeStr = formatTime(gameState.time.hour, gameState.time.minute);
    
    // Badge compacto: solo día de juego + hora
    const dayBadge = document.getElementById('header-day');
    if (dayBadge) {
        dayBadge.innerHTML = `Día ${gameState.time.day} <span class="header-day-time">${timeStr}</span>`;
    }
    
    if(gameState.base) {
        document.getElementById('header-base').innerText = gameState.base.id;
        
        // NEW DASHBOARD UPDATES
        const heroBase = document.getElementById('dash-hero-base');
        if (heroBase) heroBase.innerText = gameState.base.name;
        
        // Mock weather
        const temp = document.getElementById('dash-weather-temp');
        if (temp && (temp.innerText === '--°C' || temp.innerText.includes('--'))) {
            temp.innerText = `${Math.floor(Math.random() * 15 + 15)}°C`;
            document.getElementById('dash-weather-desc').innerText = 'Despejado';
        }
    }
    
    let profit = getActiveProfit();
    
    document.getElementById('nav-fleet-count').innerText = gameState.fleet.length;
    
    // NEW DASHBOARD KPI - FUSED FINANCE & PERFORMANCE
    const dashBalance = document.getElementById('dash-balance');
    if (dashBalance) dashBalance.innerText = formatMoney(gameState.money);
    
    const dashProfit = document.getElementById('dash-profit');
    if (dashProfit) dashProfit.innerText = `+${formatMoney(profit)}`;

    const totalDebt = gameState.loans ? gameState.loans.reduce((sum, l) => sum + l.remainingAmount, 0) : 0;
    const dashDebtInfo = document.getElementById('dash-debt-info');
    if (dashDebtInfo) {
        if (totalDebt > 0) {
            dashDebtInfo.innerHTML = `<span style="color: var(--danger); font-weight: 500;"><i class="ph-fill ph-warning-circle"></i> Deuda: $${formatMoney(totalDebt)}</span>`;
        } else {
            dashDebtInfo.innerHTML = `<span style="color: rgba(255,255,255,0.35);"><i class="ph-fill ph-check-circle" style="color: #22c55e;"></i> Sin deudas</span>`;
        }
    }

    const dashWeeklyProfit = document.getElementById('dash-weekly-profit');
    if (dashWeeklyProfit) {
        dashWeeklyProfit.innerText = `Semanal: +${formatMoney(profit * 7)}`;
    }

    const dashFinanceStatus = document.getElementById('dash-finance-status');
    if (dashFinanceStatus) {
        if (profit < 0) {
            dashFinanceStatus.innerText = 'Pérdidas operativas';
            dashFinanceStatus.className = 'finance-status-badge status-danger';
        } else if (profit > 100000) {
            dashFinanceStatus.innerText = 'Crecimiento sólido';
            dashFinanceStatus.className = 'finance-status-badge status-good';
        } else {
            dashFinanceStatus.innerText = 'Operación Estable';
            dashFinanceStatus.className = 'finance-status-badge';
        }
    }

    const dashRatingValue = document.getElementById('dash-rating-value');
    if (dashRatingValue) {
        const ar = gameState.airlineRating || 3.0;
        dashRatingValue.innerText = ar.toFixed(1);
        
        const fullStars = Math.floor(ar);
        const hasHalfStar = ar - fullStars >= 0.5;
        let starsHtml = '';
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) starsHtml += '<i class="ph-fill ph-star"></i>';
            else if (i === fullStars && hasHalfStar) starsHtml += '<i class="ph-fill ph-star-half"></i>';
            else starsHtml += '<i class="ph ph-star"></i>';
        }
        document.getElementById('dash-rating-stars').innerHTML = starsHtml;
        
        let paxText = '0';
        if (gameState.dailyRatings) {
            let totalPaxSum = 0;
            gameState.dailyRatings.forEach(bucket => totalPaxSum += bucket.totalPax);
            paxText = formatMoneyShort(totalPaxSum).replace('$', '');
        }
        const paxEl = document.getElementById('dash-rating-pax');
        if(paxEl) paxEl.innerText = paxText;
        
        const dashRatingLabel = document.getElementById('dash-rating-label');
        if (ar >= 4.5) { dashRatingLabel.innerText = 'Excelente'; dashRatingLabel.className = 'delay-score-label grade-a'; }
        else if (ar >= 3.5) { dashRatingLabel.innerText = 'Muy Bueno'; dashRatingLabel.className = 'delay-score-label grade-b'; }
        else if (ar >= 2.5) { dashRatingLabel.innerText = 'Aceptable'; dashRatingLabel.className = 'delay-score-label grade-c'; }
        else { dashRatingLabel.innerText = 'Deficiente'; dashRatingLabel.className = 'delay-score-label grade-d'; }
    }
    if (dashFinanceStatus) {
        if (totalDebt > gameState.money * 0.5) {
            dashFinanceStatus.innerText = "Riesgo de Deuda";
            dashFinanceStatus.className = "finance-status-badge status-danger";
        } else if (profit > 0) {
            dashFinanceStatus.innerText = "Operación Rentable";
            dashFinanceStatus.className = "finance-status-badge status-success";
        } else if (profit === 0) {
            dashFinanceStatus.innerText = "Operación Inactiva";
            dashFinanceStatus.className = "finance-status-badge status-warning";
        } else {
            dashFinanceStatus.innerText = "Pérdidas";
            dashFinanceStatus.className = "finance-status-badge status-danger";
        }
    }
    
    // NEW FLEET & OPERATIONS REDESIGN
    const activeCount = gameState.fleet ? gameState.fleet.filter(p => p.status === 'in_flight').length : 0;
    const fleetSize = gameState.fleet ? gameState.fleet.length : 0;

    const dashFleetStatus = document.getElementById('dash-fleet-status');
    if (dashFleetStatus) {
        dashFleetStatus.innerText = `${activeCount} / ${fleetSize}`;
    }

    const dashFleetProgress = document.getElementById('dash-fleet-progress');
    if (dashFleetProgress) {
        const pct = fleetSize > 0 ? (activeCount / fleetSize * 100) : 0;
        dashFleetProgress.style.width = `${pct}%`;
    }

    const dashFleetActiveText = document.getElementById('dash-fleet-active-text');
    if (dashFleetActiveText) {
        dashFleetActiveText.innerText = `${activeCount} activas en vuelo`;
    }
    
    const dashRoutesCount = document.getElementById('dash-routes-count');
    if (dashRoutesCount) {
        dashRoutesCount.innerText = gameState.routes ? gameState.routes.length : 0;
    }
    
    // FUEL AND CONSUMPTION CALCULATIONS
    const dashFuelRes = document.getElementById('dash-fuel-res');
    const dashFuelPrice = document.getElementById('dash-fuel-price');
    const dashFuelEta = document.getElementById('dash-fuel-eta');

    if (dashFuelRes) dashFuelRes.innerText = `${new Intl.NumberFormat('es-AR').format(Math.round(gameState.fuelReserves || 0))} L`;
    if (dashFuelPrice) dashFuelPrice.innerText = `$${(gameState.fuelPrice || 0).toFixed(2)}/L`;

    const dashFuelTrend = document.getElementById('dash-fuel-trend');
    if (dashFuelTrend) {
        const isTrendUp = gameState.fuelHistory && gameState.fuelHistory.length > 1 && gameState.fuelHistory[gameState.fuelHistory.length - 1] > gameState.fuelHistory[gameState.fuelHistory.length - 2];
        if (isTrendUp) {
            dashFuelTrend.className = "fuel-trend-badge trend-up";
            dashFuelTrend.innerHTML = `<i class="ph-bold ph-caret-double-up"></i> ▲`;
        } else {
            dashFuelTrend.className = "fuel-trend-badge trend-down";
            dashFuelTrend.innerHTML = `<i class="ph-bold ph-caret-double-down"></i> ▼`;
        }
    }

    let weeklyConsumption = 0;
    let weeklyFrequencies = 0;
    if (gameState.routes && gameState.routes.length > 0) {
        gameState.routes.forEach(route => {
            if (route.frequencies) {
                route.frequencies.forEach(freq => {
                    const model = AIRCRAFT_MODELS.find(m => m.id === freq.modelId || m.name === freq.modelId);
                    if (model) {
                        const fuelFactor = model.capacity === 0 ? 0.5 : model.capacity * 0.025;
                        const fuelNeeded = model.category === 'military' ? Math.round(route.distance * 5) : Math.round(route.distance * fuelFactor);
                        const daysPerWeek = freq.days ? freq.days.length : 0;
                        weeklyConsumption += (fuelNeeded * daysPerWeek);
                        weeklyFrequencies += daysPerWeek;
                    }
                });
            }
        });
    }

    const dashRoutesWeeklyFlights = document.getElementById('dash-routes-weekly-flights');
    if (dashRoutesWeeklyFlights) {
        dashRoutesWeeklyFlights.innerText = `${weeklyFrequencies} vuelos semanales`;
    }

    if (dashFuelEta) {
        const dailyConsumption = weeklyConsumption / 7;
        
        if (dailyConsumption > 0) {
            const daysLeft = (gameState.fuelReserves || 0) / dailyConsumption;
            
            let timeStr = "";
            if (daysLeft < 1) {
                const hoursLeft = daysLeft * 24;
                timeStr = `${Math.floor(hoursLeft)} hs aprox.`;
            } else {
                timeStr = `${Math.floor(daysLeft)} días aprox.`;
            }
            
            const etaDay = gameState.time.day + Math.floor(daysLeft);
            
            dashFuelEta.innerHTML = `<i class="ph-fill ph-clock-countdown" style="color:${daysLeft < 2 ? 'var(--danger)' : daysLeft < 5 ? 'var(--warning)' : 'var(--success)'}"></i> Autonomía: ${timeStr} (Hasta el Día ${etaDay})`;
        } else {
            dashFuelEta.innerHTML = `<i class="ph-fill ph-check-circle" style="color:var(--text-muted)"></i> Sin consumo activo`;
        }
    }
    
    // UPDATE LIVE FLIGHT WIDGET
    updateLiveFlightWidget();
    updateDelayIndexWidget();
    
    AIRCRAFT_MODELS.forEach(model => {
        const btn = document.getElementById(`btn-buy-${model.id}`);
        if(btn) btn.className = gameState.money >= model.price ? 'btn-buy btn-buy-active' : 'btn-buy btn-buy-disabled';
    });
    
    if (gameState.currentTab === 'flights') {
        renderFlights();
    }
};

const getDelaySamples = () => {
    let samples = [];
    const nowAbs = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;

    // Agregar despachos activos
    gameState.activeDispatches.forEach(d => {
        if (d.status === 'completed') return; // Se prefieren completados del historial
        if (d.isFerry) return; // Excluir vuelos Ferry

        let delay = 0;
        let reason = 'congestion';
        let isDelayed = false;

        if (d.status === 'delayed') {
            delay = Math.max(0, nowAbs - (d.originalSchedAbs || d.schedAbs));
            reason = d.reason || 'plane';
            isDelayed = delay >= 15;
        } else if (d.status === 'delayed_weather') {
            delay = Math.max(0, nowAbs - (d.originalSchedAbs || d.schedAbs));
            reason = 'weather';
            isDelayed = delay >= 15;
        } else if (d.status === 'boarding') {
            delay = d.delayMins || 0;
            reason = d.reason || (delay > 0 ? 'congestion' : 'none');
            isDelayed = delay >= 15;
        } else if (d.status === 'in_flight') {
            delay = d.totalDelayMins || 0;
            reason = d.reason || (d.delayMins > 0 ? 'congestion' : 'none');
            isDelayed = delay >= 15;
        }

        samples.push({
            id: d.id,
            delay: delay,
            reason: reason,
            isDelayed: isDelayed,
            timestamp: d.originalSchedAbs || d.schedAbs
        });
    });

    // Agregar elementos del historial
    if (gameState.flightHistory) {
        gameState.flightHistory.forEach(h => {
            const delay = h.totalDelayMins || 0;
            const isDelayed = delay >= 15 || h.isCanceled;
            const reason = h.isCanceled ? 'cancel' : (h.delayReason || (delay > 0 ? 'congestion' : 'none'));
            samples.push({
                id: h.id,
                delay: delay,
                reason: reason,
                isDelayed: isDelayed,
                timestamp: h.timestamp || 0
            });
        });
    }

    // Ordenar por timestamp descendente
    samples.sort((a, b) => b.timestamp - a.timestamp);

    // Limitar a una ventana de las últimas 30 muestras
    return samples.slice(0, 30);
};

const updateDelayIndexWidget = () => {
    const delayValEl = document.getElementById('dash-delay-value');
    const delayGradeEl = document.getElementById('dash-delay-grade');
    const delayOtpEl = document.getElementById('dash-delay-otp');
    const delayAvgEl = document.getElementById('dash-delay-avg');
    const delayTrendEl = document.getElementById('dash-delay-trend');
    const causesBarEl = document.getElementById('dash-delay-causes-bar');
    const causesLegendEl = document.getElementById('dash-delay-causes-legend');

    if (!delayValEl) return;

    const samples = getDelaySamples();
    
    if (samples.length === 0) {
        delayValEl.innerText = "0%";
        delayValEl.style.color = "var(--money)";
        delayValEl.style.textShadow = "0 0 20px rgba(48,209,88,0.2)";
        delayGradeEl.innerText = "Sin Vuelos";
        delayGradeEl.className = "delay-score-label grade-a";
        delayOtpEl.innerText = "100%";
        delayAvgEl.innerText = "0 min";
        delayTrendEl.innerHTML = `<span style="color:var(--text-secondary)"><i class="ph ph-minus"></i> Estable</span>`;
        causesBarEl.innerHTML = `<div class="delay-cause-segment" style="width: 100%; background: var(--border-subtle);" title="Sin demoras"></div>`;
        causesLegendEl.innerHTML = `<div class="legend-item"><span class="legend-dot" style="background:var(--text-muted)"></span> Sin datos de vuelos</div>`;
        return;
    }

    // Calcular estadísticas generales
    const delayedFlights = samples.filter(s => s.isDelayed);
    const delayIndex = Math.round((delayedFlights.length / samples.length) * 100);
    const otp = 100 - delayIndex;

    const totalDelayMins = samples.reduce((sum, s) => sum + s.delay, 0);
    const avgDelay = (totalDelayMins / samples.length).toFixed(1);

    // Actualizar valor principal
    delayValEl.innerText = `${delayIndex}%`;
    
    // Clasificar grado
    let grade = "Excelente";
    let gradeClass = "grade-a";
    let textColor = "var(--money)";
    let shadowColor = "rgba(48,209,88,0.2)";

    if (delayIndex > 50) {
        grade = "Crítico";
        gradeClass = "grade-f";
        textColor = "var(--danger)";
        shadowColor = "rgba(255,69,58,0.3)";
    } else if (delayIndex > 30) {
        grade = "Deficiente";
        gradeClass = "grade-d";
        textColor = "var(--danger)";
        shadowColor = "rgba(255,69,58,0.2)";
    } else if (delayIndex > 15) {
        grade = "Aceptable";
        gradeClass = "grade-c";
        textColor = "var(--warning)";
        shadowColor = "rgba(255,214,10,0.2)";
    } else if (delayIndex > 5) {
        grade = "Bueno";
        gradeClass = "grade-b";
        textColor = "var(--info)";
        shadowColor = "rgba(100,210,255,0.2)";
    }

    delayValEl.style.color = textColor;
    delayValEl.style.textShadow = `0 0 20px ${shadowColor}`;
    delayGradeEl.innerText = grade;
    delayGradeEl.className = `delay-score-label ${gradeClass}`;

    delayOtpEl.innerText = `${otp}%`;
    delayAvgEl.innerText = `${avgDelay}m`;

    // Calcular tendencia
    let trendHtml = "";
    if (samples.length >= 6) {
        const halfSize = Math.floor(samples.length / 2);
        const recentSamples = samples.slice(0, halfSize);
        const olderSamples = samples.slice(halfSize);

        const recentDelayed = recentSamples.filter(s => s.isDelayed).length;
        const olderDelayed = olderSamples.filter(s => s.isDelayed).length;

        const recentRate = recentDelayed / recentSamples.length;
        const olderRate = olderDelayed / olderSamples.length;

        if (recentRate < olderRate) {
            trendHtml = `<span style="color:var(--money)"><i class="ph-bold ph-arrow-down"></i> Mejorando</span>`;
        } else if (recentRate > olderRate) {
            trendHtml = `<span style="color:var(--danger)"><i class="ph-bold ph-arrow-up"></i> Empeorando</span>`;
        } else {
            trendHtml = `<span style="color:var(--warning)"><i class="ph-bold ph-arrow-right"></i> Estable</span>`;
        }
    } else {
        trendHtml = `<span style="color:var(--text-secondary)">Estable</span>`;
    }
    delayTrendEl.innerHTML = trendHtml;

    // Calcular causas principales de demoras (solo vuelos con demora >= 15m)
    if (delayedFlights.length === 0) {
        causesBarEl.innerHTML = `<div class="delay-cause-segment" style="width: 100%; background: var(--money);" title="100% A tiempo"></div>`;
        causesLegendEl.innerHTML = `<div class="legend-item"><span class="legend-dot" style="background:var(--money)"></span> 100% Operaciones a tiempo</div>`;
    } else {
        const causeCounts = {
            weather: 0,
            plane: 0,
            fuel: 0,
            congestion: 0,
            cancel: 0
        };

        delayedFlights.forEach(s => {
            if (causeCounts[s.reason] !== undefined) {
                causeCounts[s.reason]++;
            } else {
                causeCounts.congestion++;
            }
        });

        const totalDelayed = delayedFlights.length;
        const weatherPct = Math.round((causeCounts.weather / totalDelayed) * 100);
        const planePct = Math.round((causeCounts.plane / totalDelayed) * 100);
        const fuelPct = Math.round((causeCounts.fuel / totalDelayed) * 100);
        const cancelPct = Math.round((causeCounts.cancel / totalDelayed) * 100);
        const congestionPct = 100 - (weatherPct + planePct + fuelPct + cancelPct);

        let barHtml = "";
        let legendHtml = "";

        const causes = [
            { id: 'weather', name: 'Clima', pct: weatherPct, color: 'var(--warning)', label: 'Clima Adverso' },
            { id: 'plane', name: 'Flota', pct: planePct, color: 'var(--accent)', label: 'Aeronave No Disp.' },
            { id: 'fuel', name: 'Combustible', pct: fuelPct, color: 'var(--danger)', label: 'Falta Combustible' },
            { id: 'cancel', name: 'Cancelaciones', pct: cancelPct, color: 'var(--danger)', label: 'Vuelos Cancelados' },
            { id: 'congestion', name: 'ATC', pct: congestionPct, color: 'var(--purple)', label: 'Tránsito Aéreo' }
        ];

        causes.forEach(c => {
            if (c.pct > 0) {
                barHtml += `<div class="delay-cause-segment" style="width: ${c.pct}%; background: ${c.color};" title="${c.label}: ${c.pct}%"></div>`;
                legendHtml += `
                    <div class="legend-item">
                        <span class="legend-dot" style="background:${c.color}"></span>
                        <span class="legend-text">${c.name} (${c.pct}%)</span>
                    </div>
                `;
            }
        });

        causesBarEl.innerHTML = barHtml;
        causesLegendEl.innerHTML = legendHtml;
    }
};

const updateLiveFlightWidget = () => {
    const liveContent = document.getElementById('dash-live-content');
    const livePulse = document.getElementById('dash-live-pulse');
    if (!liveContent) return;

    const activeFlights = gameState.activeFlights || [];
    let nextFlight = null;
    let minTime = Infinity;

    activeFlights.forEach(f => {
        if (f.status === 'in_flight') {
            const timeToLand = f.actualArrivalTime - gameState.globalTimeMin;
            if (timeToLand > 0 && timeToLand < minTime) {
                minTime = timeToLand;
                nextFlight = f;
            }
        }
    });

    if (!nextFlight) {
        if(livePulse) livePulse.style.display = 'none';
        liveContent.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:120px; opacity:0.6;">
                <i class="ph-light ph-airplane-slash" style="font-size:2rem; margin-bottom:8px; color:var(--text-muted);"></i>
                <p class="text-muted text-sm">No hay vuelos activos</p>
            </div>
        `;
        return;
    }

    if(livePulse) livePulse.style.display = 'block';

    const origin = nextFlight.route.origin;
    const dest = nextFlight.route.destination;
    const isReturn = nextFlight.leg === 'inbound';
    
    const ap1 = isReturn ? dest : origin;
    const ap2 = isReturn ? origin : dest;

    const totalDur = nextFlight.actualArrivalTime - nextFlight.actualDepartureTime;
    const elapsed = gameState.globalTimeMin - nextFlight.actualDepartureTime;
    let progress = Math.min(100, Math.max(0, (elapsed / totalDur) * 100));

    liveContent.innerHTML = `
        <div class="live-route-big">
            <div class="lrb-ap">
                <div class="lrb-code">${ap1}</div>
                <div class="lrb-city">Salida</div>
            </div>
            <div class="lrb-plane">
                <div class="lrb-plane-line">
                    <div class="lrb-plane-progress" style="width: ${progress}%"></div>
                    <i class="ph-light ph-airplane-tilt lrb-plane-icon" style="left: ${progress}%"></i>
                </div>
            </div>
            <div class="lrb-ap">
                <div class="lrb-code">${ap2}</div>
                <div class="lrb-city">Llegada</div>
            </div>
        </div>
        <div class="live-meta">
            <div class="live-meta-item">
                <span class="live-meta-label">Vuelo</span>
                <span class="live-meta-val">${nextFlight.route.flightCode}${nextFlight.route.flightNumber}</span>
            </div>
            <div class="live-meta-item" style="text-align:right;">
                <span class="live-meta-label">Aterrizaje en</span>
                <span class="live-meta-val" style="color:var(--accent);">${minTime} min</span>
            </div>
        </div>
    `;
};

// --- FLIGHT MANAGEMENT LOGIC ---
let routeCreationState = null; // null si no estamos creando, objeto si estamos en proceso
let currentRouteDetailId = null; // null si estamos en listado, string con id de ruta si vemos detalle

const startRouteCreation = () => {
    routeCreationState = { step: 1, destinationId: '', frequencies: [] };
    renderRoutes();
};

const cancelRouteCreation = () => {
    routeCreationState = null;
    renderRoutes();
};

const addFrequencyToRoute = () => {
    if(!routeCreationState.destinationId) return;
    routeCreationState.frequencies.push({
        id: Math.random().toString(36).substr(2, 9),
        days: ['Lun'],
        time: '08:00',
        flightCode: 'AR',
        flightNumber: Math.floor(Math.random() * 9000 + 1000).toString(),
        modelId: '',
        assignedPlanes: [],
        catering: 'none'
    });
    renderRoutes();
};

const updateFrequencyDay = (freqId, dayStr) => {
    const freq = routeCreationState.frequencies.find(f => f.id === freqId);
    if(freq) {
        if(freq.days.includes(dayStr)) freq.days = freq.days.filter(d => d !== dayStr);
        else freq.days.push(dayStr);
        renderRoutes();
    }
};

const updateFrequencyTime = (freqId, timeStr) => {
    const freq = routeCreationState.frequencies.find(f => f.id === freqId);
    if(freq) freq.time = timeStr;
};

window.updateFrequencyFlightCode = (freqId, val) => {
    const freq = routeCreationState.frequencies.find(f => f.id === freqId);
    if(freq) freq.flightCode = val.toUpperCase();
};

window.updateFrequencyFlightNumber = (freqId, val) => {
    const freq = routeCreationState.frequencies.find(f => f.id === freqId);
    if(freq) freq.flightNumber = val;
};

window.updateFrequencyCatering = (freqId, val) => {
    const freq = routeCreationState.frequencies.find(f => f.id === freqId);
    if(freq) freq.catering = val;
    renderRoutes();
};

let currentFreqEditorId = null;
let planeSelectorContext = 'newRoute'; // 'newRoute', 'existingRoute', 'plannerDraft'
let currentRouteId = null;

const openPlaneSelector = (freqId, context = 'newRoute', routeId = null) => {
    currentFreqEditorId = freqId;
    planeSelectorContext = context;
    currentRouteId = routeId;

    let freq = null;
    let destinationId = null;

    if (context === 'newRoute') {
        freq = routeCreationState.frequencies.find(f => f.id === freqId);
        destinationId = routeCreationState.destinationId;
    } else if (context === 'existingRoute') {
        const route = gameState.routes.find(r => r.id === routeId);
        if (route) {
            freq = route.frequencies.find(f => f.id === freqId);
            destinationId = route.destinationId;
        }
    } else if (context === 'plannerDraft') {
        const route = plannerDraftRoutes.find(r => r.id === routeId);
        if (route) {
            freq = route.frequencies.find(f => f.id === freqId);
            destinationId = route.destinationId;
        }
    }

    if (!freq || !destinationId) return;

    document.getElementById('plane-selector-modal').classList.remove('hidden');
    const grid = document.getElementById('plane-selector-grid');
    
    const dest = AIRPORTS.find(a => a.id === destinationId);
    const dist = calculateDistance(gameState.base.lat, gameState.base.lng, dest.lat, dest.lng);

    // Filter planes by range and explicitly exclude planes in maintenance
    const validPlanes = gameState.fleet.filter(plane => plane.range >= dist && plane.status !== 'maintenance');
    
    if (validPlanes.length === 0) {
        grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center; padding: 40px;">No tenés aviones en tu flota con el rango suficiente (${dist} km) para esta ruta.</p>`;
        return;
    }
    
    renderModalGrid(validPlanes, freq);
};

const renderModalGrid = (validPlanes, freq) => {
    const grid = document.getElementById('plane-selector-grid');
    grid.innerHTML = '';
    
    validPlanes.forEach(plane => {
        const isSelected = freq.assignedPlanes.includes(plane.id);
        const isDisabled = freq.modelId && plane.name !== freq.modelId && freq.assignedPlanes.length > 0;
        
        const visualHtml = plane.modelUrl
            ? `<model-viewer id="modal-model-${plane.id}" src="${plane.modelUrl}" auto-rotate shadow-intensity="1" style="width:100%;height:100%;background-color:transparent;" exposure="1.2" environment-image="neutral" interaction-prompt="none"></model-viewer>`
            : `<div style="width:100%;height:100%;--plane-color: ${plane.savedColor};">${plane.svg}</div>`;
            
        const card = document.createElement('div');
        card.className = 'aircraft-card';
        if (isSelected) {
            card.style.borderColor = 'var(--money)';
            card.style.boxShadow = '0 0 15px rgba(48, 209, 88, 0.3)';
        }
        if (isDisabled) {
            card.style.opacity = '0.4';
            card.style.pointerEvents = 'none';
        }
        
        card.innerHTML = `
            <div class="aircraft-preview" style="height: 180px;">
                ${visualHtml}
                <span class="type-badge">${plane.registration}</span>
            </div>
            <div class="aircraft-body" style="padding: 16px;">
                <h3 class="aircraft-name" style="font-size: 1.1rem;">${plane.name}</h3>
                <div class="aircraft-specs" style="padding: 10px; margin-bottom: 12px;">
                    <div class="spec-row"><span class="spec-label">Alcance:</span> <span class="spec-value">${plane.range} km</span></div>
                    <div class="spec-row"><span class="spec-label">Capacidad:</span> <span class="spec-value">${plane.capacity} pax</span></div>
                </div>
                <button class="btn ${isSelected ? 'btn-danger-subtle' : 'btn-primary'}" style="width: 100%; pointer-events: auto;" onclick="togglePlaneInModal('${plane.id}')">
                    ${isSelected ? '<i class="ph ph-minus"></i> Quitar de Frecuencia' : '<i class="ph ph-plus"></i> Asignar a Frecuencia'}
                </button>
            </div>
        `;
        grid.appendChild(card);
        
        if(plane.modelUrl) {
            setTimeout(() => {
                const mv = document.getElementById(`modal-model-${plane.id}`);
                if(mv) {
                    const setCol = async () => {
                        if (mv.model && mv.model.materials) {
                            let customTexture = null;
                            if (plane.customLivery) {
                                try {
                                    customTexture = await mv.createTexture(plane.customLivery);
                                } catch(e) {}
                            }
                            mv.model.materials.forEach(mat => {
                                if(mat.name.toLowerCase().includes('glass') || mat.name.toLowerCase().includes('window')) return;
                                if (plane.customLivery && customTexture) {
                                    mat.pbrMetallicRoughness.setBaseColorFactor([1,1,1,1]);
                                    if (mat.pbrMetallicRoughness.baseColorTexture) {
                                        mat.pbrMetallicRoughness.baseColorTexture.setTexture(customTexture);
                                    }
                                }
                            });
                        }
                    };
                    if (mv.model) setCol(); else mv.addEventListener('load', setCol, {once:true});
                }
            }, 50);
        }
    });
};

const togglePlaneInModal = (planeId) => {
    if(!currentFreqEditorId) return;
    
    let freq = null;
    let destinationId = null;
    let route = null;

    if (planeSelectorContext === 'newRoute') {
        freq = routeCreationState.frequencies.find(f => f.id === currentFreqEditorId);
        destinationId = routeCreationState.destinationId;
    } else if (planeSelectorContext === 'existingRoute') {
        route = gameState.routes.find(r => r.id === currentRouteId);
        if (route) {
            freq = route.frequencies.find(f => f.id === currentFreqEditorId);
            destinationId = route.destinationId;
        }
    } else if (planeSelectorContext === 'plannerDraft') {
        route = plannerDraftRoutes.find(r => r.id === currentRouteId);
        if (route) {
            freq = route.frequencies.find(f => f.id === currentFreqEditorId);
            destinationId = route.destinationId;
        }
    }

    if (!freq || !destinationId) return;
    
    const plane = gameState.fleet.find(p => p.id === planeId);
    
    if (freq.assignedPlanes.includes(planeId)) {
        freq.assignedPlanes = freq.assignedPlanes.filter(pid => pid !== planeId);
        if (freq.assignedPlanes.length === 0) freq.modelId = ''; 
    } else {
        freq.modelId = plane.name; 
        freq.assignedPlanes.push(planeId);
    }
    
    // Auto-update paired frequency if it exists
    if (route) {
        if (freq.pairedWith) {
            const paired = route.frequencies.find(f => f.id === freq.pairedWith);
            if (paired) {
                paired.modelId = freq.modelId;
                paired.assignedPlanes = [...freq.assignedPlanes];
            }
        } else {
            const paired = route.frequencies.find(f => f.pairedWith === freq.id);
            if (paired) {
                paired.modelId = freq.modelId;
                paired.assignedPlanes = [...freq.assignedPlanes];
            }
        }
    }
    
    const dest = AIRPORTS.find(a => a.id === destinationId);
    const dist = calculateDistance(gameState.base.lat, gameState.base.lng, dest.lat, dest.lng);
    const validPlanes = gameState.fleet.filter(plane => plane.range >= dist);
    renderModalGrid(validPlanes, freq);
    
    if (planeSelectorContext === 'newRoute') {
        renderRoutes();
    } else if (planeSelectorContext === 'existingRoute') {
        saveGame();
        renderRouteDetails();
    } else if (planeSelectorContext === 'plannerDraft') {
        plannerUnsavedChanges = true;
        renderPlanner();
        if (typeof openPlannerFlightModal === 'function') {
            openPlannerFlightModal(currentRouteId, currentFreqEditorId);
        }
    }
};

const closePlaneSelector = () => {
    document.getElementById('plane-selector-modal').classList.add('hidden');
    currentFreqEditorId = null;
    currentRouteId = null;
};

const deleteFrequency = (freqId) => {
    routeCreationState.frequencies = routeCreationState.frequencies.filter(f => f.id !== freqId);
    renderRoutes();
};

const finalizeRouteCreation = () => {
    if(!routeCreationState.destinationId) {
        showToast('Error de Validación', 'Debes seleccionar un destino para la ruta.', 'error');
        return;
    }
    if(routeCreationState.frequencies.length === 0) {
        showToast('Error de Validación', 'Debes añadir al menos una frecuencia.', 'error');
        return;
    }
    
    const dest = AIRPORTS.find(a => a.id === routeCreationState.destinationId);
    const dist = calculateDistance(gameState.base.lat, gameState.base.lng, dest.lat, dest.lng);
    
    const finalFrequencies = [];
    for (let i = 0; i < routeCreationState.frequencies.length; i++) {
        const f = routeCreationState.frequencies[i];
        if (f.days.length === 0) {
            showToast('Error de Validación', `La Frecuencia ${i+1} no tiene días de operación seleccionados.`, 'error');
            return;
        }
        if (f.assignedPlanes.length === 0) {
            showToast('Error de Validación', `Debes asignar al menos una aeronave a la Frecuencia ${i+1}.`, 'error');
            return;
        }

        f.id = f.id || Math.random().toString(36).substr(2, 9);
        f.isReturn = false;
        finalFrequencies.push(f);

        // Calculate return flight
        const model = AIRCRAFT_MODELS.find(m => m.id === f.modelId || m.name === f.modelId);
        const durationHours = dist / getAircraftSpeed(model);
        const durationMinutes = Math.round(durationHours * 60);
        let turnaroundMins = getTurnaroundMins(model);

        const parts = f.time.split(':');
        const fH = parseInt(parts[0], 10);
        const fM = parseInt(parts[1], 10);
        const outboundMins = fH * 60 + fM;

        const bufferMins = getScheduleBufferMins(durationMinutes);
        
        let boardingMins = 30;
        if (model) {
            if (model.capacity > 200) boardingMins = 45;
            else if (model.capacity < 100) boardingMins = 20;
        }

        let returnMinsTotal = outboundMins + durationMinutes + turnaroundMins + bufferMins + boardingMins;
        
        const rem = returnMinsTotal % 30;
        if (rem !== 0) {
            returnMinsTotal += (30 - rem);
        }

        const returnDayOffset = Math.floor(returnMinsTotal / (24 * 60));
        const returnH = Math.floor((returnMinsTotal % (24 * 60)) / 60);
        const returnM = returnMinsTotal % 60;

        const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const returnDays = f.days.map(d => {
            const idx = DAYS.indexOf(d);
            return DAYS[(idx + returnDayOffset) % 7];
        });

        finalFrequencies.push({
            id: Math.random().toString(36).substr(2, 9),
            days: returnDays,
            time: formatTime(returnH, returnM),
            modelId: f.modelId,
            assignedPlanes: [...f.assignedPlanes],
            isReturn: true,
            pairedWith: f.id
        });
    }
    
    gameState.routes.push({
        id: Math.random().toString(36).substr(2, 9),
        destinationId: dest.id,
        distance: dist,
        frequencies: finalFrequencies
    });
    
    logMsg(`Nueva ruta establecida a ${dest.id} con ${routeCreationState.frequencies.length} frecuencias.`);
    showToast('Ruta Operativa', `Ruta a ${dest.name} programada en el sistema.`, 'success');
    
    routeCreationState = null;
    saveGame();
    renderRoutes();
    updateUI();
};



window.processFlightCancellation = (dispatch, source = 'system') => {
    const ticketPrice = dispatch.ticketPrice || 150;
    const pax = dispatch.passengers || (dispatch.planeId ? (gameState.fleet.find(p=>p.id===dispatch.planeId)?.capacity || 150) : 150);
    const refund = pax * ticketPrice;
    const compensation = pax * 100;
    const totalPenalty = refund + compensation;
    
    gameState.money -= totalPenalty;
    if (!gameState.transactions) gameState.transactions = [];
    gameState.transactions.push({
        id: 'tx_' + Date.now() + Math.random(),
        type: 'expense',
        amount: totalPenalty,
        description: `Cancelación Vuelo ${dispatch.flightNumberStr || ''} (${source})`,
        day: gameState.time.day,
        hour: gameState.time.hour,
        minute: gameState.time.minute
    });
    
    const nowAbs = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
    const schedAbs = dispatch.originalSchedAbs || dispatch.schedAbs || nowAbs;
    const departureHour = Math.floor((schedAbs % (24 * 60)) / 60);
    const departureMinute = schedAbs % 60;
    
    const route = gameState.routes ? gameState.routes.find(r => r.id === dispatch.routeId) : null;
    const distance = route ? route.distance : 0;
    const model = AIRCRAFT_MODELS.find(m => m.id === dispatch.modelId || m.name === dispatch.modelId);
    const durationMins = distance > 0 && model ? Math.round((distance / getAircraftSpeed(model)) * 60) : 120;
    
    const arrAbs = schedAbs + durationMins;
    const arrivalHour = Math.floor((arrAbs % (24 * 60)) / 60);
    const arrivalMinute = arrAbs % 60;

    if (!gameState.flightHistory) gameState.flightHistory = [];
    const histFlight = {
        ...dispatch,
        departureHour: dispatch.departureHour !== undefined ? dispatch.departureHour : departureHour,
        departureMinute: dispatch.departureMinute !== undefined ? dispatch.departureMinute : departureMinute,
        arrivalHour: dispatch.arrivalHour !== undefined ? dispatch.arrivalHour : arrivalHour,
        arrivalMinute: dispatch.arrivalMinute !== undefined ? dispatch.arrivalMinute : arrivalMinute,
        isCanceled: true,
        totalDelayMins: nowAbs - schedAbs,
        rating: 0,
        profit: -totalPenalty,
        timestamp: Date.now()
    };
    gameState.flightHistory.unshift(histFlight);
    
    dispatch.status = 'canceled';
    dispatch.cancelAbs = nowAbs;
    
    if (!dispatch.isReturn) {
        // Outbound canceled. Find the paired return frequency and cancel it too.
        let retFreq = null;
        if (route) {
            retFreq = route.frequencies.find(f => f.pairedWith === dispatch.freqId || f.id === dispatch.freqId); // pairedWith points to outbound
            if (!retFreq) {
                // some times pairedWith is on the return, sometimes on the outbound
                const outFreq = route.frequencies.find(f => f.id === dispatch.freqId);
                if (outFreq && outFreq.pairedWith) {
                    retFreq = route.frequencies.find(f => f.id === outFreq.pairedWith);
                }
                if (!retFreq) {
                    // Just find the other one
                    retFreq = route.frequencies.find(f => f.isReturn && (f.pairedWith === dispatch.freqId || route.frequencies.some(out => out.id === dispatch.freqId && out.pairedWith === f.id)));
                }
            }
        }
        
        let retDispatch = gameState.activeDispatches.find(d => d.routeId === dispatch.routeId && d.isReturn && (d.planeId === dispatch.planeId || d.freqId === (retFreq ? retFreq.id : null)));
        
        // If return dispatch not in activeDispatches yet, create a dummy one so it renders as canceled and doesn't get spawned later
        if (!retDispatch && retFreq) {
            const retParts = retFreq.time.split(':');
            const rH = parseInt(retParts[0], 10);
            const rM = parseInt(retParts[1], 10);
            const rSchedAbs = Math.floor(arrAbs / (24*60)) * 24 * 60 + rH * 60 + rM; // estimate day
            retDispatch = {
                id: Math.random().toString(36).substr(2, 9),
                routeId: route.id,
                freqId: retFreq.id,
                destName: gameState.base ? gameState.base.name : 'HUB',
                planeId: dispatch.planeId,
                modelId: retFreq.modelId,
                status: 'canceled',
                cancelAbs: nowAbs,
                schedAbs: rSchedAbs,
                originalSchedAbs: rSchedAbs,
                isReturn: true,
                flightNumberStr: (retFreq.flightCode || 'AR') + ' ' + (retFreq.flightNumber || '')
            };
            gameState.activeDispatches.push(retDispatch);
        }

        if (retDispatch) {
            retDispatch.status = 'canceled';
            retDispatch.cancelAbs = nowAbs;
            
            const retSchedAbs = retDispatch.originalSchedAbs || retDispatch.schedAbs || arrAbs + 60;
            const retDepHour = Math.floor((retSchedAbs % (24 * 60)) / 60);
            const retDepMin = retSchedAbs % 60;
            const retArrAbs = retSchedAbs + durationMins;
            const retArrHour = Math.floor((retArrAbs % (24 * 60)) / 60);
            const retArrMin = retArrAbs % 60;

            gameState.flightHistory.unshift({
                ...retDispatch,
                departureHour: retDispatch.departureHour !== undefined ? retDispatch.departureHour : retDepHour,
                departureMinute: retDispatch.departureMinute !== undefined ? retDispatch.departureMinute : retDepMin,
                arrivalHour: retDispatch.arrivalHour !== undefined ? retDispatch.arrivalHour : retArrHour,
                arrivalMinute: retDispatch.arrivalMinute !== undefined ? retDispatch.arrivalMinute : retArrMin,
                isCanceled: true,
                totalDelayMins: 0,
                rating: 0,
                profit: 0,
                timestamp: Date.now()
            });
        }
        
        if (dispatch.planeId) {
            const p = gameState.fleet.find(pl => pl.id === dispatch.planeId);
            if (p) {
                p.status = 'idle';
                p.location = gameState.base ? gameState.base.id : 'HUB';
            }
        }
    } else {
        // Only return flight was canceled
        if (dispatch.planeId) {
            const p = gameState.fleet.find(pl => pl.id === dispatch.planeId);
            if (p) {
                p.status = 'idle';
                p.location = dispatch.originId || (dispatch.routeId ? gameState.routes.find(r=>r.id===dispatch.routeId)?.destinationId : 'DST');
                
                const currentLoc = AIRPORTS.find(a => a.id === p.location);
                const locName = currentLoc?.name || p.location;
                const ferryDist = currentLoc ? calculateDistance(currentLoc.lat, currentLoc.lng, gameState.base.lat, gameState.base.lng) : 1000;
                const ferryCost = Math.round(ferryDist * 15);
                
                if (confirm(`El tramo de vuelta fue cancelado. El avión ${p.registration} quedará varado en ${locName}. ¿Deseas iniciar un Vuelo Ferry ahora mismo por ${formatMoney(ferryCost)}?`)) {
                    requestFerryFlightSilent(p.id);
                } else {
                    showToast('Aeronave Varada', `El ${p.registration} ha quedado en destino.`, 'warning');
                }
            }
        }
    }
    
    logMsg(`Vuelo a ${dispatch.destName || 'Destino'} cancelado.`);
    showToast('Vuelo Cancelado', `Se ha cancelado la salida.`, 'info');
};

const resolveDelayedFlight = (dispatchId, action) => {
    const dispatch = gameState.activeDispatches.find(d => d.id === dispatchId);
    if(!dispatch) return;
    
    if(action === 'cancel') {
        window.processFlightCancellation(dispatch, 'operaciones');
    }
    renderFlights();
};

window.cancelAllAttentionFlights = () => {
    const toCancel = gameState.activeDispatches.filter(d => d.status === 'delayed' || d.status === 'delayed_weather');
    if (toCancel.length === 0) return;
    
    let canceledCount = 0;
    toCancel.forEach(dispatch => {
        window.processFlightCancellation(dispatch, 'operaciones_masivas');
        canceledCount++;
    });
    showToast('Operaciones Canceladas', `Se han cancelado ${canceledCount} operaciones demoradas.`, 'info');
    renderFlights();
};

window.retryDelayedFlight = (dispatchId, forcedPlaneId = null) => {
    const dispatch = gameState.activeDispatches.find(d => d.id === dispatchId);
    if(!dispatch) return;
    
    const route = gameState.routes.find(r => r.id === dispatch.routeId);
    if(!route) return;
    
    const freq = route.frequencies.find(f => f.id === dispatch.freqId);
    if(!freq) {
        // Fallback
        gameState.activeDispatches = gameState.activeDispatches.filter(d => d.id !== dispatchId);
        renderFlights();
        return;
    }
    
    const d = gameState.activeDispatches.find(di => di.id === dispatchId);
    if (!d) return;
    const origSchedAbs = d.originalSchedAbs || d.schedAbs;
    const originalReason = d.reason;
    
    // Remover el despacho retrasado
    gameState.activeDispatches = gameState.activeDispatches.filter(di => di.id !== dispatchId);
    
    // Intentar embarcar nuevamente
    const model = AIRCRAFT_MODELS.find(m => m.id === freq.modelId || m.name === freq.modelId);
    const dest = AIRPORTS.find(a => a.id === route.destinationId);
    const nowAbs = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
    
    let boardingMins = 30;
    if (model) {
        if (model.capacity > 200) boardingMins = 45;
        else if (model.capacity < 100) boardingMins = 20;
    }
    
    const newSchedAbs = nowAbs + boardingMins;
    startBoarding(route, freq, model, dest, newSchedAbs, origSchedAbs, originalReason, forcedPlaneId);
    if(gameState.currentTab === 'flights') renderFlights();
};

window.viewRouteDetails = (routeId) => {
    currentRouteDetailId = routeId;
    renderRoutes();
};

window.closeRouteDetails = () => {
    currentRouteDetailId = null;
    renderRoutes();
};

window.deleteRoute = (routeId) => {
    if(!confirm("¿Estás seguro de eliminar esta ruta? Todos los vuelos programados para esta ruta serán cancelados.")) return;
    
    // Eliminar despachos activos de esta ruta
    gameState.activeDispatches = gameState.activeDispatches.filter(d => d.routeId !== routeId);
    
    // Eliminar la ruta
    gameState.routes = gameState.routes.filter(r => r.id !== routeId);
    
    showToast("Ruta Eliminada", "La ruta y sus vuelos han sido cancelados.", "info");
    currentRouteDetailId = null;
    saveGame();
    renderRoutes();
};

window.updateExistingFrequencyFlightCode = (routeId, freqId, val) => {
    const route = gameState.routes.find(r => r.id === routeId);
    if(route) {
        const freq = route.frequencies.find(f => f.id === freqId);
        if(freq) freq.flightCode = val.toUpperCase();
        
        // Also update paired return frequency
        if (freq && freq.pairedWith) {
            const paired = route.frequencies.find(f => f.id === freq.pairedWith);
            if (paired) paired.flightCode = val.toUpperCase();
        }
        saveGame();
    }
};

window.updateExistingFrequencyFlightNumber = (routeId, freqId, val) => {
    const route = gameState.routes.find(r => r.id === routeId);
    if(route) {
        const freq = route.frequencies.find(f => f.id === freqId);
        if(freq) freq.flightNumber = val;
        
        // Also update paired return frequency
        if (freq && freq.pairedWith) {
            const paired = route.frequencies.find(f => f.id === freq.pairedWith);
            if (paired) paired.flightNumber = val;
        }
        saveGame();
    }
};

window.updateExistingFrequencyCatering = (routeId, freqId, val) => {
    const route = gameState.routes.find(r => r.id === routeId);
    if(route) {
        const freq = route.frequencies.find(f => f.id === freqId);
        if(freq) freq.catering = val;
        
        // Also update paired return frequency
        if (freq && freq.pairedWith) {
            const paired = route.frequencies.find(f => f.id === freq.pairedWith);
            if (paired) paired.catering = val;
        }
        saveGame();
        renderRouteDetails(); // re-render to apply visually if needed
    }
};

window.deleteFrequencyFromExistingRoute = (routeId, freqId) => {
    if(!confirm("¿Eliminar este horario?")) return;
    
    const route = gameState.routes.find(r => r.id === routeId);
    if(!route) return;
    
    // Find paired frequency to remove both outbound and return
    const freq = route.frequencies.find(f => f.id === freqId);
    if(freq) {
        const pairedId = freq.pairedWith;
        route.frequencies = route.frequencies.filter(f => f.id !== freqId && f.pairedWith !== freqId && f.id !== pairedId);
        
        // Remove active dispatches for these frequencies
        gameState.activeDispatches = gameState.activeDispatches.filter(d => d.routeId !== routeId || (d.freqId !== freqId && d.freqId !== pairedId));
    }
    
    if(route.frequencies.length === 0) {
        deleteRoute(routeId);
    } else {
        saveGame();
        renderRoutes();
    }
};

window.addFrequencyToExistingRoute = (routeId) => {
    const route = gameState.routes.find(r => r.id === routeId);
    if (!route) return;
    
    const outId = Math.random().toString(36).substr(2, 9);
    const retId = Math.random().toString(36).substr(2, 9);
    
    const dest = AIRPORTS.find(a => a.id === route.destinationId);
    const dist = route.distance || 0;
    
    const validPlanes = gameState.fleet.filter(plane => plane.range >= dist);
    const assignedPlanes = validPlanes.length > 0 ? [validPlanes[0].id] : [];
    const modelId = validPlanes.length > 0 ? validPlanes[0].name : '';
    
    const outboundFreq = {
        id: outId,
        days: ['Lun'],
        time: '08:00',
        flightCode: 'AR',
        flightNumber: Math.floor(Math.random() * 9000 + 1000).toString(),
        modelId: modelId,
        assignedPlanes: [...assignedPlanes],
        catering: 'none',
        isReturn: false
    };
    
    const model = AIRCRAFT_MODELS.find(m => m.id === modelId || m.name === modelId);
    const durationHours = dist / getAircraftSpeed(model);
    const durationMinutes = Math.round(durationHours * 60);
    const turnaroundMins = getTurnaroundMins(model);
    const bufferMins = getScheduleBufferMins(durationMinutes);
    let boardingMins = 30;
    if (model) {
        if (model.capacity > 200) boardingMins = 45;
        else if (model.capacity < 100) boardingMins = 20;
    }
    
    let returnMinsTotal = 480 + durationMinutes + turnaroundMins + bufferMins + boardingMins;
    const rem = returnMinsTotal % 30;
    if (rem !== 0) returnMinsTotal += (30 - rem);
    
    const returnDayOffset = Math.floor(returnMinsTotal / (24 * 60));
    const returnH = Math.floor((returnMinsTotal % (24 * 60)) / 60);
    const returnM = returnMinsTotal % 60;
    
    const returnDays = ['Lun'].map(d => {
        const idx = ALL_DAYS.indexOf(d);
        return ALL_DAYS[(idx + returnDayOffset) % 7];
    });
    
    const returnFreq = {
        id: retId,
        days: returnDays,
        time: formatTime(returnH, returnM),
        modelId: modelId,
        assignedPlanes: [...assignedPlanes],
        isReturn: true,
        pairedWith: outId
    };
    
    route.frequencies = route.frequencies || [];
    route.frequencies.push(outboundFreq);
    route.frequencies.push(returnFreq);
    
    saveGame();
    renderRoutes();
    showToast('Frecuencia Agregada', 'Se ha programado una nueva frecuencia de ida y vuelta.', 'success');
};

// --- TICKET PRICING LOGIC ---
window.changeRoutePrice = (routeId, deltaPercent) => {
    const route = gameState.routes.find(r => r.id === routeId);
    if (!route) return;
    if (typeof route.priceMultiplier === 'undefined') route.priceMultiplier = 1.0;
    
    route.priceMultiplier += deltaPercent;
    if (route.priceMultiplier < 0.1) route.priceMultiplier = 0.1; // minimum 10%
    if (route.priceMultiplier > 5.0) route.priceMultiplier = 5.0; // max 500%
    
    saveGame();
    renderRoutes();
};

window.setRoutePrice = (routeId, el) => {
    const val = parseFloat(el.value);
    if (isNaN(val) || val < 0) return;
    
    const route = gameState.routes.find(r => r.id === routeId);
    if (!route) return;
    
    // The baseEco in simulator is approximately 50 + distance * 0.12
    const baseEco = 50 + (route.distance * 0.12);
    
    route.priceMultiplier = val / baseEco;
    if (route.priceMultiplier < 0.1) route.priceMultiplier = 0.1;
    if (route.priceMultiplier > 5.0) route.priceMultiplier = 5.0;
    
    saveGame();
    renderRoutes();
};

const getPricePanelHtml = (route) => {
    if (typeof route.priceMultiplier === 'undefined') route.priceMultiplier = 1.0;
    const mult = route.priceMultiplier;
    const baseEco = 50 + (route.distance * 0.12);
    const currentPrice = Math.round(baseEco * mult);
    let statusClass = 'rt-price-status-normal';
    let statusText = 'Normal';
    let demandInfo = 'Demanda estable esperada para este precio.';
    let pctClass = 'normal';
    if (mult < 0.85) { statusClass = 'rt-price-status-low'; statusText = 'Alta demanda'; demandInfo = 'Precio bajo \u2014 mayor ocupaci\u00f3n esperada'; pctClass = 'low'; }
    else if (mult > 1.15) { statusClass = 'rt-price-status-high'; statusText = 'Baja demanda'; demandInfo = 'Precio alto \u2014 menor ocupaci\u00f3n esperada'; pctClass = 'high'; }
    const fillWidth = Math.min(100, Math.max(0, (mult / 2) * 100));
    let fillColor = '#0a84ff';
    if (mult < 0.85) fillColor = '#34c759';
    if (mult > 1.15) fillColor = '#ff453a';
    const pctText = mult === 1.0 ? 'Promedio de mercado' : (mult > 1.0 ? `+${Math.round((mult-1)*100)}% sobre promedio` : `-${Math.round((1-mult)*100)}% bajo promedio`);
    return `
    <div class="rt-price-section">
        <div class="rt-section-row-header">
            <div class="rt-section-row-label"><i class="ph ph-tag"></i> Tarifa Clase Turista</div>
            <span class="rt-price-status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="rt-price-inline-controls">
            <button class="rt-price-btn" onclick="changeRoutePrice('${route.id}', -0.05)" title="Bajar 5%"><i class="ph ph-minus"></i></button>
            <div class="rt-price-center">
                <div class="rt-price-amount"><span class="rt-price-currency">$</span><input type="number" class="rt-price-value" value="${currentPrice}" onchange="setRoutePrice('${route.id}', this)"></div>
                <div class="rt-price-bar-track"><div class="rt-price-bar-center-mark"></div><div class="rt-price-bar-fill" style="width:${fillWidth}%;background:${fillColor};"></div></div>
                <div class="rt-price-subtext ${pctClass}">${pctText} &mdash; ${demandInfo}</div>
            </div>
            <button class="rt-price-btn" onclick="changeRoutePrice('${route.id}', 0.05)" title="Subir 5%"><i class="ph ph-plus"></i></button>
        </div>
    </div>
    `;
};

const renderRoutes = () => {
    const view = document.getElementById('view-routes');
    if (!view) return;

    /* ROUTE DETAIL VIEW */
    if (currentRouteDetailId) {
        if (window.setHeaderBack) window.setHeaderBack(() => closeRouteDetails(), 'a Rutas');
        const route = gameState.routes.find(r => r.id === currentRouteDetailId);
        if (!route) { currentRouteDetailId = null; return renderRoutes(); }
        const dest = AIRPORTS.find(a => a.id === route.destinationId) || { id: '???', name: 'Desconocido' };
        const outboundFreqs = (route.frequencies || []).filter(f => !f.isReturn);
        const returnFreqs   = (route.frequencies || []).filter(f => f.isReturn);
        const ALL_DAYS = ['Lun', 'Mar', 'Mi\xE9', 'Jue', 'Vie', 'S\xE1b', 'Dom'];
        const destCity = dest.name.split(',')[0];
        const baseId   = gameState.base ? gameState.base.id : '---';

        const freqRows = outboundFreqs.map((freq, idx) => {
            const ret = returnFreqs.find(r => r.pairedWith === freq.id || r.id === freq.pairedWith);
            const daysHtml = ALL_DAYS.map(d => `<span class="rt-day-badge ${freq.days.includes(d) ? 'active' : ''}">${d.substring(0,2)}</span>`).join('');
            const retDaysHtml = ret ? ALL_DAYS.map(d => `<span class="rt-day-badge ${ret.days.includes(d) ? 'active' : ''}">${d.substring(0,2)}</span>`).join('') : '';
            const planesHtml = freq.assignedPlanes.length > 0
                ? freq.assignedPlanes.map(pid => { const p = gameState.fleet.find(pl => pl.id === pid); return p ? `<span class="rt-plane-tag"><i class="ph-light ph-airplane-tilt"></i>${p.registration}</span>` : ''; }).join('')
                : `<span class="rt-no-plane"><i class="ph ph-warning-circle"></i>Sin aeronave asignada</span>`;
            const flightCode = freq.flightCode || 'AR';
            return `
            <div class="rt-freq-row" style="animation: rt-fade-up ${0.12 + idx * 0.07}s cubic-bezier(0.2,0.8,0.2,1) both;">
                <div class="rt-freq-row-header">
                    <div class="rt-freq-row-title">
                        <span class="rt-freq-num-badge">${idx + 1}</span>
                        <div class="rt-fnum-input-group">
                            <input class="rt-fnum-code" type="text" value="${flightCode}" maxlength="3" onchange="updateExistingFrequencyFlightCode('${route.id}','${freq.id}',this.value)">
                            <input class="rt-fnum-num" type="text" value="${freq.flightNumber || ''}" maxlength="4" placeholder="0000" onchange="updateExistingFrequencyFlightNumber('${route.id}','${freq.id}',this.value)">
                        </div>
                    </div>
                    <button class="rt-btn-danger rt-btn-sm" onclick="deleteFrequencyFromExistingRoute('${route.id}','${freq.id}')"><i class="ph ph-trash"></i> Eliminar</button>
                </div>
                <div class="rt-freq-row-body">
                    <div class="rt-freq-schedule">
                        <div class="rt-sched-leg">
                            <span class="rt-sched-dir"><i class="ph ph-arrow-up-right" style="color:#0a84ff;"></i> IDA</span>
                            <span class="rt-sched-time">${freq.time}</span>
                            <div class="rt-days-group">${daysHtml}</div>
                        </div>
                        ${ret ? `<div class="rt-sched-leg rt-sched-leg-return"><span class="rt-sched-dir" style="opacity:0.5;"><i class="ph ph-arrow-down-left" style="color:#0a84ff;"></i> VTA</span><span class="rt-sched-time" style="opacity:0.5;">${ret.time}</span><div class="rt-days-group">${retDaysHtml}</div></div>` : ''}
                    </div>
                    <div class="rt-freq-row-opts">
                        <div class="rt-row-opt">
                            <span class="rt-opt-label"><i class="ph ph-coffee"></i> Catering</span>
                            <select class="rt-select" onchange="updateExistingFrequencyCatering('${route.id}', '${freq.id}', this.value)">
                                <option value="none" ${freq.catering === 'none' || !freq.catering ? 'selected' : ''}>Sin Catering</option>
                                <option value="low_cost" ${freq.catering === 'low_cost' ? 'selected' : ''}>Low Cost (-$5/pax)</option>
                                <option value="standard" ${freq.catering === 'standard' ? 'selected' : ''}>Est\u00E1ndar (-$15/pax)</option>
                                <option value="luxury" ${freq.catering === 'luxury' ? 'selected' : ''}>Lujoso (-$40/pax)</option>
                            </select>
                        </div>
                        <div class="rt-row-opt">
                            <span class="rt-opt-label"><i class="ph ph-airplane"></i> Aeronaves</span>
                            <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;">
                                ${planesHtml}
                                <button class="rt-btn-secondary rt-btn-sm" onclick="openPlaneSelector('${freq.id}', 'existingRoute', '${route.id}')"><i class="ph ph-pencil"></i> Modificar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');

        view.innerHTML = `
            <div class="rt-shell">
                <div class="rt-detail-masthead-flat">
                    <div class="rt-detail-masthead-route">
                        <div class="rt-detail-iatas">
                            <span>${baseId}</span>
                            <div class="rt-iata-connector"><div class="rt-iata-line"></div><i class="ph-light ph-airplane-tilt rt-iata-arrow"></i><div class="rt-iata-line"></div></div>
                            <span>${dest.id}</span>
                        </div>
                        <div class="rt-detail-meta-line">
                            <span class="rt-meta-city">${destCity}</span>
                            <span class="rt-detail-dist-pill">${route.distance} km</span>
                        </div>
                    </div>
                    <div class="rt-detail-masthead-actions">
                        <button class="rt-btn-secondary" onclick="addFrequencyToExistingRoute && addFrequencyToExistingRoute('${route.id}') || null"><i class="ph ph-plus"></i> Frecuencia</button>
                        <button class="rt-btn-danger" onclick="deleteRoute('${route.id}')"><i class="ph ph-trash"></i> Eliminar</button>
                    </div>
                </div>
                ${getPricePanelHtml(route)}
                <div class="rt-section-divider">
                    <span class="rt-section-label">${outboundFreqs.length} Frecuencia${outboundFreqs.length !== 1 ? 's' : ''} Programada${outboundFreqs.length !== 1 ? 's' : ''}</span>
                </div>
                ${outboundFreqs.length === 0
                    ? `<div class="rt-empty"><div class="rt-empty-icon"><i class="ph ph-calendar-blank"></i></div><p>Sin frecuencias programadas</p><span class="rt-empty-hint">Elimin\u00E1 esta ruta y cre\u00E1 una nueva con al menos una frecuencia.</span></div>`
                    : `<div class="rt-freq-list">${freqRows}</div>`}
            </div>`;
        return;
    }

    /* ROUTE CREATION WIZARD */
    if (routeCreationState) {
        if (window.setHeaderBack) window.setHeaderBack(() => cancelRouteCreation(), 'Cancelar');
        let destOptions = '<option value="">Seleccionar destino...</option>';
        AIRPORTS.forEach(ap => {
            if (gameState.base && ap.id !== gameState.base.id) {
                destOptions += `<option value="${ap.id}" ${routeCreationState.destinationId === ap.id ? 'selected' : ''}>${ap.id} \u00B7 ${ap.name.split(',')[0]}</option>`;
            }
        });
        const dest = AIRPORTS.find(a => a.id === routeCreationState.destinationId);
        const dist = dest ? calculateDistance(gameState.base.lat, gameState.base.lng, dest.lat, dest.lng) : null;
        const ALL_DAYS = ['Lun', 'Mar', 'Mi\xE9', 'Jue', 'Vie', 'S\xE1b', 'Dom'];
        let weatherHtml = '';
        if (routeCreationState.destinationId) {
            const wInfo = getWeatherInfo(routeCreationState.destinationId);
            weatherHtml = `<div class="rt-wiz-info-chip"><i class="ph ph-cloud-sun"></i>${wInfo.icon} ${wInfo.id} en destino</div>`;
        }
        const freqRowsHtml = routeCreationState.frequencies.map((freq, idx) => {
            const daysHtml = ALL_DAYS.map(d => `<button class="rt-day-btn ${freq.days.includes(d) ? 'active' : ''}" onclick="updateFrequencyDay('${freq.id}','${d}')">${d.substring(0,2)}</button>`).join('');
            const hasPlanes = freq.assignedPlanes.length > 0;
            const planeTagsHtml = hasPlanes ? freq.assignedPlanes.map(pid => { const p = gameState.fleet.find(pl => pl.id === pid); return p ? `<span class="rt-plane-tag"><i class="ph-light ph-airplane-tilt"></i>${p.registration}</span>` : ''; }).join('') : '';
            return `
                <div class="rt-freq-row" style="animation: rt-fade-up ${0.1 + idx * 0.06}s cubic-bezier(0.2,0.8,0.2,1) both;">
                    <div class="rt-freq-row-header">
                        <div class="rt-freq-row-title">
                            <span class="rt-freq-num-badge">${idx + 1}</span>
                            <div class="rt-fnum-input-group">
                                <input type="text" class="rt-fnum-code" value="${freq.flightCode || 'AR'}" maxlength="3" onchange="updateFrequencyFlightCode('${freq.id}',this.value)">
                                <input type="text" class="rt-fnum-num" value="${freq.flightNumber || ''}" maxlength="4" placeholder="1234" onchange="updateFrequencyFlightNumber('${freq.id}',this.value)">
                            </div>
                        </div>
                        <button class="rt-btn-secondary rt-btn-sm" onclick="deleteFrequency('${freq.id}')"><i class="ph ph-x"></i></button>
                    </div>
                    <div class="rt-freq-row-body">
                        <div class="rt-freq-schedule">
                            <div class="rt-sched-leg">
                                <span class="rt-sched-dir"><i class="ph ph-arrow-up-right" style="color:#0a84ff;"></i> IDA</span>
                                <input type="time" class="rt-select rt-sched-time-input" value="${freq.time}" onchange="updateFrequencyTime('${freq.id}',this.value)">
                                <div style="display:flex;gap:4px;flex-wrap:wrap;">${daysHtml}</div>
                            </div>
                        </div>
                        <div class="rt-freq-row-opts">
                            <div class="rt-row-opt">
                                <span class="rt-opt-label"><i class="ph ph-coffee"></i> Catering</span>
                                <select class="rt-select" onchange="updateFrequencyCatering('${freq.id}', this.value)">
                                    <option value="none" ${freq.catering === 'none' || !freq.catering ? 'selected' : ''}>Sin Catering</option>
                                    <option value="low_cost" ${freq.catering === 'low_cost' ? 'selected' : ''}>Low Cost (-$5/pax)</option>
                                    <option value="standard" ${freq.catering === 'standard' ? 'selected' : ''}>Est\u00E1ndar (-$15/pax)</option>
                                    <option value="luxury" ${freq.catering === 'luxury' ? 'selected' : ''}>Lujoso (-$40/pax)</option>
                                </select>
                            </div>
                            <div class="rt-row-opt">
                                <span class="rt-opt-label"><i class="ph ph-airplane"></i> Aeronaves</span>
                                <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;">
                                    ${planeTagsHtml}
                                    <button class="rt-btn-secondary rt-btn-sm" onclick="openPlaneSelector('${freq.id}')">${hasPlanes ? 'Modificar' : 'Asignar aeronaves'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');

        view.innerHTML = `
            <div class="rt-shell">
                <div class="rt-wiz-flat-header">
                    <div class="rt-wiz-flat-icon"><i class="ph ph-map-pin-plus"></i></div>
                    <div><div class="rt-wiz-title">Planificar Nueva Ruta</div><div class="rt-wiz-title-sub">Defin\u00ED destino, horarios y aeronaves</div></div>
                </div>
                <div class="rt-form-group">
                    <label class="rt-wiz-label">Aeropuerto de Destino</label>
                    <select class="rt-select rt-select-lg" id="route-destination-new" onchange="routeCreationState.destinationId = this.value; renderRoutes()">
                        ${destOptions}
                    </select>
                    ${dist || weatherHtml ? `<div class="rt-wiz-info-row">${dist ? `<div class="rt-wiz-info-chip"><i class="ph ph-ruler"></i>${dist} km</div>` : ''}${weatherHtml}</div>` : ''}
                </div>
                ${routeCreationState.destinationId ? `
                    <div class="rt-section-divider" style="margin-top:4px;">
                        <span class="rt-section-label">Frecuencias Semanales</span>
                        <button class="rt-btn-secondary" onclick="addFrequencyToRoute()" style="font-size:0.72rem;"><i class="ph ph-plus"></i> A\u00F1adir</button>
                    </div>
                    ${routeCreationState.frequencies.length === 0
                        ? `<div class="rt-empty" style="padding:28px 20px;"><div class="rt-empty-icon"><i class="ph ph-calendar-plus"></i></div><p>A\u00F1ad\u00ED al menos una frecuencia para operar esta ruta.</p></div>`
                        : `<div class="rt-freq-list">${freqRowsHtml}</div>`}
                ` : `<div class="rt-empty" style="padding:28px 20px;"><div class="rt-empty-icon"><i class="ph ph-map-pin-line"></i></div><p>Selecci\u00F3n\u00E1 un destino para configurar las frecuencias.</p></div>`}
                ${routeCreationState.destinationId && routeCreationState.frequencies.length > 0 ? `<div class="rt-wiz-flat-footer"><button class="rt-btn-primary" onclick="finalizeRouteCreation()"><i class="ph ph-check-circle"></i> Activar Ruta</button></div>` : ''}
            </div>`;
        return;
    }

    /* ROUTES LIST */
    if (window.setHeaderBack) window.setHeaderBack(() => switchTab('flights'), 'a Vuelos');
    const routes = gameState.routes || [];
    const baseId = gameState.base ? gameState.base.id : '---';
    let listContent = '';
    if (routes.length === 0) {
        listContent = `<div class="rt-empty"><div class="rt-empty-icon"><i class="ph ph-map-trifold"></i></div><p>Sin rutas operativas activas</p><span class="rt-empty-hint">Cre\u00E1 tu primera ruta para comenzar a operar vuelos desde tu hub.</span><button class="rt-btn-primary" onclick="startRouteCreation()" style="margin-top:8px;"><i class="ph ph-plus"></i> Crear ruta</button></div>`;
    } else {
        routes.forEach((route, i) => {
            if (!route) return;
            const dest = AIRPORTS.find(a => a.id === route.destinationId) || { id: '???', name: 'Desconocido' };
            const outboundCount = (route.frequencies || []).filter(f => !f.isReturn).length;
            const destCity = dest.name.split(',')[0];
            const hasPlanes = (route.frequencies || []).some(f => !f.isReturn && f.assignedPlanes && f.assignedPlanes.length > 0);
            const statusClass = hasPlanes ? 'rt-chip-status-ok' : 'rt-chip-status-warn';
            const statusLabel = hasPlanes ? 'Operativa' : 'Sin aeronave';
            listContent += `
                <div class="rt-row" onclick="viewRouteDetails('${route.id}')" style="animation: rt-fade-up ${0.08 + i * 0.05}s cubic-bezier(0.2,0.8,0.2,1) both;">
                    <div class="rt-row-route">
                        <span class="rt-iata">${baseId}</span>
                        <div class="rt-iata-connector"><div class="rt-iata-line"></div><i class="ph ph-caret-right rt-iata-arrow"></i><div class="rt-iata-line"></div></div>
                        <span class="rt-iata">${dest.id}</span>
                    </div>
                    <div class="rt-row-meta">
                        <span class="rt-meta-city">${destCity}</span>
                        <span class="rt-meta-dist">${route.distance} km</span>
                    </div>
                    <div class="rt-row-chips">
                        <span class="rt-chip rt-chip-freq"><i class="ph-bold ph-calendar"></i> ${outboundCount} frec${outboundCount !== 1 ? 's' : ''}</span>
                        <span class="rt-chip ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="rt-row-caret"><i class="ph ph-caret-right"></i></div>
                </div>`;
        });
    }
    view.innerHTML = `
        <div class="rt-shell">
            <div class="rt-page-header">
                <div class="rt-page-header-left">
                    <span class="rt-page-title">Rutas</span>
                    <span class="rt-page-subtitle">Hub ${baseId} &mdash; ${routes.length} ruta${routes.length !== 1 ? 's' : ''}</span>
                </div>
                ${routes.length > 0 ? `<button class="rt-btn-primary" onclick="startRouteCreation()"><i class="ph-bold ph-plus"></i> Nueva Ruta</button>` : ''}
            </div>
            <div class="rt-rows-container">${listContent}</div>
        </div>`;
};


const requestFerryFlightSilent = (planeId) => {
    const plane = gameState.fleet.find(p => p.id === planeId);
    if (!plane) return;
    if (plane.status !== 'idle') return;
    if (plane.location === gameState.base.id) return;
    
    const currentLoc = AIRPORTS.find(a => a.id === plane.location);
    if (!currentLoc) return;
    
    const dist = calculateDistance(currentLoc.lat, currentLoc.lng, gameState.base.lat, gameState.base.lng);
    const cost = Math.round(dist * 15);
    
    // Auto ferry incurs cost, but we don't block if money is low, we just let it go negative or take the hit
    // to prevent planes from being permanently lost without user intervention.
    gameState.money -= cost;
    plane.status = 'in_flight';
    
    const _m5022 = typeof plane !== 'undefined' && plane ? AIRCRAFT_MODELS.find(m=>m.id===plane.modelId||m.name===plane.modelId) : null;
    const durationHours = dist / getAircraftSpeed(_m5022);
    const durationMinutes = Math.round(durationHours * 60);
    const nowAbs = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
    const arrAbs = nowAbs + durationMinutes;
    
    gameState.activeDispatches.push({
        id: Math.random().toString(36).substr(2, 9),
        routeId: null,
        freqId: null,
        destinationId: gameState.base.id,
        destName: gameState.base.name,
        planeId: plane.id,
        modelId: plane.name,
        status: 'in_flight',
        delayMins: 0,
        departureDay: gameState.time.day,
        departureHour: gameState.time.hour,
        departureMinute: gameState.time.minute,
        arrivalDay: Math.floor(arrAbs / (24 * 60)),
        arrivalHour: Math.floor((arrAbs % (24 * 60)) / 60),
        arrivalMinute: arrAbs % 60,
        isFerry: true,
        actualDepartureAbs: nowAbs,
        flightNumberStr: 'Ferry (Auto)'
    });
    
    if(!isCatchingUp) {
        logMsg(`[AUTO-RECOVERY] Vuelo Ferry iniciado automáticamente para el avión ${plane.registration} desde ${currentLoc.name}.`);
        if(gameState.currentTab === 'flights') renderFlights();
        if(gameState.currentTab === 'fleet') renderFleet();
    }
};

window.requestFerryFlight = (planeId) => {
    const plane = gameState.fleet.find(p => p.id === planeId);
    if (!plane) return;
    if (plane.status !== 'idle') return;
    if (plane.location === gameState.base.id) return;
    
    const currentLoc = AIRPORTS.find(a => a.id === plane.location);
    if (!currentLoc) return;
    
    const dist = calculateDistance(currentLoc.lat, currentLoc.lng, gameState.base.lat, gameState.base.lng);
    const cost = Math.round(dist * 15);
    
    if (!confirm(`Un Vuelo Ferry desde ${currentLoc.id} hasta ${gameState.base.id} costará $${formatMoney(cost)}. ¿Proceder?`)) return;
    
    if (gameState.money < cost) {
        showToast('Fondos Insuficientes', `Necesitas $${formatMoney(cost)}.`, 'error');
        return;
    }
    
    gameState.money -= cost;
    plane.status = 'in_flight';
    
    const _m5022 = typeof plane !== 'undefined' && plane ? AIRCRAFT_MODELS.find(m=>m.id===plane.modelId||m.name===plane.modelId) : null;
    const durationHours = dist / getAircraftSpeed(_m5022);
    const durationMinutes = Math.round(durationHours * 60);
    const nowAbs = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
    const arrAbs = nowAbs + durationMinutes;
    
    gameState.activeDispatches.push({
        id: Math.random().toString(36).substr(2, 9),
        routeId: null,
        freqId: null,
        destinationId: gameState.base.id,
        destName: gameState.base.name,
        planeId: plane.id,
        modelId: plane.name,
        status: 'in_flight',
        delayMins: 0,
        departureDay: gameState.time.day,
        departureHour: gameState.time.hour,
        departureMinute: gameState.time.minute,
        arrivalDay: Math.floor(arrAbs / (24 * 60)),
        arrivalHour: Math.floor((arrAbs % (24 * 60)) / 60),
        arrivalMinute: arrAbs % 60,
        isFerry: true,
        profit: -cost
    });
    
    logMsg(`Vuelo Ferry autorizado: ${plane.registration} hacia ${gameState.base.id}. Costo: -$${formatMoney(cost)}.`);
    showToast('Ferry Solicitado', `Reposicionando al Hub`, 'success');
    
    updateUI();
    if(gameState.currentTab === 'flights') renderFlights();
    if(gameState.currentTab === 'fleet') renderFleet();
    saveGame();
};

window.computeTrueDelay = (flight, nowAbs) => {
    if (flight.type === 'scheduled' || flight.type === 'stub') return 0;
    const obj = flight.obj;
    if (!obj) return flight.delayMins || 0;
    
    let trueDelay = 0;
    const origSched = obj.originalSchedAbs !== undefined ? obj.originalSchedAbs : (obj.schedAbs || 0);

    if (flight.type === 'delayed' || flight.type === 'delayed_weather') {
        trueDelay = Math.max(0, nowAbs - origSched);
        if (flight.type === 'delayed_weather') {
            if (obj.actualDepartureAbs && obj.actualDepartureAbs > nowAbs) {
                trueDelay = obj.actualDepartureAbs - origSched;
            }
        }
    } else if (flight.type === 'boarding' || flight.type === 'in_flight' || flight.type === 'completed') {
        let actualDep = obj.actualDepartureAbs;
        if (actualDep === undefined) {
            if (obj.departureDay !== undefined) actualDep = obj.departureDay * 24 * 60 + obj.departureHour * 60 + obj.departureMinute;
            else actualDep = origSched + Math.max(0, obj.delayMins || 0);
        }
        trueDelay = actualDep - origSched;
    }
    return trueDelay;
};

window.computeDelayBreakdown = (flight, trueTotalDelay) => {
    let breakdown = [];
    const baseDelay = (flight.obj ? flight.obj.delayMins : flight.delayMins) || 0;
    
    if (baseDelay > 0) breakdown.push({ reason: 'Congestión ATC / Tránsito', mins: baseDelay });
    else if (baseDelay < 0) breakdown.push({ reason: 'Adelanto Operativo', mins: baseDelay });

    const extraDelay = trueTotalDelay - Math.max(0, baseDelay);
    if (extraDelay > 0) {
        const reason = flight.obj ? (flight.obj.reason || flight.obj.delayReason) : null;
        if (flight.type === 'delayed_weather' || (flight.obj && flight.obj.status === 'delayed_weather') || reason === 'weather') {
            breakdown.push({ reason: 'Clima Adverso', mins: extraDelay });
        } else if (reason === 'fuel') {
            breakdown.push({ reason: 'Falta Combustible', mins: extraDelay });
        } else if (reason === 'plane') {
            breakdown.push({ reason: 'Aeronave No Disponible', mins: extraDelay });
        } else {
            breakdown.push({ reason: 'Demora Operativa', mins: extraDelay });
        }
    }
    return breakdown;
};

const renderFlights = () => {
    const flightsView = document.getElementById('view-flights');
    if (!flightsView) return;

    let allFlights = [];
    const nowAbs = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;

    const getDestId = (routeId) => {
        const r = gameState.routes.find(r => r.id === routeId);
        return r ? r.destinationId : '---';
    };

    const delayedFlights = gameState.activeDispatches.filter(d => d.status === 'delayed');
    const activeFl = gameState.activeDispatches.filter(d => d.status === 'in_flight');
    const boardingFl = gameState.activeDispatches.filter(d => d.status === 'boarding');
    const weatherDelayedFl = gameState.activeDispatches.filter(d => d.status === 'delayed_weather');
    
    const completedFl = gameState.activeDispatches.filter(d => d.status === 'completed');
    
    const canceledFl = gameState.activeDispatches.filter(d => d.status === 'canceled');
    canceledFl.forEach(d => {
        const plane = gameState.fleet.find(p => p.id === d.planeId);
        const depAbs = d.schedAbs || d.originalSchedAbs || nowAbs;
        allFlights.push({
            type: 'canceled',
            id: d.id,
            destId: d.isFerry ? d.destinationId : getDestId(d.routeId),
            destName: d.destName,
            planeReg: plane ? plane.registration : '---',
            planeModel: plane ? plane.name : '---',
            profit: d.profit || 0,
            passengers: d.passengers || 0,
            depTimeStr: formatTime(Math.floor((depAbs % (24 * 60)) / 60), depAbs % 60),
            arrTimeStr: '--:--',
            status: 'Cancelado',
            dayGroup: Math.floor(depAbs / (24 * 60)),
            sortKey: 5,
            absTime: depAbs,
            progress: 100,
            obj: d
        });
    });


    const calculateArrivalStr = (routeId, depTimeStr, modelId) => {
        if (!depTimeStr || depTimeStr === '--:--') return '--:--';
        const r = gameState.routes.find(ro => ro.id === routeId);
        if (!r) return '--:--';
        const parts = depTimeStr.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) return '--:--';
        const depAbs = h * 60 + m;
        const _m5132 = typeof modelId !== 'undefined' && modelId ? AIRCRAFT_MODELS.find(m=>m.id===modelId||m.name===modelId) : null;
        const durationHours = r.distance / getAircraftSpeed(_m5132);
        const durationMinutes = Math.round(durationHours * 60);
        const arrAbs = depAbs + durationMinutes;
        return formatTime(Math.floor(arrAbs / 60) % 24, arrAbs % 60);
    };

    // 1. Vuelos Atrasados
    delayedFlights.forEach(d => {
        const plane = gameState.fleet.find(p => p.id === d.planeId);
        allFlights.push({
            type: 'delayed',
            id: d.id,
            destId: getDestId(d.routeId),
            destName: d.destName,
            planeReg: plane ? plane.registration : '---',
            planeModel: plane ? plane.name : 'Sin Asignar',
            depTimeStr: d.reqTime, 
            arrTimeStr: calculateArrivalStr(d.routeId, d.reqTime, typeof plane !== 'undefined' && plane ? plane.modelId : d.modelId),
            status: d.reason === 'fuel' ? 'Sin Combustible' : 'Atrasado',
            dayGroup: -1,
            sortKey: 0,
            absTime: 0,
            progress: 0,
            delayMins: d.delayMins || 0,
            obj: d
        });
    });

    // 1.5 Vuelos Demorados por Clima
    weatherDelayedFl.forEach(d => {
        const plane = gameState.fleet.find(p => p.id === d.planeId);
        allFlights.push({
            type: 'delayed_weather',
            id: d.id,
            destId: getDestId(d.routeId),
            destName: d.destName,
            planeReg: plane ? plane.registration : '---',
            planeModel: plane ? plane.name : 'Sin Asignar',
            depTimeStr: d.reqTime, 
            arrTimeStr: calculateArrivalStr(d.routeId, d.reqTime, typeof plane !== 'undefined' && plane ? plane.modelId : d.modelId),
            status: 'Demorado (Clima)',
            dayGroup: -1,
            sortKey: 1,
            absTime: 0,
            progress: 0,
            delayMins: d.delayMins || 0,
            obj: d
        });
    });

    // 2. Vuelos en Curso
    activeFl.forEach(d => {
        const plane = gameState.fleet.find(p => p.id === d.planeId);
        
        const depAbs = d.departureDay * 24 * 60 + d.departureHour * 60 + d.departureMinute;
        const arrAbs = d.arrivalDay * 24 * 60 + d.arrivalHour * 60 + d.arrivalMinute;
        const total = arrAbs - depAbs;
        const elapsed = nowAbs - depAbs;
        const progress = total <= 0 ? 100 : Math.min(100, Math.max(0, (elapsed / total) * 100));
        
        allFlights.push({
            type: 'in_flight',
            id: d.id,
            destId: d.isFerry ? d.destinationId : getDestId(d.routeId),
            destName: d.destName,
            planeReg: plane ? plane.registration : '---',
            planeModel: plane ? plane.name : '---',
            profit: d.profit || 0,
            passengers: d.passengers,
            depTimeStr: formatTime(d.departureHour, d.departureMinute),
            arrTimeStr: formatTime(d.arrivalHour, d.arrivalMinute),
            status: d.isFerry ? 'Vuelo Ferry' : 'En vuelo',
            dayGroup: d.departureDay,
            sortKey: 1,
            absTime: depAbs,
            progress: progress,
            delayMins: d.delayMins || 0,
            obj: d
        });
    });

    // 2.7 Vuelos Completados
    completedFl.forEach(d => {
        const plane = gameState.fleet.find(p => p.id === d.planeId);
        const depAbs = d.departureDay * 24 * 60 + d.departureHour * 60 + d.departureMinute;
        allFlights.push({
            type: 'completed',
            id: d.id,
            destId: d.isFerry ? d.destinationId : getDestId(d.routeId),
            destName: d.destName,
            planeReg: plane ? plane.registration : '---',
            planeModel: plane ? plane.name : '---',
            profit: d.profit || 0,
            passengers: d.passengers,
            depTimeStr: formatTime(d.departureHour, d.departureMinute),
            arrTimeStr: formatTime(d.arrivalHour, d.arrivalMinute),
            status: 'Completado',
            dayGroup: d.departureDay,
            sortKey: 4,
            absTime: depAbs,
            progress: 100,
            obj: d
        });
    });

    // 2.5 Vuelos Embarcando
    boardingFl.forEach(d => {
        const plane = gameState.fleet.find(p => p.id === d.planeId);
        allFlights.push({
            type: 'boarding',
            id: d.id,
            destId: getDestId(d.routeId),
            destName: d.destName,
            planeReg: plane ? plane.registration : '---',
            planeModel: plane ? plane.name : '---',
            depTimeStr: d.reqTime || '--:--',
            arrTimeStr: calculateArrivalStr(d.routeId, d.reqTime, typeof plane !== 'undefined' && plane ? plane.modelId : d.modelId),
            status: 'Embarcando',
            dayGroup: d.schedAbs ? Math.floor(d.schedAbs / (24 * 60)) : gameState.time.day,
            sortKey: 0.5,
            absTime: d.schedAbs || 0,
            progress: 0,
            delayMins: d.delayMins || 0,
            obj: d
        });
    });

    // 3. Vuelos Programados
    if (gameState.routes) {
        gameState.routes.forEach(route => {
            if (!route) return;
            const dest = AIRPORTS.find(a => a.id === route.destinationId) || { id: '???', name: '?' };
            (route.frequencies || []).forEach(freq => {
                let nextD = -1;
                let nextHour = 0;
                let nextMinute = 0;
                let minAbs = Infinity;
                
                const parts = freq.time.split(':');
                const fH = parseInt(parts[0], 10);
                const fM = parseInt(parts[1], 10);
                
                for (let i = 0; i < 7; i++) {
                    const checkDay = gameState.time.day + i;
                    const dayName = getDayName(checkDay);
                    if (freq.days.includes(dayName)) {
                        const checkAbs = checkDay * 24 * 60 + fH * 60 + fM;
                        if (checkAbs >= nowAbs && checkAbs < minAbs) {
                            const isActive = gameState.activeDispatches.some(d => d.freqId === freq.id && (d.schedAbs === checkAbs || (!d.schedAbs && d.status === 'in_flight' && (d.departureDay * 24 * 60 + d.departureHour * 60 + d.departureMinute) === checkAbs)));
                            const isDone = gameState.flightHistory && gameState.flightHistory.some(h => h.freqId === freq.id && (h.originalSchedAbs === checkAbs || h.schedAbs === checkAbs));
                            const isDelayed = delayedFlights.some(f => f.freqId === freq.id);
                            
                            if (!isActive && !isDone) {
                                minAbs = checkAbs;
                                nextD = checkDay;
                                nextHour = fH;
                                nextMinute = fM;
                            }
                        }
                    }
                }
                
                if (minAbs !== Infinity) {
                    const model = AIRCRAFT_MODELS.find(m => m.id === freq.modelId);
                    const assignedPlaneId = freq.assignedPlanes && freq.assignedPlanes.length > 0 ? freq.assignedPlanes[0] : null;
                    const assignedPlane = assignedPlaneId ? gameState.fleet.find(p => p.id === assignedPlaneId) : null;
                    allFlights.push({
                        type: 'scheduled',
                        id: freq.id,
                        destId: dest.id,
                        destName: dest.name,
                        planeReg: assignedPlane ? assignedPlane.registration : 'A Asignar',
                        planeModel: model ? model.name : '---',
                        planeId: assignedPlane ? assignedPlane.id : null,
                        depTimeStr: formatTime(nextHour, nextMinute),
                        arrTimeStr: calculateArrivalStr(route.id, formatTime(nextHour, nextMinute), freq ? freq.modelId : null), 
                        status: 'Programado',
                        dayGroup: nextD,
                        sortKey: 2,
                        absTime: minAbs,
                        progress: 0,
                        obj: { routeId: route.id, freqId: freq.id, isReturn: freq.isReturn || false }
                    });
                }
            });
        });
    }

    // Agrupar en RoundTrips
    allFlights.forEach(f => {
        if (f.obj && f.obj.routeId && f.obj.freqId) {
            const r = gameState.routes.find(ro => ro.id === f.obj.routeId);
            const fr = r ? r.frequencies.find(freq => freq.id === f.obj.freqId) : null;
            if (fr) {
                f.flightNumberStr = (fr.flightCode || 'AR') + ' ' + (fr.flightNumber || '');
            } else {
                f.flightNumberStr = 'Ferry';
            }
        } else {
            f.flightNumberStr = 'Ferry';
        }
    });
    window.currentDisplayedFlights = allFlights;
    const roundTrips = {};
    const ferryFlights = [];

    allFlights.forEach(f => {
        if (f.type === 'in_flight' && f.obj && f.obj.isFerry) {
            ferryFlights.push(f);
            return;
        }

        const routeId = f.obj && f.obj.routeId ? f.obj.routeId : null;
        let freqId = f.obj && f.obj.freqId ? f.obj.freqId : null;
        if (!routeId || !freqId) {
            ferryFlights.push(f);
            return;
        }

        const r = gameState.routes.find(ro => ro.id === routeId);
        const freq = r ? r.frequencies.find(fr => fr.id === freqId) : null;

        if (freq) {
            let outFreqId = freq.id;
            if (freq.isReturn) {
                outFreqId = freq.pairedWith;
                if (!outFreqId) {
                    const paired = r.frequencies.find(fr => fr.id !== freq.id && !fr.isReturn);
                    outFreqId = paired ? paired.id : freq.id;
                }
            } else {
                if (!freq.pairedWith) {
                    const paired = r.frequencies.find(fr => fr.id !== freq.id && fr.isReturn);
                    if (paired) freq.pairedWith = paired.id;
                }
            }

            let schedAbs = f.absTime;
            if (f.obj && f.obj.originalSchedAbs) schedAbs = f.obj.originalSchedAbs;
            else if (f.obj && f.obj.schedAbs) schedAbs = f.obj.schedAbs;
            
            let outDay = f.dayGroup;
            if (schedAbs) {
                if (freq.isReturn) {
                    let offsetMins = 0;
                    const outFreq = r.frequencies.find(fr => fr.id === outFreqId);
                    if (outFreq) {
                        const model = AIRCRAFT_MODELS.find(m => m.id === outFreq.modelId || m.name === outFreq.modelId);
                        const durationHours = r.distance / getAircraftSpeed(model);
                        const durationMinutes = Math.round(durationHours * 60);
                        const turnaroundMins = getTurnaroundMins(model);
                        const bufferMins = getScheduleBufferMins(durationMinutes);
                        let boardingMins = 30;
                        if (model) {
                            if (model.capacity > 200) boardingMins = 45;
                            else if (model.capacity < 100) boardingMins = 20;
                        }
                        offsetMins = durationMinutes + turnaroundMins + bufferMins + boardingMins + 30;
                    }
                    outDay = Math.floor((schedAbs - offsetMins) / (24 * 60));
                } else {
                    outDay = Math.floor(schedAbs / (24 * 60));
                }
            }

            const opId = `${routeId}_${outFreqId}_${outDay >= 0 ? outDay : ''}`;
            
            if (!roundTrips[opId]) {
                roundTrips[opId] = { opId: opId, outbound: null, return: null, sortTime: Infinity, dayGroup: outDay >= 0 ? outDay : 0, needsAttention: false, isActiveNow: false };
            }
            
            if (f.type === 'delayed' || f.type === 'delayed_weather') {
                roundTrips[opId].needsAttention = true;
            }
            if (f.type === 'in_flight' || f.type === 'boarding') {
                roundTrips[opId].isActiveNow = true;
            }

            if (freq.isReturn) {
                if (!roundTrips[opId].return || f.absTime < roundTrips[opId].return.absTime) {
                    roundTrips[opId].return = f;
                }
            } else {
                if (!roundTrips[opId].outbound || f.absTime < roundTrips[opId].outbound.absTime) {
                    roundTrips[opId].outbound = f;
                }
            }

            if (f.absTime < roundTrips[opId].sortTime) {
                roundTrips[opId].sortTime = f.absTime;
            }
        } else {
            ferryFlights.push(f);
        }
    });

    Object.values(roundTrips).forEach(rt => {
        if (rt.needsAttention) rt.dayGroup = -1;
        else if (rt.isActiveNow) rt.dayGroup = gameState.time.day;
        if (rt.return && !rt.outbound) {
            const r = gameState.routes.find(ro => ro.id === rt.return.obj.routeId);
            const nowAbsForHist = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
            const histOut = gameState.flightHistory ? gameState.flightHistory.find(h => !h.isReturn && h.routeId === rt.return.obj.routeId && h.planeReg === rt.return.planeReg && (h.timestamp > nowAbsForHist - 86400000)) : null;
            const isOutCanceled = histOut && histOut.isCanceled;
            rt.outbound = {
                type: isOutCanceled ? 'canceled' : 'completed',
                id: 'hist_' + rt.return.id,
                destId: r ? r.destinationId : 'DEST',
                destName: rt.return.destName,
                planeReg: rt.return.planeReg,
                planeModel: rt.return.planeModel,
                depTimeStr: '--:--',
                arrTimeStr: '--:--',
                status: isOutCanceled ? 'Cancelado' : 'Completado',
                progress: 100,
                obj: { isReturn: false }
            };
            window.currentDisplayedFlights.push(rt.outbound);
        } else if (rt.outbound && !rt.return) {
            const nowAbsForHist2 = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
            const histRet = gameState.flightHistory ? gameState.flightHistory.find(h => h.isReturn && h.routeId === rt.outbound.obj.routeId && h.planeReg === rt.outbound.planeReg && (h.timestamp > nowAbsForHist2 - 86400000)) : null;
            const isRetCanceled = histRet && histRet.isCanceled;
            rt.return = {
                type: isRetCanceled ? 'canceled' : 'stub',
                id: isRetCanceled ? 'hist_' + rt.outbound.id : 'stub_' + rt.outbound.id,
                destId: 'BUE',
                destName: 'Hub',
                planeReg: rt.outbound.planeReg,
                planeModel: rt.outbound.planeModel,
                depTimeStr: '--:--',
                arrTimeStr: '--:--',
                status: isRetCanceled ? 'Cancelado' : 'Próximamente',
                progress: isRetCanceled ? 100 : 0,
                obj: { isReturn: true }
            };
            window.currentDisplayedFlights.push(rt.return);
        }

        if (rt.outbound && rt.return && (rt.return.type === 'stub' || rt.return.type === 'scheduled')) {
            let outDelayMins = rt.outbound.delayMins || 0;
            if (rt.outbound.obj) {
                if (rt.outbound.obj.totalDelayMins !== undefined) {
                    outDelayMins = rt.outbound.obj.totalDelayMins;
                } else if (rt.outbound.type === 'canceled') {
                    outDelayMins = 0;
                } else if (rt.outbound.type === 'delayed' || rt.outbound.type === 'delayed_weather') {
                    const nowAbs = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
                    outDelayMins = Math.max(0, nowAbs - rt.outbound.obj.originalSchedAbs);
                } else if (rt.outbound.type === 'boarding' || rt.outbound.type === 'in_flight') {
                    outDelayMins = Math.max(0, (rt.outbound.obj.actualDepartureAbs || rt.outbound.absTime) - rt.outbound.obj.originalSchedAbs);
                }
            }

            if (outDelayMins > 0 || rt.return.type === 'stub') {
                const r = gameState.routes.find(ro => ro.id === (rt.outbound.obj ? rt.outbound.obj.routeId : null));
                if (r) {
                    const model = AIRCRAFT_MODELS.find(m => m.id === rt.outbound.planeModel || m.name === rt.outbound.planeModel);
                    const durationHours = r.distance / getAircraftSpeed(model);
                    const durationMinutes = Math.round(durationHours * 60);
                    const turnaroundMins = getTurnaroundMins(model);

                    let originalSchedAbs = rt.outbound.obj ? rt.outbound.obj.originalSchedAbs : null;
                    if (!originalSchedAbs) originalSchedAbs = rt.outbound.absTime;

                    const bufferMins = getScheduleBufferMins(durationMinutes);
                    
                    let boardingMins = 30;
                    if (model) {
                        if (model.capacity > 200) boardingMins = 45;
                        else if (model.capacity < 100) boardingMins = 20;
                    }

                    let originalReturnDepAbs = originalSchedAbs + durationMinutes + turnaroundMins + bufferMins + boardingMins;
                    const remO = originalReturnDepAbs % 30;
                    if (remO !== 0) originalReturnDepAbs += (30 - remO);

                    let earliestPossibleDepAbs = originalSchedAbs + outDelayMins + durationMinutes + turnaroundMins + boardingMins;
                    const remE = earliestPossibleDepAbs % 30;
                    if (remE !== 0) earliestPossibleDepAbs += (30 - remE);
                    
                    let estReturnDepAbs = originalReturnDepAbs;
                    let returnDelayMins = 0;
                    
                    if (earliestPossibleDepAbs > originalReturnDepAbs) {
                        estReturnDepAbs = earliestPossibleDepAbs;
                        returnDelayMins = earliestPossibleDepAbs - originalReturnDepAbs;
                    }

                    const estReturnArrAbs = estReturnDepAbs + durationMinutes;

                    rt.return.depTimeStr = formatTime(Math.floor(estReturnDepAbs / 60) % 24, estReturnDepAbs % 60);
                    rt.return.arrTimeStr = formatTime(Math.floor(estReturnArrAbs / 60) % 24, estReturnArrAbs % 60);
                    rt.return.delayMins = returnDelayMins;

                    if (returnDelayMins > 3 && rt.return.type === 'stub') {
                        rt.return.status = 'Est: ' + rt.return.depTimeStr;
                    } else if (rt.return.type === 'stub') {
                        rt.return.status = 'Prog: ' + rt.return.depTimeStr;
                    }
                }
            }
        }
    });

    const groups = {};
    const nowAbsGroup = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
    Object.values(roundTrips).forEach(rt => {
        if (rt.outbound && rt.outbound.type === 'completed' && rt.return && rt.return.type === 'completed') {
            const retObj = rt.return.obj;
            if (retObj && retObj.arrivalDay !== undefined) {
                const arrAbs = retObj.arrivalDay * 24 * 60 + retObj.arrivalHour * 60 + retObj.arrivalMinute;
                if (nowAbsGroup >= arrAbs + 60) return; // Skip if fully completed for >= 1 hour
            }
        }
        if (!groups[rt.dayGroup]) groups[rt.dayGroup] = [];
        groups[rt.dayGroup].push({ isRoundTrip: true, rt: rt, sortTime: rt.sortTime });
    });
    ferryFlights.forEach(f => {
        if (f.type === 'completed' && f.obj && f.obj.arrivalDay !== undefined) {
            const arrAbs = f.obj.arrivalDay * 24 * 60 + f.obj.arrivalHour * 60 + f.obj.arrivalMinute;
            if (nowAbsGroup >= arrAbs + 60) return; // Skip if completed for >= 1 hour
        }
        if (!groups[f.dayGroup]) groups[f.dayGroup] = [];
        groups[f.dayGroup].push({ isRoundTrip: false, f: f, sortTime: f.absTime });
    });

    const sortedDays = Object.keys(groups).map(Number).sort((a, b) => a - b);
    let nextScheduledFound = false;

    let boardHtml = '';
    if (allFlights.length === 0) {
        boardHtml = `
            <div class="flv-empty">
                <i class="ph ph-airplane-tilt"></i>
                <p>Sin operaciones registradas.</p>
                <button class="flv-empty-btn" onclick="switchTab('routes')">Crear ruta</button>
            </div>
        `;
    } else {
        sortedDays.forEach(day => {
            const flightsInDay = groups[day];
            flightsInDay.sort((a, b) => a.sortTime - b.sortTime);

            let dayLabel = `Día ${day}`;
            let isAttention = false;
            if (day === -1) {
                dayLabel = `<span class="flv-day-alert"><i class="ph ph-warning"></i> Atención requerida</span>`;
                isAttention = true;
            }
            else if (day === gameState.time.day) dayLabel = 'Hoy';
            else if (day === gameState.time.day + 1) dayLabel = 'Mañana';

            if (isAttention) {
                boardHtml += `
                <div class="flv-day-label" style="display: flex; justify-content: space-between; align-items: center;">
                    ${dayLabel}
                    <button class="btn btn-danger-subtle btn-sm" onclick="cancelAllAttentionFlights()" style="padding: 4px 8px; font-size: 0.75rem;"><i class="ph ph-x"></i> Cancelar todos</button>
                </div>`;
            } else {
                boardHtml += `<div class="flv-day-label">${dayLabel}</div>`;
            }
            boardHtml += `<div class="flv-group">`;

            const formatDelay = (type, mins) => {
                if (type === 'scheduled' || type === 'stub') return '';
                if (mins === 0) return `<span class="flv-delay-badge none">0m</span>`;
                if (mins < 0) return `<span class="flv-delay-badge on-time">${mins}m</span>`;
                if (mins <= 15) return `<span class="flv-delay-badge on-time">+${mins}m</span>`;
                if (mins <= 30) return `<span class="flv-delay-badge delay-minor">+${mins}m</span>`;
                if (mins <= 60) return `<span class="flv-delay-badge delay-moderate">+${mins}m</span>`;
                return `<span class="flv-delay-badge delay-severe">+${mins}m</span>`;
            };

            flightsInDay.forEach(item => {
                if (!item.isRoundTrip) {
                    const f = item.f;
                    let statusColor = '#8e8e93', statusLabel = f.status;
                    if (f.type === 'delayed' || f.type === 'delayed_weather') {
                        let mins = window.computeTrueDelay(f, nowAbs);
                        if (mins <= 15) statusColor = '#30d158';
                        else if (mins <= 30) statusColor = '#ffd60a';
                        else if (mins <= 60) statusColor = '#ff9f0a';
                        else statusColor = '#d32f2f';
                    }
                    else if (f.type === 'boarding' || f.type === 'in_flight') {
                        let mins = f.delayMins || 0;
                        if (mins <= 15) statusColor = '#0a84ff';
                        else if (mins <= 30) statusColor = '#ffd60a';
                        else if (mins <= 60) statusColor = '#ff9f0a';
                        else statusColor = '#d32f2f';
                    }
                    else if (f.type === 'completed') {
                        let mins = f.delayMins || (f.obj ? f.obj.totalDelayMins : 0) || 0;
                        if (mins <= 15) statusColor = '#30d158';
                        else if (mins <= 30) statusColor = '#ffd60a';
                        else if (mins <= 60) statusColor = '#ff9f0a';
                        else statusColor = '#d32f2f';
                    }
                    else if (f.type === 'canceled') {
                        statusColor = '#d32f2f';
                    }

                    const originCode = f.obj && f.obj.isReturn ? f.destId : (gameState.base ? gameState.base.id : 'HUB');
                    const destCode   = f.obj && f.obj.isReturn ? (gameState.base ? gameState.base.id : 'HUB') : f.destId;

                    let actionsHtml = '';
                    if (f.type === 'delayed') {
                        actionsHtml = `<div class="flv-actions"><button class="flv-btn-retry" onclick="event.stopPropagation(); retryDelayedFlight('${f.id}')">Reintentar</button><button class="flv-btn-cancel" onclick="event.stopPropagation(); resolveDelayedFlight('${f.id}','cancel')"><i class="ph ph-x"></i></button></div>`;
                    } else if (f.type === 'delayed_weather') {
                        actionsHtml = `<span style="color:#ffd60a; font-size:0.75rem; margin-top:8px; display:block;"><i class="ph ph-cloud"></i> Esperando mejora...</span>`;
                    }

                    let fDelay = '';
                    if (f.type !== 'scheduled' && f.type !== 'stub') {
                        let mins = window.computeTrueDelay(f, nowAbs);
                        fDelay = formatDelay(f.type, mins);
                    }

                    boardHtml += `
                    <div class="flv-card flv-single ${f.type === 'in_flight' ? 'flv-active' : ''}">
                        <div class="flv-legs-wrap">
                            <div class="flv-leg ${f.type === 'completed' ? 'flv-leg-completed' : ''}" onclick="openFlightModal('${f.id}','${f.type}')">
                                <div class="flv-leg-top">
                                    <div class="flv-leg-tag-group">
                                        <div class="flv-leg-status-wrap">
                                            <span class="flv-status-dot" style="background:${statusColor};"></span>
                                            <span style="color:${statusColor};">${statusLabel}</span>
                                        </div>
                                    </div>
                                    <span style="font-size:0.7rem; color:var(--text-secondary); font-family:var(--font-mono);">${f.flightNumberStr === 'Ferry' ? 'Ferry' : f.flightNumberStr} &bull; ${f.planeModel}</span>
                                </div>
                                <div class="flv-leg-middle">
                                    <div class="flv-time-block">
                                        <span class="flv-city">${originCode}</span>
                                        <div class="flv-time">${f.depTimeStr} ${fDelay}</div>
                                    </div>
                                    <div class="flv-path">
                                        <div class="flv-path-line">
                                            ${f.type === 'in_flight' ? `<div class="flv-path-progress" style="width:${f.progress}%;"></div>` : (f.type === 'completed' ? `<div class="flv-path-progress" style="width:100%; background: #30d158;"></div>` : '')}
                                        </div>
                                    </div>
                                    <div class="flv-time-block right">
                                        <span class="flv-city">${destCode}</span>
                                        <div class="flv-time">${f.arrTimeStr}</div>
                                    </div>
                                </div>
                                ${actionsHtml}
                            </div>
                        </div>
                    </div>`;

                } else {
                    const rt = item.rt;
                    const out = rt.outbound;
                    const ret = rt.return;

                    const getLegColor = (f) => {
                        if (f.type === 'completed') return '#30d158';
                        if (f.type === 'stub' || f.type === 'scheduled') return '#8e8e93';
                        
                        if (f.type === 'delayed' || f.type === 'delayed_weather') {
                            let mins = window.computeTrueDelay(f, nowAbs);
                            if (mins <= 15) return '#30d158';
                            if (mins <= 30) return '#ffd60a';
                            if (mins <= 60) return '#ff9f0a';
                            return '#d32f2f';
                        }
                        if (f.type === 'boarding' || f.type === 'in_flight') {
                            let mins = f.delayMins || 0;
                            if (mins <= 15) return '#0a84ff';
                            if (mins <= 30) return '#ffd60a';
                            if (mins <= 60) return '#ff9f0a';
                            return '#d32f2f';
                        }
                        return '#8e8e93';
                    };
                    const getLegLabel = (f) => {
                        if (f.type === 'in_flight') return 'En vuelo';
                        if (f.type === 'boarding') return 'Embarcando';
                        if (f.type === 'delayed') return 'Atrasado';
                        if (f.type === 'delayed_weather') return 'Dem. Clima';
                        if (f.type === 'completed') return 'Completado';
                        if (f.type === 'stub') return f.status || 'Próximamente';
                        return f.status || 'Programado';
                    };

                    window.rtCardsState = window.rtCardsState || {};
                    let isExpanded = false;
                    if (window.rtCardsState[rt.opId] !== undefined) {
                        isExpanded = window.rtCardsState[rt.opId];
                    }

                    const outColor = getLegColor(out);
                    const retColor = getLegColor(ret);
                    const outLabel = getLegLabel(out);
                    const retLabel = getLegLabel(ret);

                    const originId = gameState.base ? gameState.base.id : 'HUB';
                    const destId2  = out.destId;

                    const outDelayMins = window.computeTrueDelay(out, nowAbs);
                    const outDelay = formatDelay(out.type, outDelayMins);
                    const retDelayMins = window.computeTrueDelay(ret, nowAbs);
                    const retDelay = formatDelay(ret.type, retDelayMins);

                    let outActions = '', retActions = '';
                    if (out.type === 'delayed') {
                        outActions = `<div class="flv-actions"><button class="flv-btn-retry" onclick="event.stopPropagation(); retryDelayedFlight('${out.id}')">Reintentar</button><button class="flv-btn-cancel" onclick="event.stopPropagation(); resolveDelayedFlight('${out.id}','cancel')"><i class="ph ph-x"></i></button></div>`;
                    } else if (out.type === 'delayed_weather') {
                        outActions = `<span style="color:#ffd60a; font-size:0.75rem; margin-top:8px; display:block;"><i class="ph ph-cloud"></i> Esperando...</span>`;
                    }
                    if (ret.type === 'delayed') {
                        retActions = `<div class="flv-actions"><button class="flv-btn-retry" onclick="event.stopPropagation(); retryDelayedFlight('${ret.id}')">Reintentar</button><button class="flv-btn-cancel" onclick="event.stopPropagation(); resolveDelayedFlight('${ret.id}','cancel')"><i class="ph ph-x"></i></button></div>`;
                    } else if (ret.type === 'delayed_weather') {
                        retActions = `<span style="color:#ffd60a; font-size:0.75rem; margin-top:8px; display:block;"><i class="ph ph-cloud"></i> Esperando...</span>`;
                    }

                    boardHtml += `
                    <div class="flv-card ${rt.needsAttention ? 'flv-attention' : ''} ${rt.isActiveNow ? 'flv-active' : ''}" data-opid-card="${rt.opId}">

                        <div class="flv-rt-header" onclick="toggleFlvCard(this)">
                            <div class="flv-rt-id">
                                <span class="flv-fnum">${out.flightNumberStr === 'Ferry' ? 'Ferry' : out.flightNumberStr}</span>
                                <span class="flv-plane-model">${out.planeModel}</span>
                            </div>
                            <div class="flv-rt-meta">
                                <span class="flv-rt-route">${originId} &harr; ${destId2}</span>
                                <div class="flv-rt-dots">
                                    <span class="flv-status-dot" style="background:${outColor};" title="${outLabel}"></span>
                                    <span class="flv-status-dot" style="background:${retColor};" title="${retLabel}"></span>
                                </div>
                                <i class="ph ph-caret-down flv-expand-icon" style="transform:${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
                            </div>
                        </div>

                        <div class="flv-legs-wrap" style="${isExpanded ? 'max-height: 500px; opacity: 1;' : 'max-height: 0px; opacity: 0;'}">

                            <div class="flv-leg ${out.type === 'completed' ? 'flv-leg-completed' : ''}" onclick="event.stopPropagation(); openFlightModal('${out.id}','${out.type}');">
                                <div class="flv-leg-top">
                                    <div class="flv-leg-tag-group">
                                        <span class="flv-leg-tag">IDA</span>
                                        <div class="flv-leg-status-wrap">
                                            <span class="flv-status-dot" style="background:${outColor};"></span>
                                            <span style="color:${outColor};">${outLabel}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flv-leg-middle">
                                    <div class="flv-time-block">
                                        <span class="flv-city">${originId}</span>
                                        <div class="flv-time">${out.depTimeStr} ${outDelay}</div>
                                    </div>
                                    <div class="flv-path">
                                        <div class="flv-path-line">
                                            ${out.type === 'in_flight' ? `<div class="flv-path-progress" style="width:${out.progress}%;"></div>` : (out.type === 'completed' ? `<div class="flv-path-progress" style="width:100%; background: #30d158;"></div>` : '')}
                                        </div>
                                    </div>
                                    <div class="flv-time-block right">
                                        <span class="flv-city">${destId2}</span>
                                        <div class="flv-time">${out.arrTimeStr}</div>
                                    </div>
                                </div>
                                ${outActions}
                            </div>

                            <div class="flv-leg ${ret.type === 'completed' ? 'flv-leg-completed' : ''}" onclick="event.stopPropagation(); openFlightModal('${ret.id}','${ret.type}');">
                                <div class="flv-leg-top">
                                    <div class="flv-leg-tag-group">
                                        <span class="flv-leg-tag">VUELTA</span>
                                        <div class="flv-leg-status-wrap">
                                            <span class="flv-status-dot" style="background:${retColor};"></span>
                                            <span style="color:${retColor};">${retLabel}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flv-leg-middle">
                                    <div class="flv-time-block">
                                        <span class="flv-city">${destId2}</span>
                                        <div class="flv-time">${ret.depTimeStr} ${retDelay}</div>
                                    </div>
                                    <div class="flv-path">
                                        <div class="flv-path-line">
                                            ${ret.type === 'in_flight' ? `<div class="flv-path-progress" style="width:${ret.progress}%;"></div>` : (ret.type === 'completed' ? `<div class="flv-path-progress" style="width:100%; background: #30d158;"></div>` : '')}
                                        </div>
                                    </div>
                                    <div class="flv-time-block right">
                                        <span class="flv-city">${originId}</span>
                                        <div class="flv-time">${ret.arrTimeStr}</div>
                                    </div>
                                </div>
                                ${retActions}
                            </div>

                        </div>
                    </div>`;
                }
            });
            boardHtml += `</div>`;
        });
    }

    flightsView.innerHTML = `
        <div class="flv-shell">
            <div class="flv-topbar">
                <div class="flv-topbar-left">
                    <span class="flv-topbar-title">Mis Vuelos</span>
                    <span class="flv-topbar-sub">${allFlights.length} operacion${allFlights.length !== 1 ? 'es' : ''} activa${allFlights.length !== 1 ? 's' : ''}</span>
                </div>
                <button class="flv-hist-btn" onclick="switchTab('history')">
                    <i class="ph ph-clock-counter-clockwise"></i> Historial
                </button>
            </div>
            <div class="flv-content">
                ${boardHtml}
            </div>
        </div>
    `;
};

window.expandedRtLegs = window.expandedRtLegs || {};

const renderHistory = () => {
    const historyView = document.getElementById('view-history');
    if (!historyView) return;

    if (!gameState.flightHistory || gameState.flightHistory.length === 0) {
        historyView.innerHTML = `
            <div class="market-header" style="margin-bottom: 24px;">
                <h2>Historial de Vuelos</h2>
                <p>Registros de los últimos vuelos completados.</p>
            </div>
            <div class="card card-padded" style="text-align: center; padding: 40px 24px; color: var(--text-muted); margin-top:24px;">
                <i class="ph ph-clock-counter-clockwise" style="font-size: 3rem; opacity: 0.3; margin-bottom: 12px; display: block;"></i>
                <p>Aún no has completado ningún vuelo.</p>
            </div>
        `;
        return;
    }

    // Agrupar vuelos en viajes de ida y vuelta (RoundTrips)
    const pendingReturns = [];
    const groupedTrips = [];

    // gameState.flightHistory viene del más nuevo al más antiguo
    gameState.flightHistory.forEach(f => {
        if (f.isReturn) {
            pendingReturns.push(f);
        } else {
            // Buscar un vuelo de vuelta que coincida (mismo avión y destino)
            const retIndex = pendingReturns.findIndex(r => r.planeReg === f.planeReg && r.destName === f.destName);
            let ret = null;
            if (retIndex !== -1) {
                ret = pendingReturns.splice(retIndex, 1)[0];
            }
            groupedTrips.push({ outbound: f, returnLeg: ret });
        }
    });

    // Añadir los vuelos de vuelta que quedaron sin ida (ej: si la ida fue borrada del historial)
    pendingReturns.forEach(ret => {
        groupedTrips.push({ outbound: null, returnLeg: ret });
    });

    // Ordenar de nuevo por timestamp descendente
    groupedTrips.sort((a, b) => {
        const tA = Math.max(a.outbound ? a.outbound.timestamp : 0, a.returnLeg ? a.returnLeg.timestamp : 0);
        const tB = Math.max(b.outbound ? b.outbound.timestamp : 0, b.returnLeg ? b.returnLeg.timestamp : 0);
        return tB - tA;
    });

    const historyGroups = {};
    groupedTrips.forEach(trip => {
        const out = trip.outbound;
        const ret = trip.returnLeg;
        const baseFlight = out || ret;
        let day = baseFlight.departureDay || baseFlight.arrivalDay || 0;
        if (out) day = Math.max(day, out.departureDay || 0);
        if (ret) day = Math.max(day, ret.departureDay || 0);

        if (!historyGroups[day]) historyGroups[day] = [];
        historyGroups[day].push(trip);
    });

    const sortedHistoryDays = Object.keys(historyGroups).map(Number).sort((a, b) => b - a);

    let historyHtml = `<div class="flv-board">`;

    if (sortedHistoryDays.length === 0) {
        historyHtml += `
            <div class="flv-empty">
                <i class="ph ph-airplane-tilt"></i>
                <p>Sin operaciones registradas.</p>
            </div>
        `;
    } else {
        sortedHistoryDays.forEach(day => {
            let dayLabel = `Día ${day}`;
            if (day === gameState.time.day) dayLabel = 'Hoy';
            else if (day === gameState.time.day - 1) dayLabel = 'Ayer';

            historyHtml += `<div class="flv-day-label">${dayLabel}</div>`;
            historyHtml += `<div class="flv-group">`;

            historyGroups[day].forEach(trip => {
                const out = trip.outbound;
                const ret = trip.returnLeg;
                const baseFlight = out || ret;
                
                const fName = baseFlight.flightNumberStr || 'Histórico';
                const isFerry = fName === 'Ferry';
                const displayNumber = isFerry ? 'Ferry' : fName;
                const planeModel = baseFlight.planeModel || 'Desconocido';

                const originId = gameState.base ? gameState.base.id : 'HUB';
                const destId2 = (baseFlight.destName ? baseFlight.destName.substring(0,3).toUpperCase() : 'DST');

                const formatDelay = (mins) => {
                    if (mins === 0) return `<span class="flv-delay-badge none">0m</span>`;
                    if (mins < 0) return `<span class="flv-delay-badge on-time">${mins}m</span>`;
                    if (mins <= 15) return `<span class="flv-delay-badge on-time">+${mins}m</span>`;
                    if (mins <= 30) return `<span class="flv-delay-badge delay-minor">+${mins}m</span>`;
                    if (mins <= 60) return `<span class="flv-delay-badge delay-moderate">+${mins}m</span>`;
                    return `<span class="flv-delay-badge delay-severe">+${mins}m</span>`;
                };

                const outDelayMins = out ? out.totalDelayMins || 0 : 0;
                const outDelay = out ? formatDelay(outDelayMins) : '';
                const retDelayMins = ret ? ret.totalDelayMins || 0 : 0;
                const retDelay = ret ? formatDelay(retDelayMins) : '';

                const opId = 'hist_' + baseFlight.id;
                window.rtCardsState = window.rtCardsState || {};
                let isExpanded = false;
                if (window.rtCardsState[opId] !== undefined) {
                    isExpanded = window.rtCardsState[opId];
                }

                const getStatusColor = (mins) => {
                    if (mins <= 15) return '#30d158';
                    if (mins <= 30) return '#ffd60a';
                    if (mins <= 60) return '#ff9f0a';
                    return '#d32f2f';
                };
                const outCompletedColor = getStatusColor(outDelayMins);
                const retCompletedColor = getStatusColor(retDelayMins);

                const getStarsHtml = (ratingVal) => {
                    if (!ratingVal) return '';
                    let rHtml = '<div style="color:var(--warning); font-size:0.9rem; margin-top:4px; display: flex; align-items: center; gap: 2px;">';
                    const fStars = Math.floor(ratingVal);
                    const hStar = ratingVal - fStars >= 0.5;
                    for (let i = 0; i < 5; i++) {
                        if (i < fStars) rHtml += '<i class="ph-fill ph-star"></i>';
                        else if (i === fStars && hStar) rHtml += '<i class="ph-fill ph-star-half"></i>';
                        else rHtml += '<i class="ph ph-star"></i>';
                    }
                    rHtml += `<span style="color:var(--text-muted); font-size:0.8rem; margin-left:4px;">${ratingVal.toFixed(1)}</span></div>`;
                    return rHtml;
                };

                const outStars = out ? getStarsHtml(out.rating) : '';
                const retStars = ret ? getStarsHtml(ret.rating) : '';

                let outHtml = '';
                if (out) {
                    outHtml = `
                    <div class="flv-leg flv-leg-completed" onclick="event.stopPropagation(); openFlightModal('${out.id}','history');">
                        <div class="flv-leg-top">
                            <div class="flv-leg-tag-group">
                                <span class="flv-leg-tag">IDA</span>
                                <div class="flv-leg-status-wrap" style="flex-direction: column; align-items: flex-end;">
                                    <div style="display:flex; align-items:center; gap:4px;">
                                        <span class="flv-status-dot" style="background:${out.isCanceled ? '#d32f2f' : outCompletedColor};"></span>
                                        <span style="color:${out.isCanceled ? '#d32f2f' : outCompletedColor};">${out.isCanceled ? 'Cancelado' : 'Completado'}</span>
                                    </div>
                                    ${outStars}
                                </div>
                            </div>
                        </div>
                        <div class="flv-leg-middle">
                            <div class="flv-time-block">
                                <span class="flv-city">${originId}</span>
                                <div class="flv-time">${formatTime(out.departureHour, out.departureMinute)} ${outDelay}</div>
                            </div>
                            <div class="flv-path">
                                <div class="flv-path-line">
                                    <div class="flv-path-progress" style="width:100%; background: ${outCompletedColor};"></div>
                                </div>
                            </div>
                            <div class="flv-time-block right">
                                <span class="flv-city">${destId2}</span>
                                <div class="flv-time">${formatTime(out.arrivalHour, out.arrivalMinute)}</div>
                            </div>
                        </div>
                    </div>`;
                }

                let retHtml = '';
                if (ret) {
                    retHtml = `
                    <div class="flv-leg flv-leg-completed" onclick="event.stopPropagation(); openFlightModal('${ret.id}','history');">
                        <div class="flv-leg-top">
                            <div class="flv-leg-tag-group">
                                <span class="flv-leg-tag">VUELTA</span>
                                <div class="flv-leg-status-wrap" style="flex-direction: column; align-items: flex-end;">
                                    <div style="display:flex; align-items:center; gap:4px;">
                                        <span class="flv-status-dot" style="background:${ret.isCanceled ? '#d32f2f' : retCompletedColor};"></span>
                                        <span style="color:${ret.isCanceled ? '#d32f2f' : retCompletedColor};">${ret.isCanceled ? 'Cancelado' : 'Completado'}</span>
                                    </div>
                                    ${retStars}
                                </div>
                            </div>
                        </div>
                        <div class="flv-leg-middle">
                            <div class="flv-time-block">
                                <span class="flv-city">${destId2}</span>
                                <div class="flv-time">${formatTime(ret.departureHour, ret.departureMinute)} ${retDelay}</div>
                            </div>
                            <div class="flv-path">
                                <div class="flv-path-line">
                                    <div class="flv-path-progress" style="width:100%; background: ${retCompletedColor};"></div>
                                </div>
                            </div>
                            <div class="flv-time-block right">
                                <span class="flv-city">${originId}</span>
                                <div class="flv-time">${formatTime(ret.arrivalHour, ret.arrivalMinute)}</div>
                            </div>
                        </div>
                    </div>`;
                }

                let dotsHtml = '';
                if (out && ret) {
                    dotsHtml = `
                        <span class="flv-status-dot" style="background:${outCompletedColor};" title="Completado"></span>
                        <span class="flv-status-dot" style="background:${retCompletedColor};" title="Completado"></span>
                    `;
                } else if (out) {
                    dotsHtml = `
                        <span class="flv-status-dot" style="background:${outCompletedColor};" title="Completado"></span>
                    `;
                } else if (ret) {
                    dotsHtml = `
                        <span class="flv-status-dot" style="background:${retCompletedColor};" title="Completado"></span>
                    `;
                }

                historyHtml += `
                <div class="flv-card" data-opid-card="${opId}">
                    <div class="flv-rt-header" onclick="toggleFlvCard(this)">
                        <div class="flv-rt-id">
                            <span class="flv-fnum">${displayNumber}</span>
                            <span class="flv-plane-model">${planeModel}</span>
                        </div>
                        <div class="flv-rt-meta">
                            <span class="flv-rt-route">${originId} &harr; ${destId2}</span>
                            <div class="flv-rt-dots">
                                ${dotsHtml}
                            </div>
                            <i class="ph ph-caret-down flv-expand-icon" style="transform:${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
                        </div>
                    </div>

                    <div class="flv-legs-wrap" style="${isExpanded ? 'max-height: 500px; opacity: 1;' : 'max-height: 0px; opacity: 0;'}">
                        ${outHtml}
                        ${retHtml}
                    </div>
                </div>`;
            });

            historyHtml += `</div>`;
        });
    }

    historyHtml += `</div>`;

    historyView.innerHTML = `
        <div class="market-header" style="margin-bottom: 24px;">
            <h2>Historial de Vuelos</h2>
            <p>Registros de los últimos vuelos completados.</p>
        </div>
        ${historyHtml}
    `;
};

window.openFlightModal = (flightId, type) => {
    let flight = null;
    if (type === 'history') {
        const histF = gameState.flightHistory.find(f => f.id === flightId);
        if (histF) {
            flight = {
                ...histF,
                type: histF.isCanceled ? 'canceled' : 'completed',
                status: histF.isCanceled ? 'Cancelado' : 'Completado',
                depTimeStr: formatTime(histF.departureHour, histF.departureMinute),
                arrTimeStr: formatTime(histF.arrivalHour, histF.arrivalMinute),
                delayMins: histF.totalDelayMins || 0,
                obj: histF,
                destId: histF.destName ? histF.destName.substring(0,3).toUpperCase() : 'DST'
            };
        }
    } else {
        flight = window.currentDisplayedFlights.find(f => f.id === flightId && f.type === type);
    }
    if (!flight) return;
    
    const nowAbs = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
    const trueTotalDelay = window.computeTrueDelay(flight, nowAbs);
    const breakdown = window.computeDelayBreakdown(flight, trueTotalDelay);
    flight.totalDelayMins = trueTotalDelay;

    const modal = document.getElementById('flight-detail-modal');
    if (!modal) return;

    const originTxt = flight.obj && flight.obj.isReturn ? flight.destId : 'BUE';
    const destTxt = flight.obj && flight.obj.isReturn ? 'BUE' : flight.destId;
    document.getElementById('fd-route-title').innerHTML = `<i class="ph ph-airplane-tilt" style="color:var(--accent);"></i> ${originTxt} <i class="ph ph-arrow-right" style="opacity:0.5; margin:0 8px; font-size:1rem;"></i> ${destTxt}`;
      
    const btnPlaneInfo = document.getElementById('fd-plane-info');
    btnPlaneInfo.innerHTML = `<i class="ph ph-airplane"></i> ${flight.planeReg} • ${flight.planeModel}`;
    const fleetPlane = gameState.fleet.find(p => p.registration === flight.planeReg);
    if (fleetPlane) {
        btnPlaneInfo.dataset.planeid = fleetPlane.id;
        btnPlaneInfo.style.cursor = 'pointer';
        btnPlaneInfo.style.opacity = '1';
    } else {
        btnPlaneInfo.dataset.planeid = '';
        btnPlaneInfo.style.cursor = 'default';
        btnPlaneInfo.style.opacity = '0.7';
    }
      
    const badge = document.getElementById('fd-status-badge');
    let statusColor = '#22c55e';
    let badgeText = flight.status || 'Programado';
    
    if (flight.type === 'delayed' || flight.type === 'delayed_weather') {
        const delay = trueTotalDelay;
        if (delay <= 15) statusColor = '#30d158'; // Green
        else if (delay <= 30) statusColor = '#ffd60a'; // Yellow
        else if (delay <= 60) statusColor = '#ff9f0a'; // Orange
        else statusColor = '#d32f2f'; // Red
    } else if (flight.type === 'boarding' || flight.type === 'in_flight') {
        const delay = flight.delayMins || 0;
        if (delay <= 15) statusColor = '#0a84ff'; // Normal Blue
        else if (delay <= 30) statusColor = '#ffd60a'; // Yellow
        else if (delay <= 60) statusColor = '#ff9f0a'; // Orange
        else statusColor = '#d32f2f'; // Red
    } else if (flight.type === 'completed') {
        const delay = flight.totalDelayMins || (flight.obj ? flight.obj.totalDelayMins : 0) || flight.delayMins || 0;
        if (delay <= 15) statusColor = '#30d158'; // Green
        else if (delay <= 30) statusColor = '#ffd60a'; // Yellow
        else if (delay <= 60) statusColor = '#ff9f0a'; // Orange
        else statusColor = '#d32f2f'; // Red
    } else if (flight.type === 'scheduled' || flight.type === 'stub') {
        statusColor = '#8e8e93';
    }
    
    badge.innerText = badgeText;
    badge.style.background = statusColor + '20';
    badge.style.color = statusColor;
    
    let schedOut = '--:--';
    let estIn = '--:--';
    let confOut = '--:--';
    let actOut = '--:--';
    let actIn = '--:--';
    const rowConfOut = document.getElementById('fd-row-conf-out');
    rowConfOut.classList.add('hidden');

    if (flight.type === 'scheduled' || flight.type === 'stub') {
        schedOut = flight.depTimeStr || '--:--';
        estIn = flight.arrTimeStr || '--:--';
    } else {
        const route = gameState.routes.find(r => r.id === flight.routeId);
        const distance = route ? route.distance : 0;
        const _m6193 = AIRCRAFT_MODELS.find(m => m.id === flight.modelId || m.name === flight.planeModel || m.id === flight.planeModel);
        const durationMins = distance > 0 ? Math.round((distance / getAircraftSpeed(_m6193)) * 60) : 0;
        
        const origSchedAbs = flight.obj ? (flight.obj.originalSchedAbs !== undefined ? flight.obj.originalSchedAbs : flight.obj.schedAbs) : (flight.schedAbs || 0);
        
        // Salida y llegada previstas (fijas)
        const schedDepHour = Math.floor((origSchedAbs % (24 * 60)) / 60);
        const schedDepMin = origSchedAbs % 60;
        schedOut = formatTime(schedDepHour, schedDepMin);
        
        const schedArrAbs = origSchedAbs + durationMins;
        const schedArrHour = Math.floor((schedArrAbs % (24 * 60)) / 60);
        const schedArrMin = schedArrAbs % 60;
        estIn = formatTime(schedArrHour, schedArrMin);

        // Confirmada (salida prevista con demora estimada)
        if (flight.type === 'delayed' || flight.type === 'delayed_weather' || flight.type === 'boarding') {
            if (trueTotalDelay > 0) {
                const expectedDepAbs = origSchedAbs + trueTotalDelay;
                confOut = formatTime(Math.floor((expectedDepAbs % (24 * 60)) / 60), expectedDepAbs % 60);
                rowConfOut.classList.remove('hidden');
            }
        }
        
        if (flight.type === 'in_flight' || flight.type === 'completed') {
            // Salida Real
            let actDepAbs = flight.obj ? flight.obj.actualDepartureAbs : undefined;
            if (actDepAbs === undefined && flight.obj && flight.obj.departureDay !== undefined) {
                actDepAbs = flight.obj.departureDay * 24 * 60 + flight.obj.departureHour * 60 + flight.obj.departureMinute;
            }
            if (actDepAbs !== undefined) {
                actOut = formatTime(Math.floor((actDepAbs % (24 * 60)) / 60), actDepAbs % 60);
            } else {
                actOut = flight.depTimeStr || '--:--';
            }
            
            if (flight.type === 'completed') {
                // Llegada Real
                let actArrAbs = undefined;
                if (flight.obj && flight.obj.arrivalDay !== undefined) {
                    actArrAbs = flight.obj.arrivalDay * 24 * 60 + flight.obj.arrivalHour * 60 + flight.obj.arrivalMinute;
                }
                if (actArrAbs !== undefined) {
                    actIn = formatTime(Math.floor((actArrAbs % (24 * 60)) / 60), actArrAbs % 60);
                } else {
                    actIn = flight.arrTimeStr || '--:--';
                }
            }
        }
    }

    const formatDelayBadge = (mins) => {
        if (!mins || mins === 0) return '';
        if (mins < 0) return `<span style="background: rgba(48,209,88,0.15); color: #30d158; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; margin-left: 6px;">${mins}m</span>`;
        
        let color = '#d32f2f';
        let bg = 'rgba(255,69,58,0.15)';
        if (mins <= 15) { color = '#30d158'; bg = 'rgba(48,209,88,0.15)'; }
        else if (mins <= 30) { color = '#ffd60a'; bg = 'rgba(255,214,10,0.15)'; }
        else if (mins <= 60) { color = '#ff9f0a'; bg = 'rgba(255,159,10,0.15)'; }
        
        return `<span style="background: ${bg}; color: ${color}; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; margin-left: 6px;">+${mins}m</span>`;
    };
    const delayHtml = formatDelayBadge(trueTotalDelay);

    document.getElementById('fd-time-sched-out').innerHTML = schedOut + delayHtml;
    document.getElementById('fd-time-conf-out').innerHTML = confOut !== '--:--' ? confOut + delayHtml : confOut;
    document.getElementById('fd-time-act-out').innerHTML = actOut;
    document.getElementById('fd-time-est-in').innerHTML = estIn !== '--:--' ? estIn + delayHtml : estIn;
    document.getElementById('fd-time-act-in').innerHTML = actIn;

    const progCont = document.getElementById('fd-progress-container');
    if (flight.type === 'in_flight') {
        progCont.classList.remove('hidden');
        document.getElementById('fd-progress-fill').style.width = `${flight.progress}%`;
        document.getElementById('fd-progress-text').innerText = `${Math.floor(flight.progress)}%`;
    } else {
        progCont.classList.add('hidden');
    }

    document.getElementById('fd-dest-ap').innerText = flight.destName;
    const weather = getWeatherInfo(flight.destId);
    document.getElementById('fd-weather-icon').innerText = weather.icon;
    document.getElementById('fd-weather-text').innerText = weather.text;
    document.getElementById('fd-weather-text').style.color = weather.color;
    
    let wDesc = "Condiciones óptimas para operaciones.";
    if (weather.id === 'Lluvia') wDesc = "Pista mojada, precaución en aproximación.";
    else if (weather.id === 'Tormenta') wDesc = "Posibilidad de fuertes turbulencias y demoras.";
    else if (weather.id === 'Niebla') wDesc = "Baja visibilidad. Procedimientos LVP en curso.";
    document.getElementById('fd-weather-desc').innerText = wDesc;

    const paxEl = document.getElementById('fd-pax-count');
    const profitEl = document.getElementById('fd-flight-profit');
    
    const planeForStats = flight.planeId ? gameState.fleet.find(p => p.id === flight.planeId) : gameState.fleet.find(p => p.registration === flight.planeReg);
    const totalPax = planeForStats ? (planeForStats.capacity || planeForStats.maxSeats) : 0;
    
    if (flight.type === 'in_flight' || flight.type === 'completed') {
        if (paxEl) {
            const actualPax = flight.passengers !== undefined ? flight.passengers : ((flight.obj && flight.obj.passengers !== undefined) ? flight.obj.passengers : totalPax);
            const occupancy = totalPax > 0 ? Math.round((actualPax / totalPax) * 100) : 0;
            paxEl.innerHTML = `${actualPax}<br><span style="font-size:0.75rem; color:var(--text-secondary); font-weight:normal;">(${occupancy}% ocupación)</span>`;
        }
        if (profitEl) {
            profitEl.innerText = flight.profit < 0 ? `-${formatMoney(Math.abs(flight.profit))}` : `+${formatMoney(flight.profit || 0)}`;
            profitEl.style.color = flight.profit < 0 ? '#d32f2f' : '#22c55e';
        }
    } else {
        if (paxEl) paxEl.innerText = "A confirmar";
        if (profitEl) {
            profitEl.innerText = "A confirmar";
            profitEl.style.color = "var(--text-secondary)";
        }
    }

    const breakdownContainer = document.getElementById('fd-delay-breakdown-container');
    const breakdownList = document.getElementById('fd-delay-breakdown-list');
    if (breakdownContainer && breakdownList) {
        if (breakdown.length > 0 && trueTotalDelay > 0) {
            let html = '';
            breakdown.forEach(b => {
                html += `<li style="margin-bottom:4px;"><strong>${b.reason}:</strong> ${b.mins > 0 ? '+' : ''}${b.mins}m</li>`;
            });
            breakdownList.innerHTML = html;
            breakdownContainer.style.display = 'block';
        } else {
            breakdownContainer.style.display = 'none';
        }
    }

    modal.classList.remove('hidden');
};

window.closeFlightModal = () => {
    const modal = document.getElementById('flight-detail-modal');
    if (modal) modal.classList.add('hidden');
};

window.cancelFlightFromModal = (flightId, type) => {
    if (type === 'stub') {
        showToast('Atención', 'Para cancelar este tramo, debes cancelar el vuelo de ida correspondiente.', 'warning');
        return;
    }
    if (type === 'scheduled') {
        showToast('Atención', 'Este vuelo aún no se ha despachado. Para cancelarlo de forma permanente, elimina la frecuencia en la pestaña de Rutas.', 'warning');
        return;
    }
    if (type === 'in_flight' || type === 'completed') {
        showToast('Atención', 'No puedes cancelar un vuelo que ya está en el aire o completado.', 'warning');
        return;
    }

    const dispatch = gameState.activeDispatches.find(d => d.id === flightId);
    if (!dispatch) return;

    if (dispatch.status === 'boarding') {
        const plane = gameState.fleet.find(p => p.id === dispatch.planeId);
        if (plane) plane.status = 'idle';
    }

    window.processFlightCancellation(dispatch, 'modal');
    
    closeFlightModal();
    renderFlights();
    saveGame();
};

window.onload = () => {
    if (loadGame() && gameState.base) {
        startGame();
    } else {
        initMap();
    }
};



let plannerCurrentDay = 'Lun';
const ALL_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

let plannerUnsavedChanges = false;
let plannerDraftRoutes = [];

const initPlannerDraft = () => {
    plannerDraftRoutes = JSON.parse(JSON.stringify(gameState.routes));
    plannerUnsavedChanges = false;
};

const savePlannerChanges = () => {
    gameState.routes = JSON.parse(JSON.stringify(plannerDraftRoutes));
    plannerUnsavedChanges = false;
    saveGame();
    showToast('Planificador', 'Horarios guardados correctamente.', 'success');
    renderPlanner();
};

const cancelPlannerChanges = () => {
    initPlannerDraft();
    showToast('Planificador', 'Cambios descartados.', 'info');
    renderPlanner();
};

const renderPlanner = () => {
    const daySelector = document.getElementById('planner-day-selector');
    const header = document.getElementById('planner-timeline-header');
    const grid = document.getElementById('planner-grid');

    if (!daySelector || !header || !grid) return;

    if (plannerDraftRoutes.length === 0 || (!plannerUnsavedChanges && plannerDraftRoutes.length !== gameState.routes.length)) {
        initPlannerDraft();
    }

    let dayBtnsHtml = ALL_DAYS.map(d => 
        `<button class="planner-day-btn ${plannerCurrentDay === d ? 'active' : ''}" onclick="plannerCurrentDay='${d}'; renderPlanner()">${d}</button>`
    ).join('');
    
    const actionsContainer = document.getElementById('planner-actions');
    if (actionsContainer) {
        if (plannerUnsavedChanges) {
            actionsContainer.innerHTML = `
                <button class="btn btn-danger-subtle btn-sm" onclick="cancelPlannerChanges()" style="padding: 6px 12px; font-size: 0.85rem;"><i class="ph ph-x"></i> Cancelar</button>
                <button class="btn btn-primary btn-sm" onclick="savePlannerChanges()" style="padding: 6px 12px; font-size: 0.85rem;"><i class="ph ph-check"></i> Guardar</button>
            `;
        } else {
            actionsContainer.innerHTML = '';
        }
    }
    
    daySelector.innerHTML = dayBtnsHtml;

    let headerHtml = '<div class="planner-row-label-header">Ruta</div>';
    for (let i = 0; i < 48; i++) {
        const hourLabel = (i % 24).toString().padStart(2, '0');
        const isNewDay = i === 24;
        const extraStyle = isNewDay ? 'border-left: 2px solid rgba(255,255,255,0.4); background: rgba(255,255,255,0.03);' : '';
        headerHtml += `<div class="planner-time-col" style="${extraStyle}">${hourLabel}:00</div>`;
    }
    header.innerHTML = headerHtml;

    grid.innerHTML = '';

    if (plannerDraftRoutes.length === 0) {
        grid.innerHTML = '<div style="padding: 24px; color: var(--text-muted); text-align: center;">No hay rutas programadas.</div>';
        return;
    }

    const nextDayIdx = (ALL_DAYS.indexOf(plannerCurrentDay) + 1) % 7;
    const plannerNextDay = ALL_DAYS[nextDayIdx];

    const allFlightsToday = [];
    plannerDraftRoutes.forEach(r => {
        (r.frequencies || []).forEach(f => {
            const isToday = f.days.includes(plannerCurrentDay);
            const isTomorrow = f.days.includes(plannerNextDay);
            if (!isToday && !isTomorrow) return;

            const _m = AIRCRAFT_MODELS.find(m => m.id === f.modelId || m.name === f.modelId);
            const durHours = r.distance / getAircraftSpeed(_m);
            const parts = f.time.split(':');
            const baseMins = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            
            if (isToday) {
                const startMins = baseMins;
                allFlightsToday.push({ id: f.id, planes: f.assignedPlanes || [], startMins, endMins: startMins + Math.round(durHours * 60) });
            }
            if (isTomorrow) {
                const startMins = baseMins + 24 * 60;
                allFlightsToday.push({ id: f.id, planes: f.assignedPlanes || [], startMins, endMins: startMins + Math.round(durHours * 60) });
            }
        });
    });

    plannerDraftRoutes.forEach(route => {
        const routeFreqs = [];
        (route.frequencies || []).forEach(f => {
            if (f.days.includes(plannerCurrentDay)) {
                routeFreqs.push({ ...f, offsetMins: 0 });
            }
            if (f.days.includes(plannerNextDay)) {
                routeFreqs.push({ ...f, offsetMins: 24 * 60 });
            }
        });

        const row = document.createElement('div');
        row.className = 'planner-row';

        const label = document.createElement('div');
        label.className = 'planner-row-label';
        label.innerHTML = `<h4>EZE - ${route.destinationId}</h4><span>${route.distance} NM</span>`;
        row.appendChild(label);

        const track = document.createElement('div');
        track.className = 'planner-track';
        track.style.background = 'repeating-linear-gradient(to right, rgba(255, 255, 255, 0.03) 0, transparent 1px), linear-gradient(to right, transparent calc(50% - 1px), rgba(255,255,255,0.2) 50%, transparent calc(50% + 1px))';
        track.style.backgroundSize = 'calc(100% / 48) 100%, 100% 100%';

        if (routeFreqs.length === 0) {
            track.innerHTML = `
                <div style="width: 100%; display: flex; align-items: center; justify-content: center; opacity: 0.5;">
                    <button class="btn btn-secondary btn-sm" onclick="addFrequencyFromPlanner('${route.id}', '${plannerCurrentDay}')" style="font-size: 0.72rem; padding: 4px 10px; background: rgba(255, 255, 255, 0.04); border: 1px dashed rgba(255,255,255,0.15); border-radius: var(--radius-md); color: var(--text-secondary); cursor: pointer; transition: all 0.2s;">
                        <i class="ph ph-plus-circle"></i> Programar Vuelo
                    </button>
                </div>
            `;
        } else {
            routeFreqs.forEach(freq => {
                const block = document.createElement('div');
                block.className = `planner-flight-block ${freq.isReturn ? 'return-flight' : ''}`;
                
                const timeParts = freq.time.split(':');
                const h = parseInt(timeParts[0]);
                const m = parseInt(timeParts[1]);
                const totalMinutes = h * 60 + m + freq.offsetMins;
                const leftPercent = (totalMinutes / (48 * 60)) * 100;

                const _m6471 = AIRCRAFT_MODELS.find(m => m.id === freq.modelId || m.name === freq.modelId);
                const durationHours = route.distance / getAircraftSpeed(_m6471);
                const widthPercent = (durationHours / 48) * 100;
                
                const endMinutes = totalMinutes + Math.round(durationHours * 60);

                const pairId = freq.isReturn && freq.pairedWith ? freq.pairedWith : freq.id;
                let hash = 0;
                for (let i = 0; i < pairId.length; i++) {
                    hash = pairId.charCodeAt(i) + ((hash << 5) - hash);
                }
                const hue = Math.abs(hash) % 360;
                block.style.setProperty('--flight-color', `linear-gradient(135deg, hsla(${hue}, 80%, 55%, 0.85) 0%, hsla(${hue}, 80%, 45%, 0.6) 100%)`);
                block.style.setProperty('--flight-border', `hsla(${hue}, 80%, 45%, 0.6)`);

                const isConflict = allFlightsToday.some(other => {
                    if (other.id === freq.id && other.startMins === totalMinutes) return false;
                    const sharedPlane = (freq.assignedPlanes || []).some(p => other.planes.includes(p));
                    if (!sharedPlane) return false;
                    return (totalMinutes < other.endMins && other.startMins < endMinutes);
                });
                if (isConflict) block.classList.add('planner-flight-conflict');

                block.style.left = `${leftPercent}%`;
                block.style.width = `${widthPercent}%`;
                
                const endH = Math.floor(endMinutes / 60) % 24;
                const endM = endMinutes % 60;
                const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} - ${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                const fCode = `${freq.flightCode || 'AR'}${freq.flightNumber || ''}`;
                
                const getFlightHtml = (code, tStr) => `<div class="planner-flight-text"><span>${code}</span><span class="time">${tStr}</span></div>`;
                
                block.innerHTML = getFlightHtml(fCode, timeStr);
                block.title = `${freq.isReturn ? 'Regreso' : 'Ida'} - Sale: ${freq.time} | Llega: ${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

                block.setAttribute('data-freq-id', freq.id);
                if (freq.isReturn && freq.pairedWith) {
                    block.setAttribute('data-paired-id', freq.pairedWith);
                } else if (!freq.isReturn) {
                    const retFreq = route.frequencies.find(f => f.pairedWith === freq.id);
                    if (retFreq) {
                        block.setAttribute('data-paired-id', retFreq.id);
                    }
                }

                block.addEventListener('pointerenter', () => {
                    block.classList.add('highlight-paired');
                    const pairedId = block.getAttribute('data-paired-id');
                    if (pairedId) {
                        const pairedBlocks = track.querySelectorAll(`[data-freq-id="${pairedId}"]`);
                        pairedBlocks.forEach(pb => pb.classList.add('highlight-paired'));
                    }
                });
                block.addEventListener('pointerleave', () => {
                    block.classList.remove('highlight-paired');
                    const pairedId = block.getAttribute('data-paired-id');
                    if (pairedId) {
                        const pairedBlocks = track.querySelectorAll(`[data-freq-id="${pairedId}"]`);
                        pairedBlocks.forEach(pb => pb.classList.remove('highlight-paired'));
                    }
                });

                let isDragging = false;
                let longPressTimer = null;
                let startX = 0;
                let startY = 0;
                let startLeftPercent = 0;
                let isLongPressed = false;
                let hasScrolled = false;

                const handleDown = (clientX, clientY) => {
                    startX = clientX;
                    startY = clientY;
                    startLeftPercent = leftPercent;
                    isLongPressed = false;
                    hasScrolled = false;
                    
                    longPressTimer = setTimeout(() => {
                        if (!hasScrolled) {
                            isLongPressed = true;
                            isDragging = true;
                            block.classList.add('draggable');
                        }
                    }, 400);
                };

                const handleMove = (clientX, clientY, e) => {
                    if (!isLongPressed) {
                        if (Math.abs(clientX - startX) > 10 || Math.abs(clientY - startY) > 10) {
                            clearTimeout(longPressTimer);
                            hasScrolled = true;
                        }
                        return;
                    }
                    
                    e.preventDefault(); 
                    
                    const trackWidth = track.getBoundingClientRect().width;
                    const deltaX = clientX - startX;
                    let newLeftPercent = startLeftPercent + (deltaX / trackWidth) * 100;
                    
                    if (newLeftPercent < 0) newLeftPercent = 0;
                    if (newLeftPercent + widthPercent > 100) newLeftPercent = 100 - widthPercent;

                    block.style.left = `${newLeftPercent}%`;
                    
                    const newTotalMinutes = Math.round((newLeftPercent / 100) * 48 * 60);
                    let actualMins = newTotalMinutes - freq.offsetMins;
                    
                    const newH = Math.floor(actualMins / 60) % 24;
                    const newM = (actualMins % 60 + 60) % 60;
                    const prevEndMins = actualMins + Math.round(durationHours * 60);
                    const prevEndH = Math.floor(prevEndMins / 60) % 24;
                    const prevEndM = (prevEndMins % 60 + 60) % 60;
                    
                    const previewTime = `${Math.abs(newH).toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')} - ${Math.abs(prevEndH).toString().padStart(2, '0')}:${prevEndM.toString().padStart(2, '0')}`;
                    block.innerHTML = getFlightHtml(fCode, previewTime);
                };

                const handleUp = () => {
                    clearTimeout(longPressTimer);
                    if (!isDragging) {
                        if (!isLongPressed && !hasScrolled) {
                            openPlannerFlightModal(route.id, freq.id);
                        }
                        return;
                    }
                    isDragging = false;
                    block.classList.remove('draggable');

                    const currentLeft = parseFloat(block.style.left);
                    const finalTotalMinutes = Math.round((currentLeft / 100) * 48 * 60);
                    
                    let actualMins = finalTotalMinutes - freq.offsetMins;
                    const snappedMinutes = Math.round(actualMins / 5) * 5;
                    
                    let newH = Math.floor(snappedMinutes / 60);
                    let newM = snappedMinutes % 60;
                    
                    if (newH < 0) newH += 24;
                    if (newH >= 24) newH -= 24;
                    
                    const finalTimeStr = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
                    
                    const freqRef = route.frequencies.find(f => f.id === freq.id);
                    if (freqRef && freqRef.time !== finalTimeStr) {
                        freqRef.time = finalTimeStr;
                        plannerUnsavedChanges = true;

                        if (!freqRef.isReturn) {
                            const returnFreq = route.frequencies.find(f => f.pairedWith === freqRef.id || f.id === freqRef.pairedWith);
                            if (returnFreq) {
                                const durationMins = Math.round(durationHours * 60);
                                const totalReturnMins = snappedMinutes + durationMins + 60; 
                                const retH = Math.floor(totalReturnMins / 60) % 24;
                                const retM = totalReturnMins % 60;
                                returnFreq.time = `${retH.toString().padStart(2, '0')}:${retM.toString().padStart(2, '0')}`;
                            }
                        } else if (freqRef.isReturn && freqRef.pairedWith) {
                            const outFreq = route.frequencies.find(f => f.id === freqRef.pairedWith);
                            if (outFreq) {
                                const durationMins = Math.round(durationHours * 60);
                                let outTotalMins = snappedMinutes - 60 - durationMins;
                                if (outTotalMins < 0) outTotalMins += 24 * 60;
                                const outH = Math.floor(outTotalMins / 60) % 24;
                                const outM = outTotalMins % 60;
                                outFreq.time = `${outH.toString().padStart(2, '0')}:${outM.toString().padStart(2, '0')}`;
                            }
                        }
                        renderPlanner(); 
                    } else {
                        block.style.left = `${leftPercent}%`;
                        block.innerHTML = getFlightHtml(fCode, timeStr);
                    }
                };

                block.addEventListener('touchstart', (e) => handleDown(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
                block.addEventListener('touchmove', (e) => {
                    if (isLongPressed) e.preventDefault();
                    handleMove(e.touches[0].clientX, e.touches[0].clientY, e);
                }, { passive: false });
                block.addEventListener('touchend', handleUp);
                block.addEventListener('touchcancel', handleUp);

                block.addEventListener('mousedown', (e) => {
                    if (e.button !== 0) return;
                    handleDown(e.clientX, e.clientY);
                    
                    const onMouseMove = (ev) => handleMove(ev.clientX, ev.clientY, ev);
                    const onMouseUp = () => {
                        handleUp();
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });

                track.appendChild(block);
            });
        }

        row.appendChild(track);
        grid.appendChild(row);
    });
};

window.addFrequencyFromPlanner = (routeId, dayStr) => {
    const route = plannerDraftRoutes.find(r => r.id === routeId);
    if (!route) return;
    
    const outId = Math.random().toString(36).substr(2, 9);
    const retId = Math.random().toString(36).substr(2, 9);
    
    const dist = route.distance || 0;
    
    const validPlanes = gameState.fleet.filter(plane => plane.range >= dist);
    const assignedPlanes = validPlanes.length > 0 ? [validPlanes[0].id] : [];
    const modelId = validPlanes.length > 0 ? validPlanes[0].name : '';
    
    const outboundFreq = {
        id: outId,
        days: [dayStr],
        time: '08:00',
        flightCode: 'AR',
        flightNumber: Math.floor(Math.random() * 9000 + 1000).toString(),
        modelId: modelId,
        assignedPlanes: [...assignedPlanes],
        catering: 'none',
        isReturn: false
    };
    
    const model = AIRCRAFT_MODELS.find(m => m.id === modelId || m.name === modelId);
    const durationHours = dist / getAircraftSpeed(model);
    const durationMinutes = Math.round(durationHours * 60);
    const turnaroundMins = getTurnaroundMins(model);
    const bufferMins = getScheduleBufferMins(durationMinutes);
    let boardingMins = 30;
    if (model) {
        if (model.capacity > 200) boardingMins = 45;
        else if (model.capacity < 100) boardingMins = 20;
    }
    
    let returnMinsTotal = 480 + durationMinutes + turnaroundMins + bufferMins + boardingMins;
    const rem = returnMinsTotal % 30;
    if (rem !== 0) returnMinsTotal += (30 - rem);
    
    const returnDayOffset = Math.floor(returnMinsTotal / (24 * 60));
    const returnH = Math.floor((returnMinsTotal % (24 * 60)) / 60);
    const returnM = returnMinsTotal % 60;
    
    const returnDays = [dayStr].map(d => {
        const idx = ALL_DAYS.indexOf(d);
        return ALL_DAYS[(idx + returnDayOffset) % 7];
    });
    
    const returnFreq = {
        id: retId,
        days: returnDays,
        time: formatTime(returnH, returnM),
        modelId: modelId,
        assignedPlanes: [...assignedPlanes],
        isReturn: true,
        pairedWith: outId
    };
    
    route.frequencies = route.frequencies || [];
    route.frequencies.push(outboundFreq);
    route.frequencies.push(returnFreq);
    
    plannerUnsavedChanges = true;
    renderPlanner();
    showToast('Planificador', 'Nueva frecuencia agregada al borrador.', 'info');
};

const returnDayOffsetMins = (route, outboundFreq) => {
    const dist = route.distance || 0;
    const model = AIRCRAFT_MODELS.find(m => m.id === outboundFreq.modelId || m.name === outboundFreq.modelId);
    const durationHours = dist / getAircraftSpeed(model);
    const durationMinutes = Math.round(durationHours * 60);
    const turnaroundMins = getTurnaroundMins(model);
    const bufferMins = getScheduleBufferMins(durationMinutes);
    let boardingMins = 30;
    if (model) {
        if (model.capacity > 200) boardingMins = 45;
        else if (model.capacity < 100) boardingMins = 20;
    }

    const parts = outboundFreq.time.split(':');
    const fH = parseInt(parts[0], 10);
    const fM = parseInt(parts[1], 10);
    const outboundMins = fH * 60 + fM;

    let returnMinsTotal = outboundMins + durationMinutes + turnaroundMins + bufferMins + boardingMins;
    const rem = returnMinsTotal % 30;
    if (rem !== 0) returnMinsTotal += (30 - rem);

    return Math.floor(returnMinsTotal / (24 * 60));
};

window.openPlannerFlightModal = (routeId, freqId) => {
    const route = plannerDraftRoutes.find(r => r.id === routeId);
    if (!route) return;
    const freq = route.frequencies.find(f => f.id === freqId);
    if (!freq) return;

    let outboundFreq = null;
    let returnFreq = null;
    if (!freq.isReturn) {
        outboundFreq = freq;
        returnFreq = route.frequencies.find(f => f.id === freq.pairedWith || f.pairedWith === freq.id);
    } else {
        returnFreq = freq;
        outboundFreq = route.frequencies.find(f => f.id === freq.pairedWith || f.pairedWith === freq.id);
    }

    if (!outboundFreq) return;

    const dest = AIRPORTS.find(a => a.id === route.destinationId) || { name: 'Desconocido' };
    const destName = dest.name.split(',')[0];

    const modal = document.getElementById('planner-flight-modal');
    const body = document.getElementById('planner-flight-modal-body');
    if (!modal || !body) return;

    modal.classList.remove('hidden');

    const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const daysHtml = DAYS.map(d => {
        const isActive = outboundFreq.days.includes(d);
        return `<button class="rt-day-btn ${isActive ? 'active' : ''}" onclick="togglePlannerFlightDay('${route.id}', '${freq.id}', '${d}')">${d.substring(0, 2)}</button>`;
    }).join('');

    const assignedPlaneId = outboundFreq.assignedPlanes && outboundFreq.assignedPlanes.length > 0 ? outboundFreq.assignedPlanes[0] : null;
    const assignedPlane = assignedPlaneId ? gameState.fleet.find(p => p.id === assignedPlaneId) : null;
    const planeLabel = assignedPlane 
        ? `<span class="rt-plane-tag"><i class="ph-light ph-airplane-tilt"></i>${assignedPlane.registration} (${assignedPlane.name})</span>` 
        : `<span class="rt-no-plane"><i class="ph ph-warning-circle"></i>Sin aeronave asignada</span>`;

    body.innerHTML = `
        <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 700; font-size: 1.1rem; color: #fff;">EZE - ${destName}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); font-family: var(--font-mono);">${route.distance} NM</div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Código & Número de Vuelo</label>
            <div style="display: flex; gap: 8px;">
                <input type="text" class="rt-fnum-code" value="${outboundFreq.flightCode || 'AR'}" maxlength="3" style="width: 70px; text-align: center; font-family: var(--font-mono); font-weight: 700;" onchange="updatePlannerFlightCode('${route.id}', '${freq.id}', this.value)">
                <input type="text" class="rt-fnum-num" value="${outboundFreq.flightNumber || ''}" placeholder="0000" maxlength="4" style="flex: 1; font-family: var(--font-mono);" onchange="updatePlannerFlightNumber('${route.id}', '${freq.id}', this.value)">
            </div>
        </div>

        <div style="display: flex; gap: 12px;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Salida (Ida)</label>
                <input type="time" class="rt-select" value="${outboundFreq.time}" style="width: 100%; font-family: var(--font-mono);" onchange="updatePlannerFlightTime('${route.id}', '${outboundFreq.id}', this.value)">
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Salida (Regreso)</label>
                <input type="time" class="rt-select" value="${returnFreq ? returnFreq.time : '--:--'}" style="width: 100%; font-family: var(--font-mono);" ${returnFreq ? `onchange="updatePlannerFlightTime('${route.id}', '${returnFreq.id}', this.value)"` : 'disabled'}>
            </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Días de Operación (Ida)</label>
            <div style="display: flex; gap: 5px; justify-content: space-between;">
                ${daysHtml}
            </div>
            ${returnFreq && returnDayOffsetMins(route, outboundFreq) > 0 ? `<div style="font-size: 0.72rem; color: var(--accent); margin-top: 2px;"><i class="ph ph-info"></i> El vuelo de regreso llega el día siguiente.</div>` : ''}
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Aeronave Asignada</label>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <div>${planeLabel}</div>
                <button class="btn btn-secondary btn-sm" onclick="openPlaneSelector('${outboundFreq.id}', 'plannerDraft', '${route.id}')" style="font-size: 0.8rem; padding: 6px 12px;">
                    <i class="ph ph-airplane"></i> Cambiar
                </button>
            </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Servicio a Bordo</label>
            <select class="rt-select" onchange="updatePlannerFlightCatering('${route.id}', '${outboundFreq.id}', this.value)" style="width:100%;">
                <option value="none"     ${outboundFreq.catering === 'none' || !outboundFreq.catering ? 'selected' : ''}>Sin Catering ($0)</option>
                <option value="low_cost" ${outboundFreq.catering === 'low_cost' ? 'selected' : ''}>Low Cost (-$5/pax)</option>
                <option value="standard" ${outboundFreq.catering === 'standard' ? 'selected' : ''}>Estándar (-$15/pax)</option>
                <option value="luxury"   ${outboundFreq.catering === 'luxury'   ? 'selected' : ''}>Lujoso (-$40/pax)</option>
            </select>
        </div>

        <div style="margin-top: 12px; display: flex; gap: 8px;">
            <button class="btn btn-danger-subtle" onclick="deletePlannerFlight('${route.id}', '${freq.id}')" style="flex: 1; justify-content: center;">
                <i class="ph ph-trash"></i> Eliminar Vuelo
            </button>
            <button class="btn btn-primary" onclick="closePlannerFlightModal()" style="width: 100px; justify-content: center;">
                Aceptar
            </button>
        </div>
    `;
};

window.closePlannerFlightModal = () => {
    document.getElementById('planner-flight-modal').classList.add('hidden');
};

window.togglePlannerFlightDay = (routeId, freqId, dayStr) => {
    const route = plannerDraftRoutes.find(r => r.id === routeId);
    if (!route) return;
    let freq = route.frequencies.find(f => f.id === freqId);
    if (!freq) return;

    let outboundFreq = null;
    let returnFreq = null;

    if (!freq.isReturn) {
        outboundFreq = freq;
        returnFreq = route.frequencies.find(f => f.id === freq.pairedWith || f.pairedWith === freq.id);
    } else {
        returnFreq = freq;
        outboundFreq = route.frequencies.find(f => f.id === freq.pairedWith || f.pairedWith === freq.id);
    }

    if (!outboundFreq) return;

    if (outboundFreq.days.includes(dayStr)) {
        if (outboundFreq.days.length <= 1) {
            showToast('Planificador', 'El vuelo debe operar al menos un día a la semana.', 'warning');
            return;
        }
        outboundFreq.days = outboundFreq.days.filter(d => d !== dayStr);
    } else {
        outboundFreq.days.push(dayStr);
    }

    if (returnFreq) {
        const dist = route.distance || 0;
        const model = AIRCRAFT_MODELS.find(m => m.id === outboundFreq.modelId || m.name === outboundFreq.modelId);
        const durationHours = dist / getAircraftSpeed(model);
        const durationMinutes = Math.round(durationHours * 60);
        const turnaroundMins = getTurnaroundMins(model);
        const bufferMins = getScheduleBufferMins(durationMinutes);
        let boardingMins = 30;
        if (model) {
            if (model.capacity > 200) boardingMins = 45;
            else if (model.capacity < 100) boardingMins = 20;
        }

        const parts = outboundFreq.time.split(':');
        const fH = parseInt(parts[0], 10);
        const fM = parseInt(parts[1], 10);
        const outboundMins = fH * 60 + fM;

        let returnMinsTotal = outboundMins + durationMinutes + turnaroundMins + bufferMins + boardingMins;
        const rem = returnMinsTotal % 30;
        if (rem !== 0) returnMinsTotal += (30 - rem);

        const returnDayOffset = Math.floor(returnMinsTotal / (24 * 60));

        const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        returnFreq.days = outboundFreq.days.map(d => {
            const idx = DAYS.indexOf(d);
            return DAYS[(idx + returnDayOffset) % 7];
        });
    }

    plannerUnsavedChanges = true;
    renderPlanner();
    openPlannerFlightModal(routeId, freqId);
};

window.deletePlannerFlight = (routeId, freqId) => {
    if (!confirm('¿Eliminar esta frecuencia de vuelo (ida y vuelta)?')) return;
    const route = plannerDraftRoutes.find(r => r.id === routeId);
    if (!route) return;
    const freq = route.frequencies.find(f => f.id === freqId);
    if (!freq) return;

    const pairedId = freq.pairedWith || route.frequencies.find(f => f.pairedWith === freq.id)?.id;
    route.frequencies = route.frequencies.filter(f => f.id !== freqId && f.pairedWith !== freqId && f.id !== pairedId);

    plannerUnsavedChanges = true;
    closePlannerFlightModal();
    renderPlanner();
    showToast('Planificador', 'Frecuencia eliminada del borrador.', 'info');
};

window.updatePlannerFlightCode = (routeId, freqId, val) => {
    const route = plannerDraftRoutes.find(r => r.id === routeId);
    if (!route) return;
    const freq = route.frequencies.find(f => f.id === freqId);
    if (!freq) return;

    freq.flightCode = val.toUpperCase();
    plannerUnsavedChanges = true;

    const pairedId = freq.pairedWith || route.frequencies.find(f => f.pairedWith === freq.id)?.id;
    if (pairedId) {
        const paired = route.frequencies.find(f => f.id === pairedId);
        if (paired) paired.flightCode = val.toUpperCase();
    }
    renderPlanner();
};

window.updatePlannerFlightNumber = (routeId, freqId, val) => {
    const route = plannerDraftRoutes.find(r => r.id === routeId);
    if (!route) return;
    const freq = route.frequencies.find(f => f.id === freqId);
    if (!freq) return;

    freq.flightNumber = val;
    plannerUnsavedChanges = true;

    const pairedId = freq.pairedWith || route.frequencies.find(f => f.pairedWith === freq.id)?.id;
    if (pairedId) {
        const paired = route.frequencies.find(f => f.id === pairedId);
        if (paired) paired.flightNumber = val;
    }
    renderPlanner();
};

window.updatePlannerFlightCatering = (routeId, freqId, val) => {
    const route = plannerDraftRoutes.find(r => r.id === routeId);
    if (!route) return;
    const freq = route.frequencies.find(f => f.id === freqId);
    if (!freq) return;

    freq.catering = val;
    plannerUnsavedChanges = true;

    const pairedId = freq.pairedWith || route.frequencies.find(f => f.pairedWith === freq.id)?.id;
    if (pairedId) {
        const paired = route.frequencies.find(f => f.id === pairedId);
        if (paired) paired.catering = val;
    }
    renderPlanner();
};

window.updatePlannerFlightTime = (routeId, freqId, timeVal) => {
    const route = plannerDraftRoutes.find(r => r.id === routeId);
    if (!route) return;
    const freq = route.frequencies.find(f => f.id === freqId);
    if (!freq) return;

    freq.time = timeVal;
    plannerUnsavedChanges = true;

    const dist = route.distance || 0;
    const _m6955 = typeof freq !== 'undefined' ? AIRCRAFT_MODELS.find(m => m.id === freq.modelId || m.name === freq.modelId) : null;
    const durationHours = dist / getAircraftSpeed(_m6955);
    const durationMins = Math.round(durationHours * 60);

    if (!freq.isReturn) {
        const returnFreq = route.frequencies.find(f => f.pairedWith === freq.id || f.id === freq.pairedWith);
        if (returnFreq) {
            const timeParts = timeVal.split(':');
            const h = parseInt(timeParts[0], 10);
            const m = parseInt(timeParts[1], 10);
            const totalOutboundMins = h * 60 + m;

            const totalReturnMins = totalOutboundMins + durationMins + 60; 
            const retH = Math.floor(totalReturnMins / 60) % 24;
            const retM = totalReturnMins % 60;
            returnFreq.time = `${retH.toString().padStart(2, '0')}:${retM.toString().padStart(2, '0')}`;
        }
    } else {
        const outFreq = route.frequencies.find(f => f.id === freq.pairedWith || f.pairedWith === freq.id);
        if (outFreq) {
            const timeParts = timeVal.split(':');
            const h = parseInt(timeParts[0], 10);
            const m = parseInt(timeParts[1], 10);
            const totalReturnMins = h * 60 + m;

            let outTotalMins = totalReturnMins - 60 - durationMins;
            if (outTotalMins < 0) outTotalMins += 24 * 60;
            const outH = Math.floor(outTotalMins / 60) % 24;
            const outM = outTotalMins % 60;
            outFreq.time = `${outH.toString().padStart(2, '0')}:${outM.toString().padStart(2, '0')}`;
        }
    }

    renderPlanner();
    openPlannerFlightModal(routeId, freqId);
};

window.openOwnedAircraftDetail = (planeId) => {
    const plane = gameState.fleet.find(p => p.id === planeId);
    if (!plane) return;

    // Use the same modal logic as openAircraftDetail but customize it for an owned plane
    document.getElementById('ac-detail-name').innerText = plane.name;
    document.getElementById('ac-detail-type').innerText = plane.registration;
    document.getElementById('ac-detail-capacity').innerText = plane.capacity + ' pax';
    
    const maxSeatsLabel = document.getElementById('ac-detail-maxseats');
    if (maxSeatsLabel) {
        maxSeatsLabel.innerText = (plane.maxSeats || plane.capacity) + ' pax';
    }
    document.getElementById('ac-detail-range').innerText = plane.range + ' km';
    document.getElementById('ac-detail-profit').innerText = '+' + formatMoney(plane.dailyProfit) + '/día';
    document.getElementById('ac-detail-price').innerText = 'Propiedad de la aerolínea';
    
    const specs = AIRCRAFT_SPECS_LOOKUP[plane.id] || {
        speed: "---",
        ceiling: "---",
        fuelBurn: "---",
        engine: "---",
        wingspan: "---"
    };
    document.getElementById('ac-detail-speed').innerText = specs.speed;
    document.getElementById('ac-detail-ceiling').innerText = specs.ceiling;
    document.getElementById('ac-detail-fuel-burn').innerText = specs.fuelBurn;
    document.getElementById('ac-detail-engine').innerText = specs.engine;
    document.getElementById('ac-detail-wingspan').innerText = specs.wingspan;

    // Reset specifications accordion to default (collapsed)
    const expandedDiv = document.getElementById('detail-specs-expanded');
    const btnToggle = document.getElementById('btn-specs-toggle');
    if (expandedDiv && btnToggle) {
        expandedDiv.style.display = 'none';
        btnToggle.innerHTML = `<span>Ver m\u00e1s especificaciones</span> <i class="ph ph-caret-down"></i>`;
        btnToggle.classList.remove('active');
    }

    // Reset 3D model interaction button
    const btnInteract = document.getElementById('btn-interact-3d');
    if (btnInteract) {
        if (plane.modelUrl) {
            btnInteract.style.display = 'flex';
            btnInteract.innerHTML = `<i class="ph ph-hand-pointing"></i> Interactuar`;
            btnInteract.classList.remove('active');
        } else {
            btnInteract.style.display = 'none';
        }
    }

    if (typeof initCabinConfigurator !== 'undefined') {
        if (plane.seatConfig) {
             cabinConfig = { ...plane.seatConfig };
             cabinConfig.modelMaxSeats = plane.maxSeats || plane.capacity;
             updateCabinVisuals();
             document.getElementById('cabin-configurator-section').style.display = 'block';
        } else {
             initCabinConfigurator(plane);
        }
        
        const sliders = document.querySelectorAll('.cabin-divider');
        sliders.forEach(s => s.style.display = 'flex');
        const pitchControls = document.querySelectorAll('.pitch-segmented');
        pitchControls.forEach(p => p.style.display = 'flex');

        const section = document.getElementById('cabin-configurator-section');
        let saveBtn = document.getElementById('cabin-save-btn');
        if (!saveBtn) {
            saveBtn = document.createElement('button');
            saveBtn.id = 'cabin-save-btn';
            saveBtn.className = 'btn btn-primary';
            saveBtn.style.width = '100%';
            saveBtn.style.marginTop = '15px';
            saveBtn.innerHTML = '<i class="ph ph-floppy-disk"></i> Guardar Asignación de Asientos';
            section.appendChild(saveBtn);
        }
        saveBtn.style.display = 'block';
        saveBtn.onclick = () => {
            plane.seatConfig = { ...cabinConfig };
            showToast('Configuración Guardada', 'La asignación de asientos ha sido actualizada exitosamente.', 'success');
            // update original config variables just in case
            plane.capacity = parseInt(document.getElementById('cabin-total-seats').innerText);
            document.getElementById('ac-detail-capacity').innerText = plane.capacity + ' pax';
        };
    }

    document.getElementById('ac-detail-buy-btn').style.display = 'none'; // Hide Buy button
    const qtySelector = document.querySelector('.quantity-selector');
    if (qtySelector) qtySelector.style.display = 'none';
    document.getElementById('ac-detail-livery-btn').onclick = () => { 
        liveryEditor.open(plane.id); 
    };

    const visualHtml = plane.modelUrl
        ? `<model-viewer id="detail-model-owned-${plane.id}" src="${plane.modelUrl}" loading="lazy" auto-rotate shadow-intensity="1" style="width:100%;height:100%;background-color:transparent;" exposure="1.2" environment-image="neutral" interaction-prompt="none"></model-viewer>`
        : `<div id="detail-svg-owned-${plane.id}" class="svg-wrap" style="--plane-color: ${plane.customLivery && plane.customLivery.baseColor ? plane.customLivery.baseColor : plane.defaultColor}; width:100%; height:100%;">${plane.svg}</div>`;
    
    document.getElementById('ac-detail-visual').innerHTML = visualHtml;

    if (plane.modelUrl) {
        setTimeout(() => {
            const mv = document.getElementById(`detail-model-owned-${plane.id}`);
            if (mv) {
                const setCol = async () => {
                    if (mv.model && mv.model.materials) {
                        let customTexture = null;
                        if (plane.customLivery) {
                            try {
                                customTexture = await mv.createTexture(plane.customLivery);
                            } catch(e) { console.warn("Error creating texture", e); }
                        }
                        mv.model.materials.forEach(mat => {
                            if(mat.name.toLowerCase().includes('glass') || mat.name.toLowerCase().includes('window')) return;
                            if (plane.customLivery && customTexture) {
                                mat.pbrMetallicRoughness.setBaseColorFactor([1,1,1,1]);
                                if (mat.pbrMetallicRoughness.baseColorTexture) {
                                    mat.pbrMetallicRoughness.baseColorTexture.setTexture(customTexture);
                                }
                            }
                        });
                    }
                };
                if (mv.model) setCol(); else mv.addEventListener('load', setCol, {once:true});
            }
        }, 150);
    }

    closeFlightModal(); // close the flight modal so the new one opens nicely
    switchTab('aircraft-detail');
};

window.openUsedAircraftDetail = (usedId) => {
    const used = gameState.usedMarket.find(u => u.usedId === usedId);
    if (!used) return;
    const model = AIRCRAFT_MODELS.find(m => m.id === used.baseModelId);
    if (!model) return;

    document.getElementById('ac-detail-buy-btn').style.display = 'block';
    let saveBtn = document.getElementById('cabin-save-btn');
    if (saveBtn) saveBtn.style.display = 'none';

    const qtySelector = document.querySelector('.quantity-selector');
    if (qtySelector) qtySelector.style.display = 'none';

    document.getElementById('ac-detail-name').innerText = model.name + ` (Usado, ${used.age} años)`;
    document.getElementById('ac-detail-type').innerText = model.type;
    document.getElementById('ac-detail-capacity').innerText = (used.seatsFirst + used.seatsBusiness + used.seatsEco) + ' pax';
    const maxSeatsLabel = document.getElementById('ac-detail-maxseats');
    if (maxSeatsLabel) maxSeatsLabel.innerText = model.maxSeats + ' pax';
    document.getElementById('ac-detail-range').innerText = model.range + ' km';
    document.getElementById('ac-detail-profit').innerText = '+' + formatMoney(model.dailyProfit) + '/día';
    document.getElementById('ac-detail-price').innerText = formatMoney(used.price);

    const specs = AIRCRAFT_SPECS_LOOKUP[model.id] || { speed: "---", ceiling: "---", fuelBurn: "---", engine: "---", wingspan: "---" };
    document.getElementById('ac-detail-speed').innerText = specs.speed;
    document.getElementById('ac-detail-ceiling').innerText = specs.ceiling;
    document.getElementById('ac-detail-fuel-burn').innerText = specs.fuelBurn;
    document.getElementById('ac-detail-engine').innerText = specs.engine;
    document.getElementById('ac-detail-wingspan').innerText = specs.wingspan;

    const expandedDiv = document.getElementById('detail-specs-expanded');
    const btnToggle = document.getElementById('btn-specs-toggle');
    if (expandedDiv && btnToggle) {
        expandedDiv.style.display = 'none';
        btnToggle.innerHTML = `<span>Ver más especificaciones</span> <i class="ph ph-caret-down"></i>`;
        btnToggle.classList.remove('active');
    }

    if (typeof initCabinConfigurator !== 'undefined') {
        initCabinConfigurator(model);
        const total = model.maxSeats;
        const firstP = (used.seatsFirst / total) * 100;
        const bizP = (used.seatsBusiness / total) * 100;
        const ecoP = (used.seatsEco / total) * 100;
        cabinConfig.first = firstP;
        cabinConfig.business = bizP;
        cabinConfig.eco = ecoP;
        updateCabinVisuals();
        
        const sliders = document.querySelectorAll('.cabin-divider');
        sliders.forEach(s => s.style.display = 'none');
        const pitchControls = document.querySelectorAll('.pitch-segmented');
        pitchControls.forEach(p => p.style.display = 'none');
    }

    const visual = document.getElementById('ac-detail-visual');
    if (model.modelUrl) {
        visual.innerHTML = `<model-viewer src="${model.modelUrl}" loading="lazy" auto-rotate camera-controls shadow-intensity="1" exposure="1" environment-image="neutral" style="width:100%;height:100%;"></model-viewer>`;
    } else {
        visual.innerHTML = `<div style="--plane-color: ${used.color}; height: 100%; display: flex; align-items: center; justify-content: center;">${model.svg || ''}</div>`;
    }

    const liveryBtn = document.getElementById('ac-detail-livery-btn');
    if (liveryBtn) liveryBtn.style.display = 'none';

    document.getElementById('ac-detail-buy-btn').innerHTML = `<i class="ph ph-shopping-cart"></i> Adquirir Usado por ${formatMoney(used.price)}`;
    document.getElementById('ac-detail-buy-btn').onclick = () => {
        if (gameState.money >= used.price) {
            gameState.money -= used.price;
            const registration = generateRegistration();
            gameState.fleet.push({ 
                ...model, 
                id: Math.random().toString(36).substr(2, 9), 
                registration: registration,
                flightHours: 0,
                customLivery: null,
                savedColor: used.color,
                location: gameState.base ? gameState.base.id : 'EZE',
                age: used.age,
                seatsFirst: used.seatsFirst,
                seatsBusiness: used.seatsBusiness,
                seatsEco: used.seatsEco
            });
            gameState.usedMarket = gameState.usedMarket.filter(u => u.usedId !== usedId);
            
            logMsg(`Compra de usado procesada: ${model.name} (${used.age} años). Matrícula: ${registration}.`);
            showToast('Aeronave Usada Integrada', `El ${model.name} está listo para operar.`, 'success');
            
            updateUI(); 
            saveGame();
            document.getElementById('view-aircraft-detail').classList.remove('view-active');
            document.getElementById('view-aircraft-detail').classList.add('view');
            showUsedMarket();
        } else {
            showToast('Fondos Insuficientes', 'Balance negativo para esta transacción.', 'error');
        }
    };

    if (window.setHeaderBack) window.setHeaderBack(() => {
        switchTab('market');
        showUsedMarket();
    }, 'al Mercado de Usados');

    switchTab('aircraft-detail');
};

const openAircraftDetail = (modelId) => {
    document.getElementById('ac-detail-buy-btn').style.display = 'block';
    let saveBtn = document.getElementById('cabin-save-btn');
    if (saveBtn) saveBtn.style.display = 'none';
    const model = AIRCRAFT_MODELS.find(m => m.id === modelId);
    if (!model) return;

    const qtySelector = document.querySelector('.quantity-selector');
    if (qtySelector) qtySelector.style.display = 'flex';
    const qtyInput = document.getElementById('buy-qty-input');
    if (qtyInput) qtyInput.value = 1;
    window.activeDetailModelPrice = model.price;

    // Fill the page elements with model data
    document.getElementById('ac-detail-name').innerText = model.name;
    document.getElementById('ac-detail-type').innerText = model.type;
    document.getElementById('ac-detail-capacity').innerText = model.capacity + ' pax';
    const maxSeatsLabel = document.getElementById('ac-detail-maxseats');
    if (maxSeatsLabel) {
        maxSeatsLabel.innerText = (model.maxSeats || model.capacity) + ' pax';
    }
    document.getElementById('ac-detail-range').innerText = model.range + ' km';
    document.getElementById('ac-detail-profit').innerText = '+' + formatMoney(model.dailyProfit) + '/día';
    document.getElementById('ac-detail-price').innerText = formatMoney(model.price);
    
    // Fill expanded technical specifications
    const specs = AIRCRAFT_SPECS_LOOKUP[model.id] || {
        speed: "---",
        ceiling: "---",
        fuelBurn: "---",
        engine: "---",
        wingspan: "---"
    };
    document.getElementById('ac-detail-speed').innerText = specs.speed;
    document.getElementById('ac-detail-ceiling').innerText = specs.ceiling;
    document.getElementById('ac-detail-fuel-burn').innerText = specs.fuelBurn;
    document.getElementById('ac-detail-engine').innerText = specs.engine;
    document.getElementById('ac-detail-wingspan').innerText = specs.wingspan;

    // Reset specifications accordion to default (collapsed)
    const expandedDiv = document.getElementById('detail-specs-expanded');
    const btnToggle = document.getElementById('btn-specs-toggle');
    if (expandedDiv && btnToggle) {
        expandedDiv.style.display = 'none';
        btnToggle.innerHTML = `<span>Ver m\u00e1s especificaciones</span> <i class="ph ph-caret-down"></i>`;
        btnToggle.classList.remove('active');
    }

    // Reset 3D model interaction button
    const btnInteract = document.getElementById('btn-interact-3d');
    if (btnInteract) {
        if (model.modelUrl) {
            btnInteract.style.display = 'flex';
            btnInteract.innerHTML = `<i class="ph ph-hand-pointing"></i> Interactuar`;
            btnInteract.classList.remove('active');
        } else {
            btnInteract.style.display = 'none';
        }
    }

    if (typeof initCabinConfigurator !== 'undefined') {
        initCabinConfigurator(model);
        
        const sliders = document.querySelectorAll('.cabin-divider');
        sliders.forEach(s => s.style.display = 'flex');
        const pitchControls = document.querySelectorAll('.pitch-segmented');
        pitchControls.forEach(p => p.style.display = 'flex');
    }

    document.getElementById('ac-detail-buy-btn').innerHTML = `<i class="ph ph-shopping-cart"></i> Adquirir por ${formatMoney(model.price)}`;
    document.getElementById('ac-detail-buy-btn').onclick = () => { 
        const qtyInput = document.getElementById('buy-qty-input');
        const qtyVal = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
        buyAircraft(model.id, null, qtyVal); 
        switchTab('market'); 
    };
    document.getElementById('ac-detail-livery-btn').onclick = () => { 
        liveryEditor.open(model.id); 
    };

    // Remove camera-controls by default so user can scroll normally
    const visualHtml = model.modelUrl
        ? `<model-viewer id="detail-model-${model.id}" src="${model.modelUrl}" loading="lazy" auto-rotate shadow-intensity="1" style="width:100%;height:100%;background-color:transparent;" exposure="1.2" environment-image="neutral" interaction-prompt="none"></model-viewer>`
        : `<div id="detail-svg-${model.id}" class="svg-wrap" style="--plane-color: ${model.defaultColor}; width:100%; height:100%;">${model.svg}</div>`;
    
    document.getElementById('ac-detail-visual').innerHTML = visualHtml;



    switchTab('aircraft-detail');
};

window.toggleSpecsAccordion = () => {
    const expandedDiv = document.getElementById('detail-specs-expanded');
    const btn = document.getElementById('btn-specs-toggle');
    if (!expandedDiv || !btn) return;
    if (expandedDiv.style.display === 'none') {
        expandedDiv.style.display = 'block';
        btn.innerHTML = `<span>Ver menos especificaciones</span> <i class="ph ph-caret-up"></i>`;
        btn.classList.add('active');
    } else {
        expandedDiv.style.display = 'none';
        btn.innerHTML = `<span>Ver m\u00e1s especificaciones</span> <i class="ph ph-caret-down"></i>`;
        btn.classList.remove('active');
    }
};

window.toggle3DInteraction = () => {
    const mv = document.querySelector('.detail-visual-card model-viewer');
    const btn = document.getElementById('btn-interact-3d');
    if (!mv || !btn) return;
    if (mv.hasAttribute('camera-controls')) {
        mv.removeAttribute('camera-controls');
        btn.innerHTML = `<i class="ph ph-hand-pointing"></i> Interactuar`;
        btn.classList.remove('active');
    } else {
        mv.setAttribute('camera-controls', '');
        btn.innerHTML = `<i class="ph ph-lock-simple"></i> Bloquear`;
        btn.classList.add('active');
    }
};

window.adjustBuyQty = (delta) => {
    const qtyInput = document.getElementById('buy-qty-input');
    if (!qtyInput) return;
    let val = (parseInt(qtyInput.value) || 1) + delta;
    if (val < 1) val = 1;
    if (val > 99) val = 99;
    qtyInput.value = val;
    
    const buyBtn = document.getElementById('ac-detail-buy-btn');
    if (buyBtn && window.activeDetailModelPrice) {
        const total = window.activeDetailModelPrice * val;
        buyBtn.innerHTML = `<i class="ph ph-shopping-cart"></i> Adquirir por ${formatMoney(total)}`;
    }
};

// ==========================================
// CABIN CONFIGURATOR LOGIC
// ==========================================
let cabinConfig = {
    first: 10,
    business: 20,
    eco: 70,
    modelMaxSeats: 0
};

let draggingDivider = null;

function initCabinConfigurator(model) {
    const section = document.getElementById('cabin-configurator-section');
    if (!section) return;

    if (model.category !== 'commercial') {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    // Set default config (0 First, 20 Business, 80 Eco)
    cabinConfig.modelMaxSeats = model.maxSeats || model.capacity;
    cabinConfig.first = 0;
    cabinConfig.business = 20;
    cabinConfig.eco = 80;
    cabinConfig.pitchFirst = 'standard';
    cabinConfig.pitchBusiness = 'standard';
    cabinConfig.pitchEco = 'standard';

    // Reset radio buttons if they exist
    const radioFirst = document.getElementById('pitch-first-standard');
    if (radioFirst) radioFirst.checked = true;
    const radioBusiness = document.getElementById('pitch-business-standard');
    if (radioBusiness) radioBusiness.checked = true;
    const radioEco = document.getElementById('pitch-eco-standard');
    if (radioEco) radioEco.checked = true;
    
    updateCabinVisuals();
}

function updateCabinVisuals() {
    const zoneFirst = document.getElementById('zone-first');
    const zoneBusiness = document.getElementById('zone-business');
    const zoneEco = document.getElementById('zone-eco');
    
    zoneFirst.style.height = cabinConfig.first + '%';
    zoneBusiness.style.height = cabinConfig.business + '%';
    zoneEco.style.height = cabinConfig.eco + '%';
    
    // hide labels if too small
    zoneFirst.querySelector('.zone-content').style.display = cabinConfig.first < 10 ? 'none' : 'flex';
    zoneBusiness.querySelector('.zone-content').style.display = cabinConfig.business < 10 ? 'none' : 'flex';
    zoneEco.querySelector('.zone-content').style.display = cabinConfig.eco < 10 ? 'none' : 'flex';
    
    // Calculate seats
    // Total physical space = maxSeats
    const spaceFirst = (cabinConfig.first / 100) * cabinConfig.modelMaxSeats;
    const spaceBusiness = (cabinConfig.business / 100) * cabinConfig.modelMaxSeats;
    const spaceEco = (cabinConfig.eco / 100) * cabinConfig.modelMaxSeats;
    
    // Determine multipliers
    const multFirst = cabinConfig.pitchFirst === 'density' ? 3.0 : (cabinConfig.pitchFirst === 'spacious' ? 4.5 : 3.5);
    const multBusiness = cabinConfig.pitchBusiness === 'density' ? 1.6 : (cabinConfig.pitchBusiness === 'spacious' ? 2.5 : 2.0);
    const multEco = cabinConfig.pitchEco === 'density' ? 0.85 : (cabinConfig.pitchEco === 'spacious' ? 1.2 : 1.0);

    const seatsFirst = Math.floor(spaceFirst / multFirst);
    const seatsBusiness = Math.floor(spaceBusiness / multBusiness);
    const seatsEco = Math.floor(spaceEco / multEco);
    
    document.getElementById('cabin-first-seats').innerText = seatsFirst;
    document.getElementById('cabin-business-seats').innerText = seatsBusiness;
    document.getElementById('cabin-eco-seats').innerText = seatsEco;
    
    // Update card seats
    const cardFirst = document.getElementById('cabin-first-seats-card');
    if(cardFirst) cardFirst.innerText = seatsFirst;
    const cardBusiness = document.getElementById('cabin-business-seats-card');
    if(cardBusiness) cardBusiness.innerText = seatsBusiness;
    const cardEco = document.getElementById('cabin-eco-seats-card');
    if(cardEco) cardEco.innerText = seatsEco;

    document.getElementById('cabin-total-seats').innerText = (seatsFirst + seatsBusiness + seatsEco);

    // Update pill-desc
    const pillFirst = document.getElementById('pill-desc-first');
    if(pillFirst) pillFirst.innerText = multFirst.toFixed(1) + 'x esp.';
    const pillBusiness = document.getElementById('pill-desc-business');
    if(pillBusiness) pillBusiness.innerText = multBusiness.toFixed(1) + 'x esp.';
    const pillEco = document.getElementById('pill-desc-eco');
    if(pillEco) pillEco.innerText = multEco.toFixed(1) + 'x esp.';
}

window.updatePitch = function(cabinClass, pitchLevel) {
    if (cabinClass === 'first') cabinConfig.pitchFirst = pitchLevel;
    if (cabinClass === 'business') cabinConfig.pitchBusiness = pitchLevel;
    if (cabinClass === 'eco') cabinConfig.pitchEco = pitchLevel;
    updateCabinVisuals();
};

// Setup drag events
document.addEventListener('DOMContentLoaded', () => {
    const divider1 = document.getElementById('divider-1');
    const divider2 = document.getElementById('divider-2');
    const planeBody = document.getElementById('cabin-plane-body');
    
    if(!divider1 || !divider2 || !planeBody) return;
    
    let startY = 0;
    let startFirst = 0;
    let startBusiness = 0;
    let startEco = 0;
    
    const onMouseDown = (e, dividerIndex) => {
        draggingDivider = dividerIndex;
        startY = e.clientY || (e.touches && e.touches[0].clientY);
        startFirst = cabinConfig.first;
        startBusiness = cabinConfig.business;
        startEco = cabinConfig.eco;
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchmove', onMouseMove, {passive: false});
        document.addEventListener('touchend', onMouseUp);
        
        // Only prevent default for non-touch to avoid breaking scrolling unexpectedly if not handled properly, 
        // but since it's a drag handle we should prevent default to avoid text selection
        if(e.cancelable) e.preventDefault();
    };
    
    const onMouseMove = (e) => {
        if (!draggingDivider) return;
        if(e.cancelable) e.preventDefault();
        
        const currentY = e.clientY || (e.touches && e.touches[0].clientY);
        if(!currentY) return;
        
        const deltaY = currentY - startY;
        const bodyHeight = planeBody.getBoundingClientRect().height;
        const deltaPercent = (deltaY / bodyHeight) * 100;
        
        if (draggingDivider === 1) {
            // Divider 1 moves between First and Business
            let newFirst = startFirst + deltaPercent;
            let newBusiness = startBusiness - deltaPercent;
            
            if (newFirst < 0) {
                newBusiness += newFirst;
                newFirst = 0;
            }
            if (newBusiness < 0) {
                newFirst += newBusiness;
                newBusiness = 0;
            }
            
            cabinConfig.first = newFirst;
            cabinConfig.business = newBusiness;
            
        } else if (draggingDivider === 2) {
            // Divider 2 moves between Business and Eco
            let newBusiness = startBusiness + deltaPercent;
            let newEco = startEco - deltaPercent;
            
            if (newBusiness < 0) {
                newEco += newBusiness;
                newBusiness = 0;
            }
            if (newEco < 0) {
                newBusiness += newEco;
                newEco = 0;
            }
            
            cabinConfig.business = newBusiness;
            cabinConfig.eco = newEco;
        }
        
        updateCabinVisuals();
    };
    
    const onMouseUp = () => {
        draggingDivider = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('touchend', onMouseUp);
    };
    
    divider1.addEventListener('mousedown', (e) => onMouseDown(e, 1));
    divider1.addEventListener('touchstart', (e) => onMouseDown(e, 1), {passive: false});
    
    divider2.addEventListener('mousedown', (e) => onMouseDown(e, 2));
    divider2.addEventListener('touchstart', (e) => onMouseDown(e, 2), {passive: false});
});

// --- SISTEMA DE EMPLEADOS Y AEROLÍNEA ---

const EMPLOYEES_CONFIG = {
    pilots: { id: 'pilots', name: 'Pilotos (Comandantes)', baseSalary: 800, icon: 'ph-airplane' },
    copilots: { id: 'copilots', name: 'Copilotos (Primeros Oficiales)', baseSalary: 500, icon: 'ph-airplane-tilt' },
    cabin_crew: { id: 'cabin_crew', name: 'Tripulantes de Cabina', baseSalary: 200, icon: 'ph-coffee' },
    mechanics: { id: 'mechanics', name: 'Mecánicos e Ingenieros', baseSalary: 350, icon: 'ph-wrench' },
    airport_staff: { id: 'airport_staff', name: 'Personal de Aeropuerto', baseSalary: 150, icon: 'ph-briefcase' },
    admin: { id: 'admin', name: 'Administración y Finanzas', baseSalary: 250, icon: 'ph-calculator' },
    marketing: { id: 'marketing', name: 'Marketing y Ventas', baseSalary: 200, icon: 'ph-megaphone' }
};

const initEmployees = () => {
    if (!gameState.employees) {
        gameState.employees = {
            airlineName: 'Mi Aerolínea',
            airlineMotto: '"Volando hacia el futuro"',
            staff: {},
            logoIcon: 'ph-airplane-tilt',
            logoColor: '#0a84ff'
        };
        Object.keys(EMPLOYEES_CONFIG).forEach(key => {
            gameState.employees.staff[key] = {
                count: 0,
                salary: EMPLOYEES_CONFIG[key].baseSalary
            };
        });
        
        // Auto-hire initial minimums
        const reqs = calculateMinimumEmployees();
        Object.keys(reqs).forEach(key => {
            gameState.employees.staff[key].count = reqs[key];
        });
    }
    
    // Compatibility for existing saves that might have empty fields
    if (!gameState.employees.airlineName) gameState.employees.airlineName = 'Mi Aerolínea';
    if (!gameState.employees.airlineMotto) gameState.employees.airlineMotto = '"Volando hacia el futuro"';
    if (!gameState.employees.logoIcon) gameState.employees.logoIcon = 'ph-airplane-tilt';
    if (!gameState.employees.logoColor) gameState.employees.logoColor = '#0a84ff';
    
    // Add satisfaction if missing and auto-heal wildly inaccurate historical bugs
    Object.keys(EMPLOYEES_CONFIG).forEach(key => {
        if (gameState.employees.staff[key].satisfaction === undefined) {
            gameState.employees.staff[key].satisfaction = 100;
        } else if (window.getPredictedSatisfaction) {
            // Self-heal bugs instantly on load if the deviation is large (ignoring daily noise)
            const truth = window.getPredictedSatisfaction(key, gameState.employees.staff);
            if (Math.abs(gameState.employees.staff[key].satisfaction - truth) > 15) {
                gameState.employees.staff[key].satisfaction = truth;
            }
        }
    });
};

const calculateMinimumEmployees = () => {
    const planes = gameState.fleet ? gameState.fleet.length : 0;
    const activeRoutes = gameState.routes ? gameState.routes.filter(r => r.assignedPlanes && r.assignedPlanes.length > 0).length : 0;
    
    // Total passenger capacity of fleet
    let totalCapacity = 0;
    if (gameState.fleet) {
        gameState.fleet.forEach(p => {
            totalCapacity += p.capacity || (AIRCRAFT_MODELS.find(m => m.id === p.model)?.capacity || 0);
        });
    }

    return {
        pilots: planes * 5,
        copilots: planes * 5,
        cabin_crew: Math.floor(totalCapacity / 50) * 5,
        mechanics: planes * 3,
        airport_staff: activeRoutes * 4,
        admin: 5 + (planes * 1),
        marketing: 2 + (activeRoutes * 1)
    };
};

const getDailyEmployeesCost = () => {
    if (!gameState.employees || !gameState.employees.staff) return 0;
    let total = 0;
    Object.values(gameState.employees.staff).forEach(emp => {
        total += (emp.count * emp.salary);
    });
    return total;
};

const renderAirline = () => {
    initEmployees();
    
    // Update name and motto input cards
    const nameDisplay = document.getElementById('airline-name-display');
    const mottoDisplay = document.getElementById('airline-motto-display');
    if (nameDisplay) {
        nameDisplay.innerHTML = `${gameState.employees.airlineName} <button class="btn-icon-small" onclick="editAirlineName()"><i class="ph ph-pencil-simple"></i></button>`;
    }
    if (mottoDisplay) {
        mottoDisplay.innerHTML = `${gameState.employees.airlineMotto || '<i>Sin lema</i>'} <button class="btn-icon-small" onclick="editAirlineMotto()"><i class="ph ph-pencil-simple"></i></button>`;
    }

    // Render Base and Estimated Value
    const baseDisplay = document.getElementById('airline-base-display');
    if (baseDisplay) {
        baseDisplay.innerText = gameState.base ? gameState.base.id : 'EZE';
    }
    
    const valueDisplay = document.getElementById('airline-value-display');
    if (valueDisplay) {
        let estimatedValue = gameState.money;
        if (gameState.fleet) {
            gameState.fleet.forEach(p => {
                const model = AIRCRAFT_MODELS.find(m => m.id === p.model);
                if (model) {
                    estimatedValue += model.price;
                }
            });
        }
        valueDisplay.innerText = formatMoney(estimatedValue);
    }

    // Update Brand Customizer preview
    const logoPreview = document.getElementById('airline-logo-preview');
    if (logoPreview) {
        const logoIcon = gameState.employees.logoIcon || 'ph-airplane-tilt';
        const logoColor = gameState.employees.logoColor || '#0a84ff';
        
        logoPreview.className = `airline-logo-emblem`;
        logoPreview.innerHTML = `<i class="ph ph-${logoIcon.replace('ph-', '')}"></i>`;
        logoPreview.style.backgroundColor = `rgba(${hexToRgb(logoColor)}, 0.15)`;
        logoPreview.style.borderColor = logoColor;
        logoPreview.style.boxShadow = `0 8px 32px rgba(${hexToRgb(logoColor)}, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.1)`;
        logoPreview.style.color = logoColor;
    }

    // Set active states on customizer options
    document.querySelectorAll('.color-dot-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.boxShadow = '';
    });
    const selectedColor = gameState.employees.logoColor || '#0a84ff';
    const colorBtnMap = {
        '#0a84ff': 'color-blue',
        '#30d158': 'color-green',
        '#ffd60a': 'color-yellow',
        '#ff9f0a': 'color-orange',
        '#d32f2f': 'color-red',
        '#bf5af2': 'color-purple'
    };
    const activeColorClass = colorBtnMap[selectedColor];
    if (activeColorClass) {
        const activeBtn = document.querySelector(`.${activeColorClass}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.boxShadow = `0 0 15px ${selectedColor}`;
        }
    }

    document.querySelectorAll('.icon-select-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const selectedIcon = gameState.employees.logoIcon || 'ph-airplane-tilt';
    const activeIconBtn = document.getElementById(`icon-btn-${selectedIcon}`);
    if (activeIconBtn) {
        activeIconBtn.classList.add('active');
    }
    
    // Calculate global rating and HR summaries
    let totalSat = 0;
    let count = 0;
    let totalEmployees = 0;
    Object.values(gameState.employees.staff).forEach(emp => {
        totalEmployees += emp.count;
        if (emp.count > 0) {
            totalSat += emp.satisfaction;
            count++;
        }
    });
    
    let avgSat = count > 0 ? totalSat / count : 100;
    let rating = 1.0 + (avgSat / 100) * 4.0;
    
    let starsHtml = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    for(let i=0; i<5; i++) {
        if (i < fullStars) starsHtml += '<i class="ph-fill ph-star"></i>';
        else if (i === fullStars && hasHalfStar) starsHtml += '<i class="ph-fill ph-star-half"></i>';
        else starsHtml += '<i class="ph ph-star"></i>';
    }
    
    let ratingLabel = 'Aceptable';
    if (rating >= 4.5) ratingLabel = 'Excelente nivel de bienestar';
    else if (rating >= 3.5) ratingLabel = 'Buen ambiente laboral';
    else if (rating >= 2.5) ratingLabel = 'Operaciones inestables';
    else ratingLabel = 'Clima laboral crítico';
    
    // 1. Global Airline Rating Card
    renderAirlineReputationCard('airline-reputation-box');

    // Check for staffing shortages
    const minReqs = calculateMinimumEmployees();
    let shortage = false;
    Object.keys(minReqs).forEach(key => {
        const hired = gameState.employees.staff[key]?.count || 0;
        const required = minReqs[key];
        if (hired < required) {
            shortage = true;
        }
    });

    // 2. HR Summary Card
    const hrSummaryBox = document.getElementById('airline-hr-summary-box');
    if (hrSummaryBox) {
        let satisfactionColor = '#30d158'; // Green
        if (avgSat < 40) satisfactionColor = '#d32f2f'; // Red
        else if (avgSat < 75) satisfactionColor = '#ff9f0a'; // Orange

        let alertBadgeHtml = shortage ? `
            <div class="hr-alert-badge">
                <i class="ph-fill ph-warning"></i> Falta Personal
            </div>
        ` : '';

        hrSummaryBox.innerHTML = `
            <h3 class="bento-title"><i class="ph ph-users" style="color: var(--accent);"></i> Recursos Humanos</h3>
            ${alertBadgeHtml}
            <div class="hr-stats-row">
                <div class="hr-stat-col">
                    <span class="hr-stat-label">Total Empleados</span>
                    <span class="hr-stat-value">${totalEmployees}</span>
                </div>
                <div class="hr-stat-col">
                    <span class="hr-stat-label">Costo Diario</span>
                    <span class="hr-stat-value" style="color: #ff453a;">$${getDailyEmployeesCost().toLocaleString()}</span>
                </div>
            </div>
            <div class="hr-satisfaction-wrap" style="margin-top: auto;">
                <div class="hr-satisfaction-header">
                    <span>Clima Laboral</span>
                    <span>${Math.round(avgSat)}%</span>
                </div>
                <div class="hr-satisfaction-bar">
                    <div class="hr-satisfaction-fill" style="width: ${avgSat}%; background-color: ${satisfactionColor}; box-shadow: 0 0 8px ${satisfactionColor};"></div>
                </div>
            </div>
        `;
    }

    // 3. Operational Metrics
    const metricsGrid = document.getElementById('airline-metrics-grid-content');
    if (metricsGrid) {
        const fleetCount = gameState.fleet ? gameState.fleet.length : 0;
        const activeRoutes = gameState.routes ? gameState.routes.length : 0;
        
        let scheduledWeeklyFlights = 0;
        if (gameState.routes) {
            gameState.routes.forEach(r => {
                if (r.frequencies) {
                    scheduledWeeklyFlights += r.frequencies.length;
                }
            });
        }

        metricsGrid.innerHTML = `
            <div class="metric-grid-item">
                <div class="metric-icon-wrap" style="color: var(--accent);">
                    <i class="ph ph-airplane"></i>
                </div>
                <div class="metric-info">
                    <span class="metric-label">Flota Activa</span>
                    <span class="metric-value">${fleetCount}</span>
                </div>
            </div>
            <div class="metric-grid-item">
                <div class="metric-icon-wrap" style="color: #30d158;">
                    <i class="ph ph-globe"></i>
                </div>
                <div class="metric-info">
                    <span class="metric-label">Rutas Conectadas</span>
                    <span class="metric-value">${activeRoutes}</span>
                </div>
            </div>
            <div class="metric-grid-item">
                <div class="metric-icon-wrap" style="color: #ff9f0a;">
                    <i class="ph ph-calendar"></i>
                </div>
                <div class="metric-info">
                    <span class="metric-label">Vuelos Semanales</span>
                    <span class="metric-value">${scheduledWeeklyFlights}</span>
                </div>
            </div>
            <div class="metric-grid-item">
                <div class="metric-icon-wrap" style="color: #bf5af2;">
                    <i class="ph ph-coins"></i>
                </div>
                <div class="metric-info">
                    <span class="metric-label">Gasto Diario Personal</span>
                    <span class="metric-value">$${getDailyEmployeesCost().toLocaleString()}</span>
                </div>
            </div>
        `;
    }
};

window.toggleBrandCustomizer = () => {
    const customizer = document.getElementById('airline-brand-customizer');
    if (customizer) {
        customizer.classList.toggle('hidden');
    }
};

window.selectBrandColor = (colorHex, btnClass) => {
    gameState.employees.logoColor = colorHex;
    
    // Update active state in UI
    document.querySelectorAll('.color-dot-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.boxShadow = '';
    });
    const activeBtn = document.querySelector(`.${btnClass}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.boxShadow = `0 0 15px ${colorHex}`;
    }
    
    // Update preview emblem color
    const preview = document.getElementById('airline-logo-preview');
    if (preview) {
        preview.style.backgroundColor = `rgba(${hexToRgb(colorHex)}, 0.15)`;
        preview.style.borderColor = colorHex;
        preview.style.boxShadow = `0 8px 32px rgba(${hexToRgb(colorHex)}, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.1)`;
        preview.style.color = colorHex;
    }
    
    // Update top header brand icon color if it exists
    const headerIcon = document.querySelector('.header-brand-icon');
    if (headerIcon) {
        headerIcon.style.color = colorHex;
        headerIcon.style.textShadow = `0 0 8px ${colorHex}`;
    }
    
    saveGame();
};

window.selectBrandIcon = (iconClass) => {
    gameState.employees.logoIcon = iconClass;
    
    // Update active state in UI
    document.querySelectorAll('.icon-select-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`icon-btn-${iconClass}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Update preview emblem icon
    const preview = document.getElementById('airline-logo-preview');
    if (preview) {
        const iconElement = preview.querySelector('i');
        if (iconElement) {
            iconElement.className = `ph ph-${iconClass.replace('ph-', '')}`;
        }
    }
    
    // Update top header brand icon if it exists
    const headerIcon = document.querySelector('.header-brand-icon');
    if (headerIcon) {
        headerIcon.className = `ph-fill ph-${iconClass.replace('ph-', '')} header-brand-icon`;
    }
    
    saveGame();
};

// Helper function to convert HEX to RGB for transparency styles
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        (parseInt(result[1], 16) + ',' + parseInt(result[2], 16) + ',' + parseInt(result[3], 16))
        : '10, 132, 255';
}

window.editAirlineName = () => {
    const newName = prompt("Ingresá el nuevo nombre de la aerolínea:", gameState.employees.airlineName);
    if (newName && newName.trim() !== '') {
        gameState.employees.airlineName = newName.trim();
        renderAirline();
        // Update header as well
        const headerBrand = document.querySelector('.header-brand-name');
        if (headerBrand && headerBrand.innerText !== 'Volver') {
            headerBrand.innerText = gameState.employees.airlineName;
        }
        saveGame();
    }
};

window.editAirlineMotto = () => {
    const newMotto = prompt("Ingresá el nuevo lema:", gameState.employees.airlineMotto);
    if (newMotto !== null) {
        gameState.employees.airlineMotto = newMotto.trim() !== '' ? `"${newMotto.trim()}"` : '';
        renderAirline();
        saveGame();
    }
};

window.employeesDraft = null;

const renderEmployees = () => {
    initEmployees();
    const grid = document.getElementById('employees-grid');
    if (!grid) return;
    
    if (!window.employeesDraft) {
        window.employeesDraft = JSON.parse(JSON.stringify(gameState.employees.staff));
    }
    
    const reqs = calculateMinimumEmployees();
    const staff = window.employeesDraft;
    
    let html = '';
    let allMet = true;
    let hasDraftChanges = false;
    let totalDraftCost = 0;
    
    Object.keys(EMPLOYEES_CONFIG).forEach(key => {
        const config = EMPLOYEES_CONFIG[key];
        const current = staff[key];
        const original = gameState.employees.staff[key];
        const req = reqs[key];
        
        const isMet = current.count >= req;
        if (!isMet) allMet = false;
        const cost = current.count * current.salary;
        totalDraftCost += cost;
        
        const isChanged = current.count !== original.count || current.salary !== original.salary;
        if (isChanged) hasDraftChanges = true;
        
        let displaySat = original.satisfaction;
        let isPrediction = false;
        
        if (isChanged) {
            const draftTarget = window.getPredictedSatisfaction(key, staff);
            displaySat = draftTarget; // Absolute truth, no historical lag
            isPrediction = true;
        }
        
        let satColor = '#30d158'; // Green
        let satText = 'Motivados';
        if (displaySat < 40) {
            satColor = '#d32f2f'; // Red
            satText = 'Descontentos';
        } else if (displaySat < 75) {
            satColor = '#ff9f0a'; // Orange
            satText = 'Estables';
        }
        
        html += `
            <div class="employee-card ${isChanged ? 'draft-mode' : ''} fade-in">
                <div class="employee-left-col">
                    <div class="employee-avatar-emblem">
                        <i class="ph ph-${config.icon.replace('ph-', '')}"></i>
                    </div>
                    <div class="employee-role-details">
                        <div class="employee-role-title">
                            ${config.name}
                            ${isChanged ? '<span class="employee-draft-badge">Borrador</span>' : ''}
                        </div>
                        <div class="employee-role-desc ${isMet ? 'text-muted' : 'text-danger'}">
                            ${isMet ? `<i class="ph ph-check-circle" style="color:#30d158; margin-right:4px;"></i> Mínimo cubierto (${req})` : `<i class="ph ph-warning-circle" style="color:#ff453a; margin-right:4px;"></i> Faltan empleados (Mínimo: ${req})`}
                        </div>
                    </div>
                </div>
                
                <div class="employee-qty-adjuster">
                    <span class="adjuster-label">Cantidad</span>
                    <div class="adjuster-controls">
                        <button class="adjuster-btn" onclick="adjustEmployeeCount('${key}', -1)">-</button>
                        <span class="adjuster-value mono">${current.count}</span>
                        <button class="adjuster-btn" onclick="adjustEmployeeCount('${key}', 1)">+</button>
                    </div>
                </div>
                
                <div class="employee-salary-adjuster">
                    <span class="adjuster-label">Salario Diario</span>
                    <div class="adjuster-controls">
                        <button class="adjuster-btn" onclick="adjustEmployeeSalary('${key}', -10)">-</button>
                        <span class="adjuster-value mono">$${current.salary}</span>
                        <button class="adjuster-btn" onclick="adjustEmployeeSalary('${key}', 10)">+</button>
                    </div>
                </div>
                
                <div style="min-width: 90px; display: flex; flex-direction: column;">
                    <span class="adjuster-label">Costo Total</span>
                    <span class="mono" style="font-size: 1.1rem; font-weight:700; color:#ffffff; margin-top:4px;">$${cost.toLocaleString()}</span>
                </div>
                
                <div class="employee-satisfaction-col">
                    <div class="hr-satisfaction-wrap">
                        <div class="hr-satisfaction-header">
                            <span>Clima ${isPrediction ? '<span style="color:var(--accent); font-size:0.65rem;"><i class="ph ph-magic-wand"></i> Proy.</span>' : ''}</span>
                            <span style="color: ${satColor}; font-weight:700;">${displaySat}%</span>
                        </div>
                        <div class="hr-satisfaction-bar">
                            <div class="hr-satisfaction-fill" style="width: ${displaySat}%; background-color: ${satColor}; box-shadow: 0 0 8px ${satColor};"></div>
                        </div>
                        <div style="font-size: 0.65rem; color: #64748b; text-align: right; text-transform: uppercase; font-weight:600; margin-top:1px;">${satText}</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
    
    const statusBar = document.getElementById('employees-global-status');
    if (statusBar) {
        statusBar.style.background = '';
        statusBar.style.borderColor = '';
        statusBar.style.color = '';
        
        if (hasDraftChanges) {
            statusBar.className = 'employees-status-bar draft-active';
            statusBar.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%; flex-wrap:wrap; gap:12px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="ph-fill ph-info" style="font-size: 1.5rem; color: #0a84ff;"></i>
                        <span style="font-weight: 500;">Tienes cambios sin guardar en la dotación de personal.</span>
                    </div>
                    <div style="display:flex; gap:12px;">
                        <button class="btn btn-secondary btn-sm" onclick="cancelEmployeeChanges()">Cancelar</button>
                        <button class="btn btn-primary btn-sm" onclick="confirmEmployeeChanges()">Aplicar Cambios</button>
                    </div>
                </div>
            `;
        } else if (allMet) {
            statusBar.className = 'employees-status-bar all-met';
            statusBar.innerHTML = `<i class="ph-fill ph-check-circle" style="font-size: 1.5rem;"></i><span style="font-weight: 500;">Todo el personal mínimo está cubierto. Operaciones normales.</span>`;
        } else {
            statusBar.className = 'employees-status-bar shortage';
            statusBar.innerHTML = `<i class="ph-fill ph-warning-circle" style="font-size: 1.5rem;"></i><span style="font-weight: 500;">Alerta: Falta personal. Contratá más empleados para evitar retrasos y penalizaciones.</span>`;
        }
    }
    
    const costElement = document.getElementById('emp-total-cost');
    if (costElement) {
        costElement.innerText = formatMoney(totalDraftCost);
    }
};

window.adjustEmployeeCount = (key, delta) => {
    window.employeesDraft[key].count = Math.max(0, window.employeesDraft[key].count + delta);
    renderEmployees();
};

window.setEmployeeCount = (key, val) => {
    const parsed = parseInt(val);
    if (!isNaN(parsed) && parsed >= 0) {
        window.employeesDraft[key].count = parsed;
    }
    renderEmployees();
};

window.adjustEmployeeSalary = (key, delta) => {
    window.employeesDraft[key].salary = Math.max(50, window.employeesDraft[key].salary + delta);
    renderEmployees();
};

window.setEmployeeSalary = (key, val) => {
    const parsed = parseInt(val);
    if (!isNaN(parsed) && parsed >= 50) {
        window.employeesDraft[key].salary = parsed;
    }
    renderEmployees();
};

window.confirmEmployeeChanges = () => {
    if (!window.employeesDraft) return;
    
    // Apply absolute projected satisfaction instantly for feedback
    Object.keys(EMPLOYEES_CONFIG).forEach(key => {
        const currentDraft = window.employeesDraft[key];
        const original = gameState.employees.staff[key];
        if (currentDraft.count !== original.count || currentDraft.salary !== original.salary) {
            const draftTarget = window.getPredictedSatisfaction(key, window.employeesDraft);
            currentDraft.satisfaction = draftTarget;
        }
    });
    
    gameState.employees.staff = JSON.parse(JSON.stringify(window.employeesDraft));
    window.employeesDraft = null;
    
    showToast('Personal Actualizado', 'Tus cambios han sido aplicados.', 'success');
    renderEmployees();
    renderAirline(); // Updates global rating
    saveGame();
    updateUI();
};

window.cancelEmployeeChanges = () => {
    window.employeesDraft = null;
    renderEmployees();
};

window.getPredictedSatisfaction = (key, staffState) => {
    const config = EMPLOYEES_CONFIG[key];
    const current = staffState[key];
    const reqs = calculateMinimumEmployees();
    
    const planes = gameState.fleet ? gameState.fleet.length : 0;
    const activeRoutes = gameState.routes ? gameState.routes.filter(r => r.assignedPlanes && r.assignedPlanes.length > 0).length : 0;
    
    // Corporate stress scales logarithmically with airline size
    const corporateStress = Math.min(40, (Math.log10(planes + 1) * 8) + (Math.log10(activeRoutes + 1) * 8));
    
    let targetSatisfaction = 90; // Base: Nivel excelente si todo está perfecto.
    
    // Salary Boost: No caps, making it possible to buy happiness
    const salaryRatio = current.salary / config.baseSalary;
    if (salaryRatio > 1.0) {
        // Boost linearly so it doesn't break, but allows reaching 100 easily if overpaid
        // e.g. 1.5x -> +25 points
        targetSatisfaction += (salaryRatio - 1.0) * 50;
    } else if (salaryRatio < 1.0) {
        targetSatisfaction -= (1.0 - salaryRatio) * 120; // Penaliza fuertemente el bajo salario
    }
    
    // Staffing Boost
    const required = reqs[key];
    if (required > 0) {
        const countRatio = current.count / required;
        if (countRatio < 1.0) {
            targetSatisfaction -= (1.0 - countRatio) * 80; // Missing 50% = -40
        } else if (countRatio > 1.0) {
            // Overstaffing provides relief up to +30 points
            targetSatisfaction += Math.min(30, (countRatio - 1.0) * 30);
        }
    } else {
        targetSatisfaction += 10;
    }
    
    targetSatisfaction -= corporateStress;
    return Math.max(0, Math.min(100, Math.round(targetSatisfaction)));
};

const calculateDailySatisfaction = () => {
    if (!gameState.employees) return;
    const staff = gameState.employees.staff;
    
    Object.keys(EMPLOYEES_CONFIG).forEach(key => {
        let current = staff[key];
        let targetSatisfaction = window.getPredictedSatisfaction(key, staff);
        
        // Factor Aleatorio Diario (Ruido de -4 a +4)
        const noise = (Math.random() * 8) - 4;
        targetSatisfaction += noise;
        
        // Asignación absoluta: elimina totalmente el "lag" histórico y los estados congelados/bugueados
        current.satisfaction = Math.max(0, Math.min(100, Math.round(targetSatisfaction)));
    });
};

window.processDailyEmployeesCost = () => {
    const cost = getDailyEmployeesCost();
    if (cost > 0) {
        gameState.money -= cost;
        if (!isCatchingUp) {
            logMsg(`Pago de salarios: -$${formatMoney(cost)} diarios.`, 'alert');
        }
    }
    
    calculateDailySatisfaction();
    
    // Check if minimums are met to apply penalties and check quits
    if (gameState.employees) {
        const reqs = calculateMinimumEmployees();
        let unmet = false;
        let quitOccurred = false;
        
        Object.keys(EMPLOYEES_CONFIG).forEach(key => {
            const current = gameState.employees.staff[key];
            if (current.count < reqs[key]) unmet = true;
            
            // Renuncias aleatorias por baja satisfacción
            if (current.satisfaction < 30 && current.count > 0) {
                // Probabilidad de renuncia escala con la infelicidad
                const quitProb = (30 - current.satisfaction) * 0.01; // Max 0.3 (30%) if 0 sat
                if (Math.random() < quitProb) {
                    const quitCount = Math.max(1, Math.floor(current.count * 0.05)); // Pierden 5% de la plantilla o 1
                    current.count = Math.max(0, current.count - quitCount);
                    quitOccurred = true;
                    if (!isCatchingUp) {
                        logMsg(`🚨 Renuncia masiva: ${quitCount} ${EMPLOYEES_CONFIG[key].name} han renunciado por malas condiciones laborales.`, 'danger');
                    }
                }
            }
        });
        
        if (unmet) {
            // Apply penalty: e.g. delay factor or log warning
            if (!isCatchingUp) {
                logMsg(`⚠️ Falta personal en la aerolínea. Esto aumentará los retrasos y quejas de los clientes. Contratá más empleados.`, 'alert');
                if (!quitOccurred) showToast('Falta Personal', 'Tus operaciones están sufriendo demoras.', 'error');
            }
        }
        
        if (quitOccurred && !isCatchingUp) {
            showToast('Huelga / Renuncias', 'Empleados descontentos han abandonado la aerolínea.', 'error');
        }
    }
};

// ==========================================================================
// DASHBOARD CUSTOMIZATION & DRAG-AND-DROP SYSTEM
// ==========================================================================

let isBentoEditMode = false;
let draggedCard = null;
let placeholder = null;
let dragOffset = { x: 0, y: 0 };
let activePointerId = null;

const applyBentoLayoutOrder = () => {
    const grid = document.getElementById('dashboard-bento-grid');
    if (!grid) return;

    const defaultOrder = [
        'dash-finance-card',
        'dash-fuel-card',
        'dash-delay-index',
        'dash-fleet-card',
        'dash-live-flight',
        'dash-actions-card',
        'dash-activity-card'
    ];

    const order = gameState.bentoCardsOrder || defaultOrder;

    const cardNodes = {};
    order.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            cardNodes[id] = el;
        }
    });

    order.forEach(id => {
        if (cardNodes[id]) {
            grid.appendChild(cardNodes[id]);
        }
    });

    // Handle any extra cards not present in the order list (future-proofing)
    Array.from(grid.children).forEach(child => {
        if (child.id && !order.includes(child.id) && child.classList.contains('bento-box')) {
            grid.appendChild(child);
        }
    });
};

const saveBentoLayoutOrder = () => {
    const grid = document.getElementById('dashboard-bento-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.bento-box'));
    const order = cards.map(card => card.id).filter(id => id);

    gameState.bentoCardsOrder = order;
    saveGame();
};

const enterBentoEditMode = () => {
    if (isBentoEditMode) return;
    isBentoEditMode = true;

    if (navigator.vibrate) {
        navigator.vibrate(50);
    }

    const grid = document.getElementById('dashboard-bento-grid');
    if (grid) {
        grid.classList.add('editing-active');
        const cards = grid.querySelectorAll('.bento-box');
        cards.forEach(card => card.classList.add('editing-active'));
    }

    const banner = document.getElementById('bento-edit-banner');
    if (banner) {
        banner.classList.add('active');
    }

    // Update main header button to active state
    const editBtn = document.getElementById('edit-layout-btn');
    if (editBtn) {
        editBtn.innerHTML = '<i class="ph-bold ph-check" style="color: var(--money);"></i> Listo';
        editBtn.classList.add('btn-active');
    }

    // Capture and prevent normal clicks on dashboard bento boxes in edit mode
    document.addEventListener('click', blockBentoClicksDuringEdit, true);

    // Click outside to close edit mode (with a slight delay to prevent instant closing)
    setTimeout(() => {
        document.addEventListener('click', handleBentoOutsideClick, true);
    }, 50);

    showToast('Personalización', 'Mantené y arrastrá las tarjetas para reordenarlas.', 'info');
};

const exitBentoEditMode = () => {
    if (!isBentoEditMode) return;
    isBentoEditMode = false;

    const grid = document.getElementById('dashboard-bento-grid');
    if (grid) {
        grid.classList.remove('editing-active');
        const cards = grid.querySelectorAll('.bento-box');
        cards.forEach(card => card.classList.remove('editing-active'));
    }

    const banner = document.getElementById('bento-edit-banner');
    if (banner) {
        banner.classList.remove('active');
    }

    // Restore header button to default state
    const editBtn = document.getElementById('edit-layout-btn');
    if (editBtn) {
        editBtn.innerHTML = '<i class="ph ph-squares-four"></i> Personalizar Inicio';
        editBtn.classList.remove('btn-active');
    }

    document.removeEventListener('click', blockBentoClicksDuringEdit, true);
    document.removeEventListener('click', handleBentoOutsideClick, true);

    saveBentoLayoutOrder();
    showToast('Personalización', 'Orden guardado correctamente.', 'success');
};

const toggleBentoEditMode = () => {
    if (isBentoEditMode) {
        exitBentoEditMode();
    } else {
        enterBentoEditMode();
    }
};

const blockBentoClicksDuringEdit = (e) => {
    if (isBentoEditMode) {
        const card = e.target.closest('#dashboard-bento-grid > .bento-box');
        // Allow clicks on buttons inside edit banner and header buttons, block clicks inside the cards themselves
        if (card && !e.target.closest('.bento-edit-banner') && !e.target.closest('#edit-layout-btn')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
};

const handleBentoOutsideClick = (e) => {
    if (!isBentoEditMode) return;
    if (draggedCard) return; // ignore during drag operations

    const clickedBento = e.target.closest('#dashboard-bento-grid > .bento-box');
    const clickedButton = e.target.closest('#edit-layout-btn');
    const clickedBanner = e.target.closest('#bento-edit-banner');

    if (!clickedBento && !clickedButton && !clickedBanner) {
        exitBentoEditMode();
    }
};

// Check intersection of pointer coordinates with bento card bounds
const getHoveredCard = (x, y) => {
    const cards = Array.from(document.querySelectorAll('#dashboard-bento-grid > .bento-box:not(.dragging)'));
    for (const card of cards) {
        const rect = card.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            return card;
        }
    }
    return null;
};

const startBentoDrag = (card, e) => {
    if (draggedCard) return;
    draggedCard = card;
    activePointerId = e.pointerId;

    const rect = card.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    placeholder = document.createElement('div');
    placeholder.className = 'bento-placeholder';
    placeholder.style.gridColumn = window.getComputedStyle(card).gridColumn;
    placeholder.style.height = `${rect.height}px`;

    card.parentNode.insertBefore(placeholder, card);

    card.classList.add('dragging');
    card.style.position = 'fixed';
    card.style.width = `${rect.width}px`;
    card.style.height = `${rect.height}px`;
    card.style.left = `${rect.left}px`;
    card.style.top = `${rect.top}px`;
    card.style.zIndex = '10000';

    try {
        card.setPointerCapture(e.pointerId);
    } catch (err) {
        console.warn("Could not set pointer capture", err);
    }

    card.addEventListener('pointermove', onBentoDragMove);
    card.addEventListener('pointerup', onBentoDragEnd);
    card.addEventListener('pointercancel', onBentoDragEnd);
};

const onBentoDragMove = (e) => {
    if (!draggedCard || e.pointerId !== activePointerId) return;

    draggedCard.style.left = `${e.clientX - dragOffset.x}px`;
    draggedCard.style.top = `${e.clientY - dragOffset.y}px`;

    // Retrieve hovered card dynamically via boundary checking
    const targetCard = getHoveredCard(e.clientX, e.clientY);

    if (targetCard && targetCard !== draggedCard && targetCard !== placeholder) {
        const parent = targetCard.parentNode;
        const children = Array.from(parent.children);
        const placeholderIdx = children.indexOf(placeholder);
        const targetIdx = children.indexOf(targetCard);

        if (targetIdx !== -1 && placeholderIdx !== -1 && targetIdx !== placeholderIdx) {
            flipLayout(() => {
                if (targetIdx > placeholderIdx) {
                    parent.insertBefore(placeholder, targetCard.nextSibling);
                } else {
                    parent.insertBefore(placeholder, targetCard);
                }
            });
        }
    }
};

const onBentoDragEnd = (e) => {
    if (!draggedCard || e.pointerId !== activePointerId) return;

    draggedCard.removeEventListener('pointermove', onBentoDragMove);
    draggedCard.removeEventListener('pointerup', onBentoDragEnd);
    draggedCard.removeEventListener('pointercancel', onBentoDragEnd);

    try {
        draggedCard.releasePointerCapture(e.pointerId);
    } catch (err) {}

    flipLayout(() => {
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(draggedCard, placeholder);
            placeholder.parentNode.removeChild(placeholder);
        }

        draggedCard.classList.remove('dragging');
        draggedCard.style.position = '';
        draggedCard.style.width = '';
        draggedCard.style.height = '';
        draggedCard.style.left = '';
        draggedCard.style.top = '';
        draggedCard.style.zIndex = '';
    });

    draggedCard = null;
    placeholder = null;
    activePointerId = null;

    saveBentoLayoutOrder();
};

const flipLayout = (action) => {
    const grid = document.getElementById('dashboard-bento-grid');
    if (!grid) {
        action();
        return;
    }

    const cards = Array.from(grid.querySelectorAll('.bento-box'));
    const firstPos = cards.map(card => {
        return {
            el: card,
            rect: card.getBoundingClientRect()
        };
    });

    action();

    firstPos.forEach(item => {
        if (item.el.classList.contains('dragging') || item.el.classList.contains('bento-placeholder')) return;

        const lastRect = item.el.getBoundingClientRect();
        const firstRect = item.rect;

        const dx = firstRect.left - lastRect.left;
        const dy = firstRect.top - lastRect.top;

        if (dx !== 0 || dy !== 0) {
            item.el.style.transition = 'none';
            item.el.style.transform = `translate(${dx}px, ${dy}px)`;

            // Force browser layout reflow
            item.el.offsetHeight;

            item.el.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
            item.el.style.transform = '';
        }
    });
};

const initBentoCustomization = () => {
    const grid = document.getElementById('dashboard-bento-grid');
    if (!grid) return;

    grid.addEventListener('pointerdown', (e) => {
        const card = e.target.closest('#dashboard-bento-grid > .bento-box');
        if (!card) return;

        // Ignore clicks on buttons/inputs
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input') || e.target.closest('select')) {
            return;
        }

        const startX = e.clientX;
        const startY = e.clientY;
        let hasMoved = false;

        if (isBentoEditMode) {
            e.preventDefault();
            startBentoDrag(card, e);
        } else {
            const longPressTimer = setTimeout(() => {
                if (!hasMoved) {
                    enterBentoEditMode();
                    startBentoDrag(card, e);
                }
            }, 600);

            const onPointerMove = (moveEvt) => {
                if (Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY) > 8) {
                    hasMoved = true;
                    clearTimeout(longPressTimer);
                }
            };

            const onPointerUp = () => {
                clearTimeout(longPressTimer);
                document.removeEventListener('pointermove', onPointerMove);
                document.removeEventListener('pointerup', onPointerUp);
                document.removeEventListener('pointercancel', onPointerUp);
            };

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        }
    });
};

// Expose functions to window scope for HTML inline handlers
window.toggleBentoEditMode = toggleBentoEditMode;
window.enterBentoEditMode = enterBentoEditMode;
window.exitBentoEditMode = exitBentoEditMode;

document.addEventListener('DOMContentLoaded', () => {
    initBentoCustomization();
});

// =========================================
// STORE / MEJORAS LOGIC
// =========================================

window.buyUpgrade = (upgradeId, cost) => {
    if (gameState.money >= cost) {
        if (upgradeId === 'extraHubs') {
            gameState.upgrades[upgradeId] = (gameState.upgrades[upgradeId] || 0) + 1;
            gameState.money -= cost;
            showToast('Concesión de Nuevo Hub adquirida. Capacidad expandida.', 'success');
        } else if (!gameState.upgrades[upgradeId]) {
            gameState.upgrades[upgradeId] = true;
            gameState.money -= cost;
            showToast('Mejora adquirida con éxito.', 'success');
            if (upgradeId === 'militaryAccess') {
                showToast('Licencia Militar activada. Ya puedes acceder al mercado militar.', 'info');
            }
        } else {
            showToast('Ya posees esta mejora.', 'warning');
            return;
        }
        updateUI();
        if(window.updateStoreUI) window.updateStoreUI();
        saveGame();
    } else {
        showToast('Fondos insuficientes para esta mejora.', 'error');
    }
};

window.updateStoreUI = () => {
    const b = document.getElementById('store-current-balance');
    if (b) b.innerText = formatMoney(gameState.money);

    const checkOwned = (id, key) => {
        const card = document.getElementById(id);
        if (!card) return;
        if (gameState.upgrades && gameState.upgrades[key]) {
            card.classList.add('owned');
            const btn = card.querySelector('.btn');
            if(btn) btn.innerText = 'Comprado';
        }
    };
    checkOwned('upgrade-atc', 'atcPriority');
    checkOwned('upgrade-pax', 'paxSatisfaction');
    checkOwned('upgrade-military', 'militaryAccess');
    // extraHubs can be bought multiple times, so we don't disable it unless there's a hard limit.
    const hubCard = document.getElementById('upgrade-hub');
    if (hubCard && gameState.upgrades && gameState.upgrades.extraHubs > 0) {
        const btn = hubCard.querySelector('.btn');
        if(btn) btn.innerText = `Adquirir (${gameState.upgrades.extraHubs} adquiridos)`;
    }
};

window.renderMenuScreen = () => {
    // Update airline name and motto from game state
    const nameEl = document.getElementById('menu-hero-airline-name');
    const mottoEl = document.getElementById('menu-hero-motto');
    const emblemEl = document.getElementById('menu-hero-emblem');

    if (nameEl && gameState.employees) {
        nameEl.innerText = gameState.employees.airlineName || 'Mi Aerolínea';
    }
    if (mottoEl && gameState.employees) {
        mottoEl.innerText = gameState.employees.airlineMotto || '"Volando hacia el futuro"';
    }
    if (emblemEl && gameState.employees) {
        const iconClass = gameState.employees.logoIcon || 'ph-airplane-tilt';
        const iconColor = gameState.employees.logoColor || '#0a84ff';
        emblemEl.style.background = `${iconColor}22`;
        emblemEl.style.color = iconColor;
        emblemEl.style.boxShadow = `0 0 30px ${iconColor}44`;
        emblemEl.innerHTML = `<i class="ph ${iconClass}"></i>`;
    }
};

window.renderStats = () => {
    if (!gameState.stats) return;
    const s = gameState.stats;
    const t = gameState.time || { day: 1 };

    // Company age
    const ageLabel = document.getElementById('stats-company-age');
    if (ageLabel) {
        const foundingDay = s.foundingDay || 1;
        const daysOp = Math.max(0, t.day - foundingDay);
        ageLabel.innerText = `Operando desde el Día ${foundingDay} — ${daysOp} días en operación`;
    }

    // KPI cards
    const safe = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    const fmt = (n) => new Intl.NumberFormat('es-AR').format(n || 0);

    safe('stat-total-flights', fmt(s.totalFlights));
    safe('stat-total-pax', fmt(s.totalPassengers));
    safe('stat-total-revenue', '$' + fmt(s.totalRevenue));
    safe('stat-fleet-size', gameState.fleet ? gameState.fleet.length : 0);

    // Operations
    const activeRoutes = gameState.routes ? gameState.routes.filter(r => r.active !== false) : [];
    const totalFreqs = activeRoutes.reduce((sum, r) => sum + (r.frequencies ? r.frequencies.reduce((s2, f) => s2 + (f.days ? f.days.length : 0), 0) : 0), 0);
    const inFlight = gameState.activeDispatches ? gameState.activeDispatches.filter(d => d.phase === 'flight').length : 0;
    const inTurnaround = gameState.activeDispatches ? gameState.activeDispatches.filter(d => d.phase === 'turnaround').length : 0;
    const daysOps = Math.max(0, t.day - (s.foundingDay || 1));

    safe('stat-routes-created', s.routesCreated || activeRoutes.length);
    safe('stat-routes-active', activeRoutes.length);
    safe('stat-frequencies', fmt(totalFreqs));
    safe('stat-days-ops', daysOps);
    safe('stat-flights-today', fmt(s.flightsToday || 0));
    safe('stat-planes-inflight', inFlight);
    safe('stat-delayed-flights', fmt(s.totalDelayedFlights || 0));
    const totalForOTP = s.totalFlightsForOTP || s.totalFlights || 0;
    const delayed = s.totalDelayedFlights || 0;
    const otp = totalForOTP > 0 ? Math.round((1 - delayed / totalForOTP) * 100) : 100;
    safe('stat-otp', otp + '%');

    // Passengers by class
    const totalPax = (s.paxFirst || 0) + (s.paxBusiness || 0) + (s.paxEco || 0) + (s.paxCargo || 0) || 1;
    safe('stat-pax-first', fmt(s.paxFirst || 0));
    safe('stat-pax-business', fmt(s.paxBusiness || 0));
    safe('stat-pax-eco', fmt(s.paxEco || 0));
    safe('stat-pax-cargo', fmt(s.paxCargo || 0));
    const setPct = (id, val) => { const el = document.getElementById(id); if(el) el.style.width = Math.round(val / totalPax * 100) + '%'; };
    setPct('stat-bar-first', s.paxFirst || 0);
    setPct('stat-bar-business', s.paxBusiness || 0);
    setPct('stat-bar-eco', s.paxEco || 0);
    setPct('stat-bar-cargo', s.paxCargo || 0);

    // Fleet
    const fleet = gameState.fleet || [];
    safe('stat-fleet-total', fleet.length);
    safe('stat-fleet-flying', inFlight);
    safe('stat-fleet-turnaround', inTurnaround);
    safe('stat-fleet-idle', fleet.length - inFlight - inTurnaround);
    const modelCount = {};
    fleet.forEach(p => { modelCount[p.name] = (modelCount[p.name] || 0) + 1; });
    const topModel = Object.entries(modelCount).sort((a, b) => b[1] - a[1])[0];
    safe('stat-top-plane', topModel ? `${topModel[0]} ×${topModel[1]}` : '—');
    const fleetValue = fleet.reduce((sum, p) => sum + (p.price || 0), 0);
    safe('stat-fleet-value', '$' + fmt(fleetValue));

    // Fuel
    safe('stat-fuel-used', fmt(s.totalFuelConsumed || 0) + ' L');
    safe('stat-fuel-reserves', fmt(gameState.fuelReserves || 0) + ' L');
    safe('stat-fuel-price', '$' + (gameState.fuelPrice || 0).toFixed(2) + '/L');
    const fuelAvg = s.totalFuelConsumed && s.totalRevenue ? (gameState.fuelPrice || 0).toFixed(2) : '0.00';
    safe('stat-fuel-avg', '$' + fuelAvg + '/L');

    // Finances
    safe('stat-current-balance', '$' + fmt(gameState.money));
    const dailyProfit = typeof getActiveProfit === 'function' ? getActiveProfit() : 0;
    safe('stat-profit-day', (dailyProfit >= 0 ? '+' : '') + '$' + fmt(dailyProfit));
    const avgFlightProfit = s.totalFlights > 0 ? Math.round(s.totalRevenue / s.totalFlights) : 0;
    safe('stat-avg-flight-profit', '$' + fmt(avgFlightProfit));
    const totalDebt = gameState.loans ? gameState.loans.reduce((sum, l) => sum + l.remainingAmount, 0) : 0;
    safe('stat-total-debt', '$' + fmt(totalDebt));
    safe('stat-best-flight', s.bestFlightRoute || '—');
    // Top route by flight count
    if (gameState.routes && gameState.routes.length) {
        const topRoute = [...gameState.routes].sort((a, b) => (b.totalFlights || 0) - (a.totalFlights || 0))[0];
        safe('stat-best-route', topRoute ? `${topRoute.from} ↔ ${topRoute.to}` : '—');
    }

    // Destinations
    const allDests = new Set();
    (gameState.routes || []).forEach(r => { allDests.add(r.from); allDests.add(r.to); });
    safe('stat-unique-dests', allDests.size);
    const destFreq = {};
    (gameState.routes || []).forEach(r => {
        destFreq[r.to] = (destFreq[r.to] || 0) + (r.totalFlights || 0);
    });
    const topDest = Object.entries(destFreq).sort((a, b) => b[1] - a[1])[0];
    safe('stat-top-dest', topDest ? topDest[0] : '—');
    safe('stat-km-flown', fmt(Math.round(s.kmFlown || 0)) + ' km');
    safe('stat-base', gameState.base ? gameState.base.name : '—');

    // Employees
    safe('stat-total-employees', gameState.employees && gameState.employees.staff ? Object.values(gameState.employees.staff).reduce((sum, n) => sum + n, 0) : 0);
};

// --- MAINTENANCE SYSTEM ---

window.renderMaintenance = () => {
    const container = document.getElementById('maintenance-list');
    if (!container) return;

    if (!gameState.fleet || gameState.fleet.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay aeronaves en la flota.</div>';
        return;
    }
    
    // Sort from worst condition to best (based on closest check)
    const sortedFleet = [...gameState.fleet].sort((a, b) => {
        const pctA = Math.max((a.hoursSinceACheck||0)/250, (a.hoursSinceCCheck||0)/1500, (a.hoursSinceDCheck||0)/5000);
        const pctB = Math.max((b.hoursSinceACheck||0)/250, (b.hoursSinceCCheck||0)/1500, (b.hoursSinceDCheck||0)/5000);
        return pctB - pctA;
    });

    let html = '';
    sortedFleet.forEach(plane => {
        const aPct = Math.min(100, Math.round(((plane.hoursSinceACheck || 0) / 250) * 100));
        const cPct = Math.min(100, Math.round(((plane.hoursSinceCCheck || 0) / 1500) * 100));
        const dPct = Math.min(100, Math.round(((plane.hoursSinceDCheck || 0) / 5000) * 100));
        
        const maxPct = Math.max(aPct, cPct, dPct);
        let colorClass = '#30d158';
        if (maxPct >= 95) colorClass = '#ff453a';
        else if (maxPct >= 75) colorClass = '#ff9f0a';
        
        let reqBadge = '';
        if (maxPct >= 100) reqBadge = '<div class="maint-status-badge" style="background:#ff453a; color:#fff;">MANTENIMIENTO REQUERIDO</div>';
        
        html += `
        <div class="maint-card ${maxPct >= 100 ? 'critical' : ''}" onclick="openMaintenanceDetail('${plane.id}')">
            <div class="maint-card-header">
                <span class="maint-ac-name">${plane.name}</span>
                <span class="maint-ac-reg">${plane.registration}</span>
            </div>
            <div class="maint-progress-container" style="margin-top: 10px; height: 8px;">
                <div class="maint-progress-bar" style="width: ${maxPct}%; background-color: ${colorClass};"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                <span>A: ${aPct}%</span>
                <span>C: ${cPct}%</span>
                <span>D: ${dPct}%</span>
            </div>
            ${reqBadge}
            ${plane.status === 'maintenance' ? '<div class="maint-status-badge" style="background:#0a84ff; color:#fff; animation:none;">EN MANTENIMIENTO</div>' : ''}
            ${plane.status === 'grounded' ? '<div class="maint-status-badge" style="background:#ff453a; color:#fff; animation:none;">GROUNDED (D-Check Excedido)</div>' : ''}
        </div>`;
    });
    container.innerHTML = html;
};

window.openMaintenanceDetail = (planeId) => {
    const plane = gameState.fleet.find(p => p.id === planeId);
    if (!plane) return;

    const isAvailable = !(plane.status === 'in_flight' || plane.status === 'boarding' || plane.status === 'delayed_weather' || plane.status === 'maintenance');

    let viewDetail = document.getElementById('view-maintenance-detail');
    if (!viewDetail) {
        viewDetail = document.createElement('div');
        viewDetail.id = 'view-maintenance-detail';
        viewDetail.className = 'view';
        viewDetail.innerHTML = `
            <header class="section-header">
                <h2><i class="ph ph-airplane-tilt"></i> Centro de Mantenimiento</h2>
                <p class="text-sm text-muted">Gestión avanzada de flota</p>
            </header>
            <div class="maint-detail-container" id="maintenance-detail-content" style="padding: 16px;"></div>
        `;
        document.querySelector('.app-main').appendChild(viewDetail);
    }

    const body = document.getElementById('maintenance-detail-content');
    if (!body) return;

    const modelDef = AIRCRAFT_MODELS.find(m => m.id === plane.model);
    const mFactor = modelDef ? (modelDef.maintFactor || 1.0) : 1.0;
    const baseVal = modelDef ? modelDef.price : 10000000;

    const aHrs = plane.hoursSinceACheck || 0;
    const cHrs = plane.hoursSinceCCheck || 0;
    const dHrs = plane.hoursSinceDCheck || 0;

    const aPct = Math.min(100, (aHrs / 250) * 100);
    const cPct = Math.min(100, (cHrs / 1500) * 100);
    const dPct = Math.min(100, (dHrs / 5000) * 100);

    const costA = Math.round((baseVal * 0.0005) * mFactor * Math.max(1, (aPct/100)*1.5));
    const costC = Math.round((baseVal * 0.005) * mFactor * Math.max(1, (cPct/100)*1.5));
    const costD = Math.round((baseVal * 0.05) * mFactor * Math.max(1, (dPct/100)*1.5));

    const canA = isAvailable && gameState.money >= costA;
    const canC = isAvailable && gameState.money >= costC;
    const canD = isAvailable && gameState.money >= costD;

    let warningHtml = '';
    if (!isAvailable && plane.status !== 'grounded') {
        warningHtml = `
            <div class="maint-warning">
                <i class="ph ph-warning"></i> <strong>Aeronave no disponible:</strong> Actualmente en estado "${plane.status}".
            </div>
        `;
    } else if (plane.status === 'grounded') {
        warningHtml = `
            <div class="maint-warning critical">
                <i class="ph ph-warning"></i> <strong>Aeronave Grounded:</strong> Excedió sus horas de D-Check. Requiere mantenimiento pesado inmediato.
            </div>
        `;
    }

    const renderBar = (pct, label, hours, max) => {
        let col = pct >= 95 ? '#ff453a' : pct >= 75 ? '#ff9f0a' : '#30d158';
        return `
        <div class="maint-check-row">
            <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                <strong>${label}</strong>
                <span style="color: var(--text-muted);">${Math.floor(hours)} / ${max} hrs</span>
            </div>
            <div class="maint-progress-container">
                <div class="maint-progress-bar" style="width: ${pct}%; background-color: ${col};"></div>
            </div>
        </div>`;
    };

    body.innerHTML = `
        <div class="glass-panel" style="margin-bottom: 24px; padding: 24px;">
            <div style="font-size: 1.8rem; font-weight: 700; margin-bottom: 4px; background: linear-gradient(45deg, #fff, #aaa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${plane.name}</div>
            <div style="color: var(--text-muted); font-size: 1.1rem; margin-bottom: 24px;">
                Matrícula: <strong>${plane.registration}</strong> • Horas Totales: ${Math.floor(plane.flightHours || 0)}
            </div>
            
            ${renderBar(aPct, 'A-Check (Inspección Ligera)', aHrs, 250)}
            ${renderBar(cPct, 'C-Check (Inspección Detallada)', cHrs, 1500)}
            ${renderBar(dPct, 'D-Check (Overhaul / Revisión Pesada)', dHrs, 5000)}
        </div>
        
        ${warningHtml}

        <h3 style="margin-bottom: 16px; margin-top: 16px; font-weight: 600;">Opciones de Mantenimiento</h3>
        
        <div class="maint-option glass-panel ${canA ? '' : 'disabled'}" onclick="${canA ? `performMaintenance('${plane.id}', 'A')` : ''}">
            <div class="maint-opt-content">
                <span class="maint-option-title">A-Check</span>
                <span class="maint-option-desc">Inspección de sistemas. Toma 12 hrs simuladas. Resetea horas de A-Check.</span>
            </div>
            <div class="maint-option-cost">$${formatMoney(costA)}</div>
        </div>

        <div class="maint-option glass-panel ${canC ? '' : 'disabled'}" onclick="${canC ? `performMaintenance('${plane.id}', 'C')` : ''}">
            <div class="maint-opt-content">
                <span class="maint-option-title">C-Check</span>
                <span class="maint-option-desc">Inspección profunda. Toma 3 días simulados. Resetea A y C-Check.</span>
            </div>
            <div class="maint-option-cost">$${formatMoney(costC)}</div>
        </div>

        <div class="maint-option glass-panel ${canD ? '' : 'disabled'}" onclick="${canD ? `performMaintenance('${plane.id}', 'D')` : ''}">
            <div class="maint-opt-content">
                <span class="maint-option-title">D-Check</span>
                <span class="maint-option-desc">Desmontaje total. Toma 2 semanas simuladas. Resetea TODOS los checks y quita estado Grounded.</span>
            </div>
            <div class="maint-option-cost" style="color: #ff9f0a;">$${formatMoney(costD)}</div>
        </div>
    `;

    switchTab('maintenance-detail');
};

window.performMaintenance = (planeId, type) => {
    const plane = gameState.fleet.find(p => p.id === planeId);
    if (!plane) return;

    const modelDef = AIRCRAFT_MODELS.find(m => m.id === plane.model);
    const mFactor = modelDef ? (modelDef.maintFactor || 1.0) : 1.0;
    const baseVal = modelDef ? modelDef.price : 10000000;

    const aHrs = plane.hoursSinceACheck || 0;
    const cHrs = plane.hoursSinceCCheck || 0;
    const dHrs = plane.hoursSinceDCheck || 0;

    const aPct = Math.min(100, (aHrs / 250) * 100);
    const cPct = Math.min(100, (cHrs / 1500) * 100);
    const dPct = Math.min(100, (dHrs / 5000) * 100);

    let cost = 0;
    let durationMins = 0;

    if (type === 'A') {
        cost = Math.round((baseVal * 0.0005) * mFactor * Math.max(1, (aPct/100)*1.5));
        durationMins = 12 * 60;
    } else if (type === 'C') {
        cost = Math.round((baseVal * 0.005) * mFactor * Math.max(1, (cPct/100)*1.5));
        durationMins = 3 * 24 * 60;
    } else if (type === 'D') {
        cost = Math.round((baseVal * 0.05) * mFactor * Math.max(1, (dPct/100)*1.5));
        durationMins = 14 * 24 * 60;
    }

    if (gameState.money < cost) {
        showToast('Fondos Insuficientes', 'No tienes suficiente dinero para este mantenimiento.', 'error');
        return;
    }

    gameState.money -= cost;
    
    if (type === 'A') {
        plane.hoursSinceACheck = 0;
    } else if (type === 'C') {
        plane.hoursSinceACheck = 0;
        plane.hoursSinceCCheck = 0;
    } else if (type === 'D') {
        plane.hoursSinceACheck = 0;
        plane.hoursSinceCCheck = 0;
        plane.hoursSinceDCheck = 0;
    }

    const nowAbs = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
    plane.status = 'maintenance';
    plane.readyAbs = nowAbs + durationMins;

    // Reset condition
    plane.condition = 100;

    updateTopBar();
    showToast('Mantenimiento Iniciado', `El avión estará listo en ${Math.floor(durationMins / 60 / 24)} días y ${Math.floor((durationMins/60)%24)} hrs.`, 'success');
    
    if (window.setHeaderBack) window.setHeaderBack(() => switchTab('maintenance'), 'a Mantenimiento');
    renderMaintenance();
    switchTab('maintenance');
};



const closePassengerRatingModal = () => {
    const modal = document.getElementById('passenger-rating-modal');
    if (modal) modal.classList.add('hidden');
};



const openPassengerRatingModal = () => {
    const modal = document.getElementById('passenger-rating-modal');
    if (!modal) return;
    
    // Header data
    const globalScoreEl = document.getElementById('prm-global-score');
    const globalStarsEl = document.getElementById('prm-global-stars');
    const globalPaxEl = document.getElementById('prm-global-pax');
    
    const ar = gameState.airlineRating || 3.0;
    if (globalScoreEl) globalScoreEl.innerText = ar.toFixed(1);
    
    if (globalStarsEl) {
        const fStars = Math.floor(ar);
        const hStar = ar - fStars >= 0.5;
        let gStarsHtml = '';
        for(let i=0; i<5; i++) {
            if (i < fStars) gStarsHtml += '<i class="ph-fill ph-star"></i>';
            else if (i === fStars && hStar) gStarsHtml += '<i class="ph-fill ph-star-half"></i>';
            else gStarsHtml += '<i class="ph ph-star"></i>';
        }
        globalStarsEl.innerHTML = gStarsHtml;
    }
    
    if (globalPaxEl) {
        let totalPaxSum = 0;
        if (gameState.dailyRatings) {
            gameState.dailyRatings.forEach(bucket => totalPaxSum += bucket.totalPax);
        }
        globalPaxEl.innerText = formatMoneyShort(totalPaxSum).replace('$', '');
    }
    
    // Procedural Reviews from recent flights
    const container = document.getElementById('prm-reviews-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!gameState.flightHistory || gameState.flightHistory.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding: 20px;">No hay reseñas disponibles todavía. Espera a que aterricen más vuelos.</div>`;
    } else {
        // Take last 10 flights
        const recentFlights = gameState.flightHistory.slice(-10).reverse();
        
        const firstNames = ["Carlos", "María", "José", "Laura", "Diego", "Ana", "Fernando", "Lucía", "Jorge", "Sofía", "Martín", "Valentina", "Juan", "Camila", "Miguel", "Julieta"];
        const lastNames = ["Gómez", "Rodríguez", "López", "Fernández", "Pérez", "Martínez", "González", "Sánchez", "Díaz", "Romero", "Álvarez", "Ruiz", "Torres", "Suárez"];
        
        let reviewsHtml = '';
        
        recentFlights.forEach(flight => {
            if (!flight.rating) return;
            const flightScore = flight.rating;
            
            // Randomly generate 1 or 2 reviews per flight
            const numReviews = Math.random() > 0.6 ? 2 : 1;
            
            for(let j=0; j<numReviews; j++) {
                const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
                const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
                const paxName = `${fn} ${ln}`;
                
                // Variate score slightly around flightScore
                let paxScore = flightScore + (Math.random() * 0.4 - 0.2);
                paxScore = Math.max(1.0, Math.min(5.0, paxScore));
                
                let comment = '';
                if (paxScore >= 4.5) {
                    const comments = [
                        "¡Excelente viaje! Llegamos a tiempo y la atención fue de primera. Volveré a volar con ellos.",
                        "Muy buen vuelo, superó mis expectativas. El personal muy amable.",
                        "Impecable. Todo en horario y el avión en perfectas condiciones.",
                        "Una experiencia fantástica de principio a fin. Muy recomendable."
                    ];
                    comment = comments[Math.floor(Math.random() * comments.length)];
                } else if (paxScore >= 3.5) {
                    const comments = [
                        "Buen vuelo en general. Podría mejorar un poco la comodidad, pero bien.",
                        "Todo correcto. Cumplieron con el horario y el servicio fue adecuado.",
                        "Un viaje normal, sin problemas. El precio me pareció justo.",
                        "Aceptable. Nada espectacular, pero llegué a destino sin contratiempos."
                    ];
                    comment = comments[Math.floor(Math.random() * comments.length)];
                } else if (paxScore >= 2.5) {
                    const comments = [
                        "El vuelo estuvo regular. Tuvimos algo de espera antes de embarcar.",
                        "No me convenció mucho. El avión se veía un poco viejo y el servicio fue escaso.",
                        "Bastante mejorable. La relación calidad-precio no es la mejor.",
                        "Llegamos, que es lo importante. Pero la comodidad dejó bastante que desear."
                    ];
                    comment = comments[Math.floor(Math.random() * comments.length)];
                } else {
                    const comments = [
                        "Pésima experiencia. Retrasos injustificados y mala atención.",
                        "Una estafa total. Pagué demasiado por un servicio mediocre.",
                        "El peor vuelo que he tenido. El avión incómodo y llegamos tardísimo.",
                        "Muy insatisfecho. No volvería a elegir esta aerolínea bajo ninguna circunstancia."
                    ];
                    comment = comments[Math.floor(Math.random() * comments.length)];
                }
                
                // Stars HTML
                const fS = Math.floor(paxScore);
                const hS = paxScore - fS >= 0.5;
                let sH = '';
                for(let k=0; k<5; k++) {
                    if (k < fS) sH += '<i class="ph-fill ph-star"></i>';
                    else if (k === fS && hS) sH += '<i class="ph-fill ph-star-half"></i>';
                    else sH += '<i class="ph ph-star"></i>';
                }
                
                // Route text
                const dest = AIRPORTS.find(a => a.id === flight.destinationId);
                const routeTxt = gameState.base ? `${gameState.base.id} ✈ ${dest ? dest.id : '?'}` : 'Vuelo';

                reviewsHtml += `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <div>
                                <div style="font-weight: 600; color: #fff; font-size: 0.95rem;">${paxName}</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted);"><i class="ph ph-airplane-tilt"></i> Ruta: ${routeTxt}</div>
                            </div>
                            <div style="color: var(--warning); font-size: 1rem;">
                                ${sH}
                            </div>
                        </div>
                        <div style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.4; font-style: italic;">
                            "${comment}"
                        </div>
                    </div>
                `;
            }
        });
        
        if (reviewsHtml === '') {
            container.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding: 20px;">No hay reseñas disponibles todavía. Espera a que aterricen más vuelos.</div>`;
        } else {
            container.innerHTML = reviewsHtml;
        }
    }
    
    modal.classList.remove('hidden');
};
