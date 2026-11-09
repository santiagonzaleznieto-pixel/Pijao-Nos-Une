// Componentes base con el sistema de diseño de la Fase 2 (opción C «Pulso»). Las pantallas solo usan estas piezas y el tema
// central (tema.ts): así cambian de aspecto, de modo (claro, oscuro, sol) y de tamaño de letra sin tocar su lógica.
// Movimiento común en movimiento.tsx. Incluye los estados de toda pantalla (18.1): cargando con esqueleto, vacío con una
// acción, sin conexión, error con «Reintentar» y sin permiso con su explicación.
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icono, type NombreIcono } from "./Icono";
import { Aparece, curvaSuave, useMovimientoReducido, useToque } from "./movimiento";
import { color, degradado, espacio, fuente, letra, modoSol, radio, tl, toque } from "./tema";

// ---------------------------------------------------------------- pantalla

export function Pantalla({ titulo, etiqueta, subtitulo, children, desplazable = true, pie, arriba, sinCabecera }: {
  titulo?: string; etiqueta?: string; subtitulo?: string; children: ReactNode; desplazable?: boolean; pie?: ReactNode;
  /** La pantalla no tiene cabecera de navegación: se deja el espacio de la barra de estado. */
  sinCabecera?: boolean;
  /** Algo fijo arriba del contenido (por ejemplo, la barra de pasos). */
  arriba?: ReactNode;
}) {
  const contenido = (
    <Aparece estilo={{ gap: espacio.l }}>
      {titulo || etiqueta ? (
        <View style={{ gap: 6 }}>
          {etiqueta ? <Text style={e.etiquetaSeccion}>{etiqueta}</Text> : null}
          {titulo ? <Text accessibilityRole="header" style={e.titulo}>{titulo}</Text> : null}
          {subtitulo ? <Text style={e.texto}>{subtitulo}</Text> : null}
        </View>
      ) : null}
      {children}
    </Aparece>
  );
  return (
    <SafeAreaView style={e.raiz} edges={sinCabecera ? ["top", "left", "right"] : ["left", "right"]}>
      {arriba}
      {desplazable ? <ScrollView contentContainerStyle={e.contenido} keyboardShouldPersistTaps="handled">{contenido}</ScrollView>
        : <View style={[e.contenido, { flex: 1 }]}>{contenido}</View>}
      {pie ? <View style={e.pie}>{pie}</View> : null}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------- botones

type Variante = "principal" | "secundario" | "contorno" | "peligro" | "suave" | "registrar";
const estiloBoton: Record<Variante, { fondo: string; texto: string; borde?: string }> = {
  principal: { fondo: color.azul, texto: color.invertida },
  secundario: { fondo: color.fondo, texto: color.texto, borde: color.bordeControl },
  contorno: { fondo: color.fondo, texto: color.texto, borde: color.bordeControl },
  peligro: { fondo: color.fondo, texto: color.textoRojo, borde: color.textoRojo },
  suave: { fondo: color.superficie, texto: color.texto, borde: modoSol ? color.borde : undefined },
  registrar: { fondo: color.naranja, texto: color.sobreNaranja },
};

export function Boton({ texto, onPress, variante = "principal", deshabilitado, cargando, estilo, icono }: {
  texto: string; onPress: () => void; variante?: Variante; deshabilitado?: boolean; cargando?: boolean; estilo?: StyleProp<ViewStyle>; icono?: NombreIcono;
}) {
  const inactivo = deshabilitado || cargando;
  const v = estiloBoton[variante];
  const { escala, alPresionar, alSoltar } = useToque();
  return (
    <Animated.View style={[{ transform: [{ scale: escala }] }, estilo]}>
      <Pressable
        accessibilityRole="button" accessibilityLabel={texto} accessibilityState={{ disabled: inactivo, busy: cargando }} disabled={inactivo} onPress={onPress}
        onPressIn={alPresionar} onPressOut={alSoltar}
        style={[e.boton, { backgroundColor: v.fondo, opacity: inactivo ? 0.45 : 1 }, v.borde ? { borderWidth: 1.5, borderColor: v.borde } : null]}
      >
        {cargando ? <ActivityIndicator color={v.texto} /> : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {icono ? <Icono nombre={icono} tam={20} color={v.texto} /> : null}
            <Text style={[e.botonTexto, { color: v.texto }]}>{texto}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Botón redondo de solo ícono (48 × 48). */
export function BotonIcono({ icono, etiqueta, onPress, tam = 48, estilo }: { icono: NombreIcono; etiqueta: string; onPress: () => void; tam?: number; estilo?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={etiqueta} onPress={onPress} hitSlop={6}
      style={({ pressed }) => [e.botonIcono, { width: tam, height: tam, borderRadius: tam / 2, transform: [{ scale: pressed ? 0.94 : 1 }] }, estilo]}>
      <Icono nombre={icono} tam={22} />
    </Pressable>
  );
}

export function Enlace({ texto, onPress, centrado }: { texto: string; onPress: () => void; centrado?: boolean }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8} style={{ paddingVertical: 12, alignSelf: centrado ? "center" : "flex-start" }}>
      <Text style={e.enlace}>{texto}</Text>
    </Pressable>
  );
}

/** Fila de enlace grande con ícono (por ejemplo, en «Más» y en el perfil). */
export function FilaEnlace({ texto, icono, onPress, detalle, peligro }: { texto: string; icono: NombreIcono; onPress: () => void; detalle?: string; peligro?: boolean }) {
  const tinta = peligro ? color.textoRojo : color.texto;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={detalle ? `${texto}. ${detalle}` : texto} onPress={onPress}
      style={({ pressed }) => [e.filaEnlace, pressed && { transform: [{ scale: 0.985 }] }]}>
      <Icono nombre={icono} tam={22} color={tinta} />
      <View style={{ flex: 1 }}>
        <Text style={[e.filaEnlaceTexto, { color: tinta }]}>{texto}</Text>
        {detalle ? <Text style={e.apoyo}>{detalle}</Text> : null}
      </View>
      <Icono nombre="derecha" tam={20} color={color.textoSuave} />
    </Pressable>
  );
}

// ---------------------------------------------------------------- formularios

export function Campo({ etiqueta, error, ayuda, ...props }: TextInputProps & { etiqueta: string; error?: string | null; ayuda?: string }) {
  const [foco, setFoco] = useState(false);
  const [ver, setVer] = useState(false);
  const clave = Boolean(props.secureTextEntry);
  return (
    <View style={e.campo}>
      <Text style={e.etiqueta}>{etiqueta}</Text>
      <View>
        <TextInput accessibilityLabel={etiqueta} placeholderTextColor={color.textoSuave} {...props} secureTextEntry={clave && !ver}
          onFocus={(ev) => { setFoco(true); props.onFocus?.(ev); }} onBlur={(ev) => { setFoco(false); props.onBlur?.(ev); }}
          style={[e.entrada, props.multiline && { minHeight: 104, textAlignVertical: "top", paddingTop: espacio.m }, clave && { paddingRight: 56 },
            foco && { borderColor: color.texto, borderWidth: 2 }, error ? { borderColor: color.textoRojo } : null]} />
        {clave ? (
          <Pressable accessibilityRole="button" accessibilityLabel={ver ? "Ocultar la contraseña" : "Mostrar la contraseña"} onPress={() => setVer(!ver)}
            style={{ position: "absolute", right: 2, top: 2, width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
            <Icono nombre={ver ? "ocultar" : "ojo"} tam={20} color={color.textoSuave} />
          </Pressable>
        ) : null}
      </View>
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

/** Buscador en pastilla con ícono de lupa. */
export function Buscador({ valor, onCambio, texto, autoFocus }: { valor: string; onCambio: (v: string) => void; texto: string; autoFocus?: boolean }) {
  return (
    <View style={e.buscador}>
      <Icono nombre="buscar" tam={20} color={color.textoSuave} />
      <TextInput value={valor} onChangeText={onCambio} placeholder={texto} placeholderTextColor={color.textoSuave} accessibilityLabel={texto}
        autoFocus={autoFocus} style={{ flex: 1, minHeight: 50, fontFamily: fuente.texto, fontSize: letra.normal, color: color.texto }} />
      {valor ? <BotonIcono icono="equis" etiqueta="Borrar la búsqueda" onPress={() => onCambio("")} tam={40} estilo={{ borderWidth: 0, backgroundColor: "transparent" }} /> : null}
    </View>
  );
}

export function Casilla({ texto, valor, onCambio, detalle, estilo }: { texto: string; valor: boolean; onCambio: (v: boolean) => void; detalle?: string; estilo?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: valor }} onPress={() => onCambio(!valor)}
      style={[e.casilla, valor && { borderColor: color.texto, backgroundColor: color.superficie }, estilo]}>
      <View style={[e.cuadro, valor && { backgroundColor: color.azul, borderColor: color.azul }]}>
        {valor ? <Icono nombre="check" tam={16} color={color.invertida} grosor={3} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={e.textoCasillaFuerte}>{texto}</Text>
        {detalle ? <Text style={e.ayuda}>{detalle}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Selección entre opciones de un catálogo: fichas en pastilla, o lista de radios (`lista`) para preguntas. */
export function Opciones({ etiqueta, opciones, valor, onCambio, multiple, lista }: {
  etiqueta?: string; opciones: readonly (readonly [string, string])[]; valor: string | string[] | null | undefined;
  onCambio: (v: string | string[]) => void; multiple?: boolean; lista?: boolean;
}) {
  const sel = new Set(Array.isArray(valor) ? valor : valor ? [valor] : []);
  const tocar = (k: string) => {
    if (!multiple) return onCambio(k);
    const s = new Set(sel);
    if (s.has(k)) s.delete(k); else s.add(k);
    onCambio([...s]);
  };
  return (
    <View style={e.campo}>
      {etiqueta ? <Text style={e.etiqueta}>{etiqueta}</Text> : null}
      <View style={lista ? { gap: espacio.s } : e.fichas}>
        {opciones.map(([k, t]) => {
          const activa = sel.has(k);
          if (lista) {
            return (
              <Pressable key={k} accessibilityRole={multiple ? "checkbox" : "radio"} accessibilityState={{ checked: activa }} onPress={() => tocar(k)}
                style={({ pressed }) => [e.opcion, activa && { borderColor: color.texto, backgroundColor: color.tinteAzul }, pressed && { transform: [{ scale: 0.985 }] }]}>
                <View style={[e.radio, activa && { borderColor: color.texto }]}>{activa ? <View style={e.radioPunto} /> : null}</View>
                <Text style={[e.textoCasilla, { flex: 1 }, activa && { fontFamily: fuente.textoFuerte }]}>{t}</Text>
              </Pressable>
            );
          }
          return (
            <Pressable key={k} accessibilityRole={multiple ? "checkbox" : "radio"} accessibilityState={{ checked: activa }} onPress={() => tocar(k)}
              style={({ pressed }) => [e.ficha, activa && { backgroundColor: color.azul, borderColor: color.azul }, pressed && { transform: [{ scale: 0.97 }] }]}>
              {activa && multiple ? <Icono nombre="check" tam={14} color={color.invertida} grosor={3} /> : null}
              <Text style={[e.fichaTexto, activa && { color: color.invertida }]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Ficha de filtro suelta (chip), para filas desplazables de filtros. */
export function Chip({ texto, activo, onPress, sombra: conSombra }: { texto: string; activo: boolean; onPress: () => void; sombra?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: activo }} onPress={onPress} hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [e.chip, conSombra && e.chipFlotante, activo && { backgroundColor: color.azul, borderColor: color.azul }, pressed && { transform: [{ scale: 0.97 }] }]}>
      <Text style={[e.fichaTexto, { fontSize: tl(14) }, activo && { color: color.invertida }]}>{texto}</Text>
    </Pressable>
  );
}

/** Pestañas dentro de una pantalla (2 o 3 segmentos). */
export function Segmentos({ opciones, valor, onCambio }: { opciones: readonly (readonly [string, string])[]; valor: string; onCambio: (v: string) => void }) {
  return (
    <View accessibilityRole="tablist" style={e.segmentos}>
      {opciones.map(([k, t]) => {
        const activo = k === valor;
        return (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: activo }} onPress={() => onCambio(k)} hitSlop={{ top: 4, bottom: 4 }}
            style={[e.segmento, activo && e.segmentoActivo]}>
            <Text numberOfLines={1} style={[e.segmentoTexto, activo && { color: color.texto }]}>{t}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Interruptor de sí o no (46 × 28, zona táctil de 48). */
export function Interruptor({ valor, onCambio, etiqueta }: { valor: boolean; onCambio: (v: boolean) => void; etiqueta: string }) {
  const x = useRef(new Animated.Value(valor ? 1 : 0)).current;
  useEffect(() => { Animated.timing(x, { toValue: valor ? 1 : 0, duration: 180, easing: curvaSuave, useNativeDriver: true }).start(); }, [valor, x]);
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={etiqueta} accessibilityState={{ checked: valor }} onPress={() => onCambio(!valor)}
      hitSlop={10} style={[e.interruptor, valor && { backgroundColor: color.azul }]}>
      <Animated.View style={[e.interruptorBola, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }] }]} />
    </Pressable>
  );
}

export function Contador({ etiqueta, valor, onCambio, min = 0 }: { etiqueta: string; valor: number; onCambio: (n: number) => void; min?: number }) {
  return (
    <View style={e.contador}>
      <Text style={[e.textoCasilla, { flex: 1 }]}>{etiqueta}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Restar a ${etiqueta}`} style={e.botonMini} onPress={() => onCambio(Math.max(min, valor - 1))}>
        <View style={{ width: 14, height: 2.5, borderRadius: 2, backgroundColor: color.texto }} />
      </Pressable>
      <Text style={e.valorContador} accessibilityLabel={`${etiqueta}: ${valor}`}>{valor}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Sumar a ${etiqueta}`} style={e.botonMini} onPress={() => onCambio(valor + 1)}>
        <Icono nombre="mas" tam={18} color={color.texto} grosor={2.5} />
      </Pressable>
    </View>
  );
}

/** Barra de pasos del asistente: «PASO 3 DE 12 · Vivienda» y la barra con el degradado que se llena. */
export function Pasos({ actual, total, nombre }: { actual: number; total: number; nombre?: string }) {
  const v = useRef(new Animated.Value(Math.max(0, actual - 1) / total)).current;   // al montar avanza desde el paso anterior
  const [ancho, setAncho] = useState(0);
  const reducido = useMovimientoReducido();
  useEffect(() => {
    Animated.timing(v, { toValue: actual / total, duration: reducido ? 0 : 600, easing: curvaSuave, useNativeDriver: true }).start();
  }, [actual, total, v, reducido]);
  return (
    <View style={{ paddingHorizontal: espacio.pantalla, paddingTop: espacio.s, paddingBottom: espacio.m, gap: 8, backgroundColor: color.fondo }}
      accessible accessibilityLabel={`Paso ${actual} de ${total}${nombre ? `: ${nombre}` : ""}`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={e.etiquetaSeccion}>{`PASO ${actual} DE ${total}`}</Text>
        {nombre ? <Text style={e.apoyo}>{nombre}</Text> : null}
      </View>
      <View onLayout={(ev) => setAncho(ev.nativeEvent.layout.width)} style={{ height: 6, borderRadius: 3, backgroundColor: color.superficiePanel, overflow: "hidden" }}>
        {ancho ? (
          <Animated.View style={{ width: ancho, height: 6, flexDirection: "row",
            transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-ancho / 2, 0] }) }, { scaleX: v }] }}>
            {degradado.map((c) => <View key={c} style={{ flex: 1, backgroundColor: c }} />)}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- contenedores y datos

export function Tarjeta({ children, estilo }: { children: ReactNode; estilo?: StyleProp<ViewStyle> }) {
  return <View style={[e.tarjeta, estilo]}>{children}</View>;
}

/** Sección con borde (pj-seccion), con su etiqueta arriba y una acción opcional a la derecha. */
export function Seccion({ titulo, accion, children, estilo }: { titulo?: string; accion?: ReactNode; children: ReactNode; estilo?: StyleProp<ViewStyle> }) {
  return (
    <View style={[e.tarjeta, estilo]}>
      {titulo || accion ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacio.m }}>
          {titulo ? <Text accessibilityRole="header" style={e.etiquetaSeccion}>{titulo}</Text> : <View />}
          {accion}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Fila «etiqueta · valor» con divisor (datos de persona, vivienda, perfil). */
export function Dato({ etiqueta, valor, ultimo, derecha }: { etiqueta: string; valor?: string | null; ultimo?: boolean; derecha?: ReactNode }) {
  return (
    <View style={[e.dato, ultimo && { borderBottomWidth: 0 }]} accessible accessibilityLabel={`${etiqueta}: ${valor ?? ""}`}>
      <Text style={[e.texto, { flexShrink: 1 }]}>{etiqueta}</Text>
      {derecha ?? <Text style={[e.textoFuerte, { textAlign: "right", flexShrink: 1 }]}>{valor || "—"}</Text>}
    </View>
  );
}

export type Tono = "azul" | "turquesa" | "verde" | "naranja" | "rojo" | "gris";
const TONOS: Record<Tono, { fondo: string; texto: string }> = {
  azul: { fondo: color.tinteAzul, texto: color.textoAzul },
  turquesa: { fondo: color.tinteTurquesa, texto: color.textoTurquesa },
  verde: { fondo: color.tinteVerde, texto: color.textoVerde },
  naranja: { fondo: color.tinteNaranja, texto: color.textoNaranja },
  rojo: { fondo: color.tinteRojo, texto: color.textoRojo },
  gris: { fondo: color.superficiePanel, texto: color.textoSuave },
};

/** Cuadro de ícono con tinte (44 × 44) para filas de lista. */
export function Ficha({ icono, tono = "azul", tam = 44 }: { icono: NombreIcono; tono?: Tono; tam?: number }) {
  const t = TONOS[tono];
  return (
    <View style={{ width: tam, height: tam, borderRadius: 14, backgroundColor: t.fondo, alignItems: "center", justifyContent: "center", borderWidth: modoSol ? 1 : 0, borderColor: color.borde }}>
      <Icono nombre={icono} tam={Math.round(tam / 2)} color={t.texto} />
    </View>
  );
}

/** Insignia en pastilla. */
export function Insignia({ texto, tono = "azul", icono }: { texto: string; tono?: Tono; icono?: NombreIcono }) {
  const t = TONOS[tono];
  return (
    <View style={[e.insignia, { backgroundColor: t.fondo }, modoSol && { borderWidth: 1, borderColor: color.borde }]}>
      {icono ? <Icono nombre={icono} tam={14} color={t.texto} grosor={2.4} /> : null}
      <Text style={[e.insigniaTexto, { color: t.texto }]}>{texto}</Text>
    </View>
  );
}

/** Semáforo de calidad del registro (6.4): color, ícono y palabra; nunca solo el color. */
export function Semaforo({ nivel }: { nivel: string | null | undefined }) {
  const n = nivel === "rojo" ? "rojo" : nivel === "amarillo" ? "amarillo" : nivel === "verde" ? "verde" : null;
  if (!n) return null;
  const d = { verde: { tono: TONOS.verde, texto: "Completo", icono: "check" as const }, amarillo: { tono: TONOS.naranja, texto: "Por revisar", icono: "exclama" as const },
    rojo: { tono: TONOS.rojo, texto: "Incompleto", icono: "equis" as const } }[n];
  return (
    <View style={[e.semaforo, { backgroundColor: d.tono.fondo }, modoSol && { borderWidth: 1, borderColor: color.borde }]} accessible accessibilityLabel={`Calidad: ${d.texto}`}>
      <View style={[e.semaforoLuz, { backgroundColor: d.tono.texto }]}><Icono nombre={d.icono} tam={14} color={color.fondo} grosor={3} /></View>
      <Text style={[e.insigniaTexto, { fontSize: tl(14), color: d.tono.texto }]}>{d.texto}</Text>
    </View>
  );
}

/** Círculo con iniciales o un ícono. */
export function Avatar({ nombre, icono, tono = "azul", tam = 44 }: { nombre?: string | null; icono?: NombreIcono; tono?: Tono; tam?: number }) {
  const t = TONOS[tono];
  const iniciales = (nombre ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  return (
    <View style={{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: t.fondo, alignItems: "center", justifyContent: "center", borderWidth: modoSol ? 1 : 0, borderColor: color.borde }}>
      {icono || !iniciales ? <Icono nombre={icono ?? "persona"} tam={Math.round(tam * 0.46)} color={t.texto} />
        : <Text style={{ fontFamily: fuente.tituloFuerte, fontSize: tl(Math.round(tam * 0.34)), color: t.texto }}>{iniciales}</Text>}
    </View>
  );
}

/** Fila de lista (64 de alto) con ficha o avatar, título, detalle y algo a la derecha. */
export function ItemLista({ titulo, detalle, izquierda, derecha, onPress, ultimo, etiquetaAccesible }: {
  titulo: string; detalle?: string | null; izquierda?: ReactNode; derecha?: ReactNode; onPress?: () => void; ultimo?: boolean; etiquetaAccesible?: string;
}) {
  const cuerpo = (
    <>
      {izquierda}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={e.textoFuerte}>{titulo}</Text>
        {detalle ? <Text style={e.apoyo}>{detalle}</Text> : null}
      </View>
      {derecha ?? (onPress ? <Icono nombre="derecha" tam={20} color={color.textoSuave} /> : null)}
    </>
  );
  const estilo = [e.item, ultimo && { borderBottomWidth: 0 }];
  if (!onPress) return <View style={estilo} accessible accessibilityLabel={etiquetaAccesible}>{cuerpo}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={etiquetaAccesible ?? (detalle ? `${titulo}. ${detalle}` : titulo)} onPress={onPress}
      style={({ pressed }) => [...estilo, pressed && { opacity: 0.7 }]}>{cuerpo}</Pressable>
  );
}

/** Cifra pequeña en recuadro (cuadrícula de 2 o 3). */
export function Mini({ valor, texto }: { valor: string | number; texto: string }) {
  return (
    <View style={e.mini} accessible accessibilityLabel={`${texto}: ${valor}`}>
      <Text style={e.miniValor}>{valor}</Text>
      <Text style={e.apoyo}>{texto}</Text>
    </View>
  );
}

const AVISO: Record<"info" | "alerta" | "error" | "ok", { fondo: string; texto: string; icono: NombreIcono }> = {
  info: { fondo: color.tinteTurquesa, texto: color.textoTurquesa, icono: "info" },
  alerta: { fondo: color.tinteNaranja, texto: color.textoNaranja, icono: "alerta" },
  error: { fondo: color.tinteRojo, texto: color.textoRojo, icono: "equis" },
  ok: { fondo: color.tinteVerde, texto: color.textoVerde, icono: "check" },
};

export function Aviso({ texto, tipo = "info", icono }: { texto: string; tipo?: "info" | "alerta" | "error" | "ok"; icono?: NombreIcono }) {
  const a = AVISO[tipo];
  return (
    <Aparece>
      <View accessibilityRole={tipo === "error" ? "alert" : "text"} accessibilityLiveRegion={tipo === "error" ? "assertive" : "polite"}
        style={[e.aviso, { backgroundColor: a.fondo }, modoSol && { borderWidth: 1.5, borderColor: color.borde }]}>
        <Icono nombre={icono ?? a.icono} tam={22} color={a.texto} />
        <Text style={[e.textoAviso, { color: a.texto }]}>{texto}</Text>
      </View>
    </Aparece>
  );
}

/** Encabezado de sección en mayúsculas espaciadas (`etiqueta` del sistema). */
export function Etiqueta({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={e.etiquetaSeccion}>{children}</Text>;
}

export function Texto({ children, suave, negrita, tam = "normal", centrado }: { children: ReactNode; suave?: boolean; negrita?: boolean; tam?: keyof typeof letra; centrado?: boolean }) {
  const titulo = tam === "titulo" || tam === "grande";
  return (
    <Text style={{
      fontSize: letra[tam], lineHeight: Math.round(letra[tam] * 1.45), color: suave ? color.textoSuave : color.texto,
      fontFamily: titulo ? fuente.titulo : negrita ? fuente.textoFuerte : fuente.texto, textAlign: centrado ? "center" : undefined,
    }}>{children}</Text>
  );
}

/** Título mediano (22) de bloque o de hoja inferior. */
export function TituloMedio({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={e.tituloMedio}>{children}</Text>;
}

export function Fila({ children, estilo }: { children: ReactNode; estilo?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s }, estilo]}>{children}</View>;
}

/** Dos columnas iguales. */
export function Cuadricula({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{children}</View>;
}

/** Línea con «o» en el medio. */
export function Separador({ texto = "o" }: { texto?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }} accessible={false}>
      <View style={{ flex: 1, height: 1, backgroundColor: color.borde }} />
      <Text style={e.apoyo}>{texto}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: color.borde }} />
    </View>
  );
}

// ---------------------------------------------------------------- estados comunes (18.1)

/** Bloque que brilla mientras carga (esqueleto). */
export function Esqueleto({ alto = 18, ancho = "100%", redondeo = 12 }: { alto?: number; ancho?: number | `${number}%`; redondeo?: number }) {
  const v = useRef(new Animated.Value(0.55)).current;
  const reducido = useMovimientoReducido();
  useEffect(() => {
    if (reducido) return;
    const bucle = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.55, duration: 700, useNativeDriver: true }),
    ]));
    bucle.start();
    return () => bucle.stop();
  }, [v, reducido]);
  return <Animated.View style={{ height: alto, width: ancho, borderRadius: redondeo, backgroundColor: color.superficiePanel, opacity: v }} />;
}

/** Cargando: esqueleto de una lista (por defecto) o un indicador centrado. */
export function Cargando({ texto = "Cargando…", lista = false }: { texto?: string; lista?: boolean }) {
  if (lista) {
    return (
      <View style={{ gap: 14 }} accessible accessibilityLabel={texto} accessibilityRole="progressbar">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Esqueleto alto={44} ancho={44} redondeo={14} />
            <View style={{ flex: 1, gap: 8 }}><Esqueleto alto={16} ancho="70%" /><Esqueleto alto={12} ancho="45%" /></View>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: espacio.m, backgroundColor: color.fondo }} accessibilityRole="progressbar" accessibilityLabel={texto}>
      <ActivityIndicator size="large" color={color.azulOceano} />
      <Text style={e.ayuda}>{texto}</Text>
    </View>
  );
}

/** Estado vacío con ícono, explicación y una acción. También sirve para error, sin conexión y sin permiso. */
export function Vacio({ icono = "lista", titulo, texto, accion, onAccion, tono = "gris" }: {
  icono?: NombreIcono; titulo: string; texto?: string; accion?: string; onAccion?: () => void; tono?: Tono;
}) {
  const t = TONOS[tono];
  return (
    <Aparece estilo={e.vacio}>
      <View style={[e.vacioIcono, { backgroundColor: t.fondo }]}><Icono nombre={icono} tam={28} color={tono === "gris" ? color.texto : t.texto} /></View>
      <Text accessibilityRole="header" style={[e.textoFuerte, { textAlign: "center", fontSize: tl(17) }]}>{titulo}</Text>
      {texto ? <Text style={[e.texto, { textAlign: "center", maxWidth: 300 }]}>{texto}</Text> : null}
      {accion && onAccion ? <Boton texto={accion} variante="secundario" onPress={onAccion} estilo={{ marginTop: 4 }} /> : null}
    </Aparece>
  );
}

export function SinConexion({ texto = "Para esto se necesita internet. Lo demás de la app sigue funcionando sin señal.", onReintentar }: { texto?: string; onReintentar?: () => void }) {
  return <Vacio icono="sinsenal" tono="naranja" titulo="Sin señal" texto={texto} accion={onReintentar ? "Reintentar" : undefined} onAccion={onReintentar} />;
}

export function ErrorReintentar({ texto, onReintentar }: { texto: string; onReintentar: () => void }) {
  return <Vacio icono="alerta" tono="rojo" titulo="Algo no salió bien" texto={texto} accion="Reintentar" onAccion={onReintentar} />;
}

export function SinPermiso({ texto }: { texto: string }) {
  return <Vacio icono="candado" tono="gris" titulo="No tiene permiso para esto" texto={texto} />;
}

// ---------------------------------------------------------------- estilos

const e = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.fondo },
  contenido: { paddingHorizontal: espacio.pantalla, paddingTop: espacio.m, paddingBottom: 120, gap: espacio.l },
  pie: { paddingHorizontal: espacio.pantalla, paddingTop: 14, paddingBottom: 26, borderTopWidth: 1, borderTopColor: color.borde, backgroundColor: color.tarjeta, gap: 10 },
  titulo: { fontSize: tl(30), lineHeight: tl(34), fontFamily: fuente.titulo, letterSpacing: -0.3, color: color.texto },
  tituloMedio: { fontSize: tl(22), lineHeight: tl(28), fontFamily: fuente.titulo, color: color.texto },
  texto: { fontSize: letra.normal, lineHeight: tl(24), fontFamily: fuente.texto, color: color.textoSuave },
  textoFuerte: { fontSize: letra.normal, lineHeight: tl(24), fontFamily: fuente.textoFuerte, color: color.texto },
  apoyo: { fontSize: tl(14), lineHeight: tl(20), fontFamily: fuente.textoMedio, color: color.textoSuave },
  enlace: { fontSize: tl(15), lineHeight: tl(20), fontFamily: fuente.tituloMedio, color: color.azulOceano },
  boton: { minHeight: 52, borderRadius: radio.pastilla, paddingHorizontal: espacio.xl, justifyContent: "center", alignItems: "center" },
  botonTexto: { fontSize: tl(17), fontFamily: fuente.tituloFuerte, textAlign: "center" },
  botonIcono: { borderWidth: 1, borderColor: color.borde, backgroundColor: color.tarjeta, alignItems: "center", justifyContent: "center" },
  filaEnlace: { flexDirection: "row", alignItems: "center", gap: espacio.m, minHeight: 56, paddingHorizontal: espacio.l, paddingVertical: 10, borderRadius: 18,
    backgroundColor: color.superficie, borderWidth: modoSol ? 1 : 0, borderColor: color.borde },
  filaEnlaceTexto: { fontSize: tl(15), lineHeight: tl(20), fontFamily: fuente.tituloMedio },
  campo: { gap: 6 },
  etiqueta: { fontSize: tl(15), lineHeight: tl(20), fontFamily: fuente.tituloMedio, color: color.texto },
  entrada: { minHeight: 52, borderWidth: 1.5, borderColor: color.bordeControl, borderRadius: radio.m, paddingHorizontal: 14, fontSize: letra.normal, fontFamily: fuente.texto, backgroundColor: color.fondo, color: color.texto },
  buscador: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingLeft: 16, paddingRight: 4, borderRadius: radio.pastilla, borderWidth: 1, borderColor: modoSol ? color.borde : color.bordeControl, backgroundColor: color.tarjeta },
  ayuda: { fontSize: tl(14), lineHeight: tl(20), fontFamily: fuente.texto, color: color.textoSuave },
  error: { fontSize: tl(14), fontFamily: fuente.textoFuerte, color: color.textoRojo, flex: 1 },
  casilla: { flexDirection: "row", gap: 14, alignItems: "flex-start", minHeight: toque, padding: 14, borderRadius: radio.m, borderWidth: 1.5, borderColor: color.bordeControl, backgroundColor: color.fondo },
  cuadro: { width: 26, height: 26, borderWidth: 2, borderColor: color.bordeControl, borderRadius: 7, alignItems: "center", justifyContent: "center", marginTop: 1 },
  textoCasilla: { fontSize: letra.normal, lineHeight: tl(24), fontFamily: fuente.texto, color: color.texto },
  textoCasillaFuerte: { fontSize: letra.normal, lineHeight: tl(24), fontFamily: fuente.textoFuerte, color: color.texto },
  opcion: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 58, paddingVertical: 10, paddingHorizontal: 16, borderRadius: radio.m, borderWidth: 1.5, borderColor: color.bordeControl, backgroundColor: color.fondo },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.bordeControl, alignItems: "center", justifyContent: "center" },
  radioPunto: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.texto },
  fichas: { flexDirection: "row", flexWrap: "wrap", gap: espacio.s },
  ficha: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: radio.pastilla, borderWidth: 1.5, borderColor: color.bordeControl, backgroundColor: color.fondo },
  fichaTexto: { fontSize: tl(15), fontFamily: fuente.tituloMedio, color: color.texto },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radio.pastilla, borderWidth: 1.5, borderColor: color.bordeControl, backgroundColor: color.fondo, justifyContent: "center" },
  chipFlotante: { borderWidth: 1, borderColor: color.borde, backgroundColor: color.tarjeta, shadowColor: color.sombra, shadowOpacity: modoSol ? 0 : 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: modoSol ? 0 : 3 },
  segmentos: { flexDirection: "row", gap: 4, padding: 4, borderRadius: radio.pastilla, backgroundColor: color.superficiePanel, borderWidth: modoSol ? 1 : 0, borderColor: color.borde },
  segmento: { flex: 1, minHeight: 44, borderRadius: radio.pastilla, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segmentoActivo: { backgroundColor: color.fondo, shadowColor: color.sombra, shadowOpacity: 0.14, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2, borderWidth: modoSol ? 1.5 : 0, borderColor: color.borde },
  segmentoTexto: { fontSize: tl(14), fontFamily: fuente.tituloMedio, color: color.textoSuave },
  interruptor: { width: 46, height: 28, borderRadius: 14, backgroundColor: color.bordeControl, padding: 3 },
  interruptorBola: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.fondo },
  contador: { flexDirection: "row", alignItems: "center", gap: espacio.m, minHeight: toque },
  botonMini: { width: toque, height: toque, borderRadius: toque / 2, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde, alignItems: "center", justifyContent: "center" },
  valorContador: { minWidth: 32, textAlign: "center", fontSize: tl(22), fontFamily: fuente.titulo, color: color.texto },
  tarjeta: { backgroundColor: color.fondo, borderRadius: radio.seccion, borderWidth: 1, borderColor: color.borde, paddingVertical: 18, paddingHorizontal: espacio.l, gap: espacio.s },
  dato: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.borde, minHeight: 44 },
  insignia: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 28, paddingVertical: 4, paddingHorizontal: 12, borderRadius: radio.pastilla, alignSelf: "flex-start" },
  insigniaTexto: { fontSize: tl(13), lineHeight: tl(18), fontFamily: fuente.tituloMedio },
  semaforo: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingLeft: 8, paddingRight: 12, borderRadius: radio.pastilla, alignSelf: "flex-start" },
  semaforoLuz: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  item: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.borde },
  mini: { flexGrow: 1, flexBasis: "45%", backgroundColor: color.superficie, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 2, borderWidth: modoSol ? 1 : 0, borderColor: color.borde },
  miniValor: { fontSize: tl(22), lineHeight: tl(28), fontFamily: fuente.titulo, color: color.texto, fontVariant: ["tabular-nums"] },
  aviso: { flexDirection: "row", gap: espacio.m, alignItems: "flex-start", borderRadius: radio.l, paddingVertical: 14, paddingHorizontal: espacio.l },
  textoAviso: { flex: 1, fontSize: letra.normal, lineHeight: tl(24), fontFamily: fuente.texto },
  etiquetaSeccion: { fontSize: tl(12), lineHeight: tl(16), fontFamily: fuente.tituloFuerte, letterSpacing: 1.7, textTransform: "uppercase", color: color.textoSuave },
  vacio: { alignItems: "center", gap: espacio.m, paddingVertical: espacio.xl, paddingHorizontal: espacio.l },
  vacioIcono: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
});
