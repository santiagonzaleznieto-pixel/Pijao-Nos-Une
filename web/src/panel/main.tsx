import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../estilo/base.css";
import "../estilo/panel.css";
import { App } from "./App";

createRoot(document.getElementById("panel")!).render(<StrictMode><App /></StrictMode>);
