// P-12 Nueva visita: asistente de 12 pasos (6.3) con borrador automático, validaciones por paso y semáforo (6.4).
// Una vivienda existente solo agrega la visita sin repetir el cuestionario (6.7).
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Modal, Text, View } from "react-native";
import { evaluarRegistro } from "@/core/calidad";
import { claves, etiqueta, opciones, RESULTADOS_CON_CONTACTO, RESULTADOS_SOLO_PUNTO } from "@/core/catalogos";
import { autorizacionVigente, CANAL_A_PROPOSITO, canalesAtencion, evidenciaPara, nuevoConsentimiento, textoPara, TEXTO_SENSIBLE, VERSION_TEXTO_LOCAL, type Metodo, type TextoVigente } from "@/core/consentimiento";
import { zonaDePunto, type Geometria } from "@/core/geo";
import { nuevoId } from "@/core/ids";
import { param } from "@/core/reglas";
import { avisosDeNota, normalizarTelefono, palabrasSospechosas, validarCedula, validarCorreo, validarEdades, validarFechaNacimiento, validarNombre } from "@/core/validadores";
import { segundosRegistro, tipoRegistro } from "@/core/metricas";
import { borradorVacio, type Borrador, type PersonaBorrador } from "@/core/visita";
import { guardarBorrador, guardarVisita } from "@/servicios/campo";
import { useApp } from "@/servicios/contexto";
import { CamaraFoto } from "@/ui/CamaraFoto";
import { Aviso, Avatar, Boton, Campo, Cargando, Casilla, Contador, Dato, Enlace, Etiqueta, Fila, ItemLista, Opciones, Pantalla, Pasos, Seccion, Semaforo, Texto, Vacio } from "@/ui/componentes";
import { Firma } from "@/ui/Firma";
import { color, fuente, radio, tl } from "@/ui/tema";

const PASOS = ["Antes de empezar", "Ubicación", "Foto de fachada", "Vivienda", "Resultado", "Hogar", "Personas", "Necesidades",
  "Participación", "Simpatía", "Autorización", "Notas", "Cierre"];
const SI_NO: [string, string][] = [["si", "Sí"], ["no", "No"], ["no_sabe", "No sabe"]];
const OCUPACION_VIV: [string, string][] = [["habitada", "Habitada"], ["deshabitada", "Deshabitada"], ["construccion", "En construcción"], ["temporal", "Uso temporal o turístico"]];
const RIESGOS: [string, string][] = [["derrumbe", "Derrumbe"], ["inundacion", "Inundación"], ["quebrada", "Cerca de quebrada"]];
const ACTIVIDAD: [string, string][] = [["negocio", "Negocio"], ["finca_cafetera", "Finca cafetera"], ["alojamiento", "Alojamiento turístico"], ["otra", "Otra"], ["ninguna", "Ninguna"]];
const RELACION: [string, string][] = [["jefe", "Jefe o jefa"], ["conyuge", "Cónyuge"], ["hijo", "Hijo o hija"], ["otro", "Otro"]];
const LABORAL: [string, string][] = [["formal", "Empleo formal"], ["informal", "Informal"], ["independiente", "Independiente"], ["sin_empleo", "Sin empleo"], ["pensionado", "Pensionado"]];
const SEXO: [string, string][] = [["mujer", "Mujer"], ["hombre", "Hombre"], ["prefiere_no_decir", "Prefiere no decir"]];

