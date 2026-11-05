// Pruebas de las reglas de negocio. Son la especificación: traducen y amplían tests/test_core.py de la app en Python.
import { randomUUID } from "node:crypto";
import { claves, etiqueta } from "../catalogos";
import { evaluarRegistro, ritmoSospechoso, saltoImposible } from "../calidad";
import { evidenciaPara, nuevoConsentimiento, textoPara } from "../consentimiento";
import { aprobado, PREGUNTAS, puntaje } from "../curso";
import { mascaraCedula, mascaraCorreo, mascaraTelefono, nombreCompleto, vistaParaPantalla } from "../enmascarado";
import { panelCampana, panelPersonal, umbral } from "../estadisticas";
import { haversineM, puntoEnPoligono, zonaDePunto, type Geometria } from "../geo";
import { configurarGeneradorId } from "../ids";
import { diasPara, Perfil, perfilDesdeRpc, PLANTILLAS } from "../permisos";
import * as R from "../reglas";
import * as V from "../validadores";
import { borradorVacio, construirPayload, rutaFoto } from "../visita";

configurarGeneradorId(randomUUID);

describe("catálogos", () => {
  test("C-11 tiene los 9 rangos de edad", () => expect(claves("C-11")).toHaveLength(9));
  test("etiqueta conocida y desconocida", () => {
    expect(etiqueta("C-02", "nadie_en_casa")).toBe("Nadie en casa");
    expect(etiqueta("C-02", "xyz", "—")).toBe("—");
  });
});

describe("reglas de ubicación (R-08 a R-12)", () => {
  test("R-09: 50 m o menos", () => {
    expect(R.puedeRegistrarAqui(50)).toBe(true);
    expect(R.puedeRegistrarAqui(50.1)).toBe(false);
  });
  test("R-10: precisión de 20 m o menos", () => {
    expect(R.gpsAceptable(20)).toBe(true);
    expect(R.gpsAceptable(21)).toBe(false);
    expect(R.gpsAceptable(null)).toBe(false);
  });
  test("R-12: manual hasta 100 m; más lejos, diferido", () => {
    expect(R.clasificarUbicacionManual(100)).toBe("ok");
    expect(R.clasificarUbicacionManual(101)).toBe("diferido");
  });
  test("los parámetros del servidor reemplazan los iniciales (24.2)", () => {
    expect(R.puedeRegistrarAqui(70, { distancia_max_registro_m: 80 })).toBe(true);
  });
  test("Pijao está dentro del municipio y Bogotá no", () => {
    expect(R.dentroDelMunicipio(4.3335, -75.7045)).toBe(true);
    expect(R.dentroDelMunicipio(4.711, -74.0721)).toBe(false);
  });
});

describe("edición, plazos y horarios", () => {
  test("R-22: ventana de 72 horas", () => {
    const ahora = new Date("2026-11-10T12:00:00Z");
    expect(R.ventanaEdicionAbierta("2026-11-07T12:00:00Z", ahora)).toBe(true);
    expect(R.ventanaEdicionAbierta("2026-11-07T11:59:00Z", ahora)).toBe(false);
  });
  test("16.5: 5 días hábiles saltan el fin de semana", () => {
    expect(R.plazoTitulares("2026-11-06T10:00:00Z")?.toISOString().slice(0, 10)).toBe("2026-11-13");
  });
  test("R-35: mensajes de 8 a. m. a 8 p. m.", () => {
    expect(R.dentroDeHorarioMensajes(8)).toBe(true);
    expect(R.dentroDeHorarioMensajes(20)).toBe(false);
  });
  test("hora de Bogotá es UTC−5", () => expect(R.horaBogota(new Date("2026-11-05T02:00:00Z"))).toBe(21));
  test("R-39: umbral del tope", () => {
    expect(R.alertaTope(69)).toBeNull();
    expect(R.alertaTope(96)).toBe(95);
  });
});

