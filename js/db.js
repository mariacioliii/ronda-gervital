/* Ronda · Gervital — almacenamiento local (IndexedDB) */
"use strict";

const DB = (() => {
  const NAME = "gervital-ronda";
  const VER = 1;
  const STORES = ["kv", "staff", "personas", "meds", "registros", "ausencias"];
  let db = null;
  let memoria = false; // si IndexedDB no está disponible, se trabaja en memoria
  const mem = {};

  const prom = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

  function open() {
    return new Promise((res) => {
      try {
        const r = indexedDB.open(NAME, VER);
        r.onupgradeneeded = () => {
          const d = r.result;
          STORES.forEach((s) => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: "id" }); });
        };
        r.onsuccess = () => { db = r.result; res(true); };
        r.onerror = () => { memoria = true; res(false); };
        r.onblocked = () => { memoria = true; res(false); };
      } catch (e) { memoria = true; res(false); }
    });
  }
  const store = (s, mode) => db.transaction(s, mode).objectStore(s);

  async function all(s) {
    if (memoria) return Object.values(mem[s] || {}).map(clone);
    return prom(store(s, "readonly").getAll());
  }
  async function put(s, obj) {
    if (memoria) { (mem[s] = mem[s] || {})[obj.id] = clone(obj); return; }
    return prom(store(s, "readwrite").put(obj));
  }
  async function del(s, id) {
    if (memoria) { if (mem[s]) delete mem[s][id]; return; }
    return prom(store(s, "readwrite").delete(id));
  }
  async function putMany(s, list) {
    if (memoria) { list.forEach((o) => put(s, o)); return; }
    return new Promise((res, rej) => {
      const t = db.transaction(s, "readwrite"); const os = t.objectStore(s);
      list.forEach((o) => os.put(o));
      t.oncomplete = () => res(); t.onerror = () => rej(t.error);
    });
  }
  async function clearAll() {
    if (memoria) { STORES.forEach((s) => (mem[s] = {})); return; }
    await Promise.all(STORES.map((s) => prom(store(s, "readwrite").clear())));
  }
  async function dump() {
    const out = {};
    for (const s of STORES) out[s] = await all(s);
    return out;
  }
  return { open, all, put, del, putMany, clearAll, dump, STORES, get enMemoria() { return memoria; } };
})();
