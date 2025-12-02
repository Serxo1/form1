import type { DriverState } from './types'

// Shared state manager for car positions
// Updated every frame by Cars.tsx, read every frame by Car.tsx
// This bypasses React's prop system for high-frequency updates

class CarStateManager {
  private states: Record<string, DriverState | null> = {}

  set(code: string, state: DriverState | null) {
    this.states[code] = state
  }

  get(code: string): DriverState | null {
    return this.states[code] || null
  }

  clear() {
    this.states = {}
  }
}

export const carStateManager = new CarStateManager()