describe("validadores", () => {
  test("celular colombiano", () => {
    expect(V.normalizarCelular("+57 300 123 4567")).toBe("3001234567");
    expect(V.normalizarCelular("6012345678")).toBeNull();
    expect(V.normalizarTelefono("6012345678")).toBe("6012345678");
  });
  test("R-17: cédula de 6 a 10 dígitos, sin números repetidos", () => {
    expect(V.validarCedula("12345678").ok).toBe(true);
    expect(V.validarCedula("12345").ok).toBe(false);
    expect(V.validarCedula("1111111").ok).toBe(false);
    expect(V.validarCedula("12a45678").ok).toBe(false);
  });
  test("R-16: mayor de 18 y no más de 110", () => {
    const hoy = new Date("2026-11-05T00:00:00Z");
    expect(V.validarFechaNacimiento("05/11/2008", hoy).ok).toBe(true);
    expect(V.validarFechaNacimiento("06/11/2008", hoy).ok).toBe(false);
    expect(V.validarFechaNacimiento("1900-01-01", hoy).ok).toBe(false);
    expect(V.validarFechaNacimiento("31/02/1990", hoy).ok).toBe(false);
  });
  test("paso 5: los rangos suman el total", () => {
    expect(V.validarEdades(3, { "0-5": 1, "25-34": 2 }).ok).toBe(true);
    expect(V.validarEdades(3, { "25-34": 2 }).ok).toBe(false);
    expect(V.validarEdades(1, { "99-100": 1 }).ok).toBe(false);
    expect(V.contarAdultos({ "0-5": 1, "25-34": 2, "65+": 1 })).toBe(3);
    expect(V.contarMenores({ "0-5": 1, "13-17": 2 })).toBe(3);
  });
  test("paso 11: avisos de la nota", () => {
    expect(V.avisosDeNota("Su número es 3001234567")).toHaveLength(1);
    expect(V.avisosDeNota("Está enfermo y es católico")[0]).toContain("católico");
    expect(V.avisosDeNota("Todo bien")).toHaveLength(0);
  });
  test("14.8: palabras sospechosas como palabra completa", () => {
    expect(V.palabrasSospechosas("Le prometí un mercado a cambio")).toEqual(["a cambio", "mercado", "prometí"]);
    expect(V.palabrasSospechosas("Supermercado del pueblo")).toEqual([]);
  });
  test("limpiarVacios convierte cadenas vacías en null", () => {
    expect(V.limpiarVacios({ a: "", b: [" ", "x"], c: { d: "" } })).toEqual({ a: null, b: [null, "x"], c: { d: null } });
  });
});

describe("enmascarado (7.4)", () => {
  test("máscaras", () => {
    expect(mascaraCedula("12345678")).toBe("•••••678");
    expect(mascaraTelefono("3001234567")).toBe("••••••4567");
    expect(mascaraCorreo("rosa.lopez@gmail.com")).toBe("r•••@g•••.com");
    expect(nombreCompleto({ primer_nombre: "Rosa", primer_apellido: "López", segundo_apellido: " Gil " })).toBe("Rosa López Gil");
  });
  test("datos completos solo si el servidor los entregó", () => {
    const base = { id: "1", cedula_ult3: "678", edad_anios: 40 };
    expect(vistaParaPantalla(base).cedula_txt).toBe("••••••678");
    expect(vistaParaPantalla(base, { cedula: "12345678" }).cedula_txt).toBe("12345678");
  });
});

describe("geografía", () => {
  const cuadro: Geometria = { type: "Polygon", coordinates: [[[-75.71, 4.32], [-75.69, 4.32], [-75.69, 4.34], [-75.71, 4.34], [-75.71, 4.32]]] };
  test("haversine: 1 grado de latitud son unos 111 km", () => expect(Math.round(haversineM(0, 0, 1, 0) / 1000)).toBe(111));
  test("punto en polígono y zona", () => {
    expect(puntoEnPoligono(4.3334, -75.7, cuadro)).toBe(true);
    expect(puntoEnPoligono(4.5, -75.7, cuadro)).toBe(false);
    expect(zonaDePunto(4.3334, -75.7, [{ id: "a", poligono: cuadro }])?.id).toBe("a");
  });
});

