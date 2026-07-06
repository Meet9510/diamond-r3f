/**
 * ============================================================================
 * DiamondBVHMaterial.jsx
 * ============================================================================
 * 
 * FILE PURPOSE:
 * This file defines a raw Three.js `ShaderMaterial` designed specifically to 
 * simulate diamond light physics in real-time. It provides the backbone for the 
 * `DiamondBundle` component used in the main app.
 * 
 * SYSTEM ROLE:
 * It acts as the physics engine for individual gemstones. By utilizing the 
 * `three-mesh-bvh` library, it casts virtual light rays into the 3D model, 
 * calculates how they bounce inside (Total Internal Reflection), and determines 
 * the final color based on the environment map.
 * 
 * DEPENDENCIES:
 * - react, @react-three/fiber
 * - three
 * - three-mesh-bvh (Critical for fast raytracing)
 * ============================================================================
 */

import React, { forwardRef } from 'react'
import * as THREE from 'three'
import { extend } from '@react-three/fiber'
import { BVHShaderGLSL } from 'three-mesh-bvh'

/**
 * VERTEX SHADER (`DIAMOND_VERT`)
 * 
 * What it does: 
 * Calculates the classic 3D positions of the gem's vertices on the screen.
 * 
 * When it runs: 
 * Once per vertex for every frame rendered.
 * 
 * Outputs:
 * - `vWorldPosition`: The absolute position of the vertex in the scene.
 * - `vNormal`: The direction the vertex is facing (used for light refraction).
 */
export const DIAMOND_VERT = /* glsl */ `
    out vec3 vWorldPosition;
    out vec3 vNormal;
    uniform mat4 viewMatrixInv;
    void main() {
        vWorldPosition = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
        vNormal = ( viewMatrixInv * vec4( normalMatrix * normal, 0.0 ) ).xyz;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4( position , 1.0 );
    }
`

/**
 * FRAGMENT SHADER (`DIAMOND_FRAG`)
 * 
 * What it does:
 * Calculates the exact pixel color for the diamond surface. This is where 
 * the actual raytracing physics happen.
 * 
 * Physics Implemented:
 * 1. Index of Refraction (IOR): Bends the light as it enters the stone.
 * 2. Total Internal Reflection (TIR): Bounces the ray inside the stone up to `bounces` times.
 * 3. Dispersion (`aberrationStrength`): Splitting light into Red, Green, and Blue rays.
 */

