// Inicio del panel: lo que necesita atención hoy (aprobaciones, solicitudes de titulares con plazo, alertas).
import type { Resumen } from "../datos/tipos";
import { Aviso, Encabezado, esAdmin, Estado, usePanel, type Carga } from "../ui";

function Cifra({ href, titulo, valor, nivel, nota }: { href: string; titulo: string; valor: number; nivel?: "alerta" | "critico"; nota?: string }) {
  return (
    <a className="tarjeta" href={href}>
      <div className="suave">{titulo}</div>
      <div className={`cifra${nivel ? ` ${nivel}` : ""}`}>{valor}</div>
      {nota && <div className="suave pequeno">{nota}</div>}
    </a>
  );
}

export function Inicio({ resumen }: { resumen: Carga<Resumen> }) {
  const { perfil } = usePanel();
  return (
    <>
      <Encabezado titulo={`Hola, ${perfil.nombre.split(" ")[0]}`} />
      <Estado carga={resumen}>
        {(r) => (
          <>
            {r.titularesVencidos > 0 && (
              <Aviso tipo="error">
                Hay {r.titularesVencidos} solicitud{r.titularesVencidos === 1 ? "" : "es"} de titulares con el plazo interno vencido.{" "}
                <a href="#/titulares">Atenderlas ahora</a>.
              </Aviso>
            )}
            <div className="cuadricula">
              <Cifra href="#/colaboradores" titulo="Cuentas por aprobar" valor={r.pendientes} nivel={r.pendientes ? "alerta" : undefined} />
              <Cifra href="#/titulares" titulo="Solicitudes de titulares abiertas" valor={r.titularesPendientes}
                     nivel={r.titularesVencidos ? "critico" : r.titularesPendientes ? "alerta" : undefined}
                     nota={r.titularesVencidos ? `${r.titularesVencidos} con el plazo interno vencido` : "Plazo interno: 5 días hábiles"} />
              <Cifra href="#/colaboradores" titulo="Colaboradores activos" valor={r.activos} />
              <Cifra href="#/colaboradores" titulo="Invitaciones sin usar" valor={r.invitacionesVigentes} nota="Vencen a las 72 horas" />
              <Cifra href={esAdmin(perfil) ? "#/salud" : "#/auditoria"} titulo="Alertas de calidad y seguridad abiertas" valor={r.alertasAbiertas}
                     nivel={r.alertasAbiertas ? "alerta" : undefined} nota="Se revisan desde la app (P-39 llega en la Fase 3)" />
            </div>
          </>
        )}
      </Estado>
      <div className="tarjeta">
        <h2>Recordatorios</h2>
        <ul>
          <li>No pase datos de personas por los chats de WhatsApp del equipo (10.5).</li>
          <li>«No contactar» se aplica de inmediato; la supresión completa la confirma el Director al responder el caso (16.5).</li>
          {esAdmin(perfil) && <li>Revise cada semana la salud del sistema y el último respaldo.</li>}
        </ul>
      </div>
    </>
  );
}
