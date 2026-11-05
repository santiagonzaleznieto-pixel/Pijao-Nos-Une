import json
import os
import tempfile
import unittest

import requests

from pijao.core import consentimiento, payload
from pijao.data.localdb import LocalDB
from pijao.data.remoto import ErrorRemoto, Remoto, SinConexion
from pijao.data.sync import SyncEngine


class RespuestaFalsa:
    def __init__(self, status=200, cuerpo=None, texto=""):
        self.status_code = status
        self._cuerpo = cuerpo
        self.text = texto or (json.dumps(cuerpo) if cuerpo is not None else "")
        self.content = self.text.encode() if (cuerpo is not None or texto) else b""

    def json(self):
        if self._cuerpo is None:
            raise ValueError("sin json")
        return self._cuerpo


class HttpFalso:
    def __init__(self, respuestas):
        self.respuestas = list(respuestas)
        self.llamadas = []

    def request(self, metodo, url, **kw):
        self.llamadas.append((metodo, url, kw))
        r = self.respuestas.pop(0)
        if isinstance(r, Exception):
            raise r
        return r


class RemotoFalso:
    """Imita a Remoto para probar el motor de sincronización sin red."""

    def __init__(self):
        self.rpcs = []
        self.subidas = []
        self.tablas = {}
        self.fallo_rpc = None
        self.fallo_subida = None

    def rpc(self, nombre, args=None):
        if self.fallo_rpc:
            e = self.fallo_rpc
            if callable(e):
                e = e(nombre, args)
            if e:
                raise e
        self.rpcs.append((nombre, args))
        if nombre == "rpc_registrar_visita":
            return {"ok": True, "calidad": "verde"}
        return {"ok": True}

    def subir(self, bucket, ruta, datos, tipo="image/jpeg"):
        if self.fallo_subida:
            raise self.fallo_subida
        self.subidas.append((bucket, ruta, len(datos)))
        return True

    def seleccionar(self, tabla, params=None):
        filas = list(self.tablas.get(tabla, []))
        params = params or {}
        orden = params.get("order", "")
        clave = orden.split(",")[1].split(".")[0] if "," in orden else "id"
        filas.sort(key=lambda f: (f.get("actualizado_en", ""), str(f[clave])))
        if "or" in params:
            t = params["or"].split("actualizado_en.gt.")[1].split(",")[0]
            i = params["or"].split(f"{clave}.gt.")[1].rstrip(")")
            filas = [f for f in filas if (f["actualizado_en"], str(f[clave])) > (t, i)]
        return filas[: int(params.get("limit", 1000))]


def borrador_con_foto(ruta_foto):
    b = payload.borrador_vacio("u1", lat=4.3333, lng=-75.7, precision_m=8)
    b["vivienda"].update({"direccion": "Vereda X", "barrio_vereda": "X"})
    b["visita"].update({"resultado": "conversacion_completa", "autorizacion_verbal": True})
    b["hogar"] = {"total_personas": 2, "edades": {"25-34": 2}, "sosten_relacion": "jefe"}
    b["personas"] = [{"id": "p1", "primer_nombre": "Rosa", "primer_apellido": "Gómez", "cedula": "1094123456",
                      "mayor_edad_confirmada": True}]
    b["consentimientos"] = [consentimiento.nuevo_consentimiento("datos_personales", "verbal", persona_id="p1")]
    b["fotos"] = [{"tipo": "fachada", "archivo_local": ruta_foto}]
    return b


