// P-07 Recuperar el acceso: código de un solo uso que da el Director o el Administrador (0020, sin correo) y contraseña nueva. Al terminar se cierran las sesiones de los
// demás teléfonos y la persona recibe un aviso de «contraseña cambiada» en sus teléfonos habituales (migración 0016).
// Con la sesión abierta sirve también para cambiar la contraseña (desde el perfil o después de tocar «No fui yo»).
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { problemaClave } from "@/core/acceso";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Campo, Pantalla, Vacio } from "@/ui/componentes";
import { color, fuente, tl } from "@/ui/tema";

/** Medidor de 8 segmentos: largo de la contraseña y si no es de las comunes. */
function FuerzaClave({ clave }: { clave: string }) {
  if (!clave) return null;
  const comun = problemaClave(clave) !== null && clave.length >= 12;
  const n = comun ? 2 : Math.min(8, Math.max(1, Math.floor(clave.length / 2.5)));
  const tinta = n >= 6 ? color.textoVerde : n >= 4 ? color.textoNaranja : color.textoRojo;
  const texto = clave.length < 12 ? `Corta: ${clave.length} de 12 caracteres como mínimo.` : comun ? "Es una contraseña muy común: elija otra." : n >= 6 ? `Buena: ${clave.length} caracteres.` : `Aceptable: ${clave.length} caracteres. Más larga es mejor.`;
  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel={texto}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: 8 }, (_, i) => <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < n ? tinta : color.superficiePanel }} />)}
      </View>
      <Text style={{ fontFamily: fuente.texto, fontSize: tl(14), color: color.textoSuave }}>{texto}</Text>
    </View>
  );
}

export default function Recuperar() {
  const { sesion, conectado, usuarioId } = useApp();
  const router = useRouter();
  const conSesion = Boolean(usuarioId);
  const [listo, setListo] = useState<string | null>(null);
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [clave, setClave] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ejecutar(accion: () => Promise<void>) {
    setError(null);
    setCargando(true);
    try { await accion(); } catch (e) { setError((e as Error).message); } finally { setCargando(false); }
  }

  if (listo) {
    return (
      <Pantalla>
        <Vacio icono="check" tono="verde" titulo="Contraseña cambiada" accion={conSesion ? "Continuar" : "Entrar"}
          onAccion={() => router.replace(conSesion ? "/inicio" : "/entrar")} texto={listo} />
      </Pantalla>
    );
  }

  const problema = clave && repetida ? problemaClave(clave, repetida) : null;
  const codigoOk = codigo.replace(/[\s-]/g, "").length >= 8 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.trim());
  return (
    <Pantalla titulo={conSesion ? "Cambiar mi contraseña" : "Recuperar el acceso"}
      subtitulo={conSesion ? undefined : "Pídale al Director o al Administrador un código para recuperar el acceso. Sirve una sola vez y vence en 24 horas."}
      pie={<>
        {error ? <Aviso tipo="error" texto={error} /> : null}
        <Boton texto={conSesion ? "Guardar contraseña nueva" : "Cambiar contraseña"} cargando={cargando}
          deshabilitado={(!conSesion && !codigoOk) || !clave || !repetida || Boolean(problemaClave(clave, repetida))}
          onPress={() => ejecutar(async () => {
            if (conSesion) {
              await sesion.cambiarClave(clave);
              setListo("Su contraseña nueva ya funciona y cerramos la sesión en sus otros teléfonos. Guárdela en un lugar seguro y no la comparta con nadie.");
            } else {
              setListo(await sesion.restablecerConCodigo(correo, codigo, clave));
            }
          })} />
        {conSesion ? <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoSuave, textAlign: "center" }}>Al cambiarla se cierra su cuenta en los otros teléfonos.</Text> : null}
      </>}>
      {!conectado ? <Aviso tipo="alerta" icono="sinsenal" texto="Sin señal. Para cambiar la contraseña necesita internet." /> : null}
      {conSesion ? null : (
        <>
          <Campo etiqueta="Correo con el que creó su cuenta" value={correo} onChangeText={setCorreo} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Campo etiqueta="Código que le dio el Director" value={codigo} onChangeText={(t) => setCodigo(t.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={14} />
        </>
      )}
      <View style={{ gap: 8 }}>
        <Campo etiqueta="Contraseña nueva" value={clave} onChangeText={setClave} secureTextEntry autoComplete="new-password" />
        <FuerzaClave clave={clave} />
      </View>
      <Campo etiqueta="Repítala" value={repetida} onChangeText={setRepetida} secureTextEntry autoComplete="new-password" error={problema} />
    </Pantalla>
  );
}
