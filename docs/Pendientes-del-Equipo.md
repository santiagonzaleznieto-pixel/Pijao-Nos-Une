# PIJAO NOS UNE
## Lo que solo puede hacer el equipo de la campaña

Esta es la lista de tareas que **no puede hacer Claude**: necesitan una contraseña o una credencial, una firma, un abogado, una decisión de la campaña o un teléfono en la mano. Todo lo demás de la Fase 1 ya está construido y probado.

Se hacen a su ritmo, pero las marcadas con ⏰ tienen fecha. Cuando termine una, márquela con `[x]` o avísele a Claude para que la marque y siga con lo que dependa de ella.

*Actualizada el 7 de noviembre de 2026.*

---

### 1. Credenciales y cuentas (solo usted puede escribir contraseñas)

- [ ] **Correo para recuperar contraseñas (P-07).** Sin esto, el código de «Olvidé mi contraseña» no le llega a los colaboradores.
  1. En el Gmail de la campaña, active la verificación en dos pasos.
  2. Cree una **contraseña de aplicación** en Cuenta de Google → Seguridad → Contraseñas de aplicaciones.
  3. En Supabase, vaya a **Authentication → Emails → SMTP Settings** y active *Custom SMTP* con estos datos:
     - host `smtp.gmail.com`, puerto `465`;
     - usuario: el correo de la campaña;
     - contraseña: la contraseña de aplicación;
     - remitente: «Pijao Nos Une».
  4. Avísele a Claude: él ajusta la plantilla del correo para que muestre el código.
- [ ] **Verificación en dos pasos del Administrador y del Director.** La primera vez que entren al panel web, escaneen el código QR con una aplicación autenticadora gratuita, como Google Authenticator o Aegis. Sin esto no ven datos completos ni pueden hacer acciones delicadas.
- [ ] **Llaves de firma del APK** (`docs/Entrega-y-Firma.md` §1). Hay que crear las dos llaves en el computador del Administrador y cargarlas como secretos en GitHub (Settings → Secrets → Actions). Sin ellas, cada versión de la app sale firmada con una llave de prueba, y cambiar de llave después obliga a desinstalar la app. Desinstalar borra las visitas que no se han enviado.
- [ ] **Segundo custodio de las llaves.** Una persona de confianza guarda una copia fuera de línea de las llaves y sus contraseñas: una USB cifrada y las contraseñas en papel.
- [ ] **Respaldos nocturnos** (`docs/Entrega-y-Firma.md` §4). El plan gratuito de Supabase no los incluye.
  1. Una vez, en el computador del Administrador: `powershell -ExecutionPolicy Bypass -File tools/respaldo.ps1 -Configurar`. Pide la cadena de conexión y la clave `service_role`, que nunca se suben a GitHub.
  2. Programe la tarea nocturna en el Programador de tareas de Windows.
  3. Cada semana, copie la carpeta a una USB guardada aparte.

### 2. Abogado (antes del piloto del 1 de febrero de 2027)

- [ ] ⏰ **Contratar al abogado** electoral y de protección de datos.
- [ ] **Textos legales definitivos:**
  - política de tratamiento y aviso de privacidad (P-53);
  - texto de autorización (16.4);
  - acuerdo de confidencialidad;
  - código de conducta.

  Hoy hay borradores. Cuando estén aprobados, el Administrador los publica en el panel web (Configuración → Textos legales) con la casilla «aprobado por el abogado». La app los toma sola.
