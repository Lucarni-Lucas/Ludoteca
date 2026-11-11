import { describe, expect, it } from "vitest";
import { z } from "zod";

import { InvalidRequestError } from "@/shared/app-error";
import { parseInput } from "@/shared/parse-input";

const schema = z.object({
  title: z.string().trim().min(1, { error: "Poné el título del juego" }),
  id: z.uuid().optional(),
});

describe("parseInput", () => {
  it("devuelve los datos normalizados", () => {
    const input = { title: "  Hades  " };

    const result = parseInput(schema, input);

    expect(result).toEqual({ title: "Hades" });
  });

  it("usa el mensaje propio del esquema", () => {
    const input = { title: "   " };

    const parse = () => parseInput(schema, input);

    expect(parse).toThrow(new InvalidRequestError("Poné el título del juego"));
  });

  it("no deja salir un mensaje interno de Zod", () => {
    const input = { title: "Hades", id: "no-es-un-uuid" };

    const parse = () => parseInput(schema, input);

    expect(parse).toThrow(new InvalidRequestError("El pedido no es válido."));
  });
});
