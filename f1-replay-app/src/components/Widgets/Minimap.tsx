import { useRef, useEffect, useCallback } from 'react'
import { Widget } from './Widget'
import { useRaceStore } from '@/stores/raceStore'
import { useReplayStore } from '@/stores/replayStore'
import { useUIStore } from '@/stores/uiStore'
import type { TelemetryFrame } from '@/lib/types'

const SCALE = 0.1

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trackImageRef = useRef<ImageData | null>(null)

  const { drivers, telemetry, track } = useRaceStore()
  const { currentTime } = useReplayStore()
  const { selectedDriver } = useUIStore()

  // Calculate bounds and scaling
  const getBounds = useCallback(() => {
    if (!track) return { minX: 0, maxX: 100, minY: 0, maxY: 100 }

    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    track.track_points.forEach(p => {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    })

    const padding = 20
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding
    }
  }, [track])

  // Draw track (cached)
  const drawTrack = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!track) return

    const bounds = getBounds()
    const scaleX = width / (bounds.maxX - bounds.minX)
    const scaleY = height / (bounds.maxY - bounds.minY)
    const scale = Math.min(scaleX, scaleY)

    const toScreen = (x: number, y: number) => ({
      x: (x - bounds.minX) * scale,
      y: height - (y - bounds.minY) * scale // Flip Y
    })

    // Draw track outline
    ctx.strokeStyle = '#444'
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    track.track_points.forEach((point, i) => {
      const screen = toScreen(point.x, point.y)
      if (i === 0) {
        ctx.moveTo(screen.x, screen.y)
      } else {
        ctx.lineTo(screen.x, screen.y)
      }
    })

    ctx.closePath()
    ctx.stroke()

    // Draw track surface
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 6
    ctx.stroke()

    // Save track image for reuse
    trackImageRef.current = ctx.getImageData(0, 0, width, height)

    return { bounds, scale, toScreen }
  }, [track, getBounds])

  // Draw cars
  const drawCars = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !track) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Restore track image or redraw
    if (trackImageRef.current) {
      ctx.putImageData(trackImageRef.current, 0, 0)
    } else {
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, width, height)
      drawTrack(ctx, width, height)
    }

    const bounds = getBounds()
    const scaleX = width / (bounds.maxX - bounds.minX)
    const scaleY = height / (bounds.maxY - bounds.minY)
    const scale = Math.min(scaleX, scaleY)

    const toScreen = (x: number, y: number) => ({
      x: (x - bounds.minX) * scale,
      y: height - (y - bounds.minY) * scale
    })

    // Draw cars
    drivers.forEach(driver => {
      const frames = telemetry[driver.code]
      if (!frames || frames.length === 0) return

      // Find frame at current time
      let frame: TelemetryFrame | null = null
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].t <= currentTime) {
          frame = frames[i]
        } else {
          break
        }
      }

      if (!frame) return

      const screen = toScreen(frame.x, frame.y)
      const isSelected = driver.code === selectedDriver

      // Draw car dot
      ctx.beginPath()
      ctx.arc(screen.x, screen.y, isSelected ? 5 : 3, 0, Math.PI * 2)
      ctx.fillStyle = driver.team_color
      ctx.fill()

      if (isSelected) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })
  }, [drivers, telemetry, track, currentTime, selectedDriver, getBounds, drawTrack])

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
        trackImageRef.current = null // Force redraw
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  // Redraw on changes
  useEffect(() => {
    drawCars()
  }, [drawCars])

  return (
    <Widget id="minimap" title="Mapa" minWidth={200} minHeight={150}>
      <canvas
        ref={canvasRef}
        className="w-full h-32 rounded"
        style={{ background: '#1a1a1a' }}
      />
    </Widget>
  )
}
