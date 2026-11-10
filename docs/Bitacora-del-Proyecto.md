# PIJAO NOS UNE
## Bitácora del proyecto: contexto, decisiones y conversaciones con Claude

Este archivo guarda el contexto de las conversaciones con Claude Code, para que no se pierda nada cuando una conversación se comprime o se empieza otra. Cualquier sesión nueva debe leerlo primero, junto con:
- `docs/Plan-de-Construccion.md`, el plan y su avance;
- `docs/Pendientes-del-Equipo.md`, lo que solo puede hacer el equipo.

**Lo que no se guarda aquí, a propósito:** contraseñas, claves (la `service_role`, llaves de firma, contraseñas de aplicación), respaldos ni datos de personas. El repositorio es **público**.

*Última actualización: 7 de noviembre de 2026.*

---

## 1. El proyecto

- **Qué es:** la app de campaña de **Jaime González a la Alcaldía de Pijao** (Quindío). Las elecciones son el **31 de octubre de 2027**.
  - Los colaboradores recorren el municipio casa por casa y registran viviendas, hogares, personas y necesidades, con autorización válida y con o sin señal.
  - El Director y el Administrador aprueban cuentas, dan permisos, configuran y vigilan el sistema desde un panel web.
- **Repositorio:** https://github.com/santiagonzaleznieto-pixel/Pijao-Nos-Une. La rama de trabajo es `fase-1/cimientos-seguridad` y la de publicación es `main`.
- **Carpeta local:** `C:\Users\Usuario\Desktop\CLAUDE PIJO NOS UNE\Pijao-Nos-Une`
- **Supabase de producción:** proyecto `pijao-nos-une`, id `hxodqzorvvlkzensrsjr`, en el plan gratuito.
- **Panel web público:** https://santiagonzaleznieto-pixel.github.io/Pijao-Nos-Une/panel.html, publicado desde `main` con GitHub Pages.
- **Documento maestro:** `docs/Pijao-Nos-Une_Documento-Maestro_Fase1.md`. Las secciones citadas en el código (4.9, 16.4, R-33, P-07…) vienen de ahí.

## 2. Reglas permanentes del dueño del proyecto

