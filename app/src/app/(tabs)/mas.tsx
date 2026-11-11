// Menú «Más» (18.1): reúne el resto de pantallas según los permisos, agrupadas como en el diseño de la Fase 2.
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useApp } from "@/servicios/contexto";
import { VERSION_APP } from "@/servicios/version";
import { Aviso, Etiqueta, FilaEnlace, Pantalla, Texto } from "@/ui/componentes";

export default function Mas() {
  const app = useApp();
  const router = useRouter();
  return (
    <Pantalla titulo="Más">
      <View style={{ gap: 10 }}>
        <Etiqueta>Trabajo de campo</Etiqueta>
        <FilaEnlace texto="Buscar" detalle="Dirección, vereda, finca o nombre" icono="buscar" onPress={() => router.push("/buscar")} />
        <FilaEnlace texto="Mis visitas y pendientes" detalle={app.cola.pendientes ? `${app.cola.pendientes} por enviar` : "Todo enviado"} icono="nube" onPress={() => router.push("/pendientes")} />
        <FilaEnlace texto="Guion de visita y preguntas" icono="libro" onPress={() => router.push("/guion")} />
        <FilaEnlace texto="Cumpleañeros de hoy" icono="estrella" onPress={() => router.push("/cumpleanos")} />
      </View>
      <View style={{ gap: 10 }}>
        <Etiqueta>Seguridad</Etiqueta>
        <FilaEnlace texto="Jornada y SOS" detalle="Iniciar o terminar la jornada y pedir ayuda" icono="escudo" onPress={() => router.push("/jornada")} />
        <FilaEnlace texto="Reportar un incidente" detalle="Confidencial: solo lo ven el Director y el Administrador" icono="alerta" onPress={() => router.push("/incidente")} />
      </View>
      <View style={{ gap: 10 }}>
        <Etiqueta>Equipo</Etiqueta>
        <FilaEnlace texto="Anuncios" icono="megafono" onPress={() => router.push("/anuncios")} />
        {app.perfil?.puede("ver_titulares") ? <FilaEnlace texto="Derechos de los titulares" detalle="Solicitudes de las personas sobre sus datos" icono="escudo" onPress={() => router.push("/titulares")} /> : null}
      </View>
      <View style={{ gap: 10 }}>
        <Etiqueta>Mi cuenta</Etiqueta>
        <FilaEnlace texto="Perfil y ajustes" detalle="Modo claro, oscuro o sol y letra grande" icono="persona" onPress={() => router.push("/perfil")} />
        <FilaEnlace texto="Carnet digital" icono="qr" onPress={() => router.push("/carnet")} />
        <FilaEnlace texto="Verificación en dos pasos" icono="candado" onPress={() => router.push("/verificacion")} />
        <FilaEnlace texto={app.practica ? "Salir del modo práctica" : "Modo práctica"} detalle="Datos de ejemplo; nada se envía" icono="play" onPress={() => app.cambiarPractica(!app.practica)} />
        <FilaEnlace texto="Ayuda" detalle="Preguntas frecuentes y reportar un error" icono="ayuda" onPress={() => router.push("/ayuda")} />
        <FilaEnlace texto="Ocultar pantalla" detalle="Tapa todo si alguien se acerca a mirar" icono="ocultar" onPress={app.ocultarPantalla} />
      </View>
      <Aviso tipo="info" icono="mensaje" texto="No pase datos de personas por los chats de WhatsApp del equipo: los datos solo van en la app." />
      <Texto suave tam="pequena" centrado>Versión {VERSION_APP}</Texto>
    </Pantalla>
  );
}
