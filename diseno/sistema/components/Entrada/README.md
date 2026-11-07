# Entrada

La animación de entrada de la app (unos 4 segundos, una vez por sesión), en su versión de muestra.

1. Los cuatro arcos dibujan el anillo de la marca (600 ms cada uno, escalonados 150 ms).
2. El logo circular llega desde la izquierda con un pequeño giro y se asienta (1 s, `curva-suave` con un leve rebasamiento).
3. PIJAO · NOS · UNE sube línea por línea desde una ranura (800 ms, 120 ms entre líneas), con el degradado de la marca.
4. La línea fina se traza desde el centro y aparece el mensaje corto de la campaña.
5. En la app, todo sale hacia un lado (550 ms, `curva-afilada`), baja el panel superior y el Inicio entra en cascada.

- El mensaje es provisional y lo cambia la campaña; máximo cinco palabras.
- Con «reducir movimiento» todo aparece en 150 ms, sin desplazamientos.
- Solo `transform` y `opacity` (el trazo de los arcos usa `stroke-dashoffset`).
