// P-52 Verificación del carnet (10.7): al escanear el QR, cualquier familia comprueba si quien la visita pertenece al
// equipo y si su carnet está vigente. Protege a la gente de impostores.
import "../estilo/base.css";
import { idDeCarnet, fecha, fechaHora } from "../logica/utiles";
import { textosPublicos, verificarCarnet } from "./api";
import { $, aviso, canales, h, montarCabecera, pie } from "./dom";

montarCabecera("Verificar un carnet");
const raiz = $("#app");
const contenido = h("main", {});
raiz.append(contenido, pie());

const id = idDeCarnet(location.search);

if (!id) {
  contenido.append(
    h("h1", {}, "Verificar un carnet"),
    h("div", { class: "tarjeta" },
      h("p", {}, "Toda persona del equipo de Pijao Nos Une lleva un carnet digital con un código QR."),
      h("p", {}, "Pídale que se lo muestre y escanéelo con la cámara de su teléfono. Esta página le dirá si la persona pertenece al equipo y si su carnet está vigente."),
      h("p", { class: "suave" }, "Si el código no abre esta página, o la página dice que no está vigente, no entregue sus datos.")),
  );
} else {
  const estado = h("div", { class: "tarjeta", "aria-live": "polite" }, h("p", {}, "Consultando…"));
  contenido.append(h("h1", {}, "Verificar un carnet"), estado);
  verificarCarnet(id)
    .then((c) => {
      estado.replaceChildren();
      if (c.vigente) {
        estado.append(
          aviso("ok", h("strong", { style: "font-size:1.4rem" }, "✔ Carnet vigente")),
          h("p", { style: "font-size:1.3rem;font-weight:700;margin-top:12px" }, c.nombre ?? ""),
          h("p", {}, c.rol ?? ""),
          h("p", { class: "suave" }, `Vigente hasta el ${fecha(c.vence)}.`),
          h("p", {}, "Esta persona pertenece al equipo. Aun así, usted decide qué datos comparte: todo es voluntario y puede negarse."),
        );
      } else {
        estado.append(
          aviso("error", h("strong", { style: "font-size:1.4rem" }, "✖ Carnet NO vigente")),
          h("p", {}, "Este código no corresponde a una persona activa del equipo, o su carnet ya venció."),
          h("p", {}, h("strong", {}, "No entregue sus datos."), " Si cree que alguien se está haciendo pasar por la campaña, avísenos:"),
        );
        textosPublicos().then((t) => estado.append(canales(t))).catch(() => estado.append(canales(null)));
      }
      estado.append(h("p", { class: "suave pequeno" }, `Consultado el ${fechaHora(c.consultado_en)}.`));
    })
    .catch((e: Error) => {
      estado.replaceChildren(
        aviso("alerta", e.message),
        h("p", {}, "No pudimos comprobar el carnet en este momento. Por precaución, espere a comprobarlo antes de entregar sus datos."),
        h("button", { class: "boton secundario", type: "button", id: "reintentar" }, "Intentar de nuevo"),
      );
      $("#reintentar").addEventListener("click", () => location.reload());
    });
}
