import { useRef, useCallback, useEffect, useState } from 'react'
import { useUIStore } from '@/stores/uiStore'

interface WidgetProps {
  id: string
  title: string
  children: React.ReactNode
  minWidth?: number
  minHeight?: number
}

export function Widget({ id, title, children, minWidth = 200, minHeight = 100 }: WidgetProps) {
  const { visibleWidgets, widgetPositions, setWidgetPosition, hideWidget } = useUIStore()
  const widgetRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const isVisible = visibleWidgets.includes(id)
  const position = widgetPositions[id] || { x: 100, y: 100 }

  // Calculate actual position (handle negative values for right-aligned)
  const getActualPosition = useCallback(() => {
    let x = position.x
    let y = position.y

    if (x < 0) {
      x = window.innerWidth + x
    }
    if (y < 0) {
      y = window.innerHeight + y
    }

    return { x, y }
  }, [position])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.widget-close')) return

    const rect = widgetRef.current?.getBoundingClientRect()
    if (!rect) return

    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    const x = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x))
    const y = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y))

    if (widgetRef.current) {
      widgetRef.current.style.left = `${x}px`
      widgetRef.current.style.top = `${y}px`
    }
  }, [isDragging])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    const x = e.clientX - dragOffset.current.x
    const y = e.clientY - dragOffset.current.y

    setWidgetPosition(id, { x, y })
    setIsDragging(false)
  }, [isDragging, id, setWidgetPosition])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (!isVisible) return null

  const actualPos = getActualPosition()

  return (
    <div
      ref={widgetRef}
      className={`widget ${isDragging ? 'dragging' : ''}`}
      style={{
        left: actualPos.x,
        top: actualPos.y,
        minWidth,
        minHeight,
        zIndex: isDragging ? 100 : 10
      }}
    >
      <div className="widget-header" onMouseDown={handleMouseDown}>
        <span className="widget-title">{title}</span>
        <button
          className="widget-close"
          onClick={() => hideWidget(id)}
          title="Fechar"
        >
          ×
        </button>
      </div>
      <div className="widget-content">
        {children}
      </div>
    </div>
  )
}
