import unittest
from datetime import date, datetime, timedelta, timezone

from pijao.core import calidad, catalogos, consentimiento, enmascarado, estadisticas, geo, payload, reglas, validadores
from pijao.core.permisos import PERMISOS, PLANTILLAS, Perfil


class TestGeo(unittest.TestCase):
    def test_haversine_100m(self):
        d = geo.haversine_m(4.3333, -75.7, 4.3342, -75.7)
        self.assertAlmostEqual(d, 100, delta=2)

    def test_bbox_contiene_punto_a_radio(self):
        a, b, c, d = geo.bbox_radio(4.33, -75.7, 50)
        self.assertLess(a, 4.33); self.assertGreater(c, 4.33)
        self.assertLess(b, -75.7); self.assertGreater(d, -75.7)

    def test_punto_en_poligono_y_huecos(self):
        cuadro = {"type": "Polygon", "coordinates": [[[-75.71, 4.33], [-75.69, 4.33], [-75.69, 4.35], [-75.71, 4.35], [-75.71, 4.33]]]}
        self.assertTrue(geo.punto_en_poligono(4.34, -75.70, cuadro))
        self.assertFalse(geo.punto_en_poligono(4.40, -75.70, cuadro))
        con_hueco = {"type": "Polygon", "coordinates": cuadro["coordinates"] + [[[-75.705, 4.338], [-75.695, 4.338], [-75.695, 4.342], [-75.705, 4.342], [-75.705, 4.338]]]}
        self.assertFalse(geo.punto_en_poligono(4.34, -75.70, con_hueco))
        multi = {"type": "MultiPolygon", "coordinates": [cuadro["coordinates"]]}
        self.assertTrue(geo.punto_en_poligono(4.34, -75.70, multi))

    def test_zona_de_punto(self):
        zonas = [{"nombre": "A", "poligono": {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]}}]
        self.assertEqual(geo.zona_de_punto(0.5, 0.5, zonas)["nombre"], "A")
        self.assertIsNone(geo.zona_de_punto(2, 2, zonas))

    def test_ida_y_vuelta_de_pixeles(self):
        for z in (5, 12, 17):
            x, y = geo.lonlat_a_px(4.3333, -75.7, z)
            lat, lon = geo.px_a_lonlat(x, y, z)
            self.assertAlmostEqual(lat, 4.3333, places=5)
            self.assertAlmostEqual(lon, -75.7, places=5)

    def test_mosaicos(self):
        tx, ty = geo.mosaico_de_punto(0.0, 0.0, 1)
        self.assertEqual((tx, ty), (1, 1))
        lista = geo.mosaicos_en_bbox(4.32, -75.72, 4.34, -75.69, 15)
        self.assertGreaterEqual(len(lista), 1)
        self.assertTrue(all(t[0] == 15 for t in lista))

    def test_agrupar(self):
        pts = [{"lat": 4.3333, "lng": -75.7}, {"lat": 4.33331, "lng": -75.70001}, {"lat": 4.4, "lng": -75.6}]
        g = geo.agrupar(pts, 14)
        self.assertEqual(sorted(x["n"] for x in g), [1, 2])

    def test_cercanos_ordenados(self):
        pts = [{"id": 1, "lat": 4.33337, "lng": -75.7}, {"id": 2, "lat": 4.33332, "lng": -75.7}, {"id": 3, "lat": 4.5, "lng": -75.7}]
        c = geo.cercanos(pts, 4.3333, -75.7, 15)
        self.assertEqual([p["id"] for p, _ in c], [2, 1])


