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
