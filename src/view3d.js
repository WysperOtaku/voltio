/* Voltio · vista 3D del montaje (three.js r128, cargado bajo demanda) */
const View3D = (() => {
  let loading = null;
  function loadThree() {
    if (window.THREE) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.onload = res; s.onerror = () => { loading = null; rej(); };
      document.head.appendChild(s);
    });
    return loading;
  }

  async function create(holder, ctx) {
    await loadThree();
    const T = window.THREE;
    const { model, terms, cfg, pinHoles, hx, ROWY, BOARD, LEDC, BANDHEX, bands } = ctx;
    holder.innerHTML = '';
    const w = holder.clientWidth || 360, h = Math.round(Math.min(520, Math.max(320, w * 0.95)));
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h);
    holder.appendChild(renderer.domElement);
    const hint = document.createElement('p'); hint.className = 'small three-hint'; hint.textContent = 'Arrastra para girar · pellizca para acercar'; holder.appendChild(hint);
    const scene = new T.Scene();
    const cam = new T.PerspectiveCamera(42, w / h, 0.1, 500);
    scene.add(new T.HemisphereLight(0xffffff, 0x445066, 0.85));
    const sun = new T.DirectionalLight(0xffffff, 0.75); sun.position.set(-20, 40, 25); scene.add(sun);

    const S = 0.1; // unidades SVG → 3D
    const X = x => x * S, Z = y => y * S;
    const cx = X(BOARD.x + BOARD.w / 2), cz = Z(cfg.arduino && !(ctx.board && ctx.board.onboard) ? 60 : 180);
    const mat = (c, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.05, ...o });
    const box = (wd, ht, dp, m) => new T.Mesh(new T.BoxGeometry(wd, ht, dp), m);
    const cyl = (r, l, m, seg = 20) => new T.Mesh(new T.CylinderGeometry(r, r, l, seg), m);

    // Protoboard con textura de agujeros
    const cv = document.createElement('canvas'); const K = 4; cv.width = BOARD.w * K; cv.height = BOARD.h * K;
    const g = cv.getContext('2d'); g.fillStyle = '#F3F1EC'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#DAD6CC'; g.fillRect(6 * K, (176 - BOARD.y) * K, (BOARD.w - 12) * K, 12 * K);
    g.fillStyle = '#E5484D'; g.fillRect(20 * K, (12 - BOARD.y) * K, (BOARD.w - 40) * K, 2 * K); g.fillRect(20 * K, (352 - BOARD.y) * K - 2 * K, (BOARD.w - 40) * K, 2 * K);
    g.fillStyle = '#3E8FCB'; g.fillRect(20 * K, (52 - BOARD.y) * K, (BOARD.w - 40) * K, 2 * K); g.fillRect(20 * K, (312 - BOARD.y) * K, (BOARD.w - 40) * K, 2 * K);
    g.fillStyle = '#3A3A3A';
    for (const y of ROWY) for (let c = 0; c < 24; c++) g.fillRect((hx(c) - BOARD.x - 3) * K, (y - BOARD.y - 3) * K, 6 * K, 6 * K);
    const tex = new T.CanvasTexture(cv);
    const bmats = [mat(0xE9E6DE), mat(0xE9E6DE), mat(0xffffff, { map: tex }), mat(0xE9E6DE), mat(0xE9E6DE), mat(0xE9E6DE)];
    const board = new T.Mesh(new T.BoxGeometry(X(BOARD.w), 1, Z(BOARD.h)), bmats);
    board.position.set(X(BOARD.x + BOARD.w / 2), 0.5, Z(BOARD.y + BOARD.h / 2)); scene.add(board);
    const TOP = 1;

    const leg = (x, z, y2) => { const m = cyl(0.06, y2 - TOP + 0.2, mat(0xB8BEC8, { metalness: 0.7, roughness: 0.3 }), 6); m.position.set(x, (y2 + TOP) / 2, z); scene.add(m); };
    const live = {};

    for (const c of model.comps) {
      const hs = pinHoles(c).map(([a, b]) => ({ x: X(hx(a)), z: Z(ROWY[b]) }));
      const a = hs[0], b = hs[hs.length - 1], mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
      const ang = Math.atan2(b.z - a.z, b.x - a.x), len = Math.hypot(b.x - a.x, b.z - a.z);
      const grp = new T.Group(); grp.position.set(mx, 0, mz); grp.rotation.y = -ang; scene.add(grp);
      const H = 1.9;
      switch (c.type) {
        case 'res': {
          const body = cyl(0.42, 3.4, mat(c.burnt ? 0x3a2a1a : 0xE7D3A8), 16); body.rotation.z = Math.PI / 2; body.position.y = H; grp.add(body);
          bands(c.val).concat([-1]).forEach((d, i) => { const r = cyl(0.44, 0.3, mat(d < 0 ? 0xC9A227 : new T.Color(BANDHEX[d])), 16); r.rotation.z = Math.PI / 2; r.position.set(-1.1 + i * 0.6 + (d < 0 ? 0.6 : 0), H, 0); grp.add(r); });
          hs.forEach(p => leg(p.x, p.z, H)); break;
        }
        case 'led': {
          const col = new T.Color(LEDC[c.color].hex);
          const m = mat(col, { transparent: true, opacity: 0.85, emissive: col, emissiveIntensity: 0 });
          const body = cyl(0.55, 1.2, m); body.position.y = 2.4; grp.add(body);
          const dome = new T.Mesh(new T.SphereGeometry(0.55, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.position.y = 3; grp.add(dome);
          const rim = cyl(0.65, 0.18, m); rim.position.y = 1.85; grp.add(rim);
          const light = new T.PointLight(col, 0, 8); light.position.y = 3; grp.add(light);
          live[c.id] = { m, light };
          hs.forEach(p => leg(p.x, p.z, 1.9)); break;
        }
        case 'push': { const bx = box(len + 1.2, 0.8, 1.6, mat(0x222222)); bx.position.y = 1.4; grp.add(bx); const k = cyl(0.45, 0.6, mat(0x555555)); k.position.y = 2.1; grp.add(k); live[c.id] = { k }; break; }
        case 'sw': { const bx = box(len + 0.8, 0.9, 1.2, mat(0x2B5DA8)); bx.position.y = 1.45; grp.add(bx); const k = box(0.6, 0.6, 0.6, mat(0x111111)); k.position.set(c.on ? 0.4 : -0.4, 2.1, 0); grp.add(k); break; }
        case 'cap': { const body = cyl(0.7, 2, mat(0x1F4E9C), 20); body.position.y = 2.1; grp.add(body); const st = box(0.25, 2.02, 0.5, mat(0xDDDDDD)); st.position.set(0.55, 2.1, 0); grp.add(st); hs.forEach(p => leg(p.x, p.z, 1.1)); break; }
        case 'diode': case 'zener': { const body = cyl(0.28, 2.4, mat(c.type === 'zener' ? 0xC24A2A : 0xE88A5A, { transparent: true, opacity: 0.9 }), 12); body.rotation.z = Math.PI / 2; body.position.y = H; grp.add(body); const bd = cyl(0.3, 0.3, mat(0x111111), 12); bd.rotation.z = Math.PI / 2; bd.position.set(0.9, H, 0); grp.add(bd); hs.forEach(p => leg(p.x, p.z, H)); break; }
        case 'pot': { const bx = box(len + 1.4, 1, 2.8, mat(0x1E5FB4)); bx.position.y = 1.5; grp.add(bx); const k = cyl(0.8, 1.2, mat(0xEEEEEE)); k.position.y = 2.6; grp.add(k); break; }
        case 'ldr': { const d = cyl(0.9, 0.3, mat(0xD8A94A), 24); d.position.y = 2; grp.add(d); hs.forEach(p => leg(p.x, p.z, 2)); break; }
        case 'npn': { const body = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 1.8, 24, 1, false, 0, Math.PI), mat(0x1c1c1c)); body.position.y = 2.2; body.rotation.y = Math.PI / 2; grp.add(body); hs.forEach(p => leg(p.x, p.z, 1.4)); break; }
        case 'cmp': { const bx = box(len + 1.2, 0.8, 1.4, mat(0x1c1c1c)); bx.position.y = 1.4; grp.add(bx); break; }
        case 'ic555': case 'ic7400': { const n = ctx.PARTS[c.type].dip; const w = (n / 2 - 1) * 2 + 1.6; const bx = box(w, 0.9, 3.2, mat(0x1c1c1c)); bx.position.set(0, 1.5, 0); grp.rotation.y = 0; grp.position.set(X(hx(c.at[0])) + (n / 2 - 1), 0, Z((ROWY[6] + ROWY[7]) / 2)); grp.add(bx); break; }
        case 'motor': { const body = cyl(1.4, 2.6, mat(0xB0B6BE, { metalness: 0.6, roughness: 0.35 })); body.rotation.z = Math.PI / 2; body.position.y = 2.6; grp.add(body); const sh = cyl(0.15, 1.2, mat(0xdddddd)); sh.rotation.z = Math.PI / 2; sh.position.set(1.9, 2.6, 0); grp.add(sh); live[c.id] = { sh }; break; }
      }
    }
    // Cables
    for (const w of model.wires) {
      const pa = ctx.pos(w.a), pb = ctx.pos(w.b); if (!pa || !pb) continue;
      const ya = w.a.startsWith('h:') ? TOP : (w.a.startsWith('ard') ? 1.6 : 2.4), yb = w.b.startsWith('h:') ? TOP : (w.b.startsWith('ard') ? 1.6 : 2.4);
      const A = new T.Vector3(X(pa.x), ya, Z(pa.y)), B = new T.Vector3(X(pb.x), yb, Z(pb.y));
      const d = A.distanceTo(B), M = A.clone().add(B).multiplyScalar(0.5); M.y = Math.max(ya, yb) + Math.min(6, 1 + d * 0.25);
      const curve = new T.CatmullRomCurve3([A, new T.Vector3(A.x, A.y + 0.8, A.z), M, new T.Vector3(B.x, B.y + 0.8, B.z), B]);
      scene.add(new T.Mesh(new T.TubeGeometry(curve, 40, 0.13, 6, false), mat(new T.Color(w.color), { roughness: 0.4 })));
    }
    // Pila
    if (cfg.battery) {
      const b = box(X(88), 4.6, Z(140), mat(0x1d1f24)); b.position.set(X(-52), 2.3, Z(202)); scene.add(b);
      const lab = box(X(88) + 0.02, 1.6, Z(60), mat(0xF2A900)); lab.position.set(X(-52), 2.6, Z(225)); scene.add(lab);
      [['bat+', 0xE5484D], ['bat-', 0x2b2b2b]].forEach(([id, col]) => { const t = terms[id]; const m = cyl(0.55, 0.8, mat(col, { metalness: 0.4 })); m.position.set(X(t.x), 2.4, Z(t.y)); scene.add(m); });
    }
    // Placa Arduino
    if (ctx.board && ctx.board.onboard) {
      const B = ctx.board, x1 = hx(B.c0) - 14, x2 = hx(B.c0 + 14) + 14, y1 = ROWY[B.rows[0]] - 16, y2 = ROWY[B.rows[1]] + 16;
      const pcb = box(X(x2 - x1), 0.3, Z(y2 - y1), mat(new T.Color(B.color))); pcb.position.set(X((x1 + x2) / 2), 2.2, Z((y1 + y2) / 2)); scene.add(pcb);
      const chip = box(B.mcu === 'avr' ? 3 : 8, 0.5, B.mcu === 'avr' ? 3 : 5, mat(B.mcu === 'avr' ? 0x1c1c1c : 0xBFC4C9, { metalness: B.mcu === 'avr' ? 0 : 0.7 })); chip.position.set(X(B.mcu === 'avr' ? (x1 + x2) / 2 : x2 - 50), 2.6, Z((y1 + y2) / 2)); scene.add(chip);
      const usb = box(2, 1, 2.4, mat(0xBFC4C9, { metalness: 0.8 })); usb.position.set(X(x1) - 0.4, 2.6, Z((y1 + y2) / 2)); scene.add(usb);
    } else if (cfg.arduino) {
      const ax = 70, ay = -250;
      const pcb = box(X(380), 0.3, Z(226), mat(0x0E7C86)); pcb.position.set(X(ax + 190), 1.2, Z(ay + 113)); scene.add(pcb);
      const usb = box(X(44), 1.6, Z(54), mat(0xBFC4C9, { metalness: 0.8, roughness: 0.3 })); usb.position.set(X(ax + 8), 2.1, Z(ay + 67)); scene.add(usb);
      const jack = box(X(40), 1.6, Z(46), mat(0x111111)); jack.position.set(X(ax + 10), 2.1, Z(ay + 163)); scene.add(jack);
      const chip = box(X(150), 0.5, Z(36), mat(0x1c1c1c)); chip.position.set(X(ax + 235), 1.6, Z(ay + 114)); scene.add(chip);
      const h1 = box(X(300), 1, Z(20), mat(0x111111)); h1.position.set(X(ax + 200), 1.85, Z(ay + 196)); scene.add(h1);
      const h2 = box(X(210), 1, Z(20), mat(0x111111)); h2.position.set(X(ax + 215), 1.85, Z(ay + 24)); scene.add(h2);
      const lm = mat(0xFFB000, { emissive: new T.Color(0xFFB000), emissiveIntensity: 0 });
      const l13 = box(0.5, 0.3, 0.35, lm); l13.position.set(X(ax + 98), 1.5, Z(ay + 160)); scene.add(l13);
      live._l13 = lm;
    }

    // Cámara orbital
    let theta = -0.5, phi = 0.95, radius = cfg.arduino && !(ctx.board && ctx.board.onboard) ? 70 : 55;
    const target = new T.Vector3(cx, 0, cz);
    function place() { cam.position.set(target.x + radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), target.z + radius * Math.sin(phi) * Math.cos(theta)); cam.lookAt(target); }
    place();
    const el = renderer.domElement; el.style.touchAction = 'none';
    const ptrs = new Map(); let lastDist = 0;
    el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
    el.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      const p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { theta -= dx * 0.008; phi = Math.max(0.15, Math.min(1.45, phi - dy * 0.008)); }
      else if (ptrs.size === 2) { const [q1, q2] = [...ptrs.values()]; const d = Math.hypot(q1.x - q2.x, q1.y - q2.y); if (lastDist) radius = Math.max(15, Math.min(140, radius * lastDist / d)); lastDist = d; }
      place();
    });
    const up = e => { ptrs.delete(e.pointerId); lastDist = 0; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', e => { e.preventDefault(); radius = Math.max(15, Math.min(140, radius * (e.deltaY > 0 ? 1.1 : 0.9))); place(); }, { passive: false });

    let alive = true;
    (function loop() { if (!alive) return; renderer.render(scene, cam); requestAnimationFrame(loop); })();
    return {
      update(readings) {
        for (const c of model.comps) {
          const L = live[c.id], r = readings[c.id]; if (!L || !r) continue;
          if (c.type === 'led') { L.m.emissiveIntensity = r.b * 1.6; L.light.intensity = r.b * 1.5; }
          if (c.type === 'push') L.k.position.y = c.pressed ? 1.9 : 2.1;
          if (c.type === 'motor') L.sh.rotation.x += r.speed * 0.6;
        }
        if (live._l13 && readings._v) { const l = document.querySelector('#l13'); live._l13.emissiveIntensity = l && l.classList.contains('on') ? 1.5 : 0; }
      },
      destroy() { alive = false; renderer.dispose(); }
    };
  }
  return { create };
})();
