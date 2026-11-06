# Núcleo de reglas (TypeScript puro)

Reglas de negocio sin dependencias de Expo ni de React Native. Las usan la app (`app/`) y el panel web (`web/`, con el alias `@nucleo`).

`tsconfig.json` de esta carpeta existe para que el compilador del panel web no herede la configuración de la app (`expo/tsconfig.base`), que solo existe cuando están instaladas las dependencias de la app.