export const DIAMOND_FRAG = /* glsl */ `
    #define RAY_OFFSET 0.001
    precision highp float;
    precision highp int;
    precision highp isampler2D;
    precision highp usampler2D;

    #include <common>

    // BVH snippets
    ${BVHShaderGLSL.common_functions}
    ${BVHShaderGLSL.bvh_struct_definitions}
    ${BVHShaderGLSL.bvh_ray_functions}

    in vec3 vWorldPosition;
    in vec3 vNormal;

    uniform sampler2D bvhEnvMap;
    uniform float bounces;
    uniform BVH bvh;
    uniform float ior;
    uniform vec3 color;
    uniform bool fastChroma;
    uniform mat4 viewMatrixInv;
    uniform mat4 modelMatrixInverse;
    uniform vec2 resolution;
    uniform float aberrationStrength;

    // Helper: Converts a 3D ray direction into 2D UV coordinates 
    // to sample color from the Equirectangular (spherical) environment map.
    vec2 diamondEquirectUv( vec3 dir ) {
        float phi = acos( clamp( dir.y, -1.0, 1.0 ) );
        float theta = atan( dir.z, dir.x ) + PI;
        return vec2( theta / ( 2.0 * PI ), phi / PI );
    }

    // Helper: Looks up the light/color from the environment map.
    vec4 envSample( sampler2D tex, vec3 rayDirection ) {
        vec2 uvv = diamondEquirectUv( rayDirection );
        return texture2D( tex, uvv );
    }

    /**
     * CORE PHYSICS ENGINE: totalInternalReflection
     * 
     * What it does: Traverses a virtual light ray through the diamond volume.
     * When it runs: For every pixel drawn on the diamond.
     * 
     * Inputs:
     * - incomingOrigin / incomingDirection: Where the light ray starts and points.
     * - normal: The surface angle.
     * - ior: Index of Refraction (density of the gem).
     * 
     * Returns:
     * - The final outward direction of the ray after bouncing internally. 
     *   This direction is then used to look up against the environment map.
     */
    vec3 totalInternalReflection( vec3 incomingOrigin, vec3 incomingDirection, vec3 normal, float ior, mat4 modelInv ) {
        vec3 rayOrigin = incomingOrigin;
        vec3 rayDirection = incomingDirection;

        // refract the ray direction on the way into the diamond and adjust offset from
        // the diamond surface for raytracing
        rayDirection = refract( rayDirection, normal, 1.0 / ior );
        rayOrigin = vWorldPosition + rayDirection * RAY_OFFSET;

        // transform the ray into the local coordinates of the model
        rayOrigin = ( modelInv * vec4( rayOrigin, 1.0 ) ).xyz;
        rayDirection = normalize( ( modelInv * vec4( rayDirection, 0.0 ) ).xyz );

        // perform multiple ray casts
        for( float i = 0.0; i < 10.0; i ++ ) {
            if (i >= bounces) break;

            // results
            uvec4 faceIndices = uvec4( 0u );
            vec3 faceNormal = vec3( 0.0, 0.0, 1.0 );
            vec3 barycoord = vec3( 0.0 );
            float side = 1.0;
            float dist = 0.0;

            // perform the raycast
            bvhIntersectFirstHit( bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist );

            // derive the new ray origin from the hit results
            vec3 hitPos = rayOrigin + rayDirection * dist;

            // if we don't internally reflect then end the ray tracing and sample
            vec3 refractedDirection = refract( rayDirection, faceNormal, ior );
            bool isTir = length( refract( rayDirection, faceNormal, ior ) ) == 0.0;
            if ( ! isTir ) {
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

    void main() {
        vec3 normal = vNormal;
        vec3 rayOrigin = cameraPosition;
        vec3 rayDirection = normalize( vWorldPosition - cameraPosition );
        vec4 baseColor = vec4(0.0);

        if ( aberrationStrength != 0.0 ) {
            // perform chromatic aberration lookups
            vec3 rayDirectionG = totalInternalReflection( rayOrigin, rayDirection, normal, max( ior, 1.0 ), modelMatrixInverse );
            vec3 rayDirectionR, rayDirectionB;

            if ( fastChroma ) {
                // fast chroma does a quick uv offset on lookup
                rayDirectionR = normalize( rayDirectionG + 1.0 * vec3( aberrationStrength / 2.0 ) );
                rayDirectionB = normalize( rayDirectionG - 1.0 * vec3( aberrationStrength / 2.0 ) );
            } else {
                // compared to a proper ray trace of diffracted rays
                float iorR = max( ior * ( 1.0 - aberrationStrength ), 1.0 );
                float iorB = max( ior * ( 1.0 + aberrationStrength ), 1.0 );
                rayDirectionR = totalInternalReflection( rayOrigin, rayDirection, normal, iorR, modelMatrixInverse );
                rayDirectionB = totalInternalReflection( rayOrigin, rayDirection, normal, iorB, modelMatrixInverse );
            }

            // get the color lookup
            float r = envSample( bvhEnvMap, rayDirectionR ).r;
            float g = envSample( bvhEnvMap, rayDirectionG ).g;
            float b = envSample( bvhEnvMap, rayDirectionB ).b;
            baseColor.rgb = vec3( r, g, b ) * color;
            baseColor.a = 1.0;
        } else {
            // no chromatic aberration lookups
            rayDirection = totalInternalReflection( rayOrigin, rayDirection, normal, max( ior, 1.0 ), modelMatrixInverse );
            baseColor.rgb = envSample( bvhEnvMap, rayDirection ).rgb * color;
            baseColor.a = 1.0;
        }
        
        gl_FragColor = baseColor;
        
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }

`

