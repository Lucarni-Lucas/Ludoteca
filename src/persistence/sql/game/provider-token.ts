import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "../columns";

/** No tiene dueño: el token de Twitch es de la app, como el catálogo. */
export const providerToken = pgTable("provider_token", {
  id: primaryId(),
  provider: text("provider").notNull().unique(),
  accessToken: text("access_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps(),
}).enableRLS();
