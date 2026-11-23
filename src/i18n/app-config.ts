import type { Locale } from "@/model/account/locale";

import type messages from "./messages/es.json";

// El catálogo en español es la referencia: una clave que no existe en es.json no compila.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
