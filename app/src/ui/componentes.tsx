// Componentes base con el sistema de diseño de la Fase 2 (opción C «Pulso»). Mismas props que en la Fase 1: las pantallas
// cambian de aspecto sin tocar su lógica. Todo usa el tema central (tema.ts) y el movimiento común (movimiento.tsx).
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icono, type NombreIcono } from "./Icono";
import { Aparece, useToque } from "./movimiento";
import { color, espacio, fuente, letra, radio, toque } from "./tema";

export function Pantalla({ titulo, children, desplazable = true, pie }: { titulo?: string; children: ReactNode; desplazable?: boolean; pie?: ReactNode }) {
  const contenido = (
    <Aparece estilo={{ gap: espacio.m }}>
      {titulo ? <Text accessibilityRole="header" style={e.titulo}>{titulo}</Text> : null}
      {children}
    </Aparece>
  );
  return (
    <SafeAreaView style={e.raiz} edges={["top", "left", "right"]}>
      {desplazable ? <ScrollView contentContainerStyle={e.contenido} keyboardShouldPersistTaps="handled">{contenido}</ScrollView>
        : <View style={[e.contenido, { flex: 1 }]}>{contenido}</View>}
      {pie ? <View style={e.pie}>{pie}</View> : null}
    </SafeAreaView>
  );
}

type Variante = "principal" | "secundario" | "peligro" | "suave" | "registrar";
const estiloBoton: Record<Variante, { fondo: string; texto: string; borde?: string }> = {
  principal: { fondo: color.azul, texto: color.blanco },
  secundario: { fondo: color.fondo, texto: color.texto, borde: color.bordeControl },
  peligro: { fondo: color.fondo, texto: color.textoRojo, borde: color.textoRojo },
  suave: { fondo: color.superficie, texto: color.texto },
  registrar: { fondo: color.naranja, texto: color.sobreNaranja },
};

export function Boton({ texto, onPress, variante = "principal", deshabilitado, cargando, estilo }: {
  texto: string; onPress: () => void; variante?: Variante; deshabilitado?: boolean; cargando?: boolean; estilo?: ViewStyle;
}) {
  const inactivo = deshabilitado || cargando;
  const v = estiloBoton[variante];
  const { escala, alPresionar, alSoltar } = useToque();
  return (
    <Animated.View style={[{ transform: [{ scale: escala }] }, estilo]}>
      <Pressable
        accessibilityRole="button" accessibilityLabel={texto} accessibilityState={{ disabled: inactivo }} disabled={inactivo} onPress={onPress}
        onPressIn={alPresionar} onPressOut={alSoltar}
        style={[e.boton, { backgroundColor: v.fondo, opacity: inactivo ? 0.45 : 1 }, v.borde ? { borderWidth: 1.5, borderColor: v.borde } : null]}
      >
        {cargando ? <ActivityIndicator color={v.texto} /> : <Text style={[e.botonTexto, { color: v.texto }]}>{texto}</Text>}
      </Pressable>
    </Animated.View>
  );
}

