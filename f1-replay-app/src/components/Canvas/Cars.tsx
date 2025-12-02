import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Car } from './Car'
import { useRaceStore } from '@/stores/raceStore'
import { useReplayStore } from '@/stores/replayStore'
import { useUIStore } from '@/stores/uiStore'
import { carStateManager } from '@/lib/carStates'
import type { DriverState, TelemetryFrame } from '@/lib/types'

// Interpolate between two telemetry frames
function interpolateFrames(
  frame1: TelemetryFrame,
  frame2: TelemetryFrame,
  t: number
): DriverState {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  const lerpAngle = (a: number, b: number, t: number) => {
    let diff = b - a
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    return a + diff * t
  }

  return {
    code: '',
    x: lerp(frame1.x, frame2.x, t),
    y: lerp(frame1.y, frame2.y, t),
    heading: lerpAngle(frame1.heading, frame2.heading, t),
    speed: lerp(frame1.speed, frame2.speed, t),
    lap: frame1.lap,
    gear: frame1.gear,
    throttle: lerp(frame1.throttle, frame2.throttle, t),
    brake: frame1.brake,
    drs: frame1.drs
  }
}

// Binary search for frame at time
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
  const frame1 = frames[frameIndex]
  const frame2 = frames[frameIndex + 1]

  if (!frame1 || !frame2) {
    const lastFrame = frames[frames.length - 1]
    return lastFrame ? {
      code: '',
      x: lastFrame.x,
      y: lastFrame.y,
      heading: lastFrame.heading,
      speed: lastFrame.speed,
      lap: lastFrame.lap,
      gear: lastFrame.gear,
      throttle: lastFrame.throttle,
      brake: lastFrame.brake,
      drs: lastFrame.drs
    } : null
  }

  const t = (time - frame1.t) / (frame2.t - frame1.t)
  return interpolateFrames(frame1, frame2, Math.max(0, Math.min(1, t)))
}

export function Cars() {
  const { drivers, telemetry } = useRaceStore()
  const { selectedDriver, selectDriver } = useUIStore()

  // Get store reference (not reactive)
  const replayStore = useReplayStore

  // Update states every frame
  useFrame((_, delta) => {
    const { isPlaying, speed, currentTime, duration } = replayStore.getState()

    // Tick replay time
    if (isPlaying) {
      const newTime = currentTime + delta * speed
      if (newTime >= duration) {
        replayStore.setState({ currentTime: duration, isPlaying: false })
      } else {
        replayStore.setState({ currentTime: newTime })
      }
    }

    // Get current time
    const time = replayStore.getState().currentTime

    // Update all driver states in shared manager
    drivers.forEach(driver => {
      const frames = telemetry[driver.code]
      if (frames) {
        const state = findFrameAtTime(frames, time)
        if (state) {
          state.code = driver.code
        }
        carStateManager.set(driver.code, state)
      }
    })
  })

  // Auto-select first driver
  if (!selectedDriver && drivers.length > 0) {
    selectDriver(drivers[0].code)
  }

  return (
    <group>
      {drivers.map(driver => (
        <Car
          key={driver.code}
          driver={driver}
          isFollowed={driver.code === selectedDriver}
        />
      ))}
    </group>
  )
}
