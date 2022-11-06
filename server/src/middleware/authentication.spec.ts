import Chance from "chance";
import { Response } from "express";
import { TestGenerator } from "helpers";
import {
  AuthenticatedRequest,
  authenticatedRouteMiddleware,
  clientSettingMiddleware,
} from "./authentication";

const CHANCE = new Chance();

const SAMPLE_AUTHENTICATED_CLIENT = {
  username: CHANCE.name(),
  permissionLevel: "admin:unlimited",
};

let _validateTokenResponse: null | typeof SAMPLE_AUTHENTICATED_CLIENT =
  SAMPLE_AUTHENTICATED_CLIENT;

jest.mock("services", () => ({
  ...jest.requireActual("services"),
  AuthenticationService: class {
    public async validateToken() {
      return _validateTokenResponse;
    }
  },
}));

describe("authenticatedRouteMiddleware", () => {
  it("should allow a client to access a resource if their permission level matches the requirement", () => {
    const middleware = authenticatedRouteMiddleware("admin:limited");
    const request = {
      client: TestGenerator.createAuthenticatedClient(),
    } as AuthenticatedRequest;
    const response = null as unknown as Response;
    const next = jest.fn();

    middleware(request, response, next);

    expect(next).toHaveBeenCalled();
  });

  it("should prevent a client from accessing a resource if their permission level does not match the requirement", () => {
    const client = TestGenerator.createAuthenticatedClient();
    client.permissionLevel = "admin:limited";

    const middleware = authenticatedRouteMiddleware("admin:unlimited");
    const request = {
      client,
    } as AuthenticatedRequest;
    const response = {
      status: jest.fn().mockImplementation(() => ({
        send: jest.fn(),
      })),
    } as unknown as Response;
    const next = jest.fn();

    middleware(request, response, next);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("clientSettingMiddleware", () => {
  it("should properly set the request client if everything works out", async () => {
    const request = {
      client: null,
      cookies: {
        accessToken: "AN_ACCESS_TOKEN",
      },
    } as AuthenticatedRequest;
    const response = null as unknown as Response;
    const next = jest.fn();

    await clientSettingMiddleware(request, response, next);

    expect(request.client).toEqual(SAMPLE_AUTHENTICATED_CLIENT);
    expect(next).toHaveBeenCalled();
  });

  it("should set a client to null if there is no access token present", async () => {
    const request = {
      client: undefined,
      cookies: {},
    } as unknown as AuthenticatedRequest;
    const response = null as unknown as Response;
    const next = jest.fn();

    await clientSettingMiddleware(request, response, next);

    expect(request.client).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  it("should set a client to null and clear invalid tokens", async () => {
    _validateTokenResponse = null;

    const request = {
      client: undefined,
      cookies: {
        accessToken: "AN_ACCESS_TOKEN",
      },
    } as unknown as AuthenticatedRequest;
    const response = {
      clearCookie: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    await clientSettingMiddleware(request, response, next);

    expect(request.client).toBeNull();
    expect(response.clearCookie).toHaveBeenCalledWith("accessToken");
    expect(next).toHaveBeenCalled();
  });
});
