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

export function Telemetry() {
  const { telemetry } = useRaceStore()
  const { currentTime } = useReplayStore()
  const { selectedDriver } = useUIStore()

  const state = selectedDriver && telemetry[selectedDriver]
    ? findFrameAtTime(telemetry[selectedDriver], currentTime)
    : null

  return (
    <Widget id="telemetry" title="Telemetria" minWidth={180}>
      {state ? (
        <div className="space-y-3">
          {/* Speed display */}
          <div className="text-center">
            <div className="text-4xl font-bold text-white font-mono">
              {Math.round(state.speed)}
            </div>
            <div className="text-xs text-white/50">km/h</div>
          </div>

          {/* Gear */}
          <div className="flex justify-center">
            <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
              <div className="text-2xl font-bold text-white font-mono">
                {state.gear === 0 ? 'N' : state.gear}
              </div>
              <div className="text-xs text-white/50">GEAR</div>
            </div>

            {/* DRS */}
            <div className="bg-white/10 rounded-lg px-4 py-2 text-center ml-2">
              <div className={`text-2xl font-bold font-mono ${state.drs ? 'text-green-400' : 'text-white/30'}`}>
                DRS
              </div>
              <div className="text-xs text-white/50">
                {state.drs ? 'OPEN' : 'CLOSED'}
              </div>
            </div>
          </div>

          {/* Throttle bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60">Throttle</span>
              <span className="text-white/80 font-mono">{Math.round(state.throttle)}%</span>
            </div>
            <div className="telemetry-bar throttle-bar">
              <div
                className="telemetry-bar-fill"
                style={{ width: `${state.throttle}%` }}
              />
            </div>
          </div>

          {/* Brake bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60">Brake</span>
              <span className="text-white/80 font-mono">{state.brake ? '100%' : '0%'}</span>
            </div>
            <div className="telemetry-bar brake-bar">
              <div
                className="telemetry-bar-fill"
                style={{ width: state.brake ? '100%' : '0%' }}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-white/50 text-sm text-center">Selecione um piloto</p>
      )}
    </Widget>
  )
}
