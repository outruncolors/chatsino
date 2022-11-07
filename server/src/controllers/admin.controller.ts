import { Response } from "express";
import { ChatsinoLogger } from "logging";
import { AuthenticatedRequest } from "middleware";
import {
  AdminChangePermissionSchema,
  adminChangePermissionSchema,
  adminPaySchema,
} from "shared";
import { successResponse, errorResponse } from "helpers";
import { AdminService } from "services";

export class AdminController {
  private logger = new ChatsinoLogger(this.constructor.name);
  private adminService = new AdminService();

  // [/api/admin/pay]
  public async handlePayRequest(req: AuthenticatedRequest, res: Response) {
    try {
      this.logger.info(
        {
          admin: req.client?.username,
          clientToPay: req.body.clientId,
          amount: req.body.amount,
        },
        "Received a request to pay a user."
      );

      const { clientId, amount } = await adminPaySchema.validate(req.body);

      await this.adminService.payClient(clientId, amount);

      this.logger.info("Successfully paid a client.");

      return successResponse(res, `Paid client ${amount} chips.`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error({ error: error.message }, "Unable to pay a client.");

        return errorResponse(res, "Failed to pay client.");
      }
    }
  }

  // [/api/admin/charge]
  public async handleChargeRequest(req: AuthenticatedRequest, res: Response) {
    try {
      this.logger.info(
        {
          admin: req.client?.username,
          clientToCharge: req.body.clientId,
          amount: req.body.amount,
        },
        "Received a request to charge a user."
      );

      const { clientId, amount } = await adminPaySchema.validate(req.body);

      await this.adminService.chargeClient(clientId, amount);

      this.logger.info("Successfully charged a client.");

      return successResponse(res, `Charged client ${amount} chips.`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to charge a client."
        );

        return errorResponse(res, "Failed to charge client.");
      }
    }
  }

  // [/api/admin/change-permission]
  public async handleChangePermissionRequest(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      this.logger.info(
        {
          admin: req.client?.username,
          clientToChangePermission: req.body.clientId,
          permissionLevel: req.body.permissionLevel,
        },
        "Received a request to change a client's permission level."
      );

      const { clientId, permissionLevel } =
        (await adminChangePermissionSchema.validate(
          req.body
        )) as AdminChangePermissionSchema;

      await this.adminService.changeClientPermissionLevel(
        clientId,
        permissionLevel
      );

      this.logger.info("Successfully changed a client's permission level.");

      return successResponse(
        res,
        `Changed client's permission level to ${permissionLevel}.`
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to change a client's permission level."
        );

        return errorResponse(
          res,
          "Failed to change client's permission level."
        );
      }
    }
  }
}
