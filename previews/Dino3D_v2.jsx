import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// 旅のおともキャラクター「ドキちゃん」（緑の恐竜）を three.js で組み立てた 3D 版。
// 部品ごとに動かせる：あご（しゃべる口）・まぶた・腕（グッド）・脚・しっぽ・頭。
//   talking   … しゃべる（あごがぱくぱく）
//   cheer     … 数字が変わるたびに、グッド（腕を上げてサムズアップ → しばらくして下ろす）
//   skipBirth … 登場の演出（くるっと回りながら大きくなる）を飛ばす
//   pose      … "full"（全身）| "head"（顔だけ。隠れているときの小さなボタン用）
const COLOR = {
  skin: 0x5cbf4c,
  skinDark: 0x2f7d34,
  cream: 0xf6d066,
  red: 0xe23b30,
  mouth: 0x5a1f1a,
  tongue: 0xf07a74,
  white: 0xffffff,
  iris: 0x7a3f17,
  pupil: 0x1d0d05,
  boot: 0xa8632a,
  sole: 0x5e3414,
  pack: 0xc8742b,
  strap: 0x9a5a22,
  metal: 0xd9d4c4,
  gold: 0xd9a441,
  phone: 0x2b2f36,
};

const gloss = (color, extra = {}) =>
  new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.35,
    clearcoat: 0.9, // つや（ちゅるん）
    clearcoatRoughness: 0.22,
    sheen: 0.2,
    emissive: color,
    emissiveIntensity: 0.12,
    ...extra,
  });
const flat = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

const sphere = (mat, r = 1, seg = 40) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat);
const capsule = (mat, r, len) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 10, 18), mat);

// 向き（from を to に回す）
const aim = (obj, to, from = new THREE.Vector3(0, 1, 0)) => obj.quaternion.setFromUnitVectors(from, to.clone().normalize());

