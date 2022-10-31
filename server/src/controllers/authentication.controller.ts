import { Request, Response } from "express";
import { Session } from "express-session";
import { ChatsinoLogger } from "logging";
import { AuthenticatedClient, AuthenticationService } from "services";

export class AuthenticationController {
  private logger = new ChatsinoLogger(this.constructor.name);
  private authenticationService = AuthenticationService.instance;

  public handleSigninRequest = async (req: Request, res: Response) => {
    try {
      this.logger.info(
        { sessionID: req.sessionID },
        "Received a request to sign in."
      );

      const { username, password } = this.validateRequestBody(
        req,
        "username",
        "password"
      );
      const client = await this.authenticationService.signin(
        username,
        password
      );
      const session = req.session as Session & {
        client: AuthenticatedClient;
      };

      session.client = client;

      res.status(200).send({
        error: false,
        result: "OK",
        message: "Successfully signed in.",
      });
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Unable to handle a request to sign in."
      );

      res.status(400).send({
        error: true,
        result: "Error",
        message: "Failed to sign in.",
      });
    }
  };

  private validateRequestBody = (req: Request, ...fields: string[]) => {
    const values: Record<string, string> = {};

    for (const field of fields) {
      const fieldValue = req.body[field];

      if (typeof fieldValue === "undefined") {
        throw new Error(`Missing required field ${field} in request body.`);
      }

      values[field] = fieldValue;
    }

    return values;
  };
}
