import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

// 案内役のキャラクター「ドキちゃん（Doki）」。まん丸に近い立体のハートに、
// ピカチュウのような目・線の眉毛・しっかり横長のにっこり口・細い黒の手足をつけたもの。
// 表示されると光の中からぽんっと生まれる。talking が true の間は口をパクパク動かす。
const COLORS = {
  body: 0xff4f9a, // ときめくピンク（アプリの --pink と同じ）
  limb: 0x1a1a1a, // 手足は細い黒い線
  shoe: 0x1a1a1a,
  eye: 0x161616,
  mouth: 0x161616, // 口も目と同じ黒
  tongue: 0xff8fb8,
};

// 体は「ほぼ丸い立体のハート」。立体のハートを表す有名な式（Taubin のハート曲面）から作る。
// 継ぎ目のない、ぷっくりした形になる。K を小さくするほど前後に厚くなる（元の式は 9/4）。
// 元の式は「t³ = v³·Q」の形（t = x² + K·d² + v² − 1）。そのままだと3乗のせいで体を横切る折り目が出るので、
// 3乗根をとった「t = v·∛Q」の形で使う（同じハートの形で、表面がなめらかになる）。
// A：左右のふくらみを持ち上げる強さ（上半分にだけ、なめらかに効かせる）
// DENT：頭の真ん中をへこませる強さ（頭のくぼみを深くする）
const K = 1.2;
const A = 1; // 1 ＝ 元のハートの形（溝を深くしない）
const DENT = 0; // 0 ＝ 頭の真ん中をへこませない
const DENT_WIDTH = 0.2;
const TIP_ROUND = 0.005; // 下のとんがりを少しだけ丸める
const S = 1.2; // 全体の大きさ
const SHIFT = -0.19; // 上下の真ん中が 0 になるようにずらす
const smoothstep = (e0, e1, x) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};
// x：横、v：上下、d：前後。形の内側でマイナス、外側でプラスになる
const F = (x, v, d) => {
  const t = x * x + K * d * d + v * v - 1;
  const lift = 1 + (A - 1) * smoothstep(0, 0.5, v);
  const round = TIP_ROUND * smoothstep(0, 0.6, -v); // 下半分の真ん中の折れだけ、なめらかにする
  const q = lift * x * x + (9 / 80) * d * d + round;
  return t - v * Math.cbrt(q) + DENT * Math.exp(-(x * x) / DENT_WIDTH) * Math.max(v, 0) ** 2;
};
// アプリの座標（X 横・Y 上下・Z 手前）→ 式の座標
const toHeart = (X, Y, Z) => [X / S, (Y - SHIFT) / S, Z / S];

// 立体を細かいマス目に分けて、式の表面を取り出す（MarchingCubes）。
// 頭のくぼみのような深い谷があっても、形が崩れない。
const GRID = 96; // マス目の細かさ
const BOX = 1.75; // マス目で囲む範囲（式の座標で ±1.75）

// 式の傾き（表面の向き）。数値的に求める
function gradF(x, v, d) {
  const e = 1e-4;
  return [
    (F(x + e, v, d) - F(x - e, v, d)) / (2 * e),
    (F(x, v + e, d) - F(x, v - e, d)) / (2 * e),
    (F(x, v, d + e) - F(x, v, d - e)) / (2 * e),
  ];
}

function heartMesh(material) {
  // 1. マス目で、だいたいの形（三角形の集まり）を取り出す
  const scratch = new THREE.MeshBasicMaterial(); // 形を取り出すためだけに使う（表示はしない）
  const mc = new MarchingCubes(GRID, scratch, false, false, 200000);
  mc.isolation = 0;
  const half = GRID / 2;
  for (let z = 0; z < GRID; z++) {
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const f = F(((x - half) / half) * BOX, ((y - half) / half) * BOX, ((z - half) / half) * BOX);
        mc.field[x + y * GRID + z * GRID * GRID] = -f; // 内側がプラス
      }
    }
  }
  mc.update();

  // 2. 各点を式の表面にぴったり乗せ、表面の向きを式から正確に求める（線や波模様が出ないように）
  const count = mc.count;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let x = mc.positionArray[i * 3] * BOX;
    let v = mc.positionArray[i * 3 + 1] * BOX;
    let d = mc.positionArray[i * 3 + 2] * BOX;
    let g = gradF(x, v, d);
    for (let k = 0; k < 3; k++) {
      const f = F(x, v, d);
      const len2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
      if (len2 < 1e-12) break;
      x -= (f * g[0]) / len2;
      v -= (f * g[1]) / len2;
      d -= (f * g[2]) / len2;
      g = gradF(x, v, d);
    }
    const len = Math.hypot(g[0], g[1], g[2]) || 1;
    positions.set([x * S, v * S + SHIFT, d * S], i * 3);
    normals.set([g[0] / len, g[1] / len, g[2] / len], i * 3);
  }
  mc.geometry.dispose();
  scratch.dispose();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.computeBoundingSphere();
  return new THREE.Mesh(geo, material);
}

