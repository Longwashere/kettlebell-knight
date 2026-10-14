import { Filter, GlProgram, GpuProgram, UniformGroup, defaultFilterVert } from 'pixi.js';

/**
 * 1px silhouette outline, drawn behind the sprite's own pixels. Applied to a Spine rig it traces the whole
 * assembled body (not each attachment), so monsters read against busy backgrounds. The stage renders at
 * resolution 1, so one input texel is one native 426×240 pixel and the line stays pixel-crisp.
 *
 * Cost: one extra render-target pass the size of the rig's bounds (~100×100 px on the TV), per outlined rig.
 */
const FRAG = /* glsl */ `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform highp vec4 uInputSize;
uniform highp vec4 uInputClamp;
uniform vec3 uColor;
uniform float uAlpha;

float a(vec2 o) {
  return texture(uTexture, clamp(vTextureCoord + o * uInputSize.zw, uInputClamp.xy, uInputClamp.zw)).a;
}

void main() {
  vec4 src = texture(uTexture, vTextureCoord);
  float edge = max(max(max(a(vec2(1.0, 0.0)), a(vec2(-1.0, 0.0))), max(a(vec2(0.0, 1.0)), a(vec2(0.0, -1.0)))),
                   0.7 * max(max(a(vec2(1.0, 1.0)), a(vec2(-1.0, 1.0))), max(a(vec2(1.0, -1.0)), a(vec2(-1.0, -1.0)))));
  float o = smoothstep(0.15, 0.6, edge) * uAlpha;
  // Premultiplied "src over outline".
  finalColor = src + vec4(uColor * o, o) * (1.0 - src.a);
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
struct OutlineUniforms {
  uColor: vec3<f32>,
  uAlpha: f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> outlineUniforms: OutlineUniforms;

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

fn a(uv: vec2<f32>, o: vec2<f32>) -> f32 {
  return textureSample(uTexture, uSampler, clamp(uv + o * gfu.uInputSize.zw, gfu.uInputClamp.xy, gfu.uInputClamp.zw)).a;
}

@fragment
fn mainFragment(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let src = textureSample(uTexture, uSampler, uv);
  let edge = max(max(max(a(uv, vec2(1.0, 0.0)), a(uv, vec2(-1.0, 0.0))), max(a(uv, vec2(0.0, 1.0)), a(uv, vec2(0.0, -1.0)))),
                 0.7 * max(max(a(uv, vec2(1.0, 1.0)), a(uv, vec2(-1.0, 1.0))), max(a(uv, vec2(1.0, -1.0)), a(uv, vec2(-1.0, -1.0)))));
  let o = smoothstep(0.15, 0.6, edge) * outlineUniforms.uAlpha;
  return src + vec4(outlineUniforms.uColor * o, o) * (1.0 - src.a);
}
`;

export interface OutlineOptions {
  color?: number;
  opacity?: number;
}

export class OutlineFilter extends Filter {
  constructor({ color = 0x0f0e17, opacity = 1 }: OutlineOptions = {}) {
    super({
      glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment: FRAG, name: 'kk-outline' }),
      gpuProgram: GpuProgram.from({
        vertex: { source: WGSL, entryPoint: 'mainVertex' },
        fragment: { source: WGSL, entryPoint: 'mainFragment' },
      }),
      resources: {
        outlineUniforms: new UniformGroup({
          uColor: { value: new Float32Array(3), type: 'vec3<f32>' },
          uAlpha: { value: opacity, type: 'f32' },
        }),
      },
      padding: 1,
      resolution: 1,
    });
    this.color = color;
  }

  set color(hex: number) {
    const c = this.resources.outlineUniforms.uniforms.uColor as Float32Array;
    c[0] = ((hex >> 16) & 0xff) / 255;
    c[1] = ((hex >> 8) & 0xff) / 255;
    c[2] = (hex & 0xff) / 255;
  }

  get opacity(): number {
    return this.resources.outlineUniforms.uniforms.uAlpha;
  }

  set opacity(v: number) {
    this.resources.outlineUniforms.uniforms.uAlpha = v;
  }
}