class TestValidadores(unittest.TestCase):
    def test_celular(self):
        self.assertEqual(validadores.normalizar_celular("+57 310 123 4567"), "3101234567")
        self.assertIsNone(validadores.normalizar_celular("2101234567"))
        self.assertEqual(validadores.normalizar_telefono("7451234"), "7451234")

    def test_cedula(self):
        self.assertTrue(validadores.validar_cedula("1094123456")[0])
        self.assertFalse(validadores.validar_cedula("12345")[0])
        self.assertFalse(validadores.validar_cedula("12A456")[0])
        self.assertFalse(validadores.validar_cedula("1111111111")[0])

    def test_fecha_y_edad(self):
        hoy = date(2026, 10, 14)
        self.assertEqual(validadores.edad("2000-10-15", hoy), 25)
        self.assertEqual(validadores.edad("14/10/2000", hoy), 26)
        self.assertTrue(validadores.validar_fecha_nacimiento("1990-01-01", hoy)[0])
        self.assertFalse(validadores.validar_fecha_nacimiento("2010-01-01", hoy)[0])
        self.assertFalse(validadores.validar_fecha_nacimiento("1900-01-01", hoy)[0])
        self.assertFalse(validadores.validar_fecha_nacimiento("no es fecha", hoy)[0])

    def test_edades_suman_total(self):
        self.assertTrue(validadores.validar_edades(4, {"0-5": 1, "18-24": 1, "35-44": 2})[0])
        self.assertFalse(validadores.validar_edades(4, {"0-5": 1})[0])
        self.assertFalse(validadores.validar_edades(0, {})[0])
        self.assertFalse(validadores.validar_edades(1, {"99-100": 1})[0])
        self.assertEqual(validadores.contar_adultos({"0-5": 1, "18-24": 1, "65+": 2}), 3)

    def test_avisos_de_nota(self):
        self.assertTrue(validadores.avisos_de_nota("su cédula es 1094123456"))
        self.assertTrue(validadores.avisos_de_nota("está enfermo del corazón"))
        self.assertEqual(validadores.avisos_de_nota("Le preocupa la vía"), [])
        self.assertIn("regalo", validadores.palabras_sospechosas("quedó en dar un regalo"))
        self.assertEqual(validadores.palabras_sospechosas("hablamos de la vía"), [])

    def test_limpiar_vacios(self):
        self.assertEqual(validadores.limpiar_vacios({"a": "", "b": ["x", " "], "c": {"d": ""}}),
                         {"a": None, "b": ["x", None], "c": {"d": None}})


class TestReglas(unittest.TestCase):
    def test_distancias(self):
        self.assertTrue(reglas.puede_registrar_aqui(50))
        self.assertFalse(reglas.puede_registrar_aqui(50.1))
        self.assertTrue(reglas.gps_aceptable(20))
        self.assertFalse(reglas.gps_aceptable(21))
        self.assertFalse(reglas.gps_aceptable(None))
        self.assertEqual(reglas.clasificar_ubicacion_manual(100), "ok")
        self.assertEqual(reglas.clasificar_ubicacion_manual(101), "diferido")
        self.assertTrue(reglas.hay_duplicado(15))
        self.assertFalse(reglas.hay_duplicado(15.5))

    def test_parametros_configurables(self):
        self.assertFalse(reglas.puede_registrar_aqui(60, {"distancia_max_registro_m": 50}))
        self.assertTrue(reglas.puede_registrar_aqui(60, {"distancia_max_registro_m": 80}))

    def test_ventana_de_edicion_72h(self):
        ahora = datetime(2026, 10, 14, 12, tzinfo=timezone.utc)
        self.assertTrue(reglas.ventana_edicion_abierta("2026-10-11T13:00:00Z", ahora))
        self.assertFalse(reglas.ventana_edicion_abierta("2026-10-11T11:00:00Z", ahora))

    def test_estado_por_resultado(self):
        self.assertEqual(reglas.estado_vivienda_por_resultado("pidio_no_ser_visitado"), "no_contactar")
        self.assertEqual(reglas.estado_vivienda_por_resultado("conversacion_completa"), "visitada_conversacion")
        self.assertEqual(reglas.estado_vivienda_por_resultado("pidio_volver"), "requiere_seguimiento")

    def test_plazo_titulares_5_dias_habiles(self):
        viernes = "2026-10-16T12:00:00Z"
        self.assertEqual(reglas.plazo_titulares(viernes).date().isoformat(), "2026-10-23")

    def test_alerta_tope(self):
        self.assertIsNone(reglas.alerta_tope(69))
        self.assertEqual(reglas.alerta_tope(70), 70)
        self.assertEqual(reglas.alerta_tope(96), 95)
        self.assertEqual(reglas.alerta_tope(120), 100)

    def test_dentro_del_municipio(self):
        self.assertTrue(reglas.dentro_del_municipio(4.3333, -75.7))
        self.assertFalse(reglas.dentro_del_municipio(6.2, -75.6))


