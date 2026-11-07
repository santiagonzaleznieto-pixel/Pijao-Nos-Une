# Registrar

La acción principal de la app, «Registrar aquí», en sus dos formas: el bloque grande del Inicio y el botón central naranja de la barra inferior.

- Es lo único naranja de la pantalla (`accion-principal` con `sobre-accion-principal`). Nunca hay dos.
- El bloque grande: `pj-registrar` con el cuadro naranja `pj-registrar__icono` (ícono de ubicación) y la flecha. Destella una sola vez al aparecer (1,4 s, después de la cascada); con «reducir movimiento» no destella.
- El botón central: `pj-central`, 56 × 56, siempre con `aria-label="Registrar aquí"`.
- **Lo que pone quien lo usa:** la acción al tocar (abrir «Registrar aquí» y la toma del GPS).
- En letra grande el bloque crece a 72 px de alto con el estilo `boton-grande`.
