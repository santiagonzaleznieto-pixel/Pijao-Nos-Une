# Aviso

Avisos dentro de la pantalla: información, éxito, alerta, error y flotante (el que sube sobre la barra inferior y se va solo a los 2,4 s).

- Cada tipo lleva **ícono y texto**, nunca solo el color: información ⓘ, éxito ✓, alerta △, error ×.
- `role="status"` para los informativos, `role="alert"` solo para errores que piden atención.
- Texto en `cuerpo` (16 px). Una o dos frases: qué pasó y qué hacer.
- Entran con 350 ms de `curva-suave`.
- **Lo que pone quien lo usa:** el mensaje, sin códigos técnicos ni datos personales.
