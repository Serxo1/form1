import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import { carStateManager } from '@/lib/carStates'
import type { Driver } from '@/lib/types'

interface CarProps {
  driver: Driver
  isFollowed: boolean
}

const SCALE = 0.1
const CAR_SCALE = 0.3

useGLTF.preload('/models/car.glb')

export function Car({ driver, isFollowed }: CarProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Track for smooth rotation
  const lastPosition = useRef({ x: 0, z: 0 })
  const currentRotation = useRef(0)
  const initialized = useRef(false)
  const visible = useRef(false)

  // Load car model
  const { scene } = useGLTF('/models/car.glb')

  // Clone and customize materials
  const carModel = useMemo(() => {
    const cloned = scene.clone(true)
    const teamColor = new THREE.Color(driver.team_color)

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => {
            const clonedMat = m.clone()
            if (clonedMat.color) clonedMat.color = teamColor
            clonedMat.transparent = !isFollowed
            clonedMat.opacity = isFollowed ? 1 : 0.6
            return clonedMat
          })
        } else {
          const clonedMat = child.material.clone()
          if (clonedMat.color) clonedMat.color = teamColor
          clonedMat.transparent = !isFollowed
          clonedMat.opacity = isFollowed ? 1 : 0.6
          child.material = clonedMat
        }
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    cloned.scale.setScalar(CAR_SCALE)
    cloned.rotation.y = Math.PI

    return cloned
  }, [scene, driver.team_color, isFollowed])

  // Update every frame - read fresh state from manager
  useFrame(() => {
    if (!groupRef.current) return

    // Get latest state directly from shared manager
    const state = carStateManager.get(driver.code)

    if (!state) {
      groupRef.current.visible = false
      visible.current = false
      return
    }

    groupRef.current.visible = true
    visible.current = true

    const newX = state.x * SCALE
    const newZ = state.y * SCALE

    // Set position directly (already interpolated)
    groupRef.current.position.set(newX, 0.1, newZ)

    // Initialize on first valid state
    if (!initialized.current) {
      lastPosition.current.x = newX
      lastPosition.current.z = newZ
      initialized.current = true
      return
    }

    // Calculate direction from movement
    const dx = newX - lastPosition.current.x
    const dz = newZ - lastPosition.current.z
    const moveDistance = Math.sqrt(dx * dx + dz * dz)

    // Update rotation if moving
    if (moveDistance > 0.0001) {
      const targetRotation = Math.atan2(dx, dz)

      let rotationDiff = targetRotation - currentRotation.current
      while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2
      while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2

      currentRotation.current += rotationDiff * 0.25
      groupRef.current.rotation.y = currentRotation.current
    }

    // Update last position
    lastPosition.current.x = newX
    lastPosition.current.z = newZ
  })

  // Get initial state for conditional rendering
  const initialState = carStateManager.get(driver.code)

  return (
    <group ref={groupRef} visible={!!initialState}>
      <primitive object={carModel} />

      <Html
        position={[0, 1.5, 0]}
        center
        distanceFactor={15}
        occlude={false}
        style={{
          transition: 'opacity 0.2s',
          opacity: isFollowed ? 1 : 0.7,
          pointerEvents: 'none'
        }}
      >
        <div
          className="driver-label"
          style={{
            borderLeft: `3px solid ${driver.team_color}`,
            paddingLeft: '4px'
          }}
        >
          {driver.code}
        </div>
      </Html>
    </group>
  )
}
