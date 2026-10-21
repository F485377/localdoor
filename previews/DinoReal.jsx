import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

// 旅のおともキャラクター「ドキちゃん」（緑の恐竜）の 3D 版（作り込み版）。
// 体・頭・腕・ブーツは「部品の寄せ集め」ではなく、形の式（SDF）をなめらかにつないで 1 つの面として作る。
// 肌はうろこの凹凸（シェーダーで作る）と、背中は濃い緑・おなかと口元は黄色のグラデーション。
//   talking   … しゃべる（口が 開く → 半開き → 閉じる）
//   cheer     … 数字が変わるたびに、グッド（腕を上げてサムズアップ → しばらくして下ろす）
//   skipBirth … 登場の演出を飛ばす
//   pose      … "full"（全身）| "head"（顔だけ）

// ───────────── 形の式（SDF）の道具 ─────────────
const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
// 楕円体（iq の近似）
function ell(x, y, z, a, b, c) {
  const k0 = len3(x / a, y / b, z / c);
  const k1 = len3(x / (a * a), y / (b * b), z / (c * c));
  return k1 === 0 ? -Math.min(a, b, c) : (k0 * (k0 - 1)) / k1;
}
const sph = (x, y, z, r) => len3(x, y, z) - r;
// 太さが変わるカプセル（a から b へ、半径 ra → rb）
function cone(x, y, z, a, b, ra, rb) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const pax = x - a[0], pay = y - a[1], paz = z - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const h = Math.min(Math.max((pax * bax + pay * bay + paz * baz) / l2, 0), 1);
  return len3(pax - bax * h, pay - bay * h, paz - baz * h) - (ra + (rb - ra) * h);
}
const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
const smax = (a, b, k) => -smin(-a, -b, k);
const sstep = (e0, e1, x) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};

// 式の面を三角形にする（MarchingCubes）→ 面にぴったり乗せ直し、向きと色を式から求める
function sdfGeometry(sdf, center, half, res, colorFn) {
  const scratch = new THREE.MeshBasicMaterial();
  const mc = new MarchingCubes(res, scratch, false, false, 400000);
  mc.isolation = 0;
  const h = res / 2;
  for (let k = 0; k < res; k++)
    for (let j = 0; j < res; j++)
      for (let i = 0; i < res; i++) {
        const x = center[0] + ((i - h) / h) * half[0];
        const y = center[1] + ((j - h) / h) * half[1];
        const z = center[2] + ((k - h) / h) * half[2];
        mc.field[i + j * res + k * res * res] = -sdf(x, y, z);
      }
  mc.update();
  const n = mc.count;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const e = 1e-3;
  const grad = (x, y, z) => [
    sdf(x + e, y, z) - sdf(x - e, y, z),
    sdf(x, y + e, z) - sdf(x, y - e, z),
    sdf(x, y, z + e) - sdf(x, y, z - e),
  ];
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    let x = center[0] + mc.positionArray[i * 3] * half[0];
    let y = center[1] + mc.positionArray[i * 3 + 1] * half[1];
    let z = center[2] + mc.positionArray[i * 3 + 2] * half[2];
    let g = grad(x, y, z);
    for (let s = 0; s < 3; s++) {
      const d = sdf(x, y, z);
      const l2 = (g[0] * g[0] + g[1] * g[1] + g[2] * g[2]) / (4 * e * e);
      if (l2 < 1e-10) break;
      const f = d / l2 / (2 * e);
      x -= f * g[0];
      y -= f * g[1];
      z -= f * g[2];
      g = grad(x, y, z);
    }
    const gl = Math.hypot(g[0], g[1], g[2]) || 1;
    const nx = g[0] / gl, ny = g[1] / gl, nz = g[2] / gl;
    pos.set([x, y, z], i * 3);
    nor.set([nx, ny, nz], i * 3);
    colorFn(c, x, y, z, nx, ny, nz);
    col.set([c.r, c.g, c.b], i * 3);
  }
  mc.geometry.dispose();
  scratch.dispose();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  return geo;
}

// 内側の点 o から方向 dir に進んで、面にぶつかる点（二分法）
function surfacePoint(sdf, o, dir, maxDist = 3) {
  const d = dir.clone().normalize();
  let lo = 0;
  let hi = maxDist;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    const p = o.clone().addScaledVector(d, m);
    if (sdf(p.x, p.y, p.z) < 0) lo = m;
    else hi = m;
  }
  return o.clone().addScaledVector(d, lo);
}
function surfaceNormal(sdf, p) {
  const e = 1e-3;
  return new THREE.Vector3(
    sdf(p.x + e, p.y, p.z) - sdf(p.x - e, p.y, p.z),
    sdf(p.x, p.y + e, p.z) - sdf(p.x, p.y - e, p.z),
    sdf(p.x, p.y, p.z + e) - sdf(p.x, p.y, p.z - e),
  ).normalize();
}
// 前から見た (x, y) の場所の、面の位置（手前から奥へ探す）
function frontZ(sdf, x, y, from = 2, inside = 0) {
  let lo = inside;
  let hi = from;
  if (sdf(x, y, lo) > 0) return null;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (sdf(x, y, m) < 0) lo = m;
    else hi = m;
  }
  return lo;
}

// ───────────── 色・素材 ─────────────
const COL = {
  green: new THREE.Color(0x4a8c34),
  greenDark: new THREE.Color(0x2e6324),
  greenLight: new THREE.Color(0x6aab48),
  cream: new THREE.Color(0xf0bf48),
  creamDeep: new THREE.Color(0xe0a743),
  blush: new THREE.Color(0xf08a6a),
};

// 肌：うろこの凹凸と、うろこのすき間の色の沈みをシェーダーで足す
function skinMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.5,
    clearcoat: 0.25,
    clearcoatRoughness: 0.45,
    envMapIntensity: 0.35,
  });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vObjPos;
