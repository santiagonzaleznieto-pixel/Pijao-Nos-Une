// Componentes base reutilizables. Todo usa el tema central (tema.ts) para que la Fase 2 cambie el aspecto en un solo lugar.
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, espacio, letra, radio, toque } from "./tema";

export function Pantalla({ titulo, children, desplazable = true, pie }: { titulo?: string; children: ReactNode; desplazable?: boolean; pie?: ReactNode }) {
  const contenido = (
    <>
      {titulo ? <Text accessibilityRole="header" style={e.titulo}>{titulo}</Text> : null}
      {children}
    </>
  );
  return (
    <SafeAreaView style={e.raiz} edges={["top", "left", "right"]}>
      {desplazable ? <ScrollView contentContainerStyle={e.contenido} keyboardShouldPersistTaps="handled">{contenido}</ScrollView>
        : <View style={[e.contenido, { flex: 1 }]}>{contenido}</View>}
      {pie ? <View style={e.pie}>{pie}</View> : null}
    </SafeAreaView>
  );
}

type Variante = "principal" | "secundario" | "peligro" | "suave";
const fondoBoton: Record<Variante, string> = { principal: color.naranja, secundario: color.azul, peligro: color.rojo, suave: color.tarjeta };

export function Boton({ texto, onPress, variante = "principal", deshabilitado, cargando, estilo }: {
  texto: string; onPress: () => void; variante?: Variante; deshabilitado?: boolean; cargando?: boolean; estilo?: ViewStyle;
}) {
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={texto} accessibilityState={{ disabled: inactivo }} disabled={inactivo} onPress={onPress}
      style={({ pressed }) => [e.boton, { backgroundColor: fondoBoton[variante], opacity: inactivo ? 0.5 : pressed ? 0.85 : 1 },
        variante === "suave" && e.botonSuave, estilo]}
    >
      {cargando ? <ActivityIndicator color={variante === "suave" ? color.azul : color.blanco} />
        : <Text style={[e.botonTexto, variante === "suave" && { color: color.azul }]}>{texto}</Text>}
    </Pressable>
  );
}

export function Campo({ etiqueta, error, ayuda, ...props }: TextInputProps & { etiqueta: string; error?: string | null; ayuda?: string }) {
  return (
    <View style={e.campo}>
      <Text style={e.etiqueta}>{etiqueta}</Text>
      <TextInput accessibilityLabel={etiqueta} placeholderTextColor={color.textoSuave} {...props}
        style={[e.entrada, props.multiline && { minHeight: 96, textAlignVertical: "top" }, error ? { borderColor: color.rojo } : null]} />
      {ayuda ? <Text style={e.ayuda}>{ayuda}</Text> : null}
      {error ? <Text style={e.error}>{error}</Text> : null}
    </View>
  );
}

