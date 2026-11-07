// Textos del sitio en palabras sencillas (sección 3: lenguaje claro, de usted).

export interface TipoSolicitud { clave: string; titulo: string; explicacion: string }

// 16.5: derechos del titular. El orden pone primero lo que la gente más pide.
export const TIPOS_SOLICITUD: readonly TipoSolicitud[] = [
  { clave: "consulta", titulo: "Saber qué datos míos tienen", explicacion: "Le contamos qué información suya guarda la campaña y para qué la usa." },
  { clave: "revocatoria", titulo: "Que no me contacten más", explicacion: "Retira su autorización. Dejamos de contactarle de inmediato." },
  { clave: "supresion", titulo: "Borrar mis datos", explicacion: "Eliminamos su información y le confirmamos cuando esté hecho." },
  { clave: "actualizacion", titulo: "Corregir o actualizar mis datos", explicacion: "Arreglamos lo que esté mal o desactualizado." },
  { clave: "prueba_autorizacion", titulo: "Ver la prueba de lo que autoricé", explicacion: "Le enviamos qué autorizó, cuándo y con qué texto." },
  { clave: "queja", titulo: "Presentar una queja", explicacion: "Sobre el trato recibido o el uso de sus datos." },
];

export const tituloSolicitud = (clave: string | null | undefined) =>
  TIPOS_SOLICITUD.find((t) => t.clave === clave)?.titulo ?? (clave ? humanizar(clave) : "");

export const ESTADO_SOLICITUD: Record<string, string> = {
  recibida: "Recibida",
  en_proceso: "En proceso",
  resuelta: "Resuelta",
  rechazada: "Cerrada sin trámite",
};

export const CANAL_SOLICITUD: Record<string, string> = {
  app: "App (colaborador)",
  formulario: "Formulario «Mis datos»",
  correo: "Correo",
  whatsapp: "WhatsApp",
  presencial: "En persona",
  telefono: "Teléfono",
};

export const ROL: Record<string, string> = { admin: "Administrador", director: "Director", colaborador: "Colaborador" };

export const ESTADO_CUENTA: Record<string, string> = {
  pendiente: "Pendiente de aprobación",
  aprobado: "Aprobada (falta acuerdos y curso)",
  activo: "Activa",
  suspendido: "Suspendida",
  baja: "Dada de baja",
};

export const ESTADO_INVITACION: Record<string, string> = {
  pendiente: "Sin usar",
  usada: "Usada",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

export const TIPO_TEXTO_LEGAL: Record<string, string> = {
  autorizacion: "Texto de autorización (16.4)",
  aviso_privacidad: "Aviso de privacidad (P-53)",
  politica_tratamiento: "Política de tratamiento de datos (P-53)",
  acuerdo_confidencialidad: "Acuerdo de confidencialidad",
  codigo_conducta: "Código de conducta (10.7)",
  guion_visita: "Guion de visita (13.3, lo usa la app en la puerta)",
  preguntas_frecuentes: "Preguntas frecuentes (13.3, en la app)",
};

export const ESTADO_FECHA_LEGAL: Record<string, string> = {
  confirmada: "Confirmada",
  prensa: "Confirmada en prensa",
  pendiente: "Pendiente: la confirma el abogado",
};

// P-41 vista operativa: cada acción de la auditoría en una frase que el Director entienda.
export const ACCION_AUDITORIA: Record<string, string> = {
  invitar: "Creó una invitación",
  aprobar_usuario: "Aprobó una cuenta",
  rechazar_usuario: "Rechazó una solicitud de cuenta",
  suspender_usuario: "Suspendió una cuenta",
  reactivar_usuario: "Reactivó una cuenta",
  suspension_automatica: "Cuenta suspendida automáticamente por inactividad",
  aceptar_acuerdos: "Volvió a aceptar los acuerdos",
  clave_cambiada: "Cambió su contraseña",
  revision_permisos: "Se envió el aviso mensual de revisión de permisos",
  baja_usuario: "Dio de baja una cuenta",
  designar_director: "Designó al Director",
  permiso: "Cambió un permiso",
  completar_ingreso: "Completó el ingreso (acuerdos y curso)",
  registrar_visita: "Registró una visita",
  editar_visita: "Editó una visita",
  registrar_reconocimiento: "Marcó una vivienda en reconocimiento",
  aprobar_diferido: "Aprobó un registro diferido",
  cedula_ya_registrada: "Intentó registrar una cédula que ya existía",
  ver_datos_completos: "Vio datos personales completos",
  asignar_zona: "Asignó una zona",
  guardar_zona: "Guardó una zona",
  eliminar_zona: "Eliminó una zona",
  resolver_alerta: "Resolvió una alerta de calidad",
  reportar_incidente: "Reportó un incidente",
  iniciar_jornada: "Inició jornada",
  terminar_jornada: "Terminó jornada",
  atender_sos: "Atendió un SOS",
  solicitud_titular: "Registró una solicitud de un titular",
  solicitud_titular_publica: "Llegó una solicitud por «Mis datos»",
  resolver_titular: "Respondió una solicitud de un titular",
  prueba_autorizacion: "Generó la prueba de una autorización",
  no_contactar: "Marcó «No contactar»",
  borrado_definitivo: "Borró definitivamente a una persona",
  plan_cierre: "Ejecutó el plan de cierre",
  dispositivo_nuevo: "Conectó un teléfono nuevo",
  dispositivo_perdido: "Reportó un teléfono perdido",
  configuracion: "Cambió un valor de configuración",
  catalogo: "Cambió un catálogo",
  texto_legal: "Publicó un texto legal",
  plantilla: "Guardó una plantilla de permisos",
  plantilla_eliminada: "Eliminó una plantilla de permisos",
  exportar: "Exportó información",
  respaldo: "Se hizo un respaldo",
  sos: "Activó el SOS",
};

// 22.3: nombres sencillos para el tablero del piloto.
export const METRICA_ETIQUETA: Record<string, string> = {
  con_contacto: "Con conversación",
  solo_punto: "Solo el punto (sin contacto)",
  seguimiento: "Visita de seguimiento",
  otro: "Otro",
  baja_precision: "Señal débil (más de la precisión mínima)",
  sin_lectura: "El GPS no respondió",
  sin_permiso: "Sin permiso de ubicación",
  simulada: "Ubicación simulada",
  servidor: "El servidor no respondió",
  sesion: "Sesión vencida",
};
export const etiquetaMetrica = (clave: string) => METRICA_ETIQUETA[clave] ?? humanizar(clave);

export function describirAccion(accion: string): string {
  return ACCION_AUDITORIA[accion] ?? humanizar(accion);
}

export function humanizar(clave: string): string {
  const t = clave.replace(/[_-]+/g, " ").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : "";
}