vec3 hash33(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
// うろこ：ボロノイの「いちばん近い点」と「2番目に近い点」の差（すき間ほど 0 に近い）
float scaleEdge(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int x = -1; x <= 1; x++)
  for (int y = -1; y <= 1; y++)
  for (int z = -1; z <= 1; z++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = hash33(i + g);
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return d2 - d1;
}
vec3 skinPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection) {
  vec3 vSigmaX = normalize(dFdx(surf_pos.xyz));
  vec3 vSigmaY = normalize(dFdy(surf_pos.xyz));
  vec3 vN = surf_norm;
  vec3 R1 = cross(vSigmaY, vN);
  vec3 R2 = cross(vN, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDirection;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float sEdge = scaleEdge(vObjPos * 7.5);
float sCell = smoothstep(0.0, 0.16, sEdge);
diffuseColor.rgb *= mix(0.88, 1.0, sCell);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
float sH = sCell * 0.6 + smoothstep(0.1, 0.5, sEdge) * 0.4;
normal = skinPerturb(-vViewPosition, normal, vec2(dFdx(sH), dFdy(sH)) * 0.25, faceDirection);`,
      );
  };
  m.customProgramCacheKey = () => 'dino-skin-v2';
  return m;
}
const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, envMapIntensity: 0.6, ...o });
const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });

// ───────────── 各部の形 ─────────────
// 体（胴・胸・おなか・首・太もも・すね）
const LEG_X = 0.46;
function bodySdf(x, y, z) {
  let d = ell(x, y + 0.72, z, 0.98, 1.0, 0.86);
  d = smin(d, ell(x, y + 0.1, z + 0.02, 0.74, 0.62, 0.68), 0.35);
  d = smin(d, ell(x, y + 0.8, z - 0.32, 0.74, 0.78, 0.6), 0.2);
  d = smin(d, ell(x, y - 0.28, z - 0.04, 0.5, 0.32, 0.46), 0.25);
  for (const s of [-1, 1]) {
    d = smin(d, ell(x - s * LEG_X, y + 1.38, z - 0.04, 0.36, 0.36, 0.38), 0.22);
    d = smin(d, cone(x, y, z, [s * LEG_X, -1.45, 0.06], [s * LEG_X, -1.8, 0.1], 0.27, 0.21), 0.1);
  }
  return d;
}
function bodyColor(c, x, y, z) {
  c.copy(COL.green);
  // 背中ほど濃く、肩の上ほど少し明るく
  c.lerp(COL.greenDark, sstep(0.0, -0.75, z) * 0.75);
  c.lerp(COL.greenLight, sstep(-0.3, 0.4, y) * sstep(0.0, 0.5, z) * 0.25);
  // おなか（黄色）と、おなかの段々
  const e = (x / 0.6) ** 2 + ((y + 0.8) / 0.82) ** 2;
  const m = sstep(1.08, 0.86, e) * sstep(0.05, 0.3, z);
  const belly = COL.cream.clone().lerp(COL.creamDeep, sstep(-0.2, -1.4, y) * 0.5);
  const lines = Math.pow(0.5 + 0.5 * Math.cos((y + 0.8) * 13), 10);
  belly.multiplyScalar(1 - 0.12 * lines);
  c.lerp(belly, m);
}

// しっぽ（根元を支点に振るので、体とは別の形）
const TAIL = [
  [[-0.25, -0.95, -0.5], 0.4],
  [[-0.85, -1.35, -0.85], 0.28],
  [[-1.4, -1.4, -0.98], 0.17],
  [[-1.86, -1.12, -0.94], 0.06],
];
function tailSdf(x, y, z) {
  let d = 1e9;
  for (let i = 0; i < TAIL.length - 1; i++) d = smin(d, cone(x, y, z, TAIL[i][0], TAIL[i + 1][0], TAIL[i][1], TAIL[i + 1][1]), 0.12);
  return d;
}
function tailColor(c, x, y, z) {
  c.copy(COL.green).lerp(COL.greenDark, sstep(-0.6, -1.1, z) * 0.6 + sstep(-1.1, -1.5, y) * 0.2);
  // しっぽの下側は少し黄色っぽく
  c.lerp(COL.cream, sstep(-1.25, -1.55, y) * sstep(-1.3, -0.4, x) * 0.35);
}

// 頭（首の付け根が原点）
const EYE = { x: 0.33, y: 0.88, z: 0.66, r: 0.235 };
function headSdf(x, y, z) {
  let d = ell(x, y - 0.68, z, 0.96, 0.86, 0.86);
  for (const s of [-1, 1]) d = smin(d, ell(x - s * 0.42, y - 0.36, z - 0.32, 0.46, 0.38, 0.44), 0.25);
  d = smin(d, ell(x, y - 0.44, z - 0.56, 0.6, 0.34, 0.5), 0.22); // 鼻先
  d = smin(d, ell(x, y - 0.18, z - 0.46, 0.58, 0.26, 0.48), 0.2); // あご
  d = smin(d, ell(x, y + 0.05, z, 0.55, 0.35, 0.5), 0.2); // 首へ
  for (const s of [-1, 1]) {
    d = smin(d, ell(x - s * 0.34, y - 1.12, z - 0.6, 0.2, 0.07, 0.13), 0.08); // 眉のふくらみ
    d = smax(d, -sph(x - s * EYE.x, y - EYE.y, z - (EYE.z + 0.06), EYE.r + 0.025), 0.06); // 目のくぼみ
    d = smax(d, -ell(x - s * 0.13, y - 0.6, z - 1.05, 0.045, 0.03, 0.06), 0.025); // 鼻の穴
  }
  return d;
}
function headColor(c, x, y, z) {
  c.copy(COL.green);
  c.lerp(COL.greenDark, sstep(0.1, -0.7, z) * 0.7 + sstep(1.2, 1.5, y) * 0.15);
  c.lerp(COL.greenLight, sstep(0.75, 0.55, y) * sstep(0.6, 1.0, z) * 0.35); // 鼻先の上は明るく
  // 口元とほっぺ（黄色）。鼻先の上は緑のまま
  const t = 0.43 + 0.13 * sstep(0.22, 0.6, Math.abs(x)); // 真ん中は口のすぐ上まで（鼻先は緑）、ほっぺは目の下まで
  const m = sstep(t + 0.04, t - 0.05, y) * sstep(-0.2, 0.2, z);
  c.lerp(COL.cream.clone().lerp(COL.creamDeep, sstep(0.3, -0.1, y) * 0.5), m);
  // ほっぺの赤み
  for (const s of [-1, 1]) {
    const b = Math.exp(-(((x - s * 0.6) / 0.13) ** 2 + ((y - 0.52) / 0.09) ** 2));
    c.lerp(COL.blush, b * 0.55 * sstep(0.2, 0.5, z));
  }
}

// 腕（肩が原点。ふだんは下に垂れる向き）
const HAND = new THREE.Vector3(0, -0.84, 0.06);
function armSdfBase(x, y, z) {
  let d = cone(x, y, z, [0, 0, 0], [0, -0.42, 0.02], 0.19, 0.15);
  d = smin(d, cone(x, y, z, [0, -0.42, 0.02], [0, -0.72, 0.05], 0.15, 0.135), 0.06);
  d = smin(d, ell(x - HAND.x, y - HAND.y, z - HAND.z, 0.16, 0.15, 0.13), 0.08);
  return d;
}
const v3 = (v) => [v.x, v.y, v.z];
function capsuleV(x, y, z, a, b, r) {
  return cone(x, y, z, v3(a), v3(b), r, r);
}
function armColor(c, x, y, z) {
  c.copy(COL.green).lerp(COL.greenDark, sstep(0.05, -0.2, z) * 0.5);
}

// ブーツ（足首が原点）
function bootSdf(x, y, z) {
  let d = cone(x, y, z, [0, 0.14, 0], [0, -0.12, 0.02], 0.25, 0.27); // 筒
  d = smin(d, ell(x, y + 0.2, z - 0.15, 0.3, 0.17, 0.42), 0.12); // 足
  d = smin(d, ell(x, y + 0.24, z - 0.38, 0.25, 0.14, 0.22), 0.08); // つま先
  // 靴底（少し外にはみ出す）と、底の溝
  let sole = ell(x, y + 0.34, z - 0.15, 0.33, 0.07, 0.46);
  for (let k = -4; k <= 4; k++) sole = smax(sole, -ell(x, y + 0.42, z - 0.15 - k * 0.09, 0.4, 0.035, 0.02), 0.01);
  d = smin(d, sole, 0.03);
  d = smax(d, -ell(x, y - 0.14, z, 0.18, 0.06, 0.18), 0.03); // 履き口のへこみ
  return d;
}
const BOOT = new THREE.Color(0x8a4c1f);
const BOOT_DARK = new THREE.Color(0x5a2f10);
const SOLE = new THREE.Color(0x4a2a12);
function bootColor(c, x, y, z) {
  c.copy(BOOT).lerp(BOOT_DARK, sstep(0.0, -0.3, z) * 0.4 + sstep(0.15, -0.1, y) * 0.15);
  c.lerp(new THREE.Color(0xc78445), sstep(0.2, 0.5, z) * sstep(-0.1, -0.25, y) * 0.35); // つま先のてかり
  c.lerp(SOLE, sstep(-0.29, -0.31, y));
  c.lerp(BOOT_DARK, sstep(0.09, 0.13, y) * 0.6); // 履き口のふち
}

// スマホの画面（地図と「すぐ予約」）
function phoneTexture() {
  const cv = document.createElement('canvas');
  cv.width = 300;
  cv.height = 560;
  const g = cv.getContext('2d');
  g.fillStyle = '#eef6ff';
  g.fillRect(0, 0, 300, 560);
  // 地図：道と川と区画
  g.fillStyle = '#dceccf';
  g.fillRect(20, 120, 110, 90);
  g.fillRect(170, 300, 110, 120);
  g.fillStyle = '#cfe4fb';
  g.beginPath();
  g.moveTo(0, 430);
  g.bezierCurveTo(90, 380, 200, 470, 300, 410);
  g.lineTo(300, 450);
  g.bezierCurveTo(200, 510, 90, 420, 0, 470);
  g.fill();
  g.strokeStyle = '#ffffff';
  g.lineCap = 'round';
  g.lineWidth = 18;
  g.beginPath();
  g.moveTo(-10, 330);
  g.lineTo(150, 230);
  g.lineTo(310, 300);
  g.moveTo(90, 70);
  g.lineTo(140, 540);
  g.stroke();
  g.strokeStyle = '#9cc8f2';
  g.lineWidth = 5;
  g.setLineDash([12, 10]);
  g.beginPath();
  g.moveTo(80, 300);
  g.quadraticCurveTo(160, 230, 210, 175);
  g.stroke();
  g.setLineDash([]);
  const pin = (x, y, color) => {
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.beginPath();
    g.ellipse(x, y + 44, 12, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, 24, Math.PI, 0);
    g.quadraticCurveTo(x + 24, y + 20, x, y + 44);
    g.quadraticCurveTo(x - 24, y + 20, x - 24, y);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(x, y, 9, 0, Math.PI * 2);
    g.fill();
  };
  pin(210, 150, '#e23b30');
  pin(80, 270, '#4cb553');
  // 上の帯
  g.fillStyle = '#e23b30';
  g.fillRect(0, 0, 300, 70);
  g.fillStyle = '#fff';
  g.font = 'bold 32px sans-serif';
  g.textAlign = 'center';
  g.fillText('Haisai', 150, 47);
  // 下のボタン
  g.fillStyle = '#e23b30';
  g.beginPath();
  g.roundRect(34, 476, 232, 60, 30);
  g.fill();
  g.fillStyle = '#fff';
  g.font = 'bold 32px sans-serif';
  g.fillText('すぐ予約', 150, 517);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// 目の虹彩：横＝角度、縦＝中心からの距離 で描き、球の一部に貼る
function irisTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 128;
  const g = cv.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, '#120804'); // 瞳孔
  grd.addColorStop(0.36, '#120804');
  grd.addColorStop(0.42, '#5a2a10');
  grd.addColorStop(0.7, '#9a5a24');
  grd.addColorStop(0.86, '#7a3f17');
  grd.addColorStop(0.95, '#2c1406'); // ふちの濃い輪
  grd.addColorStop(1, '#2c1406');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 128);
  // 放射状の筋
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * 256;
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? '230,170,90' : '40,18,6'},${0.15 + Math.random() * 0.2})`;
    g.lineWidth = 1 + Math.random() * 1.5;
    g.beginPath();
    g.moveTo(x, 50 + Math.random() * 10);
    g.lineTo(x + (Math.random() - 0.5) * 6, 100 + Math.random() * 18);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

// 面に沿う帯（ベルト・ひも）
function ribbon(points, normals, width, thickness = 0.02) {
  const n = points.length;
  const pos = [];
  const idx = [];
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const nn = normals[i];
    const t = (i < n - 1 ? points[i + 1].clone().sub(p) : p.clone().sub(points[i - 1])).normalize();
    const side = new THREE.Vector3().crossVectors(nn, t).normalize().multiplyScalar(width / 2);
    const up = nn.clone().multiplyScalar(thickness);
    for (const [sx, sy] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) {
      const v = p.clone().addScaledVector(side, sx).addScaledVector(up, sy);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 4;
    const b = (i + 1) * 4;
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      idx.push(a + k, b + k, b + k2, a + k, b + k2, a + k2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ───────────── 組み立て ─────────────
const ARM_REST_PHONE = new THREE.Euler(-0.55, 0, 1.55);
const UP_Z = -1.75;
const UP_X = -0.7;
const UP_Y = 0.75;

function buildDino() {
  const skin = skinMaterial();
  const red = phys(0xd8362b, { roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const fabric = phys(0xc92a22, { roughness: 0.8, sheen: 0.3, sheenColor: new THREE.Color(0xe05040), sheenRoughness: 0.6, envMapIntensity: 0.3 });
  const metal = phys(0xcfc8b6, { metalness: 0.85, roughness: 0.3 });
  const gold = phys(0xd9a441, { metalness: 0.8, roughness: 0.32 });

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shadowed = [];
  const add = (parent, mesh) => {
    parent.add(mesh);
    mesh.castShadow = true;
    shadowed.push(mesh);
    return mesh;
  };

  // 体
  add(body, new THREE.Mesh(sdfGeometry(bodySdf, [0, -0.7, 0], [1.15, 1.25, 1.0], 112, bodyColor), skin));
  // しっぽ
  const tailPivot = new THREE.Group();
  tailPivot.position.set(-0.25, -0.95, -0.5);
  const tailMesh = add(tailPivot, new THREE.Mesh(sdfGeometry(tailSdf, [-1.05, -1.18, -0.75], [1.0, 0.55, 0.55], 84, tailColor), skin));
  tailMesh.position.set(0.25, 0.95, 0.5);
  body.add(tailPivot);

  // トゲ：根元が太く先が丸い、少し後ろへ反った形
  const spikeGeo = (() => {
    const prof = [
      [0.17, -0.06], [0.172, 0.02], [0.16, 0.12], [0.135, 0.22], [0.1, 0.32], [0.065, 0.4], [0.035, 0.455], [0.012, 0.478], [0, 0.482],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(prof, 32);
    const p = g.attributes.position;
    const colors = [];
    const base = new THREE.Color(0x8e1a14);
    const tip = new THREE.Color(0xd8382a);
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setZ(i, p.getZ(i) - 0.16 * (Math.max(y, 0) / 0.48) ** 2); // 後ろへ反らせる
      const cc = base.clone().lerp(tip, Math.min(Math.max(y / 0.48, 0), 1));
      colors.push(cc.r, cc.g, cc.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  })();
  const spikeMat = phys(0xffffff, { vertexColors: true, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3, envMapIntensity: 0.35 });
  const placeSpike = (parent, sdf, center, angle, size) => {
    // 中心から「真上→真後ろ」へ angle だけ倒した方向の面に立てる
    const dir = new THREE.Vector3(0, Math.cos(angle), -Math.sin(angle));
    const p = surfacePoint(sdf, center, dir);
    const n = surfaceNormal(sdf, p);
    const s = add(parent, new THREE.Mesh(spikeGeo, spikeMat));
    s.scale.setScalar(size);
    s.position.copy(p).addScaledVector(n, -0.03 * size);
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  };
  placeSpike(body, bodySdf, new THREE.Vector3(0, -0.5, 0), 1.25, 0.95);
  placeSpike(body, bodySdf, new THREE.Vector3(0, -0.5, 0), 1.62, 0.85);
  placeSpike(tailPivot, (x, y, z) => tailSdf(x - 0.25, y - 0.95, z - 0.5), new THREE.Vector3(-0.6, -0.4, -0.35), 0.55, 0.6);

  // リュック（背中）：本体・上の丸めた布・ふた・バックル
  const leather = phys(0xb8702f, { roughness: 0.62, clearcoat: 0.15 });
  const leatherDark = phys(0x8a5020, { roughness: 0.7 });
  const pack = add(body, new THREE.Mesh(new RoundedBoxGeometry(1.12, 1.1, 0.5, 5, 0.2), leather));
  pack.position.set(0, -0.5, -0.86);
  const roll = add(body, new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.82, 8, 24), phys(0xd3913f, { roughness: 0.8, sheen: 0.6 })));
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, 0.1, -0.84);
  const pocket = add(body, new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.5, 0.36, 4, 0.08), leatherDark));
  pocket.position.set(-0.6, -0.6, -0.78);

  // 肩ベルト：体の前の面に沿わせる。バックル・コンパス・バッジ付き
  const strapMat = phys(0x8f5321, { roughness: 0.66 });
  const strapPath = (s) => {
    const pts = [];
    const nrm = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = s * (0.42 + 0.14 * t);
      const y = 0.32 - 1.32 * t;
      const z = frontZ(bodySdf, x, y);
      const p = new THREE.Vector3(x, y, z);
      const n = surfaceNormal(bodySdf, p);
      pts.push(p.addScaledVector(n, 0.012));
      nrm.push(n);
    }
    return [pts, nrm];
  };
  for (const s of [-1, 1]) {
    const [pts, nrm] = strapPath(s);
    add(body, new THREE.Mesh(ribbon(pts, nrm, 0.17, 0.035), strapMat));
    // バックル
    const i = 9;
    const buckle = add(body, new THREE.Mesh(new RoundedBoxGeometry(0.21, 0.12, 0.04, 2, 0.015), metal));
    buckle.position.copy(pts[i]).addScaledVector(nrm[i], 0.035);
    buckle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm[i]);
  }
  {
    const [pts, nrm] = strapPath(-1);
    const i = 13;
    const compass = new THREE.Group();
    const bezel = add(compass, new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 16, 48), metal));
    const faceDisk = add(compass, new THREE.Mesh(new THREE.CircleGeometry(0.15, 48), phys(0xf6efd9, { roughness: 0.6 })));
    faceDisk.position.z = -0.005;
    for (let k = 0; k < 4; k++) {
      const tick = add(compass, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.004), basic(0x3a2a1a)));
      tick.position.set(Math.sin((k * Math.PI) / 2) * 0.12, Math.cos((k * Math.PI) / 2) * 0.12, 0.002);
      tick.rotation.z = (-k * Math.PI) / 2;
    }
    const needle = new THREE.Shape();
    needle.moveTo(0, 0.11);
    needle.lineTo(0.025, 0);
    needle.lineTo(0, -0.11);
    needle.lineTo(-0.025, 0);
    needle.closePath();
    const nMesh = add(compass, new THREE.Mesh(new THREE.ShapeGeometry(needle), basic(0xd8362b)));
    nMesh.position.z = 0.006;
    nMesh.rotation.z = 0.5;
    const glass = add(compass, new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 16, 0, Math.PI * 2, 0, 0.6), phys(0xffffff, { transparent: true, opacity: 0.18, roughness: 0.02, clearcoat: 1 })));
    glass.rotation.x = Math.PI / 2;
    glass.position.z = -0.1;
    compass.position.copy(pts[i]).addScaledVector(nrm[i], 0.06);
    compass.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm[i]);
    body.add(compass);
  }
  {
    const [pts, nrm] = strapPath(1);
    const i = 4;
    const badge = new THREE.Group();
    add(badge, new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.035, 40), gold)).rotation.x = Math.PI / 2;
    const engr = phys(0x9c6f22, { metalness: 0.7, roughness: 0.4 });
    const fork = add(badge, new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.14, 4, 8), engr));
    fork.position.set(-0.035, -0.01, 0.02);
    for (let k = -1; k <= 1; k++) {
      const tine = add(badge, new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.05, 4, 6), engr));
      tine.position.set(-0.035 + k * 0.014, 0.075, 0.02);
    }
    const spoon = add(badge, new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.11, 4, 8), engr));
    spoon.position.set(0.035, -0.025, 0.02);
    const bowl = add(badge, new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), engr));
    bowl.scale.set(0.8, 1.2, 0.4);
    bowl.position.set(0.035, 0.06, 0.02);
    badge.position.copy(pts[i]).addScaledVector(nrm[i], 0.04);
    badge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm[i]);
    body.add(badge);
  }

  // スカーフ：首の輪・前の三角（胸に沿って垂れる）・結び目と端
  {
    const ringPts = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.sin(a), -0.15, Math.cos(a));
      const p = surfacePoint(bodySdf, new THREE.Vector3(0, 0.3, 0.02), dir, 2);
      ringPts.push(p.addScaledVector(dir.setY(0).normalize(), 0.03));
    }
    add(body, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ringPts, true), 96, 0.08, 14, true), fabric)).scale.set(1, 0.85, 1);
    // 三角の布：格子を作り、胸の面に沿わせる
    const W = 16;
    const H = 14;
    const pos = [];
    const idx = [];
    for (let j = 0; j <= H; j++) {
      const v = j / H;
      const halfW = 0.46 * (1 - v);
      for (let i = 0; i <= W; i++) {
        const u = i / W;
        const x = (u * 2 - 1) * halfW;
        const y = 0.2 - v * 0.62 - 0.05 * (1 - (u * 2 - 1) ** 2) * (1 - v);
        const z = frontZ(bodySdf, x, y) ?? 0.6;
        const p = new THREE.Vector3(x, y, z);
        const n = surfaceNormal(bodySdf, p);
        p.addScaledVector(n, 0.028 + 0.012 * Math.sin(u * 9) * (1 - v)); // 少しのしわ
        pos.push(p.x, p.y, p.z);
      }
    }
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const a = j * (W + 1) + i;
        idx.push(a, a + W + 1, a + 1, a + 1, a + W + 1, a + W + 2);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const tri = add(body, new THREE.Mesh(g, fabric.clone()));
    tri.material.side = THREE.DoubleSide;
    // 結び目と、ひらひらした端
    const knotP = surfacePoint(bodySdf, new THREE.Vector3(0, 0.25, 0.02), new THREE.Vector3(0.35, -0.1, 1), 2);
    const knot = add(body, new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 18), fabric));
    knot.scale.set(1.1, 0.85, 0.75);
    knot.position.copy(knotP).add(new THREE.Vector3(0, 0, 0.06));
    for (const [dx, rot] of [[-0.09, 0.5], [0.1, -0.35]]) {
      const end = new THREE.Shape();
      end.moveTo(-0.05, 0);
      end.quadraticCurveTo(0, 0.02, 0.05, 0);
      end.lineTo(0.02, -0.2);
      end.lineTo(-0.02, -0.18);
      end.closePath();
      const em = add(body, new THREE.Mesh(new THREE.ExtrudeGeometry(end, { depth: 0.015, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), fabric));
      em.position.copy(knot.position).add(new THREE.Vector3(dx, -0.03, 0.02));
      em.rotation.set(-0.3, 0, rot);
    }
  }

  // ───── 頭 ─────
  const head = new THREE.Group();
  head.position.set(0, 0.28, 0.06);
  head.scale.setScalar(1.3);
  body.add(head);
  add(head, new THREE.Mesh(sdfGeometry(headSdf, [0, 0.62, 0.15], [1.1, 1.0, 1.05], 120, headColor), skin));

  const headCenter = new THREE.Vector3(0, 0.68, 0);
  placeSpike(head, headSdf, headCenter, -0.12, 1.45);
  placeSpike(head, headSdf, headCenter, 0.42, 1.25);
  placeSpike(head, headSdf, headCenter, 0.92, 1.1);
  placeSpike(head, headSdf, headCenter, 1.38, 0.95);

  // 目：白目・虹彩（模様つき）・光・うるっとした表面・上まぶた
  const irisTex = irisTexture();
  const lids = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * EYE.x, EYE.y, EYE.z);
    eye.rotation.y = s * 0.3;
    head.add(eye);
    add(eye, new THREE.Mesh(new THREE.SphereGeometry(EYE.r, 48, 32), phys(0xfbf8f2, { roughness: 0.35 })));
    const iris = add(eye, new THREE.Mesh(new THREE.SphereGeometry(EYE.r * 1.004, 64, 16, 0, Math.PI * 2, 0, 0.72), new THREE.MeshPhysicalMaterial({ map: irisTex, roughness: 0.3 })));
    iris.rotation.x = Math.PI / 2;
    iris.rotation.y = -s * 0.04;
    const cornea = add(eye, new THREE.Mesh(new THREE.SphereGeometry(EYE.r * 1.03, 48, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.02, clearcoat: 1, envMapIntensity: 1.2 })));
    cornea.castShadow = false;
    for (const [dx, dy, r] of [[-0.07, 0.08, 0.045], [0.06, -0.06, 0.02]]) {
      const shine = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), basic(0xffffff));
      shine.scale.z = 0.3;
      shine.position.set(dx, dy, EYE.r * 1.02);
      eye.add(shine);
    }
    // 上まぶた（半球を回して目にかぶせる）とまつげの線
    const lid = new THREE.Group();
    const lidMesh = add(lid, new THREE.Mesh(new THREE.SphereGeometry(EYE.r * 1.06, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), skin));
    lidMesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(lidMesh.geometry.attributes.position.count).fill(0).flatMap(() => [COL.green.r * 0.92, COL.green.g * 0.92, COL.green.b * 0.92]), 3));
    const lash = new THREE.Mesh(new THREE.TorusGeometry(EYE.r * 1.06, 0.012, 8, 64), basic(0x1f4a24));
    lash.rotation.x = Math.PI / 2;
    lid.add(lash);
    eye.add(lid);
    lids.push(lid);
  }

  // 口：口元の面に沿わせて描く（開いた口・半開き・閉じたにっこり）。ふちに少し濃いくちびるの線
  const TOP = 0.4;
  const onFace = (shape, lift, seg = 48) => {
    const geo = new THREE.ShapeGeometry(shape, seg);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = frontZ(headSdf, x, y) ?? 0.8;
      const n = surfaceNormal(headSdf, new THREE.Vector3(x, y, z));
      p.setXYZ(i, x + n.x * lift, y + n.y * lift, z + n.z * lift);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const mouthShape = (hw, dep) => {
    const sh = new THREE.Shape();
    sh.moveTo(-hw, TOP + 0.03);
    sh.quadraticCurveTo(0, TOP - 0.02, hw, TOP + 0.03);
    sh.absellipse(0, TOP + 0.03, hw, dep, 0, Math.PI, true);
    return sh;
  };
  const mouthMat = new THREE.MeshPhysicalMaterial({ color: 0x4e1712, roughness: 0.45, clearcoat: 0.5 });
  const tongueMat = new THREE.MeshPhysicalMaterial({ color: 0xe86d66, roughness: 0.45, clearcoat: 0.6 });
  const lipMat = basic(0x6a2a18);
  const makeMouth = (hw, dep) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(onFace(mouthShape(hw, dep), 0.008), mouthMat));
    const tsh = new THREE.Shape();
    tsh.absellipse(0, TOP + 0.03 - dep * 0.7, hw * 0.58, dep * 0.3, 0, Math.PI * 2, false);
    g.add(new THREE.Mesh(onFace(tsh, 0.012), tongueMat));
    // 上の歯 2 本
    for (const s of [-1, 1]) {
      const th = new THREE.Shape();
      const x = s * hw * 0.42;
      th.moveTo(x - 0.035, TOP + 0.015);
      th.lineTo(x + 0.035, TOP + 0.015);
      th.quadraticCurveTo(x + 0.01, TOP - 0.04, x, TOP - 0.06);
      th.quadraticCurveTo(x - 0.01, TOP - 0.04, x - 0.035, TOP + 0.015);
      g.add(new THREE.Mesh(onFace(th, 0.016, 8), basic(0xfffaf0)));
    }
    // くちびるの線（口のふち）
    const edge = [];
    for (let i = 0; i <= 40; i++) {
      const a = Math.PI + (i / 40) * Math.PI;
      const x = Math.cos(a) * hw;
      const y = TOP + 0.03 + Math.sin(a) * dep;
      const z = frontZ(headSdf, x, y) ?? 0.8;
      edge.push(new THREE.Vector3(x, y, z + 0.01));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 60, 0.012, 8, false), lipMat));
    return g;
  };
  const smilePts = [];
  for (let i = 0; i <= 30; i++) {
    const x = -0.4 + (0.8 * i) / 30;
    const y = TOP - 0.01 - 0.08 * (1 - (x / 0.4) ** 2);
    const z = frontZ(headSdf, x, y) ?? 0.8;
    smilePts.push(new THREE.Vector3(x, y, z + 0.012));
  }
  const mouths = {
    open: makeMouth(0.42, 0.23),
    half: makeMouth(0.38, 0.12),
    closed: new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smilePts), 60, 0.02, 10, false), lipMat),
  };
  Object.values(mouths).forEach((m) => head.add(m));

  // ───── 腕 ─────
  const makeArm = (side, extraSdf) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.8, -0.06, 0.1);
    const sdf = (x, y, z) => smin(armSdfBase(x, y, z), extraSdf(x, y, z), 0.035);
    add(shoulder, new THREE.Mesh(sdfGeometry(sdf, [0, -0.6, 0.05], [0.55, 0.62, 0.55], 84, armColor), skin));
    const hand = new THREE.Group();
    hand.position.copy(HAND);
    shoulder.add(hand);
    body.add(shoulder);
    return { shoulder, hand };
  };
  // グッドの手：こぶし（指 4 本を曲げる）と、腕を上げたときに上を向く親指
  const a = new THREE.Vector3(0, -1, 0);
  const thumbDir = new THREE.Vector3(-Math.sin(-UP_Z), Math.cos(-UP_Z), 0).normalize(); // 腕の中から見た「上」
  const f = new THREE.Vector3().crossVectors(thumbDir, a).normalize();
  if (f.z < 0) f.negate();
  const fistSdf = (x, y, z) => {
    let d = 1e9;
    for (let i = 0; i < 4; i++) {
      const off = thumbDir.clone().multiplyScalar(0.06 - i * 0.055);
      const k0 = HAND.clone().add(off).addScaledVector(f, 0.09).addScaledVector(a, 0.02);
      const k1 = HAND.clone().add(off).addScaledVector(f, 0.12).addScaledVector(a, -0.08);
      d = smin(d, capsuleV(x, y, z, k0, k1, 0.052), 0.02);
    }
    const t0 = HAND.clone().addScaledVector(thumbDir, 0.1).addScaledVector(f, 0.05);
    const t1 = HAND.clone().addScaledVector(thumbDir, 0.27).addScaledVector(f, 0.06);
    return smin(d, capsuleV(x, y, z, t0, t1, 0.06), 0.03);
  };
  const goodArm = makeArm(-1, fistSdf);

  // スマホを持つ手：スマホは手の子にして、腕を下ろした形のときに正面を向くよう向きを決める
  const restQ = new THREE.Quaternion().setFromEuler(ARM_REST_PHONE);
  const phoneQ = restQ.clone().invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.05, 0.4, -0.12)));
  const worldUp = new THREE.Vector3(0, 1, 0).applyQuaternion(restQ.clone().invert());
  const phoneOffset = worldUp.clone().multiplyScalar(0.22);
  const phoneMatrix = new THREE.Matrix4().compose(HAND.clone().add(phoneOffset), phoneQ, new THREE.Vector3(1, 1, 1));
  const P = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(phoneMatrix);
  const gripSdf = (x, y, z) => {
    let d = 1e9;
    for (let i = 0; i < 3; i++) {
      const yy = -0.14 - i * 0.1;
      d = smin(d, capsuleV(x, y, z, P(0.27, yy, -0.06), P(0.2, yy - 0.02, 0.07), 0.05), 0.02);
    }
    d = smin(d, capsuleV(x, y, z, P(-0.2, -0.3, -0.04), P(-0.17, -0.16, 0.07), 0.055), 0.02); // 親指
    return smin(d, capsuleV(x, y, z, HAND, P(0.12, -0.3, -0.05), 0.1), 0.05);
  };
  const phoneArm = makeArm(1, gripSdf);
  const phone = new THREE.Group();
  add(phone, new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.86, 0.07, 5, 0.06), phys(0x24272d, { roughness: 0.3, clearcoat: 0.8 })));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.78), new THREE.MeshBasicMaterial({ map: phoneTexture() }));
  screen.position.z = 0.037;
  phone.add(screen);
  const glassP = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.78), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.02, clearcoat: 1 }));
  glassP.position.z = 0.0375;
  phone.add(glassP);
  const cam = new THREE.Mesh(new THREE.CircleGeometry(0.012, 16), basic(0x111111));
  cam.position.set(0, 0.405, 0.038);
  phone.add(cam);
  phone.applyMatrix4(phoneMatrix);
  phoneArm.shoulder.add(phone);

  // ───── 脚とブーツ（ひも・ひも穴・ちょう結び）─────
  const bootGeo = sdfGeometry(bootSdf, [0, -0.1, 0.12], [0.42, 0.34, 0.62], 80, bootColor);
  const bootMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.6 });
  const laceMat = phys(0xf2e6cc, { roughness: 0.8 });
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * LEG_X, -1.42, 0.05);
    const boot = add(hip, new THREE.Mesh(bootGeo, bootMat));
    boot.position.set(0, -0.48, 0.06);
    boot.rotation.y = s * 0.12;
    // ひも穴とひも：ブーツの前の面に沿って、交差させる
    const bootSurf = (x, y) => {
      const z = frontZ(bootSdf, x, y, 1.2) ?? 0.3;
      return new THREE.Vector3(x, y, z + 0.012);
    };
    const holes = [];
    for (let k = 0; k < 4; k++) {
      const y = 0.08 - k * 0.075;
      for (const sx of [-1, 1]) {
        const p = bootSurf(sx * 0.075, y);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 16), metal);
        ring.position.copy(p);
        boot.add(ring);
        holes.push(p);
      }
    }
    for (let k = 0; k < 3; k++) {
      for (const [i0, i1] of [[k * 2, k * 2 + 3], [k * 2 + 1, k * 2 + 2]]) {
        const p0 = holes[i0];
        const p1 = holes[i1];
        const mid = p0.clone().add(p1).multiplyScalar(0.5).add(new THREE.Vector3(0, 0, 0.012));
        boot.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, mid, p1), 12, 0.009, 6, false), laceMat));
      }
    }
    const top = bootSurf(0, 0.12);
    for (const sx of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 6, 20), laceMat);
      loop.position.copy(top).add(new THREE.Vector3(sx * 0.045, 0.02, 0.01));
      loop.rotation.set(0.3, 0, sx * 0.6);
      boot.add(loop);
    }
    root.add(hip);
    legs.push(hip);
  }

  // まばたき用の初期角度
  const LID_OPEN = -0.75;
  lids.forEach((l) => (l.rotation.x = LID_OPEN));

  return { root, body, head, mouths, lids, LID_OPEN, tailPivot, goodArm, phoneArm, legs, shadowed };
}

