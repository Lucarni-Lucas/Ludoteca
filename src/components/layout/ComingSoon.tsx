import type { ReactNode } from "react";

import { PageHeader, type PageHeaderProps } from "./PageHeader";
import styles from "./ComingSoon.module.css";

type ComingSoonProps = PageHeaderProps &
  Readonly<{
    children?: ReactNode;
  }>;

export function ComingSoon({ children, ...header }: ComingSoonProps) {
  return (
    <div className={styles.page}>
      <PageHeader {...header} />
      <section className={styles.notice}>
        <p className={styles.label}>Próximamente</p>
        {children}
      </section>
    </div>
  );
}
