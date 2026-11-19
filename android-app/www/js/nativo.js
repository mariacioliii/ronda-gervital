/* Ronda · Gervital — puente con la alarma nativa de Android.
   Programa en el sistema una alarma por cada ronda con tomas pendientes (hoy y los próximos días),
   así suena fuerte y a pantalla completa aunque la app esté cerrada o el celular en silencio. */
"use strict";

const Nativa = {
  get plugin() { try { return window.Capacitor?.Plugins?.RondaAlarma || null; } catch (e) { return null; } },
  get activa() { return !!(window.Capacitor?.isNativePlatform?.() && this.plugin); },
  ultima: "",

  /* Lista de alarmas de los próximos 7 días */
  calcular() {
    const lista = [];
    if (!S.staff.length) return lista;
    const desfase = (Clock.offsetMin || 0) * 60000;
    const ahora = Date.now();
    const hoy = today();
    for (let i = 0; i < 7; i++) {
      const iso = addDays(hoy, i);
      for (const r of rondasDe(iso)) {
        const pendientes = r.items.filter((t) => abierta(estado(t)));
        if (!pendientes.length) continue;
        const [h, m] = r.hora.split(":").map(Number);
        const d = new Date(iso + "T00:00:00"); d.setHours(h, m, 0, 0);
        const cuando = d.getTime() - desfase;
        if (cuando <= ahora + 5000) continue;
        const personas = new Set(pendientes.map((t) => t.p.id)).size;
        const nombres = [...new Set(pendientes.map((t) => primerNombre(t.p.nombre)))];
        lista.push({
          id: `${iso} ${r.hora}`,
          at: cuando,
          hora: r.hora,
          title: `Ronda de las ${r.hora}`,
          body: `${plural(personas, "persona")} · ${plural(pendientes.length, "toma")}: ${nombres.join(", ")}`,
        });
        if (lista.length >= 40) return lista;
      }
    }
    return lista;
  },

  async programar(forzar) {
    if (!this.activa || typeof listo === "undefined" || !listo) return;
    let lista;
    try { lista = this.calcular(); } catch (e) { return; }
    const firma = JSON.stringify(lista);
    if (!forzar && firma === this.ultima) return;
    try { await this.plugin.schedule({ alarms: lista }); this.ultima = firma; } catch (e) { console.warn("RondaAlarma", e); }
  },

  parar() { if (this.activa) this.plugin.stop().catch(() => {}); },
};

/* Engancha la alarma nativa con la app web */
(function () {
  if (!window.Capacitor?.isNativePlatform?.()) return;
  // Si la alarma del sistema ya está sonando, la app no suma su propio sonido de ronda
  const playWeb = Sound.play.bind(Sound);
  Sound.play = function (kind) {
    if (kind === "ronda" && Nativa.activa && Alarm.activa && !Alarm.activa.prueba) { this.vibrar(kind); return; }
    return playWeb(kind);
  };
  // Cuando alguien apaga la alarma en la app, se apaga también la del sistema
  const stopWeb = Sound.stop.bind(Sound);
  Sound.stop = function () { stopWeb(); Nativa.parar(); };
  // Recalcular seguido (cada vez que cambia algo, el cálculo da distinto y se reprograma)
  setInterval(() => Nativa.programar(), 15000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") Nativa.programar(true); else setTimeout(() => Nativa.programar(true), 1500); });
  document.addEventListener("click", () => setTimeout(() => Nativa.programar(), 800), true);
  window.addEventListener("load", () => setTimeout(() => Nativa.programar(true), 2500));
  // Pedir permisos la primera vez
  window.addEventListener("load", () => setTimeout(() => { try { Nativa.plugin?.permisos(); } catch (e) {} }, 1500));
})();
