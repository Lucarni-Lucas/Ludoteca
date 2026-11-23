import { MESSAGES } from "@/i18n/messages";
import type { Locale } from "@/model/account/locale";

type Catalog = Readonly<{ [key: string]: string | Catalog }>;

const ARGUMENT_HEAD = /^\s*([^,{}\s]+)\s*([,}])/;
const OPTION_HEAD = /^\s*([^{}\s]+)\s*\{/;
const CLOSING = /^\s*\}/;
const SUBMESSAGE_TYPES = new Set(["plural", "select", "selectordinal"]);

function flatten(catalog: Catalog, prefix = ""): [string, string][] {
  return Object.entries(catalog).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [[path, value] as [string, string]] : flatten(value, path);
  });
}

/** Las claves del catálogo de un idioma, con su texto, como «nav.library». */
export function catalogEntries(locale: Locale): Map<string, string> {
  return new Map(flatten(MESSAGES[locale]));
}

function malformed(message: string): Error {
  return new Error(`Mensaje ICU mal formado: «${message}»`);
}

/** Lee texto hasta la llave que cierra el submensaje (o el final) y devuelve dónde quedó. */
function readText(message: string, start: number, names: Set<string>): number {
  let index = start;

  while (index < message.length && message[index] !== "}") {
    index = message[index] === "{" ? readArgument(message, index + 1, names) : index + 1;
  }

  return index;
}

function readOptions(message: string, start: number, names: Set<string>): number {
  let index = start;
  let option = OPTION_HEAD.exec(message.slice(index));

  while (option) {
    const end = readText(message, index + option[0].length, names);
    if (end >= message.length) {
      throw malformed(message);
    }
    index = end + 1;
    option = OPTION_HEAD.exec(message.slice(index));
  }

  const closing = CLOSING.exec(message.slice(index));
  if (!closing) {
    throw malformed(message);
  }
  return index + closing[0].length;
}

/** Lee `{nombre}`, `{nombre, tipo}` o `{nombre, plural, one {…} other {…}}` desde después de la llave. */
function readArgument(message: string, start: number, names: Set<string>): number {
  const head = ARGUMENT_HEAD.exec(message.slice(start));
  if (!head?.[1]) {
    throw malformed(message);
  }

  names.add(head[1]);
  const afterName = start + head[0].length;
  if (head[2] === "}") {
    return afterName;
  }

  const type = ARGUMENT_HEAD.exec(message.slice(afterName));
  if (!type?.[1]) {
    throw malformed(message);
  }

  const afterType = afterName + type[0].length;
  if (type[2] === "}") {
    return afterType;
  }

  return SUBMESSAGE_TYPES.has(type[1]) ? readOptions(message, afterType, names) : readText(message, afterType, names) + 1;
}

/** Los nombres de las variables de un mensaje ICU, ordenados. */
export function icuArguments(message: string): string[] {
  const names = new Set<string>();
  readText(message, 0, names);
  return [...names].sort((a, b) => a.localeCompare(b));
}
