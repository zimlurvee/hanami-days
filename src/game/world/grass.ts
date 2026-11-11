import * as THREE from 'three'

let tex: THREE.Texture | null = null

/** A seamless grass texture drawn at start-up (original artwork, no files). Drop a file at /textures/grass.jpg to replace it. */
export function getGrassTexture(): THREE.Texture {
  if (tex) return tex
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = 'rgb(150,160,140)'
  g.fillRect(0, 0, S, S)
  // Deterministic pseudo-random so the texture is the same every run
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * S, y = rnd() * S
    const len = 5 + rnd() * 9
    const a = -Math.PI / 2 + (rnd() - 0.5) * 1.5
    const shade = 95 + Math.floor(rnd() * 130)
    g.strokeStyle = `rgb(${Math.floor(shade * 0.85)},${shade},${Math.floor(shade * 0.72)})`
    g.lineWidth = 1 + rnd() * 1.2
    // Draw wrapped copies so the edges tile
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      g.beginPath()
      g.moveTo(x + ox, y + oy)
      g.quadraticCurveTo(x + ox + Math.cos(a) * len * 0.5 + 2, y + oy + Math.sin(a) * len * 0.5, x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len)
      g.stroke()
    }
  }
  tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  new THREE.TextureLoader().load(
    '/textures/grass.jpg',
    (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      if (tex) { tex.image = t.image; tex.needsUpdate = true }
    },
    undefined,
    () => { /* no custom texture: keep the generated one */ },
  )
  return tex
}

/** Shader patch: grass-coloured, upward-facing surfaces get the texture in world space (every 4 m). */
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
        vec3 gt = texture2D(uGrass, vGWorld.xz * 0.25).rgb * 1.75;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * gt, grassy);
      }`,
    )
}
