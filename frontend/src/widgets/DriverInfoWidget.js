export class DriverInfoWidget {
    constructor(widgetManager) {
        this.widgetManager = widgetManager;
    }

    register() {
        this.widgetManager.registerWidget({
            id: 'driver-info',
            title: 'Piloto',
            icon: '🏎️',
            defaultPosition: { x: 60, y: 20 },
            content: this.createContent()
        });
    }

    createContent() {
        const container = document.createElement('div');
        container.innerHTML = `
            <div class="driver-header">
                <span id="driver-number" class="driver-number">1</span>
                <div class="driver-details">
                    <span id="driver-name" class="driver-name">-</span>
                    <span id="driver-team" class="driver-team">-</span>
                </div>
            </div>
            <div class="driver-stats">
                <div class="stat">
                    <span class="stat-label">Velocidade</span>
                    <span id="speed-value" class="stat-value">0 <small>km/h</small></span>
                </div>
                <div class="stat">
                    <span class="stat-label">Volta</span>
                    <span id="lap-value" class="stat-value">1 / 53</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Marcha</span>
                    <span id="gear-value" class="stat-value">N</span>
                </div>
            </div>
        `;
        return container;
    }
}
