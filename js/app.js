/* Ronda · Gervital — navegación, acciones y arranque */
"use strict";

const UI0 = () => ({
  tab: "hoy", sub: null, sheet: null, ficha: null, form: null, toast: null,
  semDia: null, verSinreg: false,
  pf: { q: "", act: true },
  hf: { rango: "7", pid: "", estado: "" },
  login: { uid: null, pin: "", err: "" },
  setup: { step: 1 },
  imp: null,
});
let ui = UI0();
let listo = false;
let deferredInstall = null;
let lastActivity = Date.now();
let lastMin = -1;

/* ---------- Tamaño de pantalla y vista de celular ---------- */
const Vista = {
  celular: false,
  init() {
    let pref = null;
    try { pref = localStorage.getItem("ronda-vista"); } catch (e) {}
    this.celular = pref ? pref === "celular" : !!window.RONDA_ARTIFACT && window.innerWidth >= 980;
    this.aplicar();
    window.addEventListener("resize", () => this.aplicar());
  },
  toggle() {
    this.celular = !this.celular;
    try { localStorage.setItem("ronda-vista", this.celular ? "celular" : "pc"); } catch (e) {}
    this.aplicar(); render();
  },
  aplicar() {
    const h = document.documentElement;
    const puede = window.innerWidth >= 760;
    const cel = this.celular && puede;
    h.classList.toggle("phone", cel);
    const w = cel ? 400 : window.innerWidth;
    h.classList.toggle("w980", w >= 980);
    h.classList.toggle("w700", w >= 700);
    h.classList.toggle("n520", w <= 520);
    const b = $("#vista");
    if (b) { b.hidden = !puede; b.innerHTML = cel ? `${ic("chevL", "s")} Ver como en la PC` : `${ic("install", "s")} Ver como app de celular`; }
    const c = $("#vista-cap"); if (c) c.hidden = !cel;
  },
};
const scroller = () => (document.documentElement.classList.contains("phone") ? $("#app") : null);
function toTop() { const sc = scroller(); if (sc) sc.scrollTop = 0; else window.scrollTo(0, 0); }

/* ---------- Render ---------- */
function render() {
  const root = $("#app");
  const sc = scroller();
  const scrollY = sc ? sc.scrollTop : window.scrollY;
  const focusSel = document.activeElement && document.activeElement.matches("input,textarea,select") ? attrSel(document.activeElement) : null;
  const caret = focusSel ? safeCaret(document.activeElement) : null;

  let html;
  if (!listo) html = vSplash();
  else if (!S.staff.length) html = vSetup();
  else if (!S.user) html = vLogin();
  else {
    let content;
    if (ui.sub === "persona") content = vPersonaEdit();
    else if (ui.sub === "equipo") content = vEquipo();
    else if (ui.sub === "ajustes") content = vAjustes();
    else if (ui.sub === "importar") content = vImportar();
    else content = { hoy: vHoy, semana: vSemana, personas: vPersonas, historial: vHistorial, mas: vMas }[ui.tab]();
    html = vShell(content) + (ui.ficha ? vFicha() : "");
  }
  html += vSheet() + vAlarm() + vToast();
  root.innerHTML = html;
  document.body.style.overflow = ui.sheet || Alarm.activa || ui.ficha ? "hidden" : "";

  if (focusSel) { const el = $(focusSel); if (el) { el.focus({ preventScroll: true }); if (caret != null) try { el.setSelectionRange(caret, caret); } catch (e) {} } }
  if (sc) sc.scrollTop = scrollY; else window.scrollTo(0, scrollY);
}
function attrSel(el) {
  for (const a of ["data-f", "data-fm", "data-fu", "data-pf", "data-hf", "data-imp"]) if (el.hasAttribute(a)) return `[${a}="${el.getAttribute(a)}"]`;
  return null;
}
function safeCaret(el) { try { return el.selectionStart; } catch (e) { return null; } }

let toastTimer;
function toast(msg, undoable, kind) {
  ui.toast = { msg, undo: !!undoable, kind };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast = null; if (!undoable) {} undoStack = undoable ? null : undoStack; renderSoft(); }, undoable ? 7000 : 4000);
  render();
}
/* Re-render que no pisa lo que se está escribiendo */
function renderSoft() {
  const a = document.activeElement;
  if (a && a.matches("input,textarea,select")) { const t = $(".toast"); if (t && !ui.toast) t.remove(); return; }
  render();
}

