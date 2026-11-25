// Copia la app simple (../simple) a www/ y le suma el puente con la alarma nativa de Android.
import { cpSync, rmSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const www = join(raiz, "www");
rmSync(www, { recursive: true, force: true });
cpSync(join(raiz, "..", "simple"), www, { recursive: true });
rmSync(join(www, "sw.js"), { force: true }); // dentro de la app no hace falta service worker
copyFileSync(join(raiz, "web-extra", "nativo.js"), join(www, "js", "nativo.js"));

const idx = join(www, "index.html");
let html = readFileSync(idx, "utf8");
const marca = '<script src="js/app.js"></script>';
if (!html.includes(marca)) throw new Error("No encontré app.js en index.html");
html = html.replace(marca, '<script>window.RONDA_SINGLE = true; window.RONDA_NATIVA = true;</script>\n<script src="js/nativo.js"></script>\n' + marca);
writeFileSync(idx, html);
console.log("www listo");
