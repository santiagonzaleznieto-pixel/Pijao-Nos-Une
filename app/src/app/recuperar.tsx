// P-07 Recuperar el acceso: código de un solo uso por correo y contraseña nueva. Al terminar se cierran las sesiones de los
// demás teléfonos y la persona recibe un aviso de «contraseña cambiada» en sus teléfonos habituales (migración 0016).
// Con la sesión abierta sirve también para cambiar la contraseña (por ejemplo, después de tocar «No fui yo»).
import { useRouter } from "expo-router";
import { useState } from "react";
import { problemaClave } from "@/core/acceso";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Campo, Pantalla, Texto } from "@/ui/componentes";

export default function Recuperar() {
  const { sesion, conectado, usuarioId } = useApp();
  const router = useRouter();
  const conSesion = Boolean(usuarioId);
  const [paso, setPaso] = useState<"correo" | "codigo" | "listo">(conSesion ? "codigo" : "correo");
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

  if (paso === "listo") {
    return (
      <Pantalla titulo="Contraseña cambiada">
        <Aviso tipo="ok" texto="Listo. Su contraseña nueva ya funciona y cerramos la sesión en sus otros teléfonos." />
        <Texto>Guárdela en un lugar seguro y no la comparta con nadie, ni siquiera con el equipo de la campaña.</Texto>
        <Boton texto="Continuar" onPress={() => router.replace("/inicio")} />
      </Pantalla>
    );
  }

  if (paso === "correo") {
    return (
      <Pantalla titulo="Recuperar el acceso">
        <Texto>Escriba el correo con el que creó su cuenta. Le enviaremos un código para poner una contraseña nueva.</Texto>
        {!conectado ? <Aviso tipo="alerta" texto="Sin señal. Para recuperar el acceso necesita internet." /> : null}
        <Campo etiqueta="Correo" value={correo} onChangeText={setCorreo} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        {error ? <Aviso tipo="error" texto={error} /> : null}
        <Boton texto="Enviarme el código" cargando={cargando} deshabilitado={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.trim())}
          onPress={() => ejecutar(async () => { await sesion.pedirCodigoRecuperacion(correo); setPaso("codigo"); })} />
        <Boton texto="Volver" variante="suave" onPress={() => router.back()} />
        <Texto suave tam="pequena">Si no le llega el correo en unos minutos, revise la carpeta de spam o pida ayuda al Administrador.</Texto>
      </Pantalla>
    );
  }

  const problema = clave ? problemaClave(clave, repetida || undefined) : null;
  return (
    <Pantalla titulo={conSesion ? "Cambiar mi contraseña" : "Escriba el código"}>
      {conSesion ? null : (
        <>
          <Aviso tipo="info" texto={`Si ${correo.trim()} tiene una cuenta, le llegó un correo con un código. Escríbalo aquí.`} />
          <Campo etiqueta="Código del correo" value={codigo} onChangeText={setCodigo} keyboardType="number-pad" autoComplete="one-time-code" />
        </>
      )}
      <Campo etiqueta="Contraseña nueva" value={clave} onChangeText={setClave} secureTextEntry autoComplete="new-password"
        ayuda="Mínimo 12 caracteres. Una frase corta es fácil de recordar y difícil de adivinar." />
      <Campo etiqueta="Repita la contraseña nueva" value={repetida} onChangeText={setRepetida} secureTextEntry autoComplete="new-password" error={problema} />
      {error ? <Aviso tipo="error" texto={error} /> : null}
      <Boton texto="Guardar contraseña nueva" cargando={cargando}
        deshabilitado={(!conSesion && codigo.replace(/\D/g, "").length < 6) || !clave || !repetida || Boolean(problemaClave(clave, repetida))}
        onPress={() => ejecutar(async () => {
          if (conSesion) await sesion.cambiarClave(clave);
          else await sesion.recuperarConCodigo(correo, codigo, clave);
          setPaso("listo");
        })} />
      {conSesion ? null : <Boton texto="Pedir otro código" variante="suave" onPress={() => { setCodigo(""); setPaso("correo"); }} />}
    </Pantalla>
  );
}
