import CommentModel from "../../database/models/comment.model.js";
import TaskModel from "../../database/models/task.model.js";
import MembershipModel from "../../database/models/membership.model.js";
import {
  HttpException,
  NotFoundException,
} from "../../common/utils/catch-error.js";
import { HTTPSTATUS } from "../../config/http.config.js";
import { ErrorCode } from "../../common/enums/error-code.enum.js";
import { logActivity } from "../activity/activity.service.js";

type ListCommentsQuery = {
  page: number;
  limit: number;
};

export class CommentService {
  public async createComment(tid: string, userId: string, body: string) {
    const task = await this.getTaskForUser(tid, userId);
    const comment = await CommentModel.create({
      taskId: tid,
      orgId: task.orgId,
      authorId: userId,
      body,
    });
    logActivity({
      taskId: tid,
      orgId: task.orgId.toString(),
      actorId: userId,
      action: "commented",
      detail: body.length > 120 ? `${body.slice(0, 120)}…` : body,
    });
    return { comment };
  }

  public async listComments(
    tid: string,
    userId: string,
    query: ListCommentsQuery,
  ) {
    const task = await this.getTaskForUser(tid, userId);
    const comments = await CommentModel.find({ taskId: tid, orgId: task.orgId })
      .sort({ createdAt: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean();
    return { comments };
  }

  public async deleteComment(cid: string, userId: string) {
    const comment = await CommentModel.findById(cid).lean();
    if (!comment) throw new NotFoundException("Comment not found");

    // Membership is derived from the comment's own org — never from the request.
    const membership = await MembershipModel.findOne({
      orgId: comment.orgId,
      userId,
    }).lean();
    if (!membership) throw new NotFoundException("Comment not found");

    const isAuthor = comment.authorId.toString() === userId;
    if (!isAuthor && membership.role !== "admin") {
      throw new HttpException(
        "Forbidden",
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.ACCESS_FORBIDDEN,
      );
    }

    await CommentModel.deleteOne({ _id: cid, orgId: comment.orgId });
    return { deleted: true };
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
