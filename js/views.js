/* Ronda · Gervital — pantallas */
"use strict";

const TABS = [
  { id: "hoy", t: "Hoy", i: "hoy" },
  { id: "semana", t: "Semana", i: "semana" },
  { id: "personas", t: "Personas", i: "personas" },
  { id: "historial", t: "Historial", i: "historial" },
  { id: "mas", t: "Más", i: "menu" },
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
      <button class="btn block" style="margin-top:24px" data-act="setupNext">Empezar</button>`;
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
      <nav aria-label="Secciones">${TABS.map((t) => `${tabBtn(t, "nav")}${ic(t.i)}${t.id === "mas" ? "Más opciones" : t.t}${t.id === "hoy" && pend ? `<span class="badge">${pend}</span>` : ""}</button>`).join("")}</nav>
      <div class="grow"></div>
      <div class="reloj js-reloj ${demo ? "demo" : ""}" title="${demo ? "Hora de demostración" : "Hora actual"}"><span class="dot"></span><span class="js-hora">${nowHM()}</span></div>
      <div class="yo">${avatar(S.user)}<div><b>${esc(S.user.nombre)}</b><span>${esc(S.user.rol || "")}</span></div><button data-act="logout" title="Cerrar sesión" aria-label="Cerrar sesión">${ic("logout")}</button></div>
    </aside>
    <div class="wrap">
      <header class="topbar">
        ${marca("Gervital")}
        <div class="sp"></div>
        <div class="reloj js-reloj ${demo ? "demo" : ""}"><span class="dot"></span><span class="js-hora">${nowHM()}</span></div>
        <button class="me" data-act="tab" data-tab="mas" aria-label="Mi cuenta">${avatar(S.user, "sm")}</button>
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
function vHoy() {
  const iso = today();
  if (!S.personas.some((p) => p.activo !== false)) return vSinPersonas();
  const rondas = rondasDe(iso);
  const min = nowMin();
  const cur = rondaActual(rondas);
  const next = rondas.find((r) => mins(r.hora) > min + 15);
  const foco = cur || rondas[0];
  const hero = vHero(iso, rondas, cur, foco, min);

  if (!rondas.length) {
    const vienen = S.personas.filter((p) => asisteEl(p, iso));
    return `<div class="hoy-grid"><div>${hero}
      <div class="empty"><div>${MARK}</div><h3>${vienen.length ? "Hoy no hay medicación para dar" : "Hoy no viene nadie con medicación"}</h3><p>${vienen.length ? "Las personas que vienen hoy no tienen tomas en el centro, o avisaron que no vienen." : "Revisá los días de asistencia en Personas o mirá la Semana."}</p></div>
      </div><div class="hoy-aside">${vAusencias(iso)}</div></div>`;
  }

  const todas = rondas.flatMap((r) => r.items);
  const prev = todas.filter((t) => foco && t.hora < foco.hora && ["pendiente", "pospuesta", "atrasada"].includes(estado(t)));
  const sinreg = todas.filter((t) => estado(t) === "sinreg");
  const enFoco = foco ? foco.items : [];
  const porPersona = agrupar(enFoco);
  const abiertas = porPersona.filter((g) => g.tomas.some((t) => abierta(estado(t))));
  const listas = porPersona.filter((g) => !g.tomas.some((t) => abierta(estado(t))));

  let main = "";
  if (!kvGet("tipHoy")) main += `<div class="tip"><div class="row top"><span class="ic-c">${ic("info")}</span><div class="grow"><b>Cómo se usa</b>
    <ol><li>Cuando suena la alarma, abrí <b>Hoy</b>: están las personas de esa ronda.</li><li>Tocá <b>Se la di</b> en cada medicamento que diste.</li><li>Si no se la diste o la vas a dar más tarde, tocá <b>···</b> al lado.</li><li>Si alguien no vino, marcalo abajo en <b>¿Falta alguien hoy?</b></li></ol>
    </div></div><button class="btn sec sm" data-act="tipOk">Entendido</button></div>`;
  if (prev.length) {
    main += `<div class="section"><h2 class="h3">Quedaron de rondas anteriores</h2><span class="tag sol">${prev.length}</span></div>
      <div class="aviso warn" style="margin-bottom:12px">${ic("alert")}<div><b>Registralas con la hora real en que se dieron</b><p>O marcá que no se dieron. Pasadas ${durTxt(S.cfg.limite)} quedan como “sin registrar”.</p></div></div>
      ${agrupar(prev).map((g) => vPCard(g, { prev: true })).join("")}`;
  }
  if (foco) {
    const empieza = mins(foco.hora) - min;
    main += `<div class="section"><h2 class="h3">${cur ? (empieza > 0 ? `Para dar a las ${foco.hora}` : "Para dar ahora") : `Primera ronda, a las ${foco.hora}`}</h2><div class="sp"></div><span class="faint small">${plural(foco.personas, "persona")}</span></div>`;
    if (!cur) main += `<div class="aviso info" style="margin-bottom:12px">${ic("clock")}<div>Todavía no es la hora. La alarma va a sonar a las ${foco.hora}.</div></div>`;
    if (abiertas.length) main += abiertas.map((g) => vPCard(g)).join("");
    else main += `<div class="done-msg"><span class="ic">${ic("check")}</span><div><b>Ronda de las ${foco.hora} completa</b><span>${next ? `La próxima es a las ${next.hora}: ${plural(next.personas, "persona")}.` : "No quedan más rondas hoy."}</span></div></div>`;
    if (listas.length) {
      main += `<div class="section"><h2 class="h3">Ya registradas</h2><span class="tag">${listas.length}</span></div>
        <div class="hechas">${listas.map((g) => {
          const est = g.tomas.map((t) => estado(t));
          const mix = est.some((e) => e === "nodada");
          return `<button class="hecha" data-act="ficha" data-pid="${g.p.id}"><span class="ok ${mix ? "mix" : ""}">${ic(mix ? "nodio" : "check")}</span>${avatar(g.p, "sm")}<span class="grow"><b>${esc(g.p.nombre)}</b><span class="faint small">${g.tomas.map((t) => esc(t.m.nombre)).join(", ")}</span></span><span class="faint xs num">${esc(g.tomas[0].r?.horaReal || "")}</span></button>`;
        }).join("")}</div>`;
    }
  }
  if (sinreg.length) {
    main += `<div class="section"><h2 class="h3">Quedaron sin registrar hoy</h2><span class="tag bad">${sinreg.length}</span><div class="sp"></div><button class="link small" data-act="verSinreg">${ui.verSinreg ? "Ocultar" : "Ver y completar"}</button></div>`;
    if (ui.verSinreg) main += agrupar(sinreg).map((g) => vPCard(g, { prev: true })).join("");
  }

  const prox = rondas.filter((r) => !foco || r.hora > foco.hora);
  const aside = `
    ${prox.length ? `<div class="section"><h2 class="h3">Más tarde hoy</h2></div>
    <div class="prox">${prox.map((r) => `<div class="it"><span class="h">${r.hora}</span><div class="grow"><b>${plural(r.personas, "persona")}</b><div class="faint small ellipsis">${[...new Set(r.items.map((t) => primerNombre(t.p.nombre)))].join(", ")}</div></div></div>`).join("")}</div>` : ""}
    ${vAusencias(iso)}`;
  return `<div class="hoy-grid"><div>${hero}${main}</div><div class="hoy-aside">${aside}</div></div>`;
}

function vHero(iso, rondas, cur, foco, min) {
  let h1, sub, prog = "";
  if (!rondas.length) { h1 = "Sin rondas hoy"; sub = "No hay tomas programadas para hoy."; }
  else if (!cur) { h1 = `Primera ronda a las <span class="num">${foco.hora}</span>`; sub = `Faltan ${durTxt(mins(foco.hora) - min)}`; }
  else {
    const d = mins(cur.hora) - min;
    h1 = `Ronda de las <span class="num">${cur.hora}</span>`;
    sub = cur.abiertas === 0 ? "Completa" : d > 0 ? `Empieza en ${durTxt(d)}` : d === 0 ? "Empieza ahora" : `Empezó hace ${durTxt(-d)}`;
  }
  if (foco) {
    const pct = foco.total ? Math.round((foco.hechas / foco.total) * 100) : 0;
    prog = `<div class="prog"><div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Tomas registradas"><i style="width:${pct}%"></i></div><div class="cuenta num"><b>${foco.hechas}</b> de ${foco.total} tomas</div></div>`;
  }
  const idx = foco ? rondas.indexOf(cur || foco) : -1;
  const nodos = rondas.length > 1 ? `<div class="dia" aria-label="Rondas del día">
      <span class="fill" style="width:calc((100% - 32px) * ${cur && rondas.length > 1 ? idx / (rondas.length - 1) : 0})"></span>
      ${rondas.map((r) => {
        const pasada = mins(r.hora) < min && r !== cur;
        const cls = r === cur ? "cur" : r.sinreg || (pasada && r.abiertas) ? "falta" : r.hechas === r.total ? "ok" : "";
        const icon = cls === "ok" ? ic("check") : cls === "falta" ? ic("alert") : "";
        return `<div class="nodo ${cls}" title="Ronda de las ${r.hora}: ${r.hechas} de ${r.total} registradas"><span class="c">${icon}</span><span class="num">${r.hora}</span></div>`;
      }).join("")}</div>` : "";
  const R = responsableHoy();
  const resp = `<div class="resp">${R.tipo === "persona" ? avatar(R.u) : `<span class="av" style="--c:rgba(255,255,255,.18)">${ic("equipo", "s")}</span>`}
    <div class="t">${R.tipo === "persona" ? `Responsable de hoy<b>${esc(R.u.nombre)}</b>` : R.tipo === "compartida" ? `Responsable de hoy<b>Entre todos</b>` : `Responsable de hoy<b>Sin definir</b>`}</div>
    <button class="btn xs" data-act="sheet" data-s="resp">Cambiar</button></div>`;
  return `<section class="hero"><div class="fecha">${esc(fechaLarga(iso))}</div><h1>${h1}</h1><div class="sub">${sub}</div>${prog}${nodos}${resp}</section>`;
}

