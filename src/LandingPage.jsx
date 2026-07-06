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
import React, { useState, useEffect } from 'react'
import { useProgress } from '@react-three/drei'
import { GEM_PRESETS, METAL_PRESETS, SCENE_PRESETS, ENV_PRESETS } from './presets.js'
import './landing.css'


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
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: LandingPage
// Renders the rich luxury landing page with multiple interactive sections.
// ─────────────────────────────────────────────────────────────────────────────
const STATS = [
    { value: 60, suffix: 'fps', label: 'Real-time Rendering' },
    { value: 10, suffix: 'x', label: 'Internal Light Bounces' },
    { value: 100, suffix: '%', label: 'Browser Native' },
    { value: 2, suffix: 'K', label: 'Shadow Resolution' },
]

function useScrollReveal() {
    useEffect(() => {
        const elements = document.querySelectorAll('.reveal')
        if (!elements.length) return
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed')
                        observer.unobserve(entry.target)
                    }
                })
            },
            { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
        )
        elements.forEach((el) => observer.observe(el))
        return () => observer.disconnect()
    }, [])
}

export function LandingPage({ isDragging }) {
    const [activeIdx, setActiveIdx] = useState(0)
    useScrollReveal()

    // Auto rotate showcase images every 5 seconds unless interacted with
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIdx((prev) => (prev + 1) % CUSTOM_DESIGNS.length)
        }, 6000)
        return () => clearInterval(interval)
    }, [])

    const activeDesign = CUSTOM_DESIGNS[activeIdx]

    // Helper: opens the configurator in a new tab with specified parameters
    const openConfigurator = (config) => {
        let url = '?mode=editor'
        if (config) {
            if (config.model) url += `&model=${encodeURIComponent(config.model)}`
            if (config.metalColor) url += `&metalColor=${encodeURIComponent(config.metalColor)}`
            if (config.gemColor) url += `&gemColor=${encodeURIComponent(config.gemColor)}`
            if (config.scenePreset) url += `&scenePresetId=${encodeURIComponent(config.scenePreset.id)}`
            if (config.gemPreset) url += `&gemPresetId=${encodeURIComponent(config.gemPreset.id)}`
            if (config.envPreset) url += `&envPresetId=${encodeURIComponent(config.envPreset.id)}`
        }
        window.open(url, '_blank')
    }

    return (
        <div className={`landing-wrap ${isDragging ? 'landing-wrap--dragging' : ''}`}>
            {/* Ambient floating particles */}
            <div className="particles-bg" aria-hidden="true">
                {Array.from({ length: 22 }).map((_, i) => (
                    <div key={i} className="particle" style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        width: `${1 + Math.random() * 2}px`,
                        height: `${1 + Math.random() * 2}px`,
                        animationDelay: `${Math.random() * 12}s`,
                        animationDuration: `${8 + Math.random() * 14}s`,
                        opacity: 0.15 + Math.random() * 0.4,
                    }} />
                ))}
            </div>

            {/* Concentric ambient background ripples */}
            <div className="ripple ripple-1"></div>
            <div className="ripple ripple-2"></div>
            <div className="ripple ripple-3"></div>
            <div className="ripple ripple-4"></div>
            <div className="ripple ripple-5"></div>

            {/* Glassmorphic Navigation Header */}
            <header className="landing-header">
                <a href="#" className="brand-logo">
                    <span className="logo-text">AURUM</span>
                    <span className="logo-tag">STUDIO 3D</span>
                </a>
                <nav className="nav-links">
                    <a href="#hero" className="nav-link">Home</a>
                    <a href="#showroom" className="nav-link">Showroom</a>
                    <a href="#technology" className="nav-link">Technology</a>
                    <a href="#about" className="nav-link">About</a>
                    <a href="#drag-drop" className="nav-link">Upload Model</a>
                </nav>
                <button className="header-cta-btn" onClick={() => openConfigurator(CUSTOM_DESIGNS[0].config)}>
                    Launch Configurator
                </button>
            </header>

            {/* Hero Section */}
            <section id="hero" className="landing-hero">
                <div className="hero-text-content">
                    <div className="hero-eyebrow reveal reveal-left">
                        <span className="eyebrow-line"></span>
                        <span className="eyebrow-text">Luxury Jewelry Rendering Platform</span>
                    </div>
                    <h1 className="hero-title reveal reveal-up">
                        Sculpted by <span>Light</span>,<br />
                        Crafted for <span>Eternity</span>
                    </h1>
                    <p className="hero-description reveal reveal-up reveal-delay-1">
                        Welcome to AurumStudio 3D. Experience the future of fine jewelry design through our physically accurate, real-time 3D customizer. Configure premium metals and gemstones cut with mathematical precision, rendering at 60fps directly in your browser.
                    </p>
                    <div className="hero-actions reveal reveal-up reveal-delay-2">
                        <button className="hero-btn-primary" onClick={() => openConfigurator(activeDesign.config)}>
                            Configure This Ring
                        </button>
                        <a href="#showroom" className="hero-btn-secondary">
                            Explore Showroom
                        </a>
                    </div>

                    {/* Drag and Drop Info Pill */}
                    <div className="hero-drag-box reveal reveal-up reveal-delay-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        <span>{isDragging ? 'Drop file to view' : 'Drag & Drop your own .glb/.gltf model here'}</span>
                    </div>
                </div>

                {/* Hero Showcase: static image switcher */}
                <div className="hero-image-showcase reveal reveal-right">
                    <img src={activeDesign.image} alt={activeDesign.title} className="showcase-bg-image" />
                    <div className="showcase-corner-glow"></div>

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

            {/* Stats Strip */}
            <div className="stats-strip reveal reveal-up">
                <div className="shimmer-line"></div>
                {STATS.map((s, i) => (
                    <div key={i} className="stat-item">
                        <div className="stat-value">{s.value}<span className="stat-suffix">{s.suffix}</span></div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
                <div className="shimmer-line"></div>
            </div>

            {/* Showroom / Collection Grid Section */}
            <section id="showroom" className="landing-showroom-sec">
                <div className="section-header reveal reveal-up">
                    <span className="section-subtitle">Exquisite Renders</span>
                    <h2 className="section-title">The Marquise Crown Collection</h2>
                    <div className="section-divider"><span></span><span className="divider-diamond"></span><span></span></div>
                </div>
                <div className="showroom-grid">
                    {CUSTOM_DESIGNS.map((design, idx) => (
                        <div key={design.id} className={`showroom-card reveal reveal-up reveal-delay-${idx % 4}`}>
                            <div className="card-img-wrap">
                                <img src={design.image} alt={design.title} className="card-img" />
                                <div className="card-img-overlay"></div>
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

            {/* Technology Info Section */}
            <section id="technology" className="landing-tech-sec">
                <div className="section-header reveal reveal-up">
                    <span className="section-subtitle">Core Innovation</span>
                    <h2 className="section-title">How the 3D Illusion Engine Works</h2>
                    <div className="section-divider"><span></span><span className="divider-diamond"></span><span></span></div>
                </div>
                <div className="tech-grid">
                    {[
                        { tag: 'BVH ACCELERATION', title: 'Bounding Volume Hierarchy', desc: 'We compile a custom bounding volume hierarchy tree directly over the gemstone geometry. This accelerates ray intersection testing to O(log N), allowing real-time raytracing path lookups in standard web browsers.' },
                        { tag: 'OPTICAL PHYSICS', title: 'Total Internal Reflection', desc: 'Light rays entering the gemstone are bent according to the Index of Refraction (Snell\'s Law) and bounce internally off the facets up to 10 times until escaping to sample the studio environment maps.' },
                        { tag: 'LIGHT DISPERSION', title: 'Chromatic Dispersion', desc: 'By tracing red, green, and blue light waves at slightly different Indices of Refraction, we simulate real gemstone fire, creating beautiful rainbow-like spectral highlights as you rotate the ring.' },
                        { tag: 'DUAL-PASS SHADER', title: 'Specular Highlights', desc: 'A dual-pass shader model isolates direct top-surface reflections from internal volume bounces. This preserves sharp mirror reflections on flat tables while maintaining deep refraction in the pavilion.' },
                    ].map((card, i) => (
                        <div key={i} className={`tech-card reveal reveal-up reveal-delay-${i % 4}`}>
                            <div className="tech-tag">{card.tag}</div>
                            <h3 className="tech-title">{card.title}</h3>
                            <p className="tech-desc">{card.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* About Us Section */}
            <section id="about" className="landing-about-sec">
                <div className="section-header reveal reveal-up">
                    <span className="section-subtitle">Our Vision</span>
                    <h2 className="section-title">About AurumStudio 3D</h2>
                    <div className="section-divider"><span></span><span className="divider-diamond"></span><span></span></div>
                </div>
                <div className="about-grid">
                    <div className="about-card reveal reveal-left">
                        <h3 className="about-card-title">Leadership & Design</h3>
                        <p className="about-card-text">
                            AurumStudio 3D is a premium real-time jewelry customization and rendering platform founded and directed by <strong>Meet R Kakadiya</strong>. We merge mathematical precision, structural engineering, and GPU-accelerated graphics to deliver high-fidelity interactive visualization for modern jewelry houses.
                        </p>
                    </div>
                    <div className="about-card reveal reveal-right">
                        <h3 className="about-card-title">Kakadiya Graphics</h3>
                        <p className="about-card-text">
                            Powered by Kakadiya Graphics & Technologies, our studio pushes the boundaries of WebGL performance. Through proprietary dual-pass shaders and customized Bounding Volume Hierarchies, we bring physical accuracy directly into standard browser tabs.
                        </p>
                    </div>
                </div>
            </section>

            {/* Interactive File Drag/Drop Zone */}
            <section id="drag-drop" className="landing-upload-sec reveal reveal-up">
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

            {/* Footer */}
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
