// P-53 Política de tratamiento de datos y aviso de privacidad (16.3): siempre disponible por QR y enlace.
// Los textos vienen de la base (P-42, con versiones) y se muestran como texto plano, nunca como HTML.
import "../estilo/base.css";
import { fecha } from "../logica/utiles";
import { textosPublicos, type TextoLegal } from "./api";
import { $, aviso, canales, h, montarCabecera, pie } from "./dom";

montarCabecera("Política de datos");
const raiz = $("#app");
const contenido = h("main", {}, h("h1", {}, "Tratamiento de datos personales"), h("p", {}, "Cargando…"));
raiz.append(contenido, pie());

function seccion(titulo: string, ancla: string, t: TextoLegal | null) {
  const s = h("section", { class: "tarjeta", id: ancla }, h("h2", { style: "margin-top:0" }, titulo));
  if (!t) {
    s.append(h("p", { class: "suave" }, "Este texto todavía no está publicado."));
    return s;
  }
  if (t.borrador) {
    s.append(aviso("alerta", "Borrador: este texto está pendiente de la revisión del abogado de la campaña."));
  }
  s.append(
    h("div", { class: "texto-legal" }, t.contenido),
    h("p", { class: "suave pequeno" }, `Versión ${t.version} · actualizada el ${fecha(t.actualizado)}.`),
  );
  return s;
}

textosPublicos()
  .then((t) => {
    contenido.replaceChildren(
      h("h1", {}, "Tratamiento de datos personales"),
      t.responsable ? h("p", {}, h("strong", {}, "Responsable: "), t.responsable) : "",
      h("nav", { class: "tarjeta", "aria-label": "Contenido" },
        h("a", { href: "#aviso" }, "Aviso de privacidad"), " · ",
        h("a", { href: "#politica" }, "Política de tratamiento"), " · ",
        h("a", { href: "#derechos" }, "Sus derechos")),
      seccion("Aviso de privacidad", "aviso", t.aviso),
      seccion("Política de tratamiento de datos", "politica", t.politica),
      h("section", { class: "tarjeta", id: "derechos" },
        h("h2", { style: "margin-top:0" }, "Sus derechos y cómo ejercerlos"),
        h("p", {}, "Usted puede conocer, actualizar, corregir y borrar sus datos, retirar su autorización, pedir la prueba de lo que autorizó y presentar quejas ante la Superintendencia de Industria y Comercio."),
        h("p", {}, "Cada solicitud recibe un número de caso. «No contactar» se aplica de inmediato. Puede escribirnos por:"),
        canales(t)),
    );
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  })
  .catch((e: Error) => {
    contenido.replaceChildren(
      h("h1", {}, "Tratamiento de datos personales"),
      aviso("alerta", e.message),
      h("p", {}, "No pudimos cargar el texto en este momento. Intente de nuevo en unos minutos o pida el texto impreso a cualquier colaborador del equipo."),
    );
  });
