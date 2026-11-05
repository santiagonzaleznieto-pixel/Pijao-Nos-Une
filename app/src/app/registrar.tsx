// P-11 «Registrar aquí» (5.4, 5.5): muestreo del GPS, precisión (R-10), duplicados a menos de 15 m (R-08),
// «No contactar» (R-21), distancia máxima (R-09) y ubicación manual con motivo hasta 100 m (R-12).
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { opciones } from "@/core/catalogos";
import { cercanos, haversineM } from "@/core/geo";
import { clasificarUbicacionManual, gpsAceptable, param } from "@/core/reglas";
import { borradorVacio } from "@/core/visita";
import { guardarBorrador } from "@/servicios/campo";
import { useApp } from "@/servicios/contexto";
import { calidadSenal, muestrear, pedirPermiso, type Lectura } from "@/servicios/gps";
import { Aviso, Boton, Opciones, Pantalla, Tarjeta, Texto } from "@/ui/componentes";

type V = { id: string; lat: number; lng: number; direccion?: string; estado?: string; barrio_vereda?: string };

export default function Registrar() {
  const app = useApp();
  const router = useRouter();
  const q = useLocalSearchParams<{ manualLat?: string; manualLng?: string }>();
  const manual = q.manualLat ? { lat: Number(q.manualLat), lng: Number(q.manualLng) } : null;
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [midiendo, setMidiendo] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [duplicados, setDuplicados] = useState<{ punto: V; distancia: number }[]>([]);
  const [motivo, setMotivo] = useState<string | null>(null);
  const segundos = param(app.params, "gps_muestreo_seg");

  useEffect(() => {
    (async () => {
      if (!(await pedirPermiso())) { setSinPermiso(true); setMidiendo(false); return; }
      const l = await muestrear(segundos, setLectura);
      setLectura(l);
      setMidiendo(false);
      const punto = manual ?? l;
      if (punto) {
        const viviendas = (await app.almacen.listar("viviendas")) as V[];
        setDuplicados(cercanos(viviendas, punto.lat, punto.lng, param(app.params, "radio_duplicados_m")));
      }
    })();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const punto = manual ?? lectura;
  const precisionOk = gpsAceptable(lectura?.precision_m, app.params);
  const distanciaManual = manual && lectura ? haversineM(lectura.lat, lectura.lng, manual.lat, manual.lng) : 0;
  const diferido = manual ? clasificarUbicacionManual(distanciaManual, app.params) === "diferido" : false;
  const bloqueadaNoContactar = duplicados.some((d) => d.punto.estado === "no_contactar" && d.distancia <= 5);

  async function nueva() {
    if (!punto || !app.usuarioId) return;
    const b = borradorVacio(app.usuarioId, { lat: punto.lat, lng: punto.lng, precision_m: manual ? null : lectura?.precision_m, altitud_m: lectura?.altitud_m, manual: Boolean(manual) });
    if (manual) { b.visita.motivo_manual = motivo; b.visita.ubicacion_manual = true; }
    b.dispositivo = { lat: lectura?.lat, lng: lectura?.lng, precision_m: lectura?.precision_m, ubicacion_simulada: lectura?.simulada };
    await guardarBorrador(app.almacen, b);
    router.replace({ pathname: "/visita", params: { borrador: b.id } });
  }

  if (sinPermiso) {
    return <Pantalla titulo="Ubicación"><Aviso tipo="alerta" texto="La app necesita su ubicación para registrar la visita en el punto exacto de la casa. Actívela en los ajustes del teléfono." /></Pantalla>;
  }

  return (
    <Pantalla titulo={manual ? "Ubicación manual" : "Registrar aquí"}>
      <Tarjeta>
        <Texto negrita>{midiendo ? "Tomando ubicación…" : "Ubicación tomada"}</Texto>
        <Texto>{lectura ? `Precisión ±${Math.round(lectura.precision_m ?? 0)} m · señal ${calidadSenal(lectura.precision_m)}` : "Esperando la señal del GPS. Párese en un lugar abierto."}</Texto>
        {lectura?.simulada ? <Aviso tipo="error" texto="El teléfono reporta una ubicación simulada. El registro quedará en revisión." /> : null}
      </Tarjeta>
      {!midiendo && !manual && !precisionOk ? (
        <Aviso tipo="alerta" texto={`La señal del GPS está débil (más de ${param(app.params, "precision_min_m")} m). Muévase a un lugar abierto y vuelva a intentarlo, o mantenga presionado el punto exacto en el mapa.`} />
      ) : null}
      {manual ? (
        <>
          <Texto>Punto elegido en el mapa a {Math.round(distanciaManual)} m de usted.</Texto>
          {diferido ? <Aviso tipo="alerta" texto="Está a más de 100 m: el registro quedará como borrador pendiente de aprobación (R-12)." /> : null}
          <Opciones etiqueta="Motivo de la ubicación manual" opciones={opciones("C-20")} valor={motivo} onCambio={(v) => setMotivo(v as string)} />
        </>
      ) : null}
      {bloqueadaNoContactar ? <Aviso tipo="error" texto="Esta vivienda pidió no ser contactada. No la visite (R-21)." /> : null}
      {duplicados.length && !bloqueadaNoContactar ? (
        <Tarjeta>
          <Texto negrita>¿Es una de estas casas? (a menos de {param(app.params, "radio_duplicados_m")} m)</Texto>
          {duplicados.map((d) => (
            <Boton key={d.punto.id} variante="suave" texto={`${d.punto.direccion ?? "Sin dirección"} · ${Math.round(d.distancia)} m · agregar visita`}
              deshabilitado={d.punto.estado === "no_contactar"}
              onPress={() => router.replace({ pathname: "/visita", params: { vivienda: d.punto.id } })} />
          ))}
        </Tarjeta>
      ) : null}
      <Boton texto={duplicados.length ? "Es otra casa: registrar nueva" : "Registrar esta vivienda"} onPress={nueva}
        deshabilitado={midiendo || !punto || bloqueadaNoContactar || (!manual && !precisionOk) || (Boolean(manual) && !motivo)} />
    </Pantalla>
  );
}
