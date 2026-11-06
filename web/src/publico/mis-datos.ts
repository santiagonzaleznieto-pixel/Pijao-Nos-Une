// P-50 «Mis datos» (16.5): canal público para consultar, corregir, borrar o revocar, con número de caso.
// No pide cédula ni datos de más (16.6): la campaña confirma la identidad cuando responde por el contacto dado.
import "../estilo/base.css";
import { TIPOS_SOLICITUD, ESTADO_SOLICITUD, tituloSolicitud } from "../logica/textos";
import { contactoValido, fecha, normalizarCaso, NUMERO_CASO } from "../logica/utiles";
import { enviarSolicitud, estadoCaso, textosPublicos, type Textos } from "./api";
import { $, aviso, canales, h, montarCabecera, pie } from "./dom";

montarCabecera("Mis datos");
const raiz = $("#app");
let textos: Textos | null = null;
const zonaCanales = h("div", {});

// ----------------------------------------------------------------------------- formulario de solicitud

const tipos = h("fieldset", { style: "border:0;padding:0;margin:0" },
  h("legend", { style: "font-weight:700;margin-bottom:4px" }, "¿Qué quiere hacer?"),
  ...TIPOS_SOLICITUD.map((t, i) =>
    h("label", { class: "opcion" },
      h("input", { type: "radio", name: "tipo", value: t.clave, required: i === 0 }),
      h("span", {}, h("strong", {}, t.titulo), h("br"), h("span", { class: "suave" }, t.explicacion)))));

const formulario = h("form", { class: "tarjeta", novalidate: true, "aria-describedby": "explicacion-form" },
  h("h2", { style: "margin-top:0" }, "Hacer una solicitud"),
  h("p", { id: "explicacion-form", class: "suave" }, "Le respondemos al teléfono o correo que nos deje. Para proteger sus datos, al responder confirmamos que usted es la persona."),
  tipos,
  h("label", { for: "nombre" }, "Su nombre completo"),
  h("input", { id: "nombre", name: "nombre", type: "text", autocomplete: "name", maxlength: "120", required: true }),
  h("label", { for: "contacto" }, "Teléfono o correo para responderle"),
  h("input", { id: "contacto", name: "contacto", type: "text", autocomplete: "tel", maxlength: "120", required: true, inputmode: "text" }),
  h("label", { for: "lugar" }, "Barrio o vereda donde vive (opcional)"),
  h("input", { id: "lugar", name: "lugar", type: "text", maxlength: "120" }),
  h("p", { class: "suave pequeno", style: "margin:4px 0 0" }, "Nos ayuda a encontrar su registro más rápido."),
  h("label", { for: "detalle" }, "Cuéntenos más (opcional)"),
  h("textarea", { id: "detalle", name: "detalle", maxlength: "2000" }),
  // Campo trampa para robots: invisible para las personas y para los lectores de pantalla.
  h("div", { class: "visualmente-oculto", "aria-hidden": "true" },
    h("label", { for: "sitio_web" }, "No llene este campo"),
    h("input", { id: "sitio_web", name: "sitio_web", type: "text", tabindex: "-1", autocomplete: "off" })),
  h("label", { class: "opcion", style: "margin-top:16px" },
    h("input", { type: "checkbox", name: "acepta", required: true }),
    h("span", {}, "Acepto que la campaña use estos datos solo para atender esta solicitud. ",
      h("a", { href: "./politica.html", target: "_blank" }, "Ver la política de datos"))),
  h("div", { id: "mensaje-form", "aria-live": "polite" }),
  h("button", { class: "boton bloque", type: "submit" }, "Enviar solicitud"),
);

function datosDelFormulario() {
  const f = new FormData(formulario);
  return {
    tipo: String(f.get("tipo") ?? ""),
    nombre: String(f.get("nombre") ?? "").trim(),
    contacto: String(f.get("contacto") ?? "").trim(),
    lugar: String(f.get("lugar") ?? "").trim(),
    detalle: String(f.get("detalle") ?? "").trim(),
    sitio_web: String(f.get("sitio_web") ?? ""),
    acepta: f.get("acepta") === "on",
  };
}

function errorDe(d: ReturnType<typeof datosDelFormulario>): string | null {
  if (!d.tipo) return "Elija qué quiere hacer con sus datos.";
  if (d.nombre.length < 3) return "Escriba su nombre completo.";
  if (!contactoValido(d.contacto)) return "Escriba un teléfono (7 números o más) o un correo para responderle.";
  if (!d.acepta) return "Para atender su solicitud necesitamos que acepte el uso de estos datos.";
  return null;
}

