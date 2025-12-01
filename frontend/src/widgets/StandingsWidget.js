/**
 * StandingsWidget.js
 * Widget wrapper for the race standings/classification tower
 */

export class StandingsWidget {
    constructor(widgetManager) {
        this.widgetManager = widgetManager;
    }

    register() {
        this.widgetManager.registerWidget({
            id: 'standings',
            title: 'Classificação',
            icon: '📊',
            defaultPosition: {
                x: window.innerWidth - 260,
                y: 20
            },
            minWidth: 240,
            content: this.createContent()
        });
    }

    createContent() {
        const content = document.createElement('div');
        content.innerHTML = `
            <div class="standings-header">
                <span class="standings-title">RACE</span>
                <span id="standings-lap" class="standings-lap">LAP 1/53</span>
            </div>
            <div id="standings-list" class="standings-list">
                <!-- Populated by JavaScript -->
            </div>
        `;
        return content;
    }
}
