import { Redirect } from "expo-router";

// El botón central de la barra abre «Registrar aquí»; esta ruta solo existe para la pestaña.
export default function Nuevo() {
  return <Redirect href="/registrar" />;
}