formulario.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const mensaje = $("#mensaje-form");
  const d = datosDelFormulario();
  const error = errorDe(d);
  if (error) {
    mensaje.replaceChildren(aviso("error", error));
    return;
  }
  const boton = formulario.querySelector("button")!;
  boton.disabled = true;
  boton.textContent = "Enviando…";
  try {
    const r = await enviarSolicitud(d);
    formulario.replaceChildren(
      h("h2", { style: "margin-top:0" }, "Recibimos su solicitud"),
      aviso("ok", "Su número de caso es:", h("p", { style: "font-size:2rem;font-weight:800;letter-spacing:3px;margin:8px 0 0" }, r.numero_caso)),
      h("p", {}, h("strong", {}, "Guárdelo."), " Con ese número y su contacto puede consultar el estado más abajo."),
      h("p", {}, `Solicitud: ${tituloSolicitud(d.tipo)}.`),
      d.tipo === "revocatoria" || d.tipo === "supresion"
        ? h("p", {}, "Cuando confirmemos su identidad, dejamos de contactarle de inmediato.")
        : "",
      r.plazo_legal ? h("p", {}, `Le responderemos a más tardar el ${fecha(r.plazo_legal)}; normalmente en 5 días hábiles.`) : "",
    );
    formulario.scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    mensaje.replaceChildren(aviso("error", (e as Error).message));
    boton.disabled = false;
    boton.textContent = "Enviar solicitud";
  }
});

// ----------------------------------------------------------------------------- consultar el estado de un caso

const consulta = h("form", { class: "tarjeta", novalidate: true },
  h("h2", { style: "margin-top:0" }, "Consultar el estado de mi caso"),
  h("label", { for: "caso" }, "Número de caso"),
  h("input", { id: "caso", name: "caso", type: "text", maxlength: "12", autocomplete: "off", style: "text-transform:uppercase" }),
  h("label", { for: "contacto-caso" }, "El mismo teléfono o correo que dejó"),
  h("input", { id: "contacto-caso", name: "contacto", type: "text", maxlength: "120" }),
  h("div", { id: "resultado-caso", "aria-live": "polite" }),
  h("button", { class: "boton secundario bloque", type: "submit", style: "margin-top:12px" }, "Consultar"),
);

consulta.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const salida = $("#resultado-caso");
  const f = new FormData(consulta);
  const numero = normalizarCaso(String(f.get("caso") ?? ""));
  const contacto = String(f.get("contacto") ?? "").trim();
  if (!NUMERO_CASO.test(numero) || !contactoValido(contacto)) {
    salida.replaceChildren(aviso("error", "Escriba el número de caso (8 letras y números) y el contacto que dejó."));
    return;
  }
  salida.replaceChildren(h("p", {}, "Consultando…"));
  try {
    const r = await estadoCaso(numero, contacto);
    salida.replaceChildren(r.encontrado
      ? aviso(r.estado === "resuelta" ? "ok" : "alerta",
          h("strong", {}, ESTADO_SOLICITUD[r.estado ?? ""] ?? r.estado ?? ""), h("br"),
          `${tituloSolicitud(r.tipo)} · recibida el ${fecha(r.recibido_en)}`, h("br"),
          r.resuelta_en ? `Respondida el ${fecha(r.resuelta_en)}. La respuesta se envió a su contacto.`
                        : `Plazo de respuesta: ${fecha(r.plazo_legal)}.`)
      : aviso("error", "No encontramos un caso con ese número y ese contacto. Revise los datos."));
  } catch (e) {
    salida.replaceChildren(aviso("error", (e as Error).message));
  }
});

// ----------------------------------------------------------------------------- página

raiz.append(
  h("main", {},
    h("h1", {}, "Mis datos personales"),
    h("p", {}, "Si la campaña Pijao Nos Une tiene datos suyos, usted decide. Puede saber qué datos tenemos, corregirlos, borrarlos o pedir que no le contactemos más. Es gratis y cada solicitud recibe un número de caso."),
    formulario,
    consulta,
    h("section", { class: "tarjeta" }, h("h2", { style: "margin-top:0" }, "Otras formas de hacer su solicitud"), zonaCanales),
  ),
  pie(),
);
zonaCanales.append(canales(null));
textosPublicos()
  .then((t) => { textos = t; zonaCanales.replaceChildren(canales(textos)); })
  .catch(() => { /* sin conexión: quedan el formulario y los colaboradores */ });
