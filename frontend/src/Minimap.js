/**
 * Minimap.js - Minimapa 2D
 * Mostra a posição de todos os carros no circuito
 */

export class Minimap {
    constructor(canvasId, trackData, drivers) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas?.getContext('2d');
        this.trackData = trackData;
        this.drivers = drivers;

        // Configurações
        this.padding = 15;
        this.carSize = 6;

        // Calcular bounds do circuito
        this.bounds = this.calculateBounds();

        // Redimensionar canvas
        this.resize();

        // Desenhar circuito de fundo
        this.drawTrack();
    }

    calculateBounds() {
        const points = this.trackData.track_points;
        if (!points || points.length === 0) {
            return { minX: -100, maxX: 100, minY: -100, maxY: 100 };
        }

        // Usar mesma escala que Track.js e Car.js (0.1)
        const scale = 0.1;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        points.forEach(p => {
            minX = Math.min(minX, p.x * scale);
            maxX = Math.max(maxX, p.x * scale);
            minY = Math.min(minY, p.y * scale);
            maxY = Math.max(maxY, p.y * scale);
        });

        return { minX, maxX, minY, maxY };
    }

    resize() {
        if (!this.canvas) return;

        // Usar tamanho do CSS
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;

        this.ctx?.scale(window.devicePixelRatio, window.devicePixelRatio);

        this.width = rect.width;
        this.height = rect.height;
    }

    worldToScreen(x, y) {
        const { minX, maxX, minY, maxY } = this.bounds;

        // Calcular escala mantendo proporção
        const worldWidth = maxX - minX;
        const worldHeight = maxY - minY;
        const availableWidth = this.width - this.padding * 2;
        const availableHeight = this.height - this.padding * 2;

        const scaleX = availableWidth / worldWidth;
        const scaleY = availableHeight / worldHeight;
        const scale = Math.min(scaleX, scaleY);

        // Centralizar
        const offsetX = (this.width - worldWidth * scale) / 2;
        const offsetY = (this.height - worldHeight * scale) / 2;

        return {
            x: offsetX + (x - minX) * scale,
            y: offsetY + (maxY - y) * scale // Inverter Y
        };
    }

    drawTrack() {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const points = this.trackData.track_points;

        if (!points || points.length === 0) return;

        // Usar mesma escala que Track.js e Car.js (0.1)
        const scale = 0.1;

        // Limpar
        ctx.clearRect(0, 0, this.width, this.height);

        // Desenhar linha do circuito
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;

        const firstPoint = this.worldToScreen(points[0].x * scale, points[0].y * scale);
        ctx.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i < points.length; i++) {
            const p = this.worldToScreen(points[i].x * scale, points[i].y * scale);
            ctx.lineTo(p.x, p.y);
        }

        // Fechar circuito
        ctx.lineTo(firstPoint.x, firstPoint.y);
        ctx.stroke();

        // Guardar imagem de fundo do circuito
        this.trackImage = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    update(telemetryState, selectedDriver) {
        if (!this.ctx) return;

        const ctx = this.ctx;

        // Restaurar imagem de fundo do circuito
        if (this.trackImage) {
            ctx.putImageData(this.trackImage, 0, 0);
        }

        // Desenhar carros
        for (const [driverCode, data] of Object.entries(telemetryState)) {
            if (!data) continue;

            const driver = this.drivers.find(d => d.code === driverCode);
            if (!driver) continue;

            // Converter coordenadas - usar escala do Track.js
            const scale = 0.1;
            const pos = this.worldToScreen(data.x * scale, data.y * scale);

            // Cor do carro
            const isSelected = driverCode === selectedDriver;
            const color = driver.team_color || '#ffffff';

            // Desenhar carro
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, isSelected ? this.carSize + 2 : this.carSize, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            // Borda para carro selecionado
            if (isSelected) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Código do piloto para carro selecionado
            if (isSelected) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(driverCode, pos.x, pos.y - 12);
            }
        }
    }
}
