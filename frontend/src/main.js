/**
 * F1 3D Race Replay - Main Entry Point
 * Inicializa todos os módulos e gerencia a aplicação
 */

import * as THREE from 'three';
import { Scene } from './Scene.js';
import { Track } from './Track.js';
import { CarManager } from './Car.js';
import { CameraController } from './Camera.js';
import { ReplayController } from './Replay.js';
import { UI } from './UI.js';
import { Minimap } from './Minimap.js';
import { PositionTracker } from './PositionTracker.js';
import { WidgetManager } from './WidgetManager.js';
import { DriverInfoWidget } from './widgets/DriverInfoWidget.js';
import { StandingsWidget } from './widgets/StandingsWidget.js';
import { MinimapWidget } from './widgets/MinimapWidget.js';
import { TelemetryWidget } from './widgets/TelemetryWidget.js';
import { LapTimesWidget } from './widgets/LapTimesWidget.js';
import { TireStrategyWidget } from './widgets/TireStrategyWidget.js';
import { BattlesWidget } from './widgets/BattlesWidget.js';
import { PositionChartWidget } from './widgets/PositionChartWidget.js';

class F1RaceViewer {
    constructor() {
        this.scene = null;
        this.track = null;
        this.carManager = null;
        this.cameraController = null;
        this.replayController = null;
        this.ui = null;
        this.minimap = null;
        this.positionTracker = null;
        this.raceData = null;
        this.selectedDriver = null;
        this.isPlaying = false;

        // Widget system
        this.widgetManager = null;
        this.driverInfoWidget = null;
        this.standingsWidget = null;
        this.minimapWidget = null;
        this.telemetryWidget = null;
        this.lapTimesWidget = null;
        this.tireStrategyWidget = null;
        this.battlesWidget = null;
        this.positionChartWidget = null;
    }

    async init() {
        try {
            this.updateLoadingStatus('Carregando dados da corrida...', 10);

            // Carregar dados da corrida
            await this.loadRaceData();
            this.updateLoadingStatus('Inicializando cena 3D...', 30);

            // Inicializar cena Three.js
            this.scene = new Scene('canvas-container');
            await this.scene.init();
            this.updateLoadingStatus('Construindo circuito...', 50);

            // Criar pista
            this.track = new Track(this.scene);
            await this.track.build(this.raceData.track);
            this.updateLoadingStatus('Criando carros...', 70);

            // Criar carros
            this.carManager = new CarManager(this.scene);
            await this.carManager.createCars(this.raceData.drivers);
            this.updateLoadingStatus('Configurando câmera...', 85);

            // Configurar câmera
            this.cameraController = new CameraController(this.scene.camera, this.scene.renderer.domElement);

            // Configurar replay
            this.replayController = new ReplayController(this.raceData.telemetry, this.carManager);

            // Configurar sistema de widgets PRIMEIRO
            this.widgetManager = new WidgetManager();
            this.widgetManager.init();

            // Registrar widgets existentes (convertidos para o sistema)
            this.driverInfoWidget = new DriverInfoWidget(this.widgetManager);
            this.driverInfoWidget.register();

            this.standingsWidget = new StandingsWidget(this.widgetManager);
            this.standingsWidget.register();

            this.minimapWidget = new MinimapWidget(this.widgetManager);
            this.minimapWidget.register();

            this.telemetryWidget = new TelemetryWidget(this.widgetManager);
            this.telemetryWidget.register();

            // Registrar novos widgets
            this.lapTimesWidget = new LapTimesWidget(this.widgetManager);
            this.lapTimesWidget.register();

            this.tireStrategyWidget = new TireStrategyWidget(this.widgetManager);
            this.tireStrategyWidget.register();

            this.battlesWidget = new BattlesWidget(this.widgetManager);
            this.battlesWidget.register();

            this.positionChartWidget = new PositionChartWidget(this.widgetManager);
            this.positionChartWidget.register();

            // Mostrar widgets essenciais (para que os elementos existam no DOM)
            this.widgetManager.show('driver-info');
            this.widgetManager.show('standings');
            this.widgetManager.show('telemetry');
            this.widgetManager.show('minimap');

            // Configurar UI DEPOIS dos widgets (para cacheElements encontrar os elementos)
            this.ui = new UI(this);
            this.ui.init(this.raceData.drivers, this.raceData);

            // Configurar minimapa (DEPOIS do widget ser mostrado)
            this.minimap = new Minimap('minimap-canvas', this.raceData.track, this.raceData.drivers);

            // Configurar sistema de posições e ultrapassagens
            this.positionTracker = new PositionTracker(this.raceData.track, this.raceData.drivers);

            // Configurar callback para ultrapassagens (apenas animação na tabela)
            this.positionTracker.onOvertake((overtake) => {
                // Animar na tabela de standings
                this.ui.animateOvertake(overtake.gained, overtake.lost);

                console.log(`ULTRAPASSAGEM: ${overtake.gained} ultrapassou ${overtake.lost} para P${overtake.newPosition}`);
            });

            // Selecionar primeiro piloto
            this.selectDriver(this.raceData.drivers[0]?.code || 'VER');
            this.updateLoadingStatus('Pronto!', 100);

            // Esconder loading screen
            setTimeout(() => {
                document.getElementById('loading-screen').classList.add('hidden');
            }, 500);

            // Iniciar loop de animação
            this.animate();

            console.log('F1 Race Viewer inicializado com sucesso!');

        } catch (error) {
            console.error('Erro ao inicializar:', error);
            this.updateLoadingStatus(`Erro: ${error.message}`, 0);
        }
    }

