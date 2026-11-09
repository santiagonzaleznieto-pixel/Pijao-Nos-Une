// P-15 Buscar: por dirección, barrio o vereda, finca y nombre visible. La cédula solo se busca en el servidor con
// permiso (M1). No se guarda historial de búsquedas. Diseño de la Fase 2.
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { etiqueta } from "@/core/catalogos";
import { useApp } from "@/servicios/contexto";
import { Avatar, Buscador, Chip, ItemLista, Pantalla, Vacio } from "@/ui/componentes";
import { color, fuente, tl } from "@/ui/tema";

type F = Record<string, any>;
const norm = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function Buscar() {
  const app = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"todo" | "viviendas" | "personas">("todo");
  const [viviendas, setViviendas] = useState<F[]>([]);
  const [personas, setPersonas] = useState<F[]>([]);

  useEffect(() => {
    (async () => { setViviendas(await app.almacen.listar("viviendas")); setPersonas(await app.almacen.listar("personas")); })();
  }, [app.almacen, app.version]);

  const t = norm(q.trim());
  const rv = useMemo(() => (t.length < 2 || tipo === "personas" ? [] : viviendas.filter((v) => [v.direccion, v.barrio_vereda, v.nombre_finca, v.referencia].some((x) => norm(x).includes(t))).slice(0, 30)), [t, viviendas, tipo]);
  const rp = useMemo(() => (t.length < 2 || tipo === "viviendas" ? [] : personas.filter((p) => norm(p.nombre_visible).includes(t) || norm(p.apodo).includes(t)).slice(0, 30)), [t, personas, tipo]);
  const total = rv.length + rp.length;

  return (
    <Pantalla>
      <Buscador valor={q} onCambio={setQ} texto="Buscar persona, dirección o vereda" autoFocus />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip texto="Todo" activo={tipo === "todo"} onPress={() => setTipo("todo")} />
        <Chip texto="Viviendas" activo={tipo === "viviendas"} onPress={() => setTipo("viviendas")} />
        <Chip texto="Personas" activo={tipo === "personas"} onPress={() => setTipo("personas")} />
      </ScrollView>
      {t.length < 2 ? <Vacio icono="buscar" titulo="Escriba al menos dos letras" texto="Busca entre lo que hay en este teléfono, también sin señal." /> : null}
      {t.length >= 2 && !total ? <Vacio icono="buscar" titulo="No hay resultados en este teléfono" texto="Pruebe con otra palabra, o sincronice para traer lo más reciente." /> : null}
      {total ? <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoSuave }}>{total} {total === 1 ? "resultado" : "resultados"}</Text> : null}
      <View>
        {rv.map((v, i) => (
          <ItemLista key={v.id} titulo={v.direccion ?? "Sin dirección"} detalle={[etiqueta("C-01", v.estado ?? "por_visitar"), v.barrio_vereda].filter(Boolean).join(" · ")}
            izquierda={<Avatar icono={v.estado === "no_contactar" ? "candado" : "casa"} tono={v.estado === "no_contactar" ? "rojo" : "azul"} />}
            onPress={() => router.push(`/vivienda/${v.id}`)} ultimo={i === rv.length - 1 && !rp.length} />
        ))}
        {rp.map((p, i) => (
          <ItemLista key={p.id} titulo={p.nombre_visible ?? "Persona"} detalle={[typeof p.edad_anios === "number" ? `${p.edad_anios} años` : "", p.estado === "no_contactar" ? "no contactar" : ""].filter(Boolean).join(" · ") || undefined}
            izquierda={<Avatar nombre={p.nombre_visible} tono={p.estado === "no_contactar" ? "rojo" : "turquesa"} />}
            onPress={() => router.push(`/persona/${p.id}`)} ultimo={i === rp.length - 1} />
        ))}
      </View>
      <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoSuave, textAlign: "center" }}>Las búsquedas no se guardan en el teléfono.</Text>
    </Pantalla>
  );
}
