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

/* ---------- Entrada ---------- */
/* Siempre es Gervital. Cada persona entra con el usuario y la contraseña que le dio quien administra.
   Solo la primerísima vez (cuando todavía no hay ninguna cuenta) se crea la de administración. */
function vGate(body) {
  return `<div class="gate2"><div class="g-top"><img src="${LOGO_BLANCO}" alt="Gervital"><div class="g-app">${MARK}<b>ronda</b></div></div><div class="g-card">${body}</div></div>`;
}
function vSetup() {
  const f = ui.form || {};
  return vGate(`
    <h1>Crear la cuenta de administración</h1>
    <p class="g-sub">Se hace una sola vez.</p>
    <label class="fld"><input type="text" data-f="nombre" value="${esc(f.nombre || "")}" autocomplete="name" placeholder=" "><span>Tu nombre</span></label>
    <label class="fld"><input type="text" data-f="usuario" value="${esc(f.usuario || "")}" autocapitalize="off" autocomplete="username" spellcheck="false" placeholder=" "><span>Usuario</span></label>
    <label class="fld"><input type="${ui.ver ? "text" : "password"}" data-f="pass" value="${esc(f.pass || "")}" autocomplete="new-password" placeholder=" "><span>Contraseña</span><button type="button" class="ojo" data-act="verPass" aria-label="Mostrar contraseña">${ic("eye", "s")}</button></label>
    ${ui.loginErr ? `<p class="err">${esc(ui.loginErr)}</p>` : ""}
    <button class="btn block big" data-act="crearAdmin" ${ui.ocupado ? "disabled" : ""}>${ui.ocupado ? "Creando…" : "Crear y entrar"}</button>`);
}
function vLogin() {
  const f = ui.form || {};
  return vGate(`
    <h1>Hola</h1>
    <p class="g-sub">Entrá con tu usuario.</p>
    ${ui.loginMsg ? `<p class="g-msg">${esc(ui.loginMsg)}</p>` : ""}
    <form data-submit="entrar" autocomplete="on">
    <label class="fld"><input type="text" name="username" data-f="usuario" value="${esc(f.usuario || "")}" autocapitalize="off" autocomplete="username" spellcheck="false" placeholder=" "><span>Usuario</span></label>
    <label class="fld"><input type="${ui.ver ? "text" : "password"}" name="password" data-f="pass" value="${esc(f.pass || "")}" autocomplete="current-password" placeholder=" "><span>Contraseña</span><button type="button" class="ojo" data-act="verPass" aria-label="Mostrar contraseña">${ic("eye", "s")}</button></label>
    ${ui.loginErr ? `<p class="err">${esc(ui.loginErr)}</p>` : ""}
    <button type="submit" class="btn block big" ${ui.ocupado ? "disabled" : ""}>${ui.ocupado ? "Entrando…" : "Entrar"}</button>
    </form>
    <p class="g-foot">¿No tenés usuario? Pedíselo a quien administra Ronda.</p>`);
}

/* ---------- Estructura con navegación ---------- */
function vShell(content) {
  const pend = contarPendientes();
  const tabs = [...TABS, { id: "mas", t: "Yo", i: "user" }];
  const tabBtn = (t, cls) => `<button class="${cls}" data-act="tab" data-tab="${t.id}" ${ui.tab === t.id && !ui.sub ? 'aria-current="page"' : ""}>`;
  const demo = Clock.offsetMin !== 0;
  return `
  <div class="shell ${ui.sub === "persona" ? "editando" : ""}">
    <aside class="side">
      ${marca("Gervital")}
      <nav aria-label="Secciones">${tabs.map((t) => `${tabBtn(t, "nav")}${t.id === "mas" ? avatar(S.user, "xs") : ic(t.i)}${t.id === "mas" ? "Mi cuenta" : t.t}${t.id === "hoy" && pend ? `<span class="badge">${pend}</span>` : ""}</button>`).join("")}</nav>
      <div class="grow"></div>
      <div class="reloj js-reloj ${demo ? "demo" : ""}"><span class="dot"></span><span class="js-hora">${nowHM()}</span></div>
    </aside>
    <div class="wrap">
      <main class="page ${ui.tab === "hoy" && !ui.sub ? "" : "narrow"}" id="main">${content}</main>
    </div>
    <nav class="tabs" aria-label="Secciones">${tabs.map((t) => `${tabBtn(t, "tab")}<span class="ico">${t.id === "mas" ? avatar(S.user, "xs") : ic(t.i)}${t.id === "hoy" && pend ? `<span class="badge">${pend}</span>` : ""}</span>${t.t}</button>`).join("")}</nav>
  </div>`;
}
function contarPendientes() {
  const rs = rondasDe(today()); const cur = rondaActual(rs); if (!cur) return 0;
  return rs.filter((r) => mins(r.hora) <= mins(cur.hora)).reduce((n, r) => n + r.items.filter((t) => { const e = estado(t); return e === "pendiente" || e === "atrasada" || e === "pospuesta"; }).length, 0);
}