export function Casilla({ texto, valor, onCambio, detalle }: { texto: string; valor: boolean; onCambio: (v: boolean) => void; detalle?: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: valor }} onPress={() => onCambio(!valor)} style={e.casilla}>
      <View style={[e.cuadro, valor && { backgroundColor: color.azul, borderColor: color.azul }]}>
        {valor ? <Text style={{ color: color.blanco, fontWeight: "700" }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={e.textoCasilla}>{texto}</Text>
        {detalle ? <Text style={e.ayuda}>{detalle}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Selección entre opciones de un catálogo, como fichas grandes. */
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
              style={[e.ficha, activa && { backgroundColor: color.azul, borderColor: color.azul }]}>
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
      <Pressable accessibilityLabel={`Restar a ${etiqueta}`} style={e.botonMini} onPress={() => onCambio(Math.max(min, valor - 1))}><Text style={e.botonMiniTexto}>−</Text></Pressable>
      <Text style={e.valorContador}>{valor}</Text>
      <Pressable accessibilityLabel={`Sumar a ${etiqueta}`} style={e.botonMini} onPress={() => onCambio(valor + 1)}><Text style={e.botonMiniTexto}>+</Text></Pressable>
    </View>
  );
}

export function Tarjeta({ children, estilo }: { children: ReactNode; estilo?: ViewStyle }) {
  return <View style={[e.tarjeta, estilo]}>{children}</View>;
}

export function Aviso({ texto, tipo = "info" }: { texto: string; tipo?: "info" | "alerta" | "error" | "ok" }) {
  const c = { info: color.azulOceano, alerta: color.amarillo, error: color.rojo, ok: color.verde }[tipo];
  return <View accessibilityRole="alert" style={[e.aviso, { borderLeftColor: c }]}><Text style={e.textoCasilla}>{texto}</Text></View>;
}

export function Texto({ children, suave, negrita, tam = "normal" }: { children: ReactNode; suave?: boolean; negrita?: boolean; tam?: keyof typeof letra }) {
  return <Text style={{ fontSize: letra[tam], color: suave ? color.textoSuave : color.texto, fontWeight: negrita ? "700" : "400", marginBottom: espacio.s }}>{children}</Text>;
}

export function Fila({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s }}>{children}</View>;
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: espacio.m }}><ActivityIndicator size="large" color={color.azul} /><Text style={e.ayuda}>{texto}</Text></View>;
}

const e = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: espacio.l, paddingBottom: 96, gap: espacio.m },
  pie: { padding: espacio.l, borderTopWidth: 1, borderTopColor: color.borde, backgroundColor: color.tarjeta, gap: espacio.s },
  titulo: { fontSize: letra.titulo, fontWeight: "700", color: color.azul, marginBottom: espacio.s },
  boton: { minHeight: toque, borderRadius: radio.m, paddingHorizontal: espacio.l, justifyContent: "center", alignItems: "center" },
  botonSuave: { borderWidth: 1, borderColor: color.azul },
  botonTexto: { color: color.blanco, fontSize: letra.mediana, fontWeight: "700", textAlign: "center" },
  campo: { gap: espacio.xs },
  etiqueta: { fontSize: letra.normal, fontWeight: "600", color: color.texto },
  entrada: { minHeight: toque, borderWidth: 1, borderColor: color.borde, borderRadius: radio.s, paddingHorizontal: espacio.m, fontSize: letra.mediana, backgroundColor: color.tarjeta, color: color.texto },
  ayuda: { fontSize: letra.pequena, color: color.textoSuave },
  error: { fontSize: letra.pequena, color: color.rojo, fontWeight: "600" },
  casilla: { flexDirection: "row", gap: espacio.m, alignItems: "flex-start", minHeight: toque, paddingVertical: espacio.xs },
  cuadro: { width: 28, height: 28, borderWidth: 2, borderColor: color.textoSuave, borderRadius: 6, alignItems: "center", justifyContent: "center", marginTop: 2 },
  textoCasilla: { fontSize: letra.normal, color: color.texto },
  fichas: { flexDirection: "row", flexWrap: "wrap", gap: espacio.s },
  ficha: { minHeight: toque, paddingHorizontal: espacio.m, borderRadius: radio.l, borderWidth: 1, borderColor: color.borde, backgroundColor: color.tarjeta, justifyContent: "center" },
  fichaTexto: { fontSize: letra.normal, color: color.texto },
  contador: { flexDirection: "row", alignItems: "center", gap: espacio.s, minHeight: toque },
  botonMini: { width: toque, height: toque, borderRadius: radio.s, backgroundColor: color.azul, alignItems: "center", justifyContent: "center" },
  botonMiniTexto: { color: color.blanco, fontSize: letra.grande, fontWeight: "700" },
  valorContador: { minWidth: 36, textAlign: "center", fontSize: letra.mediana, fontWeight: "700", color: color.texto },
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: radio.m, padding: espacio.l, gap: espacio.s },
  aviso: { backgroundColor: color.tarjeta, borderLeftWidth: 5, borderRadius: radio.s, padding: espacio.m },
});