    async loadRaceData() {
        // Tentar carregar dados de arquivo local
        // Em produção, isso viria de uma API ou arquivo estático
        const dataFiles = [
            './data/race_2023_monza.json',
            './data/race_2024_bahrain.json'
        ];

        for (const file of dataFiles) {
            try {
                const response = await fetch(file);
                if (response.ok) {
                    this.raceData = await response.json();
                    console.log(`Dados carregados de: ${file}`);
                    return;
                }
            } catch (e) {
                // Silenciar erro, tentar próximo arquivo
            }
        }

        // Usar dados de demonstração se não houver arquivo
        console.log('Usando dados de demonstração (execute o extrator Python para dados reais)');
        this.raceData = this.generateDemoData();
    }

    generateDemoData() {
        // Gera dados de demonstração para teste
        // Simula o circuito de Monza simplificado
        const trackPoints = [];
        const numPoints = 500;

        // Gerar um circuito oval/retangular estilizado (simplificação de Monza)
        for (let i = 0; i < numPoints; i++) {
            const t = (i / numPoints) * Math.PI * 2;

            // Forma do circuito (inspirado em Monza - longo com chicanes)
            const baseX = Math.cos(t) * 300 + Math.cos(t * 3) * 50;
            const baseY = Math.sin(t) * 150 + Math.sin(t * 2) * 30;

            trackPoints.push({
                x: baseX * 3,
                y: baseY * 3
            });
        }

        // Pilotos de demonstração
        const drivers = [
            { code: 'VER', number: 1, name: 'Max Verstappen', team: 'Red Bull Racing', team_color: '#3671C6' },
            { code: 'PER', number: 11, name: 'Sergio Perez', team: 'Red Bull Racing', team_color: '#3671C6' },
            { code: 'HAM', number: 44, name: 'Lewis Hamilton', team: 'Mercedes', team_color: '#6CD3BF' },
            { code: 'RUS', number: 63, name: 'George Russell', team: 'Mercedes', team_color: '#6CD3BF' },
            { code: 'LEC', number: 16, name: 'Charles Leclerc', team: 'Ferrari', team_color: '#F91536' },
            { code: 'SAI', number: 55, name: 'Carlos Sainz', team: 'Ferrari', team_color: '#F91536' },
            { code: 'NOR', number: 4, name: 'Lando Norris', team: 'McLaren', team_color: '#F58020' },
            { code: 'PIA', number: 81, name: 'Oscar Piastri', team: 'McLaren', team_color: '#F58020' },
            { code: 'ALO', number: 14, name: 'Fernando Alonso', team: 'Aston Martin', team_color: '#358C75' },
            { code: 'STR', number: 18, name: 'Lance Stroll', team: 'Aston Martin', team_color: '#358C75' },
        ];

        // Gerar telemetria simulada para cada piloto
        const telemetry = {};
        const raceDuration = 90 * 60; // 90 minutos em segundos
        const lapTime = 85; // ~85 segundos por volta em Monza

        drivers.forEach((driver, driverIndex) => {
            const driverTelemetry = [];
            const offset = driverIndex * 2; // Offset inicial entre carros

            for (let t = 0; t < raceDuration; t += 0.1) {
                const adjustedTime = t + offset;
                const lapProgress = (adjustedTime % lapTime) / lapTime;
                const currentLap = Math.floor(adjustedTime / lapTime) + 1;
                const pointIndex = Math.floor(lapProgress * trackPoints.length) % trackPoints.length;
                const nextIndex = (pointIndex + 1) % trackPoints.length;

                // Interpolar posição
                const lerp = (lapProgress * trackPoints.length) % 1;
                const x = trackPoints[pointIndex].x * (1 - lerp) + trackPoints[nextIndex].x * lerp;
                const y = trackPoints[pointIndex].y * (1 - lerp) + trackPoints[nextIndex].y * lerp;

                // Calcular heading
                const dx = trackPoints[nextIndex].x - trackPoints[pointIndex].x;
                const dy = trackPoints[nextIndex].y - trackPoints[pointIndex].y;
                const heading = Math.atan2(dy, dx);

                // Simular velocidade (mais lenta nas curvas)
                const curvature = Math.abs(Math.sin(lapProgress * Math.PI * 8));
                const speed = 280 - curvature * 100 + Math.random() * 10;

                driverTelemetry.push({
                    t: Math.round(t * 10) / 10,
                    x: x,
                    y: y,
                    heading: heading,
                    speed: Math.round(speed),
                    lap: currentLap,
                    gear: Math.min(8, Math.max(2, Math.round(speed / 40))),
                    throttle: curvature < 0.3 ? 100 : 60,
                    brake: curvature > 0.5,
                    drs: speed > 250 && Math.random() > 0.7 ? 1 : 0
                });
            }

            telemetry[driver.code] = driverTelemetry;
        });

        // Gerar dados de pneus simulados
        const tires = {};
        const compounds = ['SOFT', 'MEDIUM', 'HARD'];
        const totalLaps = 53;

        drivers.forEach((driver, driverIndex) => {
            const driverTires = {};
            // Estratégia de pit stop simulada
            const firstStintEnd = 15 + Math.floor(Math.random() * 5);
            const secondStintEnd = 35 + Math.floor(Math.random() * 5);

            for (let lap = 1; lap <= totalLaps; lap++) {
                if (lap <= firstStintEnd) {
                    // Primeiro stint
                    driverTires[String(lap)] = driverIndex % 2 === 0 ? 'MEDIUM' : 'SOFT';
                } else if (lap <= secondStintEnd) {
                    // Segundo stint
                    driverTires[String(lap)] = 'HARD';
                } else {
                    // Terceiro stint
                    driverTires[String(lap)] = driverIndex % 2 === 0 ? 'SOFT' : 'MEDIUM';
                }
            }
            tires[driver.code] = driverTires;
        });

        return {
            meta: {
                year: 2023,
                race: 'Monza',
                session: 'R',
                event_name: 'Italian Grand Prix (Demo)',
                date: '2023-09-03',
                total_laps: totalLaps
            },
            track: {
                name: 'Italian Grand Prix',
                country: 'Italy',
                circuit: 'Monza',
                length_km: 5.793,
                track_points: trackPoints,
                corners: [
                    { number: 1, letter: '', distance: 200, angle: 90 },
                    { number: 2, letter: '', distance: 350, angle: 45 },
                    { number: 3, letter: '', distance: 800, angle: 60 },
                    { number: 4, letter: '', distance: 1200, angle: 90 },
                ]
            },
            drivers: drivers,
            telemetry: telemetry,
            tires: tires
        };
    }

