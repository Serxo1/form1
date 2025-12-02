import { useEffect, useCallback } from 'react'
import { Scene } from './components/Canvas/Scene'
import { Sidebar } from './components/UI/Sidebar'
import { ReplayControls } from './components/UI/ReplayControls'
import { CameraButtons } from './components/UI/CameraButtons'
import { LoadingScreen } from './components/UI/LoadingScreen'
import { DriverInfo, Standings, Telemetry, Minimap } from './components/Widgets'
import { useRaceStore } from './stores/raceStore'
import { useReplayStore } from './stores/replayStore'
import { useUIStore } from './stores/uiStore'
import type { CameraMode } from './lib/types'

function App() {
  const { isLoading, meta, drivers, loadFromFile } = useRaceStore()
  const { toggle, skip } = useReplayStore()
  const { setCameraMode, selectNextDriver, selectPrevDriver } = useUIStore()

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return

    switch (e.key) {
      case ' ':
        e.preventDefault()
        toggle()
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (e.shiftKey) {
          selectPrevDriver(drivers)
        } else {
          skip(-10)
        }
        break
      case 'ArrowRight':
        e.preventDefault()
        if (e.shiftKey) {
          selectNextDriver(drivers)
        } else {
          skip(10)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        selectPrevDriver(drivers)
        break
      case 'ArrowDown':
        e.preventDefault()
        selectNextDriver(drivers)
        break
      case '1':
        setCameraMode('chase')
        break
      case '2':
        setCameraMode('cockpit')
        break
      case '3':
        setCameraMode('helicopter')
        break
      case '4':
        setCameraMode('free')
        break
    }
  }, [toggle, skip, setCameraMode, selectNextDriver, selectPrevDriver, drivers])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    // Load real race data from OpenF1 (Monza 2023)
    loadFromFile('race_2023_monza.min.json')
  }, [loadFromFile])

  return (
    <div className="w-screen h-screen relative bg-f1-black overflow-hidden">
      {/* 3D Scene */}
      <Scene />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Sidebar (widgets toggle) */}
        <div className="pointer-events-auto">
          <Sidebar />
        </div>

        {/* Fixed HUD */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <ReplayControls />
        </div>

        <div className="absolute top-4 right-4 pointer-events-auto">
          <CameraButtons />
        </div>

        {/* Race Info */}
        {meta && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
            <h1 className="text-lg font-bold text-white/90">{meta.event_name}</h1>
            <p className="text-sm text-white/60">{meta.year} - Volta {meta.total_laps}</p>
          </div>
        )}

        {/* Widgets */}
        <div className="pointer-events-auto">
          <DriverInfo />
          <Standings />
          <Telemetry />
          <Minimap />
        </div>
      </div>

      {/* Loading Screen */}
      {isLoading && <LoadingScreen />}
    </div>
  )
}

export default App
