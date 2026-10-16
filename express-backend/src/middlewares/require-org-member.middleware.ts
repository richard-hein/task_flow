import type { Request, Response, NextFunction } from "express";
import {
  NotFoundException,
  UnauthorizedException,
} from "../common/utils/catch-error.js";
import { asyncHandler } from "./asyncHandler.js";
import MembershipModel from "../database/models/membership.model.js";

export const requireOrgMember = (orgIdParam = "id") => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const orgId = req.params[orgIdParam] as string;
    const userId = req.user?._id?.toString();
    if (!userId) throw new UnauthorizedException();
    const m = await MembershipModel.findOne({ orgId, userId }).lean();
    if (!m) throw new NotFoundException("Organization not found");
    req.membership = { orgId, userId, role: m.role };
    next();
  });
};
