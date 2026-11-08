import type { ReactNode } from "react";

import { SettingsAvatar } from "./SettingsAvatar";
import styles from "./PageHeader.module.css";

export type PageHeaderProps = Readonly<{
  title: string;
  /** Título para pantallas anchas, cuando el diseño usa uno distinto al del celu. */
  wideTitle?: string;
  avatarInitial: string;
  settingsActive?: boolean;
  actions?: ReactNode;
}>;

function Title({ title, wideTitle }: Pick<PageHeaderProps, "title" | "wideTitle">) {
  if (!wideTitle) {
    return <h1 className={styles.title}>{title}</h1>;
  }

  return (
    <h1 className={styles.title}>
      <span className={styles.narrowOnly}>{title}</span>
      <span className={styles.wideOnly}>{wideTitle}</span>
    </h1>
  );
}

export function PageHeader({ title, wideTitle, avatarInitial, settingsActive, actions }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <Title title={title} wideTitle={wideTitle} />
      <div className={styles.aside}>
        {actions}
        <SettingsAvatar initial={avatarInitial} current={settingsActive} className={styles.narrowOnly} />
      </div>
    </div>
  );
}
