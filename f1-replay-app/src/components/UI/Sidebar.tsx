import { useUIStore } from '@/stores/uiStore'

interface WidgetButton {
  id: string
  title: string
  icon: string
}

const WIDGETS: WidgetButton[] = [
  { id: 'driver-info', title: 'Piloto', icon: '🏎️' },
  { id: 'standings', title: 'Classificação', icon: '📊' },
  { id: 'telemetry', title: 'Telemetria', icon: '📈' },
  { id: 'minimap', title: 'Mapa', icon: '🗺️' },
  { id: 'lap-times', title: 'Tempos', icon: '⏱️' },
  { id: 'tire-strategy', title: 'Estratégia', icon: '🔧' },
  { id: 'battles', title: 'Batalhas', icon: '⚔️' },
  { id: 'position-chart', title: 'Gráfico', icon: '📉' }
]

export function Sidebar() {
  const { visibleWidgets, toggleWidget, sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 z-50">
      <div className="glass-panel flex flex-col gap-1 p-2">
        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className="sidebar-btn mb-2"
          title="Menu"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>

        {/* Widget buttons */}
        {!sidebarCollapsed && (
          <div className="flex flex-col gap-1">
            {WIDGETS.map(widget => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`sidebar-btn ${visibleWidgets.includes(widget.id) ? 'active' : ''}`}
                title={widget.title}
              >
                {widget.icon}
              </button>
            ))}

            {/* Reset button */}
            <div className="border-t border-white/10 mt-2 pt-2">
              <button
                onClick={() => useUIStore.getState().resetLayout()}
                className="sidebar-btn text-sm"
                title="Reset Layout"
              >
                ↺
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