const easeOutBack = (p) => 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2;
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

export default function DinoReal({ talking = false, cheer = 0, skipBirth = false, pose = 'full', className = '' }) {
  const mountRef = useRef(null);
  const talkingRef = useRef(talking);
  talkingRef.current = talking;
  const cheerRef = useRef({ value: cheer, start: null });
  if (cheerRef.current.value !== cheer) cheerRef.current = { value: cheer, start: 'pending' };

  useEffect(() => {
    const mount = mountRef.current;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      mount.classList.add('dino-fallback');
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping; // 色がくすまないように
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c79a, 0.7));
    const key = new THREE.DirectionalLight(0xfff4e6, 2.0);
    key.position.set(2.6, 4.2, 4.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4.5;
    key.shadow.camera.right = 4.5;
    key.shadow.camera.top = 4.5;
    key.shadow.camera.bottom = -4.5;
    key.shadow.radius = 4;
    key.shadow.bias = -0.0008;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfdcff, 1.6);
    rim.position.set(-3.5, 2.5, -3);
    scene.add(rim);

    const d = buildDino();
    scene.add(d.root);
    // 床に落ちる影だけを描く板
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.18 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.27;
    ground.receiveShadow = true;
    scene.add(ground);
    d.shadowed.forEach((m) => (m.receiveShadow = true));

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const [fitW, fitH, cy] = pose === 'head' ? [2.8, 2.8, 1.45] : [4.8, 5.5, 0.2];
      const dist = Math.max(fitH / (2 * tan), fitW / (2 * tan * camera.aspect));
      camera.position.set(0, cy + 0.35, dist);
      camera.lookAt(0, cy, 0);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const clock = new THREE.Clock();
    const now = () => (window.__dinoClock ? window.__dinoClock() : clock.getElapsedTime());
    let nextBlink = 2.2;
    let frame;
    const tick = () => {
      const t = now();
      const BIRTH = 1.4;
      if (!skipBirth && !reduceMotion && t < BIRTH) {
        const p = Math.min(t / BIRTH, 1);
        d.root.scale.setScalar(Math.max(easeOutBack(p), 0.001));
        d.body.rotation.y = (1 - p) ** 2 * Math.PI * 2;
      } else {
        d.root.scale.setScalar(1);
        d.body.rotation.y = 0;
      }

      const c = cheerRef.current;
      if (c.start === 'pending') c.start = t;
      let up = 0;
      if (typeof c.start === 'number') {
        const p = t - c.start;
        if (p < 0.4) up = easeOutBack(p / 0.4);
        else if (p < 2.0) up = 1;
        else if (p < 2.5) up = 1 - easeInOut((p - 2.0) / 0.5);
        else c.start = null;
      }

      const m = reduceMotion ? 0 : 1;
      const bounce = Math.abs(Math.sin(t * 2.2));
      d.root.position.y = m * bounce * 0.045 + up * 0.06;
      d.root.rotation.y = -0.48 + m * Math.sin(t * 0.7) * 0.14;
      d.body.rotation.z = m * Math.sin(t * 1.1) * 0.025 - up * 0.04;
      d.head.rotation.z = m * Math.sin(t * 1.3) * 0.06 + up * 0.07;
      d.head.rotation.x = m * Math.sin(t * 0.9) * 0.035 - up * 0.05;
      d.tailPivot.rotation.y = m * Math.sin(t * 1.8) * 0.2;
      d.legs.forEach((leg, i) => (leg.rotation.x = m * Math.sin(t * 2.2 + i * Math.PI) * 0.08));
      d.phoneArm.shoulder.rotation.set(ARM_REST_PHONE.x + m * Math.sin(t * 1.6) * 0.04, 0, ARM_REST_PHONE.z + m * Math.sin(t * 1.6) * 0.05);
      const restZ = -0.28 + m * Math.sin(t * 2.2) * 0.05;
      d.goodArm.shoulder.rotation.set(UP_X * up, UP_Y * up, restZ + (UP_Z - restZ) * up);

      // まばたき：上まぶたを下ろす。グッドのときは目を細めて笑う
      let close = up * 0.35;
      if (t > nextBlink) {
        const p = (t - nextBlink) / 0.16;
        close = Math.max(close, p < 1 ? Math.sin(p * Math.PI) : 0);
        if (p >= 1) nextBlink = t + 2.4 + Math.random() * 2.6;
      }
      d.lids.forEach((l) => (l.rotation.x = d.LID_OPEN + (1.6 - d.LID_OPEN) * close));

      let shape = 'open';
      if (talkingRef.current && up === 0) shape = ['open', 'half', 'closed', 'half'][Math.floor(t * 8) % 4];
      Object.entries(d.mouths).forEach(([k, mm]) => (mm.visible = k === shape));

      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      pmrem.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
      renderer.domElement.remove();
    };
  }, [skipBirth, pose]);

  return <div ref={mountRef} className={`dino3d ${className}`} role="img" aria-label="Doki, a green dinosaur" />;
}
