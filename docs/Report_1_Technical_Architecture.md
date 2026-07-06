# Report 1: Technical Architecture Report

## 1. System Overview
The Real-Time Jewelry Rendering System is a web-based 3D configurator designed to provide photorealistic visualization of jewelry. Built upon React, React Three Fiber (R3F), and Three.js, it replaces standard glass approximations with a custom, hardware-accelerated raytracing engine tailored specifically for the extreme optical density of diamonds.

## 2. Rendering Pipeline
The pipeline is designed to intercept standard WebGL rendering and inject advanced physics:

1. **Geometry Ingestion (`useGLTF`)**: Standard `.glb` models are parsed. The system separates the model into logical branches: `metalNodes` (gold, platinum) and `gemNodes` (diamonds, rubies).
2. **BVH Generation (`three-mesh-bvh`)**: For every `gemNode`, a Bounding Volume Hierarchy tree is calculated. This pre-computes the spatial relationships of all the triangular facets of the gem, allowing the GPU to trace light paths infinitely faster than brute-force checking.
3. **Environment Map Processing (PMREM)**: The system takes high-dynamic-range (HDR) studio photography and runs it through a Prefiltered Mipmapped Radiance Environment Map (PMREM) generator. This compresses the lighting data so that shiny metal surfaces and internal diamond reflections look physically precise.
4. **Shader Execution (`DiamondBundle`)**: Instead of standard rasterization, the custom `DiamondBVHMaterial` executes. It calculates exactly how light from the PMREM map enters the BVH volume, bounces internally, and exits to the camera eye.
5. **Post-Processing (Bloom/Tone Mapping)**: Rendered output is passed through an ACESFilmic Tone Mapper to compress extreme brightness into typical screen colors, and a Bloom pass creates the glowing "sparkle" around the edges.

## 3. Data Flow
State management follows a top-down React architecture:
*   **Central State (`App.jsx`)**: Holds high-level variables (`advanced` settings, active presets, `metalColor`, `globalGemColor`).
*   **UI Controllers (`Dashboard.jsx`, `RightPanel.jsx`)**: Provide inputs. When a user selects a preset, they invoke setter functions (`setAdvanced`, `setMeshConfig`) belonging to `App.jsx`.
*   **3D Consumers (`IllusionDiamondScene`, `DiamondBundle`)**: React perfectly to state changes. Specifically, `DiamondBundle` uses the `useFrame` hook to blindly sync the React state straight into the raw WebGL Uniform memory array 60 times a second, ensuring the physics shader updates fluidly without lagging the React thread.

## 4. Module Interactions
*   **UI to Physics**: The user adjusts "IOR" in `RightPanel`. React updates the state. `DiamondBundle` detects the update in `useFrame` and sets `material.uniforms.ior.value`. The GPU immediately recalculates the ray angles on the next frame.
*   **Dynamic Backgrounds**: The `SceneEnvironment` component listens to `dashScenePreset`. If changed, it instantly swaps out the underlying `fog` and `MeshReflectorMaterial` planes, altering the physical stage the ring rests on.

## 5. Shader Integration
The shader integration circumvents conventional WebGL limitations:
By utilizing `three-mesh-bvh`, the system manages ray-triangle intersections directly inside the Fragment Shader (`DIAMOND_FRAG`). The shader iterates a `for` loop up to the `bounces` limit, calculating the `refract` scalar mathematically at every bounding hit surface before eventually escaping to sample the PMREM map.
