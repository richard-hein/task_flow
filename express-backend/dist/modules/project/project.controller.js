import z from "zod";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { createProjectSchema, listProjectsQuerySchema, updateProjectSchema, } from "../../common/validators/project.validators.js";
import { HTTPSTATUS } from "../../config/http.config.js";
export class ProjectController {
    constructor(projectService) {
        this.createProject = asyncHandler(async (req, res) => {
            const orgId = z.string().parse(req.params.id);
            const { name } = createProjectSchema.parse(req.body);
            const result = await this.projectService.createProject(orgId, name);
            return res.status(HTTPSTATUS.CREATED).json({
                message: "Project created successfully.",
                ...result,
            });
        });
        this.listProjects = asyncHandler(async (req, res) => {
            const orgId = z.string().parse(req.params.id);
            const query = listProjectsQuerySchema.parse(req.query);
            const result = await this.projectService.listProjects(orgId, {
                archived: query.archived === "true",
                page: query.page,
                limit: query.limit,
            });
            return res.status(HTTPSTATUS.OK).json({
                message: "Projects retrieved successfully.",
                ...result,
            });
        });
        this.updateProject = asyncHandler(async (req, res) => {
            const projectId = z.string().parse(req.params.pid);
            const data = updateProjectSchema.parse(req.body);
            const result = await this.projectService.updateProject(projectId, req.user._id.toString(), data);
            return res.status(HTTPSTATUS.OK).json({
                message: "Project updated successfully.",
                ...result,
            });
        });
        this.deleteProject = asyncHandler(async (req, res) => {
            const projectId = z.string().parse(req.params.pid);
            await this.projectService.deleteProject(projectId, req.user._id.toString());
            return res.status(HTTPSTATUS.OK).json({
                message: "Project deleted successfully.",
            });
        });
        this.projectService = projectService;
    }
}
