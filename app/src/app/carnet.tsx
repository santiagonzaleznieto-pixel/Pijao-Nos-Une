// P-48 Carnet digital (10.7): foto, nombre, vigencia y QR verificable (P-52). Protege a las familias de impostores.
import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { PAGINAS, useApp } from "@/servicios/contexto";
import { Aviso, Pantalla, Tarjeta, Texto } from "@/ui/componentes";
import { color } from "@/ui/tema";

export default function Carnet() {
  const app = useApp();
  const p = app.perfil;
  if (!p || p.d.estado !== "activo" || app.practica) return <Pantalla titulo="Carnet digital"><Aviso tipo="alerta" texto="El carnet se activa cuando la cuenta está aprobada y el curso aprobado." /></Pantalla>;
  const url = `${PAGINAS.carnet}?id=${encodeURIComponent(p.d.id)}`;
  return (
    <Pantalla titulo="Carnet digital">
      <Tarjeta estilo={{ alignItems: "center", borderTopWidth: 8, borderTopColor: color.naranja }}>
        <Texto tam="titulo" negrita>Pijao nos une</Texto>
        <Texto tam="mediana" negrita>{p.d.nombre}</Texto>
        <Texto>Colaborador o colaboradora del equipo</Texto>
        <View style={{ padding: 12, backgroundColor: color.blanco }}><QRCode value={url} size={200} /></View>
        <Texto suave>Cualquier persona puede escanear este código para comprobar que usted pertenece al equipo y que el carnet está vigente.</Texto>
      </Tarjeta>
    </Pantalla>
  );
}