function agrupar(tomas) {
  const m = new Map();
  for (const t of tomas) { if (!m.has(t.p.id)) m.set(t.p.id, { p: t.p, tomas: [] }); m.get(t.p.id).tomas.push(t); }
  return [...m.values()];
}

function vPCard(g, { prev = false } = {}) {
  const p = g.p;
  const abiertas = g.tomas.filter((t) => abierta(estado(t)));
  const horas = [...new Set(g.tomas.map((t) => t.hora))];
  const meta = prev ? `Era${horas.length > 1 ? "n" : ""} de las ${horas.join(" y ")}` : plural(g.tomas.length, "toma");
  const notaCorta = p.notas ? (p.notas.length > 110 ? p.notas.slice(0, 108) + "…" : p.notas) : "";
  return `<article class="pc ${prev ? "prev" : ""}">
    <div class="hd">
      <button class="who" data-act="ficha" data-pid="${p.id}" aria-label="Ver ficha de ${esc(p.nombre)}">${avatar(p)}<span class="grow"><span class="nm">${esc(p.nombre)}</span><span class="meta">${meta}</span></span></button>
      <button class="iconbtn" data-act="sheet" data-s="pmenu" data-pid="${p.id}" aria-label="Más opciones para ${esc(p.nombre)}">${ic("mas")}</button>
    </div>
    ${p.alergias ? `<div class="nota alergia">${ic("alert", "s")}<span>Alergia: ${esc(p.alergias)}</span></div>` : ""}
    ${notaCorta ? `<div class="nota">${ic("note", "s")}<span>${esc(notaCorta)}</span></div>` : ""}
    ${g.tomas.map((t) => vMedRow(t, prev)).join("")}
    ${abiertas.length > 1 ? `<div class="ft"><button class="btn sec sm grow" data-act="darTodas" data-ids="${abiertas.map((t) => t.id).join(",")}" ${prev ? 'data-prev="1"' : ""}>${ic("check")} Le di las ${abiertas.length}</button></div>` : ""}
  </article>`;
}

