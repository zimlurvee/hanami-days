import * as THREE from 'three'

let tex: THREE.Texture | null = null

/** The grass ground texture (NewGrass_2 by Joaquito, public/textures/grass.jpg). */
export function getGrassTexture(): THREE.Texture {
  if (tex) return tex
  tex = new THREE.TextureLoader().load('/textures/grass.jpg?v=2')
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** Shader patch: grass-coloured, upward-facing surfaces get the texture in world space (every ~6.7 m). */
export function patchGrass(shader: { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string }) {
  shader.uniforms.uGrass = { value: getGrassTexture() }
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vGWorld;\nvarying float vGUp;')
    .replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vec4 gwp = vec4(transformed, 1.0);
      vec4 gwn = vec4(objectNormal, 0.0);
      #ifdef USE_INSTANCING
        gwp = instanceMatrix * gwp;
        gwn = instanceMatrix * gwn;
      #endif
      vGWorld = (modelMatrix * gwp).xyz;
      vGUp = (modelMatrix * gwn).y;`,
    )
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform sampler2D uGrass;\nvarying vec3 vGWorld;\nvarying float vGUp;')
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      {
        float grassy = step(diffuseColor.r * 1.1, diffuseColor.g) * step(diffuseColor.b * 1.25, diffuseColor.g) * step(0.9, vGUp);
        vec3 gt = texture2D(uGrass, vGWorld.xz * 0.15).rgb * 1.2;
        diffuseColor.rgb = mix(diffuseColor.rgb, gt, grassy);
      }`,
    )
}
