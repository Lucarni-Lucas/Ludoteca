import type { IgdbGameData, IgdbSearchResult } from "@/model/game/catalog";

import type { IgdbGameDto, IgdbInvolvedCompanyDto, IgdbSearchGameDto, IgdbTimeToBeatDto } from "./dto/igdb-dto";

const IMAGE_BASE_URL = "https://images.igdb.com/igdb/image/upload";
const COVER_SMALL = "t_cover_small";
const COVER_BIG = "t_cover_big";
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_HOUR = 3600;
const DECIMAL_FACTOR = 10;

function toYear(releaseDate: number | undefined): number | null {
  return releaseDate === undefined ? null : new Date(releaseDate * MILLISECONDS_PER_SECOND).getUTCFullYear();
}

function toCoverUrl(game: IgdbSearchGameDto, size: string): string | null {
  const imageId = game.cover?.image_id;
  return imageId ? `${IMAGE_BASE_URL}/${size}/${imageId}.jpg` : null;
}

function toDeveloper(companies: readonly IgdbInvolvedCompanyDto[] | undefined): string | null {
  return companies?.find((company) => company.developer)?.company?.name ?? null;
}

function toHours(timeToBeat: IgdbTimeToBeatDto | undefined): number | null {
  const seconds = timeToBeat?.normally;
  return seconds === undefined ? null : Math.round((seconds / SECONDS_PER_HOUR) * DECIMAL_FACTOR) / DECIMAL_FACTOR;
}

export function toSearchResult(game: IgdbSearchGameDto): IgdbSearchResult {
  return {
    igdbId: game.id,
    baseIgdbId: game.version_parent ?? game.id,
    title: game.name,
    year: toYear(game.first_release_date),
    coverUrl: toCoverUrl(game, COVER_SMALL),
  };
}

export function toGameData(game: IgdbGameDto, timeToBeat: IgdbTimeToBeatDto | undefined): IgdbGameData {
  return {
    igdbId: game.id,
    title: game.name,
    year: toYear(game.first_release_date),
    developer: toDeveloper(game.involved_companies),
    coverUrl: toCoverUrl(game, COVER_BIG),
    pageUrl: game.url ?? null,
    estimatedHours: toHours(timeToBeat),
    // IGDB no informa si un juego es sin fin: lo marca cada usuario.
    endless: false,
  };
}
