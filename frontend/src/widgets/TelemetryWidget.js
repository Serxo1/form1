export class TelemetryWidget {
    constructor(widgetManager) {
        this.widgetManager = widgetManager;
    }

    register() {
        this.widgetManager.registerWidget({
            id: 'telemetry',
            title: 'Telemetria',
            icon: '📈',
            defaultPosition: { x: 60, y: 400 },
            content: this.createContent()
        });
    }

    createContent() {
        const container = document.createElement('div');
        container.innerHTML = `
            <div class="telemetry-bars">
                <div class="telemetry-bar-container" id="throttle-indicator">
                    <div class="telemetry-bar throttle">
                        <div class="telemetry-bar-fill"></div>
                    </div>
                    <span class="telemetry-bar-label">THR</span>
                </div>
                <div class="telemetry-bar-container" id="brake-indicator">
                    <div class="telemetry-bar brake">
                        <div class="telemetry-bar-fill"></div>
                    </div>
                    <span class="telemetry-bar-label">BRK</span>
                </div>
            </div>
            <div class="telemetry-info">
                <div class="gear-display" id="gear-display">
                    <span class="gear-value">N</span>
                </div>
                <div class="drs-badge" id="drs-indicator">
                    <span>DRS</span>
                </div>
            </div>
            <div class="speed-display">
                <span id="speed-large" class="speed-value-large">0</span>
                <span class="speed-unit">km/h</span>
            </div>
        `;
        return container;
    }
}
