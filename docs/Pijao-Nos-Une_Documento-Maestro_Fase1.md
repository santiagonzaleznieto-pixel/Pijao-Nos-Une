# PIJAO NOS UNE
## Documento maestro de la aplicación de campaña
### Fase 1 · Descripción funcional completa, de la cabeza a los pies

| Dato | Detalle |
|---|---|
| Campaña | Jaime González · Alcaldía de Pijao (Quindío) · periodo 2028–2031 |
| Lema | "Pijao nos une" |
| Preparado para | El Administrador del sistema y el Director de Campaña |
| Versión | 1.1 · revisada contra el código y el calendario oficial |
| Fecha | 4 de noviembre de 2026 (versión 1.0: 13 de octubre de 2026) |
| Naturaleza del documento | Descripción en lenguaje natural de todo lo que la app hace, cómo lo hace y con qué reglas. Desde la versión 1.1 incluye también el estado real de construcción (sección 24), las funciones nuevas propuestas (sección 25) y el registro de cambios (sección 26). |
| Estado del software | App v0.10.1 · Fase 2, parte 1 · repositorio `Pijao-Nos-Une` en GitHub (rama `main`) |

> **Aviso importante.** Este documento incluye orientación sobre normas colombianas (protección de datos personales, campañas y delitos electorales). Es una guía de diseño, no asesoría jurídica. Los puntos que debe revisar un abogado electoral y de protección de datos están reunidos en la sección 23.

---

## Cómo leer este documento

Está escrito en lenguaje natural para que lo entienda cualquier persona del equipo y, a la vez, para que quien construya la app no tenga que adivinar nada. Va de lo general a lo particular:

- **Secciones 1 a 3:** qué es la app, para qué sirve, con qué principios se diseña y cómo se ve.
- **Sección 4:** quién puede hacer qué (roles y permisos).
- **Secciones 5 a 8:** el corazón de la app: el mapa, el registro de viviendas y visitas, el registro de personas y la base de datos.
- **Secciones 9 a 15:** estadísticas y módulos de campaña (equipo, escucha ciudadana, voluntariado, comunicaciones, finanzas, día de elecciones).
- **Secciones 16 y 17:** protección de datos, seguridad, funcionamiento sin internet y rendimiento.
- **Sección 18:** cada pantalla de la app, una por una.
- **Secciones 19 a 23:** reglas de negocio y catálogos, historias de uso, riesgos, fases de construcción y decisiones pendientes.
- **Secciones 24 a 26 (nuevas en 1.1):** estado real del software frente a este documento, hallazgos de seguridad, funciones nuevas propuestas y registro de cambios.

**Marcas que verá en el texto**

- **[BASE]**: función que todo colaborador tiene siempre.
- **[OPCIONAL O-xx]**: función que el Director puede habilitar a cada colaborador (lista en la sección 4.5).
- **[DIRECTOR]** y **[ADMIN]**: funciones exclusivas de ese rol.
- **[SENSIBLE]**: dato que la ley colombiana trata como sensible; exige autorización expresa y es siempre opcional para la persona.
- **R-xx**: regla de negocio (sección 19). **C-xx**: catálogo de opciones (sección 19). **P-xx**: pantalla (sección 18).
- **[FASE n]**: en qué fase de construcción se recomienda hacerlo (sección 22).

**Vocabulario básico**

- **Vivienda**: el lugar físico (casa, apartamento, finca, local con vivienda). Tiene un punto en el mapa.
- **Hogar**: grupo de personas que vive y se sostiene junto en una vivienda. Una vivienda puede tener más de un hogar.
- **Persona**: individuo mayor de edad registrado con su autorización.
- **Visita**: cada vez que un colaborador va a una vivienda.
- **Colaborador**: miembro del equipo con cuenta en la app (voluntario o contratado).
- **Zona**: barrio, vereda o sector dibujado sobre el mapa.

---

## Índice

1. Resumen ejecutivo
2. Contexto, propósito y principios
3. Identidad visual y experiencia de marca
4. Usuarios, roles y permisos
5. El mapa de Pijao
6. Registro de viviendas y visitas
7. Registro de personas
8. La base de datos en Supabase, explicada en lenguaje natural
9. Estadísticas y paneles
10. Gestión del equipo de colaboradores
11. Escucha ciudadana, necesidades y programa de gobierno
12. Voluntariado, líderes y organizaciones
13. Comunicaciones y propaganda
14. Finanzas y cumplimiento electoral
15. Día de elecciones y escrutinios
16. Protección de datos, seguridad y ética
17. Sin internet, rendimiento y dispositivos
18. Las pantallas, una por una
19. Reglas de negocio y catálogos
20. Historias de uso
21. Riesgos y cómo se cubren
22. Fases de construcción y lista de verificación antes de lanzar
23. Decisiones pendientes y puntos para validar con un abogado
24. Estado real de construcción (auditoría del 4 de noviembre de 2026) — *nuevo en 1.1*
25. Funciones nuevas propuestas — *nuevo en 1.1*
26. Registro de cambios del documento — *nuevo en 1.1*
- Apéndice A. Glosario
- Apéndice B. Notas para quien construya

---

# 1. Resumen ejecutivo

## 1.1 La app en una frase

La app es la central de operaciones de la campaña "Pijao nos une": un mapa vivo de todo Pijao, compartido en tiempo real por el equipo, donde cada visita a una casa queda registrada con su ubicación exacta, fotos, datos del hogar y de las personas (siempre con su autorización), y desde el cual se organiza al equipo, se mide el avance, se escucha a la comunidad, se construye el programa de gobierno, se cumple la ley y se prepara el día de elecciones.

## 1.2 Quiénes la usan

- **Administrador (una sola persona, el creador del sistema).** Es el único con poder técnico total: crea y suspende cuentas, configura el sistema, ve la auditoría y la seguridad, atiende las solicitudes de eliminación de datos y custodia los respaldos. Nadie más puede ser Administrador.
- **Director de Campaña (Jaime González).** Es el jefe operativo: ve todo el trabajo de campo, aprueba colaboradores, decide qué funciones opcionales tiene cada uno, asigna zonas y tareas, convoca eventos y lee los informes.
- **Colaboradores (muchas personas).** Es el único rol de trabajo. Todos tienen las mismas funciones base (mapa, registro de visitas, estadísticas básicas, tareas, información). El Director puede encenderle o apagarle funciones opcionales a cada uno.

## 1.3 El flujo central, en seis pasos

1. El colaborador llega a una vivienda y toca **"Registrar aquí"**. La app toma las coordenadas reales del lugar donde está parado.
2. Se toma una **foto de la fachada** y se confirma si ya existía esa casa en el mapa (para no duplicarla).
3. Se registran los **datos del hogar**: cuántas personas viven, por rangos de edad, principal sostén del hogar, servicios, necesidades y temas que le importan.
4. Con **autorización** de cada persona adulta, se guardan sus datos (nombre completo, fecha de nacimiento, cédula, contacto, dirección escrita y en coordenadas).
5. Se anota el **resultado de la visita** y si hace falta un seguimiento.
6. Todo se guarda aunque no haya internet; cuando hay señal se **sincroniza** y el punto aparece en el mapa de todos, casi al instante.

## 1.4 Los módulos de la app

| Módulo | Para qué sirve | Sección |
|---|---|---|
| Mapa de Pijao | Ver y registrar todo sobre un mapa real compartido en tiempo real | 5 |
| Viviendas y visitas | Registrar cada casa visitada con ubicación, fotos y datos del hogar | 6 |
| Personas | Base de datos de personas con autorización, direcciones y consentimientos | 7 |
| Base de datos | Cómo se guarda, protege y respalda todo en Supabase | 8 |
| Estadísticas | Tableros por tipo de usuario, metas y semáforos | 9 |
| Equipo | Tareas, zonas, turnos, capacitación, conducta, anuncios y eventos | 10 |
| Escucha y programa | Necesidades ciudadanas convertidas en propuestas de gobierno | 11 |
| Voluntariado y líderes | Voluntarios, organizaciones, líderes y mapa social | 12 |
| Comunicaciones | Mensajes con consentimiento, kit de marca y control de propaganda | 13 |
| Finanzas y cumplimiento | Aportes, gastos, topes, alertas y reportes | 14 |
| Día de elecciones | Testigos electorales, actas, conteo paralelo y reclamaciones | 15 |
| Protección de datos | Habeas data, seguridad, auditoría y cierre de campaña | 16 |

## 1.5 Decisiones de fondo

Ya definidas por el Administrador:

- Un solo Administrador; Jaime González como Director de Campaña.
- Un único rol de trabajo llamado "colaboradores", con las mismas funciones base y funciones opcionales que habilita el Director.
- Un mapa real de todo Pijao como pantalla principal, en tiempo real.
- Supabase como base de datos, con nombre completo, fecha de nacimiento, cédula y dirección escrita y en coordenadas.
- Registro fotográfico de cada casa visitada.

Añadidas en este documento (se explican una por una al entregarlo):

- Lo sensible (cédula completa, fecha exacta de nacimiento, teléfono, simpatía individual) se muestra **enmascarado por defecto** a los colaboradores; el Director puede habilitarlo.
- **Autorización de datos obligatoria** en cada registro, con evidencia y posibilidad de revocarla.
- **Funcionamiento sin internet**, pensado para las veredas.
- **Ninguna función que facilite comprar votos o presionar a nadie.**
- **Plan de cierre**: al terminar la campaña, los datos personales se eliminan o anonimizan.

## 1.6 Lo que hace distinta a esta app

Muchas aplicaciones de campaña solo cuentan votos. Esta está pensada para **escuchar y devolver**: cada necesidad que una familia expresa queda registrada, se agrupa por tema y zona, se convierte en propuesta del programa de gobierno y se le comunica de vuelta a la comunidad. Es la forma práctica de que "Pijao nos une" sea algo que se vea en la app y no solo en el lema.

---

# 2. Contexto, propósito y principios

## 2.1 Para qué existe la app

Objetivos, en orden de importancia:

1. **Conocer Pijao casa por casa:** dónde viven las personas, cómo viven y qué necesitan.
2. **Escuchar y convertir lo escuchado en programa de gobierno:** cada necesidad registrada alimenta el programa.
3. **Organizar y medir el trabajo del equipo:** quién recorre qué, cuánto se ha avanzado, dónde falta llegar.
4. **Cumplir la ley:** protección de datos, finanzas de campaña, propaganda y normas electorales.
5. **Llegar al día de elecciones preparados:** testigos, información y control de resultados.
6. **Cuidar a las personas:** a las visitadas (su privacidad) y a las que visitan (su seguridad).

Indicadores de éxito sugeridos:

- Porcentaje de viviendas de Pijao registradas y visitadas.
- Porcentaje de hogares con al menos una persona de contacto autorizada.
- Número de voluntarios activos.
- Número de necesidades ciudadanas incorporadas al programa de gobierno.
- Registros con autorización de datos: meta del 100 %.
- Incidentes de seguridad de datos: meta de cero.

## 2.2 Contexto: Pijao y el calendario electoral

**El municipio.** Pijao es un municipio pequeño del Quindío, de vocación cafetera y turística, con un casco urbano y numerosas veredas. En un municipio así todo el mundo se conoce: lo que se haga con los datos de las personas tiene un costo reputacional muy alto si sale mal. Por eso la app se diseña con prudencia en privacidad y con trato respetuoso.

**Se asume (a confirmar con el equipo):** conectividad irregular en zonas rurales, muchos adultos mayores, colaboradores con teléfonos Android de gama media o baja y poca experiencia con aplicaciones complejas.

**El calendario.** Las elecciones de alcaldes, gobernadores, concejos, asambleas y juntas administradoras locales se realizan el último domingo de octubre, que en 2027 es el **31 de octubre**. El periodo 2028–2031 empieza el 1 de enero de 2028. A hoy (4 de noviembre de 2026) faltan **361 días**.

**Calendario oficial.** La Registraduría fijó el calendario el 28 de octubre de 2026 (la prensa cita la **Resolución 12338 de 2026**; una fuente cita la 12342, así que el número debe confirmarse en registraduria.gov.co). Fechas publicadas hasta ahora:

| Hito | Fecha oficial 2027 | Estado |
|---|---|---|
| Apertura de la inscripción de cédulas y del registro de grupos significativos de ciudadanos (recolección de apoyos) | 31 de octubre de 2026 | **Ya abierta** |
| Cierre de inscripción de grupos significativos, movimientos sociales y promotores del voto en blanco; apertura de la inscripción de candidaturas; se suspende la incorporación de cédulas nuevas al censo | 30 de junio de 2027 | Confirmada en prensa |
| Cierre de la inscripción de candidaturas y entrega de firmas; publicación del censo electoral | 31 de julio de 2027 | Confirmada en prensa |
| Inicio del periodo de modificación de candidaturas | 2 de agosto de 2027 | Confirmada en prensa |
| Inicio de la propaganda electoral en medios de comunicación | 5 de agosto de 2027 | Confirmada en prensa |
| Cierre de la inscripción de cédulas | 31 de agosto de 2027 | Confirmada en prensa |
| Sorteo y publicación de jurados de votación | A más tardar el 16 de octubre de 2027 | Confirmada en prensa |
| Inicio de la propaganda en espacio público | Por confirmar (en 2023 fue tres meses antes de la elección) | **Pendiente: abogado** |
| Último día para inscribir testigos electorales | Por confirmar (en 2023, dos días antes de la elección) | **Pendiente: abogado** |
| **Elecciones** (8:00 a. m. a 4:00 p. m.) | **Domingo 31 de octubre de 2027** | Confirmada |
| Inicio de los escrutinios generales | Martes 2 de noviembre de 2027 | Confirmada en prensa |
| Posesión de las nuevas autoridades | 1 de enero de 2028 | Confirmada |

Las fechas se cargan en el calendario legal de la app (sección 14.7) y el Administrador las corrige cuando el abogado confirme el texto de la resolución.

Tres consecuencias prácticas:

- **Si la candidatura va por firmas, el reloj ya corre.** La recolección de apoyos de los grupos significativos de ciudadanos abrió el 31 de octubre de 2026 y cierra el 30 de junio de 2027. La decisión 23.1-1 (forma de inscripción) pasa a ser **urgente**: si es por firmas, el módulo de apoyos (14.10) sube a la Fase 2.
- **La inscripción de cédulas ya está abierta** (hasta el 31 de agosto de 2027). Ese proceso sirve para quienes cambiaron de domicilio y quieren votar donde viven. La app nunca debe usarse para promover inscripciones de personas que no viven en Pijao: eso es un delito (fraude en inscripción de cédulas, conocido como "trashumancia electoral"). Ver secciones 14 y 16.
- **La propaganda tiene ventanas legales.** Antes de que abra el periodo legal de propaganda, el trabajo de la app debe centrarse en conocer el territorio, escuchar a las familias y organizar al equipo. Cada guion de visita y cada mensaje debe revisarse con el abogado para no incurrir en propaganda fuera de tiempo.

## 2.3 Principios de diseño

1. **Escuchar primero.** Se registra lo que la gente necesita, no solo lo que piensa del candidato.
2. **Consentimiento y respeto.** Ningún dato personal se guarda sin autorización clara. La persona puede negarse, corregir o pedir que se borre todo, sin consecuencias.
3. **Cero compra de votos y cero presión.** La app no tiene campos, botones ni reportes que sirvan para ofrecer o controlar favores a cambio de votos.
4. **Rápido en terreno.** Un registro básico de una casa debe tomar menos de 90 segundos. Lo demás se completa después.
5. **Funciona sin señal.** En las veredas la señal falla; la app guarda todo en el teléfono y sincroniza después.
6. **Un solo mapa para todos.** Lo que un colaborador registra lo ve el resto del equipo, según sus permisos.
7. **Cada dato tiene dueño y huella.** Se sabe quién lo registró, cuándo, desde dónde y qué cambió después.
8. **Lo sensible se muestra solo a quien lo necesita.** Menos datos visibles significa menos riesgo.
9. **Fácil para todos.** Letra grande, pocos toques, lenguaje sencillo, voz para dictar notas.
10. **Marca coherente.** Todo se ve y se siente como "Pijao nos une".
11. **Se puede cerrar y borrar.** Termina la campaña y los datos personales se eliminan o anonimizan según un plan escrito.

## 2.4 Líneas rojas: lo que la app nunca hará

La app **nunca**:

- Registra por quién votó una persona ni intenta averiguarlo. El voto es secreto.
- Registra, permite ofrecer ni da seguimiento a dinero, regalos, empleo, subsidios, contratos o favores a cambio de votos. No existe un campo de "promesas personales" ni de "favores".
- Guarda datos individuales de menores de 18 años: solo conteos por rango de edad.
- Pregunta por Sisbén, subsidios o programas sociales del hogar, para que esa información no se use para presionar o prometer beneficios.
- Recoge afiliación a partidos, religión, salud, origen étnico, orientación sexual ni pertenencia individual a sindicatos u organizaciones sociales. La única información sensible que podrá guardarse, y solo con autorización específica y opcional, es la simpatía política declarada por la persona.
- Importa bases de datos compradas, de otras entidades o de origen dudoso.
- Envía mensajes a quien no haya autorizado ese canal.
- Permite sacar listas de personas sin que quede registro de quién, cuándo y por qué.
- Usa los datos de la campaña para fines de gobierno, comerciales o ajenos a la campaña.
- Sirve para difundir rumores, desinformación o ataques a la vida privada de otras personas.

## 2.5 Alcance de la Fase 1 y supuestos

**Alcance.** Este documento es el entregable de la Fase 1: la descripción completa. No contiene código ni diseño final de pantallas. Con él se podrán construir las siguientes fases.

**Supuestos hechos (corregir si alguno no es correcto):**

1. "Principal cabeza de alimentos" significa **principal sostén del hogar**: la persona que aporta el sustento principal.
2. El Administrador es quien encarga este documento. Jaime González será el Director de Campaña.
3. La app será móvil para el trabajo de campo, con un **panel web** para tareas pesadas del Director y del Administrador (informes, importaciones, permisos). **Actualización 1.1:** hoy solo existe para Android, sin panel web. iOS queda fuera por costo (la cuenta de Apple cuesta US$ 99 al año). La tecnología se decide en 23.1-17 (ver 24.5).
4. La base de datos y los archivos viven en Supabase.
5. La app está en español de Colombia.
6. La forma en que se inscribirá la candidatura (por partido, coalición o firmas) todavía no está definida (ver sección 23).
7. El equipo podría llegar a unas 200–300 personas con cuenta; el municipio, a unos miles de viviendas.
8. Todos los colaboradores de campo son mayores de 18 años y usan su propio teléfono.

---

# 3. Identidad visual y experiencia de marca

## 3.1 Los dos logos y cuándo usar cada uno

Se recibieron dos versiones de la identidad de la campaña.

**Logo emblema (circular).** Un círculo con escenas de Pijao: un sol naciendo, una casa de teja con sembrados de café y un perro y un gato, un campesino con sombrero, una canasta de verduras, un deportista con medalla, un libro con alas, un pintor con paleta, un río que serpentea, una carretera que sube, palmas y plantas de páramo, una cabaña de ecoturismo, binoculares, cámara y brújula, una flecha naranja que asciende y, abajo, un apretón de manos. El texto dice "PIJAO NOS UNE" con un grano de café en lugar de la "O" de PIJAO.

- **Dónde usarlo:** pantalla de bienvenida, pantalla de inicio de sesión, "Acerca de", encabezados de informes, material impreso, la portada de documentos.
- **Dónde no usarlo:** tamaños pequeños (íconos, notificaciones, avatares), porque pierde legibilidad.

**Logo tipográfico (palabras).** "PIJAO / NOS / UNE" en tres líneas, con degradado de azul a verde y naranja en PIJAO y UNE, y "NOS" en azul marino.

- **Dónde usarlo:** encabezado de la app, notificaciones, pie de los reportes, avatar de la campaña, certificados de capacitación, mensajes.
- **Pendiente para el diseñador:** crear una versión horizontal de una sola línea (PIJAO NOS UNE) y una versión de un solo color (para fondos oscuros y para sellos de marca de agua).

## 3.2 Paleta de colores

Tomada de los logos. Los códigos son **aproximados** y deben sacarse con cuentagotas del archivo original del logo:

| Color | Uso en la app | Código aproximado |
|---|---|---|
| Azul marino | Textos principales, encabezados, barra superior | #1C3D72 |
| Azul océano | Enlaces, botones secundarios, selección | #2A6FB5 |
| Turquesa | Detalles, gráficas, estados "en curso" | #25A9B5 |
| Verde hoja | Éxito, "visitada", metas cumplidas | #7DB93F |
| Naranja ámbar | Botón principal ("Registrar aquí"), llamados a la acción | #F7931E |
| Blanco y gris cálido | Fondos y tarjetas | #FFFFFF / #F5F3EF |
| Rojo | Errores y alertas críticas | #D64545 |
| Amarillo | Advertencias | #F2C230 |

El degradado azul → turquesa → verde → naranja del logo tipográfico se usa solo en la pantalla de bienvenida y en las portadas de los informes, no dentro de las pantallas de trabajo.

## 3.3 Tipografía y tono de voz

- **Tipografía sugerida:** una letra geométrica y limpia como la del logo (por ejemplo Montserrat) para títulos y una muy legible (por ejemplo Inter) para el texto.
- **Tamaño mínimo de texto:** 16 puntos en pantalla. Todo se agranda si la persona usa letra grande en su teléfono.
- **Tono:** cercano, claro y respetuoso. En el eje cafetero se habla de "usted"; la app y los guiones usan "usted" y evitan el "vos" y el "tú". Los botones usan verbos en infinitivo o imperativo neutro ("Registrar aquí", "Guardar").
- **Ejemplos de textos de la app:**
  - Bienvenida: "Bienvenido/a. Hoy Pijao nos une."
  - Guardado: "Todo guardado. Gracias por recorrer Pijao."
  - Sin señal: "Sin señal. Siga trabajando: guardamos todo en su teléfono y lo enviamos cuando vuelva la conexión."
  - Sincronización pendiente: "Tiene 7 registros por enviar. Se enviarán solos cuando haya señal."
  - Error de ubicación: "La señal del GPS está débil. Muévase a un lugar abierto o ajuste el punto a mano."

## 3.4 Íconos y lenguaje visual

Los símbolos del logo se convierten en **íconos de los ejes del programa** (la interpretación hay que confirmarla con el equipo de diseño y con el candidato):

| Símbolo del logo | Eje o tema | Uso en la app |
|---|---|---|
| Libro con alas | Educación y conocimiento | Categoría de necesidades, capacitación |
| Deportista con medalla | Deporte y juventud | Categoría de necesidades, eventos deportivos |
| Casa con cultivos y grano de café | Campo, café y vivienda | Categoría de necesidades, tipo de vivienda |
| Perro y gato | Bienestar animal | Mascotas del hogar, categoría de necesidades |
| Campesino y canasta de verduras | Producción campesina y seguridad alimentaria | Actividad del hogar, categoría |
| Carretera y flecha ascendente | Vías, movilidad y progreso | Categoría "Vías", indicador de avance |
| Río, palmas y plantas de páramo | Agua y medio ambiente | Categoría "Agua y ambiente" |
| Cabaña, binoculares, cámara y brújula | Turismo de naturaleza | Categoría "Turismo", sitios de interés |
| Pintor con paleta | Cultura y arte | Categoría "Cultura", eventos |
| Apretón de manos | Unión y participación | Voluntariado, alianzas, escucha |
| Sol | Nuevo amanecer | Pantalla de bienvenida, informes |

**Estilo:** ilustración plana y cálida; fotografías reales de Pijao tomadas por el equipo (con permiso de las personas que aparezcan). Evitar imágenes de archivo genéricas.

## 3.5 Pantalla de bienvenida, ícono y notificaciones

- **Ícono de la app:** el grano de café del logo sobre fondo azul marino (versión simplificada, a diseñar).
- **Nombre en el teléfono:** "Pijao Nos Une".
- **Pantalla de bienvenida (P-01):** fondo blanco, logo emblema en el centro, degradado del logo tipográfico como línea inferior, mensaje "Hoy Pijao nos une" y la versión de la app en letra pequeña. Dura menos de dos segundos si la app ya está abierta.
- **Notificaciones:** ícono del grano de café, título corto, texto de una línea, sin datos personales en el texto (por ejemplo "Tiene 3 tareas nuevas", nunca "Visitar a María Pérez").
- **Distribución:** la app **no se publica abierta al público**. Se distribuye por invitación (instalación privada) para que solo la instale el equipo autorizado.

## 3.6 Accesibilidad y uso al aire libre

