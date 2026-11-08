import { ComingSoon } from "@/components/layout/ComingSoon";
import { avatarInitial } from "@/model/account/avatar";
import { requireSessionUser } from "@/security/session";

export default async function SubscriptionsPage() {
  const user = await requireSessionUser();

  return <ComingSoon title="Suscripciones" avatarInitial={avatarInitial(user)} />;
}
