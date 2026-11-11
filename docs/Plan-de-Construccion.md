# PIJAO NOS UNE
## Plan de construcción por fases, hasta el 100 %

| Dato | Detalle |
|---|---|
| Versión del plan | 1.0 · cobertura verificada automáticamente (todos los códigos P, R, O, C, N y los hallazgos) y por una revisión de ECC línea por línea del documento maestro, cuyas 31 omisiones y 8 ajustes de orden ya están incorporados |
| Fecha | 4 de noviembre de 2026 |
| Se basa en | Documento maestro v1.1 (`docs/Pijao-Nos-Une_Documento-Maestro_Fase1.md`) |
| Punto de partida | App v0.10.1 · Fase 2, parte 1 (estado detallado en la sección 24 del documento maestro) |
| Restricción de costo | **US$ 0 recurrentes:** solo herramientas gratuitas y de código abierto (ver `docs/Analisis-Costo-Cero.md`) |
| Fecha límite | Domingo 31 de octubre de 2027 (elecciones). Cierre de datos hasta febrero de 2028 |
| Alcance | **Todo** lo que describe el documento maestro: secciones 1 a 26, pantallas P-01 a P-53, reglas R-01 a R-45, permisos O-01 a O-22, catálogos C-01 a C-20, funciones nuevas N-01 a N-15, los 18 hallazgos de seguridad, las listas de lanzamiento de 22.4 y 22.5 y las decisiones y puntos legales de la sección 23. El anexo final asigna una fase a cada uno |

---

## 0. Cómo está organizado

### 0.1 Las cuatro fases, en el orden de trabajo

| Orden | Fase | Tipo | Fechas | Resultado al terminar |
|---|---|---|---|---|
| 1 | **Fase 1 · Cimientos, seguridad y núcleo de campo** | Construcción | 5 de noviembre de 2026 a 31 de enero de 2027 | Una app segura y estable para registrar viviendas, hogares y personas, con y sin señal, lista para el piloto con datos reales |
| 2 | **Fase 2 · Diseño visual y estético** | **Exclusivamente diseño** | 1 de febrero a 15 de marzo de 2027 (en paralelo con el piloto) | El sistema de diseño completo, las 53 pantallas diseñadas y la nueva imagen aplicada a todo lo construido en la Fase 1 |
| 3 | **Fase 3 · Operación del equipo, territorio y comunidad** | Construcción | 16 de marzo a 31 de mayo de 2027 (despliegue al equipo desde el 15 de abril) | El equipo completo trabajando con zonas, jornada y SOS, calidad, estadísticas, escucha ciudadana, programa de gobierno y voluntariado |
| 4 | **Fase 4 · Campaña pública, finanzas, día de elecciones y cierre** | Construcción | 1 de junio a 30 de septiembre de 2027, más la operación hasta febrero de 2028 | Comunicaciones, propaganda, finanzas, Día de elecciones probado con simulacros y el plan de cierre de datos listo |

### 0.2 Por qué este orden

1. **Primero la seguridad y el núcleo de campo (Fase 1).** No se puede salir a terreno con datos reales mientras la base del teléfono siga sin cifrar o el servidor acepte autorizaciones sin evidencia (hallazgos de 24.3). Además, la decisión de tecnología (React Native con Expo o Kivy) se toma al comienzo. Si se toma tarde, se rehace todo lo demás.
2. **El diseño va de segundo (Fase 2), por cuatro razones:**
   - **Diseñar antes de tener el núcleo funcional** obligaría a rediseñar cuando el piloto muestre cómo se trabaja de verdad.
   - **Diseñar al final** obligaría a rehacer más de 50 pantallas ya construidas y a reentrenar a 300 colaboradores cuando la interfaz cambie a pocas semanas de la elección.
   - **Diseñar entre el núcleo y la expansión** permite usar los resultados del piloto de febrero. Así el equipo aprende **una sola vez** la interfaz definitiva antes del despliegue de abril, y todo lo que se construya en las fases 3 y 4 nace ya con el diseño final.
   - **Mientras se diseña no se para nada:** el piloto corre en paralelo con la versión de la Fase 1.
3. **La operación del equipo y la comunidad (Fase 3) va antes de la campaña pública.** El trabajo de campo debe arrancar con «conocer y escuchar» antes de que se abra la propaganda (2.2). El despliegue al equipo completo debe estar hecho antes de junio.
4. **La campaña pública, el dinero y el Día de elecciones van al final (Fase 4).** Siguen el calendario legal:
   - Finanzas, antes de la inscripción de candidaturas (30 de junio al 31 de julio de 2027).
   - Comunicaciones y propaganda, antes de la propaganda en medios (desde el 5 de agosto).
   - Día de elecciones, probado con simulacros el 19 de septiembre y el 10 de octubre.

### 0.3 Una excepción con fecha

**Si la candidatura se inscribe por firmas** (decisión 23.1-1, que vence el 30 de noviembre de 2026), el módulo de apoyos ciudadanos (14.10) **sube a la Fase 1**. La recolección abrió el 31 de octubre de 2026 y cierra el 30 de junio de 2027, así que la herramienta debe existir lo antes posible. Si la candidatura va por partido o coalición, el módulo no se construye.

### 0.4 Reglas que aplican a todas las fases

Una tarea solo cuenta como **terminada** si cumple todo esto:

1. **Control de cambios:** se hace en una rama de git con solicitud de cambio (pull request). Nada de subir archivos .zip por la web.
2. **Pruebas:** tiene pruebas automáticas. Las reglas R-xx tienen su propia prueba y las reglas por fila tienen pruebas pgTAP por rol y por permiso.
3. **Integración continua:** la integración continua pasa (pruebas, revisión estática, pruebas de reglas por fila) antes de construir la app.
4. **Revisión con ECC antes de unir:**
   - `ecc:code-reviewer` en todo cambio.
   - `ecc:security-reviewer` si toca datos personales, permisos o ingreso.
   - `ecc:database-reviewer` si toca migraciones.
   - El revisor del lenguaje: `ecc:typescript-reviewer` y `ecc:react-reviewer`, o `ecc:python-reviewer` si se sigue con Kivy.
5. **Migraciones:** se aplican con Supabase CLI, **primero en el ambiente de pruebas** y después en producción. Nunca hay datos reales en el ambiente de pruebas.
6. **Valores de control:** ningún valor de 19.1 queda escrito fijo en la app. Todos se leen de la configuración (P-42).
7. **Textos:** todos los textos visibles viven en un solo archivo de textos (Apéndice B-10), en español de Colombia y tratando de «usted».
8. **Aspecto visual:** cada pantalla usa los componentes y los colores del tema central, nunca valores sueltos. Así la Fase 2 cambia el aspecto sin reescribir pantallas.
9. **Datos personales:** ningún registro de errores, notificación ni mensaje técnico contiene datos personales.
10. **Líneas rojas:** se verifica que el cambio respeta 2.4 y R-42. Sin campos de favores, sin intención de voto individual y sin datos de menores.
11. **Documentación:** el documento maestro y el README se actualizan si el cambio altera lo descrito.
12. **Entrega:** cada versión lleva etiqueta (`vX.Y.Z`) y una nota en la pantalla «Novedades».

**Agentes y habilidades de ECC que se usan en todas las fases de construcción:**
- **Planear:** `ecc:planner` y `ecc:architect`.
- **Construir y corregir:** las habilidades `orch-add-feature`, `orch-fix-defect`, `orch-change-feature` y `orch-refine-code`, con `ecc:tdd-guide` para escribir primero las pruebas.
- **Revisar:** `ecc:code-reviewer`, `ecc:security-reviewer`, `ecc:database-reviewer` y `ecc:silent-failure-hunter`.
- **Probar de punta a punta:** `ecc:e2e-runner`.
- **Cerrar la entrega:** las habilidades `verification-loop`, `delivery-gate` y `database-migrations`.

---

## Fase 1 · Cimientos, seguridad y núcleo de campo

**Fechas:** 5 de noviembre de 2026 a 31 de enero de 2027 (13 semanas).
**Objetivo:** que un colaborador pueda registrar una vivienda, su hogar y sus personas con autorización válida, con o sin señal, sin poner en riesgo ningún dato, y que el Director y el Administrador puedan aprobar, dar permisos, configurar y vigilar el sistema.

**Tramos internos:**
- **Tramo 1A (5 al 30 de noviembre):** bloques 1.0 a 1.3. Las correcciones del servidor sirven con cualquier tecnología.
- **Tramo 1B (1 de diciembre al 10 de enero):** bloques 1.4 a 1.7.
- **Tramo 1C (11 al 31 de enero):** bloques 1.8 a 1.14 y la preparación del piloto.

**Avance al 7 de noviembre de 2026** (rama `fase-1/cimientos-seguridad`): **la construcción de la Fase 1 está terminada.** Lo que falta no es programación: lo hace el equipo de la campaña, y está en la lista `docs/Pendientes-del-Equipo.md`. Se puede empezar la Fase 2 de diseño.

| Bloque | Estado | Detalle |
|---|---|---|
| 1.0 Preparación sin código | ⏳ Del equipo | Decisión 23.1-1 tomada: **partido o coalición**, así que el bloque 1.14 (firmas) no se construye. El abogado, los textos legales, las decisiones de 23.1 y los insumos están en `docs/Pendientes-del-Equipo.md`. Ya hay borradores del guion de visita, de las preguntas frecuentes y del curso, cargados en la app para que el abogado los revise |
| 1.1 Decisión de tecnología | ✅ Tomada, falta probarla en el teléfono | React Native + Expo (decisión del Administrador). Viabilidad a costo cero verificada (`docs/Analisis-Costo-Cero.md`). La prueba en un teléfono de 2 GB la hace el equipo (`docs/Prueba-Tecnica.md`). Android 8 como mínimo y API 36 como objetivo |
| 1.2 Infraestructura | ✅ Construida | Pruebas en la integración continua antes de construir (Python, app, sitio y SQL en Docker); firma fija y APK en Releases; versión en un solo lugar; versión mínima obligatoria; reporte de errores en una tabla propia; salud de la flota; respaldo propio (`tools/respaldo.ps1`); tarea que mantiene activo el plan gratuito; guía `docs/Entrega-y-Firma.md`. **Del equipo:** crear las llaves y cargar los secretos, el segundo custodio y programar los respaldos |
| 1.3 Seguridad del servidor | ✅ En producción | Migración 0013 (A1–A8, M1–M7, R-09 sin conexión, almacenamiento, cifrado y rotación, alertas, control de versión y descarga por zonas), aplicada y verificada en producción. Registro abierto desactivado, contraseña de 12 y TOTP activos |
| 1.4 a 1.9 App de campo (`app/`) | ✅ Construida | Reglas de negocio en TypeScript; motor de sincronización (24.4, C2, A5); almacén cifrado SQLCipher con llave en Keystore (C1); sesión en el almacén seguro; dos pasos; borrado remoto, límite de dispositivos y versión mínima; bloqueo con huella y **«Ocultar pantalla»** (5.16); sin capturas de pantalla. Pantallas P-01 a P-16, P-18, P-20, P-35, P-44, P-47 y P-48, con mapa sin conexión, el asistente de 12 pasos con foto sellada y firma, y el texto de autorización vigente (A1) |
| 1.5 Cuentas y sesiones | ✅ Construida | Migración **0016**: sesiones por rol (R-33), suspensión automática a los 30 días, R-45 y avisos de teléfono nuevo («No fui yo») y de contraseña cambiada. P-07 recuperar el acceso con código por correo. **Límite conocido:** el bloqueo de 15 minutos tras 5 intentos por cuenta necesita un gancho de Auth de un plan de pago; queda el límite por dirección de Supabase. P-07 necesita el SMTP de Gmail de la campaña (tarea del equipo) |
| 1.10 y 1.13 Panel web y páginas públicas (`web/`) | ✅ Construidos | Migración **0014** en producción. Panel con ingreso de dos pasos: P-36, P-37, P-41, P-42, P-43, P-35, mapa del avance, **métricas del piloto** y avisos. Páginas públicas P-50, P-52 y P-53. Se publica en GitHub Pages desde `main` cuando el equipo active Pages |
| 1.11 Paneles, guion y preguntas | ✅ Construidos | Migración **0017**: el **guion de visita** y las **preguntas frecuentes** se publican con versiones en P-42 y la app los muestra sin señal (Más → Guion y preguntas, y en el paso «Antes de empezar»). **Revisión mensual de permisos:** aviso automático al Director y al Administrador el día 1 de cada mes (4.5 y R-04) |
| 1.12 Modo práctica | ✅ Construido | P-47 con datos de ejemplo separados, sin efecto en las estadísticas ni en las métricas |
| 1.15 Pruebas y piloto | 🟡 Lo automático está hecho | **Métricas del piloto** sin datos personales (22.3): tiempo por registro, meta de 90 segundos, GPS, registros sin señal, envíos y calidad, en el tablero del panel. Pruebas automáticas: 81 en jest, 26 en el sitio, las de Python y las comprobaciones SQL en Docker de las migraciones 0013 a 0017. **Del equipo:** las pruebas con el teléfono real (gama baja, tres días sin señal, teléfono perdido, restauración) y la selección de los colaboradores del piloto |

