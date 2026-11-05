// Limpieza de datos personales antes de enviar un reporte de error (17.6, 24.4): ningún registro técnico lleva
// cédulas, teléfonos, correos, coordenadas ni nombres de personas.
export function limpiarDatosPersonales(texto: string | null | undefined): string {
  if (!texto) return "";
  return texto
    .replace(/[^\s@"']+@[^\s@"']+\.[^\s@"']+/g, "[correo]")
    .replace(/-?\d{1,3}\.\d{4,}/g, "[coord]")
    .replace(/(?<!\d)\d{6,12}(?!\d)/g, "[número]")
    .replace(/("(?:primer_nombre|segundo_nombre|primer_apellido|segundo_apellido|apodo|nombre|nombre_visible|direccion|notas|texto|cedula|telefono|correo|simpatia)"\s*:\s*)"[^"]*"/g, '$1"[oculto]"')
    .slice(0, 4000);
}
