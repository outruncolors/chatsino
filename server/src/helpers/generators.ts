import Chance from "chance";
import type { AuthenticatedClient } from "services";

const chance = new Chance();

export class TestGenerator {
  public static createClient(): AuthenticatedClient {
    return {
      username: chance.name(),
      permissionLevel: "admin:unlimited",
    };
  }
}
