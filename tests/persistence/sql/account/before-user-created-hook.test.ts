import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { EMAIL_NOT_ALLOWED_MESSAGE } from "@/model/account/errors";
import { allowedEmail } from "@/persistence/sql/account/allowed-email";

import { EMAIL_NORMALIZATION_CASES } from "../../../model/account/email-cases";
import { createTestDatabase, type TestDatabase } from "../../pglite";

const AUTH_ROLE = "supabase_auth_admin";

describe("función before_user_created_hook", () => {
  let database: TestDatabase;

  async function callHook(email: string | null, role = AUTH_ROLE): Promise<unknown> {
    await database.client.exec(`set role ${role}`);
    try {
      const { rows } = await database.client.query<{ result: unknown }>(
        "select public.before_user_created_hook($1::jsonb) as result",
        [JSON.stringify({ metadata: { name: "before-user-created" }, user: { email } })],
      );
      return rows[0]?.result;
    } finally {
      await database.client.exec("reset role");
    }
  }

  beforeEach(async () => {
    database = await createTestDatabase();
    await database.db.insert(allowedEmail).values({ email: "lucas@example.com" });
  });

  afterEach(async () => {
    await database.client.close();
  });

  it.each(EMAIL_NORMALIZATION_CASES)("permite el mail de la lista escrito como «$input»", async ({ input }) => {
    const email = input;

    const output = await callHook(email);

    expect(output).toEqual({});
  });

  it("rechaza con error 403 un mail que no está en la lista", async () => {
    const email = "otra@example.com";

    const output = await callHook(email);

    expect(output).toEqual({ error: { http_code: 403, message: EMAIL_NOT_ALLOWED_MESSAGE } });
  });

  it("rechaza con error 403 un alta sin mail", async () => {
    const email = null;

    const output = await callHook(email);

    expect(output).toEqual({ error: { http_code: 403, message: EMAIL_NOT_ALLOWED_MESSAGE } });
  });

  it.each(["anon", "authenticated"])("no deja ejecutarla al rol %s", async (role) => {
    const email = "lucas@example.com";

    const call = callHook(email, role);

    await expect(call).rejects.toThrow(/permission denied/);
  });

  it("deja a RLS habilitada en la lista de mails", async () => {
    const table = "allowed_email";

    const { rows } = await database.client.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relname = $1",
      [table],
    );

    expect(rows[0]?.relrowsecurity).toBe(true);
  });
});
