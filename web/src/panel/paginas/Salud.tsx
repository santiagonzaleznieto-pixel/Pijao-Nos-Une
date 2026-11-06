// P-43 Salud del sistema (9.6 y N-12, solo el Administrador): usuarios, errores, tiempos de respuesta,
// sincronización, uso del plan gratuito, alertas de seguridad, respaldo, versiones, titulares, teléfonos perdidos
// y salud de la flota.
import type { ReactNode } from "react";
import { compararVersion, fechaHora, haceCuanto, nivelRespaldo, nivelUso, type Nivel } from "../../logica/utiles";
import type { Salud as DatosSalud } from "../datos/tipos";
import { Aviso, Chip, Encabezado, esAdmin, Estado, SinPermiso, useCarga, usePanel } from "../ui";

const ETIQUETA_NIVEL: Record<Nivel, string> = { ok: "Bien", alerta: "Revisar", critico: "Atender ya" };
const ALERTAS: Record<string, string> = {
  servidor_publico_o_contratista: "Servidor público o contratista (R-07)",
  fuera_de_zona: "Registro fuera de su zona",
  acceso_masivo: "Muchos accesos a datos completos",
  no_contactar_masivo: "Muchas marcas de «No contactar»",
  ritmo_sospechoso: "Registros demasiado seguidos",
  salto_imposible: "Salto de ubicación imposible",
};

function Tarjeta({ titulo, nivel, children }: { titulo: string; nivel?: Nivel; children: ReactNode }) {
  return (
    <section className="tarjeta">
      <h2 style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        {titulo}{nivel && <Chip nivel={nivel}>{ETIQUETA_NIVEL[nivel]}</Chip>}
      </h2>
      {children}
    </section>
  );
}

export function Salud() {
  const { fuente, perfil } = usePanel();
  const datos = useCarga(async () => {
    const latencias: number[] = [];
    for (let i = 0; i < 3; i++) latencias.push(await fuente.latenciaMs());
    const salud = await fuente.salud();
    return { salud, latencia: Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) };
  }, [fuente]);
  if (!esAdmin(perfil)) return <><Encabezado titulo="Salud del sistema" /><SinPermiso /></>;
  return (
    <>
      <Encabezado titulo="Salud del sistema">
        <button type="button" className="boton secundario chico" onClick={datos.recargar} disabled={datos.cargando}>{datos.cargando ? "Actualizando…" : "Actualizar"}</button>
      </Encabezado>
      <Estado carga={datos}>{(d) => <Tablero s={d.salud} latencia={d.latencia} />}</Estado>
    </>
  );
}