function vMedRow(t, prev) {
  const e = estado(t);
  const open = abierta(e) || e === "sinreg";
  let mi = esc(t.m.indicacion || "");
  if (prev || e === "sinreg") mi = `<span class="tag ${e === "sinreg" ? "bad" : "sol"}">${e === "sinreg" ? "Sin registrar" : `Atrasada ${durTxt(minutosTarde(t))}`}</span>${t.m.indicacion ? ` ${esc(t.m.indicacion)}` : ""}`;
  else if (e === "atrasada") mi = `<span class="tag sol">Atrasada ${durTxt(minutosTarde(t))}</span> ${esc(t.m.indicacion || "")}`;
  else if (e === "pospuesta") mi = `<span class="tag sol">Para las ${esc(t.r.posp)}</span> ${esc(t.m.indicacion || "")}`;
  const right = open
    ? `<div class="acts"><button class="btn dar" data-act="dar" data-id="${t.id}" ${prev || e === "sinreg" ? 'data-prev="1"' : ""}>${ic("check")} Se la di</button><button class="otra" data-act="sheet" data-s="otra" data-id="${t.id}" aria-label="Otras opciones">${ic("mas")}</button></div>`
    : `<button class="reg" data-act="sheet" data-s="editreg" data-id="${t.id}" aria-label="Ver o corregir registro"><span class="st ${e}">${ESTADO_TXT[e]}</span><br>${t.r?.horaReal ? `<span class="num">${esc(t.r.horaReal)}</span> · ` : ""}${esc(primerNombre(staffNombre(t.r?.por)))}</button>`;
  return `<div class="med ${e === "dada" ? "done" : e === "nodada" ? "no" : ""}"><span class="pill">${ic(e === "dada" ? "check" : e === "nodada" ? "nodio" : "pill")}</span><div class="grow"><div class="mn">${medTxt(t.m)}</div>${mi ? `<div class="mi">${mi}</div>` : ""}${e === "nodada" && t.r?.motivo ? `<div class="mi">${esc(t.r.motivo)}</div>` : ""}</div>${right}</div>`;
}

