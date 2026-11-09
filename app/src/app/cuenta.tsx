// Estado de la cuenta (4.9): pendiente de aprobación, suspendida o dada de baja. Mientras tanto se puede practicar (P-47).
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Pantalla, Texto, Vacio } from "@/ui/componentes";

export default function Cuenta() {
  const { perfil, recargarPerfil, sesion, cambiarPractica } = useApp();
  const estado = perfil?.d.estado;
  const pendiente = estado === "pendiente";
  const texto = pendiente
    ? "El Director la revisa y le avisaremos cuando esté lista."
    : estado === "suspendido"
      ? perfil?.d.suspension_automatica
        ? "Se suspendió automáticamente porque pasaron muchos días sin usarla. Pida al Director que la reactive."
        : "Hable con el Director para saber qué sigue."
      : "Esta cuenta ya no está activa.";
  return (
    <Pantalla sinCabecera etiqueta={`Hola, ${perfil?.d.nombre ?? ""}`}>
      <Vacio icono={pendiente ? "reloj" : "candado"} tono={pendiente ? "turquesa" : "naranja"}
        titulo={pendiente ? "Su cuenta está pendiente de aprobación" : estado === "suspendido" ? "Su cuenta está suspendida" : "Cuenta dada de baja"} texto={texto} />
      {perfil?.d.motivo_estado && !perfil.d.suspension_automatica ? <Aviso tipo="info" texto={`Motivo: ${perfil.d.motivo_estado}`} /> : null}
      {perfil?.d.suspension_automatica ? (
        <Aviso tipo="alerta" icono="nube" texto="Las visitas que tenga sin enviar siguen guardadas y cifradas en este teléfono. Se enviarán cuando la cuenta vuelva a estar activa. No desinstale la app." />
      ) : null}
      {pendiente ? (
        <>
          <Texto suave centrado>Mientras tanto puede practicar con datos de ejemplo. Nada de lo que haga en práctica se envía.</Texto>
          <Boton texto="Entrar al modo práctica" icono="play" onPress={() => cambiarPractica(true)} />
        </>
      ) : null}
      <Boton texto="Volver a revisar" variante="contorno" icono="refrescar" onPress={recargarPerfil} />
      <Boton texto="Cerrar sesión" variante="suave" onPress={() => sesion.salir()} />
    </Pantalla>
  );
}
