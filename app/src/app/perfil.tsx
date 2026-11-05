// P-44 Perfil y ajustes (versión básica): datos, contraseña, dispositivos (4.10) y cerrar sesión.
import { useEffect, useState } from "react";
import { cliente, useApp } from "@/servicios/contexto";
import { Aviso, Boton, Campo, Pantalla, Tarjeta, Texto } from "@/ui/componentes";

type D = { id: string; modelo: string | null; ultimo_acceso: string; activo: boolean; version_app: string | null };

export default function Perfil() {
  const app = useApp();
  const [dispositivos, setDispositivos] = useState<D[]>([]);
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    if (app.practica || !app.usuarioId) return;
    cliente.from("dispositivos").select("id, modelo, ultimo_acceso, activo, version_app").eq("usuario_id", app.usuarioId)
      .then(({ data }) => setDispositivos((data ?? []) as D[]));
  }, [app.usuarioId, app.practica]);

  async function cambiarClave() {
    if (clave.length < 12) { setMensaje({ tipo: "error", texto: "La contraseña debe tener al menos 12 caracteres." }); return; }
    const { error } = await cliente.auth.updateUser({ password: clave });
    setMensaje(error ? { tipo: "error", texto: "No se pudo cambiar. Revise la conexión." } : { tipo: "ok", texto: "Contraseña cambiada." });
    setClave("");
  }
  async function perdido(id: string) {
    const { error } = await cliente.rpc("rpc_reportar_perdido", { p_dispositivo: id });
    setMensaje(error ? { tipo: "error", texto: "No se pudo reportar. Intente con conexión." } : { tipo: "ok", texto: "Reportado: ese teléfono borrará sus datos en cuanto se conecte." });
  }
  async function salir() {
    if (app.cola.pendientes) setMensaje({ tipo: "error", texto: `Tiene ${app.cola.pendientes} registro(s) sin enviar. Quedan guardados y cifrados, y se enviarán cuando vuelva a entrar.` });
    await app.sesion.salir();
  }

  return (
    <Pantalla titulo="Mi perfil">
      <Tarjeta>
        <Texto negrita>{app.perfil?.d.nombre}</Texto>
        <Texto>Rol: {app.perfil?.d.rol} · estado: {app.perfil?.d.estado}</Texto>
        <Texto suave>Verificación en dos pasos: {app.perfil?.d.aal === "aal2" ? "activa en esta sesión" : "no verificada en esta sesión"}</Texto>
      </Tarjeta>
      <Campo etiqueta="Nueva contraseña (mínimo 12 caracteres)" value={clave} onChangeText={setClave} secureTextEntry />
      <Boton texto="Cambiar contraseña" variante="secundario" onPress={cambiarClave} deshabilitado={!clave} />
      <Texto negrita>Mis teléfonos (máximo 2)</Texto>
      {dispositivos.map((d) => (
        <Tarjeta key={d.id}>
          <Texto>{d.modelo ?? "Teléfono"} · versión {d.version_app ?? "?"} · {d.activo ? "activo" : "cerrado"}</Texto>
          <Texto suave>Último acceso: {new Date(d.ultimo_acceso).toLocaleString("es-CO")}</Texto>
          {d.activo ? <Boton texto="Reportar perdido o robado" variante="peligro" onPress={() => perdido(d.id)} /> : null}
        </Tarjeta>
      ))}
      {mensaje ? <Aviso tipo={mensaje.tipo} texto={mensaje.texto} /> : null}
      <Boton texto="Cerrar sesión" variante="suave" onPress={salir} />
    </Pantalla>
  );
}