- **Botones grandes:** zona táctil de al menos 48 por 48 puntos; el botón "Registrar aquí" es el más grande de la pantalla.
- **Contraste alto** en los textos (mínimo 4,5 a 1) y **modo sol**: una variante de alto contraste para usar bajo luz fuerte.
- **Modo oscuro** para uso nocturno y para ahorrar batería.
- **Letra grande** y soporte para lectores de pantalla (todos los botones con nombre claro).
- **No depender solo del color:** los puntos del mapa cambian de forma e ícono además de color, para personas con daltonismo.
- **Dictado por voz:** en los campos de notas y comentarios hay un botón de micrófono que convierte la voz en texto. No se guarda el audio, solo el texto.
- **Idioma, fechas y moneda:** español de Colombia; fechas día/mes/año; hora en formato de 12 horas con "a. m." y "p. m."; zona horaria de Bogotá; dinero en pesos con puntos de mil (por ejemplo $1.250.000).
---

# 4. Usuarios, roles y permisos

## 4.1 Los tres tipos de cuenta

| Tipo de cuenta | Cuántas hay | Quién la crea | Idea central |
|---|---|---|---|
| Administrador | Una sola | Es la cuenta original del sistema | Poder técnico total y custodia de los datos |
| Director de Campaña | Una activa | El Administrador | Mando operativo de la campaña |
| Colaborador | Muchas | El Director (o el Administrador) por invitación | Trabajo de campo con las mismas funciones base; extras opcionales |

Regla de oro: **no existen más roles.** Si hace falta que alguien haga algo especial (liderar una vereda, manejar las comunicaciones), no se crea un rol nuevo: el Director le enciende permisos opcionales a ese colaborador (secciones 4.5 y 4.6).

## 4.2 Administrador [ADMIN]

Es una sola persona, el creador del sistema. La pantalla de roles **no ofrece** la opción "Administrador": no se puede asignar ni transferir desde la app.

**Qué puede hacer**

- Crear, invitar, suspender y dar de baja cuentas de cualquier tipo; designar o reemplazar al Director.
- Ver toda la información de la app, incluidos los datos sensibles, la auditoría completa, los registros de seguridad y los errores técnicos.
- Configurar el sistema: catálogos (barrios, veredas, categorías), textos legales con sus versiones, valores de control (radio de duplicados, ventana de edición, límites de exportación, horario de mensajes), integraciones (SMS, WhatsApp, correo, mapas) y descargas de mapas.
- Atender las solicitudes de los titulares de datos (consulta, corrección, eliminación, revocatoria), junto con el Director.
- Eliminar datos de forma definitiva (con motivo y registro) y anonimizar.
- Hacer, programar y restaurar respaldos; revisar costos y uso de la base de datos.
- Gestionar incidentes de seguridad y el plan de cierre de campaña.
- Usar **"Ver como"**: ver la app tal como la ve un Director o un colaborador, en solo lectura y dejando registro (sección 4.11).

**Reglas propias**

- Inicio de sesión con verificación en dos pasos obligatoria y códigos de recuperación guardados fuera de línea.
- Sesión que se cierra tras 12 horas.
- Separación de funciones recomendada: el Administrador no corrige datos de campo salvo que sea necesario; si lo hace, queda en la auditoría.
- El Administrador **no puede borrar ni alterar el registro de auditoría**.

## 4.3 Director de Campaña [DIRECTOR]

Es la cuenta de Jaime González (o de quien el Administrador designe). Es el jefe operativo.

**Qué puede hacer**

- Ver **todo** el trabajo de campo con datos completos: mapa, personas, hogares, estadísticas avanzadas, mapas de calor, simpatía individual.
- Aprobar o rechazar solicitudes de ingreso de colaboradores; suspender temporalmente a un colaborador; invitar nuevos.
- **Encender y apagar permisos opcionales** de cada colaborador (4.5), con motivo y vencimiento opcional.
- Crear y editar zonas, asignarlas a colaboradores o grupos, y fijar metas.
- Crear y asignar tareas, eventos, anuncios y encuestas.
- Verificar registros y revisar las alertas de calidad; sortear las verificaciones por llamada.
- Aprobar exportaciones y mensajes masivos (si no los hace quien tenga el permiso).
- Ver el módulo de finanzas y cumplimiento; ver los informes.
- Ver la auditoría operativa (quién registró, editó, exportó o vio datos completos). No ve la parte técnica.
- Mantener el programa de gobierno, el banco de propuestas y la biblioteca de información.

**Qué no puede hacer**

- Cambiar la configuración del sistema ni los textos legales (lo hace el Administrador).
- Crear otro Director ni otro Administrador.
- Borrar definitivamente datos ni tocar la auditoría.
- Ver registros técnicos de seguridad.

**Reglas propias**

- Verificación en dos pasos obligatoria.
- Sesión de 7 días con huella o rostro del teléfono para volver a entrar.
- Si el Director no está disponible por un periodo largo, el Administrador puede designar temporalmente a otra persona; el cambio queda registrado y la persona anterior pierde el rol.

## 4.4 Colaborador: funciones base [BASE]

Todo colaborador activo (con curso de ingreso aprobado) tiene siempre esto:

1. **Entrar y salir** de forma segura; cambiar su contraseña; usar huella o rostro del teléfono.
2. **Ver el mapa completo de Pijao** con todos los puntos, capas básicas, filtros básicos y la foto de fachada de cada vivienda.
3. **Registrar viviendas, visitas, hogares y personas** (flujo completo de la sección 6), con GPS, fotos y autorización.
4. **Ver los datos de viviendas y personas con la protección estándar**: nombre y primer apellido visibles; cédula, fecha exacta de nacimiento, teléfono, correo y simpatía individual enmascarados.
5. **Editar lo que él mismo registró** durante 72 horas; pasado ese tiempo, solicitar la corrección.
6. **Ver el historial de visitas** de cualquier vivienda (sin datos sensibles).
7. **Ver sus zonas, su ruta del día, sus pendientes por visitar y sus seguimientos.**
8. **Ver su panel personal y el panel general de la campaña** con estadísticas básicas agregadas.
9. **Ver y cumplir tareas asignadas**, marcarlas como hechas o reportar un bloqueo.
10. **Ver la agenda de eventos**, confirmar asistencia y hacer el registro de llegada.
11. **Leer anuncios y notificaciones** del Director.
12. **Usar el centro de información:** programa de gobierno (versión autorizada), mensajes clave, guiones, preguntas frecuentes y kit de marca.
13. **Capacitarse:** cursos, evaluaciones, certificados y "modo práctica" con datos de prueba.
14. **Registrar solicitudes ciudadanas y necesidades** que le cuenten en la calle.
15. **Seguridad en terreno:** iniciar y terminar jornada, compartir ubicación durante la jornada, botón SOS.
16. **Reportar** un problema técnico, un incidente, un rumor falso o una sospecha de irregularidad.
17. **Registrar, en nombre de un ciudadano, una solicitud de corrección, eliminación o revocatoria** de su autorización.
18. **Trabajar sin conexión** y sincronizar después.
19. **Gestionar su perfil:** foto, teléfono, zona, certificados, aceptación de políticas.
20. **Pedir ayuda:** centro de ayuda y contacto con el Administrador.

## 4.5 Colaborador: funciones opcionales [OPCIONAL]

El Director enciende o apaga cada una por colaborador. Las de riesgo **alto** exigen que ese colaborador tenga verificación en dos pasos activa.

| Código | Función opcional | Qué permite | Riesgo |
|---|---|---|---|
| O-01 | Ver datos personales completos | Ver cédula, fecha de nacimiento, teléfono y correo completos | Alto |
| O-02 | Ver simpatía individual [SENSIBLE] | Ver el nivel de simpatía declarado de cada persona | Alto |
| O-03 | Ver estadísticas avanzadas | Rendimiento por colaborador, comparativos entre zonas, embudo, tendencias | Medio |
| O-04 | Ver mapas de calor | Mapas de simpatía agregada y de necesidades | Medio |
| O-05 | Exportar listas | Descargar listas con marca de agua, motivo y registro | Alto |
| O-06 | Editar registros de otros | Corregir registros que hizo otro colaborador | Medio |
| O-07 | Verificar registros | Marcar registros como verificados y resolver alertas de calidad | Medio |
| O-08 | Aprobar cuentas | Aprobar solicitudes de nuevos colaboradores y voluntarios | Medio |
| O-09 | Crear y asignar tareas | Crear tareas y asignarlas a otros | Bajo |
| O-10 | Crear eventos y tomar asistencia | Convocar eventos y registrar quién asistió | Bajo |
| O-11 | Publicar anuncios | Escribir anuncios para el equipo | Bajo |
| O-12 | Enviar mensajes a ciudadanos | SMS, WhatsApp o correo a contactos con autorización | Alto |
| O-13 | Importar datos | Cargar archivos con personas o viviendas, con fuente documentada | Alto |
| O-14 | Gestionar zonas | Dibujar, editar y asignar zonas | Medio |
| O-15 | Ver finanzas | Ver ingresos, gastos y presupuesto (solo lectura) | Medio |
| O-16 | Registrar aportes y gastos | Cargar aportes y gastos con soportes | Alto |
| O-17 | Gestionar propaganda | Inventario de vallas, pendones, volantes y su ubicación | Bajo |
| O-18 | Operar Día de elecciones | Testigos, actas, incidentes y conteo paralelo | Medio |
| O-19 | Gestionar necesidades y propuestas | Clasificar necesidades y vincularlas a los ejes del programa | Bajo |
| O-20 | Fusionar duplicados | Unir viviendas o personas repetidas | Medio |
| O-21 | Ver la ubicación en vivo del equipo | Ver dónde están los compañeros durante la jornada | Medio |
| O-22 | Crear encuestas internas | Armar sondeos de campo | Bajo |

**Reglas de los permisos opcionales**

- Cada permiso queda registrado: quién lo dio, cuándo, por qué y hasta cuándo.
- Pueden tener **vencimiento** (por ejemplo, 30 días). Al vencer se apagan solos.
- Cada mes la app le recuerda al Director revisar qué permisos siguen encendidos.
- Pueden limitarse a **una zona** (4.7).
- Al suspender a un colaborador, todos sus permisos opcionales se apagan.

## 4.6 Plantillas de permisos (atajos del Director)

Son atajos para encender varios permisos de una vez. **No son roles:** la persona sigue siendo "Colaborador" y el Director puede ajustar cada permiso por separado.

| Plantilla | Permisos que enciende |
|---|---|
| Colaborador de campo (estándar) | Ninguno extra |
| Colaborador con estadísticas | O-03, O-04 |
| Líder de zona | O-03, O-04, O-09, O-10, O-14 (limitados a su zona) |
| Colaborador de comunicaciones | O-11, O-12, O-17, O-22 |
| Colaborador de finanzas | O-15, O-16 (con verificación en dos pasos) |
| Colaborador de Día de elecciones | O-18, O-21 |
| Verificador de calidad | O-07, O-20 |

## 4.7 Alcance por zona y vencimiento

El mapa y las estadísticas básicas son para todos, como se pidió. Pero los permisos que dan más poder (O-01, O-02, O-03, O-04, O-06, O-07, O-09, O-10, O-14) se pueden limitar a **"toda Pijao"** o a **"solo mis zonas asignadas"**. Es la manera de dar acceso a lo que alguien necesita para su trabajo sin abrir todo a todos. Ejemplo: un líder de la vereda X puede ver datos completos solo de la vereda X.

## 4.8 Matriz de permisos

✔ = sí · — = no · O-xx = solo si el Director lo habilita

| Función | Administrador | Director | Colaborador base | Colaborador con permiso |
|---|---|---|---|---|
| Ver el mapa completo | ✔ | ✔ | ✔ | ✔ |
| Registrar viviendas, visitas y personas | ✔ | ✔ | ✔ | ✔ |
| Editar lo propio (72 h) | ✔ | ✔ | ✔ | ✔ |
| Editar registros de otros | ✔ | ✔ | — | O-06 |
| Ver datos personales completos | ✔ | ✔ | — | O-01 |
| Ver simpatía individual | ✔ | ✔ | — | O-02 |
| Estadísticas básicas | ✔ | ✔ | ✔ | ✔ |
| Estadísticas avanzadas | ✔ | ✔ | — | O-03 |
| Mapas de calor | ✔ | ✔ | — | O-04 |
| Exportar listas | ✔ | ✔ | — | O-05 |
| Importar datos | ✔ | ✔ | — | O-13 |
| Verificar registros | ✔ | ✔ | — | O-07 |
| Aprobar cuentas nuevas | ✔ | ✔ | — | O-08 |
| Ver tareas asignadas | ✔ | ✔ | ✔ | ✔ |
| Crear y asignar tareas | ✔ | ✔ | — | O-09 |
| Ver agenda y confirmar asistencia | ✔ | ✔ | ✔ | ✔ |
| Crear eventos | ✔ | ✔ | — | O-10 |
| Leer anuncios | ✔ | ✔ | ✔ | ✔ |
| Publicar anuncios | ✔ | ✔ | — | O-11 |
| Enviar mensajes a ciudadanos | ✔ | ✔ | — | O-12 |
| Gestionar zonas | ✔ | ✔ | — | O-14 |
| Ver finanzas | ✔ | ✔ | — | O-15 |
| Registrar aportes y gastos | ✔ | ✔ | — | O-16 |
| Gestionar propaganda | ✔ | ✔ | — | O-17 |
| Operar Día de elecciones | ✔ | ✔ | — | O-18 |
| Registrar necesidades y solicitudes ciudadanas | ✔ | ✔ | ✔ | ✔ |
| Gestionar necesidades y propuestas | ✔ | ✔ | — | O-19 |
| Fusionar duplicados | ✔ | ✔ | — | O-20 |
| Ver ubicación en vivo del equipo | ✔ | ✔ | — | O-21 |
| Crear encuestas internas | ✔ | ✔ | — | O-22 |
| Invitar colaboradores | ✔ | ✔ | — | O-08 |
| Suspender colaboradores | ✔ | ✔ (temporal) | — | — |
| Dar de baja cuentas | ✔ | — | — | — |
| Cambiar permisos opcionales | ✔ | ✔ | — | — |
| Designar al Director | ✔ | — | — | — |
| Ver auditoría | Completa y técnica | Operativa | Solo la suya | — |
| Configurar el sistema y textos legales | ✔ | — | — | — |
| Eliminación definitiva de datos | ✔ | — | — | — |
| Atender solicitudes de titulares | ✔ | ✔ (apoya y aprueba) | Solo registrarlas | — |
| Respaldos y restauración | ✔ | — | — | — |
| "Ver como" otro rol | ✔ | — | — | — |
| Jornada, SOS y seguridad en terreno | ✔ | ✔ | ✔ | ✔ |

## 4.9 Ciclo de vida de una cuenta

1. **Invitación.** El Director (o el Administrador) escribe el nombre y el celular de la persona. La app genera un enlace o código QR **válido por 72 horas y de un solo uso**.
2. **Registro.** La persona abre el enlace, verifica su celular con un código por mensaje, crea su contraseña, pone su foto y completa sus datos: nombre completo, cédula, celular, correo, dirección, contacto de emergencia. Declara si es **servidor público o contratista del Estado**, y confirma ser mayor de 18 años.
3. **Aceptación.** Lee y acepta: acuerdo de confidencialidad, código de conducta, política de seguridad y compromiso de tratamiento de datos. Queda registrada la fecha, la versión del texto y el dispositivo.
4. **Pendiente de aprobación.** El Director revisa y aprueba o rechaza (con motivo). Si la persona declaró ser servidor público o contratista, aparece una alerta para que el abogado revise si puede participar.
5. **Capacitación obligatoria.** Curso de ingreso con evaluación (mínimo 80 %): uso de la app, trato respetuoso, protección de datos, qué decir y qué no decir, seguridad en terreno.
6. **Activa.** Se desbloquea el trabajo de campo con datos reales. Antes de esto solo puede usar el modo práctica.
7. **Suspendida.** Temporal (por el Director) o automática si hay 30 días sin actividad. Cierra sesiones y apaga permisos.
8. **Dada de baja.** Definitiva. Se cierran todas sus sesiones, se borra la información guardada en su teléfono en la siguiente conexión, se reasignan sus tareas y zonas, se le recuerdan sus compromisos de confidencialidad y se registra el motivo. Los registros que hizo se conservan en la campaña con su nombre como autor.

**Cómo funciona hoy (versión 1.1).** Los pasos 1 y 2 se hacen con un **código de invitación** en lugar de un enlace con verificación por SMS. El Director genera el código y la persona lo escribe en la app junto con sus datos. La cuenta se crea sin correo de confirmación (función de servidor `registrar-con-codigo`) y queda pendiente de aprobación. Es más barato y funciona sin servicio de SMS, pero exige estas reglas:

- Código de **12 caracteres o más**, de un solo uso y con vencimiento de 72 horas.
- **Límite de intentos** y mensaje de error genérico.
- La mayoría de edad y el correo de la invitación se validan **en la base de datos**, no solo en la función.
- El **registro abierto de Supabase**, desactivado.
- Las invitaciones de Director, con aprobación del Administrador.

Ver 24.3, hallazgos A7 y A8.

## 4.10 Inicio de sesión y seguridad de acceso

- **Ingreso:** correo con contraseña. Después, huella o rostro del teléfono para volver a entrar rápido. *(Actualización 1.1: sin código por SMS, porque exige un proveedor de pago.)*
- **Verificación en dos pasos:** obligatoria para Administrador y Director, y para cualquier colaborador con un permiso de riesgo alto. Se hace con una **aplicación autenticadora** (TOTP), que es gratuita.
- **Contraseña:** mínimo 10 caracteres, sin contraseñas comunes.
- **Sesiones:** colaborador, 14 días sin actividad; Director, 7 días; Administrador, 12 horas.
- **Dispositivos:** máximo dos por colaborador. Cada uno queda en una lista que el colaborador y el Administrador pueden ver y cerrar a distancia.
- **Teléfono perdido o robado:** el colaborador (o el Director) reporta; el Administrador cierra la sesión de inmediato y se borra la información guardada en ese teléfono cuando vuelva a conectarse.
- **Intentos fallidos:** después de cinco, la cuenta se bloquea 15 minutos y se avisa al Administrador si se repite.
- **Aviso de nuevo ingreso:** cada vez que la cuenta entra desde un dispositivo nuevo, llega una notificación al dispositivo habitual.
- **Teléfono inseguro:** la app exige que el teléfono tenga bloqueo de pantalla; avisa si detecta un teléfono modificado (rooteado) o una aplicación de ubicación falsa.

## 4.11 "Ver como" (para soporte)

El Administrador puede ver la app **como la vería** un Director o un colaborador concreto, en **solo lectura**, para entender un reclamo o comprobar permisos. Mientras lo hace aparece una franja visible que lo indica. Cada uso queda en la auditoría con fecha, hora y motivo. En este modo no se ven datos que la persona observada no podría ver.
---

# 5. El mapa de Pijao

## 5.1 Qué es y qué contiene

El mapa es la pantalla principal de la app (pestaña "Mapa"). Es **un solo mapa real, compartido por todo el equipo**: lo que un colaborador registra aparece para los demás según sus permisos.

Muestra:

- **Mapa base real** con tres vistas: calles, satélite y relieve (importante en un municipio de ladera).
- **Límite del municipio** de Pijao.
- **Zonas**: barrios del casco urbano y veredas (secciones 5.9).
- **Puntos**: viviendas y otros lugares con su estado (5.6).
- **Capas** que se encienden y apagan (5.8).
- **La ubicación de quien lo usa** y, durante la jornada, la del equipo (5.12).

**Fuente de los límites.** Se usarán los límites oficiales del municipio y de las veredas si están disponibles (cartografía del IGAC y marco geoestadístico del DANE); si no, se usarán los de OpenStreetMap y el Administrador podrá cargar o corregir los polígonos. A confirmar en la sección 23.

## 5.2 Navegación del mapa

- Acercar y alejar con dos dedos; girar el mapa; inclinar en vista satélite.
- Botón **"Centrar en mí"**; brújula; escala en metros.
- **Mantener presionado** un lugar muestra sus coordenadas y ofrece "Registrar en este punto".
- **Selector "Ir a…"** para saltar a una vereda o a un barrio.
- **Buscador:** por dirección, nombre de finca, vereda o barrio; por nombre de persona o cédula solo quien tenga permiso para ver ese dato.
- **Vista de lista:** alterna el mapa con una lista de los puntos cercanos ordenados por distancia.
- **Pantalla completa** y panel de capas (5.8).

## 5.3 Mi ubicación

- Punto azul con un círculo que muestra la **precisión** del GPS.
- Indicador de señal: buena (menos de 10 m), regular (10 a 20 m) o débil (más de 20 m), con el número en metros.
- Si no hay GPS pero sí ubicación aproximada por red, la app lo dice y **no permite registrar** con esa ubicación.
- La primera vez, la app explica con palabras sencillas por qué necesita la ubicación. El seguimiento en segundo plano solo se pide para la jornada de trabajo (5.12).
- Para cuidar la batería, la ubicación se actualiza con frecuencia solo cuando el mapa está abierto.

## 5.4 El botón "Registrar aquí"

Botón flotante grande y naranja, siempre visible en el mapa y en la barra inferior. Al tocarlo:

1. La app toma **varias lecturas de GPS durante unos 8 a 10 segundos** y se queda con la mejor. Muestra el avance: "Tomando ubicación… ±12 m".
2. Si la precisión es peor que **20 m**, avisa y ofrece: esperar, moverse a un lugar abierto o ajustar el punto a mano.
3. Muestra el punto sobre la vista satélite y permite **arrastrarlo para afinar** (hasta 30 m de la lectura del GPS).
4. **Busca duplicados**: si hay una vivienda registrada a menos de **15 m**, muestra sus tarjetas con foto y dirección: "¿Es una de estas?". Opciones: "Es esta (agregar visita)" o "Es otra casa".
5. Revisa si ese punto está marcado **"No contactar"** y, en ese caso, detiene el registro y avisa que no debe visitarse.
6. Verifica que el teléfono esté a **menos de 50 m** del punto; así no se pueden registrar casas a distancia.
7. Al confirmar, abre el flujo de registro de la sección 6.

**Qué se guarda de la ubicación:** latitud y longitud (6 decimales), precisión en metros, altitud, fecha y hora, dispositivo y fuente ("GPS" o "manual").

## 5.5 Ubicación manual y registro diferido

Hay casas a las que no se puede llegar de inmediato (una ladera, un camino de finca, un perro bravo). Para eso:

- **Ubicación manual:** se mantiene presionado el punto en el mapa. Solo se permite hasta **100 m** del teléfono. Exige un motivo de una lista (C-20) y queda marcada como "ubicación manual".
- **Registro diferido:** si el punto está a más de 100 m, el registro se guarda como **borrador pendiente de aprobación**. No cuenta en las estadísticas hasta que el Director o un verificador lo confirme.

## 5.6 Tipos de punto y estados

Cada punto tiene color **y** forma, para que se distinga aunque no se vean bien los colores.

| Punto | Color y forma | Significado |
|---|---|---|
| Vivienda por visitar | Gris, círculo | Marcada en reconocimiento; sin visita |
| Visitada, hubo conversación | Verde, casa con visto | Visita completa |
| Visitada, sin contacto | Amarillo, casa con reloj | Nadie atendió; hay que volver |
| Requiere seguimiento | Naranja, casa con bandera | Pidió volver o quedó algo pendiente |
| No contactar | Negro, candado | La persona pidió no ser contactada. Todos ven solo "No volver", sin datos |
| Deshabitada o sin uso | Gris tachado | No vive nadie |
| Negocio o establecimiento | Azul, tienda | Local comercial o turístico |
| Sede o sitio de reunión | Azul océano, estrella | Lugar de la campaña |
| Puesto de votación | Azul marino, urna | Lugar donde se vota |
| Evento programado | Turquesa, calendario | Actividad próxima |
| Problema reportado | Rojo, triángulo | Un daño o necesidad del lugar (vía, alumbrado, derrumbe) |
| Propaganda instalada | Naranja claro, valla | Valla, pendón o similar (13.5) |
| Compañero en línea | Círculo con iniciales | Solo durante su jornada y con permiso |

**Agrupación:** al alejar el mapa, los puntos cercanos se agrupan en burbujas con el número y el color del estado dominante.

## 5.7 Ficha rápida al tocar un punto

Una hoja que sube desde abajo con:

- Foto de fachada.
- Dirección escrita, barrio o vereda.
- Estado y fecha de la última visita, y quién la hizo.
- Número de personas del hogar.
- Etiquetas de las principales necesidades.
- Botones: **Ver detalle**, **Agregar visita**, **Cómo llegar**, **Reportar problema con este registro**.

Deslizando hacia arriba se abre el detalle completo de la vivienda (P-13).

## 5.8 Capas y filtros

**Capas:** estados de visita; seguimientos vencidos; densidad de viviendas; necesidades por tema; simpatía agregada (con O-04); problemas reportados; eventos; propaganda; puestos de votación; lugares y organizaciones clave; límites de zonas; mi ruta; compañeros en línea.

