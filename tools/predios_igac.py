"""Predios de Pijao desde la Base Catastral Pública del IGAC (Quindío), para el mapa sin conexión.

Fuente: IGAC, «Base Catastral Pública del Departamento de Quindío» (File Geodatabase, datos abiertos),
licencia Creative Commons Reconocimiento-CompartirIgual 4.0 (CC BY-SA 4.0). El mapa derivado queda con la misma licencia.

Solo se guardan la forma del predio, su código catastral, si es urbano o rural y el área. Nunca datos de propietarios.
Corre en GitHub Actions (Ubuntu con gdal-bin y python3-gdal); no se ejecuta en el computador del equipo.

Uso: python3 tools/predios_igac.py <carpeta.gdb> <salida.geojson>
"""
import json
import sys

from osgeo import ogr, osr

MUNICIPIO = "63548"   # Pijao (código DANE)


def campo_codigo(capa):
    defn = capa.GetLayerDefn()
    nombres = [defn.GetFieldDefn(i).GetName() for i in range(defn.GetFieldCount())]
    for preferido in ("CODIGO", "codigo", "NUMERO_PREDIAL", "numero_predial", "CODIGO_PREDIAL"):
        if preferido in nombres:
            return preferido, nombres
    for n in nombres:
        if "codigo" in n.lower() and "anterior" not in n.lower() and "municipio" not in n.lower():
            return n, nombres
    return None, nombres


def main(gdb, salida):
    ds = ogr.Open(gdb)
    if ds is None:
        sys.exit(f"No se pudo abrir {gdb}")
    destino = osr.SpatialReference()
    destino.ImportFromEPSG(4326)
    destino.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)

    print("Capas de la base:")
    for i in range(ds.GetLayerCount()):
        c = ds.GetLayerByIndex(i)
        print(f"  - {c.GetName()} ({c.GetFeatureCount()} elementos, geometría {ogr.GeometryTypeToName(c.GetGeomType())})")

    rasgos = []
    for i in range(ds.GetLayerCount()):
        capa = ds.GetLayerByIndex(i)
        nombre = capa.GetName()
        if "TERRENO" not in nombre.upper():
            continue
        campo, nombres = campo_codigo(capa)
        print(f"Capa {nombre}: campo de código = {campo}; campos = {nombres}")
        if not campo:
            continue
        zona = "urbano" if nombre.upper().startswith("U") else "rural"
        origen = capa.GetSpatialRef()
        if origen is not None:
            origen.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
        transformar = osr.CoordinateTransformation(origen, destino) if origen is not None else None
        capa.SetAttributeFilter(f"{campo} LIKE '{MUNICIPIO}%'")
        n = 0
        for f in capa:
            g = f.GetGeometryRef()
            if g is None:
                continue
            g = g.Clone()
            area = round(g.GetArea()) if origen is not None and origen.IsProjected() else None
            if transformar is not None:
                g.Transform(transformar)
            g = g.SimplifyPreserveTopology(0.000004)   # ~0,4 m: no cambia la forma y aligera el archivo
            if g is None or g.IsEmpty():
                continue
            props = {"codigo": str(f.GetField(campo) or ""), "zona": zona}
            if area:
                props["area_m2"] = area
            rasgos.append({"type": "Feature", "properties": props, "geometry": json.loads(g.ExportToJson(["COORDINATE_PRECISION=7"]))})
            n += 1
        print(f"  {n} predios de Pijao en {nombre}")

    if not rasgos:
        sys.exit("No se encontraron predios de Pijao: revise los nombres de capas y campos en el registro de arriba.")
    with open(salida, "w", encoding="utf-8") as s:
        json.dump({"type": "FeatureCollection", "features": rasgos}, s, ensure_ascii=False, separators=(",", ":"))
    print(f"Listo: {len(rasgos)} predios en {salida}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