function vAusencias(iso) {
  const vienen = S.personas.filter((p) => asisteEl(p, iso) && medsDe(p.id).length);
  if (!vienen.length) return "";
  return `<div class="section"><h2 class="h3">¿Falta alguien hoy?</h2></div>
    <p class="faint small" style="margin:-4px 0 10px">Tocá a quien no vino: sus tomas no van a sonar ni quedar pendientes.</p>
    <div class="chips">${vienen.map((p) => { const on = ausente(iso, p.id); return `<button class="chip ${on ? "on" : ""}" data-act="ausencia" data-pid="${p.id}" aria-pressed="${on}" aria-label="${esc(p.nombre)}: ${on ? "no vino" : "vino"}">${avatar(p)}${esc(primerNombre(p.nombre))}</button>`; }).join("")}</div>`;
}

function vSinPersonas() {
  return `<section class="hero"><div class="fecha">${esc(fechaLarga(today()))}</div><h1>Empecemos</h1><div class="sub">Cargá a las personas que toman medicación en el centro. Las rondas y alarmas se arman solas con sus horarios.</div></section>
    <div class="opts" style="margin-top:18px">
      <button class="opt" data-act="nuevaPersona"><span class="oi">${ic("plus")}</span><span class="grow">Agregar una persona<small>Nombre, días que viene y su medicación.</small></span>${ic("chevR")}</button>
      <button class="opt" data-act="sub" data-sub="importar"><span class="oi">${ic("sheet")}</span><span class="grow">Importar la planilla<small>Si ya tienen la lista en Excel o Google Sheets.</small></span>${ic("chevR")}</button>
    </div>`;
}

