import Chance from "chance";
import { TestGenerator } from "helpers";
import * as config from "config";
import { TicketService } from "./ticket.service";

const CHANCE = new Chance();
const EXISTING_USERNAME = "A_USERNAME";
const VALID_LOCATION = "A_LOCATION";
const EXISTING_CLIENT = TestGenerator.createClient({
  username: EXISTING_USERNAME,
});
const { hash: _, salt: __, ...CLIENT } = EXISTING_CLIENT;
const VALID_ENCRYPTED_TICKET =
  "YzA3NzU1NDk2NGVhMzZhOTVmNGRhOGQ2OGZhZTU2OGYwYmUyYTgzMDczZTQ1NjRhNzYxYmQ2MmU5ZWUxMGM2M2ZmMzk3ZTMyMDhkYTIwOGM1MmQ2Mjc2MTgwYzllZGFmOTdhMWQ0MWUzNjA4MjE1ZWI5YWM1YzkyMTRiYzY1MDZjNDYxMzU5OTc2NDQwMGYyZGY5YjlkOTlhZmJmYzE4ZiY2YTM5YWFhMTJhNGFhMzYxYmY3Y2YyMDZkMTc2NjVhYg==";
const INVALID_ENCRYPTED_TICKET =
  "ZWZjMTE3MmNkNmQyOTViMDEwZTY0N2ZjOTNmZDAxMjY0ZDhmMjI1OTVkNGU0ZjQ4NzRjZDhiZTJhMzUyYjY1OWU0ZTkyM2M5OWMyZDliN2FlYTA1ODRhMDQ3ZDIyZmMzYTE0YjU0OTgwN2U5MjI5YWRiMGE1Zjk2MDM2NWMzMjNmZWE1Njk0MTFlYTRkYTJhNTMyMGVkNTQ2OGY5N2EwMiY0YTE3NzUzYjFhNWZmNjFjNGQzMzNjZGI2ZjJmYmJmZg==";

let _getClientByUsername = jest
  .fn()
  .mockImplementation((username: string) =>
    Promise.resolve(username === EXISTING_USERNAME ? EXISTING_CLIENT : null)
  );

let _safetify = jest.fn().mockImplementation((input: any) => {
  delete input.hash;
  delete input.salt;
  return input;
});
jest.mock("repositories", () => ({
  ClientRepository: class {
    public static safetify(...args: unknown[]) {
      return _safetify(...args);
    }

    public async getClientByUsername(...args: unknown[]) {
      return _getClientByUsername(...args);
    }
  },
}));

let _setValue = jest.fn();
let _getValue = jest
  .fn()
  .mockImplementation((encryptedTicket: string) =>
    Promise.resolve(encryptedTicket === VALID_ENCRYPTED_TICKET ? CLIENT : null)
  );
let _clearValue = jest.fn();
jest.mock("./cache.service", () => ({
  CacheService: class {
    public async setValue(...args: unknown[]) {
      return _setValue(...args);
    }

    public async getValue(...args: unknown[]) {
      return _getValue(...args);
    }

    public async clearValue(...args: unknown[]) {
      return _clearValue(...args);
    }
  },
}));

describe("TicketService", () => {
  let ticketService: TicketService;

  beforeEach(() => {
    jest.clearAllMocks();
    ticketService = new TicketService();
  });

  describe("TicketService#grantTicket", () => {
    it("should cache an encrypted ticket and return it to a requesting client", async () => {
      const username = EXISTING_USERNAME;
      const location = CHANCE.state();

      const ticket = await ticketService.grantTicket(username, location);

      expect(_getClientByUsername).toHaveBeenCalledWith(username);
      expect(_setValue).toHaveBeenCalledWith(
        ticket,
        JSON.stringify(CLIENT),
        config.TICKET_CACHE_TTL
      );
      expect(_safetify).toHaveBeenCalledWith(EXISTING_CLIENT);
      expect(typeof ticket).toBe("string");
    });

    it("should not grant a ticket if no user exists with the provided username", async () => {
      _setValue.mockReset();

      const username = CHANCE.string();
      const location = CHANCE.state();

      try {
        await ticketService.grantTicket(username, location);
      } catch (error) {
        expect((error as Error).message).toBe(
          `No client found with username ${username}`
        );
      }

      expect(_setValue).not.toHaveBeenCalled();
      expect.assertions(2);
    });
  });

  describe("TicketService#validateTicket", () => {
    it("should clear a valid ticket from the cache and return a client when the location matches", async () => {
      const encryptedTicket = VALID_ENCRYPTED_TICKET;
      const location = VALID_LOCATION;

      const client = await ticketService.validateTicket(
        encryptedTicket,
        location
      );

      expect(_clearValue).toHaveBeenCalledWith(encryptedTicket);
      expect(client).toEqual(EXISTING_CLIENT);
    });

    it("should throw when the ticket does not exist in cache", async () => {
      const encryptedTicket = INVALID_ENCRYPTED_TICKET;
      const location = VALID_LOCATION;

      try {
        await ticketService.validateTicket(encryptedTicket, location);
      } catch (error) {
        expect((error as Error).message).toBe(
          "Provided ticket does not exist in cache."
        );
      }

      expect(_clearValue).not.toHaveBeenCalled();
      expect.assertions(2);
    });

    it("should throw when the ticket was not issued to the same location", async () => {
      const encryptedTicket = VALID_ENCRYPTED_TICKET;
      const location = CHANCE.ip();

      try {
        await ticketService.validateTicket(encryptedTicket, location);
      } catch (error) {
        expect((error as Error).message).toBe(
          "Provided ticket was not assigned to the same location."
        );
      }

      expect(_clearValue).not.toHaveBeenCalled();
      expect.assertions(2);
    });
  });
});
