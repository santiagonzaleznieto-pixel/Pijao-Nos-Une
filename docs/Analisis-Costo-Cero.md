# PIJAO NOS UNE
## Análisis de costo cero: tecnologías gratuitas y de código abierto

| Dato | Detalle |
|---|---|
| Fecha | 4 de noviembre de 2026 |
| Pedido | Construir y mantener la app **sin costos recurrentes**, sin suscripciones, servicios de pago ni APIs que exijan facturación, aprovechando solo la suscripción actual de Claude. Priorizar lo local y lo de código abierto. Conservar Supabase si cabe en su plan gratuito |
| Conclusión | **Sí es viable** con React Native y Expo y con Supabase en su plan gratuito, con las 7 condiciones de la sección 6. Tres funciones previstas **no pueden ser gratuitas tal como estaban escritas** y se reemplazan por alternativas sin costo: iOS, SMS y WhatsApp masivos, y satélite sin conexión de proveedores comerciales |

---

## 1. ¿React Native con Expo permite todas las funciones previstas?

Se verificó la licencia de cada librería en el registro de npm (4 de noviembre de 2026). **Todas son MIT o BSD**: gratuitas, de código abierto y sin pagos por uso.

| Función del documento maestro | Librería | Licencia | ¿Cumple? |
|---|---|---|---|
| Base de la app | `react-native` 0.88 · `expo` SDK 58 | MIT | Sí |
| Mapa real, agrupación de puntos, polígonos y mapa sin conexión (5.x) | `@maplibre/maplibre-react-native` 11.5 con mapas en formato `pmtiles` 4.5 | MIT · BSD-3 | Sí |
| Cámara con sello y compresión (6.3) | `expo-camera` · `expo-image-manipulator` | MIT | Sí |
| GPS, muestreo y detección de GPS falso (5.3, N-08) | `expo-location` (en Android trae el indicador `mocked`) | MIT | Sí |
| Jornada con GPS en segundo plano y SOS (5.12) | `expo-location` + `expo-task-manager` (servicio en primer plano) | MIT | Sí |
| Base local cifrada (C1) | `@op-engineering/op-sqlite` con SQLCipher (edición comunitaria) | MIT · BSD | Sí |
| Llaves y sesión en almacén seguro (C1) | `expo-secure-store` (Android Keystore) | MIT | Sí |
| Huella o rostro (4.10) | `expo-local-authentication` | MIT | Sí |
| Bloqueo de capturas (M6) | `expo-screen-capture` | MIT | Sí |
| Detección de teléfono modificado (M6) | `jail-monkey` | MIT | Sí |
| Notificaciones locales y push (3.5, 10.5) | `expo-notifications` | MIT | Sí (ver 3.4) |
| Dictado por voz en el teléfono (3.6, 16.6) | `expo-speech-recognition` (reconocimiento en el dispositivo cuando el teléfono lo trae) | MIT | Sí |
| Firma en pantalla (6.3) | `react-native-signature-canvas` | MIT | Sí |
| Informes en PDF (9.11) | `expo-print` | MIT | Sí |
| Conexión con Supabase y tiempo real (8.6) | `@supabase/supabase-js` 2.x | MIT | Sí |
| Actualizaciones instantáneas (N-13) | `expo-updates` con un servidor propio (ver 3.3) | MIT | Sí |

**Lo único que no se puede hacer gratis:**
- **iOS.** Publicar o instalar en iPhone exige la cuenta de desarrollador de Apple (US$ 99 al año). **La app queda solo para Android**, que es la prioridad del documento (17.5).
- **Google Play** cuesta US$ 25 una sola vez y no hace falta: la app se instala por invitación (3.5).

---

## 2. Supabase en el plan gratuito

Límites verificados en supabase.com/pricing el 4 de noviembre de 2026.

