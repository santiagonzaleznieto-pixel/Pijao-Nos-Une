// P-08 Inicio con el diseño de la Fase 2 (opción C «Pulso»): panel superior, cuatro cifras que cuentan, el bloque
// «Registrar aquí» y el avance de la campaña con el degradado de la marca. Los datos salen del teléfono (sirve sin señal);
// la lógica es la misma de la Fase 1, solo cambia el aspecto.
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { panelCampana, panelPersonal } from "@/core/estadisticas";
import { param } from "@/core/reglas";
import { listarBorradores } from "@/servicios/campo";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Etiqueta, Fila, Tarjeta } from "@/ui/componentes";
import { Icono, type NombreIcono } from "@/ui/Icono";
import { Aparece, curvaSuave, useConteo, useMovimientoReducido, useToque } from "@/ui/movimiento";
import { color, degradado, fuente, radio, sombra, tl } from "@/ui/tema";

const FECHA = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" });
const miles = (n: number) => n.toLocaleString("es-CO");

function TarjetaCifra({ titulo, valor, icono, fondo, tinta, nota, retraso }: {
  titulo: string; valor: number; icono: NombreIcono; fondo: string; tinta: string; nota?: string; retraso: number;
}) {
  const n = useConteo(valor, retraso + 200);
  return (
    <Aparece retraso={retraso} estilo={[e.cifra, { backgroundColor: fondo }]}>
      <View accessible accessibilityLabel={`${titulo}: ${valor}${nota ? `. ${nota}` : ""}`}>
        <View style={e.cifraCabeza}>
          <Text style={[e.cifraTitulo, { color: tinta }]}>{titulo}</Text>
          <View style={e.cifraChip}><Icono nombre={icono} tam={16} color={tinta} grosor={2.2} /></View>
        </View>
        <Text style={e.cifraValor}>{miles(n)}</Text>
        {nota ? <Text style={[e.cifraNota, { color: tinta }]}>{nota}</Text> : null}
      </View>
    </Aparece>
  );
}

/** Barra que se llena desde la izquierda (transform, no ancho). */
function BarraLlena({ pct, alto, colores, retraso }: { pct: number; alto: number; colores: readonly string[]; retraso: number }) {
  const [ancho, setAncho] = useState(0);
  const v = useRef(new Animated.Value(0)).current;
  const reducido = useMovimientoReducido();
  const lleno = (ancho * Math.max(0, Math.min(100, pct))) / 100;
  useEffect(() => {
    if (!ancho) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: reducido ? 150 : 1100, delay: reducido ? 0 : retraso, easing: curvaSuave, useNativeDriver: true }).start();
  }, [ancho, pct, retraso, reducido, v]);
  return (
    <View onLayout={(ev) => setAncho(ev.nativeEvent.layout.width)} style={{ height: alto, borderRadius: alto / 2, backgroundColor: color.superficiePanel, overflow: "hidden" }}>
      {lleno ? (
        <Animated.View style={{ width: lleno, height: alto, borderRadius: alto / 2, overflow: "hidden", flexDirection: "row",
          transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-lleno / 2, 0] }) }, { scaleX: v }] }}>
          {colores.map((c, i) => <View key={`${c}-${i}`} style={{ flex: 1, backgroundColor: c }} />)}
        </Animated.View>
      ) : null}
    </View>
  );
}

