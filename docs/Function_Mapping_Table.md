# Function Mapping Table

| File Name | Function/Component Name | Purpose | Trigger / Hook | Output / Return |
| :--- | :--- | :--- | :--- | :--- |
| **`App.jsx`** | `App` | Root container holding state and displaying Landing vs Viewer. | Start of App | React DOM Layout (`<div className="app-layout">`) |
| **`App.jsx`** | `IllusionDiamondScene` | Parses GLB structure, creates BVH, and assigns Mesh Materials. | Model Loads `.glb` | The completed `<group>` of 3D `mesh` nodes |
| **`App.jsx`** | `DiamondGem` | Wrapper for individual gemstones to make them selectable. | Render Loop | Selectable `<Select>` `<mesh>` with attached Shader |
| **`App.jsx`** | `ExposureController` | Injects WebGL Tone Mapping exposure dynamically. | React `useEffect` (on exposure change) | Updates `gl.toneMappingExposure` natively |
| **`App.jsx`** | `getStudioStripTexture` | Generates procedural high-contrast studio lights. | On Load (Cached) | Extracted `THREE.DataTexture` |
| **`App.jsx`** | `CustomStudioStrip` | Processes the literal DataTexture through PMREM. | React `useEffect` | Sets `scene.environment` |
| **`DiamondBundle.jsx`**| `DiamondBundle` | Generates the actual shader and injects React props into GLSL. | Mount of `<DiamondGem/>` | Returns `<primitive object={material} />` |
| **`DiamondBundle.jsx`**| `useFrame` hook | Continuously injects active camera matrices into the GPU loop. | Browser Frame Repaint (60 FPS) | Direct write to `material.uniforms` memory |
| **`DiamondBVHMaterial.jsx`**| `totalInternalReflection` | Raw GLSL logic: Bounces ray inside bounding volume geometry. | For every pixel drawn (GPU) | A single `vec3` ray direction back to the eye |
| **`DiamondBVHMaterial.jsx`**| `envSample` | Standardized spherical mapping lookup logic. | Ray exits geometry (GPU) | Returns the final `vec4` pixel color |
| **`DiamondBVHMaterial.jsx`**| `DiamondBVHMaterialImpl` | Three.js abstraction linking `DIAMOND_VERT` and `DIAMOND_FRAG`. | React Context Load | Extends `THREE.ShaderMaterial` structure |
| **`Dashboard.jsx`** | `Dashboard` | Left panel UI holding tab logic and switching configurations. | Always present | Side panel visual layout |
| **`Dashboard.jsx`** | `handleColorChange` | Routes dynamic color hex selections to the active gem or band. | CSS Swatch Click Event | Fires `setMeshConfig` or `setMetalColor` back on `App.jsx` |
| **`Presets.js`** | `(Const Dictionaries)` | Database holding predefined visual styles (e.g. Ruby params). | Hardcoded Export | Data arrays for mapping in the UI loops |
| **`RightPanel.jsx`** | `RightPanel` | Expert inspection tools to tweak raw physics scalars live. | Present if gem/metal selected | Slider accordion layout for direct parameter tracking |
| **`LandingPage.jsx`**| `LandingPage` | Initial Splash screen managing drag-and-drop mechanics. | Start up (`appState === "landing"`) | A visually animated splash screen UI |
