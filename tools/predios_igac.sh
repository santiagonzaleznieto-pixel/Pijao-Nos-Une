#!/usr/bin/env bash
# Predios de Pijao (IGAC, CC BY-SA 4.0) para el mapa sin conexión de la app y del panel. Corre en GitHub Actions.
# Uso: tools/predios_igac.sh <salida.pmtiles> <salida.json> [letras.pbf]
# Con el tercer archivo baja también las letras de los números (Noto Sans, licencia OFL, de Protomaps) para escribir el
# número de cada predio en el mapa sin conexión.
# Si el IGAC no responde, deja la versión sin predios y avisa: la app y el panel siguen funcionando sin esa capa.
set -uo pipefail
SALIDA="$1"
INFO="$2"
LETRAS="${3:-}"
URL_LETRAS="https://raw.githubusercontent.com/protomaps/basemaps-assets/main/fonts/Noto%20Sans%20Medium/0-255.pbf"
DIR="$(cd "$(dirname "$0")" && pwd)"
URL="https://www.arcgis.com/sharing/rest/content/items/cd3d983dfda94302807af70f88cd50c8/data"   # 63_QUINDIO.zip

fallar() { echo "::warning::Predios del IGAC no disponibles ($1): el mapa sale sin la capa de predios."; exit 0; }

python3 -c "from osgeo import ogr" 2>/dev/null || { sudo apt-get update -qq && sudo apt-get install -y -qq gdal-bin python3-gdal >/dev/null; } || fallar "no se pudo instalar GDAL"
python3 -c "from osgeo import ogr; print('GDAL', ogr.GetDriverByName('OpenFileGDB') is not None)" || fallar "GDAL de Python no carga"
TMP="$(mktemp -d)"
curl -sSL --retry 3 --max-time 600 -o "$TMP/quindio.zip" "$URL" || fallar "descarga"
unzip -q "$TMP/quindio.zip" -d "$TMP/quindio" || fallar "archivo dañado"
GDB="$(find "$TMP/quindio" -type d -name '*.gdb' | head -1)"
[ -n "$GDB" ] || fallar "no viene la base .gdb"
echo "Base: $GDB"; ls "$TMP/quindio" | head
if ! python3 "$DIR/predios_igac.py" "$GDB" "$TMP/predios.geojson" "$TMP/numeros.geojson" > "$TMP/registro.txt" 2>&1; then
  cat "$TMP/registro.txt"
  echo "::warning::Predios, registro: $(tail -c 3500 "$TMP/registro.txt" | tr '
' ' | ')"
  fallar "no se encontraron los predios de Pijao"
fi
cat "$TMP/registro.txt"
rm -f "$SALIDA"
# Dos capas en el mismo archivo: «predios» (las formas) y «numeros» (un punto dentro de cada predio con su número).
ogr2ogr -f GPKG "$TMP/predios.gpkg" "$TMP/predios.geojson" -nln predios || fallar "conversión de formas"
NUMEROS=false
if [ -s "$TMP/numeros.geojson" ] && ogr2ogr -f GPKG -update "$TMP/predios.gpkg" "$TMP/numeros.geojson" -nln numeros; then NUMEROS=true; fi
ogr2ogr -f PMTiles "$SALIDA" "$TMP/predios.gpkg" -dsco MINZOOM=12 -dsco MAXZOOM=16 \
  -dsco NAME="Predios de Pijao" -dsco DESCRIPTION="IGAC, Base Catastral Pública del Quindío (CC BY-SA 4.0)" || fallar "conversión"
# Letras para escribir los números (si no bajan, el mapa sale con los predios pero sin números).
if [ "$NUMEROS" = true ] && [ -n "$LETRAS" ]; then
  if curl -sSLf --retry 3 --max-time 120 -o "$TMP/letras.pbf" "$URL_LETRAS" && [ "$(stat -c %s "$TMP/letras.pbf")" -gt 10000 ]; then
    mkdir -p "$(dirname "$LETRAS")" && cp "$TMP/letras.pbf" "$LETRAS"
  else
    echo "::warning::No se pudieron bajar las letras de los números: el mapa sale sin el número de cada predio."
    NUMEROS=false
  fi
fi
N=$(python3 -c "import json;print(len(json.load(open('$TMP/predios.geojson'))['features']))")
FECHA=$(date -u +%Y-%m-%d)
printf '{"disponible": true, "numeros": '"$NUMEROS"', "predios": %s,"fecha": "%s", "fuente": "IGAC, Base Catastral Pública del Quindío (CC BY-SA 4.0)"}\n' "$N" "$FECHA" > "$INFO"
echo "Predios de Pijao: $N ($(du -k "$SALIDA" | cut -f1) KB)"
echo "PREDIOS=$N" >> "${GITHUB_ENV:-/dev/null}"
