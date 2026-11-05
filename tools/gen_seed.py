"""Genera supabase/migrations/0008_datos_iniciales.sql a partir de los catálogos y reglas de Python.

Así los valores de la app y los de la base de datos no se pueden desalinear.
Uso:  python tools/gen_seed.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from pijao.core import consentimiento  # noqa: E402
from pijao.core.catalogos import CATALOGOS  # noqa: E402
from pijao.core.permisos import PERMISOS, PLANTILLAS  # noqa: E402
from pijao.core.reglas import PARAMS_POR_DEFECTO  # noqa: E402


def q(s) -> str:
    if s is None:
        return "null"
    return "'" + str(s).replace("'", "''") + "'"


TEXTOS = {
    ("autorizacion", consentimiento.VERSION_TEXTO): consentimiento.TEXTO_CORTO.format(
        nombre="[nombre]", correo="[correo de atención]", whatsapp="[número de atención]"),
    ("aviso_privacidad", consentimiento.VERSION_TEXTO):
        "Campaña Pijao Nos Une (candidato Jaime González) recoge datos de su vivienda y, si usted lo permite, de contacto, "
        "para conocer las necesidades de las familias, informar sobre la campaña y construir el programa de gobierno. "
        "Usted puede consultar, corregir, borrar sus datos o revocar su autorización cuando quiera, por [correo] o [WhatsApp]. "
        "No se venden ni se entregan a terceros y se eliminan al terminar la campaña. Política completa: [enlace].",
    ("acuerdo_confidencialidad", consentimiento.VERSION_TEXTO):
        "Me comprometo a mantener en reserva toda la información de personas y hogares a la que acceda por la app, a no "
        "compartir capturas ni listas, a no usar los datos para fines propios y a reportar cualquier pérdida del teléfono.",
    ("codigo_conducta", consentimiento.VERSION_TEXTO):
        "Respeto a toda persona. Nada de compra de votos ni ofrecimiento de favores. No presionar ni amenazar. No desinformar "
        "ni atacar la vida privada. Privacidad de los datos. No fotografiar menores. Identificarme siempre. Cumplir las normas "
        "electorales y denunciar irregularidades. No portar armas ni consumir alcohol durante la jornada.",
    ("politica_tratamiento", consentimiento.VERSION_TEXTO):
        "[Texto de la política de tratamiento de datos personales: lo redacta el abogado antes de usar la app con familias reales.]",
}


def main() -> None:
    sal = ["-- Pijao Nos Une · 0008 · datos iniciales (GENERADO por tools/gen_seed.py; no editar a mano)", ""]

    sal.append("insert into public.catalogos (catalogo, clave, etiqueta, orden) values")
    filas = []
    for cod, cat in CATALOGOS.items():
        for i, (clave, etiqueta) in enumerate(cat["opciones"]):
            filas.append(f"  ({q(cod)}, {q(clave)}, {q(etiqueta)}, {i})")
    sal.append(",\n".join(filas))
    sal.append("on conflict (catalogo, clave) do update set etiqueta = excluded.etiqueta, orden = excluded.orden;\n")

    sal.append("insert into public.permisos_catalogo (codigo, nombre, descripcion, riesgo, requiere_2fa, acepta_zonas) values")
    filas = [f"  ({q(p.codigo)}, {q(p.nombre)}, {q(p.descripcion)}, {q(p.riesgo)}, {str(p.requiere_2fa).lower()}, {str(p.acepta_zonas).lower()})"
             for p in PERMISOS.values()]
    sal.append(",\n".join(filas))
    sal.append("on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, "
               "riesgo = excluded.riesgo, requiere_2fa = excluded.requiere_2fa, acepta_zonas = excluded.acepta_zonas;\n")

    sal.append("insert into public.plantillas_permisos (nombre, codigos, limitar_a_zona) values")
    filas = []
    for nombre, d in PLANTILLAS.items():
        arr = "array[" + ",".join(q(c) for c in d["permisos"]) + "]::text[]"
        filas.append(f"  ({q(nombre)}, {arr}, {str(d['limitar_a_zona']).lower()})")
    sal.append(",\n".join(filas))
    sal.append("on conflict (nombre) do update set codigos = excluded.codigos, limitar_a_zona = excluded.limitar_a_zona;\n")

    sal.append("insert into public.configuracion (clave, valor) values")
    filas = [f"  ({q(k)}, {q(json.dumps(v))}::jsonb)" for k, v in PARAMS_POR_DEFECTO.items()]
    sal.append(",\n".join(filas))
    sal.append("on conflict (clave) do nothing;\n")

    sal.append("insert into public.textos_legales (tipo, version, contenido, vigente, es_borrador) values")
    filas = [f"  ({q(t)}, {q(v)}, {q(c)}, true, true)" for (t, v), c in TEXTOS.items()]
    sal.append(",\n".join(filas))
    sal.append("on conflict (tipo, version) do nothing;\n")

    destino = RAIZ / "supabase" / "migrations" / "0008_datos_iniciales.sql"
    destino.write_text("\n".join(sal), encoding="utf-8")
    print("Escrito", destino, f"({destino.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
