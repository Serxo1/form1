import { create } from 'zustand'
import type { RaceMeta, TrackData, Driver, TelemetryFrame, TireData } from '@/lib/types'

interface RaceStore {
  // State
  meta: RaceMeta | null
  track: TrackData | null
  drivers: Driver[]
  telemetry: Record<string, TelemetryFrame[]>
  tires: TireData
  isLoading: boolean
  loadingProgress: number
  loadingStatus: string
  error: string | null

  // Actions
  loadRace: (year: number, race: string, session: string) => Promise<void>
  loadFromFile: (filename: string) => Promise<void>
  loadDemoData: () => void
  clearRace: () => void
  setLoadingProgress: (percent: number, status: string) => void
}

// Demo data for development - generates smooth interpolated positions
const createDemoData = () => {
  const drivers: Driver[] = [
    { code: 'VER', number: 1, name: 'Max VERSTAPPEN', team: 'Red Bull Racing', team_color: '#3671C6' },
    { code: 'PER', number: 11, name: 'Sergio PEREZ', team: 'Red Bull Racing', team_color: '#3671C6' },
    { code: 'HAM', number: 44, name: 'Lewis HAMILTON', team: 'Mercedes', team_color: '#27F4D2' },
    { code: 'RUS', number: 63, name: 'George RUSSELL', team: 'Mercedes', team_color: '#27F4D2' },
    { code: 'LEC', number: 16, name: 'Charles LECLERC', team: 'Ferrari', team_color: '#E8002D' },
    { code: 'SAI', number: 55, name: 'Carlos SAINZ', team: 'Ferrari', team_color: '#E8002D' },
    { code: 'NOR', number: 4, name: 'Lando NORRIS', team: 'McLaren', team_color: '#FF8000' },
    { code: 'PIA', number: 81, name: 'Oscar PIASTRI', team: 'McLaren', team_color: '#FF8000' },
    { code: 'ALO', number: 14, name: 'Fernando ALONSO', team: 'Aston Martin', team_color: '#229971' },
    { code: 'STR', number: 18, name: 'Lance STROLL', team: 'Aston Martin', team_color: '#229971' },
  ]

  // Generate circular track points
  const trackPoints: { x: number; y: number }[] = []
  const radius = 500
  for (let i = 0; i < 360; i += 2) {
    const angle = (i * Math.PI) / 180
    trackPoints.push({
      x: Math.cos(angle) * radius + Math.sin(angle * 3) * 50,
      y: Math.sin(angle) * radius + Math.cos(angle * 2) * 30
    })
  }

  // Helper: interpolate between two points
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  // Generate telemetry for each driver with smooth interpolation
  const telemetry: Record<string, TelemetryFrame[]> = {}
  const duration = 5400 // 90 minutes in seconds

  drivers.forEach((driver, idx) => {
    const frames: TelemetryFrame[] = []
    const lapTime = 90 // seconds per lap
    const offset = idx * 2 // stagger drivers

    for (let t = 0; t < duration; t += 0.1) {
      const progress = ((t + offset) % lapTime) / lapTime

      // Get exact position with interpolation between track points
      const exactIdx = progress * trackPoints.length
      const trackIdx = Math.floor(exactIdx)
      const fraction = exactIdx - trackIdx // 0 to 1 between points

      const point = trackPoints[trackIdx % trackPoints.length]
      const nextPoint = trackPoints[(trackIdx + 1) % trackPoints.length]

      // Interpolate position between track points
      const x = lerp(point.x, nextPoint.x, fraction)
      const y = lerp(point.y, nextPoint.y, fraction)

      const heading = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x)
      const lap = Math.floor((t + offset) / lapTime) + 1

      frames.push({
        t,
        x,
        y,
        heading,
        lap,
        speed: 200 + Math.sin(progress * Math.PI * 8) * 80,
        gear: Math.min(8, Math.max(1, Math.floor((200 + Math.sin(progress * Math.PI * 8) * 80) / 40))),
        throttle: 50 + Math.sin(progress * Math.PI * 8) * 50,
        brake: Math.cos(progress * Math.PI * 8) > 0.7,
        drs: progress > 0.3 && progress < 0.5 ? 1 : 0
      })
    }

    telemetry[driver.code] = frames
  })

  // Generate tire data
  const tires: TireData = {}
  drivers.forEach(driver => {
    tires[driver.code] = {}
    for (let lap = 1; lap <= 60; lap++) {
      if (lap <= 20) tires[driver.code][lap] = 'SOFT'
      else if (lap <= 40) tires[driver.code][lap] = 'MEDIUM'
      else tires[driver.code][lap] = 'HARD'
    }
  })

  return {
    meta: {
      year: 2024,
      race: 'Demo',
      session: 'R',
      event_name: 'Demo Grand Prix',
      date: new Date().toISOString().split('T')[0],
      total_laps: 60
    },
    track: {
      name: 'Demo Circuit',
      country: 'Demo',
      circuit: 'Demo',
      length_km: 5.0,
      track_points: trackPoints,
      corners: [
        { number: 1, distance: 200, angle: 90 },
        { number: 2, distance: 500, angle: 45 },
        { number: 3, distance: 800, angle: 120 }
      ]
    },
    drivers,
    telemetry,
    tires
  }
}