/* ---------- HOY ---------- */
/* Patrón de las apps de medicación y de las planillas de enfermería:
   una lista de tomas ordenada por urgencia (atrasadas, ahora, más tarde, dadas)
   y un botón grande "Dar" en cada una. */
const PEND = ["pendiente", "pospuesta", "atrasada"];
function abiertaT(t) { const e = estado(t); return abierta(e) || e === "sinreg"; }

function vHoy() {
  const iso = today();
  if (!S.personas.some((p) => p.activo !== false)) return vSinPersonas();
  const rondas = rondasDe(iso);
  const min = nowMin();
  const top = `<header class="hoy-top"><div class="grow"><p class="fecha et">${esc(fechaLarga(iso))}</p><h1>Hola, ${esc(primerNombre(S.user.nombre))}</h1></div><div class="reloj js-reloj ${Clock.offsetMin ? "demo" : ""}"><span class="dot"></span><span class="js-hora">${nowHM()}</span></div></header>`;
  if (!rondas.length) return `<div class="hoy">${top}<div class="vacio">${MARK}<h3>Hoy no hay medicación</h3></div>${vNoVinieron(iso)}</div>`;
  return vHoyAgenda(rondas, min, top, iso);
}

/* Agenda por horario: cada ronda es un bloque; la de ahora y las atrasadas abiertas.
   Dentro de la ronda, una tarjeta por persona con toda su medicación y las tres acciones a la vista. */
function vHoyAgenda(rondas, min, top, iso) {
  const cur = rondaActual(rondas);
  let h = top;
  h += `<div class="agenda">${rondas.map((r, ri) => {
    const vis = r.items.filter((t) => estado(t) !== "ausente");
    const abiertas = vis.filter(abiertaT);
    const hechas = vis.length - abiertas.length;
    const pasada = mins(r.hora) + 15 < min;
    const st = !abiertas.length ? "ok" : pasada && r !== cur ? "bad" : mins(r.hora) - 15 <= min ? "now" : "prox";
    const def = st === "now" || st === "bad"; const abierta = ui.ag && r.hora in ui.ag ? ui.ag[r.hora] : def;
    const est = st === "ok" ? `${ic("check", "s")} Todo registrado` : st === "bad" ? "Atrasada" : st === "now" ? "Es ahora" : `En ${durTxt(mins(r.hora) - min)}`;
    const resto = st === "ok" ? plural(hechas, "toma") : abiertas.length === vis.length ? `${plural(vis.length, "toma pendiente", "tomas pendientes")}` : `${hechas} de ${vis.length} · ${abiertas.length === 1 ? "falta 1" : `faltan ${abiertas.length}`}`;
    const pct = vis.length ? Math.round((hechas / vis.length) * 100) : 100;
    return `<section class="ag ${st} ${abierta ? "open" : ""}" style="--i:${ri}">
      <button class="ag-h" data-act="verRonda" data-h="${r.hora}" data-def="${def ? 1 : ""}" aria-expanded="${abierta}">
        <b class="ag-hora num">${r.hora}</b>
        <span class="ag-est"><span class="ag-tx">${est}</span><span class="ag-n num">${resto}</span></span>
        <span class="ag-chev">${ic("chevD", "s")}</span>
        <span class="ag-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>
      </button>
      ${abierta ? `<div class="pcs">${agrupar(vis).map((g, i) => vPaciente(g, st, i)).join("")}</div>` : ""}
    </section>`;
  }).join("")}</div>`;
  return `<div class="hoy">${h}${vInvitaAvisos()}${vNoVinieron(iso)}</div>`;
}

