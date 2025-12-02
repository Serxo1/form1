import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CameraMode } from '@/lib/types'

interface WidgetPosition {
  x: number
  y: number
}

interface UIStore {
  // Driver selection
  selectedDriver: string | null

  // Camera
  cameraMode: CameraMode
  cameraDistance: number
  cameraHeight: number

  // Widgets
  visibleWidgets: string[]
  widgetPositions: Record<string, WidgetPosition>

  // Sidebar
  sidebarCollapsed: boolean

  // Actions
  selectDriver: (code: string | null) => void
  selectNextDriver: (drivers: { code: string }[]) => void
  selectPrevDriver: (drivers: { code: string }[]) => void
  setCameraMode: (mode: CameraMode) => void
  setCameraDistance: (distance: number) => void
  setCameraHeight: (height: number) => void
  toggleWidget: (id: string) => void
  showWidget: (id: string) => void
  hideWidget: (id: string) => void
  setWidgetPosition: (id: string, position: WidgetPosition) => void
  toggleSidebar: () => void
  resetLayout: () => void
}

const DEFAULT_WIDGETS = ['driver-info', 'standings', 'telemetry', 'minimap']

const DEFAULT_POSITIONS: Record<string, WidgetPosition> = {
  'driver-info': { x: 60, y: 20 },
  'standings': { x: -260, y: 20 }, // negative = from right
  'telemetry': { x: 60, y: 200 },
  'minimap': { x: 60, y: 400 },
  'lap-times': { x: 300, y: 20 },
  'tire-strategy': { x: 300, y: 200 },
  'battles': { x: 300, y: 400 },
  'position-chart': { x: -500, y: 200 }
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedDriver: null,
      cameraMode: 'chase',
      cameraDistance: 5,
      cameraHeight: 2,
      visibleWidgets: DEFAULT_WIDGETS,
      widgetPositions: DEFAULT_POSITIONS,
      sidebarCollapsed: false,

      // Select driver
      selectDriver: (code) => set({ selectedDriver: code }),

      // Select next driver in standings
      selectNextDriver: (drivers) => {
        const { selectedDriver } = get()
        if (!drivers.length) return

        const currentIndex = drivers.findIndex(d => d.code === selectedDriver)
        const nextIndex = (currentIndex + 1) % drivers.length
        set({ selectedDriver: drivers[nextIndex].code })
      },

      // Select previous driver in standings
      selectPrevDriver: (drivers) => {
        const { selectedDriver } = get()
        if (!drivers.length) return

        const currentIndex = drivers.findIndex(d => d.code === selectedDriver)
        const prevIndex = currentIndex <= 0 ? drivers.length - 1 : currentIndex - 1
        set({ selectedDriver: drivers[prevIndex].code })
      },

      // Set camera mode
      setCameraMode: (mode) => set({ cameraMode: mode }),

      // Set camera distance
      setCameraDistance: (distance) => set({ cameraDistance: Math.max(2, Math.min(20, distance)) }),

      // Set camera height
      setCameraHeight: (height) => set({ cameraHeight: Math.max(0.5, Math.min(10, height)) }),

      // Toggle widget visibility
      toggleWidget: (id) => {
        const { visibleWidgets } = get()
        if (visibleWidgets.includes(id)) {
          set({ visibleWidgets: visibleWidgets.filter(w => w !== id) })
        } else {
          set({ visibleWidgets: [...visibleWidgets, id] })
        }
      },

      // Show widget
      showWidget: (id) => {
        const { visibleWidgets } = get()
        if (!visibleWidgets.includes(id)) {
          set({ visibleWidgets: [...visibleWidgets, id] })
        }
      },

      // Hide widget
      hideWidget: (id) => {
        const { visibleWidgets } = get()
        set({ visibleWidgets: visibleWidgets.filter(w => w !== id) })
      },

      // Set widget position
      setWidgetPosition: (id, position) => {
        const { widgetPositions } = get()
        set({
          widgetPositions: {
            ...widgetPositions,
            [id]: position
          }
        })
      },

      // Toggle sidebar
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Reset to default layout
      resetLayout: () => set({
        visibleWidgets: DEFAULT_WIDGETS,
        widgetPositions: DEFAULT_POSITIONS,
        sidebarCollapsed: false
      })
    }),
    {
      name: 'f1-replay-ui',
      partialize: (state) => ({
        visibleWidgets: state.visibleWidgets,
        widgetPositions: state.widgetPositions,
        sidebarCollapsed: state.sidebarCollapsed,
        cameraMode: state.cameraMode,
        cameraDistance: state.cameraDistance,
        cameraHeight: state.cameraHeight
      })
    }
  )
)
