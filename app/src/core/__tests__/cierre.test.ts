// Pruebas del cierre de la Fase 1: guion de visita y preguntas frecuentes (13.3) y métricas del piloto (22.3).
import { AlmacenMemoria } from "../../datos/almacen-memoria";
import { anotarMetrica, enviarMetricas } from "../../servicios/metricas";
import { bloques, filtrarPreguntas, GUION_LOCAL, PREGUNTAS_LOCAL, preguntas, textoCampo, VERSION_CAMPO_LOCAL } from "../guion";
import { agregar, colaAtrasada, metricaValida, metricasGps, nuevaMetrica, segundosRegistro, tipoRegistro, type Metrica } from "../metricas";

jest.mock("expo-secure-store", () => ({}));

describe("guion de visita y preguntas frecuentes (13.3)", () => {
  test("sin copia local se usa el borrador de la app", () => {
    const g = textoCampo([], "guion_visita");
    expect(g).toEqual({ version: VERSION_CAMPO_LOCAL, contenido: GUION_LOCAL, borrador: true });
    expect(textoCampo([], "preguntas_frecuentes").contenido).toBe(PREGUNTAS_LOCAL);
  });

  test("se usa la versión vigente más reciente que publicó el Administrador", () => {
    const filas = [
      { tipo: "guion_visita", version: "v1", contenido: "## Viejo\nTexto viejo", vigente: false, es_borrador: true, creado_en: "2026-11-01" },
      { tipo: "guion_visita", version: "v2", contenido: "## Nuevo\nTexto nuevo", vigente: true, es_borrador: false, creado_en: "2026-12-01" },
      { tipo: "autorizacion", version: "v9", contenido: "otro texto", vigente: true, es_borrador: false, creado_en: "2026-12-02" },
    ];
    expect(textoCampo(filas, "guion_visita")).toEqual({ version: "v2", contenido: "## Nuevo\nTexto nuevo", borrador: false });
  });

  test("el texto se parte en títulos, puntos y párrafos, sin la nota de borrador", () => {
    const b = bloques("## Saludo\r\n«Buenos días»\n- Muestre el carnet\n\nBORRADOR: falta la revisión del abogado.");
    expect(b).toEqual([
      { tipo: "titulo", texto: "Saludo" },
      { tipo: "parrafo", texto: "«Buenos días»" },
      { tipo: "punto", texto: "Muestre el carnet" },
    ]);
  });

  test("las preguntas frecuentes se leen y se buscan sin tildes", () => {
    const lista = preguntas(PREGUNTAS_LOCAL);
    expect(lista.length).toBeGreaterThanOrEqual(8);
    expect(lista.every((p) => p.pregunta && p.respuesta)).toBe(true);
    expect(filtrarPreguntas(lista, "DONDE VOTO").map((p) => p.pregunta)).toEqual(["¿Dónde voto?"]);
    expect(filtrarPreguntas(lista, "")).toHaveLength(lista.length);
  });

  test("el guion de la app recuerda lo que no se puede hacer en la puerta", () => {
    const t = GUION_LOCAL.toLowerCase();
    expect(t).toContain("no prometa");
    expect(t).toContain("dinero");
    expect(t).toContain("menor de edad");
    expect(t).toContain("no pida el voto");
  });
});

describe("métricas del piloto sin datos personales (22.3)", () => {
  const ahora = new Date("2027-02-03T15:00:00Z");

  test("solo se aceptan tipos y categorías de la lista cerrada", () => {
    expect(nuevaMetrica("registro_segundos", "0.15.0", 74.36, "con_contacto", ahora))
      .toEqual({ tipo: "registro_segundos", valor: 74.4, detalle: "con_contacto", ocurrido_en: "2027-02-03T15:00:00.000Z", version_app: "0.15.0" });
    expect(nuevaMetrica("gps_error", "0.15.0", null, "Rosa Pérez 3001234567")).toBeNull();
    expect(nuevaMetrica("gps_precision", "0.15.0", -3)).toBeNull();
    expect(metricaValida({ tipo: "nombre" as never, valor: 1, detalle: null, ocurrido_en: ahora.toISOString(), version_app: "x" })).toBe(false);
  });

  test("la cola local tiene un máximo y descarta las más viejas", () => {
    let cola: Metrica[] = [];
    for (let i = 0; i < 7; i++) cola = agregar(cola, nuevaMetrica("gps_precision", "0.15.0", i), 5);
    expect(cola.map((m) => m.valor)).toEqual([2, 3, 4, 5, 6]);
    expect(agregar(cola, null, 5)).toHaveLength(5);
  });

  test("tiempo y tipo de registro", () => {
    expect(segundosRegistro("2027-02-03T14:58:30Z", ahora)).toBe(90);
    expect(segundosRegistro("2027-02-02T14:00:00Z", ahora)).toBeNull();   // borrador retomado al otro día
    expect(tipoRegistro("nadie_en_casa", true, false)).toBe("solo_punto");
    expect(tipoRegistro("conversacion", false, false)).toBe("con_contacto");
    expect(tipoRegistro("conversacion", false, true)).toBe("seguimiento");
  });

  test("métricas del GPS sin coordenadas", () => {
    expect(metricasGps(null, false)).toEqual([{ tipo: "gps_error", detalle: "sin_lectura" }]);
    const m = metricasGps({ precision_m: 35, simulada: true }, false);
    expect(m).toEqual([{ tipo: "gps_precision", valor: 35 }, { tipo: "gps_error", detalle: "baja_precision" }, { tipo: "gps_error", detalle: "simulada" }]);
    expect(JSON.stringify(m)).not.toMatch(/lat|lng/);
  });

  test("cola atrasada más de 24 horas (17.3)", () => {
    expect(colaAtrasada(null, ahora)).toBe(false);
    expect(colaAtrasada("2027-02-02T14:00:00Z", ahora)).toBe(true);
    expect(colaAtrasada("2027-02-03T10:00:00Z", ahora)).toBe(false);
  });

  test("solo se borra del teléfono lo que el servidor recibió", async () => {
    const a = new AlmacenMemoria();
    await anotarMetrica(a, "0.15.0", "registro_calidad", null, "verde");
    await anotarMetrica(a, "0.15.0", "registro_sin_senal");
    await expect(enviarMetricas(a, async () => { throw new Error("sin señal"); })).rejects.toThrow("sin señal");
    expect(await a.getMeta<Metrica[]>("metricas_piloto")).toHaveLength(2);
    const recibidas: Metrica[] = [];
    expect(await enviarMetricas(a, async (lote) => { recibidas.push(...lote); })).toBe(2);
    expect(recibidas.map((m) => m.tipo)).toEqual(["registro_calidad", "registro_sin_senal"]);
    expect(await a.getMeta<Metrica[]>("metricas_piloto")).toEqual([]);
  });
});