class TestPermisos(unittest.TestCase):
    def colab(self, **kw):
        base = dict(id="u1", nombre="Marta", rol="colaborador", estado="activo")
        base.update(kw)
        return Perfil(**base)

    def test_hay_22_permisos_y_riesgos(self):
        self.assertEqual(len(PERMISOS), 22)
        self.assertTrue(PERMISOS["O-01"].requiere_2fa)
        self.assertFalse(PERMISOS["O-09"].requiere_2fa)

    def test_colaborador_base_no_tiene_extras(self):
        self.assertFalse(self.colab().tiene("O-03"))

    def test_permiso_con_alcance_por_zona(self):
        p = self.colab(permisos={"O-03": {"zonas": ["z1"], "vence_en": None}})
        self.assertTrue(p.tiene("O-03", "z1"))
        self.assertFalse(p.tiene("O-03", "z2"))
        self.assertFalse(p.tiene("O-03"))

    def test_permiso_vencido(self):
        p = self.colab(permisos={"O-09": {"zonas": None, "vence_en": "2020-01-01T00:00:00Z"}})
        self.assertFalse(p.tiene("O-09"))

    def test_riesgo_alto_exige_2fa(self):
        p = self.colab(permisos={"O-01": {"zonas": None, "vence_en": None}})
        self.assertFalse(p.tiene("O-01"))
        p.aal = "aal2"
        self.assertTrue(p.tiene("O-01"))

    def test_staff_y_cuenta_suspendida(self):
        self.assertTrue(Perfil(rol="director", estado="activo").tiene("O-12"))
        self.assertFalse(Perfil(rol="director", estado="suspendido").tiene("O-12"))
        self.assertTrue(Perfil(rol="admin", estado="activo").puede("designar_director"))
        self.assertFalse(Perfil(rol="director", estado="activo").puede("designar_director"))

    def test_desde_rpc_y_plantillas(self):
        p = Perfil.desde_rpc({"id": "x", "rol": "colaborador", "estado": "activo",
                              "permisos": [{"codigo": "O-09", "zonas": None, "vence_en": None}], "aal": "aal1"})
        self.assertTrue(p.tiene("O-09"))
        self.assertTrue(p.puede("crear_tareas"))
        self.assertIn("Líder de zona", PLANTILLAS)
        for plantilla in PLANTILLAS.values():
            for c in plantilla["permisos"]:
                self.assertIn(c, PERMISOS)

    def test_edicion_de_registros(self):
        ahora = datetime(2026, 10, 14, 12, tzinfo=timezone.utc)
        p = self.colab()
        self.assertTrue(reglas.puede_editar_registro(p, "u1", "2026-10-13T12:00:00Z", ahora=ahora))
        self.assertFalse(reglas.puede_editar_registro(p, "u1", "2026-10-01T12:00:00Z", ahora=ahora))
        self.assertFalse(reglas.puede_editar_registro(p, "otro", "2026-10-13T12:00:00Z", ahora=ahora))
        self.assertTrue(reglas.puede_editar_registro(Perfil(rol="director", estado="activo"), "otro", "2020-01-01T00:00:00Z", ahora=ahora))


class TestEnmascarado(unittest.TestCase):
    def test_mascaras(self):
        self.assertTrue(enmascarado.mascara_cedula("1094123456").endswith("456"))
        self.assertEqual(len(enmascarado.mascara_cedula("1094123456")), 10)
        self.assertTrue(enmascarado.mascara_telefono("3101234567").endswith("4567"))
        self.assertEqual(enmascarado.mascara_correo("marta@gmail.com"), "m\u2022\u2022\u2022@g\u2022\u2022\u2022.com")
        self.assertEqual(enmascarado.mascara_cedula(""), "")

    def test_vista_local_no_filtra_datos_completos(self):
        p = {"id": "p1", "primer_nombre": "Rosa", "segundo_nombre": "Elena", "primer_apellido": "Gómez",
             "cedula": "1094123456", "telefono": "3101234567", "correo": "rosa@mail.com"}
        v = enmascarado.vista_local_de_persona(p, 55)
        texto = str(v)
        self.assertNotIn("1094123456", texto)
        self.assertNotIn("3101234567", texto)
        self.assertNotIn("Elena", texto)
        self.assertEqual(v["nombre_visible"], "Rosa Gómez")
        self.assertEqual(v["cedula_ult3"], "456")

    def test_vista_para_pantalla(self):
        base = {"cedula_ult3": "456", "telefono_ult4": "4567", "edad_anios": 40}
        sin = enmascarado.vista_para_pantalla(base)
        self.assertTrue(sin["cedula_txt"].endswith("456"))
        self.assertEqual(sin["nacimiento_txt"], "40 años")
        con = enmascarado.vista_para_pantalla(base, {"cedula": "1094123456", "fecha_nacimiento": "1986-01-01"})
        self.assertEqual(con["cedula_txt"], "1094123456")
        self.assertEqual(con["nacimiento_txt"], "1986-01-01")