### 1.0 Preparación sin código (la «Fase 0» del documento maestro)

- [ ] Contratar al abogado electoral y de protección de datos.
- [ ] Redactar con el abogado los textos legales: política de tratamiento y aviso de privacidad (P-53), texto de autorización (16.4), acuerdo de confidencialidad, código de conducta (10.7), política de seguridad y compromiso de tratamiento de datos. Se cargan como textos versionados.
- [ ] Puntos legales que el abogado debe resolver **en esta fase** (23.2):
  - 23.2-1: circulares 001 de 2022 y 002 de 2026 de la SIC.
  - 23.2-2: inscripción en el RNBD.
  - 23.2-3: alojamiento de los datos fuera de Colombia.
  - 23.2-4: si se guarda la simpatía.
  - 23.2-5: plazos de consultas, reclamos e incidentes.
  - 23.2-6: menores de edad.
  - 23.2-7: servidores públicos y contratistas.
  - 23.2-16: conservación de documentos contables frente al borrado.
  - 23.2-17: listados oficiales.
- [ ] Puntos legales que el abogado **abre** ahora y cierra en la Fase 4: 23.2-9 (financiación) y 23.2-11 (inhabilidades).
- [ ] Decisiones de la sección 23.1, todas con fecha límite del 30 de noviembre de 2026:
  - 1: forma de inscripción.
  - 3: tipo de vinculación del equipo.
  - 4: tamaño del equipo y teléfonos.
  - 5: proveedor de mapas.
  - 8: visibilidad por defecto.
  - 9: no incluir datos ampliados sensibles.
  - 11: dominio y correo institucional.
  - 12: presupuesto de tecnología.
  - 13: suplente del Administrador.
  - 14: inicio del trabajo de campo.
  - 15: alcance geográfico.
  - 16: cartografía.
  - 17: tecnología.
  - 18: mapa sin conexión.
  - 19: segundo custodio.
- [ ] Decisión 23.1-2 (gerente de campaña): a más tardar el 31 de enero de 2027.
- [ ] Conseguir los **logos en vector** y la guía de marca. Es un insumo de la Fase 2.
- [ ] Conseguir la **lista oficial de barrios y veredas** con sus límites (IGAC, DANE u OpenStreetMap).
- [ ] Revisar con el Director los catálogos C-01 a C-20 y la lista de ejes del programa (11.3).
- [ ] Validar con el Director el modelo de datos (sección 8) y la tabla de protección estándar (7.4).
- [ ] Abrir solo cuentas gratuitas y sin tarjeta (ver `docs/Analisis-Costo-Cero.md`): Supabase en el **plan gratuito**, en la región más cercana a Colombia; Firebase (solo para las notificaciones push); una cuenta de Gmail de la campaña. No hay dominio propio: se usa un subdominio gratuito.
- [ ] Integraciones externas de 8.13:
  - Ahora: geocodificación, notificaciones push y almacenamiento de respaldos.
  - En la Fase 4: canal de difusión de WhatsApp, envío uno a uno desde el teléfono del colaborador, correo por SMTP de Gmail y formatos del CNE. No se usan APIs de SMS ni de WhatsApp Business, porque cobran por mensaje.
  - Solo enlace al sitio de la Registraduría.
  - Contratos de tratamiento de datos con cada proveedor (16.7 y 22.4-3).
- [ ] Designar formalmente al **oficial de protección de datos** (16.2) y escribir el **manual interno** de políticas y procedimientos con el abogado.
- [ ] Escribir el **plan de incidentes de seguridad** (16.7) y el **plan de cierre** (16.9), y firmar el plan de cierre (22.4-17 y 22.4-18).
- [ ] Cargar el calendario legal oficial (2.2) en la configuración.
- [ ] **Guion de visita y mensaje de las primeras visitas** (2.2, 13.3 y 23.1-14), revisados por el abogado **antes del piloto**, para no incurrir en propaganda fuera de tiempo.
- [ ] **Contenido del curso de ingreso** (10.6): las 7 lecciones de 3 a 5 minutos y la evaluación de 15 preguntas.
- [ ] **Revisión trimestral con el abogado** de los cambios en la ley y en las instrucciones de las autoridades (21). Se repite en todas las fases y los parámetros se ajustan en P-42 sin reprogramar.

### 1.1 Decisión de tecnología (hasta el 30 de noviembre de 2026)

- [ ] **Prueba técnica de React Native con Expo** en un teléfono Android de 2 GB. Debe pasar cinco pruebas:
  1. Mapa de Pijao sin conexión (MapLibre con PMTiles).
  2. GPS en segundo plano durante una jornada de 6 horas.
  3. Base local cifrada (SQLCipher con la llave en Keystore).
  4. Notificaciones push.
  5. Cámara con compresión.
- [ ] Tomar la decisión 23.1-17 con esos resultados:
  - **Camino A (recomendado):** pasar a React Native con Expo y construir en el tramo 1B una versión que haga todo lo que hace hoy la v0.10.1. Las pruebas de `pijao/core` sirven de especificación.
  - **Camino B:** seguir con Kivy, sin notificaciones ni biometría y con jornada solo con la pantalla encendida.
- [ ] Punto de control: si el 15 de febrero de 2027 el camino A no iguala a la v0.10.1, se vuelve al B. **Después de abril de 2027 no se cambia de tecnología.**
- [ ] **Sin iOS:** exige la cuenta de desarrollador de Apple, que cuesta US$ 99 al año. La app es solo para Android.
- [ ] Subir la versión mínima de Android a la **8** (17.5; hoy es la 7) y la versión objetivo a la API 34 o más.

### 1.2 Infraestructura y entrega profesional

- [ ] **Dos ambientes:** pruebas, con datos falsos generados por `tools/gen_seed.py`, y producción (8.12).
- [ ] Supabase CLI con `supabase/config.toml`. Las migraciones se aplican solo desde la integración continua.
- [ ] Integración continua que corre pruebas, revisión estática y pruebas de reglas por fila (pgTAP) por cada rol y permiso **antes** de construir la app.
- [ ] **Firma fija del APK de producción**, con la llave en los secretos de GitHub y una copia fuera de línea (24.3-B1). El APK de producción se construye solo al poner una etiqueta de versión.
- [ ] Versión de la app en un solo lugar, con versionado semántico y versionCode tomado de la etiqueta. Corregir el User-Agent fijo en «0.9».
- [ ] **Construcción y distribución sin costo:** el APK se construye en GitHub Actions con `expo prebuild` y Gradle, sin EAS Build. El APK y el mapa de Pijao se publican en GitHub Releases.
- [ ] **Actualización instantánea con vuelta atrás:** en el camino A, servidor propio del protocolo de `expo-updates` en una función de servidor de Supabase, con los paquetes en GitHub Releases (EAS Update gratuito queda de respaldo). En el camino B, aviso de nueva versión con enlace de descarga.
- [ ] **Versión mínima obligatoria** consultada al abrir la app (N-13 y 17.5).
- [ ] Reporte de errores en una **tabla propia de Supabase**, con limpieza de datos personales hecha en el teléfono. No se usa Sentry.
- [ ] **Salud de la flota** (N-12): cada teléfono informa su versión, los registros por enviar, su última sincronización, el espacio libre y la batería. Se ve en el panel P-43.
- [ ] **Respaldos (8.10):**
  - **Respaldo propio**, porque el plan gratuito de Supabase no trae respaldos: `tools/respaldo.ps1` en el computador del Administrador, cada noche, con `pg_dump` de la base y descarga de los archivos, cifrado con `age`. **Nunca se sube a GitHub.**
  - Tarea semanal en GitHub Actions para que el proyecto gratuito no se pause por inactividad.
  - Copia nocturna cifrada de la base y de las fotos fuera de Supabase.
  - Copia semanal guardada aparte por el Administrador.
  - Prueba de restauración mensual en el ambiente de pruebas.
  - La llave `pii_key` y los códigos de recuperación del Administrador, fuera de línea.
- [ ] Instructivos para el Administrador: restaurar, caída del servicio, teléfono perdido, incidente de seguridad y recuperación de emergencia (8.10). Credenciales selladas con el segundo custodio. **Meta: restaurar el servicio en menos de 4 horas** (8.10), medida en la prueba de restauración.
- [ ] README actualizado: las 12 migraciones, cómo instalar, cómo probar y cómo publicar una versión.
- [ ] Instalación privada por invitación configurada (3.5 y 22.4-23).

### 1.3 Correcciones de seguridad en el servidor (sección 24.3)

- [ ] **A1:** una autorización por persona, con evidencia según el método, versión del texto, huella del texto vigente y fecha verosímil.
- [ ] **A2:** las funciones del servidor solo aceptan una lista cerrada de campos por tabla. Nada de copiar todo lo que llega en el JSON.
- [ ] **A3:** fotos limitadas por zona, autoría o permiso. Las autorizaciones en papel van a una carpeta restringida al Director y al Administrador. Las fotos que muestran personas se tratan como dato restringido.
- [ ] **Almacenamiento (8.5):**
  - Sin enlaces públicos.
  - Enlaces temporales de 5 a 10 minutos, entregados solo tras verificar los permisos.
  - Nombres de archivo aleatorios y carpetas por vivienda.
- [ ] **A4:** verificación en dos pasos obligatoria para el Director y el Administrador en datos completos, simpatía, plan de cierre, designación del Director y borrados.
- [ ] **A5:** quien pidió la eliminación deja de verse y de poder descifrarse al instante.
- [ ] **A6:**
  - Borrado definitivo por persona.
  - Borrado de fotos y archivos del almacenamiento.
  - Auditoría sin nombres en el detalle.
  - Plan de cierre que cubra viviendas, fotos, hogares, necesidades, incidentes y solicitudes.
  - Herramienta de cierre en `tools/`.
- [ ] **A7:** códigos de invitación (o enlace con QR) de 12 caracteres o más, **válidos por 72 horas y de un solo uso** (4.9 y 19.1), límite de intentos por dirección y por código, mensaje genérico, y las invitaciones de Director requieren aprobación del Administrador.
- [ ] **A8:** registro abierto de Supabase desactivado. La mayoría de edad y el correo de la invitación se validan en la base de datos, y la invitación se consume con bloqueo. Unificar la longitud mínima de contraseña: el documento dice 10 y la función 12; se deja 12 como valor configurable.
- [ ] **M1:** la consulta de una cédula ya registrada responde solo «ya registrada» y queda en la auditoría.
- [ ] **M3:** vencimiento obligatorio para los permisos de riesgo alto (O-01, O-02, O-05, O-12, O-13 y O-16), con un máximo configurable.
- [ ] **M4:** «No contactar» y las revocatorias, limitadas por zona o autoría, con aviso al Director.
- [ ] **M5:** auditoría protegida también contra el vaciado (TRUNCATE), con huellas encadenadas y copia diaria fuera de la base (8.9).
- [ ] **M7:** coordenadas de la jornada validadas y borrado automático a los 7 días con pg_cron (R-31).
- [ ] **R-09 sin conexión:** en la sincronización se **acepta y marca para revisión** lo que no cumpla la regla, en vez de rechazarlo (24.2).
- [ ] Descarga **solo de las zonas asignadas** (17.2 y 24.3-M2).
- [ ] Control de versión en las ediciones, para que en los campos críticos gane la protección de la persona (5.13).
- [ ] Alertas de auditoría: descargas masivas, muchos accesos a datos completos en poco tiempo y accesos fuera de horario (8.9).
- [ ] **Reglas por fila de 8.4** verificadas tabla por tabla con pruebas pgTAP. Ninguna llave maestra en el teléfono.
- [ ] **Cifrado de 8.8:**
  - Cifrado por campo de cédula, teléfono, correo y simpatía.
  - Huella irreversible de la cédula para buscarla sin descifrar.
  - Llaves fuera de la base, con **procedimiento de rotación** probado.
  - Vistas enmascaradas por rol.
- [ ] Índices geográficos (8.3) para duplicados a 15 m, búsqueda de polígonos y mapas de calor, con respuesta en milisegundos. Paginación (Apéndice B-9).
- [ ] Alertas de uso al 80 % del almacenamiento y del plan (8.11).

### 1.4 Seguridad del teléfono

- [ ] **C1:**
  - Base local cifrada, con la llave en Android Keystore.
  - Tokens de sesión fuera de la base, en el almacén seguro.
  - La cola de envío no queda en claro al cerrar sesión.
- [ ] **C2:** cada registro de la cola lleva su usuario y nunca se envía con otra sesión.
- [ ] **M6:**
  - Bloqueo de capturas de pantalla (FLAG_SECURE) en las pantallas con datos.
  - Marca de agua con el nombre del colaborador y la fecha en capturas y exportaciones (5.16).
  - Detección de teléfono modificado (rooteado) y de GPS falso.
  - Se exige que el teléfono tenga bloqueo de pantalla (4.10).
