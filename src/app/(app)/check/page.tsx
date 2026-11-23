import { getTranslations } from "next-intl/server";

import { ComingSoon } from "@/components/layout/ComingSoon";
import { avatarInitial } from "@/model/account/avatar";
import { requireSessionUser } from "@/security/session";

export default async function CheckPage() {
  const user = await requireSessionUser();
  const t = await getTranslations("nav.sections");

  return <ComingSoon title={t("check")} avatarInitial={avatarInitial(user)} />;
}
