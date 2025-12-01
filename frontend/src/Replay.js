/**
 * Replay.js - Sistema de replay sincronizado
 * Gerencia a reprodução da telemetria de todos os pilotos
 */

export class ReplayController {
    constructor(telemetryData, carManager) {
        this.telemetry = telemetryData;
        this.carManager = carManager;

        this.currentTime = 0;
        this.playbackSpeed = 1.0;
        this.isPlaying = false;

        // Encontrar duração total
        this.duration = this.calculateDuration();

        // Pré-processar índices para busca rápida
        this.indices = {};
        for (const driver of Object.keys(this.telemetry)) {
            this.indices[driver] = 0;
        }
    }

    calculateDuration() {
        let maxTime = 0;
        for (const driverData of Object.values(this.telemetry)) {
            if (driverData.length > 0) {
                const lastTime = driverData[driverData.length - 1].t;
                maxTime = Math.max(maxTime, lastTime);
            }
        }
        return maxTime;
    }

    update(deltaTime) {
        // Avançar tempo
        this.currentTime += deltaTime * this.playbackSpeed;

        // Loop no final
        if (this.currentTime > this.duration) {
            this.currentTime = 0;
            // Resetar índices
            for (const driver of Object.keys(this.indices)) {
                this.indices[driver] = 0;
            }
        }

        // Obter estado atual de todos os pilotos
        return this.getStateAtTime(this.currentTime);
    }

    getStateAtTime(time) {
        const state = {};

        for (const [driver, data] of Object.entries(this.telemetry)) {
            if (!data || data.length === 0) continue;

            // Busca binária para encontrar o frame mais próximo
            const frame = this.findFrameAtTime(data, time, driver);

            if (frame) {
                state[driver] = frame;
            }
        }

        return state;
    }

    findFrameAtTime(data, time, driver) {
        // Usar índice em cache para busca mais rápida
        let idx = this.indices[driver] || 0;

        // Avançar até encontrar o frame correto
        while (idx < data.length - 1 && data[idx + 1].t <= time) {
            idx++;
        }

        // Voltar se necessário (quando seekamos para trás)
        while (idx > 0 && data[idx].t > time) {
            idx--;
        }

        this.indices[driver] = idx;

        // Interpolar entre frames se possível
        if (idx < data.length - 1) {
            const current = data[idx];
            const next = data[idx + 1];
            const t = (time - current.t) / (next.t - current.t);

            if (t >= 0 && t <= 1) {
                return this.interpolateFrames(current, next, t);
            }
        }

        return data[idx];
    }

    interpolateFrames(a, b, t) {
        // Interpolar posição e heading suavemente
        return {
            t: a.t + (b.t - a.t) * t,
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            heading: this.lerpAngle(a.heading, b.heading, t),
            speed: Math.round(a.speed + (b.speed - a.speed) * t),
            lap: a.lap,
            gear: a.gear,
            throttle: a.throttle,
            brake: a.brake,
            drs: a.drs
        };
    }

    lerpAngle(a, b, t) {
        // Interpolação de ângulo considerando wrapping
        let diff = b - a;

        // Normalizar diferença para -PI a PI
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        return a + diff * t;
    }

    setSpeed(speed) {
        this.playbackSpeed = speed;
    }

    seekTo(progress) {
        // Progress é 0-1
        this.currentTime = progress * this.duration;

        // Resetar índices para busca correta
        for (const driver of Object.keys(this.indices)) {
            this.indices[driver] = 0;
        }
    }

    skip(seconds) {
        this.currentTime = Math.max(0, Math.min(this.duration, this.currentTime + seconds));

        // Resetar índices se voltamos no tempo
        if (seconds < 0) {
            for (const driver of Object.keys(this.indices)) {
                this.indices[driver] = 0;
            }
        }
    }

    getProgress() {
        return this.duration > 0 ? this.currentTime / this.duration : 0;
    }

    getCurrentTime() {
        return this.currentTime;
    }

    getDuration() {
        return this.duration;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}
