// Invitar y aprobar desde el celular (pedido del dueño, 18 de noviembre de 2026): el Director y el Administrador (o quien
// tenga O-08) invitan con un código que se manda por WhatsApp con el enlace de la app, aprueban las cuentas nuevas y le dan
// a alguien del equipo un código para recuperar el acceso si olvidó la contraseña. Necesita conexión.
import { useCallback, useEffect, useState } from "react";
import { Share, View } from "react-native";
import { fechaHora } from "@/core/formato";
import { normalizarCelular, validarNombre } from "@/core/validadores";
import { cliente, useApp } from "@/servicios/contexto";
import { enviarPorWhatsapp, mensajeCodigoAcceso, mensajeInvitacion } from "@/servicios/enlaces";
import { Aviso, Boton, Campo, Cargando, ErrorReintentar, Ficha, Fila, ItemLista, Opciones, Pantalla, Seccion, SinPermiso, Texto } from "@/ui/componentes";

interface Cuenta { id: string; nombre_completo: string | null; celular: string | null; rol: string; estado: string; creado_en: string }
interface Codigo { para: string; celular: string | null; codigo: string; texto: string }

const ESTADO: Record<string, string> = { pendiente: "Espera aprobación", aprobado: "Aprobada: falta el curso", activo: "Activa", suspendido: "Suspendida" };

