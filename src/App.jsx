/**
 * diamond-r3f / src / App.jsx
 *
 * Upgrade: replaces `meshPhysicalMaterial` on gem meshes with the
 * DiamondIllusionEngine 2-pass illusion shader for ~80–85% realism.
 *
 * Key wiring:
 *   – useFrame(priority=1)  → engine.update() before default R3F render
 *   – PMREMGenerator        → converts the Environment HDR to a cube map
 *                             the engine can sample with textureCube()
 *   – Leva sliders          → engine setters (live, zero-rebuild)
 *   – Metal meshes          → unchanged (still meshPhysicalMaterial)
 *   – Bloom / R3F pipeline  → unchanged
 */

import { useRef, Suspense, useState, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useLoader, useThree, useFrame } from '@react-three/fiber'
import {
    useGLTF,
    Environment,
    OrbitControls,
    ContactShadows,
    Center,
    Html,
    MeshReflectorMaterial,
} from '@react-three/drei'
import { EffectComposer, Bloom, Outline, Selection, Select, Vignette, Noise } from '@react-three/postprocessing'
import { Leva, useControls } from 'leva'
import * as THREE from 'three'
import { MeshBVH, MeshBVHUniformStruct, SAH } from 'three-mesh-bvh'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RGBELoader } from 'three-stdlib'
import { DiamondBundle } from './DiamondBundle.jsx'
import { Dashboard } from './Dashboard.jsx'
import { RightPanel } from './RightPanel.jsx'
import { TopBar } from './TopBar.jsx'
import { GEM_PRESETS, METAL_PRESETS, ENV_PRESETS, SCENE_PRESETS, METAL_COLORS, GEM_COLORS } from './presets.js'
import { LandingPage, LoadingScreen } from './LandingPage.jsx'
import './dashboard.css'

// ─────────────────────────────────────────────────────────────────────────────
// Colour palettes
// ─────────────────────────────────────────────────────────────────────────────
// Metal colors — matching WebGI reference (#e0e0e0 white gold is the WebGI default)

// ─────────────────────────────────────────────────────────────────────────────
// ExposureController
// 
// What it does: Reactively updates the scene's WebGL tone mapping exposure.
// Why it exists: React-Three-Fiber's <Canvas> manages exposure at boot, but 
// changing it live via a UI slider requires injecting into the raw `gl` context.
// ─────────────────────────────────────────────────────────────────────────────
function ExposureController({ exposure }) {
    const { gl } = useThree()
    useEffect(() => {
        gl.toneMappingExposure = exposure
    }, [exposure, gl])
    return null
}

function CameraResponsiveAdapter() {
    const { camera, size } = useThree()
    useEffect(() => {
        const isMobile = size.width < 768 || size.width < size.height
        if (isMobile) {
            camera.position.set(0, 2.6, 6.8)
            camera.fov = 45
        } else {
            camera.position.set(0, 2.5, 5)
            camera.fov = 40
        }
        camera.updateProjectionMatrix()
    }, [camera, size.width, size.height])
    return null
}

