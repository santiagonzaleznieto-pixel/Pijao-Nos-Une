"""Roles y permisos (sección 4 del documento maestro).

Tres tipos de cuenta (administrador, director, colaborador). El colaborador es el único
rol de trabajo; sus funciones extra son los permisos opcionales O-01 a O-22 que enciende
el Director. Las plantillas son atajos, no roles.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from .reglas import ahora_utc, parse_iso

ROLES = ("admin", "director", "colaborador")
ESTADOS_CUENTA = ("pendiente", "aprobado", "activo", "suspendido", "baja")


@dataclass(frozen=True)
class PermisoDef:
    codigo: str
    nombre: str
    descripcion: str
    riesgo: str                 # bajo | medio | alto
    acepta_zonas: bool = False

    @property
    def requiere_2fa(self) -> bool:
        return self.riesgo == "alto"


_LISTA = [
    PermisoDef("O-01", "Ver datos personales completos", "Cédula, fecha de nacimiento, teléfono y correo completos", "alto", True),
    PermisoDef("O-02", "Ver simpatía individual [SENSIBLE]", "Ver el nivel de simpatía declarado de cada persona", "alto", True),
    PermisoDef("O-03", "Ver estadísticas avanzadas", "Rendimiento por colaborador, comparativos, embudo, tendencias", "medio", True),
    PermisoDef("O-04", "Ver mapas de calor", "Mapas de simpatía agregada y de necesidades", "medio", True),
    PermisoDef("O-05", "Exportar listas", "Descargar listas con marca de agua, motivo y registro", "alto"),
    PermisoDef("O-06", "Editar registros de otros", "Corregir registros de otro colaborador", "medio", True),
    PermisoDef("O-07", "Verificar registros", "Marcar registros como verificados y resolver alertas de calidad", "medio", True),
    PermisoDef("O-08", "Aprobar cuentas", "Aprobar solicitudes de nuevos colaboradores y voluntarios", "medio"),
    PermisoDef("O-09", "Crear y asignar tareas", "Crear tareas y asignarlas a otros", "bajo", True),
    PermisoDef("O-10", "Crear eventos y tomar asistencia", "Convocar eventos y registrar quién asistió", "bajo", True),
    PermisoDef("O-11", "Publicar anuncios", "Escribir anuncios para el equipo", "bajo"),
    PermisoDef("O-12", "Enviar mensajes a ciudadanos", "SMS, WhatsApp o correo a contactos con autorización", "alto"),
    PermisoDef("O-13", "Importar datos", "Cargar archivos con personas o viviendas, con fuente documentada", "alto"),
    PermisoDef("O-14", "Gestionar zonas", "Dibujar, editar y asignar zonas", "medio", True),
    PermisoDef("O-15", "Ver finanzas", "Ver ingresos, gastos y presupuesto (solo lectura)", "medio"),
    PermisoDef("O-16", "Registrar aportes y gastos", "Cargar aportes y gastos con soportes", "alto"),
    PermisoDef("O-17", "Gestionar propaganda", "Inventario de vallas, pendones y volantes", "bajo"),
    PermisoDef("O-18", "Operar Día de elecciones", "Testigos, actas, incidentes y conteo paralelo", "medio"),
    PermisoDef("O-19", "Gestionar necesidades y propuestas", "Clasificar necesidades y vincularlas a los ejes", "bajo"),
    PermisoDef("O-20", "Fusionar duplicados", "Unir viviendas o personas repetidas", "medio"),
    PermisoDef("O-21", "Ver la ubicación en vivo del equipo", "Ver dónde están los compañeros durante la jornada", "medio"),
    PermisoDef("O-22", "Crear encuestas internas", "Armar sondeos de campo", "bajo"),
]
PERMISOS: dict[str, PermisoDef] = {p.codigo: p for p in _LISTA}

PLANTILLAS: dict[str, dict] = {
    "Colaborador de campo (estándar)": {"permisos": [], "limitar_a_zona": False},
    "Colaborador con estadísticas": {"permisos": ["O-03", "O-04"], "limitar_a_zona": False},
    "Líder de zona": {"permisos": ["O-03", "O-04", "O-09", "O-10", "O-14"], "limitar_a_zona": True},
    "Colaborador de comunicaciones": {"permisos": ["O-11", "O-12", "O-17", "O-22"], "limitar_a_zona": False},
    "Colaborador de finanzas": {"permisos": ["O-15", "O-16"], "limitar_a_zona": False},
    "Colaborador de Día de elecciones": {"permisos": ["O-18", "O-21"], "limitar_a_zona": False},
    "Verificador de calidad": {"permisos": ["O-07", "O-20"], "limitar_a_zona": False},
}


@dataclass
class Perfil:
    id: str = ""
    nombre: str = ""
    rol: str = "colaborador"
    estado: str = "pendiente"
    permisos: dict = field(default_factory=dict)       # codigo -> {"zonas": [...]|None, "vence_en": iso|None}
    zonas_asignadas: list = field(default_factory=list)
    aal: str = "aal1"
    curso_aprobado: bool = False
    acuerdos_ok: bool = False

    @classmethod
    def desde_rpc(cls, d: dict | None) -> "Perfil":
        d = d or {}
        permisos = {}
        for p in d.get("permisos") or []:
            permisos[p["codigo"]] = {"zonas": p.get("zonas"), "vence_en": p.get("vence_en")}
        return cls(
            id=d.get("id") or "",
            nombre=d.get("nombre") or "",
            rol=d.get("rol") or "colaborador",
            estado=d.get("estado") or "pendiente",
            permisos=permisos,
            zonas_asignadas=list(d.get("zonas") or []),
            aal=d.get("aal") or "aal1",
            curso_aprobado=bool(d.get("curso_aprobado")),
            acuerdos_ok=bool(d.get("acuerdos_ok")),
        )

    def a_dict(self) -> dict:
        return {
            "id": self.id, "nombre": self.nombre, "rol": self.rol, "estado": self.estado,
            "permisos": [{"codigo": c, **v} for c, v in self.permisos.items()],
            "zonas": self.zonas_asignadas, "aal": self.aal,
            "curso_aprobado": self.curso_aprobado, "acuerdos_ok": self.acuerdos_ok,
        }

    # -- roles
    @property
    def es_admin(self) -> bool:
        return self.rol == "admin" and self.estado == "activo"

    @property
    def es_director(self) -> bool:
        return self.rol == "director" and self.estado == "activo"

    @property
    def es_staff(self) -> bool:
        return self.es_admin or self.es_director

    @property
    def activo(self) -> bool:
        return self.estado == "activo"

    # -- permisos
    def tiene(self, codigo: str, zona_id: str | None = None, ahora: datetime | None = None) -> bool:
        if not self.activo:
            return False
        if self.es_staff:
            return True
        p = self.permisos.get(codigo)
        if not p:
            return False
        vence = parse_iso(p.get("vence_en"))
        if vence and vence <= (ahora or ahora_utc()):
            return False
        defn = PERMISOS.get(codigo)
        if defn and defn.requiere_2fa and self.aal != "aal2":
            return False
        zonas = p.get("zonas")
        if zonas is None:
            return True
        return zona_id is not None and zona_id in zonas

    def puede_ver_datos_completos(self, zona_id: str | None = None) -> bool:
        return self.tiene("O-01", zona_id)

    def puede_ver_simpatia(self, zona_id: str | None = None) -> bool:
        return self.tiene("O-02", zona_id)

    def puede(self, accion: str) -> bool:
        """Funciones de la interfaz y quién las ve (matriz 4.8)."""
        reglas = {
            "ver_equipo": lambda: self.es_staff or self.tiene("O-08"),
            "gestionar_permisos": lambda: self.es_staff,
            "invitar": lambda: self.es_staff or self.tiene("O-08"),
            "aprobar_cuentas": lambda: self.es_staff or self.tiene("O-08"),
            "suspender": lambda: self.es_staff,
            "designar_director": lambda: self.es_admin,
            "ver_calidad": lambda: self.es_staff or self.tiene("O-07"),
            "crear_tareas": lambda: self.es_staff or self.tiene("O-09"),
            "crear_anuncios": lambda: self.es_staff or self.tiene("O-11"),
            "ver_estadisticas_avanzadas": lambda: self.tiene("O-03"),
            "ver_mapas_calor": lambda: self.tiene("O-04"),
            "ver_ubicacion_equipo": lambda: self.tiene("O-21"),
            "ver_titulares": lambda: self.es_staff,
            "ver_auditoria": lambda: self.es_staff,
            "configurar_sistema": lambda: self.es_admin,
            "exportar": lambda: self.tiene("O-05"),
        }
        f = reglas.get(accion)
        return bool(f and self.activo and f())
