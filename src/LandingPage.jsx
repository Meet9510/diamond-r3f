/**
 * ============================================================================
 * LandingPage.jsx
 * ============================================================================
 * 
 * FILE PURPOSE:
 * Provides the interactive, modern luxury landing page and the loading screen.
 * 
 * SYSTEM ROLE:
 * Guides the user into the AurumStudio 3D configuration application. Showcases
 * the realistic renders of the Marquise Ring and leverages WebGL raytracing
 * explanations to introduce the technology stack.
 * ============================================================================
 */
import React, { useState, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { GEM_PRESETS, METAL_PRESETS, SCENE_PRESETS, ENV_PRESETS } from './presets.js'
import './landing.css'

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: RotatingGem
// A lightweight 3D element rendering a rotating glassmorphic gem
// ─────────────────────────────────────────────────────────────────────────────
function RotatingGem() {
    const ref = useRef()
    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.y += delta * 0.3
            ref.current.rotation.x += delta * 0.15
        }
    })
    return (
        <mesh ref={ref} scale={2.4}>
            <icosahedronGeometry args={[1, 1]} />
            <meshPhysicalMaterial
                color="#ffffff"
                roughness={0.02}
                metalness={0.0}
                transmission={1.0}
                ior={2.42}
                thickness={2.0}
                clearcoat={1.0}
                clearcoatRoughness={0.0}
            />
        </mesh>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA: Custom Designs for Showroom (No Emojis, No Prices)
// Includes the realistic Gemini Nano Band and Banana Cut Solitaire.
// ─────────────────────────────────────────────────────────────────────────────
const CUSTOM_DESIGNS = [
    {
        id: 1,
        image: '/images/ring-design-1.jpg',
        title: 'The Marquise Solitaire Crown',
        meta: '18K White Gold / Marquise Cut Diamond',
        desc: 'An architectural crown design featuring multi-cluster Marquise cut diamonds mounted on a high-polish White Gold band, showcasing maximum dispersion and light refraction.',
        config: {
            model: 'ring.glb',
            metalColor: '#c8c8c8', // White Gold
            gemColor: '#ffffff', // Diamond
            scenePreset: SCENE_PRESETS[0], // Black Stage
            gemPreset: GEM_PRESETS[0], // Diamond Preset
            envPreset: ENV_PRESETS[0] // Contrast Strips
        }
    },
    {
        id: 2,
        image: '/images/ring-design-2.jpg',
        title: 'Royal Marquise Cluster',
        meta: '18K Platinum / Premium Diamonds',
        desc: 'An alternative overhead angle highlighting the intricate crown structure and facet layouts designed to capture specular reflection maps in real-time.',
        config: {
            model: 'ring.glb',
            metalColor: '#e0e0e0', // Platinum
            gemColor: '#ffffff', // Diamond
            scenePreset: SCENE_PRESETS[0],
            gemPreset: GEM_PRESETS[1], // Pure White Preset
            envPreset: ENV_PRESETS[3] // Warm Luxury Env
        }
    },
    {
        id: 3,
        image: '/images/ring-design-3.jpg',
        title: 'Enchanted Rose & Peridot Band',
        meta: '18K Yellow Gold / Rose Quartz & Peridot',
        desc: 'A nature-inspired masterpiece featuring custom pink tourmaline (rose quartz) petals paired with light green peridot accents, styled on a warm yellow gold setting.',
        config: {
            model: 'ring.glb',
            metalColor: '#ffcc00', // Yellow Gold
            gemColor: '#ff88bb', // Rose Quartz
            scenePreset: SCENE_PRESETS[0],
            gemPreset: GEM_PRESETS[9], // Pink Tourmaline Preset
            envPreset: ENV_PRESETS[3]
        }
    },
    {
        id: 4,
        image: '/images/ring-design-4.jpg',
        title: 'The Marquise Split-Shank Crown',
        meta: '18K Platinum / Premium Diamonds',
        desc: 'A split-shank design featuring an elevated pave band leading up to the iconic marquise fan crown, exhibiting high-fidelity refraction and dispersion.',
        config: {
            model: 'ring.glb',
            metalColor: '#e0e0e0', // Platinum
            gemColor: '#ffffff',
            scenePreset: SCENE_PRESETS[0],
            gemPreset: GEM_PRESETS[0],
            envPreset: ENV_PRESETS[2] // Dark Luxury Drama
        }
    },
    {
        id: 5,
        image: '/images/ring-design-1.jpg', // Re-using custom Ring design image for high quality representation
        title: 'The Gemini Nano Band',
        meta: '18K Rose Gold / Clear Diamonds',
        desc: 'A futuristic split-band ring custom-tuned for next-generation visual styling, displaying warm rose reflections under high-key commercial lighting.',
        config: {
            model: 'ring.glb',
            metalColor: '#d38b7d', // Rose Gold
            gemColor: '#ffffff',
            scenePreset: SCENE_PRESETS[0],
            gemPreset: GEM_PRESETS[1], // Pure White
            envPreset: ENV_PRESETS[1] // Soft Commercial
        }
    },
    {
        id: 6,
        image: '/images/ring-design-3.jpg', // Re-using custom Ring design image for yellow tones representation
        title: 'The Banana Cut Solitaire',
        meta: '18K Platinum / Canary Yellow Diamond',
        desc: 'A custom marquise solitaire design incorporating a canary yellow diamond setting that sparkles with deep fire, mimicking modern organic jewelry trends.',
        config: {
            model: 'ring.glb',
            metalColor: '#e0e0e0', // Platinum
            gemColor: '#ddaa00', // Canary Yellow / Citrine
            scenePreset: SCENE_PRESETS[0],
            gemPreset: GEM_PRESETS[7], // Citrine Preset
            envPreset: ENV_PRESETS[5] // Ultra Sparkle
        }
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: LandingPage
// Renders the rich luxury landing page with multiple interactive sections.
// ─────────────────────────────────────────────────────────────────────────────
export function LandingPage({ isDragging }) {
    const [activeIdx, setActiveIdx] = useState(0);

    // Auto rotate showcase images every 5 seconds unless interacted with
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIdx((prev) => (prev + 1) % CUSTOM_DESIGNS.length);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    const activeDesign = CUSTOM_DESIGNS[activeIdx];

    // Helper: opens the configurator in a new tab with specified parameters
    const openConfigurator = (config) => {
        let url = '?mode=editor';
        if (config) {
            if (config.model) url += `&model=${encodeURIComponent(config.model)}`;
            if (config.metalColor) url += `&metalColor=${encodeURIComponent(config.metalColor)}`;
            if (config.gemColor) url += `&gemColor=${encodeURIComponent(config.gemColor)}`;
            if (config.scenePreset) url += `&scenePresetId=${encodeURIComponent(config.scenePreset.id)}`;
            if (config.gemPreset) url += `&gemPresetId=${encodeURIComponent(config.gemPreset.id)}`;
            if (config.envPreset) url += `&envPresetId=${encodeURIComponent(config.envPreset.id)}`;
        }
        window.open(url, '_blank');
    };

    return (
        <div className={`landing-wrap ${isDragging ? 'landing-wrap--dragging' : ''}`}>
            {/* Concentric ambient background ripples */}
            <div className="ripple ripple-1"></div>
            <div className="ripple ripple-2"></div>
            <div className="ripple ripple-3"></div>
            <div className="ripple ripple-4"></div>
            <div className="ripple ripple-5"></div>

            {/* Glassmorphic Navigation Header with brand logos */}
            <header className="landing-header">
                <a href="#" className="brand-logo">
                    <span className="logo-text">AURUM</span>
                    <span className="logo-tag">STUDIO 3D</span>
                </a>
                <nav className="nav-links">
                    <a href="#hero" className="nav-link">Home</a>
                    <a href="#showroom" className="nav-link">Showroom</a>
                    <a href="#technology" className="nav-link">Technology</a>
                    <a href="#drag-drop" className="nav-link">Upload Model</a>
                </nav>
                <button className="header-cta-btn" onClick={() => openConfigurator(CUSTOM_DESIGNS[0].config)}>
                    Launch Configurator
                </button>
            </header>

            {/* Hero Section */}
            <section id="hero" className="landing-hero">
                <div className="hero-text-content">
                    <div className="hero-badge">
                        <span className="badge-dot"></span>
                        <span className="badge-text">Interactive 3D Showroom</span>
                    </div>
                    <h1 className="hero-title">
                        Sculpted by <span>Light</span>,<br />
                        Crafted for <span>Eternity</span>
                    </h1>
                    <p className="hero-description">
                        Welcome to AurumStudio 3D. Experience the future of fine jewelry design through our physically accurate, real-time 3D customizer. Configure premium metals and gemstones cut with mathematical precision, rendering at 60fps directly in your browser.
                    </p>
                    <div className="hero-actions">
                        <button className="hero-btn-primary" onClick={() => openConfigurator(activeDesign.config)}>
                            Configure This Ring
                        </button>
                        <a href="#showroom" className="hero-btn-secondary">
                            Explore Showroom
                        </a>
                    </div>

                    {/* Drag and Drop Info Pill */}
                    <div className="hero-drag-box">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        <span>{isDragging ? 'Drop file to view' : 'Drag & Drop your own .glb/.gltf model here'}</span>
                    </div>
                </div>

                {/* Hero Showcase: 3D rotating canvas element on top, static image switcher on hover */}
                <div className="hero-image-showcase">
                    {/* 3D Canvas element */}
                    <div className="hero-3d-card">
                        <Canvas camera={{ position: [0, 0, 5], fov: 40 }} style={{ width: '100%', height: '100%' }}>
                            <ambientLight intensity={1.5} />
                            <pointLight position={[10, 10, 10]} intensity={3} />
                            <pointLight position={[-10, -10, -10]} intensity={1} />
                            <RotatingGem />
                        </Canvas>
                        <div className="hero-3d-label">
                            <span>Interactive 3D Preview</span>
                        </div>
                    </div>

                    {/* Floating thumbnails */}
                    <div className="showcase-thumbnails">
                        {CUSTOM_DESIGNS.map((item, idx) => (
                            <button
                                key={item.id}
                                className={`thumb-btn ${idx === activeIdx ? 'active' : ''}`}
                                onClick={() => setActiveIdx(idx)}
                            >
                                <img src={item.image} alt={item.title} />
                            </button>
                        ))}
                    </div>

                    <div className="showcase-overlay" style={{ background: 'linear-gradient(to top, rgba(6, 9, 19, 0.95) 0%, rgba(6, 9, 19, 0.1) 100%)' }}>
                        <span className="showcase-tag">{activeDesign.meta}</span>
                        <h2 className="showcase-title">{activeDesign.title}</h2>
                        <p className="showcase-description">{activeDesign.desc}</p>
                        
                        <div className="showcase-selectors">
                            {CUSTOM_DESIGNS.map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`selector-dot ${idx === activeIdx ? 'active' : ''}`}
                                    onClick={() => setActiveIdx(idx)}
                                    aria-label={`Show design ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Showroom / Collection Grid Section (No prices, No emojis) */}
            <section id="showroom" className="landing-showroom-sec">
                <div className="section-header">
                    <span className="section-subtitle">Exquisite Renders</span>
                    <h2 className="section-title">The Marquise Crown Collection</h2>
                </div>
                <div className="showroom-grid">
                    {CUSTOM_DESIGNS.map((design) => (
                        <div key={design.id} className="showroom-card">
                            <div className="card-img-wrap">
                                <img src={design.image} alt={design.title} className="card-img" />
                            </div>
                            <div className="card-content">
                                <span className="card-meta">{design.meta}</span>
                                <h3 className="card-title">{design.title}</h3>
                                <p className="card-text">{design.desc}</p>
                                <div className="card-actions" style={{ justifyContent: 'flex-end' }}>
                                    <button className="card-btn" onClick={() => openConfigurator(design.config)}>
                                        Customize in 3D
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Technology Info Section (No emojis) */}
            <section id="technology" className="landing-tech-sec">
                <div className="section-header">
                    <span className="section-subtitle">Core Innovation</span>
                    <h2 className="section-title">How the 3D Illusion Engine Works</h2>
                </div>
                <div className="tech-grid">
                    <div className="tech-card">
                        <div className="tech-title" style={{ fontSize: '15px', color: '#c49a45', letterSpacing: '0.05em', marginBottom: '8px' }}>BVH ACCELERATION</div>
                        <h3 className="tech-title">Bounding Volume Hierarchy</h3>
                        <p className="tech-desc">
                            We compile a custom bounding volume hierarchy tree directly over the gemstone geometry. This accelerates ray intersection testing to O(log N), allowing real-time raytracing path lookups in standard web browsers.
                        </p>
                    </div>
                    <div className="tech-card">
                        <div className="tech-title" style={{ fontSize: '15px', color: '#c49a45', letterSpacing: '0.05em', marginBottom: '8px' }}>OPTICAL PHYSICS</div>
                        <h3 className="tech-title">Total Internal Reflection</h3>
                        <p className="tech-desc">
                            Light rays entering the gemstone are bent according to the Index of Refraction (Snell's Law) and bounce internally off the facets up to 10 times until escaping to sample the studio environment maps.
                        </p>
                    </div>
                    <div className="tech-card">
                        <div className="tech-icon" style={{ display: 'none' }}></div>
                        <div className="tech-title" style={{ fontSize: '15px', color: '#c49a45', letterSpacing: '0.05em', marginBottom: '8px' }}>LIGHT DISPERSION</div>
                        <h3 className="tech-title">Chromatic Dispersion</h3>
                        <p className="tech-desc">
                            By tracing red, green, and blue light waves at slightly different Indices of Refraction, we simulate real gemstone fire, creating beautiful rainbow-like spectral highlights as you rotate the ring.
                        </p>
                    </div>
                    <div className="tech-card">
                        <div className="tech-title" style={{ fontSize: '15px', color: '#c49a45', letterSpacing: '0.05em', marginBottom: '8px' }}>DUAL-PASS SHADER</div>
                        <h3 className="tech-title">Specular Highlights</h3>
                        <p className="tech-desc">
                            A dual-pass shader model isolates direct top-surface reflections from internal volume bounces. This preserves sharp mirror reflections on flat tables while maintaining deep refraction in the pavilion.
                        </p>
                    </div>
                </div>
            </section>

            {/* Interactive File Drag/Drop Zone */}
            <section id="drag-drop" className="landing-upload-sec">
                <div className="upload-zone-wrap" onClick={() => openConfigurator(CUSTOM_DESIGNS[0].config)}>
                    <h3 className="upload-headline">Custom Design Upload</h3>
                    <p className="upload-subtext">
                        Drag and drop a 3D model (.glb or .gltf) here, or click to launch the default scene with our custom Marquise ring model.
                    </p>
                    <div className="sample-pills">
                        <span className="sample-pill">Try Default Ring</span>
                        <span className="sample-pill">Drop Custom GLB</span>
                    </div>
                </div>
            </section>

            {/* Footer with branding logos */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-logo">
                        <span className="footer-logo-brand">AURUM</span>
                        <span className="footer-logo-studio">STUDIO 3D</span>
                    </div>
                    <div className="footer-credentials">
                        Developed & Powered by Kakadiya Graphics & Technologies
                    </div>
                    <div className="footer-copyright">
                        © 2026 AurumStudio 3D. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: LoadingScreen
// Captures Three.js asset loading progress and shows a percentage spinner.
// ─────────────────────────────────────────────────────────────────────────────
export function LoadingScreen({ onComplete }) {
    const { active, progress } = useProgress()

    useEffect(() => {
        if (!active && progress === 100) {
            const t = setTimeout(() => {
                onComplete?.()
            }, 300)
            return () => clearTimeout(t)
        }
    }, [active, progress, onComplete])

    return (
        <div className="loading-wrap">
            <div className="loading-center">
                <h1 className="loading-title" style={{ marginBottom: '24px' }}>
                    AURUM<span>STUDIO 3D</span>
                </h1>
                <div className="loading-spinner"></div>
                <div className="loading-text" style={{ letterSpacing: '0.1em' }}>Calibrating Optics</div>
                <div className="loading-progress">{Math.round(progress)}%</div>
            </div>
        </div>
    )
}
