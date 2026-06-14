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
        id: 'c208', name: 'Cessna 208 Caravan', type: 'Regional Ligero', category: 'commercial', price: 2500000, capacity: 14, range: 1980, dailyProfit: 18000, defaultColor: '#ef4444',
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
        </svg>`
    },
    { 
        id: 'e190', name: 'Embraer E190', type: 'Regional Jet', category: 'commercial', price: 50000000, capacity: 114, range: 4537, dailyProfit: 135000, defaultColor: '#2563eb',
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
        </svg>`
    },
    { 
        id: 'b737', name: 'Boeing 737 MAX 8', type: 'Medio Alcance', category: 'commercial', price: 122000000, capacity: 178, range: 6570, dailyProfit: 445000, defaultColor: '#0ea5e9',
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
        </svg>`
    },
    { 
        id: 'a320', name: 'Airbus A320neo', type: 'Corto Alcance', category: 'commercial', price: 111000000, capacity: 165, range: 6300, dailyProfit: 410000, defaultColor: '#10b981',
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
        </svg>`
    },
    { 
        id: 'b787', name: 'Boeing 787-9 Dreamliner', type: 'Largo Alcance', category: 'commercial', price: 293000000, capacity: 290, range: 14140, dailyProfit: 1050000, defaultColor: '#8b5cf6',
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
        </svg>`
    },
    { 
        id: 'a350', name: 'Airbus A350-900', type: 'Largo Alcance', category: 'commercial', price: 317000000, capacity: 315, range: 15000, dailyProfit: 1150000, defaultColor: '#6366f1',
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
        </svg>`
    },
    { 
        id: 'f22', name: 'Lockheed Martin F-22 Raptor', type: 'Caza Furtivo', category: 'military', price: 150000000, capacity: 1, range: 2960, dailyProfit: 250000, defaultColor: '#475569',
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
        </svg>`
    },
    { 
        id: 'p40', name: 'Curtiss P-40 Warhawk', type: 'Caza Histórico', category: 'military', price: 4000000, capacity: 1, range: 1100, dailyProfit: 35000, defaultColor: '#4d7c0f',
        modelUrl: 'https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/p40/glTF2/P40.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(100, 100)">
                <path d="M 100 50 L 500 50 L 600 0 L 700 0 L 700 50 L 800 50 L 800 100 L 100 100 Z" fill="currentColor"/>
            </g>
        </svg>`
    },
    { 
        id: 'rq4', name: 'RQ-4 Global Hawk (Dron Militar)', type: 'Vigilancia Avanzada', category: 'military', price: 130000000, capacity: 0, range: 22780, dailyProfit: 180000, defaultColor: '#94a3b8',
        modelUrl: 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Global%20Hawk/Global%20Hawk.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(100, 100)">
                <path d="M 100 50 L 500 50 L 600 0 L 700 0 L 700 50 L 800 50 L 800 100 L 100 100 Z" fill="currentColor"/>
            </g>
        </svg>`
    },
    { 
        id: 'b2', name: 'Northrop Grumman B-2 Spirit', type: 'Bombardero Furtivo', category: 'military', price: 2000000000, capacity: 2, range: 11100, dailyProfit: 450000, defaultColor: '#1e293b',
        modelUrl: 'models/northrop_grumman_b-2_spirit_-_free.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(50, 100)">
                <!-- B-2 Flying Wing profile (side view) -->
                <path d="M 100 50 L 400 40 L 700 35 L 850 40 L 900 60 L 800 65 L 500 65 L 200 60 L 100 50 Z" fill="currentColor"/>
                <path d="M 250 45 L 350 40 L 450 45 Z" fill="url(#glass)"/>
            </g>
        </svg>`
    },
    { 
        id: 'b1', name: 'Rockwell B-1 Lancer', type: 'Bombardero Estratégico', category: 'military', price: 283000000, capacity: 4, range: 11998, dailyProfit: 300000, defaultColor: '#64748b',
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
        </svg>`
    },
    { 
        id: 'b52', name: 'Boeing B-52 Stratofortress', type: 'Bombardero Pesado', category: 'military', price: 84000000, capacity: 5, range: 14200, dailyProfit: 250000, defaultColor: '#4b5563',
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
        </svg>`
    },
    { 
        id: 'a310_mrtt', name: 'Airbus A310 MRTT', type: 'Transporte Militar', category: 'military', price: 150000000, capacity: 187, range: 13000, dailyProfit: 600000, defaultColor: '#708090',
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
        </svg>`
    },
    { 
        id: 'a380', name: 'Airbus A380 Superjumbo', type: 'Largo Alcance Pesado', category: 'commercial', price: 446000000, capacity: 525, range: 15200, dailyProfit: 1800000, defaultColor: '#1a365d',
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
        </svg>`
    },
    { 
        id: 'f15', name: 'McDonnell Douglas F-15 Eagle', type: 'Caza de Superioridad', category: 'military', price: 30000000, capacity: 1, range: 4800, dailyProfit: 120000, defaultColor: '#78909c',
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
        </svg>`
    },
    { 
        id: 'f35', name: 'Lockheed Martin F-35 Lightning II', type: 'Caza Polivalente Furtivo', category: 'military', price: 85000000, capacity: 1, range: 2800, dailyProfit: 220000, defaultColor: '#37474f',
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
        </svg>`
    },
    { 
        id: 'fjets_lowpoly', name: 'Caza Polivalente Low-Poly', type: 'Caza Ligero', category: 'military', price: 15000000, capacity: 1, range: 2200, dailyProfit: 80000, defaultColor: '#0f766e',
        modelUrl: 'models/free_-_fighter_jet_collection_-_low_poly.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(50, 60)">
                <path d="M 120 130 L 300 125 L 650 125 L 800 130 L 880 140 L 780 145 L 600 145 Z" fill="currentColor" />
                <path d="M 680 125 L 740 45 L 800 45 L 780 125 Z" fill="currentColor" />
                <path d="M 420 135 L 570 205 L 660 205 L 620 135 Z" fill="currentColor" opacity="0.8"/>
            </g>
        </svg>`
    },
    { 
        id: 'a340', name: 'Airbus A340-600', type: 'Largo Alcance Cuatrimotor', category: 'commercial', price: 275000000, capacity: 380, range: 14450, dailyProfit: 950000, defaultColor: '#0f172a',
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
        </svg>`
    },
    { 
        id: 'mig35', name: 'Mikoyan MiG-35', type: 'Caza Multirrol', category: 'military', price: 40000000, capacity: 1, range: 2000, dailyProfit: 110000, defaultColor: '#546e7a',
        modelUrl: 'models/mig-35_-_fighter_jet_-_free.glb',
        svg: `
        <svg viewBox="0 0 1000 300" class="w-full h-full drop-shadow-2xl" style="color: var(--plane-color);">
            <g transform="translate(50, 60)">
                <path d="M 90 130 L 290 122 L 670 122 L 810 130 L 890 140 L 790 146 L 590 146 Z" fill="currentColor" />
                <path d="M 670 122 L 730 42 L 790 42 L 770 122 Z" fill="currentColor" />
                <path d="M 410 135 L 560 210 L 650 210 L 610 135 Z" fill="currentColor" opacity="0.8"/>
            </g>
        </svg>`
    }
];

let gameState = { base: null, money: 50000000, time: { day: 1, hour: 8, minute: 0 }, fleet: [], routes: [], activeDispatches: [], currentTab: 'dashboard', gameLoop: null };
let selectedAirportTemp = null;
let leafletMap = null;

