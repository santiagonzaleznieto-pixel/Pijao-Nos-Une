// Menú «Más» (18.1): reúne el resto de pantallas según los permisos.
import { useRouter } from "expo-router";
import { useApp } from "@/servicios/contexto";
import { Boton, Pantalla, Texto } from "@/ui/componentes";
import { VERSION_APP } from "@/servicios/version";

export default function Mas() {
  const app = useApp();
  const router = useRouter();
  return (
    <Pantalla titulo="Más">
      <Boton texto="Buscar" variante="suave" onPress={() => router.push("/buscar")} />
      <Boton texto="Mis visitas y pendientes" variante="suave" onPress={() => router.push("/pendientes")} />
      <Boton texto="Guion de visita y preguntas frecuentes" variante="suave" onPress={() => router.push("/guion")} />
      <Boton texto="Anuncios" variante="suave" onPress={() => router.push("/anuncios")} />
      <Boton texto="Carnet digital" variante="suave" onPress={() => router.push("/carnet")} />
      {app.perfil?.puede("ver_titulares") ? <Boton texto="Derechos de los titulares" variante="suave" onPress={() => router.push("/titulares")} /> : null}
      <Boton texto="Verificación en dos pasos" variante="suave" onPress={() => router.push("/verificacion")} />
      <Boton texto="Mi perfil" variante="suave" onPress={() => router.push("/perfil")} />
      <Boton texto={app.practica ? "Salir del modo práctica" : "Entrar al modo práctica"} variante="secundario" onPress={() => app.cambiarPractica(!app.practica)} />
      <Boton texto="Ocultar pantalla" variante="suave" onPress={app.ocultarPantalla} />
      <Texto suave>Recuerde: no pase datos de personas por los chats de WhatsApp del equipo. Versión {VERSION_APP}.</Texto>
    </Pantalla>
  );
}
