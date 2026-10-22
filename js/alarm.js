/* Ronda · Gervital — alarmas por ronda (sonido, vibración y aviso del sistema) */
"use strict";

const Sound = {
  ctx: null, timer: null, sonando: null,
  unlock() {
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume();
    } catch (e) { /* sin audio */ }
  },
  get listo() { return !!this.ctx && this.ctx.state === "running"; },
  tone(f, start, dur, type, vol) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(c.destination); o.start(start); o.stop(start + dur + 0.05);
  },
  ronda() { // campana suave de tres notas
    const t = this.ctx.currentTime;
    [659.25, 783.99, 987.77].forEach((f, i) => this.tone(f, t + i * 0.22, 1.1, "sine", 0.32));
    [659.25, 783.99, 987.77].forEach((f, i) => this.tone(f * 2, t + i * 0.22, 0.5, "sine", 0.05));
  },
  atraso() { // dos tonos alternados, más insistente
    const t = this.ctx.currentTime;
    [0, 1, 2, 3].forEach((i) => this.tone(i % 2 ? 660 : 880, t + i * 0.2, 0.18, "triangle", 0.38));
  },
  play(kind) {
    this.stop();
    if (!S.cfg.sonido) { this.vibrar(kind); return; }
    this.unlock();
    if (!this.ctx) return;
    this.sonando = kind;
    let n = 0;
    const one = () => { try { kind === "ronda" ? this.ronda() : this.atraso(); } catch (e) {} this.vibrar(kind); };
    one();
    this.timer = setInterval(() => {
      if (++n >= (kind === "ronda" ? 4 : 20)) { this.stop(); return; }
      one();
    }, kind === "ronda" ? 2600 : 1150);
  },
  vibrar(kind) {
    if (!S.cfg.vibrar) return;
    try { navigator.vibrate && navigator.vibrate(kind === "ronda" ? [220, 120, 220] : [420, 160, 420, 160, 420]); } catch (e) {}
  },
  stop() { clearInterval(this.timer); this.timer = null; this.sonando = null; },
};

const Alarm = {
  activa: null, // { kind, hora, total, personas }
  disparadas() { return kvGet("alarmas-" + today()) || []; },
  marcar(key) { const l = this.disparadas(); if (!l.includes(key)) { l.push(key); kvSet("alarmas-" + today(), l); } },
  check() {
    const rondas = rondasDe(today());
    const ahora = nowMin();
    const ya = this.disparadas();
    for (const r of rondas) {
      const h = mins(r.hora);
      const pendientes = r.items.filter((t) => abierta(estado(t)));
      if (!pendientes.length) continue;
      if (ahora >= h && ahora < h + 5 && !ya.includes("r" + r.hora)) {
        this.marcar("r" + r.hora); this.disparar("ronda", r, pendientes); return;
      }
      const atras = pendientes.filter((t) => estado(t) === "atrasada");
      if (atras.length && !ya.includes("a" + r.hora) && ahora < h + S.cfg.limite) {
        this.marcar("a" + r.hora); this.disparar("atraso", r, atras); return;
      }
    }
  },
  disparar(kind, r, items) {
    this.activa = { kind, hora: r.hora, total: items.length, personas: new Set(items.map((t) => t.p.id)).size, nombres: [...new Set(items.map((t) => primerNombre(t.p.nombre)))] };
    Sound.play(kind);
    notificar(kind === "ronda" ? `Ronda de las ${r.hora}` : `Quedan tomas de las ${r.hora} sin dar`,
      kind === "ronda" ? `${plural(this.activa.personas, "persona")} · ${plural(this.activa.total, "toma")}: ${this.activa.nombres.join(", ")}` : `${plural(this.activa.total, "toma")} atrasada${this.activa.total === 1 ? "" : "s"}: ${this.activa.nombres.join(", ")}`);
    render();
  },
  probar(kind) {
    const fake = { hora: nowHM() };
    this.activa = { kind, hora: fake.hora, total: 3, personas: 2, nombres: ["Elena", "Julio"], prueba: true };
    Sound.play(kind);
    render();
  },
  cerrar() { Sound.stop(); this.activa = null; },
};

async function notificar(titulo, cuerpo) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted" || document.visibilityState === "visible" && document.hasFocus()) return;
    const opts = { body: cuerpo, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "ronda", renotify: true, requireInteraction: true };
    const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
    if (reg) reg.showNotification(titulo, opts); else new Notification(titulo, opts);
  } catch (e) {}
}
