import { describe, expect, it } from "vitest";
import { describirAccion, etiquetaMetrica, humanizar, TIPO_TEXTO_LEGAL, tituloSolicitud, TIPOS_SOLICITUD } from "./textos";
import {
  aCsv, aFecha, compararVersion, contactoValido, contarSeguro, diaMas, errorVencimiento, fecha, haceCuanto, idDeCarnet,
  interpretarValor, mensajeDeError, nivelMeta90, nivelRespaldo, nivelUso, normalizarCaso, NUMERO_CASO, valorParaEditar, venceSugerido,
} from "./utiles";

const HOY = new Date("2026-11-05T15:00:00Z"); // 10:00 a. m. en Colombia

describe("fechas en hora de Colombia", () => {
  it("una fecha sin hora es ese día en Colombia (no el anterior por UTC)", () => {
    expect(fecha("2027-10-31")).toBe("31 de octubre de 2027");
  });
  it("las fechas vacías o dañadas muestran un guion", () => {
    expect(fecha(null)).toBe("—");
    expect(aFecha("no es fecha")).toBeNull();
  });
  it("hace cuánto, en palabras", () => {
    expect(haceCuanto("2026-11-05T14:59:30Z", HOY)).toBe("hace un momento");
    expect(haceCuanto("2026-11-05T14:30:00Z", HOY)).toBe("hace 30 minutos");
    expect(haceCuanto("2026-11-05T12:00:00Z", HOY)).toBe("hace 3 horas");
    expect(haceCuanto("2026-11-01T15:00:00Z", HOY)).toBe("hace 4 días");
    expect(haceCuanto(null, HOY)).toBe("nunca");
  });
  it("diaMas cuenta en el calendario de Colombia", () => {
    expect(diaMas(0, HOY)).toBe("2026-11-05");
    expect(diaMas(30, HOY)).toBe("2026-12-05");
    // 11:30 p. m. del 5 en Colombia ya es 6 en UTC: sigue siendo el 5.
    expect(diaMas(0, new Date("2026-11-06T04:30:00Z"))).toBe("2026-11-05");
  });
});

describe("validaciones", () => {
  it("contacto: teléfono de 7 dígitos o más, o correo", () => {
    expect(contactoValido("300 123 4567")).toBe(true);
    expect(contactoValido("+57 (300) 123-4567")).toBe(true);
    expect(contactoValido("rosa@correo.co")).toBe(true);
    expect(contactoValido("12345")).toBe(false);
    expect(contactoValido("llámeme")).toBe(false);
  });
  it("P-52: el id del carnet debe tener forma de identificador", () => {
    expect(idDeCarnet("?id=00000000-0000-0000-0000-0000000000D1")).toBe("00000000-0000-0000-0000-0000000000d1");
    expect(idDeCarnet("?id=<script>")).toBeNull();
    expect(idDeCarnet("")).toBeNull();
  });
  it("P-50: el número de caso se limpia y se valida", () => {
    expect(normalizarCaso(" ab12-cd34 ")).toBe("AB12CD34");
    expect(NUMERO_CASO.test(normalizarCaso("ab12cd34"))).toBe(true);
    expect(NUMERO_CASO.test(normalizarCaso("xyz"))).toBe(false);
  });
});

describe("P-42: interpretar lo que escribe el Administrador", () => {
  it("números, también con coma decimal", () => {
    expect(interpretarValor(15, "20")).toEqual({ ok: true, valor: 20 });
    expect(interpretarValor(15.0, "15,5")).toEqual({ ok: true, valor: 15.5 });
    expect(interpretarValor(15, "veinte").ok).toBe(false);
    expect(interpretarValor(15, "").ok).toBe(false);
  });
  it("listas de números y textos", () => {
    expect(interpretarValor([70, 85], "70, 85; 95")).toEqual({ ok: true, valor: [70, 85, 95] });
    expect(interpretarValor([70], "70, x").ok).toBe(false);
    expect(interpretarValor("0.10.0", " 0.11.0 ")).toEqual({ ok: true, valor: " 0.11.0 " });
  });
  it("lo que se muestra para editar", () => {
    expect(valorParaEditar([70, 85])).toBe("70, 85");
    expect(valorParaEditar(null)).toBe("");
    expect(valorParaEditar(true)).toBe("sí");
  });
});

describe("M3: vencimiento de permisos", () => {
  const alto = { codigo: "O-01", riesgo: "alto" as const };
  const bajo = { codigo: "O-09", riesgo: "bajo" as const };
  it("los de riesgo alto sugieren 30 días y los demás no vencen", () => {
    expect(venceSugerido(alto, HOY)).toBe("2026-12-05");
    expect(venceSugerido(bajo, HOY)).toBeNull();
  });
  it("avisa antes de enviar lo que el servidor rechazaría", () => {
    expect(errorVencimiento(alto, null, 90, HOY)).toMatch(/riesgo alto/);
    expect(errorVencimiento(alto, "2027-03-01", 90, HOY)).toMatch(/máximo 90/);
    expect(errorVencimiento(alto, "2026-11-04", 90, HOY)).toMatch(/ya pasó/);
    expect(errorVencimiento(alto, "2027-01-15", 90, HOY)).toBeNull();
    expect(errorVencimiento(bajo, null, 90, HOY)).toBeNull();
  });
});

