Pijao Nos Une is the field app and web panel for Jaime González's campaign for mayor of Pijao (Quindío). It is used by collaborators who walk the town house by house, often older adults, out in the sun of the veredas and with no signal; and by the Director and the Administrator on the computer. Every decision here serves three things: **presence, organization and calm**. The style comes from option C («Pulso»), which the campaign chose.

## Content fundamentals

- **Address the user as «usted»**, always. Short, direct sentences, in the voice of a polite neighbor: «Tiene 2 visitas por enviar. Se enviarán solas con señal.»
- **Say what will happen, not how the system works.** «Registrar aquí», not «Crear registro de vivienda». A button names the action; the confirmation names the result («Guardado»).
- **No jargon:** «sin señal» instead of «offline», «enviar» instead of «sincronizar», «teléfono» instead of «dispositivo».
- **Errors explain and offer a way out:** «No se pudo enviar. Lo intentaremos de nuevo cuando haya señal.» Never a technical code, never blame.
- **Before the official campaign period** no text asks for votes or promises anything. Messages talk about listening and building together. The current entry slogan is provisional: «Juntos, casa por casa.»
- **Formats (3.6):** day/month/year dates («7 de noviembre»), 12-hour time with «a. m.» and «p. m.», Bogotá time, thousands with a period (1.284) and percentages with a space (38 %).
- **No emoji** anywhere in the product.
- **Sentence-case capitals.** Uppercase is only for the section label (`etiqueta`) and for the name PIJAO NOS UNE.

## Visual foundations

### Color
- Ground: `fondo` (pure white in light mode). Text: `tinta` (deep navy, never pure black in light mode).
- The four brand colors `marca-azul`, `marca-turquesa`, `marca-verde` and `marca-naranja` appear **together only as the brand gradient**, in three places: the name PIJAO NOS UNE, the coverage bar and the thin line in the entry. Nowhere else: no gradient backgrounds, no gradient buttons.
- **One orange action per screen:** `accion-principal` is reserved for «Registrar aquí» (the center button of the bottom bar, or the orange square of the big block). Text on top is always `sobre-accion-principal`.
- Solid buttons use `accion-secundaria` (navy) with `tinta-invertida`.
- The metric tiles use a tint plus its text: `tinte-azul` + `texto-azul`, `tinte-turquesa` + `texto-turquesa`, `tinte-verde` + `texto-verde`, `tinte-naranja` + `texto-naranja`. The tile's big number goes in its color's text token, or in `tinta` on blue.
- The pure brand colors (turquoise, green, orange) are **never text on white**: they don't reach 4.5:1. For colored text use the `texto-*` tokens.
- **Nothing depends on color alone:** every status carries a word and an icon («✓ Completo», «! Por revisar», «× Incompleto»; «Conectado», «Sin señal»).

### Modes
- **Claro** (default), **Oscuro** and **Modo sol**: maximum contrast for working under the sun of the vereda. Black on white, no tints or shadows; everything is separated with a 2 px black border. Every text in sun mode reaches 7:1.
- **Letra grande** is a type mode, not a color mode. Use the «Letra grande (×1,25)» group, metric tiles go from two columns to one, and the «Registrar aquí» block grows to 72 px tall. It turns on when the phone uses large text or from «Mi perfil».

### Type
- **Montserrat** (the logo's face) for headings, numbers and buttons; **Inter** for reading text. Load both from Google Fonts with system fallbacks (`--font-titulos`, `--font-texto`).
- Scale: `saludo` (one per screen) → `titulo` → `subtitulo` → `etiqueta` for section headers. Running text in `cuerpo`, **16 px minimum**. `apoyo` and `nota` only for one-line metadata, never instructions.
- Every number uses tabular figures (`.pj-num`).

### Spacing, radii and layout
- Screen side margin: `espacio-5` (18 px); in tight cases at least `espacio-4`. Between sections, `espacio-5`. Between metric tiles, `espacio-3`.
- **Touch targets of 48 × 48 or more** (`espacio-12`), even when the icon is smaller.
- Radii by role, from smallest to largest: icon chip `radio-chip` → field `radio-control` → metric tile `radio-tarjeta` → section `radio-seccion` → bottom bar `radio-barra` → panel `radio-panel`. Status pills and filter chips use `radio-pastilla`.
- **Borders or tints, never both, and no cards inside cards.** Metric tiles go tinted with no border; section cards go with `borde` and no tint; link rows go on `superficie`.
- Top panel: `superficie-panel` with rounded bottom corners (`radio-panel`) and soft mountain lines in the brand colors at low intensity.

### Shadows
- Only for what floats: `sombra-flotante` (bottom bar, sheets, dialogs, floating toasts), `sombra-accion` (the «Registrar aquí» block) and `sombra-logo`. Cards don't get shadows. In sun mode there are no shadows.

### Motion
- Every animation uses `duracion-*` and `curva-*`: **180 ms** for touch feedback (the button sinks to 0.965), **350 ms** for toasts and tab changes, **600 ms** for the entrance cascade, **1 s** only for the app entry and the number count-up.
- `curva-suave` for whatever comes in or moves, `curva-afilada` for whatever leaves, `curva-rebote` only for the tab indicator, the logo arriving and dialogs.
- Only `transform` and `opacity` are animated.
- **Entering the app (under 4.5 s, then never again in the session):**
  - the four arcs draw the ring;
  - the circular logo arrives from the left with a small turn;
  - PIJAO · NOS · UNE rises line by line with a glint;
  - the thin line and the short message;
  - everything leaves to the side and the panel drops.
- **Inicio:**
  - the elements arrive in a cascade, 60 ms apart;
  - the numbers count up from zero;
  - the bars fill;
  - the «Registrar aquí» block flashes once.
- If the phone asks to reduce motion, everything appears with a 150 ms fade, with no movement.

### States (18.1)
Every screen has five designed states:
- **Loading:** skeletons with the shape of the content.
- **Empty:** an icon, one sentence and one action.
- **No signal:** says that everything is saved on the phone.
- **Error:** what happened, plus «Reintentar».
- **No permission:** who to ask.

## Iconography
- Line icons drawn inline in SVG: 24 × 24 grid, 2 px stroke (2.4 on small solid buttons), rounded ends and corners, color `currentColor`.
- Decorative icons carry `aria-hidden="true"`; an icon-only button carries `aria-label`.
- Logos: use the files in **Logos** without redrawing them. The circular logo goes clipped to a circle on a white ground, with `sombra-logo`. The text logo is set in Montserrat 900 with the brand gradient (`.pj-marca-texto`) when it needs to scale; the image is used where fidelity matters.
- Pending (Phase 2.4): icons for the 14 programme pillars built from the logo's symbols, and map markers.

## How to use these components
- Load `tokens.css` and `components/bundle.css`. Wrap the screen in `.pj` and set `data-theme` (`light`, `dark` or `sol`) on the root.
- The components are classes, not a JavaScript library: copy the markup from each preview. The app (React Native) translates them into its central theme in block 2.11.
