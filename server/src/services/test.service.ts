import { ChatsinoLogger } from "logging";
import { AuthorizationService } from "./authorization.service";

const USERNAME = "user7";
const PASSWORD = "password";

export class TestService {
  public static instance = new TestService();

  private logger = ChatsinoLogger.instance;
  private authorizationService = AuthorizationService.instance;

  public async createFirstUser() {
    try {
      this.logger.info(null, "TEST) Creating first user.");

      await this.authorizationService.signup(USERNAME, PASSWORD);

      this.logger.info(null, "TEST) Created first user.");
    } catch {}
  }

  public async signinFirstUser() {
    try {
      this.logger.info(null, "TEST) Signing in first user.");

      await this.authorizationService.signin(USERNAME, PASSWORD);

      this.logger.info(null, "TEST) Signed in first user.");
    } catch {}
  }
}
