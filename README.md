# Pijao nos une (Android)

App de campo de la campaña «Pijao nos une» (Alcaldía de Pijao, Quindío, 2028–2031).

**Restricción del proyecto:** costo recurrente cero. Solo se usan herramientas gratuitas y de código abierto, y Supabase en su plan gratuito (`docs/Analisis-Costo-Cero.md`).

## Documentos

| Documento | Para qué |
|---|---|
| `docs/Pijao-Nos-Une_Documento-Maestro_Fase1.md` | Qué hace la app y con qué reglas (v1.1). La sección 24 dice el estado real |
| `docs/Plan-de-Construccion.md` | Las 4 fases de construcción, con tareas marcables y un anexo de trazabilidad |
| `docs/Analisis-Costo-Cero.md` | Tecnologías gratuitas, límites del plan gratuito y costos ocultos |
| `docs/Entrega-y-Firma.md` | Firma del APK, versiones, migraciones, pasos en el panel de Supabase y respaldos |

## Poner en marcha

1. Cree el proyecto en Supabase (plan gratuito).
2. Aplique **en orden** `supabase/migrations/0001` a `0013`.
3. Siga los pasos de `docs/Entrega-y-Firma.md` §3: desactivar el registro abierto, contraseña mínima de 12, TOTP, pg_cron, Vault con `pii_key` y la función `registrar-con-codigo`.
4. Defina `PIJAO_SUPABASE_URL` y `PIJAO_SUPABASE_ANON_KEY` (la clave `anon`, **nunca** la `service_role`).
5. Para probar en el computador:

```bash
pip install -r requirements.txt && python main.py
```

## Pruebas (antes de cada cambio)

Revisión estática:

```bash
python tools/revisar_codigo.py
```

Pruebas unitarias y de interfaz (con `tools/kivy_falso.py`, sin celular):

```bash
python -m unittest discover -s tests -t .
```

Recorrido completo de la interfaz:

```bash
python tools/probar_ui.py
```

Migraciones y pruebas de seguridad SQL en Docker:

```bash
bash tools/probar_migraciones.sh
```

La integración continua (`.github/workflows/pruebas.yml`) corre todo esto en cada cambio. El APK solo se construye si pasa.

## APK

- **Prueba:** cada cambio en `main` construye un APK en GitHub Actions (artefacto `pijao-nos-une-apk`).
- **Producción:** con una etiqueta `vX.Y.Z` se construye el APK firmado con la llave fija y se publica en GitHub Releases (`docs/Entrega-y-Firma.md` §2).

## Estado

App v0.11.0, Fase 1 del plan en curso. Ver el plan para el detalle.

- **Hecho en la Fase 1:**
  - seguridad del servidor: hallazgos A1 a A8 y M1 a M7, con 34 comprobaciones SQL;
  - integración continua con pruebas antes de construir;
  - firma fija del APK y publicación en Releases;
  - respaldo propio y mantenimiento del plan gratuito;
  - reporte de errores y salud de la flota en el servidor.
- **Pendiente en la Fase 1:** prueba técnica de React Native con Expo y decisión de tecnología; base local cifrada y bloqueo de capturas en el teléfono; foto de fachada; mapa sin conexión; verificación en dos pasos en la app; panel web inicial.
