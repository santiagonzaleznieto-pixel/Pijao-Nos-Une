# Diseño (Fase 2)

Copia en el repositorio de lo que se diseña en Claude Design. Si una de las páginas privadas se pierde, el diseño no se pierde.

| Carpeta | Qué guarda | Página en Claude (privada) |
|---|---|---|
| `sistema/` | El **sistema de diseño**: medidas base en `tokens.json` (colores en claro, oscuro y modo sol; letras; espacios; radios; sombras; tiempos de animación), el manual de marca en `README.md`, los estilos de los componentes en `components/bundle.css` y cada componente con su guía (`README.md`) y su muestra (`preview.html`) | https://claude.ai/artifact/QRhRen1fKqyW9bvE4i7pMy |
| `lienzo/` | Las tres propuestas de Inicio (A Institucional, B Territorio, C Pulso) y la **C refinada con animaciones** (entrada de la app e Inicio), que eligió la campaña | https://claude.ai/artifact/ReqX728bukSmmqzNM7wUct |

- Los logos están subidos a esas páginas y no se copian aquí como imagen; las muestras los cargan desde allá.
- Para pasar el diseño a la app, en el bloque 2.11, se toman los valores de `sistema/tokens.json` y van al tema central del código (`app/src/ui/tema.ts`), en un solo lugar.
- Cuando el diseño cambie en Claude, se actualiza esta copia en el mismo cambio.
