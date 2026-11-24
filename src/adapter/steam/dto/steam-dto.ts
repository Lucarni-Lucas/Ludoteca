import { z } from "zod";

/** `success` vale 1 si encontró el nombre y 42 («No match») si no (verificado contra Steam real). */
export const VANITY_FOUND = 1;

export const vanityResponseSchema = z.object({
  response: z.object({
    success: z.number(),
    steamid: z.string().optional(),
  }),
});

export const ownedGameSchema = z.object({
  appid: z.number().int(),
  name: z.string().optional(),
  playtime_forever: z.number().int().nonnegative().optional(),
});

/** Un perfil con los juegos privados responde `{ "response": {} }`: sin `game_count` ni `games`. */
export const ownedGamesResponseSchema = z.object({
  response: z.object({
    game_count: z.number().int().optional(),
    games: z.array(ownedGameSchema).optional(),
  }),
});

export type OwnedGameDto = z.infer<typeof ownedGameSchema>;
