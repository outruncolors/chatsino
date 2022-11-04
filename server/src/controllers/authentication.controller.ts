import { NextFunction, Request, Response } from "express";
import { ChatsinoLogger } from "logging";
import { ClientPermissionLevel } from "repositories";
import {
  AuthenticatedClient,
  AuthenticationService,
  DecodedAuthToken,
  TicketService,
} from "services";
import { clientSigninSchema, clientSignupSchema } from "shared";
import { ValidationError } from "yup";
import { ClientSession } from "./socket.controller";

export interface RequestWithAuth extends Request {
  auth?: null | DecodedAuthToken;
}

export class AuthenticationController {
  private logger = new ChatsinoLogger(this.constructor.name);
  private authenticationService = new AuthenticationService();
  private ticketService = new TicketService();

  public validationMiddleware =
    (permissionLevel: ClientPermissionLevel) =>
    async (req: Request, res: Response, next: NextFunction) => {
      this.logger.info("Validating incoming request.");

      const accessToken = req.cookies?.accessToken as string;
      const validatedRequest = await this.authenticationService.validateToken(
        accessToken
      );

      if (
        permissionLevel !== "visitor" &&
        validatedRequest &&
        !validatedRequest.permissions.includes(permissionLevel)
      ) {
        return errorResponse(res, "Client permission mismatch.");
      }

      (req as RequestWithAuth).auth = validatedRequest ?? null;

      return next();
    };

  public validateRequestToken = async (
    req: Request,
    permissionLevel: ClientPermissionLevel
  ) => {
    const accessToken = req.cookies?.accessToken as string;
    const validatedRequest = await this.authenticationService.validateToken(
      accessToken
    );

    if (!validatedRequest) {
      throw new Error("Missing validated token");
    }

    if (
      permissionLevel !== "visitor" &&
      validatedRequest &&
      !validatedRequest.permissions.includes(permissionLevel)
    ) {
      throw new Error("Client permission mismatch.");
    }

    return validatedRequest;
  };

  public handleValidationRequest = async (
    req: RequestWithAuth,
    res: Response
  ) => {
    try {
      this.logger.info(
        { sessionID: req.sessionID },
        "Received a request to validate."
      );

      return successResponse(res, "Validation request succeeded.", {
        client: req.auth,
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to handle a request to validate."
        );

        return errorResponse(res, "Failed to validate.");
      }
    }
  };

  public handleSignupRequest = async (req: Request, res: Response) => {
    try {
      this.logger.info(
        { sessionID: req.sessionID },
        "Received a request to sign up."
      );

      const { username, password } = await clientSignupSchema.validate(
        req.body
      );
      const client = await this.authenticationService.signup(
        username,
        password
      );

      await this.attachSession(req, res, client);

      this.logger.info("Successfully signed a client up.");

      return successResponse(res, "Successfully signed up.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to sign a client up."
        );

        return errorResponse(res, "Failed to sign up.");
      }
    }
  };

  public handleSigninRequest = async (req: Request, res: Response) => {
    try {
      this.logger.info(
        { sessionID: req.sessionID },
        "Received a request to sign in."
      );

      const { username, password } = await clientSigninSchema.validate(
        req.body
      );
      const client = await this.authenticationService.signin(
        username,
        password
      );

      await this.attachSession(req, res, client);

      this.logger.info("Successfully signed a client in.");

      return successResponse(res, "Successfully signed up.");
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(
          { error: error.message },
          "Unable to sign a client out. (ValidationError)"
        );

        return errorResponse(
          res,
          `Validation errors detected:\n${error.errors.join("\n")}`
        );
      } else if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to sign a client out. (Error)"
        );

        return errorResponse(res, "Failed to sign in.");
      }
    }
  };

  public handleSignoutRequest = async (req: Request, res: Response) => {
    try {
      this.logger.info(
        { sessionID: req.sessionID },
        "Received a request to sign out."
      );

      const session = req.session as ClientSession;
      const username = session.client?.username;

      if (username) {
        await this.authenticationService.signout(username);
      }

      await new Promise((resolve) => req.session.destroy(resolve));

      this.revokeTokens(res);

      this.logger.info("Successfully signed a client out.");

      return successResponse(res, "Successfully signed out.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to sign a client out."
        );

        return errorResponse(res, "Failed to sign out.");
      }
    }
  };

  // https://devcenter.heroku.com/articles/websocket-security#authentication-authorization
  public handleTicketRequest = async (req: RequestWithAuth, res: Response) => {
    try {
      this.logger.info(
        { sessionID: req.sessionID },
        "Received a request for a ticket."
      );

      const client = req.auth;
      if (client) {
        if (!req.socket.remoteAddress) {
          throw new Error("Missing remote address");
        }

        const ticket = await this.ticketService.grantTicket(
          client.username,
          req.socket.remoteAddress
        );

        this.logger.info("Approved a request for a ticket.");

        return successResponse(res, "Ticket request granted", {
          ticket,
        });
      } else {
        throw new Error("Unauthenticated ticket request");
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.info({ error }, "Denied a request for a ticket.");

        return errorResponse(res, "Ticket request denied");
      }
    }
  };

  public verifyTicket = async (req: RequestWithAuth, ticket: string) => {
    try {
      this.logger.info({ ticket }, "Verifying a ticket.");

      const client = req.auth;

      if (!client) {
        throw new Error("Unauthenticated ticket verification request.");
      }

      if (!req.socket.remoteAddress) {
        throw new Error("Request missing remote address");
      }

      const verified = await this.ticketService.validateTicket(
        ticket,
        client.username,
        req.socket.remoteAddress
      );

      this.logger.info({ verified }, "Verified a ticket.");

      return verified;
    } catch (error) {
      this.logger.info({ error }, "Ticket verification failed.");

      return false;
    }
  };

  private attachSession = (
    req: Request,
    res: Response,
    client: AuthenticatedClient
  ) => {
    const session = req.session as ClientSession;
    session.client = client;
    return this.grantTokens(res, client);
  };

  private grantTokens = async (res: Response, client: AuthenticatedClient) => {
    res.cookie(
      "accessToken",
      await this.authenticationService.createClientAccessToken(client),
      {
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      }
    );

    res.cookie(
      "refreshToken",
      await this.authenticationService.createClientRefreshToken(
        client.username
      ),
      {
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      }
    );
  };

  private revokeTokens = async (res: Response) => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
  };
}

const successResponse = (
  res: Response,
  message: string,
  data?: Record<string, unknown>
) =>
  res.status(200).send({
    error: false,
    result: "OK",
    message,
    data,
  });

const errorResponse = (res: Response, message: string) =>
  res.status(400).send({
    error: true,
    result: "Error",
    message,
  });

const formatTicketLabel = (username: string) => `${username}/Ticket`;
