// Selector de fecha sin escribir: tres listas (año, mes y día) que se abren en una hoja inferior. Sirve para la fecha de
// nacimiento (con año, muestra la edad) y para el cumpleaños (solo mes y día). Devuelve la fecha como AAAA-MM-DD o, sin
// año, como { mes, dia }. Pensado para adultos mayores: botones grandes y nombres de mes completos.
import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { Icono } from "./Icono";
import { color, fuente, radio, sombra, tl } from "./tema";

export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const diasDelMes = (mes: number | null, anio: number | null) => (mes ? new Date(Date.UTC(anio ?? 2000, mes, 0)).getUTCDate() : 31);   // 2000 es bisiesto: 29 de febrero vale sin año

function Lista({ titulo, opciones, valor, onElegir, ancho }: {
  titulo: string; opciones: { valor: number; texto: string }[]; valor: number | null; onElegir: (v: number) => void; ancho: number;
}) {
  const [abierta, setAbierta] = useState(false);
  const elegida = opciones.find((o) => o.valor === valor);
  const inicio = Math.max(0, opciones.findIndex((o) => o.valor === valor));
  return (
    <View style={{ flex: ancho, gap: 4 }}>
      <Text style={{ fontFamily: fuente.tituloMedio, fontSize: tl(13), color: color.textoSuave }}>{titulo}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${titulo}: ${elegida?.texto ?? "sin elegir"}. Toque para elegir`} onPress={() => setAbierta(true)}
        style={({ pressed }) => [{ minHeight: 52, borderWidth: 1.5, borderColor: elegida ? color.texto : color.bordeControl, borderRadius: radio.m, paddingHorizontal: 12,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: color.fondo }, pressed && { opacity: 0.7 }]}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: elegida ? fuente.textoFuerte : fuente.texto, fontSize: tl(16), color: elegida ? color.texto : color.textoSuave }}>{elegida?.texto ?? "Elegir"}</Text>
        <Icono nombre="abajo" tam={18} color={color.textoSuave} />
      </Pressable>
      <Modal visible={abierta} transparent animationType="slide" onRequestClose={() => setAbierta(false)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setAbierta(false)} style={{ flex: 1, backgroundColor: color.velo }} />
        <View style={[{ maxHeight: "70%", backgroundColor: color.tarjeta, borderTopLeftRadius: radio.barra, borderTopRightRadius: radio.barra, paddingTop: 10, paddingBottom: 24 }, sombra.flotante]}>
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: color.bordeControl, alignSelf: "center", marginBottom: 10 }} />
          <Text accessibilityRole="header" style={{ fontFamily: fuente.titulo, fontSize: tl(19), color: color.texto, paddingHorizontal: 22, paddingBottom: 8 }}>{titulo}</Text>
          <FlatList data={opciones} keyExtractor={(o) => String(o.valor)} initialScrollIndex={inicio > 3 ? inicio - 3 : 0}
            getItemLayout={(_d, i) => ({ length: 56, offset: 56 * i, index: i })}
            renderItem={({ item }) => {
              const activa = item.valor === valor;
              return (
                <Pressable accessibilityRole="radio" accessibilityState={{ checked: activa }} onPress={() => { onElegir(item.valor); setAbierta(false); }}
                  style={({ pressed }) => [{ height: 56, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    backgroundColor: activa ? color.tinteAzul : "transparent" }, pressed && { backgroundColor: color.superficie }]}>
                  <Text style={{ fontFamily: activa ? fuente.textoFuerte : fuente.texto, fontSize: tl(17), color: color.texto }}>{item.texto}</Text>
                  {activa ? <Icono nombre="check" tam={20} color={color.texto} grosor={2.6} /> : null}
                </Pressable>
              );
            }} />
        </View>
      </Modal>
    </View>
  );
}

/** Partes de una fecha AAAA-MM-DD (o vacías). */
export function partesFecha(iso: unknown): { anio: number | null; mes: number | null; dia: number | null } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""));
  return m ? { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) } : { anio: null, mes: null, dia: null };
}

/** Edad cumplida a una fecha (hoy por defecto). */
export function edadDe(anio: number, mes: number, dia: number, hoy: Date = new Date()): number {
  let e = hoy.getFullYear() - anio;
  if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) e -= 1;
  return e;
}

/** Fecha completa (nacimiento). `valor` y el resultado van como AAAA-MM-DD; mientras falte una parte, devuelve null. */
export function SelectorFechaNacimiento({ etiqueta, valor, onCambio }: { etiqueta: string; valor: string | null | undefined; onCambio: (iso: string | null, partes: { anio: number | null; mes: number | null; dia: number | null }) => void }) {
  const inicial = partesFecha(valor);
  const [p, setP] = useState(inicial);
  const actual = new Date().getFullYear();
  const anios = Array.from({ length: 101 }, (_, i) => ({ valor: actual - 18 - i, texto: String(actual - 18 - i) }));   // de 18 a 118 años
  const poner = (cambio: Partial<typeof p>) => {
    const n = { ...p, ...cambio };
    if (n.dia && n.dia > diasDelMes(n.mes, n.anio)) n.dia = null;
    setP(n);
    onCambio(n.anio && n.mes && n.dia ? `${n.anio}-${String(n.mes).padStart(2, "0")}-${String(n.dia).padStart(2, "0")}` : null, n);
  };
  const edad = p.anio && p.mes && p.dia ? edadDe(p.anio, p.mes, p.dia) : null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fuente.tituloMedio, fontSize: tl(15), color: color.texto }}>{etiqueta}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Lista titulo="Año" ancho={1.1} opciones={anios} valor={p.anio} onElegir={(v) => poner({ anio: v })} />
        <Lista titulo="Mes" ancho={1.4} opciones={MESES.map((t, i) => ({ valor: i + 1, texto: t }))} valor={p.mes} onElegir={(v) => poner({ mes: v })} />
        <Lista titulo="Día" ancho={0.9} opciones={Array.from({ length: diasDelMes(p.mes, p.anio) }, (_, i) => ({ valor: i + 1, texto: String(i + 1) }))} valor={p.dia} onElegir={(v) => poner({ dia: v })} />
      </View>
      <Text accessibilityLiveRegion="polite" style={{ fontFamily: fuente.textoFuerte, fontSize: tl(16), color: edad !== null && edad < 18 ? color.textoRojo : color.texto }}>
        {edad !== null ? `Edad: ${edad} años${edad < 18 ? " · los menores de edad no se registran" : ""}` : "Edad: elija el año, el mes y el día"}
      </Text>
    </View>
  );
}

/** Cumpleaños: solo mes y día. */
export function SelectorCumpleanos({ etiqueta, mes, dia, onCambio }: { etiqueta: string; mes: number | null | undefined; dia: number | null | undefined; onCambio: (mes: number | null, dia: number | null) => void }) {
  const m = mes ?? null;
  const d = dia ?? null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fuente.tituloMedio, fontSize: tl(15), color: color.texto }}>{etiqueta}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Lista titulo="Mes" ancho={1.5} opciones={MESES.map((t, i) => ({ valor: i + 1, texto: t }))} valor={m}
          onElegir={(v) => onCambio(v, d && d > diasDelMes(v, null) ? null : d)} />
        <Lista titulo="Día" ancho={1} opciones={Array.from({ length: diasDelMes(m, null) }, (_, i) => ({ valor: i + 1, texto: String(i + 1) }))} valor={d}
          onElegir={(v) => onCambio(m, v)} />
      </View>
      {m && d ? <Text style={{ fontFamily: fuente.textoFuerte, fontSize: tl(16), color: color.texto }}>{`Cumpleaños: ${d} de ${MESES[m - 1].toLowerCase()}`}</Text> : null}
    </View>
  );
}
