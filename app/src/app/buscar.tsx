// P-15 Buscar: por dirección, barrio o vereda, finca y nombre visible. La cédula solo se busca en el servidor con
// permiso (M1). No se guarda historial de búsquedas.
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/servicios/contexto";
import { Boton, Campo, Pantalla, Texto } from "@/ui/componentes";

type F = Record<string, any>;
const norm = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function Buscar() {
  const app = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [viviendas, setViviendas] = useState<F[]>([]);
  const [personas, setPersonas] = useState<F[]>([]);

  useEffect(() => {
    (async () => { setViviendas(await app.almacen.listar("viviendas")); setPersonas(await app.almacen.listar("personas")); })();
  }, [app.almacen, app.version]);

  const t = norm(q.trim());
  const rv = useMemo(() => (t.length < 2 ? [] : viviendas.filter((v) => [v.direccion, v.barrio_vereda, v.nombre_finca, v.referencia].some((x) => norm(x).includes(t))).slice(0, 30)), [t, viviendas]);
  const rp = useMemo(() => (t.length < 2 ? [] : personas.filter((p) => norm(p.nombre_visible).includes(t) || norm(p.apodo).includes(t)).slice(0, 30)), [t, personas]);

  return (
    <Pantalla titulo="Buscar">
      <Campo etiqueta="Dirección, vereda, finca o nombre" value={q} onChangeText={setQ} autoFocus />
      {rv.length ? <Texto negrita>Viviendas</Texto> : null}
      {rv.map((v) => <Boton key={v.id} variante="suave" texto={`${v.direccion ?? "Sin dirección"} · ${v.barrio_vereda ?? ""}`} onPress={() => router.push(`/vivienda/${v.id}`)} />)}
      {rp.length ? <Texto negrita>Personas</Texto> : null}
      {rp.map((p) => <Boton key={p.id} variante="suave" texto={p.nombre_visible ?? "Persona"} onPress={() => router.push(`/persona/${p.id}`)} />)}
      {t.length >= 2 && !rv.length && !rp.length ? <Texto suave>No hay resultados en este teléfono.</Texto> : null}
    </Pantalla>
  );
}
