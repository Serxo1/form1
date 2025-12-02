import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import * as THREE from 'three'
import { Environment } from './Environment'
import { Track } from './Track'
import { Cars } from './Cars'
import { CameraController } from './CameraController'
import { useRaceStore } from '@/stores/raceStore'

export function Scene() {
  const { track, drivers } = useRaceStore()

  return (
    <Canvas
      shadows
      camera={{ fov: 60, near: 0.1, far: 5000, position: [0, 50, 100] }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
        powerPreference: 'high-performance'
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* Dark background for floating track aesthetic */}
      <color attach="background" args={['#0a0a0f']} />

      <Suspense fallback={null}>
        <Environment />

        {track && <Track trackData={track} />}

        {drivers.length > 0 && <Cars />}

        <CameraController />
      </Suspense>
    </Canvas>
  )
}