// ─────────────────────────────────────────────────────────────────────────────
// getStudioStripTexture
//
// What it does: Programmatically generates a 1024x512 HDR-like texture in memory.
// This texture features bright white strips specifically designed to reflect 
// onto the diamond facets, creating a "clean studio" sparkle effect without 
// needing an external image file. It forces the table (top flat face of diamond) 
// to catch bright light, making it look much more realistic.
// ─────────────────────────────────────────────────────────────────────────────
let cachedStudioStrip = null;
function getStudioStripTexture() {
    if (cachedStudioStrip) return cachedStudioStrip;
    const width = 1024, height = 512;
    const data = new Float32Array(width * height * 4);

    for (let y = 0; y < height; y++) {
        const v = y / height; // 0=bottom, 1=top
        for (let x = 0; x < width; x++) {
            const u = x / width;

            // BACKGROUND: Soft neutral grey for clean internal bounce
            let r = 0.4, g = 0.4, b = 0.4;

            // BOTTOM: Light grey (NOT black) — keeps crown alive
            if (v < 0.35) {
                r = 0.3; g = 0.3; b = 0.3;
            }
            // TOP: Large bright white strip — main table reflection source
            else if (v > 0.75) {
                if (u > 0.15 && u < 0.85) {
                    const stripU = (u - 0.15) / 0.7;
                    const fade = Math.sin(Math.PI * stripU);
                    const brightness = 6.0 * fade;
                    r = brightness; g = brightness; b = brightness;
                } else {
                    r = 0.6; g = 0.6; b = 0.6;
                }
            }
            // SIDES: Medium white strips
            else if (v > 0.35 && v < 0.75) {
                // Left strip
                if (u > 0.08 && u < 0.22) {
                    const fade = Math.sin(Math.PI * (u - 0.08) / 0.14);
                    r = 3.0 * fade; g = 3.0 * fade; b = 3.0 * fade;
                }
                // Right strip
                else if (u > 0.78 && u < 0.92) {
                    const fade = Math.sin(Math.PI * (u - 0.78) / 0.14);
                    r = 3.0 * fade; g = 3.0 * fade; b = 3.0 * fade;
                }
            }

            const i = (y * width + x) * 4;
            data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 1.0;
        }
    }

    cachedStudioStrip = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
    cachedStudioStrip.mapping = THREE.EquirectangularReflectionMapping;
    cachedStudioStrip.needsUpdate = true;
    return cachedStudioStrip;
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomStudioStrip
// 
// What it does: Takes the raw image map from `getStudioStripTexture()`, 
// passes it through WebGL's PMREM Generator (making the lighting physically 
// accurate for reflections), and mounts it to the 3D scene backdrop.
// ─────────────────────────────────────────────────────────────────────────────
function CustomStudioStrip() {
    const { scene, gl } = useThree();
    useEffect(() => {
        const tex = getStudioStripTexture();
        const pmrem = new THREE.PMREMGenerator(gl);
        pmrem.compileEquirectangularShader();
        const pTexture = pmrem.fromEquirectangular(tex).texture;

        const old = scene.environment;
        scene.environment = pTexture;
        return () => {
            scene.environment = old;
            pTexture.dispose();
            pmrem.dispose();
        };
    }, [scene, gl]);
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// IllusionDiamondScene
// Loads the GLB, separates gem/metal meshes, registers gems with the engine.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: DiamondGem
// 
// What it does: 
// Wraps a single gemstone mesh with the custom `DiamondBundle` shader.
// 
// Interaction Logic:
// Allows individual gems to be clicked. When clicked, it tells the Dashboard 
// exactly which gem ID is selected, allowing the user to color diamonds individually 
// (e.g. 1 ruby, 1 emerald, 1 white diamond).
// ─────────────────────────────────────────────────────────────────────────────
function DiamondGem({ node, geo, uniform, hdrTexture, advanced, gemColorParams, selectedGem, setSelectedGem, setSelectedElement, meshConfig }) {
    const { scene } = useThree()
    const isSelected = selectedGem === node.uuid
    const activeEnvMap = hdrTexture ?? scene.environment

    const config = meshConfig[node.uuid] || {}
    const gemColor = config.color || gemColorParams.hex
    const gemIor = config.ior || gemColorParams.ior

    return (
        <group
            onClick={e => {
                e.stopPropagation();
                // toggle selection: click once to select, click again to deselect
                if (selectedGem === node.uuid) {
                    setSelectedGem(null);
                    setSelectedElement(null);
                } else {
                    setSelectedGem(node.uuid);
                    setSelectedElement('gem');
                }
            }}
            onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={e => { document.body.style.cursor = 'default'; }}
        >
            <Select enabled={isSelected}>
                <mesh
                    geometry={geo}
                    position={node.position}
                    rotation={node.rotation}
                    scale={node.scale}
                >
                    <DiamondBundle
                        envMap={activeEnvMap}
                        bvh={uniform}
                        bounces={advanced.bounces}
                        ior={gemIor}
                        color={gemColor}
                        fastChroma={advanced.fastChroma}
                        aberrationStrength={advanced.aberrationStrength}
                        envIntensity={advanced.sparkleBoost}
                        colorSaturation={advanced.colorSaturation}
                        colorRichness={advanced.colorRichness}
                        crownStrength={advanced.crownStrength}
                    />
                </mesh>
            </Select>
        </group>
    )
}



/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPONENT: IllusionDiamondScene
 * 
 * What it does (The Core Pipeline):
 * 1. Geometry Loading: Ingests the 3D `.glb` model.
 * 2. Sorting: Loops over every piece of the 3D model. If a material looks like 
 *    glass/gem based on its name or high transmission, it gets pushed into the 
 *    `gemNodes` array. Otherwise, it sits in `metalNodes`.
 * 3. Physics Setup: Takes all `gemNodes` and generates a Bounding Volume 
 *    Hierarchy (BVH) over them. This is the secret sauce that makes raytracing 
 *    fast enough for real-time web browsers.
 * 4. Rendering: Mounts the metal and gems onto the screen.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function IllusionDiamondScene({
    model, customModelUrl, metalColor, globalGemColor,
    selectedGem, setSelectedGem, advanced, envMap, selectedElement, setSelectedElement, meshConfig
}) {
    // If a custom object URL is provided from drag-and-drop, use that instead of the built-in model
    const { nodes } = useGLTF(customModelUrl || ('/' + model))
    const { gl, scene, camera, size } = useThree()

    // ── High-Fidelity Studio Environment for Diamond Reflections ──────────
    // We bind the provided bright PMREM envMap to the scene environment natively
    // so no dark sunset textures corrupt the diamond prism calculations.
    useEffect(() => {
        if (envMap) {
            scene.environment = envMap
            // DO NOT set scene.background to envMap so the background stays pure white
        }
    }, [envMap, scene])

    // ── Categorise meshes ─────────────────────────────────────────────────
    const { gemNodes, metalNodes } = useMemo(() => {
        const gems = []
        const metals = []
        Object.values(nodes).forEach(node => {
            if (!node.isMesh) return
            const mats = Array.isArray(node.material) ? node.material : [node.material]
            const isGem = mats.some(m => {
                const n = (m?.name || '').toLowerCase()
                return n.includes('gem') || n.includes('stone') || n.includes('diamond') ||
                    n.includes('marquise') || n.includes('round') || n.includes('crystal') ||
                    (m?.transmission > 0.5)
            })
            if (isGem) gems.push(node)
            else metals.push(node)
        })
        return { gemNodes: gems, metalNodes: metals }
    }, [nodes])

    // ── Flatten geometries (NON-INDEXED only — no computeVertexNormals) ─────
    // Phase 1: Hard normals are computed by engine.register() via cross-product.
    // ── Generate BVH for each unique geometry ─────────────────────────────
    const gemData = useMemo(() => {
        return gemNodes.map(node => {
            const geo = node.geometry.clone()

            // For the custom BVH shader, we need to generate the BVH on the geometry
            const bvh = new MeshBVH(geo, { strategy: SAH, maxLeafSize: 1 })
            geo.boundsTree = bvh

            const uniform = new MeshBVHUniformStruct()
            uniform.updateFrom(bvh)

            return { geo, uniform }
        })
    }, [gemNodes])

    const gemColorParams = useMemo(() => {
        return GEM_COLORS.find(c => c.hex === globalGemColor) ?? GEM_COLORS[0]
    }, [globalGemColor])

    // ── Metal material ─────────────────────────────────────────────────────
    const goldMat = (
        <meshPhysicalMaterial
            color={metalColor}
            metalness={advanced.metalness}
            roughness={advanced.metalRoughness}
            // Boosted for visible reflections from studio HDR
            envMapIntensity={2.0}
            clearcoat={advanced.clearcoat}
            clearcoatRoughness={0.05}
        />
    )

    return (
        <group>
            <Center position={[0, 1.285, 0]}>
                {/* Metal band */}
                {metalNodes.map(node => (
                    <group
                        key={node.uuid}
                        onClick={e => { e.stopPropagation(); setSelectedElement(prev => prev === 'metal' ? null : 'metal'); }}
                        onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
                        onPointerOut={e => { document.body.style.cursor = 'default'; }}
                    >
                        <Select enabled={selectedElement === 'metal'}>
                            <mesh
                                geometry={node.geometry}
                                position={node.position}
                                rotation={node.rotation}
                                scale={node.scale}
                                receiveShadow
                            >
                                <meshPhysicalMaterial
                                    color={meshConfig[node.uuid]?.color || metalColor}
                                    metalness={advanced.metalness}
                                    roughness={advanced.metalRoughness}
                                    envMapIntensity={2.0}
                                    clearcoat={advanced.clearcoat}
                                    clearcoatRoughness={0.05}
                                />
                            </mesh>
                        </Select>
                    </group>
                ))}

                {/* Diamond gems — rendered with DiamondBVHMaterial */}
                {gemNodes.map((node, i) => {
                    const { geo, uniform } = gemData[i]
                    return (
                        <DiamondGem
                            key={node.uuid}
                            node={node}
                            geo={geo}
                            uniform={uniform}
                            hdrTexture={envMap}
                            advanced={advanced}
                            gemColorParams={gemColorParams}
                            globalGemColor={globalGemColor}
                            size={size}
                            selectedGem={selectedGem}
                            setSelectedGem={setSelectedGem}
                            setSelectedElement={setSelectedElement}
                            meshConfig={meshConfig}
                        />
                    )
                })}
            </Center>

            {/* ── Soft Matte Drop Shadow perfectly grounded on the floor (Y = 0.01) ── */}
            <ContactShadows
                position={[0, 0.01, 0]}
                scale={6}
                resolution={1024}
                far={1.5}
                blur={1.8}
                opacity={0.65}
                color="#000000"
            />
        </group>
    )
}

// ── Real studio HDR maps (same files as in webgi-render/public/assets/environments) ──
const STUDIO_HDRS = {
    'Studio 16': '/hdri/studio016.hdr',
    'Studio 17': '/hdri/studio017.hdr',
    'Studio 18': '/hdri/studio018.hdr',
    'Studio 19': '/hdri/studio019.hdr',
    'Studio 20': '/hdri/studio020.hdr',
    'Studio 21': '/hdri/studio021.hdr',
    'Studio 22': '/hdri/studio022.hdr',
    'Studio 23': '/hdri/studio023.hdr',
    'Studio 24': '/hdri/studio024.hdr',
}

// How much PMREM blurring per quality mode
// Low blur = crisp reflections; high blur = smooth/diffuse look
const MODE_BLUR = { LOW: 0.1, MEDIUM: 0.015, ULTRA: 0.005 }

/**
 * EnvMapCatcher 
 * 
 * What it does: Watches the main scene for updates to the HDRI background.
 * When Drei's async <Environment> module finishes loading a new preset, 
 * this hook grabs the resulting texture map and forwards it into the raw 
 * diamond shaders so they can accurately reflect the new studio lighting.
 */
function EnvMapCatcher({ onEnvMap }) {
    const scene = useThree(s => s.scene)
    const [lastEnv, setLastEnv] = useState(null)

    useFrame(() => {
        if (scene.environment && scene.environment !== lastEnv) {
            setLastEnv(scene.environment)
            onEnvMap(scene.environment)
        }
    })
    return null
}

/** 
 * Fallback neutral studio
 * 
 * What it does: Builds a literal 3D room acting as lights. 
 * Only gets used if external HDRI texture downloads fail to save the render.
 */
function buildFallbackEnv() {
    const env = new THREE.Scene()
    const grey = (v) => new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), side: THREE.DoubleSide })
    const hdrMat = (s) => { const m = grey(1); m.color.multiplyScalar(s); return m }
    const black = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0), side: THREE.DoubleSide })
    const add = (g, mat, pos, rotX) => {
        const m = new THREE.Mesh(g, mat);
        m.position.set(...pos);
        if (rotX !== undefined) m.rotation.x = rotX;
        env.add(m)
    }
    add(new THREE.SphereGeometry(30, 32, 16), grey(0.9), [0, 0, 0])
    add(new THREE.PlaneGeometry(14, 14), hdrMat(5.0), [2, 14, -3])
    add(new THREE.PlaneGeometry(2.5, 2.5), hdrMat(10.0), [0, 13, 0], Math.PI / 2)
    add(new THREE.CylinderGeometry(22, 22, 3, 64, 1, true), black, [0, -1, 0])
    add(new THREE.PlaneGeometry(60, 60), grey(0.88), [0, -10, 0], -Math.PI / 2)
    return env
}



// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: SceneEnvironment
// 
// What it does: Renders the physical stage underneath the ring (e.g. infinite 
// mirror, pedestal, pure black stage). Highly dependent on `MeshReflectorMaterial` 
// to create those extremely premium floor reflections.
// ─────────────────────────────────────────────────────────────────────────────
function SceneEnvironment({ preset }) {
    const { scene } = useThree()
    let bgObj = null;
    let fogObj = null;

    useEffect(() => {
        if (!preset) return
        if (preset.bgType === 'color') {
            scene.background = new THREE.Color(preset.bgColor)
        } else if (preset.bgType === 'gradient' || preset.bgType === 'radial') {
            scene.background = new THREE.Color(preset.bgColors[0])
        }
    }, [preset, scene])

    if (!preset) return null;

    // 1. Background & Horizon Blend (Fog) - Extended from [1, 10] to [10, 30]
    // This keeps the ring crisp when zoomed out, while smoothly fading out the 100x100 floor plane in the distance
    if (preset.bgType === 'color') {
        fogObj = <fog attach="fog" args={[preset.bgColor, 10, 30]} />;
    } else if (preset.bgType === 'gradient' || preset.bgType === 'radial') {
        fogObj = <fog attach="fog" args={[preset.bgColors[0], 10, 30]} />;
    }

    // 2. Physical Stage Ground
    let groundObj = null;
    // Align all ground planes/pedestal tops to Y = 0 (exactly where the bottom of the ring rests)
    if (preset.stage === 'soft-base') {
        groundObj = (
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[100, 100]} />
                <MeshReflectorMaterial
                    blur={[10, 10]} // Sharp reflection
                    resolution={1024}
                    mixBlur={0.05}
                    mixStrength={80} // High reflection mix
                    roughness={0.005} // Almost zero roughness for mirror reflection
                    depthScale={1.2}
                    minDepthThreshold={0.4}
                    maxDepthThreshold={1.4}
                    color="#111111" // Lighter dark to show mirror reflection nicely
                    metalness={0.9} // High metalness mirror
                />
            </mesh>
        )
    } else if (preset.stage === 'cube-pedestal') {
        groundObj = (
            <group position={[0, -1.0, 0]}>
                {/* Pedestal Box */}
                <mesh receiveShadow position={[0, 0, 0]}>
                    <boxGeometry args={[4, 2, 4]} />
                    <meshStandardMaterial color="#0b1324" roughness={0.15} metalness={0.8} />
                </mesh>
                {/* Reflection plane on top of pedestal */}
                <mesh position={[0, 1.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[4, 4]} />
                    <MeshReflectorMaterial
                        blur={[20, 20]}
                        resolution={1024}
                        mixBlur={0.1}
                        mixStrength={75}
                        roughness={0.02}
                        depthScale={1}
                        minDepthThreshold={0.4}
                        maxDepthThreshold={1.4}
                        color="#0a0f1d"
                        metalness={0.85}
                    />
                </mesh>
                {/* Large floor plane at the bottom of the pedestal to avoid floating void when zooming out */}
                <mesh position={[0, -1.0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color="#0b1324" roughness={0.6} metalness={0.2} />
                </mesh>
            </group>
        )
    } else if (preset.stage === 'infinite-plane') {
        groundObj = (
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[100, 100]} />
                <MeshReflectorMaterial
                    blur={[30, 30]}
                    resolution={1024}
                    mixBlur={0.3}
                    mixStrength={20}
                    roughness={0.6}
                    color="#ffffff"
                    metalness={0.05}
                />
            </mesh>
        )
    } else if (preset.stage === 'spotlight-cone') {
        groundObj = (
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[100, 100]} />
                <MeshReflectorMaterial
                    blur={[20, 20]}
                    resolution={1024}
                    mixBlur={0.1}
                    mixStrength={70}
                    roughness={0.04}
                    depthScale={1.2}
                    minDepthThreshold={0.4}
                    maxDepthThreshold={1.4}
                    color="#0c111d"
                    metalness={0.9}
                />
            </mesh>
        )
    }

    // Round white pedestal stage (clean studio with circular base)
    if (preset.stage === 'round-pedestal') {
        groundObj = (
            <group position={[0, 0, 0]}>
                {/* Solid cylinder table of height 0.5 - NO rotation around X axis (keeps it flat) */}
                <mesh position={[0, -0.25, 0]}>
                    <cylinderGeometry args={[3.2, 3.2, 0.5, 64]} />
                    <meshStandardMaterial color="#f1f5f9" roughness={0.18} metalness={0.02} />
                </mesh>
                {/* Reflection plane on top of table */}
                <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[3.2, 64]} />
                    <MeshReflectorMaterial
                        blur={[30, 10]}
                        resolution={1024}
                        mixBlur={0.15}
                        mixStrength={45}
                        roughness={0.12}
                        depthScale={1.2}
                        minDepthThreshold={0.2}
                        maxDepthThreshold={1.2}
                        color="#dcdfe3"
                        metalness={0.0}
                    />
                </mesh>
                {/* Large floor plane at the bottom of the table to avoid floating void when zooming out */}
                <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color={preset.bgColors ? preset.bgColors[0] : '#f1f5f9'} roughness={0.8} metalness={0.0} />
                </mesh>
            </group>
        )
    }

    return (
        <>
            {bgObj}
            {fogObj}
            {groundObj}
        </>
    )
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT: App
 * 
 * What it does: 
 * The root orchestrator. It manages all the high-level React states:
 * - `appState`: Switches between 'landing', 'loading', and 'viewer'.
 * - `advanced`: Stores all the slider values for diamond physics.
 * - `dash_____Preset`: Remembers which UI buttons the user clicked.
 * 
 * It structures the layout into CSS Grid, putting the 3D <Canvas> in the middle,
 * the Dashboard on the left, and managing File drag-and-drop globally.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function App() {
    const [appState, setAppState] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('mode') === 'editor' ? 'viewer' : 'landing';
    }) // 'landing', 'viewer'
    const [showLoader, setShowLoader] = useState(false)
    const [meshConfig, setMeshConfig] = useState({}) // { uuid: { color, gemstone, metal } }
    const [customModelUrl, setCustomModelUrl] = useState(null)
    const [isDragging, setIsDragging] = useState(false)

    const mainColRef = useRef(null)
    const toggleFullScreen = () => {
        if (!mainColRef.current) return
        if (!document.fullscreenElement) {
            mainColRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`)
            })
        } else {
            document.exitFullscreen()
        }
    }

    // Global drag-and-drop handler for 3D models (.glb, .gltf)
    useEffect(() => {
        const handleDragOver = (e) => {
            e.preventDefault()
            setIsDragging(true)
        }
        const handleDragLeave = (e) => {
            e.preventDefault()
            setIsDragging(false)
        }
        const handleDrop = (e) => {
            e.preventDefault()
            setIsDragging(false)

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0]
                const name = file.name.toLowerCase()
                if (name.endsWith('.glb') || name.endsWith('.gltf')) {
                    const url = URL.createObjectURL(file)
                    setCustomModelUrl(url)
                    setAppState('loading')
                } else {
                    alert('Please drop a valid .glb or .gltf 3D model.')
                }
            }
        }

        window.addEventListener('dragover', handleDragOver)
        window.addEventListener('dragleave', handleDragLeave)
        window.addEventListener('drop', handleDrop)

        return () => {
            window.removeEventListener('dragover', handleDragOver)
            window.removeEventListener('dragleave', handleDragLeave)
            window.removeEventListener('drop', handleDrop)
        }
    }, [])

    const [sceneState, setSceneState] = useState({
        model: 'ring.glb',
        hdrMap: 'custom-strip',
        sceneEnvIntensity: 1.2,
        lightingMode: 'MEDIUM',
        autoRotate: false,
    })

    const [lighting, setLighting] = useState({
        lightPosX: 3.0,
        lightPosY: 8.0,
        lightPosZ: 4.0,
        lightIntensity: 1.0,
        ambientIntensity: 0.3,
    })

    // ── Diamond illusion tuning
    const [advanced, setAdvanced] = useState({
        ior: 2.417,
        dispersion: 0.1,
        bounces: 5,
        energyDecay: 0.8,
        fresnelF0: 1.0,
        sparkleBoost: 1.2,
        aberrationStrength: 0.015,
        fastChroma: false,
        exposure: 1.2,
        absorption: 0.005,
        colorSaturation: 0.65,
        colorRichness: 1.8,
        crownStrength: 0.4,
    })

    // ── Metal / ring tuning ───────────────────────────────────────────────
    const [metalControls, setMetalControls] = useState({
        metalness: 1.0,
        metalRoughness: 0.02,
        clearcoat: 0.0,
    })

    // ── Post Processing ───────────────────────────────────────────────────
    const [pp, setPp] = useState({
        bloomThreshold: 1.2,
        bloomIntensity: 0.5,
        bloomRadius: 0.65,
    })

    const advancedFull = { ...advanced, ...metalControls }

    const isDark = sceneState.theme === 'Dark Studio'

    const [metalColor, setMetalColor] = useState(METAL_COLORS[0].hex)
    const [globalGemColor, setGlobalGemColor] = useState(GEM_COLORS[0].hex)
    const [selectedGem, setSelectedGem] = useState(null)
    const [envMap, setEnvMap] = useState(null)  // PMREM cube map

    // ── Inspection / Selection State ───────────────────────────────────────
    const [selectedElement, setSelectedElement] = useState('gem') // Default to 'gem' for now to show off the panel

    // ── Dashboard preset state ─────────────────────────────────────────────
    const [dashScenePreset, setDashScenePreset] = useState(SCENE_PRESETS[0])
    const [dashGemPreset, setDashGemPreset] = useState(GEM_PRESETS[0])
    const [dashMetalPreset, setDashMetalPreset] = useState(METAL_PRESETS[0])
    const [dashEnvPreset, setDashEnvPreset] = useState(ENV_PRESETS[0])
    const [dashCollapsed, setDashCollapsed] = useState(false)
    const [toast, setToast] = useState(null)

    const showToast = useCallback((msg) => {
        setToast(msg)
        setTimeout(() => setToast(null), 1900)
    }, [])

    // Apply a scene preset 
    const applyScenePreset = useCallback((p) => {
        setDashScenePreset(p)
        showToast(`${p.name} applied`)
    }, [showToast])

    // Apply a gem preset — updates Leva diamond illusion values + gem color
    const applyGemPreset = useCallback((p) => {
        setDashGemPreset(p)
        if (selectedGem) {
            // Update individual gem
            setMeshConfig(prev => ({
                ...prev,
                [selectedGem]: { ...prev[selectedGem], color: p.color, ior: p.ior }
            }))
        } else {
            setGlobalGemColor(p.color)
        }
        setAdvanced(prev => ({
            ...prev,
            sparkleBoost: p.sparkleBoost,
            aberrationStrength: p.aberration,
            colorSaturation: p.colorSat,
            colorRichness: p.colorRich,
            crownStrength: p.crownStrength,
            ior: p.ior,
            bounces: p.bounces,
        }))
        showToast(`${p.name} applied`)
    }, [selectedGem, showToast])

    // Apply a metal preset — updates Leva metal values + metal color
    const applyMetalPreset = useCallback((p) => {
        setDashMetalPreset(p)
        if (selectedElement === 'metal') {
            // Target all metal nodes if we want, or just global
            setMetalColor(p.hex)
        } else {
            setMetalColor(p.hex)
        }
        setMetalControls({
            metalness: p.metalness,
            metalRoughness: p.roughness,
            clearcoat: p.clearcoat,
        })
        showToast(`${p.name} applied`)
    }, [selectedElement, showToast])

    // Apply an environment preset
    const applyEnvPreset = useCallback((p) => {
        setDashEnvPreset(p)
        const map = (p.type && p.type.startsWith('procedural')) ? 'custom-strip' : p.hdr
        setSceneState(prev => ({ ...prev, hdrMap: map, sceneEnvIntensity: p.intensity || 1.0 }))
        showToast(`${p.name} lighting applied`)
    }, [setSceneState, showToast])

    const captureScreenshot = useCallback(() => {
        const canvas = document.querySelector('canvas')
        if (!canvas) {
            showToast('Canvas not found — please wait for the scene to load')
            return
        }
        // toBlob + createObjectURL is the correct cross-browser approach.
        // Using toDataURL directly as href causes browsers to generate a
        // UUID filename with no extension instead of the intended .png name.
        requestAnimationFrame(() => {
            try {
                canvas.toBlob((blob) => {
                    if (!blob) {
                        showToast('Export failed — scene may still be loading')
                        return
                    }
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
                    link.download = `aurum_studio_render_${ts}.png`
                    link.href = url
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    // Revoke the object URL after a short delay to free memory
                    setTimeout(() => URL.revokeObjectURL(url), 1500)
                    showToast('Render saved — check your Downloads folder')
                }, 'image/png')
            } catch (err) {
                showToast('Export failed: ' + err.message)
            }
        })
    }, [showToast])

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('mode') === 'editor') {
            const urlMetalColor = params.get('metalColor')
            if (urlMetalColor) setMetalColor(urlMetalColor)

            const urlGemColor = params.get('gemColor')
            if (urlGemColor) setGlobalGemColor(urlGemColor)

            const urlScenePresetId = params.get('scenePresetId')
            if (urlScenePresetId) {
                const found = SCENE_PRESETS.find(p => p.id === urlScenePresetId)
                if (found) applyScenePreset(found)
            }

            const urlGemPresetId = params.get('gemPresetId')
            if (urlGemPresetId) {
                const found = GEM_PRESETS.find(p => p.id === urlGemPresetId)
                if (found) applyGemPreset(found)
            }

            const urlEnvPresetId = params.get('envPresetId')
            if (urlEnvPresetId) {
                const found = ENV_PRESETS.find(p => p.id === urlEnvPresetId)
                if (found) applyEnvPreset(found)
            }

            const urlModel = params.get('model')
            if (urlModel) {
                setSceneState(prev => ({ ...prev, model: urlModel }))
            }
        }
    }, [applyScenePreset, applyGemPreset, applyEnvPreset])

    return (
        <>
            {/* Leva UI config (Hidden manually for presentation) */}
            <Leva hidden={true} />

            {appState === 'landing' && (
                <LandingPage onStart={(config) => {
                    if (config) {
                        if (config.model) setSceneState(prev => ({ ...prev, model: config.model }));
                        if (config.metalColor) setMetalColor(config.metalColor);
                        if (config.gemColor) setGlobalGemColor(config.gemColor);
                        if (config.scenePreset) applyScenePreset(config.scenePreset);
                        if (config.gemPreset) applyGemPreset(config.gemPreset);
                        if (config.envPreset) applyEnvPreset(config.envPreset);
                    }
                    setAppState('viewer')
                    setShowLoader(true)
                }} isDragging={isDragging} />
            )}

            {appState === 'viewer' && (
                <div className="app-layout">
                    {showLoader && (
                        <LoadingScreen onComplete={() => setShowLoader(false)} />
                    )}
                    <TopBar
                        title="AurumStudio 3D Configurator"
                        autoRotate={sceneState.autoRotate}
                        setAutoRotate={(val) => setSceneState(prev => ({ ...prev, autoRotate: val }))}
                        onReset={() => window.location.reload()}
                        onExport={captureScreenshot}
                        onToggleFullScreen={toggleFullScreen}
                    />

                    <div className="app-grid">
                        {/* ── LEFT TOOLBAR (Dashboard) ── */}
                        <div className="app-col-left">
                            <Dashboard
                                activeScenePreset={dashScenePreset}
                                activeGemPreset={dashGemPreset}
                                activeMetalPreset={dashMetalPreset}
                                activeEnvPreset={dashEnvPreset}
                                onScenePreset={applyScenePreset}
                                onGemPreset={applyGemPreset}
                                onMetalPreset={applyMetalPreset}
                                onEnvPreset={applyEnvPreset}
                                currentGemColor={selectedGem ? (meshConfig[selectedGem]?.color || globalGemColor) : globalGemColor}
                                currentMetalColor={metalColor}
                                setMeshConfig={setMeshConfig}
                                selectedGem={selectedGem}
                                selectedElement={selectedElement}
                                setSelectedGem={setSelectedGem}
                                setSelectedElement={setSelectedElement}
                                setGemColor={setGlobalGemColor}
                                setMetalColor={setMetalColor}
                            />
                        </div>

                        {/* ── MAIN CANVAS ── */}
                        <div className="app-col-main" ref={mainColRef}>
                            {toast && (
                                <div className="db-toast">
                                    {toast}
                                </div>
                            )}

                            <Canvas
                                shadows
                                dpr={[1, 1.5]}
                                gl={{
                                    antialias: false,
                                    physicallyCorrectLights: true,
                                    preserveDrawingBuffer: true,
                                    toneMapping: THREE.ACESFilmicToneMapping,
                                    toneMappingExposure: 1.6,
                                    outputColorSpace: THREE.SRGBColorSpace,
                                    alpha: true,
                                }}
                                camera={{ position: [0, 2.5, 5], fov: 40 }}
                                onPointerMissed={() => setSelectedElement('environment')}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '18px',
                                    outline: 'none',
                                    background: 'transparent'
                                }}
                            >
                                <Selection>
                                    <ExposureController exposure={advanced.exposure} />
                                    <CameraResponsiveAdapter />

                                    <ambientLight intensity={lighting.ambientIntensity} />
                                    <directionalLight
                                        position={[lighting.lightPosX, lighting.lightPosY, lighting.lightPosZ]}
                                        intensity={lighting.lightIntensity}
                                        castShadow
                                        shadow-mapSize={[2048, 2048]}
                                        shadow-camera-far={20}
                                        shadow-camera-near={0.1}
                                        shadow-radius={20}
                                        shadow-bias={-0.001}
                                    />
                                    <directionalLight position={[-4, 5, 2]} intensity={0.2} />

                                    <SceneEnvironment preset={dashScenePreset} />

                                    {sceneState.hdrMap === 'custom-strip' ? (
                                        <CustomStudioStrip />
                                    ) : (
                                        <Environment
                                            files={sceneState.hdrMap}
                                            background={false}
                                            intensity={sceneState.sceneEnvIntensity}
                                        />
                                    )}

                                    <EffectComposer multisampling={8} autoClear={false}>
                                        <Outline
                                            blur
                                            edgeColor="#ff7a00"
                                            visibleEdgeColor="#ff7a00"
                                            hiddenEdgeColor="#ff7a00"
                                            edgeStrength={5}
                                            width={1000}
                                            pulseSpeed={0.0} // Solid outline for premium look
                                        />
                                        <Bloom
                                            luminanceThreshold={pp.bloomThreshold}
                                            intensity={pp.bloomIntensity}
                                            radius={pp.bloomRadius}
                                            mipmapBlur
                                        />
                                        <Vignette eskil={false} offset={0.15} darkness={0.4} />
                                        <Noise opacity={0.01} />
                                    </EffectComposer>

                                    <Suspense fallback={null}>
                                        <EnvMapCatcher onEnvMap={setEnvMap} />

                                        <IllusionDiamondScene
                                            model={sceneState.model}
                                            customModelUrl={customModelUrl}
                                            metalColor={metalColor}
                                            globalGemColor={globalGemColor}
                                            selectedGem={selectedGem}
                                            setSelectedGem={setSelectedGem}
                                            selectedElement={selectedElement}
                                            setSelectedElement={setSelectedElement}
                                            meshConfig={meshConfig}
                                            advanced={advancedFull}
                                            envMap={envMap}
                                        />
                                    </Suspense>

                                    <OrbitControls
                                        makeDefault
                                        autoRotate={sceneState.autoRotate}
                                        autoRotateSpeed={1.0}
                                        minPolarAngle={0}
                                        maxPolarAngle={Math.PI / 2 - 0.1}
                                        enablePan={false}
                                        minDistance={3}
                                        maxDistance={12}
                                        target={[0, 1.28, 0]}
                                    />
                                </Selection>
                            </Canvas>

                            <button className="fullscreen-btn" onClick={toggleFullScreen} title="Toggle Fullscreen">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                                </svg>
                            </button>
                        </div>

                        {/* ── RIGHT INSPECTOR ── */}
                        <div className="app-col-right">
                            <RightPanel
                                selectedElement={selectedElement}
                                advanced={advanced} setAdvanced={setAdvanced}
                                metalControls={metalControls} setMetalControls={setMetalControls}
                                pp={pp} setPp={setPp}
                                lighting={lighting} setLighting={setLighting}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