export const useRaceStore = create<RaceStore>((set, get) => ({
  // Initial state
  meta: null,
  track: null,
  drivers: [],
  telemetry: {},
  tires: {},
  isLoading: false,
  loadingProgress: 0,
  loadingStatus: '',
  error: null,

  // Load race from Python extractor
  loadRace: async (year, race, session) => {
    set({ isLoading: true, loadingProgress: 0, loadingStatus: 'Iniciando...', error: null })

    try {
      // Check if running in Electron
      if (window.electronAPI) {
        // Subscribe to progress updates
        const unsubscribe = window.electronAPI.python.onProgress((progress) => {
          set({ loadingProgress: progress.percent, loadingStatus: progress.status })
        })

        // Call Python extractor
        const data = await window.electronAPI.python.extractRace({ year, race, session })

        unsubscribe()

        if (data) {
          const raceData = data as {
            meta: RaceMeta
            track: TrackData
            drivers: Driver[]
            telemetry: Record<string, TelemetryFrame[]>
            tires: TireData
          }
          set({
            meta: raceData.meta,
            track: raceData.track,
            drivers: raceData.drivers,
            telemetry: raceData.telemetry,
            tires: raceData.tires,
            isLoading: false,
            loadingProgress: 100,
            loadingStatus: 'Concluído!'
          })
        }
      } else {
        // Fallback for browser development
        console.warn('Electron API not available, loading demo data')
        get().loadDemoData()
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar corrida'
      })
    }
  },

  // Load from JSON file
  loadFromFile: async (filename) => {
    set({ isLoading: true, loadingProgress: 10, loadingStatus: 'Carregando arquivo...', error: null })

    try {
      const response = await fetch(`/data/${filename}`)
      if (!response.ok) {
        throw new Error(`Arquivo não encontrado: ${filename}`)
      }

      set({ loadingProgress: 50, loadingStatus: 'Processando dados...' })

      const data = await response.json()

      set({
        meta: data.meta,
        track: data.track,
        drivers: data.drivers,
        telemetry: data.telemetry,
        tires: data.tires,
        isLoading: false,
        loadingProgress: 100,
        loadingStatus: 'Concluído!'
      })

      console.log(`Carregado: ${data.meta?.event_name || filename}`)
      console.log(`  - ${data.drivers?.length || 0} pilotos`)
      console.log(`  - ${Object.keys(data.telemetry || {}).length} com telemetria`)

    } catch (error) {
      console.error('Erro ao carregar arquivo:', error)
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar arquivo'
      })
    }
  },

  // Load demo data for development
  loadDemoData: () => {
    set({ isLoading: true, loadingProgress: 50, loadingStatus: 'Gerando dados demo...' })

    setTimeout(() => {
      const demoData = createDemoData()
      set({
        ...demoData,
        isLoading: false,
        loadingProgress: 100,
        loadingStatus: 'Concluído!'
      })
    }, 500)
  },

  // Clear loaded race
  clearRace: () => {
    set({
      meta: null,
      track: null,
      drivers: [],
      telemetry: {},
      tires: {},
      error: null
    })
  },

  // Update loading progress
  setLoadingProgress: (percent, status) => {
    set({ loadingProgress: percent, loadingStatus: status })
  }
}))
