# PIJAO NOS UNE
## Guía de entrega: firma, versiones, migraciones y respaldos

Esta guía explica cómo se publica la app sin servicios de pago (ver `docs/Analisis-Costo-Cero.md`). La escribe la Fase 1, en el bloque 1.2 del plan.

---

## 1. Llave de firma del APK (una sola vez)

**Por qué importa:** Android solo acepta una actualización si viene firmada con la **misma llave**. Si la llave cambia, hay que desinstalar la app, y **desinstalar borra las visitas que no se han enviado** (hallazgo B1).

### 1.1 Crear las dos llaves

Hace falta Java, que es gratuito. Por ejemplo Eclipse Temurin 17, de adoptium.net. En una terminal:

```bash
keytool -genkeypair -v -keystore pijao-release.keystore -alias pijao -keyalg RSA -keysize 4096 -validity 10000
```

```bash
keytool -genkeypair -v -keystore pijao-debug.keystore -alias androiddebugkey -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
```

La primera es la llave de **producción**. La segunda es la llave **de prueba**, con la contraseña estándar `android`.

### 1.2 Guardarlas como secretos de GitHub

Se guardan en el repositorio, en **Settings → Secrets and variables → Actions → New repository secret**. Cada valor en base64 se saca así:

```bash
base64 -w0 pijao-release.keystore
```

| Secreto | Valor |
|---|---|
| `ANDROID_RELEASE_KEYSTORE_B64` | `pijao-release.keystore` en base64 |
| `ANDROID_RELEASE_KEYSTORE_PASSWORD` | La contraseña del almacén |
| `ANDROID_RELEASE_KEY_ALIAS` | `pijao` |
| `ANDROID_RELEASE_KEY_PASSWORD` | La contraseña de la llave |
| `ANDROID_DEBUG_KEYSTORE_B64` | `pijao-debug.keystore` en base64 |

### 1.3 Respaldo de las llaves

- Guarde los dos archivos `.keystore` y sus contraseñas **fuera de línea**: una USB cifrada y una copia en papel de las contraseñas, en manos del segundo custodio (decisión 23.1-19).
- **Nunca** los suba al repositorio. El `.gitignore` ya los excluye.

---

## 2. Publicar una versión

1. Todo cambio entra por una rama y una solicitud de cambio (pull request). El flujo **Pruebas** debe quedar en verde:
   - revisión estática;
   - 87 o más pruebas de Python;
   - las 13 o más migraciones aplicadas en Docker;
   - las pruebas de seguridad SQL.
2. Se une a `main`.
3. Se crea la etiqueta de la versión:

```bash
git tag v0.11.0
```

```bash
git push origin v0.11.0
```

4. El flujo **Construir APK**:
   1. corre las pruebas;
   2. construye el APK de producción con la versión de la etiqueta;
   3. lo firma con la llave fija;
   4. lo publica en **GitHub Releases**, con descarga gratuita.
5. Para obligar a actualizar (N-13), suba el valor `version_minima_app` en la configuración (P-42 o tabla `configuracion`).

La versión de la app vive solo en `pijao/__init__.py`. La integración continua la reemplaza con la de la etiqueta.

---

## 3. Migraciones de la base de datos

- **Primero en local:**

```bash
bash tools/probar_migraciones.sh
```

  Levanta `supabase/postgres` en Docker, aplica todas las migraciones y corre `supabase/tests/*.sql`.
- **Después en producción:** aplique la migración nueva desde el editor SQL del panel de Supabase, en orden, una sola vez. Cuando la CLI de Supabase funcione en el equipo, use `supabase db push`.

### Pasos manuales después de aplicar la 0013

En el panel de Supabase:

1. **Authentication → Sign In / Providers → Email:** desactive **Allow new users to sign up** (hallazgo A8). Las cuentas solo se crean con la función `registrar-con-codigo`.
2. **Authentication → Policies (Password):** longitud mínima de **12**.
3. **Authentication → Multi-Factor:** active **TOTP** (aplicación autenticadora). Es gratuito. No active SMS: cuesta dinero.
4. **Database → Extensions:** active **pg_cron** y vuelva a ejecutar el bloque `R-31` de la 0013 si dio un aviso.
5. **Edge Functions:** vuelva a desplegar `registrar-con-codigo`.
6. Verifique que el secreto `pii_key` exista en **Vault**.

**Importante:** desde la 0013, el Director y el Administrador necesitan la verificación en dos pasos para ver datos completos y para las acciones destructivas.

### Pasos después de aplicar la 0016 (cuentas y sesiones)

1. **Correo de la campaña para recuperar el acceso (P-07).** Sin un servidor de correo propio, Supabase solo envía correos a los miembros del equipo del proyecto, así que la recuperación no le llegaría a un colaborador. Es gratis con Gmail:
   1. En la cuenta de Gmail de la campaña, active la verificación en dos pasos y cree una **contraseña de aplicación** (Cuenta de Google → Seguridad → Contraseñas de aplicaciones).
   2. En Supabase, **Authentication → Emails → SMTP Settings:** active *Custom SMTP* con host `smtp.gmail.com`, puerto `465`, usuario = el correo de la campaña, contraseña = la contraseña de aplicación, remitente «Pijao Nos Une».
   3. Gmail permite unos 500 correos al día: de sobra para recuperar contraseñas.
