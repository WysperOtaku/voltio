/* Voltio · simulador de protoboard */
const Sim = (() => {
  const P = 20, COLS = 24, X0 = 30;
  const ROWS = ['+', '−', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', '+', '−'];
  const ROWY = [22, 42, 82, 102, 122, 142, 162, 202, 222, 242, 262, 282, 322, 342];
  const BOARD = { x: 6, y: 6, w: X0 + (COLS - 1) * P + 24, h: 354 };
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const hx = c => X0 + c * P;

  const E12 = [10, 22, 47, 100, 150, 220, 330, 470, 680, 1000, 1500, 2200, 3300, 4700, 10000, 22000, 47000, 100000, 1000000];
  const CAPS = [1, 10, 47, 100, 220, 470, 1000];
  const LEDC = { rojo: { vf: 1.8, hex: '#FF3B30' }, amarillo: { vf: 2.0, hex: '#FFC400' }, verde: { vf: 2.1, hex: '#22D35E' }, azul: { vf: 2.9, hex: '#2F7BFF' }, blanco: { vf: 3.0, hex: '#F2F6FF' } };
  const BANDHEX = ['#1a1a1a', '#7B4A21', '#D22B2B', '#F07D10', '#F5D10A', '#2E9B3C', '#2A5BD7', '#8A3FC9', '#8A8A8A', '#F4F4F4'];
  const WIRECOL = ['#E5484D', '#2B2B2B', '#3E8FCB', '#F2A900', '#2EA44F', '#9B59D0', '#F07D10'];

  const PARTS = {
    res: { name: 'Resistencia', pins: [0, 3], pinNames: ['1', '2'], def: { val: 470 } },
    led: { name: 'LED', pins: [0, 1], pinNames: ['ánodo (+)', 'cátodo (−)'], def: { color: 'rojo' } },
    push: { name: 'Pulsador', pins: [0, 2], pinNames: ['1', '2'], def: {} },
    sw: { name: 'Interruptor', pins: [0, 2], pinNames: ['1', '2'], def: { on: false } },
    cap: { name: 'Condensador', pins: [0, 1], pinNames: ['+', '−'], def: { val: 470 } },
    diode: { name: 'Diodo 1N4148', pins: [0, 3], pinNames: ['ánodo', 'cátodo'], def: {} },
    zener: { name: 'Diodo zener', pins: [0, 3], pinNames: ['ánodo', 'cátodo'], def: { vz: 5.1 } },
    pot: { name: 'Potenciómetro 10 kΩ', pins: [0, 1, 2], pinNames: ['extremo 1', 'cursor', 'extremo 2'], def: { pos: 0.5 } },
    ldr: { name: 'LDR (fotorresistencia)', pins: [0, 2], pinNames: ['1', '2'], def: { light: 0.7 } },
    npn: { name: 'Transistor NPN', pins: [0, 1, 2], pinNames: ['E (emisor)', 'B (base)', 'C (colector)'], def: {} },
    cmp: { name: 'Comparador', pins: [0, 1, 2, 3], pinNames: ['IN+', 'IN−', 'VCC', 'SALIDA'], def: {} },
    motor: { name: 'Motor CC', pins: [0, 3], pinNames: ['+', '−'], def: {} },
    ic555: { name: 'Temporizador 555', dip: 8, pinNames: ['1 GND', '2 disparo', '3 salida', '4 reset', '5 control', '6 umbral', '7 descarga', '8 VCC'], def: {} },
    ic7400: { name: '74HC00 (4 NAND)', dip: 14, pinNames: ['1 1A', '2 1B', '3 1Y', '4 2A', '5 2B', '6 2Y', '7 GND', '8 3Y', '9 3A', '10 3B', '11 4Y', '12 4A', '13 4B', '14 VCC'], def: {} }
  };

  function fmtR(r) { return r >= 1e6 ? (r / 1e6) + ' MΩ' : r >= 1000 ? String(r / 1000).replace('.', ',') + ' kΩ' : r + ' Ω'; }
  function fmtV(v) { return (Math.abs(v) < 0.005 ? 0 : v).toFixed(2).replace('.', ',') + ' V'; }
  function fmtI(i) { const a = Math.abs(i); return a >= 0.1 ? (i).toFixed(2).replace('.', ',') + ' A' : a >= 1e-4 ? (i * 1000).toFixed(1).replace('.', ',') + ' mA' : a >= 1e-7 ? (i * 1e6).toFixed(1).replace('.', ',') + ' µA' : '0 mA'; }
  function bands(r) { const s = String(Math.round(r)); const d1 = +s[0], d2 = s.length > 1 ? +s[1] : 0; const mult = Math.max(0, s.length - 2); return [d1, d2, mult]; }

  /* ---------- Arduino emulado ---------- */
  function hexToProg(src) {
    const prog = new Uint16Array(16384), b = new Uint8Array(prog.buffer);
    for (const line of src.split('\n')) {
      if (line[0] !== ':') continue;
      const n = parseInt(line.substr(1, 2), 16), addr = parseInt(line.substr(3, 4), 16), type = parseInt(line.substr(7, 2), 16);
      if (type !== 0) continue;
      for (let i = 0; i < n; i++) b[addr + i] = parseInt(line.substr(9 + i * 2, 2), 16);
    }
    return prog;
  }
  const ARD_PINS = [];
  for (let i = 0; i <= 13; i++) ARD_PINS.push({ name: 'D' + i, port: i < 8 ? 'D' : 'B', bit: i < 8 ? i : i - 8 });
  for (let i = 0; i <= 5; i++) ARD_PINS.push({ name: 'A' + i, port: 'C', bit: i, adc: i });
  class Uno {
    constructor(hex) {
      const A = window.AVR;
      this.cpu = new A.CPU(hexToProg(hex));
      this.t0 = new A.AVRTimer(this.cpu, A.timer0Config); this.t1 = new A.AVRTimer(this.cpu, A.timer1Config); this.t2 = new A.AVRTimer(this.cpu, A.timer2Config);
      this.ports = { B: new A.AVRIOPort(this.cpu, A.portBConfig), C: new A.AVRIOPort(this.cpu, A.portCConfig), D: new A.AVRIOPort(this.cpu, A.portDConfig) };
      this.adc = new A.AVRADC(this.cpu, A.adcConfig);
      this.hi = {}; this.last = {}; this.lastCyc = {};
      for (const p of ARD_PINS) { this.hi[p.name] = 0; this.last[p.name] = 0; this.lastCyc[p.name] = 0; }
      for (const [k, port] of Object.entries(this.ports)) port.addListener(() => this.onPort(k));
      this.frameStart = 0;
    }
    stateOf(p) { return this.ports[p.port].pinState(p.bit); }
    onPort(k) {
      const c = this.cpu.cycles;
      for (const p of ARD_PINS) if (p.port === k) {
        const s = this.stateOf(p) === 1 ? 1 : 0;
        if (s !== this.last[p.name]) { if (this.last[p.name]) this.hi[p.name] += c - this.lastCyc[p.name]; this.last[p.name] = s; this.lastCyc[p.name] = c; }
      }
    }
    run(seconds, budgetMs) {
      const A = window.AVR, cpu = this.cpu, target = cpu.cycles + seconds * 16e6, t = performance.now();
      this.frameStart = cpu.cycles;
      for (const p of ARD_PINS) { this.hi[p.name] = 0; this.lastCyc[p.name] = cpu.cycles; }
      while (cpu.cycles < target) {
        for (let i = 0; i < 5000; i++) { A.avrInstruction(cpu); cpu.tick(); }
        if (performance.now() - t > budgetMs) break;
      }
      const span = Math.max(1, cpu.cycles - this.frameStart);
      const out = {};
      for (const p of ARD_PINS) {
        const st = this.stateOf(p);
        let hi = this.hi[p.name]; if (this.last[p.name]) hi += cpu.cycles - this.lastCyc[p.name];
        const frac = Math.min(1, hi / span);
        out[p.name] = { st, frac };
      }
      return { pins: out, simSec: span / 16e6 };
    }
    setInput(p, v) { this.ports[p.port].setPin(p.bit, v > 2.5); if (p.adc != null) this.adc.channelValues[p.adc] = Math.max(0, Math.min(5, v)); }
  }

  /* ---------- Placas ---------- */
  const BOARDS = {
    uno: { name: 'Arduino Uno', mcu: 'avr', vhi: 5, onboard: false, power: { '5V': 5, '3V3': 3.3 } },
    nano: { name: 'Arduino Nano', mcu: 'avr', vhi: 5, onboard: true, c0: 3, rows: [5, 8], color: '#0E6E8C', label: 'NANO',
      top: ['D13', '3V3', 'AREF', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', '5V', 'RST', 'GND2', 'VIN'],
      bot: ['D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'GND1', 'RST2', 'D0', 'D1'], power: { '5V': 5, '3V3': 3.3 } },
    esp32: { name: 'ESP32 DevKit', mcu: 'model', vhi: 3.3, onboard: true, c0: 3, rows: [5, 8], color: '#1B1B1F', label: 'ESP32',
      top: ['3V3', 'GND2', 'D15', 'D2', 'D4', 'D16', 'D17', 'D5', 'D18', 'D19', 'D21', 'RX0', 'TX0', 'D22', 'D23'],
      bot: ['VIN', 'GND1', 'D13', 'D12', 'D14', 'D27', 'D26', 'D25', 'D33', 'D32', 'D35', 'D34', 'VN', 'VP', 'EN'], power: { '3V3': 3.3, 'VIN': 5 } }
  };
  const ESP_GPIO = ['D2', 'D4', 'D5', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'D21', 'D22', 'D23', 'D25', 'D26', 'D27', 'D32', 'D33', 'D34', 'D35', 'VP', 'VN'];
  class EspModel {
    constructor(key) {
      this.t = 0; this.wait = 0; this.pins = {}; ESP_GPIO.forEach(n => this.pins[n] = { mode: 'in', out: 0, pwm: null, vin: 0 });
      const P = this.pins;
      const io = {
        mode: (n, m) => { P[n].mode = m; }, write: (n, v) => { P[n].out = v ? 1 : 0; P[n].pwm = null; },
        pwm: (n, d) => { P[n].pwm = Math.max(0, Math.min(1, d)); }, read: n => P[n].vin > 1.65 ? 1 : 0,
        aread: n => Math.round(Math.max(0, Math.min(3.3, P[n].vin)) / 3.3 * 4095)
      };
      this.gen = ESP_SKETCHES[key].run(io);
    }
    run(dt) {
      this.t += dt; let k = 0;
      while (this.wait <= this.t && k++ < 400) { const r = this.gen.next(); if (r.done) { this.wait = Infinity; break; } this.wait += (r.value || 1) / 1000; if (this.wait < this.t - 1) this.wait = this.t; }
      const out = {};
      for (const [n, p] of Object.entries(this.pins)) out[n] = p.mode === 'out' ? { st: 1, frac: p.pwm != null ? p.pwm : p.out } : { st: p.mode === 'pullup' ? 3 : 2, frac: 0 };
      return { pins: out, simSec: dt };
    }
    setInput(name, v) { if (this.pins[name]) this.pins[name].vin = v; }
  }

  /* ---------- Geometría de terminales externos ---------- */
  function layoutTerms(cfg) {
    const T = {};
    const B = cfg.arduino ? BOARDS[cfg.board || 'uno'] : null;
    if (B && B.onboard) {
      B.top.forEach((n, i) => T['ard:' + n] = { x: X0 + (B.c0 + i) * P, y: ROWY[B.rows[0]], lab: n, hole: `h:${B.c0 + i}:${B.rows[0]}` });
      B.bot.forEach((n, i) => T['ard:' + n] = { x: X0 + (B.c0 + i) * P, y: ROWY[B.rows[1]], lab: n, hole: `h:${B.c0 + i}:${B.rows[1]}` });
      if (cfg.battery) { T['bat+'] = { x: -64, y: 118, lab: '+' }; T['bat-'] = { x: -34, y: 118, lab: '−' }; }
      return T;
    }
    if (cfg.battery) { T['bat+'] = { x: -64, y: 118, lab: '+' }; T['bat-'] = { x: -34, y: 118, lab: '−' }; }
    if (cfg.arduino) {
      const ax = 70, ay = -250;
      // Cabecera digital (abajo), D13 a la izquierda como en la placa real
      const dig = ['GND', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8', null, 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'];
      let x = ax + 60;
      dig.forEach(n => { if (n) T['ard:' + (n === 'GND' ? 'GND1' : n)] = { x, y: ay + 196, lab: n }; x += 18; });
      const pw = ['3V3', '5V', 'GND2', 'GND3', null, 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
      x = ax + 120;
      pw.forEach(n => { if (n) T['ard:' + n] = { x, y: ay + 24, lab: n.startsWith('GND') ? 'GND' : n }; x += 18; });
    }
    return T;
  }

  /* ---------- Creación ---------- */
  function open(root, cfg, cb = {}) {
    cfg = Object.assign({ parts: Object.keys(PARTS) }, cfg);
    const terms = layoutTerms(cfg);
    let model = cfg.initial ? JSON.parse(JSON.stringify(cfg.initial)) : { comps: [], wires: [] };
    model.comps = model.comps || []; model.wires = model.wires || [];
    let sketch = cfg.arduino || null;
    const board = cfg.arduino ? BOARDS[cfg.board || 'uno'] : null;
    const GPIO = board ? (board.mcu === 'avr' ? ARD_PINS.map(p => ({ ...p })) : ESP_GPIO.map(n => ({ name: n }))) : [];
    let uno = null, unoErr = null;
    let mode = 'select', placing = null, wireStart = null, sel = null, meas = null;
    let zoom = cfg.zoom || 0.85, nextId = 1 + model.comps.reduce((m, c) => Math.max(m, +String(c.id).slice(1) || 0), 0);
    const live = {}; // lecturas por componente
    const stats = { t: 0, comps: {} };
    let topo = null, raf = 0, lastT = 0, simSpeed = 1, shortWarn = false, pinsNow = null;

    const vb = { x: cfg.battery ? -110 : -4, y: board && !board.onboard ? -262 : -4, x2: BOARD.x + BOARD.w + 8, y2: 368 };
    root.innerHTML = `
      <div class="sim">
        <div class="simbar" role="toolbar" aria-label="Herramientas">
          <button data-m="select" aria-pressed="true">Tocar</button>
          <button data-m="wire">Cable</button>
          <button data-m="measure">Medir</button>
          <button data-act="parts" class="addp">+ Pieza</button>
          <span class="sp"></span>
          <button data-act="zout" aria-label="Alejar">−</button><button data-act="zin" aria-label="Acercar">+</button>
          <button data-act="3d">3D</button>
        </div>
        <div class="simwrap"><svg class="board" xmlns="http://www.w3.org/2000/svg"></svg></div>
        <div class="insp" aria-live="polite"></div>
        <div class="tray" hidden></div>
      </div>`;
    const svg = root.querySelector('svg.board'), wrap = root.querySelector('.simwrap'), insp = root.querySelector('.insp'), tray = root.querySelector('.tray');

    /* ----- puntos ----- */
    function holeId(c, r) { return `h:${c}:${r}`; }
    function pos(id) {
      if (id.startsWith('h:')) { const [, c, r] = id.split(':').map(Number); return { x: hx(c), y: ROWY[r] }; }
      return terms[id];
    }
    function group(id) {
      if (!id.startsWith('h:')) { if (terms[id] && terms[id].hole) return group(terms[id].hole); return /^ard:GND/.test(id) ? 'ard:GND' : id; }
      const [, c, r] = id.split(':').map(Number);
      if (r <= 1 || r >= 12) return 'rail' + r;
      return (r <= 6 ? 'T' : 'B') + c;
    }
    function pinHoles(comp) {
      const def = PARTS[comp.type], [c, r] = comp.at, d = DIRS[comp.dir || 0];
      if (def.dip) { const n = def.dip, h = []; for (let p = 1; p <= n; p++) h.push(p <= n / 2 ? [c + p - 1, 7] : [c + n - p, 6]); return h; }
      return def.pins.map(k => [c + d[0] * k, r + d[1] * k]);
    }
    function validPlacement(comp, ignoreId) {
      const hs = pinHoles(comp);
      for (const [c, r] of hs) if (c < 0 || c >= COLS || r < 0 || r >= ROWS.length) return 'La pieza se sale de la protoboard.';
      const used = new Set();
      model.comps.forEach(o => { if (o.id !== ignoreId) pinHoles(o).forEach(([c, r]) => used.add(c + ':' + r)); });
      for (const [c, r] of hs) if (used.has(c + ':' + r)) return 'Ese agujero ya está ocupado por otra pata.';
      if (board && board.onboard) for (const [c, r] of hs) if (c >= board.c0 && c < board.c0 + 15 && r >= board.rows[0] && r <= board.rows[1]) return 'Ahí está la placa. Usa los agujeros libres por encima o por debajo.';
      const groups = hs.map(([c, r]) => group(holeId(c, r)));
      if (new Set(groups).size < groups.length && comp.type !== 'push' && comp.type !== 'sw') return 'Dos patas quedarían en la misma tira y la pieza estaría en cortocircuito. Gírala o muévela.';
      return null;
    }

    /* ----- topología ----- */
    function buildTopo() {
      const par = {};
      const find = a => { while (par[a] !== undefined && par[a] !== a) a = par[a]; return a; };
      const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
      const node = id => find(group(id));
      model.wires.forEach(w => uni(group(w.a), group(w.b)));
      const idx = {}; let n = 0;
      const N = id => { const k = node(id); if (idx[k] === undefined) idx[k] = n++; return idx[k]; };
      const els = [], map = {};
      let gnd = -1;
      const ardEls = {};
      if (board) {
        const gt = Object.keys(terms).filter(k => /^ard:GND/.test(k));
        gt.forEach(k => uni(group(k), group(gt[0])));
        gnd = N(gt[0]);
        for (const [pn, v] of Object.entries(board.power)) { const e = { t: 'V', a: N('ard:' + pn), b: gnd, v, rs: v === 5 ? 0.3 : 1 }; els.push(e); }
        for (const p of GPIO) { if (!terms['ard:' + p.name]) continue; const e = { t: 'V', a: N('ard:' + p.name), b: gnd, v: 0, rs: 1e8, pin: p }; els.push(e); ardEls[p.name] = e; }
      } else if (cfg.battery) gnd = N('bat-');
      if (cfg.battery) { const e = { t: 'V', a: N('bat+'), b: N('bat-'), v: cfg.battery, rs: 1 }; els.push(e); map.battery = [e]; }
      if (gnd < 0) gnd = 0;
      for (const c of model.comps) {
        const hs = pinHoles(c).map(([x, y]) => N(holeId(x, y)));
        let list = [];
        const burnt = c.burnt;
        switch (c.type) {
          case 'res': list = [{ t: 'R', a: hs[0], b: hs[1], r: burnt ? 1e9 : c.val }]; break;
          case 'led': list = [{ t: 'D', a: hs[0], b: hs[1], vf: burnt ? 1e6 : LEDC[c.color].vf, ron: 12 }]; break;
          case 'diode': list = [{ t: 'D', a: hs[0], b: hs[1], vf: 0.65, ron: 1 }]; break;
          case 'zener': list = [{ t: 'D', a: hs[0], b: hs[1], vf: 0.7, ron: 1, vz: c.vz, rz: 4 }]; break;
          case 'push': list = [{ t: 'S', a: hs[0], b: hs[1], closed: !!c.pressed }]; break;
          case 'sw': list = [{ t: 'S', a: hs[0], b: hs[1], closed: !!c.on }]; break;
          case 'cap': list = [{ t: 'C', a: hs[0], b: hs[1], c: c.val * 1e-6, vprev: (topo && topo.capMem[c.id]) || 0 }]; break;
          case 'pot': { const p = Math.min(0.99, Math.max(0.01, c.pos)); list = [{ t: 'R', a: hs[0], b: hs[1], r: 10000 * p }, { t: 'R', a: hs[1], b: hs[2], r: 10000 * (1 - p) }]; break; }
          case 'ldr': list = [{ t: 'R', a: hs[0], b: hs[1], r: ldrR(c.light) }]; break;
          case 'npn': list = [{ t: 'Q', e: hs[0], b: hs[1], c: hs[2], beta: 150 }]; break;
          case 'cmp': list = [{ t: 'CMP', p: hs[0], n: hs[1], vcc: hs[2], out: hs[3], gnd }]; break;
          case 'motor': list = [{ t: 'R', a: hs[0], b: hs[1], r: burnt ? 1e9 : 25 }]; break;
          case 'ic555': { const q = c._q ? 1 : 0, vcc = c._vcc || 0; list = [{ t: 'V', a: hs[2], b: hs[0], v: q ? Math.max(0, vcc - 1.5) : 0, rs: vcc > 1 ? 10 : 1e8, role: 'out' }, { t: 'R', a: hs[6], b: hs[0], r: q ? 1e9 : 20, role: 'dis' }, { t: 'R', a: hs[7], b: hs[4], r: 5000 }, { t: 'R', a: hs[4], b: hs[0], r: 10000 }]; break; }
          case 'ic7400': { const g = c._g || [0, 0, 0, 0], vcc = c._vcc || 0; list = [[2], [5], [7], [10]].map(([o], k) => ({ t: 'V', a: hs[o], b: hs[6], v: g[k] ? vcc : 0, rs: vcc > 1 ? 50 : 1e8, role: 'y' + k })); list.push({ t: 'R', a: hs[13], b: hs[6], r: 50000 }); break; }
        }
        list.forEach(e => els.push(e)); map[c.id] = list; c._nodes = hs;
      }
      const nodeOf = id => { const k = node(id); return idx[k]; };
      topo = { n, gnd, els, map, ardEls, nodeOf, capMem: topo ? topo.capMem : {} };
    }
    const ldrR = l => Math.round(1000 * Math.pow(500, 1 - l)); // 1 kΩ con luz, ~500 kΩ a oscuras
    const NAND_PINS = [[0, 1], [3, 4], [8, 9], [11, 12]];
    function updateICs(v) { // devuelve true si algún chip cambia de estado
      let ch = false;
      for (const c of model.comps) {
        const n = c._nodes; if (!n || !topo.map[c.id]) continue;
        if (c.type === 'ic555') {
          const g = v[n[0]], vcc = v[n[7]] - g, ctrl = v[n[4]] - g;
          let q = c._q ? 1 : 0;
          if (vcc < 1.5) q = 0; else if (v[n[3]] - g < 0.7) q = 0; else if (v[n[1]] - g < ctrl / 2) q = 1; else if (v[n[5]] - g > ctrl) q = 0;
          const els = topo.map[c.id];
          if (q !== (c._q ? 1 : 0) || Math.abs((c._vcc || 0) - vcc) > 0.05) { if (q !== (c._q ? 1 : 0)) ch = true; c._q = q; c._vcc = vcc; els[0].v = q ? Math.max(0, vcc - 1.5) : 0; els[0].rs = vcc > 1 ? 10 : 1e8; els[1].r = q ? 1e9 : 20; }
        }
        if (c.type === 'ic7400') {
          const g = v[n[6]], vcc = v[n[13]] - g, els = topo.map[c.id];
          const out = NAND_PINS.map(([a, b]) => (v[n[a]] - g > vcc / 2 && v[n[b]] - g > vcc / 2) ? 0 : 1);
          const old = c._g || [0, 0, 0, 0];
          if (out.some((x, k) => x !== old[k])) ch = true;
          if (ch || Math.abs((c._vcc || 0) - vcc) > 0.05) { c._g = out; c._vcc = vcc; out.forEach((x, k) => { els[k].v = x ? Math.max(0, vcc) : 0; els[k].rs = vcc > 1 ? 50 : 1e8; }); }
        }
      }
      return ch;
    }

    /* ----- simulación ----- */
    function solveFrame(dt) {
      if (!topo) buildTopo();
      const T = topo; T.dt = dt;
      let pwm = [];
      if (uno && pinsNow) {
        for (const p of GPIO) {
          const e = T.ardEls[p.name], s = pinsNow[p.name]; if (!e || !s) continue;
          if (s.st === 1 || s.st === 0) {
            if (s.frac > 0.03 && s.frac < 0.97) pwm.push({ e, frac: s.frac });
            e.v = s.frac >= 0.5 ? board.vhi : 0; e.rs = 25;
          } else if (s.st === 3) { e.v = board.vhi; e.rs = 35000; } else { e.v = 0; e.rs = 1e8; }
        }
      }
      pwm = pwm.slice(0, 3);
      const combos = 1 << pwm.length;
      const accI = new Map(), accV = new Array(T.n).fill(0);
      let best = null, bestW = -1;
      for (let k = 0; k < combos; k++) {
        let w = 1;
        pwm.forEach((p, j) => { const on = (k >> j) & 1; p.e.v = on ? board.vhi : 0; p.e.rs = 25; w *= on ? p.frac : 1 - p.frac; });
        if (w < 1e-4 && combos > 1) continue;
        const r = Solver.solve(T);
        r.v.forEach((x, i) => accV[i] += w * x);
        for (const e of T.els) accI.set(e, (accI.get(e) || 0) + w * e.i);
        if (w > bestW) { bestW = w; best = r; }
      }
      if (best) { Solver.commit(T, best.v); for (const c of model.comps) if (c.type === 'cap') T.capMem[c.id] = T.map[c.id][0].vprev; }
      return { v: accV, I: e => accI.get(e) || 0 };
    }

    function readings(res, dt) {
      const T = topo, v = res.v;
      let changedTopo = false;
      for (const c of model.comps) {
        const els = T.map[c.id], n = c._nodes, e = els[0];
        let V = v[n[0]] - v[n[n.length - 1]], I = res.I(e), extra = {};
        if (c.type === 'npn') { V = v[n[2]] - v[n[0]]; extra.ib = e.ib || 0; extra.vbe = v[n[1]] - v[n[0]]; }
        if (c.type === 'cmp') { extra.out = v[n[3]] - v[T.gnd]; V = extra.out; }
        if (c.type === 'pot') { V = v[n[1]] - v[T.gnd]; I = res.I(els[0]); }
        const r = { V, I, ...extra };
        if (c.type === 'led') r.b = c.burnt ? 0 : Math.max(0, Math.min(1, I / 0.015));
        if (c.type === 'motor') r.speed = Math.max(0, Math.min(1, I / 0.25));
        live[c.id] = r;
        // daños
        if (c.type === 'led' && !c.burnt && I > 0.045) { c.burnt = true; changedTopo = true; cb.toast && cb.toast('¡Has quemado un LED! Le pasaban ' + fmtI(I) + '. Pon una resistencia en serie.'); }
        if (c.type === 'res' && !c.burnt && I * I * c.val > 0.6) { c.burnt = true; changedTopo = true; cb.toast && cb.toast('La resistencia de ' + fmtR(c.val) + ' se ha quemado: disipaba ' + (I * I * c.val).toFixed(1).replace('.', ',') + ' W y aguanta ¼ W.'); }
        // estadísticas para retos
        const s = stats.comps[c.id] || (stats.comps[c.id] = { maxI: 0, onT: 0, offT: 0, maxB: 0, minB: 1, onPressed: false, offReleased: false, onReleased: false, after: 0, maxAfter: 0, toggles: 0, lit: null });
        s.maxI = Math.max(s.maxI, Math.abs(I));
        if (c.type === 'led') {
          if (r.b > 0.25) s.onT += dt; else s.offT += dt;
          s.maxB = Math.max(s.maxB, r.b); s.minB = Math.min(s.minB, r.b);
          const anyPressed = model.comps.some(o => o.type === 'push' && o.pressed);
          if (anyPressed && r.b > 0.25) s.onPressed = true;
          if (!anyPressed && r.b < 0.1 && stats.t > 0.3) s.offReleased = true;
          if (!anyPressed && r.b > 0.25 && stats.t > 0.3) s.onReleased = true;
          const litNow = r.b > 0.25; if (s.lit !== null && litNow !== s.lit) s.toggles++; s.lit = litNow;
          if (!anyPressed && r.b > 0.15) { s.after += dt; s.maxAfter = Math.max(s.maxAfter, s.after); } else s.after = 0;
        }
      }
      if (cfg.battery && topo.map.battery) { const ib = res.I(topo.map.battery[0]); live.battery = { I: ib }; shortWarn = ib > 0.8; }
      if (uno) for (const p of GPIO) { const e = topo.ardEls[p.name]; if (e) uno.setInput(board.mcu === 'avr' ? p : p.name, v[e.a] - v[topo.gnd]); }
      updateICs(v);
      live._v = v;
      stats.t += dt;
      if (changedTopo) { buildTopo(); save(); }
    }

    function frame(t) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016); lastT = t;
      if (document.hidden) return;
      let simDt = dt;
      if (uno) { try { const r = board.mcu === 'avr' ? uno.run(dt, 11) : uno.run(dt); pinsNow = r.pins; simDt = r.simSec; simSpeed = r.simSec / dt; } catch (e) { unoErr = String(e); uno = null; } }
      const res = solveFrame(simDt);
      readings(res, simDt);
      paintLive();
      if (cb.onTick) cb.onTick(api);
    }

    /* ----- dibujo ----- */
    function boardSVG() {
      let s = `<rect x="${BOARD.x}" y="${BOARD.y}" width="${BOARD.w}" height="${BOARD.h}" rx="10" class="bb"/>`;
      s += `<rect x="${BOARD.x + 6}" y="176" width="${BOARD.w - 12}" height="12" rx="3" class="bbgap"/>`;
      s += `<path d="M${X0 - 6} 12h${(COLS - 1) * P + 12}M${X0 - 6} 352h${(COLS - 1) * P + 12}" class="rail-r"/><path d="M${X0 - 6} 52h${(COLS - 1) * P + 12}M${X0 - 6} 312h${(COLS - 1) * P + 12}" class="rail-b"/>`;
      for (let r = 0; r < ROWS.length; r++) for (let c = 0; c < COLS; c++) s += `<rect x="${hx(c) - 3.5}" y="${ROWY[r] - 3.5}" width="7" height="7" rx="1.5" class="hole"/>`;
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].forEach((l, i) => s += `<text x="16" y="${ROWY[i + 2] + 4}" class="lbl">${l}</text>`);
      for (let c = 0; c < COLS; c += 5) s += `<text x="${hx(c)}" y="72" class="lbl" text-anchor="middle">${c + 1}</text>`;
      s += `<text x="14" y="26" class="lbl rplus">+</text><text x="14" y="46" class="lbl">−</text><text x="14" y="326" class="lbl rplus">+</text><text x="14" y="346" class="lbl">−</text>`;
      if (cfg.battery) {
        s += `<g class="battery"><rect x="-96" y="132" width="88" height="140" rx="8" class="bat"/><rect x="-96" y="132" width="88" height="40" rx="8" class="batcap"/><text x="-52" y="215" text-anchor="middle" class="batlab">${String(cfg.battery).replace('.', ',')} V</text></g>`;
      }
      if (board && !board.onboard) {
        const ax = 70, ay = -250;
        s += `<g class="uno"><rect x="${ax}" y="${ay}" width="380" height="226" rx="10" class="unob"/>
          <rect x="${ax - 14}" y="${ay + 40}" width="44" height="54" rx="3" class="unousb"/><rect x="${ax - 10}" y="${ay + 140}" width="40" height="46" rx="4" class="unojack"/>
          <rect x="${ax + 160}" y="${ay + 96}" width="150" height="36" rx="3" class="unochip"/><text x="${ax + 235}" y="${ay + 119}" text-anchor="middle" class="unochiplab">ATmega328P</text>
          <text x="${ax + 330}" y="${ay + 80}" class="unolab">UNO</text>
          <rect x="${ax + 50}" y="${ay + 186}" width="300" height="20" rx="2" class="hdr"/><rect x="${ax + 110}" y="${ay + 14}" width="210" height="20" rx="2" class="hdr"/>
          <circle cx="${ax + 98}" cy="${ay + 160}" r="5" class="l13" id="l13"/><text x="${ax + 108}" y="${ay + 164}" class="unosm">L</text></g>`;
      }
      if (board && board.onboard) {
        const x1 = X0 + board.c0 * P - 14, x2 = X0 + (board.c0 + 14) * P + 14, y1 = ROWY[board.rows[0]] - 16, y2 = ROWY[board.rows[1]] + 16;
        s += `<g class="nano"><rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="6" fill="${board.color}"/>`;
        if (board.mcu === 'avr') s += `<rect x="${x1 - 16}" y="${(y1 + y2) / 2 - 14}" width="22" height="28" rx="3" class="unousb"/><rect x="${x2 - 70}" y="${(y1 + y2) / 2 - 13}" width="26" height="26" rx="2" class="unochip" transform="rotate(45 ${x2 - 57} ${(y1 + y2) / 2})"/>`;
        else s += `<rect x="${x1 - 14}" y="${(y1 + y2) / 2 - 12}" width="20" height="24" rx="3" class="unousb"/><rect x="${x2 - 92}" y="${y1 + 18}" width="84" height="${y2 - y1 - 36}" rx="3" fill="#BFC4C9"/><text x="${x2 - 50}" y="${(y1 + y2) / 2 + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="#333">WROOM</text>`;
        s += `<text x="${x1 + 70}" y="${(y1 + y2) / 2 + 6}" class="unolab" style="font-size:16px">${board.label}</text><circle cx="${x1 + 40}" cy="${(y1 + y2) / 2}" r="4" class="l13" id="l13"/></g>`;
        for (const [id, t] of Object.entries(terms)) if (t.hole) s += `<rect x="${t.x - 4}" y="${t.y - 4}" width="8" height="8" rx="1" fill="#D4AF37"/><text x="${t.x}" y="${t.y + (t.y < 180 ? 13 : -8)}" text-anchor="middle" class="pinlab" style="font-size:7px">${t.lab.replace(/GND\d/, 'GND').replace('RST2', 'RST')}</text>`;
      }
      for (const [id, t] of Object.entries(terms)) {
        if (t.hole) continue;
        s += `<circle cx="${t.x}" cy="${t.y}" r="${id.startsWith('ard') ? 5 : 7}" class="term ${id.startsWith('bat') ? (id === 'bat+' ? 'tp' : 'tn') : ''}"/>`;
        if (id.startsWith('ard')) s += `<text x="${t.x}" y="${t.y + (t.y > -100 ? -10 : 18)}" class="pinlab" transform="rotate(${t.y > -100 ? -60 : 60} ${t.x} ${t.y + (t.y > -100 ? -10 : 18)})">${t.lab}</text>`;
        else s += `<text x="${t.x}" y="${t.y - 12}" text-anchor="middle" class="lbl ${id === 'bat+' ? 'rplus' : ''}">${t.lab}</text>`;
      }
      return s;
    }
    function compSVG(c) {
      const hs = pinHoles(c).map(([x, y]) => ({ x: hx(x), y: ROWY[y] }));
      const a = hs[0], b = hs[hs.length - 1], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, len = Math.hypot(b.x - a.x, b.y - a.y);
      const isSel = sel && sel.kind === 'comp' && sel.id === c.id;
      let body = '';
      const legs = hs.map(h => `<circle cx="${h.x}" cy="${h.y}" r="3" class="leg"/>`).join('');
      const tr = `translate(${mx} ${my}) rotate(${ang})`;
      switch (c.type) {
        case 'res': { const [d1, d2, m] = bands(c.val);
          body = `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="lead"/><g transform="${tr}"><rect x="-17" y="-6.5" width="34" height="13" rx="6" class="resb ${c.burnt ? 'burnt' : ''}"/>${[d1, d2, m].map((d, i) => `<rect x="${-11 + i * 6}" y="-6.5" width="3.4" height="13" fill="${BANDHEX[d]}"/>`).join('')}<rect x="9" y="-6.5" width="3.4" height="13" fill="#C9A227"/></g>`; break; }
        case 'led': { const col = LEDC[c.color].hex;
          body = `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="lead"/><g transform="${tr}"><circle r="22" class="glow" data-glow="${c.id}" fill="${col}" opacity="0"/><circle r="9" fill="${col}" class="ledb ${c.burnt ? 'burnt' : ''}" data-ledb="${c.id}"/><path d="M5 -8.2a9 9 0 0 1 0 16.4" class="flat"/><text y="3.5" x="-3" class="ledk">+</text></g>${c.burnt ? `<text x="${mx}" y="${my - 14}" text-anchor="middle" class="smoke">💨</text>` : ''}`; break; }
        case 'push': body = `<g transform="${tr}"><rect x="-${len / 2 + 6}" y="-12" width="${len + 12}" height="24" rx="3" class="pushb"/><circle r="8" class="pushk ${c.pressed ? 'down' : ''}" data-pk="${c.id}"/></g>`; break;
        case 'sw': body = `<g transform="${tr}"><rect x="-${len / 2 + 4}" y="-9" width="${len + 8}" height="18" rx="3" class="pushb"/><rect x="${c.on ? 2 : -14}" y="-6" width="12" height="12" rx="2" class="swk"/></g>`; break;
        case 'cap': body = `<g transform="${tr}"><circle r="12" class="capb"/><path d="M-12 0a12 12 0 0 1 0 0" /><rect x="6" y="-11" width="4" height="22" class="capst"/></g><text x="${mx}" y="${my + 4}" text-anchor="middle" class="tinylab">${c.val}µ</text>`; break;
        case 'diode': case 'zener': body = `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="lead"/><g transform="${tr}"><rect x="-13" y="-5.5" width="26" height="11" rx="2" class="${c.type === 'zener' ? 'zb' : 'db'}"/><rect x="7" y="-5.5" width="3.5" height="11" class="dband"/></g>`; break;
        case 'pot': body = `<g transform="${tr}"><rect x="-${len / 2 + 8}" y="-15" width="${len + 16}" height="30" rx="4" class="potb"/><circle r="10" class="potk"/><line x1="0" y1="0" x2="${8 * Math.cos((c.pos * 270 - 225) * Math.PI / 180)}" y2="${8 * Math.sin((c.pos * 270 - 225) * Math.PI / 180)}" class="potl"/></g>`; break;
        case 'ldr': body = `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="lead"/><g transform="${tr}"><circle r="11" class="ldrb"/><path d="M-6 -4h4v4h4v4h4" class="ldrs"/></g>`; break;
        case 'npn': body = `<g transform="${tr}"><path d="M-26 6h52v-8a26 12 0 0 0 -52 0z" class="npnb"/><text y="2" text-anchor="middle" class="npnl">NPN</text></g><text x="${a.x}" y="${a.y + 16}" text-anchor="middle" class="tinylab">E</text><text x="${hs[1].x}" y="${hs[1].y + 16}" text-anchor="middle" class="tinylab">B</text><text x="${b.x}" y="${b.y + 16}" text-anchor="middle" class="tinylab">C</text>`; break;
        case 'cmp': body = `<g transform="${tr}"><rect x="-${len / 2 + 8}" y="-12" width="${len + 16}" height="24" rx="3" class="icb"/><text y="4" text-anchor="middle" class="npnl">CMP</text></g>` + ['+', '−', 'V', 'S'].map((l, i) => `<text x="${hs[i].x}" y="${hs[i].y + 18}" text-anchor="middle" class="tinylab">${l}</text>`).join(''); break;
        case 'ic555': case 'ic7400': { const n = PARTS[c.type].dip, xs = hs[0].x, xe = hs[n / 2 - 1].x;
          body = `<rect x="${xs - 10}" y="${ROWY[6] - 2}" width="${xe - xs + 20}" height="${ROWY[7] - ROWY[6] + 4}" rx="3" class="icb"/><path d="M${xs - 10} ${(ROWY[6] + ROWY[7]) / 2 - 6}a6 6 0 0 1 0 12" fill="#555"/><text x="${(xs + xe) / 2}" y="${(ROWY[6] + ROWY[7]) / 2 + 4}" text-anchor="middle" class="npnl" style="font-size:10px">${c.type === 'ic555' ? 'NE555' : '74HC00'}</text>` + hs.map((h, i) => `<text x="${h.x}" y="${h.y + (i < n / 2 ? 16 : -9)}" text-anchor="middle" class="tinylab">${i + 1}</text>`).join(''); break; }
        case 'motor': body = `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="lead"/><g transform="${tr}"><circle r="17" class="motb"/><g data-rot="${c.id}"><path d="M0 -12v24M-12 0h24" class="motl"/></g></g>`; break;
      }
      return `<g class="comp ${isSel ? 'sel' : ''}" data-comp="${c.id}">${isSel ? `<rect x="${Math.min(a.x, b.x) - 16}" y="${Math.min(a.y, b.y) - 16}" width="${Math.abs(b.x - a.x) + 32}" height="${Math.abs(b.y - a.y) + 32}" rx="8" class="selbox"/>` : ''}${body}${legs}</g>`;
    }
    function wireSVG(w, i) {
      const a = pos(w.a), b = pos(w.b); if (!a || !b) return '';
      const d = Math.hypot(b.x - a.x, b.y - a.y), lift = Math.min(60, 10 + d * 0.18);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - lift;
      const isSel = sel && sel.kind === 'wire' && sel.i === i;
      return `<g data-wire="${i}"><path d="M${a.x} ${a.y}Q${mx} ${my} ${b.x} ${b.y}" class="wirehit"/><path d="M${a.x} ${a.y}Q${mx} ${my} ${b.x} ${b.y}" stroke="${w.color}" class="wire ${isSel ? 'wsel' : ''}"/><circle cx="${a.x}" cy="${a.y}" r="3.6" fill="${w.color}"/><circle cx="${b.x}" cy="${b.y}" r="3.6" fill="${w.color}"/></g>`;
    }
    function draw() {
      svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.x2 - vb.x} ${vb.y2 - vb.y}`);
      svg.setAttribute('width', Math.round((vb.x2 - vb.x) * zoom)); svg.setAttribute('height', Math.round((vb.y2 - vb.y) * zoom));
      let s = boardSVG();
      s += model.comps.map(compSVG).join('');
      s += model.wires.map(wireSVG).join('');
      if (wireStart) { const p = pos(wireStart); s += `<circle cx="${p.x}" cy="${p.y}" r="9" class="pick"/>`; }
      if (meas && meas.pt) { const p = pos(meas.pt); s += `<circle cx="${p.x}" cy="${p.y}" r="9" class="probe"/>`; }
      svg.innerHTML = s;
      inspector();
    }
    function paintLive() {
      for (const c of model.comps) {
        const r = live[c.id]; if (!r) continue;
        if (c.type === 'led') {
          const g = svg.querySelector(`[data-glow="${c.id}"]`), b = svg.querySelector(`[data-ledb="${c.id}"]`);
          if (g) g.setAttribute('opacity', (r.b * 0.7).toFixed(2));
          if (b) b.style.filter = `brightness(${(0.45 + r.b * 0.9).toFixed(2)})`;
        }
        if (c.type === 'motor') { const g = svg.querySelector(`[data-rot="${c.id}"]`); if (g) { c._a = ((c._a || 0) + r.speed * 25) % 360; g.setAttribute('transform', `rotate(${c._a})`); } }
      }
      if (uno && pinsNow) { const l = svg.querySelector('#l13'), pl = board.mcu === 'avr' ? pinsNow.D13 : pinsNow.D2; if (l && pl) l.classList.toggle('on', pl.frac > 0.5); }
      if (meas || (sel && sel.kind === 'comp')) inspectorLive();
      const warn = root.querySelector('.shortw');
      if (shortWarn && !warn) { const d = document.createElement('div'); d.className = 'shortw'; d.textContent = 'Cortocircuito: la pila entrega más de 0,8 A. Revisa los cables.'; root.querySelector('.simwrap').appendChild(d); }
      else if (!shortWarn && warn) warn.remove();
      if (threeView) threeView.update(live);
    }

    /* ----- inspector ----- */
    function inspector() {
      if (mode === 'wire') { insp.innerHTML = `<p><b>Cable:</b> ${wireStart ? 'ahora toca el destino.' : 'toca un agujero o un terminal de origen.'}</p>`; return; }
      if (mode === 'measure') { insp.innerHTML = `<p><b>Multímetro:</b> toca una pieza para ver su tensión y corriente, o un punto para medir su tensión respecto a GND.</p><p class="mread" id="mread"></p>`; inspectorLive(); return; }
      if (mode === 'place') { insp.innerHTML = `<p><b>${PARTS[placing].name}:</b> toca el agujero donde irá la primera pata (${PARTS[placing].pinNames[0]}).</p><button class="sbtn" data-act="cancel">Cancelar</button>`; return; }
      if (sel && sel.kind === 'wire') { insp.innerHTML = `<p><b>Cable</b></p><div class="ibtns"><button class="sbtn" data-act="wcolor">Cambiar color</button><button class="sbtn danger" data-act="del">Quitar cable</button></div>`; return; }
      if (sel && sel.kind === 'comp') {
        const c = model.comps.find(x => x.id === sel.id); if (!c) { sel = null; return inspector(); }
        const def = PARTS[c.type];
        let ctl = '';
        if (c.type === 'res') ctl = `<label class="ictl">Valor <select data-f="val">${E12.map(v => `<option value="${v}" ${v === c.val ? 'selected' : ''}>${fmtR(v)}</option>`).join('')}</select></label>`;
        if (c.type === 'cap') ctl = `<label class="ictl">Capacidad <select data-f="val">${CAPS.map(v => `<option value="${v}" ${v === c.val ? 'selected' : ''}>${v} µF</option>`).join('')}</select></label>`;
        if (c.type === 'led') ctl = `<label class="ictl">Color <select data-f="color">${Object.keys(LEDC).map(v => `<option ${v === c.color ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`;
        if (c.type === 'zener') ctl = `<label class="ictl">Tensión zener <select data-f="vz">${[3.3, 4.7, 5.1, 6.2].map(v => `<option value="${v}" ${v === c.vz ? 'selected' : ''}>${String(v).replace('.', ',')} V</option>`).join('')}</select></label>`;
        if (c.type === 'pot') ctl = `<label class="ictl">Posición <input type="range" min="0" max="1" step="0.01" value="${c.pos}" data-f="pos"></label>`;
        if (c.type === 'ldr') ctl = `<label class="ictl">Luz ambiente <input type="range" min="0" max="1" step="0.01" value="${c.light}" data-f="light"></label>`;
        if (c.type === 'push') ctl = `<p class="small">Mantén pulsado el botón en la protoboard para cerrarlo.</p>`;
        if (c.type === 'sw') ctl = `<button class="sbtn" data-act="toggle">${c.on ? 'Apagar' : 'Encender'} interruptor</button>`;
        const pins = def.pinNames.length > 2 || c.type === 'led' || c.type === 'cap' ? `<p class="small">Patas, de la primera a la última: ${def.pinNames.join(', ')}.</p>` : '';
        insp.innerHTML = `<p><b>${def.name}${c.type === 'res' ? ' ' + fmtR(c.val) : ''}</b>${c.burnt ? ' · quemada' : ''}</p><p class="mread" id="mread"></p>${pins}${ctl}
          <div class="ibtns"><button class="sbtn" data-act="rot">Girar</button>${c.burnt ? '<button class="sbtn" data-act="fix">Cambiar por una nueva</button>' : ''}<button class="sbtn danger" data-act="del">Quitar</button></div>`;
        insp.querySelectorAll('[data-f]').forEach(el => el.addEventListener('input', () => {
          const f = el.dataset.f; c[f] = f === 'color' ? el.value : Number(el.value);
          if (f === 'val' || f === 'color' || f === 'vz') { buildTopo(); draw(); } else { buildTopo(); drawComp(c); }
          save();
        }));
        inspectorLive(); return;
      }
      insp.innerHTML = cfg.hint ? `<p class="small">${cfg.hint}</p>` : `<p class="small">Pulsa <b>+ Pieza</b> para añadir componentes y <b>Cable</b> para unir puntos. Toca una pieza para cambiarla.</p>`;
    }
    function drawComp(c) { const g = svg.querySelector(`[data-comp="${c.id}"]`); if (g) g.outerHTML = compSVG(c); }
    function inspectorLive() {
      const el = insp.querySelector('#mread'); if (!el) return;
      if (mode === 'measure' && meas) {
        if (meas.comp) { const c = model.comps.find(x => x.id === meas.comp), r = live[meas.comp]; if (!c || !r) return; el.innerHTML = readingText(c, r); }
        else if (meas.pt && live._v && topo) { const n = topo.nodeOf(meas.pt); el.textContent = n === undefined ? 'Punto sin conectar' : 'Tensión respecto a GND: ' + fmtV(live._v[n] - live._v[topo.gnd]); }
        return;
      }
      if (sel && sel.kind === 'comp') { const c = model.comps.find(x => x.id === sel.id), r = live[sel.id]; if (c && r) el.innerHTML = readingText(c, r); }
    }
    function readingText(c, r) {
      if (c.type === 'npn') return `Corriente de colector ${fmtI(r.I)} · base ${fmtI(r.ib)} · V<sub>CE</sub> ${fmtV(r.V)}`;
      if (c.type === 'cmp') return `Salida: ${fmtV(r.out)}`;
      if (c.type === 'pot') return `Cursor: ${fmtV(r.V)} respecto a GND`;
      if (c.type === 'zener') return `Tensión inversa ${fmtV(-r.V)} · corriente ${fmtI(Math.abs(r.I))}`;
      const p = Math.abs(r.V * r.I);
      return `Tensión ${fmtV(r.V)} · corriente ${fmtI(r.I)}${c.type === 'res' ? ' · potencia ' + (p * 1000).toFixed(0) + ' mW' : ''}`;
    }

    /* ----- bandeja de piezas ----- */
    function showTray() {
      tray.hidden = false;
      tray.innerHTML = `<div class="trayin"><p><b>Añadir pieza</b></p><div class="tgrid">${cfg.parts.map(k => `<button data-p="${k}">${PARTS[k].name}</button>`).join('')}</div>
        ${cfg.sketches ? `<p style="margin-top:12px"><b>Programa de la placa</b></p><div class="tgrid">${cfg.sketches.map(k => `<button data-sk="${k}" ${k === sketch ? 'aria-pressed="true"' : ''}>${(SKETCHES[k] || ESP_SKETCHES[k]).name}</button>`).join('')}</div>` : ''}
        <button class="sbtn" data-act="closetray" style="margin-top:12px;width:100%">Cerrar</button></div>`;
    }

    /* ----- interacción ----- */
    function svgPoint(ev) { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
    function nearestPoint(p, holesOnly) {
      let best = null, bd = 13;
      const c = Math.round((p.x - X0) / P);
      let r = -1, rd = 1e9; ROWY.forEach((y, i) => { const d = Math.abs(p.y - y); if (d < rd) { rd = d; r = i; } });
      if (c >= 0 && c < COLS) { const d = Math.hypot(p.x - hx(c), p.y - ROWY[r]); if (d < bd) { bd = d; best = holeId(c, r); } }
      if (!holesOnly) for (const [id, t] of Object.entries(terms)) { const d = Math.hypot(p.x - t.x, p.y - t.y); if (d < Math.max(bd, 11)) { bd = d; best = id; } }
      return best;
    }
    function setMode(m) {
      mode = m; wireStart = null; meas = null; if (m !== 'select') sel = null;
      root.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === m || (m === 'place' && false))));
      draw();
    }
    root.querySelector('.simbar').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.m) setMode(b.dataset.m);
      const a = b.dataset.act;
      if (a === 'parts') showTray();
      if (a === 'zin') { zoom = Math.min(2, zoom * 1.25); draw(); }
      if (a === 'zout') { zoom = Math.max(0.35, zoom / 1.25); draw(); }
      if (a === '3d') toggle3D(b);
    });
    tray.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.p) { placing = b.dataset.p; tray.hidden = true; mode = 'place'; root.querySelectorAll('[data-m]').forEach(x => x.setAttribute('aria-pressed', 'false')); draw(); }
      if (b.dataset.sk) { loadSketch(b.dataset.sk); tray.hidden = true; }
      if (b.dataset.act === 'closetray') tray.hidden = true;
    });
    insp.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const a = b.dataset.act;
      if (a === 'cancel') setMode('select');
      if (a === 'del') {
        if (sel.kind === 'comp') model.comps = model.comps.filter(c => c.id !== sel.id); else model.wires.splice(sel.i, 1);
        sel = null; changed();
      }
      if (a === 'wcolor') { const w = model.wires[sel.i]; w.color = WIRECOL[(WIRECOL.indexOf(w.color) + 1) % WIRECOL.length]; changed(); }
      if (a === 'rot') {
        const c = model.comps.find(x => x.id === sel.id);
        for (let k = 1; k <= 4; k++) { const t = { ...c, dir: ((c.dir || 0) + k) % 4 }; if (!validPlacement(t, c.id)) { c.dir = t.dir; break; } if (k === 4) cb.toast && cb.toast('No hay sitio para girarla aquí.'); }
        changed();
      }
      if (a === 'fix') { const c = model.comps.find(x => x.id === sel.id); c.burnt = false; changed(); }
      if (a === 'toggle') { const c = model.comps.find(x => x.id === sel.id); c.on = !c.on; changed(); }
    });
    let pressedComp = null;
    svg.addEventListener('pointerdown', e => {
      if (mode !== 'select') return;
      const g = e.target.closest('[data-comp]'); if (!g) return;
      const c = model.comps.find(x => x.id === g.dataset.comp);
      if (c && c.type === 'push') { c.pressed = true; pressedComp = c; buildTopo(); drawComp(c); try { navigator.vibrate && navigator.vibrate(12); } catch (_) { } }
    });
    const release = () => { if (pressedComp) { pressedComp.pressed = false; buildTopo(); drawComp(pressedComp); pressedComp = null; } };
    window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
    svg.addEventListener('click', e => {
      const p = svgPoint(e);
      if (mode === 'place') {
        const id = nearestPoint(p, true); if (!id) return;
        const [, c, r] = id.split(':').map(Number);
        const comp = { id: 'c' + (nextId++), type: placing, at: PARTS[placing].dip ? [c, 7] : [c, r], dir: 0, ...JSON.parse(JSON.stringify(PARTS[placing].def)) };
        let err = null, ok = false;
        for (let d = 0; d < 4; d++) { comp.dir = d; err = validPlacement(comp); if (!err) { ok = true; break; } }
        if (!ok) { cb.toast && cb.toast(err); return; }
        model.comps.push(comp); mode = 'select'; sel = { kind: 'comp', id: comp.id };
        root.querySelector('[data-m="select"]').setAttribute('aria-pressed', 'true');
        changed(); return;
      }
      if (mode === 'wire') {
        const id = nearestPoint(p); if (!id) return;
        if (!wireStart) { wireStart = id; draw(); return; }
        if (id === wireStart) { wireStart = null; draw(); return; }
        model.wires.push({ a: wireStart, b: id, color: WIRECOL[model.wires.length % WIRECOL.length] });
        wireStart = null; changed(); return;
      }
      if (mode === 'measure') {
        const g = e.target.closest('[data-comp]');
        if (g) meas = { comp: g.dataset.comp }; else { const id = nearestPoint(p); meas = id ? { pt: id } : null; }
        draw(); return;
      }
      const g = e.target.closest('[data-comp]'), w = e.target.closest('[data-wire]');
      if (g) { const c = model.comps.find(x => x.id === g.dataset.comp); if (c && c.type === 'sw' && sel && sel.id === c.id) { c.on = !c.on; changed(); return; } sel = { kind: 'comp', id: g.dataset.comp }; }
      else if (w) sel = { kind: 'wire', i: +w.dataset.wire };
      else sel = null;
      draw();
    });

    function changed() { buildTopo(); draw(); save(); }
    function save() { cb.onChange && cb.onChange(JSON.parse(JSON.stringify({ comps: model.comps.map(c => { const o = { ...c }; delete o._nodes; delete o.pressed; delete o._a; delete o._q; delete o._g; delete o._vcc; return o; }), wires: model.wires, sketch }))); }

    function loadSketch(k) {
      sketch = k; unoErr = null;
      try { uno = board.mcu === 'avr' ? new Uno(SKETCHES[k].hex) : new EspModel(k); } catch (e) { unoErr = String(e); uno = null; }
      stats.t = 0; stats.comps = {};
      cb.onSketch && cb.onSketch(k);
      save();
    }

    /* ----- 3D ----- */
    let threeView = null;
    function toggle3D(btn) {
      if (threeView) { threeView.destroy(); threeView = null; btn.setAttribute('aria-pressed', 'false'); wrap.hidden = false; return; }
      btn.setAttribute('aria-pressed', 'true');
      const holder = document.createElement('div'); holder.className = 'three'; wrap.after(holder); wrap.hidden = true;
      holder.innerHTML = '<p class="small" style="padding:16px">Cargando vista 3D…</p>';
      View3D.create(holder, { model, terms, cfg, board, pinHoles, pos, hx, ROWY, BOARD, LEDC, BANDHEX, bands, PARTS }).then(v => { threeView = v; v.destroyHolder = () => holder.remove(); const d = v.destroy; v.destroy = () => { d(); holder.remove(); }; })
        .catch(() => { holder.innerHTML = '<p class="small" style="padding:16px">No se pudo cargar la vista 3D. Comprueba tu conexión.</p>'; setTimeout(() => { holder.remove(); wrap.hidden = false; btn.setAttribute('aria-pressed', 'false'); }, 2500); });
    }

    /* ----- API para retos ----- */
    const api = {
      model, live, stats, cfg,
      comps: t => model.comps.filter(c => !t || c.type === t),
      onArduinoPin(c, pinIdx, name) { return topo && topo.nodeOf('ard:' + name) === c._nodes[pinIdx]; },
      pinV(c, i) { return live._v ? live._v[c._nodes[i]] - live._v[topo.gnd] : 0; },
      nodeVoltage(id) { const n = topo.nodeOf(id); return n === undefined ? null : live._v[n] - live._v[topo.gnd]; },
      sameNode(c, pinIdx, termId) { return topo && topo.nodeOf(termId) === c._nodes[pinIdx]; },
      // Resuelve el circuito con estados forzados (pulsadores, luz…) sin tocar el estado visible
      probe(setup) {
        const saved = model.comps.map(c => ({ pressed: c.pressed, on: c.on, light: c.light, pos: c.pos }));
        const memIC = model.comps.map(c => ({ _q: c._q, _g: c._g, _vcc: c._vcc }));
        setup(model.comps);
        const memTopo = topo; topo = { ...topo, capMem: {} }; buildTopo(); topo.dt = 1e3;
        // estado estacionario: condensadores sin carga temporal
        topo.els.forEach(e => { if (e.t === 'C') e.c = 1e-12; });
        let r = Solver.solve(topo);
        for (let k = 0; k < 8 && updateICs(r.v); k++) r = Solver.solve(topo);
        const out = {};
        for (const c of model.comps) { const els = topo.map[c.id]; out[c.id] = { I: els[0].i, V: r.v[c._nodes[0]] - r.v[c._nodes[c._nodes.length - 1]], ib: els[0].ib }; }
        model.comps.forEach((c, i) => Object.assign(c, saved[i]));
        memIC.forEach((m, i) => Object.assign(model.comps[i], m));
        topo = memTopo; buildTopo();
        return out;
      },
      resetStats() { stats.t = 0; stats.comps = {}; },
      sketch: () => sketch, speed: () => simSpeed, error: () => unoErr
    };

    buildTopo(); draw();
    if (cfg.arduino) { const want = cfg.sketches && cfg.initial && cfg.initial.sketch; loadSketch(want && cfg.sketches.includes(want) ? want : (typeof cfg.arduino === 'string' ? cfg.arduino : 'blink')); }
    raf = requestAnimationFrame(frame);
    api.destroy = () => { cancelAnimationFrame(raf); window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); if (threeView) threeView.destroy(); };
    api.redraw = draw;
    return api;
  }

  return { open, PARTS, fmtI, fmtV, fmtR, LEDC };
})();
