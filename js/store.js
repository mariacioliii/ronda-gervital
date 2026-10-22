/* Ronda · Gervital — estado y reglas */
"use strict";

const CFG0 = {
  id: "cfg",
  centro: "Gervital",
  margen: 30,        // minutos: después de esto la toma figura como atrasada
  limite: 120,       // minutos: después de esto queda "sin registrar"
  autoLogout: 5,     // minutos sin uso para cerrar la sesión
  sonido: true,
  vibrar: true,
  responsableHabitual: null,
  demoOffset: 0,
  inicio: null,      // fecha desde la que se cuentan tomas sin registrar
};

const S = {
  cfg: { ...CFG0 },
  staff: [],
  personas: [],
  meds: [],
  reg: new Map(),    // id de toma -> registro
  aus: new Map(),    // fecha|pid -> ausencia
  kv: new Map(),     // otros valores (responsable del día, alarmas disparadas)
  user: null,
};

const MOTIVOS = ["Se negó a tomarla", "Estaba dormida o descansando", "No había medicación", "Indicación médica", "Vomitó o se sintió mal", "Otro motivo"];
const ROLES = ["Enfermería", "Cuidado", "Psicomotricidad", "Coordinación", "Dirección", "Otro"];

/* ---------- Persistencia ---------- */
let saveErr = false;
function persist(store, obj) {
  DB.put(store, obj).catch(() => { if (!saveErr) { saveErr = true; toast("No se pudo guardar en este dispositivo. Revisá el espacio disponible.", null, "bad"); } });
}
function unpersist(store, id) { DB.del(store, id).catch(() => {}); }

async function loadAll() {
  const [kv, staff, personas, meds, registros, ausencias] = await Promise.all(DB.STORES.map((s) => DB.all(s)));
  S.kv = new Map(kv.map((o) => [o.id, o]));
  S.cfg = { ...CFG0, ...(S.kv.get("cfg") || {}) };
  S.staff = staff.sort((a, b) => a.nombre.localeCompare(b.nombre));
  S.personas = personas.sort((a, b) => a.nombre.localeCompare(b.nombre));
  S.meds = meds;
  S.reg = new Map(registros.map((r) => [r.id, r]));
  S.aus = new Map(ausencias.map((a) => [a.id, a]));
  Clock.offsetMin = S.cfg.demoOffset || 0;
}

function saveCfg(patch) { Object.assign(S.cfg, patch); persist("kv", S.cfg); }
function kvGet(id) { return S.kv.get(id)?.v; }
function kvSet(id, v) { const o = { id, v }; S.kv.set(id, o); persist("kv", o); }

function upsert(list, store, obj) {
  const i = S[list].findIndex((x) => x.id === obj.id);
  if (i >= 0) S[list][i] = obj; else S[list].push(obj);
  if (list !== "meds") S[list].sort((a, b) => a.nombre.localeCompare(b.nombre));
  persist(store, obj);
}
const savePersona = (p) => upsert("personas", "personas", p);
const saveMed = (m) => upsert("meds", "meds", m);
const saveStaff = (u) => upsert("staff", "staff", u);
function removeMed(id) { S.meds = S.meds.filter((m) => m.id !== id); unpersist("meds", id); }

/* Registros con historial de cambios y "deshacer" */
let undoStack = null;
function setReg(id, data, opts = {}) {
  const prev = S.reg.get(id) || null;
  if (!opts.noUndo) undoStack = undoStack && opts.join ? undoStack : [];
  if (!opts.noUndo) undoStack.push(["reg", id, prev && clone(prev)]);
  let r;
  if (prev && opts.edit) {
    const antes = { estado: prev.estado, horaReal: prev.horaReal, motivo: prev.motivo, nota: prev.nota, por: prev.por };
    r = { ...prev, ...data, ediciones: [...(prev.ediciones || []), { por: S.user?.id, ts: Date.now(), antes }] };
  } else {
    r = { ...(prev || {}), ...data, id, por: data.por || S.user?.id, ts: Date.now() };
  }
  S.reg.set(id, r); persist("registros", r);
  return r;
}
function setAusencia(fecha, pid, on, motivo = "") {
  const id = `${fecha}|${pid}`;
  const prev = S.aus.get(id) || null;
  undoStack = [["aus", id, prev && clone(prev)]];
  if (on) { const a = { id, fecha, pid, motivo, por: S.user?.id, ts: Date.now() }; S.aus.set(id, a); persist("ausencias", a); }
  else { S.aus.delete(id); unpersist("ausencias", id); }
}
function undo() {
  if (!undoStack) return false;
  for (const [kind, id, prev] of undoStack.reverse()) {
    const map = kind === "reg" ? S.reg : S.aus, store = kind === "reg" ? "registros" : "ausencias";
    if (prev) { map.set(id, prev); persist(store, prev); } else { map.delete(id); unpersist(store, id); }
  }
  undoStack = null;
  return true;
}

/* ---------- Consultas ---------- */
const persona = (id) => S.personas.find((p) => p.id === id);
const staffById = (id) => S.staff.find((u) => u.id === id);
const staffNombre = (id) => (id === "sistema" ? "Importado" : staffById(id)?.nombre || "—");
const medsDe = (pid, soloActivos = true) => S.meds.filter((m) => m.pid === pid && (!soloActivos || m.activo !== false)).sort((a, b) => (a.horas[0] || "").localeCompare(b.horas[0] || "") || a.nombre.localeCompare(b.nombre));
const asisteEl = (p, iso) => p.activo !== false && (p.dias || []).includes(weekday(iso));
const ausente = (iso, pid) => S.aus.has(`${iso}|${pid}`);
const esAdmin = () => !!S.user?.admin;

