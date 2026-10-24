import { TaskController } from "./task.controller.js";
import { TaskService } from "./task.service.js";

const taskService = new TaskService();
export const taskController = new TaskController(taskService);
