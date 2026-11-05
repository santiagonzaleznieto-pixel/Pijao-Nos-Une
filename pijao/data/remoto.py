"""Cliente mínimo de Supabase hablando directo con su API HTTP (Auth, PostgREST y Storage).

Se usa `requests` en vez del paquete oficial para que la app Android sea ligera y compile fácil.
"""
from __future__ import annotations

import time
from typing import Any, Callable
from urllib.parse import quote

import requests


class ErrorRemoto(Exception):
    def __init__(self, status: int, mensaje: str, cuerpo: Any = None):
        super().__init__(f"[{status}] {mensaje}")
        self.status = status
        self.mensaje = mensaje
        self.cuerpo = cuerpo


class SinConexion(Exception):
    """No hay internet o el servidor no respondió a tiempo."""


def _mensaje_de(cuerpo: Any, defecto: str) -> str:
    if isinstance(cuerpo, dict):
        for k in ("mensaje", "message", "msg", "error_description", "hint", "error", "details"):
            v = cuerpo.get(k)
            if v:
                return str(v)
    return defecto


class Remoto:
    def __init__(self, url: str, anon_key: str, http=None, al_cambiar_tokens: Callable[[dict], None] | None = None,
                 timeout: int = 20):
        self.url = url.rstrip("/")
        self.anon = anon_key
        self.http = http or requests.Session()
        self.timeout = timeout
        self.access_token: str | None = None
        self.refresh_token: str | None = None
        self.expira_en: float = 0.0
        self.usuario_id: str | None = None
        self.al_cambiar_tokens = al_cambiar_tokens

    # ---------------------------------------------------------------- sesión
    def cargar_tokens(self, access: str | None, refresh: str | None, expira_en: float = 0.0, usuario_id: str | None = None) -> None:
        self.access_token, self.refresh_token, self.expira_en, self.usuario_id = access, refresh, expira_en, usuario_id

    def _guardar_sesion(self, d: dict) -> dict:
        if d.get("access_token"):
            self.access_token = d["access_token"]
            self.refresh_token = d.get("refresh_token", self.refresh_token)
            self.expira_en = time.time() + int(d.get("expires_in", 3600)) - 30
            u = d.get("user") or {}
            self.usuario_id = u.get("id", self.usuario_id)
            if self.al_cambiar_tokens:
                self.al_cambiar_tokens({"access_token": self.access_token, "refresh_token": self.refresh_token,
                                        "expira_en": self.expira_en, "usuario_id": self.usuario_id})
        return d

    @property
    def tiene_sesion(self) -> bool:
        return bool(self.refresh_token or self.access_token)

    # ---------------------------------------------------------------- HTTP
    def _cabeceras(self, auth: bool = True, extra: dict | None = None) -> dict:
        h = {"apikey": self.anon, "Content-Type": "application/json"}
        h["Authorization"] = f"Bearer {self.access_token if (auth and self.access_token) else self.anon}"
        if extra:
            h.update(extra)
        return h

    def _pedir(self, metodo: str, ruta: str, *, json=None, params=None, data=None, headers=None,
               auth: bool = True, reintentar: bool = True, crudo: bool = False):
        if auth and self.refresh_token and self.expira_en and time.time() >= self.expira_en and ruta != "/auth/v1/token":
            self.renovar()
        cab = self._cabeceras(auth, headers)
        try:
            r = self.http.request(metodo, self.url + ruta, json=json, params=params, data=data, headers=cab, timeout=self.timeout)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            raise SinConexion(str(e)) from e
        except requests.exceptions.RequestException as e:
            raise SinConexion(str(e)) from e
        if r.status_code == 401 and auth and reintentar and self.refresh_token and ruta != "/auth/v1/token":
            self.renovar()
            return self._pedir(metodo, ruta, json=json, params=params, data=data, headers=headers, auth=auth,
                               reintentar=False, crudo=crudo)
        if r.status_code >= 400:
            try:
                cuerpo = r.json()
            except ValueError:
                cuerpo = r.text
            raise ErrorRemoto(r.status_code, _mensaje_de(cuerpo, f"Error {r.status_code}"), cuerpo)
        if crudo:
            return r
        if not r.content:
            return None
        try:
            return r.json()
        except ValueError:
            return r.text

    # ---------------------------------------------------------------- autenticación
    def iniciar_sesion(self, correo: str, contrasena: str) -> dict:
        d = self._pedir("POST", "/auth/v1/token", params={"grant_type": "password"},
                        json={"email": correo.strip(), "password": contrasena}, auth=False)
        return self._guardar_sesion(d)

    def registrar(self, correo: str, contrasena: str, datos: dict) -> dict:
        d = self._pedir("POST", "/auth/v1/signup", json={"email": correo.strip(), "password": contrasena, "data": datos}, auth=False)
        if isinstance(d, dict) and d.get("access_token"):
            self._guardar_sesion(d)
        return d

    def registrar_con_codigo(self, datos: dict) -> dict:
        """Crea la cuenta de una persona invitada con una función del servidor (no envía correo de confirmación)."""
        return self._pedir("POST", "/functions/v1/registrar-con-codigo", json=datos, auth=False)

    def renovar(self) -> dict:
        if not self.refresh_token:
            raise ErrorRemoto(401, "No hay sesión para renovar")
        d = self._pedir("POST", "/auth/v1/token", params={"grant_type": "refresh_token"},
                        json={"refresh_token": self.refresh_token}, auth=False)
        return self._guardar_sesion(d)

    def cerrar_sesion(self) -> None:
        try:
            self._pedir("POST", "/auth/v1/logout", reintentar=False)
        except (ErrorRemoto, SinConexion):
            pass
        self.cargar_tokens(None, None, 0.0, None)

    def cambiar_contrasena(self, nueva: str) -> dict:
        return self._pedir("PUT", "/auth/v1/user", json={"password": nueva})

    def recuperar_contrasena(self, correo: str) -> None:
        self._pedir("POST", "/auth/v1/recover", json={"email": correo.strip()}, auth=False)

    def usuario(self) -> dict:
        return self._pedir("GET", "/auth/v1/user")

    # ---------------------------------------------------------------- verificación en dos pasos (TOTP)
    def mfa_inscribir(self, nombre: str = "Pijao Nos Une") -> dict:
        return self._pedir("POST", "/auth/v1/factors", json={"factor_type": "totp", "friendly_name": nombre, "issuer": "Pijao Nos Une"})

    def mfa_desafiar(self, factor_id: str) -> dict:
        return self._pedir("POST", f"/auth/v1/factors/{factor_id}/challenge", json={})

    def mfa_verificar(self, factor_id: str, challenge_id: str, codigo: str) -> dict:
        d = self._pedir("POST", f"/auth/v1/factors/{factor_id}/verify", json={"challenge_id": challenge_id, "code": codigo.strip()})
        return self._guardar_sesion(d)

    def mfa_factores_verificados(self) -> list[dict]:
        u = self.usuario() or {}
        return [f for f in (u.get("factors") or []) if f.get("status") == "verified"]

    # ---------------------------------------------------------------- datos
    def seleccionar(self, tabla: str, params: dict | None = None) -> list[dict]:
        r = self._pedir("GET", f"/rest/v1/{quote(tabla)}", params=params or {"select": "*"})
        return r or []

    def rpc(self, funcion: str, args: dict | None = None):
        return self._pedir("POST", f"/rest/v1/rpc/{quote(funcion)}", json=args or {})

    # ---------------------------------------------------------------- almacenamiento
    def subir(self, bucket: str, ruta: str, datos: bytes, content_type: str = "image/jpeg") -> bool:
        """Sube un archivo. Si ya existe (reintento), se considera subido."""
        try:
            self._pedir("POST", f"/storage/v1/object/{bucket}/{quote(ruta)}", data=datos,
                        headers={"Content-Type": content_type, "x-upsert": "false"})
            return True
        except ErrorRemoto as e:
            texto = (str(e.cuerpo) + " " + e.mensaje).lower()
            if e.status in (400, 409) and ("duplicate" in texto or "already exists" in texto):
                return True
            raise

    def url_firmada(self, bucket: str, ruta: str, segundos: int = 600) -> str:
        d = self._pedir("POST", f"/storage/v1/object/sign/{bucket}/{quote(ruta)}", json={"expiresIn": segundos})
        firmada = (d or {}).get("signedURL") or (d or {}).get("signedUrl") or ""
        if firmada.startswith("http"):
            return firmada
        if not firmada.startswith("/storage"):
            firmada = "/storage/v1" + (firmada if firmada.startswith("/") else "/" + firmada)
        return self.url + firmada

    def descargar(self, bucket: str, ruta: str) -> bytes:
        r = self._pedir("GET", f"/storage/v1/object/authenticated/{bucket}/{quote(ruta)}", crudo=True)
        return r.content
