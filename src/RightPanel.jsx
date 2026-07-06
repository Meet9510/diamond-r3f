/**
 * ============================================================================
 * RightPanel.jsx
 * ============================================================================
 * 
 * FILE PURPOSE:
 * Renders the Inspector panel on the right side of the screen. This panel 
 * allows fine-grained, technical tweaking of the physics variables (IOR, 
 * Dispersion, Bounces) that the Dashboard presets abstract away.
 * 
 * SYSTEM ROLE:
 * It reads from and writes to the `advanced` state object in `App.jsx`. 
 * Changing a slider here immediately updates the `DiamondBundle` shader uniforms.
 * ============================================================================
 */
import React, { useState } from 'react'
import './inspector.css'

function Slider({ label, value, min, max, step, onChange }) {
    return (
        <div className="inspector-slider">
            <div className="inspector-slider-header">
                <span className="inspector-label">{label}</span>
                <span className="inspector-value">{value.toFixed(2)}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
            />
        </div>
    )
}

function Toggle({ label, value, onChange }) {
    return (
        <div className="inspector-toggle">
            <span className="inspector-label">{label}</span>
            <button
                className={`toggle-btn ${value ? 'active' : ''}`}
                onClick={() => onChange(!value)}
            >
                <div className="toggle-knob" />
            </button>
        </div>
    )
}

function Accordion({ title, defaultOpen = true, children }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className={`inspector-accordion ${open ? 'open' : ''}`}>
            <button className="accordion-header" onClick={() => setOpen(!open)}>
                <span>{title}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={open ? "M19 15l-7-7-7 7" : "M19 9l-7 7-7-7"} />
                </svg>
            </button>
            {open && <div className="accordion-content">{children}</div>}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT: RightPanel
// 
// What it does: 
// Displays context-sensitive controls based on what the user clicked 
// (`selectedElement` = 'gem', 'metal', or 'environment').
// ─────────────────────────────────────────────────────────────────────────────
export function RightPanel({
    selectedElement, // 'gem', 'metal', 'environment', null
    advanced, setAdvanced,
    metalControls, setMetalControls,
    pp, setPp,
    lighting, setLighting
}) {
    const updateAdvanced = (key, val) => setAdvanced(prev => ({ ...prev, [key]: val }))
    const updateMetal = (key, val) => setMetalControls(prev => ({ ...prev, [key]: val }))
    const updatePp = (key, val) => setPp(prev => ({ ...prev, [key]: val }))
    const updateLighting = (key, val) => setLighting(prev => ({ ...prev, [key]: val }))

    if (!selectedElement) {
        return (
            <div className="right-panel right-panel--empty">
                <div className="empty-state">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
                    </svg>
                    <p>Select an element to inspect</p>
                </div>
            </div>
        )
    }

    return (
        <div className="right-panel">
            <div className="right-panel-header">
                <h3>{selectedElement === 'gem' ? 'Gemstone Material' : selectedElement === 'metal' ? 'Metal Material' : 'Environment & Post'}</h3>
            </div>

            <div className="right-panel-scroll">
                {selectedElement === 'gem' && (
                    <>
                        <Accordion title="Optical Properties">
                            <Slider label="Index of Refraction" value={advanced.ior} min={1.0} max={4.0} step={0.01} onChange={v => updateAdvanced('ior', v)} />
                            <Slider label="Dispersion (Fire)" value={advanced.dispersion} min={0} max={0.3} step={0.001} onChange={v => updateAdvanced('dispersion', v)} />
                            <Slider label="Internal Bounces" value={advanced.bounces} min={1} max={7} step={1} onChange={v => updateAdvanced('bounces', v)} />
                            <Slider label="Crown Reflection" value={advanced.crownStrength} min={0} max={1.5} step={0.05} onChange={v => updateAdvanced('crownStrength', v)} />
                        </Accordion>
                        <Accordion title="Light & Color">
                            <Slider label="Sparkle Boost" value={advanced.sparkleBoost} min={0.3} max={4.0} step={0.05} onChange={v => updateAdvanced('sparkleBoost', v)} />
                            <Slider label="Color Saturation" value={advanced.colorSaturation} min={0} max={1.0} step={0.05} onChange={v => updateAdvanced('colorSaturation', v)} />
                            <Slider label="Color Richness" value={advanced.colorRichness} min={0.5} max={3.0} step={0.1} onChange={v => updateAdvanced('colorRichness', v)} />
                            <Slider label="Absorption" value={advanced.absorption} min={0} max={0.2} step={0.001} onChange={v => updateAdvanced('absorption', v)} />
                        </Accordion>
                        <Accordion title="Advanced Illusion">
                            <Slider label="Aberration Strength" value={advanced.aberrationStrength} min={0} max={0.12} step={0.005} onChange={v => updateAdvanced('aberrationStrength', v)} />
                            <Slider label="Energy Decay" value={advanced.energyDecay} min={0.01} max={1.0} step={0.01} onChange={v => updateAdvanced('energyDecay', v)} />
                            <Toggle label="Fast Chroma" value={advanced.fastChroma} onChange={v => updateAdvanced('fastChroma', v)} />
                        </Accordion>
                    </>
                )}

                {selectedElement === 'metal' && (
                    <Accordion title="Surface Finish">
                        <Slider label="Metalness" value={metalControls.metalness} min={0} max={1.0} step={0.01} onChange={v => updateMetal('metalness', v)} />
                        <Slider label="Roughness" value={metalControls.metalRoughness} min={0} max={1.0} step={0.01} onChange={v => updateMetal('metalRoughness', v)} />
                        <Slider label="Clearcoat" value={metalControls.clearcoat} min={0} max={1.0} step={0.01} onChange={v => updateMetal('clearcoat', v)} />
                    </Accordion>
                )}

                {(selectedElement === 'environment' || selectedElement === 'gem' || selectedElement === 'metal') && (
                    <>
                        <Accordion title="Direct Studio Lighting" defaultOpen={selectedElement === 'environment'}>
                            <Slider label="Light Position X" value={lighting.lightPosX} min={-10} max={10} step={0.5} onChange={v => updateLighting('lightPosX', v)} />
                            <Slider label="Light Position Y" value={lighting.lightPosY} min={1} max={15} step={0.5} onChange={v => updateLighting('lightPosY', v)} />
                            <Slider label="Light Position Z" value={lighting.lightPosZ} min={-10} max={10} step={0.5} onChange={v => updateLighting('lightPosZ', v)} />
                            <Slider label="Key Light Intensity" value={lighting.lightIntensity} min={0} max={3.0} step={0.1} onChange={v => updateLighting('lightIntensity', v)} />
                            <Slider label="Ambient Light Intensity" value={lighting.ambientIntensity} min={0} max={1.5} step={0.05} onChange={v => updateLighting('ambientIntensity', v)} />
                        </Accordion>
                        <Accordion title="Post Processing" defaultOpen={false}>
                            <Slider label="Camera Exposure" value={advanced.exposure} min={0} max={3.0} step={0.1} onChange={v => updateAdvanced('exposure', v)} />
                            <Slider label="Bloom Threshold" value={pp.bloomThreshold} min={0} max={3.0} step={0.01} onChange={v => updatePp('bloomThreshold', v)} />
                            <Slider label="Bloom Intensity" value={pp.bloomIntensity} min={0} max={3.0} step={0.05} onChange={v => updatePp('bloomIntensity', v)} />
                            <Slider label="Bloom Radius" value={pp.bloomRadius} min={0} max={1.0} step={0.05} onChange={v => updatePp('bloomRadius', v)} />
                        </Accordion>
                    </>
                )}
            </div>
        </div>
    )
}