**Filtros:** barrio o vereda; estado; rango de fechas; colaborador; tema de necesidad; etiqueta; "solo lo mío"; "solo pendientes"; "solo seguimientos".

**Vistas guardadas:** combinaciones de capas y filtros con nombre, por ejemplo "Seguimientos de mi vereda" o "Casas sin visitar del Barrio X".

## 5.9 Zonas

- Cada barrio y vereda es un **polígono** con nombre y color de borde.
- Quien tenga O-14 (o el Director) puede dibujar, editar, unir y dividir zonas, y asignarlas a colaboradores.
- Las zonas asignadas a cada colaborador se resaltan en su mapa.
- Cada zona muestra un anillo de avance (viviendas visitadas sobre estimadas) y se sombrea cuando está completa.
- La ficha de zona muestra viviendas registradas y estimadas, porcentaje de cobertura, equipo asignado, necesidades principales y fecha de la última visita.

## 5.10 Modo Reconocimiento (censo de viviendas)

Para medir cuánto del municipio se ha cubierto hay que saber cuántas viviendas existen. En este modo el colaborador recorre una zona y toca **"Marcar vivienda"** en cada casa: solo se guarda el punto y, si quiere, una foto de fachada. **No se registran datos de personas.** Esos puntos quedan en gris ("por visitar") y de ahí en adelante son el universo contra el cual se mide la cobertura. [FASE 2]

## 5.11 Rutas y navegación

- **Mi ruta del día:** lista de viviendas pendientes de su zona, ordenadas de la más cercana a la más lejana, con la posibilidad de reordenarlas.
- **Cómo llegar:** abre Google Maps, Waze o el mapa del teléfono.
- **Grabar recorrido** (opcional): dibuja en el mapa el camino caminado. Al terminar la jornada muestra un resumen: tiempo, distancia y viviendas.

## 5.12 Colaboradores en tiempo real (modo jornada)

El mapa conecta a las personas del equipo, pero con límites claros para respetar a quien trabaja:

- El colaborador toca **"Iniciar jornada"** y desde ese momento comparte su ubicación con el Director (y con compañeros si tienen O-21). Toca **"Terminar jornada"** y deja de compartirla.
- **Fuera de la jornada no se rastrea a nadie.** El colaborador puede pausar hasta 60 minutos (por ejemplo, para almorzar).
- Se ve solo el punto con iniciales, actualizado cada unos 30 segundos mientras se mueve.
- El historial de ubicaciones se guarda 7 días para seguridad y calidad, y luego se borra.
- **Botón SOS:** mantenerlo presionado 3 segundos envía una alerta con ubicación y hora al Director, al Administrador y a dos contactos de emergencia del colaborador.
- **Revisión de bienestar:** cada 2 horas la app pregunta "¿Todo bien?". Si no hay respuesta en 15 minutos y no hay movimiento, avisa al Director.
- **Alerta de no regreso:** si la jornada debía terminar a cierta hora y no se cierra, avisa al Director.

## 5.13 Sincronización en tiempo real

- Cuando un colaborador guarda una visita con conexión, el punto **aparece o cambia en los mapas de los demás en pocos segundos**, con una animación suave.
- Encabezado del mapa: "Actualizado hace 3 s" o "Sin conexión".
- Lo guardado sin conexión se ve con borde punteado y la etiqueta "Pendiente de enviar" hasta que se sincroniza.
- Si dos personas editan lo mismo, se conservan **ambas versiones en el historial**; en los campos corrientes gana la más reciente; en los campos críticos (por ejemplo "No contactar" o la revocatoria de una autorización) gana siempre la decisión de protección de la persona. El Director ve los conflictos marcados.

## 5.14 Mapa sin conexión

- **"Descargar zona"** para las zonas asignadas: la app pide hacerlo con Wi-Fi y muestra cuántos megabytes ocupará.
- Incluye calles y satélite con detalle moderado, más los puntos, viviendas y personas de esa zona con la protección estándar.
- Se actualiza sola cada noche con Wi-Fi.
- Tope de almacenamiento configurable; se puede borrar una zona para liberar espacio.
- Fuera de las zonas descargadas y sin señal, aparece un mensaje claro: "Este mapa no está disponible sin conexión".
- **Licencias (agregado en 1.1).** Los servidores públicos de OpenStreetMap y las imágenes satelitales gratuitas de Esri **no permiten descargar zonas enteras para usarlas sin conexión**. El mapa sin conexión debe salir de un **paquete propio de Pijao** (calles de OpenStreetMap procesadas y ortofoto del IGAC o tomada con dron, en formato PMTiles o MBTiles) o de un proveedor que lo autorice por contrato (ver N-02 y la decisión 23.1-5).

## 5.15 Dirección escrita y coordenadas

En Pijao hay direcciones de tipo urbano ("Carrera 5 # 4-12, Barrio Centro") y rurales ("Vereda X, finca Y, después de la caseta comunal"). La app guarda **las dos cosas, texto y coordenadas**, y las mantiene coherentes:

- Al fijar el punto, **propone** un texto de dirección (lo mejor posible; en el campo suele fallar, por eso siempre es editable).
- Al escribir la dirección, **propone** un punto en el mapa, que también se puede mover.
- El **barrio o vereda** se rellena solo según el polígono donde cae el punto.
- Si el punto cae en un barrio o vereda distinto al escrito, avisa: "Revisar: el punto está en la vereda X y usted escribió Y".
- Campos de dirección: zona urbana o rural, barrio o vereda, dirección o nomenclatura, complemento (casa, apartamento, piso), nombre de la finca o predio, indicaciones para llegar y punto de referencia.

## 5.16 Privacidad en el mapa

- El mapa **nunca muestra nombres**: solo íconos. Los nombres aparecen en la ficha.
- A zoom lejano solo se ven agrupaciones, no casas individuales.
- El mapa no se puede compartir hacia afuera de la app.
- En las pantallas con datos se **bloquean las capturas de pantalla** cuando el teléfono lo permite, y las que se hagan o las exportaciones llevan una **marca de agua** con el nombre del colaborador y la fecha.
- Botón **"Ocultar pantalla"** (ícono de ojo) que difumina todo al instante si alguien se asoma.
- La app se bloquea sola tras 2 minutos sin uso y pide huella o rostro.
---

# 6. Registro de viviendas y visitas

## 6.1 Dos modos: registro rápido y registro completo

- **Registro rápido (menos de 90 segundos):** ubicación, foto de fachada, resultado del contacto, número de personas del hogar y principal sostén. Sirve para dejar la casa marcada y seguir caminando.
- **Registro completo:** todos los pasos de 6.3. Se puede completar después; mientras tanto el registro queda como **"incompleto"** (amarillo) y aparece en los pendientes del colaborador.

## 6.2 Antes de tocar la puerta

Al abrir "Nueva visita" aparece una tarjeta breve (se puede saltar después de verla tres veces):

- Salude y preséntese con su nombre y el de la campaña.
- Explique para qué visita: **conocer las necesidades de la familia y escuchar**, no pedir nada a cambio.
- Pregunte si puede registrar la visita y ofrezca el **aviso de privacidad** (código QR o volante).
- No fotografíe a niños ni a personas sin permiso.
- Si dicen que no, agradezca y deje constancia. No insista.
- No ofrezca regalos, favores ni promesas personales.

## 6.3 Paso a paso

Cada paso indica si el dato es **obligatorio**, **opcional** o **[SENSIBLE]**.

### Paso 1. Ubicación

Ver sección 5.4 (GPS, duplicados, distancia). Se guardan las coordenadas reales del lugar.

### Paso 2. Foto de fachada

- Obligatoria, salvo que la persona no autorice; en ese caso se marca "No autorizó la foto".
- La app **estampa** la foto con fecha, hora, coordenadas e iniciales del colaborador en una franja inferior.
- Se comprime a unos 1.024 píxeles de lado largo y unos 100 KB, con una miniatura de 20 KB, y se guarda en espacio privado. *(Ajustado en 1.1 para caber en el plan gratuito.)*
- Hasta 6 fotos por visita, de estos tipos: **fachada** (una obligatoria), **entorno o referencia**, **problema** (por ejemplo un derrumbe o un hueco en la vía), **autorización firmada en papel** (evidencia restringida).
- Si en la foto aparece una persona, la app pregunta si autorizó. Nunca niños.

### Paso 3. Datos de la vivienda

| Dato | Tipo | Notas |
|---|---|---|
| Tipo de vivienda | Obligatorio | Catálogo C-03 |
| Zona urbana o rural | Obligatorio | Se propone según el mapa |
| Barrio o vereda | Obligatorio | Se rellena sola por el polígono; editable |
| Dirección escrita | Obligatorio | Nomenclatura urbana o descripción rural |
| Complemento | Opcional | Casa 2, apartamento, piso |
| Nombre de la finca o predio | Opcional | Importante en zona rural |
| Indicaciones para llegar | Opcional | Texto libre |
| Punto de referencia | Opcional | Por ejemplo "frente a la caseta comunal" |
| Estado de ocupación | Obligatorio | Habitada, deshabitada, en construcción, de uso temporal o turístico |
| Tenencia | Opcional | Propia, arrendada, familiar, administrada (mayordomo), otra (C-04) |
| Servicios | Opcional | Agua, alcantarillado o pozo, energía, gas, internet, recolección de basura (C-05) |
| Vía de acceso | Opcional | Pavimentada, placa huella, destapada, camino, difícil en lluvia (C-06) |
| Riesgos visibles | Opcional | Derrumbe, inundación, cercanía a quebrada |
| Actividad económica en la vivienda | Opcional | Negocio, finca cafetera, alojamiento turístico, otra, ninguna |

**Vivienda sin contacto.** Si nadie atendió o la persona no autoriza, se guarda **solo el punto, el estado y la foto de fachada** (sin personas a la vista). No se asocia ninguna persona.

### Paso 4. Resultado del contacto

- **Resultado (obligatorio):** conversación completa, conversación breve, dejó información, nadie en casa, pidió volver, rechazó, pidió no ser visitado, casa cerrada o deshabitada, dirección errónea (C-02).
- **Hora de la visita:** automática.
- **Autorización verbal para registrar la visita:** casilla obligatoria si hubo conversación. Si no autoriza, solo se guarda el punto con el estado "Rechazó".

### Paso 5. Datos del hogar

| Dato | Tipo | Notas |
|---|---|---|
| Número total de personas que viven en el hogar | Obligatorio | |
| Personas por rango de edad | Obligatorio | 0–5, 6–12, 13–17, 18–24, 25–34, 35–44, 45–54, 55–64, 65 o más (C-11). La suma debe dar el total |
| Personas mujeres y hombres | Opcional | Solo conteo |
| De los mayores de 18: cuántos votan en Pijao, cuántos en otro municipio y cuántos no saben | Opcional | Estimación; sin nombres |
| Jóvenes que cumplirán 18 años antes de la elección | Opcional | Solo conteo, sin nombres |
| **Principal sostén del hogar** | Obligatorio | Ver abajo |
| Otros hogares en la misma vivienda | Opcional | Si es sí, se abre otro hogar |
| Familiares que viven fuera de Pijao pero votan en Pijao | Opcional | Cuántos y en qué ciudad |
| Mascotas | Opcional | Perros, gatos, otras; si necesitan vacunación o esterilización |

**Principal sostén del hogar** (quien aporta el sustento principal):

- Nombre (opcional si no autoriza datos personales).
- Relación con el hogar: jefe o jefa, cónyuge, hijo o hija, otro.
- Sexo (opcional). De ahí sale el dato "hogar con jefatura femenina".
- Ocupación o actividad económica (C-07).
- Situación laboral: empleo formal, informal, independiente, sin empleo, pensionado.

**Lo que no se pregunta:** ingresos en dinero, Sisbén, subsidios ni programas sociales (sección 2.4).

### Paso 6. Personas

Por cada persona adulta que autorice, se abre la ficha de la sección 7. Se pueden registrar varias.

### Paso 7. Necesidades y temas

Preguntas guía, en tono de conversación:

- "¿Cuál es el mayor problema que enfrenta su hogar o su vereda?"
- "¿Qué le gustaría que cambiara en Pijao?"
- "¿Qué es lo que más valora de Pijao?"

Se registra:

- Hasta **3 necesidades** elegidas del catálogo C-08, con prioridad 1, 2 o 3.
- Una frase libre por cada una, con las palabras de la persona (puede dictarse por voz).
- Si es un problema **del hogar** (privado) o **colectivo** (de la vereda o el barrio).
- Una **foto del problema** (opcional).
- "¿Quiere que le contemos cómo va su propuesta?" (sí o no; exige haber autorizado contacto).
- **Historias que nos unen:** "¿Autoriza que su historia o su frase se use en la campaña?" Es una autorización aparte (sección 11.8).

### Paso 8. Participación e interés

- Quiere recibir información y por qué canal (C-10).
- Quiere ser voluntario o voluntaria.
- Podría ser **anfitrión** de una reunión pequeña en su casa.
- Temas de interés (C-08).
- Mejor horario para ser contactado.
- "¿Prefiere que no volvamos a visitarlo?" Si es sí, la vivienda queda en **No contactar** de inmediato.

### Paso 9. Simpatía [SENSIBLE]

- **Opcional y solo si la persona lo expresó por iniciativa propia.** No se pregunta como obligación y no se insiste.
- Escala C-09: apoya, simpatiza, neutral, indeciso, no apoya, prefiere no decir. Por defecto: "No registrado".
- Mensaje fijo en la pantalla: "Registre lo que la persona dijo, no lo que usted supone."
- Requiere la casilla de autorización específica del paso 10.
- Solo la ven el Director, el Administrador y quien tenga O-02.

### Paso 10. Autorización

(El detalle legal está en la sección 16.4.)

1. El colaborador **lee el texto corto** o lo muestra en pantalla.
2. Casillas **separadas** para cada propósito: (a) registrar la vivienda y los datos del hogar; (b) guardar mis datos personales; (c) recibir información de la campaña por el canal elegido; (d) **[SENSIBLE]** registrar mi simpatía; (e) usar mi historia en comunicaciones.
3. **Firma en pantalla** con el dedo, o **autorización verbal confirmada** con casilla y hora.
4. Se entrega el **aviso de privacidad** (QR o volante).
5. La app guarda: versión del texto, fecha y hora, ubicación, colaborador, método y firma.

Sin autorización registrada para datos personales, **la app no permite guardar** la ficha de la persona. Sí se permite guardar el hogar con sus conteos, sin datos identificables.

### Paso 11. Notas y evidencias

- Notas libres, con dictado por voz.
- Advertencia fija: "No escriba opiniones sobre la vida privada de nadie, salud, religión, política de terceros ni datos de menores."
- La app avisa si la nota parece contener un número de cédula o de teléfono (para llevarlo al campo correcto) o palabras que sugieren datos sensibles.
- Fotos adicionales.
- Compromisos de seguimiento, siempre de información ("quedamos en llamar el sábado para contarle el programa"), nunca de favores.

### Paso 12. Cierre

- Resumen de lo registrado.
- **Seguimiento requerido:** sí o no; fecha y hora; motivo; a quién se asigna.
- **Volante entregado:** sí o no.
- Botón **Guardar**: funciona con o sin internet.
- Confirmación clara: "Guardado y sincronizado" o "Guardado en el teléfono, pendiente de enviar".
- **Semáforo de calidad** del registro (6.4).

## 6.4 Semáforo de calidad del registro

- **Verde:** ubicación con buena precisión, foto, hogar completo y autorizaciones registradas.
- **Amarillo:** faltan datos opcionales importantes (por ejemplo, el principal sostén).
- **Rojo:** falta autorización, foto o ubicación confiable.

Los registros en rojo **no cuentan en las estadísticas oficiales** hasta corregirse, y aparecen en los pendientes del colaborador.

## 6.5 Control de calidad y anti-fraude

La app detecta y marca para revisión:

- Más de un registro completo cada 90 segundos por el mismo colaborador.
- Saltos de ubicación imposibles (por ejemplo, dos casas a 10 km con 2 minutos de diferencia).
- Ubicación falsa detectada en el teléfono.
- Fotos repetidas o que no coinciden con las coordenadas.
- Registros fuera de la zona asignada (alerta suave) o fuera de horario (por ejemplo, de noche).
- Registros con datos idénticos a otros.

Todo llega a la pantalla de **Calidad** (P-39). Además, cada semana la app **sortea el 5 %** de las visitas para una **verificación por llamada**: el Director o un verificador llama (solo a quienes autorizaron contacto) y pregunta si realmente los visitaron. Un colaborador con varias alertas confirmadas pasa a revisión del Director.

## 6.6 Historial, edición, duplicados y eliminación

- **Historial:** cada vivienda tiene una línea de tiempo con todas sus visitas: fecha, autor, resultado, fotos y notas.
- **Edición:** quien lo registró puede editarlo durante **72 horas**; después debe solicitar la corrección. Pueden editar siempre el Director, el Administrador y quien tenga O-06. **Cada edición guarda lo anterior y lo nuevo**, con quién y cuándo.
- **Duplicados:** de viviendas, por cercanía y dirección; de personas, por cédula, por nombre con fecha de nacimiento y por teléfono. La app propone fusionarlos; lo ejecuta el Director, el Administrador o quien tenga O-20. Al fusionar se conserva todo el historial.
- **Eliminación:** se hace con motivo y va a una **papelera por 30 días**. El borrado definitivo es solo del Administrador (sección 16).

## 6.7 Visitas de seguimiento

- "Agregar visita" a una vivienda ya registrada **no repite todo el cuestionario**: muestra lo que ya hay, pregunta si sigue vigente, y solo pide el resultado, los cambios y las notas.
- Si la persona pidió que volvieran en una fecha, la app crea un **recordatorio** y una tarea.
- Los **seguimientos vencidos** se muestran en rojo en el mapa y en la lista de tareas.

---

# 7. Registro de personas

## 7.1 Principios

- **Solo mayores de 18 años**, con autorización registrada y pidiendo solo lo necesario.
- Cada persona pertenece a un **hogar** y cada hogar a una **vivienda**. La dirección de la persona se hereda de la vivienda (texto y coordenadas), por lo que **aparece en el mapa en ese punto**.
- Un menor de edad nunca tiene ficha: solo se cuenta por rango de edad (sección 6.3, paso 5).

## 7.2 Datos de la persona

**Identificación**

| Dato | Tipo | Notas |
|---|---|---|
| Primer nombre | Obligatorio | |
| Segundo nombre | Opcional | |
| Primer apellido | Obligatorio | |
| Segundo apellido | Opcional | El **nombre completo** se arma con los cuatro |
| Cómo le gusta que le llamen | Opcional | Apodo o nombre de uso |
| Tipo de documento | Opcional | Cédula de ciudadanía (por defecto) o cédula de extranjería de residente |
| Número de documento (cédula) | Opcional, recomendado | Solo con autorización específica. Solo números, entre 6 y 10 dígitos. No se repite entre personas. Se guarda cifrado |
| Fecha de nacimiento | Opcional, recomendada | Calcula la edad. Debe ser mayor de 18 |
| Sexo | Opcional | Mujer, hombre, prefiere no decir |
| Ocupación | Opcional | Catálogo C-07 |

**Contacto**

| Dato | Tipo | Notas |
|---|---|---|
| Teléfono principal | Opcional | Celular colombiano de 10 dígitos que empieza por 3, o fijo con indicativo |
| ¿Es WhatsApp? | Opcional | Sí o no |
| Segundo teléfono | Opcional | |
| Correo electrónico | Opcional | |
| Canal preferido | Opcional | WhatsApp, llamada, SMS, correo, visita (C-10) |
| Mejor horario | Opcional | |

**Residencia**

| Dato | Tipo | Notas |
|---|---|---|
| Vivienda y hogar | Obligatorio | Vinculados |
| Años viviendo en Pijao | Opcional | Rangos |
| Vive actualmente en otra ciudad | Opcional | Para quienes votan en Pijao pero viven fuera |

**Electoral**

| Dato | Tipo | Notas |
|---|---|---|
| ¿Vota en Pijao? | Opcional | Sí, no, no sabe |
| Puesto y mesa de votación | Opcional | Texto |
| Consultar puesto de votación | Botón | Abre el sitio oficial de la Registraduría para que la persona lo consulte. La app no consulta por su cuenta |
| Elegibilidad | Calculada | Mayor de 18 el día de la elección |

**Relación con la campaña**

| Dato | Tipo | Notas |
|---|---|---|
| Quiere recibir información y por qué canal | Opcional | |
| Voluntario | Opcional | Sí, no, tal vez |
| Anfitrión de reunión | Opcional | |
| Temas de interés | Opcional | C-08 |
| Simpatía | Opcional **[SENSIBLE]** | C-09, solo con autorización específica |

**Consentimientos** (uno por cada propósito): datos básicos, contacto por cada canal, dato sensible, uso de historia o foto. Cada uno guarda fecha, versión del texto, método, evidencia, quién lo recogió y si está **vigente o revocado**.

**Estado de la persona:** activa, no contactar, se mudó, fallecida (solo marca para retirarla de contactos), solicitó eliminación.

## 7.3 Validaciones

- Cédula: solo números, 6 a 10 dígitos, única en el sistema; si ya existe, avisa y propone abrir la ficha existente.
- Fecha de nacimiento: la persona debe tener al menos 18 años y no más de 110.
- Nombres: letras, tildes y espacios; mínimo dos caracteres.
- Teléfono y correo: formato válido.
- No se guarda una ficha con datos personales si falta la autorización (b) del paso 10.

## 7.4 Qué ve cada quien (protección estándar)

| Dato | Colaborador base | Con permiso | Director y Administrador |
|---|---|---|---|
| Nombre | Nombre y primer apellido | Completo | Completo |
| Cédula | Solo los últimos 3 dígitos | Completa (O-01) | Completa |
| Fecha de nacimiento | Solo la edad | Completa (O-01) | Completa |
| Teléfono | Solo los últimos 4 dígitos | Completo (O-01) | Completo |
| Correo | Parcialmente oculto | Completo (O-01) | Completo |
| Simpatía | Oculta | Visible (O-02) | Visible |
| Dirección escrita y punto | Visible | Visible | Visible |
| Notas | Las no sensibles | Igual | Todas |

Los botones **Llamar** y **WhatsApp** solo funcionan para personas que autorizaron ese canal y para tareas de seguimiento asignadas al colaborador, o para quien tenga O-01.

## 7.5 Cumpleaños y saludos

La app muestra "Cumpleaños de la semana" solo de personas que autorizaron contacto, para una llamada o un saludo personal. Nunca de menores. Los mensajes por SMS o WhatsApp solo los envía quien tenga O-12, con plantilla aprobada.

## 7.6 Línea de tiempo de la persona

Visitas en las que apareció, eventos a los que asistió, tareas de seguimiento, mensajes recibidos, cambios en sus consentimientos y solicitudes que haya hecho sobre sus datos.

## 7.7 Casos especiales

- **Joven que cumple 18:** se puede registrar con su propia autorización; antes de eso, solo figura en el conteo del hogar.
- **Extranjeros residentes:** pueden participar en elecciones locales si cumplen los requisitos de residencia y tienen cédula de extranjería de residente; por eso existe el tipo de documento.
- **Persona que se muda:** se cierra su hogar anterior y se abre uno nuevo; se conserva el historial.
- **Persona con dos viviendas** (casa en el pueblo y finca): una es la principal y la otra secundaria.
- **Fallecimiento:** se marca para retirarla de contactos y listas; sus datos se tratan según el plan de cierre.

## 7.8 Derechos de la persona desde su ficha

Desde la ficha, el colaborador (o la persona, por el canal público de la sección 16.5) puede registrar una **consulta, actualización o corrección, eliminación o revocatoria de la autorización, o una queja**. Se crea un caso con fechas límite (P-35). Si hay revocatoria o eliminación, la persona queda en **No contactar** de inmediato.
---

# 8. La base de datos en Supabase, explicada en lenguaje natural

## 8.1 Qué hace Supabase en este proyecto

Supabase reúne en un solo lugar lo que la app necesita detrás de pantalla:

- **La base de datos** donde viven todos los datos organizados en listas.
- **Las cuentas y el ingreso seguro:** usuarios, códigos por mensaje y verificación en dos pasos.
- **El almacenamiento privado** de fotos y documentos.
- **El tiempo real:** el aviso instantáneo de que algo cambió para que el mapa se actualice solo.
- **Las funciones automáticas:** calcular estadísticas, mandar alertas, anonimizar datos.
- **Las reglas de seguridad por fila:** quién puede ver o modificar cada registro.

Habrá **un solo proyecto con dos ambientes:** pruebas (con datos falsos) y producción (con datos reales).

## 8.2 Las listas (tablas) y qué guarda cada una