// 体の表面の位置（前から見た X, Y の場所で、表面がどれだけ手前にあるか）と、その向き
function surfaceAt(X, Y) {
  const [x, v] = toHeart(X, Y, 0);
  let lo = 0;
  let hi = 1.5;
  if (F(x, v, 0) >= 0) return { z: 0, n: new THREE.Vector3(0, 0, 1) }; // 体の外
  for (let k = 0; k < 30; k++) {
    const m = (lo + hi) / 2;
    if (F(x, v, m) < 0) lo = m;
    else hi = m;
  }
  const e = 1e-4;
  const n = new THREE.Vector3(
    F(x + e, v, lo) - F(x - e, v, lo),
    F(x, v + e, lo) - F(x, v - e, lo),
    F(x, v, lo + e) - F(x, v, lo - e),
  ).normalize();
  return { z: lo * S, n };
}

// 顔のパーツを、丸い体の表面に貼りつける（表面の向きに合わせて傾ける）
function stick(obj, x, y, lift = 0) {
  const { z, n } = surfaceAt(x, y);
  obj.position.set(x + n.x * lift, y + n.y * lift, z + n.z * lift);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  return obj;
}

function buildCharacter() {
  const glossy = (color, extra = {}) =>
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.32,
      clearcoat: 0.8,
      clearcoatRoughness: 0.25,
      sheen: 0.25,
      sheenColor: new THREE.Color(0xffd6e8),
      emissive: color,
      emissiveIntensity: 0.18, // 影の部分もくすまず、ビビッドに見せる
      ...extra,
    });
  const flat = (color) => new THREE.MeshBasicMaterial({ color });

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(heartMesh(glossy(COLORS.body)));

  // 目：ピカチュウのような、まん丸の黒目＋左上に白い光
  // 眉毛：目の上に、細い線の山なりの眉毛
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 40, 40), glossy(COLORS.eye, { emissiveIntensity: 0 }));
    ball.scale.set(1, 1.05, 0.45);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.048, 24, 24), flat(0xffffff));
    shine.position.set(-0.035, 0.04, 0.05);
    shine.scale.set(1, 1, 0.4);
    eye.add(ball, shine);
    body.add(stick(eye, side * 0.38, 0.04));
    eyes.push(eye);

    const BROW = Math.PI * 0.55;
    const browArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.013, 12, 32, BROW),
      new THREE.MeshBasicMaterial({ color: COLORS.eye }),
    );
    browArc.rotation.z = Math.PI / 2 - BROW / 2; // 弧の真ん中を上に向ける＝山なり
    browArc.scale.set(1.15, 0.7, 0.4);
    const brow = new THREE.Group();
    brow.add(browArc);
    body.add(stick(brow, side * 0.39, 0.21, 0.012));

  }

  // 口：ふだんは閉じた横長のにっこり。目の外側より広く、両はしが少し上がる。
  // 横に広いので、平らな線だと丸い体から両はしが浮く。体の表面に沿って曲がる線で作る。
  const MOUTH_Y = -0.26; // 口の真ん中の高さ
  const MOUTH_HALF = 0.56; // 口の半分の幅（目の外側 ±0.5 より少し広く）
  const curvePoints = [];
  for (let i = 0; i <= 24; i++) {
    const x = -MOUTH_HALF + (2 * MOUTH_HALF * i) / 24;
    const y = MOUTH_Y + 0.11 * (x / MOUTH_HALF) ** 2; // 両はしが上がる＝にっこり
    const { z, n } = surfaceAt(x, y);
    curvePoints.push(new THREE.Vector3(x + n.x * 0.012, y + n.y * 0.012, z + n.z * 0.012));
  }
  const smile = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curvePoints), 64, 0.024, 12, false),
    new THREE.MeshBasicMaterial({ color: COLORS.mouth }),
  );
  // 両はしを丸くする
  for (const end of [curvePoints[0], curvePoints[curvePoints.length - 1]]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 12), smile.material);
    cap.position.copy(end);
    smile.add(cap);
  }
  // 話すときの、横長に開いた口（にっこりの口と同じくらいの幅）。これも体の表面に沿わせる
  const onSurface = (shape, lift, segments) => {
    const geo = new THREE.ShapeGeometry(shape, segments);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, surfaceAt(x, y).z + lift);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const OPEN_TOP = MOUTH_Y + 0.08;
  const lowerLip = new THREE.Shape();
  lowerLip.absellipse(0, OPEN_TOP, MOUTH_HALF * 0.85, 0.16, Math.PI, 2 * Math.PI, false); // 下向きの半円（横長）
  const tongueShape = new THREE.Shape();
  tongueShape.absellipse(0, OPEN_TOP - 0.1, MOUTH_HALF * 0.35, 0.045, 0, 2 * Math.PI, false);
  const open = new THREE.Group();
  open.add(
    new THREE.Mesh(onSurface(lowerLip, 0.014, 48), flat(COLORS.mouth)),
    new THREE.Mesh(onSurface(tongueShape, 0.018, 32), flat(COLORS.tongue)),
  );
  open.visible = false;
  const mouth = new THREE.Group();
  mouth.add(smile, open);
  body.add(mouth);

  // 腕：細い黒い線。肩を支点に回す
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 1.12, -0.12, 0); // 体の内側から生やして、腕が浮かないように
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.44, 8, 12), glossy(COLORS.limb));
    arm.position.set(side * 0.24, -0.08, 0);
    arm.rotation.z = side * 1.25;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 20), glossy(COLORS.limb));
    hand.position.set(side * 0.47, -0.16, 0);
    shoulder.add(arm, hand);
    body.add(shoulder);
    arms.push(shoulder);
  }

  // 脚と靴（細い黒い線と、黒い小さな靴）
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.34, 8, 12), glossy(COLORS.limb));
    leg.position.set(side * 0.34, -1.22, 0);
    leg.rotation.z = side * 0.28; // 少し外に開く
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 24), glossy(COLORS.shoe, { sheenColor: new THREE.Color(0x666666) }));
    shoe.scale.set(1.3, 0.6, 1.4);
    shoe.position.set(side * 0.42, -1.45, 0.06);
    shoe.rotation.y = side * 0.25;
    root.add(leg, shoe);
  }

  return { root, body, eyes, smile, open, arms };
}

