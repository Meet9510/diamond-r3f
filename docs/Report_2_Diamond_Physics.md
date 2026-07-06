# Report 2: Diamond Physics Report

## Introduction
Standard WebGL relies on superficial rasterization, meaning a material only cares about the outer "shell" of an object. This results in diamonds looking like hollow glass. This system abandons rasterized transparency and instead simulates optical physics.

## 1. Index of Refraction (IOR)
**Physics Concept**: IOR measures how much light "bends" when transitioning from air into a dense medium. Water is ~1.33, Glass is ~1.5. Diamonds possess an incredibly high IOR of **2.417**.
**Implementation**: Inside the `DiamondBVHMaterial` shader, the `refract()` function inherently uses the uniform variable `ior`. Because the IOR is so high, light enters the top of the diamond, bends sharply toward the center, and hits the bottom facets at steep angles.

## 2. Total Internal Reflection (TIR)
**Physics Concept**: Because of the extreme IOR, when light hits the inside of a bottom facet, it is unable to escape horizontally. Instead, it acts as a perfect mirror, bouncing back up. This is TIR.
**Implementation**: The `for` loop inside `totalInternalReflection()` handles this. It casts rays against the Bounding Volume Hierarchy (`bvhIntersectFirstHit`). If the dot product of the outgoing ray yields a reflection instead of a refraction (`length(refract(ray, normal, ior)) == 0.0`), the system reflects the ray and continues the loop until the escape condition is met or the `bounces` uniform limit is hit. 

## 3. Dispersion (`aberrationStrength`)
**Physics Concept**: Different colors (wavelengths) of light bend slightly differently. This splits white light into rainbows (fire).
**Implementation**: When `fastChroma` is disabled, the shader literally traces the internal path three separate times using three slightly altered IOR values (`ior * (1.0 - aberration)`, `ior`, `ior * (1.0 + aberration)`). It applies these exact hits to the R, G, and B color channels respectively, achieving true physical chromatic aberration.

## 4. Sparkle Simulation & Table Reflections
**Physics Concept**: A brilliant-cut diamond has flat top faces (the Table and Crown) designed to capture bright overhead lights and flash them abruptly at the viewer.
**Implementation**: 
- A specialized environment map (`getStudioStripTexture()`) uses extremely bright data values specifically positioned to hit the crown.
- `crownStrength` uses a Fresnel calculation (`pow(1.0 - NdotV, 4.0)`) combined with direct normal reflection (`reflect(-V, N)`) to inject an intense white specular flash atop the darker colored internal volume.

## 5. BVH Acceleration Logic
Without the `three-mesh-bvh` package, calculating where a ray hits a million-triangle mesh would reduce frame rates to less than 1 FPS. BVH pre-sorts the triangles into shrinking 3D boxes. The shader only checks boxes that the ray physically intersects with, massively optimizing the O(N) lookup problem to O(log N).