export default function Visita() {
  const app = useApp();
  const router = useRouter();
  const q = useLocalSearchParams<{ borrador?: string; vivienda?: string }>();
  const [b, setB] = useState<Borrador | null>(null);
  const [camara, setCamara] = useState<"fachada" | "problema" | "autorizacion" | null>(null);
  const [persona, setPersona] = useState<PersonaBorrador | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aut, setAut] = useState({ metodo: null as Metodo | null, registro: false, datos: false, contacto: false, simpatia: false, historia: false, firma: null as unknown, noVolver: false });
  const [guardado, setGuardado] = useState<{ color: string; motivos: string[] } | null>(null);
  const [vistas, setVistas] = useState(0);
  // A1: versión y texto de autorización vigentes en el servidor (P-42); sin copia local, los que trae la app.
  const [textoAut, setTextoAut] = useState<TextoVigente>({ version: VERSION_TEXTO_LOCAL, contenido: null });
  const [canales, setCanales] = useState({ correo: "", whatsapp: "" });

  useEffect(() => {
    (async () => {
      setVistas((await app.almacen.getMeta<number>("vistas_antes_de_empezar")) ?? 0);
      setTextoAut(autorizacionVigente(await app.almacen.listar("textos_legales")));
      setCanales(canalesAtencion(await app.almacen.listar("configuracion")));
      if (q.borrador) { setB((await app.almacen.obtener("borradores", q.borrador)) as unknown as Borrador); return; }
      if (q.vivienda && app.usuarioId) {
        const v = await app.almacen.obtener("viviendas", q.vivienda);
        const nb = borradorVacio(app.usuarioId, { existente: v as { id: string } });
        nb.paso = 2;
        setB(nb);
      }
    })();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!b) return <Cargando />;
  const bb = b;

  async function cambiar(nuevo: Borrador) { setB(nuevo); await guardarBorrador(app.almacen, nuevo); }   // borrador automático
  const viv = (k: string, v: unknown) => cambiar({ ...bb, vivienda: { ...bb.vivienda, [k]: v } });
  const vis = (k: string, v: unknown) => cambiar({ ...bb, visita: { ...bb.visita, [k]: v } });
  const hog = (k: string, v: unknown) => cambiar({ ...bb, hogar: { ...(bb.hogar ?? { id: nuevoId() }), [k]: v } });
  const soloPunto = RESULTADOS_SOLO_PUNTO.has(bb.visita.resultado ?? "");
  const conContacto = RESULTADOS_CON_CONTACTO.has(bb.visita.resultado ?? "");

  // Pasos que se saltan: vivienda existente (6.7) y resultados sin contacto (solo el punto, 6.3).
  function saltar(i: number): boolean {
    if (bb.vivienda_existente && (i === 1 || i === 3)) return true;
    if (bb.vivienda_existente && i === 2) return true;
    if (soloPunto && i >= 5 && i <= 10) return true;
    if (!bb.personas.length && i === 9) return true;
    return false;
  }

  function validarPaso(i: number): string | null {
    if (i === 2 && !bb.fotos.some((f) => f.tipo === "fachada") && !bb.visita.no_autorizo_foto) return "Tome la foto de fachada o marque «No autorizó la foto».";
    if (i === 3) {
      if (!bb.vivienda.tipo_vivienda || !bb.vivienda.zona_urbana_rural || !bb.vivienda.estado_ocupacion) return "Complete el tipo de vivienda, la zona y el estado de ocupación.";
      if (!String(bb.vivienda.direccion ?? "").trim()) return "Escriba la dirección o la descripción del lugar.";
    }
    if (i === 4) {
      if (!bb.visita.resultado) return "Elija el resultado del contacto.";
      if (conContacto && !bb.visita.autorizacion_verbal) return "Si hubo conversación, confirme la autorización verbal para registrar la visita.";
    }
    if (i === 5 && bb.hogar) {
      const r = validarEdades(bb.hogar.total_personas, bb.hogar.edades as Record<string, number>);
      if (!r.ok) return r.mensaje;
    }
    if (i === 10 && !soloPunto) {
      if (!aut.metodo) return "Elija cómo autoriza la persona.";
      if (!aut.registro) return "Sin autorización para registrar la vivienda no se puede guardar la visita.";
      if (bb.personas.length && !aut.datos) return "Sin autorización de datos personales no se guardan las personas: quítelas o marque la autorización.";
      if (aut.metodo === "firma_pantalla" && !aut.firma) return "Recoja la firma en pantalla.";
      if (aut.metodo === "papel" && !bb.fotos.some((f) => f.tipo === "autorizacion")) return "Tome la foto de la autorización en papel.";
    }
    return null;
  }

  async function ir(delta: number) {
    if (delta > 0) {
      const v = validarPaso(bb.paso);
      if (v) { setError(v); return; }
      if (bb.paso === 10) await construirConsentimientos();
    }
    setError(null);
    let p = bb.paso + delta;
    while (p > 0 && p < PASOS.length - 1 && saltar(p)) p += delta;
    if (bb.paso === 0) await app.almacen.setMeta("vistas_antes_de_empezar", vistas + 1);
    await cambiar({ ...bb, paso: Math.max(0, Math.min(PASOS.length - 1, p)) });
  }

  async function construirConsentimientos() {
    const base = { versionTexto: textoAut.version, lat: bb.dispositivo.lat ?? null, lng: bb.dispositivo.lng ?? null, evidencia: evidenciaPara(aut.metodo!, { firma: aut.firma }) };
    const cons = [nuevoConsentimiento("registro_vivienda", aut.metodo!, base)];
    for (const p of bb.personas) {
      if (aut.datos) cons.push(nuevoConsentimiento("datos_personales", aut.metodo!, { ...base, personaId: p.id }));
      if (aut.contacto && p.interes_info && CANAL_A_PROPOSITO[p.canal_preferido as string]) cons.push(nuevoConsentimiento(CANAL_A_PROPOSITO[p.canal_preferido as string], aut.metodo!, { ...base, personaId: p.id }));
      if (aut.simpatia && p.simpatia && p.simpatia !== "no_registrado") cons.push(nuevoConsentimiento("dato_sensible_simpatia", aut.metodo!, { ...base, personaId: p.id }));
      if (aut.historia) cons.push(nuevoConsentimiento("uso_historia", aut.metodo!, { ...base, personaId: p.id }));
    }
    const personas = bb.personas.map((p) => (aut.simpatia ? p : { ...p, simpatia: null }));   // R-19
    const visita = aut.noVolver ? { ...bb.visita, resultado: "pidio_no_ser_visitado" } : bb.visita;   // 6.3 paso 8
    await cambiar({ ...bb, consentimientos: cons, personas, visita });
  }

  async function guardar() {
    const r = await guardarVisita(app.almacen, bb);
    setGuardado(r);
    // 22.3: tiempo por registro, calidad y registros sin señal, sin datos de la casa ni de las personas.
    const seg = segundosRegistro(bb.creado_en);
    if (seg !== null) app.metrica("registro_segundos", seg, tipoRegistro(bb.visita.resultado, soloPunto, bb.vivienda_existente));
    if (["verde", "amarillo", "rojo"].includes(r.color)) app.metrica("registro_calidad", null, r.color);
    if (!app.conectado) app.metrica("registro_sin_senal");
    app.avisarCambio();
    app.sincronizar();
  }

  // Zona y barrio o vereda según el polígono (5.15).
  async function proponerZona() {
    const zonas = (await app.almacen.listar("zonas")) as { id: string; nombre: string; tipo: string; poligono?: Geometria }[];
    const z = zonaDePunto(Number(bb.vivienda.lat), Number(bb.vivienda.lng), zonas);
    if (z) await cambiar({ ...bb, vivienda: { ...bb.vivienda, barrio_vereda: z.nombre, zona_urbana_rural: z.tipo === "vereda" ? "rural" : "urbana" } });
  }

  if (guardado) {
    return (
      <Pantalla>
        <Vacio icono="check" tono="verde" titulo="Visita guardada" texto={app.conectado ? "Se está enviando. Gracias por recorrer Pijao." : "Quedó en el teléfono y se enviará sola cuando haya señal. Gracias por recorrer Pijao."} />
        <View style={{ alignItems: "center" }}><Semaforo nivel={guardado.color} /></View>
        {guardado.motivos.length ? <Seccion titulo="Para revisar">{guardado.motivos.map((m) => <Texto key={m}>• {m}</Texto>)}</Seccion> : null}
        <Boton texto="Volver al mapa" icono="mapa" onPress={() => router.replace("/mapa")} />
      </Pantalla>
    );
  }

  if (camara) {
    return (
      <Modal animationType="slide" onRequestClose={() => setCamara(null)}>
        <CamaraFoto sello={{ lat: bb.dispositivo.lat ?? Number(bb.vivienda.lat), lng: bb.dispositivo.lng ?? Number(bb.vivienda.lng), iniciales: (app.perfil?.d.nombre ?? "").split(" ").map((x) => x[0]).join("").slice(0, 3) }}
          alCancelar={() => setCamara(null)}
          alTomar={async (f) => {
            setCamara(null);
            if (bb.fotos.length >= param(app.params, "fotos_max_visita")) { setError("Ya tiene el máximo de fotos de esta visita (R-14)."); return; }
            await cambiar({ ...bb, fotos: [...bb.fotos.filter((x) => !(camara === "fachada" && x.tipo === "fachada")), { id: f.id, tipo: camara, archivo_local: f.archivo, tam_bytes: f.tam_bytes, con_personas: f.con_personas, tomada_en: f.tomada_en, lat: bb.dispositivo.lat, lng: bb.dispositivo.lng }] });
          }} />
      </Modal>
    );
  }

  if (persona) {
    return <FormularioPersona inicial={persona} alCancelar={() => setPersona(null)} alGuardar={async (p) => {
      const otras = bb.personas.filter((x) => x.id !== p.id).map((x) => (p.es_sosten ? { ...x, es_sosten: false } : x));
      await cambiar({ ...bb, personas: [...otras, p] });
      setPersona(null);
    }} />;
  }

  const fachada = bb.fotos.find((f) => f.tipo === "fachada");
  const calidad = evaluarRegistro(bb, app.params);
  const paso = bb.paso;

  return (
    <Pantalla arriba={<Pasos actual={paso + 1} total={PASOS.length} nombre={PASOS[paso]} />}
      pie={<>
        {error ? <Aviso tipo="error" texto={error} /> : null}
        <Fila>
          {paso > 0 ? <Boton texto="Atrás" variante="suave" onPress={() => ir(-1)} estilo={{ flex: 1 }} /> : null}
          {paso < PASOS.length - 1 ? <Boton texto="Siguiente" onPress={() => ir(1)} estilo={{ flex: 1 }} /> : <Boton texto="Guardar visita" icono="check" onPress={guardar} estilo={{ flex: 1 }} />}
        </Fila>
        <Enlace centrado texto="Guardar el borrador y seguir después" onPress={() => router.back()} />
      </>}>

      {paso === 0 ? (
        <Seccion titulo="Antes de tocar la puerta">
          {["Salude y preséntese con su nombre y el de la campaña.",
            "Explique que visita para conocer las necesidades de la familia y escuchar, no para pedir nada a cambio.",
            "Pregunte si puede registrar la visita y ofrezca el aviso de privacidad (QR o volante).",
            "No fotografíe a niños ni a personas sin permiso. Si le dicen que no, agradezca y deje constancia. No insista.",
            "No ofrezca regalos, favores ni promesas personales."].map((t, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 4 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: color.tinteAzul, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: fuente.tituloFuerte, fontSize: tl(13), color: color.textoAzul }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: fuente.texto, fontSize: tl(16), lineHeight: tl(24), color: color.texto }}>{t}</Text>
            </View>
          ))}
          {vistas >= 3 ? <Texto suave>Ya vio esta tarjeta {vistas} veces: puede pasarla rápido.</Texto> : null}
          <Boton texto="Ver el guion completo y las preguntas" variante="suave" icono="libro" onPress={() => router.push("/guion")} />
        </Seccion>
      ) : null}

      {paso === 1 ? (
        <Seccion titulo="Ubicación de la vivienda">
          <Dato etiqueta="Punto" valor={`${Number(bb.vivienda.lat).toFixed(6)}, ${Number(bb.vivienda.lng).toFixed(6)}`} />
          <Dato etiqueta="Fuente" valor={bb.visita.ubicacion_manual ? "Ubicación manual" : "GPS"} />
          <Dato etiqueta={bb.visita.ubicacion_manual ? "Motivo" : "Precisión"} ultimo
            valor={bb.visita.ubicacion_manual ? etiqueta("C-20", bb.visita.motivo_manual as string) : `±${Math.round(Number(bb.vivienda.precision_m ?? 0))} m`} />
        </Seccion>
      ) : null}

      {paso === 2 ? (
        <>
          {fachada ? <Image source={{ uri: fachada.archivo_local }} style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: radio.l }} accessibilityLabel="Foto de fachada" />
            : <Vacio icono="camara" titulo="Falta la foto de fachada" texto="Tómela desde la calle, sin personas. La app le pone el sello con la hora y el punto." />}
          <Boton texto={fachada ? "Tomar otra foto de fachada" : "Tomar foto de fachada"} icono="camara" onPress={() => setCamara("fachada")} />
          <Casilla texto="No autorizó la foto" valor={Boolean(bb.visita.no_autorizo_foto)} onCambio={(v) => vis("no_autorizo_foto", v)} />
          <Boton texto="Agregar foto de un problema (vía, derrumbe…)" variante="suave" icono="alerta" onPress={() => setCamara("problema")} />
          <Texto suave>{bb.fotos.length} de {param(app.params, "fotos_max_visita")} fotos.</Texto>
        </>
      ) : null}

      {paso === 3 ? (
        <>
          <Opciones etiqueta="Tipo de vivienda" opciones={opciones("C-03")} valor={bb.vivienda.tipo_vivienda as string} onCambio={(v) => viv("tipo_vivienda", v)} />
          <Opciones etiqueta="Zona" opciones={[["urbana", "Urbana"], ["rural", "Rural"]]} valor={bb.vivienda.zona_urbana_rural as string} onCambio={(v) => viv("zona_urbana_rural", v)} />
          <Campo etiqueta="Barrio o vereda" value={String(bb.vivienda.barrio_vereda ?? "")} onChangeText={(v) => viv("barrio_vereda", v)} />
          <Boton texto="Proponer según el mapa" variante="suave" onPress={proponerZona} />
          <Campo etiqueta="Dirección o descripción del lugar" value={String(bb.vivienda.direccion ?? "")} onChangeText={(v) => viv("direccion", v)} />
          <Campo etiqueta="Complemento (casa, apartamento, piso)" value={String(bb.vivienda.complemento ?? "")} onChangeText={(v) => viv("complemento", v)} />
          <Campo etiqueta="Nombre de la finca o predio" value={String(bb.vivienda.nombre_finca ?? "")} onChangeText={(v) => viv("nombre_finca", v)} />
          <Campo etiqueta="Indicaciones para llegar" value={String(bb.vivienda.indicaciones ?? "")} onChangeText={(v) => viv("indicaciones", v)} />
          <Campo etiqueta="Punto de referencia" value={String(bb.vivienda.referencia ?? "")} onChangeText={(v) => viv("referencia", v)} />
          <Opciones etiqueta="Estado de ocupación" opciones={OCUPACION_VIV} valor={bb.vivienda.estado_ocupacion as string} onCambio={(v) => viv("estado_ocupacion", v)} />
          <Opciones etiqueta="Tenencia" opciones={opciones("C-04")} valor={bb.vivienda.tenencia as string} onCambio={(v) => viv("tenencia", v)} />
          <Opciones etiqueta="Servicios" multiple opciones={opciones("C-05")} valor={bb.vivienda.servicios as string[]} onCambio={(v) => viv("servicios", v)} />
          <Opciones etiqueta="Vía de acceso" opciones={opciones("C-06")} valor={bb.vivienda.via_acceso as string} onCambio={(v) => viv("via_acceso", v)} />
          <Opciones etiqueta="Riesgos visibles" multiple opciones={RIESGOS} valor={bb.vivienda.riesgos as string[]} onCambio={(v) => viv("riesgos", v)} />
          <Opciones etiqueta="Actividad económica en la vivienda" opciones={ACTIVIDAD} valor={bb.vivienda.actividad_economica as string} onCambio={(v) => viv("actividad_economica", v)} />
        </>
      ) : null}

      {paso === 4 ? (
        <>
          <Opciones etiqueta="Resultado del contacto" opciones={opciones("C-02")} valor={bb.visita.resultado} onCambio={(v) => vis("resultado", v)} />
          {conContacto ? <Casilla texto="La persona autorizó verbalmente registrar la visita" valor={bb.visita.autorizacion_verbal} onCambio={(v) => vis("autorizacion_verbal", v)} /> : null}
          {soloPunto ? <Aviso texto="Solo se guardan el punto, el estado y la foto de fachada, sin personas." /> : null}
        </>
      ) : null}

      {paso === 5 ? (
        <>
          <Contador etiqueta="Personas que viven en el hogar" valor={Number(bb.hogar?.total_personas ?? 0)} onCambio={(n) => hog("total_personas", n)} min={1} />
          <Etiqueta>Personas por rango de edad (sin nombres de menores)</Etiqueta>
          {claves("C-11").map((k) => (
            <Contador key={k} etiqueta={etiqueta("C-11", k)} valor={Number((bb.hogar?.edades as Record<string, number> | undefined)?.[k] ?? 0)}
              onCambio={(n) => hog("edades", { ...((bb.hogar?.edades as object) ?? {}), [k]: n })} />
          ))}
          <Contador etiqueta="Mujeres" valor={Number(bb.hogar?.mujeres ?? 0)} onCambio={(n) => hog("mujeres", n)} />
          <Contador etiqueta="Hombres" valor={Number(bb.hogar?.hombres ?? 0)} onCambio={(n) => hog("hombres", n)} />
          <Contador etiqueta="Adultos que votan en Pijao (estimado)" valor={Number(bb.hogar?.votantes_pijao_est ?? 0)} onCambio={(n) => hog("votantes_pijao_est", n)} />
          <Contador etiqueta="Adultos que votan en otro municipio" valor={Number(bb.hogar?.votantes_otro_mpio_est ?? 0)} onCambio={(n) => hog("votantes_otro_mpio_est", n)} />
          <Contador etiqueta="Adultos que no saben dónde votan" valor={Number(bb.hogar?.votantes_no_sabe_est ?? 0)} onCambio={(n) => hog("votantes_no_sabe_est", n)} />
          <Contador etiqueta="Jóvenes que cumplen 18 antes de la elección" valor={Number(bb.hogar?.futuros_primeros_votantes ?? 0)} onCambio={(n) => hog("futuros_primeros_votantes", n)} />
          <Etiqueta>Principal sostén del hogar</Etiqueta>
          <Opciones etiqueta="Relación" opciones={RELACION} valor={bb.hogar?.sosten_relacion as string} onCambio={(v) => hog("sosten_relacion", v)} />
          <Opciones etiqueta="Sexo" opciones={SEXO} valor={bb.hogar?.sosten_sexo as string} onCambio={(v) => hog("sosten_sexo", v)} />
          <Opciones etiqueta="Ocupación" opciones={opciones("C-07")} valor={bb.hogar?.sosten_ocupacion as string} onCambio={(v) => hog("sosten_ocupacion", v)} />
          <Opciones etiqueta="Situación laboral" opciones={LABORAL} valor={bb.hogar?.sosten_situacion_laboral as string} onCambio={(v) => hog("sosten_situacion_laboral", v)} />
          <Casilla texto="Hay otro hogar en la misma vivienda" valor={Boolean(bb.hogar?.otros_hogares)} onCambio={(v) => hog("otros_hogares", v)} />
          <Campo etiqueta="Familiares fuera de Pijao que votan aquí (cuántos y ciudad)" value={String((bb.hogar?.familiares_fuera as { texto?: string } | undefined)?.texto ?? "")} onChangeText={(v) => hog("familiares_fuera", { texto: v })} />
          <Campo etiqueta="Mascotas (y si necesitan vacuna o esterilización)" value={String((bb.hogar?.mascotas as { texto?: string } | undefined)?.texto ?? "")} onChangeText={(v) => hog("mascotas", { texto: v })} />
          <Texto suave>No se pregunta por ingresos, Sisbén ni subsidios.</Texto>
        </>
      ) : null}

      {paso === 6 ? (
        <>
          <Aviso tipo="info" texto="Solo adultos que autoricen. Los menores solo se cuentan en el paso anterior." />
          {bb.personas.length ? (
            <View>
              {bb.personas.map((p, i) => (
                <View key={p.id} style={{ gap: 8, paddingBottom: 10 }}>
                  <ItemLista titulo={`${p.primer_nombre ?? ""} ${p.primer_apellido ?? ""}`.trim() || "Persona"} detalle={p.es_sosten ? "Sostén del hogar" : undefined}
                    izquierda={<Avatar nombre={`${p.primer_nombre ?? ""} ${p.primer_apellido ?? ""}`} />} ultimo />
                  <Fila>
                    <Boton texto="Editar" variante="suave" icono="editar" onPress={() => setPersona(p)} estilo={{ flex: 1 }} />
                    <Boton texto="Quitar" variante="peligro" onPress={() => cambiar({ ...bb, personas: bb.personas.filter((x) => x.id !== p.id) })} estilo={{ flex: 1 }} />
                  </Fila>
                  {i < bb.personas.length - 1 ? <View style={{ height: 1, backgroundColor: color.borde, marginTop: 6 }} /> : null}
                </View>
              ))}
            </View>
          ) : <Vacio icono="personas" titulo="Todavía no hay personas" texto="Agregue a cada adulto que quiera quedar registrado." />}
          <Boton texto="Agregar persona" icono="mas" onPress={() => setPersona({ id: nuevoId() })} />
        </>
      ) : null}

      {paso === 7 ? (
        <>
          <Texto suave>«¿Cuál es el mayor problema de su hogar o su vereda?» · «¿Qué le gustaría que cambiara en Pijao?»</Texto>
          {[0, 1, 2].map((i) => {
            const n = bb.necesidades[i] ?? { id: nuevoId(), prioridad: i + 1, alcance: "hogar" };
            const poner = (k: string, v: unknown) => {
              const lista = [...bb.necesidades];
              lista[i] = { ...n, [k]: v };
              cambiar({ ...bb, necesidades: lista.filter(Boolean) });
            };
            return (
              <Seccion key={i} titulo={`Necesidad ${i + 1}`}>
                <Opciones opciones={opciones("C-08")} valor={n.tema as string} onCambio={(v) => poner("tema", v)} />
                {n.tema ? (
                  <>
                    <Campo etiqueta="Con las palabras de la persona" value={String(n.texto ?? "")} onChangeText={(v) => poner("texto", v)} multiline />
                    <Opciones opciones={[["hogar", "Del hogar"], ["colectiva", "De la vereda o el barrio"]]} valor={n.alcance as string} onCambio={(v) => poner("alcance", v)} />
                    <Casilla texto="Quiere que le contemos cómo va su propuesta" valor={Boolean(n.desea_respuesta)} onCambio={(v) => poner("desea_respuesta", v)} />
                  </>
                ) : null}
              </Seccion>
            );
          })}
        </>
      ) : null}

      {paso === 8 ? (
        <>
          <Texto>Interés en recibir información, voluntariado y anfitrión de reuniones: se anotan en la ficha de cada persona (paso de Personas).</Texto>
          <Casilla texto="¿Prefiere que no volvamos a visitarlo? (queda en «No contactar» de inmediato)" valor={aut.noVolver} onCambio={(v) => setAut({ ...aut, noVolver: v })} />
        </>
      ) : null}

      {paso === 9 ? (
        <>
          <Aviso tipo="alerta" texto="Registre lo que la persona dijo, no lo que usted supone. Solo si lo expresó por iniciativa propia." />
          {bb.personas.map((p) => (
            <Seccion key={p.id} titulo={String(p.primer_nombre ?? "Persona")}>
              <Opciones opciones={opciones("C-09")} valor={(p.simpatia as string) ?? "no_registrado"}
                onCambio={(v) => cambiar({ ...bb, personas: bb.personas.map((x) => (x.id === p.id ? { ...x, simpatia: v } : x)) })} />
            </Seccion>
          ))}
        </>
      ) : null}

      {paso === 10 ? (
        <>
          <Seccion titulo="Léale este texto a la persona"><Texto>{textoPara(app.perfil?.d.nombre ?? "", canales.correo, canales.whatsapp, textoAut.contenido ?? undefined)}</Texto></Seccion>
          <Casilla texto="(a) Registrar la vivienda y los datos del hogar" valor={aut.registro} onCambio={(v) => setAut({ ...aut, registro: v })} />
          <Casilla texto="(b) Guardar los datos personales" valor={aut.datos} onCambio={(v) => setAut({ ...aut, datos: v })} />
          <Casilla texto="(c) Recibir información de la campaña por el canal elegido" valor={aut.contacto} onCambio={(v) => setAut({ ...aut, contacto: v })} />
          <Casilla texto="(d) [SENSIBLE] Registrar la simpatía" detalle={TEXTO_SENSIBLE} valor={aut.simpatia} onCambio={(v) => setAut({ ...aut, simpatia: v })} />
          <Casilla texto="(e) Usar su historia en las comunicaciones" valor={aut.historia} onCambio={(v) => setAut({ ...aut, historia: v })} />
          <Opciones etiqueta="¿Cómo autoriza?" opciones={[["firma_pantalla", "Firma en pantalla"], ["verbal", "Verbal"], ["papel", "Formulario en papel"]]}
            valor={aut.metodo} onCambio={(v) => setAut({ ...aut, metodo: v as Metodo })} />
          {aut.metodo === "firma_pantalla" ? <Firma alCambiar={(t) => setAut((a) => ({ ...a, firma: t }))} /> : null}
          {aut.metodo === "papel" ? <Boton texto="Tomar foto de la autorización" variante="contorno" icono="camara" onPress={() => setCamara("autorizacion")} /> : null}
          <Texto suave>Entregue el aviso de privacidad (QR o volante).</Texto>
        </>
      ) : null}

      {paso === 11 ? (
        <>
          <Aviso tipo="alerta" texto="No escriba opiniones sobre la vida privada de nadie, salud, religión, política de terceros ni datos de menores." />
          <Campo etiqueta="Notas" value={String(bb.visita.notas ?? "")} onChangeText={(v) => vis("notas", v)} multiline />
          {avisosDeNota(bb.visita.notas as string).map((a) => <Aviso key={a} tipo="alerta" texto={a} />)}
          {palabrasSospechosas(bb.visita.notas as string).length ? <Aviso tipo="error" texto="La nota tiene palabras que pasan a revisión del Director (14.8). No se ofrecen ni registran favores." /> : null}
          <Casilla texto="Requiere seguimiento" valor={Boolean(bb.visita.seguimiento_requerido)} onCambio={(v) => vis("seguimiento_requerido", v)} />
          {bb.visita.seguimiento_requerido ? <Campo etiqueta="Motivo del seguimiento (solo información, nunca favores)" value={String(bb.visita.seguimiento_motivo ?? "")} onChangeText={(v) => vis("seguimiento_motivo", v)} /> : null}
          <Casilla texto="Entregó el volante" valor={Boolean(bb.visita.volante_entregado)} onCambio={(v) => vis("volante_entregado", v)} />
        </>
      ) : null}

      {paso === 12 ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Avatar icono={calidad.color === "verde" ? "check" : "exclama"} tono={calidad.color === "verde" ? "verde" : calidad.color === "amarillo" ? "naranja" : "rojo"} tam={52} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: fuente.titulo, fontSize: tl(20), color: color.texto }}>{calidad.color === "verde" ? "Registro completo" : calidad.color === "amarillo" ? "Registro por revisar" : "Registro incompleto"}</Text>
              <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoSuave }}>{calidad.color === "verde" ? "Cuenta en las estadísticas oficiales." : "Revise lo que falta antes de guardar."}</Text>
            </View>
          </View>
          <Seccion titulo="Resumen">
            <Dato etiqueta="Resultado" valor={etiqueta("C-02", bb.visita.resultado)} />
            <Dato etiqueta="Personas" valor={String(bb.personas.length)} />
            <Dato etiqueta="Necesidades" valor={String(bb.necesidades.filter((n) => n.tema).length)} />
            <Dato etiqueta="Fotos" valor={String(bb.fotos.length)} ultimo />
          </Seccion>
          <Semaforo nivel={calidad.color} />
          {calidad.motivos.length ? <Seccion titulo="Para revisar">{calidad.motivos.map((m) => <Texto key={m}>• {m}</Texto>)}</Seccion> : null}
        </>
      ) : null}
    </Pantalla>
  );
}

