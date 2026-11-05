"""Registro de visita en pasos (cap. 6): vivienda, resultado, hogar, personas, necesidades, autorización con firma y cierre."""
from __future__ import annotations

from kivy.app import App
from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.popup import Popup
from kivy.uix.scrollview import ScrollView
from kivy.uix.screenmanager import Screen

from ..core import payload as pl
from ..core.reglas import ahora_utc
from ..core.validadores import (avisos_de_nota, normalizar_telefono, parse_fecha, validar_cedula, validar_correo, validar_edades,
                                validar_fecha_nacimiento, validar_nombre)
from .formularios import Casilla, ConTitulo, Firma, Selector, entero, opciones
from .tema import AZUL, BLANCO, CLARO, FONDO, GRIS, NARANJA, ROJO, TEXTO, VERDE, Boton, Tarjeta, dialogo, en_hilo, etiqueta, pintar

CON_CONVERSACION = {"conversacion_completa", "conversacion_breve", "pidio_volver"}
RANGOS = [("0-5", "0 a 5 años"), ("6-12", "6 a 12 años"), ("13-17", "13 a 17 años"), ("18-24", "18 a 24 años"), ("25-34", "25 a 34 años"),
          ("35-44", "35 a 44 años"), ("45-54", "45 a 54 años"), ("55-64", "55 a 64 años"), ("65+", "65 años o más")]
OCUPACION_VIV = [("habitada", "Habitada"), ("deshabitada", "Deshabitada"), ("en_construccion", "En construcción"), ("uso_temporal", "Uso temporal o turístico")]
ACTIVIDAD = [("ninguna", "Ninguna"), ("negocio", "Negocio"), ("finca_cafetera", "Finca cafetera"), ("alojamiento_turistico", "Alojamiento turístico"), ("otra", "Otra")]
RIESGOS = [("derrumbe", "Riesgo de derrumbe"), ("inundacion", "Riesgo de inundación"), ("cerca_quebrada", "Cerca de una quebrada")]
RELACION = [("jefe_jefa", "Jefe o jefa del hogar"), ("conyuge", "Cónyuge o pareja"), ("hijo_hija", "Hijo o hija"), ("otro", "Otro familiar")]
SEXO = [("mujer", "Mujer"), ("hombre", "Hombre"), ("prefiere_no_decir", "Prefiere no decir")]
LABORAL = [("formal", "Empleo formal"), ("informal", "Empleo informal"), ("independiente", "Independiente"), ("sin_empleo", "Sin empleo"), ("pensionado", "Pensionado")]
HORARIO = [("manana", "Mañana"), ("tarde", "Tarde"), ("noche", "Noche"), ("fines_de_semana", "Fines de semana")]
SINO = [("si", "Sí"), ("no", "No"), ("no_sabe", "No sabe")]
VOLUNTARIO = [("si", "Sí"), ("no", "No"), ("tal_vez", "Tal vez")]
PRIORIDAD = [("1", "Prioridad 1 (la más urgente)"), ("2", "Prioridad 2"), ("3", "Prioridad 3")]
ALCANCE = [("hogar", "Solo de este hogar"), ("colectiva", "De la comunidad")]
CANAL_A_PROPOSITO = {"whatsapp": "contacto_whatsapp", "llamada": "contacto_llamada", "sms": "contacto_sms", "correo": "contacto_correo"}
TEXTO_AUTORIZACION = ("Soy {nombre}, de la campaña Pijao nos une. Quisiera registrar su vivienda y, si usted lo permite, sus datos de contacto, para conocer las "
                      "necesidades de su familia, mantenerlo informado y construir el programa de gobierno. Usted puede decir que no y pedir en cualquier momento que "
                      "corrijamos o borremos sus datos. No venderemos sus datos ni los entregaremos a otras personas, y los eliminaremos al terminar la campaña.")
INTRO = ["Saluda, di tu nombre y el de la campaña.", "Explica para qué visitas: escuchar, no pedir nada.", "Pregunta si puedes registrar la visita.",
         "Ofrece el aviso de privacidad.", "No fotografíes niños ni personas sin permiso.", "Si dicen que no, agradece y no insistas."]