- [ ] Bloqueo automático tras 2 minutos sin uso, con huella o rostro para volver a entrar (5.16 y 4.10). Botón «Ocultar pantalla» (5.16).
- [ ] **Borrado remoto:** al cerrar la sesión a distancia, al dar de baja la cuenta o al reportar el teléfono como perdido, los datos del teléfono se borran en la siguiente conexión (4.10 y 17.2). Los datos de zonas que dejaron de estar asignadas también se borran.
- [ ] Máximo dos dispositivos por colaborador, con una lista que se puede ver y cerrar a distancia (4.10).
- [ ] **B2:** librerías de red actualizadas y mensajes de error amables, sin detalles técnicos.
- [ ] El registro de errores del teléfono no guarda datos personales.
- [ ] Permisos del sistema pedidos con una explicación sencilla: cámara, ubicación, notificaciones, micrófono y almacenamiento (17.5 y 5.3).

### 1.5 Acceso y ciclo de vida de las cuentas

- [ ] P-01 Bienvenida y P-02 Iniciar sesión: con celular o correo, huella o rostro y el estado de la conexión a la vista.
- [ ] **P-03 Verificación en dos pasos** con aplicación autenticadora o código por mensaje. Obligatoria para el Administrador, el Director y quien tenga permisos de riesgo alto (R-05).
- [ ] P-04 Crear cuenta con el código de invitación (4.9), con foto, contacto de emergencia, declaración de servidor público o contratista y confirmación de mayoría de edad (R-06).
- [ ] **R-07:** si alguien declara ser servidor público o contratista, el Director recibe una alerta para revisión del abogado.
- [ ] P-05 Aceptar acuerdos: hay que leerlos hasta el final. Se guarda la versión, la fecha y el dispositivo.
- [ ] **R-45:** si cambia un texto legal, se pide aceptar la versión nueva. Los acuerdos se vuelven a aceptar cada 6 meses (10.7).
- [ ] P-06 Curso de ingreso (10.6): 7 lecciones y evaluación de 15 preguntas, con mínimo 80 % (R-03) y la opción de repetirla. Al aprobar, **certificado** con el logo y un código.
- [ ] **P-48 Carnet digital** (10.7) con foto, nombre, QR y vigencia, y **P-52 Verificación del carnet**, la página pública que muestra si la persona está vigente. Protege a las familias de impostores desde el piloto.
- [ ] El Director aprueba o rechaza cada solicitud de ingreso **con su motivo** (4.9).
- [ ] P-07 Recuperar acceso, con aviso por el canal habitual.
- [ ] Sesiones (R-33): 14 días para el colaborador, 7 para el Director y 12 horas para el Administrador. Bloqueo de 15 minutos tras 5 intentos fallidos, con aviso al Administrador si se repite.
- [ ] **Contraseña** (4.10): longitud mínima configurable (12 por defecto; el documento pide al menos 10) y **rechazo de las contraseñas comunes**.
- [ ] **Aviso de ingreso desde un dispositivo nuevo**, enviado al dispositivo habitual (4.10). Llega por notificación push si pasó la prueba de 1.1; si no, como alerta dentro de la app en la siguiente apertura.
- [ ] **Designación temporal del Director** por el Administrador (4.3): queda registrada y la persona anterior pierde el rol.
- [ ] Ciclo de vida de la cuenta: pendiente, activa, suspendida (manual o automática a los 30 días sin actividad) y dada de baja (4.9). Al suspender una cuenta se apagan todos sus permisos.
- [ ] **R-01 y R-02:** un solo Administrador y un solo Director activo, y la opción «Administrador» no aparece en ninguna pantalla.
- [ ] Permisos opcionales O-01 a O-22 con plantillas (4.6), alcance por zona (4.7), vencimiento, motivo e historial (R-04).
- [ ] Revisión mensual de permisos: un aviso automático al Director (4.5 y R-04).

### 1.6 Mapa y ubicación (sección 5)

- [ ] Si se toma el camino A, rehacer todo lo que ya funciona en la v0.10.1.
- [ ] Mapa base con tres vistas (calles, satélite y relieve), límite del municipio y polígonos de barrios y veredas a la vista (5.1).
- [ ] **Mapa propio de Pijao sin conexión** (N-02 y 5.14), sin descargar desde los servidores públicos de OpenStreetMap ni Esri, porque sus licencias no lo permiten:
  - Paquete con calles y ortofoto.
  - Descarga de la zona asignada con Wi-Fi, mostrando cuántos megabytes ocupa.
  - Actualización nocturna con Wi-Fi.
  - Tope de almacenamiento y opción de borrar una zona.
  - Mensaje claro cuando no hay mapa descargado.
- [ ] **Agrupación de puntos** para que el mapa aguante miles de viviendas (5.6).
- [ ] Navegación (5.2):
  - Gestos: acercar, alejar, girar e inclinar.
  - Botones: «Centrar en mí», brújula y escala.
  - Mantener presionado para ver las coordenadas.
  - Selector «Ir a…», buscador por dirección o vereda, vista de lista por distancia y pantalla completa.
- [ ] «Mi ubicación» (5.3): círculo de precisión, indicador de señal en metros, no permitir registrar con ubicación aproximada por red y ahorro de batería.
- [ ] **P-11 Registrar aquí**, con los 7 pasos de 5.4:
  1. Lecturas de GPS durante 8 a 10 segundos.
  2. Aviso si la precisión es peor que 20 m (R-10).
  3. Punto arrastrable hasta 30 m.
  4. Duplicados a menos de 15 m, con foto y dirección (R-08).
  5. Bloqueo si el punto está en «No contactar».
  6. Distancia máxima de 50 m entre el teléfono y el punto (R-09).
  7. Confirmación.
  - Se guarda: latitud y longitud con 6 decimales (R-11), precisión, altitud, hora, dispositivo y fuente.
- [ ] Ubicación manual hasta 100 m con motivo C-20, y registro diferido como borrador pendiente de aprobación (5.5 y R-12).
- [ ] Los 13 tipos de punto de 5.6, con color **y** forma. Lo pendiente de enviar, con borde punteado (5.13).
- [ ] P-10 Ficha rápida al tocar un punto (5.7): foto, dirección, estado, última visita y quién la hizo, número de personas, necesidades, «Ver detalle», «Agregar visita», «Cómo llegar» y «Reportar problema con este registro».
- [ ] Capas y filtros básicos (5.8): estados, límites de zonas, barrio o vereda, estado, fechas, colaborador, **tema de necesidad, etiqueta**, «solo lo mío», «solo pendientes» y «solo seguimientos».
- [ ] **Dirección escrita y coordenadas (5.15):**
  - Al fijar el punto, se propone el texto de la dirección (geocodificación inversa, siempre editable).
  - Al escribir la dirección, se propone un punto en el mapa.
  - El barrio o vereda se rellena según el polígono.
  - Aviso si lo escrito no coincide con el polígono.
  - Todos los campos de dirección.
- [ ] Privacidad en el mapa (5.16): sin nombres en el mapa, solo agrupaciones a zoom lejano y el mapa no se comparte fuera de la app.
- [ ] Los valores de control (radio, precisión, distancias y tiempo de muestreo) se leen de la configuración, sin valores fijos en el código (24.2).

### 1.7 Sincronización y trabajo sin conexión (secciones 8.7, 17 y 24.4)

- [ ] Cada registro nace en el teléfono con un **identificador único**, para que un reenvío no cree duplicados (8.7). Ya existe en la v0.10.1 y debe conservarse si se reescribe la app.
- [ ] Cola de envío:
  - Estados: «Guardado en el teléfono», «Enviando», «Sincronizado» y «Error, reintentando».
  - Espera creciente entre intentos y cuarentena tras varios fallos.
  - Orden por registro y dependencias: una edición no sale antes que su visita.
- [ ] Sincronización automática al recuperar la señal y cada cierto tiempo, con un candado para que nunca corran dos a la vez.
- [ ] La descarga desde el servidor relee con un margen de 2 minutos para no perder cambios confirmados tarde.
- [ ] Primero se envían los datos y después las fotos, y el marcado de cada foto se reintenta por separado, para que no queden fotos huérfanas (8.7 y 24.4).
- [ ] Opción de enviar las fotos grandes solo con Wi-Fi (17.3).
- [ ] Pantalla «Pendientes de envío» con «Reintentar ahora», y aviso si algo lleva más de 24 horas sin enviarse (17.3).
- [ ] **Un registro local nunca se borra antes de que el servidor confirme que lo recibió.**
- [ ] **Tiempo real (5.13 y 8.6):**
  - Los puntos nuevos o cambiados aparecen en el mapa de los demás en pocos segundos, con una animación suave.
  - Encabezado con «Actualizado hace 3 s» o «Sin conexión».
  - Los conflictos quedan marcados para el Director.
  - En vivo también las tareas y los anuncios nuevos. Las alertas SOS, la ubicación del equipo y el avance de metas se suman en la Fase 3 (8.6).
  - **Las estadísticas pesadas se recalculan cada pocos minutos**, no en cada toque (8.6).
- [ ] Lo que se guarda en el teléfono (17.2): zonas asignadas, tareas, agenda, anuncios, catálogos, borradores, cola y fotos pendientes, con un tamaño máximo configurable.
- [ ] Los paneles funcionan con los datos del teléfono e indican «actualizado hace…» (9.1).

### 1.8 Registro de viviendas y visitas (sección 6)

- [ ] **Foto de fachada con la cámara.** Es la pieza bloqueante (24.1).
  - Sello con fecha, hora, coordenadas e iniciales del colaborador.
  - Compresión a unos **1.024 píxeles y 100 KB**, y miniatura de 20 KB hecha en el teléfono, para caber en el 1 GB gratuito. En la nube se guardan la fachada vigente, las fotos de problemas y las autorizaciones; las demás se quedan en el teléfono.
  - Miniaturas.
  - Hasta 6 fotos por visita (R-14), de los tipos fachada, entorno, problema y autorización en papel.
  - Si aparece una persona en la foto, se pregunta si autorizó, y nunca se fotografía a niños.
  - Opción «No autorizó la foto» (R-13).
- [ ] Registro **rápido** (en menos de 90 segundos) y registro **completo**, con el estado «incompleto» y su pendiente (6.1).
- [ ] Tarjeta «Antes de tocar la puerta» (6.2), que se puede saltar después de verla tres veces.
- [ ] **P-12, el asistente de 12 pasos (6.3):**
  - Ubicación, foto, vivienda (tipo C-03, tenencia C-04, servicios C-05 y vía C-06), resultado (C-02), hogar (C-11 y principal sostén con C-07), personas, necesidades (C-08), participación (C-10), simpatía (C-09, con el aviso fijo), autorización, notas y cierre.
  - Borrador automático, «Guardar y seguir después», validaciones en cada paso y resumen final.
- [ ] **Paso 3, vivienda:** todos los campos de la tabla de 6.3:
  - Zona urbana o rural (propuesta según el mapa).
  - Dirección y complemento.
  - Finca o predio, indicaciones y punto de referencia.
  - **Estado de ocupación**.
  - **Riesgos visibles**.
  - **Actividad económica en la vivienda**.
- [ ] **Paso 4, resultado:** hora automática y **casilla obligatoria de autorización verbal para registrar la visita** si hubo conversación. Sin ella, solo se guarda el punto con el estado «Rechazó».
- [ ] **Paso 5, hogar:**
  - Conteos por rango de edad, cuya **suma debe dar el total**.
  - Mujeres y hombres.
  - Mayores de 18 que votan en Pijao, en otro municipio o no saben.
  - Jóvenes que cumplen 18 antes de la elección.
  - Otros hogares en la vivienda, que abren un nuevo hogar.
  - Familiares fuera de Pijao que votan en Pijao.
  - Mascotas y su necesidad de vacunación o esterilización.
  - Principal sostén del hogar: relación, sexo, ocupación (C-07) y **situación laboral**.
  - **Nunca** se pregunta por ingresos, Sisbén ni subsidios.
- [ ] **Paso 7, necesidades:**
  - Preguntas guía.
  - **Hasta 3 necesidades con prioridad 1, 2 o 3** (C-08), cada una con su frase libre.
  - Si la necesidad es del hogar o colectiva.
  - Foto del problema.
  - «¿Quiere que le contemos cómo va su propuesta?», que exige haber autorizado el contacto.
  - Autorización aparte para «Historias que nos unen».
- [ ] **Paso 8, participación:**
  - Canal (C-10).
  - Voluntario. Desde la Fase 3 crea el alta en P-27.
  - **Anfitrión de reunión**.
  - Temas de interés.
  - **Mejor horario**.
  - «¿Prefiere que no volvamos a visitarlo?», que pone la vivienda en **No contactar de inmediato**.
