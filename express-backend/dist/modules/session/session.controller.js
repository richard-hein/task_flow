import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { HTTPSTATUS } from "../../config/http.config.js";
import { NotFoundException } from "../../common/utils/catch-error.js";
import z from "zod";
export class SessionController {
    constructor(sessionService) {
        this.getAllSession = asyncHandler(async (req, res) => {
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
        });
        this.getSession = asyncHandler(async (req, res) => {
            const sessionId = req?.sessionId;
            if (!sessionId) {
                throw new NotFoundException("SessionId not found. Please try with another one");
            }
            const { user } = await this.sessionService.getSessionById(sessionId);
            return res.status(HTTPSTATUS.OK).json({
                message: "Session retrieved successfully",
                user,
            });
        });
        this.deleteSession = asyncHandler(async (req, res) => {
            const sessionId = z.string().parse(req.params.id);
            const userId = req.user?.id;
            await this.sessionService.deleteSession(sessionId, userId);
            return res.status(HTTPSTATUS.OK).json({
                message: "Session remove successfully.",
            });
        });
        this.sessionService = sessionService;
    }
}
