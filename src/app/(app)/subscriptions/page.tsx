import { getTranslations } from "next-intl/server";

import { ComingSoon } from "@/components/layout/ComingSoon";
import { avatarInitial } from "@/model/account/avatar";
import { requireSessionUser } from "@/security/session";

export default async function SubscriptionsPage() {
  const user = await requireSessionUser();
  const t = await getTranslations("nav.sections");

  return <ComingSoon title={t("subscriptions")} avatarInitial={avatarInitial(user)} />;
}
