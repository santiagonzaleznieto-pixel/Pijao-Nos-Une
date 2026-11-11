// Modo demostración del panel: datos de ejemplo en la memoria del navegador, sin servidor. Sirve para conocer el panel
// y para capacitar al Director antes de usar datos reales. Nada sale del computador y todo se borra al recargar.
// Imita las reglas principales del servidor para que las pantallas se comporten igual (los mensajes son los mismos).
import { CATALOGOS } from "@nucleo/catalogos";
import { PERMISOS, PLANTILLAS } from "@nucleo/permisos";
import { PARAMS_POR_DEFECTO } from "@nucleo/reglas";
import { diaMas } from "../../logica/utiles";
import { ErrorPanel } from "./supabase";
import type { AlertaCalidadPanel, AlertaSos, CumpleaneroPanel, EventoPanel, IncidentePanel, InformePanel, NecesidadPanel, NuevaTarea, NuevoEvento, Seguridad, TareaPanel } from "./tipos";
import type {
  AvisoPanel, MetricasPiloto,
  CasaPanel, Colaborador, DefPermiso, Dispositivo, FilaAuditoria, FiltrosAuditoria, Fuente, Invitacion, OpcionCatalogo, PerfilPanel,
  PermisoOtorgado, Plantilla, PuntoMapa, Resumen, Rol, Salud, Sesion, Solicitud, TextoLegal, ValorConfig, Zona,
} from "./tipos";

const ahora = () => new Date().toISOString();
const haceDias = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();
const espera = (ms = 150) => new Promise((r) => setTimeout(r, ms));
let semilla = 7;
const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
const uuid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
  const r = Math.floor(azar() * 16);
  return (c === "x" ? r : (r & 3) | 8).toString(16);
});

function colaborador(id: string, nombre: string, rol: Rol, estado: string, extra: Partial<Colaborador> = {}): Colaborador {
  return {
    id, nombre_completo: nombre, rol, estado, celular: "300 000 0000", correo: `${nombre.split(" ")[0].toLowerCase()}@ejemplo.co`,
    tipo_vinculacion: "voluntario", es_servidor_publico: false, es_contratista_estado: false,
    contacto_emergencia_nombre: "Familiar de ejemplo", contacto_emergencia_celular: "310 000 0000",
    curso_aprobado_en: estado === "activo" ? haceDias(20) : null, curso_puntaje: estado === "activo" ? 90 : null,
    acuerdos_aceptados_en: estado === "activo" ? haceDias(20) : null, acuerdos_version: estado === "activo" ? "v1-borrador" : null,
    motivo_estado: null, ultimo_acceso: estado === "activo" ? haceDias(azar() * 5) : null, creado_en: haceDias(30 + azar() * 20),
    ...extra,
  };
}