def borrador_ok():
    b = payload.borrador_vacio("u1", lat=4.3333, lng=-75.7, precision_m=8)
    b["vivienda"].update({"direccion": "Carrera 5 # 4-12", "barrio_vereda": "Centro", "tipo_vivienda": "casa_urbana"})
    b["visita"].update({"resultado": "conversacion_completa", "autorizacion_verbal": True})
    b["hogar"] = {"total_personas": 3, "edades": {"0-5": 1, "25-34": 2}, "sosten_relacion": "jefe"}
    b["personas"] = [{"id": "p1", "primer_nombre": "Rosa", "primer_apellido": "Gómez", "cedula": "1094123456",
                      "mayor_edad_confirmada": True, "es_sosten": True}]
    b["consentimientos"] = [consentimiento.nuevo_consentimiento("datos_personales", "verbal", persona_id="p1")]
    b["fotos"] = [{"tipo": "fachada", "archivo_local": "/tmp/f.jpg", "lat": 4.3333, "lng": -75.7}]
    return b


class TestCalidadYPayload(unittest.TestCase):
    def test_registro_verde(self):
        color, motivos = calidad.evaluar_registro(borrador_ok())
        self.assertEqual((color, motivos), ("verde", []))

    def test_sin_foto_es_rojo_pero_no_autorizo_foto_lo_permite(self):
        b = borrador_ok(); b["fotos"] = []
        self.assertEqual(calidad.evaluar_registro(b)[0], "rojo")
        b["visita"]["no_autorizo_foto"] = True
        self.assertEqual(calidad.evaluar_registro(b)[0], "verde")

    def test_sin_consentimiento_es_rojo(self):
        b = borrador_ok(); b["consentimientos"] = []
        color, motivos = calidad.evaluar_registro(b)
        self.assertEqual(color, "rojo")
        self.assertTrue(any("autorización" in m for m in motivos))

    def test_gps_debil_es_rojo(self):
        b = borrador_ok(); b["vivienda"]["precision_m"] = 45
        self.assertEqual(calidad.evaluar_registro(b)[0], "rojo")

    def test_sin_sosten_es_amarillo(self):
        b = borrador_ok(); b["hogar"].pop("sosten_relacion"); b["personas"][0]["es_sosten"] = False
        self.assertEqual(calidad.evaluar_registro(b)[0], "amarillo")

    def test_ritmo_y_salto(self):
        self.assertTrue(calidad.ritmo_sospechoso(["2026-10-14T10:00:00Z"], "2026-10-14T10:01:00Z"))
        self.assertFalse(calidad.ritmo_sospechoso(["2026-10-14T10:00:00Z"], "2026-10-14T10:05:00Z"))
        prev = {"fecha": "2026-10-14T10:00:00Z", "lat": 4.30, "lng": -75.70}
        nueva = {"fecha": "2026-10-14T10:02:00Z", "lat": 4.40, "lng": -75.70}
        self.assertTrue(calidad.salto_imposible(prev, nueva))
        cerca = {"fecha": "2026-10-14T10:02:00Z", "lat": 4.3002, "lng": -75.70}
        self.assertFalse(calidad.salto_imposible(prev, cerca))

    def test_payload_estructura_e_idempotencia(self):
        b = borrador_ok()
        p1, subidas = payload.construir_payload(b, {"lat": 4.3333, "lng": -75.7, "precision_m": 8})
        p2, _ = payload.construir_payload(b, {"lat": 4.3333, "lng": -75.7, "precision_m": 8})
        self.assertEqual(p1["visita"]["id"], b["id"])
        self.assertEqual(p1["visita"]["id"], p2["visita"]["id"])
        self.assertEqual(p1["hogar"]["sosten_persona_id"], "p1")
        self.assertEqual(p1["personas"][0]["cedula"], "1094123456")
        self.assertEqual(len(subidas), 1)
        self.assertTrue(subidas[0]["storage_path"].startswith("viviendas/"))
        self.assertEqual(p1["fotos"][0]["visita_id"], b["id"])
        self.assertNotIn("es_sosten", p1["personas"][0])

    def test_payload_vivienda_existente_solo_visita(self):
        existente = {"id": "v-1", "lat": 4.3, "lng": -75.7}
        b = payload.borrador_vacio("u1", existente)
        b["visita"]["resultado"] = "nadie_en_casa"
        p, _ = payload.construir_payload(b)
        self.assertEqual(p["vivienda"], {"id": "v-1", "solo_visita": True})

    def test_payload_sin_cadenas_vacias(self):
        b = borrador_ok(); b["vivienda"]["complemento"] = ""
        p, _ = payload.construir_payload(b)
        self.assertIsNone(p["vivienda"]["complemento"])


