// Inicio del panel: lo que necesita atención hoy (aprobaciones y alertas; solicitudes de datos solo si llega una).
import type { Resumen } from "../datos/tipos";
import { Aviso, Encabezado, esAdmin, Estado, useCarga, usePanel, type Carga } from "../ui";

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
  const { perfil, fuente } = usePanel();
  const avisos = useCarga(() => fuente.avisos(), [fuente]);
  return (
    <>
      <Encabezado titulo={`Hola, ${perfil.nombre.split(" ")[0]}`} />
      {(avisos.datos ?? []).map((a) => (
        <div key={a.id} className="tarjeta" role="status">
          <p>{a.mensaje}</p>
          {a.tipo === "revision_permisos" && <p><a href="#/colaboradores">Ir a Colaboradores</a></p>}
          <button type="button" className="boton secundario chico"
                  onClick={() => void fuente.avisoLeido(a.id).then(avisos.recargar, avisos.recargar)}>Entendido</button>
        </div>
      ))}
      <Estado carga={resumen}>
        {(r) => (
          <>
            {/* Los derechos de los titulares salieron del menú (decisión del dueño, 0020). Si llega una solicitud desde la
                página pública «Mis datos», la ley obliga a responderla: solo entonces aparece este aviso. */}
            {r.titularesPendientes > 0 && (
              <Aviso tipo={r.titularesVencidos ? "error" : "alerta"}>
                Un ciudadano pidió algo sobre sus datos personales desde la página «Mis datos» ({r.titularesPendientes}{" "}
                {r.titularesPendientes === 1 ? "solicitud" : "solicitudes"}). La ley da 10 a 15 días hábiles para responder.{" "}
                <a href="#/titulares">Atender</a>.
              </Aviso>
            )}
            <div className="cuadricula">
              <Cifra href="#/colaboradores" titulo="Cuentas por aprobar" valor={r.pendientes} nivel={r.pendientes ? "alerta" : undefined} />
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
