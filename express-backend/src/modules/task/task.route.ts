import { Router } from "express";
import { taskController } from "./task.module.js";

const taskRoutes = Router();

taskRoutes.post("/projects/:pid/tasks", taskController.createTask);
taskRoutes.get("/projects/:pid/tasks", taskController.listTasks);
taskRoutes.put("/tasks/:tid", taskController.updateTask);
taskRoutes.put("/tasks/:tid/move", taskController.moveTask);
taskRoutes.delete("/tasks/:tid", taskController.deleteTask);

export default taskRoutes;
