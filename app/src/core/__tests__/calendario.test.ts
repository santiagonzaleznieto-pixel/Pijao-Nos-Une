// Calendario electoral: orden, días que faltan y el próximo hito.
import { diasEntre, hitosDelCalendario, proximoHito, textoDias } from "../calendario";

const valor = [
  { fecha: "2027-10-31", hito: "Elecciones", estado: "confirmada" },
  { fecha: null, hito: "Último día para inscribir testigos", estado: "pendiente" },
  { fecha: "2026-10-31", hito: "Apertura de la inscripción de cédulas", estado: "confirmada" },
  { fecha: "2027-08-31", hito: "Cierre de la inscripción de cédulas", estado: "prensa" },
  { hito: "" },
];

describe("calendario electoral", () => {
  it("cuenta días sin correrse por la zona horaria", () => {
    expect(diasEntre("2026-11-23", "2026-11-24")).toBe(1);
    expect(diasEntre("2026-11-23", "2027-10-31")).toBe(342);
  });

  it("ordena por fecha, deja al final los que no tienen fecha y descarta los vacíos", () => {
    const h = hitosDelCalendario(valor, "2026-11-23");
    expect(h.map((x) => x.hito)).toEqual([
      "Apertura de la inscripción de cédulas", "Cierre de la inscripción de cédulas", "Elecciones", "Último día para inscribir testigos",
    ]);
    expect(h[0].pasado).toBe(true);
    expect(h[1].estadoTexto).toMatch(/prensa/);
    expect(h[3].dias).toBeNull();
  });

  it("acepta el valor como texto JSON y encuentra el próximo hito", () => {
    const h = hitosDelCalendario(JSON.stringify(valor), "2026-11-23");
    expect(proximoHito(h)?.hito).toBe("Cierre de la inscripción de cédulas");
    expect(hitosDelCalendario("no es json", "2026-11-23")).toEqual([]);
  });

  it("dice los días en palabras", () => {
    expect(textoDias(0)).toBe("Hoy");
    expect(textoDias(1)).toBe("Mañana");
    expect(textoDias(12)).toBe("En 12 días");
    expect(textoDias(-3)).toBe("Hace 3 días");
    expect(textoDias(null)).toBe("Sin fecha");
  });
});
