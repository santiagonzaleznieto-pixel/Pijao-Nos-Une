// P-48 Carnet digital (10.7): foto o iniciales, nombre, vigencia y QR verificable (P-52). Protege a las familias de
// impostores. Diseño de la Fase 2: franja con el degradado, logo y nombre de la campaña.
import { Image, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { PAGINAS, useApp } from "@/servicios/contexto";
import { Avatar, Insignia, Pantalla, Vacio } from "@/ui/componentes";
import { color, degradado, fuente, radio, sombra, tl } from "@/ui/tema";

const ROL: Record<string, string> = { admin: "Administración", director: "Dirección de campaña", colaborador: "Equipo de campo" };

export default function Carnet() {
  const app = useApp();
  const p = app.perfil;
  if (!p || p.d.estado !== "activo" || app.practica) {
    return <Pantalla><Vacio icono="qr" titulo="Su carnet todavía no está activo" texto="Se activa cuando la cuenta está aprobada y el curso de ingreso aprobado. En el modo práctica no hay carnet." /></Pantalla>;
  }
  const url = `${PAGINAS.carnet}?id=${encodeURIComponent(p.d.id)}`;
  return (
    <Pantalla>
      <View style={[{ borderRadius: radio.panel, backgroundColor: color.tarjeta, borderWidth: 1, borderColor: color.borde, overflow: "hidden" }, sombra.flotante]}>
        <View style={{ height: 8, flexDirection: "row" }}>{degradado.map((c) => <View key={c} style={{ flex: 1, backgroundColor: c }} />)}</View>
        <View style={{ padding: 22, gap: 16, alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "stretch" }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", backgroundColor: color.blanco }}>
              <Image source={require("@/assets/images/logo-circular.jpg")} style={{ width: 54, height: 54, marginLeft: -5, marginTop: -4 }} accessibilityIgnoresInvertColors />
            </View>
            <Text style={{ fontFamily: fuente.marca, fontSize: tl(18), letterSpacing: 0.5, color: color.texto }}>
              PIJAO <Text style={{ fontFamily: fuente.tituloMedio, fontSize: tl(13), letterSpacing: 3 }}>NOS</Text> UNE
            </Text>
          </View>
          <Avatar nombre={p.d.nombre} tam={84} />
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text accessibilityRole="header" style={{ fontFamily: fuente.titulo, fontSize: tl(22), color: color.texto, textAlign: "center" }}>{p.d.nombre}</Text>
            <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoSuave }}>{ROL[p.d.rol] ?? "Equipo de la campaña"}</Text>
          </View>
          <Insignia texto="Vigente" tono="verde" icono="check" />
          <View style={{ padding: 14, backgroundColor: color.blanco, borderRadius: radio.l }} accessible accessibilityLabel="Código QR para verificar el carnet">
            <QRCode value={url} size={196} color="#122B52" backgroundColor="#FFFFFF" />
          </View>
        </View>
      </View>
      <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), lineHeight: tl(20), color: color.textoSuave, textAlign: "center" }}>
        Quien escanee el código ve en la página de verificación si usted está activo o activa en el equipo. No ve sus datos.
      </Text>
    </Pantalla>
  );
}