| Lista | Qué guarda | Se relaciona con |
|---|---|---|
| Perfiles de usuario | Nombre, foto, celular, correo, zona, estado, declaración de servidor público, contacto de emergencia | Autor de todo lo que se registra |
| Permisos opcionales | Qué permiso, a quién, quién lo dio, vencimiento y alcance | Perfiles |
| Invitaciones | Enlace, caducidad y estado | Perfiles |
| Dispositivos | Modelo, última conexión, estado | Perfiles |
| Viviendas | Punto (latitud, longitud, precisión), dirección escrita, barrio o vereda, tipo, estado, foto principal | Zonas, hogares, visitas |
| Hogares | Conteos por edad, principal sostén, mascotas, jóvenes por votar | Vivienda |
| Personas | Datos identificables (cifrados) y estado | Hogar |
| Consentimientos | Autorización por persona y propósito, versión del texto, evidencia, vigente o revocada | Personas |
| Visitas | Fecha, autor, resultado, notas, calidad | Vivienda |
| Fotos | Archivo (en almacenamiento privado), tipo, coordenadas, autor | Vivienda y visita |
| Necesidades | Tema, prioridad, texto, si es del hogar o colectiva, estado de atención | Hogar, zona, propuestas |
| Zonas | Polígono, tipo (barrio o vereda), meta | Viviendas, asignaciones |
| Asignaciones | Zona asignada a un colaborador, fechas | Zonas, perfiles |
| Tareas | Tipo, responsable, fecha, estado | Vivienda, persona o evento |
| Eventos y asistencia | Datos del evento y quién asistió | Personas, perfiles |
| Anuncios y notificaciones | Mensajes internos y su lectura | Perfiles |
| Voluntarios | Datos, habilidades, disponibilidad, estado | Personas, zonas |
| Organizaciones y líderes | Organización, vocero, contacto público, zona, reuniones | Zonas, eventos |
| Solicitudes ciudadanas | Origen, tema, ubicación, estado, respuesta | Hogar, propuestas |
| Programa de gobierno | Ejes, propuestas, versiones, evidencia, competencia y viabilidad | Necesidades |
| Comunicaciones | Plantillas, envíos, destinatarios autorizados, resultados, bajas | Personas |
| Encuestas | Preguntas y respuestas | Zonas, personas |
| Finanzas | Aportes, gastos, proveedores, presupuesto, topes, soportes | Eventos, propaganda |
| Propaganda | Inventario, ubicación, permisos, fechas de instalación y retiro | Mapa, finanzas |
| Testigos y mesas | Testigos, puesto, mesa, acreditación, reportes, fotos de actas, resultados | Puestos de votación |
| Resultados históricos | Votos por puesto y mesa en elecciones anteriores | Puestos |
| Incidentes | Tipo, descripción, evidencia, estado | Perfiles, mapa |
| Solicitudes de titulares | Tipo, fecha, plazo, estado, respuesta | Personas |
| Auditoría | Quién, qué, cuándo, desde dónde, antes y después | Todo |
| Capacitación | Cursos, lecciones, evaluaciones, certificados | Perfiles |
| Documentos y biblioteca | Archivos, versiones, quién los ve | Perfiles |
| Catálogos y configuración | Listas de opciones, parámetros, textos legales con versión | Todo |
| Metas e indicadores | Objetivos por zona y fecha | Zonas |
| Ubicaciones de jornada | Puntos del equipo mientras trabaja (se borran a los 7 días) | Perfiles |

## 8.3 Cómo se guardan las ubicaciones

- Cada punto es un **punto geográfico real** (latitud y longitud en el mismo sistema que usan los GPS), con precisión, altitud, fuente (GPS o manual) y hora.
- Con la extensión geográfica de la base de datos se responde en milisegundos: qué viviendas hay a menos de 15 m (duplicados), en qué barrio o vereda cae un punto, cuánto falta para llegar, y se dibujan los mapas de calor.
- **Siempre se guarda también la dirección escrita**, por si falla el GPS o cambia el mapa base.

## 8.4 Quién puede leer y escribir qué

Estas reglas las hace cumplir **la propia base de datos**, no solo la app; así, aunque alguien manipulara la app, no podría saltárselas:

- Todo usuario activo puede **leer viviendas y visitas** (el mapa completo), pero las **personas solo en su versión enmascarada**. Los datos completos solo salen para quien tenga el permiso, el Director o el Administrador, y siempre con registro.
- Un colaborador puede **crear** viviendas, hogares, personas, visitas y fotos, y **modificar solo lo que él creó**, durante 72 horas.
- El Director lee y escribe lo operativo, pero no borra de forma definitiva.
- El Administrador puede todo, con registro.
- Los **permisos opcionales** se consultan en cada operación, junto con su alcance por zona y su vencimiento.
- La **auditoría solo admite agregar**: nadie la modifica ni la borra.
- **Ninguna llave maestra viaja dentro de la app del teléfono.**

## 8.5 Fotos y documentos

- Almacenamiento **privado**: no existen enlaces públicos. Cuando alguien necesita ver una foto, la app pide un enlace **temporal** (de 5 a 10 minutos) y la base verifica sus permisos.
- Nombres de archivo aleatorios, miniaturas para cargar rápido y carpetas por vivienda.
- Las autorizaciones firmadas y otros documentos sensibles van a una carpeta restringida.
- Las exportaciones se guardan 24 horas y se borran.

## 8.6 Tiempo real

Se transmiten en vivo: cambios en los puntos del mapa, tareas y anuncios nuevos, alertas SOS, ubicación del equipo durante la jornada y avance de metas. Las estadísticas pesadas se recalculan cada pocos minutos, no en cada toque.

## 8.7 Sincronización sin conexión

- Cada registro nace en el teléfono con un **identificador único**, para que un reenvío no cree duplicados.
- Se guarda en una **base local cifrada** y entra a una **cola de envío** con reintentos automáticos.
- Se envían primero los datos y después las fotos; si una foto falla, el registro no se pierde.
- Los conflictos se resuelven como en la sección 5.13.
- **Reglas agregadas en 1.1:**
  - Cada registro de la cola lleva el **usuario que lo creó** y nunca se envía con otra sesión.
  - Lo que se capturó sin conexión y luego no cumple una regla (por ejemplo, la distancia de 50 m) **se acepta y se marca para revisión**, no se rechaza.
  - La descarga desde el servidor relee con un **margen de 2 minutos** para no perder cambios confirmados tarde.
  - Cada teléfono descarga **solo sus zonas asignadas**.
- **Estado actual:** la base local todavía no está cifrada (24.3, C1). Es requisito para el piloto con datos reales.

## 8.8 Cifrado y datos sensibles

- Toda comunicación va por conexión segura y los datos se guardan cifrados en disco.
- Además, **cifrado por campo** para cédula, teléfono, correo y simpatía. Para buscar por cédula sin descifrar, se guarda una huella irreversible del número.
- Las llaves de cifrado se guardan fuera de la base de datos y se rotan.
- Las vistas enmascaradas entregan únicamente lo que cada rol puede ver.

## 8.9 Auditoría

Se registra: ingresos y salidas; creación, edición y eliminación; ver datos completos o simpatía; exportar e importar; cambios de permisos; envío de mensajes; SOS; uso de "Ver como"; cambios de configuración. Cada registro dice **quién, qué, sobre qué registro, cuándo, desde qué dispositivo y con qué ubicación aproximada, y el antes y el después**. Se guarda una copia diaria fuera de la base.

La app genera **alertas** por descargas masivas, muchos accesos a datos completos en poco tiempo y accesos fuera de horario.

## 8.10 Respaldos y recuperación

- Respaldo **diario**. Como el plan gratuito no lo incluye, lo hace un script en el computador del Administrador, cifrado y nunca subido a GitHub (actualización 1.1).
- Copia **semanal cifrada** guardada aparte por el Administrador.
- **Prueba de restauración cada mes.**
- Plan escrito de recuperación (quién hace qué), con la meta de restaurar el servicio en menos de 4 horas.
- Procedimiento de **recuperación de emergencia del Administrador** (códigos de recuperación guardados fuera de línea), porque es una sola persona.

## 8.11 Tamaño y costos

- **Ejemplo para dimensionar:** 3.000 viviendas con 3 fotos de 300 KB son unos 2,7 GB; con visitas repetidas, entre 5 y 8 GB. La base de datos de texto es pequeña; lo que pesa son las fotos.
- **Decisión 1.1: costo recurrente cero.** Se usa el **plan gratuito** (500 MB de base, 1 GB de archivos, 5 GB más 5 GB de tráfico al mes, sin respaldos automáticos y con pausa tras 7 días sin actividad). Las fotos se reducen a unos 100 KB, los respaldos los hace el Administrador y las descargas pesadas van por GitHub Releases. Detalle en `docs/Analisis-Costo-Cero.md`.
- Alertas de uso al 80 % del almacenamiento y del plan.
- **Ubicación del servidor:** la región más cercana a Colombia que ofrezca el proveedor. Como los datos quedarían alojados **fuera de Colombia**, esto debe decirse en el aviso de privacidad y revisarse con el abogado (sección 23).

## 8.12 Ambientes

- **Pruebas y desarrollo:** solo datos falsos. Nunca se copian datos reales a este ambiente.
- **Modo práctica de la app:** usa datos de ejemplo separados.
- **Producción:** datos reales, acceso restringido, cambios probados primero en pruebas.

## 8.13 Integraciones externas posibles

Proveedor de mapas (por definir), envío de SMS, WhatsApp y correo, notificaciones al teléfono, almacenamiento de respaldos, geocodificación de direcciones, enlace (solo enlace) al sitio de la Registraduría y exportación hacia los formatos de rendición de cuentas del CNE.

---

# 9. Estadísticas y paneles

## 9.1 Principios

- **Números que ayudan a decidir.** Nada de cifras de adorno.
- **Agregado por defecto.** Si un grupo tiene **menos de 5** personas o viviendas, se muestra "menos de 5" para no identificar a nadie en grupos pequeños.
- **Solo cuentan los registros completos** (verdes). Los incompletos se muestran aparte.
- Cada cifra tiene **definición escrita** (9.7).
- Se filtra por zona, fechas y tema.
- Todos los paneles funcionan con los datos del teléfono y muestran "actualizado hace…" cuando no hay conexión.

## 9.2 Panel personal del colaborador (pantalla "Inicio") [BASE]

- Saludo con su nombre.
- Viviendas visitadas hoy, esta semana y en total.
- Sus pendientes: borradores incompletos, seguimientos vencidos y tareas.
- Avance de sus zonas (anillos).
- Su ruta del día.
- Próximos eventos y anuncios nuevos.
- Su semáforo de calidad.
- Metas personales (opcionales).
- Botón **Iniciar jornada**.

## 9.3 Panel de campaña (para todos) [BASE]

- Totales: viviendas registradas y visitadas, **cobertura** en porcentaje, personas con autorización, hogares con al menos un contacto, colaboradores activos hoy.
- Visitas por día (barras de los últimos 30 días).
- Cobertura por zona (barras ordenadas de menor a mayor avance).
- **Necesidades más mencionadas** (las 10 principales por tema) y temas de interés.
- Voluntarios inscritos y eventos próximos.
- Barra de avance hacia la meta general.

No muestra información individual ni simpatía.

## 9.4 Estadísticas avanzadas [O-03] y mapas de calor [O-04]

- Rendimiento por colaborador: visitas completas, calidad, tiempos.
- Comparativo entre zonas y tendencias semana a semana.
- **Embudo** de la campaña (9.7).
- Distribución por rangos de edad; electores estimados por zona; hogares con futuros primeros votantes; hogares con jefatura femenina.
- **Mapas de calor:** necesidades por tema, simpatía agregada por zona o cuadrícula (**nunca por casa**) y densidad de visitas.

## 9.5 Panel del Director [DIRECTOR]

Todo lo anterior más:

- **Semáforo por zona** (verde, amarillo, rojo).
- Alertas de calidad pendientes y permisos próximos a vencer.
- Solicitudes de ingreso por aprobar.
- Seguimiento de metas y calendario.
- Resumen de finanzas y lista de verificación de cumplimiento.
- Solicitudes de titulares con sus plazos e incidentes abiertos.
- Quién está en jornada ahora.
- **Informe de una página para el candidato** (cinco cifras clave y tres alertas).

## 9.6 Panel del Administrador [ADMIN]

- Salud del sistema: usuarios activos, errores, tiempos de respuesta, sincronizaciones fallidas.
- Uso de almacenamiento y costos.
- Alertas de seguridad: intentos fallidos, descargas masivas, accesos raros.
- Respaldos: el último y su resultado.
- Versiones de la app instaladas.
- Solicitudes de titulares pendientes y dispositivos reportados como perdidos.

## 9.7 Indicadores y su definición

| Indicador | Cómo se calcula |
|---|---|
| Viviendas conocidas | Marcadas en reconocimiento más registradas |
| Cobertura de visita | Viviendas con al menos una visita completa ÷ viviendas conocidas |
| Tasa de contacto | Visitas con conversación ÷ visitas totales |
| Hogares con contacto autorizado | Hogares con al menos una persona con autorización vigente ÷ hogares visitados |
| Personas por hogar | Promedio de personas por hogar visitado |
| Electores por hogar | Promedio de mayores de 18 estimados por hogar |
| Primeros votantes estimados | Suma de jóvenes que cumplen 18 antes de la elección |
| Seguimiento cumplido | Seguimientos hechos a tiempo ÷ seguimientos programados |
| Calidad | Registros verdes ÷ registros totales |
| Interés en recibir información | Personas con interés ÷ personas contactadas |
| Necesidades por tema | Conteo y porcentaje por categoría |
| Embudo | Viviendas conocidas → visitadas → con contacto → con persona autorizada → interesada o voluntaria |

## 9.8 Metas y alertas

El Director fija **metas por zona y fecha** (por ejemplo, visitar el 80 % de la vereda X antes del 30 de noviembre). El semáforo compara el ritmo real con el necesario:

- **Verde:** ritmo igual o mayor al necesario.
- **Amarillo:** entre 70 % y 99 %.
- **Rojo:** menos de 70 %.

Ejemplos de alertas: "La vereda X no tiene visitas hace 14 días", "Hay 12 seguimientos vencidos", "El colaborador Y tiene 5 registros en rojo". Llegan al Director y, cuando corresponde, al colaborador involucrado.

## 9.9 Análisis histórico electoral y meta de votos [FASE 4]

- Se cargan los **resultados públicos** de elecciones locales anteriores por puesto y mesa, y la participación.
- La alcaldía se define por **mayoría simple**: gana quien más votos obtiene, sin segunda vuelta.
- La **meta de votos** se calcula con la votación del ganador anterior, la participación y el crecimiento del censo, más un margen que define el Director.
- Se muestra **mapa por puesto** con la meta de cada uno.
- La app **no predice resultados**: ayuda a priorizar dónde trabajar. Lo que sí muestra es el conteo de personas que declararon interés, que es información de trabajo y no una proyección.

## 9.10 Segmentos

Un **segmento** es un filtro guardado (por zona, tema, rango de edad, canal autorizado). Sirve para invitar a eventos, asignar visitas o enviar mensajes a quienes autorizaron. **No se crean segmentos por simpatía individual ni por datos sensibles para enviar mensajes.** Los criterios de cada segmento quedan escritos y disponibles si una persona pregunta por qué recibió un mensaje.

## 9.11 Informes automáticos

- **Diario:** resumen para el Director a las 7 p. m.
- **Semanal:** cada lunes a las 7 a. m., con avance, calidad, alertas y metas.
- **Mensual:** balance.
- **Bajo demanda:** informe especial por zona, tema o periodo.
- Formatos: PDF y hoja de cálculo.
- Los informes con datos personales requieren permiso, llevan marca de agua y quedan en la auditoría.
---

# 10. Gestión del equipo de colaboradores

## 10.1 Perfil del colaborador

Cada colaborador tiene una ficha (P-36) con:

- Nombre, foto, celular, correo y zona o zonas asignadas.
- Fecha de ingreso y estado (pendiente, activo, suspendido, dado de baja).
- Tipo de vinculación: voluntario o contratado.
- Permisos opcionales encendidos, con quién los dio y cuándo vencen.
- Capacitación: cursos, puntajes y certificados.
- Acuerdos aceptados, con versión y fecha.
- Declaración de servidor público o contratista del Estado.
- Contacto de emergencia (lo ven solo el Director y el Administrador).
- Resumen de actividad: visitas, calidad, seguimientos cumplidos.
- Observaciones privadas del Director.

## 10.2 Asignaciones y turnos

- El Director asigna una o varias **zonas** a un colaborador o a un grupo.
- **Grupos de trabajo:** etiquetas para agrupar colaboradores (por zona o actividad). No son roles ni dan permisos.
- **Calendario de jornadas:** fecha, hora, zona y quiénes van. El colaborador confirma y recibe un recordatorio la noche anterior.
- Cobertura mínima por zona y **cambio de turno entre compañeros** con aprobación del Director.

## 10.3 Tareas

- **Tipos:** visitar, hacer seguimiento, llamar, verificar un registro, repartir material, apoyar un evento, instalar o retirar propaganda, capacitar, otra (C-13).
- **Campos:** título, descripción, tipo, responsables, fecha límite, prioridad (baja, normal, alta), vínculo (vivienda, persona, evento o zona), estado (pendiente, en curso, hecha, bloqueada, cancelada), evidencias (foto) y comentarios.
- **Flujo:** crear → asignar → notificar → hacer → marcar como hecha con nota o foto → verificar (opcional).
- **Vistas:** lista, mapa (las tareas aparecen como puntos) y calendario.
- **Tareas automáticas:** seguimientos creados desde las visitas, verificaciones sorteadas, revisión mensual de permisos y retiro de propaganda.

## 10.4 Eventos y agenda

**Crear un evento (O-10 o Director):** título, tipo (C-12), descripción, inicio y fin, lugar (punto en el mapa y dirección), asistencia esperada, responsable, equipo asignado, materiales, gastos (enlace a finanzas) y público (solo equipo, invitados o abierto con inscripción).

- **Invitaciones y confirmación:** a colaboradores por notificación; a ciudadanos solo si autorizaron contacto.
- **Asistencia:** código QR de llegada y lista. De los ciudadanos se anota nombre y contacto **solo con su autorización**. Nunca datos de menores.
- **Durante el evento:** fotos, notas y anuncios.
- **Después:** resultados (asistentes, temas, compromisos, necesidades nuevas), gastos y tareas de seguimiento.
- **Recordatorios** 24 horas y 2 horas antes, y botón **"Agregar a mi calendario"**.
- **Recordatorio legal fijo** al registrar gastos de comida u obsequios: "No se entregan regalos ni dádivas para obtener votos."

## 10.5 Anuncios y comunicación interna

- **Anuncios** (Director u O-11): título, texto, prioridad (normal, importante, urgente), destinatarios (todos, una zona o un grupo), adjuntos, confirmación de lectura, fijado y fecha de caducidad.
- **Notificaciones:** por tipo, con **horario silencioso** de 9 p. m. a 6 a. m. salvo las urgentes, y resumen diario.
- **Mensajes internos** uno a uno y por zona [FASE 3]: con aviso de que no se deben compartir datos de ciudadanos; quedan guardados para auditoría y el Director puede silenciar. Mientras tanto, si el equipo usa WhatsApp para coordinarse, la app recuerda **no pasar datos de personas por esos chats**.
- **Directorio del equipo:** nombre, foto, zona y estado en línea. El teléfono lo ven solo el Director y el Administrador; los demás usan "Escribir por la app".

## 10.6 Capacitación

**Curso de ingreso (obligatorio),** con lecciones cortas de 3 a 5 minutos:

1. "Pijao nos une": de qué se trata la campaña.
2. Cómo usar la app, con el modo práctica.
3. Cómo hacer una visita respetuosa.
4. Protección de datos: qué sí y qué no.
5. Normas electorales básicas: qué está prohibido (compra de votos, constreñimiento, trashumancia, propaganda fuera de tiempo).
6. Seguridad en terreno.
7. Cómo responder preguntas difíciles y rumores.
8. Evaluación de 15 preguntas, mínimo 80 %; se puede repetir.

Al aprobar, se entrega un **certificado** con el logo y un código. Vigencia: 6 meses, con refrescos.

**Cursos adicionales:** testigos electorales (Día de elecciones), uso avanzado de la app, atención de solicitudes ciudadanas y comunicaciones.

**Modo práctica (P-47):** mapa y datos de ejemplo para simular visitas. No afecta las estadísticas ni toca datos reales.

## 10.7 Código de conducta, acuerdos y carnet

**El código de conducta incluye:** respeto a toda persona; nada de compra de votos ni ofrecimiento de favores; no presionar ni amenazar; no desinformar ni atacar la vida privada; privacidad de los datos; no compartir capturas ni listas; no usar datos para fines propios; no fotografiar menores; identificarse siempre; cumplir las normas electorales; denunciar irregularidades; no portar armas ni consumir alcohol durante la jornada.

**Consecuencias:** advertencia, suspensión, baja y, en casos graves, reporte a las autoridades.

**Aceptación:** al ingresar y cada 6 meses.

**Carnet digital:** dentro de la app, con foto, nombre y un **código QR verificable**. Cualquier ciudadano puede escanearlo y ver "Esta persona pertenece al equipo de Pijao Nos Une, vigente hasta…". Protege a las familias de impostores y da confianza.

## 10.8 Reconocimiento y desempeño

- **Reconocimientos sin dinero:** insignias por constancia, calidad, cobertura de zona y seguimientos cumplidos.
- **Ranking opcional:** el Director decide si se muestra. Mide **calidad y cumplimiento**, no solo cantidad, para no incentivar el fraude.
- **Retroalimentación:** comentarios privados del Director y reunión semanal de balance (evento).
- **Pagos:** si hay colaboradores remunerados, se registran como gasto de campaña con soporte (sección 14). **Evitar pagar por cantidad de registros o contactos:** incentiva el fraude y puede generar riesgos legales; es preferible pagar por jornada o tarea verificada.

## 10.9 Salida del equipo

Lista de cierre: devolución de materiales, cierre de sesiones, reasignación de zonas y tareas, recordatorio de confidencialidad, entrevista breve (opcional) y certificado de participación (opcional).

---

# 11. Escucha ciudadana, necesidades y programa de gobierno

## 11.1 La idea

Convertir lo que dice la gente en un **programa de gobierno con evidencia**. En Colombia, quien aspira a la alcaldía presenta su programa de gobierno al inscribirse y el elegido responde por él (es lo que se conoce como voto programático; ver sección 23). La app hace que cada propuesta tenga detrás hogares, zonas y datos, y no solo ideas.

## 11.2 De dónde vienen las necesidades

- Visitas a los hogares (paso 7 del registro).
- Eventos y reuniones.
- Encuestas internas.
- El canal público **"Cuéntale a Pijao"** (11.4).
- Reuniones con líderes y organizaciones.
- Reportes de problemas con foto en el mapa.
- Llamadas o mensajes que un colaborador registre.

## 11.3 Temas y ejes del programa (C-08)

Inspirados en los símbolos del logo y en las competencias típicas de un municipio. A confirmar con el candidato y el equipo técnico.

1. **Educación y conocimiento:** acceso y calidad, transporte y restaurante escolar, conectividad educativa, educación técnica y superior, bibliotecas.
2. **Deporte y juventud:** escenarios deportivos, escuelas de formación, oportunidades para jóvenes, emprendimiento juvenil.
3. **Campo y café:** precios, asistencia técnica, comercialización, mercados campesinos, seguridad alimentaria, relevo generacional, insumos.
4. **Vivienda y entorno:** mejoramiento, titulación, servicios domiciliarios, espacio público.
5. **Bienestar animal:** vacunación, esterilización, maltrato, fauna.
6. **Vías, movilidad y conectividad:** vías urbanas y rurales, transporte veredal, señal celular, internet.
7. **Agua y medio ambiente:** acueducto, saneamiento, residuos, gestión del riesgo, protección de nacimientos, ríos y bosques.
8. **Turismo y cultura:** promoción turística, turismo de naturaleza y aviturismo, formación artística, patrimonio, festivales, emprendimientos culturales.
9. **Salud y bienestar:** acceso a servicios, puesto de salud, primera infancia, salud mental.
10. **Seguridad y convivencia:** seguridad, convivencia, prevención de violencias.
11. **Empleo y emprendimiento:** empleo local, formación para el trabajo, apoyo a pequeños negocios.
12. **Atención a poblaciones específicas:** adultos mayores, mujeres, jóvenes, personas con discapacidad, víctimas.
13. **Gobierno cercano y transparente:** atención al ciudadano, trámites, rendición de cuentas, participación.
14. **Otro.**

## 11.4 "Cuéntale a Pijao": canal ciudadano público [FASE 3]

