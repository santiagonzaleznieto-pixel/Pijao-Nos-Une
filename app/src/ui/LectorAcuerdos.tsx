// P-05 y R-45: los acuerdos que firma el equipo, leídos hasta el final. Usa los textos vigentes que publica el Administrador
// (P-42, migración 0016); sin conexión muestra los de la app y su versión local.
import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { VERSION_ACUERDOS } from "@/core/curso";
import { useApp } from "@/servicios/contexto";
import { Boton, Cargando, Casilla, Pantalla, Tarjeta, Texto } from "@/ui/componentes";
import { espacio } from "@/ui/tema";

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
  const [leido, setLeido] = useState(false);
  const [acepto, setAcepto] = useState(false);
  const [altoVisible, setAltoVisible] = useState(0);

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
    <Pantalla titulo={titulo} desplazable={false}
      pie={<>
        <Casilla texto="Leí y acepto los acuerdos" valor={acepto} onCambio={setAcepto} detalle={leido ? undefined : "Lea hasta el final para poder aceptar."} />
        <Boton texto={textoBoton} onPress={() => onAceptar(version)} cargando={cargando} deshabilitado={!acepto || !leido} />
      </>}>
      <ScrollView onScroll={({ nativeEvent: n }) => { if (n.layoutMeasurement.height + n.contentOffset.y >= n.contentSize.height - 24) setLeido(true); }}
        onLayout={(e) => setAltoVisible(e.nativeEvent.layout.height)}
        onContentSizeChange={(_w, h) => { if (altoVisible && h <= altoVisible + 24) setLeido(true); }}   // cabe sin desplazar
        scrollEventThrottle={200} contentContainerStyle={{ gap: espacio.m }}>
        {introduccion ? <Texto>{introduccion}</Texto> : null}
        {textos.map((a) => (
          <Tarjeta key={a.titulo}><Texto negrita>{a.titulo}</Texto><Texto>{a.texto}</Texto></Tarjeta>
        ))}
        <Texto suave>Versión de los textos: {version}. Los textos definitivos los revisa el abogado.</Texto>
      </ScrollView>
    </Pantalla>
  );
}