- [ ] **Dictado por voz reconocido en el propio teléfono**, siempre que sea posible, para no enviar datos personales a servicios externos (16.6).
- [ ] Vivienda sin contacto: solo el punto, el estado y la foto, sin ninguna persona.
- [ ] **Notas (paso 11):**
  - Dictado por voz que guarda solo el texto, sin el audio (3.6).
  - Advertencia fija sobre lo que no se debe escribir.
  - Detección de números de cédula o teléfono, para llevarlos al campo correcto.
  - Detección de palabras sensibles.
  - **Notas sospechosas** («plata», «mercado», «regalo», «pagar», «favor») que pasan a revisión del Director (14.8).
- [ ] Cierre (paso 12): seguimiento (fecha, motivo y responsable), volante entregado, confirmación de lo guardado y semáforo de calidad (6.4).
- [ ] Registros en rojo: fuera de las estadísticas oficiales y en los pendientes del colaborador (R-28).
- [ ] **Visitas de seguimiento (6.7):** sin repetir el cuestionario, con recordatorio y tarea automática, y los seguimientos vencidos en rojo en el mapa y en las tareas.
- [ ] Historial de cada vivienda como línea de tiempo (6.6).
- [ ] Edición propia durante 72 horas y luego solicitud de corrección (R-22), con el antes y el después guardados. O-06 para editar registros de otros.
- [ ] Eliminación con motivo y papelera de 30 días (R-23). El borrado definitivo es solo del Administrador.
- [ ] Anti-fraude en el servidor: más de un registro cada 90 segundos, saltos imposibles y fuera de zona u horario, con alertas (6.5). La pantalla P-39 llega en la Fase 3.

### 1.9 Personas y autorizaciones (secciones 7 y 16.4)

- [ ] Ficha de la persona con todos los campos de 7.2: identificación, contacto, residencia, datos electorales y relación con la campaña.
- [ ] Botón «Consultar puesto de votación», que solo abre el sitio de la Registraduría.
- [ ] Validaciones de 7.3: cédula de 6 a 10 dígitos y única (R-17), edad entre 18 y 110 años (R-16), nombres, teléfono y correo.
- [ ] Protección estándar de 7.4 en el servidor. O-01 y O-02 con verificación en dos pasos y auditoría.
- [ ] **Notas sensibles:** las notas marcadas como sensibles (por la detección del paso 11 o por el revisor) se ocultan al colaborador base. El Director y el Administrador ven todas (7.4).
- [ ] «Llamar» y «WhatsApp» solo si la persona autorizó ese canal y hay un seguimiento asignado, o con O-01.
- [ ] **Autorización (16.4):**
  - Casillas separadas por finalidad y por canal.
  - Casilla aparte y explícita para la simpatía (R-19).
  - Firma en pantalla, autorización verbal con hora o papel fotografiado.
  - Se entrega el aviso de privacidad por QR.
  - Se guarda la evidencia completa.
  - Sin la autorización (b), no se guarda la ficha (R-15).
  - No se registran datos de terceros ausentes.
- [ ] Revocatoria con efecto inmediato y «No contactar» (R-20 y R-21).
- [ ] Estados de la persona: activa, no contactar, se mudó, fallecida y solicitó eliminación.
- [ ] Casos especiales de 7.7: joven que cumple 18, extranjero residente, mudanza con cierre de hogar (R-18), persona con dos viviendas y fallecimiento.
- [ ] **Alerta de residencia dudosa (14.8):** recordatorio sobre la inscripción de cédulas en la ficha.
- [ ] P-13 Detalle de vivienda, P-14 Detalle de persona (con consentimientos y la línea de tiempo de visitas), P-15 Buscar (sin guardar nombres en el historial) y P-16 Mis visitas y pendientes.

### 1.10 Derechos de los titulares y protección de datos

- [ ] **P-35 Derechos de los titulares:**
  - Casos de consulta, actualización o corrección, supresión, revocatoria y queja (C-18).
  - Número de caso.
  - Plazos legales y plazo interno de 5 días hábiles.
  - Respuesta y acta de eliminación.
- [ ] Registro de una solicitud desde la ficha de la persona (7.8), hecha por el colaborador en nombre del ciudadano.
- [ ] **Entrada por correo y WhatsApp** (16.5): cada mensaje de un titular se registra como caso con su número, igual que los del formulario.
- [ ] **Prueba de la autorización** (16.5): desde P-35 se genera, a pedido del titular, un documento con lo que autorizó, cuándo, por qué método y con qué versión del texto.
- [ ] **P-50 «Mis datos»**, la página pública para consultar, corregir, borrar o revocar, con número de caso. Los datos reales del piloto exigen este canal (16.5 y 22.4-16).
- [ ] **P-53 Política de tratamiento y aviso de privacidad**, página pública por QR y enlace.
- [ ] Borrado definitivo por persona, ejecutado por el Administrador con acta y confirmado a la persona.
- [ ] Auditoría (8.9) de ingresos, cambios, accesos a datos completos, exportaciones, permisos, mensajes, SOS, «Ver como» y configuración.
- [ ] Respetar la minimización y los datos prohibidos de 16.6 en cada campo.

### 1.11 Paneles básicos (sección 9)

- [ ] P-08 Inicio: panel personal (9.2), «Antes de empezar» y atajos. El botón «Iniciar jornada» se activa en la Fase 3.
- [ ] P-22 (parte básica): panel de campaña (9.3), sin datos individuales.
- [ ] Indicadores con su definición escrita (9.7). Solo cuentan los registros verdes (R-28) y los grupos pequeños se muestran como «menos de 5» (R-29).
- [ ] Filtros por zona, fechas y tema en los paneles (9.1).
- [ ] **P-18 Tareas (versión básica, O-09):** ver las tareas asignadas, marcarlas hechas con nota o foto y reportar un bloqueo. Ya existe en la v0.10.1 y se conserva.
- [ ] **P-20 Anuncios (versión básica, O-11):** leer y publicar anuncios. Ya existe y se conserva.
- [ ] **P-44 Perfil (versión básica):** foto, datos, contraseña, dispositivos y cerrar sesión.
- [ ] **Guion de visita y preguntas frecuentes mínimos** dentro de la app desde el piloto (13.3), con el texto revisado en 1.0. El centro de información completo llega en la Fase 3.
- [ ] **Recordatorio fijo:** no pasar datos de personas por los chats de WhatsApp del equipo, mientras no existan los mensajes internos (10.5).

### 1.12 Modo práctica (P-47)

- [ ] Datos de ejemplo separados, simulación de visitas y ningún efecto en las estadísticas (10.6 y 8.12). Es obligatorio antes de registrar datos reales.

### 1.13 Panel web inicial para el Director y el Administrador (17.5)

- [ ] Ingreso con verificación en dos pasos y la misma cuenta que en el teléfono.
- [ ] P-36 Gestión de colaboradores en su parte básica: invitar, aprobar, suspender, dar de baja y la ficha de cada uno.
- [ ] P-37 Permisos de un colaborador.
- [ ] P-41 Auditoría: vista operativa para el Director y vista técnica para el Administrador, con **filtros por usuario, acción, fecha y registro**. Solo el Administrador exporta la vista técnica.
- [ ] **P-42 Configuración del sistema:**
  - Catálogos C-01 a C-20.
  - Valores de 19.1.
  - Textos legales con sus versiones.
  - Calendario legal.
  - Plantillas de permisos.
  - Integraciones.
- [ ] **P-43 Salud del sistema (9.6):**
  - Usuarios activos, errores, **tiempos de respuesta** y sincronizaciones fallidas.
  - Almacenamiento y costos.
  - Alertas de seguridad: **intentos fallidos**, descargas masivas y accesos raros.
  - Último respaldo y versiones instaladas.
  - **Solicitudes de titulares pendientes** y **dispositivos reportados como perdidos**.
  - Salud de la flota (N-12).
- [ ] Mapa con el avance del trabajo.
- [ ] La barra inferior, el menú «Más» y la **franja superior fija** de la app (18.1: estado de conexión, registros pendientes de envío, notificaciones e indicador de jornada activa, que se enciende en la Fase 3) quedan con su estructura definitiva. Los estados comunes de cada pantalla (cargando, vacío, sin conexión, error y sin permiso) se construyen con los componentes del tema central.

### 1.14 Módulo de apoyos ciudadanos (firmas) [CONDICIONAL]

- [ ] **Solo si la decisión 23.1-1 es «por firmas»** (14.10): formulario de apoyo con nombre, cédula y firma, detección de duplicados, verificación de residencia, conteo frente a la meta y formato de la Registraduría.
- [ ] Datos usados solo para ese fin, con su propio plan de borrado.

### 1.15 Pruebas y preparación del piloto

- [ ] Pruebas automáticas de cada regla R-01 a R-33 y R-45 que aplica en esta fase.
- [ ] Pruebas con una cuenta de cada tipo, con los permisos encendidos y apagados (22.4-5).
- [ ] Pruebas en el teléfono de gama baja, con estas metas (17.4 y 22.5-10):
  - La app arranca en menos de 3 segundos.
  - El mapa está listo en menos de 2 segundos.
  - De «Registrar aquí» al formulario, en menos de 12 segundos.
  - Guardar toma menos de 1 segundo.
  - 20 registros con fotos se sincronizan en menos de 2 minutos.
  - La app pesa menos de 150 MB.
  - Aguanta una jornada de 6 horas.
- [ ] **Tres días sin señal en una vereda real** y sincronización completa al final (22.4-13 y 22.5-11).
- [ ] Prueba de teléfono perdido con bloqueo y borrado remoto (22.4-15 y 22.5-8).
- [ ] Prueba de restauración del respaldo (22.4-8 y 22.5-7).
- [ ] Verificación de la lista técnica 22.5, puntos 1 a 8 y 10 a 13.
- [ ] Revisión final de seguridad de toda la fase con `ecc:security-reviewer` y la habilidad `security-review`.
- [ ] **Instrumentar las métricas del piloto** (22.3), sin datos personales: tiempo por registro, errores de GPS, problemas sin conexión, calidad de los datos y abandonos por paso del asistente. Además, una encuesta corta a los colaboradores y una pregunta voluntaria a las familias sobre la claridad del texto de autorización y el trato recibido.
- [ ] **Seguridad durante el piloto**, porque la jornada y el SOS llegan en la Fase 3: en las veredas se trabaja siempre en parejas, con hora de regreso acordada y aviso al Director por teléfono al salir y al volver.

### Criterio de salida de la Fase 1

Todos los hallazgos críticos y altos de 24.3 están cerrados y verificados. La foto de fachada funciona y un registro completo queda en verde. Sin señal no se pierde nada. P-35, P-50 y P-53 están activas. Los textos legales están aprobados por el abogado. El piloto puede empezar el 1 de febrero de 2027.

---

## Fase 2 · Diseño visual y estético (fase exclusiva de diseño)

**Fechas:** 1 de febrero a 15 de marzo de 2027 (6 semanas).
**En paralelo:** el **piloto** (22.3), del 1 al 28 de febrero, con 5 a 10 colaboradores en el casco urbano y una vereda, usando la versión de la Fase 1. Lo que el piloto enseñe alimenta el diseño. Durante esta fase solo se corrigen errores críticos del piloto; no se agregan funciones.
**Objetivo:** que «Pijao nos une» se vea y se sienta en cada pantalla, que la app sea fácil para adultos mayores, se lea bajo el sol de la vereda y se perciba profesional y confiable.

**Herramientas:**
- **Claude Design:** artifacts de tipo **Design System**, para el sistema de diseño, y **Design**, para las pantallas y los prototipos.
- **Figma**, por medio de su conexión, si se quiere un archivo editable.
- **Agentes y habilidades de ECC:**
  - Dirección de arte: `frontend-design-direction`, `brand-discovery`, `brand-voice`, `taste` y `taste-application`.
  - Sistema de diseño y acabado: `design-system`, `make-interfaces-feel-better` y `ecc:gan-design` (ciclo de generar, evaluar y mejorar cada pantalla).
  - Movimiento: `motion-foundations` y `motion-patterns`.
  - Gráficos: `dataviz`.
  - Accesibilidad: `ecc:a11y-architect` y `frontend-a11y`.
  - Demostraciones: `ui-demo`.

**Avance al 9 de noviembre de 2026** (rama `fase-2/diseno`; la campaña adelantó la fase). Copia de todo en `diseno/` (ver `diseno/LEEME.md`):

