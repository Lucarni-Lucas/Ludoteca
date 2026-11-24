import { describe, expect, it } from "vitest";

import { InvalidSteamProfileError } from "@/model/store/errors";
import { parseSteamAccount } from "@/model/store/steam-account";

const STEAM_ID = "76561197960287930";

describe("parseSteamAccount", () => {
  it.each([
    STEAM_ID,
    ` ${STEAM_ID} `,
    `https://steamcommunity.com/profiles/${STEAM_ID}`,
    `https://steamcommunity.com/profiles/${STEAM_ID}/`,
    `steamcommunity.com/profiles/${STEAM_ID}/`,
    `http://www.steamcommunity.com/profiles/${STEAM_ID}`,
  ])("acepta «%s» como SteamID64", (text) => {
    const written = text;

    const account = parseSteamAccount(written);

    expect(account).toEqual({ kind: "steam_id", steamId: STEAM_ID });
  });

  it.each([
    "https://steamcommunity.com/id/gaben",
    "https://steamcommunity.com/id/gaben/",
    "steamcommunity.com/id/gaben",
    "steamcommunity.com/id/gaben/?tab=all",
    "gaben",
  ])("acepta «%s» como nombre de perfil", (text) => {
    const written = text;

    const account = parseSteamAccount(written);

    expect(account).toEqual({ kind: "vanity", name: "gaben" });
  });

  it.each([
    "https://store.steampowered.com/app/620/Portal_2/",
    "https://example.com/id/gaben",
    "steamcommunity.com/profiles/123",
    "steamcommunity.com/groups/ludoteca",
    "nombre con espacios",
    "x",
    "",
  ])("rechaza «%s»", (text) => {
    const written = text;

    const parse = () => parseSteamAccount(written);

    expect(parse).toThrow(InvalidSteamProfileError);
  });
});
