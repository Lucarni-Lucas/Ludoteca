import { describe, expect, it } from "vitest";

import { avatarInitial } from "@/model/account/avatar";

describe("avatarInitial", () => {
  it("usa la primera letra del nombre, en mayúscula", () => {
    const user = { name: "lucas", email: "otro@example.com" };

    const initial = avatarInitial(user);

    expect(initial).toBe("L");
  });

  it("ignora los espacios al principio del nombre", () => {
    const user = { name: "  ñandú", email: "otro@example.com" };

    const initial = avatarInitial(user);

    expect(initial).toBe("Ñ");
  });

  it("usa el mail cuando el usuario no tiene nombre", () => {
    const user = { name: null, email: "mara@example.com" };

    const initial = avatarInitial(user);

    expect(initial).toBe("M");
  });

  it("usa el mail cuando el nombre está en blanco", () => {
    const user = { name: "   ", email: "mara@example.com" };

    const initial = avatarInitial(user);

    expect(initial).toBe("M");
  });

  it("muestra un signo cuando no hay ni nombre ni mail", () => {
    const user = { name: null, email: "" };

    const initial = avatarInitial(user);

    expect(initial).toBe("?");
  });
});
