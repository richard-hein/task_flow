import { NotFoundException, UnauthorizedException, } from "../common/utils/catch-error.js";
import { asyncHandler } from "./asyncHandler.js";
import MembershipModel from "../database/models/membership.model.js";
export const requireOrgMember = (orgIdParam = "id") => {
    return asyncHandler(async (req, res, next) => {
        const orgId = req.params[orgIdParam];
        const userId = req.user?._id?.toString();
        if (!userId)
            throw new UnauthorizedException();
        const m = await MembershipModel.findOne({ orgId, userId }).lean();
        if (!m)
            throw new NotFoundException("Organization not found");
        req.membership = { orgId, userId, role: m.role };
        next();
    });
};
