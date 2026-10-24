import TaskModel from "../../database/models/task.model.js";
import ProjectModel from "../../database/models/project.model.js";
import MembershipModel from "../../database/models/membership.model.js";
import {
  BadRequestException,
  NotFoundException,
} from "../../common/utils/catch-error.js";

type CreateTaskData = {
  title: string;
  desc?: string | undefined;
  priority?: "low" | "med" | "high" | undefined;
  assigneeId?: string | undefined;
  dueAt?: Date | undefined;
};

type UpdateTaskData = {
  title?: string | undefined;
  desc?: string | undefined;
  priority?: "low" | "med" | "high" | undefined;
  assigneeId?: string | undefined;
  dueAt?: Date | undefined;
};

type ListTasksQuery = {
  status?: "todo" | "doing" | "done" | undefined;
  assignee?: string | undefined;
  search?: string | undefined;
  page: number;
  limit: number;
};

const ADJACENT: Record<string, string[]> = {
  todo: ["doing"],
  doing: ["todo", "done"],
  done: ["doing"],
};

const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class TaskService {
  public async createTask(pid: string, userId: string, data: CreateTaskData) {
    const project = await this.getProjectForUser(pid, userId);
    if (data.assigneeId) {
      await this.assertOrgMember(project.orgId.toString(), data.assigneeId);
    }
    const last = await TaskModel.findOne({ projectId: pid })
      .sort({ order: -1 })
      .select("order")
      .lean();
    const task = await TaskModel.create({
      projectId: pid,
      orgId: project.orgId,
      ...data,
      status: "todo",
      order: (last?.order ?? 0) + 1,
    });
    return { task };
  }

  public async listTasks(pid: string, userId: string, query: ListTasksQuery) {
    const project = await this.getProjectForUser(pid, userId);
    const filter: Record<string, unknown> = {
      orgId: project.orgId,
      projectId: pid,
    };
    if (query.status) filter.status = query.status;
    if (query.assignee) filter.assigneeId = query.assignee;
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [{ title: re }, { desc: re }];
    }
    const tasks = await TaskModel.find(filter)
      .sort({ order: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean();
    return { tasks };
  }

  public async updateTask(tid: string, userId: string, data: UpdateTaskData) {
    const task = await this.getTaskForUser(tid, userId);
    if (data.assigneeId) {
      await this.assertOrgMember(task.orgId.toString(), data.assigneeId);
    }
    const updated = await TaskModel.findOneAndUpdate(
      { _id: tid, orgId: task.orgId },
      { $set: data },
      { new: true },
    );
    if (!updated) throw new NotFoundException("Task not found");
    return { task: updated };
  }

  public async moveTask(
    tid: string,
    userId: string,
    status: string,
    order?: number,
  ) {
    const task = await this.getTaskForUser(tid, userId);
    if (!ADJACENT[task.status]?.includes(status)) {
      throw new BadRequestException(
        `Illegal status move: ${task.status} -> ${status}`,
      );
    }
    const $set: Record<string, unknown> = { status };
    if (order !== undefined) $set.order = order;
    const updated = await TaskModel.findOneAndUpdate(
      { _id: tid, orgId: task.orgId },
      { $set },
      { new: true },
    );
    if (!updated) throw new NotFoundException("Task not found");
    return { task: updated };
  }

  public async deleteTask(tid: string, userId: string) {
    const task = await this.getTaskForUser(tid, userId);
    await TaskModel.deleteOne({ _id: tid, orgId: task.orgId });
    // ponytail: cascade delete comments when comment.model.ts exists (Phase 4)
    return { deleted: true };
  }

  private async getProjectForUser(pid: string, userId: string) {
    const project = await ProjectModel.findById(pid).lean();
    if (!project) throw new NotFoundException("Project not found");
    const membership = await MembershipModel.findOne({
      orgId: project.orgId,
      userId,
    }).lean();
    if (!membership) throw new NotFoundException("Project not found");
    return project;
  }

  private async getTaskForUser(tid: string, userId: string) {
    const task = await TaskModel.findById(tid).lean();
    if (!task) throw new NotFoundException("Task not found");
    const membership = await MembershipModel.findOne({
      orgId: task.orgId,
      userId,
    }).lean();
    if (!membership) throw new NotFoundException("Task not found");
    return task;
  }

  private async assertOrgMember(orgId: string, userId: string) {
    const membership = await MembershipModel.findOne({ orgId, userId }).lean();
    if (!membership) {
      throw new BadRequestException("Assignee is not an org member");
    }
  }
}