/* ---------- SEMANA ---------- */
function vSemana() {
  const iso0 = today();
  const wd = weekday(iso0);
  const lunes = addDays(iso0, wd === 0 ? 1 : 1 - wd);
  const usaSab = S.personas.some((p) => p.activo !== false && (p.dias || []).includes(6));
  const dias = DIAS.filter((d) => d.n <= (usaSab ? 6 : 5)).map((d) => ({ ...d, iso: addDays(lunes, d.n - 1) }));
  const sel = ui.semDia && dias.some((d) => d.iso === ui.semDia) ? ui.semDia : (dias.find((d) => d.iso === iso0) || dias[0]).iso;
  const ts = tomasDe(sel, { incluirAusentes: true });
  const personas = new Set(ts.map((t) => t.p.id));
  const horas = [...new Set(ts.map((t) => t.hora))].sort();
  const noVienen = S.personas.filter((p) => p.activo !== false && !(p.dias || []).includes(weekday(sel)) && medsDe(p.id).length);
  return `
    <div class="pagehead"><div><h1 class="h1">Semana</h1><p>Quién toma medicación cada día y a qué hora.</p></div></div>
    <div class="semdias" style="--n:${dias.length}">${dias.map((d) => {
      const n = new Set(tomasDe(d.iso).map((t) => t.p.id)).size;
      return `<button class="semdia ${d.iso === iso0 ? "hoy" : ""}" data-act="semDia" data-iso="${d.iso}" aria-pressed="${d.iso === sel}"><b>${d.k}</b><span>${n ? plural(n, "pers.", "pers.") : "—"}</span></button>`;
    }).join("")}</div>
    <div class="row" style="margin-bottom:14px"><div class="grow"><h2 class="h2">${esc(fechaRel(sel) === "Hoy" ? "Hoy, " + fechaLarga(sel).toLowerCase() : fechaLarga(sel))}</h2><div class="muted small">${plural(personas.size, "persona")} · ${plural(ts.length, "toma")} · ${plural(horas.length, "ronda")}</div></div></div>
    ${horas.length ? horas.map((h) => {
      const items = ts.filter((t) => t.hora === h);
      return `<div class="franja"><div class="h">${h}<small>${plural(new Set(items.map((t) => t.p.id)).size, "pers.", "pers.")}</small></div><div class="list">${agrupar(items).map((g) => `
        <button class="semp" data-act="ficha" data-pid="${g.p.id}">${avatar(g.p, "sm")}<span class="grow"><b>${esc(g.p.nombre)}</b>${g.tomas[0].aus ? ' <span class="st ausente">No viene</span>' : ""}<div class="ms">${g.tomas.map((t) => `${esc(t.m.nombre)} ${esc(t.m.dosis || "")}`).join(" · ")}</div></span>${ic("chevR", "s")}</button>`).join("")}</div></div>`;
    }).join("") : `<div class="empty"><div>${MARK}</div><h3>No hay tomas este día</h3><p>Nadie con medicación viene el ${esc(DIA_NOMBRE[weekday(sel)].toLowerCase())}.</p></div>`}
    ${noVienen.length ? `<p class="faint small" style="margin-top:20px">No vienen este día: ${noVienen.map((p) => esc(primerNombre(p.nombre))).join(", ")}.</p>` : ""}
    <div class="aviso info" style="margin-top:20px">${ic("info")}<div><b>Las rondas se arman solas</b><p>Salen de los horarios cargados en cada persona. Si cambiás un horario, cambia la ronda.</p></div></div>`;
}

