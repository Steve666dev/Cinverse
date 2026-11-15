/* eslint-disable */
// Venom Button — Originkit
// Delivered by Originkit · stack: nextjs
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const RenderTarget = {
  current: () => "preview",
  hasRestrictions: () => false,
  canvas: "canvas",
  export: "export",
  preview: "preview",
  thumbnail: "thumbnail",
};

/**
 * VenomButton — a glossy black pill that behaves like a symbiote looking for a host. When the
 * pointer comes within `sense`, the surface swells toward it and pseudopods ooze out and feel
 * about in its direction, reaching further the closer it gets. At `reach` they lunge and latch
 * on, each strand wrapping one finger of the glove (the index tip, the knuckles, the thumb, the
 * palm, the cuff), coiling round it as they land and strung together with fine web threads. A
 * pulse runs along them toward the hand, and black skin creeps out over the glove from every
 * finger they hold until the hand is nearly swallowed. Pull away past `release` and they stretch
 * thin, snap, and slump back into the body, which wobbles and throws up a few spikes that sink
 * again. Back off before it grabs and the feelers simply withdraw.
 *
 * The goo is drawn by one WebGL shader as a single liquid surface (smooth-unioned distance
 * fields), lit like black lacquer, so every join is seamless; the strands are verlet ropes with
 * heavy damping so they move like something viscous. It is a real button: focusable and
 * clickable. Without WebGL, or under reduced motion, it is a plain glossy pill with the system
 * cursor. The pointer can be the cartoon glove, a plain arrow that the goo coats the same way,
 * or the system cursor. On the Framer canvas (no pointer there) and with `autoplay`, a ghost
 * pointer plays with it until a real one arrives, and again after the pointer has been away for a
 * few seconds.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */

/* A cartoon glove pointer, drawn in a 32 x 36 box. The fingertip (the hotspot) sits at (11.5, 1). */
const GLOVE =
    "M9 14V3.6a2.5 2.5 0 0 1 5 0V12.2a2.2 2.2 0 0 1 4.4 0.4a2.2 2.2 0 0 1 4.4 0.8a2.2 2.2 0 0 1 4.2 1.6V22c0 4-2.6 7-6 7H14.6c-3 0-5.4-1.8-6.6-4.4L4.1 18.6a2.3 2.3 0 0 1 3.6-2.8L9 17.4Z"
const GLOVE_LINES = "M18.4 12.6V17.2M22.8 13.4V17.6M14 12.2V16.6"
const CUFF = "M12.6 28.6h12.2a1.6 1.6 0 0 1 1.6 1.6v3.4a1.6 1.6 0 0 1-1.6 1.6H12.6a1.6 1.6 0 0 1-1.6-1.6v-3.4a1.6 1.6 0 0 1 1.6-1.6Z"
const CUFF_LINES = "M15.4 29.2v5.4M18.7 29.2v5.4M22 29.2v5.4"
const HOT_X = 11.5, HOT_Y = 1
/* Where the goo grabs the glove, in the same 32 x 36 box: index tip, the three knuckles, the
   thumb, the index joint, the palm and the cuff. */
const GRIPS: [number, number][] = [[11.5, 3.6], [16.2, 13.2], [20.6, 14], [24.9, 15.8], [5.6, 18], [11.5, 10], [18.5, 22], [18.7, 31.6]]
/* For each grip: the angle of the band of goo across it (radians) and its length in glove units. */
const BANDS: [number, number][] = [[0, 5.6], [0, 4.6], [0, 4.6], [0, 4.4], [Math.PI / 4, 4.8], [0, 5.6], [0.08, 11], [0, 15]]
/* A plain arrow pointer, white with a black edge so the goo shows on it, in a 20 x 28 box. The tip
   (the hotspot) sits at (1.5, 1.5). */
const ARROW = "M1.5 1.5V23.2L6.6 18.4L10.1 26.4L13.6 24.9L10.2 17.1H17.3Z"
const ARROW_HOT_X = 1.5, ARROW_HOT_Y = 1.5
/* Where the goo grabs the arrow: the tip, down the left edge, down the slanted edge, the wing
   corner, the notch and the tail. One per glove grip, in the same order of importance. */
const ARROW_GRIPS: [number, number][] = [[2.6, 4.2], [2.4, 10], [6.5, 7.5], [11.5, 12.5], [2.4, 17.5], [14.5, 16], [11.5, 24.2], [6.8, 17.5]]
/* The angle across the arrow at each grip: across a straight edge, across a slanted one, across the tail. */
const ARROW_BANDS: [number, number][] = [[0, 4], [0, 4], [-Math.PI / 4, 4], [-Math.PI / 4, 4], [0, 4], [Math.PI / 2, 4], [-0.42, 4], [0.8, 4]]
/* With the system pointer there is no hand, so the strands gather round the hotspot. */
const NATIVE_GRIPS: [number, number][] = [[0, 0], [5, 7], [-4, 6], [8, 13], [-2, 12], [3, 3], [6, 18], [0, 16]]
const NATIVE_BANDS: [number, number][] = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]

/* Limits baked into the shader. 9 points (8 segments) per strand keeps the SDF smooth with 27% fewer GPU cone evaluations. */
const MS = 7 // thick strands rendered as goo
const NP = 9 // points per strand
const MSPK = 8
const MDROP = 6

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`

/*
 * The goo is one signed distance field: the pill, a mound pulled toward the hand, the strands
 * (tapered capsules), spikes and droplets, all joined with a smooth minimum so every join melts
 * into the next. The field also carries a "thickness" so each part is shaded with its own round
 * profile: a pillow for the pill, a tube for a strand. Normals come from that height, and the
 * colour is a near-black lacquer reflecting a simple studio: a softbox above, a window on the left,
 * the pale floor below, plus two sharp glints.
 */
const FRAG = `precision highp float;
uniform vec2 uRes;      // canvas px
uniform float uDpr;
uniform vec4 uPill;     // x, y, w, h in css px
uniform vec4 uPts[${MS * NP}]; // x, y, radius, unused
uniform vec4 uBox[${MS}];      // each strand's bounds, radius included: min x, min y, max x, max y
uniform float uCount;   // strands in use
uniform float uSpkCount; // active spikes
uniform vec4 uSpk[${MSPK}];    // base x, y, tip x, y
uniform vec4 uSpkR[${MSPK}];   // base radius, alive
uniform float uDropCount; // active drops
uniform vec4 uDrop[${MDROP}];  // x, y, r, alive
uniform vec4 uMound;    // from x, y to x, y
uniform vec2 uMoundR;   // radius at base, radius at tip
uniform float uLean;
uniform vec3 uBase;     // the lacquer itself
uniform vec3 uShine;    // the studio it reflects
uniform float uRim;     // studio brightness
uniform float uGlint;   // the two sharp highlights
uniform float uShadow;  // contact shadow strength

vec2 smin(vec2 a, vec2 b, float k){
  // smooth union of (distance, thickness) pairs
  float h = clamp(0.5 + 0.5 * (b.x - a.x) / k, 0.0, 1.0);
  return vec2(mix(b.x, a.x, h) - k * h * (1.0 - h), mix(b.y, a.y, h));
}

// Fast branchless tapered capsule distance (single sqrt instead of two + branching)
float cone(vec2 p, vec2 a, vec2 b, float ra, float rb, out float r){
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = max(dot(ba, ba), 1e-4);
  float t = clamp(dot(pa, ba) / h, 0.0, 1.0);
  r = mix(ra, rb, t);
  return length(pa - ba * t) - r;
}

vec2 pillField(vec2 p, out vec2 pillGrad){
  float rr = uPill.w * 0.5;
  vec2 c = vec2(uPill.x + uPill.z * 0.5, uPill.y + rr);
  float a = max(0.0, uPill.z * 0.5 - rr);
  vec2 q = p - c;
  vec2 dVec = q - vec2(clamp(q.x, -a, a), 0.0);
  float len = length(dVec);
  pillGrad = len > 1e-6 ? dVec / len : vec2(0.0, -1.0);
  return vec2(len - rr, rr);
}

