/**
 * ÉTER - Motor de Audio Espacial Procedural WebAudio
 * Síntesis analógica en tiempo real sin archivos externos
 */
class SpaceSoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.initialized = false;

        this.thrustGain = null;
        this.thrusterFilter = null;
        this.subGain = null;
        this.subOsc = null;
        this.warpGain = null;
        this.warpOsc = null;
        this.rcsGain = null;
        this.windGain = null;
        this.windFilter = null;
        this.droneGain = null;
    }

    init() {
        if (this.initialized) {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            return;
        }
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();

            // 1. Buffer de Ruido Rosa para Propulsión y Turbulencia Térmica
            const bSize = this.ctx.sampleRate * 2;
            const buffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < bSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                b6 = white * 0.115926;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;

            this.thrusterFilter = this.ctx.createBiquadFilter();
            this.thrusterFilter.type = 'lowpass';
            this.thrusterFilter.frequency.value = 180;
            this.thrusterFilter.Q.value = 1.6;

            this.thrustGain = this.ctx.createGain();
            this.thrustGain.gain.value = 0.0001;

            noise.connect(this.thrusterFilter);
            this.thrusterFilter.connect(this.thrustGain);
            this.thrustGain.connect(this.ctx.destination);
            noise.start();

            // 2. Viento Atmosférico y Silbido de Reentrada
            const windNoise = this.ctx.createBufferSource();
            windNoise.buffer = buffer;
            windNoise.loop = true;

            this.windFilter = this.ctx.createBiquadFilter();
            this.windFilter.type = 'bandpass';
            this.windFilter.frequency.value = 600;
            this.windFilter.Q.value = 0.8;

            this.windGain = this.ctx.createGain();
            this.windGain.gain.value = 0.0001;

            windNoise.connect(this.windFilter);
            this.windFilter.connect(this.windGain);
            this.windGain.connect(this.ctx.destination);
            windNoise.start();

            // 3. Toberas de Gas Frío RCS
            const rcsBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
            const rcsData = rcsBuf.getChannelData(0);
            for (let i = 0; i < rcsData.length; i++) rcsData[i] = (Math.random() * 2 - 1) * 0.45;
            const rcsSource = this.ctx.createBufferSource();
            rcsSource.buffer = rcsBuf;
            rcsSource.loop = true;

            const rcsFilter = this.ctx.createBiquadFilter();
            rcsFilter.type = 'bandpass';
            rcsFilter.frequency.value = 2400;
            rcsFilter.Q.value = 2.0;

            this.rcsGain = this.ctx.createGain();
            this.rcsGain.gain.value = 0.0001;

            rcsSource.connect(rcsFilter);
            rcsFilter.connect(this.rcsGain);
            this.rcsGain.connect(this.ctx.destination);
            rcsSource.start();

            // 4. Subgrave Armónico Térmico
            this.subOsc = this.ctx.createOscillator();
            this.subOsc.type = 'triangle';
            this.subOsc.frequency.value = 46;
            this.subGain = this.ctx.createGain();
            this.subGain.gain.value = 0.0001;
            this.subOsc.connect(this.subGain);
            this.subGain.connect(this.ctx.destination);
            this.subOsc.start();

            // 5. Motor de Curvatura Warp
            this.warpOsc = this.ctx.createOscillator();
            this.warpOsc.type = 'sine';
            this.warpOsc.frequency.value = 88;
            this.warpGain = this.ctx.createGain();
            this.warpGain.gain.value = 0.0001;
            this.warpOsc.connect(this.warpGain);
            this.warpGain.connect(this.ctx.destination);
            this.warpOsc.start();

            // 6. Drone Cósmico Binaural
            const drone1 = this.ctx.createOscillator();
            const drone2 = this.ctx.createOscillator();
            drone1.type = 'sine';
            drone2.type = 'sine';
            drone1.frequency.value = 55.0; // A1
            drone2.frequency.value = 82.41; // E2 (Quinta perfecta)
            this.droneGain = this.ctx.createGain();
            this.droneGain.gain.value = 0.024;
            drone1.connect(this.droneGain);
            drone2.connect(this.droneGain);
            this.droneGain.connect(this.ctx.destination);
            drone1.start();
            drone2.start();

            this.initialized = true;
        } catch (e) {
            console.warn('Audio desactivado:', e);
        }
    }

    setThrust(intensity, isWarp, isRcsActive = false) {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const thrustTarget = isWarp ? 0.25 : Math.max(0.0001, Math.min(0.2, intensity * 0.18));
        const subTarget = isWarp ? 0.18 : Math.max(0.0001, Math.min(0.15, intensity * 0.13));
        const freqTarget = isWarp ? 620 : (140 + intensity * 340);

        this.thrustGain.gain.setTargetAtTime(thrustTarget, now, 0.05);
        this.thrusterFilter.frequency.setTargetAtTime(freqTarget, now, 0.06);
        this.subGain.gain.setTargetAtTime(subTarget, now, 0.06);
        this.warpGain.gain.setTargetAtTime(isWarp ? 0.16 : 0.0001, now, 0.08);
        this.warpOsc.frequency.setTargetAtTime(isWarp ? 132 : 76, now, 0.1);
        this.rcsGain.gain.setTargetAtTime(isRcsActive ? 0.026 : 0.0001, now, 0.03);
    }

    setAtmosphericFlight(density, speed) {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        // El silbido sube con densidad de aire y velocidad
        const windVol = Math.max(0.0001, Math.min(0.18, (density * (speed / 600)) * 0.15));
        const windFreq = Math.min(1800, 300 + speed * 1.8);
        this.windGain.gain.setTargetAtTime(windVol, now, 0.1);
        this.windFilter.frequency.setTargetAtTime(windFreq, now, 0.1);
    }

    playSonar() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        [0, 0.24].forEach((delay, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const startT = now + delay;
            const vol = idx === 0 ? 0.16 : 0.06;
            osc.frequency.setValueAtTime(528, startT);
            osc.frequency.exponentialRampToValueAtTime(1056, startT + 0.14);
            osc.frequency.exponentialRampToValueAtTime(396, startT + 1.15);
            gain.gain.setValueAtTime(vol, startT);
            gain.gain.exponentialRampToValueAtTime(0.0001, startT + 1.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(startT);
            osc.stop(startT + 1.25);
        });
    }

    playImpact(strength) {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(26, now + 0.28);
        gain.gain.setValueAtTime(Math.max(0.04, Math.min(0.32, strength * 0.2)), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);
    }

    playChime() {
        if (!this.initialized || this.muted) return;
        // Acorde Lidio ascendente cristalino (F4, A4, C5, E5, B5)
        const freqs = [349.23, 440.00, 523.25, 659.25, 987.77];
        freqs.forEach((f, i) => {
            const now = this.ctx.currentTime + i * 0.065;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 1.0);
        });
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.initialized) {
            const now = this.ctx.currentTime;
            this.droneGain.gain.setTargetAtTime(this.muted ? 0.0001 : 0.024, now, 0.1);
            if (this.muted) {
                this.thrustGain.gain.setTargetAtTime(0.0001, now, 0.04);
                this.subGain.gain.setTargetAtTime(0.0001, now, 0.04);
                this.warpGain.gain.setTargetAtTime(0.0001, now, 0.04);
                this.rcsGain.gain.setTargetAtTime(0.0001, now, 0.04);
                this.windGain.gain.setTargetAtTime(0.0001, now, 0.04);
            }
        }
        return this.muted;
    }

    // --- SONIDOS PROCEDURALES DEL SISTEMA EVA (ASTRONAUTA) ---

    playAirlock(open = true) {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        
        const bSize = Math.floor(this.ctx.sampleRate * 0.4);
        const buffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bSize * 0.35));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(open ? 1400 : 900, now);
        filter.frequency.exponentialRampToValueAtTime(open ? 400 : 1600, now + 0.35);
        filter.Q.value = 1.8;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.4);

        const osc = this.ctx.createOscillator();
        const clankGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(open ? 240 : 180, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
        clankGain.gain.setValueAtTime(0.12, now + 0.05);
        clankGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        osc.connect(clankGain);
        clankGain.connect(this.ctx.destination);
        osc.start(now + 0.05);
        osc.stop(now + 0.26);
    }

    playFootstep() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const bSize = Math.floor(this.ctx.sampleRate * 0.06);
        const buffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bSize);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 380 + Math.random() * 120;
        filter.Q.value = 2.2;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.045 + Math.random() * 0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.07);
    }

    playJetpackPuff() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const bSize = Math.floor(this.ctx.sampleRate * 0.12);
        const buffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bSize);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2200, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.12);
    }

    playHydraulic() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(85, now);
        osc.frequency.exponentialRampToValueAtTime(145, now + 0.45);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.7);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.75);
    }

    playRepairTorch() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const bSize = Math.floor(this.ctx.sampleRate * 0.08);
        const buffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.2 ? 1 : 0.2);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3200 + (Math.random() - 0.5) * 800;
        filter.Q.value = 3.5;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.08);
    }

    playBeaconPlant() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);

        setTimeout(() => {
            if (!this.ctx) return;
            const t2 = this.ctx.currentTime;
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880, t2);
            osc2.frequency.exponentialRampToValueAtTime(1760, t2 + 0.35);
            gain2.gain.setValueAtTime(0.12, t2);
            gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.85);
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(t2);
            osc2.stop(t2 + 0.9);
        }, 120);
    }

    playScanner() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.linearRampToValueAtTime(2400, now + 0.18);
        osc.frequency.linearRampToValueAtTime(800, now + 0.35);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    }

    playBaseBuild(progress = 0) {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        if (!this.lastBaseBuildSound || now - this.lastBaseBuildSound > 0.08) {
            this.lastBaseBuildSound = now;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = Math.random() < 0.6 ? 'sawtooth' : 'triangle';
            const baseFreq = 160 + progress * 480 + (Math.random() - 0.5) * 50;
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq + 70, now + 0.08);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(750 + progress * 1400, now);
            filter.Q.value = 4.0;

            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.09);
        }
    }

    playBaseComplete() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        
        // Acorde triunfal ascendente aeroespacial de 5 tonos brillantes
        const freqs = [261.63, 329.63, 392.00, 523.25, 659.25];
        freqs.forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const startTime = now + idx * 0.07;
            osc.frequency.setValueAtTime(f, startTime);
            osc.frequency.exponentialRampToValueAtTime(f * 1.01, startTime + 0.65);

            gain.gain.setValueAtTime(0.13, startTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.75);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.8);
        });

        // Sub-bajo de impacto masivo de anclaje de cimientos
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(90, now);
        sub.frequency.exponentialRampToValueAtTime(32, now + 0.55);
        subGain.gain.setValueAtTime(0.24, now);
        subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        sub.connect(subGain);
        subGain.connect(this.ctx.destination);
        sub.start(now);
        sub.stop(now + 0.65);
    }

    // --- SONIDOS PROCEDURALES PARA CRIATURAS Y COMBATE ESPACIAL ---

    playPhotonBlaster(isShip = false) {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = isShip ? 'sawtooth' : 'triangle';
        const startFreq = isShip ? 1200 : 1600;
        const endFreq = isShip ? 280 : 420;
        const dur = isShip ? 0.22 : 0.16;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isShip ? 2400 : 3200, now);
        filter.frequency.exponentialRampToValueAtTime(600, now + dur);

        gain.gain.setValueAtTime(isShip ? 0.22 : 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + dur + 0.02);
    }

    playCreatureChirp(pitch = 1.0) {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const f0 = 950 * pitch;
        const f1 = 1580 * pitch;
        const f2 = 1220 * pitch;

        osc.frequency.setValueAtTime(f0, now);
        osc.frequency.linearRampToValueAtTime(f1, now + 0.08);
        osc.frequency.linearRampToValueAtTime(f2, now + 0.18);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.10, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    playCreatureRoar(pitch = 1.0) {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        const f0 = 130 * pitch;
        const f1 = 65 * pitch;

        osc.frequency.setValueAtTime(f0, now);
        osc.frequency.exponentialRampToValueAtTime(f1, now + 0.45);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450 * pitch, now);
        filter.frequency.linearRampToValueAtTime(180, now + 0.45);
        filter.Q.value = 3.5;

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.52);
    }

    playCreatureHurt() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
    }

    playCreatureAlert() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.linearRampToValueAtTime(820, now + 0.12);

        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.24);
    }

    playCreatureDissolve() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const chord = [523.25, 659.25, 783.99, 1046.50]; // Acorde C mayor luminoso
        chord.forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const t = now + idx * 0.05;
            osc.frequency.setValueAtTime(f, t);
            osc.frequency.exponentialRampToValueAtTime(f * 1.08, t + 0.45);

            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.6);
        });
    }

    // --- TRUENO Y DESCARGA METEOROLÓGICA PLANETARIA ---
    playThunder(power = 1.0, distance = 1000) {
        if (!this.initialized || this.muted || !this.ctx) return;
        const delay = Math.min(2.8, Math.max(0.03, distance / 1400));
        const now = this.ctx.currentTime + delay;
        const vol = Math.max(0.01, Math.min(0.9, (power * 1.2) / (1 + distance * 0.00075)));

        // 1. Estruendo Sísmico Sub-grave (Sub-bass rumble)
        try {
            const subOsc = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            subOsc.type = 'triangle';
            subOsc.frequency.setValueAtTime(54, now);
            subOsc.frequency.exponentialRampToValueAtTime(22, now + 1.8);

            subGain.gain.setValueAtTime(0.001, now);
            subGain.gain.linearRampToValueAtTime(vol * 0.75, now + 0.06);
            subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

            subOsc.connect(subGain);
            subGain.connect(this.ctx.destination);
            subOsc.start(now);
            subOsc.stop(now + 2.3);

            // 2. Ruido Browniano / Rosa filtrado para el retumbo resonante en la atmósfera
            const dur = 2.4 + power * 0.8;
            const bSize = Math.floor(this.ctx.sampleRate * dur);
            const buffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            let lastOut = 0;
            for (let i = 0; i < bSize; i++) {
                const white = Math.random() * 2 - 1;
                lastOut = (lastOut + 0.04 * white) / 1.04; // Ruido marrón
                data[i] = lastOut * 3.8;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            const initCutoff = Math.min(650, 160 + power * 260 - Math.min(100, distance * 0.04));
            filter.frequency.setValueAtTime(initCutoff, now);
            filter.frequency.exponentialRampToValueAtTime(45, now + dur);
            filter.Q.setValueAtTime(2.2, now);

            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.001, now);
            // Crack inicial si está muy cerca
            if (distance < 900) {
                nGain.gain.linearRampToValueAtTime(vol * 0.95, now + 0.02);
                nGain.gain.setValueAtTime(vol * 0.55, now + 0.12);
            } else {
                nGain.gain.linearRampToValueAtTime(vol * 0.65, now + 0.18);
            }
            nGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

            noise.connect(filter);
            filter.connect(nGain);
            nGain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + dur + 0.1);
        } catch (e) {
            // Ignorar errores de audio suspendido o contexto cerrado
        }
    }

    // --- SONIDOS DE EXTRACCIÓN DE RECURSOS E INFRAESTRUCTURA ---
    playExtractorDeploy() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(68, now + 0.22);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 620;
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.27);
    }

    playExtractorUpgrade(tier = 2) {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const baseNotes = [330, 440, 554.37, 659.25];
        baseNotes.slice(0, Math.min(4, tier + 1)).forEach((freq, idx) => {
            const t = now + idx * 0.065;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + 0.24);
            gain.gain.setValueAtTime(0.11, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.3);
        });
    }

    playResourceCollect() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        [587.33, 880].forEach((freq, idx) => {
            const t = now + idx * 0.05;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.09, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.2);
        });
    }

    playRefuelTransfer() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.linearRampToValueAtTime(340, now + 0.09);
        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    }
}
