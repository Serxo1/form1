/**
 * BattlesWidget - Displays close battles between drivers
 * Shows pairs of consecutive drivers within 1.5s gap
 */
export class BattlesWidget {
    constructor(widgetManager) {
        this.widgetManager = widgetManager;
        this.id = 'battles';
    }

    /**
     * Register widget with the widget manager
     */
    register() {
        this.widgetManager.registerWidget({
            id: this.id,
            title: 'Batalhas',
            icon: '⚔️',
            defaultPosition: { x: 60, y: 500 },
            updateCallback: (standings) => this.update(standings)
        });
    }

    /**
     * Update widget with current standings and battles
     * @param {Array} standings - Array of driver standings with {driverCode, position, interval}
     */
    update(standings) {
        if (!standings || standings.length === 0) {
            this.widgetManager.updateContent(this.id, '<div class="battles-widget">Sem dados</div>');
            return;
        }

        const battles = this.findBattles(standings);

        if (battles.length === 0) {
            this.widgetManager.updateContent(this.id, '<div class="battles-widget">Nenhuma batalha no momento</div>');
            return;
        }

        const html = this.generateHTML(battles);
        this.widgetManager.updateContent(this.id, html);
    }

    /**
     * Find all battles (consecutive drivers within 1.5s)
     * @param {Array} standings - Driver standings
     * @returns {Array} Array of battle objects
     */
    findBattles(standings) {
        const battles = [];

        // Sort by position to ensure correct order
        const sortedStandings = [...standings].sort((a, b) => a.position - b.position);

        for (let i = 1; i < sortedStandings.length; i++) {
            const leader = sortedStandings[i - 1];
            const chaser = sortedStandings[i];

            // interval is the gap to the car ahead
            const gap = chaser.interval;

            // Only show battles within 1.5s
            if (gap !== null && gap !== undefined && gap < 1.5) {
                battles.push({
                    leader: leader.driverCode,
                    chaser: chaser.driverCode,
                    gap: gap,
                    position: chaser.position
                });
            }
        }

        return battles;
    }

    /**
     * Generate HTML for all battles
     * @param {Array} battles - Array of battle objects
     * @returns {string} HTML string
     */
    generateHTML(battles) {
        const battleRows = battles.map(battle => {
            const battleClass = this.getBattleClass(battle.gap);
            const gapText = `+${battle.gap.toFixed(3)}s`;
            const drsIndicator = battle.gap < 1.0 ? '<span class="drs-badge">DRS</span>' : '';

            return `
                <div class="battle-row ${battleClass}">
                    <div class="battle-drivers">${battle.leader} vs ${battle.chaser}</div>
                    <div class="battle-gap">${gapText} ${drsIndicator}</div>
                </div>
            `;
        }).join('');

        return `<div class="battles-widget">${battleRows}</div>`;
    }

    /**
     * Determine CSS class based on gap
     * @param {number} gap - Time gap in seconds
     * @returns {string} CSS class name
     */
    getBattleClass(gap) {
        if (gap < 1.0) {
            return 'drs-zone';
        } else if (gap < 1.5) {
            return 'close';
        }
        return 'normal';
    }
}
