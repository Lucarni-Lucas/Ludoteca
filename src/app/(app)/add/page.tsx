import { ComingSoon } from "@/components/layout/ComingSoon";
import { avatarInitial } from "@/model/account/avatar";
import { requireSessionUser } from "@/security/session";

export default async function AddGamePage() {
  const user = await requireSessionUser();

  return <ComingSoon title="Agregar juego" avatarInitial={avatarInitial(user)} />;
}
