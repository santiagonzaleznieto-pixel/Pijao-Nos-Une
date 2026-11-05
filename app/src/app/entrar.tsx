// P-01 / P-02: bienvenida e inicio de sesión (correo y contraseña; sin SMS por costo cero).
import { Link } from "expo-router";
import { useState } from "react";
import { Image, View } from "react-native";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Campo, Pantalla, Texto } from "@/ui/componentes";
import { espacio } from "@/ui/tema";
import { VERSION_APP } from "@/servicios/version";

export default function Entrar() {
  const { sesion, conectado } = useApp();
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
    <Pantalla>
      <View style={{ alignItems: "center", marginTop: espacio.xl, marginBottom: espacio.l }}>
        <Image source={require("@/assets/images/icon.png")} style={{ width: 120, height: 120 }} accessibilityLabel="Logo de Pijao nos une" />
      </View>
      <Texto tam="titulo" negrita>Bienvenido o bienvenida. Hoy Pijao nos une.</Texto>
      {!conectado ? <Aviso tipo="alerta" texto="Sin señal. Para entrar la primera vez necesita internet." /> : null}
      <Campo etiqueta="Correo" value={correo} onChangeText={setCorreo} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Campo etiqueta="Contraseña" value={clave} onChangeText={setClave} secureTextEntry autoComplete="password" />
      {error ? <Aviso tipo="error" texto={error} /> : null}
      <Boton texto="Entrar" onPress={entrar} cargando={cargando} deshabilitado={!correo || !clave} />
      <Link href="/registro" asChild><Boton texto="Tengo un código de invitación" variante="suave" onPress={() => undefined} /></Link>
      <Texto suave tam="pequena">¿Olvidó su contraseña? Pida al Director o al Administrador un código nuevo. Versión {VERSION_APP}.</Texto>
    </Pantalla>
  );
}
