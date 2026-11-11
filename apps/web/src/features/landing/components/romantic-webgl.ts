const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const fragmentSource = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_aspect;
void main() {
  vec2 uv = v_uv;
  vec2 p = (uv - 0.5) * vec2(u_aspect, 1.0);
  vec2 ptr = (u_pointer - 0.5) * 0.22;
  vec2 pos = p - ptr;
  float t = u_time * 0.32;
  float dist = length(pos * vec2(0.85, 1.08));

  // Dual-frequency organic flow field
  float flow1 = sin(pos.x * 2.8 + pos.y * 2.2 + sin(pos.y * 3.2 - t * 0.8) * 0.85 + t);
  float flow2 = cos(pos.y * 3.2 - pos.x * 2.4 + cos(pos.x * 2.6 + t * 0.7) * 0.75 - t * 0.9);

  // Billowing silk drape with chromatic phase dispersion
  float dR = sin((pos.x + 0.032) * 3.4 + pos.y * 1.9 + flow1 * 0.8 + t);
  float dG = sin(pos.x * 3.4 + pos.y * 1.9 + flow1 * 0.8 + t);
  float dB = sin((pos.x - 0.032) * 3.4 + pos.y * 1.9 + flow1 * 0.8 + t);

  float foldR = exp(-pow(dR * 2.5, 2.0));
  float foldG = exp(-pow(dG * 2.5, 2.0));
  float foldB = exp(-pow(dB * 2.5, 2.0));

  // Secondary diaphanous cross-veil
  float veil = exp(-pow(sin(pos.y * 3.8 - pos.x * 2.2 - t * 0.6 + flow2 * 0.7) * 2.4, 2.0));

  // Sinuous caustic ribbons (flowing liquid silk refractions)
  float stream1 = pos.x * 2.6 + pos.y * 1.8 + sin(pos.y * 3.2 - t * 0.7) * 0.42 + t * 0.25;
  float stream2 = pos.x * 1.9 - pos.y * 2.4 + cos(pos.x * 2.8 + t * 0.6) * 0.38 - t * 0.30;

  float caustR = pow(0.5 + 0.5 * sin((stream1 + 0.035) * 3.2), 7.0) + 0.5 * pow(0.5 + 0.5 * cos((stream2 + 0.03) * 3.0), 6.0);
  float caustG = pow(0.5 + 0.5 * sin(stream1 * 3.2), 7.0) + 0.5 * pow(0.5 + 0.5 * cos(stream2 * 3.0), 6.0);
  float caustB = pow(0.5 + 0.5 * sin((stream1 - 0.035) * 3.2), 7.0) + 0.5 * pow(0.5 + 0.5 * cos((stream2 - 0.03) * 3.0), 6.0);
  float caustic = (caustR + caustG + caustB) * 0.333;

  // Micro-specular diamond starlight glint
  float spark = pow(clamp(caustic * (0.5 + 0.5 * sin(pos.x * 24.0 + pos.y * 18.0 + t * 2.5)), 0.0, 1.0), 5.0);

  // Core luminous aura & ambient halo
  float coreAura = exp(-dist * dist * 4.4);
  float ambientBloom = exp(-dist * dist * 1.5);

  // Cool luxury palette: ruby rose, celestial amethyst, crystalline ice cyan, pearl blush, platinum
  vec3 c_deep = vec3(0.68, 0.07, 0.30);
  vec3 c_ruby = vec3(0.95, 0.22, 0.48);
  vec3 c_violet = vec3(0.68, 0.36, 0.96);
  vec3 c_cyan = vec3(0.32, 0.80, 0.98);
  vec3 c_blush = vec3(0.98, 0.88, 0.93);
  vec3 c_platinum = vec3(1.0, 1.0, 1.0);

  // Layered chromatic composition
  vec3 color = mix(c_blush, c_ruby, coreAura * 0.60);
  color = mix(color, c_violet, foldB * 0.45 + veil * 0.28 + caustB * 0.25);
  color = mix(color, c_cyan, foldG * 0.35 + caustG * 0.28);
  color = mix(color, c_deep, (1.0 - foldG) * caustic * 0.32);
  color = mix(color, c_ruby, foldR * 0.40 + caustR * 0.30);
  color += c_platinum * (spark * 0.65 + caustic * 0.35 + foldG * foldB * 0.20);

  // Seamless organic falloff
  float vignette = 1.0 - smoothstep(0.16, 0.70, dist);
  float edgeFade = smoothstep(0.0, 0.15, uv.x) * (1.0 - smoothstep(0.85, 1.0, uv.x))
                 * smoothstep(0.0, 0.12, uv.y) * (1.0 - smoothstep(0.88, 1.0, uv.y));

  float intensity = (coreAura * 0.68 + ambientBloom * 0.32 + (foldR + foldG + foldB) * 0.18 + veil * 0.15 + caustic * 0.25 + spark * 0.35);
  float alpha = clamp(intensity * vignette * edgeFade * 0.90, 0.0, 0.95);

  gl_FragColor = vec4(color * alpha, alpha);
}
`;

const borderFragmentSource = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_pointer;
uniform vec2 u_resolution;
void main() {
  vec2 p = v_uv * u_resolution;
  float edgeY = min(p.y, u_resolution.y - p.y);
  float edgeX = min(p.x, u_resolution.x - p.x);
  float corners = 1.0 - smoothstep(36.0, 64.0, edgeY);
  float edge = min(edgeY, edgeX + (1.0 - corners) * 100.0);
  float thread = exp(-edge * edge / 1.6);
  float halo = exp(-edge * edge / 30.0);
  float progress = clamp(u_time / 4.0, 0.0, 1.0);
  float head = mix(-120.0, u_resolution.x + 120.0, progress);
  float direction = p.y > u_resolution.y * 0.5 ? p.x : u_resolution.x - p.x;
  float distance = (direction - head) / 95.0;
  float sweep = exp(-distance * distance) * sin(progress * 3.14159);
  vec2 delta = (p - u_pointer * u_resolution) / vec2(100.0, 60.0);
  float touch = exp(-dot(delta, delta)) * 0.9;
  float glint = pow(0.5 + 0.5 * sin(p.x * 0.16 + u_time * 2.0), 14.0);
  float light = sweep + touch;
  float alpha = clamp((thread * 0.9 + halo * 0.22) * light, 0.0, 0.9);
  vec3 foil = mix(vec3(0.74, 0.07, 0.24), vec3(0.85, 0.90, 0.95), glint * 0.4 + thread * 0.6);
  gl_FragColor = vec4(foil * alpha, alpha);
}`;

