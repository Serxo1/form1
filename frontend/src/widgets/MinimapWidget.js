export class MinimapWidget {
    constructor(widgetManager) {
        this.widgetManager = widgetManager;
    }

    register() {
        this.widgetManager.registerWidget({
            id: 'minimap',
            title: 'Mapa',
            icon: '🗺️',
            defaultPosition: { x: 60, y: 200 },
            content: `<canvas id="minimap-canvas" width="200" height="150"></canvas>`
        });
    }
}
