// Pedidos del dueño del 10 de noviembre de 2026: cumpleaños, varios canales, más de 3 necesidades y sostén sin «Relación».
import { evaluarRegistro } from "../calidad";
import { cumpleEn, cumpleanerosDeHoy } from "../cumpleanos";
import { aplicarAutorizacion } from "../envio";
import { borradorVacio, construirPayload } from "../visita";

jest.mock("expo-secure-store", () => ({}));

describe("cumpleañeros de hoy", () => {
  const hoy = new Date("2026-11-10T15:00:00Z");   // 10 de noviembre en Bogotá
  const personas = [
    { id: "1", nombre_visible: "Ana Cero", estado: "activa", cumple_mes: 11, cumple_dia: 10, tiene_contacto_autorizado: true, edad_anios: 40 },
    { id: "2", nombre_visible: "Beto Uno", estado: "activa", cumple_mes: 11, cumple_dia: 10, tiene_contacto_autorizado: false },
    { id: "3", nombre_visible: "Carla Dos", estado: "no_contactar", cumple_mes: 11, cumple_dia: 10 },
    { id: "4", nombre_visible: "Dora Tres", estado: "activa", cumple_mes: 11, cumple_dia: 11 },
    { id: "5", nombre_visible: "Elsa", estado: "activa" },
  ];
  test("solo quien cumple hoy y no pidió que no lo contacten; primero quien se puede contactar", () => {
    const l = cumpleanerosDeHoy(personas, hoy);
    expect(l.map((c) => c.id)).toEqual(["1", "2"]);
    expect(l[0].contactable).toBe(true);
    expect(l[1].contactable).toBe(false);
  });
  test("la fecha es la de Colombia (a las 9 p. m. de Bogotá todavía es el mismo día)", () => {
    expect(cumpleanerosDeHoy(personas, new Date("2026-11-11T02:00:00Z")).map((c) => c.id)).toEqual(["1", "2"]);
  });
  test("quien cumple el 29 de febrero celebra el 28 en los años no bisiestos", () => {
    expect(cumpleEn(2, 29, { anio: 2027, mes: 2, dia: 28 })).toBe(true);
    expect(cumpleEn(2, 29, { anio: 2028, mes: 2, dia: 28 })).toBe(false);
    expect(cumpleEn(2, 29, { anio: 2028, mes: 2, dia: 29 })).toBe(true);
  });
});

describe("visita", () => {
  function base() {
    const b = borradorVacio("u1", { lat: 4.33, lng: -75.7, precision_m: 8 });
    b.visita = { ...b.visita, resultado: "conversacion_completa", autorizacion_verbal: true };
    b.personas = [{ id: "p1", primer_nombre: "Ana", primer_apellido: "Cero", mayor_edad_confirmada: true, interes_info: true,
      canales_preferidos: ["whatsapp", "llamada", "correo"], canal_preferido: "whatsapp", cumple_mes: 5, cumple_dia: 3 }];
    return b;
  }
  test("una autorización de contacto por cada canal elegido", () => {
    const b = aplicarAutorizacion(base(), { metodo: "verbal", registro: true, datos: true, contacto: true, simpatia: false, historia: false, firma: null, noVolver: false }, "v1");
    expect(b.consentimientos.map((c) => c.proposito).filter((p) => p.startsWith("contacto_")).sort()).toEqual(["contacto_correo", "contacto_llamada", "contacto_whatsapp"]);
  });
  test("el cumpleaños y los canales viajan al servidor", () => {
    const { payload } = construirPayload(base());
    const p = (payload.personas as Record<string, unknown>[])[0];
    expect(p.cumple_mes).toBe(5);
    expect(p.cumple_dia).toBe(3);
    expect(p.canales_preferidos).toEqual(["whatsapp", "llamada", "correo"]);
  });
  test("más de 3 necesidades: las vacías no viajan y la prioridad no pasa de 3", () => {
    const b = base();
    b.necesidades = [1, 2, 3, 4, 5].map((i) => ({ id: `n${i}`, tema: i === 5 ? undefined : "vias_movilidad", prioridad: i, alcance: "hogar" }));
    const { payload } = construirPayload(b);
    const n = payload.necesidades as { prioridad: number }[];
    expect(n.length).toBe(4);
    expect(n.map((x) => x.prioridad)).toEqual([1, 2, 3, 3]);
  });
  test("el sostén sin «Relación»: basta su ocupación o que sea una de las personas", () => {
    const b = base();
    b.hogar = { id: "h1", total_personas: 1, edades: { "25-34": 1 }, sosten_ocupacion: "contratista_estado" };
    expect(evaluarRegistro(b).motivos.join(" ")).not.toMatch(/sostén/i);
    b.hogar = { id: "h1", total_personas: 1, edades: { "25-34": 1 } };
    b.personas[0].es_sosten = true;
    expect(evaluarRegistro(b).motivos.join(" ")).not.toMatch(/sostén/i);
  });
});