describe("permisos (sección 4 y 0013)", () => {
  const base = { id: "u1", nombre: "Ana", rol: "colaborador", estado: "activo", zonas: [], aal: "aal1", curso_aprobado: true, acuerdos_ok: true };
  test("O-01 exige verificación en dos pasos", () => {
    const sin2 = new Perfil(perfilDesdeRpc({ ...base, permisos: [{ codigo: "O-01", zonas: null, vence_en: null }] }));
    const con2 = new Perfil(perfilDesdeRpc({ ...base, aal: "aal2", permisos: [{ codigo: "O-01", zonas: null, vence_en: null }] }));
    expect(sin2.tiene("O-01")).toBe(false);
    expect(con2.tiene("O-01")).toBe(true);
  });
  test("A4: el Director también necesita dos pasos para O-01", () => {
    const dir = new Perfil(perfilDesdeRpc({ ...base, rol: "director", permisos: [] }));
    expect(dir.tiene("O-01")).toBe(false);
    expect(dir.tiene("O-09")).toBe(true);
  });
  test("vencimiento y alcance por zona", () => {
    const p = new Perfil(perfilDesdeRpc({ ...base, permisos: [{ codigo: "O-09", zonas: ["z1"], vence_en: "2026-12-01T00:00:00Z" }] }));
    expect(p.tiene("O-09", "z1", new Date("2026-11-05T00:00:00Z"))).toBe(true);
    expect(p.tiene("O-09", "z2", new Date("2026-11-05T00:00:00Z"))).toBe(false);
    expect(p.tiene("O-09", "z1", new Date("2026-12-02T00:00:00Z"))).toBe(false);
  });
  test("cuenta suspendida no puede nada", () => {
    expect(new Perfil(perfilDesdeRpc({ ...base, estado: "suspendido", rol: "director" })).puede("ver_equipo")).toBe(false);
  });
  test("M3: los permisos de riesgo alto siempre vencen", () => {
    expect(diasPara(["O-12"], null)).toBe(30);
    expect(diasPara(["O-12"], 200)).toBe(90);
    expect(diasPara(["O-09"], null)).toBeNull();
    expect(diasPara(PLANTILLAS["Colaborador de finanzas"].permisos, null)).toBe(30);
  });
  test("R-22: el autor edita dentro de la ventana", () => {
    const p = new Perfil(perfilDesdeRpc({ ...base, permisos: [] }));
    expect(p.puedeEditar("u1", true)).toBe(true);
    expect(p.puedeEditar("u1", false)).toBe(false);
    expect(p.puedeEditar("otro", true)).toBe(false);
  });
});

describe("curso de ingreso (10.6)", () => {
  test("15 preguntas y mínimo 80 %", () => {
    expect(PREGUNTAS).toHaveLength(15);
    const todas = Object.fromEntries(PREGUNTAS.map((p, i) => [i, p.correcta]));
    expect(puntaje(todas)).toBe(100);
    const doceBien = { ...todas, 0: 9, 1: 9, 2: 9 };
    expect(puntaje(doceBien)).toBe(80);
    expect(aprobado(80)).toBe(true);
    expect(aprobado(79)).toBe(false);
  });
});