/* ---------- PERSONAS ---------- */
function vPersonas() {
  const F = ui.pf;
  const q = sinTildes(F.q || "");
  const act = S.personas.filter((p) => p.activo !== false), ina = S.personas.filter((p) => p.activo === false);
  const lista = (F.act ? act : ina).filter((p) => !q || sinTildes(p.nombre).includes(q));
  return `
    <div class="pagehead"><div><h1 class="h1">Personas</h1><p>Quiénes toman medicación en el centro.</p></div><div class="sp"></div><button class="btn" data-act="nuevaPersona">${ic("plus")} Nueva persona</button></div>
    <div class="search">${ic("search")}<input type="search" placeholder="Buscar por nombre" data-pf="q" value="${esc(F.q || "")}" aria-label="Buscar persona"></div>
    <div class="seg" role="group" aria-label="Filtrar" style="margin-bottom:14px"><button data-act="pfAct" data-v="1" aria-pressed="${F.act}">Vienen al centro (${act.length})</button><button data-act="pfAct" data-v="0" aria-pressed="${!F.act}">Dadas de baja (${ina.length})</button></div>
    ${lista.length ? `<div class="list">${lista.map((p) => {
      const ms = medsDe(p.id);
      const hs = [...new Set(ms.flatMap((m) => m.horas))].sort();
      return `<button class="li" data-act="ficha" data-pid="${p.id}">${avatar(p)}<span class="grow"><span class="t">${esc(p.nombre)}</span><span class="d" style="display:block">${ms.length ? `${plural(ms.length, "medicamento")} · ${hs.join(", ")}` : "Sin medicación cargada"}</span><span class="dias-mini" aria-label="${esc(diasTexto(p.dias))}">${DIAS.slice(0, (p.dias || []).includes(6) ? 6 : 5).map((d) => `<i class="${(p.dias || []).includes(d.n) ? "on" : ""}">${d.c}</i>`).join("")}</span></span>${ic("chevR", "s chev")}</button>`;
    }).join("")}</div>` : `<div class="empty"><div>${MARK}</div><h3>${q ? "No encontramos a nadie con ese nombre" : F.act ? "Todavía no hay personas" : "No hay personas dadas de baja"}</h3>${F.act && !q ? `<p>Agregá a la primera o importá la planilla.</p><button class="btn sec" data-act="sub" data-sub="importar">${ic("sheet")} Importar planilla</button>` : ""}</div>`}`;
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
      <select data-hf="estado" aria-label="Estado"><option value="">Todos los estados</option>${[["dada", "Dadas"], ["nodada", "No se dieron"], ["sinreg", "Sin registrar"], ["ausencia", "No vino"]].map(([v, t]) => `<option value="${v}" ${H.estado === v ? "selected" : ""}>${t}</option>`).join("")}</select>
    </div>
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
    <div class="pagehead"><div><h1 class="h1">Más opciones</h1></div></div>
    <div class="card pad row" style="margin-bottom:22px">${avatar(u, "lg")}<div class="grow"><div class="h3">${esc(u.nombre)}</div><div class="muted small">${esc(u.rol || "")}${u.admin ? " · Administra la app" : ""}</div></div><button class="btn line sm" data-act="logout">${ic("logout", "s")} Salir</button></div>
    ${u.admin ? `<div class="grupo"><span class="eyebrow">Centro</span><div class="list">
      ${li("sub", "equipo", "Equipo", `${plural(S.staff.filter((x) => x.activo !== false).length, "persona activa", "personas activas")} · quién puede ingresar`, 'data-sub="equipo"')}
      ${li("sub", "ajustes", "Alarmas y tiempos", `Atrasada a los ${S.cfg.margen} min · sin registrar a las ${durTxt(S.cfg.limite)}`, 'data-sub="ajustes"')}
    </div></div>` : `<div class="grupo"><span class="eyebrow">Alarmas</span><div class="list">${li("sub", "sound", "Sonido y avisos", S.cfg.sonido ? "Sonido activado" : "Sonido apagado", 'data-sub="ajustes"')}</div></div>`}
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
    <p class="faint xs" style="text-align:center;margin-top:24px">Ronda 1.0 · Gervital Centro Diurno Gerontológico<br>${DB.enMemoria ? "Atención: este navegador no permite guardar datos. Se pierden al cerrar." : "Los datos se guardan en este dispositivo."}</p>`;
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
    <div class="aviso info" style="margin-top:10px">${ic("info")}<div>Las alarmas suenan mientras la app esté abierta. Lo ideal es dejarla abierta en la PC o tablet del centro.</div></div>
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