| Límite gratuito | Necesidad de Pijao | ¿Cabe? | Cómo se cuida |
|---|---|---|---|
| **500 MB de base de datos** | Datos de texto de unas 3.000 viviendas, auditoría y ubicaciones de jornada | Sí | Las ubicaciones se borran a los 7 días (pg_cron). Alerta al 80 % |
| **1 GB de archivos** | El documento calculaba 2,7 GB de fotos (300 KB × 3 por casa) | **No, sin ajustes** | Fotos a **1.024 px y unos 100 KB**, con miniatura de 20 KB hecha en el teléfono. En la nube: 1 fachada vigente por vivienda (unos 300 MB), las fotos de problemas y las autorizaciones en papel. Las demás fotos se quedan en el teléfono del autor. Cuota por tipo y alerta al 80 % |
| **5 GB de tráfico sin caché + 5 GB con caché al mes** | 300 teléfonos viendo fotos y descargando mapas | Sí, con cuidado | Miniaturas y caché local. **El mapa sin conexión y el APK no se descargan de Supabase**, sino de GitHub Releases |
| **Pausa tras 7 días sin actividad** | La campaña trabaja a diario | Sí | Una tarea programada semanal en GitHub Actions mantiene activo el proyecto |
| **Sin respaldos automáticos** | El documento exige respaldo diario (8.10) | **No, sin ajustes** | **Respaldo propio** en el computador del Administrador (ver 3.5) |
| **200 conexiones de tiempo real simultáneas** | 300 colaboradores, aunque no todos al tiempo | Sí, con cuidado | Tiempo real solo con la app abierta en el mapa y consulta periódica de respaldo |
| 2 millones de mensajes de tiempo real | Uso normal | Sí | |
| 500.000 ejecuciones de funciones de servidor | Registro, actualizaciones y páginas públicas | Sí | |
| 50.000 usuarios activos | 300 | Sí | |
| **2 proyectos activos** | Producción y pruebas | Sí | Producción en la nube. Las pruebas se hacen en un **Supabase local con Docker**, gratis y de código abierto |
| Registros técnicos por 1 día | Diagnóstico | Sí | Tabla propia de errores (ver 3.6) |
| Capacidad de cómputo mínima (0,5 GB de RAM compartida) | 300 usuarios sincronizando | **Hay que probarlo** | Prueba de carga N-14 en la Fase 3, con paginación e índices |
| **Inicio de sesión por SMS** | El documento lo preveía (4.10) | **No** (exige Twilio u otro proveedor de pago) | Correo y contraseña más **verificación en dos pasos con aplicación autenticadora**, que es gratis en Supabase. El registro ya usa código de invitación |
| **Correos de Supabase** | Recuperar la contraseña | Limitado (unos pocos por hora) | Recuperación hecha por el Director (nuevo código) o envío por **SMTP de una cuenta de Gmail** propia, gratis y con unos 500 correos al día |

**Conclusión sobre Supabase:** se conserva en el plan gratuito, que no exige tarjeta. Hay que cambiar tres valores del documento: el tamaño de las fotos, los respaldos y el inicio de sesión sin SMS.

---

## 3. Servicios: cuál se usa y cuál es su alternativa gratuita

### 3.1 Construcción del APK

- **No se usa EAS Build**, el servicio de pago de Expo. Su plan gratuito permite 15 construcciones de Android al mes, con colas de más de 90 minutos.
- Se usa **GitHub Actions** con `expo prebuild` y Gradle. Como el repositorio es público, los minutos son ilimitados y gratis.
- La llave de firma va en los secretos de GitHub y en una copia fuera de línea.

### 3.2 Distribución de la app y del mapa

- El APK y el paquete del mapa de Pijao se publican en **GitHub Releases**, con descarga gratuita y sin límite de tráfico.
- Supabase no se usa para esto: 300 descargas de un APK de unos 60 MB sumarían 18 GB y romperían el límite de tráfico.

### 3.3 Actualizaciones instantáneas

- **Recomendado:** servidor propio del protocolo de `expo-updates` (MIT) en una **función de servidor de Supabase**, que solo entrega el manifiesto, que es liviano. Los paquetes de código se descargan de GitHub Releases. No hace falta otra cuenta.
- **Respaldo:** EAS Update gratis (1.000 usuarios activos al mes, sin tarjeta). Alcanza para 300 personas, pero depende de que Expo mantenga ese plan.
- Existen servidores de código abierto ya hechos (Xavia OTA, expo-open-ota), pero necesitan un servidor propio encendido, así que no son de costo cero.

### 3.4 Notificaciones

- Las **notificaciones locales** son 100 % locales y gratis. Cubren recordatorios, tareas nuevas tras sincronizar y el horario silencioso.
- **Las push** (el SOS al Director o los avisos urgentes) usan el servicio de push de Expo (gratis según su documentación oficial) sobre **Firebase Cloud Messaging**. FCM es gratis y no pide tarjeta, pero **no es código abierto**: es un servicio de Google.
- Plan B sin Google: avisos por tiempo real cuando la app está abierta, más SOS por mensaje de texto (N-06) desde el plan del propio colaborador.

### 3.5 Respaldos

- Un script `tools/respaldo.ps1` en el computador del Administrador corre cada noche con el Programador de tareas de Windows. Hace `pg_dump` de la base (por Docker o con las herramientas de PostgreSQL) y descarga los archivos del almacenamiento.
- Todo se cifra con `age`, que es de código abierto.
- Se guarda en el disco del Administrador y cada semana se copia a una USB guardada aparte.
- La prueba de restauración mensual se hace en el Supabase local.
- **Nunca se suben respaldos a GitHub:** el repositorio es público.

