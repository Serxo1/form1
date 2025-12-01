/**
 * UI.js - Interface do usuário
 * Gerencia todos os elementos do HUD
 */

export class UI {
    constructor(app) {
        this.app = app;
        this.elements = {};
        this.totalLaps = 53; // Default, será atualizado
        this.drivers = [];
    }

    init(drivers, raceData = null) {
        this.drivers = drivers;
        this.totalLaps = raceData?.meta?.total_laps || 53;
        this.cacheElements();
        this.populateDriverList(drivers);
        this.createStandingsTable(drivers);
        this.setupEventListeners();
    }

    cacheElements() {
        this.elements = {
            // Driver info
            driverNumber: document.getElementById('driver-number'),
            driverName: document.getElementById('driver-name'),
            driverTeam: document.getElementById('driver-team'),
            speedValue: document.getElementById('speed-value'),
            lapValue: document.getElementById('lap-value'),
            gearValue: document.getElementById('gear-value'),
            // Timeline
            timeline: document.getElementById('timeline'),
            currentTime: document.getElementById('current-time'),
            totalTime: document.getElementById('total-time'),
            btnPlay: document.getElementById('btn-play'),
            iconPlay: document.getElementById('icon-play'),
            iconPause: document.getElementById('icon-pause'),
            btnRewind: document.getElementById('btn-rewind'),
            btnForward: document.getElementById('btn-forward'),
            playbackSpeed: document.getElementById('playback-speed'),
            // Camera - compact icon buttons
            cameraButtons: document.querySelectorAll('.camera-btn-icon'),
            // Telemetry F1 TV style
            drsIndicator: document.getElementById('drs-indicator'),
            brakeIndicator: document.getElementById('brake-indicator'),
            throttleIndicator: document.getElementById('throttle-indicator'),
            gearDisplay: document.querySelector('.gear-display .gear-value'),
            speedLarge: document.getElementById('speed-large'),
            // Standings tower
            standingsList: document.getElementById('standings-list'),
            standingsLap: document.getElementById('standings-lap'),
        };
    }

    populateDriverList(drivers) {
        // Driver list removido - agora usamos standings tower para seleção
    }

