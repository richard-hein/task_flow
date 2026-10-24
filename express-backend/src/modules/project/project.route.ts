import { Router } from "express";
import { projectController } from "./project.module.js";
import { requireOrgMember } from "../../middlewares/require-org-member.middleware.js";

const orgProjectRoutes = Router();

orgProjectRoutes.post(
  "/:id/projects",
  requireOrgMember(),
  projectController.createProject,
);
orgProjectRoutes.get(
  "/:id/projects",
  requireOrgMember(),
  projectController.listProjects,
);

const projectRoutes = Router();

projectRoutes.put("/:pid", projectController.updateProject);
projectRoutes.delete("/:pid", projectController.deleteProject);

export { orgProjectRoutes, projectRoutes };