// しっぽ：曲線に沿って、根元が太く先が細い管
function tail(mat) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.35, -1.05, -0.55),
    new THREE.Vector3(-0.95, -1.42, -0.85),
    new THREE.Vector3(-1.55, -1.4, -0.95),
    new THREE.Vector3(-1.9, -1.08, -0.9),
  ]);
  const TUB = 48;
  const RAD = 20;
  const geo = new THREE.TubeGeometry(curve, TUB, 1, RAD, false);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i <= TUB; i++) {
    const t = i / TUB;
    const c = curve.getPointAt(t);
    const r = 0.36 * (1 - t) + 0.05;
    for (let j = 0; j <= RAD; j++) {
      const k = i * (RAD + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  const tip = sphere(mat, 0.05, 16);
  tip.position.copy(curve.getPointAt(1));
  mesh.add(tip);
  return mesh;
}

// スマホの画面（地図と「すぐ予約」のボタン）を絵として描く
function phoneScreen() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 448;
  const g = c.getContext('2d');
  g.fillStyle = '#eaf5ff';
  g.fillRect(0, 0, 256, 448);
  g.fillStyle = '#e23b30';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#fff';
  g.font = 'bold 30px sans-serif';
  g.textAlign = 'center';
  g.fillText('Haisai', 128, 44);
  g.strokeStyle = '#9cc8f2';
  g.lineWidth = 14;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-10, 300);
  g.lineTo(110, 180);
  g.lineTo(270, 250);
  g.moveTo(70, 70);
  g.lineTo(120, 420);
  g.stroke();
  const pin = (x, y, color) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, 22, Math.PI, 0);
    g.lineTo(x, y + 40);
    g.closePath();
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(x, y, 8, 0, Math.PI * 2);
    g.fill();
  };
  pin(170, 150, '#e23b30');
  pin(80, 250, '#4cb553');
  g.fillStyle = '#e23b30';
  g.beginPath();
  g.roundRect(28, 360, 200, 56, 28);
  g.fill();
  g.fillStyle = '#fff';
  g.font = 'bold 30px sans-serif';
  g.fillText('すぐ予約', 128, 398);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildDino() {
  const skin = gloss(COLOR.skin);
  const cream = gloss(COLOR.cream);
  const red = gloss(COLOR.red);

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // ───── 体 ─────
  const torso = sphere(skin);
  torso.scale.set(1.0, 1.0, 0.9);
  torso.position.set(0, -0.68, 0);
  const shoulders = sphere(skin);
  shoulders.scale.set(0.78, 0.6, 0.72);
  shoulders.position.set(0, -0.05, 0);
  const belly = sphere(cream);
  belly.scale.set(0.72, 0.82, 0.52);
  belly.position.set(0, -0.72, 0.44);
  body.add(shoulders);
  body.add(torso, belly);

  // しっぽ（根元を支点に振る）
  const tailPivot = new THREE.Group();
  tailPivot.position.set(-0.3, -1.0, -0.5);
  const tailMesh = tail(skin);
  tailMesh.position.set(0.3, 1.0, 0.5);
  tailPivot.add(tailMesh);
  body.add(tailPivot);

  // 背中のトゲ（体の分）
  const spikeOn = (parent, center, p, size = 1) => {
    const s = sphere(red, 1, 24);
    s.scale.set(0.15 * size, 0.27 * size, 0.15 * size);
    const n = p.clone().sub(center).normalize();
    s.position.copy(p).addScaledVector(n, 0.12 * size);
    aim(s, n);
    parent.add(s);
  };
  spikeOn(body, new THREE.Vector3(0, -0.55, 0), new THREE.Vector3(0, 0.0, -0.75), 1.0);

  // リュック・ベルト・コンパス・バッジ
  const pack = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.15, 0.55, 4, 0.22), gloss(COLOR.pack, { clearcoat: 0.4 }));
  pack.position.set(0, -0.45, -0.82);
  body.add(pack);
  const strapMat = gloss(COLOR.strap, { clearcoat: 0.3 });
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(new RoundedBoxGeometry(0.17, 1.05, 0.07, 3, 0.03), strapMat);
    strap.position.set(side * 0.56, -0.42, 0.7);
    strap.rotation.set(-0.42, side * 0.35, side * 0.1);
    body.add(strap);
  }
  const compass = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 32), gloss(COLOR.metal, { metalness: 0.6 }));
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.13, 32), flat(0xfaf6e8));
  face.position.y = 0.031;
  face.rotation.x = -Math.PI / 2;
  const needle = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 12), flat(COLOR.red));
  needle.position.set(0, 0.04, 0);
  needle.rotation.x = -Math.PI / 2;
  compass.add(rim, face, needle);
  compass.rotation.x = Math.PI / 2 - 0.35;
  compass.position.set(-0.56, -0.62, 0.86);
  body.add(compass);
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 32), gloss(COLOR.gold, { metalness: 0.5 }));
  badge.rotation.x = Math.PI / 2 - 0.35;
  badge.position.set(0.5, -0.12, 0.8);
  body.add(badge);

  // スカーフ（首の輪＋前の三角＋結び目）
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.09, 16, 48), red);
  ring.rotation.x = Math.PI / 2 - 0.15;
  ring.position.set(0, 0.2, 0.08);
  ring.scale.set(1.25, 1.1, 1);
  const scarf = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.5, 3), red);
  scarf.rotation.set(-0.25, 0, Math.PI);
  scarf.scale.set(1.1, 1, 0.35);
  scarf.position.set(0, -0.06, 0.66);
  const knot = sphere(red, 0.11, 20);
  knot.position.set(0.05, 0.16, 0.72);
  body.add(ring, scarf, knot);

  // ───── 頭（首の付け根を支点に動く）─────
  const head = new THREE.Group();
  head.position.set(0, 0.3, 0.06);
  head.scale.setScalar(1.18);
  body.add(head);
  const cranium = sphere(skin);
  cranium.scale.set(0.98, 0.9, 0.88);
  cranium.position.set(0, 0.62, 0);
  head.add(cranium);
  // 黄色い口元（顔の下半分）
  const muzzle = sphere(cream);
  muzzle.scale.set(0.8, 0.44, 0.6);
  muzzle.position.set(0, 0.3, 0.36);
  head.add(muzzle);
  // 緑の鼻先（口元の上にかぶさる）
  const snout = sphere(skin);
  snout.scale.set(0.56, 0.27, 0.46);
  snout.position.set(0, 0.5, 0.6);
  head.add(snout);
  for (const side of [-1, 1]) {
    const nostril = sphere(flat(COLOR.skinDark), 0.035, 12);
    nostril.scale.set(1.3, 0.8, 0.6);
    nostril.position.set(side * 0.13, 0.6, 1.03);
    head.add(nostril);
    // 上の歯（2本）
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 12), gloss(COLOR.white, { emissiveIntensity: 0.3 }));
    tooth.rotation.x = Math.PI;
    tooth.position.set(side * 0.16, 0.2, 0.93);
    head.add(tooth);
  }
  // 口の中（あごが開くと見える）
  const mouthIn = sphere(flat(COLOR.mouth));
  mouthIn.scale.set(0.5, 0.2, 0.4);
  mouthIn.position.set(0, 0.22, 0.56);
  head.add(mouthIn);
  // 下あご（ここを回して口を開け閉めする）
  const jaw = new THREE.Group();
  jaw.position.set(0, 0.2, 0.25);
  const jawMesh = sphere(cream);
  jawMesh.scale.set(0.62, 0.3, 0.56);
  jawMesh.position.set(0, -0.08, 0.2);
  const tongue = sphere(gloss(COLOR.tongue, { clearcoat: 0.5 }));
  tongue.scale.set(0.3, 0.07, 0.3);
  tongue.position.set(0, 0.05, 0.42);
  jaw.add(jawMesh, tongue);
  head.add(jaw);

  // 目（白目・茶色の黒目・光）。まばたきは目を縦につぶす
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.33, 0.88, 0.74);
    eye.rotation.y = side * 0.3;
    const white = sphere(gloss(COLOR.white, { emissiveIntensity: 0.35, clearcoat: 1 }), 0.24);
    white.scale.set(0.92, 1.1, 0.55);
    const iris = sphere(gloss(COLOR.iris, { emissiveIntensity: 0.2 }), 0.17);
    iris.scale.set(1, 1.08, 0.45);
    iris.position.set(-side * 0.02, -0.02, 0.07);
    const pupil = sphere(flat(COLOR.pupil), 0.095);
    pupil.scale.set(1, 1.1, 0.4);
    pupil.position.set(-side * 0.02, -0.02, 0.12);
    const shine = sphere(flat(COLOR.white), 0.055, 16);
    shine.scale.set(1, 1, 0.4);
    shine.position.set(-side * 0.02 - 0.06, 0.06, 0.15);
    eye.add(white, iris, pupil, shine);
    head.add(eye);
    eyes.push(eye);
    // まゆ
    const brow = capsule(flat(COLOR.skinDark), 0.03, 0.16);
    brow.rotation.z = Math.PI / 2 + side * 0.25;
    brow.position.set(side * 0.33, 1.19, 0.72);
    head.add(brow);
    // ほっぺの赤み
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.13, 32), flat(0xff8a7a, { transparent: true, opacity: 0.55, depthWrite: false }));
    blush.position.set(side * 0.6, 0.5, 0.72);
    blush.rotation.y = side * 0.65;
    head.add(blush);
  }
  // 頭のトゲ（頭のてっぺんから後ろへ）
  const headCenter = new THREE.Vector3(0, 0.62, 0);
  spikeOn(head, headCenter, new THREE.Vector3(0, 1.45, 0.18), 1.45);
  spikeOn(head, headCenter, new THREE.Vector3(0, 1.38, -0.32), 1.25);
  spikeOn(head, headCenter, new THREE.Vector3(0, 1.08, -0.68), 1.15);
  spikeOn(head, headCenter, new THREE.Vector3(0, 0.62, -0.86), 1.0);

  // ───── 腕（肩を支点に回す）─────
  const arm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.8, -0.08, 0.1);
    const upper = capsule(skin, 0.15, 0.48);
    upper.position.y = -0.34;
    const hand = new THREE.Group();
    hand.position.y = -0.7;
    const fist = sphere(skin, 0.18);
    fist.scale.set(1, 0.95, 0.9);
    hand.add(fist);
    shoulder.add(upper, hand);
    body.add(shoulder);
    return { shoulder, hand };
  };
  // グッドする腕（向かって左）。親指は「腕を上げたときに上を向く」向きに付ける
  const goodArm = arm(-1);
  const thumb = capsule(skin, 0.065, 0.13);
  const UP_Z = -2.2; // 上げたときの肩の角度
  const thumbDir = new THREE.Vector3(Math.sin(-UP_Z) * -1, Math.cos(-UP_Z), 0).normalize(); // 腕の中から見た「上」
  aim(thumb, thumbDir);
  thumb.position.copy(thumbDir.clone().multiplyScalar(0.2));
  goodArm.hand.add(thumb);
  // スマホを持つ腕（向かって右）
  const phoneArm = arm(1);

  // スマホ（手の位置に毎フレーム合わせる）
  const phone = new THREE.Group();
  const caseMesh = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.8, 0.07, 4, 0.06), gloss(COLOR.phone, { emissiveIntensity: 0.05 }));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.7), new THREE.MeshBasicMaterial({ map: phoneScreen() }));
  screen.position.z = 0.036;
  phone.add(caseMesh, screen);
  root.add(phone);

  // ───── 脚とブーツ ─────
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.42, -1.38, 0.05);
    const leg = capsule(skin, 0.24, 0.22);
    leg.position.y = -0.22;
    const boot = new THREE.Group();
    boot.position.set(0, -0.52, 0.08);
    const upper = sphere(gloss(COLOR.boot, { clearcoat: 0.6 }));
    upper.scale.set(0.32, 0.25, 0.44);
    const sole = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32), gloss(COLOR.sole, { clearcoat: 0.2 }));
    sole.scale.set(0.31, 0.06, 0.43);
    sole.position.y = -0.17;
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 12, 32), gloss(COLOR.boot, { clearcoat: 0.6 }));
    cuff.rotation.x = Math.PI / 2;
    cuff.position.set(0, 0.17, -0.08);
    boot.add(upper, sole, cuff);
    hip.add(leg, boot);
    root.add(hip);
    legs.push(hip);
  }

  return { root, body, head, jaw, eyes, tailPivot, goodArm, phoneArm, phone, legs, UP_Z };
}

