/**
 * ============================================================================
 * presets.js
 * ============================================================================
 * 
 * FILE PURPOSE:
 * Acts as the centralized configuration database for all predefined styles and
 * materials within the Aurum Studio renderer. 
 * 
 * SYSTEM ROLE:
 * Supplies exact properties (physics variables, colors, names, UI icons) to the 
 * `App.jsx` application and `Dashboard.jsx`. Modifying properties here immediately 
 * updates how presets look globally.
 * 
 * CONTENTS:
 * - GEM_PRESETS: Pre-configured physics rules to accurately simulate specific gems.
 * - METAL_PRESETS: Pre-configured metalness and roughness values for ring bands.
 * - SCENE_PRESETS: Environment backdrops and stage floor meshes.
 * - ENV_PRESETS: Lighting HDRI maps.
 * - METAL_COLORS / GEM_COLORS: UI lookup tables for custom color picking.
 * ============================================================================
 */
/**
 * GEM_PRESETS — Full shader configuration for each gemstone type
 * Each preset controls:
 *   color        : hex color of the gem tint
 *   ior          : Index of Refraction (diamond=2.42, ruby=1.76, etc.)
 *   sparkleBoost : envIntensity multiplier after Reinhard compression
 *   colorSat     : how much gem color tints vs white (0=white, 1=solid)
 *   colorRich    : amplifies gem color before mixing
 *   aberration   : chromatic aberration / rainbow fire strength
 *   bounces      : BVH internal reflection bounces
 *   crownStrength: top-surface Fresnel rim + table shadow intensity
 */