const goTab = (t) => { ui.tab = t; ui.sub = null; ui.ficha = null; ui.sheet = null; toTop(); };
const openSheet = (s, extra = {}) => { ui.sheet = { s, ...extra }; };
const closeSheet = () => { ui.sheet = null; ui.form = ui.sub === "persona" ? ui.form : null; ui.medErr = ui.uErr = ui.pinErr = null; if (ui.sub === "persona" && ui.form) delete ui.form.med; };

function mostrarExport(nombre, contenido) { ui.form = { exp: { nombre, contenido } }; openSheet("export"); }

/* ---------- Registro de tomas ---------- */
function regBase(t) {
  return { fecha: t.fecha, pid: t.p.id, medId: t.m.id, hora: t.hora, pNombre: t.p.nombre, medNombre: t.m.nombre, medDosis: t.m.dosis || "" };
}
function darToma(id, horaReal, join) {
  const t = tomaPorId(id);
  const tardio = t.fecha < today() || (t.fecha === today() && minutosTarde(t) > S.cfg.limite);
  setReg(id, { ...regBase(t), estado: "dada", horaReal: horaReal || nowHM(), motivo: "", posp: null, tardio }, { join });
  return t;
}

/* ---------- Acciones ---------- */
const A = {
  /* Primer uso */
  setupNext() {
    const st = ui.setup;
    if (st.step === 1) { st.step = 2; ui.form = ui.form || { nombre: "", rol: "Coordinación", pin: "", pin2: "" }; return; }
    if (st.step === 2) {
      const f = ui.form;
      if (!f.nombre.trim()) { st.err = "Escribí tu nombre."; return; }
      if (!/^\d{4}$/.test(f.pin)) { st.err = "El PIN tiene que tener 4 números."; return; }
      if (f.pin !== f.pin2) { st.err = "Los dos PIN no coinciden."; return; }
      st.err = null; st.step = 3;
    }
  },
  setupBack() { ui.setup.step = Math.max(1, ui.setup.step - 1); ui.setup.err = null; },
  async setupFin(d) {
    const f = ui.form; const salt = uid();
    const u = { id: uid("u-"), nombre: f.nombre.trim(), rol: f.rol, admin: true, activo: true, salt, pin: await hashPin(f.pin, salt), cambiarPin: false, creado: Date.now() };
    saveStaff(u);
    saveCfg({ inicio: today(), responsableHabitual: null });
    if (d.modo === "ejemplo") await cargarEjemplo(u.id);
    S.user = u; ui = UI0();
    if (d.modo === "planilla") { ui.sub = "importar"; ui.imp = {}; }
    toast(d.modo === "ejemplo" ? "Listo. Cargamos datos de ejemplo para que pruebes la app." : `Hola, ${primerNombre(u.nombre)}. Ya podés empezar.`);
  },

  /* Ingreso */
  loginUser(d) { ui.login = { uid: d.uid, pin: "", err: "", fails: 0 }; ui.loginMsg = null; },
  loginBack() { ui.login = { uid: null, pin: "", err: "" }; },
  async pin(d) {
    const L = ui.login; L.shake = false;
    if (L.lockUntil && Date.now() < L.lockUntil) return;
    if (d.k === "del") { L.pin = L.pin.slice(0, -1); L.err = ""; return; }
    if (L.pin.length >= 4) return;
    L.pin += d.k; L.err = "";
    if (L.pin.length < 4) return;
    const u = staffById(L.uid);
    const ok = u && u.activo !== false && (await hashPin(L.pin, u.salt)) === u.pin;
    if (ok) {
      S.user = u; lastActivity = Date.now(); Sound.unlock();
      const keep = { tab: "hoy" }; ui = { ...UI0(), ...keep };
      if (u.cambiarPin) { ui.form = {}; openSheet("pin"); }
      if (Alarm.activa) {} // la alarma sigue visible
    } else {
      L.fails = (L.fails || 0) + 1; L.pin = ""; L.shake = true;
      L.err = L.fails >= 5 ? "" : "PIN incorrecto. Probá de nuevo.";
      if (L.fails >= 5) { L.lockUntil = Date.now() + 30000; L.fails = 0; setTimeout(render, 30100); }
      try { navigator.vibrate && navigator.vibrate(120); } catch (e) {}
    }
  },
  logout() { Sound.stop(); S.user = null; ui = UI0(); },

  /* Navegación */
  tab(d) { goTab(d.tab); },
  sub(d) { ui.sub = d.sub; ui.ficha = null; ui.sheet = null; if (d.sub === "importar") ui.imp = {}; toTop(); },
  back() { ui.sub = null; ui.form = null; ui.formErr = null; toTop(); },
  ficha(d) { ui.ficha = d.pid; ui.sheet = null; },
  closeFicha() { ui.ficha = null; },
  sheet(d, el) {
    const s = d.s;
    if (s === "editreg") {
      const t = tomaPorId(d.id); const r = t.r;
      ui.form = { estado: r?.estado === "nodada" ? "nodada" : "dada", horaReal: r?.horaReal || (t.fecha === today() ? nowHM() : t.hora), motivo: r?.motivo || "", nota: r?.nota || "" };
    } else if (s === "nodio" || s === "cuando") {
      ui.form = { motivo: "", nota: "", horaReal: "" };
    } else if (s === "miembro") {
      const u = d.uid ? staffById(d.uid) : null;
      ui.form = { u: u ? { ...u, pin: "", resp: S.cfg.responsableHabitual === u.id } : { _nuevo: true, nombre: "", rol: "Cuidado", pin: "", admin: false, resp: false, activo: true } };
    } else if (["pin", "borrar"].includes(s)) ui.form = {};
    else if (s !== "restore") { if (ui.sub !== "persona") ui.form = null; }
    openSheet(s, { id: d.id, pid: d.pid });
  },
  closeSheet() { if (S.user?.cambiarPin && ui.sheet?.s === "pin") return; closeSheet(); },
  scrim(d, el, ev) { if (ev.target === el) A.closeSheet(); },
  fSet(d) { ui.form[d.k] = d.v; },
  verSinreg() { ui.verSinreg = !ui.verSinreg; },
  semDia(d) { ui.semDia = d.iso; },
  pfAct(d) { ui.pf.act = d.v === "1"; },
  hf(d) { ui.hf[d.k] = d.v; },
  verHist(d) { ui.hf = { rango: "30", pid: d.pid, estado: "" }; goTab("historial"); },

  /* Tomas */
  dar(d) {
    const t = tomaPorId(d.id);
    if (d.prev || minutosTarde(t) > S.cfg.margen || t.fecha !== today()) { ui.form = { horaReal: "" }; openSheet("cuando", { id: d.id }); return; }
    darToma(d.id);
    toast(`${t.m.nombre}: registrada para ${primerNombre(t.p.nombre)}`, true);
  },
  darTodas(d) {
    const ids = d.ids.split(",");
    if (d.prev) { const t = tomaPorId(ids[0]); ui.form = { horaReal: "", ids }; openSheet("cuando", { id: ids[0], ids }); return; }
    ids.forEach((id, i) => darToma(id, null, i > 0));
    const t = tomaPorId(ids[0]);
    toast(`${plural(ids.length, "toma registrada", "tomas registradas")} para ${primerNombre(t.p.nombre)}`, true);
  },
  guardarCuando(d) {
    const h = normHora(ui.form.horaReal); if (!h) return;
    const ids = ui.sheet.ids || [d.id];
    ids.forEach((id, i) => darToma(id, h, i > 0));
    const t = tomaPorId(ids[0]);
    ui.sheet = null; ui.form = null;
    toast(`${ids.length > 1 ? plural(ids.length, "toma") : t.m.nombre} de ${primerNombre(t.p.nombre)}: dada a las ${h}`, true);
  },
  guardarNodio(d) {
    const t = tomaPorId(d.id); const f = ui.form;
    setReg(d.id, { ...regBase(t), estado: "nodada", motivo: f.motivo, nota: f.nota || "", horaReal: nowHM(), posp: null });
    ui.sheet = null; ui.form = null;
    toast(`${t.m.nombre} de ${primerNombre(t.p.nombre)}: no se dio`, true);
  },
  posponer(d) {
    const t = tomaPorId(d.id); const h = hm(nowMin() + +d.n);
    setReg(d.id, { ...regBase(t), estado: "pospuesta", posp: h });
    ui.sheet = null;
    toast(`${t.m.nombre} de ${primerNombre(t.p.nombre)}: para las ${h}`, true);
  },
  guardarEdit(d) {
    const t = tomaPorId(d.id); const f = ui.form;
    if (f.estado === "nodada" && !f.motivo) { f.motivo = "Otro motivo"; }
    const h = normHora(f.horaReal) || nowHM();
    const data = { ...regBase(t), estado: f.estado, horaReal: f.estado === "dada" ? h : (t.r?.horaReal || nowHM()), motivo: f.estado === "nodada" ? f.motivo : "", nota: f.nota || "", posp: null };
    if (t.r && (t.r.estado === "dada" || t.r.estado === "nodada")) setReg(d.id, data, { edit: true });
    else setReg(d.id, { ...data, tardio: t.fecha < today() || estado(t) === "sinreg" });
    ui.sheet = null; ui.form = null;
    toast("Registro guardado", true);
  },
  borrarReg(d) {
    const t = tomaPorId(d.id);
    undoStack = [["reg", d.id, t.r && clone(t.r)]];
    S.reg.delete(d.id); unpersist("registros", d.id);
    ui.sheet = null; ui.form = null;
    toast(`${t.m.nombre} de ${primerNombre(t.p.nombre)} vuelve a estar pendiente`, true);
  },
  undo() { if (undo()) { ui.toast = null; clearTimeout(toastTimer); toast("Se deshizo el cambio"); } },
  ausencia(d) {
    const p = persona(d.pid); const iso = today(); const on = !ausente(iso, p.id);
    setAusencia(iso, p.id, on);
    ui.sheet = null;
    toast(on ? `${primerNombre(p.nombre)}: no vino hoy` : `${primerNombre(p.nombre)} sí vino hoy`, true);
  },
  setResp(d) {
    kvSet("resp-" + today(), d.v);
    ui.sheet = null;
    toast(d.v === "compartida" ? "Hoy la medicación es responsabilidad de todos" : `Hoy da la medicación ${staffNombre(d.v)}`);
  },

  /* Personas */
  nuevaPersona() { ui.form = { id: null, nombre: "", dias: [1, 2, 3, 4, 5], alergias: "", notas: "", contacto: "", tel: "", activo: true, meds: [] }; ui.formErr = null; ui.sub = "persona"; ui.ficha = null; ui.sheet = null; toTop(); },
  editarPersona(d) {
    const p = persona(d.pid);
    ui.form = { ...clone(p), alergias: p.alergias || "", notas: p.notas || "", contacto: p.contacto || "", tel: p.tel || "", meds: medsDe(p.id).map(clone) };
    ui.formErr = null; ui.sub = "persona"; ui.ficha = null; ui.sheet = null; toTop();
  },
  fDia(d) { const n = +d.n, f = ui.form; f.dias = f.dias.includes(n) ? f.dias.filter((x) => x !== n) : [...f.dias, n].sort(); },
  fToggle(d) { ui.form[d.k] = !ui.form[d.k]; },
  medNuevo() { ui.form.med = { _nuevo: true, nombre: "", dosis: "", indicacion: "", horas: [], nuevaHora: "" }; ui.medErr = null; openSheet("med"); },
  medEdit(d) { ui.form.med = { ...clone(ui.form.meds[+d.i]), _i: +d.i, nuevaHora: "" }; ui.medErr = null; openSheet("med"); },
  medHoraAdd() { const m = ui.form.med; const h = normHora(m.nuevaHora); if (!h) { ui.medErr = "Elegí una hora."; return; } if (!m.horas.includes(h)) m.horas = [...m.horas, h].sort(); m.nuevaHora = ""; ui.medErr = null; },
  medHoraDel(d) { const m = ui.form.med; m.horas.splice(+d.i, 1); },
  medGuardar() {
    const m = ui.form.med;
    const h = normHora(m.nuevaHora); if (h && !m.horas.includes(h)) m.horas = [...m.horas, h].sort();
    if (!m.nombre.trim()) { ui.medErr = "Escribí el nombre del medicamento."; return; }
    if (!m.horas.length) { ui.medErr = "Sumá al menos un horario."; return; }
    const clean = { id: m.id || uid("m-"), nombre: m.nombre.trim(), dosis: m.dosis.trim(), indicacion: (m.indicacion || "").trim(), horas: m.horas, activo: true, _dirty: true, _nuevoMed: !m.id };
    if (m._nuevo) ui.form.meds.push(clean); else ui.form.meds[m._i] = { ...ui.form.meds[m._i], ...clean, _nuevoMed: ui.form.meds[m._i]._nuevoMed };
    delete ui.form.med; ui.sheet = null; ui.medErr = null;
  },
  medQuitar() { const m = ui.form.med; ui.form.meds[m._i]._del = true; delete ui.form.med; ui.sheet = null; },
  guardarPersona() {
    const f = ui.form;
    if (!f.nombre.trim()) { ui.formErr = "Escribí el nombre de la persona."; return; }
    if (!f.dias.length) { ui.formErr = "Elegí al menos un día en que viene al centro."; return; }
    const nueva = !f.id;
    const p = { id: f.id || uid("p-"), nombre: f.nombre.trim(), dias: f.dias, alergias: f.alergias.trim(), notas: f.notas.trim(), contacto: f.contacto.trim(), tel: f.tel.trim(), activo: f.activo !== false, creado: f.creado || Date.now(), desde: f.desde || (nueva ? today() : undefined) };
    savePersona(p);
    for (const m of f.meds) {
      if (m._del) { if (!m._nuevoMed) removeMed(m.id); continue; }
      if (m._dirty || nueva) { const { _dirty, _nuevoMed, _del, _i, nuevaHora, _nuevo, ...rest } = m; saveMed({ ...rest, pid: p.id, desde: rest.desde || (_nuevoMed ? today() : undefined), creado: rest.creado || Date.now() }); }
    }
    ui.sub = null; ui.form = null; ui.formErr = null; ui.ficha = p.id;
    toast(nueva ? `Se agregó a ${primerNombre(p.nombre)}` : `Se guardaron los cambios de ${primerNombre(p.nombre)}`);
  },

  /* Equipo */
  uToggle(d) { const u = ui.form.u; if (d.k === "activo") u.activo = u.activo === false; else u[d.k] = !u[d.k]; },
  async guardarMiembro() {
    const u = ui.form.u;
    if (!u.nombre.trim()) { ui.uErr = "Escribí el nombre."; render(); return; }
    if (u._nuevo && !/^\d{4}$/.test(u.pin || "")) { ui.uErr = "El PIN inicial tiene que tener 4 números."; render(); return; }
    if (!u._nuevo && u.pin && !/^\d{4}$/.test(u.pin)) { ui.uErr = "El PIN tiene que tener 4 números."; render(); return; }
    if (u.id === S.user.id && !u.admin) { ui.uErr = "No podés quitarte a vos la administración."; render(); return; }
    if (u.id === S.user.id && u.activo === false) { ui.uErr = "No podés quitarte el acceso a vos."; render(); return; }
    const prev = u._nuevo ? null : staffById(u.id);
    const out = { ...(prev || {}), id: u.id || uid("u-"), nombre: u.nombre.trim(), rol: u.rol, admin: !!u.admin, activo: u.activo !== false, creado: prev?.creado || Date.now() };
    if (u.pin) { out.salt = uid(); out.pin = await hashPin(u.pin, out.salt); out.cambiarPin = out.id !== S.user.id; delete out.ejemplo; }
    saveStaff(out);
    if (u.resp) saveCfg({ responsableHabitual: out.id }); else if (S.cfg.responsableHabitual === out.id) saveCfg({ responsableHabitual: null });
    if (out.id === S.user.id) S.user = out;
    ui.sheet = null; ui.form = null; ui.uErr = null;
    toast(u._nuevo ? `${primerNombre(out.nombre)} ya puede ingresar con su PIN` : "Cambios guardados");
  },
  async guardarPin() {
    const f = ui.form; const u = S.user;
    if (!u.cambiarPin && (await hashPin(f.actual || "", u.salt)) !== u.pin) { ui.pinErr = "El PIN actual no es correcto."; render(); return; }
    if (!/^\d{4}$/.test(f.nuevo || "")) { ui.pinErr = "El PIN nuevo tiene que tener 4 números."; render(); return; }
    if (f.nuevo !== f.nuevo2) { ui.pinErr = "Los dos PIN no coinciden."; render(); return; }
    const salt = uid();
    const out = { ...u, salt, pin: await hashPin(f.nuevo, salt), cambiarPin: false }; delete out.ejemplo;
    saveStaff(out); S.user = out;
    ui.sheet = null; ui.form = null; ui.pinErr = null;
    toast("Tu PIN quedó guardado");
  },

  /* Ajustes */
  cfgToggle(d) { saveCfg({ [d.k]: !S.cfg[d.k] }); },
  cfgStep(d) { const v = Math.min(+d.max, Math.max(+d.min, S.cfg[d.k] + +d.d)); saveCfg({ [d.k]: v }); },
  async pedirNotif() { try { await Notification.requestPermission(); } catch (e) {} render(); },
  probarAlarma(d) { ui.sheet = null; Alarm.probar(d.k); },
  alarmVer() { Alarm.cerrar(); if (S.user) goTab("hoy"); },
  alarmSilenciar() { Sound.stop(); Alarm.activa = null; },
  demoHora(d) {
    if (!d.h) { Clock.offsetMin = 0; }
    else { const real = new Date(); Clock.offsetMin = mins(d.h) - (real.getHours() * 60 + real.getMinutes()); }
    saveCfg({ demoOffset: Clock.offsetMin });
    toast(d.h ? `Reloj de demostración: ${d.h}` : "Volviste a la hora real");
  },
  async borrarTodo() {
    await DB.clearAll();
    location.reload();
  },

  /* Datos */
  async backup() {
    const data = await DB.dump();
    const fecha = Date.now();
    descargar(`ronda-gervital-copia-${today()}.json`, JSON.stringify({ app: "ronda-gervital", version: 1, fecha, data }, null, 1), "application/json");
    kvSet("ultimaCopia", fecha);
    if (!window.RONDA_ARTIFACT) toast("Copia descargada. Guardala en un lugar seguro.");
  },
  restoreAsk() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
    inp.onchange = async () => {
      try {
        const obj = JSON.parse(await inp.files[0].text());
        if (obj.app !== "ronda-gervital" || !obj.data) throw 0;
        ui.form = { restore: obj }; openSheet("restore"); render();
      } catch (e) { toast("Ese archivo no es una copia de Ronda.", false, "bad"); }
    };
    inp.click();
  },
  async restoreOk() {
    const obj = ui.form.restore;
    await DB.clearAll();
    for (const s of DB.STORES) if (obj.data[s]?.length) await DB.putMany(s, obj.data[s]);
    location.reload();
  },
  exportCSV() {
    const H = ui.hf; const hasta = today();
    const desde = H.rango === "hoy" ? hasta : addDays(hasta, -(+H.rango - 1));
    let items = historial(desde, hasta);
    if (H.pid) items = items.filter((x) => x.p.id === H.pid);
    if (H.estado) items = items.filter((x) => x.e === H.estado);
    const rows = [["Fecha", "Hora indicada", "Hora real", "Persona", "Medicamento", "Dosis", "Estado", "Motivo", "Nota", "Registró", "Corregida"]];
    items.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).forEach((x) => rows.push([
      x.fecha, x.hora || "", x.r?.horaReal || "", x.p.nombre, x.m?.nombre || "", x.m?.dosis || "", ESTADO_TXT[x.e], x.r?.motivo || x.a?.motivo || "", x.r?.nota || "", x.r ? staffNombre(x.r.por) : x.a ? staffNombre(x.a.por) : "", x.r?.ediciones?.length ? "Sí" : "",
    ]));
    descargar(`historial-medicacion-${desde}-a-${hasta}.csv`, "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n"), "text/csv;charset=utf-8");
    if (!window.RONDA_ARTIFACT) toast(`Se descargó el historial (${plural(items.length, "fila")})`);
  },
  copiarExport(d, el) {
    const t = ui.form?.exp?.contenido || "";
    const ok = () => toast("Copiado. Pegalo en un archivo o en una planilla.");
    try { navigator.clipboard.writeText(t).then(ok, () => { const ta = $("#expText"); ta && ta.select(); }); } catch (e) { const ta = $("#expText"); ta && ta.select(); }
  },
  tipOk() { kvSet("tipHoy", true); },
  instalar() { if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; ui.sheet = null; render(); }); } },

  /* Importar planilla */
  impModelo() {
    const txt = "Nombre;Medicamento;Dosis;Horario;Días;Indicación\r\nElena Rodríguez;Losartán;50 mg;9:00;lun mié vie;Con el desayuno\r\nElena Rodríguez;Metformina;850 mg;9:00 y 13:00;lun mié vie;Con comida\r\nJulio Martínez;Donepecilo;10 mg;13:00;lun a vie;\r\n";
    descargar("planilla-modelo-ronda.csv", "﻿" + txt, "text/csv;charset=utf-8");
  },
  impRevisar() {
    const I = ui.imp; I.err = null;
    const rows = parseCSV(I.texto || "");
    if (!rows.length) { I.err = "No encontramos filas. Elegí un archivo o pegá la planilla."; return; }
    const pv = leerPlanilla(rows);
    if (!pv.filas.length) { I.err = "No pudimos leer ninguna fila. Revisá que tenga las columnas Nombre, Medicamento y Horario."; return; }
    I.preview = pv;
  },
  impVolver() { ui.imp.preview = null; },
  impConfirmar() {
    const pv = ui.imp.preview;
    let nP = 0, nM = 0;
    const byName = new Map(S.personas.map((p) => [sinTildes(p.nombre), p]));
    for (const r of pv.filas) {
      let p = byName.get(sinTildes(r.nombre));
      if (!p) { p = { id: uid("p-"), nombre: r.nombre, dias: r.dias || [1, 2, 3, 4, 5], notas: "", alergias: "", contacto: "", tel: "", activo: true, creado: Date.now(), desde: today() }; savePersona(p); byName.set(sinTildes(r.nombre), p); nP++; }
      else if (r.dias && !p._tocado) { p = { ...p, dias: [...new Set([...(p.dias || []), ...r.dias])].sort() }; savePersona(p); byName.set(sinTildes(r.nombre), p); }
      const ya = S.meds.find((m) => m.pid === p.id && sinTildes(m.nombre) === sinTildes(r.med) && (m.dosis || "") === r.dosis);
      if (ya) { saveMed({ ...ya, horas: [...new Set([...ya.horas, ...r.horas])].sort() }); }
      else { saveMed({ id: uid("m-"), pid: p.id, nombre: r.med, dosis: r.dosis, indicacion: r.indicacion, horas: r.horas, activo: true, creado: Date.now(), desde: today() }); nM++; }
    }
    ui.imp = null; ui.sub = null; goTab("personas");
    toast(`Se importaron ${plural(nP, "persona")} y ${plural(nM, "medicamento")}`);
  },
};