const cardFragmentSource = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_pointer;
uniform vec2 u_resolution;
void main() {
  vec2 p = v_uv * u_resolution;
  vec2 halfSize = u_resolution * 0.5;
  vec2 q = abs(p - halfSize) - (halfSize - 12.0);
  float distance = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 10.0;
  if (abs(distance) > 12.0) {
    gl_FragColor = vec4(0.0);
    return;
  }
  float thread = exp(-distance * distance / 1.4);
  float outerHalo = exp(-max(distance, 0.0) * max(distance, 0.0) / 18.0);
  vec2 radial = (p - halfSize) / max(halfSize, 1.0);
  float angle = (atan(radial.y, radial.x) + 3.14159) / 6.28318;
  float progress = clamp(u_time / 4.0, 0.0, 1.0);
  float arc = abs(angle - progress);
  arc = min(arc, 1.0 - arc);
  float sweep = exp(-arc * arc / 0.0035) * (0.5 + 0.5 * sin(progress * 3.14159));

  // Chromatic dispersion offsets along the perimeter
  float sweepR = exp(-pow(arc - 0.012, 2.0) / 0.0035);
  float sweepG = exp(-pow(arc, 2.0) / 0.0035);
  float sweepB = exp(-pow(arc + 0.012, 2.0) / 0.0035);

  vec2 delta = (p - u_pointer * u_resolution) / 90.0;
  float touch = exp(-dot(delta, delta));
  float glint = pow(0.5 + 0.5 * sin(angle * 24.0 + u_time * 6.0), 10.0) * touch;
  float spark = pow(0.5 + 0.5 * cos(angle * 32.0 - u_time * 8.0), 16.0) * sweepG;

  float light = 0.16 + sweep * 1.1 + touch * 1.0 + glint * 0.5 + spark * 0.4;
  float alpha = clamp((thread * 0.95 + outerHalo * 0.35) * light, 0.0, 0.96);

  // Cool luxury chromatic foil palette
  vec3 c_deep = vec3(0.70, 0.08, 0.28);
  vec3 c_ruby = vec3(0.96, 0.18, 0.44);
  vec3 c_violet = vec3(0.68, 0.32, 0.95);
  vec3 c_cyan = vec3(0.35, 0.82, 0.98);
  vec3 c_platinum = vec3(1.0, 1.0, 1.0);

  vec3 foil = mix(c_deep, c_ruby, thread * 0.75);
  foil = mix(foil, c_violet, sweepB * 0.50);
  foil = mix(foil, c_cyan, sweepG * 0.42);
  foil = mix(foil, c_platinum, (sweepR * sweepG * 0.6 + glint * 0.7 + spark * 0.8) * thread);

  gl_FragColor = vec4(foil * alpha, alpha);
}`;

const journeyFragmentSource = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_phase;
uniform vec2 u_pointer;
uniform vec2 u_resolution;
void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  p -= (u_pointer - 0.5) * 0.08;
  float phase = u_phase * 0.65 + u_time * 0.08;
  float r = length(p * vec2(0.9, 1.05));
  float orbit = r - 0.34 + sin(p.y * 6.0 + phase) * 0.025;
  float thread = exp(-pow(orbit * 100.0, 2.0));
  float halo = exp(-pow(orbit * 14.0, 2.0));
  float ribbon = exp(-pow((p.y + 0.21 - sin(p.x * 5.2 - phase) * 0.055) * 90.0, 2.0));
  float light = 0.55 + 0.45 * sin(p.x * 8.0 - phase * 2.0);
  float sparks = 0.0;
  for (int i = 0; i < 5; i++) {
    float angle = float(i) * 1.2566 + phase * 0.18;
    vec2 star = vec2(cos(angle) * 0.39, sin(angle) * 0.31);
    vec2 d = (p - star) * vec2(100.0, 100.0);
    sparks += exp(-dot(d, d));
  }
  float fade = 1.0 - smoothstep(0.35, 0.65, r);
  float alpha = clamp((thread * light * 0.48 + halo * 0.08 + ribbon * 0.2 + sparks * 0.65) * fade, 0.0, 0.7);
  vec3 foil = mix(vec3(0.74, 0.07, 0.24), vec3(0.85, 0.90, 0.95), thread * light);
  gl_FragColor = vec4(foil * alpha, alpha);
}`;

