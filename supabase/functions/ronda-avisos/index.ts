// Ronda · Gervital — envía la alarma de cada ronda a los celulares, aunque la app esté cerrada.
// La llama pg_cron cada minuto (con el encabezado x-ronda-cron) y la app para "Probar aviso".
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const TZ = "America/Montevideo";
const VENTANA = 10; // minutos: si el cron se atrasa, el aviso igual sale dentro de este margen
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

let privado: Record<string, string> | null = null;
async function cfgPrivada() {
  if (!privado) {
    const { data, error } = await sb.from("privado").select("k,v");
    if (error) throw error;
    privado = Object.fromEntries(data.map((r) => [r.k, r.v]));
    webpush.setVapidDetails("mailto:avisos@gervital.uy", privado.vapid_pub, privado.vapid_priv);
  }
  return privado;
}

function ahora() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { iso: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute, wd };
}
const mins = (h: string) => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };
const primer = (n: string) => (n || "").trim().split(/\s+/)[0];
const plural = (n: number, s: string, p = s + "s") => `${n} ${n === 1 ? s : p}`;

async function enviar(centro: string, payload: Record<string, unknown>) {
  const { data: subs } = await sb.from("avisos_sub").select("endpoint,sub").eq("centro", centro);
  let ok = 0;
  for (const s of subs || []) {
    try { await webpush.sendNotification(s.sub, JSON.stringify(payload), { TTL: 1800, urgency: "high" }); ok++; }
    catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from("avisos_sub").delete().eq("endpoint", s.endpoint);
      else console.error("push", code, (e as Error).message);
    }
  }
  return ok;
}
async function unaVez(centro: string, clave: string) {
  const { error } = await sb.from("avisos_enviados").insert({ centro, clave });
  return !error;
}

async function revisarCentro(centro: string, t: ReturnType<typeof ahora>) {
  const { data: docs, error } = await sb.from("docs").select("tienda,id,data").eq("centro", centro).eq("borrado", false).in("tienda", ["personas", "meds", "ausencias", "kv"]);
  if (error) throw error;
  const { data: regs } = await sb.from("docs").select("id,data").eq("centro", centro).eq("tienda", "registros").eq("borrado", false).like("id", `${t.iso}|%`);
  const cfg = docs.find((d) => d.tienda === "kv" && d.id === "cfg")?.data || {};
  const margen = cfg.margen || 30;
  const aus = new Set(docs.filter((d) => d.tienda === "ausencias").map((d) => d.id));
  const personas = new Map(docs.filter((d) => d.tienda === "personas").map((d) => [d.id, d.data]).filter(([, p]) =>
    p.activo !== false && (p.dias || []).includes(t.wd) && !(p.desde && t.iso < p.desde) && !aus.has(`${t.iso}|${p.id}`)));
  const reg = new Map((regs || []).map((r) => [r.id, r.data]));
  const rondas = new Map<string, { id: string; quien: string }[]>();
  for (const d of docs) {
    if (d.tienda !== "meds") continue;
    const m = d.data, p = personas.get(m.pid);
    if (!p || m.activo === false || (m.dias?.length && !m.dias.includes(t.wd)) || (m.desde && t.iso < m.desde)) continue;
    for (const h of m.horas || []) { if (!rondas.has(h)) rondas.set(h, []); rondas.get(h)!.push({ id: `${t.iso}|${m.id}|${h}`, quien: primer(p.nombre) }); }
  }
  let enviados = 0;
  for (const [hora, tomas] of rondas) {
    const t0 = mins(hora);
    const quienes = [...new Set(tomas.map((x) => x.quien))];
    if (t.min >= t0 && t.min < t0 + VENTANA && await unaVez(centro, `${t.iso}|${hora}|ronda`)) {
      enviados += await enviar(centro, { titulo: `Ronda de las ${hora}`, cuerpo: `${plural(quienes.length, "persona")}: ${quienes.join(", ")}`, tag: `ronda-${hora}` });
    }
    const faltan = tomas.filter((x) => !["dada", "nodada"].includes(reg.get(x.id)?.estado));
    if (faltan.length && t.min >= t0 + margen && t.min < t0 + margen + VENTANA && await unaVez(centro, `${t.iso}|${hora}|atraso`)) {
      enviados += await enviar(centro, { titulo: `Quedan tomas sin dar`, cuerpo: `${plural(faltan.length, "toma")} de la ronda de las ${hora}: ${[...new Set(faltan.map((x) => x.quien))].join(", ")}`, tag: `atraso-${hora}` });
    }
  }
  // Tomas que se dejaron "para más tarde"
  for (const [id, r] of reg) {
    if (r.estado !== "pospuesta" || !r.posp) continue;
    const t0 = mins(r.posp);
    if (t.min >= t0 && t.min < t0 + VENTANA && await unaVez(centro, `${id}|posp|${r.posp}`)) {
      enviados += await enviar(centro, { titulo: `Toma para dar ahora`, cuerpo: `${r.medNombre || "Medicación"} de ${primer(r.pNombre || "")} (la dejaron para las ${r.posp})`, tag: `posp-${id}` });
    }
  }
  return enviados;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const priv = await cfgPrivada();
    const body = await req.json().catch(() => ({}));

    // Prueba pedida desde la app: llega a los celulares del centro después de unos segundos
    if (body.prueba) {
      const { data: centro } = await sb.rpc("ronda_centro", { p_clave: String(body.clave || "") });
      if (!centro) return json({ error: "centro" }, 403);
      await new Promise((r) => setTimeout(r, Math.min(Number(body.espera) || 0, 20) * 1000));
      const n = await enviar(centro, { titulo: "Prueba de alarma", cuerpo: "Así te va a llegar el aviso de cada ronda, aunque la app esté cerrada.", tag: "prueba" });
      return json({ enviados: n });
    }

    if (req.headers.get("x-ronda-cron") !== priv.cron) return json({ error: "no autorizado" }, 401);
    const t = ahora();
    const { data: subs } = await sb.from("avisos_sub").select("centro");
    const centros = [...new Set((subs || []).map((s) => s.centro))];
    let enviados = 0;
    for (const c of centros) enviados += await revisarCentro(c, t);
    if (t.min === 3 * 60) await sb.from("avisos_enviados").delete().lt("enviado", new Date(Date.now() - 3 * 86400000).toISOString());
    return json({ hora: t, centros: centros.length, enviados });
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
