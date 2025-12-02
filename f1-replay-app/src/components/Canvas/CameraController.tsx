import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useRaceStore } from '@/stores/raceStore'
import { useReplayStore } from '@/stores/replayStore'
import { useUIStore } from '@/stores/uiStore'
import type { TelemetryFrame, DriverState } from '@/lib/types'

const SCALE = 0.1

// Find frame at time (same as in Cars.tsx)
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

  if (!frame1) return null
  if (!frame2) {
    return {
      code: '',
      x: frame1.x,
      y: frame1.y,
      heading: frame1.heading,
      speed: frame1.speed,
      lap: frame1.lap,
      gear: frame1.gear,
      throttle: frame1.throttle,
      brake: frame1.brake,
      drs: frame1.drs
    }
  }

  const t = (time - frame1.t) / (frame2.t - frame1.t)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const lerpAngle = (a: number, b: number, t: number) => {
    let diff = b - a
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    return a + diff * t
  }

  return {
    code: '',
    x: lerp(frame1.x, frame2.x, Math.max(0, Math.min(1, t))),
    y: lerp(frame1.y, frame2.y, Math.max(0, Math.min(1, t))),
    heading: lerpAngle(frame1.heading, frame2.heading, Math.max(0, Math.min(1, t))),
    speed: lerp(frame1.speed, frame2.speed, Math.max(0, Math.min(1, t))),
    lap: frame1.lap,
    gear: frame1.gear,
    throttle: frame1.throttle,
    brake: frame1.brake,
    drs: frame1.drs
  }
}

export function CameraController() {
  const { camera } = useThree()
  const orbitRef = useRef<any>(null)
  const targetPosition = useRef(new THREE.Vector3())
  const targetLookAt = useRef(new THREE.Vector3())

  const { telemetry } = useRaceStore()
  const { currentTime } = useReplayStore()
  const { selectedDriver, cameraMode, cameraDistance, cameraHeight } = useUIStore()

  // Get current driver state
  const getDriverState = () => {
    if (!selectedDriver || !telemetry[selectedDriver]) return null
    return findFrameAtTime(telemetry[selectedDriver], currentTime)
  }

  useFrame(() => {
    const state = getDriverState()
    if (!state) return

    const carX = state.x * SCALE
    const carZ = state.y * SCALE
    const heading = -state.heading + Math.PI / 2
    const speed = state.speed

    // Calculate camera position based on mode
    let camX = 0, camY = 0, camZ = 0
    let lookX = carX, lookY = 0.5, lookZ = carZ

    switch (cameraMode) {
      case 'chase': {
        // Behind and above the car
        const distance = cameraDistance
        const height = cameraHeight
        camX = carX - Math.sin(heading) * distance
        camY = height
        camZ = carZ - Math.cos(heading) * distance
        lookX = carX + Math.sin(heading) * 2
        lookY = 0.5
        lookZ = carZ + Math.cos(heading) * 2
        break
      }

      case 'cockpit': {
        // Inside the car, looking forward
        camX = carX
        camY = 0.5
        camZ = carZ
        lookX = carX + Math.sin(heading) * 10
        lookY = 0.3
        lookZ = carZ + Math.cos(heading) * 10
        break
      }

      case 'helicopter': {
        // High above, tracking the car
        const distance = 50
        camX = carX
        camY = distance
        camZ = carZ
        lookX = carX
        lookY = 0
        lookZ = carZ
        break
      }

      case 'free':
        // OrbitControls handles this
        if (orbitRef.current) {
          orbitRef.current.target.set(carX, 0.5, carZ)
        }
        return
    }

    // Smooth interpolation
    const lerpFactor = 0.08 + (speed / 350) * 0.04
    targetPosition.current.lerp(new THREE.Vector3(camX, camY, camZ), lerpFactor)
    targetLookAt.current.lerp(new THREE.Vector3(lookX, lookY, lookZ), lerpFactor)

    camera.position.copy(targetPosition.current)
    camera.lookAt(targetLookAt.current)

    // Dynamic FOV based on speed
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = 60 + (speed / 350) * 20
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.05)
      camera.updateProjectionMatrix()
    }

    // Camera shake at high speed
    if (speed > 250) {
      const intensity = ((speed - 250) / 100) * 0.02
      camera.position.x += (Math.random() - 0.5) * intensity
      camera.position.y += (Math.random() - 0.5) * intensity
    }
  })

  // Initialize camera position
  useEffect(() => {
    targetPosition.current.copy(camera.position)
    const lookAt = new THREE.Vector3(0, 0, 0)
    targetLookAt.current.copy(lookAt)
  }, [camera])

  return (
    <>
      {cameraMode === 'free' && (
        <OrbitControls
          ref={orbitRef}
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2 - 0.1}
          minDistance={5}
          maxDistance={200}
        />
      )}
    </>
  )
}
