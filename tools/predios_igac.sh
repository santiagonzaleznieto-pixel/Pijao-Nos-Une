#!/usr/bin/env bash
# Predios de Pijao (IGAC, CC BY-SA 4.0) para el mapa sin conexión de la app y del panel. Corre en GitHub Actions.
# Uso: tools/predios_igac.sh <salida.pmtiles> <salida.json>
# Si el IGAC no responde, deja la versión sin predios y avisa: la app y el panel siguen funcionando sin esa capa.
set -uo pipefail
SALIDA="$1"
INFO="$2"
DIR="$(cd "$(dirname "$0")" && pwd)"
URL="https://www.arcgis.com/sharing/rest/content/items/cd3d983dfda94302807af70f88cd50c8/data"   # 63_QUINDIO.zip

fallar() { echo "::warning::Predios del IGAC no disponibles ($1): el mapa sale sin la capa de predios."; exit 0; }

command -v ogr2ogr >/dev/null || { sudo apt-get update -qq && sudo apt-get install -y -qq gdal-bin python3-gdal >/dev/null; } || fallar "no se pudo instalar GDAL"
TMP="$(mktemp -d)"
curl -sSL --retry 3 --max-time 600 -o "$TMP/quindio.zip" "$URL" || fallar "descarga"
unzip -q "$TMP/quindio.zip" -d "$TMP/quindio" || fallar "archivo dañado"
GDB="$(find "$TMP/quindio" -type d -name '*.gdb' | head -1)"
[ -n "$GDB" ] || fallar "no viene la base .gdb"
python3 "$DIR/predios_igac.py" "$GDB" "$TMP/predios.geojson" || fallar "no se encontraron los predios de Pijao"
rm -f "$SALIDA"
ogr2ogr -f PMTiles "$SALIDA" "$TMP/predios.geojson" -nln predios -dsco MINZOOM=12 -dsco MAXZOOM=16 \
  -dsco NAME="Predios de Pijao" -dsco DESCRIPTION="IGAC, Base Catastral Pública del Quindío (CC BY-SA 4.0)" || fallar "conversión"
N=$(python3 -c "import json;print(len(json.load(open('$TMP/predios.geojson'))['features']))")
FECHA=$(date -u +%Y-%m-%d)
printf '{"disponible": true, "predios": %s, "fecha": "%s", "fuente": "IGAC, Base Catastral Pública del Quindío (CC BY-SA 4.0)"}\n' "$N" "$FECHA" > "$INFO"
echo "Predios de Pijao: $N ($(du -k "$SALIDA" | cut -f1) KB)"
echo "PREDIOS=$N" >> "${GITHUB_ENV:-/dev/null}"
