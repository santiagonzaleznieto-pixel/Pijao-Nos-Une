// Ayudas mínimas para armar las páginas públicas sin librerías. Todo texto entra con textContent: nunca innerHTML,
// así un texto guardado en la base (por ejemplo, la política) no puede inyectar código en la página.
import { DEMO, type Textos } from "./api";

type Hijo = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K, atributos: Record<string, string | boolean | undefined> = {}, ...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) {
    if (v === undefined || v === false) continue;
    if (k === "class") el.className = String(v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const hijo of hijos) if (hijo) el.append(hijo);
  return el;
}

export const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

export function aviso(tipo: "ok" | "error" | "alerta", ...hijos: Hijo[]) {
  return h("div", { class: `aviso ${tipo}`, role: tipo === "error" ? "alert" : "status" }, ...hijos);
}

/** Cabecera común con la franja de colores y, en modo demostración, un aviso visible. */
export function montarCabecera(titulo: string) {
  document.title = `${titulo} · Pijao Nos Une`;
  const raiz = $("#app");
  raiz.before(h("div", { class: "franja", "aria-hidden": "true" }));
  raiz.prepend(
    h("header", { class: "cabecera" }, h("a", { class: "marca", href: "./index.html" }, "Pijao ", h("span", {}, "Nos Une"))),
    DEMO ? aviso("alerta", "Modo demostración: los datos son de ejemplo y nada se envía.") : "",
  );
}

/** Canales de atención de 16.5: correo, WhatsApp, el formulario y cualquier colaborador. */
export function canales(t: Textos | null): HTMLElement {
  const lista = h("ul", {});
  if (t?.correo) lista.append(h("li", {}, "Correo: ", h("a", { href: `mailto:${t.correo}` }, t.correo)));
  if (t?.whatsapp) {
    const numero = t.whatsapp.replace(/\D/g, "");
    lista.append(h("li", {}, "WhatsApp: ", h("a", { href: `https://wa.me/${numero}`, rel: "noopener" }, t.whatsapp)));
  }
  lista.append(h("li", {}, "El formulario ", h("a", { href: "./mis-datos.html" }, "«Mis datos»"), " de esta página."));
  lista.append(h("li", {}, "Cualquier colaborador del equipo, en persona."));
  return lista;
}

export function pie() {
  return h("footer", { class: "pie" },
    h("a", { href: "./mis-datos.html" }, "Mis datos"),
    h("a", { href: "./politica.html" }, "Política de datos"),
    h("a", { href: "./carnet.html" }, "Verificar un carnet"),
    h("p", {}, "Campaña Pijao Nos Une · Alcaldía de Pijao 2028-2031"));
}
