import { ErrorCode } from "../common/enums/error-code.enum.js";
import { HttpException, NotFoundException, UnauthorizedException, } from "../common/utils/catch-error.js";
import { HTTPSTATUS } from "../config/http.config.js";
import MembershipModel from "../database/models/membership.model.js";
import { asyncHandler } from "./asyncHandler.js";
export const requireOrgAdmin = (orgIdParam = "id") => {
    return asyncHandler(async (req, res, next) => {
        const orgId = req.params[orgIdParam];
        const userId = req.user?._id?.toString();
        if (!userId)
            throw new UnauthorizedException();
        const m = await MembershipModel.findOne({ orgId, userId }).lean();
        if (!m)
            throw new NotFoundException("Organization not found");
        if (m.role !== "admin")
            throw new HttpException("Forbidden", HTTPSTATUS.FORBIDDEN, ErrorCode.ACCESS_FORBIDDEN);
        req.membership = { orgId, userId, role: m.role };
        next();
    });
};
