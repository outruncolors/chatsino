import { BlackjackRepository, ClientRepository } from "repositories";

export class BlackjackManager {
  private blackjackRepository = new BlackjackRepository();
  private clientRepository = new ClientRepository();

  public async load(clientId: string) {
    return this.blackjackRepository.getActiveBlackjackGame(clientId);
  }

  public async start(clientId: string, wager: number) {
    // Pass
  }
}
