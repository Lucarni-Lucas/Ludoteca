import { LogoIcon } from "./icons";
import styles from "./Logo.module.css";

export function Logo() {
  return (
    <span className={styles.logo}>
      <span className={styles.mark}>
        <LogoIcon />
      </span>
      <span className={styles.name}>Ludoteca</span>
    </span>
  );
}
