type CoverDto = Readonly<{ image_id?: string }>;

export type IgdbSearchGameDto = Readonly<{
  id: number;
  name: string;
  first_release_date?: number;
  cover?: CoverDto;
  version_parent?: number;
}>;

export type IgdbInvolvedCompanyDto = Readonly<{
  developer?: boolean;
  company?: Readonly<{ name?: string }>;
}>;

export type IgdbGameDto = IgdbSearchGameDto &
  Readonly<{
    url?: string;
    involved_companies?: readonly IgdbInvolvedCompanyDto[];
  }>;

export type IgdbTimeToBeatDto = Readonly<{
  normally?: number;
}>;

/** Los datos de un juego pedidos de a muchos para la importación: suman los modos de juego. */
export type IgdbBatchGameDto = IgdbGameDto &
  Readonly<{
    game_modes?: readonly Readonly<{ slug?: string }>[];
  }>;

export type IgdbBatchTimeToBeatDto = IgdbTimeToBeatDto & Readonly<{ game_id: number }>;

export type IgdbExternalGameDto = Readonly<{
  uid: string;
  game?: number;
}>;

/** Cada consulta de un `multiquery` vuelve con su nombre y sus resultados. */
export type IgdbMultiqueryDto<T> = Readonly<{
  name: string;
  result?: readonly T[];
}>;

export type TwitchTokenDto = Readonly<{
  access_token: string;
  expires_in: number;
}>;
