// Ficha de una vivienda (P-10 ficha rápida y P-13 detalle): arma, a partir de las filas que ya están en el teléfono o
// que el panel leyó con las reglas por fila, el resumen que se ve al tocar la casa en el mapa y la información completa.
// La usan la app y el panel web (alias @nucleo), así ambos muestran lo mismo. Nunca muestra datos sensibles:
// la simpatía y los datos completos (cédula, teléfono) no están en estas filas (personas_v los enmascara).
import { etiqueta, type CodigoCatalogo } from "./catalogos";

export type FilaDato = Record<string, unknown>;

export interface DatosCasa {
  vivienda: FilaDato;
  hogares: FilaDato[];
  personas: FilaDato[];
  visitas: FilaDato[];
  necesidades: FilaDato[];
  fotos: FilaDato[];
}

export interface PersonaResumen { id: string; nombre: string; detalle: string; esCabeza: boolean; noContactar: boolean }

export interface ResumenCasa {
  titulo: string;
  lugar: string;
  estado: string;
  estadoClave: string;
  noContactar: boolean;
  cabeza: string | null;
  personas: PersonaResumen[];
  totalPersonas: number;
  ultimaVisita: string | null;
  necesidades: string[];
  fotoFachada: FilaDato | null;
  calidad: string | null;
}

export interface Dato { etiqueta: string; valor: string }
export interface Seccion { titulo: string; datos: Dato[]; personaId?: string }

const texto = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());
const vivo = (f: FilaDato) => !f.eliminado_en;
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === "string" && v ? [v] : []);
const sino = (v: unknown): string => (v === true ? "Sí" : v === false ? "No" : "");
const etq = (c: CodigoCatalogo, v: unknown) => (texto(v) ? etiqueta(c, texto(v)) : "");

