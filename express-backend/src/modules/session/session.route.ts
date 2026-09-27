import { Router } from "express";
import { sessionController } from "./session.module.js";

const sessionRoutes = Router();

sessionRoutes.get("/all", sessionController.getAllSession);
sessionRoutes.get("/single", sessionController.getSession);
sessionRoutes.get("/:id", sessionController.deleteSession);

export default sessionRoutes;