export const GEM_PRESETS = [
    {
        id: 'diamond-white',
        name: 'Diamond',
        category: 'Gems',
        color: '#ffffff',
        gradient: 'linear-gradient(135deg, #ffffff, #e0e8ff, #fff)',
        ior: 2.417,
        sparkleBoost: 1.2,
        colorSat: 0.0,
        colorRich: 1.0,
        aberration: 0.015,
        bounces: 5,
        crownStrength: 0.4,
    },
    {
        id: 'diamond-clear',
        name: 'Pure White',
        category: 'Gems',
        color: '#ffffff',
        gradient: 'linear-gradient(135deg, #f5f5f5, #d0e8ff, #fff)',
        ior: 2.417,
        sparkleBoost: 1.25,
        colorSat: 0.0,
        colorRich: 1.0,
        aberration: 0.018,
        bounces: 5,
        crownStrength: 0.45,
    },
    {
        id: 'diamond-black',
        name: 'Black Diamond',
        category: 'Gems',
        color: '#111111',
        gradient: 'linear-gradient(135deg, #222, #444, #111)',
        ior: 2.417,
        sparkleBoost: 0.65,
        colorSat: 0.92,
        colorRich: 0.5,
        aberration: 0.005,
        bounces: 3,
        crownStrength: 0.7,
    },
    {
        id: 'ruby',
        name: 'Ruby',
        category: 'Gems',
        color: '#cc0011',
        gradient: 'linear-gradient(135deg, #ff0022, #aa0011, #ff4455)',
        ior: 1.762,
        sparkleBoost: 1.8,
        colorSat: 0.85,
        colorRich: 1.2,
        aberration: 0.01,
        bounces: 4,
        crownStrength: 0.38,
    },
    {
        id: 'sapphire',
        name: 'Sapphire',
        category: 'Gems',
        color: '#0033dd',
        gradient: 'linear-gradient(135deg, #0044ff, #001188, #4488ff)',
        ior: 1.762,
        sparkleBoost: 1.8,
        colorSat: 0.82,
        colorRich: 1.1,
        aberration: 0.01,
        bounces: 4,
        crownStrength: 0.38,
    },
    {
        id: 'emerald',
        name: 'Emerald',
        category: 'Gems',
        color: '#00aa44',
        gradient: 'linear-gradient(135deg, #00cc55, #006622, #44ff88)',
        ior: 1.575,
        sparkleBoost: 1.6,
        colorSat: 0.8,
        colorRich: 1.1,
        aberration: 0.008,
        bounces: 4,
        crownStrength: 0.35,
    },
    {
        id: 'amethyst',
        name: 'Amethyst',
        category: 'Gems',
        color: '#9922cc',
        gradient: 'linear-gradient(135deg, #aa33dd, #660099, #cc66ff)',
        ior: 1.544,
        sparkleBoost: 1.7,
        colorSat: 0.75,
        colorRich: 1.2,
        aberration: 0.012,
        bounces: 4,
        crownStrength: 0.4,
    },
    {
        id: 'citrine',
        name: 'Citrine',
        category: 'Gems',
        color: '#ddaa00',
        gradient: 'linear-gradient(135deg, #ffcc00, #aa7700, #ffdd55)',
        ior: 1.544,
        sparkleBoost: 1.6,
        colorSat: 0.75,
        colorRich: 1.2,
        aberration: 0.018,
        bounces: 4,
        crownStrength: 0.42,
    },
    {
        id: 'aquamarine',
        name: 'Aquamarine',
        category: 'Gems',
        color: '#44aacc',
        gradient: 'linear-gradient(135deg, #55ccee, #226688, #88ddff)',
        ior: 1.577,
        sparkleBoost: 1.5,
        colorSat: 0.65,
        colorRich: 1.1,
        aberration: 0.014,
        bounces: 4,
        crownStrength: 0.4,
    },
    {
        id: 'pink-tourmaline',
        name: 'Rose Quartz',
        category: 'Gems',
        color: '#ff88bb',
        gradient: 'linear-gradient(135deg, #ffaacc, #cc5588, #ffccdd)',
        ior: 1.624,
        sparkleBoost: 1.6,
        colorSat: 0.7,
        colorRich: 1.1,
        aberration: 0.015,
        bounces: 4,
        crownStrength: 0.38,
    },
    {
        id: 'blue-topaz',
        name: 'Blue Topaz',
        category: 'Gems',
        color: '#11ccee',
        gradient: 'linear-gradient(135deg, #22ddff, #0088aa, #66eeff)',
        ior: 1.629,
        sparkleBoost: 1.5,
        colorSat: 0.7,
        colorRich: 1.15,
        aberration: 0.012,
        bounces: 4,
        crownStrength: 0.38,
    },
    {
        id: 'peridot',
        name: 'Peridot',
        category: 'Gems',
        color: '#99dd22',
        gradient: 'linear-gradient(135deg, #aaee33, #556611, #ccff55)',
        ior: 1.654,
        sparkleBoost: 1.6,
        colorSat: 0.75,
        colorRich: 1.1,
        aberration: 0.016,
        bounces: 4,
        crownStrength: 0.38,
    },
    {
        id: 'orange-sapphire',
        name: 'Padparadscha',
        category: 'Gems',
        color: '#ff6622',
        gradient: 'linear-gradient(135deg, #ff7733, #cc3300, #ffaa66)',
        ior: 1.762,
        sparkleBoost: 1.7,
        colorSat: 0.8,
        colorRich: 1.2,
        aberration: 0.012,
        bounces: 4,
        crownStrength: 0.4,
    },
]

/**
 * METAL_PRESETS — Ring band material presets
 */
export const METAL_PRESETS = [
    {
        id: 'platinum',
        name: 'Platinum',
        hex: '#e0e0e0',
        gradient: 'linear-gradient(135deg, #f0f0f0, #b0b0b0, #e8e8e8)',
        metalness: 1.0,
        roughness: 0.02,
        clearcoat: 0.0,
    },
    {
        id: 'yellow-gold',
        name: 'Yellow Gold',
        hex: '#ffcc00',
        gradient: 'linear-gradient(135deg, #ffe44d, #cc9900, #ffd700)',
        metalness: 1.0,
        roughness: 0.02,
        clearcoat: 0.0,
    },
    {
        id: 'rose-gold',
        name: 'Rose Gold',
        hex: '#d38b7d',
        gradient: 'linear-gradient(135deg, #e8a898, #b06860, #d38b7d)',
        metalness: 1.0,
        roughness: 0.02,
        clearcoat: 0.0,
    },
    {
        id: 'white-gold',
        name: 'White Gold',
        hex: '#c8c8c8',
        gradient: 'linear-gradient(135deg, #d8d8d8, #a0a0a0, #cccccc)',
        metalness: 1.0,
        roughness: 0.04,
        clearcoat: 0.1,
    },
]