| Bloque | Estado | Detalle |
|---|---|---|
| 2.1 Dirección de arte | 🟡 Elegida | Tres propuestas de Inicio (A Institucional, B Territorio y C Pulso). La campaña eligió la **C**: blanca, con presencia, la tipografía del logo y un color de la marca por tarjeta. Faltan las fotos reales de Pijao y los hallazgos del piloto |
| 2.3 Sistema de diseño | ✅ Completo para construir | Claude Design · Design System (privado). Medidas base en tres modos (claro, oscuro y sol a 7:1), Montserrat e Inter con 16 px de mínimo, letra grande ×1,25, espacios, radios, sombras, tiempos y curvas de animación, y **cuatro colores de gráfico validados para daltonismo** en los tres modos (`dataviz`). **23 componentes** con guía y muestra viva, incluidos los cuatro que faltaban: firma en pantalla, cámara con sello, notificaciones y gráficos (barras, barras apiladas, anillo y vista de tabla, con dato al tocar) |
| 2.7 Movimiento | ✅ En la app | Entrada de menos de 2 segundos (3.5) con el anillo, el logo y el mensaje provisional «Juntos, casa por casa.»; cascada del Inicio, cifras que cuentan, barras que se llenan; ondas mientras el GPS lee; hoja de la ficha que sube; transición entre pasos de la visita; barra de pasos con el degradado; toque que se hunde. Todo respeta «reducir movimiento». **Falta:** la aparición suave de puntos nuevos en el mapa (5.13) llega con la sincronización en tiempo real de la Fase 3 |
| 2.6 Pantallas | ✅ Las 53 diseñadas | Lienzo «Pijao Nos Une · pantallas» (privado) con el sistema instalado, en 9 páginas: acceso (P-01 a P-07), trabajo de campo (P-08 a P-16), **la visita completa** (pasos 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 y 12, más el registro rápido), equipo y módulos (P-17 a P-35), **panel web de escritorio** (P-36 a P-43), personales y SOS (P-44 a P-48), páginas públicas (P-49 a P-53), modos (Inicio en oscuro y sol) y dos piezas reutilizables (barra inferior y menú del panel). **Falta:** cada pantalla en los cuatro modos y con todos sus estados, los prototipos de los cinco flujos críticos y lo que enseñe el piloto |
| 2.11 Aplicar el diseño a la app | ✅ App 0.17.0 y panel web | **Todas** las pantallas de la app con el detalle del lienzo y sus estados (cargando con esqueleto, vacío con acción, sin señal, error con «Reintentar» y sin permiso); modos claro, oscuro, sol y letra grande (Perfil); formatos comunes (`core/formato.ts`); panel web interno con el sistema (las páginas públicas quedan como están, por decisión del dueño). Lógica intacta: 110+ pruebas, entre ellas la que abre las 22 pantallas. **Falta:** capturas de referencia por pantalla y la aprobación final del Director y el candidato |
| 2.2 Identidad | 🟡 Ícono hecho; falta el vector | Ícono de la app (grano de café con el degradado sobre azul marino), ícono adaptable de Android, ícono de notificaciones y arranque con el logo. Los colores salen de las imágenes de los logos; con el archivo vectorial se ajustan con cuentagotas y se hacen los logos derivados |
| 2.4 Iconografía y mapa | ✅ | Marcadores de los 13 tipos de 5.6 con color **y** forma, grupos con número y color del estado dominante, «por enviar» con anillo punteado, ubicación propia con círculo de precisión, íconos de los 14 ejes (C-08) y ~70 íconos de línea. Estilo de mapa propio con la paleta de la marca en claro, oscuro y sol (2.5) |
| 2.8 Textos y voz | ✅ | Tono de «usted» revisado; fechas en día/mes/año, hora de 12 horas con «a. m.»/«p. m.», hora de Bogotá y pesos con puntos de mil, con pruebas |
| 2.9 Accesibilidad | ✅ Auditoría hecha | `docs/Accesibilidad-Fase2.md`: 51 combinaciones de color AA en los tres modos, zonas de 48, nombres para lectores, nada solo por color, letra grande y reducir movimiento. **Falta:** la prueba con 5 colaboradores y bajo el sol, en el piloto |
| 2.10 Materiales | 🟡 | Volante con el aviso de privacidad y su QR, certificado del curso y carnet para imprimir (`diseno/materiales/`). El kit para redes y piezas públicas queda para la página de la campaña |

### 2.1 Dirección de arte

- [ ] Tablero de inspiración con **fotografías reales de Pijao** tomadas por el equipo, con permiso de quienes aparezcan (3.4): café, montaña, río, pueblo y veredas.
- [ ] Principios visuales: ilustración plana y cálida, sin imágenes de archivo genéricas, aprobados por el Director y el candidato.
- [ ] Hallazgos de usabilidad del piloto: dónde se confunden, qué tarda y qué no se lee bien, según las métricas instrumentadas en 1.15, las encuestas a los colaboradores y las opiniones de las familias visitadas (22.3).

### 2.2 Identidad y marca (sección 3)

- [ ] Sacar los **colores exactos** con cuentagotas del archivo vectorial del logo (3.2) y comprobar el contraste de cada combinación.
- [ ] Logos derivados (3.1): versión horizontal de una línea, versión de un solo color para fondos oscuros y marca de agua.
- [ ] **Ícono de la app** (3.5): grano de café sobre azul marino, en todos los tamaños, incluido el ícono adaptable de Android. Pantalla de inicio (presplash).
- [ ] Íconos de notificación en un solo color.
- [ ] Revisar con el abogado el uso de la marca, el logo y el nombre del candidato en el carnet y los materiales (23.2-18).

### 2.3 Sistema de diseño (Claude Design · Design System)

- [ ] **Medidas base (tokens):** colores, tipografía (Montserrat para títulos e Inter para texto, mínimo 16 puntos), espacios, radios, sombras, elevación y tiempos de animación.
- [ ] **Modos:** claro, oscuro, **modo sol** de alto contraste (3.6) y letra grande.
- [ ] **Componentes:**
  - Botones, con el botón central naranja «Registrar aquí» como el más grande.
  - Barra inferior, franja superior de estado (conexión, pendientes, notificaciones y jornada activa), tarjetas, hoja inferior y chips de filtros.
  - Campos de formulario, asistente por pasos con barra de progreso, casillas de autorización y lienzo de firma.
  - Visor de cámara con sello, barra de precisión del GPS, semáforo de calidad y anillos de avance.
  - Insignias, avisos, diálogos y notificaciones dentro de la app.
  - Tablas y filtros del panel web.
- [ ] **Estados comunes** de toda pantalla (18.1): cargando con esqueleto, vacío con una acción, sin conexión, error con «Reintentar» y sin permiso con su explicación.
- [ ] **Gráficos** con la habilidad `dataviz`: barras, embudo, semáforos, anillos, mapas de calor agregados y gráficas de flujo de gasto, que se lean en claro, oscuro y modo sol.

### 2.4 Iconografía e ilustración

- [ ] Íconos de los **14 ejes del programa** (C-08), a partir de los símbolos del logo (3.4).
- [ ] **Marcadores del mapa:** los 13 tipos de 5.6, con color **y** forma, agrupaciones con número y estado dominante, el estado «pendiente de enviar» con borde punteado y la ubicación propia con su círculo de precisión.
- [ ] Íconos de capas, filtros, tipos de tarea (C-13), eventos (C-12), propaganda (C-15) e incidentes (C-17).
- [ ] Ilustraciones para los estados vacíos, la bienvenida, el curso, las insignias (10.8) y los certificados.

### 2.5 Estilo del mapa

- [ ] Estilo de mapa propio con la paleta de marca: calles, relieve (municipio de ladera), satélite con superposición y versión oscura.
- [ ] Polígonos de zonas con su color de borde, sombreado de «zona completa» (5.9) y mapas de calor por cuadrícula, nunca por casa.

### 2.6 Diseño de las 53 pantallas (Claude Design · Design)

Cada pantalla se diseña en teléfono pequeño (360 dp), con todos sus estados y en los cuatro modos (claro, oscuro, sol y letra grande). Las pantallas del panel web se diseñan para computador y para tableta.

- [ ] **Acceso (18.2):** P-01, P-02, P-03, P-04, P-05, P-06 y P-07.
- [ ] **Trabajo de campo (18.3):** P-08, P-09, P-10, P-11, P-12 (los 12 pasos y el modo rápido), P-13, P-14, P-15, P-16 y P-17.
- [ ] **Equipo y módulos (18.4):** P-18 a P-35.
- [ ] **Administración (18.5):** P-36 a P-43 (panel web).
- [ ] **Personales y de seguridad (18.6):** P-44, P-45, P-46 (SOS sin margen de error, que se active con una mano y no se active por accidente), P-47 y P-48.
- [ ] **Páginas públicas (18.7):** P-49, P-50, P-51, P-52 y P-53, adaptables a cualquier pantalla y ligeras para datos móviles.
- [ ] **Prototipos navegables** de los flujos críticos:
  1. «Registrar aquí» y el registro rápido en menos de 90 segundos.
  2. Invitación, curso y primera visita.
  3. Inicio de jornada y SOS.
  4. Testigo electoral: apertura y cierre de mesa con foto del acta.
  5. «Mis datos» para un ciudadano.

### 2.7 Movimiento y microinteracciones

- [ ] Bienvenida de menos de 2 segundos (3.5), progreso de la lectura del GPS, aparición suave de puntos nuevos (5.13), confirmación de guardado y transiciones del asistente.
- [ ] Respeto de la opción «reducir movimiento» del teléfono.

### 2.8 Textos y voz

- [ ] Revisión de **todos** los textos de la app (22.4-20): tono, ortografía, «usted» y los ejemplos de 3.3.
- [ ] Formatos (3.6): fechas en día/mes/año, hora de 12 horas con «a. m.» y «p. m.», zona horaria de Bogotá y pesos con puntos de mil.
- [ ] Mensajes de error amables y notificaciones sin datos personales (3.5).

### 2.9 Accesibilidad (WCAG 2.2 AA)

- [ ] Auditoría con `ecc:a11y-architect`:
  - Zonas táctiles de 48 por 48 puntos.
  - Contraste de 4,5 a 1.
  - Nombres claros para los lectores de pantalla.
  - Nada que dependa solo del color, con simulación de daltonismo.
  - Letra grande del sistema respetada.
- [ ] Prueba de uso con 5 colaboradores del piloto, incluidos adultos mayores, y **prueba bajo el sol real** en una vereda.

### 2.10 Materiales derivados

- [ ] Carnet digital (P-48) y tarjeta de visita con QR (N-09), en versión de pantalla y para imprimir.
- [ ] Certificado de capacitación con logo y código (10.6) y certificado de voluntariado (12.1).
- [ ] Volante con el aviso de privacidad y su QR (6.2 y 16.4).
- [ ] Plantillas de informes en PDF, con la portada en degradado (3.2 y 9.11), y de exportaciones con marca de agua.
- [ ] **Kit de campaña (13.2):** plantillas de publicación, historia, volante, afiche, pendón y calendario, reglas de uso del logo y etiqueta #PijaoNosUne.
- [ ] Plantilla del programa de gobierno en PDF (11.7) y del informe «Lo que escuchamos» (11.9).

### 2.11 Entrega a desarrollo y aplicación visual

- [ ] Exportar las medidas base del sistema de diseño al tema central del código, en un solo lugar.
- [ ] Biblioteca de componentes en código, igual a la del sistema de diseño.
- [ ] **Aplicar el diseño a todas las pantallas construidas en la Fase 1.** Solo cambia el aspecto; la lógica no se toca.
- [ ] Capturas de referencia por pantalla, para detectar cambios visuales no deseados en las fases siguientes.
- [ ] Logos y colores correctos (22.4-21). Aprobación final del Director y del candidato.

### Criterio de salida de la Fase 2

El sistema de diseño está publicado y las 53 pantallas están diseñadas con todos sus estados y modos. Los prototipos de los cinco flujos críticos están aprobados. La accesibilidad AA está aprobada. El diseño está aplicado a todo lo de la Fase 1. Las lecciones del piloto están incorporadas. Todo lo que se construya desde ahora usa estos componentes.

---

## Fase 3 · Operación del equipo, territorio y comunidad

**Fechas:** 16 de marzo a 31 de mayo de 2027 (11 semanas).

**Tramos internos:**
- **Tramo 3A (16 de marzo al 14 de abril):** bloques 3.1 a 3.5. Es lo que el equipo necesita para el despliegue.
- **Despliegue escalonado:** 30 colaboradores el 15 de abril, 100 el 1 de mayo y 300 el 15 de mayo, con soporte y capacitación.
- **Tramo 3B (15 de abril al 31 de mayo):** bloques 3.6 a 3.12, entregados con la actualización instantánea.

**Objetivo:** el equipo completo, organizado por zonas y protegido en terreno, escuchando a la comunidad y convirtiendo lo escuchado en programa de gobierno.

**Avance al 10 de noviembre de 2026** (rama `fase-2/diseno`; solo para el equipo, sin la parte pública ni la división del mapa por zonas, por decisión del dueño; las pruebas serán con el equipo más cercano, no con 300 colaboradores):