Una página web sencilla, a la que se llega por **código QR del volante**, un enlace o desde las redes. No requiere cuenta.

- **Campos:** nombre (opcional), forma de contacto (opcional), barrio o vereda (selector), tema, mensaje, ubicación en el mapa (opcional), foto (opcional) y casilla de autorización de datos.
- **No pide** cédula ni datos sensibles.
- Se puede enviar de forma **anónima**; en ese caso no se puede devolver respuesta.
- Al enviar, da un **número de caso**.
- Tiene protección contra mensajes basura.
- Lo recibido llega a Solicitudes ciudadanas (P-26).

## 11.5 Recorrido de una necesidad

1. **Recibida** (de cualquier origen).
2. **Clasificada:** tema, eje, ubicación, individual o colectiva.
3. **Agrupada** con otras similares.
4. **Evaluada:** competencia municipal, viabilidad, costo estimado.
5. **Decisión:** incluida en el programa, derivada a otra entidad o no viable (con explicación).
6. **Comunicada** a la persona o comunidad, si lo autorizó.
7. **Cerrada.**

Lo gestionan el Director o quien tenga O-19. Metas internas: clasificar en 7 días y dar respuesta en 30.

## 11.6 Banco de propuestas

Cada propuesta guarda:

- Título, eje y descripción.
- Problema que resuelve.
- **Evidencia:** cuántos hogares la mencionaron, en qué zonas, con mapa.
- Población beneficiada estimada.
- **Competencia** con semáforo: **verde** (competencia clara del municipio), **amarillo** (compartida; hay que gestionar ante otro nivel) y **rojo** (fuera de la competencia municipal; se plantea como gestión, no como promesa).
- Costo estimado y fuente posible de recursos.
- Plazo dentro del periodo 2028–2031 (corto, mediano o largo).
- Indicador de resultado y dependencia responsable.
- Estado (borrador, en revisión, aprobada, descartada) y versión.

**Alerta de promesa irreal:** si una propuesta está en rojo de competencia o supera la capacidad estimada, la app lo advierte antes de que llegue al programa.

La lista de competencias municipales (Constitución y leyes de régimen municipal y de recursos) la define el equipo técnico con el abogado y se carga en la app.

## 11.7 Programa de gobierno versionado

- Documento vivo con **versiones** (0.1, 0.2…). La versión **1.0 es la que se registra al inscribir la candidatura.**
- La app genera el documento (PDF) con ejes, propuestas, metas e indicadores, y una **versión pública resumida** para el equipo y la ciudadanía.
- **Control de cambios:** quién cambió qué y cuándo.
- **Mapa del programa:** cada propuesta se ve en el mapa con las zonas donde se concentran las necesidades.
- Relación con el futuro **Plan de Desarrollo Municipal 2028–2031**, que el alcalde elegido presenta al Concejo en sus primeros meses.

## 11.8 Historias que nos unen

- Cada persona puede dejar una historia o una frase sobre lo que más valora de Pijao o lo que la une con su comunidad.
- **Autorización aparte** para uso público, con nombre o de forma anónima; foto opcional con consentimiento y nunca de niños.
- Estados: autorizada, publicada, retirada. Si la persona revoca, se retira.
- Sirven para contenidos de comunicación y para el relato de "Pijao nos une".

## 11.9 Devolución a la comunidad

- **"Lo que escuchamos":** informes por vereda o barrio y por tema, **agregados y sin datos personales**, para compartir en reuniones. Ejemplo: "En la vereda X, 18 hogares mencionaron el estado de la vía; esto propone el programa."
- Se publican después de la aprobación del Director.
- Mensaje de agradecimiento a quienes autorizaron contacto.

---

# 12. Voluntariado, líderes y organizaciones

## 12.1 Voluntarios

- **Alta:** por el enlace o QR **"Quiero ser parte"** (formulario público) o desde una visita.
- **Datos:** nombre, celular, correo (opcional), barrio o vereda, habilidades (diseño, fotografía, video, redes, escritura, hablar en público, transporte, logística, cocina para eventos, tecnología, derecho, contabilidad, trabajo social, deporte, arte, otras), disponibilidad, experiencia, confirmación de ser mayor de 18 años, autorización de datos y aceptación del código de conducta.
- **Menores de 18:** no se registran en la app. Si quieren aportar, se hace por un canal aparte, con autorización de sus padres, sin acceso a datos y con asesoría del abogado.
- **Servidores públicos o contratistas del Estado:** se les pregunta y se alerta al Director.
- **Estados:** interesado → contactado → en capacitación → activo → inactivo → retirado.
- Un voluntario puede **convertirse en colaborador** con cuenta, tras aprobación y curso.
- **Mapa de voluntarios por zona** (agregado) y capacidad disponible.
- **Reconocimiento:** carta o certificado de voluntariado.

## 12.2 Anfitriones de reunión ("Casa amiga")

Familias que ofrecen su casa o su patio para una reunión pequeña ("tertulia en casa").

- Se registran con autorización, capacidad y fechas preferidas.
- La dirección de un anfitrión solo la ven el equipo y los invitados.
- Recomendaciones: sin regalos; refrigerio modesto y con gasto registrado.

## 12.3 Líderes y organizaciones: mapa social [FASE 3]

**Qué se registra:** organizaciones como entes y sus voceros **en su calidad pública**.

- Tipos: juntas de acción comunal por barrio y vereda, acueductos veredales, asociaciones de caficultores y cooperativas, asociaciones de comerciantes y de turismo, clubes deportivos, grupos culturales y artísticos, colectivos ambientales, asociaciones de mujeres y de jóvenes, asociaciones de padres, instituciones educativas, transportadores y entidades públicas locales.
- **Datos:** nombre, tipo, zona, vocero (cargo, nombre y contacto, con su autorización), historial de reuniones, temas que plantean, compromisos programáticos acordados, próximos pasos.
- **Nivel de relacionamiento:** inicial, en diálogo o aliado. **No se clasifica a personas como "opositores".**
- **Límite legal:** la pertenencia individual de ciudadanos a organizaciones sociales **no se registra**, porque la ley la considera dato sensible.
- **Mapa social:** capa del mapa con sedes y sitios de reunión.
- **Reuniones:** agenda, recordatorios y actas simples (fecha, asistentes con autorización, temas, acuerdos).

## 12.4 Registro de compromisos programáticos

Lista de lo que la campaña **dice en público** a comunidades u organizaciones: texto, ante quién, fecha, propuesta del banco a la que corresponde, competencia y estado. Sirve para que lo que se diga en la calle sea **coherente con el programa y viable**. La app alerta si un compromiso no tiene propuesta asociada. **Nunca se registran compromisos personales ni beneficios individuales.**

---

# 13. Comunicaciones y propaganda

## 13.1 Principios

- **Solo con consentimiento.** La SIC, en su Circular Externa 002 de 2026, prohíbe tratar datos sin autorización previa, expresa e informada, incluir a personas en grupos de mensajería, listas o envíos masivos sin su consentimiento y pide transparencia sobre los criterios de segmentación, las fuentes de los datos y el uso de inteligencia artificial. El abogado debe leer el texto oficial (sección 23).
- Identificarse siempre (campaña y candidato) y ofrecer cómo dejar de recibir mensajes.
- Sin ataques personales ni desinformación.
- Coherencia con el programa.
- Respeto a las normas de propaganda electoral.

## 13.2 Kit de campaña y guía de marca

Biblioteca (P-24) con: logos (emblema, tipográfico, una línea, un color), paleta, tipografía, plantillas de piezas (publicación, historia, volante, afiche, pendón, calendario), reglas de uso (tamaños mínimos, espacios, qué no hacer), fotos oficiales, banco de fotos de Pijao con permisos, tono de voz y etiqueta #PijaoNosUne. Descargable para trabajar sin conexión.

## 13.3 Mensajes clave, guiones y preguntas frecuentes

- **Mensajes clave** por eje (dos o tres frases cada uno).
- **Guion de visita** en tarjetas: apertura, escucha y cierre.
- **Qué decir y qué no decir.**
- **Preguntas frecuentes** con respuestas aprobadas por el Director: ¿quién es Jaime González?, ¿qué propone?, ¿qué pasa con mis datos?, ¿cómo pido que me borren?, ¿es verdad que…?
- **Respuestas a críticas frecuentes,** en tono respetuoso y con datos.
- Cada pieza tiene fecha y versión. Modo "tarjeta" para consultar rápido con una mano.

## 13.4 Envío de mensajes (SMS, WhatsApp, correo) [FASE 3 · O-12]

- Plantillas aprobadas por el Director.
- **Destinatarios:** solo personas con autorización vigente **para ese canal**, elegidas por segmento (9.10).
- **Previsualización** con el número de destinatarios y envío de prueba.
- **Horario permitido:** de 8 a. m. a 8 p. m. (ajustable) y límite diario.
- **Identificación obligatoria** al inicio y **opción de baja** al final ("Responda BAJA para no recibir más").
- **Registro:** quién envió, a quién, qué plantilla y cuándo; resultados (entregado, respondió, baja).
- Las bajas se reflejan al instante en la ficha de la persona y los envíos respetan siempre "No contactar".
- **No se usan grupos de WhatsApp creados sin consentimiento.** Alternativa: un canal de difusión al que la gente se une por decisión propia.
- Antes de implementarlo, revisar las políticas de la plataforma de mensajería sobre contenido político.
- Si se usa inteligencia artificial para redactar o segmentar, se registra y se informa si alguien lo pregunta.

## 13.5 Control de propaganda electoral [FASE 3 · O-17]

**Inventario:** tipo (C-15), cantidad, tamaño, pieza (código del diseño), ubicación en el mapa (vallas, pendones), responsable, fechas de instalación y retiro, permiso (cuando se exija), costo (enlace a finanzas), fotos de instalación y retiro y estado (planeada, instalada, retirada, dañada).

**Reglas como recordatorios:** la ley limita cuándo, dónde y cómo se hace propaganda electoral (ventanas de tiempo, restricciones en espacio público y en perifoneo). El abogado define las reglas vigentes para Pijao y la app muestra alertas como "Faltan 10 días para que se permita propaganda en espacio público", "Esta valla supera el máximo permitido" o "Hay propaganda por retirar después de las elecciones".

**Perifoneo:** horarios y recorridos registrados.

**Publicidad digital:** registro de pautas pagadas (plataforma, fechas y monto) para la rendición de cuentas.

**Retiro posterior:** tareas automáticas para retirar la propaganda dentro del plazo que señale la autoridad.

## 13.6 Redes sociales y reputación [FASE 3]

- **Calendario de contenidos** semanal: fecha, canal, pieza, mensaje clave, responsable y estado (idea, en diseño, aprobada, publicada).
- **Aprobación:** nada se publica sin visto bueno del Director o de quien él designe.
- **Registro de menciones y comentarios relevantes** (manual): fecha, canal, resumen, enlace y tono.
- **Rumores y desinformación:** cualquier colaborador puede reportarlos. Protocolo: verificar → documentar con captura y fecha → responder con datos y sin atacar → archivar. Con las respuestas verificadas se arma un **"muro de verdad"** con rumores frecuentes.
---

# 14. Finanzas y cumplimiento electoral

## 14.1 Por qué existe este módulo

Las campañas llevan contabilidad y rinden cuentas al Consejo Nacional Electoral (CNE) en el aplicativo oficial **Cuentas Claras**. Existen **topes de gastos** y **fuentes de financiación prohibidas**, y violarlos puede traer sanciones e incluso consecuencias penales. Este módulo ayuda a registrar a tiempo y con soporte. **No reemplaza** al gerente de campaña, al contador ni a Cuentas Claras.

## 14.2 "Director de campaña" y "gerente de campaña"

- En la app, **Director de Campaña** es el rol operativo principal (Jaime González).
- La ley habla del **gerente de campaña**, la persona designada por la candidatura que responde por la contabilidad y la rendición de cuentas.
- Recomendación: que el gerente sea una persona de confianza con formación contable. En la app puede ser un colaborador con los permisos O-15 y O-16, sin crear un rol nuevo. Decisión pendiente en la sección 23.

## 14.3 Ingresos (aportes)

**Campos:** fecha; tipo (dinero o en especie); monto o valor estimado; aportante (nombre completo, documento y contacto); relación (candidato, familiar, simpatizante, partido); medio de recaudo (transferencia, consignación, cheque; efectivo solo si la norma lo permite); soporte (comprobante o recibo con foto); destino; observaciones; estado (registrado, verificado, reportado al CNE).

**Validaciones**

- **No se aceptan aportes anónimos.**
- Alerta si un aporte supera el límite por persona configurado.
- Los aportes de empresas (personas jurídicas) están restringidos por la jurisprudencia constitucional; el abogado confirma la regla vigente y la app la aplica como validación.
- El abogado entrega la lista de fuentes permitidas y prohibidas; la app la convierte en validaciones y en una **declaración del aportante** sobre la licitud de los recursos.
- Los topes y límites los carga el Administrador a partir de la resolución del CNE vigente para esta elección y este municipio.

## 14.4 Gastos

**Campos:** fecha; categoría (C-14); descripción; proveedor (nombre, NIT o cédula, contacto); valor; forma de pago; soporte (factura, cuenta de cobro o recibo, con foto); responsable; quién lo aprobó; vínculo (evento, propaganda o actividad); estado (registrado, aprobado, pagado, reportado).

**Reglas**

- Todo gasto lleva soporte. Sin soporte queda como "incompleto".
- Los gastos se pagan con los recursos de la campaña, por la vía bancaria que indique el gerente y el abogado (por ejemplo, la cuenta única de campaña).
- **Ninguna salida de dinero a personas por "gestión de votos".** Las categorías son una lista cerrada.
- Pagos a personas naturales: cuenta de cobro con soportes de seguridad social cuando aplique (a confirmar con el contador).
- En gastos de comida u obsequios, recordatorio legal fijo.

## 14.5 Presupuesto y topes

- Presupuesto por categoría y por periodo; ejecución contra presupuesto.
- **Tope de gastos** de la candidatura, fijado por el CNE.
- **Semáforo y alertas** al 70 %, 85 %, 95 % y 100 % del tope.
- Al llegar al 100 %, **bloqueo suave**: exige confirmación del Director y del gerente, y deja registro.
- Proyección de gasto semanal y gráfica de flujo.

## 14.6 Reportes y Cuentas Claras

- La rendición se hace en Cuentas Claras. Informes recientes señalan que en 2026 se pidió reportar ingresos y gastos en plazos cortos, de hasta siete días; **confirmar el plazo vigente para 2027**.
- La app genera **exportaciones ordenadas** (hojas de cálculo con los campos del formato oficial) para cargar o digitar sin errores, y una **lista de pendientes** ("Hay 4 gastos sin soporte", "2 aportes sin verificar").
- **Libros** de ingresos y de gastos, y conciliación con los extractos bancarios (carga manual de movimientos).
- Archivo de soportes durante el plazo de conservación que indiquen el abogado y el contador.

## 14.7 Calendario legal y lista de verificación

Hitos con fechas configurables: apertura y cierre de la inscripción de cédulas, inscripción de la candidatura, inicio de propaganda (espacio público y medios), reportes financieros, inscripción de testigos, jornada electoral, retiro de propaganda y rendición final. Cada hito tiene responsable, estado, recordatorios (30, 7 y 1 día antes) y documentos asociados. **Las fechas reales las carga el Administrador desde el calendario oficial de la Registraduría.**

## 14.8 Prevención de delitos y riesgos electorales ("Escudo de integridad")

**Biblioteca en lenguaje sencillo** de lo que está prohibido (descripciones generales; el abogado precisa):

- **Compra de votos (corrupción al sufragante):** ofrecer o dar dinero, regalos, empleo o favores a cambio del voto.
- **Constreñimiento al sufragante:** presionar o amenazar para que alguien vote o no vote.
- **Fraude en inscripción de cédulas ("trashumancia"):** inscribir la cédula en un municipio donde la persona no vive.
- **Fraude al sufragante y voto fraudulento.**
- **Financiación con fuentes prohibidas y violación de topes.**
- **Propaganda fuera de tiempo o lugar, uso de recursos públicos en la campaña y participación en política de servidores públicos.**

**Alertas automáticas**

- **Residencia dudosa:** si una persona figura como "vota en Pijao" pero lleva menos de un año viviendo allí o vive actualmente en otra ciudad, la ficha muestra un recordatorio: "La inscripción de cédula solo corresponde donde la persona vive realmente." La app nunca promueve inscripciones.
- **Notas sospechosas:** si una nota contiene palabras como "plata", "mercado", "regalo", "pagar" o "favor", pasa a revisión del Director.
- **Incidentes reportados** de ofrecimientos hechos por terceros.

**Canal de incidentes (P-34):** tipos C-17, con evidencia, confidencial. El Director decide con el abogado si se denuncia ante la autoridad competente.

**Protocolo:** documentar → proteger a la persona → asesoría legal → denuncia cuando proceda.

## 14.9 Inhabilidades e incompatibilidades

Lista de verificación para el abogado antes de inscribir la candidatura: cargos públicos recientes, contratos con el Estado, parentescos con funcionarios con autoridad en el municipio y residencia. **La app solo guarda el estado de cada verificación** (pendiente, en revisión, verificada) y el documento de soporte que el abogado decida archivar. No almacena datos judiciales ni sensibles del candidato.

## 14.10 Módulo de apoyos ciudadanos (firmas) [CONDICIONAL]

Solo si la candidatura se inscribe por **grupo significativo de ciudadanos**: formulario de apoyo (nombre, cédula y firma), detección de duplicados, verificación de residencia, conteo contra la meta y formato conforme a lo que exija la Registraduría. Los datos de apoyos se usan **solo para ese fin**.

---

# 15. Día de elecciones y escrutinios [FASE 5]

## 15.1 Objetivo

Vigilar que el voto se respete y que los resultados se conozcan bien. **No se trata de controlar votantes.**

## 15.2 Antes del día

- **Testigos electorales:** nombre, cédula, celular, puesto y mesa, estado de la acreditación (solicitada o aprobada), capacitación y suplente. La campaña tramita la acreditación ante la autoridad electoral; el plazo máximo de inscripción en 2023 fue dos días antes de la elección (confirmar para 2027).
- **Mapa de puestos con cobertura:** verde (mesa cubierta), amarillo (sin suplente), rojo (sin testigo).
- **Capacitación obligatoria del testigo:** funciones, derechos, formularios (el de lista de votantes y el acta de escrutinio de jurados, E-14), reclamaciones, qué no hacer y seguridad.
- **Logística:** kits (credencial, formatos, cargador, contactos), transporte y alimentación de testigos con gasto registrado, plan de comunicaciones del día.
- **Simulacros** una semana antes y el día anterior, con datos de práctica.
- **Puestos de votación:** lista oficial con dirección, mesas y votantes habilitados.

## 15.3 Durante la jornada

- **Apertura de mesa:** el testigo reporta la hora de instalación, los jurados y cualquier anomalía (foto opcional).
- **Incidentes en tiempo real:** tipo (C-17), mesa, hora, descripción y foto o video corto. Alertan al Director y al equipo jurídico. Semáforo por puesto.
- **Participación agregada:** conteo de votantes por mesa según lo que el testigo observa. **La app no registra quién votó ni por quién;** solo cifras por mesa.
- **Información a la ciudadanía:** quien tenga O-12 puede enviar un mensaje informativo ("hoy es la jornada; consulte su puesto en el sitio oficial") **solo a quienes autorizaron ese canal**, sin presión.
- **Cierre de mesa:** el testigo fotografía el acta de escrutinio de jurados (E-14) y registra los votos de la mesa. La app **valida que la suma cuadre** (candidaturas, voto en blanco, nulos y no marcados contra el total de sufragantes) y alerta si no.
- **Conteo paralelo:** la sala de control suma las mesas reportadas por los testigos, por puesto y total; muestra la cobertura (mesas reportadas sobre total) y, cuando se publique el preconteo oficial, se carga a mano para compararlo y marcar diferencias.

## 15.4 Sala de control

Pantalla del Director (o de quien tenga O-18): mapa de puestos con estado, mesas instaladas, incidentes abiertos, mesas reportadas, resultados parciales, línea de tiempo, botón para llamar a testigos sin reporte y registro de decisiones.

## 15.5 Reclamaciones y escrutinios

- Registro de reclamaciones: mesa, causal, evidencia (foto del acta y hora) y redacción con plantilla.
- Estados: preparada, presentada, resuelta.
- Calendario de las comisiones escrutadoras, delegados y abogados.
- **La app no presenta nada por su cuenta:** prepara los documentos y muestra los plazos, que suelen ser cortos. Todo se coordina con el equipo jurídico.

## 15.6 Después de la jornada

Carga de resultados oficiales, comparación con el conteo paralelo, informe, agradecimientos a voluntarios y testigos, gastos finales, retiro de propaganda, reporte final de ingresos y gastos y **activación del plan de cierre de datos** (16.9).

## 15.7 Líneas rojas del día de elecciones

- No se hace seguimiento individual de votantes.
- No se interfiere con los jurados ni con el voto.
- No se hace propaganda dentro ni cerca de los puestos (la ley lo restringe).
- Los testigos solo observan y reclaman por el procedimiento.
- Ninguna presión ni transporte condicionado.
- Todo se hace con la ley vigente confirmada por el abogado.

---

# 16. Protección de datos, seguridad y ética

## 16.1 El marco

- **Constitución, artículo 15:** derecho a la intimidad y al habeas data.
- **Ley 1581 de 2012** (régimen general de protección de datos) y **Decreto 1074 de 2015** (que compila el Decreto 1377 de 2013).
- **Autoridad:** Superintendencia de Industria y Comercio (SIC).
- **Circular Externa 001 de 2022 de la SIC** para campañas: informar la finalidad específica; no usar medios engañosos; no usar bases de datos de otras entidades; guardar los datos solo el tiempo necesario y **suprimirlos cuando se cumpla la finalidad**; inscribir las nuevas bases de datos en el RNBD cuando corresponda.
- **Circular Externa 002 de 2026 de la SIC** (15 de enero de 2026; el texto oficial está publicado en sedeelectronica.sic.gov.co), según la información pública disponible: ningún dato personal sin autorización previa, expresa e informada; todos los canales deben mostrar la política de tratamiento y el aviso de privacidad y ofrecer mecanismos de autorización; prohíbe incluir personas en grupos de mensajería, listas de distribución o envíos masivos sin su consentimiento; el dato sensible, como la orientación política, exige autorización explícita; advierte sobre perfiles sin consentimiento; pide transparencia sobre criterios de segmentación, fuentes de datos y uso de inteligencia artificial; exige mecanismos ágiles, permanentes y sencillos para conocer, actualizar, rectificar o suprimir datos; y limita el uso de datos de afiliados y seguidores a la comunicación directa, sin compartirlos con terceros sin autorización.

**El abogado debe leer los textos oficiales** (sección 23). La app está diseñada para cumplir estos puntos.

## 16.2 Quién es quién

- **Responsable del tratamiento:** la campaña (la candidatura).
- **Encargados:** quien opera el sistema y el proveedor tecnológico.
- **Oficial de protección de datos:** en la práctica, el Administrador; conviene designarlo formalmente.
- **Manual interno de políticas y procedimientos** de datos, preparado con el abogado.

## 16.3 Los principios, aplicados

| Principio | Cómo lo cumple la app |
|---|---|
| Legalidad | Solo se tratan datos con base legal y siguiendo las circulares de la SIC |
| Finalidad | El texto de autorización limita el uso a la campaña; no se usan para nada más |
| Libertad (consentimiento) | Autorización previa, expresa e informada; la persona puede negarse; nada se condiciona a la autorización |
| Veracidad | Se pueden corregir datos; hay verificación y control de calidad |
| Transparencia | La persona puede saber qué datos hay, de dónde vienen y para qué se usan |
| Acceso y circulación restringida | Enmascaramiento, permisos, alcance por zona, auditoría |
| Seguridad | Cifrado, verificación en dos pasos, respaldos, alertas |
| Confidencialidad | Acuerdos y código de conducta; marca de agua y sin capturas |
| Necesidad y proporcionalidad | Se pide solo lo necesario; casi todo es opcional |

## 16.4 La autorización: texto y mecánica

**Texto corto modelo** (el abogado lo ajusta; el colaborador lo lee o lo muestra):

> "Soy [nombre], de la campaña Pijao Nos Une, del candidato Jaime González. Quisiera registrar su vivienda y, si usted lo permite, sus datos de contacto, para conocer las necesidades de su familia, mantenerlo informado de la campaña y construir el programa de gobierno. Usted puede decir que no, y puede pedir en cualquier momento que corrijamos o borremos sus datos escribiendo a [correo] o por [WhatsApp]. No venderemos sus datos ni los entregaremos a otras personas, y los eliminaremos al terminar la campaña. Sus datos se guardan en servidores de un proveedor tecnológico que puede estar fuera de Colombia. Aquí tiene nuestra política completa."