class TestLocalDB(unittest.TestCase):
    def setUp(self):
        self.db = LocalDB(":memory:")

    def test_upsert_listar_y_eliminados(self):
        self.db.upsert("zonas", {"id": "z1", "nombre": "Centro"})
        self.db.upsert("zonas", {"id": "z2", "nombre": "Vereda", "eliminado_en": "2026-01-01T00:00:00Z"})
        self.assertEqual([z["id"] for z in self.db.listar("zonas")], ["z1"])
        self.assertEqual(len(self.db.listar("zonas", incluir_eliminados=True)), 2)
        self.assertEqual(self.db.get("zonas", "z1")["nombre"], "Centro")

    def test_indice_de_viviendas_y_bbox(self):
        self.db.upsert("viviendas", {"id": "v1", "lat": 4.3333, "lng": -75.7, "estado": "por_visitar"})
        self.db.upsert("viviendas", {"id": "v2", "lat": 5.0, "lng": -75.0, "estado": "por_visitar"})
        cerca = self.db.viviendas_en_bbox(4.33, -75.71, 4.34, -75.69)
        self.assertEqual([v["id"] for v in cerca], ["v1"])
        self.db.upsert("viviendas", {"id": "v1", "lat": 4.3333, "lng": -75.7, "eliminado_en": "2026-01-01T00:00:00Z"})
        self.assertEqual(self.db.viviendas_en_bbox(4.33, -75.71, 4.34, -75.69), [])

    def test_meta_y_borradores(self):
        self.db.set_meta("x", {"a": 1})
        self.assertEqual(self.db.get_meta("x"), {"a": 1})
        self.assertIsNone(self.db.get_meta("no"))
        self.db.guardar_borrador({"id": "b1", "paso": 3})
        self.assertEqual(self.db.obtener_borrador("b1")["paso"], 3)
        self.assertEqual(len(self.db.listar_borradores()), 1)
        self.db.borrar_borrador("b1")
        self.assertEqual(self.db.listar_borradores(), [])

    def test_cola_prioridad_y_conteo(self):
        self.db.encolar("a", {}, id="1", prioridad=5)
        self.db.encolar("sos", {}, id="2", prioridad=0)
        self.assertEqual([i["id"] for i in self.db.outbox_siguientes()], ["2", "1"])
        self.assertEqual(self.db.outbox_conteo()["por_enviar"], 2)
        self.db.outbox_marcar("1", "error", "mal")
        self.assertEqual(self.db.outbox_reintentar_errores(), 1)

    def test_borrar_datos_locales_conserva_la_cola(self):
        self.db.upsert("zonas", {"id": "z1"})
        self.db.encolar("a", {"x": 1}, id="9")
        self.db.borrar_datos_locales(conservar_cola=True)
        self.assertEqual(self.db.listar("zonas"), [])
        self.assertEqual(len(self.db.outbox_siguientes()), 1)
        self.db.borrar_datos_locales(conservar_cola=False)
        self.assertEqual(self.db.outbox_siguientes(), [])


