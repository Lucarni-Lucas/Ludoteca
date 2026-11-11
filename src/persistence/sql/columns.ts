import { numeric, timestamp, uuid } from "drizzle-orm/pg-core";

const DECIMAL_SCALE = 1;
const HOURS_PRECISION = 6;
const SCORE_PRECISION = 3;

export function primaryId() {
  return uuid("id").primaryKey().defaultRandom();
}

/** Toda tabla lleva estas dos columnas. `$onUpdate` hace que Drizzle renueve la fecha en cada update. */
export function timestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  };
}

/** numeric y no real: un puntaje de 9.4 tiene que volver como 9.4, sin errores de punto flotante. */
export function hoursColumn(name: string) {
  return numeric(name, { precision: HOURS_PRECISION, scale: DECIMAL_SCALE, mode: "number" });
}

export function scoreColumn(name: string) {
  return numeric(name, { precision: SCORE_PRECISION, scale: DECIMAL_SCALE, mode: "number" });
}
