import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_STATUSES } from "@/model/status/status";
import { createStatusRepository, type StatusRepository } from "@/persistence/repository/status/status-repository";

import { createTestDatabase, type TestDatabase } from "../../pglite";
import { MISSING_ID, USER_A, USER_B } from "../users";

describe("createStatusRepository", () => {
  let database: TestDatabase;
  let repository: StatusRepository;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = createStatusRepository(database.db);
    await repository.insertDefaults(USER_A, DEFAULT_STATUSES);
  });

  afterEach(async () => {
    await database.client.close();
  });

  it("devuelve los estados por defecto del usuario, con su grupo y su color", async () => {
    const userId = USER_A;

    const statuses = await repository.listByUser(userId);

    expect(statuses).toHaveLength(DEFAULT_STATUSES.length);
    expect(statuses.find(({ systemKey }) => systemKey === "wishlist")).toMatchObject({
      group: "not_started",
      name: "Quiero jugarlo",
      color: "amber",
    });
  });

  it("no duplica los estados si se insertan dos veces", async () => {
    await repository.insertDefaults(USER_A, DEFAULT_STATUSES);

    const statuses = await repository.listByUser(USER_A);

    expect(statuses).toHaveLength(DEFAULT_STATUSES.length);
  });

  it("devuelve null para un id que no existe", async () => {
    const statusId = MISSING_ID;

    const found = await repository.findById(USER_A, statusId);

    expect(found).toBeNull();
  });

  it("el usuario A no ve ni cambia nada del B", async () => {
    await repository.insertDefaults(USER_B, DEFAULT_STATUSES);
    const [statusOfB] = await repository.listByUser(USER_B);

    const found = await repository.findById(USER_A, statusOfB.id);

    const statusesOfA = await repository.listByUser(USER_A);
    expect(found).toBeNull();
    expect(statusesOfA.map(({ id }) => id)).not.toContain(statusOfB.id);
  });
});
