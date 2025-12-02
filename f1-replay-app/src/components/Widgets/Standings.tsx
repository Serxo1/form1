import { useMemo } from 'react'
import { Widget } from './Widget'
import { useRaceStore } from '@/stores/raceStore'
import { useReplayStore } from '@/stores/replayStore'
import { useUIStore } from '@/stores/uiStore'
import type { TelemetryFrame } from '@/lib/types'

interface StandingEntry {
  code: string
  position: number
  lap: number
  progress: number
  gap: string
}

export function Standings() {
  const { drivers, telemetry, tires, track } = useRaceStore()
  const { currentTime } = useReplayStore()
  const { selectedDriver, selectDriver } = useUIStore()

  // Calculate standings based on progress
  const standings = useMemo(() => {
    if (!drivers.length || !track) return []

    const entries: StandingEntry[] = drivers.map(driver => {
      const frames = telemetry[driver.code]
      if (!frames || frames.length === 0) {
        return { code: driver.code, position: 0, lap: 1, progress: 0, gap: '' }
      }

      // Find current frame
      let frameIdx = 0
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].t <= currentTime) {
          frameIdx = i
        } else {
          break
        }
      }

      const frame = frames[frameIdx]
      const lap = frame?.lap || 1

      // Calculate progress along track
      const x = frame?.x || 0
      const y = frame?.y || 0

      // Simple progress estimation based on track position
      let minDist = Infinity
      let closestIdx = 0
      track.track_points.forEach((point, i) => {
        const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))
        if (dist < minDist) {
          minDist = dist
          closestIdx = i
        }
      })

      const trackProgress = closestIdx / track.track_points.length
      const totalProgress = (lap - 1) + trackProgress

      return {
        code: driver.code,
        position: 0,
        lap,
        progress: totalProgress,
        gap: ''
      }
    })

    // Sort by progress (descending)
    entries.sort((a, b) => b.progress - a.progress)

    // Assign positions and calculate gaps
    const leader = entries[0]
    entries.forEach((entry, idx) => {
      entry.position = idx + 1
      if (idx === 0) {
        entry.gap = 'Leader'
      } else {
        const lapDiff = Math.floor(leader.progress) - Math.floor(entry.progress)
        if (lapDiff > 0) {
          entry.gap = `+${lapDiff} lap${lapDiff > 1 ? 's' : ''}`
        } else {
          const timeDiff = (leader.progress - entry.progress) * 90 // Assume 90s lap
          entry.gap = `+${timeDiff.toFixed(1)}s`
        }
      }
    })

    return entries
  }, [drivers, telemetry, track, currentTime])

  const getTireForDriver = (code: string, lap: number) => {
    const driverTires = tires[code]
    if (!driverTires) return 'MEDIUM'

    // Find tire for current lap (search backwards)
    for (let l = lap; l >= 1; l--) {
      if (driverTires[l]) return driverTires[l]
    }
    return 'MEDIUM'
  }

  const getTireClass = (compound: string) => {
    switch (compound.toUpperCase()) {
      case 'SOFT': return 'tire-soft'
      case 'MEDIUM': return 'tire-medium'
      case 'HARD': return 'tire-hard'
      case 'INTERMEDIATE': return 'tire-intermediate'
      case 'WET': return 'tire-wet'
      default: return 'tire-medium'
    }
  }

  return (
    <Widget id="standings" title="Classificação" minWidth={220}>
      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {standings.map(entry => {
          const driver = drivers.find(d => d.code === entry.code)
          if (!driver) return null

          const tire = getTireForDriver(entry.code, entry.lap)

          return (
            <div
              key={entry.code}
              className={`standings-row ${selectedDriver === entry.code ? 'selected' : ''}`}
              onClick={() => selectDriver(entry.code)}
            >
              {/* Position */}
              <span className="w-6 text-center font-bold text-white/90">
                {entry.position}
              </span>

              {/* Team color bar */}
              <div
                className="w-1 h-6 rounded"
                style={{ backgroundColor: driver.team_color }}
              />

              {/* Driver code */}
              <span className="flex-1 font-semibold text-white text-sm">
                {entry.code}
              </span>

              {/* Tire */}
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${getTireClass(tire)}`}>
                {tire.charAt(0)}
              </span>

              {/* Gap */}
              <span className="text-xs text-white/60 w-16 text-right font-mono">
                {entry.gap}
              </span>
            </div>
          )
        })}
      </div>
    </Widget>
  )
}
