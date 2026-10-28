import type { Request, Response } from "express";
import z from "zod";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type { ActivityService } from "./activity.service.js";
import { listActivityQuerySchema } from "../../common/validators/activity.validators.js";
import { HTTPSTATUS } from "../../config/http.config.js";

export class ActivityController {
  private activityService: ActivityService;

  constructor(activityService: ActivityService) {
    this.activityService = activityService;
  }

  public listActivity = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const tid = z.string().parse(req.params.tid);
      const query = listActivityQuerySchema.parse(req.query);
      const result = await this.activityService.listActivity(
        tid,
        req.user!._id.toString(),
        query,
      );
      return res.status(HTTPSTATUS.OK).json({
        message: "Activity retrieved successfully.",
        ...result,
      });
    },
  );
}
