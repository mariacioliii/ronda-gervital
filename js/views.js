/* Ronda · Gervital — pantallas */
"use strict";

const TABS = [
  { id: "hoy", t: "Hoy", i: "hoy" },
  { id: "personas", t: "Personas", i: "personas" },
  { id: "historial", t: "Historial", i: "historial" },
];

const durTxt = (m) => { m = Math.abs(Math.round(m)); if (m < 60) return `${m} min`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r} min` : `${h} h`; };
const medTxt = (m) => `${esc(m.nombre)}${m.dosis ? ` <span>${esc(m.dosis)}</span>` : ""}`;

/* ---------- Carga ---------- */
function vSplash() { return `<div class="splash">${MARK}</div>`; }

/* ---------- Primer uso ---------- */
function vSetup() {
  const st = ui.setup;
  const f = ui.form || {};
  let body = "";
  if (st.step === 1) {
    body = `
      <div class="steps"><i class="on"></i><i></i><i></i></div>
      <h1>Te damos la bienvenida a Ronda</h1>
      <p class="lead">El registro de medicación de Gervital. Avisa cuando llega cada ronda, registra quién dio cada toma y guarda el historial.</p>
      <div class="stack">
        <div class="row top"><span class="ic-c">${ic("bell")}</span><div><b>Una alarma por ronda</b><div class="muted small">Las rondas salen solas de los horarios que cargues en cada persona.</div></div></div>
        <div class="row top"><span class="ic-c">${ic("check")}</span><div><b>Registrar en un toque</b><div class="muted small">Cada persona del equipo entra con su PIN y queda registrado quién dio cada toma.</div></div></div>
        <div class="row top"><span class="ic-c">${ic("shield")}</span><div><b>Los datos quedan en este dispositivo</b><div class="muted small">Funciona sin internet. Podés hacer copias de seguridad cuando quieras.</div></div></div>
      </div>
      <button class="btn block" style="margin-top:24px" data-act="setupNext">Empezar</button>
      ${Nube.disponible ? `<button class="btn line block" style="margin-top:10px" data-act="sheet" data-s="unir">${ic("phone", "s")} Ya usamos Ronda en otro celular</button>` : ""}`;
  } else if (st.step === 2) {
    body = `
      <div class="steps"><i class="on"></i><i class="on"></i><i></i></div>
      <h1>¿Quién va a administrar la app?</h1>
      <p class="lead">Esta persona puede sumar al equipo, cambiar los ajustes y hacer copias de seguridad.</p>
      <label class="field"><span>Nombre y apellido</span><input type="text" data-f="nombre" value="${esc(f.nombre || "")}" autocomplete="name" placeholder="Ej.: María Pérez"></label>
      <label class="field"><span>Qué hace en el centro</span><select data-f="rol">${ROLES.map((r) => `<option ${f.rol === r ? "selected" : ""}>${r}</option>`).join("")}</select></label>
      <div class="row" style="gap:10px">
        <label class="field grow"><span>PIN de 4 números</span><input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" data-f="pin" value="${esc(f.pin || "")}" autocomplete="new-password"></label>
        <label class="field grow"><span>Repetí el PIN</span><input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" data-f="pin2" value="${esc(f.pin2 || "")}" autocomplete="new-password"></label>
      </div>
      ${st.err ? `<p class="err">${esc(st.err)}</p>` : ""}
      <div class="row"><button class="btn line" data-act="setupBack">Volver</button><button class="btn grow" data-act="setupNext">Seguir</button></div>`;
  } else {
    body = `
      <div class="steps"><i class="on"></i><i class="on"></i><i class="on"></i></div>
      <h1>¿Cómo querés empezar?</h1>
      <p class="lead">Podés cambiar todo después.</p>
      <div class="opts">
        <button class="opt" data-act="setupFin" data-modo="ejemplo"><span class="oi">${ic("star")}</span><span class="grow">Con datos de ejemplo<small>8 personas, su medicación y dos semanas de historial para conocer la app.</small></span>${ic("chevR")}</button>
        <button class="opt" data-act="setupFin" data-modo="planilla"><span class="oi">${ic("sheet")}</span><span class="grow">Desde la planilla que ya usan<small>Nombre, medicamento y horario, en un archivo CSV.</small></span>${ic("chevR")}</button>
        <button class="opt" data-act="setupFin" data-modo="vacia"><span class="oi mute">${ic("plus")}</span><span class="grow">Empezar sin datos<small>Cargás a cada persona a mano.</small></span>${ic("chevR")}</button>
      </div>
      <button class="link" style="margin-top:14px" data-act="setupBack">Volver</button>`;
  }
  return `<div class="gate"><div class="gh"><img src="${LOGO_BLANCO}" alt="Gervital, Centro Diurno Gerontológico"></div><div class="gb"><div class="panel">${body}</div></div></div>`;
}

/* ---------- Ingreso con PIN ---------- */
function vLogin() {
  const L = ui.login;
  const activos = S.staff.filter((u) => u.activo !== false);
  const resp = responsableHoy();
  let body;
  if (!L.uid) {
    const orden = [...activos].sort((a, b) => (resp.u?.id === b.id) - (resp.u?.id === a.id) || a.nombre.localeCompare(b.nombre));
    body = `
      <h1>¿Quién sos?</h1>
      <p class="lead">Tocá tu nombre y escribí tu PIN.</p>
      ${ui.loginMsg ? `<div class="aviso info" style="margin-bottom:14px">${ic("lock")}<div>${esc(ui.loginMsg)}</div></div>` : ""}
      <div class="quienes">${orden.map((u) => `
        <button class="quien" data-act="loginUser" data-uid="${u.id}">${avatar(u, "lg")}<b>${esc(u.nombre)}</b><span>${esc(u.rol || "")}</span>${u.ejemplo ? `<em>PIN ${esc(u.ejemplo)}</em>` : ""}</button>`).join("")}
      </div>`;
  } else {
    const u = staffById(L.uid);
    const bloqueado = L.lockUntil && Date.now() < L.lockUntil;
    body = `
      <div class="pinbox">
        <div class="row" style="justify-content:center">${avatar(u, "lg")}</div>
        <h1 style="margin-top:10px">Hola, ${esc(primerNombre(u.nombre))}</h1>
        <p class="lead" style="margin-bottom:0">${bloqueado ? "Demasiados intentos. Esperá 30 segundos." : "Escribí tu PIN de 4 números"}</p>
        <div class="pindots ${L.shake ? "shake" : ""}" aria-label="${L.pin.length} de 4 números">${[0, 1, 2, 3].map((i) => `<i class="${i < L.pin.length ? "on" : ""}"></i>`).join("")}</div>
        <div role="alert" class="err" style="margin:6px 0 0;min-height:22px">${esc(L.err || "")}</div>
        <div class="pinpad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-act="pin" data-k="${n}" ${bloqueado ? "disabled" : ""}>${n}</button>`).join("")}
          <button class="fn" data-act="loginBack">No soy yo</button>
          <button data-act="pin" data-k="0" ${bloqueado ? "disabled" : ""}>0</button>
          <button class="fn" data-act="pin" data-k="del" aria-label="Borrar">${ic("undo")}</button>
        </div>
      </div>`;
  }
  return `<div class="gate"><div class="gh"><img src="${LOGO_BLANCO}" alt="Gervital, Centro Diurno Gerontológico"><span class="app">${MARK}<b>ronda</b> · registro de medicación</span></div><div class="gb"><div class="panel">${body}</div></div></div>`;
}

/* ---------- Estructura con navegación ---------- */
function vShell(content) {
  const pend = contarPendientes();
  const tabBtn = (t, cls) => `<button class="${cls}" data-act="tab" data-tab="${t.id}" ${ui.tab === t.id ? 'aria-current="page"' : ""}>`;
  const demo = Clock.offsetMin !== 0;
  return `
  <div class="shell">
    <aside class="side">
      ${marca("Gervital")}
      <nav aria-label="Secciones">${TABS.map((t) => `${tabBtn(t, "nav")}${ic(t.i)}${t.t}${t.id === "hoy" && pend ? `<span class="badge">${pend}</span>` : ""}</button>`).join("")}${tabBtn({ id: "mas" }, "nav")}${ic("ajustes")}Mi cuenta y ajustes</button></nav>
      <div class="grow"></div>
      <div class="reloj js-reloj ${demo ? "demo" : ""}" title="${demo ? "Hora de demostración" : "Hora actual"}"><span class="dot"></span><span class="js-hora">${nowHM()}</span></div>
      <div class="yo">${avatar(S.user)}<div><b>${esc(S.user.nombre)}</b><span>${esc(S.user.rol || "")}</span></div><button data-act="logout" title="Cerrar sesión" aria-label="Cerrar sesión">${ic("logout")}</button></div>
    </aside>
    <div class="wrap">
      <header class="topbar">
        ${marca("Gervital")}
        <div class="sp"></div>
        <div class="reloj js-reloj ${demo ? "demo" : ""}"><span class="dot"></span><span class="js-hora">${nowHM()}</span></div>
        <button class="me" data-act="tab" data-tab="mas" aria-label="Mi cuenta y ajustes" ${ui.tab === "mas" ? 'aria-current="page"' : ""}>${avatar(S.user, "sm")}${ic("ajustes", "s")}</button>
      </header>
      <main class="page ${ui.tab === "hoy" && !ui.sub ? "" : "narrow"}" id="main">${content}</main>
    </div>
    <nav class="tabs" aria-label="Secciones">${TABS.map((t) => `${tabBtn(t, "tab")}<span class="ico">${ic(t.i)}</span>${t.t}${t.id === "hoy" && pend ? `<span class="badge">${pend}</span>` : ""}</button>`).join("")}</nav>
  </div>`;
}
function contarPendientes() {
  const rs = rondasDe(today()); const cur = rondaActual(rs); if (!cur) return 0;
  return rs.filter((r) => mins(r.hora) <= mins(cur.hora)).reduce((n, r) => n + r.items.filter((t) => { const e = estado(t); return e === "pendiente" || e === "atrasada" || e === "pospuesta"; }).length, 0);
}

/* ---------- HOY ---------- */
/* Un solo concepto: la ronda. Arriba se elige la ronda (pastillas con la hora),
   abajo están las personas de esa ronda con lo que hay que darles. */
const PEND = ["pendiente", "pospuesta", "atrasada"];
function rondaElegida(rondas, cur) {
  const sel = rondas.find((r) => r.hora === ui.ronda);
  return sel || cur || rondas[0];
}

function vHoy() {
  const iso = today();
  if (!S.personas.some((p) => p.activo !== false)) return vSinPersonas();
  const rondas = rondasDe(iso);
  const min = nowMin();
  const cur = rondaActual(rondas);
  const saludo = `<div class="hola"><div class="grow"><h1>Hola, ${esc(primerNombre(S.user.nombre))}</h1><p>${esc(fechaLarga(iso))}</p></div>${vRespChip()}</div>`;

  if (!rondas.length) {
    const vienen = S.personas.filter((p) => asisteEl(p, iso));
    return `<div class="hoy">${saludo}
      <div class="empty"><div>${MARK}</div><h3>${vienen.length ? "Hoy no hay medicación para dar" : "Hoy no viene nadie con medicación"}</h3><p>${vienen.length ? "Las personas que vienen hoy no tienen tomas en el centro, o avisaron que no vienen." : "Podés ver quién viene cada día en Personas."}</p></div>
      ${vNoVinieron(iso)}</div>`;
  }

  const foco = rondaElegida(rondas, cur);
  const porPersona = agrupar(foco.items);
  const abiertas = porPersona.filter((g) => g.tomas.some((t) => abierta(estado(t)) || estado(t) === "sinreg"));
  const listas = porPersona.filter((g) => !abiertas.includes(g));
  const pasada = (r) => cur && mins(r.hora) < mins(cur.hora);
  const atrasadas = rondas.filter((r) => r !== foco && pasada(r) && r.items.some((t) => PEND.includes(estado(t)) || estado(t) === "sinreg"));

  const pills = `<div class="rpills" role="tablist" aria-label="Rondas de hoy">${rondas.map((r) => {
    const falta = r.items.some((t) => PEND.includes(estado(t)) || estado(t) === "sinreg") && pasada(r);
    const lista = r.hechas === r.total;
    return `<button role="tab" class="rpill ${falta ? "falta" : lista ? "ok" : ""} ${r === cur ? "ahora" : ""}" data-act="ronda" data-h="${r.hora}" aria-selected="${r === foco}"><span class="num">${r.hora}</span>${lista ? ic("check", "s") : falta ? ic("alert", "s") : r === cur ? "<i>ahora</i>" : ""}</button>`;
  }).join("")}</div>`;

  const next = rondas.find((r) => mins(r.hora) > mins(foco.hora));
  let lista = "";
  const falta = mins(foco.hora) - min;
  if (falta > 15 && abiertas.length === porPersona.length) {
    lista += `<div class="aviso info" style="margin-top:14px">${ic("bell")}<div>Todavía no es la hora. A las ${foco.hora} suena la alarma y acá vas a poder registrar cada toma.</div></div>
      <div class="section"><h2 class="h3">Quiénes toman a las ${foco.hora}</h2><span class="tag">${porPersona.length}</span></div>
      <div class="list">${porPersona.map((g) => `<button class="li" data-act="ficha" data-pid="${g.p.id}">${avatar(g.p, "sm")}<span class="grow"><span class="t">${esc(g.p.nombre)}</span><span class="d" style="display:block">${g.tomas.map((t) => `${esc(t.m.nombre)} ${esc(t.m.dosis || "")}`).join(" · ")}</span></span>${ic("chevR", "s chev")}</button>`).join("")}</div>`;
  } else if (abiertas.length) {
    lista += `<div class="section"><h2 class="h3">${foco === cur || !cur ? "Para dar" : pasada(foco) ? "Quedaron sin dar" : "Para dar"}</h2><span class="tag">${abiertas.length}</span></div>`;
    if (pasada(foco)) lista += `<p class="faint small" style="margin:-4px 0 12px">Al tocar “Se la di” te preguntamos a qué hora fue, para que quede la hora real.</p>`;
    lista += abiertas.map((g) => vPCard(g, { prev: pasada(foco) })).join("");
  } else {
    lista += `<div class="done-msg"><span class="ic">${ic("check")}</span><div><b>Ronda de las ${foco.hora} completa</b><span>${next ? `La próxima es a las ${next.hora}.` : "No quedan más rondas hoy."}</span></div>${next ? `<button class="btn sec sm" data-act="ronda" data-h="${next.hora}">Ver ${next.hora}</button>` : ""}</div>`;
  }
  if (listas.length) {
    lista += `<div class="section"><h2 class="h3">Ya registradas</h2><span class="tag ok">${listas.length}</span></div>
      <div class="hechas">${listas.map((g) => {
        const est = g.tomas.map((t) => estado(t));
        const mix = est.some((e) => e === "nodada");
        return `<button class="hecha" data-act="ficha" data-pid="${g.p.id}"><span class="ok ${mix ? "mix" : ""}">${ic(mix ? "nodio" : "check")}</span><span class="grow"><b>${esc(g.p.nombre)}</b><span class="faint small">${g.tomas.map((t) => esc(t.m.nombre)).join(", ")}</span></span><span class="faint xs num">${esc(g.tomas[0].r?.horaReal || "")}</span>${ic("chevR", "s chev")}</button>`;
      }).join("")}</div>`;
  }

  const aviso = atrasadas.length ? `<button class="aviso warn tap" data-act="ronda" data-h="${atrasadas[0].hora}">${ic("alert")}<div class="grow"><b>Quedó algo sin registrar a las ${atrasadas.map((r) => r.hora).join(" y ")}</b><p>Tocá acá para completarlo.</p></div>${ic("chevR", "s")}</button>` : "";

  return `<div class="hoy">${saludo}${vInvitaAvisos()}${pills}${vHero(foco, cur, min)}${aviso}${lista}${vNoVinieron(iso)}</div>`;
}

function vInvitaAvisos() {
  if (!Nube.pushPosible || lsGet("ronda-avisos-no") || (lsGet("ronda-avisos") && Notification.permission === "granted")) return "";
  if (esIOS() && !instalada()) return "";
  return `<button class="aviso info tap invita" data-act="sheet" data-s="avisos">${ic("bell")}<div class="grow"><b>Que la alarma suene con la app cerrada</b><p>Activalo una vez en este celular.</p></div>${ic("chevR", "s")}</button>`;
}

function vRespChip() {
  const R = responsableHoy();
  const nom = R.tipo === "persona" ? primerNombre(R.u.nombre) : R.tipo === "compartida" ? "Entre todos" : "Sin definir";
  return `<button class="respchip" data-act="sheet" data-s="resp" aria-label="Responsable de hoy: ${esc(nom)}. Cambiar">${R.tipo === "persona" ? avatar(R.u, "sm") : `<span class="av sm" style="--c:var(--violeta)">${ic("equipo", "s")}</span>`}<span><small>Da la medicación</small>${esc(nom)}</span></button>`;
}

function vHero(foco, cur, min) {
  const d = mins(foco.hora) - min;
  let sub;
  if (foco.hechas === foco.total) sub = "Todo registrado";
  else if (d > 15) sub = `Empieza en ${durTxt(d)}`;
  else if (d > 0) sub = `Empieza en ${durTxt(d)}, ya se puede dar`;
  else if (d === 0) sub = "Es ahora";
  else sub = foco === cur ? `Empezó hace ${durTxt(-d)}` : `Fue hace ${durTxt(-d)}`;
  const pct = foco.total ? Math.round((foco.hechas / foco.total) * 100) : 0;
  return `<section class="hero">
    <div class="k">Ronda de las</div>
    <div class="row top"><h1 class="num grow">${foco.hora}</h1><div class="cuenta num"><b>${foco.hechas}</b>/${foco.total}<span>tomas</span></div></div>
    <div class="sub">${sub} · ${plural(foco.personas, "persona")}</div>
    <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Tomas registradas"><i style="width:${pct}%"></i></div>
  </section>`;
}

function agrupar(tomas) {
  const m = new Map();
  for (const t of tomas) { if (!m.has(t.p.id)) m.set(t.p.id, { p: t.p, tomas: [] }); m.get(t.p.id).tomas.push(t); }
  return [...m.values()];
}

function vPCard(g, { prev = false } = {}) {
  const p = g.p;
  const abiertas = g.tomas.filter((t) => abierta(estado(t)) || estado(t) === "sinreg");
  const nadaDada = g.tomas.every((t) => !t.r || t.r.estado === "pospuesta");
  const esHoy = g.tomas[0].fecha === today();
  return `<article class="pc ${prev ? "prev" : ""}">
    <div class="hd">
      <button class="who" data-act="ficha" data-pid="${p.id}" aria-label="Ver ficha de ${esc(p.nombre)}">${avatar(p)}<span class="grow"><span class="nm">${esc(p.nombre)}</span><span class="meta">Ver ficha ${ic("chevR", "s")}</span></span></button>
      ${esHoy && nadaDada ? `<button class="btn line xs novino" data-act="ausencia" data-pid="${p.id}">${ic("ausente", "s")} No vino</button>` : ""}
    </div>
    ${p.alergias ? `<div class="nota alergia">${ic("alert", "s")}<span>Alergia: ${esc(p.alergias)}</span></div>` : ""}
    ${p.notas ? `<div class="nota">${ic("note", "s")}<span>${esc(p.notas.length > 110 ? p.notas.slice(0, 108) + "…" : p.notas)}</span></div>` : ""}
    ${g.tomas.map((t) => vMedRow(t, prev)).join("")}
    ${abiertas.length > 1 ? `<div class="ft"><button class="btn sec grow" data-act="darTodas" data-ids="${abiertas.map((t) => t.id).join(",")}" ${prev ? 'data-prev="1"' : ""}>${ic("check")} Le di las ${abiertas.length}</button></div>` : ""}
  </article>`;
}

function vMedRow(t, prev) {
  const e = estado(t);
  const open = abierta(e) || e === "sinreg";
  let tag = "";
  if (e === "sinreg") tag = `<span class="tag bad">Sin registrar</span>`;
  else if (e === "atrasada") tag = `<span class="tag sol">Atrasada ${durTxt(minutosTarde(t))}</span>`;
  else if (e === "pospuesta") tag = `<span class="tag sol">Para las ${esc(t.r.posp)}</span>`;
  const info = `<div class="grow"><div class="mn">${medTxt(t.m)}</div>${t.m.indicacion || tag ? `<div class="mi">${tag}${tag && t.m.indicacion ? " " : ""}${esc(t.m.indicacion || "")}</div>` : ""}${e === "nodada" && t.r?.motivo ? `<div class="mi">${esc(t.r.motivo)}</div>` : ""}</div>`;
  if (open) return `<div class="med open"><div class="row">${info}</div>
    <div class="acts"><button class="btn dar grow" data-act="dar" data-id="${t.id}" ${prev || e === "sinreg" ? 'data-prev="1"' : ""}>${ic("check")} Se la di</button><button class="btn line otra" data-act="sheet" data-s="otra" data-id="${t.id}">Otra opción</button></div></div>`;
  return `<div class="med ${e === "dada" ? "done" : e === "nodada" ? "no" : ""}"><span class="pill">${ic(e === "dada" ? "check" : "nodio")}</span>${info}
    <button class="reg" data-act="sheet" data-s="editreg" data-id="${t.id}" aria-label="Ver o corregir registro"><span class="st ${e}">${ESTADO_TXT[e]}</span><br>${t.r?.horaReal ? `<span class="num">${esc(t.r.horaReal)}</span> · ` : ""}${esc(primerNombre(staffNombre(t.r?.por)))}</button></div>`;
}

/* Quienes avisaron que no vienen hoy: se puede deshacer */
function vNoVinieron(iso) {
  const no = S.personas.filter((p) => asisteEl(p, iso) && ausente(iso, p.id));
  if (!no.length) return "";
  return `<div class="section"><h2 class="h3">No vinieron hoy</h2><span class="tag mute">${no.length}</span></div>
    <div class="list">${no.map((p) => `<div class="li">${avatar(p, "sm")}<span class="grow"><span class="t">${esc(p.nombre)}</span><span class="d" style="display:block">Sus tomas de hoy no suenan</span></span><button class="btn line xs" data-act="ausencia" data-pid="${p.id}">Sí vino</button></div>`).join("")}</div>`;
}

function vSinPersonas() {
  return `<section class="hero"><div class="k">${esc(fechaLarga(today()))}</div><h1 style="font-size:32px">Empecemos</h1><div class="sub">Cargá a las personas que toman medicación en el centro. Las rondas y alarmas se arman solas con sus horarios.</div></section>
    <div class="opts" style="margin-top:18px">
      <button class="opt" data-act="nuevaPersona"><span class="oi">${ic("plus")}</span><span class="grow">Agregar una persona<small>Nombre, días que viene y su medicación.</small></span>${ic("chevR")}</button>
      <button class="opt" data-act="sub" data-sub="importar"><span class="oi">${ic("sheet")}</span><span class="grow">Importar la planilla<small>Si ya tienen la lista en Excel o Google Sheets.</small></span>${ic("chevR")}</button>
    </div>`;
}

/* ---------- PERSONAS ---------- */
/* También responde "¿quién viene cada día?": las pastillas de días filtran la lista. */
function vPersonas() {
  const F = ui.pf;
  const q = sinTildes(F.q || "");
  const act = S.personas.filter((p) => p.activo !== false), ina = S.personas.filter((p) => p.activo === false);
  const usaSab = act.some((p) => (p.dias || []).includes(6));
  const dias = DIAS.filter((d) => d.n <= (usaSab ? 6 : 5));
  const hoyN = weekday(today());
  const dia = F.act ? F.dia : null;
  let lista = (F.act ? act : ina).filter((p) => !q || sinTildes(p.nombre).includes(q));
  if (dia) lista = lista.filter((p) => (p.dias || []).includes(dia));
  const horasDe = (p) => [...new Set(medsDe(p.id).flatMap((m) => m.horas))].sort();
  const resumenDia = dia ? (() => {
    const conMed = lista.filter((p) => medsDe(p.id).length);
    const hs = [...new Set(conMed.flatMap(horasDe))].sort();
    return `<p class="muted small" style="margin:0 0 12px">${DIA_NOMBRE[dia]}: ${plural(lista.length, "persona")}${hs.length ? ` · rondas a las ${hs.join(", ")}` : ""}</p>`;
  })() : "";
  return `
    <div class="pagehead"><div><h1 class="h1">Personas</h1><p>${F.act ? "Quiénes toman medicación y qué días vienen." : "Personas dadas de baja. Su historial queda guardado."}</p></div><div class="sp"></div>${F.act ? `<button class="btn" data-act="nuevaPersona">${ic("plus")} Nueva</button>` : `<button class="btn line" data-act="pfAct" data-v="1">${ic("chevL", "s")} Volver</button>`}</div>
    <div class="search">${ic("search")}<input type="search" placeholder="Buscar por nombre" data-pf="q" value="${esc(F.q || "")}" aria-label="Buscar persona"></div>
    ${F.act ? `<div class="dpills" role="group" aria-label="Qué día vienen"><button data-act="pfDia" data-n="" aria-pressed="${!dia}">Todas</button>${dias.map((d) => `<button data-act="pfDia" data-n="${d.n}" aria-pressed="${dia === d.n}">${d.k}${d.n === hoyN ? "<i>hoy</i>" : ""}</button>`).join("")}</div>${resumenDia}` : ""}
    ${lista.length ? `<div class="list">${lista.map((p) => {
      const ms = medsDe(p.id);
      const hs = horasDe(p);
      return `<button class="li" data-act="ficha" data-pid="${p.id}">${avatar(p)}<span class="grow"><span class="t">${esc(p.nombre)}</span><span class="d" style="display:block">${ms.length ? `${plural(ms.length, "medicamento")} · ${hs.join(", ")}` : "Sin medicación cargada"}</span><span class="dias-mini" aria-label="${esc(diasTexto(p.dias))}">${DIAS.slice(0, usaSab || (p.dias || []).includes(6) ? 6 : 5).map((d) => `<i class="${(p.dias || []).includes(d.n) ? "on" : ""}">${d.c}</i>`).join("")}</span></span>${ic("chevR", "s chev")}</button>`;
    }).join("")}</div>` : `<div class="empty"><div>${MARK}</div><h3>${q ? "No encontramos a nadie con ese nombre" : !F.act ? "No hay personas dadas de baja" : dia ? `El ${DIA_NOMBRE[dia].toLowerCase()} no viene nadie` : "Todavía no hay personas"}</h3>${F.act && !q && !dia ? `<p>Agregá a la primera o importá la planilla.</p><button class="btn sec" data-act="sub" data-sub="importar">${ic("sheet")} Importar planilla</button>` : ""}</div>`}
    ${F.act && ina.length ? `<button class="link small" style="margin-top:18px" data-act="pfAct" data-v="0">Ver dadas de baja (${ina.length})</button>` : ""}`;
}

/* Ficha breve (panel lateral) */
function vFicha() {
  const p = persona(ui.ficha);
  if (!p) return "";
  const iso = today();
  const ms = medsDe(p.id);
  const viene = asisteEl(p, iso);
  const aus = ausente(iso, p.id);
  const ult = [...S.reg.values()].filter((r) => r.pid === p.id && (r.estado === "dada" || r.estado === "nodada")).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora)).slice(0, 5);
  return `<div class="drawer-scrim" data-act="closeFicha"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-label="Ficha de ${esc(p.nombre)}">
    <div class="grab"></div>
    <div class="dh">${avatar(p, "lg")}<div class="grow"><h2 class="h2">${esc(p.nombre)}</h2><div class="muted small">${esc(diasTexto(p.dias))}</div>
      <div style="margin-top:6px">${p.activo === false ? '<span class="st ausente">Dada de baja</span>' : !viene ? '<span class="st ausente">Hoy no viene</span>' : aus ? '<span class="st ausente">Hoy no vino</span>' : '<span class="st dada">Hoy viene</span>'}</div></div>
      <button class="iconbtn close" data-act="closeFicha" aria-label="Cerrar">${ic("x")}</button></div>
    <div class="db">
      ${p.alergias ? `<div class="aviso bad" style="margin-bottom:6px">${ic("alert")}<div><b>Alergia: ${esc(p.alergias)}</b></div></div>` : ""}
      ${p.notas ? `<div class="kv"><span>A tener en cuenta</span><div>${esc(p.notas)}</div></div>` : ""}
      ${p.contacto || p.tel ? `<div class="kv"><span>Contacto de referencia</span><div class="row"><div class="grow">${esc(p.contacto || "")}<div class="muted small num">${esc(p.tel || "")}</div></div>${p.tel ? `<a class="btn sec sm" href="tel:${esc(p.tel.replace(/[^\d+]/g, ""))}">${ic("phone", "s")} Llamar</a>` : ""}</div></div>` : ""}
      <div class="kv"><span>Medicación</span>${ms.length ? ms.map((m) => `<div class="dmed"><span class="pill" style="width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--lila);color:var(--violeta)">${ic("pill", "s")}</span><div class="grow"><b>${esc(m.nombre)}</b> <span class="muted">${esc(m.dosis || "")}</span>${m.indicacion ? `<div class="faint small">${esc(m.indicacion)}</div>` : ""}</div><div class="num" style="font-weight:700;text-align:right">${m.horas.join("<br>")}</div></div>`).join("") : `<div class="muted">Sin medicación cargada.</div>`}</div>
      ${ult.length ? `<div class="kv"><span>Últimas tomas</span>${ult.map((r) => `<div class="row" style="padding:5px 0"><span class="st ${r.estado}">${ESTADO_TXT[r.estado]}</span><span class="grow small">${esc(r.medNombre || "")}</span><span class="faint xs num">${esc(fechaCorta(r.fecha))} ${esc(r.horaReal || r.hora)}</span></div>`).join("")}</div>` : ""}
      <div class="dacts">
        <button class="btn sec" data-act="editarPersona" data-pid="${p.id}">${ic("edit", "s")} Editar</button>
        ${p.activo !== false && viene ? `<button class="btn line" data-act="ausencia" data-pid="${p.id}">${ic(aus ? "vino" : "ausente", "s")} ${aus ? "Sí vino hoy" : "No vino hoy"}</button>` : `<button class="btn line" data-act="verHist" data-pid="${p.id}">${ic("historial", "s")} Historial</button>`}
      </div>
      ${p.activo !== false && viene ? `<button class="link small" style="margin-top:12px" data-act="verHist" data-pid="${p.id}">Ver todo su historial</button>` : ""}
    </div>
  </aside>`;
}

/* Edición de persona */
function vPersonaEdit() {
  const f = ui.form;
  const nueva = !f.id;
  return `
    <div class="subhead"><button class="iconbtn" data-act="back" aria-label="Volver">${ic("chevL")}</button><h1 class="h2">${nueva ? "Nueva persona" : "Editar a " + esc(primerNombre(f.nombre) || "la persona")}</h1></div>
    <div class="card pad">
      <label class="field"><span>Nombre y apellido</span><input type="text" data-f="nombre" value="${esc(f.nombre)}" placeholder="Ej.: Elena Rodríguez"></label>
      <div class="field"><span class="flabel">Días que viene al centro</span><div class="dsel" role="group" aria-label="Días">${DIAS.map((d) => `<button data-act="fDia" data-n="${d.n}" aria-pressed="${f.dias.includes(d.n)}" aria-label="${d.l}">${d.c}</button>`).join("")}</div><span class="hint">${esc(diasTexto(f.dias))}</span></div>
      <label class="field"><span>Alergias</span><input type="text" data-f="alergias" value="${esc(f.alergias)}" placeholder="Dejalo vacío si no tiene"></label>
      <label class="field"><span>A tener en cuenta</span><textarea data-f="notas" placeholder="Ej.: le cuesta tragar, prefiere tomarla con jugo">${esc(f.notas)}</textarea></label>
      <div class="row" style="gap:10px;flex-wrap:wrap">
        <label class="field grow" style="min-width:200px"><span>Contacto de referencia</span><input type="text" data-f="contacto" value="${esc(f.contacto)}" placeholder="Ej.: Laura (hija)"></label>
        <label class="field grow" style="min-width:160px"><span>Teléfono</span><input type="tel" data-f="tel" value="${esc(f.tel)}" placeholder="099 123 456"></label>
      </div>
    </div>
    <div class="section"><h2 class="h3">Medicación en el centro</h2><div class="sp"></div><button class="btn sec sm" data-act="medNuevo">${ic("plus", "s")} Agregar</button></div>
    ${f.meds.filter((m) => !m._del).length ? `<div class="list">${f.meds.map((m, i) => m._del ? "" : `
      <div class="li"><span class="ic">${ic("pill")}</span><span class="grow"><span class="t">${esc(m.nombre)} <span class="muted" style="font-weight:400">${esc(m.dosis || "")}</span></span><span class="d" style="display:block">${m.horas.join(" · ") || "Sin horario"}${m.indicacion ? " · " + esc(m.indicacion) : ""}</span></span><button class="btn line xs" data-act="medEdit" data-i="${i}">Editar</button></div>`).join("")}</div>`
      : `<div class="aviso">${ic("pill")}<div>Todavía no tiene medicación. Agregá cada medicamento con su dosis y horario.</div></div>`}
    ${!nueva ? `<div class="baja card pad">${f.activo !== false
      ? `<div class="grow"><b>Dar de baja</b><p>Si ya no viene al centro, deja de aparecer en las rondas y sus alarmas no suenan. Su historial queda guardado.</p></div><button class="btn danger" data-act="sheet" data-s="baja">${ic("ausente", "s")} Dar de baja</button>`
      : `<div class="grow"><b>Está dada de baja</b><p>No aparece en las rondas. Si vuelve al centro, dala de alta otra vez.</p></div><button class="btn sec" data-act="darAlta">${ic("vino", "s")} Dar de alta</button>`}</div>` : ""}
    ${ui.formErr ? `<p class="err" style="margin-top:14px">${esc(ui.formErr)}</p>` : ""}
    <div class="formbar"><button class="btn line" data-act="back">Cancelar</button><button class="btn" data-act="guardarPersona">${ic("check")} Guardar</button></div>`;
}

/* ---------- HISTORIAL ---------- */
function vHistorial() {
  const H = ui.hf;
  const hasta = today();
  const desde = H.rango === "hoy" ? hasta : addDays(hasta, -(+H.rango - 1));
  let items = historial(desde, hasta);
  if (H.pid) items = items.filter((x) => x.p.id === H.pid);
  const cuenta = (e) => items.filter((x) => x.e === e).length;
  const dadas = cuenta("dada"), no = cuenta("nodada"), sr = cuenta("sinreg");
  const tot = dadas + no + sr;
  if (H.estado) items = items.filter((x) => x.e === H.estado);
  const fechas = [...new Set(items.map((x) => x.fecha))].sort().reverse();
  const personasOpt = S.personas.map((p) => `<option value="${p.id}" ${H.pid === p.id ? "selected" : ""}>${esc(p.nombre)}</option>`).join("");
  return `
    <div class="pagehead"><div><h1 class="h1">Historial</h1><p>Cada toma registrada, quién la dio y a qué hora.</p></div><div class="sp"></div><button class="btn line sm" data-act="exportCSV">${ic("download", "s")} Descargar</button></div>
    <div class="filtros">
      <div class="seg" role="group" aria-label="Período">${[["hoy", "Hoy"], ["7", "7 días"], ["30", "30 días"]].map(([v, t]) => `<button data-act="hf" data-k="rango" data-v="${v}" aria-pressed="${H.rango === v}">${t}</button>`).join("")}</div>
      <select data-hf="pid" aria-label="Persona"><option value="">Todas las personas</option>${personasOpt}</select>
    </div>
    <div class="dpills" role="group" aria-label="Estado">${[["", "Todas"], ["dada", "Dadas"], ["nodada", "No se dieron"], ["sinreg", "Sin registrar"], ["ausencia", "No vino"]].map(([v, t]) => `<button data-act="hf" data-k="estado" data-v="${v}" aria-pressed="${H.estado === v}">${t}</button>`).join("")}</div>
    <div class="resumen">
      <div class="ok"><b>${dadas}</b><span>Dadas</span></div>
      <div class="no"><b>${no}</b><span>No se dieron</span></div>
      <div class="srg"><b>${sr}</b><span>Sin registrar</span></div>
      <div class="pc2"><b>${tot ? Math.round((dadas / tot) * 100) : 0}%</b><span>Se dieron</span></div>
    </div>
    ${fechas.length ? fechas.map((f) => {
      const del = items.filter((x) => x.fecha === f).sort((a, b) => (a.hora || "99").localeCompare(b.hora || "99") || a.p.nombre.localeCompare(b.p.nombre));
      return `<div class="hdia"><h2 class="h3">${esc(fechaRel(f))}</h2><span class="faint small">${f === today() ? esc(fechaLarga(f)) : ""}</span></div>
      <div class="list">${del.map((x) => x.e === "ausencia"
        ? `<div class="hrow"><span class="hh">—</span><span><b>${esc(x.p.nombre)}</b><div class="x">${x.a.motivo ? esc(x.a.motivo) + " · " : ""}marcó ${esc(primerNombre(staffNombre(x.a.por)))}</div></span><span class="st ausencia">No vino</span></div>`
        : `<button class="hrow" data-act="sheet" data-s="editreg" data-id="${x.id}"><span class="hh">${esc(x.hora)}${x.r?.horaReal && x.r.horaReal !== x.hora ? `<small>dada ${esc(x.r.horaReal)}</small>` : ""}</span><span><b>${esc(x.p.nombre)}</b><div class="x">${esc(x.m.nombre)} ${esc(x.m.dosis || "")}${x.r?.por ? ` · ${esc(primerNombre(staffNombre(x.r.por)))}` : ""}${x.r?.motivo ? ` · ${esc(x.r.motivo)}` : ""}${x.r?.ediciones?.length ? " · corregida" : ""}</div></span><span class="st ${x.e}">${ESTADO_TXT[x.e]}</span></button>`).join("")}</div>`;
    }).join("") : `<div class="empty"><div>${MARK}</div><h3>No hay registros en este período</h3><p>Cuando registren tomas en Hoy, van a aparecer acá.</p></div>`}`;
}

/* ---------- MÁS ---------- */
function vMas() {
  const u = S.user;
  const li = (act, icon, t, d, extra = "", cls = "") => `<button class="li" data-act="${act}" ${extra}><span class="ic ${cls}">${ic(icon)}</span><span class="grow"><span class="t">${t}</span>${d ? `<span class="d" style="display:block">${d}</span>` : ""}</span>${ic("chevR", "s chev")}</button>`;
  return `
    <div class="subhead"><button class="iconbtn" data-act="tab" data-tab="hoy" aria-label="Volver a Hoy">${ic("chevL")}</button><h1 class="h2">Mi cuenta y ajustes</h1></div>
    <div class="card pad row" style="margin-bottom:22px">${avatar(u, "lg")}<div class="grow"><div class="h3">${esc(u.nombre)}</div><div class="muted small">${esc(u.rol || "")}${u.admin ? " · Administra la app" : ""}</div></div><button class="btn line sm" data-act="logout">${ic("logout", "s")} Salir</button></div>
    ${u.admin ? `<div class="grupo"><span class="eyebrow">Centro</span><div class="list">
      ${li("sub", "equipo", "Equipo", `${plural(S.staff.filter((x) => x.activo !== false).length, "persona activa", "personas activas")} · quién puede ingresar`, 'data-sub="equipo"')}
      ${li("sub", "ajustes", "Alarmas y tiempos", `Atrasada a los ${S.cfg.margen} min · sin registrar a las ${durTxt(S.cfg.limite)}`, 'data-sub="ajustes"')}
    </div></div>` : `<div class="grupo"><span class="eyebrow">Alarmas</span><div class="list">${li("sub", "sound", "Sonido y avisos", S.cfg.sonido ? "Sonido activado" : "Sonido apagado", 'data-sub="ajustes"')}</div></div>`}
    ${Nube.disponible ? `<div class="grupo"><span class="eyebrow">Varios celulares</span><div class="list">
      ${li("sheet", "phone", "Usar en varios celulares", Nube.activa ? (Nube.estado === "sinred" ? "Conectado · sin internet ahora, se guarda y sube después" : Nube.estado === "error" ? "Conectado · hubo un problema al sincronizar" : `Conectado${Nube.ultima ? ` · al día a las ${hm(new Date(Nube.ultima).getHours() * 60 + new Date(Nube.ultima).getMinutes())}` : ""}`) : "Todos ven las mismas personas y registros", 'data-s="nube"', Nube.activa ? "ok" : "")}
      ${li("sheet", "bell", "Alarma con la app cerrada", lsGet("ronda-avisos") && typeof Notification !== "undefined" && Notification.permission === "granted" ? "Activada en este celular" : "Para que suene aunque no tengas la app abierta", 'data-s="avisos"')}
    </div></div>` : ""}
    <div class="grupo"><span class="eyebrow">Datos</span><div class="list">
      ${li("sub", "sheet", "Importar planilla", "Cargar personas y medicación desde un CSV", 'data-sub="importar"')}
      ${li("backup", "download", "Hacer copia de seguridad", kvGet("ultimaCopia") ? `Última: ${tsTexto(kvGet("ultimaCopia"))}` : "Todavía no hiciste ninguna")}
      ${u.admin ? li("restoreAsk", "upload", "Restaurar una copia", "Reemplaza los datos de este dispositivo") : ""}
    </div></div>
    <div class="grupo"><span class="eyebrow">Esta app</span><div class="list">
      ${li("sheet", "install", "Instalar en este dispositivo", "Para abrirla como una app, sin navegador", 'data-s="install"')}
      ${li("sheet", "bell", "Probar la alarma", "Escuchá cómo suena cada aviso", 'data-s="probar"')}
      ${li("sheet", "key", "Cambiar mi PIN", "", 'data-s="pin"')}
    </div></div>
    <p class="faint xs" style="text-align:center;margin-top:24px">Ronda 1.3 · Gervital Centro Diurno Gerontológico<br>${DB.enMemoria ? "Atención: este navegador no permite guardar datos. Se pierden al cerrar." : "Los datos se guardan en este dispositivo."}</p>`;
}

/* Equipo */
function vEquipo() {
  const R = S.cfg.responsableHabitual;
  return `
    <div class="subhead"><button class="iconbtn" data-act="back" aria-label="Volver">${ic("chevL")}</button><h1 class="h2">Equipo</h1><button class="btn sm" data-act="sheet" data-s="miembro">${ic("plus", "s")} Sumar</button></div>
    <p class="muted" style="margin-top:-6px">Cada persona entra con su PIN. Así queda registrado quién dio cada toma.</p>
    <div class="list">${S.staff.map((u) => `
      <button class="li" data-act="sheet" data-s="miembro" data-uid="${u.id}">${avatar(u)}<span class="grow"><span class="t">${esc(u.nombre)}${u.id === S.user.id ? " (vos)" : ""}</span><span class="d" style="display:block">${esc(u.rol || "")}</span>
      <span class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${u.id === R ? '<span class="tag sol">Responsable habitual</span>' : ""}${u.admin ? '<span class="tag">Administra</span>' : ""}${u.activo === false ? '<span class="tag mute">Sin acceso</span>' : ""}</span></span>${ic("chevR", "s chev")}</button>`).join("")}</div>`;
}

/* Ajustes */
function vAjustes() {
  const c = S.cfg;
  const sw = (k, t, d) => `<button class="switch" data-act="cfgToggle" data-k="${k}" role="switch" aria-checked="${!!c[k]}"><span class="grow"><b>${t}</b><span>${d}</span></span><span class="sw"></span></button>`;
  const step = (k, t, d, paso, minv, maxv, fmt) => `<div class="switch"><span class="grow"><b>${t}</b><span>${d}</span></span><span class="step"><button data-act="cfgStep" data-k="${k}" data-d="${-paso}" data-min="${minv}" data-max="${maxv}" aria-label="Menos">−</button><b>${fmt(c[k])}</b><button data-act="cfgStep" data-k="${k}" data-d="${paso}" data-min="${minv}" data-max="${maxv}" aria-label="Más">+</button></span></div>`;
  const notif = "Notification" in window ? Notification.permission : "na";
  return `
    <div class="subhead"><button class="iconbtn" data-act="back" aria-label="Volver">${ic("chevL")}</button><h1 class="h2">Alarmas y tiempos</h1></div>
    <div class="grupo"><span class="eyebrow">Alarmas</span><div class="card pad" style="padding-top:4px;padding-bottom:4px">
      ${sw("sonido", "Sonido", "Una campana al llegar cada ronda y un aviso más insistente si quedan tomas atrasadas.")}
      <hr class="divider" style="margin:0">
      ${sw("vibrar", "Vibración", "En celulares que lo permiten.")}
      <hr class="divider" style="margin:0">
      <div class="switch"><span class="grow"><b>Avisos del sistema</b><span>${notif === "granted" ? "Activados: la alarma aparece aunque estés en otra ventana." : notif === "denied" ? "Bloqueados en este navegador. Se activan desde la configuración del navegador." : notif === "na" ? "Este navegador no los permite." : "Para que la alarma aparezca aunque estés en otra ventana."}</span></span>${notif === "default" ? `<button class="btn sec sm" data-act="pedirNotif">Activar</button>` : ""}</div>
    </div>
    <div class="aviso info" style="margin-top:10px">${ic("info")}<div>Con la app abierta suena la campana. Para que avise con la app cerrada, activá <b>Alarma con la app cerrada</b> en Mi cuenta y ajustes.</div></div>
    <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap"><button class="btn line sm" data-act="probarAlarma" data-k="ronda">${ic("bell", "s")} Probar ronda</button><button class="btn line sm" data-act="probarAlarma" data-k="atraso">${ic("alert", "s")} Probar atraso</button></div>
    </div>
    ${esAdmin() ? `
    <div class="grupo"><span class="eyebrow">Tiempos</span><div class="card pad" style="padding-top:4px;padding-bottom:4px">
      ${step("margen", "Atrasada", "Desde cuándo una toma se marca como atrasada y suena el aviso.", 5, 10, 90, (v) => `${v} min`)}
      <hr class="divider" style="margin:0">
      ${step("limite", "Sin registrar", "Desde cuándo una toma que no se registró queda así en el historial.", 15, 60, 300, durTxt)}
      <hr class="divider" style="margin:0">
      ${step("autoLogout", "Cerrar sesión sola", "Después de este tiempo sin usar la app, hay que volver a poner el PIN.", 1, 1, 30, (v) => `${v} min`)}
    </div><p class="faint xs" style="margin:8px 4px 0">Conviene validar estos tiempos con enfermería.</p></div>
    <div class="grupo"><span class="eyebrow">Presentación</span><div class="card pad">
      <div class="row top"><div class="grow"><b>Reloj de demostración</b><div class="muted small">Para mostrar la app en otro horario. Las alarmas y los estados siguen esta hora.</div></div></div>
      <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap">${["09:00", "12:55", "13:40", "16:00"].map((h) => `<button class="btn line xs" data-act="demoHora" data-h="${h}">${h}</button>`).join("")}${Clock.offsetMin ? `<button class="btn sol xs" data-act="demoHora" data-h="">Volver a la hora real</button>` : ""}</div>
    </div></div>
    <div class="grupo"><span class="eyebrow">Datos</span><div class="list"><button class="li" data-act="sheet" data-s="borrar"><span class="ic bad">${ic("trash")}</span><span class="grow"><span class="t">Borrar todos los datos</span><span class="d" style="display:block">Para empezar de cero en este dispositivo</span></span>${ic("chevR", "s chev")}</button></div></div>` : ""}`;
}

/* Importar planilla */
function vImportar() {
  const I = ui.imp || {};
  const pv = I.preview;
  return `
    <div class="subhead"><button class="iconbtn" data-act="back" aria-label="Volver">${ic("chevL")}</button><h1 class="h2">Importar planilla</h1></div>
    ${!pv ? `
    <div class="card pad">
      <p style="margin-top:0">Usá la planilla que ya tienen. Necesita estas columnas, en cualquier orden:</p>
      <div class="chips" style="margin-bottom:14px"><span class="tag">Nombre</span><span class="tag">Medicamento</span><span class="tag">Dosis</span><span class="tag">Horario</span><span class="tag mute">Días (opcional)</span><span class="tag mute">Indicación (opcional)</span></div>
      <p class="muted small">Una fila por medicamento. Si toma a dos horas, escribilas juntas: <b>9:00 y 13:00</b>. Desde Excel o Google Sheets: <b>Archivo → Descargar / Guardar como → CSV</b>.</p>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin:16px 0 6px">
        <label class="btn">${ic("upload", "s")} Elegir archivo CSV<input type="file" accept=".csv,.txt,text/csv" data-act-change="impFile" hidden></label>
        <button class="btn line" data-act="impModelo">${ic("download", "s")} Planilla modelo</button>
      </div>
      <hr class="divider">
      <label class="field" style="margin-bottom:10px"><span>O pegá las filas acá</span><textarea data-imp="texto" rows="6" placeholder="Nombre;Medicamento;Dosis;Horario;Días&#10;Elena Rodríguez;Losartán;50 mg;9:00;lun mié vie">${esc(I.texto || "")}</textarea></label>
      ${I.err ? `<p class="err" style="margin-top:0">${esc(I.err)}</p>` : ""}
      <button class="btn sec" data-act="impRevisar">Revisar antes de importar</button>
    </div>` : `
    <div class="aviso info" style="margin-bottom:14px">${ic("info")}<div><b>Se van a cargar ${plural(pv.personas.length, "persona")} y ${plural(pv.meds, "medicamento")}</b><p>${pv.existentes ? `${plural(pv.existentes, "persona ya existía", "personas ya existían")}: se le agrega la medicación nueva. ` : ""}${pv.errores.length ? `${plural(pv.errores.length, "fila no se pudo leer", "filas no se pudieron leer")} y se van a saltear.` : "Todas las filas se leyeron bien."}</p></div></div>
    <div class="preview"><table><thead><tr><th>Persona</th><th>Medicamento</th><th>Horario</th><th>Días</th></tr></thead><tbody>
      ${pv.filas.map((r) => `<tr><td>${esc(r.nombre)}</td><td>${esc(r.med)} ${esc(r.dosis)}</td><td class="num">${r.horas.join(", ")}</td><td>${esc(r.dias ? diasTexto(r.dias) : "L a V")}</td></tr>`).join("")}
    </tbody></table></div>
    ${pv.errores.length ? `<p class="faint small">Filas salteadas: ${pv.errores.map((e) => esc(e)).join(" · ")}</p>` : ""}
    <div class="formbar"><button class="btn line" data-act="impVolver">Volver</button><button class="btn" data-act="impConfirmar">${ic("check")} Importar</button></div>`}`;
}

/* ---------- Hojas ---------- */
function tomaPorId(id) {
  const [fecha, medId, hora] = id.split("|");
  const m = S.meds.find((x) => x.id === medId);
  const r = S.reg.get(id) || null;
  const p = m ? persona(m.pid) : r ? persona(r.pid) : null;
  return { id, fecha, hora, m: m || { id: medId, nombre: r?.medNombre || "Medicación", dosis: r?.medDosis || "" }, p: p || { id: r?.pid, nombre: r?.pNombre || "Persona" }, r, aus: p ? ausente(fecha, p.id) : false };
}

function vSheet() {
  const sh = ui.sheet; if (!sh) return "";
  const f = ui.form || {};
  let title = "", sub = "", body = "", acts = "";
  const T = sh.id ? tomaPorId(sh.id) : null;
  const tname = T ? `${T.m.nombre} ${T.m.dosis || ""} · ${primerNombre(T.p.nombre)}` : "";
  switch (sh.s) {
    case "otra":
      title = tname; sub = `Toma de las ${T.hora}`;
      body = `<div class="opts">
        <button class="opt" data-act="sheet" data-s="nodio" data-id="${T.id}"><span class="oi bad">${ic("nodio")}</span><span class="grow">No se la dio<small>Elegís el motivo</small></span>${ic("chevR")}</button>
        <button class="opt" data-act="sheet" data-s="cuando" data-id="${T.id}"><span class="oi">${ic("clock")}</span><span class="grow">Se la di a otra hora<small>Para anotar la hora real</small></span>${ic("chevR")}</button>
        ${T.fecha === today() && estado(T) !== "sinreg" ? `<div class="eyebrow" style="margin:12px 4px 2px">Darla más tarde</div>
        <div class="timepick" style="grid-template-columns:repeat(3,1fr)">${[15, 30, 60].map((n) => `<button class="opt" style="justify-content:center" data-act="posponer" data-id="${T.id}" data-n="${n}">${n === 60 ? "1 hora" : n + " min"}</button>`).join("")}</div>` : ""}
      </div>`;
      break;
    case "nodio":
      title = "¿Por qué no se dio?"; sub = tname;
      body = `<div class="opts">${MOTIVOS.map((m) => `<button class="opt" data-act="fSet" data-k="motivo" data-v="${esc(m)}" aria-pressed="${f.motivo === m}"><span class="grow">${esc(m)}</span>${f.motivo === m ? ic("check") : ""}</button>`).join("")}</div>
        <label class="field" style="margin:14px 0 0"><span>Nota (opcional)</span><input type="text" data-f="nota" value="${esc(f.nota || "")}" placeholder="Ej.: se la ofrecimos dos veces"></label>`;
      acts = `<button class="btn line" data-act="closeSheet">Cancelar</button><button class="btn" data-act="guardarNodio" data-id="${T.id}" ${f.motivo ? "" : "disabled"}>Guardar</button>`;
      break;
    case "cuando": {
      title = "¿A qué hora se la diste?"; sub = tname;
      const ahora = nowHM();
      const esHoy = T.fecha === today();
      body = `<div class="timepick">
          ${esHoy ? `<button class="opt" data-act="fSet" data-k="horaReal" data-v="${ahora}" aria-pressed="${f.horaReal === ahora}"><span class="grow">Recién<small class="num">${ahora}</small></span></button>` : ""}
          <button class="opt" data-act="fSet" data-k="horaReal" data-v="${T.hora}" aria-pressed="${f.horaReal === T.hora}"><span class="grow">A la hora indicada<small class="num">${T.hora}</small></span></button>
        </div>
        <label class="field" style="margin:14px 0 0"><span>Otra hora</span><input type="time" data-f="horaReal" value="${esc(f.horaReal || "")}"></label>`;
      acts = `<button class="btn line" data-act="closeSheet">Cancelar</button><button class="btn" data-act="guardarCuando" data-id="${T.id}" ${f.horaReal ? "" : "disabled"}>${ic("check")} Guardar</button>`;
      break;
    }
    case "editreg": {
      const e = estado(T);
      title = tname; sub = `${fechaRel(T.fecha)} · toma de las ${T.hora}`;
      const ed = T.r?.ediciones || [];
      body = `
        <div class="seg" role="group" aria-label="Estado" style="margin-bottom:14px"><button data-act="fSet" data-k="estado" data-v="dada" aria-pressed="${f.estado === "dada"}">Se dio</button><button data-act="fSet" data-k="estado" data-v="nodada" aria-pressed="${f.estado === "nodada"}">No se dio</button></div>
        ${f.estado === "dada" ? `<label class="field"><span>Hora en que se dio</span><input type="time" data-f="horaReal" value="${esc(f.horaReal || "")}"></label>` : ""}
        ${f.estado === "nodada" ? `<label class="field"><span>Motivo</span><select data-f="motivo"><option value="">Elegí un motivo</option>${MOTIVOS.map((m) => `<option ${f.motivo === m ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></label>` : ""}
        <label class="field"><span>Nota (opcional)</span><input type="text" data-f="nota" value="${esc(f.nota || "")}"></label>
        ${T.r ? `<div class="audit">Registrada por <b>${esc(staffNombre(T.r.por))}</b>${T.r.ts ? ` el ${esc(tsTexto(T.r.ts))}` : ""}.${ed.map((x) => `<br>Corregida por <b>${esc(staffNombre(x.por))}</b> el ${esc(tsTexto(x.ts))} (antes: ${esc(ESTADO_TXT[x.antes.estado] || x.antes.estado)}${x.antes.horaReal ? " " + esc(x.antes.horaReal) : ""}${x.antes.motivo ? ", " + esc(x.antes.motivo) : ""}).`).join("")}</div>` : `<div class="audit">${e === "sinreg" ? "Esta toma quedó sin registrar. Si sabés qué pasó, completalo ahora: va a quedar anotado que lo registraste más tarde." : "Todavía no se registró."}</div>`}`;
      acts = `${T.r && T.fecha === today() ? `<button class="btn danger" data-act="borrarReg" data-id="${T.id}">${ic("undo", "s")} Quitar registro</button>` : `<button class="btn line" data-act="closeSheet">Cancelar</button>`}<button class="btn" data-act="guardarEdit" data-id="${T.id}">Guardar</button>`;
      break;
    }
    case "pmenu": {
      const p = persona(sh.pid); const aus = ausente(today(), p.id);
      title = p.nombre;
      body = `<div class="opts">
        <button class="opt" data-act="ausencia" data-pid="${p.id}"><span class="oi mute">${ic(aus ? "vino" : "ausente")}</span><span class="grow">${aus ? "Sí vino hoy" : "No vino hoy"}<small>${aus ? "Vuelven a aparecer sus tomas" : "Sus tomas de hoy no suenan ni quedan pendientes"}</small></span></button>
        <button class="opt" data-act="ficha" data-pid="${p.id}"><span class="oi">${ic("note")}</span><span class="grow">Ver ficha</span>${ic("chevR")}</button>
        <button class="opt" data-act="editarPersona" data-pid="${p.id}"><span class="oi">${ic("edit")}</span><span class="grow">Editar medicación y datos</span>${ic("chevR")}</button>
      </div>`;
      break;
    }
    case "resp": {
      const R = responsableHoy();
      title = "¿Quién da la medicación hoy?"; sub = "Si la responsable habitual no vino, la responsabilidad pasa a ser de todos.";
      body = `<div class="opts">${S.staff.filter((u) => u.activo !== false).map((u) => `<button class="opt" data-act="setResp" data-v="${u.id}" aria-pressed="${R.u?.id === u.id}">${avatar(u, "sm")}<span class="grow">${esc(u.nombre)}<small>${esc(u.rol || "")}${u.id === S.cfg.responsableHabitual ? " · responsable habitual" : ""}</small></span>${R.u?.id === u.id ? ic("check") : ""}</button>`).join("")}
        <button class="opt" data-act="setResp" data-v="compartida" aria-pressed="${R.tipo === "compartida"}"><span class="oi">${ic("equipo")}</span><span class="grow">Entre todos<small>Cualquiera del equipo registra las tomas</small></span>${R.tipo === "compartida" ? ic("check") : ""}</button></div>`;
      break;
    }
    case "med": {
      const m = f.med;
      title = m._nuevo ? "Agregar medicamento" : "Editar medicamento";
      body = `
        <label class="field"><span>Medicamento</span><input type="text" data-fm="nombre" value="${esc(m.nombre)}" placeholder="Ej.: Losartán"></label>
        <div class="row" style="gap:10px;flex-wrap:wrap"><label class="field grow" style="min-width:140px"><span>Dosis</span><input type="text" data-fm="dosis" value="${esc(m.dosis)}" placeholder="Ej.: 50 mg"></label>
        <label class="field grow" style="min-width:200px"><span>Indicación (opcional)</span><input type="text" data-fm="indicacion" value="${esc(m.indicacion)}" placeholder="Ej.: con el desayuno"></label></div>
        <div class="field"><span class="flabel">Horarios en el centro</span><div class="horas">${m.horas.map((h, i) => `<span class="hora-chip">${h}<button data-act="medHoraDel" data-i="${i}" aria-label="Quitar ${h}">${ic("x", "s")}</button></span>`).join("")}<input type="time" data-fm="nuevaHora" value="${esc(m.nuevaHora || "")}" aria-label="Nueva hora"><button class="btn sec sm" data-act="medHoraAdd">${ic("plus", "s")} Sumar hora</button></div><span class="hint">Cada horario arma una ronda. Si dos personas toman a la misma hora, van en la misma ronda.</span></div>
        ${ui.medErr ? `<p class="err">${esc(ui.medErr)}</p>` : ""}`;
      acts = `${m._nuevo ? `<button class="btn line" data-act="closeSheet">Cancelar</button>` : `<button class="btn danger" data-act="medQuitar">${ic("trash", "s")} Quitar</button>`}<button class="btn" data-act="medGuardar">Listo</button>`;
      break;
    }
    case "miembro": {
      const u = f.u;
      title = u._nuevo ? "Sumar al equipo" : u.nombre;
      body = `
        <label class="field"><span>Nombre y apellido</span><input type="text" data-fu="nombre" value="${esc(u.nombre)}"></label>
        <label class="field"><span>Qué hace en el centro</span><select data-fu="rol">${ROLES.map((r) => `<option ${u.rol === r ? "selected" : ""}>${r}</option>`).join("")}</select></label>
        <label class="field"><span>${u._nuevo ? "PIN inicial (4 números)" : "Nuevo PIN (dejalo vacío para no cambiarlo)"}</span><input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" data-fu="pin" value="${esc(u.pin || "")}" autocomplete="new-password"><span class="hint">Se le va a pedir que lo cambie la primera vez que entre.</span></label>
        <button class="switch" data-act="uToggle" data-k="resp" role="switch" aria-checked="${!!u.resp}"><span class="grow"><b>Responsable habitual de la medicación</b><span>Aparece cada día como quien da la medicación.</span></span><span class="sw"></span></button>
        <button class="switch" data-act="uToggle" data-k="admin" role="switch" aria-checked="${!!u.admin}"><span class="grow"><b>Administra la app</b><span>Puede sumar al equipo y cambiar los ajustes.</span></span><span class="sw"></span></button>
        ${!u._nuevo ? `<button class="switch" data-act="uToggle" data-k="activo" role="switch" aria-checked="${u.activo !== false}"><span class="grow"><b>Puede ingresar</b><span>Si lo apagás, deja de aparecer al ingresar. Sus registros se guardan.</span></span><span class="sw"></span></button>` : ""}
        ${ui.uErr ? `<p class="err">${esc(ui.uErr)}</p>` : ""}`;
      acts = `<button class="btn line" data-act="closeSheet">Cancelar</button><button class="btn" data-act="guardarMiembro">Guardar</button>`;
      break;
    }
    case "pin":
      title = S.user.cambiarPin ? "Elegí tu PIN" : "Cambiar mi PIN"; sub = S.user.cambiarPin ? "Es la primera vez que entrás: elegí un PIN que solo sepas vos." : "";
      body = `${S.user.cambiarPin ? "" : `<label class="field"><span>PIN actual</span><input type="password" inputmode="numeric" maxlength="4" data-f="actual" value="${esc(f.actual || "")}"></label>`}
        <div class="row" style="gap:10px"><label class="field grow"><span>PIN nuevo</span><input type="password" inputmode="numeric" maxlength="4" data-f="nuevo" value="${esc(f.nuevo || "")}"></label><label class="field grow"><span>Repetilo</span><input type="password" inputmode="numeric" maxlength="4" data-f="nuevo2" value="${esc(f.nuevo2 || "")}"></label></div>
        ${ui.pinErr ? `<p class="err">${esc(ui.pinErr)}</p>` : ""}`;
      acts = `${S.user.cambiarPin ? "" : `<button class="btn line" data-act="closeSheet">Cancelar</button>`}<button class="btn" data-act="guardarPin">Guardar PIN</button>`;
      break;
    case "install": {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
      title = "Instalar Ronda"; sub = "Queda como una app más: con su ícono, a pantalla completa y funcionando sin internet.";
      body = standalone ? `<div class="done-msg"><span class="ic">${ic("check")}</span><div><b>Ya está instalada</b><span>Estás usando la app instalada.</span></div></div>`
        : deferredInstall ? `<button class="btn block" data-act="instalar">${ic("install")} Instalar ahora</button>`
        : `<div class="stack">
          <div class="aviso">${ic("install")}<div><b>${ios ? "En iPhone o iPad (Safari)" : "En Android (Chrome)"}</b><p>${ios ? "Tocá el botón Compartir y elegí “Agregar a inicio”." : "Tocá el menú ⋮ y elegí “Instalar app” o “Agregar a la pantalla principal”."}</p></div></div>
          <div class="aviso">${ic("install")}<div><b>En la PC (Chrome o Edge)</b><p>Hacé clic en el ícono de instalar, a la derecha de la barra de direcciones.</p></div></div>
          <p class="faint small">Si no aparece la opción, abrí la app desde su dirección propia (no desde una vista previa).</p></div>`;
      break;
    }
    case "probar":
      title = "Probar la alarma"; sub = "Así suena cuando llega una ronda y cuando quedan tomas atrasadas.";
      body = `<div class="opts"><button class="opt" data-act="probarAlarma" data-k="ronda"><span class="oi sol">${ic("bell")}</span><span class="grow">Llegó la ronda<small>Campana suave, suena 4 veces</small></span></button><button class="opt" data-act="probarAlarma" data-k="atraso"><span class="oi bad">${ic("alert")}</span><span class="grow">Quedan tomas atrasadas<small>Más insistente, hasta que alguien la mire</small></span></button></div>`;
      break;
    case "baja": {
      const n = primerNombre(f.nombre || "esta persona");
      title = `¿Dar de baja a ${n}?`; sub = "Deja de aparecer en las rondas y no suenan alarmas por su medicación. Su historial queda guardado y la podés volver a dar de alta cuando quieras.";
      acts = `<button class="btn line" data-act="closeSheet">Cancelar</button><button class="btn danger" data-act="darBaja">${ic("ausente", "s")} Dar de baja</button>`;
      break;
    }
    case "nube": {
      title = "Usar en varios celulares";
      if (!Nube.activa) {
        sub = "Así todo el equipo ve las mismas personas, medicación y registros, y la alarma puede sonar con la app cerrada.";
        body = `<div class="stack">
          <div class="row top"><span class="ic-c">${ic("phone")}</span><div><b>Se sube lo que hay en este celular</b><div class="muted small">Después compartís un link y cada celular del equipo se une con él.</div></div></div>
          <div class="row top"><span class="ic-c">${ic("shield")}</span><div><b>Solo entra quien tiene el link</b><div class="muted small">Pasalo solo al equipo del centro. Cada persona igual entra con su PIN.</div></div></div>
        </div>${ui.nubeErr ? `<p class="err">${esc(ui.nubeErr)}</p>` : ""}`;
        acts = esAdmin() ? `<button class="btn line" data-act="closeSheet">Ahora no</button><button class="btn" data-act="nubeActivar" ${ui.nubeOcupada ? "disabled" : ""}>${ui.nubeOcupada ? "Activando…" : "Activar"}</button>` : `<p class="muted small">Lo activa quien administra la app.</p>`;
      } else {
        sub = "Para sumar otro celular, mandale este link y que lo abra. Después entra con su PIN.";
        body = `<div class="linkbox"><input type="text" readonly value="${esc(Nube.link())}" id="nubeLink" aria-label="Link para sumar celulares"></div>
          <div class="row" style="gap:8px;margin-top:10px"><button class="btn sec grow" data-act="nubeCompartir">${ic("phone", "s")} Compartir link</button><button class="btn line grow" data-act="nubeCopiar">Copiar</button></div>
          <p class="faint small" style="margin-top:12px">En iPhone: si ya tiene la app instalada, que la abra, toque <b>Ya usamos Ronda en otro celular</b> y pegue el link.</p>`;
        acts = `<button class="btn line" data-act="nubeSalir">Desconectar este celular</button><button class="btn" data-act="closeSheet">Listo</button>`;
      }
      break;
    }
    case "unir": {
      title = "Unirme al equipo"; sub = "Pegá el link que te pasaron desde otro celular que ya usa Ronda.";
      body = `<label class="field"><span>Link o código</span><input type="text" data-f="unir" value="${esc(f.unir || "")}" placeholder="https://…#centro=…" autocapitalize="off" autocomplete="off"></label>
        ${S.staff.length ? `<div class="aviso warn">${ic("alert")}<div>Este celular ya tiene datos. Se reemplazan por los del equipo.</div></div>` : ""}
        ${ui.nubeErr ? `<p class="err">${esc(ui.nubeErr)}</p>` : ""}`;
      acts = `<button class="btn line" data-act="closeSheet">Cancelar</button><button class="btn" data-act="unirOk" ${ui.nubeOcupada || !leerClave(f.unir) ? "disabled" : ""}>${ui.nubeOcupada ? "Uniendo…" : "Unirme"}</button>`;
      break;
    }
    case "avisos": {
      title = "Alarma con la app cerrada";
      const perm = typeof Notification !== "undefined" ? Notification.permission : "na";
      const on = lsGet("ronda-avisos") && perm === "granted";
      if (!Nube.pushPosible || (esIOS() && !instalada())) {
        sub = "Primero instalá la app en este celular.";
        body = `<div class="aviso">${ic("install")}<div><b>${esIOS() ? "En iPhone" : "En este celular"}</b><p>${esIOS() ? "Abrí el link en Safari, tocá Compartir y elegí “Agregar a inicio”. Después abrí Ronda desde ese ícono y volvé acá." : "Este navegador no permite avisos con la app cerrada. Probá con Chrome."}</p></div></div>`;
      } else if (!Nube.activa) {
        sub = "La alarma con la app cerrada la manda el servidor del equipo.";
        body = `<div class="aviso info">${ic("info")}<div>Primero hay que activar <b>Usar en varios celulares</b>.</div></div>`;
        acts = `<button class="btn line" data-act="closeSheet">Cerrar</button><button class="btn" data-act="sheet" data-s="nube">Activar varios celulares</button>`;
      } else if (perm === "denied") {
        sub = "Los avisos están bloqueados para Ronda.";
        body = `<div class="aviso warn">${ic("alert")}<div>${esIOS() ? "Andá a Ajustes del iPhone → Notificaciones → Ronda y activá “Permitir notificaciones”." : "Activalos desde la configuración del navegador, en Notificaciones."}</div></div>`;
      } else if (!on) {
        sub = "A la hora de cada ronda te llega un aviso, aunque no tengas la app abierta.";
        body = `<div class="stack">
          <div class="row top"><span class="ic-c">${ic("bell")}</span><div><b>Suena como una notificación</b><div class="muted small">Con el sonido de notificaciones del celular. No suena si está en silencio o en No molestar.</div></div></div>
          <div class="row top"><span class="ic-c">${ic("alert")}</span><div><b>Y otro aviso si quedan tomas sin dar</b><div class="muted small">A los ${S.cfg.margen} minutos de cada ronda.</div></div></div>
        </div>${ui.nubeErr ? `<p class="err">${esc(ui.nubeErr)}</p>` : ""}`;
        acts = `<button class="btn line" data-act="avisosNo">Ahora no</button><button class="btn" data-act="avisosActivar" ${ui.nubeOcupada ? "disabled" : ""}>${ic("bell", "s")} ${ui.nubeOcupada ? "Activando…" : "Activar"}</button>`;
      } else {
        sub = "Está activada en este celular.";
        body = `${ui.pruebaEnviada ? `<div class="done-msg"><span class="ic">${ic("check")}</span><div><b>Cerrá la app ahora</b><span>En unos 15 segundos te llega el aviso de prueba.</span></div></div>` : `<p class="muted">Probala: tocá el botón, cerrá la app y esperá unos segundos.</p>`}`;
        acts = `<button class="btn line" data-act="avisosDesactivar">Desactivar</button><button class="btn" data-act="avisosProbar">${ic("bell", "s")} Probar</button>`;
      }
      break;
    }
    case "borrar":
      title = "¿Borrar todos los datos?"; sub = "Se borran personas, medicación, equipo e historial de este dispositivo. No se puede deshacer.";
      body = `<p class="muted small">Si querés conservarlos, primero hacé una copia de seguridad.</p><label class="field"><span>Escribí BORRAR para confirmar</span><input type="text" data-f="conf" value="${esc(f.conf || "")}" autocapitalize="characters"></label>`;
      acts = `<button class="btn line" data-act="closeSheet">Cancelar</button><button class="btn danger" data-act="borrarTodo" ${String(f.conf || "").trim().toUpperCase() === "BORRAR" ? "" : "disabled"}>${ic("trash", "s")} Borrar todo</button>`;
      break;
    case "export":
      title = "Copiar los datos"; sub = "En esta vista previa no se pueden descargar archivos. Copiá el contenido y pegalo en un archivo. En la app instalada se descarga directo.";
      body = `<textarea id="expText" readonly rows="8" style="font-size:13px;font-family:ui-monospace,monospace">${esc(f.exp.contenido)}</textarea><p class="faint xs">${esc(f.exp.nombre)}</p>`;
      acts = `<button class="btn line" data-act="closeSheet">Cerrar</button><button class="btn" data-act="copiarExport">Copiar</button>`;
      break;
    case "restore":
      title = "¿Restaurar esta copia?"; sub = `Copia del ${esc(f.restore?.fecha ? tsTexto(f.restore.fecha) : "—")}: ${plural(f.restore?.data?.personas?.length || 0, "persona")}, ${plural(f.restore?.data?.registros?.length || 0, "registro")}.`;
      body = `<div class="aviso warn">${ic("alert")}<div>Reemplaza todos los datos que hay ahora en este dispositivo.</div></div>`;
      acts = `<button class="btn line" data-act="closeSheet">Cancelar</button><button class="btn" data-act="restoreOk">Restaurar</button>`;
      break;
  }
  return `<div class="scrim" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grab"></div>
    <div class="sh"><div class="grow"><h2 class="h2">${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div>${S.user?.cambiarPin && sh.s === "pin" ? "" : `<button class="iconbtn" data-act="closeSheet" aria-label="Cerrar">${ic("x")}</button>`}</div>
    ${body}${acts ? `<div class="acts">${acts}</div>` : ""}</div></div>`;
}

