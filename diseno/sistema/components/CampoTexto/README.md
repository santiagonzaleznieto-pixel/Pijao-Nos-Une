# CampoTexto

Campo de formulario con rótulo arriba, ayuda y error.

- El rótulo siempre visible arriba (no solo el texto de ejemplo), en Montserrat semibold de 15 px; el texto escrito en `cuerpo` de 16 px.
- 52 px de alto, `radio-control`, borde `borde-control` (3:1); al enfocar, anillo `foco` de 3 px.
- El error dice cómo arreglarlo («La cédula tiene de 6 a 10 números»), va en `texto-rojo` con `aria-invalid` y `aria-describedby`.
- **Lo que pone quien lo usa:** el rótulo, la ayuda, la validación y el teclado adecuado (`inputmode`).