| Bloque | Estado | Detalle |
|---|---|---|
| 3.2 Jornada y seguridad | 🟡 App y panel | Iniciar y terminar la jornada (también sin señal), ubicación cada minuto solo durante la jornada y con la app abierta, «¿Todo bien?» cada 2 horas y aviso a la hora prevista de terminar (notificaciones locales). **SOS** manteniendo 3 segundos: con señal llega al instante; sin señal queda en cola y ofrece llamar al 123 o mandar un mensaje de texto con la ubicación. Panel «Seguridad en terreno» con jornadas activas, última ubicación y alertas SOS con celular y contacto de emergencia. **Falta:** ubicación con la app cerrada (servicio en primer plano), alerta automática de no regreso al Director y jornada nocturna |
| 3.3 Equipo | 🟡 | Panel: crear y asignar tareas; **eventos** (0019) que el equipo ve en la app sin señal. **Falta:** turnos, mensajes internos, directorio, cursos adicionales, gastos, insignias, salida del equipo y «Ver como» |
| 3.4 Calidad | 🟡 | Panel «Calidad» con las alertas automáticas del servidor y su revisión. **Falta:** sorteo semanal del 5 % y fusión de duplicados |
| 3.5 Informes | 🟡 | Panel «Informe» del día, la semana o el mes, imprimible en una página para el candidato. **Falta:** envío automático, estadísticas avanzadas, metas, historia electoral e importar y exportar |
| 3.6 Escucha | 🟡 | Panel «Necesidades» por eje con su recorrido (C-19). **Falta:** banco de propuestas, programa versionado, historias y encuestas (lo público queda para la página de la campaña) |
| 3.9 Incidentes | ✅ App y panel | Reporte confidencial desde la app (sin señal también) y revisión en el panel |
| 3.10 Ayuda | ✅ App | P-45 con preguntas frecuentes, reportar un error y novedades |
| 3.11 Persona | 🟡 | **Cumpleañeros de hoy** en la app y el panel, con fecha de cumpleaños aparte (0018). **Falta:** línea de tiempo completa de la persona |
| Visitas (pedidos del dueño) | ✅ | Más necesidades, una sola pregunta, finca solo en rural, sostén sin «Relación» y sin repetir, fechas con listas y edad, varios canales, contratista del Estado, sin «Dirección errónea», retomar la visita sin terminar |
| Servidor | ⏳ Espera autorización | Migraciones **0018** (cumpleaños, canales, sostén, panel de seguridad, incidentes y necesidades) y **0019** (eventos), probadas en GitHub y en seco contra producción. Aplicarlas pide la autorización expresa del dueño |

### 3.1 Territorio y zonas

- [ ] **P-38 Editor de zonas (O-14):** dibujar, editar, unir y dividir polígonos, asignar a colaboradores o grupos y fijar metas (5.9).
- [ ] Ficha de zona: viviendas registradas y estimadas, cobertura, equipo, necesidades principales y última visita. Anillo de avance y sombreado al completarse.
- [ ] Zonas propias resaltadas en el mapa de cada colaborador.
- [ ] Polígonos revisados en el terreno (22.4-12).
- [ ] **Modo Reconocimiento (5.10)**, con la **precarga de edificaciones** de fuentes abiertas (N-01, decisión 23.1-20) como universo para medir la cobertura.
- [ ] **P-17 Mis zonas y ruta del día (5.11):** pendientes ordenados por cercanía, posibilidad de reordenarlos, «Cómo llegar» en Google Maps o Waze, y «Grabar recorrido» con un resumen de tiempo, distancia y viviendas.
- [ ] Capas completas (5.8):
  - Seguimientos vencidos y densidad de viviendas.
  - Necesidades por tema y problemas reportados.
  - Eventos y puestos de votación.
  - Lugares y organizaciones clave.
  - Mi ruta y compañeros en línea.
- [ ] **Vistas guardadas** de capas y filtros (5.8).
- [ ] **Capa de estado de caminos** (N-03), con vencimiento de cada reporte.
- [ ] **Equidad territorial** (N-04): cobertura por vereda frente a su población estimada.
- [ ] **Capa de simpatía agregada** (5.8, O-04), por zona o cuadrícula y nunca por casa.
- [ ] Búsqueda por nombre o cédula solo para quien tenga permiso (5.2).

### 3.2 Jornada y seguridad en terreno

- [ ] **P-46 Jornada (5.12):**
  - Iniciar, pausar hasta 60 minutos y terminar.
  - Ubicación compartida solo durante la jornada, cada unos 30 segundos.
  - Servicio de ubicación en primer plano (Android 14), con la API objetivo 34 o más.
- [ ] Ubicación en vivo del equipo (O-21), solo con las iniciales, y borrado a los 7 días (R-31).
- [ ] **SOS (R-32):** mantener presionado 3 segundos y la alerta llega al Director, al Administrador y a dos contactos de emergencia. Con **SOS por mensaje de texto** cuando no hay datos (N-06). Atención del SOS desde el panel.
- [ ] **Revisión de bienestar** cada 2 horas: si no hay respuesta en 15 minutos y el teléfono no se mueve, avisa al Director.
- [ ] **Alerta de no regreso:** al iniciar la jornada se fija la hora prevista de fin. Si a esa hora la jornada no se cierra, avisa al Director.
- [ ] **Jornada nocturna:** alerta al Director, o bloqueo configurable, si alguien inicia o mantiene una jornada de noche y solo (21).
- [ ] **Trabajo en parejas en zona rural** (N-07).
- [ ] **Notificaciones push:**
  - Horario silencioso de 9 p. m. a 6 a. m., salvo las urgentes.
  - **Configurables por tipo** desde P-44.
  - Resumen diario.
  - Sin datos personales en el texto.
  - Aviso de ingreso desde un dispositivo nuevo (4.10).

### 3.3 Gestión del equipo (sección 10)

- [ ] P-36 completo (10.1):
  - Tipo de vinculación, capacitación, acuerdos y declaración.
  - Contacto de emergencia, visible solo para el Director y el Administrador.
  - Resumen de actividad y observaciones privadas del Director.
- [ ] **Asignaciones y turnos (10.2):**
  - Grupos de trabajo, que no son roles.
  - Calendario de jornadas con confirmación y recordatorio la noche anterior.
  - Cobertura mínima por zona.
  - Cambio de turno con aprobación del Director.
- [ ] **P-18 Tareas completas (10.3):**
  - Tipos C-13, prioridad, vínculo, estados, evidencias y comentarios.
  - Vistas de lista, mapa y calendario.
  - Tareas automáticas: seguimientos, verificaciones, revisión de permisos y retiro de propaganda.
- [ ] **P-19 Eventos (10.4, O-10):**
  - Tipos C-12, lugar en el mapa y público.
  - Invitaciones: a ciudadanos solo si autorizaron.
  - Asistencia con QR, sin datos de menores.
  - Fotos, resultados y gastos.
  - Recordatorios 24 y 2 horas antes, «Agregar a mi calendario» y recordatorio legal fijo sobre obsequios.
- [ ] **P-20 Anuncios y notificaciones completos (10.5, O-11):** prioridad, destinatarios por zona o grupo, adjuntos, confirmación de lectura, fijado y caducidad.
- [ ] **Mensajes internos** uno a uno y por zona (10.5): con aviso de no compartir datos de ciudadanos, guardados para auditoría y con la opción de silenciar del Director.
- [ ] **P-21 Directorio del equipo:** el teléfono solo lo ven el Director y el Administrador; los demás usan «Escribir por la app».
- [ ] **P-25 Capacitación (10.6):**
  - Cursos adicionales: uso avanzado, atención de solicitudes, comunicaciones y testigos (este último en la Fase 4).
  - Certificado con código y vigencia de 6 meses, con refrescos.
- [ ] **Tarjeta de visita con QR** (N-09), que enlaza a P-52 (construida en la Fase 1) y a «Mis datos». El carnet se renueva junto con la vigencia del certificado.
- [ ] **Registro mínimo de gastos** desde marzo: fecha, categoría C-14, valor, responsable y foto del soporte. Cubre los gastos de eventos, de «Casa amiga» y los pagos a colaboradores contratados antes de que llegue el módulo completo de finanzas en la Fase 4, que importa estos registros. El abogado confirma si también deben reportarse los gastos de la recolección de firmas.
- [ ] **Reconocimiento y desempeño (10.8):** insignias sin dinero y ranking opcional por calidad y cumplimiento (R-30, decisión 23.1-7).
- [ ] **Salida del equipo (10.9):** lista de cierre, reasignación, recordatorio de confidencialidad y certificado.
- [ ] **«Ver como» (4.11):** solo lectura, con franja visible y auditoría.

### 3.4 Calidad y anti-fraude

- [ ] **P-39 Calidad y verificación (6.5, O-07):**
  - Alertas y registros en rojo.
  - Fotos repetidas, por su huella, o que no coinciden con las coordenadas.
  - GPS falso y velocidades imposibles (N-08).
  - Fuera de zona u horario y datos idénticos.
- [ ] **Sorteo semanal del 5 %** de las visitas, con verificación por llamada solo a quien autorizó el contacto, y su resultado (R-27). Revisión del colaborador cuando acumula alertas.
- [ ] **Duplicados y fusión** de viviendas y personas, conservando todo el historial (6.6, O-20).
- [ ] Reglas R-26 y R-28 completas.

### 3.5 Estadísticas, informes, importar y exportar

- [ ] **Estadísticas avanzadas** (9.4, O-03): rendimiento por colaborador, comparativos, tendencias, embudo, rangos de edad, electores estimados, primeros votantes y jefatura femenina.
- [ ] **Mapas de calor** (O-04), siempre agregados y nunca por casa.
- [ ] **Panel del Director (9.5):**
  - Semáforo por zona.
  - Alertas de calidad y permisos por vencer.
  - Solicitudes de ingreso y de titulares con sus plazos.
  - Incidentes.
  - Quién está en jornada.
  - Metas y finanzas, que se activan en la Fase 4.
- [ ] **Metas y alertas (9.8):** metas por zona y fecha y semáforo del ritmo (verde, amarillo entre 70 % y 99 %, rojo por debajo de 70 %).
  - Alertas concretas, como «la vereda X no tiene visitas hace 14 días», «hay 12 seguimientos vencidos» o «el colaborador Y tiene 5 registros en rojo».
  - Llegan al Director y, cuando corresponde, al colaborador involucrado.
- [ ] **Análisis histórico electoral y meta de votos (9.9):**
  - Carga de los resultados públicos anteriores por puesto y mesa, y de la participación.
  - Meta de votos por puesto con el margen del Director y mapa por puesto.
  - Se adelanta a esta fase porque sirve para **decidir dónde trabajar**.
  - **No predice resultados**.
- [ ] **Segmentos (9.10)**, con sus criterios escritos y nunca por simpatía ni por datos sensibles.
- [ ] **P-23 Informes (9.11):**
  - Diario a las 7 p. m., semanal los lunes a las 7 a. m., mensual y bajo demanda.
  - En PDF y hoja de cálculo.
  - Con marca de agua y auditoría.
  - **Informe de una página para el candidato** (N-15).
- [ ] **P-40 Importar y exportar:**
  - Exportar (O-05): con motivo, marca de agua, límite diario y borrado del archivo a las 24 horas (R-25 y 8.5).
  - Importar (O-13): con fuente documentada (R-24) y nunca de bases compradas.
- [ ] **Panel de cumplimiento de datos** (N-11).
- [ ] **Simulador de carga** antes del despliegue (N-14): 300 usuarios al tiempo, 10.000 viviendas y **50.000 fotos** (17.4 y 22.5-9).

### 3.6 Escucha ciudadana y programa de gobierno (sección 11)

- [ ] **P-26 Solicitudes ciudadanas y necesidades (O-19):**
  - Recorrido de 11.5 con los estados C-19.
  - Clasificar en 7 días y responder en 30.
  - Orígenes de 11.2: visitas, eventos, encuestas, el canal público, reuniones, problemas reportados en el mapa y llamadas.
- [ ] **P-49 «Cuéntale a Pijao» (11.4):** página pública sin cuenta, con opción anónima, número de caso, protección contra mensajes basura y sin pedir cédula.
- [ ] **Banco de propuestas (11.6):** evidencia en el mapa, semáforo de competencia municipal, costo, plazo, indicador y **alerta de promesa irreal**. La lista de competencias la carga el equipo técnico con el abogado.
- [ ] **P-29 Programa de gobierno versionado (11.7):**
  - Versiones 0.x, y la 1.0 es la que se inscribe.
  - PDF con versión pública resumida (decisión 23.1-10).
  - Control de cambios y mapa del programa.
  - Revisar con el abogado los requisitos del voto programático (23.2-10).
- [ ] **Historias que nos unen (11.8):** con autorización aparte, estados y retiro si la persona revoca.
- [ ] **Devolución a la comunidad (11.9):** informe «Lo que escuchamos» por vereda y tema, agregado y aprobado por el Director.
- [ ] **Encuestas internas (O-22),** con el aviso legal de que no se divulgan como encuestas de intención de voto (23.2-13).
- [ ] **Registro por voz guiado** (N-05).

### 3.7 Voluntariado, líderes y organizaciones (sección 12)

- [ ] **P-27 Voluntarios y P-51 «Quiero ser parte» (12.1):**
  - Habilidades y estados: interesado, contactado, en capacitación, activo, inactivo y retirado.
  - Alerta si es servidor público.
  - Conversión a colaborador.
  - Mapa agregado de voluntarios y certificado.
  - Los menores de edad no se registran.