2. **Plantilla del correo de recuperación:** en **Authentication → Emails → Reset password**, el correo debe mostrar el código `{{ .Token }}`, porque la app pide el código y no usa enlaces. Asunto sugerido: «Su código para entrar a Pijao Nos Une».
3. La tarea `pijao_cuentas` de pg_cron corre cada hora (minuto 20): cierra las sesiones vencidas (R-33) y suspende a los colaboradores sin actividad (4.9). Los valores se cambian en P-42 (`sesion_horas_*`, `inactividad_suspension_dias`, `acuerdos_vigencia_dias`).

### Estado de producción (7 de noviembre de 2026)

Aplicado en el proyecto `pijao-nos-une` con el conector de Supabase y verificado:

| Paso | Estado |
|---|---|
| Migraciones 0001 a 0012 (más una `0012b` que ya está incluida en la 0012 del repositorio) | ✅ Estaban |
| pg_cron activado (`0012c_extensiones_pg_cron`) y borrado nocturno de ubicaciones programado | ✅ |
| Migración 0013, aplicada en tres partes (`0013_seguridad_fase1_parte1..3`), mismo contenido que el archivo | ✅ 18 de 18 funciones, cadena de auditoría y políticas de fotos |
| Migración 0014, aplicada en dos partes (`0014_panel_web_paginas_publicas_parte1..2`) | ✅ Las páginas públicas responden con la clave pública; esa clave no lee tablas |
| Migración 0015 (permisos de los disparadores, aviso 0029 de Supabase) | ✅ |
| Migración 0016 (cuentas y sesiones: R-33, suspensión automática, R-45, avisos de la cuenta) | ✅ Aplicada el 7 nov 2026: tarea `pijao_cuentas` cada hora y disparador de contraseña cambiada |
| Migración 0017 (guion y preguntas frecuentes, métricas del piloto, revisión mensual de permisos con la tarea `pijao_revision_permisos`) | ✅ Aplicada el 7 nov 2026. Verificado: la clave pública y las cuentas no leen `metricas_piloto` ni `avisos_cuenta`, y las tareas internas no se pueden lanzar desde la app |
| Migración 0018 (cumpleaños y varios canales en personas, sostén sin «Relación», panel de seguridad, estado de incidentes y de necesidades) | ✅ Aplicada el 10 nov 2026 con autorización del dueño. Verificado en producción con una visita de prueba que se deshizo: calidad verde, cumpleaños tomado de la fecha de nacimiento, dos canales guardados y panel de seguridad respondiendo |
| Migración 0019 (eventos del equipo) | ✅ Aplicada el 10 nov 2026. Verificado: tabla con seguridad por filas, nadie escribe sin la función y el Director crea eventos |
| Función `registrar-con-codigo` desplegada (versión 2, IP de cabeceras no falsificables) | ✅ Responde con el mensaje genérico |
| Secreto `pii_key` en Vault | ✅ Existe |
| Pasos 1, 2 y 3 de esta sección (registro abierto, contraseña de 12, TOTP) | ✅ Registro abierto desactivado (un registro público de prueba responde `signup_disabled`; la función de registro usa la API de administración y no se ve afectada), contraseña mínima 12, TOTP activo y SMS apagado. «Limit duration of AAL1 sessions» queda apagado a propósito: cerraría la sesión de los colaboradores, que no usan verificación en dos pasos |
| El Administrador y el Director inscriben su aplicación autenticadora | ⏳ Hoy ninguno la tiene: háganlo al primer ingreso al panel web |
| Canales de atención (correo y WhatsApp) en Configuración → Integraciones | ⏸️ Por ahora la campaña no tiene; quedan vacíos y las páginas públicas ofrecen el formulario «Mis datos» y la atención en persona. Cuando existan, se fijan desde el panel |

Avisos de Supabase revisados: las funciones `rpc_*` ejecutables y las vistas enmascaradas `personas_v` y `directorio_v` son intencionales (cada función valida quién llama y las vistas filtran por rol). «Leaked password protection» solo existe en el plan de pago; la función de registro rechaza las contraseñas comunes con una lista propia.

---

## 4. Respaldos (el plan gratuito no los incluye)

1. Una sola vez, en el computador del Administrador:

```bash
powershell -ExecutionPolicy Bypass -File tools/respaldo.ps1 -Configurar
```

   Guarda, cifradas para su usuario de Windows, la cadena de conexión, la clave `service_role` y la frase del respaldo.
2. Programe la tarea cada noche en el **Programador de tareas de Windows** con el comando:

```bash
powershell -ExecutionPolicy Bypass -File tools/respaldo.ps1
```

3. Cada semana, copie la carpeta `Documentos\PijaoRespaldos` a una USB guardada aparte.
4. Cada mes, pruebe la restauración: descifre el archivo y restaure `base.dump` en el Supabase local de Docker.

```bash
powershell -ExecutionPolicy Bypass -File tools/respaldo.ps1 -Descifrar <archivo>
```

5. **Nunca** suba respaldos a GitHub: el repositorio es público.

---

## 5. Mantener activo el proyecto gratuito

El flujo `.github/workflows/mantener-activo.yml` consulta la base los lunes y jueves con la clave pública, para que Supabase no pause el proyecto. Si sale un aviso, revise el panel.
