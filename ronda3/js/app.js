/* Ronda · Gervital — navegación, acciones y arranque */
"use strict";

const UI0 = () => ({
  tab: "hoy", sub: null, sheet: null, ficha: null, form: null, toast: null,
  ronda: null,
  pf: { q: "", act: true, dia: null },
  hf: { rango: "7", pid: "", estado: "" },
  modo: "login", // login · crear
  imp: null,
});
let ui = UI0();
let listo = false;
let deferredInstall = null;
let lastActivity = Date.now();
let lastMin = -1;
let prevKeys = {};

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
  else if (!S.user) { if (!ui.form) ui.form = {}; html = ui.modo === "crear" ? vSetup() : vLogin(); }
  else {
    let content;
    if (ui.sub === "persona") content = vPersonaEdit();
    else if (ui.sub === "equipo") content = vEquipo();
    else if (ui.sub === "ajustes") content = vAjustes();
    else if (ui.sub === "importar") content = vImportar();
    else content = ({ hoy: vHoy, personas: vPersonas, historial: vHistorial, mas: vMas }[ui.tab] || vHoy)();
    html = vShell(content) + (ui.ficha ? vFicha() : "");
  }
  html += vSheet() + vAlarm() + vToast();
  /* Las entradas animadas se ven solo cuando algo aparece, no en cada re-render */
  const keys = { v: S.user ? `${ui.tab}|${ui.sub || ""}` : "gate", s: ui.sheet ? ui.sheet.s + (ui.sheet.id || "") : "", f: ui.ficha || "", a: Alarm.activa ? "1" : "", t: ui.toast ? ui.toast.msg : "" };
  for (const k in keys) root.toggleAttribute("data-k" + k, !!keys[k] && keys[k] === prevKeys[k]);
  prevKeys = keys;
  root.innerHTML = html;
  document.body.style.overflow = ui.sheet || Alarm.activa || ui.ficha ? "hidden" : "";

  if (focusSel) { const el = $(focusSel); if (el) { el.focus({ preventScroll: true }); if (caret != null) try { el.setSelectionRange(caret, caret); } catch (e) {} } }
  if (sc) sc.scrollTop = scrollY; else window.scrollTo(0, scrollY);
  marcoScroll();
  initRuedas();
  if (ui.scrollTo) { const el = root.querySelector(`[data-ronda="${ui.scrollTo}"]`); ui.scrollTo = null; if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })); }
}
function marcoScroll() { const a = $("#app"); a.style.setProperty("--st", (scroller() ? a.scrollTop : 0) + "px"); }
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

const goTab = (t) => { ui.tab = t; if (t === "hoy") ui.ronda = null; ui.sub = null; ui.ficha = null; ui.sheet = null; toTop(); };
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

function iniciarSesion(u, silencioso) {
  S.user = u; lsSet("ronda-sesion", u.id); lastActivity = Date.now();
  if (!silencioso) Sound.unlock();
  ui = { ...UI0(), tab: "hoy" };
}

/* La tarjeta que se acaba de registrar se anima una sola vez */
let recienTimer;
function marcarRecien(ids) { ui.recien = ids; clearTimeout(recienTimer); recienTimer = setTimeout(() => { ui.recien = null; }, 1400); }

