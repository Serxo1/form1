/**
 * WidgetManager.js - Gerenciador de widgets arrastáveis
 * Controla visibilidade, posicionamento e persistência dos widgets
 */

export class WidgetManager {
    constructor() {
        this.widgets = new Map();       // id -> WidgetConfig
        this.activeWidgets = new Set(); // IDs dos widgets visíveis
        this.positions = {};            // Posições salvas
        this.container = null;
        this.sidebar = null;
        this.highestZIndex = 100;

        this.storageKey = 'f1-widgets-state';
    }

    init() {
        this.container = document.getElementById('widgets-container');
        this.sidebar = document.getElementById('widget-sidebar');

        // Carregar estado salvo
        this.loadState();

        // Setup sidebar toggle
        this.setupSidebar();

        // Setup atalhos de teclado (Shift + 1-9)
        this.setupKeyboardShortcuts();
    }

    /**
     * Registra um widget no sistema
     * @param {Object} config - Configuração do widget
     */
    register(config) {
        return this.registerWidget(config);
    }

    /**
     * Registra um widget no sistema (alias)
     */
    registerWidget(config) {
        const id = config.id;
        const widgetConfig = {
            id,
            title: config.title || id,
            icon: config.icon || '?',
            content: config.content || null,          // Elemento HTML ou função que retorna HTML
            defaultPosition: config.defaultPosition || config.position || { x: 100, y: 100 },
            minWidth: config.minWidth || 200,
            minHeight: config.minHeight || 100,
            onShow: config.onShow || null,            // Callback quando mostrado
            onHide: config.onHide || null,            // Callback quando escondido
            onUpdate: config.onUpdate || null,        // Callback para atualizar dados
            onRender: config.onRender || null,        // Callback após renderizar
        };

        this.widgets.set(id, widgetConfig);

        // Criar botão na sidebar
        this.createSidebarButton(id, widgetConfig);

        // Criar elemento do widget (inicialmente oculto)
        this.createWidgetElement(id, widgetConfig);

        // Retornar objeto para compatibilidade
        return this.getWidget(id);
    }

    /**
     * Alias para registerWidget (compatibilidade)
     */
    createWidget(config) {
        return this.registerWidget(config);
    }

    /**
     * Retorna um objeto widget com seu elemento
     */
    getWidget(id) {
        const config = this.widgets.get(id);
        if (!config) return null;

        const element = document.getElementById(`widget-${id}`);
        return {
            id,
            config,
            element,
            contentElement: element?.querySelector('.widget-content')
        };
    }

    /**
     * Cria botão na sidebar para o widget
     */
    createSidebarButton(id, config) {
        const iconsContainer = this.sidebar?.querySelector('.sidebar-icons');
        if (!iconsContainer) return;

        const btn = document.createElement('button');
        btn.className = 'widget-toggle-btn';
        btn.dataset.widget = id;
        btn.title = config.title;
        btn.innerHTML = config.icon;

        btn.addEventListener('click', () => this.toggle(id));

        iconsContainer.appendChild(btn);
    }

    /**
     * Cria elemento DOM do widget
     */
    createWidgetElement(id, config) {
        const widget = document.createElement('div');
        widget.id = `widget-${id}`;
        widget.className = 'widget';
        widget.style.display = 'none';

        // Posição inicial
        const savedPos = this.positions[id];
        const pos = savedPos || config.defaultPosition;
        widget.style.left = `${pos.x}px`;
        widget.style.top = `${pos.y}px`;

        // Header com drag handle e botão fechar
        widget.innerHTML = `
            <div class="widget-header">
                <span class="widget-title">${config.icon} ${config.title}</span>
                <button class="widget-close" title="Fechar">&times;</button>
            </div>
            <div class="widget-content"></div>
        `;

        // Setup drag
        const header = widget.querySelector('.widget-header');
        header.addEventListener('mousedown', (e) => this.startDrag(id, e));

        // Setup close button
        const closeBtn = widget.querySelector('.widget-close');
        closeBtn.addEventListener('click', () => this.hide(id));

        // Adicionar conteúdo se for HTML
        if (config.content) {
            const contentEl = widget.querySelector('.widget-content');
            if (typeof config.content === 'string') {
                contentEl.innerHTML = config.content;
            } else if (config.content instanceof HTMLElement) {
                contentEl.appendChild(config.content);
            }
        }

        // Trazer para frente ao clicar
        widget.addEventListener('mousedown', () => this.bringToFront(id));

        this.container?.appendChild(widget);
    }

    /**
     * Toggle visibilidade do widget
     */
    toggle(id) {
        if (this.activeWidgets.has(id)) {
            this.hide(id);
        } else {
            this.show(id);
        }
    }

