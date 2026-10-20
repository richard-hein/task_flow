import type { Types } from "mongoose";
import OrgModel from "../../database/models/org.model.js";
import MembershipModel from "../../database/models/membership.model.js";
import VerificationCodeModel from "../../database/models/verification.model.js";
import UserModel from "../../database/models/user.model.js";
import { VerificationEnum } from "../../common/enums/verification-code.enum.js";
import {
  BadRequestException,
  HttpException,
  NotFoundException,
} from "../../common/utils/catch-error.js";
import { HTTPSTATUS } from "../../config/http.config.js";
import { ErrorCode } from "../../common/enums/error-code.enum.js";
import { calculateExpirationDate } from "../../common/utils/date-time.js";
import { sendEmail } from "../../mailers/mailer.js";
import { config } from "../../config/app.config.js";

export class OrganizationService {
  public async createOrg(userId: string, name: string) {
    const org = await OrgModel.create({ name, ownerId: userId });
    await MembershipModel.create({ orgId: org._id, userId, role: "admin" });
    return { org };
  }

  public async listMyOrgs(userId: string) {
    const memberships = await MembershipModel.find({ userId })
      .select("orgId")
      .lean();
    const orgs = await OrgModel.find({
      _id: { $in: memberships.map((m) => m.orgId) },
    }).lean();
    return { orgs };
  }

  public async listMembers(orgId: string) {
    const memberships = await MembershipModel.find({ orgId })
      .populate<{
        userId: { _id: Types.ObjectId; name: string; email: string };
      }>("userId", "name email")
      .lean();
    return {
      members: memberships.map((m) => ({
        userId: m.userId._id.toString(),
        name: m.userId.name,
        email: m.userId.email,
        role: m.role,
      })),
    };
  }

  public async updateRole(
    orgId: string,
    targetUserId: string,
    role: "admin" | "member",
  ) {
    await this.assertNotLastAdmin(orgId, targetUserId);
    const membership = await MembershipModel.findOneAndUpdate(
      { orgId, userId: targetUserId },
      { role },
      { new: true },
    );
    return { membership };
  }

  public async removeMember(orgId: string, targetUserId: string) {
    await this.assertNotLastAdmin(orgId, targetUserId);
    await MembershipModel.deleteOne({ orgId, userId: targetUserId });
    return { removed: true };
  }

  public async leaveOrg(orgId: string, userId: string) {
    return this.removeMember(orgId, userId);
  }

  public async invite(orgId: string, email: string, inviterName: string) {
    const org = await OrgModel.findById(orgId).select("name").lean();
    if (!org) throw new NotFoundException("Organization not found");

    const userExists = await UserModel.findOne({ email });
    if (!userExists) throw new NotFoundException("User not found");

    const memberExists = await MembershipModel.exists({
      orgId,
      userId: userExists._id,
    });
    if (memberExists) throw new BadRequestException("User is already a member");

    await VerificationCodeModel.deleteMany({
      userId: userExists._id,
      type: VerificationEnum.ORG_INVITE,
      orgId,
    });

    const inviteCode = await VerificationCodeModel.create({
      userId: userExists._id,
      orgId,
      type: VerificationEnum.ORG_INVITE,
      expiresAt: calculateExpirationDate("7d"),
    });

    const acceptLink = `${config.APP_ORIGIN}/invite/accept?code=${inviteCode.code}`;

    await sendEmail({
      to: email,
      subject: `${inviterName} invited you to join ${org.name} on Taskflow`,
      text: `${inviterName} invited you to join ${org.name}. Accept here: ${acceptLink}`,
      html: `<p>${inviterName} invited you to join <strong>${org.name}</strong>.</p><a href="${acceptLink}">Accept invite</a>`,
    });

    return { message: "Invitation has been sent successfully." };
  }

  public async acceptInvite(code: string, userId: string) {
    const invite = await VerificationCodeModel.findOne({
      code,
      type: VerificationEnum.ORG_INVITE,
      expiresAt: { $gt: new Date() },
    });
    if (!invite || !invite.orgId)
      throw new NotFoundException("Invalid or expired invite");

    if (invite.userId.toString() !== userId)
      throw new HttpException(
        "Invite was sent to a different email",
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.ACCESS_FORBIDDEN,
      );

    const existing = await MembershipModel.findOne({
      orgId: invite.orgId,
      userId,
    }).lean();
    if (existing) {
      await invite.deleteOne();
      return { membership: existing, orgId: invite.orgId };
    }

    const membership = await MembershipModel.create({
      orgId: invite.orgId,
      userId,
      role: "member",
    });
    await invite.deleteOne();
    return { membership, orgId: invite.orgId };
  }

  private async assertNotLastAdmin(orgId: string, targetUserId: string) {
    const target = await MembershipModel.findOne({
      orgId,
      userId: targetUserId,
    }).lean();
    if (!target) throw new NotFoundException("Member not found");
    if (target.role === "admin") {
      const adminCount = await MembershipModel.countDocuments({
        orgId,
        role: "admin",
      });
      if (adminCount <= 1)
        throw new BadRequestException("Cannot remove the last admin");
    }
    return target;
  }
}
