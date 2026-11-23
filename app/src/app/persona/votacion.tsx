// Dónde vota una persona (0021). La consulta de la Registraduría pide marcar «No soy un robot», así que no se puede
// hacer de forma automática: la app abre la consulta con la cédula a la vista, el colaborador la hace y aquí guarda el
// puesto y la mesa. También sirve lo que diga la persona. Se guarda sin señal y se envía apenas haya.
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { OPCIONES_VOTA, URL_REGISTRADURIA, errorMesa, type PersonaLista } from "@/core/personas";
import { useApp } from "@/servicios/contexto";
import { guardarDondeVota, obtenerPersona, resumenPersonas } from "@/servicios/personas";
import { Aviso, Boton, Campo, Cargando, Opciones, Pantalla, Seccion, SinPermiso, Vacio } from "@/ui/componentes";
import { color, fuente, radio, tl } from "@/ui/tema";

export default function DondeVota() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const router = useRouter();
  const [p, setP] = useState<PersonaLista | null | undefined>(undefined);
  const [sugeridos, setSugeridos] = useState<string[]>([]);
  const [vota, setVota] = useState<string | null>(null);
  const [puesto, setPuesto] = useState("");
  const [otro, setOtro] = useState("");
  const [mesa, setMesa] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entorno = { almacen: app.almacen, conectado: app.conectado, practica: app.practica, usuarioId: app.usuarioId };

  useEffect(() => {
    let vivo = true;
    (async () => {
      const x = await obtenerPersona(entorno, id);
      // Puestos sugeridos: el catálogo C-21 guardado en el teléfono, más los que el equipo ya escribió (del servidor).
      const cat = ((await app.almacen.listar("catalogos")) as { catalogo?: string; etiqueta?: string; activo?: boolean; orden?: number }[])
        .filter((c) => c.catalogo === "C-21" && c.activo !== false)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((c) => String(c.etiqueta ?? ""))
        .filter(Boolean);
      const r = await resumenPersonas(entorno);
      if (!vivo) return;
      const lista = [...new Set([...cat, ...(r?.sugeridos ?? [])])];
      setSugeridos(lista);
      setP(x);
      if (x) {
        setVota(x.vota_en_pijao ?? null);
        const actual = (x.puesto_votacion ?? "").trim();
        if (actual && lista.includes(actual)) setPuesto(actual); else if (actual) setOtro(actual);
        setMesa(x.mesa_votacion ?? "");
      }
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (p === undefined) return <Cargando texto="Cargando…" />;
  if (!p) return <Pantalla><Vacio icono="persona" titulo="Persona no disponible" texto="Vuelva a la lista e inténtelo de nuevo." /></Pantalla>;
  const puedeEditar = (app.perfil?.esStaff ?? false) || p.propia || (app.perfil?.tiene("O-06") ?? false);
  if (!puedeEditar) return <Pantalla><SinPermiso texto="Dónde vota una persona lo guarda quien la registró o el Director." /></Pantalla>;

  const nombrePuesto = (otro.trim() || puesto).trim();
  const errMesa = errorMesa(mesa);

  async function abrirRegistraduria() {
    try {
      await WebBrowser.openBrowserAsync(URL_REGISTRADURIA);
    } catch {
      setError("No se pudo abrir la página de la Registraduría. Revise la conexión.");
    }
  }

  async function guardar() {
    setError(null);
    if (errMesa) { setError(errMesa); return; }
    if (vota === "si" && !nombrePuesto) { setError("Escriba o elija el puesto de votación."); return; }
    setGuardando(true);
    try {
      await guardarDondeVota(entorno, id, { vota, puesto: nombrePuesto, mesa });
      app.avisarCambio();
      app.sincronizar();
      router.back();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No se pudo guardar. Inténtelo de nuevo.");
      setGuardando(false);
    }
  }

  return (
    <Pantalla titulo="Dónde vota" subtitulo={p.nombre}
      pie={<Boton texto="Guardar" icono="check" cargando={guardando} onPress={guardar} />}>
      <Seccion titulo="1. Consulte en la Registraduría">
        <View style={{ gap: 12, paddingVertical: 6 }}>
          {p.cedula ? (
            <View style={{ padding: 14, borderRadius: radio.m, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde, gap: 4 }}>
              <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(13), color: color.textoSuave }}>Cédula (mantenga presionado para copiarla)</Text>
              <Text selectable accessibilityLabel={`Cédula ${p.cedula.split("").join(" ")}`}
                style={{ fontFamily: fuente.titulo, fontSize: tl(28), letterSpacing: 2, color: color.texto }}>{p.cedula}</Text>
            </View>
          ) : <Aviso tipo="alerta" texto="Esta persona no tiene la cédula registrada. Pregúntele dónde vota o pídale la cédula." />}
          <Boton texto="Abrir la consulta de la Registraduría" variante="contorno" icono="buscar" onPress={abrirRegistraduria} />
          <Text style={{ fontFamily: fuente.texto, fontSize: tl(13), lineHeight: tl(19), color: color.textoSuave }}>
            Escriba la cédula, marque «No soy un robot» y busque. La Registraduría muestra el puesto, la dirección y la mesa. Por ese
            paso de «No soy un robot» la app no puede consultarlo sola. Al terminar, vuelva aquí.
          </Text>
        </View>
      </Seccion>

      <Seccion titulo="2. Guarde lo que encontró">
        <View style={{ gap: 14, paddingVertical: 6 }}>
          <Opciones etiqueta="¿Vota en Pijao?" opciones={OPCIONES_VOTA} valor={vota} onCambio={(v) => setVota(String(v))} />
          {vota !== "no" ? (
            <>
              {sugeridos.length ? (
                <Opciones etiqueta="Puesto de votación" lista opciones={sugeridos.map((s) => [s, s] as const)} valor={otro.trim() ? null : puesto}
                  onCambio={(v) => { setPuesto(String(v)); setOtro(""); }} />
              ) : null}
              <Campo etiqueta={sugeridos.length ? "Otro puesto (si no está en la lista)" : "Puesto de votación"} value={otro}
                onChangeText={setOtro} maxLength={120} autoCapitalize="words"
                ayuda="Escríbalo como aparece en la Registraduría, por ejemplo el nombre de la escuela." />
              <Campo etiqueta="Mesa" keyboardType="number-pad" value={mesa} maxLength={3} error={errMesa}
                onChangeText={(v) => setMesa(v.replace(/\D/g, ""))} />
            </>
          ) : <Aviso tipo="info" texto="Si vota en otro municipio, no hace falta puesto ni mesa." />}
        </View>
      </Seccion>
      {!app.conectado ? <Aviso tipo="info" icono="nube" texto="Sin señal: se guarda en el teléfono y se envía apenas haya conexión." /> : null}
      {error ? <Aviso tipo="error" texto={error} /> : null}
    </Pantalla>
  );
}