// skipBirth：誕生の演出を飛ばして、最初から元気な姿で出す（画面の隅にいる小さなドキちゃん用）
export default function Heart3D({ talking = false, skipBirth = false, className = '' }) {
  const mountRef = useRef(null);
  const talkingRef = useRef(talking);
  talkingRef.current = talking;

  useEffect(() => {
    const mount = mountRef.current;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0.1, 6.8);
    camera.lookAt(0, -0.1, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      mount.classList.add('heart-fallback');
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xff8fbf, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(2, 3, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfdcff, 1.4); // 青い縁取り光
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    const ch = buildCharacter();
    scene.add(ch.root);

    // 生まれるときの光（すぐに消える）
    const noBirth = reduceMotion || skipBirth;
    const birthLight = new THREE.PointLight(0xfff2f8, noBirth ? 0 : 30, 8);
    birthLight.position.set(0, 0, 2);
    scene.add(birthLight);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // 縦長のスマホでも横長のパソコンでも、手足まで全身が収まる距離にカメラを置く
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const FIT_W = 4.0; // 手を広げた幅＋余白
      const FIT_H = 3.4; // 頭から靴まで＋余白
      camera.position.z = Math.max(FIT_H / (2 * tan), FIT_W / (2 * tan * camera.aspect));
      camera.lookAt(0, -0.1, 0);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const clock = new THREE.Clock();
    let nextBlink = 2;
    let frame;
    const tick = () => {
      const t = clock.getElapsedTime();
      // 誕生：最初の0.6秒は光だけ → 2.4秒かけて、回りながらゆっくり大きくなる（少しだけふくらんで戻る）
      const LIGHT_ONLY = 0.6;
      const GROW = 2.4;
      if (!noBirth && t < LIGHT_ONLY + GROW + 1.2) {
        const p = Math.min(Math.max((t - LIGHT_ONLY) / GROW, 0), 1);
        const c = 0.9;
        const grow = p === 1 ? 1 : 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
        ch.root.scale.setScalar(Math.max(grow, 0.001));
        ch.body.rotation.y = (1 - p) * (1 - p) * Math.PI * 2; // くるっと回りながら
        birthLight.intensity = 30 * Math.max(0, 1 - t / (LIGHT_ONLY + GROW + 1.2));
      } else {
        ch.root.scale.setScalar(1);
        ch.body.rotation.y = 0;
        birthLight.intensity = 0;
      }
      if (!reduceMotion) {
        // ぽよんぽよん弾む（着地でつぶれる）
        const bounce = Math.abs(Math.sin(t * 2.4));
        ch.root.position.y = bounce * 0.1;
        const squash = 1 - (1 - bounce) * 0.04;
        ch.body.scale.set(2 - squash, squash, 1);
        ch.root.rotation.y = Math.sin(t * 0.8) * 0.22;
        ch.body.rotation.z = Math.sin(t * 1.2) * 0.05;
        // 右手を振る、左手はゆらゆら
        ch.arms[1].rotation.z = 0.7 + Math.sin(t * 6) * 0.4;
        ch.arms[0].rotation.z = -0.1 + Math.sin(t * 2.4) * 0.12;
      }
      // まばたき
      if (t > nextBlink) {
        const p = (t - nextBlink) / 0.14;
        const s = p < 1 ? 1 - Math.sin(p * Math.PI) * 0.9 : 1;
        ch.eyes.forEach((e) => (e.scale.y = s));
        if (p >= 1) nextBlink = t + 2 + Math.random() * 3;
      }
      // 話しているときは、にっこり口と開いた口を交互に出す
      const speaking = talkingRef.current && Math.sin(t * 16) > 0;
      ch.open.visible = speaking;
      ch.smile.visible = !speaking;

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
        o.material?.dispose();
      });
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className={`heart3d ${className}`} role="img" aria-label="Doki, a pink heart character" />;
}
