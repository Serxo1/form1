export class TireStrategyWidget {
    constructor(widgetManager) {
        this.widgetManager = widgetManager;
        this.id = 'tire-strategy';
    }

    register() {
        this.widgetManager.registerWidget({
            id: this.id,
            title: 'Estratégia',
            icon: '🛞',
            defaultPosition: { x: 60, y: 350 },
            minWidth: 280,
            content: '<div class="tire-strategy-widget"></div>'
        });
    }

    update(drivers, tiresData, currentLap, totalLaps) {
        const widget = this.widgetManager.getWidget(this.id);
        if (!widget || !widget.element) return;

        const container = widget.element.querySelector('.tire-strategy-widget');
        if (!container) return;

        // Build strategy display for each driver
        let html = '';

        drivers.forEach(driver => {
            const driverCode = driver.code || driver.Abbreviation;
            const driverTires = tiresData?.[driverCode];

            if (!driverTires) return;

            // Convert lap-based format to stints
            const stints = this.convertToStints(driverTires, currentLap);
            if (stints.length === 0) return;

            html += `
                <div class="strategy-driver">
                    <div class="driver-code">${driverCode}</div>
                    <div class="strategy-bar">
            `;

            // Create stints
            stints.forEach(stint => {
                const startLap = stint.startLap;
                const endLap = Math.min(stint.endLap, currentLap);
                const compound = stint.compound.toLowerCase();

                // Calculate width percentage based on current lap
                const stintLength = endLap - startLap + 1;
                const widthPercent = (stintLength / Math.max(currentLap, 1)) * 100;

                // Map compound to class
                const compoundClass = this.getCompoundClass(compound);

                html += `
                    <div class="stint ${compoundClass}"
                         style="width: ${widthPercent}%"
                         title="${compound.toUpperCase()} (L${startLap}-${endLap})">
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || '<div style="color: #666; text-align: center;">Sem dados de pneus</div>';
    }

    /**
     * Converte formato lap-based para stints
     * Input: { "1": "SOFT", "2": "SOFT", "15": "MEDIUM", ... }
     * Output: [{ startLap: 1, endLap: 14, compound: "SOFT" }, ...]
     */
    convertToStints(lapTires, maxLap) {
        if (!lapTires || typeof lapTires !== 'object') return [];

        const stints = [];
        let currentStint = null;

        for (let lap = 1; lap <= maxLap; lap++) {
            const compound = lapTires[String(lap)];

            if (!compound) continue;

            if (!currentStint || currentStint.compound !== compound) {
                if (currentStint) {
                    currentStint.endLap = lap - 1;
                    stints.push(currentStint);
                }
                currentStint = { startLap: lap, endLap: lap, compound };
            } else {
                currentStint.endLap = lap;
            }
        }

        if (currentStint) {
            stints.push(currentStint);
        }

        return stints;
    }

    getCompoundClass(compound) {
        const normalized = compound.toLowerCase().trim();

        // Map various compound names to standard classes
        if (normalized.includes('soft') || normalized === 's') {
            return 'soft';
        } else if (normalized.includes('medium') || normalized === 'm') {
            return 'medium';
        } else if (normalized.includes('hard') || normalized === 'h') {
            return 'hard';
        } else if (normalized.includes('intermediate') || normalized === 'i') {
            return 'intermediate';
        } else if (normalized.includes('wet') || normalized === 'w') {
            return 'wet';
        }

        return 'medium'; // default
    }
}
