// P-03: verificación en dos pasos con aplicación autenticadora (gratuita). Obligatoria para el Director, el
// Administrador y los permisos de riesgo alto (R-05, A4). Diseño de la Fase 2: el código en seis casillas.
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Pantalla, Seccion, Texto, TituloMedio, Vacio } from "@/ui/componentes";
import { color, fuente, radio, tl } from "@/ui/tema";

/** Seis casillas que muestran lo escrito en un campo oculto (el teclado numérico y el autocompletado siguen funcionando). */
function CodigoSeis({ valor, onCambio }: { valor: string; onCambio: (v: string) => void }) {
  const campo = useRef<ComponentRef<typeof TextInput>>(null);
  return (
    <Pressable onPress={() => campo.current?.focus()} accessibilityLabel={`Código de 6 dígitos. Lleva ${valor.length}.`} accessibilityRole="none">
      <View style={{ flexDirection: "row", gap: 8 }}>
        {Array.from({ length: 6 }, (_, i) => {
          const activa = i === Math.min(valor.length, 5);
          return (
            <View key={i} style={{ flex: 1, height: 60, borderRadius: radio.m, borderWidth: activa ? 2 : 1.5, borderColor: activa ? color.texto : color.bordeControl,
              backgroundColor: color.fondo, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: fuente.titulo, fontSize: tl(26), color: color.texto }}>{valor[i] ?? ""}</Text>
            </View>
          );
        })}
      </View>
      <TextInput ref={campo} value={valor} onChangeText={(t) => onCambio(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6}
        autoComplete="one-time-code" textContentType="oneTimeCode" autoFocus accessibilityLabel="Código de 6 dígitos"
        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
    </Pressable>
  );
}

export default function Verificacion() {
  const { sesion, recargarPerfil } = useApp();
  const [nivel, setNivel] = useState<{ actual: string; siguiente: string } | null>(null);
  const [alta, setAlta] = useState<{ factorId: string; qr: string; secreto: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => { sesion.nivelVerificacion().then(setNivel).catch(() => setNivel(null)); }, [sesion]);

  async function activar() {
    setCargando(true);
    try { setAlta(await sesion.inscribirAutenticador()); } catch (e) { setMensaje({ tipo: "error", texto: (e as Error).message }); } finally { setCargando(false); }
  }
  async function verificar() {
    setCargando(true);
    try {
      await sesion.verificarCodigo(codigo, alta?.factorId);
      setMensaje({ tipo: "ok", texto: "Verificación correcta." });
      setNivel(await sesion.nivelVerificacion());
      await recargarPerfil();
    } catch (e) { setMensaje({ tipo: "error", texto: (e as Error).message }); setCodigo(""); } finally { setCargando(false); }
  }

  const tieneFactor = nivel?.siguiente === "aal2";
  if (nivel?.actual === "aal2" && !alta) {
    return <Pantalla><Vacio icono="escudo" tono="verde" titulo="Su sesión ya está verificada" texto="Puede ver los datos completos y hacer las acciones delicadas que su permiso le da." /></Pantalla>;
  }
  return (
    <Pantalla
      pie={tieneFactor || alta ? <>
        {mensaje ? <Aviso tipo={mensaje.tipo} texto={mensaje.texto} /> : null}
        <Boton texto="Verificar" onPress={verificar} cargando={cargando} deshabilitado={codigo.length !== 6} />
        <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), lineHeight: tl(20), color: color.textoSuave, textAlign: "center" }}>
          ¿Cambió de teléfono? Pídale al Administrador que reinicie su verificación.
        </Text>
      </> : undefined}>
      <View style={{ gap: 8 }}>
        <TituloMedio>{tieneFactor || alta ? "Escriba el código de su aplicación autenticadora" : "Proteja su cuenta con un segundo paso"}</TituloMedio>
        <Texto suave>Use una aplicación gratuita en su teléfono, por ejemplo Aegis (de código abierto) o Google Authenticator. El código cambia cada 30 segundos.</Texto>
      </View>
      {!tieneFactor && !alta ? <Boton texto="Activar la aplicación autenticadora" icono="escudo" onPress={activar} cargando={cargando} /> : null}
      {alta ? (
        <Seccion titulo="1. Escanee este código con la aplicación">
          <View style={{ alignItems: "center", padding: 12, backgroundColor: color.blanco, borderRadius: radio.m }}><SvgXml xml={alta.qr} width={200} height={200} /></View>
          <Texto suave>O escriba esta clave a mano: {alta.secreto}</Texto>
        </Seccion>
      ) : null}
      {tieneFactor || alta ? <CodigoSeis valor={codigo} onCambio={setCodigo} /> : null}
      <Aviso tipo="info" icono="candado" texto="Se pide para ver datos completos y para las acciones delicadas. Así nadie puede usar su cuenta solo con la contraseña." />
      {!tieneFactor && !alta && mensaje ? <Aviso tipo={mensaje.tipo} texto={mensaje.texto} /> : null}
    </Pantalla>
  );
}
