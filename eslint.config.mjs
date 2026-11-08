import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

// Los patrones arrancan con `**/` para atrapar tanto `@/capa/...` como las rutas relativas.
const NEXT = ["next", "next/*"];
const REACT = ["react", "react/*", "react-dom", "react-dom/*"];
const DRIZZLE = ["drizzle-orm", "drizzle-orm/*"];
const SUPABASE = ["@supabase/*"];
const ZOD = ["zod", "zod/*"];
const APP = ["**/app/**"];
const SERVICE = ["**/service/**"];
const PERSISTENCE = ["**/persistence/**"];
const PERSISTENCE_SQL = ["**/persistence/sql/**"];
const PERSISTENCE_MAPPER = ["**/persistence/mapper/**"];
const ADAPTER = ["**/adapter/**"];
const COMPONENTS = ["**/components/**"];
const HOOKS = ["**/hooks/**"];
const SECURITY = ["**/security/**"];
const CONFIG = ["**/config/**"];

function restrictImports(message, ...groups) {
  return ["error", { patterns: [{ group: groups.flat(), message }] }];
}

function layer(files, message, groups, ignores = []) {
  return {
    files,
    ignores,
    rules: { "no-restricted-imports": restrictImports(message, ...groups) },
  };
}

const layerRules = [
  // Cada carpeta declara su lista completa: en ESLint, un bloque posterior reemplaza la regla, no la suma.
  layer(
    ["src/**/*.{ts,tsx}"],
    "Las tablas y Drizzle solo se usan dentro de persistence/.",
    [PERSISTENCE_SQL, DRIZZLE],
    ["src/persistence/**"],
  ),
  layer(["src/model/**/*.ts"], "model/ es TypeScript puro: no conoce frameworks ni otras capas.", [
    NEXT,
    REACT,
    DRIZZLE,
    SUPABASE,
    ZOD,
    APP,
    SERVICE,
    PERSISTENCE,
    ADAPTER,
    COMPONENTS,
    HOOKS,
    SECURITY,
    CONFIG,
  ]),
  layer(
    ["src/app/**/*.{ts,tsx}"],
    "app/ solo habla con service/: nada de repositorios, Drizzle ni adapters.",
    [PERSISTENCE, DRIZZLE, ADAPTER],
  ),
  layer(
    ["src/service/**/*.ts"],
    "El servicio recibe sus dependencias por parámetro y no conoce Drizzle ni DTO.",
    [PERSISTENCE, DRIZZLE, ADAPTER, APP],
    ["src/service/**/instance.ts"],
  ),
  layer(
    ["src/service/**/instance.ts"],
    "instance.ts arma el servicio con repositorios: no toca tablas, mappers ni Drizzle.",
    [PERSISTENCE_SQL, PERSISTENCE_MAPPER, DRIZZLE, APP],
  ),
  layer(
    ["src/components/**/*.{ts,tsx}"],
    "Los componentes reciben datos y callbacks por props: no conocen la API ni el router.",
    [["next/navigation"], SERVICE, PERSISTENCE, ADAPTER, APP, SECURITY, DRIZZLE],
  ),
  layer(
    ["src/hooks/**/*.{ts,tsx}"],
    "Los hooks llaman a Server Actions: no tocan persistencia ni adapters.",
    [PERSISTENCE, ADAPTER, DRIZZLE],
  ),
];

const config = [
  {
    ignores: [".next/**", "node_modules/**", "drizzle/**", "playwright-report/**", "test-results/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    rules: {
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": true, "ts-expect-error": "allow-with-description" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  ...layerRules,
  {
    // El logger es el único lugar autorizado a escribir en la consola.
    files: ["src/shared/logger.ts"],
    rules: { "no-console": "off" },
  },
  {
    // Un literal repetido en un test da claridad, y las URL http son las de los servidores falsos.
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "sonarjs/no-duplicate-string": "off",
      "sonarjs/no-clear-text-protocols": "off",
      "sonarjs/no-hardcoded-passwords": "off",
    },
  },
];

export default config;
