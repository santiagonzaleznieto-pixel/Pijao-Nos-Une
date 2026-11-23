// P-14 Detalle de persona, con la pestaña «Personas» (0021). El servidor decide qué se ve: el Director y el
// Administrador, todo; quien la registró, todo; los demás, solo el nombre y la vereda. Muestra dónde vota (con el
// acceso a la consulta de la Registraduría) y la historia completa. Sin señal, lo guardado en el teléfono (en parte).
// Desde aquí se marca «No contactar» (7.8).
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import { etiqueta } from "@/core/catalogos";
import { fechaConDia } from "@/core/formato";
import {
  cedulaVisible, codigoPredio, fechaSinHora, numeroPredio, sabeDondeVota, telefonoVisible, textoDondeVota, type EventoHistoria, type PersonaLista,
} from "@/core/personas";
import { encolarAccion } from "@/servicios/campo";
import { cliente, useApp } from "@/servicios/contexto";
import { historiaPersona, obtenerPersona } from "@/servicios/personas";
import { Aviso, Avatar, Boton, Cargando, Dato, Fila, Insignia, ItemLista, Pantalla, Seccion, TituloMedio, Vacio } from "@/ui/componentes";
import { color, fuente, tl } from "@/ui/tema";

const SEXO: Record<string, string> = { mujer: "Mujer", hombre: "Hombre", prefiere_no_decir: "Prefiere no decir" };
const ICONO_HISTORIA: Record<string, string> = {
  registro: "Registro", visita: "Visita", autorizacion: "Autorización", necesidad: "Necesidad", tarea: "Tarea",
  verificacion: "Verificación", fusion: "Unión", auditoria: "Registro interno",
};

