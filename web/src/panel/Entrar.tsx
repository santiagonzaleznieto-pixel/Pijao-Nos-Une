// Ingreso al panel (17.5): la misma cuenta del teléfono y SIEMPRE la verificación en dos pasos con una aplicación
// autenticadora gratuita (sin SMS: costo cero). La primera vez se inscribe la aplicación escaneando un QR.
import { useState, type FormEvent } from "react";
import type { Fuente, Rol, Sesion } from "./datos/tipos";
import { Aviso } from "./ui";

export function Entrar({ fuente, sesion, cambiar, usarDemo, aviso }: {
  fuente: Fuente; sesion: Sesion; cambiar: (s: Sesion) => void; usarDemo: (rol: Rol) => void; aviso?: string | null;
}) {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const intentar = async (f: () => Promise<Sesion>) => {
    setOcupado(true);
    setError(null);
    try {
      cambiar(await f());
      setCodigo("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };
  const enviarClave = (ev: FormEvent) => { ev.preventDefault(); void intentar(() => fuente.entrar(correo, clave)); };
  const enviarCodigo = (ev: FormEvent) => { ev.preventDefault(); void intentar(() => fuente.verificarCodigo(codigo)); };
  const volver = async () => { await fuente.salir(); cambiar({ fase: "fuera" }); setClave(""); };

  const campoCodigo = (
    <>
      <label htmlFor="codigo">Código de 6 números de la aplicación autenticadora</label>
      <input id="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} required autoFocus
             value={codigo} onChange={(e) => setCodigo(e.target.value)} style={{ fontSize: "1.4rem", letterSpacing: 6 }} />
    </>
  );

  return (
    <main className="entrar">
      <p className="marca" style={{ fontSize: "1.5rem", marginBottom: 4 }}>Pijao <span>Nos Une</span></p>
      <p className="suave">Panel del Director y del Administrador</p>
      {aviso && <Aviso tipo="alerta">{aviso}</Aviso>}
      {error && <Aviso tipo="error">{error}</Aviso>}

      {sesion.fase === "fuera" && (
        <>
          <form className="tarjeta" onSubmit={enviarClave}>
            <h1 style={{ fontSize: "1.3rem" }}>Entrar</h1>
            <p className="suave pequeno">Use la misma cuenta de la app. Después le pediremos el código de su aplicación autenticadora.</p>
            <label htmlFor="correo">Correo</label>
            <input id="correo" type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
            <label htmlFor="clave">Contraseña</label>
            <input id="clave" type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
            <button className="boton bloque" style={{ marginTop: 16 }} disabled={ocupado}>{ocupado ? "Entrando…" : "Entrar"}</button>
          </form>
          <div className="tarjeta">
            <h2 style={{ fontSize: "1.05rem" }}>¿Quiere conocer el panel primero?</h2>
            <p className="suave pequeno">La demostración usa datos de ejemplo guardados solo en este navegador. No se conecta al servidor.</p>
            <div className="acciones">
              <button type="button" className="boton secundario chico" onClick={() => usarDemo("admin")}>Demostración: Administrador</button>
              <button type="button" className="boton secundario chico" onClick={() => usarDemo("director")}>Demostración: Director</button>
            </div>
          </div>
        </>
      )}

      {sesion.fase === "codigo" && (
        <form className="tarjeta" onSubmit={enviarCodigo}>
          <h1 style={{ fontSize: "1.3rem" }}>Verificación en dos pasos</h1>
          <p>Abra su aplicación autenticadora y escriba el código de «Pijao Nos Une».</p>
          {campoCodigo}
          <div className="acciones" style={{ marginTop: 16 }}>
            <button className="boton" disabled={ocupado}>{ocupado ? "Verificando…" : "Verificar"}</button>
            <button type="button" className="boton secundario" onClick={volver}>Volver</button>
          </div>
        </form>
      )}

      {sesion.fase === "inscribir" && (
        <form className="tarjeta" onSubmit={enviarCodigo}>
          <h1 style={{ fontSize: "1.3rem" }}>Active la verificación en dos pasos</h1>
          <ol>
            <li>Instale una aplicación autenticadora gratuita en su teléfono (por ejemplo Aegis, Google Authenticator o Microsoft Authenticator).</li>
            <li>En la aplicación, elija «Agregar» y escanee este código.</li>
            <li>Escriba abajo el código de 6 números que aparece.</li>
          </ol>
          <div style={{ textAlign: "center" }}><span className="qr"><img src={sesion.qr} alt="Código QR para la aplicación autenticadora" /></span></div>
          <p className="suave pequeno">¿No puede escanear? Escriba esta clave en la aplicación: <code style={{ overflowWrap: "anywhere" }}>{sesion.secreto}</code></p>
          {campoCodigo}
          <div className="acciones" style={{ marginTop: 16 }}>
            <button className="boton" disabled={ocupado}>{ocupado ? "Verificando…" : "Activar y entrar"}</button>
            <button type="button" className="boton secundario" onClick={volver}>Cancelar</button>
          </div>
        </form>
      )}

      {sesion.fase === "sin_permiso" && (
        <div className="tarjeta">
          <Aviso tipo="alerta">{sesion.mensaje}</Aviso>
          <button type="button" className="boton secundario" onClick={() => cambiar({ fase: "fuera" })}>Volver</button>
        </div>
      )}
    </main>
  );
}
