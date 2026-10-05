/* Voltio · motor eléctrico
   Análisis nodal. Fuentes como equivalentes de Norton; diodos, LEDs, zener,
   transistores NPN y comparadores con modelos lineales a tramos que se iteran
   hasta que sus estados son coherentes. Condensadores con Euler implícito. */
const Solver = (() => {
  const GMIN = 1e-9, ROFF = 1e9;

  function gauss(A, b) {
    const n = b.length;
    for (let k = 0; k < n; k++) {
      let p = k, m = Math.abs(A[k][k]);
      for (let i = k + 1; i < n; i++) { const v = Math.abs(A[i][k]); if (v > m) { m = v; p = i; } }
      if (m < 1e-18) continue;
      if (p !== k) { const t = A[k]; A[k] = A[p]; A[p] = t; const tb = b[k]; b[k] = b[p]; b[p] = tb; }
      const akk = A[k][k], rk = A[k];
      for (let i = k + 1; i < n; i++) {
        const f = A[i][k] / akk; if (f === 0) continue;
        const ri = A[i];
        for (let j = k; j < n; j++) ri[j] -= f * rk[j];
        b[i] -= f * b[k];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i]; const ri = A[i];
      for (let j = i + 1; j < n; j++) s -= ri[j] * x[j];
      x[i] = Math.abs(ri[i]) < 1e-18 ? 0 : s / ri[i];
    }
    return x;
  }

  // circuit: {n, gnd, els:[...], dt}
  function solve(cir) {
    const { n, gnd, els } = cir, dt = cir.dt || 0.016;
    const idx = new Array(n); let m = 0;
    for (let i = 0; i < n; i++) idx[i] = i === gnd ? -1 : m++;
    let v = new Array(n).fill(0);
    for (const e of els) init(e);
    let iter = 0, changed = true;
    while (changed && iter < 60) {
      iter++;
      const G = Array.from({ length: m }, () => new Float64Array(m)), I = new Float64Array(m);
      const g = (a, b, val) => { const i = idx[a], j = idx[b]; if (i >= 0) G[i][i] += val; if (j >= 0) G[j][j] += val; if (i >= 0 && j >= 0) { G[i][j] -= val; G[j][i] -= val; } };
      const inj = (a, val) => { const i = idx[a]; if (i >= 0) I[i] += val; };
      const nort = (p, q, V, R) => { const c = 1 / R; g(p, q, c); inj(p, V * c); inj(q, -V * c); };
      const vccs = (from, to, cp, cn, gm, k) => { // corriente que sale de 'from' y entra en 'to' = gm(Vcp-Vcn) - k
        const f = idx[from], t = idx[to], p = idx[cp], q = idx[cn];
        if (f >= 0) { if (p >= 0) G[f][p] += gm; if (q >= 0) G[f][q] -= gm; I[f] += k; }
        if (t >= 0) { if (p >= 0) G[t][p] -= gm; if (q >= 0) G[t][q] += gm; I[t] -= k; }
      };
      for (let i = 0; i < m; i++) G[i][i] += GMIN;
      for (const e of els) stamp(e, g, nort, vccs, dt);
      const x = gauss(G.map(r => Array.from(r)), Array.from(I));
      v = new Array(n).fill(0);
      for (let i = 0; i < n; i++) if (idx[i] >= 0) v[i] = x[idx[i]];
      changed = false;
      for (const e of els) if (update(e, v)) changed = true;
    }
    for (const e of els) e.i = current(e, v, dt);
    return { v, iter, ok: !changed };
  }

  function init(e) {
    if (e.t === 'D' && !e.st) e.st = 'off';
    if (e.t === 'Q') { e.be = e.be || 'off'; e.ce = e.ce || 'act'; }
    if (e.t === 'CMP' && !e.st) e.st = 'lo';
    if (e.t === 'C' && e.vprev == null) e.vprev = 0;
  }

  function stamp(e, g, nort, vccs, dt) {
    switch (e.t) {
      case 'R': g(e.a, e.b, 1 / Math.max(e.r, 1e-3)); break;
      case 'V': nort(e.a, e.b, e.v, e.rs || 0.05); break;
      case 'S': g(e.a, e.b, e.closed ? 1 / 0.02 : 1 / ROFF); break;
      case 'C': { const gc = e.c / dt; nort(e.a, e.b, e.vprev, 1 / gc); break; }
      case 'D':
        if (e.st === 'on') nort(e.a, e.b, e.vf, e.ron);
        else if (e.st === 'z') nort(e.b, e.a, e.vz, e.rz || 5);
        else g(e.a, e.b, 1 / ROFF);
        break;
      case 'Q': {
        const rbe = 60;
        if (e.be === 'on') nort(e.b, e.e, 0.65, rbe); else g(e.b, e.e, 1 / ROFF);
        if (e.be !== 'on') g(e.c, e.e, 1 / ROFF);
        else if (e.ce === 'sat') nort(e.c, e.e, 0.1, 2);
        else { vccs(e.c, e.e, e.b, e.e, e.beta / rbe, e.beta * 0.65 / rbe); g(e.c, e.e, 1 / 1e6); }
        break;
      }
      case 'CMP': // salida push-pull alimentada desde vcc
        g(e.p, e.n, 1 / 1e8);
        if (e.st === 'hi') g(e.out, e.vcc, 1 / 60); else g(e.out, e.gnd, 1 / 60);
        g(e.vcc, e.gnd, 1 / 5000); // consumo propio
        break;
    }
  }

  function update(e, v) {
    const V = (a, b) => v[a] - v[b];
    if (e.t === 'D') {
      const vd = V(e.a, e.b);
      let ns = e.st;
      if (e.st === 'off') { if (vd > e.vf + 1e-6) ns = 'on'; else if (e.vz && -vd > e.vz + 1e-6) ns = 'z'; }
      else if (e.st === 'on') { if ((vd - e.vf) / e.ron < 0) ns = 'off'; }
      else if (e.st === 'z') { if ((-vd - e.vz) < 0) ns = 'off'; }
      if (ns !== e.st) { e.st = ns; return true; }
      return false;
    }
    if (e.t === 'Q') {
      const vbe = V(e.b, e.e), vce = V(e.c, e.e);
      let be = e.be, ce = e.ce;
      if (be === 'off' && vbe > 0.65 + 1e-6) be = 'on';
      else if (be === 'on' && vbe < 0.65) be = 'off';
      if (be === 'on') {
        const ib = (vbe - 0.65) / 60;
        if (ce === 'act' && vce < 0.1) ce = 'sat';
        else if (ce === 'sat' && (vce - 0.1) / 2 > e.beta * ib) ce = 'act';
      }
      const ch = be !== e.be || ce !== e.ce; e.be = be; e.ce = ce; return ch;
    }
    if (e.t === 'CMP') {
      const ns = V(e.p, e.n) > 0 ? 'hi' : 'lo';
      if (ns !== e.st) { e.st = ns; return true; }
    }
    return false;
  }

  function current(e, v, dt) { // corriente de a→b (o colector para Q)
    const V = (a, b) => v[a] - v[b];
    switch (e.t) {
      case 'R': return V(e.a, e.b) / Math.max(e.r, 1e-3);
      case 'V': return (e.v - V(e.a, e.b)) / (e.rs || 0.05);
      case 'S': return e.closed ? V(e.a, e.b) / 0.02 : 0;
      case 'C': return e.c / dt * (V(e.a, e.b) - e.vprev);
      case 'D': return e.st === 'on' ? (V(e.a, e.b) - e.vf) / e.ron : e.st === 'z' ? -(-V(e.a, e.b) - e.vz) / (e.rz || 5) : 0;
      case 'Q': {
        if (e.be !== 'on') { e.ib = 0; return 0; }
        e.ib = (V(e.b, e.e) - 0.65) / 60;
        return e.ce === 'sat' ? (V(e.c, e.e) - 0.1) / 2 : e.beta * e.ib;
      }
      case 'CMP': return 0;
    }
    return 0;
  }

  function commit(cir, v) { for (const e of cir.els) if (e.t === 'C') e.vprev = v[e.a] - v[e.b]; }

  return { solve, commit };
})();
if (typeof module !== 'undefined') module.exports = Solver;
