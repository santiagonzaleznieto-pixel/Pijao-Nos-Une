// Portada del sitio: lleva a las páginas públicas y, para el equipo, al panel.
import "../estilo/base.css";
import { $, h, montarCabecera, pie } from "./dom";

montarCabecera("Inicio");
const tarjeta = (href: string, titulo: string, texto: string) =>
  h("a", { class: "tarjeta", href, style: "display:block;text-decoration:none;color:inherit" },
    h("h2", { style: "margin-top:0" }, titulo), h("p", { class: "suave", style: "margin:0" }, texto));

$("#app").append(
  h("main", {},
    h("h1", {}, "Pijao Nos Une"),
    h("p", {}, "Campaña de Jaime González a la Alcaldía de Pijao 2028-2031."),
    tarjeta("./mis-datos.html", "Mis datos", "Consulte, corrija o borre sus datos, o pida que no le contactemos más."),
    tarjeta("./carnet.html", "Verificar un carnet", "Compruebe si quien le visita pertenece al equipo."),
    tarjeta("./politica.html", "Política de datos", "Cómo cuidamos y usamos la información de las familias."),
    h("p", { class: "suave pequeno", style: "margin-top:24px" }, "¿Es del equipo? ", h("a", { href: "./panel.html" }, "Entrar al panel del Director y el Administrador"))),
  pie(),
);
