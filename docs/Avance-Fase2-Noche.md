# Avance del trabajo nocturno de la Fase 2 (9 de noviembre de 2026)

Pedido del dueño: adelantar todo lo que Claude puede hacer de la Fase 2, empezando por los mapas, subirlo a GitHub con el
APK construido y dejar la lista de lo que le toca a él. El panel web es solo para el Director y el Administrador; no se
hacen páginas públicas (la campaña hará su propia página después). Lo que le toca al equipo queda en espera.

Si la sesión se corta, se retoma aquí: el primer bloque sin ✅ es el siguiente.

| # | Bloque | Estado |
|---|---|---|
| 1 | Mapa: marcadores con color y forma, pendientes punteados, ubicación con precisión, grupos con estado dominante, estilo de marca y ficha rápida | ✅ Marcadores generados en `app/assets/mapa` (13 tipos de 5.6 y números de grupo), estilo en tres modos, ficha P-10, leyenda, «mi ubicación». También: ícono nuevo de la app, ícono adaptable, notificaciones y arranque con el logo |
| 2 | Componentes base, íconos y estados comunes (cargando, vacío, sin conexión, error, sin permiso) | ✅ Componentes, íconos (14 ejes) y estados comunes usados en todas las pantallas |
| 3 | Modos oscuro, sol y letra grande | ✅ Tres paletas y letra ×1,25; selector en Perfil (la app se recarga sola); barra de estado según el modo |
| 4 | Pantallas de la app al detalle del lienzo | ✅ Entrar, Crear cuenta (3 pasos), Recuperar (medidor de fuerza), Dos pasos (6 casillas), Cuenta, Acuerdos (barra de lectura), Curso, Registrar aquí (ondas y precisión), Nueva visita (barra de pasos y resumen), Vivienda (línea de tiempo), Persona, Buscar, Pendientes, Tareas, Más, Perfil, Anuncios, Titulares, Carnet y Guion |
| 5 | Ícono de la app, arranque, animaciones que faltan y textos | ✅ Ícono y arranque (bloque 1); bienvenida de 1,9 s; transición entre pasos de la visita; ondas del GPS; formatos comunes en `core/formato.ts` (día/mes/año, 12 horas, Bogotá, puntos de mil) con pruebas; tono de «usted» revisado |
| 6 | Panel web interno con el diseño | ✅ Solo el panel (las páginas públicas no se tocaron): menú lateral blanco con íconos, nombre con el degradado, tarjetas, tablas, pestañas en pastilla, botones, avisos, claro y oscuro; Montserrat e Inter servidas desde el mismo sitio (@fontsource, OFL) |
| 7 | Accesibilidad, materiales, documentos, APK y lista del dueño | ⏳ |
