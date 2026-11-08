import Link from "next/link";

import styles from "./SettingsAvatar.module.css";

type SettingsAvatarProps = Readonly<{
  initial: string;
  current?: boolean;
  className?: string;
}>;

export function SettingsAvatar({ initial, current = false, className }: SettingsAvatarProps) {
  const classes = [styles.avatar, current ? styles.current : undefined, className].filter(Boolean).join(" ");

  return (
    <Link href="/settings" aria-label="Ajustes" aria-current={current ? "page" : undefined} className={classes}>
      {initial}
    </Link>
  );
}