**Mecánica**

1. **Casillas separadas** por finalidad (sección 6.3, paso 10), y una **casilla aparte, explícita**, para el dato sensible de simpatía: "Entiendo que no estoy obligado a responder."
2. **Método:** firma en pantalla, autorización verbal con casilla y hora, o formulario en papel fotografiado.
3. **Evidencia:** versión del texto, fecha y hora, ubicación, colaborador, método y firma.
4. **Nunca se condiciona** un servicio, trato o beneficio a que la persona autorice.
5. **Cada canal de contacto** (llamada, WhatsApp, SMS, correo) requiere su propia autorización.
6. **Datos de terceros:** no se registran datos de una persona que no esté presente y no haya autorizado (por ejemplo, "el teléfono del vecino"). Solo los datos de quien autoriza y el conteo del hogar.
7. **Revocatoria:** efecto inmediato en la ficha y en los envíos.

## 16.5 Derechos de las personas y canal de atención

**Derechos:** conocer, actualizar, rectificar, suprimir, revocar la autorización, pedir prueba de la autorización y presentar quejas ante la SIC.

**Canal permanente, ágil y sencillo:** correo, WhatsApp, formulario público "Mis datos" y atención con cualquier colaborador. Cada solicitud recibe un **número de caso**.

**Plazos:** la ley fija, como regla general, 10 días hábiles para consultas (prorrogables 5) y 15 días hábiles para reclamos (prorrogables 8). **El abogado los confirma.** La app trabaja con un plazo interno más corto (respuesta en 5 días hábiles) y ejecuta **"No contactar" de inmediato**.

**Ejecución:** la eliminación la hace el Administrador, con acta, y se confirma a la persona. Todo queda en la pantalla P-35.

## 16.6 Minimización y datos sensibles

- **Se recoge** lo necesario para conocer, informar y construir el programa; casi todo es opcional.
- **Dato sensible:** solo la simpatía, con autorización específica.
- **Nunca se recogen:** afiliación a partidos, religión, salud, origen étnico, orientación sexual, pertenencia individual a sindicatos u organizaciones sociales.
- **Biométricos:** no se toman huellas ni se hace reconocimiento facial de ciudadanos.
- **Perfilamiento:** no se hacen perfiles automáticos de personas.
- **Inteligencia artificial:** no se usa para predecir el comportamiento de votantes ni para perfilar personas. Si se usa para redactar piezas o resumir notas, se evita enviar datos personales a servicios externos y se informa, como pide la SIC.
- **Prueba del vecino** (para el entrenamiento): antes de guardar algo, pregúntese si le molestaría a esa persona saber que usted lo anotó.

## 16.7 Seguridad técnica y de procesos

- Cifrado en tránsito, en reposo y por campo; verificación en dos pasos; enmascaramiento; reglas por fila en la base de datos; auditoría; respaldos; bloqueo remoto; marca de agua; capturas bloqueadas; límites de exportación; alertas.
- **Antes de lanzar:** revisión de permisos, pruebas de seguridad básicas y prueba de recuperación de respaldos.
- **Actualizaciones** periódicas y manejo seguro de claves.
- **Ambientes separados** y datos reales solo en producción.
- **Contratos con proveedores** (alojamiento, mensajería, mapas) que cubran el tratamiento de datos.
- **Incidente de seguridad:** detectar → contener → evaluar → notificar a la SIC y a los afectados cuando corresponda, **dentro de los plazos legales (a confirmar por el abogado)** → corregir → documentar la lección.

## 16.8 Registro Nacional de Bases de Datos (RNBD)

La SIC ha señalado que las nuevas bases de datos creadas en campañas electorales deben inscribirse en el RNBD cuando cumplan los criterios de la norma. El abogado confirma si esta base debe inscribirse y en qué plazo.

## 16.9 Retención, cierre y eliminación (plan de cierre)

Según la SIC, los datos solo pueden conservarse el tiempo razonable y necesario, y **cumplida la finalidad se suprimen**. El plan:

1. **Fecha de corte:** después del escrutinio definitivo y de la rendición final de cuentas (fechas confirmadas con el abogado).
2. **Antes del corte:** preguntar, por el canal autorizado, a quienes quieran seguir recibiendo información de participación ciudadana, **con una nueva autorización específica**.
3. **Después del corte:** **eliminar o anonimizar** los datos personales (nombres, cédulas, teléfonos, correos, fotos con personas y notas) de quienes no autorizaron continuar. Se conservan solo estadísticas agregadas que no permitan identificar a nadie.
4. **Documentos contables y de rendición:** se conservan **por separado** y por el plazo legal.
5. Los datos de la campaña **no pasan al gobierno municipal**, no se usan para repartir beneficios ni con fines comerciales.
6. **Acta de eliminación** firmada por el Administrador y el Director.
7. **Respaldos:** se eliminan las copias antiguas.
8. **Cuentas:** se cierran y se revocan los accesos.

La eliminación individual puede pedirse y ejecutarse en cualquier momento.

## 16.10 Ética de campaña

La app cuida: el respeto a toda persona, la ausencia de presión, la prohibición de comprar votos, la no discriminación, la privacidad en una comunidad pequeña, la honestidad al prometer, la seguridad del equipo y la transparencia.
---

# 17. Sin internet, rendimiento y dispositivos

## 17.1 Principio: primero sin conexión

Todo lo esencial funciona **sin señal**: ver el mapa descargado, registrar visitas, tomar fotos, ver tareas y consultar el centro de información descargado.

**Lo que sí necesita conexión:** ver los cambios de los demás en tiempo real, descargar mapas, enviar mensajes, ver fotos que no se descargaron, ver estadísticas actualizadas, iniciar sesión por primera vez y aprobar cuentas.

## 17.2 Qué se guarda en el teléfono

- Una **base local cifrada** con las zonas asignadas (viviendas, hogares y personas en su versión enmascarada), tareas, agenda, anuncios, catálogos, borradores, cola de envío y fotos pendientes. La llave se guarda en el almacén seguro del teléfono (Android Keystore), y las llaves de sesión no se guardan en la base. *(Pendiente en la v0.10.1: ver 24.3, C1.)*
- Los mapas descargados.
- **Se borra** al cerrar la sesión a distancia, al dar de baja la cuenta, al reportar el teléfono como perdido y al desinstalar. Los datos de zonas que ya no están asignadas se eliminan.
- La llave de la base local se protege con el bloqueo del teléfono.
- El tamaño máximo es configurable.

## 17.3 Cola de envío y reintentos

- Estados de cada registro: **Guardado en el teléfono → Enviando → Sincronizado**, o **Error, reintentando**.
- Reintentos automáticos con espera creciente.
- Las fotos grandes pueden esperar a tener Wi-Fi (configurable).
- Pantalla **"Pendientes de envío"** con el botón **"Reintentar ahora"**.
- Aviso si hay registros sin enviar por más de 24 horas.
- **Un registro local nunca se borra hasta que el servidor confirma que lo recibió.**
- **Agregado en 1.1:**
  - La sincronización arranca sola al recuperar la señal y cada cierto tiempo, y nunca corren dos a la vez.
  - Tras varios intentos fallidos, el registro pasa a **cuarentena**, visible para el colaborador y en el panel de salud de la flota (N-12), en lugar de reintentarse sin fin.
  - **Nunca se le pide al colaborador desinstalar la app** mientras tenga registros sin enviar. Por eso el APK se firma siempre con la misma llave (24.3, B1).

## 17.4 Metas de rendimiento

- Abrir la app en menos de 3 segundos en un teléfono de gama media.
- Mapa listo en menos de 2 segundos con la zona descargada.
- De tocar "Registrar aquí" a ver el formulario: menos de 12 segundos, incluida la lectura del GPS.
- Guardar un registro en el teléfono en menos de 1 segundo.
- Sincronizar 20 registros con fotos en menos de 2 minutos con conexión móvil básica.
- Peso de la app: menos de 150 MB sin mapas. Consumo moderado de datos (fotos de unos 300 KB).
- Batería: una jornada de 6 horas con GPS sin agotar el teléfono.
- Escala: 300 usuarios al tiempo, 10.000 viviendas y 50.000 fotos sin que se note lentitud.

## 17.5 Dispositivos y sistemas

- **Solo Android 8 o superior** (actualización 1.1: iOS queda fuera por el costo de la cuenta de Apple; hoy la app se compila para Android 7 o superior).
- Cuando la campaña lo pida, Android 14 exige declarar el **servicio de ubicación en primer plano** para la jornada. La versión objetivo del sistema debe subir a la API 34 o más.
- Teléfonos de gama media o baja (mínimo 2 GB de memoria) y pantallas pequeñas.
- Uso vertical como principal; horizontal opcional. Tabletas, sin prioridad.
- **Permisos que pide:** cámara, ubicación (mientras se usa; en segundo plano solo durante la jornada), notificaciones, micrófono (dictado) y almacenamiento. Explica cada uno con palabras sencillas.
- **Instalación privada por invitación.** Actualización obligatoria cuando haya cambios críticos de seguridad.
- **Panel web** en navegadores modernos de computador, sin instalación, con el mismo ingreso y verificación en dos pasos.

## 17.6 Mantenimiento y soporte

- Ventanas de mantenimiento avisadas y **modo mantenimiento** con un mensaje claro.
- Pantalla **"Novedades"** con el registro de cambios.
- **Reporte de errores desde la app** con captura y datos técnicos, **sin datos personales**.
- Centro de ayuda con preguntas frecuentes y contacto con el Administrador. Meta de respuesta: 24 horas.

---

# 18. Las pantallas, una por una

## 18.1 Navegación general

- **Barra inferior del colaborador:** Inicio · Mapa · **[+ Registrar aquí]** (botón central naranja) · Tareas · Más.
- **"Más"** reúne: Eventos, Estadísticas, Centro de información, Capacitación, Solicitudes ciudadanas, Voluntarios, Equipo (según permisos), Mi perfil, Ayuda y Cerrar sesión.
- **Panel web:** menú lateral con los módulos, para Director y Administrador.
- **Franja superior fija:** estado de conexión, número de registros pendientes de envío, notificaciones y un indicador de **jornada activa**.
- **Estados comunes a toda pantalla:** cargando (con esqueleto), vacío (mensaje amable con una acción), sin conexión, error (mensaje claro y botón de reintentar) y sin permiso (explica por qué).

## 18.2 Acceso

- **P-01 Bienvenida.** Logo emblema, mensaje "Hoy Pijao nos une" y versión de la app. Pasa a P-02 si no hay sesión.
- **P-02 Iniciar sesión.** Celular o correo y contraseña; botón "Entrar"; "Entrar con huella o rostro" cuando ya hubo sesión; enlaces "Olvidé mi contraseña" (P-07), "Tengo una invitación" (P-04) y aviso de privacidad. Muestra el estado de la conexión.
- **P-03 Verificación.** Código de 6 dígitos por mensaje o aplicación autenticadora; reenviar tras 60 segundos; ayuda.
- **P-04 Crear cuenta desde invitación.** Valida el enlace o QR; formulario con los datos de 4.9, foto, declaración de servidor público o contratista, confirmación de mayoría de edad y contacto de emergencia.
- **P-05 Aceptar acuerdos.** Confidencialidad, código de conducta, política de seguridad y compromiso de datos. Hay que leer hasta el final para poder aceptar.
- **P-06 Capacitación inicial.** Lecciones, evaluación, resultado y certificado.
- **P-07 Recuperar acceso.** Por celular o correo, con verificación y nueva contraseña; avisa por el canal habitual.

## 18.3 Trabajo de campo

- **P-08 Inicio.** Panel personal (9.2), tarjeta "Antes de empezar", botón **Iniciar jornada** y atajos: Registrar aquí, Mi ruta, Pendientes.
- **P-09 Mapa.** Sección 5. Barra superior con buscador y capas, chips de filtros activos, botón **Registrar aquí**, "Centrar en mí" y alternancia mapa o lista.
- **P-10 Ficha rápida de un punto.** Sección 5.7.
- **P-11 Registrar aquí (captura de ubicación).** Barra de precisión del GPS, punto arrastrable, tarjetas de posibles duplicados y botón de confirmar.
- **P-12 Nueva visita (asistente de 12 pasos).** Barra de progreso, guardado automático de borrador, botones Atrás y Siguiente, "Guardar y seguir después", validaciones en cada paso y resumen final. Pasos en la sección 6.3.
- **P-13 Detalle de vivienda.** Foto principal y galería, dirección, mapa pequeño, estado, datos de la vivienda, hogares y personas (enmascarados), historial de visitas, necesidades y tareas. Botones: agregar visita, cómo llegar, editar (si puede), reportar problema, solicitar corrección o eliminación.
- **P-14 Detalle de persona.** Datos según permisos, estado de cada consentimiento, línea de tiempo y botones Llamar o WhatsApp (si procede). Acciones: registrar solicitud de derechos y marcar **No contactar**.
- **P-15 Buscar.** Por dirección, vereda, nombre o cédula (según permisos), con filtros y resultados en lista y mapa. No guarda nombres en el historial de búsquedas.
- **P-16 Mis visitas y pendientes.** Pestañas: Borradores, Por enviar, Seguimientos y Mis visitas.
- **P-17 Mis zonas y ruta del día.** Zonas asignadas con su avance, lista de pendientes ordenada, "Cómo llegar" y "Grabar recorrido".

## 18.4 Equipo y módulos de campaña

- **P-18 Tareas.** Lista, mapa y calendario; filtros; detalle (10.3); crear tarea (O-09).
- **P-19 Eventos.** Agenda, detalle, crear y editar (O-10), asistencia con QR y resultados.
- **P-20 Anuncios y notificaciones.** Bandeja, anuncios fijados, confirmación de lectura y publicar (O-11).
- **P-21 Directorio del equipo.** Colaboradores con foto, zona y estado; "Escribir por la app".
- **P-22 Estadísticas.** Panel de campaña (9.3); avanzadas (O-03); mapas de calor (O-04); filtros.
- **P-23 Informes.** Informes automáticos y bajo demanda; generar y descargar con permiso; marca de agua.
- **P-24 Centro de información.** Programa de gobierno (versión pública), mensajes clave, guiones, preguntas frecuentes, kit de marca, biblioteca legal para el equipo y documentos.
- **P-25 Capacitación.** Cursos, progreso, certificados y entrada al modo práctica.
- **P-26 Solicitudes ciudadanas y necesidades.** Bandeja, clasificación (O-19), detalle, estados y respuesta.
- **P-27 Voluntarios.** Lista, estados, filtros, aprobación (O-08) y detalle.
- **P-28 Líderes y organizaciones.** Directorio, mapa social, reuniones y compromisos.
- **P-29 Programa de gobierno.** Ejes, propuestas, evidencia, competencia y versiones. Edición: Director u O-19.
- **P-30 Comunicaciones.** Plantillas, segmentos, envíos, resultados, bajas (O-12) y calendario de contenidos.
- **P-31 Propaganda.** Inventario, mapa, calendario legal y retiro (O-17).
- **P-32 Finanzas.** Resumen, ingresos, gastos, presupuesto y topes, exportaciones y pendientes (O-15, O-16 o Director).
- **P-33 Día de elecciones.** Testigos, puestos, incidentes, conteo y sala de control (O-18 o Director).
- **P-34 Incidentes e irregularidades.** Crear reporte, lista, estado; confidencial.
- **P-35 Derechos de los titulares.** Casos (consulta, rectificación, supresión, revocatoria, queja) con plazo y estado; registrar, responder y levantar acta.

## 18.5 Administración

- **P-36 Gestión de colaboradores.** Lista con filtros, invitar, aprobar, suspender y ficha del colaborador.
- **P-37 Permisos de un colaborador.** Interruptores O-01 a O-22, plantillas (4.6), alcance por zona, vencimiento, motivo e historial de cambios.
- **P-38 Editor de zonas (O-14).** Dibujar, editar, unir y dividir polígonos; asignar; fijar metas.
- **P-39 Calidad y verificación.** Alertas, registros en rojo, sorteo de verificaciones, resultado de las llamadas y duplicados.
- **P-40 Importar y exportar.** Asistente con validación y fuente documentada; exportaciones con motivo; historial.
- **P-41 Auditoría.** Filtros por usuario, acción, fecha y registro. Vista operativa (Director) y técnica (Administrador, que puede exportarla).
- **P-42 Configuración del sistema (Administrador).** Catálogos, valores de control (sección 19), textos legales y versiones, integraciones, calendario legal y plantillas de permisos.
- **P-43 Salud del sistema (Administrador).** Sección 9.6.

## 18.6 Personales y de seguridad

- **P-44 Perfil y ajustes.** Foto, datos, contraseña, dispositivos, notificaciones, tamaño de letra, modo oscuro o modo sol, descarga de mapas y almacenamiento.
- **P-45 Ayuda y soporte.** Preguntas frecuentes, reportar un error o problema, contacto con el Administrador y novedades.
- **P-46 Jornada y SOS.** Iniciar, pausar y terminar jornada; SOS; contactos de emergencia; revisión de bienestar.
- **P-47 Modo práctica.** Entrar y salir; datos de ejemplo; simulacros.
- **P-48 Carnet digital.** Foto, nombre, QR y vigencia.

## 18.7 Páginas web públicas (fuera de la app)

- **P-49 "Cuéntale a Pijao".** Formulario ciudadano (11.4).
- **P-50 "Mis datos".** Para consultar, corregir, borrar o revocar (16.5).
- **P-51 "Quiero ser parte".** Registro de voluntarios (12.1).
- **P-52 Verificación de carnet.** Al escanear el QR de un colaborador, muestra si está vigente.
- **P-53 Política de tratamiento de datos y aviso de privacidad.** Texto completo, siempre disponible por QR y enlace.
---

# 19. Reglas de negocio y catálogos

## 19.1 Valores de control (los configura el Administrador en P-42)

| Parámetro | Valor inicial |
|---|---|
| Radio de detección de duplicados de vivienda | 15 m |
| Distancia máxima entre el teléfono y el punto para "Registrar aquí" | 50 m |
| Precisión mínima aceptada del GPS | 20 m |
| Distancia máxima de una ubicación manual | 100 m |
| Ventana de edición del autor | 72 horas |
| Fotos por visita | Máximo 6 |
| Tamaño de la foto | 1.024 píxeles, unos 100 KB, y miniatura de 20 KB (ajustado en 1.1 para el plan gratuito de Supabase) |
| Vigencia de una invitación | 72 horas, un solo uso |
| Duración de la sesión | Colaborador 14 días · Director 7 días · Administrador 12 horas |
| Inactividad para suspensión automática | 30 días |
| Dispositivos por colaborador | 2 |
| Intentos fallidos antes de bloquear | 5 (bloqueo de 15 minutos) |
| Grupos pequeños en estadísticas | Se muestra "menos de 5" |
| Verificación aleatoria por llamada | 5 % semanal |
| Retención de la ubicación en vivo | 7 días |
| Papelera | 30 días |
| Horario de mensajes a ciudadanos | 8 a. m. a 8 p. m. |
| Silencio de notificaciones | 9 p. m. a 6 a. m. |
| Alertas de tope de gastos | 70 %, 85 %, 95 % y 100 % |
| Puntaje mínimo del curso de ingreso | 80 % |
| Vigencia del certificado | 6 meses |
| Plazo interno de respuesta a titulares de datos | 5 días hábiles |
| Registros sospechosos | Más de un registro completo cada 90 segundos |

## 19.2 Reglas de negocio

**Cuentas y acceso**

- **R-01.** Solo existe una cuenta de Administrador; esa opción no aparece en ninguna pantalla.
- **R-02.** Solo el Administrador designa al Director; hay un solo Director activo.
- **R-03.** Toda cuenta de colaborador requiere invitación, aprobación, aceptación de acuerdos y curso aprobado antes de registrar datos reales.
- **R-04.** Todo permiso opcional guarda quién lo dio, cuándo, por qué y hasta cuándo, y se revisa cada mes.
- **R-05.** Los permisos de riesgo alto exigen verificación en dos pasos.
- **R-06.** Los colaboradores de campo deben ser mayores de 18 años.
- **R-07.** Quien declare ser servidor público o contratista del Estado genera una alerta al Director para revisión del abogado.

**Ubicación y viviendas**

- **R-08.** Una vivienda es un punto. Si hay otra a menos de 15 m, se pide confirmar.
- **R-09.** "Registrar aquí" solo funciona con el teléfono a 50 m o menos del punto.
- **R-10.** La precisión del GPS debe ser de 20 m o menos; si no, se ajusta a mano y se marca.
- **R-11.** Las coordenadas se guardan con 6 decimales en el sistema de los GPS.
- **R-12.** La ubicación manual solo vale hasta 100 m del teléfono y con motivo; más lejos es registro diferido.
- **R-13.** Una vivienda sin foto de fachada queda incompleta, salvo que se marque "No autorizó la foto".
- **R-14.** Máximo 6 fotos por visita; nunca de niños; con personas, solo con autorización.

**Personas y datos**

- **R-15.** No se guarda ningún dato de una persona sin autorización registrada; sin ella solo se guardan los conteos del hogar.
- **R-16.** Los menores de 18 no se registran como personas; solo se cuentan por rango de edad.
- **R-17.** La cédula: solo números, de 6 a 10 dígitos, única, cifrada; visible solo con O-01, el Director o el Administrador.
- **R-18.** Una persona pertenece a un solo hogar activo; si se muda, se cierra y se abre otro.
- **R-19.** La simpatía se registra solo si la persona la expresó y autorizó; por defecto es "No registrado".
- **R-20.** Si una persona revoca su autorización, pasa a "No contactar" de inmediato y su solicitud se atiende en los plazos de 16.5.
- **R-21.** Las viviendas "No contactar" aparecen a todos como "No volver", sin datos personales.
- **R-22.** El autor edita durante 72 horas; después se solicita corrección; toda edición guarda el antes y el después.
- **R-23.** Eliminar manda a la papelera por 30 días; el borrado definitivo es solo del Administrador.
- **R-24.** Solo se importan datos con fuente documentada y autorización; no se aceptan bases compradas ni de otras entidades.
- **R-25.** Exportar exige permiso, motivo y marca de agua, queda en la auditoría y tiene límite diario.

**Calidad**

- **R-26.** Un registro es sospechoso si hay más de uno cada 90 segundos, saltos de ubicación imposibles, ubicación falsa, fotos repetidas o registros fuera de zona u horario.
- **R-27.** Cada semana se sortea el 5 % de las visitas para verificar por llamada a quienes autorizaron contacto.
- **R-28.** Las estadísticas oficiales cuentan solo los registros verdes; los demás se muestran aparte.

**Estadísticas y seguridad**

- **R-29.** Los grupos de menos de 5 se muestran como "menos de 5".
- **R-30.** El ranking de colaboradores, si el Director lo activa, mide calidad y cumplimiento, no solo cantidad.
- **R-31.** La ubicación en vivo solo se comparte durante la jornada activa y se borra a los 7 días.
- **R-32.** El SOS avisa al Director, al Administrador y a dos contactos de emergencia, con ubicación y hora.
- **R-33.** Las sesiones vencen: colaborador, 14 días; Director, 7 días; Administrador, 12 horas.

**Comunicación**

- **R-34.** Solo se envían mensajes a personas con autorización vigente para ese canal; cada mensaje identifica a la campaña y ofrece la baja.
- **R-35.** Los envíos se hacen de 8 a. m. a 8 p. m. y con plantilla aprobada.
- **R-36.** Ningún mensaje contiene ataques personales ni desinformación; los masivos los aprueba el Director.

**Finanzas**

- **R-37.** Todo aporte tiene aportante identificado; no hay aportes anónimos ni de fuentes prohibidas.
- **R-38.** Todo gasto tiene soporte y responsable.
- **R-39.** Se alerta al 70, 85, 95 y 100 % del tope; al 100 % se exige confirmación doble.
- **R-40.** Ninguna salida de dinero por "gestión de votos"; las categorías de gasto son una lista cerrada.

**Elecciones**

- **R-41.** Solo reportan los testigos con acreditación válida; cada reporte lleva foto del acta y hora.
- **R-42.** Nada en la app registra por quién votó una persona ni si votó.

**Cierre**

- **R-43.** Al terminar la campaña se aplica el plan de cierre: eliminar o anonimizar los datos personales (16.9).
- **R-44.** Los datos de la campaña no se usan para gobierno, comercio ni nada ajeno a la campaña.
- **R-45.** Todo cambio en los textos legales crea una versión nueva y exige nueva aceptación si cambia la finalidad.

## 19.3 Catálogos

