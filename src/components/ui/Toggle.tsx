"use client";

import * as Switch from "@radix-ui/react-switch";
import { useId } from "react";

import type { HelpText } from "./help-texts";
import { HelpTip } from "./HelpTip";
import styles from "./Toggle.module.css";

type ToggleProps = Readonly<{
  label: string;
  checked: boolean;
  disabled?: boolean;
  help?: HelpText;
  onCheckedChange: (checked: boolean) => void;
}>;

export function Toggle({ label, checked, disabled, help, onCheckedChange }: ToggleProps) {
  const id = useId();

  return (
    <div className={styles.row}>
      <Switch.Root
        id={id}
        className={styles.switch}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      >
        <Switch.Thumb className={styles.thumb} />
      </Switch.Root>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {help ? <HelpTip help={help} /> : null}
    </div>
  );
}