    selectDriver(driverCode) {
        this.selectedDriver = driverCode;
        this.carManager.setFollowedDriver(driverCode);
        this.ui.updateSelectedDriver(driverCode);

        // Atualizar câmera para seguir o novo piloto
        const car = this.carManager.getCar(driverCode);
        if (car) {
            this.cameraController.setTarget(car.mesh);
        }
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        this.ui.updatePlayButton(this.isPlaying);
    }

    setPlaybackSpeed(speed) {
        this.replayController.setSpeed(speed);
    }

    seekTo(progress) {
        this.replayController.seekTo(progress);
    }

    skip(seconds) {
        this.replayController.skip(seconds);
    }

    setCameraMode(mode) {
        this.cameraController.setMode(mode);
        this.ui.updateCameraMode(mode);
    }

    setCameraDistance(distance) {
        this.cameraController.setDistance(distance);
    }

    setCameraHeight(height) {
        this.cameraController.setHeight(height);
    }

    updateLoadingStatus(message, progress) {
        const statusEl = document.getElementById('loading-status');
        const progressEl = document.getElementById('loading-progress');

        if (statusEl) statusEl.textContent = message;
        if (progressEl) progressEl.style.width = `${progress}%`;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.scene.clock.getDelta();

        // Atualizar replay se estiver tocando
        if (this.isPlaying) {
            const currentState = this.replayController.update(deltaTime);

            // Atualizar posições dos carros
            this.carManager.updatePositions(currentState);

            // Atualizar UI com dados do piloto selecionado
            if (currentState[this.selectedDriver]) {
                this.ui.updateTelemetry(currentState[this.selectedDriver]);
            }

            // Atualizar minimapa
            this.minimap.update(currentState, this.selectedDriver);

            // Atualizar sistema de posições e standings
            if (this.positionTracker) {
                const standings = this.positionTracker.update(currentState);
                const standingsWithGaps = this.positionTracker.calculateGaps(standings);

                // Adicionar dados de pneus aos standings
                const standingsWithTires = standingsWithGaps.map(entry => ({
                    ...entry,
                    tire: this.getTireForDriver(entry.driverCode, entry.lap)
                }));

                // Obter volta do líder
                const leaderLap = standings[0]?.lap || 1;

                // Atualizar tabela de standings
                this.ui.updateStandings(standingsWithTires, leaderLap);

                // Atualizar widgets (com try-catch para não quebrar o loop)
                try {
                    if (this.battlesWidget) {
                        this.battlesWidget.update(standingsWithGaps);
                    }
                } catch (e) { console.warn('BattlesWidget error:', e); }

                try {
                    if (this.positionChartWidget) {
                        standingsWithTires.forEach(entry => {
                            const driver = this.raceData.drivers.find(d => d.code === entry.driverCode);
                            if (driver) {
                                this.positionChartWidget.recordPosition(
                                    entry.driverCode,
                                    entry.lap,
                                    entry.position,
                                    driver.team_color
                                );
                            }
                        });
                        this.positionChartWidget.render();
                    }
                } catch (e) { console.warn('PositionChartWidget error:', e); }

                try {
                    if (this.tireStrategyWidget) {
                        this.tireStrategyWidget.update(
                            this.raceData.drivers,
                            this.raceData.tires,
                            leaderLap,
                            this.raceData.meta?.total_laps || 53
                        );
                    }
                } catch (e) { console.warn('TireStrategyWidget error:', e); }
            }

            // Atualizar lap times widget para piloto selecionado
            try {
                if (this.lapTimesWidget && currentState[this.selectedDriver]) {
                    const data = currentState[this.selectedDriver];
                    this.lapTimesWidget.update(this.selectedDriver, {
                        currentLapTime: data.lapTime || null,
                        bestLapTime: data.bestLap || null,
                        delta: null,
                        sectors: data.sectors || []
                    });
                }
            } catch (e) { console.warn('LapTimesWidget error:', e); }

            // Atualizar timeline
            this.ui.updateTimeline(this.replayController.getProgress(), this.replayController.getCurrentTime());
        }

        // Atualizar câmera
        const targetCar = this.carManager.getCar(this.selectedDriver);
        if (targetCar) {
            this.cameraController.update(targetCar.mesh, targetCar.heading, targetCar.speed || 0);
        }

        // Renderizar
        this.scene.render();
    }

    /**
     * Obtém o compound de pneu de um piloto em uma determinada volta
     */
    getTireForDriver(driverCode, lap) {
        const tireData = this.raceData?.tires;
        if (!tireData || !tireData[driverCode]) {
            return 'UNKNOWN';
        }

        // Procurar o pneu para a volta atual ou a mais recente anterior
        const driverTires = tireData[driverCode];
        let tire = driverTires[String(lap)];

        // Se não encontrar para a volta atual, procurar a volta mais recente
        if (!tire) {
            for (let l = lap - 1; l >= 1; l--) {
                if (driverTires[String(l)]) {
                    tire = driverTires[String(l)];
                    break;
                }
            }
        }

        return tire || 'UNKNOWN';
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const viewer = new F1RaceViewer();
    viewer.init();

    // Expor globalmente para debug
    window.f1Viewer = viewer;
});
