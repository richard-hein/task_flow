import { ActivityController } from "./activity.controller.js";
import { ActivityService } from "./activity.service.js";

const activityService = new ActivityService();
export const activityController = new ActivityController(activityService);
