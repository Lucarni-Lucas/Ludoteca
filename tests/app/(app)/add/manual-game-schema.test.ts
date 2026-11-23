import { describe, expect, it, vi } from "vitest";

import {
  type CopyRowFormValues,
  entryInputSchema,
  type ManualGameFormValues,
  manualGameInputSchema,
} from "@/app/(app)/add/manual-game-schema";
import { toActionResult } from "@/shared/action-result";
import { InvalidRequestError } from "@/shared/app-error";
import { parseInput } from "@/shared/parse-input";

const request = vi.hoisted(() => ({ locale: "es" as "es" | "en" }));

vi.mock("@/i18n/locale", () => ({ getRequestLocale: async () => request.locale }));

/** Lo que el esquema rechaza llega al manejador como un pedido inválido con su clave de `validation`. */
function validationKeyOf(parse: () => unknown): string | null | undefined {
  try {
    parse();
  } catch (error) {
    return error instanceof InvalidRequestError ? error.validationKey : undefined;
  }
  return undefined;
}

const EMPTY: ManualGameFormValues = {
  title: "Cartas del Faro",
  coverUrl: "",
  pageUrl: "",
  year: "",
  estimatedHours: "",
  copies: [],
  statusId: "",
  score: null,
};

const ROW: CopyRowFormValues = { storeId: "", otherStoreName: "", kind: "purchased", familyOwner: "", kindDetail: "" };

const STORE_ID = "00000000-0000-4000-8000-000000000001";

describe("manualGameInputSchema", () => {
  it("Sin título", () => {
    const values = { ...EMPTY, title: "   " };

    const key = validationKeyOf(() => parseInput(manualGameInputSchema, values));

    expect(key).toBe("titleRequired");
  });

  it("acepta una carga mínima y deja vacío lo opcional", () => {
    const values = EMPTY;

    const input = parseInput(manualGameInputSchema, values);

    expect(input).toEqual({
      title: "Cartas del Faro",
      year: null,
      estimatedHours: null,
      coverUrl: null,
      pageUrl: null,
      statusId: null,
      copies: [],
      score: null,
    });
  });

  it("convierte el año y la duración a números", () => {
    const values = { ...EMPTY, year: "2025", estimatedHours: "12.5" };

    const input = parseInput(manualGameInputSchema, values);

    expect(input.year).toBe(2025);
    expect(input.estimatedHours).toBeCloseTo(12.5, 5);
  });

  it("recorta el título", () => {
    const values = { ...EMPTY, title: "  Faro  " };

    const input = parseInput(manualGameInputSchema, values);

    expect(input.title).toBe("Faro");
  });

  it("elige la tienda de la lista", () => {
    const values = { ...EMPTY, copies: [{ ...ROW, storeId: STORE_ID, kind: "free" as const }] };

    const input = parseInput(manualGameInputSchema, values);

    expect(input.copies[0]?.store).toEqual({ storeId: STORE_ID });
    expect(input.copies[0]?.kind).toBe("free");
  });

  it("prefiere la tienda escrita a mano", () => {
    const values = { ...EMPTY, copies: [{ ...ROW, otherStoreName: " Humble Store " }] };

    const input = parseInput(manualGameInputSchema, values);

    expect(input.copies[0]?.store).toEqual({ otherName: "Humble Store" });
  });

  it("acepta un link https", () => {
    const values = { ...EMPTY, coverUrl: "https://example.com/portada.png" };

    const input = parseInput(manualGameInputSchema, values);

    expect(input.coverUrl).toBe("https://example.com/portada.png");
  });

  it.each(["http://example.com/portada.png", "javascript:alert(1)", "no-es-un-link"])(
    "rechaza el link «%s» que no es https",
    (coverUrl) => {
      const values = { ...EMPTY, coverUrl };

      const key = validationKeyOf(() => parseInput(manualGameInputSchema, values));

      expect(key).toBe("httpsRequired");
    },
  );

  it.each([
    { field: "year", value: "2025.5", validationKey: "yearInvalid" },
    { field: "estimatedHours", value: "-1", validationKey: "durationInvalid" },
  ])("rechaza $field = $value", ({ field, value, validationKey }) => {
    const values = { ...EMPTY, [field]: value };

    const key = validationKeyOf(() => parseInput(manualGameInputSchema, values));

    expect(key).toBe(validationKey);
  });

  it("rechaza un id de tienda mal formado", () => {
    const values = { ...EMPTY, copies: [{ ...ROW, storeId: "steam", kind: "free" as const }] };

    const parse = () => parseInput(manualGameInputSchema, values);

    expect(parse).toThrow(InvalidRequestError);
  });
});

describe("manualGameInputSchema y el año de lanzamiento", () => {
  it("deja el rango del año al modelo y solo pide un entero", () => {
    const values = { ...EMPTY, year: "-2017" };

    const input = parseInput(manualGameInputSchema, values);

    expect(input.year).toBe(-2017);
  });
});

describe("las copias y el puntaje del alta", () => {
  it("deja sin tienda una fila sin elegir, para que el modelo la frene", () => {
    const values = { ...EMPTY, copies: [{ ...ROW, kind: "free" as const }] };

    const input = parseInput(manualGameInputSchema, values);

    expect(input.copies).toEqual([{ store: null, kind: "free", acquiredOn: null, familyOwner: null, kindDetail: null }]);
  });

  it("recorta el detalle de una copia Otro y deja su tope al modelo", () => {
    const values = { ...EMPTY, copies: [{ ...ROW, storeId: STORE_ID, kind: "other" as const, kindDetail: "  Regalo  " }] };

    const input = parseInput(manualGameInputSchema, values);

    expect(input.copies[0]?.kindDetail).toBe("Regalo");
  });

  it("pasa el puntaje tal cual", () => {
    const values = { ...EMPTY, score: 9.5 };

    const input = parseInput(manualGameInputSchema, values);

    expect(input.score).toBe(9.5);
  });

  it("el alta desde IGDB usa el mismo esquema de copias, estado y puntaje", () => {
    const values = { copies: [{ ...ROW, storeId: STORE_ID }], statusId: "", score: null };

    const input = parseInput(entryInputSchema, values);

    expect(input).toEqual({
      statusId: null,
      copies: [{ store: { storeId: STORE_ID }, kind: "purchased", acquiredOn: null, familyOwner: null, kindDetail: null }],
      score: null,
    });
  });
});

describe("las horas jugadas del alta", () => {
  it("convierte las horas a número", () => {
    const values = { ...EMPTY, playedHours: "12.5" };

    const input = parseInput(manualGameInputSchema, values);

    expect(input.playedHours).toBe(12.5);
  });

  it("vacío no manda horas", () => {
    const values = { ...EMPTY, playedHours: "  " };

    const input = parseInput(manualGameInputSchema, values);

    expect(input).not.toHaveProperty("playedHours");
  });

  it("rechaza algo que no es un número con el mensaje de la spec", () => {
    const values = { ...EMPTY, playedHours: "muchas" };

    const key = validationKeyOf(() => parseInput(manualGameInputSchema, values));

    expect(key).toBe("playedHours");
  });
});

describe("Formulario sin título", () => {
  it.each([
    { locale: "en", message: "Enter the game’s title" },
    { locale: "es", message: "Poné el título del juego" },
  ] as const)("el manejador da el aviso en $locale", async ({ locale, message }) => {
    request.locale = locale;
    const values = { ...EMPTY, title: "" };

    const result = await toActionResult(() => parseInput(manualGameInputSchema, values));

    expect(result).toEqual({ ok: false, error: { code: "INVALID_REQUEST", message } });
  });
});