def _col(tarjeta_titulo: str | None = None) -> Tarjeta:
    t = Tarjeta()
    if tarjeta_titulo:
        t.add_widget(etiqueta(tarjeta_titulo, 16, TEXTO, True))
    return t


class PantallaVisita(Screen):
    def __init__(self, app_logica, **kw):
        super().__init__(name="visita", **kw)
        self.logica, self.draft, self.lectura = app_logica, None, None
        self.pasos, self.i, self.cache, self.firma_datos = [], 0, {}, None
        raiz = BoxLayout(orientation="vertical")
        cab = BoxLayout(size_hint_y=None, height=dp(58), padding=[dp(16), dp(8)], spacing=dp(8))
        self.titulo = etiqueta("Registrar visita", 20, TEXTO, True)
        self.contador = etiqueta("", 12, GRIS, halign="right", size_hint_x=.4)
        cab.add_widget(self.titulo)
        cab.add_widget(self.contador)
        cab.add_widget(Boton("Cancelar", color=CLARO, texto_color=ROJO, height=dp(40), size_hint_x=.3, on_release=lambda *_: self.cancelar()))
        self.sv = ScrollView(do_scroll_x=False, bar_width=0)
        self.contenido = BoxLayout(orientation="vertical", size_hint_y=None, padding=[dp(16), dp(8), dp(16), dp(16)], spacing=dp(12))
        self.contenido.bind(minimum_height=self.contenido.setter("height"))
        self.sv.add_widget(self.contenido)
        self.error = etiqueta("", 13, ROJO)
        pie = BoxLayout(size_hint_y=None, height=dp(68), padding=[dp(16), dp(8)], spacing=dp(10))
        pintar(pie, BLANCO, 0)
        self.btn_atras = Boton("Atrás", color=CLARO, texto_color=AZUL, height=dp(50), size_hint_x=.35, on_release=lambda *_: self.atras())
        self.btn_sig = Boton("Siguiente", height=dp(50), on_release=lambda *_: self.siguiente())
        pie.add_widget(self.btn_atras)
        pie.add_widget(self.btn_sig)
        for w in (cab, self.sv, pie):
            raiz.add_widget(w)
        self.add_widget(raiz)

    # ------------------------------------------------------------------ apertura y flujo
    def abrir(self, lectura: dict, vivienda: dict | None = None):
        self.lectura, self.nueva, self.cache, self.firma_datos, self._avisado = lectura, vivienda is None, {}, None, False
        self.draft = self.logica.nueva_visita(lectura["lat"], lectura["lng"], lectura.get("precision_m"), vivienda)
        self.draft["vivienda_existente"] = vivienda is not None
        if lectura.get("manual"):
            self.draft["visita"].update(ubicacion_manual=True, motivo_manual=lectura.get("motivo"))
            self.draft["vivienda"]["fuente_ubicacion"] = "manual"
            self.draft["dispositivo"] = lectura.get("dispositivo") or {}
        else:
            self.draft["dispositivo"] = {"lat": lectura["lat"], "lng": lectura["lng"], "precision_m": lectura.get("precision_m")}
        self.draft["dispositivo"] = dict(self.draft["dispositivo"], plataforma="android")
        self.pasos = (["intro"] if self.logica.intro_visible() else []) + (["vivienda"] if self.nueva else []) + ["resultado"]
        if "intro" in self.pasos:
            self.logica.marcar_intro()
        self.i = 0
        self._mostrar()
        self.manager.current = "visita"

    def _mostrar(self):
        nombre = self.pasos[self.i]
        if nombre not in self.cache:
            self.cache[nombre] = getattr(self, "_p_" + nombre)()
        widget, leer, al_mostrar = self.cache[nombre]
        self.error.text = ""
        self.contenido.clear_widgets()
        self.contenido.add_widget(widget)
        self.contenido.add_widget(self.error)
        if al_mostrar:
            al_mostrar()
        self.contador.text = f"Paso {self.i + 1} de {len(self.pasos)}"
        ultimo = self.i == len(self.pasos) - 1 and nombre == "cierre"
        self.btn_sig.text = "Guardar visita" if ultimo else "Siguiente"
        self.btn_atras.disabled = self.i == 0
        self.sv.scroll_y = 1

    def siguiente(self):
        nombre = self.pasos[self.i]
        err = self.cache[nombre][1]()
        if err:
            self.error.text = err
            return
        if nombre == "cierre":
            return self._guardar()
        if nombre == "resultado":
            res = self.draft["visita"].get("resultado")
            cola = ["hogar", "personas", "necesidades", "autorizacion", "cierre"] if res in CON_CONVERSACION else ["cierre"]
            self.pasos = self.pasos[: self.i + 1] + cola
        self.i += 1
        self._mostrar()

    def atras(self):
        if self.i > 0:
            self.i -= 1
            self._mostrar()

    def cancelar(self):
        dialogo("¿Descartar la visita?", "Lo que llevas escrito se perderá.", [("Descartar", self._volver), ("Seguir", None)])

    def _volver(self):
        root = App.get_running_app().root
        root.current = "principal"
        pr = root.get_screen("principal")
        pr.ir("mapa")
        pr.mapa.refrescar()

    # ------------------------------------------------------------------ pasos (cada uno devuelve (widget, leer, al_mostrar))
    def _p_intro(self):
        t = _col("Antes de tocar la puerta")
        for linea in INTRO:
            t.add_widget(etiqueta("•  " + linea, 14, TEXTO))
        t.add_widget(etiqueta("Esta tarjeta se muestra las primeras veces.", 12, GRIS))
        return t, (lambda: ""), None

    def _p_vivienda(self):
        t = _col("La vivienda")
        self.v_tipo, self.v_zona = Selector("Tipo de vivienda", opciones("C-03")), Selector("Zona", [("urbana", "Urbana (barrio)"), ("rural", "Rural (vereda)")])
        self.v_barrio, self.v_dir = ConTitulo("Barrio o vereda"), ConTitulo("Dirección o indicaciones")
        self.v_comp, self.v_finca, self.v_ref = ConTitulo("Complemento (apto, piso)"), ConTitulo("Nombre de la finca (si aplica)"), ConTitulo("Punto de referencia")
        self.v_ocu, self.v_ten = Selector("Estado de ocupación", OCUPACION_VIV), Selector("Tenencia", opciones("C-04"))
        self.v_via, self.v_act = Selector("Vía de acceso", opciones("C-06")), Selector("Actividad económica en la vivienda", ACTIVIDAD)
        for w in (self.v_tipo, self.v_zona, self.v_barrio, self.v_dir, self.v_comp, self.v_finca, self.v_ref, self.v_ocu, self.v_ten, self.v_via, self.v_act):
            t.add_widget(w)
        t.add_widget(etiqueta("Servicios que tiene", 13, GRIS))
        self.v_serv = {c: Casilla(e) for c, e in opciones("C-05")}
        for w in self.v_serv.values():
            t.add_widget(w)
        t.add_widget(etiqueta("Riesgos del lugar", 13, GRIS))
        self.v_ries = {c: Casilla(e) for c, e in RIESGOS}
        for w in self.v_ries.values():
            t.add_widget(w)
        self.v_nofoto = Casilla("La persona no autorizó la foto de la fachada")
        t.add_widget(self.v_nofoto)
        t.add_widget(etiqueta("La foto de fachada con la cámara llega en la próxima parte de la Fase 2. Sin foto, la visita queda marcada en rojo (salvo que no se autorice).", 12, GRIS))

        def leer():
            for sel, msg in ((self.v_tipo, "Elige el tipo de vivienda."), (self.v_zona, "Elige si es urbana o rural."), (self.v_ocu, "Elige el estado de ocupación.")):
                if not sel.valor:
                    return msg
            if not self.v_barrio.text.strip() or not self.v_dir.text.strip():
                return "Escribe el barrio o vereda y la dirección o indicaciones."
            self.draft["vivienda"].update(
                tipo_vivienda=self.v_tipo.valor, zona_urbana_rural=self.v_zona.valor, barrio_vereda=self.v_barrio.text.strip(), direccion=self.v_dir.text.strip(),
                complemento=self.v_comp.text.strip() or None, nombre_finca=self.v_finca.text.strip() or None, referencia=self.v_ref.text.strip() or None,
                estado_ocupacion=self.v_ocu.valor, tenencia=self.v_ten.valor, via_acceso=self.v_via.valor, actividad_economica=self.v_act.valor,
                servicios=[c for c, w in self.v_serv.items() if w.activo], riesgos=[c for c, w in self.v_ries.items() if w.activo])
            self.draft["visita"]["no_autorizo_foto"] = self.v_nofoto.activo
            return ""
        return t, leer, None

    def _p_resultado(self):
        t = _col("¿Cómo salió la visita?")
        self.r_res = Selector("Resultado", opciones("C-02"))
        self.r_aut = Casilla("La persona autorizó verbalmente registrar la visita")
        t.add_widget(self.r_res)
        t.add_widget(self.r_aut)
        t.add_widget(etiqueta("Si habló contigo, necesitas su autorización. Si no autoriza, elige «Rechazó».", 12, GRIS))

        def leer():
            if not self.r_res.valor:
                return "Elige el resultado de la visita."
            if self.r_res.valor in CON_CONVERSACION and not self.r_aut.activo:
                return "Marca la autorización verbal, o elige «Rechazó» si la persona no autoriza."
            self.draft["visita"].update(resultado=self.r_res.valor, autorizacion_verbal=self.r_aut.activo)
            return ""
        return t, leer, None

    def _p_hogar(self):
        t = _col("El hogar")
        self.h_total = ConTitulo("¿Cuántas personas viven en el hogar?", input_type="number")
        t.add_widget(self.h_total)
        t.add_widget(etiqueta("¿Cuántas hay en cada rango de edad? (deben sumar el total)", 13, GRIS))
        self.h_edad = {c: ConTitulo(e, "0", input_type="number") for c, e in RANGOS}
        for w in self.h_edad.values():
            t.add_widget(w)
        self.h_mujeres, self.h_hombres = ConTitulo("Mujeres (opcional)", input_type="number"), ConTitulo("Hombres (opcional)", input_type="number")
        self.h_vpij, self.h_votro = ConTitulo("Votan en Pijao (opcional)", input_type="number"), ConTitulo("Votan en otro municipio (opcional)", input_type="number")
        self.h_fut = ConTitulo("Jóvenes que votarán por primera vez (opcional)", input_type="number")
        for w in (self.h_mujeres, self.h_hombres, self.h_vpij, self.h_votro, self.h_fut):
            t.add_widget(w)
        t.add_widget(etiqueta("Principal sostén del hogar", 15, TEXTO, True))
        self.h_rel, self.h_sex = Selector("Relación con el hogar", RELACION), Selector("Sexo", SEXO)
        self.h_ocu, self.h_lab = Selector("Ocupación", opciones("C-07")), Selector("Situación laboral", LABORAL)
        for w in (self.h_rel, self.h_sex, self.h_ocu, self.h_lab):
            t.add_widget(w)
        self.h_perros, self.h_gatos = ConTitulo("Perros", "0", input_type="number"), ConTitulo("Gatos", "0", input_type="number")
        self.h_fuera, self.h_ciudad = ConTitulo("Familiares que viven fuera (cuántos)", input_type="number"), ConTitulo("¿En qué ciudad?")
        self.h_otros = Casilla("En la casa vive otro hogar")
        for w in (self.h_perros, self.h_gatos, self.h_fuera, self.h_ciudad, self.h_otros):
            t.add_widget(w)

        def leer():
            total = entero(self.h_total.text)
            edades = {c: (entero(w.text) or 0) for c, w in self.h_edad.items()}
            ok, msg = validar_edades(total, edades)
            if not ok:
                return msg
            if not self.h_rel.valor:
                return "Indica la relación del principal sostén con el hogar."
            g = lambda w: entero(w.text)                      # noqa: E731
            self.draft["hogar"] = pl.limpiar_vacios({
                "id": (self.draft.get("hogar") or {}).get("id") or pl.nuevo_id(), "total_personas": total, "edades": {c: n for c, n in edades.items() if n},
                "mujeres": g(self.h_mujeres), "hombres": g(self.h_hombres), "votantes_pijao_est": g(self.h_vpij), "votantes_otro_mpio_est": g(self.h_votro),
                "futuros_primeros_votantes": g(self.h_fut), "sosten_relacion": self.h_rel.valor, "sosten_sexo": self.h_sex.valor,
                "sosten_ocupacion": self.h_ocu.valor, "sosten_situacion_laboral": self.h_lab.valor, "otros_hogares": self.h_otros.activo,
                "mascotas": {"perros": g(self.h_perros) or 0, "gatos": g(self.h_gatos) or 0}, "familiares_fuera": {"cuantos": g(self.h_fuera) or 0, "ciudad": self.h_ciudad.text.strip()}})
            return ""
        return t, leer, None

    def _p_personas(self):
        t = _col("Personas del hogar")
        t.add_widget(etiqueta("Registra solo a quien quiera dar sus datos y sea mayor de 18 años. Puedes continuar sin registrar a nadie.", 12, GRIS))
        lista = BoxLayout(orientation="vertical", size_hint_y=None, spacing=dp(6))
        lista.bind(minimum_height=lista.setter("height"))
        t.add_widget(lista)
        t.add_widget(Boton("Agregar persona", color=CLARO, texto_color=AZUL, on_release=lambda *_: self.abrir_persona(pintar_lista)))

        def pintar_lista():
            lista.clear_widgets()
            personas = self.draft.setdefault("personas", [])
            if not personas:
                lista.add_widget(etiqueta("Todavía no hay personas registradas.", 13, GRIS))
            for p in personas:
                fila = BoxLayout(size_hint_y=None, height=dp(48), spacing=dp(8))
                fila.add_widget(etiqueta(f"{p['primer_nombre']} {p['primer_apellido']}" + ("  ·  sostén" if p.get("es_sosten") else ""), 14, TEXTO))
                fila.add_widget(Boton("Quitar", color=CLARO, texto_color=ROJO, height=dp(40), size_hint_x=.3, on_release=lambda *_, p=p: (personas.remove(p), pintar_lista())))
                lista.add_widget(fila)
        return t, (lambda: ""), pintar_lista

    def abrir_persona(self, al_guardar):
        t = _col("Datos de la persona")
        n1, n2, a1, a2 = ConTitulo("Primer nombre"), ConTitulo("Segundo nombre (opcional)"), ConTitulo("Primer apellido"), ConTitulo("Segundo apellido (opcional)")
        apodo, ced = ConTitulo("¿Cómo le dicen? (opcional)"), ConTitulo("Número de cédula", input_type="number")
        nac = ConTitulo("Fecha de nacimiento (AAAA-MM-DD)", "AAAA-MM-DD")
        mayor = Casilla("Confirmo que es mayor de 18 años (si no sé su fecha de nacimiento)")
        sexo, ocu = Selector("Sexo", SEXO), Selector("Ocupación", opciones("C-07"))
        tel, wa = ConTitulo("Celular (opcional)", input_type="number"), Casilla("Ese número tiene WhatsApp")
        mail, canal, hor = ConTitulo("Correo (opcional)"), Selector("Canal preferido", opciones("C-10")), Selector("Mejor horario", HORARIO)
        vota, info = Selector("¿Vota en Pijao?", SINO), Casilla("Quiere recibir información de la campaña")
        vol, anf = Selector("¿Quiere ser voluntario?", VOLUNTARIO), Casilla("Puede ser anfitrión de reuniones («Casa amiga»)")
        temas = [Selector(f"Tema de interés {k}", opciones("C-08")) for k in (1, 2, 3)]
        simp = Selector("Simpatía (dato SENSIBLE: solo si la persona lo dijo por iniciativa propia y lo autoriza)", opciones("C-09"), height=dp(116))
        sost = Casilla("Es el principal sostén del hogar")
        err = etiqueta("", 13, ROJO)
        for w in (n1, n2, a1, a2, apodo, ced, nac, mayor, sexo, ocu, tel, wa, mail, canal, hor, vota, info, vol, anf, *temas, simp, sost, err):
            t.add_widget(w)

        def guardar():
            err.text = ""
            for campo, rotulo in ((n1, "El primer nombre"), (a1, "El primer apellido")):
                ok, msg = validar_nombre(campo.text, rotulo)
                if not ok:
                    err.text = msg
                    return
            ok, msg = validar_cedula(ced.text)
            if not ok:
                err.text = msg
                return
            fecha = None
            if nac.text.strip():
                ok, msg = validar_fecha_nacimiento(nac.text)
                if not ok:
                    err.text = msg
                    return
                fecha = parse_fecha(nac.text).isoformat()
            elif not mayor.activo:
                err.text = "Escribe la fecha de nacimiento o confirma que es mayor de 18 años."
                return
            telefono = None
            if tel.text.strip():
                telefono = normalizar_telefono(tel.text)
                if not telefono:
                    err.text = "El celular no es válido."
                    return
            if mail.text.strip():
                ok, msg = validar_correo(mail.text)
                if not ok:
                    err.text = msg
                    return
            personas = self.draft.setdefault("personas", [])
            if any(p.get("cedula") == ced.text.strip() for p in personas):
                err.text = "Esa cédula ya está registrada en esta visita."
                return
            if sost.activo:
                for p in personas:
                    p["es_sosten"] = False
            personas.append(pl.limpiar_vacios({
                "id": pl.nuevo_id(), "primer_nombre": n1.text.strip(), "segundo_nombre": n2.text.strip(), "primer_apellido": a1.text.strip(),
                "segundo_apellido": a2.text.strip(), "apodo": apodo.text.strip(), "tipo_documento": "CC", "cedula": ced.text.strip(), "fecha_nacimiento": fecha,
                "mayor_edad_confirmada": True, "sexo": sexo.valor, "ocupacion": ocu.valor, "telefono": telefono, "telefono_es_whatsapp": wa.activo,
                "correo": mail.text.strip(), "canal_preferido": canal.valor, "mejor_horario": hor.valor, "vota_en_pijao": vota.valor, "interes_info": info.activo,
                "voluntario": vol.valor, "anfitrion": anf.activo, "temas_interes": [x.valor for x in temas if x.valor], "simpatia": simp.valor, "es_sosten": sost.activo}))
            pop.dismiss()
            al_guardar()

        self._pf = dict(n1=n1, a1=a1, ced=ced, nac=nac, mayor=mayor, sexo=sexo, tel=tel, info=info, canal=canal, simp=simp, sost=sost, err=err, guardar=guardar)
        pie = BoxLayout(size_hint_y=None, height=dp(56), spacing=dp(8))
        pie.add_widget(Boton("Guardar persona", height=dp(50), on_release=lambda *_: guardar()))
        pie.add_widget(Boton("Cancelar", color=CLARO, texto_color=AZUL, height=dp(50), on_release=lambda *_: pop.dismiss()))
        sv = ScrollView(do_scroll_x=False, bar_width=0)
        sv.add_widget(t)
        caja = BoxLayout(orientation="vertical", spacing=dp(8), padding=dp(6))
        caja.add_widget(sv)
        caja.add_widget(pie)
        pop = Popup(title="Persona", content=caja, size_hint=(.97, .95), auto_dismiss=False, background="", background_color=FONDO, title_color=TEXTO)
        pop.open()

    def _p_necesidades(self):
        t = _col("Lo que necesita la comunidad")
        t.add_widget(etiqueta("Anota hasta 3 necesidades que mencione la persona (opcional).", 12, GRIS))
        self.n_filas = []
        for k in (1, 2, 3):
            tema, prio = Selector(f"Necesidad {k}", opciones("C-08")), Selector("Prioridad", PRIORIDAD)
            texto, alc = ConTitulo("¿Qué dice? (sin datos personales)", multilinea=True), Selector("Alcance", ALCANCE)
            resp = Casilla("Quiere que le contemos cómo va")
            for w in (tema, prio, texto, alc, resp):
                t.add_widget(w)
            self.n_filas.append((tema, prio, texto, alc, resp))

        def leer():
            lista = []
            for tema, prio, texto, alc, resp in self.n_filas:
                if not tema.valor:
                    continue
                if not texto.text.strip():
                    return "Escribe qué dice la persona sobre cada necesidad que elegiste."
                lista.append({"id": pl.nuevo_id(), "tema": tema.valor, "prioridad": int(prio.valor or 2), "texto": texto.text.strip(),
                              "alcance": alc.valor or "hogar", "desea_respuesta": resp.activo, "origen": "visita"})
            self.draft["necesidades"] = lista
            return ""
        return t, leer, None

    def _p_autorizacion(self):
        t = _col("Autorización")
        nombre = self.logica.perfil.nombre if self.logica.perfil else "un integrante del equipo"
        t.add_widget(etiqueta("Lee esto a la persona:", 13, GRIS))
        t.add_widget(etiqueta(TEXTO_AUTORIZACION.format(nombre=nombre), 14, TEXTO))
        self.a_viv = Casilla("Autoriza registrar su vivienda y los datos del hogar", True)
        self.a_dat = Casilla("Autoriza guardar sus datos personales")
        self.a_con = Casilla("Autoriza que le contactemos por el canal que eligió")
        self.a_sim = Casilla("Autoriza guardar su simpatía (dato sensible)")
        self.a_his = Casilla("Autoriza usar su historia o testimonio")
        self.a_met = Selector("¿Cómo autoriza?", [("firma_pantalla", "Firma en pantalla"), ("verbal", "Autorización verbal")])
        self.a_estado = etiqueta("", 13, GRIS)
        self.a_firma = None
        for w in (self.a_viv, self.a_dat, self.a_con, self.a_sim, self.a_his, self.a_met):
            t.add_widget(w)
        t.add_widget(Boton("Firmar en pantalla", color=CLARO, texto_color=AZUL, on_release=lambda *_: self._firmar()))
        t.add_widget(self.a_estado)

        def al_mostrar():
            ps = self.draft.get("personas", [])
            visibles = {self.a_dat: bool(ps), self.a_con: any(p.get("interes_info") and p.get("canal_preferido") in CANAL_A_PROPOSITO for p in ps),
                        self.a_sim: any(p.get("simpatia") for p in ps), self.a_his: bool(ps)}
            for w, v in visibles.items():
                w.opacity, w.disabled, w.height = (1, False, dp(46)) if v else (0, True, 0)
            self.a_estado.text = "Firma registrada." if self.firma_datos else "Falta la firma."

        def leer():
            ps = self.draft.get("personas", [])
            if not self.a_viv.activo:
                return "Sin autorización para registrar la vivienda no se puede guardar la visita."
            if ps and not self.a_dat.activo:
                return "Sin autorización de datos personales no se guardan las personas: quítalas o marca la autorización."
            if any(n.get("desea_respuesta") for n in self.draft.get("necesidades", [])) and not (self.a_con.activo and self.a_con.opacity):
                return "Para contarle cómo va su propuesta necesitas la autorización de contacto."
            if not self.a_met.valor:
                return "Elige cómo autoriza la persona."
            if self.a_met.valor == "firma_pantalla" and not self.firma_datos:
                return "Toca «Firmar en pantalla» para recoger la firma."
            ahora = ahora_utc().isoformat()
            evidencia = {"firma": self.firma_datos} if self.a_met.valor == "firma_pantalla" else {"verbal": True, "hora": ahora}
            base = {"version_texto": "v1-borrador", "metodo": self.a_met.valor, "otorgado_en": ahora, "lat": self.lectura["lat"], "lng": self.lectura["lng"],
                    "evidencia": evidencia, "estado": "vigente"}
            cons = [dict(base, id=pl.nuevo_id(), proposito="registro_vivienda")]
            for p in ps:
                if self.a_dat.activo:
                    cons.append(dict(base, id=pl.nuevo_id(), persona_id=p["id"], proposito="datos_personales"))
                if self.a_con.activo and p.get("interes_info") and p.get("canal_preferido") in CANAL_A_PROPOSITO:
                    cons.append(dict(base, id=pl.nuevo_id(), persona_id=p["id"], proposito=CANAL_A_PROPOSITO[p["canal_preferido"]]))
                if self.a_sim.activo and p.get("simpatia"):
                    cons.append(dict(base, id=pl.nuevo_id(), persona_id=p["id"], proposito="dato_sensible_simpatia"))
                elif not self.a_sim.activo:
                    p["simpatia"] = None                       # sin autorización específica la simpatía no se guarda
                if self.a_his.activo:
                    cons.append(dict(base, id=pl.nuevo_id(), persona_id=p["id"], proposito="uso_historia"))
            self.draft["consentimientos"] = cons
            return ""
        return t, leer, al_mostrar

    def _firmar(self):
        firma = Firma()
        caja = BoxLayout(orientation="vertical", spacing=dp(8), padding=dp(8))
        caja.add_widget(etiqueta("Pide a la persona que firme con el dedo.", 13, TEXTO))
        caja.add_widget(firma)

        def listo():
            if firma.vacia:
                dialogo("Firma vacía", "La firma está vacía. Pide a la persona que firme de nuevo.", [("Entendido", None)])
                return
            self.firma_datos = firma.a_datos()
            pop.dismiss()
            self.a_estado.text = "Firma registrada."
        fila = BoxLayout(size_hint_y=None, height=dp(56), spacing=dp(8))
        fila.add_widget(Boton("Borrar", color=CLARO, texto_color=ROJO, height=dp(50), on_release=lambda *_: firma.borrar()))
        fila.add_widget(Boton("Listo", height=dp(50), on_release=lambda *_: listo()))
        caja.add_widget(fila)
        pop = Popup(title="Firma", content=caja, size_hint=(.96, .6), auto_dismiss=False, background="", background_color=FONDO, title_color=TEXTO)
        pop.open()

    def _p_cierre(self):
        t = _col("Cierre de la visita")
        self.c_notas = ConTitulo("Notas (sin datos personales ni sensibles)", multilinea=True)
        self.c_vol = Casilla("Entregué volante o información")
        self.c_seg = Casilla("Hay que volver a visitar")
        self.c_fecha, self.c_mot = ConTitulo("¿Cuándo? (AAAA-MM-DD, opcional)", "AAAA-MM-DD"), ConTitulo("Motivo del seguimiento")
        self.c_no = Casilla("Pidió no ser visitado de nuevo")
        self.c_aviso = etiqueta("", 13, ROJO)
        self.c_resumen = etiqueta("", 13, TEXTO)
        for w in (self.c_notas, self.c_aviso, self.c_vol, self.c_seg, self.c_fecha, self.c_mot, self.c_no, self.c_resumen):
            t.add_widget(w)

        def al_mostrar():
            d = self.draft
            cal, motivos = self.logica.calidad_estimada(d)
            color = {"verde": "Verde", "amarillo": "Amarilla", "rojo": "Roja"}[cal]
            self.c_resumen.text = (f"Resumen: {len(d.get('personas', []))} personas, {len(d.get('necesidades', []))} necesidades.\n"
                                   f"Calidad estimada: {color}." + ("\n" + "\n".join("• " + m for m in motivos) if motivos else ""))

        def leer():
            avisos = avisos_de_nota(self.c_notas.text)
            if avisos and not self._avisado:
                self._avisado = True
                self.c_aviso.text = "\n".join(avisos) + "\nSi estás seguro, toca Guardar de nuevo."
                return "Revisa los avisos de las notas."
            seg = None
            if self.c_fecha.text.strip():
                f = parse_fecha(self.c_fecha.text)
                if not f:
                    return "La fecha del seguimiento no es válida (AAAA-MM-DD)."
                seg = f.isoformat()
            v = self.draft["visita"]
            v.update(notas=self.c_notas.text.strip() or None, volante_entregado=self.c_vol.activo, seguimiento_requerido=self.c_seg.activo,
                     seguimiento_fecha=seg, seguimiento_motivo=self.c_mot.text.strip() or None)
            if self.c_no.activo:
                v["resultado"] = "pidio_no_ser_visitado"
            return ""
        return t, leer, al_mostrar

    # ------------------------------------------------------------------ guardar
    def _guardar(self):
        try:
            self.logica.guardar_visita(self.draft, self.draft.get("dispositivo"))
        except ValueError as e:
            self.error.text = str(e)
            return
        en_hilo(self.logica.sincronizar)
        cal, motivos = self.logica.calidad_estimada(self.draft)
        dialogo("Visita guardada", "Se guardó en el teléfono y se envía sola cuando hay internet.\nCalidad: " + {"verde": "verde", "amarillo": "amarilla", "rojo": "roja"}[cal]
                + ("\n" + "\n".join(motivos) if motivos else ""), [("Listo", self._volver)])