/* ---------- Alarma a pantalla completa ---------- */
function vAlarm() {
  const a = Alarm.activa; if (!a) return "";
  const R = responsableHoy();
  const ronda = a.kind === "ronda";
  return `<div class="alarm ${ronda ? "" : "atraso"}" role="alertdialog" aria-modal="true" aria-label="${ronda ? "Llegó la ronda" : "Tomas atrasadas"}">
    <div class="bell">${ic(ronda ? "bell" : "alert")}</div>
    <div class="k">${a.prueba ? "Prueba de alarma" : ronda ? "Ronda de medicación" : "Quedan tomas sin dar"}</div>
    <h2 class="num">${ronda ? `Son las ${esc(a.hora)}` : `Ronda de las ${esc(a.hora)}`}</h2>
    <p>${ronda ? `${plural(a.personas, "persona")} · ${plural(a.total, "toma")}` : `${plural(a.total, "toma atrasada", "tomas atrasadas")}`}</p>
    <p class="who">${esc(a.nombres.join(", "))}</p>
    ${R.tipo === "persona" ? `<p style="opacity:.85">Le toca a ${esc(R.u.nombre)}</p>` : R.tipo === "compartida" ? `<p style="opacity:.85">Hoy es responsabilidad de todos</p>` : ""}
    <div class="acts"><button class="btn ink" data-act="alarmVer">${ic("check")} Ver la ronda</button><button class="btn line" data-act="alarmSilenciar">Silenciar</button></div>
  </div>`;
}

function vToast() {
  if (!ui.toast) return "";
  return `<div class="toast ${ui.toast.kind || ""}" role="status" aria-live="polite"><div class="grow">${esc(ui.toast.msg)}</div>${ui.toast.undo ? `<button class="btn sm" data-act="undo">${ic("undo", "s")} Deshacer</button>` : ""}</div>`;
}
