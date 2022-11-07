import { Response } from "express";
import { ChatsinoLogger } from "logging";
import { AuthenticatedRequest } from "middleware";
import { adminPaySchema } from "shared";
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
}
