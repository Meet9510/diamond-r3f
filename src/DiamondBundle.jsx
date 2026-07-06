/**
 * ============================================================================
 * DiamondBundle.jsx
 * ============================================================================
 * 
 * FILE PURPOSE:
 * This component handles the high-fidelity rendering aspect of the jewelry gems.
 * It provides a fully custom implementation of a `ShaderMaterial` designed 
 * exclusively for deep, premium diamond rendering (simulating the illusion of a 
 * diamond rather than just treating it as glass).
 * 
 * SYSTEM ROLE:
 * When invoked in `App.jsx`, this acts as the "paint" applied to the 3D 
 * geometry faces of diamonds, rubies, and sapphires. 
 * 
 * DEPENDENCIES:
 * - @react-three/fiber: To hook into the render loop (`useFrame`).
 * - three-mesh-bvh: To calculate hardware-accelerated BVH ray intersections.
 * - three: Core engine.
 * ============================================================================
 */
import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { BVHShaderGLSL } from 'three-mesh-bvh'

/**
 * COMPONENT: DiamondBundle
 * 
 * What it does:
 * Generates a reactive `ShaderMaterial` and attaches it to its parent mesh. 
 * It manages passing continuous state updates (like `camera.matrixWorld`) 
 * securely down to the GPU shaders.
 * 
 * Inputs (Props):
 * @param {Object} bvh - The computed bounding volume hierarchy structure matching the mesh.
 * @param {Texture} envMap - The 360-degree PMREM environment map used for lighting.
 * @param {number} bounces - Number of internal light reflections (e.g. 3 to 5).
 * @param {number} ior - Index of Refraction (Bend strength of the material, e.g. 2.4 for Diamond).
 * @param {THREE.Color} color - The base tint of the gemstone.
 * @param {boolean} fastChroma - Performance toggle for chromatic aberration.
 * @param {number} aberrationStrength - The dispersion intensity (rainbow fire splits).
 * @param {number} envIntensity - Overall brightness multiplier.
 * @param {number} colorSaturation - Controls if gem is white (0) or colored (1).
 * @param {number} colorRichness - Amplifies color vibrancy.
 * @param {number} crownStrength - Strength of the top-surface sharp reflections.
 */
