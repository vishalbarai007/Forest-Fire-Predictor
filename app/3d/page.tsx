"use client"

import { Suspense, useRef, useState, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Environment, Html } from "@react-three/drei"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, RotateCcw, Camera, Maximize, Settings } from "lucide-react"
import type * as THREE from "three"

// 3D Terrain Component
function Terrain({ fireIntensity = 0 }: { fireIntensity?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.01
    }
  })

  return (
    <mesh ref={meshRef} position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 20, 50, 50]} />
      <meshStandardMaterial color="#4a5d23" wireframe={false} roughness={0.8} metalness={0.1} />
    </mesh>
  )
}

// Fire Particles Component
function FireParticles({ intensity = 0.5, visible = true }: { intensity?: number; visible?: boolean }) {
  const pointsRef = useRef<THREE.Points>(null)
  const maxParticles = 1000 // Fixed maximum number of particles
  const activeParticles = Math.floor(intensity * maxParticles)

  // Create fixed-size arrays for maximum particles
  const positions = useMemo(() => {
    const pos = new Float32Array(maxParticles * 3)
    for (let i = 0; i < maxParticles; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10 // x
      pos[i * 3 + 1] = Math.random() * 5 // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 // z
    }
    return pos
  }, [])

  const colors = useMemo(() => {
    const col = new Float32Array(maxParticles * 3)
    for (let i = 0; i < maxParticles; i++) {
      col[i * 3] = 1 // Red
      col[i * 3 + 1] = Math.random() * 0.5 // Green
      col[i * 3 + 2] = 0 // Blue
    }
    return col
  }, [])

  const opacities = useMemo(() => {
    const op = new Float32Array(maxParticles)
    for (let i = 0; i < maxParticles; i++) {
      op[i] = i < activeParticles ? 1.0 : 0.0
    }
    return op
  }, [activeParticles])

  useFrame((state) => {
    if (pointsRef.current && visible) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.1

      const positionAttribute = pointsRef.current.geometry.attributes.position
      const opacityAttribute = pointsRef.current.geometry.attributes.opacity

      // Update positions for active particles only
      for (let i = 0; i < activeParticles; i++) {
        const index = i * 3
        positions[index + 1] += 0.01 // Move particles up
        if (positions[index + 1] > 5) {
          positions[index + 1] = 0 // Reset to ground level
          // Randomize x and z position when resetting
          positions[index] = (Math.random() - 0.5) * 10
          positions[index + 2] = (Math.random() - 0.5) * 10
        }
      }

      // Update opacity based on intensity
      for (let i = 0; i < maxParticles; i++) {
        opacities[i] = i < activeParticles ? 0.5 + Math.random() * 0.5 : 0.0
      }

      positionAttribute.needsUpdate = true
      opacityAttribute.needsUpdate = true
    }
  })

  if (!visible) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={maxParticles} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={maxParticles} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-opacity" count={maxParticles} array={opacities} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial size={0.1} vertexColors transparent opacity={0.8} alphaTest={0.1} />
    </points>
  )
}

// 3D Scene Component
function Scene3D({ fireIntensity, showFire }: { fireIntensity: number; showFire: boolean }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#ff4500" />

      <Terrain fireIntensity={fireIntensity} />
      <FireParticles intensity={fireIntensity} visible={showFire} />

      <Html position={[0, 3, 0]} center>
        <div className="bg-black/50 text-white px-3 py-1 rounded text-sm">
          Fire Intensity: {Math.round(fireIntensity * 100)}%
        </div>
      </Html>
    </>
  )
}

export default function Visualization3DPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [fireIntensity, setFireIntensity] = useState([0.3])
  const [showFire, setShowFire] = useState(true)
  const [cameraMode, setCameraMode] = useState("orbit")

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">3D Fire Visualization</h1>
          <p className="text-muted-foreground">Immersive 3D terrain rendering with animated fire spread simulation</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* 3D Canvas */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>3D Terrain Visualization</CardTitle>
                    <CardDescription>Interactive 3D fire spread simulation</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Real-time Rendering
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] w-full bg-gradient-to-b from-sky-200 to-sky-100 rounded-lg overflow-hidden">
                  <Canvas camera={{ position: [10, 8, 10], fov: 60 }}>
                    <Suspense fallback={null}>
                      <Scene3D fireIntensity={fireIntensity[0]} showFire={showFire} />
                      <OrbitControls
                        enablePan={true}
                        enableZoom={true}
                        enableRotate={true}
                        maxPolarAngle={Math.PI / 2}
                      />
                      <Environment preset="sunset" />
                    </Suspense>
                  </Canvas>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls Panel */}
          <div className="space-y-6">
            {/* Animation Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Play className="mr-2 h-5 w-5" />
                  Simulation Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={isPlaying ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFireIntensity([0])
                      setIsPlaying(false)
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fire Intensity: {Math.round(fireIntensity[0] * 100)}%</label>
                  <Slider
                    value={fireIntensity}
                    onValueChange={setFireIntensity}
                    max={1}
                    step={0.01}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Show Fire Particles</span>
                  <Switch checked={showFire} onCheckedChange={setShowFire} />
                </div>
              </CardContent>
            </Card>

            {/* Camera Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="mr-2 h-5 w-5" />
                  Camera Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={cameraMode === "orbit" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCameraMode("orbit")}
                  >
                    Orbit
                  </Button>
                  <Button
                    variant={cameraMode === "fly" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCameraMode("fly")}
                  >
                    Fly
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Left click + drag: Rotate</p>
                  <p>• Right click + drag: Pan</p>
                  <p>• Scroll: Zoom in/out</p>
                </div>
              </CardContent>
            </Card>

            {/* View Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  View Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Wireframe Mode</span>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Show Grid</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Ambient Lighting</span>
                    <Switch defaultChecked />
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  <Maximize className="mr-2 h-4 w-4" />
                  Fullscreen
                </Button>
              </CardContent>
            </Card>

            {/* Scene Info */}
            <Card>
              <CardHeader>
                <CardTitle>Scene Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Terrain Size</span>
                  <span className="font-medium">20km²</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Particles</span>
                  <span className="font-medium">{Math.floor(fireIntensity[0] * 1000)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Render Mode</span>
                  <span className="font-medium">Real-time</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">FPS</span>
                  <Badge variant="outline">60</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