- **C-01 Estados de la vivienda:** por visitar; visitada con conversación; visitada sin contacto; requiere seguimiento; no contactar; deshabitada o sin uso; dirección inexistente o con error; fuera de Pijao.
- **C-02 Resultado del contacto:** conversación completa; conversación breve; dejó información; nadie en casa; pidió volver; rechazó; pidió no ser visitado; casa cerrada o deshabitada; dirección errónea.
- **C-03 Tipos de vivienda:** casa urbana; apartamento; finca o casa rural; casa con local; lote o en construcción; alojamiento turístico; otro.
- **C-04 Tenencia:** propia; arrendada; familiar o prestada; administrada (mayordomo o administrador); otra.
- **C-05 Servicios:** agua del acueducto; agua de nacimiento u otra fuente; alcantarillado; pozo séptico; energía eléctrica; gas; internet; recolección de basura; señal de celular.
- **C-06 Vía de acceso:** pavimentada; placa huella; destapada transitable; camino o sendero; difícil en lluvia.
- **C-07 Ocupación o actividad:** caficultor propietario; jornalero o recolector; mayordomo; otro cultivo; ganadería; comerciante; empleado privado; servidor público; docente; transportador; turismo y hospitalidad; construcción; independiente u oficios varios; pensionado; ama de casa; estudiante; sin empleo; otro.
- **C-08 Temas de necesidades:** los 14 ejes de la sección 11.3.
- **C-09 Simpatía [SENSIBLE]:** apoya; simpatiza; neutral; indeciso; no apoya; prefiere no decir; no registrado.
- **C-10 Canales de contacto:** WhatsApp; llamada; SMS; correo; visita; ninguno.
- **C-11 Rangos de edad:** 0–5; 6–12; 13–17; 18–24; 25–34; 35–44; 45–54; 55–64; 65 o más.
- **C-12 Tipos de evento:** reunión de vereda; reunión de barrio; tertulia en casa; cabildo o foro; jornada de escucha; actividad deportiva o cultural; capacitación; reunión con gremios u organizaciones; cierre de campaña; otro.
- **C-13 Tipos de tarea:** visitar; seguimiento; llamar; verificar registro; repartir material; apoyar evento; instalar o retirar propaganda; capacitar; otra.
- **C-14 Categorías de gasto:** propaganda e impresos; eventos y reuniones; transporte y logística; alimentación del equipo; personal y honorarios; sede y servicios; comunicaciones y publicidad digital; material de oficina; asesoría legal y contable; tecnología; testigos electorales; otros. Deben alinearse con las categorías del formato oficial de rendición de cuentas.
- **C-15 Tipos de propaganda:** valla; pendón; afiche; volante; vehículo con propaganda; perifoneo; gorra o camiseta; pieza digital; mural.
- **C-16 Motivos de no contacto:** nadie en casa; casa cerrada; rechazó hablar; pidió volver; dirección errónea; perro u obstáculo; riesgo de seguridad; otro.
- **C-17 Tipos de incidente:** seguridad personal; amenaza u hostigamiento; sospecha de compra de votos por terceros; constreñimiento; rumor o desinformación; daño a propaganda; pérdida de teléfono o fuga de datos; queja sobre un colaborador; irregularidad en una mesa de votación; otro.
- **C-18 Solicitudes de titulares:** consulta; actualización o corrección; supresión; revocatoria de autorización; queja.
- **C-19 Estados de una necesidad:** recibida; clasificada; agrupada; evaluada; incluida en el programa; derivada; no viable; comunicada; cerrada.
- **C-20 Motivos de ubicación manual:** pendiente empinada o inaccesible; camino privado cerrado; animal bravo; riesgo de seguridad; mal GPS; otro.

---

# 20. Historias de uso

(Los nombres son inventados.)

**1. Marta recorre una vereda sin señal.** Marta, colaboradora, descargó su zona con Wi-Fi la noche anterior. Inicia jornada, camina hasta la primera finca y toca "Registrar aquí". Aunque no hay señal de datos, el GPS funciona. La app no encuentra otra casa a menos de 15 m, ella fotografía la fachada, lee el texto de autorización a doña Rosa, que acepta compartir su nombre y su celular pero prefiere no responder sobre simpatía. Marta registra cuatro personas en el hogar y que la vía de acceso es difícil en lluvia. Guarda: "Guardado en el teléfono". Al llegar a la carretera, con señal, el punto aparece en el mapa de todos.

**2. El Director revisa su mañana.** Desde el panel, el Director ve un semáforo en rojo en una vereda: no hay visitas hace 14 días. Abre la zona, ve que su líder está enfermo y reasigna la zona a dos colaboradores desde la ficha. También aprueba tres solicitudes de ingreso y lee las 5 necesidades más mencionadas de la semana: el estado de la vía y el transporte escolar encabezan la lista. Las envía al banco de propuestas y marca una como "gestión ante otro nivel", porque la vía es departamental.

**3. Un vecino pide borrar sus datos.** Don Hernán escribe por WhatsApp que quiere que borren sus datos. El colaborador que recibe el mensaje abre su ficha y registra la solicitud; la persona queda de inmediato en "No contactar" y desaparece de los envíos. El Administrador recibe el caso, borra los datos con acta y le confirma a don Hernán por escrito dentro del plazo. La vivienda sigue en el mapa solo como "No volver".

**4. La app detecta un registro sospechoso.** Un colaborador guarda 9 registros completos en 6 minutos, en casas separadas por más de un kilómetro. La app marca los registros en amarillo y envía una alerta a Calidad. Un verificador llama a tres hogares que autorizaron contacto: dos dicen que nadie los visitó. El Director habla con el colaborador, suspende su cuenta mientras se aclara y los registros dudosos quedan fuera de las estadísticas.

**5. Un nuevo colaborador entra al equipo.** El Director invita a Camilo con su celular. Camilo abre el enlace, verifica su número, crea su cuenta, declara que no es servidor público y acepta el código de conducta. El Director lo aprueba, Camilo hace el curso, saca 90 % y recibe su certificado y su carnet digital. Practica dos visitas en modo práctica y, al día siguiente, hace su primer registro real.

**6. Día de elecciones, mesa 4.** Isabel, testigo electoral, reporta a las 8:05 a. m. la instalación de la mesa con una foto. A las 4:30 p. m. fotografía el acta de escrutinio y registra los números. La app suma y avisa: "Falta 1 voto para cuadrar con el total de sufragantes". Isabel revisa la foto, corrige un dígito y envía. La sala de control actualiza el conteo paralelo y marca el puesto como "reportado".

---

# 21. Riesgos y cómo se cubren

| Riesgo | Cómo se cubre |
|---|---|
| Fuga de datos personales | Enmascaramiento, cifrado, verificación en dos pasos, auditoría, alertas, protocolo de incidentes |
| Registros falsos | Control de calidad, GPS, verificación por llamada, no pagar por cantidad |
| Uso indebido de datos por un colaborador | Acuerdos, auditoría, marca de agua, baja y denuncia cuando corresponda |
| Compra de votos o presión por parte de personas ligadas a la campaña | Líneas rojas, código de conducta, capacitación, alertas y canal de incidentes |
| Incumplimiento de las normas de datos personales | Autorización con evidencia, derechos de los titulares, plan de cierre, revisión del abogado, RNBD |
| Falta de señal en las veredas | Diseño sin conexión, mapas descargados y cola de envío |
| Poca adopción por poca experiencia técnica | Diseño simple, modo práctica, capacitación y soporte |
| Dependencia de una sola persona como Administrador | Recuperación de emergencia, documentación, respaldos |
| Sobrecarga del Director | Permisos delegables, plantillas, informes automáticos |
| Costos de almacenamiento y mensajería | Fotos comprimidas, monitoreo de uso y topes de envío |
| Rumores y desinformación | Muro de verdad y protocolo de respuesta |
| Seguridad física del equipo | Jornada, SOS, revisión de bienestar y no trabajar solo de noche |
| Propaganda o actividad fuera de tiempo | Calendario legal y revisión de guiones |
| Pérdida o robo de teléfonos | Bloqueo remoto, cifrado local y cierre de sesión |
| Cambios en la ley o en las instrucciones de las autoridades | Revisión trimestral con el abogado y parámetros configurables sin reprogramar |
| Caída del servicio el día de elecciones | Simulacros y plan B en papel (formularios impresos) |
| Perfilamiento injusto de personas | Sin perfiles automáticos, transparencia de criterios y datos sensibles solo con autorización |
---

# 22. Fases de construcción y lista de verificación antes de lanzar

## 22.1 Fases de construcción (reorganizadas en la versión 1.1)

El detalle completo, tarea por tarea, con criterio de salida y un anexo que asigna una fase a cada elemento de este documento, está en **`docs/Plan-de-Construccion.md`**. Ese plan reemplaza las fases 0 a 5 de la versión 1.0. Resumen:

| Orden | Fase | Fechas | Contenido principal |
|---|---|---|---|
| 1 | **Fase 1 · Cimientos, seguridad y núcleo de campo** | 5 de noviembre de 2026 a 31 de enero de 2027 | Preparación legal y decisiones (antes «Fase 0»); decisión de tecnología; ambientes, firma del APK y respaldos; corrección de todos los hallazgos de 24.3; acceso con verificación en dos pasos; mapa con GPS y mapa sin conexión; visita completa con foto; personas y autorizaciones; derechos de los titulares (P-35, P-50 y P-53); modo práctica; panel web inicial (P-36, P-37 y P-41 a P-43); módulo de firmas si aplica |
| 2 | **Fase 2 · Diseño visual y estético** (exclusiva de diseño) | 1 de febrero a 15 de marzo de 2027, en paralelo con el piloto | Sistema de diseño en Claude Design, ícono y logos derivados, iconografía y marcadores del mapa, estilo del mapa, las 53 pantallas con sus estados y modos, prototipos, textos, accesibilidad AA, materiales impresos y aplicación del diseño a lo construido |
| 3 | **Fase 3 · Operación del equipo, territorio y comunidad** | 16 de marzo a 31 de mayo de 2027 (despliegue desde el 15 de abril) | Zonas, Reconocimiento y rutas; jornada y SOS; equipo, tareas, eventos y capacitación; calidad y anti-fraude; estadísticas avanzadas e informes; escucha y programa de gobierno; voluntariado y organizaciones; centro de información; incidentes y calendario legal |
| 4 | **Fase 4 · Campaña pública, finanzas, día de elecciones y cierre** | 1 de junio a 30 de septiembre de 2027, más la operación hasta febrero de 2028 | Finanzas antes de la inscripción de candidaturas; comunicaciones, propaganda y redes antes de la propaganda en medios; análisis histórico; Día de elecciones con simulacros; herramientas y ejecución del plan de cierre |

**¿Por qué el diseño va de segundo?** Si se diseña antes del núcleo, el piloto obligaría a rediseñar. Si se diseña al final, habría que rehacer más de 50 pantallas y reentrenar al equipo cerca de la elección. Entre el núcleo y la expansión, el diseño aprovecha lo que enseñe el piloto, el equipo aprende una sola vez la interfaz definitiva y todo lo posterior nace ya diseñado.

## 22.2 Calendario (actualizado en la versión 1.1)

Ajustado al estado real del software (sección 24) y al calendario oficial (2.2). La columna «Fase» corresponde a las cuatro fases de 22.1.

| Periodo | Fase | Qué debe pasar |
|---|---|---|
| 4 al 30 de noviembre de 2026 | 1 | Contratar al abogado y preparar los textos legales. Corregir los hallazgos críticos y altos de 24.3. Crear el ambiente de pruebas y pasar las migraciones a Supabase CLI. Firma fija del APK. Prueba técnica de la tecnología (24.5). **Decidir las 23.1-1 y 23.1-17 el 30 de noviembre** |
| 1 de diciembre de 2026 al 31 de enero de 2027 | 1 | Foto de fachada, mapa sin conexión, base local cifrada, cola con espera creciente y sincronización automática, bloqueo de capturas, modo práctica, salud de la flota (N-12), versión mínima obligatoria (N-13) y panel web inicial (aprobaciones, permisos, mapa y avance) |
| 1 de febrero al 15 de marzo de 2027 | 2 | Fase exclusiva de diseño visual y estético (sistema de diseño, las 53 pantallas y aplicación a lo construido). En paralelo, durante febrero, el piloto: 5 a 10 colaboradores, en el casco urbano y una vereda, durante dos a tres semanas (22.3) |
| 16 de marzo al 14 de abril de 2027 | 3 | Zonas y polígonos, Reconocimiento con precarga de edificaciones (N-01), rutas, tareas y anuncios con notificaciones, jornada con SOS (N-06, N-07), calidad y anti-fraude (N-08), estadísticas avanzadas e informes, carnet y tarjeta con QR (N-09) |
| 15 de abril al 31 de mayo de 2027 | 3 (despliegue) | Por etapas: 30, luego 100 y luego 300 colaboradores. **Desde abril no se cambia de tecnología** |
| 15 de abril al 31 de mayo de 2027 | 3 | Escucha y programa de gobierno, «Cuéntale a Pijao», voluntariado y organizaciones, eventos, centro de información, incidentes y calendario legal (en paralelo con el despliegue). El módulo de firmas, si aplica, ya quedó en la Fase 1 porque la recolección cierra el 30 de junio |
| Junio de 2027 | 4 | Aportes, gastos, topes y exportación para Cuentas Claras, antes de la inscripción de candidaturas (30 de junio al 31 de julio) y de la propaganda en medios (desde el 5 de agosto) |
| Julio de 2027 | 4 | Comunicaciones, propaganda y redes, listas antes de la propaganda en medios (desde el 5 de agosto) |
| Agosto y septiembre de 2027 | 4 | Testigos, fotos de actas, conteo paralelo y sala de control. **Simulacros el 19 de septiembre, el 10 de octubre, el 24 de octubre (una semana antes) y el 30 de octubre (el día anterior)**, como pide 15.2 |
| 1 de octubre de 2027 | 4 (congelamiento) | Solo arreglos críticos, con vuelta atrás probada |
| 31 de octubre de 2027 | 4 (elecciones) | Turno técnico de guardia y panel de la flota abierto |
| Noviembre de 2027 a febrero de 2028 | 4 (cierre) | Escrutinios desde el 2 de noviembre, rendición final y plan de cierre (16.9) |

Recordatorio: antes de que se abra el periodo legal de propaganda, el trabajo de campo debe centrarse en **conocer y escuchar**, con guiones revisados por el abogado.

## 22.3 Prueba piloto

Cinco a diez colaboradores, una zona, dos semanas. Se miden: tiempo por registro, errores de GPS, problemas sin conexión, claridad del texto de autorización, calidad de los datos y opiniones de las familias visitadas. Con eso se ajusta antes de ampliar.

## 22.4 Lista de verificación antes de lanzar

1. El abogado revisó la política de tratamiento, el aviso de privacidad, el texto de autorización, los acuerdos y el código de conducta.
2. Se decidió si la base debe inscribirse en el RNBD y, si aplica, se inscribió.
3. Se revisaron los términos con los proveedores (alojamiento, mensajería, mapas).
4. El aviso de privacidad dice que los datos se alojan con un proveedor, posiblemente fuera de Colombia.
5. Los permisos se probaron con una cuenta de cada tipo y con permisos opcionales encendidos y apagados.
6. La verificación en dos pasos está activa para el Administrador y el Director.
7. El cifrado de los campos sensibles está comprobado.
8. El respaldo diario funciona y la restauración se probó.
9. Los códigos de recuperación del Administrador están guardados fuera de línea.
10. El curso de ingreso y el modo práctica están listos.
11. Los catálogos y la lista de barrios y veredas están cargados.
12. Los polígonos de las zonas se revisaron en el terreno.
13. Se probó el trabajo sin señal en una vereda real.
14. Se probó la app en teléfonos de gama baja.
15. Se probó la pérdida de un teléfono (bloqueo remoto).
16. El canal "Mis datos" y los medios de atención tienen responsables y funcionan.
17. El plan de incidentes de seguridad está escrito.
18. El plan de cierre y eliminación está escrito y firmado.
19. El calendario legal tiene las fechas oficiales.
20. Los textos de la app se revisaron (tono y ortografía).
21. Los logos y colores son los correctos.
22. El piloto se completó y se hicieron los ajustes.
23. La instalación privada por invitación está configurada.
24. Se definió quién da soporte y en qué horario.

## 22.5 Lista técnica antes de lanzar (agregada en 1.1)

1. El APK de producción se firma con una **llave única**, guardada en los secretos de GitHub y en un respaldo fuera de línea. La versión de la app se toma de un solo lugar.
2. Funcionan la versión mínima obligatoria y la actualización instantánea con vuelta atrás.
3. Los ambientes de pruebas y producción están separados, y las migraciones se aplican solo con Supabase CLI.
4. Hay pruebas automáticas de las reglas por fila para cada rol y para cada permiso opcional (R-01 a R-45). Corren antes de cada construcción.
5. Los hallazgos críticos y altos de 24.3 están cerrados y verificados.
6. Funcionan el reporte de errores sin datos personales y el panel de salud de la flota.
7. El respaldo diario y la copia externa cifrada funcionan, la restauración se probó y la llave `pii_key` está guardada fuera de línea.
8. Se probaron el borrado remoto y el caso de «teléfono perdido».
9. Se hizo una prueba de carga con 300 usuarios sincronizando a la vez y 10.000 viviendas en el mapa.
10. En un teléfono de 2 GB, la app arranca en menos de 3 segundos y aguanta una jornada de 6 horas con GPS.
11. Se probaron tres días sin señal en una vereda, con sincronización completa al final.
12. Las licencias de los mapas están verificadas.
13. Hay instructivos escritos para incidentes y caídas del servicio, y un segundo custodio con credenciales selladas.

---

# 23. Decisiones pendientes y puntos para validar con un abogado

## 23.1 Decisiones del Administrador y del Director

1. **Forma de inscripción de la candidatura:** por partido o coalición, o por grupo significativo de ciudadanos (firmas). Define si se construye el módulo de apoyos (14.10). **URGENTE (1.1):** la recolección de apoyos abrió el 31 de octubre de 2026 y cierra el 30 de junio de 2027. Fecha límite para decidir: 30 de noviembre de 2026.
2. **Gerente de campaña:** quién será y si usará la app con O-15 y O-16.
3. **Tipo de vinculación del equipo:** voluntarios, contratados o ambos (afecta finanzas, conducta y seguros).
4. **Tamaño del equipo** y tipo de teléfonos que usarán.
5. **Proveedor de mapas:** uno con buena vista satélite y mapas sin conexión.
6. **Mensajería:** SMS, WhatsApp o ambos, y presupuesto mensual.
7. **Ranking de colaboradores:** mostrarlo o no.
8. **Visibilidad por defecto:** confirmar que los datos enmascarados de 7.4 son los deseados.
9. **Datos ampliados sensibles** (por ejemplo, personas con discapacidad en el hogar): recomendación, no incluirlos en la Fase 1.
10. **Versión pública del programa de gobierno:** si se publica y cuándo.
11. **Dominio web y correo institucional** (para "Mis datos", soporte y páginas públicas).
12. **Presupuesto de tecnología:** plan de Supabase, mensajería y mapas.
13. **Suplente del Administrador** para atender "Mis datos" y emergencias, sin darle el rol de Administrador.
14. **Inicio del trabajo de campo** y mensaje de las primeras visitas, según el calendario de propaganda.
15. **Alcance geográfico:** si se incluye a personas de Pijao que viven en otras ciudades pero votan en Pijao.
16. **Cartografía:** límites oficiales (IGAC y DANE) u OpenStreetMap.
17. **Tecnología de la app móvil (nueva en 1.1):** seguir con Kivy o migrar a React Native con Expo (recomendado, ver 24.5). Se decide el 30 de noviembre de 2026, con el resultado de la prueba técnica. Después de abril de 2027 no se cambia.
18. **Mapa sin conexión (nueva en 1.1):** paquete propio de Pijao (ortofoto del IGAC o tomada con dron) o proveedor con licencia para uso sin conexión, con su presupuesto.
19. **Segundo custodio técnico (nueva en 1.1):** quién guarda, en sobre sellado, las credenciales de emergencia, la llave de firma del APK y la llave de cifrado de datos personales, por si el Administrador no está disponible.
20. **Precarga de edificaciones (nueva en 1.1):** usar o no fuentes abiertas de edificaciones para el Reconocimiento (N-01).

## 23.2 Puntos que debe validar un abogado (electoral y de protección de datos)

1. Leer las circulares externas 001 de 2022 y 002 de 2026 de la SIC y cualquier norma posterior; ajustar el texto de autorización.
2. Si la base debe inscribirse en el RNBD y en qué plazo.
3. Alojamiento de datos fuera de Colombia: transmisión o transferencia internacional, contratos con proveedores y texto del aviso.
4. Condiciones para tratar la simpatía como dato sensible y si conviene no guardarla en la Fase 1.
5. Plazos legales de consultas, reclamos y reporte de incidentes de seguridad.
6. Tratamiento de menores (solo conteos) y de voluntarios menores de edad.
7. Participación en política de servidores públicos y contratistas del Estado (docentes, funcionarios, contratistas).
8. Reglas vigentes de propaganda electoral y perifoneo para Pijao (cuándo, dónde y cuánto).
9. Financiación: fuentes permitidas y prohibidas, topes, límites por persona, aportes de personas jurídicas, cuenta única, plazos de reporte en Cuentas Claras y conservación de soportes.
10. Voto programático: requisitos del programa de gobierno al inscribir la candidatura.
11. Inhabilidades e incompatibilidades del candidato.
12. Testigos electorales: acreditación, plazos, formularios y reclamaciones.
13. Encuestas: los sondeos internos no deben divulgarse como encuestas de intención de voto sin cumplir la ley.
14. Uso de inteligencia artificial en comunicaciones políticas y deberes de transparencia.
15. Políticas de las plataformas de mensajería sobre contenido político.
16. Plazo de conservación de documentos contables frente a la eliminación de datos personales.
17. Si se pudiera usar algún listado oficial (por ejemplo, del censo electoral) y bajo qué condiciones.
18. Uso de la marca, el logo y el nombre del candidato en el carnet digital y en los materiales.

---

# 24. Estado real de construcción (auditoría del 4 de noviembre de 2026)

*Sección nueva en la versión 1.1.* Resultado de revisar el repositorio `Pijao-Nos-Une` (rama `main`, app v0.10.1) contra este documento, con tres revisiones independientes de ECC (trazabilidad, seguridad y arquitectura) y una verificación manual de los hallazgos principales. Las 87 pruebas automáticas pasan y la revisión estática (`tools/revisar_codigo.py`) no encuentra errores.

## 24.1 Qué existe hoy

**Tecnología actual:**
- **App:** Python 3.11 con Kivy, empaquetada con Buildozer como APK de Android (mínimo Android 7, API 24). No hay versión para iOS ni panel web.
- **Servidor:** Supabase con PostgreSQL. Tiene 12 migraciones, reglas de seguridad por fila en todas las tablas y la lógica de negocio en funciones del servidor (RPC).
- **Registro:** una función de servidor (`registrar-con-codigo`) para crear cuentas con código de invitación.
- **Sin conexión:** base local SQLite con cola de envío e identificadores únicos, de modo que un reenvío no duplica registros.
- **Construcción:** el APK se compila en GitHub Actions.

**Leyenda:** ✅ funciona en la app · 🟡 parcial · 🖥️ listo en el servidor pero sin pantalla en la app · ⬜ no existe.