export type DecorativeRenderer = {
  draw: (time: number, x: number, y: number, phase?: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
};

export function createSilkRenderer(
  canvas: HTMLCanvasElement,
): DecorativeRenderer | null {
  return createDecorativeRenderer(canvas, fragmentSource, 1_200_000);
}

export function createBorderRenderer(
  canvas: HTMLCanvasElement,
): DecorativeRenderer | null {
  return createDecorativeRenderer(canvas, borderFragmentSource, 800_000);
}

export function createCardRenderer(
  canvas: HTMLCanvasElement,
): DecorativeRenderer | null {
  return createDecorativeRenderer(canvas, cardFragmentSource, 350_000);
}

export function createJourneyRenderer(
  canvas: HTMLCanvasElement,
): DecorativeRenderer | null {
  return createDecorativeRenderer(canvas, journeyFragmentSource, 350_000);
}

function createDecorativeRenderer(
  canvas: HTMLCanvasElement,
  fragment: string,
  pixelBudget: number,
): DecorativeRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const dispose = () => {
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach((shader) => gl.deleteShader(shader));
  };
  if (!vertex || !fragmentShader || !program || !buffer) {
    dispose();
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose();
    return null;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const timeUniform = gl.getUniformLocation(program, "u_time");
  const pointerUniform = gl.getUniformLocation(program, "u_pointer");
  const aspectUniform = gl.getUniformLocation(program, "u_aspect");
  const resolutionUniform = gl.getUniformLocation(program, "u_resolution");
  const phaseUniform = gl.getUniformLocation(program, "u_phase");
  return {
    draw(time, x, y, phase = 0) {
      gl.uniform1f(timeUniform, time);
      gl.uniform2f(pointerUniform, x, y);
      gl.uniform1f(phaseUniform, phase);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    resize(width, height) {
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        1.5,
        Math.sqrt(pixelBudget / Math.max(width * height, 1)),
      );
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(aspectUniform, width / Math.max(height, 1));
      gl.uniform2f(resolutionUniform, width, height);
    },
    dispose,
  };
}
