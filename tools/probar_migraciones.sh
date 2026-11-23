#!/usr/bin/env bash
# Aplica todas las migraciones de supabase/migrations a una base supabase/postgres de Docker (gratis y local)
# y corre las pruebas SQL de supabase/tests. Lo usan el desarrollador y la integración continua (.github/workflows).
#
#   bash tools/probar_migraciones.sh
#
# Requisitos: Docker. No usa ninguna cuenta ni servicio de pago.
set -euo pipefail
export LC_ALL=C   # orden fijo de los archivos: las pruebas dependen unas de otras (fase1_seguridad antes que fase1_web)

IMAGEN="${PIJAO_IMAGEN_PG:-public.ecr.aws/supabase/postgres:17.6.1.054}"
NOMBRE="pijao-pg-pruebas-$$"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"

limpiar() { docker rm -f "$NOMBRE" >/dev/null 2>&1 || true; }
trap limpiar EXIT

echo "› Iniciando $IMAGEN"
# El registro de imágenes a veces falla por un momento: se reintenta antes de rendirse.
for intento in 1 2 3 4; do
  if docker pull -q "$IMAGEN" >/dev/null 2>&1; then break; fi
  echo "::warning::No se pudo bajar la imagen de la base (intento $intento de 4)"
  sleep $((intento * 15))
done
if ! docker run -d --name "$NOMBRE" -e POSTGRES_PASSWORD=postgres "$IMAGEN" >/dev/null 2>/tmp/docker_run.txt; then
  echo "::error title=Docker::No arrancó la base de pruebas: $(tr '\n' ' ' < /tmp/docker_run.txt | tail -c 800)"
  exit 125
fi

echo "› Esperando a que la base esté lista"
for _ in $(seq 1 60); do
  if docker exec "$NOMBRE" pg_isready -U postgres -h localhost >/dev/null 2>&1; then break; fi
  sleep 2
done
sleep 3   # los scripts iniciales de Supabase terminan justo después de aceptar conexiones

psql_en() {   # psql dentro del contenedor, como el usuario «postgres» (el mismo que usan las migraciones en Supabase)
  docker exec -i -e PGPASSWORD=postgres -e PGOPTIONS="-c client_min_messages=warning" "$NOMBRE" psql -v ON_ERROR_STOP=1 -q -U postgres -h localhost -d postgres "$@"
}

echo "› Preparando lo que en Supabase crean los servicios de autenticación y almacenamiento"
docker exec -i -e PGPASSWORD=postgres "$NOMBRE" psql -v ON_ERROR_STOP=1 -q -U supabase_admin -h localhost -d postgres \
  < "$RAIZ/supabase/tests/entorno/preparar.sql"

# Si algo falla, el error queda también como anotación de GitHub (se ve sin iniciar sesión en la página del flujo).
SALIDA="$(mktemp)"
correr() {   # $1 = archivo SQL, $2 = qué es
  if ! psql_en < "$1" > "$SALIDA" 2>&1; then
    cat "$SALIDA"
    echo "::error title=$2 $(basename "$1")::$(grep -v '^NOTICE:  ok' "$SALIDA" | tail -c 1800 | tr '\n' ' ')"
    exit 3
  fi
  cat "$SALIDA"
}

for f in "$RAIZ"/supabase/migrations/*.sql; do
  echo "› Migración $(basename "$f")"
  correr "$f" "Migración"
done

for t in "$RAIZ"/supabase/tests/*.sql; do
  echo "› Pruebas $(basename "$t")"
  correr "$t" "Pruebas"
done
echo "✔ Migraciones y pruebas SQL correctas"
