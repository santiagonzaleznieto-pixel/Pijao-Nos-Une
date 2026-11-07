# Boton

Botones de acción en pastilla: sólido (la acción de la pantalla), contorno (la alternativa), suave (cancelar o volver), peligro (acciones que cierran o borran) y solo ícono.

- **Lo que pone quien lo usa:** el texto del botón como verbo de lo que pasa («Guardar visita», no «Aceptar») y, si es solo ícono, un `aria-label`.
- **Clases:** `pj-boton` + `pj-boton--solido` | `--contorno` | `--suave` | `--peligro`; `pj-boton--ancho` lo estira; `pj-boton-icono` para solo ícono. Siempre `pj-toque` para la respuesta al toque.
- Alto mínimo 52 px y zona táctil de 48 px o más. Texto en el estilo `boton`.
- Un solo botón sólido por grupo. El naranja **no** es un botón de esta familia: es `Registrar`.
- Deshabilitado con `disabled` (no solo gris): el lector de pantalla lo anuncia.