function Tablero({ s, latencia }: { s: DatosSalud; latencia: number }) {
  const nRespaldo = nivelRespaldo(s.respaldo?.en);
  const nBase = nivelUso(s.recursos.base_pct);
  const nArchivos = nivelUso(s.recursos.archivos_pct);
  const nLatencia: Nivel = latencia > 2000 ? "critico" : latencia > 800 ? "alerta" : "ok";
  const viejas = s.versiones.filter((v) => s.version_minima && v.version !== "(desconocida)" && compararVersion(v.version, s.version_minima) < 0);
  const alertas = Object.entries(s.seguridad.alertas_abiertas);
  const nSeguridad: Nivel = s.seguridad.registros_fallidos_24h > 20 || alertas.length > 0 ? "alerta" : "ok";
  const nTitulares: Nivel = s.titulares.vencidas_plazo_legal ? "critico" : s.titulares.vencidas_plazo_interno ? "alerta" : "ok";
  const nErrores: Nivel = s.errores.ultimo_dia > 20 ? "critico" : s.errores.ultimo_dia > 5 ? "alerta" : "ok";

  return (
    <>
      <p className="suave pequeno">Datos de {fechaHora(s.generado_en)}.</p>
      {(nRespaldo === "critico" || nBase === "critico" || nArchivos === "critico" || nTitulares === "critico") && (
        <Aviso tipo="error">Hay puntos que necesitan atención inmediata: revise las tarjetas marcadas «Atender ya».</Aviso>
      )}
      <div className="cuadricula">
        <Tarjeta titulo="Usuarios">
          <div className="cifra">{s.usuarios.activos}</div>
          <p className="suave">activos · {s.usuarios.usaron_app_7_dias} usaron la app esta semana</p>
          <p className="pequeno">{s.usuarios.pendientes} por aprobar · {s.usuarios.aprobados_sin_ingreso} sin terminar el ingreso · {s.usuarios.suspendidos} suspendidos</p>
        </Tarjeta>
        <Tarjeta titulo="Tiempo de respuesta" nivel={nLatencia}>
          <div className="cifra">{latencia} ms</div>
          <p className="suave">Promedio de 3 consultas desde este computador.</p>
        </Tarjeta>
        <Tarjeta titulo="Errores de la app" nivel={nErrores}>
          <div className="cifra">{s.errores.ultimo_dia}</div>
          <p className="suave">en las últimas 24 horas · {s.errores.ultima_semana} en la semana</p>
        </Tarjeta>
        <Tarjeta titulo="Sincronización" nivel={s.sincronizacion.telefonos_atrasados ? "alerta" : "ok"}>
          <div className="cifra">{s.sincronizacion.registros_por_enviar}</div>
          <p className="suave">registros esperando en los teléfonos · {s.sincronizacion.telefonos_atrasados} teléfonos sin enviar hace más de 24 horas</p>
        </Tarjeta>
        <Tarjeta titulo="Plan gratuito de Supabase" nivel={nBase === "critico" || nArchivos === "critico" ? "critico" : nBase === "alerta" || nArchivos === "alerta" ? "alerta" : "ok"}>
          <p>Base de datos: <strong>{s.recursos.base_mb} MB</strong> ({s.recursos.base_pct} %)</p>
          <p>Fotos y archivos: <strong>{s.recursos.archivos_mb} MB</strong> ({s.recursos.archivos_pct} %)</p>
          <p className="suave pequeno">Costo: US$ 0. Al llegar al 80 % hay que liberar espacio o aplicar el plan de cierre de fotos antiguas.</p>
        </Tarjeta>
        <Tarjeta titulo="Último respaldo" nivel={nRespaldo}>
          {s.respaldo ? (
            <>
              <div className="cifra" style={{ fontSize: "1.3rem" }}>{haceCuanto(s.respaldo.en)}</div>
              <p className="suave">{fechaHora(s.respaldo.en)} · {s.respaldo.mb ?? "—"} MB · {s.respaldo.archivos ?? "—"} archivos{s.respaldo.equipo ? ` · ${s.respaldo.equipo}` : ""}</p>
            </>
          ) : <p>Nunca se ha registrado un respaldo. Programe <code>tools/respaldo.ps1</code> cada noche (docs/Entrega-y-Firma.md).</p>}
        </Tarjeta>
        <Tarjeta titulo="Solicitudes de titulares" nivel={nTitulares}>
          <div className="cifra">{s.titulares.pendientes}</div>
          <p className="suave">abiertas · {s.titulares.vencidas_plazo_interno} con el plazo interno vencido · {s.titulares.vencidas_plazo_legal} con el plazo legal vencido</p>
          <a href="#/titulares">Ver los casos</a>
        </Tarjeta>
        <Tarjeta titulo="Seguridad" nivel={nSeguridad}>
          <p className="pequeno">Registros fallidos con código de invitación (24 h): <strong>{s.seguridad.registros_fallidos_24h}</strong></p>
          <p className="pequeno">Usos de las páginas públicas (24 h): <strong>{s.seguridad.formularios_publicos_24h}</strong></p>
          <p className="pequeno">Accesos a datos completos (24 h): <strong>{s.seguridad.accesos_completos_24h}</strong></p>
          <p className="pequeno">Exportaciones (7 días): <strong>{s.seguridad.exportaciones_7_dias}</strong></p>
          <p className="pequeno">Acciones auditadas (24 h): <strong>{s.auditoria_24h}</strong></p>
          <p className="suave pequeno">Los intentos fallidos de inicio de sesión se ven en el panel de Supabase (Authentication → Logs).</p>
        </Tarjeta>
      </div>

      {alertas.length > 0 && (
        <Tarjeta titulo="Alertas abiertas" nivel="alerta">
          <ul>{alertas.map(([tipo, n]) => <li key={tipo}>{ALERTAS[tipo] ?? tipo}: <strong>{n}</strong></li>)}</ul>
        </Tarjeta>
      )}

      <Tarjeta titulo="Versiones de la app instaladas" nivel={viejas.length ? "alerta" : "ok"}>
        <p className="suave">Versión mínima obligatoria: <strong>{s.version_minima ?? "—"}</strong>{viejas.length ? " · los teléfonos con versiones viejas deben actualizar." : ""}</p>
        <ul>{s.versiones.map((v) => <li key={v.version}>{v.version}: {v.telefonos} teléfono{v.telefonos === 1 ? "" : "s"}</li>)}</ul>
      </Tarjeta>

      {s.perdidos.length > 0 && (
        <Tarjeta titulo="Teléfonos reportados como perdidos" nivel={s.perdidos.some((p) => p.se_conecto_despues) ? "ok" : "alerta"}>
          <ul>
            {s.perdidos.map((p) => (
              <li key={p.id}>{p.usuario} · {p.modelo ?? "teléfono"} · reportado {fechaHora(p.reportado_perdido_en)} ·{" "}
                {p.se_conecto_despues ? "se conectó después: ya recibió la orden de borrar" : "no se ha conectado: borrará los datos al conectarse"}</li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta titulo="Errores recientes">
        {s.errores.recientes.length === 0 ? <p className="suave">Sin errores reportados.</p> : (
          <div className="tabla-envoltura">
            <table>
              <thead><tr><th>Cuándo</th><th>Versión</th><th>Pantalla</th><th>Mensaje</th></tr></thead>
              <tbody>{s.errores.recientes.map((e, i) => (
                <tr key={i}><td>{haceCuanto(e.creado_en)}</td><td>{e.version_app ?? "—"}</td><td>{e.pantalla ?? "—"}</td><td className="pequeno">{e.mensaje}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Salud de la flota (N-12)">
        {s.flota.length === 0 ? <p className="suave">Ningún teléfono se ha conectado todavía.</p> : (
          <div className="tabla-envoltura">
            <table>
              <thead><tr><th>Colaborador</th><th>Teléfono</th><th>Versión</th><th>Última conexión</th><th>Última sincronización</th><th>Por enviar</th><th>Espacio libre</th><th>Batería</th></tr></thead>
              <tbody>{s.flota.map((d) => {
                const atrasado = (d.cola_pendiente ?? 0) > 0 && (!d.ultima_sincronizacion || Date.now() - new Date(d.ultima_sincronizacion).getTime() > 86400000);
                return (
                  <tr key={d.id}>
                    <td>{d.usuario}</td><td>{d.modelo ?? "—"}</td>
                    <td>{d.version_app ?? "—"}{s.version_minima && d.version_app && compararVersion(d.version_app, s.version_minima) < 0 && <> <Chip nivel="alerta">Vieja</Chip></>}</td>
                    <td>{haceCuanto(d.ultimo_acceso)}</td>
                    <td>{haceCuanto(d.ultima_sincronizacion)}</td>
                    <td>{d.cola_pendiente ?? 0}{atrasado && <> <Chip nivel="alerta">Atrasado</Chip></>}</td>
                    <td>{d.espacio_libre_mb != null ? `${d.espacio_libre_mb} MB` : "—"}{d.espacio_libre_mb != null && d.espacio_libre_mb < 500 && <> <Chip nivel="alerta">Poco</Chip></>}</td>
                    <td>{d.bateria_pct != null ? `${d.bateria_pct} %` : "—"}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </>
  );
}
