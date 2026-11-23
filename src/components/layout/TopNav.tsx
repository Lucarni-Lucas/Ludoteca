import Link from "next/link";
import { useTranslations } from "next-intl";

import { PlusIcon, SearchIcon } from "./icons";
import { Logo } from "./Logo";
import { SECTIONS, type SectionId } from "./sections";
import { SettingsAvatar } from "./SettingsAvatar";
import styles from "./TopNav.module.css";

type TopNavProps = Readonly<{
  activeSection: SectionId | null;
  avatarInitial: string;
  settingsActive: boolean;
}>;

export function TopNav({ activeSection, avatarInitial, settingsActive }: TopNavProps) {
  const t = useTranslations("nav");

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/library" className={styles.brand}>
          <Logo />
        </Link>
        <nav aria-label={t("main")} className={styles.nav}>
          {SECTIONS.map(({ id, href }) => (
            <Link
              key={id}
              href={href}
              aria-current={id === activeSection ? "page" : undefined}
              className={id === activeSection ? `${styles.link} ${styles.linkActive}` : styles.link}
            >
              {t(`sections.${id}`)}
            </Link>
          ))}
        </nav>
        <div className={styles.tools}>
          <form action="/check" method="get" role="search" className={styles.searchForm}>
            <label className={styles.search}>
              <SearchIcon />
              <span className={styles.visuallyHidden}>{t("search")}</span>
              <input type="search" name="q" placeholder={t("searchPlaceholder")} className={styles.searchInput} />
            </label>
          </form>
          <Link href="/add" className={styles.add}>
            <PlusIcon />
            {t("addGame")}
          </Link>
          <SettingsAvatar initial={avatarInitial} current={settingsActive} />
        </div>
      </div>
    </header>
  );
}