- [ ] **«Casa amiga» (12.2):** anfitriones con autorización, capacidad y dirección restringida.
- [ ] **P-28 Líderes y organizaciones, y mapa social (12.3):**
  - Organizaciones como entes, con su vocero en calidad pública.
  - Nivel de relacionamiento, sin «opositores».
  - Reuniones con actas.
  - Nunca la pertenencia individual de ciudadanos.
- [ ] **Compromisos programáticos (12.4):** con alerta si no tienen propuesta asociada y nunca compromisos personales.

### 3.8 Centro de información (P-24, 13.3)

- [ ] Programa en su versión autorizada, mensajes clave por eje, guion de visita en tarjetas, qué decir y qué no, preguntas frecuentes, respuestas a críticas, biblioteca legal y el kit de marca de la Fase 2.
- [ ] Con versiones, «modo tarjeta» para usar con una mano y descarga sin conexión.
- [ ] **Escudo de integridad (14.8):** biblioteca en lenguaje sencillo de lo que está prohibido.

### 3.9 Incidentes y calendario legal

- [ ] **P-34 Incidentes e irregularidades (C-17, confidencial):** protocolo de documentar, proteger a la persona, pedir asesoría y denunciar cuando proceda. Incluye las amenazas, las sospechas de compra de votos por terceros y los rumores.
- [ ] **Calendario legal (14.7):** hitos con responsable, estado, recordatorios a 30, 7 y 1 día y documentos asociados.
- [ ] **Inhabilidades e incompatibilidades (14.9):** lista de verificación con su estado y soporte, cerrada con el abogado antes de la inscripción del 30 de junio (23.2-11).

### 3.10 Perfil, ayuda y mantenimiento

- [ ] **P-44 Perfil y ajustes completo:**
  - Foto, datos y contraseña.
  - Dispositivos y notificaciones.
  - Tamaño de letra y modos oscuro y sol.
  - Mapas descargados y almacenamiento.
- [ ] **P-45 Ayuda y soporte (17.6):** preguntas frecuentes, reporte de error desde la app sin datos personales, contacto con el Administrador (meta de 24 horas) y «Novedades».
- [ ] **Modo mantenimiento** con un mensaje claro y ventanas de mantenimiento avisadas.
- [ ] Soporte definido, con responsable y horario (22.4-24).

### 3.11 Persona: complementos

- [ ] **Cumpleaños de la semana (7.5):** solo de personas que autorizaron el contacto, nunca de menores. Los mensajes de saludo llegan en la Fase 4.
- [ ] **Línea de tiempo completa (7.6):** visitas, eventos, tareas, consentimientos y solicitudes. Los mensajes se suman en la Fase 4.

### 3.12 Despliegue

- [ ] Lista de 22.4 completa antes del 15 de abril (ver el anexo).
- [ ] Capacitación de cada grupo, con el curso de ingreso y el modo práctica.
- [ ] Despliegue escalonado de 30, 100 y 300 colaboradores, mirando la salud de la flota y los errores en cada etapa.
- [ ] Prueba de rendimiento y batería con el equipo real (17.4).

### Criterio de salida de la Fase 3

300 colaboradores activos. Zonas asignadas y con sus metas. La jornada y el SOS probados en terreno. La calidad funcionando con su sorteo semanal. Los informes automáticos llegando al Director. El circuito de escucha a propuesta y a programa operando. El voluntariado y las organizaciones registrados. La decisión de mensajería (23.1-6) tomada para la Fase 4.

---

## Fase 4 · Campaña pública, finanzas, día de elecciones y cierre

**Fechas de construcción:** 1 de junio a 30 de septiembre de 2027.

**Tramos internos:**
- **Tramo 4A (1 al 30 de junio):** finanzas, que deben estar listas antes de la inscripción de candidaturas.
- **Tramo 4B (1 al 31 de julio):** primero la propaganda (P-31 lista el 15 de julio, antes de la posible apertura en espacio público) y después comunicaciones y redes, listas antes de la propaganda en medios del 5 de agosto.
- **Tramo 4C (1 de agosto al 30 de septiembre):** Día de elecciones, actualización de la meta de votos y herramientas de cierre.

**Operación:** congelamiento el 1 de octubre, elecciones el 31 de octubre y cierre hasta febrero de 2028.

### 4.1 Finanzas y cumplimiento (sección 14)

- [ ] Decisión del **gerente de campaña** (14.2 y 23.1-2) y su plantilla de permisos «Colaborador de finanzas» (O-15 y O-16, con verificación en dos pasos).
- [ ] Cerrar con el abogado los puntos 23.2-9 (fuentes, topes, límite por persona, personas jurídicas, cuenta única, plazos de Cuentas Claras y conservación de soportes).
- [ ] **P-32 Finanzas, ingresos (14.3):**
  - Todos los campos.
  - Sin aportes anónimos (R-37).
  - Límite por persona.
  - Validaciones de fuentes prohibidas.
  - Declaración del aportante.
  - Topes cargados por el Administrador según la resolución del CNE.
- [ ] **Gastos (14.4):**
  - Categorías C-14 como lista cerrada (R-40).
  - Soporte obligatorio (R-38).
  - Aprobación.
  - Vínculo con eventos y propaganda.
  - Recordatorio legal en los gastos de comida y obsequios.
  - Pagos a colaboradores por jornada o tarea verificada, nunca por cantidad de registros (10.8).
  - Pagos a personas naturales con **cuenta de cobro y soportes de seguridad social** cuando aplique, a confirmar con el contador.
  - Se importan los gastos del registro mínimo de la Fase 3.
- [ ] **Presupuesto y topes (14.5):**
  - Ejecución contra el presupuesto.
  - Alertas al 70, 85, 95 y 100 % (R-39), con bloqueo suave y doble confirmación al 100 %.
  - Proyección semanal.
- [ ] **Reportes (14.6):**
  - Exportaciones con los campos del formato de Cuentas Claras.
  - Lista de pendientes.
  - Libros de ingresos y de gastos.
  - Conciliación bancaria con carga manual.
  - Archivo de soportes.
- [ ] El resumen financiero y la lista de cumplimiento se activan en el panel del Director (9.5).

### 4.2 Comunicaciones (13.1 y 13.4)

- [ ] **Canales sin costo** (decisión 23.1-6): canal de difusión de WhatsApp al que la gente se une por decisión propia, envío uno a uno desde el teléfono del colaborador con plantilla aprobada (enlace `wa.me` o de SMS, registrado en la app) y correo por SMTP de Gmail con límite diario. El envío masivo automático de SMS **no es posible a costo cero**. Revisar las políticas de las plataformas sobre contenido político (23.2-15).
- [ ] **P-30 Comunicaciones (O-12):**
  - Plantillas aprobadas por el Director.
  - Destinatarios solo con autorización vigente **para ese canal** (R-34), elegidos por segmento.
  - Vista previa con el número de destinatarios y envío de prueba.
  - Horario de 8 a. m. a 8 p. m. y límite diario (R-35).
  - Identificación de la campaña y opción de baja en cada mensaje.
  - Registro de envíos y resultados.
  - Las bajas se reflejan al instante en la ficha de la persona.
  - Siempre se respeta «No contactar».
- [ ] Sin grupos de WhatsApp creados sin consentimiento: solo un canal de difusión al que la gente se une por decisión propia.
- [ ] Ningún mensaje con ataques ni desinformación, y los envíos masivos los aprueba el Director (R-36).
- [ ] **Uso de inteligencia artificial:** si se usa para redactar o segmentar, se registra y se informa (13.4, 16.6 y 23.2-14).
- [ ] **Recibo de autorización por mensaje** (N-10).
- [ ] Saludos de cumpleaños con plantilla (7.5). Agradecimientos a quienes autorizaron (11.9). Mensajes en la línea de tiempo de la persona (7.6).

### 4.3 Propaganda (13.5)

- [ ] Reglas vigentes de propaganda y perifoneo para Pijao, definidas por el abogado (23.2-8). Fecha de la propaganda en espacio público confirmada en el calendario (2.2).
- [ ] **P-31 Propaganda (O-17), lista a más tardar el 15 de julio de 2027**, porque la propaganda en espacio público podría abrir hacia el 31 de julio (en 2023 fue tres meses antes de la elección):
  - Inventario C-15 con ubicación en el mapa y **capa de propaganda** (5.8).
  - Permisos, fotos de instalación y retiro, costo y estados.
  - Alertas legales de ventanas de tiempo y tamaños.
- [ ] Recorridos y horarios de perifoneo. Registro de pautas digitales pagadas para la rendición de cuentas.
- [ ] Retiro posterior a la elección con tareas automáticas y su plazo.

### 4.4 Redes y reputación (13.6)

- [ ] Calendario de contenidos con su flujo de aprobación (idea, en diseño, aprobada y publicada).
- [ ] Registro manual de menciones y comentarios relevantes.
- [ ] Protocolo de rumores (verificar, documentar, responder con datos y archivar) y **«muro de verdad»**.

### 4.5 Análisis histórico y meta de votos (9.9)

- [ ] Se construyó en la Fase 3 (bloque 3.5). Aquí solo se actualiza la meta por puesto cuando se publique el censo electoral (31 de julio de 2027) y la lista oficial de puestos y mesas (5 de agosto de 2027).

### 4.6 Día de elecciones (sección 15, O-18, P-33)

- [ ] Plazos y procedimientos de testigos y reclamaciones revisados con el abogado (23.2-12).
- [ ] **Antes del día (15.2):**
  - Testigos con su acreditación y suplente.
  - Puestos de votación con la lista oficial y su capa en el mapa.
  - Mapa de cobertura de mesas.
  - **Curso obligatorio de testigos**.
  - Logística de kits, transporte y alimentación con su gasto registrado.
  - **Plan de comunicaciones del día:** quién llama a quién, canales de respaldo y contactos jurídicos.
  - Plantilla de permisos «Día de elecciones».
- [ ] **Durante la jornada (15.3):**
  - Apertura de mesa.
  - Incidentes en tiempo real (C-17) y semáforo por puesto.
  - Participación agregada por mesa, sin registrar quién votó (R-42).
  - Mensaje informativo solo a quien autorizó.
  - **Cierre con foto del E-14** y validación de que la suma cuadra.
  - Solo reportan los testigos acreditados (R-41).
- [ ] **Conteo paralelo** y comparación con el preconteo oficial, cargado a mano.
- [ ] **Sala de control (15.4):**
  - Mapa de puestos con su estado, mesas instaladas, incidentes, mesas reportadas y resultados parciales.
  - Línea de tiempo y botón para llamar a los testigos sin reporte.
  - Registro de decisiones.
- [ ] **Reclamaciones y escrutinios (15.5):**
  - Plantillas y estados.
  - Calendario de las comisiones escrutadoras, delegados y abogados.
  - La app no presenta nada por su cuenta.
- [ ] Líneas rojas de 15.7 verificadas una por una.
- [ ] **Plan B en papel:** formularios impresos (21).
- [ ] **Cuatro simulacros** con datos de práctica:
  - 19 de septiembre y 10 de octubre: ensayos generales con la prueba de carga del día E.
  - **24 de octubre** (una semana antes) y **30 de octubre** (el día anterior), como pide 15.2.
  - Los dos últimos no cambian el software, así que no rompen el congelamiento.

### 4.7 Herramientas de cierre (16.9)

- [ ] Pedir por el canal autorizado una **nueva autorización** a quien quiera seguir recibiendo información de participación ciudadana.
- [ ] Ejecución del plan de cierre:
  - Eliminar o anonimizar los datos personales, fotos con personas y notas de quienes no autorizaron continuar.
  - Conservar solo estadísticas agregadas.
  - Separar los documentos contables por su plazo legal.
  - Borrar los respaldos antiguos y las copias en los teléfonos.
  - Cerrar las cuentas y revocar los accesos.
- [ ] **Acta de eliminación** firmada por el Administrador y el Director.
- [ ] Garantía de que los datos no pasan al gobierno municipal ni se usan para otra cosa (R-43 y R-44).

### 4.8 Operación final

| Fecha | Qué pasa |
|---|---|
| 1 de octubre de 2027 | **Congelamiento**: solo arreglos críticos, con vuelta atrás probada |
| 10 de octubre de 2027 | Segundo simulacro |
| 16 de octubre de 2027 | Publicación de los jurados de votación |
| 24 de octubre de 2027 | Tercer simulacro, una semana antes |
| 30 de octubre de 2027 | Cuarto simulacro, el día anterior, con revisión de los kits de testigos |
| 31 de octubre de 2027 | **Elecciones**, con turno técnico de guardia y el panel de la flota abierto |
| Desde el 2 de noviembre de 2027 | Escrutinios generales y reclamaciones |
| Noviembre de 2027 | Después de la jornada (15.6): resultados oficiales, comparación, informe, agradecimientos, gastos finales y retiro de propaganda |
| Hasta febrero de 2028 | Rendición final de cuentas y **ejecución del plan de cierre** con su acta |

