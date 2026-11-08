"use client";

import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/BottomNav";
import { TopNav } from "@/components/layout/TopNav";
import { useActiveSection } from "@/hooks/use-active-section";

import styles from "./app-shell.module.css";

type AppShellProps = Readonly<{
  avatarInitial: string;
  children: ReactNode;
}>;

/** Conecta la ruta actual con la navegación, que solo recibe datos por props. */
export function AppShell({ avatarInitial, children }: AppShellProps) {
  const { section, isSettings } = useActiveSection();

  return (
    <>
      <TopNav activeSection={section} avatarInitial={avatarInitial} settingsActive={isSettings} />
      <main className={styles.main}>{children}</main>
      <BottomNav activeSection={section} />
    </>
  );
}
