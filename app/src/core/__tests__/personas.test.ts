// Pestaña «Personas»: filtros, dónde vota, número de predio y la lista sin señal (con datos enmascarados).
import { CATALOGOS } from "../catalogos";
import {
  cedulaVisible, codigoPredio, contarFiltros, errorMesa, limpiarFiltros, listaLocal, numeroPredio, sabeDondeVota,
  telefonoVisible, textoDondeVota,
} from "../personas";

describe("dónde vota", () => {
  it("arma el texto con puesto y mesa, o dice qué falta", () => {
    expect(textoDondeVota({ vota_en_pijao: "si", puesto_votacion: "Escuela La Mina", mesa_votacion: "7" })).toBe("Escuela La Mina · mesa 7");
    expect(textoDondeVota({ vota_en_pijao: "si", puesto_votacion: "Colegio", mesa_votacion: null })).toBe("Colegio");
    expect(textoDondeVota({ vota_en_pijao: "no", puesto_votacion: null, mesa_votacion: null })).toBe("Vota en otro municipio");
    expect(textoDondeVota({ vota_en_pijao: "si", puesto_votacion: "", mesa_votacion: null })).toBe("Vota en Pijao · falta el puesto");
    expect(textoDondeVota({ vota_en_pijao: null, puesto_votacion: null, mesa_votacion: null })).toBe("Sin dato de dónde vota");
    expect(sabeDondeVota({ vota_en_pijao: "no", puesto_votacion: null })).toBe(true);
    expect(sabeDondeVota({ vota_en_pijao: "si", puesto_votacion: " " })).toBe(false);
  });

  it("recuerda la regla de residencia solo a quien vota en Pijao y lleva menos de un año (14.8)", () => {
    const { recordarResidencia } = require("../personas") as typeof import("../personas");
    expect(recordarResidencia("si", "menos_1")).toBe(true);
    expect(recordarResidencia("si", "5_mas")).toBe(false);
    expect(recordarResidencia("no", "menos_1")).toBe(false);
  });

  it("valida la mesa (1 a 999)", () => {
    expect(errorMesa("")).toBeNull();
    expect(errorMesa("7")).toBeNull();
    expect(errorMesa("123")).toBeNull();
    expect(errorMesa("0")).not.toBeNull();
    expect(errorMesa("1234")).not.toBeNull();
    expect(errorMesa("7a")).not.toBeNull();
  });

  it("los puestos de Pijao son un catálogo que llena el Director (sin inventar nombres)", () => {
    expect(CATALOGOS["C-21"].nombre).toMatch(/Puestos de votación/);
    expect(CATALOGOS["C-21"].opciones).toHaveLength(0);
  });
});

describe("filtros", () => {
  it("quita los vacíos y cuenta los puestos", () => {
    expect(limpiarFiltros({ texto: "  ana ", vereda: "", sin_puesto: false, mias: true })).toEqual({ texto: "ana", mias: true });
    expect(contarFiltros({ texto: "ana", vereda: "La Mina", puesto: "Escuela", sin_puesto: false })).toBe(2);
  });
});

describe("predio del IGAC", () => {
  it("saca el código de la referencia y el número corto del terreno", () => {
    expect(codigoPredio("Predio IGAC 635480100000000100015000000000")).toBe("635480100000000100015000000000");
    expect(codigoPredio("Casa azul")).toBeNull();
    expect(numeroPredio("635480100000000100015000000000")).toBe("15");
    expect(numeroPredio("63548000100000012000")).toBe("12");
    expect(numeroPredio("123")).toBeNull();
  });
});

describe("lista sin señal", () => {
  const personas = [
    { id: "1", nombre_visible: "María Gómez", vivienda_id: "v1", estado: "activa", creado_por: "yo", cedula_ult3: "456", telefono_ult4: "4567",
      vota_en_pijao: "si", puesto_votacion: "Escuela La Mina", mesa_votacion: "7" },
    { id: "2", nombre_visible: "Pedro Ríos", vivienda_id: "v2", estado: "activa", creado_por: "otro", vota_en_pijao: null },
    { id: "3", nombre_visible: null, estado: "solicito_eliminacion" },
    { id: "4", nombre_visible: "Ana Ruiz", vivienda_id: "v2", estado: "no_contactar", creado_por: "otro", eliminado_en: "2026-11-01" },
  ];
  const viviendas = [
    { id: "v1", direccion: "Calle 5", barrio_vereda: "Centro", referencia: "Predio IGAC 635480100000000100015000000000" },
    { id: "v2", nombre_finca: "La Esperanza", barrio_vereda: "La Mina" },
  ];

  it("ordena por nombre, nunca muestra a quien pidió eliminar ni a los eliminados, y marca las propias", () => {
    const l = listaLocal(personas, viviendas, {}, "yo");
    expect(l.map((p) => p.nombre)).toEqual(["María Gómez", "Pedro Ríos"]);
    expect(l[0].propia).toBe(true);
    expect(l.every((p) => p.local && !p.completo && !p.cedula)).toBe(true);
  });

  it("busca sin tildes y filtra por vereda, puesto, sin puesto y mías", () => {
    expect(listaLocal(personas, viviendas, { texto: "pedro rios" }, "yo").map((p) => p.id)).toEqual(["2"]);
    expect(listaLocal(personas, viviendas, { vereda: "mina" }, "yo").map((p) => p.id)).toEqual(["2"]);
    expect(listaLocal(personas, viviendas, { puesto: "escuela la mina", mesa: "7" }, "yo").map((p) => p.id)).toEqual(["1"]);
    expect(listaLocal(personas, viviendas, { sin_puesto: true }, "yo").map((p) => p.id)).toEqual(["2"]);
    expect(listaLocal(personas, viviendas, { vota: "sin_dato" }, "yo").map((p) => p.id)).toEqual(["2"]);
    expect(listaLocal(personas, viviendas, { mias: true }, "yo").map((p) => p.id)).toEqual(["1"]);
    expect(listaLocal(personas, viviendas, { predio: "6354801" }, "yo").map((p) => p.id)).toEqual(["1"]);
  });

  it("enmascara la cédula y el teléfono que no vienen completos", () => {
    const [maria] = listaLocal(personas, viviendas, {}, "yo");
    expect(cedulaVisible(maria)).toBe("•••456");
    expect(telefonoVisible(maria)).toBe("•••4567");
    expect(cedulaVisible({ ...maria, cedula: "1094000111" })).toBe("1.094.000.111");
    expect(telefonoVisible({ ...maria, telefono: "3209998877" })).toBe("320 999 8877");
  });
});

describe("fechas sin hora", () => {
  it("no corre la fecha de nacimiento un día por la zona horaria", () => {
    const { fechaSinHora } = require("../personas") as typeof import("../personas");
    expect(fechaSinHora("1980-05-04")).toBe("4 de mayo de 1980");
    expect(fechaSinHora(null)).toBeNull();
  });
});
