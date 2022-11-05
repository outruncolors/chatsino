import { NextFunction, Request, Response } from "express";
import { ClientPermissionLevel } from "repositories";
import { AuthenticatedClient, AuthenticationService } from "services";
import { errorResponse, meetsPermissionRequirement } from "helpers";

export interface AuthenticatedRequest extends Request {
  client: null | AuthenticatedClient;
}

const authenticationService = new AuthenticationService();

export async function clientSettingMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    req.client = null;
    return next();
  }

  const tokenData = await authenticationService.validateToken(accessToken);

  if (!tokenData) {
    res.clearCookie("accessToken");
    req.client = null;
    return next();
  }

  req.client = tokenData;

  return next();
}

export async function authenticatedRouteMiddleware(
  permissionLevel: ClientPermissionLevel
) {
  return function (
    { client }: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    const deny = () =>
      errorResponse(
        res,
        "You do not have permission to access that resource or perform that action."
      );
    const canAccess = Boolean(
      client &&
        meetsPermissionRequirement(permissionLevel, client.permissionLevel)
    );

    return canAccess ? next() : deny();
  };
}
