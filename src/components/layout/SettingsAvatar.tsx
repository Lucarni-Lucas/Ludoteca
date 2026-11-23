import Link from "next/link";
import { useTranslations } from "next-intl";

import styles from "./SettingsAvatar.module.css";

type SettingsAvatarProps = Readonly<{
  initial: string;
  current?: boolean;
  className?: string;
}>;

export function SettingsAvatar({ initial, current = false, className }: SettingsAvatarProps) {
  const t = useTranslations("nav");
  const classes = [styles.avatar, current ? styles.current : undefined, className].filter(Boolean).join(" ");

  return (
    <Link href="/settings" aria-label={t("settings")} aria-current={current ? "page" : undefined} className={classes}>
      {initial}
    </Link>
  );
}
