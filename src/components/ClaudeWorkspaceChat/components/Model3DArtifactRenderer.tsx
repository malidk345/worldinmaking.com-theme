import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { Play, Pause, RotateCcw, Box, Eye, Sparkles } from 'lucide-react'

import { Model3DSpec, parseModel3DSpec } from '../../../lib/ai/visual-artifacts'
export type { Model3DSpec }
export { parseModel3DSpec }

const PRESET_COLORS = {
  gold: { primary: 0xe2b340, secondary: 0xfde047, glow: 0xca8a04 },
  cyan: { primary: 0x06b6d4, secondary: 0x67e8f9, glow: 0x0891b2 },
  emerald: { primary: 0x10b981, secondary: 0x6ee7b7, glow: 0x059669 },
  crimson: { primary: 0xf43f5e, secondary: 0xfca5a5, glow: 0xe11d48 },
  violet: { primary: 0xa855f7, secondary: 0xd8b4fe, glow: 0x7e22ce },
}

export function Model3DArtifactRenderer({ content }: { content: string | unknown }): JSX.Element {
  const spec = useMemo(() => parseModel3DSpec(content), [content])
  const containerRef = useRef<HTMLDivElement>(null)

  const [isRotating, setIsRotating] = useState(spec.autoRotate ?? true)
  const [wireframe, setWireframe] = useState(spec.wireframe ?? true)
  const isRotatingRef = useRef(isRotating)
  isRotatingRef.current = isRotating

  const activeColor = PRESET_COLORS[spec.theme || 'gold'] || PRESET_COLORS.gold

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x09090b, 0.08)

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(activeColor.secondary, 2, 20)
    pointLight.position.set(5, 5, 5)
    scene.add(pointLight)

    const backLight = new THREE.PointLight(activeColor.glow, 1.5, 20)
    backLight.position.set(-5, -5, -3)
    scene.add(backLight)

    // Root model group
    const modelGroup = new THREE.Group()
    scene.add(modelGroup)

    const preset = spec.preset || 'polyhedra'

    if (preset === 'polyhedra') {
      // Nested Dual-Icosahedron (Philosophical Structure)
      const outerGeo = new THREE.IcosahedronGeometry(2.2, 0)
      const outerMat = new THREE.MeshStandardMaterial({
        color: activeColor.primary,
        wireframe,
        transparent: true,
        opacity: 0.85,
        roughness: 0.2,
        metalness: 0.8,
      })
      const outerMesh = new THREE.Mesh(outerGeo, outerMat)
      modelGroup.add(outerMesh)

      const innerGeo = new THREE.OctahedronGeometry(1.2, 0)
      const innerMat = new THREE.MeshStandardMaterial({
        color: activeColor.secondary,
        wireframe: false,
        roughness: 0.1,
        metalness: 0.9,
      })
      const innerMesh = new THREE.Mesh(innerGeo, innerMat)
      modelGroup.add(innerMesh)

      // Surrounding particle ring
      const particleGeo = new THREE.BufferGeometry()
      const count = 120
      const posArray = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2
        const radius = 3.2 + (Math.random() - 0.5) * 0.4
        posArray[i * 3] = Math.cos(theta) * radius
        posArray[i * 3 + 1] = (Math.random() - 0.5) * 0.6
        posArray[i * 3 + 2] = Math.sin(theta) * radius
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
      const particleMat = new THREE.PointsMaterial({
        size: 0.08,
        color: activeColor.secondary,
        transparent: true,
        opacity: 0.7,
      })
      const particles = new THREE.Points(particleGeo, particleMat)
      modelGroup.add(particles)
    } else if (preset === 'dna_helix') {
      // Double Helix
      const rungs = 40
      const helixRadius = 1.4
      const height = 5
      const lineMaterial = new THREE.LineBasicMaterial({ color: activeColor.primary, transparent: true, opacity: 0.6 })
      const sphereMat1 = new THREE.MeshStandardMaterial({ color: activeColor.primary, roughness: 0.3 })
      const sphereMat2 = new THREE.MeshStandardMaterial({ color: activeColor.secondary, roughness: 0.3 })
      const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16)

      for (let i = 0; i < rungs; i++) {
        const t = (i / rungs) * Math.PI * 4
        const y = (i / rungs) * height - height / 2

        const x1 = Math.cos(t) * helixRadius
        const z1 = Math.sin(t) * helixRadius

        const x2 = Math.cos(t + Math.PI) * helixRadius
        const z2 = Math.sin(t + Math.PI) * helixRadius

        const s1 = new THREE.Mesh(sphereGeo, sphereMat1)
        s1.position.set(x1, y, z1)
        modelGroup.add(s1)

        const s2 = new THREE.Mesh(sphereGeo, sphereMat2)
        s2.position.set(x2, y, z2)
        modelGroup.add(s2)

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x1, y, z1),
          new THREE.Vector3(x2, y, z2),
        ])
        const rungLine = new THREE.Line(lineGeo, lineMaterial)
        modelGroup.add(rungLine)
      }
    } else if (preset === 'orbital_system') {
      // Sun + Concentric Rings + Satellites
      const sunGeo = new THREE.SphereGeometry(0.8, 32, 32)
      const sunMat = new THREE.MeshStandardMaterial({ color: activeColor.primary, roughness: 0.2, emissive: activeColor.glow, emissiveIntensity: 0.4 })
      const sun = new THREE.Mesh(sunGeo, sunMat)
      modelGroup.add(sun)

      const rings = [1.6, 2.5, 3.4]
      rings.forEach((r, idx) => {
        const ringGeo = new THREE.RingGeometry(r - 0.02, r + 0.02, 64)
        const ringMat = new THREE.MeshBasicMaterial({ color: activeColor.secondary, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = Math.PI / 2
        modelGroup.add(ring)

        const satGeo = new THREE.SphereGeometry(0.18 + idx * 0.04, 16, 16)
        const satMat = new THREE.MeshStandardMaterial({ color: activeColor.secondary, metalness: 0.8 })
        const sat = new THREE.Mesh(satGeo, satMat)
        sat.position.set(r, 0, 0)
        modelGroup.add(sat)
      })
    } else {
      // Torus Knot / Complex manifold
      const knotGeo = new THREE.TorusKnotGeometry(1.6, 0.45, 100, 16)
      const knotMat = new THREE.MeshStandardMaterial({
        color: activeColor.primary,
        wireframe,
        roughness: 0.2,
        metalness: 0.7,
      })
      const knot = new THREE.Mesh(knotGeo, knotMat)
      modelGroup.add(knot)
    }

    // Interactive Drag Controls (Touch & Mouse)
    let isDragging = false
    let prevMouseX = 0
    let prevMouseY = 0
    let rotationVelocityX = 0
    let rotationVelocityY = 0

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true
      prevMouseX = e.clientX
      prevMouseY = e.clientY
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      const dx = e.clientX - prevMouseX
      const dy = e.clientY - prevMouseY
      rotationVelocityY = dx * 0.006
      rotationVelocityX = dy * 0.006
      modelGroup.rotation.y += rotationVelocityY
      modelGroup.rotation.x += rotationVelocityX
      prevMouseX = e.clientX
      prevMouseY = e.clientY
    }

    const onPointerUp = () => {
      isDragging = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      camera.position.z = Math.max(3, Math.min(16, camera.position.z + e.deltaY * 0.005))
    }

    const dom = renderer.domElement
    dom.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('wheel', onWheel, { passive: false })

    // Animation Loop
    let animId = 0
    const animate = () => {
      animId = requestAnimationFrame(animate)

      if (!isDragging) {
        if (isRotatingRef.current) {
          modelGroup.rotation.y += 0.008
          modelGroup.rotation.x += 0.003
        } else {
          // Inertia damping
          rotationVelocityX *= 0.94
          rotationVelocityY *= 0.94
          modelGroup.rotation.x += rotationVelocityX
          modelGroup.rotation.y += rotationVelocityY
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const width = entry.contentRect.width
      const height = entry.contentRect.height
      if (width === 0 || height === 0) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    })
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(animId)
      resizeObserver.disconnect()
      dom.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('wheel', onWheel)
      if (dom.parentElement) {
        dom.parentElement.removeChild(dom)
      }
      renderer.dispose()
    }
  }, [spec.preset, spec.theme, wireframe, activeColor])

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 select-none font-sans">
      {/* Top Floating Glass Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-1.5 backdrop-blur-md shadow-lg">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-white">{spec.title || '3D Model Viewport'}</span>
          {spec.description && <span className="text-[10px] text-zinc-400 line-clamp-1 max-w-xs">{spec.description}</span>}
        </div>
        <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 uppercase">
          {spec.preset || '3D'}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/80 p-1 backdrop-blur-md shadow-lg">
        <button
          type="button"
          onClick={() => setIsRotating((prev) => !prev)}
          title={isRotating ? 'Döndürmeyi Durdur' : 'Döndür'}
          className="flex size-7 items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
        >
          {isRotating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setWireframe((prev) => !prev)}
          title="Tel Çerçeve / Dolu Mod"
          className={`flex size-7 items-center justify-center rounded cursor-pointer transition-colors ${
            wireframe ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Box className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-900/70 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/10 pointer-events-none">
        <Eye className="h-3 w-3" />
        <span>Fare veya parmağınızla 360° döndürün, tekerlekle yakınlaşın.</span>
      </div>

      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="h-full w-full cursor-grab active:cursor-grabbing" />
    </div>
  )
}