- [ ] **Revisar el guion de visita y las preguntas frecuentes.** Los borradores ya están en el panel y en la app, con el aviso «Borrador: el abogado todavía no lo ha revisado». La revisión importa sobre todo por el periodo antes de la campaña oficial: no pedir el voto ni prometer nada.
- [ ] **Revisar el curso de ingreso:** las 7 lecciones y las 15 preguntas que ya trae la app.
- [ ] **Puntos legales de la sección 23.2** que se resuelven en esta fase. Abrir los puntos 23.2-9 (financiación) y 23.2-11 (inhabilidades).
- [ ] **Designar al oficial de protección de datos** (16.2) y escribir el **manual interno** con el abogado.
- [ ] **Plan de incidentes de seguridad** (16.7) y **plan de cierre** (16.9). El plan de cierre se firma.
- [ ] **Calendario legal:** el abogado confirma las fechas y el Administrador las marca como «confirmadas» en Configuración → Calendario legal.
- [ ] **Revisión trimestral con el abogado** de los cambios en la ley. Se repite en todas las fases.

### 3. Decisiones de la campaña

- [ ] ⏰ **Decisiones de la sección 23.1**, con fecha límite del 30 de noviembre de 2026. La 23.1-1 ya está tomada: partido o coalición.
- [ ] ⏰ **Decisión 23.1-2, gerente de campaña:** a más tardar el 31 de enero de 2027.
- [ ] **Con el Director:**
  - revisar los catálogos C-01 a C-20 y la lista de ejes del programa (11.3);
  - validar el modelo de datos (sección 8) y la tabla de protección (7.4).

  Los cambios de catálogos se hacen en el panel, sin programar.

### 4. Insumos que hay que conseguir

- [ ] **Logos en vector y guía de marca.** Son la base de la Fase 2 de diseño.
- [ ] **Lista oficial de barrios y veredas** con sus límites (IGAC, DANE u OpenStreetMap), validada por el Director. Con esa lista, Claude carga los polígonos de las zonas.

### 5. Pruebas con un teléfono real (antes del piloto)

- [ ] **Instalar la app en un Android de 2 GB** y hacer la prueba técnica de `docs/Prueba-Tecnica.md`. El enlace de la última versión está en GitHub → Releases.
- [ ] **Tres días sin señal en una vereda real** y sincronización completa al volver.
- [ ] **Teléfono perdido:** reportarlo desde el panel y comprobar que se borra.
- [ ] **Restaurar un respaldo** en el Supabase local, para probar que el respaldo sirve.

### 6. Piloto (1 al 28 de febrero de 2027)

- [ ] Elegir de 5 a 10 colaboradores, en el casco urbano y en una vereda.
- [ ] Invitarlos desde el panel y que hagan el curso y el modo práctica.
- [ ] Seguridad: en las veredas siempre en parejas y con hora de regreso. La jornada y el SOS llegan en la Fase 3.
- [ ] Revisar cada semana el tablero **Métricas del piloto** del panel web.

### 7. Para cerrar la Fase 2 (diseño) y empezar la Fase 3

Claude dejó hecho todo lo que podía hacer sin usted (lista al final). Esto es lo que solo usted o el equipo pueden hacer:

- [ ] **Probar la app 0.17.0 en un teléfono real** (el enlace está en GitHub → Releases, la más reciente). Revisar en especial:
  - el **mapa**: que cargue Pijao, que se vean los marcadores con su forma y que «Ir a mi ubicación» funcione;
  - el **modo oscuro**, el **modo sol** y la **letra grande** (Más → Perfil y ajustes): la app se recarga sola al cambiarlos;
  - el **ícono nuevo** (grano de café) en la pantalla del teléfono y la **entrada** con el logo.