/**
 * SCENE_PRESETS — Background and staging (pedestals, ground planes)
 */
export const SCENE_PRESETS = [
    {
        id: 'black-stage',
        name: 'Black Luxury Stage',
        bgType: 'color',
        bgColor: '#000000',
        stage: 'soft-base'
    },
    {
        id: 'blue-box',
        name: 'Blue Display Box',
        bgType: 'gradient',
        bgColors: ['#0f172a', '#1e293b'],
        stage: 'cube-pedestal'
    },
    {
        id: 'white-studio',
        name: 'Clean White Studio',
        bgType: 'gradient',
        bgColors: ['#f8fafc', '#e2e8f0'],
        stage: 'round-pedestal'
    },
    {
        id: 'premium-showroom',
        name: 'Premium Showroom',
        bgType: 'radial',
        bgColors: ['#334155', '#0f172a'],
        stage: 'spotlight-cone'
    }
]

export const ENV_PRESETS = [
    { id: 'contrast-strips', name: 'High Contrast Studio', type: 'procedural', intensity: 1.2, icon: '' },
    { id: 'soft-commercial', name: 'Soft Commercial Softbox', hdr: '/hdri/photo_studio_01_1k.hdr', intensity: 1.0, icon: '' },
    { id: 'dark-drama', name: 'Dark Luxury Drama', hdr: '/hdri/studio019.hdr', intensity: 1.4, icon: '' },
    { id: 'warm-luxury', name: 'Warm Luxury Showroom', hdr: '/hdri/studio024.hdr', intensity: 1.1, icon: '' },
    { id: 'cool-editorial', name: 'Cool Editorial Studio', hdr: '/hdri/studio018.hdr', intensity: 1.0, icon: '' },
    { id: 'ultra-sparkle', name: 'Ultra Sparkle Studio', type: 'procedural-intense', intensity: 1.5, icon: '' },
]

export const METAL_COLORS = [
    { name: 'Platinum', hex: '#e0e0e0', border: '#c8c8c8' },
    { name: 'Yellow Gold', hex: '#ffcc00', border: '#e6b800' },
    { name: 'Rose Gold', hex: '#d38b7d', border: '#be7d70' },
    { name: 'White Gold', hex: '#c8c8c8', border: '#b0b0b0' },
]

export const GEM_COLORS = [
    { name: 'Diamond', hex: '#CFD3D9', ior: 2.417, dispersion: 0.02 },
    { name: 'Pure White', hex: '#ffffff', ior: 2.417, dispersion: 0.02 },
    { name: 'Black Diamond', hex: '#111111', ior: 2.417, dispersion: 0.02 },
    { name: 'Ruby', hex: '#ff0022', ior: 1.762, dispersion: 0.013 },
    { name: 'Aquamarine', hex: '#e0ffff', ior: 1.577, dispersion: 0.014 },
    { name: 'Sapphire', hex: '#0033ff', ior: 1.762, dispersion: 0.013 },
    { name: 'Emerald', hex: '#00e640', ior: 1.575, dispersion: 0.014 },
    { name: 'Yellow Sapphire', hex: '#ffff00', ior: 1.762, dispersion: 0.013 },
    { name: 'Orange Sapphire', hex: '#ff6600', ior: 1.762, dispersion: 0.013 },
    { name: 'Pink Tourmaline', hex: '#ff99cc', ior: 1.624, dispersion: 0.017 },
    { name: 'Amethyst', hex: '#8a2be2', ior: 1.544, dispersion: 0.013 },
    { name: 'Blue Topaz', hex: '#00ffff', ior: 1.629, dispersion: 0.014 },
    { name: 'Peridot', hex: '#adff2f', ior: 1.654, dispersion: 0.02 },
]

