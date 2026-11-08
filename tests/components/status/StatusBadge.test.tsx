import { readFileSync } from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/status/StatusBadge";
import type { StatusGroup } from "@/model/status/status-group";

const tokens = readFileSync(path.resolve("src/styles/tokens.css"), "utf8");

function tokenValue(variableReference: string): string | undefined {
  const name = /var\((--[\w-]+)\)/.exec(variableReference)?.[1];
  return new RegExp(`${name}:\\s*([^;]+);`).exec(tokens)?.[1]?.toLowerCase();
}

function renderedColor(group: StatusGroup): string | undefined {
  render(<StatusBadge group={group}>Etiqueta</StatusBadge>);
  return tokenValue(screen.getByText("Etiqueta").style.getPropertyValue("--badge-color"));
}

describe("StatusBadge", () => {
  it("Color de un estado terminado", () => {
    const group: StatusGroup = "finished";

    const color = renderedColor(group);

    expect(color).toBe("#8ec5ff");
  });

  it.each([
    { group: "in_progress", description: "verde lima", expected: "#c8f25a" },
    { group: "not_started", description: "gris claro", expected: "#c5ccd8" },
    { group: "dropped", description: "coral", expected: "#ff9c8a" },
  ] as const)("el grupo $group se ve en $description", ({ group, expected }) => {
    const statusGroup: StatusGroup = group;

    const color = renderedColor(statusGroup);

    expect(color).toBe(expected);
  });

  it("muestra el nombre del estado que recibe", () => {
    const label = "Completado";

    render(<StatusBadge group="finished">{label}</StatusBadge>);

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
