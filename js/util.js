/* Ronda · Gervital — utilidades */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const uid = (p = "") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = (o) => JSON.parse(JSON.stringify(o));

/* Horas en minutos desde las 00:00 */
const mins = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + (m || 0); };
const hm = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(Math.round(m) % 60)}`;
const normHora = (s) => { const m = String(s).match(/(\d{1,2})(?:[:.hH](\d{2}))?/); if (!m) return null; const h = +m[1], mi = +(m[2] || 0); if (h > 23 || mi > 59) return null; return `${pad(h)}:${pad(mi)}`; };

/* Reloj (con desfase opcional para demostraciones) */
const Clock = {
  offsetMin: 0,
  now() { return new Date(Date.now() + this.offsetMin * 60000); },
};
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoDate(Clock.now());
const nowMin = () => { const d = Clock.now(); return d.getHours() * 60 + d.getMinutes(); };
const nowHM = () => hm(nowMin());
const dateFromISO = (s) => new Date(s + "T12:00:00");
const addDays = (iso, n) => { const d = dateFromISO(iso); d.setDate(d.getDate() + n); return isoDate(d); };
const weekday = (iso) => dateFromISO(iso).getDay(); // 0 dom … 6 sáb

const DIAS = [
  { n: 1, c: "L", k: "Lun", l: "Lunes" },
  { n: 2, c: "M", k: "Mar", l: "Martes" },
  { n: 3, c: "X", k: "Mié", l: "Miércoles" },
  { n: 4, c: "J", k: "Jue", l: "Jueves" },
  { n: 5, c: "V", k: "Vie", l: "Viernes" },
  { n: 6, c: "S", k: "Sáb", l: "Sábado" },
];
const DIA_NOMBRE = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];
const fechaLarga = (iso) => { const d = dateFromISO(iso); return `${DIA_NOMBRE[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const fechaCorta = (iso) => { const d = dateFromISO(iso); return `${DIA_NOMBRE[d.getDay()].slice(0, 3)} ${d.getDate()}/${d.getMonth() + 1}`; };
const fechaRel = (iso) => { const t = today(); if (iso === t) return "Hoy"; if (iso === addDays(t, -1)) return "Ayer"; return fechaLarga(iso); };
const tsTexto = (ts) => { const d = new Date(ts); return `${fechaCorta(isoDate(d))} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const diasTexto = (dias) => {
  const s = [...(dias || [])].sort();
  if (s.join() === "1,2,3,4,5") return "Lunes a viernes";
  if (!s.length) return "Sin días asignados";
  return s.map((n) => DIAS.find((d) => d.n === n)?.k).join(", ");
};

const primerNombre = (n) => String(n || "").trim().split(/\s+/)[0];
const iniciales = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
/* Tono de avatar estable dentro de la paleta */
const AV = ["#86428F", "#A35A8C", "#6E5AA0", "#9A4E6E", "#5E7A8F", "#7B6A3A", "#4F7A64", "#8F5A42"];
const avColor = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV[h % AV.length]; };
const plural = (n, s, p) => `${n} ${n === 1 ? s : p || s + "s"}`;

/* Hash de PIN (SHA-256 con sal); fallback simple si no hay crypto.subtle */
async function hashPin(pin, salt) {
  const txt = `${salt}:${pin}:ronda`;
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    let h = 5381; for (const c of txt) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return "f" + h.toString(16);
  }
}

/* Descarga de archivos */
function descargar(nombre, contenido, tipo = "text/plain") {
  if (window.RONDA_ARTIFACT && typeof contenido === "string") {
    const fallback = () => { mostrarExport(nombre, contenido.replace(/^\uFEFF/, "")); render(); };
    const dl = window.claude && window.claude.use ? window.claude.use("downloads") : Promise.resolve(null);
    dl.then((d) => {
      if (!d) return fallback();
      d.save({ filename: nombre, data: contenido }).then(() => toast("Archivo guardado"), (e) => { if (e && e.code !== "declined") fallback(); });
    }, fallback);
    return;
  }
  const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
}
const csvCell = (v) => { const s = String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/* CSV con ; o , (detecta separador) */
function parseCSV(text) {
  text = text.replace(/^﻿/, "");
  const first = text.split(/\r?\n/)[0] || "";
  const sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ";" : (first.includes("\t") ? "\t" : ",");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === sep || c === "\t") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
const sinTildes = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