- [ ] **Logos en vector** (el mismo punto 4): con ellos Claude saca los colores exactos con cuentagotas, hace la versión horizontal, la de un solo color y la marca de agua, y reemplaza el logo de los materiales.
- [ ] **Aprobar o cambiar el mensaje de entrada.** Hoy dice «Juntos, casa por casa.». Si quiere otro, escríbalo y Claude lo cambia.
- [ ] **Aprobar el ícono de la app** (grano de café con el degradado de la marca sobre azul marino) con el Director y el candidato.
- [ ] **Fotografías reales de Pijao** tomadas por el equipo (café, montaña, río, pueblo y veredas), con permiso escrito de quien aparezca. Con ellas se arma el tablero de inspiración y las ilustraciones.
- [ ] **Abogado:** revisar el texto del **volante de privacidad** (`diseno/materiales/volante-privacidad.html`) y el uso de la marca, el logo y el nombre del candidato en el carnet y los materiales (23.2-18).
- [ ] **Piloto (febrero de 2027):** la prueba de uso con 5 colaboradores, incluidos adultos mayores, y la **prueba bajo el sol real** en una vereda. Anotar dónde se confunden, qué tarda y qué no se lee bien; Claude ajusta el diseño con eso.
- [ ] **Aprobación final del diseño** por el Director y el candidato (criterio de salida de la Fase 2).
- [ ] **Decidir si se publica la versión a main.** Todo el diseño está en la rama `fase-2/diseno`; pasar a `main` necesita su aprobación.
- [ ] **Más adelante:** la página de la campaña y el kit para redes y piezas públicas (13.2), cuando haya mensaje definitivo. Las páginas públicas actuales (verificar carnet, Mis datos, política) siguen funcionando como están.

### 8. Fase 3 (solo para el equipo)

- [ ] ⏰ **Autorizar que Claude aplique en el servidor las migraciones 0018 y 0019.** El sistema de permisos le pide a Claude la autorización expresa de usted para cambiar la base de datos de producción. Basta con escribirle «sí, aplica las migraciones». Sin ellas: el servidor no guarda el cumpleaños ni los canales extra, «Seguridad en terreno» no carga en el panel y los eventos no existen (la app sigue funcionando y guardando visitas).
- [ ] **Instalar la app 0.18.0 encima de la anterior** (nunca desinstalar) y probar: una visita completa con persona, el SOS (manteniendo 3 segundos, en modo práctica para no alarmar a nadie), iniciar y terminar una jornada.
- [ ] **Mapa de Pijao por zonas:** cuando lo consiga, enviárselo a Claude. Por ahora el mapa queda sin zonas, como usted pidió.
- [ ] **Definir quién atiende los SOS** y a qué teléfono llamar primero (Director, Administrador, contacto de emergencia).
- [ ] **Abogado:** revisar el uso de las ubicaciones durante la jornada (se borran a los 7 días) y el saludo de cumpleaños (solo a quien autorizó el contacto).
- [ ] **Pasar a `main`** cuando apruebe el diseño y la Fase 3: así el panel publicado muestra las secciones nuevas.

---

### Lo que Claude ya dejó hecho o hace sin usted

- Toda la construcción de la Fase 1: app, servidor, panel web y páginas públicas, con pruebas automáticas en cada cambio.
- Aplicar las migraciones en producción (la 0016 y la 0017 quedaron aplicadas el 7 de noviembre de 2026) y publicar cada versión de la app en GitHub Releases.
- Mantener al día `docs/Plan-de-Construccion.md`, `docs/Entrega-y-Firma.md` y la bitácora `docs/Bitacora-del-Proyecto.md`.
- **Fase 2 (9 de noviembre de 2026, app 0.17.0):** mapa con marcadores de color y forma, grupos, «por enviar» punteado y ficha rápida; ícono de la app, ícono adaptable, notificaciones y arranque; modos claro, oscuro, sol y letra grande; todas las pantallas de la app con el diseño del lienzo y sus estados (cargando, vacío, sin señal, error, sin permiso); íconos de los 14 ejes; formatos de fecha, hora y pesos; auditoría de accesibilidad (`docs/Accesibilidad-Fase2.md`); panel web interno con el diseño; volante, certificado y carnet para imprimir (`diseno/materiales/`).
- **Fase 3 (10 de noviembre de 2026, app 0.18.0):** arreglos del registro de visitas pedidos por el dueño, retomar la visita sin terminar, cumpleañeros de hoy, jornada y SOS, incidentes, ayuda y eventos en la app; en el panel, seguridad en terreno, tareas, eventos, informe imprimible, necesidades, calidad, incidentes y cumpleañeros. Migraciones 0018 y 0019 listas y probadas, esperando su autorización.