// Dibujo de una fachada de ejemplo (la demostración no tiene fotos reales).
function fotoEjemplo(i: number): string {
  const paredes = ["#F2E3C6", "#CFE3F2", "#F6D3CF", "#DDEFD0"][i % 4];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><rect width="320" height="240" fill="#BFE0F5"/>` +
    `<rect y="190" width="320" height="50" fill="#7DB93F"/><rect x="70" y="100" width="180" height="110" fill="${paredes}" stroke="#8a7a5c"/>` +
    `<polygon points="55,105 160,45 265,105" fill="#B5523B"/><rect x="140" y="150" width="40" height="60" fill="#6B4A2B"/>` +
    `<rect x="90" y="125" width="34" height="30" fill="#FFFFFF" stroke="#6B4A2B"/><rect x="196" y="125" width="34" height="30" fill="#FFFFFF" stroke="#6B4A2B"/>` +
    `<text x="160" y="232" font-size="14" text-anchor="middle" fill="#1F2933">Foto de ejemplo</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export class FuenteDemo implements Fuente {
  readonly modo = "demo" as const;
  private fase: "fuera" | "codigo" | "dentro" = "fuera";
  private perfil: PerfilPanel;

  private gente: Colaborador[];
  private invitacionesL: Invitacion[] = [];
  private permisos: PermisoOtorgado[] = [];
  private plantillasL: Plantilla[] = Object.entries(PLANTILLAS).map(([nombre, p]) => ({ nombre, codigos: [...p.permisos], limitar_a_zona: p.limitarAZona }));
  private zonasL: Zona[] = [
    { id: "z-centro", nombre: "Casco urbano · Centro", tipo: "barrio" },
    { id: "z-norte", nombre: "Casco urbano · Norte", tipo: "barrio" },
    { id: "z-mina", nombre: "Vereda La Mina", tipo: "vereda" },
    { id: "z-carniceria", nombre: "Vereda La Carnicería", tipo: "vereda" },
  ];
  private auditoriaL: FilaAuditoria[] = [];
  private config: ValorConfig[];
  private opciones: OpcionCatalogo[] = [];
  private textosL: TextoLegal[];
  private solicitudesL: Solicitud[];
  private dispositivos: Dispositivo[] = [];
  private puntos: PuntoMapa[] = [];
  private avisosL: AvisoPanel[] = [{
    id: "aviso-revision", tipo: "revision_permisos", creado_en: haceDias(2),
    mensaje: "Revisión mensual de permisos: hay 6 permisos opcionales activos en 3 cuentas; 1 vencen en los próximos 30 días y 2 no tienen vencimiento. Revíselos en el panel web, sección Colaboradores.",
  }];

  constructor(rol: Rol = "admin") {
    const yo = rol === "admin" ? "u-admin" : "u-director";
    this.perfil = { id: yo, nombre: rol === "admin" ? "Administrador (ejemplo)" : "Directora (ejemplo)", rol, estado: "activo" };
    this.gente = [
      colaborador("u-admin", "Administrador (ejemplo)", "admin", "activo"),
      colaborador("u-director", "Directora (ejemplo)", "director", "activo"),
      colaborador("u-1", "Ana María Ospina", "colaborador", "activo"),
      colaborador("u-2", "Carlos Andrés Gómez", "colaborador", "activo"),
      colaborador("u-3", "Luz Dary Restrepo", "colaborador", "activo"),
      colaborador("u-4", "Jhon Fredy Cardona", "colaborador", "suspendido", { motivo_estado: "Compartió una captura de pantalla" }),
      colaborador("u-5", "Paula Andrea Ríos", "colaborador", "pendiente", { creado_en: haceDias(1) }),
      colaborador("u-6", "Diego Alejandro Muñoz", "colaborador", "pendiente", { es_servidor_publico: true, creado_en: haceDias(0, 5) }),
      colaborador("u-7", "Sandra Milena Toro", "colaborador", "aprobado"),
      colaborador("u-8", "Óscar Iván Henao", "colaborador", "baja", { motivo_estado: "Se fue a vivir a Armenia" }),
    ];
    this.permisos = [
      { id: uuid(), usuario_id: "u-1", codigo: "O-03", otorgado_por: "u-director", otorgado_en: haceDias(10), vence_en: null, zonas: null, motivo: "Plantilla: Líder de zona", activo: true },
      { id: uuid(), usuario_id: "u-1", codigo: "O-09", otorgado_por: "u-director", otorgado_en: haceDias(10), vence_en: null, zonas: ["z-mina"], motivo: "Plantilla: Líder de zona", activo: true },
      { id: uuid(), usuario_id: "u-2", codigo: "O-01", otorgado_por: "u-admin", otorgado_en: haceDias(3), vence_en: diaMas(27) + "T23:59:59-05:00", zonas: ["z-centro"], motivo: "Verificación de duplicados", activo: true },
    ];
    this.invitacionesL = [
      { id: uuid(), codigo: "K7PM2QXR9TWA", nombre: "Marta Lucía Arango", celular: "311 000 0000", correo: null, rol_destino: "colaborador", creado_en: haceDias(1), expira_en: new Date(Date.now() + 2 * 86400000).toISOString(), estado: "pendiente", usada_en: null },
      { id: uuid(), codigo: "H3NB8VCZ4YUE", nombre: "Paula Andrea Ríos", celular: null, correo: "paula@ejemplo.co", rol_destino: "colaborador", creado_en: haceDias(2), expira_en: haceDias(-1), estado: "usada", usada_en: haceDias(1) },
    ];
    this.config = Object.entries(PARAMS_POR_DEFECTO).map(([clave, valor]) => ({
      clave, valor: Array.isArray(valor) ? [...valor] : valor, descripcion: null, actualizado_en: haceDias(30),
    }));
    this.config.push(
      { clave: "version_minima_app", valor: "0.10.0", descripcion: "N-13: versión mínima obligatoria de la app", actualizado_en: haceDias(5) },
      { clave: "panel_inactividad_min", valor: 15, descripcion: "Panel web: minutos sin uso antes de cerrar la sesión", actualizado_en: haceDias(1) },
      { clave: "canal_titulares_correo", valor: "", descripcion: "16.5: correo para las solicitudes de los titulares", actualizado_en: haceDias(1) },
      { clave: "canal_titulares_whatsapp", valor: "", descripcion: "16.5: WhatsApp para las solicitudes de los titulares", actualizado_en: haceDias(1) },
      { clave: "responsable_tratamiento", valor: "Campaña Pijao Nos Une · candidato Jaime González · Pijao, Quindío", descripcion: "Responsable del tratamiento", actualizado_en: haceDias(1) },
      { clave: "ultimo_respaldo", valor: { en: haceDias(0, 9), mb: 14.2, archivos: 312, equipo: "PC-ADMIN" }, descripcion: "8.10: lo escribe tools/respaldo.ps1", actualizado_en: haceDias(0, 9) },
      { clave: "calendario_legal", valor: [
        { fecha: "2026-10-31", hito: "Apertura de la inscripción de cédulas y del registro de grupos significativos de ciudadanos", estado: "confirmada" },
        { fecha: "2027-07-31", hito: "Cierre de la inscripción de candidaturas; publicación del censo electoral", estado: "prensa" },
        { fecha: null, hito: "Inicio de la propaganda en espacio público", estado: "pendiente" },
        { fecha: "2027-10-31", hito: "Elecciones (8:00 a. m. a 4:00 p. m.)", estado: "confirmada" },
      ], descripcion: "2.2 y 14.7: calendario legal", actualizado_en: haceDias(1) },
    );
    this.config.sort((a, b) => a.clave.localeCompare(b.clave));
    let id = 1;
    for (const [catalogo, c] of Object.entries(CATALOGOS)) {
      c.opciones.forEach(([clave, etiqueta], orden) => this.opciones.push({ id: id++, catalogo, clave, etiqueta, orden, activo: true }));
    }
    this.textosL = ["autorizacion", "aviso_privacidad", "acuerdo_confidencialidad", "codigo_conducta", "politica_tratamiento"].map((tipo) => ({
      id: uuid(), tipo, version: "v1-borrador", vigente: true, es_borrador: true, creado_en: haceDias(30),
      contenido: tipo === "politica_tratamiento" ? "[Texto de la política: lo redacta el abogado antes de usar la app con familias reales.]"
        : `Texto de ejemplo para «${tipo}». El texto real lo aprueba el abogado de la campaña.`,
    }));
    this.solicitudesL = [
      { id: "a1b2c3d4-0000-4000-8000-000000000001", persona_id: null, nombre_solicitante: "Rosa Elena Pérez", contacto: "300 123 4567", tipo: "supresion", detalle: "Barrio o vereda: Vereda La Mina\nNo quiero que tengan mis datos.", canal: "formulario", registrado_por: null, recibido_en: haceDias(6), plazo_interno: diaMas(-1), plazo_legal: diaMas(9), estado: "recibida", respuesta: null, resuelta_en: null },
      { id: "b2c3d4e5-0000-4000-8000-000000000002", persona_id: "p-1", nombre_solicitante: "Hernán Darío Vélez", contacto: "312 555 0000", tipo: "consulta", detalle: "Quiere saber qué datos suyos tienen.", canal: "app", registrado_por: "u-1", recibido_en: haceDias(2), plazo_interno: diaMas(3), plazo_legal: diaMas(8), estado: "en_proceso", respuesta: null, resuelta_en: null },
      { id: "c3d4e5f6-0000-4000-8000-000000000003", persona_id: "p-2", nombre_solicitante: "Gloria Inés Salazar", contacto: "gloria@ejemplo.co", tipo: "revocatoria", detalle: null, canal: "whatsapp", registrado_por: "u-director", recibido_en: haceDias(12), plazo_interno: diaMas(-7), plazo_legal: diaMas(3), estado: "resuelta", respuesta: "Se marcó No contactar y se revocaron los contactos.", resuelta_en: haceDias(11) },
    ];
    this.dispositivos = ["u-1", "u-2", "u-3", "u-director"].map((u, i) => ({
      id: uuid(), usuario_id: u, modelo: ["Samsung A05", "Motorola E13", "Xiaomi Redmi 12C", "Samsung A15"][i], plataforma: "android",
      version_app: i === 1 ? "0.10.0" : "0.11.0", ultimo_acceso: haceDias(i * 0.7), activo: true, reportado_perdido_en: null,
      cola_pendiente: i === 2 ? 4 : 0, ultima_sincronizacion: haceDias(i === 2 ? 2 : 0, 1), espacio_libre_mb: 1800 - i * 400, bateria_pct: 80 - i * 15,
    }));
    const estados = ["por_visitar", "visitada_conversacion", "visitada_conversacion", "visitada_sin_contacto", "requiere_seguimiento", "no_contactar", "deshabitada"];
    for (let i = 0; i < 260; i++) {
      const urbano = i < 180;
      this.puntos.push({
        id: uuid(), estado: estados[Math.floor(azar() * estados.length)],
        lat: urbano ? 4.3335 + (azar() - 0.5) * 0.008 : 4.29 + azar() * 0.08,
        lng: urbano ? -75.7045 + (azar() - 0.5) * 0.008 : -75.76 + azar() * 0.1,
        zona_id: urbano ? "z-centro" : "z-mina",
      });
    }
    const acciones: [string, string, string | null][] = [
      ["invitar", "invitacion", null], ["aprobar_usuario", "perfil", "u-3"], ["permiso", "perfil", "u-1"], ["registrar_visita", "visita", uuid()],
      ["ver_datos_completos", "persona", "p-1"], ["solicitud_titular", "persona", "p-1"], ["dispositivo_nuevo", "sesion", uuid()],
      ["suspender_usuario", "perfil", "u-4"], ["registrar_visita", "visita", uuid()], ["configuracion", "configuracion", "radio_duplicados_m"],
    ];
    for (let i = 0; i < 40; i++) {
      const [accion, entidad, ent] = acciones[i % acciones.length];
      const quien = ["u-director", "u-1", "u-2", "u-3", "u-admin"][i % 5];
      this.auditoriaL.push({
        id: 40 - i, seq: 40 - i, creado_en: haceDias(i * 0.4), usuario_id: quien, actor_rol: "authenticated", accion, entidad, entidad_id: ent,
        detalle: accion === "permiso" ? { codigo: "O-03", activo: true } : accion === "suspender_usuario" ? { motivo: "Compartió una captura de pantalla" } : {},
        ip: "190.0.0." + (i % 20), hash: (i * 7919).toString(16).padStart(8, "0") + "…",
      });
    }
  }

  // ------------------------------------------------------------------------------------------- utilidades

  private exigirAdmin() { if (this.perfil.rol !== "admin") throw new ErrorPanel("Solo el Administrador"); }
  private auditar(accion: string, entidad: string, entidad_id: string | null, detalle: Record<string, unknown> = {}) {
    const id = (this.auditoriaL[0]?.id ?? 0) + 1;
    this.auditoriaL.unshift({ id, seq: id, creado_en: ahora(), usuario_id: this.perfil.id, actor_rol: "authenticated", accion, entidad,
      entidad_id, detalle, ip: "127.0.0.1", hash: id.toString(16).padStart(8, "0") + "…" });
  }
  private persona(id: string) {
    const p = this.gente.find((g) => g.id === id);
    if (!p) throw new ErrorPanel("Cuenta no encontrada");
    return p;
  }

  // ------------------------------------------------------------------------------------------- sesión

  async estado(): Promise<Sesion> {
    if (this.fase === "fuera") return { fase: "fuera" };
    if (this.fase === "codigo") return { fase: "codigo" };
    return { fase: "dentro", perfil: this.perfil, inactividadMin: 15 };
  }
  async entrar(): Promise<Sesion> { await espera(); this.fase = "codigo"; return this.estado(); }
  async verificarCodigo(codigo: string): Promise<Sesion> {
    await espera();
    if (!/^\d{6}$/.test(codigo.replace(/\s/g, ""))) throw new ErrorPanel("El código tiene 6 números (en la demostración sirve cualquiera).");
    this.fase = "dentro";
    return this.estado();
  }
  async salir() { this.fase = "fuera"; }

  async resumen(): Promise<Resumen> {
    await espera();
    const hoy = diaMas(0);
    const abiertas = this.solicitudesL.filter((s) => s.estado === "recibida" || s.estado === "en_proceso");
    return {
      pendientes: this.gente.filter((g) => g.estado === "pendiente").length,
      activos: this.gente.filter((g) => g.estado === "activo").length,
      invitacionesVigentes: this.invitacionesL.filter((i) => i.estado === "pendiente" && i.expira_en > ahora()).length,
      titularesPendientes: abiertas.length,
      titularesVencidos: abiertas.filter((s) => (s.plazo_interno ?? "9") < hoy).length,
      alertasAbiertas: 3,
    };
  }

  async avisos(): Promise<AvisoPanel[]> { await espera(); return [...this.avisosL]; }
  async avisoLeido(id: string) { await espera(); this.avisosL = this.avisosL.filter((a) => a.id !== id); }

  async metricasPiloto(desde: string | null, hasta: string | null): Promise<MetricasPiloto> {
    await espera(250);
    const dias = Array.from({ length: 10 }, (_, i) => diaMas(i - 9));
    return {
      desde: desde ?? diaMas(-30), hasta: hasta ?? diaMas(0), colaboradores: 7,
      registros: { total: 186, mediana_seg: 212, p90_seg: 540, pct_bajo_90_seg: 31.2, por_tipo: [
        { tipo: "con_contacto", total: 121, mediana_seg: 305, pct_bajo_90_seg: 4.1 },
        { tipo: "solo_punto", total: 52, mediana_seg: 64, pct_bajo_90_seg: 84.6 },
        { tipo: "seguimiento", total: 13, mediana_seg: 150, pct_bajo_90_seg: 23.1 },
      ] },
      calidad: { verde: 139, amarillo: 35, rojo: 12 },
      sin_senal: { registros: 48, pct: 25.8 },
      gps: { lecturas: 203, mediana_precision_m: 7.5, errores: { baja_precision: 17, sin_lectura: 3, sin_permiso: 1 } },
      envios: { errores: { servidor: 4, sesion: 1 }, en_revision: 6, colas_atrasadas: 2 },
      por_dia: dias.map((dia, i) => ({ dia, registros: 12 + ((i * 7) % 15), mediana_seg: 180 + ((i * 37) % 90), gps_errores: i % 4, envio_errores: i % 3 === 0 ? 1 : 0 })),
    };
  }

  // ------------------------------------------------------------------------------------------- P-36

  async colaboradores() { await espera(); return this.gente.map((g) => ({ ...g })); }
  async invitaciones() { await espera(); return this.invitacionesL.map((i) => ({ ...i })); }
  async invitar(nombre: string, celular: string | null, correo: string | null, rol: string) {
    await espera();
    if (!nombre.trim()) throw new ErrorPanel("Escriba el nombre de la persona");
    if (rol === "director" && this.perfil.rol !== "admin") throw new ErrorPanel("Solo el Administrador puede invitar a un Director");
    const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const codigo = Array.from({ length: 12 }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join("");
    const expira_en = new Date(Date.now() + 72 * 3600000).toISOString();
    this.invitacionesL.unshift({ id: uuid(), codigo, nombre: nombre.trim(), celular, correo, rol_destino: rol, creado_en: ahora(), expira_en, estado: "pendiente", usada_en: null });
    this.auditar("invitar", "invitacion", null, { rol });
    return { codigo, expira_en };
  }
  async aprobar(id: string) {
    await espera();
    const p = this.persona(id);
    if (p.estado !== "pendiente") throw new ErrorPanel("No hay una solicitud pendiente para esa cuenta");
    p.estado = "aprobado"; p.motivo_estado = null;
    this.auditar("aprobar_usuario", "perfil", id);
  }
  async rechazar(id: string, motivo: string) {
    await espera();
    if (!motivo.trim()) throw new ErrorPanel("Escriba el motivo del rechazo");
    const p = this.persona(id);
    if (p.estado !== "pendiente") throw new ErrorPanel("No hay una solicitud pendiente para esa cuenta");
    p.estado = "baja"; p.motivo_estado = "Solicitud rechazada: " + motivo.trim();
    this.auditar("rechazar_usuario", "perfil", id, { motivo });
  }
  async suspender(id: string, motivo: string) {
    await espera();
    const p = this.persona(id);
    if (p.rol === "admin") throw new ErrorPanel("No se puede suspender al Administrador");
    if (p.rol === "director" && this.perfil.rol !== "admin") throw new ErrorPanel("Solo el Administrador puede suspender al Director");
    p.estado = "suspendido"; p.motivo_estado = motivo;
    this.permisos.filter((x) => x.usuario_id === id).forEach((x) => (x.activo = false));
    this.auditar("suspender_usuario", "perfil", id, { motivo });
  }
  async reactivar(id: string) {
    await espera();
    const p = this.persona(id);
    if (p.estado !== "suspendido") throw new ErrorPanel("La cuenta no está suspendida");
    p.estado = "activo"; p.motivo_estado = null;
    this.auditar("reactivar_usuario", "perfil", id);
  }
  async darDeBaja(id: string, motivo: string) {
    await espera();
    this.exigirAdmin();
    const p = this.persona(id);
    if (p.rol === "admin") throw new ErrorPanel("Cuenta no encontrada");
    p.estado = "baja"; p.motivo_estado = motivo;
    this.permisos.filter((x) => x.usuario_id === id).forEach((x) => (x.activo = false));
    this.auditar("baja_usuario", "perfil", id, { motivo });
  }
  async designarDirector(id: string) {
    await espera();
    this.exigirAdmin();
    const p = this.persona(id);
    if (p.rol === "admin" || !["activo", "aprobado"].includes(p.estado)) throw new ErrorPanel("La cuenta no puede ser Director");
    this.gente.filter((g) => g.rol === "director").forEach((g) => (g.rol = "colaborador"));
    p.rol = "director"; p.estado = "activo";
    this.permisos.filter((x) => x.usuario_id === id).forEach((x) => (x.activo = false));
    this.auditar("designar_director", "perfil", id);
  }
  async dispositivosDe(id: string) { await espera(); return this.perfil.rol === "admin" ? this.dispositivos.filter((d) => d.usuario_id === id) : []; }
  async reportarPerdido(dispositivoId: string) {
    await espera();
    const d = this.dispositivos.find((x) => x.id === dispositivoId);
    if (!d) throw new ErrorPanel("Dispositivo no encontrado");
    d.activo = false; d.reportado_perdido_en = ahora();
    this.auditar("dispositivo_perdido", "seguridad", dispositivoId);
  }

  // ------------------------------------------------------------------------------------------- P-37

  async catalogoPermisos(): Promise<DefPermiso[]> {
    await espera();
    return Object.values(PERMISOS).map((p) => ({ codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion, riesgo: p.riesgo,
      requiere_2fa: p.riesgo === "alto", acepta_zonas: p.aceptaZonas }));
  }
  async permisosDe(id: string) { await espera(); return this.permisos.filter((p) => p.usuario_id === id && p.activo).map((p) => ({ ...p })); }
  async plantillas() { await espera(); return this.plantillasL.map((p) => ({ ...p, codigos: [...p.codigos] })); }
  async zonas() { await espera(); return [...this.zonasL]; }
  async fijarPermiso(usuario: string, codigo: string, activo: boolean, vence: string | null, zonas: string[] | null, motivo: string | null) {
    await espera();
    const def = PERMISOS[codigo];
    if (!def) throw new ErrorPanel(`Permiso desconocido: ${codigo}`);
    if (this.persona(usuario).rol !== "colaborador") throw new ErrorPanel("Los permisos opcionales son solo para colaboradores");
    if (zonas && !def.aceptaZonas) throw new ErrorPanel(`El permiso ${codigo} no se puede limitar a una zona`);
    if (activo && def.riesgo === "alto" && !vence) throw new ErrorPanel(`M3: el permiso ${codigo} es de riesgo alto y necesita fecha de vencimiento (máximo 90 días)`);
    const actual = this.permisos.find((p) => p.usuario_id === usuario && p.codigo === codigo && p.activo);
    if (!activo) { if (actual) actual.activo = false; }
    else if (actual) Object.assign(actual, { vence_en: vence, zonas, motivo, otorgado_por: this.perfil.id, otorgado_en: ahora() });
    else this.permisos.push({ id: uuid(), usuario_id: usuario, codigo, otorgado_por: this.perfil.id, otorgado_en: ahora(), vence_en: vence, zonas, motivo, activo: true });
    this.auditar("permiso", "perfil", usuario, { codigo, activo, vence, zonas, motivo });
  }
  async aplicarPlantilla(usuario: string, nombre: string, vence: string | null, zonas: string[] | null) {
    const pl = this.plantillasL.find((p) => p.nombre === nombre);
    if (!pl) throw new ErrorPanel("Plantilla desconocida");
    for (const c of pl.codigos) {
      await this.fijarPermiso(usuario, c, true, vence, pl.limitar_a_zona && zonas && PERMISOS[c]?.aceptaZonas ? zonas : null, `Plantilla: ${nombre}`);
    }
  }

  // ------------------------------------------------------------------------------------------- P-41

  async auditoria(f: FiltrosAuditoria, pagina: number, tecnica: boolean) {
    await espera();
    const visibles = this.auditoriaL.filter((a) =>
      (this.perfil.rol === "admin" || !["seguridad", "sesion"].includes(a.entidad)) &&
      (!f.desde || a.creado_en >= `${f.desde}T05:00:00Z`) &&
      (!f.hasta || a.creado_en <= new Date(new Date(`${f.hasta}T05:00:00Z`).getTime() + 86400000).toISOString()) &&
      (!f.usuario || a.usuario_id === f.usuario) && (!f.accion || a.accion === f.accion) &&
      (!f.registro || a.entidad_id === f.registro.trim()));
    const filas = visibles.slice(pagina * 50, pagina * 50 + 50).map((a) => (tecnica ? { ...a } : { ...a, ip: undefined, hash: undefined }));
    return { filas, hayMas: visibles.length > (pagina + 1) * 50 };
  }
  async exportarAuditoria(f: FiltrosAuditoria, motivo: string) {
    this.exigirAdmin();
    if (motivo.trim().length < 5) throw new ErrorPanel("Escriba el motivo de la exportación");
    const { filas } = await this.auditoria(f, 0, true);
    const nombres = new Map(this.gente.map((g) => [g.id, g.nombre_completo]));
    this.auditar("exportar", "seguridad", "auditoria", { motivo, filas: filas.length });
    return filas.map((a) => ({ ...a, usuario: a.usuario_id ? nombres.get(a.usuario_id) ?? null : null }));
  }
  async verificarCadena() { await espera(400); this.exigirAdmin(); return { integra: true, revisados: this.auditoriaL.length }; }

  // ------------------------------------------------------------------------------------------- P-42

  async configuracion() { await espera(); return this.config.map((c) => ({ ...c })); }
  async guardarConfig(clave: string, valor: unknown) {
    await espera();
    this.exigirAdmin();
    const c = this.config.find((x) => x.clave === clave);
    if (!c) throw new ErrorPanel(`Valor de configuración desconocido: ${clave}`);
    if (clave === "ultimo_respaldo") throw new ErrorPanel("Este valor lo escribe el sistema");
    if (typeof valor !== typeof c.valor || Array.isArray(valor) !== Array.isArray(c.valor)) throw new ErrorPanel("El valor debe ser del mismo tipo que el actual");
    if (typeof valor === "number" && valor < 0 && !clave.startsWith("centro_")) throw new ErrorPanel("El valor no puede ser negativo");
    const antes = c.valor;
    c.valor = valor; c.actualizado_en = ahora();
    this.auditar("configuracion", "configuracion", clave, { antes, despues: valor });
  }
  async catalogos() { await espera(); return this.opciones.map((o) => ({ ...o })); }
  async guardarOpcion(catalogo: string, clave: string, etiqueta: string, orden: number, activo: boolean) {
    await espera();
    this.exigirAdmin();
    if (!/^[a-z0-9_+-]{1,40}$/.test(clave)) throw new ErrorPanel("La clave usa minúsculas, números y guion bajo (máximo 40)");
    if (!etiqueta.trim()) throw new ErrorPanel("Escriba el nombre que verá el equipo (máximo 120 caracteres)");
    const sistema = ["C-01", "C-02", "C-09", "C-10", "C-11", "C-18"].includes(catalogo);
    const o = this.opciones.find((x) => x.catalogo === catalogo && x.clave === clave);
    if (sistema && !o) throw new ErrorPanel(`El catálogo ${catalogo} es del sistema: no se le agregan opciones`);
    if (sistema && !activo) throw new ErrorPanel(`El catálogo ${catalogo} es del sistema: sus opciones no se desactivan`);
    if (o) Object.assign(o, { etiqueta: etiqueta.trim(), orden, activo });
    else this.opciones.push({ id: this.opciones.length + 1, catalogo, clave, etiqueta: etiqueta.trim(), orden, activo });
    this.auditar("catalogo", "configuracion", `${catalogo}:${clave}`, { etiqueta, orden, activo });
  }
  async textos() { await espera(); return this.textosL.map((t) => ({ ...t })); }
  async publicarTexto(tipo: string, version: string, contenido: string, aprobado: boolean) {
    await espera();
    this.exigirAdmin();
    if (!/^[A-Za-z0-9._-]{1,30}$/.test(version)) throw new ErrorPanel("La versión usa letras, números, punto o guion (por ejemplo v2 o 2027-02)");
    if (contenido.trim().length < 20) throw new ErrorPanel("El texto debe tener entre 20 y 60.000 caracteres");
    if (this.textosL.some((t) => t.tipo === tipo && t.version === version)) throw new ErrorPanel(`Ya existe la versión ${version} de ese texto: use un número nuevo`);
    this.textosL.filter((t) => t.tipo === tipo).forEach((t) => (t.vigente = false));
    const id = uuid();
    this.textosL.unshift({ id, tipo, version, contenido, vigente: true, es_borrador: !aprobado, creado_en: ahora() });
    this.auditar("texto_legal", "configuracion", id, { tipo, version, aprobado_abogado: aprobado });
  }
  async guardarPlantilla(nombre: string, codigos: string[], limitarAZona: boolean) {
    await espera();
    this.exigirAdmin();
    if (nombre.trim().length < 3) throw new ErrorPanel("El nombre tiene entre 3 y 80 caracteres");
    const p = this.plantillasL.find((x) => x.nombre === nombre.trim());
    const limpio = [...new Set(codigos)].sort();
    if (p) Object.assign(p, { codigos: limpio, limitar_a_zona: limitarAZona });
    else this.plantillasL.push({ nombre: nombre.trim(), codigos: limpio, limitar_a_zona: limitarAZona });
    this.auditar("plantilla", "configuracion", nombre, { codigos: limpio });
  }
  async eliminarPlantilla(nombre: string) {
    await espera();
    this.exigirAdmin();
    this.plantillasL = this.plantillasL.filter((p) => p.nombre !== nombre);
    this.auditar("plantilla_eliminada", "configuracion", nombre);
  }

  // ------------------------------------------------------------------------------------------- P-43

  async salud(): Promise<Salud> {
    await espera(300);
    this.exigirAdmin();
    const nombres = new Map(this.gente.map((g) => [g.id, g.nombre_completo]));
    return {
      generado_en: ahora(),
      usuarios: { activos: 5, pendientes: 2, aprobados_sin_ingreso: 1, suspendidos: 1, usaron_app_7_dias: 4 },
      errores: { ultimo_dia: 2, ultima_semana: 7, recientes: [
        { creado_en: haceDias(0, 3), version_app: "0.10.0", pantalla: "visita", mensaje: "No se pudo comprimir la foto" },
        { creado_en: haceDias(0, 20), version_app: "0.11.0", pantalla: "mapa", mensaje: "Tiempo de espera del GPS" },
      ] },
      sincronizacion: { registros_por_enviar: 4, telefonos_atrasados: 1 },
      recursos: { base_mb: 38.4, base_pct: 7.7, archivos_mb: 212.5, archivos_pct: 20.8, alerta: false, errores_ultimo_dia: 2, dispositivos_con_cola: 1 },
      seguridad: { registros_fallidos_24h: 3, formularios_publicos_24h: 5, alertas_abiertas: { servidor_publico_o_contratista: 1, fuera_de_zona: 2 },
                   exportaciones_7_dias: 1, accesos_completos_24h: 6 },
      respaldo: this.config.find((c) => c.clave === "ultimo_respaldo")?.valor as Salud["respaldo"],
      versiones: [{ version: "0.11.0", telefonos: 3 }, { version: "0.10.0", telefonos: 1 }],
      version_minima: String(this.config.find((c) => c.clave === "version_minima_app")?.valor ?? "0.10.0"),
      titulares: { pendientes: 2, vencidas_plazo_interno: 1, vencidas_plazo_legal: 0 },
      perdidos: this.dispositivos.filter((d) => d.reportado_perdido_en).map((d) => ({
        id: d.id, usuario: nombres.get(d.usuario_id) ?? "", modelo: d.modelo, reportado_perdido_en: d.reportado_perdido_en!,
        ultimo_acceso: d.ultimo_acceso, se_conecto_despues: false })),
      flota: this.dispositivos.filter((d) => d.activo).map((d) => ({
        id: d.id, usuario: nombres.get(d.usuario_id) ?? "", modelo: d.modelo, version_app: d.version_app, ultimo_acceso: d.ultimo_acceso,
        cola_pendiente: d.cola_pendiente, ultima_sincronizacion: d.ultima_sincronizacion, espacio_libre_mb: d.espacio_libre_mb, bateria_pct: d.bateria_pct })),
      auditoria_24h: 12,
    };
  }
  async latenciaMs() { await espera(80); return 80 + Math.round(Math.random() * 60); }

  // ------------------------------------------------------------------------------------------- P-35

  async solicitudes() { await espera(); return this.solicitudesL.map((s) => ({ ...s })); }
  async resolverSolicitud(id: string, estado: string, respuesta: string) {
    await espera();
    const s = this.solicitudesL.find((x) => x.id === id);
    if (!s) throw new ErrorPanel("Solicitud no encontrada");
    if (!["en_proceso", "resuelta", "rechazada"].includes(estado)) throw new ErrorPanel("Estado no válido");
    Object.assign(s, { estado, respuesta, resuelta_en: estado === "en_proceso" ? null : ahora() });
    this.auditar("resolver_titular", "solicitud", id, { estado });
  }

  async puntosMapa() { await espera(); return [...this.puntos]; }

  async casa(id: string): Promise<CasaPanel | null> {
    await espera();
    const i = this.puntos.findIndex((p) => p.id === id);
    if (i < 0) return null;
    const p = this.puntos[i];
    const urbano = p.zona_id === "z-centro";
    const vivienda = { id, lat: p.lat, lng: p.lng, estado: p.estado, zona_urbana_rural: urbano ? "urbana" : "rural",
      direccion: urbano ? `Calle ${3 + (i % 9)} # ${2 + (i % 7)}-${10 + (i % 40)}` : null, nombre_finca: urbano ? null : ["La Esperanza", "El Mirador", "Buenavista"][i % 3],
      barrio_vereda: urbano ? "El Centro" : "Vereda La Mina", tipo_vivienda: urbano ? "casa_urbana" : "finca_rural", tenencia: ["propia", "arrendada"][i % 2],
      servicios: urbano ? ["agua_acueducto", "energia", "alcantarillado", "internet"] : ["agua_nacimiento", "energia", "pozo_septico"],
      via_acceso: urbano ? "pavimentada" : "destapada", fuente_ubicacion: "gps", precision_m: 6 + (i % 9) };
    if (p.estado === "por_visitar") return { datos: { vivienda, hogares: [], personas: [], visitas: [], necesidades: [], fotos: [] }, fotos: [] };
    const familia = [["María Elena", "Ospina", "mujer", 52, "caficultor"], ["José Gildardo", "Ospina", "hombre", 55, "jornalero"],
                     ["Juliana", "Ospina", "mujer", 21, "estudiante"], ["Samuel", "Ospina", "hombre", 9, null]] as const;
    const personas = familia.map(([n, a, s, e, o], k) => ({ id: `${id}-p${k}`, vivienda_id: id, nombre_visible: `${n} ${a}`, edad_anios: e, sexo: s,
      ocupacion: o, cedula_ult3: e >= 18 ? String(200 + i + k).slice(-3) : null, telefono_ult4: k === 0 ? String(3000 + i) : null,
      vota_en_pijao: e >= 18 ? "si" : null, interes_info: k === 0, tiene_contacto_autorizado: k === 0, estado: p.estado === "no_contactar" ? "no_contactar" : "activa" }));
    const hogares = [{ id: `${id}-h`, vivienda_id: id, total_personas: 4, mujeres: 2, hombres: 2, edades: { "6-12": 1, "18-24": 1, "45-54": 1, "55-64": 1 },
      sosten_persona_id: personas[0].id, sosten_relacion: "madre", jefatura_femenina: true, votantes_pijao_est: 3, futuros_primeros_votantes: 0 }];
    const visitas = [{ id: `${id}-x1`, vivienda_id: id, fecha: new Date(Date.now() - (i % 20) * 86400000).toISOString(),
      resultado: p.estado === "visitada_sin_contacto" ? "nadie_en_casa" : p.estado === "requiere_seguimiento" ? "pidio_volver" : "conversacion_completa",
      calidad: ["verde", "verde", "amarillo"][i % 3], notas: "Familia amable; pidió información sobre el programa.", seguimiento_requerido: p.estado === "requiere_seguimiento" }];
    const necesidades = [{ id: `${id}-n1`, vivienda_id: id, tema: ["vias_movilidad", "agua_ambiente", "empleo_emprendimiento", "salud"][i % 4], prioridad: 1,
      texto: "La familia lo contó durante la visita (ejemplo).", estado: "recibida" }];
    return { datos: { vivienda, hogares, personas, visitas, necesidades, fotos: [] }, fotos: [{ id: `${id}-f`, tipo: "fachada", url: fotoEjemplo(i) }] };
  }

  // ------------------------------------------------------------------------------------------- Fase 3 (ejemplo)

  private sosL: AlertaSos[] = [{ id: "sos-1", nombre: "Colaboradora de ejemplo", celular: "3000000000", emergencia: "Contacto de ejemplo", emergencia_celular: "3110000000",
    lat: 4.3338, lng: -75.7049, nota: "SOS desde la app", creada_en: new Date(Date.now() - 6 * 60_000).toISOString(), atendida_en: null }];
  private incidentesL: IncidentePanel[] = [
    { id: "inc-1", tipo: "rumor_desinformacion", descripcion: "Circula un audio falso sobre la campaña en la vereda.", lat: null, lng: null, estado: "abierto", resolucion: null, creado_en: new Date(Date.now() - 3 * 3600_000).toISOString() },
    { id: "inc-2", tipo: "dano_propaganda", descripcion: "Pendón roto en la entrada del pueblo.", lat: 4.334, lng: -75.703, estado: "resuelto", resolucion: "Se reemplazó.", creado_en: new Date(Date.now() - 50 * 3600_000).toISOString() },
  ];
  private necesidadesL: NecesidadPanel[] = [
    { id: "nec-1", tema: "vias_movilidad", texto: "Arreglar la vía a la vereda", alcance: "colectiva", estado: "recibida", prioridad: 1, desea_respuesta: true, creado_en: new Date(Date.now() - 86400_000).toISOString() },
    { id: "nec-2", tema: "agua_ambiente", texto: "Agua potable todo el día", alcance: "colectiva", estado: "clasificada", prioridad: 1, desea_respuesta: false, creado_en: new Date(Date.now() - 2 * 86400_000).toISOString() },
    { id: "nec-3", tema: "empleo_emprendimiento", texto: "Trabajo para los jóvenes", alcance: "hogar", estado: "recibida", prioridad: 2, desea_respuesta: true, creado_en: new Date(Date.now() - 3 * 86400_000).toISOString() },
  ];
  private alertasL: AlertaCalidadPanel[] = [
    { id: "al-1", tipo: "posible_duplicado", severidad: "baja", detalle: {}, creada_en: new Date(Date.now() - 5 * 3600_000).toISOString(), resuelta_en: null, resolucion: null },
    { id: "al-2", tipo: "distancia_excedida", severidad: "media", detalle: { metros: 85 }, creada_en: new Date(Date.now() - 9 * 3600_000).toISOString(), resuelta_en: null, resolucion: null },
  ];

  async seguridad(): Promise<Seguridad> {
    await espera();
    return { jornadas: [{ id: "j-1", usuario_id: "c-1", nombre: "Colaboradora de ejemplo", celular: "3000000000", inicio: new Date(Date.now() - 2 * 3600_000).toISOString(),
      lat: 4.3338, lng: -75.7049, visto_en: new Date(Date.now() - 4 * 60_000).toISOString() }], sos: this.sosL.map((x) => ({ ...x })) };
  }
  async atenderSos(id: string) { await espera(); const s = this.sosL.find((x) => x.id === id); if (s) s.atendida_en = ahora(); this.auditar("atender_sos", "seguridad", id, {}); }
  async incidentes() { await espera(); return this.incidentesL.map((x) => ({ ...x })); }
  async estadoIncidente(id: string, estado: string, resolucion: string) {
    await espera();
    const x = this.incidentesL.find((i) => i.id === id);
    if (!x) throw new ErrorPanel("Incidente no encontrado");
    Object.assign(x, { estado, resolucion: resolucion || x.resolucion });
  }
  async necesidades() { await espera(); return this.necesidadesL.map((x) => ({ ...x })); }
  async estadoNecesidad(id: string, estado: string) { await espera(); const x = this.necesidadesL.find((n) => n.id === id); if (x) x.estado = estado; }
  async alertasCalidad() { await espera(); return this.alertasL.map((x) => ({ ...x })); }
  async resolverAlerta(id: string, resolucion: string) { await espera(); const x = this.alertasL.find((a) => a.id === id); if (x) Object.assign(x, { resuelta_en: ahora(), resolucion }); }
  async cumpleanerosHoy(): Promise<CumpleaneroPanel[]> { await espera(); return [{ id: "p-1", nombre: "Persona de ejemplo", edad: 52, contactable: true }]; }

  private tareasL: TareaPanel[] = [
    { id: "t-1", titulo: "Volver a la casa del km 5", descripcion: "Pidió que volvieran el sábado.", tipo: "seguimiento", estado: "pendiente", prioridad: "alta",
      fecha_limite: new Date(Date.now() - 86400_000).toISOString(), asignado_a: null, creado_en: new Date(Date.now() - 3 * 86400_000).toISOString() },
  ];
  async tareasEquipo() { await espera(); return this.tareasL.map((x) => ({ ...x })); }
  async crearTarea(t: NuevaTarea) {
    await espera();
    if (t.titulo.trim().length < 3) throw new ErrorPanel("Escriba un título.");
    this.tareasL.unshift({ id: `t-${this.tareasL.length + 1}`, ...t, estado: "pendiente", creado_en: ahora() });
  }
  async informe(desde: string): Promise<InformePanel> {
    await espera();
    return { desde, visitas: 18, verdes: 14, amarillas: 3, rojas: 1, viviendas_nuevas: 12, personas_nuevas: 21, alertas_abiertas: 2, incidentes_abiertos: 1, sos_sin_atender: 1,
      tareas_vencidas: 1, colaboradores_activos: 4, necesidades_por_tema: [{ tema: "vias_movilidad", n: 7 }, { tema: "agua_ambiente", n: 4 }, { tema: "empleo_emprendimiento", n: 3 }] };
  }

  private eventosL: EventoPanel[] = [{ id: "ev-1", titulo: "Encuentro con caficultores", tipo: "reunion_vereda", descripcion: "Escuchar las propuestas del campo.",
    lugar: "Escuela La Mina", inicio: new Date(Date.now() + 2 * 86400_000).toISOString(), fin: null }];
  async eventosEquipo() { await espera(); return this.eventosL.map((x) => ({ ...x })); }
  async guardarEvento(e: NuevoEvento) {
    await espera();
    if (e.titulo.trim().length < 3) throw new ErrorPanel("Escriba el nombre del evento");
    this.eventosL.push({ id: `ev-${this.eventosL.length + 1}`, ...e });
  }
  async cancelarEvento(id: string) { await espera(); this.eventosL = this.eventosL.filter((x) => x.id !== id); }
}
