# Accesibilidad de la Fase 2 (WCAG 2.2 AA)

Auditoría hecha el 9 de noviembre de 2026 sobre la app 0.17.0 y el panel web. Se repite con `node app/scripts/contraste.js`.

## Qué se revisó y cómo quedó

| Punto (2.9 del plan) | Estado | Cómo se cumple |
|---|---|---|
| Contraste de 4,5:1 en texto y 3:1 en contornos | ✅ | Las 51 combinaciones que usa la app (17 usos × 3 modos) pasan. Tabla abajo, calculada desde `app/src/ui/tema.ts`. |
| Zonas táctiles de 48 × 48 | ✅ | Botones de 52 de alto, filas de 56 a 64, botones de ícono de 48, pestañas de la barra de 56. Los filtros (40) y los segmentos (44) llevan margen de toque hasta 48. El interruptor tiene 10 de margen. |
| Nombres para lectores de pantalla | ✅ | Cada botón, casilla, interruptor, pestaña y campo tiene nombre y estado (`accessibilityRole`, `accessibilityState`). Los avisos de error se anuncian solos. Los íconos son decorativos y no se leen dos veces. |
| Nada depende solo del color | ✅ | Marcadores del mapa con color y forma (5.6); semáforo con ícono y palabra («Completo», «Por revisar», «Incompleto»); estados con texto; colores de gráficos validados para daltonismo. |
| Letra grande del sistema | ✅ | La app respeta la letra del teléfono y además tiene «Letra grande» (×1,25) en Perfil. |
| Reducir movimiento | ✅ | Todas las animaciones lo respetan: la entrada dura menos de un segundo y sin desplazamientos, y las ondas y destellos no se repiten. |
| Modo sol (alto contraste) | ✅ | Paleta de 7:1, bordes negros en lugar de sombras. |
| Prueba con 5 colaboradores (incluidos adultos mayores) y bajo el sol real | ⏳ Equipo | Se hace en el piloto (febrero de 2027). Ver `docs/Pendientes-del-Equipo.md`. |

## Contraste por modo