    /**
     * Mostra um widget
     */
    show(id) {
        const widget = document.getElementById(`widget-${id}`);
        const config = this.widgets.get(id);

        if (!widget || !config) return;

        widget.style.display = 'flex';
        this.activeWidgets.add(id);
        this.bringToFront(id);

        // Atualizar botão da sidebar
        const btn = this.sidebar?.querySelector(`[data-widget="${id}"]`);
        btn?.classList.add('active');

        // Callbacks
        config.onShow?.();
        config.onRender?.();

        this.saveState();
    }

    /**
     * Esconde um widget
     */
    hide(id) {
        const widget = document.getElementById(`widget-${id}`);
        const config = this.widgets.get(id);

        if (!widget) return;

        widget.style.display = 'none';
        this.activeWidgets.delete(id);

        // Atualizar botão da sidebar
        const btn = this.sidebar?.querySelector(`[data-widget="${id}"]`);
        btn?.classList.remove('active');

        // Callback
        config?.onHide?.();

        this.saveState();
    }

    /**
     * Traz widget para frente (z-index)
     */
    bringToFront(id) {
        const widget = document.getElementById(`widget-${id}`);
        if (widget) {
            this.highestZIndex++;
            widget.style.zIndex = this.highestZIndex;
        }
    }

    /**
     * Inicia arraste do widget
     */
    startDrag(widgetId, mouseEvent) {
        // Ignorar se clicou no botão de fechar
        if (mouseEvent.target.classList.contains('widget-close')) return;

        const widget = document.getElementById(`widget-${widgetId}`);
        if (!widget) return;

        const rect = widget.getBoundingClientRect();
        const offsetX = mouseEvent.clientX - rect.left;
        const offsetY = mouseEvent.clientY - rect.top;

        const onMouseMove = (e) => {
            // Limitar posição dentro da tela
            const newX = Math.max(0, Math.min(window.innerWidth - rect.width, e.clientX - offsetX));
            const newY = Math.max(0, Math.min(window.innerHeight - rect.height, e.clientY - offsetY));

            widget.style.left = `${newX}px`;
            widget.style.top = `${newY}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            widget.classList.remove('dragging');

            // Salvar posição
            this.positions[widgetId] = {
                x: parseInt(widget.style.left),
                y: parseInt(widget.style.top)
            };
            this.saveState();
        };

        widget.classList.add('dragging');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    /**
     * Setup sidebar toggle
     */
    setupSidebar() {
        const toggleBtn = this.sidebar?.querySelector('.sidebar-toggle');
        toggleBtn?.addEventListener('click', () => {
            this.sidebar?.classList.toggle('collapsed');
        });
    }

    /**
     * Setup atalhos de teclado (Shift + número)
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Shift + número para toggle widgets
            if (e.shiftKey && e.code.startsWith('Digit')) {
                const num = parseInt(e.code.replace('Digit', ''));
                if (num >= 1 && num <= 9) {
                    const widgetIds = Array.from(this.widgets.keys());
                    if (widgetIds[num - 1]) {
                        e.preventDefault();
                        this.toggle(widgetIds[num - 1]);
                    }
                }
            }
        });
    }

    /**
     * Atualiza conteúdo de um widget
     */
    updateContent(id, content) {
        const widget = document.getElementById(`widget-${id}`);
        const contentEl = widget?.querySelector('.widget-content');

        if (!contentEl) return;

        if (typeof content === 'string') {
            contentEl.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            contentEl.innerHTML = '';
            contentEl.appendChild(content);
        }
    }

    /**
     * Retorna o elemento de conteúdo de um widget
     */
    getContentElement(id) {
        const widget = document.getElementById(`widget-${id}`);
        return widget?.querySelector('.widget-content');
    }

    /**
     * Salva estado no localStorage
     */
    saveState() {
        const state = {
            activeWidgets: Array.from(this.activeWidgets),
            positions: this.positions
        };

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (e) {
            console.warn('Não foi possível salvar estado dos widgets:', e);
        }
    }

    /**
     * Carrega estado do localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const state = JSON.parse(saved);
                this.positions = state.positions || {};
                // Não restaurar widgets ativos - usuário quer tela limpa por padrão
            }
        } catch (e) {
            console.warn('Não foi possível carregar estado dos widgets:', e);
        }
    }

    /**
     * Reseta layout para padrão
     */
    resetLayout() {
        // Esconder todos
        this.widgets.forEach((config, id) => {
            this.hide(id);
        });

        // Limpar posições salvas
        this.positions = {};
        this.saveState();

        // Resetar posições para default
        this.widgets.forEach((config, id) => {
            const widget = document.getElementById(`widget-${id}`);
            if (widget) {
                widget.style.left = `${config.defaultPosition.x}px`;
                widget.style.top = `${config.defaultPosition.y}px`;
            }
        });
    }
}
