// P-04: crear cuenta con el código de invitación (4.9). El servidor valida el código, la mayoría de edad y el correo (A7, A8).
import { useRouter } from "expo-router";
import { useState } from "react";
import { normalizarCelular, validarCorreo, validarNombre } from "@/core/validadores";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Campo, Casilla, Opciones, Pantalla, Texto } from "@/ui/componentes";

export default function Registro() {
  const { sesion } = useApp();
  const router = useRouter();
  const [f, setF] = useState({ codigo: "", nombre: "", correo: "", clave: "", clave2: "", celular: "", emergenciaNombre: "", emergenciaCelular: "" });
  const [mayor, setMayor] = useState(false);
  const [servidor, setServidor] = useState(false);
  const [contratista, setContratista] = useState(false);
  const [tipo, setTipo] = useState<"voluntario" | "contratado">("voluntario");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const cambiar = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  function validar(): string | null {
    if (f.codigo.replace(/[\s-]/g, "").length < 8) return "Escriba el código de invitación completo.";
    const n = validarNombre(f.nombre, "El nombre"); if (!n.ok) return n.mensaje;
    const c = validarCorreo(f.correo); if (!c.ok) return c.mensaje;
    if (f.celular && !normalizarCelular(f.celular)) return "El celular debe tener 10 dígitos y empezar por 3.";
    if (f.clave.length < 12) return "La contraseña debe tener al menos 12 caracteres.";
    if (f.clave !== f.clave2) return "Las dos contraseñas no coinciden.";
    if (!mayor) return "Solo pueden registrarse personas mayores de 18 años (R-06).";
    if (!f.emergenciaNombre || !normalizarCelular(f.emergenciaCelular)) return "Escriba un contacto de emergencia con su celular.";
    return null;
  }

  async function crear() {
    const v = validar();
    if (v) { setError(v); return; }
    setError(null);
    setCargando(true);
    try {
      const m = await sesion.registrarConCodigo({
        codigo: f.codigo, nombre: f.nombre.trim(), correo: f.correo, clave: f.clave, celular: normalizarCelular(f.celular) ?? "",
        mayor_de_edad: mayor, es_servidor_publico: servidor, es_contratista_estado: contratista, tipo_vinculacion: tipo,
        contacto_emergencia_nombre: f.emergenciaNombre.trim(), contacto_emergencia_celular: normalizarCelular(f.emergenciaCelular) ?? "",
      });
      setOk(m);
    } catch (e) { setError((e as Error).message); } finally { setCargando(false); }
  }

  if (ok) {
    return (
      <Pantalla titulo="Cuenta creada">
        <Aviso tipo="ok" texto={ok} />
        <Texto>Cuando el Director apruebe su cuenta, entre con su correo y contraseña para leer los acuerdos y hacer el curso de ingreso.</Texto>
        <Boton texto="Ir a entrar" onPress={() => router.replace("/entrar")} />
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo="Crear cuenta con invitación">
      <Campo etiqueta="Código de invitación" value={f.codigo} onChangeText={cambiar("codigo")} autoCapitalize="characters" />
      <Campo etiqueta="Nombre completo" value={f.nombre} onChangeText={cambiar("nombre")} autoComplete="name" />
      <Campo etiqueta="Correo" value={f.correo} onChangeText={cambiar("correo")} autoCapitalize="none" keyboardType="email-address" ayuda="Si la invitación trae un correo, debe ser el mismo." />
      <Campo etiqueta="Celular" value={f.celular} onChangeText={cambiar("celular")} keyboardType="phone-pad" />
      <Campo etiqueta="Contraseña (mínimo 12 caracteres)" value={f.clave} onChangeText={cambiar("clave")} secureTextEntry />
      <Campo etiqueta="Repita la contraseña" value={f.clave2} onChangeText={cambiar("clave2")} secureTextEntry />
      <Campo etiqueta="Contacto de emergencia: nombre" value={f.emergenciaNombre} onChangeText={cambiar("emergenciaNombre")} />
      <Campo etiqueta="Contacto de emergencia: celular" value={f.emergenciaCelular} onChangeText={cambiar("emergenciaCelular")} keyboardType="phone-pad" />
      <Opciones etiqueta="Vinculación" opciones={[["voluntario", "Voluntario"], ["contratado", "Contratado"]]} valor={tipo} onCambio={(v) => setTipo(v as typeof tipo)} />
      <Casilla texto="Soy mayor de 18 años" valor={mayor} onCambio={setMayor} />
      <Casilla texto="Soy servidor público" valor={servidor} onCambio={setServidor} detalle="El Director lo revisará con el abogado (R-07)." />
      <Casilla texto="Soy contratista del Estado" valor={contratista} onCambio={setContratista} />
      {error ? <Aviso tipo="error" texto={error} /> : null}
      <Boton texto="Crear cuenta" onPress={crear} cargando={cargando} />
    </Pantalla>
  );
}