const easeOutBack = (p) => 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2;
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

export default function Dino3D({ talking = false, cheer = 0, skipBirth = false, pose = 'full', className = '' }) {
  const mountRef = useRef(null);
  const talkingRef = useRef(talking);
  talkingRef.current = talking;
  const cheerRef = useRef({ value: cheer, start: null });
  if (cheerRef.current.value !== cheer) cheerRef.current = { value: cheer, start: 'pending' };

  useEffect(() => {
    const mount = mountRef.current;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      mount.classList.add('dino-fallback');
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xfff1c4, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2.5, 3.5, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfdcff, 1.5); // 青い縁取り光
    rim.position.set(-3, 2, -2.5);
    scene.add(rim);

    const d = buildDino();
    scene.add(d.root);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const [fitW, fitH, cy] = pose === 'head' ? [2.5, 2.5, 1.25] : [4.4, 5.1, 0.1];
      const dist = Math.max(fitH / (2 * tan), fitW / (2 * tan * camera.aspect));
      camera.position.set(0, cy + 0.15, dist);
      camera.lookAt(0, cy, 0);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const clock = new THREE.Clock();
    const now = () => (window.__dinoClock ? window.__dinoClock() : clock.getElapsedTime());
    let nextBlink = 2;
    let frame;
    const handPos = new THREE.Vector3();
    const tick = () => {
      const t = now();

      // 登場：くるっと回りながら大きくなる
      const BIRTH = 1.4;
      if (!skipBirth && !reduceMotion && t < BIRTH) {
        const p = Math.min(t / BIRTH, 1);
        d.root.scale.setScalar(Math.max(easeOutBack(p), 0.001));
        d.body.rotation.y = (1 - p) ** 2 * Math.PI * 2;
      } else {
        d.root.scale.setScalar(1);
        d.body.rotation.y = 0;
      }

      // グッド：腕を上げる（0.35秒）→ そのまま（1.6秒）→ 下ろす（0.5秒）
      const c = cheerRef.current;
      if (c.start === 'pending') c.start = t;
      let up = 0;
      if (typeof c.start === 'number') {
        const p = t - c.start;
        if (p < 0.35) up = easeOutBack(p / 0.35);
        else if (p < 1.95) up = 1;
        else if (p < 2.45) up = 1 - easeInOut((p - 1.95) / 0.5);
        else c.start = null;
      }

      if (!reduceMotion) {
        const bounce = Math.abs(Math.sin(t * 2.2));
        d.root.position.y = bounce * 0.06 + up * 0.08;
        d.root.rotation.y = Math.sin(t * 0.7) * 0.28; // ゆっくり左右を向く（立体がわかる）
        d.body.rotation.z = Math.sin(t * 1.1) * 0.03 - up * 0.05;
        d.head.rotation.z = Math.sin(t * 1.3) * 0.07 + up * 0.08;
        d.head.rotation.x = Math.sin(t * 0.9) * 0.04 - up * 0.06;
        d.tailPivot.rotation.y = Math.sin(t * 1.8) * 0.22;
        d.legs.forEach((leg, i) => (leg.rotation.x = Math.sin(t * 2.2 + i * Math.PI) * 0.1));
        d.phoneArm.shoulder.rotation.set(-0.55 + Math.sin(t * 1.6) * 0.05, 0, 1.55 + Math.sin(t * 1.6) * 0.06);
      } else {
        d.phoneArm.shoulder.rotation.set(-0.55, 0, 1.55);
      }
      // グッドの腕：ふだんは下ろしてゆらゆら、グッドのときは上げる
      const restZ = -0.3 + (reduceMotion ? 0 : Math.sin(t * 2.2) * 0.06);
      d.goodArm.shoulder.rotation.set(-0.35 * up, 0, restZ + (d.UP_Z - restZ) * up);

      // スマホは手の位置に。画面はこちらに向ける
      d.phoneArm.hand.getWorldPosition(handPos);
      d.root.worldToLocal(handPos);
      d.phone.position.copy(handPos).add(new THREE.Vector3(-0.05, 0.3, 0.12));
      d.phone.rotation.set(-0.1, -d.root.rotation.y * 0.6, -0.18);

      // まばたき（グッドのときはウインクぎみに目を細める）
      let blink = 1;
      if (t > nextBlink) {
        const p = (t - nextBlink) / 0.14;
        blink = p < 1 ? 1 - Math.sin(p * Math.PI) * 0.92 : 1;
        if (p >= 1) nextBlink = t + 2.2 + Math.random() * 2.8;
      }
      d.eyes.forEach((e) => (e.scale.y = blink * (1 - up * 0.35)));

      // 口：ふだんは少し開いたにっこり。しゃべるとぱくぱく。グッドのときは大きく笑う
      const talk = talkingRef.current ? (0.5 + 0.5 * Math.sin(t * 15)) * 0.32 : 0;
      d.jaw.rotation.x = 0.14 + talk + up * 0.18 + (reduceMotion ? 0 : Math.sin(t * 2) * 0.02);

      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
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