describe("errores para la persona", () => {
  it("los mensajes de las reglas del servidor se muestran tal cual", () => {
    expect(mensajeDeError({ code: "P0001", message: "Escriba el motivo del rechazo" })).toBe("Escriba el motivo del rechazo");
  });
  it("los técnicos se cambian por uno claro", () => {
    expect(mensajeDeError({ code: "42501", message: "permission denied for function x" })).toBe("No tiene permiso para hacer esto.");
    expect(mensajeDeError({ code: "42501", message: "Solo el Administrador" })).toBe("Solo el Administrador");
    expect(mensajeDeError({ message: "TypeError: Failed to fetch" })).toMatch(/conexión/);
    expect(mensajeDeError({ code: "PGRST202", message: "Could not find the function" })).toMatch(/todavía no está disponible/);
    expect(mensajeDeError({ code: "XX000", message: "syntax error at or near" })).toMatch(/Algo salió mal/);
    expect(mensajeDeError(null)).toMatch(/Algo salió mal/);
  });
});

describe("P-41: CSV seguro", () => {
  const cols = [{ clave: "a", titulo: "Acción" }, { clave: "b", titulo: "Detalle" }];
  it("separa con punto y coma, escapa comillas y saltos, y empieza con BOM", () => {
    const csv = aCsv([{ a: "invitar", b: 'dijo "hola"; y\nsiguió' }], cols);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('Acción;Detalle\r\ninvitar;"dijo ""hola""; y\nsiguió"');
  });
  it("neutraliza celdas que Excel ejecutaría como fórmula", () => {
    const csv = aCsv([{ a: "=HYPERLINK(\"http://x\")", b: "+1" }], cols);
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")";'+1`);
  });
  it("los objetos se guardan como JSON", () => {
    expect(aCsv([{ a: "x", b: { codigo: "O-01" } }], cols)).toContain('x;"{""codigo"":""O-01""}"');
  });
});

describe("P-43: semáforos de salud", () => {
  it("uso del plan gratuito", () => {
    expect(nivelUso(50, 80)).toBe("ok");
    expect(nivelUso(85, 80)).toBe("alerta");
    expect(nivelUso(97, 80)).toBe("critico");
  });
  it("respaldo de cada noche", () => {
    expect(nivelRespaldo("2026-11-05T08:00:00Z", HOY)).toBe("ok");
    expect(nivelRespaldo("2026-11-03T20:00:00Z", HOY)).toBe("alerta");
    expect(nivelRespaldo("2026-10-30T08:00:00Z", HOY)).toBe("critico");
    expect(nivelRespaldo(null, HOY)).toBe("critico");
  });
  it("versiones de la app", () => {
    expect(compararVersion("0.10.0", "0.11.0")).toBeLessThan(0);
    expect(compararVersion("0.11.0", "0.11.0")).toBe(0);
    expect(compararVersion("1.0.0", "0.99.9")).toBeGreaterThan(0);
  });
  it("R-29: grupos pequeños", () => {
    expect(contarSeguro(3)).toBe("menos de 5");
    expect(contarSeguro(0)).toBe("0");
    expect(contarSeguro(12)).toBe("12");
  });
});

describe("textos", () => {
  it("cada tipo de solicitud tiene título y explicación", () => {
    expect(TIPOS_SOLICITUD.map((t) => t.clave).sort()).toEqual(
      ["actualizacion", "consulta", "prueba_autorizacion", "queja", "revocatoria", "supresion"]);
    expect(tituloSolicitud("supresion")).toBe("Borrar mis datos");
  });
  it("acciones de auditoría conocidas y desconocidas", () => {
    expect(describirAccion("aprobar_usuario")).toBe("Aprobó una cuenta");
    expect(describirAccion("algo_nuevo")).toBe("Algo nuevo");
    expect(humanizar("")).toBe("");
  });
});

describe("cierre de la Fase 1", () => {
  it("la meta de 90 segundos del registro sin contacto (6.1 y 22.3)", () => {
    expect(nivelMeta90(85)).toBe("ok");
    expect(nivelMeta90(60)).toBe("alerta");
    expect(nivelMeta90(20)).toBe("critico");
    expect(nivelMeta90(null)).toBe("alerta");
  });
  it("las métricas y las acciones nuevas se leen en palabras sencillas", () => {
    expect(etiquetaMetrica("baja_precision")).toMatch(/Señal débil/);
    expect(etiquetaMetrica("algo_nuevo")).toBe("Algo nuevo");
    expect(describirAccion("revision_permisos")).toMatch(/revisión de permisos/);
  });
  it("el Administrador puede publicar el guion y las preguntas frecuentes", () => {
    expect(Object.keys(TIPO_TEXTO_LEGAL)).toEqual(expect.arrayContaining(["guion_visita", "preguntas_frecuentes"]));
  });
});
