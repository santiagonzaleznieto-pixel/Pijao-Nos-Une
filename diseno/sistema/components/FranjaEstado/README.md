# FranjaEstado

La pastilla de estado del panel superior: conexión, registros por enviar y, desde la Fase 3, la jornada activa.

- El punto verde late (onda de 2 s) solo cuando hay conexión; sin señal queda quieto y cambia de color, y **el texto siempre dice el estado**, nunca solo el color.
- **Lo que pone quien lo usa:** el texto de estado («Conectado · 2 visitas por enviar», «Sin señal · todo se guarda en el teléfono»). Tocarla abre «Mis visitas y pendientes».
- Clases: `pj-estado` con `pj-punto` (o `pj-punto pj-punto--sin-senal`). Texto en `apoyo`.
