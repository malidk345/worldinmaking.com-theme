import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { Play, Pause, RotateCcw, Box, Eye, Sparkles, Compass, Grid } from 'lucide-react'

import { Model3DSpec, Model3DObjectSpec, parseModel3DSpec } from '../../../lib/ai/visual-artifacts'
export type { Model3DSpec, Model3DObjectSpec }
export { parseModel3DSpec }

const PRESET_COLORS: Record<string, { primary: number; secondary: number; glow: number }> = {
  gold: { primary: 0xe2b340, secondary: 0xfde047, glow: 0xca8a04 },
  cyan: { primary: 0x06b6d4, secondary: 0x67e8f9, glow: 0x0891b2 },
  emerald: { primary: 0x10b981, secondary: 0x6ee7b7, glow: 0x059669 },
  crimson: { primary: 0xf43f5e, secondary: 0xfca5a5, glow: 0xe11d48 },
  violet: { primary: 0xa855f7, secondary: 0xd8b4fe, glow: 0x7e22ce },
  studio: { primary: 0x38bdf8, secondary: 0x94a3b8, glow: 0x0284c7 },
}

function createPrismGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(-width / 2, -height / 2)
  shape.lineTo(width / 2, -height / 2)
  shape.lineTo(0, height / 2)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
  geo.center()
  return geo
}

function createCustomMeshGeometry(vertices: number[][], faces?: number[][]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  if (Array.isArray(faces) && faces.length > 0) {
    const posArray: number[] = []
    for (const f of faces) {
      if (f.length >= 3) {
        const v0 = vertices[f[0]] || [0, 0, 0]
        const v1 = vertices[f[1]] || [0, 0, 0]
        const v2 = vertices[f[2]] || [0, 0, 0]
        posArray.push(v0[0], v0[1], v0[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2])
        if (f.length === 4) {
          const v3 = vertices[f[3]] || [0, 0, 0]
          posArray.push(v0[0], v0[1], v0[2], v2[0], v2[1], v2[2], v3[0], v3[1], v3[2])
        }
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3))
  } else if (Array.isArray(vertices) && vertices.length > 0) {
    const flat: number[] = []
    for (const v of vertices) {
      flat.push(v[0] || 0, v[1] || 0, v[2] || 0)
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3))
  } else {
    return new THREE.BoxGeometry(1, 1, 1)
  }
  geo.computeVertexNormals()
  geo.center()
  return geo
}

