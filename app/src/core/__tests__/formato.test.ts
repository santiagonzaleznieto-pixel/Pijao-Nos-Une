// Formatos de la app (3.6 y 2.8): día/mes/año, 12 horas con «a. m.»/«p. m.», hora de Bogotá y puntos de mil.
import { diaBogota, fechaConDia, fechaHora, fechaLarga, fechaNumerica, hora, miles, pesos } from "../formato";

const ahora = new Date("2026-11-08T20:00:00Z");   // 3:00 p. m. del domingo 8 de noviembre en Bogotá

describe("formatos de fecha y hora en Bogotá", () => {
  test("día/mes/año y nombres en español", () => {
    expect(fechaNumerica("2026-11-08T20:00:00Z")).toBe("08/11/2026");
    expect(fechaLarga("2026-11-08T20:00:00Z", ahora)).toBe("8 de noviembre");
    expect(fechaLarga("2025-03-02", ahora)).toBe("2 de marzo de 2025");
    expect(fechaConDia("2026-11-08T20:00:00Z", ahora)).toBe("domingo 8 de noviembre");
  });
  test("12 horas con a. m. y p. m.", () => {
    expect(hora("2026-11-08T20:05:00Z")).toBe("3:05 p. m.");
    expect(hora("2026-11-08T05:00:00Z")).toBe("12:00 a. m.");
    expect(hora("2026-11-08T17:30:00Z")).toBe("12:30 p. m.");
  });
  test("la medianoche UTC todavía es el día anterior en Bogotá", () => {
    expect(diaBogota("2026-11-09T03:00:00Z")).toBe("2026-11-08");
    expect(fechaHora("2026-11-09T03:00:00Z", new Date("2026-11-09T12:00:00Z"))).toBe("ayer, 10:00 p. m.");
    expect(fechaHora("2026-11-08T14:10:00Z", ahora)).toBe("hoy, 9:10 a. m.");
    expect(fechaHora("2026-10-30T14:10:00Z", ahora)).toBe("30 oct, 9:10 a. m.");
  });
  test("valores vacíos o inválidos", () => {
    expect(fechaLarga(null)).toBe("");
    expect(hora("no es fecha")).toBe("");
  });
});

describe("pesos con puntos de mil", () => {
  test("miles y pesos", () => {
    expect(miles(1234567)).toBe("1.234.567");
    expect(miles(999)).toBe("999");
    expect(miles(-25000)).toBe("-25.000");
    expect(pesos(1500000)).toBe("$ 1.500.000");
  });
});
