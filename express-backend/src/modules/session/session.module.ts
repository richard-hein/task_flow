import { SessionController } from "./session.controller.js";
import { SessionService } from "./session.service.js";

const sessionService = new SessionService();
export const sessionController = new SessionController(sessionService);
