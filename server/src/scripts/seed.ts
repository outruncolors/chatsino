import { ChatsinoLogger } from "logging";
import { AdminService, AuthenticationService } from "services";
import { BlackjackRepository, ClientRepository } from "repositories";

const DEFAULT_PASSWORD = "password";
const DEFAULT_TOKEN_BALANCE = 9999;

const logger = new ChatsinoLogger("Script/Seed");
const adminService = new AdminService();
const authenticationService = new AuthenticationService();
const blackjackRepository = new BlackjackRepository();
const clientRepository = new ClientRepository();

export async function seed() {
  logger.info("Seeding database...");

  await destroyRepositories();
  await createRepositories();
  await seedClients();

  logger.info("Seeding complete.");
}

async function destroyRepositories() {
  await blackjackRepository.destroy();
  await clientRepository.destroy();
}

async function createRepositories() {
  await clientRepository.create();
  await blackjackRepository.create();
}

async function seedClients() {
  logger.info("Seeding clients...");

  const { id } = await authenticationService.signup(
    "admin",
    DEFAULT_PASSWORD,
    "admin:limited"
  );
  await adminService.payClient(id, DEFAULT_TOKEN_BALANCE);
  await adminService.changeClientPermissionLevel(id, "admin:unlimited");
  await authenticationService.signup("admin2", DEFAULT_PASSWORD, "user");
  await authenticationService.signup("client", DEFAULT_PASSWORD, "user");
  await authenticationService.signup("client2", DEFAULT_PASSWORD, "user");

  logger.info("Clients seeded.");
}
