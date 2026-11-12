import { PlayedHoursOutOfRangeError } from "@/model/game/errors";

const MINUTES_PER_HOUR = 60;
const DECIMAL_FACTOR = 10;
// El mismo tope que la duración estimada.
export const MAX_PLAYED_HOURS = 99_999.9;

/**
 * Las horas que escribe el usuario, en minutos. Se redondean a un decimal, como el puntaje: una hora con un
 * decimal es siempre un múltiplo de 6 minutos, así que se guarda sin perder nada. `null` es «sin total a mano».
 */
export function playedMinutesFromHours(hours: number | null): number | null {
  if (hours === null) {
    return null;
  }

  if (Number.isNaN(hours) || hours < 0 || hours > MAX_PLAYED_HOURS) {
    throw new PlayedHoursOutOfRangeError();
  }

  return (Math.round(hours * DECIMAL_FACTOR) * MINUTES_PER_HOUR) / DECIMAL_FACTOR;
}
