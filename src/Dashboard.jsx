/**
 * ============================================================================
 * Dashboard.jsx
 * ============================================================================
 * 
 * FILE PURPOSE:
 * Provides the interactive left-side panel for selecting high-level configuration
 * presets. It allows the user to quickly theme the entire product without 
 * knowing the underlying physics values.
 * 
 * SYSTEM ROLE:
 * When a user clicks a "Gem Thumbnail" or a "Color Swatch", this component calls 
 * state-update functions passed down from `App.jsx`. Those state changes then 
 * trigger re-renders in the `DiamondBundle` shader.
 * ============================================================================
 */
import { useState } from 'react'
import { GEM_PRESETS, METAL_PRESETS, ENV_PRESETS, SCENE_PRESETS, METAL_COLORS, GEM_COLORS } from './presets.js'
import './dashboard.css'
const CATEGORIES = [
    { id: 'scenes', label: 'Scenes', icon: '🖼️' },
    { id: 'gems', label: 'Gems', icon: '💎' },
    { id: 'metal', label: 'Metal', icon: '⚙️' },
    { id: 'env', label: 'Lighting', icon: '💡' },
]

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENT: SceneThumbnail
// Renders the small clickable visual preview buttons for environments.
// Uses dynamic CSS gradients to mimic the 3D scene background.
// ─────────────────────────────────────────────────────────────────────────────
function SceneThumbnail({ preset, isSelected, onClick }) {
    let previewStyle = { background: '#f0f0f0' }
    if (preset.bgType === 'color') previewStyle.background = preset.bgColor
    if (preset.bgType === 'gradient') previewStyle.background = `linear-gradient(135deg, ${preset.bgColors[0]}, ${preset.bgColors[1]})`
    if (preset.bgType === 'radial') previewStyle.background = `radial-gradient(circle, ${preset.bgColors[0]}, ${preset.bgColors[1]})`

    return (
        <button
            className={`db-thumb ${isSelected ? 'db-thumb--selected' : ''}`}
            onClick={() => onClick(preset)}
            title={preset.name}
        >
            <div className="db-thumb__content">
                <div className="db-thumb__scene" style={previewStyle} />
            </div>
            <span className="db-thumb__label">{preset.name}</span>
        </button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENT: GemThumbnail
// Renders the visual presets for gemstones (e.g., Ruby, Sapphire). 
// The pure CSS gemstone icon is drawn using nested flexboxes in dashboard.css.
// ─────────────────────────────────────────────────────────────────────────────
function GemThumbnail({ preset, isSelected, onClick }) {
    return (
        <button
            className={`db-thumb ${isSelected ? 'db-thumb--selected' : ''}`}
            onClick={() => onClick(preset)}
            title={preset.name}
        >
            <div className="db-thumb__content">
                <div
                    className="db-thumb__gem"
                    style={{ background: preset.gradient }}
                >
                    <div className="db-thumb__facet" />
                </div>
            </div>
            <span className="db-thumb__label">{preset.name}</span>
        </button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENT: MetalThumbnail
// Renders flat circular swatches representing ring band materials.
// ─────────────────────────────────────────────────────────────────────────────
function MetalThumbnail({ preset, isSelected, onClick }) {
    return (
        <button
            className={`db-thumb ${isSelected ? 'db-thumb--selected' : ''}`}
            onClick={() => onClick(preset)}
            title={preset.name}
        >
            <div className="db-thumb__content">
                <div
                    className="db-thumb__metal"
                    style={{ background: preset.color }}
                />
            </div>
            <span className="db-thumb__label">{preset.name}</span>
        </button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENT: EnvThumbnail
// Renders the available HDR Lighting environments using emoji placeholders.
// ─────────────────────────────────────────────────────────────────────────────
function EnvThumbnail({ preset, isSelected, onClick }) {
    return (
        <button
            className={`db-thumb ${isSelected ? 'db-thumb--selected' : ''}`}
            onClick={() => onClick(preset)}
            title={preset.name}
        >
            <div className={`db-thumb__env ${isSelected ? 'db-thumb__env--selected' : ''}`}>
                <span className="db-thumb__env-icon">{preset.icon}</span>
            </div>
        </button>
    )
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT: Dashboard
// 
// Layout:
// - A thin vertical sidebar on the left containing Category icons (Tabs).
// - A slide-out panel that renders grid layouts based on the `activeCategory`.
// ─────────────────────────────────────────────────────────────────────────────
export function Dashboard({
    activeScenePreset,
    activeGemPreset,
    activeMetalPreset,
    activeEnvPreset,
    onScenePreset,
    onGemPreset,
    onMetalPreset,
    onEnvPreset,
    // live control values (read from Leva) — for display
    currentGemColor,
    currentMetalColor,
    selectedGem,
    selectedElement,
    setSelectedGem,
    setSelectedElement,
    setMeshConfig,
    setGemColor,
    setMetalColor,
}) {
    const [activeCategory, setActiveCategory] = useState('scenes')
    const [collapsed, setCollapsed] = useState(false)

    const handleColorChange = (hex) => {
        if (selectedGem) {
            // Update individual gem
            setMeshConfig(prev => ({
                ...prev,
                [selectedGem]: { ...prev[selectedGem], color: hex, ior: GEM_COLORS.find(c => c.hex === hex)?.ior || 2.4 }
            }))
        } else if (selectedElement === 'metal') {
            // For now, if metal is selected global color changes
            // (or we could target specific metal meshes if we tracked them)
            setMetalColor(hex)
        } else {
            // Global gem color
            setGemColor(hex)
        }
    }

    // iJewel has vertical tabs on far left, then a panel next to it.
    // Top left has the logo.

    const activeCatData = CATEGORIES.find(c => c.id === activeCategory)

    return (
        <div className="dashboard">
            <div className="db-body">
                {/* ── Vertical Tabs Bar ── */}
                <div className="db-tabs-vertical">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            className={`db-tab-v ${activeCategory === cat.id ? 'db-tab-v--active' : ''}`}
                            onClick={() => {
                                setActiveCategory(cat.id)
                                setCollapsed(false)
                            }}
                            title={cat.label}
                        >
                            <span className="db-tab-v__icon">{cat.icon}</span>
                        </button>
                    ))}
                </div>

                {/* ── Slide-out Panel ── */}
                <div className={`db-panel ${collapsed ? 'db-panel--collapsed' : ''}`}>
                    <div className="db-panel__header">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="db-panel__title" style={{ fontSize: '12px', opacity: 0.6, textTransform: 'uppercase' }}>
                                {activeCatData?.label}
                            </span>
                            {selectedGem && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 600 }}>Selected Item</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedGem(null); }}
                                        style={{ fontSize: '10px', color: '#ff7a00', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        (Clear)
                                    </button>
                                </div>
                            )}
                        </div>
                        <button
                            className="db-panel__close"
                            onClick={() => setCollapsed(true)}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    </div>

                    <div className="db-panel__content">
                        {activeCategory === 'scenes' && (
                            <div className="db-grid db-grid--env">
                                {SCENE_PRESETS.map(p => (
                                    <SceneThumbnail
                                        key={p.id}
                                        preset={p}
                                        isSelected={activeScenePreset?.id === p.id}
                                        onClick={onScenePreset}
                                    />
                                ))}
                            </div>
                        )}

                        {activeCategory === 'gems' && (
                            <div className="db-grid--vertical">
                                <div className="db-grid db-grid--presets">
                                    {GEM_PRESETS.map(p => (
                                        <GemThumbnail
                                            key={p.id}
                                            preset={p}
                                            isSelected={activeGemPreset?.id === p.id}
                                            onClick={onGemPreset}
                                        />
                                    ))}
                                </div>

                                <div className="db-color-section">
                                    <span className="db-section-label">SELECT COLOR {selectedGem ? '(SELECTED)' : '(ALL)'}</span>
                                    <div className="db-color-grid">
                                        {GEM_COLORS.map(c => (
                                            <div
                                                key={c.name}
                                                className={`db-color-dot ${currentGemColor === c.hex ? 'active' : ''}`}
                                                style={{ background: c.hex }}
                                                onClick={() => handleColorChange(c.hex)}
                                                title={c.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeCategory === 'metal' && (
                            <div className="db-grid--vertical">
                                <div className="db-grid db-grid--presets">
                                    {METAL_PRESETS.map(p => (
                                        <MetalThumbnail
                                            key={p.id}
                                            preset={p}
                                            isSelected={activeMetalPreset?.id === p.id}
                                            onClick={onMetalPreset}
                                        />
                                    ))}
                                </div>

                                <div className="db-color-section">
                                    <span className="db-section-label">METAL FINISH</span>
                                    <div className="db-color-grid">
                                        {METAL_COLORS.map(c => (
                                            <div
                                                key={c.name}
                                                className={`db-color-dot ${currentMetalColor === c.hex ? 'active' : ''}`}
                                                style={{ background: c.hex }}
                                                onClick={() => handleColorChange(c.hex)}
                                                title={c.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeCategory === 'env' && (
                            <div className="db-grid db-grid--env">
                                {/* Env previews normally have specific HDRI thumbnails in iJewel, using circular divs as placeholder */}
                                {ENV_PRESETS.map(p => (
                                    <EnvThumbnail
                                        key={p.id}
                                        preset={p}
                                        isSelected={activeEnvPreset?.id === p.id}
                                        onClick={onEnvPreset}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

