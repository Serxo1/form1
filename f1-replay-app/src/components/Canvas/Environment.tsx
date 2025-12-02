export function Environment() {
  return (
    <>
      {/* Dark background color is set in Scene.tsx via Canvas */}

      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.5} color="#ffffff" />

      {/* Main directional light (sun) */}
      <directionalLight
        position={[100, 100, 50]}
        intensity={1.2}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={500}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />

      {/* Fill light from opposite side */}
      <directionalLight
        position={[-50, 30, -50]}
        intensity={0.4}
        color="#6699cc"
      />

      {/* Subtle rim light from below for floating effect */}
      <directionalLight
        position={[0, -20, 0]}
        intensity={0.15}
        color="#334455"
      />
    </>
  )
}
