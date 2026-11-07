// R-45 y 10.7: volver a aceptar los acuerdos cuando cambian o cada 6 meses. El guardián de la raíz trae aquí a la persona
// solo si hay conexión, para no frenar el trabajo de campo sin señal.
import { useState } from "react";
import { useApp } from "@/servicios/contexto";
import { Aviso } from "@/ui/componentes";
import { LectorAcuerdos } from "@/ui/LectorAcuerdos";
import { View } from "react-native";

export default function Acuerdos() {
  const { sesion, recargarPerfil } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function aceptar(version: string) {
    setError(null);
    setCargando(true);
    try {
      await sesion.aceptarAcuerdos(version);
      await recargarPerfil();
    } catch (e) {
      setError((e as Error).message);
    } finally { setCargando(false); }
  }

  return (
    <View style={{ flex: 1 }}>
      {error ? <Aviso tipo="error" texto={error} /> : null}
      <LectorAcuerdos key={error ?? "acuerdos"} titulo="Acuerdos actualizados" textoBoton="Aceptar y continuar" cargando={cargando}
        introduccion="Los acuerdos cambiaron o pasaron 6 meses desde que los aceptó. Léalos de nuevo para seguir usando la app."
        onAceptar={aceptar} />
    </View>
  );
}
