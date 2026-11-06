// Panel web y páginas públicas: sitio estático (sin servidor propio) publicado gratis en GitHub Pages.
// Cada página pública es una entrada aparte, sin React, para que cargue rápido con datos móviles (18.7).
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vitest/config";
import { SUPABASE_URL } from "./src/config.ts";

const aqui = (ruta: string) => fileURLToPath(new URL(ruta, import.meta.url));

// Política de seguridad de contenido (solo en la versión publicada; el servidor de desarrollo usa scripts en línea).
// El sitio solo habla con Supabase y nunca carga scripts de otros dominios.
function politicaDeContenido(): Plugin {
  const host = new URL(SUPABASE_URL).host;
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' https://${host} wss://${host}`,
    "worker-src 'self' blob:",
    "child-src blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
  return {
    name: "pijao-csp",
    apply: "build",
    transformIndexHtml: (html) =>
      html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), politicaDeContenido()],
  resolve: { alias: { "@nucleo": aqui("../app/src/core") } },
  server: { fs: { allow: [aqui("..")] } },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        index: aqui("index.html"),
        panel: aqui("panel.html"),
        "mis-datos": aqui("mis-datos.html"),
        carnet: aqui("carnet.html"),
        politica: aqui("politica.html"),
      },
    },
  },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
