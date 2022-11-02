import { Request, Response } from "express";
import { ChatsinoLogger } from "logging";
import { AuthenticatedClient, AuthenticationService } from "services";
import { ClientSession } from "./socket.controller";
import { clientSigninSchema } from "shared";
import { ValidationError } from "yup";

interface RequestWithCSRFToken extends Request {
  csrfToken(): string;
}

export class AuthenticationController {
  private logger = new ChatsinoLogger(this.constructor.name);
  private authenticationService = AuthenticationService.instance;

  public handleValidationRequest = async (req: Request, res: Response) => {
    try {
      this.logger.info(
        { sessionID: req.sessionID },
        "Received a request to validate."
      );

      const accessToken = req.signedCookies?.accessToken;
      const isValidated = Boolean(
        accessToken &&
          (await this.authenticationService.validateToken(accessToken))
      );

      res.status(200).send({
        error: false,
        result: "OK",
        message: "Validation request succeeded.",
        data: {
          isValidated,
          csrfToken: (req as RequestWithCSRFToken).csrfToken(),
        },
      });
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Unable to handle a request to validate."
      );

      res.status(400).send({
        error: true,
        result: "Error",
        message: "Failed to validate.",
      });
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
      const session = req.session as ClientSession;

      session.client = client;

      await this.grantTokens(res, client);

      res.status(200).send({
        error: false,
        result: "OK",
        message: "Successfully signed in.",
      });

      this.logger.info("Successfully signed a client in.");
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(
          { error: error.message },
          "Unable to sign a client out. (ValidationError)"
        );

        res.status(400).send({
          error: true,
          result: "Error",
          message: {
            description: "Validation errors detected.",
            errors: error.errors,
          },
        });
      } else if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to sign a client out. (Error)"
        );

        res.status(400).send({
          error: true,
          result: "Error",
          message: "Failed to sign in.",
        });
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

      res.status(200).send({
        error: false,
        result: "OK",
        message: "Successfully signed out.",
      });

      this.logger.info("Successfully signed a client out.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to sign a client out."
        );

        res.status(400).send({
          error: true,
          result: "Error",
          message: "Failed to sign out.",
        });
      }
    }
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
