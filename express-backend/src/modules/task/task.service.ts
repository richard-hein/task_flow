import TaskModel from "../../database/models/task.model.js";
import ProjectModel from "../../database/models/project.model.js";
import MembershipModel from "../../database/models/membership.model.js";
import CommentModel from "../../database/models/comment.model.js";
import ActivityModel from "../../database/models/activity.model.js";
import { logActivity } from "../activity/activity.service.js";
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
  assigneeId?: string | null | undefined;
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
    const last = await TaskModel.findOne({ projectId: pid, status: "todo" })
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
    logActivity({
      taskId: task._id.toString(),
      orgId: project.orgId.toString(),
      actorId: userId,
      action: "created",
      detail: task.title,
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
    const { assigneeId, ...rest } = data;
    if (assigneeId) {
      await this.assertOrgMember(task.orgId.toString(), assigneeId);
    }
    const update: { $set: Record<string, unknown>; $unset?: Record<string, 1> } = {
      $set: rest,
    };
    if (assigneeId === null) {
      update.$unset = { assigneeId: 1 };
    } else if (assigneeId !== undefined) {
      update.$set.assigneeId = assigneeId;
    }
    const previousAssignee = task.assigneeId?.toString();
    const assigneeChanged =
      assigneeId !== undefined &&
      (assigneeId === null
        ? previousAssignee !== undefined
        : assigneeId !== previousAssignee);
    const updated = await TaskModel.findOneAndUpdate(
      { _id: tid, orgId: task.orgId },
      update,
      { new: true },
    );
    if (!updated) throw new NotFoundException("Task not found");
    if (assigneeChanged) {
      logActivity({
        taskId: tid,
        orgId: task.orgId.toString(),
        actorId: userId,
        action: "assigned",
        detail: assigneeId === null ? "unassigned" : `assignee:${assigneeId}`,
      });
    }
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
    const previousStatus = task.status;
    const updated = await TaskModel.findOneAndUpdate(
      { _id: tid, orgId: task.orgId },
      { $set },
      { new: true },
    );
    if (!updated) throw new NotFoundException("Task not found");
    logActivity({
      taskId: tid,
      orgId: task.orgId.toString(),
      actorId: userId,
      action: "moved",
      detail: `${previousStatus} → ${status}`,
    });
    return { task: updated };
  }

  public async deleteTask(tid: string, userId: string) {
    const task = await this.getTaskForUser(tid, userId);
    // Children first, same reasoning as the project cascade: a crash must never leave
    // comments/activity pointing at a task that no longer exists.
    await CommentModel.deleteMany({ taskId: tid, orgId: task.orgId });
    await ActivityModel.deleteMany({ taskId: tid, orgId: task.orgId });
    await TaskModel.deleteOne({ _id: tid, orgId: task.orgId });
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