/* Tarjeta de una persona en una ronda: quién es, qué toma y las acciones Dar · No vino · Otra */
function vPaciente(g, st, i) {
  const p = g.p;
  const pend = g.tomas.filter(abiertaT);
  const temprano = st === "prox";
  const prev = st === "bad" || pend.some((t) => estado(t) === "sinreg");
  const ids = pend.map((t) => t.id).join(",");
  const recien = ui.recien && g.tomas.some((t) => ui.recien.includes(t.id));
  const meds = g.tomas.map((t) => {
    const e = estado(t);
    let tag = "";
    if (e === "sinreg") tag = `<span class="tg bad">Sin registrar</span>`;
    else if (e === "atrasada") tag = `<span class="tg bad">Hace ${durTxt(minutosTarde(t))}</span>`;
    else if (e === "pospuesta") tag = `<span class="tg warn">Para las ${esc(t.r.posp)}</span>`;
    const hecho = e === "dada" || e === "nodada";
    const fin = hecho ? `<span class="md-st ${e}">${ic(e === "dada" ? "check" : "nodio", "s")}${e === "dada" ? "La tomó " + esc(t.r?.horaReal || "") : "No la tomó"} · ${esc(primerNombre(staffNombre(t.r?.por)))}</span>` : tag;
    return `<li class="${hecho ? "hecho " + e : ""}"><button class="md" data-act="sheet" data-s="${hecho ? "editreg" : "otra"}" data-id="${t.id}" data-ids="${t.id}"><span class="md-n"><b>${esc(t.m.nombre)}</b>${t.m.dosis ? ` <span>${esc(t.m.dosis)}</span>` : ""}</span>${t.m.indicacion ? `<span class="md-i">${esc(t.m.indicacion)}</span>` : ""}${fin ? `<span class="md-f">${fin}</span>` : ""}</button></li>`;
  }).join("");
  const nota = p.notas ? `<span class="pc-nota">${esc(p.notas)}</span>` : "";
  const acts = !pend.length ? "" : temprano
    ? `<div class="pc-acts tarde"><span class="pc-hora">${ic("clock", "s")} A las ${esc(g.tomas[0].hora)}</span><button class="a2" data-act="ausencia" data-pid="${p.id}">No vino</button></div>`
    : `<div class="pc-acts">
        <button class="a-dar" data-act="darTodas" data-ids="${ids}" ${prev ? 'data-prev="1"' : ""}>${ic("check", "s")}${pend.length > 1 ? `Se las di · ${pend.length}` : "Se la di"}</button>
        <button class="a2" data-act="ausencia" data-pid="${p.id}">No vino</button>
        <button class="a2" data-act="sheet" data-s="otra" data-id="${pend[0].id}" data-ids="${ids}">Otra</button>
      </div>`;
  const tono = !pend.length ? "lista" : temprano ? "luego" : prev || pend.some((t) => estado(t) === "atrasada") ? "tarde" : "pend";
  return `<article class="pc ${tono} ${recien ? "recien" : ""}" style="--i:${i}">
    <button class="pc-who" data-act="ficha" data-pid="${p.id}">${avatar(p)}<span class="pc-nm"><b>${esc(p.nombre)}</b>${nota}</span>${pend.length && !temprano ? `<span class="pc-tag">${tono === "tarde" ? "Atrasada" : "Pendiente"}</span>` : ""}${!pend.length ? `<span class="pc-ok" aria-label="Lista">${ic("check", "s")}</span>` : ""}</button>
    <ul class="pc-meds">${meds}</ul>
    ${acts}
  </article>`;
}

function vInvitaAvisos() {
  if (window.RONDA_NATIVA) return "";
  if (![...S.reg.values()].some((r) => r.por === S.user.id)) return "";
  if (!Nube.pushPosible || lsGet("ronda-avisos-no") || (lsGet("ronda-avisos") && Notification.permission === "granted")) return "";
  if (esIOS() && !instalada()) return "";
  return `<button class="invita" data-act="sheet" data-s="avisos">${ic("bell")}<b class="grow">Activar la alarma con la app cerrada</b>${ic("chevR", "s")}</button>`;
}

