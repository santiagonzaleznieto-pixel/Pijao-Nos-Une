// Pestaña «Personas» (decisión del dueño, 23 de noviembre de 2026): todas las personas registradas, con búsqueda,
// filtros y dónde vota cada una. El servidor decide qué ve cada quien: el Director y el Administrador, todo; un
// colaborador, completas las que él registró y, de las demás, solo el nombre y la vereda. Sin señal se ven las que
// están guardadas en el teléfono, con los datos en parte.
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  OPCIONES_VOTA, cedulaVisible, contarFiltros, lugarPersona, sabeDondeVota, textoDondeVota,
  type FiltrosPersonas, type PersonaLista, type ResumenPersonas,
} from "@/core/personas";
import { useApp } from "@/servicios/contexto";
import { POR_PAGINA, listarPersonas, resumenPersonas } from "@/servicios/personas";
import {
  Aviso, Avatar, Boton, Buscador, Campo, Cargando, Chip, ItemLista, Opciones, Pantalla, Seccion, Vacio,
} from "@/ui/componentes";
import { color, fuente, tl } from "@/ui/tema";

type Rapido = "todas" | "mias" | "sin_puesto" | "vota";
/** Opción «Cualquiera» de los filtros (sin valor). */
const TODOS = "__todos__";
const sin = (v: string | string[]) => (String(v) === TODOS ? undefined : String(v));