/* ---------- Acciones ---------- */
const A = {
  /* Entrada */
  verPass() { ui.ver = !ui.ver; },
  async entrar() {
    const f = ui.form || {};
    const usuario = (f.usuario || "").trim(), pass = f.pass || "";
    if (!usuario || !pass) { ui.loginErr = "Escribí tu usuario y tu contraseña."; return; }
    ui.ocupado = true; ui.loginErr = null; ui.loginMsg = null; render();
    try {
      const sid = await Nube.entrar(usuario, pass);
      const u = staffById(sid);
      if (!u || u.activo === false) throw new Error("datos");
      iniciarSesion(u);
    } catch (e) {
      ui.loginErr = e.message === "red" ? "No hay internet. Conectate y probá de nuevo." : e.message === "muchos" ? "Demasiados intentos. Esperá unos minutos." : e.message === "datos" ? "Usuario o contraseña incorrectos." : "No se pudo entrar. Probá de nuevo.";
      try { navigator.vibrate && navigator.vibrate(120); } catch (er) {}
    } finally { ui.ocupado = false; }
  },
  async crearAdmin() {
    const f = ui.form || {};
    const nombre = (f.nombre || "").trim(), usuario = (f.usuario || "").trim().toLowerCase(), pass = f.pass || "";
    if (!nombre || !usuario || !pass) { ui.loginErr = "Completá los tres datos."; return; }
    if (!/^[a-z0-9._-]{3,}$/.test(usuario)) { ui.loginErr = "El usuario va sin espacios ni tildes (mínimo 3 letras)."; return; }
    if (pass.length < 4) { ui.loginErr = "La contraseña tiene que tener al menos 4 caracteres."; return; }
    ui.ocupado = true; ui.loginErr = null; render();
    try {
      const u = { id: uid("u-"), nombre, usuario, rol: "", admin: true, activo: true, creado: Date.now() };
      saveStaff(u);
      saveCfg({ inicio: today(), responsableHabitual: null });
      await Nube.primerAdmin(usuario, pass, u.id);
      iniciarSesion(u);
    } catch (e) {
      ui.loginErr = String(e.message).includes("ya hay") ? "Ya existe una cuenta. Entrá con tu usuario." : "No se pudo crear. Revisá la conexión y probá de nuevo.";
      if (String(e.message).includes("ya hay")) { ui.modo = "login"; await DB.clearAll(); Nube.salir(); await loadAll(); }
    } finally { ui.ocupado = false; }
  },
  logout() { Sound.stop(); S.user = null; lsDel("ronda-sesion"); ui = UI0(); },

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
      ui.form = { u: u ? { ...u, pass: "" } : { _nuevo: true, nombre: "", usuario: "", pass: "", admin: false, activo: true } };
    } else if (["pin", "borrar"].includes(s)) ui.form = {};
    else if (s === "unir") { ui.form = { unir: d.v || "" }; ui.nubeErr = null; }
    else if (["nube", "avisos"].includes(s)) { ui.nubeErr = null; if (ui.sub !== "persona") ui.form = null; }
    else if (s !== "restore") { if (ui.sub !== "persona") ui.form = null; }
    openSheet(s, { id: d.id, pid: d.pid, ids: d.ids ? d.ids.split(",") : (ui.sheet && ui.sheet.ids && ui.sheet.id === d.id ? ui.sheet.ids : null) });
  },
  closeSheet() { closeSheet(); },
  scrim(d, el, ev) { if (ev.target === el) A.closeSheet(); },
  fSet(d) { ui.form[d.k] = d.v; },
  ronda(d) { ui.ronda = d.h; toTop(); },
  irRonda(d) { ui.ag = ui.ag || {}; ui.ag[d.h] = true; ui.scrollTo = d.h; },
  verRonda(d) { ui.ag = ui.ag || {}; const cur = d.h in ui.ag ? ui.ag[d.h] : !!d.def; ui.ag[d.h] = !cur; },
  limpiarBusqueda() { ui.pf.q = ""; },
  pfAct(d) { ui.pf.act = d.v === "1"; toTop(); },
  pfDia(d) { ui.pf.dia = d.n ? +d.n : null; },
  hf(d) { ui.hf[d.k] = d.v; },
  verHist(d) { ui.hf = { rango: "30", pid: d.pid, estado: "" }; goTab("historial"); },

  /* Tomas */
  dar(d) {
    const t = tomaPorId(d.id);
    if (d.prev || minutosTarde(t) > S.cfg.margen || t.fecha !== today()) { ui.form = { horaReal: "" }; openSheet("cuando", { id: d.id }); return; }
    darToma(d.id); marcarRecien([d.id]); ui.sheet = null;
    toast(`Listo: ${primerNombre(t.p.nombre)} tomó ${t.m.nombre} a las ${nowHM()}`, true);
  },
  darTodas(d) {
    const ids = d.ids.split(",");
    if (d.prev) { const t = tomaPorId(ids[0]); ui.form = { horaReal: "", ids }; openSheet("cuando", { id: ids[0], ids }); return; }
    openSheet("confirmar", { id: ids[0], ids, tipo: "dar" });
  },
  darTodasOk() {
    const ids = ui.sheet.ids;
    ids.forEach((id, i) => darToma(id, null, i > 0)); marcarRecien(ids);
    try { navigator.vibrate && navigator.vibrate(30); } catch (e) {}
    const t = tomaPorId(ids[0]);
    ui.sheet = null;
    const completa = t.fecha === today() && tomasDe(today()).filter((x) => x.hora === t.hora && estado(x) !== "ausente").every((x) => !abiertaT(x));
    toast(completa ? `Ronda de las ${t.hora} completa` : `Listo: ${primerNombre(t.p.nombre)} tomó ${ids.length > 1 ? plural(ids.length, "medicamento") : t.m.nombre} a las ${nowHM()}`);
  },
  guardarCuando(d) {
    const h = normHora(ui.form.horaReal); if (!h) return;
    const ids = ui.sheet.ids || [d.id];
    ids.forEach((id, i) => darToma(id, h, i > 0)); marcarRecien(ids);
    const t = tomaPorId(ids[0]);
    ui.sheet = null; ui.form = null;
    toast(`${ids.length > 1 ? plural(ids.length, "toma") : t.m.nombre} de ${primerNombre(t.p.nombre)}: dada a las ${h}`, true);
  },
  guardarNodio(d) {
    const f = ui.form; const ids = ui.sheet.ids || [d.id];
    ids.forEach((id, i) => { const t = tomaPorId(id); setReg(id, { ...regBase(t), estado: "nodada", motivo: f.motivo, nota: f.nota || "", horaReal: nowHM(), posp: null }, { join: i > 0 }); });
    const t = tomaPorId(ids[0]); marcarRecien(ids);
    ui.sheet = null; ui.form = null;
    toast(`Anotado: ${primerNombre(t.p.nombre)} no tomó ${ids.length > 1 ? plural(ids.length, "medicamento") : t.m.nombre}`, true);
  },
  posponer(d) {
    const ids = d.ids ? d.ids.split(",") : [d.id]; const h = hm(nowMin() + +d.n);
    ids.forEach((id, i) => { const t = tomaPorId(id); setReg(id, { ...regBase(t), estado: "pospuesta", posp: h }, { join: i > 0 }); });
    const t = tomaPorId(ids[0]);
    ui.sheet = null;
    toast(`${ids.length > 1 ? plural(ids.length, "toma") : t.m.nombre} de ${primerNombre(t.p.nombre)}: para las ${h}`, true);
  },
  guardarEdit(d) {
    const t = tomaPorId(d.id); const f = ui.form;
    if (f.estado === "nodada" && !f.motivo) { f.motivo = "Otro motivo"; }
    const h = normHora(f.horaReal) || nowHM();
    const data = { ...regBase(t), estado: f.estado, horaReal: f.estado === "dada" ? h : (t.r?.horaReal || nowHM()), motivo: f.estado === "nodada" ? f.motivo : "", nota: f.nota || "", posp: null };
    if (t.r && (t.r.estado === "dada" || t.r.estado === "nodada")) setReg(d.id, data, { edit: true });
    else setReg(d.id, { ...data, tardio: t.fecha < today() || estado(t) === "sinreg" });
    ui.sheet = null; ui.form = null; marcarRecien([d.id]);
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
    if (on && !d.ok) { openSheet("confirmar", { pid: p.id, tipo: "novino" }); return; }
    setAusencia(iso, p.id, on);
    try { on && navigator.vibrate && navigator.vibrate(30); } catch (e) {}
    ui.sheet = null;
    toast(on ? `Anotado: ${primerNombre(p.nombre)} no vino hoy` : `${primerNombre(p.nombre)} sí vino hoy`);
  },
  setResp(d) {
    kvSet("resp-" + today(), d.v);
    ui.sheet = null;
    toast(d.v === "compartida" ? "Hoy la medicación es responsabilidad de todos" : `Hoy da la medicación ${staffNombre(d.v)}`);
  },

  /* Personas */
  nuevaPersona() { ui.form = { id: null, nombre: "", dias: [], notas: "", activo: true, meds: [] }; ui.formErr = null; ui.sub = "persona"; ui.ficha = null; ui.sheet = null; toTop(); },
  editarPersona(d) {
    const p = persona(d.pid);
    ui.form = { ...clone(p), notas: p.notas || "", meds: medsDe(p.id).map(clone) };
    ui.formErr = null; ui.sub = "persona"; ui.ficha = null; ui.sheet = null; toTop();
  },
  fDia(d) { const n = +d.n, f = ui.form; f.dias = f.dias.includes(n) ? f.dias.filter((x) => x !== n) : [...f.dias, n].sort(); },
  fToggle(d) { ui.form[d.k] = !ui.form[d.k]; },
  darBaja() { const n = primerNombre(ui.form.nombre); ui.form.activo = false; ui.sheet = null; A.guardarPersona(); if (!ui.form) { ui.ficha = null; toast(`${n} quedó dada de baja. La encontrás en Personas, en "Dadas de baja".`); } },
  darAlta() { const n = primerNombre(ui.form.nombre); ui.form.activo = true; A.guardarPersona(); if (!ui.form) toast(`${n} volvió a estar activa`); },
  medNuevo() { ui.form.med = { _nuevo: true, nombre: "", dosis: "", indicacion: "", horas: [], nuevaHora: "12:00" }; ui.medErr = null; openSheet("med"); },
  medEdit(d) { ui.form.med = { ...clone(ui.form.meds[+d.i]), _i: +d.i, nuevaHora: "12:00" }; ui.medErr = null; openSheet("med"); },
  medHoraAdd() { const m = ui.form.med; const h = normHora(m.nuevaHora); if (!h) { ui.medErr = "Elegí una hora."; return; } if (!m.horas.includes(h)) m.horas = [...m.horas, h].sort(); m.nuevaHora = "12:00"; ui.medErr = null; },
  medHoraDel(d) { const m = ui.form.med; m.horas.splice(+d.i, 1); },
  medGuardar() {
    const m = ui.form.med;
    const h = normHora(m.nuevaHora); if (h && !m.horas.length) m.horas = [h];
    if (!m.nombre.trim()) { ui.medErr = "Escribí el nombre del medicamento."; return; }
    if (!m.horas.length) { ui.medErr = "Sumá al menos un horario."; return; }
    const clean = { id: m.id || uid("m-"), nombre: m.nombre.trim(), dosis: m.dosis.trim(), indicacion: (m.indicacion || "").trim(), horas: m.horas, activo: true, _dirty: true, _nuevoMed: !m.id };
    if (m._nuevo) ui.form.meds.push(clean); else ui.form.meds[m._i] = { ...ui.form.meds[m._i], ...clean, _nuevoMed: ui.form.meds[m._i]._nuevoMed };
    delete ui.form.med; ui.sheet = null; ui.medErr = null;
  },
  medQuitar() { const m = ui.form.med; ui.form.meds[m._i]._del = true; delete ui.form.med; ui.sheet = null; },
  guardarPersona() {
    const f = ui.form;
    if (!f.nombre.trim()) { ui.formErr = "Escribí el nombre de la persona."; toTop(); return; }
    if (!f.dias.length) { ui.formErr = "Elegí al menos un día en que viene al centro."; return; }
    const nueva = !f.id;
    const p = { id: f.id || uid("p-"), nombre: f.nombre.trim(), dias: f.dias, notas: (f.notas || "").trim(), activo: f.activo !== false, creado: f.creado || Date.now(), desde: f.desde || (nueva ? today() : undefined) };
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
    const usuario = (u.usuario || "").trim().toLowerCase();
    if (!u.nombre.trim()) { ui.uErr = "Escribí el nombre."; return; }
    if (!/^[a-z0-9._-]{3,}$/.test(usuario)) { ui.uErr = "El usuario va sin espacios ni tildes (mínimo 3 letras)."; return; }
    if (S.staff.some((x) => x.id !== u.id && (x.usuario || "") === usuario)) { ui.uErr = "Ese usuario ya existe. Elegí otro."; return; }
    if (u._nuevo && (u.pass || "").length < 4) { ui.uErr = "La contraseña tiene que tener al menos 4 caracteres."; return; }
    if (!u._nuevo && u.pass && u.pass.length < 4) { ui.uErr = "La contraseña tiene que tener al menos 4 caracteres."; return; }
    const prev = u._nuevo ? null : staffById(u.id);
    const out = { ...(prev || {}), id: u.id || uid("u-"), nombre: u.nombre.trim(), usuario, rol: prev?.rol || "", admin: !!u.admin, activo: u.activo !== false, creado: prev?.creado || Date.now() };
    delete out.pin; delete out.salt; delete out.cambiarPin; delete out.ejemplo; delete out.pass; delete out._nuevo;
    ui.ocupado = true; ui.uErr = null; render();
    try { await Nube.cuentaGuardar(out.id, usuario, u.pass || null, out.activo); }
    catch (e) { ui.ocupado = false; ui.uErr = e.message === "ocupado" ? "Ese usuario ya existe. Elegí otro." : e.message === "red" ? "No hay internet. Conectate y probá de nuevo." : "No se pudo guardar. Probá de nuevo."; return; }
    ui.ocupado = false;
    saveStaff(out);
    if (out.id === S.user.id) S.user = out;
    ui.uErr = null;
    if (u.pass) { ui.form = { creado: { nombre: out.nombre, usuario, pass: u.pass } }; openSheet("creado"); }
    else { ui.sheet = null; ui.form = null; toast("Cambios guardados"); }
  },
  async credCompartir() {
    const c = ui.form?.creado; if (!c) return;
    const txt = `Ronda · Gervital\n${location.origin}${location.pathname}\nUsuario: ${c.usuario}\nContraseña: ${c.pass}`;
    try { if (navigator.share) { await navigator.share({ text: txt }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(txt); toast("Copiado. Pegalo en WhatsApp."); } catch (e) {}
  },
  async guardarPin() {
    const f = ui.form;
    if ((f.nuevo || "").length < 4) { ui.pinErr = "La nueva tiene que tener al menos 4 caracteres."; return; }
    ui.ocupado = true; ui.pinErr = null; render();
    try { await Nube.cambiarPass(S.user.usuario, f.actual || "", f.nuevo); }
    catch (e) { ui.ocupado = false; ui.pinErr = e.message === "actual" ? "La contraseña actual no es correcta." : e.message === "red" ? "No hay internet." : "No se pudo cambiar."; return; }
    ui.ocupado = false; ui.sheet = null; ui.form = null;
    toast("Contraseña cambiada");
  },

  /* Ajustes */
  cfgToggle(d) { saveCfg({ [d.k]: !S.cfg[d.k] }); },
  cfgStep(d) { const v = Math.min(+d.max, Math.max(+d.min, S.cfg[d.k] + +d.d)); saveCfg({ [d.k]: v }); },
  async pedirNotif() { try { await Notification.requestPermission(); } catch (e) {} render(); },
  probarAlarma(d) { ui.sheet = null; Alarm.probar(d.k); },
  alarmVer() { Alarm.cerrar(); if (S.user) goTab("hoy"); },
  alarmSilenciar() { Sound.stop(); Alarm.activa = null; },
  alarmPosponer() { const a = Alarm.activa; Alarm.posponer(10); if (a && !a.prueba) toast(`La alarma vuelve a sonar a las ${hm(nowMin() + 10)}`); },
  demoHora(d) {
    if (!d.h) { Clock.offsetMin = 0; }
    else { const real = new Date(); Clock.offsetMin = mins(d.h) - (real.getHours() * 60 + real.getMinutes()); }
    saveCfg({ demoOffset: Clock.offsetMin });
    toast(d.h ? `Reloj de demostración: ${d.h}` : "Volviste a la hora real");
  },
  async borrarTodo() {
    await DB.clearAll();
    Nube.salir();
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
    if (Nube.activa) { await Nube.subirTodo(); await Nube.sincronizar(); }
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
  /* Varios celulares */
  async nubeActivar() {
    ui.nubeErr = null; ui.nubeOcupada = true; render();
    try { await Nube.crear(); ui.nubeOcupada = false; toast("Listo: ya podés sumar otros celulares con el link"); }
    catch (e) { ui.nubeOcupada = false; ui.nubeErr = navigator.onLine ? "No se pudo activar. Probá de nuevo en un rato." : "Necesitás internet para activarlo."; }
  },
  nubeCopiar() {
    const t = Nube.link();
    try { navigator.clipboard.writeText(t).then(() => toast("Link copiado"), () => { const i = $("#nubeLink"); i && i.select(); }); } catch (e) { const i = $("#nubeLink"); i && i.select(); }
  },
  async nubeCompartir() {
    if (navigator.share) { try { await navigator.share({ title: "Ronda · Gervital", text: "Abrí este link para usar Ronda con el equipo:", url: Nube.link() }); } catch (e) {} }
    else A.nubeCopiar();
  },
  nubeSalir() { Nube.salir(); ui.sheet = null; toast("Este celular dejó de compartir datos. Lo que tiene queda guardado acá."); },
  async unirOk() {
    const f = ui.form || {}; ui.nubeErr = null; ui.nubeOcupada = true; render();
    try { await Nube.unirse(f.unir, true); ui.nubeOcupada = false; ui.sheet = null; ui.form = null; toast(S.staff.length ? "Listo. Entrá con tu PIN." : "Te uniste. Todavía no hay datos cargados."); }
    catch (e) { ui.nubeOcupada = false; ui.nubeErr = e.message === "red" ? "Necesitás internet para unirte." : "Ese link no funciona. Pedí que te lo manden de nuevo."; }
  },

  /* Alarma con la app cerrada */
  async avisosActivar() {
    ui.nubeErr = null; ui.nubeOcupada = true; render();
    try { await Nube.activarAvisos(); ui.nubeOcupada = false; toast("Listo: la alarma va a sonar aunque la app esté cerrada"); }
    catch (e) { ui.nubeOcupada = false; ui.nubeErr = e.message === "bloqueado" ? "Los avisos quedaron bloqueados. Activalos en los ajustes del celular." : e.message === "cancelado" ? "No se aceptó el permiso. Tocá Activar y elegí Permitir." : "No se pudo activar. Revisá la conexión y probá de nuevo."; }
  },
  avisosNo() { lsSet("ronda-avisos-no", "1"); ui.sheet = null; },
  async avisosDesactivar() { await Nube.desactivarAvisos(); ui.sheet = null; toast("Alarma con la app cerrada desactivada en este celular"); },
  avisosProbar() { Nube.probarAvisos(12).catch(() => {}); ui.pruebaEnviada = true; setTimeout(() => { ui.pruebaEnviada = false; renderSoft(); }, 30000); },

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
      if (!p) { p = { id: uid("p-"), nombre: r.nombre, dias: r.dias || [1, 2, 3, 4, 5], notas: "", activo: true, creado: Date.now(), desde: today() }; savePersona(p); byName.set(sinTildes(r.nombre), p); nP++; }
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
  await conRespuesta(act, el, ev);
});

/* ---------- Respuesta visual a cada acción ----------
   Confirmar muestra el tilde antes de cerrar; las hojas y la ficha salen deslizando;
   «No vino» pliega la tarjeta; las pestañas se deslizan con View Transitions. */
const sinMovimiento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const EASE = "cubic-bezier(.32,.72,0,1)";
async function conRespuesta(act, el, ev) {
  const quieto = sinMovimiento();
  if (act === "tab" && document.startViewTransition && !quieto && el.dataset.tab !== ui.tab) {
    document.startViewTransition(() => { A.tab(el.dataset, el, ev); render(); });
    return;
  }
  const confirma = act === "darTodasOk" || (act === "ausencia" && el.dataset.ok);
  if (confirma && !quieto) {
    el.classList.add("fb-ok");
    try { navigator.vibrate && navigator.vibrate(30); } catch (e) {}
    await espera(380);
  }
  const habiaHoja = !!ui.sheet, habiaFicha = !!ui.ficha;
  const pidSale = act === "ausencia" && el.dataset.ok ? el.dataset.pid : null;
  await A[act](el.dataset, el, ev);
  if (!quieto) {
    const anims = [];
    const sh = $(".sheet"), sc = $(".scrim");
    if (habiaHoja && !ui.sheet && sh) {
      anims.push(sh.animate([{ transform: "translateY(0)" }, { transform: "translateY(105%)" }], { duration: 240, easing: EASE, fill: "forwards" }).finished);
      if (sc) anims.push(sc.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: "ease", fill: "forwards" }).finished);
    }
    const dr = $(".drawer"), ds = $(".drawer-scrim");
    if (habiaFicha && !ui.ficha && dr) {
      anims.push(dr.animate([{ transform: "none" }, { transform: innerWidth >= 980 ? "translateX(105%)" : "translateY(105%)" }], { duration: 260, easing: EASE, fill: "forwards" }).finished);
      if (ds) anims.push(ds.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" }).finished);
    }
    const card = pidSale && document.querySelector(`.pc[data-pid="${pidSale}"]`);
    if (card) {
      const h = card.offsetHeight;
      anims.push(card.animate([{ height: h + "px", opacity: 1, transform: "none", marginTop: getComputedStyle(card).marginTop }, { height: "0px", opacity: 0, transform: "translateX(24px) scale(.98)", marginTop: "0px", paddingTop: "0px", paddingBottom: "0px" }], { duration: 320, easing: EASE, fill: "forwards" }).finished);
    }
    if (anims.length) await Promise.all(anims).catch(() => {});
  }
  render();
}
document.addEventListener("input", (ev) => {
  lastActivity = Date.now();
  const el = ev.target, d = el.dataset;
  if (d.f != null && ui.form) { ui.form[d.f] = el.value; if (["horaReal", "conf", "unir"].includes(d.f) || (el.tagName === "SELECT")) render(); }
  else if (d.fm != null && ui.form?.med) ui.form.med[d.fm] = el.value;
  else if (d.fu != null && ui.form?.u) ui.form.u[d.fu] = el.value;
  else if (d.pf != null) { ui.pf[d.pf] = el.value; render(); }
  else if (d.hf != null) { ui.hf[d.hf] = el.value; render(); }
  else if (d.imp != null) { ui.imp = ui.imp || {}; ui.imp[d.imp] = el.value; }
});
document.addEventListener("submit", async (ev) => {
  const f = ev.target.closest("[data-submit]"); if (!f) return;
  ev.preventDefault(); Sound.unlock();
  const a = f.dataset.submit; if (A[a]) { await A[a](f.dataset, f, ev); render(); }
});
document.addEventListener("change", async (ev) => {
  const el = ev.target;
  if (el.dataset.actChange === "impFile" && el.files[0]) {
    let txt = await el.files[0].text();
    if (/\uFFFD/.test(txt)) { try { txt = new TextDecoder("windows-1252").decode(await el.files[0].arrayBuffer()); } catch (e) {} }
    ui.imp = { texto: txt }; A.impRevisar(); render();
  }
});
/* Rueda de hora: al terminar de deslizar, queda elegida la fila del medio */
const RD_H = 48;
function initRuedas() { document.querySelectorAll(".rd-col").forEach((c) => { const on = c.querySelector(".rd-it.on"); if (on) c.scrollTop = [...c.children].indexOf(on) * RD_H; }); }
function ruedaLeer(c) {
  const its = [...c.children], i = Math.max(0, Math.min(its.length - 1, Math.round(c.scrollTop / RD_H)));
  its.forEach((it, k) => { it.classList.toggle("on", k === i); it.setAttribute("aria-selected", k === i); });
  const r = c.closest(".rueda"), v = (k) => String(r.querySelector(`[data-rd="${k}"] .rd-it.on`)?.dataset.v || 0).padStart(2, "0");
  if (ui.form?.med) ui.form.med.nuevaHora = `${v("h")}:${v("m")}`;
}
let rdTimer;
document.addEventListener("scroll", (ev) => {
  const c = ev.target.closest?.(".rd-col"); if (!c) return;
  clearTimeout(rdTimer); rdTimer = setTimeout(() => ruedaLeer(c), 90);
}, { capture: true, passive: true });
document.addEventListener("click", (ev) => { const it = ev.target.closest(".rd-it"); if (!it) return; const c = it.parentNode; c.scrollTo({ top: [...c.children].indexOf(it) * RD_H, behavior: "smooth" }); });
document.addEventListener("keydown", (ev) => {
  const c = ev.target.closest?.(".rd-col"); if (!c || !["ArrowUp", "ArrowDown"].includes(ev.key)) return;
  ev.preventDefault(); c.scrollTop += ev.key === "ArrowDown" ? RD_H : -RD_H; ruedaLeer(c);
});
document.addEventListener("keydown", (ev) => {
  lastActivity = Date.now();
  if (ev.key === "Escape") { if (Alarm.activa) A.alarmSilenciar(); else if (ui.sheet) A.closeSheet(); else if (ui.ficha) ui.ficha = null; else return; render(); }
});
document.addEventListener("scroll", (ev) => { if (ev.target.id === "app") marcoScroll(); }, { capture: true, passive: true });
window.addEventListener("scroll", () => { const t = $(".topbar"); if (t) t.classList.toggle("scrolled", window.scrollY > 4); }, { passive: true });
document.addEventListener("click", (ev) => { if (ev.target.closest("#vista")) Vista.toggle(); });
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") tick(true); });
window.addEventListener("online", () => Nube.sincronizar());

/* ---------- Reloj ---------- */
function tick(force) {
  if (!listo) return;
  // cierre de sesión por inactividad
  if (S.user && staffById(S.user.id)?.activo === false) {
    S.user = null; lsDel("ronda-sesion"); ui = UI0(); ui.loginMsg = "Tu usuario ya no tiene acceso."; render(); return;
  }
  const m = nowMin();
  $$(".js-hora").forEach((e) => (e.textContent = hm(m)));
  if (S.staff.length) Alarm.check();
  if (Nube.activa && (force || Date.now() - (Nube.ultima || 0) > 20000)) Nube.sincronizar();
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
  history.replaceState(null, "", location.pathname + location.search);
  const sid = lsGet("ronda-sesion");
  if (sid && Nube.activa && staffById(sid) && staffById(sid).activo !== false) iniciarSesion(staffById(sid), true);
  else if (!S.user) Nube.hayCuentas().then((hay) => { if (!hay && !S.user) { ui.modo = "crear"; render(); } }).catch(() => {});
  render();
  if (Nube.activa) Nube.sincronizar();
  setInterval(tick, 10000);
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && !window.RONDA_SINGLE) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
start();
