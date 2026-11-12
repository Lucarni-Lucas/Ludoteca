import type { Locator } from "@playwright/test";

/** El acento de los lienzos y de `tokens.css` (#C8F25A), con margen para el suavizado de bordes. */
const ACCENT = { r: 200, g: 242, b: 90 };
const COLOR_TOLERANCE = 40;
// Una fila que cruza solo el círculo, no la barra, tiene a lo sumo su diámetro en píxeles de acento.
const MAX_CIRCLE_ROW_WIDTH = 24;

type Run = Readonly<{ first: number; last: number }>;

/**
 * El centro horizontal del círculo de una barra, medido sobre los píxeles de una captura y relativo a su borde
 * izquierdo. Sirve igual para el input nativo de los lienzos y para la barra de Radix de la app.
 */
export async function circleCenterX(slider: Locator): Promise<number> {
  const png = await slider.screenshot({ scale: "css", animations: "disabled" });

  const runs = await slider.page().evaluate(
    async ({ base64, accent, tolerance }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context?.drawImage(image, 0, 0);
      const pixels = context?.getImageData(0, 0, image.width, image.height).data ?? new Uint8ClampedArray();
      const isAccent = (index: number) =>
        Math.abs(pixels[index] - accent.r) < tolerance &&
        Math.abs(pixels[index + 1] - accent.g) < tolerance &&
        Math.abs(pixels[index + 2] - accent.b) < tolerance;

      const found: { first: number; last: number }[] = [];
      for (let y = 0; y < image.height; y += 1) {
        const xs: number[] = [];
        for (let x = 0; x < image.width; x += 1) {
          if (isAccent((y * image.width + x) * 4)) {
            xs.push(x);
          }
        }
        if (xs.length > 0) {
          found.push({ first: xs[0], last: xs[xs.length - 1] });
        }
      }
      return found;
    },
    { base64: png.toString("base64"), accent: ACCENT, tolerance: COLOR_TOLERANCE },
  );

  const circleRows = runs.filter(({ first, last }: Run) => last - first + 1 <= MAX_CIRCLE_ROW_WIDTH);

  if (circleRows.length === 0) {
    throw new Error("No se encontró el círculo de la barra en la captura");
  }

  // Cada fila del círculo es simétrica respecto del centro: se promedian los puntos medios.
  const middles = circleRows.map(({ first, last }: Run) => (first + last + 1) / 2);
  return middles.reduce((sum, middle) => sum + middle, 0) / middles.length;
}
