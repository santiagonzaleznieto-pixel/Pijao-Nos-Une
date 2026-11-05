// P-16 Mis visitas y pendientes (17.3): borradores, registros por enviar, cuarentena y «Reintentar ahora».
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import type { Borrador } from "@/core/visita";
import type { ItemCola } from "@/datos/tipos";
import { borrarBorrador, listarBorradores } from "@/servicios/campo";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Fila, Pantalla, Tarjeta, Texto } from "@/ui/componentes";

const NOMBRE: Record<string, string> = {
  registrar_visita: "Visita", editar_visita: "Edición de visita", solicitud_titular: "Solicitud de datos", no_contactar: "No contactar",
  tarea_estado: "Tarea", anuncio_leido: "Anuncio leído", completar_ingreso: "Curso de ingreso", incidente: "Incidente",
};

export default function Pendientes() {
  const app = useApp();
  const router = useRouter();
  const [borradores, setBorradores] = useState<Borrador[]>([]);
  const [cola, setCola] = useState<ItemCola[]>([]);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    if (!app.usuarioId) return;
    (async () => {
      setBorradores(await listarBorradores(app.almacen, app.usuarioId!));
      setCola(await app.almacen.listarCola(app.usuarioId!));
    })();
  }, [app.almacen, app.usuarioId, app.version]);

  const viejo = app.cola.masAntiguo && Date.now() - new Date(app.cola.masAntiguo).getTime() > 24 * 3600_000;
  return (
    <Pantalla titulo="Mis visitas y pendientes">
      {viejo ? <Aviso tipo="alerta" texto="Tiene registros sin enviar desde hace más de 24 horas. Busque señal o Wi-Fi y toque «Reintentar ahora»." /> : null}
      <Boton texto="Reintentar ahora" cargando={sincronizando} onPress={async () => {
        if (app.usuarioId) for (const i of cola.filter((x) => x.estado === "reintento")) await app.almacen.marcarItem(i.id, { siguiente_intento_en: null });
        setSincronizando(true); await app.sincronizar(); setSincronizando(false);
      }} />
      <Texto negrita>Borradores ({borradores.length})</Texto>
      {borradores.map((b) => (
        <Tarjeta key={b.id}>
          <Texto>{String(b.vivienda.direccion ?? "Visita sin dirección")} · paso {b.paso + 1}</Texto>
          <Fila>
            <Boton texto="Continuar" onPress={() => router.push({ pathname: "/visita", params: { borrador: b.id } })} />
            <Boton texto="Descartar" variante="peligro" onPress={async () => { await borrarBorrador(app.almacen, b.id); app.avisarCambio(); }} />
          </Fila>
        </Tarjeta>
      ))}
      <Texto negrita>Por enviar y por revisar ({cola.length})</Texto>
      {cola.map((i) => (
        <Tarjeta key={i.id}>
          <Texto>{NOMBRE[i.tipo] ?? i.tipo} · {new Date(i.creado_en).toLocaleString("es-CO")}</Texto>
          <Texto suave>{i.estado === "cuarentena" ? "Necesita revisión" : i.estado === "reintento" ? `Error, reintentando (${i.intentos})` : "Guardado en el teléfono"}</Texto>
          {i.error ? <Aviso tipo={i.estado === "cuarentena" ? "error" : "alerta"} texto={i.error} /> : null}
        </Tarjeta>
      ))}
      <Texto suave>Un registro nunca se borra del teléfono hasta que el servidor confirma que lo recibió. No desinstale la app con registros pendientes.</Texto>
    </Pantalla>
  );
}
