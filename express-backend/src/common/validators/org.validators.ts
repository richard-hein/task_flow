import z from "zod";

export const orgNameSchema = z.string().trim().min(1).max(255);

export const orgIdSchema = z.string().trim().min(1).max(255);

export const createOrgSchema = z.object({
  name: orgNameSchema,
  ownerId: orgIdSchema,
});

export const updateOrgSchema = z.object({
  name: orgNameSchema,
  ownerId: orgIdSchema,
});
