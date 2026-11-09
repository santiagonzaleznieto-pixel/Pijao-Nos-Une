// P-05 y R-45: los acuerdos que firma el equipo, leídos hasta el final. Usa los textos vigentes que publica el Administrador
// (P-42, migración 0016); sin conexión muestra los de la app y su versión local. Diseño de la Fase 2: barra de lectura con
// el degradado de la marca y la casilla que solo se activa al llegar al final.
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { VERSION_ACUERDOS } from "@/core/curso";
import { useApp } from "@/servicios/contexto";
import { Boton, Cargando, Casilla, Insignia, TituloMedio } from "@/ui/componentes";
import { color, degradado, espacio, fuente, tl } from "@/ui/tema";

const TITULOS: Record<string, string> = {
  acuerdo_confidencialidad: "Acuerdo de confidencialidad",
  codigo_conducta: "Código de conducta",
};

const LOCALES = [
  { titulo: "Acuerdo de confidencialidad", texto: "Me comprometo a mantener en reserva toda la información de personas y hogares a la que acceda por la app, a no compartir capturas ni listas, a no usar los datos para fines propios y a reportar cualquier pérdida del teléfono." },
  { titulo: "Código de conducta", texto: "Respeto a toda persona. Nada de compra de votos ni ofrecimiento de favores. No presionar ni amenazar. No desinformar ni atacar la vida privada. No compartir capturas ni listas. No fotografiar menores. Identificarme siempre. Cumplir las normas electorales y denunciar irregularidades. No portar armas ni consumir alcohol durante la jornada." },
];

const SEGURIDAD = { titulo: "Política de seguridad y tratamiento de datos", texto: "Solo registro datos con autorización. Uso la app solo en mi teléfono, con bloqueo de pantalla. No anoto datos sensibles en las notas. Reporto de inmediato si pierdo el teléfono." };

export function LectorAcuerdos({ titulo, introduccion, textoBoton, onAceptar, cargando }: {
  titulo: string; introduccion?: string; textoBoton: string; cargando?: boolean;
  /** Recibe la versión aceptada (la del servidor si se pudo leer). */
  onAceptar: (version: string) => void;
}) {
  const { sesion, practica } = useApp();
  const [textos, setTextos] = useState<{ titulo: string; texto: string }[] | null>(null);
  const [version, setVersion] = useState(VERSION_ACUERDOS);
  const [avance, setAvance] = useState(0);
  const [acepto, setAcepto] = useState(false);
  const [altoVisible, setAltoVisible] = useState(0);
  const leido = avance >= 0.999;

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (practica) throw new Error("práctica");
        const r = await sesion.acuerdosVigentes();
        if (!vivo) return;
        if (r.textos.length) {
          setTextos([...r.textos.map((t) => ({ titulo: TITULOS[t.tipo] ?? t.tipo, texto: t.contenido })), SEGURIDAD]);
          if (r.version) setVersion(r.version);
          return;
        }
      } catch { /* sin conexión o práctica: textos de la app */ }
      if (vivo) setTextos([...LOCALES, SEGURIDAD]);
    })();
    return () => { vivo = false; };
  }, [sesion, practica]);

  if (!textos) return <Cargando texto="Cargando los acuerdos…" />;

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: espacio.pantalla, paddingTop: espacio.m, paddingBottom: 10 }}>
        <Text accessibilityRole="header" style={{ fontFamily: fuente.titulo, fontSize: tl(19), color: color.texto, flex: 1 }}>{titulo}</Text>
        <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoSuave }}>{Math.round(avance * 100)} % leído</Text>
      </View>
      <View style={{ height: 4, backgroundColor: color.superficiePanel }} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(avance * 100) }}>
        <View style={{ height: 4, width: `${Math.round(avance * 100)}%`, flexDirection: "row", overflow: "hidden" }}>
          {degradado.map((c) => <View key={c} style={{ flex: 1, backgroundColor: c }} />)}
        </View>
      </View>
      <ScrollView
        onScroll={({ nativeEvent: n }) => {
          const total = n.contentSize.height - n.layoutMeasurement.height;
          setAvance((a) => Math.max(a, total <= 24 ? 1 : Math.min(1, (n.contentOffset.y + 24) / total)));
        }}
        onLayout={(ev) => setAltoVisible(ev.nativeEvent.layout.height)}
        onContentSizeChange={(_w, h) => { if (altoVisible && h <= altoVisible + 24) setAvance(1); }}   // cabe sin desplazar
        scrollEventThrottle={100} contentContainerStyle={{ gap: espacio.l, padding: espacio.pantalla, paddingBottom: espacio.xl }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {textos.map((a) => <Insignia key={a.titulo} texto={a.titulo} tono="azul" />)}
        </View>
        {introduccion ? <Text style={{ fontFamily: fuente.texto, fontSize: tl(16), lineHeight: tl(24), color: color.textoSuave }}>{introduccion}</Text> : null}
        {textos.map((a) => (
          <View key={a.titulo} style={{ gap: 8 }}>
            <TituloMedio>{a.titulo}</TituloMedio>
            {a.texto.split(/\n+/).map((p, i) => (
              <Text key={i} style={{ fontFamily: fuente.texto, fontSize: tl(16), lineHeight: tl(25), color: color.texto }}>{p}</Text>
            ))}
          </View>
        ))}
        <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoSuave }}>Versión de los textos: {version}. Los textos definitivos los revisa el abogado.</Text>
      </ScrollView>
      <View style={{ paddingHorizontal: espacio.pantalla, paddingTop: 14, paddingBottom: 26, borderTopWidth: 1, borderTopColor: color.borde, backgroundColor: color.tarjeta, gap: 10 }}>
        <Casilla texto="Leí y acepto los acuerdos" valor={acepto} onCambio={(v) => { if (leido) setAcepto(v); }}
          detalle={leido ? undefined : "Se activa al leer hasta el final."} estilo={leido ? undefined : { opacity: 0.55 }} />
        <Boton texto={textoBoton} onPress={() => onAceptar(version)} cargando={cargando} deshabilitado={!acepto || !leido} />
        <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(13), color: color.textoSuave, textAlign: "center" }}>Se guardan la fecha, la versión y el teléfono.</Text>
      </View>
    </View>
  );
}
