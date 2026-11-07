// Contexto de la app: une la base local, el servidor, la sincronización, la sesión y el perfil.
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as LocalAuthentication from "expo-local-authentication";
import * as Network from "expo-network";
import * as ScreenCapture from "expo-screen-capture";
import * as SecureStore from "expo-secure-store";
import JailMonkey from "jail-monkey";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { configurarGeneradorId } from "../core/ids";
import { Perfil, type PerfilDatos } from "../core/permisos";
import { param, type Params } from "../core/reglas";
import { AlmacenSqlite } from "../datos/almacen-sqlite";
import { crearCliente, RemotoSupabase } from "../datos/remoto-supabase";
import { MotorSync, type ResultadoSync } from "../datos/sync";
import type { Almacen } from "../datos/tipos";
import { RemotoPractica } from "./practica";
import { ServicioSesion } from "./sesion";
import { VERSION_APP } from "./version";

configurarGeneradorId(() => Crypto.randomUUID());

const extra = (Constants.expoConfig?.extra ?? {}) as { supabaseUrl: string; supabaseAnonKey: string; paginaCarnet?: string; paginaMisDatos?: string };
export const cliente = crearCliente(extra.supabaseUrl, extra.supabaseAnonKey);
export const PAGINAS = { carnet: extra.paginaCarnet ?? "", misDatos: extra.paginaMisDatos ?? "" };

const CLAVE_PRACTICA = "pijao_modo_practica";
const CLAVE_DISPOSITIVO = "pijao_id_dispositivo";

async function idDispositivo(): Promise<string> {
  let id = await SecureStore.getItemAsync(CLAVE_DISPOSITIVO);
  if (!id) { id = Crypto.randomUUID(); await SecureStore.setItemAsync(CLAVE_DISPOSITIVO, id); }
  return id;
}

export interface EstadoCola { pendientes: number; cuarentena: number; masAntiguo: string | null }

interface ContextoApp {
  listo: boolean;
  practica: boolean;
  usuarioId: string | null;
  perfil: Perfil | null;
  params: Params;
  almacen: Almacen;
  sesion: ServicioSesion;
  conectado: boolean;
  bloqueado: boolean;
  telefonoModificado: boolean;
  actualizacionObligatoria: boolean;
  cola: EstadoCola;
  ultimaSync: ResultadoSync | null;
  ultimaSyncEn: string | null;
  version: number;                       // cambia cuando hay datos nuevos: las pantallas se refrescan
  sincronizar: () => Promise<ResultadoSync | null>;
  recargarPerfil: () => Promise<void>;
  cambiarPractica: (activar: boolean) => Promise<void>;
  desbloquear: () => Promise<void>;
  avisarCambio: () => void;
  /** Enlace temporal de una foto guardada en el servidor (P-10 y P-13). */
  urlFoto: (ruta: string) => Promise<string | null>;
}

const Ctx = createContext<ContextoApp | null>(null);

export function useApp(): ContextoApp {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp fuera del ProveedorApp");
  return c;
}

