import { useUIStore } from '@/stores/uiStore'
import type { CameraMode } from '@/lib/types'

interface CameraModeButton {
  mode: CameraMode
  title: string
  icon: JSX.Element
  shortcut: string
}

const CAMERA_MODES: CameraModeButton[] = [
  {
    mode: 'chase',
    title: 'Perseguição',
    shortcut: '1',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 4L4 8l8 4 8-4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4"/>
      </svg>
    )
  },
  {
    mode: 'cockpit',
    title: 'Cockpit',
    shortcut: '2',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
      </svg>
    )
  },
  {
    mode: 'helicopter',
    title: 'Helicóptero',
    shortcut: '3',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
    )
  },
  {
    mode: 'free',
    title: 'Livre',
    shortcut: '4',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
      </svg>
    )
  }
]

export function CameraButtons() {
  const { cameraMode, setCameraMode } = useUIStore()

  return (
    <div className="glass-panel p-2 flex gap-1">
      {CAMERA_MODES.map(({ mode, title, icon, shortcut }) => (
        <button
          key={mode}
          onClick={() => setCameraMode(mode)}
          className={`control-btn ${cameraMode === mode ? 'active' : ''}`}
          title={`${title} (${shortcut})`}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}
