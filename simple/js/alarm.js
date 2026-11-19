/* Ronda · Gervital — alarmas por ronda (sonido, vibración y aviso del sistema) */
"use strict";

/* Notas de cada aviso: [frecuencia, inicio (s), duración (s), volumen, forma] */
const NOTAS = {
  ronda: [[659.25, 0, 1.1, 0.32, "sine"], [783.99, 0.22, 1.1, 0.32, "sine"], [987.77, 0.44, 1.1, 0.32, "sine"],
    [1318.5, 0, 0.5, 0.05, "sine"], [1567.98, 0.22, 0.5, 0.05, "sine"], [1975.53, 0.44, 0.5, 0.05, "sine"]],
  atraso: [[880, 0, 0.18, 0.38, "triangle"], [660, 0.2, 0.18, 0.38, "triangle"], [880, 0.4, 0.18, 0.38, "triangle"], [660, 0.6, 0.18, 0.38, "triangle"]],
};

/* Arma un WAV con las notas. Sirve de respaldo cuando el celular no deja usar Web Audio. */
function wavDe(notas) {
  const sr = 22050, largo = Math.max(...notas.map((n) => n[1] + n[2])) + 0.1, N = Math.ceil(sr * largo);
  const pcm = new Float32Array(N);
  for (const [f, t0, dur, vol, forma] of notas) {
    const a = Math.floor(t0 * sr), b = Math.min(N, Math.floor((t0 + dur) * sr));
    for (let i = a; i < b; i++) {
      const t = (i - a) / sr, fase = 2 * Math.PI * f * t;
      const onda = forma === "triangle" ? (2 / Math.PI) * Math.asin(Math.sin(fase)) : Math.sin(fase);
      const env = Math.min(1, t / 0.02) * Math.exp(-4.6 * t / dur);
      pcm[i] += onda * vol * env;
    }
  }
  const buf = new ArrayBuffer(44 + N * 2), v = new DataView(buf);
  const str = (o, x) => { for (let i = 0; i < x.length; i++) v.setUint8(o + i, x.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + N * 2, true); str(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, N * 2, true);
  for (let i = 0; i < N; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 32767, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

const Sound = {
  ctx: null, timer: null, sonando: null, el: {}, desbloqueado: false,
  /* En iPhone el sonido solo se habilita después de un toque, y el modo silencio
     apaga Web Audio salvo que la sesión de audio sea de "reproducción". */
  unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state !== "running") this.ctx.resume().catch(() => {});
      if (!this.desbloqueado) { // un sonido mudo dentro del toque deja el audio habilitado
        const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource();
        s.buffer = b; s.connect(this.ctx.destination); s.start(0);
      }
    } catch (e) { /* sin Web Audio */ }
    if (!this.desbloqueado) {
      this.desbloqueado = true;
      for (const k of Object.keys(NOTAS)) {
        try {
          const a = this.el[k] || (this.el[k] = new Audio(wavDe(NOTAS[k])));
          a.preload = "auto"; a.muted = true;
          const p = a.play(); if (p) p.then(() => { a.pause(); a.currentTime = 0; a.muted = false; }, () => { a.muted = false; this.desbloqueado = false; });
        } catch (e) {}
      }
    }
  },
  get listo() { return !!this.ctx && this.ctx.state === "running"; },
  tone(f, start, dur, vol, type) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(c.destination); o.start(start); o.stop(start + dur + 0.05);
  },
  sonar(kind) {
    if (this.listo) { const t = this.ctx.currentTime + 0.02; for (const [f, t0, dur, vol, forma] of NOTAS[kind]) this.tone(f, t + t0, dur, vol, forma); return; }
    try { const a = this.el[kind] || (this.el[kind] = new Audio(wavDe(NOTAS[kind]))); a.muted = false; a.currentTime = 0; const p = a.play(); if (p) p.catch(() => {}); } catch (e) {}
  },
  play(kind) {
    this.stop();
    if (!S.cfg.sonido) { this.vibrar(kind); return; }
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    if (this.ctx && this.ctx.state !== "running") this.ctx.resume().catch(() => {});
    this.sonando = kind;
    let n = 0;
    const one = () => { try { this.sonar(kind); } catch (e) {} this.vibrar(kind); };
    setTimeout(one, 60);
    this.timer = setInterval(() => {
      if (++n >= (kind === "ronda" ? 4 : 20)) { this.stop(); return; }
      one();
    }, kind === "ronda" ? 2600 : 1150);
  },
  vibrar(kind) {
    if (!S.cfg.vibrar) return;
    try { navigator.vibrate && navigator.vibrate(kind === "ronda" ? [220, 120, 220] : [420, 160, 420, 160, 420]); } catch (e) {}
  },
  stop() { clearInterval(this.timer); this.timer = null; this.sonando = null; for (const a of Object.values(this.el)) { try { a.pause(); } catch (e) {} } },
};
for (const ev of ["pointerdown", "touchend", "keydown"]) document.addEventListener(ev, () => Sound.unlock(), { passive: true, capture: true });

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