export function ProveedorApp({ children }: { children: ReactNode }) {
  const [listo, setListo] = useState(false);
  const [practica, setPractica] = useState(false);
  const [almacen, setAlmacen] = useState<Almacen | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [perfilDatos, setPerfilDatos] = useState<PerfilDatos | null>(null);
  const [params, setParams] = useState<Params>({});
  const [conectado, setConectado] = useState(true);
  const [bloqueado, setBloqueado] = useState(false);
  const [cola, setCola] = useState<EstadoCola>({ pendientes: 0, cuarentena: 0, masAntiguo: null });
  const [ultimaSync, setUltimaSync] = useState<ResultadoSync | null>(null);
  const [ultimaSyncEn, setUltimaSyncEn] = useState<string | null>(null);
  const [actualizacionObligatoria, setActualizacionObligatoria] = useState(false);
  const [version, setVersion] = useState(0);
  const enSegundoPlanDesde = useRef<number | null>(null);
  const uidRef = useRef<string | null>(null);
  uidRef.current = usuarioId;
  const telefonoModificado = useMemo(() => { try { return JailMonkey.isJailBroken(); } catch { return false; } }, []);

  // M6 / 5.16: sin capturas de pantalla en toda la app.
  useEffect(() => { ScreenCapture.preventScreenCaptureAsync().catch(() => undefined); }, []);

  // Abre la base (real o de práctica) y la sesión guardada.
  useEffect(() => {
    (async () => {
      const p = (await SecureStore.getItemAsync(CLAVE_PRACTICA)) === "1";
      setPractica(p);
      const a = await AlmacenSqlite.abrir(p ? "practica" : "pijao");
      setAlmacen(a);
      setParams(((await a.getMeta<Params>("params")) ?? {}) as Params);
      const { data } = await cliente.auth.getSession();
      setUsuarioId(data.session?.user.id ?? null);
      setListo(true);
    })();
    const { data: sub } = cliente.auth.onAuthStateChange((_e, s) => setUsuarioId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const remoto = useMemo(() => (practica ? new RemotoPractica(() => uidRef.current) : new RemotoSupabase(cliente)), [practica]);
  const sesion = useMemo(() => (almacen ? new ServicioSesion(cliente, almacen, VERSION_APP, idDispositivo) : null), [almacen]);
  const motor = useMemo(() => (almacen ? new MotorSync(almacen, remoto, () => uidRef.current, () => undefined, () => params) : null), [almacen, remoto, params]);

  const refrescarCola = useCallback(async () => {
    if (almacen && usuarioId) setCola(await almacen.contarCola(usuarioId));
  }, [almacen, usuarioId]);

  const recargarPerfil = useCallback(async () => {
    if (!sesion || !usuarioId) { setPerfilDatos(null); return; }
    if (practica) {
      setPerfilDatos({ id: usuarioId, nombre: "Modo práctica", rol: "colaborador", estado: "activo", permisos: {}, zonas: [], aal: "aal1", curso_aprobado: true, acuerdos_ok: true });
      return;
    }
    try {
      const d = await sesion.perfil();
      setPerfilDatos(d);
      await almacen?.setMeta("perfil", d);
    } catch {
      setPerfilDatos((await almacen?.getMeta<PerfilDatos>("perfil")) ?? null);   // sin conexión: el último conocido
    }
  }, [sesion, usuarioId, practica, almacen]);

  useEffect(() => { recargarPerfil(); }, [recargarPerfil]);

  const sincronizar = useCallback(async () => {
    if (!motor || !almacen || !usuarioId) return null;
    const r = await motor.sincronizar();
    setUltimaSync(r);
    if (!r.sinConexion && !r.error) setUltimaSyncEn(new Date().toISOString());
    setParams(((await almacen.getMeta<Params>("params")) ?? {}) as Params);
    await refrescarCola();
    setVersion((v) => v + 1);
    if (sesion && !practica && !r.sinConexion) {
      try {
        const c = await almacen.contarCola(usuarioId);
        const l = await sesion.latido({ colaPendiente: c.pendientes + c.cuarentena, ultimaSincronizacion: ultimaSyncEn, modelo: Device.modelName ?? undefined });
        setActualizacionObligatoria(sesion.necesitaActualizar(l.version_minima));
        if (l.borrar_datos) { setUsuarioId(null); setVersion((v) => v + 1); }
      } catch { /* sin conexión: se intenta en la próxima */ }
    }
    return r;
  }, [motor, almacen, usuarioId, sesion, practica, refrescarCola, ultimaSyncEn]);

  // 17.3: sincronización automática al recuperar la señal y cada 5 minutos con la app abierta.
  useEffect(() => {
    if (!usuarioId) return;
    sincronizar();
    const sub = Network.addNetworkStateListener((s) => {
      const en = Boolean(s.isConnected && s.isInternetReachable !== false);
      setConectado(en);
      if (en) sincronizar();
    });
    const t = setInterval(sincronizar, 5 * 60_000);
    return () => { sub.remove(); clearInterval(t); };
  }, [usuarioId, sincronizar]);

  // 5.16 / 4.10: bloqueo con huella o rostro tras 2 minutos fuera de la app.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado !== "active") { enSegundoPlanDesde.current = Date.now(); return; }
      const desde = enSegundoPlanDesde.current;
      if (desde && usuarioId && Date.now() - desde > param(params, "bloqueo_inactividad_min") * 60_000) setBloqueado(true);
      enSegundoPlanDesde.current = null;
    });
    return () => sub.remove();
  }, [usuarioId, params]);

  const desbloquear = useCallback(async () => {
    const tiene = await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync();
    if (!tiene) { setBloqueado(false); return; }
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Confirme que es usted", cancelLabel: "Cancelar" });
    if (r.success) setBloqueado(false);
  }, []);

  const cambiarPractica = useCallback(async (activar: boolean) => {
    await SecureStore.setItemAsync(CLAVE_PRACTICA, activar ? "1" : "0");
    setListo(false);
    setPractica(activar);
    const a = await AlmacenSqlite.abrir(activar ? "practica" : "pijao");
    setAlmacen(a);
    setParams(((await a.getMeta<Params>("params")) ?? {}) as Params);
    setVersion((v) => v + 1);
    setListo(true);
  }, []);

  const valor = useMemo<ContextoApp | null>(() => (almacen && sesion ? {
    listo, practica, usuarioId, perfil: perfilDatos ? new Perfil(perfilDatos) : null, params, almacen, sesion, conectado, bloqueado,
    telefonoModificado, actualizacionObligatoria, cola, ultimaSync, ultimaSyncEn, version, sincronizar, recargarPerfil,
    cambiarPractica, desbloquear, avisarCambio: () => { refrescarCola(); setVersion((v) => v + 1); },
    urlFoto: async (ruta: string) => (conectado && remoto.urlFoto ? remoto.urlFoto(ruta) : null),
  } : null), [remoto, listo, practica, usuarioId, perfilDatos, params, almacen, sesion, conectado, bloqueado, telefonoModificado,
    actualizacionObligatoria, cola, ultimaSync, ultimaSyncEn, version, sincronizar, recargarPerfil, cambiarPractica, desbloquear, refrescarCola]);

  if (!valor) return null;
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