export default function Persona() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const router = useRouter();
  const [p, setP] = useState<PersonaLista | null | undefined>(undefined);
  const [zona, setZona] = useState<string | null>(null);
  const [historia, setHistoria] = useState<EventoHistoria[] | null>(null);
  const [errorHistoria, setErrorHistoria] = useState(false);
  const [verToda, setVerToda] = useState(false);
  const [simpatia, setSimpatia] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error" | "alerta"; texto: string } | null>(null);
  const entorno = { almacen: app.almacen, conectado: app.conectado, practica: app.practica, usuarioId: app.usuarioId };

  useEffect(() => {
    let vivo = true;
    (async () => {
      const x = await obtenerPersona(entorno, id);
      if (!vivo) return;
      setP(x);
      const vid = x?.vivienda_id;
      if (vid) {
        const v = await app.almacen.obtener("viviendas", String(vid));
        if (vivo) setZona((v?.zona_id as string) ?? null);
      }
      const h = await historiaPersona(entorno, id);
      if (!vivo) return;
      setErrorHistoria(h === "error");
      setHistoria(h === "error" ? null : h);
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, app.almacen, app.version, app.conectado]);

  if (p === undefined) return <Cargando texto="Cargando…" />;
  if (!p) {
    return (
      <Pantalla>
        <Vacio icono="persona" titulo="Persona no disponible" texto={app.conectado ? "Puede que la hayan unido con otro registro o que ya no esté." : "Sin señal solo se ven las personas guardadas en este teléfono."} />
      </Pantalla>
    );
  }

  const noContactar = (p.estado ?? "activa") !== "activa";
  const puedeEditar = (app.perfil?.esStaff ?? false) || p.propia || (app.perfil?.tiene("O-06", zona) ?? false);
  const puedeSimpatia = app.perfil?.tiene("O-02", zona) ?? false;
  const telefono = p.telefono ?? null;
  const predio = codigoPredio(p.predio);
  const nPredio = numeroPredio(predio);
  const ced = cedulaVisible(p);
  const eventos = historia ? (verToda ? historia : historia.slice(0, 12)) : [];

  async function verSimpatia() {
    const { data, error } = await cliente.rpc("rpc_persona_completa", { p_id: id });
    if (error) setMensaje({ tipo: "error", texto: app.conectado ? "No tiene permiso para ver la simpatía." : "Necesita conexión." });
    else setSimpatia(((data as { simpatia?: string | null })?.simpatia) || "Sin dato");
  }
  async function marcarNoContactar() {
    if (!app.usuarioId || !p) return;
    await encolarAccion(app.almacen, app.usuarioId, "no_contactar", { persona_id: id, motivo: "Lo pidió la persona" });
    const local = await app.almacen.obtener("personas", id);
    if (local) await app.almacen.guardar("personas", { ...local, estado: "no_contactar" } as never, true);
    setP({ ...p, estado: "no_contactar" });
    setMensaje({ tipo: "ok", texto: "Marcada como «No contactar». Se envía al servidor." });
    app.avisarCambio();
    app.sincronizar();
  }

  return (
    <Pantalla pie={!noContactar ? <Boton texto="No contactar" variante="peligro" icono="candado" onPress={marcarNoContactar} /> : undefined}>
      <View style={{ alignItems: "center", gap: 6 }}>
        <Avatar nombre={p.nombre} tam={72} tono={noContactar ? "rojo" : "azul"} />
        <TituloMedio>{p.nombre || "Persona"}</TituloMedio>
        {p.apodo ? <Text style={e.suave}>«{p.apodo}»</Text> : null}
        <Text style={[e.suave, { textAlign: "center" }]}>{[p.direccion || p.nombre_finca, p.barrio_vereda].filter(Boolean).join(" · ") || "Sin vereda registrada"}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {p.propia ? <Insignia texto="La registré yo" tono="turquesa" icono="check" /> : null}
          {p.completo && sabeDondeVota(p) ? <Insignia texto="Sabe dónde vota" tono="verde" icono="check" /> : null}
          {p.voluntario === "si" ? <Insignia texto="Quiere ser voluntario" tono="naranja" icono="mano" /> : null}
        </View>
      </View>
      {noContactar ? <Aviso tipo="error" icono="candado" texto="Esta persona pidió no ser contactada." /> : null}
      {!p.completo && !p.local ? (
        <Aviso tipo="info" icono="candado" texto="De esta persona solo puede ver el nombre y la vereda. Los demás datos los ven quien la registró y el Director." />
      ) : null}
      {p.local ? <Aviso tipo="alerta" icono="sinsenal" texto="Sin señal: se ven los datos guardados en el teléfono, en parte." /> : null}

      {p.completo || p.local ? (
        <>
          <Seccion titulo="Datos personales">
            <Dato etiqueta={p.tipo_documento === "CE" ? "Cédula de extranjería" : "Cédula"} valor={ced ?? "Sin registrar"} />
            <Dato etiqueta="Nacimiento" valor={p.fecha_nacimiento ? `${fechaSinHora(p.fecha_nacimiento)}${p.edad != null ? ` · ${p.edad} años` : ""}` : p.edad != null ? `${p.edad} años` : "Sin registrar"} />
            <Dato etiqueta="Celular" valor={telefonoVisible(p) ? `${telefonoVisible(p)}${p.telefono_es_whatsapp ? " · WhatsApp" : ""}` : "Sin registrar"} />
            {p.telefono2 ? <Dato etiqueta="Otro teléfono" valor={p.telefono2} /> : null}
            <Dato etiqueta="Correo" valor={p.correo ?? "Sin registrar"} />
            {p.sexo ? <Dato etiqueta="Sexo" valor={SEXO[p.sexo] ?? p.sexo} /> : null}
            {p.ocupacion ? <Dato etiqueta="Ocupación" valor={etiqueta("C-07", p.ocupacion, p.ocupacion)} /> : null}
            {p.canal_preferido ? <Dato etiqueta="Prefiere que lo contacten por" valor={p.canal_preferido.replace(/_/g, " ")} /> : null}
            {simpatia ? <Dato etiqueta="Simpatía [SENSIBLE]" valor={simpatia} /> : null}
            <Dato etiqueta="Autorizó que lo contacten" valor={p.contacto_autorizado ? "Sí" : "No"} ultimo />
          </Seccion>
          {telefono && !noContactar && p.contacto_autorizado ? (
            <Fila>
              <Boton texto="Llamar" icono="llamar" onPress={() => Linking.openURL(`tel:${telefono}`)} estilo={{ flex: 1 }} />
              <Boton texto="WhatsApp" variante="contorno" icono="mensaje" onPress={() => Linking.openURL(`https://wa.me/57${telefono}`)} estilo={{ flex: 1 }} />
            </Fila>
          ) : null}
          {puedeSimpatia && !simpatia && app.conectado && !app.practica ? (
            <Boton texto="Ver la simpatía (queda registrado)" variante="suave" icono="ojo" onPress={verSimpatia} />
          ) : null}

          <Seccion titulo="Dónde vota">
            <Dato etiqueta="Puesto y mesa" valor={textoDondeVota(p)} ultimo />
          </Seccion>
          {puedeEditar ? (
            <Boton texto={sabeDondeVota(p) ? "Cambiar dónde vota" : "Consultar y guardar dónde vota"} icono="pin"
              onPress={() => router.push({ pathname: "/persona/votacion", params: { id } })} />
          ) : null}

          <Seccion titulo="Vivienda">
            <Dato etiqueta="Dirección" valor={[p.direccion, p.complemento].filter(Boolean).join(" ") || p.nombre_finca || "Sin registrar"} />
            <Dato etiqueta="Vereda o barrio" valor={p.barrio_vereda ?? "Sin registrar"} />
            {p.zona ? <Dato etiqueta="Zona" valor={p.zona} /> : null}
            <Dato etiqueta="Predio (IGAC)" valor={predio ? `${nPredio ? `N.º ${nPredio} · ` : ""}${predio}` : "Sin predio asociado"} />
            <Dato etiqueta="Última visita" valor={p.ultima_visita ? fechaConDia(p.ultima_visita) : "Sin visitas"} ultimo={!p.registrado_por} />
            {p.registrado_por ? <Dato etiqueta="La registró" valor={`${p.registrado_por}${p.creado_en ? ` · ${fechaConDia(p.creado_en)}` : ""}`} ultimo /> : null}
          </Seccion>
          {p.vivienda_id ? <Boton texto="Ver la vivienda" variante="contorno" icono="casa" onPress={() => router.push(`/vivienda/${p.vivienda_id}`)} /> : null}
        </>
      ) : null}

      <Seccion titulo="Historia">
        {historia === null ? (
          <Text style={e.suave}>{errorHistoria ? "No se pudo cargar la historia. Inténtelo más tarde." : app.conectado && !app.practica ? "Cargando la historia…" : "La historia se ve con señal."}</Text>
        ) : !historia.length ? <Text style={e.suave}>Todavía no hay nada en su historia.</Text> : (
          eventos.map((h, i) => (
            <ItemLista key={`${h.fecha}-${i}`} titulo={h.titulo} ultimo={i === eventos.length - 1}
              detalle={[`${fechaConDia(h.fecha)} · ${ICONO_HISTORIA[h.tipo] ?? h.tipo}${h.por ? ` · ${h.por}` : ""}`, h.detalle].filter(Boolean).join("\n")} />
          ))
        )}
      </Seccion>
      {historia && historia.length > 12 && !verToda ? <Boton texto={`Ver toda la historia (${historia.length})`} variante="suave" onPress={() => setVerToda(true)} /> : null}
      {mensaje ? <Aviso tipo={mensaje.tipo} texto={mensaje.texto} /> : null}
    </Pantalla>
  );
}

const e = { suave: { fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoSuave } } as const;
