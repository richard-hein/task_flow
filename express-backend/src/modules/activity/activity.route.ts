import { Router } from "express";
import { activityController } from "./activity.module.js";

const activityRoutes = Router();

activityRoutes.get("/tasks/:tid/activity", activityController.listActivity);

export default activityRoutes;
