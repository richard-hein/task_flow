import { NotFoundException } from "../../common/utils/catch-error.js";
import SessionModel from "../../database/models/session.model.js";
export class SessionService {
    // Get all sessions
    async getAllSession(userId) {
        const sessions = await SessionModel.find({
            userId,
            expiredAt: { $gt: Date.now() },
        }, {
            _id: 1,
            userId: 1,
            userAgent: 1,
            createdAt: 1,
            expiredAt: 1,
        }, {
            sort: {
                createdAt: -1,
            },
        });
        return {
            sessions,
        };
    }
    // Get single session
    async getSessionById(sessionId) {
        const session = await SessionModel.findById(sessionId)
            .populate("userId")
            .select("-expiresAt");
        if (!session) {
            throw new NotFoundException("Session not found.");
        }
        const { userId: user } = session;
        return {
            user,
        };
    }
    // Delete session
    async deleteSession(sessionId, userId) {
        const deletedSession = await SessionModel.findOneAndDelete({
            _id: sessionId,
            userId: userId,
        });
        if (!deletedSession)
            throw new NotFoundException("Session not found");
        return;
    }
}