/** Fecha corta en hora de Colombia («5 nov 2026»), sin depender del idioma del teléfono. */
export function fechaCorta(v: unknown): string {
  const s = texto(v);
  if (!s) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00-05:00`) : new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const b = new Date(d.getTime() - 5 * 3600000);   // Colombia: UTC-5 todo el año
  return `${b.getUTCDate()} ${meses[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

export function tituloCasa(v: FilaDato): string {
  return texto(v.direccion) || (texto(v.nombre_finca) ? `Finca ${texto(v.nombre_finca)}` : "") || "Vivienda sin dirección";
}

const visibles = (personas: FilaDato[]) => personas.filter((p) => vivo(p) && p.estado !== "solicito_eliminacion" && texto(p.nombre_visible));

function describirPersona(p: FilaDato): string {
  return [
    typeof p.edad_anios === "number" ? `${p.edad_anios} años` : "",
    p.sexo === "mujer" ? "mujer" : p.sexo === "hombre" ? "hombre" : "",
    etq("C-07", p.ocupacion).toLowerCase(),
  ].filter(Boolean).join(" · ");
}

/** P-10: lo que se ve al tocar la casa en el mapa. */
export function resumenCasa(d: DatosCasa): ResumenCasa {
  const v = d.vivienda;
  const hogares = d.hogares.filter(vivo);
  const cabezas = new Set(hogares.map((h) => texto(h.sosten_persona_id)).filter(Boolean));
  const personas = visibles(d.personas).filter((p) => p.vivienda_id === undefined || p.vivienda_id === v.id);
  const resumenP: PersonaResumen[] = personas
    .map((p) => ({ id: texto(p.id), nombre: texto(p.nombre_visible), detalle: describirPersona(p), esCabeza: cabezas.has(texto(p.id)),
                   noContactar: p.estado === "no_contactar" }))
    .sort((a, b) => Number(b.esCabeza) - Number(a.esCabeza) || a.nombre.localeCompare(b.nombre));
  const cabezaPersona = resumenP.find((p) => p.esCabeza);
  const hogarConSosten = hogares.find((h) => texto(h.sosten_relacion) || texto(h.sosten_ocupacion));
  const cabeza = cabezaPersona?.nombre
    ?? (hogarConSosten ? `Sin nombre registrado${texto(hogarConSosten.sosten_relacion) ? ` (${texto(hogarConSosten.sosten_relacion)})` : ""}` : null);
  const visitas = d.visitas.filter(vivo).sort((a, b) => texto(b.fecha).localeCompare(texto(a.fecha)));
  const u = visitas[0];
  const temas = [...new Set(d.necesidades.filter(vivo).map((n) => etq("C-08", n.tema)).filter(Boolean))];
  const fachadas = d.fotos.filter((f) => vivo(f) && f.tipo === "fachada")
    .sort((a, b) => texto(b.tomada_en ?? b.creado_en).localeCompare(texto(a.tomada_en ?? a.creado_en)));
  const total = Math.max(hogares.reduce((s, h) => s + (typeof h.total_personas === "number" ? h.total_personas : 0), 0), resumenP.length);
  return {
    titulo: tituloCasa(v),
    lugar: [texto(v.barrio_vereda), v.zona_urbana_rural === "rural" ? "rural" : v.zona_urbana_rural === "urbana" ? "urbana" : ""].filter(Boolean).join(" · "),
    estado: etq("C-01", v.estado ?? "por_visitar"),
    estadoClave: texto(v.estado) || "por_visitar",
    noContactar: v.estado === "no_contactar",
    cabeza,
    personas: resumenP,
    totalPersonas: total,
    ultimaVisita: u ? `${fechaCorta(u.fecha)} · ${etq("C-02", u.resultado)}` : null,
    necesidades: temas,
    fotoFachada: fachadas[0] ?? null,
    calidad: texto(u?.calidad ?? v.calidad) || null,
  };
}

const agregar = (datos: Dato[], etiquetaTxt: string, valor: string) => { if (valor) datos.push({ etiqueta: etiquetaTxt, valor }); };

/** P-13: toda la información de la casa, por secciones. Solo aparecen los datos que se recogieron. */
export function fichaCompleta(d: DatosCasa): Seccion[] {
  const v = d.vivienda;
  const r = resumenCasa(d);
  const secciones: Seccion[] = [];

  const casa: Dato[] = [];
  agregar(casa, "Estado", r.estado);
  agregar(casa, "Barrio o vereda", texto(v.barrio_vereda));
  agregar(casa, "Zona", v.zona_urbana_rural === "rural" ? "Rural" : v.zona_urbana_rural === "urbana" ? "Urbana" : "");
  agregar(casa, "Dirección", texto(v.direccion));
  agregar(casa, "Complemento", texto(v.complemento));
  agregar(casa, "Nombre de la finca", texto(v.nombre_finca));
  agregar(casa, "Cómo llegar", texto(v.indicaciones));
  agregar(casa, "Punto de referencia", texto(v.referencia));
  agregar(casa, "Tipo de vivienda", etq("C-03", v.tipo_vivienda));
  agregar(casa, "Ocupación de la vivienda", texto(v.estado_ocupacion).replace(/_/g, " "));
  agregar(casa, "Tenencia", etq("C-04", v.tenencia));
  agregar(casa, "Servicios", lista(v.servicios).map((s) => etiqueta("C-05", s)).join(", "));
  agregar(casa, "Vía de acceso", etq("C-06", v.via_acceso));
  agregar(casa, "Riesgos", lista(v.riesgos).map((s) => s.replace(/_/g, " ")).join(", "));
  agregar(casa, "Actividad económica", etq("C-07", v.actividad_economica));
  agregar(casa, "Ubicación", v.fuente_ubicacion === "manual" ? "Marcada a mano" : v.fuente_ubicacion === "gps" ? "GPS" : "");
  if (typeof v.precision_m === "number") agregar(casa, "Precisión del GPS", `${Math.round(v.precision_m)} m`);
  if (typeof v.lat === "number" && typeof v.lng === "number") agregar(casa, "Coordenadas", `${v.lat.toFixed(6)}, ${v.lng.toFixed(6)}`);
  secciones.push({ titulo: "La vivienda", datos: casa });

  d.hogares.filter(vivo).forEach((h, i, todos) => {
    const hd: Dato[] = [];
    const cabeza = r.personas.find((p) => p.id === texto(h.sosten_persona_id));
    agregar(hd, "Cabeza de familia", cabeza?.nombre ?? "");
    agregar(hd, "Relación del sostén", texto(h.sosten_relacion));
    agregar(hd, "Sexo del sostén", texto(h.sosten_sexo).replace(/_/g, " "));
    agregar(hd, "Ocupación del sostén", etq("C-07", h.sosten_ocupacion));
    agregar(hd, "Situación laboral", texto(h.sosten_situacion_laboral).replace(/_/g, " "));
    agregar(hd, "Jefatura femenina", sino(h.jefatura_femenina));
    if (typeof h.total_personas === "number") agregar(hd, "Personas en el hogar", String(h.total_personas));
    if (typeof h.mujeres === "number" || typeof h.hombres === "number") agregar(hd, "Mujeres y hombres", `${h.mujeres ?? "—"} mujeres · ${h.hombres ?? "—"} hombres`);
    const edades = h.edades && typeof h.edades === "object" ? Object.entries(h.edades as Record<string, unknown>).filter(([, n]) => Number(n) > 0) : [];
    agregar(hd, "Edades", edades.map(([k, n]) => `${etiqueta("C-11", k)}: ${n}`).join(" · "));
    const votos = [["vota en Pijao", h.votantes_pijao_est], ["en otro municipio", h.votantes_otro_mpio_est], ["no sabe", h.votantes_no_sabe_est]]
      .filter(([, n]) => typeof n === "number").map(([t, n]) => `${n} ${t}`);
    agregar(hd, "Electores (estimado)", votos.join(" · "));
    if (typeof h.futuros_primeros_votantes === "number") agregar(hd, "Primeros votantes", String(h.futuros_primeros_votantes));
    agregar(hd, "Otros hogares en la vivienda", sino(h.otros_hogares));
    secciones.push({ titulo: todos.length > 1 ? `Hogar ${i + 1}` : "El hogar", datos: hd });
  });

  for (const p of visibles(d.personas)) {
    const pd: Dato[] = [];
    agregar(pd, "Edad", typeof p.edad_anios === "number" ? `${p.edad_anios} años` : "");
    agregar(pd, "Sexo", texto(p.sexo).replace(/_/g, " "));
    agregar(pd, "Ocupación", etq("C-07", p.ocupacion));
    agregar(pd, "Apodo", texto(p.apodo));
    agregar(pd, "Cédula", texto(p.cedula_ult3) ? `•••••${texto(p.cedula_ult3)}` : "");
    agregar(pd, "Teléfono", texto(p.telefono_ult4) ? `••• ••• ${texto(p.telefono_ult4)}` : "");
    agregar(pd, "Correo", texto(p.correo_parcial));
    agregar(pd, "Canal preferido", etq("C-10", p.canal_preferido));
    agregar(pd, "Mejor horario", texto(p.mejor_horario));
    agregar(pd, "Años en Pijao", texto(p.anios_en_pijao).replace(/_/g, " "));
    agregar(pd, "Vota en Pijao", p.vota_en_pijao === "si" ? "Sí" : p.vota_en_pijao === "no" ? "No" : p.vota_en_pijao === "no_sabe" ? "No sabe" : "");
    agregar(pd, "Quiere recibir información", sino(p.interes_info));
    agregar(pd, "Voluntario", p.voluntario === "si" ? "Sí" : p.voluntario === "no" ? "No" : p.voluntario === "tal_vez" ? "Tal vez" : "");
    agregar(pd, "Recibe reuniones en su casa", sino(p.anfitrion));
    agregar(pd, "Temas de interés", lista(p.temas_interes).map((t) => etiqueta("C-08", t)).join(", "));
    agregar(pd, "Contacto autorizado", sino(p.tiene_contacto_autorizado));
    if (p.estado === "no_contactar") agregar(pd, "Aviso", "Pidió no ser contactada");
    const cab = r.personas.find((x) => x.id === texto(p.id))?.esCabeza;
    secciones.push({ titulo: `${texto(p.nombre_visible)}${cab ? " · cabeza de familia" : ""}`, datos: pd, personaId: texto(p.id) });
  }

  const nec = d.necesidades.filter(vivo).map((n) => ({
    etiqueta: `${etq("C-08", n.tema) || "Necesidad"}${typeof n.prioridad === "number" ? ` · prioridad ${n.prioridad}` : ""}`,
    valor: [texto(n.texto), n.alcance === "colectiva" ? "(de la comunidad)" : "", texto(n.estado) ? `Estado: ${texto(n.estado).replace(/_/g, " ")}` : ""]
      .filter(Boolean).join(" ") || "Sin detalle",
  }));
  if (nec.length) secciones.push({ titulo: "Necesidades", datos: nec });

  const vis = d.visitas.filter(vivo).sort((a, b) => texto(b.fecha).localeCompare(texto(a.fecha))).map((x) => ({
    etiqueta: `${fechaCorta(x.fecha)} · ${etq("C-02", x.resultado)}`,
    valor: [
      texto(x.notas),
      x.seguimiento_requerido ? `Seguimiento${x.seguimiento_fecha ? ` el ${fechaCorta(x.seguimiento_fecha)}` : ""}${texto(x.seguimiento_motivo) ? `: ${texto(x.seguimiento_motivo)}` : ""}` : "",
      texto(x.calidad) ? `Calidad: ${texto(x.calidad)}` : "",
      x.es_diferido ? "Registro diferido" : "",
      x.verificada ? "Verificada" : "",
    ].filter(Boolean).join(" · ") || "Sin notas",
  }));
  secciones.push({ titulo: "Historial de visitas", datos: vis.length ? vis : [{ etiqueta: "Sin visitas", valor: "Todavía no hay visitas registradas." }] });
  return secciones;
}
