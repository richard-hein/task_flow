import ProjectModel from "../../database/models/project.model.js";
import TaskModel from "../../database/models/task.model.js";
import MembershipModel from "../../database/models/membership.model.js";
import {
  HttpException,
  NotFoundException,
} from "../../common/utils/catch-error.js";
import { HTTPSTATUS } from "../../config/http.config.js";
import { ErrorCode } from "../../common/enums/error-code.enum.js";

type UpdateProjectData = {
  name?: string | undefined;
  archived?: boolean | undefined;
};

export class ProjectService {
  public async createProject(orgId: string, name: string) {
    const project = await ProjectModel.create({ orgId, name });
    return { project };
  }

  public async listProjects(
    orgId: string,
    query: { archived: boolean; page: number; limit: number },
  ) {
    const { archived, page, limit } = query;
    const projects = await ProjectModel.find({ orgId, archived })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { projects };
  }

  public async updateProject(
    projectId: string,
    userId: string,
    data: UpdateProjectData,
  ) {
    const project = await this.getProjectForUser(projectId, userId);
    const updated = await ProjectModel.findOneAndUpdate(
      { _id: projectId, orgId: project.orgId },
      { $set: data },
      { new: true },
    );
    if (!updated) throw new NotFoundException("Project not found");
    return { project: updated };
  }

  public async deleteProject(projectId: string, userId: string) {
    const project = await this.getProjectForUser(projectId, userId, true);
    // Tasks first: a crash between the two leaves a project with no tasks (recoverable),
    // never tasks pointing at a project that no longer exists.
    await TaskModel.deleteMany({ projectId, orgId: project.orgId });
    await ProjectModel.deleteOne({ _id: projectId, orgId: project.orgId });
    return { deleted: true };
  }

  private async getProjectForUser(
    projectId: string,
    userId: string,
    adminOnly = false,
  ) {
    const project = await ProjectModel.findById(projectId).lean();
    if (!project) throw new NotFoundException("Project not found");

    const membership = await MembershipModel.findOne({
      orgId: project.orgId,
      userId,
    }).lean();
    if (!membership) throw new NotFoundException("Project not found");

    if (adminOnly && membership.role !== "admin") {
      throw new HttpException(
        "Forbidden",
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.ACCESS_FORBIDDEN,
      );
    }
    return project;
  }
}
