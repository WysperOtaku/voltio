/* Voltio · temario. Orden inspirado en Getting Started in Electronics (Mims),
   profundidad de The Art of Electronics e ideas prácticas de Make: Electronics.
   Todo el texto y los ejercicios son originales. */
const I = (text, x = {}) => ({ t: 'info', text, ...x });
const Q = (q, o, e, x = {}) => ({ t: 'mc', q, o, a: 0, e, ...x });
const Nm = (q, a, u, e, x = {}) => ({ t: 'num', q, a, u, e, ...x });
const G = g => ({ t: 'gen', g });
const TU = (q, viz, params, goal, e, x = {}) => ({ t: 'tune', q, viz, params, goal, e, ...x });
const MT = (q, scene, task, e, x = {}) => ({ t: 'meter', q, scene, task, e, ...x });
const L = (id, title, icon, c, ex) => ({ id, kind: 'lesson', title, icon, c, ex });
const SIM = (id, title, brief, sim, checks) => ({ id, kind: 'sim', title, icon: 'sim', brief, sim, checks });
const PRJ = (id, title, project) => ({ id, kind: 'project', title, icon: 'proj', project });
const pV = (val = 9, min = 1, max = 12) => ({ label: 'Pila', val, min, max, step: 0.5, unit: 'V', dec: 1 });
const pR = (label, val, min = 10, max = 1e6) => ({ label, val, fmt: 'R', min, max });
const OHM_TRI = '<svg viewBox="0 0 200 150" class="viz"><path d="M100 15L185 135H15Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M45 85H155M100 85V135" stroke="currentColor" stroke-width="3"/><text x="100" y="72" text-anchor="middle" font-size="30" font-weight="800" fill="currentColor">V</text><text x="70" y="122" text-anchor="middle" font-size="26" font-weight="800" fill="currentColor">I</text><text x="130" y="122" text-anchor="middle" font-size="26" font-weight="800" fill="currentColor">R</text></svg>';

/* El temario base: un archivo por módulo en src/base/ (mNN.js), cada uno con UNITS.push(…).
   El orden de los módulos es el de los nombres de archivo. */
const UNITS = [];

/* Especialidades: temarios enteros que se desbloquean al terminar el módulo de
   Microcontroladores (m12). Cada archivo de src/tracks/ añade la suya con TRACKS.push(…). */
const TRACKS = [];