| Modo | Uso | Combinación | Contraste | Mínimo | |
|---|---|---|---|---|---|
| claro | Texto principal | texto sobre fondo | 14.06:1 | 4.5:1 | ✅ |
| claro | Texto de apoyo | textoSuave sobre fondo | 5.46:1 | 4.5:1 | ✅ |
| claro | Apoyo en filas de enlace | textoSuave sobre superficie | 5.12:1 | 4.5:1 | ✅ |
| claro | Filas de enlace | texto sobre superficie | 13.20:1 | 4.5:1 | ✅ |
| claro | Hoja inferior y barra | texto sobre tarjeta | 14.06:1 | 4.5:1 | ✅ |
| claro | Botón sólido | invertida sobre azul | 14.06:1 | 4.5:1 | ✅ |
| claro | Registrar aquí | sobreNaranja sobre naranja | 7.57:1 | 4.5:1 | ✅ |
| claro | Enlaces | azulOceano sobre fondo | 7.97:1 | 4.5:1 | ✅ |
| claro | Errores y botón de peligro | textoRojo sobre fondo | 6.57:1 | 4.5:1 | ✅ |
| claro | Insignia azul | textoAzul sobre tinteAzul | 7.45:1 | 4.5:1 | ✅ |
| claro | Aviso de información | textoTurquesa sobre tinteTurquesa | 6.63:1 | 4.5:1 | ✅ |
| claro | Aviso de éxito y «Completo» | textoVerde sobre tinteVerde | 5.85:1 | 4.5:1 | ✅ |
| claro | Alerta y «Por revisar» | textoNaranja sobre tinteNaranja | 6.20:1 | 4.5:1 | ✅ |
| claro | Aviso de error | textoRojo sobre tinteRojo | 5.75:1 | 4.5:1 | ✅ |
| claro | Contorno de campos y casillas | bordeControl sobre fondo | 3.01:1 | 3:1 | ✅ |
| claro | Pestaña activa | texto sobre superficiePanel | 12.61:1 | 4.5:1 | ✅ |
| claro | Pestaña inactiva | textoSuave sobre superficiePanel | 4.89:1 | 4.5:1 | ✅ |
| oscuro | Texto principal | texto sobre fondo | 16.11:1 | 4.5:1 | ✅ |
| oscuro | Texto de apoyo | textoSuave sobre fondo | 8.91:1 | 4.5:1 | ✅ |
| oscuro | Apoyo en filas de enlace | textoSuave sobre superficie | 7.90:1 | 4.5:1 | ✅ |
| oscuro | Filas de enlace | texto sobre superficie | 14.29:1 | 4.5:1 | ✅ |
| oscuro | Hoja inferior y barra | texto sobre tarjeta | 12.03:1 | 4.5:1 | ✅ |
| oscuro | Botón sólido | invertida sobre azul | 16.11:1 | 4.5:1 | ✅ |
| oscuro | Registrar aquí | sobreNaranja sobre naranja | 8.90:1 | 4.5:1 | ✅ |
| oscuro | Enlaces | azulOceano sobre fondo | 7.41:1 | 4.5:1 | ✅ |
| oscuro | Errores y botón de peligro | textoRojo sobre fondo | 8.90:1 | 4.5:1 | ✅ |
| oscuro | Insignia azul | textoAzul sobre tinteAzul | 7.92:1 | 4.5:1 | ✅ |
| oscuro | Aviso de información | textoTurquesa sobre tinteTurquesa | 8.27:1 | 4.5:1 | ✅ |
| oscuro | Aviso de éxito y «Completo» | textoVerde sobre tinteVerde | 8.45:1 | 4.5:1 | ✅ |
| oscuro | Alerta y «Por revisar» | textoNaranja sobre tinteNaranja | 8.64:1 | 4.5:1 | ✅ |
| oscuro | Aviso de error | textoRojo sobre tinteRojo | 7.54:1 | 4.5:1 | ✅ |
| oscuro | Contorno de campos y casillas | bordeControl sobre fondo | 5.25:1 | 3:1 | ✅ |
| oscuro | Pestaña activa | texto sobre superficiePanel | 12.91:1 | 4.5:1 | ✅ |
| oscuro | Pestaña inactiva | textoSuave sobre superficiePanel | 7.14:1 | 4.5:1 | ✅ |
| sol | Texto principal | texto sobre fondo | 21.00:1 | 4.5:1 | ✅ |
| sol | Texto de apoyo | textoSuave sobre fondo | 17.40:1 | 4.5:1 | ✅ |
| sol | Apoyo en filas de enlace | textoSuave sobre superficie | 17.40:1 | 4.5:1 | ✅ |
| sol | Filas de enlace | texto sobre superficie | 21.00:1 | 4.5:1 | ✅ |
| sol | Hoja inferior y barra | texto sobre tarjeta | 21.00:1 | 4.5:1 | ✅ |
| sol | Botón sólido | invertida sobre azul | 21.00:1 | 4.5:1 | ✅ |
| sol | Registrar aquí | sobreNaranja sobre naranja | 7.28:1 | 4.5:1 | ✅ |
| sol | Enlaces | azulOceano sobre fondo | 12.98:1 | 4.5:1 | ✅ |
| sol | Errores y botón de peligro | textoRojo sobre fondo | 10.01:1 | 4.5:1 | ✅ |
| sol | Insignia azul | textoAzul sobre tinteAzul | 21.00:1 | 4.5:1 | ✅ |
| sol | Aviso de información | textoTurquesa sobre tinteTurquesa | 21.00:1 | 4.5:1 | ✅ |
| sol | Aviso de éxito y «Completo» | textoVerde sobre tinteVerde | 21.00:1 | 4.5:1 | ✅ |
| sol | Alerta y «Por revisar» | textoNaranja sobre tinteNaranja | 21.00:1 | 4.5:1 | ✅ |
| sol | Aviso de error | textoRojo sobre tinteRojo | 10.01:1 | 4.5:1 | ✅ |
| sol | Contorno de campos y casillas | bordeControl sobre fondo | 21.00:1 | 3:1 | ✅ |
| sol | Pestaña activa | texto sobre superficiePanel | 21.00:1 | 4.5:1 | ✅ |
| sol | Pestaña inactiva | textoSuave sobre superficiePanel | 17.40:1 | 4.5:1 | ✅ |

Todas las combinaciones alcanzan el mínimo de WCAG 2.2 AA.
