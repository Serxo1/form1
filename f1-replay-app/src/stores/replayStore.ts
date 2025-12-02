import { create } from 'zustand'

interface ReplayStore {
  // State
  currentTime: number
  duration: number
  isPlaying: boolean
  speed: number

  // Actions
  play: () => void
  pause: () => void
  toggle: () => void
  setSpeed: (speed: number) => void
  seekTo: (time: number) => void
  seekToPercent: (percent: number) => void
  skip: (seconds: number) => void
  tick: (delta: number) => void
  setDuration: (duration: number) => void
  reset: () => void
}

export const useReplayStore = create<ReplayStore>((set, get) => ({
  // Initial state
  currentTime: 0,
  duration: 5400, // 90 minutes default
  isPlaying: false,
  speed: 1,

  // Play
  play: () => set({ isPlaying: true }),

  // Pause
  pause: () => set({ isPlaying: false }),

  // Toggle play/pause
  toggle: () => set((state) => ({ isPlaying: !state.isPlaying })),

  // Set playback speed
  setSpeed: (speed) => set({ speed: Math.max(0.25, Math.min(8, speed)) }),

  // Seek to specific time
  seekTo: (time) => {
    const { duration } = get()
    set({ currentTime: Math.max(0, Math.min(duration, time)) })
  },

  // Seek to percentage (0-1)
  seekToPercent: (percent) => {
    const { duration } = get()
    set({ currentTime: Math.max(0, Math.min(duration, percent * duration)) })
  },

  // Skip forward/backward
  skip: (seconds) => {
    const { currentTime, duration } = get()
    set({ currentTime: Math.max(0, Math.min(duration, currentTime + seconds)) })
  },

  // Advance time by delta (called from animation loop)
  tick: (delta) => {
    const { isPlaying, speed, currentTime, duration } = get()
    if (!isPlaying) return

    const newTime = currentTime + delta * speed
    if (newTime >= duration) {
      set({ currentTime: duration, isPlaying: false })
    } else {
      set({ currentTime: newTime })
    }
  },

  // Set race duration
  setDuration: (duration) => set({ duration }),

  // Reset to beginning
  reset: () => set({ currentTime: 0, isPlaying: false })
}))

// Helper to format time as MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Helper to format time as HH:MM:SS
export function formatTimeLong(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
