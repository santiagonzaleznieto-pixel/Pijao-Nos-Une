"""Base de datos local (SQLite) del teléfono. Es lo que permite trabajar sin internet (sección 17).

Guarda una copia de lo que el servidor deja ver a este usuario, una cola de envío con lo que se
registró sin conexión, las fotos pendientes de subir y los borradores de visita.
"""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from typing import Any, Callable, Iterable

from ..core import reglas


class LocalDB:
    def __init__(self, ruta: str = ":memory:"):
        self.ruta = ruta
        self._lock = threading.RLock()
        self._con = sqlite3.connect(ruta, check_same_thread=False)
        self._con.row_factory = sqlite3.Row
        self._crear()

    def cerrar(self) -> None:
        with self._lock:
            self._con.close()

    def _crear(self) -> None:
        with self._lock:
            self._con.executescript("""
            create table if not exists meta (k text primary key, v text);
            create table if not exists entidades (
              tabla text not null, id text not null, data text not null,
              actualizado_en text, eliminado integer not null default 0, pendiente integer not null default 0,
              primary key (tabla, id));
            create index if not exists ix_ent_tabla on entidades (tabla, eliminado);
            create table if not exists viviendas_idx (
              id text primary key, lat real not null, lng real not null, estado text, zona_id text,
              pendiente integer not null default 0);
            create index if not exists ix_viv_lat_lng on viviendas_idx (lat, lng);
            create table if not exists outbox (
              id text primary key, tipo text not null, payload text not null, estado text not null default 'pendiente',
              intentos integer not null default 0, error text, prioridad integer not null default 5,
              creado_en text not null, enviado_en text);
            create table if not exists subidas (
              id text primary key, outbox_id text, archivo text not null, ruta text not null,
              bucket text not null default 'fotos', estado text not null default 'pendiente',
              intentos integer not null default 0, error text, creado_en text not null);
            create table if not exists borradores (
              id text primary key, data text not null, actualizado_en text not null);
            """)
            self._con.commit()

    # ------------------------------------------------------------------ meta
    def get_meta(self, k: str, defecto: Any = None) -> Any:
        with self._lock:
            fila = self._con.execute("select v from meta where k = ?", (k,)).fetchone()
        if fila is None:
            return defecto
        try:
            return json.loads(fila["v"])
        except (TypeError, ValueError):
            return defecto

    def set_meta(self, k: str, valor: Any) -> None:
        with self._lock:
            self._con.execute("insert into meta (k, v) values (?, ?) on conflict(k) do update set v = excluded.v",
                              (k, json.dumps(valor)))
            self._con.commit()

    def borrar_meta(self, k: str) -> None:
        with self._lock:
            self._con.execute("delete from meta where k = ?", (k,))
            self._con.commit()

    # ------------------------------------------------------------------ entidades
    def upsert(self, tabla: str, datos: dict, *, id_clave: str = "id", actualizado_en: str | None = None,
               pendiente: bool = False) -> str:
        ident = str(datos[id_clave])
        eliminado = 1 if datos.get("eliminado_en") else 0
        with self._lock:
            self._con.execute(
                "insert into entidades (tabla, id, data, actualizado_en, eliminado, pendiente) values (?,?,?,?,?,?) "
                "on conflict(tabla, id) do update set data = excluded.data, actualizado_en = excluded.actualizado_en, "
                "eliminado = excluded.eliminado, pendiente = excluded.pendiente",
                (tabla, ident, json.dumps(datos, default=str), actualizado_en or datos.get("actualizado_en"),
                 eliminado, 1 if pendiente else 0))
            if tabla == "viviendas":
                if eliminado:
                    self._con.execute("delete from viviendas_idx where id = ?", (ident,))
                elif datos.get("lat") is not None and datos.get("lng") is not None:
                    self._con.execute(
                        "insert into viviendas_idx (id, lat, lng, estado, zona_id, pendiente) values (?,?,?,?,?,?) "
                        "on conflict(id) do update set lat=excluded.lat, lng=excluded.lng, estado=excluded.estado, "
                        "zona_id=excluded.zona_id, pendiente=excluded.pendiente",
                        (ident, datos["lat"], datos["lng"], datos.get("estado"), datos.get("zona_id"), 1 if pendiente else 0))
            self._con.commit()
        return ident

    def get(self, tabla: str, ident: str) -> dict | None:
        with self._lock:
            fila = self._con.execute("select data from entidades where tabla = ? and id = ?", (tabla, str(ident))).fetchone()
        return json.loads(fila["data"]) if fila else None

    def esta_pendiente(self, tabla: str, ident: str) -> bool:
        with self._lock:
            fila = self._con.execute("select pendiente from entidades where tabla = ? and id = ?", (tabla, str(ident))).fetchone()
        return bool(fila and fila["pendiente"])

    def marcar_enviado(self, tabla: str, ident: str, cambios: dict | None = None) -> None:
        datos = self.get(tabla, ident)
        if datos is None:
            return
        if cambios:
            datos.update(cambios)
        self.upsert(tabla, datos, actualizado_en=datos.get("actualizado_en"), pendiente=False)

    def listar(self, tabla: str, *, incluir_eliminados: bool = False,
               filtro: Callable[[dict], bool] | None = None) -> list[dict]:
        sql = "select data from entidades where tabla = ?"
        if not incluir_eliminados:
            sql += " and eliminado = 0"
        with self._lock:
            filas = self._con.execute(sql, (tabla,)).fetchall()
        datos = [json.loads(f["data"]) for f in filas]
        return [d for d in datos if filtro(d)] if filtro else datos

    def contar(self, tabla: str) -> int:
        with self._lock:
            return self._con.execute("select count(*) from entidades where tabla = ? and eliminado = 0", (tabla,)).fetchone()[0]

    def borrar(self, tabla: str, ident: str) -> None:
        with self._lock:
            self._con.execute("delete from entidades where tabla = ? and id = ?", (tabla, str(ident)))
            if tabla == "viviendas":
                self._con.execute("delete from viviendas_idx where id = ?", (str(ident),))
            self._con.commit()

    def viviendas_en_bbox(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float, limite: int = 5000) -> list[dict]:
        with self._lock:
            filas = self._con.execute(
                "select i.id, i.lat, i.lng, i.estado, i.zona_id, i.pendiente from viviendas_idx i "
                "where i.lat between ? and ? and i.lng between ? and ? limit ?",
                (min_lat, max_lat, min_lon, max_lon, limite)).fetchall()
        return [dict(f) for f in filas]

    def todas_las_viviendas_idx(self) -> list[dict]:
        with self._lock:
            return [dict(f) for f in self._con.execute("select id, lat, lng, estado, zona_id, pendiente from viviendas_idx").fetchall()]

    # ------------------------------------------------------------------ cola de envío
    def encolar(self, tipo: str, payload: dict, *, id: str | None = None, prioridad: int = 5) -> str:
        ident = id or str(uuid.uuid4())
        with self._lock:
            self._con.execute(
                "insert or ignore into outbox (id, tipo, payload, estado, prioridad, creado_en) values (?,?,?,?,?,?)",
                (ident, tipo, json.dumps(payload, default=str), "pendiente", prioridad, reglas.iso()))
            self._con.commit()
        return ident

    def outbox_siguientes(self, limite: int = 50) -> list[dict]:
        with self._lock:
            filas = self._con.execute(
                "select * from outbox where estado in ('pendiente','reintento') "
                "order by prioridad asc, creado_en asc limit ?", (limite,)).fetchall()
        return [dict(f) for f in filas]

    def outbox_obtener(self, ident: str) -> dict | None:
        with self._lock:
            f = self._con.execute("select * from outbox where id = ?", (ident,)).fetchone()
        return dict(f) if f else None

    def outbox_marcar(self, ident: str, estado: str, error: str | None = None, sumar_intento: bool = False) -> None:
        with self._lock:
            self._con.execute(
                "update outbox set estado = ?, error = ?, intentos = intentos + ?, "
                "enviado_en = case when ? = 'enviado' then ? else enviado_en end where id = ?",
                (estado, error, 1 if sumar_intento else 0, estado, reglas.iso(), ident))
            self._con.commit()

    def outbox_vaciar_payload(self, ident: str) -> None:
        """Una vez enviado, se borran los datos sensibles que viajaban en la cola."""
        with self._lock:
            self._con.execute("update outbox set payload = '{}' where id = ?", (ident,))
            self._con.commit()

    def outbox_reintentar_errores(self) -> int:
        with self._lock:
            cur = self._con.execute("update outbox set estado = 'pendiente', error = null where estado = 'error'")
            self._con.commit()
            return cur.rowcount

    def outbox_conteo(self) -> dict:
        with self._lock:
            filas = self._con.execute("select estado, count(*) n from outbox group by estado").fetchall()
        c = {f["estado"]: f["n"] for f in filas}
        c["por_enviar"] = c.get("pendiente", 0) + c.get("reintento", 0)
        return c

    def outbox_listar(self, estados: Iterable[str] | None = None, limite: int = 200) -> list[dict]:
        with self._lock:
            if estados:
                marcas = ",".join("?" for _ in estados)
                filas = self._con.execute(f"select * from outbox where estado in ({marcas}) order by creado_en desc limit ?",
                                          (*estados, limite)).fetchall()
            else:
                filas = self._con.execute("select * from outbox order by creado_en desc limit ?", (limite,)).fetchall()
        return [dict(f) for f in filas]

    # ------------------------------------------------------------------ subidas de fotos
    def subida_encolar(self, ident: str, archivo: str, ruta: str, *, outbox_id: str | None = None,
                       bucket: str = "fotos") -> None:
        with self._lock:
            self._con.execute(
                "insert or ignore into subidas (id, outbox_id, archivo, ruta, bucket, creado_en) values (?,?,?,?,?,?)",
                (ident, outbox_id, archivo, ruta, bucket, reglas.iso()))
            self._con.commit()

    def subidas_pendientes(self, limite: int = 20) -> list[dict]:
        with self._lock:
            filas = self._con.execute(
                "select * from subidas where estado in ('pendiente','reintento') order by creado_en asc limit ?", (limite,)).fetchall()
        return [dict(f) for f in filas]

    def subida_marcar(self, ident: str, estado: str, error: str | None = None, sumar_intento: bool = False) -> None:
        with self._lock:
            self._con.execute("update subidas set estado = ?, error = ?, intentos = intentos + ? where id = ?",
                              (estado, error, 1 if sumar_intento else 0, ident))
            self._con.commit()

    def subidas_conteo(self) -> dict:
        with self._lock:
            filas = self._con.execute("select estado, count(*) n from subidas group by estado").fetchall()
        c = {f["estado"]: f["n"] for f in filas}
        c["por_subir"] = c.get("pendiente", 0) + c.get("reintento", 0)
        return c

    # ------------------------------------------------------------------ borradores
    def guardar_borrador(self, draft: dict) -> None:
        with self._lock:
            self._con.execute(
                "insert into borradores (id, data, actualizado_en) values (?,?,?) "
                "on conflict(id) do update set data = excluded.data, actualizado_en = excluded.actualizado_en",
                (draft["id"], json.dumps(draft, default=str), reglas.iso()))
            self._con.commit()

    def obtener_borrador(self, ident: str) -> dict | None:
        with self._lock:
            f = self._con.execute("select data from borradores where id = ?", (ident,)).fetchone()
        return json.loads(f["data"]) if f else None

    def listar_borradores(self) -> list[dict]:
        with self._lock:
            filas = self._con.execute("select data from borradores order by actualizado_en desc").fetchall()
        return [json.loads(f["data"]) for f in filas]

    def borrar_borrador(self, ident: str) -> None:
        with self._lock:
            self._con.execute("delete from borradores where id = ?", (ident,))
            self._con.commit()

    # ------------------------------------------------------------------ limpieza (cierre de sesión, baja, teléfono perdido)
    def borrar_datos_locales(self, conservar_cola: bool = True) -> None:
        with self._lock:
            self._con.execute("delete from entidades")
            self._con.execute("delete from viviendas_idx")
            self._con.execute("delete from borradores")
            self._con.execute("delete from meta where k like 'cursor:%' or k in ('perfil','params')")
            if not conservar_cola:
                self._con.execute("delete from outbox")
                self._con.execute("delete from subidas")
            self._con.commit()
