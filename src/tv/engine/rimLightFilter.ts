import { Filter, GlProgram, GpuProgram, UniformGroup, defaultFilterVert } from 'pixi.js';

/**
 * Rim light (ULTRA): brightens a rig's edge on the side facing the scene's light, so characters sit in the
 * background instead of looking pasted on. A pixel is lit when the way toward the light (`dir`, screen space,
 * y down) is empty at both sample distances, so only the outermost texels facing it catch light. It only adds colour inside the silhouette, so it chains
 * before the monster outline. `width` is in backbuffer texels: keep it at ~1 stage px × render resolution.
 */
const FRAG = /* glsl */ `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform highp vec4 uInputSize;
uniform highp vec4 uInputClamp;
uniform vec3 uColor;
uniform vec2 uDir;
uniform float uWidth;
uniform float uStrength;

float a(float k) {
  return texture(uTexture, clamp(vTextureCoord + uDir * uWidth * k * uInputSize.zw, uInputClamp.xy, uInputClamp.zw)).a;
}

void main() {
  vec4 src = texture(uTexture, vTextureCoord);
  float open = 1.0 - max(a(0.6), a(1.0));
  float rim = smoothstep(0.35, 0.9, open) * src.a * uStrength;
  finalColor = vec4(min(src.rgb + uColor * rim, vec3(src.a)), src.a);
}
`;

const WGSL = /* wgsl */ `
struct GlobalFilterUniforms {
  uInputSize: vec4<f32>,
  uInputPixel: vec4<f32>,
  uInputClamp: vec4<f32>,
  uOutputFrame: vec4<f32>,
  uGlobalFrame: vec4<f32>,
  uOutputTexture: vec4<f32>,
};
struct RimUniforms {
  uColor: vec3<f32>,
  uDir: vec2<f32>,
  uWidth: f32,
  uStrength: f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> rimUniforms: RimUniforms;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn mainVertex(@location(0) aPosition: vec2<f32>) -> VSOutput {
  var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;
  position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;
  return VSOutput(vec4(position, 0.0, 1.0), aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw));
}

fn a(uv: vec2<f32>, k: f32) -> f32 {
  let o = rimUniforms.uDir * rimUniforms.uWidth * k * gfu.uInputSize.zw;
  return textureSample(uTexture, uSampler, clamp(uv + o, gfu.uInputClamp.xy, gfu.uInputClamp.zw)).a;
}

@fragment
fn mainFragment(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let src = textureSample(uTexture, uSampler, uv);
  let open = 1.0 - max(a(uv, 0.6), a(uv, 1.0));
  let rim = smoothstep(0.35, 0.9, open) * src.a * rimUniforms.uStrength;
  return vec4(min(src.rgb + rimUniforms.uColor * rim, vec3(src.a)), src.a);
}
`;

export class RimLightFilter extends Filter {
  constructor() {
    super({
      glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment: FRAG, name: 'kk-rim-light' }),
      gpuProgram: GpuProgram.from({
        vertex: { source: WGSL, entryPoint: 'mainVertex' },
        fragment: { source: WGSL, entryPoint: 'mainFragment' },
      }),
      resources: {
        rimUniforms: new UniformGroup({
          uColor: { value: new Float32Array([1, 1, 1]), type: 'vec3<f32>' },
          uDir: { value: new Float32Array([0, -1]), type: 'vec2<f32>' },
          uWidth: { value: 6, type: 'f32' },
          uStrength: { value: 0.6, type: 'f32' },
        }),
      },
      // The light may come from outside the rig's bounds: pad so the samples toward it read empty, not clamped edge
      padding: 3,
      resolution: 'inherit',
    });
  }

  private get u() {
    return this.resources.rimUniforms.uniforms;
  }

  /** The scene light: colour, and the screen-space direction it comes from (normalised here). */
  setLight(color: number, dx: number, dy: number, strength: number): void {
    const c = this.u.uColor as Float32Array;
    c[0] = ((color >> 16) & 0xff) / 255;
    c[1] = ((color >> 8) & 0xff) / 255;
    c[2] = (color & 0xff) / 255;
    const len = Math.hypot(dx, dy) || 1;
    const d = this.u.uDir as Float32Array;
    d[0] = dx / len;
    d[1] = dy / len;
    this.u.uStrength = strength;
  }

  set width(texels: number) {
    this.u.uWidth = texels;
  }
}
