// Ledly · piezas del icono (Chispa en diagonal) para tools/android-res.mjs. Genera los SVG del
// icono completo, el primer plano y el fondo del icono adaptativo, el icono grande de las
// notificaciones y la pantalla de arranque. Todo es vectorial y se rasteriza con sharp.
export const DEFS = `<defs>
  <radialGradient id="bg" cx="62%" cy="36%" r="85%"><stop offset="0" stop-color="#2C4378"/><stop offset=".5" stop-color="#172446"/><stop offset="1" stop-color="#0A1020"/></radialGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFD25A" stop-opacity=".85"/><stop offset=".35" stop-color="#FFB000" stop-opacity=".4"/><stop offset="1" stop-color="#FFB000" stop-opacity="0"/></radialGradient>
  <radialGradient id="body" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="#FFF6D2"/><stop offset=".4" stop-color="#FFD45E"/><stop offset="1" stop-color="#FF9F00"/></radialGradient>
  <linearGradient id="rim" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#F29A00"/><stop offset="1" stop-color="#C46F00"/></linearGradient>
</defs>`;
// Chispa en su sistema de coordenadas propio (cúpula arriba, patas abajo). legs = largo de las patas.
export const chispa = (legs = 150) => `
  <path d="M33 80V${80 + legs}M57 80V${80 + legs * 0.88}" stroke="#6F7A90" stroke-width="9" stroke-linecap="round"/>
  <path d="M33 80V${80 + legs}M57 80V${80 + legs * 0.88}" stroke="#E6EBF3" stroke-width="5" stroke-linecap="round"/>
  <rect x="8" y="72" width="74" height="12" rx="4" fill="url(#rim)"/>
  <path d="M14 76V42a31 31 0 0 1 62 0v34z" fill="url(#body)"/>
  <path d="M23 40a22 22 0 0 1 17 -20" stroke="#fff" stroke-opacity=".7" stroke-width="5.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="33" cy="47" rx="4.6" ry="5.4" fill="#1B1300"/><ellipse cx="57" cy="47" rx="4.6" ry="5.4" fill="#1B1300"/>
  <circle cx="34.6" cy="45" r="1.7" fill="#fff"/><circle cx="58.6" cy="45" r="1.7" fill="#fff"/>
  <path d="M35 57q10 10 20 0" stroke="#1B1300" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="25" cy="56" rx="4.4" ry="2.6" fill="#FF6A3D" opacity=".5"/><ellipse cx="65" cy="56" rx="4.4" ry="2.6" fill="#FF6A3D" opacity=".5"/>`;
// Destellos de cuatro puntas alrededor
const star = (x, y, r, o = 1) => `<path d="M${x} ${y - r}Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}z" fill="#FFE9A8" opacity="${o}"/>`;
export const sparkles = `${star(812, 250, 34)}${star(880, 420, 18, .8)}${star(690, 150, 16, .7)}${star(300, 240, 14, .45)}${star(840, 690, 12, .5)}`;
// La pose diagonal: cúpula hacia arriba a la derecha y patas hacia la esquina de abajo a la izquierda
export const pose = (cx, cy, s, legs) => `<g transform="translate(${cx} ${cy}) rotate(45) scale(${s}) translate(-45 -48)">${chispa(legs)}</g>`;
const svg = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${DEFS}${inner}</svg>`;
export const background = svg(1024, 1024, `<rect width="1024" height="1024" fill="url(#bg)"/><circle cx="560" cy="452" r="470" fill="url(#glow)"/>${sparkles}`);
export const full = svg(1024, 1024, `<rect width="1024" height="1024" fill="url(#bg)"/><circle cx="560" cy="452" r="470" fill="url(#glow)"/>${sparkles}${pose(556, 452, 6.6, 150)}`);
// Primer plano del icono adaptativo: la cara y la cúpula dentro de la zona segura (66 % central)
export const foreground = svg(1024, 1024, pose(540, 470, 4.7, 170));
export const notifLarge = svg(256, 256, `<circle cx="128" cy="128" r="128" fill="url(#bg)"/><circle cx="140" cy="116" r="120" fill="url(#glow)"/>${pose(134, 120, 1.55, 110)}`);
export const splash = svg(1000, 1000, `<rect width="1000" height="1000" fill="#14213D"/><circle cx="500" cy="500" r="230" fill="url(#glow)"/>${pose(500, 500, 2.4, 60)}`);