function leerPlanilla(rows) {
  const head = rows[0].map(sinTildes);
  const col = (...keys) => head.findIndex((h) => keys.some((k) => h.includes(k)));
  let iN = col("nombre", "persona", "usuario", "residente"), iM = col("medicamento", "medicacion", "farmaco", "remedio"), iD = col("dosis", "concentracion", "cantidad"), iH = col("horario", "hora"), iDi = col("dia", "asiste"), iI = col("indicacion", "observ", "nota", "como");
  let data = rows.slice(1);
  if (iN < 0 || iM < 0 || iH < 0) { iN = 0; iM = 1; iD = 2; iH = 3; iDi = 4; iI = 5; data = rows; }
  const filas = [], errores = [];
  data.forEach((r, n) => {
    const nombre = (r[iN] || "").trim(), med = (r[iM] || "").trim();
    const horas = [...String(r[iH] || "").matchAll(/(\d{1,2})(?:[:.hH](\d{2}))?/g)].map((m) => normHora(m[0])).filter(Boolean);
    if (!nombre || !med || !horas.length) { if (r.some((c) => c.trim())) errores.push(`fila ${n + (data === rows ? 1 : 2)}`); return; }
    filas.push({ nombre: nombre.replace(/\s+/g, " "), med, dosis: iD >= 0 ? (r[iD] || "").trim() : "", horas: [...new Set(horas)].sort(), dias: iDi >= 0 ? leerDias(r[iDi]) : null, indicacion: iI >= 0 ? (r[iI] || "").trim() : "" });
  });
  const nombres = new Set(filas.map((f) => sinTildes(f.nombre)));
  const existentes = [...nombres].filter((n) => S.personas.some((p) => sinTildes(p.nombre) === n)).length;
  return { filas, errores, personas: [...nombres], meds: filas.length, existentes };
}
function leerDias(txt) {
  const s = sinTildes(txt || "");
  if (!s.trim()) return null;
  if (/todos|lunes a viernes|lun a vie|l a v|l-v/.test(s)) return [1, 2, 3, 4, 5];
  const map = [["lun", 1], ["mar", 2], ["mie", 3], ["jue", 4], ["vie", 5], ["sab", 6]];
  let out = map.filter(([k]) => s.includes(k)).map(([, n]) => n);
  if (!out.length) { const letras = { l: 1, m: 2, x: 3, j: 4, v: 5, s: 6 }; out = [...new Set(s.split(/[^a-z]+/).filter((w) => w.length === 1 && letras[w]).map((w) => letras[w]))]; }
  return out.length ? out.sort() : null;
}

