/* Ronda · ilustraciones propias.
   Reglas del sistema: colores planos de la marca (noche, uva, malva, lila, sol), sin degradados ni contornos,
   formas redondeadas, la cápsula partida en dos mitades como motivo, el tilde siempre en trazo redondo.
   Cada pieza tiene la clase "ip" y sus partes "ip-a/b/c" entran escalonadas (ver app.css). */
const ILU_C = { noche: "#2E1634", uva: "#86428F", malva: "#C99AD1", lila: "#F3EDF4", lila2: "#E4D3E8", sol: "#F3C11B", blanco: "#FFFFFF", verde: "#1F6B4A" };

const capsula = (x, y, ang, w, h, top, bot) => { const r = w / 2; return `<g transform="translate(${x} ${y}) rotate(${ang})"><rect x="${-r}" y="${-h / 2}" width="${w}" height="${h}" rx="${r}" fill="${top}"/><path d="M${-r} 0H${r}V${h / 2 - r}A${r} ${r} 0 0 1 ${-r} ${h / 2 - r}Z" fill="${bot}"/><rect x="${-r + w * 0.24}" y="${-h / 2 + h * 0.14}" width="${w * 0.16}" height="${h * 0.28}" rx="${w * 0.08}" fill="#fff" opacity=".55"/></g>`; };

const ILU = {
  /* Todo registrado: el pastillero con los compartimentos cerrados y el tilde arriba */
  listo: (fondo = "claro") => {
    const c = ILU_C, osc = fondo === "oscuro";
    return `<svg class="ip" viewBox="0 0 160 120" aria-hidden="true">
      <g class="ip-a"><rect x="18" y="60" width="124" height="44" rx="14" fill="${osc ? "rgba(255,255,255,.3)" : c.lila2}"/>
      ${[28, 66, 104].map((x) => `<rect x="${x}" y="68" width="28" height="28" rx="8" fill="${osc ? "rgba(255,255,255,.42)" : c.lila}"/>`).join("")}</g>
      <g class="ip-b">${capsula(80, 82, -30, 12, 26, osc ? c.blanco : c.uva, osc ? c.malva : c.malva)}</g>
      <path class="ip-c ip-tilde" d="M58 34l15 15 31-31" fill="none" stroke="${c.sol}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  },
  /* Personas: dos figuras que se acompañan, con el corazón de Gervital entre ellas */
  personas: () => {
    const c = ILU_C;
    return `<svg class="ip" viewBox="0 0 160 120" aria-hidden="true">
      <g class="ip-a"><rect x="30" y="58" width="42" height="50" rx="21" fill="${c.uva}"/><rect x="39" y="22" width="24" height="28" rx="12" fill="${c.uva}"/></g>
      <g class="ip-b"><rect x="88" y="62" width="42" height="46" rx="21" fill="${c.malva}"/><rect x="97" y="28" width="24" height="28" rx="12" fill="${c.malva}"/></g>
      <path class="ip-c" d="M80 66c-6-9-20-6-16 6 2 6 16 16 16 16s14-10 16-16c4-12-10-15-16-6z" fill="${c.sol}"/>
    </svg>`;
  },
  /* Historial vacío: la libreta con renglones esperando registros */
  historial: () => {
    const c = ILU_C;
    return `<svg class="ip" viewBox="0 0 160 120" aria-hidden="true">
      <g class="ip-a"><rect x="34" y="14" width="92" height="96" rx="14" fill="${c.lila2}"/><rect x="34" y="14" width="92" height="22" rx="11" fill="${c.uva}"/><rect x="34" y="26" width="92" height="10" fill="${c.uva}"/></g>
      <g class="ip-b">${[52, 70, 88].map((y, i) => `<rect x="48" y="${y}" width="${i === 0 ? 58 : i === 1 ? 46 : 52}" height="8" rx="4" fill="${c.blanco}"/>`).join("")}</g>
      <g class="ip-c">${capsula(124, 92, 35, 14, 32, c.sol, c.blanco)}</g>
    </svg>`;
  },
  /* Hoy no hay medicación: la cápsula descansa al lado del calendario */
  libre: () => {
    const c = ILU_C;
    return `<svg class="ip" viewBox="0 0 160 120" aria-hidden="true">
      <g class="ip-a"><rect x="30" y="20" width="76" height="80" rx="14" fill="${c.lila2}"/><rect x="30" y="20" width="76" height="22" rx="11" fill="${c.uva}"/><rect x="30" y="32" width="76" height="10" fill="${c.uva}"/>
      <rect x="46" y="12" width="8" height="18" rx="4" fill="${c.noche}"/><rect x="82" y="12" width="8" height="18" rx="4" fill="${c.noche}"/>
      ${[0, 1, 2].map((r) => [0, 1, 2].map((k) => `<rect x="${42 + k * 18}" y="${52 + r * 15}" width="12" height="9" rx="3" fill="${c.blanco}"/>`).join("")).join("")}</g>
      <g class="ip-b">${capsula(122, 82, 70, 16, 40, c.uva, c.malva)}</g>
    </svg>`;
  },
  /* Búsqueda sin resultados: la lupa sobre una ficha vacía */
  buscar: () => {
    const c = ILU_C;
    return `<svg class="ip" viewBox="0 0 160 120" aria-hidden="true">
      <g class="ip-a"><rect x="26" y="26" width="84" height="68" rx="14" fill="${c.lila2}"/><rect x="40" y="44" width="40" height="8" rx="4" fill="${c.blanco}"/><rect x="40" y="62" width="28" height="8" rx="4" fill="${c.blanco}"/></g>
      <g class="ip-b"><circle cx="104" cy="64" r="20" fill="none" stroke="${c.uva}" stroke-width="10"/><path d="M118 79l16 16" stroke="${c.uva}" stroke-width="11" stroke-linecap="round"/></g>
    </svg>`;
  },
};
