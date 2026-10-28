import "dotenv/config";
import cors from "cors";
import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { config } from "./config/app.config.js";
import connectDb from "./database/database.js";
import { errorHandler } from "./middlewares/errorHandler.js";
// import { HTTPSTATUS } from "./config/http.config.js";
import { asyncHandler } from "./middlewares/asyncHandler.js";
import authRoutes from "./modules/auth/auth.route.js";
import passport from "./middlewares/passport.js";
import { authenticateJWT } from "./common/strategies/jwt.strategy.js";
import sessionRoutes from "./modules/session/session.route.js";
import mfaRoutes from "./modules/mfa/mfa.route.js";
import {
  orgRoutes,
  inviteRoutes,
} from "./modules/organization/org.route.js";
import {
  orgProjectRoutes,
  projectRoutes,
} from "./modules/project/project.route.js";
import taskRoutes from "./modules/task/task.route.js";
import commentRoutes from "./modules/comment/comment.route.js";
import activityRoutes from "./modules/activity/activity.route.js";

const app = express();
const BASE_PATH = config.BASE_PATH;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({ origin: config.APP_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {}),
);

app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}/session`, authenticateJWT, sessionRoutes);
app.use(`${BASE_PATH}/mfa`, mfaRoutes);
app.use(`${BASE_PATH}/orgs`, authenticateJWT, orgRoutes, orgProjectRoutes);
app.use(`${BASE_PATH}/invites`, authenticateJWT, inviteRoutes);
app.use(`${BASE_PATH}/projects`, authenticateJWT, projectRoutes);
app.use(
  `${BASE_PATH}`,
  authenticateJWT,
  taskRoutes,
  commentRoutes,
  activityRoutes,
);

app.use(errorHandler);
app.listen(config.PORT, async () => {
  console.log(`Server listening on port ${config.PORT} in ${config.NODE_ENV}`);
  await connectDb();
});