### Criterio de salida de la Fase 4 (proyecto al 100 %)

- Finanzas al día y exportables para Cuentas Claras.
- Comunicaciones y propaganda operando dentro de la ley.
- Día de elecciones ejecutado con conteo paralelo.
- Plan de cierre ejecutado y acta firmada.
- Cada elemento del anexo marcado como hecho.

---

## Fuera del alcance (a propósito)

- **Separar los datos por campaña para reutilizar el sistema** (Apéndice B-12). El documento lo deja para el futuro.
- **Funciones descartadas en 25.5:** transporte de votantes, seguimiento de la intención de voto individual, perfiles automáticos con inteligencia artificial y cruce con bases externas de personas.
- **Datos ampliados sensibles**, como la discapacidad en el hogar (23.1-9), salvo que el Director y el abogado decidan otra cosa.
- **Versión para iOS:** fuera del alcance por costo (cuenta de Apple de US$ 99 al año).
- **Servicios de pago:** cualquier servicio con suscripción, pago por uso o tarjeta obligatoria (ver `docs/Analisis-Costo-Cero.md`).

---

# Anexo · Trazabilidad completa (nada por fuera)

Cada elemento del documento maestro, con la fase en que se construye. **F1** es Cimientos, **F2** es Diseño, **F3** es Operación y **F4** es Campaña pública y cierre. Las 53 pantallas, además, se **diseñan** todas en la F2.

## A. Pantallas P-01 a P-53

| Pantalla | Fase | Pantalla | Fase | Pantalla | Fase |
|---|---|---|---|---|---|
| P-01 Bienvenida | F1 | P-19 Eventos | F3 | P-37 Permisos | F1 |
| P-02 Iniciar sesión | F1 | P-20 Anuncios y notificaciones | F1 básico · F3 completo | P-38 Editor de zonas | F3 |
| P-03 Verificación | F1 | P-21 Directorio | F3 | P-39 Calidad | F3 |
| P-04 Crear cuenta | F1 | P-22 Estadísticas | F1 básico · F3 avanzado | P-40 Importar y exportar | F3 |
| P-05 Acuerdos | F1 | P-23 Informes | F3 | P-41 Auditoría | F1 |
| P-06 Capacitación inicial | F1 | P-24 Centro de información | F3 | P-42 Configuración | F1 |
| P-07 Recuperar acceso | F1 | P-25 Capacitación | F1 curso de ingreso · F3 resto | P-43 Salud del sistema | F1 |
| P-08 Inicio | F1 | P-26 Solicitudes ciudadanas | F3 | P-44 Perfil y ajustes | F1 básico · F3 completo |
| P-09 Mapa | F1 | P-27 Voluntarios | F3 | P-45 Ayuda | F3 |
| P-10 Ficha rápida | F1 | P-28 Líderes y organizaciones | F3 | P-46 Jornada y SOS | F3 |
| P-11 Registrar aquí | F1 | P-29 Programa de gobierno | F3 | P-47 Modo práctica | F1 |
| P-12 Nueva visita | F1 | P-30 Comunicaciones | F4 | P-48 Carnet digital | F1 |
| P-13 Detalle de vivienda | F1 | P-31 Propaganda | F4 | P-49 Cuéntale a Pijao | F3 |
| P-14 Detalle de persona | F1 (línea de tiempo completa en F3 y F4) | P-32 Finanzas | F4 | P-50 Mis datos | F1 |
| P-15 Buscar | F1 | P-33 Día de elecciones | F4 | P-51 Quiero ser parte | F3 |
| P-16 Mis visitas y pendientes | F1 | P-34 Incidentes | F3 | P-52 Verificación de carnet | F1 |
| P-17 Mis zonas y ruta | F3 | P-35 Derechos de los titulares | F1 | P-53 Política de datos | F1 |
| P-18 Tareas | F1 básico · F3 completo | P-36 Gestión de colaboradores | F1 básico · F3 completo | | |

## B. Reglas R-01 a R-45

| Fase | Reglas |
|---|---|
| F1 | R-01, R-02, R-03, R-04, R-05, R-06, R-07, R-08, R-09, R-10, R-11, R-12, R-13, R-14, R-15, R-16, R-17, R-18, R-19, R-20, R-21, R-22, R-23, R-28, R-29, R-33, R-45. También la parte del servidor de R-26 |
| F3 | R-24, R-25, R-26 (completa), R-27, R-30, R-31, R-32 |
| F4 | R-34, R-35, R-36, R-37, R-38, R-39, R-40, R-41, R-42 (se verifica en todas las fases), R-43, R-44 |

## C. Permisos opcionales O-01 a O-22

El sistema de permisos, las plantillas (4.6) y el alcance por zona (4.7) están en la F1. Cada permiso se activa cuando existe su función:

| Fase | Permisos |
|---|---|
| F1 | O-01, O-02, O-06, O-08, O-09, O-11 |
| F3 | O-03, O-04, O-05, O-07, O-10, O-13, O-14, O-19, O-20, O-21, O-22 |
| F4 | O-12, O-15, O-16, O-17, O-18 |

## D. Catálogos C-01 a C-20

Todos se revisan con el Director y se cargan en la F1 (bloque 1.0) y se editan en P-42 (F1). Cada uno se usa así:

| Catálogos | Dónde se usan | Fase |
|---|---|---|
| C-01 a C-11, C-16, C-18, C-20 | Mapa, visitas, personas y derechos | F1 |
| C-12, C-13, C-17, C-19 | Eventos, tareas, incidentes y necesidades | F3 |
| C-14, C-15 | Gastos y propaganda | F4 |

## E. Funciones nuevas N-01 a N-15

| Fase | Funciones |
|---|---|
| F1 | N-02 (mapa propio sin conexión), N-12 (salud de la flota), N-13 (versión mínima y actualización instantánea) |
| F2 | Diseño de N-09 (tarjeta de visita con QR) |
| F3 | N-01, N-03, N-04, N-05, N-06, N-07, N-08, N-09, N-11, N-14, N-15 |
| F4 | N-10 (recibo de autorización por mensaje) |

## F. Hallazgos de seguridad y calidad (sección 24)

| Fase | Hallazgos |
|---|---|
| F1 | C1, C2, A1, A2, A3, A4, A5, A6, A7, A8, M1, M2 (descarga por zonas), M3, M4, M5, M6, M7, B1, B2, y todos los puntos de calidad técnica de 24.4 |

## G. Lista de lanzamiento 22.4 (los 24 puntos)

| Punto | Fase |
|---|---|
| 1 abogado y textos · 2 RNBD · 3 términos de los proveedores · 4 aviso con el proveedor fuera de Colombia · 5 permisos probados · 6 verificación en dos pasos · 7 cifrado · 8 respaldos · 9 códigos de recuperación · 10 curso y práctica · 11 catálogos y veredas · 13 sin señal en vereda · 14 gama baja · 15 teléfono perdido · 16 «Mis datos» · 17 plan de incidentes · 18 plan de cierre escrito · 19 calendario legal · 23 instalación privada | F1 |
| 20 textos revisados · 21 logos y colores · 22 piloto completado | F2 |
| 12 polígonos revisados en terreno · 24 soporte con horario | F3 |

## H. Lista técnica 22.5 (los 13 puntos)

| Punto | Fase |
|---|---|
| 1 a 8, 10, 11, 12 y 13 | F1 |
| 9 (prueba de carga) | F3, y se repite en F4 para el día de elecciones |

## I. Decisiones de la sección 23.1 (las 20)

| Decisión | Se toma en | Fecha límite |
|---|---|---|
| 1 forma de inscripción · 3 vinculación · 4 tamaño del equipo y teléfonos · 5 mapas · 8 visibilidad · 9 datos ampliados · 11 dominio · 12 presupuesto · 13 suplente · 14 inicio del campo · 15 alcance geográfico · 16 cartografía · 17 tecnología · 18 mapa sin conexión · 19 custodio | F1 | 30 de noviembre de 2026 |
| 2 gerente de campaña | F1 | 31 de enero de 2027 |
| 20 precarga de edificaciones | F3 | 15 de marzo de 2027 |
| 7 ranking · 10 programa público | F3 | 30 de abril de 2027 |
| 6 mensajería | F3 | 31 de mayo de 2027 |

## J. Puntos legales de la sección 23.2 (los 18)

| Punto | Fase |
|---|---|
| 1 circulares de la SIC · 2 RNBD · 3 alojamiento fuera de Colombia · 4 simpatía · 5 plazos · 6 menores · 7 servidores públicos · 16 conservación contable · 17 listados oficiales | F1 |
| 18 uso de la marca y el logo | F2 |
| 10 voto programático · 11 inhabilidades · 13 encuestas | F3 |
| 8 propaganda y perifoneo · 9 financiación · 12 testigos · 14 inteligencia artificial · 15 plataformas de mensajería | F4 (el punto 9 se abre en F1) |

## K. Apéndice B, notas para quien construya (las 13)

| Nota | Fase |
|---|---|
| 1 servidor · 2 app móvil · 3 mapas · 6 seguridad · 8 ambientes · 9 rendimiento · 10 textos centralizados · 11 configuración sin código · 13 entrega profesional | F1 |
| 4 panel web | F1 inicial · F3 y F4 crecen con cada módulo |
| 5 páginas públicas | F1 (P-50, P-52 y P-53) · F3 (P-49 y P-51) |
| 7 calidad y pruebas | Todas las fases |
| 12 separación por campaña | Fuera del alcance |

## L. Secciones del documento maestro

| Sección | Fase |
|---|---|
| 1 y 2 (propósito, principios y líneas rojas) | Reglas permanentes de todas las fases (0.4) |
| 3 Identidad visual | F2 |
| 4 Roles y permisos | F1 (4.11 «Ver como» en F3) |
| 5 Mapa | F1 (5.1 a 5.8, 5.13 a 5.16) · F3 (5.9 a 5.12, capas y vistas completas) |
| 6 Viviendas y visitas | F1 (6.5 completo y fusión de duplicados en F3) |
| 7 Personas | F1 (7.1 a 7.4, 7.7 y 7.8) · F3 (7.5 y 7.6) · F4 (mensajes de 7.5 y 7.6) |
| 8 Base de datos | F1 (8.1 a 8.13: servicios, tablas de 8.2 creadas a medida que llega cada módulo, ubicaciones, reglas por fila, fotos, tiempo real, sincronización, cifrado, auditoría, respaldos, costos, ambientes e integraciones) |
| 9 Estadísticas | F1 (9.1 a 9.3, 9.7) · F3 (9.4 a 9.6, 9.8 a 9.11) · F4 (actualización de la meta de votos con el censo oficial) |
| 10 Equipo | F1 (curso de ingreso con certificado, acuerdos, carnet, tareas y anuncios básicos) · F3 (el resto) · F4 (pagos dentro de finanzas) |
| 11 Escucha y programa | F3 (11.1 a 11.9) |
| 12 Voluntariado | F3 (12.1 a 12.4) |
| 13 Comunicaciones | F1 (guion y preguntas frecuentes mínimos de 13.3) · F2 (13.2 kit) · F3 (13.3 completo) · F4 (13.1, 13.4 a 13.6) |
| 14 Finanzas y cumplimiento | F1 (14.10 si va por firmas; alertas de residencia dudosa y notas sospechosas de 14.8) · F3 (registro mínimo de gastos, 14.7, biblioteca e incidentes de 14.8, 14.9) · F4 (14.1 a 14.6) |
| 15 Día de elecciones | F4 (15.1 a 15.7) |
| 16 Protección de datos | F1 (16.1 marco legal con el abogado, 16.2 roles y oficial de datos, 16.3 principios, 16.4 a 16.7, 16.8 RNBD, diseño de 16.9) · F4 (ejecución de 16.9) · 16.10 ética: permanente |
| 17 Sin internet y rendimiento | F1 (17.1 a 17.5) · F3 (17.6 y la medición de 17.4 con el equipo real) |
| 18 Pantallas | Ver el anexo A |
| 19 Reglas y catálogos | 19.1 valores en P-42 (F1) · 19.2 reglas (anexo B) · 19.3 catálogos (anexo D) |
| 20 Historias de uso | Son las pruebas de aceptación: la 1 y la 5 en F1, la 2 y la 4 en F3, la 3 en F1 y la 6 en F4 |
| 21 Riesgos | Cada riesgo se cubre con lo que dice su fila. El plan B en papel va en F4 |
| 22 Fases | 22.1 y 22.2 reemplazadas por este plan · 22.3 piloto en F2 · 22.4 y 22.5 en los anexos G y H |
| 23 Decisiones y puntos legales | Ver los anexos I y J |
| 24 Estado real | 24.1 a 24.4 en el anexo F · 24.5 recomendación de tecnología en el bloque 1.1 |
| 25 Funciones nuevas | 25.1 a 25.4 en el anexo E · 25.5 fuera del alcance |
| 26 Registro de cambios | Se actualiza al cerrar cada fase |

*Fin del plan de construcción, versión 1.0.*
