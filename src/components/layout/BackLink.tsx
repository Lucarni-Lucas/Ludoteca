import Link from "next/link";

import { BackIcon } from "@/components/ui/icons";

import styles from "./BackLink.module.css";

const BACK_ICON_SIZE = 22;

type BackLinkProps = Readonly<{
  href: string;
  label: string;
  /** Lo que lee un lector de pantalla, ya que en el celu solo se ve la flecha. */
  accessibleLabel: string;
}>;

export function BackLink({ href, label, accessibleLabel }: BackLinkProps) {
  return (
    <Link href={href} className={styles.link} aria-label={accessibleLabel}>
      <BackIcon size={BACK_ICON_SIZE} />
      <span className={styles.text}>{label}</span>
    </Link>
  );
}
