// El mapa sin conexión de Pijao viaja dentro de la app como archivo .pmtiles.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("pmtiles", "pbf");   // pbf: letras de los números de los predios

module.exports = config;
