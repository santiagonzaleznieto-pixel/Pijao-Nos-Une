import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../estilo/base.css";
import "../estilo/panel.css";
import { App } from "./App";

// Contra el «clickjacking»: GitHub Pages no permite la cabecera frame-ancestors, así que el panel se niega a
// funcionar dentro de un marco de otro sitio.
const raiz = document.getElementById("panel")!;
if (window.top !== window.self) {
  raiz.textContent = "Por seguridad, el panel solo funciona abierto directamente en su propia pestaña.";
} else {
  createRoot(raiz).render(<StrictMode><App /></StrictMode>);
}
