/**
 * PositionTracker.js - Sistema de rastreamento de posições
 * Calcula posições em tempo real e detecta ultrapassagens
 */

export class PositionTracker {
    constructor(trackData, drivers) {
        this.trackData = trackData;
        this.drivers = drivers;

        // Track points com escala aplicada
        this.trackPoints = trackData.track_points.map(p => ({
            x: p.x * 0.1,
            y: p.y * 0.1
        }));

        // Calcular comprimento acumulado da pista para cada ponto
        this.cumulativeDistances = this.calculateCumulativeDistances();
        this.trackLength = this.cumulativeDistances[this.cumulativeDistances.length - 1] || 1;

        // Estado atual
        this.positions = new Map(); // driverCode -> { position, progress, lap }
        this.previousPositions = new Map();

        // Callbacks para eventos
        this.overtakeCallbacks = [];

        // Tempo aproximado de volta (usado para calcular gaps)
        this.averageLapTime = 85; // segundos (será ajustado dinamicamente)

        // Debounce para ultrapassagens (evitar falsos positivos)
        this.lastOvertakeTime = new Map(); // driverCode -> timestamp
        this.overtakeDebounceMs = 3000; // Mínimo 3 segundos entre ultrapassagens do mesmo piloto
    }

    /**
     * Calcula distância acumulada ao longo da pista
     */
    calculateCumulativeDistances() {
        const distances = [0];
        let totalDistance = 0;

        for (let i = 1; i < this.trackPoints.length; i++) {
            const dx = this.trackPoints[i].x - this.trackPoints[i - 1].x;
            const dy = this.trackPoints[i].y - this.trackPoints[i - 1].y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
            distances.push(totalDistance);
        }

        return distances;
    }

    /**
     * Encontra o ponto mais próximo na pista e retorna o progresso (0-1)
     */
    findTrackProgress(x, y) {
        const scale = 0.1;
        const scaledX = x * scale;
        const scaledY = y * scale;

        let minDist = Infinity;
        let closestIndex = 0;

        // Busca o ponto mais próximo na pista
        for (let i = 0; i < this.trackPoints.length; i++) {
            const p = this.trackPoints[i];
            const dx = p.x - scaledX;
            const dy = p.y - scaledY;
            const dist = dx * dx + dy * dy;

            if (dist < minDist) {
                minDist = dist;
                closestIndex = i;
            }
        }

        // Retorna progresso como fração da pista (0-1)
        return this.cumulativeDistances[closestIndex] / this.trackLength;
    }

    /**
     * Calcula o progresso total do piloto (laps completas + fração atual)
     */
    calculateTotalProgress(x, y, lap) {
        const trackFraction = this.findTrackProgress(x, y);
        return (lap - 1) + trackFraction;
    }

    /**
     * Atualiza posições de todos os pilotos e detecta ultrapassagens
     */
    update(telemetryState) {
        // Salvar posições anteriores
        this.previousPositions = new Map(this.positions);

        // Calcular progresso para cada piloto
        const progressList = [];

        for (const [driverCode, data] of Object.entries(telemetryState)) {
            if (!data) continue;

            const progress = this.calculateTotalProgress(data.x, data.y, data.lap || 1);

            progressList.push({
                driverCode,
                progress,
                lap: data.lap || 1,
                x: data.x,
                y: data.y,
                speed: data.speed || 0
            });
        }

        // Ordenar por progresso (maior = liderando)
        progressList.sort((a, b) => b.progress - a.progress);

        // Detectar ultrapassagens
        const overtakes = [];

        progressList.forEach((entry, index) => {
            const position = index + 1;
            const prevEntry = this.previousPositions.get(entry.driverCode);

            // Atualizar posição atual
            this.positions.set(entry.driverCode, {
                position,
                progress: entry.progress,
                lap: entry.lap
            });

            // Verificar se ganhou posição (com debounce)
            if (prevEntry && prevEntry.position > position) {
                const now = Date.now();
                const lastOvertake = this.lastOvertakeTime.get(entry.driverCode) || 0;

                // Só registrar ultrapassagem se passou tempo suficiente desde a última
                if (now - lastOvertake > this.overtakeDebounceMs) {
                    // Encontrar quem perdeu a posição
                    const prevPositionHolder = Array.from(this.previousPositions.entries())
                        .find(([code, p]) => p.position === position);

                    if (prevPositionHolder) {
                        overtakes.push({
                            gained: entry.driverCode,
                            lost: prevPositionHolder[0],
                            newPosition: position
                        });

                        // Atualizar timestamp da última ultrapassagem
                        this.lastOvertakeTime.set(entry.driverCode, now);
                        this.lastOvertakeTime.set(prevPositionHolder[0], now);
                    }
                }
            }
        });

        // Notificar callbacks sobre ultrapassagens
        overtakes.forEach(overtake => {
            this.overtakeCallbacks.forEach(cb => cb(overtake));
        });

        return progressList;
    }

    /**
     * Calcula gap em segundos para o líder
     */
    calculateGaps(standings) {
        if (standings.length === 0) return [];

        const leader = standings[0];

        return standings.map((entry, index) => {
            if (index === 0) {
                return { ...entry, gap: 0, interval: 0 };
            }

            // Gap em "progresso de pista", converter para segundos aproximados
            const progressDiff = leader.progress - entry.progress;
            const gapSeconds = progressDiff * this.averageLapTime;

            // Intervalo para o carro da frente
            const carAhead = standings[index - 1];
            const intervalDiff = carAhead.progress - entry.progress;
            const intervalSeconds = intervalDiff * this.averageLapTime;

            return {
                ...entry,
                gap: Math.max(0, gapSeconds),
                interval: Math.max(0, intervalSeconds)
            };
        });
    }

    /**
     * Registra callback para eventos de ultrapassagem
     */
    onOvertake(callback) {
        this.overtakeCallbacks.push(callback);
    }

    /**
     * Remove callback de ultrapassagem
     */
    offOvertake(callback) {
        const index = this.overtakeCallbacks.indexOf(callback);
        if (index > -1) {
            this.overtakeCallbacks.splice(index, 1);
        }
    }

    /**
     * Obtém posição atual de um piloto
     */
    getPosition(driverCode) {
        return this.positions.get(driverCode);
    }

    /**
     * Atualiza tempo médio de volta (para cálculo de gaps mais preciso)
     */
    setAverageLapTime(lapTime) {
        this.averageLapTime = lapTime;
    }
}
