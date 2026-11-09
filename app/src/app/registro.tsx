// P-04: crear cuenta con el código de invitación (4.9), en tres pasos como en el diseño de la Fase 2. El servidor valida el
// código, la mayoría de edad y el correo (A7, A8).
import { useRouter } from "expo-router";
import { useState } from "react";
import { normalizarCelular, validarCorreo, validarNombre } from "@/core/validadores";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Campo, Casilla, Fila, Opciones, Pantalla, Pasos, Vacio } from "@/ui/componentes";

const NOMBRES = ["Sus datos", "Contraseña y emergencia", "Declaración"];

export default function Registro() {
  const { sesion } = useApp();
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [f, setF] = useState({ codigo: "", nombre: "", correo: "", clave: "", clave2: "", celular: "", emergenciaNombre: "", emergenciaCelular: "" });
  const [mayor, setMayor] = useState(false);
  const [servidor, setServidor] = useState(false);
  const [contratista, setContratista] = useState(false);
  const [tipo, setTipo] = useState<"voluntario" | "contratado">("voluntario");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const cambiar = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  function validar(p: number): string | null {
    if (p === 0) {
      if (f.codigo.replace(/[\s-]/g, "").length < 8) return "Escriba el código de invitación completo.";
      const n = validarNombre(f.nombre, "El nombre"); if (!n.ok) return n.mensaje;
      const c = validarCorreo(f.correo); if (!c.ok) return c.mensaje;
      if (f.celular && !normalizarCelular(f.celular)) return "El celular debe tener 10 dígitos y empezar por 3.";
    }
    if (p === 1) {
      if (f.clave.length < 12) return "La contraseña debe tener al menos 12 caracteres.";
      if (f.clave !== f.clave2) return "Las dos contraseñas no coinciden.";
      if (!f.emergenciaNombre || !normalizarCelular(f.emergenciaCelular)) return "Escriba un contacto de emergencia con su celular.";
    }
    if (p === 2 && !mayor) return "Solo pueden registrarse personas mayores de 18 años (R-06).";
    return null;
  }

  function siguiente() {
    const v = validar(paso);
    if (v) { setError(v); return; }
    setError(null);
    if (paso < 2) setPaso(paso + 1); else crear();
  }

  async function crear() {
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
      <Pantalla>
        <Vacio icono="check" tono="verde" titulo="Cuenta creada" texto={`${ok} Cuando el Director apruebe su cuenta, entre con su correo y contraseña para leer los acuerdos y hacer el curso de ingreso.`}
          accion="Ir a entrar" onAccion={() => router.replace("/entrar")} />
      </Pantalla>
    );
  }

  return (
    <Pantalla arriba={<Pasos actual={paso + 1} total={3} nombre={NOMBRES[paso]} />}
      pie={<>
        {error ? <Aviso tipo="error" texto={error} /> : null}
        <Fila>
          {paso > 0 ? <Boton texto="Atrás" variante="suave" onPress={() => { setError(null); setPaso(paso - 1); }} estilo={{ flex: 1 }} /> : null}
          <Boton texto={paso < 2 ? "Continuar" : "Crear cuenta"} onPress={siguiente} cargando={cargando} estilo={{ flex: 1 }} />
        </Fila>
      </>}>
      {paso === 0 ? (
        <>
          <Campo etiqueta="Código de invitación" value={f.codigo} onChangeText={cambiar("codigo")} autoCapitalize="characters" ayuda="Se lo envió el Director. Vence a los pocos días." />
          <Campo etiqueta="Nombres y apellidos" value={f.nombre} onChangeText={cambiar("nombre")} autoComplete="name" />
          <Campo etiqueta="Celular" value={f.celular} onChangeText={cambiar("celular")} keyboardType="phone-pad" />
          <Campo etiqueta="Correo" value={f.correo} onChangeText={cambiar("correo")} autoCapitalize="none" keyboardType="email-address" ayuda="Si la invitación trae un correo, debe ser el mismo." />
        </>
      ) : null}
      {paso === 1 ? (
        <>
          <Campo etiqueta="Contraseña" value={f.clave} onChangeText={cambiar("clave")} secureTextEntry autoComplete="new-password" ayuda="Mínimo 12 caracteres. Una frase corta es fácil de recordar y difícil de adivinar." />
          <Campo etiqueta="Repita la contraseña" value={f.clave2} onChangeText={cambiar("clave2")} secureTextEntry autoComplete="new-password" />
          <Campo etiqueta="Contacto de emergencia: nombre" value={f.emergenciaNombre} onChangeText={cambiar("emergenciaNombre")} />
          <Campo etiqueta="Contacto de emergencia: celular" value={f.emergenciaCelular} onChangeText={cambiar("emergenciaCelular")} keyboardType="phone-pad" />
        </>
      ) : null}
      {paso === 2 ? (
        <>
          <Opciones etiqueta="Vinculación" opciones={[["voluntario", "Voluntario"], ["contratado", "Contratado"]]} valor={tipo} onCambio={(v) => setTipo(v as typeof tipo)} />
          <Casilla texto="Soy mayor de 18 años" valor={mayor} onCambio={setMayor} />
          <Casilla texto="Soy servidor público" valor={servidor} onCambio={setServidor} detalle="El Director lo revisará con el abogado (R-07)." />
          <Casilla texto="Soy contratista del Estado" valor={contratista} onCambio={setContratista} />
        </>
      ) : null}
    </Pantalla>
  );
}