function FormularioPersona({ inicial, alGuardar, alCancelar }: { inicial: PersonaBorrador; alGuardar: (p: PersonaBorrador) => void; alCancelar: () => void }) {
  const [p, setP] = useState<PersonaBorrador>({ tipo_documento: "CC", ...inicial });
  const [error, setError] = useState<string | null>(null);
  const poner = (k: string) => (v: unknown) => setP({ ...p, [k]: v });
  const txt = (k: string) => String(p[k] ?? "");

  function guardar() {
    const n1 = validarNombre(p.primer_nombre, "El primer nombre"); if (!n1.ok) return setError(n1.mensaje);
    const a1 = validarNombre(p.primer_apellido, "El primer apellido"); if (!a1.ok) return setError(a1.mensaje);
    if (p.cedula) { const c = validarCedula(p.cedula); if (!c.ok) return setError(c.mensaje); }
    if (p.fecha_nacimiento) { const f = validarFechaNacimiento(p.fecha_nacimiento); if (!f.ok) return setError(f.mensaje); }
    else if (!p.mayor_edad_confirmada) return setError("Confirme que la persona es mayor de 18 años (R-16).");
    if (p.telefono && !normalizarTelefono(p.telefono)) return setError("El teléfono no parece válido.");
    if (p.correo) { const c = validarCorreo(p.correo); if (!c.ok) return setError(c.mensaje); }
    alGuardar({ ...p, telefono: p.telefono ? normalizarTelefono(p.telefono) : null });
  }

  return (
    <Pantalla etiqueta="Nueva visita" titulo="Persona" pie={<>{error ? <Aviso tipo="error" texto={error} /> : null}<Fila><Boton texto="Cancelar" variante="suave" onPress={alCancelar} estilo={{ flex: 1 }} /><Boton texto="Guardar persona" onPress={guardar} estilo={{ flex: 1 }} /></Fila></>}>
      <Etiqueta>Nombre</Etiqueta>
      <Campo etiqueta="Primer nombre" value={txt("primer_nombre")} onChangeText={poner("primer_nombre")} />
      <Campo etiqueta="Segundo nombre" value={txt("segundo_nombre")} onChangeText={poner("segundo_nombre")} />
      <Campo etiqueta="Primer apellido" value={txt("primer_apellido")} onChangeText={poner("primer_apellido")} />
      <Campo etiqueta="Segundo apellido" value={txt("segundo_apellido")} onChangeText={poner("segundo_apellido")} />
      <Campo etiqueta="Cómo le gusta que le llamen" value={txt("apodo")} onChangeText={poner("apodo")} />
      <Etiqueta>Documento y edad</Etiqueta>
      <Opciones etiqueta="Tipo de documento" opciones={[["CC", "Cédula de ciudadanía"], ["CE", "Cédula de extranjería de residente"]]} valor={txt("tipo_documento")} onCambio={poner("tipo_documento")} />
      <Campo etiqueta="Número de documento (solo con su autorización)" value={txt("cedula")} onChangeText={poner("cedula")} keyboardType="number-pad" />
      <Campo etiqueta="Fecha de nacimiento (día/mes/año)" value={txt("fecha_nacimiento")} onChangeText={poner("fecha_nacimiento")} />
      {!p.fecha_nacimiento ? <Casilla texto="Confirmo que es mayor de 18 años" valor={Boolean(p.mayor_edad_confirmada)} onCambio={poner("mayor_edad_confirmada")} /> : null}
      <Opciones etiqueta="Sexo" opciones={SEXO} valor={txt("sexo")} onCambio={poner("sexo")} />
      <Opciones etiqueta="Ocupación" opciones={opciones("C-07")} valor={txt("ocupacion")} onCambio={poner("ocupacion")} />
      <Etiqueta>Contacto</Etiqueta>
      <Campo etiqueta="Teléfono" value={txt("telefono")} onChangeText={poner("telefono")} keyboardType="phone-pad" />
      <Casilla texto="El teléfono es WhatsApp" valor={Boolean(p.telefono_es_whatsapp)} onCambio={poner("telefono_es_whatsapp")} />
      <Campo etiqueta="Correo" value={txt("correo")} onChangeText={poner("correo")} autoCapitalize="none" keyboardType="email-address" />
      <Etiqueta>Participación</Etiqueta>
      <Opciones etiqueta="¿Vota en Pijao?" opciones={SI_NO} valor={txt("vota_en_pijao")} onCambio={poner("vota_en_pijao")} />
      <Opciones etiqueta="Años viviendo en Pijao" opciones={[["menos_1", "Menos de 1"], ["1_5", "1 a 5"], ["5_mas", "Más de 5"]]} valor={txt("anios_en_pijao")} onCambio={poner("anios_en_pijao")} />
      {p.vota_en_pijao === "si" && p.anios_en_pijao === "menos_1" ? <Aviso tipo="alerta" texto="La inscripción de cédula solo corresponde donde la persona vive realmente (14.8). La app nunca promueve inscripciones." /> : null}
      <Casilla texto="Quiere recibir información" valor={Boolean(p.interes_info)} onCambio={poner("interes_info")} />
      {p.interes_info ? <Opciones etiqueta="Canal preferido" opciones={opciones("C-10")} valor={txt("canal_preferido")} onCambio={poner("canal_preferido")} /> : null}
      <Campo etiqueta="Mejor horario para contactarle" value={txt("mejor_horario")} onChangeText={poner("mejor_horario")} />
      <Opciones etiqueta="¿Quiere ser voluntario o voluntaria?" opciones={[["si", "Sí"], ["no", "No"], ["tal_vez", "Tal vez"]]} valor={txt("voluntario")} onCambio={poner("voluntario")} />
      <Casilla texto="Podría ser anfitrión de una reunión en su casa" valor={Boolean(p.anfitrion)} onCambio={poner("anfitrion")} />
      <Opciones etiqueta="Temas de interés" multiple opciones={opciones("C-08")} valor={(p.temas_interes as string[]) ?? []} onCambio={poner("temas_interes")} />
      <Casilla texto="Es el principal sostén del hogar" valor={Boolean(p.es_sosten)} onCambio={poner("es_sosten")} />
    </Pantalla>
  );
}
