import { globSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { DEFAULT_STATUSES } from "@/model/status/status";

import { catalogEntries, icuArguments } from "./catalog-entries";

const es = catalogEntries("es");
const en = catalogEntries("en");

function sortedKeys(entries: Map<string, string>): string[] {
  return [...entries.keys()].sort((a, b) => a.localeCompare(b));
}

describe("catálogos de mensajes", () => {
  it("tienen las mismas claves en español y en inglés", () => {
    const spanishKeys = sortedKeys(es);

    const englishKeys = sortedKeys(en);

    expect(englishKeys).toEqual(spanishKeys);
  });

  it("no tienen textos vacíos", () => {
    const all = [...es, ...en];

    const empty = all.filter(([, text]) => text.trim() === "").map(([key]) => key);

    expect(empty).toEqual([]);
  });

  it("usan las mismas variables en los dos idiomas", () => {
    const keys = sortedKeys(es).filter((key) => en.has(key));

    const mismatched = keys.filter(
      (key) => icuArguments(es.get(key) ?? "").join() !== icuArguments(en.get(key) ?? "").join(),
    );

    expect(mismatched).toEqual([]);
  });
});

const ERROR_FILES = [...globSync("src/**/*errors.ts"), "src/shared/app-error.ts"];
const LITERAL_CODE = /readonly code = "([A-Z_]+)"/g;
const CONSTANT_CODE = /readonly code = ([A-Z_]+);/g;

/** Los códigos de cada error con nombre, escritos tal cual o con una constante del mismo archivo. */
function errorCodes(): string[] {
  return ERROR_FILES.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    const literals = [...source.matchAll(LITERAL_CODE)].map(([, code]) => code ?? "");
    const constants = [...source.matchAll(CONSTANT_CODE)].map(
      ([, name]) => new RegExp(`const ${name} = "([A-Z_]+)"`).exec(source)?.[1] ?? `${name} sin valor`,
    );
    return [...literals, ...constants];
  });
}

describe("textos de los errores", () => {
  it("cada código de error tiene su texto en los dos idiomas", () => {
    const codes = [...errorCodes(), "INTERNAL_ERROR"];

    const missing = codes.filter((code) => !es.has(`errors.${code}`) || !en.has(`errors.${code}`));

    expect(codes.length).toBeGreaterThan(20);
    expect(missing).toEqual([]);
  });
});

describe("nombres por defecto de los estados", () => {
  it("cada system_key de DEFAULT_STATUSES tiene su nombre en los dos idiomas", () => {
    const keys = DEFAULT_STATUSES.map(({ systemKey }) => `status.defaults.${systemKey}`);

    const missing = keys.filter((key) => !es.has(key) || !en.has(key));

    expect(missing).toEqual([]);
  });

  it("el nombre por defecto en español es el que se guarda de fábrica", () => {
    const pairs = DEFAULT_STATUSES.map(({ systemKey, name }) => [name, es.get(`status.defaults.${systemKey}`)]);

    const different = pairs.filter(([stored, shown]) => stored !== shown);

    expect(different).toEqual([]);
  });
});

describe("icuArguments", () => {
  it.each([
    { name: "sin variables", message: "Biblioteca", expected: [] },
    { name: "una variable simple", message: "Hola, {name}", expected: ["name"] },
    {
      name: "un plural con una variable adentro",
      message: "{count, plural, one {# juego de {owner}} other {# juegos}}",
      expected: ["count", "owner"],
    },
    { name: "un apóstrofo suelto", message: "Enter the game's title", expected: [] },
    { name: "un número con formato", message: "{hours, number} h y {title}", expected: ["hours", "title"] },
  ])("lee $name", ({ message, expected }) => {
    const text = message;

    const names = icuArguments(text);

    expect(names).toEqual(expected);
  });

  it("avisa cuando el mensaje está mal formado", () => {
    const message = "{count, plural, one {# juego}";

    const read = () => icuArguments(message);

    expect(read).toThrow("mal formado");
  });
});