vec2 field(vec2 p){
  vec2 unusedGrad;
  vec2 body = pillField(p, unusedGrad);
  float r;
  if (uMoundR.x > 0.01) {
    float dm = cone(p, uMound.xy, uMound.zw, uMoundR.x, uMoundR.y, r);
    body = smin(body, vec2(dm, uPill.w * 0.5), 18.0);
  }
  vec2 st = vec2(1e5, 2.0);
  if (uCount > 0.0) {
    for (int s = 0; s < ${MS}; s++) {
      if (float(s) >= uCount) break;
      vec4 bx = uBox[s];
      // Fast AABB rejection (20px reach) without dot/max overhead when clearly outside
      if (p.x < bx.x - 20.0 || p.x > bx.z + 20.0 || p.y < bx.y - 20.0 || p.y > bx.w + 20.0) continue;
      vec2 one = vec2(1e5, 2.0);
      for (int i = 0; i < ${NP - 1}; i++) {
        vec4 A = uPts[s * ${NP} + i];
        vec4 B = uPts[s * ${NP} + i + 1];
        // Branchless-friendly AABB check per segment capped to influence radius (no sqrt!)
        float reach = max(A.z, B.z) + min(one.x, 18.0);
        if (p.x < min(A.x, B.x) - reach || p.x > max(A.x, B.x) + reach ||
            p.y < min(A.y, B.y) - reach || p.y > max(A.y, B.y) + reach) continue;
        float d = cone(p, A.xy, B.xy, A.z, B.z, r);
        if (d < one.x) one = vec2(d, r + 0.3);
      }
      st = smin(st, one, 4.5);
    }
  }
  if (uSpkCount > 0.0) {
    for (int k = 0; k < ${MSPK}; k++) {
      if (uSpkR[k].y < 0.5) continue;
      float d = cone(p, uSpk[k].xy, uSpk[k].zw, uSpkR[k].x, 0.35, r);
      st = smin(st, vec2(d, r + 1.0), 3.0);
    }
  }
  if (uDropCount > 0.0) {
    for (int k = 0; k < ${MDROP}; k++) {
      if (uDrop[k].w < 0.5) continue;
      st = smin(st, vec2(length(p - uDrop[k].xy) - uDrop[k].z, uDrop[k].z), 5.0);
    }
  }
  vec2 res = smin(body, st, 15.0);
  res.y = max(res.y, body.y * clamp(-body.x / 6.0, 0.0, 1.0));
  return res;
}
float dist(vec2 p){ return field(p).x; }

