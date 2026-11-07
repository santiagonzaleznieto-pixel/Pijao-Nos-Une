// P-08 Inicio: panel personal (9.2) y panel de campaña básico (9.3), con los datos del teléfono (sirve sin señal).
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { panelCampana, panelPersonal } from "@/core/estadisticas";
import { param } from "@/core/reglas";
import { listarBorradores } from "@/servicios/campo";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Fila, Pantalla, Tarjeta, Texto } from "@/ui/componentes";
import { color, espacio, letra } from "@/ui/tema";

function Cifra({ valor, texto }: { valor: string | number; texto: string }) {
  return (
    <View style={{ flex: 1, minWidth: 96 }}>
      <Text style={{ fontSize: letra.grande, fontWeight: "700", color: color.azul }}>{valor}</Text>
      <Text style={{ fontSize: letra.pequena, color: color.textoSuave }}>{texto}</Text>
    </View>
  );
}

export default function Inicio() {
  const app = useApp();
  const router = useRouter();
  const [p, setP] = useState<ReturnType<typeof panelPersonal> | null>(null);
  const [c, setC] = useState<ReturnType<typeof panelCampana> | null>(null);
  const [errorAviso, setErrorAviso] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const a = app.almacen;
      const [viviendas, visitas, hogares, personas, necesidades, tareas] = await Promise.all(
        ["viviendas", "visitas", "hogares", "personas", "necesidades", "tareas"].map((t) => a.listar(t)));
      const borradores = app.usuarioId ? (await listarBorradores(a, app.usuarioId)).length : 0;
      setP(panelPersonal({ usuarioId: app.usuarioId ?? "", visitas, tareas, borradores, porEnviar: app.cola.pendientes }));
      setC(panelCampana({ viviendas, visitas, hogares, personas, necesidades, minimo: param(app.params, "grupo_minimo") }));
    })();
  }, [app.almacen, app.usuarioId, app.version, app.cola.pendientes, app.params]);

  const necesita2fa = app.perfil && (app.perfil.esStaff || Object.keys(app.perfil.d.permisos).some((k) => ["O-01", "O-02", "O-05", "O-12", "O-13", "O-16"].includes(k)))
    && app.perfil.d.aal !== "aal2";

  return (
    <Pantalla titulo={`Hola, ${app.perfil?.d.nombre?.split(" ")[0] ?? ""}`}>
      {app.avisos.map((a) => (
        <Tarjeta key={a.id}>
          <Aviso tipo={a.tipo === "dispositivo_nuevo" ? "alerta" : "info"} texto={a.mensaje} />
          <Fila>
            <Boton texto="Fui yo, entendido" variante="suave" onPress={() => app.descartarAviso(a.id)} estilo={{ flex: 1 }} />
            <Boton texto="No fui yo" variante="secundario" estilo={{ flex: 1 }} onPress={async () => {
              try { await app.noFuiYo(a); router.push("/recuperar"); } catch (e) { setErrorAviso((e as Error).message); }
            }} />
          </Fila>
        </Tarjeta>
      ))}
      {errorAviso ? <Aviso tipo="error" texto={errorAviso} /> : null}
      {app.telefonoModificado ? <Aviso tipo="error" texto="Este teléfono parece modificado (rooteado). Por seguridad, avise al Administrador." /> : null}
      {necesita2fa ? <Aviso tipo="alerta" texto="Active la verificación en dos pasos para usar sus permisos de riesgo alto." /> : null}
      {necesita2fa ? <Boton texto="Activar verificación" variante="secundario" onPress={() => router.push("/verificacion")} /> : null}
      {app.cola.cuarentena ? <Aviso tipo="error" texto={`${app.cola.cuarentena} registro(s) necesitan revisión. Toque «Pendientes».`} /> : null}
      <Tarjeta>
        <Texto negrita>Su trabajo</Texto>
        <Fila><Cifra valor={p?.hoy ?? 0} texto="visitas hoy" /><Cifra valor={p?.semana ?? 0} texto="esta semana" /><Cifra valor={p?.total ?? 0} texto="en total" /></Fila>
        <Fila><Cifra valor={p?.borradores ?? 0} texto="borradores" /><Cifra valor={p?.por_enviar ?? 0} texto="por enviar" /><Cifra valor={p?.tareas_vencidas ?? 0} texto="tareas vencidas" /></Fila>
        <Texto suave>Calidad reciente: {p?.calidad_reciente.verde ?? 0} verdes · {p?.calidad_reciente.amarillo ?? 0} amarillas · {p?.calidad_reciente.rojo ?? 0} rojas</Texto>
      </Tarjeta>
      <Fila>
        <Boton texto="Registrar aquí" onPress={() => router.push("/registrar")} estilo={{ flex: 1 }} />
        <Boton texto="Pendientes" variante="secundario" onPress={() => router.push("/pendientes")} estilo={{ flex: 1 }} />
      </Fila>
      <Tarjeta>
        <Texto negrita>Campaña</Texto>
        <Fila><Cifra valor={c?.viviendas_conocidas ?? 0} texto="viviendas conocidas" /><Cifra valor={`${c?.cobertura_pct ?? 0} %`} texto="cobertura" /><Cifra valor={c?.hogares ?? 0} texto="hogares" /></Fila>
        {c?.necesidades_por_tema.length ? (
          <View style={{ gap: espacio.xs }}>
            <Texto negrita>Necesidades más mencionadas</Texto>
            {c.necesidades_por_tema.slice(0, 5).map((n) => <Texto key={n.tema}>{n.tema.replace(/_/g, " ")}: {n.texto}</Texto>)}
          </View>
        ) : null}
        <Texto suave>Solo cuentan los registros completos (en verde). Los grupos pequeños se muestran como «menos de 5».</Texto>
      </Tarjeta>
      <Boton texto="Sincronizar ahora" variante="suave" onPress={app.sincronizar} />
    </Pantalla>
  );
}
