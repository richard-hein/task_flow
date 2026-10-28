import z from "zod";

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const listCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
