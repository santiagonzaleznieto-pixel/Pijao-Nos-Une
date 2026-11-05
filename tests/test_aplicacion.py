import unittest

from pijao.data.localdb import LocalDB
from pijao.data.remoto import SinConexion
from pijao.servicios.aplicacion import Aplicacion


class RemotoFalso:
    def __init__(self, caido=False):
        self.caido = caido

    def iniciar_sesion(self, c, p):
        if self.caido:
            raise SinConexion()
        return {}

    def rpc(self, f, a=None):
        self.llamadas = getattr(self, "llamadas", []) + [(f, a)]
        if self.caido:
            raise SinConexion()
        if f == "rpc_invitar":
            return {"ok": True, "codigo": "ABC12345"}
        if f == "rpc_panel_campana":
            return {"viviendas_conocidas": 40, "viviendas_visitadas": 12, "hogares": 9, "personas_autorizadas": 20}
        return {"id": "u1", "nombre": "Ana", "rol": "admin", "estado": "activo", "permisos": []}

    def registrar_con_codigo(self, datos):
        self.registro = datos
        return {"ok": True}

    def cerrar_sesion(self):
        pass

    def seleccionar(self, t, p=None):
        if self.caido:
            raise SinConexion()
        if t == "permisos_opcionales":
            return [{"codigo": "O-03"}]
        return []


