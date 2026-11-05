# Pijao nos une (Android, Python)

1. Crea el proyecto en Supabase y aplica `supabase/migrations/0001…0008` en orden.
2. Define `PIJAO_SUPABASE_URL` y `PIJAO_SUPABASE_ANON_KEY` (la clave `anon`, nunca la `service_role`).
3. Pruebas: `python -m unittest discover -s tests -t .`
4. Probar en el computador: `pip install -r requirements.txt && python main.py`
5. APK de descarga directa (Linux o WSL): `pip install buildozer && buildozer android debug` → `bin/*.apk`

Estado (v0.10.1 · Fase 2, parte 1): bienvenida animada, ingreso, registro con código de invitación SIN correo de confirmación
(función `registrar-con-codigo` en `supabase/functions`), acuerdos y curso de ingreso que activan a los colaboradores, Inicio al estilo de la
referencia, mapa real con GPS robusto (última ubicación conocida, avisos claros), «marcar en el mapa» (ubicación manual y registro diferido),
filtros, visita completa en pasos (vivienda, resultado, hogar, personas, necesidades, autorización con firma en pantalla, cierre y calidad),
tareas y anuncios, permisos opcionales con plantillas y vencimiento, equipo, perfil y pantalla de errores.
Pendiente de la Fase 2: foto de fachada con la cámara, zonas con polígonos, Reconocimiento, rutas, jornada con ubicación en vivo y SOS, mapa sin
conexión, verificación en dos pasos, «Ver como», modo práctica, ficha de persona (línea de tiempo, cumpleaños, derechos), historial y edición de
visitas, eventos y turnos, desempeño y salida del equipo.
Revisión sin celular: `python tools/revisar_codigo.py` y `python tools/probar_ui.py` (recorre toda la interfaz con un emulador de Kivy).
Pruebas: `python -m unittest discover -s tests -t .`

Construcción del APK: `.github/workflows/apk.yml` (Ubuntu 22.04, Python 3.11, Java 17, herramientas con versión fija, descargas en caché).
Si la construcción falla, la pestaña «Summary» de la ejecución muestra «Por qué falló la construcción» con el error real.
Servidor ya preparado para las siguientes partes (migraciones 0011 y 0012): zonas con polígono, reconocimiento, edición de visitas y atención de SOS.
