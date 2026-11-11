// P-34 Reportar un incidente o una irregularidad (C-17, confidencial): amenazas, sospecha de compra de votos por terceros,
// rumores, daño a propaganda, pérdida del teléfono… Funciona sin señal: queda en la cola y se envía después. Solo lo ven el
// Director y el Administrador.
import { useRouter } from "expo-router";
import { useState } from "react";
import { opciones } from "@/core/catalogos";
import { nuevoId } from "@/core/ids";
import { encolarAccion } from "@/servicios/campo";
import { useApp } from "@/servicios/contexto";
import { ubicacionActual } from "@/servicios/jornada";
import { Aviso, Boton, Campo, Casilla, Opciones, Pantalla, Vacio } from "@/ui/componentes";

export default function Incidente() {
  const app = useApp();
  const router = useRouter();
  const [tipo, setTipo] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [conUbicacion, setConUbicacion] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function reportar() {
    if (!tipo) { setError("Elija el tipo de incidente."); return; }
    if (descripcion.trim().length < 10) { setError("Cuente qué pasó con al menos una frase."); return; }
    if (!app.usuarioId) return;
    setEnviando(true);
    const p = conUbicacion ? await ubicacionActual() : null;
    await encolarAccion(app.almacen, app.usuarioId, "incidente", { id: nuevoId(), tipo, descripcion: descripcion.trim(), lat: p?.lat ?? null, lng: p?.lng ?? null });
    app.avisarCambio();
    app.sincronizar();
    setEnviando(false);
    setListo(true);
  }

  if (listo) {
    return (
      <Pantalla>
        <Vacio icono="check" tono="verde" titulo="Incidente reportado" accion="Volver" onAccion={() => router.back()}
          texto={app.conectado ? "Le llega al Director y al Administrador. Si está en peligro, use el botón SOS o llame al 123." : "Quedó guardado y se enviará apenas haya señal. Si está en peligro, llame al 123."} />
      </Pantalla>
    );
  }
  return (
    <Pantalla titulo="Reportar un incidente" subtitulo="Es confidencial: solo lo ven el Director y el Administrador."
      pie={<>{error ? <Aviso tipo="error" texto={error} /> : null}<Boton texto="Enviar reporte" icono="enviar" onPress={reportar} cargando={enviando} /></>}>
      <Opciones etiqueta="¿Qué pasó?" opciones={opciones("C-17")} valor={tipo} onCambio={(v) => setTipo(v as string)} />
      <Campo etiqueta="Cuente lo que pasó" value={descripcion} onChangeText={setDescripcion} multiline
        ayuda="Qué, cuándo y dónde. No escriba nombres ni datos de personas que no sean necesarios." />
      <Casilla texto="Agregar mi ubicación actual" valor={conUbicacion} onCambio={setConUbicacion} />
      <Aviso tipo="info" texto="Si está en peligro, no espere: use SOS (Más → Jornada y seguridad) o llame al 123." />
    </Pantalla>
  );
}
