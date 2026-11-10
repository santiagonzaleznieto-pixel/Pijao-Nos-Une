// Regresión de noviembre de 2026: las visitas con personas se rechazaban en el servidor (R-15) porque el paso 10 perdía
// las autorizaciones, y la fecha de nacimiento viajaba como día/mes/año (el servidor la lee como mes/día).
import * as fs from "fs";
import { AlmacenMemoria } from "../../datos/almacen-memoria";
import { guardarVisita, reabrirRechazada } from "../../servicios/campo";
import { aplicarAutorizacion, borradorDesdeRechazo, problemasDeEnvio, type Autorizacion } from "../envio";
import { borradorVacio, construirPayload, type Borrador } from "../visita";

jest.mock("expo-secure-store", () => ({}));

const ahora = new Date("2026-11-10T17:00:00Z");
const autVerbal: Autorizacion = { metodo: "verbal", registro: true, datos: true, contacto: true, simpatia: false, historia: false, firma: null, noVolver: false };

/** Una visita completa como la deja el asistente al llegar al paso 10. */
function visitaCompleta(): Borrador {
  const b = borradorVacio("u1", { lat: 4.3335, lng: -75.7045, precision_m: 8, altitud_m: 1600 });
  b.dispositivo = { lat: 4.3335, lng: -75.7045, precision_m: 8, ubicacion_simulada: false };
  b.vivienda = { ...b.vivienda, zona_urbana_rural: "urbana", barrio_vereda: "Centro", direccion: "Calle 5 # 4-20", tipo_vivienda: "casa",
    estado_ocupacion: "habitada", tenencia: "propia", servicios: ["agua", "energia"], via_acceso: "pavimentada", riesgos: [], actividad_economica: "ninguna" };
  b.visita = { ...b.visita, resultado: "conversacion_completa", autorizacion_verbal: true, notas: "Conversación amable", volante_entregado: true };
  b.hogar = { id: "11111111-1111-4111-8111-111111111111", total_personas: 3, edades: { "25-34": 2, "6-12": 1 }, mujeres: 2, hombres: 1,
    votantes_pijao_est: 2, sosten_relacion: "jefe", sosten_sexo: "mujer", sosten_ocupacion: "comerciante", sosten_situacion_laboral: "independiente",
    otros_hogares: false, familiares_fuera: { texto: "1 en Armenia" }, mascotas: { texto: "un perro" } };
  b.personas = [{ id: "22222222-2222-4222-8222-222222222222", primer_nombre: "Luz", primer_apellido: "Ríos", tipo_documento: "CC", cedula: "41900123",
    fecha_nacimiento: "25/12/1990", sexo: "mujer", ocupacion: "comerciante", telefono: "3001234567", telefono_es_whatsapp: true,
    vota_en_pijao: "si", anios_en_pijao: "5_mas", interes_info: true, canal_preferido: "whatsapp", voluntario: "tal_vez", anfitrion: false,
    temas_interes: ["vias_movilidad"], es_sosten: true }];
  b.necesidades = [{ id: "33333333-3333-4333-8333-333333333333", tema: "vias_movilidad", prioridad: 1, texto: "Arreglar la vía", alcance: "colectiva", desea_respuesta: true }];
  b.paso = 10;
  return b;
}

describe("autorizaciones del paso 10", () => {
  test("se crean para la vivienda y para cada persona", () => {
    const b = aplicarAutorizacion(visitaCompleta(), autVerbal, "v1-borrador", ahora);
    const propositos = b.consentimientos.map((c) => `${c.proposito}:${c.persona_id ?? "-"}`).sort();
    expect(propositos).toEqual(["contacto_whatsapp:22222222-2222-4222-8222-222222222222", "datos_personales:22222222-2222-4222-8222-222222222222", "registro_vivienda:-"]);
    expect(b.consentimientos.every((c) => (c.evidencia as { verbal?: boolean }).verbal === true)).toBe(true);
  });
  test("«no volver» cambia el resultado y la simpatía sin autorización no viaja", () => {
    const base = visitaCompleta();
    base.personas[0].simpatia = "apoya";
    const b = aplicarAutorizacion(base, { ...autVerbal, noVolver: true }, "v1-borrador", ahora);
    expect(b.visita.resultado).toBe("pidio_no_ser_visitado");
    expect(b.personas[0].simpatia).toBeNull();
  });
  test("cambiar de paso después de autorizar conserva las autorizaciones (el error de la 0.16)", () => {
    const antes = visitaCompleta();
    const actual = aplicarAutorizacion(antes, autVerbal, "v1-borrador", ahora);
    const siguiente = { ...actual, paso: 11 };          // así avanza ahora la pantalla
    expect(siguiente.consentimientos.length).toBe(3);
    const comoAntes = { ...antes, paso: 11 };            // así avanzaba: con la copia vieja
    expect(comoAntes.consentimientos.length).toBe(0);
  });
});