/**
 * Class: DiamondBVHMaterialImpl
 * Extends: THREE.ShaderMaterial
 * 
 * What it does:
 * Wraps the raw GLSL shaders (`DIAMOND_VERT`, `DIAMOND_FRAG`) into a usable 
 * Three.js Material object. Handles injecting all uniform variables (data passed 
 * from JS CPU to GPU) such as `ior`, `bounces`, `color`, and the `bvh` tree.
 * 
 * Why it exists:
 * To provide a clean Javascript Class interface over complex shader language.
 */
class DiamondBVHMaterialImpl extends THREE.ShaderMaterial {
    constructor() {
        super({
            glslVersion: THREE.GLSL3,
            uniforms: {
                bvhEnvMap: { value: null }, // The 360 lighting texture
                bvh: { value: null },       // The calculated geometry volume tree
                bounces: { value: 3 },      // Max internal raycast bounces
                ior: { value: 2.4 },        // Index of refraction
                color: { value: new THREE.Color(1, 1, 1) }, // Base gem tint
                fastChroma: { value: false }, // Optimization flag for dispersion
                aberrationStrength: { value: 0.01 }, // RGB ray splitting strength
                modelMatrix: { value: new THREE.Matrix4() },
                modelMatrixInverse: { value: new THREE.Matrix4() },
                viewMatrixInv: { value: new THREE.Matrix4() },
                resolution: { value: new THREE.Vector2() },
            },
            vertexShader: DIAMOND_VERT,
            fragmentShader: DIAMOND_FRAG,
            transparent: true,
            side: THREE.DoubleSide, // Render both inside and outside of the gem surface
            depthWrite: false, // Match library
            depthTest: true,
        })
    }

    get bvhEnvMap() { return this.uniforms.bvhEnvMap.value }
    set bvhEnvMap(v) { this.uniforms.bvhEnvMap.value = v }

    get bvh() { return this.uniforms.bvh.value }
    set bvh(v) { this.uniforms.bvh.value = v }

    get bounces() { return this.uniforms.bounces.value }
    set bounces(v) { this.uniforms.bounces.value = v }

    get ior() { return this.uniforms.ior.value }
    set ior(v) { this.uniforms.ior.value = v }

    get color() { return this.uniforms.color.value }
    set color(v) { this.uniforms.color.value.set(v) }

    get fastChroma() { return this.uniforms.fastChroma.value }
    set fastChroma(v) { this.uniforms.fastChroma.value = v }

    get aberrationStrength() { return this.uniforms.aberrationStrength.value }
    set aberrationStrength(v) { this.uniforms.aberrationStrength.value = v }

    get modelMatrix() { return this.uniforms.modelMatrix.value }
    set modelMatrix(v) { this.uniforms.modelMatrix.value.copy(v) }

    get modelMatrixInverse() { return this.uniforms.modelMatrixInverse.value }
    set modelMatrixInverse(v) { this.uniforms.modelMatrixInverse.value.copy(v) }

    get viewMatrixInv() { return this.uniforms.viewMatrixInv.value }
    set viewMatrixInv(v) { this.uniforms.viewMatrixInv.value.copy(v) }

    get resolution() { return this.uniforms.resolution.value }
    set resolution(v) {
        if (v && v.set) this.uniforms.resolution.value.copy(v)
        else if (v && v.length === 2) this.uniforms.resolution.value.set(v[0], v[1])
    }
}

// Register the custom class into the React Three Fiber ecosystem
// so it can be used natively as `<diamondBVHMaterialImpl />` in JSX.
extend({ DiamondBVHMaterialImpl })

/**
 * React Component: DiamondBVHMaterial
 * 
 * What it does:
 * A seamless React wrapper around the instantiated physical shader material. 
 * Forwards any React props straight into the `uniforms` defined above.
 */
export const DiamondBVHMaterial = forwardRef((props, ref) => {
    return <diamondBVHMaterialImpl ref={ref} {...props} />
})
