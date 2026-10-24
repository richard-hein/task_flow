import type { Request, Response } from "express";
import z from "zod";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type { TaskService } from "./task.service.js";
import {
  createTaskSchema,
  listTasksQuerySchema,
  moveTaskSchema,
  updateTaskSchema,
} from "../../common/validators/task.validators.js";
import { HTTPSTATUS } from "../../config/http.config.js";

export class TaskController {
  private taskService: TaskService;

  constructor(taskService: TaskService) {
    this.taskService = taskService;
  }

  public createTask = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const pid = z.string().parse(req.params.pid);
      const data = createTaskSchema.parse(req.body);
      const result = await this.taskService.createTask(
        pid,
        req.user!._id.toString(),
        data,
      );
      return res.status(HTTPSTATUS.CREATED).json({
        message: "Task created successfully.",
        ...result,
      });
    },
  );

  public listTasks = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const pid = z.string().parse(req.params.pid);
      const query = listTasksQuerySchema.parse(req.query);
      const result = await this.taskService.listTasks(
        pid,
        req.user!._id.toString(),
        query,
      );
      return res.status(HTTPSTATUS.OK).json({
        message: "Tasks retrieved successfully.",
        ...result,
      });
    },
  );

  public updateTask = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const tid = z.string().parse(req.params.tid);
      const data = updateTaskSchema.parse(req.body);
      const result = await this.taskService.updateTask(
        tid,
        req.user!._id.toString(),
        data,
      );
      return res.status(HTTPSTATUS.OK).json({
        message: "Task updated successfully.",
        ...result,
      });
    },
  );

  public moveTask = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const tid = z.string().parse(req.params.tid);
      const { status, order } = moveTaskSchema.parse(req.body);
      const result = await this.taskService.moveTask(
        tid,
        req.user!._id.toString(),
        status,
        order,
      );
      return res.status(HTTPSTATUS.OK).json({
        message: "Task moved successfully.",
        ...result,
      });
    },
  );

  public deleteTask = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const tid = z.string().parse(req.params.tid);
      await this.taskService.deleteTask(tid, req.user!._id.toString());
      return res.status(HTTPSTATUS.OK).json({
        message: "Task deleted successfully.",
      });
    },
  );
}
