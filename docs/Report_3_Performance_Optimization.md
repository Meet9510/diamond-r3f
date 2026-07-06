# Report 3: Performance Optimization Report

Real-time browser raytracing is highly taxing. Maintaining 60 FPS on standard devices required strict optimization strategies across the application layer and the GPU layer.

## 1. Draw Call Reduction & Instancing
Every unique material and mesh requires the CPU to instruct the GPU to draw it (a Draw Call). By loading the `.glb` model ahead of time and mapping it to arrays (`gemNodes` and `metalNodes`), the application groups identical logic, reusing the exact same PMREM Environment Maps and `DiamondBundle` instances where possible rather than instantiating unique shaders for identical stones.

## 2. Spatial Indexing (BVH Usage)
The single biggest optimization. Checking ray intersection against raw array vertices scales linearly. Generating the Bounding Volume Hierarchy directly against the geometry tree (`geo.boundsTree = new MeshBVH()`) effectively pre-calculates the spatial proximity of the triangles. Ray intersections become logarithmic. The geometry is also processed as "non-indexed", meaning normals are flattened during load to avoid recalculating smooth curves that diamonds don't natively possess.

## 3. Shader Cost Management
Inside the raw fragment shader (`DIAMOND_FRAG`), executing 5 internal bounce loops and 3 chromatic channels equals 15 heavy calculations per pixel drawn.
*   **`fastChroma` Toggle**: We implemented a flag that, when true, skips tracing 3 separate rays for RGB colors. Instead, it traces one ray (Green) and simply mathematically offsets the lookup coordinates slightly for Red and Blue. Extremely fast, yielding 80% of the visual quality of the true implementation.
*   **Bounce Caps**: Bounces are passed as a dynamically updated uniform. Users on weaker devices can decrease `bounces` from 5 to 2, heavily capping the GPU workload loop without breaking the visuals completely.

## 4. UI Rendering Optimization
*   `useFrame` over State Hooks: Instead of storing camera matrices in `useState` (which triggers widespread React virtual DOM diffing and re-renders 60 times a second), the `useFrame` hook acts strictly on references. By calling `material.uniforms.X.value.copy()`, it avoids triggering React's reconcile cycle entirely, operating smoothly behind the scenes.
*   `Leva` integration allows modifying debugging uniforms natively outside the component tree.

## 5. Texture Memory and Compression
Environment maps are converted from raw Equirectangular textures to PMREM DataTextures via `THREE.PMREMGenerator` upon load. PMREM compresses massive 4K HDRI images down to manageable mip-mapped reflection approximations that consume a fraction of VRAM.
