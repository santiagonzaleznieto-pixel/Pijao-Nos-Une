// P-16 Mis visitas y pendientes (17.3): borradores, registros por enviar, cuarentena y «Reintentar ahora».
// Diseño de la Fase 2: segmentos, listas con ficha y el botón de reintento abajo.
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { Borrador } from "@/core/visita";
import type { ItemCola } from "@/datos/tipos";
import { borrarBorrador, listarBorradores } from "@/servicios/campo";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Ficha, Fila, ItemLista, Pantalla, Segmentos, Vacio } from "@/ui/componentes";
import { color, fuente, tl } from "@/ui/tema";

const NOMBRE: Record<string, string> = {
  registrar_visita: "Visita", editar_visita: "Edición de visita", solicitud_titular: "Solicitud de datos", no_contactar: "No contactar",
  tarea_estado: "Tarea", anuncio_leido: "Anuncio leído", completar_ingreso: "Curso de ingreso", incidente: "Incidente",
};
const HORA = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" });

export default function Pendientes() {
  const app = useApp();
  const router = useRouter();
  const [borradores, setBorradores] = useState<Borrador[]>([]);
  const [cola, setCola] = useState<ItemCola[]>([]);
  const [vista, setVista] = useState("enviar");
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    if (!app.usuarioId) return;
    (async () => {
      setBorradores(await listarBorradores(app.almacen, app.usuarioId!));
      setCola(await app.almacen.listarCola(app.usuarioId!));
    })();
  }, [app.almacen, app.usuarioId, app.version]);

  const porEnviar = cola.filter((i) => i.estado !== "cuarentena");
  const revisar = cola.filter((i) => i.estado === "cuarentena");
  const viejo = app.cola.masAntiguo && Date.now() - new Date(app.cola.masAntiguo).getTime() > 24 * 3600_000;

  return (
    <Pantalla
      pie={<>
        <Boton texto="Reintentar ahora" icono="refrescar" cargando={sincronizando} onPress={async () => {
          if (app.usuarioId) for (const i of cola.filter((x) => x.estado === "reintento")) await app.almacen.marcarItem(i.id, { siguiente_intento_en: null });
          setSincronizando(true); await app.sincronizar(); setSincronizando(false);
        }} />
        <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoSuave, textAlign: "center" }}>
          {app.ultimaSyncEn ? `Último envío correcto: ${HORA.format(new Date(app.ultimaSyncEn))}` : "Todavía no hay envíos en esta sesión."}
        </Text>
      </>}>
      <Segmentos opciones={[["enviar", `Por enviar · ${porEnviar.length}`], ["borradores", `Borradores · ${borradores.length}`], ["revisar", `Revisar · ${revisar.length}`]]}
        valor={vista} onCambio={setVista} />
      {!app.conectado ? <Aviso tipo="alerta" icono="sinsenal" texto="Sin señal. Las visitas están seguras en el teléfono y se enviarán solas." /> : null}
      {viejo ? <Aviso tipo="alerta" texto="Tiene registros sin enviar desde hace más de 24 horas. Busque señal o Wi-Fi y toque «Reintentar ahora»." /> : null}

      {vista === "enviar" ? (porEnviar.length ? (
        <View>
          {porEnviar.map((i, n) => (
            <ItemLista key={i.id} titulo={NOMBRE[i.tipo] ?? i.tipo} ultimo={n === porEnviar.length - 1}
              detalle={`${HORA.format(new Date(i.creado_en))} · ${i.estado === "reintento" ? `error, reintentando (${i.intentos})` : "guardado en el teléfono"}`}
              izquierda={<Ficha icono={i.estado === "reintento" ? "alerta" : "nube"} tono={i.estado === "reintento" ? "naranja" : "azul"} />} />
          ))}
        </View>
      ) : <Vacio icono="check" tono="verde" titulo="Todo enviado" texto="No hay nada pendiente por enviar." />) : null}

      {vista === "borradores" ? (borradores.length ? (
        <View>
          {borradores.map((b, n) => (
            <View key={b.id} style={{ gap: 8, paddingBottom: 12 }}>
              <ItemLista titulo={String(b.vivienda.direccion ?? "Visita sin dirección")} detalle={`Va en el paso ${b.paso + 1}`} izquierda={<Ficha icono="editar" tono="turquesa" />} ultimo />
              <Fila>
                <Boton texto="Continuar" onPress={() => router.push({ pathname: "/visita", params: { borrador: b.id } })} estilo={{ flex: 1 }} />
                <Boton texto="Descartar" variante="peligro" onPress={async () => { await borrarBorrador(app.almacen, b.id); app.avisarCambio(); }} estilo={{ flex: 1 }} />
              </Fila>
              {n < borradores.length - 1 ? <View style={{ height: 1, backgroundColor: color.borde, marginTop: 4 }} /> : null}
            </View>
          ))}
        </View>
      ) : <Vacio icono="editar" titulo="No hay borradores" texto="Si deja una visita a medias, queda aquí para seguirla después." />) : null}

      {vista === "revisar" ? (revisar.length ? (
        <View>
          {revisar.map((i, n) => (
            <ItemLista key={i.id} titulo={NOMBRE[i.tipo] ?? i.tipo} ultimo={n === revisar.length - 1}
              detalle={i.error ?? "El servidor pidió revisarlo."} izquierda={<Ficha icono="exclama" tono="rojo" />} />
          ))}
        </View>
      ) : <Vacio icono="check" tono="verde" titulo="Nada por revisar" texto="Cuando el servidor rechace algo, aparece aquí con el motivo." />) : null}

      <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), lineHeight: tl(20), color: color.textoSuave }}>
        Un registro nunca se borra del teléfono hasta que el servidor confirma que lo recibió. No desinstale la app con registros pendientes.
      </Text>
    </Pantalla>
  );
}
