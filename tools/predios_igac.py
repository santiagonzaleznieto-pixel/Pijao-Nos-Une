"""Predios de Pijao desde la Base Catastral Pública del IGAC (Quindío), para el mapa sin conexión.

Fuente: IGAC, «Base Catastral Pública del Departamento de Quindío» (File Geodatabase, datos abiertos),
licencia Creative Commons Reconocimiento-CompartirIgual 4.0 (CC BY-SA 4.0). El mapa derivado queda con la misma licencia.

Solo se guardan la forma del predio, su código catastral, si es urbano o rural y el área. Nunca datos de propietarios.
Corre en GitHub Actions (Ubuntu con gdal-bin y python3-gdal); no se ejecuta en el computador del equipo.

Uso: python3 tools/predios_igac.py <carpeta.gdb> <salida.geojson> [numeros.geojson]
El tercer archivo (opcional) trae un punto dentro de cada predio con su número, para escribirlo en el mapa.
"""
import json
import sys

from osgeo import ogr, osr

ogr.UseExceptions()

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


def partes_codigo(codigo):
    """Manzana o vereda y número de terreno del código catastral (30 dígitos, o el anterior de 20)."""
    c = "".join(ch for ch in codigo if ch.isdigit())
    if len(c) >= 21:
        manzana, terreno = c[13:17], c[17:21]
    elif len(c) >= 17:
        manzana, terreno = c[9:13], c[13:17]
    else:
        return "", c[-4:].lstrip("0") or c[-4:]
    return (manzana.lstrip("0") or "0"), (terreno.lstrip("0") or "0")


def main(gdb, salida, salida_numeros=None):
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
    numeros = []
    for i in range(ds.GetLayerCount()):
        capa = ds.GetLayerByIndex(i)
        nombre = capa.GetName()
        if not any(p in nombre.upper() for p in ("TERRENO", "PREDIO", "LOTE")):
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
        n = 0
        for f in capa:
            if not str(f.GetField(campo) or "").strip().startswith(MUNICIPIO):
                continue
            g = f.GetGeometryRef()
            if g is None:
                continue
            # El IGAC guarda algunos bordes como curvas (CurvePolygon/MultiSurface): se pasan a líneas rectas.
            g = ogr.ForceToMultiPolygon(g.GetLinearGeometry())
            area = round(g.GetArea()) if origen is not None and origen.IsProjected() else None
            if transformar is not None:
                g.Transform(transformar)
            g = g.SimplifyPreserveTopology(0.000004)   # ~0,4 m: no cambia la forma y aligera el archivo
            if g is None or g.IsEmpty():
                continue
            geojson = g.ExportToJson(["COORDINATE_PRECISION=7"])
            if not geojson:
                continue
            codigo = str(f.GetField(campo) or "")
            manzana, numero = partes_codigo(codigo)
            props = {"codigo": codigo, "zona": zona, "numero": numero, "manzana": manzana}
            if "INFORMAL" in nombre.upper():
                props["informal"] = True
            if area:
                props["area_m2"] = area
            rasgos.append({"type": "Feature", "properties": props, "geometry": json.loads(geojson)})
            punto = g.PointOnSurface()
            if punto is not None and not punto.IsEmpty():
                numeros.append({"type": "Feature", "properties": {"numero": numero, "zona": zona},
                                "geometry": json.loads(punto.ExportToJson(["COORDINATE_PRECISION=7"]))})
            n += 1
        print(f"  {n} predios de Pijao en {nombre}")

    if not rasgos:
        # Diagnóstico visible en GitHub (anotaciones): capas, campos y un ejemplo de valores de cada capa.
        for i in range(ds.GetLayerCount()):
            c = ds.GetLayerByIndex(i)
            c.SetAttributeFilter(None)
            c.ResetReading()
            f = c.GetNextFeature()
            ejemplo = {} if f is None else {k: str(v)[:40] for k, v in list(f.items().items())[:8]}
            print(f"::warning::Capa {c.GetName()} ({c.GetFeatureCount()}): {ejemplo}")
        sys.exit("No se encontraron predios de Pijao: revise los nombres de capas y campos en el registro de arriba.")
    with open(salida, "w", encoding="utf-8") as s:
        json.dump({"type": "FeatureCollection", "features": rasgos}, s, ensure_ascii=False, separators=(",", ":"))
    if salida_numeros:
        with open(salida_numeros, "w", encoding="utf-8") as s:
            json.dump({"type": "FeatureCollection", "features": numeros}, s, ensure_ascii=False, separators=(",", ":"))
    print(f"Listo: {len(rasgos)} predios en {salida} y {len(numeros)} números")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
