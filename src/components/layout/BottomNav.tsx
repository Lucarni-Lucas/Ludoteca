import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

import { CheckNavIcon, LibraryNavIcon, StoresNavIcon, SubscriptionsNavIcon } from "./icons";
import { SECTIONS, type SectionId } from "./sections";
import styles from "./BottomNav.module.css";

const SECTION_ICONS: Readonly<Record<SectionId, ComponentType>> = {
  library: LibraryNavIcon,
  check: CheckNavIcon,
  subscriptions: SubscriptionsNavIcon,
  stores: StoresNavIcon,
};

type BottomNavProps = Readonly<{
  activeSection: SectionId | null;
}>;

export function BottomNav({ activeSection }: BottomNavProps) {
  const t = useTranslations("nav");

  return (
    <nav aria-label={t("bar")} className={styles.bar}>
      {SECTIONS.map(({ id, href }) => {
        const Icon = SECTION_ICONS[id];

        return (
          <Link
            key={id}
            href={href}
            aria-current={id === activeSection ? "page" : undefined}
            className={id === activeSection ? `${styles.link} ${styles.linkActive}` : styles.link}
          >
            <Icon />
            {t(`sections.${id}`)}
          </Link>
        );
      })}
    </nav>
  );
}
