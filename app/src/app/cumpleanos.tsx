// Cumpleañeros de hoy (7.5): las personas registradas que cumplen años hoy. Funciona sin señal con lo que hay en el
// teléfono. Solo a quien autorizó el contacto se le puede llamar o escribir (desde su ficha, con permiso); a los demás
// se les saluda en persona.
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { cumpleanerosDeHoy, type Cumpleanero } from "@/core/cumpleanos";
import { fechaConDia } from "@/core/formato";
import { useApp } from "@/servicios/contexto";
import { Aviso, Avatar, Cargando, Insignia, ItemLista, Pantalla, Vacio } from "@/ui/componentes";
import { color, fuente, tl } from "@/ui/tema";

export default function Cumpleanos() {
  const app = useApp();
  const router = useRouter();
  const [lista, setLista] = useState<Cumpleanero[] | null>(null);

  useEffect(() => {
    (async () => setLista(cumpleanerosDeHoy(await app.almacen.listar("personas"))))();
  }, [app.almacen, app.version]);

  if (!lista) return <Pantalla titulo="Cumpleañeros de hoy"><Cargando lista /></Pantalla>;
  return (
    <Pantalla etiqueta={fechaConDia(new Date())} titulo="Cumpleañeros de hoy">
      {!lista.length ? (
        <Vacio icono="estrella" titulo="Hoy nadie cumple años" texto="Aparecen aquí las personas registradas con su fecha de cumpleaños. Se registra en la visita, en la ficha de cada persona." />
      ) : (
        <>
          <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(15), color: color.textoSuave }}>
            {lista.length === 1 ? "1 persona cumple años hoy." : `${lista.length} personas cumplen años hoy.`}
          </Text>
          <View>
            {lista.map((c, i) => (
              <ItemLista key={c.id} titulo={c.nombre} ultimo={i === lista.length - 1}
                detalle={c.edad !== null ? `${c.edad} años` : undefined}
                izquierda={<Avatar nombre={c.nombre} tono={c.contactable ? "verde" : "gris"} />}
                derecha={<Insignia texto={c.contactable ? "Se puede contactar" : "Solo en persona"} tono={c.contactable ? "verde" : "gris"} />}
                onPress={() => router.push(`/persona/${c.id}`)} />
            ))}
          </View>
          <Aviso tipo="info" texto="Solo llame o escriba a quien autorizó el contacto. Nunca ofrezca regalos ni favores: un saludo basta." />
        </>
      )}
    </Pantalla>
  );
}