    setupEventListeners() {
        // Play/Pause
        this.elements.btnPlay?.addEventListener('click', () => {
            this.app.togglePlay();
        });

        // Rewind
        this.elements.btnRewind?.addEventListener('click', () => {
            this.app.skip(-10);
        });

        // Forward
        this.elements.btnForward?.addEventListener('click', () => {
            this.app.skip(10);
        });

        // Timeline
        this.elements.timeline?.addEventListener('input', (e) => {
            const progress = parseFloat(e.target.value) / 100;
            this.app.seekTo(progress);
        });

        // Playback speed
        this.elements.playbackSpeed?.addEventListener('change', (e) => {
            const speed = parseFloat(e.target.value);
            this.app.setPlaybackSpeed(speed);
        });

        // Camera buttons
        this.elements.cameraButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.camera;
                this.app.setCameraMode(mode);
            });
        });

        // Camera distance
        this.elements.cameraDistance?.addEventListener('input', (e) => {
            this.app.setCameraDistance(parseFloat(e.target.value));
        });

        // Camera height
        this.elements.cameraHeight?.addEventListener('input', (e) => {
            this.app.setCameraHeight(parseFloat(e.target.value));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }

    handleKeyboard(e) {
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.app.togglePlay();
                break;
            case 'ArrowLeft':
                this.app.skip(-5);
                break;
            case 'ArrowRight':
                this.app.skip(5);
                break;
            case 'ArrowUp':
                // Piloto anterior
                this.selectAdjacentDriver(-1);
                break;
            case 'ArrowDown':
                // Próximo piloto
                this.selectAdjacentDriver(1);
                break;
            case 'Digit1':
                this.app.setCameraMode('chase');
                break;
            case 'Digit2':
                this.app.setCameraMode('cockpit');
                break;
            case 'Digit3':
                this.app.setCameraMode('helicopter');
                break;
            case 'Digit4':
                this.app.setCameraMode('free');
                break;
        }
    }

    selectAdjacentDriver(direction) {
        const items = Array.from(document.querySelectorAll('.standings-row'));
        const currentIndex = items.findIndex(item => item.classList.contains('selected'));

        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = items.length - 1;
        if (newIndex >= items.length) newIndex = 0;

        const newCode = items[newIndex].dataset.driver;
        this.app.selectDriver(newCode);
    }

    updateSelectedDriver(driverCode) {
        // Atualizar standings tower (agora é o seletor principal)
        document.querySelectorAll('.standings-row').forEach(row => {
            row.classList.toggle('selected', row.dataset.driver === driverCode);
        });

        // Atualizar info do piloto
        const driver = this.app.raceData.drivers.find(d => d.code === driverCode);
        if (driver) {
            this.elements.driverNumber.textContent = driver.number;
            this.elements.driverNumber.style.background = driver.team_color;
            this.elements.driverName.textContent = driver.name;
            this.elements.driverTeam.textContent = driver.team;
        }
    }

    updateTelemetry(data) {
        if (!data) return;

        // Velocidade - painel info do piloto
        if (this.elements.speedValue) {
            this.elements.speedValue.innerHTML = `${data.speed || 0} <small>km/h</small>`;
        }

        // Velocidade - display grande F1 TV
        if (this.elements.speedLarge) {
            this.elements.speedLarge.textContent = data.speed || 0;
        }

        // Volta
        if (this.elements.lapValue) {
            this.elements.lapValue.textContent = `${data.lap || 1} / ${this.totalLaps}`;
        }

        // Marcha - painel info
        if (this.elements.gearValue) {
            const gear = data.gear || 0;
            this.elements.gearValue.textContent = gear === 0 ? 'N' : gear;
        }

        // Marcha - display grande F1 TV
        if (this.elements.gearDisplay) {
            const gear = data.gear || 0;
            this.elements.gearDisplay.textContent = gear === 0 ? 'N' : gear;
        }

        // DRS - badge F1 TV
        if (this.elements.drsIndicator) {
            this.elements.drsIndicator.classList.toggle('active', data.drs === 1);
        }

        // Freio - barra vertical F1 TV (altura em vez de largura)
        const brakeBar = this.elements.brakeIndicator?.querySelector('.telemetry-bar-fill');
        if (brakeBar) {
            brakeBar.style.height = data.brake ? '100%' : '0%';
        }

        // Acelerador - barra vertical F1 TV (altura em vez de largura)
        const throttleBar = this.elements.throttleIndicator?.querySelector('.telemetry-bar-fill');
        if (throttleBar) {
            throttleBar.style.height = `${data.throttle || 0}%`;
        }
    }

    updateTimeline(progress, currentTime) {
        if (this.elements.timeline) {
            this.elements.timeline.value = progress * 100;
        }

        if (this.elements.currentTime) {
            this.elements.currentTime.textContent = this.formatTime(currentTime);
        }
    }

    updatePlayButton(isPlaying) {
        if (this.elements.iconPlay) {
            this.elements.iconPlay.style.display = isPlaying ? 'none' : 'block';
        }
        if (this.elements.iconPause) {
            this.elements.iconPause.style.display = isPlaying ? 'block' : 'none';
        }
    }

    updateCameraMode(mode) {
        this.elements.cameraButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.camera === mode);
        });
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // ============================================
    // Métodos da Torre de Classificação
    // ============================================

    /**
     * Cria a estrutura inicial da tabela de standings
     */
    createStandingsTable(drivers) {
        const container = this.elements.standingsList;
        if (!container) return;

        container.innerHTML = '';

        drivers.forEach((driver, index) => {
            const row = document.createElement('div');
            row.className = 'standings-row';
            row.dataset.driver = driver.code;

            row.innerHTML = `
                <span class="standings-position">${index + 1}</span>
                <div class="standings-team-color" style="background: ${driver.team_color}"></div>
                <span class="standings-driver">${driver.code}</span>
                <span class="standings-gap">${index === 0 ? 'LEADER' : '+0.000'}</span>
                <div class="standings-tire tire-unknown" title="Unknown"></div>
            `;

            row.addEventListener('click', () => {
                this.app.selectDriver(driver.code);
            });

            container.appendChild(row);
        });
    }

    /**
     * Atualiza a tabela de standings com posições e gaps atuais
     */
    updateStandings(standings, currentLap) {
        // Atualizar contador de volta
        if (this.elements.standingsLap) {
            this.elements.standingsLap.textContent = `LAP ${currentLap}/${this.totalLaps}`;
        }

        const container = this.elements.standingsList;
        if (!container || !standings || standings.length === 0) return;

        // Atualizar cada linha
        standings.forEach((entry, index) => {
            const row = container.querySelector(`[data-driver="${entry.driverCode}"]`);
            if (!row) return;

            // Atualizar posição
            const posEl = row.querySelector('.standings-position');
            if (posEl) posEl.textContent = index + 1;

            // Atualizar gap
            const gapEl = row.querySelector('.standings-gap');
            if (gapEl) {
                if (index === 0) {
                    gapEl.textContent = 'LEADER';
                } else if (entry.gap !== undefined) {
                    // Mostrar intervalo para o carro da frente se disponível
                    const displayGap = entry.interval !== undefined ? entry.interval : entry.gap;
                    if (displayGap >= 60) {
                        // Se gap > 60s, mostrar em voltas
                        const lapsBehind = Math.floor(displayGap / 85); // Assumindo ~85s por volta
                        gapEl.textContent = lapsBehind > 0 ? `+${lapsBehind} LAP${lapsBehind > 1 ? 'S' : ''}` : `+${displayGap.toFixed(1)}`;
                    } else {
                        gapEl.textContent = `+${displayGap.toFixed(3)}`;
                    }
                }
            }

            // Atualizar pneu
            const tireEl = row.querySelector('.standings-tire');
            if (tireEl && entry.tire) {
                const tireClass = `tire-${entry.tire.toLowerCase()}`;
                tireEl.className = `standings-tire ${tireClass}`;
                tireEl.title = entry.tire;
            }

            // Reordenar no DOM (move para o final, na ordem correta)
            container.appendChild(row);
        });
    }

    /**
     * Anima uma ultrapassagem na tabela
     */
    animateOvertake(gainedDriver, lostDriver) {
        const container = this.elements.standingsList;
        if (!container) return;

        const gainedRow = container.querySelector(`[data-driver="${gainedDriver}"]`);
        const lostRow = container.querySelector(`[data-driver="${lostDriver}"]`);

        if (gainedRow) {
            gainedRow.classList.add('flash-green', 'overtake-up');
            setTimeout(() => {
                gainedRow.classList.remove('flash-green', 'overtake-up');
            }, 500);
        }

        if (lostRow) {
            lostRow.classList.add('flash-red', 'overtake-down');
            setTimeout(() => {
                lostRow.classList.remove('flash-red', 'overtake-down');
            }, 500);
        }
    }
}
