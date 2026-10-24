import { ProjectController } from "./project.controller.js";
import { ProjectService } from "./project.service.js";

const projectService = new ProjectService();
export const projectController = new ProjectController(projectService);