let isCatchingUp = false;

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
        
        if (gameState.lastSavedRealTime) {
            lastRealTime = gameState.lastSavedRealTime;
            unprocessedSimMs = gameState.unprocessedSimMs || 0;
        } else {
            lastRealTime = Date.now();
            unprocessedSimMs = 0;
        }
        
        // Ensure planes have status
        gameState.fleet.forEach(p => { if(!p.status) p.status = 'idle'; });
        
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
const formatTime = (h, m) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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

const logMsg = (msg) => {
    const log = document.getElementById('log-container');
    if (!log) return;
    const p = document.createElement('p'); p.style.marginBottom = '2px';
    const d = new Date(2026, 0, 1);
    d.setDate(d.getDate() + (gameState.time.day - 1));
    const dateStr = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    const timeStr = formatTime(gameState.time.hour, gameState.time.minute);
    p.innerHTML = `<span class="log-day-tag" style="color:var(--accent); font-family:var(--font-mono);">[${dateStr} ${timeStr}]</span> ${msg}`;
    log.prepend(p);
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
            document.getElementById('airport-info').classList.remove('hidden');
            leafletMap.flyTo([ap.lat, ap.lng], 5, { duration: 1 });
        });
    });
    setTimeout(() => leafletMap.invalidateSize(), 300);
};

const startGame = () => {
    if (!selectedAirportTemp && !gameState.base) return;
    if (selectedAirportTemp) gameState.base = selectedAirportTemp;
    
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

    renderMarket(); updateUI(); renderFlights();
    if (gameState.currentTab) switchTab(gameState.currentTab);
    
    if (gameState.gameLoop) clearInterval(gameState.gameLoop);
    
    fillFuelHistory();
    
    // Process initial catch-up and start interval
    gameTick();
    gameState.gameLoop = setInterval(gameTick, 100);
    saveGame();
};

