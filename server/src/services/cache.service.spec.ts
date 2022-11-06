import Chance from "chance";
import { CacheService } from "./cache.service";

const CHANCE = new Chance();

let _get = jest.fn().mockImplementation(() => Promise.resolve(_cachedValue));
let _cachedValue = CHANCE.string();
let _set = jest.fn();
let _del = jest.fn();
jest.mock("redis", () => ({
  createClient: () => ({
    connect: jest.fn(),
    on: jest.fn(),
    get: (...args: unknown[]) => _get(...args),
    set: (...args: unknown[]) => _set(...args),
    del: (...args: unknown[]) => _del(...args),
  }),
}));

const NOW_TIME = new Date().getTime();
jest.mock("helpers", () => ({
  now: () => NOW_TIME,
}));

describe("CacheService", () => {
  let cacheService: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new CacheService();
  });

  describe("CacheService#getValue", () => {
    it("should retrieve a value from the cache and return it (JSON)", async () => {
      const key = CHANCE.string();
      const cachedValue = { username: CHANCE.name() };
      _cachedValue = JSON.stringify(cachedValue);

      const value = await cacheService.getValue(key);

      expect(typeof value).toBe("object");
      expect(_get).toHaveBeenCalledWith(key);
    });

    it("should retrieve a value from the cache and return it (non-JSON)", async () => {
      const key = CHANCE.string();
      const cachedValue = CHANCE.string();
      _cachedValue = cachedValue;

      const value = await cacheService.getValue(key);

      expect(typeof value).toBe("string");
      expect(_get).toHaveBeenCalledWith(key);
    });
  });

  describe("CacheService#setValue", () => {
    it("should set a value in the cache", async () => {
      const key = CHANCE.string();
      const value = CHANCE.string();
      const ttl = CHANCE.integer();

      await cacheService.setValue(key, value, ttl);

      expect(_set).toHaveBeenCalledWith(key, value, { EXAT: NOW_TIME + ttl });
    });
  });

  describe("CacheService#clearValue", () => {
    it("should clear a value in the cache", async () => {
      const key = CHANCE.string();

      await cacheService.clearValue(key);

      expect(_del).toHaveBeenCalledWith(key);
    });
  });
});
