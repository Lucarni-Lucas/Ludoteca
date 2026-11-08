import Link from "next/link";

import { AddGameShortcut } from "@/components/layout/AddGameShortcut";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { avatarInitial } from "@/model/account/avatar";
import { requireSessionUser } from "@/security/session";

import styles from "./page.module.css";

export default async function LibraryPage() {
  const user = await requireSessionUser();

  return (
    <ComingSoon
      title="Biblioteca"
      wideTitle="Tu biblioteca"
      avatarInitial={avatarInitial(user)}
      actions={<AddGameShortcut />}
    >
      <p className={styles.text}>Todavía no cargaste ningún juego.</p>
      <Link href="/add" className={styles.invite}>
        Agregá tu primer juego
      </Link>
    </ComingSoon>
  );
}
