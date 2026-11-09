// P-01 / P-02: bienvenida e inicio de sesión (correo y contraseña; sin SMS por costo cero). Diseño de la Fase 2.
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useApp } from "@/servicios/contexto";
import { VERSION_APP } from "@/servicios/version";
import { Aviso, Boton, Campo, Pantalla, Separador } from "@/ui/componentes";
import { color, fuente, tl } from "@/ui/tema";

export default function Entrar() {
  const { sesion, conectado } = useApp();
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    setError(null);
    setCargando(true);
    try { await sesion.entrar(correo, clave); } catch (e) { setError((e as Error).message); } finally { setCargando(false); }
  }

  return (
    <Pantalla sinCabecera etiqueta="Pijao nos une" titulo="Entrar" subtitulo="Con el correo con el que lo invitaron al equipo.">
      <View style={{ position: "absolute", right: 0, top: -4, width: 64, height: 64, borderRadius: 32, overflow: "hidden", backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde }}>
        <Image source={require("@/assets/images/logo-circular.jpg")} style={{ width: 78, height: 78, marginLeft: -7, marginTop: -6 }} accessibilityLabel="Logo de Pijao nos une" />
      </View>
      {!conectado ? <Aviso tipo="alerta" icono="sinsenal" texto="Sin señal. Para entrar la primera vez necesita internet." /> : null}
      <Campo etiqueta="Correo" value={correo} onChangeText={setCorreo} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username" />
      <View>
        <Campo etiqueta="Contraseña" value={clave} onChangeText={setClave} secureTextEntry autoComplete="password" textContentType="password" />
        <Pressable accessibilityRole="link" onPress={() => router.push("/recuperar")} hitSlop={8} style={{ alignSelf: "flex-end", paddingVertical: 10 }}>
          <Text style={{ fontFamily: fuente.tituloMedio, fontSize: tl(15), color: color.azulOceano }}>Olvidé mi contraseña</Text>
        </Pressable>
      </View>
      {error ? <Aviso tipo="error" texto={error} /> : null}
      <Boton texto="Entrar" onPress={entrar} cargando={cargando} deshabilitado={!correo || !clave} />
      <Separador />
      <Boton texto="Tengo un código de invitación" variante="contorno" icono="llave" onPress={() => router.push("/registro")} />
      <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), lineHeight: tl(20), color: color.textoSuave, textAlign: "center", marginTop: 8 }}>
        Por seguridad, la sesión se cierra sola a los 14 días y hay que volver a entrar. Lo que no se ha enviado se conserva. Versión {VERSION_APP}.
      </Text>
    </Pantalla>
  );
}
