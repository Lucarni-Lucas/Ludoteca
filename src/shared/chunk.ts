/** Parte una lista en tandas de hasta `size`, para los topes de un proveedor o de Postgres. */
export function chunk<T>(values: readonly T[], size: number): readonly T[][] {
  const chunks: T[][] = [];

  for (let start = 0; start < values.length; start += size) {
    chunks.push(values.slice(start, start + size));
  }

  return chunks;
}