### 3.6 Reporte de errores y salud de la flota

- Se usan una **tabla propia en Supabase** (con limpieza de datos personales en el teléfono) y el panel P-43.
- No se usa Sentry, que es un servicio comercial.

### 3.7 Mapas

- **Calles:** datos de **OpenStreetMap** (licencia ODbL, gratis citando la fuente). Se recorta el área de Pijao de las compilaciones públicas de Protomaps con `pmtiles extract`, de unos pocos MB.
- **Edificaciones:** Google Open Buildings (CC BY 4.0) o Microsoft Building Footprints (ODbL), ambas gratis.
- **Satélite sin conexión:** **no hay una fuente comercial gratuita que lo permita.** Opciones sin costo:
  1. Ortofotos del **IGAC** en Colombia en Mapas (datos abiertos). Hay que confirmar si hay cobertura de Pijao.
  2. OpenAerialMap, si alguien publicó imágenes de la zona.
  3. Vuelo propio con dron. Es un gasto único, no recurrente, y solo si se decide.
- **Satélite en línea:** World Imagery de Esri exige hoy una cuenta de ArcGIS para usarlo en una app. Por eso queda **fuera** hasta revisar sus términos. La app funciona sin satélite: calles, relieve y edificaciones.

### 3.8 Direcciones (geocodificación)

- **Local:** el barrio o la vereda sale del polígono, con el código que ya existe en `pijao/core/geo.py`. El nombre de la calle sale del mapa de OpenStreetMap descargado.
- No se usa ninguna API de pago. Nominatim público solo como ayuda ocasional, respetando su límite de 1 consulta por segundo.

### 3.9 Panel web y páginas públicas

- **GitHub Pages**, gratis en un repositorio público. Son sitios estáticos que hablan con Supabase.
- **Protección contra mensajes basura:** ALTCHA (MIT), verificado en una función de servidor propia. No se usan captchas comerciales.

### 3.10 Dominio y correo

- Se usa el subdominio gratuito `github.io` y una cuenta de Gmail de la campaña.
- Un dominio propio cuesta unos US$ 10 a 15 al año: es **opcional** y no se usa.

### 3.11 Mensajes a ciudadanos (Fase 4)

- Las APIs de SMS y de WhatsApp Business **cobran por mensaje**, así que no se usan. En su lugar:
  1. **Canal de difusión de WhatsApp**, gratuito y al que la gente se une por decisión propia, como pide la SIC.
  2. **Envío uno a uno desde el teléfono del colaborador**, con la plantilla aprobada y un enlace `wa.me` o de SMS. Queda registrado y respeta las autorizaciones y el horario.
  3. **Correo** por el SMTP gratuito de Gmail, con límite diario.
- El envío masivo automático de SMS **no es posible a costo cero**.

### 3.12 Informes programados

- **pg_cron** dentro de la base, que hay que confirmar en el proyecto porque la página de precios no lo menciona, o GitHub Actions programado.
- Los PDF se generan en el teléfono o en el navegador.

---

## 4. Costos ocultos y límites a vigilar

| Riesgo | Qué puede pasar | Cómo se evita |
|---|---|---|
| Fotos por encima de 1 GB | Supabase deja de aceptar archivos | Fotos de unos 100 KB, cuota por tipo, alerta al 80 % y limpieza de las fachadas reemplazadas |
| Tráfico por encima de 5 GB al mes | Servicio limitado hasta el mes siguiente | Miniaturas, caché y descargas pesadas en GitHub Releases. El consumo se ve en P-43 |
| Proyecto pausado | La app deja de sincronizar | Tarea semanal que lo mantiene activo y aviso al Administrador |
| Cambio de condiciones del plan gratuito (Supabase, Expo, GitHub o Firebase) | Un servicio deja de ser gratis | Todo es portable: Supabase es código abierto y se puede alojar en un computador propio con Docker; el servidor de actualizaciones es propio; las push tienen plan B |
| Cómputo mínimo de Supabase | Lentitud con 300 usuarios o el día de elecciones | Prueba de carga N-14, índices y consultas paginadas |
| Minutos de GitHub Actions | Ilimitados solo mientras el repositorio sea **público** | Ver la decisión de la sección 5 |
| Licencias de los datos del mapa | Usar imágenes sin permiso | Solo OpenStreetMap, IGAC y edificaciones abiertas, citando la fuente |
| Actualizaciones de Expo y de Android | Trabajo, no dinero: hay que actualizar el SDK una vez al año | Se planea en las ventanas sin campaña intensa |
| Hardware | Un teléfono de 2 GB para pruebas y el computador del Administrador para los respaldos | Ya existen. No es un costo recurrente |