float env(vec3 R){
  R.x += uLean * 0.18;
  float up = -R.y;
  float e = 0.015;
  e += smoothstep(0.3, 0.5, up) * smoothstep(0.75, 0.55, up) * smoothstep(0.8, 0.5, abs(R.x)) * 2.6;
  e += smoothstep(0.8, 0.95, up) * 0.6;
  e += smoothstep(-0.5, -0.7, R.x) * smoothstep(0.5, 0.25, abs(R.y)) * 1.1;
  e += smoothstep(0.6, 0.85, R.x) * smoothstep(0.6, 0.2, abs(R.y)) * 0.5;
  e += smoothstep(0.25, 0.7, R.y) * 1.25;
  return e;
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec2 pillGrad;
  vec2 pillOnly = pillField(p, pillGrad);

  // Fast interior path: deep inside the pill where strands/mound cannot alter distance or thickness,
  // skip all 3 full field() evaluations and shade directly from the analytical stadium gradient!
  bool deepInterior = pillOnly.x < -14.0 && uMoundR.x < 0.01 && uCount < 0.5 && uSpkCount < 0.5;
  vec2 f = deepInterior ? pillOnly : field(p);
  float d = f.x;
  float aa = clamp(0.5 - d * uDpr, 0.0, 1.0);

  float sh = 0.0;
  if (aa < 1.0 && uShadow > 0.0 && d < 26.0) {
    float ds = dist(p - vec2(2.0, 9.0));
    sh = (1.0 - smoothstep(-4.0, 16.0, ds)) * uShadow;
  }

  vec3 col = vec3(0.0);
  if (aa > 0.0) {
    float B = max(f.y, 0.8);
    float s = clamp(-d, 0.0, B);
    float z = sqrt(max(1e-3, s * (2.0 * B - s)));
    float slope = min((B - s) / z, 6.0);
    vec2 g;
    // If deep inside the pill and unperturbed by strands/mound, use the exact analytical gradient
    if (pillOnly.x < -12.0 && abs(d - pillOnly.x) < 1e-3) {
      g = pillGrad;
    } else {
      float e = 0.5;
      g = vec2(dist(p + vec2(e, 0.0)) - d, dist(p + vec2(0.0, e)) - d);
      g = length(g) > 1e-6 ? normalize(g) : vec2(0.0);
    }
    vec3 n = normalize(vec3(g * slope, 1.0));
    vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);
    float fres = 0.05 + 0.95 * pow(1.0 - max(n.z, 0.0), 3.0);
    float brightness = max(uBase.r, max(uBase.g, uBase.b));
    if (brightness > 0.4) {
      vec3 lightDir = normalize(vec3(-0.35, -0.65, 0.75));
      float lDot = max(0.0, dot(n, lightDir));
      float diff = 0.76 + 0.24 * lDot;
      // Soft translucent subsurface gelatin glow along glancing curvature
      float sss = pow(1.0 - max(n.z, 0.0), 2.5) * 0.25;
      float edge = 0.82 + 0.18 * smoothstep(0.0, 0.45, n.z);
      // Soft wet gelatin coat + studio shine
      col = (uBase * (diff * edge) + sss * vec3(0.95, 0.97, 1.0)) + min(env(R) * fres * uRim * 0.4, 0.45) * uShine;
      // Broad wet sheen
      col += pow(max(dot(R, normalize(vec3(-0.35, -0.75, 0.56))), 0.0), 20.0) * 0.35 * uGlint;
      // Sharp glistening glints
      col += pow(max(dot(R, normalize(vec3(-0.35, -0.75, 0.56))), 0.0), 75.0) * 1.15 * uGlint;
      col += pow(max(dot(R, normalize(vec3(0.55, -0.35, 0.76))), 0.0), 130.0) * 0.65 * uGlint;
    } else {
      col = uBase + min(env(R) * fres * uRim, 1.0) * uShine;
      col += pow(max(dot(R, normalize(vec3(-0.35, -0.75, 0.56))), 0.0), 70.0) * 1.2 * uGlint;
      col += pow(max(dot(R, normalize(vec3(0.55, -0.35, 0.76))), 0.0), 140.0) * 0.55 * uGlint;
    }
  }
  float alpha = aa + (1.0 - aa) * sh;
  gl_FragColor = vec4(col * aa, alpha);
}`

const GRAIN_URL =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    hover: 50,
    grain: 0,
    vignette: 0,
    sense: 540,
    release: 440,
    shine: "#D6E4F0",
    rim: 75,
    glint: 175,
    shadow: 45,
    gloveScale: 155,
    pressScale: 86,
    strandWidth: 135,
    pulse: 45,
    stretchThin: 45,
    gravity: 240,
    damping: 88,
    snapDamping: 82,
    sway: 10,
    dart: 12,
    lungeMs: 240,
    coil: 15,
    coilAngle: 480,
    mound: 145,
    recoil: 110,
    spikes: 125,
    drops: 45,
    skinInMs: 2000,
    skinOutMs: 700,
    lingerMs: 1700,
    fingerLift: 52,
    ghostDelayMs: 2500,
    hairs: true,
    webs: true,
}

// ── moved controls (builder) ──
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
const GROUP_FALLBACKS: Record<string, any> = { advanced: ADVANCED_DEFAULTS }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

type Advanced = typeof ADVANCED_DEFAULTS
type RGB = [number, number, number]

const RGB_CACHE = new Map<string, RGB | null>()
function toRgb(input: unknown, fallback: RGB): RGB {
    if (typeof input !== "string") return fallback
    let hit = RGB_CACHE.get(input)
    if (hit === undefined) {
        hit = parseRgb(input)
        RGB_CACHE.set(input, hit)
    }
    return hit ?? fallback
}
function parseRgb(raw: string): RGB | null {
    let s = raw.trim()
    const v = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(s)
    if (v) s = v[1].trim()
    const hex = /^#([0-9a-f]{3,8})$/i.exec(s)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join("")
        if (h.length < 6) return null
        return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB
    }
    const fn = /^rgba?\(([^)]*)\)$/i.exec(s)
    if (fn) {
        const p = fn[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && p.slice(0, 3).every(Number.isFinite)) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return null
}
const mixRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const cssRgb = (c: RGB, a = 1) =>
    `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`
/** Whether a contact shadow can show on this background: not on an opaque, dark one (< 0.12 luminance). */
function shadowShows(bg: unknown): boolean {
    if (typeof bg !== "string") return true
    const s = bg.trim().toLowerCase()
    if (s === "transparent") return true
    const hexA = /^#[0-9a-f]{8}$/.test(s) ? parseInt(s.slice(7, 9), 16) / 255 : /^#[0-9a-f]{4}$/.test(s) ? parseInt(s[4] + s[4], 16) / 255 : null
    const fnA = /^rgba?\(([^)]*)\)$/.exec(s)?.[1].split(/[\s,/]+/).filter(Boolean)[3]
    const alpha = hexA ?? (fnA ? (fnA.endsWith("%") ? parseFloat(fnA) / 100 : parseFloat(fnA)) : 1)
    if (!(alpha >= 0.99)) return true
    const c = parseRgb(s)
    return !c || 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.12
}
const num = (v: unknown, fallback: number, lo: number, hi: number) => {
    const n = typeof v === "number" && Number.isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

const GOO_FALLBACK: RGB = [0.0, 0.0, 0.0]
const SHINE_FALLBACK: RGB = [0.72, 0.77, 0.83]

type Strand = {
    x: Float32Array; y: Float32Array; px: Float32Array; py: Float32Array
    spread: number; s: number; slack: number; width: number
    grip: [number, number]; band: [number, number]; gi: number; reachK: number; ex: number; ey: number; follow: number
    seg: number; phase: number; hair: boolean
}
type Spike = { s: number; tilt: number; len: number; age: number; life: number }
type Drop = { x: number; y: number; vx: number; vy: number; r: number; age: number }

export type Props = {
    background?: string
    gooColor?: string
    textColor?: string
    font?: CSSProperties
    label?: string
    size?: number
    strands?: number
    reach?: number
    cursor?: "glove" | "arrow" | "native"
    autoplay?: boolean
    onClick?: () => void
    advanced?: Partial<Advanced>
    style?: CSSProperties
}

export type FeedbackButtonProps = Props;

export function __OriginkitBase_VenomButton(props: Props) {
    props = withMovedControls(props)
    const {
        background = "transparent",
        gooColor = "#ffffff",
        textColor = "#000000",
        font,
        label = "Feedback",
        size = 42,
        strands = 6,
        reach = 60,
        cursor = "native",
        autoplay = false,
        onClick,
        style,
    } = props
    const adv: Advanced = { ...ADVANCED_DEFAULTS, ...(props.advanced ?? {}) }

    const stageRef = useRef<HTMLDivElement>(null)
    const btnRef = useRef<HTMLButtonElement>(null)
    const glRef = useRef<HTMLCanvasElement>(null)
    const handRef = useRef<HTMLCanvasElement>(null)
    const [fallback, setFallback] = useState(false)

    // The loop reads these every frame, so the effect never restarts on a control change.
    const live = useRef({ background, strands, reach, cursor, autoplay, gooColor, adv })
    live.current = { background, strands, reach, cursor, autoplay, gooColor, adv }

    useEffect(() => {
        const stage = stageRef.current, btn = btnRef.current
        const glc = glRef.current, hc = handRef.current
        if (!stage || !btn || !glc || !hc) return
        const hx = hc.getContext("2d")
        if (!hx) return
        const reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        const onCanvas = RenderTarget.current() === RenderTarget.canvas

        // ---- WebGL setup ----
        const gl = glc.getContext("webgl", {
            premultipliedAlpha: true,
            antialias: false,
            alpha: true,
            powerPreference: "high-performance",
        })
        const shaders: WebGLShader[] = []
        let prog: WebGLProgram | null = null
        let quad: WebGLBuffer | null = null
        const disposeGL = () => {
            if (!gl) return
            if (quad) gl.deleteBuffer(quad)
            if (prog) gl.deleteProgram(prog)
            for (const s of shaders) gl.deleteShader(s)
            quad = null
            prog = null
            shaders.length = 0
        }
        if (gl) {
            const sh = (t: number, src: string) => {
                const s = gl.createShader(t)
                if (!s) return null
                shaders.push(s)
                gl.shaderSource(s, src)
                gl.compileShader(s)
                return s
            }
            const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG)
            const p = gl.createProgram()
            if (p) {
                if (vs && fs) {
                    gl.attachShader(p, vs)
                    gl.attachShader(p, fs)
                    gl.linkProgram(p)
                }
                if (vs && fs && gl.getProgramParameter(p, gl.LINK_STATUS)) prog = p
                else gl.deleteProgram(p)
            }
        }
        if (!gl || !prog) {
            disposeGL()
            setFallback(true)
            return
        }
        const program = prog
        const onContextLost = (e: Event) => {
            e.preventDefault()
            setFallback(true)
        }
        glc.addEventListener("webglcontextlost", onContextLost)
        gl.useProgram(program)
        const uni = (n: string) => {
            const loc = gl.getUniformLocation(program, n)
            if (!loc) throw new Error(`VenomButton: uniform ${n} not found`)
            return loc
        }
        const U = {
            uRes: uni("uRes"), uDpr: uni("uDpr"), uPill: uni("uPill"), uPts: uni("uPts"), uBox: uni("uBox"), uCount: uni("uCount"),
            uSpkCount: uni("uSpkCount"), uSpk: uni("uSpk"), uSpkR: uni("uSpkR"),
            uDropCount: uni("uDropCount"), uDrop: uni("uDrop"), uMound: uni("uMound"), uMoundR: uni("uMoundR"),
            uLean: uni("uLean"), uBase: uni("uBase"), uShine: uni("uShine"), uRim: uni("uRim"), uGlint: uni("uGlint"),
            uShadow: uni("uShadow"),
        }
        quad = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quad)
        const aLoc = gl.getAttribLocation(program, "a")
        gl.enableVertexAttribArray(aLoc)
        gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0)
        gl.enable(gl.SCISSOR_TEST)
        const quadData = new Float32Array(8)
        const pts = new Float32Array(MS * NP * 4), box = new Float32Array(MS * 4)
        const spk = new Float32Array(MSPK * 4), spkR = new Float32Array(MSPK * 4), drp = new Float32Array(MDROP * 4)

        let w = 0, h = 0, dpr = 1, glDpr = 1
        let lastGlKey = ""
        // Track dirty bounding boxes in WebGL and 2D overlay so we never clear the entire fullscreen canvas unnecessarily
        let prevGlScissor = { x: 0, y: 0, w: 0, h: 0 }
        let prevOvBox = { x: 0, y: 0, w: 0, h: 0 }
        // Cache DOM style strings to avoid reading element.style inside rAF
        let lastBtnTransform = ""
        let lastStageCursor = ""
        let lastBtnCursor = ""

        const gloveP = new Path2D(GLOVE), gloveL = new Path2D(GLOVE_LINES), cuffP = new Path2D(CUFF), cuffL = new Path2D(CUFF_LINES)
        const handClip = new Path2D()
        handClip.addPath(gloveP)
        handClip.addPath(cuffP)
        const arrowP = new Path2D(ARROW)
        type Shape = {
            shadow: Path2D[]; fill: Path2D[]; stroke: [Path2D, number][]; clip: Path2D
            grips: [number, number][]; bands: [number, number][]; hot: [number, number]; mid: [number, number]; creep: [number, number]
        }
        const SHAPES: Record<"glove" | "arrow", Shape> = {
            glove: {
                shadow: [gloveP, cuffP], fill: [cuffP, gloveP], stroke: [[cuffP, 1.9], [cuffL, 1.1], [gloveP, 1.9], [gloveL, 1.1]], clip: handClip,
                grips: GRIPS, bands: BANDS, hot: [HOT_X, HOT_Y], mid: [16, 18], creep: [17, 20],
            },
            arrow: {
                shadow: [arrowP], fill: [arrowP], stroke: [[arrowP, 1.5]], clip: arrowP,
                grips: ARROW_GRIPS, bands: ARROW_BANDS, hot: [ARROW_HOT_X, ARROW_HOT_Y], mid: [7.5, 14], creep: [7, 14],
            },
        }

        let pressed = false
        let press = 1, pressV = 0

        // Cache unscaled button metrics and stage rect on resize/scroll so pointermove and rAF never trigger DOM layout reflows
        const baseBtn = { x: 0, y: 0, w: 0, h: 0 }
        let stageRect = { left: 0, top: 0, width: 1, height: 1 }
        const pill = { x: 0, y: 0, w: 0, h: 0, r: 0, ls: 0, P: 1 }

        const updateMetricsFromCache = () => {
            const bw = baseBtn.w, bh = baseBtn.h
            pill.w = bw * press; pill.h = bh * press
            pill.x = baseBtn.x + (bw - pill.w) / 2; pill.y = baseBtn.y + (bh - pill.h) / 2
            pill.r = pill.h / 2
            pill.ls = Math.max(0, pill.w - pill.h)
            pill.P = 2 * pill.ls + 2 * Math.PI * pill.r || 1
        }

        const updateStageRect = () => {
            const r = stage.getBoundingClientRect()
            stageRect = { left: r.left, top: r.top, width: r.width || w || 1, height: r.height || h || 1 }
        }

        const at = (s: number) => {
            const { x, y, w: W, h: H, r, ls, P } = pill
            s = ((s % P) + P) % P
            if (s < ls) return { x: x + r + s, y, nx: 0, ny: -1 }
            s -= ls
            if (s < Math.PI * r) {
                const a = -Math.PI / 2 + s / r
                return { x: x + W - r + Math.cos(a) * r, y: y + r + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) }
            }
            s -= Math.PI * r
            if (s < ls) return { x: x + W - r - s, y: y + H, nx: 0, ny: 1 }
            s -= ls
            const a = Math.PI / 2 + s / r
            return { x: x + r + Math.cos(a) * r, y: y + r + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) }
        }
        const nearest = (qx: number, qy: number) => {
            const { x, w: W, r, ls } = pill
            const cy = pill.y + r
            const cx = Math.max(x + r, Math.min(x + W - r, qx))
            const dist = Math.hypot(qx - cx, qy - cy) - r
            let s: number
            if (qx > x + W - r) s = ls + (Math.atan2(qy - cy, qx - cx) + Math.PI / 2) * r
            else if (qx < x + r) {
                let a = Math.atan2(qy - cy, qx - cx)
                if (a < -Math.PI / 2) a += Math.PI * 2
                s = 2 * ls + Math.PI * r + (a - Math.PI / 2) * r
            } else s = qy < cy ? qx - (x + r) : ls + Math.PI * r + (x + W - r - qx)
            return { s, dist }
        }
        const loopDiff = (a: number, b: number) => {
            const P = pill.P
            let d = (b - a) % P
            if (d > P / 2) d -= P
            if (d < -P / 2) d += P
            return d
        }

        const fit = () => {
            const rawDpr = window.devicePixelRatio || 1
            dpr = Math.min(2, rawDpr)
            // Cap WebGL SDF resolution at 1.35x CSS px so high-DPI screens stay silky-smooth at 60/120fps without mid-motion resize hitches
            glDpr = Math.min(1.35, rawDpr)
            w = stage.offsetWidth; h = stage.offsetHeight
            baseBtn.w = btn.offsetWidth; baseBtn.h = btn.offsetHeight
            baseBtn.x = btn.offsetLeft; baseBtn.y = btn.offsetTop
            updateStageRect()
            hc.width = Math.max(1, Math.round(w * dpr)); hc.height = Math.max(1, Math.round(h * dpr))
            glc.width = Math.max(1, Math.round(w * glDpr)); glc.height = Math.max(1, Math.round(h * glDpr))
            gl.viewport(0, 0, glc.width, glc.height)
            gl.scissor(0, 0, glc.width, glc.height)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            prevGlScissor = { x: 0, y: 0, w: glc.width, h: glc.height }
            prevOvBox = { x: 0, y: 0, w, h }
            lastGlKey = ""
            updateMetricsFromCache()
        }

        const touchOnly = !!window.matchMedia?.("(hover: none) and (pointer: coarse)").matches
        const ptr = { x: -999, y: -999, inside: false, last: 0, touch: false, down: false, upAt: 0 }
        let touched = false

        // Zero-reflow pointer coordinate mapping using cached stageRect
        const place = (e: PointerEvent) => {
            const x = (e.clientX - stageRect.left) * (w / stageRect.width)
            const y = (e.clientY - stageRect.top) * (h / stageRect.height)
            ptr.x = x
            ptr.y = y
            const bcX = baseBtn.x + baseBtn.w / 2
            const bcY = baseBtn.y + baseBtn.h / 2
            const distFromBtn = Math.hypot(x - bcX, y - bcY)
            const snMax = (live.current.adv.sense || 520) + 60
            ptr.inside = distFromBtn <= snMax
            if (ptr.inside) { touched = true; ptr.last = performance.now() }
        }
        const onMove = (e: PointerEvent) => {
            if (e.pointerType === "touch") {
                if (!ptr.down || !e.isPrimary) return
                ptr.touch = true
            } else ptr.touch = false
            place(e)
        }
        const onDown = (e: PointerEvent) => {
            updateStageRect()
            if (e.target === btn && !reduced) pressed = true
            if (e.pointerType !== "touch" || !e.isPrimary) return
            ptr.touch = true
            ptr.down = true
            place(e)
        }
        const onUp = (e: PointerEvent) => {
            pressed = false
            if (e.pointerType !== "touch" || !e.isPrimary || !ptr.down) return
            ptr.down = false
            ptr.upAt = performance.now()
            if (e.type === "pointercancel") { ptr.inside = false; ptr.last = ptr.upAt }
        }
        const onKeyDown = (e: KeyboardEvent) => { if ((e.key === " " || e.key === "Enter") && !reduced) pressed = true }
        const onKeyUp = () => { pressed = false }
        window.addEventListener("pointermove", onMove, { passive: true })
        stage.addEventListener("pointerdown", onDown, { passive: true })
        window.addEventListener("pointerup", onUp, { passive: true })
        window.addEventListener("pointercancel", onUp, { passive: true })
        window.addEventListener("scroll", updateStageRect, { passive: true })
        btn.addEventListener("keydown", onKeyDown)
        btn.addEventListener("keyup", onKeyUp)
        btn.addEventListener("blur", onKeyUp)

        const GHOST: [number, number, number][] = [
            [0.5, 0.8, 1.1], [0.36, 0.74, 1.0], [0.6, 0.82, 0.9], [0.8, 0.64, 0.55], [0.98, 0.97, 1.4],
            [0.86, 0.28, 1.1], [0.7, 0.18, 1.0], [0.5, 0.12, 1.0], [0.3, 0.2, 0.55], [0.03, 0.04, 1.4],
            [0.16, 0.58, 1.1], [0.32, 0.86, 1.0],
        ]
        const ghostTotal = GHOST.reduce((a, p) => a + p[2], 0)
        const ghostAt = (t: number) => {
            let u = t % ghostTotal, i = 0
            while (u > GHOST[i][2]) { u -= GHOST[i][2]; i++ }
            const f = u / GHOST[i][2]
            const p = (k: number) => GHOST[(k + GHOST.length) % GHOST.length]
            const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2)
            const e = f * f * (3 - 2 * f)
            const cr = (a: number, b: number, c: number, d: number) =>
                0.5 * (2 * b + (-a + c) * e + (2 * a - 5 * b + 4 * c - d) * e * e + (-a + 3 * b - 3 * c + d) * e * e * e)
            const gw = Math.min(w, 840), gh = Math.min(h, 420)
            return { x: (w - gw) / 2 + cr(p0[0], p1[0], p2[0], p3[0]) * gw, y: (h - gh) / 2 + cr(p0[1], p1[1], p2[1], p3[1]) * gh }
        }

        // ---- goo state ----
        let mode: "idle" | "seek" | "grow" | "hold" | "snap" = "idle"
        let violentSnap = false
        let grow = 0
        let seekF = 0
        let list: Strand[] = []
        let webs: [number, number, number, number, number][] = []
        const spikes: Spike[] = []
        const drops: Drop[] = []
        let near = { s: 0, dist: 999 }
        let hand = { x: -999, y: -999 }
        let anchor = { x: 0, y: 0 }
        let stretch = 0
        let mound = 0, moundV = 0, moundS = 0
        let moundDir = { x: 0, y: 1 }
        let lean = 0
        let sc = 1.55
        let drawn = true
        let shape = SHAPES.glove
        let grips = GRIPS
        let bands = BANDS
        const coat = new Float32Array(GRIPS.length)

        const gripAt = (g: [number, number]) =>
            drawn ? { x: hand.x + (g[0] - shape.hot[0]) * sc, y: hand.y + (g[1] - shape.hot[1]) * sc } : { x: hand.x + g[0], y: hand.y + g[1] }

        const spawn = () => {
            list = []
            const main = Math.max(2, Math.min(MS, Math.round(num(live.current.strands, 7, 2, MS))))
            const total = main * 2 - 1
            const root = at(near.s)
            moundS = near.s
            for (let k = 0; k < total; k++) {
                const hair = k % 2 === 1
                const mi = Math.floor(k / 2)
                const g: [number, number] = hair
                    ? [(grips[mi % grips.length][0] + grips[(mi + 1) % grips.length][0]) / 2, (grips[mi % grips.length][1] + grips[(mi + 1) % grips.length][1]) / 2]
                    : grips[mi % grips.length]
                list.push({
                    x: new Float32Array(NP).fill(root.x), y: new Float32Array(NP).fill(root.y),
                    px: new Float32Array(NP).fill(root.x), py: new Float32Array(NP).fill(root.y),
                    spread: (k / (total - 1)) * 2 - 1 + (Math.random() - 0.5) * 0.15,
                    s: near.s,
                    slack: 1.02 + Math.random() * (hair ? 0.2 : 0.12),
                    width: hair ? 0.5 : 0.8 + Math.random() * 0.45,
                    grip: g,
                    band: hair ? [0, 0] : bands[mi % bands.length],
                    gi: hair ? -1 : mi % grips.length,
                    reachK: hair ? 0.35 : 0.55 + Math.random() * 0.4,
                    ex: root.x, ey: root.y,
                    follow: 14 + Math.random() * 10,
                    seg: 0, phase: Math.random() * 10, hair,
                })
            }
            webs = []
            for (let k = 0; k < list.length - 1; k++) {
                const count = 1 + Math.floor(Math.random() * 2)
                for (let c = 0; c < count; c++) {
                    const i = 2 + Math.floor(Math.random() * (NP - 4))
                    const j = Math.max(1, Math.min(NP - 2, i + Math.round((Math.random() - 0.5) * 2)))
                    webs.push([k, k + 1, i, j, (Math.random() - 0.5) * 5])
                }
            }
            grow = 0
            mode = "seek"
        }

        const snap = (violent: boolean) => {
            if (mode === "idle" || mode === "snap") return
            mode = "snap"
            violentSnap = violent
            if (!violent) return
            const A = live.current.adv
            moundV -= num(A.recoil, 90, 0, 400)
            const spikeK = num(A.spikes, 100, 0, 300) / 100
            const dropP = num(A.drops, 60, 0, 100) / 100
            const seen = new Set<number>()
            for (const st of list) {
                if (st.hair) continue
                const key = Math.round(st.s / 8)
                if (seen.has(key) || spikes.length >= MSPK) continue
                seen.add(key)
                if (spikeK > 0)
                    spikes.push({ s: st.s, tilt: (Math.random() - 0.5) * 0.8, len: (10 + Math.random() * 16) * spikeK, age: 0, life: 1.1 + Math.random() * 0.6 })
                if (Math.random() < dropP && drops.length < MDROP) {
                    const i = Math.min(NP - 2, 3 + Math.floor(Math.random() * 3))
                    const root = at(st.s)
                    drops.push({ x: st.x[i], y: st.y[i], vx: (root.x - st.x[i]) * 2, vy: (root.y - st.y[i]) * 2 - 40, r: 2 + Math.random() * 2.2, age: 0 })
                }
            }
        }

        let raf = 0
        let prev = -1
        let t0 = -1
        const draw = (now: number) => {
            const dt = prev < 0 ? 0 : Math.min(0.033, (now - prev) / 1000)
            prev = now
            if (t0 < 0) t0 = now
            if (!w || !h) return
            const L = live.current
            const A = L.adv
            drawn = L.cursor !== "native" && !reduced
            shape = L.cursor === "arrow" ? SHAPES.arrow : SHAPES.glove
            grips = drawn ? shape.grips : NATIVE_GRIPS
            bands = drawn ? shape.bands : NATIVE_BANDS
            sc = num(A.gloveScale, 155, 50, 400) / 100
            const hk = num(A.hover, 50, 0, 100) / 50
            const goo = toRgb(L.gooColor, GOO_FALLBACK)
            const shine = toRgb(A.shine, SHINE_FALLBACK)
            const thinK = num(A.stretchThin, 50, 0, 90) / 100
            const widthK = num(A.strandWidth, 100, 20, 300) / 100

            const pressTo = pressed ? num(A.pressScale, 86, 50, 100) / 100 : 1
            for (let i = 0; i < 4; i++) {
                const q = dt / 4
                pressV += (520 * (pressTo - press) - 12 * pressV) * q
                press += pressV * q
            }
            if (Math.abs(press - 1) < 1e-4 && Math.abs(pressV) < 1e-3) { press = 1; pressV = 0 }
            const transform = press === 1 ? "" : `scale(${press})`
            if (lastBtnTransform !== transform) {
                btn.style.transform = transform
                lastBtnTransform = transform
            }
            updateMetricsFromCache()
            const time = (now - t0) / 1000

            if (ptr.touch && !ptr.down && ptr.inside && now - ptr.upAt > num(A.lingerMs, 1700, 0, 10000)) { ptr.inside = false; ptr.last = now }
            const ghostOn = !!L.autoplay || onCanvas
            const ghost = ghostOn && !reduced && !ptr.down && (!touched || (!ptr.inside && now - ptr.last > num(A.ghostDelayMs, 2500, 0, 30000)))
            let present = ptr.inside
            if (ghost) {
                hand = ghostAt(time)
                present = true
            } else {
                // Keep target hand smoothly within canvas margin so tentacles taper gracefully and never hit a flat clipping wall
                const pad = 24
                const rawX = ptr.x
                const rawY = ptr.touch ? ptr.y - num(A.fingerLift, 52, 0, 200) : ptr.y
                hand = {
                    x: Math.max(pad, Math.min(w - pad, rawX)),
                    y: Math.max(pad, Math.min(h - pad, rawY)),
                }
            }
            const stageCursor = drawn && !ghost && present ? "none" : "default"
            if (lastStageCursor !== stageCursor) {
                stage.style.cursor = stageCursor
                lastStageCursor = stageCursor
            }
            const btnCursor = drawn ? "none" : "default"
            if (lastBtnCursor !== btnCursor) {
                btn.style.cursor = btnCursor
                lastBtnCursor = btnCursor
            }

            anchor = drawn ? { x: hand.x + (shape.mid[0] - shape.hot[0]) * sc, y: hand.y + (shape.mid[1] - shape.hot[1]) * sc } : { x: hand.x, y: hand.y }
            near = nearest(anchor.x, anchor.y)
            const D = Math.max(0, near.dist)
            const dk = ptr.touch || (touchOnly && ghost) ? Math.max(0.55, Math.min(1, w / 560)) : 1
            const sn = num(A.sense, 520, 0, 2000) * dk * hk, rc = num(L.reach, 160, 0, 2000) * hk, rl = num(A.release, 420, 0, 2000) * hk
            const cx = pill.x + pill.w / 2
            const leanProx = present ? Math.max(0, Math.min(1, 1 - D / Math.max(1, sn))) : 0
            lean += ((present ? Math.max(-1, Math.min(1, (hand.x - cx) / (pill.w * 1.5))) * Math.min(1, hk) : 0) - lean) * Math.min(1, dt * (2.5 + 14 * leanProx * leanProx))

            if (!reduced) {
                if (mode === "idle" && present && D < sn) spawn()
                else if (mode === "snap" && !violentSnap && present && D < sn) mode = "seek"
                else if (mode === "seek" && (!present || D > sn + 25)) snap(false)
                else if (mode === "seek" && D < rc) { mode = "grow"; grow = 0 }
                else if ((mode === "grow" || mode === "hold") && (!present || D > rl)) snap(true)
            }
            const holding = mode === "hold" || mode === "grow"
            const seeking = mode === "seek"
            // Proximity factor (0 when cursor is at/beyond `sense`, 1 when cursor is right on the button).
            const prox = present ? Math.max(0, Math.min(1, 1 - D / Math.max(1, sn))) : 0
            const proxCurve = Math.pow(prox, 2.2)
            const proxFast = Math.pow(prox, 1.8)
            const fT = seeking ? Math.pow(Math.max(0, Math.min(1, (sn - D) / Math.max(1, sn - rc))), 2.0) : holding ? 1 : 0
            const seekRate = fT > seekF ? 1.0 + 8.0 * proxCurve : 1.8 + 4.0 * proxCurve
            seekF += (fT - seekF) * (1 - Math.exp(-dt * seekRate))
            stretch = holding ? Math.min(1, D / Math.max(1, rl)) : 0
            if (mode === "grow") {
                const lungeSpeed = 0.8 + 1.2 * proxFast
                grow = Math.min(1, grow + (dt * lungeSpeed) / (num(A.lungeMs, 220, 50, 3000) / 1000))
                if (grow >= 1) mode = "hold"
            }

            // ---- simulate ----
            const gravity = num(A.gravity, 260, 0, 2000)
            const swayAmp = num(A.sway, 10, 0, 100)
            const dartK = num(A.dart, 12, 0, 100) / 100
            const coilPx = num(A.coil, 13, 0, 60)
            const coilRad = (num(A.coilAngle, 468, 0, 1440) * Math.PI) / 180
            const spreadPx = Math.max(14, Math.min(pill.w * 0.3, D * 0.4 + 14)) * (seeking ? 0.65 : 1)
            let alive = 0
            // Smooth root movement along pill rim: slow when far, responsive when near
            const rootSpeed = mode === "snap" ? 2 : 1.0 + 7.5 * proxCurve
            const rootRate = 1 - Math.exp(-dt * rootSpeed)

            for (const st of list) {
                const prevRoot = at(st.s)
                const prevRx = prevRoot.x - prevRoot.nx * 3, prevRy = prevRoot.y - prevRoot.ny * 3
                const prevEx = st.ex, prevEy = st.ey

                const target = near.s + st.spread * spreadPx
                st.s += loopDiff(st.s, target) * rootRate
                const root = at(st.s)
                const rx = root.x - root.nx * 3, ry = root.y - root.ny * 3
                let pinTip = false
                const gp = gripAt(st.grip)
                if (seeking) {
                    const vx = gp.x - rx, vy = gp.y - ry
                    const vl = Math.hypot(vx, vy) || 1
                    const ease = seekF * seekF * (3 - 2 * seekF)
                    // Gentle pulse without abrupt twitching
                    const dart = Math.pow(Math.max(0, Math.sin(time * 1.2 + st.phase * 1.5)), 4) * 0.25 * dartK
                    // Non-linear reach length: stay small and subtle when far, extend fully when near
                    const reachScale = Math.pow(prox, 2.0)
                    const len = Math.max(3, vl * st.reachK * 0.85 * reachScale * ease * (1 + dart))
                    // Normal organic breathing undulation — no high-frequency vibration
                    const sway = Math.sin(time * 1.4 + st.phase) * (1.2 + 3.2 * ease)
                    const tx = rx + (vx / vl) * len - (vy / vl) * sway
                    const ty = ry + (vy / vl) * len + (vx / vl) * sway
                    // Normal smooth tip follow rate: slow when far (~0.8/s), clean and snappy when near (~9.0/s)
                    const tipFollowRate = 0.8 + 8.2 * proxCurve
                    const k = 1 - Math.exp(-dt * tipFollowRate)
                    st.ex += (tx - st.ex) * k
                    st.ey += (ty - st.ey) * k
                    pinTip = true
                    st.seg = (Math.hypot(st.ex - rx, st.ey - ry) * (st.slack + 0.06)) / (NP - 1)
                } else if (holding) {
                    let gx = gp.x, gy = gp.y
                    if (mode === "grow") {
                        const coil = Math.pow(1 - grow, 1.6) * (st.hair ? coilPx * 0.54 : coilPx)
                        const a = st.phase + grow * coilRad
                        gx += Math.cos(a) * coil
                        gy += Math.sin(a) * coil * 0.8
                    }
                    const holdNear = Math.max(0, Math.min(1, 1 - stretch))
                    const holdRate = mode === "grow"
                        ? 10 + 20 * proxFast + st.follow
                        : 5 + (18 + st.follow * 1.2) * (0.2 + 0.8 * holdNear)
                    const k = 1 - Math.exp(-dt * holdRate)
                    st.ex += (gx - st.ex) * k
                    st.ey += (gy - st.ey) * k
                    pinTip = true
                    st.seg = (Math.hypot(st.ex - rx, st.ey - ry) * st.slack) / (NP - 1)
                } else {
                    st.seg *= Math.exp(-dt * 6.5)
                    if (st.seg * (NP - 1) > 1.5) alive++
                }

                // Smooth advection: stable velocity transfer without jitter
                const advectFarNear = 0.08 + 0.32 * proxCurve
                const drx = (rx - prevRx) * advectFarNear, dry = (ry - prevRy) * advectFarNear
                const dex = (st.ex - prevEx) * advectFarNear, dey = (st.ey - prevEy) * advectFarNear
                const advect = pinTip ? 0.32 : 0
                const damp = mode === "snap" ? num(A.snapDamping, 86, 0, 99) / 100 : num(A.damping, 92, 0, 99) / 100
                for (let i = 1; i < NP; i++) {
                    if (advect > 0) {
                        const f = i / (NP - 1)
                        const ax = (drx * (1 - f) + dex * f) * advect
                        const ay = (dry * (1 - f) + dey * f) * advect
                        st.x[i] += ax; st.y[i] += ay
                        st.px[i] += ax; st.py[i] += ay
                    }
                    const vx = (st.x[i] - st.px[i]) * damp, vy = (st.y[i] - st.py[i]) * damp
                    st.px[i] = st.x[i]; st.py[i] = st.y[i]
                    const mid = Math.sin((i / (NP - 1)) * Math.PI)
                    const wx = Math.sin(time * 1.1 + st.phase + i * 0.4) * (swayAmp * 0.6) * mid
                    const wy = Math.cos(time * 0.9 + st.phase * 1.1 + i * 0.35) * (swayAmp * 0.6) * mid
                    st.x[i] += vx + wx * dt * dt
                    st.y[i] += vy + (gravity + wy) * dt * dt
                }
                st.x[0] = st.px[0] = rx; st.y[0] = st.py[0] = ry
                if (pinTip) { st.x[NP - 1] = st.ex; st.y[NP - 1] = st.ey }
                const len = Math.max(0.01, st.seg)
                for (let it = 0; it < 10; it++) {
                    for (let i = 0; i < NP - 1; i++) {
                        const dx = st.x[i + 1] - st.x[i], dy = st.y[i + 1] - st.y[i]
                        const d = Math.hypot(dx, dy) || 0.0001
                        const diff = (d - len) / d
                        const a = i === 0 ? 0 : 0.5, b = pinTip && i + 1 === NP - 1 ? 0 : i === 0 ? 1 : 0.5
                        const m = a + b || 1
                        st.x[i] += dx * diff * (a / m); st.y[i] += dy * diff * (a / m)
                        st.x[i + 1] -= dx * diff * (b / m); st.y[i + 1] -= dy * diff * (b / m)
                    }
                }
                for (let pass = 0; pass < 2; pass++) {
                    for (let i = 1; i < NP - 1; i++) {
                        if (pinTip && i === NP - 1) continue
                        st.x[i] += ((st.x[i - 1] + st.x[i + 1]) / 2 - st.x[i]) * 0.22
                        st.y[i] += ((st.y[i - 1] + st.y[i + 1]) / 2 - st.y[i]) * 0.22
                    }
                }
                if (!Number.isFinite(st.x[NP - 1])) { st.x.fill(rx); st.y.fill(ry); st.px.fill(rx); st.py.fill(ry) }
            }
            if (mode === "snap" && alive === 0) { mode = "idle"; list = []; webs = [] }

            // mound spring: critically damped, smooth organic bounce without vibration
            const moundK = num(A.mound, 145, 0, 300) / 100
            const moundTarget = (holding ? 8 + 22 * stretch : seeking ? 5 + 14 * seekF : 0) * moundK
            const moundStiff = 90 + 70 * prox
            moundV += ((moundTarget - mound) * moundStiff - moundV * 22) * dt
            mound += moundV * dt
            if (holding || seeking) {
                const moundSpeed = 1.2 + 8.0 * prox
                moundS += loopDiff(moundS, near.s) * (1 - Math.exp(-dt * moundSpeed))
                const e = at(moundS)
                const tx = anchor.x - e.x, ty = anchor.y - e.y, tl = Math.hypot(tx, ty) || 1
                moundDir = { x: e.nx * 0.55 + (tx / tl) * 0.45, y: e.ny * 0.55 + (ty / tl) * 0.45 }
            }

            for (let k = spikes.length - 1; k >= 0; k--) { spikes[k].age += dt; if (spikes[k].age > spikes[k].life) spikes.splice(k, 1) }
            for (let k = drops.length - 1; k >= 0; k--) {
                const d = drops[k]
                d.age += dt
                d.vy += 520 * dt
                d.vx *= Math.exp(-dt * 2); d.vy *= Math.exp(-dt * 1)
                d.x += d.vx * dt; d.y += d.vy * dt
                d.r *= Math.exp(-dt * 1.5)
                if (d.age > 0.9 || nearest(d.x, d.y).dist < -d.r) drops.splice(k, 1)
            }

            // ---- upload to the shader ----
            const thin = 1 - thinK * stretch
            const pulseK = num(A.pulse, 24, 0, 100) / 100
            const mains = list.filter((s) => !s.hair).slice(0, MS)
            let minX = pill.x, minY = pill.y, maxX = pill.x + pill.w, maxY = pill.y + pill.h
            const grow2 = seeking ? 0.55 + 0.45 * seekF : 1
            mains.forEach((st, si) => {
                let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity
                for (let i = 0; i < NP; i++) {
                    const f = i / (NP - 1)
                    let r = st.width * (3.0 - 1.9 * f) * thin * grow2 * widthK
                    if (holding) r *= 1 + pulseK * Math.sin(f * 9 - time * 6 + st.phase) * Math.sin(f * Math.PI)
                    if (mode === "snap") r *= 1.15
                    const o = (si * NP + i) * 4
                    const rr = Math.max(0.55, r)
                    pts[o] = st.x[i]; pts[o + 1] = st.y[i]; pts[o + 2] = rr; pts[o + 3] = 1
                    bx0 = Math.min(bx0, st.x[i] - rr); bx1 = Math.max(bx1, st.x[i] + rr)
                    by0 = Math.min(by0, st.y[i] - rr); by1 = Math.max(by1, st.y[i] + rr)
                }
                box[si * 4] = bx0; box[si * 4 + 1] = by0; box[si * 4 + 2] = bx1; box[si * 4 + 3] = by1
                minX = Math.min(minX, bx0); maxX = Math.max(maxX, bx1)
                minY = Math.min(minY, by0); maxY = Math.max(maxY, by1)
            })
            if (spikes.length > 0) {
                spk.fill(0); spkR.fill(0)
                spikes.forEach((sp, k) => {
                    const p = sp.age / sp.life
                    const up = p < 0.15 ? 1 - Math.pow(1 - p / 0.15, 3) : p > 0.45 ? Math.max(0, 1 - (p - 0.45) / 0.55) : 1
                    const len = sp.len * (p > 0.45 ? up * up * (3 - 2 * up) : up)
                    const b = at(sp.s)
                    const sway = Math.sin(sp.age * 14) * Math.exp(-sp.age * 3) * 0.35
                    const ang = Math.atan2(b.ny, b.nx) + sp.tilt + sway
                    const tx = b.x + Math.cos(ang) * len, ty = b.y + Math.sin(ang) * len
                    spk[k * 4] = b.x - b.nx * 2; spk[k * 4 + 1] = b.y - b.ny * 2; spk[k * 4 + 2] = tx; spk[k * 4 + 3] = ty
                    spkR[k * 4] = 2.6 * Math.min(1, up + 0.2); spkR[k * 4 + 1] = len > 0.6 ? 1 : 0
                    minX = Math.min(minX, tx); maxX = Math.max(maxX, tx); minY = Math.min(minY, ty); maxY = Math.max(maxY, ty)
                })
            }
            if (drops.length > 0) {
                drp.fill(0)
                drops.forEach((d, k) => {
                    drp[k * 4] = d.x; drp[k * 4 + 1] = d.y; drp[k * 4 + 2] = d.r; drp[k * 4 + 3] = 1
                    minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); minY = Math.min(minY, d.y); maxY = Math.max(maxY, d.y)
                })
            }
            const me = at(moundS)
            const mlen = Math.max(0, mound)
            const mr = Math.max(0, mound) > 0.3 ? (9 + spreadPx * 0.32) * Math.min(1, mound / 6) : 0
            const mtx = me.x + moundDir.x * mlen, mty = me.y + moundDir.y * mlen
            if (mr > 0) {
                minX = Math.min(minX, mtx - mr); maxX = Math.max(maxX, mtx + mr)
                minY = Math.min(minY, mty - mr); maxY = Math.max(maxY, mty + mr)
            }

            const rim = num(A.rim, 100, 0, 300) / 100, glint = num(A.glint, 100, 0, 300) / 100
            const shadowK = shadowShows(L.background) ? num(A.shadow, 20, 0, 100) / 100 : 0
            const still = mode === "idle" && spikes.length === 0 && drops.length === 0 && mr === 0
            const glKey = still ? [w, h, glDpr, pill.x, pill.y, pill.w, pill.h, lean.toFixed(3), goo, shine, rim, glint, shadowK].join("|") : ""
            if (!still || glKey !== lastGlKey) {
                const pad = 34
                const x0 = Math.max(0, minX - pad), x1 = Math.min(w, maxX + pad), y0 = Math.max(0, minY - pad), y1 = Math.min(h, maxY + pad + 10)
                // Convert CSS bounding box to WebGL scissor coordinates (bottom-left origin)
                const sx = Math.max(0, Math.floor(x0 * glDpr))
                const sy = Math.max(0, Math.floor((h - y1) * glDpr))
                const sw = Math.min(glc.width - sx, Math.ceil((x1 - x0) * glDpr))
                const sh = Math.min(glc.height - sy, Math.ceil((y1 - y0) * glDpr))

                // Clear the union of previous and current scissor rects so we never clear the full screen
                const ux0 = Math.min(prevGlScissor.x, sx)
                const uy0 = Math.min(prevGlScissor.y, sy)
                const ux1 = Math.max(prevGlScissor.x + prevGlScissor.w, sx + sw)
                const uy1 = Math.max(prevGlScissor.y + prevGlScissor.h, sy + sh)
                gl.scissor(ux0, uy0, Math.max(1, ux1 - ux0), Math.max(1, uy1 - uy0))
                gl.clearColor(0, 0, 0, 0)
                gl.clear(gl.COLOR_BUFFER_BIT)
                gl.scissor(sx, sy, Math.max(1, sw), Math.max(1, sh))
                prevGlScissor = { x: sx, y: sy, w: sw, h: sh }

                gl.uniform2f(U.uRes, glc.width, glc.height)
                gl.uniform1f(U.uDpr, glDpr)
                gl.uniform4f(U.uPill, pill.x, pill.y, pill.w, pill.h)
                gl.uniform4fv(U.uPts, pts)
                gl.uniform4fv(U.uBox, box)
                gl.uniform1f(U.uCount, mains.length)
                gl.uniform1f(U.uSpkCount, spikes.length)
                if (spikes.length > 0) {
                    gl.uniform4fv(U.uSpk, spk)
                    gl.uniform4fv(U.uSpkR, spkR)
                }
                gl.uniform1f(U.uDropCount, drops.length)
                if (drops.length > 0) {
                    gl.uniform4fv(U.uDrop, drp)
                }
                gl.uniform4f(U.uMound, me.x - me.nx * 6, me.y - me.ny * 6, mtx, mty)
                gl.uniform2f(U.uMoundR, mr, mr * 0.45)
                gl.uniform1f(U.uLean, lean)
                gl.uniform3f(U.uBase, goo[0], goo[1], goo[2])
                gl.uniform3f(U.uShine, shine[0], shine[1], shine[2])
                gl.uniform1f(U.uRim, rim)
                gl.uniform1f(U.uGlint, glint)
                gl.uniform1f(U.uShadow, shadowK)

                const X = (v: number) => (v / w) * 2 - 1, Y = (v: number) => 1 - (v / h) * 2
                quadData.set([X(x0), Y(y0), X(x1), Y(y0), X(x0), Y(y1), X(x1), Y(y1)])
                gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.DYNAMIC_DRAW)
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
            }
            lastGlKey = glKey

            // ---- the goo creeping over the glove ----
            const skinIn = 1000 / num(A.skinInMs, 2000, 100, 20000)
            const skinOut = 1000 / num(A.skinOutMs, 700, 50, 20000)
            for (let g = 0; g < coat.length; g++) {
                const caught = holding && list.some((st) => st.gi === g && Math.hypot(st.ex - gripAt(st.grip).x, st.ey - gripAt(st.grip).y) < 10)
                coat[g] = caught ? Math.min(1, coat[g] + dt * skinIn) : Math.max(0, coat[g] - dt * skinOut)
            }

            // ---- the overlay: fine hairs and web threads, then the pointer on top ----
            const ovDraw = list.length > 0 || (drawn && present)
            if (prevOvBox.w > 0 && prevOvBox.h > 0) {
                hx.setTransform(dpr, 0, 0, dpr, 0, 0)
                hx.clearRect(prevOvBox.x, prevOvBox.y, prevOvBox.w, prevOvBox.h)
                prevOvBox = { x: 0, y: 0, w: 0, h: 0 }
            }
            if (!ovDraw) return

            hx.setTransform(dpr, 0, 0, dpr, 0, 0)
            let ovMinX = Infinity, ovMinY = Infinity, ovMaxX = -Infinity, ovMaxY = -Infinity
            const expandOv = (x0: number, y0: number, x1: number, y1: number) => {
                if (x0 < ovMinX) ovMinX = x0
                if (y0 < ovMinY) ovMinY = y0
                if (x1 > ovMaxX) ovMaxX = x1
                if (y1 > ovMaxY) ovMaxY = y1
            }

            hx.lineCap = "round"
            hx.lineJoin = "round"
            if (list.length && (holding || mode === "snap")) {
                for (const st of list) {
                    for (let i = 0; i < NP; i++) expandOv(st.x[i] - 6, st.y[i] - 6, st.x[i] + 6, st.y[i] + 6)
                }
                if (A.hairs !== false) {
                    hx.strokeStyle = cssRgb(mixRgb(goo, shine, 0.01), 0.9)
                    for (const st of list) {
                        if (!st.hair) continue
                        hx.lineWidth = 0.7 * thin * widthK
                        hx.beginPath()
                        hx.moveTo(st.x[0], st.y[0])
                        for (let i = 1; i < NP - 1; i++) hx.quadraticCurveTo(st.x[i], st.y[i], (st.x[i] + st.x[i + 1]) / 2, (st.y[i] + st.y[i + 1]) / 2)
                        hx.lineTo(st.x[NP - 1], st.y[NP - 1])
                        hx.stroke()
                    }
                }
                if (mode === "hold" && A.webs !== false) {
                    hx.strokeStyle = cssRgb(mixRgb(goo, shine, 0.03), 0.6)
                    hx.lineWidth = 0.5
                    for (const [a, b, i, j, kink] of webs) {
                        const As = list[a], Bs = list[b]
                        if (!As || !Bs) continue
                        hx.beginPath()
                        hx.moveTo(As.x[i], As.y[i])
                        hx.lineTo((As.x[i] + Bs.x[j]) / 2 + kink, (As.y[i] + Bs.y[j]) / 2 - Math.abs(kink) * 0.4)
                        hx.lineTo(Bs.x[j], Bs.y[j])
                        hx.stroke()
                    }
                }
            }

            if (drawn && present) {
                const hx0 = hand.x - shape.hot[0] * sc - 8
                const hy0 = hand.y - shape.hot[1] * sc - 8
                expandOv(hx0, hy0, hx0 + 44 * sc, hy0 + 48 * sc)
                hx.save()
                hx.translate(hand.x - shape.hot[0] * sc, hand.y - shape.hot[1] * sc)
                hx.scale(sc, sc)
                hx.save()
                hx.translate(2.5, 4.5)
                hx.fillStyle = "rgba(0,0,0,0.15)"
                for (const p of shape.shadow) hx.fill(p)
                hx.restore()
                hx.fillStyle = "#ffffff"
                for (const p of shape.fill) hx.fill(p)
                if (coat.some((c) => c > 0.01)) {
                    const skinHi = cssRgb(mixRgb(goo, shine, 0.33)), skinMid = cssRgb(mixRgb(goo, shine, 0.06)), skinLo = cssRgb(goo)
                    hx.save()
                    hx.clip(shape.clip)
                    for (let g = 0; g < coat.length; g++) {
                        const c = coat[g]
                        if (c < 0.01) continue
                        const e = c * c * (3 - 2 * c)
                        const [gx0, gy0] = shape.grips[g]
                        const cx0 = gx0 + (shape.creep[0] - gx0) * e * 0.35, cy0 = gy0 + (shape.creep[1] - gy0) * e * 0.35
                        const R = 2.4 + e * 7.5
                        hx.beginPath()
                        for (let k = 0; k <= 28; k++) {
                            const a = (k / 28) * Math.PI * 2
                            const rr = R * (1 + 0.17 * Math.sin(4 * a + g * 1.7 + time * 2.2) + 0.08 * Math.sin(7 * a - time * 3.1 + g))
                            const x = cx0 + Math.cos(a) * rr, y = cy0 + Math.sin(a) * rr
                            if (k === 0) hx.moveTo(x, y); else hx.lineTo(x, y)
                        }
                        hx.closePath()
                        const grad = hx.createRadialGradient(cx0 - R * 0.35, cy0 - R * 0.4, 0, cx0, cy0, R * 1.15)
                        grad.addColorStop(0, skinHi)
                        grad.addColorStop(0.28, skinMid)
                        grad.addColorStop(1, skinLo)
                        hx.fillStyle = grad
                        hx.fill()
                    }
                    hx.restore()
                }
                hx.strokeStyle = "#0b0b0b"
                hx.lineJoin = "round"
                for (const [p, lw] of shape.stroke) { hx.lineWidth = lw; hx.stroke(p) }
                hx.restore()
            }
            if (holding && list.length) {
                hx.lineCap = "round"
                hx.lineJoin = "round"
                hx.strokeStyle = cssRgb(mixRgb(goo, shine, 0.005))
                for (const st of list) {
                    const gp = gripAt(st.grip)
                    const gap = Math.hypot(st.ex - gp.x, st.ey - gp.y)
                    const on = Math.max(0, Math.min(1, 1 - gap / 18))
                    if (on <= 0) continue
                    const from = Math.max(0, NP - 4)
                    hx.globalAlpha = on
                    for (let i = from; i < NP - 1; i++) {
                        const f = i / (NP - 1)
                        hx.lineWidth = Math.max(0.6, st.width * (3.0 - 1.9 * f) * thin * 2 * widthK) * (st.hair ? 0.45 : 1)
                        const x0 = i === from ? st.x[i] : (st.x[i - 1] + st.x[i]) / 2, y0 = i === from ? st.y[i] : (st.y[i - 1] + st.y[i]) / 2
                        const last = i === NP - 2
                        hx.beginPath()
                        hx.moveTo(x0, y0)
                        hx.quadraticCurveTo(st.x[i], st.y[i], last ? st.x[NP - 1] : (st.x[i] + st.x[i + 1]) / 2, last ? st.y[NP - 1] : (st.y[i] + st.y[i + 1]) / 2)
                        hx.stroke()
                    }
                    hx.globalAlpha = 1
                }
            }
            if (ovMinX < ovMaxX && ovMinY < ovMaxY) {
                const ox = Math.max(0, Math.floor(ovMinX - 8))
                const oy = Math.max(0, Math.floor(ovMinY - 8))
                prevOvBox = {
                    x: ox,
                    y: oy,
                    w: Math.min(w - ox, Math.ceil(ovMaxX - ox + 16)),
                    h: Math.min(h - oy, Math.ceil(ovMaxY - oy + 16)),
                }
            }
        }
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            if (document.hidden || document.body.style.overflow === 'hidden') return
            draw(now)
        }
        let roRaf: number | null = null
        const throttledFit = () => {
            if (roRaf !== null) cancelAnimationFrame(roRaf)
            roRaf = requestAnimationFrame(fit)
        }
        const ro = new ResizeObserver(throttledFit)
        ro.observe(stage)
        fit()
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            if (roRaf !== null) cancelAnimationFrame(roRaf)
            ro.disconnect()
            window.removeEventListener("pointermove", onMove)
            stage.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            window.removeEventListener("scroll", updateStageRect)
            btn.removeEventListener("keydown", onKeyDown)
            btn.removeEventListener("keyup", onKeyUp)
            btn.removeEventListener("blur", onKeyUp)
            glc.removeEventListener("webglcontextlost", onContextLost)
            stage.style.cursor = ""
            btn.style.cursor = ""
            btn.style.transform = ""
            disposeGL()
        }
    }, [])

    const goo = toRgb(gooColor, GOO_FALLBACK)
    const pad = Math.round(num(size, 42, 24, 240) * 0.5625)
    const grain = num(adv.grain, 0, 0, 100) / 100
    const vignette = num(adv.vignette, 0, 0, 100) / 100

    return (
        <div
            ref={stageRef}
            style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                touchAction: "pan-y",
                background,
                ...style,
            }}
        >
            <style>{`.venom-pill{outline:none}.venom-pill:focus-visible{outline:3px solid rgba(255,255,255,.35);outline-offset:5px}`}</style>
            <canvas ref={handRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 30 }} aria-hidden="true" />
            <canvas ref={glRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 10 }} aria-hidden="true" />
            <button
                ref={btnRef}
                type="button"
                className="venom-pill"
                onClick={onClick}
                style={{
                    position: "relative",
                    zIndex: 20,
                    height: num(size, 42, 24, 240),
                    padding: `0 ${pad}px`,
                    borderRadius: 9999,
                    border: 0,
                    margin: 0,
                    color: textColor,
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Inter, system-ui, sans-serif",
                    fontSize: (font as any)?.fontSize || (num(size, 42, 24, 240) <= 50 ? 13 : 16),
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    ...font,
                    transformOrigin: "50% 50%",
                    WebkitTapHighlightColor: "transparent",
                    background: fallback
                        ? `linear-gradient(180deg,${cssRgb(mixRgb(goo, [1, 1, 1], 0.1))} 0%,${cssRgb(goo)} 42%,${cssRgb(mixRgb(goo, [0, 0, 0], 0.7))} 100%)`
                        : "transparent",
                    boxShadow: fallback
                        ? "inset 0 1px 0 rgba(255,255,255,.14), inset 0 -1.5px 0 rgba(255,255,255,.22), 0 18px 28px -14px rgba(0,0,0,.55)"
                        : "none",
                    textShadow: (textColor === '#000000' || textColor === '#0b0b0b' || textColor === 'black' || textColor.toLowerCase() === '#000')
                        ? "none"
                        : "0 1px 0 rgba(0,0,0,.75), 0 -0.5px 0 rgba(255,255,255,.25)",
                }}
            >
                {label}
            </button>
            {vignette > 0 && (
                <div
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        zIndex: 35,
                        background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,${0.85 * vignette}) 100%)`,
                    }}
                />
            )}
            {grain > 0 && (
                <div
                    aria-hidden="true"
                    style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 40, opacity: 0.45 * grain, backgroundImage: GRAIN_URL, backgroundSize: "180px 180px" }}
                />
            )}
        </div>
    )
}

const __originkitPresetProps = {
  "gooColor": "#ffffff",
  "textColor": "#000000",
  "reach": 160,
  "advanced": {
    "rim": 62,
    "coil": 14,
    "dart": 12,
    "sway": 10,
    "webs": true,
    "drops": 35,
    "glint": 165,
    "grain": 0,
    "hairs": true,
    "mound": 145,
    "pulse": 45,
    "sense": 520,
    "shine": "#B8C4D4",
    "recoil": 110,
    "shadow": 45,
    "spikes": 115,
    "damping": 88,
    "gravity": 260,
    "lungeMs": 260,
    "release": 420,
    "suitWeb": 100,
    "lingerMs": 1700,
    "skinInMs": 2000,
    "vignette": 0,
    "coilAngle": 468,
    "skinOutMs": 700,
    "fingerLift": 52,
    "gloveScale": 155,
    "pressScale": 86,
    "snapDamping": 82,
    "strandWidth": 135,
    "stretchThin": 50,
    "ghostDelayMs": 2500
  }
};

export function VenomButton(props: Props) {
  return <__OriginkitBase_VenomButton {...(__originkitPresetProps as Props)} {...props} />;
}

export { VenomButton as FeedbackButton };
export default VenomButton;
