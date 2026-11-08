import { ComingSoon } from "@/components/layout/ComingSoon";
import { avatarInitial } from "@/model/account/avatar";
import { requireSessionUser } from "@/security/session";

export default async function StoresPage() {
  const user = await requireSessionUser();

  return <ComingSoon title="Tiendas" avatarInitial={avatarInitial(user)} />;
}
