import { pgEnum, pgTable, uuid } from "drizzle-orm/pg-core";

import { LOCALES } from "../../../model/account/locale";
import { primaryId, timestamps } from "../columns";

export const appLocaleEnum = pgEnum("app_locale", LOCALES);

/** Sin fila, todo vale por defecto: no se crea al ingresar. `locale` vacío es «nunca eligió». */
export const userSettings = pgTable("user_settings", {
  id: primaryId(),
  userId: uuid("user_id").notNull().unique(),
  locale: appLocaleEnum("locale"),
  ...timestamps(),
}).enableRLS();