export default function Personas() {
  const app = useApp();
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [rapido, setRapido] = useState<Rapido>("todas");
  const [filtros, setFiltros] = useState<FiltrosPersonas>({});
  const [borrador, setBorrador] = useState<FiltrosPersonas>({});
  const [verFiltros, setVerFiltros] = useState(false);
  const [filas, setFilas] = useState<PersonaLista[] | null>(null);
  const [total, setTotal] = useState(0);
  const [local, setLocal] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [resumen, setResumen] = useState<ResumenPersonas | null>(null);
  const pedido = useRef(0);

  const entorno = { almacen: app.almacen, conectado: app.conectado, practica: app.practica, usuarioId: app.usuarioId };
  const todos: FiltrosPersonas = {
    ...filtros, texto,
    ...(rapido === "mias" ? { mias: true } : rapido === "sin_puesto" ? { sin_puesto: true } : rapido === "vota" ? { vota: "si" as const } : {}),
  };
  const clave = JSON.stringify(todos);

  const cargar = useCallback(async (desde: number) => {
    const n = ++pedido.current;
    const r = await listarPersonas(entorno, JSON.parse(clave) as FiltrosPersonas, desde);
    if (n !== pedido.current) return;   // llegó una búsqueda más nueva
    setFilas((prev) => (desde === 0 ? r.filas : [...(prev ?? []), ...r.filas]));
    setTotal(r.total);
    setLocal(r.local);
    setAviso(r.aviso ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, app.almacen, app.conectado, app.practica, app.usuarioId]);

  // La búsqueda espera a que se deje de escribir; los filtros cargan de una vez.
  useEffect(() => {
    const t = setTimeout(() => { cargar(0); }, texto ? 350 : 0);
    return () => clearTimeout(t);
  }, [cargar, texto, app.version]);

  useEffect(() => {
    let vivo = true;
    resumenPersonas(entorno).then((r) => { if (vivo) setResumen(r); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.conectado, app.practica, app.version]);

  async function verMas() {
    setCargandoMas(true);
    await cargar(filas?.length ?? 0);
    setCargandoMas(false);
  }

  const nFiltros = contarFiltros(filtros);
  const sugeridos = resumen?.sugeridos ?? [];
  const esStaff = app.perfil?.esStaff ?? false;

  return (
    <Pantalla titulo="Personas"
      subtitulo={filas === null ? undefined : `${total.toLocaleString("es-CO")} ${total === 1 ? "persona" : "personas"}${resumen && resumen.completas ? ` · ${resumen.con_puesto.toLocaleString("es-CO")} con puesto de votación` : ""}`}>
      <Buscador valor={texto} onCambio={setTexto} texto="Buscar por nombre o cédula" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip texto="Todas" activo={rapido === "todas"} onPress={() => setRapido("todas")} />
        <Chip texto="Las que registré" activo={rapido === "mias"} onPress={() => setRapido("mias")} />
        <Chip texto="Sin puesto" activo={rapido === "sin_puesto"} onPress={() => setRapido("sin_puesto")} />
        <Chip texto="Votan en Pijao" activo={rapido === "vota"} onPress={() => setRapido("vota")} />
        <Chip texto={nFiltros ? `Filtros · ${nFiltros}` : "Más filtros"} activo={verFiltros || nFiltros > 0}
          onPress={() => { setBorrador(filtros); setVerFiltros(!verFiltros); }} />
      </ScrollView>

      {verFiltros ? (
        <Seccion titulo="Filtros">
          <View style={{ gap: 14, paddingVertical: 6 }}>
            <Campo etiqueta="Vereda o barrio" value={borrador.vereda ?? ""} onChangeText={(v) => setBorrador({ ...borrador, vereda: v })} />
            {sugeridos.length ? (
              <Opciones etiqueta="Puesto de votación" opciones={[[TODOS, "Cualquiera"], ...sugeridos.map((s) => [s, s] as const)]}
                valor={borrador.puesto ?? TODOS} onCambio={(v) => setBorrador({ ...borrador, puesto: sin(v) })} />
            ) : (
              <Campo etiqueta="Puesto de votación" value={borrador.puesto ?? ""} onChangeText={(v) => setBorrador({ ...borrador, puesto: v })} />
            )}
            <Campo etiqueta="Mesa" keyboardType="number-pad" value={borrador.mesa ?? ""} maxLength={3}
              onChangeText={(v) => setBorrador({ ...borrador, mesa: v.replace(/\D/g, "") })} />
            <Opciones etiqueta="¿Dónde vota?" opciones={[[TODOS, "Cualquiera"], ...OPCIONES_VOTA, ["sin_dato", "Sin dato"]]}
              valor={borrador.vota ?? TODOS} onCambio={(v) => setBorrador({ ...borrador, vota: sin(v) as FiltrosPersonas["vota"] })} />
            <Opciones etiqueta="Estado" opciones={[[TODOS, "Cualquiera"], ["activa", "Activa"], ["no_contactar", "No contactar"]]}
              valor={borrador.estado ?? TODOS} onCambio={(v) => setBorrador({ ...borrador, estado: sin(v) })} />
            <Campo etiqueta="Número o código del predio (IGAC)" keyboardType="number-pad" value={borrador.predio ?? ""}
              onChangeText={(v) => setBorrador({ ...borrador, predio: v.replace(/\D/g, "") })} />
            {esStaff && resumen?.equipo?.length ? (
              <Opciones etiqueta="Registró" lista opciones={[[TODOS, "Cualquiera"], ...resumen.equipo.map((m) => [m.id, m.nombre] as const)]}
                valor={borrador.registro_por ?? TODOS} onCambio={(v) => setBorrador({ ...borrador, registro_por: sin(v) })} />
            ) : null}
            <Boton texto="Aplicar filtros" icono="check" onPress={() => { setFiltros(borrador); setVerFiltros(false); }} />
            {nFiltros ? <Boton texto="Quitar los filtros" variante="suave" onPress={() => { setFiltros({}); setBorrador({}); setVerFiltros(false); }} /> : null}
          </View>
        </Seccion>
      ) : null}

      {resumen && resumen.puestos.length && !verFiltros && !texto && rapido === "todas" && !nFiltros ? (
        <Seccion titulo="Por puesto de votación">
          {resumen.puestos.slice(0, 6).map((p, i) => (
            <ItemLista key={p.puesto} titulo={p.puesto} ultimo={i === Math.min(5, resumen.puestos.length - 1)}
              detalle={`${p.personas} ${p.personas === 1 ? "persona" : "personas"}${p.mesas.length ? ` · ${p.mesas.length} ${p.mesas.length === 1 ? "mesa" : "mesas"}` : ""}`}
              onPress={() => setFiltros({ puesto: p.puesto })} />
          ))}
        </Seccion>
      ) : null}

      {aviso ? <Aviso tipo="alerta" icono="sinsenal" texto={aviso} /> : null}

      {filas === null ? <Cargando lista texto="Cargando las personas…" /> : !filas.length ? (
        <Vacio icono="personas" titulo={texto || nFiltros || rapido !== "todas" ? "Nadie coincide con la búsqueda" : "Todavía no hay personas registradas"}
          texto={texto || nFiltros || rapido !== "todas" ? "Pruebe con otro nombre o quite algún filtro." : "Cuando el equipo registre personas en las visitas, aparecen aquí."} />
      ) : (
        <View>
          {filas.map((p, i) => <FilaPersona key={p.id} p={p} ultimo={i === filas.length - 1} onPress={() => router.push(`/persona/${p.id}`)} />)}
        </View>
      )}
      {filas && filas.length < total ? (
        <Boton texto={`Ver más (${(total - filas.length).toLocaleString("es-CO")} más)`} variante="contorno" cargando={cargandoMas} onPress={verMas} />
      ) : null}
      {filas && filas.length >= POR_PAGINA && filas.length >= total && !local ? (
        <Text style={{ fontFamily: fuente.texto, fontSize: tl(13), color: color.textoSuave, textAlign: "center" }}>Esas son todas.</Text>
      ) : null}
    </Pantalla>
  );
}

function FilaPersona({ p, ultimo, onPress }: { p: PersonaLista; ultimo: boolean; onPress: () => void }) {
  const ced = p.completo ? cedulaVisible(p) : null;
  const voto = p.completo || p.local ? textoDondeVota(p) : null;
  const detalle = [lugarPersona(p), voto, ced ? `C. C. ${ced}` : null].filter(Boolean).join("\n");
  return (
    <ItemLista titulo={p.nombre || "Persona"} detalle={detalle} ultimo={ultimo} onPress={onPress}
      izquierda={<Avatar nombre={p.nombre} tam={42} tono={p.estado === "no_contactar" ? "rojo" : p.completo && sabeDondeVota(p) ? "verde" : "azul"} />}
      etiquetaAccesible={`${p.nombre}. ${detalle.replace(/\n/g, ". ")}`} />
  );
}