/* Todas las tomas programadas para una fecha */
function tomasDe(iso, { incluirAusentes = false } = {}) {
  const wd = weekday(iso);
  const out = [];
  for (const p of S.personas) {
    if (p.activo === false || !(p.dias || []).includes(wd)) continue;
    if (p.desde && iso < p.desde) continue;
    const aus = ausente(iso, p.id);
    for (const m of medsDe(p.id)) {
      if (m.dias && m.dias.length && !m.dias.includes(wd)) continue;
      if (m.desde && iso < m.desde) continue;
      for (const h of m.horas) {
        const id = `${iso}|${m.id}|${h}`;
        const r = S.reg.get(id) || null;
        if (aus && !incluirAusentes && !(r && (r.estado === "dada" || r.estado === "nodada"))) continue;
        out.push({ id, fecha: iso, p, m, hora: h, r, aus });
      }
    }
  }
  return out.sort((a, b) => a.hora.localeCompare(b.hora) || a.p.nombre.localeCompare(b.p.nombre) || a.m.nombre.localeCompare(b.m.nombre));
}

/* Estado de una toma: dada · nodada · ausente · proxima · pendiente · pospuesta · atrasada · sinreg */
function vence(t) { return t.r?.estado === "pospuesta" && t.r.posp ? mins(t.r.posp) : mins(t.hora); }
function estado(t, ref = { fecha: today(), min: nowMin() }) {
  if (t.r && (t.r.estado === "dada" || t.r.estado === "nodada")) return t.r.estado;
  if (t.aus) return "ausente";
  if (t.fecha < ref.fecha) return "sinreg";
  if (t.fecha > ref.fecha) return "proxima";
  const tarde = ref.min - vence(t);
  if (tarde > S.cfg.limite) return "sinreg";
  if (tarde > S.cfg.margen) return "atrasada";
  if (t.r?.estado === "pospuesta") return "pospuesta";
  if (tarde < 0) return "proxima";
  return "pendiente";
}
const abierta = (e) => e === "pendiente" || e === "pospuesta" || e === "atrasada" || e === "proxima";
const minutosTarde = (t) => nowMin() - vence(t);

/* Rondas: salen solas de los horarios cargados */
function rondasDe(iso) {
  const ts = tomasDe(iso);
  const horas = [...new Set(ts.map((t) => t.hora))].sort();
  return horas.map((h) => {
    const items = ts.filter((t) => t.hora === h);
    const est = items.map((t) => estado(t));
    return {
      hora: h, items,
      personas: new Set(items.map((t) => t.p.id)).size,
      total: items.length,
      hechas: est.filter((e) => e === "dada" || e === "nodada").length,
      abiertas: est.filter(abierta).length,
      sinreg: est.filter((e) => e === "sinreg").length,
    };
  });
}
function rondaActual(rondas, min = nowMin()) {
  let cur = null;
  for (const r of rondas) if (mins(r.hora) <= min + 15) cur = r;
  return cur;
}

/* Responsable del día */
function responsableHoy() {
  const v = kvGet("resp-" + today());
  if (v === "compartida") return { tipo: "compartida" };
  const id = v || S.cfg.responsableHabitual;
  const u = id && staffById(id);
  if (u && u.activo !== false) return { tipo: "persona", u, habitual: !v || v === S.cfg.responsableHabitual };
  return { tipo: "ninguno" };
}

/* Historial: registros + tomas que quedaron sin registrar */
function historial(desde, hasta) {
  const out = [];
  const inicio = S.cfg.inicio || desde;
  for (let d = desde; d <= hasta; d = addDays(d, 1)) {
    const ts = tomasDe(d, { incluirAusentes: true });
    const vistos = new Set();
    for (const t of ts) {
      vistos.add(t.id);
      const e = estado(t);
      if (t.r && (e === "dada" || e === "nodada")) out.push({ ...t, e });
      else if (e === "sinreg" && d >= inicio) out.push({ ...t, e });
      else if (e === "ausente" && !t.r) { /* se agrega una vez por persona más abajo */ }
    }
    // registros de tomas que ya no están programadas (medicación quitada, persona desactivada)
    for (const r of S.reg.values()) {
      if (r.fecha !== d || vistos.has(r.id) || (r.estado !== "dada" && r.estado !== "nodada")) continue;
      const p = persona(r.pid), m = S.meds.find((x) => x.id === r.medId);
      out.push({ id: r.id, fecha: d, p: p || { id: r.pid, nombre: r.pNombre || "Persona eliminada" }, m: m || { id: r.medId, nombre: r.medNombre || "Medicación", dosis: r.medDosis || "" }, hora: r.hora, r, e: r.estado });
    }
    for (const a of S.aus.values()) if (a.fecha === d) { const p = persona(a.pid); if (p) out.push({ id: "aus|" + a.id, fecha: d, p, m: null, hora: "", r: null, e: "ausencia", a }); }
  }
  return out;
}

const ESTADO_TXT = {
  dada: "Dada", nodada: "No se dio", pendiente: "Para dar", pospuesta: "Pospuesta", atrasada: "Atrasada",
  sinreg: "Sin registrar", proxima: "Más tarde", ausente: "No vino", ausencia: "No vino",
};
