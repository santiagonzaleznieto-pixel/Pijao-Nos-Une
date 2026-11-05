"""Plan de cierre (16.9): borra del almacenamiento las fotos que devolvió rpc_plan_cierre.

Supabase no permite borrar archivos con SQL, así que este paso se hace con la API, usando la clave service_role
SOLO en el computador del Administrador (nunca en la app ni en el repositorio).

    set PIJAO_SUPABASE_URL=https://xxxx.supabase.co
    set PIJAO_SERVICE_ROLE_KEY=...            (la clave se escribe en la terminal; no se guarda)
    python tools/cierre_fotos.py rutas.json   (rutas.json = el campo rutas_fotos_para_borrar de rpc_plan_cierre)
"""
from __future__ import annotations

import json
import os
import sys

import requests

LOTE = 100


def borrar(url: str, clave: str, rutas: list[str]) -> int:
    h = {"apikey": clave, "Authorization": f"Bearer {clave}", "Content-Type": "application/json"}
    borradas = 0
    for i in range(0, len(rutas), LOTE):
        lote = rutas[i:i + LOTE]
        r = requests.delete(f"{url}/storage/v1/object/fotos", headers=h, data=json.dumps({"prefixes": lote}), timeout=60)
        r.raise_for_status()
        borradas += len(lote)
        print(f"Borradas {borradas} de {len(rutas)}")
    return borradas


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    url, clave = os.environ.get("PIJAO_SUPABASE_URL", ""), os.environ.get("PIJAO_SERVICE_ROLE_KEY", "")
    if not url or not clave:
        print("Faltan PIJAO_SUPABASE_URL o PIJAO_SERVICE_ROLE_KEY")
        return 2
    with open(sys.argv[1], encoding="utf-8") as fh:
        rutas = json.load(fh)
    if input(f"Se borrarán {len(rutas)} fotos para siempre. Escriba BORRAR para continuar: ").strip() != "BORRAR":
        print("Cancelado.")
        return 1
    borrar(url.rstrip("/"), clave, rutas)
    print("Listo. Guarde este resultado junto al acta de eliminación.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
