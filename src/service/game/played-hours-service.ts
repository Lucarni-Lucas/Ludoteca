import { playedMinutesFromHours } from "@/model/game/played-hours";

type PlayedHoursServiceDependencies = Readonly<{
  gameRepo: Readonly<{
    updatePlayedMinutes(userId: string, gameId: string, minutes: number | null): Promise<void>;
  }>;
}>;

export type PlayedHoursService = Readonly<{
  /** Carga, cambia o, con `null`, borra el total a mano. Devuelve los minutos guardados. */
  setPlayedHours(userId: string, gameId: string, hours: number | null): Promise<number | null>;
}>;

/** Aparte del servicio de la biblioteca: el total a mano solo necesita guardar, y el repositorio ya filtra por usuario. */
export function createPlayedHoursService({ gameRepo }: PlayedHoursServiceDependencies): PlayedHoursService {
  return {
    async setPlayedHours(userId, gameId, hours) {
      const minutes = playedMinutesFromHours(hours);

      await gameRepo.updatePlayedMinutes(userId, gameId, minutes);
      return minutes;
    },
  };
}
