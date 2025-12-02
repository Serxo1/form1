import { Widget } from './Widget'
import { useRaceStore } from '@/stores/raceStore'
import { useReplayStore } from '@/stores/replayStore'
import { useUIStore } from '@/stores/uiStore'
import type { TelemetryFrame, DriverState } from '@/lib/types'

function findFrameAtTime(frames: TelemetryFrame[], time: number): DriverState | null {
  if (!frames || frames.length === 0) return null

  let low = 0
  let high = frames.length - 1

  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (frames[mid].t < time) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  const frameIndex = Math.max(0, Math.min(frames.length - 2, low - 1))
  const frame = frames[frameIndex]
  if (!frame) return null

  return {
    code: '',
    x: frame.x,
    y: frame.y,
    heading: frame.heading,
    speed: frame.speed,
    lap: frame.lap,
    gear: frame.gear,
    throttle: frame.throttle,
    brake: frame.brake,
    drs: frame.drs
  }
}

export function DriverInfo() {
  const { drivers, telemetry, meta } = useRaceStore()
  const { currentTime } = useReplayStore()
  const { selectedDriver } = useUIStore()

  const driver = drivers.find(d => d.code === selectedDriver)
  const state = selectedDriver && telemetry[selectedDriver]
    ? findFrameAtTime(telemetry[selectedDriver], currentTime)
    : null

  if (!driver) {
    return (
      <Widget id="driver-info" title="Piloto" minWidth={200}>
        <p className="text-white/50 text-sm">Selecione um piloto</p>
      </Widget>
    )
  }

  return (
    <Widget id="driver-info" title="Piloto" minWidth={200}>
      {/* Driver header */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className="text-2xl font-bold px-2 py-1 rounded"
          style={{ backgroundColor: driver.team_color, color: '#fff' }}
        >
          {driver.number}
        </span>
        <div>
          <div className="font-semibold text-white">{driver.code}</div>
          <div className="text-xs text-white/60">{driver.team}</div>
        </div>
      </div>

      {/* Stats */}
      {state && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-white/60 text-sm">Velocidade</span>
            <span className="text-white font-mono">
              {Math.round(state.speed)} <span className="text-xs text-white/50">km/h</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60 text-sm">Volta</span>
            <span className="text-white font-mono">
              {state.lap} <span className="text-xs text-white/50">/ {meta?.total_laps || '-'}</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60 text-sm">Marcha</span>
            <span className="text-white font-mono text-lg">
              {state.gear === 0 ? 'N' : state.gear}
            </span>
          </div>
        </div>
      )}
    </Widget>
  )
}
