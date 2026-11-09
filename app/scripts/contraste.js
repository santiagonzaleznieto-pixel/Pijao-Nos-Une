// Auditoría de contraste (WCAG 2.2 AA, Fase 2 bloque 2.9): lee las paletas reales de src/ui/tema.ts y calcula el contraste
// de cada combinación de texto y fondo que usa la app en los modos claro, oscuro y sol.
// Uso: node scripts/contraste.js   (sale con error si alguna combinación no alcanza su mínimo)
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "tema.ts"), "utf8");
const paletas = {};
for (const modo of ["claro", "oscuro", "sol"]) {
  const i = src.indexOf(`\n  ${modo}: {`);
  const j = src.indexOf("},", i);
  const bloque = src.slice(i, j);
  paletas[modo] = Object.fromEntries([...bloque.matchAll(/(\w+): "(#[0-9A-Fa-f]{6})"/g)].map((x) => [x[1], x[2]]));
}

const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [texto, fondo, mínimo, uso]
const pares = [
  ["texto", "fondo", 4.5, "Texto principal"], ["textoSuave", "fondo", 4.5, "Texto de apoyo"], ["textoSuave", "superficie", 4.5, "Apoyo en filas de enlace"],
  ["texto", "superficie", 4.5, "Filas de enlace"], ["texto", "tarjeta", 4.5, "Hoja inferior y barra"], ["invertida", "azul", 4.5, "Botón sólido"],
  ["sobreNaranja", "naranja", 4.5, "Registrar aquí"], ["azulOceano", "fondo", 4.5, "Enlaces"], ["textoRojo", "fondo", 4.5, "Errores y botón de peligro"],
  ["textoAzul", "tinteAzul", 4.5, "Insignia azul"], ["textoTurquesa", "tinteTurquesa", 4.5, "Aviso de información"], ["textoVerde", "tinteVerde", 4.5, "Aviso de éxito y «Completo»"],
  ["textoNaranja", "tinteNaranja", 4.5, "Alerta y «Por revisar»"], ["textoRojo", "tinteRojo", 4.5, "Aviso de error"],
  ["bordeControl", "fondo", 3, "Contorno de campos y casillas"], ["texto", "superficiePanel", 4.5, "Pestaña activa"], ["textoSuave", "superficiePanel", 4.5, "Pestaña inactiva"],
];

let fallas = 0;
console.log("| Modo | Uso | Combinación | Contraste | Mínimo | |");
console.log("|---|---|---|---|---|---|");
for (const [modo, p] of Object.entries(paletas)) {
  for (const [t, f, min, uso] of pares) {
    const r = ratio(p[t], p[f]);
    if (r < min) fallas++;
    console.log(`| ${modo} | ${uso} | ${t} sobre ${f} | ${r.toFixed(2)}:1 | ${min}:1 | ${r >= min ? "✅" : "❌"} |`);
  }
}
console.log(`\n${fallas ? `${fallas} combinaciones no alcanzan el mínimo.` : "Todas las combinaciones alcanzan el mínimo de WCAG 2.2 AA."}`);
process.exit(fallas ? 1 : 0);
