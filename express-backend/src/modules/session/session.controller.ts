import type { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type { SessionService } from "./session.service.js";
import { HTTPSTATUS } from "../../config/http.config.js";
import { NotFoundException } from "../../common/utils/catch-error.js";
import z from "zod";

export class SessionController {
  private sessionService: SessionService;

  constructor(sessionService: SessionService) {
    this.sessionService = sessionService;
  }

  public getAllSession = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const userId = req.user?.id;
      const sessionId = req.sessionId;
      const { sessions } = await this.sessionService.getAllSession(userId);

      const modifySessions = sessions.map((session) => ({
        ...session.toObject(),
        ...(session.id === sessionId && {
          isCurrent: true,
        }),
      }));

      return res.status(HTTPSTATUS.OK).json({
        message: "Retrieved all session successfully.",
        sessions: modifySessions,
      });
    },
  );

  public getSession = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req?.sessionId;
    if (!sessionId) {
      throw new NotFoundException(
        "SessionId not found. Please try with another one",
      );
    }
    const { user } = await this.sessionService.getSessionById(sessionId);
    return res.status(HTTPSTATUS.OK).json({
      message: "Session retrieved successfully",
      user,
    });
  });

  public deleteSession = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = z.string().parse(req.params.id);
    const userId = req.user?.id;
    await this.sessionService.deleteSession(sessionId, userId);
    return res.status(HTTPSTATUS.OK).json({
      message: "Session remove successfully.",
    });
  });
}