class TestConsentimiento(unittest.TestCase):
    def test_texto_y_consentimiento(self):
        t = consentimiento.texto_para("Marta")
        self.assertIn("Marta", t)
        c = consentimiento.nuevo_consentimiento("datos_personales", "verbal", persona_id="p1")
        self.assertEqual(c["estado"], "vigente")
        self.assertEqual(consentimiento.revocar(c, "pidió")["estado"], "revocado")
        with self.assertRaises(ValueError):
            consentimiento.nuevo_consentimiento("x", "telepatia")


class TestCatalogos(unittest.TestCase):
    def test_catalogos_completos(self):
        self.assertEqual(len(catalogos.CATALOGOS), 20)
        self.assertEqual(len(catalogos.opciones("C-08")), 14)
        self.assertEqual(catalogos.etiqueta("C-01", "no_contactar"), "No contactar")
        self.assertEqual(catalogos.clave_de_etiqueta("C-10", "WhatsApp"), "whatsapp")
        for r, e in catalogos.ESTADO_POR_RESULTADO.items():
            self.assertIn(r, catalogos.claves("C-02"))
            self.assertIn(e, catalogos.claves("C-01"))


class TestEstadisticas(unittest.TestCase):
    def test_umbral(self):
        self.assertEqual(estadisticas.umbral(3), "menos de 5")
        self.assertEqual(estadisticas.umbral(5), "5")
        self.assertEqual(estadisticas.umbral(0), "0")

    def test_panel_campana(self):
        viv = [{"id": f"v{i}", "zona_id": "z1"} for i in range(10)]
        vis = [{"id": f"x{i}", "vivienda_id": f"v{i}", "calidad": "verde", "resultado": "conversacion_completa",
                "fecha": reglas.iso(), "usuario_id": "u1"} for i in range(4)]
        vis.append({"id": "r", "vivienda_id": "v9", "calidad": "rojo", "resultado": "conversacion_completa", "fecha": reglas.iso(), "usuario_id": "u1"})
        hog = [{"id": "h1", "total_personas": 4, "edades": {"0-5": 1, "25-34": 3}, "futuros_primeros_votantes": 1, "jefatura_femenina": True}]
        per = [{"id": "p1", "hogar_id": "h1", "tiene_contacto_autorizado": True, "estado": "activa"}]
        nec = [{"tema": "vias_movilidad"}] * 7 + [{"tema": "salud"}] * 2
        r = estadisticas.panel_campana(viv, vis, hog, per, nec)
        self.assertEqual(r["viviendas_conocidas"], 10)
        self.assertEqual(r["viviendas_visitadas"], 4)
        self.assertEqual(r["cobertura_pct"], 40.0)
        self.assertEqual(r["registros_incompletos"], 1)
        self.assertEqual(r["electores_por_hogar"], 3.0)
        self.assertEqual(r["necesidades_por_tema"][0]["texto"], "7")
        self.assertEqual(r["necesidades_por_tema"][1]["texto"], "menos de 5")
        self.assertEqual(sum(n for _, n in r["visitas_por_dia"]), 4)

    def test_panel_personal(self):
        ahora = reglas.ahora_utc()
        vis = [{"usuario_id": "u1", "fecha": reglas.iso(ahora), "calidad": "verde"},
               {"usuario_id": "u2", "fecha": reglas.iso(ahora), "calidad": "verde"}]
        tareas = [{"asignado_a": "u1", "estado": "pendiente", "fecha_limite": reglas.iso(ahora - timedelta(days=1))},
                  {"asignado_a": "u1", "estado": "hecha", "fecha_limite": None}]
        r = estadisticas.panel_personal("u1", vis, tareas, borradores=2, por_enviar=3, ahora=ahora)
        self.assertEqual((r["hoy"], r["total"], r["tareas_pendientes"], r["tareas_vencidas"]), (1, 1, 1, 1))


if __name__ == "__main__":
    unittest.main()
