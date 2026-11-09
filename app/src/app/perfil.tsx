// P-44 Perfil y ajustes: cómo se ve la app (claro, oscuro, sol y letra grande), cuenta y seguridad, teléfonos (4.10) y
// cerrar sesión. Diseño de la Fase 2.
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { apariencia, cambiarApariencia } from "@/servicios/apariencia";
import { cliente, useApp } from "@/servicios/contexto";
import { Aviso, Avatar, Boton, Dato, FilaEnlace, Interruptor, ItemLista, Pantalla, Seccion, Segmentos, Ficha, TituloMedio } from "@/ui/componentes";
import type { Modo } from "@/ui/tema";
import { color, fuente, tl } from "@/ui/tema";
import { fechaHora } from "@/core/formato";

type D = { id: string; modelo: string | null; ultimo_acceso: string; activo: boolean; version_app: string | null };
const ROL: Record<string, string> = { admin: "Administrador", director: "Director", colaborador: "Colaborador o colaboradora" };

export default function Perfil() {
  const app = useApp();
  const router = useRouter();
  const [dispositivos, setDispositivos] = useState<D[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error" | "info"; texto: string } | null>(null);

  useEffect(() => {
    if (app.practica || !app.usuarioId) return;
    cliente.from("dispositivos").select("id, modelo, ultimo_acceso, activo, version_app").eq("usuario_id", app.usuarioId)
      .then(({ data }) => setDispositivos((data ?? []) as D[]));
  }, [app.usuarioId, app.practica]);

  async function cambiar(modo: Modo, letraGrande: boolean) {
    setMensaje({ tipo: "info", texto: "Aplicando el cambio…" });
    const recargo = await cambiarApariencia({ modo, letraGrande });
    if (!recargo) setMensaje({ tipo: "info", texto: "Listo. Cierre la app y vuelva a abrirla para ver el cambio." });
  }
  async function perdido(id: string) {
    const { error } = await cliente.rpc("rpc_reportar_perdido", { p_dispositivo: id });
    setMensaje(error ? { tipo: "error", texto: "No se pudo reportar. Intente con conexión." } : { tipo: "ok", texto: "Reportado: ese teléfono borrará sus datos en cuanto se conecte." });
  }
  async function salir() {
    if (app.cola.pendientes) setMensaje({ tipo: "error", texto: `Tiene ${app.cola.pendientes} registro(s) sin enviar. Quedan guardados y cifrados, y se enviarán cuando vuelva a entrar.` });
    await app.sesion.salir();
  }

  const d = app.perfil?.d;
  const activos = dispositivos.filter((x) => x.activo).length;
  return (
    <Pantalla>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar nombre={d?.nombre} tam={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <TituloMedio>{d?.nombre ?? "Mi perfil"}</TituloMedio>
          <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoSuave }}>
            {ROL[d?.rol ?? ""] ?? d?.rol}{app.practica ? " · modo práctica" : ""}
          </Text>
        </View>
      </View>

      <Seccion titulo="Cómo se ve la app">
        <Text style={{ fontFamily: fuente.texto, fontSize: tl(15), color: color.textoSuave }}>Modo</Text>
        <Segmentos opciones={[["claro", "Claro"], ["oscuro", "Oscuro"], ["sol", "Sol"]]} valor={apariencia.modo}
          onCambio={(m) => { if (m !== apariencia.modo) cambiar(m as Modo, apariencia.letraGrande); }} />
        <Text style={{ fontFamily: fuente.texto, fontSize: tl(14), lineHeight: tl(20), color: color.textoSuave }}>
          «Sol» es de alto contraste, para leer en la calle con mucha luz.
        </Text>
        <Dato etiqueta="Letra grande" ultimo derecha={<Interruptor etiqueta="Letra grande" valor={apariencia.letraGrande} onCambio={(v) => cambiar(apariencia.modo, v)} />} />
      </Seccion>

      <Seccion titulo="Cuenta y seguridad">
        <ItemLista titulo="Cambiar contraseña" izquierda={<Ficha icono="llave" />} onPress={() => router.push("/recuperar")} />
        <ItemLista titulo="Verificación en dos pasos" detalle={d?.aal === "aal2" ? "Activa en esta sesión" : "No verificada en esta sesión"}
          izquierda={<Ficha icono="escudo" tono={d?.aal === "aal2" ? "verde" : "naranja"} />} onPress={() => router.push("/verificacion")} />
        <ItemLista titulo="Mis teléfonos" detalle={app.practica ? "No disponible en práctica" : `${activos} de 2 activos`} izquierda={<Ficha icono="telefono" tono="gris" />} ultimo />
      </Seccion>

      {dispositivos.length ? (
        <Seccion titulo="Teléfonos con mi cuenta">
          {dispositivos.map((x, i) => (
            <View key={x.id} style={{ gap: 8 }}>
              <ItemLista titulo={x.modelo ?? "Teléfono"} detalle={`Versión ${x.version_app ?? "?"} · ${x.activo ? "activo" : "cerrado"} · ${fechaHora(x.ultimo_acceso)}`}
                izquierda={<Ficha icono="telefono" tono={x.activo ? "azul" : "gris"} />} ultimo={i === dispositivos.length - 1 && !x.activo} />
              {x.activo ? <Boton texto="Reportar perdido o robado" variante="peligro" icono="alerta" onPress={() => perdido(x.id)} /> : null}
            </View>
          ))}
        </Seccion>
      ) : null}

      <View style={{ gap: 10 }}>
        <FilaEnlace texto="Carnet digital" icono="qr" onPress={() => router.push("/carnet")} />
        <FilaEnlace texto="Guion y preguntas frecuentes" icono="ayuda" onPress={() => router.push("/guion")} />
        <FilaEnlace texto={app.practica ? "Salir del modo práctica" : "Modo práctica"} icono="play" onPress={() => app.cambiarPractica(!app.practica)} />
      </View>

      {mensaje ? <Aviso tipo={mensaje.tipo} texto={mensaje.texto} /> : null}
      <Boton texto="Cerrar sesión" variante="peligro" icono="salir" onPress={salir} />
    </Pantalla>
  );
}
