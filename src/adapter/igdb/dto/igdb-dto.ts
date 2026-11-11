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

export type TwitchTokenDto = Readonly<{
  access_token: string;
  expires_in: number;
}>;
