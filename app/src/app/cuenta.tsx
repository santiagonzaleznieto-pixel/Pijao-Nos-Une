// Estado de la cuenta (4.9): pendiente de aprobación, suspendida o dada de baja. Mientras tanto se puede practicar (P-47).
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Pantalla, Texto } from "@/ui/componentes";

export default function Cuenta() {
  const { perfil, recargarPerfil, sesion, cambiarPractica } = useApp();
  const estado = perfil?.d.estado;
  const texto = estado === "pendiente"
    ? "Su cuenta está pendiente de aprobación del Director. Le avisaremos cuando esté lista."
    : estado === "suspendido" ? "Su cuenta está suspendida. Hable con el Director." : "Su cuenta ya no está activa.";
  return (
    <Pantalla titulo={`Hola, ${perfil?.d.nombre ?? ""}`}>
      <Aviso tipo={estado === "pendiente" ? "info" : "alerta"} texto={texto} />
      {estado === "pendiente" ? (
        <>
          <Texto>Mientras tanto puede practicar con datos de ejemplo. Nada de lo que haga en práctica se envía.</Texto>
          <Boton texto="Entrar al modo práctica" variante="secundario" onPress={() => cambiarPractica(true)} />
        </>
      ) : null}
      <Boton texto="Volver a revisar" variante="suave" onPress={recargarPerfil} />
      <Boton texto="Cerrar sesión" variante="suave" onPress={() => sesion.salir()} />
    </Pantalla>
  );
}
