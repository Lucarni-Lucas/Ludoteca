import { avatarInitial } from "@/model/account/avatar";
import { requireSessionUser } from "@/security/session";
import { getLibraryService } from "@/service/game/instance";
import { getStatusService } from "@/service/status/instance";

import { LibraryScreen } from "./library-screen";

type LibraryPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

function toSearch(params: Awaited<LibraryPageProps["searchParams"]>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const user = await requireSessionUser();
  const [games, statusGroups, params] = await Promise.all([
    getLibraryService().listLibrary(user.id),
    getStatusService().listGrouped(user.id),
    searchParams,
  ]);

  return (
    <LibraryScreen
      games={games}
      statusGroups={statusGroups}
      avatarInitial={avatarInitial(user)}
      initialSearch={toSearch(params)}
    />
  );
}