class TestSync(unittest.TestCase):
    def setUp(self):
        self.db = LocalDB(":memory:")
        self.remoto = RemotoFalso()
        self.eventos = []
        self.sync = SyncEngine(self.db, self.remoto, lambda n, d: self.eventos.append(n))
        self.tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
        self.tmp.write(b"\xff\xd8fakejpeg"); self.tmp.close()

    def tearDown(self):
        os.unlink(self.tmp.name)

    def encolar_visita(self):
        b = borrador_con_foto(self.tmp.name)
        p, subidas = payload.construir_payload(b, {"lat": 4.3333, "lng": -75.7, "precision_m": 8})
        self.db.upsert("viviendas", {"id": p["vivienda"]["id"], "lat": 4.3333, "lng": -75.7}, pendiente=True)
        self.db.upsert("visitas", {"id": p["visita"]["id"], "vivienda_id": p["vivienda"]["id"]}, pendiente=True)
        oid = self.db.encolar("registrar_visita", p, id=p["visita"]["id"])
        for s in subidas:
            self.db.subida_encolar(s["foto_id"], s["archivo_local"], s["storage_path"], outbox_id=oid)
        return p, oid

    def test_push_exitoso_limpia_datos_sensibles(self):
        p, oid = self.encolar_visita()
        r = self.sync.push()
        self.assertEqual(r["enviados"], 1)
        fila = self.db.outbox_obtener(oid)
        self.assertEqual(fila["estado"], "enviado")
        self.assertEqual(fila["payload"], "{}")
        self.assertNotIn("1094123456", fila["payload"])
        self.assertFalse(self.db.esta_pendiente("viviendas", p["vivienda"]["id"]))
        self.assertEqual(self.db.get("visitas", p["visita"]["id"])["calidad"], "verde")

    def test_reconocimiento_y_edicion_de_visita(self):
        viv = {"id": "v-rec", "lat": 4.33, "lng": -75.7, "tipo_vivienda": "casa_urbana"}
        self.db.upsert("viviendas", viv, pendiente=True)
        self.db.encolar("reconocimiento", {"vivienda": viv, "fotos": []}, id="v-rec")
        self.db.encolar("editar_visita", {"id": "vis-1", "cambios": {"notas": "Volver en la tarde"}}, id="ed-1")
        r = self.sync.push()
        self.assertEqual(r["enviados"], 2)
        nombres = [n for n, _ in self.remoto.rpcs]
        self.assertIn("rpc_registrar_reconocimiento", nombres)
        enviada = dict(self.remoto.rpcs)["rpc_editar_visita"]
        self.assertEqual(enviada, {"p_id": "vis-1", "p": {"notas": "Volver en la tarde"}})
        self.assertFalse(self.db.esta_pendiente("viviendas", "v-rec"))

    def test_sin_conexion_deja_todo_en_cola(self):
        _, oid = self.encolar_visita()
        self.remoto.fallo_rpc = SinConexion("sin red")
        r = self.sync.push()
        self.assertTrue(r["detenido"])
        self.assertEqual(self.db.outbox_obtener(oid)["estado"], "pendiente")
        self.assertEqual(self.db.outbox_conteo()["por_enviar"], 1)

    def test_error_de_regla_no_bloquea_los_demas(self):
        self.db.encolar("incidente", {"id": "i1", "tipo": "otro", "descripcion": "x"}, id="a")
        self.db.encolar("sos", {"lat": 4.3, "lng": -75.7}, id="b", prioridad=0)

        def fallo(nombre, args):
            return ErrorRemoto(400, "R-15: falta la autorización") if nombre == "rpc_incidente" else None
        self.remoto.fallo_rpc = fallo
        r = self.sync.push()
        self.assertEqual((r["enviados"], r["errores"]), (1, 1))
        self.assertEqual(self.db.outbox_obtener("a")["estado"], "error")
        self.assertIn("R-15", self.db.outbox_obtener("a")["error"])
        self.assertEqual(self.db.outbox_obtener("b")["estado"], "enviado")

    def test_error_de_servidor_se_reintenta_y_401_marca_sesion(self):
        self.db.encolar("sos", {"lat": 1, "lng": 2}, id="x")
        self.remoto.fallo_rpc = ErrorRemoto(503, "caído")
        r = self.sync.push()
        self.assertTrue(r["detenido"])
        self.assertEqual(self.db.outbox_obtener("x")["estado"], "reintento")
        self.remoto.fallo_rpc = ErrorRemoto(401, "jwt expired")
        self.sync.push()
        self.assertTrue(self.sync.sesion_expirada)
        self.assertIn("sesion_expirada", self.eventos)

    def test_foto_espera_a_que_el_registro_este_en_el_servidor(self):
        p, oid = self.encolar_visita()
        self.assertEqual(self.sync.push_fotos()["subidas"], 0)       # la visita aún no se envió
        self.sync.push()
        r = self.sync.push_fotos()
        self.assertEqual(r["subidas"], 1)
        self.assertTrue(self.remoto.subidas[0][1].startswith("viviendas/"))
        self.assertIn("rpc_foto_subida", [n for n, _ in self.remoto.rpcs])
        self.assertEqual(self.db.subidas_conteo().get("subida"), 1)

    def test_foto_con_archivo_borrado_queda_en_error(self):
        _, oid = self.encolar_visita()
        self.sync.push()
        os.unlink(self.tmp.name)
        r = self.sync.push_fotos()
        self.assertEqual(r["errores"], 1)
        open(self.tmp.name, "wb").close()

    def test_pull_con_cursor_y_pendientes(self):
        self.remoto.tablas["viviendas"] = [
            {"id": "v1", "lat": 4.33, "lng": -75.7, "estado": "por_visitar", "actualizado_en": "2026-10-14T10:00:00+00:00"},
            {"id": "v2", "lat": 4.34, "lng": -75.7, "estado": "por_visitar", "actualizado_en": "2026-10-14T11:00:00+00:00"},
            {"id": "v3", "lat": 4.35, "lng": -75.7, "estado": "por_visitar", "actualizado_en": "2026-10-14T11:00:00+00:00",
             "eliminado_en": "2026-10-14T11:00:00+00:00"},
        ]
        self.remoto.tablas["configuracion"] = [{"clave": "radio_duplicados_m", "valor": 15, "actualizado_en": "2026-10-01T00:00:00+00:00"}]
        self.db.upsert("viviendas", {"id": "v1", "lat": 4.33, "lng": -75.7, "estado": "visitada_conversacion"}, pendiente=True)
        n = self.sync.pull()
        self.assertGreaterEqual(n, 4)
        self.assertEqual(self.db.get("viviendas", "v1")["estado"], "visitada_conversacion")   # lo pendiente manda
        self.assertIsNotNone(self.db.get("viviendas", "v2"))
        self.assertEqual([v["id"] for v in self.db.listar("viviendas")], ["v1", "v2"])           # v3 eliminada
        self.assertEqual(self.db.get_meta("params")["radio_duplicados_m"], 15)
        self.assertEqual(self.sync.pull(), 0)                                                    # el cursor evita repetir

    def test_sincronizar_completo(self):
        self.encolar_visita()
        r = self.sync.sincronizar()
        self.assertEqual(r["push"]["enviados"], 1)
        self.assertEqual(r["fotos"]["subidas"], 1)
        self.assertFalse(r["sin_conexion"])
        self.assertIn("sincronizado", self.eventos)


