import ActivityModel, {
  type ActivityAction,
} from "../../database/models/activity.model.js";
import TaskModel from "../../database/models/task.model.js";
import MembershipModel from "../../database/models/membership.model.js";
import { NotFoundException } from "../../common/utils/catch-error.js";

type LogActivityData = {
  taskId: string;
  orgId: string;
  actorId: string;
  action: ActivityAction;
  detail?: string;
};

/**
 * Fire-and-forget on purpose: a logging failure must never fail the mutation that
 * triggered it, so callers do not await this.
 */
export const logActivity = (data: LogActivityData): void => {
  ActivityModel.create(data).catch((error) => {
    console.error(
      `Failed to write activity "${data.action}" for task ${data.taskId}`,
      (error as Error).message,
    );
  });
};

type ListActivityQuery = {
  page: number;
  limit: number;
};

export class ActivityService {
  public async listActivity(
    tid: string,
    userId: string,
    query: ListActivityQuery,
  ) {
    const task = await this.getTaskForUser(tid, userId);
    const activities = await ActivityModel.find({
      taskId: tid,
      orgId: task.orgId,
    })
      .sort({ at: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean();
    return { activities };
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
}