function agrupar(tomas) {
  const m = new Map();
  for (const t of tomas) { if (!m.has(t.p.id)) m.set(t.p.id, { p: t.p, tomas: [] }); m.get(t.p.id).tomas.push(t); }
  return [...m.values()];
}

/* Quienes avisaron que no vienen hoy: se puede deshacer */
function vNoVinieron(iso) {
  const no = S.personas.filter((p) => asisteEl(p, iso) && ausente(iso, p.id));
  if (!no.length) return "";
  return `<div class="sec-t"><h3>No vinieron</h3><span>${no.length}</span></div>
    <div class="tomas">${no.map((p) => `<div class="tm">${avatar(p, "sm")}<span class="grow tx"><b>${esc(p.nombre)}</b></span><button class="mini" data-act="ausencia" data-pid="${p.id}">Sí vino</button></div>`).join("")}</div>`;
}

function vSinPersonas() {
  const cuid = S.staff.filter((u) => u.id !== S.user.id && u.activo !== false).length;
  return `<div class="hoy"><header class="hoy-top"><div class="grow"><p class="fecha">${esc(fechaLarga(today()))}</p><h1>Hola, ${esc(primerNombre(S.user.nombre))}</h1></div></header>
    ${esAdmin() ? `<h2 class="h2" style="margin:8px 0 14px">Empecemos</h2>
    <div class="pasos">
      <button class="paso" data-act="nuevaPersona"><span class="n">1</span><span class="grow"><b>Agregar personas</b><small>Y su medicación con horario</small></span>${ic("chevR", "s")}</button>
      <button class="paso" data-act="sub" data-sub="equipo"><span class="n ${cuid ? "ok" : ""}">${cuid ? ic("check", "s") : "2"}</span><span class="grow"><b>Crear usuarios del equipo</b><small>${cuid ? plural(cuid, "usuario creado", "usuarios creados") : "Usuario y contraseña para cada una"}</small></span>${ic("chevR", "s")}</button>
    </div>` : `<div class="vacio">${MARK}<h3>Todavía no hay personas cargadas</h3></div>`}</div>`;
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
    <div class="pagehead"><div><h1 class="h1">Personas</h1>${F.act ? "" : "<p>Dadas de baja</p>"}</div><div class="sp"></div>${F.act ? `<button class="btn" data-act="nuevaPersona">${ic("plus")} Nueva</button>` : `<button class="btn line" data-act="pfAct" data-v="1">${ic("chevL", "s")} Volver</button>`}</div>
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
      ${p.notas ? `<div class="kv"><span>A tener en cuenta</span><div>${esc(p.notas)}</div></div>` : ""}
      <div class="kv"><span>Medicación</span>${ms.length ? ms.map((m) => `<div class="dmed"><div class="grow"><b>${esc(m.nombre)}</b> <span class="muted">${esc(m.dosis || "")}</span>${m.indicacion ? `<div class="faint small">${esc(m.indicacion)}</div>` : ""}</div><div class="num" style="font-weight:700;text-align:right">${m.horas.join("<br>")}</div></div>`).join("") : `<div class="muted">Sin medicación cargada.</div>`}</div>
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
      <div class="field"><span class="flabel">Días que viene al centro</span><div class="dsel" role="group" aria-label="Días">${DIAS.map((d) => `<button data-act="fDia" data-n="${d.n}" aria-pressed="${f.dias.includes(d.n)}" aria-label="${d.l}">${d.c}</button>`).join("")}</div><span class="hint">${f.dias.length ? esc(diasTexto(f.dias)) : "Tocá los días en que viene"}</span></div>
      <label class="field"><span>A tener en cuenta <i>(opcional)</i></span><textarea data-f="notas" placeholder="Ej.: le cuesta tragar, prefiere tomarla con jugo">${esc(f.notas)}</textarea></label>
    </div>
    <div class="section"><h2 class="h3">Medicación en el centro</h2><div class="sp"></div><button class="btn sec sm" data-act="medNuevo">${ic("plus", "s")} Agregar</button></div>
    ${f.meds.filter((m) => !m._del).length ? `<div class="list">${f.meds.map((m, i) => m._del ? "" : `
      <div class="li"><span class="grow"><span class="t">${esc(m.nombre)} <span class="muted" style="font-weight:400">${esc(m.dosis || "")}</span></span><span class="d" style="display:block">${m.horas.join(" · ") || "Sin horario"}${m.indicacion ? " · " + esc(m.indicacion) : ""}</span></span><button class="btn line xs" data-act="medEdit" data-i="${i}">Editar</button></div>`).join("")}</div>`
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
    <div class="pagehead"><div><h1 class="h1">Historial</h1></div><div class="sp"></div><button class="btn line sm" data-act="exportCSV">${ic("download", "s")} Descargar</button></div>
    <div class="filtros">
      <div class="seg" role="group" aria-label="Período">${[["hoy", "Hoy"], ["7", "7 días"], ["30", "30 días"]].map(([v, t]) => `<button data-act="hf" data-k="rango" data-v="${v}" aria-pressed="${H.rango === v}">${t}</button>`).join("")}</div>
      <select data-hf="pid" aria-label="Persona"><option value="">Todas las personas</option>${personasOpt}</select>
    </div>
    <div class="dpills" role="group" aria-label="Estado">${[["", "Todas"], ["dada", "Tomadas"], ["nodada", "No tomadas"], ["sinreg", "Sin registrar"], ["ausencia", "No vino"]].map(([v, t]) => `<button data-act="hf" data-k="estado" data-v="${v}" aria-pressed="${H.estado === v}">${t}</button>`).join("")}</div>
    <div class="resumen">
      <div class="ok"><b>${dadas}</b><span>Tomadas</span></div>
      <div class="no"><b>${no}</b><span>No tomadas</span></div>
      <div class="srg"><b>${sr}</b><span>Sin registrar</span></div>
      <div class="pc2"><b>${tot ? Math.round((dadas / tot) * 100) : 0}%</b><span>Tomadas</span></div>
    </div>
    ${fechas.length ? fechas.map((f) => {
      const del = items.filter((x) => x.fecha === f).sort((a, b) => (a.hora || "99").localeCompare(b.hora || "99") || a.p.nombre.localeCompare(b.p.nombre));
      return `<div class="hdia"><h2 class="h3">${esc(fechaRel(f))}</h2><span class="faint small">${f === today() ? esc(fechaLarga(f)) : ""}</span></div>
      <div class="list">${del.map((x) => x.e === "ausencia"
        ? `<div class="hrow"><span class="hh">—</span><span><b>${esc(x.p.nombre)}</b><div class="x">${x.a.motivo ? esc(x.a.motivo) + " · " : ""}marcó ${esc(primerNombre(staffNombre(x.a.por)))}</div></span><span class="st ausencia">No vino</span></div>`
        : `<button class="hrow" data-act="sheet" data-s="editreg" data-id="${x.id}"><span class="hh">${esc(x.hora)}${x.r?.horaReal && x.r.horaReal !== x.hora ? `<small>a las ${esc(x.r.horaReal)}</small>` : ""}</span><span><b>${esc(x.p.nombre)}</b><div class="x">${esc(x.m.nombre)} ${esc(x.m.dosis || "")}${x.r?.por ? ` · ${esc(primerNombre(staffNombre(x.r.por)))}` : ""}${x.r?.motivo ? ` · ${esc(x.r.motivo)}` : ""}${x.r?.ediciones?.length ? " · corregida" : ""}</div></span><span class="st ${x.e}">${ESTADO_TXT[x.e]}</span></button>`).join("")}</div>`;
    }).join("") : `<div class="empty"><div>${MARK}</div><h3>No hay registros en este período</h3><p>Cuando registren tomas en Hoy, van a aparecer acá.</p></div>`}`;
}

/* ---------- YO (cuenta y ajustes) ---------- */
function vMas() {
  const u = S.user;
  const li = (act, icon, t, d, extra = "", cls = "") => `<button class="li" data-act="${act}" ${extra}><span class="ic ${cls}">${ic(icon)}</span><span class="grow"><span class="t">${t}</span>${d ? `<span class="d" style="display:block">${d}</span>` : ""}</span>${ic("chevR", "s chev")}</button>`;
  const nativa = !!window.RONDA_NATIVA;
  return `
    <div class="perfil">${avatar(u, "xl")}<h1>${esc(u.nombre)}</h1><p>@${esc(u.usuario || "")} · ${u.admin ? "Administra" : "Equipo"}</p></div>
    ${u.admin ? `<div class="grupo"><div class="list">
      ${li("sub", "equipo", "Usuarios del equipo", plural(S.staff.filter((x) => x.activo !== false).length, "usuario"), 'data-sub="equipo"')}
      ${li("sub", "ajustes", "Alarma y tiempos", "", 'data-sub="ajustes"')}
      ${li("sub", "sheet", "Importar planilla", "", 'data-sub="importar"')}
    </div></div>` : `<div class="grupo"><div class="list">${li("sub", "sound", "Sonido de la alarma", S.cfg.sonido ? "Activado" : "Apagado", 'data-sub="ajustes"')}</div></div>`}
    <div class="grupo"><div class="list">
      ${li("sheet", "bell", "Probar la alarma", "", 'data-s="probar"')}
      ${!nativa && Nube.disponible ? li("sheet", "bell", "Alarma con la app cerrada", lsGet("ronda-avisos") && typeof Notification !== "undefined" && Notification.permission === "granted" ? "Activada" : "Desactivada", 'data-s="avisos"') : ""}
      ${!nativa ? li("sheet", "install", "Instalar en este celular", "", 'data-s="install"') : ""}
      ${li("sheet", "key", "Cambiar mi contraseña", "", 'data-s="pin"')}
    </div></div>
    <button class="btn line block" data-act="logout">${ic("logout", "s")} Cerrar sesión</button>
    <p class="faint xs" style="text-align:center;margin-top:20px">Ronda 2.0 · Gervital${Nube.estado === "sinred" ? " · sin internet, se guarda y sube después" : ""}</p>`;
}

/* Usuarios del equipo */
function vEquipo() {
  const act = S.staff.filter((u) => u.activo !== false), ina = S.staff.filter((u) => u.activo === false);
  const fila = (u) => `<button class="li" data-act="sheet" data-s="miembro" data-uid="${u.id}">${avatar(u)}<span class="grow"><span class="t">${esc(u.nombre)}${u.id === S.user.id ? " (vos)" : ""}</span><span class="d" style="display:block">@${esc(u.usuario || "sin usuario")}${u.admin ? " · Administra" : ""}</span></span>${ic("chevR", "s chev")}</button>`;
  return `
    <div class="subhead"><button class="iconbtn" data-act="back" aria-label="Volver">${ic("chevL")}</button><h1 class="h2">Usuarios</h1><button class="btn sm" data-act="sheet" data-s="miembro">${ic("plus", "s")} Nuevo</button></div>
    <div class="list">${act.map(fila).join("")}</div>
    ${ina.length ? `<div class="sec-t" style="margin-top:22px"><h3>Sin acceso</h3><span>${ina.length}</span></div><div class="list">${ina.map(fila).join("")}</div>` : ""}`;
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

    </div><p class="faint xs" style="margin:8px 4px 0">Conviene validar estos tiempos con enfermería.</p></div>
    <div class="grupo"><span class="eyebrow">Presentación</span><div class="card pad">
      <div class="row top"><div class="grow"><b>Reloj de demostración</b><div class="muted small">Para mostrar la app en otro horario. Las alarmas y los estados siguen esta hora.</div></div></div>
      <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap">${["09:00", "12:55", "13:40", "16:00"].map((h) => `<button class="btn line xs" data-act="demoHora" data-h="${h}">${h}</button>`).join("")}${Clock.offsetMin ? `<button class="btn sol xs" data-act="demoHora" data-h="">Volver a la hora real</button>` : ""}</div>
    </div></div>
` : ""}`;
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
    case "otra": {
      const ids = sh.ids || [T.id]; const Ts = ids.map(tomaPorId);
      const pas = Ts.map((x) => `${x.m.nombre}${x.m.dosis ? " " + x.m.dosis : ""}`).join(" · ");
      const dI = `data-ids="${ids.join(",")}" data-id="${T.id}"`;
      title = T.p.nombre; sub = `Ronda de las ${T.hora} · ${pas}`;
      body = `<div class="opts">
        <button class="opt" data-act="sheet" data-s="nodio" ${dI}>${ic("nodio")}<span class="grow">No ${ids.length > 1 ? "las" : "la"} tomó<small>Se negó, estaba descansando, no había…</small></span>${ic("chevR", "s")}</button>
        <button class="opt" data-act="sheet" data-s="cuando" ${dI}>${ic("clock")}<span class="grow">Se ${ids.length > 1 ? "las" : "la"} di a otra hora</span>${ic("chevR", "s")}</button>
        ${T.fecha === today() && estado(T) !== "sinreg" ? `<div class="eyebrow">Recordarme en</div>
        <div class="timepick tres">${[10, 30, 60].map((n) => `<button class="opt" data-act="posponer" ${dI} data-n="${n}">${n === 60 ? "1 hora" : n + " min"}</button>`).join("")}</div>` : ""}
        ${ids.length > 1 ? `<div class="eyebrow">Tomó solo una</div>${Ts.map((x) => `<div class="opt solo"><span class="grow"><b>${esc(x.m.nombre)}</b> ${esc(x.m.dosis || "")}</span><button class="a-dar sm" data-act="dar" data-id="${x.id}">${ic("check", "s")}Se la di</button></div>`).join("")}` : ""}
      </div>`;
      break;
    }
    case "nodio":
      title = "¿Por qué no la tomó?"; sub = sh.ids && sh.ids.length > 1 ? `${primerNombre(T.p.nombre)} · ${plural(sh.ids.length, "medicamento")}` : tname;
      body = `<div class="opts">${MOTIVOS.map((m) => `<button class="opt" data-act="fSet" data-k="motivo" data-v="${esc(m)}" aria-pressed="${f.motivo === m}"><span class="grow">${esc(m)}</span>${f.motivo === m ? ic("check") : ""}</button>`).join("")}</div>
        <label class="field" style="margin:14px 0 0"><span>Nota (opcional)</span><input type="text" data-f="nota" value="${esc(f.nota || "")}" placeholder="Ej.: se la ofrecimos dos veces"></label>`;
      acts = `<button class="btn line" data-act="closeSheet">Cancelar</button><button class="btn" data-act="guardarNodio" data-id="${T.id}" ${f.motivo ? "" : "disabled"}>Guardar</button>`;
      break;
    case "cuando": {
      title = "¿A qué hora se la diste?"; sub = sh.ids && sh.ids.length > 1 ? `${primerNombre(T.p.nombre)} · ${plural(sh.ids.length, "medicamento")}` : tname;
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
        <div class="seg" role="group" aria-label="Estado" style="margin-bottom:14px"><button data-act="fSet" data-k="estado" data-v="dada" aria-pressed="${f.estado === "dada"}">La tomó</button><button data-act="fSet" data-k="estado" data-v="nodada" aria-pressed="${f.estado === "nodada"}">No la tomó</button></div>
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
        <div class="field"><span class="flabel">${m.horas.length ? "Horarios en el centro" : "Hora en el centro"}</span>${m.horas.length ? `<div class="horas">${m.horas.map((h, i) => `<span class="hora-chip num">${h}<button data-act="medHoraDel" data-i="${i}" aria-label="Quitar ${h}">${ic("x", "s")}</button></span>`).join("")}</div>` : ""}<div class="hora-add"><input type="time" class="num" data-fm="nuevaHora" value="${esc(m.nuevaHora || "")}" aria-label="Hora">${m.horas.length ? `<button class="btn sec sm" data-act="medHoraAdd">${ic("plus", "s")} Sumar esta hora</button>` : `<button class="link sm" data-act="medHoraAdd">${ic("plus", "s")} Toma a otra hora también</button>`}</div><span class="hint">Viene en 12:00. Tocala para cambiarla.</span></div>
        ${ui.medErr ? `<p class="err">${esc(ui.medErr)}</p>` : ""}`;
      acts = `${m._nuevo ? `<button class="btn line" data-act="closeSheet">Cancelar</button>` : `<button class="btn danger" data-act="medQuitar">${ic("trash", "s")} Quitar</button>`}<button class="btn" data-act="medGuardar">Listo</button>`;
      break;
    }
    case "miembro": {
      const u = f.u;
      title = u._nuevo ? "Nuevo usuario" : u.nombre;
      body = `
        <label class="field"><span>Nombre</span><input type="text" data-fu="nombre" value="${esc(u.nombre)}" placeholder="Ej.: Lucía Gómez"></label>
        <label class="field"><span>Usuario</span><input type="text" data-fu="usuario" value="${esc(u.usuario || "")}" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Ej.: lucia"></label>
        <label class="field"><span>${u._nuevo ? "Contraseña" : "Contraseña nueva (opcional)"}</span><input type="text" data-fu="pass" value="${esc(u.pass || "")}" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="${u._nuevo ? "Mínimo 4 caracteres" : "Dejala vacía para no cambiarla"}"></label>
        ${u.id === S.user.id ? "" : `<button class="switch" data-act="uToggle" data-k="admin" role="switch" aria-checked="${!!u.admin}"><span class="grow"><b>Administra</b><span>Puede crear usuarios y cambiar ajustes</span></span><span class="sw"></span></button>`}
        ${u._nuevo || u.id === S.user.id ? "" : `<button class="switch" data-act="uToggle" data-k="activo" role="switch" aria-checked="${u.activo !== false}"><span class="grow"><b>Tiene acceso</b><span>Si lo apagás, no puede entrar</span></span><span class="sw"></span></button>`}
        ${ui.uErr ? `<p class="err">${esc(ui.uErr)}</p>` : ""}`;
      acts = `<button class="btn line" data-act="closeSheet">Cancelar</button><button class="btn" data-act="guardarMiembro" ${ui.ocupado ? "disabled" : ""}>${ui.ocupado ? "Guardando…" : "Guardar"}</button>`;
      break;
    }
    case "creado": {
      const u = f.creado;
      title = "Usuario creado"; sub = `Pasale estos datos a ${primerNombre(u.nombre)}:`;
      body = `<div class="cred"><div><span>Usuario</span><b>${esc(u.usuario)}</b></div><div><span>Contraseña</span><b>${esc(u.pass)}</b></div></div>`;
      acts = `<button class="btn line" data-act="credCompartir">${ic("phone", "s")} Compartir</button><button class="btn" data-act="closeSheet">Listo</button>`;
      break;
    }
    case "pin":
      title = "Cambiar mi contraseña";
      body = `<label class="field"><span>Contraseña actual</span><input type="password" data-f="actual" value="${esc(f.actual || "")}" autocomplete="current-password"></label>
        <label class="field"><span>Contraseña nueva</span><input type="password" data-f="nuevo" value="${esc(f.nuevo || "")}" autocomplete="new-password"></label>
        ${ui.pinErr ? `<p class="err">${esc(ui.pinErr)}</p>` : ""}`;
      acts = `<button class="btn line" data-act="closeSheet">Cancelar</button><button class="btn" data-act="guardarPin" ${ui.ocupado ? "disabled" : ""}>Guardar</button>`;
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
  const ronda = a.kind === "ronda";
  return `<div class="alarm ${ronda ? "" : "atraso"}" role="alertdialog" aria-modal="true" aria-label="${ronda ? "Llegó la ronda" : "Tomas atrasadas"}">
    <div class="al-top"><span class="al-k"><span class="al-dot"></span>${a.prueba ? "Prueba de alarma" : ronda ? "Ronda de medicación" : "Quedan tomas sin dar"}</span></div>
    <div class="al-mid">
      <h2 class="num">${esc(a.hora)}</h2>
      <p class="al-q">${ronda ? `${plural(a.personas, "persona")} · ${plural(a.total, "toma")}` : `${plural(a.total, "toma atrasada", "tomas atrasadas")}`}</p>
      <p class="al-who">${a.nombres.map((n) => `<span>${esc(n)}</span>`).join("")}</p>
    </div>
    <div class="al-acts">
      <button class="al-posp" data-act="alarmPosponer">${ic("clock", "s")} Posponer 10 minutos</button>
      <button class="al-ver" data-act="alarmVer">Ir a registrar</button>
      <button class="al-off" data-act="alarmSilenciar">Apagar</button>
    </div>
  </div>`;
}

function vToast() {
  if (!ui.toast) return "";
  return `<div class="toast ${ui.toast.kind || ""}" role="status" aria-live="polite"><div class="grow">${esc(ui.toast.msg)}</div>${ui.toast.undo ? `<button class="btn sm" data-act="undo">${ic("undo", "s")} Deshacer</button>` : ""}</div>`;
}
