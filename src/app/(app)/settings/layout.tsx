import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { SettingsNav } from "@/components/account/SettingsNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { avatarInitial } from "@/model/account/avatar";
import { requireSessionUser } from "@/security/session";

import styles from "./layout.module.css";

export default async function SettingsLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await requireSessionUser();
  const t = await getTranslations("settings");

  return (
    <div className={styles.page}>
      <PageHeader title={t("title")} avatarInitial={avatarInitial(user)} settingsActive />
      <div className={styles.columns}>
        <SettingsNav />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
