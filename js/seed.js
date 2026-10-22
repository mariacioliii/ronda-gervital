/* Ronda · Gervital — datos de ejemplo para presentar y probar */
"use strict";

async function cargarEjemplo(adminId) {
  const hoy = today();
  const inicio = addDays(hoy, -14);
  const equipo = [
    { id: "u-lucia", nombre: "Lucía Gómez", rol: "Enfermería", pin: "1234", admin: false },
    { id: "u-martin", nombre: "Martín Acosta", rol: "Cuidado", pin: "2580", admin: false },
    { id: "u-sofia", nombre: "Sofía Núñez", rol: "Psicomotricidad", pin: "1111", admin: false, activo: false },
  ];
  for (const e of equipo) {
    const salt = uid();
    saveStaff({ id: e.id, nombre: e.nombre, rol: e.rol, admin: e.admin, activo: e.activo !== false, salt, pin: await hashPin(e.pin, salt), cambiarPin: false, creado: Date.now(), ejemplo: e.pin });
  }

  const P = [
    ["p-elena", "Elena Rodríguez", [1, 3, 5], "Prefiere que le cuenten para qué es cada pastilla. Toma con jugo.", "Penicilina", "Laura (hija)", "099 123 456",
      [["Losartán", "50 mg", "Con el desayuno", ["09:00"]], ["Metformina", "850 mg", "Con comida", ["09:00", "13:00"]]]],
    ["p-julio", "Julio Martínez", [1, 2, 3, 4, 5], "Usa audífono del lado derecho. Hablarle de frente.", "", "Andrea (sobrina)", "098 456 112",
      [["Levotiroxina", "75 mcg", "Media hora antes de comer", ["09:00"]], ["Donepecilo", "10 mg", "", ["13:00"]]]],
    ["p-marta", "Marta Silva", [1, 3, 5], "Le cuesta tragar comprimidos grandes: se pueden partir.", "", "Jorge (hijo)", "094 778 003",
      [["Atorvastatina", "20 mg", "", ["13:00"]], ["Calcio + vitamina D", "600 mg", "Con el almuerzo", ["13:00"]]]],
    ["p-raul", "Raúl Fernández", [1, 2, 4], "Controlar presión los lunes.", "Ibuprofeno", "Mónica (esposa)", "099 650 221",
      [["Enalapril", "10 mg", "", ["09:00", "16:00"]], ["Aspirina", "100 mg", "Con el almuerzo", ["13:00"]]]],
    ["p-nelly", "Nelly Pereira", [2, 4], "Viene martes y jueves.", "", "Gustavo (hijo)", "091 334 908",
      [["Omeprazol", "20 mg", "Antes del desayuno", ["09:00"]], ["Quetiapina", "25 mg", "", ["16:00"]]]],
    ["p-hector", "Héctor González", [1, 2, 3, 4, 5], "Le gusta tomar la medicación en el patio.", "", "Silvia (hija)", "099 870 554",
      [["Furosemida", "40 mg", "Por la mañana", ["09:00"]], ["Memantina", "10 mg", "", ["09:00", "16:00"]]]],
    ["p-blanca", "Blanca Sosa", [1, 3, 5], "Dolor de rodilla: avisar si refiere más dolor.", "", "Pablo (hijo)", "092 101 776",
      [["Sertralina", "50 mg", "Con el desayuno", ["09:00"]], ["Paracetamol", "1 g", "", ["15:00"]]]],
    ["p-carlos", "Carlos Ramos", [1, 2, 3, 4, 5], "", "", "Ana (esposa)", "098 222 310",
      [["Amlodipina", "5 mg", "", ["09:00"]], ["Metformina", "500 mg", "Con el almuerzo", ["13:00"]]]],
    ["p-rosa", "Rosa Díaz", [2, 4], "Dejó de venir en setiembre.", "", "Mario (hijo)", "099 404 404",
      [["Enalapril", "5 mg", "", ["09:00"]]], false],
  ];
  for (const [id, nombre, dias, notas, alergias, contacto, tel, meds, activo] of P) {
    savePersona({ id, nombre, dias, notas, alergias, contacto, tel, activo: activo !== false, creado: Date.now() });
    meds.forEach(([n, dosis, indic, horas], i) => saveMed({ id: `${id}-m${i}`, pid: id, nombre: n, dosis, indicacion: indic, horas, activo: true, creado: Date.now() }));
  }

  // Historial de las últimas dos semanas
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const quienes = ["u-lucia", "u-lucia", "u-lucia", "u-martin", adminId];
  const regs = [];
  for (let d = inicio; d < hoy; d = addDays(d, 1)) {
    const wd = weekday(d);
    if (wd === 0 || wd === 6) continue;
    const faltan = new Set();
    if (rnd() < 0.5) { const act = S.personas.filter((p) => asisteEl(p, d)); const p = act[Math.floor(rnd() * act.length)]; if (p) { faltan.add(p.id); const a = { id: `${d}|${p.id}`, fecha: d, pid: p.id, motivo: "Avisó la familia", por: "u-lucia", ts: dateFromISO(d).getTime() }; S.aus.set(a.id, a); } }
    for (const t of tomasDe(d)) {
      if (faltan.has(t.p.id)) continue;
      const x = rnd();
      if (x < 0.035) continue; // quedó sin registrar
      const por = quienes[Math.floor(rnd() * quienes.length)];
      const real = hm(mins(t.hora) + Math.floor(rnd() * 14));
      const base = { id: t.id, fecha: d, pid: t.p.id, medId: t.m.id, hora: t.hora, pNombre: t.p.nombre, medNombre: t.m.nombre, medDosis: t.m.dosis, por };
      const ts = new Date(`${d}T${real}:00`).getTime();
      if (x < 0.075) regs.push({ ...base, estado: "nodada", motivo: MOTIVOS[Math.floor(rnd() * 3)], horaReal: real, ts });
      else regs.push({ ...base, estado: "dada", horaReal: real, ts });
    }
  }
  regs.forEach((r) => S.reg.set(r.id, r));
  await DB.putMany("registros", regs);
  await DB.putMany("ausencias", [...S.aus.values()]);
  saveCfg({ responsableHabitual: "u-lucia", inicio });
}
