import ProjectModel from "../../database/models/project.model.js";
import MembershipModel from "../../database/models/membership.model.js";
import { HttpException, NotFoundException, } from "../../common/utils/catch-error.js";
import { HTTPSTATUS } from "../../config/http.config.js";
import { ErrorCode } from "../../common/enums/error-code.enum.js";
export class ProjectService {
    async createProject(orgId, name) {
        const project = await ProjectModel.create({ orgId, name });
        return { project };
    }
    async listProjects(orgId, query) {
        const { archived, page, limit } = query;
        const projects = await ProjectModel.find({ orgId, archived })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        return { projects };
    }
    async updateProject(projectId, userId, data) {
        const project = await this.getProjectForUser(projectId, userId);
        const updated = await ProjectModel.findOneAndUpdate({ _id: projectId, orgId: project.orgId }, { $set: data }, { new: true });
        if (!updated)
            throw new NotFoundException("Project not found");
        return { project: updated };
    }
    async deleteProject(projectId, userId) {
        const project = await this.getProjectForUser(projectId, userId, true);
        // ponytail: cascade delete tasks when TaskModel exists (Phase 3)
        await ProjectModel.deleteOne({ _id: projectId, orgId: project.orgId });
        return { deleted: true };
    }
    async getProjectForUser(projectId, userId, adminOnly = false) {
        const project = await ProjectModel.findById(projectId).lean();
        if (!project)
            throw new NotFoundException("Project not found");
        const membership = await MembershipModel.findOne({
            orgId: project.orgId,
            userId,
        }).lean();
        if (!membership)
            throw new NotFoundException("Project not found");
        if (adminOnly && membership.role !== "admin") {
            throw new HttpException("Forbidden", HTTPSTATUS.FORBIDDEN, ErrorCode.ACCESS_FORBIDDEN);
        }
        return project;
    }
}
