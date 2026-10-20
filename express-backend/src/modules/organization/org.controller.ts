import type { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type { OrganizationService } from "./org.service.js";
import {
  acceptInviteSchema,
  createOrgSchema,
  inviteSchema,
  roleSchema,
} from "../../common/validators/org.validators.js";
import { HTTPSTATUS } from "../../config/http.config.js";
import z from "zod";

export class OrganizationController {
  private organizationService: OrganizationService;

  constructor(organizationService: OrganizationService) {
    this.organizationService = organizationService;
  }

  public createOrg = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { name } = createOrgSchema.parse({ ...req.body });
      const userId = req.user!._id.toString();
      const org = await this.organizationService.createOrg(userId, name);
      return res.status(HTTPSTATUS.CREATED).json({
        message: "Organization has been created successfully.",
        data: org,
      });
    },
  );

  public listMyOrgs = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const userId = req.user!._id.toString();
      const orgList = await this.organizationService.listMyOrgs(userId);
      return res.status(HTTPSTATUS.OK).json({
        message: "Organization list has been retrieved successfully.",
        ...orgList,
      });
    },
  );

  public listMembers = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const orgId = z.string().parse(req.params.id);
      const members = await this.organizationService.listMembers(orgId);
      return res.status(HTTPSTATUS.OK).json({
        message: "Member list has been retrieved successfully.",
        ...members,
      });
    },
  );

  public updateRole = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const orgId = z.string().parse(req.params.id);
      const userId = z.string().parse(req.params.uid);
      const { role } = roleSchema.parse(req.body);
      const membership = await this.organizationService.updateRole(
        orgId,
        userId,
        role,
      );
      return res.status(HTTPSTATUS.OK).json({
        message: "Role has been updated successfully.",
        data: membership,
      });
    },
  );

  public removeMember = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const orgId = z.string().parse(req.params.id);
      const userId = z.string().parse(req.params.uid);
      await this.organizationService.removeMember(orgId, userId);
      return res.status(HTTPSTATUS.OK).json({
        message: "User has been removed successfully!",
      });
    },
  );

  public leaveOrg = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const orgId = z.string().parse(req.params.id);
      const userId = req.user!._id.toString();
      await this.organizationService.leaveOrg(orgId, userId);
      return res.status(HTTPSTATUS.OK).json({
        message: "You have left the organization.",
      });
    },
  );

  public invite = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const orgId = z.string().parse(req.params.id);
      const { email } = inviteSchema.parse(req.body);
      await this.organizationService.invite(orgId, email, req.user!.name);
      return res.status(HTTPSTATUS.OK).json({
        message: "Invitation has been sent successfully.",
      });
    },
  );

  public acceptInvite = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { code } = acceptInviteSchema.parse(req.body);
      const userId = req.user!._id.toString();
      const result = await this.organizationService.acceptInvite(code, userId);
      return res.status(HTTPSTATUS.OK).json({
        message: "Invitation accepted successfully.",
        data: result,
      });
    },
  );
}
