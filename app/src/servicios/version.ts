// La versión de la app vive en app.json (expo.version); la integración continua la toma de la etiqueta vX.Y.Z.
import Constants from "expo-constants";

export const VERSION_APP: string = Constants.expoConfig?.version ?? "0.0.0";
