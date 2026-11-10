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
   (and exposes window.__sitarDims, measured sizes in cm); &upright removes the lean;
   &nofade keeps the sitar visible where it merges into the About photo.
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
  const noFade = /[?&]nofade\b/.test(location.search);   // testing: keep the sitar visible over the photo

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
  const hemi = new THREE.HemisphereLight(0xcfc4d8, 0x4a3018, 0.75); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe2c0, 2.4); key.position.set(5, 2, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff0e0, 0.75); fill.position.set(-3, -2, 5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xb4b6e0, 0.7); rim.position.set(-4, 4, -5); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffb878, 1.0); rim2.position.set(4, -1, -4); scene.add(rim2);
  // the monument's warm uplight, only while the sitar is mounted on it
  const uplight = new THREE.DirectionalLight(0xffa64a, 0); uplight.position.set(0.5, -3, 3); scene.add(uplight);
  const LIGHT = {
    away: { key: new THREE.Color(0xffe2c0), keyI: 2.4, sky: new THREE.Color(0xcfc4d8), hemiI: 0.75, exp: 1.12, up: 0 },
    chowk: { key: new THREE.Color(0xffc985), keyI: 1.9, sky: new THREE.Color(0xe0c08c), hemiI: 0.8, exp: 1.0, up: 1.4 }
  };
  function warmLight(w) {        // w = 1 on the monument, 0 once it has lifted off
    key.color.copy(LIGHT.away.key).lerp(LIGHT.chowk.key, w);
    key.intensity = LIGHT.away.keyI + (LIGHT.chowk.keyI - LIGHT.away.keyI) * w;
    hemi.color.copy(LIGHT.away.sky).lerp(LIGHT.chowk.sky, w);
    hemi.intensity = LIGHT.away.hemiI + (LIGHT.chowk.hemiI - LIGHT.away.hemiI) * w;
    renderer.toneMappingExposure = LIGHT.away.exp + (LIGHT.chowk.exp - LIGHT.away.exp) * w;
    uplight.intensity = LIGHT.chowk.up * w;
  }

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
    GX: 1.12, GY: 1.0, GZ: 1.7,       // gourd profile -> 41 x 39 x 31 cm (his large round gourd)
    BRIDGE: 15.7, SCALE: 90,          // nut at 105.7
    NECK0: 30.0, NECK1: 127.1,        // neck from gourd joint to top of peg box
    NW: 11.0, ND: 7.2                 // neck width / depth incl. fingerboard
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

  const RED = '#8e3c1c';
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
    map, color: 0xeee2da, bumpMap: pack, bumpScale: 2.2, roughnessMap: pack, roughness: 1, metalnessMap: pack, metalness: 1,
    clearcoat: 0.55, clearcoatRoughness: 0.16, envMapIntensity: 0.7 }) : null;   // the photo is already lit: tone it down
  const M = {
    board: photoMat(boardMap, boardPack) || lacquer(sbTex),
    gourd: lacquer(gourdTex, { side: THREE.DoubleSide }),
    finger: photoMat(neckMap, neckPack) || lacquer(fbTex),
    neck: lacquer(neckTex, { side: THREE.DoubleSide }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe6c886, metalness: 1, roughness: 0.32, envMapIntensity: 1.5 }),
    peg: new THREE.MeshPhysicalMaterial({ color: 0x5a2312, roughness: 0.35, clearcoat: 0.9, clearcoatRoughness: 0.12, envMapIntensity: 1.0 }),
    pegStem: new THREE.MeshPhysicalMaterial({ color: 0xa8683c, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 0.9 }),
    fret: new THREE.MeshStandardMaterial({ color: 0xece8de, metalness: 1, roughness: 0.18, envMapIntensity: 1.8 }),
    bone: new THREE.MeshPhysicalMaterial({ color: 0xf2ead8, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.35, envMapIntensity: 0.8 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xebe5d8, metalness: 1, roughness: 0.2, envMapIntensity: 1.4, emissive: 0xfff1d0, emissiveIntensity: 0 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0xcf8f4c, metalness: 1, roughness: 0.25, envMapIntensity: 1.4, emissive: 0xffc070, emissiveIntensity: 0 })
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
  const strings = [];
  const wire = (pts, r, mat) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], d = V(0, 0, 0).subVectors(b, a), len = d.length();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6, 1, true), mat);
      m.position.copy(a).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(UP, d.normalize());
      inst.add(m);
      if (len > 20) strings.push({ m, base: m.position.clone(), phase: strings.length * 1.7 });   // playing lengths vibrate
    }
  };

  /* main gourd: deep carved bowl + flat soundboard */
  const { BRIDGE, NUT, SCALE, NECK0, NECK1, NW, ND } = D;
  const HW = NW / 2, BACK = ND - 0.6;           // half width; depth of the rounded back
  const GDROP = 39 * (D.GY - 0.83);            // grow the gourd downward: neck joint stays where it was
  const gourdGroup = new THREE.Group(); gourdGroup.scale.set(D.GX, D.GY, D.GZ); gourdGroup.position.y = -GDROP; inst.add(gourdGroup);
  add(new THREE.LatheGeometry(prof, 72, Math.PI / 2, Math.PI), M.gourd, null, null, gourdGroup);
  {
    const front = new THREE.Group(); front.scale.set(D.GX, D.GY, 1); front.position.y = -GDROP; inst.add(front);
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
    add(new THREE.BoxGeometry(NW + 0.2, 1.2, ND + 0.2), M.gold, [0, NECK1 + 0.6, 0.6 - ND / 2]); // gold cap on the square peg box
    add(new THREE.BoxGeometry(NW + 0.5, 0.5, ND + 0.5), M.gold, [0, NECK1 + 1.45, 0.6 - ND / 2]);
  }

  /* nut (meru), twin bone bridges and the gold tailpiece anchor, where they sit on his sitar */
  add(new THREE.BoxGeometry(NW, 0.9, 1.6), M.bone, [0, NUT, 1.4]);
  add(new THREE.BoxGeometry(8.4, 3.8, 2.5), M.bone, [0, BRIDGE, 1.3]);   // main bridge (badi goraj)
  const TB = BRIDGE + 3.7;
  add(new THREE.BoxGeometry(5.6, 3.2, 1.7), M.bone, [0, TB, 0.9]);       // tarab bridge (chhoti goraj)
  const TAIL = 8.6 - GDROP * 0.6;                                                       // top of the gold tailpiece
  add(new THREE.BoxGeometry(2.6, 0.8, 0.7), M.gold, [0, TAIL, 0.4]);

  /* 19 arched frets at the positions measured from the photograph */
  [99.17, 95.54, 91.56, 87.76, 83.78, 80.07, 76.88, 73.52, 67.95, 65.04, 62.47, 60.0, 57.43,
   53.45, 51.33, 49.83, 47.97, 46.29, 43.55].forEach(y => {
    const curve = new THREE.QuadraticBezierCurve3(V(-HW - 0.1, y, 0.6), V(0, y, 3.3), V(HW + 0.1, y, 0.6));
    add(new THREE.TubeGeometry(curve, 24, 0.19, 8, false), M.fret);
  });

  /* pegs (khunti) as on his sitar: dark-brown fluted heads on lighter turned stems */
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(q => new THREE.Vector2(q[0], q[1])), seg);
  const pegStemGeo = lathe([[0, 0], [0.42, 0], [0.42, 2.9], [0.64, 3.1], [0.64, 3.5], [0.46, 3.75],
    [0.56, 4.05], [0.8, 4.3], [0, 4.32]], 24);
  const pegHeadGeo = lathe([[0, 4.2], [0.8, 4.3], [1.38, 4.75], [1.7, 5.55], [1.64, 6.45], [1.22, 7.15],
    [0.55, 7.55], [0.28, 7.72], [0.34, 7.95], [0, 8.05]], 48);
  {
    // deep flutes, like the carved melon heads on his pegs
    const q = pegHeadGeo.attributes.position;
    for (let i = 0; i < q.count; i++) {
      const y = q.getY(i);
      if (y > 4.3 && y < 7.6) {
        const x = q.getX(i), z = q.getZ(i), f = 1 + 0.13 * Math.cos(10 * Math.atan2(x, z)) * Math.sin(Math.PI * (y - 4.3) / 3.3);
        q.setX(i, x * f); q.setZ(i, z * f);
      }
    }
    pegHeadGeo.computeVertexNormals();
  }
  const MIDZ = 0.6 - ND / 2;                     // halfway through the neck's depth
  const peg = (side, y, s, z, x) => {
    const m = new THREE.Group();
    m.add(new THREE.Mesh(pegStemGeo, M.pegStem), new THREE.Mesh(pegHeadGeo, M.peg));
    const at = side === 0 ? [x || 0, y, 0.55] : [side * (HW - 0.25), y, z === undefined ? MIDZ : z];
    const rot = side === 0 ? [Math.PI / 2, 0, 0] : [0, 0, -side * Math.PI / 2];
    m.position.set(at[0], at[1], at[2]); m.rotation.set(rot[0], rot[1], rot[2]);
    m.scale.setScalar(s || 1);
    inst.add(m);
    return m;
  };
  // pegs as on his sitar: all side pegs on one side, two through the face of the peg box
  const SIDE = -1, FACE_X = 1.6;
  const headPegs = [[0, 123.4], [0, 114.1], [SIDE, 124.3], [SIDE, 117.0], [SIDE, 110.1]];
  headPegs.forEach(p => peg(p[0], p[1], p[0] ? 1.45 : 0.95, undefined, FACE_X));
  const sidePegs = [100.6, 92.4];                       // two chikari pegs below the nut
  sidePegs.forEach(y => peg(SIDE, y, 1.35));
  const tarabY = [88.0, 84.3, 80.8, 77.2, 73.4, 67.4, 62.2, 59.7, 57.1, 54.4, 50.9, 47.8, 45.6];
  tarabY.forEach((y, k) => peg(SIDE, y, 0.7 + (y - 45) / 43 * 0.22, MIDZ + (k % 2 ? 0.8 : -0.8)));

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
  inst.position.y = -0.6;
  const MODEL_LEN = 1.3;                         // world length of the sitar at holder scale 1
  const spin = new THREE.Group(); spin.add(inst);
  const tilt = new THREE.Group(); tilt.add(spin);
  const holder = new THREE.Group(); holder.add(tilt); scene.add(holder);
  const glint = new THREE.PointLight(0xffdca0, 0, 0.9, 1.6); spin.add(glint);

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
    uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uScale: { value: 1 }, uBoost: { value: 0 } },
    vertexShader: `
      attribute float aSeed; uniform float uTime; uniform float uPR; uniform float uScale; uniform float uBoost; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + 0.9 + uTime * (0.02 + aSeed * 0.03), 1.8) - 0.9;
        p.x += sin(uTime * 0.6 + aSeed * 20.0) * 0.03;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float tw = 0.5 + 0.5 * sin(uTime * (1.4 + aSeed * 2.0) + aSeed * 30.0);
        vA = tw * (1.0 - smoothstep(0.55, 0.9, abs(p.y))) * (1.0 + uBoost * 1.6);
        gl_PointSize = (2.0 + aSeed * 3.5) * (1.0 + uBoost * 0.6) * uPR * uScale * (6.0 / -mv.z);
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
  // standing upright on the street: as tall as fits comfortably on screen
  const streetLen = r => mobile() ? Math.min(r.width * 0.95, window.innerHeight * 0.52)
                                  : Math.min(r.width * 0.34, window.innerHeight * 0.66);
  const portrait = () => window.matchMedia('(max-width: 600px)').matches;
  const STOPS = [
    // phones crop the image to its middle, so the sitar sits a little smaller and further left there
    // placed as in the original artwork: gourd resting on the rim at ~(45%, 34%), head ending near (73%, 7%)
    // phones (portrait artwork): gourd on the rim left of centre, neck rising to ~34 degrees
    // mounted on the gold arch stand: gourd centre at the artwork's (44%, 32.5%) wide / (40.5%, 40%) portrait,
    // body just over the rim (its lowest edge tucks behind it), neck rising at 27 / 33 degrees
    { el: '.chowk-stage', at: () => portrait() ? [0.535, 0.356] : [0.545, 0.25],
      len: r => r.width * (portrait() ? 0.42 : 0.32), ang: () => portrait() ? 33 : 27 },
    { el: '.hero', at: () => mobile() ? [0.5, 0.5] : [0.27, 0.5],
      len: r => mobile() ? Math.min(r.width * 0.95, r.height * 0.62) : Math.min(r.width * 0.42, r.height * 0.7),
      ang: 37, from: 9, to: 0.1, anchor: true, hop: 0 },   // peel off the stand from the first scroll and glide straight here
    // the story street: land at its top-middle, standing upright (vertical) ...
    { el: '.jr-street', at: () => mobile() ? [0.5, 0.03] : [0.5, 0.1],
      len: streetLen, ang: 90, from: 0.95, to: 0.3 },
    // ... then walk down the middle of the street, holding mid-screen, to its bottom-middle
    { el: '.jr-street', at: () => mobile() ? [0.5, 0.97] : [0.5, 0.9],
      len: streetLen, ang: 90, follow: 0.5, turn: false },
    // finally settle exactly onto the sitar in his photograph (About section) and dissolve into it.
    // Fitted on the frets: the model's lowest fret (43.6 cm) lands on the photo's lowest visible fret
    // at (62.3%, 77.9%) and its top fret (99.2 cm) on the photo's top fret at (93.2%, 26.6%).
    { el: '.about-photo img', at: [0.675, 0.627], len: r => r.width * 1.58, ang: 62.8, from: 1.05, to: 0.22,
      turn: false, merge: true }
  ];
  const ease = t => t * t * (3 - 2 * t);
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function placement() {
    const vh = window.innerHeight;
    let p = null, prevQ = null, turns = 0, spins = 0, hop = 0, merge = 0, lift = -1;
    for (const st of STOPS) {
      if (st.desktopOnly && mobile()) continue;
      const el = document.querySelector(st.el);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const at = typeof st.at === 'function' ? st.at() : st.at;
      const q = { x: r.left + r.width * at[0], y: r.top + r.height * at[1], len: st.len(r),
                  ang: typeof st.ang === 'function' ? st.ang() : st.ang };
      if (!p) { p = q; prevQ = q; continue; }
      let s;
      if (st.follow !== undefined) {
        // travel along with the page so the sitar holds `follow` (fraction of the viewport) on screen.
        // Measured from the previous stop's own spot, so this only starts once the sitar has got there.
        const c = st.follow * vh;
        s = q.y === prevQ.y ? 1 : clamp01((c - prevQ.y) / (q.y - prevQ.y));
      } else {
        // never mid-flight before you scroll: start no lower than where this element sits at the top of the page
        const fromPx = Math.min(st.from * vh, r.top + window.pageYOffset - 1);
        const toPx = Math.min(st.to * vh, fromPx - 0.35 * vh);
        s = ease(clamp01((fromPx - r.top) / (fromPx - toPx)));
        hop = Math.max(hop, Math.sin(Math.PI * s) * (st.hop !== undefined ? st.hop : st.merge ? 0.4 : 1));
        // while leaving, keep the starting point on screen instead of letting it scroll away with the page
        // start from where it rested on screen, so it never rides up under the top bar with the monument
        if (st.anchor) p = { ...p, y: p.y + window.pageYOffset };
      }
      p = { x: lerp(p.x, q.x, s), y: lerp(p.y, q.y, s), len: lerp(p.len, q.len, s), ang: lerp(p.ang, q.ang, s) };
      if (st.turn !== false) { turns += Math.sin(Math.PI * s) * 0.45; spins += s; }   // sway + one full turn per flight
      if (st.merge) merge = s;
      if (lift < 0) lift = s;               // the first flight: off the monument
      prevQ = q;
    }
    if (p) p.y -= hop * vh * 0.06;          // a small lift mid-flight
    return { p, turns, spins, hop, merge, lift: Math.max(0, lift) };
  }

  /* ---------- mount: one fixed, page-wide layer above the sections ---------- */
  let raf = 0, shown = false, still = pose !== null || reduce, wasOff = false, lastFade = -1;
  const photo = document.querySelector('.about-photo img'), photoFrame = photo && photo.closest('.about-photo');
  let last = 0, frames = 0, slowMs = 0, tier = 0;
  const cvs = renderer.domElement;
  cvs.className = 'kk-sitar-layer';
  cvs.setAttribute('role', 'img');
  cvs.setAttribute('aria-label', 'Pandit Kartick Kumar\'s sitar in 3D: it rests on the chowk, walks down the story street as you scroll, and settles into his photograph');
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

  // the monument's front, as a hole in the sitar layer, so the gourd tucks behind the rim
  const stageEl = document.querySelector('.chowk-stage');
  const RIM = {   // rim top as an ellipse arc + the monument body below it, in stage fractions
    wide: { cx: 0.512, top: 0.407, rx: 0.245, drop: 0.024, bottom: 0.83 },
    tall: { cx: 0.455, top: 0.432, rx: 0.28, drop: 0.018, bottom: 0.76 }
  };
  function behindRim() {
    if (!stageEl) return '';
    const r = stageEl.getBoundingClientRect(), g = portrait() ? RIM.tall : RIM.wide;
    const vw = window.innerWidth, vh = window.innerHeight, pts = [];
    for (let i = 0; i <= 24; i++) {
      const u = -1 + 2 * i / 24;
      const fx = g.cx + g.rx * u, fy = g.top + g.drop * u * u;
      pts.push([r.left + r.width * fx, r.top + r.height * fy]);
    }
    pts.push([r.left + r.width * (g.cx + g.rx), r.top + r.height * g.bottom],
             [r.left + r.width * (g.cx - g.rx), r.top + r.height * g.bottom]);
    const f = q => q[0].toFixed(1) + 'px ' + q[1].toFixed(1) + 'px';
    return 'polygon(evenodd, 0 0, ' + vw + 'px 0, ' + vw + 'px ' + vh + 'px, 0 ' + vh + 'px, 0 0, ' +
      pts.map(f).join(', ') + ', ' + f(pts[0]) + ', 0 0)';
  }

  let lastScroll = window.pageYOffset, lastT = 0, vel = 0, pluck = 0, nextPluck = 2.5, lastStage = -1, lastFrame = 0, disp = null;
  const trail = { x: 0, y: 0 };
  function render(t) {
    const s = t / 1000;
    cx += (mx - cx) * 0.05; cy += (my - cy) * 0.05;
    const target = placement();
    const { merge, lift } = target;
    // follow the scroll target with a smooth, critically-damped glide (no jumps on wheel steps)
    const dts = lastFrame ? Math.min(0.1, (t - lastFrame) / 1000) : 1; lastFrame = t;
    const follow = still || pose !== null || !disp ? 1 : 1 - Math.exp(-dts * 7.5);
    if (target.p) {
      if (!disp || Math.abs(target.p.x - disp.x) > window.innerWidth * 1.5) disp = { ...target.p, turns: target.turns, spins: target.spins };
      for (const key of ['x', 'y', 'len', 'ang']) disp[key] += (target.p[key] - disp[key]) * follow;
      disp.turns += (target.turns - disp.turns) * follow;
      disp.spins += (target.spins - disp.spins) * follow;
    }
    const p = target.p && disp, turns = disp ? disp.turns : 0, spins = disp ? disp.spins : 0;
    const mounted = 1 - clamp01(lift / 0.25);         // 1 while resting on the stand
    warmLight(mounted);
    // the hand-off into the photograph: tighten a clip to the photo frame, then crossfade with a soft glow
    const fade = noFade ? 0 : ease(clamp01((merge - 0.62) / 0.36));
    const clipT = ease(clamp01((merge - 0.35) / 0.45));
    if (photo) {
      if (clipT > 0) {
        const r = photo.getBoundingClientRect(), vw0 = window.innerWidth, vh0 = window.innerHeight;
        const ins = [r.top, vw0 - r.right, vh0 - r.bottom, r.left].map(v => Math.max(0, v) * clipT);
        cvs.style.clipPath = 'inset(' + ins.map(v => v.toFixed(1) + 'px').join(' ') + ' round ' + (3 * clipT).toFixed(1) + 'px)';
      } else if (lift < 0.004) cvs.style.clipPath = behindRim();
      else if (cvs.style.clipPath) cvs.style.clipPath = '';
      photoFrame.style.setProperty('--kk-glow', (Math.sin(Math.PI * clamp01((merge - 0.55) / 0.45))).toFixed(3));
    }
    if (fade !== lastFade) { cvs.style.opacity = shown ? String(1 - fade) : ''; lastFade = fade; }
    if (fade >= 1) { if (!wasOff) { renderer.clear(); wasOff = true; } return; }
    if (!p) return;
    const vh = window.innerHeight, vw = window.innerWidth;
    const off = p.y < -p.len * 0.7 || p.y > vh + p.len * 0.7 || p.x < -p.len || p.x > vw + p.len;
    if (off) { if (!wasOff) { renderer.clear(); wasOff = true; } return; }
    wasOff = false;

    const wpp = worldPerPx();
    const k = p.len * wpp / MODEL_LEN;
    holder.position.set((p.x - vw / 2) * wpp, -(p.y - vh / 2) * wpp, 0);
    holder.scale.setScalar(k);
    motes.scale.setScalar(k * 1.1);
    moteMat.uniforms.uScale.value = k;

    const lean = -THREE.MathUtils.degToRad(90 - p.ang);

    /* ---------- life: scroll speed, plucks, glint, trail ---------- */
    const dt = lastT ? Math.min(0.1, s - lastT) : 0.016; lastT = s;
    const sy = window.pageYOffset, rawVel = (sy - lastScroll) / Math.max(dt, 0.008); lastScroll = sy;
    vel += (Math.max(-3000, Math.min(3000, rawVel)) - vel) * Math.min(1, dt * 6);          // smoothed px/s
    const speed = Math.min(1, Math.abs(vel) / 1400);
    // a pluck every few seconds while still, and one each time it arrives somewhere new
    const stage = (lift > 0.97 ? 1 : 0) + (merge > 0.97 ? 2 : 0);   // which resting place it has reached
    if (stage !== lastStage && lastStage !== -1 && speed < 0.2) pluck = 1;
    if (speed < 0.05) lastStage = stage;
    if (s > nextPluck) { pluck = 1; nextPluck = s + 5 + Math.random() * 3; }
    pluck *= Math.exp(-dt * 1.6);
    if (!reduce) {
      const shimmer = pluck * (0.55 + 0.45 * Math.sin(s * 38));
      M.steel.emissiveIntensity = 0.9 * shimmer; M.bronze.emissiveIntensity = 0.7 * shimmer;
      for (const st of strings) {                        // the playing strings tremble as they ring
        const w = Math.sin(s * 55 + st.phase) * pluck * 0.09;
        st.m.position.set(st.base.x + w, st.base.y, st.base.z + w * 0.5);
      }
      // a warm glint gliding from the gourd up to the pegs and back
      const g = 0.5 - 0.5 * Math.cos(s * 0.55);
      glint.position.set(3 * Math.sin(s * 1.3), -0.6 + g * 1.28, 0.08);
      glint.intensity = (0.9 + 0.6 * pluck) * (1 - merge);
    }
    const flying = clamp01(speed * 1.4) * (1 - mounted) * (1 - merge);
    moteMat.uniforms.uBoost.value += (flying - moteMat.uniforms.uBoost.value) * Math.min(1, dt * 4);
    // the sparkles lag behind the sitar, so they stream out as a trail when it moves
    trail.x += (holder.position.x - trail.x) * Math.min(1, dt * 3);
    trail.y += (holder.position.y - trail.y) * Math.min(1, dt * 3);
    if (pose !== null) {
      spin.rotation.y = pose;
      tilt.rotation.set(upright ? 0 : 0.08, 0, upright ? 0 : lean);
    } else if (!reduce) {
      const calm = (1 - merge) * (1 - 0.75 * mounted);   // steady on its stand, face-on in the photograph
      const bank = Math.max(-1, Math.min(1, vel / 1600)) * calm;          // lean into the scroll
      // a slow showcase swing whenever it is away from the stand and the photo
      const show = (1 - mounted) * (1 - merge) * Math.sin(s * 0.21) * 0.55;
      const flightSpin = ease(spins % 1) + Math.floor(spins);           // one smooth full turn per flight
      // all the idle swings together stay within about +/-50 degrees, so it rests front-facing
      const sway = 0.9 * Math.tanh((Math.sin(s * 0.35) * 0.42 + Math.sin(s * 0.13) * 0.24 + cx * 0.55 + bank * 0.45 + show) / 0.9);
      spin.rotation.y = (0.15 + sway) * calm
                        + 0.12 * mounted + Math.sin(s * 0.6) * 0.06 * mounted * (1 - merge) + turns
                        + flightSpin * Math.PI * 2;                           // whole turns, so it lands face-on
      tilt.rotation.set((0.08 + cy * 0.18 + Math.sin(s * 0.42) * 0.08 + Math.sin(s * 0.17) * 0.05 + bank * 0.14) * calm, 0,
                        lean + (Math.sin(s * 0.5) * 0.05 + Math.sin(s * 0.23) * 0.03 - bank * 0.07) * calm);
      holder.position.y += (Math.sin(s * 0.9) * 0.016 + Math.sin(s * 2.3) * 0.004) * k * (1 - mounted);
      holder.position.x += Math.sin(s * 0.47) * 0.008 * k * (1 - mounted) * (1 - merge);
    } else {
      spin.rotation.y = 0.25;
      tilt.rotation.set(0.08, 0, lean);
    }
    motes.position.set(trail.x || holder.position.x, trail.y || holder.position.y, 0);
    moteMat.uniforms.uTime.value = s;
    renderer.render(scene, camera);
    if (!shown) {
      shown = true; cvs.classList.add('on');
      setTimeout(() => { cvs.style.transition = 'none'; }, 1000);   // after the fade-in, opacity follows the scroll directly
    }
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
