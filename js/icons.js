/* Ronda · Gervital — íconos de trazo propios */
"use strict";

const ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  hoy: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  semana: '<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 14h2M11 14h2M14.5 14h2M7.5 17h2M11 17h2"/>',
  personas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M15.5 4.6a3.5 3.5 0 010 6.8M17.6 14.8c2 .8 3.3 2.5 3.9 5.2"/>',
  historial: '<path d="M3.5 12a8.5 8.5 0 102.6-6.1"/><path d="M3 4v4.5h4.5"/><path d="M12 8v4.5l3 1.8"/>',
  mas: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>',
  chevD: '<path d="M5 9l7 7 7-7"/>',
  chevU: '<path d="M5 15l7-7 7 7"/>',
  bell: '<path d="M6 16v-5a6 6 0 1112 0v5l1.8 2H4.2L6 16z"/><path d="M10 20.5a2.2 2.2 0 004 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
  logout: '<path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4"/><path d="M9 16.5L4.5 12 9 7.5M4.5 12H15"/>',
  pill: '<rect x="2.5" y="7.5" width="19" height="9" rx="4.5"/><path d="M12 7.5v9"/><path d="M6.5 10.5h2" opacity=".6"/>',
  alert: '<path d="M12 3.5l9.5 16.5h-19L12 3.5z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16 7l2.5 2.5M14 9l2 2"/>',
  ajustes: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  equipo: '<circle cx="12" cy="7.5" r="3.2"/><path d="M5.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5"/><circle cx="4.8" cy="10" r="2.1"/><circle cx="19.2" cy="10" r="2.1"/>',
  phone: '<path d="M5.5 3.5h3.2l1.8 4.6-2.3 1.4a11 11 0 006.3 6.3l1.4-2.3 4.6 1.8v3.2a2 2 0 01-2.1 2A16.5 16.5 0 013.5 5.6a2 2 0 012-2.1z"/>',
  note: '<path d="M5 4h14v11l-5 5H5V4z"/><path d="M14 20v-5h5M8.5 9h7M8.5 12.5h4"/>',
  ausente: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5 1.5 0 2.9.4 4 1.3"/><path d="M16 14.5l5 5M21 14.5l-5 5"/>',
  vino: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5 1.5 0 2.9.4 4 1.3"/><path d="M15 17.5l2.2 2.2 4.3-4.6"/>',
  install: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7.5v6.5M9.3 11.5L12 14.2l2.7-2.7M10.5 18.5h3"/>',
  file: '<path d="M14 3H6.5A1.5 1.5 0 005 4.5v15A1.5 1.5 0 006.5 21h11a1.5 1.5 0 001.5-1.5V8l-5-5z"/><path d="M14 3v5h5M8.5 13h7M8.5 16.5h5"/>',
  sheet: '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M3.5 15h17M9.5 9.5V20"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6L12 3z"/><path d="M8.8 12l2.2 2.2 4.3-4.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/>',
  later: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9 2.5h6"/>',
  nodio: '<circle cx="12" cy="12" r="9"/><path d="M6 18L18 6"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L12 3.5z"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>',
  vibrate: '<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4 8v8M20 8v8M2 10v4M22 10v4"/>',
  hourglass: '<path d="M6.5 3h11M6.5 21h11M7.5 3c0 5 9 5 9 9s-9 4-9 9M16.5 3c0 5-9 5-9 9s9 4 9 9"/>',
};
const ic = (name, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;

/* Marca: dos personas que forman un corazón, como el logo de Gervital */
const MARK = '<svg class="mk" viewBox="0 0 48 48" aria-hidden="true"><circle class="a" cx="14.5" cy="9" r="6.2"/><circle class="b" cx="33.5" cy="9" r="6.2"/><path class="a" d="M24 22.5C18.5 14.8 5.5 15.2 5.5 25.4c0 7.4 8 13.3 18.5 20.1z"/><path class="b" d="M24 22.5c5.5-7.7 18.5-7.3 18.5 2.9 0 7.4-8 13.3-18.5 20.1z"/></svg>';
const LOGO_BLANCO = window.LOGO_BLANCO || "img/logo-blanco-480.png";
const marca = (sub = "Gervital") => `<div class="marca">${MARK}<div><b>ronda</b><small>${esc(sub)}</small></div></div>`;
const avatar = (obj, cls = "") => `<span class="av ${cls} ${obj && obj.activo === false ? "off" : ""}" style="--c:${avColor(obj?.id)}" aria-hidden="true">${esc(iniciales(obj?.nombre))}</span>`;
