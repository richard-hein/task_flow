import z from "zod";
import { emailSchema, verificationCodeSchema } from "./auth.validators.js";
export const createOrgSchema = z.object({
    name: z.string().trim().min(1).max(100),
});
export const inviteSchema = z.object({ email: emailSchema });
export const roleSchema = z.object({ role: z.enum(["admin", "member"]) });
export const acceptInviteSchema = z.object({ code: verificationCodeSchema });