export function Campo({ etiqueta, error, ayuda, ...props }: TextInputProps & { etiqueta: string; error?: string | null; ayuda?: string }) {
  const [foco, setFoco] = useState(false);
  return (
    <View style={e.campo}>
      <Text style={e.etiqueta}>{etiqueta}</Text>
      <TextInput accessibilityLabel={etiqueta} placeholderTextColor={color.textoSuave} {...props}
        onFocus={(ev) => { setFoco(true); props.onFocus?.(ev); }} onBlur={(ev) => { setFoco(false); props.onBlur?.(ev); }}
        style={[e.entrada, props.multiline && { minHeight: 104, textAlignVertical: "top", paddingTop: espacio.m },
          foco && { borderColor: color.texto, borderWidth: 2 }, error ? { borderColor: color.textoRojo } : null]} />
      {ayuda ? <Text style={e.ayuda}>{ayuda}</Text> : null}
      {error ? (
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <Icono nombre="alerta" tam={16} color={color.textoRojo} />
          <Text style={e.error}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function Casilla({ texto, valor, onCambio, detalle }: { texto: string; valor: boolean; onCambio: (v: boolean) => void; detalle?: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: valor }} onPress={() => onCambio(!valor)}
      style={[e.casilla, valor && { borderColor: color.texto, backgroundColor: color.superficie }]}>
      <View style={[e.cuadro, valor && { backgroundColor: color.azul, borderColor: color.azul }]}>
        {valor ? <Icono nombre="check" tam={16} color={color.blanco} grosor={3} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={e.textoCasillaFuerte}>{texto}</Text>
        {detalle ? <Text style={e.ayuda}>{detalle}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Selección entre opciones de un catálogo, como fichas en pastilla. */
export function Opciones({ etiqueta, opciones, valor, onCambio, multiple }: {
  etiqueta?: string; opciones: readonly (readonly [string, string])[]; valor: string | string[] | null | undefined;
  onCambio: (v: string | string[]) => void; multiple?: boolean;
}) {
  const sel = new Set(Array.isArray(valor) ? valor : valor ? [valor] : []);
  return (
    <View style={e.campo}>
      {etiqueta ? <Text style={e.etiqueta}>{etiqueta}</Text> : null}
      <View style={e.fichas}>
        {opciones.map(([k, t]) => {
          const activa = sel.has(k);
          return (
            <Pressable key={k} accessibilityRole={multiple ? "checkbox" : "radio"} accessibilityState={{ checked: activa }}
              onPress={() => {
                if (!multiple) return onCambio(k);
                const s = new Set(sel);
                if (s.has(k)) s.delete(k); else s.add(k);
                onCambio([...s]);
              }}
              style={({ pressed }) => [e.ficha, activa && { backgroundColor: color.azul, borderColor: color.azul }, pressed && { transform: [{ scale: 0.97 }] }]}>
              <Text style={[e.fichaTexto, activa && { color: color.blanco }]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Contador({ etiqueta, valor, onCambio, min = 0 }: { etiqueta: string; valor: number; onCambio: (n: number) => void; min?: number }) {
  return (
    <View style={e.contador}>
      <Text style={[e.textoCasilla, { flex: 1 }]}>{etiqueta}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Restar a ${etiqueta}`} style={e.botonMini} onPress={() => onCambio(Math.max(min, valor - 1))}>
        <View style={{ width: 14, height: 2.5, borderRadius: 2, backgroundColor: color.texto }} />
      </Pressable>
      <Text style={e.valorContador}>{valor}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Sumar a ${etiqueta}`} style={e.botonMini} onPress={() => onCambio(valor + 1)}>
        <Icono nombre="mas" tam={18} color={color.texto} grosor={2.5} />
      </Pressable>
    </View>
  );
}

export function Tarjeta({ children, estilo }: { children: ReactNode; estilo?: ViewStyle }) {
  return <View style={[e.tarjeta, estilo]}>{children}</View>;
}

const AVISO: Record<"info" | "alerta" | "error" | "ok", { fondo: string; texto: string; icono: NombreIcono }> = {
  info: { fondo: color.tinteTurquesa, texto: color.textoTurquesa, icono: "info" },
  alerta: { fondo: color.tinteNaranja, texto: color.textoNaranja, icono: "alerta" },
  error: { fondo: color.tinteRojo, texto: color.textoRojo, icono: "equis" },
  ok: { fondo: color.tinteVerde, texto: color.textoVerde, icono: "check" },
};

export function Aviso({ texto, tipo = "info" }: { texto: string; tipo?: "info" | "alerta" | "error" | "ok" }) {
  const a = AVISO[tipo];
  return (
    <Aparece>
      <View accessibilityRole={tipo === "error" ? "alert" : "text"} style={[e.aviso, { backgroundColor: a.fondo }]}>
        <Icono nombre={a.icono} tam={22} color={a.texto} />
        <Text style={[e.textoAviso, { color: a.texto }]}>{texto}</Text>
      </View>
    </Aparece>
  );
}

/** Encabezado de sección en mayúsculas espaciadas (`etiqueta` del sistema). */
export function Etiqueta({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={e.etiquetaSeccion}>{children}</Text>;
}

export function Texto({ children, suave, negrita, tam = "normal" }: { children: ReactNode; suave?: boolean; negrita?: boolean; tam?: keyof typeof letra }) {
  const titulo = tam === "titulo" || tam === "grande";
  return (
    <Text style={{
      fontSize: letra[tam], lineHeight: Math.round(letra[tam] * 1.45), color: suave ? color.textoSuave : color.texto,
      fontFamily: titulo ? fuente.titulo : negrita ? fuente.textoFuerte : fuente.texto, marginBottom: espacio.xs,
    }}>{children}</Text>
  );
}

export function Fila({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s }}>{children}</View>;
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: espacio.m, backgroundColor: color.fondo }}>
      <ActivityIndicator size="large" color={color.azulOceano} />
      <Text style={e.ayuda}>{texto}</Text>
    </View>
  );
}

const e = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.fondo },
  contenido: { paddingHorizontal: espacio.pantalla, paddingTop: espacio.l, paddingBottom: 120, gap: espacio.m },
  pie: { paddingHorizontal: espacio.pantalla, paddingTop: espacio.m, paddingBottom: espacio.xl, borderTopWidth: 1, borderTopColor: color.borde, backgroundColor: color.fondo, gap: espacio.s },
  titulo: { fontSize: 28, lineHeight: 33, fontFamily: fuente.titulo, letterSpacing: -0.3, color: color.texto, marginBottom: espacio.xs },
  boton: { minHeight: 52, borderRadius: radio.pastilla, paddingHorizontal: espacio.xl, justifyContent: "center", alignItems: "center" },
  botonTexto: { fontSize: 17, fontFamily: fuente.tituloFuerte, textAlign: "center" },
  campo: { gap: 6 },
  etiqueta: { fontSize: 15, fontFamily: fuente.tituloMedio, color: color.texto },
  entrada: { minHeight: 52, borderWidth: 1.5, borderColor: color.bordeControl, borderRadius: radio.m, paddingHorizontal: 14, fontSize: letra.normal, fontFamily: fuente.texto, backgroundColor: color.fondo, color: color.texto },
  ayuda: { fontSize: letra.pequena, lineHeight: 20, fontFamily: fuente.texto, color: color.textoSuave },
  error: { fontSize: letra.pequena, fontFamily: fuente.textoFuerte, color: color.textoRojo, flex: 1 },
  casilla: { flexDirection: "row", gap: 14, alignItems: "flex-start", minHeight: toque, padding: 14, borderRadius: radio.m, borderWidth: 1.5, borderColor: color.bordeControl, backgroundColor: color.fondo },
  cuadro: { width: 26, height: 26, borderWidth: 2, borderColor: color.bordeControl, borderRadius: 7, alignItems: "center", justifyContent: "center", marginTop: 1 },
  textoCasilla: { fontSize: letra.normal, lineHeight: 24, fontFamily: fuente.texto, color: color.texto },
  textoCasillaFuerte: { fontSize: letra.normal, lineHeight: 24, fontFamily: fuente.textoFuerte, color: color.texto },
  fichas: { flexDirection: "row", flexWrap: "wrap", gap: espacio.s },
  ficha: { minHeight: 44, paddingHorizontal: 16, borderRadius: radio.pastilla, borderWidth: 1.5, borderColor: color.bordeControl, backgroundColor: color.fondo, justifyContent: "center" },
  fichaTexto: { fontSize: 15, fontFamily: fuente.tituloMedio, color: color.texto },
  contador: { flexDirection: "row", alignItems: "center", gap: espacio.m, minHeight: toque },
  botonMini: { width: toque, height: toque, borderRadius: toque / 2, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde, alignItems: "center", justifyContent: "center" },
  valorContador: { minWidth: 32, textAlign: "center", fontSize: 22, fontFamily: fuente.titulo, color: color.texto },
  tarjeta: { backgroundColor: color.fondo, borderRadius: radio.seccion, borderWidth: 1, borderColor: color.borde, padding: espacio.l, gap: espacio.s },
  aviso: { flexDirection: "row", gap: espacio.m, alignItems: "flex-start", borderRadius: radio.l, paddingVertical: 14, paddingHorizontal: espacio.l },
  textoAviso: { flex: 1, fontSize: letra.normal, lineHeight: 24, fontFamily: fuente.texto },
  etiquetaSeccion: { fontSize: 12, lineHeight: 16, fontFamily: fuente.tituloFuerte, letterSpacing: 1.7, textTransform: "uppercase", color: color.textoSuave },
});
