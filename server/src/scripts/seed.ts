import { ChatsinoLogger } from "logging";
import { AdminService, AuthenticationService } from "services";
import { sleep } from "helpers";
import { ClientRepository } from "repositories";

const DEFAULT_PASSWORD = "password";
const DEFAULT_TOKEN_BALANCE = 9999;

const logger = new ChatsinoLogger("Script/Seed");
const adminService = new AdminService();
const authenticationService = new AuthenticationService();
const clientRepository = new ClientRepository();

export async function seed() {
  await sleep(2000);

  logger.info("Executing.");

  await seedClients();
}

async function seedClients() {
  logger.info("Seeding clients...");

  await clientRepository.destroy();
  await clientRepository.create();
  const { id } = await authenticationService.signup(
    "admin",
    DEFAULT_PASSWORD,
    "admin:unlimited"
  );
  await adminService.payClient(id, DEFAULT_TOKEN_BALANCE);
  await authenticationService.signup(
    "admin2",
    DEFAULT_PASSWORD,
    "admin:limited"
  );
  await authenticationService.signup("client", DEFAULT_PASSWORD, "user");
  await authenticationService.signup("client2", DEFAULT_PASSWORD, "user");

  logger.info("Clients seeded.");
}
