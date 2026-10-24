import z from "zod";

const taskTitleSchema = z.string().trim().min(1).max(200);
const taskDescSchema = z.string().trim().max(2000);

export const createTaskSchema = z.object({
  title: taskTitleSchema,
  desc: taskDescSchema.optional(),
  priority: z.enum(["low", "med", "high"]).optional(),
  assigneeId: z.string().optional(),
  dueAt: z.coerce.date().optional(),
});

export const updateTaskSchema = z.object({
  title: taskTitleSchema.optional(),
  desc: taskDescSchema.optional(),
  priority: z.enum(["low", "med", "high"]).optional(),
  assigneeId: z.string().optional(),
  dueAt: z.coerce.date().optional(),
});

export const moveTaskSchema = z.object({
  status: z.enum(["todo", "doing", "done"]),
  order: z.number().optional(),
});

export const listTasksQuerySchema = z.object({
  status: z.enum(["todo", "doing", "done"]).optional(),
  assignee: z.string().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});
