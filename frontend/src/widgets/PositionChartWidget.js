/**
 * Position Chart Widget
 * Displays a mini position chart showing position evolution throughout the race
 */
export class PositionChartWidget {
    constructor(widgetManager) {
        this.widgetManager = widgetManager;
        this.positionHistory = new Map(); // Map<driverCode, Array<{lap, position}>>
        this.teamColors = new Map(); // Map<driverCode, teamColor>
        this.maxLap = 0;
        this.canvas = null;
        this.ctx = null;
    }

    /**
     * Register widget with the widget manager
     */
    register() {
        this.widgetManager.registerWidget({
            id: 'position-chart',
            title: 'Gráfico',
            icon: '📊',
            content: this.createContent(),
            defaultPosition: {
                x: window.innerWidth - 320,
                y: 350
            },
            minWidth: 300,
            onRender: () => this.setupCanvas()
        });
    }

    /**
     * Create widget content HTML
     */
    createContent() {
        const content = document.createElement('div');
        content.style.padding = '10px';

        const canvas = document.createElement('canvas');
        canvas.className = 'position-chart-canvas';
        canvas.width = 280;
        canvas.height = 180;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.style.backgroundColor = '#1a1a1a';
        canvas.style.borderRadius = '4px';

        content.appendChild(canvas);

        return content;
    }

    /**
     * Setup canvas after widget is rendered
     */
    setupCanvas() {
        const widget = this.widgetManager.getWidget('position-chart');
        if (widget && widget.element) {
            this.canvas = widget.element.querySelector('.position-chart-canvas');
            if (this.canvas) {
                this.ctx = this.canvas.getContext('2d');
                this.render();
            }
        }
    }

    /**
     * Record position data point for a driver
     */
    recordPosition(driverCode, lap, position, teamColor) {
        if (!this.positionHistory.has(driverCode)) {
            this.positionHistory.set(driverCode, []);
        }

        const history = this.positionHistory.get(driverCode);

        // Only add if this lap isn't already recorded
        const existingIndex = history.findIndex(point => point.lap === lap);
        if (existingIndex >= 0) {
            history[existingIndex] = { lap, position };
        } else {
            history.push({ lap, position });
            history.sort((a, b) => a.lap - b.lap);
        }

        this.teamColors.set(driverCode, teamColor);
        this.maxLap = Math.max(this.maxLap, lap);
    }

    /**
     * Render the position chart
     */
    render() {
        if (!this.ctx || !this.canvas) return;

        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, width, height);

        if (this.maxLap === 0 || this.positionHistory.size === 0) {
            // Show empty state
            this.ctx.fillStyle = '#666';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Aguardando dados...', width / 2, height / 2);
            return;
        }

        const padding = { left: 30, right: 10, top: 20, bottom: 25 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Draw grid and axes
        this.drawGrid(padding, chartWidth, chartHeight);

        // Draw position lines for each driver
        this.positionHistory.forEach((history, driverCode) => {
            if (history.length === 0) return;

            const color = this.teamColors.get(driverCode) || '#ffffff';
            this.drawPositionLine(history, color, padding, chartWidth, chartHeight);
        });
    }

    /**
     * Draw grid and axes
     */
    drawGrid(padding, chartWidth, chartHeight) {
        const ctx = this.ctx;

        // Grid lines
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;

        // Horizontal grid lines (positions)
        const positionStep = 5; // Every 5 positions
        for (let pos = 5; pos <= 20; pos += positionStep) {
            const y = padding.top + (pos - 1) * (chartHeight / 20);

            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();
        }

        // Vertical grid lines (laps)
        const lapStep = Math.max(1, Math.floor(this.maxLap / 5));
        for (let lap = lapStep; lap <= this.maxLap; lap += lapStep) {
            const x = padding.left + (lap / this.maxLap) * chartWidth;

            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + chartHeight);
            ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;

        // Y axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.stroke();

        // X axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#999';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';

        // Y axis labels (positions)
        for (let pos = 1; pos <= 20; pos += 5) {
            const y = padding.top + (pos - 1) * (chartHeight / 20);
            ctx.fillText(pos.toString(), padding.left - 5, y + 4);
        }

        // X axis labels (laps)
        ctx.textAlign = 'center';
        ctx.fillText('1', padding.left, padding.top + chartHeight + 15);

        if (this.maxLap > 1) {
            ctx.fillText(this.maxLap.toString(), padding.left + chartWidth, padding.top + chartHeight + 15);
        }
    }

    /**
     * Draw position line for a driver
     */
    drawPositionLine(history, color, padding, chartWidth, chartHeight) {
        const ctx = this.ctx;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();

        history.forEach((point, index) => {
            const x = padding.left + (point.lap / this.maxLap) * chartWidth;
            const y = padding.top + (point.position - 1) * (chartHeight / 20);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw dots at data points
        ctx.fillStyle = color;
        history.forEach(point => {
            const x = padding.left + (point.lap / this.maxLap) * chartWidth;
            const y = padding.top + (point.position - 1) * (chartHeight / 20);

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Clear all position data
     */
    clear() {
        this.positionHistory.clear();
        this.teamColors.clear();
        this.maxLap = 0;
        this.render();
    }

    /**
     * Update chart (re-render)
     */
    update() {
        this.render();
    }
}