class TestRemoto(unittest.TestCase):
    def test_inicio_de_sesion_guarda_tokens(self):
        http = HttpFalso([RespuestaFalsa(200, {"access_token": "A", "refresh_token": "R", "expires_in": 3600, "user": {"id": "u1"}})])
        guardado = {}
        r = Remoto("https://x.supabase.co/", "anon", http, guardado.update)
        r.iniciar_sesion("a@b.co", "clave")
        self.assertEqual((r.access_token, r.refresh_token, r.usuario_id), ("A", "R", "u1"))
        self.assertEqual(guardado["refresh_token"], "R")
        metodo, url, kw = http.llamadas[0]
        self.assertEqual(url, "https://x.supabase.co/auth/v1/token")
        self.assertEqual(kw["params"], {"grant_type": "password"})

    def test_renueva_el_token_ante_un_401(self):
        http = HttpFalso([
            RespuestaFalsa(401, {"message": "JWT expired"}),
            RespuestaFalsa(200, {"access_token": "A2", "refresh_token": "R2", "expires_in": 3600}),
            RespuestaFalsa(200, [{"id": 1}]),
        ])
        r = Remoto("https://x.supabase.co", "anon", http)
        r.cargar_tokens("A1", "R1", 0.0, "u1")
        self.assertEqual(r.seleccionar("zonas"), [{"id": 1}])
        self.assertEqual(r.access_token, "A2")

    def test_errores(self):
        r = Remoto("https://x.supabase.co", "anon", HttpFalso([requests.exceptions.ConnectionError("no hay red")]))
        with self.assertRaises(SinConexion):
            r.seleccionar("zonas")
        r = Remoto("https://x.supabase.co", "anon", HttpFalso([RespuestaFalsa(400, {"message": "R-09: muy lejos"})]))
        with self.assertRaises(ErrorRemoto) as cm:
            r.rpc("rpc_registrar_visita", {"p": {}})
        self.assertEqual(cm.exception.status, 400)
        self.assertIn("R-09", cm.exception.mensaje)

    def test_subida_duplicada_cuenta_como_exito(self):
        http = HttpFalso([RespuestaFalsa(400, {"statusCode": "409", "error": "Duplicate", "message": "The resource already exists"})])
        r = Remoto("https://x.supabase.co", "anon", http)
        self.assertTrue(r.subir("fotos", "viviendas/a/b.jpg", b"123"))

    def test_url_firmada(self):
        http = HttpFalso([RespuestaFalsa(200, {"signedURL": "/object/sign/fotos/a.jpg?token=T"})])
        r = Remoto("https://x.supabase.co", "anon", http)
        self.assertEqual(r.url_firmada("fotos", "a.jpg"), "https://x.supabase.co/storage/v1/object/sign/fotos/a.jpg?token=T")

    def test_rpc_con_cuerpo_vacio(self):
        r = Remoto("https://x.supabase.co", "anon", HttpFalso([RespuestaFalsa(204)]))
        self.assertIsNone(r.rpc("rpc_jornada_terminar"))


if __name__ == "__main__":
    unittest.main()