export function DiamondBundle({
    bvh,
    envMap,
    bounces = 3,
    ior = 2.4,
    color = new THREE.Color(1, 1, 1),
    fastChroma = false,
    aberrationStrength = 0.01,
    envIntensity = 1.2,
    colorSaturation = 0.65,
    colorRichness = 1.8,
    crownStrength = 0.45,
    ...props
}) {
    const { camera, size } = useThree()

    // Create the material exactly as done in the three-mesh-bvh example
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                // scene / geometry information
                envMap: { value: envMap },
                bvh: { value: bvh },
                projectionMatrixInv: { value: camera.projectionMatrixInverse },
                viewMatrixInv: { value: camera.matrixWorld },
                resolution: { value: new THREE.Vector2(size.width, size.height) },

                // internal reflection settings
                bounces: { value: bounces },
                ior: { value: ior },

                // color settings
                color: { value: new THREE.Color(color) },
                fastChroma: { value: fastChroma },
                aberrationStrength: { value: aberrationStrength },

                // Brightness multiplier after tone compression
                envIntensity: { value: envIntensity },

                // colorSaturation: 0=pure white diamond, 1=fully saturated gem
                // At 0.65 a red gem still shows ~35% of the blue/green env reflections
                // This is why real rubies/sapphires show facet detail THROUGH the color
                colorSaturation: { value: 0.65 },

                // colorRichness: amplifies the gem color before mixing
                // Keeps the gem color vivid even at moderate saturation levels
                colorRichness: { value: 1.8 },

                // crownStrength: how strong the top-surface Fresnel highlight is
                // Creates the bright rim + dark table pattern of brilliant-cut diamonds
                crownStrength: { value: 0.45 },
            },
            vertexShader: /*glsl*/ `
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                uniform mat4 viewMatrixInv;
                void main() {
                    vWorldPosition = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
                    vNormal = ( viewMatrixInv * vec4( normalMatrix * normal, 0.0 ) ).xyz;
                    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4( position , 1.0 );
                }
            `,
            fragmentShader: /*glsl*/ `
                #define RAY_OFFSET 0.001

                #include <common>
                precision highp isampler2D;
                precision highp usampler2D;

                ${BVHShaderGLSL.common_functions}
                ${BVHShaderGLSL.bvh_struct_definitions}
                ${BVHShaderGLSL.bvh_ray_functions}

                varying vec3 vWorldPosition;
                varying vec3 vNormal;

                uniform sampler2D envMap;
                uniform float bounces;
                uniform BVH bvh;
                uniform float ior;
                uniform vec3 color;
                uniform bool fastChroma;
                uniform mat4 projectionMatrixInv;
                uniform mat4 viewMatrixInv;
                uniform mat4 modelMatrix;
                uniform vec2 resolution;
                uniform float aberrationStrength;
                uniform float envIntensity;

                // Gem color controls
                uniform float colorSaturation;  // 0=white gem, 1=fully saturated colored gem
                uniform float colorRichness;     // color amplifier before mixing (default 1.8)
                uniform float crownStrength;     // top-surface Fresnel highlight intensity

                #include <cube_uv_reflection_fragment>

                // performs an iterative bounce lookup modeling internal reflection and returns
                // a final ray direction.
                vec3 totalInternalReflection( vec3 incomingOrigin, vec3 incomingDirection, vec3 normal, float ior, mat4 modelMatrixInverse ) {
                    vec3 rayOrigin = incomingOrigin;
                    vec3 rayDirection = incomingDirection;

                    // refract the ray direction on the way into the diamond and adjust offset from
                    // the diamond surface for raytracing
                    rayDirection = refract( rayDirection, normal, 1.0 / ior );
                    rayOrigin = vWorldPosition + rayDirection * RAY_OFFSET;

                    // transform the ray into the local coordinates of the model
                    rayOrigin = ( modelMatrixInverse * vec4( rayOrigin, 1.0 ) ).xyz;
                    rayDirection = normalize( ( modelMatrixInverse * vec4( rayDirection, 0.0 ) ).xyz );

                    // perform multiple ray casts
                    for( float i = 0.0; i < bounces; i ++ ) {
                        // results
                        uvec4 faceIndices = uvec4( 0u );
                        vec3 faceNormal = vec3( 0.0, 0.0, 1.0 );
                        vec3 barycoord = vec3( 0.0 );
                        float side = 1.0;
                        float dist = 0.0;

                        // perform the raycast
                        // the diamond is a water tight model so we assume we always hit a surface
                        bvhIntersectFirstHit( bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist );

                        // derive the new ray origin from the hit results
                        vec3 hitPos = rayOrigin + rayDirection * dist;

                        // if we don't internally reflect then end the ray tracing and sample
                        vec3 refractedDirection = refract( rayDirection, faceNormal, ior );
                        bool totalInternalReflectionHit = length( refract( rayDirection, faceNormal, ior ) ) == 0.0;
                        if ( ! totalInternalReflectionHit ) {
                            rayDirection = refractedDirection;
                            break;
                        }

                        // otherwise reflect off the surface internally for another hit
                        rayDirection = reflect( rayDirection, faceNormal );
                        rayOrigin = hitPos + rayDirection * RAY_OFFSET;
                    }

                    // return the final ray direction in world space
                    return normalize( ( modelMatrix * vec4( rayDirection, 0.0 ) ).xyz );
                }

                vec4 envSample( sampler2D envMap, vec3 rayDirection ) {
                    vec2 uvv = equirectUv( rayDirection );
                    return texture2D( envMap, uvv );
                }

                void main() {
                    mat4 modelMatrixInverse = inverse( modelMatrix );
                    vec2 uv = gl_FragCoord.xy / resolution;

                    vec3 normal = vNormal;
                    vec3 viewDir = normalize( vWorldPosition - cameraPosition );
                    vec3 rayOrigin = cameraPosition;
                    vec3 rayDirection = viewDir;

                    // ━━ Step 1: BVH ray trace — get internal env color ━━━━━━━━━━━━━━━
                    vec3 envColor;

                    if ( aberrationStrength != 0.0 ) {
                        vec3 rayDirectionG = totalInternalReflection( rayOrigin, rayDirection, normal, max( ior, 1.0 ), modelMatrixInverse );
                        vec3 rayDirectionR, rayDirectionB;

                        if ( fastChroma ) {
                            rayDirectionR = normalize( rayDirectionG + 1.0 * vec3( aberrationStrength / 2.0 ) );
                            rayDirectionB = normalize( rayDirectionG - 1.0 * vec3( aberrationStrength / 2.0 ) );
                        } else {
                            float iorR = max( ior * ( 1.0 - aberrationStrength ), 1.0 );
                            float iorB = max( ior * ( 1.0 + aberrationStrength ), 1.0 );
                            rayDirectionR = totalInternalReflection( rayOrigin, rayDirection, normal, iorR, modelMatrixInverse );
                            rayDirectionB = totalInternalReflection( rayOrigin, rayDirection, normal, iorB, modelMatrixInverse );
                        }

                        float r = envSample( envMap, rayDirectionR ).r;
                        float g = envSample( envMap, rayDirectionG ).g;
                        float b = envSample( envMap, rayDirectionB ).b;
                        envColor = vec3( r, g, b );
                    } else {
                        rayDirection = totalInternalReflection( rayOrigin, rayDirection, normal, max( ior, 1.0 ), modelMatrixInverse );
                        envColor = envSample( envMap, rayDirection ).rgb;
                    }

                    // ━━ Step 2: Reinhard tone compression ━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    // Prevents large gems from blowing out vs small gems.
                    // The formula x/(x+1) gently squeezes HDR → 0..1 range.
                    envColor = envColor / ( envColor + vec3(1.0) );

                    // ━━ Step 3: Physically-Based Color Absorption ━━━━━━━━━━━━━━━━━━━━
                    // Instead of multiplying (which turns gems black in sharp HDRs)
                    // we extract the luminance (brightness/sparkle) of the HDR reflection
                    // and re-tint that brightness with the gem color.
                    float lum = dot(envColor, vec3(0.299, 0.587, 0.114));
                    
                    // The 'pure' color of the gem when fully saturated
                    vec3 pureTint = mix(vec3(1.0), color, colorSaturation);
                    
                    // We blend the raw tinted environment with a strictly luminous tint
                    // The colorRichness pushes the vibrancy without blowing out white bounds
                    vec3 tintedColor = mix(
                        envColor * pureTint, 
                        pureTint * lum * colorRichness, 
                        colorSaturation
                    );

                    // ━━ Step 4: User Requested Direct Crown Reflection ━━━━━━━━━━━━━
                    vec3 N = normalize(normal);
                    vec3 V = normalize(-viewDir); // Surface to camera
                    
                    float NdotV = max(dot(N, V), 0.0);
                    
                    // ---- 1️⃣ DIRECT CROWN REFLECTION ----
                    vec3 crownReflectDir = reflect(-V, N);
                    vec3 wReflect = normalize((modelMatrixInverse * vec4(crownReflectDir, 0.0)).xyz);
                    vec2 uvvReflect = equirectUv(wReflect);
                    vec3 crownReflection = texture2D(envMap, uvvReflect).rgb;
                    
                    // Stronger only at normal incidence + grazing (not all the time)
                    float crownWeight = smoothstep(0.5, 1.0, NdotV) * 0.35;
                    
                    // ---- 2️⃣ INTERNAL VOLUME ----
                    vec3 internalColor = tintedColor * envIntensity;
                    
                    // ---- 3️⃣ FRESNEL EDGE (grazing-angle sparkle) ----
                    float F = pow(1.0 - NdotV, 4.0);
                    
                    // ---- FINAL MIX ----
                    // Internal volume dominates; crown adds the bright white table mirror
                    vec3 finalColor = mix(internalColor, crownReflection, crownWeight);
                    // Fresnel edge adds sharp rim reflection
                    finalColor += crownReflection * F * 0.3;
                    
                    gl_FragColor.rgb = finalColor;
                    gl_FragColor.a = 1.0;

                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                }
            `,
        })
    }, [])

    // Hook: useFrame (Runs 60 times a second)
    // What it does:
    // Pushes real-time user selections (Leva sliders / React States) directly 
    // down into the GPU shader memory (Material Uniforms).
    // Specifically must track the active camera matrix to project vectors out accurately.
    useFrame(() => {
        if (!material) return

        material.uniforms.envMap.value = envMap
        material.uniforms.bvh.value = bvh
        material.uniforms.bounces.value = bounces
        material.uniforms.ior.value = ior
        material.uniforms.color.value.set(color)
        material.uniforms.fastChroma.value = fastChroma
        material.uniforms.aberrationStrength.value = aberrationStrength
        material.uniforms.envIntensity.value = envIntensity
        material.uniforms.colorSaturation.value = colorSaturation
        material.uniforms.colorRichness.value = colorRichness
        material.uniforms.crownStrength.value = crownStrength

        // Essential: Keep inverses perfectly updated every frame based on the active camera view
        material.uniforms.projectionMatrixInv.value.copy(camera.projectionMatrixInverse)
        material.uniforms.viewMatrixInv.value.copy(camera.matrixWorld)
        material.uniforms.resolution.value.set(size.width, size.height)
    })

    return <primitive object={material} attach="material" {...props} />

}
