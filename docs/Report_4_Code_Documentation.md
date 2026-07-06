# Report 4: Code Documentation Report

## 1. File-by-File Explanation

### `App.jsx`
The central orchestrator of the entire application. It parses standard `.glb` files and wraps them in custom physics geometries. 
**Key Responsibility:** Maintaining global React state (`appState`, `advanced` settings variables), establishing the Three.js viewport context (`<Canvas>`), and applying the `DiamondGem` wrapper securely to the geometry fragments classified as gemstones.

### `DiamondBVHMaterial.jsx`
The literal physics engine. A `ShaderMaterial` subclass containing raw WebGL GLSL (OpenGL Shading Language) code.
**Key Responsibility:** Injecting the complex raytracing algorithm (`DIAMOND_FRAG`) into the traditional rasterized pipeline using the `three-mesh-bvh` package formulas.

### `DiamondBundle.jsx`
The React binding layer for the shader. 
**Key Responsibility:** Takes the raw `DiamondBVHMaterialImpl` and provides a safe React wrapper. Uses the `useFrame` hook to bypass the React Virtual DOM entirely, directly piping uniform variables like `ior` and `camera` matrix outputs straight to the GPU every frame.

### `Dashboard.jsx`, `RightPanel.jsx`
The User Interface layers.
**Key Responsibility:** Translating non-technical abstract inputs (Preset tiles like "Ruby", sliders for "Scintillation") back up to the parent `App.jsx` application via state setter callbacks (`setAdvanced`).

### `presets.js`
The Configuration Dictionary.
**Key Responsibility:** Decouples hardcoded physics from the core logic. Provides the lookup tables (Hex colors, Index of Refractions arrays, Environment mapping HDR links).

## 2. React Hook Usage Highlights

### `useFrame`
Used inside `DiamondBundle`. React typically renders components only when state changes. However, 3D engines need continuous updates (e.g., if the user drags the camera around, the raycast angles must update 60 times a second). Instead of triggering a massive DOM diff 60 times a second, `useFrame` intercepts the Render loop directly and edits the object references natively.

### `useMemo`
Used heavily inside `IllusionDiamondScene` to separate the geometry meshes (metal vs gem) and build the Bounding Volume Hierarchy (`bvh`). Building the BVH is computationally expensive (O(n log n)). Wrapping it in `useMemo` guarantees that the BVH tree is only built exactly once when the model is downloaded, preventing the app from freezing on subsequent superficial updates.

### `useEffect`
Used primarily in the `SceneEnvironment` and `EnvMapCatcher` to handle imperative side effects, like applying PMREM generation to raw textures, or modifying the document body to display a drag-and-drop loading screen.

## 3. State Management Flow
The app relies solely on Top-Down React state passing rather than Redux/Zustand. This works optimally for a single-page renderer:
1. `App.jsx` declares variable `[advanced, setAdvanced] = useState(...)`.
2. `App.jsx` passes `advanced` to `<Canvas/> -> <DiamondGem/>`.
3. `App.jsx` passes `setAdvanced` down the side tree to `<RightPanel/>`.
4. User clicks a slider in `RightPanel`. It triggers `setAdvanced`.
5. `App.jsx` re-renders. 
6. Since React Fiber reconciles the canvas virtually, only the `DiamondBundle` receives the new `advanced` prop, pushing the update instantly to the GPU via its `useFrame` hook.
