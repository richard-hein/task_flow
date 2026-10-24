import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { acceptInviteSchema, createOrgSchema, inviteSchema, roleSchema, } from "../../common/validators/org.validators.js";
import { HTTPSTATUS } from "../../config/http.config.js";
import z from "zod";
export class OrganizationController {
    constructor(organizationService) {
        this.createOrg = asyncHandler(async (req, res) => {
            const { name } = createOrgSchema.parse({ ...req.body });
            const userId = req.user._id.toString();
            const org = await this.organizationService.createOrg(userId, name);
            return res.status(HTTPSTATUS.CREATED).json({
                message: "Organization has been created successfully.",
                data: org,
            });
        });
        this.listMyOrgs = asyncHandler(async (req, res) => {
            const userId = req.user._id.toString();
            const orgList = await this.organizationService.listMyOrgs(userId);
            return res.status(HTTPSTATUS.OK).json({
                message: "Organization list has been retrieved successfully.",
                ...orgList,
            });
        });
        this.listMembers = asyncHandler(async (req, res) => {
            const orgId = z.string().parse(req.params.id);
            const members = await this.organizationService.listMembers(orgId);
            return res.status(HTTPSTATUS.OK).json({
                message: "Member list has been retrieved successfully.",
                ...members,
            });
        });
        this.updateRole = asyncHandler(async (req, res) => {
            const orgId = z.string().parse(req.params.id);
            const userId = z.string().parse(req.params.uid);
            const { role } = roleSchema.parse(req.body);
            const membership = await this.organizationService.updateRole(orgId, userId, role);
            return res.status(HTTPSTATUS.OK).json({
                message: "Role has been updated successfully.",
                data: membership,
            });
        });
        this.removeMember = asyncHandler(async (req, res) => {
            const orgId = z.string().parse(req.params.id);
            const userId = z.string().parse(req.params.uid);
            await this.organizationService.removeMember(orgId, userId);
            return res.status(HTTPSTATUS.OK).json({
                message: "User has been removed successfully!",
            });
        });
        this.leaveOrg = asyncHandler(async (req, res) => {
            const orgId = z.string().parse(req.params.id);
            const userId = req.user._id.toString();
            await this.organizationService.leaveOrg(orgId, userId);
            return res.status(HTTPSTATUS.OK).json({
                message: "You have left the organization.",
            });
        });
        this.invite = asyncHandler(async (req, res) => {
            const orgId = z.string().parse(req.params.id);
            const { email } = inviteSchema.parse(req.body);
            await this.organizationService.invite(orgId, email, req.user.name);
            return res.status(HTTPSTATUS.OK).json({
                message: "Invitation has been sent successfully.",
            });
        });
        this.acceptInvite = asyncHandler(async (req, res) => {
            const { code } = acceptInviteSchema.parse(req.body);
            const userId = req.user._id.toString();
            const result = await this.organizationService.acceptInvite(code, userId);
            return res.status(HTTPSTATUS.OK).json({
                message: "Invitation accepted successfully.",
                data: result,
            });
        });
        this.organizationService = organizationService;
    }
}
