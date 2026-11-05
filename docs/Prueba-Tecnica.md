# PIJAO NOS UNE
## Prueba técnica de React Native + Expo (Fase 1, bloque 1.1)

**Para qué sirve:** comprobar en un teléfono real de gama baja que la tecnología recomendada (24.5 del documento maestro) cumple lo que pide la campaña, **antes** de rehacer la app. Con el resultado se toma la decisión 23.1-17 el **30 de noviembre de 2026**.

La app de prueba se llama **«Pijao Prueba»**. No tiene datos reales y no se conecta a la base de la campaña. Se puede instalar al lado de la app actual sin afectarla.

---

## 1. Instalar

1. En el teléfono de prueba, que ojalá tenga 2 GB de memoria y Android 8 o superior, abra en el navegador:
   **https://github.com/santiagonzaleznieto-pixel/Pijao-Nos-Une/releases**
2. Busque la pre-versión más reciente, **«Prueba técnica Expo #…»**, y toque el archivo `.apk`.
3. Android pedirá permitir **«Instalar apps desconocidas»** para el navegador. Acéptelo solo para esta instalación.
4. Abra **Pijao Prueba**.

---

## 2. Las seis pruebas

Cada sección de la pantalla muestra **✔** si pasó y **✖** si falló.

| # | Prueba | Cómo hacerla | Pasa si… |
|---|---|---|---|
| 1 | **Mapa sin conexión** | Mire el mapa de Pijao. Luego active el **modo avión**, cierre la app por completo y vuélvala a abrir | El mapa se ve igual sin señal y dice «Mapa dibujado en … s» con menos de 2 s. El arranque, arriba, marca menos de 3 s |
| 2 | **Jornada de 6 horas con GPS** | Cargue el teléfono al 100 %. Toque **Iniciar jornada** y acepte «Permitir todo el tiempo». Bloquee el teléfono y salga a caminar o trabaje normalmente 6 horas | Aparece la notificación fija «Jornada activa». Al volver hay cientos de puntos y el recorrido naranja en el mapa. La batería no baja de un 30 % por la app (anote el porcentaje al empezar y al terminar) |
| 3 | **Base cifrada** | Toque **Comprobar cifrado** | «La base está cifrada: sin la llave no se puede leer» |
| 4 | **Avisos** | Toque **Programar un aviso** y cierre la app | En 10 segundos llega «Tiene 1 tarea nueva (prueba)» |
| 5 | **Cámara** | Toque **Abrir cámara** y fotografíe una fachada | «Foto comprimida a 1.024 px: … KB», con cerca de 100 KB y nunca más de 150 KB |
| 6 | **Seguridad** | Toque el botón de huella y confirme. Después intente tomar una **captura de pantalla** | Pide la huella o el rostro. La captura sale **negra** o Android dice que no se permite. «Teléfono modificado: no» |

---

## 3. Registro de resultados

Copie esta tabla, llénela y envíela, o escríbala en la conversación.

| Dato | Resultado |
|---|---|
| Modelo del teléfono y memoria | |
| Versión de Android | |
| Arranque (s) | |
| Tiempo del mapa con señal / sin señal (s) | |
| Puntos de la jornada en 6 horas | |
| Batería al inicio / a las 6 horas | |
| ¿La notificación de jornada estuvo siempre visible? | |
| Cifrado | ✔ / ✖ |
| Aviso | ✔ / ✖ |
| Peso de la foto (KB) | |
| Huella y bloqueo de capturas | ✔ / ✖ |
| ¿La app se cerró sola alguna vez? | |
| Observaciones | |

---

## 4. Cómo se decide

- **Pasan las seis:** se toma el **camino A** (React Native con Expo). En diciembre se construye la app nueva al nivel de la v0.10.1, más todo lo del bloque 1.4 al 1.13.
- **Falla el mapa, el GPS o el cifrado y no se puede corregir antes del 30 de noviembre:** se toma el **camino B** y se sigue con Kivy, con sus limitaciones (24.5).
- **Falla algo menor (aviso, huella o foto):** se corrige y se repite solo esa prueba.

## 5. Qué se construyó y con qué

Todo es gratuito y de código abierto (`docs/Analisis-Costo-Cero.md`):
- Expo SDK 58 y React Native 0.88, con licencia MIT.
- MapLibre, con licencia MIT.
- El mapa de Pijao, recortado de OpenStreetMap (licencia ODbL) con Protomaps (BSD).
- op-sqlite con SQLCipher.
- El APK se construye en GitHub Actions (`.github/workflows/prueba-tecnica.yml`), **sin EAS ni cuentas de pago**.
- El código de la prueba está en `prueba-tecnica/`.
