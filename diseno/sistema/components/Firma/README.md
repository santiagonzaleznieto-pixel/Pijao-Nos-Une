# Firma

Signature canvas for the authorization (16.4, step 10 of the visit): the person signs with a finger and accepts.

- 160 px tall, dashed border while empty, with a baseline and the hint «Firme aquí con el dedo». Once accepted, the border turns solid in `tinta`.
- The stroke is 2.6 px in `tinta`, with rounded ends; the canvas does not scroll the page while signing (`touch-action: none`).
- «Aceptar firma» stays disabled until there is a stroke; «Borrar» starts over.
- **What the consumer provides:** the name of whoever signs, and what gets saved on accepting (the signature image, the time and the version of the text read). The signature is stored with the authorization, never in the phone's gallery.
- Accessibility: the canvas carries `aria-label`. Anyone who cannot sign uses another method: verbal recorded, or paper with a photo.
