"use client";

import { usePathname } from "next/navigation";

import { isSettingsPath, sectionForPath } from "@/components/layout/sections";

export function useActiveSection() {
  const pathname = usePathname();

  return { section: sectionForPath(pathname), isSettings: isSettingsPath(pathname) };
}
