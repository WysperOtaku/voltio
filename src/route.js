/* Voltio · rutado de PCB a una cara: une cada par de pads sin cruzar pistas */
const Route = (() => {
  const NETC = { VCC: '#E5484D', GND: '#3E8FCB', LED: '#F2A900', SW: '#2EA44F', OUT: '#9B59D0', CLK: '#F07D10' };
  const LEVELS = {
    r1: { n: 6, nets: { VCC: [[0, 0], [5, 2]], GND: [[0, 5], [5, 5]], LED: [[0, 2], [3, 4]] } },
    r2: { n: 6, nets: { VCC: [[0, 0], [5, 5]], GND: [[0, 5], [4, 4]], LED: [[1, 1], [4, 3]], SW: [[0, 2], [3, 4]] } },
    r3: { n: 7, nets: { VCC: [[0, 0], [6, 6]], GND: [[0, 6], [5, 5]], LED: [[1, 1], [5, 4]], SW: [[0, 1], [4, 5]], OUT: [[2, 2], [4, 3]] } }
  };
  function open(root, levelId, onDone) {
    const L = LEVELS[levelId], n = L.n, C = 50, pad = 6;
    const paths = {}; Object.keys(L.nets).forEach(k => paths[k] = []);
    const padAt = {}; for (const [k, ps] of Object.entries(L.nets)) ps.forEach(([x, y]) => padAt[x + ',' + y] = k);
    let cur = null, done = false;
    root.innerHTML = `<div class="route"><svg viewBox="0 0 ${n * C + pad * 2} ${n * C + pad * 2}" class="pcb" style="touch-action:none"></svg>
      <div class="rstat"><span id="rs"></span><button class="sbtn" id="rclear">Borrar pistas</button></div></div>`;
    const svg = root.querySelector('svg'), rs = root.querySelector('#rs');
    const owner = (x, y) => { for (const [k, p] of Object.entries(paths)) if (p.some(([a, b]) => a === x && b === y)) return k; return padAt[x + ',' + y] || null; };
    const connected = k => { const p = paths[k], [a, b] = L.nets[k]; if (p.length < 2) return false; const s = p[0], e = p[p.length - 1]; const eq = (u, v) => u[0] === v[0] && u[1] === v[1]; return (eq(s, a) && eq(e, b)) || (eq(s, b) && eq(e, a)); };
    function draw() {
      let s = `<rect x="0" y="0" width="${n * C + pad * 2}" height="${n * C + pad * 2}" rx="10" class="pcbb"/>`;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) s += `<circle cx="${pad + x * C + C / 2}" cy="${pad + y * C + C / 2}" r="2" class="pcbg"/>`;
      for (const [k, p] of Object.entries(paths)) if (p.length > 1) s += `<polyline points="${p.map(([x, y]) => `${pad + x * C + C / 2},${pad + y * C + C / 2}`).join(' ')}" stroke="${NETC[k]}" class="trk ${connected(k) ? 'ok' : ''}"/>`;
      for (const [k, ps] of Object.entries(L.nets)) ps.forEach(([x, y]) => s += `<g><circle cx="${pad + x * C + C / 2}" cy="${pad + y * C + C / 2}" r="17" fill="${NETC[k]}" class="padc"/><circle cx="${pad + x * C + C / 2}" cy="${pad + y * C + C / 2}" r="5" class="drill"/><text x="${pad + x * C + C / 2}" y="${pad + y * C + C / 2 - 21}" text-anchor="middle" class="padl">${k}</text></g>`);
      svg.innerHTML = s;
      const ok = Object.keys(L.nets).filter(connected).length, tot = Object.keys(L.nets).length;
      const len = Object.values(paths).reduce((a, p) => a + Math.max(0, p.length - 1), 0);
      rs.textContent = `${ok}/${tot} redes conectadas · ${len * 2.54} mm de pista`.replace('.', ',');
      if (ok === tot && !done) { done = true; onDone && onDone(len); }
    }
    function cell(e) { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse()); const x = Math.floor((p.x - pad) / C), y = Math.floor((p.y - pad) / C); return x >= 0 && y >= 0 && x < n && y < n ? [x, y] : null; }
    svg.addEventListener('pointerdown', e => {
      const c = cell(e); if (!c) return; svg.setPointerCapture(e.pointerId);
      const k = padAt[c.join(',')];
      if (k) { cur = k; paths[k] = [c]; draw(); return; }
      for (const [nk, p] of Object.entries(paths)) { const last = p[p.length - 1]; if (last && last[0] === c[0] && last[1] === c[1] && !connected(nk)) { cur = nk; return; } }
    });
    svg.addEventListener('pointermove', e => {
      if (!cur) return; const c = cell(e); if (!c) return;
      const p = paths[cur], last = p[p.length - 1];
      if (last[0] === c[0] && last[1] === c[1]) return;
      if (Math.abs(last[0] - c[0]) + Math.abs(last[1] - c[1]) !== 1) return;
      if (p.length > 1 && p[p.length - 2][0] === c[0] && p[p.length - 2][1] === c[1]) { p.pop(); draw(); return; }
      if (connected(cur)) return;
      const o = owner(c[0], c[1]);
      if (o && o !== cur) return;
      if (p.some(([a, b]) => a === c[0] && b === c[1])) return;
      if (padAt[c.join(',')] === cur) { p.push(c); cur = null; draw(); return; }
      p.push(c); draw();
    });
    const end = () => { cur = null; };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    root.querySelector('#rclear').onclick = () => { Object.keys(paths).forEach(k => paths[k] = []); done = false; draw(); };
    draw();
  }
  return { open, LEVELS };
})();
