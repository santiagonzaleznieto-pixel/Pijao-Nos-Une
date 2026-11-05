#!/usr/bin/env bash
# Aplica todas las migraciones de supabase/migrations a una base supabase/postgres de Docker (gratis y local)
# y corre las pruebas SQL de supabase/tests. Lo usan el desarrollador y la integración continua (.github/workflows).
#
#   bash tools/probar_migraciones.sh
#
# Requisitos: Docker. No usa ninguna cuenta ni servicio de pago.
set -euo pipefail

IMAGEN="${PIJAO_IMAGEN_PG:-public.ecr.aws/supabase/postgres:17.6.1.054}"
NOMBRE="pijao-pg-pruebas-$$"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"

limpiar() { docker rm -f "$NOMBRE" >/dev/null 2>&1 || true; }
trap limpiar EXIT

echo "› Iniciando $IMAGEN"
docker run -d --name "$NOMBRE" -e POSTGRES_PASSWORD=postgres "$IMAGEN" >/dev/null

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

for f in "$RAIZ"/supabase/migrations/*.sql; do
  echo "› Migración $(basename "$f")"
  psql_en < "$f"
done

for t in "$RAIZ"/supabase/tests/*.sql; do
  echo "› Pruebas $(basename "$t")"
  psql_en < "$t"
done
echo "✔ Migraciones y pruebas SQL correctas"
