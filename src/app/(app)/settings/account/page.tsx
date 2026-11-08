import { requireSessionUser } from "@/security/session";

import { AccountScreen } from "./account-screen";

export default async function AccountPage() {
  const user = await requireSessionUser();

  return <AccountScreen email={user.email} />;
}
