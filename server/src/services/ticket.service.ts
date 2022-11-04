import { now, decrypt, encrypt } from "helpers";
import * as config from "config";
import { CacheService } from "./cache.service";

export interface Ticket {
  issuedAt: number;
  issuedTo: string;
  username: string;
}

export class TicketService {
  public static formatTicket = (
    username: string,
    location: string
  ): Ticket => ({
    issuedAt: now(),
    issuedTo: location,
    username,
  });

  public static formatLabel = (username: string) => `${username}/Ticket`;

  private cacheService = new CacheService();

  public grantTicket = async (username: string, location: string) => {
    const ticket = TicketService.formatTicket(username, location);
    const encryptedTicket = await this.encryptTicket(ticket);

    await this.cacheService.setValue(
      TicketService.formatLabel(username),
      encryptedTicket,
      config.TICKET_CACHE_TTL
    );

    return encryptedTicket;
  };

  public validateTicket = async (
    encryptedTicket: string,
    username: string,
    location: string
  ) => {
    const label = TicketService.formatLabel(username);
    const inCacheValue = (await this.cacheService.getValue(label)) as string;

    // 1. The ticket should exist in the cache.
    if (!inCacheValue) {
      throw new Error("Provided ticket does not exist in cache.");
    }

    // 2. The ticket provided should match the one in the cache.
    if (inCacheValue !== encryptedTicket) {
      throw new Error("Provided ticket does not match ticket in cache.");
    }

    const ticket = await this.decryptTicket(encryptedTicket);

    // 3. The decrypted ticket should be assigned to the requesting user.
    if (ticket.username !== username) {
      throw new Error("Provided ticket not assigned to requesting user.");
    }

    // 4. The decrypted ticket should be from the same location.
    if (ticket.issuedTo !== location) {
      throw new Error("Provided ticket was not assigned to the same location.");
    }

    await this.cacheService.clearValue(label);

    return ticket;
  };

  private encryptTicket = async (ticket: Ticket) => {
    const { encryptedData, iv } = encrypt(JSON.stringify(ticket));
    const encryptedTicket = Buffer.from([encryptedData, iv].join("&")).toString(
      "base64"
    );

    return encryptedTicket;
  };

  private decryptTicket = async (encryptedTicket: string) => {
    const value = Buffer.from(encryptedTicket, "base64").toString("utf-8");
    const [encryptedData, iv] = value.split("&");
    const ticket = JSON.parse(decrypt({ iv, encryptedData })) as Ticket;

    return ticket;
  };
}
