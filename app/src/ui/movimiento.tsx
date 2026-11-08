// Movimiento del sistema de diseño: solo transform y opacity, curva suave común y respeto de «reducir movimiento».
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from "react-native";
import { duracion } from "./tema";

/** cubic-bezier(0.22, 1, 0.36, 1): todo lo que entra o se mueve. */
export const curvaSuave = Easing.bezier(0.22, 1, 0.36, 1);
/** cubic-bezier(0.4, 0, 0.2, 1): lo que sale. */
export const curvaAfilada = Easing.bezier(0.4, 0, 0.2, 1);

/** true si el teléfono pide reducir el movimiento. */
export function useMovimientoReducido(): boolean {
  const [reducido, setReducido] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (vivo) setReducido(v); }).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducido);
    return () => { vivo = false; sub.remove(); };
  }, []);
  return reducido;
}

/** Aparece subiendo 16 px con la curva suave; `retraso` arma la cascada (60 ms entre elementos). */
export function Aparece({ children, retraso = 0, estilo }: { children: ReactNode; retraso?: number; estilo?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  const reducido = useMovimientoReducido();
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: reducido ? 150 : duracion.lenta, delay: reducido ? 0 : retraso, easing: curvaSuave, useNativeDriver: true }).start();
  }, [v, retraso, reducido]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [reducido ? 0 : 16, 0] });
  return <Animated.View style={[estilo, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** Número que cuenta desde cero (1 s). Con «reducir movimiento» se muestra fijo. */
export function useConteo(meta: number, retraso = 0): number {
  const [valor, setValor] = useState(0);
  const reducido = useMovimientoReducido();
  useEffect(() => {
    if (reducido) { setValor(meta); return; }
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setValor(Math.round(value)));
    Animated.timing(v, { toValue: meta, duration: duracion.pausada, delay: retraso, easing: curvaSuave, useNativeDriver: false }).start();
    return () => { v.removeListener(id); v.stopAnimation(); };
  }, [meta, retraso, reducido]);
  return valor;
}

/** Escala de toque: el botón se hunde a 0,965 en 180 ms. */
export function useToque() {
  const escala = useRef(new Animated.Value(1)).current;
  const a = (to: number) => Animated.timing(escala, { toValue: to, duration: duracion.rapida, easing: curvaSuave, useNativeDriver: true }).start();
  return { escala, alPresionar: () => a(0.965), alSoltar: () => a(1) };
}
