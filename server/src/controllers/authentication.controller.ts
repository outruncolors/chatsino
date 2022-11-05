import { Request, Response } from "express";
import { ChatsinoLogger } from "logging";
import {
  AuthenticatedClient,
  AuthenticationService,
  TicketService,
} from "services";
import { AuthenticatedRequest } from "middleware";
import { clientSigninSchema, clientSignupSchema } from "shared";
import { successResponse, errorResponse } from "helpers";
import { ValidationError } from "yup";

export class AuthenticationController {
  private logger = new ChatsinoLogger(this.constructor.name);
  private authenticationService = new AuthenticationService();
  private ticketService = new TicketService();

  // [/api/validate]
  public handleValidationRequest = async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      this.logger.info("Received a request to validate.");

      return successResponse(res, "Validation request succeeded.", {
        client: req.client,
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

  // [/api/signup]
  public handleSignupRequest = async (req: Request, res: Response) => {
    try {
      this.logger.info("Received a request to sign up.");

      const { username, password } = await clientSignupSchema.validate(
        req.body
      );
      const client = await this.authenticationService.signup(
        username,
        password
      );

      await this.grantTokens(res, client);

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

  // [/api/signin]
  public handleSigninRequest = async (req: Request, res: Response) => {
    try {
      this.logger.info("Received a request to sign in.");

      const { username, password } = await clientSigninSchema.validate(
        req.body
      );
      const client = await this.authenticationService.signin(
        username,
        password
      );

      await this.grantTokens(res, client);

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

  // [/api/signout]
  public handleSignoutRequest = async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      this.logger.info("Received a request to sign out.");

      const { client } = req;

      if (!client) {
        throw new Error("Cannot sign out a client that is not signed in.");
      }

      await this.authenticationService.signout(client.username);

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
  // [/api/ticket]
  public handleTicketRequest = async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    this.logger.info("Received a request for a ticket.");

    const deny = () => errorResponse(res, "Ticket request denied");
    const {
      client,
      socket: { remoteAddress },
    } = req;

    if (!client || !remoteAddress) {
      return deny();
    }

    try {
      const ticket = await this.ticketService.grantTicket(
        client.username,
        remoteAddress
      );

      return successResponse(res, "Ticket request granted", {
        ticket,
      });
    } catch (error) {
      this.logger.info({ error }, "Denied a request for a ticket.");
      return deny();
    }
  };

  public verifyTicket = async (req: AuthenticatedRequest, ticket: string) => {
    this.logger.info({ ticket }, "Verifying a ticket.");

    const {
      client,
      socket: { remoteAddress },
    } = req;

    if (!client || !remoteAddress) {
      return null;
    }

    try {
      const verified = await this.ticketService.validateTicket(
        ticket,
        remoteAddress
      );

      return verified;
    } catch (error) {
      this.logger.info({ error }, "Ticket verification failed.");

      return null;
    }
  };

  private grantTokens = async (res: Response, client: AuthenticatedClient) => {
    res.cookie(
      "accessToken",
      await this.authenticationService.createClientAccessToken(client),
      {
        httpOnly: true,
        sameSite: "strict",
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
      }
    );
  };

  private revokeTokens = async (res: Response) => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
  };
}
