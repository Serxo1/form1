// Race Metadata
export interface RaceMeta {
  year: number
  race: string
  session: string
  event_name: string
  date: string
  total_laps: number
}

// Track Data
export interface TrackPoint {
  x: number
  y: number
}

export interface Corner {
  number: number
  letter?: string
  distance: number
  angle: number
}

export interface TrackData {
  name: string
  country: string
  circuit: string
  length_km: number
  track_points: TrackPoint[]
  corners: Corner[]
}

// Driver Data
export interface Driver {
  code: string
  number: number
  name: string
  team: string
  team_color: string
  secondary_color?: string
}

// Telemetry Frame
export interface TelemetryFrame {
  t: number           // timestamp in seconds
  x: number           // X position
  y: number           // Y position (Z in 3D)
  heading: number     // rotation in radians
  lap: number
  speed: number       // km/h
  gear: number
  throttle: number    // 0-100
  brake: boolean
  drs: number         // 0 or 1
}

// Tire compound per lap
export type TireCompound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET'
export type TireData = Record<string, Record<number, TireCompound>>

// Full race data structure
export interface RaceData {
  meta: RaceMeta
  track: TrackData
  drivers: Driver[]
  telemetry: Record<string, TelemetryFrame[]>
  tires: TireData
}

// Driver state at a specific time
export interface DriverState {
  code: string
  x: number
  y: number
  heading: number
  speed: number
  lap: number
  gear: number
  throttle: number
  brake: boolean
  drs: number
}

// Position in standings
export interface StandingEntry {
  code: string
  position: number
  gap: string
  interval: string
  lap: number
  tire: TireCompound
  driver: Driver
}

// Camera modes
export type CameraMode = 'chase' | 'cockpit' | 'helicopter' | 'free'

// Widget configuration
export interface WidgetConfig {
  id: string
  title: string
  icon: string
  defaultPosition: { x: number; y: number }
  minWidth?: number
  minHeight?: number
}