function BloqueRegistrar({ onPress }: { onPress: () => void }) {
  const { escala, alPresionar, alSoltar } = useToque();
  const brillo = useRef(new Animated.Value(0)).current;
  const reducido = useMovimientoReducido();
  useEffect(() => {
    if (reducido) return;
    Animated.timing(brillo, { toValue: 1, duration: 1400, delay: 1600, easing: curvaSuave, useNativeDriver: true }).start();
  }, [brillo, reducido]);
  return (
    <Animated.View style={[{ transform: [{ scale: escala }] }, sombra.accion]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Registrar aquí" onPress={onPress} onPressIn={alPresionar} onPressOut={alSoltar} style={e.registrar}>
        <Animated.View pointerEvents="none" style={[e.brillo, { transform: [{ translateX: brillo.interpolate({ inputRange: [0, 1], outputRange: [-160, 480] }) }, { skewX: "-18deg" }] }]} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={e.registrarIcono}><Icono nombre="pin" tam={22} color={color.sobreNaranja} grosor={2.4} /></View>
          <Text style={e.registrarTexto}>Registrar aquí</Text>
        </View>
        <Icono nombre="derecha" tam={20} color={color.invertida} />
      </Pressable>
    </Animated.View>
  );
}

export default function Inicio() {
  const app = useApp();
  const router = useRouter();
  const [p, setP] = useState<ReturnType<typeof panelPersonal> | null>(null);
  const [c, setC] = useState<ReturnType<typeof panelCampana> | null>(null);
  const [errorAviso, setErrorAviso] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const a = app.almacen;
      const [viviendas, visitas, hogares, personas, necesidades, tareas] = await Promise.all(
        ["viviendas", "visitas", "hogares", "personas", "necesidades", "tareas"].map((t) => a.listar(t)));
      const borradores = app.usuarioId ? (await listarBorradores(a, app.usuarioId)).length : 0;
      setP(panelPersonal({ usuarioId: app.usuarioId ?? "", visitas, tareas, borradores, porEnviar: app.cola.pendientes }));
      setC(panelCampana({ viviendas, visitas, hogares, personas, necesidades, minimo: param(app.params, "grupo_minimo") }));
    })();
  }, [app.almacen, app.usuarioId, app.version, app.cola.pendientes, app.params]);

  const necesita2fa = app.perfil && (app.perfil.esStaff || Object.keys(app.perfil.d.permisos).some((k) => ["O-01", "O-02", "O-05", "O-12", "O-13", "O-16"].includes(k)))
    && app.perfil.d.aal !== "aal2";
  const nombre = app.perfil?.d.nombre?.split(" ")[0] ?? "";
  const cobertura = useConteo(c?.cobertura_pct ?? 0, 900);
  const temas = c?.necesidades_por_tema.slice(0, 3) ?? [];
  const maxTema = Math.max(1, ...temas.map((t) => t.n));
  const cal = p?.calidad_reciente;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.fondo }} contentContainerStyle={{ paddingBottom: 130 }}>
      <View style={e.panel}>
        <Svg width={440} height={150} viewBox="0 0 440 150" style={e.lomas} accessible={false}>
          <Path d="M0 110 C70 78 120 96 180 74 S300 40 440 70" stroke={color.azulOceano} strokeOpacity={0.22} strokeWidth={1.4} fill="none" />
          <Path d="M0 126 C80 94 130 112 192 92 S310 58 440 88" stroke={color.turquesa} strokeOpacity={0.28} strokeWidth={1.4} fill="none" />
          <Path d="M0 142 C90 110 140 128 204 110 S320 76 440 106" stroke={color.verde} strokeOpacity={0.34} strokeWidth={1.4} fill="none" />
        </Svg>
        <Aparece retraso={100}>
          <Etiqueta>{FECHA.format(new Date())}</Etiqueta>
          <Text accessibilityRole="header" style={e.saludo}>Hola, {nombre}</Text>
        </Aparece>
      </View>

      <View style={e.cuerpo}>
        {app.avisos.map((a) => (
          <Tarjeta key={a.id}>
            <Aviso tipo={a.tipo === "dispositivo_nuevo" ? "alerta" : "info"} texto={a.mensaje} />
            {a.tipo === "revision_permisos" ? (
              <Boton texto="Entendido" variante="suave" onPress={() => app.descartarAviso(a.id)} />
            ) : (
              <Fila>
                <Boton texto="Fui yo, entendido" variante="suave" onPress={() => app.descartarAviso(a.id)} estilo={{ flex: 1 }} />
                <Boton texto="No fui yo" variante="secundario" estilo={{ flex: 1 }} onPress={async () => {
                  try { await app.noFuiYo(a); router.push("/recuperar"); } catch (err) { setErrorAviso((err as Error).message); }
                }} />
              </Fila>
            )}
          </Tarjeta>
        ))}
        {errorAviso ? <Aviso tipo="error" texto={errorAviso} /> : null}
        {app.telefonoModificado ? <Aviso tipo="error" texto="Este teléfono parece modificado (rooteado). Por seguridad, avise al Administrador." /> : null}
        {necesita2fa ? <Aviso tipo="alerta" texto="Active la verificación en dos pasos para usar sus permisos de riesgo alto." /> : null}
        {necesita2fa ? <Boton texto="Activar verificación" variante="secundario" onPress={() => router.push("/verificacion")} /> : null}
        {app.cola.cuarentena ? <Aviso tipo="error" texto={`${app.cola.cuarentena} registro(s) necesitan revisión. Toque «Pendientes».`} /> : null}

        <Aparece retraso={200} estilo={e.titulo}>
          <Etiqueta>Su trabajo</Etiqueta>
          <Pressable accessibilityRole="link" onPress={() => router.push("/pendientes")} hitSlop={10}>
            <Text style={e.enlace}>Ver pendientes</Text>
          </Pressable>
        </Aparece>
        <View style={e.cuadricula}>
          <TarjetaCifra titulo="Visitas hoy" valor={p?.hoy ?? 0} icono="casa" fondo={color.tinteAzul} tinta={color.textoAzul} retraso={260} />
          <TarjetaCifra titulo="Esta semana" valor={p?.semana ?? 0} icono="barras" fondo={color.tinteTurquesa} tinta={color.textoTurquesa} retraso={320} />
          <TarjetaCifra titulo="Completas" valor={cal?.verde ?? 0} icono="check" fondo={color.tinteVerde} tinta={color.textoVerde} retraso={380}
            nota={`${cal?.amarillo ?? 0} por revisar · ${cal?.rojo ?? 0} incompletas`} />
          <TarjetaCifra titulo="Por enviar" valor={p?.por_enviar ?? 0} icono="subir" fondo={color.tinteNaranja} tinta={color.textoNaranja} retraso={440}
            nota={`${p?.borradores ?? 0} borradores · ${p?.tareas_vencidas ?? 0} tareas vencidas`} />
        </View>

        <Aparece retraso={520}><BloqueRegistrar onPress={() => router.push("/registrar")} /></Aparece>

        <Aparece retraso={600} estilo={e.seccion}>
          <View style={e.titulo}>
            <Etiqueta>Campaña en Pijao</Etiqueta>
            <Text style={e.apoyo}>{app.ultimaSyncEn ? "Actualizado" : "Sin actualizar"}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 10 }}>
            <Text style={e.grande}>{cobertura} %</Text>
            <Text style={e.apoyo}>de cobertura</Text>
          </View>
          <View style={{ marginTop: 12 }}><BarraLlena pct={c?.cobertura_pct ?? 0} alto={12} colores={degradado} retraso={900} /></View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <View style={{ flex: 1 }}><Text style={e.mediana}>{miles(c?.viviendas_conocidas ?? 0)}</Text><Text style={e.apoyo}>viviendas conocidas</Text></View>
            <View style={{ flex: 1 }}><Text style={e.mediana}>{miles(c?.hogares ?? 0)}</Text><Text style={e.apoyo}>hogares</Text></View>
          </View>
          {temas.length ? (
            <View style={{ marginTop: 16, gap: 12 }}>
              <Text style={e.subtitulo}>Lo que más piden</Text>
              {temas.map((t, i) => (
                <View key={t.tema} style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={e.texto}>{t.tema.replace(/_/g, " ")}</Text>
                    <Text style={e.textoFuerte}>{t.texto}</Text>
                  </View>
                  <BarraLlena pct={(t.n / maxTema) * 100} alto={6} colores={[[color.grafico1, color.grafico3, color.grafico4][i]]} retraso={1050 + i * 100} />
                </View>
              ))}
            </View>
          ) : null}
          <Text style={[e.apoyo, { marginTop: 14 }]}>Solo cuentan los registros completos. Los grupos pequeños se muestran como «menos de 5».</Text>
        </Aparece>

        <Aparece retraso={680}>
          <Pressable accessibilityRole="button" onPress={() => router.push("/guion")} style={({ pressed }) => [e.filaEnlace, pressed && { transform: [{ scale: 0.98 }] }]}>
            <Icono nombre="libro" tam={22} color={color.texto} />
            <Text style={[e.subtitulo, { flex: 1, fontSize: tl(15) }]}>Guion de visita y preguntas frecuentes</Text>
            <Icono nombre="derecha" tam={18} color={color.textoSuave} />
          </Pressable>
        </Aparece>
        <Boton texto="Sincronizar ahora" variante="suave" onPress={app.sincronizar} />
      </View>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  panel: { backgroundColor: color.superficiePanel, borderBottomLeftRadius: radio.panel, borderBottomRightRadius: radio.panel, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24, overflow: "hidden" },
  lomas: { position: "absolute", left: 0, bottom: -18, opacity: 0.9 },
  saludo: { fontFamily: fuente.titulo, fontSize: tl(30), lineHeight: tl(34), letterSpacing: -0.3, color: color.texto, marginTop: 6 },
  cuerpo: { paddingHorizontal: 18, paddingTop: 20, gap: 16 },
  titulo: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  enlace: { fontFamily: fuente.tituloMedio, fontSize: tl(14), color: color.azulOceano },
  cuadricula: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: -6 },
  cifra: { width: "48.5%", flexGrow: 1, flexBasis: "45%", borderRadius: radio.l, padding: 16 },
  cifraCabeza: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cifraTitulo: { fontFamily: fuente.tituloMedio, fontSize: tl(13) },
  cifraChip: { width: 28, height: 28, borderRadius: radio.s, backgroundColor: color.fondo, alignItems: "center", justifyContent: "center" },
  cifraValor: { fontFamily: fuente.titulo, fontSize: tl(40), lineHeight: tl(44), color: color.texto, marginTop: 10, fontVariant: ["tabular-nums"] },
  cifraNota: { fontFamily: fuente.texto, fontSize: tl(12), lineHeight: tl(17), marginTop: 4 },
  registrar: { minHeight: 66, borderRadius: radio.seccion, backgroundColor: color.azul, paddingLeft: 12, paddingRight: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", overflow: "hidden" },
  registrarIcono: { width: 44, height: 44, borderRadius: radio.m, backgroundColor: color.naranja, alignItems: "center", justifyContent: "center" },
  registrarTexto: { fontFamily: fuente.tituloFuerte, fontSize: tl(17), color: color.invertida },
  brillo: { position: "absolute", top: 0, bottom: 0, width: 110, backgroundColor: "rgba(255,255,255,0.16)" },
  seccion: { borderWidth: 1, borderColor: color.borde, borderRadius: radio.seccion, padding: 16 },
  grande: { fontFamily: fuente.titulo, fontSize: tl(44), lineHeight: tl(48), color: color.texto, fontVariant: ["tabular-nums"] },
  mediana: { fontFamily: fuente.titulo, fontSize: tl(22), lineHeight: tl(28), color: color.texto, fontVariant: ["tabular-nums"] },
  subtitulo: { fontFamily: fuente.tituloFuerte, fontSize: tl(14), color: color.texto },
  texto: { fontFamily: fuente.texto, fontSize: tl(14), color: color.texto, textTransform: "capitalize" },
  textoFuerte: { fontFamily: fuente.textoFuerte, fontSize: tl(14), color: color.texto },
  apoyo: { fontFamily: fuente.texto, fontSize: tl(13), lineHeight: tl(18), color: color.textoSuave },
  filaEnlace: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 16, borderRadius: 18, backgroundColor: color.superficie },
});
