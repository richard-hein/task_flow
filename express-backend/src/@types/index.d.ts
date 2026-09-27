import { Request } from "express";
import type { UserDocument } from "../database/models/user.model.ts";

declare global {
  namespace Express {
    interface User extends UserDocument {}
    interface Request {
      sessionId?: string;
    }
  }
}
