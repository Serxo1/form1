export class LapTimesWidget {
    constructor(widgetManager) {
        this.widgetManager = widgetManager;
        this.widgetId = 'lap-times';
    }

    register() {
        this.widgetManager.registerWidget({
            id: this.widgetId,
            title: 'Tempos de Volta',
            icon: '⏱️',
            defaultPosition: { x: 60, y: 200 },
            content: this.createContent()
        });
    }

    createContent() {
        return `
            <div class="lap-times-widget">
                <div class="lap-row">
                    <span class="lap-label">Volta Atual:</span>
                    <span class="lap-time" id="current-lap-time">--:--.---</span>
                </div>
                <div class="lap-row">
                    <span class="lap-label">Melhor Volta:</span>
                    <span class="lap-time" id="best-lap-time">--:--.---</span>
                </div>
                <div class="lap-row">
                    <span class="lap-label">Delta:</span>
                    <span class="lap-delta" id="lap-delta">--</span>
                </div>
                <div class="sectors">
                    <div class="sector">
                        <div class="sector-bar" id="sector-1-bar"></div>
                        <span class="sector-label">S1</span>
                    </div>
                    <div class="sector">
                        <div class="sector-bar" id="sector-2-bar"></div>
                        <span class="sector-label">S2</span>
                    </div>
                    <div class="sector">
                        <div class="sector-bar" id="sector-3-bar"></div>
                        <span class="sector-label">S3</span>
                    </div>
                </div>
            </div>
        `;
    }

    update(driverCode, lapData) {
        if (!lapData) return;

        // Update current lap time
        const currentLapElement = document.getElementById('current-lap-time');
        if (currentLapElement && lapData.currentLapTime !== undefined) {
            currentLapElement.textContent = this.formatTime(lapData.currentLapTime);
        }

        // Update best lap time
        const bestLapElement = document.getElementById('best-lap-time');
        if (bestLapElement && lapData.bestLapTime !== undefined) {
            bestLapElement.textContent = this.formatTime(lapData.bestLapTime);
        }

        // Update delta
        const deltaElement = document.getElementById('lap-delta');
        if (deltaElement && lapData.delta !== undefined && lapData.delta !== null) {
            const deltaValue = lapData.delta;
            deltaElement.textContent = this.formatDelta(deltaValue);

            // Remove existing classes
            deltaElement.classList.remove('faster', 'slower');

            // Add appropriate class
            if (deltaValue < 0) {
                deltaElement.classList.add('faster');
            } else if (deltaValue > 0) {
                deltaElement.classList.add('slower');
            }
        }

        // Update sectors
        if (lapData.sectors && Array.isArray(lapData.sectors)) {
            lapData.sectors.forEach((sector, index) => {
                const sectorBar = document.getElementById(`sector-${index + 1}-bar`);
                if (sectorBar && sector.status) {
                    // Remove existing color classes
                    sectorBar.classList.remove('purple', 'green', 'yellow');

                    // Add color based on status
                    switch (sector.status) {
                        case 'overall-best':
                            sectorBar.classList.add('purple');
                            break;
                        case 'personal-best':
                            sectorBar.classList.add('green');
                            break;
                        default:
                            sectorBar.classList.add('yellow');
                            break;
                    }
                }
            });
        }
    }

    formatTime(seconds) {
        if (seconds === undefined || seconds === null || isNaN(seconds)) {
            return '--:--.---';
        }

        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const millis = Math.floor((seconds % 1) * 1000);

        return `${minutes}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
    }

    formatDelta(delta) {
        if (delta === undefined || delta === null || isNaN(delta)) {
            return '--';
        }

        const sign = delta >= 0 ? '+' : '';
        return `${sign}${delta.toFixed(3)}`;
    }
}