class TestAplicacion(unittest.TestCase):
    def setUp(self):
        self.app = Aplicacion(LocalDB(":memory:"), RemotoFalso())

    def test_login_guarda_perfil(self):
        p = self.app.iniciar_sesion("a@b.co", "x")
        self.assertEqual(p.nombre, "Ana")
        self.assertEqual(self.app.perfil_guardado().id, "u1")

    def test_login_vacio(self):
        with self.assertRaises(ValueError):
            self.app.iniciar_sesion("", "")

    def test_visita_sin_internet_queda_en_cola(self):
        self.app.iniciar_sesion("a@b.co", "x")
        d = self.app.nueva_visita(4.33, -75.7)
        self.assertEqual(len(self.app.errores_visita(d)), 1)
        d["visita"]["resultado"] = "nadie_en_casa"
        self.app.guardar_visita(d)
        self.assertEqual(self.app.estado_cola()["por_enviar"], 1)

    def test_visita_sin_internet_aparece_en_el_mapa(self):
        self.app.iniciar_sesion("a@b.co", "x")
        d = self.app.nueva_visita(4.33, -75.7)
        d["visita"]["resultado"] = "nadie_en_casa"
        self.app.guardar_visita(d)
        puntos = self.app.puntos_mapa()
        self.assertEqual(len(puntos), 1)
        self.assertEqual(puntos[0]["estado"], "visitada_sin_contacto")
        self.assertTrue(puntos[0]["pendiente"])
        self.assertEqual(len(self.app.cercanas(4.33, -75.7)), 1)

    def test_cerrar_sesion_borra_datos_pero_no_la_cola(self):
        self.app.iniciar_sesion("a@b.co", "x")
        d = self.app.nueva_visita(4.33, -75.7)
        d["visita"]["resultado"] = "nadie_en_casa"
        self.app.guardar_visita(d)
        self.app.cerrar_sesion(borrar_datos=True)
        self.assertEqual(self.app.puntos_mapa(), [])
        self.assertEqual(self.app.estado_cola()["por_enviar"], 1)

    def test_sesion_vencida_no_borra_datos(self):
        self.app.iniciar_sesion("a@b.co", "x")
        self.app.db.upsert("viviendas", {"id": "v1", "lat": 4.33, "lng": -75.7, "estado": "por_visitar"})
        self.app.cerrar_sesion()
        self.assertEqual(len(self.app.puntos_mapa()), 1)

    def test_otro_usuario_no_ve_la_copia_local_del_anterior(self):
        self.app.iniciar_sesion("a@b.co", "x")
        self.app.db.upsert("viviendas", {"id": "v1", "lat": 4.33, "lng": -75.7, "estado": "por_visitar"})
        self.app.cerrar_sesion()
        otro = {"id": "u2", "nombre": "Beto", "rol": "colaborador", "estado": "activo", "permisos": []}
        self.app.remoto.rpc = lambda f, a=None: otro
        self.app.iniciar_sesion("b@b.co", "y")
        self.assertEqual(self.app.puntos_mapa(), [])

    def test_visita_invalida(self):
        self.app.iniciar_sesion("a@b.co", "x")
        with self.assertRaises(ValueError):
            self.app.guardar_visita(self.app.nueva_visita(4.3, -75.7))

    def test_sin_conexion(self):
        self.app.remoto.caido = True
        self.assertTrue(self.app.sincronizar()["sin_conexion"])

    def test_invitar_y_permiso(self):
        self.app.iniciar_sesion("a@b.co", "x")
        self.assertTrue(self.app.puede_gestionar_equipo)
        r = self.app.invitar(" Luis ", "", "", "director")
        self.assertEqual(r["codigo"], "ABC12345")
        self.assertEqual(self.app.remoto.llamadas[-1][1], {"p_nombre": "Luis", "p_celular": None, "p_correo": None, "p_rol": "director"})

    def test_registro_con_codigo(self):
        self.assertIn("12", self.app.errores_registro({"codigo": "x", "nombre": "A", "correo": "a@b.co", "clave": "corta", "mayor": True}))
        self.app.registrar_con_codigo("Ana", "300", "a@b.co", "clave-larga-123", " ab12 ", True, False, "voluntario")
        self.assertEqual(self.app.remoto.registro["codigo"], "AB12")
        with self.assertRaises(ValueError):
            self.app.registrar_con_codigo("Ana", "", "a@b.co", "clave-larga-123", "AB12", False, False, "voluntario")

    def test_estadisticas_con_y_sin_internet(self):
        self.app.iniciar_sesion("a@b.co", "x")
        self.assertTrue(self.app.estadisticas()["en_linea"])
        self.assertEqual(self.app.estadisticas_locales()["casas"], 40)
        self.app.remoto.caido = True
        d = self.app.estadisticas()
        self.assertFalse(d["en_linea"])
        self.assertEqual(d["visitadas"], 12)

    def test_calidad_estimada(self):
        d = {"vivienda": {}, "visita": {"resultado": "nadie_en_casa"}, "personas": [], "consentimientos": []}
        self.assertEqual(Aplicacion.calidad_estimada(d)[0], "rojo")            # falta la foto de fachada
        d["visita"]["no_autorizo_foto"] = True
        self.assertEqual(Aplicacion.calidad_estimada(d)[0], "verde")
        d["visita"]["resultado"] = "conversacion_completa"
        self.assertEqual(Aplicacion.calidad_estimada(d)[0], "rojo")            # falta la autorización verbal
        d["visita"]["autorizacion_verbal"] = True
        d["hogar"] = {"total_personas": 2}
        self.assertEqual(Aplicacion.calidad_estimada(d)[0], "amarillo")        # falta el principal sostén
        d["hogar"]["sosten_relacion"] = "jefe_jefa"
        self.assertEqual(Aplicacion.calidad_estimada(d)[0], "verde")
        d["personas"] = [{"id": "p1"}]
        self.assertEqual(Aplicacion.calidad_estimada(d)[0], "rojo")            # persona sin autorización de datos

    def test_permisos_solo_las_diferencias(self):
        self.app.iniciar_sesion("a@b.co", "x")
        n = self.app.guardar_permisos("u3", {"O-01"}, 30)
        self.assertEqual(n, 2)
        cambios = {(a["p_codigo"], a["p_activo"]) for f, a in self.app.remoto.llamadas if f == "rpc_set_permiso"}
        self.assertEqual(cambios, {("O-01", True), ("O-03", False)})
        with self.assertRaises(ValueError):
            self.app.aplicar_plantilla("u3", "no existe")

    def test_tarea_y_anuncio_exigen_titulo(self):
        self.app.iniciar_sesion("a@b.co", "x")
        with self.assertRaises(ValueError):
            self.app.crear_tarea("  ", "", "visitar", "normal", None, None)
        with self.assertRaises(ValueError):
            self.app.crear_anuncio("Aviso", " ", "normal")
        self.app.crear_tarea("Visitar", "", "visitar", "alta", "u3", "2026-11-05")
        self.assertEqual(self.app.remoto.llamadas[-1][1]["p"]["asignado_a"], "u3")


if __name__ == "__main__":
    unittest.main()