| Módulo (sección) | Estado | Detalle |
|---|---|---|
| Ingreso, invitación con código, acuerdos y curso de ingreso (4.9, 10.6) | ✅ | Registro sin correo de confirmación, mediante un código de invitación. El curso de ingreso activa la cuenta |
| Roles, permisos opcionales O-xx, plantillas y vencimiento (4.5–4.7) | ✅ | Pantalla de permisos. El servidor revisa los permisos en cada operación |
| Verificación en dos pasos (4.10) | 🖥️ | El servidor la exige para los permisos de riesgo alto. La app no tiene pantalla para activarla |
| Mapa real, GPS con muestreo, «Registrar aquí», ubicación manual y diferida, filtros (5.2–5.5, 5.8) | ✅ | Sin agrupación de puntos: con miles de viviendas puede ser lento |
| Zonas con polígonos (5.9) y modo Reconocimiento (5.10) | 🖥️ | Funciones de servidor en las migraciones 0011 y 0012 |
| Rutas (5.11) | ⬜ | |
| Jornada, ubicación en vivo y SOS (5.12) | 🖥️ | Tablas y funciones listas, sin pantalla |
| Tiempo real (5.13, 8.6) | 🟡 | La app consulta al servidor cuando se pide sincronizar. No recibe cambios en vivo |
| Mapa sin conexión (5.14) | ⬜ | Solo guarda en caché lo que ya se vio |
| Visita en pasos con autorización y firma en pantalla (6.3) | ✅ | |
| Foto de fachada (6.3, paso 2) | ⬜ | **Bloqueante:** sin foto, ningún registro puede quedar en verde (R-13) |
| Semáforo de calidad (6.4) | ✅ | |
| Anti-fraude (6.5) | 🟡 | El servidor revisa el ritmo y los saltos de ubicación. Falta el sorteo del 5 %, la detección de GPS falso y la pantalla P-39 |
| Edición con ventana de 72 h y papelera (6.6) | 🖥️ | Falta la fusión de duplicados |
| Visitas de seguimiento (6.7) | ⬜ | |
| Ficha de persona, línea de tiempo y cumpleaños (7.5–7.8) | ⬜ | El registro y el enmascarado sí existen |
| Base de datos, cifrado por campo de la cédula y los teléfonos, auditoría solo de agregar (8) | ✅ | Falta comprobar los respaldos y los dos ambientes (hoy hay un solo proyecto) |
| Panel personal y panel de campaña con «menos de 5» (9.2, 9.3) | ✅ | |
| Estadísticas avanzadas, mapas de calor, paneles del Director y del Administrador, metas e informes (9.4–9.11) | ⬜ | |
| Tareas y anuncios (10.3, 10.5) | ✅ | |
| Eventos, turnos, directorio, carnet, desempeño y salida (10) | ⬜ | |
| Escucha y programa de gobierno (11) | 🟡 | Solo las necesidades registradas en la visita |
| Voluntariado y organizaciones (12) | 🟡 | Solo las casillas «voluntario» y «anfitrión» |
| Comunicaciones, propaganda y redes (13) | ⬜ | |
| Finanzas y cumplimiento (14) | ⬜ | |
| Día de elecciones (15) | ⬜ | |
| Derechos de los titulares (16.5) | 🖥️ | Se registran solicitudes y «No contactar». No hay pantallas P-35 ni P-50 |
| Plan de cierre (16.9) | 🟡 | Anonimiza solo en parte (ver 24.3, A6) |
| Base local cifrada (8.7, 17.2) | ⬜ | **Incumple lo prometido** (ver 24.3, C1) |
| Configuración desde P-42 (19.1) | 🟡 | Los valores viven en la tabla `configuracion`, pero la app usa valores fijos en el código |

**Avance por fase (sección 22):** Fase 1 al 80 % aproximadamente; le faltan la foto, el cifrado local, el modo práctica y los respaldos. Fase 2 iniciada, con la mayor parte ya lista en el servidor. Fases 3, 4 y 5 sin empezar.

## 24.2 Diferencias entre el código y el documento

- **Tecnología:** el Apéndice B proponía Flutter o React Native para Android e iOS; se construyó en Kivy, solo para Android. Ver la decisión 23.1-17.
- **Registro:** se usa un **código de invitación** sin correo de confirmación, en lugar del enlace con verificación por SMS de 4.9. Es válido y más barato, pero necesita los refuerzos de 24.3 (A7, A8).
- **Parámetros:** el radio de duplicados, la precisión del GPS, la distancia manual y el tiempo de muestreo están fijos en la app. Si el Administrador los cambia en la configuración, solo el servidor lo respeta.
- **R-09 (50 m):** hoy la valida solo el servidor. Un registro tomado sin señal que el servidor rechaza queda trabado en «error» para siempre. Se corrige así: **en la sincronización, el servidor acepta el registro y lo marca para revisión, en vez de rechazarlo**.
- **R-10:** con mala precisión la app bloquea y ofrece marcar en el mapa. Coincide con la intención del documento.
- **Descarga por zonas (17.2):** hoy cada teléfono descarga las viviendas y las personas enmascaradas de **todo** el municipio. Debe limitarse a las zonas asignadas.
- **README:** dice que hay migraciones «0001…0008», pero existen hasta la 0012.

## 24.3 Hallazgos de seguridad y protección de datos

Ordenados por gravedad. Todos tienen corrección conocida. Los de nivel crítico y alto deben cerrarse **antes del piloto con datos reales**.

| Código | Gravedad | Hallazgo | Corrección |
|---|---|---|---|
| C1 | Crítico | La base local del teléfono no está cifrada. La cola de envío y los borradores guardan en claro la cédula, el teléfono, la simpatía y la firma, y también los tokens de sesión. Con un teléfono robado se leen todos | Cifrar la base local, con la llave guardada en el almacén seguro de Android (Keystore). Sacar los tokens de la base y vaciar o cifrar la cola al cerrar sesión |
| C2 | Crítico | Si otra persona inicia sesión en el mismo teléfono, la cola del usuario anterior se envía con la cuenta nueva y el autor queda mal registrado | Marcar cada registro de la cola con su usuario y no enviar nunca registros de otro |
| A1 | Alto | El servidor acepta como válida la autorización que declara la app: un solo consentimiento «global» sirve para todas las personas, y no se exige evidencia | Exigir una autorización por persona, con evidencia según el método, versión del texto y fecha verosímil |
| A2 | Alto | Varias funciones del servidor copian todos los campos que envía la app. Así, una app manipulada puede fijar la zona, marcar «verificada» o apuntar a la foto de otro | Aceptar solo una lista cerrada de campos por tabla |
| A3 | Alto | Cualquier colaborador activo puede ver todas las fotos, incluidas las que muestran personas y las de autorizaciones en papel | Limitar las fotos por zona, autoría o permiso. Las fotos de autorizaciones, solo para el Director y el Administrador |
| A4 | Alto | El Director y el Administrador pueden ver datos completos y ejecutar el plan de cierre **sin verificación en dos pasos** | Exigir la verificación en dos pasos también al Director y al Administrador para las acciones de riesgo alto y las destructivas |
| A5 | Alto | Las personas que pidieron la eliminación siguen siendo visibles y se pueden descifrar | Bloquear el descifrado y ocultarlas en la vista enmascarada de inmediato |
| A6 | Alto | No existe el borrado definitivo por persona. El plan de cierre deja direcciones, fotos, hogares, necesidades, nombres en la auditoría y las copias en los teléfonos | Crear un borrado definitivo por persona, un borrado de fotos en el almacenamiento, una orden de borrado remoto a los teléfonos y una auditoría que no guarde nombres |
| A7 | Alto | El código de invitación tiene 8 caracteres, sin límite de intentos, y los mensajes de error revelan si un correo ya está registrado. Un código de Director filtrado da acceso total de inmediato | Usar códigos de 12 caracteres o más, límite de intentos, mensaje genérico, y que las invitaciones de Director requieran aprobación del Administrador |
| A8 | Alto | Las reglas de la función de registro se pueden saltar con el registro abierto de Supabase | Desactivar el registro abierto y validar la mayoría de edad y el correo de la invitación también en la base de datos. Consumir la invitación con bloqueo, para que dos registros a la vez no usen el mismo código |
| M1 | Medio | Cualquier colaborador puede averiguar si una cédula ya está registrada y abrir esa ficha | Responder solo «ya registrada» y dejarlo en la auditoría |
| M3 | Medio | Los permisos de riesgo alto pueden quedar sin fecha de vencimiento | Hacer obligatorio el vencimiento para O-01, O-02, O-05, O-12, O-13 y O-16 |
| M4 | Medio | Cualquier colaborador puede marcar a cualquier persona como «No contactar» o revocar sus autorizaciones | Limitarlo por zona o autoría, y avisar al Director |
| M5 | Medio | La auditoría admite vaciado completo (TRUNCATE) | Bloquear también el vaciado y encadenar huellas para detectar alteraciones |
| M6 | Medio | No hay bloqueo de capturas de pantalla ni detección de teléfono modificado | Activar el bloqueo de capturas (FLAG_SECURE) y la detección de teléfono modificado |
| M7 | Medio | La ubicación en vivo no se valida y su borrado a los 7 días no está automatizado | Validar las coordenadas y programar el borrado automático (pg_cron) |
| B1 | Bajo | El APK se construye en modo de depuración, con una **llave de firma distinta en cada construcción**. Una actualización con otra firma obliga a desinstalar, y **desinstalar borra las visitas que no se han enviado** | Construir en modo producción con una llave fija guardada en los secretos de GitHub y en un respaldo fuera de línea |
| B2 | Bajo | Las librerías de red son antiguas. Los mensajes de error técnicos se muestran al usuario | Actualizarlas y mostrar mensajes amables |

**Lo que ya está bien:** reglas de seguridad por fila en todas las tablas; cédula y teléfonos cifrados por campo, con búsqueda por huella HMAC; enmascarado hecho en el servidor; almacenamiento privado; funciones del servidor protegidas contra la suplantación de esquema; copia de seguridad del teléfono desactivada; ninguna llave maestra en el repositorio (la clave «anon» de `config.json` es pública por diseño y su seguridad depende de las reglas por fila).

## 24.4 Calidad técnica

**Lo que funciona bien:**
- Separación limpia en capas: reglas puras (`core`), datos (`data`), servicios y pantallas (`ui`).
- 87 pruebas y un emulador de la interfaz que permite revisarla sin celular.
- La cola de envío no borra nada hasta que el servidor confirma, y los reenvíos no duplican registros.

**Lo que falta:**

| Tema | Problema | Corrección |
|---|---|---|
| Sincronización | Puede perder cambios que el servidor confirma con retraso | Releer con un margen de 2 minutos |
| Sincronización | No tiene espera creciente ni tope de intentos | Añadir espera creciente, tope de intentos y cuarentena |
| Sincronización | Solo se hace a mano y podrían correr dos al mismo tiempo | Sincronizar sola al recuperar la señal, con un candado para que corra una a la vez |
| Ediciones simultáneas | Gana la última, sin control de versión | Añadir una columna de versión y aplicar la regla de 5.13 |
| Fotos | Pueden quedar fotos huérfanas | Reintentar por separado el marcado de cada foto |
| Migraciones | Se aplican a mano y hay un solo ambiente | Pasar a Supabase CLI y crear el ambiente de pruebas |
| Pruebas de reglas | No hay pruebas automáticas de las reglas por fila según cada rol | Añadir pruebas pgTAP |
| Construcción del APK (CI) | No corre las pruebas antes de compilar. La versión en el User-Agent sigue en 0.9 | Correr las pruebas primero y tomar la versión de un solo lugar |
| Observabilidad | No hay forma de ver errores ni el estado de los teléfonos en campo | Agregar un reporte de errores sin datos personales (en una tabla propia de Supabase, sin servicios de pago) y un panel de **salud de la flota**: versión, cola pendiente, última sincronización, espacio libre y batería |
| Mapas | Las capas de OpenStreetMap y Esri que se usan hoy **no permiten la descarga masiva para usar sin conexión** | Mapa propio de Pijao empaquetado (PMTiles o MBTiles) o un proveedor con licencia para uso sin conexión |
| Respaldos | Falta el plan completo | Respaldo diario propio y cifrado en el computador del Administrador (el plan gratuito no trae respaldos), con base y fotos, prueba de restauración mensual y la **llave de cifrado de datos personales (`pii_key`) guardada fuera de línea**: sin ella las cédulas no se recuperan |

## 24.5 Recomendación de tecnología

El servidor (Supabase) es sólido y **se conserva completo**. La app de Kivy funciona, pero varios requisitos del documento cuestan mucho o son frágiles en Kivy: notificaciones, GPS en segundo plano para la jornada y el SOS, huella o rostro, cifrado local, tiempo real y panel web. Por eso se recomienda **migrar la app móvil a React Native con Expo (TypeScript)** y hacer el **panel web en React**. Las razones:

1. **Un solo lenguaje** para la app, el panel web y las funciones del servidor, que ya están en TypeScript.
2. **Actualizaciones instantáneas** (`expo-updates` con un servidor propio en Supabase, sin costo): los arreglos llegan a los 300 teléfonos sin reinstalar el APK, y se pueden revertir. En una campaña es decisivo.
3. Notificaciones, segundo plano, biometría, cifrado y mapas sin conexión (MapLibre) son librerías mantenidas.
4. Las reglas de `pijao/core` y sus 87 pruebas se traducen casi una a una y sirven de especificación.

**Condición:** antes de migrar, una **prueba técnica de 3 semanas** (hasta el 30 de noviembre de 2026) en un teléfono de 2 GB. Debe comprobar:

- Mapa de Pijao sin conexión.
- Jornada de 6 horas con GPS.
- Base cifrada.
- Notificaciones.

Si no pasa, o si al 15 de febrero de 2027 la app nueva no iguala a la v0.10.1, se sigue con Kivy, sin notificaciones ni biometría y con jornada solo con la pantalla encendida. **Después de abril de 2027 no se cambia de tecnología.** Es una decisión del Administrador (23.1-17).

---

# 25. Funciones nuevas propuestas

*Sección nueva en la versión 1.1.* Todas respetan las líneas rojas de 2.4: nada de compra de votos, nada sobre por quién vota alguien, nada de datos individuales de menores, sin perfiles automáticos. La columna «Fase» usa las cuatro fases de 22.1 (detalle en el anexo E de `docs/Plan-de-Construccion.md`).

## 25.1 Trabajo de campo y territorio

| Código | Función | Para qué sirve | Fase |
|---|---|---|---|
| N-01 | **Precarga de edificaciones** desde fuentes abiertas (Google Open Buildings o Microsoft Building Footprints) como puntos grises «por visitar» | El Reconocimiento pasa de crear puntos a confirmarlos. La cobertura se mide desde el primer día. No son datos personales ni una base comprada | 3 |
| N-02 | **Mapa propio de Pijao sin conexión:** ortofoto del IGAC o tomada con dron del casco urbano, empaquetada | Satélite sin señal, actualizado y sin problemas de licencia | 1 |
| N-03 | **Capa de estado de caminos:** derrumbes, pasos cerrados y quebradas crecidas, reportados por el equipo y con vencimiento | Seguridad y planeación en temporada de lluvias; alimenta las necesidades colectivas | 3 |
| N-04 | **Equidad territorial:** cobertura por vereda frente a su población estimada (proyecciones del DANE) | Evita dejar veredas olvidadas. Solo usa cifras agregadas | 3 |
| N-05 | **Registro por voz guiado:** dictar el paso de necesidades y notas, con revisión antes de guardar | Más rápido con una mano y más accesible. No se guarda el audio | 3 |

## 25.2 Seguridad del equipo

| Código | Función | Para qué sirve | Fase |
|---|---|---|---|
| N-06 | **SOS por mensaje de texto** cuando hay señal de voz pero no de datos | En las veredas el SOS por internet puede no salir | 3 |
| N-07 | **Trabajo en parejas en zona rural:** la jornada rural no arranca sin compañero, y cada uno confirma al otro | Complementa la revisión de bienestar | 3 |
| N-08 | **Detección de GPS falso y de velocidades imposibles** | Anti-fraude objetivo. Alerta al Director, no bloquea | 3 |

## 25.3 Confianza y derechos de las personas

| Código | Función | Para qué sirve | Fase |
|---|---|---|---|
| N-09 | **Tarjeta de visita con QR** que se deja en cada casa: nombre del colaborador, verificación de su carnet (P-52) y enlace a «Mis datos» (P-50) | Transparencia, protección contra impostores y canal de habeas data siempre a mano. No lleva datos de la familia | 3 |
| N-10 | **Recibo de autorización:** si la persona lo pide, un mensaje con el número de caso, lo que autorizó y cómo revocarlo | Prueba de la autorización (16.5), como pide la SIC | 4 |
| N-11 | **Panel de cumplimiento de datos:** autorizaciones por versión del texto, solicitudes abiertas con su plazo, permisos de riesgo encendidos y última prueba de borrado | El Administrador demuestra cumplimiento ante la SIC o el abogado | 3 |

## 25.4 Operación y calidad técnica

| Código | Función | Para qué sirve | Fase |
|---|---|---|---|
| N-12 | **Salud de la flota:** versión instalada, registros sin enviar, última sincronización, espacio y batería de cada teléfono | Detectar a tiempo teléfonos con datos trabados antes de que se pierdan | 1 |
| N-13 | **Versión mínima obligatoria y actualización instantánea con vuelta atrás** | Corregir errores críticos en todo el equipo el mismo día | 1 |
| N-14 | **Simulador de carga:** 300 usuarios sincronizando a la vez y 10.000 viviendas | Probar antes del despliegue y del día de elecciones | 3 |
| N-15 | **Informe semanal automático para el candidato** en una página: cinco cifras, tres alertas y las necesidades que más crecen | Ya está en 9.5; se propone automatizarlo desde la Fase 2 | 3 |

## 25.5 Lo que se descartó a propósito

- **Transporte de votantes el día de elecciones:** roza el constreñimiento y las normas electorales.
- **Seguimiento individual de la «intención de voto»:** contradice R-42 y el secreto del voto.
- **Perfiles automáticos con inteligencia artificial** sobre personas: lo prohíbe 16.6.
- **Cruce con bases externas de personas** (Sisbén, padrones, listas compradas): lo prohíben 2.4 y R-24.

---

# 26. Registro de cambios del documento

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 13 de octubre de 2026 | Primera versión completa (secciones 1 a 23 y apéndices) |
| 1.1 | 4 de noviembre de 2026 | **Calendario:** fechas oficiales de la Registraduría en 2.2, alerta por la recolección de firmas que ya está abierta y plan por fases con fechas en 22.2. **Contenido nuevo:** sección 24 (estado real del software, diferencias con el documento, 18 hallazgos de seguridad y calidad técnica), sección 25 (15 funciones nuevas), lista técnica de lanzamiento en 22.5 y decisiones 17 a 20 en 23.1. **Correcciones de fondo:** supuesto de la plataforma (2.5), registro por código de invitación (4.9), licencias de mapas sin conexión (5.14), estado del cifrado local (8.7 y 17.2), reglas de sincronización (17.3) y tecnología recomendada (Apéndice B). **Costo cero:** fotos de unos 100 KB, plan gratuito de Supabase, respaldos propios, ingreso sin SMS y solo Android (`docs/Analisis-Costo-Cero.md`). **Fases:** las fases 0 a 5 se reorganizan en cuatro (22.1): tres de construcción y una exclusiva de diseño visual, con el plan detallado y su anexo de trazabilidad en `docs/Plan-de-Construccion.md` |

---

# Apéndice A. Glosario

- **Administrador:** la única cuenta con poder técnico total del sistema.
- **Alcance por zona:** límite que restringe un permiso a ciertas veredas o barrios.
- **Anonimizar:** quitar de los datos todo lo que permita identificar a una persona.
- **Auditoría:** registro de quién hizo qué, cuándo y desde dónde; no se puede alterar.
- **Autorización:** consentimiento previo, expreso e informado de una persona para tratar sus datos.
- **Aviso de privacidad:** texto corto que dice quién recoge los datos, para qué y cómo ejercer derechos.
- **Cédula:** documento de identidad de las personas mayores de edad en Colombia.
- **CNE:** Consejo Nacional Electoral.
- **Cobertura:** porcentaje de viviendas conocidas que han recibido una visita completa.
- **Colaborador:** persona del equipo con cuenta en la app.
- **Constreñimiento al sufragante:** presionar o amenazar a alguien para que vote o no vote.
- **Conteo paralelo:** suma propia de los resultados reportados por los testigos, para compararla con la oficial.
- **Corrupción al sufragante:** ofrecer o dar algo a cambio del voto.
- **Cuentas Claras:** aplicativo del CNE para rendir cuentas de ingresos y gastos de campaña.
- **Dato sensible:** dato que puede generar discriminación, como la orientación política; exige autorización explícita.
- **Director de Campaña:** rol operativo principal en la app.
- **E-14:** acta de escrutinio de los jurados de votación de una mesa.
- **Embudo:** serie de etapas de la campaña, de las viviendas conocidas a las personas interesadas.
- **Enmascarar:** mostrar solo una parte de un dato (por ejemplo, los últimos dígitos de una cédula).
- **Escrutinio:** conteo y verificación oficial de los votos después de la jornada.
- **Gerente de campaña:** persona designada por la candidatura que responde por la contabilidad y la rendición de cuentas.
- **Habeas data:** derecho a conocer, actualizar, rectificar y suprimir los datos personales.
- **Hogar:** grupo de personas que vive y se sostiene junto en una vivienda.
- **Inscripción de cédulas:** trámite para cambiar el lugar de votación cuando una persona cambió de domicilio.
- **Jornada:** periodo en que un colaborador trabaja en campo y comparte su ubicación.
- **Mesa de votación:** unidad donde los ciudadanos depositan su voto.
- **Modo práctica:** entorno de entrenamiento con datos de ejemplo.
- **No contactar:** estado de quien pidió no ser visitado ni recibir mensajes.
- **Permiso opcional:** función adicional que el Director enciende a un colaborador (O-01 a O-22).
- **Plan de cierre:** conjunto de pasos para eliminar o anonimizar los datos al terminar la campaña.
- **Plantilla de permisos:** atajo para encender varios permisos de una vez; no es un rol.
- **Preconteo:** resultado preliminar que publica la autoridad electoral la misma noche de la votación.
- **Principal sostén del hogar:** persona que aporta el sustento principal.
- **Propaganda electoral:** publicidad hecha para obtener votos; tiene reglas de tiempo, lugar y modo.
- **Puesto de votación:** lugar con una o varias mesas donde vota una persona.
- **Reconocimiento:** recorrido para marcar las viviendas de una zona sin registrar datos de personas.
- **Registraduría:** autoridad que organiza las elecciones y el registro civil.
- **Responsable y encargado:** quien decide sobre los datos (la campaña) y quien los trata por su cuenta (operadores y proveedores).
- **RNBD:** Registro Nacional de Bases de Datos, administrado por la SIC.
- **SIC:** Superintendencia de Industria y Comercio, autoridad de protección de datos personales.
- **Simpatía:** nivel de apoyo declarado por una persona; dato sensible y opcional.
- **Testigo electoral:** persona acreditada por la candidatura para observar la votación y el conteo en una mesa.
- **Trashumancia electoral:** inscribir la cédula en un municipio donde la persona no vive; es un delito.
- **Vereda:** división rural del municipio.
- **Vivienda:** lugar físico donde viven una o más familias.
- **Voto programático:** mecanismo por el cual el elegido responde por el programa de gobierno que inscribió.
- **Zona:** barrio, vereda o sector dibujado en el mapa.

---

# Apéndice B. Notas para quien construya (en lenguaje sencillo)

1. **Servidor:** Supabase con base de datos PostgreSQL y extensión geográfica (PostGIS); ingreso con celular y correo y verificación en dos pasos; almacenamiento privado; tiempo real; funciones de servidor para tareas automáticas (informes, anonimización, borrado programado). Reglas de seguridad por fila en **todas** las listas y vistas enmascaradas para personas.
2. **App móvil:** una sola base de código, con base local cifrada y cola de sincronización; cámara con sello de fecha y coordenadas; muestreo de GPS; notificaciones al teléfono. **Estado 1.1:** existe una versión en Python con Kivy, solo para Android (v0.10.1). La recomendación es migrar a React Native con Expo en TypeScript, conservando todo el servidor y usando las pruebas de `pijao/core` como especificación (24.5, decisión 23.1-17).
3. **Mapas:** MapLibre con un paquete propio de Pijao sin conexión (PMTiles o MBTiles). Los puntos se agrupan para que el mapa aguante miles de viviendas en teléfonos de gama baja. No se descargan zonas desde los servidores públicos de OpenStreetMap ni Esri, porque sus licencias no lo permiten (5.14).
4. **Panel web:** aplicación web adaptable para Director y Administrador.
5. **Páginas públicas:** ligeras, para "Cuéntale a Pijao", "Mis datos", "Quiero ser parte", verificación de carnet y política de datos.
6. **Seguridad:** ninguna llave de servicio en el teléfono; probar las reglas por fila con una cuenta de cada rol; no guardar datos personales en los registros de error; revisar dependencias.
7. **Calidad:** pruebas automáticas de las reglas R-01 a R-45; datos falsos para pruebas; pruebas de campo; medición de uso sin datos personales.
8. **Ambientes:** pruebas y producción separados; cambios controlados; respaldos.
9. **Rendimiento:** índices geográficos, paginación, miniaturas en caché y compresión de fotos en el teléfono.
10. **Textos:** español de Colombia, todos en un solo lugar para poder editarlos sin programar.
11. **Configuración:** los valores de la sección 19.1 y los catálogos de 19.3 se editan desde la pantalla P-42, sin tocar código.
12. **Evolución:** si algún día se reutiliza para otra campaña, los datos deben separarse por campaña desde el diseño. No se hace en la Fase 1.

---

13. **Entrega profesional (agregado en 1.1):**
    - Los cambios se hacen con commits en git, en ramas y con solicitudes de cambio (pull requests), no subiendo archivos .zip por la web.
    - Cada versión lleva una etiqueta (por ejemplo `v0.11.0`) y una nota de cambios.
    - La integración continua corre las pruebas, la revisión estática y las pruebas de reglas por fila antes de construir el APK.
    - Las migraciones se aplican primero en pruebas y después en producción.

---

*Fin del documento maestro, versión 1.1.*
