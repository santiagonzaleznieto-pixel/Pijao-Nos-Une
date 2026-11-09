// P-20 Anuncios: leer y confirmar la lectura. Publicar se hace desde el panel web (O-11). Diseño de la Fase 2: el fijado
// arriba como sección destacada y los demás en lista.
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { encolarAccion } from "@/servicios/campo";
import { useApp } from "@/servicios/contexto";
import { Boton, Ficha, Insignia, ItemLista, Pantalla, Seccion, Vacio, Cargando } from "@/ui/componentes";
import { Icono } from "@/ui/Icono";
import { color, fuente, tl } from "@/ui/tema";

type F = Record<string, any>;
const FECHA = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" });

export default function Anuncios() {
  const app = useApp();
  const [anuncios, setAnuncios] = useState<F[] | null>(null);
  const [leidos, setLeidos] = useState<string[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const lista = ((await app.almacen.listar("anuncios")) as F[]).filter((a) => !a.caduca_en || new Date(a.caduca_en) > new Date());
      setAnuncios(lista.sort((a, b) => Number(Boolean(b.fijado)) - Number(Boolean(a.fijado)) || String(b.creado_en ?? "").localeCompare(String(a.creado_en ?? ""))));
      setLeidos((await app.almacen.getMeta<string[]>("anuncios_leidos")) ?? []);
    })();
  }, [app.almacen, app.version]);

  async function leido(id: string) {
    if (!app.usuarioId) return;
    await encolarAccion(app.almacen, app.usuarioId, "anuncio_leido", { id });
    const n = [...leidos, id];
    setLeidos(n);
    await app.almacen.setMeta("anuncios_leidos", n);
    app.sincronizar();
  }

  if (!anuncios) return <Pantalla><Cargando lista texto="Cargando los anuncios…" /></Pantalla>;
  if (!anuncios.length) return <Pantalla><Vacio icono="megafono" titulo="No hay anuncios" texto="Cuando el Director publique uno, aparece aquí." /></Pantalla>;
  const destacado: F | null = anuncios[0]?.fijado ? anuncios[0] : null;
  const resto: F[] = destacado ? anuncios.slice(1) : anuncios;

  return (
    <Pantalla>
      {destacado ? (
        <Seccion estilo={{ borderColor: color.textoNaranja, borderWidth: 1.5 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icono nombre="bandera" tam={16} color={color.textoNaranja} />
            <Text style={{ fontFamily: fuente.tituloFuerte, fontSize: tl(12), letterSpacing: 1.5, color: color.textoNaranja }}>FIJADO</Text>
          </View>
          <Text accessibilityRole="header" style={{ fontFamily: fuente.titulo, fontSize: tl(20), lineHeight: tl(26), color: color.texto }}>{destacado.titulo}</Text>
          <Text style={{ fontFamily: fuente.texto, fontSize: tl(16), lineHeight: tl(24), color: color.textoSuave }}>{destacado.texto}</Text>
          {leidos.includes(destacado.id) ? <Insignia texto="Leído" tono="verde" icono="check" /> : <Boton texto="Entendido" icono="check" onPress={() => leido(destacado.id)} />}
        </Seccion>
      ) : null}
      <View>
        {resto.map((a: F, i: number) => {
          const urgente = a.prioridad && a.prioridad !== "normal";
          const ver = abierto === a.id;
          return (
            <View key={a.id}>
              <ItemLista titulo={a.titulo} detalle={ver ? a.texto : `${a.creado_en ? FECHA.format(new Date(a.creado_en)) : ""}${urgente ? ` · ${a.prioridad}` : ""}${leidos.includes(a.id) ? " · leído" : ""}`}
                izquierda={<Ficha icono="megafono" tono={urgente ? "naranja" : leidos.includes(a.id) ? "gris" : "azul"} />}
                onPress={() => setAbierto(ver ? null : a.id)} ultimo={i === resto.length - 1 && !ver} derecha={<Icono nombre={ver ? "arriba" : "abajo"} tam={20} color={color.textoSuave} />} />
              {ver && !leidos.includes(a.id) ? <View style={{ paddingLeft: 56, paddingBottom: 12 }}><Boton texto="Confirmar lectura" variante="contorno" onPress={() => leido(a.id)} /></View> : null}
            </View>
          );
        })}
      </View>
    </Pantalla>
  );
}