---

## 5. Decisión urgente: el repositorio es público

El repositorio `santiagonzaleznieto-pixel/Pijao-Nos-Une` es **público**: cualquiera puede leer el código, el documento maestro (con la estrategia de la campaña) y este plan.

- **Para la seguridad de los datos no es grave.** Las reglas por fila protegen la base, y en el repositorio no hay llaves maestras. La clave `anon` es pública por diseño.
- **Para la estrategia sí puede serlo:** el documento maestro describe cómo trabaja la campaña.
- **Ser público tiene ventajas gratuitas:** minutos ilimitados de GitHub Actions, GitHub Pages y descargas libres en Releases.

**Opción recomendada, de costo cero:** **dos repositorios.**
- Uno **privado** con el código y los documentos. Tiene 2.000 minutos gratis al mes, unas 80 construcciones de Android de unos 25 minutos cada una.
- Uno **público** solo con lo que debe descargarse: APK, mapa de Pijao, panel web y páginas públicas ya construidas.

---

## 6. Las 7 condiciones para mantener el costo en cero

1. **Solo Android.** Sin iOS ni Google Play.
2. **Fotos de unos 100 KB** y solo las necesarias en la nube.
3. **Respaldos propios** en el computador del Administrador, cifrados y copiados a una USB.
4. **Sin SMS para el inicio de sesión ni para envíos masivos.** Verificación con aplicación autenticadora y mensajes uno a uno o por canal de difusión.
5. **Construcción, distribución y actualizaciones** con GitHub Actions, GitHub Releases y un servidor de actualizaciones propio en Supabase.
6. **Mapas libres** (OpenStreetMap, IGAC y edificaciones abiertas), sin satélite comercial.
7. **Vigilancia mensual** del consumo en P-43, con alertas al 80 % de cada límite.

---

## 7. Cambios que esto produce en el documento maestro y en el plan

| Dónde | Antes | Ahora |
|---|---|---|
| 19.1 Tamaño de la foto | 1.280 px, unos 300 KB | 1.024 px, unos 100 KB, y miniatura de 20 KB |
| 8.10 Respaldos | Plan pago con respaldo diario | Respaldo propio, cifrado, en el computador del Administrador |
| 8.11 Costos | Plan de pago | **Plan gratuito** con vigilancia de límites |
| 4.10 Ingreso | Celular con código por mensaje | Correo y contraseña, con verificación en dos pasos por aplicación autenticadora |
| 17.5 Dispositivos | Android e iOS | **Solo Android 8 o superior** |
| 13.4 Mensajes | SMS, WhatsApp y correo con proveedor | Canal de difusión, envío uno a uno desde el teléfono y correo por Gmail |
| 5.1 y 5.14 Mapas | Calles, satélite y relieve | Calles, relieve y edificaciones. Satélite solo si el IGAC lo ofrece |
| 23.1-11 Dominio | Dominio propio | Subdominio gratuito |
| 23.1-12 Presupuesto | Plan de Supabase, mensajería y mapas | **US$ 0 recurrentes** |
| Plan, 1.2 | Reporte de errores con un servicio externo, EAS y respaldo del plan pago | Tabla propia, GitHub Actions y respaldo local |

---

## Fuentes

- [Precios de Supabase (página oficial)](https://supabase.com/pricing)
- [Análisis de los límites gratuitos de Supabase en 2026 (DEV Community)](https://dev.to/nayankyada/supabase-pricing-2026-free-tier-limits-compute-costs-when-to-upgrade-52af)
- [Límites del plan gratuito de Supabase (MyKavo)](https://mykavo.app/blog/supabase-free-tier-limits)
- [Costos de EAS Build y EAS Update (Cadrant)](https://cadrant.ai/blog/eas-build)
- [Precios de EAS Update (Stallion)](https://stalliontech.io/expo-eas-update-pricing)
- [Preguntas frecuentes de notificaciones de Expo (oficial)](https://docs.expo.dev/push-notifications/faq/)
- [Servidores de actualizaciones de código abierto compatibles con expo-updates](https://github.com/topics/eas-cli)
- [Datos abiertos geoespaciales del IGAC](https://www.igac.gov.co/datos-abiertos/datos-abiertos-geoespaciales)
- Licencias verificadas con `npm view <paquete> license` el 4 de noviembre de 2026.
