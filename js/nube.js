/* Ronda · Gervital — datos compartidos entre celulares y alarma con la app cerrada (Supabase) */
"use strict";

const NUBE = {
  url: "https://udpiljwtpedlulzclbln.supabase.co",
  key: "sb_publishable_AKqdUSaPYdnPK5F2catqCg_czVejpDs",
  vapid: "BFwhmcumvJEhip-zc1c_PPkF1jElENDVUbzLzs80kZ4HJH9y4GeFsaxbSkt4BJLAWPA2FpvW-MHaDJWRaMbKWXk",
};
/* Valores que son de cada celular y no se comparten */
const soloLocal = (tienda, id) => tienda === "kv" && (id === "ultimaCopia" || String(id).startsWith("alarmas-"));

const Nube = {
  estado: "off", // off · ok · subiendo · sinred · error
  ultima: null,
  _t: null,
  get disponible() { return !window.RONDA_ARTIFACT && "fetch" in window; },
  get clave() { return lsGet("ronda-centro"); },
  get activa() { return this.disponible && !!this.clave; },
  get seq() { return +(lsGet("ronda-seq") || 0); },
  cola() { try { return JSON.parse(lsGet("ronda-cola") || "{}"); } catch (e) { return {}; } },
  guardarCola(c) { lsSet("ronda-cola", JSON.stringify(c)); },

  async rpc(fn, args) {
    const r = await fetch(`${NUBE.url}/rest/v1/rpc/${fn}`, {
      method: "POST", headers: { apikey: NUBE.key, Authorization: `Bearer ${NUBE.key}`, "Content-Type": "application/json" }, body: JSON.stringify(args),
    });
    if (!r.ok) { const e = new Error((await r.text()).slice(0, 200)); e.status = r.status; throw e; }
    return r.json();
  },

  /* Cada cambio guardado en el celular se anota para subir */
  encolar(tienda, obj, borrado) {
    if (!this.activa) return;
    const id = borrado ? obj : obj.id;
    if (soloLocal(tienda, id)) return;
    let data = borrado ? null : obj;
    if (tienda === "kv" && id === "cfg" && data) { data = { ...data }; delete data.demoOffset; }
    const c = this.cola(); c[`${tienda}|${id}`] = { tienda, id, data, borrado: !!borrado }; this.guardarCola(c);
    clearTimeout(this._t); this._t = setTimeout(() => this.sincronizar(), 1200);
  },

  async sincronizar() {
    if (!this.activa || this._corriendo || !navigator.onLine) { if (this.activa && !navigator.onLine) this.estado = "sinred"; return; }
    this._corriendo = true;
    try {
      const c = this.cola(); const docs = Object.values(c);
      for (let i = 0; i < docs.length; i += 500) await this.rpc("ronda_subir", { p_clave: this.clave, p_docs: docs.slice(i, i + 500) });
      if (docs.length) { const ahora = this.cola(); for (const k of Object.keys(c)) if (JSON.stringify(ahora[k]) === JSON.stringify(c[k])) delete ahora[k]; this.guardarCola(ahora); }
      let cambios = 0, filas;
      do {
        filas = await this.rpc("ronda_bajar", { p_clave: this.clave, p_desde: this.seq });
        const pend = this.cola();
        for (const f of filas) {
          lsSet("ronda-seq", String(f.seq));
          if (soloLocal(f.tienda, f.id) || pend[`${f.tienda}|${f.id}`]) continue;
          if (f.borrado) await DB.del(f.tienda, f.id);
          else {
            let d = f.data;
            if (f.tienda === "kv" && f.id === "cfg") d = { ...d, demoOffset: S.cfg.demoOffset || 0 };
            await DB.put(f.tienda, d);
          }
          cambios++;
        }
      } while (filas.length >= 5000);
      if (cambios) {
        const uid = S.user?.id, demo = Clock.offsetMin;
        await loadAll(); Clock.offsetMin = demo;
        S.user = uid ? staffById(uid) || null : null;
        if (uid && !S.user) ui = UI0();
        if (listo && !ui.sheet && !isTyping()) render();
      }
      this.estado = "ok"; this.ultima = Date.now();
    } catch (e) {
      this.estado = e.status ? "error" : "sinred";
      console.warn("sincronizar", e);
    } finally { this._corriendo = false; }
  },

  /* Primer celular: crea el centro y sube todo lo que tiene */
  async crear() {
    const b = new Uint8Array(24); crypto.getRandomValues(b);
    const clave = btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await this.rpc("ronda_crear", { p_clave: clave, p_nombre: S.cfg.centro || "Gervital" });
    lsSet("ronda-centro", clave); lsSet("ronda-seq", "0"); this.guardarCola({});
    await this.subirTodo();
    await this.sincronizar();
  },
  async subirTodo() {
    const data = await DB.dump(); const c = {};
    for (const t of DB.STORES) for (const o of data[t]) {
      if (soloLocal(t, o.id)) continue;
      let d = o; if (t === "kv" && o.id === "cfg") { d = { ...o }; delete d.demoOffset; }
      c[`${t}|${o.id}`] = { tienda: t, id: o.id, data: d, borrado: false };
    }
    this.guardarCola(c);
  },
  /* Otro celular: se une con el link o el código del centro */
  async unirse(texto, reemplazar) {
    const clave = leerClave(texto);
    if (!clave) throw new Error("codigo");
    const filas = await this.rpc("ronda_bajar", { p_clave: clave, p_desde: 0 }).catch((e) => { throw new Error(e.status ? "codigo" : "red"); });
    if (reemplazar) await DB.clearAll();
    lsSet("ronda-centro", clave); lsSet("ronda-seq", "0"); this.guardarCola({});
    if (!filas.length) await this.subirTodo();
    S.user = null; ui = UI0();
    await this.sincronizar();
    await loadAll();
  },
  salir() { lsDel("ronda-centro"); lsDel("ronda-seq"); lsDel("ronda-cola"); this.estado = "off"; },
  link() { return `${location.origin}${location.pathname}#centro=${this.clave}`; },

  /* ---------- Alarma con la app cerrada (Web Push) ---------- */
  get pushPosible() { return this.disponible && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; },
  async suscripcion() { try { const r = await navigator.serviceWorker.getRegistration(); return r && (await r.pushManager.getSubscription()); } catch (e) { return null; } },
  async activarAvisos() {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error(perm === "denied" ? "bloqueado" : "cancelado");
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlBytes(NUBE.vapid) });
    await this.rpc("ronda_suscribir", { p_clave: this.clave, p_sub: sub.toJSON(), p_staff: S.user?.id || null });
    lsSet("ronda-avisos", "1");
  },
  async desactivarAvisos() {
    const sub = await this.suscripcion();
    if (sub) { await this.rpc("ronda_desuscribir", { p_clave: this.clave, p_endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
    lsDel("ronda-avisos");
  },
  probarAvisos(espera = 12) {
    return fetch(`${NUBE.url}/functions/v1/ronda-avisos`, { method: "POST", keepalive: true, headers: { apikey: NUBE.key, "Content-Type": "application/json" }, body: JSON.stringify({ prueba: true, clave: this.clave, espera }) });
  },
};

function leerClave(texto) {
  const s = String(texto || "").trim();
  const m = s.match(/centro=([A-Za-z0-9_-]{24,})/) || s.match(/^([A-Za-z0-9_-]{24,})$/);
  return m ? m[1] : null;
}
function b64urlBytes(s) { const b = atob(s.replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, (c) => c.charCodeAt(0)); }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
const isTyping = () => { const a = document.activeElement; return !!(a && a.matches("input,textarea,select")); };
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