export default function Invitar() {
  const app = useApp();
  const puede = Boolean(app.perfil?.puede("invitar")) && !app.practica;
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [rol, setRol] = useState("colaborador");
  const [hecho, setHecho] = useState<Codigo | null>(null);
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [acceso, setAcceso] = useState<Codigo | null>(null);

  const cargar = useCallback(async () => {
    setErrorLista(null);
    const { data, error: e } = await cliente.from("perfiles").select("id,nombre_completo,celular,rol,estado,creado_en")
      .in("estado", ["pendiente", "aprobado", "activo", "suspendido"]).order("creado_en", { ascending: false }).limit(300);
    if (e) setErrorLista("No se pudo leer el equipo. Revise la conexión.");
    else setCuentas((data as Cuenta[]) ?? []);
  }, []);
  useEffect(() => { if (puede && app.conectado) void cargar(); }, [puede, app.conectado, cargar]);

  async function hacer(clave: string, accion: () => Promise<void>) {
    setError(null);
    setOcupado(clave);
    try { await accion(); } catch (e) { setError((e as Error).message); } finally { setOcupado(null); }
  }

  if (!puede) return <Pantalla><SinPermiso texto={app.practica ? "En el modo práctica no se invita a nadie." : "Solo el Director, el Administrador o quien tenga el permiso de gestionar el equipo."} /></Pantalla>;

  const invitar = () => hacer("invitar", async () => {
    const n = validarNombre(nombre, "El nombre");
    if (!n.ok) throw new Error(n.mensaje);
    const cel = celular.trim() ? normalizarCelular(celular) : null;
    if (celular.trim() && !cel) throw new Error("El celular debe tener 10 dígitos y empezar por 3.");
    const { data, error: e } = await cliente.rpc("rpc_invitar", { p_nombre: nombre.trim(), p_celular: cel, p_correo: null, p_rol: rol });
    if (e) throw new Error(e.message || "No se pudo crear la invitación.");
    const r = data as { codigo: string; expira_en: string };
    setHecho({ para: nombre.trim(), celular: cel, codigo: r.codigo, texto: mensajeInvitacion(nombre, r.codigo, r.expira_en) });
    setNombre(""); setCelular(""); setRol("colaborador");
  });

  const pendientes = (cuentas ?? []).filter((c) => c.estado === "pendiente");
  const equipo = (cuentas ?? []).filter((c) => c.estado !== "pendiente" && c.id !== app.usuarioId);

  return (
    <Pantalla titulo="Invitar y aprobar" subtitulo="Sume colaboradores: cree la invitación y mándela por WhatsApp con el enlace de la app.">
      {!app.conectado ? <Aviso tipo="alerta" icono="sinsenal" texto="Sin señal. Para invitar y aprobar necesita internet." /> : null}
      {error ? <Aviso tipo="error" texto={error} /> : null}

      <Seccion titulo="1. Invitar a una persona">
        {hecho ? (
          <View style={{ gap: 10 }}>
            <Aviso tipo="ok" icono="check" texto={`Invitación lista para ${hecho.para}. Código: ${hecho.codigo}`} />
            <Boton texto="Enviar por WhatsApp" icono="mensaje" onPress={() => enviarPorWhatsapp(hecho.texto, hecho.celular)} />
            <Fila>
              <Boton texto="Compartir de otra forma" variante="contorno" onPress={() => Share.share({ message: hecho.texto })} estilo={{ flex: 1 }} />
              <Boton texto="Invitar a otra" variante="suave" onPress={() => setHecho(null)} estilo={{ flex: 1 }} />
            </Fila>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Campo etiqueta="Nombre de la persona" value={nombre} onChangeText={setNombre} autoCapitalize="words" />
            <Campo etiqueta="Celular (opcional, para abrir su chat)" value={celular} onChangeText={setCelular} keyboardType="phone-pad" maxLength={13} />
            {app.perfil?.esAdmin ? <Opciones etiqueta="Rol" opciones={[["colaborador", "Colaborador"], ["director", "Director"]]} valor={rol} onCambio={(v) => setRol(v as string)} /> : null}
            <Boton texto="Crear invitación" icono="persona" onPress={invitar} cargando={ocupado === "invitar"} deshabilitado={!nombre.trim() || !app.conectado} />
            <Texto suave tam="pequena">El código sirve una sola vez y vence en 72 horas. La persona crea su cuenta y usted la aprueba aquí abajo.</Texto>
          </View>
        )}
      </Seccion>

      <Seccion titulo={`2. Cuentas por aprobar${pendientes.length ? ` (${pendientes.length})` : ""}`} accion={<Boton texto="Actualizar" variante="suave" onPress={cargar} />}>
        {errorLista ? <ErrorReintentar texto={errorLista} onReintentar={cargar} /> : cuentas === null ? <Cargando /> : !pendientes.length
          ? <Texto suave>No hay cuentas esperando aprobación.</Texto>
          : pendientes.map((c) => (
            <View key={c.id} style={{ gap: 8 }}>
              <ItemLista titulo={c.nombre_completo ?? "Sin nombre"} detalle={`Creó su cuenta: ${fechaHora(c.creado_en)}`} izquierda={<Ficha icono="persona" tono="naranja" />} ultimo />
              {rechazando === c.id ? (
                <View style={{ gap: 8 }}>
                  <Campo etiqueta="Motivo del rechazo" value={motivo} onChangeText={setMotivo} />
                  <Fila>
                    <Boton texto="Rechazar" variante="peligro" cargando={ocupado === `r${c.id}`} deshabilitado={!motivo.trim()} estilo={{ flex: 1 }}
                      onPress={() => hacer(`r${c.id}`, async () => {
                        const { error: e } = await cliente.rpc("rpc_rechazar_usuario", { p_id: c.id, p_motivo: motivo.trim() });
                        if (e) throw new Error(e.message);
                        setRechazando(null); setMotivo(""); await cargar();
                      })} />
                    <Boton texto="Cancelar" variante="suave" onPress={() => { setRechazando(null); setMotivo(""); }} estilo={{ flex: 1 }} />
                  </Fila>
                </View>
              ) : (
                <Fila>
                  <Boton texto="Aprobar" icono="check" cargando={ocupado === `a${c.id}`} estilo={{ flex: 1 }}
                    onPress={() => hacer(`a${c.id}`, async () => {
                      const { error: e } = await cliente.rpc("rpc_aprobar_usuario", { p_id: c.id });
                      if (e) throw new Error(e.message);
                      await cargar();
                    })} />
                  <Boton texto="Rechazar" variante="contorno" onPress={() => setRechazando(c.id)} estilo={{ flex: 1 }} />
                </Fila>
              )}
            </View>
          ))}
      </Seccion>

      <Seccion titulo="3. Recuperar el acceso de alguien">
        <Texto suave tam="pequena">Si alguien olvidó la contraseña, dele un código: sirve una vez y vence en 24 horas.</Texto>
        {acceso ? (
          <View style={{ gap: 10 }}>
            <Aviso tipo="ok" icono="llave" texto={`Código para ${acceso.para}: ${acceso.codigo}`} />
            <Fila>
              <Boton texto="Enviar por WhatsApp" icono="mensaje" onPress={() => enviarPorWhatsapp(acceso.texto, acceso.celular)} estilo={{ flex: 1 }} />
              <Boton texto="Listo" variante="suave" onPress={() => setAcceso(null)} estilo={{ flex: 1 }} />
            </Fila>
          </View>
        ) : cuentas === null ? null : !equipo.length ? <Texto suave>Todavía no hay más personas en el equipo.</Texto> : equipo.map((c, i) => (
          <ItemLista key={c.id} titulo={c.nombre_completo ?? "Sin nombre"} detalle={`${ESTADO[c.estado] ?? c.estado}${c.rol !== "colaborador" ? ` · ${c.rol === "admin" ? "Administrador" : "Director"}` : ""}`}
            izquierda={<Ficha icono="persona" tono={c.estado === "activo" ? "verde" : "gris"} />} ultimo={i === equipo.length - 1}
            derecha={<Boton texto="Código" variante="suave" cargando={ocupado === `c${c.id}`}
              onPress={() => hacer(`c${c.id}`, async () => {
                const { data, error: e } = await cliente.rpc("rpc_codigo_acceso", { p_usuario: c.id });
                if (e) throw new Error(/function|schema cache/i.test(e.message) ? "El servidor todavía no tiene esta función (falta aplicar la migración 0020)." : e.message);
                const codigo = (data as { codigo: string }).codigo;
                setAcceso({ para: c.nombre_completo ?? "la persona", celular: c.celular, codigo, texto: mensajeCodigoAcceso(c.nombre_completo ?? "", codigo) });
              })} />} />
        ))}
      </Seccion>
    </Pantalla>
  );
}
