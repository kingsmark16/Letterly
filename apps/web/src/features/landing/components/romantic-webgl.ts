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
  float t = u_time * 0.18;
  p += (u_pointer - 0.5) * 0.11;
  float bend = sin(p.y * 4.5 + t) * 0.14;
  float fold = p.x + p.y * 0.48 + bend;
  float ribbon = exp(-pow((fold - 0.04) * 3.1, 2.0));
  float pleat = pow(0.5 + 0.5 * sin(fold * 30.0 + sin(p.y * 5.0 - t) * 2.5), 5.0);
  float edge = pow(0.5 + 0.5 * cos(fold * 16.0 + t), 12.0);
  vec3 berry = vec3(0.20, 0.028, 0.105);
  vec3 rose = vec3(0.85, 0.24, 0.47);
  vec3 silk = mix(berry, rose, ribbon * (0.24 + pleat * 0.56));
  silk += vec3(0.42, 0.18, 0.24) * edge * ribbon * 0.52;
  float fade = 1.0 - smoothstep(0.32, 0.9, length(p * vec2(0.8, 0.9)));
  fade *= smoothstep(0.0, 0.18, uv.x) * (1.0 - smoothstep(0.82, 1.0, uv.x));
  fade *= smoothstep(0.0, 0.16, uv.y) * (1.0 - smoothstep(0.84, 1.0, uv.y));
  float alpha = fade * 0.94;
  gl_FragColor = vec4(silk * alpha, alpha);
}`;

export type SilkRenderer = {
  draw: (time: number, x: number, y: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
};

export function createSilkRenderer(
  canvas: HTMLCanvasElement,
): SilkRenderer | null {
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
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const dispose = () => {
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach((shader) => gl.deleteShader(shader));
  };
  if (!vertex || !fragment || !program || !buffer) {
    dispose();
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
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
  return {
    draw(time, x, y) {
      gl.uniform1f(timeUniform, time);
      gl.uniform2f(pointerUniform, x, y);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    resize(width, height) {
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        1.5,
        Math.sqrt(1_200_000 / Math.max(width * height, 1)),
      );
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(aspectUniform, width / Math.max(height, 1));
    },
    dispose,
  };
}