describe("revisión antes de guardar (reglas del servidor)", () => {
  test("una visita completa y autorizada no tiene problemas", () => {
    expect(problemasDeEnvio(aplicarAutorizacion(visitaCompleta(), autVerbal, "v1-borrador", ahora), { ahora })).toEqual([]);
  });
  test("sin autorización de datos personales no se deja guardar (R-15)", () => {
    expect(problemasDeEnvio(visitaCompleta(), { ahora }).join(" ")).toMatch(/autorización de datos personales de Luz/);
  });
  test("rangos de edad, menores, cédula y firma", () => {
    const b = aplicarAutorizacion(visitaCompleta(), { ...autVerbal, metodo: "firma_pantalla", firma: null }, "v1-borrador", ahora);
    b.hogar = { ...b.hogar!, edades: { "25-34": 1 } };
    b.personas = [{ ...b.personas[0], fecha_nacimiento: "01/01/2015", cedula: "123" }];
    const p = problemasDeEnvio(b, { ahora }).join(" ");
    expect(p).toMatch(/suman 1 y el hogar tiene 3/);
    expect(p).toMatch(/menor de 18/);
    expect(p).toMatch(/entre 6 y 10 dígitos/);
    expect(p).toMatch(/firma en pantalla/);
  });
  test("una fecha mal escrita se detecta", () => {
    const b = aplicarAutorizacion(visitaCompleta(), autVerbal, "v1-borrador", ahora);
    b.personas = [{ ...b.personas[0], fecha_nacimiento: "31/02/1990" }];
    expect(problemasDeEnvio(b, { ahora }).join(" ")).toMatch(/día\/mes\/año/);
  });
});

describe("lo que viaja al servidor", () => {
  test("la fecha de nacimiento va como AAAA-MM-DD", () => {
    const { payload } = construirPayload(aplicarAutorizacion(visitaCompleta(), autVerbal, "v1-borrador", ahora));
    const persona = (payload.personas as Record<string, unknown>[])[0];
    expect(persona.fecha_nacimiento).toBe("1990-12-25");
    // Se guarda una copia para probarla contra el servidor real (dentro de una transacción que se deshace).
    if (process.env.PAYLOAD_SALIDA) fs.writeFileSync(process.env.PAYLOAD_SALIDA, JSON.stringify(payload));
  });
});

describe("visitas rechazadas: corregir y enviar de nuevo", () => {
  test("se reabren como borrador con sus datos y fotos, y el envío rechazado sale de la cola", async () => {
    const almacen = new AlmacenMemoria();
    const b = visitaCompleta();
    b.fotos = [{ id: "44444444-4444-4444-8444-444444444444", tipo: "fachada", archivo_local: "file:///fachada.jpg", tam_bytes: 1000, con_personas: false }];
    await guardarVisita(almacen, b);                                      // como en la 0.16: sin autorizaciones
    await almacen.marcarItem(b.id, { estado: "cuarentena", error: "R-15: falta la autorización de datos personales de Luz" });
    const nuevo = await reabrirRechazada(almacen, b.id);
    expect(nuevo).not.toBeNull();
    expect(await almacen.obtenerItem(b.id)).toBeNull();
    expect(await almacen.subidasDe(b.id)).toEqual([]);
    const reabierto = (await almacen.obtener("borradores", nuevo!)) as unknown as Borrador;
    expect(reabierto.paso).toBe(10);
    expect(reabierto.id).not.toBe(b.id);
    expect(reabierto.vivienda.id).toBe(b.vivienda.id);
    expect(reabierto.personas[0].primer_nombre).toBe("Luz");
    expect(reabierto.fotos[0].archivo_local).toBe("file:///fachada.jpg");
    // Corregido y guardado, vuelve a la cola con sus autorizaciones y su foto.
    const corregido = aplicarAutorizacion(reabierto, autVerbal, "v1-borrador", ahora);
    expect(problemasDeEnvio(corregido, { ahora })).toEqual([]);
    await guardarVisita(almacen, corregido);
    const item = await almacen.obtenerItem(corregido.id);
    expect(item?.estado).toBe("pendiente");
    expect(((item?.payload as { consentimientos: unknown[] }).consentimientos).length).toBe(3);
    expect((await almacen.subidasDe(corregido.id)).map((s) => s.id)).toEqual(["44444444-4444-4444-8444-444444444444"]);
  });
  test("solo se reabren visitas en cuarentena", async () => {
    const almacen = new AlmacenMemoria();
    const b = visitaCompleta();
    await guardarVisita(almacen, b);
    expect(await reabrirRechazada(almacen, b.id)).toBeNull();
    expect(await almacen.obtenerItem(b.id)).not.toBeNull();
  });
  test("una visita nueva a una casa sin enviar espera a la que la crea, también si esa se corrige", async () => {
    const almacen = new AlmacenMemoria();
    const primera = visitaCompleta();
    await guardarVisita(almacen, primera);
    const segunda = borradorVacio("u1", { existente: { id: primera.vivienda.id } });
    segunda.visita = { ...segunda.visita, resultado: "nadie_en_casa" };
    await guardarVisita(almacen, segunda);
    expect((await almacen.obtenerItem(segunda.id))?.depende_de).toBe(primera.id);
    await almacen.marcarItem(primera.id, { estado: "cuarentena", error: "R-15" });
    const nuevo = await reabrirRechazada(almacen, primera.id);
    expect((await almacen.obtenerItem(segunda.id))?.depende_de).toBe(nuevo);
  });
  test("el borrador reabierto conserva la vivienda existente", () => {
    const b = borradorDesdeRechazo({ vivienda: { id: "v9", solo_visita: true }, visita: { id: "x", resultado: "nadie_en_casa" } }, "u1", []);
    expect(b.vivienda_existente).toBe(true);
    expect(b.visita.resultado).toBe("nadie_en_casa");
  });
});
