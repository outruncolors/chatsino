import Chance from "chance";
import type { Client } from "repositories";
import type { AuthenticatedClient } from "services";

const chance = new Chance();

export class TestGenerator {
  public static createClient(overrides: Partial<Client> = {}): Client {
    return {
      id: chance.guid(),
      username: chance.name(),
      permissionLevel: "admin:unlimited",
      hash: chance.hash(),
      salt: chance.hash(),
      ...overrides,
    };
  }

  public static createAuthenticatedClient(
    overrides: Partial<AuthenticatedClient> = {}
  ): AuthenticatedClient {
    return {
      username: chance.name(),
      permissionLevel: "admin:unlimited",
      ...overrides,
    };
  }
}