const switchTab = (tab) => {
    // Hide all views
    ['dashboard', 'market', 'fleet', 'fuel', 'flights', 'new-route', 'history'].forEach(t => {
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

    // Update Top Nav (Flights / New Route / History)
    const topNavFlights = document.getElementById('top-nav-flights');
    if (tab === 'flights' || tab === 'new-route' || tab === 'history') {
        if(topNavFlights) topNavFlights.classList.remove('hidden-nav');
        ['flights', 'new-route', 'history'].forEach(t => {
            const btn = document.getElementById(`tab-${t}`);
            if(btn) btn.className = t === tab ? 'nav-tab nav-tab-active' : 'nav-tab';
        });
    } else {
        if(topNavFlights) topNavFlights.classList.add('hidden-nav');
    }

    // Update Bottom Nav
    ['dashboard', 'market', 'flights'].forEach(t => {
        const bottomBtn = document.getElementById(`bottom-tab-${t}`);
        if(bottomBtn) bottomBtn.className = 'bottom-nav-btn';
    });
    
    // Bottom nav mapping
    let bottomTabId = tab;
    if (tab === 'fleet' || tab === 'fuel') bottomTabId = 'market';
    if (tab === 'new-route' || tab === 'history') bottomTabId = 'flights';
    const activeBottomBtn = document.getElementById(`bottom-tab-${bottomTabId}`);
    if(activeBottomBtn) activeBottomBtn.className = 'bottom-nav-btn active';

    // Menu button default off
    const menuBtn = document.getElementById('bottom-tab-menu');
    if(menuBtn) menuBtn.className = 'bottom-nav-btn';

    // Show selected view
    const activeView = document.getElementById(`view-${tab}`);
    if(activeView) activeView.classList.add('view-active');
    
    gameState.currentTab = tab;
    if(tab === 'fleet') renderFleet();
    if(tab === 'fuel') renderFuelMarket();
    if(tab === 'flights') renderFlights();
    if(tab === 'history') renderHistory();
    if(tab === 'new-route') {
        if (!routeCreationState) startRouteCreation();
        else renderNewRoute();
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

const renderMarket = () => {
    const gridCom = document.getElementById('market-grid-commercial');
    const gridMil = document.getElementById('market-grid-military');
    if (!gridCom || !gridMil) return;
    
    gridCom.innerHTML = '';
    gridMil.innerHTML = '';
    
    // Sort AIRCRAFT_MODELS by price
    const sortedModels = [...AIRCRAFT_MODELS].sort((a, b) => a.price - b.price);
    
    sortedModels.forEach(model => {
        const card = document.createElement('div');
        card.className = 'aircraft-card';
        
        const visualHtml = model.modelUrl
            ? `<model-viewer id="model-${model.id}" src="${model.modelUrl}" loading="lazy" auto-rotate camera-controls shadow-intensity="1" class="aircraft-preview-visual" style="width:100%;height:100%;background-color:transparent;" exposure="1.2" environment-image="neutral" interaction-prompt="none"></model-viewer>`
            : `<div id="svg-container-${model.id}" class="svg-wrap" style="--plane-color: ${model.defaultColor};">${model.svg}</div>`;

        card.innerHTML = `
            <div class="aircraft-preview">
                ${visualHtml}
                
                <div class="color-picker-wrap">
                    <button class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 0.75rem;" onclick="liveryEditor.open('${model.id}')"><i class="ph ph-paint-brush"></i> Editar Librería</button>
                </div>

                <span class="type-badge">${model.type}</span>
            </div>
            <div class="aircraft-body">
                <h3 class="aircraft-name">${model.name}</h3>
                <div class="aircraft-specs">
                    <div class="spec-row"><span class="spec-label">Capacidad máx:</span> <span class="spec-value">${model.capacity} pax</span></div>
                    <div class="spec-row"><span class="spec-label">Alcance operativo:</span> <span class="spec-value">${model.range} km</span></div>
                    <div class="spec-row spec-row-profit"><span class="spec-label">Rentabilidad est.:</span> <span class="spec-value profit-value">+${formatMoney(model.dailyProfit)}/día</span></div>
                </div>
                <button id="btn-buy-${model.id}" onclick="buyAircraft('${model.id}')" class="btn-buy btn-buy-active">
                    Adquirir por ${formatMoney(model.price)}
                </button>
            </div>
        `;
        
        if (model.category === 'military') {
            gridMil.appendChild(card);
        } else {
            gridCom.appendChild(card);
        }
        
        // Set initial color for 3D model if it exists
        if (model.modelUrl) {
            setTimeout(() => updatePlaneColor(model.id, model.defaultColor), 100);
        }
    });
};

const buyAircraft = (modelId, customLiveryData = null) => {
    const model = AIRCRAFT_MODELS.find(m => m.id === modelId); if (!model) return;
    if (gameState.money >= model.price) {
        gameState.money -= model.price;
        const registration = generateRegistration();

        gameState.fleet.push({ 
            ...model, 
            id: Math.random().toString(36).substr(2, 9), 
            registration: registration,
            customLivery: customLiveryData,
            savedColor: model.defaultColor // Fallback
        });
        
        logMsg(`Compra procesada: ${model.name}. Matrícula: ${registration}.`);
        showToast('Aeronave Integrada', `El ${model.name} está listo para operar.`, 'success');
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
    textureUrl: null,
    textureObj: null,
    currentMode: 'camera',
    
    open: function(modelId) {
        this.activeModelId = modelId;
        const model = AIRCRAFT_MODELS.find(m => m.id === modelId);
        if (!model) return;
        
        document.getElementById('livery-editor').classList.remove('hidden');
        this.setMode('camera');
        
        const container = document.getElementById('livery-viewer-container');
        if (model.modelUrl) {
            container.innerHTML = `<model-viewer id="livery-mv" src="${model.modelUrl}" loading="lazy" auto-rotate camera-controls shadow-intensity="1" exposure="1.2" environment-image="neutral" style="width:100%;height:100%;"></model-viewer>`;
            this.modelViewer = document.getElementById('livery-mv');
            this.modelViewer.addEventListener('load', () => this.setupCanvas());
        } else {
            container.innerHTML = `<div class="flex items-center justify-center h-full w-full"><p class="text-white text-center">Este modelo no admite edición en 3D todavía.</p></div>`;
            this.modelViewer = null;
        }
    },
    
    close: function() {
        document.getElementById('livery-editor').classList.add('hidden');
        this.activeModelId = null;
        this.modelViewer = null;
        this.canvas = null;
        this.textureObj = null;
    },
    
    setMode: function(mode) {
        this.currentMode = mode;
        document.getElementById('btn-mode-camera').className = mode === 'camera' ? 'livery-mode-btn active' : 'livery-mode-btn';
        document.getElementById('btn-mode-paint').className = mode === 'paint' ? 'livery-mode-btn active' : 'livery-mode-btn';
        
        if (this.modelViewer) {
            if (mode === 'paint') {
                this.modelViewer.removeAttribute('camera-controls');
                this.modelViewer.style.touchAction = 'none';
            } else {
                this.modelViewer.setAttribute('camera-controls', '');
                this.modelViewer.style.touchAction = 'auto';
            }
        }
    },
    
    setupCanvas: function() {
        if (!this.modelViewer) return;
        
        this.canvas = document.createElement('canvas');
        this.canvas.width = 2048;
        this.canvas.height = 2048;
        this.ctx = this.canvas.getContext('2d');
        
        // Fill white initially
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, 2048, 2048);
        document.getElementById('livery-base-color').value = '#ffffff';
        
        this.applyTexture();
        this.setupEvents();
    },
    
    applyTexture: async function() {
        if (!this.modelViewer || !this.canvas) return;
        const url = this.canvas.toDataURL('image/png');
        
        try {
            if (!this.textureObj) {
                this.textureObj = await this.modelViewer.createTexture(url);
                if (this.modelViewer.model && this.modelViewer.model.materials) {
                    this.modelViewer.model.materials.forEach(mat => {
                        if(mat.name.toLowerCase().includes('glass') || mat.name.toLowerCase().includes('window')) return;
                        mat.pbrMetallicRoughness.setBaseColorFactor([1,1,1,1]);
                        if (mat.pbrMetallicRoughness.baseColorTexture) {
                            mat.pbrMetallicRoughness.baseColorTexture.setTexture(this.textureObj);
                        }
                    });
                }
            } else {
                if (this.textureObj.source && this.textureObj.source.setURI) {
                    await this.textureObj.source.setURI(url);
                } else {
                    // Fallback
                    this.textureObj = await this.modelViewer.createTexture(url);
                    this.modelViewer.model.materials.forEach(mat => {
                        if(mat.name.toLowerCase().includes('glass') || mat.name.toLowerCase().includes('window')) return;
                        if (mat.pbrMetallicRoughness.baseColorTexture) {
                            mat.pbrMetallicRoughness.baseColorTexture.setTexture(this.textureObj);
                        }
                    });
                }
            }
        } catch(e) {
            console.error("Error applying texture:", e);
        }
    },
    
    fillBaseColor: function() {
        if (!this.ctx) return;
        const color = document.getElementById('livery-base-color').value;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.applyTexture();
    },
    
    setupEvents: function() {
        if (!this.modelViewer) return;
        
        let lastU = null, lastV = null;
        
        const drawOnCanvas = (event) => {
            if (this.currentMode !== 'paint') return;
            
            const surface = this.modelViewer.surfaceFromPoint(event.clientX, event.clientY);
            
            if (!surface) return;
            if (!surface.uv) return;
            
            const uvX = surface.uv.u !== undefined ? surface.uv.u : (surface.uv.x !== undefined ? surface.uv.x : surface.uv[0]);
            const uvY = surface.uv.v !== undefined ? surface.uv.v : (surface.uv.y !== undefined ? surface.uv.y : surface.uv[1]);
            
            if (uvX === undefined || uvY === undefined) return;
            
            const textInput = document.getElementById('livery-text-input').value;
            const u = uvX * this.canvas.width;
            const v = (1 - uvY) * this.canvas.height;
            
            if (textInput && event.type === 'pointerdown') {
                // Draw text
                const fontSize = document.getElementById('livery-text-size').value || 60;
                const textColor = document.getElementById('livery-text-color').value;
                this.ctx.font = `bold ${fontSize}px sans-serif`;
                this.ctx.fillStyle = textColor;
                this.ctx.fillText(textInput, u, v);
                document.getElementById('livery-text-input').value = ''; // clear
                this.applyTexture();
                return;
            }
            
            if (event.type === 'pointerdown' && !textInput) {
                this.isDrawing = true;
                lastU = u; lastV = v;
            } else if (event.type === 'pointermove' && this.isDrawing) {
                const brushSize = document.getElementById('livery-brush-size').value || 10;
                const brushColor = document.getElementById('livery-brush-color').value;
                
                this.ctx.beginPath();
                this.ctx.moveTo(lastU, lastV);
                this.ctx.lineTo(u, v);
                this.ctx.strokeStyle = brushColor;
                this.ctx.lineWidth = brushSize;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();
                
                lastU = u; lastV = v;
                // Throttle texture update for performance
                if(Math.random() > 0.5) this.applyTexture(); 
            } else if (event.type === 'pointerup') {
                this.isDrawing = false;
                this.applyTexture();
            }
        };
        
        this.modelViewer.addEventListener('pointerdown', drawOnCanvas);
        this.modelViewer.addEventListener('pointermove', drawOnCanvas);
        window.addEventListener('pointerup', () => { 
            if(this.isDrawing) { this.isDrawing = false; this.applyTexture(); }
        });
    },
    
    save: function() {
        if (!this.activeModelId) return;
        const liveryData = this.canvas ? this.canvas.toDataURL('image/png') : null;
        buyAircraft(this.activeModelId, liveryData);
        this.close();
    }
};

// --- FUEL MARKET LOGIC ---
let fuelChartInstance = null;
let fuelChartTimeframe = '1M';

window.setFuelTimeframe = (tf) => {
    fuelChartTimeframe = tf;
    renderFuelChart();
};

const renderFuelMarket = () => {
    const view = document.getElementById('view-fuel');
    if (!view) return;
    
    const trendIcon = gameState.fuelHistory && gameState.fuelHistory.length > 1 && gameState.fuelHistory[gameState.fuelHistory.length - 1] > gameState.fuelHistory[gameState.fuelHistory.length - 2] 
        ? '<i class="ph ph-trend-up" style="color:var(--danger)"></i>' 
        : '<i class="ph ph-trend-down" style="color:var(--money)"></i>';

    view.innerHTML = `
        <div class="market-header" style="margin-bottom: 24px;">
            <h2>Mercado Global de Petróleo</h2>
            <p>Monitorea las fluctuaciones diarias del Jet A1 y gestiona tus reservas estratégicamente.</p>
        </div>
        
        <div style="display: flex; gap: 20px; flex-wrap: wrap; width: 100%; box-sizing: border-box;">
            <!-- Panel Izquierdo: Gráfico -->
            <div class="card card-padded" style="flex: 1 1 500px; min-width: 0; padding: 24px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; flex-wrap: wrap; gap: 16px;">
                    <div>
                        <div class="stat-label" style="font-size:1rem; margin-bottom:4px;">Precio Spot (Jet A1)</div>
                        <div class="stat-value mono" style="font-size:2.5rem; color:#fff;">
                            $${gameState.fuelPrice.toFixed(2)} ${trendIcon}
                        </div>
                    </div>
                    <div class="livery-mode-toggle" style="margin: 0; flex-shrink: 0;">
                        <button class="livery-mode-btn ${fuelChartTimeframe === '10D' ? 'active' : ''}" onclick="setFuelTimeframe('10D')">10D</button>
                        <button class="livery-mode-btn ${fuelChartTimeframe === '1M' ? 'active' : ''}" onclick="setFuelTimeframe('1M')">1M</button>
                        <button class="btn-mode-btn livery-mode-btn ${fuelChartTimeframe === '3M' ? 'active' : ''}" onclick="setFuelTimeframe('3M')">3M</button>
                        <button class="livery-mode-btn ${fuelChartTimeframe === '1Y' ? 'active' : ''}" onclick="setFuelTimeframe('1Y')">1Y</button>
                    </div>
                </div>
                <div style="position: relative; height: 300px; width: 100%;">
                    <canvas id="fuel-chart"></canvas>
                </div>
            </div>
            
            <!-- Panel Derecho: Trading -->
            <div class="card card-padded" style="flex: 1 1 300px; min-width: 0; padding: 24px; display: flex; flex-direction: column;">
                <div style="margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--border-subtle); text-align: center;">
                    <div class="stat-label" style="font-size:1rem; margin-bottom:8px;">Tus Reservas (L)</div>
                    <div class="stat-value mono" style="font-size:2rem; color:var(--accent);">
                        <i class="ph ph-drop"></i> ${new Intl.NumberFormat('es-AR').format(Math.round(gameState.fuelReserves))}
                    </div>
                </div>
                
                <h3 style="color:#fff; margin-bottom:16px; font-size:1.1rem; text-align: center;">Orden de Compra rápida</h3>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:24px;">
                    <button class="btn btn-secondary" style="padding:12px 8px;" onclick="buyFuel(10000)">10k L<br><small class="text-muted">~$${formatMoney(10000 * gameState.fuelPrice)}</small></button>
                    <button class="btn btn-secondary" style="padding:12px 8px;" onclick="buyFuel(50000)">50k L<br><small class="text-muted">~$${formatMoney(50000 * gameState.fuelPrice)}</small></button>
                    <button class="btn btn-secondary" style="padding:12px 8px;" onclick="buyFuel(100000)">100k L<br><small class="text-muted">~$${formatMoney(100000 * gameState.fuelPrice)}</small></button>
                    <button class="btn btn-primary" style="padding:12px 8px; background:var(--accent); color:#000;" onclick="buyFuel(500000)">500k L<br><small style="color:rgba(0,0,0,0.7)">~$${formatMoney(500000 * gameState.fuelPrice)}</small></button>
                </div>
                
                <div style="margin-top: auto;">
                    <label class="text-xs text-secondary" style="display:block; margin-bottom:8px; text-align: center;">Cantidad Personalizada (L)</label>
                    <div style="display:flex; gap:12px;">
                        <input type="number" id="custom-fuel-amount" class="flight-input" placeholder="Ej: 25000" style="flex:1;">
                        <button class="btn btn-primary" onclick="buyFuel(document.getElementById('custom-fuel-amount').value)"><i class="ph ph-shopping-cart" style="font-size:1.2rem;"></i></button>
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
    const lineColor = isUp ? '#ff453a' : '#30d158'; 
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
        updateUI();
        if(gameState.currentTab === 'fuel') renderFuelMarket();
        saveGame();
    } else {
        showToast('Fondos Insuficientes', `Necesitas $${formatMoney(cost)} para esta compra.`, 'error');
    }
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
        const tr = document.createElement('tr');
        
        const visualHtml = plane.modelUrl
            ? `<model-viewer id="fleet-model-${plane.id}" src="${plane.modelUrl}" loading="lazy" auto-rotate shadow-intensity="1" style="width:100%;height:100%;background-color:transparent;" exposure="1.2" environment-image="neutral" interaction-prompt="none"></model-viewer>`
            : `<div style="width:100%;height:100%;--plane-color: ${plane.savedColor};">${plane.svg}</div>`;

        tr.innerHTML = `
            <td>
                <div class="fleet-plane-cell">
                    <div class="fleet-plane-thumb">
                        ${visualHtml}
                    </div>
                    <div>
                        <div class="fleet-plane-reg">${plane.registration}</div>
                        <div class="fleet-plane-name">${plane.name}</div>
                        <div class="fleet-plane-color">
                            <span class="fleet-plane-color-dot" style="background-color: ${plane.savedColor}"></span>
                            <span class="fleet-plane-color-label">Color actual</span>
                        </div>
                    </div>
                </div>
            </td>
            <td class="fleet-data-cell">${plane.capacity} pax</td>
            <td class="fleet-data-cell">${plane.range} km</td>
            <td class="fleet-profit-cell">+${formatMoney(plane.dailyProfit)}</td>
        `;
        list.appendChild(tr);

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
                                } else {
                                    // Fallback to old colored logic if no custom livery
                                    if (!plane.name.includes('Cessna')) {
                                        try {
                                            if (mat.pbrMetallicRoughness.baseColorTexture) {
                                                mat.pbrMetallicRoughness.baseColorTexture.setTexture(null);
                                            }
                                        } catch(e) {}
                                    }
                                    mat.pbrMetallicRoughness.setBaseColorFactor(plane.savedColor);
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

const calculateFlightProfit = (model, distance, destId) => {
    // Sistema Inteligente de Ganancias - Vuelo Lleno (100% Ocupación)
    
    // 1. Multiplicador de destino
    const premiumHubs = ['JFK', 'LHR', 'HND', 'DXB'];
    const destMultiplier = premiumHubs.includes(destId) ? 1.5 : 1.0;
    
    if (model.category === 'commercial') {
        // 2. Ingresos: Tarifa base + Tarifa por distancia
        const baseTicketPrice = 40; // Impuestos/tasas fijas
        const yieldPerKm = 0.18 * destMultiplier; // Valor por km
        
        // 3. Costos: Economías de escala (CASM)
        let casm = 0.12; 
        if (model.capacity > 200) casm = 0.08;
        else if (model.capacity > 100) casm = 0.10;
        else if (model.capacity <= 20) casm = 0.25; 
        
        const ticketPrice = baseTicketPrice + (distance * yieldPerKm);
        const costPerPax = 15 + (distance * casm);
        
        const profitPerPax = ticketPrice - costPerPax;
        const ancillaryRevenue = ticketPrice * 0.25; // Equipaje, extras
        
        let totalProfit = model.capacity * (profitPerPax + ancillaryRevenue);
        
        // Bonus por características del avión
        if (model.type.includes('Jet') || model.type.includes('Alcance') || model.type.includes('Medio')) {
            totalProfit *= 1.1; 
        }
        
        return Math.max(100, Math.round(totalProfit));
    } else {
        // Contratos Militares
        const missionBase = model.price * 0.0005; 
        const distanceBonus = distance * 50; 
        return Math.round(missionBase + distanceBonus);
    }
};

const getActiveProfit = () => {
    if (!gameState.routes) return 0;
    let total = 0;
    gameState.routes.forEach(r => {
        r.frequencies.forEach(f => {
            const model = AIRCRAFT_MODELS.find(m => m.name === f.modelId || m.id === f.modelId);
            if(model) {
                // Estimación prorrateada diaria de esta frecuencia
                const flightProfit = calculateFlightProfit(model, r.distance, r.destinationId);
                total += (flightProfit * f.days.length) / 7; 
            }
        });
    });
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

    const overallStress = congestionFactor * peakFactor;
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

const checkAndDispatchFlights = () => {
    const nowAbs = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
    
    // 1. Iniciar Embarque (Boarding phase)
    gameState.routes.forEach(route => {
        const dest = AIRPORTS.find(a => a.id === route.destinationId);
        route.frequencies.forEach(freq => {
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
                
                if (!alreadyActive) {
                    startBoarding(route, freq, model, dest, schedAbs);
                }
            }
        });
    });
    
    // 2. Procesar despachos activos
    gameState.activeDispatches = gameState.activeDispatches.filter(dispatch => {
        if (dispatch.status === 'boarding') {
            if (nowAbs >= dispatch.actualDepartureAbs) {
                return processFlightDeparture(dispatch);
            }
            return true;
        } else if (dispatch.status === 'in_flight') {
            const arrAbs = dispatch.arrivalDay * 24 * 60 + dispatch.arrivalHour * 60 + dispatch.arrivalMinute;
            if (nowAbs >= arrAbs) {
                const plane = gameState.fleet.find(p => p.id === dispatch.planeId);
                if (plane) plane.status = 'idle';

                if (!gameState.flightHistory) gameState.flightHistory = [];
                gameState.flightHistory.unshift({
                    id: dispatch.id,
                    destName: dispatch.destName,
                    planeReg: plane ? plane.registration : 'Desconocido',
                    planeModel: plane ? plane.name : 'Desconocido',
                    profit: dispatch.profit || 0,
                    departureDay: dispatch.departureDay,
                    departureHour: dispatch.departureHour,
                    departureMinute: dispatch.departureMinute,
                    arrivalDay: dispatch.arrivalDay,
                    arrivalHour: dispatch.arrivalHour,
                    arrivalMinute: dispatch.arrivalMinute,
                    timestamp: nowAbs
                });
                if (gameState.flightHistory.length > 50) gameState.flightHistory.pop();

                if (!isCatchingUp) {
                    logMsg(`Aterrizaje completado: ${plane ? plane.registration : 'Desconocido'} en ${dispatch.destName}.`);
                    showToast('Vuelo Completado', `Aterrizaje exitoso en ${dispatch.destName}`, 'info');
                }
                
                if(!isCatchingUp && gameState.currentTab === 'flights') renderFlights();
                return false;
            }
            return true;
        }
        return true;
    });
};

const startBoarding = (route, freq, model, dest, schedAbs) => {
    const availablePlaneId = freq.assignedPlanes.find(pid => {
        const p = gameState.fleet.find(fl => fl.id === pid);
        return p && p.status === 'idle';
    });
    
    let fuelNeeded = 0;
    if (model) {
        const fuelFactor = model.capacity === 0 ? 0.5 : model.capacity * 0.025;
        fuelNeeded = Math.round(route.distance * fuelFactor);
        if(model.category === 'military') fuelNeeded = Math.round(route.distance * 5); 
    }
    
    if (availablePlaneId && gameState.fuelReserves >= fuelNeeded) {
        gameState.fuelReserves -= fuelNeeded;
        const plane = gameState.fleet.find(p => p.id === availablePlaneId);
        plane.status = 'boarding';
        
        const scheduledHour = Math.floor((schedAbs % (24 * 60)) / 60);
        const delayMins = calculateFlightDelay(dest.id, scheduledHour);
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
            actualDepartureAbs: actualDepartureAbs,
            fuelNeeded: fuelNeeded,
            reqTime: formatTime(scheduledHour, schedAbs % 60)
        });
        
        if (!isCatchingUp) {
            let timingMsg = 'En horario.';
            if (delayMins > 3) timingMsg = `(Demora est: +${delayMins}m)`;
            else if (delayMins < -1) timingMsg = `(Adelanto est: ${delayMins}m)`;
            else if (delayMins !== 0) timingMsg = `(Desvío: ${delayMins > 0 ? '+' : ''}${delayMins}m)`;
            
            logMsg(`Embarque: ${plane.registration} hacia ${dest.id}. ${timingMsg}`);
            if(gameState.currentTab === 'flights') renderFlights();
        }
    } else {
        let delayReason = 'plane';
        if (availablePlaneId && gameState.fuelReserves < fuelNeeded) {
            delayReason = 'fuel';
            if (!isCatchingUp) {
                logMsg(`[ALERTA] Vuelo a ${dest.id} retrasado por falta de combustible (Req: ${fuelNeeded} L).`);
                showToast('Falta Combustible', `El vuelo a ${dest.name} requiere repostaje.`, 'error');
            }
        } else if (!isCatchingUp) {
            logMsg(`[ALERTA] Vuelo a ${dest.id} retrasado. Ningún avión asignado disponible.`);
            showToast('Demora Operativa', `El vuelo a ${dest.name} no tiene aeronave disponible.`, 'error');
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
            fuelNeeded: fuelNeeded,
            reqTime: formatTime(scheduledHour, schedAbs % 60)
        });
        if(!isCatchingUp && gameState.currentTab === 'flights') renderFlights();
    }
};

const processFlightDeparture = (dispatch) => {
    const plane = gameState.fleet.find(p => p.id === dispatch.planeId);
    if(plane) plane.status = 'in_flight';
    
    dispatch.status = 'in_flight';
    
    const r = gameState.routes.find(ro => ro.id === dispatch.routeId);
    if (!r) return false;
    
    const durationHours = r.distance / 800;
    const durationMinutes = Math.round(durationHours * 60);
    
    const arrAbs = dispatch.actualDepartureAbs + durationMinutes;
    
    dispatch.departureDay = Math.floor(dispatch.actualDepartureAbs / (24 * 60));
    dispatch.departureHour = Math.floor((dispatch.actualDepartureAbs % (24 * 60)) / 60);
    dispatch.departureMinute = dispatch.actualDepartureAbs % 60;
    
    dispatch.arrivalDay = Math.floor(arrAbs / (24 * 60));
    dispatch.arrivalHour = Math.floor((arrAbs % (24 * 60)) / 60);
    dispatch.arrivalMinute = arrAbs % 60;
    
    const model = AIRCRAFT_MODELS.find(m => m.name === dispatch.modelId || m.id === dispatch.modelId);
    if(model) {
        const destId = r.destinationId;
        const profit = calculateFlightProfit(model, r.distance, destId);
        dispatch.profit = profit;
        gameState.money += profit;
        if (!isCatchingUp) showToast('Vuelo Despegó', `+${formatMoney(profit)} (Ingresos de vuelo a ${dispatch.destName})`, 'success');
    }

    if (!isCatchingUp) {
        logMsg(`Despegue: ${plane ? plane.registration : ''} cubriendo vuelo a ${r.destinationId}. Llegada est: Día ${dispatch.arrivalDay} ${formatTime(dispatch.arrivalHour, dispatch.arrivalMinute)}.`);
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
                }
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

const updateUI = () => {
    // Usar formato abreviado en header — nunca desborda
    document.getElementById('header-money').innerText = formatMoneyShort(gameState.money);
    
    const timeStr = formatTime(gameState.time.hour, gameState.time.minute);
    
    // Badge compacto: solo día de juego + hora
    const dayBadge = document.getElementById('header-day');
    if (dayBadge) {
        dayBadge.innerHTML = `Día ${gameState.time.day} <span class="header-day-time">${timeStr}</span>`;
    }
    
    if(gameState.base) document.getElementById('header-base').innerText = gameState.base.id;
    let profit = getActiveProfit();
    
    document.getElementById('nav-fleet-count').innerText = gameState.fleet.length;
    if(gameState.base) document.getElementById('dash-base').innerText = gameState.base.name;
    document.getElementById('dash-profit').innerHTML = `+${formatMoney(profit)}`;
    
    const activeCount = gameState.fleet.filter(p => p.status === 'in_flight').length;
    document.getElementById('dash-fleet-count').innerText = `${activeCount} / ${gameState.fleet.length}`;
    
    AIRCRAFT_MODELS.forEach(model => {
        const btn = document.getElementById(`btn-buy-${model.id}`);
        if(btn) btn.className = gameState.money >= model.price ? 'btn-buy btn-buy-active' : 'btn-buy btn-buy-disabled';
    });
    
    if (gameState.currentTab === 'flights') {
        renderFlights();
    }
};

// --- FLIGHT MANAGEMENT LOGIC ---
let routeCreationState = null; // null si no estamos creando, objeto si estamos en proceso

const startRouteCreation = () => {
    routeCreationState = { step: 1, destinationId: '', frequencies: [] };
    if (gameState.currentTab !== 'new-route') {
        switchTab('new-route');
    } else {
        renderNewRoute();
    }
};

const cancelRouteCreation = () => {
    routeCreationState = null;
    switchTab('flights');
};

const addFrequencyToRoute = () => {
    if(!routeCreationState.destinationId) return;
    routeCreationState.frequencies.push({
        id: Math.random().toString(36).substr(2, 9),
        days: ['Lun'],
        time: '08:00',
        modelId: '',
        assignedPlanes: []
    });
    renderNewRoute();
};

const updateFrequencyDay = (freqId, dayStr) => {
    const freq = routeCreationState.frequencies.find(f => f.id === freqId);
    if(freq) {
        if(freq.days.includes(dayStr)) freq.days = freq.days.filter(d => d !== dayStr);
        else freq.days.push(dayStr);
        renderNewRoute();
    }
};

const updateFrequencyTime = (freqId, timeStr) => {
    const freq = routeCreationState.frequencies.find(f => f.id === freqId);
    if(freq) freq.time = timeStr;
};

let currentFreqEditorId = null;

const openPlaneSelector = (freqId) => {
    currentFreqEditorId = freqId;
    const freq = routeCreationState.frequencies.find(f => f.id === freqId);
    if(!freq) return;

    document.getElementById('plane-selector-modal').classList.remove('hidden');
    const grid = document.getElementById('plane-selector-grid');
    
    const dest = AIRPORTS.find(a => a.id === routeCreationState.destinationId);
    const dist = calculateDistance(gameState.base.lat, gameState.base.lng, dest.lat, dest.lng);

    const validPlanes = gameState.fleet.filter(plane => plane.range >= dist);
    
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
                    const setColor = () => {
                        if (mv.model && mv.model.materials) {
                            mv.model.materials.forEach(mat => {
                                if(mat.name.toLowerCase().includes('glass') || mat.name.toLowerCase().includes('window')) return;
                                if (plane.id !== 'c208') { try { if (mat.pbrMetallicRoughness.baseColorTexture) mat.pbrMetallicRoughness.baseColorTexture.setTexture(null); } catch(e){} }
                                mat.pbrMetallicRoughness.setBaseColorFactor(plane.savedColor);
                            });
                        }
                    };
                    if (mv.model) setColor(); else mv.addEventListener('load', setColor, {once:true});
                }
            }, 50);
        }
    });
};

const togglePlaneInModal = (planeId) => {
    if(!currentFreqEditorId) return;
    const freq = routeCreationState.frequencies.find(f => f.id === currentFreqEditorId);
    if(!freq) return;
    
    const plane = gameState.fleet.find(p => p.id === planeId);
    
    if (freq.assignedPlanes.includes(planeId)) {
        freq.assignedPlanes = freq.assignedPlanes.filter(pid => pid !== planeId);
        if (freq.assignedPlanes.length === 0) freq.modelId = ''; 
    } else {
        freq.modelId = plane.name; 
        freq.assignedPlanes.push(planeId);
    }
    
    const dest = AIRPORTS.find(a => a.id === routeCreationState.destinationId);
    const dist = calculateDistance(gameState.base.lat, gameState.base.lng, dest.lat, dest.lng);
    const validPlanes = gameState.fleet.filter(plane => plane.range >= dist);
    renderModalGrid(validPlanes, freq);
    renderNewRoute();
};

const closePlaneSelector = () => {
    document.getElementById('plane-selector-modal').classList.add('hidden');
    currentFreqEditorId = null;
};

const deleteFrequency = (freqId) => {
    routeCreationState.frequencies = routeCreationState.frequencies.filter(f => f.id !== freqId);
    renderNewRoute();
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
    }
    
    gameState.routes.push({
        id: Math.random().toString(36).substr(2, 9),
        destinationId: dest.id,
        distance: dist,
        frequencies: routeCreationState.frequencies
    });
    
    logMsg(`Nueva ruta establecida a ${dest.id} con ${routeCreationState.frequencies.length} frecuencias.`);
    showToast('Ruta Operativa', `Ruta a ${dest.name} programada en el sistema.`, 'success');
    
    routeCreationState = null;
    saveGame();
    switchTab('flights');
    updateUI();
};

const resolveDelayedFlight = (dispatchId, action) => {
    const dispatch = gameState.activeDispatches.find(d => d.id === dispatchId);
    if(!dispatch) return;
    
    if(action === 'cancel') {
        gameState.activeDispatches = gameState.activeDispatches.filter(d => d.id !== dispatchId);
        logMsg(`Vuelo a ${dispatch.destName} cancelado.`);
        showToast('Vuelo Cancelado', `Se ha cancelado la salida.`, 'info');
    }
    renderFlights();
};

window.retryDelayedFlight = (dispatchId) => {
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
    
    // Remover el despacho retrasado
    gameState.activeDispatches = gameState.activeDispatches.filter(d => d.id !== dispatchId);
    
    // Intentar embarcar nuevamente
    const model = AIRCRAFT_MODELS.find(m => m.id === freq.modelId || m.name === freq.modelId);
    const dest = AIRPORTS.find(a => a.id === route.destinationId);
    const nowAbs = gameState.time.day * 24 * 60 + gameState.time.hour * 60 + gameState.time.minute;
    
    startBoarding(route, freq, model, dest, nowAbs);
    if(gameState.currentTab === 'flights') renderFlights();
};

const renderNewRoute = () => {
    const view = document.getElementById('view-new-route');
    if (!view) return;

    if (!routeCreationState) {
        view.innerHTML = `
            <div class="market-header">
                <h2>Diseñador de Rutas</h2>
                <p>Configura destinos, horarios y asignación de aeronaves.</p>
            </div>
            <div class="card card-padded" style="text-align: center; padding: 40px 24px; color: var(--text-muted);">
                <button class="btn btn-primary" onclick="startRouteCreation()">Iniciar Creación de Ruta</button>
            </div>
        `;
        return;
    }

    let destOptions = '<option value="">Seleccionar...</option>';
    AIRPORTS.forEach(ap => {
        if (gameState.base && ap.id !== gameState.base.id) {
            destOptions += `<option value="${ap.id}" ${routeCreationState.destinationId === ap.id ? 'selected' : ''}>${ap.name}</option>`;
        }
    });

    const dest = AIRPORTS.find(a => a.id === routeCreationState.destinationId);
    const dist = dest ? calculateDistance(gameState.base.lat, gameState.base.lng, dest.lat, dest.lng) : '---';

    let freqHtml = '';
    routeCreationState.frequencies.forEach((freq, idx) => {
        const daysArr = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        let daysHtml = daysArr.map(d => `<button class="btn-day ${freq.days.includes(d) ? 'active' : ''}" onclick="updateFrequencyDay('${freq.id}', '${d}')">${d}</button>`).join('');
        
        let planesHtml = '<p class="text-xs text-muted" style="margin-top:8px;">Abre el selector para añadir aeronaves.</p>';
        if(freq.assignedPlanes.length > 0) {
            planesHtml = `<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">`;
            freq.assignedPlanes.forEach(pid => {
                const plane = gameState.fleet.find(p => p.id === pid);
                if(plane) planesHtml += `<span class="type-badge" style="position:static; padding:4px 8px; font-size:0.7rem; color:var(--money); border-color:var(--money); background:rgba(48, 209, 88, 0.1);">${plane.registration}</span>`;
            });
            planesHtml += `</div><p class="text-xs text-secondary" style="margin-top:8px;">Modelo asignado: <b>${freq.modelId}</b></p>`;
        }

        freqHtml += `
            <div class="frequency-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 12px; position:relative;">
                <button class="btn-danger-subtle" style="position:absolute; right:16px; top:16px;" onclick="deleteFrequency('${freq.id}')"><i class="ph ph-trash"></i></button>
                <h4 style="margin-bottom:12px; font-size:1rem; color:#fff;">Frecuencia ${idx+1}</h4>
                
                <div style="margin-bottom:12px;">
                    <label class="text-xs text-secondary" style="display:block; margin-bottom:4px;">Días de Operación</label>
                    <div style="display:flex; gap:4px; flex-wrap:wrap;">${daysHtml}</div>
                </div>
                
                <div style="display:flex; gap:16px; margin-bottom:12px; align-items:center;">
                    <div style="flex:1;">
                        <label class="text-xs text-secondary" style="display:block; margin-bottom:4px;">Horario Salida</label>
                        <input type="time" value="${freq.time}" class="flight-input" style="width:100%; padding:8px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); background:var(--bg-elevated); color:#fff;" onchange="updateFrequencyTime('${freq.id}', this.value)">
                    </div>
                    <div style="flex:2;">
                        <button class="btn btn-secondary" style="width:100%; justify-content:center; padding:10px; margin-top:20px;" onclick="openPlaneSelector('${freq.id}')">
                            <i class="ph ph-airplane"></i> ${freq.assignedPlanes.length > 0 ? 'Modificar Flota Asignada' : 'Asignar Aeronaves'}
                        </button>
                    </div>
                </div>
                
                <div>
                    ${planesHtml}
                </div>
            </div>
        `;
    });

    view.innerHTML = `
        <div class="market-header">
            <h2>Diseñador de Rutas</h2>
            <p>Configura destinos, horarios y asignación de aeronaves.</p>
        </div>
        
        <div class="card card-padded" style="margin-bottom: 24px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                <div style="width: 45%;">
                    <label class="text-xs text-secondary" style="display:block; margin-bottom:4px;">Hub Origen</label>
                    <div style="font-size: 1.5rem; font-family: var(--font-mono); font-weight: 800; color: #fff;">${gameState.base ? gameState.base.id : '---'}</div>
                </div>
                <div style="text-align: center; flex:1;">
                    <i class="ph ph-airplane-in-flight" style="color: var(--accent); font-size: 1.5rem;"></i>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${dist !== '---' ? dist + ' km' : ''}</div>
                </div>
                <div style="width: 45%; text-align:right;">
                    <label class="text-xs text-secondary" style="display:block; margin-bottom:4px; text-align:left;">Destino</label>
                    <select id="route-destination-new" class="flight-select" onchange="routeCreationState.destinationId = this.value; renderNewRoute()" style="width: 100%; font-size: 1.2rem; font-weight: 700; padding: 4px; text-align:left; background:transparent; border:none; color:#fff; border-bottom:1px solid var(--border-hover);">
                        ${destOptions}
                    </select>
                </div>
            </div>
            
            ${routeCreationState.destinationId ? `
                <h3 style="margin:24px 0 16px; font-size:1.1rem; color:#fff; display:flex; justify-content:space-between; align-items:center;">
                    Frecuencias Semanales
                    <button class="btn btn-secondary btn-sm" onclick="addFrequencyToRoute()"><i class="ph ph-plus"></i> Añadir Frecuencia</button>
                </h3>
                
                ${routeCreationState.frequencies.length === 0 ? '<p class="text-muted" style="text-align:center; padding:20px;">Añade al menos una frecuencia para operar esta ruta.</p>' : freqHtml}
                
                <div style="display:flex; gap:12px; margin-top:24px;">
                    <button class="btn btn-danger-subtle" style="flex:1;" onclick="cancelRouteCreation()">Cancelar</button>
                    <button class="btn btn-primary" style="flex:2;" onclick="finalizeRouteCreation()">Activar Ruta</button>
                </div>
            ` : ''}
        </div>
    `;
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
            arrTimeStr: '--:--',
            status: 'Atrasado',
            dayGroup: -1, // -1 para atrasados
            sortKey: 0,
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
            destId: getDestId(d.routeId),
            destName: d.destName,
            planeReg: plane ? plane.registration : '---',
            planeModel: plane ? plane.name : '---',
            depTimeStr: formatTime(d.departureHour, d.departureMinute),
            arrTimeStr: formatTime(d.arrivalHour, d.arrivalMinute),
            status: 'En vuelo',
            dayGroup: d.departureDay,
            sortKey: 1,
            absTime: depAbs,
            progress: progress,
            delayMins: d.delayMins || 0,
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
            arrTimeStr: '--:--',
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
            const dest = AIRPORTS.find(a => a.id === route.destinationId);
            route.frequencies.forEach(freq => {
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
                            const isDelayed = delayedFlights.some(f => f.freqId === freq.id);
                            
                            if (!isActive && !isDelayed) {
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
                    allFlights.push({
                        type: 'scheduled',
                        id: freq.id,
                        destId: dest.id,
                        destName: dest.name,
                        planeReg: 'A Asignar',
                        planeModel: model ? model.name : '---',
                        depTimeStr: formatTime(nextHour, nextMinute),
                        arrTimeStr: '--:--', // Lógica simplificada para scheduled
                        status: 'Programado',
                        dayGroup: nextD,
                        sortKey: 2,
                        absTime: minAbs,
                        progress: 0,
                        obj: { routeId: route.id, freqId: freq.id }
                    });
                }
            });
        });
    }

    // Agrupar por día
    const groups = {};
    allFlights.forEach(f => {
        if (!groups[f.dayGroup]) groups[f.dayGroup] = [];
        groups[f.dayGroup].push(f);
    });

    // Ordenar los días
    const sortedDays = Object.keys(groups).map(Number).sort((a, b) => a - b);

    let boardHtml = '';
    if (allFlights.length === 0) {
        boardHtml = `
            <div class="card card-padded" style="text-align: center; padding: 40px 24px; color: var(--text-muted); margin-top:24px;">
                <i class="ph ph-airplane-tilt" style="font-size: 3rem; opacity: 0.3; margin-bottom: 12px; display: block;"></i>
                <p>No tienes vuelos activos ni programados.</p>
                <button class="btn btn-primary" style="margin-top:16px;" onclick="switchTab('new-route')">Programar Nueva Ruta</button>
            </div>
        `;
    } else {
        sortedDays.forEach(day => {
            const flightsInDay = groups[day];
            
            // Sort flights within the day by time
            flightsInDay.sort((a, b) => a.absTime - b.absTime);

            let dayTitle = `Día ${day}`;
            if (day === -1) dayTitle = `<span style="color:#ef4444;"><i class="ph ph-warning"></i> Requieren Atención</span>`;
            else if (day === gameState.time.day) dayTitle = "Hoy";
            else if (day === gameState.time.day + 1) dayTitle = "Mañana";

            boardHtml += `<div class="day-section-title">${dayTitle}</div>`;
            
            boardHtml += `<div style="display:flex; flex-direction:column; gap:10px;">`;
            flightsInDay.forEach(f => {
                let statusClass = 'status-scheduled';
                let statusColor = '#22c55e'; // Green for Programado
                let timePrefix = 'Prog: ';

                if (f.type === 'delayed') { 
                    statusClass = 'status-delayed'; 
                    statusColor = '#ef4444'; // Red for delayed
                    timePrefix = 'Est: ';
                } else if (f.type === 'boarding') { 
                    statusClass = 'status-scheduled'; 
                    statusColor = (f.delayMins && f.delayMins > 3) ? '#f97316' : '#22c55e'; // Orange if delay, green if on time
                    timePrefix = 'Prog: ';
                } else if (f.type === 'in_flight') { 
                    statusClass = 'status-inflight'; 
                    statusColor = (f.delayMins && f.delayMins > 3) ? '#f97316' : '#3b82f6'; // Orange if departed late, Blue if on time
                    timePrefix = 'Despegó: ';
                }

                let statusIcon = `<div class="status-dot" style="background-color: ${statusColor}; box-shadow: 0 0 8px ${statusColor};"></div>`;
                let arrTimePrefix = f.type === 'in_flight' ? 'Est: ' : '';

                let delayHtml = '';
                if (f.delayMins !== undefined && f.delayMins !== null) {
                    if (f.delayMins > 3) {
                        delayHtml = `<span style="color: #ef4444; font-size: 0.75rem; margin-left: 6px;">(+${f.delayMins}m)</span>`;
                    } else if (f.delayMins < -1) {
                        delayHtml = `<span style="color: #22c55e; font-size: 0.75rem; margin-left: 6px;">(${f.delayMins}m)</span>`;
                    } else if (f.delayMins !== 0) {
                        delayHtml = `<span style="color: #9ca3af; font-size: 0.75rem; margin-left: 6px;">(${f.delayMins > 0 ? '+' : ''}${f.delayMins}m)</span>`;
                    }
                }

                let actionsHtml = '';
                if (f.type === 'delayed') {
                    actionsHtml = `
                        <div style="display:flex; gap:6px; margin-top:8px;">
                            <button class="btn btn-primary" style="padding: 4px 8px; font-size: 0.7rem;" onclick="retryDelayedFlight('${f.id}')"><i class="ph ph-arrows-clockwise"></i> Reintentar</button>
                            <button class="btn-danger-subtle" style="padding: 4px 8px; font-size: 0.7rem;" onclick="resolveDelayedFlight('${f.id}', 'cancel')"><i class="ph ph-x"></i> Cancelar</button>
                        </div>
                    `;
                } else if (f.type === 'scheduled') { actionsHtml = ''; }

                boardHtml += `
                    <div class="flight-card modern-flight-card ${f.type === 'in_flight' ? 'active-flight' : ''}">
                        <div class="fc-header">
                            <div class="fc-plane-info">
                                <i class="ph-fill ph-airplane-in-flight"></i>
                                <span><strong>${f.planeReg}</strong> <span style="opacity:0.5; margin: 0 4px;">•</span> ${f.planeModel}</span>
                            </div>
                            <div class="fc-status-container">
                                <div class="flight-status-badge ${statusClass}" style="display:flex; align-items:center;">
                                    ${statusIcon} ${f.status}
                                </div>
                                ${actionsHtml}
                            </div>
                        </div>

                        <div class="fc-body">
                            <div class="fc-route-top">
                                <span class="fc-loc-code">BUE</span>
                                <div class="fc-route-graphic">
                                    <div class="fc-route-line"></div>
                                    ${f.type === 'in_flight' ? `
                                    <div class="fc-progress-track">
                                        <div class="fc-progress-fill" style="width: ${f.progress}%;">
                                            <div class="fc-progress-glow"></div>
                                        </div>
                                    </div>
                                    ` : ''}
                                </div>
                                <span class="fc-loc-code">${f.destId}</span>
                            </div>
                            <div class="fc-route-bottom">
                                <span class="fc-loc-time" style="text-align: left;"><strong>${timePrefix}</strong>${f.depTimeStr}${delayHtml}</span>
                                <span class="fc-loc-time" style="text-align: right;"><strong>${arrTimePrefix}</strong>${f.arrTimeStr}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            boardHtml += `</div>`;
        });
    }

    flightsView.innerHTML = `
        <div class="market-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h2>Tablero de Vuelos</h2>
                <p>Monitorea tu flota agrupada por días.</p>
            </div>
            <button class="btn btn-secondary" style="border-radius: 9999px; padding: 8px 16px; display: flex; align-items: center; gap: 8px;" onclick="switchTab('history')">
                <i class="ph ph-clock-counter-clockwise"></i> Historial
            </button>
        </div>
        ${boardHtml}
    `;
};

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

    let historyHtml = `<div style="display:flex; flex-direction:column; gap:10px;">`;
    
    gameState.flightHistory.forEach(f => {
        const depStr = formatTime(f.departureHour, f.departureMinute);
        const arrStr = formatTime(f.arrivalHour, f.arrivalMinute);
        
        historyHtml += `
            <div class="flight-card modern-flight-card" style="opacity: 0.85;">
                <div class="fc-header">
                    <div class="fc-plane-info">
                        <i class="ph-fill ph-airplane-landing"></i>
                        <span><strong>${f.planeReg}</strong> <span style="opacity:0.5; margin: 0 4px;">•</span> ${f.planeModel}</span>
                    </div>
                    <div class="fc-status-container">
                        <div class="flight-status-badge" style="display:flex; align-items:center; background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2);">
                            <i class="ph-fill ph-check-circle" style="margin-right: 4px;"></i> Completado
                        </div>
                    </div>
                </div>

                <div class="fc-body">
                    <div class="fc-route-top">
                        <span class="fc-loc-code">BUE</span>
                        <div class="fc-route-graphic">
                            <div class="fc-route-line" style="opacity: 0.3;"></div>
                        </div>
                        <span class="fc-loc-code">${f.destName.substring(0,3).toUpperCase()}</span>
                    </div>
                    <div class="fc-route-bottom" style="margin-bottom: 12px;">
                        <span class="fc-loc-time" style="text-align: left;">Día ${f.departureDay} ${depStr}</span>
                        <span class="fc-loc-time" style="text-align: right;">Día ${f.arrivalDay} ${arrStr}</span>
                    </div>
                    <div style="border-top: 1px solid var(--border-subtle); padding-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span class="text-sm text-muted">Destino: <strong>${f.destName}</strong></span>
                        <span class="text-sm" style="color: #22c55e; font-weight: 600;">+${formatMoney(f.profit)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    historyHtml += `</div>`;

    historyView.innerHTML = `
        <div class="market-header" style="margin-bottom: 24px;">
            <h2>Historial de Vuelos</h2>
            <p>Registros de los últimos vuelos completados.</p>
        </div>
        ${historyHtml}
    `;
};

window.onload = () => {
    if (loadGame() && gameState.base) {
        startGame();
    } else {
        initMap();
    }
};
