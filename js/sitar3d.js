/* =====================================================================
   Hero sitar — real-time 3D (three.js)
   A procedurally built concert sitar modelled on reference photographs:
   honey-toned tun wood, a deep gourd (kaddu) with a carved leaf collar
   and a bone braid inlay down the back, a dark soundboard (tabli) with
   carved paisleys and a bone checker border, the bone leaf at the neck
   joint, arched frets (parda), dark ball-headed pegs (khunti) — main,
   chikari and a row of tarab pegs — and the upper gourd (tumba) behind
   the peg box with its recessed round face.
   Lit to match the hero photograph: warm lantern key from the right,
   cool dusk-sky rim from behind-left, warm ground bounce.
   If WebGL is missing or software-only, the static <img> stays.
   Testing: ?force3d skips the GPU check; &pose=<yaw radians> holds a pose
   (and exposes window.__sitarDims, measured sizes in cm); &upright removes the lean.
   ===================================================================== */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

function init() {
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
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 0.74, 0.1, 50);
  camera.position.set(0, 0, 2.75);

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
  scene.add(new THREE.HemisphereLight(0x6a6478, 0x3a2210, 0.5));
  const key = new THREE.DirectionalLight(0xffb46b, 3.0); key.position.set(5, 2, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xff9c50, 0.4); fill.position.set(-3, -2, 5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xb4b6e0, 0.7); rim.position.set(-4, 4, -5); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffa860, 1.3); rim2.position.set(4, -1, -4); scene.add(rim2);

  /* ---------- profile of the main gourd (radius r, height y), in cm ---------- */
  const prof = new THREE.SplineCurve([
    [0, 0], [4, 0.5], [9, 2], [14, 5], [17.5, 10], [18.5, 15], [17.8, 20],
    [14.5, 26], [10, 31], [6.5, 35], [4.6, 38]
  ].map(p => new THREE.Vector2(p[0], p[1]))).getPoints(60);

  /* ---------- real-world dimensions (cm), Ravi Shankar-style concert sitar ----------
     overall ~121 cm, gourd ~35 cm wide x 34 cm tall x 26 cm deep,
     neck ~8.2 cm wide x 6.4 cm deep, scale (bridge to nut) 90 cm,
     peg box ~18 cm, upper gourd ~19 cm across, 20 frets, 7 playing + 13 tarab strings */
  const D = {
    GX: 0.95, GY: 0.89, GZ: 1.42,     // gourd profile -> 35 x 34 x 26 cm
    BRIDGE: 11, SCALE: 90,            // nut at 101
    NECK0: 31.5, NECK1: 119,          // neck from gourd joint to top of peg box
    NW: 8.2, ND: 6.4,                 // neck width / depth incl. fingerboard
    TR: 9.5                           // upper gourd radius
  };
  D.NUT = D.BRIDGE + D.SCALE;

  /* ---------- painted + carved textures ----------
     Each surface is drawn twice: once in colour over wood grain, once in
     grey as a bump map (raised carving, cut grooves, slightly proud bone). */
  const PAL = {
    color: { carve: '#3d1d0b', carveDeep: '#1c0b04', carveHi: 'rgba(214,150,84,.75)', bone: '#efe6d1', boneDot: '#5a4330', groove: 'rgba(30,14,4,.85)' },
    bump:  { carve: '#b8b8b8', carveDeep: '#b8b8b8', carveHi: '#d8d8d8', bone: '#c6c6c6', boneDot: '#9a9a9a', groove: '#404040' }
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
    return { map: tex(c, true), bump: tex(b, false) };
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

  function drawSoundboard(ctx, c, S) {
    const k = S / SB.size;
    ctx.save(); ctx.setTransform(k, 0, 0, -k, -SB.minX * k, S); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // bone border with a checker-diamond pattern
    ctx.beginPath(); addPath(ctx, outlinePts(0.99, 18)); addPath(ctx, outlinePts(0.9, 18));
    ctx.fillStyle = c.bone; ctx.fill('evenodd');
    ctx.fillStyle = c.boneDot;
    walk(outlinePts(0.945, 18), 0.62, (x, y, a) => diamond(ctx, x, y, 0.26, a + Math.PI / 2));
    ctx.strokeStyle = c.bone; ctx.lineWidth = 0.16;
    ctx.beginPath(); addPath(ctx, outlinePts(0.86, 18)); ctx.stroke();

    // carved paisleys either side of the bridge
    for (const s of [1, -1]) {
      ctx.save(); ctx.scale(s, 1);
      const paisley = () => {
        ctx.beginPath();
        ctx.moveTo(8.4, 25.2);
        ctx.bezierCurveTo(14.6, 22.5, 15.6, 11, 11.6, 6);
        ctx.bezierCurveTo(8.6, 2.6, 4.8, 5, 5.9, 9);
        ctx.bezierCurveTo(6.7, 11.8, 9.3, 12.4, 9.9, 15.4);
        ctx.bezierCurveTo(10.4, 18.6, 8.2, 21.6, 8.4, 25.2);
        ctx.closePath();
      };
      paisley(); ctx.fillStyle = c.carveDeep; ctx.fill();
      ctx.save(); paisley(); ctx.clip();
      ctx.strokeStyle = c.carveHi; ctx.globalAlpha = 0.4; ctx.lineWidth = 0.07;
      for (let i = -30; i < 30; i++) { ctx.beginPath(); ctx.moveTo(i * 0.55, 0); ctx.lineTo(i * 0.55 + 14, 28); ctx.stroke(); }
      ctx.restore();
      paisley(); ctx.strokeStyle = c.carveHi; ctx.lineWidth = 0.16; ctx.stroke();
      // inner lobes / leaves
      ctx.lineWidth = 0.11;
      [[12.2, 8.6, 0.6], [13.2, 12.2, 0.15], [13.0, 16, -0.25], [11.8, 19.6, -0.6], [10.2, 22.6, -0.9]].forEach(l => {
        ctx.save(); ctx.translate(l[0], l[1]); ctx.rotate(l[2]);
        ctx.beginPath(); ctx.ellipse(0, 0, 0.75, 1.6, 0, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -1.4); ctx.lineTo(0, 1.4); ctx.stroke();
        ctx.restore();
      });
      // curl in the paisley head
      ctx.beginPath();
      for (let t = 0; t <= Math.PI * 3.4; t += 0.08) {
        const r = 1.9 * (1 - t / (Math.PI * 3.8));
        const x = 8.4 + Math.cos(t + 2.4) * r, y = 8.2 + Math.sin(t + 2.4) * r;
        t ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.lineWidth = 0.16; ctx.stroke();
      // tendril rising from the tip
      ctx.strokeStyle = c.carve; ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.moveTo(8.4, 25.2); ctx.bezierCurveTo(8, 27.5, 9.8, 28.5, 10.4, 27); ctx.stroke();
      // small bone curl above the bridge
      ctx.strokeStyle = c.bone; ctx.lineWidth = 0.32;
      ctx.beginPath();
      for (let t = 0; t <= Math.PI * 2.6; t += 0.1) {
        const r = 0.9 * (1 - t / (Math.PI * 3));
        const x = 4.4 + Math.cos(t) * r, y = 19.6 + Math.sin(t) * r;
        t ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5.3, 19.6); ctx.quadraticCurveTo(6.4, 21.4, 5.2, 23.2); ctx.stroke();
      ctx.restore();
    }

    // bone leaf (gulu inlay) where the neck meets the soundboard
    ctx.fillStyle = c.bone;
    ctx.beginPath(); ctx.moveTo(0, 24.2);
    ctx.bezierCurveTo(-3.6, 26.8, -6.8, 30.2, -4.9, 38.8); ctx.lineTo(4.9, 38.8);
    ctx.bezierCurveTo(6.8, 30.2, 3.6, 26.8, 0, 24.2); ctx.fill();
    ctx.strokeStyle = c.groove; ctx.lineWidth = 0.13;
    ctx.beginPath(); ctx.moveTo(0, 25.6);
    ctx.bezierCurveTo(-2.9, 27.8, -5.4, 30.6, -4.0, 38.6);
    ctx.moveTo(0, 25.6); ctx.bezierCurveTo(2.9, 27.8, 5.4, 30.6, 4.0, 38.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 27.4); ctx.bezierCurveTo(-1.8, 29.6, -1.6, 32.4, 0, 33.8);
    ctx.bezierCurveTo(1.6, 32.4, 1.8, 29.6, 0, 27.4); ctx.stroke();
    ctx.fillStyle = c.groove;
    [[0, 35.4], [-2.3, 34.6], [2.3, 34.6], [0, 30.4]].forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 0.32, 0, 7); ctx.fill(); });

    // two bone diamonds below the bridge
    ctx.fillStyle = c.bone;
    diamond(ctx, -1.25, 6.4, 0.95); diamond(ctx, 1.25, 6.4, 0.95);
    ctx.restore();
  }

  /* gourds, drawn in a unit square: u around, v from the bottom (0) to the neck (1) */
  function drawGourd(ctx, c, S, opt) {
    ctx.save(); ctx.setTransform(S, 0, 0, -S, 0, S); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const leafRow = (n, top, tip, hw, off) => {
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5 + off) / n;
        ctx.beginPath(); ctx.moveTo(u - hw, top);
        ctx.bezierCurveTo(u - hw * 1.35, top - (top - tip) * 0.5, u - hw * 0.8, tip + (top - tip) * 0.08, u, tip);
        ctx.bezierCurveTo(u + hw * 0.8, tip + (top - tip) * 0.08, u + hw * 1.35, top - (top - tip) * 0.5, u + hw, top);
        ctx.closePath();
        ctx.fillStyle = c.carve; ctx.fill();
        ctx.strokeStyle = c.carveHi; ctx.lineWidth = 0.003; ctx.stroke();
        ctx.strokeStyle = c.groove; ctx.lineWidth = 0.0035;
        ctx.beginPath(); ctx.moveTo(u, top); ctx.lineTo(u, tip + 0.02); ctx.stroke();
        for (let j = 1; j <= 3; j++) {
          const y = top - (top - tip) * j / 4.2, w = hw * (1 - j / 4.6);
          ctx.beginPath(); ctx.moveTo(u, y + 0.012); ctx.lineTo(u - w * 0.8, y + 0.03); ctx.moveTo(u, y + 0.012); ctx.lineTo(u + w * 0.8, y + 0.03); ctx.stroke();
        }
      }
    };
    leafRow(opt.leaves, 1.0, opt.leafTip + 0.06, 0.72 / opt.leaves, 0.5);
    leafRow(opt.leaves, 1.0, opt.leafTip, 0.8 / opt.leaves, 0);
    // bone gasket line under the collar
    ctx.strokeStyle = c.bone; ctx.lineWidth = 0.006;
    ctx.beginPath(); ctx.moveTo(0, opt.leafTip - 0.025); ctx.lineTo(1, opt.leafTip - 0.025); ctx.stroke();
    if (opt.braid) {
      // braided bone inlay down the back
      ctx.lineWidth = 0.0065;
      for (const ph of [0, Math.PI]) {
        ctx.beginPath();
        for (let v = 0.06; v <= opt.leafTip - 0.04; v += 0.004) {
          const x = 0.5 + Math.sin(v * Math.PI * 2 * 6 + ph) * 0.03;
          v > 0.06 ? ctx.lineTo(x, v) : ctx.moveTo(x, v);
        }
        ctx.stroke();
      }
      ctx.lineWidth = 0.003;
      ctx.beginPath(); ctx.moveTo(0.455, 0.06); ctx.lineTo(0.455, opt.leafTip - 0.04);
      ctx.moveTo(0.545, 0.06); ctx.lineTo(0.545, opt.leafTip - 0.04); ctx.stroke();
      ctx.fillStyle = c.bone;
      for (let v = 0.06 + 1 / 24; v < opt.leafTip - 0.05; v += 1 / 12) diamond(ctx, 0.5, v, 0.012);
    }
    if (opt.ring) {
      ctx.strokeStyle = c.bone; ctx.lineWidth = 0.008;
      ctx.beginPath(); ctx.moveTo(0, opt.ring); ctx.lineTo(1, opt.ring); ctx.stroke();
    }
    ctx.restore();
  }

  function drawFingerboard(ctx, c, W, H) {
    // bone strips with a dark diamond chain along both edges
    ctx.fillStyle = c.bone; ctx.fillRect(0, 0, 15, H); ctx.fillRect(W - 15, 0, 15, H);
    ctx.fillStyle = c.boneDot;
    for (let y = 6; y < H; y += 13) { diamond(ctx, 7.5, y, 4.5); diamond(ctx, W - 7.5, y, 4.5); }
    // bone frame on the peg box (top of the board, above the nut)
    const nutY = Math.round(H * (1 - (D.NUT - D.NECK0) / (D.NECK1 - D.NECK0)));
    ctx.strokeStyle = c.bone; ctx.lineWidth = 7;
    ctx.strokeRect(22, 10, W - 44, nutY - 22);
    ctx.fillStyle = c.bone; diamond(ctx, W / 2, nutY * 0.5, 14);
  }

  function drawNeckBack(ctx, c, W, H) {
    // braided bone inlay rising from the gourd up the back of the neck
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = c.bone; ctx.lineWidth = 3;
    const y0 = H, y1 = H * 0.66;
    for (const ph of [0, Math.PI]) {
      ctx.beginPath();
      for (let y = y0; y >= y1; y -= 3) {
        const x = W / 2 + Math.sin((y0 - y) / 46 + ph) * 14;
        y === y0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = c.bone;
    for (let y = y0 - 46 * Math.PI / 2; y > y1; y -= 46 * Math.PI) diamond(ctx, W / 2, y, 5);
    ctx.beginPath(); ctx.moveTo(W / 2, y1 - 4); ctx.lineTo(W / 2 + 10, y1 - 28); ctx.lineTo(W / 2, y1 - 52); ctx.lineTo(W / 2 - 10, y1 - 28); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  const HONEY = '#8c5c2a', DARKBOARD = '#4d2c15';
  const sbTex = carved(1024, 1024, DARKBOARD, true, (x, c) => drawSoundboard(x, c, 1024));
  const gourdTex = carved(1024, 1024, HONEY, false, (x, c) => drawGourd(x, c, 1024, { leaves: 9, leafTip: 0.72, braid: true }));
  const tumbaTex = carved(1024, 1024, HONEY, false, (x, c) => drawGourd(x, c, 1024, { leaves: 14, leafTip: 0.8, ring: 0.2 }));
  const fbTex = carved(128, 2048, '#5e3718', true, (x, c) => drawFingerboard(x, c, 128, 2048));
  const neckTex = carved(256, 2048, HONEY, true, (x, c) => drawNeckBack(x, c, 256, 2048));

  /* ---------- materials ---------- */
  const lacquer = (t, extra) => new THREE.MeshPhysicalMaterial(Object.assign({
    map: t.map, bumpMap: t.bump, bumpScale: 1.4, roughness: 0.4,
    clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.0
  }, extra || {}));
  const M = {
    board: lacquer(sbTex),
    gourd: lacquer(gourdTex, { side: THREE.DoubleSide }),
    tumba: lacquer(tumbaTex),
    finger: lacquer(fbTex),
    neck: lacquer(neckTex, { side: THREE.DoubleSide }),
    peg: new THREE.MeshPhysicalMaterial({ color: 0x3a1a0b, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.18, envMapIntensity: 1 }),
    fret: new THREE.MeshStandardMaterial({ color: 0xdcc497, metalness: 1, roughness: 0.25, envMapIntensity: 1.5 }),
    bone: new THREE.MeshPhysicalMaterial({ color: 0xf0e8d6, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.35, envMapIntensity: 0.8 }),
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
      add(new THREE.TubeGeometry(curve, 90, 0.42, 8, false), M.bone, null, null, front);
    }
  }

  /* neck (dand): deep D-shaped back + flat fingerboard with bone edges, into the peg box */
  {
    const len = NECK1 - NECK0, cy = (NECK0 + NECK1) / 2;
    const back = add(new THREE.CylinderGeometry(HW, HW, len, 32, 1, true, Math.PI / 2, Math.PI), M.neck, [0, cy, 0]);
    back.scale.z = BACK / HW;
    add(new THREE.BoxGeometry(NW, len, 0.6), [M.bone, M.bone, M.bone, M.bone, M.finger, M.finger], [0, cy, 0.3]);
    add(new THREE.BoxGeometry(NW + 0.2, 1.2, ND + 0.2), M.bone, [0, NECK1 + 0.6, 0.6 - ND / 2]); // bone cap on the peg box
  }

  /* nut (meru) + bridges + tail knob; main bridge ~6 x 2.5 cm, 2.5 cm tall */
  add(new THREE.BoxGeometry(NW, 0.9, 1.6), M.bone, [0, NUT, 1.4]);
  add(new THREE.BoxGeometry(6, 2.5, 2.5), M.bone, [0, BRIDGE, 1.3]);         // main bridge (badi goraj)
  add(new THREE.BoxGeometry(3.6, 0.8, 1.4), M.bone, [0, BRIDGE + 4.5, 0.72]); // tarab bridge (chhoti goraj)
  add(new THREE.CylinderGeometry(0.9, 1.1, 1.6, 16), M.bone, [0, -0.2, 0.7], [Math.PI / 2, 0, 0]);

  /* 20 arched frets (Ravi Shankar style, main string tuned to Ma): Pa first,
     up two octaves so the highest fret sits at the gourd joint */
  [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23, 24].forEach(n => {
    const y = NUT - SCALE * (1 - Math.pow(2, -n / 12));
    const curve = new THREE.QuadraticBezierCurve3(V(-HW - 0.1, y, 0.6), V(0, y, 3.3), V(HW + 0.1, y, 0.6));
    add(new THREE.TubeGeometry(curve, 24, 0.13, 6, false), M.fret);
  });

  /* dark ball-headed pegs (khunti), lightly fluted; ~9 cm, tarab pegs ~4-5 cm */
  const pegGeo = new THREE.LatheGeometry([
    [0, 0], [0.4, 0], [0.42, 3.0], [0.62, 3.2], [0.62, 3.7], [0.45, 4.0], [0.55, 4.4], [1.05, 5.0],
    [1.32, 5.9], [1.32, 6.8], [1.05, 7.6], [0.55, 8.1], [0.35, 8.3], [0.42, 8.6], [0, 8.9]
  ].map(p => new THREE.Vector2(p[0], p[1])), 36);
  {
    const p = pegGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y > 4.9 && y < 7.8) {
        const x = p.getX(i), z = p.getZ(i), f = 1 + 0.06 * Math.cos(12 * Math.atan2(x, z));
        p.setX(i, x * f); p.setZ(i, z * f);
      }
    }
    pegGeo.computeVertexNormals();
  }
  const MIDZ = 0.6 - ND / 2;                     // halfway through the neck's depth
  const peg = (side, y, s, z) => {
    const m = add(pegGeo, M.peg,
      side === 0 ? [0, y, 0.55] : [side * (HW - 0.25), y, z === undefined ? MIDZ : z],
      side === 0 ? [Math.PI / 2, 0, 0] : [0, 0, -side * Math.PI / 2]);
    m.scale.setScalar(s || 1);
    return m;
  };
  // peg box: four main pegs, two through the face and two on the left side
  const headPegs = [[0, NUT + 5], [0, NUT + 12.5], [-1, NUT + 3], [-1, NUT + 9.5]];
  headPegs.forEach(p => peg(p[0], p[1]));
  // three side pegs below the nut on the right: the 5th main string + two chikari
  const sidePegs = [NUT - 3, NUT - 8.5, NUT - 14];
  sidePegs.forEach(y => peg(1, y, 0.8));
  // 13 tarab pegs down the right side, growing toward the head
  const tarabY = Array.from({ length: 13 }, (_, k) => NUT - 55 + k * 3.2);
  tarabY.forEach((y, k) => peg(1, y, 0.45 + k * 0.012, MIDZ + (k % 2 ? 0.8 : -0.8)));

  /* upper gourd (tumba) behind the peg box, recessed round face at the back */
  {
    const R = D.TR, SQ = 0.75, FR = R * 0.6, TY = NUT + 9;
    const STEM = 2.6, TZ = -BACK - STEM - R * SQ;
    const cut = Math.asin(FR / R);
    const tm = add(new THREE.SphereGeometry(R, 56, 36, 0, Math.PI * 2, 0, Math.PI - cut), M.tumba, [0, TY, TZ], [Math.PI / 2, 0, 0]);
    tm.scale.set(1, SQ, 1);
    add(new THREE.CylinderGeometry(1.5, 2.0, STEM + 1.2, 20), M.peg, [0, TY, -BACK - STEM / 2], [Math.PI / 2, 0, 0]);
    const faceZ = TZ - R * SQ * Math.cos(cut);
    add(new THREE.CircleGeometry(FR, 48), new THREE.MeshStandardMaterial({ map: tumbaTex.map, color: 0x9a7a60, roughness: 0.7 }), [0, TY, faceZ + 0.6], [0, Math.PI, 0]);
    add(new THREE.TorusGeometry(FR, 0.55, 12, 56), M.tumba, [0, TY, faceZ]);
  }

  /* strings: 7 playing strings + 13 tarab */
  const zAt = 2.75;
  const tail = x => V(x * 0.35, 0.3, 1.2);
  const bx = i => -1.8 + 0.6 * i;                // spacing on the main bridge
  // four main strings: bridge -> nut -> into the peg box
  headPegs.forEach((p, j) => {
    const nx = -1.35 + 0.6 * j;
    const end = p[0] === 0 ? V(0, p[1] - 1.3, 0.7) : V(p[0] * (HW - 1), p[1], 0.65);
    wire([tail(bx(j)), V(bx(j), BRIDGE, zAt), V(nx, NUT, 2.22), end], j === 0 ? 0.075 : 0.065, j < 2 ? M.steel : M.bronze);
  });
  // 5th string + chikari: bridge -> bone post -> side peg
  sidePegs.forEach((y, i) => {
    const x = bx(4 + i), px = HW - 0.5;
    add(new THREE.CylinderGeometry(0.28, 0.32, 1.8, 10), M.bone, [px, y - 2.2, 1.4], [Math.PI / 2, 0, 0]);
    wire([tail(x), V(x, BRIDGE, zAt), V(px, y - 2.2, 2.3), V(HW, y, 0.3)], i === 0 ? 0.065 : 0.055, i === 0 ? M.bronze : M.steel);
  });
  // tarab: from their bridge, under the frets, to small bone eyelets on the right edge
  tarabY.forEach((y, k) => {
    const x0 = -1.5 + 0.25 * k, ex = HW - 0.7;
    add(new THREE.SphereGeometry(0.24, 10, 8), M.bone, [ex, y, 0.68]);
    wire([V(x0 * 0.5, 2, 1.0), V(x0, BRIDGE + 4.5, 1.45), V(ex, y, 0.75)], 0.04, M.bronze);
  });

  // test mode: report measured sizes (cm) so proportions can be checked against a real sitar
  if (pose !== null) {
    const size = o => { const v = new THREE.Box3().setFromObject(o).getSize(V(0, 0, 0)); return [v.x, v.y, v.z].map(n => +n.toFixed(1)); };
    window.__sitarDims = { overall: size(inst), gourd: size(gourdGroup), scale: SCALE, nut: NUT, neck: [NW, ND], tumbaDiameter: 2 * D.TR };
  }

  /* ---------- assemble: tilt (in-plane lean) -> spin (around its own length) ---------- */
  inst.scale.setScalar(0.01);
  inst.position.y = -0.6;
  const spin = new THREE.Group(); spin.add(inst);
  const tilt = new THREE.Group(); tilt.add(spin); scene.add(tilt);
  tilt.rotation.set(0.08, 0, -0.46);

  /* ---------- lantern motes ---------- */
  const N = 90, mp = new Float32Array(N * 3), ms = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    mp[i * 3] = (rnd() - 0.5) * 1.3; mp[i * 3 + 1] = (rnd() - 0.5) * 1.8; mp[i * 3 + 2] = rnd() * 0.7 - 0.3;
    ms[i] = rnd();
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  mg.setAttribute('aSeed', new THREE.BufferAttribute(ms, 1));
  const moteMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSeed; uniform float uTime; uniform float uPR; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + 0.9 + uTime * (0.02 + aSeed * 0.03), 1.8) - 0.9;
        p.x += sin(uTime * 0.6 + aSeed * 20.0) * 0.03;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float tw = 0.5 + 0.5 * sin(uTime * (1.4 + aSeed * 2.0) + aSeed * 30.0);
        vA = tw * (1.0 - smoothstep(0.55, 0.9, abs(p.y)));
        gl_PointSize = (2.0 + aSeed * 3.5) * uPR * (3.6 / -mv.z);
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

  /* ---------- mount ---------- */
  let visible = true, raf = 0, shown = false, still = pose !== null;
  let last = 0, frames = 0, slowMs = 0, tier = 0;
  const cvs = renderer.domElement;
  cvs.className = 'hero-sitar-3d';
  cvs.setAttribute('role', 'img');
  cvs.setAttribute('aria-label', 'Ornate carved sitar, rendered in 3D');
  wrap.classList.add('is-3d');
  wrap.appendChild(cvs);
  // if the GPU drops the context, fall back to the static image
  cvs.addEventListener('webglcontextlost', e => {
    e.preventDefault(); still = true;
    if (raf) cancelAnimationFrame(raf);
    wrap.classList.remove('is-3d'); cvs.remove();
  });

  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (reduce || still) render(performance.now());
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap); else window.addEventListener('resize', resize);

  /* ---------- motion ---------- */
  let mx = 0, my = 0, cx = 0, cy = 0;
  window.addEventListener('mousemove', e => {
    mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  function render(t) {
    const s = t / 1000;
    cx += (mx - cx) * 0.05; cy += (my - cy) * 0.05;
    const scrollK = Math.min(window.pageYOffset / window.innerHeight, 1);
    if (pose !== null) {
      spin.rotation.y = pose;
      if (upright) tilt.rotation.set(0, 0, 0);
    } else if (!reduce) {
      spin.rotation.y = 0.45 + Math.sin(s * 0.35) * 0.5 + cx * 0.6 + scrollK * 0.8;
      tilt.rotation.x = 0.08 + cy * 0.18;
      tilt.rotation.z = -0.46 + Math.sin(s * 0.5) * 0.025;
      tilt.position.y = Math.sin(s * 0.9) * 0.03;
    } else {
      spin.rotation.y = 0.35;
    }
    moteMat.uniforms.uTime.value = s;
    renderer.render(scene, camera);
  }

  // Adaptive quality: on a slow GPU drop to 1× resolution, and if that is
  // still slow, hold a still frame instead of a stuttering animation.
  function loop(t) {
    raf = 0;
    if (last) {
      const dt = t - last;
      if (frames > 5 && frames < 70) slowMs += dt;
      if (frames === 69 && slowMs / 64 > 45) {
        if (tier === 0 && renderer.getPixelRatio() > 1) {
          tier = 1; renderer.setPixelRatio(1); moteMat.uniforms.uPR.value = 1; resize();
          frames = 0; slowMs = 0;
        } else { still = true; }
      }
    }
    last = t; frames++;
    render(t);
    if (!shown) { shown = true; cvs.classList.add('on'); }
    if (visible && !reduce && !still) raf = requestAnimationFrame(loop);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      if (visible && !raf && !reduce && !still) { last = 0; raf = requestAnimationFrame(loop); }
    }).observe(hero);
  }
  resize();
  raf = requestAnimationFrame(loop);
}

init();
