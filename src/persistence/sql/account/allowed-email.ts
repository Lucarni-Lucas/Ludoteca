import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Lista de mails que pueden entrar. RLS sin políticas: la Data API de Supabase no ve nada. */
export const allowedEmail = pgTable("allowed_email", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
