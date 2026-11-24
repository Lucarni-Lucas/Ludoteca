const SINGLE_PLAYER_MODE = "single-player";

/** Solo multijugador: IGDB lista modos y ninguno es para un jugador. Sin modos cargados, no se sabe. */
export function isMultiplayerOnly(modeSlugs: readonly string[]): boolean {
  return modeSlugs.length > 0 && !modeSlugs.includes(SINGLE_PLAYER_MODE);
}
