import { useEffect, useRef } from "react";

/**
 * A bespoke WebGL current — flowing fbm noise + caustic ridges in the brand
 * palette (deep petrol → brass highlights). Raw WebGL (no Three.js) to stay
 * lightweight. Pauses when the tab is hidden; renders a single static frame
 * when the user prefers reduced motion.
 */
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

// hash + value noise + fbm
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v=0., a=0.5;
  for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * vec2(u_res.x/u_res.y, 1.0) * 2.2;
  float t = u_time * 0.045;

  // drifting domain-warped current
  vec2 q = vec2(fbm(p + t), fbm(p - t + 4.0));
  float f = fbm(p + 1.6*q + vec2(t*0.6, -t*0.4));

  // deep-water gradient
  vec3 deep   = vec3(0.024, 0.094, 0.106); // abyss
  vec3 mid    = vec3(0.043, 0.149, 0.169); // ink
  vec3 shallow= vec3(0.071, 0.220, 0.243); // panel
  vec3 col = mix(deep, mid, smoothstep(0.1, 0.7, f));
  col = mix(col, shallow, smoothstep(0.55, 0.95, f) * 0.6);

  // caustic ridges
  float ridge = abs(fbm(p*1.7 + q + vec2(-t, t)) - 0.5);
  float caustic = smoothstep(0.06, 0.0, ridge);
  vec3 brass = vec3(0.843, 0.635, 0.231);
  vec3 foam  = vec3(0.337, 0.839, 0.714);
  col += brass * caustic * 0.16;
  col += foam  * smoothstep(0.08, 0.0, abs(ridge-0.12)) * 0.05;

  // vignette so content stays readable
  float vig = smoothstep(1.15, 0.35, length(uv - 0.5));
  col *= mix(0.7, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

export function OceanCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return; // graceful: CSS background shows through

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let running = true;
    const start = performance.now();
    const draw = (now: number) => {
      if (!running) return;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(draw);
    };
    if (reduce) {
      gl.uniform1f(uTime, 12.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      raf = requestAnimationFrame(draw);
    }

    const onVis = () => {
      running = !document.hidden;
      if (running && !reduce) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
