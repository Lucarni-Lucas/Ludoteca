import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsNav } from "@/components/account/SettingsNav";

describe("SettingsNav", () => {
  it("ofrece solo Cuenta, marcada como actual", () => {
    const name = "Cuenta";

    render(<SettingsNav />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
  });
});
