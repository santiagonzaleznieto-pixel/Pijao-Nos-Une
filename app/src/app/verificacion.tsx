// P-03: verificación en dos pasos con aplicación autenticadora (gratuita). Obligatoria para el Director, el
// Administrador y los permisos de riesgo alto (R-05, A4).
import { useEffect, useState } from "react";
import { SvgXml } from "react-native-svg";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Campo, Pantalla, Tarjeta, Texto } from "@/ui/componentes";

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
    } catch (e) { setMensaje({ tipo: "error", texto: (e as Error).message }); } finally { setCargando(false); }
  }

  const tieneFactor = nivel?.siguiente === "aal2";
  return (
    <Pantalla titulo="Verificación en dos pasos">
      <Texto>Use una aplicación autenticadora gratuita en su teléfono (por ejemplo Aegis, de código abierto, o Google Authenticator).</Texto>
      {nivel?.actual === "aal2" ? <Aviso tipo="ok" texto="Su sesión ya está verificada en dos pasos." /> : null}
      {!tieneFactor && !alta ? <Boton texto="Activar la aplicación autenticadora" onPress={activar} cargando={cargando} /> : null}
      {alta ? (
        <Tarjeta>
          <Texto negrita>1. Escanee este código con la aplicación</Texto>
          <SvgXml xml={alta.qr} width={200} height={200} />
          <Texto suave>O escriba esta clave a mano: {alta.secreto}</Texto>
        </Tarjeta>
      ) : null}
      {tieneFactor || alta ? (
        <>
          <Campo etiqueta="Código de 6 dígitos que muestra la aplicación" value={codigo} onChangeText={setCodigo} keyboardType="number-pad" maxLength={6} />
          <Boton texto="Verificar" onPress={verificar} cargando={cargando} deshabilitado={codigo.length !== 6} />
        </>
      ) : null}
      {mensaje ? <Aviso tipo={mensaje.tipo} texto={mensaje.texto} /> : null}
    </Pantalla>
  );
}
