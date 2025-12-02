import { useMemo } from 'react'
import * as THREE from 'three'
import type { TrackData } from '@/lib/types'

interface TrackProps {
  trackData: TrackData
}

const TRACK_WIDTH = 15  // Largura da pista em metros (não escalar)
const KERB_WIDTH = 2    // Largura das zebras em metros (não escalar)
const SCALE = 0.1       // Escala dos pontos da pista

export function Track({ trackData }: TrackProps) {
  // Normalize and scale track points
  const { centerPoints, innerPoints, outerPoints } = useMemo(() => {
    const points = trackData.track_points
    if (!points || points.length < 10) return { centerPoints: [], innerPoints: [], outerPoints: [] }

    // Find bounds
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    points.forEach(p => {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    })

    // Center and scale
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    const centerPoints = points.map(p => ({
      x: (p.x - cx) * SCALE,
      y: (p.y - cy) * SCALE
    }))

    // Calculate inner and outer points
    const innerPoints: { x: number; y: number }[] = []
    const outerPoints: { x: number; y: number }[] = []

    for (let i = 0; i < centerPoints.length; i++) {
      const current = centerPoints[i]
      const next = centerPoints[(i + 1) % centerPoints.length]

      const dx = next.x - current.x
      const dy = next.y - current.y
      const len = Math.sqrt(dx * dx + dy * dy)

      if (len === 0) continue

      const perpX = -dy / len
      const perpY = dx / len
      const halfWidth = TRACK_WIDTH / 2  // Não escalar a largura

      innerPoints.push({
        x: current.x + perpX * halfWidth,
        y: current.y + perpY * halfWidth
      })

      outerPoints.push({
        x: current.x - perpX * halfWidth,
        y: current.y - perpY * halfWidth
      })
    }

    return { centerPoints, innerPoints, outerPoints }
  }, [trackData.track_points])

  // Create track surface geometry
  const trackGeometry = useMemo(() => {
    if (innerPoints.length === 0) return null

    const geometry = new THREE.BufferGeometry()
    const vertices: number[] = []
    const indices: number[] = []
    const uvs: number[] = []

    for (let i = 0; i < innerPoints.length; i++) {
      const inner = innerPoints[i]
      const outer = outerPoints[i]

      // Vertices (y is height in Three.js)
      vertices.push(inner.x, 0.01, inner.y)
      vertices.push(outer.x, 0.01, outer.y)

      // UVs
      const u = i / innerPoints.length
      uvs.push(u, 0)
      uvs.push(u, 1)

      // Indices for triangles
      if (i < innerPoints.length - 1) {
        const baseIdx = i * 2
        indices.push(baseIdx, baseIdx + 1, baseIdx + 2)
        indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2)
      }
    }

    // Close the circuit
    const lastIdx = (innerPoints.length - 1) * 2
    indices.push(lastIdx, lastIdx + 1, 0)
    indices.push(lastIdx + 1, 1, 0)

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    return geometry
  }, [innerPoints, outerPoints])

  // Create kerbs geometry (red/white stripes)
  const kerbGeometries = useMemo(() => {
    if (innerPoints.length === 0) return { inner: null, outer: null }

    const createKerbGeometry = (basePoints: { x: number; y: number }[], direction: number) => {
      const geometry = new THREE.BufferGeometry()
      const vertices: number[] = []
      const colors: number[] = []

      const kerbWidth = KERB_WIDTH  // Não escalar a largura

      for (let i = 0; i < basePoints.length; i++) {
        const current = basePoints[i]
        const next = basePoints[(i + 1) % basePoints.length]

        const dx = next.x - current.x
        const dy = next.y - current.y
        const len = Math.sqrt(dx * dx + dy * dy)

        if (len === 0) continue

        const perpX = (-dy / len) * direction
        const perpY = (dx / len) * direction

        // Inner edge of kerb
        vertices.push(current.x, 0.02, current.y)
        // Outer edge of kerb
        vertices.push(current.x + perpX * kerbWidth, 0.02, current.y + perpY * kerbWidth)

        // Alternating red/white
        const colorIdx = Math.floor(i / 5) % 2
        const color = colorIdx === 0 ? [1, 0, 0] : [1, 1, 1]
        colors.push(...color, ...color)
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

      // Create indices
      const indices: number[] = []
      const numPoints = basePoints.length
      for (let i = 0; i < numPoints - 1; i++) {
        const baseIdx = i * 2
        indices.push(baseIdx, baseIdx + 1, baseIdx + 2)
        indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2)
      }
      // Close
      const lastIdx = (numPoints - 1) * 2
      indices.push(lastIdx, lastIdx + 1, 0)
      indices.push(lastIdx + 1, 1, 0)

      geometry.setIndex(indices)
      geometry.computeVertexNormals()

      return geometry
    }

    return {
      inner: createKerbGeometry(innerPoints, -1),
      outer: createKerbGeometry(outerPoints, 1)
    }
  }, [innerPoints, outerPoints])

  // Create center line
  const centerLineGeometry = useMemo(() => {
    if (centerPoints.length === 0) return null

    const points = centerPoints.map(p => new THREE.Vector3(p.x, 0.03, p.y))
    points.push(points[0].clone()) // Close the loop

    return new THREE.BufferGeometry().setFromPoints(points)
  }, [centerPoints])

  // Create start/finish line position
  const startFinishPosition = useMemo(() => {
    if (centerPoints.length === 0) return null
    return new THREE.Vector3(centerPoints[0].x, 0.02, centerPoints[0].y)
  }, [centerPoints])

  // Calculate start/finish line rotation
  const startFinishRotation = useMemo(() => {
    if (centerPoints.length < 2) return 0
    const p0 = centerPoints[0]
    const p1 = centerPoints[1]
    return Math.atan2(p1.y - p0.y, p1.x - p0.x)
  }, [centerPoints])

  if (!trackGeometry) return null

  return (
    <group>
      {/* Track surface (asphalt) */}
      <mesh geometry={trackGeometry} receiveShadow>
        <meshStandardMaterial
          color="#333333"
          roughness={0.8}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner kerbs */}
      {kerbGeometries.inner && (
        <mesh geometry={kerbGeometries.inner}>
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Outer kerbs */}
      {kerbGeometries.outer && (
        <mesh geometry={kerbGeometries.outer}>
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Center dashed line */}
      {centerLineGeometry && (
        <lineSegments geometry={centerLineGeometry}>
          <lineDashedMaterial color="#ffffff" dashSize={2} gapSize={2} />
        </lineSegments>
      )}

      {/* Start/Finish line */}
      {startFinishPosition && (
        <mesh
          position={startFinishPosition}
          rotation={[-Math.PI / 2, 0, startFinishRotation]}
        >
          <planeGeometry args={[TRACK_WIDTH, 2]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}
