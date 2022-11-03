import { Request, Response } from "express";
import { ChatsinoLogger } from "logging";
import { AuthenticatedClient, AuthenticationService } from "services";
import { ClientSession } from "./socket.controller";
import { clientSigninSchema, clientSignupSchema } from "shared";
import { ValidationError } from "yup";

export class AuthenticationController {
  private logger = new ChatsinoLogger(this.constructor.name);
  private authenticationService = new AuthenticationService();

  public handleValidationRequest = async (req: Request, res: Response) => {
    try {
      this.logger.info(
        { sessionID: req.sessionID },
        "Received a request to validate."
      );

      const accessToken = req.cookies?.accessToken;
      const isValidated = Boolean(
        accessToken &&
          (await this.authenticationService.validateToken(accessToken))
      );

      this.logger.info(
        { sessionID: req.sessionID, isValidated },
        "Validation request complete."
      );

      return successResponse(res, "Validation request succeeded.", {
        isValidated,
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
      const username = session.client.username;

      await this.authenticationService.signout(username);
      await new Promise((resolve) => req.session.destroy(resolve));

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
      await this.authenticationService.createClientAccessToken(client.username),
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