describe("autorización (16.4) y borrador de visita (6.3)", () => {
  test("texto con el nombre del colaborador", () => expect(textoPara("Marta")).toContain("Soy Marta"));
  test("la evidencia verbal lleva hora", () => {
    expect(evidenciaPara("verbal", { ahora: new Date("2026-11-05T10:00:00Z") })).toEqual({ verbal: true, hora: "2026-11-05T10:00:00.000Z" });
  });

  function borradorCompleto() {
    const b = borradorVacio("u1", { lat: 4.3334, lng: -75.7, precision_m: 8 });
    b.visita.resultado = "conversacion_completa";
    b.visita.autorizacion_verbal = true;
    b.hogar = { id: randomUUID(), total_personas: 2, edades: { "25-34": 2 }, sosten_relacion: "jefe" };
    const persona = { id: randomUUID(), primer_nombre: "Rosa", primer_apellido: "López", cedula: "12345678", zona_id: "intruso" };
    b.personas.push(persona);
    b.consentimientos.push(nuevoConsentimiento("datos_personales", "verbal", { personaId: persona.id, versionTexto: "v1-borrador", evidencia: evidenciaPara("verbal", {}) }));
    b.fotos.push({ id: randomUUID(), tipo: "fachada", archivo_local: "file:///foto.jpg" });
    return b;
  }

  test("un registro completo queda en verde", () => {
    expect(evaluarRegistro(borradorCompleto())).toEqual({ color: "verde", motivos: [] });
  });
  test("sin foto ni autorización queda en rojo con sus motivos", () => {
    const b = borradorCompleto();
    b.fotos = [];
    b.consentimientos = [];
    const r = evaluarRegistro(b);
    expect(r.color).toBe("rojo");
    expect(r.motivos.join(" ")).toMatch(/fachada.*autorización de datos de Rosa/);
  });
  test("«No autorizó la foto» evita el rojo por la fachada", () => {
    const b = borradorCompleto();
    b.fotos = [];
    b.visita.no_autorizo_foto = true;
    expect(evaluarRegistro(b).color).toBe("verde");
  });
  test("el paquete solo lleva los campos que acepta el servidor (A2)", () => {
    const b = borradorCompleto();
    const { payload, subidas } = construirPayload(b);
    const p = payload as { personas: Record<string, unknown>[]; vivienda: Record<string, unknown>; fotos: Record<string, unknown>[] };
    expect(p.personas[0]).not.toHaveProperty("zona_id");
    expect(p.vivienda).not.toHaveProperty("zona_id");
    expect(p.fotos[0]).not.toHaveProperty("storage_path");
    expect(subidas[0].storage_path).toBe(rutaFoto(b.vivienda.id, b.fotos[0].id));
  });
  test("una vivienda existente solo agrega la visita (6.7)", () => {
    const b = borradorVacio("u1", { existente: { id: "v-1" } });
    expect(construirPayload(b).payload.vivienda).toEqual({ id: "v-1", solo_visita: true });
  });
});

describe("anti-fraude (6.5)", () => {
  test("ritmo sospechoso: menos de 90 s", () => {
    expect(ritmoSospechoso(["2026-11-05T10:00:00Z"], "2026-11-05T10:01:00Z")).toBe(true);
    expect(ritmoSospechoso(["2026-11-05T10:00:00Z"], "2026-11-05T10:02:00Z")).toBe(false);
  });
  test("salto imposible: 10 km en 2 minutos", () => {
    expect(saltoImposible({ fecha: "2026-11-05T10:00:00Z", lat: 4.33, lng: -75.70 }, { fecha: "2026-11-05T10:02:00Z", lat: 4.42, lng: -75.70 })).toBe(true);
  });
});

describe("estadísticas (9.3, R-28, R-29)", () => {
  test("«menos de 5»", () => {
    expect(umbral(3)).toBe("menos de 5");
    expect(umbral(0)).toBe("0");
    expect(umbral(5)).toBe("5");
  });
  test("solo cuentan los registros verdes", () => {
    const p = panelCampana({
      viviendas: [{ id: "a" }, { id: "b" }],
      visitas: [{ vivienda_id: "a", calidad: "verde", resultado: "conversacion_completa", fecha: "2026-11-05T15:00:00Z" },
                { vivienda_id: "b", calidad: "rojo", fecha: "2026-11-05T15:00:00Z" }],
      hogares: [{ total_personas: 3, edades: { "25-34": 2, "0-5": 1 } }], personas: [], necesidades: [{ tema: "salud" }],
      ahora: new Date("2026-11-05T20:00:00Z"),
    });
    expect(p.viviendas_visitadas).toBe(1);
    expect(p.cobertura_pct).toBe(50);
    expect(p.registros_incompletos).toBe(1);
    expect(p.electores_por_hogar).toBe(2);
    expect(p.necesidades_por_tema[0].texto).toBe("menos de 5");
    expect(p.visitas_por_dia.at(-1)).toEqual(["2026-11-05", 1]);
  });
  test("panel personal: hoy y tareas vencidas", () => {
    const r = panelPersonal({
      usuarioId: "u1", borradores: 1, porEnviar: 2, ahora: new Date("2026-11-05T20:00:00Z"),
      visitas: [{ usuario_id: "u1", fecha: "2026-11-05T13:00:00Z", calidad: "verde" }, { usuario_id: "otro", fecha: "2026-11-05T13:00:00Z" }],
      tareas: [{ asignado_a: "u1", estado: "pendiente", fecha_limite: "2026-11-04T00:00:00Z" }],
    });
    expect(r).toMatchObject({ hoy: 1, total: 1, tareas_pendientes: 1, tareas_vencidas: 1, borradores: 1, por_enviar: 2 });
  });
});
