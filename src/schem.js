/* Voltio · símbolos de esquema. Cada símbolo de 2 terminales mide 60 de largo
   (terminales en x-30 y x+30) y se gira con rot (grados). */
const Schem = (() => {
  const st = 'stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const arrowsOut = (x, y) => `<path d="M${x} ${y}l8 -8m-4 0h4v4M${x + 7} ${y + 3}l8 -8m-4 0h4v4" ${st} stroke-width="1.6"/>`;
  const arrowsIn = (x, y) => `<path d="M${x + 8} ${y - 8}l-8 8m4 0h-4v-4M${x + 15} ${y - 5}l-8 8m4 0h-4v-4" ${st} stroke-width="1.6"/>`;
  const S = {
    res: () => `<path d="M-30 0h10l3 -7l6 14l6 -14l6 14l6 -14l6 14l3 -7h10" ${st}/>`,
    diode: () => `<path d="M-30 0h20M10 0h20M-10 -10v20l20 -10z M10 -10v20" ${st}/>`,
    led: () => S.diode() + arrowsOut(4, -14),
    zener: () => `<path d="M-30 0h20M10 0h20M-10 -10v20l20 -10z M6 -13l4 3v20l4 3" ${st}/>`,
    cap: () => `<path d="M-30 0h26M4 0h26M-4 -12v24M4 -12v24" ${st}/>`,
    ecap: () => `<path d="M-30 0h26M4 0h26M-4 -12v24M6 -12q-4 12 0 24" ${st}/><text x="-14" y="-10" font-size="11" fill="currentColor">+</text>`,
    bat: () => `<path d="M-30 0h26M4 0h26M-4 -14v28M4 -7v14" ${st}/><text x="-16" y="-12" font-size="12" fill="currentColor">+</text>`,
    sw: () => `<path d="M-30 0h14M16 0h14M-16 0l28 -12" ${st}/><circle cx="-16" cy="0" r="2.5" fill="currentColor"/><circle cx="16" cy="0" r="2.5" fill="currentColor"/>`,
    push: () => `<path d="M-30 0h16M14 0h16M-14 -8h28M0 -8v-8M-6 -16h12" ${st}/><circle cx="-14" cy="0" r="2.5" fill="currentColor"/><circle cx="14" cy="0" r="2.5" fill="currentColor"/>`,
    lamp: () => `<path d="M-30 0h18M12 0h18M-8 -8l16 16M8 -8l-16 16" ${st}/><circle r="12" ${st}/>`,
    motor: () => `<path d="M-30 0h18M12 0h18" ${st}/><circle r="12" ${st}/><text x="-5" y="5" font-size="13" font-weight="700" fill="currentColor">M</text>`,
    ldr: () => S.res() + arrowsIn(-12, -20),
    pot: () => S.res() + `<path d="M0 22v-12M-4 15l4 -6l4 6" ${st}/>`,
    fuse: () => `<path d="M-30 0h30" ${st}/><rect x="-14" y="-6" width="28" height="12" ${st}/>`,
    // Terminales: B (x-30,y), C (x+10,y-30), E (x+10,y+30)
    npn: () => `<circle cx="4" cy="0" r="18" ${st}/><path d="M-30 0h24M-6 -12v24M-6 -6l16 -12v-12M-6 6l16 12v12" ${st}/><path d="M10 18l-7 -1l3 -5z" fill="currentColor"/>`,
    // Terminales: G (x-30,y+8), D (x+10,y-30), S (x+10,y+30)
    nmos: () => `<path d="M-30 8h20v-16M-4 -16v8M-4 -4v8M-4 8v8M-4 -12h14v-18M-4 12h14v18M-4 0h14v12" ${st}/><path d="M-4 0l7 -4v8z" fill="currentColor"/>`,
    gnd: () => `<path d="M0 -12v12M-12 0h24M-8 5h16M-4 10h8" ${st}/>`,
    vcc: (lab) => `<path d="M0 12v-12M-8 0h16" ${st}/><text x="0" y="-6" font-size="12" text-anchor="middle" fill="currentColor">${lab || '+V'}</text>`,
    // Comparador / amp. op.: + (x-30,y-10), − (x-30,y+10), salida (x+30,y)
    opamp: () => `<path d="M-18 -22v44l36 -22z M-30 -10h12M-30 10h12M18 0h12" ${st}/><text x="-15" y="-6" font-size="12" fill="currentColor">+</text><text x="-14" y="15" font-size="13" fill="currentColor">−</text>`,
    // Chip genérico de 8 patas
    ic8: (lab) => `<rect x="-24" y="-30" width="48" height="60" rx="3" ${st}/><text x="0" y="5" font-size="12" text-anchor="middle" fill="currentColor">${lab || 'CI'}</text>` + [-20, -7, 7, 20].map(y => `<path d="M-34 ${y}h10M24 ${y}h10" ${st}/>`).join(''),
    node: () => `<circle r="3.5" fill="currentColor"/>`
  };
  function part(p) {
    const body = S[p.k](p.lab2);
    const vert = Math.abs(p.rot || 0) === 90, custom = p.lx != null;
    const anchor = custom ? (p.lx < 0 ? 'end' : p.lx > 0 ? 'start' : 'middle') : vert ? 'start' : 'middle';
    const lab = p.lab ? `<text x="${custom ? p.lx : vert ? 18 : 0}" y="${p.ly ?? (vert ? 4 : -16)}" font-size="12.5" text-anchor="${anchor}" fill="currentColor" font-family="var(--body)">${p.lab}</text>` : '';
    return `<g transform="translate(${p.x} ${p.y})"><g transform="rotate(${p.rot || 0})">${body}</g>${lab}</g>`;
  }
  function draw(spec, opts = {}) {
    const w = spec.w || 300, h = spec.h || 160;
    const wires = (spec.wires || []).map(pts => `<polyline points="${pts.join(' ')}" ${st}/>`).join('');
    const parts = (spec.parts || []).map(part).join('');
    const dots = (spec.dots || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="currentColor"/>`).join('');
    const txt = (spec.text || []).map(([x, y, t]) => `<text x="${x}" y="${y}" font-size="12" fill="currentColor" font-family="var(--body)">${t}</text>`).join('');
    return `<svg class="schem" viewBox="-14 -14 ${w + 28} ${h + 28}" width="${opts.width || w}" role="img" aria-label="${opts.label || 'Esquema'}" style="max-width:100%;color:var(--ink)">${wires}${parts}${dots}${txt}</svg>`;
  }
  function symbol(k, lab2) { return `<svg viewBox="-45 -38 90 76" width="120" style="color:var(--ink);display:block;margin:0 auto" aria-hidden="true">${S[k](lab2)}</svg>`; }
  return { draw, symbol };
})();

/* Esquemas reutilizables */
const SCH = {
  ledBasic: { w: 280, h: 150, parts: [{ k: 'bat', x: 40, y: 75, rot: 90, lab: '9 V', lx: -18, ly: 4 }, { k: 'res', x: 140, y: 25, lab: 'R 470 Ω' }, { k: 'led', x: 240, y: 75, rot: 90, lab: 'LED' }],
    wires: [[40, 45, 40, 25, 110, 25], [170, 25, 240, 25, 240, 45], [240, 105, 240, 130, 40, 130, 40, 105]] },
  ledNoRes: { w: 280, h: 150, parts: [{ k: 'bat', x: 40, y: 75, rot: 90, lab: '9 V', lx: -18, ly: 4 }, { k: 'led', x: 240, y: 75, rot: 90, lab: 'LED' }],
    wires: [[40, 45, 40, 25, 240, 25, 240, 45], [240, 105, 240, 130, 40, 130, 40, 105]] },
  ledReversed: { w: 280, h: 150, parts: [{ k: 'bat', x: 40, y: 75, rot: 90, lab: '9 V', lx: -18, ly: 4 }, { k: 'res', x: 140, y: 25, lab: 'R 470 Ω' }, { k: 'led', x: 240, y: 75, rot: -90, lab: 'LED' }],
    wires: [[40, 45, 40, 25, 110, 25], [170, 25, 240, 25, 240, 45], [240, 105, 240, 130, 40, 130, 40, 105]] },
  flashlight: { w: 320, h: 150, parts: [{ k: 'bat', x: 40, y: 75, rot: 90, lab: '9 V', lx: -18, ly: 4 }, { k: 'sw', x: 110, y: 25, lab: 'S1' }, { k: 'res', x: 200, y: 25, lab: 'R1 470 Ω' }, { k: 'led', x: 280, y: 75, rot: 90, lab: 'D1' }],
    wires: [[40, 45, 40, 25, 80, 25], [140, 25, 170, 25], [230, 25, 280, 25, 280, 45], [280, 105, 280, 130, 40, 130, 40, 105]] },
  divider: { w: 260, h: 200, parts: [{ k: 'bat', x: 40, y: 100, rot: 90, lab: '9 V', lx: -18, ly: 4 }, { k: 'res', x: 150, y: 60, rot: 90, lab: 'R1' }, { k: 'res', x: 150, y: 140, rot: 90, lab: 'R2' }],
    wires: [[40, 70, 40, 20, 150, 20, 150, 30], [150, 90, 150, 110], [150, 100, 220, 100], [150, 170, 150, 185, 40, 185, 40, 130]], dots: [[150, 100]], text: [[200, 92, 'Vsal']] },
  series3: { w: 320, h: 130, parts: [{ k: 'bat', x: 30, y: 65, rot: 90, lab: 'V' , lx: -18, ly: 4}, { k: 'res', x: 100, y: 20, lab: 'R1' }, { k: 'res', x: 180, y: 20, lab: 'R2' }, { k: 'res', x: 260, y: 20, lab: 'R3' }],
    wires: [[30, 35, 30, 20, 70, 20], [130, 20, 150, 20], [210, 20, 230, 20], [290, 20, 305, 20, 305, 115, 30, 115, 30, 95]] },
  parallel2: { w: 280, h: 160, parts: [{ k: 'bat', x: 40, y: 80, rot: 90, lab: 'V', lx: -18, ly: 4 }, { k: 'res', x: 150, y: 80, rot: 90, lab: 'R1' }, { k: 'res', x: 230, y: 80, rot: 90, lab: 'R2' }],
    wires: [[40, 50, 40, 25, 230, 25, 230, 50], [150, 25, 150, 50], [150, 110, 150, 140], [40, 110, 40, 140, 230, 140, 230, 110]], dots: [[150, 25], [150, 140]] },
  andSw: { w: 330, h: 150, parts: [{ k: 'bat', x: 40, y: 75, rot: 90, lab: '9 V', lx: -18, ly: 4 }, { k: 'push', x: 105, y: 25, lab: 'A' }, { k: 'push', x: 175, y: 25, lab: 'B' }, { k: 'res', x: 245, y: 25, lab: '470 Ω' }, { k: 'led', x: 300, y: 85, rot: 90 }],
    wires: [[40, 45, 40, 25, 75, 25], [135, 25, 145, 25], [205, 25, 215, 25], [275, 25, 300, 25, 300, 55], [300, 115, 300, 135, 40, 135, 40, 105]] },
  orSw: { w: 330, h: 190, parts: [{ k: 'bat', x: 40, y: 95, rot: 90, lab: '9 V', lx: -18, ly: 4 }, { k: 'push', x: 130, y: 25, lab: 'A' }, { k: 'push', x: 130, y: 85, lab: 'B' }, { k: 'res', x: 235, y: 25, lab: '470 Ω' }, { k: 'led', x: 295, y: 105, rot: 90 }],
    wires: [[40, 65, 40, 25, 100, 25], [80, 25, 80, 85, 100, 85], [160, 25, 205, 25], [160, 85, 185, 85, 185, 25], [265, 25, 295, 25, 295, 75], [295, 135, 295, 170, 40, 170, 40, 125]], dots: [[80, 25], [185, 25]] },
  npnSwitch: { w: 320, h: 210, parts: [{ k: 'vcc', x: 220, y: 22, lab2: '+9 V' }, { k: 'res', x: 220, y: 60, rot: 90, lab: 'RC 470 Ω' }, { k: 'led', x: 220, y: 120, rot: 90 }, { k: 'npn', x: 210, y: 175, lab: 'Q1', lx: 40, ly: 4 }, { k: 'res', x: 120, y: 175, lab: 'RB 10 kΩ' }, { k: 'push', x: 50, y: 135, rot: 90, lab: 'S1' }, { k: 'vcc', x: 50, y: 92, lab2: '+9 V' }, { k: 'gnd', x: 220, y: 222 }],
    wires: [[220, 30, 220, 34], [220, 90, 220, 94], [220, 150, 220, 145], [180, 175, 150, 175], [90, 175, 50, 175, 50, 165], [50, 105, 50, 104], [220, 205, 220, 210]] },
  rcDelay: { w: 320, h: 170, parts: [{ k: 'bat', x: 30, y: 85, rot: 90, lab: '9 V', lx: -18, ly: 4 }, { k: 'push', x: 95, y: 25, lab: 'S1' }, { k: 'ecap', x: 160, y: 85, rot: 90, lab: 'C 470 µF' }, { k: 'res', x: 225, y: 25, lab: 'R 1 kΩ' }, { k: 'led', x: 285, y: 85, rot: 90 }],
    wires: [[30, 55, 30, 25, 65, 25], [125, 25, 195, 25], [160, 25, 160, 55], [255, 25, 285, 25, 285, 55], [285, 115, 285, 150, 30, 150, 30, 115], [160, 115, 160, 150]], dots: [[160, 25], [160, 150]] },
  zenerReg: { w: 300, h: 170, parts: [{ k: 'bat', x: 40, y: 85, rot: 90, lab: '9 V', lx: -18, ly: 4 }, { k: 'res', x: 130, y: 25, lab: 'R 220 Ω' }, { k: 'zener', x: 200, y: 85, rot: -90, lab: 'DZ 5,1 V' }],
    wires: [[40, 55, 40, 25, 100, 25], [160, 25, 270, 25], [200, 25, 200, 55], [200, 115, 200, 150], [40, 115, 40, 150, 270, 150]], dots: [[200, 25], [200, 150]], text: [[250, 18, 'Vsal']] },
  darkSensor: { w: 320, h: 230, parts: [{ k: 'vcc', x: 60, y: 22, lab2: '+9 V' }, { k: 'res', x: 60, y: 65, rot: 90, lab: 'R1 10 kΩ' }, { k: 'ldr', x: 60, y: 160, rot: 90, lab: 'LDR' }, { k: 'res', x: 140, y: 115, lab: 'RB 10 kΩ' }, { k: 'npn', x: 230, y: 115, lab: 'Q1', lx: 40, ly: 4 }, { k: 'led', x: 240, y: 55, rot: 90 }, { k: 'res', x: 240, y: 0, rot: 90 }, { k: 'gnd', x: 60, y: 222 }, { k: 'gnd', x: 240, y: 175 }],
    wires: [[60, 30, 60, 35], [60, 95, 60, 130], [60, 115, 110, 115], [170, 115, 200, 115], [240, 85, 240, 85], [60, 190, 60, 210], [240, 145, 240, 163]], dots: [[60, 115]] },
  arduinoLed: { w: 300, h: 150, parts: [{ k: 'ic8', x: 50, y: 75, lab2: 'UNO' }, { k: 'res', x: 150, y: 55, lab: '220 Ω' }, { k: 'led', x: 240, y: 90, rot: 90 }, { k: 'gnd', x: 240, y: 145 }],
    wires: [[84, 55, 120, 55], [180, 55, 240, 55, 240, 60], [240, 120, 240, 133]], text: [[88, 48, 'D13']] },
  trafficLight: { w: 320, h: 200, parts: [{ k: 'ic8', x: 50, y: 95, lab2: 'UNO' }, { k: 'res', x: 140, y: 40, lab: '220 Ω' }, { k: 'res', x: 140, y: 95, lab: '220 Ω' }, { k: 'res', x: 140, y: 150, lab: '220 Ω' }, { k: 'led', x: 225, y: 40, lab: 'Rojo' }, { k: 'led', x: 225, y: 95, lab: 'Ámbar' }, { k: 'led', x: 225, y: 150, lab: 'Verde' }],
    wires: [[84, 75, 100, 75, 100, 40, 110, 40], [84, 88, 100, 88, 100, 95, 110, 95], [84, 102, 100, 102, 100, 150, 110, 150], [255, 40, 290, 40, 290, 185], [255, 95, 290, 95], [255, 150, 290, 150], [290, 185, 300, 185]], dots: [[290, 95], [290, 150]], text: [[88, 70, '12'], [88, 84, '11'], [88, 112, '10'], [270, 196, 'GND']] },
  ne555: { w: 330, h: 220, parts: [{ k: 'ic8', x: 170, y: 110, lab2: '555' }, { k: 'res', x: 80, y: 50, rot: 90, lab: 'R1 10 kΩ' }, { k: 'res', x: 80, y: 120, rot: 90, lab: 'R2 47 kΩ' }, { k: 'ecap', x: 80, y: 185, rot: 90, lab: 'C 10 µF' }, { k: 'res', x: 260, y: 90, lab: '470 Ω' }, { k: 'led', x: 305, y: 140, rot: 90 }],
    wires: [[80, 20, 80, 20, 170, 20, 170, 80], [80, 80, 80, 90], [80, 85, 136, 85], [80, 150, 80, 155], [80, 152, 136, 152, 136, 130], [136, 117, 120, 117, 120, 152], [204, 90, 230, 90], [290, 90, 305, 90, 305, 110]], dots: [[80, 85], [80, 152]], text: [[150, 16, '+9 V'], [120, 215, 'Pines: 2 y 6 al condensador, 7 entre R1 y R2']] }
};
