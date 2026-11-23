import { describe, expect, it } from "vitest";
import { z } from "zod";

import { InvalidRequestError } from "@/shared/app-error";
import { parseInput } from "@/shared/parse-input";

const schema = z.object({
  title: z.string().trim().min(1, { error: "titleRequired" }),
  id: z.uuid().optional(),
});

function thrownBy(parse: () => unknown): unknown {
  try {
    parse();
  } catch (error) {
    return error;
  }
  return null;
}

describe("parseInput", () => {
  it("devuelve los datos normalizados", () => {
    const input = { title: "  Hades  " };

    const result = parseInput(schema, input);

    expect(result).toEqual({ title: "Hades" });
  });

  it("usa la clave propia del esquema", () => {
    const input = { title: "   " };

    const error = thrownBy(() => parseInput(schema, input));

    expect(error).toBeInstanceOf(InvalidRequestError);
    expect(error).toMatchObject({ code: "INVALID_REQUEST", validationKey: "titleRequired" });
  });

  it("no deja salir un mensaje interno de Zod", () => {
    const input = { title: "Hades", id: "no-es-un-uuid" };

    const error = thrownBy(() => parseInput(schema, input));

    expect(error).toBeInstanceOf(InvalidRequestError);
    expect(error).toMatchObject({ code: "INVALID_REQUEST", validationKey: null, messageKey: null });
  });
});