export function Model3DArtifactRenderer({ content }: { content: string | unknown }): JSX.Element {
  const spec = useMemo(() => parseModel3DSpec(content), [content])
  const containerRef = useRef<HTMLDivElement>(null)

  const [isRotating, setIsRotating] = useState(spec.autoRotate ?? true)
  const [wireframe, setWireframe] = useState(spec.wireframe ?? false)
  const [showGrid, setShowGrid] = useState(spec.grid ?? true)
  const [hoveredObject, setHoveredObject] = useState<{ name: string; type: string; position: [number, number, number] } | null>(null)
  const [selectedObject, setSelectedObject] = useState<{ name: string; type: string; position: [number, number, number]; color?: string } | null>(null)

  const isRotatingRef = useRef(isRotating)
  isRotatingRef.current = isRotating

  const wireframeRef = useRef(wireframe)
  wireframeRef.current = wireframe

  const activeColor = PRESET_COLORS[spec.theme || 'studio'] || PRESET_COLORS.studio
  const resetCameraRef = useRef<((view?: 'default' | 'isometric' | 'front' | 'top') => void) | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x09090b)
    scene.fog = new THREE.FogExp2(0x09090b, 0.04)

    const aspect = container.clientWidth / (container.clientHeight || 1)
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 200)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4)
    sunLight.position.set(16, 24, 18)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 1024
    sunLight.shadow.mapSize.height = 1024
    sunLight.shadow.bias = -0.001
    scene.add(sunLight)

    const fillLight = new THREE.DirectionalLight(activeColor.secondary, 0.6)
    fillLight.position.set(-16, 12, -14)
    scene.add(fillLight)

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x27272a, 0.3)
    scene.add(hemiLight)

    // Grid & Ground
    if (showGrid) {
      const gridHelper = new THREE.GridHelper(40, 40, 0x3f3f46, 0x18181b)
      gridHelper.position.y = -0.005
      scene.add(gridHelper)
    }

    if (spec.ground?.show) {
      const groundSize = spec.ground.size || 50
      const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize)
      const groundMat = new THREE.MeshStandardMaterial({
        color: spec.ground.color ? new THREE.Color(spec.ground.color) : 0x18181b,
        roughness: 0.95,
        metalness: 0.05,
      })
      const ground = new THREE.Mesh(groundGeo, groundMat)
      ground.rotation.x = -Math.PI / 2
      ground.position.y = -0.01
      ground.receiveShadow = true
      scene.add(ground)
    }

    // Root model group
    const modelGroup = new THREE.Group()
    scene.add(modelGroup)

    const interactiveMeshes: THREE.Mesh[] = []

    const buildObjectMesh = (obj: Model3DObjectSpec): THREE.Object3D => {
      const type = (obj.type || 'box').toLowerCase()
      let geo: THREE.BufferGeometry

      const size = obj.size || [1, 1, 1]
      const radius = obj.radius ?? 0.5
      const height = obj.height ?? 1
      const radialSegments = obj.radialSegments ?? 32

      switch (type) {
        case 'box':
        case 'cube':
          geo = new THREE.BoxGeometry(size[0], size[1], size[2])
          break
        case 'sphere':
          geo = new THREE.SphereGeometry(radius, radialSegments, radialSegments)
          break
        case 'cylinder':
          geo = new THREE.CylinderGeometry(
            obj.radiusTop ?? radius,
            obj.radiusBottom ?? radius,
            height,
            radialSegments
          )
          break
        case 'cone':
          geo = new THREE.ConeGeometry(radius, height, radialSegments)
          break
        case 'pyramid': {
          const baseSize = radius * 1.414
          geo = new THREE.ConeGeometry(baseSize, height, 4)
          geo.rotateY(Math.PI / 4)
          break
        }
        case 'mesh':
        case 'custom_mesh':
          geo = createCustomMeshGeometry(obj.vertices || [], obj.faces)
          break
        case 'wedge':
        case 'prism':
        case 'roof':
          geo = createPrismGeometry(size[0], size[1], size[2])
          break
        case 'plane':
          geo = new THREE.PlaneGeometry(size[0], size[2] || size[1])
          geo.rotateX(-Math.PI / 2)
          break
        case 'torus':
          geo = new THREE.TorusGeometry(radius, obj.tube ?? 0.25, 16, radialSegments)
          break
        case 'ring':
          geo = new THREE.RingGeometry(radius * 0.6, radius, radialSegments)
          geo.rotateX(-Math.PI / 2)
          break
        case 'capsule':
          geo = new THREE.CapsuleGeometry(radius, height, 8, 16)
          break
        case 'group':
        default:
          geo = obj.vertices && obj.vertices.length > 0 ? createCustomMeshGeometry(obj.vertices, obj.faces) : new THREE.BoxGeometry(0.01, 0.01, 0.01)
          break
      }

      const mat = new THREE.MeshStandardMaterial({
        color: obj.color ? new THREE.Color(obj.color) : activeColor.primary,
        roughness: obj.roughness ?? 0.45,
        metalness: obj.metalness ?? 0.15,
        wireframe: wireframeRef.current,
        transparent: Boolean(obj.transparent || (obj.opacity !== undefined && obj.opacity < 1)),
        opacity: obj.opacity ?? 1,
        emissive: obj.emissive ? new THREE.Color(obj.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: obj.emissiveIntensity ?? 0.4,
      })

      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = true
      mesh.receiveShadow = true

      if (obj.position) {
        mesh.position.set(obj.position[0], obj.position[1], obj.position[2])
      }

      if (obj.rotation) {
        const rx = Math.abs(obj.rotation[0]) > 6.28 ? (obj.rotation[0] * Math.PI) / 180 : obj.rotation[0]
        const ry = Math.abs(obj.rotation[1]) > 6.28 ? (obj.rotation[1] * Math.PI) / 180 : obj.rotation[1]
        const rz = Math.abs(obj.rotation[2]) > 6.28 ? (obj.rotation[2] * Math.PI) / 180 : obj.rotation[2]
        mesh.rotation.set(rx, ry, rz)
      }

      if (obj.scale) {
        if (typeof obj.scale === 'number') {
          mesh.scale.set(obj.scale, obj.scale, obj.scale)
        } else {
          mesh.scale.set(obj.scale[0], obj.scale[1], obj.scale[2])
        }
      }

      mesh.userData = {
        name: obj.name || obj.type || 'Object',
        type: obj.type || 'box',
        position: obj.position || [0, 0, 0],
        color: obj.color,
      }

      interactiveMeshes.push(mesh)

      if (Array.isArray(obj.children) && obj.children.length > 0) {
        for (const childSpec of obj.children) {
          const childObj = buildObjectMesh(childSpec)
          mesh.add(childObj)
        }
      }

      return mesh
    }

    const hasCustomObjects = Array.isArray(spec.objects) && spec.objects.length > 0

    if (spec.url || spec.modelUrl) {
      const modelUrl = spec.url || spec.modelUrl!
      import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
        const loader = new GLTFLoader()
        loader.load(
          modelUrl,
          (gltf) => {
            gltf.scene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const m = child as THREE.Mesh
                m.castShadow = true
                m.receiveShadow = true
                interactiveMeshes.push(m)
                if (!m.userData?.name) {
                  m.userData = {
                    name: m.name || 'Model Parçası',
                    type: 'gltf-mesh',
                    position: [m.position.x, m.position.y, m.position.z],
                  }
                }
              }
            })
            modelGroup.add(gltf.scene)
            const box = new THREE.Box3().setFromObject(modelGroup)
            const c = box.getCenter(new THREE.Vector3())
            const s = box.getSize(new THREE.Vector3())
            const md = Math.max(s.x, s.y, s.z, 2)
            camera.position.set(c.x + md * 1.3, c.y + md * 0.9, c.z + md * 1.5)
            camera.lookAt(c)
          },
          undefined,
          (err) => {
            console.error('[Model3D] Failed to load GLTF model:', err)
          }
        )
      })
    } else if (hasCustomObjects) {
      for (const objSpec of spec.objects!) {
        const objMesh = buildObjectMesh(objSpec)
        modelGroup.add(objMesh)
      }
    } else {
      const preset = spec.preset || 'polyhedra'
      if (preset === 'dna_helix') {
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
          s1.userData = { name: `DNA Baz Cifti ${i + 1}A`, type: 'sphere', position: [x1, y, z1] }
          modelGroup.add(s1)
          interactiveMeshes.push(s1)

          const s2 = new THREE.Mesh(sphereGeo, sphereMat2)
          s2.position.set(x2, y, z2)
          s2.userData = { name: `DNA Baz Cifti ${i + 1}B`, type: 'sphere', position: [x2, y, z2] }
          modelGroup.add(s2)
          interactiveMeshes.push(s2)

          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x1, y, z1),
            new THREE.Vector3(x2, y, z2),
          ])
          const rungLine = new THREE.Line(lineGeo, lineMaterial)
          modelGroup.add(rungLine)
        }
      } else if (preset === 'orbital_system') {
        const sunGeo = new THREE.SphereGeometry(0.8, 32, 32)
        const sunMat = new THREE.MeshStandardMaterial({ color: activeColor.primary, roughness: 0.2, emissive: activeColor.glow, emissiveIntensity: 0.4 })
        const sun = new THREE.Mesh(sunGeo, sunMat)
        sun.userData = { name: 'Merkezi Yildiz', type: 'sphere', position: [0, 0, 0] }
        modelGroup.add(sun)
        interactiveMeshes.push(sun)

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
          sat.userData = { name: `Yorunge Gezegeni ${idx + 1}`, type: 'sphere', position: [r, 0, 0] }
          modelGroup.add(sat)
          interactiveMeshes.push(sat)
        })
      } else {
        const outerGeo = new THREE.IcosahedronGeometry(2.2, 0)
        const outerMat = new THREE.MeshStandardMaterial({
          color: activeColor.primary,
          wireframe: wireframeRef.current,
          transparent: true,
          opacity: 0.85,
          roughness: 0.2,
          metalness: 0.8,
        })
        const outerMesh = new THREE.Mesh(outerGeo, outerMat)
        outerMesh.userData = { name: 'Dis Ikosahedron', type: 'polyhedra', position: [0, 0, 0] }
        modelGroup.add(outerMesh)
        interactiveMeshes.push(outerMesh)

        const innerGeo = new THREE.OctahedronGeometry(1.2, 0)
        const innerMat = new THREE.MeshStandardMaterial({
          color: activeColor.secondary,
          wireframe: false,
          roughness: 0.1,
          metalness: 0.9,
        })
        const innerMesh = new THREE.Mesh(innerGeo, innerMat)
        innerMesh.userData = { name: 'Ic Oktahedron', type: 'polyhedra', position: [0, 0, 0] }
        modelGroup.add(innerMesh)
        interactiveMeshes.push(innerMesh)
      }
    }

    // Camera Auto-Framing
    const boundingBox = new THREE.Box3().setFromObject(modelGroup)
    const center = boundingBox.getCenter(new THREE.Vector3())
    const size = boundingBox.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 2)

    const defaultCamPos = spec.camera?.position
      ? new THREE.Vector3(...spec.camera.position)
      : new THREE.Vector3(center.x + maxDim * 1.3, center.y + maxDim * 0.9, center.z + maxDim * 1.5)

    const defaultCamTarget = spec.camera?.target
      ? new THREE.Vector3(...spec.camera.target)
      : center

    camera.position.copy(defaultCamPos)
    camera.lookAt(defaultCamTarget)

    resetCameraRef.current = (view = 'default') => {
      modelGroup.rotation.set(0, 0, 0)
      if (view === 'isometric') {
        camera.position.set(center.x + maxDim * 1.4, center.y + maxDim * 1.4, center.z + maxDim * 1.4)
      } else if (view === 'front') {
        camera.position.set(center.x, center.y + maxDim * 0.2, center.z + maxDim * 2)
      } else if (view === 'top') {
        camera.position.set(center.x, center.y + maxDim * 2.5, center.z + 0.001)
      } else {
        camera.position.copy(defaultCamPos)
      }
      camera.lookAt(defaultCamTarget)
    }

    // Interactive Drag & Orbit Controls
    let isDragging = false
    let isPanning = false
    let prevMouseX = 0
    let prevMouseY = 0
    let rotationVelocityX = 0
    let rotationVelocityY = 0

    // Raycaster for Hover / Click Inspector
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-999, -999)

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2 || e.shiftKey) {
        isPanning = true
      } else {
        isDragging = true
      }
      prevMouseX = e.clientX
      prevMouseY = e.clientY
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      if (isDragging) {
        const dx = e.clientX - prevMouseX
        const dy = e.clientY - prevMouseY
        rotationVelocityY = dx * 0.006
        rotationVelocityX = dy * 0.006
        modelGroup.rotation.y += rotationVelocityY
        modelGroup.rotation.x += rotationVelocityX
      } else if (isPanning) {
        const dx = (e.clientX - prevMouseX) * 0.02
        const dy = (e.clientY - prevMouseY) * 0.02
        camera.position.x -= dx
        camera.position.y += dy
      }

      prevMouseX = e.clientX
      prevMouseY = e.clientY

      // Raycast hover detection
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(interactiveMeshes, false)
      if (intersects.length > 0 && intersects[0].object.userData?.name) {
        const hit = intersects[0].object.userData
        setHoveredObject({
          name: hit.name,
          type: hit.type,
          position: hit.position,
        })
      } else {
        setHoveredObject(null)
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging && !isPanning) {
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(interactiveMeshes, false)
        if (intersects.length > 0 && intersects[0].object.userData?.name) {
          const hit = intersects[0].object.userData
          setSelectedObject({
            name: hit.name,
            type: hit.type,
            position: hit.position,
            color: hit.color,
          })
        }
      }
      isDragging = false
      isPanning = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomFactor = e.deltaY * 0.004
      const dir = camera.position.clone().sub(defaultCamTarget).normalize()
      const dist = camera.position.distanceTo(defaultCamTarget)
      const newDist = Math.max(1, Math.min(100, dist + zoomFactor * dist))
      camera.position.copy(defaultCamTarget.clone().add(dir.multiplyScalar(newDist)))
    }

    const onContextMenu = (e: MouseEvent) => e.preventDefault()

    const dom = renderer.domElement
    dom.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('wheel', onWheel, { passive: false })
    dom.addEventListener('contextmenu', onContextMenu)

    // Animation Loop
    let animId = 0
    const animate = () => {
      animId = requestAnimationFrame(animate)

      if (!isDragging && !isPanning) {
        if (isRotatingRef.current) {
          modelGroup.rotation.y += 0.005
        } else {
          rotationVelocityX *= 0.92
          rotationVelocityY *= 0.92
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
      dom.removeEventListener('contextmenu', onContextMenu)
      if (dom.parentElement) {
        dom.parentElement.removeChild(dom)
      }
      renderer.dispose()
    }
  }, [spec, activeColor, showGrid])

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 select-none font-sans">
      {/* Top Floating Glass Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2.5 rounded-lg border border-white/10 bg-zinc-900/85 px-3 py-1.5 backdrop-blur-md shadow-lg">
        <Sparkles className="h-4 w-4 text-sky-400" />
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-white">{spec.title || '3D Scene & Object Viewport'}</span>
          {spec.description && <span className="text-[10px] text-zinc-400 line-clamp-1 max-w-sm">{spec.description}</span>}
        </div>
        <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 uppercase">
          {spec.objects && spec.objects.length > 0 ? `${spec.objects.length} Parça` : (spec.preset || '3D')}
        </span>
      </div>

      {/* Control Actions (Top Right) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/85 p-1 backdrop-blur-md shadow-lg">
        <button
          type="button"
          onClick={() => setIsRotating((prev) => !prev)}
          title={isRotating ? 'Döndürmeyi Durdur' : 'Otomatik Döndür'}
          className="flex size-7 items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
        >
          {isRotating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => setWireframe((prev) => !prev)}
          title="Tel Çerçeve / Dolu Mod"
          className={`flex size-7 items-center justify-center rounded cursor-pointer transition-colors ${
            wireframe ? 'text-amber-400 bg-amber-400/15' : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Box className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setShowGrid((prev) => !prev)}
          title="Zemin Izgarası (Grid)"
          className={`flex size-7 items-center justify-center rounded cursor-pointer transition-colors ${
            showGrid ? 'text-sky-400 bg-sky-400/15' : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Grid className="h-3.5 w-3.5" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-0.5" />

        <button
          type="button"
          onClick={() => resetCameraRef.current?.('isometric')}
          title="İzometrik Görünüm"
          className="flex size-7 items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors text-[10px] font-mono font-bold"
        >
          ISO
        </button>
        <button
          type="button"
          onClick={() => resetCameraRef.current?.('front')}
          title="Ön Görünüm"
          className="flex size-7 items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors text-[10px] font-mono font-bold"
        >
          ÖN
        </button>
        <button
          type="button"
          onClick={() => resetCameraRef.current?.('top')}
          title="Üst Görünüm"
          className="flex size-7 items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors text-[10px] font-mono font-bold"
        >
          ÜST
        </button>
        <button
          type="button"
          onClick={() => resetCameraRef.current?.('default')}
          title="Kamerayı Sıfırla"
          className="flex size-7 items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Hover Tooltip / Interactive Inspector */}
      {hoveredObject && (
        <div className="absolute top-14 left-3 z-10 flex items-center gap-2 rounded-md border border-sky-500/30 bg-zinc-900/90 px-2.5 py-1 text-xs text-white backdrop-blur-md shadow-md animate-in fade-in duration-150 pointer-events-none">
          <Compass className="h-3.5 w-3.5 text-sky-400 shrink-0" />
          <span className="font-semibold text-sky-300">{hoveredObject.name}</span>
          <span className="text-[10px] text-zinc-400 font-mono">({hoveredObject.type})</span>
          <span className="text-[10px] text-zinc-500 font-mono">
            [{hoveredObject.position.map((v) => Number(v.toFixed(1))).join(', ')}]
          </span>
        </div>
      )}

      {/* Selected Object Card */}
      {selectedObject && (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-3 rounded-lg border border-sky-500/30 bg-zinc-900/90 px-3 py-2 text-xs text-white backdrop-blur-md shadow-xl">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sky-400">{selectedObject.name}</span>
              {selectedObject.color && (
                <span
                  className="size-2.5 rounded-full border border-white/20"
                  style={{ backgroundColor: selectedObject.color }}
                />
              )}
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              Geometri: {selectedObject.type} | Konum: [{selectedObject.position.join(', ')}]
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedObject(null)}
            className="text-zinc-400 hover:text-white text-[11px] px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bottom Navigation Hints */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 text-[11px] text-zinc-400 bg-zinc-900/75 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/10 pointer-events-none">
        <Eye className="h-3 w-3 text-zinc-400" />
        <span>Sol tıkla döndür, tekerlekle yaklaş, sağ tıkla kaydır. Nesnelerin üzerine gelerek incele.</span>
      </div>

      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="h-full w-full cursor-grab active:cursor-grabbing" />
    </div>
  )
}