/* ---------- Eventos ---------- */
document.addEventListener("click", async (ev) => {
  lastActivity = Date.now();
  Sound.unlock();
  const el = ev.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  if (!A[act]) return;
  if (act !== "scrim") ev.preventDefault();
  if (act === "scrim" && ev.target !== el) return;
  await A[act](el.dataset, el, ev);
  render();
});
document.addEventListener("input", (ev) => {
  lastActivity = Date.now();
  const el = ev.target, d = el.dataset;
  if (d.f != null && ui.form) { ui.form[d.f] = el.value; if (["horaReal", "conf"].includes(d.f) || (el.tagName === "SELECT")) render(); }
  else if (d.fm != null && ui.form?.med) ui.form.med[d.fm] = el.value;
  else if (d.fu != null && ui.form?.u) ui.form.u[d.fu] = el.value;
  else if (d.pf != null) { ui.pf[d.pf] = el.value; render(); }
  else if (d.hf != null) { ui.hf[d.hf] = el.value; render(); }
  else if (d.imp != null) { ui.imp = ui.imp || {}; ui.imp[d.imp] = el.value; }
});
document.addEventListener("change", async (ev) => {
  const el = ev.target;
  if (el.dataset.actChange === "impFile" && el.files[0]) {
    let txt = await el.files[0].text();
    if (/\uFFFD/.test(txt)) { try { txt = new TextDecoder("windows-1252").decode(await el.files[0].arrayBuffer()); } catch (e) {} }
    ui.imp = { texto: txt }; A.impRevisar(); render();
  }
});
document.addEventListener("keydown", (ev) => {
  lastActivity = Date.now();
  if (ev.key === "Escape") { if (Alarm.activa) A.alarmSilenciar(); else if (ui.sheet) A.closeSheet(); else if (ui.ficha) ui.ficha = null; else return; render(); }
  if (!S.user && ui.login.uid && /^[0-9]$/.test(ev.key)) { A.pin({ k: ev.key }).then(render); }
  if (!S.user && ui.login.uid && ev.key === "Backspace") { A.pin({ k: "del" }).then(render); }
});
window.addEventListener("scroll", () => { const t = $(".topbar"); if (t) t.classList.toggle("scrolled", window.scrollY > 4); }, { passive: true });
document.addEventListener("click", (ev) => { if (ev.target.closest("#vista")) Vista.toggle(); });
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") tick(true); });

/* ---------- Reloj ---------- */
function tick(force) {
  if (!listo) return;
  // cierre de sesión por inactividad
  if (S.user && Date.now() - lastActivity > S.cfg.autoLogout * 60000 && !Alarm.activa) {
    S.user = null; ui = UI0(); ui.loginMsg = "La sesión se cerró porque no se usó por un rato."; render(); return;
  }
  const m = nowMin();
  $$(".js-hora").forEach((e) => (e.textContent = hm(m)));
  if (S.staff.length) Alarm.check();
  if (m !== lastMin || force) { lastMin = m; if (S.user && !ui.sheet) renderSoft(); }
}

/* ---------- Arranque ---------- */
async function start() {
  Vista.init();
  render();
  await DB.open();
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  await loadAll();
  listo = true;
  lastMin = nowMin();
  render();
  setInterval(tick, 10000);
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && !window.RONDA_SINGLE) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
start();
