import type { ReactNode } from "react";

import { avatarInitial } from "@/model/account/avatar";
import { requireSessionUser } from "@/security/session";

import { AppShell } from "./app-shell";

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await requireSessionUser();

  return <AppShell avatarInitial={avatarInitial(user)}>{children}</AppShell>;
}
