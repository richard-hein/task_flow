import z from "zod";

const projectNameSchema = z.string().trim().min(1).max(100);

export const createProjectSchema = z.object({
  name: projectNameSchema,
});

export const updateProjectSchema = z.object({
  name: projectNameSchema.optional(),
  archived: z.boolean().optional(),
});

export const listProjectsQuerySchema = z.object({
  archived: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
