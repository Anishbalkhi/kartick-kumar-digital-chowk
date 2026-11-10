/* =====================================================================
   Hero sitar — real-time 3D (three.js)
   A procedurally built concert sitar modelled on Pandit Kartick Kumar's own
   instrument: deep red-brown mahogany lacquer, a wide engraved gold band round
   the soundboard (tabli) with same-tone floral relief carving, a gold plate at
   the neck joint (gulu), gold filigree down both fingerboard edges and round
   the peg box, twin bone bridges, an ornate gold tailpiece, arched frets
   (parda) and fluted melon-head pegs (khunti) all along one side of the neck,
   with two more through the face of the peg box. No upper gourd, as on his sitar.
   Lit to match the hero photograph: warm lantern key from the right,
   cool dusk-sky rim from behind-left, warm ground bounce.
   If WebGL is missing or software-only, the static <img> stays.
   Testing: ?force3d skips the GPU check; &pose=<yaw radians> holds a pose
   (and exposes window.__sitarDims, measured sizes in cm); &upright removes the lean.
   ===================================================================== */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

async function init() {
  const wrap = document.querySelector('.hero-sitar-wrap');
  const hero = document.querySelector('.hero');
  if (!wrap || !hero) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const force = /[?&]force3d\b/.test(location.search);
  const poseMatch = location.search.match(/[?&]pose=(-?[\d.]+)/);
  const pose = poseMatch ? parseFloat(poseMatch[1]) : null;
  const upright = /[?&]upright\b/.test(location.search);

  // Software-rendered WebGL (no GPU) would crawl at a frame or two per second,
  // so those browsers keep the static image. Probe quietly first so three.js
  // doesn't log errors on GPU-less machines.
  if (!force) {
    const probe = document.createElement('canvas');
    const ok = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
      probe.getContext('webgl', { failIfMajorPerformanceCaveat: true });
    if (!ok) return;
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true, powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: !force, preserveDrawingBuffer: pose !== null
    });
  } catch (e) { return; }
  if (!renderer.getContext()) return;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);   // fitted to the window in resize()

  /* ---------- deterministic randomness (same grain every load) ---------- */
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ---------- environment: a tiny "chowk" for reflections ---------- */
  {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x07060a);
    const panel = (hex, k, w, h, p) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(0xffb060, 7, 1.2, 2.0, [4, 0.8, 2.5]);   // lantern, right
    panel(0xff9a48, 3, 1.0, 1.6, [3.2, -1.4, -3]); // lantern, behind right
    panel(0x4a4a70, 0.45, 10, 6, [-3, 6, -2]);      // dusk sky
    panel(0x2a170b, 0.9, 12, 12, [0, -5, 0]);      // warm stone ground
    panel(0xffd9a0, 0.9, 3, 3, [-2, 1, 5]);        // soft front fill
    scene.environment = pmrem.fromScene(env, 0.035).texture;
    pmrem.dispose();
  }

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0xcfc4d8, 0x4a3018, 0.75));
  const key = new THREE.DirectionalLight(0xffe2c0, 2.4); key.position.set(5, 2, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff0e0, 0.75); fill.position.set(-3, -2, 5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xb4b6e0, 0.7); rim.position.set(-4, 4, -5); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffb878, 1.0); rim2.position.set(4, -1, -4); scene.add(rim2);

  /* ---------- profile of the main gourd (radius r, height y), in cm ---------- */
  const prof = new THREE.SplineCurve([
    [0, 0], [5, 0.5], [11.6, 3.7], [16.1, 8.5], [18.0, 14.6], [18.2, 20.7], [16.9, 26.8],
    [13.6, 32.9], [8.2, 36.6], [5.4, 39]
  ].map(p => new THREE.Vector2(p[0], p[1]))).getPoints(60);

  /* ---------- dimensions (cm), measured from the photograph of his sitar ----------
     scale (bridge to nut) 90 cm sets the photo at 11.31 px/cm: soundboard 34 x 32 cm with the
     main bridge 15.7 cm up, gourd ~26 cm deep, neck 10 x 7 cm, peg box 21 cm, overall ~128 cm,
     19 frets, 7 playing + 13 tarab strings, no upper gourd */
  const D = {
    GX: 0.932, GY: 0.83, GZ: 1.45,    // gourd profile -> 34 x 32 x 26 cm
    BRIDGE: 15.7, SCALE: 90,          // nut at 105.7
    NECK0: 30.0, NECK1: 127.1,        // neck from gourd joint to top of peg box
    NW: 10.0, ND: 7.0                 // neck width / depth incl. fingerboard
  };
  D.NUT = D.BRIDGE + D.SCALE;

  /* ---------- painted + carved textures ----------
     Each surface is drawn twice: once in colour over wood grain, once in
     grey as a bump map (raised carving, cut grooves, slightly proud bone). */
  const PAL = {
    color: { carve: '#55200f', carveDeep: '#4c1b0c', carveHi: 'rgba(235,150,100,.55)', bone: '#efe6d1', boneDot: '#5a4330',
             groove: 'rgba(40,10,2,.85)', gold: '#d9b25c', goldLine: 'rgba(95,58,12,.9)' },
    bump:  { carve: '#c4c4c4', carveDeep: '#bcbcbc', carveHi: '#e0e0e0', bone: '#c6c6c6', boneDot: '#9a9a9a',
             groove: '#404040', gold: '#a8a8a8', goldLine: '#6a6a6a' },
    metal: { carve: '#000', carveDeep: '#000', carveHi: 'rgba(0,0,0,0)', bone: '#000', boneDot: '#000',
             groove: '#000', gold: '#fff', goldLine: '#b4b4b4' }
  };
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  };

  function woodGrain(ctx, w, h, base, vertical) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const L = vertical ? h : w, span = vertical ? w : h;
    for (let i = 0; i < 340; i++) {
      const dark = rnd() < 0.6;
      ctx.strokeStyle = dark ? `rgba(40,16,4,${0.05 + rnd() * 0.15})` : `rgba(205,140,72,${0.04 + rnd() * 0.1})`;
      ctx.lineWidth = 0.6 + rnd() * 3;
      const off = rnd() * span, amp = 2 + rnd() * 9, fr = 0.003 + rnd() * 0.01, ph = rnd() * 6.28;
      ctx.beginPath();
      for (let t = 0; t <= L; t += 8) {
        const d = off + Math.sin(t * fr + ph) * amp;
        if (vertical) { t ? ctx.lineTo(d, t) : ctx.moveTo(d, t); } else { t ? ctx.lineTo(t, d) : ctx.moveTo(t, d); }
      }
      ctx.stroke();
    }
  }

  function carved(w, h, base, vertical, draw) {
    const c = mkCanvas(w, h), x = c.getContext('2d');
    woodGrain(x, w, h, base, vertical); draw(x, PAL.color);
    const b = mkCanvas(w, h), bx = b.getContext('2d');
    bx.fillStyle = '#808080'; bx.fillRect(0, 0, w, h); draw(bx, PAL.bump);
    const m = mkCanvas(w, h), mx = m.getContext('2d');
    mx.fillStyle = '#000'; mx.fillRect(0, 0, w, h); draw(mx, PAL.metal);
    return { map: tex(c, true), bump: tex(b, false), metal: tex(m, false) };
  }

  const diamond = (ctx, x, y, r, a) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a || 0);
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  /* soundboard, drawn in instrument units: x ∈ [-19.5, 19.5], y ∈ [0, 39] */
  const SB = { minX: -19.5, size: 39 };
  const outlinePts = (sc, cy) => {
    const r = [];
    prof.forEach(p => r.push([p.x * sc, cy + (p.y - cy) * sc]));
    for (let i = prof.length - 1; i >= 0; i--) r.push([-prof[i].x * sc, cy + (prof[i].y - cy) * sc]);
    return r;
  };
  const addPath = (ctx, pts) => { pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
  const walk = (pts, step, fn) => {
    let t0 = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let t = t0;
      for (; t <= L; t += step) { const f = t / L; fn(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])); }
      t0 = t - L;
    }
  };

  // engraved gold: fill, then fine scrollwork in a darker gold line
  function engraveAlong(ctx, c, pts, step, r) {
    ctx.strokeStyle = c.goldLine; ctx.lineWidth = r * 0.42;
    let flip = 1;
    walk(pts, step, (x, y, a) => {
      ctx.beginPath(); ctx.arc(x, y, r, a + flip * 0.3, a + flip * 0.3 + Math.PI * 1.35); ctx.stroke();
      flip = -flip;
    });
  }
  function rosette(ctx, c, x, y, r) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c.carveDeep; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.strokeStyle = c.carveHi; ctx.lineWidth = r * 0.09;
    for (let i = 0; i < 8; i++) {
      ctx.save(); ctx.rotate(i / 8 * Math.PI * 2);
      ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.22, r * 0.42, 0, 0, 7); ctx.stroke(); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, 7); ctx.stroke();
    ctx.restore();
  }

  function drawSoundboard(ctx, c, S) {
    const k = S / SB.size;
    ctx.save(); ctx.setTransform(k, 0, 0, -k, -SB.minX * k, S); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // wide engraved gold band round the edge
    ctx.beginPath(); addPath(ctx, outlinePts(0.985, 18)); addPath(ctx, outlinePts(0.885, 18));
    ctx.fillStyle = c.gold; ctx.fill('evenodd');
    ctx.strokeStyle = c.goldLine; ctx.lineWidth = 0.07;
    [0.975, 0.895].forEach(sc => { ctx.beginPath(); addPath(ctx, outlinePts(sc, 18)); ctx.stroke(); });
    engraveAlong(ctx, c, outlinePts(0.935, 18), 0.5, 0.2);
    ctx.strokeStyle = c.groove; ctx.lineWidth = 0.1;
    ctx.beginPath(); addPath(ctx, outlinePts(0.875, 18)); ctx.stroke();

    // floral relief carving in the same red wood, either side of the bridge
    for (const s of [1, -1]) {
      ctx.save(); ctx.scale(s, 1);
      const panel = () => {
        ctx.beginPath();
        ctx.moveTo(8.4, 25.2);
        ctx.bezierCurveTo(14.6, 22.5, 15.6, 11, 11.6, 6);
        ctx.bezierCurveTo(8.6, 2.6, 4.8, 5, 5.9, 9);
        ctx.bezierCurveTo(6.7, 11.8, 9.3, 12.4, 9.9, 15.4);
        ctx.bezierCurveTo(10.4, 18.6, 8.2, 21.6, 8.4, 25.2);
        ctx.closePath();
      };
      panel(); ctx.fillStyle = c.carve; ctx.fill();
      ctx.save(); panel(); ctx.clip();
      // dense scrolling leaves and flowers inside the panel
      ctx.strokeStyle = c.carveHi; ctx.lineWidth = 0.12;
      for (let i = 0; i < 9; i++) {
        const cx = 8 + (i % 3) * 2.4 + (i % 2) * 0.6, cy = 6.5 + Math.floor(i / 3) * 6;
        ctx.beginPath();
        for (let t = 0; t <= Math.PI * 2.6; t += 0.1) {
          const r = 1.3 * (1 - t / (Math.PI * 3));
          const x = cx + Math.cos(t) * r, y = cy + Math.sin(t) * r;
          t ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      [[12.4, 9.2, 1.25], [12.6, 16.2, 1.35], [10.2, 21.8, 1.05]].forEach(f => rosette(ctx, c, f[0], f[1], f[2]));
      ctx.lineWidth = 0.1;
      [[9.4, 12.6, 0.4], [13.6, 12.8, 0.1], [11.4, 19.2, -0.5], [7.4, 8.6, 0.9]].forEach(l => {
        ctx.save(); ctx.translate(l[0], l[1]); ctx.rotate(l[2]);
        ctx.beginPath(); ctx.ellipse(0, 0, 0.6, 1.3, 0, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -1.1); ctx.lineTo(0, 1.1); ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
      panel(); ctx.strokeStyle = c.carveHi; ctx.lineWidth = 0.16; ctx.stroke();
      ctx.restore();
    }

    // small gold ornament above the bridge
    ctx.fillStyle = c.gold;
    ctx.beginPath(); ctx.moveTo(0, 21.6);
    ctx.bezierCurveTo(-1.2, 20.6, -1.1, 18.8, 0, 18.2); ctx.bezierCurveTo(1.1, 18.8, 1.2, 20.6, 0, 21.6); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 17.5, 0.45, 0, 7); ctx.fill();
    ctx.strokeStyle = c.goldLine; ctx.lineWidth = 0.08;
    ctx.beginPath(); ctx.moveTo(0, 21.2); ctx.lineTo(0, 18.6); ctx.stroke();

    // engraved gold plate (gulu) where the neck meets the soundboard
    const leaf = (sc) => {
      ctx.beginPath(); ctx.moveTo(0, 24.2 + (1 - sc) * 3);
      ctx.bezierCurveTo(-3.6 * sc, 26.8, -6.8 * sc, 30.2, -4.9 * sc, 38.8); ctx.lineTo(4.9 * sc, 38.8);
      ctx.bezierCurveTo(6.8 * sc, 30.2, 3.6 * sc, 26.8, 0, 24.2 + (1 - sc) * 3); ctx.closePath();
    };
    leaf(1); ctx.fillStyle = c.gold; ctx.fill();
    leaf(0.8); ctx.strokeStyle = c.goldLine; ctx.lineWidth = 0.09; ctx.stroke();
    ctx.save(); leaf(0.8); ctx.clip();
    for (let y = 26; y < 39; y += 0.75) for (let x = -5 + (y * 1.3 % 0.75); x < 5; x += 0.75) {
      ctx.beginPath(); ctx.arc(x, y, 0.18, 0, Math.PI * 1.4); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  function drawFingerboard(ctx, c, W, H) {
    // engraved gold filigree strips down both edges
    const sw = 18;
    ctx.fillStyle = c.gold; ctx.fillRect(0, 0, sw, H); ctx.fillRect(W - sw, 0, sw, H);
    ctx.strokeStyle = c.goldLine; ctx.lineWidth = 1.4;
    [[2, 2], [sw - 2, sw - 2], [W - sw + 2, W - sw + 2], [W - 2, W - 2]].forEach(l => { ctx.beginPath(); ctx.moveTo(l[0], 0); ctx.lineTo(l[1], H); ctx.stroke(); });
    for (let y = 4; y < H; y += 9) {
      [sw / 2, W - sw / 2].forEach((x, i) => {
        ctx.beginPath(); ctx.arc(x, y, 3.4, (i + y / 9) % 2 ? 0.4 : 3.5, ((i + y / 9) % 2 ? 0.4 : 3.5) + 4.2); ctx.stroke();
      });
    }
    // gold-framed peg box with a red panel and two bone studs
    const nutY = Math.round(H * (1 - (D.NUT - D.NECK0) / (D.NECK1 - D.NECK0)));
    ctx.fillStyle = c.gold; ctx.fillRect(0, 0, W, nutY);
    ctx.fillStyle = PAL.color === c ? '#5f2414' : (c === PAL.bump ? '#808080' : '#000');
    ctx.beginPath(); ctx.ellipse(W / 2, nutY * 0.52, W * 0.3, nutY * 0.4, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = c.goldLine; ctx.lineWidth = 1.2;
    for (let y = 8; y < nutY - 4; y += 8) for (let x = 8; x < W - 4; x += 8) {
      if (((x - W / 2) / (W * 0.33)) ** 2 + ((y - nutY * 0.52) / (nutY * 0.44)) ** 2 < 1) continue;
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0.3, 4.4); ctx.stroke();
    }
    ctx.fillStyle = c.bone;
    [[W * 0.36, nutY - 26], [W * 0.56, nutY - 26]].forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, 7); ctx.fill(); });
    // gold plate just below the nut
    ctx.fillStyle = c.gold; ctx.fillRect(0, nutY, W, 40);
    ctx.strokeStyle = c.goldLine; ctx.beginPath(); ctx.moveTo(0, nutY + 38); ctx.lineTo(W, nutY + 38); ctx.stroke();
  }

  const RED = '#8a4424';
  const sbTex = carved(1024, 1024, '#682a17', true, (x, c) => drawSoundboard(x, c, 1024));
  const gourdTex = carved(1024, 1024, RED, false, () => {});
  const fbTex = carved(128, 2048, '#5f2414', true, (x, c) => drawFingerboard(x, c, 128, 2048));
  const neckTex = carved(256, 2048, RED, true, () => {});

  /* ---------- materials ---------- */
  const lacquer = (t, extra) => new THREE.MeshPhysicalMaterial(Object.assign({
    map: t.map, bumpMap: t.bump, bumpScale: 1.3, metalnessMap: t.metal, metalness: 1, roughness: 0.36,
    clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.05
  }, extra || {}));
  /* photo textures of his sitar: colour + a packed map (R bump, G roughness, B metalness for the gold) */
  const loader = new THREE.TextureLoader();
  const loadTex = (url, srgb) => new Promise(res => loader.load(url, t => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso; res(t);
  }, undefined, () => res(null)));
  const [boardMap, boardPack, neckMap, neckPack] = await Promise.all([
    loadTex('assets/sitar-board.jpg', true), loadTex('assets/sitar-board-mat.jpg'),
    loadTex('assets/sitar-neck.jpg', true), loadTex('assets/sitar-neck-mat.jpg')]);
  const photoMat = (map, pack) => map && pack ? new THREE.MeshPhysicalMaterial({
    map, color: 0xdcdde4, bumpMap: pack, bumpScale: 2.2, roughnessMap: pack, roughness: 1, metalnessMap: pack, metalness: 1,
    clearcoat: 0.55, clearcoatRoughness: 0.16, envMapIntensity: 0.7 }) : null;   // the photo is already lit: tone it down
  const M = {
    board: photoMat(boardMap, boardPack) || lacquer(sbTex),
    gourd: lacquer(gourdTex, { side: THREE.DoubleSide }),
    finger: photoMat(neckMap, neckPack) || lacquer(fbTex),
    neck: lacquer(neckTex, { side: THREE.DoubleSide }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9b25c, metalness: 1, roughness: 0.32, envMapIntensity: 1.5 }),
    peg: new THREE.MeshPhysicalMaterial({ color: 0x7a3a1c, roughness: 0.34, clearcoat: 0.9, clearcoatRoughness: 0.12, envMapIntensity: 1 }),
    fret: new THREE.MeshStandardMaterial({ color: 0xf0e8d4, metalness: 1, roughness: 0.18, envMapIntensity: 1.9 }),
    bone: new THREE.MeshPhysicalMaterial({ color: 0xf2ead8, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.35, envMapIntensity: 0.8 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xebe5d8, metalness: 1, roughness: 0.2, envMapIntensity: 1.4 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0xcf8f4c, metalness: 1, roughness: 0.25, envMapIntensity: 1.4 })
  };

  /* ---------- geometry helpers ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const inst = new THREE.Group();
  const add = (geo, mat, pos, rot, parent) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    (parent || inst).add(m); return m;
  };
  const wire = (pts, r, mat) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], d = V(0, 0, 0).subVectors(b, a), len = d.length();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6, 1, true), mat);
      m.position.copy(a).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(UP, d.normalize());
      inst.add(m);
    }
  };

  /* main gourd: deep carved bowl + flat soundboard */
  const { BRIDGE, NUT, SCALE, NECK0, NECK1, NW, ND } = D;
  const HW = NW / 2, BACK = ND - 0.6;           // half width; depth of the rounded back
  const gourdGroup = new THREE.Group(); gourdGroup.scale.set(D.GX, D.GY, D.GZ); inst.add(gourdGroup);
  add(new THREE.LatheGeometry(prof, 72, Math.PI / 2, Math.PI), M.gourd, null, null, gourdGroup);
  {
    const front = new THREE.Group(); front.scale.set(D.GX, D.GY, 1); inst.add(front);
    const shape = new THREE.Shape();
    prof.forEach((p, i) => i ? shape.lineTo(p.x, p.y) : shape.moveTo(p.x, p.y));
    for (let i = prof.length - 1; i >= 0; i--) shape.lineTo(-prof[i].x, prof[i].y);
    const g = new THREE.ShapeGeometry(shape, 64);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - SB.minX) / SB.size, pos.getY(i) / SB.size);
    add(g, M.board, [0, 0, 0.02], null, front);
    // bone binding around the soundboard edge
    for (const s of [1, -1]) {
      const curve = new THREE.CatmullRomCurve3(prof.filter((_, i) => i % 2 === 0).map(p => V(s * p.x, p.y, 0.05)));
      add(new THREE.TubeGeometry(curve, 90, 0.42, 8, false), M.gold, null, null, front);
    }
  }

  /* neck (dand): deep D-shaped back + flat fingerboard with bone edges, into the peg box */
  {
    const len = NECK1 - NECK0, cy = (NECK0 + NECK1) / 2;
    const back = add(new THREE.CylinderGeometry(HW, HW, len, 32, 1, true, Math.PI / 2, Math.PI), M.neck, [0, cy, 0]);
    back.scale.z = BACK / HW;
    add(new THREE.BoxGeometry(NW, len, 0.6), [M.gold, M.gold, M.gold, M.gold, M.finger, M.finger], [0, cy, 0.3]);
    add(new THREE.BoxGeometry(NW + 0.2, 1.2, ND + 0.2), M.gold, [0, NECK1 + 0.6, 0.6 - ND / 2]); // gold cap on the peg box
  }

  /* nut (meru), twin bone bridges and the gold tailpiece anchor, where they sit on his sitar */
  add(new THREE.BoxGeometry(NW, 0.9, 1.6), M.bone, [0, NUT, 1.4]);
  add(new THREE.BoxGeometry(8.4, 3.8, 2.5), M.bone, [0, BRIDGE, 1.3]);   // main bridge (badi goraj)
  const TB = BRIDGE + 3.7;
  add(new THREE.BoxGeometry(5.6, 3.2, 1.7), M.bone, [0, TB, 0.9]);       // tarab bridge (chhoti goraj)
  const TAIL = 8.6;                                                       // top of the gold tailpiece
  add(new THREE.BoxGeometry(2.6, 0.8, 0.7), M.gold, [0, TAIL, 0.4]);

  /* 19 arched frets at the positions measured from the photograph */
  [99.17, 95.54, 91.56, 87.76, 83.78, 80.07, 76.88, 73.52, 67.95, 65.04, 62.47, 60.0, 57.43,
   53.45, 51.33, 49.83, 47.97, 46.29, 43.55].forEach(y => {
    const curve = new THREE.QuadraticBezierCurve3(V(-HW - 0.1, y, 0.6), V(0, y, 3.3), V(HW + 0.1, y, 0.6));
    add(new THREE.TubeGeometry(curve, 24, 0.19, 8, false), M.fret);
  });

  /* dark ball-headed pegs (khunti), lightly fluted; ~9 cm, tarab pegs ~4-5 cm */
  const pegGeo = new THREE.LatheGeometry([
    [0, 0], [0.4, 0], [0.42, 3.4], [0.62, 3.6], [0.62, 4.0], [0.5, 4.3], [0.95, 4.6],
    [1.45, 5.1], [1.7, 5.9], [1.72, 6.6], [1.5, 7.4], [1.0, 7.95], [0.45, 8.2], [0.3, 8.4], [0.36, 8.6], [0, 8.75]
  ].map(p => new THREE.Vector2(p[0], p[1])), 48);
  {
    // melon-fluted heads, like the pegs on his sitar
    const p = pegGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y > 4.6 && y < 8.2) {
        const x = p.getX(i), z = p.getZ(i), f = 1 + 0.1 * Math.cos(8 * Math.atan2(x, z)) * Math.sin(Math.PI * (y - 4.6) / 3.6);
        p.setX(i, x * f); p.setZ(i, z * f);
      }
    }
    pegGeo.computeVertexNormals();
  }
  const MIDZ = 0.6 - ND / 2;                     // halfway through the neck's depth
  const peg = (side, y, s, z, x) => {
    const m = add(pegGeo, M.peg,
      side === 0 ? [x || 0, y, 0.55] : [side * (HW - 0.25), y, z === undefined ? MIDZ : z],
      side === 0 ? [Math.PI / 2, 0, 0] : [0, 0, -side * Math.PI / 2]);
    m.scale.setScalar(s || 1);
    return m;
  };
  // pegs as on his sitar: all side pegs on one side, two through the face of the peg box
  const SIDE = -1, FACE_X = 1.6;
  const headPegs = [[0, 123.4], [0, 114.1], [SIDE, 124.3], [SIDE, 117.0], [SIDE, 110.1]];
  headPegs.forEach(p => peg(p[0], p[1], p[0] ? 1.4 : 1.1, undefined, FACE_X));
  const sidePegs = [100.6, 92.4];                       // two chikari pegs below the nut
  sidePegs.forEach(y => peg(SIDE, y, 1.3));
  const tarabY = [88.0, 84.3, 80.8, 77.2, 73.4, 67.4, 62.2, 59.7, 57.1, 54.4, 50.9, 47.8, 45.6];
  tarabY.forEach((y, k) => peg(SIDE, y, 0.78 + (y - 45) / 43 * 0.2, MIDZ + (k % 2 ? 0.8 : -0.8)));

  /* strings: 7 playing strings + 13 tarab */
  const zAt = 2.75;
  const tail = x => V(x * 0.3, TAIL + 0.4, 0.95);
  const bx = i => -2.1 + 0.7 * i;                // spacing on the main bridge
  // five main strings: bridge -> nut -> into the peg box
  headPegs.forEach((p, j) => {
    const x = bx(j + 2), nx = -1.2 + 0.7 * j;
    const end = p[0] === 0 ? V(FACE_X, p[1] - 1.3, 0.7) : V(p[0] * (HW - 1), p[1], 0.65);
    wire([tail(x), V(x, BRIDGE, zAt), V(nx, NUT, 2.22), end], j === 0 ? 0.075 : 0.065, j < 2 ? M.steel : M.bronze);
  });
  // two chikari: bridge -> bone post -> side peg
  sidePegs.forEach((y, i) => {
    const x = bx(i), px = SIDE * (HW - 0.5);
    add(new THREE.CylinderGeometry(0.28, 0.32, 1.8, 10), M.bone, [px, y - 2.2, 1.4], [Math.PI / 2, 0, 0]);
    wire([tail(x), V(x, BRIDGE, zAt), V(px, y - 2.2, 2.3), V(SIDE * HW, y, 0.3)], 0.055, M.steel);
  });
  // tarab: from their bridge, under the frets, to small bone eyelets on the peg side
  tarabY.forEach((y, k) => {
    const x0 = -1.8 + 0.3 * k, ex = SIDE * (HW - 0.7);
    add(new THREE.SphereGeometry(0.24, 10, 8), M.bone, [ex, y, 0.68]);
    wire([V(x0 * 0.4, TAIL + 0.6, 0.9), V(x0, TB, 1.8), V(ex, y, 0.75)], 0.04, M.bronze);
  });

  // test mode: report measured sizes (cm) so proportions can be checked against a real sitar
  if (pose !== null) {
    const size = o => { const v = new THREE.Box3().setFromObject(o).getSize(V(0, 0, 0)); return [v.x, v.y, v.z].map(n => +n.toFixed(1)); };
    window.__sitarDims = { overall: size(inst), gourd: size(gourdGroup), scale: SCALE, nut: NUT, neck: [NW, ND] };
  }

  /* ---------- assemble: holder (screen place + size) -> tilt (lean) -> spin (around its length) ---------- */
  inst.scale.setScalar(0.01);
  inst.position.y = -0.64;
  const MODEL_LEN = 1.3;                         // world length of the sitar at holder scale 1
  const spin = new THREE.Group(); spin.add(inst);
  const tilt = new THREE.Group(); tilt.add(spin);
  const holder = new THREE.Group(); holder.add(tilt); scene.add(holder);

  /* ---------- lantern motes (travel with the sitar) ---------- */
  const N = 90, mp = new Float32Array(N * 3), ms = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    mp[i * 3] = (rnd() - 0.5) * 1.9; mp[i * 3 + 1] = (rnd() - 0.5) * 1.4; mp[i * 3 + 2] = rnd() * 0.7 - 0.3;
    ms[i] = rnd();
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  mg.setAttribute('aSeed', new THREE.BufferAttribute(ms, 1));
  const moteMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uScale: { value: 1 } },
    vertexShader: `
      attribute float aSeed; uniform float uTime; uniform float uPR; uniform float uScale; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + 0.9 + uTime * (0.02 + aSeed * 0.03), 1.8) - 0.9;
        p.x += sin(uTime * 0.6 + aSeed * 20.0) * 0.03;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float tw = 0.5 + 0.5 * sin(uTime * (1.4 + aSeed * 2.0) + aSeed * 30.0);
        vA = tw * (1.0 - smoothstep(0.55, 0.9, abs(p.y)));
        gl_PointSize = (2.0 + aSeed * 3.5) * uPR * uScale * (6.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = 1.0 - smoothstep(0.0, 0.5, d);
        gl_FragColor = vec4(1.0, 0.76, 0.4, a * a * vA * 0.85);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const motes = new THREE.Points(mg, moteMat);
  motes.visible = pose === null;
  scene.add(motes);

  /* ---------- the sitar's resting places, one per section ----------
     Each stop is pinned to a page element: `at` is a point in that element's box
     (fractions), `len` the sitar's on-screen length, `ang` its angle above horizontal.
     Moving into a stop happens while the element's top scrolls from `from` to `to`
     (fractions of the viewport height); the sitar lifts, turns once and glides over. */
  const mobile = () => window.matchMedia('(max-width: 860px)').matches;
  const STOPS = [
    // phones crop the image to its middle, so the sitar sits a little smaller and further left there
    // placed as in the original artwork: gourd resting on the rim at ~(45%, 34%), head ending near (73%, 7%)
    { el: '.chowk-stage', at: () => mobile() ? [0.555, 0.245] : [0.573, 0.231],
      len: r => r.width * (mobile() ? 0.32 : 0.36), ang: 29 },
    { el: '.hero', at: () => mobile() ? [0.5, 0.5] : [0.27, 0.5],
      len: r => mobile() ? Math.min(r.width * 0.95, r.height * 0.62) : Math.min(r.width * 0.42, r.height * 0.7),
      ang: 37, from: 0.85, to: 0.1 },
    { el: '.jr-street', at: [0.37, 0.062], len: r => r.width * 0.27, ang: 11, from: 0.95, to: 0.3, desktopOnly: true }
  ];
  const ease = t => t * t * (3 - 2 * t);
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function placement() {
    const vh = window.innerHeight;
    let p = null, turns = 0, hop = 0;
    for (const st of STOPS) {
      if (st.desktopOnly && mobile()) continue;
      const el = document.querySelector(st.el);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const at = typeof st.at === 'function' ? st.at() : st.at;
      const q = { x: r.left + r.width * at[0], y: r.top + r.height * at[1], len: st.len(r), ang: st.ang };
      if (!p) { p = q; continue; }
      // never mid-flight before you scroll: start no lower than where this element sits at the top of the page
      const fromPx = Math.min(st.from * vh, r.top + window.pageYOffset - 1);
      const toPx = Math.min(st.to * vh, fromPx - 0.35 * vh);
      const s = ease(clamp01((fromPx - r.top) / (fromPx - toPx)));
      p = { x: lerp(p.x, q.x, s), y: lerp(p.y, q.y, s), len: lerp(p.len, q.len, s), ang: lerp(p.ang, q.ang, s) };
      turns += s;
      hop = Math.max(hop, Math.sin(Math.PI * s));
    }
    if (p) p.y -= hop * vh * 0.06;          // a small lift mid-flight
    return { p, turns, hop };
  }

  /* ---------- mount: one fixed, page-wide layer above the sections ---------- */
  let raf = 0, shown = false, still = pose !== null || reduce, wasOff = false;
  let last = 0, frames = 0, slowMs = 0, tier = 0;
  const cvs = renderer.domElement;
  cvs.className = 'kk-sitar-layer';
  cvs.setAttribute('role', 'img');
  cvs.setAttribute('aria-label', 'Pandit Kartick Kumar\'s sitar in 3D, resting on the chowk and moving through the page as you scroll');
  document.documentElement.classList.add('kk-3d');
  wrap.classList.add('is-3d');
  document.body.appendChild(cvs);
  // if the GPU drops the context, fall back to the still images
  cvs.addEventListener('webglcontextlost', e => {
    e.preventDefault(); still = true;
    if (raf) cancelAnimationFrame(raf);
    document.documentElement.classList.remove('kk-3d'); wrap.classList.remove('is-3d'); cvs.remove();
  });

  const pixelRatio = () => Math.min(window.devicePixelRatio || 1, tier ? 1 : 1.5);
  function resize() {
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    moteMat.uniforms.uPR.value = renderer.getPixelRatio();
    requestRender();
  }
  camera.fov = 28; camera.position.set(0, 0, 6); camera.updateProjectionMatrix();
  const worldPerPx = () => 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / window.innerHeight;

  /* ---------- motion ---------- */
  let mx = 0, my = 0, cx = 0, cy = 0;
  window.addEventListener('mousemove', e => {
    mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  function render(t) {
    const s = t / 1000;
    cx += (mx - cx) * 0.05; cy += (my - cy) * 0.05;
    const { p, turns } = placement();
    if (!p) return;
    const vh = window.innerHeight, vw = window.innerWidth;
    const off = p.y < -p.len * 0.7 || p.y > vh + p.len * 0.7 || p.x < -p.len || p.x > vw + p.len;
    if (off) { if (!wasOff) { renderer.clear(); wasOff = true; } return; }
    wasOff = false;

    const wpp = worldPerPx();
    const k = p.len * wpp / MODEL_LEN;
    holder.position.set((p.x - vw / 2) * wpp, -(p.y - vh / 2) * wpp, 0);
    holder.scale.setScalar(k);
    motes.position.copy(holder.position); motes.scale.setScalar(k * 1.1);
    moteMat.uniforms.uScale.value = k;

    const lean = -THREE.MathUtils.degToRad(90 - p.ang);
    if (pose !== null) {
      spin.rotation.y = pose;
      tilt.rotation.set(upright ? 0 : 0.08, 0, upright ? 0 : lean);
    } else if (!reduce) {
      spin.rotation.y = 0.2 + Math.sin(s * 0.35) * 0.3 + cx * 0.45 + turns * Math.PI * 2;
      tilt.rotation.set(0.08 + cy * 0.15, 0, lean + Math.sin(s * 0.5) * 0.02);
      holder.position.y += Math.sin(s * 0.9) * 0.012 * k;
    } else {
      spin.rotation.y = 0.25;
      tilt.rotation.set(0.08, 0, lean);
    }
    moteMat.uniforms.uTime.value = s;
    renderer.render(scene, camera);
    if (!shown) { shown = true; cvs.classList.add('on'); }
  }

  // on-demand rendering (scroll / resize) when not animating continuously
  let pending = false;
  function requestRender() {
    if (pending || (!still && raf)) return;
    pending = true;
    requestAnimationFrame(t => { pending = false; render(t); });
  }
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', resize);

  // Adaptive quality: on a slow GPU drop to 1x resolution, and if that is
  // still slow, render only when the page scrolls instead of every frame.
  function loop(t) {
    raf = 0;
    if (last) {
      const dt = t - last;
      if (frames > 5 && frames < 70) slowMs += dt;
      if (frames === 69 && slowMs / 64 > 45) {
        if (tier === 0 && renderer.getPixelRatio() > 1) {
          tier = 1; resize(); frames = 0; slowMs = 0;
        } else { still = true; }
      }
    }
    last = t; frames++;
    render(t);
    if (!still) raf = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
    else if (!still && !raf) { last = 0; raf = requestAnimationFrame(loop); }
  });
  resize();
  if (still) requestRender(); else raf = requestAnimationFrame(loop);
}

init();