1. **Costo cero:** cita del dueño: «Quiero que toda la aplicación se desarrolle utilizando exclusivamente tecnologías gratuitas y de código abierto, sin depender de suscripciones adicionales, servicios de pago ni APIs que requieran facturación». Ver `docs/Analisis-Costo-Cero.md`.
2. **Nunca subir a GitHub** respaldos ni la clave `service_role`. La app y la web usan solo la clave pública (anon).
3. **No ejecutar programas descargados** en el computador local.
4. **Claude no escribe contraseñas ni credenciales**: ni el ingreso a Supabase ni la contraseña de aplicación de Gmail. Eso lo hace el dueño.
5. **Subir a `main` pide aprobación en cada ocasión**, porque publica el sitio. A la rama de trabajo se sube libremente.
6. Los commits terminan con la línea de coautoría que indica Claude Code, hoy `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
7. **Idioma:** español sencillo, de usted en la app. El dueño no es programador: explicar sin jerga.
8. Instrucción del 7 de noviembre de 2026: «Las cosas que TENGO, POR OBLIGACIÓN que hacer yo, déjalas en una lista y en mi tiempo las iré haciendo. Lo que puedas hacer tú, HAZLO». Esa lista es `docs/Pendientes-del-Equipo.md`.
9. **Meta:** antes de empezar 2027, las fases deben estar listas para usar la app con datos y textos reales.

## 3. Las fases

| Fase | Contenido | Fechas del plan |
|---|---|---|
| 1 · Cimientos, seguridad y núcleo de campo | App segura con y sin señal, servidor endurecido, panel web y páginas públicas | 5 nov 2026 – 31 ene 2027. **Construcción terminada el 7 nov 2026** |
| 2 · Diseño visual | Sistema de diseño, 53 pantallas e imagen aplicada (con Claude Design) | 1 feb – 15 mar 2027, en paralelo con el piloto. El dueño quiere adelantarla |
| 3 y 4 | Ver `docs/Plan-de-Construccion.md` | — |

## 4. Cronología

| Fecha | Qué pasó |
|---|---|
| 16 – 27 oct 2026 | Primera versión en Python y Kivy subida como archivo comprimido. Flujo `apk.yml` y migraciones 0001 a 0012 en Supabase |
| 4 nov 2026 | Se descomprime el proyecto y se corrigen errores y seguridad. Documento maestro v1.1 y plan en 4 fases. Análisis de costo cero. Migración 0013 (seguridad del servidor), pruebas SQL e integración continua |
| 5 nov 2026 | Revisión de la 0013 (14 observaciones corregidas). Prueba técnica de React Native + Expo. **App nueva en `app/`**: reglas en TypeScript, capa de datos, sesión y todas las pantallas de campo. APK en GitHub Actions |
| 6 nov 2026 | Panel web, páginas públicas y migración 0014, con su revisión de seguridad |
| 7 nov 2026 (mañana) | Ficha rápida y detalle de la casa en el mapa. **Producción:** pg_cron activado; 0013 aplicada en tres partes, 0014 en dos, y 0015; función `registrar-con-codigo` v2. Ajustes de Auth: registro cerrado, contraseña de 12, TOTP. Canales de atención vacíos por decisión del dueño |
| 7 nov 2026 (tarde) | Bloque de cuentas y sesiones: migración 0016 y app 0.14.0 (APK `app-fase1-8`, Android 8 o superior) |
| 7 nov 2026 (noche) | **Cierre de la Fase 1:** migración 0017 (guion de visita, preguntas frecuentes, métricas del piloto y revisión mensual de permisos), app 0.15.0 con «Ocultar pantalla», panel con el tablero del piloto. Lista de tareas del equipo y esta bitácora |

## 5. Decisiones tomadas

- **Tecnología:** React Native + Expo (SDK 58) para la app, solo Android. iOS cuesta US$ 99 al año. El servidor es Supabase gratuito: Postgres, RLS, funciones `rpc_*`, pg_cron, Vault y Storage. El panel web usa Vite + React. El código Python queda como referencia de las reglas.
- **APK sin EAS:** se construye en GitHub Actions con `expo prebuild` y Gradle, y se publica en GitHub Releases. Las pre-versiones `app-fase1-N` salen de la rama.
- **Decisión 23.1-1:** la candidatura va por **partido o coalición**, así que no se construye el módulo de firmas (1.14).
- **Prueba en teléfono:** a falta de un teléfono, el dueño decidió seguir construyendo y validar antes del piloto.
- **Seguridad:**
  - El público solo entra por funciones, nunca leyendo tablas con la clave pública.
  - La auditoría usa huellas encadenadas.
  - La IP se toma de cabeceras que el cliente no puede falsificar.
  - El Director y el Administrador usan verificación en dos pasos (TOTP).
  - La base del teléfono va cifrada con SQLCipher.
- **Sesiones (R-33):** 14 días para el colaborador, 7 para el Director y 12 horas para el Administrador, cerradas cada hora con pg_cron porque el plan gratuito no las limita. «Limit duration of AAL1 sessions» queda apagado a propósito: cerraría la sesión de los colaboradores.
- **Suspensión:**
  - La automática (30 días sin actividad, solo colaboradores) **no borra el teléfono**, para no perder visitas sin enviar.
  - La manual sí lo borra.
- **R-45:** los acuerdos se vuelven a aceptar si cambian o cada 6 meses. Solo se exige con señal.
- **Recuperar la contraseña (P-07):** con un código por correo, sin enlaces. Necesita el SMTP de Gmail de la campaña porque el correo gratuito de Supabase solo llega al equipo del proyecto.
- **Límite conocido:** el bloqueo por cuenta tras 5 intentos necesita un gancho de Auth de pago. Queda el límite por dirección de Supabase.
- **Canales de atención (correo y WhatsApp):** vacíos por ahora; las páginas ofrecen el formulario «Mis datos» y la atención en persona.
- **Guion y preguntas frecuentes:** son textos con versiones que publica el Administrador en P-42. Van como borrador hasta que el abogado los apruebe. No piden el voto ni prometen nada, porque se usan antes del periodo oficial de campaña.
- **Métricas del piloto:** sin datos personales. Solo un tipo, un número y una categoría de una lista cerrada, y el tablero muestra totales sin decir quién envió cada dato.

## 6. Estado de producción (7 de noviembre de 2026)

| Pieza | Estado |
|---|---|
| Migraciones 0001 a 0015 y función `registrar-con-codigo` v2 | ✅ Aplicadas |
| Auth: registro cerrado, contraseña de 12, TOTP | ✅ |
| Migraciones 0016 y 0017 | ✅ Aplicadas el 7 nov 2026 con la autorización del dueño, y verificadas (tareas `pijao_cuentas`, `pijao_purgar_ubicaciones` y `pijao_revision_permisos`) |
| Panel y páginas en GitHub Pages | ✅ La rama se unió a `main` el 7 nov 2026 con la aprobación del dueño; Pages publica desde `main` |
| Cuentas en producción | Solo el Administrador y el Director, sin colaboradores todavía |

## 7. Notas técnicas para la próxima sesión

- **Pruebas:**
  - La integración continua (`.github/workflows/pruebas.yml`) corre Python, la app (jest y tsc con `tsconfig.nucleo.json`), el sitio (vitest y build) y la base de datos: `tools/probar_migraciones.sh` aplica las migraciones en Docker, en orden alfabético con `LC_ALL=C`, y corre `supabase/tests/*.sql`.
  - Docker no responde en el computador local, así que las pruebas SQL se confían a la integración continua.
- **Al escribir funciones en la base:** Supabase da permisos por defecto a las funciones nuevas, así que cada función interna lleva `revoke all … from public, anon, authenticated`. En las pruebas SQL, las tablas temporales que lee el rol `authenticated` necesitan `grant select`.
- **Comportamiento de Supabase:**
  - Borrar filas de `auth.sessions` invalida el token de renovación, y la app recibe `SIGNED_OUT`.
  - La API de administración (`createUser`) no se ve afectada por el registro cerrado.
- **Herramientas en este equipo:**
  - `gh` no está instalado; para GitHub se usa la API con `curl`.
  - Para el panel de Supabase se usa Claude in Chrome con la sesión del dueño.
  - El panel web tiene un modo demostración con roles de Administrador y Director para probar sin servidor (`.claude/launch.json` → `web-pijao`).
  - `npx expo lint` instala ESLint por su cuenta: no ejecutarlo, o deshacer ese cambio.

## 8. Mensajes del dueño en estas conversaciones (textuales)

**Hasta el 7 de noviembre (tarde):**
- «despues hago lo que tengo que hacer yo. pero, si puedes hacerlas por mi, mejor»
- «usa chrome. y no tenemos por el momento canales de atencion»
- «Ya está conectada» · «Ya, intenta otra vez» · «Lo hago a mano» · «No, hazlo tu, ya esta conectado»
- «ya esta la ultima version de la app en run workflow?»
- «continuemos con lo que sigue para dejar terminada la fase 1»

**7 de noviembre (noche):**
- «Terminamos con la fase 1?»
- «Quiero que dejes dentro de lo que se puede ya, esta primera fase para empezar ya la segunda. Mejor dicho, antes de iniciar el próximo año, ya deben de estar las fases terminadas para el próximo año usar la app con datos y textos reales. Las cosas que TENGO, POR OBLIGACIÓN que hacer yo, déjalas en una lista y en mi tiempo las iré haciendo. Lo que puedas hacer tú, HAZLO. Yo solo hago lo que si o si por obligación me corresponde a mí. También, todo el contexto y conversaciones comprimidas de este chat, déjalo en un archivo en el mismo repositorio de GitHub para no perder registros de ningún dato. Ahora si, termina toda esta fase uno, para que empecemos ya con la fase dos del diseño»


**8 de noviembre:**
- «Ya están en la app? Si no, hazla y corre el runworkflow para instalar la app»
- «Sí, sigue» (seguir llevando las demás pantallas al detalle del lienzo)
- «Espera, antes de que continúes. La versión que me diste a descargar, tiene un error. Cuando ingreso a las funciones de abajo como mapa y las demás; se me queda la pantalla así en blando, solucióname para ya para descargarla y mostrarla. Hazle un chequeo a qué nada esté fallando»
- «Primero que todo, háblame en español. Segundo: que falta para terminar esta segunda fase?»
- «Primero: el panel web déjalo solo para nosotros, el director y administrador. No quiero algo para el público como lo estás haciendo, ya que después, más adelante, crearemos una página de la campaña. Por ahora, todo lo que sea parte del equipo, déjalo en espera, pero todo lo que puedas hacer tú de esta fase dos, adelántalo. Empieza por los mapas, y continúa con todo lo demás hasta terminar toda la fase dos. Yo me iré a dormir, y cuando me levante, quiero que todo lo que tú puedes hacer de la fase dos esté hecho, subido a GitHub y corriendo su runworkflow para instalarlo apenas despierte. Trabaja duro esta noche, y haz todo lo que te hace falta de la fase dos, súbelo a GitHub, y déjame una lista de lo que tengo que hacer de mi parte para terminar toda esta fase dos y quedar listos para empezar la tercera.»
- «Otra cosa. Si acabas el límite, Vuelve a retomar apenas se restablezca. Ahora si, empieza a trabajar»

---

## 9. Resúmenes comprimidos de las conversaciones

Claude Code comprime la conversación cuando se alarga. Estos son esos resúmenes, traducidos al español y sin datos sensibles, en orden.

### Resumen 1 (5 de noviembre de 2026): la app nueva

- Se construyó la app nueva en `app/` (React Native + Expo) y se tradujeron las reglas de Python:
  - validación de cédula;
  - edades;
  - suma de los integrantes del hogar;
  - enmascarado de datos;
  - permisos que piden verificación.
- Pantallas: P-02 Entrar, P-04 Crear cuenta con código, estado de la cuenta, P-05 y P-06 acuerdos y curso, P-03 dos pasos, P-08 Inicio, P-09 Mapa con la ficha P-10, P-11 Registrar aquí y P-12, la visita de 12 pasos con un borrador en cada paso.
- Se agregaron tres librerías gratuitas: firma en SVG, QR del carnet y captura de la vista para sellar las fotos. Copia de seguridad del sistema desactivada.
- Ajustes del APK en GitHub Actions:
  - los errores de Gradle salen como anotaciones públicas;
  - la construcción se reintenta si falla una descarga de Maven.
- Pendiente en ese momento: confirmar el APK y probar en un teléfono.

### Resumen 2 (7 de noviembre de 2026, madrugada): mapa y producción

- **Mapa:** al tocar una casa se abre una ficha rápida con la foto de la fachada, el estado, el jefe de hogar, las personas, la última visita, las necesidades y el botón «Ver detalles de la casa». El detalle completo muestra la vivienda, el hogar, las personas con datos enmascarados, las necesidades, las visitas y las fotos. Probado en la demostración del panel. Se unió a `main` y quedó publicado.
- **Producción:**
  - pg_cron activado y borrado nocturno de ubicaciones programado;
  - 0013 aplicada en tres partes (18 funciones, cadena de auditoría y políticas de fotos);
  - 0014 (panel y páginas) y 0015 (permisos de los disparadores);
  - función `registrar-con-codigo` v2.

  Se comprobó desde afuera que las funciones públicas responden y que la clave pública no lee tablas.
- **Decisiones:**
  - seguir con la Fase 1 antes de la 2, porque el diseño necesita lo que enseñe el piloto y los logos;
  - Pages publica solo desde `main`;
  - el mapa tiene dos niveles de detalle, la ficha rápida y el detalle completo.

### Resumen 3 (7 de noviembre de 2026, tarde): cuentas y sesiones

- Migración 0016:
  - sesiones por rol;
  - suspensión automática;
  - volver a aceptar los acuerdos;
  - avisos de la cuenta.
- En la app: recuperar el acceso con un código por correo, la pantalla R-45 y el guardián de rutas, el inicio con avisos y un lector de acuerdos compartido.
- Android 8 como mínimo (API 26) con el complemento oficial de Expo. Pruebas jest de las reglas de cuentas y frases nuevas de auditoría en el panel.
- Guía de entrega actualizada con los pasos del correo. Todas las pruebas pasaron en GitHub, incluidas las SQL de la 0016, y se publicó el APK `app-fase1-8` (v0.14.0).
- Ajustes de Supabase hechos por Claude desde Chrome:
  - registro abierto desactivado (un registro de prueba responde `signup_disabled`);
  - contraseña mínima de 12;
  - TOTP activo y SMS apagado.

### Resumen 4 (7 de noviembre de 2026, noche): cierre de la Fase 1

- El dueño preguntó si la Fase 1 estaba terminada. La respuesta fue que no: faltaban cuatro piezas de la app, dejar listo producción y las tareas del equipo.
- Después pidió terminar todo lo posible, dejar sus obligaciones en una lista y guardar este registro. Se construyó:
  - **Migración 0017:**
    - el guion de visita y las preguntas frecuentes como textos con versiones (P-42), con borradores iniciales;
    - la tabla `metricas_piloto`, con `rpc_metricas` para que el teléfono envíe en lotes, una lista cerrada y un límite de 2.000 por persona y día;
    - `rpc_metricas_piloto`, el tablero para el Director y el Administrador;
    - el aviso mensual de revisión de permisos con pg_cron (`pijao_revision_permisos`, el día 1 de cada mes a las 8:00).
  - **App 0.15.0:**
    - la pantalla «Guion y preguntas», que funciona sin señal y tiene buscador;
    - un botón en el paso «Antes de empezar»;
    - las métricas: tiempo por registro, calidad, registros sin señal, GPS, errores de envío y cola atrasada;
    - el botón **«Ocultar pantalla»**, en la franja superior, en cada pantalla y en «Más»;
    - el aviso de revisión mensual en Inicio.
  - **Panel:** la página «Métricas del piloto» y los avisos en Inicio.
  - **Pruebas:** `supabase/tests/fase1_zz_cierre.sql`, `app/src/core/__tests__/cierre.test.ts` (81 pruebas de jest en total) y 26 pruebas del sitio. Todas pasaron en GitHub.
  - **Documentos:** `docs/Pendientes-del-Equipo.md`, esta bitácora y la tabla de avance del plan.
- El dueño aprobó el rumbo de la opción C animada («el mensaje después se editará») y autorizó poner la Fase 1 en producción: «quiero que la fase 1 salgamos ya de eso y nos dediquemos netamente a la fase 2». Se aplicaron la 0016 y la 0017 y la rama se unió a `main`.

### Resumen 5 (7 de noviembre de 2026, noche): arranque de la Fase 2

- Tres propuestas de la pantalla Inicio en un lienzo de Claude Design: A Institucional, B Territorio y C Pulso, todas claras y con los dos logos (el de texto con degradado y el circular ilustrado).
- El dueño eligió la **C** y pidió perfeccionarla: que no parezca diseño genérico de IA, elegante, con presencia y organización, con animaciones fluidas en todo y una animación de entrada limpia con un mensaje corto, inspirada en un video de referencia (una app de domicilios cuya ilustración entra desde un lado, revela el nombre y da paso a un panel que baja).
- Se hizo el prototipo «C refinada»:
  - entrada de unos 4 segundos: anillo de cuatro colores, el logo circular que llega desde la izquierda, «PIJAO NOS UNE» revelado por líneas con brillo y el mensaje provisional «Juntos, casa por casa.»;
  - el Inicio entra en cascada, con cifras que cuentan, barras que se llenan, botón con destello, pestaña con indicador deslizante y velo de «Ocultar pantalla»;
  - ritmo común: 0,18 s al tocar, 0,35 a 0,6 s para los elementos y una curva suave igual en toda la pantalla, con modo calmado si el teléfono tiene las animaciones apagadas.
- Enlace del lienzo (privado): https://claude.ai/artifact/ReqX728bukSmmqzNM7wUct
- El dueño dijo que la entrada y el Inicio animados van por buen camino («el mensaje después se editará») y pidió empezar ya con el sistema de diseño: «Si, empieza ya con eso».
- **Sistema de diseño, primera versión** (Claude Design · Design System, privado: https://claude.ai/artifact/QRhRen1fKqyW9bvE4i7pMy), en la rama `fase-2/diseno`, con copia en `diseno/sistema/`:
  - colores en tres modos: claro, oscuro y modo sol de alto contraste, con todo texto a 7:1 o más;
  - tipos Montserrat (títulos, cifras, botones) e Inter (lectura, 16 px de mínimo) y un grupo de letra grande ×1,25;
  - espacios, radios por función, sombras solo para lo que flota, y tiempos y curvas de animación;
  - 19 componentes con guía y muestra viva, el manual de marca (voz «usted», sin emojis, nada solo por color, una sola acción naranja por pantalla) y la portada;
  - faltan el lienzo de firma, el visor de cámara, las notificaciones y los gráficos.
- El dueño pidió: «Diseña primero las pantallas, y después hacemos los 4 componentes».
- **Pantallas, primera tanda** (lienzo privado https://claude.ai/artifact/4oCPiyRjau7oc9vx4JMpua, copia en `diseno/pantallas/`), con el sistema de diseño instalado en el lienzo:
  - acceso: P-01 Bienvenida, P-02 Entrar (con huella o rostro), P-03 Dos pasos, P-04 Crear cuenta con código, P-05 Acuerdos (leer hasta el final), P-06 Curso (lección 3 de 7) y P-07 Recuperar;
  - campo: P-08 Inicio, P-09 Mapa (marcadores con color y forma, leyenda, sin señal), P-10 Ficha rápida, P-11 Registrar aquí (precisión y casas cercanas), P-12 pasos 4 (resultado) y 10 (autorización por propósito y firma), P-13 Vivienda, P-14 Persona (datos enmascarados y autorizaciones), P-15 Buscar y P-16 Pendientes;
  - el Inicio en modo oscuro y modo sol;
  - pendientes de la fase: los 4 componentes, el resto de pantallas, los cuatro modos por pantalla y los estados.
- El dueño pidió: «Más pantallas. Termina todas las pantallas, y lo último son los 4 componentes».
- **Las 53 pantallas quedaron diseñadas** en el mismo lienzo, organizadas en 9 páginas. Se agregaron:
  - un juego de 60 íconos de línea y dos piezas reutilizables, la barra inferior y el menú del panel;
  - los pasos que faltaban de la visita y el registro rápido;
  - P-17 a P-35, incluidos SOS sin margen de error (mantener 3 segundos), día de elecciones, finanzas con el tope legal por confirmar y propaganda con su fecha legal;
  - el panel web de escritorio (P-36 a P-43);
  - P-44 a P-48;
  - las páginas públicas P-49 a P-53.
- **Los 4 componentes** entraron al sistema de diseño:
  - firma en pantalla (se puede firmar en la muestra);
  - cámara con sello;
  - notificaciones sin datos personales;
  - gráficos.

  La paleta de gráficos se validó con el script de `dataviz`: el verde y el naranja de la marca no se distinguen con daltonismo rojo-verde si van juntos, así que el orden fijo es azul, naranja, turquesa, verde, con tonos propios para el modo oscuro.
- El dueño preguntó si el diseño ya estaba en la app y pidió hacerlo y correr el flujo que construye el APK. **App 0.16.0:**
  - tema central con las medidas del sistema;
  - letras Montserrat e Inter (paquetes gratuitos de Google Fonts para Expo);
  - íconos de línea;
  - componentes base rediseñados con respuesta al toque;
  - barra inferior flotante con pastilla animada y franja de conexión con «Ocultar»;
  - animación de entrada (anillo, logo, nombre con degradado y «Juntos, casa por casa.»);
  - Inicio de la opción C con animaciones y pantalla de bloqueo con el logo.

  La lógica no se tocó: pasan las 81 pruebas y la revisión de tipos. Se subió a `fase-2/diseno` para que GitHub construya el APK.
- **Error de la 0.16.0 en el teléfono del dueño:** al tocar Mapa, Tareas o Más la app quedaba en blanco.
  - Causa: la barra inferior propia llamaba a `navigation.navigate`, y expo-router 58 no le entrega `navigation` (solo `state`, `descriptors`, `emitter`, `navigateToTab` e `insets`). El toque lanzaba `Cannot read properties of undefined (reading 'navigate')` y la app se caía. Una conversión forzada de tipos (`as unknown as`) escondía el error a TypeScript y las pruebas eran solo de lógica.
  - Arreglo (app 0.16.1): la barra usa el tipo real `BottomTabBarProps` de `expo-router/tabs`, sin conversión, y cambia de pestaña con `emitter.emit("tabPress")` y `navigateToTab(route.key)`, como la barra estándar.
  - La entrada animada ahora se quita sola aunque el teléfono no avise el final de la animación, y deja tocar mientras se desvanece.
  - Pruebas nuevas con `@testing-library/react-native` (solo desarrollo): `src/ui/__tests__/barra.test.tsx` toca cada pestaña y el botón naranja (se comprobó que falla con la barra de la 0.16.0), y `src/ui/__tests__/pantallas.test.tsx` abre todas las pantallas con los datos del modo práctica.

  - Resultado del chequeo: las 22 pantallas se abren sin errores con los datos de ejemplo y pasan las 106 pruebas. En las pruebas, el mapa `.pmtiles` se reemplaza por un recurso falso (`app/jest/archivo.js`) y `@/assets` apunta a `app/assets`, como en la app.
  - GitHub ahora revisa los tipos también de las pantallas y los componentes (`app/tsconfig.nucleo.json`), no solo de la lógica.

### Resumen 6 (9 de noviembre de 2026, madrugada): la Fase 2 de Claude, terminada

- Decisiones del dueño: **responder siempre en español**; el **panel web es solo para el Director y el Administrador**; **no se hacen páginas públicas** (la campaña hará su propia página después; las actuales siguen como están); lo que le toca al equipo queda en espera. Avance de la noche en `docs/Avance-Fase2-Noche.md`.
- **Mapa (2.4, 2.5):** marcadores PNG generados con el sistema de diseño (`app/assets/mapa`, a 3x y dibujados con `icon-size` 1/3) para los 13 tipos de 5.6, con color y forma; los números de los grupos también son imágenes porque el mapa sin conexión no lleva fuentes; grupos con el color del estado dominante (`clusterProperties`); «por enviar» con anillo punteado; ubicación propia con círculo de precisión (`UserLocation`); estilo con la paleta de la marca en claro, oscuro y sol; ficha rápida P-10 como hoja que sube; leyenda y «Ir a mi ubicación».
- **Generador de imágenes:** sin Pillow ni binarios descargados. Una página local dibuja los SVG en el navegador integrado y un servidor propio de 20 líneas (en el scratchpad, no en el repositorio) guarda los PNG en `app/assets`. Así salieron también el **ícono de la app** (la app todavía tenía el ícono por defecto de Expo), el ícono adaptable, el de notificaciones y el arranque con el logo.
- **Tema (2.3):** `app/src/ui/tema.ts` tiene las tres paletas del sistema y la letra ×1,25. La apariencia se lee al arrancar de forma sincrónica (`SecureStore.getItem`) para que todos los estilos salgan con la paleta correcta; al cambiarla en Perfil se guarda y la app se recarga con `expo-updates`. Nuevo color `invertida` para el texto sobre el botón sólido (en oscuro el botón es claro).
- **Componentes:** botón con ícono, botón de ícono, enlace, fila de enlace, buscador, chips, segmentos, interruptor, barra de pasos con el degradado, sección, dato, ficha, insignia, semáforo con palabra, avatar, fila de lista, cifra pequeña, separador y los **estados comunes** (esqueleto, vacío, sin señal, error con «Reintentar», sin permiso). Campo de contraseña con «mostrar». ~70 íconos, incluidos los 14 ejes del programa.
- **Pantallas (2.11):** todas al detalle del lienzo: Entrar, Crear cuenta en 3 pasos, Recuperar con medidor de fuerza, Dos pasos con 6 casillas, Cuenta, Acuerdos con barra de lectura, Curso, Registrar aquí con ondas y precisión, Nueva visita con barra de pasos y resumen, Vivienda con línea de tiempo, Persona, Buscar, Pendientes con segmentos, Tareas, Más, Perfil con modos, Anuncios, Titulares, Carnet y Guion.
- **Movimiento y textos (2.7, 2.8):** bienvenida de 1,9 s (el plan pide menos de 2); transición entre pasos de la visita; formatos comunes en `app/src/core/formato.ts` (día/mes/año, 12 horas con «a. m.»/«p. m.», hora de Bogotá, puntos de mil) sin depender de Intl, con pruebas.
- **Accesibilidad (2.9):** `app/scripts/contraste.js` calcula el contraste desde `tema.ts`: las 51 combinaciones pasan AA. Filtros y segmentos con margen de toque hasta 48. Informe en `docs/Accesibilidad-Fase2.md`.
- **Panel web:** solo `web/src/estilo/panel.css` y el menú de `App.tsx` (íconos, nombre con el degradado, avatar). Letras con `@fontsource` (OFL) servidas desde el mismo sitio, sin pedirlas a Google. Las páginas públicas siguen con `base.css` y no cambiaron.
- **Materiales (2.10):** volante con aviso de privacidad y QR a «Mis datos», certificado del curso y carnet para imprimir en `diseno/materiales/`.
- **Pruebas:** la prueba de humo abre las 22 pantallas con los datos de práctica; se agregaron las de formatos. Notas técnicas: `renderRouter` de expo-router usa relojes simulados (no esperar con `setTimeout`), `render` de Testing Library 14 es asíncrono, y la sesión falsa no debe responder a `then`.
- **Queda para el equipo:** la lista «7. Para cerrar la Fase 2» en `docs/Pendientes-del-Equipo.md`.

### Resumen 7 (10 de noviembre de 2026): las visitas no llegaban al servidor

- El dueño: «ya estoy empezando a registrar casas, y muchas veces me ha fallado el guardado de registros. cuando vuelvo a ingresar se me borra. necesito que me dejes esa parte de registrar casas al 100%». También: la parte pública se hace después; las pruebas serán solo con el equipo más cercano; él consigue un mapa de Pijao por zonas.
- **Diagnóstico en producción (solo lectura):** el servidor tenía **cero** viviendas, visitas y personas. Las métricas del piloto mostraban cada visita del dueño en **cuarentena** (5 entre la 0.16.0 y la 0.16.1). El teléfono aparece 3 veces en `dispositivos` (0.13.0, 0.16.0 y 0.16.1): cada versión entró como teléfono nuevo, señal de que entre versiones se borraron los datos de la app (desinstalar borra lo no enviado; la llave de firma es la fija de la plantilla de Expo, así que se puede instalar encima).
- **Causa 1 (la principal):** en el asistente, al pasar del paso 10 se guardaban las autorizaciones y enseguida el cambio de paso guardaba encima una copia vieja del borrador: las autorizaciones se perdían y el servidor rechazaba la visita con «R-15: falta la autorización de datos personales». Se reprodujo contra producción dentro de una transacción que se deshace: sin autorizaciones, rechazada; con ellas, aceptada.
- **Causa 2:** la fecha de nacimiento viajaba como día/mes/año y el servidor (DateStyle ISO, MDY) la lee como mes/día: «05/12/1990» quedaba como 12 de mayo y «25/12/1990» tumbaba la visita.
- **Arreglos (app 0.17.1):** `core/envio.ts` con `aplicarAutorizacion` (las autorizaciones viajan en el mismo guardado que cambia de paso), `problemasDeEnvio` (revisa antes de guardar las mismas reglas con que el servidor rechaza: R-15, R-16, R-17, rangos de edad, firma, papel, fechas, máximo de fotos) y `borradorDesdeRechazo`; fecha de nacimiento enviada como AAAA-MM-DD; «Corregir y enviar de nuevo» en Pendientes → Revisar (reabre la visita rechazada en el paso de autorización con sus datos y fotos, y la quita de la cola solo después de guardar el borrador); una visita nueva a una casa aún no enviada espera a la que la crea (`depende_de`). La visita completa armada por la app se probó contra producción en una transacción que se deshace: aceptada, verde, con 3 autorizaciones y la fecha correcta.
- Pruebas nuevas en `app/src/core/__tests__/envio.test.ts` (123 en total).

