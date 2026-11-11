const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

// en-CA formatea como AAAA-MM-DD, que es el formato en el que viajan las fechas.
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export type Clock = Readonly<{
  today(): string;
}>;

/** Vercel corre en UTC: a las 22 h de Buenos Aires ya sería el día siguiente. */
export function createClock(now: () => Date = () => new Date()): Clock {
  return {
    today() {
      return dayFormatter.format(now());
    },
  };
}

export const clock = createClock();
