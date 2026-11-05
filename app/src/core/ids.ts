// Identificadores únicos (UUID v4). Todo registro nace en el teléfono con su id para que un reenvío no lo duplique (8.7).
// En la app se configura con expo-crypto (aleatoriedad criptográfica); en las pruebas, con la de Node.
let generador: () => string = () => {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  throw new Error("Falta configurar el generador de identificadores (configurarGeneradorId)");
};

export function configurarGeneradorId(fn: () => string) {
  generador = fn;
}

export function nuevoId(): string {
  return generador();
}
